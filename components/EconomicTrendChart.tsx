import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine
} from 'recharts';
import { YearData } from '../types';
import InfoTooltip from './InfoTooltip';
import useChartContainerReady from './useChartContainerReady';

export type EconomicChartType = 'ssBalance' | 'burden' | 'spendingShare';

interface Props {
  fullHistory: YearData[];
  currentYear: number;
  chartType: EconomicChartType;
  onChartTypeChange: (type: EconomicChartType) => void;
}

const EconomicTrendChart: React.FC<Props> = ({ fullHistory, currentYear, chartType, onChartTypeChange }) => {
  const { containerRef, isReady, dimensions } = useChartContainerReady();

  const chartData = fullHistory.map(d => ({
    year: d.year,
    ssBalance: d.economic.ssBalance / 1e9, // Convert to billions
    burden: d.economic.ageRelatedSpendingPerWorker,
    spendingShare: d.economic.ageRelatedSpendingShareOfGdp,
  }));

  const getChartConfig = () => {
    switch (chartType) {
      case 'ssBalance':
        return {
          title: 'SS Balance',
          dataKey: 'ssBalance',
          formatter: (v: number) => `${v.toFixed(1)}B 2025 EUR`,
          stroke: '#fbbf24',
          showZeroLine: true,
          yDomain: undefined as [number, number] | undefined,
        };
      case 'burden':
        return {
          title: 'Pensions + Health / Worker',
          dataKey: 'burden',
          formatter: (v: number) => `${v.toLocaleString()} 2025 EUR`,
          stroke: '#f43f5e',
          showZeroLine: false,
          yDomain: undefined as [number, number] | undefined,
        };
      case 'spendingShare':
        return {
          title: 'Pensions + Health / GDP',
          dataKey: 'spendingShare',
          formatter: (v: number) => `${v.toFixed(1)}%`,
          stroke: '#06b6d4',
          showZeroLine: false,
          yDomain: undefined as [number, number] | undefined,
        };
    }
  };

  const config = getChartConfig();

  return (
    <div className="flex h-full w-full min-w-0 flex-col">
      {/* Chart type toggle */}
      <div className="mb-2 flex flex-wrap justify-center gap-1.5 sm:gap-1">
        <button
          onClick={() => onChartTypeChange('ssBalance')}
          className={`min-w-0 flex-1 rounded px-2 py-1 text-[11px] transition-colors sm:flex-none sm:py-0.5 sm:text-[10px] ${
            chartType === 'ssBalance'
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50'
              : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
          }`}
        >
          SS Balance
        </button>
        <button
          onClick={() => onChartTypeChange('burden')}
          className={`min-w-0 flex-1 rounded px-2 py-1 text-[11px] transition-colors sm:flex-none sm:py-0.5 sm:text-[10px] ${
            chartType === 'burden'
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50'
              : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
          }`}
        >
          Per Worker
        </button>
        <button
          onClick={() => onChartTypeChange('spendingShare')}
          className={`min-w-0 flex-1 rounded px-2 py-1 text-[11px] transition-colors sm:flex-none sm:py-0.5 sm:text-[10px] ${
            chartType === 'spendingShare'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
              : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
          }`}
        >
          % GDP
        </button>
      </div>

      <h2 className="mb-2 flex flex-wrap items-center justify-center gap-1 text-center text-xs font-semibold uppercase tracking-wider text-slate-400 sm:text-sm">
        {config.title} Evolution
        <InfoTooltip content={
          chartType === 'ssBalance'
            ? "Constant 2025 EUR. The opening Social Security balance matches CFP's 2025 execution; later values are model estimates that scale revenue with workforce/GDP and non-pension expenditure with population/productivity."
            : chartType === 'burden'
            ? "Constant 2025 EUR. Public pension expenditure plus public healthcare divided by the modeled employed workforce."
            : "Public pension expenditure plus public healthcare as a percentage of modeled GDP. No subjective threshold is imposed."
        } />
      </h2>

      <div ref={containerRef} className="min-h-0 min-w-0 flex-grow">
        {isReady && (
          <LineChart
            width={dimensions.width}
            height={dimensions.height}
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis
              dataKey="year"
              tick={{ fill: '#64748b', fontSize: 10 }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: '#64748b', fontSize: 10 }}
              domain={config.yDomain || ['auto', 'auto']}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#e2e8f0' }}
              itemStyle={{ color: config.stroke }}
              labelStyle={{ color: '#94a3b8' }}
              formatter={(value: number) => [config.formatter(value), config.title]}
            />
            <ReferenceLine x={currentYear} stroke="#fbbf24" strokeDasharray="3 3" />
            {config.showZeroLine && <ReferenceLine y={0} stroke="#ef4444" strokeWidth={2} />}
            <Line
              type="monotone"
              dataKey={config.dataKey}
              stroke={config.stroke}
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 6, fill: config.stroke }}
              isAnimationActive={false}
            />
          </LineChart>
        )}
      </div>
    </div>
  );
};

export default EconomicTrendChart;
