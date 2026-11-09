"use client";

import React, { useRef, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  KanbanSquare,
  Clock,
  CheckSquare,
  Receipt,
  CalendarDays,
  ExternalLink,
  ShieldCheck,
  LayoutDashboard,
  Zap,
  X,
  Search,
  Lock,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

interface AppItem {
  id: string;
  name: string;
  description: string;
  href: string;
  color: string;
  icon: React.ElementType;
  permission?: string;
}

const odooApps: AppItem[] = [
  {
    id: "crm",
    name: "CRM & Pipeline",
    description: "Lead capture, follow-up decay, 1-click won auto-onboarding",
    href: "/crm",
    color: "bg-orange-500",
    icon: Users,
    permission: "crm:read",
  },
  {
    id: "tasks",
    name: "Projects & Tasks",
    description: "DAG dependency engine, cascading deadlines, SLA tracker",
    href: "/tasks",
    color: "bg-indigo-600",
    icon: KanbanSquare,
    permission: "projects:read",
  },
  {
    id: "attendance",
    name: "Attendance & HR",
    description: "Smart terminal, leave capacity guardrail, billable hours",
    href: "/attendance",
    color: "bg-teal-600",
    icon: Clock,
    permission: "attendance:read",
  },
  {
    id: "content",
    name: "Content Approvals",
    description: "Two-tier review state machine, multi-channel calendar, S3 assets",
    href: "/content-calendar",
    color: "bg-pink-600",
    icon: CheckSquare,
    permission: "content:read",
  },
  {
    id: "billing",
    name: "Invoicing & GST",
    description: "Indian GST (18%) ledgers, SAC 998311, Stripe webhooks, PDF invoices",
    href: "/billing",
    color: "bg-emerald-600",
    icon: Receipt,
    permission: "billing:read",
  },
  {
    id: "calendar",
    name: "Master Calendar",
    description: "4 unified layers: Publishing, Milestones, Meetings, Leaves",
    href: "/calendar",
    color: "bg-amber-600",
    icon: CalendarDays,
  },
  {
    id: "portal",
    name: "Client Portal",
    description: "External stakeholder portal, 1-click deliverable sign-offs",
    href: "/client-portal",
    color: "bg-sky-600",
    icon: ExternalLink,
  },
  {
    id: "vault",
    name: "Credential Vault",
    description: "Fernet AES-256 zero-knowledge client ad credentials",
    href: "/settings/vault",
    color: "bg-slate-700",
    icon: ShieldCheck,
    permission: "vault:read",
  },
  {
    id: "dashboard",
    name: "Executive Overview",
    description: "Agency MRR, employee capacity utilization, live shift board",
    href: "/",
    color: "bg-[#714B67]",
    icon: LayoutDashboard,
  },
  {
    id: "team",
    name: "Team & Workforce",
    description: "Provision member logins, assign departments, and grant software module permissions",
    href: "/team",
    color: "bg-blue-600",
    icon: Users,
    permission: "team:read",
  },
  {
    id: "automations",
    name: "Automation Engine",
    description: "6 self-healing daemons, custom triggers, SLA alerts, and DAG cascading rules",
    href: "/automations",
    color: "bg-purple-600",
    icon: Zap,
    permission: "automations:read",
  },
];

interface AppSwitcherModalProps {
  open: boolean;
  onClose: () => void;
}

export function AppSwitcherModal({ open, onClose }: AppSwitcherModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [filter, setFilter] = React.useState("");
  const { hasPermission } = useAuthStore();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const filteredApps = odooApps.filter((a) =>
    a.name.toLowerCase().includes(filter.toLowerCase()) ||
    a.description.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <dialog
      ref={dialogRef}
      onCancel={onClose}
      className="fixed inset-0 m-auto bg-white rounded-2xl max-w-2xl w-full p-0 shadow-2xl border border-slate-200 backdrop:bg-slate-900/40 backdrop:backdrop-blur-sm overflow-hidden"
    >
      <div className="flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg overflow-hidden bg-black flex items-center justify-center border border-slate-200 shrink-0">
              <img src="/logo.jpg" alt="The Desi Muchads" className="w-full h-full object-cover" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">The Desi Muchads Apps</h2>
              <p className="text-[11px] text-slate-500">Fast Application Launcher</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Filter input */}
        <div className="p-3 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
            <Search size={14} className="text-slate-400" />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter applications..."
              className="w-full bg-transparent outline-none text-slate-700 placeholder:text-slate-400"
              autoFocus
            />
          </div>
        </div>

        {/* Odoo App Tiles Grid */}
        <div className="p-6 overflow-y-auto grid grid-cols-3 sm:grid-cols-3 gap-4">
          {filteredApps.map((app) => {
            const Icon = app.icon;
            const isAccessible = !app.permission || hasPermission(app.permission);

            if (!isAccessible) {
              return (
                <div
                  key={app.id}
                  className="flex flex-col items-center text-center p-3.5 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 opacity-60 cursor-not-allowed select-none relative group"
                  title="Access restricted: contact your Agency Super Admin to grant clearance"
                >
                  <div
                    className={`w-14 h-14 rounded-2xl ${app.color} opacity-50 text-white flex items-center justify-center shadow-xs mb-2 relative`}
                  >
                    <Icon size={26} strokeWidth={2} />
                    <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center border-2 border-white shadow-xs">
                      <Lock size={11} />
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-slate-500">
                    {app.name}
                  </span>
                  <span className="text-[10px] text-amber-600 font-medium mt-0.5">
                    Locked / Restricted
                  </span>
                </div>
              );
            }

            return (
              <Link
                key={app.id}
                href={app.href}
                onClick={onClose}
                className="flex flex-col items-center text-center p-3.5 rounded-xl border border-transparent hover:border-slate-200 hover:bg-slate-50 hover:shadow-xs transition-all group"
              >
                <div
                  className={`w-14 h-14 rounded-2xl ${app.color} text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform mb-2`}
                >
                  <Icon size={26} strokeWidth={2} />
                </div>
                <span className="text-xs font-semibold text-slate-800 group-hover:text-[#714B67] transition-colors">
                  {app.name}
                </span>
                <span className="text-[10px] text-slate-400 line-clamp-1 mt-0.5 max-w-[130px]">
                  {app.description}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </dialog>
  );
}

