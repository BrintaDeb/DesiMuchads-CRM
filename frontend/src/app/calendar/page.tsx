"use client";

import React, { useState } from "react";
import {
  CalendarDays,
  Plus,
  Filter,
  CheckCircle2,
  Clock,
  Users,
  Palmtree,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Video,
  AlertCircle,
  FileText,
  Calendar as CalendarIcon,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MasterCalendarFeedItem } from "@/types";
import { OdooControlPanel } from "@/components/layout/OdooControlPanel";
import { toast } from "sonner";

const initialEvents: MasterCalendarFeedItem[] = [];

export default function CalendarPage() {
  const [events, setEvents] = useState<MasterCalendarFeedItem[]>(initialEvents);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban"); // kanban = Month Grid, list = Agenda
  const [searchQuery, setSearchQuery] = useState("");
  const [activeLayers, setActiveLayers] = useState<Record<string, boolean>>({
    CONTENT: true,
    DEADLINE: true,
    MEETING: true,
    LEAVE: true,
  });
  const [selectedEvent, setSelectedEvent] = useState<MasterCalendarFeedItem | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: "",
    layer: "MEETING" as "CONTENT" | "DEADLINE" | "MEETING" | "LEAVE",
    date: "2026-11-18",
    time: "14:00",
    client_name: "",
    meeting_link: "",
  });

  const toggleLayer = (layer: string) => {
    setActiveLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  const filteredEvents = events.filter((ev) => {
    const matchesLayer = activeLayers[ev.layer];
    const matchesSearch =
      ev.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ev.client_name && ev.client_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (ev.assigned_to_name && ev.assigned_to_name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesLayer && matchesSearch;
  });

  const getLayerMeta = (layer: string) => {
    switch (layer) {
      case "CONTENT":
        return {
          label: "Content Drops",
          color: "bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100",
          dot: "bg-pink-500",
          borderLeft: "border-l-4 border-l-pink-500",
        };
      case "DEADLINE":
        return {
          label: "Hard Deadlines",
          color: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
          dot: "bg-amber-500",
          borderLeft: "border-l-4 border-l-amber-500",
        };
      case "MEETING":
        return {
          label: "Client Meetings",
          color: "bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100",
          dot: "bg-sky-500",
          borderLeft: "border-l-4 border-l-sky-500",
        };
      case "LEAVE":
        return {
          label: "Team Leaves",
          color: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
          dot: "bg-emerald-500",
          borderLeft: "border-l-4 border-l-emerald-500",
        };
      default:
        return {
          label: layer,
          color: "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100",
          dot: "bg-slate-400",
          borderLeft: "border-l-4 border-l-slate-400",
        };
    }
  };

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title.trim()) return;

    const item: MasterCalendarFeedItem = {
      id: `e_${Date.now()}`,
      layer: newEvent.layer,
      title: newEvent.title,
      start: `${newEvent.date}T${newEvent.time}:00Z`,
      end: `${newEvent.date}T${newEvent.time}:00Z`,
      status: "SCHEDULED",
      client_name: newEvent.client_name || undefined,
      metadata: newEvent.meeting_link ? { meeting_link: newEvent.meeting_link } : undefined,
    };

    setEvents((prev) => [...prev, item]);
    setShowNewModal(false);
    setNewEvent({
      title: "",
      layer: "MEETING",
      date: "2026-11-18",
      time: "14:00",
      client_name: "",
      meeting_link: "",
    });
    toast.success("Event scheduled on Master Calendar!");
  };

  // 30 Days of November 2026 grid (Starts Sunday Nov 1)
  const daysInMonth = Array.from({ length: 30 }, (_, i) => i + 1);

  return (
    <div className="space-y-4">
      {/* Odoo Control Panel */}
      <OdooControlPanel
        appName="Master Calendar"
        viewName="Unified Schedule"
        newButtonLabel="New Event"
        onNewClick={() => setShowNewModal(true)}
        activeView={viewMode}
        onViewChange={(v) => setViewMode(v as any)}
        availableViews={["kanban", "list"]}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        totalCount={filteredEvents.length}
      />

      {/* Main Workspace with Odoo Left Filter Sidebar and Right Calendar Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left Filter & Layer Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          {/* Mini Calendar Month Card */}
          <div className="bg-white border border-[#E2E8F0] rounded shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-[#1E293B]">
              <span>November 2026</span>
              <div className="flex items-center gap-1 text-[#64748B]">
                <button className="p-1 hover:bg-[#F1F5F9] rounded"><ChevronLeft size={14} /></button>
                <button className="p-1 hover:bg-[#F1F5F9] rounded"><ChevronRight size={14} /></button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-[#94A3B8]">
              <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {daysInMonth.map((d) => {
                const hasEvent = events.some((ev) => {
                  const day = new Date(ev.start).getDate();
                  return day === d;
                });
                return (
                  <div
                    key={d}
                    className={cn(
                      "py-1.5 rounded text-xs transition-colors cursor-pointer",
                      d === 10
                        ? "bg-[#714B67] text-white font-bold"
                        : hasEvent
                        ? "bg-[#F1F5F9] text-[#1E293B] font-semibold hover:bg-[#E2E8F0]"
                        : "text-[#64748B] hover:bg-[#F8F9FA]"
                    )}
                  >
                    {d}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Master Layer Filters Card */}
          <div className="bg-white border border-[#E2E8F0] rounded shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
              <span className="text-xs font-bold text-[#1E293B] uppercase tracking-wider">
                Calendar Layers
              </span>
              <span className="text-[11px] font-mono text-[#64748B]">4 Multi-Tier</span>
            </div>

            <div className="space-y-2">
              <label className="flex items-center justify-between p-2 rounded hover:bg-[#F8F9FA] cursor-pointer text-xs transition-colors">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-pink-500" />
                  <span className="text-[#334155] font-medium">Layer 1: Content Drops</span>
                </div>
                <input
                  type="checkbox"
                  checked={activeLayers.CONTENT}
                  onChange={() => toggleLayer("CONTENT")}
                  className="rounded border-[#CBD5E1] text-[#714B67] focus:ring-[#714B67]"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded hover:bg-[#F8F9FA] cursor-pointer text-xs transition-colors">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="text-[#334155] font-medium">Layer 2: Hard Deadlines</span>
                </div>
                <input
                  type="checkbox"
                  checked={activeLayers.DEADLINE}
                  onChange={() => toggleLayer("DEADLINE")}
                  className="rounded border-[#CBD5E1] text-[#714B67] focus:ring-[#714B67]"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded hover:bg-[#F8F9FA] cursor-pointer text-xs transition-colors">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-sky-500" />
                  <span className="text-[#334155] font-medium">Layer 3: Client Meetings</span>
                </div>
                <input
                  type="checkbox"
                  checked={activeLayers.MEETING}
                  onChange={() => toggleLayer("MEETING")}
                  className="rounded border-[#CBD5E1] text-[#714B67] focus:ring-[#714B67]"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded hover:bg-[#F8F9FA] cursor-pointer text-xs transition-colors">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-[#334155] font-medium">Layer 4: Team Leaves</span>
                </div>
                <input
                  type="checkbox"
                  checked={activeLayers.LEAVE}
                  onChange={() => toggleLayer("LEAVE")}
                  className="rounded border-[#CBD5E1] text-[#714B67] focus:ring-[#714B67]"
                />
              </label>
            </div>
          </div>

          {/* Quick Notice Card */}
          <div className="bg-[#FAF5FF] border border-[#E9D5FF] rounded p-3.5 space-y-1.5 text-xs text-[#6B21A8]">
            <div className="flex items-center gap-1.5 font-bold">
              <Sparkles size={14} />
              <span>SLA Reminder Daemon</span>
            </div>
            <p className="text-[11px] leading-relaxed text-[#7E22CE]">
              Background workers dispatch in-app notifications and email digests at T-24h and T-2h before any scheduled deliverable or client sync.
            </p>
          </div>
        </div>

        {/* Right Main Calendar Board (Month Grid or Agenda List) */}
        <div className="lg:col-span-3">
          {viewMode === "kanban" ? (
            /* Month Calendar Grid */
            <div className="bg-white border border-[#E2E8F0] rounded shadow-sm overflow-hidden">
              {/* Header Days of Week */}
              <div className="grid grid-cols-7 border-b border-[#E2E8F0] bg-[#F8F9FA] text-center text-xs font-semibold text-[#475569] py-2">
                <span>Sun</span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
              </div>

              {/* 35 Day Cells (5 Weeks) */}
              <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-[#E2E8F0]">
                {daysInMonth.map((d) => {
                  const dayEvents = filteredEvents.filter((ev) => {
                    const day = new Date(ev.start).getDate();
                    return day === d;
                  });

                  return (
                    <div
                      key={d}
                      className={cn(
                        "min-h-[110px] p-1.5 flex flex-col justify-between hover:bg-[#FAFAFA] transition-colors",
                        d === 10 ? "bg-[#FFFBEB]/40" : ""
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={cn(
                            "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
                            d === 10
                              ? "bg-[#714B67] text-white font-bold"
                              : "text-[#64748B]"
                          )}
                        >
                          {d}
                        </span>
                        {dayEvents.length > 0 && (
                          <span className="text-[10px] font-mono text-[#94A3B8]">
                            {dayEvents.length} ev
                          </span>
                        )}
                      </div>

                      <div className="space-y-1 flex-1">
                        {dayEvents.slice(0, 2).map((ev) => {
                          const meta = getLayerMeta(ev.layer);
                          return (
                            <button
                              key={ev.id}
                              onClick={() => setSelectedEvent(ev)}
                              className={cn(
                                "w-full text-left px-1.5 py-1 rounded text-[11px] font-medium border truncate block transition-all shadow-xs",
                                meta.color
                              )}
                            >
                              <div className="flex items-center gap-1 truncate">
                                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", meta.dot)} />
                                <span className="truncate">{ev.title}</span>
                              </div>
                            </button>
                          );
                        })}
                        {dayEvents.length > 2 && (
                          <div className="text-[10px] text-[#64748B] pl-1 font-medium">
                            +{dayEvents.length - 2} more...
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Agenda List View */
            <div className="bg-white border border-[#E2E8F0] rounded shadow-sm divide-y divide-[#E2E8F0]">
              <div className="p-3.5 bg-[#F8F9FA] flex items-center justify-between">
                <span className="text-xs font-bold text-[#1E293B] uppercase tracking-wider">
                  Upcoming Agenda ({filteredEvents.length} Events)
                </span>
                <span className="text-xs text-[#64748B]">Sorted by Date & Time</span>
              </div>

              {filteredEvents.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#94A3B8]">
                  No calendar events match the selected layers or filter.
                </div>
              ) : (
                filteredEvents.map((item) => {
                  const meta = getLayerMeta(item.layer);
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedEvent(item)}
                      className={cn(
                        "p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F8F9FA] transition-colors cursor-pointer",
                        meta.borderLeft
                      )}
                    >
                      <div className="flex items-start sm:items-center gap-3">
                        <span className={cn("text-[10px] font-mono px-2 py-0.5 rounded border shrink-0", meta.color)}>
                          {item.layer}
                        </span>

                        <div className="space-y-0.5">
                          <h3 className="text-sm font-semibold text-[#1E293B]">{item.title}</h3>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-[#64748B]">
                            {item.client_name && <span>Client: <strong>{item.client_name}</strong></span>}
                            {item.assigned_to_name && <span>Assignee: <strong>{item.assigned_to_name}</strong></span>}
                            {item.status && (
                              <span className="px-1.5 py-0.2 bg-[#F1F5F9] rounded text-[10px] font-mono text-[#475569]">
                                {item.status}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                        <div className="text-right font-mono text-xs text-[#475569]">
                          <div>{new Date(item.start).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</div>
                          <div className="text-[11px] text-[#94A3B8]">
                            {new Date(item.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>

                        {item.metadata?.meeting_link && (
                          <a
                            href={item.metadata.meeting_link}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#008784] hover:bg-[#00706D] text-white text-xs font-medium transition-colors shadow-xs"
                          >
                            <Video size={13} />
                            <span>Join</span>
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Event Details Popover / Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white border border-[#CBD5E1] rounded-lg max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <span className={cn("text-xs font-mono px-2 py-0.5 rounded border", getLayerMeta(selectedEvent.layer).color)}>
                {selectedEvent.layer}
              </span>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-[#94A3B8] hover:text-[#1E293B]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="text-base font-bold text-[#1E293B]">{selectedEvent.title}</h3>
              <div className="text-xs text-[#64748B] space-y-1 font-mono">
                <div>
                  📅 Date:{" "}
                  <strong className="text-[#1E293B]">
                    {new Date(selectedEvent.start).toLocaleDateString(undefined, {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </strong>
                </div>
                <div>
                  ⏰ Time:{" "}
                  <strong className="text-[#1E293B]">
                    {new Date(selectedEvent.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </strong>
                </div>
                {selectedEvent.client_name && (
                  <div>
                    🏢 Client: <strong className="text-[#1E293B]">{selectedEvent.client_name}</strong>
                  </div>
                )}
                {selectedEvent.assigned_to_name && (
                  <div>
                    👤 Assignee: <strong className="text-[#1E293B]">{selectedEvent.assigned_to_name}</strong>
                  </div>
                )}
              </div>
            </div>

            {selectedEvent.metadata?.meeting_link && (
              <a
                href={selectedEvent.metadata.meeting_link}
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-2 py-2 rounded bg-[#008784] hover:bg-[#00706D] text-white font-medium text-xs shadow-xs"
              >
                <Video size={14} />
                <span>Launch Google Meet Room</span>
              </a>
            )}

            <div className="flex justify-end pt-2 border-t border-[#F1F5F9]">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-3 py-1.5 rounded bg-[#F1F5F9] hover:bg-[#E2E8F0] text-xs font-medium text-[#475569]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Event Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <form
            onSubmit={handleCreateEvent}
            className="bg-white border border-[#CBD5E1] rounded-lg max-w-md w-full p-6 space-y-4 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <h3 className="text-sm font-bold text-[#1E293B]">Schedule Calendar Event</h3>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="text-[#94A3B8] hover:text-[#1E293B]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[#475569] font-medium mb-1">Event Title *</label>
                <input
                  type="text"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  placeholder="e.g. Strategy & Growth Sync"
                  className="w-full bg-[#F8F9FA] border border-[#CBD5E1] rounded p-2 text-xs text-[#1E293B] outline-none focus:border-[#714B67]"
                  required
                />
              </div>

              <div>
                <label className="block text-[#475569] font-medium mb-1">Calendar Layer *</label>
                <select
                  value={newEvent.layer}
                  onChange={(e) => setNewEvent({ ...newEvent, layer: e.target.value as any })}
                  className="w-full bg-[#F8F9FA] border border-[#CBD5E1] rounded p-2 text-xs text-[#1E293B] outline-none"
                >
                  <option value="MEETING">Layer 3: Client Meeting</option>
                  <option value="CONTENT">Layer 1: Content Publishing Drop</option>
                  <option value="DEADLINE">Layer 2: Hard Task Deadline</option>
                  <option value="LEAVE">Layer 4: Team Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#475569] font-medium mb-1">Date</label>
                  <input
                    type="date"
                    value={newEvent.date}
                    onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                    className="w-full bg-[#F8F9FA] border border-[#CBD5E1] rounded p-2 text-xs text-[#1E293B] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#475569] font-medium mb-1">Time (UTC)</label>
                  <input
                    type="time"
                    value={newEvent.time}
                    onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                    className="w-full bg-[#F8F9FA] border border-[#CBD5E1] rounded p-2 text-xs text-[#1E293B] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#475569] font-medium mb-1">Client Organization (Optional)</label>
                <input
                  type="text"
                  value={newEvent.client_name}
                  onChange={(e) => setNewEvent({ ...newEvent, client_name: e.target.value })}
                  placeholder="e.g. Acme Corp / Client Name"
                  className="w-full bg-[#F8F9FA] border border-[#CBD5E1] rounded p-2 text-xs text-[#1E293B] outline-none"
                />
              </div>

              <div>
                <label className="block text-[#475569] font-medium mb-1">Meeting Link (Google Meet / Zoom)</label>
                <input
                  type="url"
                  value={newEvent.meeting_link}
                  onChange={(e) => setNewEvent({ ...newEvent, meeting_link: e.target.value })}
                  placeholder="https://meet.google.com/xyz-abc"
                  className="w-full bg-[#F8F9FA] border border-[#CBD5E1] rounded p-2 text-xs text-[#1E293B] outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#F1F5F9]">
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="px-3 py-1.5 rounded bg-[#F1F5F9] hover:bg-[#E2E8F0] text-xs font-medium text-[#475569]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded bg-[#714B67] hover:bg-[#5E3D55] text-white font-medium text-xs transition-colors shadow-xs"
              >
                Schedule Event
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
