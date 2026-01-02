import React from 'react';
import { EconomicMetrics as EconomicMetricsType } from '../types';

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
        <p className="text-[10px] text-slate-500 uppercase tracking-tight">Actual Workforce</p>
        <p className="text-xl font-bold text-emerald-400">
          {(metrics.actualWorkforce / 1000000).toFixed(2)}M
        </p>
        <p className="text-[10px] text-slate-500">
          {(metrics.laborUtilizationRate * 100).toFixed(1)}% labor utilization
        </p>
      </div>

      {/* SS Balance */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-md">
        <p className="text-[10px] text-slate-500 uppercase tracking-tight">SS Balance</p>
        <p className={`text-xl font-bold ${metrics.ssBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          {metrics.ssBalance >= 0 ? '+' : ''}{formatCurrency(metrics.ssBalance)}
        </p>
        <p className="text-[10px] text-slate-500">
          {formatCurrency(metrics.ssBalancePerWorker)}/worker
        </p>
      </div>

      {/* Healthcare Cost */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-md">
        <p className="text-[10px] text-slate-500 uppercase tracking-tight">Healthcare Cost</p>
        <p className="text-xl font-bold text-cyan-400">
          {formatCurrency(metrics.totalHealthcareCost)}
        </p>
        <p className="text-[10px] text-slate-500">
          {formatCurrency(metrics.healthcareCostPerWorker)}/worker
        </p>
      </div>

      {/* Total Burden per Worker */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-md">
        <p className="text-[10px] text-slate-500 uppercase tracking-tight">Burden per Worker</p>
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
          <p className="text-[10px] text-slate-400 uppercase tracking-tight">Sustainability Index</p>
          <span className={`text-lg font-bold ${
            isCritical ? 'text-rose-400' : isWarning ? 'text-amber-400' : 'text-emerald-400'
          }`}>
            {metrics.sustainabilityIndex.toFixed(0)}
          </span>
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              isCritical ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${metrics.sustainabilityIndex}%` }}
          />
        </div>
        <p className="text-[10px] text-slate-500 mt-1">
          {isCritical
            ? 'CRITICAL: System unsustainable'
            : isWarning
              ? 'WARNING: Increasing pressure'
              : 'System within sustainable limits'}
        </p>
      </div>
    </div>
  );
};

export default EconomicMetrics;
