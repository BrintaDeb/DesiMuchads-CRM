"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Grid, LogOut, ShieldCheck, ChevronDown, Sparkles } from "lucide-react";
import { useUIStore } from "@/stores/uiStore";
import { useAuthStore } from "@/stores/authStore";
import { AttendanceWidget } from "./AttendanceWidget";
import { TaskStopwatch } from "./TaskStopwatch";
import { NotificationCenter } from "./NotificationCenter";
import { AppSwitcherModal } from "./AppSwitcherModal";
import { cn } from "@/lib/utils";

interface AppTab {
  name: string;
  href: string;
  activePattern: string;
  permission?: string;
}

const topTabs: AppTab[] = [
  { name: "CRM", href: "/crm", activePattern: "/crm", permission: "crm:read" },
  { name: "Projects & Tasks", href: "/tasks", activePattern: "/tasks", permission: "projects:read" },
  { name: "Content Approvals", href: "/content-calendar", activePattern: "/content-calendar", permission: "content:read" },
  { name: "Attendance & HR", href: "/attendance", activePattern: "/attendance", permission: "attendance:read" },
  { name: "Billing & GST", href: "/billing", activePattern: "/billing", permission: "billing:read" },
  { name: "Calendar", href: "/calendar", activePattern: "/calendar" },
  { name: "Team", href: "/team", activePattern: "/team", permission: "team:read" },
  { name: "Automations", href: "/automations", activePattern: "/automations", permission: "automations:read" },
  { name: "Brand Vault", href: "/settings/vault", activePattern: "/settings/vault", permission: "vault:read" },
];

export function TopHeader() {
  const pathname = usePathname();
  const { setCommandPaletteOpen } = useUIStore();
  const { user, logout, hasPermission } = useAuthStore();
  const [appSwitcherOpen, setAppSwitcherOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const accessibleTabs = topTabs.filter((tab) => !tab.permission || hasPermission(tab.permission));

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 h-12 bg-[#714B67] text-white flex items-center justify-between px-3 shadow-sm select-none">
        {/* Left Section: App Switcher & Quick Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {/* Odoo 9-Dots App Switcher Button */}
          <button
            onClick={() => setAppSwitcherOpen(true)}
            className="p-1.5 rounded hover:bg-white/15 text-white transition-colors flex items-center justify-center shrink-0"
            title="Open Applications Menu (App Launcher)"
          >
            <div className="grid grid-cols-3 gap-0.5 w-4 h-4 p-0.5">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="w-1 h-1 bg-white rounded-full" />
              ))}
            </div>
          </button>

          {/* Brand Logo & Name */}
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-xs tracking-tight text-white hover:text-white/90 shrink-0 pr-3 border-r border-white/20"
          >
            <div className="w-6 h-6 rounded-md overflow-hidden bg-black flex items-center justify-center shrink-0 border border-white/20 shadow-xs">
              <img src="/logo.jpg" alt="The Desi Muchads" className="w-full h-full object-cover" />
            </div>
            <span className="hidden sm:inline font-bold text-[13px] tracking-tight">The Desi Muchads</span>
          </Link>

          {/* App Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-0.5 text-xs font-medium">
            {accessibleTabs.map((tab) => {
              const isActive = pathname === tab.href || pathname.startsWith(tab.activePattern);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    "px-2.5 py-1 rounded text-[11px] transition-colors whitespace-nowrap",
                    isActive
                      ? "bg-white/20 text-white font-semibold shadow-xs"
                      : "text-white/80 hover:text-white hover:bg-white/10"
                  )}
                >
                  {tab.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Section: Telemetry, Search, and Profile */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Quick Search / Command Palette shortcut */}
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/10 hover:bg-white/15 text-white/80 hover:text-white text-xs border border-white/20 transition-all"
            title="Search anything (Ctrl+K)"
          >
            <Search size={12} className="text-white/70" />
            <span className="text-[11px]">Search...</span>
            <kbd className="text-[9px] font-mono px-1 rounded bg-white/20 text-white">
              Ctrl+K
            </kbd>
          </button>

          {/* Active Task Stopwatch */}
          <TaskStopwatch />

          {/* Smart Attendance Terminal */}
          <AttendanceWidget />

          {/* Real-time Notification Center */}
          <NotificationCenter />

          {/* User Profile Pill with Dropdown */}
          <div className="relative">
            <button
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center gap-1.5 pl-1.5 pr-2 py-0.5 rounded-full hover:bg-white/15 transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-white text-[#714B67] font-bold text-[10px] flex items-center justify-center shadow-xs">
                {user?.full_name ? user.full_name.charAt(0) : "U"}
              </div>
              <span className="hidden xl:inline text-xs font-medium text-white max-w-[100px] truncate">
                {user?.full_name || "Account"}
              </span>
              <ChevronDown size={11} className="text-white/70" />
            </button>

            {profileDropdownOpen && (
              <div className="absolute right-0 top-9 z-50 w-52 py-1 bg-white border border-slate-200 rounded-xl shadow-xl flex flex-col text-slate-800 text-xs">
                <div className="px-3 py-2 border-b border-slate-100 bg-slate-50">
                  <p className="font-semibold text-slate-900 truncate">{user?.full_name || "Admin"}</p>
                  <p className="text-[10px] text-slate-500 font-mono truncate">{user?.email || "admin@desimuchads.com"}</p>
                  <span className="inline-block mt-1 text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {user?.role?.replace("_", " ") || "SUPER ADMIN"}
                  </span>
                </div>

                <Link
                  href="/settings/vault"
                  onClick={() => setProfileDropdownOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-slate-700"
                >
                  <ShieldCheck size={13} className="text-slate-400" />
                  <span>Credential Vault & Security</span>
                </Link>

                <Link
                  href="/client-portal"
                  onClick={() => setProfileDropdownOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-slate-700"
                >
                  <Sparkles size={13} className="text-slate-400" />
                  <span>Client Portal View</span>
                </Link>

                <div className="border-t border-slate-100 my-1" />

                <button
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    logout();
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-rose-600 hover:bg-rose-50 text-left font-medium"
                >
                  <LogOut size={13} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Odoo App Launcher Modal */}
      <AppSwitcherModal open={appSwitcherOpen} onClose={() => setAppSwitcherOpen(false)} />
    </>
  );
}
