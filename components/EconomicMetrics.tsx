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
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
      {/* Actual Workforce */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 shadow-md">
        <p className="text-[10px] text-slate-500 uppercase tracking-tight flex items-center">
          Actual Workforce
          <InfoTooltip content="Modeled employed population aged 15+, calibrated to Eurostat's 2025 total. The percentage divides all workers, including older workers, by the population aged 15 to the selected retirement threshold, so it can exceed 100%." />
        </p>
        <p className="text-xl font-bold text-emerald-400">
          {(metrics.actualWorkforce / 1000000).toFixed(2)}M
        </p>
        <p className="text-[10px] text-slate-500">
          {(metrics.laborUtilizationRate * 100).toFixed(1)}% vs 15-to-retirement population
        </p>
      </div>

      {/* SS Balance */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 shadow-md">
        <p className="text-[10px] text-slate-500 uppercase tracking-tight flex items-center">
          SS Balance
          <InfoTooltip content="Constant 2025 EUR. The opening value exactly matches CFP's 2025 effective revenue minus expenditure, excluding ESF and FEAC. Later revenue follows workforce/GDP, while non-pension expenditure follows population and productivity; those later balances are model estimates." />
        </p>
        <p className={`text-xl font-bold ${metrics.ssBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          {metrics.ssBalance >= 0 ? '+' : ''}{formatCurrency(metrics.ssBalance)}
        </p>
        <p className="text-[10px] text-slate-500">
          {formatCurrency(metrics.ssBalancePerWorker)} 2025 EUR/worker
        </p>
      </div>

      {/* Healthcare Cost */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 shadow-md">
        <p className="text-[10px] text-slate-500 uppercase tracking-tight flex items-center">
          Healthcare Cost
          <InfoTooltip content="Constant 2025 EUR. Opening totals match Eurostat SHA 2025 provisional data. Future public spending follows the EC Ageing Report baseline, adjusted for the scenario's age/sex structure." />
        </p>
        <p className="text-xl font-bold text-cyan-400">
          {formatCurrency(metrics.publicHealthcareCost)}
        </p>
        <p className="text-[10px] text-slate-500">
          {formatCurrency(metrics.totalHealthcareCost)} total ({formatCurrency(metrics.healthcareCostPerWorker)} 2025 EUR/worker)
        </p>
      </div>

      {/* Total Burden per Worker */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 shadow-md">
        <p className="text-[10px] text-slate-500 uppercase tracking-tight flex items-center">
          Pensions + Health / Worker
          <InfoTooltip content="Constant 2025 EUR. Total public pension spending (Social Security and CGA) plus public healthcare, divided by the modeled employed workforce." />
        </p>
        <p className="text-xl font-bold text-amber-400">
          {formatCurrency(metrics.ageRelatedSpendingPerWorker)}
        </p>
        <p className="text-[10px] text-slate-500">
          2025 EUR/year
        </p>
      </div>

      {/* Observable spending ratio */}
      <div className="sm:col-span-2 lg:col-span-1 rounded-xl border border-slate-800 bg-slate-900 p-3 shadow-md">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] text-slate-400 uppercase tracking-tight flex items-center">
            Pensions + Health / GDP
            <InfoTooltip content="Public pension expenditure plus public healthcare as a percentage of modeled GDP. This is an observable fiscal ratio, not a subjective sustainability score. Lower values require a smaller share of national output." />
          </p>
          <span className="text-lg font-bold text-cyan-400">
            {metrics.ageRelatedSpendingShareOfGdp.toFixed(1)}%
          </span>
        </div>
        <div className="relative h-2 overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full bg-cyan-500 transition-all duration-500"
            style={{ width: `${Math.min(100, metrics.ageRelatedSpendingShareOfGdp * 4)}%` }}
          />
        </div>
        <p className="mt-2 text-[10px] text-slate-600">
          Public pensions and healthcare only; long-term care and other age-related programmes are excluded.
        </p>
      </div>
    </div>
  );
};

export default EconomicMetrics;
