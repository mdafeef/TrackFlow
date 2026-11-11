"use client";

import React from "react";
import { COURIER_LIST } from "@/lib/couriers";
import { Truck } from "lucide-react";

export function PartnerMarquee() {
  // Take top carriers and duplicate for seamless looping
  const partners = COURIER_LIST.slice(0, 12);
  const marqueeItems = [...partners, ...partners];

  return (
    <div className="relative w-full overflow-hidden py-4 border-y border-slate-200/70 bg-slate-50/60 dark:border-slate-800/70 dark:bg-slate-900/40 backdrop-blur-xs select-none">
      {/* Gradient edge masks for smooth fade in/out */}
      <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-28 bg-gradient-to-r from-slate-50 dark:from-slate-950 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-28 bg-gradient-to-l from-slate-50 dark:from-slate-950 to-transparent z-10 pointer-events-none" />

      {/* Marquee Track */}
      <div className="animate-marquee flex items-center gap-4 sm:gap-6">
        {marqueeItems.map((courier, idx) => (
          <div
            key={`${courier.id}-${idx}`}
            className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/95 px-4 py-2.5 text-left shadow-2xs dark:border-slate-800/80 dark:bg-slate-900/90 dark:backdrop-blur-xs shrink-0 pointer-events-none transition-colors"
          >
            {/* Logo Emblem with dark mode luminosity blending and brightness balance */}
            <div
              className={`flex h-8.5 w-8.5 items-center justify-center rounded-xl font-black text-xs shadow-2xs border ${courier.badgeColor.bg} ${courier.badgeColor.text} ${courier.badgeColor.border} ${courier.badgeColor.darkBg} ${courier.badgeColor.darkText} ${courier.badgeColor.darkBorder} dark:[mix-blend-mode:luminosity] dark:brightness-90 dark:contrast-110`}
            >
              <span>{courier.shortName.slice(0, 3)}</span>
            </div>

            {/* Carrier Title & Scope */}
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                {courier.name}
              </span>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-400">
                <Truck className="h-2.5 w-2.5 text-indigo-500 dark:text-indigo-400" />
                <span className="font-mono">{courier.formatDescription.split("(")[0].trim()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
