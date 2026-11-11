import { NextResponse } from "next/server";
import { forwardToBackend } from "@/lib/backendProxy";

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

  return NextResponse.json({
    data: [
      {
        id: "c1",
        company_name: "Raw Earth Organics",
        industry: "D2C Cosmetics",
        primary_contact_name: "Vikram Malhotra",
        contact_email: "vikram@rawearth.in",
        contact_phone: "+91 99887 66554",
        status: "ACTIVE",
        health_score: 90,
      },
      {
        id: "c2",
        company_name: "FinPulse Global",
        industry: "FinTech Banking",
        primary_contact_name: "Neha Joshi",
        contact_email: "neha@finpulse.com",
        contact_phone: "+91 98112 33445",
        status: "ACTIVE",
        health_score: 85,
      },
    ],
    meta: { total_count: 2, timestamp: new Date().toISOString() },
    error: null,
  });
}

