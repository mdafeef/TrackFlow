import crypto from "crypto";

// Server secret for signing tracking tokens (fallback to stable local seed if env var is unset)
const LINK_SIGNING_SECRET = process.env.LINK_SIGNING_SECRET || "trackflow_secure_parcel_seal_v1_2026_key";

/**
 * Creates a cryptographically signed, tamper-proof tracking token.
 * Prevents anyone from changing the tracking number in the URL to view other parcels.
 */
export function generateSecureTrackingToken(trackingNumber: string, courierId: string): string {
  const cleanT = trackingNumber.trim().toUpperCase();
  const cleanC = courierId.trim().toLowerCase();
  const timestamp = Date.now();

  const payload = JSON.stringify({ t: cleanT, c: cleanC, ts: timestamp });
  const base64Payload = Buffer.from(payload).toString("base64url");

  const hmac = crypto.createHmac("sha256", LINK_SIGNING_SECRET);
  hmac.update(base64Payload);
  const signature = hmac.digest("base64url").substring(0, 16);

  // Format: <base64payload>.<signature>
  return `${base64Payload}.${signature}`;
}

/**
 * Verifies whether a tracking token is authentic and has not been altered.
 */
export function verifySecureTrackingToken(token: string): { valid: boolean; trackingNumber?: string; courierId?: string } {
  if (!token || !token.includes(".")) {
    return { valid: false };
  }

  const [base64Payload, providedSig] = token.split(".");
  if (!base64Payload || !providedSig) {
    return { valid: false };
  }

  const hmac = crypto.createHmac("sha256", LINK_SIGNING_SECRET);
  hmac.update(base64Payload);
  const expectedSig = hmac.digest("base64url").substring(0, 16);

  // Constant-time comparison to prevent timing attacks
  const isValidSig = crypto.timingSafeEqual(Buffer.from(providedSig), Buffer.from(expectedSig));
  if (!isValidSig) {
    return { valid: false };
  }

  try {
    const raw = Buffer.from(base64Payload, "base64url").toString("utf-8");
    const data = JSON.parse(raw);
    if (!data.t) return { valid: false };

    return {
      valid: true,
      trackingNumber: data.t,
      courierId: data.c || "speedpost",
    };
  } catch {
    return { valid: false };
  }
}
