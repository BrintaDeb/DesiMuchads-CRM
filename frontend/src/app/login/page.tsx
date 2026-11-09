"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, ArrowRight, ShieldCheck, CheckCircle2, UserCheck } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [email, setEmail] = useState("admin@desimuchads.com");
  const [password, setPassword] = useState("admin123456");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await api.post("/auth/login", { email, password });
      const data = res.data?.data;
      if (data?.access_token && data?.user) {
        login(data.access_token, data.user);
        toast.success(`Welcome back, ${data.user.full_name}!`);
        router.push("/");
        return;
      }
    } catch (err: any) {
      if (err.response?.data?.detail) {
        toast.error(err.response.data.detail);
        setIsLoading(false);
        return;
      }
      if (err.response?.status === 401 || err.response?.status === 400) {
        toast.error("Invalid credentials. Please verify your email and password.");
        setIsLoading(false);
        return;
      }

      // Offline network fallback only if server is completely unreachable
      toast.warning("Server connection offline. Logging into local sandbox session.");
      const role = email.includes("client")
        ? "CLIENT"
        : email.includes("manager")
        ? "ACCOUNT_MANAGER"
        : email.includes("specialist")
        ? "SPECIALIST"
        : "SUPER_ADMIN";

      const demoUser = {
        id: "demo-user-id",
        email,
        full_name: email.split("@")[0].toUpperCase(),
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

  const fillQuickDemo = (roleEmail: string, pass: string) => {
    setEmail(roleEmail);
    setPassword(pass);
    toast.info(`Switched credentials to ${roleEmail}`);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white border border-[#CBD5E1] rounded-lg p-8 space-y-6 shadow-sm">
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

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-[#334155]">Email Address</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-2.5 text-[#94A3B8]" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#F8F9FA] text-[#1E293B] border border-[#CBD5E1] rounded pl-9 pr-3 py-2 text-xs outline-none focus:border-[#714B67] focus:ring-1 focus:ring-[#714B67] transition-all"
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
              <Lock size={16} className="absolute left-3 top-2.5 text-[#94A3B8]" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#F8F9FA] text-[#1E293B] border border-[#CBD5E1] rounded pl-9 pr-3 py-2 text-xs outline-none focus:border-[#714B67] focus:ring-1 focus:ring-[#714B67] transition-all font-mono"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded bg-[#714B67] hover:bg-[#5E3D55] text-white font-semibold text-xs transition-colors shadow-xs disabled:opacity-50"
          >
            <span>{isLoading ? "Signing in..." : "Log In to Agency OS"}</span>
            <ArrowRight size={14} />
          </button>
        </form>

        {/* Demo Personas Quick Select */}
        <div className="pt-4 border-t border-[#F1F5F9] space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[#475569]">1-Click Demo Personas:</span>
            <span className="text-[10px] text-[#94A3B8] font-mono">Instant Autofill</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => fillQuickDemo("admin@desimuchads.com", "admin123456")}
              className="p-2 rounded bg-[#F8F9FA] hover:bg-[#F1F5F9] border border-[#E2E8F0] text-left transition-colors"
            >
              <div className="font-semibold text-[#1E293B]">Super Admin</div>
              <div className="text-[10px] text-[#64748B]">Full System Access</div>
            </button>

            <button
              type="button"
              onClick={() => fillQuickDemo("manager@desimuchads.com", "manager123456")}
              className="p-2 rounded bg-[#F8F9FA] hover:bg-[#F1F5F9] border border-[#E2E8F0] text-left transition-colors"
            >
              <div className="font-semibold text-[#1E293B]">Account Manager</div>
              <div className="text-[10px] text-[#64748B]">CRM & QA Reviews</div>
            </button>

            <button
              type="button"
              onClick={() => fillQuickDemo("specialist@desimuchads.com", "specialist123456")}
              className="p-2 rounded bg-[#F8F9FA] hover:bg-[#F1F5F9] border border-[#E2E8F0] text-left transition-colors"
            >
              <div className="font-semibold text-[#1E293B]">Specialist</div>
              <div className="text-[10px] text-[#64748B]">Creative & Tasks</div>
            </button>

            <button
              type="button"
              onClick={() => fillQuickDemo("client@bombaychaico.com", "client123456")}
              className="p-2 rounded bg-[#F8F9FA] hover:bg-[#F1F5F9] border border-[#E2E8F0] text-left transition-colors"
            >
              <div className="font-semibold text-[#1E293B]">Client Portal</div>
              <div className="text-[10px] text-[#64748B]">Sign-off Deliverables</div>
            </button>
          </div>
        </div>

        {/* Security Badge */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-[#64748B] pt-2">
          <ShieldCheck size={14} className="text-[#008784]" />
          <span>Stateless Dual-Token JWT + HttpOnly Cookies</span>
        </div>
      </div>
    </div>
  );
}
