# CLAUDE.md

Guidance for Claude Code when working with this repository.

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Dev server (port 3000)
npm run build        # Production build
npm run preview      # Preview build
```

## Architecture

React 19 + TypeScript + Vite SPA simulating Portugal's demographic evolution 2024-2100.

### Data Layer (`data/`)

Runtime 2024 baseline data:

| File | Description |
|------|-------------|
| `population2024.ts` | Eurostat 1 January 2024 population by single year of age/sex (10,639,726 total) |
| `lifeTables.ts` | 2024 mortality rates (qx), calibrated to Eurostat life expectancy 79.7 M / 85.2 F |
| `fertilityRates.ts` | Eurostat 2024 ASFR calibrated to TFR 1.41, mean age 31.7 |
| `migrationProfile.ts` | Net migration profile inferred from official 2024-2025 population change and calibrated to the model's first transition |
| `economicParams.json` | SS rates, employment by age, Eurostat health accounts, GDP per worker |

### Simulation Engine (`utils/simulation.ts`)

**Cohort-component method** (UN/Eurostat standard):

1. Load 2024 population pyramid
2. Apply mortality with configurable improvement rates
3. Calculate births using scaled ASFR distribution
4. Distribute migration with normalized weights + carry-over
5. Track age 100+ internally through a 110+ open bucket (displayed as 100+)
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
- **Sustainability Index**: `100 × (1 - totalBurden / (GDP × 0.40))`, 0-100 scale
  - `totalBurden = ssDeficit + healthcareCost` (includes healthcare, not just SS)
  - `GDP = workforce × gdpPerWorker × inflationFactor`
  - 40% of GDP threshold = system breaking point (0 sustainability)

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

## Reference Values (Eurostat 2024 baseline)

| Metric | Value |
|--------|-------|
| Population | 10,639,726 |
| Median age | 47.1 |
| Life expectancy | 82.5 (M: 79.7, F: 85.2) |
| TFR | 1.41 |
| Calibrated net migration | +143,052 |

## Important Implementation Notes

1. **ASFR scaling**: User TFR is applied as ratio to the 2024 base 1.41 (`scaledASFR = baseASFR × (userTFR / 1.41)`)
2. **Migration normalization**: Weights don't sum to 1.0 in JSON; normalized dynamically in code
3. **Age 100+ handling**: Displayed as age 100+, internally split through a 110+ open bucket
4. **Pension calculation**: Excludes working retirees (15% of 65-69, 4% of 70+)
5. **Healthcare currency**: Eurostat health spending is stored directly in EUR per inhabitant
6. **Population validation**: Console warning if balance error >500 per year
