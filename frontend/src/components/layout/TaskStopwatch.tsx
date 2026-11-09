"use client";

import React, { useEffect } from "react";
import { Play, Pause, Check, Timer } from "lucide-react";
import { useTaskTimerStore } from "@/stores/taskTimerStore";
import { formatDuration } from "@/lib/utils";
import { toast } from "sonner";

export function TaskStopwatch() {
  const {
    activeTaskId,
    activeTaskTitle,
    elapsedSeconds,
    isRunning,
    pauseTimer,
    resumeTimer,
    stopAndLogTime,
    tick,
  } = useTaskTimerStore();

  useEffect(() => {
    const interval = setInterval(() => {
      tick();
    }, 1000);
    return () => clearInterval(interval);
  }, [tick]);

  if (!activeTaskId) {
    return (
      <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/10 text-white/70 text-xs">
        <Timer size={13} />
        <span className="font-mono text-[11px]">No active timer</span>
      </div>
    );
  }

  const handleStop = async () => {
    await stopAndLogTime();
    toast.success("Time logged to task successfully");
  };

  return (
    <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/10 hover:bg-white/15 border border-white/20 text-white text-xs max-w-sm transition-colors">
      <div className="flex items-center gap-1.5 pr-2 border-r border-white/20 truncate">
        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
        <div className="flex flex-col truncate">
          <span className="text-[10px] text-white/80 font-mono truncate max-w-[120px]" title={activeTaskTitle || ""}>
            {activeTaskTitle}
          </span>
          <span className="font-mono text-[11px] font-bold text-white">
            {formatDuration(elapsedSeconds)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {isRunning ? (
          <button
            onClick={pauseTimer}
            className="p-1 rounded bg-white/10 hover:bg-white/20 text-white"
            title="Pause timer"
          >
            <Pause size={11} />
          </button>
        ) : (
          <button
            onClick={resumeTimer}
            className="p-1 rounded bg-emerald-500 hover:bg-emerald-400 text-white"
            title="Resume timer"
          >
            <Play size={11} fill="currentColor" />
          </button>
        )}
        <button
          onClick={handleStop}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 hover:bg-emerald-500/30 text-[10px] font-mono"
          title="Log billable hours"
        >
          <Check size={10} />
          <span>Log</span>
        </button>
      </div>
    </div>
  );
}
