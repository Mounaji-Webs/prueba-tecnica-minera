/**
 * Tipos de estados de los supervisores
 */
export type SupervisorState = 'S' | 'I' | 'P' | 'B' | 'D' | '-';

/**
 * Configuración del régimen de trabajo
 */
export interface WorkRegime {
  workDays: number;
  restDays: number;
}

// === PRIORIDADES DEL ALGORITMO ===
export type PriorityLevel = 'high' | 'medium' | 'low';

export interface AlgorithmPriorities {
  twoDrillers: PriorityLevel;      // Mantener exactamente 2 perforando
  minimumRest: PriorityLevel;      // Respetar descanso mínimo
  minimumDrilling: PriorityLevel;  // Duración mínima de perforación
  noThreeDrillers: PriorityLevel;  // Evitar 3 perforadores
  maxConsecutiveWork: PriorityLevel; // Limitar días seguidos de trabajo
}

export const DEFAULT_PRIORITIES: AlgorithmPriorities = {
  twoDrillers: 'high',
  minimumRest: 'medium', 
  minimumDrilling: 'medium',
  noThreeDrillers: 'high',
  maxConsecutiveWork: 'low',
};

/**
 * Configuración del cronograma
 */
export interface ScheduleConfig {
  regime: WorkRegime;
  inductionDays: number;
  totalDrillingDays: number;
  priorities?: AlgorithmPriorities;
}

/**
 * Estado de un día en el cronograma para un supervisor
 */
export interface DayState {
  day: number;
  state: SupervisorState;
  isError?: boolean;
}

// === MÁQUINA DE ESTADOS PARA S2 ===
export type S2Phase = 
  | 'IDLE'        // Inactivo
  | 'GOING_UP'    // Subiendo (S)
  | 'INDUCTION'   // Inducción (I)
  | 'DRILLING'    // Perforando (P)
  | 'GOING_DOWN'  // Bajando (B)
  | 'RESTING';    // Descansando (D)

export interface S2State {
  phase: S2Phase;
  daysInPhase: number;
  cycleCount: number;
  totalDrilled: number;
  lastRestStart: number;
  isFirstCycle: boolean;
}

// === ESTADÍSTICAS ===
export interface ScheduleStats {
  totalDays: number;
  daysWithTwoDrillers: number;
  daysWithOneDriller: number;
  daysWithThreeDrillers: number;
  daysWithZeroDrillers: number;
  s2Cycles: number;
  averageRestDays: number;
}

/**
 * Cronograma completo de los 3 supervisores
 */
export interface Schedule {
  s1: DayState[];
  s2: DayState[];
  s3: DayState[];
  drillersPerDay: number[];
  errors: ScheduleError[];
  stats?: ScheduleStats;
}

/**
 * Errores detectados en el cronograma
 */
export interface ScheduleError {
  day: number;
  type: 'THREE_DRILLING' | 'ONE_DRILLING' | 'INVALID_SEQUENCE' | 'NO_DRILLING' | 'ZERO_DRILLING' | 'SHORT_DRILLING';
  message: string;
  supervisors: string[];
  causedByPriority?: string;
}

/**
 * Estados posibles de un supervisor en un ciclo
 */
export interface SupervisorCycle {
  startDay: number;
  upDay: number;           // S
  inductionStart: number;  // I
  inductionEnd: number;    // I
  drillingStart: number;   // P
  drillingEnd: number;     // P
  downDay: number;         // B
  restStart: number;       // D
  restEnd: number;         // D
}

/**
 * Información de validación para cada día
 */
export interface DayValidation {
  day: number;
  drilling: number;
  supervisors: {
    s1: SupervisorState;
    s2: SupervisorState;
    s3: SupervisorState;
  };
  isValid: boolean;
  errors: string[];
}