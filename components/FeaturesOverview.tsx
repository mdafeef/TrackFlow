"use client";

import React from "react";
import { Zap, MapPin, Share2, BookmarkCheck, Clock, ShieldCheck, Sparkles } from "lucide-react";

export function FeaturesOverview() {
  const features = [
    {
      icon: Zap,
      title: "Instant Carrier Auto-Detection",
      description:
        "Paste any consignment or tracking number. Our regex engine automatically detects the correct carrier with zero manual configuration.",
    },
    {
      icon: MapPin,
      title: "Visual Journey Route Map",
      description:
        "Visualize the physical transit route connecting origin dispatch hubs, regional sorting facilities, and final delivery sub-offices.",
    },
    {
      icon: Share2,
      title: "1-Click WhatsApp Status Cards",
      description:
        "Generate a clean 1080x1080 PNG delivery badge or send formatted WhatsApp updates to family, clients, or buyers.",
    },
    {
      icon: BookmarkCheck,
      title: "Multi-Package Watchlist",
      description:
        "Save all active packages locally in your browser. Assign custom nicknames like 'Birthday Gift' or 'MacBook' and refresh with one click.",
    },
    {
      icon: Clock,
      title: "Predictive ETA & Delivery SLA",
      description:
        "Calculates expected delivery dates based on standard carrier SLA metrics, real-time stage progression, and route distances.",
    },
    {
      icon: ShieldCheck,
      title: "100% Free & Privacy-First",
      description:
        "No signup, no phone numbers, no ads, and no tracking cookies. High-speed parcel tracking accessible to everyone free forever.",
    },
  ];

  return (
    <section id="features-section" className="py-16 bg-slate-50/50 dark:bg-slate-950/30 border-t border-slate-200/80 dark:border-slate-800/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-2">
            <Sparkles className="h-4 w-4" />
            <span>Enhanced Free Capabilities</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Built to Deliver a Better Tracking Experience
          </h2>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
            Everything you need to monitor shipments, verify delivery proofs, and share parcel milestones effortlessly.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={i}
                className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 hover:border-indigo-400 dark:hover:border-indigo-800 transition-colors"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/70 dark:text-indigo-400 mb-4">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {f.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  {f.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
