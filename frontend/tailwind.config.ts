import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#F8F9FA",
        foreground: "#1E293B",
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#1E293B",
        },
        popover: {
          DEFAULT: "#FFFFFF",
          foreground: "#1E293B",
        },
        muted: {
          DEFAULT: "#F1F5F9",
          foreground: "#64748B",
        },
        accent: {
          DEFAULT: "#F1F5F9",
          foreground: "#1E293B",
        },
        border: "#E2E8F0",
        input: "#E2E8F0",
        ring: "#714B67",
        // Odoo Signature Palette
        odoo: {
          purple: "#714B67",      // Classic Odoo Primary Purple
          darkpurple: "#58364F",  // Hover Purple
          lightpurple: "#F3EDF2", // Soft Purple Tint
          teal: "#008784",        // Odoo Action Teal
          darkteal: "#006C69",
          lightteal: "#E6F4F3",
          bg: "#F8F9FA",          // Clean Odoo App Canvas
          card: "#FFFFFF",
          border: "#E2E8F0",
          subtle: "#F1F5F9",
          text: "#1E293B",
          subtext: "#64748B",
        },
        // Semantic Status Tokens (Odoo Soft Pastel Pills)
        agency: {
          emerald: "#10B981",
          amber: "#F59E0B",
          rose: "#EF4444",
          indigo: "#6366F1",
          purple: "#714B67",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        card: "0 1px 3px 0 rgba(0, 0, 0, 0.06), 0 1px 2px 0 rgba(0, 0, 0, 0.04)",
        dropdown: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
      },
      borderRadius: {
        lg: "0.5rem",
        md: "0.375rem",
        sm: "0.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
