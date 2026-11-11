"use client";

import React, { useRef, useEffect, useState } from "react";
import { X, Download, Share2, Copy, Check, MessageSquare } from "lucide-react";
import { TrackingResult } from "@/app/api/track/route";

interface ShareCardModalProps {
  data: TrackingResult;
  isOpen: boolean;
  onClose: () => void;
}

export function ShareCardModal({ data, isOpen, onClose }: ShareCardModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isRendering, setIsRendering] = useState(true);

  const trackingNumber = data.trackingNumber;
  const courierName = data.courier.name;
  const statusPhrase = data.overallStatus.phrase;
  const statusVariant = data.overallStatus.variant;
  const dateStr = data.overallStatus.timestamp;
  const origin = data.bookingDetails.origin.split(",")[0] || "Origin";
  const dest = data.bookingDetails.destination.split(",")[0] || "Destination";

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

  useEffect(() => {
    if (!isOpen) return;

    const renderCard = async () => {
      setIsRendering(true);
      const canvas = canvasRef.current;
      if (!canvas) return;

      const SIZE = 1080;
      const PAD = 96;
      canvas.width = SIZE;
      canvas.height = SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const variantColors: Record<string, string> = {
        delivered: "#16a34a",
        "in-transit": "#4f46e5",
        "out-for-delivery": "#d97706",
        pending: "#d97706",
      };
      const accent = variantColors[statusVariant] || "#4f46e5";

      // Background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, SIZE, SIZE);

      // Top corner radial aura glow
      const glow = ctx.createRadialGradient(PAD + 140, 240, 0, PAD + 140, 240, 680);
      glow.addColorStop(0, `${accent}22`);
      glow.addColorStop(1, `${accent}00`);
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, SIZE, SIZE);

      // Left Accent Strip
      ctx.fillStyle = accent;
      ctx.fillRect(0, 0, 16, SIZE);

      const FONT = '"Plus Jakarta Sans", system-ui, -apple-system, sans-serif';

      // Brand Wordmark
      ctx.fillStyle = "#0f172a";
      ctx.font = `800 44px ${FONT}`;
      ctx.fillText("TrackFlow", PAD, 160);

      // Dot next to brand
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(PAD + ctx.measureText("TrackFlow").width + 20, 146, 9, 0, Math.PI * 2);
      ctx.fill();

      // Top category label
      ctx.fillStyle = accent;
      ctx.font = `700 30px ${FONT}`;
      ctx.fillText("PARCEL STATUS UPDATE", PAD, 420);

      // Big Status Headline
      ctx.fillStyle = accent;
      let fontSize = 110;
      ctx.font = `800 ${fontSize}px ${FONT}`;

      // Wrap headline text
      const words = statusPhrase.split(" ");
      let line = "";
      const lines = [];
      for (const w of words) {
        const test = line ? `${line} ${w}` : w;
        if (ctx.measureText(test).width > SIZE - PAD * 2) {
          lines.push(line);
          line = w;
        } else {
          line = test;
        }
      }
      if (line) lines.push(line);

      let y = 460 + fontSize;
      for (const l of lines) {
        ctx.fillText(l, PAD, y);
        y += fontSize * 1.1;
      }

      // Tracking ID
      y += 24;
      ctx.fillStyle = "#0f172a";
      ctx.font = `800 52px ${FONT}`;
      ctx.fillText(`#${trackingNumber}`, PAD, y);

      // Subtitle line (Courier & Route)
      y += 64;
      ctx.fillStyle = "#64748b";
      ctx.font = `600 36px ${FONT}`;
      ctx.fillText(`${courierName}   ·   ${origin} → ${dest}`, PAD, y);

      y += 48;
      ctx.font = `500 30px ${FONT}`;
      ctx.fillText(`Last Updated: ${dateStr}`, PAD, y);

      // Footer
      ctx.fillStyle = "#94a3b8";
      ctx.font = `600 30px ${FONT}`;
      ctx.fillText("Track live parcel updates on TrackFlow", PAD, SIZE - PAD);

      setIsRendering(false);
    };

    renderCard();
  }, [isOpen, trackingNumber, courierName, statusPhrase, statusVariant, dateStr, origin, dest]);

  if (!isOpen) return null;

  const shareSummaryText = `TrackFlow Status Update — #${trackingNumber} (${courierName}): ${statusPhrase} (${dateStr})`;

  const handleDownloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `TrackFlow-${trackingNumber}-status.png`;
    a.click();
  };

  const handleCopyLink = () => {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(shareSummaryText);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleShareWhatsApp = async () => {
    const text = encodeURIComponent(
      `📦 TrackFlow Status Update for #${trackingNumber} (${courierName}):\n*${statusPhrase}*\nLast Updated: ${dateStr}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="relative w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
            <Share2 className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Share Status Card
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Download clean 1080x1080 PNG or share directly to WhatsApp
            </p>
          </div>
        </div>

        {/* Canvas Preview Container */}
        <div className="relative aspect-square w-full rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-100 dark:bg-slate-950 flex items-center justify-center">
          <canvas
            ref={canvasRef}
            className="h-full w-full object-contain"
          />
          {isRendering && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-slate-900/70">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors"
          >
            <MessageSquare className="h-4 w-4" />
            <span>Share on WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadImage}
            className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Download High-Res PNG</span>
          </button>
        </div>

        {/* Copy Status Summary bar */}
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-950">
            <input
              type="text"
              readOnly
              value={shareSummaryText}
              className="flex-1 bg-transparent px-2 text-xs font-mono text-slate-600 dark:text-slate-300 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              {copiedLink ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy Summary</span>
                </>
              )}
            </button>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 px-1">
            Protected Mode: Tracking details are rendered in-app without exposing query URLs to unauthorized third-party scrapers.
          </p>
        </div>
      </div>
    </div>
  );
}
