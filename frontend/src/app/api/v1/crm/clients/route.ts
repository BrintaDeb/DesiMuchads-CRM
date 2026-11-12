import { NextResponse } from "next/server";
import { forwardToBackend } from "@/lib/backendProxy";
import { getAllClients } from "@/lib/serverlessStore";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization") || "Bearer demo_token_super_admin";

  const backendData = await forwardToBackend("/crm/clients", {
    method: "GET",
    headers: { Authorization: authHeader },
    timeoutMs: 1500,
  });

  if (backendData && backendData.data) {
    return NextResponse.json(backendData);
  }

  const clients = getAllClients();

  return NextResponse.json({
    data: clients,
    meta: { total_count: clients.length, timestamp: new Date().toISOString() },
    error: null,
  });
}
