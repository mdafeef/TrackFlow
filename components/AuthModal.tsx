"use client";

import React, { useState } from "react";
import {
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  X,
  Check,
  ShieldCheck,
  KeyRound,
  Building2,
  MapPin,
  Phone,
  Sparkles,
  Copy,
  LogIn,
  UserPlus,
} from "lucide-react";
import { AuthUserProfile } from "@/app/api/auth/route";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: AuthUserProfile, token?: string) => void;
  inlineMode?: boolean;
}

export function AuthModal({
  isOpen,
  onClose,
  onSuccess,
  inlineMode = false,
}: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [identifier, setIdentifier] = useState("TF-DEMO-01");
  const [password, setPassword] = useState("TrackFlow@2026");
  const [showPassword, setShowPassword] = useState(false);

  // Registration fields
  const [fullName, setFullName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [hubCity, setHubCity] = useState("Kochi Central Hub");
  const [hubPincode, setHubPincode] = useState("682001");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!isOpen && !inlineMode) return null;

  const handleCopyText = (key: string, value: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(value);
      setCopiedField(key);
      setTimeout(() => setCopiedField(null), 1500);
    }
  };

  const executeAuthRequest = async (payload: Record<string, string>) => {
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.user) {
        throw new Error(data.error || "Authentication failed. Please check your credentials.");
      }

      try {
        localStorage.setItem("trackflow_auth_user", JSON.stringify(data.user));
        if (data.token) {
          localStorage.setItem("trackflow_auth_token", data.token);
        }
        localStorage.setItem(
          "trackflow_user_profile",
          JSON.stringify({
            fullName: data.user.fullName,
            email: data.user.email,
            phone: data.user.phone,
            companyName: data.user.companyName,
            role: data.user.role,
            hubCity: data.user.hubCity,
            hubPincode: data.user.hubPincode,
          })
        );
      } catch {
        // ignore storage errors
      }

      onSuccess(data.user, data.token);
    } catch (err: unknown) {
      setErrorMsg((err as Error)?.message || "Could not sign in.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "login") {
      await executeAuthRequest({
        action: "login",
        identifier: identifier.trim(),
        password,
      });
    } else {
      await executeAuthRequest({
        action: "register",
        fullName: fullName.trim(),
        email: regEmail.trim(),
        password: regPassword,
        phone: phone.trim() || "9847011223",
        companyName: companyName.trim() || "TrackFlow Operations",
        hubCity: hubCity.trim() || "Kochi Central Hub",
        hubPincode: hubPincode.trim() || "682001",
      });
    }
  };

  const handleInstantDemoLogin = async () => {
    setMode("login");
    setIdentifier("TF-DEMO-01");
    setPassword("TrackFlow@2026");
    await executeAuthRequest({
      action: "login",
      identifier: "TF-DEMO-01",
      password: "TrackFlow@2026",
    });
  };

  const handleFillDemo = () => {
    setMode("login");
    setIdentifier("TF-DEMO-01");
    setPassword("TrackFlow@2026");
    setErrorMsg(null);
  };

  const cardContent = (
    <div
      className="relative z-10 w-full max-w-md rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 space-y-5 animate-in fade-in zoom-in-95 duration-150"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-sm shadow-indigo-500/25">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Workspace Access
              </h2>
              <span className="rounded-md bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200/70 dark:border-indigo-800/60 px-2 py-0.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-300">
                Operator Portal
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Single tracking is always public. Sign in to access Workspace.
            </p>
          </div>
        </div>
        {!inlineMode && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close login modal"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Mode Switcher Tabs: Sign In vs Create Account */}
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/90">
        <button
          type="button"
          onClick={() => {
            setMode("login");
            setErrorMsg(null);
          }}
          className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all cursor-pointer ${
            mode === "login"
              ? "bg-white text-indigo-600 shadow-2xs dark:bg-slate-900 dark:text-indigo-400"
              : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          <LogIn className="h-3.5 w-3.5" />
          <span>Sign In</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("register");
            setErrorMsg(null);
          }}
          className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all cursor-pointer ${
            mode === "register"
              ? "bg-white text-indigo-600 shadow-2xs dark:bg-slate-900 dark:text-indigo-400"
              : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          <UserPlus className="h-3.5 w-3.5" />
          <span>Create Account</span>
        </button>
      </div>

      {/* Real Demo Login ID Card */}
      <div className="rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/90 via-white to-violet-50/60 p-3.5 dark:border-indigo-800/60 dark:from-indigo-950/50 dark:via-slate-900 dark:to-violet-950/30 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900 dark:text-indigo-200">
            <KeyRound className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Demo Login Credentials</span>
          </div>
          <button
            type="button"
            onClick={handleFillDemo}
            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 underline cursor-pointer"
          >
            Fill Credentials
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl border border-slate-200/80 bg-white/90 px-2.5 py-1.5 dark:border-slate-800 dark:bg-slate-900/90 flex items-center justify-between gap-1">
            <div className="min-w-0">
              <div className="text-[10px] font-medium text-slate-400">Demo Login ID</div>
              <div className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate">
                TF-DEMO-01
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleCopyText("id", "TF-DEMO-01")}
              className="p-1 text-slate-400 hover:text-indigo-600 cursor-pointer shrink-0"
              title="Copy Demo ID"
            >
              {copiedField === "id" ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-white/90 px-2.5 py-1.5 dark:border-slate-800 dark:bg-slate-900/90 flex items-center justify-between gap-1">
            <div className="min-w-0">
              <div className="text-[10px] font-medium text-slate-400">Password</div>
              <div className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate">
                TrackFlow@2026
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleCopyText("pw", "TrackFlow@2026")}
              className="p-1 text-slate-400 hover:text-indigo-600 cursor-pointer shrink-0"
              title="Copy Password"
            >
              {copiedField === "pw" ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleInstantDemoLogin}
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600/10 hover:bg-indigo-600 hover:text-white border border-indigo-500/25 px-3 py-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 dark:hover:text-white transition-all cursor-pointer disabled:opacity-50"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>1-Click Demo Login (TF-DEMO-01)</span>
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleFormSubmit} className="space-y-3.5">
        {mode === "login" ? (
          <>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Login ID or Email
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="TF-DEMO-01 or demo@trackflow.in"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-9 py-2 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2.5 top-2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your Full Name"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mobile Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="9847011223"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 font-mono text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="operator@company.com"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Create Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-9 py-2 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2.5 top-2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Origin Hub / City
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={hubCity}
                    onChange={(e) => setHubCity(e.target.value)}
                    placeholder="Kochi Central Hub"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Hub Pincode
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={hubPincode}
                    onChange={(e) => setHubPincode(e.target.value)}
                    placeholder="682001"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 font-mono text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {errorMsg && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/60 dark:text-rose-300">
            {errorMsg}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 py-2.5 text-xs font-bold text-white shadow-sm shadow-indigo-500/20 transition-all cursor-pointer disabled:opacity-60"
        >
          {isSubmitting ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : mode === "login" ? (
            <>
              <LogIn className="h-4 w-4" />
              <span>Sign In to Workspace</span>
            </>
          ) : (
            <>
              <UserPlus className="h-4 w-4" />
              <span>Create Account &amp; Enter Workspace</span>
            </>
          )}
        </button>
      </form>

      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Encrypted Session</span>
        </span>
        <span>Single Tracker is Free &amp; Public</span>
      </div>
    </div>
  );

  if (inlineMode) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
        {cardContent}
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      {cardContent}
    </div>
  );
}
