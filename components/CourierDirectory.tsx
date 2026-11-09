"use client";

import React, { useState } from "react";
import { Search, Globe, Clock, ShieldCheck, ArrowUpRight } from "lucide-react";
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
    <section id="couriers-section" className="py-16 border-t border-slate-200/80 dark:border-slate-800/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-2">
              <Globe className="h-4 w-4" />
              <span>Supported Courier Network</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              20+ Integrated Delivery Providers
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
              Automatic regex format verification, real-time checkpoint synchronization, and official customer care contacts.
            </p>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search couriers..."
                className="w-full sm:w-56 rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs font-medium text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-900/80 text-xs">
              <button
                type="button"
                onClick={() => setActiveFilter("all")}
                className={`rounded-lg px-3 py-1 font-semibold transition-colors ${
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
                className={`rounded-lg px-3 py-1 font-semibold transition-colors ${
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
                className={`rounded-lg px-3 py-1 font-semibold transition-colors ${
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
                className={`rounded-lg px-3 py-1 font-semibold transition-colors ${
                  activeFilter === "global"
                    ? "bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                International
              </button>
            </div>
          </div>
        </div>

        {/* Courier Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((c: CourierConfig) => (
            <div
              key={c.id}
              className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 hover:border-indigo-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-700 transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {c.name}
                  </h3>
                  <span className="shrink-0 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                    {c.shortName}
                  </span>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  {c.coverage}
                </p>

                <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800/80 pt-3">
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <Clock className="h-3 w-3 text-slate-400 shrink-0" />
                    <span>Average SLA: <strong className="font-semibold text-slate-800 dark:text-slate-200">{c.avgTransitDays}</strong></span>
                  </div>
                  <div className="flex items-start gap-1.5 text-[11px]">
                    <ShieldCheck className="h-3 w-3 text-slate-400 shrink-0 mt-0.5" />
                    <span className="text-slate-500 dark:text-slate-400 truncate">
                      Format: <span className="font-mono">{c.formatDescription}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button: Test Sample */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                <span className="font-mono text-[10px] text-slate-400 truncate max-w-[130px]">
                  Sample: {c.sampleNumber}
                </span>

                <button
                  type="button"
                  onClick={() => onSelectCourierSample(c.sampleNumber, c.id)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors cursor-pointer"
                >
                  <span>Test Track</span>
                  <ArrowUpRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
