import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    data: {
      access_token: "demo_token_super_admin_refreshed",
      token_type: "bearer",
      expires_in: 86400,
    },
    meta: { timestamp: new Date().toISOString() },
    error: null,
  });
}

