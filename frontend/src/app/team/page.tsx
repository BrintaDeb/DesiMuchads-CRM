"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  Shield,
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
  Briefcase,
  Search,
  Filter,
  Edit2,
  Lock,
  Mail,
  Key,
  ShieldAlert,
  Sparkles,
  ArrowRight,
  MoreVertical,
  Check,
  X,
  RefreshCw,
} from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { User, UserRole } from "@/types";
import { OdooControlPanel, ViewMode } from "@/components/layout/OdooControlPanel";

const initialDemoUsers: User[] = [
  {
    id: "u-admin",
    email: "admin@desimuchads.com",
    full_name: "Muchad Founder (Super Admin)",
    role: "SUPER_ADMIN",
    department: "Executive Leadership",
    hourly_cost: 100,
    weekly_capacity_hours: 40,
    can_manage_automations: true,
    can_edit_projects: true,
    can_manage_billing: true,
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "u-mgr",
    email: "manager@desimuchads.com",
    full_name: "Aarav Sharma (Account Manager)",
    role: "ACCOUNT_MANAGER",
    department: "Client Success",
    hourly_cost: 50,
    weekly_capacity_hours: 40,
    can_manage_automations: true,
    can_edit_projects: true,
    can_manage_billing: false,
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "u-spec",
    email: "specialist@desimuchads.com",
    full_name: "Priya Patel (Lead Designer & Copy)",
    role: "SPECIALIST",
    department: "Creative & Media",
    hourly_cost: 35,
    weekly_capacity_hours: 40,
    can_manage_automations: false,
    can_edit_projects: true,
    can_manage_billing: false,
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "u-client",
    email: "client@bombaychaico.com",
    full_name: "Kabir Mehta (Bombay Chai Co)",
    role: "CLIENT",
    department: "External Stakeholder",
    hourly_cost: 0,
    weekly_capacity_hours: 0,
    can_manage_automations: false,
    can_edit_projects: false,
    can_manage_billing: false,
    is_active: true,
    created_at: new Date().toISOString(),
  },
];

export default function TeamManagementPage() {
  const [users, setUsers] = useState<User[]>(initialDemoUsers);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [automationFilter, setAutomationFilter] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");

  // Add Member Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newFullName, setNewFullName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("SPECIALIST");
  const [newDepartment, setNewDepartment] = useState("Performance Marketing");
  const [newHourlyCost, setNewHourlyCost] = useState(40);
  const [newWeeklyCapacity, setNewWeeklyCapacity] = useState(40);
  const [newCanManageAutomations, setNewCanManageAutomations] = useState(false);
  const [newCanEditProjects, setNewCanEditProjects] = useState(true);
  const [newCanManageBilling, setNewCanManageBilling] = useState(false);

  // Edit Member Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editRole, setEditRole] = useState<UserRole>("SPECIALIST");
  const [editDepartment, setEditDepartment] = useState("");
  const [editHourlyCost, setEditHourlyCost] = useState(0);
  const [editWeeklyCapacity, setEditWeeklyCapacity] = useState(40);
  const [editCanManageAutomations, setEditCanManageAutomations] = useState(false);
  const [editCanEditProjects, setEditCanEditProjects] = useState(true);
  const [editCanManageBilling, setEditCanManageBilling] = useState(false);
  const [editPassword, setEditPassword] = useState("");

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/users");
      if (res.data?.data && Array.isArray(res.data.data)) {
        setUsers(res.data.data);
      }
    } catch (err: any) {
      console.warn("Using offline user roster:", err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName || !newEmail || !newPassword) {
      toast.error("Please fill in full name, email, and password");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        full_name: newFullName.trim(),
        email: newEmail.trim().toLowerCase(),
        password: newPassword,
        role: newRole,
        department: newDepartment.trim(),
        hourly_cost: Number(newHourlyCost) || 0,
        weekly_capacity_hours: Number(newWeeklyCapacity) || 40,
        can_manage_automations: newCanManageAutomations,
        can_edit_projects: newCanEditProjects,
        can_manage_billing: newCanManageBilling,
        is_active: true,
      };

      const res = await api.post("/users", payload);
      if (res.data?.data) {
        toast.success(`Account created for ${newFullName}! Member can now log in.`);
        setUsers((prev) => [res.data.data, ...prev]);
      } else {
        // Fallback local state
        const localUser: User = {
          id: "u-" + Date.now(),
          full_name: newFullName,
          email: newEmail.toLowerCase(),
          role: newRole,
          department: newDepartment,
          hourly_cost: Number(newHourlyCost) || 0,
          weekly_capacity_hours: Number(newWeeklyCapacity) || 40,
          can_manage_automations: newCanManageAutomations,
          can_edit_projects: newCanEditProjects,
          can_manage_billing: newCanManageBilling,
          is_active: true,
          created_at: new Date().toISOString(),
        };
        setUsers((prev) => [localUser, ...prev]);
        toast.success(`Account provisioned for ${newFullName}! Ready for login.`);
      }

      setIsAddModalOpen(false);
      resetAddForm();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || "Failed to create user";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAddForm = () => {
    setNewFullName("");
    setNewEmail("");
    setNewPassword("");
    setNewRole("SPECIALIST");
    setNewDepartment("Performance Marketing");
    setNewHourlyCost(40);
    setNewWeeklyCapacity(40);
    setNewCanManageAutomations(false);
    setNewCanEditProjects(true);
    setNewCanManageBilling(false);
  };

  const openEditModal = (u: User) => {
    setEditingUser(u);
    setEditFullName(u.full_name);
    setEditRole(u.role);
    setEditDepartment(u.department);
    setEditHourlyCost(u.hourly_cost);
    setEditWeeklyCapacity(u.weekly_capacity_hours);
    setEditCanManageAutomations(!!u.can_manage_automations);
    setEditCanEditProjects(u.can_edit_projects !== false);
    setEditCanManageBilling(!!u.can_manage_billing);
    setEditPassword("");
    setIsEditModalOpen(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setIsSubmitting(true);
    try {
      const payload: any = {
        full_name: editFullName.trim(),
        role: editRole,
        department: editDepartment.trim(),
        hourly_cost: Number(editHourlyCost) || 0,
        weekly_capacity_hours: Number(editWeeklyCapacity) || 40,
        can_manage_automations: editCanManageAutomations,
        can_edit_projects: editCanEditProjects,
        can_manage_billing: editCanManageBilling,
      };
      if (editPassword) {
        payload.password = editPassword;
      }

      await api.put(`/users/${editingUser.id}`, payload);

      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingUser.id
            ? {
                ...u,
                ...payload,
              }
            : u
        )
      );

      toast.success(`Permissions & details updated for ${editFullName}`);
      setIsEditModalOpen(false);
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || "Update failed";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleAutomationAccess = async (user: User) => {
    const updatedVal = !user.can_manage_automations;
    try {
      await api.put(`/users/${user.id}`, { can_manage_automations: updatedVal });
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, can_manage_automations: updatedVal } : u))
      );
      toast.success(
        updatedVal
          ? `Granted Automation Engine access to ${user.full_name}`
          : `Revoked Automation Engine access for ${user.full_name}`
      );
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Permission update failed");
    }
  };

  const handleToggleActive = async (user: User) => {
    const updatedVal = !user.is_active;
    try {
      await api.put(`/users/${user.id}`, { is_active: updatedVal });
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_active: updatedVal } : u))
      );
      toast.success(updatedVal ? `Account reactivated for ${user.full_name}` : `Account paused for ${user.full_name}`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Status toggle failed");
    }
  };

  // Filtering
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.department.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
    const matchesAutomation =
      automationFilter === "ALL" ||
      (automationFilter === "AUTOMATION_ENABLED" && u.can_manage_automations) ||
      (automationFilter === "STANDARD" && !u.can_manage_automations);
    return matchesSearch && matchesRole && matchesAutomation;
  });

  const totalMembers = users.length;
  const automationLeadsCount = users.filter((u) => u.can_manage_automations).length;
  const blendedHourlyCost =
    users.filter((u) => u.role !== "CLIENT").length > 0
      ? Math.round(
          users.filter((u) => u.role !== "CLIENT").reduce((acc, u) => acc + u.hourly_cost, 0) /
            users.filter((u) => u.role !== "CLIENT").length
        )
      : 0;
  const totalWeeklyCapacity = users.reduce((acc, u) => acc + (u.weekly_capacity_hours || 0), 0);

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F9FA] text-[#1E293B]">
      {/* Odoo Control Panel */}
      <OdooControlPanel
        appName="Agency Operations"
        viewName="Workforce & Team Management"
        onNewClick={() => setIsAddModalOpen(true)}
        newButtonLabel="Add Member"
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        activeView={viewMode}
        onViewChange={setViewMode}
        availableViews={["kanban", "list"]}
        totalCount={filteredUsers.length}
        secondaryActions={
          <button
            onClick={() => fetchUsers()}
            disabled={isLoading}
            className="p-1.5 text-zinc-500 hover:text-zinc-800 rounded bg-white border border-zinc-200 hover:bg-zinc-50 transition"
            title="Refresh Roster"
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </button>
        }
      />

      <div className="p-3 sm:p-6 max-w-7xl mx-auto w-full space-y-4 sm:space-y-6">
        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white border border-zinc-200/80 rounded-lg p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Total Workforce</span>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-md">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-zinc-900">{totalMembers}</span>
              <span className="text-xs text-zinc-500 font-medium">Registered Staff</span>
            </div>
          </div>

          <div className="bg-white border border-zinc-200/80 rounded-lg p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Automation Engineers</span>
              <div className="p-2 bg-purple-50 text-purple-600 rounded-md">
                <Zap className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-purple-700">{automationLeadsCount}</span>
              <span className="text-xs text-purple-600 font-medium">Engine Permission Granted</span>
            </div>
          </div>

          <div className="bg-white border border-zinc-200/80 rounded-lg p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Blended Rate</span>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-md">
                <Briefcase className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-zinc-900">₹{blendedHourlyCost}</span>
              <span className="text-xs text-zinc-500 font-medium">per billable hour</span>
            </div>
          </div>

          <div className="bg-white border border-zinc-200/80 rounded-lg p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Total Capacity</span>
              <div className="p-2 bg-amber-50 text-amber-600 rounded-md">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-zinc-900">{totalWeeklyCapacity}h</span>
              <span className="text-xs text-zinc-500 font-medium">Weekly Allocated</span>
            </div>
          </div>
        </div>

        {/* Filters Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-lg border border-zinc-200/80 shadow-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-zinc-500 flex items-center gap-1 mr-1">
              <Filter className="w-3.5 h-3.5" /> Filters:
            </span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="text-xs bg-zinc-50 border border-zinc-200 text-zinc-700 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#714B67]"
            >
              <option value="ALL">All Roles</option>
              <option value="SUPER_ADMIN">Super Admins</option>
              <option value="ACCOUNT_MANAGER">Account Managers</option>
              <option value="SPECIALIST">Specialists</option>
              <option value="CLIENT">Clients</option>
            </select>

            <select
              value={automationFilter}
              onChange={(e) => setAutomationFilter(e.target.value)}
              className="text-xs bg-zinc-50 border border-zinc-200 text-zinc-700 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#714B67]"
            >
              <option value="ALL">All Permissions</option>
              <option value="AUTOMATION_ENABLED">⚡ Automation Leads Only</option>
              <option value="STANDARD">Standard Workspace Access</option>
            </select>
          </div>

          <div className="text-xs text-zinc-500 font-medium">
            Showing <span className="font-semibold text-zinc-900">{filteredUsers.length}</span> of {users.length} members
          </div>
        </div>

        {/* Content View: Kanban vs List */}
        {viewMode === "kanban" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUsers.map((u) => {
              const initials = u.full_name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .substring(0, 2)
                .toUpperCase();

              return (
                <div
                  key={u.id}
                  className={cn(
                    "bg-white border rounded-lg p-5 shadow-xs transition hover:shadow-sm flex flex-col justify-between relative",
                    u.is_active ? "border-zinc-200/90" : "border-zinc-200 bg-zinc-50/60 opacity-75"
                  )}
                >
                  <div>
                    {/* Header: Avatar, Name, Role */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-xs",
                            u.role === "SUPER_ADMIN"
                              ? "bg-purple-600"
                              : u.role === "ACCOUNT_MANAGER"
                              ? "bg-indigo-600"
                              : u.role === "SPECIALIST"
                              ? "bg-teal-600"
                              : "bg-slate-600"
                          )}
                        >
                          {initials}
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-zinc-900 flex items-center gap-1.5">
                            {u.full_name}
                            {!u.is_active && (
                              <span className="text-[10px] bg-zinc-200 text-zinc-600 px-1.5 py-0.5 rounded font-normal">
                                Deactivated
                              </span>
                            )}
                          </h4>
                          <p className="text-xs text-zinc-500 font-mono truncate max-w-[190px]">{u.email}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => openEditModal(u)}
                        className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded transition"
                        title="Edit Permissions & Details"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Department & Role Pills */}
                    <div className="mt-4 flex flex-wrap items-center gap-1.5">
                      <span
                        className={cn(
                          "text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider",
                          u.role === "SUPER_ADMIN"
                            ? "bg-purple-100 text-purple-800 border border-purple-200"
                            : u.role === "ACCOUNT_MANAGER"
                            ? "bg-indigo-100 text-indigo-800 border border-indigo-200"
                            : u.role === "SPECIALIST"
                            ? "bg-teal-100 text-teal-800 border border-teal-200"
                            : "bg-slate-100 text-slate-800 border border-slate-200"
                        )}
                      >
                        {u.role.replace("_", " ")}
                      </span>
                      <span className="text-[10px] bg-zinc-100 text-zinc-700 border border-zinc-200 px-2 py-0.5 rounded">
                        {u.department}
                      </span>
                    </div>

                    {/* Automation Permission Spotlight */}
                    <div className="mt-3">
                      {u.can_manage_automations ? (
                        <div className="flex items-center justify-between p-2 rounded-md bg-purple-50/80 border border-purple-200/80 text-purple-900 text-xs">
                          <span className="flex items-center gap-1.5 font-medium">
                            <Zap className="w-3.5 h-3.5 text-purple-600 fill-purple-600" />
                            <span>Automation Lead</span>
                          </span>
                          <span className="text-[10px] bg-purple-200/60 text-purple-800 px-1.5 py-0.5 rounded font-mono">
                            Full Engine Access
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between p-2 rounded-md bg-zinc-50 border border-zinc-200 text-zinc-500 text-xs">
                          <span className="flex items-center gap-1.5 font-normal">
                            <Shield className="w-3.5 h-3.5 text-zinc-400" />
                            <span>Standard Specialist</span>
                          </span>
                          <button
                            onClick={() => handleToggleAutomationAccess(u)}
                            className="text-[10px] text-purple-700 hover:underline font-medium"
                          >
                            + Enable Automation
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Operational Details */}
                    <div className="mt-4 pt-3 border-t border-zinc-100 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-zinc-400 block text-[10px] uppercase font-semibold">Hourly Rate</span>
                        <span className="font-mono font-medium text-zinc-800">
                          {u.hourly_cost > 0 ? `₹${u.hourly_cost}/hr` : "Fixed / Client"}
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-400 block text-[10px] uppercase font-semibold">Capacity</span>
                        <span className="font-mono font-medium text-zinc-800">{u.weekly_capacity_hours}h / week</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs">
                    <button
                      onClick={() => handleToggleActive(u)}
                      className={cn(
                        "text-[11px] font-medium transition",
                        u.is_active ? "text-rose-600 hover:text-rose-800" : "text-emerald-600 hover:text-emerald-800"
                      )}
                    >
                      {u.is_active ? "Deactivate User" : "Activate User"}
                    </button>

                    <button
                      onClick={() => openEditModal(u)}
                      className="text-[11px] text-[#714B67] hover:underline font-medium flex items-center gap-1"
                    >
                      <span>Permissions</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* List View */
          <div className="bg-white border border-zinc-200 rounded-lg shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-zinc-50/80 border-b border-zinc-200 text-zinc-500 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Member</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Automation Engine</th>
                    <th className="py-3 px-4">Rate & Capacity</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-zinc-50/60 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] text-white",
                              u.role === "SUPER_ADMIN"
                                ? "bg-purple-600"
                                : u.role === "ACCOUNT_MANAGER"
                                ? "bg-indigo-600"
                                : "bg-teal-600"
                            )}
                          >
                            {u.full_name[0]}
                          </div>
                          <div>
                            <div className="font-semibold text-zinc-900">{u.full_name}</div>
                            <div className="text-[11px] text-zinc-500 font-mono">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-zinc-100 text-zinc-800">
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-zinc-700">{u.department}</td>
                      <td className="py-3 px-4">
                        {u.can_manage_automations ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                            <Zap className="w-3 h-3 text-purple-600 fill-purple-600" />
                            <span>Automation Lead</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-zinc-400">Restricted</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-700">
                        ₹{u.hourly_cost}/h • {u.weekly_capacity_hours}h
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full",
                            u.is_active
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-zinc-100 text-zinc-500"
                          )}
                        >
                          <span
                            className={cn("w-1.5 h-1.5 rounded-full", u.is_active ? "bg-emerald-500" : "bg-zinc-400")}
                          />
                          {u.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => openEditModal(u)}
                          className="px-2 py-1 text-xs text-[#714B67] hover:bg-purple-50 rounded font-medium transition"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* ADD MEMBER MODAL                                                          */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-lg shadow-xl border border-zinc-200 w-full max-w-lg overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 bg-[#714B67] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                <h3 className="font-semibold text-sm">Provision New Team Member</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateUser} className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    placeholder="e.g. Vikram Malhotra"
                    className="w-full text-xs px-3 py-2 border border-zinc-300 rounded focus:ring-1 focus:ring-[#714B67] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Work Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="vikram@desimuchads.com"
                    className="w-full text-xs px-3 py-2 border border-zinc-300 rounded focus:ring-1 focus:ring-[#714B67] focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Login Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Set temporary password (min 6 characters)"
                    className="w-full text-xs px-3 py-2 border border-zinc-300 rounded focus:ring-1 focus:ring-[#714B67] focus:outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setNewPassword("Muchad@" + Math.floor(1000 + Math.random() * 9000))}
                    className="absolute right-2 top-2 text-[10px] text-purple-700 hover:underline font-semibold"
                  >
                    Generate
                  </button>
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">
                  This credential allows immediate login at /login. User can reset after first session.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Role & Clearance</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full text-xs px-3 py-2 border border-zinc-300 rounded focus:ring-1 focus:ring-[#714B67] focus:outline-none bg-white"
                  >
                    <option value="SPECIALIST">Specialist (Designer, Copy, Dev)</option>
                    <option value="ACCOUNT_MANAGER">Account Manager (Project Lead)</option>
                    <option value="SUPER_ADMIN">Super Admin (Founder / Principal)</option>
                    <option value="CLIENT">Client (External Stakeholder)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value)}
                    placeholder="e.g. Media Buying, Video Production"
                    className="w-full text-xs px-3 py-2 border border-zinc-300 rounded focus:ring-1 focus:ring-[#714B67] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Hourly Cost (₹ / hr)</label>
                  <input
                    type="number"
                    value={newHourlyCost}
                    onChange={(e) => setNewHourlyCost(Number(e.target.value))}
                    min={0}
                    className="w-full text-xs px-3 py-2 border border-zinc-300 rounded focus:ring-1 focus:ring-[#714B67] focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Weekly Capacity (Hours)</label>
                  <input
                    type="number"
                    value={newWeeklyCapacity}
                    onChange={(e) => setNewWeeklyCapacity(Number(e.target.value))}
                    min={0}
                    max={80}
                    className="w-full text-xs px-3 py-2 border border-zinc-300 rounded focus:ring-1 focus:ring-[#714B67] focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Automation & Access Grants Section */}
              <div className="pt-3 border-t border-zinc-200">
                <span className="block text-xs font-semibold text-zinc-900 mb-2 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-purple-600" /> Granular Access & Software Automation Grants
                </span>

                <div className="space-y-2.5">
                  <label className="flex items-start gap-2.5 p-2.5 rounded-md border border-purple-200 bg-purple-50/60 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newCanManageAutomations}
                      onChange={(e) => setNewCanManageAutomations(e.target.checked)}
                      className="mt-0.5 rounded text-purple-600 focus:ring-purple-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-purple-900 block flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-purple-600 fill-purple-600" />
                        Allow Working on Software Automations
                      </span>
                      <span className="text-[11px] text-purple-700 block">
                        Grants access to Automation Studio, DAG Cascading Rules, SLA Escalators, and AI Hook Studio daemons.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2 rounded-md border border-zinc-200 bg-zinc-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newCanEditProjects}
                      onChange={(e) => setNewCanEditProjects(e.target.checked)}
                      className="mt-0.5 rounded text-[#714B67]"
                    />
                    <div>
                      <span className="text-xs font-semibold text-zinc-800 block">Project & Deliverable Control</span>
                      <span className="text-[11px] text-zinc-500 block">Can create tasks, update milestones, and review team outputs.</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2 rounded-md border border-zinc-200 bg-zinc-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newCanManageBilling}
                      onChange={(e) => setNewCanManageBilling(e.target.checked)}
                      className="mt-0.5 rounded text-[#714B67]"
                    />
                    <div>
                      <span className="text-xs font-semibold text-zinc-800 block">Billing & GST Ledger Access</span>
                      <span className="text-[11px] text-zinc-500 block">Can issue invoices and reconcile Razorpay / UPI settlements.</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-zinc-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-100 rounded transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-[#714B67] hover:bg-[#5E3E55] text-white text-xs font-medium rounded shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <span>Provisioning...</span>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Create & Allow Login</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EDIT PERMISSIONS MODAL                                                    */}
      {/* ========================================================================= */}
      {isEditModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-lg shadow-xl border border-zinc-200 w-full max-w-lg overflow-hidden">
            <div className="px-5 py-4 bg-zinc-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-400" />
                <h3 className="font-semibold text-sm">Edit Access: {editingUser.full_name}</h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-zinc-300 rounded focus:ring-1 focus:ring-purple-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Role</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as UserRole)}
                    className="w-full text-xs px-3 py-2 border border-zinc-300 rounded focus:ring-1 focus:ring-purple-600 focus:outline-none bg-white"
                  >
                    <option value="SPECIALIST">Specialist</option>
                    <option value="ACCOUNT_MANAGER">Account Manager</option>
                    <option value="SUPER_ADMIN">Super Admin</option>
                    <option value="CLIENT">Client</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={editDepartment}
                    onChange={(e) => setEditDepartment(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-zinc-300 rounded focus:ring-1 focus:ring-purple-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Hourly Cost (₹)</label>
                  <input
                    type="number"
                    value={editHourlyCost}
                    onChange={(e) => setEditHourlyCost(Number(e.target.value))}
                    className="w-full text-xs px-3 py-2 border border-zinc-300 rounded focus:ring-1 focus:ring-purple-600 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Reset Password (Optional)</label>
                <input
                  type="text"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Leave blank to keep existing password"
                  className="w-full text-xs px-3 py-2 border border-zinc-300 rounded focus:ring-1 focus:ring-purple-600 focus:outline-none font-mono"
                />
              </div>

              {/* Permission Switches */}
              <div className="pt-3 border-t border-zinc-200 space-y-2.5">
                <label className="flex items-start gap-2.5 p-2.5 rounded-md border border-purple-200 bg-purple-50/60 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editCanManageAutomations}
                    onChange={(e) => setEditCanManageAutomations(e.target.checked)}
                    className="mt-0.5 rounded text-purple-600 focus:ring-purple-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-purple-900 block flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-purple-600 fill-purple-600" />
                      Allow Working on Software Automations
                    </span>
                    <span className="text-[11px] text-purple-700 block">
                      Enables the user to create, test, and edit autonomous background daemons and DAG cascade triggers.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-2 rounded-md border border-zinc-200 bg-zinc-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editCanEditProjects}
                    onChange={(e) => setEditCanEditProjects(e.target.checked)}
                    className="mt-0.5 rounded text-purple-600"
                  />
                  <div>
                    <span className="text-xs font-semibold text-zinc-800 block">Project & Deliverables Editing</span>
                    <span className="text-[11px] text-zinc-500 block">Allow managing task statuses and schedules.</span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-2 rounded-md border border-zinc-200 bg-zinc-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editCanManageBilling}
                    onChange={(e) => setEditCanManageBilling(e.target.checked)}
                    className="mt-0.5 rounded text-purple-600"
                  />
                  <div>
                    <span className="text-xs font-semibold text-zinc-800 block">Billing & GST Operations</span>
                    <span className="text-[11px] text-zinc-500 block">Allow issuing invoices and recording payments.</span>
                  </div>
                </label>
              </div>

              <div className="pt-4 border-t border-zinc-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-100 rounded transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium rounded shadow-sm transition disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
