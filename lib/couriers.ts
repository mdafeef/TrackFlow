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
    priority: 9,
    regex: /^[A-Z]{2}\d{9}[A-Z]{2}$/i,
    sampleNumber: "EL855948618IN",
    formatDescription: "2 letters, 9 digits, 2 letters (e.g., EL855948618IN)",
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
    priority: 999,
    fallback: true,
    regex: /^[A-Z0-9-]{8,32}$/i,
    sampleNumber: "B4000211866",
    formatDescription: "8 to 32 alphanumeric characters (e.g., B4000211866)",
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
    regex: /^[A-Z]{4}\d{10}$/i,
    sampleNumber: "FMPP4397267510",
    formatDescription: "4 letters followed by 10 digits (e.g., FMPP4397267510)",
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
    regex: /^\d{12,18}$/i,
    sampleNumber: "3892104928172",
    formatDescription: "12 to 18 numeric digits (e.g., 3892104928172)",
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
    priority: 12,
    regex: /^(?:SF|R)\d+[A-Z]+$/i,
    sampleNumber: "SF84928104IND",
    formatDescription: "Starts with SF or R followed by digits and letters",
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
    regex: /^VL\d{13}$/i,
    sampleNumber: "VL9384729104821",
    formatDescription: "VL followed by 13 digits (e.g., VL9384729104821)",
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
    regex: /^\d{13,15}$/i,
    sampleNumber: "1482938471928",
    formatDescription: "13 to 15 numeric digits (e.g., 1482938471928)",
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
    priority: 4,
    regex: /^MY[A-Z]{2}\d{10}$/i,
    sampleNumber: "MYEX8492019482",
    formatDescription: "MY followed by 2 letters and 10 digits",
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
    regex: /^\d{11,14}$/i,
    sampleNumber: "84920194821",
    formatDescription: "11 to 14 numeric digits",
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
    priority: 11,
    regex: /^\d{8,16}$/i,
    sampleNumber: "7482910482",
    formatDescription: "8 to 16 numeric digits",
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
    priority: 18,
    regex: /^[A-Z]{4}\d{10}$/i,
    sampleNumber: "FMPA9281048291",
    formatDescription: "4 letters followed by 10 digits",
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
    regex: /^(?:VL\d{13}|(?:SF|R)\d+[A-Z]+)$/i,
    sampleNumber: "VL8492018471928",
    formatDescription: "Valmo ID (VL...) or Shadowfax ID (SF...)",
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
    regex: /^EE\d{9}AE$/i,
    sampleNumber: "EE928104821AE",
    formatDescription: "EE followed by 9 digits and AE",
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
    priority: 8,
    regex: /^ABSEPS\d{10}$/i,
    sampleNumber: "ABSEPS9281048291",
    formatDescription: "ABSEPS followed by 10 digits",
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
    regex: /^EE\d{9}OM$/i,
    sampleNumber: "EE849201948OM",
    formatDescription: "EE followed by 9 digits and OM",
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
    formatDescription: "2 letters, 9 digits, PH",
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
    priority: 10,
    regex: /^(P\d{13}|[A-Z][A-Z0-9]{21,29})$/i,
    sampleNumber: "P9482910482910",
    formatDescription: "P + 13 digits or 22-30 character barcode",
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

export function autoDetectCourier(trackingNumber: string): CourierConfig | null {
  if (!trackingNumber) return null;
  const cleaned = trackingNumber.trim().toUpperCase().replace(/\s+/g, '');
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

/**
 * Strict Consignment ID validation:
 * Validates whether a consignment/tracking code matches either:
 * 1. Standard Postal UPU S10 format: 2 letters + 9 digits + 2 letters (e.g., EK123456789IN, RM123456789IN)
 * 2. Standard courier consignment / AWB format: 8 to 24 alphanumeric characters (A-Z, 0-9, and optional hyphens).
 * Rejects random short strings (< 8 chars), strings > 24 chars, strings with spaces, special characters, commas, slashes, or non-tracking payloads.
 */
export function validateConsignmentFormat(code: string): { isValid: boolean; normalized: string; error?: string } {
  if (!code || typeof code !== "string") {
    return { isValid: false, normalized: "", error: "Consignment ID cannot be empty." };
  }
  const clean = code.trim().toUpperCase().replace(/\s+/g, "");
  if (clean.length < 8) {
    return {
      isValid: false,
      normalized: clean,
      error: `Too short (${clean.length} chars). Valid consignment IDs have at least 8 characters (e.g. EK123456789IN).`,
    };
  }
  if (clean.length > 24) {
    return {
      isValid: false,
      normalized: clean,
      error: `Too long (${clean.length} chars). Valid consignment IDs are between 8 and 24 characters.`,
    };
  }
  if (/[^A-Z0-9-]/.test(clean)) {
    return {
      isValid: false,
      normalized: clean,
      error: "Invalid format. Only letters, digits, and hyphens are permitted (e.g. EK123456789IN).",
    };
  }

  // Must match either standard postal format or standard courier AWB format
  const isPostFormat = /^[A-Z]{2}\d{9}[A-Z]{2}$/.test(clean);
  const isCourierFormat = /^[A-Z0-9-]{8,24}$/.test(clean);

  if (isPostFormat || isCourierFormat) {
    return { isValid: true, normalized: clean };
  }

  return {
    isValid: false,
    normalized: clean,
    error: "Invalid consignment format. Expected format e.g. EK123456789IN or 8–24 alphanumeric digits.",
  };
}

