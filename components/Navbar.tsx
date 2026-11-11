"use client";

import React from "react";
import Link from "next/link";
import { PackageSearch, Moon, Sun, BookmarkCheck, ArrowRight, LayoutDashboard, Search } from "lucide-react";

interface NavbarProps {
  watchlistCount: number;
  onOpenWatchlist: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onNavigateSection: (id: string) => void;
  activeView: "single" | "bulk";
  onChangeView: (view: "single" | "bulk") => void;
}

export function Navbar({
  watchlistCount,
  onOpenWatchlist,
  isDark,
  onToggleTheme,
  onNavigateSection,
  activeView,
  onChangeView,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 w-full max-w-full overflow-hidden border-b border-slate-200/80 bg-white/95 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/95 transition-colors">
      <div className="mx-auto flex h-14 sm:h-16 max-w-7xl items-center justify-between gap-2 sm:gap-6 px-3 sm:px-6 lg:px-8">
        {/* Zone 1: Brand Wordmark & Mode Switcher */}
        <div className="flex items-center gap-2 sm:gap-3.5 min-w-0">
          <Link
            href="/"
            onClick={() => onChangeView("single")}
            className="flex items-center gap-2 text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 group"
          >
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm transition-transform group-hover:scale-105 shrink-0">
              <PackageSearch className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <span className="text-base sm:text-xl font-bold tracking-tight">
              Track<span className="text-indigo-600 dark:text-indigo-400">Flow</span>
            </span>
          </Link>

          {/* View Toggle Tabs (Single vs Bulk Dashboard) */}
          <div className="flex items-center rounded-xl bg-slate-100 p-0.5 sm:p-1 dark:bg-slate-800 shrink-0">
            <button
              type="button"
              onClick={() => onChangeView("single")}
              className={`flex items-center gap-1 rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-semibold transition-all cursor-pointer ${
                activeView === "single"
                  ? "bg-white text-indigo-600 shadow-xs dark:bg-slate-900 dark:text-indigo-400"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <Search className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span>Single</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeView("bulk")}
              className={`flex items-center gap-1 rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-semibold transition-all cursor-pointer ${
                activeView === "bulk"
                  ? "bg-white text-indigo-600 shadow-xs dark:bg-slate-900 dark:text-indigo-400"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <LayoutDashboard className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span>Bulk</span>
              <span className="hidden md:inline-block rounded bg-indigo-100 px-1 py-0.2 text-[9px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                PRO
              </span>
            </button>
          </div>
        </div>

        {/* Zone 2: Navigation Links (Desktop) */}
        <nav className="hidden lg:flex items-center gap-6 text-xs font-medium text-slate-600 dark:text-slate-300">
          <button
            onClick={() => {
              onChangeView("single");
              setTimeout(() => onNavigateSection("track-section"), 50);
            }}
            className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors whitespace-nowrap cursor-pointer"
          >
            Track Parcel
          </button>
          <button
            onClick={() => onNavigateSection("couriers-section")}
            className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors whitespace-nowrap cursor-pointer"
          >
            20+ Carriers
          </button>
          <button
            onClick={() => onNavigateSection("features-section")}
            className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors whitespace-nowrap cursor-pointer"
          >
            Capabilities
          </button>
          <button
            onClick={() => onNavigateSection("faq-section")}
            className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors whitespace-nowrap cursor-pointer"
          >
            FAQ
          </button>
        </nav>

        {/* Zone 3: Actions & Watchlist */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <button
            onClick={onToggleTheme}
            aria-label="Toggle theme"
            className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white transition-colors cursor-pointer shrink-0"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <button
            onClick={onOpenWatchlist}
            aria-label="Open watchlist"
            className="relative flex h-8 sm:h-9 items-center gap-1.5 sm:gap-2 rounded-lg border border-slate-200 bg-white px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs font-semibold text-slate-700 shadow-xs hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-700 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
          >
            <BookmarkCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="hidden sm:inline">Watchlist</span>
            {watchlistCount > 0 && (
              <span className="flex h-4.5 min-w-4.5 sm:h-5 sm:min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] sm:text-[11px] font-bold text-white tabular-nums">
                {watchlistCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onNavigateSection("track-section")}
            className="hidden sm:flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 sm:px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>Track Now</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
