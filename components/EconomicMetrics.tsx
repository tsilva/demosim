import React from 'react';
import { EconomicMetrics as EconomicMetricsType } from '../types';
import InfoTooltip from './InfoTooltip';

interface Props {
  metrics: EconomicMetricsType;
}

const formatCurrency = (value: number): string => {
  if (Math.abs(value) >= 1e9) {
    return `${(value / 1e9).toFixed(1)}B`;
  }
  if (Math.abs(value) >= 1e6) {
    return `${(value / 1e6).toFixed(1)}M`;
  }
  return value.toLocaleString('pt-PT', { maximumFractionDigits: 0 });
};

const EconomicMetrics: React.FC<Props> = ({ metrics }) => {
  const isCritical = metrics.sustainabilityIndex < 30;
  const isWarning = metrics.sustainabilityIndex < 60;

  return (
    <div className="space-y-3">
      {/* Actual Workforce */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-md">
        <p className="text-[10px] text-slate-500 uppercase tracking-tight flex items-center">
          Actual Workforce
          <InfoTooltip content="Employed workers contributing to social security. Excludes unemployed and those outside working age." />
        </p>
        <p className="text-xl font-bold text-emerald-400">
          {(metrics.actualWorkforce / 1000000).toFixed(2)}M
        </p>
        <p className="text-[10px] text-slate-500">
          {(metrics.laborUtilizationRate * 100).toFixed(1)}% labor utilization
        </p>
      </div>

      {/* SS Balance */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-md">
        <p className="text-[10px] text-slate-500 uppercase tracking-tight flex items-center">
          SS Balance
          <InfoTooltip content="Social Security revenue minus pension payments. Negative values indicate a deficit that must be covered by other means." />
        </p>
        <p className={`text-xl font-bold ${metrics.ssBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          {metrics.ssBalance >= 0 ? '+' : ''}{formatCurrency(metrics.ssBalance)}
        </p>
        <p className="text-[10px] text-slate-500">
          {formatCurrency(metrics.ssBalancePerWorker)}/worker
        </p>
      </div>

      {/* Healthcare Cost */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-md">
        <p className="text-[10px] text-slate-500 uppercase tracking-tight flex items-center">
          Healthcare Cost
          <InfoTooltip content="Total public healthcare spending based on population age structure. Elderly care costs 6x more than youth." />
        </p>
        <p className="text-xl font-bold text-cyan-400">
          {formatCurrency(metrics.totalHealthcareCost)}
        </p>
        <p className="text-[10px] text-slate-500">
          {formatCurrency(metrics.healthcareCostPerWorker)}/worker
        </p>
      </div>

      {/* Total Burden per Worker */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-md">
        <p className="text-[10px] text-slate-500 uppercase tracking-tight flex items-center">
          Burden per Worker
          <InfoTooltip content="Annual cost each worker must cover for SS deficit and healthcare. Higher values reduce disposable income and competitiveness." />
        </p>
        <p className={`text-xl font-bold ${
          metrics.totalBurdenPerWorker > 20000 ? 'text-rose-400' : 'text-amber-400'
        }`}>
          {formatCurrency(metrics.totalBurdenPerWorker)}
        </p>
        <p className="text-[10px] text-slate-500">
          EUR/year (SS deficit + healthcare)
        </p>
      </div>

      {/* Sustainability Index */}
      <div className={`border rounded-xl p-3 shadow-md ${
        isCritical
          ? 'bg-rose-900/20 border-rose-800'
          : isWarning
            ? 'bg-amber-900/20 border-amber-800'
            : 'bg-slate-900 border-slate-800'
      }`}>
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] text-slate-400 uppercase tracking-tight flex items-center">
            Sustainability Index
            <InfoTooltip content="Score from 0-100 measuring if total burden (SS deficit + healthcare) stays within 40% of GDP. Zero means system breaking point." />
          </p>
          <span className={`text-lg font-bold ${
            isCritical ? 'text-rose-400' : isWarning ? 'text-amber-400' : 'text-emerald-400'
          }`}>
            {metrics.sustainabilityIndex.toFixed(0)}
          </span>
        </div>
        {/* Progress bar with threshold markers */}
        <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              isCritical ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${metrics.sustainabilityIndex}%` }}
          />
          {/* Threshold markers */}
          <div className="absolute top-0 left-[30%] w-px h-full bg-slate-600" />
          <div className="absolute top-0 left-[60%] w-px h-full bg-slate-600" />
        </div>
        {/* Enhanced status explanation */}
        <div className="mt-2">
          <p className={`text-[10px] font-medium ${
            isCritical ? 'text-rose-400' : isWarning ? 'text-amber-400' : 'text-emerald-400'
          }`}>
            {isCritical
              ? 'CRITICAL: Burden exceeds 40% of GDP'
              : isWarning
                ? 'WARNING: Reforms may be needed'
                : 'System can sustain current burden'}
          </p>
          <p className="text-[10px] text-slate-600 mt-0.5">
            {isCritical
              ? 'Without intervention, the system cannot meet its obligations.'
              : isWarning
                ? 'Approaching limits. Consider retirement age or migration adjustments.'
                : 'Fiscal capacity exists to cover social programs.'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default EconomicMetrics;
