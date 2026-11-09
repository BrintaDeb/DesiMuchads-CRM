"use client";

import React, { useState, useEffect } from "react";
import {
  Zap,
  Play,
  RotateCw,
  Plus,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Layers,
  ArrowRight,
  Sliders,
  Database,
  Trash2,
  X,
  FileCode,
  Activity,
  Check,
  Send,
  Eye,
  Bell,
  Cpu,
  Filter,
} from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { AutomationRule, DaemonStatus, AutomationAuditLog } from "@/types";
import { OdooControlPanel } from "@/components/layout/OdooControlPanel";

const initialDemoDaemons: DaemonStatus[] = [
  {
    id: "daemon-attendance-checkout",
    name: "Attendance Idle & Auto-Checkout Daemon",
    description: "Scans active attendance sessions >12h without task activity, flags them as REGULARIZATION_NEEDED, and auto clocks out.",
    schedule: "Runs every 60s (Continuous)",
    is_active: true,
    last_run_at: new Date().toISOString(),
    status: "HEALTHY",
  },
  {
    id: "daemon-sla-escalation",
    name: "High-Priority Task SLA Escalation Daemon",
    description: "Detects tasks with SLA deadlines <4h remaining or overdue, escalates priority to CRITICAL, and alerts Account Managers.",
    schedule: "Runs every 60s (Continuous)",
    is_active: true,
    last_run_at: new Date().toISOString(),
    status: "HEALTHY",
  },
  {
    id: "daemon-invoice-gating",
    name: "Overdue Retainer Invoice Gating Daemon",
    description: "Checks unpaid invoices >7 days past due, triggers overdue state, and gates non-critical client deliverables.",
    schedule: "Runs every 60s (Continuous)",
    is_active: true,
    last_run_at: new Date().toISOString(),
    status: "HEALTHY",
  },
  {
    id: "daemon-deal-decay",
    name: "CRM Opportunity Decay Tracker",
    description: "Flags deals in active pipeline untouched for >48 hours and alerts sales leads to prevent lead churn.",
    schedule: "Runs every 60s (Continuous)",
    is_active: true,
    last_run_at: new Date().toISOString(),
    status: "HEALTHY",
  },
  {
    id: "daemon-dag-cascade",
    name: "DAG Dependency Cascading Engine",
    description: "Monitors task completions, unlocks downstream prerequisite tasks, and dispatches real-time WebSocket notifications.",
    schedule: "Event-driven (Reactive)",
    is_active: true,
    last_run_at: new Date().toISOString(),
    status: "HEALTHY",
  },
  {
    id: "daemon-auto-onboard",
    name: "Autonomous Won Deal Onboarding Pipeline",
    description: "Converts won deals into client organizations, provisions S3 vaults, generates service blueprint tasks, and creates deposit invoices.",
    schedule: "Event-driven (Reactive)",
    is_active: true,
    last_run_at: new Date().toISOString(),
    status: "HEALTHY",
  },
];

const initialDemoRules: AutomationRule[] = [
  {
    id: "rule-1",
    name: "AI Creative Hook Generator on Task Ingestion",
    description: "Automatically triggers Gemini AI hook studio whenever a creative task moves to INTERNAL_QA",
    trigger_event: "TASK_STATUS_CHANGED",
    conditions: { target_status: "INTERNAL_QA", department: "Creative & Media" },
    action_type: "AI_HOOK_GENERATE",
    action_config: { angles_count: 5, format: "REEL" },
    is_active: true,
    created_at: new Date().toISOString(),
    execution_count: 24,
  },
  {
    id: "rule-2",
    name: "Zero-Touch Client Deliverable Portal Dispatch",
    description: "Instantly delivers client review link and triggers WhatsApp/Email alert when deliverable passes QA",
    trigger_event: "CONTENT_APPROVAL_SUBMITTED",
    conditions: { approval_status: "CLIENT_REVIEW" },
    action_type: "NOTIFY_CLIENT",
    action_config: { channels: ["PORTAL", "WHATSAPP", "EMAIL"] },
    is_active: true,
    created_at: new Date().toISOString(),
    execution_count: 38,
  },
  {
    id: "rule-3",
    name: "High-Priority SLA Auto-Escalation (<4h)",
    description: "Detects tasks due within 4 hours, escalates priority to CRITICAL, and alerts assigned Account Manager",
    trigger_event: "SLA_BREACH",
    conditions: { priority: "HIGH", threshold_hours: 4 },
    action_type: "ESCALATE_SLA",
    action_config: { escalate_to: "CRITICAL", notify_am: true },
    is_active: true,
    created_at: new Date().toISOString(),
    execution_count: 12,
  },
  {
    id: "rule-4",
    name: "Autonomous Won Deal Full-Stack Provisioning",
    description: "Converts won deals into active client orgs, creates AES-256 vault, generates service blueprint tasks, and creates invoice",
    trigger_event: "DEAL_WON",
    conditions: { deal_stage: "WON" },
    action_type: "AUTO_ONBOARD",
    action_config: { generate_tasks: true, create_invoice: true },
    is_active: true,
    created_at: new Date().toISOString(),
    execution_count: 7,
  },
];

export default function AutomationStudioPage() {
  const [activeTab, setActiveTab] = useState<"daemons" | "rules" | "audit">("daemons");
  const [daemons, setDaemons] = useState<DaemonStatus[]>(initialDemoDaemons);
  const [rules, setRules] = useState<AutomationRule[]>(initialDemoRules);
  const [auditLogs, setAuditLogs] = useState<AutomationAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSweeping, setIsSweeping] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // New Rule Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newRuleName, setNewRuleName] = useState("");
  const [newRuleDesc, setNewRuleDesc] = useState("");
  const [newTriggerEvent, setNewTriggerEvent] = useState("TASK_STATUS_CHANGED");
  const [newActionType, setNewActionType] = useState("AI_HOOK_GENERATE");
  const [newConditionsText, setNewConditionsText] = useState('{"status": "INTERNAL_QA"}');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch current user from localStorage or API
      const userStr = typeof window !== "undefined" ? localStorage.getItem("muchad_user") : null;
      if (userStr) {
        try {
          setCurrentUser(JSON.parse(userStr));
        } catch (e) {}
      }

      // 2. Fetch Daemons
      const dRes = await api.get("/automations/daemons");
      if (dRes.data?.data) setDaemons(dRes.data.data);

      // 3. Fetch Rules
      const rRes = await api.get("/automations/rules");
      if (rRes.data?.data && rRes.data.data.length > 0) setRules(rRes.data.data);

      // 4. Fetch Audit Logs
      const aRes = await api.get("/automations/audit-logs");
      if (aRes.data?.data) setAuditLogs(aRes.data.data);
    } catch (err: any) {
      console.warn("Automation data loaded with offline fallbacks:", err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleManualSweep = async () => {
    setIsSweeping(true);
    try {
      const res = await api.post("/automations/sweep");
      const executed = res.data?.data?.actions_executed || 0;
      toast.success(`Autonomous maintenance sweep completed! (${executed} actions executed)`);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Sweep failed");
    } finally {
      setIsSweeping(false);
    }
  };

  const handleToggleRule = async (rule: AutomationRule) => {
    const updated = !rule.is_active;
    try {
      await api.put(`/automations/rules/${rule.id}`, { is_active: updated });
      setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, is_active: updated } : r)));
      toast.success(`Rule "${rule.name}" is now ${updated ? "ACTIVE" : "PAUSED"}`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to update rule");
    }
  };

  const handleTestRule = async (rule: AutomationRule) => {
    try {
      const res = await api.post(`/automations/rules/${rule.id}/test`);
      toast.success(`Test Simulation Succeeded: ${rule.name}`, {
        description: res.data?.data?.simulated_action || "Execution verified cleanly.",
      });
      setRules((prev) =>
        prev.map((r) =>
          r.id === rule.id ? { ...r, execution_count: r.execution_count + 1, last_triggered_at: new Date().toISOString() } : r
        )
      );
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Rule test failed");
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      await api.delete(`/automations/rules/${ruleId}`);
      setRules((prev) => prev.filter((r) => r.id !== ruleId));
      toast.success("Automation rule deleted.");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to delete rule");
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName) {
      toast.error("Please enter a rule name");
      return;
    }

    let parsedConditions = {};
    try {
      parsedConditions = JSON.parse(newConditionsText);
    } catch (err) {
      toast.error("Invalid JSON for conditions");
      return;
    }

    try {
      const payload = {
        name: newRuleName.trim(),
        description: newRuleDesc.trim(),
        trigger_event: newTriggerEvent,
        conditions: parsedConditions,
        action_type: newActionType,
        action_config: { mode: "AUTOMATED_EXECUTION" },
        is_active: true,
      };

      const res = await api.post("/automations/rules", payload);
      if (res.data?.data) {
        setRules((prev) => [res.data.data, ...prev]);
        toast.success(`Automation rule "${newRuleName}" created and deployed!`);
      } else {
        const localRule: AutomationRule = {
          id: "rule-" + Date.now(),
          ...payload,
          created_at: new Date().toISOString(),
          execution_count: 0,
        };
        setRules((prev) => [localRule, ...prev]);
        toast.success(`Rule "${newRuleName}" deployed!`);
      }

      setIsCreateModalOpen(false);
      setNewRuleName("");
      setNewRuleDesc("");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to create rule");
    }
  };

  const canManageAutomations = currentUser?.role === "SUPER_ADMIN" || currentUser?.can_manage_automations;

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F9FA] text-[#1E293B]">
      {/* Odoo Control Panel */}
      <OdooControlPanel
        appName="Agency OS"
        viewName="Automation Studio & Engine"
        onNewClick={() => setIsCreateModalOpen(true)}
        newButtonLabel="New Rule"
        activeView="kanban"
        availableViews={["kanban"]}
        secondaryActions={
          <button
            onClick={handleManualSweep}
            disabled={isSweeping}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-800 text-xs font-semibold rounded shadow-xs transition"
          >
            <RotateCw className={cn("w-3.5 h-3.5 text-purple-700", isSweeping && "animate-spin")} />
            <span>{isSweeping ? "Sweeping Daemons..." : "Run Background Sweep"}</span>
          </button>
        }
      />

      <div className="p-3 sm:p-6 max-w-7xl mx-auto w-full space-y-4 sm:space-y-6">
        {/* Permission Grant Banner */}
        <div className="bg-white border border-purple-200 rounded-lg p-3 sm:p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 bg-purple-100 text-purple-800 rounded-lg shrink-0">
              <Zap className="w-5 h-5 fill-purple-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span>Agency OS Engine</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-mono px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                  ACTIVE • 6 DAEMONS
                </span>
              </h3>
              <p className="text-xs text-zinc-500 line-clamp-2 sm:line-clamp-none">
                Self-healing background workers and reactive DAG pipelines eliminate human follow-up friction across CRM, tasks, content, and attendance.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100">
            <span className="text-xs text-zinc-500 font-medium">Access:</span>
            {canManageAutomations ? (
              <span className="text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 px-2 py-1 rounded-md flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-600" /> Full Automation Lead
              </span>
            ) : (
              <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-md flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Read-Only Observer
              </span>
            )}
          </div>
        </div>

        {/* Tab Selector - Mobile friendly overflow */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-zinc-200 pb-1">
          <button
            type="button"
            onClick={() => setActiveTab("daemons")}
            className={cn(
              "px-3 sm:px-4 py-2 text-xs font-semibold rounded-t-md transition flex items-center gap-1.5 shrink-0 border-b-2 min-h-[40px]",
              activeTab === "daemons"
                ? "border-[#714B67] text-[#714B67] bg-white font-bold"
                : "border-transparent text-zinc-500 hover:text-zinc-800"
            )}
          >
            <Cpu className="w-4 h-4" />
            <span>Daemons (6)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("rules")}
            className={cn(
              "px-3 sm:px-4 py-2 text-xs font-semibold rounded-t-md transition flex items-center gap-1.5 shrink-0 border-b-2 min-h-[40px]",
              activeTab === "rules"
                ? "border-[#714B67] text-[#714B67] bg-white font-bold"
                : "border-transparent text-zinc-500 hover:text-zinc-800"
            )}
          >
            <Sliders className="w-4 h-4" />
            <span>Rules ({rules.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("audit")}
            className={cn(
              "px-3 sm:px-4 py-2 text-xs font-semibold rounded-t-md transition flex items-center gap-1.5 shrink-0 border-b-2 min-h-[40px]",
              activeTab === "audit"
                ? "border-[#714B67] text-[#714B67] bg-white font-bold"
                : "border-transparent text-zinc-500 hover:text-zinc-800"
            )}
          >
            <Activity className="w-4 h-4" />
            <span>Telemetry ({auditLogs.length})</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: SYSTEM DAEMONS                                                    */}
        {/* ========================================================================= */}
        {activeTab === "daemons" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {daemons.map((d) => (
              <div
                key={d.id}
                className="bg-white border border-zinc-200/90 rounded-lg p-5 shadow-xs flex flex-col justify-between hover:shadow-sm transition"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 font-semibold">
                      {d.schedule}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {d.status}
                    </span>
                  </div>

                  <h4 className="mt-3 text-sm font-bold text-zinc-900 leading-snug">{d.name}</h4>
                  <p className="mt-1.5 text-xs text-zinc-500 leading-relaxed">{d.description}</p>
                </div>

                <div className="mt-5 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-zinc-400 font-mono">
                    Last active: Just now
                  </span>
                  <button
                    onClick={handleManualSweep}
                    disabled={isSweeping}
                    className="text-[11px] font-semibold text-[#714B67] hover:underline flex items-center gap-1"
                  >
                    <span>Trigger Check</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: CONFIGURED RULES                                                  */}
        {/* ========================================================================= */}
        {activeTab === "rules" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rules.map((r) => (
                <div
                  key={r.id}
                  className={cn(
                    "bg-white border rounded-lg p-5 shadow-xs flex flex-col justify-between transition",
                    r.is_active ? "border-zinc-200/90" : "border-zinc-200 bg-zinc-50/70 opacity-75"
                  )}
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-bold text-zinc-900">{r.name}</h4>
                        <p className="text-xs text-zinc-500 mt-0.5">{r.description}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleRule(r)}
                          className={cn(
                            "text-[10px] font-semibold px-2 py-1 rounded transition",
                            r.is_active
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : "bg-zinc-200 text-zinc-600"
                          )}
                        >
                          {r.is_active ? "ACTIVE" : "PAUSED"}
                        </button>
                      </div>
                    </div>

                    {/* Logic Matrix */}
                    <div className="mt-4 p-3 bg-zinc-50 rounded-md border border-zinc-200 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500 font-medium">Trigger Event:</span>
                        <span className="font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 text-[11px] font-semibold">
                          {r.trigger_event}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500 font-medium">Action Executed:</span>
                        <span className="font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 text-[11px] font-semibold">
                          {r.action_type}
                        </span>
                      </div>

                      {r.conditions && (
                        <div className="pt-1 border-t border-zinc-200/60 flex items-start justify-between gap-2">
                          <span className="text-zinc-500 font-medium">Conditions:</span>
                          <span className="font-mono text-[10px] text-zinc-600 truncate max-w-[200px]">
                            {JSON.stringify(r.conditions)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer telemetry */}
                  <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-zinc-500 font-mono">
                      🔥 <span className="font-semibold text-zinc-800">{r.execution_count}</span> automated runs
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleTestRule(r)}
                        className="px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded font-semibold text-[11px] transition flex items-center gap-1"
                        title="Simulate rule test"
                      >
                        <Play className="w-3 h-3 text-emerald-600 fill-emerald-600" />
                        <span>Test Now</span>
                      </button>

                      <button
                        onClick={() => handleDeleteRule(r.id)}
                        className="p-1 text-zinc-400 hover:text-rose-600 rounded transition"
                        title="Delete rule"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: AUDIT TELEMETRY                                                   */}
        {/* ========================================================================= */}
        {activeTab === "audit" && (
          <div className="bg-white border border-zinc-200 rounded-lg shadow-xs overflow-hidden">
            <div className="p-4 bg-zinc-50/70 border-b border-zinc-200 flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-700">Autonomous Execution Stream</span>
              <button
                onClick={fetchData}
                className="text-xs text-[#714B67] hover:underline font-medium flex items-center gap-1"
              >
                <RotateCw className="w-3 h-3" /> Refresh Logs
              </button>
            </div>

            {auditLogs.length === 0 ? (
              <div className="p-12 text-center text-xs text-zinc-500">
                <Database className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                <p>No audit events logged yet. Trigger a manual sweep or run a rule test.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-semibold uppercase">
                      <th className="py-2.5 px-4">Timestamp</th>
                      <th className="py-2.5 px-4">Trigger</th>
                      <th className="py-2.5 px-4">Entity</th>
                      <th className="py-2.5 px-4">Action Taken</th>
                      <th className="py-2.5 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 font-mono text-[11px]">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-zinc-50/60">
                        <td className="py-2.5 px-4 text-zinc-500 whitespace-nowrap">
                          {new Date(log.executed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded font-semibold text-[10px]">
                            {log.trigger_event}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-zinc-600">{log.entity_type}</td>
                        <td className="py-2.5 px-4 text-zinc-800 font-sans max-w-md truncate">{log.action_taken}</td>
                        <td className="py-2.5 px-4">
                          <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold text-[10px]">
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* CREATE AUTOMATION RULE MODAL                                             */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-lg shadow-xl border border-zinc-200 w-full max-w-lg overflow-hidden">
            <div className="px-5 py-4 bg-[#714B67] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5" />
                <h3 className="font-semibold text-sm">Deploy New Automation Rule</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRule} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Rule Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newRuleName}
                  onChange={(e) => setNewRuleName(e.target.value)}
                  placeholder="e.g. VIP Retainer Delivery Expedite"
                  className="w-full text-xs px-3 py-2 border border-zinc-300 rounded focus:ring-1 focus:ring-[#714B67] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newRuleDesc}
                  onChange={(e) => setNewRuleDesc(e.target.value)}
                  placeholder="Explain what this automation automates for the agency..."
                  className="w-full text-xs px-3 py-2 border border-zinc-300 rounded focus:ring-1 focus:ring-[#714B67] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Trigger Event</label>
                  <select
                    value={newTriggerEvent}
                    onChange={(e) => setNewTriggerEvent(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-zinc-300 rounded focus:ring-1 focus:ring-[#714B67] focus:outline-none bg-white font-mono"
                  >
                    <option value="TASK_STATUS_CHANGED">TASK_STATUS_CHANGED</option>
                    <option value="CONTENT_APPROVAL_SUBMITTED">CONTENT_APPROVAL_SUBMITTED</option>
                    <option value="INVOICE_PAID">INVOICE_PAID</option>
                    <option value="DEAL_WON">DEAL_WON</option>
                    <option value="SLA_BREACH">SLA_BREACH</option>
                    <option value="ATTENDANCE_OVERTIME">ATTENDANCE_OVERTIME</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Action Type</label>
                  <select
                    value={newActionType}
                    onChange={(e) => setNewActionType(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-zinc-300 rounded focus:ring-1 focus:ring-[#714B67] focus:outline-none bg-white font-mono"
                  >
                    <option value="AI_HOOK_GENERATE">AI_HOOK_GENERATE (Gemini)</option>
                    <option value="NOTIFY_CLIENT">NOTIFY_CLIENT (Portal/WhatsApp)</option>
                    <option value="UNLOCK_DOWNSTREAM">UNLOCK_DOWNSTREAM (DAG)</option>
                    <option value="ESCALATE_SLA">ESCALATE_SLA (Priority Up)</option>
                    <option value="AUTO_ONBOARD">AUTO_ONBOARD (Zero-Touch)</option>
                    <option value="SEND_WEBHOOK">SEND_WEBHOOK (External)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Conditions Filter (JSON Format)
                </label>
                <textarea
                  rows={2}
                  value={newConditionsText}
                  onChange={(e) => setNewConditionsText(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-zinc-300 rounded focus:ring-1 focus:ring-[#714B67] focus:outline-none font-mono"
                />
              </div>

              <div className="pt-3 border-t border-zinc-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-100 rounded transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#714B67] hover:bg-[#5E3E55] text-white text-xs font-medium rounded shadow-sm transition flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Deploy Automation</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
