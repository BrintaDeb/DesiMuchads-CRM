import { NextResponse } from "next/server";
import { forwardToBackend } from "@/lib/backendProxy";

const DEFAULT_USERS = [
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
];

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization") || "Bearer demo_token_super_admin";
  const backendData = await forwardToBackend("/users", {
    method: "GET",
    headers: { Authorization: authHeader },
    timeoutMs: 1500,
  });

  if (backendData && backendData.data) {
    return NextResponse.json(backendData);
  }

  return NextResponse.json({
    data: DEFAULT_USERS,
    meta: { total_count: DEFAULT_USERS.length, timestamp: new Date().toISOString() },
    error: null,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const authHeader = req.headers.get("authorization") || "Bearer demo_token_super_admin";

    const backendData = await forwardToBackend("/users", {
      method: "POST",
      headers: { Authorization: authHeader },
      body,
      timeoutMs: 1500,
    });

    if (backendData && backendData.data) {
      return NextResponse.json(backendData);
    }

    const newUser = {
      id: `u-${Date.now()}`,
      employee_id: body.employee_id || `DM-${Math.floor(100 + Math.random() * 900)}`,
      email: body.email,
      full_name: body.full_name,
      role: body.role || "SPECIALIST",
      department: body.department || "Operations",
      hourly_cost: body.hourly_cost || 40,
      weekly_capacity_hours: body.weekly_capacity_hours || 40,
      can_manage_automations: Boolean(body.can_manage_automations),
      can_edit_projects: Boolean(body.can_edit_projects),
      can_manage_billing: Boolean(body.can_manage_billing),
      is_active: true,
      created_at: new Date().toISOString(),
    };

    return NextResponse.json({
      data: newUser,
      meta: { timestamp: new Date().toISOString() },
      error: null,
    });
  } catch {
    return NextResponse.json(
      { data: null, error: "Failed to process user creation" },
      { status: 500 }
    );
  }
}

