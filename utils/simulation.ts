import { AgeGroup, YearData, SimulationParams, EconomicMetrics } from '../types';

// Import real demographic data
import { populationData } from '../data/population2026';
import { lifeTables } from '../data/lifeTables';
import { fertilityData } from '../data/fertilityRates';
import { migrationData } from '../data/migrationProfile';
import {
  FERTILITY_PATHS,
  MIGRATION_SHARE_KEYFRAMES,
  MIGRATION_TOTAL_PATHS,
  MORTALITY_FACTOR_KEYFRAMES,
  PROJECTION_AGE_BINS,
  type MigrationProjection,
} from '../data/projectionAssumptions';
import economicParams from '../data/economicParams.json';

const MAX_AGE = 100;
const OPEN_AGE_MAX = 110;
const OPEN_AGE_MORTALITY_GROWTH = 1.10;
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

/**
 * Get mortality rate (qx) for a given age and sex
 * Uses Eurostat 2024 mortality calibrated to life expectancy:
 * - Male: 79.7 years
 * - Female: 85.2 years
 *
 * @param age - Age in years
 * @param sex - 'male' or 'female'
 * @param yearsFromBase - Years from projection start (for mortality improvement)
 * @param mortalityImprovement - Configurable improvement rates from SimulationParams
 */
const getRawOpenAgeBaseQx = (age: number, sex: Sex): number => {
  const qxArray = sex === 'male' ? lifeTables.qx.male : lifeTables.qx.female;
  if (age <= MAX_AGE) {
    return qxArray[age];
  }

  return qxArray[MAX_AGE] * Math.pow(OPEN_AGE_MORTALITY_GROWTH, age - MAX_AGE);
};

const clampMortalityRate = (qx: number): number => Math.max(0, Math.min(qx, 0.999999));

const getScaledOpenAgeBaseQx = (age: number, sex: Sex, scale: number): number => {
  return clampMortalityRate(getRawOpenAgeBaseQx(age, sex) * scale);
};

const getOpenAgeBaseQx = (age: number, sex: Sex): number => {
  return getScaledOpenAgeBaseQx(age, sex, 1);
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

const distributeOpenAgePopulation = (
  total: number,
  sex: Sex,
  mortalityScale = 1
): number[] => {
  const weights: number[] = [];
  let survivalWeight = 1;

  for (let age = MAX_AGE; age <= OPEN_AGE_MAX; age++) {
    if (age > MAX_AGE) {
      survivalWeight *= 1 - getScaledOpenAgeBaseQx(age - 1, sex, mortalityScale);
    }
    weights.push(survivalWeight);
  }

  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const distribution: number[] = [];
  let allocated = 0;

  for (let i = 0; i < weights.length; i++) {
    if (i === weights.length - 1) {
      distribution.push(total - allocated);
      break;
    }

    const value = Math.round((total * weights[i]) / totalWeight);
    distribution.push(value);
    allocated += value;
  }

  return distribution;
};

const expandInitialPopulation = (
  mortalityScale = 1
): AgeGroup[] => {
  const expanded: AgeGroup[] = [];

  for (const group of INITIAL_POPULATION) {
    if (group.age < MAX_AGE) {
      expanded.push({ ...group });
      continue;
    }

    const maleDistribution = distributeOpenAgePopulation(group.male, 'male', mortalityScale);
    const femaleDistribution = distributeOpenAgePopulation(group.female, 'female', mortalityScale);
    for (let age = MAX_AGE; age <= OPEN_AGE_MAX; age++) {
      const index = age - MAX_AGE;
      const male = maleDistribution[index];
      const female = femaleDistribution[index];
      expanded.push({
        age,
        male,
        female,
        total: male + female,
      });
    }
  }

  return expanded;
};

const collapseOpenAgePopulation = (population: AgeGroup[]): AgeGroup[] => {
  const collapsed: AgeGroup[] = [];
  let openAgeMale = 0;
  let openAgeFemale = 0;

  for (const group of population) {
    if (group.age < MAX_AGE) {
      collapsed.push({ ...group });
      continue;
    }

    openAgeMale += group.male;
    openAgeFemale += group.female;
  }

  collapsed.push({
    age: MAX_AGE,
    male: openAgeMale,
    female: openAgeFemale,
    total: openAgeMale + openAgeFemale,
  });

  return collapsed;
};

/**
 * Approximate mortality for people exposed to only half of the year
 * (newborns and immigrants arrive uniformly through the year on average)
 */
const getHalfYearMortalityRate = (annualQx: number): number => {
  return 1 - Math.sqrt(1 - annualQx);
};

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
  const maleBySourceAge = Array(MAX_AGE).fill(0);
  const femaleBySourceAge = Array(MAX_AGE).fill(0);
  let maleAgeZero = 0;
  let femaleAgeZero = 0;

  if (migrationData.ageBasis === 'endOfTransition') {
    maleAgeZero = maleByProfileAge[0];
    femaleAgeZero = femaleByProfileAge[0];
    for (let sourceAge = 0; sourceAge < MAX_AGE; sourceAge++) {
      maleBySourceAge[sourceAge] = maleByProfileAge[sourceAge + 1] || 0;
      femaleBySourceAge[sourceAge] = femaleByProfileAge[sourceAge + 1] || 0;
    }
  } else {
    for (let sourceAge = 0; sourceAge < MAX_AGE; sourceAge++) {
      maleBySourceAge[sourceAge] = maleByProfileAge[sourceAge] || 0;
      femaleBySourceAge[sourceAge] = femaleByProfileAge[sourceAge] || 0;
    }
  }

  const allocatedMigration = maleAgeZero + femaleAgeZero +
    maleBySourceAge.reduce((sum, migration) => sum + migration, 0) +
    femaleBySourceAge.reduce((sum, migration) => sum + migration, 0);
  const migrationRoundingRemainder = Math.round(annualNetMigration) - allocatedMigration;
  if (migrationRoundingRemainder !== 0) {
    femaleBySourceAge[MIGRATION_ROUNDING_SOURCE_AGE] += migrationRoundingRemainder;
  }

  return {
    maleBySourceAge,
    femaleBySourceAge,
    maleAgeZero,
    femaleAgeZero,
  };
};

const interpolateKeyframeValues = (
  keyframes: readonly (readonly number[])[],
  year: number,
  mode: 'linear' | 'geometric' = 'linear'
): number[] => {
  if (keyframes.length === 0) {
    return [];
  }

  if (year <= keyframes[0][0]) {
    return keyframes[0].slice(1);
  }

  const last = keyframes[keyframes.length - 1];
  if (year >= last[0]) {
    return last.slice(1);
  }

  for (let i = 1; i < keyframes.length; i++) {
    const upper = keyframes[i];
    if (year <= upper[0]) {
      const lower = keyframes[i - 1];
      const progress = (year - lower[0]) / (upper[0] - lower[0]);
      return lower.slice(1).map((value, index) => {
        const upperValue = upper[index + 1] ?? value;
        if (mode === 'geometric' && value > 0 && upperValue > 0) {
          return Math.exp(
            Math.log(value) + (Math.log(upperValue) - Math.log(value)) * progress
          );
        }
        return value + (upperValue - value) * progress;
      });
    }
  }

  return last.slice(1);
};

const getProjectionAgeBinIndex = (age: number): number => {
  const cappedAge = Math.min(age, MAX_AGE);
  const index = PROJECTION_AGE_BINS.findIndex(
    ([minimumAge, maximumAge]) => cappedAge >= minimumAge && cappedAge <= maximumAge
  );
  return index >= 0 ? index : PROJECTION_AGE_BINS.length - 1;
};

const getAnnualFertilityAssumption = (
  year: number,
  params: SimulationParams
): { totalFertilityRate: number; meanAgeAtChildbirth: number } => {
  if (!params.projectionProfile) {
    return {
      totalFertilityRate: params.fertilityRate,
      meanAgeAtChildbirth: fertilityData.meanAgeAtChildbirth,
    };
  }

  const [totalFertilityRate, meanAgeAtChildbirth] = interpolateKeyframeValues(
    FERTILITY_PATHS[params.projectionProfile.fertility],
    year
  );
  return { totalFertilityRate, meanAgeAtChildbirth };
};

const interpolateAgeSpecificFertilityRate = (age: number): number => {
  if (age < 15 || age > 49) {
    return 0;
  }

  const lowerAge = Math.floor(age);
  const upperAge = Math.ceil(age);
  const lowerRate = FERTILITY_BY_AGE[lowerAge] || 0;
  if (lowerAge === upperAge) {
    return lowerRate;
  }

  const upperRate = FERTILITY_BY_AGE[upperAge] || 0;
  return lowerRate + (upperRate - lowerRate) * (age - lowerAge);
};

const buildAnnualFertilityRates = (
  totalFertilityRate: number,
  meanAgeAtChildbirth: number
): number[] => {
  const rates = Array(MAX_AGE + 1).fill(0);
  const ageShift = meanAgeAtChildbirth - fertilityData.meanAgeAtChildbirth;

  for (let age = 15; age <= 49; age++) {
    rates[age] = interpolateAgeSpecificFertilityRate(age - ageShift);
  }

  const unscaledTotal = rates.reduce((sum, rate) => sum + rate, 0);
  if (unscaledTotal > 0) {
    const scale = totalFertilityRate / unscaledTotal;
    for (let age = 15; age <= 49; age++) {
      rates[age] *= scale;
    }
  }

  return rates;
};

const getProjectionMortalityFactor = (
  year: number,
  age: number,
  sex: Sex,
  params: SimulationParams
): number | null => {
  if (!params.projectionProfile) {
    return null;
  }

  const factors = interpolateKeyframeValues(
    MORTALITY_FACTOR_KEYFRAMES[params.projectionProfile.mortality][sex],
    year,
    'geometric'
  );
  return factors[getProjectionAgeBinIndex(age)] ?? 1;
};

const buildProjectedTransitionMigrationAmounts = (
  annualNetMigration: number,
  year: number,
  projection: MigrationProjection
) => {
  const maleBinShares = interpolateKeyframeValues(
    MIGRATION_SHARE_KEYFRAMES[projection].male,
    year
  );
  const femaleBinShares = interpolateKeyframeValues(
    MIGRATION_SHARE_KEYFRAMES[projection].female,
    year
  );
  const totalShare = [...maleBinShares, ...femaleBinShares]
    .reduce((sum, share) => sum + share, 0);
  const normalization = totalShare === 0 ? 0 : 1 / totalShare;
  const maleByProfileAge = Array(MAX_AGE + 1).fill(0);
  const femaleByProfileAge = Array(MAX_AGE + 1).fill(0);

  PROJECTION_AGE_BINS.forEach(([minimumAge, maximumAge], binIndex) => {
    const ageCount = maximumAge - minimumAge + 1;
    const malePerAge = annualNetMigration * (maleBinShares[binIndex] || 0) *
                       normalization / ageCount;
    const femalePerAge = annualNetMigration * (femaleBinShares[binIndex] || 0) *
                         normalization / ageCount;

    for (let age = minimumAge; age <= maximumAge; age++) {
      maleByProfileAge[age] = Math.round(malePerAge);
      femaleByProfileAge[age] = Math.round(femalePerAge);
    }
  });

  const maleBySourceAge = Array(MAX_AGE).fill(0);
  const femaleBySourceAge = Array(MAX_AGE).fill(0);
  for (let sourceAge = 0; sourceAge < MAX_AGE; sourceAge++) {
    maleBySourceAge[sourceAge] = maleByProfileAge[sourceAge + 1] || 0;
    femaleBySourceAge[sourceAge] = femaleByProfileAge[sourceAge + 1] || 0;
  }

  const maleAgeZero = maleByProfileAge[0];
  const femaleAgeZero = femaleByProfileAge[0];
  const allocatedMigration = maleAgeZero + femaleAgeZero +
    maleBySourceAge.reduce((sum, migration) => sum + migration, 0) +
    femaleBySourceAge.reduce((sum, migration) => sum + migration, 0);
  femaleBySourceAge[MIGRATION_ROUNDING_SOURCE_AGE] +=
    Math.round(annualNetMigration) - allocatedMigration;

  return {
    maleBySourceAge,
    femaleBySourceAge,
    maleAgeZero,
    femaleAgeZero,
  };
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

const HEALTHCARE_MULTIPLIER_BY_AGE = Array.from({ length: MAX_AGE + 1 }, (_, age) => {
  const multipliers = economicParams.healthcare.ageMultipliers;
  if (age <= 19) return multipliers['0-19'];
  if (age <= 64) return multipliers['20-64'];
  if (age <= 74) return multipliers['65-74'];
  if (age <= 84) return multipliers['75-84'];
  return multipliers['85+'];
});

const BASE_HEALTHCARE_WEIGHTED_MULTIPLIER = INITIAL_POPULATION.reduce(
  (weightedTotal, group) => weightedTotal + group.total * HEALTHCARE_MULTIPLIER_BY_AGE[group.age],
  0
) / INITIAL_POPULATION.reduce((total, group) => total + group.total, 0);

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

const getPensionRecipientShare = (
  age: number,
  retirementAge: number,
  employmentRate: number
): number => {
  const retiredShare = getRetiredShare(age, retirementAge);
  if (retiredShare <= 0) {
    return 0;
  }

  // Employed retirees are excluded from pension payments per the model notes.
  return Math.max(0, retiredShare - employmentRate);
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
  unemploymentAdjustment: number,
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
    const adjustedRate = retirementAdjustedRate * (1 - unemploymentAdjustment);
    return Math.max(0, Math.min(1, adjustedRate));
  });
};

const getAnnualNetMigration = (
  year: number,
  startYear: number,
  params: SimulationParams
): number => {
  if (params.projectionProfile) {
    return interpolateKeyframeValues(
      MIGRATION_TOTAL_PATHS[params.projectionProfile.migration],
      year
    )[0];
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
  population: number,
  annualQx: number
): number => {
  if (migration >= 0 || population <= 0) {
    return migration;
  }

  const requestedEmigration = Math.min(-migration, Math.floor(population));
  let low = 0;
  let high = requestedEmigration;

  while (low < high) {
    const candidateEmigration = Math.ceil((low + high) / 2);
    const residentExposure = Math.max(0, population - candidateEmigration / 2);
    const residentDeaths = Math.round(residentExposure * annualQx);

    if (candidateEmigration + residentDeaths <= population) {
      low = candidateEmigration;
    } else {
      high = candidateEmigration - 1;
    }
  }

  return -low;
};

const BASE_OFFICIAL_SS_BALANCE = economicParams.socialSecurity.officialBudgetBalance2024;

const BASE_OTHER_SS_EXPENDITURE_PER_CAPITA = (() => {
  const retirementAge = BASE_RETIREMENT_AGE;
  const employmentRates = buildEmploymentRates(0, 0, retirementAge);
  const baseAvgSalary = economicParams.wages.averageGrossSalary2024 *
                        economicParams.wages.annualMultiplier;
  const baseAvgPension = economicParams.socialSecurity.averagePension2024 *
                         economicParams.wages.annualMultiplier;
  const ssRate = economicParams.socialSecurity.contributionRates.total;

  let actualWorkforce = 0;
  let pensioners = 0;
  let totalPopulation = 0;

  for (const group of expandInitialPopulation()) {
    totalPopulation += group.total;
    if (group.age >= 15) {
      actualWorkforce += group.total * employmentRates[Math.min(group.age, MAX_AGE)];
    }
    const employmentRate = employmentRates[Math.min(group.age, MAX_AGE)];
    pensioners += group.total * getPensionRecipientShare(group.age, retirementAge, employmentRate);
  }

  const totalSSContributions = Math.round(actualWorkforce) * baseAvgSalary * ssRate;
  const totalPensionPayments = Math.round(pensioners) * baseAvgPension;
  const residualExpenditure = totalSSContributions - totalPensionPayments - BASE_OFFICIAL_SS_BALANCE;

  return Math.max(0, residualExpenditure / totalPopulation);
})();

/**
 * Get employment rate for a given age, adjusted for retirement policy,
 * workforce entry shift, and unemployment
 *
 * @param age - The actual age of the person
 * @param workforceEntryAgeShift - Years to shift workforce entry (positive = later entry due to more education)
 *   Example: shift=+2 means a 25-year-old has the employment pattern of a current 23-year-old
 *   This models scenarios where people stay in education longer before entering workforce
 * @param unemploymentAdjustment - Factor to adjust employment (positive = higher unemployment)
 *   Example: adjustment=0.05 means 5% fewer people employed (economic downturn)
 *   Applied as: adjusted_rate = base_rate * (1 - unemploymentAdjustment)
 *
 * Source: PORDATA employment rates by age group (2024 baseline)
 */
const getEmploymentRate = (
  age: number,
  workforceEntryAgeShift: number = 0,
  unemploymentAdjustment: number = 0,
  retirementAge: number = BASE_RETIREMENT_AGE
): number => {
  // Apply workforce entry age shift only to early-career ages. Retirement-age
  // employment is modeled independently and should not move with entry timing.
  const effectiveAge = age <= ENTRY_SHIFT_MAX_AGE
    ? Math.max(15, Math.min(ENTRY_SHIFT_MAX_AGE, age - workforceEntryAgeShift))
    : age;
  const baseRate = EMPLOYMENT_BASE_RATE_BY_AGE[effectiveAge] || 0;
  const retirementAdjustedRate = getRetirementAdjustedEmploymentRate(
    age,
    baseRate,
    retirementAge
  );

  // Apply unemployment adjustment: higher unemployment = lower employment rate
  // Clamp the result between 0 and the base rate (can't have negative employment)
  const adjustedRate = retirementAdjustedRate * (1 - unemploymentAdjustment);
  return Math.max(0, Math.min(1, adjustedRate));
};

/**
 * Get healthcare cost multiplier for a given age
 * Returns multiplier relative to 20-64 baseline (1.0)
 * Aggregate spending is from Eurostat health accounts 2024; the age curve is
 * an explicit model assumption in economicParams.json.
 */
const getHealthcareMultiplier = (age: number): number => {
  return HEALTHCARE_MULTIPLIER_BY_AGE[Math.min(age, MAX_AGE)];
};

/**
 * Calculate economic metrics for a given year's population
 *
 * Formula Documentation:
 *
 * ACTUAL WORKFORCE:
 *   Sum over all ages: population[age] * retirement-adjusted employmentRate[age]
 *
 * SS CONTRIBUTIONS:
 *   actualWorkforce * avgGrossSalary * ssContributionRate * nominalWageGrowthFactor
 *   Where:
 *   - avgGrossSalary = 21,070 EUR/year (1505 * 14 months)
 *   - ssContributionRate = 34.75%
 *   - nominalWageGrowthFactor = real productivity growth compounded with consumer inflation
 *
 * SOCIAL SECURITY EXPENDITURE:
 *   pensionRecipients * avgPension * nominalWageGrowthFactor
 *   + calibrated non-pension expenditure residual
 *   Where:
 *   - avgPension = 8,120 EUR/year (580 * 14 months)
 *   - residual is calibrated so 2024 aggregate SS balance matches CFP's
 *     reported 5.595B EUR surplus excluding ESF/FEAD
 *
 * HEALTHCARE COSTS:
 *   Sum over all ages: population[age] * normalizedBaseCost * ageMultiplier[age] * healthcareCostGrowthFactor
 *   Where:
 *   - official per-capita cost = 2,730.81 EUR/year
 *   - normalizedBaseCost = official per-capita cost / opening-population-weighted age multiplier
 *   - ageMultiplier: 0.6 (0-19), 1.0 (20-64), 2.5 (65-74), 4.0 (75-84), 6.0 (85+)
 *
 * SUSTAINABILITY INDEX:
 *   100 * (1 - totalBurden / (GDP * 0.40))
 *   Where totalBurden = ssDeficit + publicHealthcareCost
 *   40% of GDP threshold = system breaking point (index = 0)
 *   Capped at 0 (critical) to 100 (fully sustainable)
 *
 * MONETARY OUTPUTS:
 *   All returned EUR values are inflation-adjusted to constant 2024 euros.
 *   The model first projects nominal flows, then deflates them by consumer
 *   inflation so charts do not overstate long-run costs just from price level changes.
 */
const calculateEconomicMetrics = (
  population: AgeGroup[],
  retirementAge: number,
  yearsFromBase: number,
  workforceEntryAgeShift: number,
  unemploymentAdjustment: number,
  employmentRates = buildEmploymentRates(workforceEntryAgeShift, unemploymentAdjustment, retirementAge)
): EconomicMetrics => {
  // Constants from economicParams.json
  const ssRate = economicParams.socialSecurity.contributionRates.total; // 0.3475
  const baseAvgSalary = economicParams.wages.averageGrossSalary2024 *
                        economicParams.wages.annualMultiplier; // 1505 * 14 = 21070
  const baseAvgPension = economicParams.socialSecurity.averagePension2024 *
                         economicParams.wages.annualMultiplier; // 580 * 14 = 8120
  // Healthcare spending is stored directly in EUR per inhabitant
  const usdToEur = economicParams.healthcare.usdToEur;
  const allAgeHealthcareCost = economicParams.healthcare.perCapitaSpending2024 * usdToEur;
  const baseHealthcareCost = allAgeHealthcareCost / BASE_HEALTHCARE_WEIGHTED_MULTIPLIER;
  const realWageGrowth = economicParams.productivity.annualGrowthRate; // 0.015
  const healthcareInflation = economicParams.healthcare.annualInflation;
  const consumerInflation = economicParams.inflation.annualRate;

  // Growth factors used for nominal projections before deflating to 2024 euros.
  const realWageGrowthFactor = Math.pow(1 + realWageGrowth, yearsFromBase);
  const healthcareCostGrowthFactor = Math.pow(1 + healthcareInflation, yearsFromBase);
  const consumerInflationFactor = Math.pow(1 + consumerInflation, yearsFromBase);
  const nominalWageGrowthFactor = realWageGrowthFactor * consumerInflationFactor;
  const toReal2024Euros = (nominalValue: number) => nominalValue / consumerInflationFactor;

  // Calculate actual workforce and working-age population
  // Apply workforce entry age shift and unemployment adjustment
  let actualWorkforce = 0;
  let workingAgePop = 0;

  for (const group of population) {
    const workingShare = getWorkingShare(group.age, retirementAge);
    workingAgePop += group.total * workingShare;

    // Include all employed adults, including post-retirement workers.
    if (group.age >= 15) {
      actualWorkforce += group.total * employmentRates[Math.min(group.age, MAX_AGE)];
    }
  }

  actualWorkforce = Math.round(actualWorkforce);
  workingAgePop = Math.round(workingAgePop);

  // Calculate retired population and pension recipients.
  // Employed retirees are excluded from pension payments.
  let retiredPop = 0;
  let actualPensioners = 0;
  for (const group of population) {
    const retiredShare = getRetiredShare(group.age, retirementAge);
    if (retiredShare > 0) {
      const retiredGroupPop = group.total * retiredShare;
      const pensionRecipientShare = getPensionRecipientShare(
        group.age,
        retirementAge,
        employmentRates[Math.min(group.age, MAX_AGE)]
      );
      retiredPop += retiredGroupPop;
      actualPensioners += group.total * pensionRecipientShare;
    }
  }
  retiredPop = Math.round(retiredPop);
  actualPensioners = Math.round(actualPensioners);

  // Social Security calculations in nominal euros.
  const avgSalary = baseAvgSalary * nominalWageGrowthFactor;
  const avgPension = baseAvgPension * nominalWageGrowthFactor; // Pensions indexed to wages

  const nominalTotalSSContributions = actualWorkforce * avgSalary * ssRate;
  const nominalTotalPensionPayments = actualPensioners * avgPension;
  const totalPopulation = population.reduce((sum, group) => sum + group.total, 0);
  const nominalOtherSSExpenditure = totalPopulation * BASE_OTHER_SS_EXPENDITURE_PER_CAPITA * nominalWageGrowthFactor;
  const nominalTotalSSExpenditure = nominalTotalPensionPayments + nominalOtherSSExpenditure;
  const nominalSSBalance = nominalTotalSSContributions - nominalTotalSSExpenditure;
  const totalSSContributions = toReal2024Euros(nominalTotalSSContributions);
  const totalPensionPayments = toReal2024Euros(nominalTotalPensionPayments);
  const ssBalance = toReal2024Euros(nominalSSBalance);
  const ssBalancePerWorker = actualWorkforce > 0 ? ssBalance / actualWorkforce : 0;

  // Healthcare calculations in nominal euros, then converted to constant 2024 euros.
  let nominalTotalHealthcareCost = 0;
  for (const group of population) {
    const multiplier = getHealthcareMultiplier(group.age);
    const costPerPerson = baseHealthcareCost * multiplier * healthcareCostGrowthFactor;
    nominalTotalHealthcareCost += group.total * costPerPerson;
  }

  // Public healthcare = government-funded share from Eurostat SHA 2024
  const publicShare = economicParams.healthcare.publicShare;
  const totalHealthcareCost = toReal2024Euros(nominalTotalHealthcareCost);
  const publicHealthcareCost = totalHealthcareCost * publicShare;

  const healthcareCostPerWorker = actualWorkforce > 0
    ? totalHealthcareCost / actualWorkforce
    : 0;

  // Combined fiscal burden uses only public healthcare (government obligation)
  const ssDeficit = Math.max(0, -ssBalance);
  const totalBurdenPerWorker = actualWorkforce > 0
    ? (ssDeficit + publicHealthcareCost) / actualWorkforce
    : 0;

  // Sustainability index (0-100)
  // Measures total fiscal burden (SS deficit + healthcare) against economic capacity (GDP)
  // 100 = burden is minimal relative to GDP
  // 0 = critical (burden exceeds 40% of GDP)
  //
  // Formula: sustainabilityIndex = 100 * (1 - totalBurden / (GDP * maxBurdenThreshold))
  // Where maxBurdenThreshold = 0.40 (40% of GDP is considered the breaking point)
  const gdpPerWorker = economicParams.productivity.gdpPerWorker2024; // 54,582.87 EUR
  const nominalGdpProxy = actualWorkforce * gdpPerWorker * nominalWageGrowthFactor;
  const gdpProxy = toReal2024Euros(nominalGdpProxy);
  const totalFiscalBurden = ssDeficit + publicHealthcareCost;

  // 40% of GDP as max sustainable burden (SS + healthcare combined)
  // At this level, the system is considered critically unsustainable
  const maxSustainableBurdenRatio = 0.40;
  let sustainabilityIndex = 0; // Default to critical (0) when GDP is zero
  if (gdpProxy > 0) {
    const burdenAsShareOfGDP = totalFiscalBurden / gdpProxy;
    sustainabilityIndex = Math.max(0, Math.min(100,
      100 * (1 - burdenAsShareOfGDP / maxSustainableBurdenRatio)
    ));
  }

  // Labor utilization rate (includes post-retirement workers, so can exceed 1.0)
  const laborUtilizationRate = workingAgePop > 0 ? actualWorkforce / workingAgePop : 0;

  return {
    actualWorkforce,
    laborUtilizationRate,
    totalSSContributions,
    totalPensionPayments,
    ssBalance,
    ssBalancePerWorker,
    totalHealthcareCost,
    publicHealthcareCost,
    healthcareCostPerWorker,
    totalBurdenPerWorker,
    sustainabilityIndex,
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

  let currentPop = expandInitialPopulation();
  const results: YearData[] = [];
  const baseYear = BASE_YEAR;
  const employmentRates = buildEmploymentRates(
    params.workforceEntryAgeShift,
    params.unemploymentAdjustment,
    params.retirementAge
  );

  for (let year = startYear; year <= endYear; year++) {
    const yearsFromBase = year - baseYear;
    const fertilityAssumption = getAnnualFertilityAssumption(year, params);
    const annualFertilityRates = buildAnnualFertilityRates(
      fertilityAssumption.totalFertilityRate,
      fertilityAssumption.meanAgeAtChildbirth
    );
    const annualNetMigration = Math.round(getAnnualNetMigration(year, startYear, params));
    const migrationAmounts = params.projectionProfile
      ? buildProjectedTransitionMigrationAmounts(
          annualNetMigration,
          year,
          params.projectionProfile.migration
        )
      : buildTransitionMigrationAmounts(annualNetMigration);
    const maleQxByAge = Array(OPEN_AGE_MAX + 1);
    const femaleQxByAge = Array(OPEN_AGE_MAX + 1);
    const maleHalfYearQxByAge = Array(OPEN_AGE_MAX + 1);
    const femaleHalfYearQxByAge = Array(OPEN_AGE_MAX + 1);

    for (let age = 0; age <= OPEN_AGE_MAX; age++) {
      const projectedMaleFactor = getProjectionMortalityFactor(year, age, 'male', params);
      const projectedFemaleFactor = getProjectionMortalityFactor(year, age, 'female', params);
      const maleMortalityFactor = projectedMaleFactor ?? Math.pow(
        1 - getAgeAdjustedMortalityImprovement(age, params.mortalityImprovement.male),
        yearsFromBase
      );
      const femaleMortalityFactor = projectedFemaleFactor ?? Math.pow(
        1 - getAgeAdjustedMortalityImprovement(age, params.mortalityImprovement.female),
        yearsFromBase
      );
      const maleQx = clampMortalityRate(getOpenAgeBaseQx(age, 'male') * maleMortalityFactor);
      const femaleQx = clampMortalityRate(getOpenAgeBaseQx(age, 'female') * femaleMortalityFactor);
      maleQxByAge[age] = maleQx;
      femaleQxByAge[age] = femaleQx;
      maleHalfYearQxByAge[age] = getHalfYearMortalityRate(maleQx);
      femaleHalfYearQxByAge[age] = getHalfYearMortalityRate(femaleQx);
    }

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
        workingPop += group.total * getWorkingShare(group.age, params.retirementAge);
        retiredPop += group.total * getRetiredShare(group.age, params.retirementAge);
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

    // Calculate economic metrics with workforce entry and unemployment adjustments
    const economic = calculateEconomicMetrics(
      currentPop,
      params.retirementAge,
      yearsFromBase,
      params.workforceEntryAgeShift,
      params.unemploymentAdjustment,
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
        fertilityRate: fertilityAssumption.totalFertilityRate,
        netMigration: annualNetMigration,
      },
      economic
    });

    // 2. Evolve population for next year using cohort-component method
    const nextPop: AgeGroup[] = [];

    // Pre-calculate all migration amounts by transition source age before
    // fertility and mortality. The profile is stored by end-of-transition age,
    // so age x in the profile is applied to the cohort age x - 1 at start year.
    let totalMigrationDistributed = 0;
    const maleMigrationByAge = [...migrationAmounts.maleBySourceAge];
    const femaleMigrationByAge = [...migrationAmounts.femaleBySourceAge];

    for (const group of currentPop) {
      if (group.age >= MAX_AGE) {
        continue;
      }

      const cappedMaleMigration = capNegativeMigrationToAvailablePopulation(
        maleMigrationByAge[group.age],
        group.male,
        maleQxByAge[group.age]
      );
      const cappedFemaleMigration = capNegativeMigrationToAvailablePopulation(
        femaleMigrationByAge[group.age],
        group.female,
        femaleQxByAge[group.age]
      );

      maleMigrationByAge[group.age] = cappedMaleMigration;
      femaleMigrationByAge[group.age] = cappedFemaleMigration;
    }

    // Calculate Births using Age-Specific Fertility Rates (ASFR)
    let totalBirths = 0;
    for (const group of currentPop) {
      if (group.age >= 15 && group.age <= 49) {
        const migrationFemale = femaleMigrationByAge[group.age] || 0;
        const femaleExposure = Math.max(0, group.female + migrationFemale / 2);
        totalBirths += femaleExposure * annualFertilityRates[group.age];
      }
    }

    const births = Math.round(totalBirths);

    // Sex ratio at birth: ~105 males per 100 females
    const sexRatio = fertilityData.sexRatioAtBirth.ratio;
    const maleBirths = Math.floor(births * (sexRatio / (1 + sexRatio)));
    const femaleBirths = births - maleBirths;
    const newbornMaleDeaths = Math.round(
      maleBirths * maleHalfYearQxByAge[0]
    );
    const newbornFemaleDeaths = Math.round(
      femaleBirths * femaleHalfYearQxByAge[0]
    );
    const survivingMaleBirths = Math.max(0, maleBirths - newbornMaleDeaths);
    const survivingFemaleBirths = Math.max(0, femaleBirths - newbornFemaleDeaths);
    const cappedAgeZeroMaleMigration = Math.max(
      migrationAmounts.maleAgeZero,
      -survivingMaleBirths
    );
    const cappedAgeZeroFemaleMigration = Math.max(
      migrationAmounts.femaleAgeZero,
      -survivingFemaleBirths
    );
    const ageZeroMigrantDeathsMale = cappedAgeZeroMaleMigration > 0
      ? Math.round(cappedAgeZeroMaleMigration * maleHalfYearQxByAge[0])
      : 0;
    const ageZeroMigrantDeathsFemale = cappedAgeZeroFemaleMigration > 0
      ? Math.round(cappedAgeZeroFemaleMigration * femaleHalfYearQxByAge[0])
      : 0;
    const ageZeroMale = Math.max(
      0,
      survivingMaleBirths + cappedAgeZeroMaleMigration - ageZeroMigrantDeathsMale
    );
    const ageZeroFemale = Math.max(
      0,
      survivingFemaleBirths + cappedAgeZeroFemaleMigration - ageZeroMigrantDeathsFemale
    );

    // Age 0 cohort (newborns)
    nextPop.push({
      age: 0,
      male: ageZeroMale,
      female: ageZeroFemale,
      total: ageZeroMale + ageZeroFemale
    });

    // Track existing 110+ population for the internal open-ended bucket.
    let openAgeMale = 0;
    let openAgeFemale = 0;

    // Track total deaths and migration for population balance validation
    let totalDeaths = newbornMaleDeaths + newbornFemaleDeaths +
                      ageZeroMigrantDeathsMale + ageZeroMigrantDeathsFemale;
    totalMigrationDistributed += cappedAgeZeroMaleMigration + cappedAgeZeroFemaleMigration;

    // Age existing population with mortality and migration
    for (let i = 0; i < currentPop.length; i++) {
      const group = currentPop[i];

      // Get migration for this age group
      const migrationMale = group.age < MAX_AGE ? maleMigrationByAge[group.age] : 0;
      const migrationFemale = group.age < MAX_AGE ? femaleMigrationByAge[group.age] : 0;

      const maleQx = maleQxByAge[group.age];
      const femaleQx = femaleQxByAge[group.age];
      const halfYearMaleQx = maleHalfYearQxByAge[group.age];
      const halfYearFemaleQx = femaleHalfYearQxByAge[group.age];

      // Emigrants are assumed to leave mid-year on average, so only half of their
      // annual mortality exposure remains in the resident population.
      const residentMaleExposure = Math.max(0, group.male + Math.min(0, migrationMale) / 2);
      const residentFemaleExposure = Math.max(0, group.female + Math.min(0, migrationFemale) / 2);
      const residentDeathsMale = Math.round(residentMaleExposure * maleQx);
      const residentDeathsFemale = Math.round(residentFemaleExposure * femaleQx);

      // Immigrants arrive through the year and only face half-year mortality.
      const migrantDeathsMale = migrationMale > 0
        ? Math.round(migrationMale * halfYearMaleQx)
        : 0;
      const migrantDeathsFemale = migrationFemale > 0
        ? Math.round(migrationFemale * halfYearFemaleQx)
        : 0;

      totalDeaths += residentDeathsMale + residentDeathsFemale + migrantDeathsMale + migrantDeathsFemale;

      const rawSurvivingMale = group.male - residentDeathsMale + migrationMale - migrantDeathsMale;
      const rawSurvivingFemale = group.female - residentDeathsFemale + migrationFemale - migrantDeathsFemale;
      const survivingMale = Math.max(0, rawSurvivingMale);
      const survivingFemale = Math.max(0, rawSurvivingFemale);
      const appliedMigrationMale = migrationMale + (survivingMale - rawSurvivingMale);
      const appliedMigrationFemale = migrationFemale + (survivingFemale - rawSurvivingFemale);
      totalMigrationDistributed += appliedMigrationMale + appliedMigrationFemale;

      // Age 109 survivors and existing 110+ survivors go to the 110+ aggregate.
      if (group.age >= OPEN_AGE_MAX - 1) {
        openAgeMale += survivingMale;
        openAgeFemale += survivingFemale;
      } else {
        nextPop.push({
          age: group.age + 1,
          male: survivingMale,
          female: survivingFemale,
          total: survivingMale + survivingFemale
        });
      }
    }

    // Add age 110+ aggregate group if any survivors
    if (openAgeMale + openAgeFemale > 0) {
      nextPop.push({
        age: OPEN_AGE_MAX,
        male: openAgeMale,
        female: openAgeFemale,
        total: openAgeMale + openAgeFemale
      });
    }

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
