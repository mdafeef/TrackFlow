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
} from "lucide-react";
import * as XLSX from "xlsx";
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
  // Default interval: 5 minutes = 300 seconds
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
    return 300; // 5 minutes default
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
    return 300;
  });

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isManualAddOpen, setIsManualAddOpen] = useState(false);
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Settings custom interval input
  const [customMinutesInput, setCustomMinutesInput] = useState("");

  // Manual Add Form state
  const [manualAwb, setManualAwb] = useState("");
  const [manualCourier, setManualCourier] = useState("speedpost");
  const [isManualCourierDropdownOpen, setIsManualCourierDropdownOpen] = useState(false);
  const [manualRecipient, setManualRecipient] = useState("");
  const [manualDestination, setManualDestination] = useState("");
  const [manualStatus, setManualStatus] = useState<"in_transit" | "out_for_delivery" | "delivered" | "returned">("in_transit");
  const [manualReturnReason, setManualReturnReason] = useState("");
  const [manualError, setManualError] = useState("");

  // Scanner Modal state
  const [continuousScanMode, setContinuousScanMode] = useState(true);
  const [scannedBatch, setScannedBatch] = useState<string[]>([]);
  const [scannerInputVal, setScannerInputVal] = useState("");
  const [scannerRecentSuccess, setScannerRecentSuccess] = useState<string | null>(null);
  const scannerInputRef = useRef<HTMLInputElement | null>(null);

  // Batch Wise Ingestion state
  const [selectedBatchId, setSelectedBatchId] = useState<string>("all");
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
  const [editingBatchName, setEditingBatchName] = useState("");

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

  // Clean up auto-close timer on component unmount
  useEffect(() => {
    return () => {
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
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
        const nextList = prev.map((item) => {
          if (item.status === "out_for_delivery" && updatedCount === 0) {
            updatedCount++;
            return {
              ...item,
              status: "delivered" as const,
              statusText: "Delivered to Recipient",
              lastUpdated: "Just Now",
            };
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

        if (updatedCount > 0) {
          playChime(false);
          // Removed notification banner: "Shipment status updated automatically!" per user instruction
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

  // Manual Add Shipment Submission
  const handleManualAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNum = manualAwb.trim().toUpperCase();
    if (!cleanNum) {
      setManualError("Please enter a valid tracking or consignment number.");
      return;
    }

    if (shipments.some((s) => s.trackingNumber === cleanNum)) {
      setManualError("This tracking number already exists in your dashboard.");
      return;
    }

    const courierMeta = COURIER_MAP[manualCourier] || autoDetectCourier(cleanNum) || COURIER_LIST[0];

    const newItem: BulkShipment = {
      id: `bulk-manual-${Date.now()}`,
      trackingNumber: cleanNum,
      courierId: courierMeta.id,
      courierName: courierMeta.name,
      status: manualStatus,
      statusText:
        manualStatus === "delivered"
          ? "Delivered to Recipient"
          : manualStatus === "out_for_delivery"
          ? "Out for Delivery Today"
          : manualStatus === "returned"
          ? "Returned to Shipper (RTO)"
          : "Active In-Transit Scan",
      origin: "Origin Facility",
      destination: manualDestination.trim() || "Destination Center",
      articleType: "Registered Consignment",
      weight: "250 g",
      lastUpdated: "Added Just Now",
      lastLocation: manualStatus === "returned" ? "Return Hub" : "Regional Sort Hub",
      recipientName: manualRecipient.trim() || "Addressee",
      returnReason: manualStatus === "returned" ? manualReturnReason.trim() || "Delivery Attempt Failed" : undefined,
    };

    saveShipments([newItem, ...shipments]);
    playChime(false);

    // Reset form
    setManualAwb("");
    setManualRecipient("");
    setManualDestination("");
    setManualStatus("in_transit");
    setManualReturnReason("");
    setManualError("");
    setIsManualAddOpen(false);
  };

  // High-Speed Continuous Barcode / QR Code Ingestion
  const processBarcodeScan = (awbCode: string) => {
    const cleanCode = awbCode.trim().toUpperCase();
    if (!cleanCode || cleanCode.length < 4) return;

    // Check if already in list
    const exists = shipments.find((s) => s.trackingNumber === cleanCode);
    if (!exists) {
      const detected = autoDetectCourier(cleanCode) || COURIER_LIST[0];
      const isReturnedSim = cleanCode.includes("RT") || cleanCode.includes("RETURN");
      const isDeliveredSim = cleanCode.endsWith("IN") && !isReturnedSim;

      const newScanned: BulkShipment = {
        id: `bulk-scan-${Date.now()}`,
        trackingNumber: cleanCode,
        courierId: detected.id,
        courierName: detected.name,
        status: isReturnedSim ? "returned" : isDeliveredSim ? "delivered" : "in_transit",
        statusText: isReturnedSim
          ? "Returned to Origin Hub (RTO)"
          : isDeliveredSim
          ? "Delivered to Recipient"
          : "Scanned at Transit Station",
        origin: "Origin Facility",
        destination: "Destination Hub",
        articleType: "Barcode Scanned Package",
        weight: "350 g",
        lastUpdated: "Scanned Just Now",
        lastLocation: "Scanner Terminal",
        returnReason: isReturnedSim ? "Customer Refused Delivery" : undefined,
      };

      saveShipments([newScanned, ...shipments]);
    }

    playChime(true);
    setScannedBatch((prev) => [cleanCode, ...prev.filter((c) => c !== cleanCode)]);
    setScannerRecentSuccess(cleanCode);
    setTimeout(() => setScannerRecentSuccess(null), 3000);

    // Immediately reset input and preserve focus for next scan
    setScannerInputVal("");
    if (scannerInputRef.current) {
      scannerInputRef.current.focus();
    }
  };

  // Handle hardware scanner or manual Enter in scanner modal
  const handleScannerInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      processBarcodeScan(scannerInputVal);
    }
  };

  // Auto-focus scanner input when modal opens
  useEffect(() => {
    if (isScannerModalOpen) {
      const timer = setTimeout(() => {
        scannerInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isScannerModalOpen]);

  // File Format Validation & Preview for Excel / Google Sheet files
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    setUploadSuccessMsg(null);
    setPreviewShipments(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Security Check 1: File Extension Verification
    const fileName = file.name.toLowerCase();
    const isValidExtension = fileName.endsWith(".xlsx") || fileName.endsWith(".xls");

    // Security Check 2: MIME Type Verification
    const validMimes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "application/wps-office.xlsx",
      "application/octet-stream", // Fallback for some OS file pickers
    ];
    const isValidMime = validMimes.includes(file.type) || file.type === "";

    // Reject dangerous file formats (executables, scripts, archives)
    const dangerousExtensions = [".exe", ".bat", ".cmd", ".sh", ".vbs", ".js", ".zip", ".tar", ".gz", ".pdf", ".csv", ".py", ".bin"];
    const isDangerous = dangerousExtensions.some((ext) => fileName.endsWith(ext));

    if (!isValidExtension || isDangerous) {
      setUploadError(
        "Invalid file format: Please upload a genuine Microsoft Excel (.xlsx, .xls) or exported Google Sheets workbook."
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Security Check 3: File Size Limit (Max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File size exceeds 5MB limit. Please upload an Excel file under 5MB.");
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
          throw new Error("No worksheets found in this Excel workbook.");
        }

        const worksheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1 });

        if (rows.length < 2) {
          throw new Error("The Excel spreadsheet contains no data rows. Please add tracking numbers below the header row.");
        }

        // Header row
        const firstRow = rows[0] || [];
        const headerRow = (firstRow as unknown[]).map((h) => String(h || "").toLowerCase().trim());
        let awbColIdx = headerRow.findIndex((h) => h.includes("track") || h.includes("awb") || h.includes("consign") || h.includes("number"));
        if (awbColIdx === -1) {
          // Fallback to first column
          awbColIdx = 0;
        }

        const courierColIdx = headerRow.findIndex((h) => h.includes("courier") || h.includes("carrier"));
        const recipientColIdx = headerRow.findIndex((h) => h.includes("recipient") || h.includes("customer") || h.includes("name"));
        const destColIdx = headerRow.findIndex((h) => h.includes("dest") || h.includes("city") || h.includes("address"));

        const parsedItems: BulkShipment[] = [];
        for (let i = 1; i < rows.length; i++) {
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
            articleType: "Excel Import",
            weight: "320 g",
            lastUpdated: "Just Imported",
            lastLocation: isReturnedSim ? "Return Hub" : "Regional Sort Facility",
            recipientName: rawRecipient || "Recipient",
            returnReason: isReturnedSim ? "Customer Refused Delivery" : undefined,
            isImported: true,
          });
        }

        if (parsedItems.length === 0) {
          throw new Error("No valid tracking numbers were found in this Excel sheet.");
        }

        // SHOW PREVIEW (DO NOT IMPORT DIRECTLY)
        setPreviewFileName(file.name);
        setPreviewShipments(parsedItems);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } catch (err: unknown) {
        setUploadError((err as Error)?.message || "Failed to parse Excel workbook. Please verify the file integrity.");
      } finally {
        setIsUploading(false);
      }
    };

    reader.onerror = () => {
      setUploadError("Could not read the uploaded file. Please verify it is a valid Excel spreadsheet.");
      setIsUploading(false);
    };

    reader.readAsArrayBuffer(file);
  };

  // Compute unique import batches
  const uniqueBatches = useMemo(() => {
    const map = new Map<
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
        const existing = map.get(s.batchId);
        if (existing) {
          existing.count++;
          if (s.status === "delivered") existing.delivered++;
          else if (s.status === "returned") existing.returned++;
          else existing.inTransit++;
        } else {
          map.set(s.batchId, {
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

    return Array.from(map.values());
  }, [shipments]);

  // User confirms importing the previewed shipments
  const handleConfirmImport = () => {
    if (!previewShipments || previewShipments.length === 0) return;

    // Filter out items already in shipments
    const newItems = previewShipments.filter(
      (p) => !shipments.some((s) => s.trackingNumber === p.trackingNumber)
    );

    if (newItems.length === 0) {
      setUploadError("All parsed tracking numbers are already in your dashboard.");
      return;
    }

    const nextBatchNum = uniqueBatches.length + 1;
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const cleanFileName = previewFileName.replace(/\.(xlsx|xls|csv)$/i, "");
    const newBatchId = `batch-${Date.now()}`;
    const newBatchName = `Batch #${nextBatchNum} • ${cleanFileName || "Excel File"}`;
    const importedAtStr = `Today, ${timeStr}`;

    const taggedItems: BulkShipment[] = newItems.map((item) => ({
      ...item,
      isImported: true,
      batchId: newBatchId,
      batchName: newBatchName,
      importedAt: importedAtStr,
    }));

    const updated = [...taggedItems, ...shipments];
    saveShipments(updated);
    playChime(false);

    // Show Successfully imported status and batch info in modal
    setImportSuccessState({
      count: taggedItems.length,
      batchName: newBatchName,
      batchId: newBatchId,
    });
    setUploadError(null);
    setUploadSuccessMsg(null);

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
    setImportSuccessState(null);
    setUploadError(null);
    setUploadSuccessMsg(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Delete an entire batch
  const handleDeleteBatch = (batchId: string) => {
    const targetBatch = uniqueBatches.find((b) => b.id === batchId);
    const confirmName = targetBatch ? targetBatch.name : "this batch";
    if (
      window.confirm(
        `Are you sure you want to remove ${confirmName} (${targetBatch?.count || 0} consignments) from your dashboard?`
      )
    ) {
      const updated = shipments.filter((s) => s.batchId !== batchId);
      saveShipments(updated);
      if (selectedBatchId === batchId) {
        setSelectedBatchId("all");
      }
    }
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
    if (
      window.confirm(
        `Are you sure you want to replace all ${shipments.length} live consignments with the ${backupReviewData.shipments.length} records from ${backupReviewData.fileName}?`
      )
    ) {
      saveShipments(backupReviewData.shipments);
      playChime(false);
      setBackupSuccessMsg(`Restored ${backupReviewData.shipments.length} shipments from backup!`);
      setIsReviewingSeparately(false);
    }
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

  // Delete shipment
  const handleDeleteShipment = (id: string) => {
    const updated = shipments.filter((s) => s.id !== id);
    saveShipments(updated);
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

          {/* Action Buttons: Add Manual ID, Scan Barcode / QR, Bulk Import */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Add Tracking ID Manually */}
            <button
              type="button"
              onClick={() => {
                setManualError("");
                setIsManualAddOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:border-indigo-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 shadow-2xs transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4 text-indigo-600 dark:text-indigo-400 stroke-[2.4]" />
              <span>Add ID Manually</span>
            </button>

            {/* Continuous Barcode & QR Scanner */}
            <button
              type="button"
              onClick={() => {
                setScannerInputVal("");
                setScannedBatch([]);
                setIsScannerModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:border-indigo-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 shadow-2xs transition-all cursor-pointer"
            >
              <ScanLine className="h-4 w-4 text-indigo-600 dark:text-indigo-400 stroke-[2.4]" />
              <span>Scan Barcode / QR</span>
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
      {/* 3. TABLE FILTER CONTROLS                                       */}
      {/* ============================================================== */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input & Quick Imported Filter Button */}
        <div className="flex items-center gap-2 flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search AWB, Courier, Recipient, or City..."
              className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3.5 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            />
          </div>

          {/* Quick Filter: Imported Data Only */}
          {importedCount > 0 && (
            <button
              type="button"
              onClick={() => {
                if (statusFilter === "imported") {
                  setStatusFilter("all");
                  setSelectedBatchId("all");
                } else {
                  setStatusFilter("imported");
                }
              }}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-all cursor-pointer shrink-0 ${
                statusFilter === "imported"
                  ? "border-emerald-500 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 shadow-xs"
                  : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/40 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
              }`}
              title="Quick filter: View imported consignments only"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
              <span>Imported ({importedCount})</span>
              {statusFilter === "imported" && <Check className="h-3.5 w-3.5 text-emerald-600" />}
            </button>
          )}

          {/* Active Batch Filter Tag */}
          {selectedBatchId !== "all" && (
            <button
              type="button"
              onClick={() => setSelectedBatchId("all")}
              className="inline-flex items-center gap-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 px-2.5 py-2 text-xs font-bold text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer shrink-0 shadow-2xs"
              title="Clear active batch filter"
            >
              <span>{uniqueBatches.find((b) => b.id === selectedBatchId)?.name.split(" • ")[0] || "Active Batch"}</span>
              <X className="h-3 w-3 text-indigo-500" />
            </button>
          )}
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              setStatusFilter("all");
              setSelectedBatchId("all");
            }}
            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
              statusFilter === "all"
                ? "bg-white text-indigo-600 shadow-xs dark:bg-slate-900 dark:text-indigo-400"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            All ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("delivered")}
            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
              statusFilter === "delivered"
                ? "bg-white text-emerald-600 shadow-xs dark:bg-slate-900 dark:text-emerald-400"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            Delivered ({deliveredCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("in_transit")}
            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
              statusFilter === "in_transit"
                ? "bg-white text-sky-600 shadow-xs dark:bg-slate-900 dark:text-sky-400"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            In Transit ({inTransitCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("out_for_delivery")}
            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
              statusFilter === "out_for_delivery"
                ? "bg-white text-amber-600 shadow-xs dark:bg-slate-900 dark:text-amber-400"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            Out ({outCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("returned")}
            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
              statusFilter === "returned"
                ? "bg-white text-rose-600 shadow-xs dark:bg-slate-900 dark:text-rose-400"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            Returned ({returnedCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("imported")}
            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === "imported"
                ? "bg-white text-emerald-700 shadow-xs dark:bg-slate-900 dark:text-emerald-400 font-extrabold"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
            title="View imported items from Excel"
          >
            <FileSpreadsheet className="h-3 w-3 text-emerald-600" />
            <span>Imported ({importedCount})</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3B. BATCH-WISE INGESTION NAVIGATOR                             */}
      {/* ============================================================== */}
      {(statusFilter === "imported" || selectedBatchId !== "all") && uniqueBatches.length > 0 && (
        <div className="rounded-2xl border border-emerald-200/90 bg-emerald-50/50 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/30 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-2xs">
                <FileSpreadsheet className="h-4 w-4" />
              </span>
              <div>
                <div className="text-xs font-black text-slate-900 dark:text-white">
                  Imported Batches ({uniqueBatches.length} Available)
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Select a batch to inspect consignments, tracking states, or manage records
                </div>
              </div>
            </div>

            {/* Batch Selector Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedBatchId("all")}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  selectedBatchId === "all"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-white text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                }`}
              >
                All Batches ({importedCount})
              </button>
              {uniqueBatches.map((batch) => (
                <button
                  key={batch.id}
                  type="button"
                  onClick={() => setSelectedBatchId(batch.id)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedBatchId === batch.id
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-white text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                  }`}
                  title={`${batch.name} • ${batch.importedAt}`}
                >
                  <span>{batch.name.split(" • ")[0]}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                      selectedBatchId === batch.id
                        ? "bg-emerald-700/90 text-white"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {batch.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Active Batch Summary & Quick Actions */}
          {selectedBatchId !== "all" && (() => {
            const activeBatch = uniqueBatches.find((b) => b.id === selectedBatchId);
            if (!activeBatch) return null;
            return (
              <div className="pt-3 border-t border-emerald-200/60 dark:border-emerald-900/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-slate-700 dark:text-slate-300">
                  <span className="font-extrabold text-slate-900 dark:text-white">
                    {activeBatch.name}
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-500 text-[11px]">
                    Imported: {activeBatch.importedAt}
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {activeBatch.delivered} Delivered
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="inline-flex items-center gap-1 font-bold text-sky-700 dark:text-sky-400">
                    <Truck className="h-3.5 w-3.5" />
                    {activeBatch.inTransit} In Transit
                  </span>
                  {activeBatch.returned > 0 && (
                    <>
                      <span className="text-slate-400">•</span>
                      <span className="inline-flex items-center gap-1 font-bold text-rose-700 dark:text-rose-400">
                        <RotateCcw className="h-3.5 w-3.5" />
                        {activeBatch.returned} Returned
                      </span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSelectedBatchId("all")}
                    className="text-[11px] font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 underline cursor-pointer"
                  >
                    View All Batches
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteBatch(activeBatch.id)}
                    className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100 dark:bg-rose-950/80 dark:text-rose-300 transition-colors cursor-pointer"
                    title="Remove this batch of shipments"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Delete Batch</span>
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. SHIPMENTS DATA TABLE                                        */}
      {/* ============================================================== */}
      <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:bg-slate-800/60 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-4 sm:px-6">Consignment / AWB</th>
                <th className="py-3.5 px-4">Courier Network</th>
                <th className="py-3.5 px-4">Current Status</th>
                <th className="py-3.5 px-4">Last Event</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredShipments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
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
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                  >
                    {/* AWB & Copy */}
                    <td className="py-3.5 px-4 sm:px-6">
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
                          <button
                            type="button"
                            onClick={() => {
                              setStatusFilter("imported");
                              if (item.batchId) setSelectedBatchId(item.batchId);
                            }}
                            className="inline-flex items-center gap-1 rounded-md bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/80 dark:hover:bg-emerald-900/80 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 transition-colors cursor-pointer"
                            title={`Filter by ${item.batchName || "this batch"}`}
                          >
                            <FileSpreadsheet className="h-2.5 w-2.5 text-emerald-600" />
                            <span>{item.batchName ? item.batchName.split(" • ")[0] : "Imported"}</span>
                          </button>
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

                    {/* Action buttons */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onOpenTrackingResult(item.trackingNumber, item.courierId)}
                          className="rounded-lg bg-indigo-50 hover:bg-indigo-600 hover:text-white px-2.5 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 dark:hover:bg-indigo-600 dark:hover:text-white transition-all cursor-pointer"
                        >
                          Track
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteShipment(item.id)}
                          className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-colors"
                          title="Remove from dashboard"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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
      {/* 5. AUTO-CHECK SETTINGS MODAL                                   */}
      {/* ============================================================== */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="fixed inset-0" onClick={() => setIsSettingsOpen(false)} />
          <div
            className="relative z-10 w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Auto-Check Frequency & Settings
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 space-y-5">
              {/* Auto check toggle */}
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 dark:bg-slate-800/80 p-3.5 border border-slate-200/80 dark:border-slate-700">
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    Automatic Background Check
                  </div>
                  <div className="text-[11px] text-slate-500">
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
                  Select Frequency:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "5 mins (Default)", sec: 300 },
                    { label: "10 mins", sec: 600 },
                    { label: "15 mins", sec: 900 },
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
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Custom Frequency:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="1440"
                    placeholder="Enter minutes (e.g. 8)"
                    value={customMinutesInput}
                    onChange={(e) => setCustomMinutesInput(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const mins = parseInt(customMinutesInput, 10);
                      if (mins > 0) {
                        handleChangeInterval(mins * 60);
                      }
                    }}
                    className="rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 cursor-pointer"
                  >
                    Set
                  </button>
                </div>
                <p className="mt-1.5 text-[11px] text-slate-400">
                  Current active interval: {Math.round(checkIntervalSec / 60)} minutes ({checkIntervalSec} seconds).
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 transition-colors cursor-pointer"
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 6. MANUAL ADD TRACKING ID MODAL                                */}
      {/* ============================================================== */}
      {isManualAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="fixed inset-0" onClick={() => setIsManualAddOpen(false)} />
          <div
            className="relative z-10 w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Add Tracking ID Manually
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsManualAddOpen(false)}
                className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleManualAddSubmit} className="mt-5 space-y-4">
              {/* Tracking Number Input */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Consignment / AWB Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. EL855948618IN or B4000211866"
                  value={manualAwb}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    setManualAwb(val);
                    setManualError("");
                    const detected = autoDetectCourier(val);
                    if (detected) setManualCourier(detected.id);
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 font-mono text-xs font-bold text-slate-900 uppercase tracking-wider focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {/* Courier Selection */}
              <div className="relative">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Courier Partner
                </label>
                <button
                  type="button"
                  onClick={() => setIsManualCourierDropdownOpen(!isManualCourierDropdownOpen)}
                  className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-750 transition-colors shadow-2xs cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-black text-white ${
                        COURIER_MAP[manualCourier]?.badgeColor || "bg-indigo-600"
                      }`}
                    >
                      {(COURIER_MAP[manualCourier]?.shortName || "CP").slice(0, 3)}
                    </span>
                    <span className="truncate font-semibold">
                      {COURIER_MAP[manualCourier]
                        ? `${COURIER_MAP[manualCourier].name} (${COURIER_MAP[manualCourier].shortName})`
                        : "Select Courier Partner"}
                    </span>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-slate-400 shrink-0 transition-transform ${
                      isManualCourierDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isManualCourierDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsManualCourierDropdownOpen(false)}
                    />
                    <div className="absolute left-0 top-full mt-1.5 z-50 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xl dark:border-slate-700 dark:bg-slate-800">
                      {COURIER_LIST.map((c) => {
                        const isSelected = manualCourier === c.id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setManualCourier(c.id);
                              setIsManualCourierDropdownOpen(false);
                            }}
                            className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition-colors cursor-pointer ${
                              isSelected
                                ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-bold"
                                : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700/60"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[9px] font-black text-white ${c.badgeColor}`}
                              >
                                {c.shortName.slice(0, 3)}
                              </span>
                              <span className="truncate font-semibold">{c.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">({c.shortName})</span>
                            </div>
                            {isSelected && (
                              <Check className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* Recipient & Destination Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Recipient Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rajesh Kumar"
                    value={manualRecipient}
                    onChange={(e) => setManualRecipient(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Destination City (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Coimbatore SO"
                    value={manualDestination}
                    onChange={(e) => setManualDestination(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              {/* Status Select (Including Returned/RTO option) */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Shipment Status
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: "in_transit", label: "In Transit" },
                    { id: "out_for_delivery", label: "Out for Delivery" },
                    { id: "delivered", label: "Delivered" },
                    { id: "returned", label: "Returned (RTO)" },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setManualStatus(s.id as "in_transit" | "out_for_delivery" | "delivered" | "returned")}
                      className={`rounded-xl border py-2 px-2 text-center text-xs font-bold transition-all cursor-pointer ${
                        manualStatus === s.id
                          ? s.id === "returned"
                            ? "border-rose-500 bg-rose-50 text-rose-700 dark:border-rose-600 dark:bg-rose-950/60 dark:text-rose-300"
                            : "border-indigo-600 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/60 dark:text-indigo-300"
                          : "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:text-slate-300"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* If Returned is selected, allow entering return reason */}
              {manualStatus === "returned" && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-3.5 dark:border-rose-900/50 dark:bg-rose-950/40">
                  <label className="text-xs font-bold text-rose-800 dark:text-rose-300 block mb-1">
                    Return Reason:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Addressee Moved / Customer Refused Delivery"
                    value={manualReturnReason}
                    onChange={(e) => setManualReturnReason(e.target.value)}
                    className="w-full rounded-xl border border-rose-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-900 focus:border-rose-500 focus:outline-none dark:border-rose-800 dark:bg-slate-900 dark:text-white"
                  />
                </div>
              )}

              {/* Error banner */}
              {manualError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs font-semibold text-rose-700">
                  {manualError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsManualAddOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2 text-xs font-extrabold text-white shadow-xs"
                >
                  Add Consignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 7. HIGH-SPEED CONTINUOUS BARCODE & QR SCANNER MODAL            */}
      {/* ============================================================== */}
      {isScannerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="fixed inset-0" onClick={() => setIsScannerModalOpen(false)} />
          <div
            className="relative z-10 w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                  <ScanLine className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    High-Speed Barcode & QR Scanner
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Supports handheld laser scanners, camera targeting, and instant auto-next ID scanning.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsScannerModalOpen(false)}
                className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Continuous Mode Indicator & Input */}
            <div className="mt-4 space-y-4">
              {/* Continuous multi-scan status banner */}
              <div className="flex items-center justify-between rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/50 p-3 border border-indigo-200/60 dark:border-indigo-900/60 text-xs">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <span className="font-extrabold text-indigo-900 dark:text-indigo-200">
                    Auto-Advance Scanner Active
                  </span>
                </div>
                <span className="font-mono text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
                  {scannedBatch.length} scanned this session
                </span>
              </div>

              {/* Hardware Scanner & Keyboard Wedge Input */}
              <div className="rounded-2xl border-2 border-indigo-500/50 bg-slate-50 p-4 dark:border-indigo-500/40 dark:bg-slate-800/60">
                <label className="text-xs font-extrabold text-slate-800 dark:text-slate-200 block mb-1.5">
                  Point barcode scanning gun or type AWB (Press Enter to ingest):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    ref={scannerInputRef}
                    type="text"
                    value={scannerInputVal}
                    onChange={(e) => setScannerInputVal(e.target.value.toUpperCase())}
                    onKeyDown={handleScannerInputKeyDown}
                    placeholder="Scan barcode now..."
                    className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-mono text-sm font-black text-slate-900 tracking-wider focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => processBarcodeScan(scannerInputVal)}
                    className="rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs cursor-pointer"
                  >
                    Add
                  </button>
                </div>

                {/* Instant Success Flash Notification */}
                {scannerRecentSuccess && (
                  <div className="mt-2.5 flex items-center gap-1.5 rounded-xl bg-emerald-100/90 px-3 py-1.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 animate-in fade-in">
                    <CheckCheck className="h-4 w-4 text-emerald-600" />
                    <span>✓ Added: {scannerRecentSuccess} — Ready for next barcode!</span>
                  </div>
                )}
              </div>

              {/* Interactive Camera Reticle Simulator */}
              <div className="relative h-44 rounded-2xl bg-slate-950 overflow-hidden flex items-center justify-center border border-slate-800">
                {/* Laser animation */}
                <div className="absolute left-6 right-6 h-0.5 bg-red-500 shadow-[0_0_12px_#ef4444] animate-bounce" />

                {/* Reticle brackets */}
                <div className="absolute inset-8 border border-white/20 rounded-xl flex items-center justify-center">
                  <div className="text-center text-white/50 text-xs">
                    <QrCode className="h-10 w-10 mx-auto mb-1 opacity-70" />
                    <span>Place QR code or Barcode in center</span>
                  </div>
                </div>
              </div>

              {/* Instant Test Barcodes: Click to simulate rapid continuous scanning */}
              <div>
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1.5">
                  Click to simulate auto-scanning barcodes:
                </span>
                <div className="flex flex-wrap gap-2">
                  {[
                    { awb: "EL855948618IN", label: "India Post" },
                    { awb: "B4000211866", label: "DTDC" },
                    { awb: "FMPP4397267510", label: "Ekart" },
                    { awb: "12345678901", label: "Blue Dart" },
                    { awb: "RT855948618IN", label: "Returned (RTO)" },
                  ].map((s) => (
                    <button
                      key={s.awb}
                      type="button"
                      onClick={() => processBarcodeScan(s.awb)}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-mono font-bold text-slate-700 hover:border-indigo-500 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 shadow-2xs transition-colors cursor-pointer"
                    >
                      <span className="text-indigo-600 font-sans">{s.label}: </span>
                      {s.awb}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scanned in this session list */}
              {scannedBatch.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Scanned in this batch:
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {scannedBatch.map((awb) => (
                      <span
                        key={awb}
                        className="rounded-md bg-white border border-slate-200 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-800 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
                      >
                        {awb}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsScannerModalOpen(false)}
                  className="rounded-xl bg-slate-900 hover:bg-slate-800 px-5 py-2 text-xs font-bold text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 cursor-pointer"
                >
                  Done Scanning
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 8. BULK IMPORT MODAL WITH PREVIEW & CONFIRMATION               */}
      {/* ============================================================== */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="fixed inset-0" onClick={() => setIsUploadModalOpen(false)} />
          <div
            className="relative z-10 w-full max-w-xl sm:max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                    importSuccessState
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
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
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {importSuccessState
                      ? "Successfully Imported!"
                      : previewShipments
                      ? "Review & Confirm Bulk Import"
                      : "Bulk Import"}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {importSuccessState
                      ? "Consignments verified and committed to dashboard"
                      : previewShipments
                      ? `Previewing parsed rows from ${previewFileName}`
                      : "Upload Microsoft Excel (.xlsx, .xls) or Google Sheets workbooks"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseUploadModal}
                className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 cursor-pointer"
                title="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
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
                /* PREVIEW MODE: Review & Confirm before adding to dashboard */
                <div className="space-y-4">
                  {/* Preview Summary Banner */}
                  <div className="flex items-center justify-between rounded-2xl bg-indigo-50/80 p-3.5 border border-indigo-200/80 dark:bg-indigo-950/40 dark:border-indigo-800">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white font-black text-xs">
                        <FileSpreadsheet className="h-4 w-4" />
                      </span>
                      <div>
                        <div className="text-xs font-extrabold text-slate-900 dark:text-white">
                          {previewShipments.length} Consignments Ready to Import
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 truncate max-w-xs">
                          {previewFileName} • Will create <strong>Batch #{uniqueBatches.length + 1}</strong>
                        </div>
                      </div>
                    </div>
                    <span className="rounded-md bg-emerald-100 px-2.5 py-1 text-[11px] font-extrabold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      Format Verified
                    </span>
                  </div>

                  {/* Preview Table */}
                  <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div className="max-h-60 overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="sticky top-0 bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                          <tr>
                            <th className="py-2.5 px-3">#</th>
                            <th className="py-2.5 px-3">AWB / Consignment</th>
                            <th className="py-2.5 px-3">Courier</th>
                            <th className="py-2.5 px-3">Destination</th>
                            <th className="py-2.5 px-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                          {previewShipments.map((p, idx) => (
                            <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                              <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                              <td className="py-2.5 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                {p.trackingNumber}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                                  <span
                                    className={`h-2 w-2 rounded-full ${
                                      COURIER_MAP[p.courierId]?.badgeColor || "bg-indigo-500"
                                    }`}
                                  />
                                  {p.courierName}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 truncate max-w-[130px]">
                                {p.destination}
                              </td>
                              <td className="py-2.5 px-3">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                    p.status === "delivered"
                                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                      : p.status === "returned"
                                      ? "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                                      : "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
                                  }`}
                                >
                                  {p.status === "delivered"
                                    ? "Delivered"
                                    : p.status === "returned"
                                    ? "Returned"
                                    : "In Transit"}
                                </span>
                              </td>
                            </tr>
                          ))}
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
                      Cancel / Choose Another File
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmImport}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2.5 text-xs font-extrabold text-white shadow-xs cursor-pointer transition-colors"
                    >
                      <Check className="h-4 w-4 stroke-[3]" />
                      <span>Confirm Import ({previewShipments.length} Shipments)</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* UPLOAD SELECTION MODE */
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
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1 cursor-pointer">
                      Click to select Excel (.xlsx, .xls) file
                    </label>
                    <p className="text-[11px] text-slate-400 mb-3">
                      Exported Google Sheets or Microsoft Excel workbooks (max 5MB)
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx, .xls, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                      onChange={handleFileChange}
                      className="hidden"
                      id="excel-file-input"
                    />
                    <label
                      htmlFor="excel-file-input"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 shadow-2xs cursor-pointer"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span>Browse Excel File</span>
                    </label>
                  </div>

                  {/* Error Alert */}
                  {uploadError && (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3.5 dark:border-rose-900/60 dark:bg-rose-950/60 flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-300">
                      <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold">File Rejected</div>
                        <div className="mt-0.5">{uploadError}</div>
                      </div>
                    </div>
                  )}

                  {/* Success Alert */}
                  {uploadSuccessMsg && (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 dark:border-emerald-900/60 dark:bg-emerald-950/60 flex items-start gap-2.5 text-xs text-emerald-800 dark:text-emerald-300">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="font-bold">Import Successful</div>
                        <div className="mt-0.5">{uploadSuccessMsg}</div>
                        <div className="mt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setStatusFilter("imported");
                              handleCloseUploadModal();
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300 hover:underline cursor-pointer"
                          >
                            <span>View Imported Consignments in Dashboard →</span>
                          </button>
                        </div>
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
    </div>
  );
}
