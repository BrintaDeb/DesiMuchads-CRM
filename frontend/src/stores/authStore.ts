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
}

export const useAuthStore = create<AuthState>((set) => ({
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

    // Automatically authenticate with default Super Admin so all API calls have valid tokens
    try {
      const res = await api.post("/auth/login", {
        email: "admin@desimuchads.com",
        password: "admin123456",
      });
      const data = res.data?.data;
      if (data?.access_token && data?.user) {
        if (typeof window !== "undefined") {
          localStorage.setItem("muchad_access_token", data.access_token);
          localStorage.setItem("muchad_user", JSON.stringify(data.user));
        }
        set({
          user: data.user,
          token: data.access_token,
          isAuthenticated: true,
          isLoading: false,
        });
        return;
      }
    } catch {}

    // Fallback demo user
    const demoSuperAdmin: User = {
      id: "900a1903-36eb-407f-8c18-42de3f13706f",
      email: "admin@desimuchads.com",
      full_name: "Muchad Founder (Super Admin)",
      role: "SUPER_ADMIN",
      department: "Executive Leadership",
      hourly_cost: 100,
      weekly_capacity_hours: 40,
      is_active: true,
      created_at: new Date().toISOString(),
    };
    set({
      user: demoSuperAdmin,
      token: "demo_token_super_admin",
      isAuthenticated: true,
      isLoading: false,
    });
  },
}));

