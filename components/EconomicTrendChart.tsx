import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { YearData } from '../types';

export type EconomicChartType = 'ssBalance' | 'burden' | 'sustainability';

interface Props {
  fullHistory: YearData[];
  currentYear: number;
  chartType: EconomicChartType;
  onChartTypeChange: (type: EconomicChartType) => void;
}

const EconomicTrendChart: React.FC<Props> = ({ fullHistory, currentYear, chartType, onChartTypeChange }) => {
  const chartData = fullHistory.map(d => ({
    year: d.year,
    ssBalance: d.economic.ssBalance / 1e9, // Convert to billions
    burden: d.economic.totalBurdenPerWorker,
    sustainability: d.economic.sustainabilityIndex,
  }));

  const getChartConfig = () => {
    switch (chartType) {
      case 'ssBalance':
        return {
          title: 'SS Balance',
          dataKey: 'ssBalance',
          formatter: (v: number) => `${v.toFixed(1)}B EUR`,
          stroke: '#fbbf24',
          showZeroLine: true,
          yDomain: undefined as [number, number] | undefined,
        };
      case 'burden':
        return {
          title: 'Burden/Worker',
          dataKey: 'burden',
          formatter: (v: number) => `${v.toLocaleString()} EUR`,
          stroke: '#f43f5e',
          showZeroLine: false,
          yDomain: undefined as [number, number] | undefined,
        };
      case 'sustainability':
        return {
          title: 'Sustainability',
          dataKey: 'sustainability',
          formatter: (v: number) => `${v.toFixed(0)}`,
          stroke: '#10b981',
          showZeroLine: false,
          yDomain: [0, 100] as [number, number],
        };
    }
  };

  const config = getChartConfig();

  return (
    <div className="h-full w-full flex flex-col">
      {/* Chart type toggle */}
      <div className="flex justify-center gap-1 mb-2">
        <button
          onClick={() => onChartTypeChange('ssBalance')}
          className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
            chartType === 'ssBalance'
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50'
              : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
          }`}
        >
          SS Balance
        </button>
        <button
          onClick={() => onChartTypeChange('burden')}
          className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
            chartType === 'burden'
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50'
              : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
          }`}
        >
          Burden
        </button>
        <button
          onClick={() => onChartTypeChange('sustainability')}
          className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
            chartType === 'sustainability'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
              : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
          }`}
        >
          Sustainability
        </button>
      </div>

      <h3 className="text-center text-slate-400 text-sm mb-2 font-semibold tracking-wider uppercase">
        {config.title} Evolution
      </h3>

      <div className="flex-grow min-h-[150px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
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
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default EconomicTrendChart;
