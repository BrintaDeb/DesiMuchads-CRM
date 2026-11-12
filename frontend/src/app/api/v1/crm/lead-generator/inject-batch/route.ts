import { NextResponse } from "next/server";
import { forwardToBackend } from "@/lib/backendProxy";
import { injectBatchLeads } from "@/lib/serverlessStore";

export async function POST(req: Request) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const authHeader = req.headers.get("authorization") || "Bearer demo_token_super_admin";
    const leads = body.leads || [];
    const stage = body.stage || "LEAD_CAPTURED";

    // Attempt live FastAPI backend ingestion first if reachable
    const backendData = await forwardToBackend("/crm/lead-generator/inject-batch", {
      method: "POST",
      headers: { Authorization: authHeader },
      body,
      timeoutMs: 2000,
    });

    // Always persist into serverless deals store so /crm/deals returns them immediately
    const injectedDeals = injectBatchLeads(leads, stage);

    return NextResponse.json({
      data: {
        injected_count: injectedDeals.length,
        created_deals: backendData?.data?.created_deals || injectedDeals,
        message: `Successfully injected ${injectedDeals.length} high-intent leads into the CRM pipeline.`,
      },
      meta: {
        timestamp: new Date().toISOString(),
        engine: "Muchad Autonomous Serverless Lead Pipeline",
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
