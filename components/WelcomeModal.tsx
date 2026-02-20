import React, { useState, useEffect } from 'react';
import { X, Play, Sliders, TrendingUp } from 'lucide-react';

const STORAGE_KEY = 'demosim-welcome-dismissed';

interface Props {
  onClose: () => void;
}

const WelcomeModal: React.FC<Props> = ({ onClose }) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem(STORAGE_KEY, 'true');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Gradient header accent */}
        <div className="h-1 bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500" />

        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1 text-slate-500 hover:text-slate-300 transition-colors"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        {/* Content */}
        <div className="p-8">
          <h2 className="text-2xl font-bold text-white mb-2">
            Explore Portugal's Demographic Future
          </h2>
          <p className="text-slate-400 mb-6">
            See how fertility, migration, and aging will shape Portugal's economy through 2100.
          </p>

          {/* Feature bullets */}
          <div className="space-y-4 mb-8">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <Play size={18} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-slate-200 font-medium">Watch time unfold</p>
                <p className="text-sm text-slate-500">Press play or drag the timeline to see population changes year by year.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-cyan-500/10 rounded-lg">
                <Sliders size={18} className="text-cyan-400" />
              </div>
              <div>
                <p className="text-slate-200 font-medium">Test "what if" scenarios</p>
                <p className="text-sm text-slate-500">Adjust fertility, migration, and retirement age to see their impact.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <TrendingUp size={18} className="text-amber-400" />
              </div>
              <div>
                <p className="text-slate-200 font-medium">Track economic sustainability</p>
                <p className="text-sm text-slate-500">See how demographics affect social security, healthcare, and worker burden.</p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={handleClose}
            className="w-full py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-900 font-semibold rounded-lg transition-all shadow-lg"
          >
            Start Exploring
          </button>

          {/* Don't show again */}
          <label className="flex items-center justify-center gap-2 mt-4 text-sm text-slate-500 cursor-pointer">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900"
            />
            Don't show this again
          </label>
        </div>
      </div>
    </div>
  );
};

// Hook to check if welcome should be shown
export const useWelcomeModal = () => {
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) {
      setShowWelcome(true);
    }
  }, []);

  return {
    showWelcome,
    closeWelcome: () => setShowWelcome(false),
  };
};

export default WelcomeModal;
