"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ArrowLeft,
  Trash2,
  ShieldAlert,
  Volume2,
  VolumeX,
  ChevronUp,
  ChevronDown,
  ZoomIn,
  ZoomOut,
  ScanLine,
  AlertTriangle,
} from "lucide-react";
import {
  MultiFormatReader,
  BarcodeFormat,
  DecodeHintType,
  HTMLCanvasElementLuminanceSource,
  BinaryBitmap,
  HybridBinarizer,
} from "@zxing/library";
import jsQR from "jsqr";
import {
  COURIER_LIST,
  COURIER_MAP,
  identifyAndValidateConsignment,
} from "@/lib/couriers";
import type { BulkShipment } from "@/components/BulkDashboard";

const STAGED_STORAGE_KEY = "trackflow_staged_consignments";
const BULK_STORAGE_KEY = "trackflow_bulk_shipments";
const SCAN_CONTEXT_KEY = "trackflow_scan_context";
const SCAN_RETURN_KEY = "trackflow_scan_return";

type StatusOption = "booked" | "in_transit" | "out_for_delivery" | "delivered" | "returned";

const STATUS_OPTIONS: Array<{ value: StatusOption; label: string; dot: string }> = [
  { value: "booked", label: "Booked", dot: "bg-violet-400" },
  { value: "in_transit", label: "In Transit", dot: "bg-sky-400" },
  { value: "out_for_delivery", label: "Out for Delivery", dot: "bg-amber-400" },
  { value: "delivered", label: "Delivered", dot: "bg-emerald-400" },
  { value: "returned", label: "Returned", dot: "bg-rose-400" },
];

/**
 * Enhance the cropped guide region for barcode/QR edge contrast and sharpness,
 * applying contrast stretching + unsharp-mask sharpening for wrinkled or damaged labels
 * without auto-zooming the camera.
 */
function enhanceDamagedLabelROI(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number
): { hasLabelCandidate: boolean } {
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  const pixelCount = w * h;
  if (pixelCount === 0) return { hasLabelCandidate: false };

  const lum = new Uint8Array(pixelCount);
  let minLum = 255;
  let maxLum = 0;

  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const y = (data[i] * 77 + data[i + 1] * 150 + data[i + 2] * 29) >> 8;
    lum[p] = y;
    if (y < minLum) minLum = y;
    if (y > maxLum) maxLum = y;
  }

  const contrastSpan = maxLum - minLum;
  let edgeTransitions = 0;
  let sampleCount = 0;

  const startY = Math.floor(h * 0.2);
  const endY = Math.floor(h * 0.8);
  const startX = Math.floor(w * 0.15);
  const endX = Math.floor(w * 0.85);

  for (let y = startY; y < endY; y += 2) {
    const rowOffset = y * w;
    for (let x = startX; x < endX - 1; x += 2) {
      const idx = rowOffset + x;
      const diffX = Math.abs(lum[idx] - lum[idx + 1]);
      const diffY = y + 1 < h ? Math.abs(lum[idx] - lum[idx + w]) : 0;
      const grad = Math.max(diffX, diffY);
      sampleCount++;
      if (grad > 18) {
        edgeTransitions++;
      }
    }
  }

  const edgeDensity = sampleCount > 0 ? edgeTransitions / sampleCount : 0;
  const hasLabelCandidate = edgeDensity > 0.065 && contrastSpan > 28;

  const range = Math.max(1, maxLum - minLum);
  const stretched = new Uint8ClampedArray(pixelCount);
  for (let p = 0; p < pixelCount; p++) {
    stretched[p] = ((lum[p] - minLum) * 255) / range;
  }

  for (let y = 1; y < h - 1; y++) {
    const row = y * w;
    for (let x = 1; x < w - 1; x++) {
      const p = row + x;
      const center = stretched[p];
      const neighbors =
        (stretched[p - 1] + stretched[p + 1] + stretched[p - w] + stretched[p + w]) >> 2;
      const sharpened = Math.min(255, Math.max(0, center + (center - neighbors) * 2));
      const finalVal = sharpened < 120 ? Math.max(0, sharpened - 22) : Math.min(255, sharpened + 22);
      const idx = p * 4;
      data[idx] = finalVal;
      data[idx + 1] = finalVal;
      data[idx + 2] = finalVal;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return { hasLabelCandidate };
}

export function CameraScanClient() {
  const router = useRouter();

  // Camera & Decoder state
  const [cameraGuideMode, setCameraGuideMode] = useState<"barcode" | "qr" | "both">("both");
  const [isAutoNextEnabled, setIsAutoNextEnabled] = useState<boolean>(true);
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraScanSuccess, setCameraScanSuccess] = useState<{
    code: string;
    carrier: string;
    formatLabel: string;
    length: number;
    ts: number;
  } | null>(null);

  // Manual zoom control only (no auto-zoom)
  const [cameraZoomLevel, setCameraZoomLevel] = useState<number>(1.0);
  const [isHwZoomSupported, setIsHwZoomSupported] = useState<boolean>(false);
  const hwZoomSupportedRef = useRef<{ supported: boolean; min: number; max: number }>({
    supported: false,
    min: 1,
    max: 1,
  });

  // Consignment ID Format Error state
  const [formatError, setFormatError] = useState<{
    code: string;
    message: string;
    ts: number;
  } | null>(null);

  // Default Status: ALWAYS "booked" by default when adding new consignments
  const [defaultStatus, setDefaultStatus] = useState<StatusOption>(() => {
    if (typeof window !== "undefined") {
      try {
        const rawCtx = sessionStorage.getItem(SCAN_CONTEXT_KEY);
        if (rawCtx) {
          const parsed = JSON.parse(rawCtx);
          if (parsed.defaultStatus) return parsed.defaultStatus;
        }
      } catch {}
    }
    return "booked";
  });
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState<boolean>(false);

  // Staged Consignments scanned during session
  const [stagedItems, setStagedItems] = useState<BulkShipment[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const existingStaged = localStorage.getItem(STAGED_STORAGE_KEY);
        if (existingStaged) {
          const parsedStaged = JSON.parse(existingStaged);
          if (Array.isArray(parsedStaged)) return parsedStaged;
        }
      } catch {}
    }
    return [];
  });
  const stagedItemsRef = useRef<BulkShipment[]>(stagedItems);
  const [isQueueExpanded, setIsQueueExpanded] = useState<boolean>(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState<boolean>(false);
  const [duplicateAlert, setDuplicateAlert] = useState<{ text: string; ts: number } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const scanCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Refs synced with UI state so the camera loop never restarts when buttons are clicked
  const guideModeRef = useRef<"barcode" | "qr" | "both">(cameraGuideMode);
  const zoomLevelRef = useRef<number>(cameraZoomLevel);
  const defaultStatusRef = useRef<StatusOption>(defaultStatus);
  const isSoundEnabledRef = useRef<boolean>(isSoundEnabled);

  useEffect(() => {
    guideModeRef.current = cameraGuideMode;
  }, [cameraGuideMode]);

  useEffect(() => {
    zoomLevelRef.current = cameraZoomLevel;
  }, [cameraZoomLevel]);

  useEffect(() => {
    defaultStatusRef.current = defaultStatus;
  }, [defaultStatus]);

  useEffect(() => {
    isSoundEnabledRef.current = isSoundEnabled;
  }, [isSoundEnabled]);

  useEffect(() => {
    stagedItemsRef.current = stagedItems;
    try {
      localStorage.setItem(STAGED_STORAGE_KEY, JSON.stringify(stagedItems));
    } catch {
      // ignore
    }
  }, [stagedItems]);

  // Guaranteed auto-clear for scan success green overlay & border after 750ms
  const cameraScanSuccessTimestampRef = useRef<number>(0);
  useEffect(() => {
    if (!cameraScanSuccess) {
      cameraScanSuccessTimestampRef.current = 0;
      return;
    }
    cameraScanSuccessTimestampRef.current = cameraScanSuccess.ts || Date.now();
    const timer = setTimeout(() => {
      cameraScanSuccessTimestampRef.current = 0;
      setCameraScanSuccess(null);
    }, 750);
    return () => clearTimeout(timer);
  }, [cameraScanSuccess]);

  // Guaranteed auto-clear for format error alert after 2200ms
  useEffect(() => {
    if (!formatError) return;
    const timer = setTimeout(() => {
      setFormatError(null);
    }, 2200);
    return () => clearTimeout(timer);
  }, [formatError]);

  // Guaranteed auto-clear for duplicate alert after 1500ms
  useEffect(() => {
    if (!duplicateAlert) return;
    const timer = setTimeout(() => {
      setDuplicateAlert(null);
    }, 1500);
    return () => clearTimeout(timer);
  }, [duplicateAlert]);

  // Multi-frame barcode stability & cooldown refs to prevent partial misreads and multi-scans
  const scanCooldownUntilRef = useRef<number>(0);
  const lastScannedRef = useRef<{ code: string; timestamp: number }>({
    code: "",
    timestamp: 0,
  });
  const pendingCandidateRef = useRef<{
    code: string;
    count: number;
    firstSeen: number;
    lastSeen: number;
  }>({
    code: "",
    count: 0,
    firstSeen: 0,
    lastSeen: 0,
  });
  const invalidCandidateRef = useRef<{ code: string; count: number; lastSeen: number }>({
    code: "",
    count: 0,
    lastSeen: 0,
  });

  // Ensure no element has focus on mount so mobile keyboard never opens
  useEffect(() => {
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, []);

  // Apply manual camera zoom
  const applyCameraZoom = useCallback((nextZoom: number) => {
    const clamped = Number(Math.min(2.5, Math.max(1.0, nextZoom)).toFixed(2));
    setCameraZoomLevel(clamped);
    zoomLevelRef.current = clamped;

    const stream = cameraStreamRef.current;
    if (!stream) return;
    const [track] = stream.getVideoTracks();
    if (!track || typeof track.applyConstraints !== "function") return;

    try {
      if (hwZoomSupportedRef.current.supported) {
        const { min, max } = hwZoomSupportedRef.current;
        const hwZoom = Math.min(max, Math.max(min, clamped));
        track
          .applyConstraints({
            advanced: [{ zoom: hwZoom } as MediaTrackConstraintSet],
          })
          .catch(() => {});
      }
    } catch {
      // fallback to digital CSS scale
    }
  }, []);

  // Stop camera stream helper
  const stopCameraStream = useCallback(() => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  }, []);

  // Reusable AudioContext beep feedback on scan (never exhausts browser AudioContext limit)
  const playScanBeep = useCallback((isSuccess: boolean = true) => {
    if (!isSoundEnabledRef.current || typeof window === "undefined") return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (isSuccess) {
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.09);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.setValueAtTime(160, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.24);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch {
      // ignore audio errors
    }
  }, []);

  // Extract candidate code from barcode or QR payload
  const extractCandidateScannedCode = useCallback((rawValue: string): string => {
    const trimmed = rawValue.trim();
    if (!trimmed) return "";

    if (/^https?:\/\//i.test(trimmed)) {
      try {
        const url = new URL(trimmed);
        const paramKeys = ["awb", "track", "tracking", "id", "consignment", "number", "code", "q"];
        for (const key of paramKeys) {
          const val = url.searchParams.get(key) || url.searchParams.get(key.toUpperCase());
          if (val && val.trim().length >= 4) {
            return val.trim().toUpperCase();
          }
        }
        const segments = url.pathname.split("/").filter(Boolean);
        const lastSeg = segments[segments.length - 1];
        if (lastSeg && /^[A-Z0-9-]{8,24}$/i.test(lastSeg)) {
          return lastSeg.toUpperCase();
        }
        return trimmed;
      } catch {
        return trimmed;
      }
    }

    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed);
        const candidate =
          parsed.trackingNumber || parsed.awb || parsed.consignment || parsed.id || parsed.code;
        if (candidate && String(candidate).trim().length > 0) {
          return String(candidate).trim().toUpperCase();
        }
      } catch {
        return trimmed;
      }
    }

    return trimmed.toUpperCase();
  }, []);

  // Build logical status metadata
  const getLogicalStatusMeta = (status: StatusOption, dest: string) => {
    const map: Record<StatusOption, { statusText: string; lastLocation: string }> = {
      booked: {
        statusText: "Consignment Booked at Origin",
        lastLocation: "Origin Booking Office",
      },
      in_transit: {
        statusText: "Active In-Transit Scan",
        lastLocation: "Regional Sortation Hub",
      },
      out_for_delivery: {
        statusText: "Out for Delivery Today",
        lastLocation: `${dest} Delivery Hub`,
      },
      delivered: {
        statusText: "Delivered to Recipient",
        lastLocation: dest,
      },
      returned: {
        statusText: "Returned to Shipper (RTO)",
        lastLocation: "Return Processing Center",
      },
    };
    return map[status];
  };

  // Stage a confirmed scanned consignment with logical format, length & carrier auto-identification
  // (All side effects are executed outside setStagedItems so React never double-fires or traps cameraScanSuccess)
  const handleStageScannedCode = useCallback(
    (candidateCode: string) => {
      const rawTrimmed = candidateCode.trim();
      if (!rawTrimmed) return;

      const identification = identifyAndValidateConsignment(rawTrimmed);
      if (!identification.isValid) {
        playScanBeep(false);
        const previewCode =
          rawTrimmed.length > 26 ? `${rawTrimmed.slice(0, 24)}...` : rawTrimmed.toUpperCase();
        setFormatError({
          code: previewCode,
          message:
            identification.error ||
            "Invalid Consignment ID format. Expected 8–20 alphanumeric characters (e.g. EK123456789IN).",
          ts: Date.now(),
        });
        return;
      }

      const cleanNum = identification.normalized;
      setFormatError(null);

      // Logically auto-identify carrier from the Consignment ID format & length
      const chosenCourier = identification.courier || COURIER_MAP.speedpost;

      // Check duplicate synchronously against current stagedItemsRef
      if (stagedItemsRef.current.some((s) => s.trackingNumber === cleanNum)) {
        setDuplicateAlert({
          text: `Already scanned: ${cleanNum} (${chosenCourier.shortName})`,
          ts: Date.now(),
        });
        return;
      }

      const activeStatus = defaultStatusRef.current;
      const dest = "Destination Hub";
      const meta = getLogicalStatusMeta(activeStatus, dest);

      const newItem: BulkShipment = {
        id: `staged-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        trackingNumber: cleanNum,
        courierId: chosenCourier.id,
        courierName: chosenCourier.name,
        status: activeStatus,
        statusText: `${meta.statusText} • ${identification.formatLabel}`,
        origin: "Origin Booking Hub",
        destination: dest,
        articleType: activeStatus === "booked" ? "Booked Consignment" : "Registered Consignment",
        weight: "250 g",
        lastUpdated: "Scanned Just Now",
        lastLocation: meta.lastLocation,
      };

      const nextList = [newItem, ...stagedItemsRef.current];
      stagedItemsRef.current = nextList;
      setStagedItems(nextList);

      playScanBeep(true);
      setCameraScanSuccess({
        code: cleanNum,
        carrier: chosenCourier.name,
        formatLabel: identification.formatLabel,
        length: identification.length,
        ts: Date.now(),
      });
    },
    [playScanBeep]
  );

  // Single Persistent Camera Stream & Non-Overlapping Sequential Decoder Loop
  useEffect(() => {
    let isCancelled = false;
    let loopTimerId: NodeJS.Timeout | null = null;
    let isDecoding = false;

    // Initialize ZXing readers with strict logistics formats
    const zxingBarcodeReader = new MultiFormatReader();
    const barcodeHints = new Map();
    barcodeHints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.CODE_93,
      BarcodeFormat.EAN_13,
      BarcodeFormat.ITF,
    ]);
    barcodeHints.set(DecodeHintType.TRY_HARDER, true);
    zxingBarcodeReader.setHints(barcodeHints);

    const zxingQrReader = new MultiFormatReader();
    const qrHints = new Map();
    qrHints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.QR_CODE,
      BarcodeFormat.DATA_MATRIX,
      BarcodeFormat.PDF_417,
      BarcodeFormat.AZTEC,
    ]);
    qrHints.set(DecodeHintType.TRY_HARDER, true);
    zxingQrReader.setHints(qrHints);

    const zxingBothReader = new MultiFormatReader();
    const bothHints = new Map();
    bothHints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.QR_CODE,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.CODE_93,
      BarcodeFormat.EAN_13,
      BarcodeFormat.ITF,
      BarcodeFormat.DATA_MATRIX,
      BarcodeFormat.PDF_417,
      BarcodeFormat.AZTEC,
    ]);
    bothHints.set(DecodeHintType.TRY_HARDER, true);
    zxingBothReader.setHints(bothHints);

    let nativeDetector: {
      detect: (
        source: HTMLCanvasElement
      ) => Promise<Array<{ rawValue?: string; format?: string }>>;
    } | null = null;

    if (typeof window !== "undefined" && "BarcodeDetector" in window) {
      try {
        const NativeBarcodeDetector = (window as unknown as {
          BarcodeDetector: new (opts: { formats: string[] }) => {
            detect: (
              source: HTMLCanvasElement
            ) => Promise<Array<{ rawValue?: string; format?: string }>>;
          };
        }).BarcodeDetector;
        nativeDetector = new NativeBarcodeDetector({
          formats: [
            "qr_code",
            "code_128",
            "code_39",
            "code_93",
            "ean_13",
            "itf",
            "data_matrix",
            "pdf417",
            "aztec",
          ],
        });
      } catch {
        nativeDetector = null;
      }
    }

    /**
     * Process a decoded raw value with:
     * 1) Post-scan cooldown lock (prevents partial edge reads while moving camera away)
     * 2) 2-frame consensus for 1D barcodes (prevents motion-blur partial numbers from scanning multiple different things)
     * 3) Logical Consignment ID format, length & carrier identification
     */
    const processDecodedCandidate = (rawVal: string, is2DQr: boolean): boolean => {
      const now = Date.now();

      // 1. Respect post-scan cooldown window
      if (now < scanCooldownUntilRef.current) {
        return false;
      }

      const candidate = extractCandidateScannedCode(rawVal);
      if (!candidate) return false;

      // 2. Ignore same barcode within 2.8 seconds of last scan
      if (
        lastScannedRef.current.code === candidate &&
        now - lastScannedRef.current.timestamp < 2800
      ) {
        return true;
      }

      // 3. Check format & length validity
      const identification = identifyAndValidateConsignment(candidate);

      if (!identification.isValid) {
        const inv = invalidCandidateRef.current;
        if (inv.code === candidate && now - inv.lastSeen < 900) {
          inv.count += 1;
          inv.lastSeen = now;
        } else {
          invalidCandidateRef.current = { code: candidate, count: 1, lastSeen: now };
        }

        if (invalidCandidateRef.current.count >= 2) {
          invalidCandidateRef.current.count = 0;
          scanCooldownUntilRef.current = now + 950;
          handleStageScannedCode(candidate);
          return true;
        }
        return false;
      }

      const normalizedCode = identification.normalized;

      // 4. For 1D barcodes, require 2 consistent frame reads within 850ms to eliminate false partial reads
      if (!is2DQr) {
        const pending = pendingCandidateRef.current;
        if (pending.code === normalizedCode && now - pending.lastSeen < 850) {
          pending.count += 1;
          pending.lastSeen = now;
        } else {
          pendingCandidateRef.current = {
            code: normalizedCode,
            count: 1,
            firstSeen: now,
            lastSeen: now,
          };
          return false;
        }

        if (pendingCandidateRef.current.count < 2) {
          return false;
        }
      }

      // Confirmed valid scan! Lock scanner for 1.25s so moving away doesn't trigger false secondary scans
      pendingCandidateRef.current = { code: "", count: 0, firstSeen: 0, lastSeen: 0 };
      invalidCandidateRef.current = { code: "", count: 0, lastSeen: 0 };
      lastScannedRef.current = { code: normalizedCode, timestamp: now };
      scanCooldownUntilRef.current = now + 1250;

      handleStageScannedCode(normalizedCode);
      return true;
    };

    const tryDecodeCanvas = async (
      canvas: HTMLCanvasElement,
      ctx: CanvasRenderingContext2D,
      activeGuideMode: "barcode" | "qr" | "both"
    ): Promise<boolean> => {
      const w = canvas.width;
      const h = canvas.height;

      // 1. Native BarcodeDetector with 250ms timeout guard
      if (nativeDetector) {
        try {
          const detectPromise = nativeDetector.detect(canvas);
          const timeoutPromise = new Promise<null>((resolve) =>
            setTimeout(() => resolve(null), 250)
          );
          const detected = await Promise.race([detectPromise, timeoutPromise]);
          if (detected && detected.length > 0) {
            for (const item of detected) {
              if (!item.rawValue) continue;
              const fmt = (item.format || "").toLowerCase();
              const is2D =
                fmt === "qr_code" ||
                fmt === "data_matrix" ||
                fmt === "pdf417" ||
                fmt === "aztec";
              if (activeGuideMode === "barcode" && is2D) continue;
              if (activeGuideMode === "qr" && !is2D && fmt !== "") continue;

              if (processDecodedCandidate(item.rawValue, is2D)) {
                return true;
              }
            }
          }
        } catch {
          // continue to software decoders
        }
      }

      // 2. jsQR for 2D QR codes inside Guide ROI
      if (activeGuideMode !== "barcode") {
        try {
          const imageData = ctx.getImageData(0, 0, w, h);
          const qrResult = jsQR(imageData.data, w, h, {
            inversionAttempts: "attemptBoth",
          });
          if (qrResult && qrResult.data) {
            if (processDecodedCandidate(qrResult.data, true)) {
              return true;
            }
          }
        } catch {
          // continue
        }
      }

      // 3. ZXing MultiFormatReader inside Guide ROI (always reset in finally)
      const activeReader =
        activeGuideMode === "barcode"
          ? zxingBarcodeReader
          : activeGuideMode === "qr"
          ? zxingQrReader
          : zxingBothReader;

      try {
        const luminanceSource = new HTMLCanvasElementLuminanceSource(canvas);
        const binaryBitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource));
        const result = activeReader.decodeWithState(binaryBitmap);
        if (result && result.getText()) {
          const zFmt = result.getBarcodeFormat();
          const is2D =
            zFmt === BarcodeFormat.QR_CODE ||
            zFmt === BarcodeFormat.DATA_MATRIX ||
            zFmt === BarcodeFormat.PDF_417 ||
            zFmt === BarcodeFormat.AZTEC;
          if (processDecodedCandidate(result.getText(), is2D)) {
            return true;
          }
        }
      } catch {
        // normal when no barcode in frame
      } finally {
        try {
          activeReader.reset();
        } catch {}
      }

      return false;
    };

    const scheduleNextTick = (delayMs: number = 130) => {
      if (isCancelled) return;
      loopTimerId = setTimeout(runDecodeTick, delayMs);
    };

    const runDecodeTick = async () => {
      if (isCancelled) return;
      if (isDecoding) {
        scheduleNextTick(130);
        return;
      }

      isDecoding = true;
      try {
        if (
          cameraScanSuccessTimestampRef.current > 0 &&
          Date.now() - cameraScanSuccessTimestampRef.current > 750
        ) {
          cameraScanSuccessTimestampRef.current = 0;
          setCameraScanSuccess(null);
        }

        const video = videoRef.current;
        const canvas = scanCanvasRef.current;
        if (!video || !canvas) {
          scheduleNextTick(160);
          return;
        }

        // Auto-recover if mobile browser paused the video element
        if (video.paused && video.srcObject) {
          video.play().catch(() => {});
        }

        if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
          scheduleNextTick(160);
          return;
        }

        // Skip heavy pixel work during post-scan cooldown
        if (Date.now() < scanCooldownUntilRef.current) {
          scheduleNextTick(140);
          return;
        }

        const vw = video.videoWidth;
        const vh = video.videoHeight;
        const squareSide = Math.min(vw, vh);

        const activeGuideMode = guideModeRef.current;
        let roiWidthRatio = 0.82;
        let roiHeightRatio = 0.68;
        if (activeGuideMode === "barcode") {
          roiWidthRatio = 0.84;
          roiHeightRatio = 0.38;
        } else if (activeGuideMode === "qr") {
          roiWidthRatio = 0.68;
          roiHeightRatio = 0.68;
        }

        const effectiveDigitalZoom = hwZoomSupportedRef.current.supported
          ? 1.0
          : zoomLevelRef.current;

        const cropW = Math.max(
          64,
          Math.floor((squareSide * roiWidthRatio) / effectiveDigitalZoom)
        );
        const cropH = Math.max(
          64,
          Math.floor((squareSide * roiHeightRatio) / effectiveDigitalZoom)
        );
        const cropX = Math.max(0, Math.floor((vw - cropW) / 2));
        const cropY = Math.max(0, Math.floor((vh - cropH) / 2));

        const maxTargetDim = 680;
        const scale = Math.min(1.5, maxTargetDim / Math.max(cropW, cropH));
        const targetW = Math.max(64, Math.floor(cropW * scale));
        const targetH = Math.max(64, Math.floor(cropH * scale));

        if (canvas.width !== targetW) canvas.width = targetW;
        if (canvas.height !== targetH) canvas.height = targetH;

        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          scheduleNextTick(150);
          return;
        }

        // Draw ONLY the Guide Box ROI from the square camera space
        ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, targetW, targetH);

        // PASS 1: Standard decode on the Guide Box ROI
        const decodedPass1 = await tryDecodeCanvas(canvas, ctx, activeGuideMode);
        if (!decodedPass1) {
          // PASS 2: Enhance contrast & sharpness for wrinkled / damaged labels inside Guide Box
          const { hasLabelCandidate } = enhanceDamagedLabelROI(ctx, targetW, targetH);
          if (hasLabelCandidate) {
            await tryDecodeCanvas(canvas, ctx, activeGuideMode);
          }
        }
      } catch {
        // Ensure any unexpected frame error never stops future scans
      } finally {
        isDecoding = false;
        scheduleNextTick(120);
      }
    };

    const startCamera = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setCameraError("Camera access is not supported in this browser.");
          return;
        }

        let stream = cameraStreamRef.current;
        if (!stream || !stream.active) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: "environment" },
              width: { ideal: 1280 },
              height: { ideal: 1280 },
            },
            audio: false,
          });
        }

        if (isCancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        cameraStreamRef.current = stream;

        const [videoTrack] = stream.getVideoTracks();
        if (videoTrack && typeof videoTrack.getCapabilities === "function") {
          try {
            const caps = videoTrack.getCapabilities() as Record<string, unknown>;
            if (caps.zoom && typeof caps.zoom === "object") {
              const z = caps.zoom as { min?: number; max?: number };
              hwZoomSupportedRef.current = {
                supported: true,
                min: z.min ?? 1,
                max: Math.min(z.max ?? 3, 3),
              };
              setIsHwZoomSupported(true);
            }
          } catch {
            // ignore
          }
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }

        if (!scanCanvasRef.current) {
          scanCanvasRef.current = document.createElement("canvas");
        }

        scheduleNextTick(120);
      } catch {
        if (!isCancelled) {
          setCameraError("Camera permission not granted or camera unavailable on this device.");
        }
      }
    };

    startCamera();

    return () => {
      isCancelled = true;
      if (loopTimerId) clearTimeout(loopTimerId);
    };
  }, [extractCandidateScannedCode, handleStageScannedCode]);

  // Cleanup camera tracks on unmount
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, [stopCameraStream]);

  // Remove item from staged queue
  const handleRemoveItem = (id: string) => {
    setStagedItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Update item carrier
  const handleUpdateItemCarrier = (id: string, courierId: string) => {
    const c = COURIER_MAP[courierId];
    if (!c) return;
    setStagedItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, courierId: c.id, courierName: c.name } : item
      )
    );
  };

  // Update item status
  const handleUpdateItemStatus = (id: string, status: StatusOption) => {
    setStagedItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const meta = getLogicalStatusMeta(status, item.destination);
        return {
          ...item,
          status,
          statusText: meta.statusText,
          lastLocation: meta.lastLocation,
        };
      })
    );
  };

  // Return to Bulk Dashboard & open Review Modal
  const handleReturnToReview = () => {
    stopCameraStream();
    try {
      localStorage.setItem(STAGED_STORAGE_KEY, JSON.stringify(stagedItems));
      sessionStorage.setItem(
        SCAN_RETURN_KEY,
        JSON.stringify({
          target: "bulk_review",
        })
      );
    } catch {}
    router.push("/");
  };

  // Directly Confirm & Ingest all scanned consignments into Bulk Dashboard
  const handleDirectConfirmIngest = () => {
    if (stagedItems.length === 0) return;
    stopCameraStream();

    try {
      const rawExisting = localStorage.getItem(BULK_STORAGE_KEY);
      const existingList: BulkShipment[] = rawExisting ? JSON.parse(rawExisting) : [];
      const deduplicated = stagedItems.filter(
        (s) => !existingList.some((live) => live.trackingNumber === s.trackingNumber)
      );

      if (deduplicated.length > 0) {
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const newBatchId = `batch-cam-${Date.now()}`;
        const newBatchName = `Camera Scan Batch • ${timeStr}`;
        const importedAtStr = `Today, ${timeStr}`;

        const tagged: BulkShipment[] = deduplicated.map((item) => ({
          ...item,
          isImported: true,
          batchId: newBatchId,
          batchName: newBatchName,
          importedAt: importedAtStr,
        }));

        const updated = [...tagged, ...existingList];
        localStorage.setItem(BULK_STORAGE_KEY, JSON.stringify(updated));
      }

      localStorage.removeItem(STAGED_STORAGE_KEY);
      sessionStorage.setItem(
        SCAN_RETURN_KEY,
        JSON.stringify({
          target: "bulk_ingested",
          count: deduplicated.length,
        })
      );
    } catch {}

    router.push("/");
  };

  // Request Cancel / Back -> ALWAYS go back to Bulk Data Dashboard page
  const handleRequestCancel = () => {
    if (stagedItems.length > 0) {
      setIsCancelConfirmOpen(true);
      return;
    }
    stopCameraStream();
    try {
      sessionStorage.setItem(
        SCAN_RETURN_KEY,
        JSON.stringify({ target: "bulk_dashboard" })
      );
    } catch {}
    router.push("/");
  };

  const handleConfirmDiscardAndExit = () => {
    stopCameraStream();
    try {
      localStorage.removeItem(STAGED_STORAGE_KEY);
      sessionStorage.setItem(
        SCAN_RETURN_KEY,
        JSON.stringify({ target: "bulk_dashboard" })
      );
    } catch {}
    router.push("/");
  };

  const activeStatusObj =
    STATUS_OPTIONS.find((s) => s.value === defaultStatus) || STATUS_OPTIONS[0];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col overflow-hidden select-none">
      {/* ================================================================= */}
      {/* 1. UNCLUTTERED, MOBILE-RESPONSIVE CAMERA HEADER                   */}
      {/* ================================================================= */}
      <header className="border-b border-slate-800/90 bg-slate-900/95 px-3.5 sm:px-6 py-2.5 shrink-0">
        <div className="mx-auto max-w-2xl flex items-center justify-between gap-2">
          {/* Left: Back to Bulk Dashboard + Title */}
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={handleRequestCancel}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700/90 bg-slate-800/90 hover:bg-slate-700 px-2.5 py-1.5 text-xs font-bold text-slate-200 transition-colors cursor-pointer shrink-0"
              title="Back to Bulk Data Dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Dashboard</span>
            </button>

            <div className="flex items-center gap-2 min-w-0">
              <span className="hidden xs:flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shrink-0">
                <ScanLine className="h-3.5 w-3.5" />
              </span>
              <h1 className="text-xs sm:text-sm font-extrabold text-white tracking-tight truncate">
                Barcode &amp; QR Scanner
              </h1>
            </div>
          </div>

          {/* Right: Scanned Count Badge + Sound Toggle */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="rounded-full bg-indigo-500/15 border border-indigo-500/35 px-2.5 py-1 text-[11px] font-mono font-black text-indigo-300">
              {stagedItems.length} Scanned
            </span>

            <button
              type="button"
              onClick={() => setIsSoundEnabled((prev) => !prev)}
              className="rounded-xl border border-slate-800 bg-slate-950 p-1.5 text-slate-300 hover:text-white cursor-pointer"
              title={isSoundEnabled ? "Mute scan beep" : "Unmute scan beep"}
            >
              {isSoundEnabled ? (
                <Volume2 className="h-4 w-4 text-indigo-400" />
              ) : (
                <VolumeX className="h-4 w-4 text-slate-500" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ================================================================= */}
      {/* 2. CENTERED FIXED SQUARE CAMERA SPACE & COMPACT CONTROLS          */}
      {/* ================================================================= */}
      <div className="flex-1 flex flex-col items-center justify-between px-3.5 sm:px-6 py-3 overflow-y-auto gap-3">
        {/* Top Control Strip Above Square Camera: Guide Mode + Default Status (Booked) + Zoom */}
        <div className="w-full max-w-md flex flex-wrap items-center justify-between gap-2 shrink-0">
          {/* Guide Mode Selector */}
          <div className="inline-flex items-center gap-0.5 rounded-xl bg-slate-900 p-1 border border-slate-800">
            {(["barcode", "qr", "both"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setCameraGuideMode(m)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize transition-all cursor-pointer ${
                  cameraGuideMode === m
                    ? "bg-indigo-600 text-white shadow-2xs"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {m === "qr" ? "QR" : m}
              </button>
            ))}
          </div>

          {/* Default Status Dropdown (Defaults to Booked, never opens keyboard) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsStatusMenuOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 px-2.5 py-1.5 text-[11px] font-bold text-slate-200 cursor-pointer"
              title="Default status for scanned consignments"
            >
              <span className={`h-2 w-2 rounded-full ${activeStatusObj.dot}`} />
              <span>{activeStatusObj.label}</span>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </button>

            {isStatusMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsStatusMenuOpen(false)}
                />
                <div className="absolute right-0 mt-1.5 z-50 w-44 rounded-xl border border-slate-700 bg-slate-900 p-1 shadow-2xl space-y-0.5">
                  {STATUS_OPTIONS.map((st) => (
                    <button
                      key={st.value}
                      type="button"
                      onClick={() => {
                        setDefaultStatus(st.value);
                        setIsStatusMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                        defaultStatus === st.value
                          ? "bg-indigo-600 text-white"
                          : "text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${st.dot}`} />
                        <span>{st.label}</span>
                      </span>
                      {defaultStatus === st.value && <Check className="h-3.5 w-3.5" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Manual Zoom Controls */}
          <div className="inline-flex items-center gap-0.5 rounded-xl bg-slate-900 px-1.5 py-1 border border-slate-800 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => applyCameraZoom(cameraZoomLevel - 0.25)}
              disabled={cameraZoomLevel <= 1.0}
              className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="font-mono text-[11px] font-black text-indigo-300 tabular-nums px-1">
              {cameraZoomLevel.toFixed(1)}x
            </span>
            <button
              type="button"
              onClick={() => applyCameraZoom(cameraZoomLevel + 0.25)}
              disabled={cameraZoomLevel >= 2.5}
              className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Fixed Square Camera Space (No Focus Option) */}
        <div className="relative flex flex-col items-center justify-center w-full my-auto">
          {cameraError && (
            <div className="mb-2.5 w-full max-w-[340px] sm:max-w-[380px] rounded-xl border border-amber-700/80 bg-amber-950/90 px-3.5 py-2 text-xs font-semibold text-amber-200 text-center">
              {cameraError}
            </div>
          )}

          {/* Dedicated Fixed Square Camera Container */}
          <div
            className={`relative aspect-square w-[min(85vw,330px)] sm:w-[370px] rounded-3xl bg-black overflow-hidden flex items-center justify-center border-2 transition-all duration-150 shadow-2xl ${
              cameraScanSuccess
                ? "border-emerald-500 shadow-[0_0_28px_rgba(16,185,129,0.4)]"
                : formatError
                ? "border-rose-500 shadow-[0_0_28px_rgba(244,63,94,0.45)]"
                : "border-slate-800"
            }`}
          >
            <video
              ref={videoRef}
              style={{
                transform: isHwZoomSupported
                  ? undefined
                  : `scale(${cameraZoomLevel})`,
                transition: "transform 150ms ease-out",
              }}
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              playsInline
              muted
              autoPlay
            />

            {/* Guide Frame (Strictly scans inside this frame; no text note overlay) */}
            {cameraGuideMode === "barcode" && (
              <div
                className={`relative z-10 w-[84%] h-[38%] rounded-2xl border-2 pointer-events-none shadow-[0_0_0_9999px_rgba(2,6,23,0.58)] flex items-center justify-center transition-colors ${
                  cameraScanSuccess
                    ? "border-emerald-400"
                    : formatError
                    ? "border-rose-500 bg-rose-500/15"
                    : "border-white/85"
                }`}
              >
                {!cameraScanSuccess && !formatError && (
                  <div className="w-[92%] h-0.5 bg-red-500 shadow-[0_0_14px_#ef4444] animate-pulse" />
                )}
              </div>
            )}

            {cameraGuideMode === "qr" && (
              <div
                className={`relative z-10 w-[68%] h-[68%] rounded-2xl border-2 pointer-events-none shadow-[0_0_0_9999px_rgba(2,6,23,0.58)] flex items-center justify-center transition-colors ${
                  cameraScanSuccess
                    ? "border-emerald-400"
                    : formatError
                    ? "border-rose-500 bg-rose-500/15"
                    : "border-white/85"
                }`}
              >
                {!cameraScanSuccess && !formatError && (
                  <div className="w-[88%] h-0.5 bg-red-500 shadow-[0_0_14px_#ef4444] animate-pulse" />
                )}
              </div>
            )}

            {cameraGuideMode === "both" && (
              <div
                className={`relative z-10 w-[82%] h-[68%] rounded-2xl border-2 pointer-events-none shadow-[0_0_0_9999px_rgba(2,6,23,0.58)] flex items-center justify-center transition-colors ${
                  cameraScanSuccess
                    ? "border-emerald-400"
                    : formatError
                    ? "border-rose-500 bg-rose-500/15"
                    : "border-white/85"
                }`}
              >
                <div className="w-[62%] aspect-square rounded-xl border border-white/40" />
                {!cameraScanSuccess && !formatError && (
                  <div className="absolute left-3 right-3 h-0.5 bg-red-500 shadow-[0_0_14px_#ef4444] animate-pulse" />
                )}
              </div>
            )}

            {/* Brief Scan Confirmation Badge (Auto-hides after 850ms) */}
            {cameraScanSuccess && (
              <div
                key={cameraScanSuccess.ts}
                className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/70 backdrop-blur-[2px] pointer-events-none px-4 text-center"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg">
                  <Check className="h-7 w-7 stroke-[3.5]" />
                </div>
                <div className="mt-2 rounded-full bg-slate-900/95 border border-emerald-500/60 px-3.5 py-1 text-xs font-black tracking-wider text-emerald-300 font-mono shadow-lg">
                  ✓ {cameraScanSuccess.code}
                </div>
                <div className="mt-1 text-xs font-extrabold text-white">
                  {cameraScanSuccess.carrier}
                </div>
                <div className="mt-0.5 text-[10px] font-semibold text-slate-300">
                  {cameraScanSuccess.formatLabel} • {cameraScanSuccess.length} chars
                </div>
              </div>
            )}

            {/* Invalid Consignment ID Format Overlay inside Square Camera */}
            {formatError && (
              <div
                key={formatError.ts}
                className="absolute inset-x-3 bottom-3 z-30 rounded-2xl border border-rose-500/90 bg-rose-950/95 p-3 text-white shadow-2xl backdrop-blur-md"
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1 text-left">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] font-black uppercase tracking-wider text-rose-300">
                        Invalid Format Rejected
                      </span>
                      <span className="rounded bg-rose-900/80 px-1.5 py-0.5 font-mono text-[10px] font-bold text-rose-200 truncate max-w-[120px]">
                        {formatError.code}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-rose-200 leading-snug">
                      {formatError.message}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Duplicate Scan Alert Pill */}
            {duplicateAlert && !formatError && (
              <div
                key={duplicateAlert.ts}
                className="absolute bottom-3 inset-x-4 z-30 rounded-xl border border-amber-500/70 bg-amber-950/95 px-3 py-1.5 text-center text-xs font-bold text-amber-300 shadow-lg"
              >
                {duplicateAlert.text}
              </div>
            )}
          </div>
        </div>

        {/* Collapsible Scanned Queue Strip */}
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/95 overflow-hidden shrink-0">
          <div
            onClick={() => stagedItems.length > 0 && setIsQueueExpanded((prev) => !prev)}
            className={`px-3.5 py-2.5 flex items-center justify-between gap-2 ${
              stagedItems.length > 0 ? "cursor-pointer hover:bg-slate-800/60" : ""
            }`}
          >
            {stagedItems.length > 0 ? (
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400">
                  <Check className="h-3 w-3 stroke-[3]" />
                </span>
                <div className="truncate text-xs">
                  <span className="font-mono font-black text-white">
                    {stagedItems[0].trackingNumber}
                  </span>
                  <span className="text-indigo-400 font-bold ml-1.5">
                    • {stagedItems[0].courierName}
                  </span>
                  <span className="text-slate-400 text-[10px] font-mono ml-1.5">
                    ({stagedItems[0].trackingNumber.length} chars)
                  </span>
                </div>
              </div>
            ) : (
              <span className="text-[11px] text-slate-400 flex items-center gap-1.5 truncate">
                <ScanLine className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                <span>Auto-identifies carrier, format &amp; length on scan</span>
              </span>
            )}

            <div className="flex items-center gap-2 shrink-0">
              {stagedItems.length > 0 && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1 text-[11px] font-bold text-indigo-300 hover:bg-slate-700 cursor-pointer"
                >
                  <span>{isQueueExpanded ? "Hide" : `List (${stagedItems.length})`}</span>
                  {isQueueExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronUp className="h-3.5 w-3.5" />
                  )}
                </button>
              )}
            </div>
          </div>

          {isQueueExpanded && stagedItems.length > 0 && (
            <div className="border-t border-slate-800 max-h-36 overflow-y-auto divide-y divide-slate-800/70 px-3 py-1 bg-slate-950/80">
              {stagedItems.map((item) => (
                <div
                  key={item.id}
                  className="py-1.5 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0 truncate">
                    <span className="font-mono font-black text-indigo-400">
                      {item.trackingNumber}
                    </span>
                    <span className="ml-1.5 text-[10px] font-mono text-slate-500">
                      ({item.trackingNumber.length}c)
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <select
                      value={item.courierId}
                      onChange={(e) => handleUpdateItemCarrier(item.id, e.target.value)}
                      className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] font-semibold text-slate-200 cursor-pointer"
                    >
                      {COURIER_LIST.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.shortName}
                        </option>
                      ))}
                    </select>

                    <select
                      value={item.status}
                      onChange={(e) =>
                        handleUpdateItemStatus(item.id, e.target.value as StatusOption)
                      }
                      className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] font-bold text-slate-200 cursor-pointer"
                    >
                      <option value="booked">Booked</option>
                      <option value="in_transit">In Transit</option>
                      <option value="out_for_delivery">Out for Del</option>
                      <option value="delivered">Delivered</option>
                      <option value="returned">Returned</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/50 cursor-pointer"
                      title="Remove item"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ================================================================= */}
      {/* 3. MOBILE-RESPONSIVE BOTTOM ACTION FOOTER                          */}
      {/* ================================================================= */}
      <footer className="border-t border-slate-800/90 px-3.5 sm:px-6 py-3 bg-slate-900/95 shrink-0">
        <div className="mx-auto max-w-2xl">
          {stagedItems.length > 0 ? (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="grid grid-cols-2 sm:flex items-center gap-2 order-2 sm:order-1">
                <button
                  type="button"
                  onClick={handleRequestCancel}
                  className="rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-4 py-2.5 text-xs font-bold text-slate-200 transition-colors cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReturnToReview}
                  className="rounded-xl border border-indigo-500/40 bg-indigo-950/60 hover:bg-indigo-900/70 px-4 py-2.5 text-xs font-bold text-indigo-200 transition-colors cursor-pointer text-center"
                >
                  Review ({stagedItems.length})
                </button>
              </div>

              <button
                type="button"
                onClick={handleDirectConfirmIngest}
                className="order-1 sm:order-2 w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-indigo-950/50 transition-all cursor-pointer"
              >
                <Check className="h-4 w-4 stroke-[3]" />
                <span>Confirm &amp; Add ({stagedItems.length})</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleRequestCancel}
                className="flex-1 sm:flex-none rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-5 py-2.5 text-xs font-bold text-slate-200 transition-colors cursor-pointer text-center"
              >
                Cancel &amp; Back to Dashboard
              </button>

              <button
                type="button"
                onClick={() => setIsAutoNextEnabled((prev) => !prev)}
                className={`rounded-xl px-3.5 py-2.5 text-xs font-bold border transition-colors cursor-pointer shrink-0 ${
                  isAutoNextEnabled
                    ? "border-indigo-500/40 bg-indigo-500/15 text-indigo-300"
                    : "border-slate-800 bg-slate-950 text-slate-400"
                }`}
              >
                Auto-Next: {isAutoNextEnabled ? "ON" : "OFF"}
              </button>
            </div>
          )}
        </div>
      </footer>

      {/* Safe Discard Confirmation Modal */}
      {isCancelConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-950/80 text-rose-400 border border-rose-800/60">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">
                  Discard {stagedItems.length} Scanned Consignment{stagedItems.length === 1 ? "" : "s"}?
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  You have {stagedItems.length} scanned consignment{stagedItems.length === 1 ? "" : "s"} waiting to be added. Do you want to keep scanning, review them, or discard them?
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsCancelConfirmOpen(false)}
                className="rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3.5 py-2.5 text-xs font-bold text-slate-200 cursor-pointer"
              >
                Keep Scanning
              </button>
              <button
                type="button"
                onClick={handleReturnToReview}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-3.5 py-2.5 text-xs font-bold text-white cursor-pointer"
              >
                Review ({stagedItems.length})
              </button>
              <button
                type="button"
                onClick={handleConfirmDiscardAndExit}
                className="rounded-xl bg-rose-600 hover:bg-rose-500 px-3.5 py-2.5 text-xs font-extrabold text-white cursor-pointer"
              >
                Discard &amp; Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
