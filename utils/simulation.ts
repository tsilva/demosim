import { AgeGroup, YearData, SimulationParams, MortalityImprovementRate, EconomicMetrics } from '../types';

// Import real demographic data
import { populationData } from '../data/population2024';
import { lifeTables } from '../data/lifeTables';
import { fertilityData } from '../data/fertilityRates';
import { migrationData } from '../data/migrationProfile';
import economicParams from '../data/economicParams.json';

/**
 * Generates initial population data for Portugal (2024)
 * Uses real INE data calibrated to 10,749,635 total population
 */
export const generateInitialData = (): AgeGroup[] => {
  return populationData.data.map(row => ({
    age: row.age,
    male: row.male,
    female: row.female,
    total: row.male + row.female
  }));
};

/**
 * Get mortality rate (qx) for a given age and sex
 * Uses INE Life Tables 2022-2024 calibrated to life expectancy:
 * - Male: 78.73 years
 * - Female: 83.96 years
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

  // Get base qx, capped at age 100
  const baseQx = qxArray[Math.min(age, 100)];

  // Apply mortality improvement over time (mortality decreases as medicine improves)
  // This models increasing life expectancy over the projection period
  const improvedQx = baseQx * Math.pow(1 - improvementRate, yearsFromBase);

  return Math.min(improvedQx, 1.0);
};

/**
 * Get age-specific fertility rate (ASFR)
 * Returns births per woman per year for a given age
 * Based on INE 2023 data, calibrated to TFR 1.40 and mean age 31.6
 */
const getFertilityRate = (age: number): number => {
  const asfrEntry = fertilityData.asfr.find(a => a.age === age);
  if (!asfrEntry) return 0;
  // Convert from per-1000 to per-woman
  return asfrEntry.rate / 1000;
};

/**
 * Get migration weight for a given age group
 * Returns the proportion of total migration allocated to this age
 */
const getMigrationWeight = (age: number, sex: 'male' | 'female'): number => {
  const profile = sex === 'male' ? migrationData.ageProfile.male : migrationData.ageProfile.female;

  // Find the age group this age belongs to
  for (const group of profile) {
    const [minAge, maxAge] = parseAgeGroup(group.ageGroup);
    if (age >= minAge && age <= maxAge) {
      // Distribute weight evenly across ages in the group
      const groupSize = maxAge - minAge + 1;
      return group.weight / groupSize;
    }
  }
  return 0;
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

/**
 * Get employment rate for a given age
 * Returns the proportion of people at this age who are employed
 * Source: PORDATA employment rates by age group
 */
const getEmploymentRate = (age: number): number => {
  for (const entry of economicParams.employment.rates) {
    const [minAge, maxAge] = parseAgeGroup(entry.ageGroup);
    if (age >= minAge && age <= maxAge) {
      return entry.rate;
    }
  }
  return 0;
};

/**
 * Get healthcare cost multiplier for a given age
 * Returns multiplier relative to 20-64 baseline (1.0)
 * Source: OECD Health Statistics 2024
 */
const getHealthcareMultiplier = (age: number): number => {
  const multipliers = economicParams.healthcare.ageMultipliers;
  if (age <= 19) return multipliers['0-19'];
  if (age <= 64) return multipliers['20-64'];
  if (age <= 74) return multipliers['65-74'];
  if (age <= 84) return multipliers['75-84'];
  return multipliers['85+'];
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
 *   - baseCost = 2,744 EUR/year per capita
 *   - ageMultiplier: 0.6 (0-19), 1.0 (20-64), 2.5 (65-74), 4.0 (75-84), 6.0 (85+)
 *
 * SUSTAINABILITY INDEX:
 *   100 * (1 - deficit / contributions)
 *   Capped at 0 (critical) to 100 (fully sustainable)
 */
const calculateEconomicMetrics = (
  population: AgeGroup[],
  retirementAge: number,
  yearsFromBase: number
): EconomicMetrics => {
  // Constants from economicParams.json
  const ssRate = economicParams.socialSecurity.contributionRates.total; // 0.3475
  const baseAvgSalary = economicParams.wages.averageGrossSalary2024 *
                        economicParams.wages.annualMultiplier; // 1505 * 14 = 21070
  const baseAvgPension = economicParams.socialSecurity.averagePension2024 *
                         economicParams.wages.annualMultiplier; // 580 * 14 = 8120
  const baseHealthcareCost = economicParams.healthcare.perCapitaSpending2024; // 2744
  const wageGrowth = economicParams.productivity.annualGrowthRate; // 0.015
  const healthcareInflation = 0.02; // 2% annual healthcare inflation

  // Inflation factors
  const wageInflationFactor = Math.pow(1 + wageGrowth, yearsFromBase);
  const healthcareInflationFactor = Math.pow(1 + healthcareInflation, yearsFromBase);

  // Calculate actual workforce and working-age population
  let actualWorkforce = 0;
  let workingAgePop = 0;

  for (const group of population) {
    if (group.age >= 15 && group.age < retirementAge) {
      workingAgePop += group.total;
      actualWorkforce += group.total * getEmploymentRate(group.age);
    }
    // Include post-retirement workers (65-69 have 15%, 70+ have 4%)
    if (group.age >= retirementAge) {
      actualWorkforce += group.total * getEmploymentRate(group.age);
    }
  }

  actualWorkforce = Math.round(actualWorkforce);

  // Calculate retired population
  const retiredPop = population
    .filter(g => g.age >= retirementAge)
    .reduce((sum, g) => sum + g.total, 0);

  // Social Security calculations
  const avgSalary = baseAvgSalary * wageInflationFactor;
  const avgPension = baseAvgPension * wageInflationFactor; // Pensions indexed to wages

  const totalSSContributions = actualWorkforce * avgSalary * ssRate;
  const totalPensionPayments = retiredPop * avgPension;
  const ssBalance = totalSSContributions - totalPensionPayments;
  const ssBalancePerWorker = actualWorkforce > 0 ? ssBalance / actualWorkforce : 0;

  // Healthcare calculations
  let totalHealthcareCost = 0;
  for (const group of population) {
    const multiplier = getHealthcareMultiplier(group.age);
    const costPerPerson = baseHealthcareCost * multiplier * healthcareInflationFactor;
    totalHealthcareCost += group.total * costPerPerson;
  }

  const healthcareCostPerWorker = actualWorkforce > 0
    ? totalHealthcareCost / actualWorkforce
    : 0;

  // Combined burden (only count SS deficit, not surplus)
  const ssDeficit = Math.max(0, -ssBalance);
  const totalBurdenPerWorker = actualWorkforce > 0
    ? (ssDeficit + totalHealthcareCost) / actualWorkforce
    : 0;

  // Sustainability index (0-100)
  // 100 = fully sustainable (contributions >= payments)
  // 0 = critical (deficit >= contributions)
  let sustainabilityIndex = 100;
  if (totalSSContributions > 0) {
    const deficitRatio = ssDeficit / totalSSContributions;
    sustainabilityIndex = Math.max(0, Math.min(100, 100 * (1 - deficitRatio)));
  }

  // Overall employment rate
  const employmentRate = workingAgePop > 0 ? actualWorkforce / workingAgePop : 0;

  return {
    actualWorkforce,
    employmentRate,
    totalSSContributions,
    totalPensionPayments,
    ssBalance,
    ssBalancePerWorker,
    totalHealthcareCost,
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
  let currentPop = generateInitialData();
  const results: YearData[] = [];
  const baseYear = startYear;

  for (let year = startYear; year <= endYear; year++) {
    const yearsFromBase = year - baseYear;

    // 1. Calculate Statistics for current year
    const workingAgeLimit = params.retirementAge;

    const childPop = currentPop.filter(g => g.age < 15).reduce((sum, g) => sum + g.total, 0);
    const workingPop = currentPop.filter(g => g.age >= 15 && g.age < workingAgeLimit).reduce((sum, g) => sum + g.total, 0);
    const retiredPop = currentPop.filter(g => g.age >= workingAgeLimit).reduce((sum, g) => sum + g.total, 0);
    const totalPop = childPop + workingPop + retiredPop;

    // Calculate Median Age
    let cumulative = 0;
    let medianAge = 0;
    for (const g of currentPop) {
      cumulative += g.total;
      if (cumulative >= totalPop / 2) {
        medianAge = g.age;
        break;
      }
    }

    // Calculate economic metrics
    const economic = calculateEconomicMetrics(currentPop, params.retirementAge, yearsFromBase);

    results.push({
      year,
      population: JSON.parse(JSON.stringify(currentPop)),
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
        const baseASFR = getFertilityRate(group.age);
        // Scale ASFR proportionally to user's TFR setting (base TFR is 1.40)
        const scaledASFR = baseASFR * (params.fertilityRate / 1.40);
        totalBirths += group.female * scaledASFR;
      }
    }

    const births = Math.floor(totalBirths);

    // Sex ratio at birth: ~105 males per 100 females
    const sexRatio = fertilityData.sexRatioAtBirth.ratio;
    const maleBirths = Math.floor(births * (sexRatio / (1 + sexRatio)));
    const femaleBirths = births - maleBirths;

    // Age 0 cohort (newborns)
    nextPop.push({
      age: 0,
      male: maleBirths,
      female: femaleBirths,
      total: births
    });

    // Age existing population with mortality and migration
    for (let i = 0; i < currentPop.length; i++) {
      const group = currentPop[i];
      if (group.age >= 100) continue;

      // Apply age-specific mortality rates with improvement over time
      const deathsMale = Math.floor(group.male * getMortalityRate(group.age, 'male', yearsFromBase, params.mortalityImprovement));
      const deathsFemale = Math.floor(group.female * getMortalityRate(group.age, 'female', yearsFromBase, params.mortalityImprovement));

      // Apply age-specific migration using profiles from INE data
      const migrationWeightMale = getMigrationWeight(group.age, 'male');
      const migrationWeightFemale = getMigrationWeight(group.age, 'female');

      // Total migration split by sex ratio (48% male, 52% female typically)
      const totalMaleMigration = params.netMigration * migrationData.sexRatio.ratio;
      const totalFemaleMigration = params.netMigration * (1 - migrationData.sexRatio.ratio);

      const migrationMale = Math.floor(totalMaleMigration * migrationWeightMale);
      const migrationFemale = Math.floor(totalFemaleMigration * migrationWeightFemale);

      const survivingMale = Math.max(0, group.male - deathsMale + migrationMale);
      const survivingFemale = Math.max(0, group.female - deathsFemale + migrationFemale);

      nextPop.push({
        age: group.age + 1,
        male: survivingMale,
        female: survivingFemale,
        total: survivingMale + survivingFemale
      });
    }

    currentPop = nextPop;
  }

  return results;
};
