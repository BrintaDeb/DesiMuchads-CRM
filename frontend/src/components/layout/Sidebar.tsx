"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  KanbanSquare,
  CheckSquare,
  CalendarDays,
  Clock,
  Receipt,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Users,
  ExternalLink,
} from "lucide-react";
import { useUIStore } from "@/stores/uiStore";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  roles?: string[];
  permission?: string;
}

const navItems: NavItem[] = [
  { label: "Executive Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Sales Pipeline & CRM", href: "/crm", icon: Users, badge: "Won Auto", permission: "crm:read" },
  { label: "DAG Projects & Tasks", href: "/tasks", icon: KanbanSquare, permission: "projects:read" },
  { label: "Content Approval", href: "/content-calendar", icon: CheckSquare, badge: "2-Tier", permission: "content:read" },
  { label: "Unified Master Calendar", href: "/calendar", icon: CalendarDays },
  { label: "Workforce & Attendance", href: "/attendance", icon: Clock, permission: "attendance:read" },
  { label: "Billing & GST Ledger", href: "/billing", icon: Receipt, permission: "billing:read" },
  { label: "AES-256 Vault", href: "/settings/vault", icon: ShieldCheck, permission: "vault:read" },
  { label: "Client Portal Preview", href: "/client-portal", icon: ExternalLink },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const { user, hasPermission } = useAuthStore();

  const accessibleNavItems = navItems.filter(
    (item) => !item.permission || hasPermission(item.permission)
  );

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-[#09090B] border-r border-[#27272A] flex flex-col justify-between transition-all duration-300 ease-in-out select-none",
        sidebarCollapsed ? "w-16" : "w-60"
      )}
    >
      {/* Top Header & Brand */}
      <div>
        <div className="flex items-center justify-between h-14 px-3 border-b border-[#27272A]">
          <Link href="/" className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-md overflow-hidden bg-black flex items-center justify-center shrink-0 border border-zinc-700 shadow-xs">
              <img src="/logo.jpg" alt="The Desi Muchads" className="w-full h-full object-cover" />
            </div>
            {!sidebarCollapsed && (
              <div className="flex flex-col truncate">
                <span className="font-semibold text-xs tracking-wider uppercase text-zinc-100">
                  Desi Muchads
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">Agency OS v2.4</span>
              </div>
            )}
          </Link>
          <button
            onClick={toggleSidebar}
            className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-[#18181B] transition-colors"
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Navigation List */}
        <nav className="p-2 space-y-1">
          {accessibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-2.5 py-2 rounded-md text-xs font-medium transition-all group relative",
                  isActive
                    ? "bg-[#18181B] text-zinc-100 border border-zinc-700/60 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-[#121215]"
                )}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <Icon
                  size={16}
                  className={cn(
                    "shrink-0 transition-colors",
                    isActive ? "text-indigo-400" : "text-zinc-400 group-hover:text-zinc-200"
                  )}
                />
                {!sidebarCollapsed && (
                  <div className="flex items-center justify-between w-full truncate">
                    <span className="truncate">{item.label}</span>
                    {item.badge && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-[#27272A] bg-[#0c0c0e]">
        {!sidebarCollapsed ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-agency-emerald animate-pulse" />
              <span className="text-[11px] text-zinc-300 font-mono truncate">Live Telemetry Active</span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
              <span>FastAPI + DAG Bus</span>
              <span className="text-zinc-300">0ms UI</span>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-2 h-2 rounded-full bg-agency-emerald animate-pulse" title="Telemetry Live" />
          </div>
        )}
      </div>
    </aside>
  );
}

