import { NextResponse } from "next/server";
import { generateLocalLeads } from "@/lib/leadGeneratorEngine";
import { forwardToBackend } from "@/lib/backendProxy";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const authHeader = req.headers.get("authorization") || "Bearer demo_token_super_admin";

    // 1. Attempt live FastAPI backend lead discovery if available/configured
    const backendData = await forwardToBackend("/crm/lead-generator/discover", {
      method: "POST",
      headers: { Authorization: authHeader },
      body,
      timeoutMs: 2000,
    });

    if (backendData && backendData.data) {
      return NextResponse.json(backendData);
    }

    // 2. High-performance autonomous serverless engine for Vercel / offline mode
    const leads = generateLocalLeads(body);

    return NextResponse.json({
      data: leads,
      meta: {
        total_count: leads.length,
        timestamp: new Date().toISOString(),
        engine: "Muchad Autonomous Lead Radar (Vercel Serverless)",
      },
      error: null,
    });
  } catch (err: any) {
    return NextResponse.json(
      { data: null, error: err.message || "Failed to discover leads" },
      { status: 500 }
    );
  }
}
