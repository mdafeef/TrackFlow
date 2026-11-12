"use client";

import React, { useState } from "react";
import { Search, Globe, ArrowRight } from "lucide-react";
import { COURIER_LIST, CourierConfig } from "@/lib/couriers";

interface CourierDirectoryProps {
  onSelectCourier: (courierId: string) => void;
}

export function CourierDirectory({ onSelectCourier }: CourierDirectoryProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "india" | "ecommerce" | "global">("all");

  const filtered = COURIER_LIST.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.shortName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.coverage.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (activeFilter === "global") {
      return ["emiratespost", "saudipost", "omanpost", "phlpost", "posindonesia"].includes(c.id);
    }
    if (activeFilter === "ecommerce") {
      return ["ekart", "myntra", "valmo", "shadowfax", "flipkart", "meesho"].includes(c.id);
    }
    if (activeFilter === "india") {
      return !["emiratespost", "saudipost", "omanpost", "phlpost", "posindonesia"].includes(c.id);
    }

    return true;
  });

  return (
    <section id="couriers-section" className="py-12 sm:py-16 border-t border-slate-200/80 dark:border-slate-800/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1.5">
              <Globe className="h-4 w-4" />
              <span>Supported Delivery Network</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              20+ Integrated Delivery Providers
            </h2>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search delivery partner..."
                className="w-full sm:w-52 rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs font-medium text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-900/80 text-xs overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setActiveFilter("all")}
                className={`rounded-lg px-2.5 py-1 font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  activeFilter === "all"
                    ? "bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                All (20)
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("india")}
                className={`rounded-lg px-2.5 py-1 font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  activeFilter === "india"
                    ? "bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                India Express
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("ecommerce")}
                className={`rounded-lg px-2.5 py-1 font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  activeFilter === "ecommerce"
                    ? "bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                E-Commerce
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("global")}
                className={`rounded-lg px-2.5 py-1 font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  activeFilter === "global"
                    ? "bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                Global
              </button>
            </div>
          </div>
        </div>

        {/* Partner Cards Grid: 2 Columns on Mobile View, 3 on Tablet, 4 on Desktop */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
          {filtered.map((c: CourierConfig) => (
            <div
              key={c.id}
              onClick={() => onSelectCourier(c.id)}
              className="group relative flex items-center justify-between gap-2 sm:gap-3 rounded-2xl border border-slate-200/90 bg-white/95 p-2.5 sm:p-3.5 shadow-2xs hover:border-indigo-400 hover:shadow-md dark:border-slate-800/90 dark:bg-slate-900/90 dark:hover:border-indigo-700/80 dark:backdrop-blur-sm transition-all cursor-pointer"
            >
              {/* Logo Emblem & Names */}
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div
                  className={`flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl font-bold text-[10px] sm:text-xs shadow-2xs border ${c.badgeColor.bg} ${c.badgeColor.text} ${c.badgeColor.border} ${c.badgeColor.darkBg} ${c.badgeColor.darkText} ${c.badgeColor.darkBorder} dark:[mix-blend-mode:luminosity] dark:brightness-90 dark:contrast-110 transition-transform group-hover:scale-105`}
                >
                  <span>{c.shortName.slice(0, 3)}</span>
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <h3 className="text-[11px] sm:text-sm font-semibold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {c.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5 text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-400 font-medium truncate">
                    <span className="truncate">{c.coverage}</span>
                  </div>
                </div>
              </div>

              {/* Direct Select Carrier Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectCourier(c.id);
                }}
                className="shrink-0 flex items-center justify-center h-7 w-7 sm:h-8 sm:w-8 rounded-xl bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-700 dark:bg-slate-800/90 dark:hover:bg-indigo-600 dark:text-slate-300 dark:hover:text-white dark:border dark:border-slate-700/60 transition-all cursor-pointer"
                title={`Select ${c.name} to enter tracking code`}
                aria-label={`Select ${c.name}`}
              >
                <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 stroke-[2.2]" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

