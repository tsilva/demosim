import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface Props {
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const InfoTooltip: React.FC<Props> = ({ content, position = 'top' }) => {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-slate-700 border-x-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-slate-700 border-x-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-slate-700 border-y-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-slate-700 border-y-transparent border-l-transparent',
  };

  return (
    <span
      className="relative inline-flex items-center ml-1"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onTouchStart={() => setIsVisible(!isVisible)}
    >
      <HelpCircle
        size={12}
        className="text-slate-500 hover:text-slate-400 cursor-help transition-colors"
      />
      {isVisible && (
        <div
          className={`absolute z-50 ${positionClasses[position]} w-48 px-3 py-2 text-xs text-slate-200 bg-slate-800 border border-slate-700 rounded-lg shadow-xl`}
        >
          {content}
          <div
            className={`absolute ${arrowClasses[position]} border-4`}
          />
        </div>
      )}
    </span>
  );
};

export default InfoTooltip;
