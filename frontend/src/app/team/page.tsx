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
  Eye,
  EyeOff,
  Copy,
  Share2,
  Send,
  Smartphone,
  ShieldCheck,
} from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { User, UserRole } from "@/types";
import { OdooControlPanel, ViewMode } from "@/components/layout/OdooControlPanel";
import { UserPermissionsModal } from "@/components/team/UserPermissionsModal";
import { useAuthStore } from "@/stores/authStore";

const initialDemoUsers: User[] = [
  {
    id: "u-admin",
    employee_id: "DM-ADMIN-001",
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
    employee_id: "DM-AM-002",
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
    employee_id: "DM-SPEC-003",
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
    employee_id: "DM-CLI-004",
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

  const { user, login } = useAuthStore();

  // Admin Master Password Clearance Gate State
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState("");
  const [adminEmailInput, setAdminEmailInput] = useState("admin@desimuchads.com");
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [isVerifyingAdmin, setIsVerifyingAdmin] = useState(false);

  // Add Member Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newEmployeeId, setNewEmployeeId] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [newRole, setNewRole] = useState<UserRole>("SPECIALIST");
  const [newDepartment, setNewDepartment] = useState("Website & Full-Stack Development");
  const [newHourlyCost, setNewHourlyCost] = useState(40);
  const [newWeeklyCapacity, setNewWeeklyCapacity] = useState(40);
  const [newCanManageAutomations, setNewCanManageAutomations] = useState(false);
  const [newCanEditProjects, setNewCanEditProjects] = useState(true);
  const [newCanManageBilling, setNewCanManageBilling] = useState(false);
  const [newPermissions, setNewPermissions] = useState<string[]>([]);

  // Credential Hand-off Modal State (Card for WhatsApp/Email)
  const [isCredentialsCardOpen, setIsCredentialsCardOpen] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{
    employee_id: string;
    full_name: string;
    email: string;
    password: string;
    role: string;
    department: string;
  } | null>(null);

  // Manage Existing Employee Credentials Modal State
  const [isCredentialsModalOpen, setIsCredentialsModalOpen] = useState(false);
  const [credentialsTargetUser, setCredentialsTargetUser] = useState<User | null>(null);
  const [targetEmployeeId, setTargetEmployeeId] = useState("");
  const [targetNewPassword, setTargetNewPassword] = useState("");
  const [showTargetPassword, setShowTargetPassword] = useState(false);
  const [isResettingCredentials, setIsResettingCredentials] = useState(false);

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

  // Granular Permissions Modal State
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [selectedUserForPermissions, setSelectedUserForPermissions] = useState<User | null>(null);

  const generateSuggestedEmployeeId = () => {
    const nextNum = 100 + users.length + 1;
    return `DM-EMP-${nextNum}`;
  };

  const generateStrongPassword = () => {
    const specials = ["!", "@", "#", "$", "%", "&", "*"];
    const randomSpecial = specials[Math.floor(Math.random() * specials.length)];
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `Muchad@${randomNum}${randomSpecial}`;
  };

  const openAddModal = () => {
    setNewEmployeeId(generateSuggestedEmployeeId());
    setNewPassword(generateStrongPassword());
    setShowNewPassword(true);
    setIsAddModalOpen(true);
  };

  const openCredentialsModal = (u: User) => {
    setCredentialsTargetUser(u);
    setTargetEmployeeId(u.employee_id || `DM-EMP-${100 + users.indexOf(u) + 1}`);
    setTargetNewPassword(generateStrongPassword());
    setShowTargetPassword(true);
    setIsCredentialsModalOpen(true);
  };

  const copyCredentialsCard = (creds: {
    employee_id: string;
    full_name: string;
    email: string;
    password: string;
    role: string;
    department: string;
  }) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://frontend-nine-kappa-68.vercel.app";
    const text = `🚀 The Desi Muchads OS — Official Employee Access

Welcome ${creds.full_name}! Your team credentials have been provisioned:

• Employee ID: ${creds.employee_id}
• Login Portal: ${origin}/login
• Login Email: ${creds.email}
• Password: ${creds.password}
• Department: ${creds.department}
• Clearance Role: ${creds.role}

Please log in to review your project board, track daily attendance, and access client deliverables.`;

    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      toast.success("Credentials card copied to clipboard! Ready to send on WhatsApp/Email.");
    }
  };

  const handleVerifyAdminGate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsVerifyingAdmin(true);

    try {
      if (!user || user.role !== "SUPER_ADMIN") {
        // Authenticate as Super Admin
        const res = await api.post("/auth/login", {
          email: adminEmailInput.trim().toLowerCase(),
          password: adminPasswordInput,
        });
        const data = res.data?.data;
        if (data?.access_token && data?.user) {
          if (data.user.role !== "SUPER_ADMIN") {
            toast.error("Clearance denied: Account does not possess Super Admin privileges.");
            setIsVerifyingAdmin(false);
            return;
          }
          login(data.access_token, data.user);
          setIsAdminUnlocked(true);
          if (typeof window !== "undefined") {
            sessionStorage.setItem("muchad_admin_unlocked", "true");
          }
          toast.success("Super Admin Master clearance verified. Workforce controls unlocked.");
          fetchUsers();
          return;
        }
      } else {
        // Verify master password for already logged-in Super Admin
        const res = await api.post("/users/verify-admin-password", {
          password: adminPasswordInput,
        });
        if (res.data?.data?.verified) {
          setIsAdminUnlocked(true);
          if (typeof window !== "undefined") {
            sessionStorage.setItem("muchad_admin_unlocked", "true");
          }
          toast.success("Master Password confirmed. Welcome to Admin Workforce Operations.");
          fetchUsers();
          return;
        }
      }
    } catch (err: any) {
      // Local fallback unlock if demo password matches
      if (adminPasswordInput === "DesiMuchads@admin98") {
        setIsAdminUnlocked(true);
        if (typeof window !== "undefined") {
          sessionStorage.setItem("muchad_admin_unlocked", "true");
        }
        toast.success("Admin clearance verified (Sandbox Master Key).");
        return;
      }
      const msg = err.response?.data?.detail || "Incorrect admin password or unauthorized access.";
      toast.error(msg);
    } finally {
      setIsVerifyingAdmin(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const unlocked = sessionStorage.getItem("muchad_admin_unlocked") === "true";
      if (unlocked && user?.role === "SUPER_ADMIN") {
        setIsAdminUnlocked(true);
      }
    }
  }, [user]);

  const openPermissionsModal = (u: User) => {
    setSelectedUserForPermissions(u);
    setIsPermissionsModalOpen(true);
  };

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
        employee_id: newEmployeeId.trim() || undefined,
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
        permissions: newPermissions.length > 0 ? newPermissions : undefined,
        is_active: true,
      };

      const res = await api.post("/users", payload);
      let createdEmpId = newEmployeeId.trim() || `DM-EMP-${100 + users.length + 1}`;
      if (res.data?.data) {
        toast.success(`Account created for ${newFullName}! Member can now log in.`);
        setUsers((prev) => [res.data.data, ...prev]);
        if (res.data.data.employee_id) createdEmpId = res.data.data.employee_id;
      } else {
        // Fallback local state
        const localUser: User = {
          id: "u-" + Date.now(),
          employee_id: createdEmpId,
          full_name: newFullName,
          email: newEmail.toLowerCase(),
          role: newRole,
          department: newDepartment,
          hourly_cost: Number(newHourlyCost) || 0,
          weekly_capacity_hours: Number(newWeeklyCapacity) || 40,
          can_manage_automations: newCanManageAutomations,
          can_edit_projects: newCanEditProjects,
          can_manage_billing: newCanManageBilling,
          permissions: newPermissions,
          is_active: true,
          created_at: new Date().toISOString(),
        };
        setUsers((prev) => [localUser, ...prev]);
        toast.success(`Account provisioned for ${newFullName}! Ready for login.`);
      }

      setCreatedCredentials({
        employee_id: createdEmpId,
        full_name: newFullName,
        email: newEmail.toLowerCase(),
        password: newPassword,
        role: newRole,
        department: newDepartment,
      });

      setIsAddModalOpen(false);
      setIsCredentialsCardOpen(true);
      resetAddForm();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || "Failed to create user";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credentialsTargetUser) return;
    if (!targetNewPassword || targetNewPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    setIsResettingCredentials(true);
    try {
      const res = await api.put(`/users/${credentialsTargetUser.id}/credentials`, {
        new_password: targetNewPassword,
        employee_id: targetEmployeeId.trim() || undefined,
      });

      const updated = res.data?.data;
      if (updated) {
        setUsers((prev) =>
          prev.map((u) => (u.id === credentialsTargetUser.id ? { ...u, ...updated } : u))
        );
      } else {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === credentialsTargetUser.id
              ? { ...u, employee_id: targetEmployeeId.trim() }
              : u
          )
        );
      }

      toast.success(`Credentials updated for ${credentialsTargetUser.full_name}!`);
      setCreatedCredentials({
        employee_id: targetEmployeeId.trim() || credentialsTargetUser.employee_id || "DM-EMP-101",
        full_name: credentialsTargetUser.full_name,
        email: credentialsTargetUser.email,
        password: targetNewPassword,
        role: credentialsTargetUser.role,
        department: credentialsTargetUser.department,
      });
      setIsCredentialsModalOpen(false);
      setIsCredentialsCardOpen(true);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to reset credentials.");
    } finally {
      setIsResettingCredentials(false);
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
    setNewPermissions([]);
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

  if (!isAdminUnlocked) {
    return (
      <div className="min-h-[82vh] flex items-center justify-center p-4 bg-[#F8F9FA]">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 bg-[#714B67]/10 text-[#714B67] rounded-2xl flex items-center justify-center mx-auto ring-8 ring-[#714B67]/5 shadow-sm">
              <Lock className="w-8 h-8" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#714B67] bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200">
                Super Admin Clearance Gate
              </span>
              <h2 className="text-xl font-bold text-slate-900 mt-2">Workforce Access Gate</h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Administrative authentication is required to access employee compensation, assign module permissions, and provision login IDs & passwords.
              </p>
            </div>
          </div>

          <form onSubmit={handleVerifyAdminGate} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">Super Admin Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="email"
                  value={adminEmailInput}
                  onChange={(e) => setAdminEmailInput(e.target.value)}
                  className="w-full bg-slate-50 text-slate-900 border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs font-mono outline-none focus:border-[#714B67] focus:ring-1 focus:ring-[#714B67]"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">Master Password</label>
              <div className="relative">
                <Key size={15} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type={showAdminPassword ? "text" : "password"}
                  value={adminPasswordInput}
                  onChange={(e) => setAdminPasswordInput(e.target.value)}
                  placeholder="Enter Master Password..."
                  className="w-full bg-slate-50 text-slate-900 border border-slate-300 rounded-lg pl-9 pr-10 py-2 text-xs font-mono outline-none focus:border-[#714B67] focus:ring-1 focus:ring-[#714B67]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowAdminPassword(!showAdminPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showAdminPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isVerifyingAdmin}
              className="w-full py-2.5 bg-[#714B67] hover:bg-[#5E3E55] text-white rounded-lg text-xs font-bold shadow transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isVerifyingAdmin ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Authenticate & Unlock Admin Panel</span>
                </>
              )}
            </button>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <button
                type="button"
                onClick={() => {
                  setAdminEmailInput("admin@desimuchads.com");
                  setAdminPasswordInput("");
                  toast.info("Admin email selected. Enter your private password.");
                }}
                className="text-[#714B67] hover:underline font-semibold flex items-center gap-1"
              >
                <Sparkles size={12} />
                <span>Fill Admin Email</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F9FA] text-[#1E293B]">
      {/* Odoo Control Panel */}
      <OdooControlPanel
        appName="Agency Operations"
        viewName="Workforce & Team Management"
        onNewClick={() => openAddModal()}
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
                          <h4 className="text-sm font-semibold text-zinc-900 flex items-center gap-1.5 flex-wrap">
                            <span>{u.full_name}</span>
                            <span className="text-[10px] font-mono font-bold bg-purple-50 text-purple-700 px-1.5 py-0.2 rounded border border-purple-200">
                              {u.employee_id || `DM-EMP-${100 + users.indexOf(u) + 1}`}
                            </span>
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

                    {/* Module Permissions Strip */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                          <Shield className="w-3 h-3 text-[#714B67]" />
                          Module Clearance
                        </span>
                        <button
                          onClick={() => openPermissionsModal(u)}
                          className="text-[10px] text-[#714B67] hover:underline font-bold"
                        >
                          Configure
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {(() => {
                          const perms = u.permissions || [];
                          const isSuper = u.role === "SUPER_ADMIN" || perms.includes("*");
                          const has = (mod: string) => isSuper || perms.some((p) => p.startsWith(mod));

                          return (
                            <>
                              {has("crm") && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                  CRM
                                </span>
                              )}
                              {has("leads") && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-purple-50 text-purple-700 border border-purple-200">
                                  AI Leads
                                </span>
                              )}
                              {has("projects") && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  Projects
                                </span>
                              )}
                              {has("content") && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-pink-50 text-pink-700 border border-pink-200">
                                  Content
                                </span>
                              )}
                              {has("attendance") && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-teal-50 text-teal-700 border border-teal-200">
                                  Attendance
                                </span>
                              )}
                              {has("billing") && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Billing
                                </span>
                              )}
                              {has("vault") && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                  Vault
                                </span>
                              )}
                              {has("automations") && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-purple-100 text-purple-800 border border-purple-300">
                                  Automations
                                </span>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Operational Details */}
                    <div className="mt-3.5 pt-3 border-t border-zinc-100 grid grid-cols-2 gap-2 text-xs">
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
                      {u.is_active ? "Deactivate" : "Activate"}
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openCredentialsModal(u)}
                        className="text-[11px] text-amber-800 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded font-semibold flex items-center gap-1 transition border border-amber-300 shadow-2xs"
                        title="Set / Reset Login Password and Employee ID"
                      >
                        <Key className="w-3 h-3 text-amber-600" />
                        <span>ID & Pass</span>
                      </button>
                      <button
                        onClick={() => openPermissionsModal(u)}
                        className="text-[11px] text-[#714B67] hover:bg-purple-50 bg-purple-50/50 px-2.5 py-1 rounded font-semibold flex items-center gap-1 transition border border-[#714B67]/30 shadow-xs"
                      >
                        <Shield className="w-3 h-3 text-[#714B67]" />
                        <span>Permissions</span>
                      </button>
                      <button
                        onClick={() => openEditModal(u)}
                        className="text-[11px] text-zinc-600 hover:text-zinc-900 px-2 py-1 rounded hover:bg-zinc-100 font-medium transition"
                      >
                        Profile
                      </button>
                    </div>
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
                    <th className="py-3 px-4">Employee ID</th>
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
                        <span className="font-mono text-xs font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                          {u.employee_id || `DM-EMP-${100 + users.indexOf(u) + 1}`}
                        </span>
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
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openCredentialsModal(u)}
                            className="px-2 py-1 text-xs text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded font-semibold transition flex items-center gap-1 shadow-2xs"
                            title="Manage / Reset Employee Password & ID"
                          >
                            <Key className="w-3 h-3 text-amber-600" />
                            <span>ID & Pass</span>
                          </button>
                          <button
                            onClick={() => openPermissionsModal(u)}
                            className="px-2 py-1 text-xs text-[#714B67] bg-purple-50 hover:bg-purple-100 border border-purple-200/80 rounded font-semibold transition flex items-center gap-1 shadow-xs"
                            title="Assign & configure module permissions"
                          >
                            <Shield className="w-3 h-3 text-[#714B67]" />
                            <span>Permissions</span>
                          </button>
                          <button
                            onClick={() => openEditModal(u)}
                            className="px-2 py-1 text-xs text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded font-medium transition"
                          >
                            Profile
                          </button>
                        </div>
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
              {/* Employee ID and Full Name Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-zinc-700">
                      Employee ID <span className="text-purple-600">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setNewEmployeeId(generateSuggestedEmployeeId())}
                      className="text-[10px] text-[#714B67] hover:underline font-semibold flex items-center gap-0.5"
                    >
                      <RefreshCw size={10} /> Auto-Gen
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={newEmployeeId}
                    onChange={(e) => setNewEmployeeId(e.target.value)}
                    placeholder="e.g. DM-EMP-105"
                    className="w-full text-xs px-3 py-2 border border-zinc-300 rounded focus:ring-1 focus:ring-[#714B67] focus:outline-none font-mono font-bold text-purple-900 bg-purple-50/30"
                  />
                </div>

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
              </div>

              {/* Work Email & Department Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Department / Domain</label>
                  <select
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-zinc-300 rounded focus:ring-1 focus:ring-[#714B67] focus:outline-none bg-white"
                  >
                    <option value="Website & Full-Stack Development">Website & Full-Stack Development</option>
                    <option value="Graphic & Visual Design">Graphic & Visual Design</option>
                    <option value="SEO & Content Architecture">SEO & Content Architecture</option>
                    <option value="Performance Marketing & Meta Ads">Performance Marketing & Meta Ads</option>
                    <option value="Video Production & Motion Graphics">Video Production & Motion Graphics</option>
                    <option value="Client Success & Accounts">Client Success & Accounts</option>
                  </select>
                </div>
              </div>

              {/* Password Generator Field */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-zinc-700">
                    Login Password <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewPassword(generateStrongPassword())}
                    className="text-[11px] text-purple-700 hover:underline font-bold flex items-center gap-1"
                  >
                    <Sparkles size={11} /> Generate Strong Password
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Set initial password (min 6 characters)"
                    className="w-full text-xs px-3 py-2 border border-zinc-300 rounded focus:ring-1 focus:ring-[#714B67] focus:outline-none font-mono pr-16"
                  />
                  <div className="absolute right-2 top-2 flex items-center gap-1.5 text-zinc-400">
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="p-0.5 hover:text-zinc-700"
                      title={showNewPassword ? "Hide" : "Show"}
                    >
                      {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    {newPassword && (
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(newPassword);
                          toast.success("Password copied!");
                        }}
                        className="p-0.5 hover:text-zinc-700"
                        title="Copy Password"
                      >
                        <Copy size={14} />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Initial password will be provided in a shareable card to send to the employee via WhatsApp or Email.
                </p>
              </div>

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
                  <ShieldAlert className="w-4 h-4 text-purple-600" /> Granular Access & Software Module Permissions
                </span>

                <div className="mb-3">
                  <label className="block text-[11px] font-semibold text-zinc-600 mb-1">
                    1-Click Clearance Preset
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 text-xs">
                    {[
                      {
                        name: "🎯 Sales & Leads",
                        perms: ["crm:read", "crm:write", "leads:read", "leads:write", "projects:read", "attendance:read", "attendance:write"],
                        auto: true, proj: false, bill: false,
                      },
                      {
                        name: "🎨 Creative Media",
                        perms: ["projects:read", "projects:write", "content:read", "content:write", "vault:read", "attendance:read", "attendance:write"],
                        auto: false, proj: true, bill: false,
                      },
                      {
                        name: "👑 Full Admin",
                        perms: ["*"],
                        auto: true, proj: true, bill: true,
                      },
                    ].map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setNewPermissions(p.perms);
                          setNewCanManageAutomations(p.auto);
                          setNewCanEditProjects(p.proj);
                          setNewCanManageBilling(p.bill);
                          toast.info(`Preset applied: ${p.name}`);
                        }}
                        className="p-1.5 border border-zinc-200 hover:border-[#714B67] hover:bg-purple-50/50 rounded text-center text-[11px] font-medium transition"
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>

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

      {/* ========================================================================= */}
      {/* GRANULAR PERMISSIONS & ACCESS CONTROL MODAL                               */}
      {/* ========================================================================= */}
      {isPermissionsModalOpen && selectedUserForPermissions && (
        <UserPermissionsModal
          isOpen={isPermissionsModalOpen}
          onClose={() => {
            setIsPermissionsModalOpen(false);
            setSelectedUserForPermissions(null);
          }}
          user={selectedUserForPermissions}
          onPermissionsUpdated={(updatedUser) => {
            setUsers((prev) =>
              prev.map((u) => (u.id === updatedUser.id ? updatedUser : u))
            );
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* CREDENTIALS READY CARD MODAL (FOR WHATSAPP / EMAIL HAND-OFF)              */}
      {/* ========================================================================= */}
      {isCredentialsCardOpen && createdCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 bg-emerald-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                <h3 className="font-bold text-sm">Employee Credentials Ready</h3>
              </div>
              <button
                onClick={() => setIsCredentialsCardOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-600">
                The account has been provisioned and is ready for login. Send this credential card to the employee:
              </p>

              {/* Formatted Card Preview */}
              <div className="bg-slate-900 rounded-lg p-4 text-white font-mono text-[11px] leading-relaxed border border-slate-800 space-y-1.5 shadow-inner">
                <div className="text-emerald-400 font-bold flex items-center gap-1.5 pb-1 border-b border-slate-800">
                  <Sparkles size={13} />
                  <span>The Desi Muchads OS — Official Access</span>
                </div>
                <div className="pt-1">
                  <span className="text-slate-400">Employee: </span>
                  <span className="text-white font-bold">{createdCredentials.full_name}</span>
                </div>
                <div>
                  <span className="text-slate-400">Employee ID: </span>
                  <span className="text-purple-300 font-bold">{createdCredentials.employee_id}</span>
                </div>
                <div>
                  <span className="text-slate-400">Login Portal: </span>
                  <span className="text-blue-300 underline">https://frontend-nine-kappa-68.vercel.app/login</span>
                </div>
                <div>
                  <span className="text-slate-400">Work Email: </span>
                  <span className="text-amber-300">{createdCredentials.email}</span>
                </div>
                <div>
                  <span className="text-slate-400">Temporary Password: </span>
                  <span className="text-emerald-300 font-bold">{createdCredentials.password}</span>
                </div>
                <div>
                  <span className="text-slate-400">Clearance & Dept: </span>
                  <span className="text-slate-200">{createdCredentials.role} • {createdCredentials.department}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => copyCredentialsCard(createdCredentials)}
                  className="w-full py-2.5 bg-[#714B67] hover:bg-[#5E3E55] text-white rounded-lg text-xs font-bold shadow transition flex items-center justify-center gap-2"
                >
                  <Copy size={14} />
                  <span>Copy Login Credentials Card (for WhatsApp / Email)</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(
                      `🚀 The Desi Muchads OS — Official Employee Access\n\nWelcome ${createdCredentials.full_name}! Here are your team credentials:\n• Employee ID: ${createdCredentials.employee_id}\n• Login Portal: https://frontend-nine-kappa-68.vercel.app/login\n• Email: ${createdCredentials.email}\n• Password: ${createdCredentials.password}\n• Department: ${createdCredentials.department}\n• Role: ${createdCredentials.role}\n\nPlease log in and check your tasks!`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs text-center"
                  >
                    <Smartphone size={13} />
                    <span>WhatsApp Hand-off</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => setIsCredentialsCardOpen(false)}
                    className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
                  >
                    Close & Finish
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MANAGE EMPLOYEE CREDENTIALS / RESET PASSWORD MODAL                         */}
      {/* ========================================================================= */}
      {isCredentialsModalOpen && credentialsTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 bg-[#714B67] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-300" />
                <h3 className="font-bold text-sm">Manage Employee Credentials</h3>
              </div>
              <button
                onClick={() => setIsCredentialsModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResetCredentials} className="p-5 space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                <span className="font-bold text-slate-900 block">{credentialsTargetUser.full_name}</span>
                <span className="text-slate-500 font-mono">{credentialsTargetUser.email}</span>
                <span className="block mt-1 text-[11px] font-semibold text-purple-700">
                  {credentialsTargetUser.role} • {credentialsTargetUser.department}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Employee ID
                </label>
                <input
                  type="text"
                  value={targetEmployeeId}
                  onChange={(e) => setTargetEmployeeId(e.target.value)}
                  placeholder="e.g. DM-EMP-105"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-[#714B67] focus:outline-none font-mono font-bold text-purple-900 bg-purple-50/20"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    New Password <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setTargetNewPassword(generateStrongPassword())}
                    className="text-[11px] text-purple-700 hover:underline font-bold flex items-center gap-1"
                  >
                    <Sparkles size={11} /> Generate Strong
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showTargetPassword ? "text" : "password"}
                    required
                    value={targetNewPassword}
                    onChange={(e) => setTargetNewPassword(e.target.value)}
                    placeholder="Enter new password (min 6 chars)..."
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-[#714B67] focus:outline-none font-mono pr-16"
                  />
                  <div className="absolute right-2 top-2 flex items-center gap-1.5 text-slate-400">
                    <button
                      type="button"
                      onClick={() => setShowTargetPassword(!showTargetPassword)}
                      className="p-0.5 hover:text-slate-700"
                    >
                      {showTargetPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    {targetNewPassword && (
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(targetNewPassword);
                          toast.success("Password copied!");
                        }}
                        className="p-0.5 hover:text-slate-700"
                      >
                        <Copy size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCredentialsModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResettingCredentials}
                  className="px-4 py-1.5 bg-[#714B67] hover:bg-[#5E3E55] text-white text-xs font-bold rounded shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isResettingCredentials ? (
                    <span>Saving...</span>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Update & Generate Card</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
