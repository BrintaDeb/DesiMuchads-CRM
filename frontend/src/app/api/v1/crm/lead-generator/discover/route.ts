import { NextResponse } from "next/server";
import { generateLocalLeads } from "@/lib/leadGeneratorEngine";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const authHeader = req.headers.get("authorization") || "Bearer demo_token_super_admin";

    // Attempt live FastAPI backend lead discovery first
    try {
      const backendRes = await fetch("http://127.0.0.1:8000/api/v1/crm/lead-generator/discover", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify(body),
      });
      if (backendRes.ok) {
        const backendData = await backendRes.json();
        return NextResponse.json(backendData);
      }
    } catch {}

    const leads = generateLocalLeads(body);

    return NextResponse.json({
      data: leads,
      meta: {
        total_count: leads.length,
        timestamp: new Date().toISOString(),
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

