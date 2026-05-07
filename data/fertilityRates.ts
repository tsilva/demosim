// Eurostat demo_frate, demo_find, and demo_fasec (2024)
// Fertility indicators and live births for Portugal, calendar year 2024

export const fertilityData = {
  totalFertilityRate: 1.41,
  generalFertilityRate: 37.96,
  meanAgeAtChildbirth: 31.7,
  meanAgeAtFirstBirth: 30.3,
  adolescentFertilityRate: 5.9,
  liveBirths2024: 84642,
  // ASFR = live births per 1000 women of that age per year
  asfr: [
    { age: 15, rate: 1.3 },
    { age: 16, rate: 2.54 },
    { age: 17, rate: 4.36 },
    { age: 18, rate: 7.5 },
    { age: 19, rate: 13.47 },
    { age: 20, rate: 18.84 },
    { age: 21, rate: 23.28 },
    { age: 22, rate: 27.82 },
    { age: 23, rate: 37.24 },
    { age: 24, rate: 41.77 },
    { age: 25, rate: 50.76 },
    { age: 26, rate: 59.01 },
    { age: 27, rate: 69.63 },
    { age: 28, rate: 79.13 },
    { age: 29, rate: 87.03 },
    { age: 30, rate: 95.34 },
    { age: 31, rate: 97.04 },
    { age: 32, rate: 96.41 },
    { age: 33, rate: 93.68 },
    { age: 34, rate: 88.26 },
    { age: 35, rate: 84.4 },
    { age: 36, rate: 75.78 },
    { age: 37, rate: 65.18 },
    { age: 38, rate: 52.83 },
    { age: 39, rate: 43.11 },
    { age: 40, rate: 33 },
    { age: 41, rate: 24.1 },
    { age: 42, rate: 15.83 },
    { age: 43, rate: 9.22 },
    { age: 44, rate: 5.13 },
    { age: 45, rate: 3.2 },
    { age: 46, rate: 1.92 },
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
