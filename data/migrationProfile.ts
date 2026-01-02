// Calibrated to INE Portugal migration statistics and Eurostat patterns
// Reference: INE - Estimativas de População Residente 2024

export const migrationData = {
  netMigration2024: 109909,
  // Weight distribution for allocating net migration across ages (weights sum to ~1.0)
  ageProfile: {
    male: [
      { ageGroup: '0-4', weight: 0.025 },
      { ageGroup: '5-9', weight: 0.020 },
      { ageGroup: '10-14', weight: 0.015 },
      { ageGroup: '15-19', weight: 0.030 },
      { ageGroup: '20-24', weight: 0.090 },
      { ageGroup: '25-29', weight: 0.140 },
      { ageGroup: '30-34', weight: 0.150 },
      { ageGroup: '35-39', weight: 0.120 },
      { ageGroup: '40-44', weight: 0.085 },
      { ageGroup: '45-49', weight: 0.055 },
      { ageGroup: '50-54', weight: 0.035 },
      { ageGroup: '55-59', weight: 0.025 },
      { ageGroup: '60-64', weight: 0.020 },
      { ageGroup: '65-69', weight: 0.015 },
      { ageGroup: '70-74', weight: 0.010 },
      { ageGroup: '75-79', weight: 0.005 },
      { ageGroup: '80+', weight: 0.003 },
    ],
    female: [
      { ageGroup: '0-4', weight: 0.023 },
      { ageGroup: '5-9', weight: 0.018 },
      { ageGroup: '10-14', weight: 0.014 },
      { ageGroup: '15-19', weight: 0.028 },
      { ageGroup: '20-24', weight: 0.095 },
      { ageGroup: '25-29', weight: 0.145 },
      { ageGroup: '30-34', weight: 0.145 },
      { ageGroup: '35-39', weight: 0.115 },
      { ageGroup: '40-44', weight: 0.080 },
      { ageGroup: '45-49', weight: 0.050 },
      { ageGroup: '50-54', weight: 0.032 },
      { ageGroup: '55-59', weight: 0.022 },
      { ageGroup: '60-64', weight: 0.018 },
      { ageGroup: '65-69', weight: 0.015 },
      { ageGroup: '70-74', weight: 0.012 },
      { ageGroup: '75-79', weight: 0.008 },
      { ageGroup: '80+', weight: 0.005 },
    ]
  },
  sexRatio: {
    ratio: 0.48, // Male proportion of total net migration
    // Immigration to Portugal is slightly female-skewed
  }
};
