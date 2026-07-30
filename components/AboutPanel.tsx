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
                  <span className="text-slate-300">Mortality:</span> Exact annual EUROPOP2025 age/sex cohort-survival paths
                </li>
                <li>
                  <span className="text-slate-300">Fertility:</span> Exact annual EUROPOP2025 age-specific fertility rates
                </li>
                <li>
                  <span className="text-slate-300">Migration:</span> EUROPOP2025 annual totals and evolving age/sex profiles
                </li>
                <li>
                  <span className="text-slate-300">Retirement:</span> Enacted 2026–27 ages + EC current-policy path to 2070
                </li>
                <li>
                  <span className="text-slate-300">Fiscal:</span> CFP 2025 SS execution and public pension spending
                </li>
                <li>
                  <span className="text-slate-300">Healthcare:</span> Eurostat SHA 2025 provisional totals + EC Ageing Report
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
                  <span className="text-slate-300">Official-data checks:</span> All annual EUROPOP transitions and births reproduce exactly
                </li>
                <li>
                  <span className="text-slate-300">SS Balance:</span> Effective revenue minus effective expenditure
                </li>
                <li>
                  <span className="text-slate-300">Fiscal pressure:</span> Public pensions + public healthcare as % of GDP
                </li>
                <li>
                  <span className="text-slate-300">Currency:</span> Monetary outputs in constant 2025 EUR
                </li>
                <li>
                  <span className="text-slate-300">Age 100+:</span> Eurostat-compatible open cohort
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
                <li>EUROPOP2025 assumptions are scenarios; combining sensitivity variants is not an official Eurostat scenario</li>
                <li>EC fiscal paths end in 2070; later years hold the final published share and vary it with scenario exposure</li>
                <li>Healthcare sensitivity uses the EC EU14 age/sex cost profile, which includes Portugal but is not Portugal-specific</li>
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
