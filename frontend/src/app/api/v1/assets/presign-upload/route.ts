import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const key = `assets/${Date.now()}_${body.filename || "upload.png"}`;
    return NextResponse.json({
      data: {
        storage_key: key,
        upload_url: `/api/v1/assets/upload?storage_key=${encodeURIComponent(key)}`,
      },
      meta: { timestamp: new Date().toISOString() },
      error: null,
    });
  } catch {
    return NextResponse.json({
      data: { storage_key: `assets/${Date.now()}` },
      meta: { timestamp: new Date().toISOString() },
      error: null,
    });
  }
}

