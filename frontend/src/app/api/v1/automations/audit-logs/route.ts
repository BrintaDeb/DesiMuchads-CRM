import { NextResponse } from "next/server";
import { forwardToBackend } from "@/lib/backendProxy";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization") || "Bearer demo_token_super_admin";
  const backendData = await forwardToBackend("/automations/audit-logs", {
    method: "GET",
    headers: { Authorization: authHeader },
    timeoutMs: 1500,
  });

  if (backendData && backendData.data) {
    return NextResponse.json(backendData);
  }

  return NextResponse.json({
    data: [],
    meta: { timestamp: new Date().toISOString() },
    error: null,
  });
}

