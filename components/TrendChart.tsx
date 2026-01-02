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

interface Props {
  fullHistory: YearData[];
  currentYear: number;
}

const TrendChart: React.FC<Props> = ({ fullHistory, currentYear }) => {
  return (
    <div className="h-full w-full flex flex-col">
       <h3 className="text-center text-slate-400 text-sm mb-2 font-semibold tracking-wider uppercase">
        Dependency Ratio Evolution
      </h3>
      <div className="flex-grow min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
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
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-center text-xs text-slate-500 mt-2">
        % of Retirees per Working Age Person
      </p>
    </div>
  );
};

export default TrendChart;
