export interface AgeGroup {
  age: number;
  male: number;
  female: number;
  total: number;
}

export interface EconomicMetrics {
  // Employment
  actualWorkforce: number;           // People actually employed
  laborUtilizationRate: number;      // Total workers (incl. post-retirement) / working-age pop

  // Social Security
  totalSSContributions: number;      // Constant 2025 EUR/year
  publicPensionSpending: number;     // SS + CGA, constant 2025 EUR/year
  ssBalance: number;                 // Effective revenue - expenditure, constant 2025 EUR/year
  ssBalancePerWorker: number;        // Constant 2025 EUR/year per worker

  // Healthcare
  totalHealthcareCost: number;       // Public + private, constant 2025 EUR/year
  publicHealthcareCost: number;      // Constant 2025 EUR/year
  healthcareCostPerWorker: number;   // Constant 2025 EUR/year per worker

  // Public pensions + public healthcare
  ageRelatedSpendingPerWorker: number;
  ageRelatedSpendingShareOfGdp: number;
}

export interface YearData {
  year: number;
  population: AgeGroup[];
  totalPopulation: number;
  workingAgePop: number;
  retiredPop: number;
  childPop: number;
  oldAgeDependencyRatio: number; // Standard definition: age 65+ / age 15-64 * 100
  medianAge: number;
  assumptions: {
    fertilityRate: number;
    netMigration: number;
    retirementAge: number;
  };
  economic: EconomicMetrics;
}

// Scenario type for preset configurations
export type ScenarioType = 'low' | 'medium' | 'high' | 'custom';

// Mortality improvement rates by sex (annual rate of decrease in age-specific mortality)
export interface MortalityImprovementRate {
  male: number;   // Annual improvement rate (e.g., 0.01 for 1%)
  female: number; // Annual improvement rate (e.g., 0.008 for 0.8%)
}

export interface SimulationParams {
  retirementAge: number;
  retirementAgePath?: Array<{ year: number; value: number }>;
  fertilityRate: number; // Children per woman
  netMigration: number; // Long-run annual net migration after convergence
  initialNetMigration?: number; // Initial projection-year net migration, when different from long-run trend
  migrationConvergenceYear?: number; // Year when migration reaches the long-run annual level
  mortalityImprovement: MortalityImprovementRate; // Configurable mortality improvement rates
  // Economic parameters
  workforceEntryAgeShift: number; // Years to shift workforce entry (0=current, +2=2 years later due to more education)
  employmentRateAdjustment: number; // Proportional change (0=baseline, +0.05=5% lower employment)
  // Presets follow annual EUROPOP2025 assumptions. Manual edits remove this
  // profile and use the constant/custom controls above.
  projectionProfile?: import('./data/projectionAssumptions').ProjectionProfile;
}

// Scenario definition for presets
export interface ScenarioDefinition {
  name: string;
  description: string;
  params: SimulationParams;
}

const PORTUGAL_RETIREMENT_AGE_2026 = 66 + 9 / 12;
// 2026 and 2027 are enacted values. Later keyframes are the current-policy
// projection in Portugal's EC 2024 Ageing Report country fiche.
export const PORTUGAL_STATUTORY_RETIREMENT_AGE_PATH = [
  { year: 2026, value: PORTUGAL_RETIREMENT_AGE_2026 },
  { year: 2027, value: 66 + 11 / 12 },
  { year: 2030, value: 66 + 11 / 12 },
  { year: 2040, value: 67 + 6 / 12 },
  { year: 2050, value: 68 + 1 / 12 },
  { year: 2060, value: 68 + 7 / 12 },
  { year: 2070, value: 69 + 2 / 12 },
  { year: 2100, value: 69 + 2 / 12 },
];

// Demographic paths use the official EUROPOP2025 baseline and sensitivity
// assumptions. Economic controls remain transparent model assumptions.
export const SCENARIO_PRESETS: Record<Exclude<ScenarioType, 'custom'>, ScenarioDefinition> = {
  low: {
    name: 'Low',
    description: 'EUROPOP2025 lower fertility and migration paths; baseline mortality; 3% lower employment rates',
    params: {
      retirementAge: PORTUGAL_RETIREMENT_AGE_2026,
      retirementAgePath: PORTUGAL_STATUTORY_RETIREMENT_AGE_PATH,
      fertilityRate: 1.46506,
      initialNetMigration: 87506,
      netMigration: 22305,
      migrationConvergenceYear: 2100,
      mortalityImprovement: { male: 0.005, female: 0.004 },
      projectionProfile: {
        fertility: 'lower',
        mortality: 'baseline',
        migration: 'lower',
      },
      workforceEntryAgeShift: 1,    // People enter workforce 1 year later (more education/fewer jobs)
      employmentRateAdjustment: 0.03  // Employment rates 3% below the 2025 age profile
    }
  },
  medium: {
    name: 'Medium',
    description: 'EUROPOP2025 baseline fertility, mortality, and migration paths',
    params: {
      retirementAge: PORTUGAL_RETIREMENT_AGE_2026,
      retirementAgePath: PORTUGAL_STATUTORY_RETIREMENT_AGE_PATH,
      fertilityRate: 1.46506,
      initialNetMigration: 132517,
      netMigration: 35716,
      migrationConvergenceYear: 2100,
      mortalityImprovement: { male: 0.010, female: 0.008 },
      projectionProfile: {
        fertility: 'baseline',
        mortality: 'baseline',
        migration: 'baseline',
      },
      workforceEntryAgeShift: 0,    // Current workforce entry patterns
      employmentRateAdjustment: 0     // 2025 age-specific employment rates
    }
  },
  high: {
    name: 'High',
    description: 'EUROPOP2025 higher migration and lower mortality paths; baseline fertility; 2% higher employment rates',
    params: {
      retirementAge: PORTUGAL_RETIREMENT_AGE_2026,
      retirementAgePath: PORTUGAL_STATUTORY_RETIREMENT_AGE_PATH,
      fertilityRate: 1.46506,
      initialNetMigration: 178171,
      netMigration: 49169,
      migrationConvergenceYear: 2100,
      mortalityImprovement: { male: 0.015, female: 0.012 },
      projectionProfile: {
        fertility: 'baseline',
        mortality: 'lower',
        migration: 'higher',
      },
      workforceEntryAgeShift: -1,   // Earlier workforce entry (better vocational training)
      employmentRateAdjustment: -0.02 // Employment rates 2% above the 2025 age profile
    }
  }
};
