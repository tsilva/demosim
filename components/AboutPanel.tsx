import React, { useState } from 'react';
import { Info, ChevronDown, ChevronUp, Database, Calculator, AlertTriangle } from 'lucide-react';

const AboutPanel: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="mt-3 sm:mt-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="mx-auto flex items-center gap-2 text-[11px] text-slate-500 transition-colors hover:text-slate-400 sm:text-xs"
      >
        <Info size={14} />
        About this simulation
        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {isExpanded && (
        <div className="mx-auto mt-4 max-w-4xl rounded-xl border border-slate-800 bg-slate-900/50 p-4 sm:p-6">
          <div className="grid gap-5 text-sm sm:gap-6 md:grid-cols-3">
            {/* Data Sources */}
            <div>
              <div className="flex items-center gap-2 text-emerald-400 font-medium mb-3">
                <Database size={16} />
                Data Sources
              </div>
              <ul className="space-y-2 text-slate-400 text-xs">
                <li>
                  <span className="text-slate-300">Population:</span> Eurostat 1 January 2024 population (10.64M)
                </li>
                <li>
                  <span className="text-slate-300">Mortality:</span> Eurostat 2024 mortality (M: 79.7y, F: 85.2y)
                </li>
                <li>
                  <span className="text-slate-300">Fertility:</span> Eurostat 2024 age-specific rates (TFR 1.41)
                </li>
                <li>
                  <span className="text-slate-300">Migration:</span> 2024 profile with scenario-specific convergence paths
                </li>
                <li>
                  <span className="text-slate-300">Healthcare:</span> Eurostat SHA 2024 + age-cost multipliers
                </li>
              </ul>
            </div>

            {/* Methodology */}
            <div>
              <div className="flex items-center gap-2 text-cyan-400 font-medium mb-3">
                <Calculator size={16} />
                Methodology
              </div>
              <ul className="space-y-2 text-slate-400 text-xs">
                <li>
                  <span className="text-slate-300">Model:</span> Cohort-component projection (UN/Eurostat standard)
                </li>
                <li>
                  <span className="text-slate-300">SS Contributions:</span> Workforce × salary × 34.75%
                </li>
                <li>
                  <span className="text-slate-300">SS Balance:</span> Contributions minus pensions and calibrated non-pension spending
                </li>
                <li>
                  <span className="text-slate-300">Sustainability:</span> 100 × (1 - burden / (40% GDP))
                </li>
                <li>
                  <span className="text-slate-300">Currency:</span> All economic outputs in inflation-adjusted 2024 EUR
                </li>
                <li>
                  <span className="text-slate-300">Age 100+:</span> Internally split through 110+
                </li>
              </ul>
            </div>

            {/* Limitations */}
            <div>
              <div className="flex items-center gap-2 text-amber-400 font-medium mb-3">
                <AlertTriangle size={16} />
                Limitations
              </div>
              <ul className="space-y-2 text-slate-400 text-xs">
                <li>Educational tool, not a forecast</li>
                <li>No modeling of policy changes, economic shocks, or pandemics</li>
                <li>Real wage growth follows the productivity assumption; pension rules remain constant</li>
                <li>Migration age profile fixed over time; annual totals follow scenario paths</li>
                <li>Healthcare costs simplified to age multipliers and real cost growth</li>
              </ul>
            </div>
          </div>

          <p className="mt-4 pt-4 border-t border-slate-800 text-[10px] text-slate-600 text-center">
            This simulation is for educational purposes. Real demographic outcomes depend on policy decisions,
            economic conditions, and events not captured in this model.
          </p>
        </div>
      )}
    </div>
  );
};

export default AboutPanel;
