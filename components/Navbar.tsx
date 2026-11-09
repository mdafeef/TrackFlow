"use client";

import React from "react";
import Link from "next/link";
import { PackageSearch, Moon, Sun, BookmarkCheck, ArrowRight } from "lucide-react";

interface NavbarProps {
  watchlistCount: number;
  onOpenWatchlist: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onNavigateSection: (id: string) => void;
}

export function Navbar({
  watchlistCount,
  onOpenWatchlist,
  isDark,
  onToggleTheme,
  onNavigateSection,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/95 transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Brand Wordmark */}
        <Link
          href="/"
          className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 group"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm transition-transform group-hover:scale-105">
            <PackageSearch className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight">
            Track<span className="text-indigo-600 dark:text-indigo-400">Flow</span>
          </span>
        </Link>

        {/* Zone 2: 4 Single-line Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-300">
          <button
            onClick={() => onNavigateSection("track-section")}
            className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors whitespace-nowrap shrink-0"
          >
            Track Shipment
          </button>
          <button
            onClick={() => onNavigateSection("features-section")}
            className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors whitespace-nowrap shrink-0"
          >
            Capabilities
          </button>
          <button
            onClick={() => onNavigateSection("couriers-section")}
            className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors whitespace-nowrap shrink-0"
          >
            20+ Carriers
          </button>
          <button
            onClick={() => onNavigateSection("faq-section")}
            className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors whitespace-nowrap shrink-0"
          >
            Tracking FAQ
          </button>
        </nav>

        {/* Zone 3: Actions & Watchlist */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onToggleTheme}
            aria-label="Toggle theme"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white transition-colors"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <button
            onClick={onOpenWatchlist}
            className="relative flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-700 whitespace-nowrap shrink-0 transition-colors"
          >
            <BookmarkCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span className="hidden sm:inline">Watchlist</span>
            {watchlistCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1.5 text-[11px] font-bold text-white tabular-nums">
                {watchlistCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onNavigateSection("track-section")}
            className="hidden sm:flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors whitespace-nowrap shrink-0"
          >
            <span>Track Now</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
