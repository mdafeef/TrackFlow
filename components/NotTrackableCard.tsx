"use client";

import React from "react";
import {
  PackageSearch,
  Clock,
  CheckCircle2,
  HelpCircle,
  Phone,
  Mail,
  PlusCircle,
  BookmarkPlus,
  BookmarkCheck,
  RotateCcw,
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
    <div className="mx-auto max-w-4xl px-4 sm:px-6 mb-12">
      <div className="rounded-2xl border border-amber-200/90 bg-white p-6 sm:p-8 shadow-sm dark:border-amber-900/50 dark:bg-slate-900 transition-colors">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-start gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <PackageSearch className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="rounded-md bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/50">
                  {courierName}
                </span>
                <span className="font-mono text-xs tabular-nums font-semibold text-slate-500 dark:text-slate-400">
                  #{trackingNumber}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Your Parcel is Not Trackable Yet
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xl">
                {message ||
                  "We couldn't retrieve online tracking records for this consignment number yet. It may take up to 24-48 hours for the carrier to update the manifest, or please verify the consignment number."}
              </p>
            </div>
          </div>

          {/* Quick CTA */}
          <button
            type="button"
            onClick={onTrackNextOrder}
            className="flex items-center gap-1.5 self-start shrink-0 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Track Next Order</span>
          </button>
        </div>

        {/* 3 Common Reasons Cards */}
        <div className="my-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-950/50">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white mb-1.5">
              <Clock className="h-4 w-4 text-amber-500 shrink-0" />
              <span>Recently Booked</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Consignments often take 12 to 24 hours after booking or pickup to appear in carrier scan databases.
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-950/50">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white mb-1.5">
              <HelpCircle className="h-4 w-4 text-indigo-500 shrink-0" />
              <span>Verify Consignment ID</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Check for transposed letters or digits (e.g., &quot;0&quot; vs &quot;O&quot;, or missing prefix/suffix like &quot;IN&quot;).
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-950/50">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white mb-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Carrier Network</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Ensure you selected the right carrier. Try selecting &quot;Auto-Detect Courier&quot; if you are unsure.
            </p>
          </div>
        </div>

        {/* Action Button Strip */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onTrackNextOrder}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Track Next Order</span>
            </button>

            {onSaveToWatchlist && (
              <button
                type="button"
                onClick={onSaveToWatchlist}
                disabled={isSavedInWatchlist}
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold shadow-xs transition-colors cursor-pointer ${
                  isSavedInWatchlist
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200"
                }`}
              >
                {isSavedInWatchlist ? (
                  <>
                    <BookmarkCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Saved to Watchlist</span>
                  </>
                ) : (
                  <>
                    <BookmarkPlus className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Save for Later Refresh</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Carrier Support Contacts */}
          {(supportPhone || supportEmail) && (
            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {courierName} Help:
              </span>
              {supportPhone && (
                <a
                  href={`tel:${supportPhone}`}
                  className="inline-flex items-center gap-1 text-indigo-600 hover:underline dark:text-indigo-400 font-mono"
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

        {/* Quick Test Samples */}
        {onSelectSample && (
          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium text-slate-700 dark:text-slate-300">
              Or test verified tracking numbers:
            </span>
            <button
              type="button"
              onClick={() => onSelectSample("EL855948961IN", "speedpost")}
              className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-[11px] text-slate-700 hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 transition-colors cursor-pointer"
            >
              India Post: EL855948961IN
            </button>
            <button
              type="button"
              onClick={() => onSelectSample("B4000211866", "dtdc")}
              className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-[11px] text-slate-700 hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 transition-colors cursor-pointer"
            >
              DTDC: B4000211866
            </button>
            <button
              type="button"
              onClick={() => onSelectSample("FMPP4397267510", "ekart")}
              className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-[11px] text-slate-700 hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 transition-colors cursor-pointer"
            >
              Ekart: FMPP4397267510
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
