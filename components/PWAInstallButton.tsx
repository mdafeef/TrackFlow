"use client";

import React, { useState } from "react";
import { Download, Smartphone, Share, PlusSquare, X, WifiOff, CheckCircle2 } from "lucide-react";
import { usePWAInstall, useOnlineStatus } from "@/lib/usePWAInstall";

interface PWAInstallButtonProps {
  variant?: "header" | "menu";
  onAfterClick?: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = "header",
  onAfterClick,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  // If already running as an installed standalone PWA, hide the install button
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
      if (onAfterClick) onAfterClick();
      return;
    }
    setShowGuideModal(true);
  };

  return (
    <>
      {variant === "menu" ? (
        <button
          type="button"
          onClick={handleInstallClick}
          className="w-full flex items-center gap-2.5 rounded-xl hover:bg-indigo-50/80 dark:hover:bg-slate-800/80 px-3 py-2 text-xs font-bold text-slate-700 hover:text-indigo-600 dark:text-slate-200 dark:hover:text-indigo-400 transition-colors cursor-pointer"
        >
          <Download className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
          <span>{isIOS ? "Install on iOS" : "Install App"}</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleInstallClick}
          title="Install TrackFlow App"
          aria-label="Install TrackFlow App"
          className="inline-flex h-8 sm:h-9 items-center gap-1.5 rounded-xl border border-indigo-200/90 bg-indigo-50/80 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900/70 dark:bg-indigo-950/60 dark:text-indigo-300 dark:hover:bg-indigo-900/70 transition-colors cursor-pointer shrink-0"
        >
          <Download className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden lg:inline">{isIOS ? "Install iOS" : "Install App"}</span>
        </button>
      )}

      {showGuideModal && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4"
          onClick={() => setShowGuideModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-xs shrink-0">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Install TrackFlow App
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Offline watchlist &amp; instant home screen launch
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {isIOS ? (
              <div className="mt-4 space-y-2.5 rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/60 text-xs text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-bold">
                    1
                  </span>
                  <span className="flex items-center gap-1.5 flex-wrap">
                    Tap the <strong>Share</strong> icon{" "}
                    <Share className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 inline" /> in Safari.
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-bold">
                    2
                  </span>
                  <span className="flex items-center gap-1.5 flex-wrap">
                    Select <strong>Add to Home Screen</strong>{" "}
                    <PlusSquare className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 inline" />.
                  </span>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-2.5 rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/60 text-xs text-slate-700 dark:text-slate-300">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    Click the <strong>Install TrackFlow</strong> icon in your browser&apos;s address bar or open browser menu &rarr; <strong>Install App / Add to Home Screen</strong>.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    Your saved Watchlist and recent tracking timelines are automatically cached for offline viewing.
                  </span>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setShowGuideModal(false);
                if (onAfterClick) onAfterClick();
              }}
              className="mt-4 w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 py-2 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC<{ onOpenWatchlist?: () => void }> = ({
  onOpenWatchlist,
}) => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2.5 rounded-xl border border-amber-400/50 bg-amber-500 px-3.5 py-2 text-xs font-bold text-white shadow-xl">
      <WifiOff className="h-4 w-4 shrink-0 animate-pulse" />
      <span>Offline Mode — Watchlist cached</span>
      {onOpenWatchlist && (
        <button
          type="button"
          onClick={onOpenWatchlist}
          className="ml-1 rounded-lg bg-white/20 hover:bg-white/30 px-2 py-0.5 text-[11px] font-extrabold text-white transition-colors cursor-pointer"
        >
          View Watchlist
        </button>
      )}
    </div>
  );
};
