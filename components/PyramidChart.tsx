import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  ReferenceLine
} from 'recharts';
import { YearData } from '../types';

interface Props {
  data: YearData;
  retirementAge: number;
}

const PyramidChart: React.FC<Props> = ({ data, retirementAge }) => {
  // Transform data for pyramid: Male negative, Female positive
  const chartData = data.population.map((group) => ({
    age: group.age,
    male: -group.male, // Negative for left side
    female: group.female,
    maleRaw: group.male, // For tooltip
    isRetired: group.age >= retirementAge
  }));

  // Group by 5 years to make chart cleaner if needed, but per-year is fine for high detail
  // For better performance/visuals, let's filter to every 2nd year or just pass all if performant
  const displayData = chartData;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const m = Math.abs(payload[0].value);
      const f = payload[1].value;
      return (
        <div className="bg-slate-800 border border-slate-700 p-2 rounded shadow-xl text-xs">
          <p className="font-bold text-slate-200">Age: {label}</p>
          <p className="text-blue-400">Male: {m.toLocaleString()}</p>
          <p className="text-pink-400">Female: {f.toLocaleString()}</p>
          <p className="text-slate-400 mt-1">Status: {Number(label) >= retirementAge ? 'Retired' : 'Working'}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-full w-full flex flex-col">
      <h3 className="text-center text-slate-400 text-sm mb-2 font-semibold tracking-wider uppercase">
        Population Pyramid ({data.year})
      </h3>
      <div className="flex-grow min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={displayData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            barCategoryGap={0} // Make bars touch
            barGap={0}
          >
            <XAxis type="number" hide />
            <YAxis 
              dataKey="age" 
              type="category" 
              interval={4} // Show every 5th age label
              tick={{ fill: '#94a3b8', fontSize: 10 }} 
              width={30}
              reversed // Young at bottom
            />
            <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
            <ReferenceLine y={retirementAge} stroke="#fbbf24" strokeDasharray="3 3" label={{ position: 'right', value: 'Retirement', fill: '#fbbf24', fontSize: 10 }} />
            
            <Bar dataKey="male" name="Male" stackId="a">
              {displayData.map((entry, index) => (
                <Cell 
                  key={`cell-m-${index}`} 
                  fill={entry.isRetired ? '#60a5fa' : '#1e3a8a'} // Lighter blue for retired, dark for working
                  opacity={entry.isRetired ? 0.6 : 0.9}
                />
              ))}
            </Bar>
            <Bar dataKey="female" name="Female" stackId="a">
              {displayData.map((entry, index) => (
                <Cell 
                  key={`cell-f-${index}`} 
                  fill={entry.isRetired ? '#f472b6' : '#831843'} // Lighter pink for retired, dark for working
                  opacity={entry.isRetired ? 0.6 : 0.9}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-center gap-4 text-xs mt-2 text-slate-500">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-blue-900"></div> Working Male
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-blue-400 opacity-60"></div> Retired Male
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-pink-900"></div> Working Female
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-pink-400 opacity-60"></div> Retired Female
        </div>
      </div>
    </div>
  );
};

export default PyramidChart;
