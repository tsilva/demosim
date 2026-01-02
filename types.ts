export interface AgeGroup {
  age: number;
  male: number;
  female: number;
  total: number;
}

export interface EconomicMetrics {
  // Employment
  actualWorkforce: number;           // People actually employed
  employmentRate: number;            // Workforce / working-age pop

  // Social Security
  totalSSContributions: number;      // EUR/year from workers
  totalPensionPayments: number;      // EUR/year to retirees
  ssBalance: number;                 // Contributions - Payments
  ssBalancePerWorker: number;        // EUR/year per worker

  // Healthcare
  totalHealthcareCost: number;       // EUR/year for population
  healthcareCostPerWorker: number;   // EUR/year per worker

  // Combined
  totalBurdenPerWorker: number;      // SS deficit + healthcare per worker
  sustainabilityIndex: number;       // 0-100 (100 = sustainable)
}

export interface YearData {
  year: number;
  population: AgeGroup[];
  totalPopulation: number;
  workingAgePop: number;
  retiredPop: number;
  childPop: number;
  oldAgeDependencyRatio: number; // (Retired / Working) * 100
  medianAge: number;
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
  netMigration: number; // Net annual migration
  mortalityImprovement: MortalityImprovementRate; // Configurable mortality improvement rates
}

// Scenario definition for presets
export interface ScenarioDefinition {
  name: string;
  description: string;
  params: Omit<SimulationParams, 'retirementAge'>; // Retirement age stays user-controlled
}

// Scenario presets based on Eurostat EUROPOP2023, UN WPP 2024, and INE Portugal methodologies
export const SCENARIO_PRESETS: Record<Exclude<ScenarioType, 'custom'>, ScenarioDefinition> = {
  low: {
    name: 'Low',
    description: 'Pessimistic: Lower fertility, reduced migration, slower mortality improvement',
    params: {
      fertilityRate: 1.20,
      netMigration: 50000,
      mortalityImprovement: { male: 0.005, female: 0.004 }
    }
  },
  medium: {
    name: 'Medium',
    description: 'Baseline: Current trends continue (INE 2024)',
    params: {
      fertilityRate: 1.40,
      netMigration: 110000,
      mortalityImprovement: { male: 0.010, female: 0.008 }
    }
  },
  high: {
    name: 'High',
    description: 'Optimistic: Higher fertility, strong migration, faster mortality improvement',
    params: {
      fertilityRate: 1.77,
      netMigration: 150000,
      mortalityImprovement: { male: 0.015, female: 0.012 }
    }
  }
};

export interface AIAnalysis {
  text: string;
  year: number;
}
