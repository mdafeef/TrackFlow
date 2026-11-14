"use client";

import React from "react";
import { motion } from "motion/react";
import { Truck, X } from "lucide-react";

interface TrackingFetchingAnimationProps {
  trackingNumber?: string;
  courierName?: string;
  onCancel?: () => void;
}

export function TrackingFetchingAnimation({
  trackingNumber,
  courierName,
  onCancel,
}: TrackingFetchingAnimationProps) {
  const displayPartner =
    courierName && courierName !== "Carrier Network" ? courierName : "Carrier Network";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 6 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="relative mx-auto w-full max-w-xs sm:max-w-sm rounded-3xl border border-slate-200/90 bg-white p-7 sm:p-8 text-center shadow-2xl dark:border-slate-800 dark:bg-slate-900"
    >
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel tracking request"
          className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {/* Clean Orbital Radar & Carrier Emblem (No clipped icons) */}
      <div className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center">
        <span className="absolute inset-0 rounded-full border-2 border-indigo-100 dark:border-indigo-950" />
        <span className="absolute inset-0 rounded-full border-2 border-transparent border-t-indigo-600 border-r-violet-600 dark:border-t-indigo-400 dark:border-r-violet-400 animate-spin" />
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25">
          <Truck className="h-5 w-5" />
        </div>
      </div>

      <h3 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
        Fetching {displayPartner}
      </h3>
      {trackingNumber ? (
        <p className="mt-1 font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
          #{trackingNumber}
        </p>
      ) : (
        <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
          Checking live carrier checkpoints
        </p>
      )}

      {/* Smooth Animated Progress Bar */}
      <div className="mx-auto mt-5 h-1.5 w-44 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <motion.div
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{
            repeat: Infinity,
            duration: 1.15,
            ease: "easeInOut",
          }}
          className="h-full w-1/2 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600"
        />
      </div>
    </motion.div>
  );
}
