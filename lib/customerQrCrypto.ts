import QRCodeEncoder from "@zxing/library/esm/core/qrcode/encoder/Encoder";
import QRCodeDecoderErrorCorrectionLevel from "@zxing/library/esm/core/qrcode/decoder/ErrorCorrectionLevel";

/**
 * Encrypted Office Mini QR & Phone Normalization Utility
 * - Encrypts { customerName, customerPhone, pincode, itemCode } into a compact
 *   office-only Mini QR payload: `TFQR1:<base64url>` using a stream cipher + CRC16 checksum.
 * - Delivery Address is intentionally excluded from the Mini QR so the QR remains small and fast to scan.
 * - Automatically strips `+91` / `91` / `0` prefixes from phone numbers and feeds the clean 10-digit number.
 */

export interface CustomerMiniQrPayload {
  customerName: string;
  customerPhone: string;
  pincode: string;
  itemCode: string;
}

export interface IndianPhoneValidationResult {
  isValid: boolean;
  /** Clean 10-digit number with 91 removed (e.g. "9847012345") */
  normalized10: string;
  /** Same clean 10-digit number without 91 (kept for interface compatibility) */
  formattedWith91: string;
  /** Same clean 10-digit number without 91 */
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

/**
 * Strips `+91`, `91`, `091`, or leading `0` prefix from an Indian phone number
 * and returns the clean number without `91` (e.g. "+91 9847012345" -> "9847012345",
 * "919847012345" -> "9847012345").
 */
export function strip91FromPhone(rawPhone: string): string {
  const trimmed = (rawPhone || "").trim();
  if (!trimmed) return "";

  // Check if explicitly prefixed with +91, 091, or "91 " / "91-"
  if (/^(?:\+?0?91[\s\-().]+)\d+/i.test(trimmed)) {
    const rest = trimmed.replace(/^(?:\+?0?91[\s\-().]+)/i, "").replace(/\D/g, "");
    return rest.length > 10 ? rest.slice(0, 10) : rest;
  }

  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";

  if (digits.length === 13 && digits.startsWith("091")) {
    return digits.slice(3);
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith("0")) {
    return digits.slice(1);
  }
  if (digits.length > 10 && digits.startsWith("91")) {
    return digits.slice(2, 12);
  }

  return digits;
}

/**
 * Resolves the Indian State / Postal Circle from a 6-digit Pincode prefix (optional helper).
 */
export function getIndianPostalStateFromPincode(pincode: string): string {
  const clean = (pincode || "").replace(/\D/g, "").trim();
  if (clean.length !== 6) return "";
  const p2 = parseInt(clean.slice(0, 2), 10);
  const p3 = parseInt(clean.slice(0, 3), 10);

  if (p2 === 11) return "Delhi";
  if (p2 === 12 || p2 === 13) return "Haryana";
  if (p2 >= 14 && p2 <= 16) return "Punjab";
  if (p2 === 17) return "Himachal Pradesh";
  if (p2 === 18 || p2 === 19) return "J&K / Ladakh";
  if (p2 >= 20 && p2 <= 28) {
    if ((p3 >= 244 && p3 <= 249) || (p3 >= 262 && p3 <= 263)) return "Uttarakhand";
    return "Uttar Pradesh";
  }
  if (p2 >= 30 && p2 <= 34) return "Rajasthan";
  if (p2 >= 36 && p2 <= 39) return "Gujarat";
  if (p3 === 403) return "Goa";
  if (p2 >= 40 && p2 <= 44) return "Maharashtra";
  if (p2 >= 45 && p2 <= 48) return "Madhya Pradesh";
  if (p2 === 49) return "Chhattisgarh";
  if (p2 === 50) return "Telangana";
  if (p2 >= 51 && p2 <= 53) return "Andhra Pradesh";
  if (p2 >= 56 && p2 <= 59) return "Karnataka";
  if (p2 >= 60 && p2 <= 64) return "Tamil Nadu";
  if (p3 === 682 && clean === "682555") return "Lakshadweep";
  if (p2 >= 67 && p2 <= 69) return "Kerala";
  if (p2 >= 70 && p2 <= 74) return "West Bengal";
  if (p2 >= 75 && p2 <= 77) return "Odisha";
  if (p2 === 78) return "Assam";
  if (p2 === 79) return "North East";
  if (p2 >= 80 && p2 <= 85) {
    if (p3 >= 814 && p3 <= 835) return "Jharkhand";
    return "Bihar";
  }
  return "";
}

/**
 * Normalizes a phone number by removing `91` / `+91` / `0` prefix and feeding the clean number.
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

  const rawDigits = trimmed.replace(/\D/g, "");
  const had91Prefix =
    trimmed.startsWith("+91") ||
    (rawDigits.length > 10 && (rawDigits.startsWith("91") || rawDigits.startsWith("091")));

  const cleanNumber = strip91FromPhone(trimmed);
  if (!cleanNumber) {
    return {
      isValid: false,
      normalized10: "",
      formattedWith91: "",
      with91Compact: "",
      had91Prefix,
      error: "Please enter a valid phone number.",
    };
  }

  return {
    isValid: true,
    normalized10: cleanNumber,
    formattedWith91: cleanNumber,
    with91Compact: cleanNumber,
    had91Prefix,
  };
}

/**
 * Normalizes a Pincode without strict blocking validation labels.
 */
export function validateIndianPincode(rawPincode: string): IndianPincodeValidationResult {
  const trimmed = (rawPincode || "").trim();
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) {
    return {
      isValid: false,
      normalized: "",
      error: "Pincode is required.",
    };
  }

  return {
    isValid: true,
    normalized: digits,
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
 * Note:
 *  - Strips `91` / `+91` from `customerPhone` automatically.
 *  - Excludes Delivery Address so the QR code stays compact and scans instantaneously.
 */
export function encryptCustomerMiniQR(payload: CustomerMiniQrPayload): string {
  const cleanName = (payload.customerName || "").trim().replace(/\|/g, " ");
  const cleanPhone = strip91FromPhone(payload.customerPhone || "");
  const cleanPin = (payload.pincode || "").replace(/\D/g, "").trim();
  const cleanItem = (payload.itemCode || "").trim().replace(/\|/g, "-");

  // Compact pipe-delimited inner structure: Name|Phone(without 91)|Pincode|ItemCode
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
 * Detects and decrypts an Office Mini QR string (`TFQR1:<base64url>` or JSON customer payload).
 * Automatically strips `91` / `+91` from the decoded phone number before feeding it to the platform.
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
          error: "Mini QR missing customer fields (Name, Phone, Pincode, Item Code).",
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
        ("customerName" in parsed ||
          "customerPhone" in parsed ||
          "pincode" in parsed ||
          "itemCode" in parsed) &&
        !("trackingNumber" in parsed) &&
        !("awb" in parsed)
      ) {
        matchedFormat = true;
        customerName = String(parsed.customerName || parsed.name || "").trim();
        customerPhone = String(
          parsed.customerPhone || parsed.phone || parsed.number || ""
        ).trim();
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

  const cleanPhone = strip91FromPhone(customerPhone);
  const cleanPin = pincode.replace(/\D/g, "");
  const phoneValidation = validateIndianPhone(cleanPhone);
  const pincodeValidation = validateIndianPincode(cleanPin);

  return {
    isCustomerQR: true,
    isValid: true,
    phoneValidation,
    pincodeValidation,
    data: {
      customerName: customerName || "Customer",
      customerPhone: cleanPhone,
      normalizedPhone10: cleanPhone,
      formattedPhone91: cleanPhone,
      pincode: cleanPin,
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
    const qr = QRCodeEncoder.encode(
      text || "TFQR1:EMPTY",
      QRCodeDecoderErrorCorrectionLevel.M
    );
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
