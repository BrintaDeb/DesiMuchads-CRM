import { create } from "zustand";
import { AttendanceStatus, WorkMode } from "@/types";
import { api } from "@/lib/api";

interface AttendanceState {
  status: AttendanceStatus;
  workMode: WorkMode;
  clockInTime: string | null;
  breakStartTime: string | null;
  workedSeconds: number;
  breakSeconds: number;
  isLoading: boolean;
  clockIn: (mode?: WorkMode) => Promise<void>;
  toggleBreak: (action: "start" | "resume") => Promise<void>;
  clockOut: () => Promise<void>;
  tick: () => void;
  syncWithBackend: () => Promise<void>;
}

export const useAttendanceStore = create<AttendanceState>((set, get) => ({
  status: "ACTIVE",
  workMode: "IN_OFFICE",
  clockInTime: new Date(Date.now() - 3.5 * 3600 * 1000).toISOString(), // Mocked 3h 30m worked today
  breakStartTime: null,
  workedSeconds: 12600, // 3.5 hours
  breakSeconds: 1200,
  isLoading: false,

  clockIn: async (mode = "IN_OFFICE") => {
    set({ isLoading: true });
    try {
      const res = await api.post("/attendance/clock-in", { work_mode: mode });
      const record = res.data?.data;
      set({
        status: "ACTIVE",
        workMode: mode,
        clockInTime: record?.clock_in_at || new Date().toISOString(),
        workedSeconds: 0,
        breakSeconds: 0,
        breakStartTime: null,
      });
    } catch {
      // Local optimistic fallback
      set({
        status: "ACTIVE",
        workMode: mode,
        clockInTime: new Date().toISOString(),
        workedSeconds: 0,
        breakSeconds: 0,
        breakStartTime: null,
      });
    } finally {
      set({ isLoading: false });
    }
  },

  toggleBreak: async (action) => {
    set({ isLoading: true });
    try {
      await api.post("/attendance/break-toggle", { action });
      if (action === "start") {
        set({ status: "ON_BREAK", breakStartTime: new Date().toISOString() });
      } else {
        set({ status: "ACTIVE", breakStartTime: null });
      }
    } catch {
      // Optimistic fallback
      if (action === "start") {
        set({ status: "ON_BREAK", breakStartTime: new Date().toISOString() });
      } else {
        set({ status: "ACTIVE", breakStartTime: null });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  clockOut: async () => {
    set({ isLoading: true });
    try {
      await api.post("/attendance/clock-out");
      set({
        status: "COMPLETED",
        clockInTime: null,
        breakStartTime: null,
      });
    } catch {
      set({
        status: "COMPLETED",
        clockInTime: null,
        breakStartTime: null,
      });
    } finally {
      set({ isLoading: false });
    }
  },

  tick: () => {
    const { status } = get();
    if (status === "ACTIVE") {
      set((state) => ({ workedSeconds: state.workedSeconds + 1 }));
    } else if (status === "ON_BREAK") {
      set((state) => ({ breakSeconds: state.breakSeconds + 1 }));
    }
  },

  syncWithBackend: async () => {
    try {
      const res = await api.get("/attendance/my-status");
      const record = res.data?.data;
      if (record) {
        set({
          status: record.status,
          workMode: record.work_mode,
          clockInTime: record.clock_in_at,
          breakStartTime: record.break_start_at,
          workedSeconds: record.net_worked_seconds || 0,
          breakSeconds: record.total_break_seconds || 0,
        });
      }
    } catch {}
  },
}));

