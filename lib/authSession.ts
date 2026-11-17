import crypto from "crypto";
import type { AuthUserProfile } from "@/app/api/auth/route";

export const SESSION_COOKIE_NAME = "trackflow_auth_session";

const AUTH_SIGNING_KEY = crypto
  .createHash("sha256")
  .update("trackflow-enterprise-auth-v1-signing-key")
  .digest("hex");

export function signSessionToken(user: AuthUserProfile): string {
  const payload = {
    user,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf-8").toString("base64url");
  const sig = crypto
    .createHmac("sha256", AUTH_SIGNING_KEY)
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${sig}`;
}

export function verifySessionToken(
  token: string | undefined | null
): AuthUserProfile | null {
  if (!token || !token.includes(".")) return null;
  try {
    const [encoded, sig] = token.split(".");
    if (!encoded || !sig) return null;
    const expectedSig = crypto
      .createHmac("sha256", AUTH_SIGNING_KEY)
      .update(encoded)
      .digest("base64url");
    if (sig !== expectedSig) return null;
    const decoded = JSON.parse(Buffer.from(encoded, "base64url").toString("utf-8"));
    if (!decoded || !decoded.user || typeof decoded.exp !== "number") return null;
    if (Date.now() > decoded.exp) return null;
    return decoded.user as AuthUserProfile;
  } catch {
    return null;
  }
}
