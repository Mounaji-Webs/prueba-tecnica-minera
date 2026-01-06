# Planificador de Turnos Mineros

**Desarrollado por**: Lucilo del Castillo  
 con asistencia de IA para acelerar el desarrollo. 
 
Portfolio: [lucilo-portfolio.vercel.app](https://lucilo-portfolio.vercel.app/)


## Descripción

Sistema automatizado para planificar turnos de 3 supervisores de perforación en operaciones mineras. Desarrollado con asistencia de IA (GitHub Copilot).

### Desafío de Requisitos Conflictivos

Durante el desarrollo se identificó que algunos requisitos eran mutuamente excluyentes en ciertos regímenes (ej: 7x7, 10x5). Mantener **siempre exactamente 2 supervisores perforando** es matemáticamente imposible en configuraciones con:
- Ciclos muy cortos
- Días de inducción largos
- Transiciones entre supervisores

Por ello, se implementó un **sistema de prioridades**:
1. **Nunca 3 supervisores simultáneos** (prioridad máxima - seguridad)
2. **Minimizar días con 1 supervisor** (mejor esfuerzo)
3. **Detectar y reportar** configuraciones subóptimas con sugerencias de mejora

El sistema valida, detecta errores y sugiere ajustes automáticamente.


## Instalación

```bash
npm install
npm run dev
```

Abrir `http://localhost:3000`

## Stack Tecnológico

- Next.js 16 + React 19
- TypeScript 5
- Tailwind CSS 4
- Jest + Testing Library

## Características

- ✅ Algoritmo de coordinación de 3 supervisores
- ✅ Validación automática de reglas
- ✅ Interfaz con casuísticas predefinidas
- ✅ Sistema de sugerencias inteligentes
- ✅ Visualización colorida del cronograma
- ✅ Tests unitarios completos

---

## 🚀 Comandos Útiles

```bash
# Desarrollo
npm run dev              # Servidor local en http://localhost:3000
npm run build            # Build de producción
npm run start            # Servidor de producción

# Calidad
npm run lint             # Linting del código
npm test                 # Ejecutar tests
npm run test:coverage    # Cobertura de tests
```

---

## 📫 Contacto

**Lucilo del Castillo**  
Portfolio: [lucilo-portfolio.vercel.app](https://lucilo-portfolio.vercel.app/)

---


---

_Enero 2026 - Prueba Técnica de Planificación de Turnos Mineros_  
**Versión**: 1.0.0## Testing

```bash
npm test                # Ejecutar tests
npm run test:watch      # Modo watch
npm run test:coverage   # Cobertura
```

---

