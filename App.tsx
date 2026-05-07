'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Settings, Play, Pause, RefreshCw, TrendingUp, Users, Github } from 'lucide-react';
import { YearData, SimulationParams, ScenarioType, SCENARIO_PRESETS } from './types';
import { runSimulation } from './utils/simulation';
import { initGoogleAnalytics, trackEvent, trackPageView } from './utils/analytics';
import PyramidChart from './components/PyramidChart';
import type { EconomicChartType } from './components/EconomicTrendChart';
import InfoTooltip from './components/InfoTooltip';

const EconomicMetrics = dynamic(() => import('./components/EconomicMetrics'), { ssr: false });
const TrendChart = dynamic(() => import('./components/TrendChart'), { ssr: false });
const EconomicTrendChart = dynamic(() => import('./components/EconomicTrendChart'), { ssr: false });
const AboutPanel = dynamic(() => import('./components/AboutPanel'), { ssr: false });

const START_YEAR = 2024;
const END_YEAR = 2100;
const DEFAULT_SCENARIO: ScenarioType = 'medium';
let hasTrackedInitialPageView = false;

const formatRetirementAge = (age: number): string => {
  const years = Math.floor(age);
  const months = Math.round((age - years) * 12);

  if (months === 0) {
    return `${years}y`;
  }

  if (months === 12) {
    return `${years + 1}y`;
  }

  return `${years}y ${months}m`;
};

const cloneParams = (source: SimulationParams): SimulationParams => ({
  ...source,
  mortalityImprovement: { ...source.mortalityImprovement },
});

const App: React.FC = () => {
  // --- State ---
  const [currentYear, setCurrentYear] = useState(START_YEAR);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<ScenarioType>(DEFAULT_SCENARIO);
  const [params, setParams] = useState<SimulationParams>(() => cloneParams(SCENARIO_PRESETS[DEFAULT_SCENARIO].params));
  const [showAdvancedControls, setShowAdvancedControls] = useState(false);
  const trendChartsRef = useRef<HTMLDivElement | null>(null);
  const secondaryContentRef = useRef<HTMLDivElement | null>(null);
  const [shouldRenderTrendCharts, setShouldRenderTrendCharts] = useState(false);
  const [shouldRenderSecondaryContent, setShouldRenderSecondaryContent] = useState(false);
  
  const initialSimulationData = useMemo(() => {
    return runSimulation(START_YEAR, START_YEAR, params);
  }, [params]);

  const needsFullSimulation = shouldRenderTrendCharts || currentYear !== START_YEAR || isPlaying;

  // Cache full simulation results only when controls or visible charts need the full history.
  const simulationData = useMemo(() => {
    if (!needsFullSimulation) {
      return initialSimulationData;
    }

    return runSimulation(START_YEAR, END_YEAR, params);
  }, [initialSimulationData, needsFullSimulation, params]);

  const currentData = simulationData.find(d => d.year === currentYear) || simulationData[0];
  const isCustomScenario = selectedScenario === 'custom';

  // Economic chart type state
  const [economicChartType, setEconomicChartType] = useState<EconomicChartType>('burden');

  // --- Handlers ---
  const togglePlay = () => {
    setIsPlaying((previousState) => {
      const nextState = !previousState;
      trackEvent(nextState ? 'simulation_play' : 'simulation_pause', {
        current_year: currentYear,
        scenario: selectedScenario,
      });
      return nextState;
    });
  };

  const reset = () => {
    trackEvent('simulation_reset', {
      current_year: currentYear,
      scenario: selectedScenario,
    });
    setIsPlaying(false);
    setCurrentYear(START_YEAR);
    setSelectedScenario(DEFAULT_SCENARIO);
    setParams(cloneParams(SCENARIO_PRESETS[DEFAULT_SCENARIO].params));
    setShowAdvancedControls(false);
  };

  // Handle scenario selection
  const handleScenarioChange = (scenario: ScenarioType) => {
    if (scenario !== selectedScenario) {
      trackEvent('scenario_change', { scenario });
    }

    setSelectedScenario(scenario);
    if (scenario !== 'custom') {
      setParams(cloneParams(SCENARIO_PRESETS[scenario].params));
    }
  };

  // Handle manual parameter change (auto-switches to custom)
  const handleParamChange = <K extends keyof SimulationParams>(key: K, value: SimulationParams[K]) => {
    setSelectedScenario('custom');
    setParams(prev => ({ ...prev, [key]: value }));
  };

  // Animation Loop
  useEffect(() => {
    initGoogleAnalytics();

    if (hasTrackedInitialPageView) {
      return;
    }

    trackPageView();
    hasTrackedInitialPageView = true;
  }, []);

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

  useEffect(() => {
    const element = trendChartsRef.current;
    if (!element) {
      return;
    }

    if (!('IntersectionObserver' in window)) {
      setShouldRenderTrendCharts(true);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setShouldRenderTrendCharts(true);
        observer.disconnect();
      }
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const element = secondaryContentRef.current;
    if (!element) {
      return;
    }

    if (!('IntersectionObserver' in window)) {
      setShouldRenderSecondaryContent(true);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setShouldRenderSecondaryContent(true);
        observer.disconnect();
      }
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-slate-950 p-3 font-sans text-slate-100 sm:p-4 md:p-8">
      <a
        href="https://github.com/tsilva/demosim"
        target="_blank"
        rel="noreferrer"
        aria-label="View source on GitHub"
        className="absolute right-3 top-3 z-10 rounded-full border border-slate-800 bg-slate-900/80 p-2 text-slate-300 backdrop-blur-sm transition-colors hover:border-emerald-400/50 hover:text-white sm:right-4 sm:top-4 md:right-8 md:top-8"
      >
        <Github size={20} />
      </a>

      {/* Header */}
      <header className="mb-6 flex flex-col gap-4 border-b border-slate-800 pb-4 pr-14 sm:mb-8 sm:gap-6 sm:pr-20 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="bg-gradient-to-r from-emerald-400 to-cyan-500 bg-clip-text text-2xl font-bold text-transparent sm:text-3xl">
            Portugal 2100
          </h1>
          <p className="mt-1 text-xs text-slate-400 sm:text-sm">
            Demographic Impact Simulator
          </p>
        </div>
        <div className="flex w-full items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2.5 shadow-lg backdrop-blur-sm sm:px-4 sm:py-3 lg:w-auto lg:min-w-[240px]">
          <button 
            onClick={togglePlay}
            className={`rounded-full p-2.5 shadow-lg transition-all sm:p-3 ${isPlaying ? 'bg-amber-500/20 text-amber-500 ring-2 ring-amber-500/50' : 'bg-emerald-500 text-slate-900 hover:bg-emerald-400'}`}
            title={isPlaying ? "Pause Simulation" : "Start Simulation"}
          >
            {isPlaying ? <Pause size={24} /> : <Play size={24} fill="currentColor" />}
          </button>
          <div className="text-right">
             <div className="text-xs text-slate-500 uppercase tracking-wider">Simulation Year</div>
             <div className="text-3xl font-mono font-bold text-white sm:text-4xl">{currentYear}</div>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="grid flex-grow grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-12">
        
        {/* Left Column: Controls & Key Metrics (3 cols) */}
        <div className="order-1 space-y-4 sm:space-y-6 lg:order-1 lg:col-span-3">
          
          {/* Controls Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-lg backdrop-blur-sm sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2 font-semibold text-slate-200">
                <Settings size={18} className="text-emerald-400" /> Simulation Parameters
              </div>
              <span className={`rounded-full px-2 py-1 text-[10px] font-medium uppercase tracking-[0.18em] ${isCustomScenario ? 'bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/40' : 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/40'}`}>
                {isCustomScenario ? 'Custom' : 'Preset'}
              </span>
            </div>
            
            <div className="space-y-5">
              {/* Scenario Selection */}
              <div>
                <label className="text-xs text-slate-400 mb-2 block">Projection Scenario</label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-1">
                  {(['low', 'medium', 'high', 'custom'] as ScenarioType[]).map((scenario) => (
                    <button
                      key={scenario}
                      onClick={() => handleScenarioChange(scenario)}
                      className={`rounded-lg px-2 py-2 text-xs font-medium transition-all sm:py-1.5 sm:text-[10px] ${
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
                  <p
                    className="text-[10px] text-slate-500 mt-2 italic"
                    dangerouslySetInnerHTML={{ __html: SCENARIO_PRESETS[selectedScenario].description }}
                  />
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
                {/* Year Slider */}
                <div>
                  <label className="mb-1 flex justify-between text-xs text-slate-400">
                    <span>Timeline</span>
                    <span>{currentYear}</span>
                  </label>
                  <input
                    type="range"
                    aria-label="Timeline year"
                    min={START_YEAR}
                    max={END_YEAR}
                    value={currentYear}
                    onChange={(e) => {
                      setIsPlaying(false);
                      setCurrentYear(Number(e.target.value));
                    }}
                    className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-700 accent-emerald-500"
                  />
                </div>

                {/* Retirement Age */}
                <div>
                  <label className="mb-1 flex justify-between text-xs text-slate-400">
                    <span>Retirement Age</span>
                    <span className="font-mono font-bold text-amber-400">{formatRetirementAge(params.retirementAge)}</span>
                  </label>
                  <input
                    type="range"
                    aria-label="Retirement age"
                    min={60}
                    max={75}
                    step={1 / 12}
                    value={params.retirementAge}
                    onChange={(e) => handleParamChange('retirementAge', Number(e.target.value))}
                    className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-700 accent-amber-500"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 md:hidden">
                <button
                  type="button"
                  onClick={() => {
                    const nextState = !showAdvancedControls;
                    setShowAdvancedControls(nextState);
                    trackEvent('advanced_controls_toggle', { expanded: nextState });
                  }}
                  className="flex w-full items-center justify-between text-left"
                  aria-expanded={showAdvancedControls}
                  aria-controls="advanced-controls"
                >
                  <div>
                    <p className="text-xs font-medium text-slate-200">Advanced demographic inputs</p>
                    <p className="mt-1 text-[10px] text-slate-500">
                      Fertility, migration, mortality, workforce entry and unemployment.
                    </p>
                  </div>
                  <span className="text-xs font-medium text-emerald-400">
                    {showAdvancedControls ? 'Hide' : 'Show'}
                  </span>
                </button>
              </div>

              <div id="advanced-controls" className={`${showAdvancedControls ? 'block' : 'hidden'} space-y-5 md:block`}>
                {/* Fertility Rate - Locked by scenario */}
                <div>
                  <label className="flex justify-between text-xs text-slate-400 mb-1">
                    <span className="flex items-center">
                      Fertility Rate (TFR)
                      <InfoTooltip content="Average children per woman. 2.1 is replacement level needed to maintain population without migration." />
                    </span>
                    <span className="text-pink-400 font-mono font-bold">{params.fertilityRate.toFixed(2)}</span>
                  </label>
                  <input
                    type="range"
                    aria-label="Fertility rate"
                    min={0.8}
                    max={2.5}
                    step={0.01}
                    value={params.fertilityRate}
                    disabled={!isCustomScenario}
                    onChange={(e) => handleParamChange('fertilityRate', Number(e.target.value))}
                    className={`w-full h-2 rounded-lg appearance-none cursor-pointer accent-pink-500 ${
                      !isCustomScenario ? 'bg-slate-800 opacity-60' : 'bg-slate-700'
                    }`}
                  />
                  <p className="text-[10px] text-slate-500 mt-1 italic">
                    {!isCustomScenario && <span className="text-amber-500/70">Scenario locked • </span>}
                    Replacement is 2.1
                  </p>
                </div>

                {/* Net Migration - Locked by scenario */}
                <div>
                  <label className="flex justify-between text-xs text-slate-400 mb-1">
                    <span className="flex items-center">
                      Annual Net Migration
                      <InfoTooltip content="Annual immigrants minus emigrants. Positive values add to population, typically younger working-age adults." />
                    </span>
                    <span className="text-cyan-400 font-mono font-bold">{params.netMigration >= 0 ? '+' : ''}{params.netMigration.toLocaleString()}</span>
                  </label>
                  <input
                    type="range"
                    aria-label="Annual net migration"
                    min={-10000}
                    max={150000}
                    step={1000}
                    value={params.netMigration}
                    disabled={!isCustomScenario}
                    onChange={(e) => handleParamChange('netMigration', Number(e.target.value))}
                    className={`w-full h-2 rounded-lg appearance-none cursor-pointer accent-cyan-500 ${
                      !isCustomScenario ? 'bg-slate-800 opacity-60' : 'bg-slate-700'
                    }`}
                  />
                  {!isCustomScenario && (
                    <p className="text-[10px] text-amber-500/70 mt-1 italic">Scenario locked</p>
                  )}
                </div>

                {/* Mortality Improvement - Locked by scenario */}
                <div>
                  <label className="flex justify-between text-xs text-slate-400 mb-1">
                    <span className="flex items-center">
                      Mortality Improvement
                      <InfoTooltip content="Annual % reduction in death rates. Higher values mean people live longer, increasing elderly population." />
                    </span>
                    <span className="text-violet-400 font-mono font-bold">
                      {(params.mortalityImprovement.male * 100).toFixed(1)}%
                    </span>
                  </label>
                  <input
                    type="range"
                    aria-label="Mortality improvement"
                    min={0}
                    max={2.0}
                    step={0.1}
                    value={params.mortalityImprovement.male * 100}
                    disabled={!isCustomScenario}
                    onChange={(e) => {
                      const maleRate = Number(e.target.value) / 100;
                      const femaleRate = maleRate * 0.8;
                      handleParamChange('mortalityImprovement', { male: maleRate, female: femaleRate });
                    }}
                    className={`w-full h-2 rounded-lg appearance-none cursor-pointer accent-violet-500 ${
                      !isCustomScenario ? 'bg-slate-800 opacity-60' : 'bg-slate-700'
                    }`}
                  />
                  <p className="text-[10px] text-slate-500 mt-1 italic">
                    {!isCustomScenario && <span className="text-amber-500/70">Scenario locked • </span>}
                    Annual mortality rate reduction
                  </p>
                </div>

                {/* Workforce Entry Age Shift - Locked by scenario */}
                <div>
                  <label className="flex justify-between text-xs text-slate-400 mb-1">
                    <span className="flex items-center">
                      Workforce Entry Shift
                      <InfoTooltip content="Age shift for entering the workforce. Positive values = later entry (more education), reducing working years." />
                    </span>
                    <span className="text-orange-400 font-mono font-bold">
                      {params.workforceEntryAgeShift >= 0 ? '+' : ''}{params.workforceEntryAgeShift}y
                    </span>
                  </label>
                  <input
                    type="range"
                    aria-label="Workforce entry shift"
                    min={-3}
                    max={5}
                    step={1}
                    value={params.workforceEntryAgeShift}
                    disabled={!isCustomScenario}
                    onChange={(e) => handleParamChange('workforceEntryAgeShift', Number(e.target.value))}
                    className={`w-full h-2 rounded-lg appearance-none cursor-pointer accent-orange-500 ${
                      !isCustomScenario ? 'bg-slate-800 opacity-60' : 'bg-slate-700'
                    }`}
                  />
                  <p className="text-[10px] text-slate-500 mt-1 italic">
                    {!isCustomScenario && <span className="text-amber-500/70">Scenario locked • </span>}
                    + = later entry (more education)
                  </p>
                </div>

                {/* Unemployment Adjustment - Locked by scenario */}
                <div>
                  <label className="flex justify-between text-xs text-slate-400 mb-1">
                    <span className="flex items-center">
                      Unemployment Adjust
                      <InfoTooltip content="Change from baseline unemployment rate. Positive = higher unemployment, fewer workers contributing to social security." />
                    </span>
                    <span className={`font-mono font-bold ${params.unemploymentAdjustment > 0 ? 'text-rose-400' : params.unemploymentAdjustment < 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {params.unemploymentAdjustment >= 0 ? '+' : ''}{(params.unemploymentAdjustment * 100).toFixed(0)}%
                    </span>
                  </label>
                  <input
                    type="range"
                    aria-label="Unemployment adjustment"
                    min={-10}
                    max={15}
                    step={1}
                    value={params.unemploymentAdjustment * 100}
                    disabled={!isCustomScenario}
                    onChange={(e) => handleParamChange('unemploymentAdjustment', Number(e.target.value) / 100)}
                    className={`w-full h-2 rounded-lg appearance-none cursor-pointer accent-rose-500 ${
                      !isCustomScenario ? 'bg-slate-800 opacity-60' : 'bg-slate-700'
                    }`}
                  />
                  <p className="text-[10px] text-slate-500 mt-1 italic">
                    {!isCustomScenario && <span className="text-amber-500/70">Scenario locked • </span>}
                    + = higher unemployment
                  </p>
                </div>
              </div>
            </div>

            <button 
              onClick={reset}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded border border-slate-700 py-2 text-xs text-slate-400 transition-colors hover:bg-slate-800"
            >
              <RefreshCw size={12} /> Reset to 2024 Defaults
            </button>
          </div>

        </div>

        {/* Center Column: Pyramid + Charts (6 cols) */}
        <div className="order-2 flex min-w-0 flex-col gap-4 lg:order-2 lg:col-span-6">
          <div className="relative flex h-[320px] min-w-0 flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40 p-3 shadow-lg backdrop-blur-sm sm:h-[400px] sm:overflow-visible sm:p-4 md:h-[420px]">
             <PyramidChart data={currentData} retirementAge={params.retirementAge} medianAge={currentData.medianAge} />
          </div>

          <div ref={trendChartsRef} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="h-[220px] min-w-0 rounded-xl border border-slate-800 bg-slate-900 p-3 shadow-lg sm:h-[250px] sm:p-4 xl:h-[200px]">
               {shouldRenderTrendCharts && (
                 <TrendChart fullHistory={simulationData} currentYear={currentYear} />
               )}
            </div>
            <div className="h-[230px] min-w-0 rounded-xl border border-slate-800 bg-slate-900 p-3 shadow-lg sm:h-[260px] sm:p-4 xl:h-[200px]">
               {shouldRenderTrendCharts && (
                 <EconomicTrendChart
                   fullHistory={simulationData}
                   currentYear={currentYear}
                   chartType={economicChartType}
                   onChartTypeChange={setEconomicChartType}
                 />
               )}
            </div>
          </div>

        </div>

        {/* Right Column: Metrics & Economic Indicators (3 cols) */}
        <div ref={secondaryContentRef} className="order-3 min-h-[620px] space-y-4 lg:order-3 lg:col-span-3">
          {shouldRenderSecondaryContent && (
            <>
              {/* Key Metrics Cards */}
              <div className="grid grid-cols-3 gap-3 lg:grid-cols-1">
                 <div className="flex min-h-[112px] flex-col justify-between rounded-xl border border-slate-800 bg-slate-900 p-3 shadow-md lg:min-h-0 lg:flex-row lg:items-center lg:p-4">
                    <div>
                      <p className="flex items-center text-[9px] uppercase tracking-tight text-slate-500 lg:text-[10px]">
                        Dependency Ratio
                        <InfoTooltip content="Retirees per 100 working-age adults. Above 55% means serious strain on the social security system." />
                      </p>
                      <p className={`mt-1 text-lg font-bold lg:text-xl ${currentData.oldAgeDependencyRatio > 55 ? 'text-rose-400' : 'text-slate-200'}`}>
                        {currentData.oldAgeDependencyRatio.toFixed(1)}%
                      </p>
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center self-end rounded-full border border-slate-700 bg-slate-800 text-slate-400 lg:self-auto">
                      <TrendingUp size={16} />
                    </div>
                 </div>

                 <div className="flex min-h-[112px] flex-col justify-between rounded-xl border border-slate-800 bg-slate-900 p-3 shadow-md lg:min-h-0 lg:flex-row lg:items-center lg:p-4">
                    <div>
                      <p className="text-[9px] uppercase tracking-tight text-slate-500 lg:text-[10px]">Total Population</p>
                      <p className="mt-1 text-lg font-bold text-slate-200 lg:text-xl">
                        {(currentData.totalPopulation / 1000000).toFixed(2)}M
                      </p>
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center self-end rounded-full border border-slate-700 bg-slate-800 text-slate-400 lg:self-auto">
                      <Users size={16} />
                    </div>
                 </div>

                 <div className="flex min-h-[112px] flex-col justify-between rounded-xl border border-slate-800 bg-slate-900 p-3 shadow-md lg:min-h-0 lg:flex-row lg:items-center lg:p-4">
                    <div>
                      <p className="text-[9px] uppercase tracking-tight text-slate-500 lg:text-[10px]">Median Age</p>
                      <p className="mt-1 text-lg font-bold text-slate-200 lg:text-xl">
                        {currentData.medianAge.toFixed(1)}y
                      </p>
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center self-end rounded-full border border-slate-700 bg-slate-800 text-slate-400 lg:self-auto">
                      <span className="font-bold text-[10px] uppercase">Age</span>
                    </div>
                 </div>
              </div>

              {/* Economic Metrics */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-lg backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-3 text-amber-400 font-semibold border-b border-slate-800 pb-2 text-sm">
                  <TrendingUp size={16} /> Economic Indicators
                </div>
                <EconomicMetrics metrics={currentData.economic} />
              </div>
            </>
          )}
        </div>

      </main>

      <footer className="mt-6 sm:mt-8">
        <AboutPanel />
        <div className="mt-4 flex flex-col items-center justify-center gap-2 text-center text-[10px] text-slate-600 sm:flex-row sm:gap-4">
          <span>Data based on Eurostat 2024 official statistics</span>
          <span className="hidden h-1 w-1 rounded-full bg-slate-800 sm:block"></span>
          <span>Demographic Projection Model v2.0</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
