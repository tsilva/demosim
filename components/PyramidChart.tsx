import React, { useMemo, useState } from 'react';
import { YearData } from '../types';
import InfoTooltip from './InfoTooltip';

interface Props {
  data: YearData;
  retirementAge: number;
  medianAge?: number;
}

type PopulationStatus = 'child' | 'working' | 'retired';

interface ChartEntry {
  age: number;
  male: number;
  female: number;
  total: number;
  status: PopulationStatus;
}

interface TooltipState {
  x: number;
  y: number;
  entry: ChartEntry;
}

const VIEWBOX_WIDTH = 640;
const VIEWBOX_HEIGHT = 280;
const PLOT_LEFT = 52;
const PLOT_RIGHT = 598;
const PLOT_TOP = 12;
const PLOT_BOTTOM = 250;
const CENTER_X = (PLOT_LEFT + PLOT_RIGHT) / 2;
const PLOT_HALF_WIDTH = (PLOT_RIGHT - PLOT_LEFT) / 2;

const getBarColor = (status: PopulationStatus) => {
  switch (status) {
    case 'child': return '#06b6d4';
    case 'working': return '#10b981';
    case 'retired': return '#f43f5e';
  }
};

const getStatusLabel = (status: PopulationStatus) => {
  switch (status) {
    case 'child': return 'Youth (0-14)';
    case 'working': return 'Working Age';
    case 'retired': return 'Retired';
  }
};

const getAgeY = (age: number) => {
  return PLOT_TOP + ((100 - age) / 100) * (PLOT_BOTTOM - PLOT_TOP);
};

const PyramidChart: React.FC<Props> = ({ data, retirementAge, medianAge }) => {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const chartData = useMemo<ChartEntry[]>(() => {
    return data.population.map((group) => {
      const total = group.male + group.female;
      let status: PopulationStatus;

      if (group.age < 15) {
        status = 'child';
      } else if (group.age + 1 <= retirementAge) {
        status = 'working';
      } else if (group.age >= retirementAge) {
        status = 'retired';
      } else {
        status = 'working';
      }

      return {
        age: group.age,
        male: group.male,
        female: group.female,
        total,
        status,
      };
    });
  }, [data.population, retirementAge]);

  const maxSidePopulation = Math.max(...chartData.flatMap(entry => [entry.male, entry.female]), 1);
  const scaleX = (value: number) => (value / maxSidePopulation) * (PLOT_HALF_WIDTH * 0.9);
  const barHeight = Math.max(1.25, (PLOT_BOTTOM - PLOT_TOP) / 124);
  const medianAgeY = medianAge !== undefined ? getAgeY(Math.round(medianAge)) : null;

  return (
    <div className="flex h-full w-full min-w-0 flex-col">
      <h2 className="mb-2 flex flex-wrap items-center justify-center gap-1 text-center text-xs font-semibold uppercase tracking-wider text-slate-400 sm:text-sm">
        Population by Age ({data.year})
        <InfoTooltip content="Age pyramid showing population distribution. Cyan = youth (0-14), Green = working age, Rose = retired. A healthy pyramid has a wide base; inverted pyramids indicate aging populations." />
      </h2>
      <div className="relative min-h-[300px] min-w-0 flex-grow">
        <svg
          className="h-full w-full overflow-visible"
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
          role="img"
          aria-label={`Population by age pyramid for ${data.year}`}
          preserveAspectRatio="none"
          onMouseLeave={() => setTooltip(null)}
        >
          <line x1={CENTER_X} y1={PLOT_TOP} x2={CENTER_X} y2={PLOT_BOTTOM} stroke="#475569" strokeWidth={1} />

          {Array.from({ length: 21 }, (_, index) => index * 5).map((age) => (
            <g key={age}>
              <text x={PLOT_LEFT - 14} y={getAgeY(age) + 3} textAnchor="end" fill="#94a3b8" fontSize={10}>
                {age}
              </text>
            </g>
          ))}

          {chartData.map((entry) => {
            const maleWidth = scaleX(entry.male);
            const femaleWidth = scaleX(entry.female);
            const y = getAgeY(entry.age) - barHeight / 2;
            const fill = getBarColor(entry.status);

            return (
              <g
                key={entry.age}
                onMouseMove={(event) => {
                  setTooltip({
                    x: event.nativeEvent.offsetX,
                    y: event.nativeEvent.offsetY,
                    entry,
                  });
                }}
              >
                <rect x={CENTER_X - maleWidth} y={y} width={maleWidth} height={barHeight} fill={fill} />
                <rect x={CENTER_X} y={y} width={femaleWidth} height={barHeight} fill={fill} opacity={0.82} />
              </g>
            );
          })}

          <text x={CENTER_X - 10} y={PLOT_BOTTOM + 14} textAnchor="end" fill="#94a3b8" fontSize={9}>
            Male
          </text>
          <text x={CENTER_X + 10} y={PLOT_BOTTOM + 14} textAnchor="start" fill="#94a3b8" fontSize={9}>
            Female
          </text>

          <line
            x1={PLOT_LEFT}
            y1={getAgeY(15)}
            x2={PLOT_RIGHT}
            y2={getAgeY(15)}
            stroke="#06b6d4"
            strokeDasharray="3 5"
          />
          <text x={PLOT_RIGHT + 6} y={getAgeY(15) + 3} fill="#06b6d4" fontSize={9}>
            Working Age
          </text>

          <line
            x1={PLOT_LEFT}
            y1={getAgeY(retirementAge)}
            x2={PLOT_RIGHT}
            y2={getAgeY(retirementAge)}
            stroke="#fbbf24"
            strokeDasharray="3 5"
          />
          <text x={PLOT_RIGHT + 6} y={getAgeY(retirementAge) + 3} fill="#fbbf24" fontSize={9}>
            Retire
          </text>

          {medianAgeY !== null && medianAge !== undefined && (
            <>
              <line x1={PLOT_LEFT} y1={medianAgeY} x2={PLOT_RIGHT} y2={medianAgeY} stroke="#a78bfa" strokeWidth={2} />
              <text x={PLOT_LEFT - 6} y={medianAgeY + 3} textAnchor="end" fill="#a78bfa" fontSize={9}>
                Median {medianAge.toFixed(1)}
              </text>
            </>
          )}
        </svg>

        {tooltip && (
          <div
            className="pointer-events-none absolute z-20 rounded border border-slate-700 bg-slate-800 p-2 text-xs shadow-xl"
            style={{
              left: Math.min(tooltip.x + 12, 220),
              top: Math.max(tooltip.y - 36, 8),
            }}
          >
            <p className="font-bold text-slate-200">Age: {tooltip.entry.age}</p>
            <p className="text-slate-300">Population: {tooltip.entry.total.toLocaleString()}</p>
            <p className="text-slate-400">Male: {tooltip.entry.male.toLocaleString()}</p>
            <p className="text-slate-400">Female: {tooltip.entry.female.toLocaleString()}</p>
            <p className="mt-1 text-slate-400">Status: {getStatusLabel(tooltip.entry.status)}</p>
          </div>
        )}
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-2 text-[11px] text-slate-500 sm:gap-x-6 sm:text-xs">
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 bg-cyan-500"></div> Youth (0-14)
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 bg-emerald-500"></div> Working Age
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 bg-rose-500"></div> Retired
        </div>
      </div>
    </div>
  );
};

export default PyramidChart;
