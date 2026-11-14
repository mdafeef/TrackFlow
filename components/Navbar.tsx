"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  PackageSearch,
  Moon,
  Sun,
  BookmarkCheck,
  Search,
  X,
  Truck,
  Sparkles,
  HelpCircle,
  LogIn,
  LogOut,
  LayoutDashboard,
  PanelLeftOpen,
} from "lucide-react";
import { AuthUserProfile } from "@/app/api/auth/route";
import { PWAInstallButton } from "@/components/PWAInstallButton";
import { PublicTabId } from "@/lib/tabRoutes";

interface NavbarProps {
  watchlistCount: number;
  onOpenWatchlist: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  publicTab: PublicTabId;
  onSelectPublicTab: (tab: PublicTabId) => void;
  activeView: "single" | "bulk";
  onChangeView: (view: "single" | "bulk") => void;
  authUser?: AuthUserProfile | null;
  onOpenLogin?: () => void;
  onLogout?: () => void;
}

export function Navbar({
  watchlistCount,
  onOpenWatchlist,
  isDark,
  onToggleTheme,
  publicTab,
  onSelectPublicTab,
  activeView,
  onChangeView,
  authUser,
  onOpenLogin,
  onLogout,
}: NavbarProps) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isWorkspaceDrawerOpen, setIsWorkspaceDrawerOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const mobileMenuRef = useRef<HTMLDivElement | null>(null);
  const hamburgerBtnRef = useRef<HTMLButtonElement | null>(null);

  // Sync workspace mobile menu & sidebar collapse state via custom events from BulkDashboard
  useEffect(() => {
    const handleWorkspaceState = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;
      if (typeof detail.isMobileSidebarOpen === "boolean") {
        setIsWorkspaceDrawerOpen(detail.isMobileSidebarOpen);
      }
      if (typeof detail.isSidebarCollapsed === "boolean") {
        setIsSidebarCollapsed(detail.isSidebarCollapsed);
      }
    };
    window.addEventListener("trackflow:workspace-state", handleWorkspaceState);
    return () => window.removeEventListener("trackflow:workspace-state", handleWorkspaceState);
  }, []);

  // Close Single Tracker mobile menu when clicking anywhere outside (including header)
  useEffect(() => {
    if (!isMobileNavOpen) return;
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (mobileMenuRef.current?.contains(target)) return;
      if (hamburgerBtnRef.current?.contains(target)) return;
      setIsMobileNavOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [isMobileNavOpen]);

  const handleMobileTabSelect = (tab: PublicTabId) => {
    setIsMobileNavOpen(false);
    onSelectPublicTab(tab);
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

  const isMenuOpen = activeView === "bulk" ? isWorkspaceDrawerOpen : isMobileNavOpen;
  const isWorkspaceActive = activeView === "bulk" && !!authUser;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 h-14 sm:h-16 bg-white/95 backdrop-blur-md dark:bg-slate-900/95 transition-all duration-200 ${
        isWorkspaceActive
          ? isSidebarCollapsed
            ? "md:left-[68px]"
            : "md:left-60 xl:left-64"
          : "w-full max-w-full border-b border-slate-200/90 dark:border-slate-800/90"
      }`}
    >
      <div
        className={`relative flex h-full items-center justify-between ${
          isWorkspaceActive
            ? "w-full px-3.5 sm:px-6 lg:px-8"
            : "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8"
        }`}
      >
        {/* Zone 1: Brand Logo on Single/Mobile + Expand Toggle right after collapsed sidebar logo */}
        <div className="flex h-full items-center gap-2 shrink-0">
          <Link
            href="/"
            onClick={(e) => {
              e.preventDefault();
              if (activeView === "bulk") {
                if (typeof window !== "undefined") {
                  window.dispatchEvent(
                    new CustomEvent("trackflow:set-workspace-menu", {
                      detail: { menu: "dashboard" },
                    })
                  );
                }
              } else {
                onSelectPublicTab("track");
              }
              setIsMobileNavOpen(false);
            }}
            className={`flex items-center gap-2.5 font-extrabold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 group ${
              isWorkspaceActive ? "md:hidden" : ""
            }`}
            title="TrackFlow"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-sm shadow-indigo-500/25 transition-transform group-hover:scale-105 shrink-0">
              <PackageSearch className="h-4.5 w-4.5" />
            </div>
            <span className="text-lg sm:text-xl font-black tracking-tight">
              Track<span className="text-indigo-600 dark:text-indigo-400">Flow</span>
            </span>
          </Link>

          {/* When sidebar is collapsed, show Expand Icon right after the collapsed sidebar logo */}
          {isWorkspaceActive && isSidebarCollapsed && (
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("trackflow:toggle-sidebar-collapse"));
                }
              }}
              title="Expand sidebar"
              aria-label="Expand sidebar"
              className="hidden md:inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-indigo-400 transition-colors cursor-pointer shrink-0 -ml-1"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Zone 2: Public Navigation Tabs (Centered horizontally on Desktop Single View — switches tabs silently in same page) */}
        {activeView === "single" && (
          <nav className="hidden md:flex items-center gap-1 md:absolute md:left-1/2 md:-translate-x-1/2 rounded-xl border border-slate-200/80 bg-slate-100/75 p-1 dark:border-slate-800 dark:bg-slate-800/80">
            {(
              [
                { id: "track", label: "Track" },
                { id: "carriers", label: "Carriers" },
                { id: "features", label: "Features" },
                { id: "faq", label: "FAQ" },
              ] as const
            ).map((item) => {
              const isActive = publicTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectPublicTab(item.id)}
                  className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? "bg-white text-indigo-600 shadow-2xs dark:bg-slate-900 dark:text-indigo-400"
                      : "text-slate-600 hover:bg-white/70 hover:text-indigo-600 dark:text-slate-300 dark:hover:bg-slate-900/60 dark:hover:text-indigo-400"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        )}

        {/* Zone 3: Right Actions, Theme, Auth/Dashboard Trigger & Hamburger Menu */}
        <div className="flex items-center gap-2 shrink-0">

          {/* In Workspace Mode: Quick Track button to visit Public Single Tracker */}
          {activeView === "bulk" && (
            <button
              type="button"
              onClick={() => onSelectPublicTab("track")}
              className="inline-flex h-8 sm:h-9 items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-2.5 sm:px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              title="Switch to Public Parcel Tracker"
            >
              <Search className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span className="hidden sm:inline">Quick Track</span>
            </button>
          )}

          {/* In Single Mode: Watchlist Drawer Trigger */}
          {activeView === "single" && (
            <button
              type="button"
              onClick={onOpenWatchlist}
              aria-label="Open watchlist"
              className="relative flex h-8 sm:h-9 items-center gap-1.5 sm:gap-2 rounded-xl border border-slate-200/90 bg-white px-2.5 sm:px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:border-indigo-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-800 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
            >
              <BookmarkCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span className="hidden sm:inline">Watchlist</span>
              {watchlistCount > 0 && (
                <span className="flex h-4.5 min-w-4.5 sm:h-5 sm:min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-extrabold text-white tabular-nums">
                  {watchlistCount}
                </span>
              )}
            </button>
          )}

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label="Toggle theme"
            className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-slate-200/90 bg-slate-50/80 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white transition-colors cursor-pointer shrink-0"
          >
            {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* In Single Mode: Sign In or Dashboard (Removed from header when hamburger menu appears on < md since hamburger menu includes it) */}
          {activeView === "single" && (
            !authUser ? (
              <button
                type="button"
                onClick={onOpenLogin}
                className="hidden md:inline-flex h-8 sm:h-9 items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-3 sm:px-3.5 py-1.5 text-xs font-bold text-white shadow-xs whitespace-nowrap shrink-0 transition-colors cursor-pointer"
              >
                <LogIn className="h-3.5 w-3.5 shrink-0" />
                <span>Sign In</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onChangeView("bulk")}
                className="hidden md:inline-flex h-8 sm:h-9 items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-3 sm:px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer shrink-0"
                title={`Open Dashboard (${authUser.fullName})`}
              >
                <LayoutDashboard className="h-3.5 w-3.5 shrink-0" />
                <span>Dashboard</span>
              </button>
            )
          )}

          {/* Mobile Hamburger Menu Button */}
          <button
            ref={hamburgerBtnRef}
            type="button"
            id="trackflow-hamburger-btn"
            onClick={handleMobileMenuClick}
            aria-label="Toggle menu"
            aria-expanded={isMenuOpen}
            className={`flex md:hidden h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border transition-all cursor-pointer shrink-0 ${
              isMenuOpen
                ? "border-indigo-500 bg-indigo-600 text-white shadow-xs"
                : "border-slate-200/90 bg-white text-slate-700 hover:border-indigo-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            }`}
          >
            {isMenuOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <div className="flex flex-col items-end justify-center gap-1 w-4">
                <span className="h-0.5 w-4 rounded-full bg-current transition-all" />
                <span className="h-0.5 w-3 rounded-full bg-current transition-all" />
                <span className="h-0.5 w-3.5 rounded-full bg-current transition-all" />
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Animated Floating Top-Right Menu Popover (Single Tracker Mode — Zero Fade, Click Anywhere Closes) */}
      <AnimatePresence>
        {activeView === "single" && isMobileNavOpen && (
          <motion.div
            ref={mobileMenuRef}
            initial={{ opacity: 0, scale: 0.92, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: -8 }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
            style={{ transformOrigin: "top right" }}
            className="fixed top-15 right-3 sm:right-5 z-50 md:hidden w-64 rounded-2xl border border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 p-2.5 shadow-2xl"
          >
            <div className="space-y-1">
              {(
                [
                  { id: "track", label: "Track Shipment", icon: Search },
                  { id: "carriers", label: "Supported Carriers", icon: Truck },
                  { id: "features", label: "Platform Features", icon: Sparkles },
                  { id: "faq", label: "Help & FAQ", icon: HelpCircle },
                ] as const
              ).map((navItem) => {
                const Icon = navItem.icon;
                const isActive = publicTab === navItem.id;
                return (
                  <button
                    key={navItem.id}
                    type="button"
                    onClick={() => handleMobileTabSelect(navItem.id)}
                    className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold transition-colors cursor-pointer ${
                      isActive
                        ? "bg-indigo-600 text-white shadow-2xs"
                        : "text-slate-700 hover:bg-indigo-50/80 hover:text-indigo-600 dark:text-slate-200 dark:hover:bg-slate-800/80 dark:hover:text-indigo-400"
                    }`}
                  >
                    <Icon
                      className={`h-3.5 w-3.5 shrink-0 ${
                        isActive ? "text-white" : "text-indigo-500"
                      }`}
                    />
                    <span>{navItem.label}</span>
                  </button>
                );
              })}
              <PWAInstallButton
                variant="menu"
                onAfterClick={() => setIsMobileNavOpen(false)}
              />
            </div>

            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-1.5">
              {!authUser ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileNavOpen(false);
                    if (onOpenLogin) onOpenLogin();
                  }}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-3 py-2 text-xs font-bold text-white shadow-2xs transition-colors cursor-pointer"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  <span>Sign In</span>
                </button>
              ) : (
                <div className="flex items-center justify-between gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileNavOpen(false);
                      onChangeView("bulk");
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-3 py-2 text-xs font-bold text-white shadow-2xs truncate cursor-pointer"
                  >
                    <LayoutDashboard className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">Dashboard</span>
                  </button>
                  {onLogout && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileNavOpen(false);
                        onLogout();
                      }}
                      className="rounded-xl border border-rose-200 bg-rose-50 p-2 text-rose-600 dark:border-rose-900/60 dark:bg-rose-950/60 dark:text-rose-300 cursor-pointer shrink-0"
                      title="Sign Out"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
