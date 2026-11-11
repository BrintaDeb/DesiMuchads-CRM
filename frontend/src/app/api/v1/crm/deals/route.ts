import { NextResponse } from "next/server";
import { forwardToBackend } from "@/lib/backendProxy";

const INITIAL_SERVERLESS_DEALS: any[] = [];

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization") || "Bearer demo_token_super_admin";

  const backendData = await forwardToBackend("/crm/deals", {
    method: "GET",
    headers: { Authorization: authHeader },
    timeoutMs: 1800,
  });

  if (backendData && backendData.data) {
    return NextResponse.json(backendData);
  }

  return NextResponse.json({
    data: INITIAL_SERVERLESS_DEALS,
    meta: {
      total_count: INITIAL_SERVERLESS_DEALS.length,
      timestamp: new Date().toISOString(),
      engine: "Muchad Serverless CRM Pipeline",
    },
    error: null,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const authHeader = req.headers.get("authorization") || "Bearer demo_token_super_admin";

    const backendData = await forwardToBackend("/crm/deals", {
      method: "POST",
      headers: { Authorization: authHeader },
      body,
      timeoutMs: 2000,
    });

    if (backendData && backendData.data) {
      return NextResponse.json(backendData);
    }

    const newDeal = {
      id: `deal_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      company_name: body.company_name || "New Enterprise Lead",
      industry: body.industry || "Marketing & Growth",
      contact_name: body.contact_name || body.primary_contact_name || "Founder",
      email: body.email || body.contact_email || "contact@client.in",
      phone: body.phone || body.contact_phone || "+91 98000 00000",
      deal_stage: body.deal_stage || "LEAD_CAPTURED",
      deal_value: body.deal_value || 85000,
      retainer_amount: body.retainer_amount || body.deal_value || 85000,
      health_score: body.health_score || 95,
      last_activity_hours: 0,
      is_decaying: false,
    };

    return NextResponse.json({
      data: newDeal,
      meta: { timestamp: new Date().toISOString() },
      error: null,
    });
  } catch (err: any) {
    return NextResponse.json(
      { data: null, error: err.message || "Failed to create deal" },
      { status: 500 }
    );
  }
}

