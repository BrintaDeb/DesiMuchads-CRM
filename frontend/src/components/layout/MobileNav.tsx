"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Zap,
  KanbanSquare,
  Users,
  Clock,
  Grid,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAttendanceStore } from "@/stores/attendanceStore";
import { AppSwitcherModal } from "./AppSwitcherModal";

export function MobileNav() {
  const pathname = usePathname();
  const { status, clockIn, clockOut } = useAttendanceStore();
  const [appSwitcherOpen, setAppSwitcherOpen] = useState(false);

  const isClockedIn = status === "ACTIVE" || status === "ON_BREAK";

  const navItems = [
    {
      label: "Overview",
      href: "/",
      icon: LayoutDashboard,
      isActive: pathname === "/",
    },
    {
      label: "Automations",
      href: "/automations",
      icon: Zap,
      isActive: pathname.startsWith("/automations"),
      highlight: true,
    },
    {
      label: "Tasks",
      href: "/tasks",
      icon: KanbanSquare,
      isActive: pathname.startsWith("/tasks"),
    },
    {
      label: "Team",
      href: "/team",
      icon: Users,
      isActive: pathname.startsWith("/team"),
    },
  ];

  return (
    <>
      {/* Mobile Persistent Bottom Bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 backdrop-blur-md border-t border-zinc-200 px-1 py-1 pb-[calc(0.25rem+env(safe-area-inset-bottom,0px))] shadow-[0_-4px_12px_rgba(0,0,0,0.05)] select-none"
        aria-label="Mobile Navigation"
      >
        <div className="flex items-center justify-around h-14">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-colors relative min-w-[56px] min-h-[44px]",
                  item.isActive ? "text-[#714B67]" : "text-zinc-500 hover:text-zinc-900"
                )}
              >
                <div
                  className={cn(
                    "p-1 rounded-full transition-all",
                    item.isActive ? "bg-purple-50 text-[#714B67]" : ""
                  )}
                >
                  <Icon
                    className={cn(
                      "w-5 h-5",
                      item.highlight && item.isActive && "fill-[#714B67]"
                    )}
                  />
                </div>
                <span
                  className={cn(
                    "text-[10px] font-medium leading-none mt-0.5",
                    item.isActive ? "font-bold text-[#714B67]" : "text-zinc-500"
                  )}
                >
                  {item.label}
                </span>
                {item.isActive && (
                  <span className="absolute top-0 w-8 h-0.5 bg-[#714B67] rounded-full" />
                )}
              </Link>
            );
          })}

          {/* Quick Attendance Terminal Button */}
          <Link
            href="/attendance"
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-colors relative min-w-[56px] min-h-[44px]",
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
              {isClockedIn ? "Clocked" : "HR/Shift"}
            </span>
          </Link>

          {/* Odoo App Launcher Trigger */}
          <button
            type="button"
            onClick={() => setAppSwitcherOpen(true)}
            className="flex flex-col items-center justify-center flex-1 h-full py-1 text-center text-zinc-500 hover:text-zinc-900 min-w-[56px] min-h-[44px]"
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

