"use client";

import React, { useEffect, useState } from "react";
import { Play, Pause, Square, Clock, Coffee, Building2, Laptop } from "lucide-react";
import { useAttendanceStore } from "@/stores/attendanceStore";
import { formatDuration, cn } from "@/lib/utils";
import { toast } from "sonner";
import { WorkMode } from "@/types";

export function AttendanceWidget() {
  const {
    status,
    workMode,
    workedSeconds,
    breakSeconds,
    clockIn,
    toggleBreak,
    clockOut,
    tick,
  } = useAttendanceStore();

  const [modeDropdown, setModeDropdown] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      tick();
    }, 1000);
    return () => clearInterval(timer);
  }, [tick]);

  const handleClockIn = async (mode: WorkMode) => {
    await clockIn(mode);
    setModeDropdown(false);
    toast.success(`Clocked in (${mode.replace("_", " ")})`);
  };

  const handleBreak = async (action: "start" | "resume") => {
    await toggleBreak(action);
    toast.info(action === "start" ? "Break started" : "Resumed shift");
  };

  const handleClockOut = async () => {
    await clockOut();
    toast.success("Clocked out. Shift logged.");
  };

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/10 hover:bg-white/15 border border-white/20 text-white text-xs transition-colors">
      {/* Status indicator and timer */}
      <div className="flex items-center gap-2 pr-1.5 border-r border-white/20">
        <div
          className={cn(
            "w-2 h-2 rounded-full",
            status === "ACTIVE" && "bg-emerald-400 animate-pulse",
            status === "ON_BREAK" && "bg-amber-400 animate-pulse",
            status === "COMPLETED" && "bg-white/40"
          )}
        />
        <div className="flex flex-col">
          <div className="flex items-center gap-1 font-mono text-[11px] font-semibold text-white">
            <Clock size={11} className="text-white/70" />
            <span>{formatDuration(workedSeconds)}</span>
          </div>
          <span className="hidden sm:inline text-[9px] text-white/70 font-mono capitalize">
            {status === "ACTIVE"
              ? `Working (${workMode.replace("_", " ").toLowerCase()})`
              : status === "ON_BREAK"
              ? `Break: ${formatDuration(breakSeconds)}`
              : "Not Clocked In"}
          </span>
        </div>
      </div>

      {/* Terminal Controls */}
      <div className="flex items-center gap-1">
        {status === "COMPLETED" ? (
          <div className="relative">
            <button
              onClick={() => setModeDropdown(!modeDropdown)}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-[11px] shadow-xs transition-colors"
            >
              <Play size={10} fill="currentColor" />
              <span>Clock In</span>
            </button>

            {modeDropdown && (
              <div className="absolute top-7 right-0 z-50 w-36 py-1 bg-white border border-slate-200 rounded-lg shadow-xl flex flex-col text-slate-800">
                <button
                  onClick={() => handleClockIn("IN_OFFICE")}
                  className="flex items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-slate-50 transition-colors"
                >
                  <Building2 size={12} className="text-emerald-600" />
                  <span>In-Office</span>
                </button>
                <button
                  onClick={() => handleClockIn("REMOTE")}
                  className="flex items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-slate-50 transition-colors"
                >
                  <Laptop size={12} className="text-indigo-600" />
                  <span>Remote</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1">
            {status === "ACTIVE" ? (
              <button
                onClick={() => handleBreak("start")}
                className="p-1 rounded bg-white/10 hover:bg-white/20 text-white"
                title="Start break"
              >
                <Coffee size={12} />
              </button>
            ) : (
              <button
                onClick={() => handleBreak("resume")}
                className="p-1 rounded bg-amber-400 text-slate-900 font-bold"
                title="Resume shift"
              >
                <Play size={12} fill="currentColor" />
              </button>
            )}
            <button
              onClick={handleClockOut}
              className="p-1 rounded bg-rose-500 hover:bg-rose-600 text-white"
              title="Clock out"
            >
              <Square size={12} fill="currentColor" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
