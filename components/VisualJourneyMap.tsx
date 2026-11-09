"use client";

import React from "react";
import { MapPin, Navigation, Compass, CheckCircle2 } from "lucide-react";
import { RouteMilestone } from "@/app/api/track/route";

interface VisualJourneyMapProps {
  milestones: RouteMilestone[];
  carrierName: string;
  trackingNumber: string;
}

export function VisualJourneyMap({
  milestones,
  carrierName,
  trackingNumber,
}: VisualJourneyMapProps) {
  if (!milestones || milestones.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
            <Compass className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Shipment Transit Route & Hub Pinpoints
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Interactive corridor visualization across {carrierName} logistics network
            </p>
          </div>
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          Tracking ID: <span className="font-mono tabular-nums font-semibold">{trackingNumber}</span>
        </div>
      </div>

      {/* Corridor Map Schematic */}
      <div className="relative rounded-xl border border-slate-100 bg-slate-50/70 p-6 dark:border-slate-800/80 dark:bg-slate-950/40 overflow-hidden">
        {/* Subtle grid mesh backdrop */}
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle, currentColor 1px, transparent 1px)`,
            backgroundSize: "20px 20px",
          }}
        />

        {/* Desktop / Tablet Horizontal Schematic */}
        <div className="relative z-10 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6 md:gap-3">
          {milestones.map((m, index) => {
            const isLast = index === milestones.length - 1;
            const isCompleted = m.status === "completed";
            const isActive = m.status === "active";

            return (
              <React.Fragment key={m.id}>
                <div className="flex items-start md:items-center gap-3 md:flex-col md:text-center flex-1">
                  {/* Pin Node */}
                  <div className="relative shrink-0">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl border transition-all duration-300 ${
                        isCompleted
                          ? "border-emerald-500 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
                          : isActive
                          ? "border-indigo-600 bg-indigo-600 text-white ring-4 ring-indigo-100 dark:ring-indigo-950/80 shadow-md"
                          : "border-slate-200 bg-white text-slate-400 dark:border-slate-800 dark:bg-slate-900"
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : isActive ? (
                        <Navigation className="h-5 w-5" />
                      ) : (
                        <MapPin className="h-5 w-5" />
                      )}
                    </div>

                    {/* Role badge */}
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap">
                      <span className="rounded-full bg-slate-200/90 dark:bg-slate-800 px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                        {m.role}
                      </span>
                    </div>
                  </div>

                  {/* Node Description */}
                  <div className="mt-1 md:mt-3 flex-1">
                    <h4
                      className={`text-xs font-bold ${
                        isActive
                          ? "text-indigo-600 dark:text-indigo-400"
                          : isCompleted
                          ? "text-slate-800 dark:text-slate-200"
                          : "text-slate-400 dark:text-slate-500"
                      }`}
                    >
                      {m.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[140px] md:mx-auto">
                      {m.city}
                    </p>
                    {m.timestamp && (
                      <p className="mt-0.5 text-[10px] font-mono tabular-nums text-slate-400 dark:text-slate-500">
                        {m.timestamp}
                      </p>
                    )}
                  </div>
                </div>

                {/* Connecting arrow / line between nodes (desktop) */}
                {!isLast && (
                  <div className="hidden md:flex flex-1 items-center px-1">
                    <div className="relative w-full h-0.5 bg-slate-200 dark:bg-slate-800">
                      <div
                        className={`absolute inset-0 h-0.5 transition-all ${
                          isCompleted
                            ? "bg-emerald-500"
                            : isActive
                            ? "bg-indigo-500"
                            : "bg-transparent"
                        }`}
                      />
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
