<div align="center">
  <img src="logo.png" alt="demography-simulator" width="512"/>

  # demography-simulator

  [![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript)](https://www.typescriptlang.org)
  [![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite)](https://vite.dev)
  [![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

  **📊 Explore Portugal's demographic future from 2024 to 2100 with real-time economic impact projections 🇵🇹**

  [Live Demo](https://ai.studio/apps/drive/1IYK9_16UMFj2LJoC7_2gcVk6sJnFgARm) · [CLAUDE.md](CLAUDE.md)
</div>

## Overview

An interactive demographic simulation tool built with React that models Portugal's population evolution through 2100. Based on official INE (Instituto Nacional de Estatística) 2024 data, it uses the cohort-component method (UN/Eurostat standard) to project population changes and their economic consequences.

Adjust fertility rates, migration, retirement age, and mortality improvements to see how policy decisions ripple through decades of population structure, social security funding, and healthcare costs.

## Features

- **Population Pyramid Visualization** - Watch the age structure transform year by year with animated transitions
- **Economic Impact Modeling** - Track social security balance, healthcare costs, and fiscal sustainability
- **AI Policy Insights** - Get Gemini-powered analysis of demographic consequences for any year
- **Scenario Presets** - Compare low, medium, and high projection scenarios from Eurostat EUROPOP2023
- **Real-Time Scrubbing** - Instantly jump to any year with cached simulation results

## Quick Start

```bash
npm install
```

Create `.env.local` with your Gemini API key:

```
GEMINI_API_KEY=your_api_key_here
```

```bash
npm run dev
```

Open http://localhost:3000

## Data Sources

All demographic data is calibrated to INE 2024 official statistics:

| Metric | 2024 Value |
|--------|------------|
| Total Population | 10,749,635 |
| Median Age | 47.3 years |
| Life Expectancy | 81.49 (M: 78.73, F: 83.96) |
| Total Fertility Rate | 1.40 |
| Net Migration | +109,909 |

## Simulation Parameters

| Parameter | Range | Description |
|-----------|-------|-------------|
| Retirement Age | 60-75 | Official retirement threshold |
| Fertility Rate | 0.8-2.5 | Children per woman (replacement = 2.1) |
| Net Migration | -10K to 150K | Annual immigrants minus emigrants |
| Mortality Improvement | 0-2% | Annual reduction in death rates |
| Workforce Entry Shift | -3 to +5 years | Age adjustment for entering workforce |
| Unemployment Adjustment | -10% to +15% | Change from baseline unemployment |

## Architecture

```
├── App.tsx                 # Main application with state management
├── components/
│   ├── PyramidChart.tsx    # Population pyramid (Recharts)
│   ├── TrendChart.tsx      # Dependency ratio over time
│   ├── EconomicMetrics.tsx # SS balance, healthcare, sustainability
│   └── EconomicTrendChart.tsx
├── data/                   # INE 2024 calibrated datasets
│   ├── population2024.ts   # Population by age/sex
│   ├── lifeTables.ts       # Mortality rates (qx)
│   ├── fertilityRates.ts   # Age-specific fertility rates
│   └── migrationProfile.ts # Migration weights by age
├── utils/
│   └── simulation.ts       # Cohort-component projection engine
└── services/
    └── gemini.ts           # AI analysis integration
```

## Economic Model

The sustainability index measures fiscal pressure on a 0-100 scale:

```
Sustainability = 100 × (1 - totalBurden / (GDP × 0.40))
```

Where:
- **Total Burden** = Social Security deficit + Healthcare costs
- **GDP** = Workforce × GDP per worker × inflation factor
- **40% threshold** represents the breaking point for public finances

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Dev server (port 3000)
npm run build        # Production build
npm run preview      # Preview build
```

## Contributing

Contributions are welcome. Please ensure any demographic data changes include source citations from official statistical agencies (INE, Eurostat, UN).

## License

MIT
