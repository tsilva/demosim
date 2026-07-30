import {
  AgeGroup,
  YearData,
  SimulationParams,
  EconomicMetrics,
  PORTUGAL_STATUTORY_RETIREMENT_AGE_PATH,
} from '../types';

// Import real demographic data
import { populationData } from '../data/population2026';
import { fertilityData } from '../data/fertilityRates';
import { migrationData } from '../data/migrationProfile';
import {
  getEuropopFertilityExposureCalibration,
  getEuropopFertilityRates,
  getEuropopMigrationAmounts,
  getEuropopNetMigration,
  getEuropopNewbornCoefficients,
  getEuropopReferencePopulation,
  getEuropopSurvivalFactors,
} from '../data/projectionAssumptions';
import economicParams from '../data/economicParams.json';

const MAX_AGE = 100;
const BASE_YEAR = 2026;
const ENTRY_SHIFT_MAX_AGE = 29;
const MIGRATION_ROUNDING_SOURCE_AGE = 29;
const BASE_RETIREMENT_AGE = economicParams.socialSecurity.retirementAge2026.years +
                            economicParams.socialSecurity.retirementAge2026.months / 12;
type Sex = 'male' | 'female';

const INITIAL_POPULATION: AgeGroup[] = populationData.data.map(row => ({
  age: row.age,
  male: row.male,
  female: row.female,
  total: row.male + row.female
}));

const FERTILITY_BY_AGE = (() => {
  const rates = Array(MAX_AGE + 1).fill(0);
  for (const entry of fertilityData.asfr) {
    rates[entry.age] = entry.rate / 1000;
  }
  return rates;
})();

/**
 * Generates initial population data for Portugal on 1 January 2026.
 * Uses INE's revised 31 December 2025 resident population by age and sex.
 */
export const generateInitialData = (): AgeGroup[] => {
  return INITIAL_POPULATION.map(group => ({ ...group }));
};

const getMortalityImprovementAgeFactor = (age: number): number => {
  if (age <= 1) return 1.5;
  if (age <= 39) return 1.2;
  if (age <= 69) return 1.0;
  if (age <= 84) return 0.75;
  if (age <= 99) return 0.5;
  return 0.25;
};

const getAgeAdjustedMortalityImprovement = (age: number, baseRate: number): number => {
  const adjustedRate = baseRate * getMortalityImprovementAgeFactor(age);
  return Math.max(-0.05, Math.min(0.05, adjustedRate));
};

const expandInitialPopulation = (): AgeGroup[] => generateInitialData();

const collapseOpenAgePopulation = (population: AgeGroup[]): AgeGroup[] =>
  population.map((group) => ({ ...group }));

/**
 * Parse age group string like "20-24" or "80+" into [min, max]
 */
const parseAgeGroup = (ageGroup: string): [number, number] => {
  if (ageGroup.endsWith('+')) {
    const min = parseInt(ageGroup.slice(0, -1));
    return [min, 100];
  }
  const [min, max] = ageGroup.split('-').map(Number);
  return [min, max];
};

const buildMigrationWeights = (profile: typeof migrationData.ageProfile.male) => {
  const weights = Array(MAX_AGE + 1).fill(0);
  const totalWeight = profile.reduce((sum, group) => sum + group.weight, 0);

  for (const group of profile) {
    const [minAge, parsedMaxAge] = parseAgeGroup(group.ageGroup);
    const maxAge = group.ageGroup.endsWith('+') ? MAX_AGE : parsedMaxAge;
    const groupSize = maxAge - minAge + 1;
    const annualWeight = (group.weight / totalWeight) / groupSize;

    for (let age = minAge; age <= maxAge; age++) {
      weights[age] = annualWeight;
    }
  }

  return weights;
};

const MIGRATION_WEIGHTS = {
  male: buildMigrationWeights(migrationData.ageProfile.male),
  female: buildMigrationWeights(migrationData.ageProfile.female),
};

const buildProfileAgeMigrationAmounts = (
  totalMigration: number,
  weights: number[]
): number[] => {
  const migrationByProfileAge = Array(MAX_AGE + 1).fill(0);
  let migrationCarry = 0;

  for (let age = 0; age <= MAX_AGE; age++) {
    const exactMigration = totalMigration * (weights[age] || 0) + migrationCarry;
    const migration = Math.trunc(exactMigration);
    migrationByProfileAge[age] = migration;
    migrationCarry = exactMigration - migration;
  }

  migrationByProfileAge[MAX_AGE] += Math.round(migrationCarry);

  return migrationByProfileAge;
};

const buildTransitionMigrationAmounts = (
  annualNetMigration: number
) => {
  const totalMaleMigration = annualNetMigration * migrationData.sexRatio.ratio;
  const totalFemaleMigration = annualNetMigration * (1 - migrationData.sexRatio.ratio);
  const maleByProfileAge = buildProfileAgeMigrationAmounts(totalMaleMigration, MIGRATION_WEIGHTS.male);
  const femaleByProfileAge = buildProfileAgeMigrationAmounts(totalFemaleMigration, MIGRATION_WEIGHTS.female);
  const maleByTargetAge = Array(MAX_AGE + 1).fill(0);
  const femaleByTargetAge = Array(MAX_AGE + 1).fill(0);

  if (migrationData.ageBasis === 'endOfTransition') {
    for (let age = 0; age <= MAX_AGE; age++) {
      maleByTargetAge[age] = maleByProfileAge[age] || 0;
      femaleByTargetAge[age] = femaleByProfileAge[age] || 0;
    }
  } else {
    for (let sourceAge = 0; sourceAge < MAX_AGE; sourceAge++) {
      maleByTargetAge[sourceAge + 1] = maleByProfileAge[sourceAge] || 0;
      femaleByTargetAge[sourceAge + 1] = femaleByProfileAge[sourceAge] || 0;
    }
  }

  const allocatedMigration =
    maleByTargetAge.reduce((sum, migration) => sum + migration, 0) +
    femaleByTargetAge.reduce((sum, migration) => sum + migration, 0);
  const migrationRoundingRemainder = Math.round(annualNetMigration) - allocatedMigration;
  if (migrationRoundingRemainder !== 0) {
    femaleByTargetAge[MIGRATION_ROUNDING_SOURCE_AGE] += migrationRoundingRemainder;
  }

  return {
    maleByTargetAge,
    femaleByTargetAge,
  };
};

const getAnnualFertilityRates = (
  year: number,
  params: SimulationParams
): number[] => {
  if (params.projectionProfile) {
    return [...getEuropopFertilityRates(
      year,
      params.projectionProfile.fertility
    )];
  }

  const rates = Array(MAX_AGE + 1).fill(0);
  for (let age = 15; age <= 49; age++) {
    rates[age] = FERTILITY_BY_AGE[age];
  }
  const unscaledTotal = rates.reduce((sum, rate) => sum + rate, 0);
  if (unscaledTotal > 0) {
    const scale = params.fertilityRate / unscaledTotal;
    for (let age = 15; age <= 49; age++) {
      rates[age] *= scale;
    }
  }

  return rates;
};

const getAnnualSurvivalFactors = (
  year: number,
  sex: Sex,
  params: SimulationParams
): number[] => {
  if (params.projectionProfile) {
    return [...getEuropopSurvivalFactors(
      year,
      params.projectionProfile.mortality,
      sex
    )];
  }

  const baseFactors = getEuropopSurvivalFactors(BASE_YEAR, 'baseline', sex);
  const baseImprovementRate = sex === 'male'
    ? params.mortalityImprovement.male
    : params.mortalityImprovement.female;
  const yearsFromBase = year - BASE_YEAR;

  return baseFactors.map((baseSurvival, sourceAge) => {
    const mortalityAge = sourceAge === 99 ? MAX_AGE : sourceAge + 1;
    const improvementRate = getAgeAdjustedMortalityImprovement(
      mortalityAge,
      baseImprovementRate
    );
    const baseDeathProbability = 1 - baseSurvival;
    const improvedDeathProbability = baseDeathProbability *
      Math.pow(1 - improvementRate, yearsFromBase);
    return Math.max(0, Math.min(1, 1 - improvedDeathProbability));
  });
};

const getAnnualNewbornCoefficients = (
  year: number,
  params: SimulationParams
): readonly [number, number] => {
  if (params.projectionProfile) {
    return getEuropopNewbornCoefficients(
      year,
      params.projectionProfile.mortality
    );
  }

  const [baseMaleCoefficient, baseFemaleCoefficient] =
    getEuropopNewbornCoefficients(BASE_YEAR, 'baseline');
  const sexRatio = fertilityData.sexRatioAtBirth.ratio;
  const maleBirthShare = sexRatio / (1 + sexRatio);
  const femaleBirthShare = 1 - maleBirthShare;
  const yearsFromBase = year - BASE_YEAR;
  const improveCoefficient = (
    baseCoefficient: number,
    birthShare: number,
    sex: Sex
  ) => {
    const baseSurvival = baseCoefficient / birthShare;
    const baseDeathProbability = Math.max(0, 1 - baseSurvival);
    const baseImprovementRate = sex === 'male'
      ? params.mortalityImprovement.male
      : params.mortalityImprovement.female;
    const improvementRate = getAgeAdjustedMortalityImprovement(
      0,
      baseImprovementRate
    );
    const improvedDeathProbability = baseDeathProbability *
      Math.pow(1 - improvementRate, yearsFromBase);
    return birthShare * (1 - improvedDeathProbability);
  };

  return [
    improveCoefficient(baseMaleCoefficient, maleBirthShare, 'male'),
    improveCoefficient(baseFemaleCoefficient, femaleBirthShare, 'female'),
  ];
};

const EMPLOYMENT_BASE_RATE_BY_AGE = (() => {
  const rates = Array(MAX_AGE + 1).fill(0);

  for (const entry of economicParams.employment.rates) {
    const [minAge, maxAge] = parseAgeGroup(entry.ageGroup);
    for (let age = minAge; age <= Math.min(maxAge, MAX_AGE); age++) {
      rates[age] = entry.rate;
    }
  }

  return rates;
})();

type NumericKeyframe = { year: number; value: number };
type AgeWeightKeyframe = { age: number; weight: number };

const interpolateKeyframes = (
  keyframes: readonly NumericKeyframe[],
  year: number
): number => {
  if (year <= keyframes[0].year) return keyframes[0].value;
  if (year >= keyframes[keyframes.length - 1].year) {
    return keyframes[keyframes.length - 1].value;
  }

  const upperIndex = keyframes.findIndex((keyframe) => keyframe.year >= year);
  const lower = keyframes[upperIndex - 1];
  const upper = keyframes[upperIndex];
  const progress = (year - lower.year) / (upper.year - lower.year);
  return lower.value + (upper.value - lower.value) * progress;
};

const getAnnualRetirementAge = (
  year: number,
  params: SimulationParams
): number => params.retirementAgePath
  ? interpolateKeyframes(params.retirementAgePath, year)
  : params.retirementAge;

const buildAgeWeightCurve = (
  keyframes: readonly AgeWeightKeyframe[]
): number[] => Array.from({ length: MAX_AGE + 1 }, (_, age) => {
  if (age <= keyframes[0].age) return keyframes[0].weight;
  const upperIndex = keyframes.findIndex((keyframe) => keyframe.age >= age);
  if (upperIndex < 0) return keyframes[keyframes.length - 1].weight;
  const lower = keyframes[upperIndex - 1];
  const upper = keyframes[upperIndex];
  const progress = (age - lower.age) / (upper.age - lower.age);
  return lower.weight + (upper.weight - lower.weight) * progress;
});

const HEALTHCARE_WEIGHT_BY_AGE = {
  male: buildAgeWeightCurve(economicParams.healthcare.ageCostProfile.male),
  female: buildAgeWeightCurve(economicParams.healthcare.ageCostProfile.female),
};

const getWorkingShare = (age: number, retirementAge: number): number => {
  if (age < 15) {
    return 0;
  }

  if (age + 1 <= retirementAge) {
    return 1;
  }

  if (age >= retirementAge) {
    return 0;
  }

  return retirementAge - age;
};

const getRetiredShare = (age: number, retirementAge: number): number => {
  if (age < 15) {
    return 0;
  }

  return 1 - getWorkingShare(age, retirementAge);
};

const getLateCareerEmploymentRate = (age: number): number => {
  if (age <= 64) {
    return EMPLOYMENT_BASE_RATE_BY_AGE[Math.min(age, MAX_AGE)] || 0;
  }

  if (age <= 69) {
    return EMPLOYMENT_BASE_RATE_BY_AGE[60] || 0;
  }

  return EMPLOYMENT_BASE_RATE_BY_AGE[65] || 0;
};

const getRetireeEmploymentRate = (age: number): number => {
  if (age <= 69) {
    return EMPLOYMENT_BASE_RATE_BY_AGE[65] || 0;
  }

  return EMPLOYMENT_BASE_RATE_BY_AGE[70] || 0;
};

const getRetirementAdjustedEmploymentRate = (
  age: number,
  baseRate: number,
  retirementAge: number
): number => {
  const baseWorkingShare = getWorkingShare(age, BASE_RETIREMENT_AGE);
  const scenarioWorkingShare = getWorkingShare(age, retirementAge);
  const workingShareDelta = scenarioWorkingShare - baseWorkingShare;

  if (Math.abs(workingShareDelta) < 0.000001) {
    return baseRate;
  }

  const employmentGap = getLateCareerEmploymentRate(age) - getRetireeEmploymentRate(age);
  return Math.max(0, Math.min(1, baseRate + workingShareDelta * employmentGap));
};

const buildEmploymentRates = (
  workforceEntryAgeShift: number,
  employmentRateAdjustment: number,
  retirementAge: number = BASE_RETIREMENT_AGE
) => {
  return Array.from({ length: MAX_AGE + 1 }, (_, age) => {
    const effectiveAge = age <= ENTRY_SHIFT_MAX_AGE
      ? Math.max(15, Math.min(ENTRY_SHIFT_MAX_AGE, age - workforceEntryAgeShift))
      : age;
    const baseRate = EMPLOYMENT_BASE_RATE_BY_AGE[effectiveAge] || 0;
    const retirementAdjustedRate = getRetirementAdjustedEmploymentRate(
      age,
      baseRate,
      retirementAge
    );
    const adjustedRate = retirementAdjustedRate * (1 - employmentRateAdjustment);
    return Math.max(0, Math.min(1, adjustedRate));
  });
};

const getAnnualNetMigration = (
  year: number,
  startYear: number,
  params: SimulationParams
): number => {
  if (params.projectionProfile) {
    return getEuropopNetMigration(
      year,
      params.projectionProfile.migration
    );
  }

  const initialNetMigration = params.initialNetMigration ?? params.netMigration;
  const convergenceYear = params.migrationConvergenceYear ?? startYear;

  if (convergenceYear <= startYear || year >= convergenceYear) {
    return params.netMigration;
  }

  const progress = (year - startYear) / (convergenceYear - startYear);
  return initialNetMigration + (params.netMigration - initialNetMigration) * progress;
};

const capNegativeMigrationToAvailablePopulation = (
  migration: number,
  survivingPopulation: number
): number => {
  if (migration >= 0 || survivingPopulation <= 0) {
    return migration;
  }

  return -Math.min(-migration, Math.floor(survivingPopulation));
};

const getRawWorkforce = (
  population: AgeGroup[],
  employmentRates: readonly number[]
): number => population.reduce((total, group) => (
  group.age >= 15
    ? total + group.total * employmentRates[Math.min(group.age, MAX_AGE)]
    : total
), 0);

const getPensionExposure = (
  population: AgeGroup[],
  retirementAge: number
): number => population.reduce((total, group) => (
  total + group.total * getRetiredShare(group.age, retirementAge)
), 0);

const getHealthcareExposure = (population: AgeGroup[]): number =>
  population.reduce((total, group) => (
    total +
    group.male * HEALTHCARE_WEIGHT_BY_AGE.male[group.age] +
    group.female * HEALTHCARE_WEIGHT_BY_AGE.female[group.age]
  ), 0);

const getReferencePopulation = (year: number): AgeGroup[] => {
  const male = getEuropopReferencePopulation(year, 'male');
  const female = getEuropopReferencePopulation(year, 'female');
  return male.map((malePopulation, age) => ({
    age,
    male: malePopulation,
    female: female[age],
    total: malePopulation + female[age],
  }));
};

const BASE_TOTAL_POPULATION = INITIAL_POPULATION.reduce(
  (total, group) => total + group.total,
  0
);
const BASE_EMPLOYMENT_RATES = buildEmploymentRates(0, 0, BASE_RETIREMENT_AGE);
const BASE_RAW_WORKFORCE = getRawWorkforce(
  INITIAL_POPULATION,
  BASE_EMPLOYMENT_RATES
);
const WORKFORCE_CALIBRATION_FACTOR =
  economicParams.employment.officialEmployed15Plus2025 /
  BASE_RAW_WORKFORCE;
const BASE_PENSION_EXPOSURE = getPensionExposure(
  INITIAL_POPULATION,
  BASE_RETIREMENT_AGE
);
const BASE_HEALTHCARE_EXPOSURE = getHealthcareExposure(INITIAL_POPULATION);
const EUROPOP_2026_REFERENCE = getReferencePopulation(BASE_YEAR);
const BASE_PENSION_REFERENCE_RATIO =
  (
    BASE_PENSION_EXPOSURE /
    economicParams.employment.officialEmployed15Plus2025
  ) /
  (
    getPensionExposure(EUROPOP_2026_REFERENCE, BASE_RETIREMENT_AGE) /
    (getRawWorkforce(EUROPOP_2026_REFERENCE, BASE_EMPLOYMENT_RATES) *
      WORKFORCE_CALIBRATION_FACTOR)
  );
const BASE_HEALTHCARE_REFERENCE_RATIO =
  (
    BASE_HEALTHCARE_EXPOSURE /
    economicParams.employment.officialEmployed15Plus2025
  ) /
  (
    getHealthcareExposure(EUROPOP_2026_REFERENCE) /
    (getRawWorkforce(EUROPOP_2026_REFERENCE, BASE_EMPLOYMENT_RATES) *
      WORKFORCE_CALIBRATION_FACTOR)
  );

const getProductivityGrowthFactor = (year: number): number => {
  let factor = 1;
  for (let transitionYear = BASE_YEAR; transitionYear < year; transitionYear++) {
    factor *= 1 + interpolateKeyframes(
      economicParams.productivity.annualRealGrowthRateKeyframes,
      transitionYear
    );
  }
  return factor;
};

/**
 * Calculate fiscal and healthcare metrics. The 2026 opening stock is matched
 * exactly to 2025 official aggregates; future baseline paths use the European
 * Commission's published spending-to-GDP projections. Demographic scenarios
 * vary those paths through their relative pension and healthcare exposures.
 */
const calculateEconomicMetrics = (
  population: AgeGroup[],
  retirementAge: number,
  referenceRetirementAge: number,
  year: number,
  workforceEntryAgeShift: number,
  employmentRateAdjustment: number,
  employmentRates = buildEmploymentRates(workforceEntryAgeShift, employmentRateAdjustment, retirementAge)
): EconomicMetrics => {
  const rawWorkforce = getRawWorkforce(population, employmentRates);
  const actualWorkforce = Math.round(
    rawWorkforce * WORKFORCE_CALIBRATION_FACTOR
  );
  let workingAgePop = 0;

  for (const group of population) {
    workingAgePop += group.total * getWorkingShare(group.age, retirementAge);
  }

  workingAgePop = Math.round(workingAgePop);
  const totalPopulation = population.reduce((sum, group) => sum + group.total, 0);
  const productivityGrowthFactor = getProductivityGrowthFactor(year);
  const workforceRatio =
    actualWorkforce / economicParams.employment.officialEmployed15Plus2025;
  const gdpProxy =
    economicParams.productivity.gdp2025 *
    workforceRatio *
    productivityGrowthFactor;
  const gdpRatio = gdpProxy / economicParams.productivity.gdp2025;

  const referencePopulation = getReferencePopulation(year);
  const referenceEmploymentRates = buildEmploymentRates(
    0,
    0,
    referenceRetirementAge
  );
  const referenceWorkforce =
    getRawWorkforce(referencePopulation, referenceEmploymentRates) *
    WORKFORCE_CALIBRATION_FACTOR;
  const pensionReferenceRatio = (
    (getPensionExposure(population, retirementAge) / actualWorkforce) /
    (
      getPensionExposure(referencePopulation, referenceRetirementAge) /
      referenceWorkforce
    )
  ) / BASE_PENSION_REFERENCE_RATIO;
  const healthcareReferenceRatio = (
    (getHealthcareExposure(population) / actualWorkforce) /
    (getHealthcareExposure(referencePopulation) / referenceWorkforce)
  ) / BASE_HEALTHCARE_REFERENCE_RATIO;
  const economicYear = year === BASE_YEAR ? 2025 : year;

  const publicPensionShareOfGdp = interpolateKeyframes(
    economicParams.publicPensions.spendingShareOfGdpKeyframes,
    economicYear
  ) / 100;
  const publicPensionSpending =
    gdpProxy * publicPensionShareOfGdp * pensionReferenceRatio;

  const publicHealthcareShareOfGdp = interpolateKeyframes(
    economicParams.healthcare.publicSpendingShareOfGdpKeyframes,
    economicYear
  ) / 100;
  const publicHealthcareCost =
    gdpProxy * publicHealthcareShareOfGdp * healthcareReferenceRatio;
  const totalHealthcareCost =
    publicHealthcareCost / economicParams.healthcare.publicShare;
  const healthcareCostPerWorker = actualWorkforce > 0
    ? totalHealthcareCost / actualWorkforce
    : 0;

  const officialSS = economicParams.socialSecurity.officialExecution2025;
  const totalSSContributions = officialSS.contributions * gdpRatio;
  const otherSSRevenue =
    (officialSS.effectiveRevenue - officialSS.contributions) * gdpRatio;
  const ssPensionExpenditure =
    publicPensionSpending *
    (officialSS.pensionExpenditure /
      economicParams.socialSecurity.totalPublicPensionExpenditure2025);
  const otherSSExpenditure =
    (officialSS.effectiveExpenditure - officialSS.pensionExpenditure) *
    (totalPopulation / BASE_TOTAL_POPULATION) *
    productivityGrowthFactor;
  const ssBalance =
    totalSSContributions +
    otherSSRevenue -
    ssPensionExpenditure -
    otherSSExpenditure;
  const ssBalancePerWorker =
    actualWorkforce > 0 ? ssBalance / actualWorkforce : 0;

  const publicAgeRelatedSpending =
    publicPensionSpending + publicHealthcareCost;
  const ageRelatedSpendingPerWorker = actualWorkforce > 0
    ? publicAgeRelatedSpending / actualWorkforce
    : 0;
  const ageRelatedSpendingShareOfGdp = gdpProxy > 0
    ? (publicAgeRelatedSpending / gdpProxy) * 100
    : 0;
  const laborUtilizationRate = workingAgePop > 0 ? actualWorkforce / workingAgePop : 0;

  return {
    actualWorkforce,
    laborUtilizationRate,
    totalSSContributions,
    publicPensionSpending,
    ssBalance,
    ssBalancePerWorker,
    totalHealthcareCost,
    publicHealthcareCost,
    healthcareCostPerWorker,
    ageRelatedSpendingPerWorker,
    ageRelatedSpendingShareOfGdp,
  };
};

/**
 * Run demographic simulation using cohort-component method
 * This is the standard method used by UN, Eurostat, and national statistics offices
 */
export const runSimulation = (startYear: number, endYear: number, params: SimulationParams): YearData[] => {
  // Parameter validation
  if (startYear !== BASE_YEAR) {
    throw new Error(`Invalid start year: ${startYear}. This model is calibrated to start in ${BASE_YEAR}.`);
  }
  if (endYear < startYear) {
    throw new Error(`Invalid end year: ${endYear}. Must be greater than or equal to ${startYear}.`);
  }
  if (params.fertilityRate < 0 || params.fertilityRate > 10) {
    throw new Error(`Invalid fertility rate: ${params.fertilityRate}. Must be between 0 and 10.`);
  }
  if (params.retirementAge < 50 || params.retirementAge > 80) {
    throw new Error(`Invalid retirement age: ${params.retirementAge}. Must be between 50 and 80.`);
  }
  if (params.netMigration < -500000 || params.netMigration > 500000) {
    throw new Error(`Invalid net migration: ${params.netMigration}. Must be between -500,000 and 500,000.`);
  }
  if (params.mortalityImprovement.male < -0.05 || params.mortalityImprovement.male > 0.05) {
    throw new Error(`Invalid male mortality improvement: ${params.mortalityImprovement.male}. Must be between -0.05 and 0.05.`);
  }
  if (params.mortalityImprovement.female < -0.05 || params.mortalityImprovement.female > 0.05) {
    throw new Error(`Invalid female mortality improvement: ${params.mortalityImprovement.female}. Must be between -0.05 and 0.05.`);
  }
  if (params.workforceEntryAgeShift < -10 || params.workforceEntryAgeShift > 10) {
    throw new Error(
      `Invalid workforce entry shift: ${params.workforceEntryAgeShift}. ` +
      'Must be between -10 and 10 years.'
    );
  }
  if (
    params.employmentRateAdjustment < -0.5 ||
    params.employmentRateAdjustment > 0.95
  ) {
    throw new Error(
      `Invalid employment-rate adjustment: ${params.employmentRateAdjustment}. ` +
      'Must be between -0.5 and 0.95.'
    );
  }
  if (params.retirementAgePath) {
    if (
      params.retirementAgePath.length < 2 ||
      params.retirementAgePath.some(
        (keyframe, index) =>
          keyframe.value < 50 ||
          keyframe.value > 80 ||
          (index > 0 && keyframe.year <= params.retirementAgePath![index - 1].year)
      )
    ) {
      throw new Error('Invalid retirement-age path.');
    }
  }

  let currentPop = expandInitialPopulation();
  const results: YearData[] = [];

  for (let year = startYear; year <= endYear; year++) {
    const annualRetirementAge = getAnnualRetirementAge(year, params);
    const referenceRetirementAge = params.retirementAgePath
      ? annualRetirementAge
      : interpolateKeyframes(
          PORTUGAL_STATUTORY_RETIREMENT_AGE_PATH,
          year
        );
    const employmentRates = buildEmploymentRates(
      params.workforceEntryAgeShift,
      params.employmentRateAdjustment,
      annualRetirementAge
    );
    const annualFertilityRates = getAnnualFertilityRates(year, params);
    const annualTotalFertilityRate = annualFertilityRates
      .reduce((total, rate) => total + rate, 0);
    const annualNetMigration = Math.round(getAnnualNetMigration(year, startYear, params));

    // 1. Calculate Statistics for current year
    let childPop = 0;
    let workingPop = 0;
    let retiredPop = 0;
    let standardWorkingAgePop = 0;
    let standardOlderAgePop = 0;
    for (const group of currentPop) {
      if (group.age < 15) {
        childPop += group.total;
      }
      if (group.age >= 15 && group.age <= 64) {
        standardWorkingAgePop += group.total;
      }
      if (group.age >= 65) {
        standardOlderAgePop += group.total;
      }
      if (group.age >= 15) {
        workingPop += group.total * getWorkingShare(group.age, annualRetirementAge);
        retiredPop += group.total * getRetiredShare(group.age, annualRetirementAge);
      }
    }
    workingPop = Math.round(workingPop);
    retiredPop = Math.round(retiredPop);
    const totalPop = currentPop.reduce((sum, group) => sum + group.total, 0);

    // Calculate Median Age with interpolation for precision
    let cumulative = 0;
    let medianAge = 0;
    const halfPop = totalPop / 2;
    for (let i = 0; i < currentPop.length; i++) {
      const prev = cumulative;
      cumulative += currentPop[i].total;
      if (cumulative >= halfPop) {
        // Interpolate within the age group for precise median
        const fraction = currentPop[i].total > 0
          ? (halfPop - prev) / currentPop[i].total
          : 0;
        medianAge = currentPop[i].age + fraction;
        break;
      }
    }

    // Calculate economic metrics with workforce-entry and employment-rate adjustments.
    const economic = calculateEconomicMetrics(
      currentPop,
      annualRetirementAge,
      referenceRetirementAge,
      year,
      params.workforceEntryAgeShift,
      params.employmentRateAdjustment,
      employmentRates
    );

    results.push({
      year,
      population: collapseOpenAgePopulation(currentPop),
      totalPopulation: totalPop,
      workingAgePop: workingPop,
      retiredPop: retiredPop,
      childPop,
      oldAgeDependencyRatio: standardWorkingAgePop > 0 ? (standardOlderAgePop / standardWorkingAgePop) * 100 : 0,
      medianAge,
      assumptions: {
        fertilityRate: annualTotalFertilityRate,
        netMigration: annualNetMigration,
        retirementAge: annualRetirementAge,
      },
      economic
    });

    if (year === endYear) {
      break;
    }

    // 2. Evolve population for next year using cohort-component method
    const migrationAmounts = params.projectionProfile
      ? {
          maleByTargetAge: [...getEuropopMigrationAmounts(
            year,
            params.projectionProfile.migration,
            'male'
          )],
          femaleByTargetAge: [...getEuropopMigrationAmounts(
            year,
            params.projectionProfile.migration,
            'female'
          )],
        }
      : buildTransitionMigrationAmounts(annualNetMigration);
    const maleSurvivalFactors = getAnnualSurvivalFactors(year, 'male', params);
    const femaleSurvivalFactors = getAnnualSurvivalFactors(year, 'female', params);
    const [maleNewbornCoefficient, femaleNewbornCoefficient] =
      getAnnualNewbornCoefficients(year, params);

    // ASFR is defined against person-years lived between exact ages x and x+1.
    // With a 1 January stock, exposure at completed age x is approximated by
    // the mean of the cohorts aged x-1 and x at the start of the year.
    let totalBirths = 0;
    for (let age = 1; age <= MAX_AGE; age++) {
      const fertilityRate = annualFertilityRates[age] || 0;
      if (fertilityRate > 0) {
        const femaleExposure =
          (currentPop[age - 1].female + currentPop[age].female) / 2;
        totalBirths += femaleExposure * fertilityRate;
      }
    }
    if (params.projectionProfile) {
      totalBirths *= getEuropopFertilityExposureCalibration(
        year,
        params.projectionProfile.fertility
      );
    }
    const births = Math.round(totalBirths);
    const survivingMaleBirths = Math.round(births * maleNewbornCoefficient);
    const survivingFemaleBirths = Math.round(births * femaleNewbornCoefficient);
    const ageZeroMaleMigration = capNegativeMigrationToAvailablePopulation(
      migrationAmounts.maleByTargetAge[0],
      survivingMaleBirths
    );
    const ageZeroFemaleMigration = capNegativeMigrationToAvailablePopulation(
      migrationAmounts.femaleByTargetAge[0],
      survivingFemaleBirths
    );
    const ageZeroMale = survivingMaleBirths + ageZeroMaleMigration;
    const ageZeroFemale = survivingFemaleBirths + ageZeroFemaleMigration;
    const nextPop: AgeGroup[] = [{
      age: 0,
      male: ageZeroMale,
      female: ageZeroFemale,
      total: ageZeroMale + ageZeroFemale
    }];

    let totalDeaths =
      births - survivingMaleBirths - survivingFemaleBirths;
    let totalMigrationDistributed =
      ageZeroMaleMigration + ageZeroFemaleMigration;

    for (let targetAge = 1; targetAge < MAX_AGE; targetAge++) {
      const source = currentPop[targetAge - 1];
      const survivingMale = Math.round(
        source.male * maleSurvivalFactors[targetAge - 1]
      );
      const survivingFemale = Math.round(
        source.female * femaleSurvivalFactors[targetAge - 1]
      );
      const migrationMale = capNegativeMigrationToAvailablePopulation(
        migrationAmounts.maleByTargetAge[targetAge],
        survivingMale
      );
      const migrationFemale = capNegativeMigrationToAvailablePopulation(
        migrationAmounts.femaleByTargetAge[targetAge],
        survivingFemale
      );
      const male = survivingMale + migrationMale;
      const female = survivingFemale + migrationFemale;

      nextPop.push({
        age: targetAge,
        male,
        female,
        total: male + female,
      });

      totalDeaths += source.male - survivingMale +
                     source.female - survivingFemale;
      totalMigrationDistributed += migrationMale + migrationFemale;
    }

    const openSourceMale =
      currentPop[MAX_AGE - 1].male + currentPop[MAX_AGE].male;
    const openSourceFemale =
      currentPop[MAX_AGE - 1].female + currentPop[MAX_AGE].female;
    const survivingOpenMale = Math.round(
      openSourceMale * maleSurvivalFactors[MAX_AGE - 1]
    );
    const survivingOpenFemale = Math.round(
      openSourceFemale * femaleSurvivalFactors[MAX_AGE - 1]
    );
    const openMaleMigration = capNegativeMigrationToAvailablePopulation(
      migrationAmounts.maleByTargetAge[MAX_AGE],
      survivingOpenMale
    );
    const openFemaleMigration = capNegativeMigrationToAvailablePopulation(
      migrationAmounts.femaleByTargetAge[MAX_AGE],
      survivingOpenFemale
    );
    const openMale = survivingOpenMale + openMaleMigration;
    const openFemale = survivingOpenFemale + openFemaleMigration;
    nextPop.push({
      age: MAX_AGE,
      male: openMale,
      female: openFemale,
      total: openMale + openFemale,
    });
    totalDeaths += openSourceMale - survivingOpenMale +
                   openSourceFemale - survivingOpenFemale;
    totalMigrationDistributed += openMaleMigration + openFemaleMigration;

    // Population balance validation (development check). All cohort-level
    // rounding is tracked explicitly, so only a one-person tolerance is needed.
    const nextPopTotal = nextPop.reduce((sum, g) => sum + g.total, 0);
    const expectedNextPop = totalPop + births - totalDeaths + totalMigrationDistributed;
    const balanceError = Math.abs(nextPopTotal - expectedNextPop);
    if (process.env.NODE_ENV !== 'production' && balanceError > 1) {
      console.warn(
        `Population balance warning (year ${year}): ` +
        `expected ${expectedNextPop.toLocaleString()}, got ${nextPopTotal.toLocaleString()} ` +
        `(error: ${balanceError.toLocaleString()}). ` +
        `Births: ${births.toLocaleString()}, Deaths: ${totalDeaths.toLocaleString()}, ` +
        `Migration: ${totalMigrationDistributed.toLocaleString()}`
      );
    }

    currentPop = nextPop;
  }

  return results;
};
