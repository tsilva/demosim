import React from 'react';
import dynamic from 'next/dynamic';
import { YearData } from '../types';
import InfoTooltip from './InfoTooltip';
import useChartContainerReady from './useChartContainerReady';

const TrendPlot = dynamic(() => import('./TrendPlot'));

interface Props {
  fullHistory: YearData[] | undefined;
  currentYear: number;
  showPlot: boolean;
}

const TrendChart: React.FC<Props> = ({ fullHistory, currentYear, showPlot }) => {
  const { containerRef, isReady, dimensions } = useChartContainerReady();

  return (
    <div className="flex h-full w-full min-w-0 flex-col">
       <h2 className="mb-2 flex flex-wrap items-center justify-center gap-1 text-center text-xs font-semibold uppercase tracking-wider text-slate-400 sm:text-sm">
        Dependency Ratio Evolution
        <InfoTooltip content="Standard old-age dependency ratio over time: people aged 65+ per 100 people aged 15-64. Higher values indicate more age-related fiscal pressure." />
      </h2>
      <div ref={containerRef} className="min-h-0 min-w-0 flex-grow">
        {showPlot && (
          <TrendPlot
            width={dimensions.width}
            height={dimensions.height}
            data={isReady ? fullHistory : undefined}
            currentYear={currentYear}
            dataKey="oldAgeDependencyRatio"
            stroke="#fbbf24"
            formatter={(value) => [`${value.toFixed(1)}%`, 'Ratio']}
          />
        )}
      </div>
      <p className="mt-2 text-center text-[11px] text-slate-400 sm:text-xs">
        People aged 65+ per 100 aged 15-64
      </p>
    </div>
  );
};

export default TrendChart;
