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
    regex: /^[A-Z]{2}\d{9}[A-Z]{2}$/i,
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
    regex: /^[A-Z]{1,2}\d{7,12}$/i,
    sampleNumber: "B4000211866",
    formatDescription: "8–14 chars: 1–2 letters + 7–12 digits (e.g., B4000211866)",
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
    regex: /^(?!FMPA)[A-Z]{4}\d{10}$/i,
    sampleNumber: "FMPP4397267510",
    formatDescription: "14 chars: 4 letters + 10 digits (e.g., FMPP4397267510)",
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
    regex: /^\d{11}$/i,
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
    regex: /^(?:\d{13,14}|\d{16,18})$/i,
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
    regex: /^(?:SF\d{8,14}[A-Z]{0,3}|R\d{8,14}[A-Z]{1,3})$/i,
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
    regex: /^VL\d{12,14}$/i,
    sampleNumber: "VL9384729104821",
    formatDescription: "14–16 chars: VL followed by 12–14 digits",
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
    regex: /^\d{15}$/i,
    sampleNumber: "148293847192810",
    formatDescription: "15 numeric digits (e.g., 148293847192810)",
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
    regex: /^MY[A-Z]{2}\d{10}$/i,
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
    regex: /^\d{12}$/i,
    sampleNumber: "948291048291",
    formatDescription: "12 numeric digits (e.g., 948291048291)",
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
    regex: /^SM\d{9,12}$/i,
    sampleNumber: "SM8492019482",
    formatDescription: "11–14 chars: SM + 9–12 digits",
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
    regex: /^\d{10}$/i,
    sampleNumber: "9384729104",
    formatDescription: "10 numeric digits",
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
    regex: /^\d{8,9}$/i,
    sampleNumber: "748291048",
    formatDescription: "8 to 9 numeric digits",
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
    regex: /^FMPA\d{10}$/i,
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
    regex: /^MSH\d{10,13}$/i,
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
    regex: /^[A-Z]{2}\d{9}AE$/i,
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
    regex: /^ABSEPS\d{10}$/i,
    sampleNumber: "ABSEPS9281048291",
    formatDescription: "16 chars: ABSEPS + 10 digits",
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
    regex: /^[A-Z]{2}\d{9}OM$/i,
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
    regex: /^[A-Z]{2}\d{9}PH$/i,
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
    regex: /^P\d{12,14}$/i,
    sampleNumber: "P9482910482910",
    formatDescription: "13–15 chars: P + 12–14 digits",
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

const DETECTION_PRIORITY_ORDER = [...COURIER_LIST]
  .filter(c => !c.fallback)
  .sort((a, b) => a.priority - b.priority);

const DETECTION_FALLBACK = COURIER_LIST.find(c => c.fallback);

export interface ConsignmentIdentification {
  isValid: boolean;
  normalized: string;
  courier: CourierConfig | null;
  formatLabel: string;
  length: number;
  formatName?: string;
  lengthLabel?: string;
  error?: string;
}

/**
 * Logical Consignment ID Format, Length & Carrier Auto-Identification Engine:
 * Evaluates structure, prefix, suffix, total length, and numeric digit count
 * for both Manual Entry and Camera Barcode/QR Scanning.
 */
export function identifyAndValidateConsignment(rawCode: string): ConsignmentIdentification {
  if (!rawCode || typeof rawCode !== "string") {
    return {
      isValid: false,
      normalized: "",
      courier: null,
      formatLabel: "Empty ID",
      length: 0,
      error: "Consignment ID cannot be empty.",
    };
  }

  const clean = rawCode.trim().toUpperCase().replace(/\s+/g, "");
  if (!clean) {
    return {
      isValid: false,
      normalized: "",
      courier: null,
      formatLabel: "Empty ID",
      length: 0,
      error: "Consignment ID cannot be empty.",
    };
  }

  // 1. Check for illegal characters (only letters, digits, and optional single hyphens)
  if (/[^A-Z0-9-]/.test(clean) || clean.startsWith("-") || clean.endsWith("-") || clean.includes("--")) {
    return {
      isValid: false,
      normalized: clean,
      courier: null,
      formatLabel: "Invalid Characters",
      length: clean.length,
      error: "Invalid format: Only letters and digits are allowed in Consignment IDs.",
    };
  }

  // Strip optional hyphens for structural analysis
  const compact = clean.replace(/-/g, "");
  const len = compact.length;

  // 2. Check specific prefix/suffix partial errors BEFORE general length check so user gets exact logical feedback
  // Postal UPU S10 candidate (starts with 2 letters and ends with IN, AE, OM, PH)
  if (/^[A-Z]{2}\d+(?:IN|AE|OM|PH)$/.test(compact) && len !== 13) {
    return {
      isValid: false,
      normalized: compact,
      courier: null,
      formatLabel: "Postal S10 (Requires 13 chars)",
      length: len,
      error: `Invalid Postal ID length (${len} chars). Postal Consignment IDs must be exactly 13 characters: 2 letters + 9 digits + 2 country letters (e.g. EL855948618IN).`,
    };
  }

  // Valmo candidate (starts with VL)
  if (/^VL\d+$/.test(compact) && (len < 14 || len > 16)) {
    return {
      isValid: false,
      normalized: compact,
      courier: null,
      formatLabel: "Valmo AWB (Requires 14–16 chars)",
      length: len,
      error: `Invalid Valmo ID length (${len} chars). Expected VL followed by 12–14 digits (14–16 chars, e.g. VL9384729104821).`,
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
      error: `Invalid Saudi Post ID (${len} chars). Expected ABSEPS + 10 digits (16 chars).`,
    };
  }

  // 3. General Length Boundaries (8 to 20 characters)
  if (len < 8) {
    return {
      isValid: false,
      normalized: compact,
      courier: null,
      formatLabel: "Need 8–20 chars",
      length: len,
      error: `Too short (${len} chars). Valid Consignment IDs require 8 to 20 characters (e.g. EL855948618IN or B4000211866).`,
    };
  }
  if (len > 20) {
    return {
      isValid: false,
      normalized: compact,
      courier: null,
      formatLabel: "Exceeds 20 chars",
      length: len,
      error: `Too long (${len} chars). Valid Consignment IDs are between 8 and 20 characters.`,
    };
  }

  // 4. Digit Count & Anti-Gibberish Check: Every real Consignment ID has at least 7 numeric digits
  const digitMatches = compact.match(/\d/g);
  const digitCount = digitMatches ? digitMatches.length : 0;
  if (digitCount < 7) {
    return {
      isValid: false,
      normalized: compact,
      courier: null,
      formatLabel: "Need at least 7 digits",
      length: len,
      error: `Invalid Consignment ID: Contains only ${digitCount} digit${digitCount === 1 ? "" : "s"}. A valid tracking ID requires at least 7 digits.`,
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
      error: "Invalid Consignment ID: Repetitive placeholder digits are not allowed.",
    };
  }

  // 5. Match against Priority-Ordered Carrier Formats
  for (const c of DETECTION_PRIORITY_ORDER) {
    if (c.regex.test(compact)) {
      return {
        isValid: true,
        normalized: compact,
        courier: c,
        formatLabel: `${c.shortName} Format`,
        length: len,
        formatName: `${c.shortName} Format`,
        lengthLabel: `${len} chars`,
      };
    }
  }

  // 6. Match DTDC (1–2 letters + 7–12 digits, 8–14 chars total)
  if (DETECTION_FALLBACK && DETECTION_FALLBACK.regex.test(compact)) {
    return {
      isValid: true,
      normalized: compact,
      courier: DETECTION_FALLBACK,
      formatLabel: "DTDC Alphanumeric AWB",
      length: len,
      formatName: "DTDC Alphanumeric AWB",
      lengthLabel: `${len} chars`,
    };
  }

  // 7. Standard Courier Alphanumeric Prefix + Digits + Optional Country/Hub Suffix (e.g. 1–4 letters + 7–14 digits + 0–2 letters)
  if (/^[A-Z]{1,4}\d{7,14}[A-Z]{0,2}$/.test(compact)) {
    const fallbackCarrier = DETECTION_FALLBACK || COURIER_LIST[0];
    return {
      isValid: true,
      normalized: compact,
      courier: fallbackCarrier,
      formatLabel: "Standard Express AWB",
      length: len,
      formatName: "Standard Express AWB",
      lengthLabel: `${len} chars`,
    };
  }

  return {
    isValid: false,
    normalized: compact,
    courier: null,
    formatLabel: "Unrecognized Structure",
    length: len,
    error: `Unrecognized Consignment ID structure (${len} chars). Use a valid format like EL855948618IN (13 chars), B4000211866 (11 chars), or 8–18 digit AWB.`,
  };
}

export function autoDetectCourier(trackingNumber: string): CourierConfig | null {
  const result = identifyAndValidateConsignment(trackingNumber);
  if (result.courier) return result.courier;

  if (!trackingNumber) return null;
  const cleaned = trackingNumber.trim().toUpperCase().replace(/[\s-]+/g, "");
  if (!cleaned) return null;

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
  error?: string;
} {
  return identifyAndValidateConsignment(code);
}


