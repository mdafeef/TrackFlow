"use client";

import React, { useState } from "react";
import { ArrowUpDown, CheckCircle, Clock, MapPin, Send, Truck, Package } from "lucide-react";
import { TrackingActivity } from "@/app/api/track/route";

interface TimelineListProps {
  activities: TrackingActivity[];
  courierName: string;
}

export function TimelineList({ activities, courierName }: TimelineListProps) {
  const [sortNewestFirst, setSortNewestFirst] = useState(true);

  if (!activities || activities.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No detailed transit checkpoint scans available yet for this shipment.
        </p>
      </div>
    );
  }

  const sortedActivities = [...activities].sort((a, b) => {
    return sortNewestFirst ? 0 : -1;
  });

  const getStageIcon = (stage: string) => {
    switch (stage) {
      case "delivered":
        return <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
      case "out_for_delivery":
        return <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
      case "in_transit":
        return <Truck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />;
      case "dispatched":
        return <Send className="h-4 w-4 text-sky-600 dark:text-sky-400" />;
      case "booked":
      default:
        return <Package className="h-4 w-4 text-slate-600 dark:text-slate-400" />;
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-colors">
      <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Scan Activity Log ({activities.length} Checkpoints)
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Real-time scanner updates from {courierName} sorting centers
          </p>
        </div>

        <button
          type="button"
          onClick={() => setSortNewestFirst(!sortNewestFirst)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
        >
          <ArrowUpDown className="h-3 w-3" />
          <span>{sortNewestFirst ? "Newest First" : "Oldest First"}</span>
        </button>
      </div>

      {/* Vertical Timeline */}
      <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
        {sortedActivities.map((act, index) => {
          const isLatest = index === 0 && sortNewestFirst;

          return (
            <div key={act.id} className="relative group">
              {/* Dot Icon Anchor */}
              <div
                className={`absolute -left-6 top-1 flex h-4.5 w-4.5 items-center justify-center rounded-full border-2 bg-white dark:bg-slate-900 transition-transform ${
                  isLatest
                    ? "border-indigo-600 ring-4 ring-indigo-100 dark:ring-indigo-950/70"
                    : "border-slate-300 dark:border-slate-700"
                }`}
              >
                <div
                  className={`h-2 w-2 rounded-full ${
                    isLatest ? "bg-indigo-600 dark:bg-indigo-400" : "bg-slate-400 dark:bg-slate-600"
                  }`}
                />
              </div>

              {/* Event Card Content */}
              <div
                className={`rounded-xl border p-4 transition-all ${
                  isLatest
                    ? "border-indigo-200 bg-indigo-50/40 dark:border-indigo-900/40 dark:bg-indigo-950/20"
                    : "border-slate-100 bg-slate-50/50 hover:bg-slate-50 dark:border-slate-800/80 dark:bg-slate-950/40 dark:hover:bg-slate-800/30"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-md bg-white dark:bg-slate-800 shadow-xs">
                      {getStageIcon(act.stage)}
                    </span>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      {act.statusText}
                    </h4>
                  </div>
                  <div className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    {act.date} · {act.time}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="font-medium">{act.facility}</span>
                </div>

                {act.details && (
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 pl-5 border-l-2 border-slate-200 dark:border-slate-700">
                    {act.details}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
