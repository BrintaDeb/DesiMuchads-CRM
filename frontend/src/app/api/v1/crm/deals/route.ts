import { NextResponse } from "next/server";
import { forwardToBackend } from "@/lib/backendProxy";

const INITIAL_SERVERLESS_DEALS = [
  {
    id: "deal_01",
    company_name: "Raw Earth Organics",
    industry: "D2C Cosmetics",
    contact_name: "Vikram Malhotra",
    email: "vikram@rawearth.in",
    phone: "+91 99887 66554",
    deal_stage: "LEAD_CAPTURED",
    deal_value: 85000,
    retainer_amount: 85000,
    health_score: 90,
    last_activity_hours: 12,
    is_decaying: false,
  },
  {
    id: "deal_02",
    company_name: "FinPulse Global",
    industry: "FinTech Banking",
    contact_name: "Neha Joshi",
    email: "neha@finpulse.com",
    phone: "+91 98112 33445",
    deal_stage: "DISCOVERY_CALL",
    deal_value: 200000,
    retainer_amount: 200000,
    health_score: 85,
    last_activity_hours: 54,
    is_decaying: true,
  },
  {
    id: "deal_03",
    company_name: "Urban Vibe Apparels",
    industry: "E-Commerce Fashion",
    contact_name: "Sneha Kapoor",
    email: "sneha@urbanvibe.in",
    phone: "+91 91234 56789",
    deal_stage: "PROPOSAL_SENT",
    deal_value: 120000,
    retainer_amount: 120000,
    health_score: 95,
    last_activity_hours: 18,
    is_decaying: false,
  },
  {
    id: "deal_04",
    company_name: "Bombay Chai Co.",
    industry: "D2C Beverage",
    contact_name: "Arjun Singhania",
    email: "arjun@bombaychai.co",
    phone: "+91 98765 43210",
    deal_stage: "LEAD_CAPTURED",
    deal_value: 75000,
    retainer_amount: 75000,
    health_score: 88,
    last_activity_hours: 6,
    is_decaying: false,
  },
];

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

