"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Package,
  PackageSearch,
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
  LayoutDashboard,
  User,
  Phone,
  MapPin,
  FolderKanban,
  Building2,
  Mail,
  BadgeCheck,
  PanelLeftClose,
  Menu,
  Minus,
  Filter,
  Sparkles,
  Layers,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Tag,
  LayoutGrid,
  UserCheck,
  AlertTriangle,
  LogOut,
} from "lucide-react";
import { AuthUserProfile } from "@/app/api/auth/route";
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
import {
  WORKSPACE_TAB_PATHS,
  resolveRouteFromPathname,
  silentNavigateTab,
} from "@/lib/tabRoutes";
import BulkLabelPrintTool from "@/components/BulkLabelPrintTool";
import {
  decryptCustomerMiniQR,
  validateIndianPhone,
  validateIndianPincode,
} from "@/lib/customerQrCrypto";

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
  customerPhone?: string;
  pincode?: string;
  itemCode?: string;
  isImported?: boolean;
  batchId?: string;
  batchName?: string;
  importedAt?: string;
  importedDate?: string;
}

const getTodayIso = () => new Date().toISOString().split("T")[0];
const getYesterdayIso = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
};

const resolveShipmentIsoDate = (s: BulkShipment): string => {
  if (s.importedDate && /^\d{4}-\d{2}-\d{2}$/.test(s.importedDate)) {
    return s.importedDate;
  }
  const combined = `${s.importedAt || ""} ${s.lastUpdated || ""}`.toLowerCase();
  if (combined.includes("yesterday")) return getYesterdayIso();
  const isoMatch = combined.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (isoMatch) return isoMatch[1];
  return getTodayIso();
};

const DEFAULT_SHIPMENTS: BulkShipment[] = [
  {
    id: "bulk-1",
    trackingNumber: "EL855948618IN",
    courierId: "speedpost",
    courierName: "India Post Speed Post",
    status: "delivered",
    statusText: "Delivered to Recipient",
    origin: "Ayyanthole SO (680003)",
    destination: "Nedumkunnam SO",
    pincode: "686542",
    itemCode: "ITM-1042",
    articleType: "Speed Post Doc",
    weight: "45 g",
    lastUpdated: "Today, 01:44 PM",
    lastLocation: "Nedumkunnam SO",
    recipientName: "Dr. K. R. Nair",
    customerPhone: "9847011223",
    importedDate: getTodayIso(),
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
    pincode: "676503",
    articleType: "Express Cargo",
    weight: "1.2 kg",
    lastUpdated: "Today, 10:30 AM",
    lastLocation: "Kottakkal Hub",
    recipientName: "Ananya Sharma",
    customerPhone: "9895122334",
    importedDate: getTodayIso(),
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
    pincode: "226001",
    articleType: "E-Commerce Parcel",
    weight: "450 g",
    lastUpdated: "Today, 08:15 AM",
    lastLocation: "Kanpur Transit Hub",
    recipientName: "Vikram Patel",
    customerPhone: "9415033445",
    importedDate: getTodayIso(),
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
    pincode: "641001",
    articleType: "Registered Article",
    weight: "110 g",
    lastUpdated: "Today, 11:20 AM",
    lastLocation: "Chennai Central Hub",
    returnReason: "Addressee Moved / Incomplete Address",
    recipientName: "R. Ramanathan",
    customerPhone: "9840144556",
    importedDate: getTodayIso(),
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
    pincode: "682001",
    articleType: "Commercial Sample",
    weight: "850 g",
    lastUpdated: "Yesterday, 04:45 PM",
    lastLocation: "Bangalore Return Hub",
    returnReason: "Consignee Refused Acceptance",
    recipientName: "Mathews Thomas",
    customerPhone: "9447255667",
    isImported: true,
    batchId: "batch-demo-1",
    batchName: "Batch #1 • sample_records.xlsx",
    importedAt: "Yesterday, 04:45 PM",
    importedDate: getYesterdayIso(),
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
    pincode: "600032",
    articleType: "Air Express Document",
    weight: "180 g",
    lastUpdated: "Today, 06:40 AM",
    lastLocation: "Chennai Air Hub",
    recipientName: "Pooja Verma",
    customerPhone: "9820366778",
    isImported: true,
    batchId: "batch-demo-1",
    batchName: "Batch #1 • sample_records.xlsx",
    importedAt: "Yesterday, 04:45 PM",
    importedDate: getYesterdayIso(),
  },
];

export type SidebarMenuId = "dashboard" | "data" | "batches" | "labels" | "analytics" | "settings" | "profile";

interface BulkDashboardProps {
  onOpenTrackingResult: (trackingNumber: string, courierId: string) => void;
  authUser?: AuthUserProfile | null;
  onLogout?: () => void;
  onProfileUpdated?: (profile: AuthUserProfile) => void;
}

export function BulkDashboard({
  onOpenTrackingResult,
  authUser,
  onLogout,
  onProfileUpdated,
}: BulkDashboardProps) {
  const router = useRouter();
  // Shipments state with batch metadata normalization
  const [shipments, setShipments] = useState<BulkShipment[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("trackflow_bulk_shipments");
        if (stored) {
          const list: BulkShipment[] = JSON.parse(stored);
          return list.map((s) => {
            const extractedPin = s.pincode || (s.destination.match(/\b\d{6}\b/)?.[0] ?? "");
            const resolvedIso = resolveShipmentIsoDate(s);
            if (s.isImported && !s.batchId) {
              return {
                ...s,
                pincode: extractedPin || undefined,
                batchId: "batch-demo-1",
                batchName: "Batch #1 • sample_records.xlsx",
                importedAt: s.lastUpdated || "Earlier Ingestion",
                importedDate: resolvedIso,
              };
            }
            return {
              ...s,
              pincode: extractedPin || undefined,
              importedDate: resolvedIso,
            };
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
  const [activeMenu, setActiveMenuState] = useState<SidebarMenuId>("dashboard");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const resolved = resolveRouteFromPathname(window.location.pathname);
      if (resolved.view === "bulk") {
        setActiveMenuState(resolved.workspaceTab);
      }
    }
  }, []);

  const setActiveMenu = React.useCallback((next: SidebarMenuId, skipUrlPush: boolean = false) => {
    setActiveMenuState(next);
    if (!skipUrlPush && WORKSPACE_TAB_PATHS[next]) {
      silentNavigateTab(WORKSPACE_TAB_PATHS[next]);
    }
  }, []);

  // Collapsible Left Sidebar & Mobile Drawer State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  useEffect(() => {
    try {
      if (localStorage.getItem("trackflow_sidebar_collapsed") === "true") {
        setIsSidebarCollapsed(true);
      }
    } catch {}
  }, []);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  const toggleSidebarCollapse = React.useCallback(() => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("trackflow_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  }, []);

  // Sync workspace menu & sidebar state with top Navbar
  useEffect(() => {
    const handleToggleDrawer = () => {
      setIsMobileSidebarOpen((prev) => !prev);
    };
    const handleToggleCollapse = () => {
      toggleSidebarCollapse();
    };
    const handleSetMenu = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      const menu = detail?.menu as SidebarMenuId | undefined;
      if (menu) {
        setActiveMenu(menu, Boolean(detail?.skipUrlPush));
        setIsMobileSidebarOpen(false);
      }
    };
    window.addEventListener("trackflow:toggle-workspace-drawer", handleToggleDrawer);
    window.addEventListener("trackflow:toggle-sidebar-collapse", handleToggleCollapse);
    window.addEventListener("trackflow:set-workspace-menu", handleSetMenu);
    return () => {
      window.removeEventListener("trackflow:toggle-workspace-drawer", handleToggleDrawer);
      window.removeEventListener("trackflow:toggle-sidebar-collapse", handleToggleCollapse);
      window.removeEventListener("trackflow:set-workspace-menu", handleSetMenu);
    };
  }, [toggleSidebarCollapse, setActiveMenu]);

  const mobileDrawerRef = React.useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isMobileSidebarOpen) return;
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (mobileDrawerRef.current?.contains(target)) return;
      const hamburgerBtn = document.getElementById("trackflow-hamburger-btn");
      if (hamburgerBtn && hamburgerBtn.contains(target)) return;
      setIsMobileSidebarOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [isMobileSidebarOpen]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("trackflow:workspace-state", {
        detail: {
          isMobileSidebarOpen,
          isSidebarCollapsed,
          activeMenu,
        },
      })
    );
  }, [isMobileSidebarOpen, isSidebarCollapsed, activeMenu]);

  // Custom Styled Dropdown States
  const [isFilterBatchDropdownOpen, setIsFilterBatchDropdownOpen] = useState<boolean>(false);
  const [isFilterStatusDropdownOpen, setIsFilterStatusDropdownOpen] = useState<boolean>(false);
  const [isExportBatchDropdownOpen, setIsExportBatchDropdownOpen] = useState<boolean>(false);
  const [isExportFormatDropdownOpen, setIsExportFormatDropdownOpen] = useState<boolean>(false);
  const [isExportDateDropdownOpen, setIsExportDateDropdownOpen] = useState<boolean>(false);
  const [isExportStatusDropdownOpen, setIsExportStatusDropdownOpen] = useState<boolean>(false);
  const [isEditStatusDropdownOpen, setIsEditStatusDropdownOpen] = useState<boolean>(false);
  const [openRowDropdown, setOpenRowDropdown] = useState<{
    id: string;
    field: "courier" | "status";
  } | null>(null);

  // Customer & Consignment Full Details Modal (triggered on clicking any row in Dashboard/Consignments table)
  const [selectedDetailShipment, setSelectedDetailShipment] = useState<BulkShipment | null>(null);

  // Batch Manager Search & Filter State
  const [batchSearchQuery, setBatchSearchQuery] = useState<string>("");

  // Date-Wise Analysis & Export States (in Analytics Tab)
  const [analyticsDateFilter, setAnalyticsDateFilter] = useState<
    "all" | "today" | "yesterday" | "last_7_days" | "custom"
  >("all");
  const [customStartDate, setCustomStartDate] = useState<string>(() => getYesterdayIso());
  const [customEndDate, setCustomEndDate] = useState<string>(() => getTodayIso());
  const [isCustomCalendarOpen, setIsCustomCalendarOpen] = useState<boolean>(false);
  const [calendarMonthCursor, setCalendarMonthCursor] = useState<{ year: number; month: number }>(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [calendarPickingField, setCalendarPickingField] = useState<"start" | "end">("start");

  // Date-Wise Backup States (in Settings Tab)
  const [backupDateFilter, setBackupDateFilter] = useState<
    "all" | "today" | "yesterday" | "last_7_days" | "custom"
  >("all");
  const [backupStartDate, setBackupStartDate] = useState<string>(() => getYesterdayIso());
  const [backupEndDate, setBackupEndDate] = useState<string>(() => getTodayIso());
  const [isBackupCalendarOpen, setIsBackupCalendarOpen] = useState<boolean>(false);
  const [backupCalendarPickingField, setBackupCalendarPickingField] = useState<"start" | "end">("start");

  const [exportStatusTarget, setExportStatusTarget] = useState<
    "all" | "booked" | "in_transit" | "out_for_delivery" | "delivered" | "returned"
  >("all");

  // User Profile & Account State
  const [userProfile, setUserProfile] = useState<{
    fullName: string;
    email: string;
    phone: string;
    companyName: string;
    role: string;
    hubCity: string;
    hubPincode: string;
  }>(() => {
    if (authUser) {
      return {
        fullName: authUser.fullName,
        email: authUser.email,
        phone: authUser.phone,
        companyName: authUser.companyName,
        role: authUser.role,
        hubCity: authUser.hubCity,
        hubPincode: authUser.hubPincode,
      };
    }
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("trackflow_user_profile");
        if (raw) return JSON.parse(raw);
      } catch {}
    }
    return {
      fullName: "Mhd Afeef",
      email: "mhdafeef@gmail.com",
      phone: "9847011223",
      companyName: "TrackFlow Logistics Operations",
      role: "Operations Admin",
      hubCity: "Kochi Central Hub",
      hubPincode: "682001",
    };
  });
  const [profileSavedMsg, setProfileSavedMsg] = useState<string | null>(null);

  const [prevAuthEmail, setPrevAuthEmail] = useState<string | undefined>(authUser?.email);
  if (authUser && authUser.email !== prevAuthEmail) {
    setPrevAuthEmail(authUser.email);
    setUserProfile({
      fullName: authUser.fullName,
      email: authUser.email,
      phone: authUser.phone,
      companyName: authUser.companyName,
      role: authUser.role,
      hubCity: authUser.hubCity,
      hubPincode: authUser.hubPincode,
    });
  }

  // Inline Customer & Consignment Edit Modal State
  const [editingShipment, setEditingShipment] = useState<BulkShipment | null>(null);
  const [editCustomerName, setEditCustomerName] = useState("");
  const [editCustomerPhone, setEditCustomerPhone] = useState("");
  const [editPincode, setEditPincode] = useState("");
  const [editItemCode, setEditItemCode] = useState("");
  const [editDestination, setEditDestination] = useState("");
  const [editStatus, setEditStatus] = useState<BulkShipment["status"]>("booked");

  const [exportBatchTargetId, setExportBatchTargetId] = useState<string>("all");
  const [exportFileExtension, setExportFileExtension] = useState<
    "csv" | "xlsx" | "xls" | "json" | "txt"
  >("xlsx");
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
  const [intakePhone, setIntakePhone] = useState("");
  const [intakePincode, setIntakePincode] = useState("");
  const [intakeItemCode, setIntakeItemCode] = useState("");
  const [intakeStatus, setIntakeStatus] = useState<"booked" | "in_transit" | "out_for_delivery" | "delivered" | "returned">("booked");
  const [isIntakeStatusDropdownOpen, setIsIntakeStatusDropdownOpen] = useState(false);
  const [intakeReturnReason, setIntakeReturnReason] = useState("");
  const [intakeError, setIntakeError] = useState("");
  const [flaggedInvalidCode, setFlaggedInvalidCode] = useState<string | null>(null);
  const [isAutoNextEnabled, setIsAutoNextEnabled] = useState(true);
  const [isPasteAnywayEnabled, setIsPasteAnywayEnabled] = useState<boolean>(false);
  const isPasteAnywayEnabledRef = useRef<boolean>(false);
  // ON/OFF toggle for 2-Step Customer Data Mini QR Scan (1st scan AWB -> 2nd scan Customer Data QR -> auto next AWB)
  const [isScanCustomerQrEnabled, setIsScanCustomerQrEnabled] = useState<boolean>(true);
  const isScanCustomerQrEnabledRef = useRef<boolean>(true);
  const [customerQrScanStep, setCustomerQrScanStep] = useState<{
    step: "awaiting_awb" | "awaiting_customer_qr";
    pendingAwb: string;
    pendingCourierId: string;
    pendingCourierName: string;
  }>({
    step: "awaiting_awb",
    pendingAwb: "",
    pendingCourierId: "",
    pendingCourierName: "",
  });
  const customerQrScanStepRef = useRef(customerQrScanStep);
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

  useEffect(() => {
    isPasteAnywayEnabledRef.current = isPasteAnywayEnabled;
  }, [isPasteAnywayEnabled]);

  useEffect(() => {
    isScanCustomerQrEnabledRef.current = isScanCustomerQrEnabled;
    try {
      localStorage.setItem("trackflow_scan_customer_qr", String(isScanCustomerQrEnabled));
    } catch {}
  }, [isScanCustomerQrEnabled]);

  useEffect(() => {
    customerQrScanStepRef.current = customerQrScanStep;
  }, [customerQrScanStep]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("trackflow_scan_customer_qr");
      if (saved === "false") {
        setIsScanCustomerQrEnabled(false);
      }
    } catch {}
  }, []);

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
    isDeleteExportedModalOpen ||
    Boolean(editingShipment) ||
    Boolean(selectedDetailShipment) ||
    Boolean(batchPendingDeleteId);

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
    scanSource: "manual" | "camera" = "manual",
    forcePasteAnyway: boolean = false,
    customerQrDataOverride?: {
      customerName: string;
      customerPhone: string;
      pincode: string;
      itemCode: string;
    }
  ) => {
    const rawTrimmed = awbToStage.trim();
    if (!rawTrimmed) {
      setIntakeError("Consignment ID cannot be empty.");
      playChime(false);
      return;
    }

    // Check if the user scanned or pasted an Encrypted Office Customer Mini QR ("TFQR1:...") directly
    const qrCheck = decryptCustomerMiniQR(rawTrimmed);
    if (qrCheck.isCustomerQR) {
      if (!qrCheck.isValid || !qrCheck.data) {
        setFlaggedInvalidCode(null);
        setIntakeError(qrCheck.error || "Invalid Encrypted Customer Mini QR.");
        playChime(false);
        return;
      }
      // Auto-fill customer fields from the decrypted Mini QR
      setIntakeRecipient(qrCheck.data.customerName);
      setIntakePhone(qrCheck.data.customerPhone);
      setIntakePincode(qrCheck.data.pincode);
      setIntakeItemCode(qrCheck.data.itemCode);
      setIntakeError("");

      // If we were waiting for the 2nd scan (Customer QR) for a pending AWB, complete & stage immediately!
      const pendingAwb = customerQrScanStepRef.current.pendingAwb;
      if (pendingAwb) {
        setCustomerQrScanStep({
          step: "awaiting_awb",
          pendingAwb: "",
          pendingCourierId: "",
          pendingCourierName: "",
        });
        handleStageConsignment(
          pendingAwb,
          customerQrScanStepRef.current.pendingCourierId || undefined,
          qrCheck.data.customerName,
          `Pin ${qrCheck.data.pincode}`,
          undefined,
          undefined,
          scanSource,
          true,
          qrCheck.data
        );
        return;
      } else {
        setIntakeAwb("");
        playChime(true);
        setRecentStagedCode(`Customer QR Filled (${qrCheck.data.customerName})`);
        setTimeout(() => setRecentStagedCode(null), 3000);
        return;
      }
    }

    const identification = identifyAndValidateConsignment(rawTrimmed);
    const allowUnrecognized = forcePasteAnyway || isPasteAnywayEnabledRef.current;

    if (!identification.isValid && !allowUnrecognized) {
      setFlaggedInvalidCode(identification.normalized || rawTrimmed.toUpperCase());
      setIntakeError(
        identification.error ||
          "Invalid Consignment ID format. Expected India Post (13 chars: EL855948618IN), DTDC (8–14 chars: B4000211866), or known courier regex."
      );
      playChime(false);
      return;
    }

    const cleanNum = identification.normalized || rawTrimmed.toUpperCase().replace(/\s+/g, "");

    // Check duplicate in currently staged list
    if (stagedConsignments.some((s) => s.trackingNumber === cleanNum)) {
      setFlaggedInvalidCode(null);
      setIntakeError(`AWB ${cleanNum} is already in your staged review list.`);
      return;
    }

    const detected = identification.courier || autoDetectCourier(cleanNum);
    // Logically identify carrier from Consignment ID format & length unless explicitly overridden
    const chosenCourier = courierOverride
      ? (COURIER_MAP[courierOverride] || detected || COURIER_LIST[0])
      : (detected || (intakeCourier && COURIER_MAP[intakeCourier]) || COURIER_LIST[0]);

    if (detected && detected.id !== intakeCourier) {
      setIntakeCourier(detected.id);
    }

    // Validate Indian Phone Number (+91 / 91 or 10-digit) and 6-Digit Indian Pincode when provided
    const effectivePhone = (customerQrDataOverride?.customerPhone ?? intakePhone).trim();
    const effectivePin = (customerQrDataOverride?.pincode ?? intakePincode).trim();
    const effectiveName = (customerQrDataOverride?.customerName ?? recipientOverride ?? intakeRecipient).trim();
    const effectiveItemCode = (customerQrDataOverride?.itemCode ?? intakeItemCode).trim();

    if (effectivePhone) {
      const phoneCheck = validateIndianPhone(effectivePhone);
      if (!phoneCheck.isValid) {
        setFlaggedInvalidCode(null);
        setIntakeError(`Customer Phone Error: ${phoneCheck.error}`);
        playChime(false);
        return;
      }
    }

    if (effectivePin) {
      const pinCheck = validateIndianPincode(effectivePin);
      if (!pinCheck.isValid) {
        setFlaggedInvalidCode(null);
        setIntakeError(`Pincode Error: ${pinCheck.error}`);
        playChime(false);
        return;
      }
    }

    setFlaggedInvalidCode(null);
    setIntakeError("");

    const isReturnedSim = cleanNum.includes("RT") || cleanNum.includes("RETURN");
    const finalStatus: BulkShipment["status"] =
      statusOverride ||
      (scanSource === "camera" && isReturnedSim ? "returned" : intakeStatus);

    const normalizedPhoneFinal = effectivePhone
      ? (() => {
          const p = validateIndianPhone(effectivePhone);
          return p.isValid ? (p.had91Prefix ? p.formattedWith91 : p.normalized10) : effectivePhone;
        })()
      : "";

    const resolvedDest =
      destinationOverride?.trim() ||
      (effectivePin ? `Pin ${effectivePin}` : "Destination Center");
    const resolvedOrigin = userProfile.hubCity
      ? `${userProfile.hubCity}${userProfile.hubPincode ? ` (${userProfile.hubPincode})` : ""}`
      : "Origin Booking Facility";

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
      pincode: effectivePin || undefined,
      itemCode: effectiveItemCode || undefined,
      articleType: finalStatus === "booked" ? "Booked Consignment" : "Registered Consignment",
      weight: "250 g",
      lastUpdated: "Staged Just Now",
      lastLocation: meta.lastLocation,
      recipientName: effectiveName || undefined,
      customerPhone: normalizedPhoneFinal || undefined,
      returnReason: finalStatus === "returned" ? (returnReasonOverride || intakeReturnReason.trim() || "Delivery Attempt Failed") : undefined,
    };

    setStagedConsignments((prev) => [newStaged, ...prev]);
    playChime(true);
    setRecentStagedCode(
      effectiveName ? `${cleanNum} • ${effectiveName} (${effectivePin})` : cleanNum
    );
    setTimeout(() => setRecentStagedCode(null), 3000);

    // Reset 2-step customer QR state to awaiting_awb for the next customer
    setCustomerQrScanStep({
      step: "awaiting_awb",
      pendingAwb: "",
      pendingCourierId: "",
      pendingCourierName: "",
    });

    // If scanned from camera, NEVER focus the text input so the mobile keyboard does not open!
    if (scanSource === "camera" || isCameraActive) {
      if (isAutoNextEnabled) {
        setIntakeAwb("");
        setIntakeRecipient("");
        setIntakePhone("");
        setIntakePincode("");
        setIntakeItemCode("");
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
      setIntakePhone("");
      setIntakePincode("");
      setIntakeItemCode("");
      setIntakeReturnReason("");
      if (intakeInputRef.current) {
        intakeInputRef.current.focus();
      }
    } else {
      if (intakeInputRef.current) {
        intakeInputRef.current.select();
      }
    }
  }, [stagedConsignments, intakeCourier, intakeStatus, intakeItemCode, intakeRecipient, intakePhone, intakePincode, intakeReturnReason, userProfile.hubCity, userProfile.hubPincode, isAutoNextEnabled, isCameraActive, playChime]);

  // Handle hardware scanner or manual Enter in input (supports 2-step AWB -> Customer QR scan cycle)
  const handleIntakeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const trimmed = intakeAwb.trim();
      if (!trimmed) return;

      // Check if it's an Encrypted Customer Mini QR ("TFQR1:...")
      const qrRes = decryptCustomerMiniQR(trimmed);
      if (qrRes.isCustomerQR) {
        handleStageConsignment(trimmed);
        return;
      }

      // If Scan Customer Data QR mode is ON and we are in Step 1 (awaiting_awb) and customer fields are empty:
      if (
        isScanCustomerQrEnabled &&
        customerQrScanStep.step === "awaiting_awb" &&
        !intakeRecipient.trim() &&
        !intakePhone.trim() &&
        !intakePincode.trim()
      ) {
        const identification = identifyAndValidateConsignment(trimmed);
        if (!identification.isValid && !isPasteAnywayEnabled) {
          setFlaggedInvalidCode(identification.normalized || trimmed.toUpperCase());
          setIntakeError(
            identification.error || "Invalid Consignment ID format."
          );
          playChime(false);
          return;
        }
        const cleanNum = identification.normalized || trimmed.toUpperCase().replace(/\s+/g, "");
        const detected = identification.courier || autoDetectCourier(cleanNum) || COURIER_LIST[0];
        setIntakeCourier(detected.id);
        setIntakeError("");
        setFlaggedInvalidCode(null);
        setCustomerQrScanStep({
          step: "awaiting_customer_qr",
          pendingAwb: cleanNum,
          pendingCourierId: detected.id,
          pendingCourierName: detected.name,
        });
        setIntakeAwb("");
        playChime(true);
        return;
      }

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

  // Update customer fields (Name, Number, Pincode, Item Code, Destination) for a staged item
  const handleUpdateStagedCustomerField = (
    id: string,
    field: "recipientName" | "customerPhone" | "pincode" | "itemCode" | "destination",
    value: string
  ) => {
    setStagedConsignments((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  // Open Edit Consignment & Customer Details Modal
  const handleOpenEditShipment = (item: BulkShipment) => {
    setEditingShipment(item);
    setEditCustomerName(item.recipientName || "");
    setEditCustomerPhone(item.customerPhone || "");
    setEditPincode(item.pincode || "");
    setEditItemCode(item.itemCode || "");
    setEditDestination(item.destination || "");
    setEditStatus(item.status);
  };

  // Save Edited Consignment & Customer Details
  const handleSaveEditShipment = () => {
    if (!editingShipment) return;
    const updated = shipments.map((s) => {
      if (s.id !== editingShipment.id) return s;
      const statusText =
        editStatus === "booked"
          ? "Consignment Booked at Origin"
          : editStatus === "delivered"
          ? "Delivered to Recipient"
          : editStatus === "out_for_delivery"
          ? "Out for Delivery Today"
          : editStatus === "returned"
          ? "Returned to Shipper (RTO)"
          : "Active In-Transit Scan";
      return {
        ...s,
        recipientName: editCustomerName.trim() || undefined,
        customerPhone: editCustomerPhone.trim() || undefined,
        pincode: editPincode.trim() || undefined,
        itemCode: editItemCode.trim() || undefined,
        destination: editDestination.trim() || s.destination,
        status: editStatus,
        statusText: editStatus !== s.status ? statusText : s.statusText,
      };
    });
    saveShipments(updated);
    setEditingShipment(null);
    playChime(false);
  };

  // Save User Profile & Account Details
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem("trackflow_user_profile", JSON.stringify(userProfile));
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_profile",
          profile: {
            id: authUser?.id || "usr-demo-01",
            loginId: authUser?.loginId || "TF-DEMO-01",
            ...userProfile,
          },
        }),
      });
      const json = await res.json();
      if (json.success && json.user) {
        localStorage.setItem("trackflow_auth_user", JSON.stringify(json.user));
        if (onProfileUpdated) {
          onProfileUpdated(json.user);
        }
      }
    } catch {}
    setProfileSavedMsg("Profile and hub settings saved.");
    playChime(false);
    setTimeout(() => setProfileSavedMsg(null), 4000);
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
          scanCustomerQr: isScanCustomerQrEnabled,
        })
      );
    } catch {}
    router.push("/scan");
  }, [stopCameraStreamOnly, stagedConsignments, intakeStatus, isScanCustomerQrEnabled, router]);

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
      const trimmedRaw = (rawVal || "").trim();
      if (!trimmedRaw) return false;

      const now = Date.now();
      if (
        lastScannedRef.current.code === trimmedRaw &&
        now - lastScannedRef.current.timestamp < 2200
      ) {
        return true;
      }

      // Check if scanned code is an Encrypted Office Customer Mini QR ("TFQR1:...")
      const customerQr = decryptCustomerMiniQR(trimmedRaw);
      if (customerQr.isCustomerQR) {
        lastScannedRef.current = { code: trimmedRaw, timestamp: now };
        lowQualityStreakRef.current = 0;
        setIsEnhancingDamagedLabel(false);

        if (!customerQr.isValid || !customerQr.data) {
          setIntakeError(customerQr.error || "Invalid Encrypted Customer Mini QR.");
          playChime(false);
          return true;
        }

        const pendingAwb = customerQrScanStepRef.current.pendingAwb;
        if (pendingAwb) {
          // Complete Step 2: Fill customer details for pendingAwb, stage consignment, and auto-reset to Step 1 for next AWB!
          const pendingCourier = customerQrScanStepRef.current.pendingCourierId;
          setCustomerQrScanStep({
            step: "awaiting_awb",
            pendingAwb: "",
            pendingCourierId: "",
            pendingCourierName: "",
          });
          handleStageConsignment(
            pendingAwb,
            pendingCourier || undefined,
            customerQr.data.customerName,
            `Pin ${customerQr.data.pincode}`,
            undefined,
            undefined,
            "camera",
            true,
            customerQr.data
          );
          setCameraScanSuccess({
            code: `${pendingAwb} • ${customerQr.data.customerName}`,
            carrier: `PIN ${customerQr.data.pincode} • ${customerQr.data.itemCode}`,
          });
        } else {
          // Fill customer details into form
          setIntakeRecipient(customerQr.data.customerName);
          setIntakePhone(customerQr.data.customerPhone);
          setIntakePincode(customerQr.data.pincode);
          setIntakeItemCode(customerQr.data.itemCode);
          playChime(true);
          setCameraScanSuccess({
            code: customerQr.data.customerName,
            carrier: `${customerQr.data.formattedPhone91} • PIN ${customerQr.data.pincode}`,
          });
        }

        if (scanSuccessTimerRef.current) clearTimeout(scanSuccessTimerRef.current);
        scanSuccessTimerRef.current = setTimeout(() => {
          setCameraScanSuccess(null);
        }, 1400);
        return true;
      }

      const code = extractCleanScannedCode(trimmedRaw);
      if (!code || code.length < 4) return false;

      if (
        lastScannedRef.current.code === code &&
        now - lastScannedRef.current.timestamp < 2200
      ) {
        return true;
      }
      lastScannedRef.current = { code, timestamp: now };
      lowQualityStreakRef.current = 0;
      setIsEnhancingDamagedLabel(false);

      const identification = identifyAndValidateConsignment(code);
      const allowUnrecognized = isPasteAnywayEnabledRef.current;

      if (!identification.isValid && !allowUnrecognized) {
        setFlaggedInvalidCode(identification.normalized || code);
        setIntakeError(
          identification.error || "Invalid Consignment ID format."
        );
        playChime(false);
        return true;
      }

      const cleanAwb = identification.normalized || code;
      const detectedCarrier = identification.courier || autoDetectCourier(cleanAwb);

      // If 2-Step "Scan Customer Data QR" is ON:
      // 1st scan locks in the Tracking Number (AWB) and automatically switches scanner ready for Step 2 (Customer Data QR)
      if (isScanCustomerQrEnabledRef.current) {
        setIntakeError("");
        setFlaggedInvalidCode(null);
        setIntakeAwb(cleanAwb);
        if (detectedCarrier) {
          setIntakeCourier(detectedCarrier.id);
        }
        setCustomerQrScanStep({
          step: "awaiting_customer_qr",
          pendingAwb: cleanAwb,
          pendingCourierId: detectedCarrier?.id || intakeCourier,
          pendingCourierName:
            detectedCarrier?.shortName || detectedCarrier?.name || "Auto-Detected",
        });
        if (cameraGuideMode === "barcode") {
          setCameraGuideMode("both");
        }
        playChime(true);
        setCameraScanSuccess({
          code: `Step 1 OK: ${cleanAwb}`,
          carrier: "Now Scan Customer Mini QR →",
        });
        if (scanSuccessTimerRef.current) clearTimeout(scanSuccessTimerRef.current);
        scanSuccessTimerRef.current = setTimeout(() => {
          setCameraScanSuccess(null);
        }, 1400);
        return true;
      }

      if (!isAutoNextEnabled) {
        setIntakeAwb(cleanAwb);
      }
      handleStageConsignment(cleanAwb, detectedCarrier?.id, undefined, undefined, undefined, undefined, "camera");

      setCameraScanSuccess({
        code: cleanAwb,
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
    intakeCourier,
    playChime,
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
    setIntakeItemCode("");
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

  // Platform-Aware File Format Validation & Intelligent Column Analyzer for Excel (.xlsx, .xls)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    setUploadSuccessMsg(null);
    setPreviewShipments(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Security Check 1: File Extension Verification (.xlsx, .xls only — CSV removed per user request)
    const fileName = file.name.toLowerCase();
    const isValidExtension = fileName.endsWith(".xlsx") || fileName.endsWith(".xls");

    // Reject dangerous file formats (executables, scripts, archives)
    const dangerousExtensions = [".exe", ".bat", ".cmd", ".sh", ".vbs", ".js", ".zip", ".tar", ".gz", ".pdf", ".py", ".bin"];
    const isDangerous = dangerousExtensions.some((ext) => fileName.endsWith(ext));

    if (!isValidExtension || isDangerous) {
      setUploadError(
        "Invalid file format: Please upload a Microsoft Excel (.xlsx, .xls) workbook file."
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Security Check 2: File Size Limit (Max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File size exceeds 5MB limit. Please upload an Excel spreadsheet under 5MB.");
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
          throw new Error("No worksheets found in this Excel file.");
        }

        const worksheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1, defval: "" });

        if (rows.length < 1) {
          throw new Error("The file contains no rows. Please add tracking numbers.");
        }

        // Intelligent Platform Header Analysis for Excel sheets
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
        const recipientColIdx = headerRow.findIndex((h) => h.includes("recipient") || h.includes("customer name") || h.includes("addressee") || h === "name" || h === "customer");
        const phoneColIdx = headerRow.findIndex((h) => h.includes("phone") || h.includes("mobile") || h.includes("contact") || h.includes("customer number"));
        const pincodeColIdx = headerRow.findIndex((h) => h.includes("pin") || h.includes("zip") || h.includes("postal"));
        const articleTypeColIdx = headerRow.findIndex((h) => h.includes("article") || h.includes("type") || h.includes("service"));
        const weightColIdx = headerRow.findIndex((h) => h.includes("weight"));
        const returnReasonColIdx = headerRow.findIndex((h) => h.includes("return") || h.includes("rto"));
        const batchNameColIdx = headerRow.findIndex((h) => h.includes("batch name") || h === "batch");

        const startIdx = hasHeader ? 1 : 0;
        const parsedItems: BulkShipment[] = [];
        let detectedBatchNameFromSheet = "";

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
          const rawPhone = phoneColIdx !== -1 ? String(row[phoneColIdx] || "").trim() : "";
          const rawPincode = pincodeColIdx !== -1 ? String(row[pincodeColIdx] || "").trim() : "";
          const rawOrigin = originColIdx !== -1 ? String(row[originColIdx] || "").trim() : "";
          const rawDest = destColIdx !== -1 ? String(row[destColIdx] || "").trim() : "";
          const rawArticle = articleTypeColIdx !== -1 ? String(row[articleTypeColIdx] || "").trim() : "";
          const rawWeight = weightColIdx !== -1 ? String(row[weightColIdx] || "").trim() : "";
          const rawStatus = statusColIdx !== -1 ? String(row[statusColIdx] || "").trim().toLowerCase() : "";
          const rawStatusText = statusTextColIdx !== -1 ? String(row[statusTextColIdx] || "").trim() : "";
          const rawReturnReason = returnReasonColIdx !== -1 ? String(row[returnReasonColIdx] || "").trim() : "";
          const rawBatchName = batchNameColIdx !== -1 ? String(row[batchNameColIdx] || "").trim() : "";
          if (rawBatchName && !detectedBatchNameFromSheet && rawBatchName.toLowerCase() !== "standard") {
            detectedBatchNameFromSheet = rawBatchName;
          }

          // Default status on import is "booked" unless explicitly specified otherwise in the sheet
          let normalizedStatus: BulkShipment["status"] = "booked";
          if (rawStatus) {
            if (rawStatus.includes("deliver") && !rawStatus.includes("out") && !rawStatus.includes("undeliver")) {
              normalizedStatus = "delivered";
            } else if (rawStatus.includes("out") || rawStatus.includes("ofd") || rawStatus.includes("agent")) {
              normalizedStatus = "out_for_delivery";
            } else if (rawStatus.includes("return") || rawStatus.includes("rto") || rawStatus.includes("refused")) {
              normalizedStatus = "returned";
            } else if (rawStatus.includes("transit") || rawStatus.includes("dispatch")) {
              normalizedStatus = "in_transit";
            } else {
              normalizedStatus = "booked";
            }
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
            destination: rawDest || (rawPincode ? `Pin ${rawPincode}` : "Destination Center"),
            pincode: rawPincode || undefined,
            articleType: rawArticle || "Bulk Import",
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
            recipientName: rawRecipient && rawRecipient !== "N/A" ? rawRecipient : undefined,
            customerPhone: rawPhone || undefined,
            returnReason:
              normalizedStatus === "returned"
                ? rawReturnReason || "Customer Refused / RTO"
                : undefined,
            isImported: true,
            importedDate: getTodayIso(),
          });
        }

        if (parsedItems.length === 0) {
          throw new Error("No valid tracking numbers were found in this file.");
        }

        // SHOW REVIEW BEFORE IMPORT (DO NOT IMPORT DIRECTLY)
        const cleanFile = file.name.replace(/\.(xlsx|xls)$/i, "");
        setPreviewFileName(file.name);
        setPreviewBatchName(
          detectedBatchNameFromSheet || `Batch #${uniqueBatches.length + 1} • ${cleanFile || "Bulk Import"}`
        );
        setPreviewShipments(parsedItems);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } catch (err: unknown) {
        setUploadError((err as Error)?.message || "Failed to parse file. Please verify the Excel format.");
      } finally {
        setIsUploading(false);
      }
    };

    reader.onerror = () => {
      setUploadError("Could not read the uploaded file. Please verify it is a valid Excel (.xlsx, .xls) file.");
      setIsUploading(false);
    };

    reader.readAsArrayBuffer(file);
  };

  // Parse bulk pasted AWB numbers into the Review Before Import screen (Booked default status)
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

      return {
        id: `bulk-paste-${Date.now()}-${idx}`,
        trackingNumber: rawAwb,
        courierId: detected.id,
        courierName: detected.name,
        status: "booked",
        statusText: "Consignment Booked at Origin",
        origin: "Origin Logistics Facility",
        destination: "Destination Center",
        articleType: "Bulk Paste",
        weight: "250 g",
        lastUpdated: "Staged for Review",
        lastLocation: "Origin Booking Facility",
        recipientName: undefined,
        isImported: true,
        importedDate: getTodayIso(),
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
      importedDate: string;
      count: number;
      booked: number;
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
        else if (s.status === "booked") existing.booked++;
        else existing.inTransit++;
      } else {
        batchMap.set(s.batchId, {
          id: s.batchId,
          name: s.batchName || `Batch ${s.batchId}`,
          importedAt: s.importedAt || "Imported Batch",
          importedDate: resolveShipmentIsoDate(s),
          count: 1,
          booked: s.status === "booked" ? 1 : 0,
          delivered: s.status === "delivered" ? 1 : 0,
          inTransit:
            s.status !== "delivered" && s.status !== "returned" && s.status !== "booked" ? 1 : 0,
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
    const cleanFileName = previewFileName.replace(/\.(xlsx|xls)$/i, "");
    const newBatchId = `batch-${Date.now()}`;
    const finalBatchName =
      previewBatchName.trim() || `Batch #${nextBatchNum} • ${cleanFileName || "Bulk Import"}`;
    const importedAtStr = `Today, ${timeStr}`;
    const todayIso = getTodayIso();

    const taggedItems: BulkShipment[] = newItems.map((item) => ({
      ...item,
      lastUpdated: "Just Imported",
      isImported: true,
      batchId: newBatchId,
      batchName: finalBatchName,
      importedAt: importedAtStr,
      importedDate: todayIso,
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

  // Date-Filtered Shipments for Backup in Settings
  const backupScopedShipments = useMemo(() => {
    const todayIso = getTodayIso();
    const yesterdayIso = getYesterdayIso();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const sevenDaysIso = sevenDaysAgo.toISOString().split("T")[0];

    return shipments.filter((s) => {
      const d = resolveShipmentIsoDate(s);
      if (backupDateFilter === "today") return d === todayIso;
      if (backupDateFilter === "yesterday") return d === yesterdayIso;
      if (backupDateFilter === "last_7_days") return d >= sevenDaysIso && d <= todayIso;
      if (backupDateFilter === "custom") {
        const start = backupStartDate || "0000-00-00";
        const end = backupEndDate || "9999-12-31";
        return d >= start && d <= end;
      }
      return true;
    });
  }, [shipments, backupDateFilter, backupStartDate, backupEndDate]);

  // Helper to build calendar days for a given year/month
  const buildCalendarDays = useCallback((year: number, month: number) => {
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (string | null)[] = [];
    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push(iso);
    }
    return cells;
  }, []);

  // Full or Date-Wise Data Backup Export (.json)
  const handleExportBackup = () => {
    try {
      setBackupError(null);
      if (backupScopedShipments.length === 0) {
        setBackupError("No consignments match the selected backup date range.");
        return;
      }
      const dateScopeLabel =
        backupDateFilter === "all"
          ? "Full_Dataset"
          : backupDateFilter === "today"
          ? `Today_${getTodayIso()}`
          : backupDateFilter === "yesterday"
          ? `Yesterday_${getYesterdayIso()}`
          : backupDateFilter === "last_7_days"
          ? "Last_7_Days"
          : `${backupStartDate}_to_${backupEndDate}`;

      const backupPayload = {
        version: "1.0",
        app: "TrackFlow Logistics",
        exportedAt: new Date().toISOString(),
        dateScope: dateScopeLabel,
        totalShipments: backupScopedShipments.length,
        totalBatches: uniqueBatches.length,
        shipments: backupScopedShipments,
      };
      const blob = new Blob([JSON.stringify(backupPayload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `TrackFlow_Backup_${dateScopeLabel}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      playChime(false);
      setBackupSuccessMsg(
        `Backup exported (${backupScopedShipments.length} consignment${backupScopedShipments.length === 1 ? "" : "s"}).`
      );
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
            customerPhone: item.customerPhone ? String(item.customerPhone) : undefined,
            pincode: item.pincode ? String(item.pincode) : undefined,
            itemCode: item.itemCode ? String(item.itemCode) : undefined,
            isImported: item.isImported !== undefined ? Boolean(item.isImported) : true,
            batchId: item.batchId ? String(item.batchId) : undefined,
            batchName: item.batchName ? String(item.batchName) : undefined,
            importedAt: item.importedAt ? String(item.importedAt) : undefined,
            importedDate: item.importedDate ? String(item.importedDate) : undefined,
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

  // Generate & Download Verified Sample Excel Template (.xlsx) with Booked default status
  const handleDownloadSampleTemplate = () => {
    try {
      const templateData = [
        ["Tracking_Number", "Courier_Code", "Status", "Customer_Name", "Customer_Number", "Pincode", "Origin", "Destination_City", "Weight", "Status_Text"],
        ["EL855948618IN", "speedpost", "booked", "Dr. Rajesh Kumar", "9847011223", "680003", "Kochi, Kerala", "Thrissur, Kerala", "45 g", "Consignment Booked at Origin"],
        ["B4000211866", "dtdc", "booked", "Ananya Sharma", "9895122334", "560001", "Hyderabad, TS", "Bangalore, Karnataka", "1.2 kg", "Consignment Booked at Origin"],
        ["FMPP4397267510", "ekart", "booked", "Vikram Patel", "9415033445", "380001", "Surat, Gujarat", "Ahmedabad, Gujarat", "500 g", "Consignment Booked at Origin"],
        ["12345678901", "bluedart", "booked", "Pooja Verma", "9820366778", "400001", "Delhi Hub", "Mumbai, Maharashtra", "200 g", "Consignment Booked at Origin"],
      ];

      const ws = XLSX.utils.aoa_to_sheet(templateData);

      ws["!cols"] = [
        { wch: 18 },
        { wch: 14 },
        { wch: 16 },
        { wch: 20 },
        { wch: 16 },
        { wch: 12 },
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

  // Helper to check if a shipment matches the active Date-Wise filter
  const matchesDateFilter = useCallback(
    (s: BulkShipment) => {
      if (analyticsDateFilter === "all") return true;
      const iso = resolveShipmentIsoDate(s);
      const today = getTodayIso();
      const yesterday = getYesterdayIso();
      if (analyticsDateFilter === "today") return iso === today;
      if (analyticsDateFilter === "yesterday") return iso === yesterday;
      if (analyticsDateFilter === "last_7_days") {
        const d7 = new Date();
        d7.setDate(d7.getDate() - 7);
        const minIso = d7.toISOString().split("T")[0];
        return iso >= minIso && iso <= today;
      }
      if (analyticsDateFilter === "custom") {
        const start = customStartDate || "1970-01-01";
        const end = customEndDate || "2999-12-31";
        return iso >= start && iso <= end;
      }
      return true;
    },
    [analyticsDateFilter, customStartDate, customEndDate]
  );

  // Advanced Date-Wise, Batch-Wise & Status-Wise Export Feature
  const handleExportBatchCsv = (overrideBatchId?: string, overrideFormat?: string) => {
    const targetId = overrideBatchId || exportBatchTargetId || "all";
    const listToExport = activeShipments.filter((item) => {
      // 1. Batch filter
      if (targetId === "imported_all" && !item.isImported) return false;
      if (targetId === "direct_only" && item.isImported) return false;
      if (
        targetId !== "all" &&
        targetId !== "imported_all" &&
        targetId !== "direct_only" &&
        item.batchId !== targetId
      ) {
        return false;
      }
      // 2. Date-wise filter
      if (!matchesDateFilter(item)) return false;
      // 3. Status filter
      if (exportStatusTarget !== "all" && item.status !== exportStatusTarget) return false;
      return true;
    });

    if (listToExport.length === 0) {
      setBatchCsvExportMsg("No consignments match the selected date, batch, and status filters.");
      setTimeout(() => setBatchCsvExportMsg(null), 5000);
      return;
    }

    const rawChosenExt = overrideFormat || exportFileExtension || "xlsx";
    const cleanExt = rawChosenExt.trim().replace(/^\.+/, "").toLowerCase() || "xlsx";

    const exportedAtIso = new Date().toISOString();
    const dateStr = exportedAtIso.split("T")[0];

    const batchObj = uniqueBatches.find((b) => b.id === targetId);
    const safeBatchSlug = batchObj
      ? batchObj.name.replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 28)
      : targetId === "imported_all"
      ? "All_Imported_Batches"
      : targetId === "direct_only"
      ? "Direct_Entries"
      : "All_Shipments";

    const dateSlug =
      analyticsDateFilter === "today"
        ? `Today_${getTodayIso()}`
        : analyticsDateFilter === "yesterday"
        ? `Yesterday_${getYesterdayIso()}`
        : analyticsDateFilter === "last_7_days"
        ? "Last_7_Days"
        : analyticsDateFilter === "custom"
        ? `${customStartDate}_to_${customEndDate}`
        : dateStr;

    const fileBaseName = `TrackFlow_Export_${safeBatchSlug}_${dateSlug}`;

    const structuredRows = listToExport.map((s) => ({
      Date: resolveShipmentIsoDate(s),
      Tracking_Number: s.trackingNumber,
      Courier_Code: s.courierId,
      Courier_Name: s.courierName,
      Status: s.status,
      Status_Text: s.statusText,
      Customer_Name: s.recipientName || "",
      Customer_Number: s.customerPhone || "",
      Pincode: s.pincode || "",
      Origin: s.origin,
      Destination: s.destination,
      Article_Type: s.articleType,
      Weight: s.weight,
      Last_Updated: s.lastUpdated,
      Last_Location: s.lastLocation,
      Return_Reason: s.returnReason || "",
      Batch_ID: s.batchId || "direct",
      Batch_Name: s.batchName || "Direct Entry",
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
      "Customer Name": s.recipientName || "N/A",
      "Customer Number": s.customerPhone || "N/A",
      "Pincode": s.pincode || "N/A",
      "Origin": s.origin,
      "Destination": s.destination,
      "Article Type": s.articleType,
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
    const q = searchFilter.toLowerCase();
    const matchesSearch =
      item.trackingNumber.toLowerCase().includes(q) ||
      item.courierName.toLowerCase().includes(q) ||
      item.destination.toLowerCase().includes(q) ||
      (item.recipientName && item.recipientName.toLowerCase().includes(q)) ||
      (item.customerPhone && item.customerPhone.toLowerCase().includes(q)) ||
      (item.pincode && item.pincode.toLowerCase().includes(q)) ||
      (item.batchName && item.batchName.toLowerCase().includes(q));

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

  // Date-Wise & Batch-Wise Filtered Analytics for Analytics Tab
  const dateWiseAnalytics = useMemo(() => {
    const matchingShipments = activeShipments.filter((item) => {
      if (exportBatchTargetId === "imported_all" && !item.isImported) return false;
      if (exportBatchTargetId === "direct_only" && item.isImported) return false;
      if (
        exportBatchTargetId !== "all" &&
        exportBatchTargetId !== "imported_all" &&
        exportBatchTargetId !== "direct_only" &&
        item.batchId !== exportBatchTargetId
      ) {
        return false;
      }
      if (!matchesDateFilter(item)) return false;
      if (exportStatusTarget !== "all" && item.status !== exportStatusTarget) return false;
      return true;
    });

    const bucketsMap = new Map<
      string,
      {
        date: string;
        total: number;
        booked: number;
        in_transit: number;
        out_for_delivery: number;
        delivered: number;
        returned: number;
      }
    >();

    matchingShipments.forEach((s) => {
      const iso = resolveShipmentIsoDate(s);
      const existing = bucketsMap.get(iso) || {
        date: iso,
        total: 0,
        booked: 0,
        in_transit: 0,
        out_for_delivery: 0,
        delivered: 0,
        returned: 0,
      };
      existing.total++;
      if (s.status === "booked") existing.booked++;
      else if (s.status === "in_transit") existing.in_transit++;
      else if (s.status === "out_for_delivery") existing.out_for_delivery++;
      else if (s.status === "delivered") existing.delivered++;
      else if (s.status === "returned") existing.returned++;
      bucketsMap.set(iso, existing);
    });

    const dailyBuckets = Array.from(bucketsMap.values()).sort((a, b) =>
      b.date.localeCompare(a.date)
    );

    const filteredTotal = matchingShipments.length;
    const filteredDelivered = matchingShipments.filter((s) => s.status === "delivered").length;
    const filteredBooked = matchingShipments.filter((s) => s.status === "booked").length;
    const filteredInTransit = matchingShipments.filter((s) => s.status === "in_transit").length;
    const filteredOut = matchingShipments.filter((s) => s.status === "out_for_delivery").length;
    const filteredReturned = matchingShipments.filter((s) => s.status === "returned").length;
    const deliveryRate = filteredTotal > 0 ? Math.round((filteredDelivered / filteredTotal) * 100) : 0;

    return {
      filteredTotal,
      filteredBooked,
      filteredInTransit,
      filteredOut,
      filteredDelivered,
      filteredReturned,
      deliveryRate,
      dailyBuckets,
    };
  }, [activeShipments, exportBatchTargetId, exportStatusTarget, matchesDateFilter]);

  return (
    /* Full-Screen Fixed Viewport SaaS Platform Shell with Left-Side End Menu Bar */
    <div className="w-full h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] flex flex-col overflow-hidden bg-slate-50/70 dark:bg-slate-950">
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
      {/* FULL-SCREEN SAAS SHELL: FIXED LEFT MENU BAR + SCROLLING MAIN   */}
      {/* ============================================================== */}
      <div className="flex flex-1 min-h-0 w-full overflow-hidden items-stretch">
        {/* ============================================================ */}
        {/* FLOATING TOP-RIGHT COMPACT MOBILE MENU POPOVER               */}
        {/* (No header fade; click anywhere outside closes immediately)  */}
        {/* ============================================================ */}
        {isMobileSidebarOpen && (
          <aside
            ref={mobileDrawerRef}
            className="fixed top-15 right-3 sm:right-5 z-[55] md:hidden w-68 max-w-[calc(100vw-1.5rem)] max-h-[calc(100vh-4.5rem)] bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col justify-between overflow-hidden animate-menu-open"
          >
            {/* Navigation Items (No number counts) */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
              {(
                [
                  {
                    id: "dashboard",
                    label: "Dashboard",
                    icon: LayoutDashboard,
                  },
                  {
                    id: "data",
                    label: "Consignments",
                    icon: Package,
                  },
                  {
                    id: "batches",
                    label: "Batches",
                    icon: FolderKanban,
                  },
                  {
                    id: "labels",
                    label: "Label Print",
                    icon: QrCode,
                  },
                  {
                    id: "analytics",
                    label: "Analytics",
                    icon: BarChart3,
                  },
                  {
                    id: "settings",
                    label: "Settings",
                    icon: Settings,
                  },
                ] as const
              ).map((nav) => {
                const Icon = nav.icon;
                const isActive = activeMenu === nav.id;
                return (
                  <button
                    key={nav.id}
                    type="button"
                    onClick={() => {
                      setActiveMenu(nav.id);
                      setIsMobileSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm shadow-indigo-500/20"
                        : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/70"
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 shrink-0 ${
                        isActive ? "text-white" : "text-indigo-600 dark:text-indigo-400"
                      }`}
                    />
                    <span className="truncate">{nav.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Fixed Bottom Operator Account Card & Sign Out in Mobile Menu Footer */}
            <div className="shrink-0 p-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveMenu("profile");
                  setIsMobileSidebarOpen(false);
                }}
                className={`flex-1 flex items-center gap-2 rounded-xl border p-2 text-left transition-all cursor-pointer min-w-0 ${
                  activeMenu === "profile"
                    ? "border-indigo-600 bg-indigo-50/80 dark:border-indigo-500 dark:bg-indigo-950/60"
                    : "border-slate-200/80 bg-white hover:border-indigo-400 dark:border-slate-800 dark:bg-slate-800/70"
                }`}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-white font-black text-xs shadow-2xs">
                  {userProfile.fullName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase() || "TF"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                      {userProfile.fullName}
                    </span>
                    <BadgeCheck className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    {authUser?.loginId || "Account"} · {userProfile.hubPincode}
                  </div>
                </div>
              </button>
              {onLogout && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileSidebarOpen(false);
                    onLogout();
                  }}
                  title="Sign Out"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/60 dark:text-rose-300 cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              )}
            </div>
          </aside>
        )}

        {/* ============================================================ */}
        {/* DESKTOP FIXED FULL-HEIGHT LEFT-SIDE END MENU BAR             */}
        {/* (Includes Logo + Collapse Icon at top; collapses together)   */}
        {/* ============================================================ */}
        <aside
          className={`hidden md:flex md:fixed md:top-0 md:bottom-0 md:left-0 md:z-50 flex-col justify-between border-r border-slate-200/90 bg-white dark:border-slate-800/90 dark:bg-slate-900 transition-all duration-200 shrink-0 overflow-hidden select-none ${
            isSidebarCollapsed ? "md:w-[68px]" : "md:w-60 xl:w-64"
          }`}
        >
          {/* Top Brand Logo + Collapse Icon Near After Logo (Aligned with menu icons on collapse) */}
          <div
            className={`h-14 sm:h-16 shrink-0 flex items-center transition-all duration-200 ${
              isSidebarCollapsed
                ? "justify-center px-2.5"
                : "justify-between px-3.5 sm:px-4"
            }`}
          >
            <button
              type="button"
              onClick={() => {
                if (isSidebarCollapsed) {
                  toggleSidebarCollapse();
                } else {
                  setActiveMenu("dashboard");
                }
              }}
              title={isSidebarCollapsed ? "TrackFlow (Click to expand)" : "TrackFlow"}
              className={`flex items-center font-extrabold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 group cursor-pointer ${
                isSidebarCollapsed ? "justify-center w-10 h-10" : "gap-2.5"
              }`}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-sm shadow-indigo-500/25 transition-transform group-hover:scale-105 shrink-0">
                <PackageSearch className="h-4.5 w-4.5" />
              </div>
              {!isSidebarCollapsed && (
                <span className="text-base sm:text-xl font-black tracking-tight">
                  Track<span className="text-indigo-600 dark:text-indigo-400">Flow</span>
                </span>
              )}
            </button>

            {!isSidebarCollapsed && (
              <button
                type="button"
                onClick={toggleSidebarCollapse}
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
                className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-indigo-400 transition-colors cursor-pointer shrink-0"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Primary Navigation Items (Directly below logo with no dividing line; centered when collapsed) */}
          <div className="flex-1 overflow-y-auto px-2.5 pb-2.5 pt-1 space-y-1">
            {(
              [
                {
                  id: "dashboard",
                  label: "Dashboard",
                  icon: LayoutDashboard,
                },
                {
                  id: "data",
                  label: "Consignments",
                  icon: Package,
                },
                {
                  id: "batches",
                  label: "Batches",
                  icon: FolderKanban,
                },
                {
                  id: "labels",
                  label: "Label Print",
                  icon: QrCode,
                },
                {
                  id: "analytics",
                  label: "Analytics",
                  icon: BarChart3,
                },
                {
                  id: "settings",
                  label: "Settings",
                  icon: Settings,
                },
              ] as const
            ).map((item) => {
              const Icon = item.icon;
              const isActive = activeMenu === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveMenu(item.id)}
                  title={isSidebarCollapsed ? item.label : undefined}
                  className={`flex items-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isSidebarCollapsed
                      ? "w-10 h-10 mx-auto justify-center"
                      : "w-full justify-start gap-2.5 px-3 py-2.5"
                  } ${
                    isActive
                      ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm shadow-indigo-500/20"
                      : "text-slate-700 hover:bg-slate-100/90 dark:text-slate-300 dark:hover:bg-slate-800/70"
                  }`}
                >
                  <Icon
                    className={`h-4.5 w-4.5 shrink-0 ${
                      isActive ? "text-white" : "text-indigo-600 dark:text-indigo-400"
                    }`}
                  />
                  {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </div>

          {/* Fixed Bottom Account Card & Sign Out in Sidebar Footer */}
          <div className="shrink-0 mt-auto p-2.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/90 dark:bg-slate-900/95 flex items-center justify-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveMenu("profile")}
              title={
                isSidebarCollapsed
                  ? `${userProfile.fullName} • Account`
                  : "Open Account Settings"
              }
              className={`min-w-0 flex items-center rounded-xl border transition-all cursor-pointer ${
                isSidebarCollapsed ? "w-10 h-10 justify-center mx-auto" : "flex-1 gap-2.5 p-2 text-left"
              } ${
                activeMenu === "profile"
                  ? "border-indigo-600 bg-indigo-50/90 dark:border-indigo-500 dark:bg-indigo-950/70 shadow-2xs"
                  : "border-slate-200/80 bg-white hover:border-indigo-400 dark:border-slate-700 dark:bg-slate-900"
              }`}
            >
              <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-white font-black text-xs shadow-xs">
                {userProfile.fullName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase() || "TF"}
                <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
              </div>
              {!isSidebarCollapsed && (
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                      {userProfile.fullName}
                    </span>
                    <BadgeCheck className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  </div>
                  <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate">
                    {authUser?.loginId || "Account"} · {userProfile.hubPincode}
                  </div>
                </div>
              )}
            </button>

            {!isSidebarCollapsed && onLogout && (
              <button
                type="button"
                onClick={onLogout}
                title="Sign Out"
                className="flex h-10 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-rose-900/60 dark:hover:bg-rose-950/60 dark:hover:text-rose-300 transition-colors cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </aside>

        {/* ============================================================ */}
        {/* RIGHT MAIN SAAS WORKSPACE CONTENT (INDEPENDENT SCROLL)       */}
        {/* ============================================================ */}
        <div
          className={`flex-1 min-w-0 h-full overflow-y-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5 transition-all duration-200 ${
            isSidebarCollapsed ? "md:ml-[68px]" : "md:ml-60 xl:ml-64"
          }`}
        >
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

          {/* ========================================================== */}
          {/* 1. REDESIGNED WORKSPACE TOP CARD (ONLY ON DASHBOARD TAB)   */}
          {/* ========================================================== */}
          {activeMenu === "dashboard" && (
            <div className="relative overflow-hidden rounded-2xl border border-slate-200/85 dark:border-slate-800/85 bg-white/95 dark:bg-slate-900/95 p-4 sm:p-5 shadow-2xs">
              <div className="pointer-events-none absolute -top-24 -right-20 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 -left-20 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />

              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
                {/* Left: Clean Section Title, Active Count & Live Status Bar (Zero Folder Icons) */}
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white leading-none">
                      Dashboard
                    </h1>

                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200/70 dark:border-indigo-800/60 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                      <span>{totalCount} Active</span>
                    </span>

                    {/* Live Sync Time & Instant Sync Pill */}
                    <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 pl-2.5 pr-1 py-0.5 text-[11px]">
                      <span
                        className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                          isAutoCheckEnabled ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                        }`}
                      />
                      <span className="font-medium text-slate-500 dark:text-slate-400">
                        {isAutoCheckEnabled ? "Sync" : "Paused"}
                      </span>
                      {isAutoCheckEnabled && (
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                          {formatTimer(secondsRemaining)}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={handleRunAutoCheck}
                        disabled={isRefreshing}
                        className="ml-0.5 inline-flex items-center gap-1 rounded-md bg-white hover:bg-indigo-50 dark:bg-slate-900 dark:hover:bg-indigo-950/80 border border-slate-200/70 dark:border-slate-700 px-2 py-0.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-300 transition-colors cursor-pointer disabled:opacity-50"
                        title="Sync now"
                      >
                        <RefreshCw
                          className={`h-2.5 w-2.5 ${isRefreshing ? "animate-spin" : ""}`}
                        />
                        <span>Sync</span>
                      </button>
                    </div>
                  </div>

                  {/* Subtitle Metadata Row (Static Location Only — User Name & Click Action Removed) */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                    <div className="inline-flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300">
                      <MapPin className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="truncate max-w-[200px] sm:max-w-[260px]">
                        {userProfile.hubCity} ({userProfile.hubPincode})
                      </span>
                    </div>

                    {selectedBatchId !== "all" && (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                        <span className="truncate max-w-[140px]">
                          {selectedBatchId === "imported_all"
                            ? "All Imported"
                            : uniqueBatches.find((b) => b.id === selectedBatchId)?.name || "Batch Filter"}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedBatchId("all")}
                          className="ml-0.5 hover:text-rose-600 cursor-pointer"
                          title="Clear batch filter"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Clean Primary Action Buttons */}
                <div className="grid grid-cols-2 sm:flex items-center gap-2 sm:gap-2.5 w-full lg:w-auto shrink-0">
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
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200/90 bg-slate-50/80 hover:bg-white px-3.5 py-2.5 text-xs font-bold text-slate-800 shadow-2xs hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-100 dark:hover:border-indigo-500/60 transition-all cursor-pointer whitespace-nowrap"
                  >
                    <Plus className="h-4 w-4 text-indigo-600 dark:text-indigo-400 stroke-[2.4] shrink-0" />
                    <span>Add Consignment</span>
                  </button>

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
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-all cursor-pointer whitespace-nowrap"
                  >
                    <FileSpreadsheet className="h-4 w-4 stroke-[2.2] shrink-0" />
                    <span>Bulk Import</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* VIEW 1 & 2: DASHBOARD OVERVIEW & ALL DATA DIRECTORY          */}
          {/* ============================================================ */}
          {(activeMenu === "dashboard" || activeMenu === "data") && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Transparent Gradient KPI Cards on Dashboard view */}
              {activeMenu === "dashboard" && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <button
                    type="button"
                    onClick={() => setStatusFilter("all")}
                    className={`text-left rounded-2xl border p-3.5 transition-all cursor-pointer backdrop-blur-md ${
                      statusFilter === "all"
                        ? "border-indigo-500 bg-gradient-to-br from-indigo-500/15 via-indigo-500/5 to-white dark:from-indigo-500/25 dark:to-slate-900 shadow-xs"
                        : "border-slate-200/90 bg-white/90 hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900/90"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      <span className="truncate">Total Active</span>
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
                        <Package className="h-3.5 w-3.5" />
                      </span>
                    </div>
                    <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
                      {totalCount}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusFilter("booked")}
                    className={`text-left rounded-2xl border p-3.5 transition-all cursor-pointer backdrop-blur-md ${
                      statusFilter === "booked"
                        ? "border-violet-500 bg-gradient-to-br from-violet-500/15 via-violet-500/5 to-white dark:from-violet-500/25 dark:to-slate-900 shadow-xs"
                        : "border-slate-200/90 bg-white/90 hover:border-violet-300 dark:border-slate-800 dark:bg-slate-900/90"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 text-xs font-semibold text-violet-700 dark:text-violet-400">
                      <span className="truncate">Booked</span>
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 shrink-0">
                        <Package className="h-3.5 w-3.5" />
                      </span>
                    </div>
                    <div className="mt-2 text-2xl font-bold tracking-tight text-violet-600 dark:text-violet-400 tabular-nums">
                      {bookedCount}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusFilter("in_transit")}
                    className={`text-left rounded-2xl border p-3.5 transition-all cursor-pointer backdrop-blur-md ${
                      statusFilter === "in_transit"
                        ? "border-sky-500 bg-gradient-to-br from-sky-500/15 via-sky-500/5 to-white dark:from-sky-500/25 dark:to-slate-900 shadow-xs"
                        : "border-slate-200/90 bg-white/90 hover:border-sky-300 dark:border-slate-800 dark:bg-slate-900/90"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 text-xs font-semibold text-sky-700 dark:text-sky-400">
                      <span className="truncate">In Transit</span>
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 shrink-0">
                        <Clock className="h-3.5 w-3.5" />
                      </span>
                    </div>
                    <div className="mt-2 text-2xl font-bold tracking-tight text-sky-600 dark:text-sky-400 tabular-nums">
                      {inTransitCount}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusFilter("out_for_delivery")}
                    className={`text-left rounded-2xl border p-3.5 transition-all cursor-pointer backdrop-blur-md ${
                      statusFilter === "out_for_delivery"
                        ? "border-amber-500 bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-white dark:from-amber-500/25 dark:to-slate-900 shadow-xs"
                        : "border-slate-200/90 bg-white/90 hover:border-amber-300 dark:border-slate-800 dark:bg-slate-900/90"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
                      <span className="truncate">Out Deliv.</span>
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                        <Truck className="h-3.5 w-3.5" />
                      </span>
                    </div>
                    <div className="mt-2 text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 tabular-nums">
                      {outCount}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusFilter("delivered")}
                    className={`text-left rounded-2xl border p-3.5 transition-all cursor-pointer backdrop-blur-md ${
                      statusFilter === "delivered"
                        ? "border-emerald-500 bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-white dark:from-emerald-500/25 dark:to-slate-900 shadow-xs"
                        : "border-slate-200/90 bg-white/90 hover:border-emerald-300 dark:border-slate-800 dark:bg-slate-900/90"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      <span className="truncate">Delivered</span>
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </span>
                    </div>
                    <div className="mt-2 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {deliveredCount}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusFilter("returned")}
                    className={`text-left rounded-2xl border p-3.5 transition-all cursor-pointer backdrop-blur-md ${
                      statusFilter === "returned"
                        ? "border-rose-500 bg-gradient-to-br from-rose-500/15 via-rose-500/5 to-white dark:from-rose-500/25 dark:to-slate-900 shadow-xs"
                        : "border-slate-200/90 bg-white/90 hover:border-rose-300 dark:border-slate-800 dark:bg-slate-900/90"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 text-xs font-semibold text-rose-700 dark:text-rose-400">
                      <span className="truncate">Returned</span>
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 shrink-0">
                        <RotateCcw className="h-3.5 w-3.5" />
                      </span>
                    </div>
                    <div className="mt-2 text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400 tabular-nums">
                      {returnedCount}
                    </div>
                  </button>
                </div>
              )}

              {/* Search, Custom Batch Scope Dropdown & Custom Status Filter Bar */}
              <div className="rounded-3xl border border-slate-200/90 bg-white p-3.5 sm:p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Search Tracking Code, Customer Name, Courier, Pincode, City..."
                    className="w-full rounded-xl border border-slate-200/90 bg-slate-50/80 pl-10 pr-9 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-800/70 dark:text-white"
                  />
                  {searchFilter && (
                    <button
                      type="button"
                      onClick={() => setSearchFilter("")}
                      className="absolute right-3 top-2 rounded-lg p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Custom Styled SaaS Dropdowns for Batch Scope & Status Filter */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {/* 1. Custom Batch Scope Dropdown */}
                  <div className="relative flex-1 sm:flex-initial min-w-[185px]">
                    <button
                      type="button"
                      onClick={() => {
                        setIsFilterBatchDropdownOpen((prev) => !prev);
                        setIsFilterStatusDropdownOpen(false);
                      }}
                      className="w-full flex items-center justify-between gap-2 rounded-xl border border-slate-200/90 bg-slate-50/90 hover:bg-slate-100/80 hover:border-indigo-300 px-3.5 py-2 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-100 dark:hover:border-indigo-500/60 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FolderKanban className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        <span className="truncate">
                          {selectedBatchId === "all"
                            ? `All Batches (${totalCount})`
                            : selectedBatchId === "imported_all"
                            ? `All Imported (${importedCount})`
                            : (() => {
                                const b = uniqueBatches.find((x) => x.id === selectedBatchId);
                                return b ? `${b.name} (${b.count})` : `All Batches (${totalCount})`;
                              })()}
                        </span>
                      </div>
                      <ChevronDown
                        className={`h-3.5 w-3.5 text-slate-400 shrink-0 transition-transform duration-150 ${
                          isFilterBatchDropdownOpen ? "rotate-180 text-indigo-600" : ""
                        }`}
                      />
                    </button>

                    {isFilterBatchDropdownOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setIsFilterBatchDropdownOpen(false)}
                        />
                        <div className="absolute right-0 left-0 sm:left-auto top-full mt-1.5 z-50 sm:w-68 max-h-64 overflow-y-auto rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-2xl dark:border-slate-700 dark:bg-slate-800 space-y-0.5 animate-dropdown-open">
                          {[
                            { id: "all", label: "All Shipments", count: totalCount },
                            { id: "imported_all", label: "All Imported Batches", count: importedCount },
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
                                setSelectedBatchId(opt.id);
                                setIsFilterBatchDropdownOpen(false);
                              }}
                              className={`w-full flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                                selectedBatchId === opt.id
                                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 font-semibold"
                                  : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700/70"
                              }`}
                            >
                              <span className="truncate">{opt.label}</span>
                              <span className="rounded-md bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-600 dark:text-slate-300 tabular-nums shrink-0">
                                {opt.count}
                              </span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* 2. Custom Status Filter Dropdown */}
                  <div className="relative flex-1 sm:flex-initial min-w-[165px]">
                    <button
                      type="button"
                      onClick={() => {
                        setIsFilterStatusDropdownOpen((prev) => !prev);
                        setIsFilterBatchDropdownOpen(false);
                      }}
                      className="w-full flex items-center justify-between gap-2 rounded-xl border border-slate-200/90 bg-slate-50/90 hover:bg-slate-100/80 hover:border-indigo-300 px-3.5 py-2 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-100 dark:hover:border-indigo-500/60 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Filter className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        <span className="truncate">
                          {statusFilter === "all"
                            ? `All Status (${scopedTotalCount})`
                            : statusFilter === "booked"
                            ? `Booked (${scopedBookedCount})`
                            : statusFilter === "in_transit"
                            ? `In Transit (${scopedInTransitCount})`
                            : statusFilter === "out_for_delivery"
                            ? `Out for Deliv. (${scopedOutCount})`
                            : statusFilter === "delivered"
                            ? `Delivered (${scopedDeliveredCount})`
                            : `Returned (${scopedReturnedCount})`}
                        </span>
                      </div>
                      <ChevronDown
                        className={`h-3.5 w-3.5 text-slate-400 shrink-0 transition-transform duration-150 ${
                          isFilterStatusDropdownOpen ? "rotate-180 text-indigo-600" : ""
                        }`}
                      />
                    </button>

                    {isFilterStatusDropdownOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setIsFilterStatusDropdownOpen(false)}
                        />
                        <div className="absolute right-0 left-0 sm:left-auto top-full mt-1.5 z-50 sm:w-56 rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-2xl dark:border-slate-700 dark:bg-slate-800 space-y-0.5 animate-dropdown-open">
                          {(
                            [
                              { id: "all", label: "All Statuses", dot: "bg-indigo-500", count: scopedTotalCount },
                              { id: "booked", label: "Booked", dot: "bg-violet-500", count: scopedBookedCount },
                              { id: "in_transit", label: "In Transit", dot: "bg-sky-500", count: scopedInTransitCount },
                              { id: "out_for_delivery", label: "Out for Delivery", dot: "bg-amber-500", count: scopedOutCount },
                              { id: "delivered", label: "Delivered", dot: "bg-emerald-500", count: scopedDeliveredCount },
                              { id: "returned", label: "Returned (RTO)", dot: "bg-rose-500", count: scopedReturnedCount },
                            ] as const
                          ).map((st) => (
                            <button
                              key={st.id}
                              type="button"
                              onClick={() => {
                                setStatusFilter(st.id);
                                setIsFilterStatusDropdownOpen(false);
                              }}
                              className={`w-full flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                                statusFilter === st.id
                                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 font-semibold"
                                  : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700/70"
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <span className={`h-2 w-2 rounded-full shrink-0 ${st.dot}`} />
                                <span className="truncate">{st.label}</span>
                              </div>
                              <span className="rounded-md bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-600 dark:text-slate-300 tabular-nums shrink-0">
                                {st.count}
                              </span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Main Shipments Table: ONLY 5 COLUMNS (Tracking code, Name, Courier Partner, Delivery Status, Track) + Click Row for Full Customer Details */}
              <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[640px]">
                    <thead className="bg-slate-50/90 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800/70 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-800">
                      <tr>
                        <th className="py-3.5 pl-4 sm:pl-5 pr-2 w-11">
                          {(() => {
                            const allSelected =
                              filteredShipments.length > 0 &&
                              selectedShipmentIds.length === filteredShipments.length;
                            const isIndeterminate =
                              selectedShipmentIds.length > 0 &&
                              selectedShipmentIds.length < filteredShipments.length;
                            return (
                              <button
                                type="button"
                                role="checkbox"
                                aria-checked={isIndeterminate ? "mixed" : allSelected}
                                aria-label="Select all consignments"
                                onClick={handleToggleSelectAll}
                                className={`flex h-4.5 w-4.5 items-center justify-center rounded-md border transition-all cursor-pointer ${
                                  allSelected || isIndeterminate
                                    ? "border-indigo-600 bg-indigo-600 text-white shadow-2xs ring-2 ring-indigo-500/20"
                                    : "border-slate-300 bg-white hover:border-indigo-400 dark:border-slate-600 dark:bg-slate-800 dark:hover:border-indigo-400"
                                }`}
                              >
                                {allSelected ? (
                                  <Check className="h-3 w-3 stroke-[3.2]" />
                                ) : isIndeterminate ? (
                                  <Minus className="h-3 w-3 stroke-[3.2]" />
                                ) : null}
                              </button>
                            );
                          })()}
                        </th>
                        <th className="py-3.5 px-3">Tracking Code</th>
                        <th className="py-3.5 px-3">Name</th>
                        <th className="py-3.5 px-3">Courier Partner</th>
                        <th className="py-3.5 px-3">Delivery Status</th>
                        <th className="py-3.5 px-4 text-right">Track</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {filteredShipments.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-14 text-center text-slate-400">
                            <Package className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
                            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                              No shipments matching your filter
                            </p>
                          </td>
                        </tr>
                      ) : (
                        filteredShipments.map((item) => {
                          const isRowSelected = selectedShipmentIds.includes(item.id);
                          return (
                            <tr
                              key={item.id}
                              onClick={() => setSelectedDetailShipment(item)}
                              title="Click row to view full customer & shipment details"
                              className={`transition-colors group cursor-pointer ${
                                isRowSelected
                                  ? "bg-indigo-50/60 dark:bg-indigo-950/35"
                                  : "hover:bg-indigo-50/35 dark:hover:bg-slate-800/50"
                              }`}
                            >
                              {/* Custom Styled SaaS Checkbox */}
                              <td
                                className="py-3.5 pl-4 sm:pl-5 pr-2 w-11"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  role="checkbox"
                                  aria-checked={isRowSelected}
                                  aria-label={`Select consignment ${item.trackingNumber}`}
                                  onClick={() => handleToggleSelectRow(item.id)}
                                  className={`flex h-4.5 w-4.5 items-center justify-center rounded-md border transition-all cursor-pointer ${
                                    isRowSelected
                                      ? "border-indigo-600 bg-indigo-600 text-white shadow-2xs ring-2 ring-indigo-500/20"
                                      : "border-slate-300 bg-white hover:border-indigo-400 dark:border-slate-600 dark:bg-slate-800 dark:hover:border-indigo-400"
                                  }`}
                                >
                                  {isRowSelected && <Check className="h-3 w-3 stroke-[3.2]" />}
                                </button>
                              </td>

                              {/* Column 1: Tracking Code */}
                              <td className="py-3.5 px-3">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-bold text-indigo-600 group-hover:text-indigo-700 dark:text-indigo-400 dark:group-hover:text-indigo-300 transition-colors text-xs sm:text-[13px] tracking-tight">
                                    {item.trackingNumber}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCopy(item.id, item.trackingNumber);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-opacity cursor-pointer"
                                    title="Copy Tracking Code"
                                  >
                                    {copiedId === item.id ? (
                                      <Check className="h-3 w-3 text-emerald-600" />
                                    ) : (
                                      <Copy className="h-3 w-3" />
                                    )}
                                  </button>
                                </div>
                              </td>

                              {/* Column 2: Name */}
                              <td className="py-3.5 px-3">
                                <div className="font-semibold text-slate-900 dark:text-white text-xs sm:text-[13px] truncate max-w-[190px]">
                                  {item.recipientName || "—"}
                                </div>
                              </td>

                              {/* Column 3: Courier Partner */}
                              <td className="py-3.5 px-3">
                                <span className="font-semibold text-slate-700 dark:text-slate-200 text-xs truncate block max-w-[160px]">
                                  {item.courierName}
                                </span>
                              </td>

                              {/* Column 4: Delivery Status */}
                              <td className="py-3.5 px-3">
                                {item.status === "delivered" && (
                                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200/80 bg-emerald-50/90 dark:border-emerald-800/60 dark:bg-emerald-950/60 px-2.5 py-1 font-bold text-emerald-700 dark:text-emerald-300 text-[11px]">
                                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                                    <span>Delivered</span>
                                  </span>
                                )}
                                {item.status === "out_for_delivery" && (
                                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200/80 bg-amber-50/90 dark:border-amber-800/60 dark:bg-amber-950/60 px-2.5 py-1 font-bold text-amber-700 dark:text-amber-300 text-[11px]">
                                    <Truck className="h-3.5 w-3.5 shrink-0" />
                                    <span>Out for Delivery</span>
                                  </span>
                                )}
                                {item.status === "in_transit" && (
                                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200/80 bg-sky-50/90 dark:border-sky-800/60 dark:bg-sky-950/60 px-2.5 py-1 font-bold text-sky-700 dark:text-sky-300 text-[11px]">
                                    <Clock className="h-3.5 w-3.5 shrink-0" />
                                    <span>In Transit</span>
                                  </span>
                                )}
                                {item.status === "returned" && (
                                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200/80 bg-rose-50/90 dark:border-rose-800/60 dark:bg-rose-950/60 px-2.5 py-1 font-bold text-rose-700 dark:text-rose-300 text-[11px]">
                                    <RotateCcw className="h-3.5 w-3.5 shrink-0" />
                                    <span>Returned</span>
                                  </span>
                                )}
                                {item.status === "booked" && (
                                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200/80 bg-violet-50/90 dark:border-violet-800/60 dark:bg-violet-950/60 px-2.5 py-1 font-bold text-violet-700 dark:text-violet-300 text-[11px]">
                                    <Package className="h-3.5 w-3.5 shrink-0" />
                                    <span>Booked</span>
                                  </span>
                                )}
                              </td>

                              {/* Column 5: Track */}
                              <td
                                className="py-3.5 px-4 text-right"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={() => onOpenTrackingResult(item.trackingNumber, item.courierId)}
                                  className="inline-flex items-center justify-center rounded-xl bg-indigo-50 hover:bg-indigo-600 hover:text-white px-3.5 py-1.5 text-xs font-bold text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 dark:hover:bg-indigo-600 dark:hover:text-white transition-all cursor-pointer"
                                >
                                  <span>Track</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* VIEW 3: BATCHES (CLEAN BATCH MANAGEMENT WORKSPACE)           */}
          {/* ============================================================ */}
          {activeMenu === "batches" && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Mobile-Responsive Batch Summary Strip (2 columns on mobile, 3 on sm+) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3.5">
                <div className="rounded-2xl border border-indigo-200/70 bg-gradient-to-br from-indigo-500/10 via-white to-white dark:from-indigo-500/20 dark:to-slate-900 p-3 sm:p-4 dark:border-indigo-800/50">
                  <div className="flex items-center justify-between gap-1 text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <span>Total Batches</span>
                    <FolderKanban className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  </div>
                  <div className="mt-1 sm:mt-1.5 text-lg sm:text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                    {uniqueBatches.length}
                  </div>
                </div>

                <div className="rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-500/10 via-white to-white dark:from-emerald-500/20 dark:to-slate-900 p-3 sm:p-4 dark:border-emerald-800/50">
                  <div className="flex items-center justify-between gap-1 text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <span>Batch Consignments</span>
                    <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  </div>
                  <div className="mt-1 sm:mt-1.5 text-lg sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {importedCount}
                  </div>
                </div>

                <div className="col-span-2 sm:col-span-1 rounded-2xl border border-violet-200/70 bg-gradient-to-br from-violet-500/10 via-white to-white dark:from-violet-500/20 dark:to-slate-900 p-3 sm:p-4 dark:border-violet-800/50">
                  <div className="flex items-center justify-between gap-1 text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <span>Active Batch Filter</span>
                    <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-violet-600 dark:text-violet-400 shrink-0" />
                  </div>
                  <div className="mt-1 sm:mt-1.5 flex items-center justify-between gap-2">
                    <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                      {selectedBatchId === "all"
                        ? "All Shipments"
                        : selectedBatchId === "imported_all"
                        ? "All Imported Batches"
                        : uniqueBatches.find((b) => b.id === selectedBatchId)?.name || "All Shipments"}
                    </span>
                    {selectedBatchId !== "all" && (
                      <button
                        type="button"
                        onClick={() => setSelectedBatchId("all")}
                        className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400 shrink-0 cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Batch Directory Card */}
              <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBatchId("all");
                        setActiveMenu("dashboard");
                      }}
                      className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                        selectedBatchId === "all"
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      All Shipments ({totalCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBatchId("imported_all");
                        setActiveMenu("dashboard");
                      }}
                      className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                        selectedBatchId === "imported_all"
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      All Imported ({importedCount})
                    </button>
                  </div>

                  {/* Search Batches Input */}
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={batchSearchQuery}
                      onChange={(e) => setBatchSearchQuery(e.target.value)}
                      placeholder="Search batch name..."
                      className="w-full rounded-xl border border-slate-200/90 bg-slate-50/80 pl-9 pr-8 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                    {batchSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setBatchSearchQuery("")}
                        className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {uniqueBatches.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    <FolderKanban className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="font-semibold text-slate-600 dark:text-slate-300">
                      No batches created yet
                    </p>
                    <p className="mt-1">
                      Use Add Consignment or Bulk Import to organize shipments into batches.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {uniqueBatches
                      .filter((b) =>
                        !batchSearchQuery.trim()
                          ? true
                          : b.name.toLowerCase().includes(batchSearchQuery.trim().toLowerCase())
                      )
                      .map((batch) => {
                        const isSelected = selectedBatchId === batch.id;
                        const isEditing = editingBatchId === batch.id;
                        const batchRecords = activeShipments.filter((s) => s.batchId === batch.id);
                        const batchBooked = batchRecords.filter((s) => s.status === "booked").length;
                        const batchTransit = batchRecords.filter(
                          (s) => s.status === "in_transit" || s.status === "out_for_delivery"
                        ).length;
                        const batchProgress =
                          batch.count > 0 ? Math.round((batch.delivered / batch.count) * 100) : 0;

                        return (
                          <div
                            key={batch.id}
                            className={`rounded-2xl border p-4 transition-all flex flex-col justify-between gap-3 ${
                              isSelected
                                ? "border-indigo-500 bg-indigo-50/40 dark:border-indigo-500/80 dark:bg-indigo-950/30 shadow-xs"
                                : "border-slate-200/90 bg-slate-50/50 hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-800/40"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2.5">
                              {isEditing ? (
                                <div className="flex items-center gap-1.5 flex-1 bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-xl border border-indigo-500">
                                  <input
                                    type="text"
                                    value={editingBatchName}
                                    onChange={(e) => setEditingBatchName(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") handleSaveBatchName(batch.id);
                                      if (e.key === "Escape") handleCancelEditBatch();
                                    }}
                                    autoFocus
                                    placeholder="Batch name..."
                                    className="text-xs font-semibold text-slate-900 dark:text-white bg-transparent outline-none flex-1 min-w-0"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleSaveBatchName(batch.id)}
                                    className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer"
                                  >
                                    Save
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleCancelEditBatch}
                                    className="px-2 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                      {batch.name}
                                    </span>
                                    {isSelected && (
                                      <span className="rounded-md bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white shrink-0">
                                        Filtered
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                                      {batch.count} shipment{batch.count > 1 ? "s" : ""}
                                    </span>
                                    <span>·</span>
                                    <span className="text-violet-600 dark:text-violet-400">
                                      {batchBooked} booked
                                    </span>
                                    <span>·</span>
                                    <span className="text-sky-600 dark:text-sky-400">
                                      {batchTransit} transit
                                    </span>
                                    <span>·</span>
                                    <span className="text-emerald-600 dark:text-emerald-400">
                                      {batch.delivered} delivered
                                    </span>
                                  </div>
                                </div>
                              )}

                              {!isEditing && (
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleStartEditBatch(batch.id, batch.name)}
                                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                                    title="Edit batch name"
                                  >
                                    <Pencil className="h-3 w-3" />
                                    <span>Edit</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setBatchPendingDeleteId(batch.id)}
                                    className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50/80 hover:bg-rose-100 px-2.5 py-1.5 text-[11px] font-semibold text-rose-600 dark:border-rose-900/60 dark:bg-rose-950/60 dark:text-rose-300 cursor-pointer"
                                    title="Delete batch"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                    <span>Delete</span>
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Delivery Progress Bar + Filter Batch Action */}
                            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-3">
                              <div className="flex-1">
                                <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 mb-1">
                                  <span>Delivery Progress</span>
                                  <span>{batchProgress}%</span>
                                </div>
                                <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                  <div
                                    className="h-full bg-emerald-500 rounded-full transition-all"
                                    style={{ width: `${batchProgress}%` }}
                                  />
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedBatchId(batch.id);
                                  setActiveMenu("dashboard");
                                }}
                                className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 text-[11px] font-bold text-white shadow-2xs transition-colors cursor-pointer shrink-0"
                              >
                                <Filter className="h-3 w-3" />
                                <span>Filter Batch</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* VIEW 4: ANALYTICS & ADVANCED DATE-WISE EXPORT STUDIO         */}
          {/* ============================================================ */}
          {activeMenu === "analytics" && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* 1. SHIPMENT OVERVIEW & CUSTOM CALENDAR POPOVER */}
              <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        Shipment Overview
                      </h3>
                    </div>
                  </div>

                  {/* Date Range Filter Pills + Direct Custom Calendar Popover */}
                  <div className="flex flex-wrap items-center gap-2">
                    {(
                      [
                        { id: "all", label: "All Dates" },
                        { id: "today", label: "Today" },
                        { id: "yesterday", label: "Yesterday" },
                        { id: "last_7_days", label: "Last 7 Days" },
                      ] as const
                    ).map((df) => (
                      <button
                        key={df.id}
                        type="button"
                        onClick={() => {
                          setAnalyticsDateFilter(df.id);
                          setIsCustomCalendarOpen(false);
                        }}
                        className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                          analyticsDateFilter === df.id
                            ? "bg-indigo-600 text-white shadow-2xs"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {df.label}
                      </button>
                    ))}

                    {/* Custom Date Button with Attached Custom Calendar Popover */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setAnalyticsDateFilter("custom");
                          setIsCustomCalendarOpen((prev) => !prev);
                        }}
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                          analyticsDateFilter === "custom"
                            ? "bg-indigo-600 text-white shadow-2xs"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          {analyticsDateFilter === "custom"
                            ? `${customStartDate} → ${customEndDate}`
                            : "Custom Date"}
                        </span>
                        <ChevronDown className="h-3.5 w-3.5 opacity-80 shrink-0" />
                      </button>

                      {isCustomCalendarOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsCustomCalendarOpen(false)}
                          />
                          <div className="absolute right-0 top-full mt-2 z-50 w-72 sm:w-80 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xl dark:border-slate-700 dark:bg-slate-900 space-y-3 animate-calendar-open">
                            {/* Start / End Selector Tabs */}
                            <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
                              <button
                                type="button"
                                onClick={() => setCalendarPickingField("start")}
                                className={`rounded-lg px-2 py-1.5 text-left transition-all cursor-pointer ${
                                  calendarPickingField === "start"
                                    ? "bg-white dark:bg-slate-900 shadow-2xs text-indigo-600 dark:text-indigo-400"
                                    : "text-slate-600 dark:text-slate-400"
                                }`}
                              >
                                <div className="text-[9px] font-bold uppercase tracking-wider opacity-75">
                                  Start Date
                                </div>
                                <div className="font-mono text-[11px] font-bold">
                                  {customStartDate}
                                </div>
                              </button>
                              <button
                                type="button"
                                onClick={() => setCalendarPickingField("end")}
                                className={`rounded-lg px-2 py-1.5 text-left transition-all cursor-pointer ${
                                  calendarPickingField === "end"
                                    ? "bg-white dark:bg-slate-900 shadow-2xs text-indigo-600 dark:text-indigo-400"
                                    : "text-slate-600 dark:text-slate-400"
                                }`}
                              >
                                <div className="text-[9px] font-bold uppercase tracking-wider opacity-75">
                                  End Date
                                </div>
                                <div className="font-mono text-[11px] font-bold">
                                  {customEndDate}
                                </div>
                              </button>
                            </div>

                            {/* Month Navigation Header */}
                            <div className="flex items-center justify-between px-1">
                              <button
                                type="button"
                                onClick={() =>
                                  setCalendarMonthCursor((prev) => {
                                    const d = new Date(prev.year, prev.month - 1, 1);
                                    return { year: d.getFullYear(), month: d.getMonth() };
                                  })
                                }
                                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </button>
                              <span className="text-xs font-bold text-slate-900 dark:text-white">
                                {new Date(
                                  calendarMonthCursor.year,
                                  calendarMonthCursor.month,
                                  1
                                ).toLocaleString("default", {
                                  month: "long",
                                  year: "numeric",
                                })}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setCalendarMonthCursor((prev) => {
                                    const d = new Date(prev.year, prev.month + 1, 1);
                                    return { year: d.getFullYear(), month: d.getMonth() };
                                  })
                                }
                                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                              >
                                <ChevronRight className="h-4 w-4" />
                              </button>
                            </div>

                            {/* Weekday Headers */}
                            <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-400">
                              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                                <span key={d}>{d}</span>
                              ))}
                            </div>

                            {/* Days Grid */}
                            <div className="grid grid-cols-7 gap-1 text-center">
                              {buildCalendarDays(
                                calendarMonthCursor.year,
                                calendarMonthCursor.month
                              ).map((iso, idx) => {
                                if (!iso) {
                                  return <div key={`empty-${idx}`} className="h-7" />;
                                }
                                const dayNum = parseInt(iso.split("-")[2], 10);
                                const isStart = iso === customStartDate;
                                const isEnd = iso === customEndDate;
                                const isInRange =
                                  iso >= customStartDate && iso <= customEndDate;
                                return (
                                  <button
                                    key={iso}
                                    type="button"
                                    onClick={() => {
                                      if (calendarPickingField === "start") {
                                        setCustomStartDate(iso);
                                        if (iso > customEndDate) {
                                          setCustomEndDate(iso);
                                        }
                                        setCalendarPickingField("end");
                                      } else {
                                        if (iso < customStartDate) {
                                          setCustomStartDate(iso);
                                        } else {
                                          setCustomEndDate(iso);
                                        }
                                        setCalendarPickingField("start");
                                      }
                                    }}
                                    className={`h-7 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                                      isStart || isEnd
                                        ? "bg-indigo-600 text-white font-bold shadow-2xs"
                                        : isInRange
                                        ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300"
                                        : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                                    }`}
                                  >
                                    {dayNum}
                                  </button>
                                );
                              })}
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                              <button
                                type="button"
                                onClick={() => {
                                  const today = getTodayIso();
                                  setCustomStartDate(today);
                                  setCustomEndDate(today);
                                }}
                                className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                              >
                                Select Today
                              </button>
                              <button
                                type="button"
                                onClick={() => setIsCustomCalendarOpen(false)}
                                className="rounded-lg bg-indigo-600 hover:bg-indigo-700 px-3 py-1 text-[11px] font-bold text-white cursor-pointer"
                              >
                                Done
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Date-Filtered KPI Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-800/40 p-3.5">
                    <div className="text-[11px] font-semibold text-slate-500">Matched Total</div>
                    <div className="mt-1 text-xl font-bold text-slate-900 dark:text-white tabular-nums">
                      {dateWiseAnalytics.filteredTotal}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-violet-200/70 bg-violet-50/50 dark:border-violet-900/50 dark:bg-violet-950/30 p-3.5">
                    <div className="text-[11px] font-semibold text-violet-700 dark:text-violet-300">Booked</div>
                    <div className="mt-1 text-xl font-bold text-violet-600 dark:text-violet-400 tabular-nums">
                      {dateWiseAnalytics.filteredBooked}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-sky-200/70 bg-sky-50/50 dark:border-sky-900/50 dark:bg-sky-950/30 p-3.5">
                    <div className="text-[11px] font-semibold text-sky-700 dark:text-sky-300">In Transit</div>
                    <div className="mt-1 text-xl font-bold text-sky-600 dark:text-sky-400 tabular-nums">
                      {dateWiseAnalytics.filteredInTransit}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-amber-200/70 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/30 p-3.5">
                    <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">Out for Deliv.</div>
                    <div className="mt-1 text-xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                      {dateWiseAnalytics.filteredOut}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/30 p-3.5">
                    <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">Delivered</div>
                    <div className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {dateWiseAnalytics.filteredDelivered}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-rose-200/70 bg-rose-50/50 dark:border-rose-900/50 dark:bg-rose-950/30 p-3.5">
                    <div className="text-[11px] font-semibold text-rose-700 dark:text-rose-300">Returned</div>
                    <div className="mt-1 text-xl font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                      {dateWiseAnalytics.filteredReturned}
                    </div>
                  </div>
                </div>

                {/* Date-Wise Breakdown Table */}
                <div className="overflow-hidden rounded-2xl border border-slate-200/90 dark:border-slate-800">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[620px]">
                      <thead className="bg-slate-50/90 dark:bg-slate-800/70 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-800">
                        <tr>
                          <th className="py-3 px-4">Date</th>
                          <th className="py-3 px-3">Total</th>
                          <th className="py-3 px-3 text-violet-600 dark:text-violet-400">Booked</th>
                          <th className="py-3 px-3 text-sky-600 dark:text-sky-400">In Transit</th>
                          <th className="py-3 px-3 text-amber-600 dark:text-amber-400">Out for Deliv.</th>
                          <th className="py-3 px-3 text-emerald-600 dark:text-emerald-400">Delivered</th>
                          <th className="py-3 px-3 text-rose-600 dark:text-rose-400">Returned</th>
                          <th className="py-3 px-4 text-right">Delivery Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                        {dateWiseAnalytics.dailyBuckets.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-8 text-center text-slate-400">
                              No shipments recorded for the selected date range.
                            </td>
                          </tr>
                        ) : (
                          dateWiseAnalytics.dailyBuckets.map((day) => {
                            const rate = day.total > 0 ? Math.round((day.delivered / day.total) * 100) : 0;
                            return (
                              <tr key={day.date} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                                <td className="py-3 px-4 font-mono font-semibold text-slate-900 dark:text-white">
                                  {day.date}
                                  {day.date === getTodayIso() && (
                                    <span className="ml-2 rounded bg-indigo-50 dark:bg-indigo-950/80 px-1.5 py-0.5 font-sans text-[10px] font-semibold text-indigo-600 dark:text-indigo-300">
                                      Today
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">
                                  {day.total}
                                </td>
                                <td className="py-3 px-3 font-mono font-semibold text-violet-600 dark:text-violet-400">
                                  {day.booked}
                                </td>
                                <td className="py-3 px-3 font-mono font-semibold text-sky-600 dark:text-sky-400">
                                  {day.in_transit}
                                </td>
                                <td className="py-3 px-3 font-mono font-semibold text-amber-600 dark:text-amber-400">
                                  {day.out_for_delivery}
                                </td>
                                <td className="py-3 px-3 font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                                  {day.delivered}
                                </td>
                                <td className="py-3 px-3 font-mono font-semibold text-rose-600 dark:text-rose-400">
                                  {day.returned}
                                </td>
                                <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                  {rate}%
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* 2. ADVANCED EXPORT STUDIO (DATE-WISE, BATCH-WISE & STATUS-WISE) + CARRIER & STORAGE */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Advanced Date-Wise & Batch-Wise Export Card */}
                <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Download className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
                      <span className="text-base font-bold text-slate-900 dark:text-white">
                        Advanced Export
                      </span>
                    </div>
                    <span className="rounded-lg bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200/70 dark:border-indigo-800/60 px-2.5 py-0.5 font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                      .{exportFileExtension}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* 1. Custom Date Filter Dropdown for Export */}
                    <div className="relative">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1.5">
                        Date Scope
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsExportDateDropdownOpen((prev) => !prev);
                          setIsExportBatchDropdownOpen(false);
                          setIsExportStatusDropdownOpen(false);
                          setIsExportFormatDropdownOpen(false);
                        }}
                        className="w-full flex items-center justify-between gap-2 rounded-xl border border-slate-200/90 bg-slate-50/90 hover:bg-slate-100/80 hover:border-indigo-300 px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 transition-all cursor-pointer"
                      >
                        <span className="truncate">
                          {analyticsDateFilter === "all"
                            ? "All Dates"
                            : analyticsDateFilter === "today"
                            ? `Today (${getTodayIso()})`
                            : analyticsDateFilter === "yesterday"
                            ? `Yesterday (${getYesterdayIso()})`
                            : analyticsDateFilter === "last_7_days"
                            ? "Last 7 Days"
                            : `${customStartDate} to ${customEndDate}`}
                        </span>
                        <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                      </button>

                      {isExportDateDropdownOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsExportDateDropdownOpen(false)}
                          />
                          <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-2xl dark:border-slate-700 dark:bg-slate-800 space-y-0.5 animate-dropdown-open">
                            {(
                              [
                                { id: "all", label: "All Dates" },
                                { id: "today", label: "Today" },
                                { id: "yesterday", label: "Yesterday" },
                                { id: "last_7_days", label: "Last 7 Days" },
                                { id: "custom", label: "Custom Date Range" },
                              ] as const
                            ).map((opt) => (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => {
                                  setAnalyticsDateFilter(opt.id);
                                  setIsExportDateDropdownOpen(false);
                                  if (opt.id === "custom") {
                                    setIsCustomCalendarOpen(true);
                                  }
                                }}
                                className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                                  analyticsDateFilter === opt.id
                                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 font-semibold"
                                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700/70"
                                }`}
                              >
                                <span>{opt.label}</span>
                                {analyticsDateFilter === opt.id && (
                                  <Check className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                                )}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    {/* 2. Custom Batch Scope Dropdown */}
                    <div className="relative">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1.5">
                        Batch Scope
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsExportBatchDropdownOpen((prev) => !prev);
                          setIsExportDateDropdownOpen(false);
                          setIsExportStatusDropdownOpen(false);
                          setIsExportFormatDropdownOpen(false);
                        }}
                        className="w-full flex items-center justify-between gap-2 rounded-xl border border-slate-200/90 bg-slate-50/90 hover:bg-slate-100/80 hover:border-indigo-300 px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 transition-all cursor-pointer"
                      >
                        <span className="truncate">
                          {exportBatchTargetId === "all"
                            ? `All Shipments (${totalCount})`
                            : exportBatchTargetId === "imported_all"
                            ? `All Imported (${importedCount})`
                            : exportBatchTargetId === "direct_only"
                            ? `Direct Added (${Math.max(0, totalCount - importedCount)})`
                            : (() => {
                                const b = uniqueBatches.find((x) => x.id === exportBatchTargetId);
                                return b ? `${b.name} (${b.count})` : `All Shipments (${totalCount})`;
                              })()}
                        </span>
                        <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                      </button>

                      {isExportBatchDropdownOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsExportBatchDropdownOpen(false)}
                          />
                          <div className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-60 overflow-y-auto rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-2xl dark:border-slate-700 dark:bg-slate-800 space-y-0.5 animate-dropdown-open">
                            {[
                              { id: "all", label: "All Shipments", count: totalCount },
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
                                className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                                  exportBatchTargetId === opt.id
                                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 font-semibold"
                                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700/70"
                                }`}
                              >
                                <span className="truncate pr-2">{opt.label}</span>
                                <span className="rounded-md bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-600 dark:text-slate-300 tabular-nums shrink-0">
                                  {opt.count}
                                </span>
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    {/* 3. Custom Status Scope Dropdown */}
                    <div className="relative">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1.5">
                        Delivery Status
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsExportStatusDropdownOpen((prev) => !prev);
                          setIsExportDateDropdownOpen(false);
                          setIsExportBatchDropdownOpen(false);
                          setIsExportFormatDropdownOpen(false);
                        }}
                        className="w-full flex items-center justify-between gap-2 rounded-xl border border-slate-200/90 bg-slate-50/90 hover:bg-slate-100/80 hover:border-indigo-300 px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 transition-all cursor-pointer"
                      >
                        <span className="truncate">
                          {exportStatusTarget === "all"
                            ? "All Statuses"
                            : exportStatusTarget === "booked"
                            ? "Booked Only"
                            : exportStatusTarget === "in_transit"
                            ? "In Transit Only"
                            : exportStatusTarget === "out_for_delivery"
                            ? "Out for Delivery Only"
                            : exportStatusTarget === "delivered"
                            ? "Delivered Only"
                            : "Returned Only"}
                        </span>
                        <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                      </button>

                      {isExportStatusDropdownOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsExportStatusDropdownOpen(false)}
                          />
                          <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-2xl dark:border-slate-700 dark:bg-slate-800 space-y-0.5 animate-dropdown-open">
                            {(
                              [
                                { id: "all", label: "All Statuses" },
                                { id: "booked", label: "Booked Only" },
                                { id: "in_transit", label: "In Transit Only" },
                                { id: "out_for_delivery", label: "Out for Delivery Only" },
                                { id: "delivered", label: "Delivered Only" },
                                { id: "returned", label: "Returned Only" },
                              ] as const
                            ).map((st) => (
                              <button
                                key={st.id}
                                type="button"
                                onClick={() => {
                                  setExportStatusTarget(st.id);
                                  setIsExportStatusDropdownOpen(false);
                                }}
                                className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                                  exportStatusTarget === st.id
                                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 font-semibold"
                                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700/70"
                                }`}
                              >
                                <span>{st.label}</span>
                                {exportStatusTarget === st.id && (
                                  <Check className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                                )}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    {/* 4. Custom File Format Dropdown */}
                    <div className="relative">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1.5">
                        File Format
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsExportFormatDropdownOpen((prev) => !prev);
                          setIsExportDateDropdownOpen(false);
                          setIsExportBatchDropdownOpen(false);
                          setIsExportStatusDropdownOpen(false);
                        }}
                        className="w-full flex items-center justify-between gap-2 rounded-xl border border-slate-200/90 bg-slate-50/90 hover:bg-slate-100/80 hover:border-indigo-300 px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 transition-all cursor-pointer"
                      >
                        <span className="truncate">
                          {exportFileExtension === "xlsx"
                            ? "Excel Workbook (.xlsx)"
                            : exportFileExtension === "csv"
                            ? "CSV Spreadsheet (.csv)"
                            : exportFileExtension === "xls"
                            ? "Excel Legacy (.xls)"
                            : exportFileExtension === "json"
                            ? "Structured JSON (.json)"
                            : "Plain Text Report (.txt)"}
                        </span>
                        <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                      </button>

                      {isExportFormatDropdownOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsExportFormatDropdownOpen(false)}
                          />
                          <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-2xl dark:border-slate-700 dark:bg-slate-800 space-y-0.5 animate-dropdown-open">
                            {(
                              [
                                { ext: "xlsx", label: "Excel Workbook", badge: ".xlsx" },
                                { ext: "csv", label: "CSV Spreadsheet", badge: ".csv" },
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
                                className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                                  exportFileExtension === fmt.ext
                                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 font-semibold"
                                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700/70"
                                }`}
                              >
                                <span>{fmt.label}</span>
                                <span className="font-mono text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                                  {fmt.badge}
                                </span>
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {batchCsvExportMsg && (
                    <div className="rounded-xl border border-emerald-300 bg-emerald-50/70 dark:border-emerald-800 dark:bg-emerald-950/50 px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                      {batchCsvExportMsg}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleExportBatchCsv()}
                    disabled={totalCount === 0}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all cursor-pointer"
                  >
                    <Download className="h-4 w-4" />
                    <span>Export Filtered Data (.{exportFileExtension.toUpperCase()})</span>
                  </button>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleExportDeliveredOnly}
                      disabled={deliveredCount === 0}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-3 py-2.5 text-xs font-bold text-white cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Export Delivered ({deliveredCount})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setBackupError(null);
                        setBackupSuccessMsg(null);
                        setActiveMenu("settings");
                      }}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 px-3 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                    >
                      <Settings className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>Backup in Settings</span>
                    </button>
                  </div>
                </div>

                {/* Carrier Volume & Storage Analytics Card */}
                <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Carrier &amp; Storage Overview
                    </h3>
                    <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                      {dataAnalytics.formattedSize}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-indigo-200/60 bg-gradient-to-br from-indigo-500/10 to-transparent p-3.5 dark:border-indigo-800/50">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Total Records
                      </div>
                      <div className="mt-1 text-xl font-bold text-slate-900 dark:text-white tabular-nums">
                        {dataAnalytics.totalRecords}
                      </div>
                      <div className="mt-0.5 text-[11px] font-medium text-slate-500">
                        {dataAnalytics.importedRecords} batch · {dataAnalytics.directRecords} direct
                      </div>
                    </div>

                    <div className="rounded-2xl border border-emerald-200/60 bg-gradient-to-br from-emerald-500/10 to-transparent p-3.5 dark:border-emerald-800/50">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Active Batches
                      </div>
                      <div className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {dataAnalytics.batchesCount}
                      </div>
                      <div className="mt-0.5 text-[11px] font-medium text-slate-500">
                        {dataAnalytics.quotaPercent}% of 5 MB used
                      </div>
                    </div>
                  </div>

                  {/* Interactive Carrier Distribution */}
                  {dataAnalytics.carrierBreakdown.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Courier Partner Breakdown
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Click to filter
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
                        {dataAnalytics.carrierBreakdown.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setSearchFilter(c.name);
                              setActiveMenu("data");
                            }}
                            className="flex items-center justify-between text-xs bg-slate-50/80 hover:bg-indigo-50/60 dark:bg-slate-800/50 dark:hover:bg-indigo-950/40 px-3.5 py-2.5 rounded-xl border border-slate-200/80 hover:border-indigo-300 dark:border-slate-800 transition-all cursor-pointer text-left"
                          >
                            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                              {c.name}
                            </span>
                            <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 shrink-0 ml-2 tabular-nums">
                              {c.count} ({c.percent}%)
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* VIEW 4B: BULK LABEL PRINT & ENCRYPTED OFFICE MINI QR STUDIO  */}
          {/* ============================================================ */}
          {activeMenu === "labels" && (
            <BulkLabelPrintTool
              shipments={shipments}
              defaultOfficeName={
                (userProfile.companyName || userProfile.fullName || "TRACKFLOW DISPATCH").toUpperCase()
              }
              defaultOfficeHub={`${userProfile.hubCity} (${userProfile.hubPincode})`}
              defaultOfficePhone={userProfile.phone}
              onSimulateScanInIntake={(encryptedQrString) => {
                setIntakeError("");
                setIsCancelIntakeConfirmOpen(false);
                setIsCameraActive(false);
                setIsAddConsignmentsModalOpen(true);
                handleStageConsignment(encryptedQrString);
              }}
            />
          )}

          {/* ============================================================ */}
          {/* VIEW 5: SETTINGS & DATE-WISE BACKUP WORKSPACE                */}
          {/* ============================================================ */}
          {activeMenu === "settings" && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-5">
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-4 border border-slate-200/80 dark:border-slate-700">
                  <div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                      Automatic Background Sync
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isAutoCheckEnabled}
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

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 block">
                    Sync Frequency:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {[
                      { label: "5 mins", sec: 300 },
                      { label: "10 mins", sec: 600 },
                      { label: "15 mins", sec: 900 },
                      { label: "30 mins", sec: 1800 },
                      { label: "1 hour", sec: 3600 },
                    ].map((opt) => (
                      <button
                        key={opt.sec}
                        type="button"
                        onClick={() => handleChangeInterval(opt.sec)}
                        className={`rounded-xl border py-2.5 px-3 text-xs font-bold transition-all cursor-pointer ${
                          checkIntervalSec === opt.sec
                            ? "border-indigo-600 bg-indigo-600 text-white shadow-xs"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sliding Toggle Switches for Scan Customer Data QR, Auto-Next Scan Mode & No Rule */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-3.5 dark:border-slate-800">
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                        Scan Customer Data QR
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        1st scan AWB → 2nd scan Mini QR → auto next AWB
                      </span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isScanCustomerQrEnabled}
                      onClick={() => setIsScanCustomerQrEnabled((prev) => !prev)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        isScanCustomerQrEnabled ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-600"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${
                          isScanCustomerQrEnabled ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-3.5 dark:border-slate-800">
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                        Auto-Next Scan Mode
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Automatically clear input after staging
                      </span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isAutoNextEnabled}
                      onClick={() => setIsAutoNextEnabled((prev) => !prev)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        isAutoNextEnabled ? "bg-emerald-600" : "bg-slate-300 dark:bg-slate-600"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${
                          isAutoNextEnabled ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-3.5 dark:border-slate-800">
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                        No Rule
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Allow custom or unrecognized AWB formats
                      </span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isPasteAnywayEnabled}
                      onClick={() => setIsPasteAnywayEnabled((prev) => !prev)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        isPasteAnywayEnabled ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-600"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${
                          isPasteAnywayEnabled ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* ========================================================== */}
              {/* DATA BACKUP & RECOVERY (WITH DATE-WISE BACKUP IN SETTINGS) */}
              {/* ========================================================== */}
              <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400">
                      <Database className="h-4.5 w-4.5" />
                    </span>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        Data Backup &amp; Restore
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Export date-wise or full JSON backups and restore snapshots
                      </p>
                    </div>
                  </div>
                </div>

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

                {/* 1. Date-Wise Backup Export Card */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-800/40 space-y-4">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Download className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                          Date-Wise Backup Export (.json)
                        </h4>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Matched records for backup:{" "}
                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {backupScopedShipments.length}
                        </span>{" "}
                        of {shipments.length} consignments
                      </p>
                    </div>

                    {/* Date Scope Filter Pills + Custom Calendar Popover */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {(
                        [
                          { id: "all", label: "All Dates" },
                          { id: "today", label: "Today" },
                          { id: "yesterday", label: "Yesterday" },
                          { id: "last_7_days", label: "Last 7 Days" },
                        ] as const
                      ).map((bf) => (
                        <button
                          key={bf.id}
                          type="button"
                          onClick={() => {
                            setBackupDateFilter(bf.id);
                            setIsBackupCalendarOpen(false);
                          }}
                          className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                            backupDateFilter === bf.id
                              ? "bg-indigo-600 text-white shadow-2xs"
                              : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/80 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                          }`}
                        >
                          {bf.label}
                        </button>
                      ))}

                      {/* Custom Date Backup Button with Popover Calendar */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => {
                            setBackupDateFilter("custom");
                            setIsBackupCalendarOpen((prev) => !prev);
                          }}
                          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                            backupDateFilter === "custom"
                              ? "bg-indigo-600 text-white shadow-2xs"
                              : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/80 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                          }`}
                        >
                          <Calendar className="h-3.5 w-3.5 shrink-0" />
                          <span>
                            {backupDateFilter === "custom"
                              ? `${backupStartDate} → ${backupEndDate}`
                              : "Custom Date"}
                          </span>
                          <ChevronDown className="h-3.5 w-3.5 opacity-80 shrink-0" />
                        </button>

                        {isBackupCalendarOpen && (
                          <>
                            <div
                              className="fixed inset-0 z-40"
                              onClick={() => setIsBackupCalendarOpen(false)}
                            />
                            <div className="absolute right-0 top-full mt-2 z-50 w-72 sm:w-80 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xl dark:border-slate-700 dark:bg-slate-900 space-y-3 animate-calendar-open">
                              <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
                                <button
                                  type="button"
                                  onClick={() => setBackupCalendarPickingField("start")}
                                  className={`rounded-lg px-2 py-1.5 text-left transition-all cursor-pointer ${
                                    backupCalendarPickingField === "start"
                                      ? "bg-white dark:bg-slate-900 shadow-2xs text-indigo-600 dark:text-indigo-400"
                                      : "text-slate-600 dark:text-slate-400"
                                  }`}
                                >
                                  <div className="text-[9px] font-bold uppercase tracking-wider opacity-75">
                                    Start Date
                                  </div>
                                  <div className="font-mono text-[11px] font-bold">
                                    {backupStartDate}
                                  </div>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setBackupCalendarPickingField("end")}
                                  className={`rounded-lg px-2 py-1.5 text-left transition-all cursor-pointer ${
                                    backupCalendarPickingField === "end"
                                      ? "bg-white dark:bg-slate-900 shadow-2xs text-indigo-600 dark:text-indigo-400"
                                      : "text-slate-600 dark:text-slate-400"
                                  }`}
                                >
                                  <div className="text-[9px] font-bold uppercase tracking-wider opacity-75">
                                    End Date
                                  </div>
                                  <div className="font-mono text-[11px] font-bold">
                                    {backupEndDate}
                                  </div>
                                </button>
                              </div>

                              <div className="flex items-center justify-between px-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setCalendarMonthCursor((prev) => {
                                      const d = new Date(prev.year, prev.month - 1, 1);
                                      return { year: d.getFullYear(), month: d.getMonth() };
                                    })
                                  }
                                  className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                >
                                  <ChevronLeft className="h-4 w-4" />
                                </button>
                                <span className="text-xs font-bold text-slate-900 dark:text-white">
                                  {new Date(
                                    calendarMonthCursor.year,
                                    calendarMonthCursor.month,
                                    1
                                  ).toLocaleString("default", {
                                    month: "long",
                                    year: "numeric",
                                  })}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setCalendarMonthCursor((prev) => {
                                      const d = new Date(prev.year, prev.month + 1, 1);
                                      return { year: d.getFullYear(), month: d.getMonth() };
                                    })
                                  }
                                  className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                >
                                  <ChevronRight className="h-4 w-4" />
                                </button>
                              </div>

                              <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-400">
                                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                                  <span key={d}>{d}</span>
                                ))}
                              </div>

                              <div className="grid grid-cols-7 gap-1 text-center">
                                {buildCalendarDays(
                                  calendarMonthCursor.year,
                                  calendarMonthCursor.month
                                ).map((iso, idx) => {
                                  if (!iso) {
                                    return <div key={`b-empty-${idx}`} className="h-7" />;
                                  }
                                  const dayNum = parseInt(iso.split("-")[2], 10);
                                  const isStart = iso === backupStartDate;
                                  const isEnd = iso === backupEndDate;
                                  const isInRange =
                                    iso >= backupStartDate && iso <= backupEndDate;
                                  return (
                                    <button
                                      key={iso}
                                      type="button"
                                      onClick={() => {
                                        if (backupCalendarPickingField === "start") {
                                          setBackupStartDate(iso);
                                          if (iso > backupEndDate) {
                                            setBackupEndDate(iso);
                                          }
                                          setBackupCalendarPickingField("end");
                                        } else {
                                          if (iso < backupStartDate) {
                                            setBackupStartDate(iso);
                                          } else {
                                            setBackupEndDate(iso);
                                          }
                                          setBackupCalendarPickingField("start");
                                        }
                                      }}
                                      className={`h-7 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                                        isStart || isEnd
                                          ? "bg-indigo-600 text-white font-bold shadow-2xs"
                                          : isInRange
                                          ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300"
                                          : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                                      }`}
                                    >
                                      {dayNum}
                                    </button>
                                  );
                                })}
                              </div>

                              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const today = getTodayIso();
                                    setBackupStartDate(today);
                                    setBackupEndDate(today);
                                  }}
                                  className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                                >
                                  Select Today
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setIsBackupCalendarOpen(false)}
                                  className="rounded-lg bg-indigo-600 hover:bg-indigo-700 px-3 py-1 text-[11px] font-bold text-white cursor-pointer"
                                >
                                  Done
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleExportBackup}
                      disabled={backupScopedShipments.length === 0}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>
                        Download Backup ({backupScopedShipments.length})
                      </span>
                    </button>
                  </div>
                </div>

                {/* 2. Import Backup File for Review / Restore */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900/80 space-y-4">
                  <div className="flex items-center gap-2">
                    <FileJson className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      Import &amp; Restore Backup File (.json)
                    </h4>
                  </div>

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
                        <span className="font-bold text-slate-900 dark:text-white">
                          {backupReviewData.fileName}
                        </span>
                        <span>({backupReviewData.shipments.length} records)</span>
                      </div>
                    )}
                  </div>

                  {backupReviewData && (
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={handleMergeBackupIntoLive}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-3.5 py-2 text-xs font-bold text-white cursor-pointer shadow-2xs"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Merge into Live</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleRestoreBackupOverwrite}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/50 px-3.5 py-2 text-xs font-bold text-rose-700 dark:text-rose-300 cursor-pointer"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span>Replace Live Data</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsReviewingSeparately(true);
                            setActiveMenu("dashboard");
                          }}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span>Review in Dashboard</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setBackupReviewData(null)}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* VIEW 6: PROFILE & ACCOUNT                                    */}
          {/* ============================================================ */}
          {activeMenu === "profile" && (
            <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-5 animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white font-black text-lg shadow-sm">
                    {userProfile.fullName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase() || "TF"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-slate-900 dark:text-white">
                        {userProfile.fullName}
                      </h3>
                      <BadgeCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      {authUser?.loginId && (
                        <span className="rounded-md bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200/70 dark:border-indigo-800/60 px-2 py-0.5 font-mono text-[10px] font-bold text-indigo-600 dark:text-indigo-300">
                          {authUser.loginId}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {userProfile.role} · {userProfile.companyName}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {profileSavedMsg && (
                    <div className="rounded-xl bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/60 dark:border-emerald-800 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5" />
                      <span>{profileSavedMsg}</span>
                    </div>
                  )}
                  {onLogout && (
                    <button
                      type="button"
                      onClick={onLogout}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 px-3.5 py-2 text-xs font-bold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/60 dark:text-rose-300 transition-colors cursor-pointer"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Sign Out</span>
                    </button>
                  )}
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={userProfile.fullName}
                        onChange={(e) => setUserProfile({ ...userProfile, fullName: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="email"
                        value={userProfile.email}
                        onChange={(e) => setUserProfile({ ...userProfile, email: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                      Contact Mobile Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="tel"
                        value={userProfile.phone}
                        onChange={(e) => setUserProfile({ ...userProfile, phone: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 font-mono text-xs font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                      Organization / Company Name
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={userProfile.companyName}
                        onChange={(e) => setUserProfile({ ...userProfile, companyName: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                      Default Origin Hub / City
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={userProfile.hubCity}
                        onChange={(e) => setUserProfile({ ...userProfile, hubCity: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                      Default Hub Pincode
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={userProfile.hubPincode}
                        onChange={(e) => setUserProfile({ ...userProfile, hubPincode: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 font-mono text-xs font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 px-5 py-2.5 text-xs font-extrabold text-white shadow-xs transition-all cursor-pointer"
                  >
                    <Check className="h-4 w-4 stroke-[3]" />
                    <span>Save Profile</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* EDIT CUSTOMER NAME, NUMBER & PINCODE MODAL (CUSTOM DROPDOWN)   */}
      {/* ============================================================== */}
      {editingShipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
          <div className="fixed inset-0" onClick={() => setEditingShipment(null)} />
          <div
            className="relative z-10 w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Edit Customer &amp; Pincode
                </h3>
                <p className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {editingShipment.trackingNumber} · {editingShipment.courierName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingShipment(null)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Customer Name
                </label>
                <input
                  type="text"
                  value={editCustomerName}
                  onChange={(e) => setEditCustomerName(e.target.value)}
                  placeholder="Enter Customer Name..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Customer Number
                  </label>
                  <input
                    type="tel"
                    value={editCustomerPhone}
                    onChange={(e) => setEditCustomerPhone(e.target.value)}
                    placeholder="e.g. 9847011223"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Pincode
                  </label>
                  <input
                    type="text"
                    value={editPincode}
                    onChange={(e) => setEditPincode(e.target.value)}
                    placeholder="e.g. 680003"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Item Code
                  </label>
                  <input
                    type="text"
                    value={editItemCode}
                    onChange={(e) => setEditItemCode(e.target.value)}
                    placeholder="e.g. ITM-1042"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="relative">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Status
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsEditStatusDropdownOpen((prev) => !prev)}
                    className="w-full flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 hover:border-indigo-300 px-3 py-2 text-xs font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white cursor-pointer"
                  >
                    <div className="flex items-center gap-2 min-w-0 pl-0.5">
                      <span
                        className={`h-2 w-2 rounded-full shrink-0 ${
                          editStatus === "delivered"
                            ? "bg-emerald-500"
                            : editStatus === "out_for_delivery"
                            ? "bg-amber-500"
                            : editStatus === "returned"
                            ? "bg-rose-500"
                            : editStatus === "booked"
                            ? "bg-violet-500"
                            : "bg-sky-500"
                        }`}
                      />
                      <span className="truncate">
                        {editStatus === "delivered"
                          ? "Delivered"
                          : editStatus === "out_for_delivery"
                          ? "Out for Delivery"
                          : editStatus === "returned"
                          ? "Returned (RTO)"
                          : editStatus === "booked"
                          ? "Booked"
                          : "In Transit"}
                      </span>
                    </div>
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  </button>

                  {isEditStatusDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsEditStatusDropdownOpen(false)}
                      />
                      <div className="absolute right-0 left-0 top-full mt-1 z-50 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl dark:border-slate-700 dark:bg-slate-800 space-y-0.5 animate-dropdown-open">
                        {(
                          [
                            { value: "booked", label: "Booked", dot: "bg-violet-500" },
                            { value: "in_transit", label: "In Transit", dot: "bg-sky-500" },
                            { value: "out_for_delivery", label: "Out for Delivery", dot: "bg-amber-500" },
                            { value: "delivered", label: "Delivered", dot: "bg-emerald-500" },
                            { value: "returned", label: "Returned (RTO)", dot: "bg-rose-500" },
                          ] as const
                        ).map((st) => (
                          <button
                            key={st.value}
                            type="button"
                            onClick={() => {
                              setEditStatus(st.value);
                              setIsEditStatusDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                              editStatus === st.value
                                ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 font-bold"
                                : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700/70"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className={`h-2 w-2 rounded-full ${st.dot}`} />
                              <span>{st.label}</span>
                            </div>
                            {editStatus === st.value && (
                              <Check className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                            )}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEditingShipment(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEditShipment}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-xs font-extrabold text-white cursor-pointer"
              >
                <Check className="h-3.5 w-3.5 stroke-[3]" />
                <span>Save</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* CUSTOMER & CONSIGNMENT FULL DETAILS MODAL (ROW CLICK VIEW)      */}
      {/* ============================================================== */}
      {selectedDetailShipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
          <div className="fixed inset-0" onClick={() => setSelectedDetailShipment(null)} />
          <div
            className="relative z-10 w-full max-w-xl rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Attractive Top Gradient Header (All details shown in full without ellipsis) */}
            <div className="relative bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-6 py-5 text-white overflow-hidden">
              <div className="pointer-events-none absolute -top-12 -right-12 h-36 w-36 rounded-full bg-indigo-500/20 blur-2xl" />
              <div className="relative flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-200 border border-white/10 break-words">
                      {selectedDetailShipment.courierName}
                    </span>
                    {selectedDetailShipment.batchName && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-indigo-500/20 px-2 py-0.5 text-[10px] font-medium text-indigo-200 border border-indigo-400/20 break-words">
                        <FolderKanban className="h-3 w-3 shrink-0" />
                        <span className="break-words">{selectedDetailShipment.batchName}</span>
                      </span>
                    )}
                    {selectedDetailShipment.itemCode && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-mono font-semibold text-emerald-200 border border-emerald-400/25 break-words">
                        <Tag className="h-3 w-3 shrink-0" />
                        <span>{selectedDetailShipment.itemCode}</span>
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-mono text-lg sm:text-xl font-bold tracking-wider text-white break-all">
                      {selectedDetailShipment.trackingNumber}
                    </h3>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(selectedDetailShipment.id, selectedDetailShipment.trackingNumber)
                      }
                      className="rounded-lg bg-white/10 hover:bg-white/20 p-1.5 text-slate-200 transition-colors cursor-pointer shrink-0"
                      title="Copy Tracking Number"
                    >
                      {copiedId === selectedDetailShipment.id ? (
                        <CheckCheck className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedDetailShipment(null)}
                  className="rounded-xl bg-white/10 hover:bg-white/20 p-1.5 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Status & Route Progress Strip inside Header */}
              <div className="relative mt-4 pt-3.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ${
                      selectedDetailShipment.status === "delivered"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
                        : selectedDetailShipment.status === "out_for_delivery"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-400/30"
                        : selectedDetailShipment.status === "returned"
                        ? "bg-rose-500/20 text-rose-300 border border-rose-400/30"
                        : selectedDetailShipment.status === "booked"
                        ? "bg-violet-500/20 text-violet-300 border border-violet-400/30"
                        : "bg-sky-500/20 text-sky-300 border border-sky-400/30"
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current shrink-0" />
                    <span className="break-words">{selectedDetailShipment.statusText}</span>
                  </span>
                </div>
                <div className="text-[11px] text-slate-300 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-indigo-300 shrink-0" />
                  <span className="break-words">Updated: {selectedDetailShipment.lastUpdated}</span>
                </div>
              </div>
            </div>

            {/* Body: Customer Info + Route & Consignment Metadata (Full text, no ellipsis) */}
            <div className="p-5 sm:p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Customer Details Card */}
              <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-800/40 p-4">
                <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-3 flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5" />
                  <span>Customer Details</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="rounded-xl bg-white dark:bg-slate-900 p-3 border border-slate-200/70 dark:border-slate-800">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Customer Name
                    </div>
                    <div className="mt-1 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white break-words">
                      {selectedDetailShipment.recipientName || "Not specified"}
                    </div>
                  </div>
                  <div className="rounded-xl bg-white dark:bg-slate-900 p-3 border border-slate-200/70 dark:border-slate-800">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Phone Number
                    </div>
                    <div className="mt-1 font-mono text-xs sm:text-sm font-semibold text-slate-900 dark:text-white break-all">
                      {selectedDetailShipment.customerPhone || "Not specified"}
                    </div>
                  </div>
                  <div className="rounded-xl bg-white dark:bg-slate-900 p-3 border border-slate-200/70 dark:border-slate-800">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Delivery Pincode
                    </div>
                    <div className="mt-1 font-mono text-xs sm:text-sm font-semibold text-indigo-600 dark:text-indigo-400 break-all">
                      {selectedDetailShipment.pincode || "Not specified"}
                    </div>
                  </div>
                  <div className="rounded-xl bg-white dark:bg-slate-900 p-3 border border-slate-200/70 dark:border-slate-800">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Item Code
                    </div>
                    <div className="mt-1 font-mono text-xs sm:text-sm font-semibold text-slate-900 dark:text-white break-all">
                      {selectedDetailShipment.itemCode || "Not specified"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Route & Logistics Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Origin Hub
                  </div>
                  <div className="mt-1 text-xs font-semibold text-slate-800 dark:text-slate-200 break-words">
                    {selectedDetailShipment.origin}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Destination
                  </div>
                  <div className="mt-1 text-xs font-semibold text-slate-800 dark:text-slate-200 break-words">
                    {selectedDetailShipment.destination}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Last Location
                  </div>
                  <div className="mt-1 text-xs font-semibold text-slate-800 dark:text-slate-200 break-words">
                    {selectedDetailShipment.lastLocation}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Package Type
                  </div>
                  <div className="mt-1 text-xs font-semibold text-slate-800 dark:text-slate-200 break-words">
                    {selectedDetailShipment.articleType} ({selectedDetailShipment.weight})
                  </div>
                </div>
              </div>

              {selectedDetailShipment.returnReason && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50/70 dark:border-rose-900/50 dark:bg-rose-950/40 p-3.5 flex items-center gap-2.5 text-xs text-rose-800 dark:text-rose-200">
                  <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span className="break-words">
                    <strong className="font-semibold">Return Reason:</strong>{" "}
                    {selectedDetailShipment.returnReason}
                  </span>
                </div>
              )}
            </div>

            {/* Footer Action Bar */}
            <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/80 px-5 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const target = selectedDetailShipment;
                    setSelectedDetailShipment(null);
                    handleOpenEditShipment(target);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Edit Details</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const idToRemove = selectedDetailShipment.id;
                    setSelectedDetailShipment(null);
                    setSelectedShipmentIds([idToRemove]);
                    setIsBulkDeleteModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200/80 bg-rose-50/60 hover:bg-rose-100/70 px-3 py-2 text-xs font-semibold text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 cursor-pointer transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const target = selectedDetailShipment;
                    setSelectedDetailShipment(null);
                    onOpenTrackingResult(target.trackingNumber, target.courierId);
                  }}
                  className="inline-flex items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-xs font-semibold text-white shadow-xs cursor-pointer transition-colors"
                >
                  <span>Track</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* DELETE BATCH CONFIRMATION MODAL                                */}
      {/* ============================================================== */}
      {batchPendingDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
          <div className="fixed inset-0" onClick={() => setBatchPendingDeleteId(null)} />
          <div
            className="relative z-10 w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950/80 dark:text-rose-400 shrink-0">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Delete Batch?
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Confirm permanent removal of this batch
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBatchPendingDeleteId(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {(() => {
              const targetBatch = uniqueBatches.find((b) => b.id === batchPendingDeleteId);
              return (
                <div className="rounded-2xl border border-rose-200/80 bg-rose-50/60 dark:border-rose-900/50 dark:bg-rose-950/30 p-3.5 text-xs text-slate-700 dark:text-slate-200">
                  Are you sure you want to delete batch{" "}
                  <span className="font-bold text-slate-900 dark:text-white">
                    &ldquo;{targetBatch?.name || batchPendingDeleteId}&rdquo;
                  </span>{" "}
                  and all{" "}
                  <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                    {targetBatch?.count ?? 0}
                  </span>{" "}
                  consignments inside it?
                </div>
              );
            })()}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setBatchPendingDeleteId(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteBatch(batchPendingDeleteId)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-2 text-xs font-semibold text-white shadow-xs cursor-pointer transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Batch</span>
              </button>
            </div>
          </div>
        </div>
      )}

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

                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Scan Customer Data QR ON/OFF Toggle */}
                    <button
                      type="button"
                      onClick={() => setIsScanCustomerQrEnabled((prev) => !prev)}
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-[11px] font-extrabold transition-colors cursor-pointer ${
                        isScanCustomerQrEnabled
                          ? "border-indigo-500/60 bg-indigo-500/15 text-indigo-300"
                          : "border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700"
                      }`}
                      title="Toggle 2-step scan: 1st scan tracking number -> 2nd scan encrypted customer Mini QR -> auto next AWB"
                    >
                      <QrCode className="h-3.5 w-3.5" />
                      <span>Scan Customer Data:</span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-black uppercase ${
                          isScanCustomerQrEnabled
                            ? "bg-indigo-500 text-white"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {isScanCustomerQrEnabled ? "ON" : "OFF"}
                      </span>
                    </button>

                    {/* Fallback 'No Rule' ON/OFF Toggle Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsPasteAnywayEnabled((prev) => {
                          const next = !prev;
                          if (next) {
                            setIntakeError("");
                            setFlaggedInvalidCode(null);
                          }
                          return next;
                        });
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-[11px] font-extrabold transition-colors cursor-pointer ${
                        isPasteAnywayEnabled
                          ? "border-amber-500/60 bg-amber-500/15 text-amber-300"
                          : "border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700"
                      }`}
                    >
                      <span>No Rule:</span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-black uppercase ${
                          isPasteAnywayEnabled
                            ? "bg-amber-500 text-slate-950"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {isPasteAnywayEnabled ? "ON" : "OFF"}
                      </span>
                    </button>

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
                  {/* 2-Step Customer QR Scan Step Indicator Banner in Camera View */}
                  {isScanCustomerQrEnabled && (
                    <div
                      className={`rounded-xl border px-3.5 py-2.5 text-xs flex flex-wrap items-center justify-between gap-2 ${
                        customerQrScanStep.step === "awaiting_customer_qr"
                          ? "border-indigo-500 bg-indigo-950/80 text-indigo-200"
                          : "border-slate-800 bg-slate-900/90 text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-md px-2 py-0.5 font-mono text-[10px] font-black uppercase ${
                            customerQrScanStep.step === "awaiting_customer_qr"
                              ? "bg-indigo-500 text-white animate-pulse"
                              : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          }`}
                        >
                          {customerQrScanStep.step === "awaiting_customer_qr"
                            ? "Step 2 / 2 • Scan Customer Mini QR"
                            : "Step 1 / 2 • Scan Tracking Number"}
                        </span>
                        <span className="font-semibold">
                          {customerQrScanStep.step === "awaiting_customer_qr"
                            ? `AWB ${customerQrScanStep.pendingAwb} locked (${customerQrScanStep.pendingCourierName}). Now scan Encrypted Customer Mini QR on label!`
                            : "1st scan Tracking Number (AWB), then scanner auto-switches to scan Customer Data Mini QR."}
                        </span>
                      </div>
                      {customerQrScanStep.step === "awaiting_customer_qr" && (
                        <button
                          type="button"
                          onClick={() => {
                            const pending = customerQrScanStep.pendingAwb;
                            const courier = customerQrScanStep.pendingCourierId;
                            setCustomerQrScanStep({
                              step: "awaiting_awb",
                              pendingAwb: "",
                              pendingCourierId: "",
                              pendingCourierName: "",
                            });
                            handleStageConsignment(
                              pending,
                              courier || undefined,
                              undefined,
                              undefined,
                              undefined,
                              undefined,
                              "camera",
                              true
                            );
                          }}
                          className="rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 px-2.5 py-1 text-[11px] font-bold text-white cursor-pointer shrink-0"
                        >
                          Skip Customer QR &amp; Stage AWB →
                        </button>
                      )}
                    </div>
                  )}

                  {cameraError && (
                    <div className="text-xs text-amber-300 bg-amber-950/70 p-3 rounded-xl border border-amber-800/80">
                      {cameraError}
                    </div>
                  )}

                  {intakeError && (
                    <div className="text-xs text-rose-300 bg-rose-950/70 p-3 rounded-xl border border-rose-800/80 flex flex-wrap items-center justify-between gap-2">
                      <span>{intakeError}</span>
                      {flaggedInvalidCode && (
                        <button
                          type="button"
                          onClick={() =>
                            handleStageConsignment(
                              flaggedInvalidCode,
                              undefined,
                              undefined,
                              undefined,
                              undefined,
                              undefined,
                              "camera",
                              true
                            )
                          }
                          className="rounded-lg bg-amber-500 hover:bg-amber-400 px-2.5 py-1 text-[11px] font-black text-slate-950 cursor-pointer shrink-0"
                        >
                          No Rule ({flaggedInvalidCode})
                        </button>
                      )}
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
                  {/* Intake Toolbar: Scan Customer Data QR Toggle, Auto-Next Toggle & No Rule Toggle */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-3 sm:p-3.5 border border-slate-200 dark:border-slate-700">
                    {/* Scan Customer Data QR Switch */}
                    <div className="flex items-center gap-2.5">
                      <QrCode className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          Scan Customer Data:
                        </span>
                        <span
                          className={`rounded-md px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                            isScanCustomerQrEnabled
                              ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
                              : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {isScanCustomerQrEnabled ? "ON" : "OFF"}
                        </span>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isScanCustomerQrEnabled}
                        onClick={() => setIsScanCustomerQrEnabled((prev) => !prev)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          isScanCustomerQrEnabled ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-600"
                        }`}
                        title="1st scan tracking number -> 2nd scan encrypted customer Mini QR -> auto next tracking number"
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            isScanCustomerQrEnabled ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                      {/* Auto-Next Switch */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          Auto-Next:
                        </span>
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

                      {/* Fallback 'No Rule' Sliding Toggle Switch */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          No Rule:
                        </span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={isPasteAnywayEnabled}
                          onClick={() => {
                            setIsPasteAnywayEnabled((prev) => {
                              const next = !prev;
                              if (next) {
                                setIntakeError("");
                                setFlaggedInvalidCode(null);
                              }
                              return next;
                            });
                          }}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            isPasteAnywayEnabled ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-600"
                          }`}
                          title="Toggle No Rule mode for unrecognized consignment formats"
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                              isPasteAnywayEnabled ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 2-Step Automated Customer QR Scan Status Banner */}
                  {isScanCustomerQrEnabled && (
                    <div
                      className={`rounded-2xl border px-4 py-2.5 text-xs flex flex-wrap items-center justify-between gap-2 ${
                        customerQrScanStep.step === "awaiting_customer_qr"
                          ? "border-indigo-500 bg-indigo-50/90 text-indigo-950 dark:border-indigo-500 dark:bg-indigo-950/60 dark:text-indigo-200"
                          : "border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-md px-2 py-0.5 font-mono text-[10px] font-black uppercase ${
                            customerQrScanStep.step === "awaiting_customer_qr"
                              ? "bg-indigo-600 text-white animate-pulse"
                              : "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                          }`}
                        >
                          {customerQrScanStep.step === "awaiting_customer_qr"
                            ? "Step 2 / 2 • Ready for Customer Mini QR"
                            : "Step 1 / 2 • Scan Tracking Number First"}
                        </span>
                        <span className="font-semibold">
                          {customerQrScanStep.step === "awaiting_customer_qr"
                            ? `AWB #${customerQrScanStep.pendingAwb} (${customerQrScanStep.pendingCourierName}) locked! Scan or paste Encrypted Customer Mini QR to auto-fill & advance.`
                            : "1st scan Tracking Number → auto-ready for Customer Data Mini QR → auto-next to next Customer Tracking Number."}
                        </span>
                      </div>
                      {customerQrScanStep.step === "awaiting_customer_qr" && (
                        <button
                          type="button"
                          onClick={() => {
                            const pending = customerQrScanStep.pendingAwb;
                            const courier = customerQrScanStep.pendingCourierId;
                            setCustomerQrScanStep({
                              step: "awaiting_awb",
                              pendingAwb: "",
                              pendingCourierId: "",
                              pendingCourierName: "",
                            });
                            handleStageConsignment(pending, courier || undefined);
                          }}
                          className="rounded-lg bg-indigo-600 hover:bg-indigo-700 px-2.5 py-1 text-[11px] font-bold text-white cursor-pointer shrink-0"
                        >
                          Stage Without Customer QR →
                        </button>
                      )}
                    </div>
                  )}

                  {/* Unified Typing, Hardware Barcode Reader & Convenient Mobile-Responsive Camera Scan Field */}
                  <div className="rounded-2xl border-2 border-indigo-500/60 bg-white p-4 sm:p-5 dark:border-indigo-500/50 dark:bg-slate-800/70 shadow-xs space-y-3.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                        {customerQrScanStep.step === "awaiting_customer_qr"
                          ? `Scan Encrypted Customer Mini QR (For AWB #${customerQrScanStep.pendingAwb}):`
                          : "Consignment / AWB Number (or Encrypted Mini QR):"}
                      </label>
                      {intakeAwb.trim() && (() => {
                        const qrCheck = decryptCustomerMiniQR(intakeAwb);
                        if (qrCheck.isCustomerQR) {
                          return (
                            <span className="rounded-md bg-indigo-100 dark:bg-indigo-950/80 px-2 py-0.5 text-[10px] font-extrabold text-indigo-700 dark:text-indigo-300">
                              {qrCheck.isValid
                                ? `✓ Encrypted Customer Mini QR (${qrCheck.data?.customerName})`
                                : "⚠ Invalid Customer Mini QR"}
                            </span>
                          );
                        }
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
                            const rawVal = e.target.value;
                            const val = rawVal.trim().toUpperCase().startsWith("TFQR1:")
                              ? rawVal.trim()
                              : rawVal.toUpperCase();
                            setIntakeAwb(val);
                            setIntakeError("");
                            const qrRes = decryptCustomerMiniQR(val);
                            if (qrRes.isCustomerQR && qrRes.isValid && qrRes.data) {
                              setIntakeRecipient(qrRes.data.customerName);
                              setIntakePhone(qrRes.data.customerPhone);
                              setIntakePincode(qrRes.data.pincode);
                              setIntakeItemCode(qrRes.data.itemCode);
                              return;
                            }
                            const identified = identifyAndValidateConsignment(val);
                            if (identified.courier) {
                              setIntakeCourier(identified.courier.id);
                            }
                          }}
                          onKeyDown={handleIntakeKeyDown}
                          placeholder={
                            customerQrScanStep.step === "awaiting_customer_qr"
                              ? "Scan Encrypted Customer Mini QR (TFQR1:...)..."
                              : "Enter Tracking Number or Scan Barcode / Mini QR"
                          }
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-mono text-sm font-semibold tracking-wider text-slate-900 focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                      </div>

                      {/* Convenient & Mobile-Responsive Add + Scan Action Buttons */}
                      <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStageConsignment(intakeAwb)}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 text-xs font-extrabold text-white shadow-xs transition-colors cursor-pointer"
                        >
                          <Plus className="h-4 w-4 stroke-[2.5]" />
                          <span>Add</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleOpenSeparateCameraPage}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:border-indigo-500/40 dark:bg-indigo-950/70 dark:hover:bg-indigo-900/70 dark:text-indigo-300 px-4 py-2.5 text-xs font-extrabold shadow-xs transition-all cursor-pointer"
                          title="Open camera scanner (/scan)"
                        >
                          <ScanLine className="h-4 w-4 stroke-[2.5]" />
                          <span>Scan</span>
                        </button>

                        {!isAutoNextEnabled && recentStagedCode && (
                          <button
                            type="button"
                            onClick={() => {
                              setIntakeAwb("");
                              setRecentStagedCode(null);
                              intakeInputRef.current?.focus();
                            }}
                            className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2.5 text-xs font-bold text-white shadow-xs shrink-0 cursor-pointer animate-in fade-in"
                          >
                            <span>Next ID →</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Inline Options Strip: Customer Name, Customer Number (+91/10-digit validated), Pincode (6-digit validated), Carrier, Item Code, Status */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1 text-xs">
                      {/* Customer Name */}
                      <input
                        type="text"
                        placeholder="Customer Name (e.g. Ananya Menon)"
                        value={intakeRecipient}
                        onChange={(e) => setIntakeRecipient(e.target.value)}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
                      />

                      {/* Customer Number (with live Indian +91 / 10-digit validation) */}
                      <div className="relative flex items-center">
                        <input
                          type="tel"
                          placeholder="Indian Mobile (+91 or 10-digit)"
                          value={intakePhone}
                          onChange={(e) => {
                            setIntakePhone(e.target.value.replace(/[^0-9+\-\s]/g, "").slice(0, 16));
                            setIntakeError("");
                          }}
                          className={`w-full rounded-xl border px-3 pr-16 py-2 text-xs font-mono focus:outline-none ${
                            intakePhone.trim()
                              ? validateIndianPhone(intakePhone).isValid
                                ? "border-emerald-400 bg-emerald-50/30 text-slate-900 dark:border-emerald-700 dark:bg-emerald-950/20 dark:text-slate-200"
                                : "border-rose-400 bg-rose-50/30 text-slate-900 dark:border-rose-700 dark:bg-rose-950/20 dark:text-slate-200"
                              : "border-slate-200 bg-slate-50 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                          }`}
                        />
                        {intakePhone.trim() && (
                          <span
                            className={`absolute right-2 rounded px-1.5 py-0.5 text-[9px] font-bold pointer-events-none ${
                              validateIndianPhone(intakePhone).isValid
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                            }`}
                          >
                            {validateIndianPhone(intakePhone).isValid ? "✓ IN OK" : "Invalid"}
                          </span>
                        )}
                      </div>

                      {/* Pincode (with live 6-digit Indian PIN validation) */}
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          placeholder="Pincode (6-digit e.g. 682001)"
                          value={intakePincode}
                          onChange={(e) => {
                            setIntakePincode(e.target.value.replace(/\D/g, "").slice(0, 6));
                            setIntakeError("");
                          }}
                          className={`w-full rounded-xl border px-3 pr-16 py-2 text-xs font-mono font-bold focus:outline-none ${
                            intakePincode.trim()
                              ? validateIndianPincode(intakePincode).isValid
                                ? "border-emerald-400 bg-emerald-50/30 text-slate-900 dark:border-emerald-700 dark:bg-emerald-950/20 dark:text-slate-200"
                                : "border-rose-400 bg-rose-50/30 text-slate-900 dark:border-rose-700 dark:bg-rose-950/20 dark:text-slate-200"
                              : "border-slate-200 bg-slate-50 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                          }`}
                        />
                        {intakePincode.trim() && (
                          <span
                            className={`absolute right-2 rounded px-1.5 py-0.5 text-[9px] font-bold pointer-events-none ${
                              validateIndianPincode(intakePincode).isValid
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                            }`}
                          >
                            {validateIndianPincode(intakePincode).isValid ? "✓ 6D PIN" : "Bad PIN"}
                          </span>
                        )}
                      </div>

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
                            <div className="absolute left-0 top-full mt-1 z-50 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800 animate-dropdown-open">
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

                      {/* Item Code (replaces Destination Hub / City) */}
                      <input
                        type="text"
                        placeholder="Item Code (e.g. ITM-1042)"
                        value={intakeItemCode}
                        onChange={(e) => setIntakeItemCode(e.target.value)}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
                      />

                      {/* Custom Styled Status Dropdown (with unclipped status dot before Booked, etc.) */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => {
                            setIsIntakeStatusDropdownOpen(!isIntakeStatusDropdownOpen);
                            setIsIntakeCourierDropdownOpen(false);
                          }}
                          className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
                        >
                          <div className="flex items-center gap-2 min-w-0 pl-1">
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
                            <div className="absolute left-0 right-0 sm:right-auto top-full mt-1 z-50 sm:w-56 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-800 animate-dropdown-open">
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

                    {/* Error Banner with Fallback 'No Rule' Action */}
                    {intakeError && (
                      <div className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs font-semibold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/60 dark:text-rose-300 flex flex-wrap items-center justify-between gap-2">
                        <span>{intakeError}</span>
                        {flaggedInvalidCode && (
                          <button
                            type="button"
                            onClick={() =>
                              handleStageConsignment(
                                flaggedInvalidCode,
                                undefined,
                                undefined,
                                undefined,
                                undefined,
                                undefined,
                                "manual",
                                true
                              )
                            }
                            className="inline-flex items-center gap-1 rounded-lg bg-amber-500 hover:bg-amber-400 px-2.5 py-1 text-[11px] font-black text-slate-950 shadow-2xs cursor-pointer shrink-0"
                          >
                            <Check className="h-3 w-3 stroke-[3]" />
                            <span>No Rule ({flaggedInvalidCode})</span>
                          </button>
                        )}
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
                      <div className="overflow-x-auto max-h-64 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800">
                        <table className="w-full text-left text-xs min-w-[820px]">
                          <thead className="bg-slate-50 dark:bg-slate-800 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                            <tr>
                              <th className="py-2.5 px-3">AWB / Consignment</th>
                              <th className="py-2.5 px-3">Customer Name</th>
                              <th className="py-2.5 px-3">Customer Number</th>
                              <th className="py-2.5 px-3">Pincode</th>
                              <th className="py-2.5 px-3">Item Code</th>
                              <th className="py-2.5 px-3">Carrier Partner</th>
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

                                {/* Customer Name (Editable) */}
                                <td className="py-2.5 px-3 font-sans">
                                  <input
                                    type="text"
                                    placeholder="Customer Name"
                                    value={item.recipientName || ""}
                                    onChange={(e) =>
                                      handleUpdateStagedCustomerField(item.id, "recipientName", e.target.value)
                                    }
                                    className="w-28 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                  />
                                </td>

                                {/* Customer Number (Editable) */}
                                <td className="py-2.5 px-3 font-mono">
                                  <input
                                    type="tel"
                                    placeholder="Mobile Number"
                                    value={item.customerPhone || ""}
                                    onChange={(e) =>
                                      handleUpdateStagedCustomerField(
                                        item.id,
                                        "customerPhone",
                                        e.target.value.replace(/[^0-9+\-\s]/g, "").slice(0, 15)
                                      )
                                    }
                                    className="w-28 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-mono text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                  />
                                </td>

                                {/* Pincode (Editable) */}
                                <td className="py-2.5 px-3 font-mono">
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={6}
                                    placeholder="Pincode"
                                    value={item.pincode || ""}
                                    onChange={(e) =>
                                      handleUpdateStagedCustomerField(
                                        item.id,
                                        "pincode",
                                        e.target.value.replace(/\D/g, "").slice(0, 6)
                                      )
                                    }
                                    className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-mono font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                  />
                                </td>

                                {/* Item Code (Editable) */}
                                <td className="py-2.5 px-3 font-mono">
                                  <input
                                    type="text"
                                    placeholder="Item Code"
                                    value={item.itemCode || ""}
                                    onChange={(e) =>
                                      handleUpdateStagedCustomerField(
                                        item.id,
                                        "itemCode",
                                        e.target.value
                                      )
                                    }
                                    className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-mono font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                  />
                                </td>

                                {/* Carrier Selector (Custom SaaS Dropdown) */}
                                <td className="py-2.5 px-3 font-sans">
                                  <div className="relative inline-block">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setOpenRowDropdown((prev) =>
                                          prev?.id === item.id && prev.field === "courier"
                                            ? null
                                            : { id: item.id, field: "courier" }
                                        )
                                      }
                                      className="inline-flex items-center justify-between gap-2 min-w-[130px] rounded-xl border border-slate-200/90 bg-slate-50/90 hover:border-indigo-300 px-2.5 py-1.5 text-[11px] font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                                    >
                                      <span className="truncate">{item.courierName}</span>
                                      <ChevronDown className="h-3 w-3 text-slate-400 shrink-0" />
                                    </button>
                                    {openRowDropdown?.id === item.id &&
                                      openRowDropdown.field === "courier" && (
                                        <>
                                          <div
                                            className="fixed inset-0 z-40"
                                            onClick={() => setOpenRowDropdown(null)}
                                          />
                                          <div className="absolute left-0 top-full mt-1 z-50 w-52 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-800 animate-dropdown-open">
                                            {COURIER_LIST.map((c) => (
                                              <button
                                                key={c.id}
                                                type="button"
                                                onClick={() => {
                                                  handleUpdateStagedCourier(item.id, c.id);
                                                  setOpenRowDropdown(null);
                                                }}
                                                className={`w-full text-left rounded-lg px-2.5 py-1.5 text-[11px] font-medium flex items-center justify-between cursor-pointer ${
                                                  item.courierId === c.id
                                                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 font-semibold"
                                                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                                                }`}
                                              >
                                                <span className="truncate">{c.name}</span>
                                                {item.courierId === c.id && (
                                                  <Check className="h-3 w-3 text-indigo-600 dark:text-indigo-400 shrink-0" />
                                                )}
                                              </button>
                                            ))}
                                          </div>
                                        </>
                                      )}
                                  </div>
                                </td>

                                {/* Editable Logical Status Selector (Custom SaaS Dropdown) */}
                                <td className="py-2.5 px-3 font-sans">
                                  <div className="relative inline-block">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setOpenRowDropdown((prev) =>
                                          prev?.id === item.id && prev.field === "status"
                                            ? null
                                            : { id: item.id, field: "status" }
                                        )
                                      }
                                      className="inline-flex items-center justify-between gap-2 min-w-[125px] rounded-xl border border-slate-200/90 bg-slate-50/90 hover:border-indigo-300 px-2.5 py-1.5 text-[11px] font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                                    >
                                      <span className="truncate">
                                        {item.status === "booked"
                                          ? "Booked"
                                          : item.status === "in_transit"
                                          ? "In Transit"
                                          : item.status === "out_for_delivery"
                                          ? "Out for Delivery"
                                          : item.status === "delivered"
                                          ? "Delivered"
                                          : "Returned (RTO)"}
                                      </span>
                                      <ChevronDown className="h-3 w-3 text-slate-400 shrink-0" />
                                    </button>
                                    {openRowDropdown?.id === item.id &&
                                      openRowDropdown.field === "status" && (
                                        <>
                                          <div
                                            className="fixed inset-0 z-40"
                                            onClick={() => setOpenRowDropdown(null)}
                                          />
                                          <div className="absolute right-0 top-full mt-1 z-50 w-44 rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-800 animate-dropdown-open">
                                            {(
                                              [
                                                { value: "booked", label: "Booked" },
                                                { value: "in_transit", label: "In Transit" },
                                                { value: "out_for_delivery", label: "Out for Delivery" },
                                                { value: "delivered", label: "Delivered" },
                                                { value: "returned", label: "Returned (RTO)" },
                                              ] as const
                                            ).map((st) => (
                                              <button
                                                key={st.value}
                                                type="button"
                                                onClick={() => {
                                                  handleUpdateStagedStatus(item.id, st.value);
                                                  setOpenRowDropdown(null);
                                                }}
                                                className={`w-full text-left rounded-lg px-2.5 py-1.5 text-[11px] font-medium flex items-center justify-between cursor-pointer ${
                                                  item.status === st.value
                                                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 font-semibold"
                                                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                                                }`}
                                              >
                                                <span>{st.label}</span>
                                                {item.status === st.value && (
                                                  <Check className="h-3 w-3 text-indigo-600 dark:text-indigo-400 shrink-0" />
                                                )}
                                              </button>
                                            ))}
                                          </div>
                                        </>
                                      )}
                                  </div>
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

                  <div className="flex items-center gap-2.5 ml-auto">
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
                        Save &amp; Add ({stagedConsignments.length})
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
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {importSuccessState
                      ? "Successfully Imported!"
                      : previewShipments
                      ? "Review Import"
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
                                      <div className="relative inline-block">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setOpenRowDropdown((prev) =>
                                              prev?.id === p.id && prev.field === "courier"
                                                ? null
                                                : { id: p.id, field: "courier" }
                                            )
                                          }
                                          className="inline-flex items-center justify-between gap-2 min-w-[130px] rounded-xl border border-slate-200/90 bg-slate-50/90 hover:border-indigo-300 px-2.5 py-1.5 text-[11px] font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                                        >
                                          <span className="truncate">{p.courierName}</span>
                                          <ChevronDown className="h-3 w-3 text-slate-400 shrink-0" />
                                        </button>
                                        {openRowDropdown?.id === p.id &&
                                          openRowDropdown.field === "courier" && (
                                            <>
                                              <div
                                                className="fixed inset-0 z-40"
                                                onClick={() => setOpenRowDropdown(null)}
                                              />
                                              <div className="absolute left-0 top-full mt-1 z-50 w-52 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-800 animate-dropdown-open">
                                                {COURIER_LIST.map((c) => (
                                                  <button
                                                    key={c.id}
                                                    type="button"
                                                    onClick={() => {
                                                      handleUpdatePreviewCourier(p.id, c.id);
                                                      setOpenRowDropdown(null);
                                                    }}
                                                    className={`w-full text-left rounded-lg px-2.5 py-1.5 text-[11px] font-medium flex items-center justify-between cursor-pointer ${
                                                      p.courierId === c.id
                                                        ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 font-semibold"
                                                        : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                                                    }`}
                                                  >
                                                    <span className="truncate">{c.name}</span>
                                                    {p.courierId === c.id && (
                                                      <Check className="h-3 w-3 text-indigo-600 dark:text-indigo-400 shrink-0" />
                                                    )}
                                                  </button>
                                                ))}
                                              </div>
                                            </>
                                          )}
                                      </div>
                                    </td>
                                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 truncate max-w-[140px]">
                                      {p.destination}
                                    </td>
                                    <td className="py-2.5 px-3">
                                      <div className="relative inline-block">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setOpenRowDropdown((prev) =>
                                              prev?.id === p.id && prev.field === "status"
                                                ? null
                                                : { id: p.id, field: "status" }
                                            )
                                          }
                                          className="inline-flex items-center justify-between gap-2 min-w-[125px] rounded-xl border border-slate-200/90 bg-slate-50/90 hover:border-indigo-300 px-2.5 py-1.5 text-[11px] font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                                        >
                                          <span className="truncate">
                                            {p.status === "booked"
                                              ? "Booked"
                                              : p.status === "in_transit"
                                              ? "In Transit"
                                              : p.status === "out_for_delivery"
                                              ? "Out for Delivery"
                                              : p.status === "delivered"
                                              ? "Delivered"
                                              : "Returned (RTO)"}
                                          </span>
                                          <ChevronDown className="h-3 w-3 text-slate-400 shrink-0" />
                                        </button>
                                        {openRowDropdown?.id === p.id &&
                                          openRowDropdown.field === "status" && (
                                            <>
                                              <div
                                                className="fixed inset-0 z-40"
                                                onClick={() => setOpenRowDropdown(null)}
                                              />
                                              <div className="absolute right-0 top-full mt-1 z-50 w-44 rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-800 animate-dropdown-open">
                                                {(
                                                  [
                                                    { value: "booked", label: "Booked" },
                                                    { value: "in_transit", label: "In Transit" },
                                                    { value: "out_for_delivery", label: "Out for Delivery" },
                                                    { value: "delivered", label: "Delivered" },
                                                    { value: "returned", label: "Returned (RTO)" },
                                                  ] as const
                                                ).map((st) => (
                                                  <button
                                                    key={st.value}
                                                    type="button"
                                                    onClick={() => {
                                                      handleUpdatePreviewStatus(p.id, st.value);
                                                      setOpenRowDropdown(null);
                                                    }}
                                                    className={`w-full text-left rounded-lg px-2.5 py-1.5 text-[11px] font-medium flex items-center justify-between cursor-pointer ${
                                                      p.status === st.value
                                                        ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 font-semibold"
                                                        : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                                                    }`}
                                                  >
                                                    <span>{st.label}</span>
                                                    {p.status === st.value && (
                                                      <Check className="h-3 w-3 text-indigo-600 dark:text-indigo-400 shrink-0" />
                                                    )}
                                                  </button>
                                                ))}
                                              </div>
                                            </>
                                          )}
                                      </div>
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
                          Back
                        </button>
                        <button
                          type="button"
                          onClick={handleConfirmImport}
                          disabled={newReadyCount === 0}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-5 py-2.5 text-xs font-extrabold text-white shadow-xs cursor-pointer transition-colors disabled:cursor-not-allowed"
                        >
                          <Check className="h-4 w-4 stroke-[3]" />
                          <span>Import ({newReadyCount})</span>
                        </button>
                      </div>
                    </div>
                  );
                })()
              ) : (
                /* STEP 1: UPLOAD EXCEL OR PASTE BULK AWBs FOR REVIEW */
                <div className="space-y-4">
                  {/* Download Sample Excel Template Banner */}
                  <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4 dark:border-indigo-900/50 dark:bg-indigo-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                        Excel Import Template
                      </div>
                      <div className="text-[11px] text-indigo-700/80 dark:text-indigo-300/80">
                        Default import status is automatically set to Booked
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleDownloadSampleTemplate}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-3.5 py-2 text-xs font-semibold text-white shadow-xs cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Sample Excel (.xlsx)</span>
                      </button>
                    </div>
                  </div>

                  {/* Upload Drop Zone (Excel only) */}
                  <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-6 text-center hover:border-indigo-500 hover:bg-indigo-50/20 dark:border-slate-700 dark:bg-slate-800/40 transition-colors">
                    <FileSpreadsheet className="mx-auto h-10 w-10 text-emerald-600 mb-2" />
                    <label
                      htmlFor="excel-file-input"
                      className="text-xs font-semibold text-slate-700 dark:text-slate-200 block mb-3 cursor-pointer"
                    >
                      Select Excel (.xlsx, .xls) file
                    </label>
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
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 shadow-2xs cursor-pointer"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span>{isUploading ? "Reading File..." : "Browse Excel File"}</span>
                    </label>
                  </div>

                  {/* Quick Bulk Paste Option (Also goes to Review Before Import) */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                        Or Paste Multiple Tracking Numbers:
                      </label>
                      <span className="text-[10px] text-slate-400">Comma or line separated</span>
                    </div>
                    <textarea
                      rows={3}
                      value={bulkPasteText}
                      onChange={(e) => setBulkPasteText(e.target.value)}
                      placeholder="Enter Tracking Number (e.g. EL855948618IN, B4000211866)..."
                      className="w-full rounded-xl border border-slate-200 bg-white p-3 font-mono text-xs text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleParseBulkPasteForReview}
                        disabled={!bulkPasteText.trim()}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-4 py-2 text-xs font-semibold text-white shadow-xs cursor-pointer disabled:cursor-not-allowed"
                      >
                        <ArrowRight className="h-3.5 w-3.5" />
                        <span>Review Data</span>
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

      {/* Backup & Restore is now integrated directly inside the Settings page */}

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
