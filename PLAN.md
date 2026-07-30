# Model Validation Notes

## Demographic engine

- Opening stock: INE revised resident population at 31 December 2025 / 1 January 2026 (`11,424,031`).
- Preset assumptions: exact annual EUROPOP2025 age-specific fertility, age/sex migration, and effective cohort-survival inputs for 2025–2100.
- Age structure: single ages `0`–`99` and an open `100+` cohort, matching Eurostat's projection datasets.
- Fertility exposure: person-year approximation is calibrated to Eurostat's published annual live births without changing the published TFR.
- Migration: published annual net-migration contributions are added directly to target-age cohorts; no unsupported migrant-mortality adjustment is imposed.
- Data refresh: `pnpm data:update:europop`.

The data generator validates every official baseline and lower-mortality cohort transition, plus baseline and lower-fertility birth totals. Generation fails unless the maximum reproduction error is zero people.

## Economic engine

- Workforce: Eurostat EU-LFS 2025 age-specific employment rates, calibrated to `5,275,300` employed people aged 15+.
- Social Security: CFP 2025 effective revenue, contributions, expenditure, pensions, and balance excluding ESF/FEAC.
- Public pensions: CFP 2025 Social Security + CGA aggregate; EC long-term spending-to-GDP reference path.
- Retirement age: enacted 2026–27 values and the EC current-policy projection through 2070.
- Healthcare: Eurostat SHA 2025 provisional total and public spending; EC 2024 Ageing Report EU14 age/sex profile and Portugal reference path.
- GDP: Eurostat 2025 provisional aggregate with EC long-term productivity assumptions.
- Currency: constant 2025 euros.

The former subjective 0–100 sustainability score was removed. The UI now reports public pensions plus public healthcare as a directly interpretable percentage of modeled GDP.

## Known scope limits

- EUROPOP sensitivity variants are official one-factor paths. Combining lower fertility with lower migration, or lower mortality with higher migration, is useful scenario analysis but is not an official Eurostat combined projection.
- The EC fiscal reference paths end in 2070. For 2071–2100, their final spending shares are held constant before applying scenario-specific demographic exposure.
- INE publishes the revised 2025 stock only through age 84; ages 85+ are split using Eurostat's 2025 age/sex proportions.
- The healthcare age profile is the EC EU14 aggregate (which includes Portugal), because a current Portugal-only single-age spending profile is not published.
- Only the opening total Social Security balance is an observed value; later balances mechanically scale its revenue and non-pension expenditure components because no official total-system path is published.
- No model can predict future policy reforms, shocks, behavioural changes, or pandemics.
