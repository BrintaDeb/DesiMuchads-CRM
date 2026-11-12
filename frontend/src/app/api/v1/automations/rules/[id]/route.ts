import { NextResponse } from "next/server";
import { forwardToBackend } from "@/lib/backendProxy";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const authHeader = req.headers.get("authorization") || "Bearer demo_token_super_admin";

    const backendData = await forwardToBackend(`/automations/rules/${id}`, {
      method: "PUT",
      headers: { Authorization: authHeader },
      body,
      timeoutMs: 2000,
    });

    if (backendData && backendData.data) {
      return NextResponse.json(backendData);
    }

    return NextResponse.json({
      data: { id, ...body, updated_at: new Date().toISOString() },
      meta: { timestamp: new Date().toISOString() },
      error: null,
    });
  } catch (err: any) {
    return NextResponse.json(
      { data: null, error: err.message || "Failed to update rule" },
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

    await forwardToBackend(`/automations/rules/${id}`, {
      method: "DELETE",
      headers: { Authorization: authHeader },
      timeoutMs: 1500,
    });

    return NextResponse.json({
      data: { success: true, id },
      meta: { timestamp: new Date().toISOString() },
      error: null,
    });
  } catch (err: any) {
    return NextResponse.json(
      { data: null, error: err.message || "Failed to delete rule" },
      { status: 500 }
    );
  }
}

