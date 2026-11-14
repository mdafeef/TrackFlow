"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";
import {
  QrCode,
  Printer,
  Plus,
  Trash2,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Lock,
  Search,
  RefreshCw,
  Eye,
  EyeOff,
  ScanLine,
  Phone,
  MapPin,
  User,
  Tag,
  ClipboardPaste,
  SlidersHorizontal,
  Building2,
  FileText,
  RotateCcw,
  FileSpreadsheet,
  Undo2,
  X,
  Hash,
} from "lucide-react";
import {
  encryptCustomerMiniQR,
  decryptCustomerMiniQR,
  strip91FromPhone,
  generateMiniQRSvgMatrix,
} from "@/lib/customerQrCrypto";

export interface LabelPrintItem {
  id: string;
  customerName: string;
  customerPhone: string;
  pincode: string;
  itemCode: string;
  deliveryAddress?: string;
  copies: number;
  selected: boolean;
  printed?: boolean;
  awbHint?: string;
}

interface BulkLabelPrintToolProps {
  shipments?: Array<{
    id: string;
    trackingNumber: string;
    recipientName?: string;
    customerPhone?: string;
    pincode?: string;
    itemCode?: string;
    destination?: string;
  }>;
  defaultOfficeName?: string;
  defaultOfficeHub?: string;
  defaultOfficePhone?: string;
  onSimulateScanInIntake?: (encryptedQrString: string) => void;
}

type LabelLayoutMode =
  | "mini_3col"
  | "standard_2col"
  | "thermal_1col"
  | "security_4col";

const STORAGE_QUEUE_KEY = "trackflow_label_print_queue_v2";
const STORAGE_PREFS_KEY = "trackflow_label_print_prefs_v2";

const INITIAL_SAMPLE_LABELS: LabelPrintItem[] = [
  {
    id: "lbl-1",
    customerName: "Ananya Menon",
    customerPhone: "9847012345",
    pincode: "682001",
    itemCode: "ITM-KRL-104",
    deliveryAddress: "Flat 4B, Lotus Residency, MG Road, Ernakulam, Kochi",
    copies: 1,
    selected: true,
    printed: false,
  },
  {
    id: "lbl-2",
    customerName: "Rahul Sharma",
    customerPhone: "9820156789",
    pincode: "400001",
    itemCode: "ITM-BOM-209",
    deliveryAddress: "2nd Floor, Fort Commercial Complex, D.N. Road, Mumbai",
    copies: 1,
    selected: true,
    printed: false,
  },
  {
    id: "lbl-3",
    customerName: "Karthik Nair",
    customerPhone: "9447123987",
    pincode: "695001",
    itemCode: "ITM-TVM-312",
    deliveryAddress: "TC 24/812, Statue Junction, MG Road, Thiruvananthapuram",
    copies: 1,
    selected: true,
    printed: false,
  },
  {
    id: "lbl-4",
    customerName: "Priya Venkatesh",
    customerPhone: "9840911223",
    pincode: "600001",
    itemCode: "ITM-MAA-418",
    deliveryAddress: "No. 18, Armenian Street, Parrys Corner, George Town, Chennai",
    copies: 1,
    selected: true,
    printed: false,
  },
];

export const MiniQrSvg: React.FC<{
  value: string;
  sizePx?: number;
  className?: string;
}> = React.memo(({ value, sizePx = 88, className = "" }) => {
  const { size, modules } = useMemo(() => generateMiniQRSvgMatrix(value), [value]);

  if (!size || modules.length === 0) {
    return (
      <div
        style={{ width: sizePx, height: sizePx }}
        className={`flex items-center justify-center rounded border border-slate-200 bg-slate-50 text-[10px] font-mono text-slate-400 ${className}`}
      >
        QR
      </div>
    );
  }

  // Quiet zone of 3 modules guarantees fast optical recognition on phone & handheld cameras
  const quietZone = 3;
  const totalSize = size + quietZone * 2;

  return (
    <svg
      width={sizePx}
      height={sizePx}
      viewBox={`0 0 ${totalSize} ${totalSize}`}
      shapeRendering="crispEdges"
      className={`block bg-white rounded-md ${className}`}
      aria-label="Encrypted Office Mini QR"
    >
      <rect width={totalSize} height={totalSize} fill="#ffffff" />
      {modules.map((row, rIdx) =>
        row.map((cell, cIdx) =>
          cell ? (
            <rect
              key={`${rIdx}-${cIdx}`}
              x={cIdx + quietZone}
              y={rIdx + quietZone}
              width={1}
              height={1}
              fill="#0f172a"
            />
          ) : null
        )
      )}
    </svg>
  );
});
MiniQrSvg.displayName = "MiniQrSvg";

/**
 * Formats phone number for printed label display without any 91 prefix.
 */
function formatPhoneForLabelDisplay(
  rawPhone: string,
  mode: "full" | "masked" | "hidden"
): string {
  if (mode === "hidden") return "";
  const clean = strip91FromPhone(rawPhone);
  if (!clean) return "";
  if (mode === "masked" && clean.length >= 7) {
    return `${clean.slice(0, 5)} •••${clean.slice(-2)}`;
  }
  return clean;
}

/**
 * Intelligent parser for Smart Bulk Paste:
 * Supports spreadsheet rows (Tab / Pipe / Semicolon / Comma separated) AND
 * freeform WhatsApp / multi-line address blocks.
 * Automatically removes 91 / +91 from phone numbers and keeps Delivery Address for the label.
 */
function parseSmartBulkPasteText(rawText: string): LabelPrintItem[] {
  const trimmed = (rawText || "").trim();
  if (!trimmed) return [];

  const results: LabelPrintItem[] = [];
  const lines = trimmed
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const tabularLineCount = lines.filter(
    (l) =>
      l.includes("\t") ||
      l.includes("|") ||
      l.includes(";") ||
      l.split(",").length >= 3
  ).length;

  if (tabularLineCount >= Math.ceil(lines.length * 0.5)) {
    lines.forEach((line, idx) => {
      if (
        /customer\s*name|phone|pincode|item\s*code/i.test(line) &&
        !/\b\d{6}\b/.test(line)
      ) {
        return;
      }
      const sep = line.includes("\t")
        ? "\t"
        : line.includes("|")
        ? "|"
        : line.includes(";")
        ? ";"
        : ",";
      const parts = line.split(sep).map((p) => p.trim());

      let foundPin = "";
      let foundPhone = "";
      let foundItem = "";
      const remainingText: string[] = [];

      for (const part of parts) {
        const cleanDigits = part.replace(/[\s\-().+]/g, "");
        if (!foundPin && /^\d{6}$/.test(cleanDigits)) {
          foundPin = cleanDigits;
        } else if (
          !foundPhone &&
          (/^\d{10}$/.test(cleanDigits) ||
            /^91\d{10}$/.test(cleanDigits) ||
            /^091\d{10}$/.test(cleanDigits) ||
            /^0\d{10}$/.test(cleanDigits))
        ) {
          foundPhone = strip91FromPhone(part);
        } else if (
          !foundItem &&
          /^(?:ITM|SKU|ORD|ITEM|PRD|CODE|REF)[-_A-Z0-9]*$/i.test(part)
        ) {
          foundItem = part.toUpperCase();
        } else if (part) {
          remainingText.push(part);
        }
      }

      const customerName = remainingText[0] || `Customer #${idx + 1}`;
      if (
        !foundItem &&
        remainingText.length >= 2 &&
        /^(?=.*[\d\-_])[A-Z0-9\-_]{3,20}$/i.test(remainingText[1])
      ) {
        foundItem = remainingText.splice(1, 1)[0].toUpperCase();
      }
      const deliveryAddress = remainingText.slice(1).join(", ");

      results.push({
        id: `lbl-paste-${Date.now()}-${idx}`,
        customerName,
        customerPhone: foundPhone || "",
        pincode: foundPin || "",
        itemCode: foundItem || `ITM-${101 + idx}`,
        deliveryAddress: deliveryAddress || undefined,
        copies: 1,
        selected: true,
        printed: false,
      });
    });
    return results;
  }

  // Parse as freeform WhatsApp / multi-line address blocks separated by blank lines
  const blocks = trimmed
    .split(/\n\s*\n+/)
    .map((b) => b.trim())
    .filter(Boolean);

  blocks.forEach((block, idx) => {
    const pinMatch = block.match(/\b(\d{6})\b/);
    const phoneMatch = block.match(/(?:\+?0?91[\s\-]?)?([6-9]\d{4}[\s\-]?\d{5})\b/);
    const itemMatch = block.match(/\b((?:ITM|SKU|ORD|ITEM|PRD)[-_A-Z0-9]+)\b/i);

    const extractedPhoneClean = phoneMatch ? strip91FromPhone(phoneMatch[0]) : "";

    const blockLines = block
      .split(/\r?\n/)
      .map((l) =>
        l
          .replace(
            /^(?:name|to|customer|address|addr|ph|phone|mob|mobile|whatsapp|pin|pincode|zip|item|sku|code)\s*[:\-]\s*/i,
            ""
          )
          .trim()
      )
      .filter(Boolean);

    const customerName = blockLines[0] || `Customer #${idx + 1}`;
    const addressLines = blockLines
      .slice(1)
      .filter((l) => {
        const lineDigits = l.replace(/[\s\-+]/g, "");
        if (extractedPhoneClean && lineDigits.includes(extractedPhoneClean)) {
          return false;
        }
        if (itemMatch && l.toUpperCase() === itemMatch[1].toUpperCase()) {
          return false;
        }
        if (pinMatch && l.replace(/\D/g, "") === pinMatch[1]) {
          return false;
        }
        return true;
      });

    results.push({
      id: `lbl-wa-${Date.now()}-${idx}`,
      customerName,
      customerPhone: extractedPhoneClean,
      pincode: pinMatch ? pinMatch[1] : "",
      itemCode: itemMatch ? itemMatch[1].toUpperCase() : `ITM-${101 + idx}`,
      deliveryAddress: addressLines.join(", ").slice(0, 140) || undefined,
      copies: 1,
      selected: true,
      printed: false,
    });
  });

  return results;
}

export default function BulkLabelPrintTool({
  shipments = [],
  defaultOfficeName = "TRACKFLOW DISPATCH HUB",
  defaultOfficeHub = "Kochi GPO Hub (682001)",
  defaultOfficePhone = "9847000000",
  onSimulateScanInIntake,
}: BulkLabelPrintToolProps) {
  const [labels, setLabels] = useState<LabelPrintItem[]>(INITIAL_SAMPLE_LABELS);
  const [hasHydrated, setHasHydrated] = useState(false);

  // Undo snapshot for Clear All / Clear Printed safety
  const [undoQueueSnapshot, setUndoQueueSnapshot] = useState<LabelPrintItem[] | null>(
    null
  );

  // Intake Mode Tab: "single" | "smart_paste" | "print_settings"
  const [activeIntakeTab, setActiveIntakeTab] = useState<
    "single" | "smart_paste" | "print_settings"
  >("single");

  // Single Entry Form State
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formPincode, setFormPincode] = useState("");
  const [formItemCode, setFormItemCode] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formAwbHint, setFormAwbHint] = useState("");
  const [formCopies, setFormCopies] = useState(1);
  const [formError, setFormError] = useState<string | null>(null);

  // Smart Paste State
  const [smartPasteText, setSmartPasteText] = useState("");

  // Layout & Print Preferences
  const [labelLayout, setLabelLayout] = useState<LabelLayoutMode>("mini_3col");
  const [phoneDisplayMode, setPhoneDisplayMode] = useState<
    "full" | "masked" | "hidden"
  >("full");
  const [showItemCodeTextOnLabel, setShowItemCodeTextOnLabel] = useState(true);
  const [showReturnAddressOnLabel, setShowReturnAddressOnLabel] = useState(true);
  const [senderOfficeTitle, setSenderOfficeTitle] = useState(defaultOfficeName);
  const [senderOfficeHub, setSenderOfficeHub] = useState(defaultOfficeHub);
  const [senderOfficePhone, setSenderOfficePhone] = useState(
    strip91FromPhone(defaultOfficePhone) || defaultOfficePhone
  );

  // Queue Filter & Search
  const [queueFilter, setQueueFilter] = useState<"all" | "unprinted" | "printed">(
    "all"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<{
    type: "success" | "warn";
    text: string;
    canUndo?: boolean;
  } | null>(null);
  const [inspectItemId, setInspectItemId] = useState<string | null>(null);
  const [singlePrintTargetId, setSinglePrintTargetId] = useState<string | null>(
    null
  );

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const printableSheetRef = useRef<HTMLDivElement | null>(null);
  const singlePrintSheetRef = useRef<HTMLDivElement | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activePrintIframeRef = useRef<HTMLIFrameElement | null>(null);
  const singlePrintHandledRef = useRef<string | null>(null);

  // Load persisted queue & preferences on mount (and strip any legacy 91 prefixes automatically)
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const savedQueue = localStorage.getItem(STORAGE_QUEUE_KEY);
        if (savedQueue !== null) {
          const parsed = JSON.parse(savedQueue);
          if (Array.isArray(parsed)) {
            setLabels(
              parsed.map((item: LabelPrintItem) => ({
                ...item,
                customerPhone: strip91FromPhone(item.customerPhone || ""),
              }))
            );
          }
        }
        const savedPrefs = localStorage.getItem(STORAGE_PREFS_KEY);
        if (savedPrefs) {
          const prefs = JSON.parse(savedPrefs);
          if (prefs.labelLayout) setLabelLayout(prefs.labelLayout);
          if (prefs.phoneDisplayMode) setPhoneDisplayMode(prefs.phoneDisplayMode);
          if (typeof prefs.showItemCodeTextOnLabel === "boolean")
            setShowItemCodeTextOnLabel(prefs.showItemCodeTextOnLabel);
          if (typeof prefs.showReturnAddressOnLabel === "boolean")
            setShowReturnAddressOnLabel(prefs.showReturnAddressOnLabel);
          if (prefs.senderOfficeTitle) setSenderOfficeTitle(prefs.senderOfficeTitle);
          if (prefs.senderOfficeHub) setSenderOfficeHub(prefs.senderOfficeHub);
          if (prefs.senderOfficePhone)
            setSenderOfficePhone(strip91FromPhone(prefs.senderOfficePhone));
        }
      } catch {
        // ignore storage errors
      } finally {
        setHasHydrated(true);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Persist queue changes ONLY after initial storage hydration completes
  useEffect(() => {
    if (!hasHydrated) return;
    try {
      localStorage.setItem(STORAGE_QUEUE_KEY, JSON.stringify(labels));
    } catch {}
  }, [labels, hasHydrated]);

  // Persist layout preferences ONLY after initial storage hydration completes
  useEffect(() => {
    if (!hasHydrated) return;
    try {
      localStorage.setItem(
        STORAGE_PREFS_KEY,
        JSON.stringify({
          labelLayout,
          phoneDisplayMode,
          showItemCodeTextOnLabel,
          showReturnAddressOnLabel,
          senderOfficeTitle,
          senderOfficeHub,
          senderOfficePhone,
        })
      );
    } catch {}
  }, [
    hasHydrated,
    labelLayout,
    phoneDisplayMode,
    showItemCodeTextOnLabel,
    showReturnAddressOnLabel,
    senderOfficeTitle,
    senderOfficeHub,
    senderOfficePhone,
  ]);

  // Cleanup any open timers or print iframe on unmount
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      if (
        activePrintIframeRef.current &&
        typeof document !== "undefined" &&
        document.body.contains(activePrintIframeRef.current)
      ) {
        document.body.removeChild(activePrintIframeRef.current);
      }
    };
  }, []);

  const showToast = useCallback(
    (text: string, type: "success" | "warn" = "success", canUndo = false) => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      setStatusBanner({ type, text, canUndo });
      toastTimerRef.current = setTimeout(
        () => {
          setStatusBanner(null);
        },
        canUndo ? 8000 : 4500
      );
    },
    []
  );

  const handleAddLabel = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanName = formName.trim();
    if (!cleanName) {
      setFormError("Please enter Customer Name.");
      return;
    }

    const cleanPhone = strip91FromPhone(formPhone);
    if (!cleanPhone) {
      setFormError("Please enter Customer Phone Number.");
      return;
    }

    const cleanPin = formPincode.replace(/\D/g, "").trim();
    if (!cleanPin) {
      setFormError("Please enter Pincode.");
      return;
    }

    const cleanItem =
      formItemCode.trim().toUpperCase() ||
      `ITM-${Math.floor(1000 + Math.random() * 9000)}`;

    const newItem: LabelPrintItem = {
      id: `lbl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      customerName: cleanName,
      customerPhone: cleanPhone,
      pincode: cleanPin,
      itemCode: cleanItem,
      deliveryAddress: formAddress.trim() || undefined,
      awbHint: formAwbHint.trim().toUpperCase() || undefined,
      copies: Math.max(1, Math.min(50, Number(formCopies) || 1)),
      selected: true,
      printed: false,
    };

    setUndoQueueSnapshot(null);
    setLabels((prev) => [newItem, ...prev]);
    setFormName("");
    setFormPhone("");
    setFormPincode("");
    setFormItemCode("");
    setFormAddress("");
    setFormAwbHint("");
    setFormCopies(1);
    showToast(`Added "${cleanName}" to label queue.`);
    nameInputRef.current?.focus();
  };

  const handleResetQuickAddForm = () => {
    setFormName("");
    setFormPhone("");
    setFormPincode("");
    setFormItemCode("");
    setFormAddress("");
    setFormAwbHint("");
    setFormCopies(1);
    setFormError(null);
    nameInputRef.current?.focus();
  };

  const handleSmartPasteSubmit = () => {
    const parsed = parseSmartBulkPasteText(smartPasteText);
    if (parsed.length === 0) {
      setFormError(
        "No customer rows detected. Paste spreadsheet rows or WhatsApp address blocks."
      );
      return;
    }
    setUndoQueueSnapshot(null);
    setLabels((prev) => [...parsed, ...prev]);
    setSmartPasteText("");
    setActiveIntakeTab("single");
    showToast(`Added ${parsed.length} customer label(s) (91 stripped automatically).`);
  };

  const handleUpdateField = (
    id: string,
    field: keyof LabelPrintItem,
    value: string | number | boolean
  ) => {
    setLabels((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        if (field === "customerPhone" && typeof value === "string") {
          return { ...item, customerPhone: strip91FromPhone(value) };
        }
        return { ...item, [field]: value };
      })
    );
  };

  const handleRemoveLabel = (id: string) => {
    setLabels((prev) => prev.filter((item) => item.id !== id));
    if (inspectItemId === id) setInspectItemId(null);
  };

  const handleClearQueue = () => {
    if (labels.length === 0) return;
    setUndoQueueSnapshot(labels);
    setLabels([]);
    setInspectItemId(null);
    showToast(`Cleared ${labels.length} label(s) from queue.`, "warn", true);
  };

  const handleClearPrinted = () => {
    const printedCount = labels.filter((l) => l.printed).length;
    if (printedCount === 0) return;
    setUndoQueueSnapshot(labels);
    setLabels((prev) => prev.filter((l) => !l.printed));
    if (queueFilter === "printed") setQueueFilter("all");
    showToast(`Removed ${printedCount} printed label(s) from queue.`, "success", true);
  };

  const handleResetPrintedStatus = () => {
    setLabels((prev) => prev.map((l) => ({ ...l, printed: false })));
    if (queueFilter === "printed") setQueueFilter("all");
    showToast("Reset printed status for all queued labels.");
  };

  const handleUndoQueueChange = () => {
    if (!undoQueueSnapshot) return;
    setLabels(undoQueueSnapshot);
    setUndoQueueSnapshot(null);
    showToast("Restored previous label queue.");
  };

  const handleImportFromConsignments = () => {
    const existingKeys = new Set(
      labels.map((l) => `${l.customerName.toLowerCase()}|${l.pincode}|${l.itemCode}`)
    );

    const validFromShipments: LabelPrintItem[] = [];
    shipments.forEach((s, idx) => {
      if (!s.recipientName && !s.customerPhone && !s.pincode && !s.itemCode) return;
      const name = s.recipientName || `Customer (${s.trackingNumber})`;
      const pin = (s.pincode || "").replace(/\D/g, "");
      const itemCode = (
        s.itemCode || `ITM-${s.trackingNumber.slice(-4)}`
      ).toUpperCase();
      const key = `${name.toLowerCase()}|${pin}|${itemCode}`;
      if (existingKeys.has(key)) return;
      existingKeys.add(key);

      validFromShipments.push({
        id: `lbl-ship-${s.id}-${idx}-${Date.now()}`,
        customerName: name,
        customerPhone: strip91FromPhone(s.customerPhone || ""),
        pincode: pin,
        itemCode,
        deliveryAddress: s.destination || undefined,
        copies: 1,
        selected: true,
        printed: false,
        awbHint: s.trackingNumber,
      });
    });

    if (validFromShipments.length === 0) {
      showToast(
        "All consignments with customer data are already in your label queue.",
        "warn"
      );
      return;
    }

    setUndoQueueSnapshot(null);
    setLabels((prev) => [...validFromShipments, ...prev]);
    showToast(
      `Imported ${validFromShipments.length} customer label(s) from active consignments.`
    );
  };

  const handleDownloadTemplate = () => {
    const sampleRows = [
      {
        "Customer Name": "Ananya Menon",
        "Customer Number": "9847012345",
        Pincode: "682001",
        "Item Code": "ITM-KRL-104",
        "Delivery Address": "Flat 4B, Lotus Residency, MG Road, Ernakulam, Kochi",
        "Tracking Number (Optional)": "",
        Copies: 1,
      },
      {
        "Customer Name": "Vikramaditya Rao",
        "Customer Number": "9845098765",
        Pincode: "560001",
        "Item Code": "ITM-BLR-502",
        "Delivery Address": "14 Brigade Road, Ashok Nagar, Bengaluru",
        "Tracking Number (Optional)": "",
        Copies: 2,
      },
      {
        "Customer Name": "Meera Krishnan",
        "Customer Number": "9446011223",
        Pincode: "673001",
        "Item Code": "ITM-CLT-881",
        "Delivery Address": "SM Street, Palayam, Kozhikode",
        "Tracking Number (Optional)": "B4000211866",
        Copies: 1,
      },
    ];
    const ws = XLSX.utils.json_to_sheet(sampleRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "BulkLabels");
    XLSX.writeFile(wb, "TrackFlow_Bulk_Label_Template.xlsx");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
          defval: "",
        });

        const imported: LabelPrintItem[] = [];
        rows.forEach((row, index) => {
          const getVal = (keys: string[]) => {
            for (const k of Object.keys(row)) {
              const norm = k.toLowerCase().replace(/[^a-z0-9]/g, "");
              if (keys.some((cand) => norm.includes(cand))) {
                return String(row[k] ?? "").trim();
              }
            }
            return "";
          };

          const customerName = getVal(["customername", "name", "recipient", "consignee"]);
          const customerPhone = getVal([
            "customernumber",
            "phone",
            "mobile",
            "contact",
            "number",
          ]);
          const pincode = getVal(["pincode", "pin", "postal", "zip"]);
          const itemCode = getVal(["itemcode", "item", "sku", "product", "code"]);
          const deliveryAddress = getVal([
            "deliveryaddress",
            "address",
            "street",
            "city",
            "location",
          ]);
          const awbHint = getVal(["trackingnumber", "awb", "consignment", "tracking"]);
          const copiesRaw = getVal(["copies", "qty", "quantity"]);

          if (customerName || customerPhone || pincode || deliveryAddress) {
            imported.push({
              id: `lbl-imp-${Date.now()}-${index}`,
              customerName: customerName || `Customer #${index + 1}`,
              customerPhone: strip91FromPhone(customerPhone),
              pincode: pincode.replace(/\D/g, ""),
              itemCode: (itemCode || `ITM-${100 + index}`).toUpperCase(),
              deliveryAddress: deliveryAddress || undefined,
              awbHint: awbHint ? awbHint.toUpperCase() : undefined,
              copies: Math.max(1, Math.min(50, parseInt(copiesRaw, 10) || 1)),
              selected: true,
              printed: false,
            });
          }
        });

        if (imported.length > 0) {
          setUndoQueueSnapshot(null);
          setLabels((prev) => [...imported, ...prev]);
          showToast(
            `Loaded ${imported.length} customer label row(s) from ${file.name} (91 stripped automatically).`
          );
        } else {
          setFormError(
            "Could not find Customer Name, Number, Address, or Pincode columns in uploaded file."
          );
        }
      } catch {
        setFormError(
          "Failed to parse spreadsheet. Please upload a valid .xlsx or .csv file."
        );
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  // Enrich each queue item with clean 10-digit phone & encrypted QR (QR contains ONLY Name, Phone without 91, Pincode, Item Code — NO address)
  const enrichedLabels = useMemo(() => {
    return labels.map((l) => {
      const cleanPhone = strip91FromPhone(l.customerPhone);
      const cleanPin = (l.pincode || "").replace(/\D/g, "");
      const encryptedQr = encryptCustomerMiniQR({
        customerName: l.customerName,
        customerPhone: cleanPhone,
        pincode: cleanPin,
        itemCode: l.itemCode,
      });
      return {
        ...l,
        customerPhone: cleanPhone,
        pincode: cleanPin,
        encryptedQr,
      };
    });
  }, [labels]);

  // Export Queue with Encrypted TFQR1 Payloads
  const handleExportQueueExcel = () => {
    if (enrichedLabels.length === 0) return;
    const rows = enrichedLabels.map((item) => ({
      "Customer Name": item.customerName,
      "Customer Phone": item.customerPhone,
      Pincode: item.pincode,
      "Item Code": item.itemCode,
      "Delivery Address (Label Only)": item.deliveryAddress || "",
      "Tracking Number (Optional)": item.awbHint || "",
      Copies: item.copies,
      Printed: item.printed ? "Yes" : "No",
      "Encrypted Mini QR (TFQR1 - No Address)": item.encryptedQr,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "LabelQueue");
    XLSX.writeFile(
      wb,
      `TrackFlow_Labels_Export_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
    showToast(`Exported ${rows.length} label row(s) to Excel.`);
  };

  // Filtered queue list for table view
  const filteredLabels = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return enrichedLabels.filter((l) => {
      if (queueFilter === "unprinted" && l.printed) return false;
      if (queueFilter === "printed" && !l.printed) return false;

      if (!q) return true;
      return (
        l.customerName.toLowerCase().includes(q) ||
        l.customerPhone.toLowerCase().includes(q) ||
        l.pincode.toLowerCase().includes(q) ||
        l.itemCode.toLowerCase().includes(q) ||
        (l.deliveryAddress && l.deliveryAddress.toLowerCase().includes(q)) ||
        (l.awbHint && l.awbHint.toLowerCase().includes(q))
      );
    });
  }, [enrichedLabels, queueFilter, searchQuery]);

  // Expand selected labels by `copies` count for the Printable Sheet
  const printableExpandedLabels = useMemo(() => {
    const out: Array<
      (typeof enrichedLabels)[number] & {
        copyIndex: number;
      }
    > = [];

    enrichedLabels
      .filter((l) => l.selected)
      .forEach((l) => {
        const count = Math.max(1, Math.min(50, l.copies || 1));
        for (let c = 1; c <= count; c++) {
          out.push({
            ...l,
            copyIndex: c,
          });
        }
      });

    return out;
  }, [enrichedLabels]);

  const totalPrintedInQueue = useMemo(
    () => enrichedLabels.filter((l) => l.printed).length,
    [enrichedLabels]
  );

  const handleToggleSelectAllVisible = () => {
    const visibleIds = new Set(filteredLabels.map((l) => l.id));
    const allVisibleSelected =
      filteredLabels.length > 0 && filteredLabels.every((l) => l.selected);
    setLabels((prev) =>
      prev.map((l) =>
        visibleIds.has(l.id) ? { ...l, selected: !allVisibleSelected } : l
      )
    );
  };

  // Shared isolated iframe print engine
  const printMarkupInIframe = useCallback(
    (
      sheetMarkupHtml: string,
      totalCount: number,
      printedIds: Set<string>
    ) => {
      if (typeof document === "undefined" || totalCount === 0) return;

      if (
        activePrintIframeRef.current &&
        document.body.contains(activePrintIframeRef.current)
      ) {
        document.body.removeChild(activePrintIframeRef.current);
        activePrintIframeRef.current = null;
      }

      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      document.body.appendChild(iframe);
      activePrintIframeRef.current = iframe;

      const doc = iframe.contentWindow?.document;
      if (!doc) {
        document.body.removeChild(iframe);
        activePrintIframeRef.current = null;
        window.print();
        return;
      }

      const pageRule =
        labelLayout === "thermal_1col"
          ? "@page { size: 102mm 76mm; margin: 2.5mm; }"
          : "@page { size: A4 portrait; margin: 7mm; }";

      const gridColsCss =
        labelLayout === "security_4col"
          ? "grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 7px;"
          : labelLayout === "mini_3col"
          ? "grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 9px;"
          : labelLayout === "standard_2col"
          ? "grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 11px;"
          : "grid-template-columns: 1fr; width: 100%; max-width: 97mm; margin: 0 auto; gap: 0;";

      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>TrackFlow Labels (${totalCount})</title>
            <style>
              ${pageRule}
              * { box-sizing: border-box; margin: 0; padding: 0; }
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                background: #ffffff;
                color: #0f172a;
                padding: ${labelLayout === "thermal_1col" ? "0" : "2mm"};
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              svg { display: block; }
              .print-grid {
                display: grid;
                ${gridColsCss}
              }
              .label-card {
                border: 1.6px solid #0f172a;
                border-radius: 7px;
                padding: ${labelLayout === "security_4col" ? "7px 8px" : "9px 11px"};
                background: #ffffff;
                page-break-inside: avoid;
                break-inside: avoid;
                display: flex;
                align-items: stretch;
                justify-content: space-between;
                gap: 8px;
              }
              .thermal-break:not(:last-child) {
                page-break-after: always;
                break-after: page;
              }
              .label-left {
                flex: 1;
                min-width: 0;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
              }
              .label-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 4px;
                border-bottom: 1px solid #cbd5e1;
                padding-bottom: 3px;
                margin-bottom: 4px;
                font-size: 8.5px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                color: #334155;
              }
              .office-title {
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              }
              .badge-dark {
                background: #0f172a;
                color: #ffffff;
                padding: 1px 5px;
                border-radius: 3px;
                font-family: monospace;
                font-size: 8px;
                font-weight: 900;
                flex-shrink: 0;
              }
              .deliver-label {
                font-size: 8px;
                font-weight: 800;
                text-transform: uppercase;
                color: #64748b;
              }
              .customer-name {
                font-size: ${labelLayout === "security_4col" ? "11.5px" : "13px"};
                font-weight: 900;
                color: #0f172a;
                line-height: 1.2;
                margin-top: 1px;
                word-break: break-word;
              }
              .address-line {
                font-size: ${labelLayout === "security_4col" ? "9px" : "10px"};
                font-weight: 600;
                color: #1e293b;
                margin-top: 3px;
                line-height: 1.3;
                word-break: break-word;
              }
              .pin-phone-row {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                gap: 6px;
                margin-top: 5px;
              }
              .pin-box {
                border: 1.4px solid #0f172a;
                border-radius: 4px;
                padding: 1px 5px;
                font-family: monospace;
                font-size: ${labelLayout === "security_4col" ? "10px" : "11px"};
                font-weight: 900;
                color: #0f172a;
                background: #f8fafc;
              }
              .phone-line {
                font-family: monospace;
                font-size: 10.5px;
                font-weight: 800;
                color: #0f172a;
                margin-top: 3px;
              }
              .meta-footer {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 6px;
                border-top: 1px dashed #cbd5e1;
                padding-top: 3px;
                margin-top: 5px;
                font-family: monospace;
                font-size: 9px;
                font-weight: 800;
                color: #1e293b;
              }
              .return-line {
                font-size: 8px;
                font-weight: 700;
                color: #64748b;
                margin-top: 3px;
                border-top: 1px solid #f1f5f9;
                padding-top: 2px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              }
              .qr-col {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                border-left: 1px dashed #cbd5e1;
                padding-left: 7px;
                flex-shrink: 0;
              }
              .qr-caption {
                font-family: monospace;
                font-size: 7px;
                font-weight: 800;
                letter-spacing: 0.05em;
                color: #475569;
                margin-top: 2px;
                text-transform: uppercase;
              }
            </style>
          </head>
          <body>
            ${sheetMarkupHtml}
          </body>
        </html>
      `);
      doc.close();

      const cleanup = () => {
        if (
          activePrintIframeRef.current === iframe &&
          document.body.contains(iframe)
        ) {
          document.body.removeChild(iframe);
          activePrintIframeRef.current = null;
        }
      };

      iframe.contentWindow?.addEventListener("afterprint", cleanup, { once: true });

      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setLabels((prev) =>
          prev.map((l) => (printedIds.has(l.id) ? { ...l, printed: true } : l))
        );
        setTimeout(cleanup, 60000);
      }, 160);
    },
    [labelLayout]
  );

  // Print all currently selected labels from the live DOM sheet
  const handlePrintLabels = () => {
    if (printableExpandedLabels.length === 0) return;
    const sheetEl = printableSheetRef.current;
    if (!sheetEl) return;
    const selectedIds = new Set(
      enrichedLabels.filter((l) => l.selected).map((l) => l.id)
    );
    printMarkupInIframe(sheetEl.innerHTML, printableExpandedLabels.length, selectedIds);
  };

  // Print a single row via isolated hidden container (zero flicker or selection mutation)
  useEffect(() => {
    if (!singlePrintTargetId || singlePrintHandledRef.current === singlePrintTargetId)
      return;
    const targetItem = enrichedLabels.find((l) => l.id === singlePrintTargetId);
    const singleSheet = singlePrintSheetRef.current;
    if (targetItem && singleSheet) {
      singlePrintHandledRef.current = singlePrintTargetId;
      printMarkupInIframe(
        singleSheet.innerHTML,
        Math.max(1, targetItem.copies || 1),
        new Set([singlePrintTargetId])
      );
    }
    const timer = setTimeout(() => {
      singlePrintHandledRef.current = null;
      setSinglePrintTargetId(null);
    }, 50);
    return () => clearTimeout(timer);
  }, [singlePrintTargetId, enrichedLabels, printMarkupInIframe]);

  const handlePrintSingleRow = (targetId: string) => {
    const targetItem = enrichedLabels.find((l) => l.id === targetId);
    if (!targetItem) return;
    singlePrintHandledRef.current = null;
    setSinglePrintTargetId(targetId);
  };

  const handleCopyQrPayload = (id: string, encryptedQr: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(encryptedQr).catch(() => {});
    }
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    setCopiedId(id);
    copyTimerRef.current = setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* ================================================================= */}
      {/* 1. COMPACT TOP ACTION BAR & WORKFLOW SUMMARY                      */}
      {/* ================================================================= */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
                Bulk Label Print &amp; Customer QR Studio
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                  <Lock className="h-3 w-3" />
                  Mini QR: Name, Phone, Pincode &amp; Item Code
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  Full Delivery Address printed on label (excluded from QR for instant scan)
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums font-semibold text-slate-700 dark:text-slate-300">
                  {enrichedLabels.length} in queue
                </span>
              </div>
            </div>
          </div>

          {/* Primary Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleImportFromConsignments}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer transition-colors whitespace-nowrap shrink-0"
              title="Import customers from active consignments"
            >
              <RefreshCw className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Sync Consignments</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer transition-colors whitespace-nowrap shrink-0"
              title="Download sample Excel template"
            >
              <Download className="h-3.5 w-3.5 text-slate-500" />
              <span>Template</span>
            </button>

            {enrichedLabels.length > 0 && (
              <button
                type="button"
                onClick={handleExportQueueExcel}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer transition-colors whitespace-nowrap shrink-0"
                title="Export queue + TFQR1 cipher strings to Excel"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Export Queue</span>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 text-xs font-extrabold text-indigo-700 dark:border-indigo-500/40 dark:bg-indigo-950/70 dark:text-indigo-300 cursor-pointer transition-colors whitespace-nowrap shrink-0"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Upload Excel/CSV</span>
            </button>

            <button
              type="button"
              onClick={handlePrintLabels}
              disabled={printableExpandedLabels.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-4 py-2 text-xs font-extrabold text-white cursor-pointer transition-colors whitespace-nowrap shrink-0"
            >
              <Printer className="h-4 w-4" />
              <span className="tabular-nums">
                Print Selected ({printableExpandedLabels.length})
              </span>
            </button>
          </div>
        </div>

        {/* Status Toast with optional Undo */}
        {statusBanner && (
          <div
            className={`mt-3 rounded-xl border px-3.5 py-2 text-xs font-bold flex items-center justify-between gap-3 ${
              statusBanner.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300"
                : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/60 dark:text-amber-300"
            }`}
          >
            <div className="flex items-center gap-2">
              {statusBanner.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 shrink-0" />
              )}
              <span>{statusBanner.text}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {statusBanner.canUndo && undoQueueSnapshot && (
                <button
                  type="button"
                  onClick={handleUndoQueueChange}
                  className="inline-flex items-center gap-1 rounded-lg bg-white/90 dark:bg-slate-900 px-2.5 py-1 text-[11px] font-extrabold text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700 cursor-pointer"
                >
                  <Undo2 className="h-3 w-3" />
                  <span>Undo</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setStatusBanner(null)}
                className="p-0.5 opacity-70 hover:opacity-100 cursor-pointer"
                aria-label="Dismiss message"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* 2. UNIFIED INTAKE & CONFIGURATION TABS                            */}
      {/* ================================================================= */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="inline-flex flex-wrap items-center gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
            <button
              type="button"
              onClick={() => setActiveIntakeTab("single")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeIntakeTab === "single"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Quick Add Label</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveIntakeTab("smart_paste")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeIntakeTab === "smart_paste"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <ClipboardPaste className="h-3.5 w-3.5" />
              <span>Smart Bulk Paste (WhatsApp / Sheets)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveIntakeTab("print_settings")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeIntakeTab === "print_settings"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Sender Hub &amp; Label Setup</span>
            </button>
          </div>

          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Scan Tracking Barcode + Label Mini QR at DTDC / India Post booking time to auto-match customer details
          </span>
        </div>

        {/* TAB 1: QUICK ADD SINGLE LABEL */}
        {activeIntakeTab === "single" && (
          <form onSubmit={handleAddLabel} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
              {/* Customer Name */}
              <div className="lg:col-span-3 space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <User className="h-3 w-3 text-slate-400" />
                  <span>Customer Name *</span>
                </label>
                <input
                  ref={nameInputRef}
                  type="text"
                  value={formName}
                  onChange={(e) => {
                    setFormName(e.target.value);
                    setFormError(null);
                  }}
                  placeholder="e.g. Ananya Menon"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {/* Customer Phone (automatically strips 91 if pasted/typed with 91) */}
              <div className="lg:col-span-3 space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <Phone className="h-3 w-3 text-slate-400" />
                  <span>Phone Number *</span>
                </label>
                <input
                  type="tel"
                  value={formPhone}
                  onChange={(e) => {
                    setFormPhone(strip91FromPhone(e.target.value));
                    setFormError(null);
                  }}
                  placeholder="9847012345"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono tabular-nums font-semibold text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {/* Pincode */}
              <div className="lg:col-span-2 space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-slate-400" />
                  <span>Pincode *</span>
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={formPincode}
                  onChange={(e) => {
                    setFormPincode(e.target.value.replace(/\D/g, "").slice(0, 6));
                    setFormError(null);
                  }}
                  placeholder="682001"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono tabular-nums font-bold text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {/* Item Code */}
              <div className="lg:col-span-2 space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <Tag className="h-3 w-3 text-slate-400" />
                  <span>Item Code</span>
                </label>
                <input
                  type="text"
                  value={formItemCode}
                  onChange={(e) => {
                    setFormItemCode(e.target.value.toUpperCase());
                    setFormError(null);
                  }}
                  placeholder="Auto or ITM-104"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono font-semibold uppercase text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {/* Copies & Add Button */}
              <div className="lg:col-span-2 flex items-end gap-2">
                <div className="w-16 space-y-1 shrink-0">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">
                    Copies
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={formCopies}
                    onChange={(e) =>
                      setFormCopies(
                        Math.max(1, Math.min(50, parseInt(e.target.value, 10) || 1))
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-xs font-mono tabular-nums font-bold text-center text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <button
                  type="submit"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-3.5 py-2 text-xs font-extrabold text-white cursor-pointer transition-colors h-[34px] whitespace-nowrap"
                >
                  <Plus className="h-4 w-4 stroke-[2.5]" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            {/* Second Row: Full Delivery Address (for Label) + Optional Pre-Booked Tracking Number */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 pt-1">
              <div className="lg:col-span-8 space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center justify-between">
                  <span>Delivery Address (Printed on Parcel Label)</span>
                  <span className="text-[10px] font-normal text-slate-400">
                    Not stored in Mini QR
                  </span>
                </label>
                <input
                  type="text"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="House / Flat, Street, Post Office, City, Landmark"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="lg:col-span-4 space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                    <Hash className="h-3 w-3 text-slate-400" />
                    <span>Tracking No. (Optional — if received earlier)</span>
                  </label>
                  {(formName ||
                    formPhone ||
                    formPincode ||
                    formItemCode ||
                    formAddress ||
                    formAwbHint) && (
                    <button
                      type="button"
                      onClick={handleResetQuickAddForm}
                      className="text-[10px] font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={formAwbHint}
                  onChange={(e) => setFormAwbHint(e.target.value.toUpperCase())}
                  placeholder="Leave blank if booking later at DTDC / India Post"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono uppercase text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>
          </form>
        )}

        {/* TAB 2: SMART BULK PASTE (WHATSAPP / SPREADSHEET ROWS) */}
        {activeIntakeTab === "smart_paste" && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Paste spreadsheet rows (
                <code className="font-mono text-indigo-600 dark:text-indigo-400">
                  Name | Phone | Pincode | ItemCode | Address
                </code>
                ) or WhatsApp customer blocks (any <code className="font-mono">91</code> prefix is removed automatically):
              </p>
              <button
                type="button"
                onClick={() =>
                  setSmartPasteText(
                    `Arjun Nair | 9847112233 | 682016 | ITM-KOC-701 | Panampilly Nagar, Ernakulam, Kochi\nDivya Menon | 9447889900 | 695014 | ITM-TVM-702 | Vazhuthacaud, Thiruvananthapuram\nSuresh Babu | 9840223344 | 600017 | ITM-MAA-703 | Pondy Bazaar, T Nagar, Chennai`
                  )
                }
                className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer shrink-0"
              >
                Insert Sample Paste Rows
              </button>
            </div>

            <textarea
              rows={4}
              value={smartPasteText}
              onChange={(e) => {
                setSmartPasteText(e.target.value);
                setFormError(null);
              }}
              placeholder={`Example 1 (Spreadsheet / Pipe / Comma lines):\nAnanya Menon, 9847012345, 682001, ITM-104, MG Road Ernakulam Kochi\n\nExample 2 (WhatsApp Address Block):\nRahul Sharma\nFort Commercial Complex, Mumbai\nPin: 400001\nPh: 9820156789\nItem: ITM-209`}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3.5 font-mono text-xs text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSmartPasteText("")}
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleSmartPasteSubmit}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-xs font-extrabold text-white cursor-pointer"
              >
                <ClipboardPaste className="h-3.5 w-3.5" />
                <span>Extract &amp; Add Labels</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: SENDER HUB & PRINT PRIVACY SETUP */}
        {activeIntakeTab === "print_settings" && (
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <Building2 className="h-3 w-3 text-slate-400" />
                  <span>Office / Sender Header Title</span>
                </label>
                <input
                  type="text"
                  value={senderOfficeTitle}
                  onChange={(e) => setSenderOfficeTitle(e.target.value)}
                  placeholder="TRACKFLOW DISPATCH OFFICE"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-slate-400" />
                  <span>Return / Origin Hub &amp; PIN</span>
                </label>
                <input
                  type="text"
                  value={senderOfficeHub}
                  onChange={(e) => setSenderOfficeHub(e.target.value)}
                  placeholder="Kochi Hub (682001)"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <Phone className="h-3 w-3 text-slate-400" />
                  <span>Sender Support Phone</span>
                </label>
                <input
                  type="text"
                  value={senderOfficePhone}
                  onChange={(e) =>
                    setSenderOfficePhone(strip91FromPhone(e.target.value))
                  }
                  placeholder="9847000000"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono tabular-nums font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>
                Printed in the label header and Return Hub footer.
              </span>
              <button
                type="button"
                onClick={() => {
                  setSenderOfficeTitle(defaultOfficeName);
                  setSenderOfficeHub(defaultOfficeHub);
                  setSenderOfficePhone(strip91FromPhone(defaultOfficePhone));
                  showToast("Restored sender hub fields from your Profile defaults.");
                }}
                className="inline-flex items-center gap-1 font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer shrink-0"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Sync from Profile</span>
              </button>
            </div>
          </div>
        )}

        {formError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/60 dark:text-rose-300 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{formError}</span>
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* 3. QUEUE TABLE                                                    */}
      {/* ================================================================= */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900 space-y-3.5">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          {/* Left: Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: "all", label: `All (${enrichedLabels.length})` },
                {
                  id: "unprinted",
                  label: `Unprinted (${enrichedLabels.length - totalPrintedInQueue})`,
                },
                ...(totalPrintedInQueue > 0
                  ? [{ id: "printed" as const, label: `Printed (${totalPrintedInQueue})` }]
                  : []),
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setQueueFilter(tab.id)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold tabular-nums transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  queueFilter === tab.id
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200/70 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Right: Queue Utilities & Search */}
          <div className="flex flex-wrap items-center gap-2">
            {totalPrintedInQueue > 0 && (
              <>
                <button
                  type="button"
                  onClick={handleResetPrintedStatus}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer whitespace-nowrap shrink-0"
                  title="Mark all rows as unprinted"
                >
                  <RotateCcw className="h-3 w-3 text-slate-500" />
                  <span>Reset Printed</span>
                </button>
                <button
                  type="button"
                  onClick={handleClearPrinted}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer whitespace-nowrap shrink-0"
                  title="Remove rows already marked Printed"
                >
                  <Trash2 className="h-3 w-3 text-slate-500" />
                  <span>Clear Printed</span>
                </button>
              </>
            )}

            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, phone, address..."
                className="rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 focus:outline-none w-48 sm:w-56"
              />
            </div>

            {labels.length > 0 && (
              <button
                type="button"
                onClick={handleClearQueue}
                className="rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 px-2.5 py-1.5 text-[11px] font-bold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-300 cursor-pointer whitespace-nowrap shrink-0"
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {filteredLabels.length === 0 ? (
          <div className="py-10 text-center space-y-2.5">
            <QrCode className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-700" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                {labels.length === 0
                  ? "Your label print queue is empty."
                  : "No labels match the current filter."}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {labels.length === 0
                  ? "Add a customer above, paste WhatsApp addresses, upload Excel/CSV, or load sample dispatch labels."
                  : "Try switching back to All or clearing your search query."}
              </p>
            </div>
            {labels.length === 0 ? (
              <button
                type="button"
                onClick={() => {
                  setLabels(INITIAL_SAMPLE_LABELS);
                  setQueueFilter("all");
                  showToast("Loaded sample dispatch labels.");
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 px-3.5 py-2 text-xs font-bold text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Load Sample Dispatch Labels</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setQueueFilter("all");
                  setSearchQuery("");
                }}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-pointer"
              >
                Show All Labels
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto max-h-80 overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs min-w-[980px]">
              <thead className="bg-slate-50 dark:bg-slate-800/95 text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3 w-9">
                    <input
                      type="checkbox"
                      aria-label="Select all visible labels"
                      checked={
                        filteredLabels.length > 0 &&
                        filteredLabels.every((l) => l.selected)
                      }
                      onChange={handleToggleSelectAllVisible}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-2.5 px-2.5">Customer Name</th>
                  <th className="py-2.5 px-2.5">Phone Number</th>
                  <th className="py-2.5 px-2.5">Pincode</th>
                  <th className="py-2.5 px-2.5">Delivery Address (Printed on Label)</th>
                  <th className="py-2.5 px-2.5">Item Code</th>
                  <th className="py-2.5 px-2 text-center">Copies</th>
                  <th className="py-2.5 px-2.5 text-right">Mini QR &amp; Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredLabels.map((item) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                      !item.selected ? "opacity-55" : ""
                    }`}
                  >
                    <td className="py-2 px-3">
                      <input
                        type="checkbox"
                        aria-label={`Select ${item.customerName}`}
                        checked={item.selected}
                        onChange={(e) =>
                          handleUpdateField(item.id, "selected", e.target.checked)
                        }
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </td>

                    {/* Customer Name + Printed indicator */}
                    <td className="py-2 px-2.5">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={item.customerName}
                          onChange={(e) =>
                            handleUpdateField(item.id, "customerName", e.target.value)
                          }
                          className="w-36 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        />
                        {item.printed && (
                          <span
                            title="Already sent to printer"
                            className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 shrink-0"
                          >
                            Printed
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Customer Phone (91 automatically removed) */}
                    <td className="py-2 px-2.5">
                      <input
                        type="tel"
                        value={item.customerPhone}
                        onChange={(e) =>
                          handleUpdateField(
                            item.id,
                            "customerPhone",
                            strip91FromPhone(e.target.value)
                          )
                        }
                        placeholder="9847012345"
                        className="w-28 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-mono tabular-nums font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      />
                    </td>

                    {/* Pincode */}
                    <td className="py-2 px-2.5">
                      <input
                        type="text"
                        maxLength={6}
                        value={item.pincode}
                        onChange={(e) =>
                          handleUpdateField(
                            item.id,
                            "pincode",
                            e.target.value.replace(/\D/g, "").slice(0, 6)
                          )
                        }
                        placeholder="682001"
                        className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-mono tabular-nums font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      />
                    </td>

                    {/* Delivery Address (Printed on Label, excluded from QR) */}
                    <td className="py-2 px-2.5">
                      <input
                        type="text"
                        value={item.deliveryAddress || ""}
                        onChange={(e) =>
                          handleUpdateField(
                            item.id,
                            "deliveryAddress",
                            e.target.value
                          )
                        }
                        placeholder="House, Street, City..."
                        className="w-56 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      />
                    </td>

                    {/* Item Code */}
                    <td className="py-2 px-2.5">
                      <input
                        type="text"
                        value={item.itemCode}
                        onChange={(e) =>
                          handleUpdateField(
                            item.id,
                            "itemCode",
                            e.target.value.toUpperCase()
                          )
                        }
                        className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-mono font-bold uppercase text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      />
                    </td>

                    {/* Copies */}
                    <td className="py-2 px-2 text-center">
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={item.copies}
                        onChange={(e) =>
                          handleUpdateField(
                            item.id,
                            "copies",
                            Math.max(1, Math.min(50, parseInt(e.target.value, 10) || 1))
                          )
                        }
                        className="w-12 rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-xs font-mono tabular-nums font-bold text-center text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      />
                    </td>

                    {/* Encrypted QR Preview & Actions */}
                    <td className="py-2 px-2.5 text-right">
                      <div className="inline-flex items-center gap-1 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handlePrintSingleRow(item.id)}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 dark:border-slate-700 dark:hover:bg-slate-800 dark:text-slate-300 cursor-pointer"
                          title="Quick-print only this label"
                        >
                          <Printer className="h-3 w-3" />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setInspectItemId((prev) =>
                              prev === item.id ? null : item.id
                            )
                          }
                          className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-bold cursor-pointer ${
                            inspectItemId === item.id
                              ? "border-indigo-600 bg-indigo-600 text-white"
                              : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                          title="Inspect Encrypted Office Mini QR"
                        >
                          <QrCode className="h-3 w-3" />
                          <span>QR</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleCopyQrPayload(item.id, item.encryptedQr)
                          }
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 dark:border-slate-700 dark:hover:bg-slate-800 dark:text-slate-300 cursor-pointer"
                          title="Copy Encrypted TFQR1 string"
                        >
                          {copiedId === item.id ? (
                            <Check className="h-3 w-3 text-emerald-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>

                        {onSimulateScanInIntake && (
                          <button
                            type="button"
                            onClick={() => onSimulateScanInIntake(item.encryptedQr)}
                            className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/70 dark:hover:bg-indigo-900/70 px-2 py-1 text-[10px] font-bold text-indigo-700 dark:text-indigo-300 cursor-pointer"
                            title="Simulate scanning this Encrypted Mini QR in Add Consignment"
                          >
                            <ScanLine className="h-3 w-3" />
                            <span>Test Scan</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleRemoveLabel(item.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer"
                          title="Remove label"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Encrypted Mini QR Live Inspector Drawer */}
        {inspectItemId &&
          (() => {
            const target = enrichedLabels.find((l) => l.id === inspectItemId);
            if (!target) return null;
            const decrypted = decryptCustomerMiniQR(target.encryptedQr);
            return (
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 dark:border-indigo-900/60 dark:bg-indigo-950/30 p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <MiniQrSvg
                    value={target.encryptedQr}
                    sizePx={80}
                    className="p-1 border border-indigo-200 shrink-0"
                  />
                  <div className="space-y-1 text-xs min-w-0 flex-1">
                    <div className="font-extrabold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <span>
                        Encrypted Office Mini QR Payload (Address excluded to keep QR compact)
                      </span>
                    </div>
                    <div className="font-mono text-[11px] bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800 text-slate-800 dark:text-slate-200 break-all">
                      {target.encryptedQr}
                    </div>
                    {decrypted.isValid && decrypted.data && (
                      <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold">
                        ✓ Feeds into Add Consignment:{" "}
                        <span className="font-mono">
                          Name: {decrypted.data.customerName} · Phone:{" "}
                          {decrypted.data.customerPhone} · PIN:{" "}
                          {decrypted.data.pincode} · Item:{" "}
                          {decrypted.data.itemCode}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectItemId(null)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 self-end sm:self-center cursor-pointer shrink-0"
                >
                  Close
                </button>
              </div>
            );
          })()}
      </div>

      {/* ================================================================= */}
      {/* 4. PRINT SHEET CONTROLS & LIVE PRINTABLE MINI QR LABEL SHEET       */}
      {/* ================================================================= */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          {/* Paper Layout Selector */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-1">
              Paper Layout:
            </span>
            {(
              [
                { id: "mini_3col", label: "3-Col Labels (21/A4)" },
                { id: "standard_2col", label: "2-Col Dispatch Labels (8/A4)" },
                { id: "thermal_1col", label: "Thermal Roll (4×3\")" },
                { id: "security_4col", label: "4-Col Compact Labels" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setLabelLayout(opt.id)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  labelLayout === opt.id
                    ? "bg-indigo-600 text-white"
                    : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Label Text Privacy Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setPhoneDisplayMode((prev) =>
                  prev === "full" ? "masked" : prev === "masked" ? "hidden" : "full"
                )
              }
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer whitespace-nowrap shrink-0"
              title="Control how customer phone is printed on label text (Full phone is always inside the Encrypted Mini QR)"
            >
              {phoneDisplayMode === "hidden" ? (
                <EyeOff className="h-3.5 w-3.5 text-amber-600" />
              ) : (
                <Eye className="h-3.5 w-3.5 text-indigo-600" />
              )}
              <span>
                Phone Text:{" "}
                {phoneDisplayMode === "full"
                  ? "Full"
                  : phoneDisplayMode === "masked"
                  ? "Masked (•••)"
                  : "QR Only"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowItemCodeTextOnLabel((p) => !p)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer whitespace-nowrap shrink-0"
            >
              {showItemCodeTextOnLabel ? (
                <Eye className="h-3.5 w-3.5 text-indigo-600" />
              ) : (
                <EyeOff className="h-3.5 w-3.5 text-amber-600" />
              )}
              <span>Item Text: {showItemCodeTextOnLabel ? "Shown" : "QR Only"}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowReturnAddressOnLabel((p) => !p)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer whitespace-nowrap shrink-0"
            >
              <FileText className="h-3.5 w-3.5 text-indigo-600" />
              <span>Return Hub: {showReturnAddressOnLabel ? "Shown" : "Hidden"}</span>
            </button>
          </div>
        </div>

        {/* Live Printable Sheet Preview & Print Source DOM */}
        <div
          ref={printableSheetRef}
          className="rounded-2xl border border-slate-200 bg-slate-100/70 p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-950/50"
        >
          {printableExpandedLabels.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Select at least one customer label in the queue above to preview and print.
            </div>
          ) : (
            <div
              className={`print-grid grid gap-3.5 ${
                labelLayout === "security_4col"
                  ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
                  : labelLayout === "mini_3col"
                  ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                  : labelLayout === "standard_2col"
                  ? "grid-cols-1 md:grid-cols-2"
                  : "grid-cols-1 max-w-md mx-auto"
              }`}
            >
              {printableExpandedLabels.map((item, idx) => {
                const formattedPhoneText = formatPhoneForLabelDisplay(
                  item.customerPhone,
                  phoneDisplayMode
                );

                return (
                  <div
                    key={`${item.id}-copy-${item.copyIndex}-${idx}`}
                    className={`label-card rounded-xl border-2 border-slate-900 bg-white p-3.5 text-slate-950 flex items-stretch justify-between gap-3 break-inside-avoid ${
                      labelLayout === "thermal_1col" ? "thermal-break" : ""
                    }`}
                  >
                    {/* Left Column: Customer Dispatch Information (Includes Delivery Address on Label) */}
                    <div className="label-left min-w-0 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="label-header flex items-center justify-between gap-1 border-b border-slate-200 pb-1">
                          <span className="office-title text-[9px] font-black uppercase tracking-wider text-slate-700 truncate">
                            {senderOfficeTitle || "OFFICE DISPATCH"}
                          </span>
                          <span className="badge-dark rounded bg-slate-900 px-1.5 py-0.5 font-mono text-[8.5px] font-black text-white shrink-0">
                            {item.awbHint ? `AWB: ${item.awbHint}` : "MINI-QR"}
                          </span>
                        </div>

                        <div className="pt-1">
                          <div className="deliver-label text-[9px] font-extrabold uppercase text-slate-400">
                            Deliver To:
                          </div>
                          <div className="customer-name text-sm font-black text-slate-950 leading-tight break-words">
                            {item.customerName || "Customer"}
                          </div>
                          {item.deliveryAddress && (
                            <div className="address-line text-[11px] font-semibold text-slate-800 mt-1 leading-snug break-words">
                              {item.deliveryAddress}
                            </div>
                          )}
                        </div>

                        <div className="pin-phone-row flex flex-wrap items-center gap-2 mt-2">
                          <span className="pin-box rounded border-[1.5px] border-slate-900 bg-slate-50 px-2 py-0.5 font-mono tabular-nums text-xs font-black text-slate-950">
                            PIN: {item.pincode || "------"}
                          </span>
                        </div>

                        {formattedPhoneText && (
                          <div className="phone-line font-mono tabular-nums text-[11px] font-extrabold text-slate-900 mt-1">
                            Mob: {formattedPhoneText}
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="meta-footer flex items-center justify-between gap-2 pt-1.5 mt-2 border-t border-dashed border-slate-300 text-[10px]">
                          {showItemCodeTextOnLabel ? (
                            <span className="font-mono font-black text-slate-900">
                              ITEM: {item.itemCode}
                            </span>
                          ) : (
                            <span className="font-mono font-bold text-slate-400">
                              ENCRYPTED QR TAG
                            </span>
                          )}
                          {item.copies > 1 && (
                            <span className="font-mono tabular-nums text-[9px] font-bold text-slate-500">
                              #{item.copyIndex}/{item.copies}
                            </span>
                          )}
                        </div>

                        {showReturnAddressOnLabel &&
                          (labelLayout === "standard_2col" ||
                            labelLayout === "thermal_1col") && (
                            <div className="return-line text-[9px] font-bold text-slate-500 mt-1 pt-1 border-t border-slate-100 truncate">
                              From: {senderOfficeHub}
                              {senderOfficePhone ? ` · ${senderOfficePhone}` : ""}
                            </div>
                          )}
                      </div>
                    </div>

                    {/* Right Column: Encrypted Mini QR Code for Office Camera Scan (No Address in QR) */}
                    <div className="qr-col flex flex-col items-center justify-center shrink-0 border-l border-dashed border-slate-300 pl-2.5">
                      <MiniQrSvg
                        value={item.encryptedQr}
                        sizePx={
                          labelLayout === "security_4col"
                            ? 72
                            : labelLayout === "mini_3col"
                            ? 84
                            : 96
                        }
                      />
                      <span className="qr-caption mt-1 font-mono text-[8px] font-extrabold uppercase tracking-wider text-slate-500">
                        OFFICE SCAN
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Dedicated offscreen sheet container for zero-flicker single-row quick print */}
        {singlePrintTargetId &&
          (() => {
            const targetItem = enrichedLabels.find(
              (l) => l.id === singlePrintTargetId
            );
            if (!targetItem) return null;
            const copiesCount = Math.max(1, Math.min(50, targetItem.copies || 1));
            const formattedPhoneText = formatPhoneForLabelDisplay(
              targetItem.customerPhone,
              phoneDisplayMode
            );
            return (
              <div ref={singlePrintSheetRef} className="hidden" aria-hidden="true">
                <div className="print-grid">
                  {Array.from({ length: copiesCount }, (_, cIdx) => (
                    <div
                      key={`single-${targetItem.id}-${cIdx}`}
                      className={`label-card ${
                        labelLayout === "thermal_1col" ? "thermal-break" : ""
                      }`}
                    >
                      <div className="label-left">
                        <div>
                          <div className="label-header">
                            <span className="office-title">
                              {senderOfficeTitle || "OFFICE DISPATCH"}
                            </span>
                            <span className="badge-dark">
                              {targetItem.awbHint
                                ? `AWB: ${targetItem.awbHint}`
                                : "MINI-QR"}
                            </span>
                          </div>
                          <div>
                            <div className="deliver-label">Deliver To:</div>
                            <div className="customer-name">
                              {targetItem.customerName || "Customer"}
                            </div>
                            {targetItem.deliveryAddress && (
                              <div className="address-line">
                                {targetItem.deliveryAddress}
                              </div>
                            )}
                          </div>
                          <div className="pin-phone-row">
                            <span className="pin-box">
                              PIN: {targetItem.pincode || "------"}
                            </span>
                          </div>
                          {formattedPhoneText && (
                            <div className="phone-line">
                              Mob: {formattedPhoneText}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="meta-footer">
                            <span>
                              {showItemCodeTextOnLabel
                                ? `ITEM: ${targetItem.itemCode}`
                                : "ENCRYPTED QR TAG"}
                            </span>
                            {copiesCount > 1 && (
                              <span>
                                #{cIdx + 1}/{copiesCount}
                              </span>
                            )}
                          </div>
                          {showReturnAddressOnLabel &&
                            (labelLayout === "standard_2col" ||
                              labelLayout === "thermal_1col") && (
                              <div className="return-line">
                                From: {senderOfficeHub}
                                {senderOfficePhone
                                  ? ` · ${senderOfficePhone}`
                                  : ""}
                              </div>
                            )}
                        </div>
                      </div>
                      <div className="qr-col">
                        <MiniQrSvg
                          value={targetItem.encryptedQr}
                          sizePx={
                            labelLayout === "security_4col"
                              ? 72
                              : labelLayout === "mini_3col"
                              ? 84
                              : 96
                          }
                        />
                        <span className="qr-caption">OFFICE SCAN</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
      </div>
    </div>
  );
}
