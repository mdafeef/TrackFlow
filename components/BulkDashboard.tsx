"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
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
  BarChart3,
  HardDrive,
  Zap,
  ZoomIn,
  ZoomOut,
  FileText,
  FileCode,
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
import {
  autoDetectCourier,
  COURIER_LIST,
  COURIER_MAP,
  identifyAndValidateConsignment,
  validateConsignmentFormat,
} from "@/lib/couriers";

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
  const router = useRouter();
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
  const [statusFilter, setStatusFilter] = useState<"all" | "delivered" | "in_transit" | "out_for_delivery" | "returned" | "booked">("all");
  const [activeSideTab, setActiveSideTab] = useState<"filters" | "analytics" | "settings">("filters");
  const [exportBatchTargetId, setExportBatchTargetId] = useState<string>("all");
  const [exportFileExtension, setExportFileExtension] = useState<
    "csv" | "xlsx" | "xls" | "json" | "txt"
  >("csv");
  const [isExportBatchDropdownOpen, setIsExportBatchDropdownOpen] = useState<boolean>(false);
  const [isExportFormatDropdownOpen, setIsExportFormatDropdownOpen] = useState<boolean>(false);
  const [isModalExportBatchDropdownOpen, setIsModalExportBatchDropdownOpen] = useState<boolean>(false);
  const [isModalExportFormatDropdownOpen, setIsModalExportFormatDropdownOpen] = useState<boolean>(false);
  const [batchCsvExportMsg, setBatchCsvExportMsg] = useState<string | null>(null);

  // Auto-check Settings
  // Automatic Background Check is ON by default (15 minutes = 900 seconds)
  const [isAutoCheckEnabled, setIsAutoCheckEnabled] = useState<boolean>(true);

  useEffect(() => {
    try {
      localStorage.setItem("trackflow_auto_enabled", "true");
    } catch {}
  }, []);

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

  // Stacked Top-Right Auto-Hiding Delivered Notifications state
  const [deliveredNotifications, setDeliveredNotifications] = useState<
    {
      id: string;
      shipmentId: string;
      trackingNumber: string;
      courierName: string;
      destination: string;
      recipientName?: string;
      timestamp: string;
    }[]
  >([]);
  const notificationTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const dismissDeliveredNotification = useCallback((notifId: string) => {
    const existingTimer = notificationTimersRef.current.get(notifId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      notificationTimersRef.current.delete(notifId);
    }
    setDeliveredNotifications((prev) => prev.filter((n) => n.id !== notifId));
  }, []);

  const pushDeliveredNotifications = useCallback(
    (items: BulkShipment[]) => {
      const nowStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const newCards = items.map((d, idx) => ({
        id: `deliv-toast-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
        shipmentId: d.id,
        trackingNumber: d.trackingNumber,
        courierName: d.courierName,
        destination: d.destination,
        recipientName: d.recipientName,
        timestamp: nowStr,
      }));

      setDeliveredNotifications((prev) => [...newCards, ...prev].slice(0, 6));

      newCards.forEach((card) => {
        const timer = setTimeout(() => {
          setDeliveredNotifications((prev) => prev.filter((n) => n.id !== card.id));
          notificationTimersRef.current.delete(card.id);
        }, 6500);
        notificationTimersRef.current.set(card.id, timer);
      });
    },
    []
  );

  // Settings custom interval input
  const [customMinutesInput, setCustomMinutesInput] = useState("");

  // Unified Intake & Scanner Form state (Typing, Hardware Barcode Scanner & Camera QR/Barcode)
  const [stagedConsignments, setStagedConsignments] = useState<BulkShipment[]>([]);
  const [intakeAwb, setIntakeAwb] = useState("");
  const [intakeCourier, setIntakeCourier] = useState("speedpost");
  const [isIntakeCourierDropdownOpen, setIsIntakeCourierDropdownOpen] = useState(false);
  const [intakeCourierSearch, setIntakeCourierSearch] = useState("");
  const intakeCourierSearchRef = useRef<HTMLInputElement | null>(null);
  const [intakeRecipient, setIntakeRecipient] = useState("");
  const [intakeDestination, setIntakeDestination] = useState("");
  const [intakeStatus, setIntakeStatus] = useState<"booked" | "in_transit" | "out_for_delivery" | "delivered" | "returned">("booked");
  const [isIntakeStatusDropdownOpen, setIsIntakeStatusDropdownOpen] = useState(false);
  const [intakeReturnReason, setIntakeReturnReason] = useState("");
  const [intakeError, setIntakeError] = useState("");
  const [isAutoNextEnabled, setIsAutoNextEnabled] = useState(true);
  const [recentStagedCode, setRecentStagedCode] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraGuideMode, setCameraGuideMode] = useState<"barcode" | "qr" | "both">("both");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraScanSuccess, setCameraScanSuccess] = useState<{ code: string; carrier: string } | null>(null);
  const [isAutoZoomFocusEnabled, setIsAutoZoomFocusEnabled] = useState<boolean>(true);
  const [cameraZoomLevel, setCameraZoomLevel] = useState<number>(1.0);
  const [isEnhancingDamagedLabel, setIsEnhancingDamagedLabel] = useState<boolean>(false);
  const hwZoomSupportedRef = useRef<{ supported: boolean; min: number; max: number }>({
    supported: false,
    min: 1,
    max: 1,
  });
  const lowQualityStreakRef = useRef<number>(0);
  const emptyFrameStreakRef = useRef<number>(0);
  const currentZoomRef = useRef<number>(1.0);
  const [isCancelIntakeConfirmOpen, setIsCancelIntakeConfirmOpen] = useState(false);
  const intakeInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const scanCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastScannedRef = useRef<{ code: string; timestamp: number }>({ code: "", timestamp: 0 });
  const scanSuccessTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Guaranteed auto-clear for scan success green overlay & border after 750ms
  useEffect(() => {
    if (!cameraScanSuccess) return;
    const timer = setTimeout(() => {
      setCameraScanSuccess(null);
    }, 750);
    return () => clearTimeout(timer);
  }, [cameraScanSuccess]);

  // Auto-filter when typing any letters while Add Consignments carrier dropdown is open
  useEffect(() => {
    if (!isIntakeCourierDropdownOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsIntakeCourierDropdownOpen(false);
        return;
      }
      if (document.activeElement === intakeCourierSearchRef.current) return;
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setIntakeCourierSearch((prev) => prev + e.key);
        intakeCourierSearchRef.current?.focus();
      } else if (e.key === "Backspace") {
        setIntakeCourierSearch((prev) => prev.slice(0, -1));
        intakeCourierSearchRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isIntakeCourierDropdownOpen]);

  const filteredIntakeCouriers = useMemo(() => {
    const q = intakeCourierSearch.trim().toLowerCase();
    if (!q) return COURIER_LIST;
    return COURIER_LIST.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.shortName.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q)
    );
  }, [intakeCourierSearch]);

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
    const timersMap = notificationTimersRef.current;
    return () => {
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
      if (scanSuccessTimerRef.current) clearTimeout(scanSuccessTimerRef.current);
      timersMap.forEach((t) => clearTimeout(t));
      timersMap.clear();
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

    // Simulate progress: advance shipments towards delivery
    setTimeout(() => {
      setShipments((prev) => {
        let updatedCount = 0;
        const newlyDeliveredShipments: BulkShipment[] = [];
        const nextList = prev.map((item) => {
          if (item.status === "out_for_delivery" && updatedCount < 2) {
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
          if (item.status === "booked" && updatedCount === 0) {
            updatedCount++;
            return {
              ...item,
              status: "in_transit" as const,
              statusText: "Dispatched from Origin Hub",
              lastUpdated: "Just Now",
            };
          }
          return item;
        });

        if (newlyDeliveredShipments.length > 0) {
          playChime(true);
          pushDeliveredNotifications(newlyDeliveredShipments);

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
  }, [checkIntervalSec, playChime, pushDeliveredNotifications]);

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
    statusOverride?: "booked" | "in_transit" | "out_for_delivery" | "delivered" | "returned",
    returnReasonOverride?: string,
    scanSource: "manual" | "camera" = "manual"
  ) => {
    const identification = identifyAndValidateConsignment(awbToStage);
    if (!identification.isValid) {
      setIntakeError(
        identification.error ||
          "Invalid Consignment ID format. Expected 8–22 alphanumeric characters (e.g. EK123456789IN)."
      );
      playChime(false);
      return;
    }

    const cleanNum = identification.normalized;

    // Check duplicate in currently staged list
    if (stagedConsignments.some((s) => s.trackingNumber === cleanNum)) {
      setIntakeError(`AWB ${cleanNum} is already in your staged review list.`);
      return;
    }

    setIntakeError("");

    const detected = identification.courier || autoDetectCourier(cleanNum);
    // Logically identify carrier from Consignment ID format & length unless explicitly overridden
    const chosenCourier = courierOverride
      ? (COURIER_MAP[courierOverride] || detected || COURIER_LIST[0])
      : (detected || (intakeCourier && COURIER_MAP[intakeCourier]) || COURIER_LIST[0]);

    if (detected && detected.id !== intakeCourier) {
      setIntakeCourier(detected.id);
    }

    const isReturnedSim = cleanNum.includes("RT") || cleanNum.includes("RETURN");
    // Respect user-selected status in Add Consignment dropdown (including Booked), unless RTO prefix is scanned in camera mode
    const finalStatus: BulkShipment["status"] =
      statusOverride ||
      (scanSource === "camera" && isReturnedSim ? "returned" : intakeStatus);

    const resolvedDest = destinationOverride?.trim() || intakeDestination.trim() || "Destination Center";
    const resolvedOrigin = "Origin Booking Facility";

    const statusMetaMap: Record<
      BulkShipment["status"],
      { statusText: string; lastLocation: string }
    > = {
      booked: {
        statusText: "Consignment Booked at Origin",
        lastLocation: resolvedOrigin,
      },
      in_transit: {
        statusText: "Active In-Transit Scan",
        lastLocation: "Regional Sort Hub",
      },
      out_for_delivery: {
        statusText: "Out for Delivery Today",
        lastLocation: `${resolvedDest} Delivery Hub`,
      },
      delivered: {
        statusText: "Delivered to Recipient",
        lastLocation: resolvedDest,
      },
      returned: {
        statusText: "Returned to Shipper (RTO)",
        lastLocation: "Return Processing Hub",
      },
    };

    const meta = statusMetaMap[finalStatus];

    const newStaged: BulkShipment = {
      id: `staged-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      trackingNumber: cleanNum,
      courierId: chosenCourier.id,
      courierName: chosenCourier.name,
      status: finalStatus,
      statusText: meta.statusText,
      origin: resolvedOrigin,
      destination: resolvedDest,
      articleType: finalStatus === "booked" ? "Booked Consignment" : "Registered Consignment",
      weight: "250 g",
      lastUpdated: "Staged Just Now",
      lastLocation: meta.lastLocation,
      recipientName: recipientOverride?.trim() || intakeRecipient.trim() || undefined,
      returnReason: finalStatus === "returned" ? (returnReasonOverride || intakeReturnReason.trim() || "Delivery Attempt Failed") : undefined,
    };

    setStagedConsignments((prev) => [newStaged, ...prev]);
    playChime(true);
    setRecentStagedCode(cleanNum);
    setTimeout(() => setRecentStagedCode(null), 3000);

    // If scanned from camera, NEVER focus the text input so the mobile keyboard does not open!
    if (scanSource === "camera" || isCameraActive) {
      if (isAutoNextEnabled) {
        setIntakeAwb("");
      }
      if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      return;
    }

    // Manual / hardware input Auto-Next handling: if ON, clear input and refocus for next scan
    if (isAutoNextEnabled) {
      setIntakeAwb("");
      setIntakeRecipient("");
      setIntakeDestination("");
      setIntakeReturnReason("");
      if (intakeInputRef.current) {
        intakeInputRef.current.focus();
      }
    } else {
      if (intakeInputRef.current) {
        intakeInputRef.current.select();
      }
    }
  }, [stagedConsignments, intakeCourier, intakeStatus, intakeDestination, intakeRecipient, intakeReturnReason, isAutoNextEnabled, isCameraActive, playChime]);

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

  // Update status for a staged item in review list
  const handleUpdateStagedStatus = (
    id: string,
    newStatus: "booked" | "in_transit" | "out_for_delivery" | "delivered" | "returned"
  ) => {
    setStagedConsignments((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const statusText =
          newStatus === "booked"
            ? "Consignment Booked at Origin"
            : newStatus === "delivered"
            ? "Delivered to Recipient"
            : newStatus === "out_for_delivery"
            ? "Out for Delivery Today"
            : newStatus === "returned"
            ? "Returned to Shipper (RTO)"
            : "Active In-Transit Scan";
        const lastLocation =
          newStatus === "booked"
            ? item.origin || "Origin Booking Facility"
            : newStatus === "delivered"
            ? item.destination
            : newStatus === "out_for_delivery"
            ? `${item.destination} Delivery Hub`
            : newStatus === "returned"
            ? "Return Processing Hub"
            : "Regional Sort Hub";
        return {
          ...item,
          status: newStatus,
          statusText,
          lastLocation,
        };
      })
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
    setIsCancelIntakeConfirmOpen(false);
    setIsAddConsignmentsModalOpen(false);
  };

  // Stop camera stream helper (preserves staged consignments for review)
  const stopCameraStreamOnly = useCallback(() => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    }
    setIsCameraActive(false);
    setCameraError(null);
    setCameraScanSuccess(null);
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, []);

  // Open Separate Camera Scanner Only (dismisses keyboard immediately)
  const handleToggleCamera = () => {
    if (isCameraActive) {
      stopCameraStreamOnly();
    } else {
      if (intakeInputRef.current) {
        intakeInputRef.current.blur();
      }
      if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      setCameraError(null);
      setCameraScanSuccess(null);
      setIsCameraActive(true);
    }
  };

  // Navigate to Separate Standalone Camera Scan Page (/scan)
  const handleOpenSeparateCameraPage = useCallback(() => {
    stopCameraStreamOnly();
    try {
      localStorage.setItem("trackflow_staged_consignments", JSON.stringify(stagedConsignments));
      sessionStorage.setItem(
        "trackflow_scan_context",
        JSON.stringify({
          mode: "bulk",
          defaultStatus: intakeStatus,
          defaultCourierId: "auto",
        })
      );
    } catch {}
    router.push("/scan");
  }, [stopCameraStreamOnly, stagedConsignments, intakeStatus, router]);

  // Check if returning from the dedicated /scan camera page with staged consignments for review
  useEffect(() => {
    try {
      const rawReturn = sessionStorage.getItem("trackflow_scan_return");
      if (rawReturn) {
        const parsed = JSON.parse(rawReturn);
        if (parsed.target === "bulk_review") {
          sessionStorage.removeItem("trackflow_scan_return");
          const rawStaged = localStorage.getItem("trackflow_staged_consignments");
          if (rawStaged) {
            const list = JSON.parse(rawStaged);
            if (Array.isArray(list) && list.length > 0) {
              setTimeout(() => {
                setStagedConsignments(list);
                setIsCameraActive(false);
                setIsAddConsignmentsModalOpen(true);
              }, 0);
            }
            localStorage.removeItem("trackflow_staged_consignments");
          }
        }
      }
    } catch {
      // ignore
    }
  }, []);

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

  // Apply hardware camera zoom & focus sensitivity constraints when available
  const applyInlineCameraZoomAndFocus = useCallback((nextZoom: number) => {
    const clamped = Number(Math.min(2.4, Math.max(1.0, nextZoom)).toFixed(2));
    currentZoomRef.current = clamped;
    setCameraZoomLevel(clamped);

    const stream = cameraStreamRef.current;
    if (!stream) return;
    const [track] = stream.getVideoTracks();
    if (!track || typeof track.applyConstraints !== "function") return;

    try {
      const advancedConstraints: Record<string, unknown> = {};
      if (hwZoomSupportedRef.current.supported) {
        const { min, max } = hwZoomSupportedRef.current;
        advancedConstraints.zoom = Math.min(max, Math.max(min, clamped));
      }
      const capabilities =
        typeof track.getCapabilities === "function"
          ? (track.getCapabilities() as Record<string, unknown>)
          : {};
      if (Array.isArray(capabilities.focusMode) && capabilities.focusMode.includes("continuous")) {
        advancedConstraints.focusMode = "continuous";
      }
      if (Object.keys(advancedConstraints).length > 0) {
        track
          .applyConstraints({
            advanced: [advancedConstraints as MediaTrackConstraintSet],
          })
          .catch(() => {});
      }
    } catch {
      // fallback to optical ROI crop zoom
    }
  }, []);

  // Real-time Camera Stream + Strictly Guide-Only ROI Cropping + Auto-Zoom/Focus Damaged Label Enhancer
  useEffect(() => {
    if (!isCameraActive) return;

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

    let nativeDetector: {
      detect: (source: HTMLCanvasElement) => Promise<Array<{ rawValue?: string }>>;
    } | null = null;
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

    const handleDetectedValue = (rawVal: string): boolean => {
      const code = extractCleanScannedCode(rawVal);
      if (!code || code.length < 4) return false;

      const now = Date.now();
      if (
        lastScannedRef.current.code === code &&
        now - lastScannedRef.current.timestamp < 2200
      ) {
        return true;
      }
      lastScannedRef.current = { code, timestamp: now };
      lowQualityStreakRef.current = 0;
      setIsEnhancingDamagedLabel(false);

      const detectedCarrier = autoDetectCourier(code);
      if (!isAutoNextEnabled) {
        setIntakeAwb(code);
      }
      handleStageConsignment(code, detectedCarrier?.id, undefined, undefined, undefined, undefined, "camera");

      setCameraScanSuccess({
        code,
        carrier: detectedCarrier?.shortName || detectedCarrier?.name || "Auto-Detected",
      });
      if (scanSuccessTimerRef.current) clearTimeout(scanSuccessTimerRef.current);
      scanSuccessTimerRef.current = setTimeout(() => {
        setCameraScanSuccess(null);
      }, 1400);
      return true;
    };

    const tryDecodeROI = async (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): Promise<boolean> => {
      const w = canvas.width;
      const h = canvas.height;

      if (nativeDetector) {
        try {
          const detected = await nativeDetector.detect(canvas);
          if (detected && detected.length > 0 && detected[0].rawValue) {
            if (handleDetectedValue(detected[0].rawValue)) return true;
          }
        } catch {}
      }

      if (cameraGuideMode !== "barcode") {
        try {
          const imageData = ctx.getImageData(0, 0, w, h);
          const qrResult = jsQR(imageData.data, w, h, {
            inversionAttempts: "attemptBoth",
          });
          if (qrResult && qrResult.data) {
            if (handleDetectedValue(qrResult.data)) return true;
          }
        } catch {}
      }

      try {
        const luminanceSource = new HTMLCanvasElementLuminanceSource(canvas);
        const binaryBitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource));
        const result = zxingReader.decodeWithState(binaryBitmap);
        if (result && result.getText()) {
          if (handleDetectedValue(result.getText())) return true;
        }
      } catch {}

      return false;
    };

    const startCameraAndScanner = async () => {
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
              width: { ideal: 1920 },
              height: { ideal: 1080 },
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
            }
            if (Array.isArray(caps.focusMode) && caps.focusMode.includes("continuous")) {
              videoTrack
                .applyConstraints({
                  advanced: [{ focusMode: "continuous" } as unknown as MediaTrackConstraintSet],
                })
                .catch(() => {});
            }
          } catch {}
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }

        if (!scanCanvasRef.current) {
          scanCanvasRef.current = document.createElement("canvas");
        }

        // Continuous frame decoding every 180ms strictly inside the Guide Box ROI
        scanIntervalId = setInterval(async () => {
          if (isCancelled || !videoRef.current || !scanCanvasRef.current) return;
          const video = videoRef.current;
          if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) return;

          const vw = video.videoWidth;
          const vh = video.videoHeight;

          // Calculate source crop strictly matching the Guide Frame
          let roiWidthRatio = 0.76;
          let roiHeightRatio = 0.48;
          if (cameraGuideMode === "barcode") {
            roiWidthRatio = 0.78;
            roiHeightRatio = 0.28;
          } else if (cameraGuideMode === "qr") {
            const squareSide = Math.min(vw, vh) * 0.54;
            roiWidthRatio = squareSide / vw;
            roiHeightRatio = squareSide / vh;
          }

          const effectiveDigitalZoom = hwZoomSupportedRef.current.supported
            ? 1.0
            : currentZoomRef.current;

          const cropW = Math.max(64, Math.floor((vw * roiWidthRatio) / effectiveDigitalZoom));
          const cropH = Math.max(64, Math.floor((vh * roiHeightRatio) / effectiveDigitalZoom));
          const cropX = Math.max(0, Math.floor((vw - cropW) / 2));
          const cropY = Math.max(0, Math.floor((vh - cropH) / 2));

          const canvas = scanCanvasRef.current;
          const maxTargetDim = 720;
          const scale = Math.min(1.5, maxTargetDim / Math.max(cropW, cropH));
          const w = Math.max(64, Math.floor(cropW * scale));
          const h = Math.max(64, Math.floor(cropH * scale));

          if (canvas.width !== w) canvas.width = w;
          if (canvas.height !== h) canvas.height = h;

          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (!ctx) return;

          // Draw ONLY the cropped Guide Box region
          ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, w, h);

          // Pass 1: Standard decode on Guide ROI
          if (await tryDecodeROI(canvas, ctx)) return;

          // Pass 2: Analyze Guide ROI for low-quality / wrinkled / damaged label & apply enhancement
          const imgData = ctx.getImageData(0, 0, w, h);
          const data = imgData.data;
          const pixelCount = w * h;
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
          let gradientSum = 0;
          let sampleCount = 0;

          for (let y = Math.floor(h * 0.2); y < Math.floor(h * 0.8); y += 2) {
            const rowOffset = y * w;
            for (let x = Math.floor(w * 0.15); x < Math.floor(w * 0.85) - 1; x += 2) {
              const idx = rowOffset + x;
              const grad = Math.max(
                Math.abs(lum[idx] - lum[idx + 1]),
                y + 1 < h ? Math.abs(lum[idx] - lum[idx + w]) : 0
              );
              gradientSum += grad;
              sampleCount++;
              if (grad > 18) edgeTransitions++;
            }
          }

          const edgeDensity = sampleCount > 0 ? edgeTransitions / sampleCount : 0;
          const avgGradient = sampleCount > 0 ? gradientSum / sampleCount : 0;
          const hasLabelCandidate = edgeDensity > 0.065 && contrastSpan > 28;
          const isLowQuality = hasLabelCandidate && (avgGradient < 26 || contrastSpan < 145);

          if (hasLabelCandidate) {
            emptyFrameStreakRef.current = 0;
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
                const finalVal =
                  sharpened < 120 ? Math.max(0, sharpened - 22) : Math.min(255, sharpened + 22);
                const idx = p * 4;
                data[idx] = finalVal;
                data[idx + 1] = finalVal;
                data[idx + 2] = finalVal;
              }
            }
            ctx.putImageData(imgData, 0, 0);

            if (await tryDecodeROI(canvas, ctx)) return;

            if (isAutoZoomFocusEnabled && isLowQuality) {
              lowQualityStreakRef.current += 1;
              setIsEnhancingDamagedLabel(true);
              if (lowQualityStreakRef.current >= 3) {
                lowQualityStreakRef.current = 0;
                const currentZ = currentZoomRef.current;
                const nextZ =
                  currentZ < 1.3
                    ? 1.35
                    : currentZ < 1.65
                    ? 1.7
                    : currentZ < 2.0
                    ? 2.0
                    : 1.2;
                applyInlineCameraZoomAndFocus(nextZ);
              }
            }
          } else {
            emptyFrameStreakRef.current += 1;
            if (emptyFrameStreakRef.current >= 8) {
              setIsEnhancingDamagedLabel(false);
              if (isAutoZoomFocusEnabled && currentZoomRef.current > 1.05) {
                applyInlineCameraZoomAndFocus(1.0);
              }
            }
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
  }, [
    isCameraActive,
    cameraGuideMode,
    isAutoNextEnabled,
    isAutoZoomFocusEnabled,
    extractCleanScannedCode,
    handleStageConsignment,
    applyInlineCameraZoomAndFocus,
  ]);

  // Force discard all staged / typed intake data and close modal
  const handleForceDiscardAndCloseIntake = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    }
    setIsCameraActive(false);
    setCameraScanSuccess(null);
    setCameraError(null);
    setStagedConsignments([]);
    setIntakeAwb("");
    setIntakeRecipient("");
    setIntakeDestination("");
    setIntakeReturnReason("");
    setIsCancelIntakeConfirmOpen(false);
    setIsAddConsignmentsModalOpen(false);
    setIsIntakeCourierDropdownOpen(false);
    setIsIntakeStatusDropdownOpen(false);
    setIntakeError("");
    setRecentStagedCode(null);
  };

  // Safe Close / Cancel Handler: Ask before cancel if there is any staged or typed data (both in Manual & Camera Scan)
  const handleRequestCancelIntake = () => {
    const hasUnsavedData = stagedConsignments.length > 0 || intakeAwb.trim().length > 0;
    if (hasUnsavedData) {
      setIsCancelIntakeConfirmOpen(true);
      return;
    }
    handleForceDiscardAndCloseIntake();
  };

  // Cancel button inside Separate Camera Scanner: asks before canceling if data exists, or exits camera if empty
  const handleRequestCancelFromCamera = () => {
    const hasUnsavedData = stagedConsignments.length > 0 || intakeAwb.trim().length > 0;
    if (hasUnsavedData) {
      setIsCancelIntakeConfirmOpen(true);
      return;
    }
    stopCameraStreamOnly();
  };

  // Platform-Aware File Format Validation & Intelligent Column Analyzer for CSV / Excel / Google Sheets
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
        "Invalid file format: Please upload a CSV (.csv), Microsoft Excel (.xlsx, .xls), or exported Google Sheets file."
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Security Check 2: File Size Limit (Max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File size exceeds 5MB limit. Please upload a CSV or spreadsheet under 5MB.");
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
          throw new Error("No worksheets or CSV rows found in this file.");
        }

        const worksheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1, defval: "" });

        if (rows.length < 1) {
          throw new Error("The file contains no rows. Please add tracking numbers.");
        }

        // Intelligent Platform Header Analysis (supports TrackFlow Bulk CSV Export, custom CSVs, and Excel sheets)
        const firstRow = (rows[0] || []) as unknown[];
        const headerRow = firstRow.map((h) =>
          String(h || "")
            .toLowerCase()
            .replace(/[\s_-]+/g, " ")
            .trim()
        );
        const hasHeader = headerRow.some(
          (h) =>
            h.includes("track") ||
            h.includes("awb") ||
            h.includes("consign") ||
            h.includes("number") ||
            h.includes("courier") ||
            h.includes("carrier") ||
            h.includes("recipient") ||
            h.includes("status") ||
            h.includes("dest")
        );

        let awbColIdx = headerRow.findIndex(
          (h) => h.includes("track") || h.includes("awb") || h.includes("consign") || h === "id" || h.includes("number")
        );
        if (awbColIdx === -1) awbColIdx = 0;

        const courierCodeColIdx = headerRow.findIndex(
          (h) => h === "courier code" || h === "carrier code" || h === "courier id"
        );
        const courierNameColIdx = headerRow.findIndex(
          (h) => h.includes("courier") || h.includes("carrier") || h.includes("partner")
        );
        const statusColIdx = headerRow.findIndex(
          (h) => h === "status" || h === "delivery status" || h === "shipment status" || h === "current status"
        );
        const statusTextColIdx = headerRow.findIndex(
          (h) => h.includes("status text") || h.includes("last event") || h.includes("remark") || h.includes("notes")
        );
        const originColIdx = headerRow.findIndex((h) => h.includes("origin") || h.includes("source") || h.includes("from"));
        const destColIdx = headerRow.findIndex((h) => h.includes("dest") || h.includes("city") || h.includes("address") || h.includes("to"));
        const recipientColIdx = headerRow.findIndex((h) => h.includes("recipient") || h.includes("customer") || h.includes("addressee") || h.includes("name"));
        const articleTypeColIdx = headerRow.findIndex((h) => h.includes("article") || h.includes("type") || h.includes("service"));
        const weightColIdx = headerRow.findIndex((h) => h.includes("weight"));
        const returnReasonColIdx = headerRow.findIndex((h) => h.includes("return") || h.includes("rto"));
        const batchNameColIdx = headerRow.findIndex((h) => h.includes("batch name") || h === "batch");

        const startIdx = hasHeader ? 1 : 0;
        const parsedItems: BulkShipment[] = [];
        let detectedBatchNameFromCsv = "";

        for (let i = startIdx; i < rows.length; i++) {
          const row = rows[i] as unknown[];
          if (!row || row.length === 0) continue;

          const rawAwb = String(row[awbColIdx] || "")
            .trim()
            .replace(/^["']|["']$/g, "")
            .toUpperCase();
          if (!rawAwb || rawAwb.length < 4) continue;

          // Deduplicate within this parsed batch
          if (parsedItems.some((s) => s.trackingNumber === rawAwb)) {
            continue;
          }

          // Match courier by code, name, shortName, or AWB auto-detection
          const rawCourierCode = courierCodeColIdx !== -1 ? String(row[courierCodeColIdx] || "").trim().toLowerCase() : "";
          const rawCourierAny = courierNameColIdx !== -1 ? String(row[courierNameColIdx] || "").trim().toLowerCase() : "";
          const courierQuery = rawCourierCode || rawCourierAny;

          const matchedCourierFromList = courierQuery
            ? COURIER_MAP[courierQuery] ||
              COURIER_LIST.find(
                (c) =>
                  c.id.toLowerCase() === courierQuery ||
                  c.name.toLowerCase().includes(courierQuery) ||
                  c.shortName.toLowerCase() === courierQuery
              )
            : null;
          const detected = matchedCourierFromList || autoDetectCourier(rawAwb) || COURIER_LIST[0];

          const rawRecipient = recipientColIdx !== -1 ? String(row[recipientColIdx] || "").trim() : "";
          const rawOrigin = originColIdx !== -1 ? String(row[originColIdx] || "").trim() : "";
          const rawDest = destColIdx !== -1 ? String(row[destColIdx] || "").trim() : "";
          const rawArticle = articleTypeColIdx !== -1 ? String(row[articleTypeColIdx] || "").trim() : "";
          const rawWeight = weightColIdx !== -1 ? String(row[weightColIdx] || "").trim() : "";
          const rawStatus = statusColIdx !== -1 ? String(row[statusColIdx] || "").trim().toLowerCase() : "";
          const rawStatusText = statusTextColIdx !== -1 ? String(row[statusTextColIdx] || "").trim() : "";
          const rawReturnReason = returnReasonColIdx !== -1 ? String(row[returnReasonColIdx] || "").trim() : "";
          const rawBatchName = batchNameColIdx !== -1 ? String(row[batchNameColIdx] || "").trim() : "";
          if (rawBatchName && !detectedBatchNameFromCsv && rawBatchName.toLowerCase() !== "standard") {
            detectedBatchNameFromCsv = rawBatchName;
          }

          // Platform-aware Status Normalization
          let normalizedStatus: BulkShipment["status"] = "in_transit";
          if (rawStatus) {
            if (rawStatus.includes("book") || rawStatus.includes("manifest") || rawStatus.includes("picked")) {
              normalizedStatus = "booked";
            } else if (rawStatus.includes("deliver") && !rawStatus.includes("out") && !rawStatus.includes("undeliver")) {
              normalizedStatus = "delivered";
            } else if (rawStatus.includes("out") || rawStatus.includes("ofd") || rawStatus.includes("agent")) {
              normalizedStatus = "out_for_delivery";
            } else if (rawStatus.includes("return") || rawStatus.includes("rto") || rawStatus.includes("refused")) {
              normalizedStatus = "returned";
            } else {
              normalizedStatus = "in_transit";
            }
          } else {
            const isReturnedSim = rawAwb.includes("RT") || rawAwb.includes("RETURN");
            const isDeliveredSim = rawAwb.endsWith("IN") && !isReturnedSim;
            normalizedStatus = isReturnedSim ? "returned" : isDeliveredSim ? "delivered" : "in_transit";
          }

          const defaultStatusText =
            normalizedStatus === "booked"
              ? "Consignment Booked at Origin"
              : normalizedStatus === "delivered"
              ? "Delivered to Recipient"
              : normalizedStatus === "out_for_delivery"
              ? "Out for Delivery Today"
              : normalizedStatus === "returned"
              ? "Returned to Origin Hub (RTO)"
              : "Active In-Transit Scan";

          parsedItems.push({
            id: `bulk-import-${Date.now()}-${i}`,
            trackingNumber: rawAwb,
            courierId: detected.id,
            courierName: detected.name,
            status: normalizedStatus,
            statusText: rawStatusText || defaultStatusText,
            origin: rawOrigin || "Origin Logistics Facility",
            destination: rawDest || "Destination Center",
            articleType: rawArticle || (fileName.endsWith(".csv") ? "CSV Import" : "Bulk Import"),
            weight: rawWeight || "320 g",
            lastUpdated: "Staged for Review",
            lastLocation:
              normalizedStatus === "booked"
                ? rawOrigin || "Origin Booking Facility"
                : normalizedStatus === "returned"
                ? "Return Hub"
                : normalizedStatus === "delivered"
                ? rawDest || "Destination Center"
                : "Regional Sort Facility",
            recipientName: rawRecipient && rawRecipient !== "N/A" ? rawRecipient : "Recipient",
            returnReason:
              normalizedStatus === "returned"
                ? rawReturnReason || "Customer Refused / RTO"
                : undefined,
            isImported: true,
          });
        }

        if (parsedItems.length === 0) {
          throw new Error("No valid tracking numbers were found in this file.");
        }

        // SHOW REVIEW BEFORE IMPORT (DO NOT IMPORT DIRECTLY)
        const cleanFile = file.name.replace(/\.(xlsx|xls|csv)$/i, "");
        setPreviewFileName(file.name);
        setPreviewBatchName(
          detectedBatchNameFromCsv || `Batch #${uniqueBatches.length + 1} • ${cleanFile || "Bulk Import"}`
        );
        setPreviewShipments(parsedItems);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } catch (err: unknown) {
        setUploadError((err as Error)?.message || "Failed to parse file. Please verify the CSV/Excel format.");
      } finally {
        setIsUploading(false);
      }
    };

    reader.onerror = () => {
      setUploadError("Could not read the uploaded file. Please verify it is a valid CSV or Excel file.");
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
    newStatus: "booked" | "in_transit" | "out_for_delivery" | "delivered" | "returned"
  ) => {
    if (!previewShipments) return;
    setPreviewShipments(
      previewShipments.map((item) =>
        item.id === id
          ? {
              ...item,
              status: newStatus,
              statusText:
                newStatus === "booked"
                  ? "Consignment Booked at Origin"
                  : newStatus === "delivered"
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
      setStatusFilter("all");
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
        ["Tracking_Number", "Courier_Code", "Status", "Recipient_Name", "Origin", "Destination_City", "Weight", "Status_Text"],
        ["EL855948618IN", "speedpost", "in_transit", "Dr. Rajesh Kumar", "Kochi, Kerala", "Thrissur, Kerala", "45 g", "Standard Speed Post Document"],
        ["B4000211866", "dtdc", "booked", "Ananya Sharma", "Hyderabad, TS", "Bangalore, Karnataka", "1.2 kg", "Consignment Booked at Origin"],
        ["FMPP4397267510", "ekart", "out_for_delivery", "Vikram Patel", "Surat, Gujarat", "Ahmedabad, Gujarat", "500 g", "Out for Delivery Today"],
        ["12345678901", "bluedart", "delivered", "Pooja Verma", "Delhi Hub", "Mumbai, Maharashtra", "200 g", "Delivered to Recipient"],
        ["RT855948618IN", "speedpost", "returned", "K. Ramanathan", "Madurai", "Chennai, Tamil Nadu", "110 g", "Returned to Shipper (RTO)"],
      ];

      const ws = XLSX.utils.aoa_to_sheet(templateData);

      ws["!cols"] = [
        { wch: 18 },
        { wch: 14 },
        { wch: 16 },
        { wch: 20 },
        { wch: 18 },
        { wch: 22 },
        { wch: 12 },
        { wch: 30 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "TrackFlow_Template");

      XLSX.writeFile(wb, "TrackFlow_Bulk_Shipments_Template.xlsx");
    } catch (e) {
      console.error("Failed to generate sample Excel workbook:", e);
    }
  };

  // Generate & Download Platform-Ready Sample CSV Template (.csv)
  const handleDownloadSampleCsvTemplate = () => {
    try {
      const headers = [
        "Tracking_Number",
        "Courier_Code",
        "Courier_Name",
        "Status",
        "Status_Text",
        "Origin",
        "Destination",
        "Recipient_Name",
        "Article_Type",
        "Weight",
      ];
      const sampleRows = [
        ["EL855948618IN", "speedpost", "India Post Speed Post", "in_transit", "Active In-Transit Scan", "Kochi Hub", "Thrissur, Kerala", "Dr. Rajesh Kumar", "Speed Post Parcel", "45 g"],
        ["B4000211866", "dtdc", "DTDC Express", "booked", "Consignment Booked at Origin", "Hyderabad Hub", "Bangalore, Karnataka", "Ananya Sharma", "Express Cargo", "1.2 kg"],
        ["FMPP4397267510", "ekart", "Ekart Logistics", "out_for_delivery", "Out for Delivery Today", "Surat Facility", "Ahmedabad, Gujarat", "Vikram Patel", "E-Commerce Parcel", "500 g"],
        ["12345678901", "bluedart", "Blue Dart Express", "delivered", "Delivered to Recipient", "New Delhi", "Mumbai, Maharashtra", "Pooja Verma", "Priority Air", "200 g"],
      ];

      const escapeCsvVal = (val: string) => {
        const str = String(val ?? "");
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const csvString = [
        headers.join(","),
        ...sampleRows.map((r) => r.map(escapeCsvVal).join(",")),
      ].join("\n");

      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "TrackFlow_Platform_Sample.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      playChime(false);
    } catch (e) {
      console.error("Failed to generate sample CSV:", e);
    }
  };

  // Bulk Export Feature: Download all tracked shipment data within a selected batch in chosen file extension (.csv, .xlsx, .xls, .json, or .txt)
  const handleExportBatchCsv = (overrideBatchId?: string, overrideFormat?: string) => {
    const targetId = overrideBatchId || exportBatchTargetId || selectedBatchId || "all";
    const listToExport = activeShipments.filter((item) => {
      if (targetId === "all") return true;
      if (targetId === "imported_all") return !!item.isImported;
      if (targetId === "direct_only") return !item.isImported;
      return item.batchId === targetId;
    });

    if (listToExport.length === 0) {
      setBatchCsvExportMsg("No consignments found in the selected batch scope to export.");
      setTimeout(() => setBatchCsvExportMsg(null), 5000);
      return;
    }

    const rawChosenExt = overrideFormat || exportFileExtension || "csv";
    const cleanExt = rawChosenExt.trim().replace(/^\.+/, "").toLowerCase() || "csv";

    const exportedAtIso = new Date().toISOString();
    const dateStr = exportedAtIso.split("T")[0];

    const batchObj = uniqueBatches.find((b) => b.id === targetId);
    const safeBatchSlug = batchObj
      ? batchObj.name.replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 32)
      : targetId === "imported_all"
      ? "All_Imported_Batches"
      : targetId === "direct_only"
      ? "Direct_Entries"
      : "All_Shipments";

    const fileBaseName = `TrackFlow_Bulk_Export_${safeBatchSlug}_${dateStr}`;

    const structuredRows = listToExport.map((s) => ({
      Tracking_Number: s.trackingNumber,
      Courier_Code: s.courierId,
      Courier_Name: s.courierName,
      Status: s.status,
      Status_Text: s.statusText,
      Origin: s.origin,
      Destination: s.destination,
      Recipient_Name: s.recipientName || "",
      Article_Type: s.articleType,
      Weight: s.weight,
      Last_Updated: s.lastUpdated,
      Last_Location: s.lastLocation,
      Return_Reason: s.returnReason || "",
      Batch_ID: s.batchId || "direct",
      Batch_Name: s.batchName || "Direct Dashboard Entry",
      Imported_At: s.importedAt || "Direct",
      Exported_At: exportedAtIso,
    }));

    // Handle Excel (.xlsx or .xls) via SheetJS
    if (cleanExt === "xlsx" || cleanExt === "xls") {
      const worksheet = XLSX.utils.json_to_sheet(structuredRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Shipments");
      XLSX.writeFile(workbook, `${fileBaseName}.${cleanExt}`, {
        bookType: cleanExt === "xls" ? "biff8" : "xlsx",
      });
    } else if (cleanExt === "json") {
      const jsonContent = JSON.stringify(
        {
          exportedAt: exportedAtIso,
          batchScope: batchObj ? batchObj.name : safeBatchSlug,
          totalRecords: structuredRows.length,
          shipments: structuredRows,
        },
        null,
        2
      );
      const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileBaseName}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else if (cleanExt === "txt") {
      const headers = Object.keys(structuredRows[0]);
      const txtLines = [
        `TRACKFLOW ENTERPRISE BULK SHIPMENT EXPORT (${exportedAtIso})`,
        `Batch Scope: ${batchObj ? batchObj.name : safeBatchSlug.replace(/_/g, " ")} | Total Consignments: ${structuredRows.length}`,
        "=".repeat(110),
        headers.join(" | "),
        "-".repeat(110),
        ...structuredRows.map((r) => Object.values(r).join(" | ")),
      ];
      const blob = new Blob([txtLines.join("\n")], { type: "text/plain;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileBaseName}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      // Default delimiter format: .csv (comma)
      const delimiter = ",";
      const headers = Object.keys(structuredRows[0]);
      const escapeDelimitedVal = (val: string | undefined) => {
        const str = String(val ?? "");
        if (str.includes(delimiter) || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };
      const lines = [
        headers.join(delimiter),
        ...structuredRows.map((r) =>
          Object.values(r)
            .map((v) => escapeDelimitedVal(String(v)))
            .join(delimiter)
        ),
      ];
      const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileBaseName}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    playChime(true);
    setBatchCsvExportMsg(
      `Exported ${listToExport.length} consignment${listToExport.length > 1 ? "s" : ""} (${
        batchObj ? batchObj.name : safeBatchSlug.replace(/_/g, " ")
      }) as .${cleanExt.toUpperCase()}`
    );
    setTimeout(() => setBatchCsvExportMsg(null), 6000);
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

  // Step 1: Apply Batch Scope ("all" = all shipments, "imported_all" = all imported batches, or a specific batchId)
  const batchScopedShipments = activeShipments.filter((item) => {
    if (selectedBatchId === "all") return true;
    if (selectedBatchId === "imported_all") return !!item.isImported;
    return item.batchId === selectedBatchId;
  });

  // Step 2: Apply Search + Delivery Status Filter on top of the selected Batch Scope
  const filteredShipments = batchScopedShipments.filter((item) => {
    const matchesSearch =
      item.trackingNumber.toLowerCase().includes(searchFilter.toLowerCase()) ||
      item.courierName.toLowerCase().includes(searchFilter.toLowerCase()) ||
      item.destination.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (item.recipientName && item.recipientName.toLowerCase().includes(searchFilter.toLowerCase())) ||
      (item.batchName && item.batchName.toLowerCase().includes(searchFilter.toLowerCase()));

    if (!matchesSearch) return false;

    if (statusFilter === "delivered") return item.status === "delivered";
    if (statusFilter === "out_for_delivery") return item.status === "out_for_delivery";
    if (statusFilter === "in_transit") return item.status === "in_transit";
    if (statusFilter === "returned") return item.status === "returned";
    if (statusFilter === "booked") return item.status === "booked";
    return true;
  });

  // Overall dashboard statistics (for top KPI cards)
  const totalCount = activeShipments.length;
  const deliveredCount = activeShipments.filter((s) => s.status === "delivered").length;
  const outCount = activeShipments.filter((s) => s.status === "out_for_delivery").length;
  const inTransitCount = activeShipments.filter((s) => s.status === "in_transit").length;
  const returnedCount = activeShipments.filter((s) => s.status === "returned").length;
  const bookedCount = activeShipments.filter((s) => s.status === "booked").length;
  const importedCount = activeShipments.filter((s) => s.isImported).length;

  // Scope-aware statistics (reflects either All Shipments or the currently selected Batch)
  const scopedTotalCount = batchScopedShipments.length;
  const scopedDeliveredCount = batchScopedShipments.filter((s) => s.status === "delivered").length;
  const scopedOutCount = batchScopedShipments.filter((s) => s.status === "out_for_delivery").length;
  const scopedInTransitCount = batchScopedShipments.filter((s) => s.status === "in_transit").length;
  const scopedReturnedCount = batchScopedShipments.filter((s) => s.status === "returned").length;
  const scopedBookedCount = batchScopedShipments.filter((s) => s.status === "booked").length;

  // Comprehensive Data Size & Volume Analytics
  const dataAnalytics = useMemo(() => {
    const serialized = JSON.stringify(activeShipments);
    let usedBytes = serialized.length;
    try {
      if (typeof Blob !== "undefined") {
        usedBytes = new Blob([serialized]).size;
      }
    } catch {}

    const maxQuotaBytes = 5 * 1024 * 1024; // 5 MB LocalStorage standard quota
    const avgBytesPerRecord =
      activeShipments.length > 0 ? Math.max(180, Math.round(usedBytes / activeShipments.length)) : 320;
    const quotaPercent = Math.min(100, Number(((usedBytes / maxQuotaBytes) * 100).toFixed(2)));
    const estimatedRemainingRecords = Math.max(
      0,
      Math.floor((maxQuotaBytes - usedBytes) / avgBytesPerRecord)
    );

    const formattedSize =
      usedBytes < 1024
        ? `${usedBytes} B`
        : usedBytes < 1024 * 1024
        ? `${(usedBytes / 1024).toFixed(2)} KB`
        : `${(usedBytes / (1024 * 1024)).toFixed(2)} MB`;

    const carrierCounts = new Map<string, { name: string; count: number }>();
    activeShipments.forEach((s) => {
      const prev = carrierCounts.get(s.courierId);
      if (prev) {
        prev.count += 1;
      } else {
        carrierCounts.set(s.courierId, { name: s.courierName, count: 1 });
      }
    });

    const carrierBreakdown = Array.from(carrierCounts.entries())
      .map(([id, info]) => ({
        id,
        name: info.name,
        count: info.count,
        percent: activeShipments.length > 0 ? Math.round((info.count / activeShipments.length) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      totalRecords: activeShipments.length,
      importedRecords: importedCount,
      directRecords: Math.max(0, activeShipments.length - importedCount),
      batchesCount: uniqueBatches.length,
      usedBytes,
      formattedSize,
      avgBytesPerRecord,
      quotaPercent,
      estimatedRemainingRecords,
      carrierBreakdown,
    };
  }, [activeShipments, importedCount, uniqueBatches.length]);

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
      {/* TOP-RIGHT STACKED AUTO-HIDING DELIVERED NOTIFICATION CARDS     */}
      {/* ============================================================== */}
      {deliveredNotifications.length > 0 && (
        <div className="fixed top-20 right-4 z-[60] flex flex-col gap-2.5 w-[calc(100vw-2rem)] sm:w-96 pointer-events-none">
          {deliveredNotifications.map((notif) => (
            <div
              key={notif.id}
              className="pointer-events-auto rounded-2xl border border-emerald-300/90 bg-white/95 dark:border-emerald-800 dark:bg-slate-900/95 p-3.5 shadow-xl backdrop-blur-md flex items-start justify-between gap-3 animate-in fade-in slide-in-from-right-5 duration-200"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs shrink-0 mt-0.5">
                  <CheckCircle2 className="h-4 w-4 stroke-[2.5]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                      Shipment Delivered
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      • {notif.timestamp}
                    </span>
                  </div>
                  <div className="text-xs font-black font-mono text-slate-900 dark:text-white truncate mt-0.5">
                    {notif.trackingNumber}
                  </div>
                  <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300 truncate">
                    {notif.courierName} → {notif.destination}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setStatusFilter("delivered");
                        dismissDeliveredNotification(notif.id);
                      }}
                      className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 text-[10px] font-bold shadow-2xs cursor-pointer transition-colors"
                    >
                      View Delivered
                    </button>
                    <span className="text-[10px] text-slate-400">Auto-hides in 6s</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => dismissDeliveredNotification(notif.id)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 cursor-pointer shrink-0"
                title="Dismiss notification"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ============================================================== */}
      {/* 1. UNIFIED RESPONSIVE TOP OPERATIONS CARD (MOBILE & WEBVIEW)   */}
      {/* ============================================================== */}
      <div className="rounded-3xl border border-slate-200/90 bg-white/95 p-4 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900/90 backdrop-blur-md space-y-4">
        {/* Top Row: Brand Kicker + Title on Left, Live Sync Status + Primary Actions on Right */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Title & Live Sync Pill Row (Mobile puts Sync pill top-right alongside title) */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 truncate">
                  Enterprise Logistics Hub
                </span>
              </div>
              <h1 className="text-lg sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                Bulk Shipment Operations
              </h1>
            </div>

            {/* Mobile-First Compact Sync Timer Pill (visible on mobile/tablet right beside title) */}
            <div className="flex lg:hidden items-center gap-1.5 bg-slate-50 dark:bg-slate-800/90 px-2.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700 shrink-0">
              <span
                className={`h-2 w-2 rounded-full shrink-0 ${
                  isAutoCheckEnabled ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                }`}
              />
              <span className="font-mono text-[11px] font-black text-slate-900 dark:text-white tabular-nums">
                {isAutoCheckEnabled ? formatTimer(secondsRemaining) : "Paused"}
              </span>
              <button
                type="button"
                onClick={handleRunAutoCheck}
                disabled={isRefreshing}
                className="p-1 rounded-lg bg-white text-slate-700 hover:text-indigo-600 dark:bg-slate-700 dark:text-slate-200 shadow-2xs cursor-pointer disabled:opacity-50"
                title="Trigger immediate sync check"
              >
                <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin text-indigo-600" : ""}`} />
              </button>
            </div>
          </div>

          {/* Action Toolbar: Symmetrical 2+1 Grid on Mobile, Crisp Horizontal Bar on WebView */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-2.5">
            {/* Desktop Live Sync Timer Pill */}
            <div className="hidden lg:flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-2xs">
              <div className="relative flex h-2.5 w-2.5 shrink-0">
                {isAutoCheckEnabled ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                  </>
                ) : (
                  <span className="inline-flex rounded-full h-2.5 w-2.5 bg-slate-400" />
                )}
              </div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {isAutoCheckEnabled ? "Sync:" : "Paused"}
              </span>
              {isAutoCheckEnabled && (
                <span className="font-mono text-xs font-black text-slate-900 dark:text-white tabular-nums">
                  {formatTimer(secondsRemaining)}
                </span>
              )}
              <button
                type="button"
                onClick={handleRunAutoCheck}
                disabled={isRefreshing}
                className="ml-1 flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-[10px] font-bold text-slate-700 hover:text-indigo-600 dark:bg-slate-700 dark:text-slate-200 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                title="Trigger immediate sync check"
              >
                <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin text-indigo-600" : ""}`} />
                <span>Check Now</span>
              </button>
            </div>

            {/* Unified All-in-One Add Consignments */}
            <button
              type="button"
              onClick={() => {
                setIntakeError("");
                setIntakeAwb("");
                setIntakeStatus("booked");
                setRecentStagedCode(null);
                setIsCancelIntakeConfirmOpen(false);
                setIsCameraActive(false);
                setIsAddConsignmentsModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-800 hover:border-indigo-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 shadow-2xs transition-all cursor-pointer"
              title="Add consignments manually, with barcode scanning devices, or via camera QR / barcode scanning"
            >
              <Plus className="h-4 w-4 text-indigo-600 dark:text-indigo-400 stroke-[2.5] shrink-0" />
              <span className="truncate">Add Consignments</span>
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
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 text-xs font-extrabold text-white shadow-xs transition-all cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4 stroke-[2.4] shrink-0" />
              <span className="truncate">Bulk Import</span>
            </button>
          </div>
        </div>

        {/* Bottom Row of Top Card: Integrated Interactive KPI Status Grid (3x2 on Mobile, 6-Col on WebView) */}
        <div className="pt-3.5 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5">
          {/* Total Tracked */}
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`text-left rounded-2xl border p-2.5 sm:p-3 transition-all cursor-pointer ${
              statusFilter === "all"
                ? "border-indigo-500 bg-indigo-50/70 shadow-2xs dark:border-indigo-500 dark:bg-indigo-950/50"
                : "border-slate-200/80 bg-slate-50/50 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800/40"
            }`}
          >
            <div className="flex items-center justify-between gap-1 text-[10px] sm:text-xs font-bold text-slate-600 dark:text-slate-300">
              <span className="truncate">Total</span>
              <Package className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            </div>
            <div className="mt-1 text-lg sm:text-2xl font-black text-slate-900 dark:text-white tabular-nums leading-none">
              {totalCount}
            </div>
          </button>

          {/* Booked */}
          <button
            type="button"
            onClick={() => setStatusFilter("booked")}
            className={`text-left rounded-2xl border p-2.5 sm:p-3 transition-all cursor-pointer ${
              statusFilter === "booked"
                ? "border-violet-500 bg-violet-50/70 shadow-2xs dark:border-violet-500 dark:bg-violet-950/50"
                : "border-slate-200/80 bg-slate-50/50 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800/40"
            }`}
          >
            <div className="flex items-center justify-between gap-1 text-[10px] sm:text-xs font-bold text-violet-600 dark:text-violet-400">
              <span className="truncate">Booked</span>
              <Package className="h-3.5 w-3.5 shrink-0" />
            </div>
            <div className="mt-1 text-lg sm:text-2xl font-black text-violet-600 dark:text-violet-400 tabular-nums leading-none">
              {bookedCount}
            </div>
          </button>

          {/* In Transit */}
          <button
            type="button"
            onClick={() => setStatusFilter("in_transit")}
            className={`text-left rounded-2xl border p-2.5 sm:p-3 transition-all cursor-pointer ${
              statusFilter === "in_transit"
                ? "border-sky-500 bg-sky-50/70 shadow-2xs dark:border-sky-500 dark:bg-sky-950/50"
                : "border-slate-200/80 bg-slate-50/50 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800/40"
            }`}
          >
            <div className="flex items-center justify-between gap-1 text-[10px] sm:text-xs font-bold text-sky-600 dark:text-sky-400">
              <span className="truncate">In Transit</span>
              <Clock className="h-3.5 w-3.5 shrink-0" />
            </div>
            <div className="mt-1 text-lg sm:text-2xl font-black text-sky-600 dark:text-sky-400 tabular-nums leading-none">
              {inTransitCount}
            </div>
          </button>

          {/* Out for Delivery */}
          <button
            type="button"
            onClick={() => setStatusFilter("out_for_delivery")}
            className={`text-left rounded-2xl border p-2.5 sm:p-3 transition-all cursor-pointer ${
              statusFilter === "out_for_delivery"
                ? "border-amber-500 bg-amber-50/70 shadow-2xs dark:border-amber-500 dark:bg-amber-950/50"
                : "border-slate-200/80 bg-slate-50/50 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800/40"
            }`}
          >
            <div className="flex items-center justify-between gap-1 text-[10px] sm:text-xs font-bold text-amber-600 dark:text-amber-400">
              <span className="truncate">Out Deliv.</span>
              <Truck className="h-3.5 w-3.5 shrink-0" />
            </div>
            <div className="mt-1 text-lg sm:text-2xl font-black text-amber-600 dark:text-amber-400 tabular-nums leading-none">
              {outCount}
            </div>
          </button>

          {/* Delivered */}
          <button
            type="button"
            onClick={() => setStatusFilter("delivered")}
            className={`text-left rounded-2xl border p-2.5 sm:p-3 transition-all cursor-pointer ${
              statusFilter === "delivered"
                ? "border-emerald-500 bg-emerald-50/70 shadow-2xs dark:border-emerald-500 dark:bg-emerald-950/50"
                : "border-slate-200/80 bg-slate-50/50 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800/40"
            }`}
          >
            <div className="flex items-center justify-between gap-1 text-[10px] sm:text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <span className="truncate">Delivered</span>
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            </div>
            <div className="mt-1 text-lg sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums leading-none">
              {deliveredCount}
            </div>
          </button>

          {/* Returned / RTO */}
          <button
            type="button"
            onClick={() => setStatusFilter("returned")}
            className={`text-left rounded-2xl border p-2.5 sm:p-3 transition-all cursor-pointer ${
              statusFilter === "returned"
                ? "border-rose-500 bg-rose-50/70 shadow-2xs dark:border-rose-500 dark:bg-rose-950/50"
                : "border-slate-200/80 bg-slate-50/50 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800/40"
            }`}
          >
            <div className="flex items-center justify-between gap-1 text-[10px] sm:text-xs font-bold text-rose-600 dark:text-rose-400">
              <span className="truncate">Returned</span>
              <RotateCcw className="h-3.5 w-3.5 shrink-0" />
            </div>
            <div className="mt-1 text-lg sm:text-2xl font-black text-rose-600 dark:text-rose-400 tabular-nums leading-none">
              {returnedCount}
            </div>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. MODERN SIDE SECTION + MAIN SHIPMENTS WORKSPACE              */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT / SIDE SECTION: Modern Tabbed Control Panel (Filters, Data Analytics, Settings & Bulk Export) */}
        <aside className="lg:col-span-4 xl:col-span-4 lg:sticky lg:top-20 rounded-3xl border border-slate-200/90 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
          {/* Segmented Modern Side Navigation */}
          <div className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-2">
            <div className="grid grid-cols-3 gap-1 rounded-2xl bg-slate-200/70 dark:bg-slate-900 p-1">
              <button
                type="button"
                onClick={() => setActiveSideTab("filters")}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-2 text-xs font-extrabold transition-all cursor-pointer ${
                  activeSideTab === "filters"
                    ? "bg-white text-indigo-600 shadow-xs dark:bg-slate-800 dark:text-indigo-400"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" />
                <span>Filters</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSideTab("analytics")}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-2 text-xs font-extrabold transition-all cursor-pointer ${
                  activeSideTab === "analytics"
                    ? "bg-white text-indigo-600 shadow-xs dark:bg-slate-800 dark:text-indigo-400"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                <BarChart3 className="h-3.5 w-3.5 shrink-0" />
                <span>Analytics</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSideTab("settings")}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-2 text-xs font-extrabold transition-all cursor-pointer ${
                  activeSideTab === "settings"
                    ? "bg-white text-indigo-600 shadow-xs dark:bg-slate-800 dark:text-indigo-400"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                <Settings className="h-3.5 w-3.5 shrink-0" />
                <span>Settings</span>
              </button>
            </div>
          </div>

          {/* SIDE SECTION BODY */}
          <div className="p-4 sm:p-5 space-y-4">
            {/* TAB 1: FILTERS & BATCH MANAGEMENT */}
            {activeSideTab === "filters" && (
              <div className="space-y-4 animate-in fade-in duration-150">
                {/* Search Input */}
                <div>
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1.5">
                    Quick Search
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      placeholder="Search AWB, Courier, City..."
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
                </div>

                {/* Delivery Status Filter Stack */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Shipment Status
                    </label>
                    {statusFilter !== "all" && (
                      <button
                        type="button"
                        onClick={() => setStatusFilter("all")}
                        className="text-[11px] font-bold text-indigo-600 hover:underline dark:text-indigo-400 cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setStatusFilter("all")}
                      className={`flex items-center justify-between rounded-xl border px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
                        statusFilter === "all"
                          ? "border-indigo-600 bg-indigo-600 text-white shadow-2xs"
                          : "border-slate-200/90 bg-slate-50/70 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300"
                      }`}
                    >
                      <span className="truncate">All</span>
                      <span className={`ml-1 rounded-md px-1.5 py-0.5 font-mono text-[10px] font-black tabular-nums ${
                        statusFilter === "all" ? "bg-white/20 text-white" : "bg-slate-200/80 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                      }`}>
                        {scopedTotalCount}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setStatusFilter("booked")}
                      className={`flex items-center justify-between rounded-xl border px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
                        statusFilter === "booked"
                          ? "border-violet-600 bg-violet-600 text-white shadow-2xs"
                          : "border-slate-200/90 bg-slate-50/70 text-slate-700 hover:bg-violet-50/60 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300"
                      }`}
                    >
                      <span className="truncate">Booked</span>
                      <span className={`ml-1 rounded-md px-1.5 py-0.5 font-mono text-[10px] font-black tabular-nums ${
                        statusFilter === "booked" ? "bg-white/20 text-white" : "bg-violet-100 text-violet-800 dark:bg-violet-950/80 dark:text-violet-300"
                      }`}>
                        {scopedBookedCount}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setStatusFilter("in_transit")}
                      className={`flex items-center justify-between rounded-xl border px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
                        statusFilter === "in_transit"
                          ? "border-sky-600 bg-sky-600 text-white shadow-2xs"
                          : "border-slate-200/90 bg-slate-50/70 text-slate-700 hover:bg-sky-50/60 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300"
                      }`}
                    >
                      <span className="truncate">In Transit</span>
                      <span className={`ml-1 rounded-md px-1.5 py-0.5 font-mono text-[10px] font-black tabular-nums ${
                        statusFilter === "in_transit" ? "bg-white/20 text-white" : "bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300"
                      }`}>
                        {scopedInTransitCount}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setStatusFilter("out_for_delivery")}
                      className={`flex items-center justify-between rounded-xl border px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
                        statusFilter === "out_for_delivery"
                          ? "border-amber-500 bg-amber-500 text-white shadow-2xs"
                          : "border-slate-200/90 bg-slate-50/70 text-slate-700 hover:bg-amber-50/60 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300"
                      }`}
                    >
                      <span className="truncate">Out for Deliv.</span>
                      <span className={`ml-1 rounded-md px-1.5 py-0.5 font-mono text-[10px] font-black tabular-nums ${
                        statusFilter === "out_for_delivery" ? "bg-white/20 text-white" : "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300"
                      }`}>
                        {scopedOutCount}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setStatusFilter("delivered")}
                      className={`flex items-center justify-between rounded-xl border px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
                        statusFilter === "delivered"
                          ? "border-emerald-600 bg-emerald-600 text-white shadow-2xs"
                          : "border-slate-200/90 bg-slate-50/70 text-slate-700 hover:bg-emerald-50/60 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300"
                      }`}
                    >
                      <span className="truncate">Delivered</span>
                      <span className={`ml-1 rounded-md px-1.5 py-0.5 font-mono text-[10px] font-black tabular-nums ${
                        statusFilter === "delivered" ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300"
                      }`}>
                        {scopedDeliveredCount}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setStatusFilter("returned")}
                      className={`flex items-center justify-between rounded-xl border px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
                        statusFilter === "returned"
                          ? "border-rose-600 bg-rose-600 text-white shadow-2xs"
                          : "border-slate-200/90 bg-slate-50/70 text-slate-700 hover:bg-rose-50/60 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300"
                      }`}
                    >
                      <span className="truncate">Returned</span>
                      <span className={`ml-1 rounded-md px-1.5 py-0.5 font-mono text-[10px] font-black tabular-nums ${
                        statusFilter === "returned" ? "bg-white/20 text-white" : "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300"
                      }`}>
                        {scopedReturnedCount}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Batch Scope & Manager inside Side Section */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Batch Scope ({uniqueBatches.length})
                    </label>
                    {selectedBatchId !== "all" && (
                      <button
                        type="button"
                        onClick={() => setSelectedBatchId("all")}
                        className="text-[11px] font-bold text-emerald-600 hover:underline dark:text-emerald-400 cursor-pointer"
                      >
                        Show All ({totalCount})
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedBatchId("all")}
                      className={`rounded-xl px-2.5 py-2 text-[11px] font-bold transition-all cursor-pointer ${
                        selectedBatchId === "all"
                          ? "bg-indigo-600 text-white shadow-2xs"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      All Shipments ({totalCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedBatchId("imported_all")}
                      className={`rounded-xl px-2.5 py-2 text-[11px] font-bold transition-all cursor-pointer ${
                        selectedBatchId === "imported_all"
                          ? "bg-emerald-600 text-white shadow-2xs"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      All Imported ({importedCount})
                    </button>
                  </div>

                  {uniqueBatches.length > 0 && (
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1 pt-1">
                      {uniqueBatches.map((batch) => {
                        const isSelected = selectedBatchId === batch.id;
                        const isEditing = editingBatchId === batch.id;
                        const isPendingDelete = batchPendingDeleteId === batch.id;

                        return (
                          <div
                            key={batch.id}
                            onClick={() => {
                              if (!isEditing && !isPendingDelete) {
                                setSelectedBatchId(isSelected ? "all" : batch.id);
                              }
                            }}
                            className={`rounded-2xl border p-3 transition-all flex flex-col gap-2 cursor-pointer ${
                              isSelected
                                ? "border-emerald-500 bg-emerald-50/70 dark:border-emerald-500/80 dark:bg-emerald-950/40 shadow-2xs"
                                : "border-slate-200/90 bg-slate-50/60 hover:border-emerald-300 dark:border-slate-800 dark:bg-slate-800/40"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              {isEditing ? (
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-1 flex-1 bg-white dark:bg-slate-900 px-2 py-1 rounded-xl border border-emerald-500"
                                >
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
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleSaveBatchName(batch.id)}
                                    className="p-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer shrink-0"
                                  >
                                    <Check className="h-3 w-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleCancelEditBatch}
                                    className="p-1 rounded-lg bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300 cursor-pointer shrink-0"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                                      {batch.name}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                    {batch.count} item{batch.count > 1 ? "s" : ""} • {batch.delivered} delivered
                                  </div>
                                </div>
                              )}

                              {!isEditing && (
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-1 shrink-0"
                                >
                                  {isPendingDelete ? (
                                    <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950/90 border border-rose-200 dark:border-rose-800 rounded-lg px-1.5 py-0.5">
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteBatch(batch.id)}
                                        className="rounded bg-rose-600 text-white px-1.5 py-0.5 text-[10px] font-bold cursor-pointer"
                                      >
                                        Del
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setBatchPendingDeleteId(null)}
                                        className="rounded bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 text-[10px] font-bold cursor-pointer"
                                      >
                                        No
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => handleExportBatchCsv(batch.id)}
                                        className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-indigo-50 text-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-indigo-400 cursor-pointer"
                                        title="Export this batch as CSV"
                                      >
                                        <Download className="h-3 w-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleStartEditBatch(batch.id, batch.name)}
                                        className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-emerald-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
                                        title="Rename batch"
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setBatchPendingDeleteId(batch.id)}
                                        className="p-1.5 rounded-lg border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-rose-600 dark:border-rose-900/60 dark:bg-rose-950/60 dark:text-rose-300 cursor-pointer"
                                        title="Delete batch"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: DATA SIZE & VOLUME ANALYTICS */}
            {activeSideTab === "analytics" && (
              <div className="space-y-3.5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-extrabold text-slate-900 dark:text-white">
                      Data Size & Volume Analytics
                    </h3>
                  </div>
                  <span className="rounded-lg bg-indigo-100 dark:bg-indigo-950 px-2 py-0.5 font-mono text-[10px] font-black text-indigo-700 dark:text-indigo-300">
                    {dataAnalytics.formattedSize}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/50">
                    <div className="text-[10px] font-bold uppercase text-slate-400">Total Datas Added</div>
                    <div className="mt-1 text-xl font-black text-slate-900 dark:text-white tabular-nums">
                      {dataAnalytics.totalRecords}
                    </div>
                    <div className="mt-0.5 text-[10px] text-slate-500">
                      {dataAnalytics.importedRecords} batch • {dataAnalytics.directRecords} direct
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/50">
                    <div className="text-[10px] font-bold uppercase text-slate-400">Active Batches</div>
                    <div className="mt-1 text-xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {dataAnalytics.batchesCount}
                    </div>
                    <div className="mt-0.5 text-[10px] text-slate-500">
                      Avg{" "}
                      {dataAnalytics.batchesCount > 0
                        ? Math.round(dataAnalytics.importedRecords / dataAnalytics.batchesCount)
                        : 0}{" "}
                      / batch
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/50">
                    <div className="text-[10px] font-bold uppercase text-slate-400">Storage Footprint</div>
                    <div className="mt-1 text-lg font-black font-mono text-sky-600 dark:text-sky-400 tabular-nums">
                      {dataAnalytics.formattedSize}
                    </div>
                    <div className="mt-0.5 text-[10px] text-slate-500 font-mono">
                      ~{dataAnalytics.avgBytesPerRecord} B / record
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/50">
                    <div className="text-[10px] font-bold uppercase text-slate-400">Capacity Left</div>
                    <div className="mt-1 text-lg font-black font-mono text-indigo-600 dark:text-indigo-400 tabular-nums">
                      +{dataAnalytics.estimatedRemainingRecords.toLocaleString()}
                    </div>
                    <div className="mt-0.5 text-[10px] text-slate-500">
                      {dataAnalytics.quotaPercent}% of 5 MB used
                    </div>
                  </div>
                </div>

                {/* Quota Bar */}
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mb-1">
                    <span>Storage Utilization ({dataAnalytics.usedBytes.toLocaleString()} Bytes)</span>
                    <span>{dataAnalytics.quotaPercent}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all"
                      style={{ width: `${Math.max(2, dataAnalytics.quotaPercent)}%` }}
                    />
                  </div>
                </div>

                {/* Carrier Distribution */}
                {dataAnalytics.carrierBreakdown.length > 0 && (
                  <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-800/40 space-y-2">
                    <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Carrier Volume Distribution
                    </div>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {dataAnalytics.carrierBreakdown.map((c) => (
                        <div
                          key={c.id}
                          className="flex items-center justify-between text-xs bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-200/70 dark:border-slate-800"
                        >
                          <span className="font-semibold text-slate-700 dark:text-slate-200 truncate">
                            {c.name}
                          </span>
                          <span className="font-mono text-[11px] font-black text-indigo-600 dark:text-indigo-400 shrink-0 ml-2">
                            {c.count} ({c.percent}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: SETTINGS, MULTI-FORMAT BULK EXPORT PER BATCH & CLEAN-UP */}
            {activeSideTab === "settings" && (
              <div className="space-y-4 animate-in fade-in duration-150">
                {/* 1. BULK EXPORT FEATURE (ANY FILE EXTENSION + STYLED DROPDOWN) */}
                <div className="rounded-2xl border border-indigo-200/90 bg-indigo-50/50 p-3.5 dark:border-indigo-900/60 dark:bg-indigo-950/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                        Bulk Export by Batch
                      </span>
                    </div>
                    <span className="rounded-md bg-indigo-100 dark:bg-indigo-950 px-2 py-0.5 text-[10px] font-mono font-bold text-indigo-700 dark:text-indigo-300 uppercase">
                      .{exportFileExtension}
                    </span>
                  </div>

                  {/* Custom Styled Select Batch to Export Dropdown */}
                  <div className="relative">
                    <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1">
                      Select Batch to Export:
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsExportBatchDropdownOpen((prev) => !prev);
                        setIsExportFormatDropdownOpen(false);
                      }}
                      className="w-full flex items-center justify-between rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-xs font-bold text-slate-800 shadow-2xs hover:border-indigo-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="h-2 w-2 rounded-full bg-indigo-500 shrink-0" />
                        <span className="truncate">
                          {exportBatchTargetId === "all"
                            ? `All Tracked Shipments (${totalCount})`
                            : exportBatchTargetId === "imported_all"
                            ? `All Imported Batches (${importedCount})`
                            : exportBatchTargetId === "direct_only"
                            ? `Direct Added Consignments (${Math.max(0, totalCount - importedCount)})`
                            : (() => {
                                const b = uniqueBatches.find((x) => x.id === exportBatchTargetId);
                                return b ? `${b.name} (${b.count})` : `All Tracked Shipments (${totalCount})`;
                              })()}
                        </span>
                      </div>
                      <ChevronDown
                        className={`h-4 w-4 text-slate-400 shrink-0 ml-1 transition-transform ${
                          isExportBatchDropdownOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {isExportBatchDropdownOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setIsExportBatchDropdownOpen(false)}
                        />
                        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-60 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl dark:border-slate-700 dark:bg-slate-800 space-y-0.5">
                          {[
                            { id: "all", label: "All Tracked Shipments", count: totalCount },
                            { id: "imported_all", label: "All Imported Batches", count: importedCount },
                            {
                              id: "direct_only",
                              label: "Direct Added Consignments",
                              count: Math.max(0, totalCount - importedCount),
                            },
                            ...uniqueBatches.map((b) => ({
                              id: b.id,
                              label: b.name,
                              count: b.count,
                            })),
                          ].map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                setExportBatchTargetId(opt.id);
                                setIsExportBatchDropdownOpen(false);
                              }}
                              className={`w-full flex items-center justify-between rounded-xl px-2.5 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                                exportBatchTargetId === opt.id
                                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 font-bold"
                                  : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700/70"
                              }`}
                            >
                              <span className="truncate pr-2">{opt.label}</span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="rounded-md bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-600 dark:text-slate-300">
                                  {opt.count}
                                </span>
                                {exportBatchTargetId === opt.id && (
                                  <Check className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Custom Styled File Extension / Format Selector */}
                  <div className="relative">
                    <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1">
                      Choose File Extension:
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsExportFormatDropdownOpen((prev) => !prev);
                        setIsExportBatchDropdownOpen(false);
                      }}
                      className="w-full flex items-center justify-between rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-2xs hover:border-indigo-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 transition-colors cursor-pointer"
                    >
                      <span className="truncate">
                        {exportFileExtension === "csv"
                          ? "CSV Spreadsheet (.csv)"
                          : exportFileExtension === "xlsx"
                          ? "Excel Workbook (.xlsx)"
                          : exportFileExtension === "xls"
                          ? "Excel 97-2004 (.xls)"
                          : exportFileExtension === "json"
                          ? "Structured JSON (.json)"
                          : "Plain Text Report (.txt)"}
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 text-slate-400 shrink-0 ml-1 transition-transform ${
                          isExportFormatDropdownOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {isExportFormatDropdownOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setIsExportFormatDropdownOpen(false)}
                        />
                        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl dark:border-slate-700 dark:bg-slate-800 space-y-0.5">
                          {(
                            [
                              { ext: "csv", label: "CSV Spreadsheet", badge: ".csv" },
                              { ext: "xlsx", label: "Excel Workbook", badge: ".xlsx" },
                              { ext: "xls", label: "Excel Legacy", badge: ".xls" },
                              { ext: "json", label: "Structured JSON", badge: ".json" },
                              { ext: "txt", label: "Plain Text Report", badge: ".txt" },
                            ] as const
                          ).map((fmt) => (
                            <button
                              key={fmt.ext}
                              type="button"
                              onClick={() => {
                                setExportFileExtension(fmt.ext);
                                setIsExportFormatDropdownOpen(false);
                              }}
                              className={`w-full flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                                exportFileExtension === fmt.ext
                                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 font-bold"
                                  : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700/70"
                              }`}
                            >
                              <span>{fmt.label}</span>
                              <span className="font-mono text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                                {fmt.badge}
                              </span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {batchCsvExportMsg && (
                    <div className="rounded-xl border border-emerald-300 bg-white dark:border-emerald-800 dark:bg-slate-900 px-3 py-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>{batchCsvExportMsg}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleExportBatchCsv()}
                    disabled={totalCount === 0}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-3.5 py-2.5 text-xs font-extrabold text-white shadow-xs transition-colors cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>
                      Download Batch (.{exportFileExtension.toUpperCase()})
                    </span>
                  </button>
                </div>

                {/* 2. AUTO BACKGROUND CHECK & SYNC FREQUENCY */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        Auto Background Sync
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Interval: {Math.round(checkIntervalSec / 60)}m
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleAutoCheck}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        isAutoCheckEnabled ? "bg-emerald-600" : "bg-slate-300 dark:bg-slate-600"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${
                          isAutoCheckEnabled ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { label: "5m", sec: 300 },
                      { label: "15m", sec: 900 },
                      { label: "30m", sec: 1800 },
                    ].map((opt) => (
                      <button
                        key={opt.sec}
                        type="button"
                        onClick={() => handleChangeInterval(opt.sec)}
                        className={`rounded-xl border py-1.5 px-2 text-xs font-bold transition-all cursor-pointer ${
                          checkIntervalSec === opt.sec
                            ? "border-indigo-600 bg-indigo-600 text-white"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. DELIVERED EXPORT & CLEAN-UP */}
                <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/50 p-3.5 dark:border-emerald-900/60 dark:bg-emerald-950/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Delivered Export (.xlsx)
                    </span>
                    <span className="text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-300">
                      {deliveredCount} delivered
                    </span>
                  </div>

                  {exportDeliveredSuccessMsg && (
                    <div className="rounded-xl border border-emerald-300 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                      {exportDeliveredSuccessMsg}
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={handleExportDeliveredOnly}
                      disabled={deliveredCount === 0}
                      className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-3 py-2 text-xs font-bold text-white cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Export Delivered ({deliveredCount})</span>
                    </button>

                    {lastExportedDeliveredIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setIsDeleteExportedModalOpen(true)}
                        className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:border-rose-800 dark:bg-rose-950/70 dark:text-rose-300 px-3 py-2 text-xs font-bold cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete Exported ({lastExportedDeliveredIds.length})</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* 4. JSON BACKUP & FULL SETTINGS MODAL */}
                <div className="flex flex-col gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setBackupError(null);
                      setBackupSuccessMsg(null);
                      setIsBackupModalOpen(true);
                    }}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                  >
                    <Database className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Data Backup & Restore Center</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSettingsOpen(true)}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/60 px-3 py-2 text-[11px] font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
                  >
                    <Settings className="h-3.5 w-3.5" />
                    <span>Open Fullscreen Settings</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* RIGHT / MAIN WORKSPACE: SHIPMENTS DATA TABLE */}
        <div className="lg:col-span-8 xl:col-span-8 space-y-4">
          {/* 4. SHIPMENTS DATA TABLE */}
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
                          Try adjusting the side filters or import tracking IDs above.
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

                        {/* Status Pill */}
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
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-0.5 text-[11px] font-bold text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 border border-violet-200/80 dark:border-violet-800/60">
                              <Package className="h-3 w-3" />
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

                        {/* Action buttons */}
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
        </div>
      </div>

      {/* ============================================================== */}
      {/* CENTER-BOTTOM FLOATING CLEAR / DELETE ACTION BUTTON BAR        */}
      {/* ============================================================== */}
      {selectedShipmentIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-full border border-slate-700/80 bg-slate-900/95 dark:bg-slate-950/95 px-4 sm:px-5 py-2.5 text-white shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2 pr-1">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white text-xs font-black tabular-nums">
              {selectedShipmentIds.length}
            </span>
            <span className="text-xs font-bold text-slate-100 whitespace-nowrap">
              selected
            </span>
          </div>

          <div className="h-4 w-px bg-slate-700" />

          <button
            type="button"
            onClick={() => setSelectedShipmentIds([])}
            className="rounded-full px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
          >
            Clear
          </button>

          <button
            type="button"
            onClick={() => setIsBulkDeleteModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 hover:bg-rose-500 px-4 py-1.5 text-xs font-extrabold text-white shadow-sm transition-colors cursor-pointer whitespace-nowrap"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete ({selectedShipmentIds.length})</span>
          </button>
        </div>
      )}

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
                    Operations, Bulk Export & Sync Settings
                  </h3>
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
              {/* Multi-Format Bulk Export by Batch inside Settings Modal */}
              <div className="rounded-2xl border border-indigo-200/80 bg-indigo-50/50 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Bulk Export Shipments by Batch
                    </span>
                  </div>
                  <span className="rounded-lg bg-indigo-100 dark:bg-indigo-950 px-2 py-0.5 text-[10px] font-mono font-bold text-indigo-800 dark:text-indigo-300 uppercase">
                    .{exportFileExtension}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Custom Styled Select Batch Dropdown */}
                  <div className="relative">
                    <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1">
                      Select Batch to Export:
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsModalExportBatchDropdownOpen((prev) => !prev);
                        setIsModalExportFormatDropdownOpen(false);
                      }}
                      className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-2xs hover:border-indigo-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 cursor-pointer"
                    >
                      <span className="truncate">
                        {exportBatchTargetId === "all"
                          ? `All Tracked Shipments (${totalCount})`
                          : exportBatchTargetId === "imported_all"
                          ? `All Imported Batches (${importedCount})`
                          : exportBatchTargetId === "direct_only"
                          ? `Direct Consignments (${Math.max(0, totalCount - importedCount)})`
                          : (() => {
                              const b = uniqueBatches.find((x) => x.id === exportBatchTargetId);
                              return b ? `${b.name} (${b.count})` : `All Tracked Shipments (${totalCount})`;
                            })()}
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0 ml-1" />
                    </button>

                    {isModalExportBatchDropdownOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setIsModalExportBatchDropdownOpen(false)}
                        />
                        <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-56 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl dark:border-slate-700 dark:bg-slate-800 space-y-0.5">
                          {[
                            { id: "all", label: "All Tracked Shipments", count: totalCount },
                            { id: "imported_all", label: "All Imported Batches", count: importedCount },
                            {
                              id: "direct_only",
                              label: "Direct Added Consignments",
                              count: Math.max(0, totalCount - importedCount),
                            },
                            ...uniqueBatches.map((b) => ({
                              id: b.id,
                              label: b.name,
                              count: b.count,
                            })),
                          ].map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                setExportBatchTargetId(opt.id);
                                setIsModalExportBatchDropdownOpen(false);
                              }}
                              className={`w-full flex items-center justify-between rounded-xl px-2.5 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                                exportBatchTargetId === opt.id
                                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 font-bold"
                                  : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700/70"
                              }`}
                            >
                              <span className="truncate pr-2">{opt.label}</span>
                              <span className="rounded-md bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-600 dark:text-slate-300">
                                {opt.count}
                              </span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Custom Styled File Extension Dropdown */}
                  <div className="relative">
                    <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1">
                      File Extension:
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsModalExportFormatDropdownOpen((prev) => !prev);
                        setIsModalExportBatchDropdownOpen(false);
                      }}
                      className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-2xs hover:border-indigo-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 cursor-pointer"
                    >
                      <span className="truncate">
                        {exportFileExtension === "csv"
                          ? "CSV (.csv)"
                          : exportFileExtension === "xlsx"
                          ? "Excel (.xlsx)"
                          : exportFileExtension === "xls"
                          ? "Excel Legacy (.xls)"
                          : exportFileExtension === "json"
                          ? "JSON (.json)"
                          : "Text (.txt)"}
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0 ml-1" />
                    </button>

                    {isModalExportFormatDropdownOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setIsModalExportFormatDropdownOpen(false)}
                        />
                        <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl dark:border-slate-700 dark:bg-slate-800 space-y-0.5">
                          {(
                            [
                              { ext: "csv", label: "CSV Spreadsheet", badge: ".csv" },
                              { ext: "xlsx", label: "Excel Workbook", badge: ".xlsx" },
                              { ext: "xls", label: "Excel 97-2004", badge: ".xls" },
                              { ext: "json", label: "Structured JSON", badge: ".json" },
                              { ext: "txt", label: "Plain Text", badge: ".txt" },
                            ] as const
                          ).map((fmt) => (
                            <button
                              key={fmt.ext}
                              type="button"
                              onClick={() => {
                                setExportFileExtension(fmt.ext);
                                setIsModalExportFormatDropdownOpen(false);
                              }}
                              className={`w-full flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                                exportFileExtension === fmt.ext
                                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 font-bold"
                                  : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700/70"
                              }`}
                            >
                              <span>{fmt.label}</span>
                              <span className="font-mono text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                                {fmt.badge}
                              </span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleExportBatchCsv()}
                  disabled={totalCount === 0}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-4 py-2.5 text-xs font-extrabold text-white shadow-2xs transition-colors cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>
                    Bulk Export as .{exportFileExtension.toUpperCase()}
                  </span>
                </button>
                {batchCsvExportMsg && (
                  <div className="rounded-xl border border-emerald-300 bg-white/90 dark:border-emerald-800 dark:bg-slate-900 px-3 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    {batchCsvExportMsg}
                  </div>
                )}
              </div>

              {/* Auto check toggle */}
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 dark:bg-slate-800/80 p-4 border border-slate-200/80 dark:border-slate-700">
                <div className="pr-3">
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    Automatic Background Check
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

              {/* Frequency Chooser Options */}
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
              </div>

              {/* Delivered Consignments Export & Clean-Up */}
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
          <div className="fixed inset-0" onClick={handleRequestCancelIntake} />
          <div
            className="relative z-10 w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-4xl flex flex-col rounded-none sm:rounded-3xl border-0 sm:border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 text-left overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ========================================================== */}
            {/* ASK BEFORE CANCEL CONFIRMATION OVERLAY (MANUAL & CAMERA)   */}
            {/* ========================================================== */}
            {isCancelIntakeConfirmOpen && (
              <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
                <div
                  className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 text-left space-y-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/80 dark:text-rose-400">
                      <AlertCircle className="h-6 w-6 stroke-[2.2]" />
                    </span>
                    <div>
                      <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                        Discard Unsaved Consignments?
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        You have unsaved data in {isCameraActive ? "Camera Scanner" : "Add Consignments"}.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200 space-y-1">
                    {stagedConsignments.length > 0 && (
                      <p className="font-bold">
                        • {stagedConsignments.length} staged consignment{stagedConsignments.length > 1 ? "s" : ""} waiting for confirmation
                      </p>
                    )}
                    {intakeAwb.trim().length > 0 && (
                      <p className="font-bold">
                        • Unstaged AWB entry: <span className="font-mono">{intakeAwb.trim()}</span>
                      </p>
                    )}
                    <p className="text-[11px] opacity-90 pt-1">
                      If you cancel now, all scanned and entered consignment data will be lost.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsCancelIntakeConfirmOpen(false)}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                    >
                      Keep Data / Continue
                    </button>

                    {isCameraActive && stagedConsignments.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsCancelIntakeConfirmOpen(false);
                          stopCameraStreamOnly();
                        }}
                        className="rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-xs font-bold text-white shadow-xs cursor-pointer"
                      >
                        Review Scanned ({stagedConsignments.length})
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleForceDiscardAndCloseIntake}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-2 text-xs font-extrabold text-white shadow-xs cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Discard & Cancel</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================== */}
            {/* MODE A: SEPARATE CAMERA-ONLY SCANNER VIEW (NO KEYBOARD)    */}
            {/* ========================================================== */}
            {isCameraActive ? (
              <div className="flex flex-col h-full flex-1 bg-slate-950 text-white overflow-hidden">
                {/* Separate Camera Header */}
                <div className="flex items-center justify-between border-b border-slate-800 px-4 sm:px-6 py-3.5 shrink-0">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-xs shrink-0">
                      <Camera className="h-4 w-4" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm sm:text-base font-black tracking-tight text-white">
                          Camera Barcode & QR Scanner
                        </h3>
                        <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 text-[11px] font-mono font-black text-emerald-300">
                          {stagedConsignments.length} Scanned
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleRequestCancelFromCamera}
                    className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                    title="Close camera"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Camera Mode Switcher, Auto-Zoom/Focus Controls & Auto-Next Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-3 bg-slate-900/90 border-b border-slate-800 shrink-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center gap-1 rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setCameraGuideMode("barcode")}
                        className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
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
                        className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
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
                        className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                          cameraGuideMode === "both"
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        Both
                      </button>
                    </div>

                    {/* Manual Zoom Controls */}
                    <div className="inline-flex items-center gap-1 rounded-xl bg-slate-950 px-2 py-1 border border-slate-800 text-[11px] font-bold">
                      <button
                        type="button"
                        onClick={() => applyInlineCameraZoomAndFocus(cameraZoomLevel - 0.25)}
                        disabled={cameraZoomLevel <= 1.0}
                        className="p-1 rounded-md text-slate-400 hover:text-white disabled:opacity-40 cursor-pointer"
                      >
                        <ZoomOut className="h-3.5 w-3.5" />
                      </button>
                      <span className="font-mono text-[11px] font-black text-indigo-300 px-1 tabular-nums">
                        {cameraZoomLevel.toFixed(1)}x
                      </span>
                      <button
                        type="button"
                        onClick={() => applyInlineCameraZoomAndFocus(cameraZoomLevel + 0.25)}
                        disabled={cameraZoomLevel >= 2.4}
                        className="p-1 rounded-md text-slate-400 hover:text-white disabled:opacity-40 cursor-pointer"
                      >
                        <ZoomIn className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-bold text-slate-300">
                      Auto-Next:{" "}
                      <span className={isAutoNextEnabled ? "text-emerald-400" : "text-amber-400"}>
                        {isAutoNextEnabled ? "ON" : "OFF"}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAutoNextEnabled((prev) => !prev)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isAutoNextEnabled ? "bg-emerald-600" : "bg-slate-700"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          isAutoNextEnabled ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Main Dedicated Camera Viewport */}
                <div className="flex-1 flex flex-col p-4 sm:p-6 gap-3 overflow-y-auto">
                  {cameraError && (
                    <div className="text-xs text-amber-300 bg-amber-950/70 p-3 rounded-xl border border-amber-800/80">
                      {cameraError}
                    </div>
                  )}

                  {intakeError && (
                    <div className="text-xs text-rose-300 bg-rose-950/70 p-3 rounded-xl border border-rose-800/80">
                      {intakeError}
                    </div>
                  )}

                  <div
                    className={`relative flex-1 min-h-[260px] sm:min-h-[340px] rounded-2xl bg-black overflow-hidden flex items-center justify-center border-2 transition-colors duration-200 ${
                      cameraScanSuccess
                        ? "border-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.45)]"
                        : isEnhancingDamagedLabel
                        ? "border-amber-500/80 shadow-[0_0_20px_rgba(245,158,11,0.3)]"
                        : "border-slate-800"
                    }`}
                  >
                    <video
                      ref={videoRef}
                      style={{
                        transform: hwZoomSupportedRef.current.supported
                          ? undefined
                          : `scale(${cameraZoomLevel})`,
                        transition: "transform 220ms ease-out",
                      }}
                      className="absolute inset-0 w-full h-full object-cover"
                      playsInline
                      muted
                      autoPlay
                    />

                    {/* Top HUD Pill: Strictly Inside Guide Frame & Damaged Label Enhancer */}
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex flex-wrap items-center justify-center gap-2 px-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-950/80 border border-slate-700/80 px-3 py-1 text-[10px] font-bold text-slate-200 backdrop-blur-xs">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" />
                        <span>Scans Only Inside Guide Frame</span>
                      </span>
                      {(isEnhancingDamagedLabel || cameraZoomLevel > 1.05) && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/90 px-2.5 py-0.5 text-[10px] font-black text-slate-950 shadow-sm">
                          <Zap className="h-3 w-3 fill-slate-950" />
                          <span>
                            {isEnhancingDamagedLabel
                              ? `Wrinkled Label Boost ${cameraZoomLevel.toFixed(1)}x`
                              : `Zoom ${cameraZoomLevel.toFixed(1)}x`}
                          </span>
                        </span>
                      )}
                    </div>

                    {/* Horizontal RED Laser Scan Line */}
                    {!cameraScanSuccess && (
                      <div className="absolute left-8 right-8 h-0.5 bg-red-500 shadow-[0_0_14px_#ef4444] animate-pulse z-10 pointer-events-none" />
                    )}

                    {/* Clean Guide Frame Only (with outside mask indicating active scan area) */}
                    {cameraGuideMode === "barcode" && (
                      <div
                        className={`relative z-10 w-4/5 max-w-sm h-28 rounded-xl border-2 pointer-events-none shadow-[0_0_0_9999px_rgba(2,6,23,0.52)] transition-colors ${
                          cameraScanSuccess
                            ? "border-emerald-400 bg-emerald-500/15"
                            : isEnhancingDamagedLabel
                            ? "border-amber-400"
                            : "border-white/80"
                        }`}
                      />
                    )}

                    {cameraGuideMode === "qr" && (
                      <div
                        className={`relative z-10 w-48 h-48 sm:w-52 sm:h-52 rounded-2xl border-2 pointer-events-none shadow-[0_0_0_9999px_rgba(2,6,23,0.52)] transition-colors ${
                          cameraScanSuccess
                            ? "border-emerald-400 bg-emerald-500/15"
                            : isEnhancingDamagedLabel
                            ? "border-amber-400"
                            : "border-white/80"
                        }`}
                      />
                    )}

                    {cameraGuideMode === "both" && (
                      <div
                        className={`relative z-10 w-4/5 max-w-md h-44 rounded-2xl border-2 pointer-events-none shadow-[0_0_0_9999px_rgba(2,6,23,0.52)] flex items-center justify-center transition-colors ${
                          cameraScanSuccess
                            ? "border-emerald-400 bg-emerald-500/15"
                            : isEnhancingDamagedLabel
                            ? "border-amber-400"
                            : "border-white/75"
                        }`}
                      >
                        <div className="w-32 h-32 rounded-xl border border-white/50" />
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

                  {/* Latest Scanned Item Strip (No input fields so keyboard never opens) */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/90 px-4 py-3 flex items-center justify-between gap-3">
                    {stagedConsignments.length > 0 ? (
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                          <Check className="h-3.5 w-3.5 stroke-[3]" />
                        </span>
                        <div className="truncate text-xs">
                          <span className="text-slate-400">Last scanned: </span>
                          <span className="font-mono font-black text-white">
                            {stagedConsignments[0].trackingNumber}
                          </span>
                          <span className="text-indigo-400 font-semibold ml-2">
                            ({stagedConsignments[0].courierName})
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">
                        Align barcode or QR code with the red laser line to scan automatically.
                      </span>
                    )}
                    <span className="text-xs font-mono font-bold text-slate-300 shrink-0">
                      Total: {stagedConsignments.length}
                    </span>
                  </div>
                </div>

                {/* Separate Camera Footer */}
                <div className="border-t border-slate-800 px-4 sm:px-6 py-3.5 bg-slate-900 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleRequestCancelFromCamera}
                    className="rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-4 py-2 text-xs font-bold text-slate-200 cursor-pointer"
                  >
                    Cancel
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={stopCameraStreamOnly}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-xs font-extrabold text-white shadow-xs cursor-pointer"
                    >
                      <span>
                        {stagedConsignments.length > 0
                          ? `Done Scanning • Review (${stagedConsignments.length})`
                          : "Back to Manual Entry"}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* ========================================================== */
              /* MODE B: MANUAL / HARDWARE SCANNER & FULL REVIEW VIEW       */
              /* ========================================================== */
              <>
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
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRequestCancelIntake}
                    className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Modal Body (Scrollable) */}
                <div className="overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5 flex-1">
                  {/* Intake Toolbar: Auto-Next Toggle & Dedicated Camera Scanner Trigger */}
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
                      </div>
                    </div>

                    {/* Right controls: Dedicated Camera Scanner Button & Auto-Next Toggle switch */}
                    <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={handleOpenSeparateCameraPage}
                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-xs font-extrabold shadow-xs transition-all cursor-pointer"
                        title="Open dedicated camera scanner page (/scan)"
                      >
                        <ScanLine className="h-4 w-4 stroke-[2.5]" />
                        <span>Scan Barcode / QR</span>
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
                        Consignment / AWB Number:
                      </label>
                      {intakeAwb.trim() && (() => {
                        const info = identifyAndValidateConsignment(intakeAwb);
                        if (info.isValid && info.courier) {
                          return (
                            <div className="flex flex-wrap items-center gap-1.5 text-xs">
                              <span className="rounded-md bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300">
                                ✓ {info.formatLabel} ({info.length} chars)
                              </span>
                              <span className="font-bold text-indigo-600 dark:text-indigo-400">
                                {info.courier.name}
                              </span>
                            </div>
                          );
                        }
                        return (
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="rounded-md bg-amber-100 dark:bg-amber-950/80 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                              {info.length} chars • {info.formatLabel}
                            </span>
                          </div>
                        );
                      })()}
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
                            const identified = identifyAndValidateConsignment(val);
                            if (identified.courier) {
                              setIntakeCourier(identified.courier.id);
                            }
                          }}
                          onKeyDown={handleIntakeKeyDown}
                          placeholder="Enter Consignment / AWB (e.g. EK123456789IN, B4000211866)..."
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-mono text-sm font-black uppercase tracking-wider text-slate-900 focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
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
                      {/* Courier Partner Selection with Search + Letter Key Auto-Filter */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => {
                            const nextOpen = !isIntakeCourierDropdownOpen;
                            setIsIntakeCourierDropdownOpen(nextOpen);
                            setIsIntakeStatusDropdownOpen(false);
                            if (nextOpen) {
                              setIntakeCourierSearch("");
                            }
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
                              onClick={() => {
                                setIsIntakeCourierDropdownOpen(false);
                                setIntakeCourierSearch("");
                              }}
                            />
                            <div className="absolute left-0 top-full mt-1 z-50 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800">
                              {/* Instant Search Input (auto-filters when typing any letter) */}
                              <div className="p-2 border-b border-slate-100 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-900/50">
                                <div className="relative flex items-center">
                                  <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                                  <input
                                    ref={intakeCourierSearchRef}
                                    type="text"
                                    value={intakeCourierSearch}
                                    onChange={(e) => setIntakeCourierSearch(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Escape") {
                                        setIsIntakeCourierDropdownOpen(false);
                                        setIntakeCourierSearch("");
                                      } else if (e.key === "Enter" && filteredIntakeCouriers.length > 0) {
                                        e.preventDefault();
                                        setIntakeCourier(filteredIntakeCouriers[0].id);
                                        setIsIntakeCourierDropdownOpen(false);
                                        setIntakeCourierSearch("");
                                      }
                                    }}
                                    placeholder="Search or type letters..."
                                    className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-6 py-1.5 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                  />
                                  {intakeCourierSearch && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setIntakeCourierSearch("");
                                        intakeCourierSearchRef.current?.focus();
                                      }}
                                      className="absolute right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              <div className="max-h-48 overflow-y-auto p-1">
                                {filteredIntakeCouriers.length === 0 ? (
                                  <div className="px-3 py-4 text-center text-[11px] text-slate-400">
                                    No shipping partner matches &ldquo;{intakeCourierSearch}&rdquo;
                                  </div>
                                ) : (
                                  filteredIntakeCouriers.map((c) => (
                                    <button
                                      key={c.id}
                                      type="button"
                                      onClick={() => {
                                        setIntakeCourier(c.id);
                                        setIsIntakeCourierDropdownOpen(false);
                                        setIntakeCourierSearch("");
                                      }}
                                      className={`w-full text-left rounded-lg px-2.5 py-1.5 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between cursor-pointer ${
                                        intakeCourier === c.id
                                          ? "bg-indigo-50/80 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-bold"
                                          : "text-slate-700 dark:text-slate-200"
                                      }`}
                                    >
                                      <span className="truncate">{c.name}</span>
                                      <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-1">
                                        ({c.shortName})
                                      </span>
                                    </button>
                                  ))
                                )}
                              </div>
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

                      {/* Custom Styled Status Dropdown (with Booked + Logical Stage Metadata) */}
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
                                  : intakeStatus === "booked"
                                  ? "bg-violet-500 ring-2 ring-violet-500/20"
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
                                : intakeStatus === "booked"
                                ? "Booked"
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
                            <div className="absolute left-0 right-0 sm:right-auto top-full mt-1 z-50 sm:w-56 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-800">
                              {[
                                { value: "booked", label: "Booked", dot: "bg-violet-500", desc: "Consignment booked at origin" },
                                { value: "in_transit", label: "In Transit", dot: "bg-sky-500", desc: "Active linehaul dispatch" },
                                { value: "out_for_delivery", label: "Out for Delivery", dot: "bg-amber-500", desc: "With delivery executive" },
                                { value: "delivered", label: "Delivered", dot: "bg-emerald-500", desc: "Successfully delivered" },
                                { value: "returned", label: "Returned (RTO)", dot: "bg-rose-500", desc: "Returned to origin" },
                              ].map((st) => (
                                <button
                                  key={st.value}
                                  type="button"
                                  onClick={() => {
                                    setIntakeStatus(st.value as "booked" | "in_transit" | "out_for_delivery" | "delivered" | "returned");
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
                                    <Check className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
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

                  {/* Full Review Before Add: Staged Consignments List */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-xs">
                          {stagedConsignments.length}
                        </span>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                          Staged Consignments
                        </h4>
                      </div>
                    </div>

                    {/* Staged Table / Empty State */}
                    {stagedConsignments.length === 0 ? (
                      <div className="py-8 text-center text-slate-400">
                        <Package className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                          No consignments staged for review yet
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

                                {/* Editable Logical Status Selector */}
                                <td className="py-2.5 px-3 font-sans">
                                  <select
                                    value={item.status}
                                    onChange={(e) =>
                                      handleUpdateStagedStatus(
                                        item.id,
                                        e.target.value as "booked" | "in_transit" | "out_for_delivery" | "delivered" | "returned"
                                      )
                                    }
                                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                                  >
                                    <option value="booked">Booked</option>
                                    <option value="in_transit">In Transit</option>
                                    <option value="out_for_delivery">Out for Delivery</option>
                                    <option value="delivered">Delivered</option>
                                    <option value="returned">Returned (RTO)</option>
                                  </select>
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
                        onClick={() => setIsCancelIntakeConfirmOpen(true)}
                        className="text-xs font-bold text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 underline cursor-pointer"
                      >
                        Clear All Staged ({stagedConsignments.length})
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={handleRequestCancelIntake}
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
              </>
            )}
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
                      : "Bulk Import"}
                  </h3>
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
                                Source: <span className="font-mono font-semibold">{previewFileName}</span>
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
                                            e.target.value as "booked" | "in_transit" | "out_for_delivery" | "delivered" | "returned"
                                          )
                                        }
                                        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                                      >
                                        <option value="booked">Booked</option>
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
                  {/* Download Sample CSV / Excel Template Banner */}
                  <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4 dark:border-indigo-900/50 dark:bg-indigo-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                        Sample Templates
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleDownloadSampleCsvTemplate}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-3.5 py-2 text-xs font-extrabold text-white shadow-xs cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Sample CSV</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadSampleTemplate}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-300 bg-white hover:bg-indigo-50 dark:border-indigo-700 dark:bg-slate-800 dark:hover:bg-slate-700 px-3 py-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 shadow-2xs cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Sample Excel</span>
                      </button>
                    </div>
                  </div>

                  {/* Upload Drop Zone */}
                  <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-6 text-center hover:border-indigo-500 hover:bg-indigo-50/20 dark:border-slate-700 dark:bg-slate-800/40 transition-colors">
                    <FileSpreadsheet className="mx-auto h-10 w-10 text-emerald-600 mb-2" />
                    <label
                      htmlFor="excel-file-input"
                      className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-3 cursor-pointer"
                    >
                      Select Excel (.xlsx, .xls) or CSV (.csv) file
                    </label>
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
                    Import Backup Data for Review
                  </h4>
                </div>

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
                          Review in Separate Dashboard Mode ({backupReviewData.shipments.length})
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
