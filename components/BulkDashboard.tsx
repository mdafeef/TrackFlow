"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Package,
  CheckCircle2,
  Truck,
  Clock,
  Upload,
  RefreshCw,
  Search,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  Plus,
  Play,
  Pause,
  SlidersHorizontal,
  X,
  FileSpreadsheet,
  AlertCircle,
  ScanLine,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  RotateCcw,
  Download,
  Settings,
  QrCode,
  CheckCheck,
  ChevronDown,
  Pencil,
  Database,
  FileJson,
  Camera,
  CameraOff,
} from "lucide-react";
import * as XLSX from "xlsx";
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

export interface BulkShipment {
  id: string;
  trackingNumber: string;
  courierId: string;
  courierName: string;
  status: "delivered" | "out_for_delivery" | "in_transit" | "returned" | "booked";
  statusText: string;
  origin: string;
  destination: string;
  articleType: string;
  weight: string;
  lastUpdated: string;
  lastLocation: string;
  returnReason?: string;
  recipientName?: string;
  isImported?: boolean;
  batchId?: string;
  batchName?: string;
  importedAt?: string;
}

const DEFAULT_SHIPMENTS: BulkShipment[] = [
  {
    id: "bulk-1",
    trackingNumber: "EL855948618IN",
    courierId: "speedpost",
    courierName: "India Post Speed Post",
    status: "delivered",
    statusText: "Delivered to Recipient",
    origin: "Ayyanthole SO (680003)",
    destination: "Nedumkunnam SO (686542)",
    articleType: "Speed Post Doc",
    weight: "45 g",
    lastUpdated: "Today, 01:44 PM",
    lastLocation: "Nedumkunnam SO",
    recipientName: "Dr. K. R. Nair",
  },
  {
    id: "bulk-2",
    trackingNumber: "B4000211866",
    courierId: "dtdc",
    courierName: "DTDC Courier",
    status: "out_for_delivery",
    statusText: "Out for Delivery Today",
    origin: "Bangalore Main Hub",
    destination: "Kottakkal SO",
    articleType: "Express Cargo",
    weight: "1.2 kg",
    lastUpdated: "Today, 10:30 AM",
    lastLocation: "Kottakkal Hub",
    recipientName: "Ananya Sharma",
  },
  {
    id: "bulk-3",
    trackingNumber: "FMPP4397267510",
    courierId: "ekart",
    courierName: "Ekart Logistics",
    status: "in_transit",
    statusText: "In Transit to Sort Hub",
    origin: "Bhiwandi Fulfillment Hub",
    destination: "Lucknow Central Delivery",
    articleType: "E-Commerce Parcel",
    weight: "450 g",
    lastUpdated: "Today, 08:15 AM",
    lastLocation: "Kanpur Transit Hub",
    recipientName: "Vikram Patel",
  },
  {
    id: "bulk-4",
    trackingNumber: "RT855948618IN",
    courierId: "speedpost",
    courierName: "India Post Speed Post",
    status: "returned",
    statusText: "Returned to Shipper (RTO)",
    origin: "Chennai Central GPO",
    destination: "Coimbatore South",
    articleType: "Registered Article",
    weight: "110 g",
    lastUpdated: "Today, 11:20 AM",
    lastLocation: "Chennai Central Hub",
    returnReason: "Addressee Moved / Incomplete Address",
    recipientName: "R. Ramanathan",
  },
  {
    id: "bulk-5",
    trackingNumber: "DTDC-RTO-9921",
    courierId: "dtdc",
    courierName: "DTDC Courier",
    status: "returned",
    statusText: "RTO Delivered: Customer Refused",
    origin: "Bangalore Whitefield",
    destination: "Kochi Delivery Hub",
    articleType: "Commercial Sample",
    weight: "850 g",
    lastUpdated: "Yesterday, 04:45 PM",
    lastLocation: "Bangalore Return Hub",
    returnReason: "Consignee Refused Acceptance",
    recipientName: "Mathews Thomas",
    isImported: true,
    batchId: "batch-demo-1",
    batchName: "Batch #1 • sample_records.xlsx",
    importedAt: "Yesterday, 04:45 PM",
  },
  {
    id: "bulk-6",
    trackingNumber: "12345678901",
    courierId: "bluedart",
    courierName: "BlueDart Express",
    status: "in_transit",
    statusText: "Dispatched from Airport Hub",
    origin: "Mumbai Cargo Terminal",
    destination: "Chennai Guindy Hub",
    articleType: "Air Express Document",
    weight: "180 g",
    lastUpdated: "Today, 06:40 AM",
    lastLocation: "Chennai Air Hub",
    recipientName: "Pooja Verma",
    isImported: true,
    batchId: "batch-demo-1",
    batchName: "Batch #1 • sample_records.xlsx",
    importedAt: "Yesterday, 04:45 PM",
  },
];

interface BulkDashboardProps {
  onOpenTrackingResult: (trackingNumber: string, courierId: string) => void;
}

export function BulkDashboard({ onOpenTrackingResult }: BulkDashboardProps) {
  // Shipments state with batch metadata normalization
  const [shipments, setShipments] = useState<BulkShipment[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("trackflow_bulk_shipments");
        if (stored) {
          const list: BulkShipment[] = JSON.parse(stored);
          return list.map((s) => {
            if (s.isImported && !s.batchId) {
              return {
                ...s,
                batchId: "batch-demo-1",
                batchName: "Batch #1 • sample_records.xlsx",
                importedAt: s.lastUpdated || "Earlier Ingestion",
              };
            }
            return s;
          });
        }
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_SHIPMENTS;
  });

  const [searchFilter, setSearchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "delivered" | "in_transit" | "out_for_delivery" | "returned" | "imported">("all");

  // Auto-check Settings
  // Default interval: 15 minutes = 900 seconds (Default ON)
  const [isAutoCheckEnabled, setIsAutoCheckEnabled] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("trackflow_auto_enabled");
        if (stored !== null) return stored === "true";
      } catch {}
    }
    return true;
  });

  const [checkIntervalSec, setCheckIntervalSec] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const storedInterval = localStorage.getItem("trackflow_auto_interval");
        if (storedInterval) {
          const val = parseInt(storedInterval, 10);
          if (val > 0) return val;
        }
      } catch {}
    }
    return 900; // 15 minutes default
  });

  const [secondsRemaining, setSecondsRemaining] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const storedInterval = localStorage.getItem("trackflow_auto_interval");
        if (storedInterval) {
          const val = parseInt(storedInterval, 10);
          if (val > 0) return val;
        }
      } catch {}
    }
    return 900;
  });

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddConsignmentsModalOpen, setIsAddConsignmentsModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Checkbox Selection & Multiple Delete state
  const [selectedShipmentIds, setSelectedShipmentIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  // Export Delivered Only & Quick Delete Exported Delivered Data
  const [lastExportedDeliveredIds, setLastExportedDeliveredIds] = useState<string[]>([]);
  const [isDeleteExportedModalOpen, setIsDeleteExportedModalOpen] = useState(false);
  const [exportDeliveredSuccessMsg, setExportDeliveredSuccessMsg] = useState<string | null>(null);

  // Delivered Notification state
  const [deliveredNotification, setDeliveredNotification] = useState<{
    count: number;
    items: { id: string; trackingNumber: string; courierName: string; destination: string }[];
    timestamp: string;
  } | null>(null);

  // Settings custom interval input
  const [customMinutesInput, setCustomMinutesInput] = useState("");

  // Unified Intake & Scanner Form state (Typing, Hardware Barcode Scanner & Camera QR/Barcode)
  const [stagedConsignments, setStagedConsignments] = useState<BulkShipment[]>([]);
  const [intakeAwb, setIntakeAwb] = useState("");
  const [intakeCourier, setIntakeCourier] = useState("speedpost");
  const [isIntakeCourierDropdownOpen, setIsIntakeCourierDropdownOpen] = useState(false);
  const [intakeRecipient, setIntakeRecipient] = useState("");
  const [intakeDestination, setIntakeDestination] = useState("");
  const [intakeStatus, setIntakeStatus] = useState<"in_transit" | "out_for_delivery" | "delivered" | "returned">("in_transit");
  const [isIntakeStatusDropdownOpen, setIsIntakeStatusDropdownOpen] = useState(false);
  const [intakeReturnReason, setIntakeReturnReason] = useState("");
  const [intakeError, setIntakeError] = useState("");
  const [isAutoNextEnabled, setIsAutoNextEnabled] = useState(true);
  const [recentStagedCode, setRecentStagedCode] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraGuideMode, setCameraGuideMode] = useState<"barcode" | "qr" | "both">("both");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraScanSuccess, setCameraScanSuccess] = useState<{ code: string; carrier: string } | null>(null);
  const intakeInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const scanCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastScannedRef = useRef<{ code: string; timestamp: number }>({ code: "", timestamp: 0 });
  const scanSuccessTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Batch Wise Ingestion state
  const [selectedBatchId, setSelectedBatchId] = useState<string>("all");
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
  const [editingBatchName, setEditingBatchName] = useState("");
  const [isBatchManagerOpen, setIsBatchManagerOpen] = useState(false);
  const [batchPendingDeleteId, setBatchPendingDeleteId] = useState<string | null>(null);

  // Backup & Restore Review in Separate state
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [backupReviewData, setBackupReviewData] = useState<{
    fileName: string;
    backupDate: string;
    shipments: BulkShipment[];
  } | null>(null);
  const [isReviewingSeparately, setIsReviewingSeparately] = useState(false);
  const [backupReviewSearch, setBackupReviewSearch] = useState("");
  const [backupReviewStatusFilter, setBackupReviewStatusFilter] = useState<string>("all");
  const [backupError, setBackupError] = useState<string | null>(null);
  const [backupSuccessMsg, setBackupSuccessMsg] = useState<string | null>(null);
  const backupFileInputRef = useRef<HTMLInputElement | null>(null);

  // Upload & Preview Modal state
  const [previewShipments, setPreviewShipments] = useState<BulkShipment[] | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string>("");
  const [previewBatchName, setPreviewBatchName] = useState<string>("");
  const [bulkPasteText, setBulkPasteText] = useState<string>("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [importSuccessState, setImportSuccessState] = useState<{
    count: number;
    batchName: string;
    batchId: string;
  } | null>(null);
  const autoCloseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Copy feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Save changes
  const saveShipments = (newShipments: BulkShipment[]) => {
    setShipments(newShipments);
    try {
      localStorage.setItem("trackflow_bulk_shipments", JSON.stringify(newShipments));
    } catch {
      // ignore
    }
  };

  // Lock background page scroll and hide behind-page scrollbar when any modal/popup is open
  const isAnyModalOpen =
    isSettingsOpen ||
    isAddConsignmentsModalOpen ||
    isUploadModalOpen ||
    isBackupModalOpen ||
    isBulkDeleteModalOpen ||
    isDeleteExportedModalOpen;

  useEffect(() => {
    if (isAnyModalOpen) {
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
  }, [isAnyModalOpen]);

  // Clean up timers on component unmount
  useEffect(() => {
    return () => {
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
      if (scanSuccessTimerRef.current) clearTimeout(scanSuccessTimerRef.current);
    };
  }, []);

  // Audio chime feedback using Web Audio API
  const playChime = useCallback((isScanBeep = false) => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        if (isScanBeep) {
          // Sharp positive barcode scanner beep
          osc.frequency.setValueAtTime(1760, ctx.currentTime); // A6
          gain.gain.setValueAtTime(0.2, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.09);
        } else {
          // Melodic status chime
          osc.frequency.setValueAtTime(880, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);
          gain.gain.setValueAtTime(0.12, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.16);
        }
      }
    } catch {
      // Audio autoplay restrictions, safe to ignore
    }
  }, []);

  // Execute an automated or manual sync check
  const handleRunAutoCheck = useCallback(() => {
    setIsRefreshing(true);

    // Simulate progress: advance one in-transit shipment towards delivery
    setTimeout(() => {
      setShipments((prev) => {
        let updatedCount = 0;
        const newlyDeliveredShipments: BulkShipment[] = [];
        const nextList = prev.map((item) => {
          if (item.status === "out_for_delivery" && updatedCount === 0) {
            updatedCount++;
            const deliveredItem = {
              ...item,
              status: "delivered" as const,
              statusText: "Delivered to Recipient",
              lastUpdated: "Just Now",
            };
            newlyDeliveredShipments.push(deliveredItem);
            return deliveredItem;
          }
          if (item.status === "in_transit" && updatedCount === 0) {
            updatedCount++;
            return {
              ...item,
              status: "out_for_delivery" as const,
              statusText: "Out for Delivery Today",
              lastUpdated: "Just Now",
            };
          }
          return item;
        });

        if (newlyDeliveredShipments.length > 0) {
          playChime(true);
          setDeliveredNotification({
            count: newlyDeliveredShipments.length,
            items: newlyDeliveredShipments.map((d) => ({
              id: d.id,
              trackingNumber: d.trackingNumber,
              courierName: d.courierName,
              destination: d.destination,
            })),
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          });

          if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
            try {
              new Notification("TrackFlow: Shipment Delivered!", {
                body: `${newlyDeliveredShipments[0].trackingNumber} delivered at ${newlyDeliveredShipments[0].destination}`,
              });
            } catch {}
          }
        } else if (updatedCount > 0) {
          playChime(false);
        }

        try {
          localStorage.setItem("trackflow_bulk_shipments", JSON.stringify(nextList));
        } catch {
          // ignore
        }
        return nextList;
      });

      setIsRefreshing(false);
      setSecondsRemaining(checkIntervalSec);
    }, 700);
  }, [checkIntervalSec, playChime]);

  // Countdown timer for automatic check interval
  useEffect(() => {
    if (!isAutoCheckEnabled) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          handleRunAutoCheck();
          return checkIntervalSec;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isAutoCheckEnabled, checkIntervalSec, handleRunAutoCheck]);

  // Format countdown mm:ss or hh:mm:ss
  const formatTimer = (totalSeconds: number) => {
    if (totalSeconds < 0) return "00:00";
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes.toString().padStart(2, "0")}m ${seconds.toString().padStart(2, "0")}s`;
    }
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  // Handle interval setting change
  const handleChangeInterval = (newSec: number) => {
    setCheckIntervalSec(newSec);
    setSecondsRemaining(newSec);
    try {
      localStorage.setItem("trackflow_auto_interval", newSec.toString());
    } catch {
      // ignore
    }
  };

  const handleToggleAutoCheck = () => {
    setIsAutoCheckEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("trackflow_auto_enabled", next.toString());
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Stage single typed or barcode/QR scanned consignment into review list
  const handleStageConsignment = useCallback((
    awbToStage: string,
    courierOverride?: string,
    recipientOverride?: string,
    destinationOverride?: string,
    statusOverride?: "in_transit" | "out_for_delivery" | "delivered" | "returned",
    returnReasonOverride?: string
  ) => {
    const cleanNum = awbToStage.trim().toUpperCase();
    if (!cleanNum || cleanNum.length < 4) {
      setIntakeError("Please enter or scan a valid consignment / AWB number (min 4 characters).");
      return;
    }

    // Check duplicate in currently staged list
    if (stagedConsignments.some((s) => s.trackingNumber === cleanNum)) {
      setIntakeError(`AWB ${cleanNum} is already in your staged review list.`);
      return;
    }

    setIntakeError("");

    const detected = autoDetectCourier(cleanNum);
    // If scanning device or camera passes code, auto detect carrier partner
    const chosenCourier = courierOverride
      ? (COURIER_MAP[courierOverride] || detected || COURIER_LIST[0])
      : (detected || (intakeCourier && COURIER_MAP[intakeCourier]) || COURIER_LIST[0]);

    if (detected && detected.id !== intakeCourier) {
      setIntakeCourier(detected.id);
    }

    const isReturnedSim = cleanNum.includes("RT") || cleanNum.includes("RETURN");
    const isDeliveredSim = cleanNum.endsWith("IN") && !isReturnedSim;
    const finalStatus = statusOverride || (isReturnedSim ? "returned" : isDeliveredSim ? "delivered" : intakeStatus);

    const newStaged: BulkShipment = {
      id: `staged-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      trackingNumber: cleanNum,
      courierId: chosenCourier.id,
      courierName: chosenCourier.name,
      status: finalStatus,
      statusText:
        finalStatus === "delivered"
          ? "Delivered to Recipient"
          : finalStatus === "out_for_delivery"
          ? "Out for Delivery Today"
          : finalStatus === "returned"
          ? "Returned to Shipper (RTO)"
          : "Active In-Transit Scan",
      origin: "Origin Facility",
      destination: destinationOverride?.trim() || intakeDestination.trim() || "Destination Center",
      articleType: "Registered Consignment",
      weight: "250 g",
      lastUpdated: "Staged Just Now",
      lastLocation: finalStatus === "returned" ? "Return Hub" : "Regional Sort Hub",
      recipientName: recipientOverride?.trim() || intakeRecipient.trim() || undefined,
      returnReason: finalStatus === "returned" ? (returnReasonOverride || intakeReturnReason.trim() || "Delivery Attempt Failed") : undefined,
    };

    setStagedConsignments((prev) => [newStaged, ...prev]);
    playChime(true);
    setRecentStagedCode(cleanNum);
    setTimeout(() => setRecentStagedCode(null), 3000);

    // Auto-Next handling: if ON, clear input and refocus for next scan
    if (isAutoNextEnabled) {
      setIntakeAwb("");
      setIntakeRecipient("");
      setIntakeDestination("");
      setIntakeStatus("in_transit");
      setIntakeReturnReason("");
      if (intakeInputRef.current) {
        intakeInputRef.current.focus();
      }
    } else {
      if (intakeInputRef.current) {
        intakeInputRef.current.select();
      }
    }
  }, [stagedConsignments, intakeCourier, intakeStatus, intakeDestination, intakeRecipient, intakeReturnReason, isAutoNextEnabled, playChime]);

  // Handle hardware scanner or manual Enter in input
  const handleIntakeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      // If Auto-Next is OFF and this ID was already staged, pressing Enter advances to next scan
      if (!isAutoNextEnabled && recentStagedCode && intakeAwb === recentStagedCode) {
        setIntakeAwb("");
        setRecentStagedCode(null);
        intakeInputRef.current?.focus();
        return;
      }
      handleStageConsignment(intakeAwb);
    }
  };

  // Remove single item from staged review list
  const handleRemoveStagedItem = (id: string) => {
    setStagedConsignments((prev) => prev.filter((item) => item.id !== id));
  };

  // Update courier for a staged item in review list
  const handleUpdateStagedCourier = (id: string, newCourierId: string) => {
    const courierMeta = COURIER_MAP[newCourierId];
    if (!courierMeta) return;
    setStagedConsignments((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, courierId: courierMeta.id, courierName: courierMeta.name } : item
      )
    );
  };

  // Confirm and Ingest all staged shipments into live dashboard
  const handleConfirmIngestStaged = () => {
    if (stagedConsignments.length === 0) return;

    // Filter out items already in live shipments
    const deduplicated = stagedConsignments.filter(
      (s) => !shipments.some((live) => live.trackingNumber === s.trackingNumber)
    );

    if (deduplicated.length === 0) {
      setIntakeError("All staged consignments already exist in your live dashboard.");
      return;
    }

    const nextBatchNum = uniqueBatches.length + 1;
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const newBatchId = `batch-scan-${Date.now()}`;
    const newBatchName = `Batch #${nextBatchNum} • Intake & Scanner`;
    const importedAtStr = `Today, ${timeStr}`;

    const tagged: BulkShipment[] = deduplicated.map((item) => ({
      ...item,
      isImported: true,
      batchId: newBatchId,
      batchName: newBatchName,
      importedAt: importedAtStr,
    }));

    const updated = [...tagged, ...shipments];
    saveShipments(updated);
    playChime(false);

    // Stop camera stream if active
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    }
    setIsCameraActive(false);

    // Reset and close
    setStagedConsignments([]);
    setIntakeAwb("");
    setIsAddConsignmentsModalOpen(false);
  };

  // Toggle Camera Viewfinder
  const handleToggleCamera = () => {
    if (isCameraActive) {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((t) => t.stop());
        cameraStreamRef.current = null;
      }
      setIsCameraActive(false);
      setCameraError(null);
      setCameraScanSuccess(null);
    } else {
      setCameraError(null);
      setCameraScanSuccess(null);
      setIsCameraActive(true);
    }
  };

  // Extract clean AWB / Consignment ID from raw barcode or QR payload (handles URLs, JSON, or plain codes)
  const extractCleanScannedCode = useCallback((rawValue: string): string => {
    const trimmed = rawValue.trim();
    if (!trimmed) return "";

    // If QR contains a URL with tracking parameter or path segment
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
        // Fallback to regex extraction below
      }
    }

    // Check if JSON string
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

    // Standard alphanumeric barcode / QR string
    const cleaned = trimmed.replace(/[^a-zA-Z0-9-_]/g, "").toUpperCase();
    return cleaned.length >= 4 ? cleaned : trimmed.toUpperCase();
  }, []);

  // Real-time Camera Stream + Multi-Engine Barcode & QR Code Decoder Loop
  useEffect(() => {
    if (!isCameraActive) return;

    let isCancelled = false;
    let scanIntervalId: NodeJS.Timeout | null = null;

    // Set up ZXing MultiFormatReader with both 1D Barcodes and 2D QR formats
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

    // Optional Native BarcodeDetector if browser supports it
    let nativeDetector: any = null;
    if (typeof window !== "undefined" && "BarcodeDetector" in window) {
      try {
        const NativeBarcodeDetector = (window as any).BarcodeDetector;
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

    const handleDetectedValue = (rawVal: string) => {
      const code = extractCleanScannedCode(rawVal);
      if (!code || code.length < 4) return;

      const now = Date.now();
      // Prevent duplicate rapid scans of the exact same code within 2.2 seconds
      if (
        lastScannedRef.current.code === code &&
        now - lastScannedRef.current.timestamp < 2200
      ) {
        return;
      }
      lastScannedRef.current = { code, timestamp: now };

      const detectedCarrier = autoDetectCourier(code);
      if (!isAutoNextEnabled) {
        setIntakeAwb(code);
      }
      handleStageConsignment(code, detectedCarrier?.id);

      // Trigger Quick Visual Success Mark inside Camera Viewfinder
      setCameraScanSuccess({
        code,
        carrier: detectedCarrier?.shortName || detectedCarrier?.name || "Auto-Detected",
      });
      if (scanSuccessTimerRef.current) clearTimeout(scanSuccessTimerRef.current);
      scanSuccessTimerRef.current = setTimeout(() => {
        setCameraScanSuccess(null);
      }, 1400);
    };

    const startCameraAndScanner = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setCameraError("Camera access is not supported in this browser.");
          return;
        }

        // Reuse existing stream if already open, otherwise request environment camera
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

        // Continuous frame decoding every 180ms
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

          // 1. Try Native BarcodeDetector first if available
          if (nativeDetector) {
            try {
              const detected = await nativeDetector.detect(canvas);
              if (detected && detected.length > 0 && detected[0].rawValue) {
                handleDetectedValue(detected[0].rawValue);
                return;
              }
            } catch {
              // Fall through to jsQR and ZXing
            }
          }

          // 2. Try jsQR for fast 2D QR code detection (when mode is 'qr' or 'both')
          if (cameraGuideMode !== "barcode") {
            try {
              const imageData = ctx.getImageData(0, 0, w, h);
              const qrResult = jsQR(imageData.data, w, h, {
                inversionAttempts: "attemptBoth",
              });
              if (qrResult && qrResult.data) {
                handleDetectedValue(qrResult.data);
                return;
              }
            } catch {
              // Fall through to ZXing
            }
          }

          // 3. Try ZXing MultiFormatReader (1D Barcodes + 2D QR Codes)
          try {
            const luminanceSource = new HTMLCanvasElementLuminanceSource(canvas);
            const binaryBitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource));
            const result = zxingReader.decodeWithState(binaryBitmap);
            if (result && result.getText()) {
              handleDetectedValue(result.getText());
              return;
            }
          } catch {
            // No code in this frame; continue scanning next frame
          }
        }, 180);
      } catch {
        if (!isCancelled) {
          setCameraError("Camera permission not granted or camera unavailable on this device.");
        }
      }
    };

    startCameraAndScanner();

    return () => {
      isCancelled = true;
      if (scanIntervalId) clearInterval(scanIntervalId);
    };
  }, [isCameraActive, cameraGuideMode, isAutoNextEnabled, extractCleanScannedCode, handleStageConsignment]);

  // Close Add Consignments Modal
  const handleCloseAddConsignmentsModal = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    }
    setIsCameraActive(false);
    setCameraScanSuccess(null);
    setIsAddConsignmentsModalOpen(false);
    setIsIntakeCourierDropdownOpen(false);
    setIsIntakeStatusDropdownOpen(false);
    setIntakeError("");
    setRecentStagedCode(null);
  };

  // Auto-focus input when Add Consignments Modal opens
  useEffect(() => {
    if (isAddConsignmentsModalOpen) {
      const timer = setTimeout(() => {
        intakeInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isAddConsignmentsModalOpen]);

  // File Format Validation & Preview for Excel / CSV / Google Sheet files
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    setUploadSuccessMsg(null);
    setPreviewShipments(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Security Check 1: File Extension Verification (.xlsx, .xls, .csv)
    const fileName = file.name.toLowerCase();
    const isValidExtension =
      fileName.endsWith(".xlsx") || fileName.endsWith(".xls") || fileName.endsWith(".csv");

    // Reject dangerous file formats (executables, scripts, archives)
    const dangerousExtensions = [".exe", ".bat", ".cmd", ".sh", ".vbs", ".js", ".zip", ".tar", ".gz", ".pdf", ".py", ".bin"];
    const isDangerous = dangerousExtensions.some((ext) => fileName.endsWith(ext));

    if (!isValidExtension || isDangerous) {
      setUploadError(
        "Invalid file format: Please upload a Microsoft Excel (.xlsx, .xls), CSV (.csv), or exported Google Sheets file."
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Security Check 2: File Size Limit (Max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File size exceeds 5MB limit. Please upload a spreadsheet under 5MB.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        const workbook = XLSX.read(buffer, { type: "array" });

        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          throw new Error("No worksheets found in this workbook.");
        }

        const worksheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1 });

        if (rows.length < 1) {
          throw new Error("The spreadsheet contains no rows. Please add tracking numbers.");
        }

        // Determine if row 0 is a header row or data row
        const firstRow = (rows[0] || []) as unknown[];
        const headerRow = firstRow.map((h) => String(h || "").toLowerCase().trim());
        const hasHeader = headerRow.some(
          (h) =>
            h.includes("track") ||
            h.includes("awb") ||
            h.includes("consign") ||
            h.includes("number") ||
            h.includes("courier") ||
            h.includes("carrier") ||
            h.includes("recipient")
        );

        let awbColIdx = headerRow.findIndex(
          (h) => h.includes("track") || h.includes("awb") || h.includes("consign") || h.includes("number")
        );
        if (awbColIdx === -1) awbColIdx = 0;

        const courierColIdx = headerRow.findIndex((h) => h.includes("courier") || h.includes("carrier"));
        const recipientColIdx = headerRow.findIndex((h) => h.includes("recipient") || h.includes("customer") || h.includes("name"));
        const destColIdx = headerRow.findIndex((h) => h.includes("dest") || h.includes("city") || h.includes("address"));

        const startIdx = hasHeader ? 1 : 0;
        const parsedItems: BulkShipment[] = [];
        for (let i = startIdx; i < rows.length; i++) {
          const row = rows[i] as unknown[];
          if (!row || row.length === 0) continue;

          const rawAwb = String(row[awbColIdx] || "").trim().toUpperCase();
          if (!rawAwb || rawAwb.length < 4) continue;

          // Deduplicate within this parsed batch
          if (parsedItems.some((s) => s.trackingNumber === rawAwb)) {
            continue;
          }

          const rawCourier = courierColIdx !== -1 ? String(row[courierColIdx] || "").trim().toLowerCase() : "";
          const detected = (rawCourier && COURIER_MAP[rawCourier]) ? COURIER_MAP[rawCourier] : autoDetectCourier(rawAwb) || COURIER_LIST[0];
          const rawRecipient = recipientColIdx !== -1 ? String(row[recipientColIdx] || "").trim() : "";
          const rawDest = destColIdx !== -1 ? String(row[destColIdx] || "").trim() : "";

          const isReturnedSim = rawAwb.includes("RT") || rawAwb.includes("RETURN");
          const isDeliveredSim = rawAwb.endsWith("IN") && !isReturnedSim;

          parsedItems.push({
            id: `bulk-excel-${Date.now()}-${i}`,
            trackingNumber: rawAwb,
            courierId: detected.id,
            courierName: detected.name,
            status: isReturnedSim ? "returned" : isDeliveredSim ? "delivered" : "in_transit",
            statusText: isReturnedSim
              ? "Returned to Origin Hub (RTO)"
              : isDeliveredSim
              ? "Delivered to Recipient"
              : "Active In-Transit Scan",
            origin: "Origin Logistics Facility",
            destination: rawDest || "Destination Center",
            articleType: "Bulk Import",
            weight: "320 g",
            lastUpdated: "Staged for Review",
            lastLocation: isReturnedSim ? "Return Hub" : "Regional Sort Facility",
            recipientName: rawRecipient || "Recipient",
            returnReason: isReturnedSim ? "Customer Refused Delivery" : undefined,
            isImported: true,
          });
        }

        if (parsedItems.length === 0) {
          throw new Error("No valid tracking numbers were found in this file.");
        }

        // SHOW REVIEW BEFORE IMPORT (DO NOT IMPORT DIRECTLY)
        const cleanFile = file.name.replace(/\.(xlsx|xls|csv)$/i, "");
        setPreviewFileName(file.name);
        setPreviewBatchName(`Batch #${uniqueBatches.length + 1} • ${cleanFile || "Bulk Import"}`);
        setPreviewShipments(parsedItems);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } catch (err: unknown) {
        setUploadError((err as Error)?.message || "Failed to parse spreadsheet. Please verify the file integrity.");
      } finally {
        setIsUploading(false);
      }
    };

    reader.onerror = () => {
      setUploadError("Could not read the uploaded file. Please verify it is a valid spreadsheet.");
      setIsUploading(false);
    };

    reader.readAsArrayBuffer(file);
  };

  // Parse bulk pasted AWB numbers into the Review Before Import screen
  const handleParseBulkPasteForReview = () => {
    setUploadError(null);
    setUploadSuccessMsg(null);
    const rawTokens = bulkPasteText
      .split(/[\n,;|\t]+/)
      .map((t) => t.trim().toUpperCase())
      .filter((t) => t.length >= 4);

    if (rawTokens.length === 0) {
      setUploadError("Please enter or paste at least one valid Consignment / AWB number (min 4 characters).");
      return;
    }

    const uniqueTokens = Array.from(new Set(rawTokens));
    const parsedItems: BulkShipment[] = uniqueTokens.map((rawAwb, idx) => {
      const detected = autoDetectCourier(rawAwb) || COURIER_LIST[0];
      const isReturnedSim = rawAwb.includes("RT") || rawAwb.includes("RETURN");
      const isDeliveredSim = rawAwb.endsWith("IN") && !isReturnedSim;

      return {
        id: `bulk-paste-${Date.now()}-${idx}`,
        trackingNumber: rawAwb,
        courierId: detected.id,
        courierName: detected.name,
        status: isReturnedSim ? "returned" : isDeliveredSim ? "delivered" : "in_transit",
        statusText: isReturnedSim
          ? "Returned to Origin Hub (RTO)"
          : isDeliveredSim
          ? "Delivered to Recipient"
          : "Active In-Transit Scan",
        origin: "Origin Logistics Facility",
        destination: "Destination Center",
        articleType: "Bulk Paste",
        weight: "250 g",
        lastUpdated: "Staged for Review",
        lastLocation: isReturnedSim ? "Return Hub" : "Regional Sort Facility",
        recipientName: "Recipient",
        returnReason: isReturnedSim ? "Delivery Attempt Failed" : undefined,
        isImported: true,
      };
    });

    setPreviewFileName("Pasted Consignment List");
    setPreviewBatchName(`Batch #${uniqueBatches.length + 1} • Bulk List`);
    setPreviewShipments(parsedItems);
  };

  // Modify or remove individual items during Bulk Import Review
  const handleUpdatePreviewCourier = (id: string, newCourierId: string) => {
    const courierMeta = COURIER_MAP[newCourierId];
    if (!courierMeta || !previewShipments) return;
    setPreviewShipments(
      previewShipments.map((item) =>
        item.id === id ? { ...item, courierId: courierMeta.id, courierName: courierMeta.name } : item
      )
    );
  };

  const handleUpdatePreviewStatus = (
    id: string,
    newStatus: "in_transit" | "out_for_delivery" | "delivered" | "returned"
  ) => {
    if (!previewShipments) return;
    setPreviewShipments(
      previewShipments.map((item) =>
        item.id === id
          ? {
              ...item,
              status: newStatus,
              statusText:
                newStatus === "delivered"
                  ? "Delivered to Recipient"
                  : newStatus === "out_for_delivery"
                  ? "Out for Delivery Today"
                  : newStatus === "returned"
                  ? "Returned to Origin Hub (RTO)"
                  : "Active In-Transit Scan",
            }
          : item
      )
    );
  };

  const handleRemovePreviewItem = (id: string) => {
    if (!previewShipments) return;
    const next = previewShipments.filter((item) => item.id !== id);
    if (next.length === 0) {
      setPreviewShipments(null);
    } else {
      setPreviewShipments(next);
    }
  };

  // Compute unique import batches
  const batchMap = new Map<
    string,
    {
      id: string;
      name: string;
      importedAt: string;
      count: number;
      delivered: number;
      inTransit: number;
      returned: number;
    }
  >();

  shipments.forEach((s) => {
    if (s.isImported && s.batchId) {
      const existing = batchMap.get(s.batchId);
      if (existing) {
        existing.count++;
        if (s.status === "delivered") existing.delivered++;
        else if (s.status === "returned") existing.returned++;
        else existing.inTransit++;
      } else {
        batchMap.set(s.batchId, {
          id: s.batchId,
          name: s.batchName || `Batch ${s.batchId}`,
          importedAt: s.importedAt || "Imported Batch",
          count: 1,
          delivered: s.status === "delivered" ? 1 : 0,
          inTransit: s.status !== "delivered" && s.status !== "returned" ? 1 : 0,
          returned: s.status === "returned" ? 1 : 0,
        });
      }
    }
  });

  const uniqueBatches = Array.from(batchMap.values());

  // User confirms importing the reviewed shipments
  const handleConfirmImport = () => {
    if (!previewShipments || previewShipments.length === 0) return;

    // Filter out items already in shipments
    const newItems = previewShipments.filter(
      (p) => !shipments.some((s) => s.trackingNumber === p.trackingNumber)
    );

    if (newItems.length === 0) {
      setUploadError("All reviewed tracking numbers already exist in your live dashboard.");
      return;
    }

    const nextBatchNum = uniqueBatches.length + 1;
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const cleanFileName = previewFileName.replace(/\.(xlsx|xls|csv)$/i, "");
    const newBatchId = `batch-${Date.now()}`;
    const finalBatchName =
      previewBatchName.trim() || `Batch #${nextBatchNum} • ${cleanFileName || "Bulk Import"}`;
    const importedAtStr = `Today, ${timeStr}`;

    const taggedItems: BulkShipment[] = newItems.map((item) => ({
      ...item,
      lastUpdated: "Just Imported",
      isImported: true,
      batchId: newBatchId,
      batchName: finalBatchName,
      importedAt: importedAtStr,
    }));

    const updated = [...taggedItems, ...shipments];
    saveShipments(updated);
    playChime(false);

    // Show Successfully imported status and batch info in modal
    setImportSuccessState({
      count: taggedItems.length,
      batchName: finalBatchName,
      batchId: newBatchId,
    });
    setUploadError(null);
    setUploadSuccessMsg(null);
    setBulkPasteText("");

    // After Click confirm show Successfully imported and if there is no issue close Bulk Import popup automatically
    if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    autoCloseTimerRef.current = setTimeout(() => {
      setIsUploadModalOpen(false);
      setPreviewShipments(null);
      setImportSuccessState(null);
      setStatusFilter("imported");
      setSelectedBatchId(newBatchId); // View this specific batch
    }, 1400);
  };

  // User cancels preview and wants to pick another file
  const handleCancelPreview = () => {
    setPreviewShipments(null);
    setPreviewBatchName("");
    setUploadError(null);
    setUploadSuccessMsg(null);
    setImportSuccessState(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // User closes modal manually
  const handleCloseUploadModal = () => {
    if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    setIsUploadModalOpen(false);
    setPreviewShipments(null);
    setPreviewBatchName("");
    setBulkPasteText("");
    setImportSuccessState(null);
    setUploadError(null);
    setUploadSuccessMsg(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Delete an entire batch
  const handleDeleteBatch = (batchId: string) => {
    const updated = shipments.filter((s) => s.batchId !== batchId);
    saveShipments(updated);
    if (selectedBatchId === batchId) {
      setSelectedBatchId("all");
    }
    setBatchPendingDeleteId(null);
    playChime(false);
  };

  // Batch name inline editing
  const handleStartEditBatch = (batchId: string, currentName: string) => {
    setEditingBatchId(batchId);
    setEditingBatchName(currentName);
  };

  const handleSaveBatchName = (batchId: string) => {
    const trimmed = editingBatchName.trim();
    if (!trimmed) {
      setEditingBatchId(null);
      return;
    }
    const updated = shipments.map((s) => {
      if (s.batchId === batchId) {
        return { ...s, batchName: trimmed };
      }
      return s;
    });
    saveShipments(updated);
    setEditingBatchId(null);
    setEditingBatchName("");
    playChime(false);
  };

  const handleCancelEditBatch = () => {
    setEditingBatchId(null);
    setEditingBatchName("");
  };

  // Full Data Backup Export (.json)
  const handleExportBackup = () => {
    try {
      const backupPayload = {
        version: "1.0",
        app: "TrackFlow Logistics",
        exportedAt: new Date().toISOString(),
        totalShipments: shipments.length,
        totalBatches: uniqueBatches.length,
        shipments,
      };
      const blob = new Blob([JSON.stringify(backupPayload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const dateStr = new Date().toISOString().split("T")[0];
      a.href = url;
      a.download = `TrackFlow_Data_Backup_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      playChime(false);
      setBackupSuccessMsg(`Backup exported successfully! File downloaded.`);
    } catch (e) {
      console.error("Backup export failed:", e);
      setBackupError("Failed to generate backup JSON file.");
    }
  };

  // Import Backup File for Review in Separate View
  const handleBackupFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBackupError(null);
    setBackupSuccessMsg(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        const rawList = Array.isArray(parsed.shipments)
          ? parsed.shipments
          : Array.isArray(parsed)
          ? parsed
          : null;

        if (!rawList || rawList.length === 0) {
          throw new Error("No consignment records found in this backup file.");
        }

        const validItems: BulkShipment[] = rawList
          .filter((item: Record<string, unknown>) => item && item.trackingNumber)
          .map((item: Record<string, unknown>, idx: number) => ({
            id: String(item.id || `backup-${Date.now()}-${idx}`),
            trackingNumber: String(item.trackingNumber || "").trim().toUpperCase(),
            courierId: String(item.courierId || "speedpost"),
            courierName: String(item.courierName || "India Post Speed Post"),
            status: (item.status as BulkShipment["status"]) || "in_transit",
            statusText: String(item.statusText || "Active Consignment"),
            origin: String(item.origin || "Origin Facility"),
            destination: String(item.destination || "Destination Hub"),
            articleType: String(item.articleType || "Parcel"),
            weight: String(item.weight || "100 g"),
            lastUpdated: String(item.lastUpdated || "From Backup"),
            lastLocation: String(item.lastLocation || "Hub"),
            returnReason: item.returnReason ? String(item.returnReason) : undefined,
            recipientName: item.recipientName ? String(item.recipientName) : undefined,
            isImported: item.isImported !== undefined ? Boolean(item.isImported) : true,
            batchId: item.batchId ? String(item.batchId) : undefined,
            batchName: item.batchName ? String(item.batchName) : undefined,
            importedAt: item.importedAt ? String(item.importedAt) : undefined,
          }));

        if (validItems.length === 0) {
          throw new Error("No valid tracking numbers found in this backup file.");
        }

        setBackupReviewData({
          fileName: file.name,
          backupDate: parsed.exportedAt ? new Date(parsed.exportedAt).toLocaleString() : "Earlier Backup",
          shipments: validItems,
        });
        if (backupFileInputRef.current) backupFileInputRef.current.value = "";
      } catch (err: unknown) {
        setBackupError((err as Error)?.message || "Failed to parse backup JSON file. Ensure it is a valid TrackFlow backup.");
      }
    };

    reader.onerror = () => {
      setBackupError("Could not read backup file. Please try again.");
    };

    reader.readAsText(file);
  };

  // Merge non-duplicate backup consignments into live data
  const handleMergeBackupIntoLive = () => {
    if (!backupReviewData) return;
    const newItems = backupReviewData.shipments.filter(
      (b) => !shipments.some((s) => s.trackingNumber === b.trackingNumber)
    );
    if (newItems.length === 0) {
      setBackupError("All consignments in this backup already exist in your live dashboard.");
      return;
    }
    const merged = [...newItems, ...shipments];
    saveShipments(merged);
    playChime(false);
    setBackupSuccessMsg(`Successfully merged ${newItems.length} consignments from backup into live dashboard!`);
    setIsReviewingSeparately(false);
  };

  // Restore & Overwrite Live Data with Backup Data
  const handleRestoreBackupOverwrite = () => {
    if (!backupReviewData) return;
    saveShipments(backupReviewData.shipments);
    playChime(false);
    setBackupSuccessMsg(`Restored ${backupReviewData.shipments.length} shipments from backup!`);
    setIsReviewingSeparately(false);
  };

  // Generate & Download Verified Sample Excel Template (.xlsx)
  const handleDownloadSampleTemplate = () => {
    try {
      const templateData = [
        ["Tracking_Number", "Courier_Code", "Recipient_Name", "Destination_City", "Weight_or_Type", "Notes"],
        ["EL855948618IN", "speedpost", "Dr. Rajesh Kumar", "Thrissur, Kerala", "45 g", "Standard Speed Post Document"],
        ["B4000211866", "dtdc", "Ananya Sharma", "Bangalore, Karnataka", "1.2 kg", "Express Cargo Electronics"],
        ["FMPP4397267510", "ekart", "Vikram Patel", "Ahmedabad, Gujarat", "500 g", "E-Commerce Apparel"],
        ["12345678901", "bluedart", "Pooja Verma", "Mumbai, Maharashtra", "200 g", "Priority Air Envelope"],
        ["RT855948618IN", "speedpost", "K. Ramanathan", "Chennai, Tamil Nadu", "110 g", "Sample Returned / RTO Parcel"],
      ];

      const ws = XLSX.utils.aoa_to_sheet(templateData);

      // Set column widths for readability
      ws["!cols"] = [
        { wch: 18 }, // Tracking_Number
        { wch: 14 }, // Courier_Code
        { wch: 20 }, // Recipient_Name
        { wch: 22 }, // Destination_City
        { wch: 16 }, // Weight_or_Type
        { wch: 30 }, // Notes
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "TrackFlow_Template");

      XLSX.writeFile(wb, "TrackFlow_Bulk_Shipments_Template.xlsx");
    } catch (e) {
      console.error("Failed to generate sample Excel workbook:", e);
    }
  };

  // Toggle selection for all visible filtered shipments
  const handleToggleSelectAll = () => {
    if (selectedShipmentIds.length === filteredShipments.length && filteredShipments.length > 0) {
      setSelectedShipmentIds([]);
    } else {
      setSelectedShipmentIds(filteredShipments.map((s) => s.id));
    }
  };

  // Toggle selection for a single shipment
  const handleToggleSelectRow = (id: string) => {
    setSelectedShipmentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Confirm multiple delete to prevent accidental deletion
  const handleConfirmBulkDelete = () => {
    if (selectedShipmentIds.length === 0) return;
    const updated = shipments.filter((s) => !selectedShipmentIds.includes(s.id));
    saveShipments(updated);
    setSelectedShipmentIds([]);
    setIsBulkDeleteModalOpen(false);
    playChime(false);
  };

  // Export Delivered Data Only (.xlsx)
  const handleExportDeliveredOnly = () => {
    const deliveredShipments = shipments.filter((s) => s.status === "delivered");
    if (deliveredShipments.length === 0) {
      setExportDeliveredSuccessMsg("No delivered consignments available to export right now.");
      setTimeout(() => setExportDeliveredSuccessMsg(null), 5000);
      return;
    }

    const rows = deliveredShipments.map((s) => ({
      "Tracking Number / AWB": s.trackingNumber,
      "Courier Network": s.courierName,
      "Status": "Delivered",
      "Status Text": s.statusText,
      "Origin": s.origin,
      "Destination": s.destination,
      "Article Type": s.articleType,
      "Recipient Name": s.recipientName || "N/A",
      "Last Updated": s.lastUpdated,
      "Batch Name": s.batchName || "Standard",
      "Exported At": new Date().toLocaleString(),
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Delivered Consignments");
    const dateStr = new Date().toISOString().split("T")[0];
    XLSX.writeFile(workbook, `TrackFlow_Delivered_${dateStr}.xlsx`);

    const exportedIds = deliveredShipments.map((s) => s.id);
    setLastExportedDeliveredIds(exportedIds);
    setExportDeliveredSuccessMsg(`Exported ${deliveredShipments.length} delivered consignments.`);
    playChime(true);
    setTimeout(() => setExportDeliveredSuccessMsg(null), 8000);
  };

  // Quick Delete Exported Delivered Data Only
  const handleQuickDeleteExportedDelivered = () => {
    if (lastExportedDeliveredIds.length === 0) return;
    const updated = shipments.filter((s) => !lastExportedDeliveredIds.includes(s.id));
    saveShipments(updated);
    setLastExportedDeliveredIds([]);
    setIsDeleteExportedModalOpen(false);
    setExportDeliveredSuccessMsg(null);
    playChime(false);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Active dataset: either live shipments or backup review dataset when reviewing in separate mode
  const activeShipments = isReviewingSeparately && backupReviewData ? backupReviewData.shipments : shipments;

  // Filtered shipments
  const filteredShipments = activeShipments.filter((item) => {
    const matchesSearch =
      item.trackingNumber.toLowerCase().includes(searchFilter.toLowerCase()) ||
      item.courierName.toLowerCase().includes(searchFilter.toLowerCase()) ||
      item.destination.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (item.recipientName && item.recipientName.toLowerCase().includes(searchFilter.toLowerCase())) ||
      (item.batchName && item.batchName.toLowerCase().includes(searchFilter.toLowerCase()));

    if (!matchesSearch) return false;

    // Batch-wise filter
    if (selectedBatchId !== "all") {
      if (item.batchId !== selectedBatchId) return false;
    }

    if (statusFilter === "delivered") return item.status === "delivered";
    if (statusFilter === "out_for_delivery") return item.status === "out_for_delivery";
    if (statusFilter === "in_transit") return item.status === "in_transit";
    if (statusFilter === "returned") return item.status === "returned";
    if (statusFilter === "imported") return !!item.isImported;
    return true;
  });

  // Calculate statistics from activeShipments
  const totalCount = activeShipments.length;
  const deliveredCount = activeShipments.filter((s) => s.status === "delivered").length;
  const outCount = activeShipments.filter((s) => s.status === "out_for_delivery").length;
  const inTransitCount = activeShipments.filter((s) => s.status === "in_transit").length;
  const returnedCount = activeShipments.filter((s) => s.status === "returned").length;
  const importedCount = activeShipments.filter((s) => s.isImported).length;

  return (
    /* Dashboard Page Container with comfortable side margin gaps */
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 xl:px-10 py-8 space-y-6">
      {/* SEPARATE BACKUP REVIEW MODE BANNER */}
      {isReviewingSeparately && backupReviewData && (
        <div className="rounded-3xl border-2 border-indigo-500 bg-indigo-50/90 dark:border-indigo-600 dark:bg-indigo-950/80 p-4 sm:p-5 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-xs">
              <Database className="h-5 w-5" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-indigo-600 px-2 py-0.5 text-[10px] font-black uppercase text-white tracking-wider">
                  Separate Review Mode Active
                </span>
                <span className="text-xs font-bold text-slate-900 dark:text-white font-mono">
                  {backupReviewData.fileName}
                </span>
              </div>
              <p className="text-xs text-indigo-950/80 dark:text-indigo-200/90 mt-1">
                Viewing isolated backup snapshot with {backupReviewData.shipments.length} consignments (Exported: {backupReviewData.backupDate}). Live operational data is safe and unchanged.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button
              type="button"
              onClick={handleMergeBackupIntoLive}
              className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer"
              title="Add non-duplicate records from this backup to your live dashboard"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Merge into Live</span>
            </button>
            <button
              type="button"
              onClick={handleRestoreBackupOverwrite}
              className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:border-rose-800 dark:bg-rose-950/70 dark:text-rose-300 px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer"
              title="Overwrite live consignments with this backup"
            >
              <span>Replace Live</span>
            </button>
            <button
              type="button"
              onClick={() => setIsReviewingSeparately(false)}
              className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
              <span>Exit Review</span>
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 1. TOP HEADER CONTROLS                                         */}
      {/* ============================================================== */}
      <div className="rounded-3xl border border-slate-200/90 bg-white/95 p-5 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900/90 backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Dashboard Title & Live Badge */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Enterprise Logistics Hub
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Bulk Tracking & Shipment Operations
            </h1>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Multi-carrier fleet monitoring, automatic SLA sync, hardware barcode scanning, and Excel ingestion.
            </p>
          </div>

          {/* Action Buttons: Unified Add Consignments & Bulk Import */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Unified All-in-One Add Consignments (Manual, Hardware Barcode, Camera QR/Barcode) */}
            <button
              type="button"
              onClick={() => {
                setIntakeError("");
                setIntakeAwb("");
                setRecentStagedCode(null);
                setIsAddConsignmentsModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:border-indigo-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 shadow-2xs transition-all cursor-pointer"
              title="Add consignments manually, with barcode scanning devices, or via camera QR / barcode scanning"
            >
              <Plus className="h-4 w-4 text-indigo-600 dark:text-indigo-400 stroke-[2.4]" />
              <span>Add Consignments</span>
            </button>

            {/* Bulk Import */}
            <button
              type="button"
              onClick={() => {
                if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
                setUploadError(null);
                setUploadSuccessMsg(null);
                setPreviewShipments(null);
                setImportSuccessState(null);
                setIsUploadModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 text-xs font-extrabold text-white shadow-xs transition-all cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4 stroke-[2.4]" />
              <span>Bulk Import</span>
            </button>
          </div>
        </div>

        {/* Delivered Notification Banner */}
        {deliveredNotification && (
          <div className="mt-4 rounded-2xl border border-emerald-300 bg-emerald-50/90 dark:border-emerald-800 dark:bg-emerald-950/80 p-4 shadow-sm flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-xs shrink-0">
                <CheckCircle2 className="h-5 w-5 stroke-[2.4]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                    Shipment Delivered Notification
                  </span>
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                    • {deliveredNotification.timestamp}
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                  {deliveredNotification.count === 1
                    ? `Consignment #${deliveredNotification.items[0].trackingNumber} (${deliveredNotification.items[0].courierName}) was successfully delivered at ${deliveredNotification.items[0].destination}!`
                    : `${deliveredNotification.count} Consignments were successfully delivered to addressees!`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("delivered");
                  setDeliveredNotification(null);
                }}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-bold shadow-xs cursor-pointer transition-colors"
              >
                View in Delivered
              </button>
              <button
                type="button"
                onClick={() => setDeliveredNotification(null)}
                className="rounded-lg p-1.5 text-emerald-700 hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-emerald-900 cursor-pointer"
                title="Dismiss notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* FRONT STATUS BAR: ONLY SHOW NEXT CHECK TIMER & SETTINGS GEAR   */}
        {/* ============================================================== */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          {/* Front Next Check Timer Card */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-2xs">
              <div className="relative flex h-3 w-3 shrink-0">
                {isAutoCheckEnabled ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                  </>
                ) : (
                  <span className="inline-flex rounded-full h-3 w-3 bg-slate-400" />
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {isAutoCheckEnabled ? "Next check in:" : "Auto-check:"}
                </span>
                <span className="font-mono text-sm font-black text-slate-900 dark:text-white tabular-nums">
                  {isAutoCheckEnabled ? formatTimer(secondsRemaining) : "Paused"}
                </span>
              </div>

              {/* Instant Manual Check Now Button */}
              <button
                type="button"
                onClick={handleRunAutoCheck}
                disabled={isRefreshing}
                className="ml-2 flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-[11px] font-bold text-slate-700 hover:text-indigo-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:text-indigo-300 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                title="Trigger immediate sync check"
              >
                <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin text-indigo-600" : ""}`} />
                <span className="hidden sm:inline">Check Now</span>
              </button>
            </div>

            {/* Quick Resume button if paused */}
            {!isAutoCheckEnabled && (
              <button
                type="button"
                onClick={handleToggleAutoCheck}
                className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 transition-colors cursor-pointer"
              >
                <Play className="h-3 w-3 fill-current" />
                <span>Resume</span>
              </button>
            )}
          </div>

          {/* Settings Trigger: opens settings modal where frequency (5m, 10m, 15m, 30m, 1hr, custom) lives */}
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:border-indigo-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 shadow-2xs transition-all cursor-pointer"
            title="Configure auto-check frequency and intervals"
          >
            <Settings className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            <span>Settings</span>
            <span className="text-[11px] font-mono font-medium text-slate-400">
              ({Math.round(checkIntervalSec / 60)}m freq)
            </span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. SUMMARY METRICS CARDS (INCLUDING RETURNED / RTO)           */}
      {/* ============================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Total Shipments */}
        <div
          onClick={() => setStatusFilter("all")}
          className={`rounded-2xl border p-4 transition-all cursor-pointer ${
            statusFilter === "all"
              ? "border-indigo-500 bg-indigo-50/60 shadow-xs dark:border-indigo-600 dark:bg-indigo-950/40"
              : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-bold">Total Tracked</span>
            <Package className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white tabular-nums">
            {totalCount}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">All consignments</div>
        </div>

        {/* Delivered */}
        <div
          onClick={() => setStatusFilter("delivered")}
          className={`rounded-2xl border p-4 transition-all cursor-pointer ${
            statusFilter === "delivered"
              ? "border-emerald-500 bg-emerald-50/60 shadow-xs dark:border-emerald-600 dark:bg-emerald-950/40"
              : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-bold">
            <span>Delivered</span>
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
            {deliveredCount}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {totalCount > 0 ? `${Math.round((deliveredCount / totalCount) * 100)}% completed` : "0%"}
          </div>
        </div>

        {/* Out for Delivery */}
        <div
          onClick={() => setStatusFilter("out_for_delivery")}
          className={`rounded-2xl border p-4 transition-all cursor-pointer ${
            statusFilter === "out_for_delivery"
              ? "border-amber-500 bg-amber-50/60 shadow-xs dark:border-amber-600 dark:bg-amber-950/40"
              : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-amber-600 dark:text-amber-400 font-bold">
            <span>Out for Delivery</span>
            <Truck className="h-4 w-4" />
          </div>
          <div className="mt-2 text-2xl font-black text-amber-600 dark:text-amber-400 tabular-nums">
            {outCount}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Courier rider dispatched</div>
        </div>

        {/* In Transit */}
        <div
          onClick={() => setStatusFilter("in_transit")}
          className={`rounded-2xl border p-4 transition-all cursor-pointer ${
            statusFilter === "in_transit"
              ? "border-sky-500 bg-sky-50/60 shadow-xs dark:border-sky-600 dark:bg-sky-950/40"
              : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-sky-600 dark:text-sky-400 font-bold">
            <span>In Transit</span>
            <Clock className="h-4 w-4" />
          </div>
          <div className="mt-2 text-2xl font-black text-sky-600 dark:text-sky-400 tabular-nums">
            {inTransitCount}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Between sort hubs</div>
        </div>

        {/* RETURNED / RTO SUPPORT: How to see if returned */}
        <div
          onClick={() => setStatusFilter("returned")}
          className={`rounded-2xl border p-4 transition-all cursor-pointer ${
            statusFilter === "returned"
              ? "border-rose-500 bg-rose-50/60 shadow-xs dark:border-rose-600 dark:bg-rose-950/40"
              : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-rose-600 dark:text-rose-400 font-bold">
            <span>Returned (RTO)</span>
            <RotateCcw className="h-4 w-4" />
          </div>
          <div className="mt-2 text-2xl font-black text-rose-600 dark:text-rose-400 tabular-nums">
            {returnedCount}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Returned to origin shipper</div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. REFINED NON-SCROLLABLE FILTER HUB & MULTI-BATCH MANAGER     */}
      {/* ============================================================== */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
        {/* Top Row: Search Bar + Quick Batch Selector Dropdown + Manage Batches Toggle */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search AWB, Courier, Recipient, Batch, or City..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 pl-10 pr-9 py-2.5 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800/60 dark:text-white dark:focus:bg-slate-900 transition-colors"
            />
            {searchFilter && (
              <button
                type="button"
                onClick={() => setSearchFilter("")}
                className="absolute right-3 top-2.5 rounded-lg p-0.5 text-slate-400 hover:bg-slate-200/70 hover:text-slate-600 dark:hover:bg-slate-700"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Batch Filter Controls (Dropdown + Manage Batches Drawer Trigger) */}
          {uniqueBatches.length > 0 && (
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
              <div className="relative flex-1 sm:flex-initial min-w-[200px]">
                <select
                  value={selectedBatchId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedBatchId(val);
                    if (val !== "all" && statusFilter !== "imported") {
                      // Keep status filter flexible so user can view all or specific status within batch
                    }
                  }}
                  aria-label="Filter by Batch"
                  className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50/90 pl-3.5 pr-9 py-2.5 text-xs font-bold text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  <option value="all">All Batches ({importedCount} imported)</option>
                  {uniqueBatches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.count})
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" />
              </div>

              <button
                type="button"
                onClick={() => setIsBatchManagerOpen((prev) => !prev)}
                className={`inline-flex items-center justify-center gap-1.5 rounded-2xl border px-3.5 py-2.5 text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  isBatchManagerOpen || selectedBatchId !== "all" || statusFilter === "imported"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 shadow-2xs"
                    : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                }`}
                title="View, rename, or delete imported batches"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Manage Batches ({uniqueBatches.length})</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${
                    isBatchManagerOpen || selectedBatchId !== "all" || statusFilter === "imported" ? "rotate-180" : ""
                  }`}
                />
              </button>
            </div>
          )}
        </div>

        {/* Non-Scrollable Responsive Status Filter Grid (Order: All, Delivered, Out for Delivery, In Transit, Returned (RTO), Imported) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <button
            type="button"
            onClick={() => {
              setStatusFilter("all");
              setSelectedBatchId("all");
            }}
            className={`flex items-center justify-between rounded-2xl border px-3.5 py-2.5 text-xs font-bold transition-all cursor-pointer ${
              statusFilter === "all"
                ? "border-indigo-600 bg-indigo-600 text-white shadow-xs dark:border-indigo-500 dark:bg-indigo-600"
                : "border-slate-200/90 bg-slate-50/70 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            <span className="truncate">All</span>
            <span
              className={`ml-1.5 rounded-lg px-2 py-0.5 font-mono text-[11px] font-black tabular-nums ${
                statusFilter === "all"
                  ? "bg-white/20 text-white"
                  : "bg-slate-200/80 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
              }`}
            >
              {totalCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("delivered")}
            className={`flex items-center justify-between rounded-2xl border px-3.5 py-2.5 text-xs font-bold transition-all cursor-pointer ${
              statusFilter === "delivered"
                ? "border-emerald-600 bg-emerald-600 text-white shadow-xs dark:border-emerald-500 dark:bg-emerald-600"
                : "border-slate-200/90 bg-slate-50/70 text-slate-700 hover:bg-emerald-50/60 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            <span className="truncate">Delivered</span>
            <span
              className={`ml-1.5 rounded-lg px-2 py-0.5 font-mono text-[11px] font-black tabular-nums ${
                statusFilter === "delivered"
                  ? "bg-white/20 text-white"
                  : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300"
              }`}
            >
              {deliveredCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("out_for_delivery")}
            className={`flex items-center justify-between rounded-2xl border px-3.5 py-2.5 text-xs font-bold transition-all cursor-pointer ${
              statusFilter === "out_for_delivery"
                ? "border-amber-500 bg-amber-500 text-white shadow-xs dark:border-amber-500 dark:bg-amber-500"
                : "border-slate-200/90 bg-slate-50/70 text-slate-700 hover:bg-amber-50/60 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            <span className="truncate">Out for Delivery</span>
            <span
              className={`ml-1.5 rounded-lg px-2 py-0.5 font-mono text-[11px] font-black tabular-nums ${
                statusFilter === "out_for_delivery"
                  ? "bg-white/20 text-white"
                  : "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300"
              }`}
            >
              {outCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("in_transit")}
            className={`flex items-center justify-between rounded-2xl border px-3.5 py-2.5 text-xs font-bold transition-all cursor-pointer ${
              statusFilter === "in_transit"
                ? "border-sky-600 bg-sky-600 text-white shadow-xs dark:border-sky-500 dark:bg-sky-600"
                : "border-slate-200/90 bg-slate-50/70 text-slate-700 hover:bg-sky-50/60 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            <span className="truncate">In Transit</span>
            <span
              className={`ml-1.5 rounded-lg px-2 py-0.5 font-mono text-[11px] font-black tabular-nums ${
                statusFilter === "in_transit"
                  ? "bg-white/20 text-white"
                  : "bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300"
              }`}
            >
              {inTransitCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("returned")}
            className={`flex items-center justify-between rounded-2xl border px-3.5 py-2.5 text-xs font-bold transition-all cursor-pointer ${
              statusFilter === "returned"
                ? "border-rose-600 bg-rose-600 text-white shadow-xs dark:border-rose-500 dark:bg-rose-600"
                : "border-slate-200/90 bg-slate-50/70 text-slate-700 hover:bg-rose-50/60 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            <span className="truncate">Returned (RTO)</span>
            <span
              className={`ml-1.5 rounded-lg px-2 py-0.5 font-mono text-[11px] font-black tabular-nums ${
                statusFilter === "returned"
                  ? "bg-white/20 text-white"
                  : "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300"
              }`}
            >
              {returnedCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("imported")}
            className={`flex items-center justify-between rounded-2xl border px-3.5 py-2.5 text-xs font-bold transition-all cursor-pointer ${
              statusFilter === "imported"
                ? "border-emerald-700 bg-emerald-700 text-white shadow-xs dark:border-emerald-600 dark:bg-emerald-700"
                : "border-slate-200/90 bg-slate-50/70 text-slate-700 hover:bg-emerald-50/60 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            <span className="inline-flex items-center gap-1.5 truncate">
              <FileSpreadsheet className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Imported</span>
            </span>
            <span
              className={`ml-1.5 rounded-lg px-2 py-0.5 font-mono text-[11px] font-black tabular-nums ${
                statusFilter === "imported"
                  ? "bg-white/20 text-white"
                  : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300"
              }`}
            >
              {importedCount}
            </span>
          </button>
        </div>

        {/* ============================================================== */}
        {/* 3B. MULTI-BATCH DIRECTORY & INLINE MANAGER (EDIT & DELETE)     */}
        {/* ============================================================== */}
        {(isBatchManagerOpen || statusFilter === "imported" || selectedBatchId !== "all") && uniqueBatches.length > 0 && (
          <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 space-y-3 animate-in fade-in">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-600 text-white">
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                </span>
                <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                  Batch Directory & Management ({uniqueBatches.length})
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline">
                  — Click any batch to filter, or use the edit and delete icons on each card
                </span>
              </div>

              <div className="flex items-center gap-2">
                {selectedBatchId !== "all" && (
                  <button
                    type="button"
                    onClick={() => setSelectedBatchId("all")}
                    className="rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-3 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                  >
                    Show All Batches ({importedCount})
                  </button>
                )}
                {isBatchManagerOpen && statusFilter !== "imported" && selectedBatchId === "all" && (
                  <button
                    type="button"
                    onClick={() => setIsBatchManagerOpen(false)}
                    className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 cursor-pointer"
                    title="Collapse batch manager"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Responsive Multi-Batch Cards Grid (No horizontal scrolling) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-80 overflow-y-auto pr-1">
              {uniqueBatches.map((batch) => {
                const isSelected = selectedBatchId === batch.id;
                const isEditing = editingBatchId === batch.id;
                const isPendingDelete = batchPendingDeleteId === batch.id;

                return (
                  <div
                    key={batch.id}
                    className={`rounded-2xl border p-3.5 transition-all flex flex-col justify-between gap-2.5 ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-50/70 dark:border-emerald-500/80 dark:bg-emerald-950/40 shadow-xs"
                        : "border-slate-200/90 bg-slate-50/60 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      {isEditing ? (
                        <div className="flex items-center gap-1.5 flex-1 bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-xl border border-emerald-500 shadow-2xs">
                          <input
                            type="text"
                            value={editingBatchName}
                            onChange={(e) => setEditingBatchName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveBatchName(batch.id);
                              if (e.key === "Escape") handleCancelEditBatch();
                            }}
                            autoFocus
                            className="text-xs font-bold text-slate-900 dark:text-white bg-transparent outline-none flex-1 min-w-0"
                            placeholder="Enter batch name..."
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveBatchName(batch.id)}
                            className="p-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors cursor-pointer shrink-0"
                            title="Save batch name"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEditBatch}
                            className="p-1 rounded-lg bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300 hover:bg-slate-300 transition-colors cursor-pointer shrink-0"
                            title="Cancel rename"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => setSelectedBatchId(isSelected ? "all" : batch.id)}
                          className="flex-1 min-w-0 cursor-pointer group"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold text-slate-900 dark:text-white truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                              {batch.name}
                            </span>
                            {isSelected && (
                              <span className="rounded-md bg-emerald-600 px-1.5 py-0.5 text-[9px] font-black uppercase text-white shrink-0">
                                Active Filter
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            Imported: {batch.importedAt} • {batch.count} consignment{batch.count > 1 ? "s" : ""}
                          </div>
                        </div>
                      )}

                      {/* Batch Rename & Delete Actions */}
                      {!isEditing && (
                        <div className="flex items-center gap-1 shrink-0">
                          {isPendingDelete ? (
                            <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950/90 border border-rose-200 dark:border-rose-800 rounded-xl px-2 py-1">
                              <span className="text-[10px] font-extrabold text-rose-700 dark:text-rose-300 mr-1">
                                Delete ({batch.count})?
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDeleteBatch(batch.id)}
                                className="rounded-lg bg-rose-600 hover:bg-rose-700 text-white px-2 py-0.5 text-[10px] font-bold cursor-pointer"
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() => setBatchPendingDeleteId(null)}
                                className="rounded-lg bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 text-[10px] font-bold border border-slate-200 dark:border-slate-700 cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => handleStartEditBatch(batch.id, batch.name)}
                                className="inline-flex items-center gap-1 rounded-xl border border-slate-200/90 bg-white hover:bg-emerald-50 hover:border-emerald-300 text-slate-600 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-emerald-300 px-2 py-1 text-[11px] font-bold transition-colors cursor-pointer"
                                title="Edit batch name"
                              >
                                <Pencil className="h-3 w-3" />
                                <span>Rename</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setBatchPendingDeleteId(batch.id)}
                                className="inline-flex items-center gap-1 rounded-xl border border-rose-200/80 bg-rose-50/70 hover:bg-rose-100 text-rose-600 dark:border-rose-900/60 dark:bg-rose-950/60 dark:text-rose-300 px-2 py-1 text-[11px] font-bold transition-colors cursor-pointer"
                                title="Delete entire batch"
                              >
                                <Trash2 className="h-3 w-3" />
                                <span>Delete</span>
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Batch Status Breakdown Footer */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/80 text-[11px]">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" />
                          {batch.delivered} Delivered
                        </span>
                        <span className="inline-flex items-center gap-1 font-bold text-sky-700 dark:text-sky-400">
                          <Truck className="h-3 w-3" />
                          {batch.inTransit} Active
                        </span>
                        {batch.returned > 0 && (
                          <span className="inline-flex items-center gap-1 font-bold text-rose-600 dark:text-rose-400">
                            <RotateCcw className="h-3 w-3" />
                            {batch.returned} RTO
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedBatchId(isSelected ? "all" : batch.id)}
                        className={`text-[11px] font-bold underline cursor-pointer ${
                          isSelected
                            ? "text-emerald-700 dark:text-emerald-300"
                            : "text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
                        }`}
                      >
                        {isSelected ? "Clear Batch Filter" : "Filter Batch"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Multiple Selection Action Toolbar */}
      {selectedShipmentIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-indigo-50/90 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 p-3 sm:px-4 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-600 text-white text-xs font-bold tabular-nums">
              {selectedShipmentIds.length}
            </span>
            <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
              {selectedShipmentIds.length} consignment{selectedShipmentIds.length > 1 ? "s" : ""} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedShipmentIds([])}
              className="rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Clear Selection
            </button>
            <button
              type="button"
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete Selected ({selectedShipmentIds.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. SHIPMENTS DATA TABLE                                        */}
      {/* ============================================================== */}
      <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[640px]">
            <thead className="bg-slate-50/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:bg-slate-800/60 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-800">
              <tr>
                <th className="py-3.5 pl-4 sm:pl-6 pr-2 w-10">
                  <input
                    type="checkbox"
                    checked={filteredShipments.length > 0 && selectedShipmentIds.length === filteredShipments.length}
                    onChange={handleToggleSelectAll}
                    aria-label="Select all consignments"
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                  />
                </th>
                <th className="py-3.5 px-3">Consignment / AWB</th>
                <th className="py-3.5 px-4">Courier Network</th>
                <th className="py-3.5 px-4">Current Status</th>
                <th className="py-3.5 px-4">Last Event</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredShipments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Package className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                      No shipments matching your filter
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Try adjusting the search query or upload tracking IDs above.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredShipments.map((item) => (
                  <tr
                    key={item.id}
                    className={`transition-colors group ${
                      selectedShipmentIds.includes(item.id)
                        ? "bg-indigo-50/60 dark:bg-indigo-950/40"
                        : "hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                    }`}
                  >
                    {/* Row Checkbox */}
                    <td className="py-3.5 pl-4 sm:pl-6 pr-2 w-10">
                      <input
                        type="checkbox"
                        checked={selectedShipmentIds.includes(item.id)}
                        onChange={() => handleToggleSelectRow(item.id)}
                        aria-label={`Select consignment ${item.trackingNumber}`}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                      />
                    </td>

                    {/* AWB & Copy */}
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onOpenTrackingResult(item.trackingNumber, item.courierId)}
                          className="font-mono font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors text-xs"
                          title="Click to view detailed tracking popup"
                        >
                          {item.trackingNumber}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopy(item.id, item.trackingNumber)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-opacity"
                          title="Copy AWB"
                        >
                          {copiedId === item.id ? (
                            <Check className="h-3 w-3 text-emerald-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                        {item.isImported && (
                          <span
                            className="inline-flex items-center gap-1 rounded-md bg-emerald-50 dark:bg-emerald-950/80 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 select-none cursor-default"
                            title={item.batchName || "Imported batch"}
                          >
                            <FileSpreadsheet className="h-2.5 w-2.5 text-emerald-600" />
                            <span>{item.batchName ? item.batchName.split(" • ")[0] : "Imported"}</span>
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {item.articleType}
                      </div>
                    </td>

                    {/* Courier Network */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="flex h-2 w-2 rounded-full bg-indigo-500" />
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[140px]">
                          {item.courierName}
                        </span>
                      </div>
                    </td>

                    {/* Status Pill (with Return / RTO distinction) */}
                    <td className="py-3.5 px-4">
                      {item.status === "delivered" && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60">
                          <CheckCircle2 className="h-3 w-3" />
                          Delivered
                        </span>
                      )}
                      {item.status === "out_for_delivery" && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60">
                          <Truck className="h-3 w-3" />
                          Out for Delivery
                        </span>
                      )}
                      {item.status === "in_transit" && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-0.5 text-[11px] font-bold text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800/60">
                          <Clock className="h-3 w-3" />
                          In Transit
                        </span>
                      )}
                      {item.status === "returned" && (
                        <div className="inline-flex flex-col items-start gap-0.5">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/60">
                            <RotateCcw className="h-3 w-3 stroke-[2.4]" />
                            Returned (RTO)
                          </span>
                          {item.returnReason && (
                            <span className="text-[10px] text-rose-600 dark:text-rose-400 font-medium truncate max-w-[150px]">
                              {item.returnReason}
                            </span>
                          )}
                        </div>
                      )}
                      {item.status === "booked" && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          Booked
                        </span>
                      )}
                    </td>

                    {/* Last Event */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                        {item.statusText}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {item.lastUpdated} · {item.lastLocation}
                      </div>
                    </td>

                    {/* Action buttons (Quick delete removed from row end; use checkboxes for safe deletion) */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => onOpenTrackingResult(item.trackingNumber, item.courierId)}
                          className="rounded-xl bg-indigo-50 hover:bg-indigo-600 hover:text-white px-3 py-1.5 text-xs font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 dark:hover:bg-indigo-600 dark:hover:text-white transition-all cursor-pointer"
                        >
                          Track
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 5. AUTO-CHECK, EXPORT & DATA SETTINGS MODAL (FULLSCREEN MOBILE) */}
      {/* ============================================================== */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
          <div className="fixed inset-0" onClick={() => setIsSettingsOpen(false)} />
          <div
            className="relative z-10 w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-xl rounded-none sm:rounded-3xl border-0 sm:border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 text-left flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 sm:px-6 py-4 shrink-0 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/80 dark:text-indigo-400">
                  <Settings className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Operations, Export & Sync Settings
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Configure auto-sync intervals, delivered exports, clean-up, and backups
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
              {/* Auto check toggle */}
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 dark:bg-slate-800/80 p-4 border border-slate-200/80 dark:border-slate-700">
                <div className="pr-3">
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    Automatic Background Check
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Periodically query carriers for fresh shipment delivery scans.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleToggleAutoCheck}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isAutoCheckEnabled ? "bg-emerald-600" : "bg-slate-300 dark:bg-slate-600"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      isAutoCheckEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Frequency Chooser Options: 5 mins, 10, 15, 30, 1hr, custom */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 block">
                  Select Sync Frequency:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { label: "5 mins", sec: 300 },
                    { label: "10 mins", sec: 600 },
                    { label: "15 mins (Default)", sec: 900 },
                    { label: "30 mins", sec: 1800 },
                    { label: "1 hour", sec: 3600 },
                  ].map((opt) => (
                    <button
                      key={opt.sec}
                      type="button"
                      onClick={() => {
                        handleChangeInterval(opt.sec);
                        setCustomMinutesInput("");
                      }}
                      className={`rounded-xl border py-2.5 px-3 text-xs font-bold transition-all cursor-pointer ${
                        checkIntervalSec === opt.sec
                          ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/60 dark:text-indigo-300"
                          : "border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Frequency Input */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Custom Frequency (Minutes):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="1440"
                    placeholder="Enter minutes (e.g. 8)"
                    value={customMinutesInput}
                    onChange={(e) => setCustomMinutesInput(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const mins = parseInt(customMinutesInput, 10);
                      if (mins > 0) {
                        handleChangeInterval(mins * 60);
                      }
                    }}
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 cursor-pointer"
                  >
                    Set
                  </button>
                </div>
                <p className="mt-1.5 text-[11px] text-slate-400">
                  Current active interval: {Math.round(checkIntervalSec / 60)} minutes ({checkIntervalSec} seconds).
                </p>
              </div>

              {/* Delivered Consignments Export & Clean-Up (Moved from Front Page into Settings) */}
              <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/50 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Delivered Consignments Export & Clean-Up
                    </span>
                  </div>
                  <span className="rounded-lg bg-emerald-100 dark:bg-emerald-950/90 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-800 dark:text-emerald-300">
                    {deliveredCount} delivered
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Export completed deliveries to an Excel (.xlsx) report and optionally remove exported delivered items from the live workspace.
                </p>

                {exportDeliveredSuccessMsg && (
                  <div className="rounded-xl border border-emerald-300 bg-white/90 dark:border-emerald-800 dark:bg-slate-900 px-3 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      {exportDeliveredSuccessMsg}
                    </span>
                    <button
                      type="button"
                      onClick={() => setExportDeliveredSuccessMsg(null)}
                      className="text-[10px] text-slate-400 hover:text-slate-600"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleExportDeliveredOnly}
                    disabled={deliveredCount === 0}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-3.5 py-2.5 text-xs font-bold text-white shadow-2xs transition-colors cursor-pointer disabled:cursor-not-allowed"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Export Delivered ({deliveredCount})</span>
                  </button>

                  {lastExportedDeliveredIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsSettingsOpen(false);
                        setIsDeleteExportedModalOpen(true);
                      }}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:border-rose-800 dark:bg-rose-950/70 dark:text-rose-300 px-3.5 py-2.5 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Delete Exported ({lastExportedDeliveredIds.length})</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Data Backup & Recovery Section Inside Settings */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-800/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Data Backup & Recovery
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    {shipments.length} consignments
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Export complete data backup to JSON or import previous archives for review in a separate window.
                </p>

                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleExportBackup}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700/80 px-3.5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-2xs transition-colors cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Export JSON Backup</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsSettingsOpen(false);
                      setBackupError(null);
                      setBackupSuccessMsg(null);
                      setIsBackupModalOpen(true);
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-3.5 py-2.5 text-xs font-bold text-white shadow-2xs transition-colors cursor-pointer"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>Import & Review Backup</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Sticky Modal Footer */}
            <div className="border-t border-slate-100 dark:border-slate-800 px-5 sm:px-6 py-4 bg-slate-50/70 dark:bg-slate-900/90 shrink-0">
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 transition-colors cursor-pointer shadow-xs"
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 6. UNIFIED ALL-IN-ONE CONSIGNMENT INTAKE & SCANNING STUDIO     */}
      {/* ============================================================== */}
      {isAddConsignmentsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="fixed inset-0" onClick={handleCloseAddConsignmentsModal} />
          <div
            className="relative z-10 w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-4xl flex flex-col rounded-none sm:rounded-3xl border-0 sm:border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 text-left overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-4 sm:px-6 py-3.5 sm:py-4 shrink-0">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <span className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/70 dark:text-indigo-400 shadow-2xs shrink-0">
                  <ScanLine className="h-5 w-5 stroke-[2.4]" />
                </span>
                <div>
                  <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
                    Add & Scan Consignments
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Type numbers manually, scan with barcode reader devices in the input field, or use camera scanning.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseAddConsignmentsModal}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5 flex-1">
              {/* Intake Toolbar: Auto-Next Toggle & Camera Mode Switch */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-3.5 border border-slate-200 dark:border-slate-700">
                {/* Auto-Next Switch */}
                <div className="flex items-center gap-2.5">
                  <div
                    className={`flex h-3 w-3 shrink-0 rounded-full ${
                      isAutoNextEnabled
                        ? "bg-emerald-500 ring-4 ring-emerald-500/20 animate-pulse"
                        : "bg-amber-500 ring-4 ring-amber-500/20"
                    }`}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        Auto-Next Scan:
                      </span>
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                          isAutoNextEnabled
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        }`}
                      >
                        {isAutoNextEnabled ? "ON" : "OFF"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {isAutoNextEnabled
                        ? "Auto-Next ON: Automatically stages each scanned barcode and clears input for next scan."
                        : "Auto-Next OFF: Holds scanned ID in view to verify details before advancing."}
                    </p>
                  </div>
                </div>

                {/* Right controls: Camera toggle & Auto-Next Toggle switch */}
                <div className="flex items-center gap-2.5 self-end sm:self-auto">
                  {/* Camera Scanner Trigger Button with Modern Icon */}
                  <button
                    type="button"
                    onClick={handleToggleCamera}
                    className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                      isCameraActive
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-white text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-2xs"
                    }`}
                  >
                    <div className="flex h-5 w-5 items-center justify-center rounded-md bg-indigo-100/80 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300">
                      {isCameraActive ? <CameraOff className="h-3.5 w-3.5" /> : <ScanLine className="h-3.5 w-3.5 stroke-[2.5]" />}
                    </div>
                    <span>{isCameraActive ? "Hide Camera" : "Camera Scanner"}</span>
                  </button>

                  {/* Auto-Next Switch */}
                  <button
                    type="button"
                    onClick={() => setIsAutoNextEnabled((prev) => !prev)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isAutoNextEnabled ? "bg-emerald-600" : "bg-slate-300 dark:bg-slate-600"
                    }`}
                    title={`Click to switch Auto-Next ${isAutoNextEnabled ? "OFF" : "ON"}`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        isAutoNextEnabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Unified Typing & Hardware Barcode Reader Field */}
              <div className="rounded-2xl border-2 border-indigo-500/60 bg-white p-4 sm:p-5 dark:border-indigo-500/50 dark:bg-slate-800/70 shadow-xs space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                    Consignment / AWB Number (Type manually or scan barcode device):
                  </label>
                  {intakeAwb && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-[11px] text-slate-400">Detected Courier:</span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">
                        {autoDetectCourier(intakeAwb)?.name || "Auto-Detecting"}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full">
                  <div className="relative w-full flex-1 min-w-0">
                    <input
                      ref={intakeInputRef}
                      type="text"
                      value={intakeAwb}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setIntakeAwb(val);
                        setIntakeError("");
                        const detected = autoDetectCourier(val);
                        if (detected) setIntakeCourier(detected.id);
                      }}
                      onKeyDown={handleIntakeKeyDown}
                      placeholder="Enter Consignment / AWB..."
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-mono text-sm font-black uppercase tracking-wider text-slate-900 focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      autoFocus
                    />
                  </div>

                  {/* Stage / Add Button */}
                  <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStageConsignment(intakeAwb)}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 text-xs font-extrabold text-white shadow-xs transition-colors cursor-pointer"
                    >
                      <Plus className="h-4 w-4 stroke-[2.5]" />
                      <span>Stage Consignment</span>
                    </button>

                    {!isAutoNextEnabled && recentStagedCode && (
                      <button
                        type="button"
                        onClick={() => {
                          setIntakeAwb("");
                          setRecentStagedCode(null);
                          intakeInputRef.current?.focus();
                        }}
                        className="inline-flex items-center justify-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2.5 text-xs font-bold text-white shadow-xs shrink-0 cursor-pointer animate-in fade-in"
                      >
                        <span>Next ID →</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline Options Strip: Carrier, Recipient, Destination, Status */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-1 text-xs">
                  {/* Courier Partner Selection */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setIsIntakeCourierDropdownOpen(!isIntakeCourierDropdownOpen);
                        setIsIntakeStatusDropdownOpen(false);
                      }}
                      className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
                    >
                      <span className="truncate">
                        {COURIER_MAP[intakeCourier]?.shortName || "Carrier Partner"}
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0 ml-1" />
                    </button>

                    {isIntakeCourierDropdownOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setIsIntakeCourierDropdownOpen(false)}
                        />
                        <div className="absolute left-0 top-full mt-1 z-50 max-h-48 w-56 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-800">
                          {COURIER_LIST.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setIntakeCourier(c.id);
                                setIsIntakeCourierDropdownOpen(false);
                              }}
                              className="w-full text-left rounded-lg px-2.5 py-1.5 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between cursor-pointer"
                            >
                              <span>{c.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">({c.shortName})</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Recipient Name */}
                  <input
                    type="text"
                    placeholder="Recipient Name (Optional)"
                    value={intakeRecipient}
                    onChange={(e) => setIntakeRecipient(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 focus:outline-none"
                  />

                  {/* Destination City */}
                  <input
                    type="text"
                    placeholder="Destination Hub / City"
                    value={intakeDestination}
                    onChange={(e) => setIntakeDestination(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 focus:outline-none"
                  />

                  {/* Custom Styled Status Dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setIsIntakeStatusDropdownOpen(!isIntakeStatusDropdownOpen);
                        setIsIntakeCourierDropdownOpen(false);
                      }}
                      className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className={`h-2 w-2 rounded-full shrink-0 ${
                            intakeStatus === "delivered"
                              ? "bg-emerald-500 ring-2 ring-emerald-500/20"
                              : intakeStatus === "out_for_delivery"
                              ? "bg-amber-500 ring-2 ring-amber-500/20"
                              : intakeStatus === "returned"
                              ? "bg-rose-500 ring-2 ring-rose-500/20"
                              : "bg-sky-500 ring-2 ring-sky-500/20"
                          }`}
                        />
                        <span className="truncate">
                          {intakeStatus === "delivered"
                            ? "Delivered"
                            : intakeStatus === "out_for_delivery"
                            ? "Out for Delivery"
                            : intakeStatus === "returned"
                            ? "Returned (RTO)"
                            : "In Transit"}
                        </span>
                      </div>
                      <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0 ml-1" />
                    </button>

                    {isIntakeStatusDropdownOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setIsIntakeStatusDropdownOpen(false)}
                        />
                        <div className="absolute left-0 right-0 sm:right-auto top-full mt-1 z-50 sm:w-48 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-800">
                          {[
                            { value: "in_transit", label: "In Transit", dot: "bg-sky-500", desc: "Active dispatch" },
                            { value: "out_for_delivery", label: "Out for Delivery", dot: "bg-amber-500", desc: "With delivery agent" },
                            { value: "delivered", label: "Delivered", dot: "bg-emerald-500", desc: "Successfully delivered" },
                            { value: "returned", label: "Returned (RTO)", dot: "bg-rose-500", desc: "Returned to shipper" },
                          ].map((st) => (
                            <button
                              key={st.value}
                              type="button"
                              onClick={() => {
                                setIntakeStatus(st.value as any);
                                setIsIntakeStatusDropdownOpen(false);
                              }}
                              className={`w-full text-left rounded-lg px-2.5 py-1.5 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between cursor-pointer transition-colors ${
                                intakeStatus === st.value
                                  ? "bg-indigo-50/70 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-bold"
                                  : "text-slate-700 dark:text-slate-300"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className={`h-2 w-2 rounded-full ${st.dot}`} />
                                <span>{st.label}</span>
                              </div>
                              {intakeStatus === st.value && (
                                <Check className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                              )}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Instant Success Feedback Strip */}
                {recentStagedCode && (
                  <div className="flex items-center justify-between rounded-xl bg-emerald-100/90 dark:bg-emerald-950/80 px-3 py-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 animate-in fade-in">
                    <div className="flex items-center gap-1.5">
                      <CheckCheck className="h-4 w-4 text-emerald-600" />
                      <span>
                        ✓ Staged: {recentStagedCode} —{" "}
                        {isAutoNextEnabled
                          ? "Added to review list! Ready for next scan."
                          : "Saved to review list (Auto-Next OFF)."}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400">
                      Total Staged: {stagedConsignments.length}
                    </span>
                  </div>
                )}

                {/* Error Banner */}
                {intakeError && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs font-semibold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/60 dark:text-rose-300">
                    {intakeError}
                  </div>
                )}
              </div>

              {/* Clean Camera Scanner Viewfinder (No cluttering text/icons on camera feed + Quick Success Mark) */}
              {isCameraActive && (
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3 sm:p-4 text-white space-y-3 animate-in fade-in">
                  {/* Minimal Mode Switcher Bar */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-1 rounded-xl bg-slate-900 p-1 border border-slate-800 text-[11px] font-bold">
                      <button
                        type="button"
                        onClick={() => setCameraGuideMode("barcode")}
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                          cameraGuideMode === "barcode"
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        Barcode
                      </button>
                      <button
                        type="button"
                        onClick={() => setCameraGuideMode("qr")}
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                          cameraGuideMode === "qr"
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        QR
                      </button>
                      <button
                        type="button"
                        onClick={() => setCameraGuideMode("both")}
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                          cameraGuideMode === "both"
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        Both
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleToggleCamera}
                      className="rounded-lg bg-slate-900 hover:bg-slate-800 px-2.5 py-1 text-[11px] font-bold text-slate-300 border border-slate-800 cursor-pointer"
                    >
                      Close Camera
                    </button>
                  </div>

                  {cameraError && (
                    <div className="text-[11px] text-amber-300 bg-amber-950/70 p-2.5 rounded-xl border border-amber-800/80">
                      {cameraError}
                    </div>
                  )}

                  {/* Unobstructed Camera Video Feed with Clean Guide Frame & Quick Success Mark */}
                  <div
                    className={`relative h-52 sm:h-64 rounded-2xl bg-black overflow-hidden flex items-center justify-center border-2 transition-colors duration-200 ${
                      cameraScanSuccess
                        ? "border-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.45)]"
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

                    {/* Subtle Scan Line */}
                    {!cameraScanSuccess && (
                      <div className="absolute left-8 right-8 h-0.5 bg-emerald-400/90 shadow-[0_0_12px_#10b981] animate-pulse z-10 pointer-events-none" />
                    )}

                    {/* Clean Guide Frame Only (No icons or text blocking the camera) */}
                    {cameraGuideMode === "barcode" && (
                      <div
                        className={`relative z-10 w-4/5 max-w-sm h-24 rounded-xl border-2 pointer-events-none transition-colors ${
                          cameraScanSuccess ? "border-emerald-400 bg-emerald-500/15" : "border-indigo-400/80"
                        }`}
                      />
                    )}

                    {cameraGuideMode === "qr" && (
                      <div
                        className={`relative z-10 w-40 h-40 sm:w-44 sm:h-44 rounded-2xl border-2 pointer-events-none transition-colors ${
                          cameraScanSuccess ? "border-emerald-400 bg-emerald-500/15" : "border-emerald-400/80"
                        }`}
                      />
                    )}

                    {cameraGuideMode === "both" && (
                      <div
                        className={`relative z-10 w-4/5 max-w-md h-36 rounded-2xl border-2 pointer-events-none flex items-center justify-center transition-colors ${
                          cameraScanSuccess ? "border-emerald-400 bg-emerald-500/15" : "border-white/50"
                        }`}
                      >
                        <div className="w-28 h-28 rounded-xl border border-emerald-400/60" />
                      </div>
                    )}

                    {/* Quick Success Mark Overlay when Barcode or QR is Read & Added */}
                    {cameraScanSuccess && (
                      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/65 backdrop-blur-[2px] animate-in zoom-in-95 duration-150 pointer-events-none">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/40 ring-4 ring-emerald-400/30">
                          <Check className="h-8 w-8 stroke-[3.5]" />
                        </div>
                        <div className="mt-2.5 rounded-full bg-emerald-500/95 px-3.5 py-1 text-xs font-black tracking-wider text-white font-mono shadow-md">
                          ✓ {cameraScanSuccess.code}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Full Review Before Add: Staged Consignments List */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-xs">
                      {stagedConsignments.length}
                    </span>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      Full Review Before Add: Staged Consignments
                    </h4>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Inspect all items below. Nothing is added to dashboard until you click Confirm.
                  </div>
                </div>

                {/* Staged Table / Empty State */}
                {stagedConsignments.length === 0 ? (
                  <div className="py-8 text-center text-slate-400">
                    <Package className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      No consignments staged for review yet
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Type numbers in the field above, scan with a barcode reader device, or open the camera scanner.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-56 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left text-xs min-w-[550px]">
                      <thead className="bg-slate-50 dark:bg-slate-800 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                        <tr>
                          <th className="py-2.5 px-3">AWB / Consignment</th>
                          <th className="py-2.5 px-3">Carrier Partner</th>
                          <th className="py-2.5 px-3">Destination / Addressee</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-right">Remove</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                        {stagedConsignments.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            {/* AWB */}
                            <td className="py-2.5 px-3 font-bold text-indigo-600 dark:text-indigo-400">
                              {item.trackingNumber}
                            </td>

                            {/* Carrier Selector */}
                            <td className="py-2.5 px-3 font-sans">
                              <select
                                value={item.courierId}
                                onChange={(e) => handleUpdateStagedCourier(item.id, e.target.value)}
                                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                              >
                                {COURIER_LIST.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.name}
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* Destination */}
                            <td className="py-2.5 px-3 font-sans text-slate-600 dark:text-slate-400 truncate max-w-[150px]">
                              {item.destination}
                            </td>

                            {/* Status */}
                            <td className="py-2.5 px-3">
                              <span
                                className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-sans font-bold ${
                                  item.status === "delivered"
                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                    : item.status === "returned"
                                    ? "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                                    : item.status === "out_for_delivery"
                                    ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                                    : "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
                                }`}
                              >
                                {item.status === "delivered"
                                  ? "Delivered"
                                  : item.status === "returned"
                                  ? "Returned"
                                  : item.status === "out_for_delivery"
                                  ? "Out for Delivery"
                                  : "In Transit"}
                              </span>
                            </td>

                            {/* Remove button */}
                            <td className="py-2.5 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveStagedItem(item.id)}
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/70 transition-colors cursor-pointer"
                                title="Remove this item from staging list"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer with Full Review Confirmation */}
            <div className="border-t border-slate-100 dark:border-slate-800 px-5 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div>
                {stagedConsignments.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setStagedConsignments([])}
                    className="text-xs font-bold text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 underline cursor-pointer"
                  >
                    Clear All Staged ({stagedConsignments.length})
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleCloseAddConsignmentsModal}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmIngestStaged}
                  disabled={stagedConsignments.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-5 py-2 text-xs font-extrabold text-white shadow-xs transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  <Check className="h-4 w-4 stroke-[3]" />
                  <span>
                    Confirm & Ingest ({stagedConsignments.length} Consignments)
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 8. BULK IMPORT MODAL WITH FULL REVIEW BEFORE IMPORT             */}
      {/* ============================================================== */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
          <div className="fixed inset-0" onClick={() => setIsUploadModalOpen(false)} />
          <div
            className="relative z-10 w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-3xl rounded-none sm:rounded-3xl border-0 sm:border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 text-left flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 sm:px-6 py-4 shrink-0 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-2.5">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl shrink-0 ${
                    importSuccessState
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                      : previewShipments
                      ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                      : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
                  }`}
                >
                  {importSuccessState ? (
                    <CheckCircle2 className="h-5 w-5 stroke-[2.5]" />
                  ) : (
                    <FileSpreadsheet className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    {importSuccessState
                      ? "Successfully Imported!"
                      : previewShipments
                      ? "Review Bulk Data Before Import"
                      : "Bulk Import & Review"}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {importSuccessState
                      ? "Consignments verified and committed to dashboard"
                      : previewShipments
                      ? `Inspect, edit carrier/status, or remove rows from ${previewFileName} before importing`
                      : "Upload Excel (.xlsx, .xls, .csv) or paste AWB numbers to review before importing"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseUploadModal}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 cursor-pointer"
                title="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              {/* SUCCESS STATE: Shows confirmation & closes automatically */}
              {importSuccessState ? (
                <div className="py-6 px-3 text-center space-y-4 animate-in zoom-in-95 duration-200">
                  <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shadow-sm">
                    <CheckCircle2 className="h-9 w-9 stroke-[2.4]" />
                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500" />
                    </span>
                  </div>

                  <div>
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 px-3 py-0.5 text-xs font-extrabold text-emerald-800 dark:text-emerald-300 mb-1.5">
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                      <span>Successfully Imported</span>
                    </div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">
                      {importSuccessState.count} Consignments Added
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                      Assigned to <span className="font-extrabold text-indigo-600 dark:text-indigo-400">{importSuccessState.batchName}</span>. Your consignments are now live and monitored batch-wise.
                    </p>
                  </div>

                  {/* Auto-closing countdown indicator */}
                  <div className="mx-auto max-w-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 p-3 border border-slate-200/80 dark:border-slate-700 text-left">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-1.5">
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        <span>Closing automatically...</span>
                      </span>
                      <span className="text-emerald-600 font-extrabold text-[10px] uppercase tracking-wider">
                        No Issues Found
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                      <div className="h-full bg-emerald-500 animate-[pulse_1s_ease-in-out_infinite] w-full" />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-center">
                    <button
                      type="button"
                      onClick={handleCloseUploadModal}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 text-xs font-extrabold text-white shadow-xs cursor-pointer transition-colors"
                    >
                      <span>Open Batch in Dashboard Now →</span>
                    </button>
                  </div>
                </div>
              ) : previewShipments ? (
                /* PRE-IMPORT REVIEW MODE: Inspect, Edit Batch Name, Adjust Carrier/Status, Remove Rows before Import */
                (() => {
                  const newReadyCount = previewShipments.filter(
                    (p) => !shipments.some((s) => s.trackingNumber === p.trackingNumber)
                  ).length;
                  const duplicateCount = previewShipments.length - newReadyCount;

                  return (
                    <div className="space-y-4">
                      {/* Review Summary & Editable Batch Name */}
                      <div className="rounded-2xl bg-indigo-50/80 p-4 border border-indigo-200/80 dark:bg-indigo-950/40 dark:border-indigo-800 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white font-black text-xs shrink-0">
                              <ShieldCheck className="h-4 w-4" />
                            </span>
                            <div>
                              <div className="text-xs font-extrabold text-slate-900 dark:text-white">
                                Pre-Import Data Verification & Review
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                Source: <span className="font-mono font-semibold">{previewFileName}</span> — Nothing is imported until you click Confirm below.
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                            <span className="rounded-lg bg-white dark:bg-slate-900 px-2.5 py-1 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              Total Rows: {previewShipments.length}
                            </span>
                            <span className="rounded-lg bg-emerald-100 dark:bg-emerald-950 px-2.5 py-1 text-emerald-800 dark:text-emerald-300">
                              Ready to Import: {newReadyCount}
                            </span>
                            {duplicateCount > 0 && (
                              <span className="rounded-lg bg-amber-100 dark:bg-amber-950 px-2.5 py-1 text-amber-800 dark:text-amber-300">
                                Duplicates Skipped: {duplicateCount}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Editable Batch Name Before Import */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-2 border-t border-indigo-200/60 dark:border-indigo-800/60">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0">
                            Batch Name:
                          </label>
                          <input
                            type="text"
                            value={previewBatchName}
                            onChange={(e) => setPreviewBatchName(e.target.value)}
                            placeholder="Enter batch name..."
                            className="flex-1 rounded-xl border border-indigo-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                          />
                        </div>
                      </div>

                      {uploadError && (
                        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 dark:border-rose-900/60 dark:bg-rose-950/60 flex items-start gap-2 text-xs text-rose-800 dark:text-rose-300">
                          <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                          <span>{uploadError}</span>
                        </div>
                      )}

                      {/* Interactive Review Table */}
                      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                        <div className="max-h-72 overflow-y-auto overflow-x-auto">
                          <table className="w-full text-left text-xs min-w-[580px]">
                            <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                              <tr>
                                <th className="py-2.5 px-3">#</th>
                                <th className="py-2.5 px-3">AWB / Consignment</th>
                                <th className="py-2.5 px-3">Carrier Partner</th>
                                <th className="py-2.5 px-3">Destination</th>
                                <th className="py-2.5 px-3">Status</th>
                                <th className="py-2.5 px-3 text-right">Remove</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                              {previewShipments.map((p, idx) => {
                                const isAlreadyInLive = shipments.some(
                                  (s) => s.trackingNumber === p.trackingNumber
                                );
                                return (
                                  <tr
                                    key={p.id}
                                    className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 ${
                                      isAlreadyInLive ? "opacity-60 bg-amber-50/30 dark:bg-amber-950/20" : ""
                                    }`}
                                  >
                                    <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                                      {idx + 1}
                                    </td>
                                    <td className="py-2.5 px-3">
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                          {p.trackingNumber}
                                        </span>
                                        {isAlreadyInLive && (
                                          <span className="rounded bg-amber-100 dark:bg-amber-950 px-1.5 py-0.5 text-[9px] font-bold text-amber-800 dark:text-amber-300">
                                            Duplicate
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="py-2.5 px-3">
                                      <select
                                        value={p.courierId}
                                        onChange={(e) => handleUpdatePreviewCourier(p.id, e.target.value)}
                                        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                                      >
                                        {COURIER_LIST.map((c) => (
                                          <option key={c.id} value={c.id}>
                                            {c.name}
                                          </option>
                                        ))}
                                      </select>
                                    </td>
                                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 truncate max-w-[140px]">
                                      {p.destination}
                                    </td>
                                    <td className="py-2.5 px-3">
                                      <select
                                        value={p.status}
                                        onChange={(e) =>
                                          handleUpdatePreviewStatus(
                                            p.id,
                                            e.target.value as "in_transit" | "out_for_delivery" | "delivered" | "returned"
                                          )
                                        }
                                        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                                      >
                                        <option value="in_transit">In Transit</option>
                                        <option value="out_for_delivery">Out for Delivery</option>
                                        <option value="delivered">Delivered</option>
                                        <option value="returned">Returned (RTO)</option>
                                      </select>
                                    </td>
                                    <td className="py-2.5 px-3 text-right">
                                      <button
                                        type="button"
                                        onClick={() => handleRemovePreviewItem(p.id)}
                                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
                                        title="Remove row from import"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Confirm & Cancel Actions */}
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={handleCancelPreview}
                          className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          ← Back / Choose Another File
                        </button>
                        <button
                          type="button"
                          onClick={handleConfirmImport}
                          disabled={newReadyCount === 0}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-5 py-2.5 text-xs font-extrabold text-white shadow-xs cursor-pointer transition-colors disabled:cursor-not-allowed"
                        >
                          <Check className="h-4 w-4 stroke-[3]" />
                          <span>Confirm & Import ({newReadyCount} Consignments)</span>
                        </button>
                      </div>
                    </div>
                  );
                })()
              ) : (
                /* STEP 1: UPLOAD EXCEL/CSV OR PASTE BULK AWBs FOR REVIEW */
                <div className="space-y-4">
                  {/* Download Sample Template Banner */}
                  <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4 dark:border-indigo-900/50 dark:bg-indigo-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                        Need the formatted Excel spreadsheet?
                      </div>
                      <div className="text-[11px] text-indigo-700/80 dark:text-indigo-300/80">
                        Download our verified sample spreadsheet pre-filled with columns and sample rows.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadSampleTemplate}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-3.5 py-2 text-xs font-extrabold text-white shadow-xs shrink-0 cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download Sample</span>
                    </button>
                  </div>

                  {/* Upload Drop Zone */}
                  <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-6 text-center hover:border-indigo-500 hover:bg-indigo-50/20 dark:border-slate-700 dark:bg-slate-800/40 transition-colors">
                    <FileSpreadsheet className="mx-auto h-10 w-10 text-emerald-600 mb-2" />
                    <label
                      htmlFor="excel-file-input"
                      className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1 cursor-pointer"
                    >
                      Select Excel (.xlsx, .xls) or CSV (.csv) file to Review
                    </label>
                    <p className="text-[11px] text-slate-400 mb-3">
                      All rows will be shown in a review table before importing into your dashboard
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx, .xls, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, text/csv"
                      onChange={handleFileChange}
                      className="hidden"
                      id="excel-file-input"
                    />
                    <label
                      htmlFor="excel-file-input"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 shadow-2xs cursor-pointer"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span>{isUploading ? "Reading File..." : "Browse Spreadsheet for Review"}</span>
                    </label>
                  </div>

                  {/* Quick Bulk Paste Option (Also goes to Review Before Import) */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        Or Paste Multiple Consignment / AWB Numbers for Review:
                      </label>
                      <span className="text-[10px] text-slate-400">Comma or line separated</span>
                    </div>
                    <textarea
                      rows={3}
                      value={bulkPasteText}
                      onChange={(e) => setBulkPasteText(e.target.value)}
                      placeholder="Paste multiple AWB numbers here (e.g. EL855948618IN, B4000211866)..."
                      className="w-full rounded-xl border border-slate-200 bg-white p-3 font-mono text-xs text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleParseBulkPasteForReview}
                        disabled={!bulkPasteText.trim()}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-4 py-2 text-xs font-extrabold text-white shadow-xs cursor-pointer disabled:cursor-not-allowed"
                      >
                        <ArrowRight className="h-3.5 w-3.5" />
                        <span>Review Bulk Data Before Import</span>
                      </button>
                    </div>
                  </div>

                  {/* Error Alert */}
                  {uploadError && (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3.5 dark:border-rose-900/60 dark:bg-rose-950/60 flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-300">
                      <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold">Notice</div>
                        <div className="mt-0.5">{uploadError}</div>
                      </div>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <button
                      type="button"
                      onClick={handleCloseUploadModal}
                      className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 9. DATA BACKUP & IMPORT BACKUP FOR SEPARATE REVIEW MODAL       */}
      {/* ============================================================== */}
      {isBackupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
          <div className="fixed inset-0" onClick={() => setIsBackupModalOpen(false)} />
          <div
            className="relative z-10 w-full h-full sm:h-auto sm:max-w-3xl sm:max-h-[92vh] flex flex-col rounded-none sm:rounded-3xl border-0 sm:border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 text-left overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 sm:px-6 py-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400">
                  <Database className="h-5 w-5 stroke-[2.2]" />
                </span>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Data Backup & Recovery Center
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Export entire logistics data or import saved backups to review separately
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBackupModalOpen(false)}
                className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="overflow-y-auto p-5 sm:p-6 space-y-5 flex-1">
              {/* Alert Feedback */}
              {backupSuccessMsg && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 dark:border-emerald-900/60 dark:bg-emerald-950/60 flex items-start gap-2.5 text-xs text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">Success</div>
                    <div>{backupSuccessMsg}</div>
                  </div>
                </div>
              )}

              {backupError && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3.5 dark:border-rose-900/60 dark:bg-rose-950/60 flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-300">
                  <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">Backup Notice</div>
                    <div>{backupError}</div>
                  </div>
                </div>
              )}

              {/* 1. Export Backup Section */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-800/40">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Download className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                        Export Full Operational Backup (.json)
                      </h4>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      Archive all {shipments.length} consignments across {uniqueBatches.length} imported batches, SLAs, tracking history, and tags into an offline file.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportBackup}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 text-xs font-extrabold text-white shadow-xs transition-colors shrink-0 cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download JSON Backup</span>
                  </button>
                </div>
              </div>

              {/* 2. Import Backup Section */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900/80 space-y-4">
                <div className="flex items-center gap-2">
                  <FileJson className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    Import Backup Data for Review in Separate View
                  </h4>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Select a previously downloaded backup JSON file. You can review all records separately without modifying your live shipments, or merge them as needed.
                </p>

                {/* File picker */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <input
                    ref={backupFileInputRef}
                    type="file"
                    accept=".json,application/json"
                    onChange={handleBackupFileSelect}
                    id="backup-file-input"
                    className="hidden"
                  />
                  <label
                    htmlFor="backup-file-input"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50 hover:bg-indigo-50/30 px-4 py-3 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer transition-colors"
                  >
                    <Upload className="h-4 w-4 text-indigo-600" />
                    <span>Select Backup File (.json)</span>
                  </label>
                  {backupReviewData && (
                    <div className="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400">
                      <FileJson className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="font-bold text-slate-900 dark:text-white truncate max-w-xs">
                        {backupReviewData.fileName}
                      </span>
                      <span>({backupReviewData.shipments.length} records)</span>
                    </div>
                  )}
                </div>

                {/* Backup Loaded Review Studio */}
                {backupReviewData && (
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3.5">
                    {/* Status Breakdown Pills */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-2 dark:border-emerald-900/60 dark:bg-emerald-950/40">
                        <div className="text-[10px] uppercase font-bold text-emerald-600">Delivered</div>
                        <div className="text-base font-black text-emerald-700 dark:text-emerald-300">
                          {backupReviewData.shipments.filter((s) => s.status === "delivered").length}
                        </div>
                      </div>
                      <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-2 dark:border-amber-900/60 dark:bg-amber-950/40">
                        <div className="text-[10px] uppercase font-bold text-amber-600">Out for Delivery</div>
                        <div className="text-base font-black text-amber-700 dark:text-amber-300">
                          {backupReviewData.shipments.filter((s) => s.status === "out_for_delivery").length}
                        </div>
                      </div>
                      <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-2 dark:border-sky-900/60 dark:bg-sky-950/40">
                        <div className="text-[10px] uppercase font-bold text-sky-600">In Transit</div>
                        <div className="text-base font-black text-sky-700 dark:text-sky-300">
                          {backupReviewData.shipments.filter((s) => s.status === "in_transit").length}
                        </div>
                      </div>
                      <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-2 dark:border-rose-900/60 dark:bg-rose-950/40">
                        <div className="text-[10px] uppercase font-bold text-rose-600">Returned (RTO)</div>
                        <div className="text-base font-black text-rose-700 dark:text-rose-300">
                          {backupReviewData.shipments.filter((s) => s.status === "returned").length}
                        </div>
                      </div>
                    </div>

                    {/* Review In Separate Action Banner */}
                    <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900">
                      <div>
                        <div className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                          Review in Separate Dashboard Mode
                        </div>
                        <div className="text-[11px] text-indigo-800/80 dark:text-indigo-300/80">
                          Inspect all {backupReviewData.shipments.length} consignments on the main dashboard table with zero impact on live data.
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsReviewingSeparately(true);
                          setIsBackupModalOpen(false);
                          setBackupSuccessMsg("Separate review mode enabled.");
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-xs font-extrabold text-white shadow-xs cursor-pointer"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>Open Separate Review</span>
                      </button>
                    </div>

                    {/* Table Preview of Backup Records */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                        <span>Snapshot Consignments Preview:</span>
                        <span className="text-[11px] text-slate-400 font-normal">
                          Showing first 6 of {backupReviewData.shipments.length}
                        </span>
                      </div>
                      <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
                        <table className="w-full text-left text-xs min-w-[500px]">
                          <thead className="bg-slate-50 dark:bg-slate-800 text-[10px] uppercase font-bold text-slate-500">
                            <tr>
                              <th className="py-2 px-3">AWB</th>
                              <th className="py-2 px-3">Courier</th>
                              <th className="py-2 px-3">Destination</th>
                              <th className="py-2 px-3">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                            {backupReviewData.shipments.slice(0, 8).map((b) => (
                              <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                <td className="py-2 px-3 font-bold text-indigo-600 dark:text-indigo-400">
                                  {b.trackingNumber}
                                </td>
                                <td className="py-2 px-3 font-sans text-slate-700 dark:text-slate-300">
                                  {b.courierName}
                                </td>
                                <td className="py-2 px-3 font-sans text-slate-500 dark:text-slate-400 truncate max-w-[140px]">
                                  {b.destination}
                                </td>
                                <td className="py-2 px-3">
                                  <span
                                    className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-sans font-bold ${
                                      b.status === "delivered"
                                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                        : b.status === "returned"
                                        ? "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                                        : b.status === "out_for_delivery"
                                        ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                                        : "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
                                    }`}
                                  >
                                    {b.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Merge or Restore Action Buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleMergeBackupIntoLive}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-white hover:bg-indigo-50 dark:border-indigo-800 dark:bg-slate-800 dark:hover:bg-indigo-950/60 px-3.5 py-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 cursor-pointer shadow-2xs"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Merge into Live Dashboard</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleRestoreBackupOverwrite}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 dark:border-rose-900 dark:bg-slate-800 dark:hover:bg-rose-950/60 px-3.5 py-2 text-xs font-bold text-rose-700 dark:text-rose-300 cursor-pointer shadow-2xs"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span>Replace Live Data</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setBackupReviewData(null)}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline cursor-pointer"
                      >
                        Clear Loaded Backup
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-100 dark:border-slate-800 px-5 sm:px-6 py-3 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsBackupModalOpen(false)}
                className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 9. BULK MULTIPLE DELETE CONFIRMATION MODAL                      */}
      {/* ============================================================== */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="fixed inset-0" onClick={() => setIsBulkDeleteModalOpen(false)} />
          <div
            className="relative z-10 w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 text-left overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/80 dark:text-rose-300 shrink-0">
                <AlertCircle className="h-6 w-6 stroke-[2.2]" />
              </span>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Confirm Multiple Delete
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Prevent accidental deletion of selected consignments
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Are you sure you want to permanently delete{" "}
                <span className="font-extrabold text-rose-600 dark:text-rose-400">
                  {selectedShipmentIds.length} selected consignment{selectedShipmentIds.length > 1 ? "s" : ""}
                </span>
                ? This action will remove their tracking histories and cannot be undone.
              </p>

              {/* Quick preview of selected consignments */}
              <div className="max-h-32 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-800/50 text-[11px] font-mono space-y-1">
                {selectedShipmentIds.slice(0, 5).map((id) => {
                  const s = shipments.find((item) => item.id === id);
                  if (!s) return null;
                  return (
                    <div key={id} className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                      <span className="font-bold">{s.trackingNumber}</span>
                      <span className="font-sans text-[10px] text-slate-500">{s.courierName}</span>
                    </div>
                  );
                })}
                {selectedShipmentIds.length > 5 && (
                  <div className="pt-1 text-[10px] text-slate-400 font-sans italic">
                    ...and {selectedShipmentIds.length - 5} more consignment(s)
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkDelete}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-2 text-xs font-extrabold text-white shadow-xs cursor-pointer transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete {selectedShipmentIds.length} Consignment{selectedShipmentIds.length > 1 ? "s" : ""}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 10. QUICK DELETE EXPORTED DELIVERED DATA MODAL                  */}
      {/* ============================================================== */}
      {isDeleteExportedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="fixed inset-0" onClick={() => setIsDeleteExportedModalOpen(false)} />
          <div
            className="relative z-10 w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 text-left overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/80 dark:text-rose-300 shrink-0">
                <Trash2 className="h-6 w-6 stroke-[2.2]" />
              </span>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Delete Exported Delivered Data
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Quick clean-up of completed shipments
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                You are about to delete{" "}
                <span className="font-extrabold text-rose-600 dark:text-rose-400">
                  {lastExportedDeliveredIds.length} delivered consignment{lastExportedDeliveredIds.length > 1 ? "s" : ""}
                </span>{" "}
                that were just exported to your Excel workbook.
              </p>
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-[11px] text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-200">
                <span className="font-bold">Safe Guard:</span> Only delivered consignments from your recent export are removed. All active shipments (In Transit, Out for Delivery, Returned) remain completely safe and untouched.
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsDeleteExportedModalOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
              >
                Keep Consignments
              </button>
              <button
                type="button"
                onClick={handleQuickDeleteExportedDelivered}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-2 text-xs font-extrabold text-white shadow-xs cursor-pointer transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Confirm & Delete Delivered ({lastExportedDeliveredIds.length})</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
