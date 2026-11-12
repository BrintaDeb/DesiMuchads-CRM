import { NextResponse } from "next/server";
import { forwardToBackend } from "@/lib/backendProxy";

const DAEMONS = [
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
];

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization") || "Bearer demo_token_super_admin";
  const backendData = await forwardToBackend("/automations/daemons", {
    method: "GET",
    headers: { Authorization: authHeader },
    timeoutMs: 1500,
  });

  if (backendData && backendData.data) {
    return NextResponse.json(backendData);
  }

  return NextResponse.json({
    data: DAEMONS,
    meta: { timestamp: new Date().toISOString() },
    error: null,
  });
}

