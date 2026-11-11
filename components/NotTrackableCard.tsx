"use client";

import React from "react";
import {
  PackageSearch,
  BookmarkPlus,
  BookmarkCheck,
  Phone,
  Mail,
  Search,
} from "lucide-react";

interface NotTrackableCardProps {
  trackingNumber: string;
  courierName?: string;
  courierId?: string;
  message?: string;
  supportPhone?: string;
  supportEmail?: string;
  onTrackNextOrder: () => void;
  onSaveToWatchlist?: () => void;
  isSavedInWatchlist?: boolean;
  onSelectSample?: (sampleNum: string, courierId: string) => void;
}

export function NotTrackableCard({
  trackingNumber,
  courierName = "Courier Network",
  courierId,
  message,
  supportPhone,
  supportEmail,
  onTrackNextOrder,
  onSaveToWatchlist,
  isSavedInWatchlist = false,
  onSelectSample,
}: NotTrackableCardProps) {
  return (
    <div className="w-full max-w-2xl mx-auto py-2">
      <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs dark:border-slate-800 dark:bg-slate-900/90 text-left transition-colors">
        {/* Header Icon & Title */}
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/70 dark:text-amber-400 border border-amber-200/80 dark:border-amber-900/60 shadow-2xs">
            <PackageSearch className="h-6 w-6 stroke-[2.2]" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                {courierName}
              </span>
              <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400">
                #{trackingNumber}
              </span>
            </div>

            <h3 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-white">
              No Tracking Records Available
            </h3>

            <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              {message ||
                `No movement checkpoints or manifest data found for consignment #${trackingNumber}. If booked recently, carriers take 12–24 hours to sync initial scan logs. Please verify your consignment number.`}
            </p>
          </div>
        </div>

        {/* Clean Action Strip */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onTrackNextOrder}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer"
            >
              <Search className="h-3.5 w-3.5" />
              <span>Track Another ID</span>
            </button>

            {onSaveToWatchlist && (
              <button
                type="button"
                onClick={onSaveToWatchlist}
                disabled={isSavedInWatchlist}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer ${
                  isSavedInWatchlist
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200"
                }`}
              >
                {isSavedInWatchlist ? (
                  <>
                    <BookmarkCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Saved to Watchlist</span>
                  </>
                ) : (
                  <>
                    <BookmarkPlus className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Watch for Updates</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Carrier Support Contacts */}
          {(supportPhone || supportEmail) && (
            <div className="flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400">
              <span className="text-[11px] font-semibold text-slate-500">{courierName} Support:</span>
              {supportPhone && (
                <a
                  href={`tel:${supportPhone}`}
                  className="inline-flex items-center gap-1 font-mono font-bold text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  <Phone className="h-3 w-3" />
                  <span>{supportPhone}</span>
                </a>
              )}
              {supportEmail && (
                <a
                  href={`mailto:${supportEmail}`}
                  className="inline-flex items-center gap-1 text-slate-600 hover:underline dark:text-slate-300"
                >
                  <Mail className="h-3 w-3" />
                  <span>Email</span>
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
