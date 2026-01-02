export interface AgeGroup {
  age: number;
  male: number;
  female: number;
  total: number;
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
}

export interface SimulationParams {
  retirementAge: number;
  fertilityRate: number; // Children per woman
  netMigration: number; // Net annual migration
}

export interface AIAnalysis {
  text: string;
  year: number;
}
