"use client";

import React, { useState } from "react";
import {
  Clock,
  Coffee,
  Play,
  Square,
  AlertTriangle,
  Palmtree,
  CheckCircle2,
  Building2,
  Laptop,
  Check,
  X,
  Plus,
} from "lucide-react";
import { formatDuration, cn } from "@/lib/utils";
import { useAttendanceStore } from "@/stores/attendanceStore";
import { toast } from "sonner";
import { LeaveType, WorkMode } from "@/types";
import { OdooControlPanel } from "@/components/layout/OdooControlPanel";

interface LeaveRequestItem {
  id: string;
  user_name: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  conflicting_tasks?: string[];
}

const mockLeaveRequests: LeaveRequestItem[] = [
  {
    id: "l1",
    user_name: "Aarav Sharma",
    leave_type: "EARNED",
    start_date: "2026-11-20",
    end_date: "2026-11-23",
    reason: "Family wedding and travel back to Jaipur.",
    status: "PENDING",
    conflicting_tasks: ["Google Tag Manager Pixel Audit (Due Nov 21)"],
  },
  {
    id: "l2",
    user_name: "Priya Patel",
    leave_type: "CASUAL",
    start_date: "2026-11-17",
    end_date: "2026-11-17",
    reason: "Personal appointment.",
    status: "APPROVED",
  },
];

export default function AttendancePage() {
  const {
    status,
    workMode,
    workedSeconds,
    breakSeconds,
    clockIn,
    toggleBreak,
    clockOut,
  } = useAttendanceStore();

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestItem[]>(mockLeaveRequests);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    leave_type: "CASUAL" as LeaveType,
    start_date: "2026-11-25",
    end_date: "2026-11-26",
    reason: "",
  });

  const handleReviewLeave = (id: string, newStatus: "APPROVED" | "REJECTED") => {
    setLeaveRequests((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status: newStatus } : l))
    );
    if (newStatus === "APPROVED") {
      toast.success("Leave approved. Capacity Guardrail: Dates blocked on master calendar.");
    } else {
      toast.info("Leave request rejected.");
    }
  };

  const handleCreateLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveForm.reason) return;

    const newLeave: LeaveRequestItem = {
      id: `l${Date.now()}`,
      user_name: "Current User",
      leave_type: leaveForm.leave_type,
      start_date: leaveForm.start_date,
      end_date: leaveForm.end_date,
      reason: leaveForm.reason,
      status: "PENDING",
    };

    setLeaveRequests([newLeave, ...leaveRequests]);
    setShowLeaveModal(false);
    toast.success("Leave request submitted for manager review.");
  };

  return (
    <div>
      {/* Odoo Control Panel Sub-Header */}
      <OdooControlPanel
        appName="Attendance & HR"
        viewName="Workforce Shifts & Leaves"
        onNewClick={() => setShowLeaveModal(true)}
        newButtonLabel="Request Leave"
        availableViews={["list"]}
        secondaryActions={
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono px-2 py-1 rounded bg-teal-50 text-teal-700 border border-teal-200 hidden sm:inline-block">
              Auto-Checkout &gt;12h Protection
            </span>
          </div>
        }
      />

      <div className="space-y-6">
        {/* Terminal Kiosk & Stats Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Smart Attendance Terminal Card */}
          <div className="lg:col-span-2 bg-white rounded-xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-2.5 h-2.5 rounded-full",
                      status === "ACTIVE" && "bg-emerald-500 animate-pulse",
                      status === "ON_BREAK" && "bg-amber-500 animate-pulse",
                      status === "COMPLETED" && "bg-slate-300"
                    )}
                  />
                  <h2 className="text-base font-bold text-slate-900">Shift Attendance Terminal</h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Single-click biometric check-in with UTC timestamps and automated break logging
                </p>
              </div>

              <span
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-bold border",
                  status === "ACTIVE"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : status === "ON_BREAK"
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-slate-100 text-slate-600 border-slate-200"
                )}
              >
                {status === "ACTIVE"
                  ? `Active Shift (${workMode.replace("_", " ")})`
                  : status === "ON_BREAK"
                  ? "On Break"
                  : "Checked Out"}
              </span>
            </div>

            {/* Time counters */}
            <div className="grid grid-cols-2 gap-4 my-6">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-semibold text-slate-500 block mb-1">
                  Net Worked Shift Time
                </span>
                <span className="text-3xl font-mono font-bold text-slate-900 tracking-tight">
                  {formatDuration(workedSeconds)}
                </span>
                <span className="text-[11px] text-slate-400 block mt-1">Quota: 8h 00m / day</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-semibold text-slate-500 block mb-1">
                  Total Break Time
                </span>
                <span className="text-3xl font-mono font-bold text-amber-600 tracking-tight">
                  {formatDuration(breakSeconds)}
                </span>
                <span className="text-[11px] text-slate-400 block mt-1">Max standard: 1h 00m</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-100">
              {status === "COMPLETED" ? (
                <>
                  <button
                    onClick={() => clockIn("IN_OFFICE")}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shadow-xs"
                  >
                    <Building2 size={15} />
                    <span>Clock In (In-Office)</span>
                  </button>
                  <button
                    onClick={() => clockIn("REMOTE")}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors shadow-xs"
                  >
                    <Laptop size={15} />
                    <span>Clock In (Remote)</span>
                  </button>
                </>
              ) : (
                <>
                  {status === "ACTIVE" ? (
                    <button
                      onClick={() => toggleBreak("start")}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-xs transition-colors shadow-xs"
                    >
                      <Coffee size={14} />
                      <span>Start Break</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => toggleBreak("resume")}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shadow-xs"
                    >
                      <Play size={14} fill="currentColor" />
                      <span>Resume Working Shift</span>
                    </button>
                  )}

                  <button
                    onClick={clockOut}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors shadow-xs"
                  >
                    <Square size={13} fill="currentColor" />
                    <span>Clock Out & End Day</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Leave & Capacity Balances */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">Paid Leave Balances</h3>
                <Palmtree size={16} className="text-teal-600" />
              </div>

              <div className="space-y-3 mt-4 text-xs">
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div>
                    <span className="font-semibold text-slate-800 block">Casual Leave (CL)</span>
                    <span className="text-[11px] text-slate-400">Personal & urgent matters</span>
                  </div>
                  <span className="text-base font-bold font-mono text-[#714B67]">8 / 12 Days</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div>
                    <span className="font-semibold text-slate-800 block">Earned Leave (EL)</span>
                    <span className="text-[11px] text-slate-400">Annual accrued vacations</span>
                  </div>
                  <span className="text-base font-bold font-mono text-emerald-700">14 / 18 Days</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div>
                    <span className="font-semibold text-slate-800 block">Sick Leave (SL)</span>
                    <span className="text-[11px] text-slate-400">Medical emergency</span>
                  </div>
                  <span className="text-base font-bold font-mono text-slate-700">6 / 8 Days</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowLeaveModal(true)}
              className="w-full mt-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition-colors"
            >
              + Apply for Leave
            </button>
          </div>
        </div>

        {/* Leave Requests & Capacity Conflict Guardrail */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Leave Requests & Capacity Guardrail</h3>
              <p className="text-xs text-slate-500">
                Automated detection of overlapping task deadlines prior to manager approval
              </p>
            </div>
            <span className="text-xs font-mono text-slate-500">{leaveRequests.length} Total Requests</span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {leaveRequests.map((leave) => (
              <div key={leave.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50/50">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{leave.user_name}</span>
                    <span className="px-2 py-0.2 rounded-full font-mono text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      {leave.leave_type}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="font-mono text-slate-600 font-medium">
                      {leave.start_date} to {leave.end_date}
                    </span>
                  </div>
                  <p className="text-slate-500 text-xs">{leave.reason}</p>

                  {/* Conflicting Tasks Guardrail */}
                  {leave.conflicting_tasks && leave.conflicting_tasks.length > 0 && (
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-800 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200 w-fit mt-1">
                      <AlertTriangle size={12} className="text-amber-600 shrink-0" />
                      <span>Capacity Conflict: {leave.conflicting_tasks.join(", ")}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {leave.status === "PENDING" ? (
                    <>
                      <button
                        onClick={() => handleReviewLeave(leave.id, "APPROVED")}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-xs"
                      >
                        <Check size={13} />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => handleReviewLeave(leave.id, "REJECTED")}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs border border-rose-200"
                      >
                        <X size={13} />
                        <span>Reject</span>
                      </button>
                    </>
                  ) : (
                    <span
                      className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-bold border",
                        leave.status === "APPROVED"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-rose-50 text-rose-700 border-rose-200"
                      )}
                    >
                      {leave.status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Leave Request Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900">Request Time Off</h2>
              <button onClick={() => setShowLeaveModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateLeave} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">LEAVE TYPE</label>
                <select
                  value={leaveForm.leave_type}
                  onChange={(e) => setLeaveForm({ ...leaveForm, leave_type: e.target.value as LeaveType })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#714B67]"
                >
                  <option value="CASUAL">Casual Leave (CL)</option>
                  <option value="SICK">Sick Leave (SL)</option>
                  <option value="EARNED">Earned / Privilege Leave (EL)</option>
                  <option value="UNPAID">Unpaid Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">START DATE</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.start_date}
                    onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#714B67] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">END DATE</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.end_date}
                    onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#714B67] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">REASON FOR LEAVE</label>
                <textarea
                  rows={3}
                  required
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  placeholder="Provide context for manager approval..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#714B67] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-800 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#714B67] hover:bg-[#58364F] text-white font-semibold text-xs shadow-xs"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
