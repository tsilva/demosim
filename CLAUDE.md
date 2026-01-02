# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (port 3000, host 0.0.0.0)
npm run build        # Production build
npm run preview      # Preview production build
```

Requires `GEMINI_API_KEY` environment variable in `.env.local` for AI analysis features.

## Architecture

React 19 + TypeScript + Vite single-page application that simulates Portugal's demographic evolution from 2024 to 2100.

### Data Layer (`data/`)

Real demographic data calibrated to INE (Instituto Nacional de Estatística) 2024 figures:

- `population2024.json` - Population by single year of age and sex (10,749,635 total)
- `lifeTables.json` - Mortality rates (qx) calibrated to life expectancy 78.73 (M), 83.96 (F)
- `fertilityRates.json` - Age-specific fertility rates (ASFR) for TFR 1.40, mean age 31.6
- `migrationProfile.json` - Age-sex migration distribution patterns
- `economicParams.json` - Social Security rates, employment, healthcare costs (for Phase 3)

### Simulation Engine (`utils/simulation.ts`)

Implements **cohort-component method** (standard used by UN, Eurostat, national statistics offices):

1. Loads real INE 2024 population pyramid data
2. Applies age-specific mortality rates with improvement factor over time
3. Calculates births using ASFR distribution (not uniform TFR)
4. Distributes migration using age-sex profiles
5. Computes dependency ratio: `(retired / working age) * 100`

Key functions:
- `generateInitialData()` - Returns real 2024 population from JSON
- `getMortalityRate(age, sex, yearsFromBase)` - Returns qx with mortality improvement
- `getFertilityRate(age)` - Returns ASFR for given age
- `getMigrationWeight(age, sex)` - Returns migration proportion for age group
- `runSimulation(startYear, endYear, params)` - Main projection loop

### Visualization (`components/`)

- `PyramidChart.tsx` - Population pyramid colored by retirement status
- `TrendChart.tsx` - Old-age dependency ratio over time
- Uses Recharts library

### AI Integration (`services/gemini.ts`)

Google Gemini Flash for demographic policy analysis.

### Main Application (`App.tsx`)

- State management and UI (~300 lines)
- Default params: retirement 66, TFR 1.40, net migration 110,000
- useMemo caches simulation, useEffect handles animation

## Key Reference Values (INE 2024)

- **Population**: 10,749,635 (5,140,276 M / 5,609,359 F)
- **Median age**: 47.3 years
- **Aging ratio**: 192.4 (elderly per 100 young)
- **Life expectancy**: 81.49 years (78.73 M / 83.96 F)
- **TFR**: 1.40 children per woman
- **Net migration 2024**: +109,909

## Improvement Plan

See `IMPROVEMENT_PLAN.md` for roadmap to add:
- Phase 2: Mortality improvement scenarios, fertility scenarios
- Phase 3: Economic burden calculations (€ per worker)
- Phase 4: Enhanced visualizations (Social Security balance, healthcare costs)
