"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  PackageSearch,
  Moon,
  Sun,
  BookmarkCheck,
  ArrowRight,
  LayoutDashboard,
  Search,
  Menu,
  X,
  Truck,
  Sparkles,
  HelpCircle,
} from "lucide-react";

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
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const handleMobileSectionJump = (sectionId: string) => {
    setIsMobileNavOpen(false);
    onChangeView("single");
    setTimeout(() => onNavigateSection(sectionId), 60);
  };

  const handleMobileMenuClick = () => {
    if (activeView === "bulk") {
      setIsMobileNavOpen(false);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("trackflow:toggle-workspace-drawer"));
      }
      return;
    }
    setIsMobileNavOpen((prev) => !prev);
  };

  return (
    <header className="sticky top-0 z-40 w-full max-w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/95 transition-colors">
      <div
        className={`flex h-14 sm:h-16 items-center justify-between gap-2 sm:gap-5 px-3 sm:px-6 ${
          activeView === "bulk" ? "w-full" : "mx-auto max-w-[1440px] lg:px-8"
        }`}
      >
        {/* Zone 1: Brand Wordmark & Mode Switcher */}
        <div className="flex items-center gap-2 sm:gap-3.5 min-w-0">
          <Link
            href="/"
            onClick={() => {
              onChangeView("single");
              setIsMobileNavOpen(false);
            }}
            className="flex items-center gap-1.5 sm:gap-2 font-extrabold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 group"
          >
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-sm shadow-indigo-500/25 transition-transform group-hover:scale-105 shrink-0">
              <PackageSearch className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <span className="text-sm sm:text-xl font-black tracking-tight">
              Track<span className="text-indigo-600 dark:text-indigo-400">Flow</span>
            </span>
          </Link>

          {/* Clean Segmented Mode Switcher (Single vs Workspace) */}
          <div className="flex items-center rounded-xl border border-slate-200/80 bg-slate-100/90 p-0.5 sm:p-1 dark:border-slate-800 dark:bg-slate-900 shrink-0">
            <button
              type="button"
              onClick={() => {
                onChangeView("single");
                setIsMobileNavOpen(false);
              }}
              className={`flex items-center gap-1 sm:gap-1.5 rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
                activeView === "single"
                  ? "bg-white text-indigo-600 shadow-xs dark:bg-slate-800 dark:text-indigo-400"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <Search className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
              <span>Single</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onChangeView("bulk");
                setIsMobileNavOpen(false);
              }}
              className={`flex items-center gap-1 sm:gap-1.5 rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
                activeView === "bulk"
                  ? "bg-white text-indigo-600 shadow-xs dark:bg-slate-800 dark:text-indigo-400"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <LayoutDashboard className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
              <span>Workspace</span>
            </button>
          </div>
        </div>

        {/* Zone 2: Navigation Links (Desktop Single View) */}
        {activeView === "single" && (
          <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <button
              type="button"
              onClick={() => {
                onChangeView("single");
                setTimeout(() => onNavigateSection("track-section"), 50);
              }}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors whitespace-nowrap cursor-pointer"
            >
              Track
            </button>
            <button
              type="button"
              onClick={() => {
                onChangeView("single");
                setTimeout(() => onNavigateSection("couriers-section"), 50);
              }}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors whitespace-nowrap cursor-pointer"
            >
              Carriers
            </button>
            <button
              type="button"
              onClick={() => {
                onChangeView("single");
                setTimeout(() => onNavigateSection("features-section"), 50);
              }}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors whitespace-nowrap cursor-pointer"
            >
              Features
            </button>
            <button
              type="button"
              onClick={() => {
                onChangeView("single");
                setTimeout(() => onNavigateSection("faq-section"), 50);
              }}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors whitespace-nowrap cursor-pointer"
            >
              FAQ
            </button>
          </nav>
        )}

        {/* Zone 3: Actions, Watchlist & Mobile Menu Button */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label="Toggle theme"
            className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-slate-200/90 bg-slate-50/80 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white transition-colors cursor-pointer shrink-0"
          >
            {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={onOpenWatchlist}
            aria-label="Open watchlist"
            className="relative flex h-8 sm:h-9 items-center gap-1.5 sm:gap-2 rounded-xl border border-slate-200/90 bg-white px-2 sm:px-3.5 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:border-indigo-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-800 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
          >
            <BookmarkCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="hidden sm:inline">Watchlist</span>
            {watchlistCount > 0 && (
              <span className="flex h-4.5 min-w-4.5 sm:h-5 sm:min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-extrabold text-white tabular-nums">
                {watchlistCount}
              </span>
            )}
          </button>

          {activeView === "single" && (
            <button
              type="button"
              onClick={() => {
                onChangeView("single");
                setTimeout(() => onNavigateSection("track-section"), 50);
              }}
              className="hidden sm:flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 sm:px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Track Now</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Mobile Menu Toggle Button (Opens Left Workspace Drawer in Workspace view, or Section Menu in Single view) */}
          <button
            type="button"
            onClick={handleMobileMenuClick}
            aria-label="Toggle mobile menu"
            className="flex lg:hidden h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-slate-200/90 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            {activeView === "single" && isMobileNavOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Responsive Mobile Navigation Dropdown (Single Tracker View Only) */}
      {activeView === "single" && isMobileNavOpen && (
        <div className="lg:hidden border-t border-slate-200/80 dark:border-slate-800/80 bg-white/98 dark:bg-slate-950/98 backdrop-blur-xl px-4 py-3 space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => handleMobileSectionJump("track-section")}
              className="flex items-center gap-2 rounded-xl bg-slate-100/80 hover:bg-slate-200/70 dark:bg-slate-900 dark:hover:bg-slate-800 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <Search className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
              <span>Track</span>
            </button>
            <button
              type="button"
              onClick={() => handleMobileSectionJump("couriers-section")}
              className="flex items-center gap-2 rounded-xl bg-slate-100/80 hover:bg-slate-200/70 dark:bg-slate-900 dark:hover:bg-slate-800 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <Truck className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
              <span>Carriers</span>
            </button>
            <button
              type="button"
              onClick={() => handleMobileSectionJump("features-section")}
              className="flex items-center gap-2 rounded-xl bg-slate-100/80 hover:bg-slate-200/70 dark:bg-slate-900 dark:hover:bg-slate-800 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
              <span>Features</span>
            </button>
            <button
              type="button"
              onClick={() => handleMobileSectionJump("faq-section")}
              className="flex items-center gap-2 rounded-xl bg-slate-100/80 hover:bg-slate-200/70 dark:bg-slate-900 dark:hover:bg-slate-800 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <HelpCircle className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
              <span>FAQ</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
