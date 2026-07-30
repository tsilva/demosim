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
                  <span className="text-slate-300">Population:</span> INE revised 31 December 2025 stock (11,424,031)
                </li>
                <li>
                  <span className="text-slate-300">Mortality:</span> Eurostat 2024 age/sex rates + EUROPOP2025 improvement paths
                </li>
                <li>
                  <span className="text-slate-300">Fertility:</span> Eurostat 2024 age pattern + EUROPOP2025 TFR and timing paths
                </li>
                <li>
                  <span className="text-slate-300">Migration:</span> EUROPOP2025 annual totals and evolving age/sex profiles
                </li>
                <li>
                  <span className="text-slate-300">Retirement:</span> Official 2026 normal pension age (66y 9m)
                </li>
                <li>
                  <span className="text-slate-300">Healthcare:</span> Eurostat SHA aggregate spending; model age-cost weights
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
                  <span className="text-slate-300">Presets:</span> EUROPOP2025 baseline and sensitivity assumptions
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
                <li>Scenario projection, not a prediction or official forecast</li>
                <li>No modeling of policy changes, economic shocks, or pandemics</li>
                <li>INE publishes ages 85+ together; the simulator splits them using the Eurostat 2025 age/sex pattern</li>
                <li>EUROPOP2025 keyframes are interpolated between official years (geometrically for mortality)</li>
                <li>Economic inputs remain illustrative 2024 constant-EUR assumptions and are less certain than the population mechanics</li>
                <li>Healthcare age costs use simplified model weights and real cost growth</li>
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
