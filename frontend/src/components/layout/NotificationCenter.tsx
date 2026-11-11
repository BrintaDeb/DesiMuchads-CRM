"use client";

import React, { useState, useRef, useEffect } from "react";
import { Bell, Check, AlertTriangle, Sparkles, MessageSquare, ExternalLink } from "lucide-react";
import { Notification } from "@/types";
import { cn } from "@/lib/utils";
import Link from "next/link";

const mockNotifications: Notification[] = [
  {
    id: "n1",
    user_id: "u1",
    title: "⚡ DAG Rule 1 Executed",
    message: "Copywriting task completed. 'Packaging Reel Graphic' unlocked and assigned to Priya.",
    category: "AUTOMATION",
    link: "/tasks",
    is_read: false,
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  {
    id: "n2",
    user_id: "u1",
    title: "🎨 Content Awaiting Client Review",
    message: "Deliverable has passed Internal QA and is ready for client review sign-off.",
    category: "APPROVAL",
    link: "/content-calendar",
    is_read: false,
    created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
  {
    id: "n3",
    user_id: "u1",
    title: "⚠️ SLA Alert: Task High Priority",
    message: "High-priority deliverable due soon. Critical-path downstream tasks depend on it.",
    category: "SLA_WARNING",
    link: "/tasks",
    is_read: true,
    created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
];

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const containerRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "APPROVAL":
        return <Check size={13} className="text-emerald-600 shrink-0" />;
      case "SLA_WARNING":
        return <AlertTriangle size={13} className="text-rose-600 shrink-0" />;
      case "AUTOMATION":
        return <Sparkles size={13} className="text-indigo-600 shrink-0" />;
      default:
        return <MessageSquare size={13} className="text-slate-500 shrink-0" />;
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
        title="Notifications"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-rose-500 text-white font-bold text-[9px] flex items-center justify-center shadow-xs">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 rounded-xl bg-white border border-slate-200 shadow-xl overflow-hidden text-slate-800">
          <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800">Activity Center</span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-[10px] text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={cn(
                  "p-3 text-xs flex gap-2.5 hover:bg-slate-50 transition-colors",
                  !n.is_read ? "bg-indigo-50/30" : "bg-white"
                )}
              >
                <div className="mt-0.5">{getCategoryIcon(n.category)}</div>
                <div className="flex flex-col flex-1 gap-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 text-[11px]">{n.title}</span>
                    <span className="text-[9px] text-slate-400">
                      {new Date(n.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-sans">{n.message}</p>
                  {n.link && (
                    <Link
                      href={n.link}
                      onClick={() => setOpen(false)}
                      className="text-[10px] font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1 mt-0.5"
                    >
                      <span>View details</span>
                      <ExternalLink size={9} />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="p-2 border-t border-slate-100 bg-slate-50 text-center">
            <span className="text-[10px] text-slate-400">Desi Muchads Autonomous Telemetry</span>
          </div>
        </div>
      )}
    </div>
  );
}
