import React from 'react';

interface AudioWaveVisualizerProps {
  isActive: boolean;
  color?: 'emerald' | 'amber' | 'indigo' | 'rose';
  state?: 'listening' | 'speaking' | 'thinking' | 'idle';
  size?: 'sm' | 'md' | 'lg';
}

export const AudioWaveVisualizer: React.FC<AudioWaveVisualizerProps> = ({
  isActive,
  color = 'emerald',
  state = 'idle',
  size = 'md',
}) => {
  const barHeights = [28, 48, 64, 38, 54, 72, 42, 60, 32, 50, 68, 36];

  const getColorClasses = () => {
    switch (color) {
      case 'amber':
        return 'from-amber-400 to-amber-600 shadow-amber-500/30';
      case 'indigo':
        return 'from-indigo-400 to-indigo-600 shadow-indigo-500/30';
      case 'rose':
        return 'from-rose-400 to-rose-600 shadow-rose-500/30';
      case 'emerald':
      default:
        return 'from-emerald-400 to-teal-500 shadow-emerald-500/30';
    }
  };

  const getHeightMultiplier = () => {
    if (!isActive) return 0.2;
    if (state === 'speaking') return 1;
    if (state === 'listening') return 0.75;
    if (state === 'thinking') return 0.45;
    return 0.3;
  };

  const scale = size === 'sm' ? 0.6 : size === 'lg' ? 1.4 : 1;

  return (
    <div className="flex items-center justify-center gap-1.5 h-20 px-4">
      {barHeights.map((h, i) => {
        const animDelay = `${(i * 0.08).toFixed(2)}s`;
        const animDuration =
          state === 'thinking' ? '1.8s' : state === 'speaking' ? '0.7s' : '1.1s';
        const heightPx = Math.max(6, h * getHeightMultiplier() * scale);

        return (
          <div
            key={i}
            className={`w-1.5 rounded-full bg-gradient-to-t ${getColorClasses()} transition-all duration-300 shadow-sm`}
            style={{
              height: `${heightPx}px`,
              animation: isActive ? `wave-pulse ${animDuration} ease-in-out infinite ${animDelay}` : 'none',
              opacity: isActive ? 0.95 : 0.35,
            }}
          />
        );
      })}
    </div>
  );
};
