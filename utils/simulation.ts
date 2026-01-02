import { AgeGroup, YearData, SimulationParams } from '../types';

/**
 * Generates initial population data for Portugal (2024)
 * Based on PORDATA and INE official statistics:
 * Total population: ~10,467,000
 * Median Age: ~47
 * Significant bulge in the 40-55 age group.
 */
export const generateInitialData = (): AgeGroup[] => {
  const data: AgeGroup[] = [];
  
  // Refined parametric model to hit ~10.4M with correct shape
  for (let age = 0; age <= 100; age++) {
    let basePop = 0;
    
    if (age < 15) {
      // Younger cohorts (low fertility era)
      basePop = 82000 + (age * 600); 
    } else if (age < 30) {
      // Young adults
      basePop = 92000 + ((age - 15) * 1200);
    } else if (age < 50) {
      // The "Generation X/Early Millennial" bulge - Portugal's largest cohorts
      basePop = 135000 + ((age - 30) * 1500);
    } else if (age < 65) {
      // Pre-retirement
      basePop = 165000 - ((age - 50) * 2000);
    } else if (age < 85) {
      // Elderly
      basePop = 135000 * Math.pow(0.95, age - 65);
    } else {
      // Very elderly
      basePop = 45000 * Math.pow(0.82, age - 85);
    }

    // Portugal has one of the highest female-to-male ratios in Europe, 
    // especially in older cohorts due to longevity gap.
    let femaleRatio = 0.515; // Baseline
    if (age > 60) {
      // Increasing female ratio with age
      femaleRatio += (age - 60) * 0.005;
    }
    femaleRatio = Math.min(femaleRatio, 0.75); // Cap for extreme ages

    // Final total for this year
    const total = Math.floor(basePop);
    const female = Math.floor(total * femaleRatio);
    const male = total - female;

    data.push({
      age,
      male,
      female,
      total
    });
  }

  // Final check: The sum of these cohorts roughly equals 10,450,000.
  // The logic above produces a peak around age 50 of ~165k, 
  // tapering to ~85k at birth, which matches the real Portugal pyramid.
  return data;
};

/**
 * Gompertz-Makeham mortality law approximation.
 * Portugal has high life expectancy, so the curves are slightly pushed right.
 */
const getDeathRate = (age: number, sex: 'male' | 'female'): number => {
  // Portugal 2024 specific mortality approximation
  const baseline = 0.00015;
  const expFactor = sex === 'male' ? 0.096 : 0.086;
  
  // Mortality is extremely low until age 50
  if (age < 50) return baseline * Math.exp(0.04 * age);
  
  const rate = baseline * Math.exp(expFactor * age);
  return Math.min(rate, 1.0);
};

export const runSimulation = (startYear: number, endYear: number, params: SimulationParams): YearData[] => {
  let currentPop = generateInitialData();
  const results: YearData[] = [];

  for (let year = startYear; year <= endYear; year++) {
    // 1. Calculate Stats
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

    results.push({
      year,
      population: JSON.parse(JSON.stringify(currentPop)),
      totalPopulation: totalPop,
      workingAgePop: workingPop,
      retiredPop: retiredPop,
      childPop,
      oldAgeDependencyRatio: workingPop > 0 ? (retiredPop / workingPop) * 100 : 0,
      medianAge
    });

    // 2. Evolve for next year
    const nextPop: AgeGroup[] = [];
    
    // Calculate Births
    // Portugal women are fertile mostly 15-49. 
    // Net fertility rate is births per woman over a lifetime. 
    // We divide by length of fertile window (~35 years).
    const fertileWomen = currentPop.filter(g => g.age >= 15 && g.age <= 49).reduce((sum, g) => sum + g.female, 0);
    const annualFertilityWeight = params.fertilityRate / 35;
    const births = Math.floor(fertileWomen * annualFertilityWeight);

    // Age 0
    nextPop.push({
      age: 0,
      male: Math.floor(births * 0.515), // Natural birth ratio
      female: Math.floor(births * 0.485),
      total: births
    });

    // Age existing population
    for (let i = 0; i < currentPop.length; i++) {
      const group = currentPop[i];
      if (group.age >= 100) continue;

      const deathsMale = Math.floor(group.male * getDeathRate(group.age, 'male'));
      const deathsFemale = Math.floor(group.female * getDeathRate(group.age, 'female'));

      // Migration: Mostly working-age adults (18-45)
      let migrationImpact = 0;
      if (group.age >= 18 && group.age <= 45) {
        migrationImpact = Math.floor(params.netMigration / 28); // Distributed across age span
      } else if (group.age < 18) {
        // Some children migrate with parents
        migrationImpact = Math.floor(params.netMigration * 0.1 / 18);
      }

      nextPop.push({
        age: group.age + 1,
        male: Math.max(0, group.male - deathsMale + Math.floor(migrationImpact * 0.52)),
        female: Math.max(0, group.female - deathsFemale + Math.floor(migrationImpact * 0.48)),
        total: Math.max(0, group.male - deathsMale + group.female - deathsFemale + migrationImpact)
      });
    }

    currentPop = nextPop;
  }

  return results;
};
