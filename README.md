<div align="center">
  <img src="./logo.png" alt="demosim" width="420" />

  **📊 Explore Portugal's demographic future from 2026 to 2100 with real-time economic impact projections 🇵🇹**

  [Live Demo](https://demosim.tsilva.eu)
</div>

demosim is an interactive Next.js simulator for Portugal's population and economic pressure through 2100. It starts from INE's revised 31 December 2025 resident population and follows EUROPOP2025 fertility, mortality, and migration assumptions in a cohort-component projection model.

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
- Runtime data lives in `data/`: revised 2026 opening population, 2024 detailed demographic rates, EUROPOP2025 projection paths, and economic assumptions.
- The simulation displays age `100+` as an aggregate cohort, but internally ages it through a `110+` open bucket and logs a console warning if the population balance error exceeds one person in a projected year.
- Deployment metadata is included for Vercel as a Next.js app.

## Data Baseline

| Metric | Baseline value |
| --- | --- |
| Population (1 January 2026) | 11,424,031 |
| Median age (31 December 2025) | 45.8 |
| Life expectancy anchor (2024) | 82.5 overall, 79.7 male, 85.2 female |
| Baseline TFR assumption (2026) | 1.465 |
| Baseline net migration assumption (2026) | +132,517 |
| Normal retirement age (2026) | 66 years, 9 months |

Preset demographic paths use EUROPOP2025 baseline and sensitivity assumptions. Economic outputs remain illustrative and are reported in constant 2024 EUR.

## Architecture

![demosim architecture diagram](./architecture.png)

## License

[MIT](LICENSE)
