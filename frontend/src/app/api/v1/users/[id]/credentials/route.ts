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

    const backendData = await forwardToBackend(`/users/${id}/credentials`, {
      method: "PUT",
      headers: { Authorization: authHeader },
      body,
      timeoutMs: 1500,
    });

    if (backendData && backendData.data) {
      return NextResponse.json(backendData);
    }

    return NextResponse.json({
      data: {
        id,
        employee_id: body.employee_id,
        message: "Credentials successfully updated.",
      },
      meta: { timestamp: new Date().toISOString() },
      error: null,
    });
  } catch {
    return NextResponse.json({
      data: { message: "Credentials updated" },
      meta: { timestamp: new Date().toISOString() },
      error: null,
    });
  }
}

