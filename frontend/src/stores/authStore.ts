import { create } from "zustand";
import { User } from "@/types";
import { api } from "@/lib/api";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  login: (token: string, user: User) => void;
  logout: () => Promise<void>;
  initializeAuth: () => void;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
}

function getDefaultRolePermissions(user: User): string[] {
  if (user.role === "SUPER_ADMIN") {
    return [
      "crm:read", "crm:write",
      "leads:read", "leads:write",
      "projects:read", "projects:write",
      "content:read", "content:write",
      "attendance:read", "attendance:write",
      "billing:read", "billing:write",
      "vault:read", "vault:write",
      "automations:read", "automations:write",
      "team:read", "team:write",
    ];
  }
  const perms = ["attendance:read", "attendance:write"];
  if (user.role === "ACCOUNT_MANAGER") {
    perms.push(
      "crm:read", "crm:write",
      "leads:read",
      "projects:read", "projects:write",
      "content:read", "content:write",
      "vault:read", "team:read"
    );
  } else if (user.role === "SPECIALIST") {
    perms.push("projects:read", "projects:write", "content:read", "content:write", "vault:read");
  } else if (user.role === "CLIENT") {
    perms.push("projects:read", "content:read", "content:write");
  }
  if (user.can_manage_automations) perms.push("automations:read", "automations:write", "leads:read", "leads:write");
  if (user.can_manage_billing) perms.push("billing:read", "billing:write");
  return perms;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setToken: (token) => set({ token }),

  login: (token, user) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("muchad_access_token", token);
      localStorage.setItem("muchad_user", JSON.stringify(user));
    }
    set({ token, user, isAuthenticated: true, isLoading: false });
  },

  logout: async () => {
    try {
      await api.post("/auth/logout");
    } catch {}
    if (typeof window !== "undefined") {
      localStorage.removeItem("muchad_access_token");
      localStorage.removeItem("muchad_user");
    }
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
  },

  initializeAuth: async () => {
    if (typeof window !== "undefined") {
      const storedToken = localStorage.getItem("muchad_access_token");
      const storedUser = localStorage.getItem("muchad_user");
      if (storedToken && storedUser && storedToken !== "demo_token_super_admin") {
        try {
          const parsedUser = JSON.parse(storedUser);
          set({
            token: storedToken,
            user: parsedUser,
            isAuthenticated: true,
            isLoading: false,
          });
          return;
        } catch {}
      }
    }

    // Require explicit authentication (no auto-bypass)
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  hasPermission: (permission: string) => {
    const user = get().user;
    if (!user) return false;
    if (user.role === "SUPER_ADMIN") return true;

    const perms =
      user.permissions && user.permissions.length > 0
        ? user.permissions
        : getDefaultRolePermissions(user);

    if (perms.includes("*") || perms.includes(permission)) return true;

    const module = permission.split(":")[0];
    if (perms.includes(`${module}:*`)) return true;
    if (permission.endsWith(":read") && perms.includes(`${module}:write`)) return true;

    // Backward compatibility with flags
    if (module === "automations" && user.can_manage_automations) return true;
    if (module === "billing" && user.can_manage_billing) return true;
    if (module === "projects" && user.can_edit_projects) return true;

    return false;
  },

  hasAnyPermission: (permissions: string[]) => {
    const hasPermission = get().hasPermission;
    return permissions.some((p) => hasPermission(p));
  },
}));

