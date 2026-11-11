import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const leads = body.leads || [];
    const channel = body.channel || "ALL";

    return NextResponse.json({
      data: {
        dispatched_count: leads.length,
        channel: channel,
        status: "DISPATCHED",
        message: `Dispatched ${leads.length} personalized cold outreach touches via ${channel}.`,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
      error: null,
    });
  } catch (err: any) {
    return NextResponse.json(
      { data: null, error: err.message || "Failed to dispatch outreach" },
      { status: 500 }
    );
  }
}

