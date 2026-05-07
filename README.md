<div align="center">
  <img src="./logo.png" alt="demosim" width="420" />

  **📊 Explore Portugal's demographic future from 2024 to 2100 with real-time economic impact projections 🇵🇹**

  [Live Demo](https://demosim.tsilva.eu)
</div>

demosim is an interactive Next.js simulator for Portugal's population and economic pressure through 2100. It uses 2024 Eurostat-calibrated demographic inputs, a cohort-component projection model, and year-by-year charts for population structure, dependency ratio, social security balance, healthcare cost, and sustainability.

Use it to adjust fertility, migration, mortality improvement, retirement age, and workforce assumptions, then compare how those choices change Portugal's long-term demographic path.

## Install

```bash
git clone git@github.com:tsilva/demosim.git
cd demosim
corepack enable
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Commands

```bash
pnpm install   # install dependencies
pnpm dev       # start the Next.js dev server
pnpm build     # build production output
pnpm start     # serve the production build
pnpm preview   # alias for pnpm start
```

## Notes

- `pnpm` is required. The repo has a `preinstall` guard and declares `pnpm@10.27.0` in `package.json`.
- The app requires JavaScript in the browser.
- `NEXT_PUBLIC_GA_MEASUREMENT_ID` is optional. When present, the app loads Google Analytics and tracks page views plus simulator interactions.
- Runtime data lives in `data/`: 2024 population by age and sex, life tables, fertility rates, migration profile, and economic assumptions.
- The simulation displays age `100+` as an aggregate cohort, but internally ages it through a `110+` open bucket and logs a console warning if the population balance error exceeds 500 people in a projected year.
- Deployment metadata is included for Vercel as a Next.js app.

## Data Baseline

| Metric | 2024 value |
| --- | --- |
| Population | 10,639,726 |
| Median age | 47.1 |
| Life expectancy | 82.5 overall, 79.7 male, 85.2 female |
| Total fertility rate | 1.41 |
| Calibrated net migration | +137,718 |

## Architecture

![demosim architecture diagram](./architecture.png)

## License

[MIT](LICENSE)
