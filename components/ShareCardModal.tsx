"use client";

import React, { useRef, useState } from "react";
import {
  X,
  Download,
  Copy,
  Check,
  MessageCircle,
  Sparkles,
  ShieldCheck,
  MapPin,
  Clock,
  Package,
  Truck,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { TrackingResult } from "@/app/api/track/route";

interface ShareCardModalProps {
  data: TrackingResult;
  isOpen: boolean;
  onClose: () => void;
}

export function ShareCardModal({ data, isOpen, onClose }: ShareCardModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [isGeneratingImg, setIsGeneratingImg] = useState(false);

  if (!isOpen) return null;

  const isDelivered = data.overallStatus.variant === "delivered";
  const isOutForDelivery = data.overallStatus.variant === "out-for-delivery";
  const isReturned = data.overallStatus.variant === "returned";

  const originText = data.bookingDetails.origin || "Origin Dispatch Hub";
  const destText = data.bookingDetails.destination || "Destination Hub";
  const latestCheckpoint =
    data.activities[0]?.statusText || data.overallStatus.phrase || "In Transit";
  const latestFacility =
    data.activities[0]?.facility || data.bookingDetails.currentLocation || destText;

  const progressPercent = isDelivered
    ? 100
    : isOutForDelivery
    ? 82
    : isReturned
    ? 100
    : data.overallStatus.stage === "booked"
    ? 22
    : 58;

  const generateShareText = () => {
    const statusEmoji = isDelivered
      ? "✅"
      : isOutForDelivery
      ? "🚚"
      : isReturned
      ? "↩️"
      : "📦";
    const lines = [
      `${statusEmoji} *TrackFlow Shipment Status*`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `*Tracking No:* ${data.trackingNumber}`,
      `*Courier:* ${data.courier.name}`,
      `*Status:* ${data.overallStatus.phrase}`,
    ];
    if (data.bookingDetails.origin && data.bookingDetails.destination) {
      lines.push(
        `*Route:* ${data.bookingDetails.origin} → ${data.bookingDetails.destination}`
      );
    }
    if (data.activities[0]?.facility) {
      lines.push(
        `*Latest Scan:* ${data.activities[0].statusText} (${data.activities[0].facility})`
      );
    }
    if (data.estimatedDelivery.date) {
      lines.push(`*Delivery Status:* ${data.estimatedDelivery.date}`);
    }
    return lines.join("\n");
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(generateShareText());
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(generateShareText());
    const a = document.createElement("a");
    a.href = `https://wa.me/?text=${text}`;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Helper to wrap text cleanly on HTML5 Canvas without overflowing
  const drawWrappedText = (
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
    maxLines: number = 2
  ): number => {
    const words = (text || "N/A").split(/\s+/);
    let line = "";
    let linesDrawn = 0;
    let currentY = y;

    for (let i = 0; i < words.length; i++) {
      const testLine = line ? `${line} ${words[i]}` : words[i];
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && line !== "") {
        linesDrawn++;
        if (linesDrawn >= maxLines) {
          let truncated = line;
          while (
            ctx.measureText(truncated + "…").width > maxWidth &&
            truncated.length > 0
          ) {
            truncated = truncated.slice(0, -1);
          }
          ctx.fillText(truncated + "…", x, currentY);
          return currentY + lineHeight;
        }
        ctx.fillText(line, x, currentY);
        line = words[i];
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }

    if (line) {
      if (ctx.measureText(line).width > maxWidth) {
        let truncated = line;
        while (
          ctx.measureText(truncated + "…").width > maxWidth &&
          truncated.length > 0
        ) {
          truncated = truncated.slice(0, -1);
        }
        ctx.fillText(truncated + "…", x, currentY);
      } else {
        ctx.fillText(line, x, currentY);
      }
      currentY += lineHeight;
    }

    return currentY;
  };

  const handleDownloadImageCard = () => {
    setIsGeneratingImg(true);
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = 1080;
      canvas.height = 1080;

      // 1. Deep Premium Dark Gradient Canvas Background
      const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1080);
      bgGrad.addColorStop(0, "#090d16");
      bgGrad.addColorStop(0.5, "#111827");
      bgGrad.addColorStop(1, "#1e1b4b");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1080, 1080);

      // Subtle glowing accent orbs
      const orb1 = ctx.createRadialGradient(200, 160, 20, 200, 160, 360);
      orb1.addColorStop(0, "rgba(99, 102, 241, 0.25)");
      orb1.addColorStop(1, "rgba(99, 102, 241, 0)");
      ctx.fillStyle = orb1;
      ctx.fillRect(0, 0, 1080, 1080);

      const orb2 = ctx.createRadialGradient(880, 900, 20, 880, 900, 380);
      orb2.addColorStop(
        0,
        isDelivered ? "rgba(16, 185, 129, 0.22)" : "rgba(56, 189, 248, 0.22)"
      );
      orb2.addColorStop(1, "rgba(16, 185, 129, 0)");
      ctx.fillStyle = orb2;
      ctx.fillRect(0, 0, 1080, 1080);

      // 2. Main Elevated Boarding-Pass Status Card Container
      ctx.fillStyle = "rgba(17, 24, 39, 0.88)";
      ctx.strokeStyle = "rgba(99, 102, 241, 0.35)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(64, 64, 952, 952, 44);
      ctx.fill();
      ctx.stroke();

      // Top Header Banner Strip inside Card
      const headerGrad = ctx.createLinearGradient(64, 64, 1016, 250);
      headerGrad.addColorStop(0, "rgba(79, 70, 229, 0.32)");
      headerGrad.addColorStop(0.5, "rgba(56, 189, 248, 0.14)");
      headerGrad.addColorStop(1, "rgba(16, 185, 129, 0.2)");
      ctx.fillStyle = headerGrad;
      ctx.beginPath();
      ctx.roundRect(64, 64, 952, 190, [44, 44, 0, 0]);
      ctx.fill();

      // Brand Title + Carrier Pill
      ctx.fillStyle = "#a5b4fc";
      ctx.font = "600 22px system-ui, -apple-system, sans-serif";
      ctx.fillText("TRACKFLOW • VERIFIED SHIPMENT PASS", 116, 134);

      ctx.fillStyle = "#ffffff";
      ctx.font = "700 34px system-ui, -apple-system, sans-serif";
      drawWrappedText(ctx, data.courier.name, 116, 186, 540, 40, 1);

      // Status Pill on Top Right
      const pillBg = isDelivered
        ? "rgba(16, 185, 129, 0.22)"
        : isOutForDelivery
        ? "rgba(245, 158, 11, 0.22)"
        : isReturned
        ? "rgba(244, 63, 94, 0.22)"
        : "rgba(56, 189, 248, 0.22)";
      const pillStroke = isDelivered
        ? "#10b981"
        : isOutForDelivery
        ? "#f59e0b"
        : isReturned
        ? "#f43f5e"
        : "#38bdf8";
      const pillText = isDelivered
        ? "#34d399"
        : isOutForDelivery
        ? "#fbbf24"
        : isReturned
        ? "#fb7185"
        : "#7dd3fc";

      ctx.fillStyle = pillBg;
      ctx.strokeStyle = pillStroke;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(660, 115, 304, 72, 36);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = pillText;
      ctx.font = "700 24px system-ui, -apple-system, sans-serif";
      const statusStr = data.overallStatus.label.toUpperCase();
      drawWrappedText(ctx, statusStr, 692, 160, 248, 28, 1);

      // 3. Tracking Number Showcase Box
      ctx.fillStyle = "rgba(30, 41, 59, 0.75)";
      ctx.strokeStyle = "rgba(148, 163, 184, 0.2)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(116, 290, 848, 148, 28);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#94a3b8";
      ctx.font = "600 20px system-ui, -apple-system, sans-serif";
      ctx.fillText("CONSIGNMENT / TRACKING NUMBER", 152, 338);

      ctx.fillStyle = "#f8fafc";
      const awbFontSize = data.trackingNumber.length > 16 ? 44 : 54;
      ctx.font = `700 ${awbFontSize}px monospace`;
      drawWrappedText(ctx, data.trackingNumber, 152, 404, 780, 56, 1);

      // 4. Visual Route Progress Section
      ctx.fillStyle = "rgba(30, 41, 59, 0.55)";
      ctx.beginPath();
      ctx.roundRect(116, 468, 848, 210, 28);
      ctx.fill();

      // Origin & Destination labels
      ctx.fillStyle = "#94a3b8";
      ctx.font = "600 19px system-ui, -apple-system, sans-serif";
      ctx.fillText("ORIGIN", 152, 514);
      ctx.fillText("DESTINATION", 620, 514);

      ctx.fillStyle = "#ffffff";
      ctx.font = "700 27px system-ui, -apple-system, sans-serif";
      drawWrappedText(ctx, originText, 152, 552, 380, 34, 1);
      drawWrappedText(ctx, destText, 620, 552, 310, 34, 1);

      // Progress track bar
      ctx.fillStyle = "rgba(71, 85, 105, 0.6)";
      ctx.beginPath();
      ctx.roundRect(152, 608, 776, 14, 7);
      ctx.fill();

      const fillWidth = Math.round((776 * progressPercent) / 100);
      const barGrad = ctx.createLinearGradient(152, 608, 152 + fillWidth, 608);
      barGrad.addColorStop(0, "#6366f1");
      barGrad.addColorStop(1, isDelivered ? "#10b981" : "#38bdf8");
      ctx.fillStyle = barGrad;
      ctx.beginPath();
      ctx.roundRect(152, 608, fillWidth, 14, 7);
      ctx.fill();

      // 5. Two-Column Details Grid (Latest Checkpoint & Delivery ETA)
      ctx.fillStyle = "rgba(30, 41, 59, 0.55)";
      ctx.beginPath();
      ctx.roundRect(116, 708, 410, 185, 26);
      ctx.fill();

      ctx.beginPath();
      ctx.roundRect(554, 708, 410, 185, 26);
      ctx.fill();

      ctx.fillStyle = "#94a3b8";
      ctx.font = "600 18px system-ui, -apple-system, sans-serif";
      ctx.fillText("LATEST CHECKPOINT", 148, 750);
      ctx.fillText("DELIVERY SCHEDULE", 586, 750);

      ctx.fillStyle = "#f8fafc";
      ctx.font = "700 24px system-ui, -apple-system, sans-serif";
      drawWrappedText(ctx, latestCheckpoint, 148, 790, 346, 32, 2);
      drawWrappedText(
        ctx,
        data.estimatedDelivery.date || data.overallStatus.timestamp,
        586,
        790,
        346,
        32,
        2
      );

      ctx.fillStyle = "#818cf8";
      ctx.font = "500 19px system-ui, -apple-system, sans-serif";
      drawWrappedText(ctx, latestFacility, 148, 862, 346, 26, 1);
      drawWrappedText(
        ctx,
        `${data.bookingDetails.articleType || "Express Consignment"}${
          data.bookingDetails.weight ? ` • ${data.bookingDetails.weight}` : ""
        }`,
        586,
        862,
        346,
        26,
        1
      );

      // 6. Footer Watermark
      ctx.fillStyle = "#64748b";
      ctx.font = "500 20px system-ui, -apple-system, sans-serif";
      ctx.fillText(
        `Updated: ${data.overallStatus.timestamp}   •   Generated by TrackFlow`,
        116,
        964
      );

      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `TrackFlow-${data.trackingNumber}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setIsGeneratingImg(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <div
        className="relative z-10 w-full max-w-lg max-h-[92vh] flex flex-col rounded-3xl border border-slate-200/90 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-4 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-xs">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                Share Shipment Status Card
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Send a verified boarding-pass style update or 1080×1080 PNG card
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 cursor-pointer shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {/* Attractive Live Preview Boarding-Pass Status Card */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white shadow-xl border border-indigo-500/30">
            {/* Ambient decorative glow */}
            <div className="pointer-events-none absolute -top-16 -left-16 h-44 w-44 rounded-full bg-indigo-500/25 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 -right-16 h-44 w-44 rounded-full bg-emerald-500/20 blur-3xl" />

            {/* Top Gradient Header Banner */}
            <div className="relative z-10 bg-gradient-to-r from-indigo-600/25 via-sky-500/10 to-emerald-500/20 border-b border-white/10 px-4 sm:px-5 py-3.5 flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-indigo-300">
                  <ShieldCheck className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                  <span className="truncate">TrackFlow Shipment Pass</span>
                </div>
                <div className="mt-0.5 text-sm sm:text-base font-bold text-white truncate">
                  {data.courier.name}
                </div>
              </div>

              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold shrink-0 border ${
                  isDelivered
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/40"
                    : isOutForDelivery
                    ? "bg-amber-500/20 text-amber-300 border-amber-400/40"
                    : isReturned
                    ? "bg-rose-500/20 text-rose-300 border-rose-400/40"
                    : "bg-sky-500/20 text-sky-300 border-sky-400/40"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isDelivered
                      ? "bg-emerald-400"
                      : isOutForDelivery
                      ? "bg-amber-400 animate-pulse"
                      : isReturned
                      ? "bg-rose-400"
                      : "bg-sky-400 animate-pulse"
                  }`}
                />
                <span>{data.overallStatus.label}</span>
              </span>
            </div>

            {/* Card Body */}
            <div className="relative z-10 p-4 sm:p-5 space-y-4">
              {/* Tracking Code Display Box */}
              <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                    Tracking Number
                  </div>
                  <div className="mt-0.5 font-mono text-base sm:text-xl font-bold tracking-wider text-white break-all leading-snug">
                    {data.trackingNumber}
                  </div>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300">
                  <Package className="h-5 w-5" />
                </div>
              </div>

              {/* Visual Route Timeline Bar */}
              <div className="rounded-2xl bg-white/5 border border-white/10 p-3.5 space-y-2.5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-slate-400">
                      <MapPin className="h-3 w-3 text-indigo-400 shrink-0" />
                      <span>Origin</span>
                    </div>
                    <div className="mt-0.5 text-xs font-semibold text-white truncate">
                      {originText}
                    </div>
                  </div>
                  <div className="min-w-0 text-right">
                    <div className="inline-flex items-center justify-end gap-1 text-[10px] font-medium uppercase tracking-wider text-slate-400">
                      <span>Destination</span>
                      <MapPin className="h-3 w-3 text-emerald-400 shrink-0" />
                    </div>
                    <div className="mt-0.5 text-xs font-semibold text-white truncate">
                      {destText}
                    </div>
                  </div>
                </div>

                {/* Route Progress Bar */}
                <div className="relative pt-1">
                  <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isDelivered
                          ? "bg-gradient-to-r from-indigo-500 to-emerald-400"
                          : isReturned
                          ? "bg-gradient-to-r from-indigo-500 to-rose-400"
                          : "bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400"
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Two-Column Checkpoint & Schedule Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="rounded-2xl bg-white/5 border border-white/10 p-3 min-w-0">
                  <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-slate-400">
                    <Truck className="h-3 w-3 text-sky-400 shrink-0" />
                    <span>Latest Scan</span>
                  </div>
                  <div className="mt-1 text-xs font-semibold text-white line-clamp-1">
                    {latestCheckpoint}
                  </div>
                  <div className="mt-0.5 text-[11px] text-indigo-300 truncate">
                    {latestFacility}
                  </div>
                </div>

                <div className="rounded-2xl bg-white/5 border border-white/10 p-3 min-w-0">
                  <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-slate-400">
                    <Clock className="h-3 w-3 text-emerald-400 shrink-0" />
                    <span>Delivery Status</span>
                  </div>
                  <div className="mt-1 text-xs font-semibold text-emerald-300 line-clamp-1">
                    {data.estimatedDelivery.date || data.overallStatus.phrase}
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-300 truncate">
                    {data.overallStatus.timestamp}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Hidden 1080x1080 Canvas for High-Resolution PNG Export */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-3 text-xs font-semibold text-white shadow-sm transition-all cursor-pointer"
            >
              <MessageCircle className="h-4 w-4 shrink-0" />
              <span>Share on WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadImageCard}
              disabled={isGeneratingImg}
              className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-3 text-xs font-semibold text-white shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              <Download className="h-4 w-4 shrink-0" />
              <span>
                {isGeneratingImg ? "Rendering PNG..." : "Download Status Card"}
              </span>
            </button>
          </div>

          {/* Copy Text Summary Button */}
          <button
            type="button"
            onClick={handleCopyText}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-700 transition-colors dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer"
          >
            {copiedSummary ? (
              <>
                <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className="text-emerald-600 dark:text-emerald-400">
                  Copied Formatted Text Summary!
                </span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 text-slate-400 shrink-0" />
                <span>Copy Text Summary</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
