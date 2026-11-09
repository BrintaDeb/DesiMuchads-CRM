"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  KanbanSquare,
  Clock,
  Grid,
  Radio,
  Compass,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAttendanceStore } from "@/stores/attendanceStore";
import { useUIStore } from "@/stores/uiStore";
import { AppSwitcherModal } from "./AppSwitcherModal";

export function MobileNav() {
  const pathname = usePathname();
  const { status } = useAttendanceStore();
  const { leadRadarOpen, setLeadRadarOpen } = useUIStore();
  const [appSwitcherOpen, setAppSwitcherOpen] = useState(false);

  const isClockedIn = status === "ACTIVE" || status === "ON_BREAK";

  return (
    <>
      {/* Mobile Persistent Bottom Bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 backdrop-blur-md border-t border-zinc-200 px-1 py-1 pb-[calc(0.25rem+env(safe-area-inset-bottom,0px))] shadow-[0_-4px_12px_rgba(0,0,0,0.05)] select-none"
        aria-label="Mobile Navigation"
      >
        <div className="flex items-center justify-around h-14">
          {/* 1. Overview */}
          <Link
            href="/"
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-colors relative min-w-[50px] min-h-[44px]",
              pathname === "/" ? "text-[#714B67]" : "text-zinc-500 hover:text-zinc-900"
            )}
          >
            <div className={cn("p-1 rounded-full transition-all", pathname === "/" ? "bg-purple-50 text-[#714B67]" : "")}>
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <span className={cn("text-[10px] font-medium leading-none mt-0.5", pathname === "/" ? "font-bold text-[#714B67]" : "text-zinc-500")}>
              Overview
            </span>
            {pathname === "/" && <span className="absolute top-0 w-8 h-0.5 bg-[#714B67] rounded-full" />}
          </Link>

          {/* 2. CRM & Pipeline */}
          <Link
            href="/crm"
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-colors relative min-w-[50px] min-h-[44px]",
              pathname.startsWith("/crm") ? "text-[#714B67]" : "text-zinc-500 hover:text-zinc-900"
            )}
          >
            <div className={cn("p-1 rounded-full transition-all", pathname.startsWith("/crm") ? "bg-purple-50 text-[#714B67]" : "")}>
              <Users className="w-5 h-5" />
            </div>
            <span className={cn("text-[10px] font-medium leading-none mt-0.5", pathname.startsWith("/crm") ? "font-bold text-[#714B67]" : "text-zinc-500")}>
              CRM
            </span>
            {pathname.startsWith("/crm") && <span className="absolute top-0 w-8 h-0.5 bg-[#714B67] rounded-full" />}
          </Link>

          {/* 3. Center Highlight: Mobile Lead Radar Trigger */}
          <button
            type="button"
            onClick={() => setLeadRadarOpen(true)}
            className="flex flex-col items-center justify-center flex-1 h-full py-0.5 text-center relative -top-1.5 min-w-[56px] min-h-[48px] group"
            title="Search Leads & Pinpoint on Map"
          >
            <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#714B67] to-[#8c5d80] text-white flex items-center justify-center shadow-md border-2 border-white group-active:scale-95 transition-transform relative">
              <Compass className="w-5 h-5 text-amber-300 animate-[spin_10s_linear_infinite]" />
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-white rounded-full animate-ping" />
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
            </div>
            <span className="text-[10px] font-bold text-[#714B67] leading-none mt-0.5 tracking-tight">
              Radar
            </span>
          </button>

          {/* 4. Tasks & Deliverables */}
          <Link
            href="/tasks"
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-colors relative min-w-[50px] min-h-[44px]",
              pathname.startsWith("/tasks") ? "text-[#714B67]" : "text-zinc-500 hover:text-zinc-900"
            )}
          >
            <div className={cn("p-1 rounded-full transition-all", pathname.startsWith("/tasks") ? "bg-purple-50 text-[#714B67]" : "")}>
              <KanbanSquare className="w-5 h-5" />
            </div>
            <span className={cn("text-[10px] font-medium leading-none mt-0.5", pathname.startsWith("/tasks") ? "font-bold text-[#714B67]" : "text-zinc-500")}>
              Tasks
            </span>
            {pathname.startsWith("/tasks") && <span className="absolute top-0 w-8 h-0.5 bg-[#714B67] rounded-full" />}
          </Link>

          {/* 5. Attendance / Shift */}
          <Link
            href="/attendance"
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-colors relative min-w-[50px] min-h-[44px]",
              pathname.startsWith("/attendance") ? "text-[#714B67]" : "text-zinc-500 hover:text-zinc-900"
            )}
            title="Attendance Status"
          >
            <div className="p-1 relative">
              <Clock className="w-5 h-5" />
              <span
                className={cn(
                  "absolute top-0 right-0 w-2 h-2 rounded-full",
                  isClockedIn ? "bg-emerald-500 animate-pulse ring-2 ring-white" : "bg-zinc-400"
                )}
              />
            </div>
            <span
              className={cn(
                "text-[10px] font-medium leading-none mt-0.5",
                pathname.startsWith("/attendance") ? "font-bold text-[#714B67]" : "text-zinc-500"
              )}
            >
              {isClockedIn ? "Clocked" : "Shift"}
            </span>
          </Link>

          {/* 6. Odoo App Launcher Trigger */}
          <button
            type="button"
            onClick={() => setAppSwitcherOpen(true)}
            className="flex flex-col items-center justify-center flex-1 h-full py-1 text-center text-zinc-500 hover:text-zinc-900 min-w-[50px] min-h-[44px]"
            title="All Apps"
          >
            <div className="p-1 rounded-full bg-zinc-100 text-zinc-700">
              <Grid className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-medium leading-none mt-0.5 text-zinc-600">
              Apps
            </span>
          </button>
        </div>
      </nav>

      {/* App Switcher Modal for All Other Modules */}
      <AppSwitcherModal open={appSwitcherOpen} onClose={() => setAppSwitcherOpen(false)} />
    </>
  );
}

