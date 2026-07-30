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

Next.js 16 App Router + React 19 + TypeScript simulator for Portugal's demographic evolution from 2026 to 2100.

### Data Layer (`data/`)

Runtime demographic data:

| File | Description |
|------|-------------|
| `population2026.ts` | INE revised 31 December 2025 population by single age/sex (11,424,031 total); INE 85+ split using Eurostat 2025 proportions |
| `europop2025Exact.json` | Generated exact annual EUROPOP2025 preset inputs and reference stocks |
| `projectionAssumptions.ts` | Typed accessors for the generated EUROPOP2025 snapshot |
| `fertilityRates.ts` | 2024 age-specific pattern used only by custom scenarios |
| `migrationProfile.ts` | Custom-scenario migration profile |
| `economicParams.json` | Official 2025 fiscal, employment, health, GDP, and EC long-term anchors |

### Simulation Engine (`utils/simulation.ts`)

**Cohort-component method** (UN/Eurostat standard):

1. Load the revised 1 January 2026 population pyramid
2. Apply age/sex survival using exact EUROPOP2025 preset transitions or custom improvement rates
3. Calculate births using exact annual EUROPOP2025 age-specific rates or the custom TFR profile
4. Add exact EUROPOP2025 target-age migration or a normalized custom profile
5. Track age 100+ as the same open cohort published by Eurostat
6. Validate population balance each year

Key functions:
- `generateInitialData()` - Returns the 2026 opening population
- `calculateEconomicMetrics(...)` - SS balance, healthcare, and observable age-related spending ratios
- `runSimulation(startYear, endYear, params)` - Main loop

### Economic Metrics (`calculateEconomicMetrics`)

- **SS balance**: CFP effective revenue minus effective expenditure, calibrated to 2025 execution
- **Public pensions**: Social Security + CGA, following EC reference spending shares with scenario demographic sensitivity
- **Healthcare**: Eurostat SHA 2025 totals and EC Ageing Report age/sex exposure and reference path
- **Fiscal pressure**: `(public pensions + public healthcare) / GDP`; no subjective breaking-point score
- Returned monetary outputs are inflation-adjusted constant 2025 EUR

### Components

| Component | Purpose |
|-----------|---------|
| `PyramidChart.tsx` | Population pyramid (Recharts) |
| `TrendChart.tsx` | Dependency ratio over time |
| `EconomicMetrics.tsx` | SS balance, healthcare, and fiscal-pressure display |

### Types (`types.ts`)

- `SimulationParams` - Retirement age, TFR, migration, mortality improvement, workforce shifts
- `EconomicMetrics` - Workforce, SS balance, healthcare, and public spending ratios
- `SCENARIO_PRESETS` - Low/Medium/High demographic scenarios

## Reference Values

| Metric | Value |
|--------|-------|
| Population (1 Jan 2026) | 11,424,031 |
| Median age (31 Dec 2025) | 45.8 |
| EUROPOP2025 baseline TFR (2026) | 1.46506 |
| EUROPOP2025 baseline net migration (2026) | +132,517 |

## Important Implementation Notes

1. **Preset assumptions**: exact annual EUROPOP2025 ASFR, age/sex migration, and effective cohort-survival inputs are stored in `europop2025Exact.json`
2. **Migration accounting**: Presets use published target-age amounts directly; custom age/sex shares are normalized so the allocated total matches the requested migration
3. **Age 100+ handling**: Eurostat-compatible open cohort
4. **Fiscal base**: Opening values use CFP 2025 execution and Eurostat 2025 provisional health/GDP aggregates
5. **Post-2070 economics**: EC spending shares are held at their last published value, then adjusted for scenario exposure
6. **Population validation**: Data generation requires zero official transition/birth reproduction error; runtime balance warns above one person
