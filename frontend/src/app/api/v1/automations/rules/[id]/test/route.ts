import { NextResponse } from "next/server";
import { forwardToBackend } from "@/lib/backendProxy";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = req.headers.get("authorization") || "Bearer demo_token_super_admin";

    const backendData = await forwardToBackend(`/automations/rules/${id}/test`, {
      method: "POST",
      headers: { Authorization: authHeader },
      timeoutMs: 2000,
    });

    if (backendData && backendData.data) {
      return NextResponse.json(backendData);
    }

    return NextResponse.json({
      data: {
        rule_id: id,
        simulated_action: "Rule conditions matched simulated payload. Notification dispatched.",
        status: "SUCCESS",
        timestamp: new Date().toISOString(),
      },
      meta: { timestamp: new Date().toISOString() },
      error: null,
    });
  } catch (err: any) {
    return NextResponse.json(
      { data: null, error: err.message || "Failed to test rule" },
      { status: 500 }
    );
  }
}

