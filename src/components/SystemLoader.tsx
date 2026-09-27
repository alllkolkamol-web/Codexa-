import React, { useState, useEffect, useRef } from 'react';

interface SystemLoaderProps {
  isReady: boolean;
  onComplete: () => void;
}

export const SystemLoader: React.FC<SystemLoaderProps> = ({ isReady, onComplete }) => {
  const [progress, setProgress] = useState<number>(1);
  const isReadyRef = useRef<boolean>(isReady);

  useEffect(() => {
    isReadyRef.current = isReady;
  }, [isReady]);

  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const updateProgress = (currentTime: number) => {
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;

      setProgress((prev) => {
        if (prev >= 100) {
          return 100;
        }

        let increment = 0;
        if (isReadyRef.current) {
          // When app initialization is ready, smoothly accelerate to 100%
          increment = Math.max(4.5, (100 - prev) * 0.4);
        } else {
          // While app is initializing, tick progressively up towards 95%
          if (prev < 40) {
            increment = 2.8;
          } else if (prev < 75) {
            increment = 1.6;
          } else if (prev < 92) {
            increment = 0.8;
          } else {
            increment = 0.3; // smooth crawl near 95% until app is ready
          }
        }

        const next = Math.min(100, prev + increment);
        return next;
      });

      animationFrameId = requestAnimationFrame(updateProgress);
    };

    animationFrameId = requestAnimationFrame(updateProgress);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  useEffect(() => {
    if (progress >= 100) {
      const timeout = setTimeout(() => {
        onComplete();
      }, 180);
      return () => clearTimeout(timeout);
    }
  }, [progress, onComplete]);

  const displayPercent = Math.min(100, Math.max(1, Math.round(progress)));
  const circumference = 339.292;
  const strokeDashoffset = circumference - (circumference * displayPercent) / 100;

  return (
    <div className="fixed inset-0 z-50 bg-[#060919] flex flex-col items-center justify-center px-4 select-none dir-rtl font-sans transition-opacity duration-300">
      {/* Background glow effects */}
      <div className="absolute w-72 h-72 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center">
        {/* Ring Progress Circle */}
        <div className="relative w-36 h-36 sm:w-40 sm:h-40 flex items-center justify-center mb-8">
          <svg className="w-full h-full transform -rotate-90">
            {/* Background Circle */}
            <circle
              cx="50%"
              cy="50%"
              r="54"
              className="stroke-slate-800/80"
              strokeWidth="7"
              fill="transparent"
            />
            {/* Active Progress Circle */}
            <circle
              cx="50%"
              cy="50%"
              r="54"
              className="stroke-blue-500 transition-all duration-75 ease-out"
              strokeWidth="7"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              style={{
                filter: 'drop-shadow(0px 0px 8px rgba(59, 130, 246, 0.85))',
              }}
            />
          </svg>
          {/* Inner Percentage Text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl sm:text-4xl font-bold text-white tracking-tight font-mono">
              {displayPercent}%
            </span>
          </div>
        </div>

        {/* Horizontal Progress Bar */}
        <div className="w-64 sm:w-80 h-2.5 bg-slate-800/80 rounded-full overflow-hidden p-0.5 border border-slate-700/50 mb-6 shadow-inner">
          <div 
            className="h-full bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 rounded-full transition-all duration-75 ease-out shadow-[0_0_12px_rgba(59,130,246,0.6)]"
            style={{ width: `${Math.max(2, displayPercent)}%` }}
          />
        </div>

        {/* Status Text Labels */}
        <div className="text-center space-y-2">
          <p className="text-sm sm:text-base font-medium text-slate-200 tracking-wide">
            جاري تهيئة نظام Codexa للموقع...
          </p>
          <p className="text-xs sm:text-sm text-slate-400 font-mono">
            نسبة الإنجاز: {displayPercent}%
          </p>
        </div>
      </div>
    </div>
  );
};
