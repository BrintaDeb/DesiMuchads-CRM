import { create } from "zustand";
import { api } from "@/lib/api";

interface TaskTimerState {
  activeTaskId: string | null;
  activeTaskTitle: string | null;
  elapsedSeconds: number;
  isRunning: boolean;
  startTimer: (taskId: string, title: string) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopAndLogTime: () => Promise<void>;
  tick: () => void;
}

export const useTaskTimerStore = create<TaskTimerState>((set, get) => ({
  activeTaskId: "t102",
  activeTaskTitle: "10x Festive Ad Copy & Reel Scripts",
  elapsedSeconds: 2700, // 45m active
  isRunning: true,

  startTimer: (taskId, title) => {
    set({
      activeTaskId: taskId,
      activeTaskTitle: title,
      elapsedSeconds: 0,
      isRunning: true,
    });
  },

  pauseTimer: () => set({ isRunning: false }),
  resumeTimer: () => set({ isRunning: true }),

  stopAndLogTime: async () => {
    const { activeTaskId, elapsedSeconds } = get();
    if (!activeTaskId || elapsedSeconds <= 0) {
      set({ activeTaskId: null, activeTaskTitle: null, elapsedSeconds: 0, isRunning: false });
      return;
    }
    const hours = Math.round((elapsedSeconds / 3600) * 100) / 100;
    try {
      await api.post(`/tasks/${activeTaskId}/time-log`, { hours_to_add: hours });
    } catch {}
    set({
      activeTaskId: null,
      activeTaskTitle: null,
      elapsedSeconds: 0,
      isRunning: false,
    });
  },

  tick: () => {
    if (get().isRunning && get().activeTaskId) {
      set((state) => ({ elapsedSeconds: state.elapsedSeconds + 1 }));
    }
  },
}));

