"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  KanbanSquare,
  Users,
  Clock,
  CalendarDays,
  ShieldCheck,
  Receipt,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Zap,
  UserPlus,
} from "lucide-react";
import { useUIStore } from "@/stores/uiStore";
import { useAttendanceStore } from "@/stores/attendanceStore";
import { toast } from "sonner";

interface ActionItem {
  id: string;
  category: "Navigation" | "Actions" | "Clients";
  title: string;
  description: string;
  icon: React.ElementType;
  action: () => void;
}

export function CommandPalette() {
  const router = useRouter();
  const { commandPaletteOpen, setCommandPaletteOpen } = useUIStore();
  const { status, clockIn, clockOut } = useAttendanceStore();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const actions: ActionItem[] = [
    {
      id: "nav-dash",
      category: "Navigation",
      title: "Executive Overview Dashboard",
      description: "Agency MRR, capacity telemetry, live team board",
      icon: Users,
      action: () => router.push("/"),
    },
    {
      id: "nav-crm",
      category: "Navigation",
      title: "Sales CRM & Deal Pipeline",
      description: "Lead capture, follow-up decay, 1-click won auto-onboarding",
      icon: Users,
      action: () => router.push("/crm"),
    },
    {
      id: "nav-tasks",
      category: "Navigation",
      title: "DAG Projects & Tasks",
      description: "Task state machine, dependencies, deadline cascade",
      icon: KanbanSquare,
      action: () => router.push("/tasks"),
    },
    {
      id: "nav-content",
      category: "Navigation",
      title: "Content Calendar & Two-Tier Approval",
      description: "Drafting → Internal QA → Client Review pipeline",
      icon: KanbanSquare,
      action: () => router.push("/content-calendar"),
    },
    {
      id: "nav-cal",
      category: "Navigation",
      title: "Unified Master Calendar",
      description: "4 Layers: Content, Deadlines, Meetings, Leaves",
      icon: CalendarDays,
      action: () => router.push("/calendar"),
    },
    {
      id: "nav-att",
      category: "Navigation",
      title: "Workforce & Attendance Terminal",
      description: "Live attendance board, leave approval with capacity guardrails",
      icon: Clock,
      action: () => router.push("/attendance"),
    },
    {
      id: "nav-billing",
      category: "Navigation",
      title: "Billing & GST Invoices",
      description: "Indian GST 18% splits, SAC 998311, Stripe ledger",
      icon: Receipt,
      action: () => router.push("/billing"),
    },
    {
      id: "nav-vault",
      category: "Navigation",
      title: "AES-256 Client Credential Vault",
      description: "Symmetric encryption at rest for ad accounts & passwords",
      icon: ShieldCheck,
      action: () => router.push("/settings/vault"),
    },
    {
      id: "nav-portal",
      category: "Navigation",
      title: "Client Portal (Whitelisted View)",
      description: "External client deliverable approval & vault submission",
      icon: ExternalLink,
      action: () => router.push("/client-portal"),
    },
    {
      id: "nav-team",
      category: "Navigation",
      title: "Team & Access Control",
      description: "Provision members, assign departments, and grant automation permissions",
      icon: UserPlus,
      action: () => router.push("/team"),
    },
    {
      id: "nav-automations",
      category: "Navigation",
      title: "Automation Engine & Studio",
      description: "6 autonomous daemons, custom triggers, SLA alerts, and DAG cascading",
      icon: Zap,
      action: () => router.push("/automations"),
    },
    // Interactive Terminal Actions
    {
      id: "act-clock",
      category: "Actions",
      title: status === "COMPLETED" ? "Terminal: Clock In (In-Office)" : "Terminal: Clock Out",
      description: "Update workforce attendance session",
      icon: Clock,
      action: async () => {
        if (status === "COMPLETED") {
          await clockIn("IN_OFFICE");
          toast.success("Clocked in successfully");
        } else {
          await clockOut();
          toast.success("Clocked out successfully");
        }
      },
    },
    // Quick Clients
    {
      id: "client-bombay",
      category: "Clients",
      title: "Bombay Chai Co. (Active Client)",
      description: "D2C Beverage • Retainer INR 75,000/mo • Health 95%",
      icon: Users,
      action: () => router.push("/crm"),
    },
    {
      id: "client-urban",
      category: "Clients",
      title: "Urban Vibe Apparels (Lead - Proposal Sent)",
      description: "E-Commerce Fashion • Deal Value INR 1,20,000",
      icon: Users,
      action: () => router.push("/crm"),
    },
  ];

  const filteredActions = actions.filter(
    (item) =>
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (commandPaletteOpen) {
      if (!dialog.open) {
        dialog.showModal();
        setSearch("");
        setSelectedIndex(0);
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [commandPaletteOpen]);

  const handleClose = () => {
    setCommandPaletteOpen(false);
  };

  const handleKeyDownInDialog = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredActions.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredActions.length) % Math.max(1, filteredActions.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredActions[selectedIndex]) {
        filteredActions[selectedIndex].action();
        handleClose();
      }
    } else if (e.key === "Escape") {
      handleClose();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onCancel={handleClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) handleClose();
      }}
      aria-labelledby="cmd-palette-title"
      className="backdrop:bg-slate-900/40 backdrop:backdrop-blur-sm bg-transparent p-0 m-auto max-w-xl w-full border-none outline-none overflow-hidden select-none"
    >
      <div
        className="bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-800"
        onKeyDown={handleKeyDownInDialog}
      >
        <h2 id="cmd-palette-title" className="sr-only">
          Agency OS Global Command Palette
        </h2>

        {/* Input bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 bg-slate-50">
          <Search size={18} className="text-slate-400 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search clients, trigger clock-in, jump to DAG tasks... (Ctrl+K)"
            className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none"
            autoFocus
          />
          <kbd className="hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 border border-slate-300">
            ESC
          </kbd>
        </div>

        {/* Action list */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-1">
          {filteredActions.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 font-mono">
              No matching commands or records found
            </div>
          ) : (
            filteredActions.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    item.action();
                    handleClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all ${isSelected ? "bg-slate-100 text-slate-900 font-medium" : "text-slate-600 hover:bg-slate-50"
                    }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <div className={`p-2 rounded-lg ${isSelected ? "bg-[#714B67] text-white" : "bg-slate-100 text-slate-500"}`}>
                      <Icon size={16} />
                    </div>
                    <div className="flex flex-col truncate">
                      <span className="text-xs font-semibold text-slate-800 truncate">{item.title}</span>
                      <span className="text-[10px] text-slate-500 truncate">{item.description}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                      {item.category}
                    </span>
                    {isSelected && <ArrowRight size={14} className="text-[#714B67]" />}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-slate-100 bg-slate-50 text-[10px] text-slate-500 font-mono">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <span className="text-[#714B67] font-semibold">The Desi Muchads OS</span>
        </div>
      </div>
    </dialog>
  );
}
