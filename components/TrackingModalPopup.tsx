"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Share2,
  BookmarkPlus,
  BookmarkCheck,
  RefreshCw,
  Copy,
  Check,
  Truck,
  PlusCircle,
  MapPin,
  Clock,
  Package,
  Calendar,
  Building2,
  CheckCircle2,
  Phone,
  Receipt,
  Send,
  Inbox,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ShieldCheck,
  Navigation,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import { TrackingResult, TrackingActivity } from "@/app/api/track/route";
import { TrackingFetchingAnimation } from "./TrackingFetchingAnimation";
import { NotTrackableCard } from "./NotTrackableCard";

interface TrackingModalPopupProps {
  isOpen: boolean;
  isLoading: boolean;
  trackingResult: TrackingResult | null;
  notTrackableInfo: {
    trackingNumber: string;
    courierName: string;
    courierId?: string;
    message?: string;
    supportPhone?: string;
    supportEmail?: string;
  } | null;
  errorMsg: string | null;
  pendingQuery: {
    number: string;
    courierName: string;
  };
  onClose: () => void;
  onTrackNextOrder: () => void;
  onRefresh: () => void;
  onShare: () => void;
  isSavedInWatchlist: boolean;
  onToggleWatchlist: () => void;
  onSelectSample?: (num: string, courierId: string) => void;
}

export function TrackingModalPopup({
  isOpen,
  isLoading,
  trackingResult,
  notTrackableInfo,
  errorMsg,
  pendingQuery,
  onClose,
  onTrackNextOrder,
  onRefresh,
  onShare,
  isSavedInWatchlist,
  onToggleWatchlist,
  onSelectSample,
}: TrackingModalPopupProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [isExpandedAll, setIsExpandedAll] = useState(false);

  // In-render state sync to avoid useEffect cascade on trackingNumber change
  const [prevTrackingNum, setPrevTrackingNum] = useState<string | undefined>(
    trackingResult?.trackingNumber
  );

  if (trackingResult?.trackingNumber !== prevTrackingNum) {
    setPrevTrackingNum(trackingResult?.trackingNumber);
    setIsExpandedAll(false);
  }

  // Destination at TOP and Starting at BOTTOM
  const chronologicalActivities = useMemo(() => {
    if (!trackingResult?.activities || trackingResult.activities.length === 0) return [];
    const acts = [...trackingResult.activities];
    const firstStage = acts[0].stage;
    const lastStage = acts[acts.length - 1].stage;
    // If raw list starts with booked / origin at top, reverse so Destination/Delivered is at TOP (index 0) and Starting/Booked is at BOTTOM
    if (firstStage === "booked" || (lastStage === "delivered" && firstStage !== "delivered")) {
      return acts.reverse();
    }
    return acts;
  }, [trackingResult]);

  const INITIAL_VISIBLE_COUNT = 4;

  // Strict sequential order (Destination at top -> Starting at bottom)
  // Shows initial checkpoints in uninterrupted sequential order without skipping milestones.
  // Clicking "See all" expands and reveals the remaining balance in continuous order.
  const displayActivities = useMemo(() => {
    if (isExpandedAll || chronologicalActivities.length <= INITIAL_VISIBLE_COUNT) {
      return chronologicalActivities;
    }
    return chronologicalActivities.slice(0, INITIAL_VISIBLE_COUNT);
  }, [isExpandedAll, chronologicalActivities]);

  // Toggle see all updates
  const handleToggleExpand = () => {
    setIsExpandedAll((prev) => !prev);
  };

  // Lock background scroll and hide behind-page scrollbar when modal is open
  useEffect(() => {
    if (isOpen) {
      document.documentElement.classList.add("modal-scroll-lock");
      document.body.classList.add("modal-scroll-lock");
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    } else {
      document.documentElement.classList.remove("modal-scroll-lock");
      document.body.classList.remove("modal-scroll-lock");
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    }
    return () => {
      document.documentElement.classList.remove("modal-scroll-lock");
      document.body.classList.remove("modal-scroll-lock");
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    if (typeof navigator !== "undefined" && trackingResult) {
      const summary = `TrackFlow Consignment #${trackingResult.trackingNumber} (${trackingResult.courier.name}) — Status: ${trackingResult.overallStatus.phrase} (${trackingResult.overallStatus.timestamp})`;
      navigator.clipboard.writeText(summary);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // Helper to extract clean PIN and location without fake fallbacks
  const parsePinLocation = (text?: string) => {
    if (!text || text === "N/A" || text === "Null" || text.includes("Destination Hub") || text.includes("Origin Facility")) {
      return null;
    }
    const pinMatch = text.match(/\b\d{6}\b/);
    const pin = pinMatch ? pinMatch[0] : "";
    const name = text
      .replace(/\(\d{6}\)/g, "")
      .replace(/\b\d{6}\b/g, "")
      .replace(/^[,\s-]+|[,\s-]+$/g, "")
      .trim();

    if (!name && !pin) return null;
    return {
      pin,
      name: name || (pin ? `PIN ${pin}` : ""),
    };
  };

  const originParsed = parsePinLocation(trackingResult?.bookingDetails?.origin);
  const destParsed = parsePinLocation(trackingResult?.bookingDetails?.destination);

  // Clean status description to eliminate marketing filler phrases
  const rawStatusMessage = trackingResult?.estimatedDelivery?.message || "";
  const isGenericFiller =
    rawStatusMessage.toLowerCase().includes("moving on schedule across") ||
    rawStatusMessage.toLowerCase().includes("moving on schedule");
  const cleanStatusDescription = isGenericFiller
    ? trackingResult?.activities?.[0]?.statusText
      ? `${trackingResult.activities[0].statusText}${trackingResult.activities[0].facility ? ` at ${trackingResult.activities[0].facility}` : ""}`
      : `Active shipment with ${trackingResult?.courier?.name || "carrier"}.`
    : rawStatusMessage;

  // Distinct icons and styles for each logistics checkpoint
  const getCheckpointStyle = (act: TrackingActivity) => {
    const text = act.statusText.toLowerCase();

    // 0. Returned / RTO
    if (text.includes("return") || text.includes("rto") || (act.stage as string) === "returned") {
      return {
        iconBg: "bg-rose-500 text-white shadow-xs shadow-rose-500/20",
        dotColor: "bg-rose-500 ring-4 ring-rose-500/25",
        icon: <RotateCcw className="h-4 w-4 stroke-[2.4]" />,
        badgeText: "Returned to Shipper",
      };
    }

    // 1. Delivered
    if (text.includes("delivered") || act.stage === "delivered") {
      return {
        iconBg: "bg-emerald-500 text-white shadow-xs shadow-emerald-500/20",
        dotColor: "bg-emerald-500 ring-4 ring-emerald-500/25",
        icon: <Check className="h-4 w-4 stroke-[3]" />,
        badgeText: "Delivered",
      };
    }

    // 2. Out for Delivery
    if (text.includes("out for delivery") || act.stage === "out_for_delivery") {
      return {
        iconBg: "bg-amber-500 text-white shadow-xs shadow-amber-500/20",
        dotColor: "bg-amber-500 ring-4 ring-amber-500/25",
        icon: <Truck className="h-4 w-4 stroke-[2.4]" />,
        badgeText: "Out For Delivery",
      };
    }

    // 3. Item Received at Destination
    if (text.includes("destination") || text.includes("item received at destination")) {
      return {
        iconBg: "bg-indigo-600 text-white shadow-xs shadow-indigo-500/20",
        dotColor: "bg-indigo-600 ring-4 ring-indigo-500/25",
        icon: <Inbox className="h-4 w-4 stroke-[2.4]" />,
        badgeText: "Destination Arrived",
      };
    }

    // 4. Bag Received / Sorting Hub
    if (text.includes("bag received") || text.includes("item received")) {
      return {
        iconBg: "bg-sky-600 text-white shadow-xs shadow-sky-500/20",
        dotColor: "bg-sky-600 ring-4 ring-sky-500/25",
        icon: <Package className="h-4 w-4 stroke-[2.4]" />,
        badgeText: "Sorting Facility",
      };
    }

    // 5. Dispatched
    if (text.includes("dispatched") || act.stage === "in_transit") {
      return {
        iconBg: "bg-purple-600 text-white shadow-xs shadow-purple-500/20",
        dotColor: "bg-purple-600 ring-4 ring-purple-500/25",
        icon: <Send className="h-3.5 w-3.5 stroke-[2.4]" />,
        badgeText: "Dispatched",
      };
    }

    // 6. Item Booked
    return {
      iconBg: "bg-slate-700 text-white shadow-xs shadow-slate-500/20",
      dotColor: "bg-slate-700 ring-4 ring-slate-500/25",
      icon: <Receipt className="h-4 w-4 stroke-[2.4]" />,
      badgeText: "Booked",
    };
  };

  const isReturned =
    trackingResult?.overallStatus?.variant === "returned" ||
    (trackingResult?.overallStatus?.phrase && trackingResult.overallStatus.phrase.toLowerCase().includes("return")) ||
    (trackingResult?.overallStatus?.phrase && trackingResult.overallStatus.phrase.toLowerCase().includes("rto"));

  const isDelivered =
    !isReturned &&
    (trackingResult?.overallStatus?.stage === "delivered" ||
      (trackingResult?.overallStatus?.phrase && trackingResult.overallStatus.phrase.toLowerCase().includes("delivered")));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 md:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      {/* Background click dismiss */}
      <div className="fixed inset-0 hidden sm:block" onClick={onClose} aria-hidden="true" />

      {/* Main Dialog Window: Fullscreen on mobile, executive max-w-5xl/6xl on desktop */}
      <div
        className="relative z-10 w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-5xl lg:max-w-6xl sm:rounded-[32px] overflow-hidden bg-white dark:bg-slate-900 border-0 sm:border border-slate-200/90 dark:border-slate-800 shadow-2xl flex flex-col transition-all"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* ============================================================== */}
        {/* 1. TOP HEADER BAR                                              */}
        {/* ============================================================== */}
        <div className="border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 sm:px-6 py-3.5 shrink-0 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/80 dark:text-indigo-400 shadow-2xs">
              <Package className="h-5 w-5 stroke-[2.4]" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
                  {trackingResult ? trackingResult.courier.name : pendingQuery.courierName || "Parcel Tracker"}
                </h3>
                <span className="rounded-full bg-indigo-50 dark:bg-indigo-950/80 px-2.5 py-0.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/60">
                  {trackingResult?.courier.shortName || "Live"}
                </span>
                <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Verified Carrier Data</span>
                </span>
              </div>
              <div className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                #{trackingResult ? trackingResult.trackingNumber : pendingQuery.number}
              </div>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-1.5">
            {trackingResult && !isLoading && (
              <>
                <button
                  type="button"
                  onClick={onRefresh}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Refresh live status"
                >
                  <RefreshCw className="h-4 w-4 stroke-[2.2]" />
                </button>
                <button
                  type="button"
                  onClick={onShare}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Share status card"
                >
                  <Share2 className="h-4 w-4 stroke-[2.2]" />
                </button>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Copy tracking link"
                >
                  {copiedLink ? <Check className="h-4 w-4 text-emerald-600 stroke-[3]" /> : <Copy className="h-4 w-4 stroke-[2.2]" />}
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="h-5 w-5 stroke-[2.4]" />
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 2. BODY CONTENT (SCROLLABLE & RESPONSIVE)                      */}
        {/* ============================================================== */}
        <div
          className="overflow-y-auto flex-1 p-4 sm:p-6 lg:p-7 space-y-5 sm:space-y-6"
        >
          {/* Loading Animation */}
          {isLoading && (
            <div className="py-6">
              <TrackingFetchingAnimation
                trackingNumber={pendingQuery.number}
                courierName={pendingQuery.courierName}
              />
            </div>
          )}

          {/* Not Trackable State */}
          {!isLoading && notTrackableInfo && (
            <NotTrackableCard
              trackingNumber={notTrackableInfo.trackingNumber}
              courierName={notTrackableInfo.courierName}
              courierId={notTrackableInfo.courierId}
              message={notTrackableInfo.message}
              supportPhone={notTrackableInfo.supportPhone}
              supportEmail={notTrackableInfo.supportEmail}
              onTrackNextOrder={() => {
                onClose();
                onTrackNextOrder();
              }}
              onSaveToWatchlist={onToggleWatchlist}
              isSavedInWatchlist={isSavedInWatchlist}
              onSelectSample={onSelectSample}
            />
          )}

          {/* Error Fallback */}
          {!isLoading && !notTrackableInfo && errorMsg && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-5 text-center dark:border-rose-900/60 dark:bg-rose-950/40">
              <p className="text-sm font-bold text-rose-800 dark:text-rose-200">{errorMsg}</p>
              <div className="mt-3 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={onRefresh}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Try Again</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onTrackNextOrder();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span>Track Next</span>
                </button>
              </div>
            </div>
          )}

          {/* SUCCESS PARCEL VIEW */}
          {!isLoading && !notTrackableInfo && !errorMsg && trackingResult && (
            <div className="space-y-5 sm:space-y-6">
              {/* ============================================================== */}
              {/* TOP DELIVERED CARD (LUXURIOUS, FROSTED GLASS & HIGH CONTRAST) */}
              {/* ============================================================== */}
              <div
                className={`relative overflow-hidden rounded-3xl p-5 sm:p-7 border transition-all ${
                  isReturned
                    ? "bg-gradient-to-br from-rose-500/14 via-amber-500/8 to-transparent border-rose-300 dark:border-rose-800/60 shadow-xs"
                    : isDelivered
                    ? "bg-gradient-to-br from-emerald-500/12 via-teal-500/6 to-transparent border-emerald-200/90 dark:border-emerald-800/50 shadow-xs"
                    : "bg-gradient-to-br from-indigo-500/12 via-sky-500/6 to-transparent border-indigo-200/90 dark:border-indigo-800/50 shadow-xs"
                }`}
              >
                {/* Decorative background ambient flare */}
                <div
                  className={`absolute -right-10 -bottom-10 w-52 h-52 rounded-full blur-3xl pointer-events-none opacity-40 ${
                    isReturned ? "bg-rose-400" : isDelivered ? "bg-emerald-400" : "bg-indigo-400"
                  }`}
                />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
                  <div className="flex items-start gap-4 sm:gap-5">
                    {/* Glowing Circular Status Emblem */}
                    <div className="relative shrink-0">
                      <div
                        className={`flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl shadow-lg transition-transform ${
                          isReturned
                            ? "bg-gradient-to-br from-rose-500 to-amber-600 text-white shadow-rose-500/30"
                            : isDelivered
                            ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-500/30"
                            : "bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-indigo-500/30"
                        }`}
                      >
                        {isReturned ? (
                          <RotateCcw className="h-8 w-8 sm:h-9 sm:w-9 stroke-[2.4]" />
                        ) : isDelivered ? (
                          <CheckCircle2 className="h-8 w-8 sm:h-9 sm:w-9 stroke-[2.4]" />
                        ) : (
                          <Truck className="h-8 w-8 sm:h-9 sm:w-9 stroke-[2.2]" />
                        )}
                      </div>
                      {isDelivered && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white dark:border-slate-900" />
                        </span>
                      )}
                    </div>

                    <div>
                      {/* Status row: Clock and Timestamp */}
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                          <Clock className={`h-3.5 w-3.5 ${isReturned ? "text-rose-600 dark:text-rose-400" : isDelivered ? "text-emerald-600 dark:text-emerald-400" : "text-indigo-600 dark:text-indigo-400"}`} />
                          <span>{trackingResult.overallStatus.timestamp}</span>
                        </div>
                        <span className="text-slate-300 dark:text-slate-700">·</span>
                        <span className={`text-[11px] font-bold flex items-center gap-1 ${isReturned ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                          <ShieldCheck className="h-3 w-3" />
                          <span>{isReturned ? "Returned to Shipper (RTO)" : "Signed & Received"}</span>
                        </span>
                      </div>

                      {/* Main Big Headline */}
                      <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                        {isReturned
                          ? trackingResult.overallStatus.phrase || "Returned to Shipper"
                          : isDelivered
                          ? "Delivered"
                          : trackingResult.overallStatus.phrase || "Package in Transit"}
                      </h2>

                      <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-xl font-medium">
                        {cleanStatusDescription}
                      </p>
                    </div>
                  </div>

                  {/* Actions inside Pro Banner */}
                  <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
                    <button
                      type="button"
                      onClick={onToggleWatchlist}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-white/90 hover:bg-white dark:bg-slate-800/90 dark:hover:bg-slate-800 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all shadow-2xs cursor-pointer"
                    >
                      {isSavedInWatchlist ? (
                        <>
                          <BookmarkCheck className="h-4 w-4 text-emerald-600 stroke-[2.4]" />
                          <span>Saved in Watchlist</span>
                        </>
                      ) : (
                        <>
                          <BookmarkPlus className="h-4 w-4 stroke-[2.4]" />
                          <span>Save to Watchlist</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Minimal Informative Details Strip (Only when real origin/destination/service exist) */}
              {(originParsed?.name || destParsed?.name || (trackingResult.bookingDetails.articleType && trackingResult.bookingDetails.articleType !== "Standard Express Parcel")) && (
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5 px-4.5 dark:border-slate-800/80 dark:bg-slate-850/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex flex-wrap items-center gap-4 text-slate-600 dark:text-slate-300">
                    {originParsed?.name && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 font-medium">Origin:</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {originParsed.name} {originParsed.pin ? `(${originParsed.pin})` : ""}
                        </span>
                      </div>
                    )}
                    {destParsed?.name && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 font-medium">Destination:</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {destParsed.name} {destParsed.pin ? `(${destParsed.pin})` : ""}
                        </span>
                      </div>
                    )}
                    {trackingResult.bookingDetails.articleType && trackingResult.bookingDetails.articleType !== "Standard Express Parcel" && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 font-medium">Service:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {trackingResult.bookingDetails.articleType}
                        </span>
                      </div>
                    )}
                  </div>
                  {trackingResult.bookingDetails.bookedAt && trackingResult.bookingDetails.bookedAt !== "N/A" && (
                    <div className="text-[11px] text-slate-400 font-mono">
                      Booked: {trackingResult.bookingDetails.bookedAt}
                    </div>
                  )}
                </div>
              )}

              {/* Movement History / Timeline Section */}
              {chronologicalActivities.length === 0 ? (
                <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 text-center">
                  <Package className="mx-auto h-7 w-7 text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    No movement checkpoints recorded yet
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Checkpoint logs will appear as soon as the carrier registers transit scan events.
                  </p>
                </div>
              ) : (
                <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-indigo-600 stroke-[2.4]" />
                    <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                       Complete History
                    </h4>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-500">
                    {chronologicalActivities.length} Checkpoints
                  </span>
                </div>

                {/* Clean Professional Logistics Timeline */}
                <div className="relative pt-2 pb-2">
                  {/* Vertical Timeline Track Line: precisely centered at left-4 (16px), passing through the center of w-8 node column */}
                  <div className="absolute left-4 top-8 bottom-8 w-0.5 -translate-x-1/2 bg-slate-200 dark:bg-slate-700/80 rounded-full z-10 pointer-events-none" />

                  {/* Checkpoint Nodes along the timeline (Destination at top -> Starting point at bottom) */}
                  <div className="space-y-4">
                    {displayActivities.map((act, idx) => {
                      const style = getCheckpointStyle(act);

                      return (
                        <div
                          key={act.id || idx}
                          className="relative flex items-start gap-3 sm:gap-4"
                        >
                          {/* Node Column: exactly w-8 (32px wide), center is 16px (left-4), matching vertical track */}
                          <div className="relative shrink-0 w-8 flex items-center justify-center pt-5">
                            <div className="relative flex items-center justify-center h-6 w-6 z-20 pointer-events-none">
                              {idx === 0 ? (
                                <span className="relative flex h-4 w-4 items-center justify-center">
                                  <span
                                    className={`animate-ping absolute inline-flex h-full w-full rounded-full ${style.dotColor} opacity-40`}
                                  />
                                  <span
                                    className={`relative inline-flex rounded-full h-3.5 w-3.5 ${style.dotColor} ring-4 ring-white dark:ring-slate-900 shadow-xs`}
                                  />
                                </span>
                              ) : (
                                <span
                                  className={`relative inline-flex rounded-full h-3 w-3 ${style.dotColor} ring-4 ring-white dark:ring-slate-900 shadow-xs`}
                                />
                              )}
                            </div>
                          </div>

                          {/* Event Card on the right */}
                          <div className="flex-1 min-w-0 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/90 dark:hover:border-slate-700 transition-all">
                            {/* Event Header with Distinct Status Badge */}
                            <div className="flex flex-wrap items-center justify-between gap-1.5">
                              <div className="flex items-center gap-2">
                                <span className={`p-1.5 rounded-xl ${style.iconBg} transition-colors`}>
                                  {style.icon}
                                </span>
                                <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                                  {act.statusText}
                                </span>
                              </div>

                              {/* Chronological tags: Destination at top, Starting Point on actual origin */}
                              {idx === 0 && (
                                <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                                  {isDelivered ? "Destination (Delivered)" : isReturned ? "Destination (Return)" : "Destination Point"}
                                </span>
                              )}
                              {(act.stage === "booked" || (isExpandedAll && idx === displayActivities.length - 1) || (chronologicalActivities.length <= INITIAL_VISIBLE_COUNT && idx === displayActivities.length - 1)) && (
                                <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                                  Starting Point (Origin)
                                </span>
                              )}
                            </div>

                            {/* Location, Date and Time with High Legibility */}
                            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold text-slate-600 dark:text-slate-300">
                              <span className="inline-flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                                <MapPin className="h-3.5 w-3.5 text-indigo-500 stroke-[2.2]" />
                                <span>{act.facility}</span>
                              </span>
                              <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">·</span>
                              <span className="inline-flex items-center gap-1.5 font-mono text-slate-600 dark:text-slate-400 tabular-nums">
                                <Calendar className="h-3.5 w-3.5 text-indigo-500 stroke-[2.2]" />
                                <span>{act.date} · {act.time}</span>
                              </span>
                            </div>

                            {act.details && (
                              <div className="mt-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-50/70 dark:bg-slate-800/70 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
                                {act.details}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* "SEE ALL UPDATES" ACCESSIBLE BUTTON */}
                {chronologicalActivities.length > INITIAL_VISIBLE_COUNT && (
                  <div className="mt-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={handleToggleExpand}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200/90 text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white py-3 px-4 text-xs font-extrabold transition-all shadow-2xs cursor-pointer"
                    >
                      <span>
                        {isExpandedAll
                          ? "Collapse History"
                          : `See remaining ${chronologicalActivities.length - INITIAL_VISIBLE_COUNT} updates (${chronologicalActivities.length} total)`}
                      </span>
                      {isExpandedAll ? (
                        <ChevronUp className="h-4 w-4 stroke-[2.5]" />
                      ) : (
                        <ChevronDown className="h-4 w-4 stroke-[2.5]" />
                      )}
                    </button>
                  </div>
                )}
              </div>
              )}

              {/* FOOTER ACTIONS BAR */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 pb-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                  <Phone className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Carrier Support: </span>
                  <a
                    href={`tel:${trackingResult.courier.supportPhone || "1800-266-6868"}`}
                    className="font-extrabold text-slate-900 hover:underline dark:text-white"
                  >
                    {trackingResult.courier.supportPhone || "1800-266-6868"}
                  </a>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onTrackNextOrder();
                    }}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 py-3 px-6 text-xs font-extrabold text-white shadow-xs transition-colors cursor-pointer"
                  >
                    <PlusCircle className="h-4 w-4 stroke-[2.5]" />
                    <span>Track Another Parcel</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
