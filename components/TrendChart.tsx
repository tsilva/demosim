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

interface Props {
  fullHistory: YearData[];
  currentYear: number;
}

const TrendChart: React.FC<Props> = ({ fullHistory, currentYear }) => {
  const { containerRef, isReady, dimensions } = useChartContainerReady();

  return (
    <div className="flex h-full w-full min-w-0 flex-col">
       <h2 className="mb-2 flex flex-wrap items-center justify-center gap-1 text-center text-xs font-semibold uppercase tracking-wider text-slate-400 sm:text-sm">
        Dependency Ratio Evolution
        <InfoTooltip content="Old-age dependency ratio over time: retirees per 100 working-age people. Higher values mean more strain on social security as fewer workers support more pensioners." />
      </h2>
      <div ref={containerRef} className="min-h-0 min-w-0 flex-grow">
        {isReady && (
          <LineChart
            width={dimensions.width}
            height={dimensions.height}
            data={fullHistory}
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
              domain={['auto', 'auto']}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#e2e8f0' }}
              itemStyle={{ color: '#fbbf24' }}
              labelStyle={{ color: '#94a3b8' }}
              formatter={(value: number) => [`${value.toFixed(1)}%`, 'Ratio']}
            />
            <ReferenceLine x={currentYear} stroke="#fbbf24" strokeDasharray="3 3" />
            <Line
              type="monotone"
              dataKey="oldAgeDependencyRatio"
              stroke="#fbbf24"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 6, fill: '#fbbf24' }}
              isAnimationActive={false}
            />
          </LineChart>
        )}
      </div>
      <p className="mt-2 text-center text-[11px] text-slate-500 sm:text-xs">
        % of Retirees per Working Age Person
      </p>
    </div>
  );
};

export default TrendChart;
