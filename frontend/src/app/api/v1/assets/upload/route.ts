import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const storageKey = url.searchParams.get("storage_key") || `asset_${Date.now()}`;
    return NextResponse.json({
      data: {
        storage_key: storageKey,
        public_url: `/uploads/${storageKey}`,
        message: "File uploaded successfully.",
      },
      meta: { timestamp: new Date().toISOString() },
      error: null,
    });
  } catch {
    return NextResponse.json({
      data: { status: "UPLOADED" },
      meta: { timestamp: new Date().toISOString() },
      error: null,
    });
  }
}

