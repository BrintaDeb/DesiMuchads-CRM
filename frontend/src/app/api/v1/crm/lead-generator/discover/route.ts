import { NextResponse } from "next/server";
import { generateLocalLeads } from "@/lib/leadGeneratorEngine";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const leads = generateLocalLeads(body);

    return NextResponse.json({
      data: leads,
      meta: {
        total_count: leads.length,
        timestamp: new Date().toISOString(),
      },
      error: null,
    });
  } catch (err: any) {
    return NextResponse.json(
      { data: null, error: err.message || "Failed to discover leads" },
      { status: 500 }
    );
  }
}

