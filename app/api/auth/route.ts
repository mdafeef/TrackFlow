import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import fs from "fs";
import {
  SESSION_COOKIE_NAME,
  signSessionToken,
  verifySessionToken,
} from "@/lib/authSession";

export interface AuthUserProfile {
  id: string;
  loginId: string;
  email: string;
  fullName: string;
  phone: string;
  companyName: string;
  role: string;
  hubCity: string;
  hubPincode: string;
}

interface StoredUserRecord extends AuthUserProfile {
  passwordHash: string;
  salt: string;
}

const USERS_STORAGE_PATH = "/tmp/trackflow_registered_users.json";

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

const DEFAULT_DEMO_SALT = "trackflow_demo_salt_2026";

function normalize10DigitPhone(raw: string): string {
  const trimmed = (raw || "").trim();
  if (!trimmed) return "9847263819";
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 13 && digits.startsWith("091")) return digits.slice(3, 13);
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2, 12);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1, 11);
  if (digits.length > 10 && digits.startsWith("91")) return digits.slice(2, 12);
  return digits.slice(0, 10) || "9847263819";
}

const SEED_USERS: StoredUserRecord[] = [
  {
    id: "usr-demo-01",
    loginId: "TF-DEMO-01",
    email: "demo@trackflow.in",
    fullName: "Mhd Afeef",
    phone: "9847263819",
    companyName: "TrackFlow Logistics",
    role: "Operations Admin",
    hubCity: "Kochi Central Hub",
    hubPincode: "682001",
    salt: DEFAULT_DEMO_SALT,
    passwordHash: hashPassword("TrackFlow@2026", DEFAULT_DEMO_SALT),
  },
  {
    id: "usr-admin-02",
    loginId: "TF-ADMIN-01",
    email: "mhdafeef@gmail.com",
    fullName: "Mhd Afeef",
    phone: "9847263819",
    companyName: "TrackFlow Logistics",
    role: "Workspace Owner",
    hubCity: "Kochi Central Hub",
    hubPincode: "682001",
    salt: DEFAULT_DEMO_SALT,
    passwordHash: hashPassword("TrackFlow@2026", DEFAULT_DEMO_SALT),
  },
];

function loadUsers(): StoredUserRecord[] {
  try {
    if (fs.existsSync(USERS_STORAGE_PATH)) {
      const raw = fs.readFileSync(USERS_STORAGE_PATH, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // fallback to seed users
  }
  return [...SEED_USERS];
}

function saveUsers(users: StoredUserRecord[]): void {
  try {
    fs.writeFileSync(USERS_STORAGE_PATH, JSON.stringify(users, null, 2), "utf-8");
  } catch {
    // ignore fs errors in read-only environments
  }
}

function toPublicProfile(user: StoredUserRecord): AuthUserProfile {
  return {
    id: user.id,
    loginId: user.loginId,
    email: user.email,
    fullName: user.fullName,
    phone: normalize10DigitPhone(user.phone),
    companyName: user.companyName,
    role: user.role,
    hubCity: user.hubCity,
    hubPincode: user.hubPincode,
  };
}



export async function GET(req: NextRequest) {
  const cookieToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const authHeader = req.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  const user = verifySessionToken(cookieToken || bearerToken);
  if (!user) {
    return NextResponse.json({ authenticated: false, user: null });
  }
  return NextResponse.json({ authenticated: true, user });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = String(body.action || "login");
    const users = loadUsers();

    if (action === "logout") {
      const res = NextResponse.json({ success: true, authenticated: false, user: null });
      res.cookies.delete(SESSION_COOKIE_NAME);
      res.cookies.delete("trackflow_has_auth");
      res.cookies.set("trackflow_active_view", "single", {
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
      return res;
    }

    if (action === "login") {
      const identifier = String(body.identifier || body.email || "")
        .trim()
        .toLowerCase();
      const password = String(body.password || "");

      if (!identifier || !password) {
        return NextResponse.json(
          { success: false, error: "Please enter your Login ID / Email and password." },
          { status: 400 }
        );
      }

      const matchedUser = users.find(
        (u) =>
          u.email.toLowerCase() === identifier ||
          u.loginId.toLowerCase() === identifier
      );

      if (!matchedUser) {
        return NextResponse.json(
          {
            success: false,
            error: "Account not found. Use Demo ID (demo@trackflow.in) or create an account.",
          },
          { status: 401 }
        );
      }

      const computedHash = hashPassword(password, matchedUser.salt);
      if (computedHash !== matchedUser.passwordHash) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid password. For the demo account, use TrackFlow@2026.",
          },
          { status: 401 }
        );
      }

      const profile = toPublicProfile(matchedUser);
      const token = signSessionToken(profile);

      const res = NextResponse.json({
        success: true,
        authenticated: true,
        user: profile,
        token,
      });

      res.cookies.set(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
      res.cookies.set("trackflow_has_auth", "1", {
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
      res.cookies.set("trackflow_active_view", "bulk", {
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });

      return res;
    }

    if (action === "register") {
      const fullName = String(body.fullName || "").trim();
      const email = String(body.email || "")
        .trim()
        .toLowerCase();
      const password = String(body.password || "");
      const phone = normalize10DigitPhone(String(body.phone || "9847263819"));
      const companyName = String(body.companyName || "TrackFlow Operations").trim();
      const hubCity = String(body.hubCity || "Kochi Central Hub").trim();
      const hubPincode = String(body.hubPincode || "682001").trim();

      if (!fullName || !email || !password) {
        return NextResponse.json(
          { success: false, error: "Full name, email, and password are required." },
          { status: 400 }
        );
      }

      if (password.length < 6) {
        return NextResponse.json(
          { success: false, error: "Password must be at least 6 characters." },
          { status: 400 }
        );
      }

      const existing = users.find((u) => u.email.toLowerCase() === email);
      if (existing) {
        return NextResponse.json(
          { success: false, error: "An account with this email already exists. Please sign in." },
          { status: 409 }
        );
      }

      const salt = crypto.randomBytes(16).toString("hex");
      const passwordHash = hashPassword(password, salt);
      const nextNum = users.length + 1;
      const newUser: StoredUserRecord = {
        id: `usr-${Date.now()}`,
        loginId: `TF-USER-0${nextNum}`,
        email,
        fullName,
        phone,
        companyName,
        role: "Operations Manager",
        hubCity,
        hubPincode,
        salt,
        passwordHash,
      };

      const updatedUsers = [...users, newUser];
      saveUsers(updatedUsers);

      const profile = toPublicProfile(newUser);
      const token = signSessionToken(profile);

      const res = NextResponse.json({
        success: true,
        authenticated: true,
        user: profile,
        token,
      });

      res.cookies.set(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
      res.cookies.set("trackflow_has_auth", "1", {
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
      res.cookies.set("trackflow_active_view", "bulk", {
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });

      return res;
    }

    if (action === "update_profile") {
      const profileUpdate = body.profile as Partial<AuthUserProfile>;
      if (!profileUpdate || !profileUpdate.email) {
        return NextResponse.json(
          { success: false, error: "Invalid profile payload." },
          { status: 400 }
        );
      }

      const normalizedPhone = profileUpdate.phone
        ? normalize10DigitPhone(profileUpdate.phone)
        : undefined;

      const updatedUsers = users.map((u) => {
        if (u.id === profileUpdate.id || u.email.toLowerCase() === profileUpdate.email?.toLowerCase()) {
          return {
            ...u,
            fullName: profileUpdate.fullName || u.fullName,
            email: profileUpdate.email || u.email,
            phone: normalizedPhone || normalize10DigitPhone(u.phone),
            companyName: profileUpdate.companyName || u.companyName,
            role: profileUpdate.role || u.role,
            hubCity: profileUpdate.hubCity || u.hubCity,
            hubPincode: profileUpdate.hubPincode || u.hubPincode,
          };
        }
        return u;
      });
      saveUsers(updatedUsers);

      const mergedUser: AuthUserProfile = {
        id: profileUpdate.id || "usr-demo-01",
        loginId: profileUpdate.loginId || "TF-DEMO-01",
        email: profileUpdate.email,
        fullName: profileUpdate.fullName || "Operator",
        phone: normalizedPhone || "9847263819",
        companyName: profileUpdate.companyName || "TrackFlow Logistics",
        role: profileUpdate.role || "Operations Admin",
        hubCity: profileUpdate.hubCity || "Kochi Central Hub",
        hubPincode: profileUpdate.hubPincode || "682001",
      };

      const token = signSessionToken(mergedUser);
      const res = NextResponse.json({
        success: true,
        authenticated: true,
        user: mergedUser,
        token,
      });

      res.cookies.set(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });

      return res;
    }

    return NextResponse.json({ success: false, error: "Unsupported auth action." }, { status: 400 });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: (err as Error)?.message || "Authentication failed." },
      { status: 500 }
    );
  }
}
