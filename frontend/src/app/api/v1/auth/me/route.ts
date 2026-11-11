import { NextResponse } from "next/server";
import { forwardToBackend } from "@/lib/backendProxy";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization") || "Bearer demo_token_super_admin";

  const backendData = await forwardToBackend("/auth/me", {
    method: "GET",
    headers: { Authorization: authHeader },
    timeoutMs: 1500,
  });

  if (backendData && backendData.data) {
    return NextResponse.json(backendData);
  }

  return NextResponse.json({
    data: {
      id: "usr_desi_muchad_01",
      email: "admin@desimuchads.com",
      full_name: "DESI MUCHAD ADMIN",
      role: "SUPER_ADMIN",
      department: "The Desi Muchads Executive Board",
      hourly_cost: 65,
      weekly_capacity_hours: 45,
      is_active: true,
      created_at: new Date().toISOString(),
    },
    meta: { timestamp: new Date().toISOString() },
    error: null,
  });
}

