"use client";

import React, { useState, useEffect, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  Share2,
  BookmarkCheck,
  BookmarkPlus,
  RefreshCw,
  Copy,
  Check,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  PlusCircle,
  Package,
} from "lucide-react";

import { Navbar } from "@/components/Navbar";
import { TrackerHero } from "@/components/TrackerHero";
import { MilestoneProgress } from "@/components/MilestoneProgress";
import { VisualJourneyMap } from "@/components/VisualJourneyMap";
import { TimelineList } from "@/components/TimelineList";
import { PackageDetailsGrid } from "@/components/PackageDetailsGrid";
import { ShareCardModal } from "@/components/ShareCardModal";
import { WatchlistDrawer, WatchlistItem } from "@/components/WatchlistDrawer";
import { CourierDirectory } from "@/components/CourierDirectory";
import { FeaturesOverview } from "@/components/FeaturesOverview";
import { FaqSection } from "@/components/FaqSection";
import { Footer } from "@/components/Footer";
import { TrackingFetchingAnimation } from "@/components/TrackingFetchingAnimation";
import { NotTrackableCard } from "@/components/NotTrackableCard";
import { TrackingModalPopup } from "@/components/TrackingModalPopup";
import { PartnerMarquee } from "@/components/PartnerMarquee";
import { BulkDashboard } from "@/components/BulkDashboard";
import { COURIER_MAP, autoDetectCourier } from "@/lib/couriers";
import { TrackingResult } from "@/app/api/track/route";

// Module-level token tracker to avoid mutating refs across render/callback boundaries
let moduleLastAppliedToken = "";
let moduleIsInitialUrlHandled = false;

function TrackingAppContent() {
  const searchParams = useSearchParams();

  const [activeResult, setActiveResult] = useState<TrackingResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Popup Modal state: opens whenever tracking is requested
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);

  // Dedicated "Your Parcel is Not Trackable Yet" state
  const [notTrackableInfo, setNotTrackableInfo] = useState<{
    trackingNumber: string;
    courierName: string;
    courierId?: string;
    message?: string;
    supportPhone?: string;
    supportEmail?: string;
  } | null>(null);

  // Pending query details for live animation status badge
  const [pendingQuery, setPendingQuery] = useState<{
    number: string;
    courierName: string;
  }>({
    number: "",
    courierName: "",
  });

  // Watchlist state
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [isWatchlistOpen, setIsWatchlistOpen] = useState(false);
  const [isRefreshingWatchlist, setIsRefreshingWatchlist] = useState(false);

  // Share Modal state
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Dark mode
  const [isDark, setIsDark] = useState(false);

  // Active view: single tracker vs bulk dashboard
  const [activeView, setActiveView] = useState<"single" | "bulk">("single");

  // Track Next Order Action: Clears active results/errors, resets URL, and smoothly focuses input
  const handleTrackNextOrder = useCallback(() => {
    setActiveResult(null);
    setNotTrackableInfo(null);
    setErrorMsg(null);
    moduleLastAppliedToken = "";

    try {
      const cleanUrl = new URL(window.location.origin);
      window.history.replaceState(null, "", cleanUrl.toString());
    } catch (e) {
      console.warn("Could not replace history state:", e);
    }

    const heroSection = document.getElementById("track-section");
    if (heroSection) {
      heroSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    setTimeout(() => {
      const inputEl = document.getElementById("tracking-input") as HTMLInputElement | null;
      if (inputEl) {
        inputEl.focus();
        inputEl.select();
      }
    }, 250);
  }, []);

  // Save an untracked order to watchlist for later automated refresh
  const handleSaveUntrackedToWatchlist = useCallback(
    (trackingNumber: string, courierName: string, courierId?: string) => {
      const cleanNum = trackingNumber.trim();
      if (!cleanNum) return;

      const exists = watchlist.some((item) => item.trackingNumber === cleanNum);
      if (exists) {
        setIsWatchlistOpen(true);
        return;
      }

      const cMeta = courierId ? COURIER_MAP[courierId] : null;
      const newItem: WatchlistItem = {
        trackingNumber: cleanNum,
        courierId: courierId || "auto",
        nickname: `${courierName || cMeta?.name || "Pending"} Parcel`,
        lastStatus: "Pending Manifest / Not Trackable Yet",
        lastUpdated: "Booked Recently",
        variant: "pending",
      };

      const updated = [newItem, ...watchlist];
      setWatchlist(updated);
      try {
        localStorage.setItem("trackflow_watchlist", JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      setIsWatchlistOpen(true);
    },
    [watchlist]
  );

  // Initialize theme and watchlist from localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const savedTheme = localStorage.getItem("trackflow_theme");
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
          setIsDark(true);
          document.documentElement.classList.add("dark");
        } else {
          setIsDark(false);
          document.documentElement.classList.remove("dark");
        }

        const savedWatchlist = localStorage.getItem("trackflow_watchlist");
        if (savedWatchlist) {
          setWatchlist(JSON.parse(savedWatchlist));
        }
      } catch (e) {
        console.error("Local storage initialization error:", e);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add("dark");
        localStorage.setItem("trackflow_theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("trackflow_theme", "light");
      }
      return next;
    });
  };



  // Perform tracking search - ALWAYS fetches fresh data when invoked
  const performSearch = useCallback(
    async (
      trackingNumber: string,
      courierId?: string,
      token?: string,
      shouldScroll: boolean = false
    ) => {
      const cleanNum = (trackingNumber || "").trim();
      const cleanToken = (token || "").trim();

      if (!cleanNum && !cleanToken) return;

      // Determine courier label for fetching animation
      const detected = (courierId && COURIER_MAP[courierId]?.name)
        ? COURIER_MAP[courierId].name
        : (cleanNum && autoDetectCourier(cleanNum)?.name)
        ? autoDetectCourier(cleanNum)!.name
        : "Carrier Network";

      setPendingQuery({
        number: cleanNum || (token ? "Encrypted Shipment" : "Consignment"),
        courierName: detected,
      });

      setIsLoading(true);
      setIsTrackingModalOpen(true);
      setErrorMsg(null);
      setNotTrackableInfo(null);

      try {
        const url = new URL("/api/track", window.location.origin);
        // Add cache buster timestamp to ensure fresh data every single time
        url.searchParams.set("_t", Date.now().toString());

        if (cleanToken) {
          url.searchParams.set("token", cleanToken);
        } else {
          url.searchParams.set("t", cleanNum);
          if (courierId) {
            url.searchParams.set("c", courierId);
          }
        }

        const res = await fetch(url.toString(), {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
          },
        });
        const json = await res.json();

        // Check if API reported parcel not yet trackable
        if (json.notTrackable) {
          setActiveResult(null);
          setNotTrackableInfo({
            trackingNumber: json.trackingNumber || cleanNum,
            courierName: json.courierName || detected,
            courierId: json.courierId || courierId,
            message: json.message,
            supportPhone: json.supportPhone,
            supportEmail: json.supportEmail,
          });

          if (shouldScroll) {
            setTimeout(() => {
              const el = document.getElementById("not-trackable-section");
              if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "start" });
              }
            }, 100);
          }
          return;
        }

        if (!res.ok || !json.success) {
          throw new Error(json.error || "Failed to fetch tracking information.");
        }

        setActiveResult(json.data);
        setNotTrackableInfo(null);

        // Update URL quietly with tamper-protected token without triggering re-render cascades
        if (json.data?.secureToken) {
          moduleLastAppliedToken = json.data.secureToken;

          const newUrl = new URL(window.location.href);
          if (newUrl.searchParams.get("token") !== json.data.secureToken) {
            newUrl.searchParams.set("token", json.data.secureToken);
            newUrl.searchParams.delete("t");
            newUrl.searchParams.delete("c");
            newUrl.searchParams.delete("d");
            window.history.replaceState(null, "", newUrl.toString());
          }
        }

        // Only scroll if the user explicitly submitted from UI
        if (shouldScroll) {
          setTimeout(() => {
            const el = document.getElementById("results-dashboard");
            if (el) {
              el.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          }, 150);
        }
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to load tracking details.");
        setActiveResult(null);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );



  // Check URL query parameters on initial mount only, or when user navigates to a new URL
  useEffect(() => {
    // If the URL already has the token that performSearch just set, ignore to prevent re-fetch loop
    const token = searchParams.get("token");
    if (token) {
      if (token === moduleLastAppliedToken) {
        return;
      }
      moduleLastAppliedToken = token;
      const timer = setTimeout(() => {
        performSearch("", "", token, false);
      }, 0);
      return () => clearTimeout(timer);
    }

    // Only process raw query params (d or t) on initial page load
    if (moduleIsInitialUrlHandled) return;
    moduleIsInitialUrlHandled = true;

    const encodedPayload = searchParams.get("d");
    if (encodedPayload) {
      try {
        const decoded = JSON.parse(atob(encodedPayload));
        if (decoded.t) {
          const timer = setTimeout(() => {
            performSearch(decoded.t, decoded.c, undefined, false);
          }, 0);
          return () => clearTimeout(timer);
        }
      } catch (e) {
        console.warn("Failed to decode base64 d parameter:", e);
      }
    }

    const t = searchParams.get("t") || searchParams.get("tracking");
    const c = searchParams.get("c") || searchParams.get("courier");
    if (t) {
      const timer = setTimeout(() => {
        performSearch(t, c || undefined, undefined, false);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [searchParams, performSearch]);

  // Watchlist helpers
  const handleAddToWatchlist = () => {
    if (!activeResult) return;
    const exists = watchlist.some((item) => item.trackingNumber === activeResult.trackingNumber);
    if (exists) return;

    const newItem: WatchlistItem = {
      trackingNumber: activeResult.trackingNumber,
      courierId: activeResult.courier.id,
      nickname: `${activeResult.courier.shortName} Parcel`,
      lastStatus: activeResult.overallStatus.phrase,
      lastUpdated: activeResult.overallStatus.timestamp,
      variant: activeResult.overallStatus.variant,
    };

    const updated = [newItem, ...watchlist];
    setWatchlist(updated);
    try {
      localStorage.setItem("trackflow_watchlist", JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveFromWatchlist = (num: string) => {
    const updated = watchlist.filter((item) => item.trackingNumber !== num);
    setWatchlist(updated);
    try {
      localStorage.setItem("trackflow_watchlist", JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateNickname = (num: string, newNickname: string) => {
    const updated = watchlist.map((item) =>
      item.trackingNumber === num ? { ...item, nickname: newNickname } : item
    );
    setWatchlist(updated);
    try {
      localStorage.setItem("trackflow_watchlist", JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const handleRefreshAllWatchlist = async () => {
    setIsRefreshingWatchlist(true);
    try {
      const updatedList: WatchlistItem[] = [];
      for (const item of watchlist) {
        try {
          const res = await fetch(`/api/track?t=${item.trackingNumber}&c=${item.courierId}`);
          const json = await res.json();
          if (json.success && json.data) {
            updatedList.push({
              ...item,
              lastStatus: json.data.overallStatus.phrase,
              lastUpdated: json.data.overallStatus.timestamp,
              variant: json.data.overallStatus.variant,
            });
          } else {
            updatedList.push(item);
          }
        } catch {
          updatedList.push(item);
        }
      }
      setWatchlist(updatedList);
      localStorage.setItem("trackflow_watchlist", JSON.stringify(updatedList));
    } finally {
      setIsRefreshingWatchlist(false);
    }
  };

  const handleCopyLink = () => {
    if (typeof navigator !== "undefined" && activeResult) {
      const secureUrl = `${window.location.origin}/tracking-result?token=${activeResult.secureToken}`;
      navigator.clipboard.writeText(secureUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const isSavedInWatchlist = activeResult
    ? watchlist.some((item) => item.trackingNumber === activeResult.trackingNumber)
    : false;

  const navigateSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors">
      {/* Top Bar Contract */}
      <Navbar
        watchlistCount={watchlist.length}
        onOpenWatchlist={() => setIsWatchlistOpen(true)}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        onNavigateSection={navigateSection}
        activeView={activeView}
        onChangeView={setActiveView}
      />

      <main className="flex-1">
        {activeView === "bulk" ? (
          /* Enterprise Bulk Operations Dashboard */
          <BulkDashboard
            onOpenTrackingResult={(trackingNum, courierId) => {
              performSearch(trackingNum, courierId, undefined, false);
            }}
          />
        ) : (
          /* Normal Single Tracker View */
          <>
            {/* Hero & Search Section */}
            <TrackerHero
              onSearch={(num, cId) => {
                performSearch(num, cId, undefined, true);
              }}
              isLoading={isLoading}
              initialTracking={activeResult ? activeResult.trackingNumber : ""}
              initialCourier={activeResult ? activeResult.courier.id : ""}
            />

            {/* Scrolling Supported Partners Logo Ribbon */}
            <PartnerMarquee />


            {/* Streamlined Status Banner if activeResult is present outside modal or after modal dismissal */}
            {activeResult && !isLoading && !isTrackingModalOpen && (
              <div className="mx-auto max-w-4xl px-4 sm:px-6 my-10">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 shrink-0">
                      <Package className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {activeResult.courier.name}
                        </span>
                        <span className="text-xs font-mono text-slate-500">
                          #{activeResult.trackingNumber}
                        </span>
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          · {activeResult.overallStatus.phrase}
                        </span>
                      </div>
                      {activeResult.bookingDetails.origin && activeResult.bookingDetails.destination ? (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {activeResult.bookingDetails.origin.split(",")[0]} → {activeResult.bookingDetails.destination.split(",")[0]}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Last scan: {activeResult.overallStatus.timestamp}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setIsTrackingModalOpen(true)}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 shadow-xs cursor-pointer"
                    >
                      <span>View Details Popup</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleTrackNextOrder}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                    >
                      <PlusCircle className="h-3.5 w-3.5" />
                      <span>New</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Features & Capabilities */}
            <FeaturesOverview />

            {/* 20+ Supported Couriers Directory */}
            <CourierDirectory
              onSelectCourier={(courierId) => {
                const el = document.getElementById("track-section");
                if (el) {
                  el.scrollIntoView({ behavior: "smooth", block: "start" });
                }
                if (typeof window !== "undefined") {
                  window.dispatchEvent(
                    new CustomEvent("trackflow:set-courier", {
                      detail: { courierId },
                    })
                  );
                }
                setTimeout(() => {
                  const inputEl = document.getElementById("tracking-input") as HTMLInputElement | null;
                  if (inputEl) {
                    inputEl.focus();
                    inputEl.select();
                  }
                }, 200);
              }}
            />

            {/* FAQ Section */}
            <FaqSection />
          </>
        )}
      </main>

      {/* Primary Tracking Details & Fetching Animation Dialog Popup */}
      <TrackingModalPopup
        isOpen={isTrackingModalOpen}
        isLoading={isLoading}
        trackingResult={activeResult}
        notTrackableInfo={notTrackableInfo}
        errorMsg={errorMsg}
        pendingQuery={pendingQuery}
        onClose={() => setIsTrackingModalOpen(false)}
        onTrackNextOrder={handleTrackNextOrder}
        onRefresh={() => {
          if (activeResult) {
            performSearch(activeResult.trackingNumber, activeResult.courier.id, undefined, false);
          } else if (pendingQuery.number) {
            performSearch(pendingQuery.number, undefined, undefined, false);
          }
        }}
        onShare={() => setIsShareModalOpen(true)}
        isSavedInWatchlist={isSavedInWatchlist}
        onToggleWatchlist={handleAddToWatchlist}
        onSelectSample={(sampleNum: string, cId: string) => {
          performSearch(sampleNum, cId, undefined, true);
        }}
      />

      {/* Shareable Card Modal */}
      {activeResult && (
        <ShareCardModal
          data={activeResult}
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
        />
      )}

      {/* Watchlist Drawer */}
      <WatchlistDrawer
        isOpen={isWatchlistOpen}
        onClose={() => setIsWatchlistOpen(false)}
        items={watchlist}
        onRemoveItem={handleRemoveFromWatchlist}
        onUpdateNickname={handleUpdateNickname}
        onSelectTrack={(num, cId) => {
          performSearch(num, cId, undefined, true);
        }}
        onRefreshAll={handleRefreshAllWatchlist}
        isRefreshing={isRefreshingWatchlist}
      />

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-indigo-600 border-t-transparent" />
        </div>
      }
    >
      <TrackingAppContent />
    </Suspense>
  );
}
