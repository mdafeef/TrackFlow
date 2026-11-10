"use client";

import React from "react";

export function AnimatedSpiralBg() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0" aria-hidden="true">
      {/* Radial soft color glows */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-gradient-to-tr from-indigo-500/15 via-purple-500/10 to-sky-500/10 blur-3xl opacity-75 dark:opacity-40 animate-pulse" style={{ animationDuration: "8s" }} />
      <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl opacity-60 dark:opacity-30" />
      <div className="absolute top-1/3 -right-32 w-96 h-96 rounded-full bg-indigo-600/10 blur-3xl opacity-60 dark:opacity-30" />

      {/* Rotating Spiral & Orbital Rings */}
      <svg
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] max-w-none opacity-40 dark:opacity-20 animate-[spin_60s_linear_infinite]"
        viewBox="0 0 800 800"
        fill="none"
      >
        <circle cx="400" cy="400" r="380" stroke="currentColor" strokeWidth="1" strokeDasharray="6 8" className="text-indigo-400/40 dark:text-indigo-600/30" />
        <circle cx="400" cy="400" r="300" stroke="currentColor" strokeWidth="1.2" strokeDasharray="12 12" className="text-sky-400/50 dark:text-sky-500/40" />
        <circle cx="400" cy="400" r="220" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 6" className="text-purple-400/40 dark:text-purple-600/30" />
        <circle cx="400" cy="400" r="140" stroke="currentColor" strokeWidth="1" strokeDasharray="8 6" className="text-emerald-400/40 dark:text-emerald-600/30" />

        {/* Orbiting Satellite Nodes */}
        <circle cx="400" cy="20" r="4" className="fill-indigo-500" />
        <circle cx="700" cy="400" r="5" className="fill-emerald-500" />
        <circle cx="400" cy="620" r="3.5" className="fill-sky-500" />
        <circle cx="180" cy="400" r="4.5" className="fill-purple-500" />
        <circle cx="400" cy="260" r="3" className="fill-indigo-400" />
      </svg>

      {/* Counter-rotating Inner Spiral Arc */}
      <svg
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] max-w-none opacity-30 dark:opacity-20 animate-[spin_40s_linear_infinite_reverse]"
        viewBox="0 0 600 600"
        fill="none"
      >
        <path
          d="M300 50 C440 50 550 160 550 300 C550 440 440 550 300 550 C180 550 90 460 90 340 C90 240 160 170 250 170 C330 170 380 220 380 290 C380 340 340 380 300 380 C270 380 250 360 250 330"
          stroke="url(#spiral-grad)"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />
        <defs>
          <linearGradient id="spiral-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366F1" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#0EA5E9" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0.4" />
          </linearGradient>
        </defs>
      </svg>

      {/* Subtle Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:36px_36px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_20%,#000_70%,transparent_100%)]" />
    </div>
  );
}
