import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const leads = body.leads || [];
    const stage = body.stage || "LEAD_CAPTURED";

    const created_deals = leads.map((l: any, idx: number) => ({
      id: l.temp_id || `deal_${Date.now()}_${idx}`,
      company_name: l.company_name,
      deal_value: l.deal_value || 75000,
      stage: stage,
    }));

    return NextResponse.json({
      data: {
        injected_count: created_deals.length,
        created_deals: created_deals,
        message: `Successfully injected ${created_deals.length} high-intent leads into the CRM pipeline.`,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
      error: null,
    });
  } catch (err: any) {
    return NextResponse.json(
      { data: null, error: err.message || "Failed to inject leads" },
      { status: 500 }
    );
  }
}

