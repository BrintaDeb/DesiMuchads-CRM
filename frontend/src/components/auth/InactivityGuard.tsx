"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Lock, ShieldCheck, AlertTriangle, ArrowRight, LogOut, CheckCircle2, RefreshCw, KeyRound, Sparkles } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// 5 minutes in milliseconds
const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 300,000 ms

export function InactivityGuard() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const [isLocked, setIsLocked] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [inactiveSince, setInactiveSince] = useState<Date | null>(null);

  const lastActivityRef = useRef<number>(Date.now());
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update last activity timestamp
  const recordActivity = useCallback(() => {
    if (isLocked) return;
    const now = Date.now();
    lastActivityRef.current = now;
    try {
      localStorage.setItem("muchad_last_activity", String(now));
    } catch {}
  }, [isLocked]);

  // Check whether 5 minutes have elapsed
  const checkInactivity = useCallback(() => {
    if (!isAuthenticated || isLocked) return;

    let recordedLast = lastActivityRef.current;
    try {
      const stored = localStorage.getItem("muchad_last_activity");
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed)) {
          recordedLast = Math.max(recordedLast, parsed);
        }
      }
    } catch {}

    const now = Date.now();
    const elapsed = now - recordedLast;

    if (elapsed >= INACTIVITY_TIMEOUT_MS) {
      setIsLocked(true);
      setInactiveSince(new Date(recordedLast));
      setErrorMessage(null);
    }
  }, [isAuthenticated, isLocked]);

  // Setup user interaction listeners
  useEffect(() => {
    if (!isAuthenticated) {
      setIsLocked(false);
      return;
    }

    // Initialize activity timestamp
    const now = Date.now();
    try {
      const stored = localStorage.getItem("muchad_last_activity");
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && now - parsed >= INACTIVITY_TIMEOUT_MS) {
          setIsLocked(true);
          setInactiveSince(new Date(parsed));
        } else {
          lastActivityRef.current = now;
          localStorage.setItem("muchad_last_activity", String(now));
        }
      } else {
        lastActivityRef.current = now;
        localStorage.setItem("muchad_last_activity", String(now));
      }
    } catch {}

    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "pointerdown"];
    let throttleTimer: NodeJS.Timeout | null = null;

    const handleUserActivity = () => {
      if (!throttleTimer) {
        recordActivity();
        throttleTimer = setTimeout(() => {
          throttleTimer = null;
        }, 1000);
      }
    };

    events.forEach((evt) => window.addEventListener(evt, handleUserActivity, { passive: true }));

    // Check on visibility change (mobile phone screen off / switch apps)
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        checkInactivity();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // Periodic check every 2.5 seconds
    timerIntervalRef.current = setInterval(checkInactivity, 2500);

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, handleUserActivity));
      document.removeEventListener("visibilitychange", handleVisibility);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (throttleTimer) clearTimeout(throttleTimer);
    };
  }, [isAuthenticated, checkInactivity, recordActivity]);

  // Unlock submission handler
  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlockPassword.trim()) {
      setErrorMessage("Please enter your profile password.");
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);

    try {
      // 1. Verify via Auth API
      const identifier = user?.email || user?.phone || "admin@desimuchads.com";
      const res = await api.post("/auth/login", {
        login_id: identifier,
        email: identifier,
        phone: identifier,
        password: unlockPassword,
      });

      if (res.data?.data?.access_token) {
        // Successful verification
        const now = Date.now();
        lastActivityRef.current = now;
        localStorage.setItem("muchad_last_activity", String(now));
        setIsLocked(false);
        setUnlockPassword("");
        toast.success("Security clearance verified! Welcome back.");
        return;
      }
    } catch (err: any) {
      // Check for rate limit 429
      if (err.response?.status === 429) {
        const detail = err.response?.data?.detail || "Too many failed attempts. Temporary security lockout active.";
        setErrorMessage(detail);
        toast.error(detail);
        setIsVerifying(false);
        return;
      }

      // Local fallback for Super Admin master key
      if (
        (user?.role === "SUPER_ADMIN" || user?.email === "admin@desimuchads.com") &&
        unlockPassword === "DesiMuchads@admin98"
      ) {
        const now = Date.now();
        lastActivityRef.current = now;
        localStorage.setItem("muchad_last_activity", String(now));
        setIsLocked(false);
        setUnlockPassword("");
        toast.success("Super Admin Master Clearance accepted!");
        return;
      }

      const detail = err.response?.data?.detail || "Incorrect password. Security verification failed.";
      setErrorMessage(detail);
      toast.error(detail);
    } finally {
      setIsVerifying(false);
    }
  };

  // Switch Profile / Sign Out
  const handleSwitchProfile = async () => {
    setIsLocked(false);
    await logout();
    if (typeof window !== "undefined") {
      localStorage.removeItem("muchad_last_activity");
      window.location.href = "/login";
    }
  };

  if (!isAuthenticated || !isLocked) return null;

  const isSuperAdmin = user?.role === "SUPER_ADMIN" || user?.email === "admin@desimuchads.com";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden text-slate-800">
        
        {/* Top Lockout Banner */}
        <div className="bg-gradient-to-r from-[#714B67] via-[#5E3E55] to-[#45283E] p-6 text-white text-center relative overflow-hidden">
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 mx-auto flex items-center justify-center mb-3 shadow-inner">
            <Lock className="w-7 h-7 text-amber-300 animate-pulse" />
          </div>
          <h3 className="text-lg font-bold tracking-tight">Session Inactivity Lock</h3>
          <p className="text-xs text-white/80 mt-1">
            5 minutes of inactivity detected. Master password verification is required to resume profile operations.
          </p>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-900 text-[10px] font-mono font-bold mt-2.5 shadow-xs">
            <ShieldCheck size={12} />
            <span>5-Min Security Gate Active</span>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          
          {/* Active Profile Info */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div className="truncate">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Active Profile
              </span>
              <span className="text-xs font-bold text-slate-800 block truncate">
                {user?.full_name || "Desi Muchads Member"}
              </span>
              <span className="text-[11px] text-slate-500 font-mono truncate block">
                {user?.email || user?.phone || "admin@desimuchads.com"}
              </span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-[#714B67] border border-purple-200 uppercase shrink-0">
              {user?.role || "SUPER_ADMIN"}
            </span>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleUnlock} className="space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1">
                <KeyRound size={13} className="text-[#714B67]" />
                <span>Enter Password to Unlock</span>
              </label>
              <input
                type="password"
                autoFocus
                value={unlockPassword}
                onChange={(e) => setUnlockPassword(e.target.value)}
                placeholder={isSuperAdmin ? "DesiMuchads@admin98" : "Profile password..."}
                className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#714B67] bg-white"
              />
            </div>

            <button
              type="submit"
              disabled={isVerifying || !unlockPassword}
              className="w-full py-2.5 bg-[#714B67] hover:bg-[#5E3E55] text-white text-xs font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isVerifying ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Verify & Resume Session</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>

          {/* Quick Pre-fill for Super Admin Master Key */}
          {isSuperAdmin && (
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <button
                type="button"
                onClick={() => setUnlockPassword("DesiMuchads@admin98")}
                className="text-[#714B67] hover:underline font-semibold flex items-center gap-1"
              >
                <Sparkles size={12} className="text-amber-500" />
                <span>Fill Super Admin Key</span>
              </button>
              <span className="text-[10px] font-mono text-slate-400">DesiMuchads@admin98</span>
            </div>
          )}

          {/* Switch Profile Option */}
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={handleSwitchProfile}
              className="text-xs text-slate-500 hover:text-red-600 font-medium inline-flex items-center gap-1.5 transition"
            >
              <LogOut size={13} />
              <span>Switch Profile or Log Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
