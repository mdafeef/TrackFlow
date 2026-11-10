"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Radio, MapPin, Building2, ShieldCheck, Zap } from "lucide-react";

interface TrackingFetchingAnimationProps {
  trackingNumber: string;
  courierName: string;
}

const FETCH_STEPS = [
  "Connecting to carrier logistics network...",
  "Querying regional sorting facilities & transshipment hubs...",
  "Retrieving checkpoint scans & dispatch manifests...",
  "Computing delivery corridor & verified milestone history...",
];

export function TrackingFetchingAnimation({
  trackingNumber,
  courierName,
}: TrackingFetchingAnimationProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => (prev + 1) % FETCH_STEPS.length);
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 mb-10">
      <div className="relative overflow-hidden rounded-2xl border border-indigo-200/90 bg-white p-6 sm:p-8 shadow-sm dark:border-indigo-900/50 dark:bg-slate-900 transition-colors">
        {/* Subtle grid pattern background */}
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle, currentColor 1px, transparent 1px)`,
            backgroundSize: "20px 20px",
          }}
        />

        {/* Top Info Bar */}
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/70 dark:text-indigo-400">
              <Radio className="h-4 w-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  {courierName || "Carrier Network"}
                </span>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                  #{trackingNumber}
                </span>
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">
                Fetching Live Parcel Updates...
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Telemetry Active</span>
          </div>
        </div>

        {/* Dynamic Road & Moving Delivery Truck Animation Stage */}
        <div className="relative z-10 my-6 rounded-xl border border-slate-200/80 bg-gradient-to-b from-slate-100/90 to-slate-200/70 p-6 dark:border-slate-800 dark:from-slate-950/80 dark:to-slate-900/90 overflow-hidden">
          {/* Sky / Horizon Grid Lines */}
          <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.08] pointer-events-none" />

          {/* Hub Pins on left & right */}
          <div className="relative flex items-center justify-between z-10 mb-8 px-2 sm:px-6">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-600 shadow-xs dark:bg-slate-800 dark:text-slate-300">
                <Building2 className="h-4 w-4" />
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Origin</p>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Dispatch Hub</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden sm:block text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Destination</p>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Delivery Address</p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white shadow-xs">
                <MapPin className="h-4 w-4" />
              </div>
            </div>
          </div>

          {/* Road Surface */}
          <div className="relative h-16 w-full rounded-lg bg-slate-800 dark:bg-slate-950 shadow-inner overflow-hidden flex items-center">
            {/* Curbs / Road Borders */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-amber-400/80" />
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-700" />

            {/* Moving Dashed Lane Divider - continuous linear movement */}
            <motion.div
              className="absolute inset-x-0 h-0.5 flex items-center justify-around"
              style={{ width: "200%" }}
              animate={{ x: ["0%", "-50%"] }}
              transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
            >
              {[...Array(20)].map((_, i) => (
                <div key={i} className="h-1 w-6 bg-amber-300/80 rounded-full" />
              ))}
            </motion.div>

            {/* The Moving Logistics Truck */}
            <motion.div
              className="absolute left-2 sm:left-10 z-20"
              animate={{
                x: [0, 40, 100, 180, 260, 180, 80, 0],
                y: [0, -1.5, 0, -1, 0, -1.5, 0],
              }}
              transition={{
                x: { repeat: Infinity, duration: 6, ease: "easeInOut" },
                y: { repeat: Infinity, duration: 0.4, ease: "easeInOut" },
              }}
            >
              <div className="relative flex items-center">
                {/* Radar Pulse from truck antenna */}
                <div className="absolute -top-3 left-6 sm:left-7">
                  <span className="absolute -top-1 -left-1 h-3.5 w-3.5 rounded-full bg-indigo-400/50 animate-ping" />
                  <span className="relative block h-2 w-2 rounded-full bg-indigo-500" />
                </div>

                {/* Headlight beam */}
                <div className="absolute left-14 sm:left-18 top-2 h-6 w-14 sm:w-20 bg-gradient-to-r from-amber-200/50 via-amber-200/10 to-transparent pointer-events-none" />

                {/* Styled Logistics Delivery Truck SVG */}
                <svg
                  className="h-8 w-20 sm:h-10 sm:w-24 text-indigo-600 dark:text-indigo-400 drop-shadow-md"
                  viewBox="0 0 96 40"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Main Cargo Container Box */}
                  <rect x="2" y="6" width="60" height="24" rx="3" fill="#4338CA" />
                  {/* Container ribbed lines */}
                  <line x1="16" y1="9" x2="16" y2="27" stroke="#6366F1" strokeWidth="1.5" />
                  <line x1="30" y1="9" x2="30" y2="27" stroke="#6366F1" strokeWidth="1.5" />
                  <line x1="44" y1="9" x2="44" y2="27" stroke="#6366F1" strokeWidth="1.5" />
                  {/* Fast Arrow Decal on container */}
                  <path d="M22 18 L28 18 L32 18 L30 15 M32 18 L30 21" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />

                  {/* Truck Driver Cab */}
                  <path d="M62 13 L78 13 L86 21 L86 30 L62 30 Z" fill="#3730A3" />
                  {/* Windshield Window */}
                  <path d="M66 15 L76 15 L82 21 L66 21 Z" fill="#93C5FD" opacity="0.9" />
                  {/* Front Bumper & Headlight */}
                  <rect x="85" y="24" width="4" height="4" rx="1" fill="#FBBF24" />
                  <rect x="83" y="28" width="6" height="3" rx="1" fill="#1E1B4B" />

                  {/* Wheels (Front & Rear) */}
                  <circle cx="20" cy="32" r="5" fill="#0F172A" />
                  <circle cx="20" cy="32" r="2.5" fill="#94A3B8" />
                  <circle cx="48" cy="32" r="5" fill="#0F172A" />
                  <circle cx="48" cy="32" r="2.5" fill="#94A3B8" />
                  <circle cx="76" cy="32" r="5" fill="#0F172A" />
                  <circle cx="76" cy="32" r="2.5" fill="#94A3B8" />
                </svg>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Live Stepper Status Captions */}
        <div className="relative z-10 flex flex-col items-center text-center mt-4">
          <div className="h-6 flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.p
                key={currentStepIndex}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200"
              >
                {FETCH_STEPS[currentStepIndex]}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Smooth Progress Bar */}
          <div className="w-full max-w-md h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-3">
            <motion.div
              className="h-full bg-indigo-600 rounded-full"
              initial={{ width: "15%" }}
              animate={{ width: "92%" }}
              transition={{ duration: 3.5, ease: "easeOut" }}
            />
          </div>

          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2 font-mono">
            Direct handshake with carrier servers · Real-time SLA verification
          </p>
        </div>
      </div>
    </div>
  );
}
