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
| `lifeTables.ts` | 2024 mortality rates (qx), calibrated to Eurostat life expectancy 79.7 M / 85.2 F |
| `fertilityRates.ts` | Eurostat 2024 age-specific fertility pattern, TFR 1.41, mean age 31.7 |
| `projectionAssumptions.ts` | EUROPOP2025 fertility, mortality, and migration keyframes for presets |
| `migrationProfile.ts` | Custom-scenario migration profile |
| `economicParams.json` | SS rates, employment by age, Eurostat health accounts, GDP per worker |

### Simulation Engine (`utils/simulation.ts`)

**Cohort-component method** (UN/Eurostat standard):

1. Load the revised 1 January 2026 population pyramid
2. Apply age/sex mortality using EUROPOP2025 preset paths or custom improvement rates
3. Calculate births using annual TFR and mean-childbearing-age assumptions
4. Distribute migration using evolving EUROPOP2025 age/sex profiles or the custom profile
5. Track age 100+ internally through a 110+ open bucket (displayed as 100+)
6. Validate population balance each year

Key functions:
- `generateInitialData()` - Returns the 2026 opening population
- `calculateEconomicMetrics(...)` - SS balance, healthcare, sustainability
- `runSimulation(startYear, endYear, params)` - Main loop

### Economic Metrics (`calculateEconomicMetrics`)

- **SS Contributions**: `workforce × salary × 34.75%`
- **Pension Payments**: `actualPensioners × avgPension` (excludes working retirees)
- **Healthcare**: Per-capita cost × age multipliers (0.6x youth → 6x elderly)
- **Sustainability Index**: `100 × (1 - totalBurden / (GDP × 0.40))`, 0-100 scale
  - `totalBurden = ssDeficit + healthcareCost` (includes healthcare, not just SS)
  - `GDP = workforce × gdpPerWorker × growthFactor`, deflated to constant 2024 EUR
  - Returned monetary outputs are inflation-adjusted 2024 EUR
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

## Reference Values

| Metric | Value |
|--------|-------|
| Population (1 Jan 2026) | 11,424,031 |
| Median age (31 Dec 2025) | 45.8 |
| 2024 life expectancy anchor | 82.5 (M: 79.7, F: 85.2) |
| EUROPOP2025 baseline TFR (2026) | 1.46506 |
| EUROPOP2025 baseline net migration (2026) | +132,517 |

## Important Implementation Notes

1. **Preset assumptions**: EUROPOP2025 keyframes are interpolated by year (geometrically for mortality); fertility timing shifts with projected mean age at childbirth
2. **Migration normalization**: Age/sex shares are normalized dynamically so annual allocated migration equals the projected total
3. **Age 100+ handling**: Displayed as age 100+, internally split through a 110+ open bucket
4. **Pension calculation**: Excludes working retirees (15% of 65-69, 4% of 70+)
5. **Healthcare currency**: Eurostat health spending is stored directly in EUR per inhabitant
6. **Population validation**: Console warning if balance error exceeds one person per year
