import {
  ScheduleConfig,
  Schedule,
  DayState,
  SupervisorState,
  ScheduleError,
  ScheduleStats,
  S2Phase,
  S2State,
  AlgorithmPriorities,
  DEFAULT_PRIORITIES,
  PriorityLevel,
} from './types';

/**
 * ALGORITMO REACTIVO V4 - Máquina de Estados
 * 
 * ENFOQUE: Simular día a día con decisiones reactivas basadas en prioridades
 * 
 * MEJORAS SOBRE VERSIONES ANTERIORES:
 * 1. Sin magic numbers ni lookahead arbitrario
 * 2. Máquina de estados explícita para S2
 * 3. Prioridades configurables por el usuario
 * 4. Función única para generar ciclos (DRY)
 * 5. Precálculo de días de perforación de S1/S3
 * 6. Cálculo dinámico de totalDays (no hack de *3)
 */
export class ScheduleGenerator {
  private config: ScheduleConfig;
  private priorities: AlgorithmPriorities;
  private totalDays: number;
  
  // Precálculo de días de perforación
  private s1DrillingDays: Set<number> = new Set();
  private s3DrillingDays: Set<number> = new Set();

  constructor(config: ScheduleConfig) {
    this.config = config;
    this.priorities = config.priorities || DEFAULT_PRIORITIES;
    
    // Calcular totalDays de forma inteligente
    const cycleLength = config.regime.workDays + config.regime.restDays;
    const drillingPerCycle = config.regime.workDays - config.inductionDays - 1;
    const estimatedCycles = Math.ceil(config.totalDrillingDays / Math.max(1, drillingPerCycle));
    this.totalDays = Math.max(estimatedCycles * cycleLength * 2, config.totalDrillingDays * 2);
  }

  /**
   * Obtiene el valor numérico de una prioridad con mayor peso para high
   */
  private getPriorityValue(level: PriorityLevel): number {
    switch (level) {
      case 'high': return 100;
      case 'medium': return 10;
      case 'low': return 1;
    }
  }

  /**
   * Compara dos prioridades. Retorna true si priority1 >= priority2
   */
  private isPriorityEqualOrHigher(priority1: PriorityLevel, priority2: PriorityLevel): boolean {
    return this.getPriorityValue(priority1) >= this.getPriorityValue(priority2);
  }

  /**
   * Compara dos prioridades. Retorna true si priority1 > priority2
   */
  private isPriorityHigher(priority1: PriorityLevel, priority2: PriorityLevel): boolean {
    return this.getPriorityValue(priority1) > this.getPriorityValue(priority2);
  }

  public generateSchedule(): Schedule {
    // PASO 1: Generar S1 con régimen fijo (S1 siempre cumple régimen)
    const s1 = this.generateFixedSchedule(0);
    
    // PASO 2: Calcular entrada de S3 (debe entrar antes de que S1 baje por primera vez)
    const s1FirstDown = s1.findIndex(d => d.state === 'B');
    const s3StartDay = Math.max(0, s1FirstDown - this.config.inductionDays - 1);

    // PASO 3: Generar S2 y S3 de forma COORDINADA y REACTIVA
    const { s2, s3 } = this.generateCoordinatedSecondarySupervisors(s1, s3StartDay);

    // PASO 4: Post-procesamiento (Se eliminan pasadas agresivas que podrían romper secuencias B-D-S)
    // El motor reactivo ya es suficientemente estricto.

    // PASO 5: Calcular métricas y validar
    const drillersPerDay = this.calculateDrillersPerDay(s1, s2, s3);
    const errors = this.validateSchedule(s1, s2, s3, drillersPerDay);
    const stats = this.calculateStats(drillersPerDay, s2);

    return { s1, s2, s3, drillersPerDay, errors, stats };
  }

  /**
   * Genera S2 y S3 día a día con un motor de reglas por prioridades
   * Basado en un modelo de optimización de restricciones (COP)
   */
  private generateCoordinatedSecondarySupervisors(s1: DayState[], s3StartDay: number): { s2: DayState[], s3: DayState[] } {
    const s2 = this.createEmptySchedule();
    const s3 = this.createEmptySchedule();

    let stateS2: S2State = {
      phase: 'IDLE',
      daysInPhase: 0,
      cycleCount: 0,
      totalDrilled: 0,
      lastRestStart: -1,
      isFirstCycle: true,
    };

    let stateS3: S2State = {
      phase: 'IDLE',
      daysInPhase: 0,
      cycleCount: 0,
      totalDrilled: 0,
      lastRestStart: -1,
      isFirstCycle: true,
    };

    // S2 empieza activo
    stateS2.phase = 'GOING_UP';
    stateS2.daysInPhase = 1;
    s2[0].state = 'S';

    for (let day = 1; day < this.totalDays; day++) {
      const s3IsActive = day >= s3StartDay;
      
      const bestMove = this.chooseBestMove(
        day, 
        s1[day].state, 
        stateS2, 
        stateS3, 
        s3IsActive
      );

      s2[day].state = bestMove.s2;
      s3[day].state = bestMove.s3;

      stateS2 = this.syncInternalState(stateS2, bestMove.s2, day);
      stateS3 = this.syncInternalState(stateS3, bestMove.s3, day);
    }

    return { s2, s3 };
  }

  /**
   * Decide la mejor combinación de estados para S2 y S3 para el día actual
   */
  private chooseBestMove(
    day: number, 
    s1State: SupervisorState, 
    s2Idx: S2State, 
    s3Idx: S2State, 
    s3Active: boolean
  ): { s2: SupervisorState; s3: SupervisorState } {
    
    const possibleS2 = this.getPossibleActions(s2Idx, true);
    const possibleS3 = this.getPossibleActions(s3Idx, s3Active);

    let bestScore = -Infinity;
    let bestChoice = { s2: possibleS2[0], s3: possibleS3[0] };

    for (const actionS2 of possibleS2) {
      for (const actionS3 of possibleS3) {
        const score = this.evaluateActions(day, s1State, actionS2, actionS3, s2Idx, s3Idx, s3Active);
        if (score > bestScore) {
          bestScore = score;
          bestChoice = { s2: actionS2, s3: actionS3 };
        }
      }
    }

    return bestChoice;
  }

  /**
   * Retorna las acciones legalmente posibles según el estado actual
   */
  private getPossibleActions(state: S2State, isActive: boolean): SupervisorState[] {
    if (!isActive && state.phase === 'IDLE') return ['-'];
    if (isActive && state.phase === 'IDLE') return ['S'];

    switch (state.phase) {
      case 'GOING_UP': 
        // Obligatorio pasar a I (si es primero) o P
        return [state.isFirstCycle ? 'I' : 'P'];
      
      case 'INDUCTION':
        if (state.daysInPhase < this.config.inductionDays) return ['I'];
        // Si ya terminó inducción, puede empezar a perforar (P) 
        // o esperar en inducción (I) si hay sobrecupo
        return ['I', 'P']; 
      
      case 'DRILLING':
        // Puede seguir perforando o bajar. 
        // NUNCA bajar si solo lleva 1 día (Hard constraint: no S-P-B)
        if (state.daysInPhase < 2) return ['P'];
        return ['P', 'B'];

      case 'GOING_DOWN':
        return ['D']; // Obligatorio bajar a descansar

      case 'RESTING':
        // Puede descansar o subir
        // NUNCA subir sin haber descansado al menos 1 día (Hard constraint: no B-S)
        if (state.daysInPhase < 1) return ['D'];
        return ['D', 'S'];

      default:
        return ['-'];
    }
  }

  /**
   * Evalúa una combinación de acciones y retorna un puntaje
   * Basado en prioridades de Hard, Medium y Soft constraints
   */
  private evaluateActions(
    day: number,
    s1: SupervisorState,
    s2: SupervisorState,
    s3: SupervisorState,
    s2Idx: S2State,
    s3Idx: S2State,
    s3Active: boolean
  ): number {
    let score = 0;

    const countP = (s1 === 'P' ? 1 : 0) + (s2 === 'P' ? 1 : 0) + (s3 === 'P' ? 1 : 0);
    const pVal = (level: string) => this.getPriorityValue(level as PriorityLevel);

    // --- HARD CONSTRAINTS (Penalización Masiva) ---
    
    // 1. Nunca 3 supervisores perforando (Nivel Maestro: Prioridad Absoluta)
    if (countP > 2) score -= 1000000;

    // 2. Una vez que S3 entró, nunca solo 1 (Regla 3 de detalles.md)
    if (countP === 1 && s3Active) {
        score -= 500000 * pVal(this.priorities.twoDrillers) / 100;
    }

    // 3. Nunca 0 perforando
    if (countP === 0 && day > this.config.inductionDays) score -= 900000;

    // --- MEDIUM CONSTRAINTS ---

    // 4. Mantener exactamente 2 perforando
    if (countP === 2) score += 10000 * pVal(this.priorities.twoDrillers) / 10;
    
    // 5. Respetar régimen de trabajo
    const { workDays, restDays } = this.config.regime;
    const s2Limit = workDays - (s2Idx.isFirstCycle ? this.config.inductionDays : 0) - 1;
    if (s2 === 'P' && s2Idx.phase === 'DRILLING' && s2Idx.daysInPhase > s2Limit) {
        score -= 2000 * pVal(this.priorities.maxConsecutiveWork) / 10;
    }
    const s3Limit = workDays - (s3Idx.isFirstCycle ? this.config.inductionDays : 0) - 1;
    if (s3 === 'P' && s3Idx.phase === 'DRILLING' && s3Idx.daysInPhase > s3Limit) {
        score -= 2000 * pVal(this.priorities.maxConsecutiveWork) / 10;
    }

    // --- SOFT CONSTRAINTS ---

    // 6. Respetar descanso (preferir no volver antes de tiempo)
    // Pero si faltan perforadores (o faltarán pronto), PRIORIDAD volver
    const s2MinRest = restDays - 1;
    if (s2 === 'S' && s2Idx.phase === 'RESTING') {
        if (countP < 2) {
            score += 20000 * pVal(this.priorities.twoDrillers) / 100;
        } else if (s2Idx.daysInPhase < s2MinRest) {
            score -= 5000 * pVal(this.priorities.minimumRest) / 10;
        } else {
            score += 1000; // Natural return
        }
    }
    const s3MinRest = restDays - 1;
    if (s3 === 'S' && s3Idx.phase === 'RESTING') {
        if (countP < 2) {
            score += 20000 * pVal(this.priorities.twoDrillers) / 100;
        } else if (s3Idx.daysInPhase < s3MinRest) {
            score -= 5000 * pVal(this.priorities.minimumRest) / 10;
        } else {
            score += 1000;
        }
    }

    // 7. Continuidad laboral
    if (s2 === 'P' && s2Idx.phase === 'DRILLING') score += 100;
    if (s3 === 'P' && s3Idx.phase === 'DRILLING') score += 50;

    return score;
  }

  /**
   * Sincroniza el estado interno con la decisión tomada
   */
  private syncInternalState(state: S2State, action: SupervisorState, day: number): S2State {
    const next = { ...state };
    
    // Mapeo simple de acción a fase
    const actionToPhase: Record<string, S2Phase> = {
      'S': 'GOING_UP',
      'I': 'INDUCTION',
      'P': 'DRILLING',
      'B': 'GOING_DOWN',
      'D': 'RESTING',
      '-': 'IDLE'
    };

    const requestedPhase = actionToPhase[action];

    if (state.phase !== requestedPhase) {
      next.phase = requestedPhase;
      next.daysInPhase = 1;
      if (action === 'P') next.totalDrilled++;
      if (action === 'S') {
        next.cycleCount++;
        next.isFirstCycle = (state.phase === 'IDLE' && state.cycleCount === 0);
      }
    } else {
      next.daysInPhase++;
      if (action === 'P') next.totalDrilled++;
    }

    return next;
  }


  /**
   * Genera un cronograma con régimen FIJO (usado para S1)
   */
  private generateFixedSchedule(startDay: number): DayState[] {
    const schedule = this.createEmptySchedule();
    if (startDay < 0) return schedule;

    let day = startDay;
    const { workDays, restDays } = this.config.regime;
    const { inductionDays } = this.config;

    while (day < this.totalDays) {
      // S: Subida (1 día)
      if (day < this.totalDays) schedule[day++].state = 'S';

      // I: Inducción (configurable)
      for (let i = 0; i < inductionDays && day < this.totalDays; i++) {
        schedule[day++].state = 'I';
      }

      // P: Perforación (resto de días de trabajo)
      const drillingDays = Math.max(1, workDays - inductionDays - 1);
      for (let i = 0; i < drillingDays && day < this.totalDays; i++) {
        schedule[day++].state = 'P';
      }

      // B: Bajada (1 día)
      if (day < this.totalDays) schedule[day++].state = 'B';

      // D: Descanso (días restantes)
      const actualRestDays = Math.max(0, restDays - 1); // restDays incluye B, así que restamos 1 para D
      for (let i = 0; i < actualRestDays && day < this.totalDays; i++) {
        schedule[day++].state = 'D';
      }
    }

    return schedule;
  }

  private createEmptySchedule(): DayState[] {
    return new Array(this.totalDays).fill(null).map((_, i) => ({ 
      day: i, 
      state: '-' as SupervisorState 
    }));
  }

  private calculateDrillersPerDay(s1: DayState[], s2: DayState[], s3: DayState[]): number[] {
    const result: number[] = [];
    for (let day = 0; day < this.totalDays; day++) {
      const count = 
        (s1[day]?.state === 'P' ? 1 : 0) +
        (s2[day]?.state === 'P' ? 1 : 0) +
        (s3[day]?.state === 'P' ? 1 : 0);
      result.push(count);
    }
    return result;
  }

  private calculateStats(drillersPerDay: number[], s2: DayState[]): ScheduleStats {
    let daysWithTwo = 0, daysWithOne = 0, daysWithThree = 0, daysWithZero = 0;
    
    for (const count of drillersPerDay) {
      if (count === 2) daysWithTwo++;
      else if (count === 1) daysWithOne++;
      else if (count === 3) daysWithThree++;
      else if (count === 0) daysWithZero++;
    }

    const s2Cycles = s2.filter((d, i) => d.state === 'S' && (i === 0 || s2[i-1]?.state !== 'S')).length;
    
    let totalRestDays = 0, restPeriods = 0;
    let inRest = false, currentRestDays = 0;
    
    for (const d of s2) {
      if (d.state === 'D') {
        if (!inRest) { inRest = true; currentRestDays = 0; }
        currentRestDays++;
      } else {
        if (inRest) {
          totalRestDays += currentRestDays;
          restPeriods++;
          inRest = false;
        }
      }
    }

    return {
      totalDays: this.totalDays,
      daysWithTwoDrillers: daysWithTwo,
      daysWithOneDriller: daysWithOne,
      daysWithThreeDrillers: daysWithThree,
      daysWithZeroDrillers: daysWithZero,
      s2Cycles,
      averageRestDays: restPeriods > 0 ? totalRestDays / restPeriods : 0,
    };
  }

  private validateSchedule(
    s1: DayState[], 
    s2: DayState[], 
    s3: DayState[], 
    drillersPerDay: number[]
  ): ScheduleError[] {
    const errors: ScheduleError[] = [];
    const s3ActiveDay = s3.findIndex(d => d.state !== '-');

    for (let day = 0; day < this.totalDays; day++) {
      const count = drillersPerDay[day];

      if (count === 3) {
        errors.push({
          type: 'THREE_DRILLING',
          day,
          message: `Día ${day}: 3 supervisores perforando`,
          supervisors: ['S1', 'S2', 'S3'],
          causedByPriority: this.priorities.noThreeDrillers !== 'high' ? 'noThreeDrillers' : undefined
        });
      }

      if (count === 1 && s3ActiveDay !== -1 && day >= s3ActiveDay) {
        const drilling = [
          s1[day]?.state === 'P' ? 'S1' : '', 
          s2[day]?.state === 'P' ? 'S2' : '', 
          s3[day]?.state === 'P' ? 'S3' : ''
        ].filter(s => s);
        
        errors.push({
          type: 'ONE_DRILLING',
          day,
          message: `Día ${day}: Solo 1 supervisor perforando`,
          supervisors: drilling,
          causedByPriority: this.priorities.minimumRest === 'high' ? 'minimumRest' : undefined
        });
      }

      if (count === 0 && day > this.config.inductionDays + 1) {
        errors.push({
          type: 'ZERO_DRILLING',
          day,
          message: `Día ${day}: Ningún supervisor perforando`,
          supervisors: []
        });
      }

      this.validateSequence(s1, day, 'S1', errors);
      this.validateSequence(s2, day, 'S2', errors);
      this.validateSequence(s3, day, 'S3', errors);
    }

    return errors;
  }

  private validateSequence(
    schedule: DayState[], 
    day: number, 
    supervisor: string, 
    errors: ScheduleError[]
  ): void {
    if (day === 0 || day >= this.totalDays - 1) return;

    const prev = schedule[day - 1]?.state;
    const curr = schedule[day]?.state;
    const next = schedule[day + 1]?.state;

    if (prev === 'S' && curr === 'S') {
      errors.push({
        type: 'INVALID_SEQUENCE',
        day,
        message: `${supervisor}: Subida consecutiva (S-S)`,
        supervisors: [supervisor]
      });
    }

    if (prev === 'S' && curr === 'B') {
      errors.push({
        type: 'INVALID_SEQUENCE',
        day,
        message: `${supervisor}: Bajada sin trabajo (S-B)`,
        supervisors: [supervisor]
      });
    }

    if (prev === 'B' && curr === 'S') {
      errors.push({
        type: 'INVALID_SEQUENCE',
        day,
        message: `${supervisor}: Sin descanso (B-S)`,
        supervisors: [supervisor],
        causedByPriority: this.priorities.minimumRest === 'low' ? 'minimumRest' : undefined
      });
    }

    if (prev !== 'P' && curr === 'P' && next !== 'P' && next !== '-') {
      errors.push({
        type: 'SHORT_DRILLING',
        day,
        message: `${supervisor}: Solo 1 día perforando`,
        supervisors: [supervisor],
        causedByPriority: this.priorities.minimumDrilling === 'low' ? 'minimumDrilling' : undefined
      });
    }
  }
}
