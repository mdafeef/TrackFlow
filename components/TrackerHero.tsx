"use client";

import React, { useState, useEffect } from "react";
import { Search, X, ChevronDown, CheckCircle2, ShieldCheck, Zap } from "lucide-react";
import { COURIER_LIST, COURIER_MAP, autoDetectCourier, CourierConfig } from "@/lib/couriers";
import { AnimatedSpiralBg } from "@/components/AnimatedSpiralBg";

interface TrackerHeroProps {
  onSearch: (trackingNumber: string, courierId?: string) => void;
  isLoading: boolean;
  initialTracking?: string;
  initialCourier?: string;
}

export function TrackerHero({
  onSearch,
  isLoading,
  initialTracking = "",
  initialCourier = "",
}: TrackerHeroProps) {
  const [trackingNumber, setTrackingNumber] = useState(initialTracking);
  const [selectedCourierId, setSelectedCourierId] = useState<string>(() => {
    if (initialCourier && COURIER_MAP[initialCourier]) return initialCourier;
    if (initialTracking) {
      const detected = autoDetectCourier(initialTracking);
      return detected ? detected.id : "";
    }
    return "";
  });
  const [detectedCourier, setDetectedCourier] = useState<CourierConfig | null>(() => {
    return initialTracking ? autoDetectCourier(initialTracking) : null;
  });
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [errorText, setErrorText] = useState("");

  const [prevTrackingProp, setPrevTrackingProp] = useState(initialTracking);
  if (initialTracking !== prevTrackingProp) {
    setPrevTrackingProp(initialTracking);
    setTrackingNumber(initialTracking);
    const detected = initialTracking ? autoDetectCourier(initialTracking) : null;
    setDetectedCourier(detected);
    if (initialCourier) {
      setSelectedCourierId(initialCourier);
    } else if (detected) {
      setSelectedCourierId(detected.id);
    } else if (!initialTracking) {
      setSelectedCourierId("");
    }
  }

  // Handle tracking number typing
  const handleInputChange = (val: string) => {
    const cleaned = val.toUpperCase();
    setTrackingNumber(cleaned);
    setErrorText("");

    if (cleaned.trim()) {
      const detected = autoDetectCourier(cleaned);
      setDetectedCourier(detected);
      if (detected && !selectedCourierId) {
        setSelectedCourierId(detected.id);
      }
    } else {
      setDetectedCourier(null);
    }
  };

  const handleClear = () => {
    setTrackingNumber("");
    setDetectedCourier(null);
    setSelectedCourierId("");
    setErrorText("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = trackingNumber.trim();
    if (!clean) {
      setErrorText("Please enter a valid tracking or consignment number.");
      return;
    }

    const courierToUse = selectedCourierId || (detectedCourier ? detectedCourier.id : "speedpost");
    onSearch(clean, courierToUse);
  };

  const handleSelectSample = (sampleNum: string, courierId: string) => {
    setTrackingNumber(sampleNum);
    setSelectedCourierId(courierId);
    setDetectedCourier(COURIER_MAP[courierId] || null);
    setErrorText("");
    onSearch(sampleNum, courierId);
  };

  const activeCourier = selectedCourierId ? COURIER_MAP[selectedCourierId] : detectedCourier;

  return (
    <section id="track-section" className="relative z-30 pt-10 pb-16 md:pt-14 md:pb-20">
      {/* Floating Animated Spiral & Orbit Rings Background */}
      <AnimatedSpiralBg />

      <div className="relative z-20 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
        {/* Kicker Tag */}
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/80 px-3.5 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-300 mb-6">
          <Zap className="h-3.5 w-3.5" />
          <span>Universal 20+ Carrier Real-Time Engine</span>
        </div>

        {/* Headline */}
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl dark:text-white max-w-3xl mx-auto text-balance">
          Track Any Shipment, Courier, or Post in One Place
        </h1>

        <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          Fast, free parcel tracking with auto-carrier detection, journey route visualizer, and instant WhatsApp status cards.
        </p>

        {/* Main Search Box */}
        <div className="mt-8 max-w-3xl mx-auto">
          <form
            onSubmit={handleSubmit}
            className="relative z-20 flex flex-col sm:flex-row items-stretch rounded-2xl border border-slate-300/80 bg-white p-2 shadow-lg dark:border-slate-800 dark:bg-slate-900 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all"
          >
            {/* Carrier Selector Dropdown */}
            <div className="relative shrink-0 border-b sm:border-b-0 sm:border-r border-slate-200 dark:border-slate-800 pb-2 sm:pb-0 sm:pr-2">
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex h-12 w-full sm:w-52 items-center justify-between rounded-xl px-3.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/80 transition-colors"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="flex h-2 w-2 rounded-full bg-indigo-500"></span>
                  <span className="truncate">
                    {activeCourier ? activeCourier.shortName : "Auto-Detect Courier"}
                  </span>
                </div>
                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsDropdownOpen(false)}
                  />
                  <div className="absolute left-0 top-full mt-2 z-[60] max-h-72 w-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xl dark:border-slate-800 dark:bg-slate-900 text-left">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCourierId("");
                        setIsDropdownOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                        !selectedCourierId
                          ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-semibold"
                          : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                      }`}
                    >
                      <span>Auto-Detect (Any Carrier)</span>
                      {!selectedCourierId && <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600" />}
                    </button>
                    <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                    {COURIER_LIST.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedCourierId(c.id);
                          setIsDropdownOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                          selectedCourierId === c.id
                            ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-semibold"
                            : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                        }`}
                      >
                        <span className="truncate">{c.name}</span>
                        {selectedCourierId === c.id && <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600 shrink-0 ml-1" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Input field */}
            <div className="relative flex-1 flex items-center px-3 py-1">
              <Search className="h-5 w-5 text-slate-400 shrink-0 mr-2" />
              <input
                id="tracking-input"
                type="text"
                value={trackingNumber}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder="Enter Consignment or AWB Number..."
                className="w-full bg-transparent py-2 text-sm sm:text-base font-mono tracking-wider font-medium text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:outline-none dark:text-white"
                autoComplete="off"
                spellCheck="false"
              />
              {trackingNumber && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 sm:mt-0 flex h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 text-sm font-semibold text-white shadow-md hover:bg-indigo-700 disabled:opacity-70 transition-all shrink-0 cursor-pointer"
            >
              {isLoading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  <span>Track Parcel</span>
                </>
              )}
            </button>
          </form>

          {/* Error Message if present */}
          {errorText && (
            <p className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-400 text-left px-2">
              {errorText}
            </p>
          )}

          {/* Quick Demo Samples Bar */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium text-slate-700 dark:text-slate-300">Quick Test Samples:</span>
            <button
              type="button"
              onClick={() => handleSelectSample("EL855948961IN", "speedpost")}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 font-mono text-[11px] text-slate-700 hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:border-indigo-500 transition-colors cursor-pointer"
            >
              <span className="font-semibold text-red-600 dark:text-red-400">India Post</span>: EL855948961IN
            </button>
            <button
              type="button"
              onClick={() => handleSelectSample("EL855948618IN", "speedpost")}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 font-mono text-[11px] text-slate-700 hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:border-indigo-500 transition-colors cursor-pointer"
            >
              <span className="font-semibold text-red-600 dark:text-red-400">Speed Post</span>: EL855948618IN
            </button>
            <button
              type="button"
              onClick={() => handleSelectSample("B4000211866", "dtdc")}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 font-mono text-[11px] text-slate-700 hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:border-indigo-500 transition-colors cursor-pointer"
            >
              <span className="font-semibold text-blue-600 dark:text-blue-400">DTDC</span>: B4000211866
            </button>
            <button
              type="button"
              onClick={() => handleSelectSample("FMPP4397267510", "ekart")}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 font-mono text-[11px] text-slate-700 hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:border-indigo-500 transition-colors cursor-pointer"
            >
              <span className="font-semibold text-amber-600 dark:text-amber-400">Ekart</span>: FMPP4397267510
            </button>
          </div>

          {/* Trust points */}
          <div className="mt-8 flex items-center justify-center gap-6 text-xs text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              100% Free & Ad-Free
            </span>
            <span aria-hidden="true">·</span>
            <span>No Account Required</span>
            <span aria-hidden="true">·</span>
            <span>Instant Courier Auto-Detect</span>
          </div>
        </div>
      </div>
    </section>
  );
}
