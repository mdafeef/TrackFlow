"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  Check,
  X,
  ArrowLeft,
  Trash2,
  Package,
  ShieldAlert,
  Sparkles,
  CheckCircle2,
  Volume2,
  VolumeX,
  ChevronUp,
  ChevronDown,
  Search,
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
import { autoDetectCourier, COURIER_LIST, COURIER_MAP } from "@/lib/couriers";
import type { BulkShipment } from "@/components/BulkDashboard";

const STAGED_STORAGE_KEY = "trackflow_staged_consignments";
const BULK_STORAGE_KEY = "trackflow_bulk_shipments";
const SCAN_CONTEXT_KEY = "trackflow_scan_context";
const SCAN_RETURN_KEY = "trackflow_scan_return";

type StatusOption = "booked" | "in_transit" | "out_for_delivery" | "delivered" | "returned";

export default function DedicatedCameraScanPage() {
  const router = useRouter();

  // Scan mode: 'bulk' (default multi-scan for dashboard) or 'single' (instant single parcel track)
  const [scanWorkflow, setScanWorkflow] = useState<"bulk" | "single">(() => {
    if (typeof window !== "undefined") {
      try {
        const rawCtx = sessionStorage.getItem(SCAN_CONTEXT_KEY);
        if (rawCtx) {
          const parsed = JSON.parse(rawCtx);
          if (parsed.mode === "single" || parsed.mode === "bulk") return parsed.mode;
        }
      } catch {}
    }
    return "bulk";
  });

  // Camera & Decoder state
  const [cameraGuideMode, setCameraGuideMode] = useState<"barcode" | "qr" | "both">("both");
  const [isAutoNextEnabled, setIsAutoNextEnabled] = useState<boolean>(true);
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraScanSuccess, setCameraScanSuccess] = useState<{
    code: string;
    carrier: string;
  } | null>(null);

  // Default Status & Carrier applied to newly scanned items (pill buttons — never opens mobile keyboard)
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
    return "in_transit";
  });

  const [defaultCourierId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        const rawCtx = sessionStorage.getItem(SCAN_CONTEXT_KEY);
        if (rawCtx) {
          const parsed = JSON.parse(rawCtx);
          if (parsed.defaultCourierId) return parsed.defaultCourierId;
        }
      } catch {}
    }
    return "auto";
  });

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
  const [isQueueExpanded, setIsQueueExpanded] = useState<boolean>(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState<boolean>(false);
  const [duplicateAlert, setDuplicateAlert] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const scanCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastScannedRef = useRef<{ code: string; timestamp: number }>({
    code: "",
    timestamp: 0,
  });
  const scanSuccessTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Ensure no element has focus on mount so mobile keyboard stays hidden
  useEffect(() => {
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, []);

  // Persist staged items whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STAGED_STORAGE_KEY, JSON.stringify(stagedItems));
    } catch {
      // ignore
    }
  }, [stagedItems]);

  // Stop camera stream helper
  const stopCameraStream = useCallback(() => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    }
  }, []);

  // Audio beep feedback on scan
  const playScanBeep = useCallback(
    (isSuccess: boolean = true) => {
      if (!isSoundEnabled || typeof window === "undefined") return;
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(isSuccess ? 880 : 320, ctx.currentTime);
        if (isSuccess) {
          osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.09);
        }
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } catch {
        // ignore audio errors
      }
    },
    [isSoundEnabled]
  );

  // Extract clean AWB / Consignment ID from barcode or QR payload
  const extractCleanScannedCode = useCallback((rawValue: string): string => {
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
        if (lastSeg && /^[A-Z0-9-]{5,30}$/i.test(lastSeg)) {
          return lastSeg.toUpperCase();
        }
      } catch {
        // fallback below
      }
    }

    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed);
        const candidate =
          parsed.trackingNumber || parsed.awb || parsed.consignment || parsed.id || parsed.code;
        if (candidate && String(candidate).trim().length >= 4) {
          return String(candidate).trim().toUpperCase();
        }
      } catch {
        // ignore
      }
    }

    const cleaned = trimmed.replace(/[^a-zA-Z0-9-_]/g, "").toUpperCase();
    return cleaned.length >= 4 ? cleaned : trimmed.toUpperCase();
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

  // Stage a scanned consignment
  const handleStageScannedCode = useCallback(
    (code: string) => {
      const cleanNum = code.trim().toUpperCase();
      if (!cleanNum) return;

      const detected = autoDetectCourier(cleanNum);
      const chosenCourier =
        defaultCourierId !== "auto" && COURIER_MAP[defaultCourierId]
          ? COURIER_MAP[defaultCourierId]
          : detected || COURIER_MAP.speedpost;

      // If single parcel workflow is selected, immediately return to home and trigger live tracking
      if (scanWorkflow === "single") {
        playScanBeep(true);
        setCameraScanSuccess({
          code: cleanNum,
          carrier: chosenCourier.shortName || chosenCourier.name,
        });
        try {
          sessionStorage.setItem(
            SCAN_RETURN_KEY,
            JSON.stringify({
              target: "single_track",
              trackingNumber: cleanNum,
              courierId: chosenCourier.id,
            })
          );
        } catch {}
        setTimeout(() => {
          stopCameraStream();
          router.push("/");
        }, 550);
        return;
      }

      // Check duplicate in current staged list
      setStagedItems((prev) => {
        if (prev.some((s) => s.trackingNumber === cleanNum)) {
          setDuplicateAlert(`Already scanned: ${cleanNum}`);
          setTimeout(() => setDuplicateAlert(null), 2200);
          return prev;
        }

        const dest = "Destination Hub";
        const meta = getLogicalStatusMeta(defaultStatus, dest);

        const newItem: BulkShipment = {
          id: `staged-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          trackingNumber: cleanNum,
          courierId: chosenCourier.id,
          courierName: chosenCourier.name,
          status: defaultStatus,
          statusText: meta.statusText,
          origin: "Origin Booking Hub",
          destination: dest,
          articleType: defaultStatus === "booked" ? "Booked Consignment" : "Registered Consignment",
          weight: "250 g",
          lastUpdated: "Scanned Just Now",
          lastLocation: meta.lastLocation,
        };

        playScanBeep(true);
        setCameraScanSuccess({
          code: cleanNum,
          carrier: chosenCourier.shortName || chosenCourier.name,
        });
        if (scanSuccessTimerRef.current) clearTimeout(scanSuccessTimerRef.current);
        scanSuccessTimerRef.current = setTimeout(() => {
          setCameraScanSuccess(null);
        }, 1350);

        return [newItem, ...prev];
      });
    },
    [defaultCourierId, defaultStatus, playScanBeep, router, scanWorkflow, stopCameraStream]
  );

  // Camera stream & multi-engine barcode / QR loop
  useEffect(() => {
    let isCancelled = false;
    let scanIntervalId: NodeJS.Timeout | null = null;

    const zxingReader = new MultiFormatReader();
    const hints = new Map();
    const formats =
      cameraGuideMode === "barcode"
        ? [
            BarcodeFormat.CODE_128,
            BarcodeFormat.CODE_39,
            BarcodeFormat.CODE_93,
            BarcodeFormat.CODABAR,
            BarcodeFormat.EAN_13,
            BarcodeFormat.EAN_8,
            BarcodeFormat.ITF,
            BarcodeFormat.UPC_A,
            BarcodeFormat.UPC_E,
          ]
        : cameraGuideMode === "qr"
        ? [BarcodeFormat.QR_CODE, BarcodeFormat.DATA_MATRIX, BarcodeFormat.PDF_417, BarcodeFormat.AZTEC]
        : [
            BarcodeFormat.QR_CODE,
            BarcodeFormat.CODE_128,
            BarcodeFormat.CODE_39,
            BarcodeFormat.CODE_93,
            BarcodeFormat.CODABAR,
            BarcodeFormat.EAN_13,
            BarcodeFormat.EAN_8,
            BarcodeFormat.ITF,
            BarcodeFormat.UPC_A,
            BarcodeFormat.UPC_E,
            BarcodeFormat.DATA_MATRIX,
            BarcodeFormat.PDF_417,
            BarcodeFormat.AZTEC,
          ];
    hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);
    hints.set(DecodeHintType.TRY_HARDER, true);
    zxingReader.setHints(hints);

    let nativeDetector: { detect: (source: HTMLCanvasElement) => Promise<Array<{ rawValue?: string }>> } | null = null;
    if (typeof window !== "undefined" && "BarcodeDetector" in window) {
      try {
        const NativeBarcodeDetector = (window as unknown as {
          BarcodeDetector: new (opts: { formats: string[] }) => {
            detect: (source: HTMLCanvasElement) => Promise<Array<{ rawValue?: string }>>;
          };
        }).BarcodeDetector;
        const nativeFormats =
          cameraGuideMode === "barcode"
            ? ["code_128", "code_39", "code_93", "codabar", "ean_13", "ean_8", "itf", "upc_a", "upc_e"]
            : cameraGuideMode === "qr"
            ? ["qr_code", "data_matrix", "pdf417", "aztec"]
            : [
                "qr_code",
                "code_128",
                "code_39",
                "code_93",
                "codabar",
                "ean_13",
                "ean_8",
                "itf",
                "upc_a",
                "upc_e",
                "data_matrix",
                "pdf417",
                "aztec",
              ];
        nativeDetector = new NativeBarcodeDetector({ formats: nativeFormats });
      } catch {
        nativeDetector = null;
      }
    }

    const onDetectedRaw = (rawVal: string) => {
      const code = extractCleanScannedCode(rawVal);
      if (!code || code.length < 4) return;

      const now = Date.now();
      if (
        lastScannedRef.current.code === code &&
        now - lastScannedRef.current.timestamp < 2200
      ) {
        return;
      }
      lastScannedRef.current = { code, timestamp: now };
      handleStageScannedCode(code);
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
              height: { ideal: 720 },
            },
            audio: false,
          });
        }

        if (isCancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        cameraStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }

        if (!scanCanvasRef.current) {
          scanCanvasRef.current = document.createElement("canvas");
        }

        scanIntervalId = setInterval(async () => {
          if (isCancelled || !videoRef.current || !scanCanvasRef.current) return;
          const video = videoRef.current;
          if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) return;

          const canvas = scanCanvasRef.current;
          const maxDim = 640;
          const scale = Math.min(1, maxDim / Math.max(video.videoWidth, video.videoHeight));
          const w = Math.max(1, Math.floor(video.videoWidth * scale));
          const h = Math.max(1, Math.floor(video.videoHeight * scale));

          if (canvas.width !== w) canvas.width = w;
          if (canvas.height !== h) canvas.height = h;

          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (!ctx) return;
          ctx.drawImage(video, 0, 0, w, h);

          if (nativeDetector) {
            try {
              const detected = await nativeDetector.detect(canvas);
              if (detected && detected.length > 0 && detected[0].rawValue) {
                onDetectedRaw(detected[0].rawValue);
                return;
              }
            } catch {
              // continue
            }
          }

          if (cameraGuideMode !== "barcode") {
            try {
              const imageData = ctx.getImageData(0, 0, w, h);
              const qrResult = jsQR(imageData.data, w, h, {
                inversionAttempts: "attemptBoth",
              });
              if (qrResult && qrResult.data) {
                onDetectedRaw(qrResult.data);
                return;
              }
            } catch {
              // continue
            }
          }

          try {
            const luminanceSource = new HTMLCanvasElementLuminanceSource(canvas);
            const binaryBitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource));
            const result = zxingReader.decodeWithState(binaryBitmap);
            if (result && result.getText()) {
              onDetectedRaw(result.getText());
              return;
            }
          } catch {
            // continue scanning
          }
        }, 180);
      } catch {
        if (!isCancelled) {
          setCameraError("Camera permission not granted or camera unavailable on this device.");
        }
      }
    };

    startCamera();

    return () => {
      isCancelled = true;
      if (scanIntervalId) clearInterval(scanIntervalId);
    };
  }, [cameraGuideMode, extractCleanScannedCode, handleStageScannedCode]);

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

  // Request Cancel / Back
  const handleRequestCancel = () => {
    if (stagedItems.length > 0) {
      setIsCancelConfirmOpen(true);
      return;
    }
    stopCameraStream();
    router.push("/");
  };

  const handleConfirmDiscardAndExit = () => {
    stopCameraStream();
    try {
      localStorage.removeItem(STAGED_STORAGE_KEY);
    } catch {}
    router.push("/");
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col overflow-hidden select-none">
      {/* Top Dedicated Scanner Header */}
      <header className="flex items-center justify-between border-b border-slate-800/90 px-4 sm:px-6 py-3 bg-slate-900/95 shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRequestCancel}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700/80 bg-slate-800/90 hover:bg-slate-700 px-3 py-2 text-xs font-bold text-slate-200 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </button>

          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shrink-0">
              <Camera className="h-4 w-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black tracking-tight text-white">
                  Dedicated Camera Scanner
                </h1>
                <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 text-[11px] font-mono font-black text-emerald-300">
                  {stagedItems.length} Scanned
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Standalone zero-keyboard scanner — auto-detects shipping partner on every barcode or QR
              </p>
            </div>
          </div>
        </div>

        {/* Right Controls: Workflow Switcher (Bulk vs Single) & Sound Toggle */}
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setScanWorkflow("bulk")}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                scanWorkflow === "bulk"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Bulk Stage
            </button>
            <button
              type="button"
              onClick={() => setScanWorkflow("single")}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                scanWorkflow === "single"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Single Track
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsSoundEnabled((prev) => !prev)}
            className="rounded-xl border border-slate-800 bg-slate-950 p-2 text-slate-300 hover:text-white cursor-pointer"
            title={isSoundEnabled ? "Mute scan beep" : "Unmute scan beep"}
          >
            {isSoundEnabled ? <Volume2 className="h-4 w-4 text-emerald-400" /> : <VolumeX className="h-4 w-4 text-slate-500" />}
          </button>
        </div>
      </header>

      {/* Sub-Toolbar: Guide Mode (Barcode / QR / Both), Status Pill Selector, and Auto-Next */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-2.5 bg-slate-900/80 border-b border-slate-800/80 shrink-0">
        {/* Guide Mode Switcher */}
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs font-bold">
            {(["barcode", "qr", "both"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setCameraGuideMode(m)}
                className={`px-3 py-1 rounded-lg capitalize transition-all cursor-pointer ${
                  cameraGuideMode === m
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {m === "qr" ? "QR" : m}
              </button>
            ))}
          </div>
        </div>

        {/* Non-keyboard Default Status Pills for Bulk Mode */}
        {scanWorkflow === "bulk" && (
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full py-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mr-1">
              Tag Status:
            </span>
            {(
              [
                { value: "booked", label: "Booked", dot: "bg-violet-400" },
                { value: "in_transit", label: "In Transit", dot: "bg-sky-400" },
                { value: "out_for_delivery", label: "Out for Delivery", dot: "bg-amber-400" },
                { value: "delivered", label: "Delivered", dot: "bg-emerald-400" },
                { value: "returned", label: "Returned", dot: "bg-rose-400" },
              ] as const
            ).map((st) => (
              <button
                key={st.value}
                type="button"
                onClick={() => setDefaultStatus(st.value)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold shrink-0 transition-all cursor-pointer ${
                  defaultStatus === st.value
                    ? "bg-indigo-600/90 text-white ring-1 ring-indigo-400"
                    : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                <span>{st.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Auto-Next Toggle */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-300">
            Auto-Next:{" "}
            <span className={isAutoNextEnabled ? "text-emerald-400" : "text-amber-400"}>
              {isAutoNextEnabled ? "ON" : "OFF"}
            </span>
          </span>
          <button
            type="button"
            onClick={() => setIsAutoNextEnabled((prev) => !prev)}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
              isAutoNextEnabled ? "bg-emerald-600" : "bg-slate-700"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${
                isAutoNextEnabled ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Main Full-Viewport Camera Feed */}
      <div className="relative flex-1 flex flex-col p-3 sm:p-5 gap-3 overflow-hidden">
        {cameraError && (
          <div className="rounded-xl border border-amber-700/80 bg-amber-950/80 px-4 py-2.5 text-xs font-semibold text-amber-200 flex items-center justify-between">
            <span>{cameraError}</span>
          </div>
        )}

        {duplicateAlert && (
          <div className="rounded-xl border border-amber-500/60 bg-amber-950/90 px-4 py-2 text-xs font-bold text-amber-300 text-center animate-in fade-in">
            {duplicateAlert}
          </div>
        )}

        <div
          className={`relative flex-1 rounded-2xl bg-black overflow-hidden flex items-center justify-center border-2 transition-colors duration-200 ${
            cameraScanSuccess
              ? "border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.5)]"
              : "border-slate-800"
          }`}
        >
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            playsInline
            muted
            autoPlay
          />

          {/* Horizontal RED Laser Scan Line */}
          {!cameraScanSuccess && (
            <div className="absolute left-6 right-6 sm:left-12 sm:right-12 h-0.5 bg-red-500 shadow-[0_0_16px_#ef4444] animate-pulse z-10 pointer-events-none" />
          )}

          {/* Clean Guide Frame */}
          {cameraGuideMode === "barcode" && (
            <div
              className={`relative z-10 w-4/5 max-w-md h-32 rounded-2xl border-2 pointer-events-none transition-colors ${
                cameraScanSuccess ? "border-emerald-400 bg-emerald-500/15" : "border-white/70"
              }`}
            />
          )}

          {cameraGuideMode === "qr" && (
            <div
              className={`relative z-10 w-52 h-52 sm:w-60 sm:h-60 rounded-2xl border-2 pointer-events-none transition-colors ${
                cameraScanSuccess ? "border-emerald-400 bg-emerald-500/15" : "border-white/70"
              }`}
            />
          )}

          {cameraGuideMode === "both" && (
            <div
              className={`relative z-10 w-4/5 max-w-lg h-48 sm:h-56 rounded-2xl border-2 pointer-events-none flex items-center justify-center transition-colors ${
                cameraScanSuccess ? "border-emerald-400 bg-emerald-500/15" : "border-white/60"
              }`}
            >
              <div className="w-36 h-36 rounded-xl border border-white/45" />
            </div>
          )}

          {/* Instant Green Checkmark Overlay when Barcode or QR is Read & Added */}
          {cameraScanSuccess && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/65 backdrop-blur-[2px] animate-in zoom-in-95 duration-150 pointer-events-none">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xl shadow-emerald-500/40 ring-4 ring-emerald-400/30">
                <Check className="h-9 w-9 stroke-[3.5]" />
              </div>
              <div className="mt-3 rounded-full bg-emerald-500 px-4 py-1 text-xs sm:text-sm font-black tracking-wider text-white font-mono shadow-lg">
                ✓ {cameraScanSuccess.code}
              </div>
              <div className="mt-1 text-xs font-bold text-emerald-300">
                {cameraScanSuccess.carrier}
              </div>
            </div>
          )}
        </div>

        {/* Collapsible Scanned Queue Drawer */}
        {scanWorkflow === "bulk" && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/95 overflow-hidden shrink-0">
            <div
              onClick={() => stagedItems.length > 0 && setIsQueueExpanded((prev) => !prev)}
              className={`px-4 py-2.5 flex items-center justify-between gap-3 ${
                stagedItems.length > 0 ? "cursor-pointer hover:bg-slate-800/60" : ""
              }`}
            >
              {stagedItems.length > 0 ? (
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  </span>
                  <div className="truncate text-xs">
                    <span className="text-slate-400">Latest scan: </span>
                    <span className="font-mono font-black text-white">
                      {stagedItems[0].trackingNumber}
                    </span>
                    <span className="text-indigo-400 font-semibold ml-2">
                      ({stagedItems[0].courierName})
                    </span>
                  </div>
                </div>
              ) : (
                <span className="text-xs text-slate-400">
                  Align any barcode or QR code with the red laser line to scan automatically.
                </span>
              )}

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-mono font-bold text-slate-300">
                  Total: {stagedItems.length}
                </span>
                {stagedItems.length > 0 && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-2 py-1 text-[11px] font-bold text-indigo-300 hover:bg-slate-700 cursor-pointer"
                  >
                    <span>{isQueueExpanded ? "Hide List" : "Inspect List"}</span>
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
              <div className="border-t border-slate-800 max-h-48 overflow-y-auto divide-y divide-slate-800/70 px-3 py-1 bg-slate-950/70">
                {stagedItems.map((item) => (
                  <div
                    key={item.id}
                    className="py-2 flex flex-wrap items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-indigo-400">
                        {item.trackingNumber}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={item.courierId}
                        onChange={(e) => handleUpdateItemCarrier(item.id, e.target.value)}
                        className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] font-semibold text-slate-200 cursor-pointer"
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
                        className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] font-bold text-slate-200 cursor-pointer"
                      >
                        <option value="booked">Booked</option>
                        <option value="in_transit">In Transit</option>
                        <option value="out_for_delivery">Out for Delivery</option>
                        <option value="delivered">Delivered</option>
                        <option value="returned">Returned</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/50 cursor-pointer"
                        title="Remove scanned item"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Action Footer */}
      <footer className="border-t border-slate-800 px-4 sm:px-6 py-3.5 bg-slate-900 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
        <button
          type="button"
          onClick={handleRequestCancel}
          className="rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-4 py-2.5 text-xs font-bold text-slate-200 cursor-pointer"
        >
          Cancel
        </button>

        {scanWorkflow === "bulk" ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleReturnToReview}
              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-500/40 bg-indigo-950/60 hover:bg-indigo-900/70 px-4 py-2.5 text-xs font-bold text-indigo-200 cursor-pointer"
            >
              <span>
                {stagedItems.length > 0
                  ? `Review & Edit in Modal (${stagedItems.length})`
                  : "Back to Manual Entry"}
              </span>
            </button>

            {stagedItems.length > 0 && (
              <button
                type="button"
                onClick={handleDirectConfirmIngest}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 text-xs font-extrabold text-white shadow-md cursor-pointer"
              >
                <Check className="h-4 w-4 stroke-[3]" />
                <span>Confirm & Add to Dashboard ({stagedItems.length})</span>
              </button>
            )}
          </div>
        ) : (
          <div className="text-xs text-slate-400 font-medium">
            Point camera at any parcel barcode/QR to track immediately
          </div>
        )}
      </footer>

      {/* Safe Cancel Confirmation Modal if Scanned Data Exists */}
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

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsCancelConfirmOpen(false)}
                className="rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3.5 py-2 text-xs font-bold text-slate-200 cursor-pointer"
              >
                Keep Scanning
              </button>
              <button
                type="button"
                onClick={handleReturnToReview}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-3.5 py-2 text-xs font-bold text-white cursor-pointer"
              >
                Review Scanned ({stagedItems.length})
              </button>
              <button
                type="button"
                onClick={handleConfirmDiscardAndExit}
                className="rounded-xl bg-rose-600 hover:bg-rose-500 px-3.5 py-2 text-xs font-extrabold text-white cursor-pointer"
              >
                Discard & Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
