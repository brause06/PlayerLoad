import React from "react";

interface CircularGaugeProps {
  value: number; // 0 to 100
  size?: number; // pixel size of the SVG
  strokeWidth?: number;
  label?: string;
}

export function CircularGauge({
  value,
  size = 64,
  strokeWidth = 6,
  label = "READINESS",
}: CircularGaugeProps) {
  // Clamp value between 0 and 100
  const clampedValue = Math.min(Math.max(value, 0), 100);

  // Determine color based on "La Scuderia" reference
  // Green > 85, Yellow 60-85, Red < 60
  let colorClass = "text-emerald-500";
  let bgClass = "text-emerald-500/20";
  if (clampedValue < 60) {
    colorClass = "text-rose-500";
    bgClass = "text-rose-500/20";
  } else if (clampedValue <= 85) {
    colorClass = "text-amber-500";
    bgClass = "text-amber-500/20";
  }

  // SVG parameters
  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  // Use strokeDashoffset to fill the ring
  const strokeDashoffset = circumference - (clampedValue / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90 w-full h-full">
        {/* Background track */}
        <circle
          className={bgClass}
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={center}
          cy={center}
        />
        {/* Foreground fill */}
        <circle
          className={`${colorClass} transition-all duration-1000 ease-out`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={center}
          cy={center}
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold text-slate-100 -mb-1">{Math.round(clampedValue)}</span>
      </div>
      {label && (
        <span className="absolute -bottom-4 text-[9px] font-bold tracking-widest text-slate-500 uppercase">
          {label}
        </span>
      )}
    </div>
  );
}
