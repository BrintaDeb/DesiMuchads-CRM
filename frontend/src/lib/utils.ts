import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "INR"): string {
  if (currency === "INR") {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function getStatusColor(status: string): string {
  switch (status.toUpperCase()) {
    case "ACTIVE":
    case "APPROVED":
    case "COMPLETED":
    case "WON":
    case "PAID":
      return "text-agency-emerald bg-agency-emerald/10 border-agency-emerald/30";
    case "IN_PROGRESS":
    case "INTERNAL_QA":
    case "ON_BREAK":
    case "PROPOSAL_SENT":
    case "DISCOVERY_CALL":
    case "AUDIT_STRATEGY":
    case "DRAFT":
      return "text-agency-amber bg-agency-amber/10 border-agency-amber/30";
    case "BLOCKED":
    case "CRITICAL":
    case "OVERDUE":
    case "REJECTED":
    case "REVISION_REQUESTED":
    case "LOST":
    case "PAUSED":
      return "text-agency-rose bg-agency-rose/10 border-agency-rose/30";
    case "TODO":
    case "BACKLOG":
    case "DRAFTING":
    case "LEAD_CAPTURED":
    case "PLANNING":
      return "text-zinc-400 bg-zinc-800/50 border-zinc-700/50";
    default:
      return "text-agency-indigo bg-agency-indigo/10 border-agency-indigo/30";
  }
}

