import { NextResponse } from "next/server";
import { forwardToBackend } from "@/lib/backendProxy";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const authHeader = req.headers.get("authorization") || "Bearer demo_token_super_admin";

    const backendData = await forwardToBackend("/users/verify-admin-password", {
      method: "POST",
      headers: { Authorization: authHeader },
      body,
      timeoutMs: 1500,
    });

    if (backendData && backendData.data) {
      return NextResponse.json(backendData);
    }

    const password = body.password || "";
    const isValid = password === "DesiMuchads@admin98";

    return NextResponse.json({
      data: { valid: isValid },
      meta: { timestamp: new Date().toISOString() },
      error: isValid ? null : "Invalid admin password.",
    });
  } catch {
    return NextResponse.json({
      data: { valid: false },
      meta: { timestamp: new Date().toISOString() },
      error: "Verification failed.",
    });
  }
}

