'use client';

import React, { useState } from 'react';
import { ScheduleGenerator } from '../lib/scheduleGenerator';
import { ScheduleConfig, Schedule, SupervisorState, AlgorithmPriorities, DEFAULT_PRIORITIES, PriorityLevel } from '../lib/types';

/**
 * Colores para cada estado del supervisor
 */
const STATE_COLORS: Record<SupervisorState, string> = {
  'S': 'bg-blue-500 text-white',      // Subida - Azul
  'I': 'bg-yellow-500 text-white',    // Inducción - Amarillo
  'P': 'bg-green-500 text-white',     // Perforación - Verde
  'B': 'bg-red-500 text-white',       // Bajada - Rojo
  'D': 'bg-gray-400 text-white',      // Descanso - Gris
  '-': 'bg-white border border-gray-300' // Vacío - Blanco
};

/**
 * Nombres descriptivos de los estados
 */
const STATE_NAMES: Record<SupervisorState, string> = {
  'S': 'Subida',
  'I': 'Inducción',
  'P': 'Perforación',
  'B': 'Bajada',
  'D': 'Descanso',
  '-': 'Libre'
};

/**
 * Nombres de prioridades para UI
 */
const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  'high': 'Alta',
  'medium': 'Media',
  'low': 'Baja'
};

const PRIORITY_COLORS: Record<PriorityLevel, string> = {
  'high': 'bg-red-100 border-red-500 text-red-700',
  'medium': 'bg-yellow-100 border-yellow-500 text-yellow-700',
  'low': 'bg-green-100 border-green-500 text-green-700'
};

/**
 * Casuísticas predefinidas
 */
const CASUS_PRESETS = [
  { name: 'Casuística 1', workDays: 14, restDays: 7, inductionDays: 5, totalDrillingDays: 30, description: 'Régimen 14x7, Inducción 5 días' },
  { name: 'Casuística 2', workDays: 21, restDays: 7, inductionDays: 3, totalDrillingDays: 30, description: 'Régimen 21x7, Inducción 3 días' },
  { name: 'Casuística 3', workDays: 10, restDays: 5, inductionDays: 2, totalDrillingDays: 30, description: 'Régimen 10x5, Inducción 2 días' },
  { name: 'Casuística 4', workDays: 14, restDays: 6, inductionDays: 4, totalDrillingDays: 30, description: 'Régimen 14x6, Inducción 4 días' },
  { name: 'Casuística 5', workDays: 7, restDays: 7, inductionDays: 1, totalDrillingDays: 30, description: 'Régimen 7x7, Inducción 1 día' },
];

/**
 * Componente principal para planificar cronogramas de supervisores
 */
export default function SchedulePlanner(): React.JSX.Element {
  // Estados del formulario
  const [workDays, setWorkDays] = useState<number>(14);
  const [restDays, setRestDays] = useState<number>(7);
  const [inductionDays, setInductionDays] = useState<number>(5);
  const [totalDrillingDays, setTotalDrillingDays] = useState<number>(30);
  
  // Estados de prioridades
  const [priorities, setPriorities] = useState<AlgorithmPriorities>(DEFAULT_PRIORITIES);
  const [showPriorities, setShowPriorities] = useState<boolean>(false);
  
  // Estados del cronograma
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [shouldRecalculate, setShouldRecalculate] = useState<boolean>(false);
  const [showAllDays, setShowAllDays] = useState<boolean>(false);
  const [calculationTime, setCalculationTime] = useState<string>('');
  const [calculationDateTime, setCalculationDateTime] = useState<string>('');
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const scheduleRef = React.useRef<HTMLDivElement>(null);

  /**
   * Actualiza una prioridad específica y resetea el cronograma
   */
  const updatePriority = (key: keyof AlgorithmPriorities, value: PriorityLevel) => {
    setPriorities(prev => ({ ...prev, [key]: value }));
    // Resetear cronograma cuando cambian prioridades
    setSchedule(null);
    setError('');
    setSuggestions([]);
    setCalculationTime('');
    setCalculationDateTime('');
  };

  /**
   * Carga una configuración predefinida
   */
  const loadPreset = (preset: typeof CASUS_PRESETS[0]) => {
    setWorkDays(preset.workDays);
    setRestDays(preset.restDays);
    setInductionDays(preset.inductionDays);
    setTotalDrillingDays(preset.totalDrillingDays);
    setSchedule(null);
    setError(''); 
    setSuggestions([]);
    setSelectedPreset(preset.name);
  };

  /**
   * Genera sugerencias basadas en los errores encontrados
   */
  const generateSuggestions = (schedule: Schedule): string[] => {
    const suggestions: string[] = [];
    
    const threeDrillingErrors = schedule.errors.filter(e => e.type === 'THREE_DRILLING').length;
    const oneDrillingErrors = schedule.errors.filter(e => e.type === 'ONE_DRILLING').length;
    const invalidSequenceErrors = schedule.errors.filter(e => e.type === 'INVALID_SEQUENCE').length;
    const shortDrillingErrors = schedule.errors.filter(e => e.type === 'SHORT_DRILLING').length;

    // Si hay errores, dar sugerencias concretas
    if (threeDrillingErrors > 0) {
      suggestions.push(`⚠️ ${threeDrillingErrors} días con 3 supervisores perforando:`);
      suggestions.push(`   • Aumentar días de descanso de ${restDays} a ${restDays + 2} días`);
      if (priorities.noThreeDrillers !== 'high') {
        suggestions.push(`   • Aumentar prioridad "Evitar 3 perforando" a Alta`);
      }
    }

    if (oneDrillingErrors > 10) {
      const percentage = ((oneDrillingErrors / schedule.drillersPerDay.length) * 100).toFixed(1);
      suggestions.push(`⚠️ ${oneDrillingErrors} días con solo 1 supervisor (${percentage}%):`);
      if (priorities.twoDrillers !== 'high') {
        suggestions.push(`   • Aumentar prioridad "Mantener 2 perforando" a Alta`);
      }
      if (priorities.minimumRest === 'high') {
        suggestions.push(`   • Reducir prioridad "Descanso mínimo" a Media o Baja`);
      }
      if (workDays > 10) {
        suggestions.push(`   • Reducir días de trabajo de ${workDays} a ${Math.max(7, workDays - 2)} días`);
      }
      if (inductionDays > 2) {
        suggestions.push(`   • Reducir inducción de ${inductionDays} a ${Math.max(1, inductionDays - 1)} días`);
      }
    }

    if (shortDrillingErrors > 5) {
      suggestions.push(`⚠️ ${shortDrillingErrors} períodos de perforación muy cortos:`);
      if (priorities.minimumDrilling !== 'high') {
        suggestions.push(`   • Aumentar prioridad "Perforación mínima" a Alta`);
      }
    }

    if (invalidSequenceErrors > 0) {
      suggestions.push(`⚠️ ${invalidSequenceErrors} secuencias inválidas (B-S sin descanso):`);
      suggestions.push(`   • Aumentar días de descanso para evitar transiciones directas`);
      if (priorities.minimumRest !== 'high') {
        suggestions.push(`   • Aumentar prioridad "Descanso mínimo" a Alta`);
      }
    }

    if (workDays - inductionDays - 1 < 3) {
      suggestions.push(`⚡ Días de perforación por ciclo muy cortos (${workDays - inductionDays - 1} días):`);
      if (inductionDays > 1) {
        suggestions.push(`   • Reducir inducción a ${Math.max(1, inductionDays - 1)} días`);
      } else {
        suggestions.push(`   • Aumentar trabajo a ${workDays + 2} días`);
      }
    }

    if (restDays < 5) {
      suggestions.push(`⚡ Descanso corto (${restDays - 2} días reales):`);
      suggestions.push(`   • Aumentar a ${Math.max(5, restDays + 1)} días totales`);
    }

    // Si no hay errores, sugerir optimizaciones de prioridad
    if (schedule.errors.length === 0) {
      suggestions.push('✅ ¡Excelente! Cronograma sin errores.');
      suggestions.push('');
      suggestions.push('📈 Optimizaciones disponibles:');
      
      if (priorities.twoDrillers !== 'high') {
        suggestions.push(`   • Aumentar "Mantener 2 perforando" a Alta para garantizar operación óptima`);
      }
      if (priorities.noThreeDrillers !== 'high') {
        suggestions.push(`   • Aumentar "Evitar 3 perforando" a Alta para prevenir sobrecargas`);
      }
      if (priorities.minimumRest !== 'high') {
        suggestions.push(`   • Aumentar "Descanso mínimo" a Alta para mejor bienestar`);
      }
      if (priorities.minimumDrilling !== 'high') {
        suggestions.push(`   • Aumentar "Perforación mínima" a Alta para períodos continuos`);
      }
      
      if (priorities.twoDrillers === 'high' && priorities.noThreeDrillers === 'high' && 
          priorities.minimumRest === 'high' && priorities.minimumDrilling === 'high') {
        suggestions.push('   • Todas las prioridades están en nivel Alto. Configuración óptima.');
      }
    }

    return suggestions;
  };

  /**
   * Genera información sobre reglas sacrificadas por prioridades
   */
  const generateSacrificedRules = (schedule: Schedule): string[] => {
    const sacrificed: string[] = [];
    
    const threeDrillingErrors = schedule.errors.filter(e => e.type === 'THREE_DRILLING').length;
    const oneDrillingErrors = schedule.errors.filter(e => e.type === 'ONE_DRILLING').length;
    const invalidSequenceErrors = schedule.errors.filter(e => e.type === 'INVALID_SEQUENCE').length;
    const shortDrillingErrors = schedule.errors.filter(e => e.type === 'SHORT_DRILLING').length;

    // Analizar qué reglas se sacrificaron basado en prioridades bajas/medias
    if (threeDrillingErrors > 0) {
      const percentage = ((threeDrillingErrors / schedule.drillersPerDay.length) * 100).toFixed(1);
      sacrificed.push(`🟣 Permitir 3 supervisores perforando (${threeDrillingErrors} días, ${percentage}%):`);
      sacrificed.push(`   • Prioridad "Evitar 3 perforando": ${PRIORITY_LABELS[priorities.noThreeDrillers]}`);
      if (priorities.noThreeDrillers === 'high') {
        sacrificed.push(`   • La prioridad es Alta pero aún hay errores. Ajustar régimen de trabajo.`);
      } else {
        sacrificed.push(`   • Flexibilizado para priorizar: Mantener 2 perforando y Descanso mínimo`);
      }
    }

    if (oneDrillingErrors > 0) {
      const percentage = ((oneDrillingErrors / schedule.drillersPerDay.length) * 100).toFixed(1);
      sacrificed.push(`🟠 Solo 1 supervisor operando (${oneDrillingErrors} días, ${percentage}%):`);
      sacrificed.push(`   • Prioridad "Mantener 2 perforando": ${PRIORITY_LABELS[priorities.twoDrillers]}`);
      if (priorities.twoDrillers === 'high') {
        sacrificed.push(`   • La prioridad es Alta pero aún hay errores. Ajustar régimen de trabajo.`);
      } else {
        sacrificed.push(`   • Flexibilizado para priorizar: Descanso mínimo y Evitar 3 perforando`);
      }
    }

    if (invalidSequenceErrors > 0) {
      const percentage = ((invalidSequenceErrors / schedule.drillersPerDay.length) * 100).toFixed(1);
      sacrificed.push(`⚠️ Transiciones B→S sin descanso (${invalidSequenceErrors} casos, ${percentage}%):`);
      sacrificed.push(`   • Prioridad "Descanso mínimo": ${PRIORITY_LABELS[priorities.minimumRest]}`);
      if (priorities.minimumRest === 'high') {
        sacrificed.push(`   • La prioridad es Alta pero aún hay errores. Aumentar días de descanso.`);
      } else {
        sacrificed.push(`   • Flexibilizado para priorizar: Mantener 2 perforando y períodos continuos`);
      }
    }

    if (shortDrillingErrors > 0) {
      const percentage = ((shortDrillingErrors / schedule.drillersPerDay.length) * 100).toFixed(1);
      sacrificed.push(`⏱️ Períodos de perforación cortos (${shortDrillingErrors} casos, ${percentage}%):`);
      sacrificed.push(`   • Prioridad "Perforación mínima": ${PRIORITY_LABELS[priorities.minimumDrilling]}`);
      if (priorities.minimumDrilling === 'high') {
        sacrificed.push(`   • La prioridad es Alta pero aún hay errores. Ajustar régimen de trabajo.`);
      } else {
        sacrificed.push(`   • Flexibilizado para priorizar: Mantener 2 perforando y régimen de trabajo`);
      }
    }

    if (sacrificed.length === 0) {
      sacrificed.push('✅ No hay reglas flexibilizadas. Todas las restricciones se cumplen.');
    }

    return sacrificed;
  };

  /**
   * Maneja la generación del cronograma
   */
  const handleGenerateSchedule = async () => {
    setIsLoading(true);
    setError('');
    setSuggestions([]);
    
    const startTime = performance.now();
    
    try {
      // Validar inputs
      if (workDays < 7 || workDays > 30) {
        throw new Error('Los días de trabajo deben estar entre 7 y 30');
      }
      
      if (restDays < 3 || restDays > 15) {
        throw new Error('Los días de descanso deben estar entre 3 y 15');
      }
      
      if (inductionDays < 1 || inductionDays > 5) {
        throw new Error('Los días de inducción deben estar entre 1 y 5');
      }
      
      if (totalDrillingDays < 10 || totalDrillingDays > 365) {
        throw new Error('Los días totales de perforación deben estar entre 10 y 365');
      }

      // Crear configuración con prioridades
      const config: ScheduleConfig = {
        regime: {
          workDays,
          restDays
        },
        inductionDays,
        totalDrillingDays,
        priorities
      };

      // Generar cronograma
      const generator = new ScheduleGenerator(config);
      const newSchedule = generator.generateSchedule();
      
      setSchedule(newSchedule);
      
      // Generar sugerencias si hay errores
      const newSuggestions = generateSuggestions(newSchedule);
      setSuggestions(newSuggestions);
      
      // Calcular tiempo transcurrido
      const endTime = performance.now();
      const elapsedMs = endTime - startTime;
      const minutes = Math.floor(elapsedMs / 60000);
      const seconds = ((elapsedMs % 60000) / 1000).toFixed(2);
      
      const timeMessage = minutes > 0 
        ? `${minutes} min ${seconds} seg`
        : `${seconds} seg`;
      
      // Capturar fecha y hora de realización
      const now = new Date();
      const dateTimeMessage = now.toLocaleString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      
      setCalculationTime(timeMessage);
      setCalculationDateTime(dateTimeMessage);
      
      // Scroll automático al cronograma solo cuando se presiona el botón
      setTimeout(() => {
        scheduleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Renderiza la celda de un día específico
   */
  const renderDayCell = (state: SupervisorState, day: number): React.JSX.Element => {
    // Verificar si este día tiene error específico
    const dayErrors = schedule?.errors.filter(e => e.day === day) || [];
    const hasThreeDrillers = dayErrors.some(e => e.type === 'THREE_DRILLING');
    const hasOneDriller = dayErrors.some(e => e.type === 'ONE_DRILLING');
    const hasSequenceError = dayErrors.some(e => e.type === 'INVALID_SEQUENCE');
    const hasShortDrilling = dayErrors.some(e => e.type === 'SHORT_DRILLING');
    
    const baseClasses = `px-2 py-1 text-center text-sm font-medium border ${STATE_COLORS[state]}`;
    let errorClasses = '';
    let errorIcon = '';
    let errorBadge = '';
    let tooltipText = `Día ${day}: ${STATE_NAMES[state]}`;
    let isCriticalError = false;
    let isMediumError = false;
    
    // Determinar tipo de error según prioridad
    if (hasThreeDrillers) {
      const errorPriority = priorities.noThreeDrillers;
      isCriticalError = errorPriority === 'high';
      isMediumError = errorPriority === 'medium';
      errorClasses = 'ring-2 ring-purple-600 ring-inset';
      errorIcon = '🟣';
      errorBadge = isCriticalError ? `Día ${day}` : isMediumError ? `D${day}` : '';
      tooltipText += ' - ERROR CRÍTICO: 3 supervisores perforando';
    } else if (hasOneDriller) {
      const errorPriority = priorities.twoDrillers;
      isCriticalError = errorPriority === 'high';
      isMediumError = errorPriority === 'medium';
      errorClasses = 'ring-2 ring-orange-500 ring-inset';
      errorIcon = '🟠';
      errorBadge = isCriticalError ? `Día ${day}` : isMediumError ? `D${day}` : '';
      tooltipText += ' - ADVERTENCIA: Solo 1 supervisor';
    } else if (hasSequenceError) {
      const errorPriority = priorities.minimumRest;
      isCriticalError = errorPriority === 'high';
      isMediumError = errorPriority === 'medium';
      errorClasses = 'ring-2 ring-yellow-500 ring-inset';
      errorIcon = '⚠️';
      errorBadge = isCriticalError ? `Día ${day}` : isMediumError ? `D${day}` : '';
      tooltipText += ' - Secuencia inválida';
    } else if (hasShortDrilling) {
      const errorPriority = priorities.minimumDrilling;
      isCriticalError = errorPriority === 'high';
      isMediumError = errorPriority === 'medium';
      errorClasses = 'ring-2 ring-yellow-500 ring-inset';
      errorIcon = '⚠️';
      errorBadge = isCriticalError ? `Día ${day}` : isMediumError ? `D${day}` : '';
      tooltipText += ' - Periodo corto';
    }
    
    return (
      <td 
        key={day}
        className={`${baseClasses} ${errorClasses} relative min-w-[60px]`}
        title={tooltipText}
      >
        {errorIcon && <span className="absolute top-0 right-0 text-xs leading-none">{errorIcon}</span>}
        <div className="flex flex-col items-center justify-center">
          <span className="font-bold">{state}</span>
          {errorBadge && (
            <span className={`text-[9px] font-bold mt-0.5 ${
              isCriticalError ? 'text-red-900' : 'text-orange-700'
            }`}>
              {errorBadge}
            </span>
          )}
        </div>
      </td>
    );
  };

  /**
   * Renderiza la fila de conteo de perforadores
   */
  const renderDrillersCountRow = (): React.JSX.Element => {
    if (!schedule) return <></>;
    const daysToShow = showAllDays ? schedule.drillersPerDay.length : 50;

    return (
      <tr className="bg-gray-100">
        <td className="px-4 py-2 font-bold text-gray-700 sticky left-0 z-10 bg-gray-100">Perforando</td>
        {schedule.drillersPerDay.slice(0, daysToShow).map((count, day) => {
          const hasError = count !== 2 && day > inductionDays;
          const cellClasses = `px-2 py-1 text-center font-bold ${
            hasError ? 'bg-red-200 text-red-800' : 
            count === 2 ? 'bg-green-200 text-green-800' : 'bg-yellow-200 text-yellow-800'
          }`;
          
          return (
            <td key={day} className={cellClasses} title={`Día ${day}: ${count} supervisores perforando`}>
              {count}
            </td>
          );
        })}
      </tr>
    );
  };

  /**
   * Renderiza las sugerencias para corregir errores
   */
  const renderSuggestions = (): React.JSX.Element => {
    if (suggestions.length === 0) return <></>;

    const isSuccess = suggestions[0].startsWith('✅');
    const bgColor = isSuccess ? 'bg-green-50' : 'bg-yellow-50';
    const borderColor = isSuccess ? 'border-green-400' : 'border-yellow-400';
    const titleColor = isSuccess ? 'text-green-800' : 'text-yellow-800';
    const textColor = isSuccess ? 'text-green-700' : 'text-yellow-700';

    return (
      <div className={`p-4 ${bgColor} border-l-4 ${borderColor} rounded-lg`}>
        <h3 className={`text-lg font-medium ${titleColor} mb-2`}>
          {isSuccess ? '✨ Resultado del Análisis' : '💡 Sugerencias de Optimización'}
        </h3>
        <div className="space-y-1">
          {suggestions.map((suggestion, index) => (
            <div key={index} className={`text-sm ${textColor}`}>
              {suggestion}
            </div>
          ))}
        </div>
      </div>
    );
  };

  /**
   * Renderiza los trade-offs por prioridad
   */
  const renderSacrificedRules = (): React.JSX.Element => {
    if (!schedule) return <></>;

    const sacrificedRules = generateSacrificedRules(schedule);

    return (
      <div className="p-4 bg-purple-50 border-l-4 border-purple-400 rounded-lg">
        <h3 className="text-lg font-medium text-purple-800 mb-2">
          ⚖️ Trade-offs por Prioridad
        </h3>
        <div className="max-h-60 overflow-y-auto space-y-1">
          {sacrificedRules.map((rule, index) => (
            <div key={index} className="text-sm text-purple-700">
              {rule}
            </div>
          ))}
        </div>
      </div>
    );
  };

  /**
   * Renderiza los errores detectados
   */
  const renderErrors = (): React.JSX.Element => {
    if (!schedule || schedule.errors.length === 0) return <></>;

    return (
      <div className="p-4 bg-red-50 border-l-4 border-red-400 rounded-lg">
        <h3 className="text-lg font-medium text-red-800 mb-2">
          ⚠️ Errores Detectados ({schedule.errors.length})
        </h3>
        <div className="max-h-40 overflow-y-auto">
          {schedule.errors.slice(0, 10).map((error, index) => (
            <div key={index} className="text-sm text-red-700 mb-1">
              • {error.message}
            </div>
          ))}
          {schedule.errors.length > 10 && (
            <div className="text-sm text-red-600 font-medium">
              ... y {schedule.errors.length - 10} errores más
            </div>
          )}
        </div>
      </div>
    );
  };

  /**
   * Renderiza la leyenda de colores
   */
  const renderLegend = (): React.JSX.Element => (
    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
      <h3 className="text-lg font-medium text-gray-900 mb-3">Leyenda de Estados</h3>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {Object.entries(STATE_COLORS).map(([state, colorClass]) => (
          <div key={state} className="flex items-center space-x-2">
            <div className={`w-6 h-6 rounded ${colorClass} border border-gray-300`}></div>
            <span className="text-sm font-semibold text-gray-900">
              {state === '-' ? 'Libre' : state} - {STATE_NAMES[state as SupervisorState]}
            </span>
          </div>
        ))}
      </div>
      
      {/* Leyenda de indicadores de error */}
      <div className="mt-4 pt-4 border-t border-gray-300">
        <h4 className="text-sm font-semibold text-gray-900 mb-2">Indicadores de Error en la Grilla:</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div className="flex items-center space-x-1">
            <span>�</span>
            <span className="text-gray-700">3 supervisores perforando</span>
          </div>
          <div className="flex items-center space-x-1">
            <span>🟠</span>
            <span className="text-gray-700">Solo 1 supervisor</span>
          </div>
          <div className="flex items-center space-x-1">
            <span>⚠️</span>
            <span className="text-gray-700">Secuencia inválida</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="inline-block w-4 h-4 border-2 border-green-600 rounded"></span>
            <span className="text-gray-700">Día óptimo</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Planificador de Turnos Mineros
          </h1>
          <p className="text-lg text-gray-600">
            Sistema de cronogramas para supervisores de perforación
          </p>
        </div>

        {/* Formulario de configuración */}
        <div className="bg-white shadow-lg rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Configuración del Cronograma
          </h2>
          
          {/* Botones de Casuísticas Predefinidas */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">⚙️ Casuísticas de Prueba</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {CASUS_PRESETS.map((preset, index) => (
                <button
                  key={index}
                  onClick={() => loadPreset(preset)}
                  className={`px-4 py-3 rounded-lg transition-colors text-sm font-medium ${
                    selectedPreset === preset.name
                      ? 'bg-green-600 text-white ring-2 ring-green-400'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  <div className="font-bold">{preset.name}</div>
                  <div className="text-xs mt-1 opacity-90">{preset.description}</div>
                  {selectedPreset === preset.name && (
                    <div className="text-xs mt-1 font-bold">✓ Seleccionada</div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Separador */}
          <div className="border-t border-gray-200 my-6"></div>

          {/* Panel de Prioridades del Algoritmo */}
          <div className="mb-6">
            <button
              onClick={() => setShowPriorities(!showPriorities)}
              className="flex items-center justify-between w-full text-left"
            >
              <h3 className="text-lg font-medium text-gray-900">⚙️ Prioridades del Algoritmo</h3>
              <span className="text-gray-500 text-sm">
                {showPriorities ? '▼ Ocultar' : '▶ Mostrar'}
              </span>
            </button>
            <p className="text-xs text-gray-600 mt-1">
              Las reglas del cronograma son conflictivas. Ajusta las prioridades para decidir qué restricciones son más importantes.
            </p>
            
            {showPriorities && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                {/* Prioridad: Mantener 2 perforando */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    🎯 Mantener 2 perforando
                  </label>
                  <select
                    value={priorities.twoDrillers}
                    onChange={(e) => updatePriority('twoDrillers', e.target.value as PriorityLevel)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium ${PRIORITY_COLORS[priorities.twoDrillers]}`}
                  >
                    {(['high', 'medium', 'low'] as PriorityLevel[]).map(level => (
                      <option key={level} value={level}>{PRIORITY_LABELS[level]}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-600 mt-1">Alta = sacrifica descanso para llenar huecos</p>
                </div>

                {/* Prioridad: Descanso mínimo */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    😴 Descanso mínimo
                  </label>
                  <select
                    value={priorities.minimumRest}
                    onChange={(e) => updatePriority('minimumRest', e.target.value as PriorityLevel)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium ${PRIORITY_COLORS[priorities.minimumRest]}`}
                  >
                    {(['high', 'medium', 'low'] as PriorityLevel[]).map(level => (
                      <option key={level} value={level}>{PRIORITY_LABELS[level]}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-600 mt-1">Baja = permite transición B→S directa</p>
                </div>

                {/* Prioridad: Perforación mínima */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    ⏱️ Perforación mínima
                  </label>
                  <select
                    value={priorities.minimumDrilling}
                    onChange={(e) => updatePriority('minimumDrilling', e.target.value as PriorityLevel)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium ${PRIORITY_COLORS[priorities.minimumDrilling]}`}
                  >
                    {(['high', 'medium', 'low'] as PriorityLevel[]).map(level => (
                      <option key={level} value={level}>{PRIORITY_LABELS[level]}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-600 mt-1">Baja = permite períodos de 1 día</p>
                </div>

                {/* Prioridad: Evitar 3 perforando */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    🚫 Evitar 3 perforando
                  </label>
                  <select
                    value={priorities.noThreeDrillers}
                    onChange={(e) => updatePriority('noThreeDrillers', e.target.value as PriorityLevel)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium ${PRIORITY_COLORS[priorities.noThreeDrillers]}`}
                  >
                    {(['high', 'medium', 'low'] as PriorityLevel[]).map(level => (
                      <option key={level} value={level}>{PRIORITY_LABELS[level]}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-600 mt-1">Alta = nunca más de 2 supervisores</p>
                </div>
              </div>
            )}
          </div>

          {/* Separador */}
          <div className="border-t border-gray-200 my-6"></div>
          
          {/* Inputs manuales */}
          <h3 className="text-lg font-medium text-gray-900 mb-4">✏️ Configuración Manual</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label htmlFor="workDays" className="block text-sm font-medium text-gray-900 mb-2">
                Días de Trabajo
              </label>
              <input
                id="workDays"
                type="number"
                min="7"
                max="30"
                value={workDays}
                onChange={(e) => setWorkDays(parseInt(e.target.value) || 14)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium placeholder:text-gray-500"
                placeholder="14"
              />
              <p className="text-xs text-gray-700 mt-1 font-medium">Régimen: {workDays}x{restDays}</p>
            </div>

            <div>
              <label htmlFor="restDays" className="block text-sm font-medium text-gray-900 mb-2">
                Días de Descanso
              </label>
              <input
                id="restDays"
                type="number"
                min="3"
                max="15"
                value={restDays}
                onChange={(e) => setRestDays(parseInt(e.target.value) || 7)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium placeholder:text-gray-500"
                placeholder="7"
              />
              <p className="text-xs text-gray-700 mt-1 font-medium">Descanso real: {restDays - 2} días</p>
            </div>

            <div>
              <label htmlFor="inductionDays" className="block text-sm font-medium text-gray-900 mb-2">
                Días de Inducción
              </label>
              <input
                id="inductionDays"
                type="number"
                min="1"
                max="5"
                value={inductionDays}
                onChange={(e) => setInductionDays(parseInt(e.target.value) || 5)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium placeholder:text-gray-500"
                placeholder="5"
              />
              <p className="text-xs text-gray-700 mt-1 font-medium">Capacitación inicial</p>
            </div>

            <div>
              <label htmlFor="totalDrillingDays" className="block text-sm font-medium text-gray-900 mb-2">
                Total Días Perforación
              </label>
              <input
                id="totalDrillingDays"
                type="number"
                min="10"
                max="365"
                value={totalDrillingDays}
                onChange={(e) => setTotalDrillingDays(parseInt(e.target.value) || 30)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium placeholder:text-gray-500"
                placeholder="30"
              />
              <p className="text-xs text-gray-700 mt-1 font-medium">Días de trabajo efectivo</p>
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={handleGenerateSchedule}
              disabled={isLoading}
              className="w-full md:w-auto bg-blue-600 text-white px-8 py-3 rounded-md font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Generando Cronograma...' : 'Calcular Cronograma'}
            </button>
          </div>

          {calculationTime && calculationDateTime && (
            <div className="mt-4 p-4 bg-green-100 border-l-4 border-green-500 text-green-700 animate-fade-in">
              <p className="font-medium flex items-center gap-2">
                <span className="text-xl">✅</span>
                Cronograma realizado
              </p>
              <div className="mt-2 text-sm space-y-1">
                <p className="flex items-center gap-2">
                  <span className="font-semibold">📅 Fecha y hora:</span>
                  <span>{calculationDateTime}</span>
                </p>
                <p className="flex items-center gap-2">
                  <span className="font-semibold">⏱️ Tiempo de cálculo:</span>
                  <span>{calculationTime}</span>
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-100 border-l-4 border-red-500 text-red-700">
              <p className="font-medium">Error:</p>
              <p>{error}</p>
            </div>
          )}
        </div>

        {/* Cronograma generado */}
        {schedule && (
          <div ref={scheduleRef} className="bg-white shadow-lg rounded-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">
                Cronograma Generado
              </h2>
              <button
                onClick={() => setShowAllDays(!showAllDays)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              >
                {showAllDays ? `Mostrar primeros 50 días` : `Mostrar todos los ${schedule.s1.length} días`}
              </button>
            </div>

            {renderLegend()}

            <div className="mt-6 overflow-x-auto" style={{ maxHeight: showAllDays ? '600px' : 'none', overflowY: showAllDays ? 'auto' : 'visible' }}>
              <table className="min-w-full border-collapse border border-gray-300">
                <thead className="sticky top-0 bg-gray-200 z-10">
                  <tr>
                    <th className="px-4 py-2 text-left font-bold text-gray-700 border border-gray-300 sticky left-0 bg-gray-200 z-20">
                      Supervisor
                    </th>
                    {Array.from({ length: showAllDays ? schedule.s1.length : Math.min(50, schedule.s1.length) }, (_, i) => (
                      <th key={i} className="px-2 py-1 text-center text-xs font-medium text-gray-700 border border-gray-300 min-w-[60px]">
                        {i}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Supervisor 1 */}
                  <tr>
                    <td className="px-4 py-2 font-bold text-gray-700 bg-blue-50 sticky left-0 z-10">S1</td>
                    {schedule.s1.slice(0, showAllDays ? schedule.s1.length : 50).map((dayState, index) => 
                      renderDayCell(dayState.state, index)
                    )}
                  </tr>
                  
                  {/* Supervisor 2 */}
                  <tr>
                    <td className="px-4 py-2 font-bold text-gray-700 bg-green-50 sticky left-0 z-10">S2</td>
                    {schedule.s2.slice(0, showAllDays ? schedule.s2.length : 50).map((dayState, index) => 
                      renderDayCell(dayState.state, index)
                    )}
                  </tr>
                  
                  {/* Supervisor 3 */}
                  <tr>
                    <td className="px-4 py-2 font-bold text-gray-700 bg-yellow-50 sticky left-0 z-10">S3</td>
                    {schedule.s3.slice(0, showAllDays ? schedule.s3.length : 50).map((dayState, index) => 
                      renderDayCell(dayState.state, index)
                    )}
                  </tr>

                  {/* Fila de conteo */}
                  {renderDrillersCountRow()}
                </tbody>
              </table>
            </div>

            {/* Estadísticas */}
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-900 text-sm">Días Mostrados</h3>
                <p className="text-2xl font-bold text-blue-600">{showAllDays ? schedule.s1.length : Math.min(50, schedule.s1.length)}</p>
                <p className="text-xs text-blue-700">de {schedule.s1.length} totales</p>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-900 text-sm">2 Perforando ✅</h3>
                <p className="text-2xl font-bold text-green-600">
                  {schedule.drillersPerDay.filter(count => count === 2).length}
                </p>
                <p className="text-xs text-green-700">
                  de {schedule.drillersPerDay.length} ({((schedule.drillersPerDay.filter(count => count === 2).length / schedule.drillersPerDay.length) * 100).toFixed(1)}%)
                </p>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="font-semibold text-purple-900 text-sm">3 Perforando 🟣</h3>
                <p className="text-2xl font-bold text-purple-600">
                  {schedule.drillersPerDay.filter(count => count === 3).length}
                </p>
                <p className="text-xs text-purple-700">
                  de {schedule.drillersPerDay.length} ({((schedule.drillersPerDay.filter(count => count === 3).length / schedule.drillersPerDay.length) * 100).toFixed(1)}%)
                </p>
              </div>
              
              <div className="bg-orange-50 p-4 rounded-lg">
                <h3 className="font-semibold text-orange-900 text-sm">1 Perforando 🟠</h3>
                <p className="text-2xl font-bold text-orange-600">
                  {schedule.drillersPerDay.filter(count => count === 1).length}
                </p>
                <p className="text-xs text-orange-700">
                  de {schedule.drillersPerDay.length} ({((schedule.drillersPerDay.filter(count => count === 1).length / schedule.drillersPerDay.length) * 100).toFixed(1)}%)
                </p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 text-sm">0 Perforando</h3>
                <p className="text-2xl font-bold text-gray-600">
                  {schedule.drillersPerDay.filter(count => count === 0).length}
                </p>
                <p className="text-xs text-gray-700">
                  de {schedule.drillersPerDay.length} ({((schedule.drillersPerDay.filter(count => count === 0).length / schedule.drillersPerDay.length) * 100).toFixed(1)}%)
                </p>
              </div>
              
              <div className="bg-red-50 p-4 rounded-lg">
                <h3 className="font-semibold text-red-900 text-sm">Errores Detectados</h3>
                <p className="text-2xl font-bold text-red-600">{schedule.errors.length}</p>
                <p className="text-xs text-red-700">requieren ajustes</p>
              </div>
            </div>

            {/* Sugerencias, Reglas Sacrificadas y Errores después de la tabla */}
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
              {renderSuggestions()}
              {renderSacrificedRules()}
              {renderErrors()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}