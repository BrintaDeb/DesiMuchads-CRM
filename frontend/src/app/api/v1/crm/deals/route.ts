import { NextResponse } from "next/server";
import { forwardToBackend } from "@/lib/backendProxy";
import { getAllDeals, saveDeal } from "@/lib/serverlessStore";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization") || "Bearer demo_token_super_admin";

  const backendData = await forwardToBackend("/crm/deals", {
    method: "GET",
    headers: { Authorization: authHeader },
    timeoutMs: 1800,
  });

  if (backendData && backendData.data && Array.isArray(backendData.data)) {
    // Sync backend deals into serverless store
    for (const bDeal of backendData.data) {
      saveDeal(bDeal);
    }
    return NextResponse.json(backendData);
  }

  const serverlessDeals = getAllDeals();

  return NextResponse.json({
    data: serverlessDeals,
    meta: {
      total_count: serverlessDeals.length,
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

    // Forward to FastAPI backend if available
    const backendData = await forwardToBackend("/crm/deals", {
      method: "POST",
      headers: { Authorization: authHeader },
      body,
      timeoutMs: 2000,
    });

    const newDeal = saveDeal(backendData?.data || body);

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
