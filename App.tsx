import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Settings, Play, Pause, RefreshCw, TrendingUp, Users, BrainCircuit } from 'lucide-react';
import { YearData, SimulationParams, ScenarioType, SCENARIO_PRESETS } from './types';
import { runSimulation } from './utils/simulation';
import { getDemographicAnalysis } from './services/gemini';
import PyramidChart from './components/PyramidChart';
import TrendChart from './components/TrendChart';
import EconomicMetrics from './components/EconomicMetrics';
import EconomicTrendChart, { EconomicChartType } from './components/EconomicTrendChart';

const START_YEAR = 2024;
const END_YEAR = 2100;

const App: React.FC = () => {
  // --- State ---
  const [currentYear, setCurrentYear] = useState(START_YEAR);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<ScenarioType>('medium');
  const [params, setParams] = useState<SimulationParams>({
    retirementAge: 66, // Portugal's current baseline is 66y 5m (2025), using 66 for slider
    fertilityRate: 1.40, // INE 2024: TFR decreased to 1.40 children per woman
    netMigration: 110000, // INE 2024: Net migration +109,909 people
    mortalityImprovement: { male: 0.010, female: 0.008 }, // Default medium scenario
    workforceEntryAgeShift: 0, // No shift from current patterns
    unemploymentAdjustment: 0, // Baseline unemployment levels
  });
  
  // Cache simulation results so scrubbing is instant
  const simulationData = useMemo(() => {
    return runSimulation(START_YEAR, END_YEAR, params);
  }, [params]);

  const currentData = simulationData.find(d => d.year === currentYear) || simulationData[0];

  // AI State
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Economic chart type state
  const [economicChartType, setEconomicChartType] = useState<EconomicChartType>('burden');

  // --- Handlers ---
  const togglePlay = () => setIsPlaying(!isPlaying);

  const reset = () => {
    setIsPlaying(false);
    setCurrentYear(START_YEAR);
    setSelectedScenario('medium');
    setParams({
      retirementAge: 66,
      fertilityRate: 1.40,
      netMigration: 110000,
      mortalityImprovement: { male: 0.010, female: 0.008 },
      workforceEntryAgeShift: 0,
      unemploymentAdjustment: 0,
    });
    setAiAnalysis(null);
  };

  // Handle scenario selection
  const handleScenarioChange = (scenario: ScenarioType) => {
    setSelectedScenario(scenario);
    if (scenario !== 'custom') {
      const preset = SCENARIO_PRESETS[scenario];
      setParams(prev => ({
        ...prev,
        fertilityRate: preset.params.fertilityRate,
        netMigration: preset.params.netMigration,
        mortalityImprovement: preset.params.mortalityImprovement,
        workforceEntryAgeShift: preset.params.workforceEntryAgeShift,
        unemploymentAdjustment: preset.params.unemploymentAdjustment,
      }));
    }
  };

  // Handle manual parameter change (auto-switches to custom)
  const handleParamChange = <K extends keyof SimulationParams>(key: K, value: SimulationParams[K]) => {
    setSelectedScenario('custom');
    setParams(prev => ({ ...prev, [key]: value }));
  };

  const handleAnalysis = useCallback(async () => {
    setIsAnalyzing(true);
    setAiAnalysis(null);
    const analysis = await getDemographicAnalysis(currentData, params);
    setAiAnalysis(analysis);
    setIsAnalyzing(false);
  }, [currentData, params]);

  // Animation Loop
  useEffect(() => {
    let interval: number;
    if (isPlaying) {
      interval = window.setInterval(() => {
        setCurrentYear(prev => {
          if (prev >= END_YEAR) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 200); // 200ms per year
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 md:p-8 flex flex-col">
      {/* Header */}
      <header className="mb-8 flex flex-col md:flex-row justify-between items-center border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent">
            Portugal 2100
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Demographic Impact Simulator
          </p>
        </div>
        <div className="flex items-center gap-4 mt-4 md:mt-0">
          <div className="text-right">
             <div className="text-xs text-slate-500 uppercase tracking-wider">Simulation Year</div>
             <div className="text-4xl font-mono font-bold text-white">{currentYear}</div>
          </div>
          <button 
            onClick={togglePlay}
            className={`p-3 rounded-full shadow-lg transition-all ${isPlaying ? 'bg-amber-500/20 text-amber-500 ring-2 ring-amber-500/50' : 'bg-emerald-500 text-slate-900 hover:bg-emerald-400'}`}
            title={isPlaying ? "Pause Simulation" : "Start Simulation"}
          >
            {isPlaying ? <Pause size={24} /> : <Play size={24} fill="currentColor" />}
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Controls & Key Metrics (3 cols) */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Controls Card */}
          <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-5 shadow-lg">
            <div className="flex items-center gap-2 mb-4 text-slate-200 font-semibold border-b border-slate-800 pb-2">
              <Settings size={18} className="text-emerald-400" /> Simulation Parameters
            </div>
            
            <div className="space-y-6">
              {/* Scenario Selection */}
              <div>
                <label className="text-xs text-slate-400 mb-2 block">Projection Scenario</label>
                <div className="grid grid-cols-4 gap-1">
                  {(['low', 'medium', 'high', 'custom'] as ScenarioType[]).map((scenario) => (
                    <button
                      key={scenario}
                      onClick={() => handleScenarioChange(scenario)}
                      className={`py-1.5 px-2 text-[10px] font-medium rounded-lg transition-all ${
                        selectedScenario === scenario
                          ? scenario === 'low' ? 'bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/50'
                          : scenario === 'medium' ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/50'
                          : scenario === 'high' ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/50'
                          : 'bg-purple-500/20 text-purple-400 ring-1 ring-purple-500/50'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      {scenario === 'custom' ? 'Custom' : scenario.charAt(0).toUpperCase() + scenario.slice(1)}
                    </button>
                  ))}
                </div>
                {selectedScenario !== 'custom' && (
                  <p className="text-[10px] text-slate-500 mt-2 italic">
                    {SCENARIO_PRESETS[selectedScenario].description}
                  </p>
                )}
              </div>

              {/* Year Slider */}
              <div>
                <label className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Timeline</span>
                  <span>{currentYear}</span>
                </label>
                <input
                  type="range"
                  min={START_YEAR}
                  max={END_YEAR}
                  value={currentYear}
                  onChange={(e) => {
                    setIsPlaying(false);
                    setCurrentYear(Number(e.target.value));
                  }}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              {/* Retirement Age - Always editable */}
              <div>
                <label className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Retirement Age</span>
                  <span className="text-amber-400 font-mono font-bold">{params.retirementAge}y</span>
                </label>
                <input
                  type="range"
                  min={60}
                  max={75}
                  value={params.retirementAge}
                  onChange={(e) => setParams({...params, retirementAge: Number(e.target.value)})}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>

              {/* Fertility Rate - Locked by scenario */}
              <div>
                <label className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Fertility Rate (TFR)</span>
                  <span className="text-pink-400 font-mono font-bold">{params.fertilityRate.toFixed(2)}</span>
                </label>
                <input
                  type="range"
                  min={0.8}
                  max={2.5}
                  step={0.01}
                  value={params.fertilityRate}
                  disabled={selectedScenario !== 'custom'}
                  onChange={(e) => handleParamChange('fertilityRate', Number(e.target.value))}
                  className={`w-full h-2 rounded-lg appearance-none cursor-pointer accent-pink-500 ${
                    selectedScenario !== 'custom' ? 'bg-slate-800 opacity-60' : 'bg-slate-700'
                  }`}
                />
                <p className="text-[10px] text-slate-500 mt-1 italic">
                  {selectedScenario !== 'custom' && <span className="text-amber-500/70">Scenario locked • </span>}
                  Replacement is 2.1
                </p>
              </div>

              {/* Net Migration - Locked by scenario */}
              <div>
                <label className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Annual Net Migration</span>
                  <span className="text-cyan-400 font-mono font-bold">{params.netMigration >= 0 ? '+' : ''}{params.netMigration.toLocaleString()}</span>
                </label>
                <input
                  type="range"
                  min={-10000}
                  max={150000}
                  step={1000}
                  value={params.netMigration}
                  disabled={selectedScenario !== 'custom'}
                  onChange={(e) => handleParamChange('netMigration', Number(e.target.value))}
                  className={`w-full h-2 rounded-lg appearance-none cursor-pointer accent-cyan-500 ${
                    selectedScenario !== 'custom' ? 'bg-slate-800 opacity-60' : 'bg-slate-700'
                  }`}
                />
                {selectedScenario !== 'custom' && (
                  <p className="text-[10px] text-amber-500/70 mt-1 italic">Scenario locked</p>
                )}
              </div>

              {/* Mortality Improvement - Locked by scenario */}
              <div>
                <label className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Mortality Improvement</span>
                  <span className="text-violet-400 font-mono font-bold">
                    {(params.mortalityImprovement.male * 100).toFixed(1)}%
                  </span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={2.0}
                  step={0.1}
                  value={params.mortalityImprovement.male * 100}
                  disabled={selectedScenario !== 'custom'}
                  onChange={(e) => {
                    const maleRate = Number(e.target.value) / 100;
                    const femaleRate = maleRate * 0.8;
                    handleParamChange('mortalityImprovement', { male: maleRate, female: femaleRate });
                  }}
                  className={`w-full h-2 rounded-lg appearance-none cursor-pointer accent-violet-500 ${
                    selectedScenario !== 'custom' ? 'bg-slate-800 opacity-60' : 'bg-slate-700'
                  }`}
                />
                <p className="text-[10px] text-slate-500 mt-1 italic">
                  {selectedScenario !== 'custom' && <span className="text-amber-500/70">Scenario locked • </span>}
                  Annual mortality rate reduction
                </p>
              </div>

              {/* Workforce Entry Age Shift - Locked by scenario */}
              <div>
                <label className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Workforce Entry Shift</span>
                  <span className="text-orange-400 font-mono font-bold">
                    {params.workforceEntryAgeShift >= 0 ? '+' : ''}{params.workforceEntryAgeShift}y
                  </span>
                </label>
                <input
                  type="range"
                  min={-3}
                  max={5}
                  step={1}
                  value={params.workforceEntryAgeShift}
                  disabled={selectedScenario !== 'custom'}
                  onChange={(e) => handleParamChange('workforceEntryAgeShift', Number(e.target.value))}
                  className={`w-full h-2 rounded-lg appearance-none cursor-pointer accent-orange-500 ${
                    selectedScenario !== 'custom' ? 'bg-slate-800 opacity-60' : 'bg-slate-700'
                  }`}
                />
                <p className="text-[10px] text-slate-500 mt-1 italic">
                  {selectedScenario !== 'custom' && <span className="text-amber-500/70">Scenario locked • </span>}
                  + = later entry (more education)
                </p>
              </div>

              {/* Unemployment Adjustment - Locked by scenario */}
              <div>
                <label className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Unemployment Adjust</span>
                  <span className={`font-mono font-bold ${params.unemploymentAdjustment > 0 ? 'text-rose-400' : params.unemploymentAdjustment < 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {params.unemploymentAdjustment >= 0 ? '+' : ''}{(params.unemploymentAdjustment * 100).toFixed(0)}%
                  </span>
                </label>
                <input
                  type="range"
                  min={-10}
                  max={15}
                  step={1}
                  value={params.unemploymentAdjustment * 100}
                  disabled={selectedScenario !== 'custom'}
                  onChange={(e) => handleParamChange('unemploymentAdjustment', Number(e.target.value) / 100)}
                  className={`w-full h-2 rounded-lg appearance-none cursor-pointer accent-rose-500 ${
                    selectedScenario !== 'custom' ? 'bg-slate-800 opacity-60' : 'bg-slate-700'
                  }`}
                />
                <p className="text-[10px] text-slate-500 mt-1 italic">
                  {selectedScenario !== 'custom' && <span className="text-amber-500/70">Scenario locked • </span>}
                  + = higher unemployment
                </p>
              </div>
            </div>

            <button 
              onClick={reset}
              className="mt-6 w-full flex items-center justify-center gap-2 text-xs py-2 border border-slate-700 rounded hover:bg-slate-800 text-slate-400 transition-colors"
            >
              <RefreshCw size={12} /> Reset to 2024 Defaults
            </button>
          </div>

        </div>

        {/* Center Column: Pyramid + Charts + AI (6 cols) */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800 rounded-xl p-4 shadow-lg relative overflow-hidden flex flex-col h-[400px]">
             <PyramidChart data={currentData} retirementAge={params.retirementAge} medianAge={currentData.medianAge} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg h-[200px]">
               <TrendChart fullHistory={simulationData} currentYear={currentYear} />
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg h-[200px]">
               <EconomicTrendChart
                 fullHistory={simulationData}
                 currentYear={currentYear}
                 chartType={economicChartType}
                 onChartTypeChange={setEconomicChartType}
               />
            </div>
          </div>

          {/* AI Analysis */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
            <div className="flex items-center gap-2 mb-3 text-purple-400 font-semibold border-b border-slate-800 pb-2">
              <BrainCircuit size={18} /> AI Policy Insight
            </div>

            <div className="bg-slate-950 rounded-lg p-4 border border-slate-800 text-sm text-slate-300 overflow-y-auto mb-3 h-[150px] scrollbar-thin scrollbar-thumb-slate-800">
              {isAnalyzing ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 opacity-50">
                  <div className="animate-spin h-6 w-6 border-2 border-purple-500 border-t-transparent rounded-full"></div>
                  <p className="text-xs">Consulting simulation model...</p>
                </div>
              ) : aiAnalysis ? (
                 <div className="prose prose-invert prose-sm leading-relaxed">
                    <p className="whitespace-pre-line text-slate-200">{aiAnalysis}</p>
                 </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-500 text-center p-4">
                  <BrainCircuit size={32} className="opacity-10" />
                  <p className="text-xs">How does {currentYear} look for the Portuguese state?</p>
                  <p className="text-[10px] opacity-60">Generate an AI assessment based on the current data visualization.</p>
                </div>
              )}
            </div>

            <button
              onClick={handleAnalysis}
              disabled={isAnalyzing}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg shadow-lg transition-all flex items-center justify-center gap-2 text-sm"
            >
              {isAnalyzing ? 'Thinking...' : `Analyze ${currentYear} Consequences`}
            </button>
          </div>
        </div>

        {/* Right Column: Metrics & Economic Indicators (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 gap-3">
             <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between shadow-md">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-tight">Dependency Ratio</p>
                  <p className={`text-xl font-bold ${currentData.oldAgeDependencyRatio > 55 ? 'text-rose-400' : 'text-slate-200'}`}>
                    {currentData.oldAgeDependencyRatio.toFixed(1)}%
                  </p>
                </div>
                <div className="h-8 w-8 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 border border-slate-700">
                  <TrendingUp size={16} />
                </div>
             </div>

             <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between shadow-md">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-tight">Total Population</p>
                  <p className="text-xl font-bold text-slate-200">
                    {(currentData.totalPopulation / 1000000).toFixed(2)}M
                  </p>
                </div>
                <div className="h-8 w-8 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 border border-slate-700">
                  <Users size={16} />
                </div>
             </div>

             <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between shadow-md">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-tight">Median Age</p>
                  <p className="text-xl font-bold text-slate-200">
                    {currentData.medianAge.toFixed(1)}y
                  </p>
                </div>
                <div className="h-8 w-8 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 border border-slate-700">
                  <span className="font-bold text-[10px] uppercase">Age</span>
                </div>
             </div>
          </div>

          {/* Economic Metrics */}
          <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-4 shadow-lg">
            <div className="flex items-center gap-2 mb-3 text-amber-400 font-semibold border-b border-slate-800 pb-2 text-sm">
              <TrendingUp size={16} /> Economic Indicators
            </div>
            <EconomicMetrics metrics={currentData.economic} />
          </div>
        </div>

      </main>

      <footer className="mt-8 text-center text-slate-600 text-[10px] flex items-center justify-center gap-4">
        <span>Data based on INE 2024 Estimates</span>
        <span className="w-1 h-1 bg-slate-800 rounded-full"></span>
        <span>Demographic Projection Model v2.0 (Scenarios)</span>
      </footer>
    </div>
  );
};

export default App;
