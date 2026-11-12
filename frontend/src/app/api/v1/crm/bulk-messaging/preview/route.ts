import { NextResponse } from "next/server";
import { forwardToBackend } from "@/lib/backendProxy";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const authHeader = req.headers.get("authorization") || "Bearer demo_token_super_admin";

    const backendData = await forwardToBackend("/crm/bulk-messaging/preview", {
      method: "POST",
      headers: { Authorization: authHeader },
      body,
      timeoutMs: 2000,
    });

    if (backendData && backendData.data) {
      return NextResponse.json(backendData);
    }

    const tplText = body.template_body || "Namaste {{first_name}} ji! Connecting from The Desi Muchads.";
    const samples = [
      {
        recipient_name: "Vikram Singhania",
        target_identifier: "+91 98200 12345",
        rendered_message: tplText
          .replace("{{first_name}}", "Vikram")
          .replace("{{company_name}}", "Singhania Luxury Living")
          .replace("{{city}}", "Mumbai"),
        whatsapp_url: `https://api.whatsapp.com/send?phone=919820012345&text=${encodeURIComponent(
          tplText.replace("{{first_name}}", "Vikram")
        )}`,
      },
      {
        recipient_name: "Ananya Mehra",
        target_identifier: "+91 98111 67890",
        rendered_message: tplText
          .replace("{{first_name}}", "Ananya")
          .replace("{{company_name}}", "Raw Botanics D2C")
          .replace("{{city}}", "Bengaluru"),
        whatsapp_url: `https://api.whatsapp.com/send?phone=919811167890&text=${encodeURIComponent(
          tplText.replace("{{first_name}}", "Ananya")
        )}`,
      },
    ];

    return NextResponse.json({
      data: {
        total_recipients: samples.length,
        sample_recipients: samples,
      },
      meta: { timestamp: new Date().toISOString() },
      error: null,
    });
  } catch {
    return NextResponse.json({
      data: { total_recipients: 0, sample_recipients: [] },
      meta: { timestamp: new Date().toISOString() },
      error: null,
    });
  }
}

