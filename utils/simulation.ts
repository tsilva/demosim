import { AgeGroup, YearData, SimulationParams, MortalityImprovementRate, EconomicMetrics } from '../types';

// Import real demographic data
import { populationData } from '../data/population2024';
import { lifeTables } from '../data/lifeTables';
import { fertilityData } from '../data/fertilityRates';
import { migrationData } from '../data/migrationProfile';
import economicParams from '../data/economicParams.json';

const MAX_AGE = 100;

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
 * Generates initial population data for Portugal (2024)
 * Uses the repository's calibrated 2024 age/sex population distribution
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
const getMortalityRate = (
  age: number,
  sex: 'male' | 'female',
  yearsFromBase: number,
  mortalityImprovement: MortalityImprovementRate
): number => {
  const qxArray = sex === 'male' ? lifeTables.qx.male : lifeTables.qx.female;
  const improvementRate = sex === 'male'
    ? mortalityImprovement.male
    : mortalityImprovement.female;

  // Get base qx, capped at age 100+
  const baseQx = qxArray[Math.min(age, 100)];

  // Apply mortality improvement over time (mortality decreases as medicine improves)
  // This models increasing life expectancy over the projection period.
  // Keep qx below 1.0 so the open-ended age 100+ group can persist realistically.
  const improvedQx = baseQx * Math.pow(1 - improvementRate, yearsFromBase);

  return Math.max(0, Math.min(improvedQx, 0.999999));
};

/**
 * Approximate mortality for people exposed to only half of the year
 * (newborns and immigrants arrive uniformly through the year on average)
 */
const getHalfYearMortalityRate = (annualQx: number): number => {
  return 1 - Math.sqrt(1 - annualQx);
};

/**
 * Get age-specific fertility rate (ASFR)
 * Returns births per woman per year for a given age
 * Based on Eurostat 2024 data, calibrated to TFR 1.41 and mean age 31.7
 */
const getFertilityRate = (age: number): number => {
  return FERTILITY_BY_AGE[age] || 0;
};

/**
 * Get migration weight for a given age group
 * Returns the proportion of total migration allocated to this age
 * Weights are normalized to sum to 1.0 to ensure all migration is distributed
 */
const getMigrationWeight = (age: number, sex: 'male' | 'female'): number => {
  return MIGRATION_WEIGHTS[sex][age] || 0;
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
    const maxAge = group.ageGroup.endsWith('+') ? 99 : parsedMaxAge;
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

const buildEmploymentRates = (
  workforceEntryAgeShift: number,
  unemploymentAdjustment: number
) => {
  return Array.from({ length: MAX_AGE + 1 }, (_, age) => {
    const effectiveAge = Math.max(15, Math.min(MAX_AGE, age - workforceEntryAgeShift));
    const baseRate = EMPLOYMENT_BASE_RATE_BY_AGE[effectiveAge] || 0;
    const adjustedRate = baseRate * (1 - unemploymentAdjustment);
    return Math.max(0, Math.min(1, adjustedRate));
  });
};

/**
 * Get employment rate for a given age, adjusted for workforce entry shift and unemployment
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
  unemploymentAdjustment: number = 0
): number => {
  // Apply workforce entry age shift: look up rate for (age - shift)
  // Positive shift = later entry, so a 25yo with shift=+2 uses rate for age 23
  const effectiveAge = Math.max(15, Math.min(MAX_AGE, age - workforceEntryAgeShift));
  const baseRate = EMPLOYMENT_BASE_RATE_BY_AGE[effectiveAge] || 0;

  // Apply unemployment adjustment: higher unemployment = lower employment rate
  // Clamp the result between 0 and the base rate (can't have negative employment)
  const adjustedRate = baseRate * (1 - unemploymentAdjustment);
  return Math.max(0, Math.min(1, adjustedRate));
};

/**
 * Get healthcare cost multiplier for a given age
 * Returns multiplier relative to 20-64 baseline (1.0)
 * Source: Eurostat health accounts 2024
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
 *   Sum over all ages: population[age] * employmentRate[age]
 *
 * SS CONTRIBUTIONS:
 *   actualWorkforce * avgGrossSalary * ssContributionRate * inflationFactor
 *   Where:
 *   - avgGrossSalary = 21,070 EUR/year (1505 * 14 months)
 *   - ssContributionRate = 34.75%
 *   - inflationFactor = (1 + wageGrowth)^yearsFromBase
 *
 * PENSION PAYMENTS:
 *   retiredPop * avgPension * inflationFactor
 *   Where:
 *   - avgPension = 8,120 EUR/year (580 * 14 months)
 *
 * HEALTHCARE COSTS:
 *   Sum over all ages: population[age] * baseCost * ageMultiplier[age] * inflationFactor
 *   Where:
 *   - baseCost = 2,730.81 EUR/year per capita
 *   - ageMultiplier: 0.6 (0-19), 1.0 (20-64), 2.5 (65-74), 4.0 (75-84), 6.0 (85+)
 *
 * SUSTAINABILITY INDEX:
 *   100 * (1 - totalBurden / (GDP * 0.40))
 *   Where totalBurden = ssDeficit + publicHealthcareCost
 *   40% of GDP threshold = system breaking point (index = 0)
 *   Capped at 0 (critical) to 100 (fully sustainable)
 */
const calculateEconomicMetrics = (
  population: AgeGroup[],
  retirementAge: number,
  yearsFromBase: number,
  workforceEntryAgeShift: number,
  unemploymentAdjustment: number,
  employmentRates = buildEmploymentRates(workforceEntryAgeShift, unemploymentAdjustment)
): EconomicMetrics => {
  // Constants from economicParams.json
  const ssRate = economicParams.socialSecurity.contributionRates.total; // 0.3475
  const baseAvgSalary = economicParams.wages.averageGrossSalary2024 *
                        economicParams.wages.annualMultiplier; // 1505 * 14 = 21070
  const baseAvgPension = economicParams.socialSecurity.averagePension2024 *
                         economicParams.wages.annualMultiplier; // 580 * 14 = 8120
  // Healthcare spending is stored directly in EUR per inhabitant
  const usdToEur = economicParams.healthcare.usdToEur;
  const baseHealthcareCost = economicParams.healthcare.perCapitaSpending2024 * usdToEur;
  const wageGrowth = economicParams.productivity.annualGrowthRate; // 0.015
  const healthcareInflation = economicParams.healthcare.annualInflation;

  // Inflation factors
  const wageInflationFactor = Math.pow(1 + wageGrowth, yearsFromBase);
  const healthcareInflationFactor = Math.pow(1 + healthcareInflation, yearsFromBase);

  // Calculate actual workforce and working-age population
  // Apply workforce entry age shift and unemployment adjustment
  let actualWorkforce = 0;
  let workingAgePop = 0;

  for (const group of population) {
    if (group.age >= 15 && group.age < retirementAge) {
      workingAgePop += group.total;
      actualWorkforce += group.total * employmentRates[Math.min(group.age, MAX_AGE)];
    }
    // Include post-retirement workers (65-69 have 15%, 70+ have 4%)
    if (group.age >= retirementAge) {
      actualWorkforce += group.total * employmentRates[Math.min(group.age, MAX_AGE)];
    }
  }

  actualWorkforce = Math.round(actualWorkforce);

  // Calculate retired population and actual pensioners (excluding those still working)
  let retiredPop = 0;
  let actualPensioners = 0;
  for (const group of population) {
    if (group.age >= retirementAge) {
      retiredPop += group.total;
      // Subtract those still working from pension recipients
      const employmentRate = employmentRates[Math.min(group.age, MAX_AGE)];
      actualPensioners += group.total * (1 - employmentRate);
    }
  }
  actualPensioners = Math.round(actualPensioners);

  // Social Security calculations
  const avgSalary = baseAvgSalary * wageInflationFactor;
  const avgPension = baseAvgPension * wageInflationFactor; // Pensions indexed to wages

  const totalSSContributions = actualWorkforce * avgSalary * ssRate;
  // Use actual pensioners (not all retired-age population) for pension payments
  const totalPensionPayments = actualPensioners * avgPension;
  const ssBalance = totalSSContributions - totalPensionPayments;
  const ssBalancePerWorker = actualWorkforce > 0 ? ssBalance / actualWorkforce : 0;

  // Healthcare calculations
  let totalHealthcareCost = 0;
  for (const group of population) {
    const multiplier = getHealthcareMultiplier(group.age);
    const costPerPerson = baseHealthcareCost * multiplier * healthcareInflationFactor;
    totalHealthcareCost += group.total * costPerPerson;
  }

  // Public healthcare = government-funded share from Eurostat SHA 2024
  const publicShare = economicParams.healthcare.publicShare;
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
  const gdpPerWorker = economicParams.productivity.gdpPerWorker2024; // 42,500 EUR
  const gdpProxy = actualWorkforce * gdpPerWorker * wageInflationFactor;
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

  let currentPop = generateInitialData();
  const results: YearData[] = [];
  const baseYear = startYear;
  const fertilityScale = params.fertilityRate / fertilityData.totalFertilityRate;
  const employmentRates = buildEmploymentRates(params.workforceEntryAgeShift, params.unemploymentAdjustment);
  const totalMaleMigration = params.netMigration * migrationData.sexRatio.ratio;
  const totalFemaleMigration = params.netMigration * (1 - migrationData.sexRatio.ratio);

  for (let year = startYear; year <= endYear; year++) {
    const yearsFromBase = year - baseYear;
    const maleMortalityFactor = Math.pow(1 - params.mortalityImprovement.male, yearsFromBase);
    const femaleMortalityFactor = Math.pow(1 - params.mortalityImprovement.female, yearsFromBase);
    const maleQxByAge = Array(MAX_AGE + 1);
    const femaleQxByAge = Array(MAX_AGE + 1);
    const maleHalfYearQxByAge = Array(MAX_AGE + 1);
    const femaleHalfYearQxByAge = Array(MAX_AGE + 1);

    for (let age = 0; age <= MAX_AGE; age++) {
      const maleQx = Math.max(0, Math.min(lifeTables.qx.male[age] * maleMortalityFactor, 0.999999));
      const femaleQx = Math.max(0, Math.min(lifeTables.qx.female[age] * femaleMortalityFactor, 0.999999));
      maleQxByAge[age] = maleQx;
      femaleQxByAge[age] = femaleQx;
      maleHalfYearQxByAge[age] = getHalfYearMortalityRate(maleQx);
      femaleHalfYearQxByAge[age] = getHalfYearMortalityRate(femaleQx);
    }

    // 1. Calculate Statistics for current year
    const workingAgeLimit = params.retirementAge;

    let childPop = 0;
    let workingPop = 0;
    let retiredPop = 0;
    for (const group of currentPop) {
      if (group.age < 15) {
        childPop += group.total;
      } else if (group.age < workingAgeLimit) {
        workingPop += group.total;
      } else {
        retiredPop += group.total;
      }
    }
    const totalPop = childPop + workingPop + retiredPop;

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
      population: currentPop.map(group => ({ ...group })),
      totalPopulation: totalPop,
      workingAgePop: workingPop,
      retiredPop: retiredPop,
      childPop,
      oldAgeDependencyRatio: workingPop > 0 ? (retiredPop / workingPop) * 100 : 0,
      medianAge,
      economic
    });

    // 2. Evolve population for next year using cohort-component method
    const nextPop: AgeGroup[] = [];

    // Calculate Births using Age-Specific Fertility Rates (ASFR)
    let totalBirths = 0;
    for (const group of currentPop) {
      if (group.age >= 15 && group.age <= 49) {
        // Get ASFR for this age, adjusted by user's TFR parameter
        const baseASFR = FERTILITY_BY_AGE[group.age];
        // Scale ASFR proportionally to the official 2024 base TFR
        const scaledASFR = baseASFR * fertilityScale;
        totalBirths += group.female * scaledASFR;
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

    // Age 0 cohort (newborns)
    nextPop.push({
      age: 0,
      male: survivingMaleBirths,
      female: survivingFemaleBirths,
      total: survivingMaleBirths + survivingFemaleBirths
    });

    // Track migration carry-over to prevent rounding losses
    let maleMigrationCarry = 0;
    let femaleMigrationCarry = 0;

    // Track existing age 100 population for aggregation
    let age100Male = 0;
    let age100Female = 0;

    // Track total deaths and migration for population balance validation
    let totalDeaths = newbornMaleDeaths + newbornFemaleDeaths;
    let totalMigrationDistributed = 0;

    // Pre-calculate all migration amounts by age group before mortality
    const maleMigrationByAge = Array(MAX_AGE).fill(0);
    const femaleMigrationByAge = Array(MAX_AGE).fill(0);
    for (const group of currentPop) {
      if (group.age >= 100) {
        continue;
      }
      const migrationWeightMale = MIGRATION_WEIGHTS.male[group.age];
      const migrationWeightFemale = MIGRATION_WEIGHTS.female[group.age];

      const exactMaleMigration = totalMaleMigration * migrationWeightMale + maleMigrationCarry;
      const exactFemaleMigration = totalFemaleMigration * migrationWeightFemale + femaleMigrationCarry;

      const migrationMale = Math.trunc(exactMaleMigration);
      const migrationFemale = Math.trunc(exactFemaleMigration);

      maleMigrationCarry = exactMaleMigration - migrationMale;
      femaleMigrationCarry = exactFemaleMigration - migrationFemale;

      maleMigrationByAge[group.age] = migrationMale;
      femaleMigrationByAge[group.age] = migrationFemale;
      totalMigrationDistributed += migrationMale + migrationFemale;
    }

    // Apply remaining migration carry-over to age 99 group (last regular cohort)
    const finalMaleMigration = Math.round(maleMigrationCarry);
    const finalFemaleMigration = Math.round(femaleMigrationCarry);
    if ((finalMaleMigration !== 0 || finalFemaleMigration !== 0)) {
      maleMigrationByAge[99] += finalMaleMigration;
      femaleMigrationByAge[99] += finalFemaleMigration;
      totalMigrationDistributed += finalMaleMigration + finalFemaleMigration;
    }

    // Age existing population with mortality and migration
    for (let i = 0; i < currentPop.length; i++) {
      const group = currentPop[i];

      // Handle age 100+ separately: no direct migration, keep survivors in the open-ended bucket
      if (group.age >= 100) {
        const qx100M = maleQxByAge[100];
        const qx100F = femaleQxByAge[100];
        const deathsMale100 = Math.round(group.male * qx100M);
        const deathsFemale100 = Math.round(group.female * qx100F);
        totalDeaths += deathsMale100 + deathsFemale100;
        age100Male += Math.max(0, group.male - deathsMale100);
        age100Female += Math.max(0, group.female - deathsFemale100);
        continue;
      }

      // Get migration for this age group
      const migrationMale = maleMigrationByAge[group.age];
      const migrationFemale = femaleMigrationByAge[group.age];

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

      const survivingMale = Math.max(0, group.male - residentDeathsMale + migrationMale - migrantDeathsMale);
      const survivingFemale = Math.max(0, group.female - residentDeathsFemale + migrationFemale - migrantDeathsFemale);

      // Age 99 survivors go to age 100 aggregate
      if (group.age === 99) {
        age100Male += survivingMale;
        age100Female += survivingFemale;
      } else {
        nextPop.push({
          age: group.age + 1,
          male: survivingMale,
          female: survivingFemale,
          total: survivingMale + survivingFemale
        });
      }
    }

    // Add age 100+ aggregate group if any survivors
    if (age100Male + age100Female > 0) {
      nextPop.push({
        age: 100,
        male: age100Male,
        female: age100Female,
        total: age100Male + age100Female
      });
    }

    // Population balance validation (development check)
    // Threshold of 500 accounts for cumulative rounding across 101 age groups
    const nextPopTotal = nextPop.reduce((sum, g) => sum + g.total, 0);
    const expectedNextPop = totalPop + births - totalDeaths + totalMigrationDistributed;
    const balanceError = Math.abs(nextPopTotal - expectedNextPop);
    if (process.env.NODE_ENV !== 'production' && balanceError > 500) {
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
