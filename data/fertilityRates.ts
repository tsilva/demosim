// Eurostat demo_frate, demo_find, and demo_fasec (2024)
// Fertility indicators and live births for Portugal, calendar year 2024

export const fertilityData = {
  totalFertilityRate: 1.40673,
  generalFertilityRate: 37.96,
  meanAgeAtChildbirth: 31.7,
  meanAgeAtFirstBirth: 30.3,
  adolescentFertilityRate: 5.9,
  // ASFR = live births per 1000 women of that age per year
  asfr: [
    { age: 15, rate: 1.3 },
    { age: 16, rate: 2.53 },
    { age: 17, rate: 4.35 },
    { age: 18, rate: 7.48 },
    { age: 19, rate: 13.43 },
    { age: 20, rate: 18.78 },
    { age: 21, rate: 23.21 },
    { age: 22, rate: 27.74 },
    { age: 23, rate: 37.13 },
    { age: 24, rate: 41.64 },
    { age: 25, rate: 50.61 },
    { age: 26, rate: 58.83 },
    { age: 27, rate: 69.42 },
    { age: 28, rate: 78.89 },
    { age: 29, rate: 86.77 },
    { age: 30, rate: 95.05 },
    { age: 31, rate: 96.75 },
    { age: 32, rate: 96.12 },
    { age: 33, rate: 93.4 },
    { age: 34, rate: 87.99 },
    { age: 35, rate: 84.14 },
    { age: 36, rate: 75.55 },
    { age: 37, rate: 64.98 },
    { age: 38, rate: 52.67 },
    { age: 39, rate: 42.98 },
    { age: 40, rate: 32.9 },
    { age: 41, rate: 24.03 },
    { age: 42, rate: 15.78 },
    { age: 43, rate: 9.19 },
    { age: 44, rate: 5.11 },
    { age: 45, rate: 3.19 },
    { age: 46, rate: 1.91 },
    { age: 47, rate: 0.98 },
    { age: 48, rate: 0.59 },
    { age: 49, rate: 0.3 },
  ],
  sexRatioAtBirth: {
    ratio: 1.055815, // Males per female at birth
    malePercent: 51.4,
    femalePercent: 48.6,
  }
};
