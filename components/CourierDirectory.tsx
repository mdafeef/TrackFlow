"use client";

import React, { useState } from "react";
import { Search, Globe, ArrowRight } from "lucide-react";
import { COURIER_LIST, CourierConfig } from "@/lib/couriers";

interface CourierDirectoryProps {
  onSelectCourierSample: (trackingNumber: string, courierId: string) => void;
}

export function CourierDirectory({ onSelectCourierSample }: CourierDirectoryProps) {
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
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1.5">
              <Globe className="h-4 w-4" />
              <span>Supported Delivery Network</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
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
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-900/80 text-xs">
              <button
                type="button"
                onClick={() => setActiveFilter("all")}
                className={`rounded-lg px-2.5 py-1 font-semibold transition-colors ${
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
                className={`rounded-lg px-2.5 py-1 font-semibold transition-colors ${
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
                className={`rounded-lg px-2.5 py-1 font-semibold transition-colors ${
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
                className={`rounded-lg px-2.5 py-1 font-semibold transition-colors ${
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

        {/* Medium-Size Partner Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {filtered.map((c: CourierConfig) => (
            <div
              key={c.id}
              onClick={() => onSelectCourierSample(c.sampleNumber, c.id)}
              className="group relative flex items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-2xs hover:border-indigo-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-850 dark:hover:border-indigo-700 transition-all cursor-pointer"
            >
              {/* Logo Emblem & Names */}
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-black text-xs text-white shadow-2xs ${c.badgeColor} transition-transform group-hover:scale-105`}
                >
                  {c.shortName.slice(0, 3)}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {c.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5 text-[11px] text-slate-400 font-mono truncate">
                    <span>{c.sampleNumber}</span>
                  </div>
                </div>
              </div>

              {/* Direct Track Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectCourierSample(c.sampleNumber, c.id);
                }}
                className="shrink-0 flex items-center justify-center h-8 w-8 rounded-xl bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-700 dark:bg-slate-800 dark:hover:bg-indigo-600 dark:text-slate-300 dark:hover:text-white transition-all cursor-pointer"
                title={`Track sample ${c.sampleNumber} with ${c.name}`}
                aria-label={`Track sample with ${c.name}`}
              >
                <ArrowRight className="h-4 w-4 stroke-[2.2]" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

