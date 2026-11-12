import { NextResponse } from "next/server";
import { forwardToBackend } from "@/lib/backendProxy";
import { FALLBACK_REGIONS, FALLBACK_NICHES } from "@/lib/leadGeneratorEngine";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "Bearer demo_token_super_admin";
    const backendData = await forwardToBackend("/crm/lead-generator/presets", {
      method: "GET",
      headers: { Authorization: authHeader },
      timeoutMs: 1500,
    });

    if (backendData && backendData.data) {
      return NextResponse.json(backendData);
    }

    return NextResponse.json({
      data: { regions: FALLBACK_REGIONS, niches: FALLBACK_NICHES },
      meta: { timestamp: new Date().toISOString(), engine: "Muchad Presets (Serverless Fallback)" },
      error: null,
    });
  } catch {
    return NextResponse.json({
      data: { regions: FALLBACK_REGIONS, niches: FALLBACK_NICHES },
      meta: { timestamp: new Date().toISOString(), engine: "Muchad Presets (Resilient Fallback)" },
      error: null,
    });
  }
}
