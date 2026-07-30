// Eurostat demo_gind (2024) plus a residual age/sex profile inferred from
// official 2024-01-01 and 2025-01-01 populations, 2024 births, and 2024 mortality.
// The profile is intentionally stored as raw weights; simulation.ts normalizes it.
// Ages are end-of-transition ages: a residual observed at age 35 in the
// 2025-01-01 stock is applied to the cohort that was age 34 at 2024-01-01.
// The headline migration value is the official INE 2024 net migration component.
// This fallback profile is used only after a user edits a preset migration
// control; untouched presets use exact annual EUROPOP2025 age/sex amounts.

export const migrationData = {
  netMigration2024: 143641,
  ageBasis: 'endOfTransition' as const,
  ageProfile: {
    male: [
      { ageGroup: '0-4', weight: 2162 },
      { ageGroup: '5-9', weight: 2202 },
      { ageGroup: '10-14', weight: 2550 },
      { ageGroup: '15-19', weight: 2681 },
      { ageGroup: '20-24', weight: 4540 },
      { ageGroup: '25-29', weight: 8600 },
      { ageGroup: '30-34', weight: 10578 },
      { ageGroup: '35-39', weight: 9539 },
      { ageGroup: '40-44', weight: 7160 },
      { ageGroup: '45-49', weight: 5175 },
      { ageGroup: '50-54', weight: 3547 },
      { ageGroup: '55-59', weight: 3099 },
      { ageGroup: '60-64', weight: 4014 },
      { ageGroup: '65-69', weight: 3337 },
      { ageGroup: '70-74', weight: 1824 },
      { ageGroup: '75-79', weight: 960 },
      { ageGroup: '80+', weight: 720 },
    ],
    female: [
      { ageGroup: '0-4', weight: 1365 },
      { ageGroup: '5-9', weight: 1650 },
      { ageGroup: '10-14', weight: 2402 },
      { ageGroup: '15-19', weight: 3340 },
      { ageGroup: '20-24', weight: 6187 },
      { ageGroup: '25-29', weight: 9444 },
      { ageGroup: '30-34', weight: 10289 },
      { ageGroup: '35-39', weight: 8774 },
      { ageGroup: '40-44', weight: 7054 },
      { ageGroup: '45-49', weight: 5096 },
      { ageGroup: '50-54', weight: 4011 },
      { ageGroup: '55-59', weight: 3537 },
      { ageGroup: '60-64', weight: 3250 },
      { ageGroup: '65-69', weight: 2382 },
      { ageGroup: '70-74', weight: 1382 },
      { ageGroup: '75-79', weight: 770 },
      { ageGroup: '80+', weight: 2042 },
    ]
  },
  sexRatio: {
    ratio: 0.499015, // Male share of inferred net migration profile
  }
};
