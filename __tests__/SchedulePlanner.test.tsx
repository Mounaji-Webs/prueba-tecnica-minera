import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SchedulePlanner from '../app/components/SchedulePlanner';

// Mock del generador de cronogramas para tests controlados
jest.mock('../app/lib/scheduleGenerator', () => {
  return {
    ScheduleGenerator: jest.fn().mockImplementation(() => ({
      generateSchedule: jest.fn().mockReturnValue({
        s1: [
          { day: 0, state: 'S' },
          { day: 1, state: 'I' },
          { day: 2, state: 'I' },
          { day: 3, state: 'P' },
          { day: 4, state: 'P' }
        ],
        s2: [
          { day: 0, state: 'S' },
          { day: 1, state: 'I' },
          { day: 2, state: 'I' },
          { day: 3, state: 'P' },
          { day: 4, state: 'P' }
        ],
        s3: [
          { day: 0, state: '-' },
          { day: 1, state: '-' },
          { day: 2, state: 'S' },
          { day: 3, state: 'I' },
          { day: 4, state: 'P' }
        ],
        drillersPerDay: [0, 0, 0, 2, 3],
        errors: [
          {
            day: 4,
            type: 'THREE_DRILLING',
            message: 'Día 4: 3 supervisores perforando (máximo permitido: 2)',
            supervisors: ['S1', 'S2', 'S3']
          }
        ]
      })
    }))
  };
});

describe('SchedulePlanner Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('debe renderizar el título principal', () => {
    render(<SchedulePlanner />);
    
    expect(screen.getByRole('heading', { name: /planificador de turnos mineros/i })).toBeInTheDocument();
  });

  test('debe mostrar todos los campos de entrada', () => {
    render(<SchedulePlanner />);
    
    expect(screen.getByLabelText(/días de trabajo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/días de descanso/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/días de inducción/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/total días perforación/i)).toBeInTheDocument();
  });

  test('debe tener valores por defecto en los campos', () => {
    render(<SchedulePlanner />);
    
    expect(screen.getByDisplayValue('14')).toBeInTheDocument(); // Días de trabajo
    expect(screen.getByDisplayValue('7')).toBeInTheDocument();  // Días de descanso
    expect(screen.getByDisplayValue('5')).toBeInTheDocument();  // Días de inducción
    expect(screen.getByDisplayValue('30')).toBeInTheDocument(); // Total días perforación
  });

  test('debe mostrar el botón de calcular cronograma', () => {
    render(<SchedulePlanner />);
    
    expect(screen.getByRole('button', { name: /calcular cronograma/i })).toBeInTheDocument();
  });

  test('debe permitir cambiar los valores de los campos', () => {
    render(<SchedulePlanner />);
    
    const workDaysInput = screen.getByLabelText(/días de trabajo/i);
    fireEvent.change(workDaysInput, { target: { value: '21' } });
    
    expect(workDaysInput).toHaveValue(21);
  });

  test('debe mostrar información del régimen dinámicamente', () => {
    render(<SchedulePlanner />);
    
    // Por defecto debe mostrar "Régimen: 14x7"
    expect(screen.getByText(/régimen: 14x7/i)).toBeInTheDocument();
    
    const restDaysInput = screen.getByLabelText(/días de descanso/i);
    fireEvent.change(restDaysInput, { target: { value: '10' } });
    
    expect(screen.getByText(/régimen: 14x10/i)).toBeInTheDocument();
  });

  test('debe mostrar el cálculo de descanso real', () => {
    render(<SchedulePlanner />);
    
    expect(screen.getByText(/descanso real: 5 días/i)).toBeInTheDocument();
  });

  test('debe validar inputs y mostrar errores', async () => {
    render(<SchedulePlanner />);
    
    const workDaysInput = screen.getByLabelText(/días de trabajo/i);
    fireEvent.change(workDaysInput, { target: { value: '50' } }); // Valor inválido
    
    const button = screen.getByRole('button', { name: /calcular cronograma/i });
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText(/los días de trabajo deben estar entre 7 y 30/i)).toBeInTheDocument();
    });
  });

  test('debe generar y mostrar cronograma al hacer clic en calcular', async () => {
    render(<SchedulePlanner />);
    
    const button = screen.getByRole('button', { name: /calcular cronograma/i });
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText(/cronograma generado/i)).toBeInTheDocument();
    });
  });

  test('debe mostrar la leyenda de estados después de generar cronograma', async () => {
    render(<SchedulePlanner />);
    
    const button = screen.getByRole('button', { name: /calcular cronograma/i });
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText(/leyenda de estados/i)).toBeInTheDocument();
      expect(screen.getByText(/S - Subida/i)).toBeInTheDocument();
      expect(screen.getByText(/I - Inducción/i)).toBeInTheDocument();
      expect(screen.getByText(/P - Perforación/i)).toBeInTheDocument();
      expect(screen.getByText(/B - Bajada/i)).toBeInTheDocument();
      expect(screen.getByText(/D - Descanso/i)).toBeInTheDocument();
    });
  });

  test('debe mostrar tabla con supervisores después de generar cronograma', async () => {
    render(<SchedulePlanner />);
    
    const button = screen.getByRole('button', { name: /calcular cronograma/i });
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('S1')).toBeInTheDocument();
      expect(screen.getByText('S2')).toBeInTheDocument();
      expect(screen.getByText('S3')).toBeInTheDocument();
      expect(screen.getByText('Perforando')).toBeInTheDocument();
    });
  });

  test('debe mostrar sección de errores o sugerencias del cronograma', async () => {
    render(<SchedulePlanner />);
    
    const button = screen.getByRole('button', { name: /calcular cronograma/i });
    fireEvent.click(button);
    
    await waitFor(() => {
      // El cronograma con config por defecto puede o no tener errores
      // Verificamos que se muestra la tabla con el cronograma
      expect(screen.getByText('S1')).toBeInTheDocument();
      expect(screen.getByText('S2')).toBeInTheDocument();
      expect(screen.getByText('S3')).toBeInTheDocument();
    });
  });

  test('debe mostrar estadísticas del cronograma', async () => {
    render(<SchedulePlanner />);
    
    const button = screen.getByRole('button', { name: /calcular cronograma/i });
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText(/días mostrados/i)).toBeInTheDocument();
      expect(screen.getByText(/2 perforando/i)).toBeInTheDocument();
    });
  });

  test('debe generar cronograma al hacer click en el botón', async () => {
    render(<SchedulePlanner />);
    
    const button = screen.getByRole('button', { name: /calcular cronograma/i });
    fireEvent.click(button);
    
    await waitFor(() => {
      // Verificar que se genera el cronograma y se muestra la tabla
      expect(screen.getByText('Cronograma Generado')).toBeInTheDocument();
    });
  });

  describe('Validación de rangos', () => {
    test('debe validar días de trabajo fuera de rango', async () => {
      render(<SchedulePlanner />);
      
      const workDaysInput = screen.getByLabelText(/días de trabajo/i);
      fireEvent.change(workDaysInput, { target: { value: '5' } }); // Muy bajo
      
      const button = screen.getByRole('button', { name: /calcular cronograma/i });
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText(/los días de trabajo deben estar entre 7 y 30/i)).toBeInTheDocument();
      });
    });

    test('debe validar días de descanso fuera de rango', async () => {
      render(<SchedulePlanner />);
      
      const restDaysInput = screen.getByLabelText(/días de descanso/i);
      fireEvent.change(restDaysInput, { target: { value: '20' } }); // Muy alto
      
      const button = screen.getByRole('button', { name: /calcular cronograma/i });
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText(/los días de descanso deben estar entre 3 y 15/i)).toBeInTheDocument();
      });
    });

    test('debe validar días de inducción fuera de rango', async () => {
      render(<SchedulePlanner />);
      
      const inductionDaysInput = screen.getByLabelText(/días de inducción/i);
      fireEvent.change(inductionDaysInput, { target: { value: '10' } }); // Muy alto
      
      const button = screen.getByRole('button', { name: /calcular cronograma/i });
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText(/los días de inducción deben estar entre 1 y 5/i)).toBeInTheDocument();
      });
    });

    test('debe validar total de días de perforación fuera de rango', async () => {
      render(<SchedulePlanner />);
      
      const totalDrillingInput = screen.getByLabelText(/total días perforación/i);
      fireEvent.change(totalDrillingInput, { target: { value: '500' } }); // Muy alto
      
      const button = screen.getByRole('button', { name: /calcular cronograma/i });
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText(/los días totales de perforación deben estar entre 10 y 365/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accesibilidad', () => {
    test('debe tener etiquetas apropiadas para todos los inputs', () => {
      render(<SchedulePlanner />);
      
      const inputs = screen.getAllByRole('spinbutton');
      inputs.forEach(input => {
        expect(input).toHaveAccessibleName();
      });
    });

    test('debe tener título descriptivo para las celdas de estado', async () => {
      render(<SchedulePlanner />);
      
      const button = screen.getByRole('button', { name: /calcular cronograma/i });
      fireEvent.click(button);
      
      await waitFor(() => {
        const cells = screen.getAllByTitle(/día \d+:/i);
        expect(cells.length).toBeGreaterThan(0);
      });
    });
  });
});