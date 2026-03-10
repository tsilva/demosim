import React from 'react';
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine
} from 'recharts';
import { YearData } from '../types';
import InfoTooltip from './InfoTooltip';
import useChartContainerReady from './useChartContainerReady';

interface Props {
  data: YearData;
  retirementAge: number;
  medianAge?: number;
}

const PyramidChart: React.FC<Props> = ({ data, retirementAge, medianAge }) => {
  const { containerRef, isReady } = useChartContainerReady();

  // Find max population for symmetric axis
  const maxPop = Math.max(...data.population.map(g => g.male + g.female)) / 2;

  // Transform data: split population in half for symmetric pyramid
  const chartData = data.population.map((group) => {
    const total = group.male + group.female;
    const half = total / 2;
    let status: 'child' | 'working' | 'retired';
    if (group.age < 15) {
      status = 'child';
    } else if (group.age >= retirementAge) {
      status = 'retired';
    } else {
      status = 'working';
    }
    return {
      age: group.age,
      left: -half,
      right: half,
      total,
      status
    };
  });

  const getBarColor = (status: string) => {
    switch (status) {
      case 'child': return '#06b6d4'; // cyan
      case 'working': return '#10b981'; // emerald
      case 'retired': return '#f43f5e'; // rose
      default: return '#64748b';
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const entry = payload[0].payload;
      const statusLabels: Record<string, string> = {
        child: 'Youth (0-14)',
        working: 'Working Age',
        retired: 'Retired'
      };
      return (
        <div className="bg-slate-800 border border-slate-700 p-2 rounded shadow-xl text-xs">
          <p className="font-bold text-slate-200">Age: {label}</p>
          <p className="text-slate-300">Population: {entry.total.toLocaleString()}</p>
          <p className="text-slate-400 mt-1">Status: {statusLabels[entry.status]}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex h-full w-full min-w-0 flex-col">
      <h3 className="mb-2 flex flex-wrap items-center justify-center gap-1 text-center text-xs font-semibold uppercase tracking-wider text-slate-400 sm:text-sm">
        Population by Age ({data.year})
        <InfoTooltip content="Age pyramid showing population distribution. Cyan = youth (0-14), Green = working age, Rose = retired. A healthy pyramid has a wide base; inverted pyramids indicate aging populations." />
      </h3>
      <div ref={containerRef} className="min-h-[300px] min-w-0 flex-grow">
        {isReady && (
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <ComposedChart
              layout="vertical"
              data={chartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              barCategoryGap={0}
            >
              <XAxis
                type="number"
                domain={[-maxPop * 1.1, maxPop * 1.1]}
                hide
              />
              <YAxis
                dataKey="age"
                type="category"
                interval={4}
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                width={30}
                reversed
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                allowEscapeViewBox={{ x: true, y: true }}
                wrapperStyle={{ zIndex: 20 }}
              />
              <ReferenceLine
                x={0}
                stroke="#475569"
                strokeWidth={1}
              />
              <ReferenceLine
                y={15}
                stroke="#06b6d4"
                strokeDasharray="3 3"
                label={{ position: 'right', value: 'Working Age', fill: '#06b6d4', fontSize: 9 }}
              />
              <ReferenceLine
                y={retirementAge}
                stroke="#fbbf24"
                strokeDasharray="3 3"
                label={{ position: 'right', value: 'Retirement', fill: '#fbbf24', fontSize: 9 }}
              />
              {medianAge !== undefined && (
                <ReferenceLine
                  y={Math.round(medianAge)}
                  stroke="#a78bfa"
                  strokeWidth={2}
                  label={{ position: 'left', value: `Median ${medianAge.toFixed(1)}`, fill: '#a78bfa', fontSize: 9 }}
                />
              )}
              <Bar dataKey="left" barSize={5}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-l-${index}`}
                    fill={getBarColor(entry.status)}
                  />
                ))}
              </Bar>
              <Bar dataKey="right" barSize={5}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-r-${index}`}
                    fill={getBarColor(entry.status)}
                  />
                ))}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-2 text-[11px] text-slate-500 sm:gap-x-6 sm:text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-cyan-500"></div> Youth (0-14)
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-emerald-500"></div> Working Age
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-rose-500"></div> Retired
        </div>
      </div>
    </div>
  );
};

export default PyramidChart;
