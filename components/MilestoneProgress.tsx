"use client";

import React from "react";
import { Check, Clock, Truck, Package, Home, Send } from "lucide-react";

interface MilestoneProgressProps {
  currentStage: "booked" | "dispatched" | "in_transit" | "out_for_delivery" | "delivered";
  updatedTime: string;
}

const STAGES = [
  { id: "booked", label: "Booked", icon: Package, description: "Manifest registered" },
  { id: "dispatched", label: "Dispatched", icon: Send, description: "Left origin facility" },
  { id: "in_transit", label: "In Transit", icon: Truck, description: "Moving between hubs" },
  { id: "out_for_delivery", label: "Out for Delivery", icon: Clock, description: "With local courier" },
  { id: "delivered", label: "Delivered", icon: Home, description: "Handed to recipient" },
];

export function MilestoneProgress({ currentStage, updatedTime }: MilestoneProgressProps) {
  const stageIndexMap: Record<string, number> = {
    booked: 0,
    dispatched: 1,
    in_transit: 2,
    out_for_delivery: 3,
    delivered: 4,
  };

  const currentIdx = stageIndexMap[currentStage] ?? 2;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Delivery Lifecycle
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Step {currentIdx + 1} of 5 · Current Status:{" "}
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {STAGES[currentIdx]?.label}
            </span>
          </p>
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
          {updatedTime}
        </div>
      </div>

      {/* Progress Bar & Steps */}
      <div className="relative">
        {/* Background track */}
        <div className="absolute top-5 left-6 right-6 h-0.5 bg-slate-200 dark:bg-slate-800 -z-0" />
        {/* Active filled line */}
        <div
          className="absolute top-5 left-6 h-0.5 bg-indigo-600 dark:bg-indigo-500 transition-all duration-500 -z-0"
          style={{ width: `${(currentIdx / (STAGES.length - 1)) * 100}%` }}
        />

        {/* Steps Grid */}
        <div className="relative z-10 grid grid-cols-5 gap-1">
          {STAGES.map((s, idx) => {
            const isCompleted = idx < currentIdx;
            const isCurrent = idx === currentIdx;
            const Icon = s.icon;

            return (
              <div key={s.id} className="flex flex-col items-center text-center">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                    isCompleted
                      ? "border-emerald-500 bg-emerald-500 text-white shadow-xs"
                      : isCurrent
                      ? "border-indigo-600 bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 ring-4 ring-indigo-100 dark:ring-indigo-950/60 shadow-md"
                      : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-400"
                  }`}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>

                <div className="mt-2.5">
                  <p
                    className={`text-xs font-semibold whitespace-nowrap ${
                      isCurrent
                        ? "text-indigo-600 dark:text-indigo-400 font-bold"
                        : isCompleted
                        ? "text-slate-800 dark:text-slate-200"
                        : "text-slate-400 dark:text-slate-500"
                    }`}
                  >
                    {s.label}
                  </p>
                  <p className="hidden md:block text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                    {s.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
