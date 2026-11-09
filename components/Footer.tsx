"use client";

import React from "react";
import { PackageSearch, ArrowUp } from "lucide-react";

export function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="border-t border-slate-200 bg-white py-12 dark:border-slate-800 dark:bg-slate-900 transition-colors">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
              <PackageSearch className="h-4 w-4" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              Track<span className="text-indigo-600 dark:text-indigo-400">Flow</span>
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 text-center md:text-left max-w-md">
            Independent multi-carrier shipment monitoring utility supporting India Post Speed Post, DTDC, Ekart, BlueDart, Delhivery, and 20+ postal networks worldwide.
          </p>

          <button
            type="button"
            onClick={scrollToTop}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
          >
            <span>Back to top</span>
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 dark:text-slate-500">
          <div>
            © {new Date().getFullYear()} TrackFlow. Free & Open Parcel Tracking for Everyone.
          </div>
          <div className="flex items-center gap-6">
            <span>All trademarks and brand logos belong to their respective courier carriers.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
