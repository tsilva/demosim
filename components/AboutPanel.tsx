import React, { useState } from 'react';
import { Info, ChevronDown, ChevronUp, Database, Calculator, AlertTriangle } from 'lucide-react';

const AboutPanel: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="mt-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-400 transition-colors text-xs mx-auto"
      >
        <Info size={14} />
        About this simulation
        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {isExpanded && (
        <div className="mt-4 bg-slate-900/50 border border-slate-800 rounded-xl p-6 max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6 text-sm">
            {/* Data Sources */}
            <div>
              <div className="flex items-center gap-2 text-emerald-400 font-medium mb-3">
                <Database size={16} />
                Data Sources
              </div>
              <ul className="space-y-2 text-slate-400 text-xs">
                <li>
                  <span className="text-slate-300">Population:</span> INE Portugal 2024 estimates (10.75M)
                </li>
                <li>
                  <span className="text-slate-300">Mortality:</span> Portuguese life tables (M: 78.7y, F: 84.0y)
                </li>
                <li>
                  <span className="text-slate-300">Fertility:</span> Age-specific rates calibrated to TFR 1.40
                </li>
                <li>
                  <span className="text-slate-300">Migration:</span> INE 2024 (+110K net)
                </li>
                <li>
                  <span className="text-slate-300">Healthcare:</span> OECD age-cost multipliers
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
                  <span className="text-slate-300">Pensions:</span> Actual retirees × average pension
                </li>
                <li>
                  <span className="text-slate-300">Sustainability:</span> 100 × (1 - burden / (40% GDP))
                </li>
                <li>
                  <span className="text-slate-300">Age 100+:</span> Aggregated with high mortality
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
                <li>Constant real wages and pension rules assumed</li>
                <li>Migration age profile fixed over time</li>
                <li>Healthcare costs simplified to age multipliers</li>
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
