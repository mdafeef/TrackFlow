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
import { AuthModal } from "@/components/AuthModal";
import { AuthUserProfile } from "@/app/api/auth/route";
import { COURIER_MAP, autoDetectCourier } from "@/lib/couriers";
import { TrackingResult } from "@/app/api/track/route";
import { OfflineIndicator } from "@/components/PWAInstallButton";
import {
  syncWatchlistToOfflineCache,
  loadWatchlistFromOfflineCache,
  cacheTrackingResultOffline,
  getOfflineCachedTrackingResult,
} from "@/lib/usePWAInstall";
import {
  PublicTabId,
  PUBLIC_TAB_PATHS,
  resolveRouteFromPathname,
  silentNavigateTab,
} from "@/lib/tabRoutes";

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

  // Dark mode
  const [isDark, setIsDark] = useState(false);

  // Real User Authentication State (Single = Public, Workspace = Logged-In)
  const [authUser, setAuthUser] = useState<AuthUserProfile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Active view: single tracker vs bulk dashboard, plus active public tab
  const [activeView, setActiveView] = useState<"single" | "bulk">("single");
  const [publicTab, setPublicTab] = useState<PublicTabId>("track");
  const [selectedCarrierFromDirectory, setSelectedCarrierFromDirectory] = useState<string>("");

  const handleSelectPublicTab = useCallback((tab: PublicTabId) => {
    setActiveView("single");
    setPublicTab(tab);
    silentNavigateTab(PUBLIC_TAB_PATHS[tab]);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  // Track Next Order Action: Clears active results/errors and smoothly focuses input
  const handleTrackNextOrder = useCallback(() => {
    setActiveResult(null);
    setNotTrackableInfo(null);
    setErrorMsg(null);
    setActiveView("single");
    setPublicTab("track");
    silentNavigateTab("/");

    setTimeout(() => {
      const inputEl = document.getElementById("tracking-input") as HTMLInputElement | null;
      if (inputEl) {
        inputEl.focus();
        inputEl.select();
      }
    }, 150);
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
      syncWatchlistToOfflineCache(updated);
      setIsWatchlistOpen(true);
    },
    [watchlist]
  );

  // Initialize theme, watchlist (with Service Worker cache fallback), and auth session after hydration
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

        loadWatchlistFromOfflineCache().then((cachedItems) => {
          if (cachedItems.length > 0) {
            setWatchlist(cachedItems);
            syncWatchlistToOfflineCache(cachedItems);
          }
        });

        const storedUser = localStorage.getItem("trackflow_auth_user");
        if (storedUser) {
          try {
            setAuthUser(JSON.parse(storedUser) as AuthUserProfile);
          } catch {}
        }

        // Verify or hydrate session with backend /api/auth
        const token = localStorage.getItem("trackflow_auth_token");
        fetch("/api/auth", {
          method: "GET",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
          .then((r) => r.json())
          .then((data) => {
            if (data?.authenticated && data?.user) {
              setAuthUser(data.user);
              localStorage.setItem("trackflow_auth_user", JSON.stringify(data.user));
            }
          })
          .catch(() => {});
      } catch (e) {
        console.error("Local storage initialization error:", e);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "logout" }),
      });
    } catch {}
    try {
      localStorage.removeItem("trackflow_auth_user");
      localStorage.removeItem("trackflow_auth_token");
    } catch {}
    setAuthUser(null);
    setActiveView("single");
    setPublicTab("track");
    silentNavigateTab("/");
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

  // Perform tracking search - fetches fresh data when online and falls back to offline cache when offline
  const performSearch = useCallback(
    async (
      trackingNumber: string,
      courierId?: string,
      shouldScroll: boolean = false
    ) => {
      const cleanNum = (trackingNumber || "").trim().toUpperCase();

      if (!cleanNum) return;

      const autoDetected = autoDetectCourier(cleanNum);
      let resolvedCourierId = (courierId || "").trim().toLowerCase();

      // Prevent stale "speedpost" selection from overriding a tracking number that matches another carrier's format (e.g. DTDC)
      if (
        resolvedCourierId === "speedpost" &&
        autoDetected &&
        autoDetected.id !== "speedpost" &&
        !COURIER_MAP.speedpost.regex.test(cleanNum.replace(/-/g, ""))
      ) {
        resolvedCourierId = autoDetected.id;
      } else if (!resolvedCourierId && autoDetected) {
        resolvedCourierId = autoDetected.id;
      }

      // Determine courier label for fetching animation
      const detected =
        (resolvedCourierId && COURIER_MAP[resolvedCourierId]?.name) ||
        autoDetected?.name ||
        "Carrier Network";

      setPendingQuery({
        number: cleanNum,
        courierName: detected,
      });

      setIsLoading(true);
      setIsTrackingModalOpen(true);
      setActiveResult(null);
      setErrorMsg(null);
      setNotTrackableInfo(null);

      // Strip query parameters while keeping the current clean tab pathname
      try {
        if (window.location.search) {
          window.history.replaceState(null, "", window.location.pathname || "/");
        }
      } catch {
        // ignore history state errors
      }

      try {
        const res = await fetch("/api/track", {
          method: "POST",
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
          },
          body: JSON.stringify({
            trackingNumber: cleanNum,
            courierId: resolvedCourierId,
          }),
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
          const cachedOffline = await getOfflineCachedTrackingResult(cleanNum);
          if (cachedOffline) {
            setActiveResult(cachedOffline);
            setNotTrackableInfo(null);
            return;
          }
          throw new Error(json.error || "Failed to fetch tracking information.");
        }

        setActiveResult(json.data);
        setNotTrackableInfo(null);
        cacheTrackingResultOffline(json.data);

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
        // Offline fallback from client/Service Worker cache
        const cachedOffline = await getOfflineCachedTrackingResult(cleanNum);
        if (cachedOffline) {
          setActiveResult(cachedOffline);
          setNotTrackableInfo(null);
          setErrorMsg(null);
          return;
        }
        setErrorMsg(err.message || "Failed to load tracking details.");
        setActiveResult(null);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Sync initial URL pathname & browser Back/Forward (popstate) with in-page tabs
  useEffect(() => {
    if (typeof window === "undefined") return;

    const applyPathnameRoute = (pathname: string, normalizeUrl: boolean = false) => {
      const resolved = resolveRouteFromPathname(pathname);
      if (normalizeUrl && (window.location.search || window.location.pathname !== resolved.canonicalPath)) {
        silentNavigateTab(resolved.canonicalPath, true);
      }
      setActiveView(resolved.view);
      setPublicTab(resolved.publicTab);
      if (resolved.view === "bulk") {
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent("trackflow:set-workspace-menu", {
              detail: { menu: resolved.workspaceTab, skipUrlPush: true },
            })
          );
        }, 0);
      }
    };

    const timer = setTimeout(() => {
      applyPathnameRoute(window.location.pathname, true);

      try {
        const rawReturn = sessionStorage.getItem("trackflow_scan_return");
        if (rawReturn) {
          const parsed = JSON.parse(rawReturn);
          if (
            parsed.target === "bulk_review" ||
            parsed.target === "bulk_ingested" ||
            parsed.target === "bulk_dashboard"
          ) {
            setActiveView("bulk");
            silentNavigateTab("/dashboard", true);
            if (parsed.target !== "bulk_review") {
              sessionStorage.removeItem("trackflow_scan_return");
            }
          } else if (parsed.target === "single_track" && parsed.trackingNumber) {
            sessionStorage.removeItem("trackflow_scan_return");
            setActiveView("single");
            setPublicTab("track");
            silentNavigateTab("/", true);
            setTimeout(() => {
              performSearch(parsed.trackingNumber, parsed.courierId, true);
            }, 50);
          }
        }
      } catch {
        // ignore
      }
    }, 0);

    const handlePopState = () => {
      applyPathnameRoute(window.location.pathname, false);
    };
    window.addEventListener("popstate", handlePopState);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [searchParams, performSearch]);

  // Watchlist helpers (synced to Service Worker offline cache)
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
    syncWatchlistToOfflineCache(updated);
    cacheTrackingResultOffline(activeResult);
  };

  const handleRemoveFromWatchlist = (num: string) => {
    const updated = watchlist.filter((item) => item.trackingNumber !== num);
    setWatchlist(updated);
    syncWatchlistToOfflineCache(updated);
  };

  const handleUpdateNickname = (num: string, newNickname: string) => {
    const updated = watchlist.map((item) =>
      item.trackingNumber === num ? { ...item, nickname: newNickname } : item
    );
    setWatchlist(updated);
    syncWatchlistToOfflineCache(updated);
  };

  const handleRefreshAllWatchlist = async () => {
    setIsRefreshingWatchlist(true);
    try {
      const updatedList: WatchlistItem[] = [];
      for (const item of watchlist) {
        try {
          const res = await fetch("/api/track", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              trackingNumber: item.trackingNumber,
              courierId: item.courierId,
            }),
          });
          const json = await res.json();
          if (json.success && json.data) {
            cacheTrackingResultOffline(json.data);
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
      syncWatchlistToOfflineCache(updatedList);
    } finally {
      setIsRefreshingWatchlist(false);
    }
  };

  const isSavedInWatchlist = activeResult
    ? watchlist.some((item) => item.trackingNumber === activeResult.trackingNumber)
    : false;

  return (
    <div
      className={`w-full max-w-full flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors pt-14 sm:pt-16 ${
        activeView === "bulk" && authUser
          ? "h-screen overflow-hidden"
          : "min-h-screen overflow-x-hidden"
      }`}
    >
      {/* Top Bar Contract (Fixed at top) */}
      <Navbar
        watchlistCount={watchlist.length}
        onOpenWatchlist={() => setIsWatchlistOpen(true)}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        publicTab={publicTab}
        onSelectPublicTab={handleSelectPublicTab}
        activeView={activeView}
        onChangeView={(nextView) => {
          if (nextView === "bulk" && !authUser) {
            setIsAuthModalOpen(true);
            return;
          }
          setActiveView(nextView);
          if (nextView === "bulk") {
            const currentResolved =
              typeof window !== "undefined"
                ? resolveRouteFromPathname(window.location.pathname)
                : null;
            silentNavigateTab(
              currentResolved?.view === "bulk" ? currentResolved.canonicalPath : "/dashboard"
            );
          } else {
            silentNavigateTab(PUBLIC_TAB_PATHS[publicTab]);
          }
        }}
        authUser={authUser}
        onOpenLogin={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
      />

      <main className={activeView === "bulk" && authUser ? "flex-1 min-h-0 flex overflow-hidden" : "flex-1"}>
        {activeView === "bulk" ? (
          authUser ? (
            /* Enterprise Bulk Operations Dashboard (Authenticated) */
            <BulkDashboard
              onOpenTrackingResult={(trackingNum, courierId) => {
                performSearch(trackingNum, courierId, false);
              }}
              authUser={authUser}
              onLogout={handleLogout}
              onProfileUpdated={(updated) => setAuthUser(updated)}
            />
          ) : (
            /* Workspace Login Gate if accessed while unauthenticated */
            <AuthModal
              isOpen={true}
              inlineMode={true}
              onClose={() => handleSelectPublicTab("track")}
              onSuccess={(user) => {
                setAuthUser(user);
                setIsAuthModalOpen(false);
                setActiveView("bulk");
                const currentResolved =
                  typeof window !== "undefined"
                    ? resolveRouteFromPathname(window.location.pathname)
                    : null;
                silentNavigateTab(
                  currentResolved?.view === "bulk" ? currentResolved.canonicalPath : "/dashboard"
                );
              }}
            />
          )
        ) : (
          /* Single Tracker Public Tabs: Renders only the active tab in-page for instant load */
          <>
            {publicTab === "track" && (
              <div className="animate-in fade-in duration-150">
                {/* Hero & Search Section */}
                <TrackerHero
                  onSearch={(num, cId) => {
                    performSearch(num, cId, true);
                  }}
                  isLoading={isLoading}
                  initialTracking={
                    activeResult
                      ? activeResult.trackingNumber
                      : notTrackableInfo
                      ? notTrackableInfo.trackingNumber
                      : ""
                  }
                  initialCourier={
                    selectedCarrierFromDirectory ||
                    (activeResult
                      ? activeResult.courier.id
                      : notTrackableInfo?.courierId
                      ? notTrackableInfo.courierId
                      : "")
                  }
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
              </div>
            )}

            {publicTab === "carriers" && (
              <div className="animate-in fade-in duration-150">
                <CourierDirectory
                  onSelectCourier={(courierId) => {
                    setSelectedCarrierFromDirectory(courierId);
                    handleSelectPublicTab("track");
                    setTimeout(() => {
                      if (typeof window !== "undefined") {
                        window.dispatchEvent(
                          new CustomEvent("trackflow:set-courier", {
                            detail: { courierId },
                          })
                        );
                      }
                      const inputEl = document.getElementById("tracking-input") as HTMLInputElement | null;
                      if (inputEl) {
                        inputEl.focus();
                        inputEl.select();
                      }
                    }, 120);
                  }}
                />
              </div>
            )}

            {publicTab === "features" && (
              <div className="animate-in fade-in duration-150">
                <FeaturesOverview />
              </div>
            )}

            {publicTab === "faq" && (
              <div className="animate-in fade-in duration-150">
                <FaqSection />
              </div>
            )}
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
            performSearch(activeResult.trackingNumber, activeResult.courier.id, false);
          } else if (notTrackableInfo) {
            performSearch(notTrackableInfo.trackingNumber, notTrackableInfo.courierId, false);
          } else if (pendingQuery.number) {
            performSearch(pendingQuery.number, undefined, false);
          }
        }}
        onShare={() => setIsShareModalOpen(true)}
        isSavedInWatchlist={isSavedInWatchlist}
        onToggleWatchlist={handleAddToWatchlist}
        onSelectSample={(sampleNum: string, cId: string) => {
          performSearch(sampleNum, cId, true);
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
          performSearch(num, cId, true);
        }}
        onRefreshAll={handleRefreshAllWatchlist}
        isRefreshing={isRefreshingWatchlist}
      />

      {/* Real Workspace Login & Registration Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(user) => {
          setAuthUser(user);
          setIsAuthModalOpen(false);
          setActiveView("bulk");
          silentNavigateTab("/dashboard");
        }}
      />

      {/* Offline Status & Cached Watchlist Quick Trigger */}
      <OfflineIndicator onOpenWatchlist={() => setIsWatchlistOpen(true)} />

      {/* Footer (Only shown in Single Tracker landing view; Workspace uses full-screen SaaS layout) */}
      {activeView === "single" && <Footer />}
    </div>
  );
}

interface HomePageProps {
  params?: Promise<Record<string, string | string[]>>;
  searchParams?: Promise<Record<string, string | string[]>>;
}

export default function HomePage(props: HomePageProps) {
  if (props?.params) {
    React.use(props.params);
  }
  if (props?.searchParams) {
    React.use(props.searchParams);
  }

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
