import { NextResponse } from "next/server";
import { forwardToBackend } from "@/lib/backendProxy";
import { getDealById, updateDeal, deleteDeal } from "@/lib/serverlessStore";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authHeader = req.headers.get("authorization") || "Bearer demo_token_super_admin";

  const backendData = await forwardToBackend(`/crm/deals/${id}`, {
    method: "GET",
    headers: { Authorization: authHeader },
    timeoutMs: 1500,
  });

  if (backendData && backendData.data) {
    return NextResponse.json(backendData);
  }

  const deal = getDealById(id);
  if (!deal) {
    return NextResponse.json({ data: null, error: "Deal not found" }, { status: 404 });
  }

  return NextResponse.json({ data: deal, error: null });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const authHeader = req.headers.get("authorization") || "Bearer demo_token_super_admin";

    // Attempt to update on live FastAPI backend if reachable
    const backendData = await forwardToBackend(`/crm/deals/${id}`, {
      method: "PATCH",
      headers: { Authorization: authHeader },
      body,
      timeoutMs: 2000,
    });

    // Update in serverless persistent store
    const updated = updateDeal(id, backendData?.data || body);
    if (!updated) {
      return NextResponse.json({ data: null, error: "Deal not found in pipeline" }, { status: 404 });
    }

    return NextResponse.json({
      data: updated,
      meta: { timestamp: new Date().toISOString() },
      error: null,
    });
  } catch (err: any) {
    return NextResponse.json(
      { data: null, error: err.message || "Failed to update deal" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = req.headers.get("authorization") || "Bearer demo_token_super_admin";

    await forwardToBackend(`/crm/deals/${id}`, {
      method: "DELETE",
      headers: { Authorization: authHeader },
      timeoutMs: 1500,
    });

    deleteDeal(id);

    return NextResponse.json({
      data: { success: true, id },
      meta: { timestamp: new Date().toISOString() },
      error: null,
    });
  } catch (err: any) {
    return NextResponse.json(
      { data: null, error: err.message || "Failed to delete deal" },
      { status: 500 }
    );
  }
}

