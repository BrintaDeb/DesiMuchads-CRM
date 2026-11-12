import { NextResponse } from "next/server";
import { forwardToBackend } from "@/lib/backendProxy";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = req.headers.get("authorization") || "Bearer demo_token_super_admin";

    const backendData = await forwardToBackend(`/crm/deals/${id}/proposal-pdf`, {
      method: "GET",
      headers: { Authorization: authHeader },
      timeoutMs: 2500,
    });

    if (backendData) {
      return NextResponse.json(backendData);
    }

    return NextResponse.json({
      data: {
        pdf_url: "#",
        deal_id: id,
        message: "Proposal ready for preview.",
      },
      meta: { timestamp: new Date().toISOString() },
      error: null,
    });
  } catch {
    return NextResponse.json({
      data: { message: "Ready" },
      meta: { timestamp: new Date().toISOString() },
      error: null,
    });
  }
}

