import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    data: { message: "Successfully logged out" },
    meta: { timestamp: new Date().toISOString() },
    error: null,
  });
}

