// Calibrated to INE Portugal Demographic Statistics 2023-2024
// TFR 1.40, mean age at childbirth 31.6
// Reference: INE - Estatísticas Demográficas 2023

export const fertilityData = {
  totalFertilityRate: 1.40,
  generalFertilityRate: 38.57,
  meanAgeAtChildbirth: 31.6,
  meanAgeAtFirstBirth: 30.2,
  adolescentFertilityRate: 6.38,
  // ASFR = live births per 1000 women of that age per year
  asfr: [
    { age: 15, rate: 1.8 },
    { age: 16, rate: 3.5 },
    { age: 17, rate: 5.8 },
    { age: 18, rate: 8.5 },
    { age: 19, rate: 11.5 },
    { age: 20, rate: 15.0 },
    { age: 21, rate: 19.0 },
    { age: 22, rate: 23.5 },
    { age: 23, rate: 28.5 },
    { age: 24, rate: 34.0 },
    { age: 25, rate: 40.0 },
    { age: 26, rate: 46.5 },
    { age: 27, rate: 53.0 },
    { age: 28, rate: 59.5 },
    { age: 29, rate: 65.5 },
    { age: 30, rate: 70.5 },
    { age: 31, rate: 74.0 },
    { age: 32, rate: 75.5 },
    { age: 33, rate: 75.0 },
    { age: 34, rate: 72.5 },
    { age: 35, rate: 68.0 },
    { age: 36, rate: 62.0 },
    { age: 37, rate: 55.0 },
    { age: 38, rate: 47.0 },
    { age: 39, rate: 39.0 },
    { age: 40, rate: 31.0 },
    { age: 41, rate: 23.5 },
    { age: 42, rate: 17.0 },
    { age: 43, rate: 11.5 },
    { age: 44, rate: 7.0 },
    { age: 45, rate: 4.0 },
    { age: 46, rate: 2.0 },
    { age: 47, rate: 0.9 },
    { age: 48, rate: 0.4 },
    { age: 49, rate: 0.1 },
  ],
  sexRatioAtBirth: {
    ratio: 1.05, // Males per female at birth
    malePercent: 51.2,
    femalePercent: 48.8,
  }
};
