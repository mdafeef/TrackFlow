"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Trash2,
  ShieldAlert,
  Volume2,
  VolumeX,
  ChevronUp,
  ChevronDown,
  ScanLine,
  AlertTriangle,
  QrCode,
  X,
} from "lucide-react";
import {
  MultiFormatReader,
  BarcodeFormat,
  DecodeHintType,
  HTMLCanvasElementLuminanceSource,
  BinaryBitmap,
  HybridBinarizer,
  GlobalHistogramBinarizer,
} from "@zxing/library";
import jsQR from "jsqr";
import {
  COURIER_MAP,
  hasSpecialOrInvalidTrackingChars,
  identifyAndValidateConsignment,
  isCandidateMatchingCustomOrStandardStructure,
  syncCustomCouriersFromStorage,
} from "@/lib/couriers";
import { decryptCustomerMiniQR } from "@/lib/customerQrCrypto";
import {
  openNormalPhotoCameraStream,
  applyContinuousFocusToTrack,
  triggerTapToFocusOnTrack,
  triggerScanHapticFeedback,
} from "@/lib/cameraDeviceSelector";
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
 * Lightweight 1-pass contrast stretch for low-contrast or wrinkled labels.
 * Avoids heavy multi-pass 2D convolutions so the main UI thread never hangs on mobile devices.
 */
function fastContrastStretchROI(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number
): boolean {
  const pixelCount = w * h;
  if (pixelCount === 0) return false;
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  let minLum = 255;
  let maxLum = 0;

  // Sample every 4th pixel first to check contrast span quickly
  for (let i = 0; i < data.length; i += 16) {
    const y = (data[i] * 77 + data[i + 1] * 150 + data[i + 2] * 29) >> 8;
    if (y < minLum) minLum = y;
    if (y > maxLum) maxLum = y;
  }

  const range = maxLum - minLum;
  if (range < 24) return false;

  const scale = 255 / Math.max(1, range);
  for (let i = 0; i < data.length; i += 4) {
    const y = (data[i] * 77 + data[i + 1] * 150 + data[i + 2] * 29) >> 8;
    let stretched = ((y - minLum) * scale) | 0;
    if (stretched < 110) {
      stretched = Math.max(0, stretched - 18);
    } else if (stretched > 145) {
      stretched = Math.min(255, stretched + 18);
    }
    data[i] = stretched;
    data[i + 1] = stretched;
    data[i + 2] = stretched;
  }

  ctx.putImageData(imgData, 0, 0);
  return true;
}

const emptyScanSubscribe = () => () => {};

function CameraScanInner() {
  const router = useRouter();

  // Camera & Decoder state
  const [cameraGuideMode, setCameraGuideMode] = useState<"barcode" | "qr" | "both">("both");
  const [isAutoNextEnabled, setIsAutoNextEnabled] = useState<boolean>(true);
  const [isPasteAnywayEnabled, setIsPasteAnywayEnabled] = useState<boolean>(false);
  const [isScanCustomerQrEnabled, setIsScanCustomerQrEnabled] = useState<boolean>(true);
  const [customerQrScanStep, setCustomerQrScanStep] = useState<{
    step: "awaiting_awb" | "awaiting_customer_qr";
    pendingAwb: string;
    pendingCourierId: string;
    pendingCourierName: string;
    pendingFormatLabel: string;
  }>({
    step: "awaiting_awb",
    pendingAwb: "",
    pendingCourierId: "",
    pendingCourierName: "",
    pendingFormatLabel: "",
  });
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraScanSuccess, setCameraScanSuccess] = useState<{
    code: string;
    carrier: string;
    formatLabel: string;
    length: number;
    pastedAnyway?: boolean;
    ts: number;
  } | null>(null);

  const [focusTapPoint, setFocusTapPoint] = useState<{ x: number; y: number } | null>(
    null
  );

  // Custom dropdown state for scanned queue strip
  const [queueOpenDropdown, setQueueOpenDropdown] = useState<{
    id: string;
    field: "status";
  } | null>(null);

  // Consignment ID Regex / Length Format Error state
  const [formatError, setFormatError] = useState<{
    code: string;
    rawCode: string;
    length: number;
    formatLabel: string;
    message: string;
    ts: number;
  } | null>(null);

  // Default Status: ALWAYS "booked" by default when adding new consignments
  const [defaultStatus, setDefaultStatus] = useState<StatusOption>("booked");
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState<boolean>(false);

  // Staged Consignments scanned during session
  const [stagedItems, setStagedItems] = useState<BulkShipment[]>([]);
  const stagedItemsRef = useRef<BulkShipment[]>(stagedItems);
  const hasHydratedStorageRef = useRef<boolean>(false);
  const [isQueueExpanded, setIsQueueExpanded] = useState<boolean>(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState<boolean>(false);
  const [duplicateAlert, setDuplicateAlert] = useState<{ text: string; ts: number } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const scanCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const macroCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Refs synced with UI state so the camera loop never restarts when buttons are clicked
  const guideModeRef = useRef<"barcode" | "qr" | "both">(cameraGuideMode);
  const defaultStatusRef = useRef<StatusOption>(defaultStatus);
  const isSoundEnabledRef = useRef<boolean>(isSoundEnabled);
  const isPasteAnywayEnabledRef = useRef<boolean>(isPasteAnywayEnabled);
  const isScanCustomerQrEnabledRef = useRef<boolean>(isScanCustomerQrEnabled);
  const customerQrScanStepRef = useRef(customerQrScanStep);

  // Hydrate client storage after mount to prevent SSR/Client hydration mismatch
  useEffect(() => {
    queueMicrotask(() => {
      try {
        syncCustomCouriersFromStorage();
        const rawCtx = sessionStorage.getItem(SCAN_CONTEXT_KEY);
        if (rawCtx) {
          const parsed = JSON.parse(rawCtx);
          if (typeof parsed.scanCustomerQr === "boolean") {
            setIsScanCustomerQrEnabled(parsed.scanCustomerQr);
            isScanCustomerQrEnabledRef.current = parsed.scanCustomerQr;
          }
          if (parsed.defaultStatus) {
            setDefaultStatus(parsed.defaultStatus);
            defaultStatusRef.current = parsed.defaultStatus;
          }
        } else {
          const savedQr = localStorage.getItem("trackflow_scan_customer_qr");
          if (savedQr === "false") {
            setIsScanCustomerQrEnabled(false);
            isScanCustomerQrEnabledRef.current = false;
          }
        }

        const existingStaged = localStorage.getItem(STAGED_STORAGE_KEY);
        if (existingStaged) {
          const parsedStaged = JSON.parse(existingStaged);
          if (Array.isArray(parsedStaged)) {
            setStagedItems(parsedStaged);
            stagedItemsRef.current = parsedStaged;
          }
        }
      } catch {}
      hasHydratedStorageRef.current = true;
    });
  }, []);

  const [cameraRetryTick, setCameraRetryTick] = useState(0);

  useEffect(() => {
    guideModeRef.current = cameraGuideMode;
  }, [cameraGuideMode]);

  useEffect(() => {
    defaultStatusRef.current = defaultStatus;
  }, [defaultStatus]);

  useEffect(() => {
    isSoundEnabledRef.current = isSoundEnabled;
  }, [isSoundEnabled]);

  const isAutoNextEnabledRef = useRef<boolean>(isAutoNextEnabled);

  useEffect(() => {
    isAutoNextEnabledRef.current = isAutoNextEnabled;
  }, [isAutoNextEnabled]);

  useEffect(() => {
    isPasteAnywayEnabledRef.current = isPasteAnywayEnabled;
  }, [isPasteAnywayEnabled]);

  const toggleScanCustomerQr = useCallback(() => {
    setIsScanCustomerQrEnabled((prev) => {
      const next = !prev;
      const resetState = {
        step: "awaiting_awb" as const,
        pendingAwb: "",
        pendingCourierId: "",
        pendingCourierName: "",
        pendingFormatLabel: "",
      };
      customerQrScanStepRef.current = resetState;
      setCustomerQrScanStep(resetState);
      return next;
    });
  }, []);

  useEffect(() => {
    isScanCustomerQrEnabledRef.current = isScanCustomerQrEnabled;
    if (!hasHydratedStorageRef.current) return;
    try {
      localStorage.setItem("trackflow_scan_customer_qr", String(isScanCustomerQrEnabled));
    } catch {}
  }, [isScanCustomerQrEnabled]);

  useEffect(() => {
    customerQrScanStepRef.current = customerQrScanStep;
  }, [customerQrScanStep]);

  useEffect(() => {
    stagedItemsRef.current = stagedItems;
    if (!hasHydratedStorageRef.current) return;
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

  // Guaranteed auto-clear for format error alert after 4500ms (gives time to tap Paste Anyway)
  useEffect(() => {
    if (!formatError) return;
    const timer = setTimeout(() => {
      setFormatError(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [formatError]);

  // Guaranteed auto-clear for duplicate alert after 1300ms (via both effect and direct ref timer)
  const duplicateAlertTimestampRef = useRef<number>(0);
  const duplicateAlertTimerRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!duplicateAlert) {
      duplicateAlertTimestampRef.current = 0;
      return;
    }
    duplicateAlertTimestampRef.current = duplicateAlert.ts || Date.now();
    const timer = setTimeout(() => {
      duplicateAlertTimestampRef.current = 0;
      setDuplicateAlert(null);
    }, 1300);
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

  // Tap-to-Focus on video viewfinder
  const handleViewfinderTapToFocus = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = Math.round(e.clientX - rect.left);
      const y = Math.round(e.clientY - rect.top);
      setFocusTapPoint({ x, y });
      setTimeout(() => setFocusTapPoint(null), 650);

      const stream = cameraStreamRef.current;
      if (!stream) return;
      const [videoTrack] = stream.getVideoTracks();
      triggerTapToFocusOnTrack(videoTrack);
    },
    []
  );

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

  // Extract candidate code from barcode or QR payload — strictly rejects special characters
  const extractCandidateScannedCode = useCallback((rawValue: string): string => {
    const trimmed = rawValue.trim();
    if (!trimmed) return "";

    if (/^https?:\/\//i.test(trimmed)) {
      try {
        const url = new URL(trimmed);
        const paramKeys = ["awb", "track", "tracking", "id", "consignment", "number", "code", "q"];
        for (const key of paramKeys) {
          const val = (url.searchParams.get(key) || url.searchParams.get(key.toUpperCase()) || "").trim().toUpperCase();
          if (val && /^[A-Z0-9]{8,19}$/.test(val)) {
            return val;
          }
        }
        const segments = url.pathname.split("/").filter(Boolean);
        const lastSeg = (segments[segments.length - 1] || "").trim().toUpperCase();
        if (lastSeg && /^[A-Z0-9]{8,19}$/.test(lastSeg)) {
          return lastSeg;
        }
        return "";
      } catch {
        return "";
      }
    }

    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed);
        const rawCandidate =
          parsed.trackingNumber || parsed.awb || parsed.consignment || parsed.id || parsed.code;
        if (rawCandidate) {
          const candidate = String(rawCandidate).trim().toUpperCase();
          if (/^[A-Z0-9]{8,19}$/.test(candidate)) {
            return candidate;
          }
        }
        return "";
      } catch {
        return "";
      }
    }

    const upper = trimmed.toUpperCase();
    // Reject any scan containing special characters, punctuation, spaces, or symbols
    if (hasSpecialOrInvalidTrackingChars(upper)) {
      return "";
    }
    return upper;
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

  // Stage a scanned consignment using regex-based length & pattern identification against known couriers
  const handleStageScannedCode = useCallback(
    (
      candidateCode: string,
      forcePasteAnyway: boolean = false,
      customerDataOverride?: {
        customerName: string;
        customerPhone: string;
        formattedPhone91: string;
        pincode: string;
        itemCode: string;
      },
      skipCustomerStep: boolean = false
    ) => {
      const rawTrimmed = candidateCode.trim();
      if (!rawTrimmed) return;

      const identification = identifyAndValidateConsignment(rawTrimmed);
      const allowUnrecognized =
        (forcePasteAnyway || isPasteAnywayEnabledRef.current) &&
        identification.canPasteAnyway !== false;

      if (!identification.isValid && !allowUnrecognized) {
        playScanBeep(false);
        const normalizedPreview = identification.normalized || rawTrimmed.toUpperCase();
        const previewCode =
          normalizedPreview.length > 24
            ? `${normalizedPreview.slice(0, 22)}...`
            : normalizedPreview;
        setFormatError({
          code: previewCode,
          rawCode: normalizedPreview,
          length: identification.length,
          formatLabel: identification.formatLabel,
          message:
            identification.error ||
            "Invalid Consignment ID format. Does not match India Post (13 chars), DTDC (8–14 chars), or known courier regex patterns.",
          ts: Date.now(),
        });
        return;
      }

      const cleanNum =
        identification.normalized || rawTrimmed.toUpperCase().replace(/\s+/g, "");
      if (!cleanNum) return;

      setFormatError(null);

      const isPastedAnywayFallback = !identification.isValid && allowUnrecognized;
      const chosenCourier =
        identification.courier || COURIER_MAP.dtdc || COURIER_MAP.speedpost;

      // Check duplicate synchronously against current stagedItemsRef
      if (stagedItemsRef.current.some((s) => s.trackingNumber === cleanNum)) {
        playScanBeep(false);
        const nowTs = Date.now();
        lastScannedRef.current = { code: cleanNum, timestamp: nowTs };
        scanCooldownUntilRef.current = nowTs + 1300;
        duplicateAlertTimestampRef.current = nowTs;
        setDuplicateAlert({
          text: `Already scanned: ${cleanNum} (${chosenCourier.shortName})`,
          ts: nowTs,
        });
        if (duplicateAlertTimerRef.current) {
          clearTimeout(duplicateAlertTimerRef.current);
        }
        duplicateAlertTimerRef.current = setTimeout(() => {
          duplicateAlertTimestampRef.current = 0;
          setDuplicateAlert(null);
        }, 1300);
        return;
      }

      const resolvedFormatLabel = isPastedAnywayFallback
        ? `Pasted Anyway (${cleanNum.length} chars)`
        : identification.formatLabel;

      const effectiveCustomerData = customerDataOverride || undefined;

      // If 2-Step "Scan Customer Data QR" is ON and we are in Step 1 (awaiting_awb):
      if (
        isScanCustomerQrEnabledRef.current &&
        !effectiveCustomerData &&
        !skipCustomerStep
      ) {
        const nextStepState = {
          step: "awaiting_customer_qr" as const,
          pendingAwb: cleanNum,
          pendingCourierId: chosenCourier.id,
          pendingCourierName: chosenCourier.name,
          pendingFormatLabel: resolvedFormatLabel,
        };
        customerQrScanStepRef.current = nextStepState;
        setCustomerQrScanStep(nextStepState);
        // Short 320ms cooldown after Step 1 so the user can immediately scan the Customer Mini QR right next to the barcode
        scanCooldownUntilRef.current = Date.now() + 320;
        triggerScanHapticFeedback(35);
        playScanBeep(true);
        setCameraScanSuccess({
          code: `Step 1 OK: ${cleanNum}`,
          carrier: `${chosenCourier.name} • Now Scan Customer Mini QR`,
          formatLabel: resolvedFormatLabel,
          length: cleanNum.length,
          pastedAnyway: isPastedAnywayFallback,
          ts: Date.now(),
        });
        return;
      }

      const activeStatus = defaultStatusRef.current;
      const dest = effectiveCustomerData?.pincode
        ? `Pin ${effectiveCustomerData.pincode}`
        : "Destination Hub";
      const meta = getLogicalStatusMeta(activeStatus, dest);

      const newItem: BulkShipment = {
        id: `staged-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        trackingNumber: cleanNum,
        courierId: chosenCourier.id,
        courierName: chosenCourier.name,
        status: activeStatus,
        statusText: `${meta.statusText} • ${resolvedFormatLabel}`,
        origin: "Origin Booking Hub",
        destination: dest,
        pincode: effectiveCustomerData?.pincode || undefined,
        itemCode: effectiveCustomerData?.itemCode || undefined,
        recipientName: effectiveCustomerData?.customerName || undefined,
        customerPhone: effectiveCustomerData?.customerPhone || undefined,
        articleType: isPastedAnywayFallback
          ? "Unrecognized Format (Pasted Anyway)"
          : activeStatus === "booked"
          ? "Booked Consignment"
          : "Registered Consignment",
        weight: "250 g",
        lastUpdated: "Scanned Just Now",
        lastLocation: meta.lastLocation,
      };

      const nextList = [newItem, ...stagedItemsRef.current];
      stagedItemsRef.current = nextList;
      setStagedItems(nextList);

      // Synchronously reset 2-step state back to Step 1 (awaiting_awb) so Auto-Next is ready for the next parcel
      const resetStepState = {
        step: "awaiting_awb" as const,
        pendingAwb: "",
        pendingCourierId: "",
        pendingCourierName: "",
        pendingFormatLabel: "",
      };
      customerQrScanStepRef.current = resetStepState;
      setCustomerQrScanStep(resetStepState);
      lastScannedRef.current = { code: cleanNum, timestamp: Date.now() };
      scanCooldownUntilRef.current = Date.now() + (isAutoNextEnabledRef.current ? 750 : 1400);

      triggerScanHapticFeedback(effectiveCustomerData ? [30, 45, 40] : 35);
      playScanBeep(true);
      setCameraScanSuccess({
        code: effectiveCustomerData
          ? `${cleanNum} • ${effectiveCustomerData.customerName}`
          : cleanNum,
        carrier: effectiveCustomerData
          ? `PIN ${effectiveCustomerData.pincode} • ${effectiveCustomerData.itemCode} • Next Ready`
          : isPastedAnywayFallback
          ? `${chosenCourier.shortName} • Pasted Anyway`
          : chosenCourier.name,
        formatLabel: resolvedFormatLabel,
        length: cleanNum.length,
        pastedAnyway: isPastedAnywayFallback,
        ts: Date.now(),
      });
    },
    [playScanBeep]
  );

  // Single Persistent Camera Stream & Non-Blocking Step-Specific Decoder Loop
  useEffect(() => {
    let isCancelled = false;
    let loopTimerId: NodeJS.Timeout | null = null;
    let isDecoding = false;
    let tickCounter = 0;

    // Initialize ZXing readers with strict logistics formats (Code 93 excluded to prevent special-char edge noise)
    const zxingBarcodeReader = new MultiFormatReader();
    const barcodeHints = new Map();
    barcodeHints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
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

    let nativeDetector: {
      detect: (
        source: HTMLCanvasElement
      ) => Promise<Array<{ rawValue?: string; format?: string }>>;
    } | null = null;
    let nativeTimeoutStreak = 0;

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
     * Strictly step-isolated candidate processor:
     * - When expecting Tracking Code (Step 1 of 2-step mode, or 1-step mode):
     *   ONLY scans Tracking Codes. Completely ignores Customer Mini QR codes ("TFQR1:...").
     * - When expecting Customer QR Code (Step 2 of 2-step mode):
     *   ONLY scans Customer Mini QR codes ("TFQR1:..."). Completely ignores Tracking Codes.
     */
    const processDecodedCandidate = (rawVal: string, is2DQr: boolean): boolean => {
      const now = Date.now();
      if (now < scanCooldownUntilRef.current) {
        return false;
      }

      const trimmedRaw = (rawVal || "").trim();
      if (!trimmedRaw) return false;

      const isTwoStepOn = isScanCustomerQrEnabledRef.current;
      const pendingStep = customerQrScanStepRef.current;
      const isAwaitingCustomerQr =
        isTwoStepOn && pendingStep.step === "awaiting_customer_qr";

      // Check if scanned payload is an Encrypted Office Customer Mini QR ("TFQR1:...")
      const customerQr = decryptCustomerMiniQR(trimmedRaw);

      if (customerQr.isCustomerQR) {
        // STRICT STEP ISOLATION: If we are NOT in Step 2 (awaiting_customer_qr), ignore Customer QR codes completely!
        if (!isAwaitingCustomerQr) {
          return false;
        }

        if (
          lastScannedRef.current.code === trimmedRaw &&
          now - lastScannedRef.current.timestamp < 1500
        ) {
          return true;
        }
        lastScannedRef.current = { code: trimmedRaw, timestamp: now };
        scanCooldownUntilRef.current = now + 750;
        setFormatError(null);

        if (!customerQr.isValid || !customerQr.data) {
          playScanBeep(false);
          setFormatError({
            code: "MINI-QR",
            rawCode: trimmedRaw,
            length: trimmedRaw.length,
            formatLabel: "Encrypted Office Mini QR",
            message: customerQr.error || "Invalid Customer Mini QR data.",
            ts: now,
          });
          return true;
        }

        if (pendingStep.pendingAwb) {
          handleStageScannedCode(
            pendingStep.pendingAwb,
            true,
            customerQr.data,
            true
          );
          return true;
        }
        return false;
      }

      // STRICT STEP ISOLATION:
      // - Step 2 (awaiting_customer_qr): Customer Data QR Code scan ONLY (ignore all 1D barcodes & non-customer codes)
      if (isAwaitingCustomerQr) {
        return false;
      }

      // - Step 1 of 2-Step Scan: Barcode scanner ONLY! Never accept 2D QR codes as tracking numbers when 2-Step Scan is ON.
      if (isTwoStepOn && is2DQr) {
        return false;
      }

      const candidate = extractCandidateScannedCode(rawVal);
      if (!candidate) return false;

      // Also ignore any raw payload that looks like multi-field customer details rather than a tracking number
      if (/^TFQR/i.test(candidate) || /\b(pincode|mobile|customer|phone)\s*:/i.test(trimmedRaw)) {
        return false;
      }

      // Strictly reject ANY special character or structurally impossible noise (both 1D and 2D)
      if (
        hasSpecialOrInvalidTrackingChars(candidate) ||
        !isCandidateMatchingCustomOrStandardStructure(candidate)
      ) {
        return false;
      }

      // Ignore same barcode within 2.5 seconds of last scan
      if (
        lastScannedRef.current.code === candidate &&
        now - lastScannedRef.current.timestamp < 2500
      ) {
        return true;
      }

      // Regex-based evaluation of string length & pattern against known courier formats (India Post, DTDC, etc.)
      const identification = identifyAndValidateConsignment(candidate);

      if (!identification.isValid) {
        // Require 3 consistent frame reads for unrecognized 1D codes before flagging or pasting so single blurry partial frames are ignored
        if (!is2DQr) {
          const pending = pendingCandidateRef.current;
          if (pending.code === candidate && now - pending.lastSeen < 1000) {
            pending.count += 1;
            pending.lastSeen = now;
          } else {
            pendingCandidateRef.current = {
              code: candidate,
              count: 1,
              firstSeen: now,
              lastSeen: now,
            };
            return false;
          }
          if (pendingCandidateRef.current.count < 3) {
            return false;
          }
        }

        if (!isPasteAnywayEnabledRef.current) {
          if (
            invalidCandidateRef.current.code === candidate &&
            now - invalidCandidateRef.current.lastSeen < 2200
          ) {
            return true;
          }
          pendingCandidateRef.current = { code: "", count: 0, firstSeen: 0, lastSeen: 0 };
          invalidCandidateRef.current = { code: candidate, count: 1, lastSeen: now };
          scanCooldownUntilRef.current = now + 900;
          handleStageScannedCode(candidate, false);
          return true;
        }

        const fallbackCode = identification.normalized || candidate;
        pendingCandidateRef.current = { code: "", count: 0, firstSeen: 0, lastSeen: 0 };
        invalidCandidateRef.current = { code: "", count: 0, lastSeen: 0 };
        lastScannedRef.current = { code: fallbackCode, timestamp: now };
        scanCooldownUntilRef.current = now + 1000;
        handleStageScannedCode(fallbackCode, true);
        return true;
      }

      const normalizedCode = identification.normalized;

      pendingCandidateRef.current = { code: "", count: 0, firstSeen: 0, lastSeen: 0 };
      invalidCandidateRef.current = { code: "", count: 0, lastSeen: 0 };
      lastScannedRef.current = { code: normalizedCode, timestamp: now };
      scanCooldownUntilRef.current = now + 1000;

      handleStageScannedCode(normalizedCode, false);
      return true;
    };

    const tryDecodeCanvas = async (
      canvas: HTMLCanvasElement,
      ctx: CanvasRenderingContext2D,
      effectiveMode: "barcode" | "qr" | "both",
      allowHistogramFallback: boolean
    ): Promise<boolean> => {
      const w = canvas.width;
      const h = canvas.height;

      // 1. Native BarcodeDetector guarded with a strict 120ms timeout so mobile IPC never hangs the loop
      if (nativeDetector) {
        try {
          let timedOut = false;
          const detectPromise = nativeDetector.detect(canvas);
          const timeoutPromise = new Promise<null>((resolve) =>
            setTimeout(() => {
              timedOut = true;
              resolve(null);
            }, 120)
          );
          const detected = await Promise.race([detectPromise, timeoutPromise]);
          if (timedOut) {
            nativeTimeoutStreak += 1;
            if (nativeTimeoutStreak >= 2) {
              nativeDetector = null;
            }
          } else {
            nativeTimeoutStreak = 0;
            if (detected && detected.length > 0) {
              for (const item of detected) {
                if (!item.rawValue) continue;
                const fmt = (item.format || "").toLowerCase();
                const is2D =
                  fmt === "qr_code" ||
                  fmt === "data_matrix" ||
                  fmt === "pdf417" ||
                  fmt === "aztec" ||
                  item.rawValue.trim().toUpperCase().startsWith("TFQR1:");
                if (effectiveMode === "barcode" && is2D) continue;
                if (effectiveMode === "qr" && !is2D && fmt !== "") continue;

                if (processDecodedCandidate(item.rawValue, is2D)) {
                  return true;
                }
              }
            }
          }
        } catch {
          nativeTimeoutStreak += 1;
          if (nativeTimeoutStreak >= 2) {
            nativeDetector = null;
          }
        }
      }

      let luminanceSource: HTMLCanvasElementLuminanceSource | null = null;
      let hybridBitmap: BinaryBitmap | null = null;

      // 2. When 1D Barcode scanning is active ("barcode" or "both"), run zxingBarcodeReader
      if (effectiveMode !== "qr") {
        try {
          luminanceSource = new HTMLCanvasElementLuminanceSource(canvas);
          hybridBitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource));
          const result1D = zxingBarcodeReader.decodeWithState(hybridBitmap);
          if (result1D && result1D.getText()) {
            if (processDecodedCandidate(result1D.getText(), false)) {
              return true;
            }
          }
        } catch {
          // no 1D barcode found
        } finally {
          try {
            zxingBarcodeReader.reset();
          } catch {}
        }
      }

      // 3. When 2D QR scanning is active ("qr" or "both"), run jsQR + zxingQrReader
      if (effectiveMode !== "barcode") {
        try {
          const imageData = ctx.getImageData(0, 0, w, h);
          const qrResult = jsQR(imageData.data, w, h, {
            inversionAttempts: allowHistogramFallback ? "attemptBoth" : "dontInvert",
          });
          if (qrResult && qrResult.data) {
            if (processDecodedCandidate(qrResult.data, true)) {
              return true;
            }
          }
        } catch {
          // continue
        }

        try {
          if (!luminanceSource) {
            luminanceSource = new HTMLCanvasElementLuminanceSource(canvas);
          }
          if (!hybridBitmap) {
            hybridBitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource));
          }
          try {
            const result2D = zxingQrReader.decodeWithState(hybridBitmap);
            if (result2D && result2D.getText()) {
              if (processDecodedCandidate(result2D.getText(), true)) {
                return true;
              }
            }
          } catch {
            zxingQrReader.reset();
            if (allowHistogramFallback) {
              const histBitmap = new BinaryBitmap(new GlobalHistogramBinarizer(luminanceSource));
              const resultHist = zxingQrReader.decodeWithState(histBitmap);
              if (resultHist && resultHist.getText()) {
                if (processDecodedCandidate(resultHist.getText(), true)) {
                  return true;
                }
              }
            }
          }
        } catch {
          // normal when no QR in frame
        } finally {
          try {
            zxingQrReader.reset();
          } catch {}
        }
      }

      return false;
    };

    const scheduleNextTick = (delayMs: number = 140) => {
      if (isCancelled) return;
      loopTimerId = setTimeout(runDecodeTick, delayMs);
    };

    const runDecodeTick = async () => {
      if (isCancelled) return;
      if (isDecoding) {
        scheduleNextTick(140);
        return;
      }

      isDecoding = true;
      tickCounter = (tickCounter + 1) % 120;

      try {
        if (
          cameraScanSuccessTimestampRef.current > 0 &&
          Date.now() - cameraScanSuccessTimestampRef.current > 750
        ) {
          cameraScanSuccessTimestampRef.current = 0;
          setCameraScanSuccess(null);
        }

        if (
          duplicateAlertTimestampRef.current > 0 &&
          Date.now() - duplicateAlertTimestampRef.current > 1300
        ) {
          duplicateAlertTimestampRef.current = 0;
          setDuplicateAlert(null);
        }

        const video = videoRef.current;
        const canvas = scanCanvasRef.current;
        const macroCanvas = macroCanvasRef.current;
        if (!video || !canvas || !macroCanvas) {
          scheduleNextTick(150);
          return;
        }

        if (video.paused && video.srcObject) {
          video.play().catch(() => {});
        }

        if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
          scheduleNextTick(150);
          return;
        }

        if (Date.now() < scanCooldownUntilRef.current) {
          scheduleNextTick(140);
          return;
        }

        const vw = video.videoWidth;
        const vh = video.videoHeight;
        const squareSide = Math.min(vw, vh);

        const isTwoStepOn = isScanCustomerQrEnabledRef.current;
        const isAwaitingCustomerQr =
          isTwoStepOn &&
          customerQrScanStepRef.current.step === "awaiting_customer_qr";

        // STEP 2 of 2-Step Scan (Awaiting Customer Mini QR ONLY): Dedicated fast QR-only pipeline
        if (isAwaitingCustomerQr) {
          const qrCropSide = Math.max(96, Math.floor(squareSide * 0.56));
          const qrCropX = Math.max(0, Math.floor((vw - qrCropSide) / 2));
          const qrCropY = Math.max(0, Math.floor((vh - qrCropSide) / 2));
          const targetSide = 440;

          if (canvas.width !== targetSide) canvas.width = targetSide;
          if (canvas.height !== targetSide) canvas.height = targetSide;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (!ctx) return;

          ctx.drawImage(video, qrCropX, qrCropY, qrCropSide, qrCropSide, 0, 0, targetSide, targetSide);
          if (await tryDecodeCanvas(canvas, ctx, "qr", tickCounter % 2 === 0)) return;

          // Tighter Macro Center Crop on separate canvas (no canvas resize thrashing)
          const macroSide = Math.max(80, Math.floor(squareSide * 0.38));
          const macroX = Math.max(0, Math.floor((vw - macroSide) / 2));
          const macroY = Math.max(0, Math.floor((vh - macroSide) / 2));
          const macroTarget = 380;

          if (macroCanvas.width !== macroTarget) macroCanvas.width = macroTarget;
          if (macroCanvas.height !== macroTarget) macroCanvas.height = macroTarget;
          const mCtx = macroCanvas.getContext("2d", { willReadFrequently: true });
          if (mCtx) {
            mCtx.drawImage(video, macroX, macroY, macroSide, macroSide, 0, 0, macroTarget, macroTarget);
            if (tickCounter % 2 === 1) {
              fastContrastStretchROI(mCtx, macroTarget, macroTarget);
            }
            await tryDecodeCanvas(macroCanvas, mCtx, "qr", true);
          }
          return;
        }

        // When 2-Step Scan is ON (Step 1), force "barcode" only. When 2-Step Scan is OFF, use selected cameraGuideMode ("barcode" | "qr" | "both").
        const effectiveMode: "barcode" | "qr" | "both" = isTwoStepOn
          ? "barcode"
          : guideModeRef.current;

        let roiWidthRatio = 0.82;
        let roiHeightRatio = 0.54;
        if (effectiveMode === "barcode") {
          roiWidthRatio = 0.84;
          roiHeightRatio = 0.36;
        } else if (effectiveMode === "qr") {
          roiWidthRatio = 0.66;
          roiHeightRatio = 0.66;
        }

        const cropW = Math.max(64, Math.floor(squareSide * roiWidthRatio));
        const cropH = Math.max(64, Math.floor(squareSide * roiHeightRatio));
        const cropX = Math.max(0, Math.floor((vw - cropW) / 2));
        const cropY = Math.max(0, Math.floor((vh - cropH) / 2));

        const maxTargetDim = 540;
        const scale = Math.min(1.25, maxTargetDim / Math.max(cropW, cropH));
        const targetW = Math.max(64, Math.floor(cropW * scale));
        const targetH = Math.max(64, Math.floor(cropH * scale));

        if (canvas.width !== targetW) canvas.width = targetW;
        if (canvas.height !== targetH) canvas.height = targetH;

        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;

        // Pass 1: Standard decode on Guide Box ROI
        ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, targetW, targetH);
        if (await tryDecodeCanvas(canvas, ctx, effectiveMode, false)) return;

        // Pass 2 (only every 3rd tick to keep CPU <10%): Lightweight contrast stretch for low-contrast / wrinkled labels
        if (tickCounter % 3 === 0) {
          if (fastContrastStretchROI(ctx, targetW, targetH)) {
            await tryDecodeCanvas(canvas, ctx, effectiveMode, false);
          }
        }
      } catch {
        // Ensure any unexpected frame error never stops future scans
      } finally {
        isDecoding = false;
        scheduleNextTick(140);
      }
    };

    const startCamera = async () => {
      try {
        setCameraError(null);
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setCameraError("Camera access is not supported in this browser.");
          return;
        }

        let stream = cameraStreamRef.current;
        if (!stream || !stream.active) {
          const opened = await openNormalPhotoCameraStream();
          stream = opened.stream;
        }

        if (isCancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        cameraStreamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute("playsinline", "true");
          await videoRef.current.play().catch(() => {});
        }

        const [videoTrack] = stream.getVideoTracks();
        if (videoTrack) {
          void applyContinuousFocusToTrack(videoTrack);
        }

        if (!scanCanvasRef.current) {
          scanCanvasRef.current = document.createElement("canvas");
        }
        if (!macroCanvasRef.current) {
          macroCanvasRef.current = document.createElement("canvas");
        }

        scheduleNextTick(150);
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
  }, [extractCandidateScannedCode, handleStageScannedCode, playScanBeep, cameraRetryTick]);

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

  // Discard / Delete locked Step 1 barcode in 2-Step Scan and reset back to Step 1
  const handleDeletePendingStep1Awb = useCallback(() => {
    const resetState = {
      step: "awaiting_awb" as const,
      pendingAwb: "",
      pendingCourierId: "",
      pendingCourierName: "",
      pendingFormatLabel: "",
    };
    customerQrScanStepRef.current = resetState;
    setCustomerQrScanStep(resetState);
    lastScannedRef.current = { code: "", timestamp: 0 };
    pendingCandidateRef.current = { code: "", count: 0, firstSeen: 0, lastSeen: 0 };
    scanCooldownUntilRef.current = Date.now() + 250;
    setCameraScanSuccess(null);
    setFormatError(null);
  }, []);

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
          {/* Left: Title */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shrink-0">
              <ScanLine className="h-3.5 w-3.5" />
            </span>
            <h1 className="text-xs sm:text-sm font-extrabold text-white tracking-tight truncate">
              Barcode &amp; QR Scanner
            </h1>
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
        {/* Unified User-Friendly Top Control Bar (No duplicate buttons or ON/OFF text inside buttons) */}
        <div className="w-full max-w-md rounded-2xl bg-slate-900/95 border border-slate-800 px-3 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0">
          {/* Left: When 2-Step Scan is OFF, show Barcode / QR / Both switcher; when ON, show active step indicator */}
          {!isScanCustomerQrEnabled ? (
            <div className="inline-flex items-center gap-0.5 rounded-xl bg-slate-950 p-1 border border-slate-800">
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
          ) : (
            <div
              className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[11px] font-bold border ${
                customerQrScanStep.step === "awaiting_customer_qr"
                  ? "bg-indigo-600/20 border-indigo-500/50 text-indigo-300"
                  : "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
              }`}
            >
              {customerQrScanStep.step === "awaiting_customer_qr" ? (
                <>
                  <QrCode className="h-3.5 w-3.5" />
                  <span>Step 2: Customer QR</span>
                </>
              ) : (
                <>
                  <ScanLine className="h-3.5 w-3.5" />
                  <span>Step 1: Barcode</span>
                </>
              )}
            </div>
          )}

          {/* Right: Default Status Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsStatusMenuOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 px-2.5 py-1 text-[11px] font-bold text-slate-200 cursor-pointer"
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

          {/* Clean Toggle Row: 2-Step Scan, Auto-Next, No Rule (sliding switches only, no ON/OFF text) */}
          <div className="w-full flex items-center justify-between gap-2 pt-1.5 border-t border-slate-800/80">
            {/* 2-Step Scan Toggle (renamed from Customer QR) */}
            <label
              onClick={toggleScanCustomerQr}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-200 cursor-pointer select-none"
              title="Toggle 2-Step Scan (1st Barcode Tracking ID -> 2nd Customer Data QR)"
            >
              <span>2-Step Scan</span>
              <button
                type="button"
                role="switch"
                aria-checked={isScanCustomerQrEnabled}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleScanCustomerQr();
                }}
                className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  isScanCustomerQrEnabled ? "bg-indigo-500" : "bg-slate-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                    isScanCustomerQrEnabled ? "translate-x-3.5" : "translate-x-0"
                  }`}
                />
              </button>
            </label>

            {/* Auto-Next Sliding Toggle Switch */}
            <label
              onClick={() => setIsAutoNextEnabled((prev) => !prev)}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-200 cursor-pointer select-none"
              title="Automatically advance to the next scan"
            >
              <span>Auto-Next</span>
              <button
                type="button"
                role="switch"
                aria-checked={isAutoNextEnabled}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsAutoNextEnabled((prev) => !prev);
                }}
                className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  isAutoNextEnabled ? "bg-emerald-500" : "bg-slate-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                    isAutoNextEnabled ? "translate-x-3.5" : "translate-x-0"
                  }`}
                />
              </button>
            </label>

            {/* No Rule Sliding Toggle Switch */}
            <label
              onClick={() => {
                setIsPasteAnywayEnabled((prev) => {
                  const next = !prev;
                  if (next && formatError) {
                    setFormatError(null);
                  }
                  return next;
                });
              }}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-200 cursor-pointer select-none"
              title="Allow unrecognized barcode/QR formats"
            >
              <span>No Rule</span>
              <button
                type="button"
                role="switch"
                aria-checked={isPasteAnywayEnabled}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPasteAnywayEnabled((prev) => {
                    const next = !prev;
                    if (next && formatError) {
                      setFormatError(null);
                    }
                    return next;
                  });
                }}
                className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  isPasteAnywayEnabled ? "bg-amber-500" : "bg-slate-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                    isPasteAnywayEnabled ? "translate-x-3.5" : "translate-x-0"
                  }`}
                />
              </button>
            </label>
          </div>
        </div>

        {/* Fixed Square Camera Space */}
        <div className="relative flex flex-col items-center justify-center w-full my-auto">
          {cameraError && (
            <div className="mb-2.5 w-full max-w-[340px] sm:max-w-[380px] rounded-xl border border-amber-700/80 bg-amber-950/90 px-3.5 py-2.5 text-xs font-semibold text-amber-200 flex items-center justify-between gap-2">
              <span className="text-left leading-snug">{cameraError}</span>
              <button
                type="button"
                onClick={() => {
                  stopCameraStream();
                  setCameraError(null);
                  setCameraRetryTick((prev) => prev + 1);
                }}
                className="shrink-0 rounded-lg bg-amber-500 hover:bg-amber-400 px-2.5 py-1 text-[11px] font-bold text-slate-950 transition-colors cursor-pointer"
              >
                Retry Camera
              </button>
            </div>
          )}

          {/* Dedicated Fixed Square Camera Container (Tap anywhere to re-focus) */}
          <div
            onClick={handleViewfinderTapToFocus}
            className={`relative aspect-square w-[min(85vw,330px)] sm:w-[370px] rounded-3xl bg-black overflow-hidden flex items-center justify-center border-2 transition-all duration-150 shadow-2xl cursor-pointer ${
              cameraScanSuccess
                ? "border-emerald-500 shadow-[0_0_28px_rgba(16,185,129,0.4)]"
                : formatError
                ? "border-rose-500 shadow-[0_0_28px_rgba(244,63,94,0.45)]"
                : "border-slate-800"
            }`}
            title="Tap camera view to re-focus"
          >
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              playsInline
              muted
              autoPlay
            />

            {focusTapPoint && (
              <div
                style={{
                  left: `${focusTapPoint.x}px`,
                  top: `${focusTapPoint.y}px`,
                }}
                className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2 h-12 w-12 rounded-full border-2 border-indigo-400 bg-indigo-500/15 animate-ping"
              />
            )}

            {/* Guide Frame: When 2-Step Scan is ON -> Barcode only (Step 1) or QR only (Step 2). When OFF -> Barcode, QR, or Both */}
            {((isScanCustomerQrEnabled && customerQrScanStep.step !== "awaiting_customer_qr") ||
              (!isScanCustomerQrEnabled && cameraGuideMode === "barcode")) && (
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

            {((isScanCustomerQrEnabled && customerQrScanStep.step === "awaiting_customer_qr") ||
              (!isScanCustomerQrEnabled && cameraGuideMode === "qr")) && (
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

            {!isScanCustomerQrEnabled && cameraGuideMode === "both" && (
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

            {/* Invalid / Unrecognized Consignment ID Format Flagged Overlay */}
            {formatError && (
              <div
                key={formatError.ts}
                className="absolute inset-x-3 bottom-3 z-30 rounded-2xl border border-rose-500/90 bg-rose-950/95 p-3 text-white shadow-2xl backdrop-blur-md space-y-2"
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1 text-left">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] font-black uppercase tracking-wider text-rose-300">
                        Invalid Format Flagged ({formatError.length} chars)
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

                {/* Close Action for Invalid Format Popup */}
                <div className="flex items-center justify-end pt-1.5 border-t border-rose-800/80">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFormatError(null);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-rose-800/90 hover:bg-rose-700 border border-rose-600/70 px-3.5 py-1.5 text-[11px] font-black text-white shadow-xs cursor-pointer transition-colors"
                  >
                    <X className="h-3.5 w-3.5 stroke-[2.5]" />
                    <span>Close</span>
                  </button>
                </div>
              </div>
            )}

            {/* Duplicate Scan Alert Pill (Auto-hides after 1.3s or tap to dismiss) */}
            {duplicateAlert && !formatError && (
              <div
                key={duplicateAlert.ts}
                onClick={(e) => {
                  e.stopPropagation();
                  duplicateAlertTimestampRef.current = 0;
                  if (duplicateAlertTimerRef.current) {
                    clearTimeout(duplicateAlertTimerRef.current);
                  }
                  setDuplicateAlert(null);
                }}
                className="absolute bottom-3 inset-x-4 z-30 rounded-xl border border-amber-500/70 bg-amber-950/95 px-3 py-1.5 text-center text-xs font-bold text-amber-300 shadow-lg cursor-pointer"
              >
                {duplicateAlert.text}
              </div>
            )}
          </div>
        </div>

        {/* Thumb-Accessible Step 2 Action Bar: Shows locked Step 1 Barcode, Skip QR button, and easy-to-reach Delete icon */}
        {isScanCustomerQrEnabled && customerQrScanStep.step === "awaiting_customer_qr" && (
          <div className="w-full max-w-md rounded-2xl border border-indigo-500/90 bg-indigo-950/95 px-3.5 py-2.5 text-xs text-indigo-200 flex items-center justify-between gap-2 shrink-0 shadow-lg">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-black text-white truncate">
                  {customerQrScanStep.pendingAwb}
                </span>
                <span className="text-[10px] font-bold text-indigo-300 shrink-0">
                  • {customerQrScanStep.pendingCourierName}
                </span>
              </div>
              <div className="text-[10px] font-semibold text-indigo-300/90">
                Scan Customer QR next or choose action:
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const awb = customerQrScanStep.pendingAwb;
                  handleStageScannedCode(awb, true, undefined, true);
                }}
                className="rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 px-3 py-2 text-[11px] font-bold text-white cursor-pointer active:scale-95 transition-all"
              >
                Skip QR
              </button>

              <button
                type="button"
                onClick={handleDeletePendingStep1Awb}
                className="inline-flex items-center justify-center rounded-xl bg-rose-600/90 hover:bg-rose-500 border border-rose-400/50 p-2 text-white shadow-sm cursor-pointer active:scale-95 transition-all"
                title="Delete scanned barcode and rescan"
                aria-label="Delete scanned barcode"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

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
                    {/* Courier Partner Name (Static Badge - No Dropdown) */}
                    <span className="inline-flex items-center rounded-lg border border-slate-800 bg-slate-900 px-2 py-1 text-[10px] font-semibold text-slate-300 truncate max-w-[88px]">
                      {COURIER_MAP[item.courierId]?.shortName || item.courierName}
                    </span>

                    {/* Custom Styled Status Dropdown */}
                    <div className="relative inline-flex items-center">
                      <button
                        type="button"
                        onClick={() =>
                          setQueueOpenDropdown((prev) =>
                            prev?.id === item.id && prev.field === "status"
                              ? null
                              : { id: item.id, field: "status" }
                          )
                        }
                        className="inline-flex items-center justify-between gap-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:border-indigo-500/60 px-2 py-1 text-[10px] font-semibold text-slate-200 cursor-pointer"
                      >
                        <span className="truncate">
                          {item.status === "booked"
                            ? "Booked"
                            : item.status === "in_transit"
                            ? "In Transit"
                            : item.status === "out_for_delivery"
                            ? "Out for Del"
                            : item.status === "delivered"
                            ? "Delivered"
                            : "Returned"}
                        </span>
                        <ChevronDown className="h-3 w-3 text-slate-400 shrink-0" />
                      </button>

                      {queueOpenDropdown?.id === item.id &&
                        queueOpenDropdown.field === "status" && (
                          <>
                            <div
                              className="fixed inset-0 z-40"
                              onClick={() => setQueueOpenDropdown(null)}
                            />
                            <div className="absolute right-0 bottom-full mb-1 z-50 w-36 rounded-xl border border-slate-700 bg-slate-900 p-1 shadow-2xl space-y-0.5">
                              {(
                                [
                                  { value: "booked", label: "Booked" },
                                  { value: "in_transit", label: "In Transit" },
                                  { value: "out_for_delivery", label: "Out for Del" },
                                  { value: "delivered", label: "Delivered" },
                                  { value: "returned", label: "Returned" },
                                ] as const
                              ).map((st) => (
                                <button
                                  key={st.value}
                                  type="button"
                                  onClick={() => {
                                    handleUpdateItemStatus(item.id, st.value as StatusOption);
                                    setQueueOpenDropdown(null);
                                  }}
                                  className={`w-full flex items-center justify-between rounded-lg px-2 py-1 text-[10px] font-semibold text-left cursor-pointer ${
                                    item.status === st.value
                                      ? "bg-indigo-600 text-white"
                                      : "text-slate-200 hover:bg-slate-800"
                                  }`}
                                >
                                  <span>{st.label}</span>
                                  {item.status === st.value && (
                                    <Check className="h-3 w-3 shrink-0" />
                                  )}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                    </div>

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
                  Back
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
                <span>Save &amp; Add ({stagedItems.length})</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleRequestCancel}
                className="rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-5 py-2.5 text-xs font-bold text-slate-200 transition-colors cursor-pointer text-center"
              >
                Back
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

export function CameraScanClient() {
  const isHydrated = React.useSyncExternalStore(
    emptyScanSubscribe,
    () => true,
    () => false
  );

  if (!isHydrated) {
    return (
      <div
        className="fixed inset-0 bg-slate-950"
        suppressHydrationWarning
      />
    );
  }

  return <CameraScanInner />;
}
