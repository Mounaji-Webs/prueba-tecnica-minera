actua y evalua simepre como un ingeniero de software experto nivel maestro, implementa las correspondientes unit test para evaluar y que nada se rompa despues, codigo robusto, flexible y eficiente. 

prueba a desarrollar:
Una empresa minera necesita planificar los turnos de 3 supervisores de
perforación. El sistema debe generar automáticamente un cronograma que
cumpla las siguientes reglas:

REGLAS FUNDAMENTALES:
1. Siempre debe haber EXACTAMENTE 2 supervisores perforando
2. NUNCA deben estar 3 supervisores perforando al mismo tiempo
3. NUNCA debe haber solo 1 supervisor perforando (una vez que S3 entro)
4. El Supervisor 1 (S1) SIEMPRE cumple el régimen completo sin modificaciones
5. Los Supervisores 2 y 3 (S2, S3) se ajustan para cumplir las reglas

CICLO DE UN SUPERVISOR:
  S  = Subida (viaje al campo) - siempre 1 día
  I  = Inducción (capacitación) - configurable (1 a 5 días)
  P  = Perforación (trabajo efectivo)
  B  = Bajada (retorno) - siempre 1 día
  D  = Descanso

REGIMEN VARIABLE (NxM):
  N = Dias de trabajo (subida + induccion si aplica + perforacion)
  M = Dias libres (bajada + descanso)
  Dias de descanso REAL = M - 2 (restando subida y bajada)

                           


FORMATO DEL CRONOGRAMA
El cronograma se representa como una secuencia de dias:
  S - I1 - I2 - D1 - D2 - D3 - ... - D30 - B - DESC1 - DESC2 - ...

Donde:
  S  = Dia de subida
  I1-In = Dias de induccion (n = dias de induccion configurados)
  D1-Dn = Dias de perforacion (segun dias totales requeridos)
  B     = Dia de bajada
  DESCn = Dias de descanso

EJEMPLO VISUAL (Regimen 14x7, Induccion 5 dias, 30 dias de perforacion):

Dia:    0    1    2    3    4    5    6    7    8    9   10   11   12   13   14
S1:  [  S][  I][  I][  I][  I][  I][  P][  P][  P][  P][  P][  P][  P][  P][  P]
S2:  [  S][  I][  I][  I][  I][  I][  P][  P][  P][  P][  B][  D][  D][  S][  P]
S3:  [   ][   ][   ][   ][   ][   ][   ][   ][   ][  S][  I][  I][  I][  I][  I]

Dia:   15   16   17   18   19   20   21   22   23   24   25   26   27   28   29
S1:  [  B][  D][  D][  D][  D][  S][  P][  P][  P][  P][  P][  P][  P][  P][  P]
S2:  [  P][  P][  P][  P][  P][  P][  P][  P][  P][  P][  P][  P][  P][  B][  D]
S3:  [  P][  P][  P][  P][  P][  P][  P][  P][  P][  B][  D][  D][  D][  D][  S]






 CASUISTICAS

A continuacion se presentan diferentes escenarios que el algoritmo debe manejar:
CASUISTICA 1: Regimen 14x7 con 5 dias de induccion
Parametros:
  - Dias de trabajo: 14
  - Dias de descanso total: 7
  - Dias de descanso real: 7 - 2 = 5 dias
  - Dias de induccion: 5
  - Dias de perforacion primer ciclo: 14 - 5 = 9 dias
  - Total dias a perforar: 30

Calculos clave:
  - S1 baja dia: 1 + 14 = dia 15
  - S3 debe entrar dia: 15 - 5 - 1 = dia 9
  - S3 empieza a perforar dia: 9 + 1 + 5 = dia 15
  - S2 debe bajar dia 15 (cuando S3 empieza a perforar)
  - Perforacion inicial S2: 15 - 5 - 2 = 8 dias aproximadamente

CRONOGRAMA ESPERADO:

Dia |  0 |  1 |  2 |  3 |  4 |  5 |  6 |  7 |  8 |  9 | 10 | 11 | 12 | 13 | 14 |
----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----
 S1 |  S |  I |  I |  I |  I |  I |  P |  P |  P |  P |  P |  P |  P |  P |  P |
 S2 |  S |  I |  I |  I |  I |  I |  P |  P |  P |  P |  P |  P |  P |  P |  B |
 S3 |  - |  - |  - |  - |  - |  - |  - |  - |  - |  S |  I |  I |  I |  I |  I |
#P  |  0 |  0 |  0 |  0 |  0 |  0 |  2 |  2 |  2 |  2 |  2 |  2 |  2 |  2 |  1 |

Dia | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 |
----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----
 S1 |  B |  D |  D |  D |  D |  D |  S |  P |  P |  P |  P |  P |  P |  P |  P |
 S2 |  D |  D |  D |  S |  P |  P |  P |  P |  P |  P |  P |  P |  P |  P |  P |
 S3 |  P |  P |  P |  P |  P |  P |  P |  P |  P |  B |  D |  D |  D |  D |  D |
#P  |  1 |  1 |  1 |  2 |  2 |  2 |  2 |  2 |  2 |  2 |  2 |  2 |  2 |  2 |  2 |

NOTA: Los dias 15-17 muestran solo 1 perforando. El algoritmo debe ajustar
      para que S2 vuelva antes y siempre haya 2 perforando.

--------------------------------------------------------------------------------
CASUISTICA 2: Regimen 21x7 con 3 dias de induccion
--------------------------------------------------------------------------------

Parametros:
  - Dias de trabajo: 21
  - Dias de descanso total: 7
  - Dias de descanso real: 7 - 2 = 5 dias
  - Dias de induccion: 3
  - Dias de perforacion primer ciclo: 21 - 3 = 18 dias
  - Total dias a perforar: 30

Calculos clave:
  - S1 baja dia: 1 + 21 = dia 22
  - S3 debe entrar dia: 22 - 3 - 1 = dia 18
  - S3 empieza a perforar dia: 18 + 1 + 3 = dia 22
  - S2 debe coordinar para cubrir cuando S1 baje

CRONOGRAMA ESPERADO (primeros 30 dias):

Dia |  0 |  1 |  2 |  3 |  4 |  5 |  6 |  7 |  8 |  9 | 10 | 11 | 12 | 13 | 14 |
----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----
 S1 |  S |  I |  I |  I |  P |  P |  P |  P |  P |  P |  P |  P |  P |  P |  P |
 S2 |  S |  I |  I |  I |  P |  P |  P |  P |  P |  P |  P |  P |  P |  P |  P |
 S3 |  - |  - |  - |  - |  - |  - |  - |  - |  - |  - |  - |  - |  - |  - |  - |
#P  |  0 |  0 |  0 |  0 |  2 |  2 |  2 |  2 |  2 |  2 |  2 |  2 |  2 |  2 |  2 |

Dia | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 |
----|----|----|----|----|----|----|----|----|----|----|----|----|----|----|----
 S1 |  P |  P |  P |  P |  P |  P |  P |  B |  D |  D |  D |  D |  D |  S |  P |
 S2 |  P |  P |  P |  P |  P |  P |  B |  D |  D |  S |  P |  P |  P |  P |  P |
 S3 |  - |  - |  - |  S |  I |  I |  I |  P |  P |  P |  P |  P |  P |  P |  P |
#P  |  2 |  2 |  2 |  2 |  2 |  2 |  1 |  1 |  1 |  2 |  2 |  2 |  2 |  2 |  2 |

--------------------------------------------------------------------------------
CASUISTICA 3: Regimen 10x5 con 2 dias de induccion
--------------------------------------------------------------------------------

Parametros:
  - Dias de trabajo: 10
  - Dias de descanso total: 5
  - Dias de descanso real: 5 - 2 = 3 dias
  - Dias de induccion: 2
  - Dias de perforacion primer ciclo: 10 - 2 = 8 dias
  - Total dias a perforar: 30

Calculos clave:
  - S1 baja dia: 1 + 10 = dia 11
  - S3 debe entrar dia: 11 - 2 - 1 = dia 8
  - S3 empieza a perforar dia: 8 + 1 + 2 = dia 11
  - Ciclo mas corto = transiciones mas frecuentes

--------------------------------------------------------------------------------
CASUISTICA 4: Regimen 14x6 con 4 dias de induccion
--------------------------------------------------------------------------------

Parametros:
  - Dias de trabajo: 14
  - Dias de descanso total: 6
  - Dias de descanso real: 6 - 2 = 4 dias
  - Dias de induccion: 4
  - Dias de perforacion primer ciclo: 14 - 4 = 10 dias
  - Total dias a perforar: 30

Calculos clave:
  - S1 baja dia: 1 + 14 = dia 15
  - S3 debe entrar dia: 15 - 4 - 1 = dia 10
  - S3 empieza a perforar dia: 10 + 1 + 4 = dia 15

--------------------------------------------------------------------------------
CASUISTICA 5: Regimen 7x7 con 1 dia de induccion
--------------------------------------------------------------------------------

Parametros:
  - Dias de trabajo: 7
  - Dias de descanso total: 7
  - Dias de descanso real: 7 - 2 = 5 dias
  - Dias de induccion: 1
  - Dias de perforacion primer ciclo: 7 - 1 = 6 dias
  - Total dias a perforar: 30

Calculos clave:
  - S1 baja dia: 1 + 7 = dia 8
  - S3 debe entrar dia: 8 - 1 - 1 = dia 6
  - S3 empieza a perforar dia: 6 + 1 + 1 = dia 8
  - Ciclo muy corto = muchas transiciones

ERRORES COMUNES A EVITAR

ERROR 1: Tres supervisores perforando al mismo tiempo
---------------------------------------------------------
INCORRECTO:
Dia |  10 | 11 | 12 |
----|-----|----|----|
 S1 |  P  |  P |  P |
 S2 |  P  |  P |  P |
 S3 |  P  |  P |  P |  <-- ERROR: 3 perforando
#P  |  3  |  3 |  3 |

SOLUCION: S2 o S3 debe bajar antes de que el otro empiece a perforar


ERROR 2: Subida consecutiva (S-S)
---------------------------------------------------------
INCORRECTO:
Dia |  12 | 13 | 14 |
----|-----|----|----|
 S2 |  B  |  S |  S |  <-- ERROR: dos subidas seguidas

CORRECTO:
Dia |  12 | 13 | 14 |
----|-----|----|----|
 S2 |  B  |  D |  S |  <-- Al menos 1 dia de descanso


ERROR 3: Bajada despues de subida (sin perforacion)
---------------------------------------------------------
INCORRECTO:
Dia |  12 | 13 | 14 |
----|-----|----|----|
 S2 |  D  |  S |  B |  <-- ERROR: sube y baja sin perforar

CORRECTO:
Dia |  12 | 13 | 14 | 15 | ... | 25 | 26 |
----|-----|----|----|----| ... |----|----
 S2 |  D  |  S |  P |  P | ... |  P |  B |


ERROR 4: Solo 1 supervisor perforando (cuando S3 ya esta activo)
---------------------------------------------------------
INCORRECTO:
Dia |  15 | 16 | 17 |
----|-----|----|----|
 S1 |  B  |  D |  D |
 S2 |  D  |  D |  D |
 S3 |  P  |  P |  P |  <-- ERROR: solo S3 perfora
#P  |  1  |  1 |  1 |

SOLUCION: S2 debe volver antes para cubrir con S3


ERROR 5: Perforacion de 1 solo dia
---------------------------------------------------------
INCORRECTO:
Dia |  20 | 21 | 22 |
----|-----|----|----|
 S3 |  S  |  P |  B |  <-- ERROR: solo 1 dia de perforacion

CORRECTO: Minimo varios dias de perforacion por ciclo

                    






REQUISITOS DEL PROYECTO
Desarrollar una aplicacion web en REACT con Javascript que permita:
1. INPUTS (Configuracion):
   - Ingresar inputs de regimen de trabajo y dias de descanso que sean dinámicos (14x7 , 21x7 , etc)
   - Input para dias de induccion (1 a 5)
   - Input para total de dias de perforacion requeridos (ej: 30, 45, 90)
   - Boton "Calcular Cronograma"

2. OUTPUT (Visualizacion):
   - Tabla/grilla mostrando el cronograma de los 3 supervisores
   - Cada celda debe mostrar el estado (S, I, P, B, D) con colores diferentes
   - Fila adicional mostrando cantidad de supervisores perforando por dia
   - Indicador visual de errores (dias con != 2 perforando en rojo)

3. VALIDACIONES:
   - Mostrar alerta si hay dias con 3 perforando
   - Mostrar alerta si hay dias con 1 perforando (despues de que S3 entro)
   - Mostrar alerta si hay patrones invalidos (S-S, S-B, etc.)

4. COLORES SUGERIDOS:
   - Subida (S): Azul
   - Induccion (I): Amarillo/Naranja
   - Perforacion (P): Verde
   - Bajada (B): Rojo
   - Descanso (D): Gris
   - Vacio (-): Blanco

CRITERIOS DE EVALUACION

+----------------------------------------+--------+
| Criterio                               | Puntos |
+----------------------------------------+--------+
| Interfaz funcional con inputs          |   15   |
| Algoritmo genera cronograma correcto   |   30   |
| Validacion: nunca 3 perforando         |   15   |
| Validacion: siempre 2 perforando       |   15   |
| Visualizacion con colores              |   10   |
| Codigo limpio y documentado            |   10   |
| Deploy funcional (GitHub/Netlify)      |    5   |
+----------------------------------------+--------+
| TOTAL                                  |  100   |


CASOS DE PRUEBA OBLIGATORIOS:
-----------------------------
1. Regimen 14x7 con 5 dias de induccion, 90 dias de perforacion
2. Regimen 21x7 con 3 dias de induccion, 90 dias de perforacion
3. Regimen 10x5 con 2 dias de induccion, 90 dias de perforacion
4. Regimen 14x6 con 4 dias de induccion, 950dias de perforacion
