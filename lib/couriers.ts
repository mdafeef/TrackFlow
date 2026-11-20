export interface CourierConfig {
  id: string;
  name: string;
  shortName: string;
  label: string;
  priority: number;
  regex: RegExp;
  sampleNumber: string;
  formatDescription: string;
  badgeColor: {
    bg: string;
    text: string;
    border: string;
    darkBg: string;
    darkText: string;
    darkBorder: string;
  };
  avgTransitDays: string;
  coverage: string;
  supportPhone?: string;
  supportEmail?: string;
  fallback?: boolean;
}

export const COURIER_LIST: CourierConfig[] = [
  {
    id: "speedpost",
    name: "India Post Speed Post",
    shortName: "Speed Post",
    label: "India Post",
    priority: 4,
    regex: /^[A-Z]{2}\d{9}(?:IN|[A-Z]{2})$/,
    sampleNumber: "EL855948618IN",
    formatDescription: "13 chars: 2 letters + 9 digits + 2 letters (e.g., EL855948618IN)",
    badgeColor: {
      bg: "bg-red-50",
      text: "text-red-700",
      border: "border-red-200",
      darkBg: "dark:bg-red-950/40",
      darkText: "dark:text-red-300",
      darkBorder: "dark:border-red-800/50"
    },
    avgTransitDays: "2-5 days",
    coverage: "Pan-India & Global EMS",
    supportPhone: "1800-266-6868",
    supportEmail: "customer.care@indiapost.gov.in"
  },
  {
    id: "dtdc",
    name: "DTDC Courier & Cargo",
    shortName: "DTDC",
    label: "DTDC",
    priority: 10,
    fallback: true,
    regex: /^(?:[A-Z]{1,2}\d{7,12}|7[A-Z]\d{7,10})$/,
    sampleNumber: "B4000211866",
    formatDescription: "8–14 chars: 1–2 letters + 7–12 digits or 7X series (e.g., B4000211866)",
    badgeColor: {
      bg: "bg-blue-50",
      text: "text-blue-700",
      border: "border-blue-200",
      darkBg: "dark:bg-blue-950/40",
      darkText: "dark:text-blue-300",
      darkBorder: "dark:border-blue-800/50"
    },
    avgTransitDays: "1-4 days",
    coverage: "Domestic & 240+ Countries",
    supportPhone: "080-25365032",
    supportEmail: "customersupport@dtdc.com"
  },
  {
    id: "ekart",
    name: "Ekart Logistics",
    shortName: "Ekart",
    label: "Ekart",
    priority: 6,
    regex: /^(?!FMPA)(?:FMP[A-Z]\d{10}|EK[A-Z]{1,2}\d{9,11}|[A-Z]{4}\d{10})$/,
    sampleNumber: "FMPP4397267510",
    formatDescription: "13–15 chars: FMPP/FMPC/EKART prefix + 9–11 digits (e.g., FMPP4397267510)",
    badgeColor: {
      bg: "bg-amber-50",
      text: "text-amber-700",
      border: "border-amber-200",
      darkBg: "dark:bg-amber-950/40",
      darkText: "dark:text-amber-300",
      darkBorder: "dark:border-amber-800/50"
    },
    avgTransitDays: "2-4 days",
    coverage: "Pan-India Ecommerce Logistics",
    supportPhone: "1800-208-9898",
    supportEmail: "support@ekartlogistics.com"
  },
  {
    id: "bluedart",
    name: "BlueDart Express",
    shortName: "BlueDart",
    label: "Blue Dart",
    priority: 5,
    regex: /^\d{11}$/,
    sampleNumber: "73921849201",
    formatDescription: "11 numeric digits (e.g., 73921849201)",
    badgeColor: {
      bg: "bg-sky-50",
      text: "text-sky-700",
      border: "border-sky-200",
      darkBg: "dark:bg-sky-950/40",
      darkText: "dark:text-sky-300",
      darkBorder: "dark:border-sky-800/50"
    },
    avgTransitDays: "1-3 days",
    coverage: "Pan-India Express Air & Ground",
    supportPhone: "1860-233-1234",
    supportEmail: "customerservice@bluedart.com"
  },
  {
    id: "delhivery",
    name: "Delhivery Express",
    shortName: "Delhivery",
    label: "Delhivery",
    priority: 7,
    regex: /^(?:\d{13,14}|\d{16,18})$/,
    sampleNumber: "3892104928172",
    formatDescription: "13–14 or 16–18 numeric digits (e.g., 3892104928172)",
    badgeColor: {
      bg: "bg-red-50",
      text: "text-red-700",
      border: "border-red-200",
      darkBg: "dark:bg-red-950/40",
      darkText: "dark:text-red-300",
      darkBorder: "dark:border-red-800/50"
    },
    avgTransitDays: "2-4 days",
    coverage: "Pan-India Express Network",
    supportPhone: "0124-6719500",
    supportEmail: "customer.support@delhivery.com"
  },
  {
    id: "shadowfax",
    name: "Shadowfax Technologies",
    shortName: "Shadowfax",
    label: "Shadowfax",
    priority: 8,
    regex: /^(?:SF\d{8,14}[A-Z]{0,3}|R\d{8,14}[A-Z]{1,3})$/,
    sampleNumber: "SF84928104IND",
    formatDescription: "10–19 chars: SF or R + 8–14 digits + suffix",
    badgeColor: {
      bg: "bg-violet-50",
      text: "text-violet-700",
      border: "border-violet-200",
      darkBg: "dark:bg-violet-950/40",
      darkText: "dark:text-violet-300",
      darkBorder: "dark:border-violet-800/50"
    },
    avgTransitDays: "1-3 days",
    coverage: "Hyperlocal & Pan-India E-commerce",
    supportPhone: "1800-123-5656",
    supportEmail: "helpdesk@shadowfax.in"
  },
  {
    id: "valmo",
    name: "Valmo (Meesho Logistics)",
    shortName: "Valmo",
    label: "Valmo",
    priority: 0,
    regex: /^VL\d{10,15}$/,
    sampleNumber: "VL9384729104821",
    formatDescription: "12–17 chars: VL followed by 10–15 digits",
    badgeColor: {
      bg: "bg-fuchsia-50",
      text: "text-fuchsia-700",
      border: "border-fuchsia-200",
      darkBg: "dark:bg-fuchsia-950/40",
      darkText: "dark:text-fuchsia-300",
      darkBorder: "dark:border-fuchsia-800/50"
    },
    avgTransitDays: "3-6 days",
    coverage: "Tier-2, 3 & 4 India Pin Codes",
    supportPhone: "080-61799600",
    supportEmail: "support@valmo.in"
  },
  {
    id: "xpressbees",
    name: "XpressBees",
    shortName: "XpressBees",
    label: "XpressBees",
    priority: 14,
    regex: /^(?:\d{15}|XB\d{10,14})$/,
    sampleNumber: "148293847192810",
    formatDescription: "15 numeric digits or XB + 10–14 digits (e.g., 148293847192810)",
    badgeColor: {
      bg: "bg-yellow-50",
      text: "text-yellow-700",
      border: "border-yellow-200",
      darkBg: "dark:bg-yellow-950/40",
      darkText: "dark:text-yellow-300",
      darkBorder: "dark:border-yellow-800/50"
    },
    avgTransitDays: "2-5 days",
    coverage: "Pan-India Express Parcel Service",
    supportPhone: "020-49116100",
    supportEmail: "customercare@xpressbees.com"
  },
  {
    id: "myntra",
    name: "Myntra Logistics",
    shortName: "Myntra",
    label: "Myntra",
    priority: 3,
    regex: /^MY[A-Z]{2}\d{10}$/,
    sampleNumber: "MYEX8492019482",
    formatDescription: "14 chars: MY + 2 letters + 10 digits",
    badgeColor: {
      bg: "bg-rose-50",
      text: "text-rose-700",
      border: "border-rose-200",
      darkBg: "dark:bg-rose-950/40",
      darkText: "dark:text-rose-300",
      darkBorder: "dark:border-rose-800/50"
    },
    avgTransitDays: "2-4 days",
    coverage: "Fashion E-commerce Logistics",
    supportPhone: "080-61561999",
    supportEmail: "support@myntra.com"
  },
  {
    id: "safexpress",
    name: "Safexpress B2B & Supply Chain",
    shortName: "Safexpress",
    label: "Safexpress",
    priority: 15,
    regex: /^(?:\d{12}|SFX\d{9,12})$/,
    sampleNumber: "948291048291",
    formatDescription: "12 numeric digits or SFX + 9–12 digits (e.g., 948291048291)",
    badgeColor: {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      border: "border-emerald-200",
      darkBg: "dark:bg-emerald-950/40",
      darkText: "dark:text-emerald-300",
      darkBorder: "dark:border-emerald-800/50"
    },
    avgTransitDays: "3-6 days",
    coverage: "Pan-India 3PL & Heavy Cargo",
    supportPhone: "1800-113-113",
    supportEmail: "customercare@safexpress.com"
  },
  {
    id: "shreemaruti",
    name: "Shree Maruti Courier",
    shortName: "Shree Maruti",
    label: "Shree Maruti",
    priority: 16,
    regex: /^SM[A-Z]?\d{8,12}$/,
    sampleNumber: "SM8492019482",
    formatDescription: "10–15 chars: SM + 8–12 digits",
    badgeColor: {
      bg: "bg-orange-50",
      text: "text-orange-700",
      border: "border-orange-200",
      darkBg: "dark:bg-orange-950/40",
      darkText: "dark:text-orange-300",
      darkBorder: "dark:border-orange-800/50"
    },
    avgTransitDays: "2-5 days",
    coverage: "Western & Northern India Specialty",
    supportPhone: "1800-123-1000",
    supportEmail: "customercare@shreemaruti.com"
  },
  {
    id: "shreeanjani",
    name: "Shree Anjani Courier",
    shortName: "Shree Anjani",
    label: "Shree Anjani",
    priority: 17,
    regex: /^(?:\d{10}|SA\d{8,11})$/,
    sampleNumber: "9384729104",
    formatDescription: "10 numeric digits or SA + 8–11 digits",
    badgeColor: {
      bg: "bg-amber-50",
      text: "text-amber-700",
      border: "border-amber-200",
      darkBg: "dark:bg-amber-950/40",
      darkText: "dark:text-amber-300",
      darkBorder: "dark:border-amber-800/50"
    },
    avgTransitDays: "2-4 days",
    coverage: "National Document & Parcel",
    supportPhone: "079-25461202",
    supportEmail: "info@shreeanjanicourier.com"
  },
  {
    id: "akashganga",
    name: "Akash Ganga Courier",
    shortName: "Akash Ganga",
    label: "Akash Ganga",
    priority: 18,
    regex: /^(?:\d{8,9}|AG\d{7,10})$/,
    sampleNumber: "748291048",
    formatDescription: "8–9 numeric digits or AG + 7–10 digits",
    badgeColor: {
      bg: "bg-teal-50",
      text: "text-teal-700",
      border: "border-teal-200",
      darkBg: "dark:bg-teal-950/40",
      darkText: "dark:text-teal-300",
      darkBorder: "dark:border-teal-800/50"
    },
    avgTransitDays: "3-5 days",
    coverage: "Tier 2/3 Cities & Rural Networks",
    supportPhone: "0151-2200388",
    supportEmail: "helpdesk@akashganga.info"
  },
  {
    id: "flipkart",
    name: "Flipkart Shipping Services",
    shortName: "Flipkart",
    label: "Flipkart",
    priority: 5,
    regex: /^FMPA\d{10}$/,
    sampleNumber: "FMPA9281048291",
    formatDescription: "14 chars: FMPA followed by 10 digits",
    badgeColor: {
      bg: "bg-blue-50",
      text: "text-blue-700",
      border: "border-blue-200",
      darkBg: "dark:bg-blue-950/40",
      darkText: "dark:text-blue-300",
      darkBorder: "dark:border-blue-800/50"
    },
    avgTransitDays: "2-4 days",
    coverage: "Flipkart Marketplace Network",
    supportPhone: "1800-208-9898",
    supportEmail: "cs@flipkart.com"
  },
  {
    id: "meesho",
    name: "Meesho Logistics Network",
    shortName: "Meesho",
    label: "Meesho",
    priority: 19,
    regex: /^MSH\d{10,13}$/,
    sampleNumber: "MSH8492018471",
    formatDescription: "13–16 chars: MSH + 10–13 digits",
    badgeColor: {
      bg: "bg-pink-50",
      text: "text-pink-700",
      border: "border-pink-200",
      darkBg: "dark:bg-pink-950/40",
      darkText: "dark:text-pink-300",
      darkBorder: "dark:border-pink-800/50"
    },
    avgTransitDays: "3-7 days",
    coverage: "Pan-India Social Commerce",
    supportPhone: "080-61799600",
    supportEmail: "help@meesho.com"
  },
  {
    id: "emiratespost",
    name: "Emirates Post",
    shortName: "Emirates",
    label: "Emirates Post",
    priority: 1,
    regex: /^[A-Z]{2}\d{9}AE$/,
    sampleNumber: "EE928104821AE",
    formatDescription: "13 chars: 2 letters + 9 digits + AE",
    badgeColor: {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      border: "border-emerald-200",
      darkBg: "dark:bg-emerald-950/40",
      darkText: "dark:text-emerald-300",
      darkBorder: "dark:border-emerald-800/50"
    },
    avgTransitDays: "3-7 days",
    coverage: "United Arab Emirates & Global Postal",
    supportPhone: "+971-600-599999",
    supportEmail: "custservice@emiratespost.ae"
  },
  {
    id: "saudipost",
    name: "Saudi Post (SPL)",
    shortName: "SPL",
    label: "Saudi Post",
    priority: 2,
    regex: /^(?:ABSEPS\d{10}|[A-Z]{2}\d{9}SA)$/,
    sampleNumber: "ABSEPS9281048291",
    formatDescription: "16 chars (ABSEPS + 10 digits) or 13 chars (2 letters + 9 digits + SA)",
    badgeColor: {
      bg: "bg-cyan-50",
      text: "text-cyan-700",
      border: "border-cyan-200",
      darkBg: "dark:bg-cyan-950/40",
      darkText: "dark:text-cyan-300",
      darkBorder: "dark:border-cyan-800/50"
    },
    avgTransitDays: "3-8 days",
    coverage: "Kingdom of Saudi Arabia & International",
    supportPhone: "19992",
    supportEmail: "care@splonline.com.sa"
  },
  {
    id: "omanpost",
    name: "Oman Post",
    shortName: "Oman Post",
    label: "Oman Post",
    priority: 2,
    regex: /^[A-Z]{2}\d{9}OM$/,
    sampleNumber: "EE849201948OM",
    formatDescription: "13 chars: 2 letters + 9 digits + OM",
    badgeColor: {
      bg: "bg-indigo-50",
      text: "text-indigo-700",
      border: "border-indigo-200",
      darkBg: "dark:bg-indigo-950/40",
      darkText: "dark:text-indigo-300",
      darkBorder: "dark:border-indigo-800/50"
    },
    avgTransitDays: "4-9 days",
    coverage: "Sultanate of Oman & Global EMS",
    supportPhone: "+968-24170444",
    supportEmail: "inquiry@omanpost.om"
  },
  {
    id: "phlpost",
    name: "PHLPost (Philippine Postal)",
    shortName: "PHLPost",
    label: "PHLPost",
    priority: 3,
    regex: /^[A-Z]{2}\d{9}PH$/,
    sampleNumber: "CP928104821PH",
    formatDescription: "13 chars: 2 letters + 9 digits + PH",
    badgeColor: {
      bg: "bg-indigo-50",
      text: "text-indigo-700",
      border: "border-indigo-200",
      darkBg: "dark:bg-indigo-950/40",
      darkText: "dark:text-indigo-300",
      darkBorder: "dark:border-indigo-800/50"
    },
    avgTransitDays: "5-12 days",
    coverage: "Philippines & Universal Postal Union",
    supportPhone: "+63-2-8527-0107",
    supportEmail: "customercare@phlpost.gov.ph"
  },
  {
    id: "posindonesia",
    name: "Pos Indonesia",
    shortName: "Pos Indo",
    label: "Pos Indonesia",
    priority: 9,
    regex: /^(?:P\d{12,14}|[A-Z]{2}\d{9}ID)$/,
    sampleNumber: "P9482910482910",
    formatDescription: "13–15 chars: P + 12–14 digits or UPU S10 ID",
    badgeColor: {
      bg: "bg-orange-50",
      text: "text-orange-700",
      border: "border-orange-200",
      darkBg: "dark:bg-orange-950/40",
      darkText: "dark:text-orange-300",
      darkBorder: "dark:border-orange-800/50"
    },
    avgTransitDays: "3-8 days",
    coverage: "Republic of Indonesia & International EMS",
    supportPhone: "1500161",
    supportEmail: "halopos@posindonesia.co.id"
  }
];

export const COURIER_MAP: Record<string, CourierConfig> = COURIER_LIST.reduce((acc, c) => {
  acc[c.id] = c;
  return acc;
}, {} as Record<string, CourierConfig>);

const BASE_COURIER_LIST: CourierConfig[] = [...COURIER_LIST];

export const CUSTOM_COURIERS_STORAGE_KEY = "trackflow_custom_couriers";

export interface CustomCourierRecord {
  id: string;
  name: string;
  shortName: string;
  prefix: string;
  minDigits: number;
  maxDigits: number;
  suffix: string;
  sampleNumber: string;
  regexSource: string;
  formatDescription: string;
}

/**
 * Builds a strict alphanumeric regex and human-readable format description
 * from Prefix Letters, Digit Range (min–max), and Suffix Letters.
 */
export function buildCustomCourierRegex(params: {
  prefix?: string;
  minDigits: number;
  maxDigits: number;
  suffix?: string;
}): {
  regexSource: string;
  formatDescription: string;
  sampleNumber: string;
} {
  const cleanPrefix = (params.prefix || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  const cleanSuffix = (params.suffix || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  const minD = Math.max(4, Math.min(18, Math.floor(Number(params.minDigits) || 8)));
  const maxD = Math.max(minD, Math.min(18, Math.floor(Number(params.maxDigits) || minD)));

  const digitQuantifier = minD === maxD ? `{${minD}}` : `{${minD},${maxD}}`;
  const regexSource = `^${cleanPrefix}\\d${digitQuantifier}${cleanSuffix}$`;

  const totalMin = cleanPrefix.length + minD + cleanSuffix.length;
  const totalMax = cleanPrefix.length + maxD + cleanSuffix.length;
  const lenText = totalMin === totalMax ? `${totalMin} chars` : `${totalMin}–${totalMax} chars`;

  const parts: string[] = [];
  if (cleanPrefix) parts.push(`Prefix "${cleanPrefix}"`);
  parts.push(minD === maxD ? `${minD} digits` : `${minD}–${maxD} digits`);
  if (cleanSuffix) parts.push(`Suffix "${cleanSuffix}"`);

  const sampleDigits = "928104829104829104".slice(0, minD);
  const sampleNumber = `${cleanPrefix}${sampleDigits}${cleanSuffix}`;
  const formatDescription = `${lenText}: ${parts.join(" + ")} (e.g., ${sampleNumber})`;

  return { regexSource, formatDescription, sampleNumber };
}

function recordToCourierConfig(rec: CustomCourierRecord): CourierConfig {
  let compiledRegex: RegExp;
  try {
    compiledRegex = new RegExp(rec.regexSource);
  } catch {
    compiledRegex = /^INVALID_CUSTOM_REGEX$/;
  }
  return {
    id: rec.id,
    name: rec.name,
    shortName: rec.shortName || rec.name.slice(0, 12),
    label: rec.shortName || rec.name,
    priority: 1,
    regex: compiledRegex,
    sampleNumber: rec.sampleNumber,
    formatDescription: rec.formatDescription,
    badgeColor: {
      bg: "bg-indigo-50",
      text: "text-indigo-700",
      border: "border-indigo-200",
      darkBg: "dark:bg-indigo-950/40",
      darkText: "dark:text-indigo-300",
      darkBorder: "dark:border-indigo-800/50",
    },
    avgTransitDays: "2-5 days",
    coverage: "Custom Configured Carrier",
  };
}

export function getStoredCustomCouriers(): CustomCourierRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CUSTOM_COURIERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function syncCustomCouriersFromStorage(): CourierConfig[] {
  const customRecords = getStoredCustomCouriers();
  const customConfigs = customRecords.map(recordToCourierConfig);

  // Mutate COURIER_LIST and COURIER_MAP in-place so all consumers immediately see custom couriers
  COURIER_LIST.length = 0;
  COURIER_LIST.push(...BASE_COURIER_LIST, ...customConfigs);

  for (const key of Object.keys(COURIER_MAP)) {
    delete COURIER_MAP[key];
  }
  for (const c of COURIER_LIST) {
    COURIER_MAP[c.id] = c;
  }

  return customConfigs;
}

export function saveCustomCourierToStorage(input: {
  name: string;
  shortName?: string;
  prefix?: string;
  minDigits: number;
  maxDigits: number;
  suffix?: string;
}): CustomCourierRecord[] {
  const cleanName = input.name.trim();
  const cleanShort = (input.shortName || cleanName).trim().slice(0, 14);
  const cleanPrefix = (input.prefix || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  const cleanSuffix = (input.suffix || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  const minD = Math.max(4, Math.min(18, Math.floor(Number(input.minDigits) || 8)));
  const maxD = Math.max(minD, Math.min(18, Math.floor(Number(input.maxDigits) || minD)));

  const built = buildCustomCourierRegex({
    prefix: cleanPrefix,
    minDigits: minD,
    maxDigits: maxD,
    suffix: cleanSuffix,
  });

  const slug =
    cleanShort
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "")
      .slice(0, 12) || "custom";

  const newRecord: CustomCourierRecord = {
    id: `custom_${slug}_${Date.now().toString(36)}`,
    name: cleanName,
    shortName: cleanShort,
    prefix: cleanPrefix,
    minDigits: minD,
    maxDigits: maxD,
    suffix: cleanSuffix,
    sampleNumber: built.sampleNumber,
    regexSource: built.regexSource,
    formatDescription: built.formatDescription,
  };

  const current = getStoredCustomCouriers();
  const updated = [newRecord, ...current];
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(CUSTOM_COURIERS_STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  }
  syncCustomCouriersFromStorage();
  return updated;
}

export function deleteCustomCourierFromStorage(id: string): CustomCourierRecord[] {
  const current = getStoredCustomCouriers();
  const updated = current.filter((c) => c.id !== id);
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(CUSTOM_COURIERS_STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  }
  syncCustomCouriersFromStorage();
  return updated;
}

const DETECTION_PRIORITY_ORDER = [...BASE_COURIER_LIST]
  .filter(c => !c.fallback)
  .sort((a, b) => a.priority - b.priority);

const DETECTION_FALLBACK = BASE_COURIER_LIST.find(c => c.fallback);

/**
 * Strict structural format for any courier tracking code:
 * - Zero special characters (strictly A-Z and 0-9 only)
 * - No scattered random letters/digits: letters only appear as prefix (1–8 chars), suffix (1–6 chars), or DTDC 7X prefix
 * - Must contain a contiguous block of at least 4+ digits (for custom couriers) or 7+ digits (for standard couriers)
 */
export const STRICT_TRACKING_STRUCTURAL_REGEX =
  /^(?:\d{8,18}|[A-Z]{1,6}\d{7,15}|[A-Z]{1,2}\d{8,14}[A-Z]{1,3}|7[A-Z]\d{7,10})$/;

export function isCandidateMatchingCustomOrStandardStructure(raw: string): boolean {
  if (!raw || typeof raw !== "string") return false;
  const clean = raw.trim().toUpperCase();
  if (!clean || /[^A-Z0-9]/.test(clean)) return false;
  if (STRICT_TRACKING_STRUCTURAL_REGEX.test(clean)) return true;
  const customConfigs = syncCustomCouriersFromStorage();
  return customConfigs.some((c) => c.regex.test(clean));
}

/**
 * Returns true if the string contains ANY special character, punctuation, symbol, hyphen, or whitespace,
 * or fails strict alphanumeric A-Z0-9 characters.
 */
export function hasSpecialOrInvalidTrackingChars(raw: string): boolean {
  if (!raw || typeof raw !== "string") return true;
  const trimmed = raw.trim();
  if (!trimmed) return true;
  return /[^A-Za-z0-9]/.test(trimmed);
}

export interface ConsignmentIdentification {
  isValid: boolean;
  normalized: string;
  courier: CourierConfig | null;
  formatLabel: string;
  length: number;
  matchedRegex?: string;
  canPasteAnyway?: boolean;
  formatName?: string;
  lengthLabel?: string;
  error?: string;
}

/**
 * Regex-Based Consignment ID Format, Length & Carrier Identification Engine:
 * Strictly rejects any scan containing special characters (hyphens, symbols, punctuation, spaces)
 * and evaluates the pure alphanumeric string against custom and built-in courier partner patterns.
 */
export function identifyAndValidateConsignment(rawCode: string): ConsignmentIdentification {
  if (!rawCode || typeof rawCode !== "string") {
    return {
      isValid: false,
      normalized: "",
      courier: null,
      formatLabel: "Empty ID",
      length: 0,
      canPasteAnyway: false,
      error: "Consignment ID cannot be empty.",
    };
  }

  const clean = rawCode.trim().toUpperCase();
  if (!clean) {
    return {
      isValid: false,
      normalized: "",
      courier: null,
      formatLabel: "Empty ID",
      length: 0,
      canPasteAnyway: false,
      error: "Consignment ID cannot be empty.",
    };
  }

  // 1. STRICT SPECIAL CHARACTER BLOCK: Reject ANY non-alphanumeric character (including -, _, %, $, /, +, ., spaces, etc.)
  if (/[^A-Z0-9]/.test(clean)) {
    return {
      isValid: false,
      normalized: clean,
      courier: null,
      formatLabel: "Invalid Special Characters",
      length: clean.length,
      canPasteAnyway: false,
      error: `Invalid characters in "${clean.slice(0, 20)}". Courier tracking codes only contain letters (A–Z) and numbers (0–9) with no special characters.`,
    };
  }

  const compact = clean;
  const len = compact.length;

  // 1B. Check user-configured Custom Courier Partner patterns FIRST
  const customConfigs = syncCustomCouriersFromStorage();
  for (const customCourier of customConfigs) {
    if (customCourier.regex.test(compact)) {
      return {
        isValid: true,
        normalized: compact,
        courier: customCourier,
        formatLabel: `${customCourier.shortName} (${len} chars)`,
        length: len,
        matchedRegex: customCourier.regex.source,
        canPasteAnyway: true,
        formatName: `${customCourier.shortName} Custom Format`,
        lengthLabel: `${len} chars`,
      };
    }
  }

  // 2. Check specific courier prefix/suffix regex partial errors BEFORE general length check
  // India Post / UPU S10 candidate (starts with 2 letters and ends with 2 letters) -> must match /^[A-Z]{2}\d{9}[A-Z]{2}$/ (13 chars)
  if (/^[A-Z]{2}\d+[A-Z]{2}$/.test(compact) && !/^[A-Z]{2}\d{9}[A-Z]{2}$/.test(compact)) {
    return {
      isValid: false,
      normalized: compact,
      courier: null,
      formatLabel: "India Post / EMS (Requires 13 chars)",
      length: len,
      matchedRegex: "^[A-Z]{2}\\d{9}[A-Z]{2}$",
      canPasteAnyway: false,
      error: `Invalid India Post / EMS length (${len} chars). Must be 13 chars: 2 letters + 9 digits + 2 letters (e.g. EL855948618IN).`,
    };
  }

  // DTDC candidate with 1-2 letter prefix + digits but wrong length (outside 8–14 chars / 7–12 digits)
  if (
    /^[A-Z]{1,2}\d+$/.test(compact) &&
    !/^(?:VL|SM|SF|MY|XB|SA|AG)\d+$/i.test(compact) &&
    !/^P\d{12,14}$/i.test(compact) &&
    !/^[A-Z]{1,2}\d{7,12}$/.test(compact)
  ) {
    return {
      isValid: false,
      normalized: compact,
      courier: null,
      formatLabel: "DTDC Format (Requires 8–14 chars)",
      length: len,
      matchedRegex: "^[A-Z]{1,2}\\d{7,12}$",
      canPasteAnyway: false,
      error: `Invalid DTDC ID length (${len} chars). Must be 8–14 chars: 1–2 letters + 7–12 digits (e.g. B4000211866).`,
    };
  }

  // Valmo candidate (starts with VL)
  if (/^VL\d+$/.test(compact) && (len < 12 || len > 17)) {
    return {
      isValid: false,
      normalized: compact,
      courier: null,
      formatLabel: "Valmo AWB (Requires 12–17 chars)",
      length: len,
      matchedRegex: "^VL\\d{10,15}$",
      canPasteAnyway: false,
      error: `Invalid Valmo ID length (${len} chars). Expected VL followed by 10–15 digits (e.g. VL9384729104821).`,
    };
  }

  // Ekart / Flipkart candidate (starts with FMP)
  if (/^FMP[A-Z]\d+$/.test(compact) && len !== 14) {
    return {
      isValid: false,
      normalized: compact,
      courier: null,
      formatLabel: "Ekart/Flipkart (Requires 14 chars)",
      length: len,
      matchedRegex: "^[A-Z]{4}\\d{10}$",
      canPasteAnyway: false,
      error: `Invalid Ekart/Flipkart ID length (${len} chars). Expected 4 letters + 10 digits (14 chars, e.g. FMPP4397267510).`,
    };
  }

  // Myntra candidate (starts with MY + 2 letters)
  if (/^MY[A-Z]{2}\d+$/.test(compact) && len !== 14) {
    return {
      isValid: false,
      normalized: compact,
      courier: null,
      formatLabel: "Myntra AWB (Requires 14 chars)",
      length: len,
      matchedRegex: "^MY[A-Z]{2}\\d{10}$",
      canPasteAnyway: false,
      error: `Invalid Myntra ID length (${len} chars). Expected MY + 2 letters + 10 digits (14 chars, e.g. MYEX8492019482).`,
    };
  }

  // Saudi Post candidate
  if (compact.startsWith("ABSEPS") && !/^ABSEPS\d{10}$/.test(compact)) {
    return {
      isValid: false,
      normalized: compact,
      courier: null,
      formatLabel: "Saudi Post (Requires 16 chars)",
      length: len,
      matchedRegex: "^ABSEPS\\d{10}$",
      canPasteAnyway: false,
      error: `Invalid Saudi Post ID (${len} chars). Expected ABSEPS + 10 digits (16 chars).`,
    };
  }

  // 3. General Length Boundaries against known courier formats (8 to 19 characters)
  if (len < 8) {
    return {
      isValid: false,
      normalized: compact,
      courier: null,
      formatLabel: `Too Short (${len} chars)`,
      length: len,
      canPasteAnyway: false,
      error: `Too short (${len} chars). Known courier formats require 8–19 alphanumeric chars (e.g. India Post 13 chars: EL855948618IN, DTDC 8–14 chars: B4000211866).`,
    };
  }
  if (len > 19) {
    return {
      isValid: false,
      normalized: compact,
      courier: null,
      formatLabel: `Too Long (${len} chars)`,
      length: len,
      canPasteAnyway: false,
      error: `Too long (${len} chars). Known courier ID formats are 8–19 chars (e.g. India Post 13 chars, DTDC 8–14 chars).`,
    };
  }

  // 4. Strict Structural & Contiguous Digit Verification:
  // Rejects random alternating letters/digits (e.g. "E8W912A4B") caused by 1D barcode edge misreads
  if (!STRICT_TRACKING_STRUCTURAL_REGEX.test(compact)) {
    return {
      isValid: false,
      normalized: compact,
      courier: null,
      formatLabel: "Invalid Tracking Structure",
      length: len,
      canPasteAnyway: false,
      error: `Unrecognized character sequence "${compact}". Courier tracking numbers require a contiguous block of 7+ digits and no scattered letters.`,
    };
  }

  // Reject all-identical repeating digits (e.g. 0000000000 or 1111111111)
  const digitsOnly = compact.replace(/\D/g, "");
  if (/^(\d)\1{6,}$/.test(digitsOnly)) {
    return {
      isValid: false,
      normalized: compact,
      courier: null,
      formatLabel: "Invalid Repeating Digits",
      length: len,
      canPasteAnyway: false,
      error: "Invalid Consignment ID: Repetitive placeholder digits do not match a valid courier format.",
    };
  }

  // 5. Evaluate against Priority-Ordered Known Courier Regex Patterns (India Post, Ekart, BlueDart, Delhivery, etc.)
  for (const c of DETECTION_PRIORITY_ORDER) {
    if (c.regex.test(compact)) {
      return {
        isValid: true,
        normalized: compact,
        courier: c,
        formatLabel: `${c.shortName} (${len} chars)`,
        length: len,
        matchedRegex: c.regex.source,
        canPasteAnyway: true,
        formatName: `${c.shortName} Format`,
        lengthLabel: `${len} chars`,
      };
    }
  }

  // 6. Evaluate against DTDC Regex Pattern (/^(?:[A-Z]{1,2}\d{7,12}|7[A-Z]\d{7,10})$/ — 8 to 14 chars)
  if (DETECTION_FALLBACK && DETECTION_FALLBACK.regex.test(compact)) {
    return {
      isValid: true,
      normalized: compact,
      courier: DETECTION_FALLBACK,
      formatLabel: `DTDC (${len} chars)`,
      length: len,
      matchedRegex: DETECTION_FALLBACK.regex.source,
      canPasteAnyway: true,
      formatName: "DTDC Alphanumeric AWB",
      lengthLabel: `${len} chars`,
    };
  }

  // 7. Unrecognized Format: Pure alphanumeric and structurally plausible, but does not match a specific courier pattern
  return {
    isValid: false,
    normalized: compact,
    courier: null,
    formatLabel: `Unrecognized Format (${len} chars)`,
    length: len,
    canPasteAnyway: true,
    error: `Unrecognized courier format (${len} chars). Does not match India Post (13 chars: EL855948618IN), DTDC (8–14 chars: B4000211866), or other known courier patterns.`,
  };
}

export function autoDetectCourier(trackingNumber: string): CourierConfig | null {
  const result = identifyAndValidateConsignment(trackingNumber);
  if (result.courier) return result.courier;

  if (!trackingNumber) return null;
  const cleaned = trackingNumber.trim().toUpperCase();
  if (!cleaned || /[^A-Z0-9]/.test(cleaned)) return null;

  const customConfigs = syncCustomCouriersFromStorage();
  for (const customCourier of customConfigs) {
    if (customCourier.regex.test(cleaned)) {
      return customCourier;
    }
  }

  for (const c of DETECTION_PRIORITY_ORDER) {
    if (c.regex.test(cleaned)) {
      return c;
    }
  }

  if (DETECTION_FALLBACK && DETECTION_FALLBACK.regex.test(cleaned)) {
    return DETECTION_FALLBACK;
  }

  return null;
}

export function validateConsignmentFormat(code: string): {
  isValid: boolean;
  normalized: string;
  courier?: CourierConfig | null;
  formatName?: string;
  lengthLabel?: string;
  canPasteAnyway?: boolean;
  error?: string;
} {
  return identifyAndValidateConsignment(code);
}



