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
  totalSSContributions: number;      // 2024 EUR/year from workers
  totalPensionPayments: number;      // 2024 EUR/year to retirees
  ssBalance: number;                 // Contributions - Payments, 2024 EUR/year
  ssBalancePerWorker: number;        // 2024 EUR/year per worker

  // Healthcare
  totalHealthcareCost: number;       // 2024 EUR/year for population (public + private)
  publicHealthcareCost: number;      // 2024 EUR/year public share only (used in fiscal burden)
  healthcareCostPerWorker: number;   // 2024 EUR/year per worker (total)

  // Combined
  totalBurdenPerWorker: number;      // SS deficit + healthcare per worker, 2024 EUR/year
  sustainabilityIndex: number;       // 0-100 (100 = sustainable)
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
  fertilityRate: number; // Children per woman
  netMigration: number; // Long-run annual net migration after convergence
  initialNetMigration?: number; // Initial projection-year net migration, when different from long-run trend
  migrationConvergenceYear?: number; // Year when migration reaches the long-run annual level
  mortalityImprovement: MortalityImprovementRate; // Configurable mortality improvement rates
  // Economic parameters
  workforceEntryAgeShift: number; // Years to shift workforce entry (0=current, +2=2 years later due to more education)
  unemploymentAdjustment: number; // Adjustment factor (0=baseline, +0.05=5% higher unemployment, -0.03=3% lower)
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

// Demographic paths use the official EUROPOP2025 baseline and sensitivity
// assumptions. Economic controls remain transparent model assumptions.
export const SCENARIO_PRESETS: Record<Exclude<ScenarioType, 'custom'>, ScenarioDefinition> = {
  low: {
    name: 'Low',
    description: 'EUROPOP2025 lower fertility and migration paths; baseline mortality; +3% unemployment',
    params: {
      retirementAge: PORTUGAL_RETIREMENT_AGE_2026,
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
      unemploymentAdjustment: 0.03  // 3% higher unemployment (economic stagnation)
    }
  },
  medium: {
    name: 'Medium',
    description: 'EUROPOP2025 baseline fertility, mortality, and migration paths',
    params: {
      retirementAge: PORTUGAL_RETIREMENT_AGE_2026,
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
      unemploymentAdjustment: 0     // Current unemployment levels
    }
  },
  high: {
    name: 'High',
    description: 'EUROPOP2025 higher migration and lower mortality paths; baseline fertility; -2% unemployment',
    params: {
      retirementAge: PORTUGAL_RETIREMENT_AGE_2026,
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
      unemploymentAdjustment: -0.02 // 2% lower unemployment (economic growth)
    }
  }
};
