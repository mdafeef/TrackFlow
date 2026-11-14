import QRCodeEncoder from "@zxing/library/esm/core/qrcode/encoder/Encoder";
import QRCodeDecoderErrorCorrectionLevel from "@zxing/library/esm/core/qrcode/decoder/ErrorCorrectionLevel";

/**
 * Encrypted Office Mini QR & Indian Phone / Pincode Validation Utility
 * - Encrypts { customerName, customerPhone, pincode, itemCode } into a compact
 *   office-only Mini QR payload: `TFQR1:<base64url>` using a stream cipher + CRC16 checksum.
 * - Validates Indian phone numbers with `91` / `+91` or without `91` (10-digit mobile starting 6-9).
 * - Validates 6-digit Indian PIN codes (`100000` - `999999`).
 */

export interface CustomerMiniQrPayload {
  customerName: string;
  customerPhone: string;
  pincode: string;
  itemCode: string;
}

export interface IndianPhoneValidationResult {
  isValid: boolean;
  /** 10-digit normalized Indian mobile number (e.g. "9847012345") */
  normalized10: string;
  /** Formatted with +91 prefix (e.g. "+91 9847012345") */
  formattedWith91: string;
  /** Compact 12-digit with 91 prefix (e.g. "919847012345") */
  with91Compact: string;
  /** Whether the original input included +91 or 91 */
  had91Prefix: boolean;
  error?: string;
}

export interface IndianPincodeValidationResult {
  isValid: boolean;
  normalized: string;
  regionHint?: string;
  error?: string;
}

const PIN_REGION_HINTS: Record<string, string> = {
  "1": "Northern Zone (DL / HR / PB / HP / JK)",
  "2": "Northern Zone (UP / UK)",
  "3": "Western Zone (RJ / GJ)",
  "4": "Western & Central Zone (MH / GA / MP / CG)",
  "5": "Southern Zone (TS / AP / KA)",
  "6": "Southern Zone (TN / KL / PY / LD)",
  "7": "Eastern & NE Zone (WB / OD / AS / NE)",
  "8": "Eastern Zone (BR / JH)",
  "9": "APS (Army Postal Service)",
};

/**
 * Resolves the Indian State / Postal Circle from a 6-digit Indian Pincode prefix.
 */
export function getIndianPostalStateFromPincode(pincode: string): string {
  const clean = (pincode || "").trim();
  if (!/^[1-9]\d{5}$/.test(clean)) return "India";
  const p2 = parseInt(clean.slice(0, 2), 10);
  const p3 = parseInt(clean.slice(0, 3), 10);

  if (p2 === 11) return "Delhi (DL)";
  if (p2 === 12 || p2 === 13) return "Haryana (HR)";
  if (p2 >= 14 && p2 <= 16) return "Punjab / Chandigarh (PB)";
  if (p2 === 17) return "Himachal Pradesh (HP)";
  if (p2 === 18 || p2 === 19) return "Jammu & Kashmir / Ladakh";
  if (p2 >= 20 && p2 <= 28) {
    if (p3 >= 244 && p3 <= 249) return "Uttarakhand (UK)";
    if (p3 >= 262 && p3 <= 263) return "Uttarakhand (UK)";
    return "Uttar Pradesh (UP)";
  }
  if (p2 >= 30 && p2 <= 34) return "Rajasthan (RJ)";
  if (p2 >= 36 && p2 <= 39) return "Gujarat (GJ)";
  if (p3 === 403) return "Goa (GA)";
  if (p2 >= 40 && p2 <= 44) return "Maharashtra (MH)";
  if (p2 >= 45 && p2 <= 48) return "Madhya Pradesh (MP)";
  if (p2 === 49) return "Chhattisgarh (CG)";
  if (p2 === 50) return "Telangana (TS)";
  if (p2 >= 51 && p2 <= 53) return "Andhra Pradesh (AP)";
  if (p2 >= 56 && p2 <= 59) return "Karnataka (KA)";
  if (p2 >= 60 && p2 <= 64) return "Tamil Nadu (TN)";
  if (p3 === 682 && clean === "682555") return "Lakshadweep (LD)";
  if (p2 >= 67 && p2 <= 69) return "Kerala (KL)";
  if (p2 >= 70 && p2 <= 74) return "West Bengal (WB)";
  if (p2 >= 75 && p2 <= 77) return "Odisha (OD)";
  if (p2 === 78) return "Assam (AS)";
  if (p2 === 79) return "North East (NE)";
  if (p2 >= 80 && p2 <= 85) {
    if (p3 >= 814 && p3 <= 835) return "Jharkhand (JH)";
    return "Bihar (BR)";
  }
  if (p2 >= 90 && p2 <= 99) return "Army Postal Service (APS)";
  return PIN_REGION_HINTS[clean[0]] || "India";
}

/**
 * Validates an Indian mobile phone number with `91` / `+91` / `0` prefix or without `91`.
 * Accepts:
 *  - 10 digits starting with 6, 7, 8, or 9 (e.g. 9847012345)
 *  - 12 digits starting with 91 followed by 6-9 (e.g. 919847012345, +91 9847012345, +91-98470-12345)
 *  - 11 digits starting with 0 followed by 6-9 (e.g. 09847012345)
 */
export function validateIndianPhone(rawPhone: string): IndianPhoneValidationResult {
  const trimmed = (rawPhone || "").trim();
  if (!trimmed) {
    return {
      isValid: false,
      normalized10: "",
      formattedWith91: "",
      with91Compact: "",
      had91Prefix: false,
      error: "Customer phone number is required.",
    };
  }

  // Strip spaces, hyphens, parentheses, dots
  const cleaned = trimmed.replace(/[\s\-().]/g, "");
  const digitsOnly = cleaned.replace(/^\+/, "");

  if (!/^\d+$/.test(digitsOnly)) {
    return {
      isValid: false,
      normalized10: "",
      formattedWith91: "",
      with91Compact: "",
      had91Prefix: false,
      error: "Phone number must contain only digits (and optional +91 prefix).",
    };
  }

  let core10 = "";
  let had91Prefix = false;

  if (digitsOnly.length === 10) {
    core10 = digitsOnly;
    had91Prefix = false;
  } else if (digitsOnly.length === 12 && digitsOnly.startsWith("91")) {
    core10 = digitsOnly.slice(2);
    had91Prefix = true;
  } else if (digitsOnly.length === 11 && digitsOnly.startsWith("0")) {
    core10 = digitsOnly.slice(1);
    had91Prefix = false;
  } else if (digitsOnly.length === 13 && digitsOnly.startsWith("091")) {
    core10 = digitsOnly.slice(3);
    had91Prefix = true;
  } else {
    return {
      isValid: false,
      normalized10: "",
      formattedWith91: "",
      with91Compact: "",
      had91Prefix: digitsOnly.startsWith("91"),
      error: `Invalid length (${digitsOnly.length} digits). Enter 10-digit Indian mobile or 12-digit with 91.`,
    };
  }

  if (!/^[6-9]\d{9}$/.test(core10)) {
    return {
      isValid: false,
      normalized10: core10,
      formattedWith91: "",
      with91Compact: "",
      had91Prefix,
      error: "Indian mobile number must start with 6, 7, 8, or 9 followed by 9 digits.",
    };
  }

  // Reject all-identical repeating digits like 9999999999
  if (/^(\d)\1{9}$/.test(core10)) {
    return {
      isValid: false,
      normalized10: core10,
      formattedWith91: "",
      with91Compact: "",
      had91Prefix,
      error: "Invalid repeating phone number pattern.",
    };
  }

  return {
    isValid: true,
    normalized10: core10,
    formattedWith91: `+91 ${core10}`,
    with91Compact: `91${core10}`,
    had91Prefix,
  };
}

/**
 * Validates a 6-digit Indian Pincode (starts with 1-9, 6 digits total).
 */
export function validateIndianPincode(rawPincode: string): IndianPincodeValidationResult {
  const trimmed = (rawPincode || "").trim();
  if (!trimmed) {
    return {
      isValid: false,
      normalized: "",
      error: "6-digit Indian Pincode is required.",
    };
  }

  const digits = trimmed.replace(/\s+/g, "");
  if (!/^\d+$/.test(digits)) {
    return {
      isValid: false,
      normalized: "",
      error: "Pincode must contain only digits.",
    };
  }

  if (digits.length !== 6) {
    return {
      isValid: false,
      normalized: digits,
      error: `Invalid Pincode length (${digits.length} digits). Indian Pincode must be 6 digits.`,
    };
  }

  if (!/^[1-9]\d{5}$/.test(digits)) {
    return {
      isValid: false,
      normalized: digits,
      error: "Indian Pincode cannot start with 0.",
    };
  }

  if (/^(\d)\1{5}$/.test(digits)) {
    return {
      isValid: false,
      normalized: digits,
      error: "Invalid repeating 6-digit Pincode.",
    };
  }

  return {
    isValid: true,
    normalized: digits,
    regionHint: PIN_REGION_HINTS[digits[0]] || "India Postal Zone",
  };
}

// Office encryption key & CRC16 helper for compact TFQR1 Mini QR codes
const OFFICE_CIPHER_KEY = "TF_OFFICE_MINI_QR_KEY_2026_V1#91";

function computeCrc16(bytes: Uint8Array): number {
  let crc = 0xffff;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i] << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc & 0xffff;
}

function keyStreamByte(index: number, salt: number): number {
  const keyChar = OFFICE_CIPHER_KEY.charCodeAt(index % OFFICE_CIPHER_KEY.length);
  const mixed = ((keyChar ^ ((salt + index * 31) & 0xff)) + ((index * 17) & 0xff)) & 0xff;
  return mixed;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const b64 =
    typeof btoa === "function"
      ? btoa(binary)
      : Buffer.from(bytes).toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (b64.length % 4)) % 4;
  const padded = b64 + "=".repeat(padLen);
  if (typeof atob === "function") {
    const binary = atob(padded);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      out[i] = binary.charCodeAt(i);
    }
    return out;
  }
  return new Uint8Array(Buffer.from(padded, "base64"));
}

/**
 * Encrypts `{ customerName, customerPhone, pincode, itemCode }` into a compact
 * encrypted office Mini QR payload: `TFQR1:<base64url>`
 */
export function encryptCustomerMiniQR(payload: CustomerMiniQrPayload): string {
  const cleanName = (payload.customerName || "").trim().replace(/\|/g, " ");
  const phoneCheck = validateIndianPhone(payload.customerPhone || "");
  const cleanPhone = phoneCheck.isValid
    ? phoneCheck.had91Prefix
      ? phoneCheck.with91Compact
      : phoneCheck.normalized10
    : (payload.customerPhone || "").trim().replace(/\|/g, "");
  const pinCheck = validateIndianPincode(payload.pincode || "");
  const cleanPin = pinCheck.isValid
    ? pinCheck.normalized
    : (payload.pincode || "").trim().replace(/\|/g, "");
  const cleanItem = (payload.itemCode || "").trim().replace(/\|/g, "-");

  // Compact pipe-delimited inner structure: Name|Phone|Pincode|ItemCode
  const plainText = `${cleanName}|${cleanPhone}|${cleanPin}|${cleanItem}`;
  const encoder = new TextEncoder();
  const plainBytes = encoder.encode(plainText);

  const crc = computeCrc16(plainBytes);
  const salt = (crc ^ 0x5a) & 0xff;

  // Format: [salt (1B), crcHigh (1B), crcLow (1B), ...encryptedBytes]
  const output = new Uint8Array(plainBytes.length + 3);
  output[0] = salt;
  output[1] = (crc >> 8) & 0xff;
  output[2] = crc & 0xff;

  for (let i = 0; i < plainBytes.length; i++) {
    output[i + 3] = plainBytes[i] ^ keyStreamByte(i, salt);
  }

  return `TFQR1:${bytesToBase64Url(output)}`;
}

export interface DecryptedCustomerMiniQrResult {
  isCustomerQR: boolean;
  isValid: boolean;
  data?: {
    customerName: string;
    customerPhone: string;
    normalizedPhone10: string;
    formattedPhone91: string;
    pincode: string;
    itemCode: string;
  };
  phoneValidation?: IndianPhoneValidationResult;
  pincodeValidation?: IndianPincodeValidationResult;
  error?: string;
}

/**
 * Detects and decrypts an Office Mini QR string (`TFQR1:<base64url>` or JSON customer payload)
 * and validates the Indian phone number (with or without 91) and 6-digit Indian Pincode.
 */
export function decryptCustomerMiniQR(rawText: string): DecryptedCustomerMiniQrResult {
  const trimmed = (rawText || "").trim();
  if (!trimmed) {
    return { isCustomerQR: false, isValid: false };
  }

  let customerName = "";
  let customerPhone = "";
  let pincode = "";
  let itemCode = "";
  let matchedFormat = false;

  if (trimmed.toUpperCase().startsWith("TFQR1:")) {
    matchedFormat = true;
    const token = trimmed.slice(6).trim();
    try {
      const rawBytes = base64UrlToBytes(token);
      if (rawBytes.length < 4) {
        return {
          isCustomerQR: true,
          isValid: false,
          error: "Corrupted Office Mini QR code (payload too short).",
        };
      }
      const salt = rawBytes[0];
      const expectedCrc = (rawBytes[1] << 8) | rawBytes[2];
      const cipherBytes = rawBytes.slice(3);
      const plainBytes = new Uint8Array(cipherBytes.length);

      for (let i = 0; i < cipherBytes.length; i++) {
        plainBytes[i] = cipherBytes[i] ^ keyStreamByte(i, salt);
      }

      const actualCrc = computeCrc16(plainBytes);
      if (actualCrc !== expectedCrc) {
        return {
          isCustomerQR: true,
          isValid: false,
          error: "Encrypted Mini QR signature verification failed (invalid office key or damaged QR).",
        };
      }

      const decoder = new TextDecoder();
      const decodedStr = decoder.decode(plainBytes);
      const parts = decodedStr.split("|");
      if (parts.length < 4) {
        return {
          isCustomerQR: true,
          isValid: false,
          error: "Mini QR missing required customer fields (Name, Phone, Pincode, Item Code).",
        };
      }

      customerName = (parts[0] || "").trim();
      customerPhone = (parts[1] || "").trim();
      pincode = (parts[2] || "").trim();
      itemCode = parts.slice(3).join("|").trim();
    } catch {
      return {
        isCustomerQR: true,
        isValid: false,
        error: "Unable to decrypt Office Mini QR payload.",
      };
    }
  } else if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (
        parsed &&
        typeof parsed === "object" &&
        ("customerName" in parsed || "customerPhone" in parsed || "pincode" in parsed || "itemCode" in parsed) &&
        !("trackingNumber" in parsed) &&
        !("awb" in parsed)
      ) {
        matchedFormat = true;
        customerName = String(parsed.customerName || parsed.name || "").trim();
        customerPhone = String(parsed.customerPhone || parsed.phone || parsed.number || "").trim();
        pincode = String(parsed.pincode || parsed.pin || "").trim();
        itemCode = String(parsed.itemCode || parsed.item || "").trim();
      }
    } catch {
      // Not a customer JSON QR
    }
  }

  if (!matchedFormat) {
    return { isCustomerQR: false, isValid: false };
  }

  const phoneValidation = validateIndianPhone(customerPhone);
  const pincodeValidation = validateIndianPincode(pincode);

  if (!phoneValidation.isValid) {
    return {
      isCustomerQR: true,
      isValid: false,
      phoneValidation,
      pincodeValidation,
      error: `Customer QR Phone Error: ${phoneValidation.error}`,
    };
  }

  if (!pincodeValidation.isValid) {
    return {
      isCustomerQR: true,
      isValid: false,
      phoneValidation,
      pincodeValidation,
      error: `Customer QR Pincode Error: ${pincodeValidation.error}`,
    };
  }

  return {
    isCustomerQR: true,
    isValid: true,
    phoneValidation,
    pincodeValidation,
    data: {
      customerName: customerName || "Walk-in Customer",
      customerPhone: phoneValidation.had91Prefix
        ? phoneValidation.with91Compact
        : phoneValidation.normalized10,
      normalizedPhone10: phoneValidation.normalized10,
      formattedPhone91: phoneValidation.formattedWith91,
      pincode: pincodeValidation.normalized,
      itemCode: itemCode || "STD-ITEM",
    },
  };
}

/**
 * Encodes text into a 2D boolean QR matrix using @zxing/library for crisp SVG rendering.
 */
export function generateMiniQRSvgMatrix(text: string): {
  size: number;
  modules: boolean[][];
} {
  try {
    const qr = QRCodeEncoder.encode(text || "TFQR1:EMPTY", QRCodeDecoderErrorCorrectionLevel.M);
    const matrix = qr.getMatrix();
    const width = matrix.getWidth();
    const height = matrix.getHeight();
    const modules: boolean[][] = [];
    for (let y = 0; y < height; y++) {
      const row: boolean[] = [];
      for (let x = 0; x < width; x++) {
        row.push(matrix.get(x, y) === 1);
      }
      modules.push(row);
    }
    return { size: width, modules };
  } catch {
    return { size: 0, modules: [] };
  }
}
