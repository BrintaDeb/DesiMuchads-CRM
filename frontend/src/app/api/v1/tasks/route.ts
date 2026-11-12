import { NextResponse } from "next/server";
import { forwardToBackend } from "@/lib/backendProxy";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization") || "Bearer demo_token_super_admin";
  const backendData = await forwardToBackend("/tasks/", {
    method: "GET",
    headers: { Authorization: authHeader },
    timeoutMs: 1500,
  });

  if (backendData && backendData.data) {
    return NextResponse.json(backendData);
  }

  return NextResponse.json({
    data: [],
    meta: { total_count: 0, timestamp: new Date().toISOString() },
    error: null,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const authHeader = req.headers.get("authorization") || "Bearer demo_token_super_admin";

    const backendData = await forwardToBackend("/tasks/", {
      method: "POST",
      headers: { Authorization: authHeader },
      body,
      timeoutMs: 1500,
    });

    if (backendData && backendData.data) {
      return NextResponse.json(backendData);
    }

    const newTask = {
      id: `task-${Date.now()}`,
      title: body.title,
      description: body.description || "",
      priority: body.priority || "MEDIUM",
      status: body.status || "TODO",
      estimated_hours: body.estimated_hours || 4,
      logged_hours: 0,
      due_at: body.due_at || new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    return NextResponse.json({
      data: newTask,
      meta: { timestamp: new Date().toISOString() },
      error: null,
    });
  } catch {
    return NextResponse.json(
      { data: null, error: "Failed to create task" },
      { status: 500 }
    );
  }
}

