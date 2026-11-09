"use client";

import React, { useState, useRef, useEffect } from "react";
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
  Mail,
  Receipt,
  Scale,
  Send,
  Inbox,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowRight,
  ShieldCheck,
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

  // References for vertical timeline scroll measurement
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const timelineTrackRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // State to track scroll fraction (0 to 1) for the timeline road
  const [roadProgress, setRoadProgress] = useState(0);

  // In-render state sync to avoid useEffect cascade
  const [prevTrackingNum, setPrevTrackingNum] = useState<string | undefined>(
    trackingResult?.trackingNumber
  );

  if (trackingResult?.trackingNumber !== prevTrackingNum) {
    setPrevTrackingNum(trackingResult?.trackingNumber);
    setIsExpandedAll(false);
    setRoadProgress(0);
  }

  const activities = trackingResult?.activities || [];
  // Default to 4 checkpoints for clean initial view, expandable on click
  const displayActivities = isExpandedAll ? activities : activities.slice(0, 4);

  // Calculate truck progress strictly based on the scroll container
  const updateScrollProgress = () => {
    if (!scrollContainerRef.current) return;
    const el = scrollContainerRef.current;
    const maxScroll = el.scrollHeight - el.clientHeight;
    if (maxScroll <= 0) {
      setRoadProgress(1); // If content fits without scroll, truck has completed journey
    } else {
      const p = Math.min(Math.max(el.scrollTop / maxScroll, 0), 1);
      setRoadProgress(p);
    }
  };

  const handleScroll = () => {
    updateScrollProgress();
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      updateScrollProgress();
    }, 60);
    return () => clearTimeout(timer);
  }, [displayActivities.length, isExpandedAll, isOpen]);

  // Lock background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    if (typeof navigator !== "undefined" && trackingResult) {
      const url = `${window.location.origin}/?token=${trackingResult.secureToken}`;
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // Helper to extract clean PIN and location
  const parsePinLocation = (text?: string, fallbackPin = "680003", fallbackName = "Origin Hub") => {
    if (!text) return { pin: fallbackPin, name: fallbackName };
    const pinMatch = text.match(/\b\d{6}\b/);
    const pin = pinMatch ? pinMatch[0] : fallbackPin;
    const name = text
      .replace(/\(\d{6}\)/g, "")
      .replace(/\b\d{6}\b/g, "")
      .replace(/^[,\s-]+|[,\s-]+$/g, "")
      .trim();

    return {
      pin,
      name: name || fallbackName,
    };
  };

  const originParsed = parsePinLocation(
    trackingResult?.bookingDetails?.origin,
    "680003",
    "Ayyanthole SO"
  );
  const destParsed = parsePinLocation(
    trackingResult?.bookingDetails?.destination,
    "679579",
    "Veliankode SO"
  );

  // Distinct icons and styles for each logistics checkpoint
  const getCheckpointStyle = (act: TrackingActivity) => {
    const text = act.statusText.toLowerCase();

    // 1. Delivered
    if (text.includes("delivered") || act.stage === "delivered") {
      return {
        iconBg: "bg-emerald-500 text-white shadow-xs shadow-emerald-500/20",
        dotColor: "bg-emerald-500 ring-4 ring-emerald-500/20",
        icon: <Check className="h-4 w-4 stroke-[3]" />,
        badgeText: "Delivered",
      };
    }

    // 2. Out for Delivery
    if (text.includes("out for delivery") || act.stage === "out_for_delivery") {
      return {
        iconBg: "bg-amber-500 text-white shadow-xs shadow-amber-500/20",
        dotColor: "bg-amber-500 ring-4 ring-amber-500/20",
        icon: <Truck className="h-4 w-4 stroke-[2.4]" />,
        badgeText: "Out For Delivery",
      };
    }

    // 3. Item Received at Destination
    if (text.includes("destination") || text.includes("item received at destination")) {
      return {
        iconBg: "bg-indigo-600 text-white shadow-xs shadow-indigo-500/20",
        dotColor: "bg-indigo-600 ring-4 ring-indigo-500/20",
        icon: <Inbox className="h-4 w-4 stroke-[2.4]" />,
        badgeText: "Destination Arrived",
      };
    }

    // 4. Bag Received / Sorting Hub
    if (text.includes("bag received") || text.includes("item received")) {
      return {
        iconBg: "bg-sky-600 text-white shadow-xs shadow-sky-500/20",
        dotColor: "bg-sky-600 ring-4 ring-sky-500/20",
        icon: <Package className="h-4 w-4 stroke-[2.4]" />,
        badgeText: "Sorting Facility",
      };
    }

    // 5. Dispatched
    if (text.includes("dispatched") || act.stage === "in_transit") {
      return {
        iconBg: "bg-purple-600 text-white shadow-xs shadow-purple-500/20",
        dotColor: "bg-purple-600 ring-4 ring-purple-500/20",
        icon: <Send className="h-3.5 w-3.5 stroke-[2.4]" />,
        badgeText: "Dispatched",
      };
    }

    // 6. Item Booked
    return {
      iconBg: "bg-slate-700 text-white shadow-xs shadow-slate-500/20",
      dotColor: "bg-slate-700 ring-4 ring-slate-500/20",
      icon: <Receipt className="h-4 w-4 stroke-[2.4]" />,
      badgeText: "Booked",
    };
  };

  const isDelivered =
    trackingResult?.overallStatus?.stage === "delivered" ||
    trackingResult?.overallStatus?.phrase.toLowerCase().includes("delivered");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
      {/* Background click dismiss */}
      <div className="fixed inset-0 hidden sm:block" onClick={onClose} aria-hidden="true" />

      {/* Main Dialog Window: Fullscreen on mobile (h-full w-full rounded-none), spacious max-w-4xl on desktop */}
      <div
        className="relative z-10 w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-4xl sm:rounded-[28px] overflow-hidden bg-white dark:bg-slate-900 border-0 sm:border border-slate-200/90 dark:border-slate-800 shadow-2xl flex flex-col transition-all"
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
                  <span>Tamper-Safe</span>
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
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                  title="Refresh live status"
                >
                  <RefreshCw className="h-4 w-4 stroke-[2.2]" />
                </button>
                <button
                  type="button"
                  onClick={onShare}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                  title="Share status card"
                >
                  <Share2 className="h-4 w-4 stroke-[2.2]" />
                </button>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                  title="Copy tracking link"
                >
                  {copiedLink ? <Check className="h-4 w-4 text-emerald-600 stroke-[3]" /> : <Copy className="h-4 w-4 stroke-[2.2]" />}
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
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
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-4 sm:space-y-5"
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
            <div className="space-y-4 sm:space-y-5">
              {/* ============================================================== */}
              {/* PRO RICH GRADIENT HERO CARD (ATTRACTIVE & MODERN)              */}
              {/* ============================================================== */}
              <div
                className={`relative overflow-hidden rounded-3xl p-5 sm:p-7 text-white shadow-lg transition-all ${
                  isDelivered
                    ? "bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900"
                    : "bg-gradient-to-br from-indigo-600 via-blue-700 to-slate-900"
                }`}
              >
                {/* Decorative background ambient glow */}
                <div className="absolute -right-8 -bottom-8 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
                <div className="absolute left-1/3 -top-12 w-36 h-36 rounded-full bg-white/10 blur-xl pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md text-white border border-white/20 shadow-inner">
                      {isDelivered ? (
                        <CheckCircle2 className="h-8 w-8 stroke-[2.5]" />
                      ) : (
                        <Truck className="h-8 w-8 stroke-[2.2]" />
                      )}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="rounded-full bg-white/20 backdrop-blur-sm px-3 py-0.5 text-xs font-extrabold uppercase tracking-wider text-white border border-white/20">
                          {trackingResult.overallStatus.label}
                        </span>
                        <span className="text-xs text-white/80 font-medium">
                          {trackingResult.overallStatus.timestamp}
                        </span>
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                        {trackingResult.overallStatus.phrase}
                      </h2>
                      <p className="mt-1 text-xs sm:text-sm text-white/90 max-w-xl font-medium">
                        {trackingResult.estimatedDelivery.message}
                      </p>
                    </div>
                  </div>

                  {/* Actions inside Pro Banner */}
                  <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
                    <button
                      type="button"
                      onClick={onToggleWatchlist}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md px-3.5 py-2 text-xs font-bold text-white border border-white/25 transition-all shadow-xs cursor-pointer"
                    >
                      {isSavedInWatchlist ? (
                        <>
                          <BookmarkCheck className="h-4 w-4 stroke-[2.4]" />
                          <span>Saved in Watchlist</span>
                        </>
                      ) : (
                        <>
                          <BookmarkPlus className="h-4 w-4 stroke-[2.4]" />
                          <span>Add to Watchlist</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Sub Route Bar inside Banner */}
                <div className="mt-5 pt-4 border-t border-white/15 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-white/90">
                    <span className="font-extrabold text-white">Route Corridor:</span>
                    <span className="font-semibold">{originParsed.name} (PIN {originParsed.pin})</span>
                    <ArrowRight className="h-3.5 w-3.5 text-white/70" />
                    <span className="font-semibold">{destParsed.name} (PIN {destParsed.pin})</span>
                  </div>
                  <div className="font-mono text-white/80 font-medium">
                    Billed: {trackingResult.bookingDetails.tariff} · {trackingResult.bookingDetails.weight}
                  </div>
                </div>
              </div>

              {/* SPECIFICATION TILES (CLEAN & READABLE) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-850">
                  <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">From Origin</div>
                  <div className="mt-0.5 text-sm font-extrabold text-slate-900 dark:text-white truncate">
                    {originParsed.name}
                  </div>
                  <div className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">PIN {originParsed.pin}</div>
                </div>

                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-850">
                  <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">To Destination</div>
                  <div className="mt-0.5 text-sm font-extrabold text-slate-900 dark:text-white truncate">
                    {destParsed.name}
                  </div>
                  <div className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">PIN {destParsed.pin}</div>
                </div>

                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-850">
                  <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Article Type</div>
                  <div className="mt-0.5 text-sm font-extrabold text-slate-900 dark:text-white truncate">
                    {trackingResult.bookingDetails.articleType || "SP Doc"}
                  </div>
                  <div className="text-xs font-bold text-slate-600 dark:text-slate-400">Weight: {trackingResult.bookingDetails.weight || "45 g"}</div>
                </div>

                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-850">
                  <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Tariff Paid</div>
                  <div className="mt-0.5 text-sm font-extrabold font-mono text-slate-900 dark:text-white tabular-nums">
                    {trackingResult.bookingDetails.tariff || "₹55.57"}
                  </div>
                  <div className="text-xs font-bold text-slate-500">Official Rate</div>
                </div>
              </div>

              {/* ============================================================== */}
              {/* VERTICAL TIMELINE WITH ACCURATE SCROLLING TRUCK & REVEALED DOTS*/}
              {/* ============================================================== */}
              <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-850">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-indigo-600 stroke-[2.4]" />
                    <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                      Checkpoint Route & History
                    </h4>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-500">
                    {activities.length} Checkpoints
                  </span>
                </div>

                {/* Animated Timeline Section */}
                <div className="relative pl-10 sm:pl-12 pt-2 pb-2">
                  {/* Dedicated vertical track container matching 100% of event cards */}
                  <div ref={timelineTrackRef} className="absolute left-[17px] sm:left-[21px] top-6 bottom-6 w-1">
                    {/* Background grey route line */}
                    <div className="absolute inset-0 bg-slate-200 dark:bg-slate-800 rounded-full" />

                    {/* Filled progress road line (stretches from 0% to 100% on scroll) */}
                    <div
                      className="absolute top-0 left-0 w-full bg-gradient-to-b from-indigo-500 via-indigo-600 to-emerald-500 rounded-full transition-all duration-75 ease-out shadow-xs"
                      style={{ height: `${roadProgress * 100}%` }}
                    />

                    {/* MOVING TRUCK ICON: Starts at top and reaches destination at scroll bottom */}
                    <div
                      className="absolute -left-[14px] -translate-y-1/2 z-30 transition-all duration-75 ease-out pointer-events-none"
                      style={{ top: `${roadProgress * 100}%` }}
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white shadow-md ring-4 ring-white dark:ring-slate-900">
                        <Truck className="h-4 w-4 stroke-[2.5]" />
                      </div>
                    </div>
                  </div>

                  {/* Checkpoint Nodes along the timeline */}
                  <div className="space-y-4">
                    {displayActivities.map((act, idx) => {
                      // Node threshold: checkpoint 0 at top (0), last checkpoint at bottom (1)
                      const threshold = displayActivities.length > 1
                        ? idx / (displayActivities.length - 1)
                        : 0;

                      // The dot ONLY appears once the truck has reached or passed it
                      const isPassedByTruck = roadProgress >= threshold - 0.05;
                      const style = getCheckpointStyle(act);

                      return (
                        <div
                          key={act.id || idx}
                          ref={(el) => {
                            itemRefs.current[idx] = el;
                          }}
                          className={`relative rounded-2xl border p-4 transition-all duration-200 ${
                            isPassedByTruck
                              ? "bg-slate-50/80 border-slate-300 dark:bg-slate-800/80 dark:border-slate-700 shadow-2xs"
                              : "bg-white border-slate-100 dark:bg-slate-900/40 dark:border-slate-800/60 opacity-60"
                          }`}
                        >
                          {/* Point marker on the vertical track: REVEALED ONLY AFTER TRUCK PASSES */}
                          <div className="absolute -left-10 sm:-left-12 top-5 flex items-center justify-center w-7 h-7 -translate-x-1/2 z-10">
                            {isPassedByTruck ? (
                              <span
                                className={`h-3.5 w-3.5 rounded-full ${style.dotColor} transition-transform duration-200 scale-100 animate-in zoom-in-50`}
                              />
                            ) : (
                              /* Empty invisible placeholder before truck arrival */
                              <span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-700/60 opacity-40" />
                            )}
                          </div>

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

                            {idx === 0 && (
                              <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                Latest Scan
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
                            <div className="mt-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white/90 dark:bg-slate-850 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
                              {act.details}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* "SEE ALL UPDATES" ACCESSIBLE BUTTON */}
                {activities.length > 4 && (
                  <div className="mt-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsExpandedAll(!isExpandedAll)}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200/90 text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-white py-3 px-4 text-xs font-extrabold transition-all shadow-2xs cursor-pointer"
                    >
                      <span>
                        {isExpandedAll
                          ? "Collapse to Recent Checkpoints"
                          : `See all ${activities.length} checkpoint updates`}
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

              {/* FOOTER ACTIONS BAR */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 pb-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                  <Phone className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Support: </span>
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
                    <span>Track Next Order</span>
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
