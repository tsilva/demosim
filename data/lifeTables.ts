// Calibrated to INE Portugal Life Tables 2022-2024
// Life expectancy: 78.73 (M), 83.96 (F), 81.49 (total)
// Reference: INE - Tabuas de Mortalidade 2022-2024
//
// The childhood and young-adult rates below are kept from the original
// calibration. Ages 41+ are rebuilt with a Gompertz tail anchored at age 40 so
// the implied life expectancy at birth matches the documented INE baseline.

const MAX_LIFE_TABLE_AGE = 100;
const OPEN_AGE_TAIL_LIMIT = 160;
const ADULT_TAIL_START_AGE = 40;
const MAX_OPEN_AGE_QX = 0.98;
const LIFE_EXPECTANCY_TOLERANCE = 0.01;

const BASE_QX_PREFIX = {
  male: [
    0.00280, 0.00025, 0.00018, 0.00014, 0.00012, 0.00010, 0.00009, 0.00008, 0.00008, 0.00008,
    0.00008, 0.00009, 0.00010, 0.00012, 0.00015, 0.00020, 0.00028, 0.00038, 0.00048, 0.00055,
    0.00060, 0.00062, 0.00063, 0.00062, 0.00060, 0.00058, 0.00057, 0.00057, 0.00058, 0.00060,
    0.00063, 0.00067, 0.00072, 0.00078, 0.00085, 0.00093, 0.00102, 0.00112, 0.00124, 0.00138,
    0.00154,
  ],
  female: [
    0.00220, 0.00020, 0.00014, 0.00011, 0.00009, 0.00008, 0.00007, 0.00006, 0.00006, 0.00006,
    0.00006, 0.00007, 0.00008, 0.00009, 0.00010, 0.00012, 0.00014, 0.00016, 0.00018, 0.00020,
    0.00021, 0.00022, 0.00022, 0.00022, 0.00022, 0.00022, 0.00023, 0.00024, 0.00026, 0.00028,
    0.00031, 0.00034, 0.00038, 0.00043, 0.00048, 0.00054, 0.00061, 0.00069, 0.00078, 0.00088,
    0.00100,
  ]
};

const LIFE_EXPECTANCY = {
  male: 78.73,
  female: 83.96,
  total: 81.49
} as const;

const calculateLifeExpectancy = (qxArray: number[]): number => {
  let survivors = 100000;
  let personYears = 0;

  for (let age = 0; age < OPEN_AGE_TAIL_LIMIT; age++) {
    const qx = qxArray[Math.min(age, MAX_LIFE_TABLE_AGE)];
    personYears += survivors;
    survivors *= (1 - qx);

    if (survivors < 1e-6) {
      break;
    }
  }

  return personYears / 100000;
};

const buildCalibratedQxSeries = (
  baseQxPrefix: number[],
  targetLifeExpectancy: number,
  sex: 'male' | 'female'
): number[] => {
  const anchorQx = baseQxPrefix[ADULT_TAIL_START_AGE];

  const buildSeries = (growthRate: number): number[] => {
    const qxSeries = baseQxPrefix.slice();

    for (let age = ADULT_TAIL_START_AGE + 1; age <= MAX_LIFE_TABLE_AGE; age++) {
      qxSeries[age] = Math.min(
        MAX_OPEN_AGE_QX,
        anchorQx * Math.exp(growthRate * (age - ADULT_TAIL_START_AGE))
      );
    }

    return qxSeries;
  };

  let lowGrowth = 0.01;
  let highGrowth = 0.2;

  for (let step = 0; step < 100; step++) {
    const midGrowth = (lowGrowth + highGrowth) / 2;
    const impliedLifeExpectancy = calculateLifeExpectancy(buildSeries(midGrowth));

    if (impliedLifeExpectancy > targetLifeExpectancy) {
      lowGrowth = midGrowth;
    } else {
      highGrowth = midGrowth;
    }
  }

  const calibrated = buildSeries((lowGrowth + highGrowth) / 2);
  const impliedLifeExpectancy = calculateLifeExpectancy(calibrated);

  if (Math.abs(impliedLifeExpectancy - targetLifeExpectancy) > LIFE_EXPECTANCY_TOLERANCE) {
    throw new Error(
      `Failed to calibrate ${sex} mortality table: expected ${targetLifeExpectancy}, got ${impliedLifeExpectancy}.`
    );
  }

  return calibrated;
};

export const lifeTables = {
  lifeExpectancy: LIFE_EXPECTANCY,
  infantMortalityRate: 2.2,
  // qx = probability of dying within one year at age x
  qx: {
    male: buildCalibratedQxSeries(BASE_QX_PREFIX.male, LIFE_EXPECTANCY.male, 'male'),
    female: buildCalibratedQxSeries(BASE_QX_PREFIX.female, LIFE_EXPECTANCY.female, 'female'),
  }
  // Note: mortalityImprovementRate is configurable via SimulationParams and SCENARIO_PRESETS in types.ts.
};
