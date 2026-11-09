"use client";

import React, { useEffect } from "react";
import { TopHeader } from "@/components/layout/TopHeader";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { MobileNav } from "@/components/layout/MobileNav";
import { InstallAppBanner } from "@/components/layout/InstallAppBanner";
import { useAuthStore } from "@/stores/authStore";
import { realtime } from "@/lib/websocket";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { initializeAuth, token } = useAuthStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Connect to realtime telemetry bus
  useEffect(() => {
    if (token) {
      realtime.connect(token);

      const unsubscribe = realtime.subscribe((msg: any) => {
        if (!msg) return;

        switch (msg.type) {
          case "ATTENDANCE_CHANGED":
            toast.info(`Attendance: ${msg.payload?.full_name || "Team Member"} is now ${msg.payload?.status}`);
            queryClient.invalidateQueries({ queryKey: ["attendance"] });
            break;
          case "TASK_STATUS_CHANGED":
          case "TASK_MUTATION":
            toast.info(`Task Updated: "${msg.payload?.title || msg.payload?.task_title || "Task"}" → ${msg.payload?.status}`);
            queryClient.invalidateQueries({ queryKey: ["tasks"] });
            queryClient.invalidateQueries({ queryKey: ["dashboard"] });
            break;
          case "PROPOSAL_SENT":
            toast.success(`Strategic proposal dispatched for ${msg.payload?.company_name}!`);
            queryClient.invalidateQueries({ queryKey: ["deals"] });
            break;
          case "CLIENT_ONBOARDED":
            toast.success(`Autonomous Onboarding Complete: ${msg.payload?.company_name} is active!`);
            queryClient.invalidateQueries({ queryKey: ["deals"] });
            queryClient.invalidateQueries({ queryKey: ["clients"] });
            break;
          case "NOTIFICATION":
            toast(msg.payload?.title || "New Notification", {
              description: msg.payload?.message,
            });
            break;
          default:
            break;
        }
      });

      return () => {
        unsubscribe();
      };
    }
  }, [token, queryClient]);

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1E293B] flex flex-col font-sans">
      <TopHeader />
      <CommandPalette />

      <main className="flex-1 pt-12 pb-20 md:pb-8 px-3 sm:px-6 lg:px-8">
        <div className="max-w-[1600px] mx-auto w-full">{children}</div>
      </main>

      <MobileNav />
      <InstallAppBanner />
    </div>
  );
}
