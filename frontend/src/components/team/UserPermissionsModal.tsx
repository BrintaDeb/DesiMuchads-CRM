"use client";

import React, { useState, useEffect } from "react";
import {
  Shield,
  X,
  Check,
  Zap,
  Users,
  KanbanSquare,
  CheckSquare,
  Clock,
  Receipt,
  ShieldCheck,
  Sparkles,
  Lock,
  RotateCcw,
  Sliders,
  CheckCircle2,
  Info,
} from "lucide-react";
import { User, PermissionModule, PermissionPreset } from "@/types";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface UserPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onPermissionsUpdated: (updatedUser: User) => void;
}

// Built-in Module Taxonomy with Icons and Descriptions
const MODULE_CONFIGS = [
  {
    id: "crm",
    name: "Sales CRM & Deals Pipeline",
    icon: Users,
    color: "text-amber-600 bg-amber-50 border-amber-200",
    description: "Client directory, deal cards, stage progressions (Won/Lost), customer touchpoints",
    permissions: [
      {
        id: "crm:read",
        name: "View Deals & Pipeline",
        description: "View CRM pipeline board, client cards, won metrics, and deal values",
      },
      {
        id: "crm:write",
        name: "Manage Deals & Pipeline",
        description: "Move stages, edit deals, log interactions, and adjust retainer values",
      },
    ],
  },
  {
    id: "leads",
    name: "AI Lead Engine & Maps Radar",
    icon: Zap,
    color: "text-purple-600 bg-purple-50 border-purple-200",
    description: "Google Maps Radar pinpoint search, local businesses discovery, buyer dossiers, CRM injection",
    permissions: [
      {
        id: "leads:read",
        name: "View Lead Radar & Discovery",
        description: "Access radial radar scanner, search nearby landmarks, and inspect buyer personas",
      },
      {
        id: "leads:write",
        name: "Inject Leads & Launch Outreach",
        description: "Push leads directly into CRM pipeline, export lists, and dispatch cold sequences",
      },
    ],
  },
  {
    id: "projects",
    name: "Projects & DAG Tasks",
    icon: KanbanSquare,
    color: "text-indigo-600 bg-indigo-50 border-indigo-200",
    description: "DAG dependency graphs, milestone deadlines, task assignments, Kanban boards",
    permissions: [
      {
        id: "projects:read",
        name: "View Projects & Tasks",
        description: "View projects list, task dependency graphs, milestones, and status boards",
      },
      {
        id: "projects:write",
        name: "Create & Edit Tasks",
        description: "Create tasks, assign team members, update statuses, and log billable hours",
      },
    ],
  },
  {
    id: "content",
    name: "Content Approvals & Social Calendar",
    icon: CheckSquare,
    color: "text-pink-600 bg-pink-50 border-pink-200",
    description: "Two-tier review state machine, scheduled social calendar, creative assets",
    permissions: [
      {
        id: "content:read",
        name: "View Content Calendar",
        description: "Inspect scheduled post calendar, view channel drafts, and read captions",
      },
      {
        id: "content:write",
        name: "Review & Approve Content",
        description: "Upload deliverables, advance two-tier QA, request revisions, and publish",
      },
    ],
  },
  {
    id: "attendance",
    name: "Workforce & Attendance",
    icon: Clock,
    color: "text-teal-600 bg-teal-50 border-teal-200",
    description: "Smart punch clock terminal, shift logs, break tracking, leave management",
    permissions: [
      {
        id: "attendance:read",
        name: "View Punch Terminal & Presence",
        description: "Access smart clock terminal and inspect live agency team attendance board",
      },
      {
        id: "attendance:write",
        name: "Clock Operations & Regularization",
        description: "Punch in/out, log work sessions, submit leaves, and request regularizations",
      },
    ],
  },
  {
    id: "billing",
    name: "Invoicing & GST Ledger",
    icon: Receipt,
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
    description: "Indian GST (18%) ledgers, SAC 998311, Razorpay/UPI links, payment reconciliation",
    permissions: [
      {
        id: "billing:read",
        name: "View Invoices & Ledgers",
        description: "View agency invoices, GST breakdowns, payment status, and retainer ledgers",
      },
      {
        id: "billing:write",
        name: "Generate Invoices & Collect Payments",
        description: "Generate GST invoices, record payments, and dispatch Razorpay / UPI links",
      },
    ],
  },
  {
    id: "vault",
    name: "Brand Vault & Secrets",
    icon: ShieldCheck,
    color: "text-slate-700 bg-slate-50 border-slate-200",
    description: "Fernet AES-256 zero-knowledge client ad credentials, Shopify tokens, brand assets",
    permissions: [
      {
        id: "vault:read",
        name: "View Brand Assets & Credentials",
        description: "Read ad account IDs, brand color palettes, fonts, and client social handles",
      },
      {
        id: "vault:write",
        name: "Manage Secrets & API Keys",
        description: "Add, modify, or rotate encrypted brand credentials, tokens, and ad secrets",
      },
    ],
  },
  {
    id: "automations",
    name: "Automation Engine & Daemons",
    icon: Sparkles,
    color: "text-purple-700 bg-purple-50 border-purple-200",
    description: "Background daemons, SLA auto-escalation, webhook triggers, DAG cascading rules",
    permissions: [
      {
        id: "automations:read",
        name: "View Running Automations",
        description: "Inspect daemon states, SLA thresholds, trigger logs, and execution history",
      },
      {
        id: "automations:write",
        name: "Manage & Edit Automations",
        description: "Create, configure, and toggle automations, SLA rules, and webhook listeners",
      },
    ],
  },
  {
    id: "team",
    name: "Team & Access Control",
    icon: Shield,
    color: "text-blue-600 bg-blue-50 border-blue-200",
    description: "Workforce directory, member clearance levels, and software module permissions",
    permissions: [
      {
        id: "team:read",
        name: "View Team Directory",
        description: "Inspect agency roster, member departments, and capacity utilization",
      },
      {
        id: "team:write",
        name: "Assign Permissions & Manage Users",
        description: "Provision new accounts, assign roles, and configure module permissions",
      },
    ],
  },
];

// Presets for quick 1-click assignment
const PRESETS: PermissionPreset[] = [
  {
    id: "super_admin",
    name: "Full Access",
    badge: "Super Admin",
    description: "Unrestricted master access across every module",
    permissions: MODULE_CONFIGS.flatMap((m) => m.permissions.map((p) => p.id)),
  },
  {
    id: "sales_hunter",
    name: "Sales & Lead Hunter",
    badge: "CRM & Leads",
    description: "Pipeline deals, AI Lead Maps Radar, and outreach",
    permissions: [
      "crm:read",
      "crm:write",
      "leads:read",
      "leads:write",
      "projects:read",
      "attendance:read",
      "attendance:write",
    ],
  },
  {
    id: "creative_specialist",
    name: "Creative Specialist",
    badge: "Design & Copy",
    description: "Projects, Content Approvals, Brand Vault, and Attendance",
    permissions: [
      "projects:read",
      "projects:write",
      "content:read",
      "content:write",
      "vault:read",
      "attendance:read",
      "attendance:write",
    ],
  },
  {
    id: "account_manager",
    name: "Account Manager",
    badge: "Client Operations",
    description: "CRM, Projects, Content, Invoices, Vault, and Team roster",
    permissions: [
      "crm:read",
      "crm:write",
      "leads:read",
      "projects:read",
      "projects:write",
      "content:read",
      "content:write",
      "billing:read",
      "billing:write",
      "vault:read",
      "attendance:read",
      "attendance:write",
      "team:read",
    ],
  },
  {
    id: "staff_member",
    name: "Staff / Clock Only",
    badge: "Standard Staff",
    description: "Clock terminal, shifts, and assigned tasks view",
    permissions: [
      "attendance:read",
      "attendance:write",
      "projects:read",
    ],
  },
  {
    id: "read_only",
    name: "Read-Only Auditor",
    badge: "Audit & Review",
    description: "View-only clearance across all operational modules",
    permissions: [
      "crm:read",
      "leads:read",
      "projects:read",
      "content:read",
      "attendance:read",
      "billing:read",
      "vault:read",
      "automations:read",
      "team:read",
    ],
  },
];

export function UserPermissionsModal({
  isOpen,
  onClose,
  user,
  onPermissionsUpdated,
}: UserPermissionsModalProps) {
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && user) {
      // Determine initial permissions
      let initialPerms = user.permissions || [];
      if (initialPerms.length === 0) {
        if (user.role === "SUPER_ADMIN") {
          initialPerms = MODULE_CONFIGS.flatMap((m) => m.permissions.map((p) => p.id));
        } else if (user.role === "ACCOUNT_MANAGER") {
          initialPerms = PRESETS.find((p) => p.id === "account_manager")?.permissions || [];
        } else if (user.role === "SPECIALIST") {
          initialPerms = PRESETS.find((p) => p.id === "creative_specialist")?.permissions || [];
        } else {
          initialPerms = ["attendance:read", "attendance:write", "projects:read"];
        }
      }
      setSelectedPermissions(initialPerms);
      checkActivePreset(initialPerms);
    }
  }, [isOpen, user]);

  const checkActivePreset = (perms: string[]) => {
    const sortedCurrent = [...perms].sort().join(",");
    const match = PRESETS.find((preset) => {
      const sortedPreset = [...preset.permissions].sort().join(",");
      return sortedCurrent === sortedPreset;
    });
    setActivePreset(match ? match.id : null);
  };

  const handleApplyPreset = (preset: PermissionPreset) => {
    setSelectedPermissions(preset.permissions);
    setActivePreset(preset.id);
    toast.info(`Applied preset: ${preset.name}`);
  };

  const handleTogglePermission = (permId: string) => {
    let next: string[];
    if (selectedPermissions.includes(permId)) {
      next = selectedPermissions.filter((id) => id !== permId);
    } else {
      next = [...selectedPermissions, permId];
      // If adding a write permission, automatically ensure the read permission is checked
      if (permId.endsWith(":write")) {
        const readPerm = permId.replace(":write", ":read");
        if (!next.includes(readPerm)) {
          next.push(readPerm);
        }
      }
    }
    setSelectedPermissions(next);
    checkActivePreset(next);
  };

  const handleToggleModule = (module: (typeof MODULE_CONFIGS)[0]) => {
    const modulePermIds = module.permissions.map((p) => p.id);
    const hasAll = modulePermIds.every((id) => selectedPermissions.includes(id));

    let next: string[];
    if (hasAll) {
      // Remove all permissions for this module
      next = selectedPermissions.filter((id) => !modulePermIds.includes(id));
    } else {
      // Add all permissions for this module
      next = Array.from(new Set([...selectedPermissions, ...modulePermIds]));
    }
    setSelectedPermissions(next);
    checkActivePreset(next);
  };

  const handleSelectAll = () => {
    const all = MODULE_CONFIGS.flatMap((m) => m.permissions.map((p) => p.id));
    setSelectedPermissions(all);
    setActivePreset("super_admin");
  };

  const handleClearAll = () => {
    setSelectedPermissions([]);
    setActivePreset(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = { permissions: selectedPermissions };
      const res = await api.put(`/users/${user.id}/permissions`, payload);

      if (res.data?.data) {
        onPermissionsUpdated(res.data.data);
      } else {
        // Fallback update
        onPermissionsUpdated({
          ...user,
          permissions: selectedPermissions,
          can_manage_automations: selectedPermissions.includes("automations:write"),
          can_manage_billing: selectedPermissions.includes("billing:write"),
          can_edit_projects: selectedPermissions.includes("projects:write"),
        });
      }

      toast.success(`Access permissions updated for ${user.full_name}`);
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || "Failed to update permissions";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const totalPossible = MODULE_CONFIGS.reduce((acc, m) => acc + m.permissions.length, 0);
  const activeCount = selectedPermissions.length;
  const activeModuleCount = MODULE_CONFIGS.filter((m) =>
    m.permissions.some((p) => selectedPermissions.includes(p.id))
  ).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-zinc-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header Bar */}
        <div className="px-5 py-4 bg-[#714B67] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center border border-white/20 shadow-xs">
              <Shield className="w-5 h-5 text-purple-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base tracking-tight">
                  Permissions & Access Control
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/20 text-white font-medium">
                  {user.role}
                </span>
              </div>
              <p className="text-xs text-purple-100 flex items-center gap-1.5 mt-0.5">
                <span className="font-semibold text-white">{user.full_name}</span>
                <span>•</span>
                <span className="font-mono text-[11px] text-purple-200">{user.email}</span>
                <span>•</span>
                <span className="text-[11px]">{user.department}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition"
            title="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1-Click Role Presets Strip */}
        <div className="p-4 bg-zinc-50 border-b border-zinc-200 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-zinc-700 flex items-center gap-1.5 uppercase tracking-wider">
              <Sliders className="w-3.5 h-3.5 text-[#714B67]" />
              1-Click Role Clearance Presets
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-[11px] text-[#714B67] hover:underline font-semibold"
              >
                Select All
              </button>
              <span className="text-zinc-300">•</span>
              <button
                type="button"
                onClick={handleClearAll}
                className="text-[11px] text-zinc-500 hover:text-zinc-800 font-medium"
              >
                Clear All
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {PRESETS.map((preset) => {
              const isSelected = activePreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className={cn(
                    "p-2 text-left rounded-lg border text-xs transition-all relative flex flex-col justify-between",
                    isSelected
                      ? "border-[#714B67] bg-purple-50/70 shadow-xs ring-1 ring-[#714B67]"
                      : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50/80"
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-zinc-900 truncate text-[11px]">
                        {preset.name}
                      </span>
                      {isSelected && <Check className="w-3 h-3 text-[#714B67] shrink-0" />}
                    </div>
                    <span className="text-[10px] text-zinc-500 line-clamp-1 mt-0.5">
                      {preset.badge}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Permissions Matrix */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          <div className="flex items-center justify-between text-xs text-zinc-500 font-medium pb-1 border-b border-zinc-200">
            <span>Module Name & Clearance Scopes</span>
            <span>
              Active: <strong className="text-zinc-900 font-mono">{activeCount}</strong> of {totalPossible} Scopes ({activeModuleCount}/9 Modules)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {MODULE_CONFIGS.map((module) => {
              const Icon = module.icon;
              const modulePermIds = module.permissions.map((p) => p.id);
              const grantedInModule = modulePermIds.filter((id) =>
                selectedPermissions.includes(id)
              );
              const isFull = grantedInModule.length === modulePermIds.length;
              const isPartial = grantedInModule.length > 0 && !isFull;
              const isNone = grantedInModule.length === 0;

              return (
                <div
                  key={module.id}
                  className={cn(
                    "border rounded-xl p-4 transition-all duration-150 flex flex-col justify-between bg-white shadow-xs",
                    isFull
                      ? "border-emerald-300 ring-1 ring-emerald-200/60"
                      : isPartial
                      ? "border-indigo-300 ring-1 ring-indigo-200/40"
                      : "border-zinc-200/80 bg-zinc-50/30"
                  )}
                >
                  <div>
                    {/* Module Title & Master Toggle */}
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center border",
                            module.color
                          )}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                            {module.name}
                            {isFull && (
                              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                Full Access
                              </span>
                            )}
                            {isPartial && (
                              <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">
                                Partial
                              </span>
                            )}
                            {isNone && (
                              <span className="text-[10px] text-zinc-400 bg-zinc-100 px-1.5 py-0.2 rounded">
                                Disabled
                              </span>
                            )}
                          </h4>
                          <p className="text-[11px] text-zinc-500 line-clamp-1">
                            {module.description}
                          </p>
                        </div>
                      </div>

                      {/* Master Module Toggle */}
                      <button
                        type="button"
                        onClick={() => handleToggleModule(module)}
                        className={cn(
                          "text-[10px] px-2 py-1 rounded font-semibold transition shrink-0 border",
                          isFull
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                            : "bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100"
                        )}
                      >
                        {isFull ? "Revoke All" : "Grant All"}
                      </button>
                    </div>

                    {/* Individual Scopes within Module */}
                    <div className="space-y-2 mt-3 pt-2.5 border-t border-zinc-100">
                      {module.permissions.map((perm) => {
                        const isChecked = selectedPermissions.includes(perm.id);
                        return (
                          <label
                            key={perm.id}
                            className={cn(
                              "flex items-start gap-2.5 p-2 rounded-lg cursor-pointer border text-xs transition",
                              isChecked
                                ? "bg-purple-50/50 border-purple-200/80 text-zinc-900"
                                : "bg-zinc-50/50 border-zinc-200/60 text-zinc-600 hover:bg-zinc-100/50"
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleTogglePermission(perm.id)}
                              className="mt-0.5 rounded text-[#714B67] focus:ring-[#714B67]"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span
                                  className={cn(
                                    "font-semibold text-xs",
                                    isChecked ? "text-purple-950 font-bold" : "text-zinc-800"
                                  )}
                                >
                                  {perm.name}
                                </span>
                                <span className="font-mono text-[9px] text-zinc-400">
                                  {perm.id}
                                </span>
                              </div>
                              <p className="text-[11px] text-zinc-500 mt-0.5 leading-snug">
                                {perm.description}
                              </p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-zinc-50 border-t border-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-zinc-600">
            <Info className="w-4 h-4 text-purple-600 shrink-0" />
            <span>
              Changes take effect immediately upon saving. Member will see granted modules in their UI navigation.
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-3.5 py-2 text-xs text-zinc-700 hover:bg-zinc-200 rounded-lg font-medium transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-[#714B67] hover:bg-[#5E3E55] text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSaving ? (
                <span>Saving Grants...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save & Apply Permissions</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
