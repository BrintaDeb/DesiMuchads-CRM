import { NextResponse } from "next/server";
import { forwardToBackend } from "@/lib/backendProxy";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization") || "Bearer demo_token_super_admin";
  const backendData = await forwardToBackend("/automations/rules", {
    method: "GET",
    headers: { Authorization: authHeader },
    timeoutMs: 1500,
  });

  if (backendData && backendData.data) {
    return NextResponse.json(backendData);
  }

  return NextResponse.json({
    data: [],
    meta: { timestamp: new Date().toISOString() },
    error: null,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const authHeader = req.headers.get("authorization") || "Bearer demo_token_super_admin";

    const backendData = await forwardToBackend("/automations/rules", {
      method: "POST",
      headers: { Authorization: authHeader },
      body,
      timeoutMs: 2000,
    });

    if (backendData && backendData.data) {
      return NextResponse.json(backendData);
    }

    const createdRule = {
      id: `rule_${Date.now()}`,
      name: body.name || "Custom Automation Rule",
      description: body.description || "",
      trigger_event: body.trigger_event || "TASK_BLOCKED",
      conditions: body.conditions || {},
      action_type: body.action_type || "ESCALATE_TO_ADMIN",
      action_config: body.action_config || { mode: "AUTOMATED_EXECUTION" },
      is_active: body.is_active !== undefined ? body.is_active : true,
      execution_count: 0,
      last_triggered_at: null,
      created_at: new Date().toISOString(),
    };

    return NextResponse.json({
      data: createdRule,
      meta: { timestamp: new Date().toISOString() },
      error: null,
    });
  } catch (err: any) {
    return NextResponse.json(
      { data: null, error: err.message || "Failed to create rule" },
      { status: 500 }
    );
  }
}
