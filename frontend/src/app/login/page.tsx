"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Lock,
  Mail,
  Phone,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [loginId, setLoginId] = useState("admin@desimuchads.com");
  const [password, setPassword] = useState("admin123456");
  const [isLoading, setIsLoading] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState<number | null>(null);

  // Auto-decrement lockout timer if rate limit is hit
  useEffect(() => {
    if (lockoutSeconds === null || lockoutSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockoutSeconds((prev) => (prev && prev > 1 ? prev - 1 : null));
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutSeconds]);

  const isPhoneMode = !loginId.includes("@") && /^[0-9+\s()-]+$/.test(loginId.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutSeconds && lockoutSeconds > 0) {
      toast.error(`Rate limit security lockout active. Please wait ${lockoutSeconds}s before retrying.`);
      return;
    }

    setIsLoading(true);

    try {
      const res = await api.post("/auth/login", {
        login_id: loginId.trim(),
        email: loginId.trim(),
        phone: loginId.trim(),
        password,
      });

      const data = res.data?.data;
      if (data?.access_token && data?.user) {
        login(data.access_token, data.user);
        toast.success(`Welcome back, ${data.user.full_name}!`);
        router.push("/");
        return;
      }
    } catch (err: any) {
      // 1. Rate Limiting 429 Too Many Requests
      if (err.response?.status === 429) {
        const retryAfter = parseInt(err.response?.headers?.["retry-after"] || "900", 10);
        setLockoutSeconds(retryAfter);
        const detail = err.response?.data?.detail || "Too many failed attempts. Temporary security lockout active.";
        toast.error(detail);
        setIsLoading(false);
        return;
      }

      // 2. Invalid Credentials with remaining attempts
      if (err.response?.data?.detail) {
        toast.error(err.response.data.detail);
        setIsLoading(false);
        return;
      }

      if (err.response?.status === 401 || err.response?.status === 400) {
        toast.error("Invalid credentials. Please verify your Email ID/Phone and password.");
        setIsLoading(false);
        return;
      }

      // Offline network fallback only if server is completely unreachable
      toast.warning("Server connection offline. Logging into local sandbox session.");
      const role = loginId.includes("client")
        ? "CLIENT"
        : loginId.includes("manager")
        ? "ACCOUNT_MANAGER"
        : loginId.includes("specialist")
        ? "SPECIALIST"
        : "SUPER_ADMIN";

      const demoUser = {
        id: "demo-user-id",
        email: loginId.includes("@") ? loginId : `${loginId}@desimuchads.com`,
        full_name: loginId.split("@")[0].toUpperCase(),
        role: role as any,
        department: "The Desi Muchads",
        hourly_cost: 50,
        weekly_capacity_hours: 40,
        is_active: true,
        created_at: new Date().toISOString(),
      };
      login("mock_jwt_token", demoUser);
      toast.success(`Logged in as ${role}`);
      router.push("/");
    } finally {
      setIsLoading(false);
    }
  };

  const fillQuickDemo = (identifier: string, pass: string) => {
    setLoginId(identifier);
    setPassword(pass);
    toast.info(`Switched credentials to ${identifier}`);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white border border-[#CBD5E1] rounded-2xl p-7 space-y-6 shadow-sm">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-xl overflow-hidden bg-black flex items-center justify-center mx-auto shadow-md border border-slate-200">
            <img src="/logo.jpg" alt="The Desi Muchads Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1E293B] tracking-tight">The Desi Muchads</h1>
            <p className="text-xs text-[#64748B]">Enterprise Agency Operating System</p>
          </div>
        </div>

        {/* Security Lockout Banner (if Rate Limited) */}
        {lockoutSeconds !== null && lockoutSeconds > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-red-800 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold block">Rate Limiter Active: Account Temporarily Locked</span>
              <p className="text-[11px] text-red-700 mt-0.5">
                Multiple invalid login attempts detected. For security protection, please wait before retrying.
              </p>
              <div className="flex items-center gap-1.5 font-mono font-bold text-red-900 mt-1.5">
                <Clock className="w-3.5 h-3.5 animate-spin" />
                <span>Retry available in: {Math.floor(lockoutSeconds / 60)}m {lockoutSeconds % 60}s</span>
              </div>
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-[#334155]">
                Email ID or Phone Number
              </label>
              <span className="text-[10px] font-mono text-[#714B67] bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200 font-semibold">
                {isPhoneMode ? "📱 Mobile Phone" : "✉️ Email ID"}
              </span>
            </div>
            <div className="relative">
              {isPhoneMode ? (
                <Phone size={15} className="absolute left-3 top-2.5 text-[#714B67]" />
              ) : (
                <Mail size={15} className="absolute left-3 top-2.5 text-[#94A3B8]" />
              )}
              <input
                type="text"
                placeholder="admin@desimuchads.com or +91 98765 00001"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                className="w-full bg-[#F8F9FA] text-[#1E293B] border border-[#CBD5E1] rounded-lg pl-9 pr-3 py-2 text-xs outline-none focus:border-[#714B67] focus:ring-1 focus:ring-[#714B67] transition-all font-medium"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-[#334155]">Password</label>
              <span className="text-[11px] text-[#714B67] hover:underline cursor-pointer">
                Forgot password?
              </span>
            </div>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-2.5 text-[#94A3B8]" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#F8F9FA] text-[#1E293B] border border-[#CBD5E1] rounded-lg pl-9 pr-3 py-2 text-xs outline-none focus:border-[#714B67] focus:ring-1 focus:ring-[#714B67] transition-all font-mono"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || (lockoutSeconds !== null && lockoutSeconds > 0)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#714B67] hover:bg-[#5E3D55] text-white font-semibold text-xs transition-colors shadow-xs disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Verifying Credentials & Rate Limits...</span>
              </>
            ) : (
              <>
                <span>Log In to Agency OS</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>

        {/* Demo Personas Quick Select */}
        <div className="pt-4 border-t border-[#F1F5F9] space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[#475569]">1-Click Quick Autofill:</span>
            <span className="text-[10px] text-[#94A3B8] font-mono">Email & Phone Supported</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => fillQuickDemo("admin@desimuchads.com", "admin123456")}
              className="p-2 rounded-lg bg-[#F8F9FA] hover:bg-[#F1F5F9] border border-[#E2E8F0] text-left transition-colors"
            >
              <div className="font-semibold text-[#1E293B] flex items-center gap-1">
                <Mail size={12} className="text-[#714B67]" />
                <span>Admin (Email)</span>
              </div>
              <div className="text-[10px] text-[#64748B] truncate">admin@desimuchads.com</div>
            </button>

            <button
              type="button"
              onClick={() => fillQuickDemo("+91 98765 00001", "admin123456")}
              className="p-2 rounded-lg bg-[#F8F9FA] hover:bg-[#F1F5F9] border border-[#E2E8F0] text-left transition-colors"
            >
              <div className="font-semibold text-[#1E293B] flex items-center gap-1">
                <Phone size={12} className="text-emerald-600" />
                <span>Admin (Phone)</span>
              </div>
              <div className="text-[10px] text-[#64748B] truncate">+91 98765 00001</div>
            </button>

            <button
              type="button"
              onClick={() => fillQuickDemo("manager@desimuchads.com", "manager123456")}
              className="p-2 rounded-lg bg-[#F8F9FA] hover:bg-[#F1F5F9] border border-[#E2E8F0] text-left transition-colors"
            >
              <div className="font-semibold text-[#1E293B]">Account Manager</div>
              <div className="text-[10px] text-[#64748B]">CRM & QA Reviews</div>
            </button>

            <button
              type="button"
              onClick={() => fillQuickDemo("specialist@desimuchads.com", "specialist123456")}
              className="p-2 rounded-lg bg-[#F8F9FA] hover:bg-[#F1F5F9] border border-[#E2E8F0] text-left transition-colors"
            >
              <div className="font-semibold text-[#1E293B]">Specialist</div>
              <div className="text-[10px] text-[#64748B]">Creative & Tasks</div>
            </button>
          </div>
        </div>

        {/* Security Badges */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-[#64748B]">
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-[#008784]" />
            <span>Dual Identifier + 15m Lockout</span>
          </div>
          <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">
            Brute-Force Guard
          </span>
        </div>
      </div>
    </div>
  );
}
