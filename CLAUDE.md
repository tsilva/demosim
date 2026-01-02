# CLAUDE.md

Guidance for Claude Code when working with this repository.

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Dev server (port 3000)
npm run build        # Production build
npm run preview      # Preview build
```

Requires `GEMINI_API_KEY` in `.env.local` for AI analysis.

## Architecture

React 19 + TypeScript + Vite SPA simulating Portugal's demographic evolution 2024-2100.

### Data Layer (`data/`)

INE 2024 calibrated data:

| File | Description |
|------|-------------|
| `population2024.ts` | Population by single year of age/sex (10,749,635 total) |
| `lifeTables.ts` | Mortality rates (qx), life expectancy 78.73 M / 83.96 F |
| `fertilityRates.json` | ASFR calibrated to TFR 1.40 (sum verified), mean age 31.6 |
| `migrationProfile.json` | Age-sex migration weights (normalized in code) |
| `economicParams.json` | SS rates, employment by age, healthcare multipliers |

### Simulation Engine (`utils/simulation.ts`)

**Cohort-component method** (UN/Eurostat standard):

1. Load 2024 population pyramid
2. Apply mortality with configurable improvement rates
3. Calculate births using scaled ASFR distribution
4. Distribute migration with normalized weights + carry-over
5. Track age 100+ as aggregate (no longer dropped)
6. Validate population balance each year

Key functions:
- `generateInitialData()` - Returns 2024 population
- `getMortalityRate(age, sex, yearsFromBase, improvement)` - qx with improvement
- `getFertilityRate(age)` - ASFR for age (divide by 1000)
- `getMigrationWeight(age, sex)` - Normalized weight per age
- `calculateEconomicMetrics(...)` - SS balance, healthcare, sustainability
- `runSimulation(startYear, endYear, params)` - Main loop

### Economic Metrics (`calculateEconomicMetrics`)

- **SS Contributions**: `workforce × salary × 34.75%`
- **Pension Payments**: `actualPensioners × avgPension` (excludes working retirees)
- **Healthcare**: Per-capita cost × age multipliers (0.6x youth → 6x elderly)
- **Sustainability Index**: `100 × (1 - deficit/contributions)`, 0-100 scale

### Components

| Component | Purpose |
|-----------|---------|
| `PyramidChart.tsx` | Population pyramid (Recharts) |
| `TrendChart.tsx` | Dependency ratio over time |
| `EconomicMetrics.tsx` | SS balance, healthcare, sustainability display |

### Types (`types.ts`)

- `SimulationParams` - Retirement age, TFR, migration, mortality improvement, workforce shifts
- `EconomicMetrics` - Workforce, SS balance, healthcare, sustainability index
- `SCENARIO_PRESETS` - Low/Medium/High demographic scenarios

## Reference Values (INE 2024)

| Metric | Value |
|--------|-------|
| Population | 10,749,635 |
| Median age | 47.3 |
| Life expectancy | 81.49 (M: 78.73, F: 83.96) |
| TFR | 1.40 |
| Net migration | +109,909 |

## Important Implementation Notes

1. **ASFR scaling**: User TFR is applied as ratio to base 1.40 (`scaledASFR = baseASFR × (userTFR / 1.40)`)
2. **Migration normalization**: Weights don't sum to 1.0 in JSON; normalized dynamically in code
3. **Age 100+ handling**: Aggregated at age 100 with high mortality, not dropped
4. **Pension calculation**: Excludes working retirees (15% of 65-69, 4% of 70+)
5. **Healthcare currency**: USD values from OECD converted to EUR (×0.93)
6. **Population validation**: Console warning if balance error >100 per year
