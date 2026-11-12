import { NextResponse } from "next/server";
import { forwardToBackend } from "@/lib/backendProxy";

const TEMPLATES = [
  {
    id: "tpl_1",
    name: "VIP Performance Teardown Offer",
    channel: "WHATSAPP",
    category: "COLD_OUTREACH",
    body: "Namaste {{first_name}} ji! We noticed {{company_name}} expanding in {{city}}. Our team at The Desi Muchads put together a tailored 3-minute video breakdown of 2 growth levers for your brand. Can we send it across?",
  },
  {
    id: "tpl_2",
    name: "Pipeline Re-Engagement",
    channel: "WHATSAPP",
    category: "FOLLOW_UP",
    body: "Hi {{first_name}}, following up on our discussion regarding {{company_name}}'s digital presence. We just opened 2 performance slots this month. Let's lock in a quick 10-minute sync.",
  },
  {
    id: "tpl_3",
    name: "Executive Case Study Brief",
    channel: "EMAIL",
    category: "NURTURE",
    body: "Hi {{first_name}},\n\nThought you might find this relevant for {{company_name}}'s growth in {{city}}. We recently helped a brand in {{niche}} scale by 140%.\n\nBest,\nThe Desi Muchads Growth Team",
  },
];

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization") || "Bearer demo_token_super_admin";
  const backendData = await forwardToBackend("/crm/bulk-messaging/templates", {
    method: "GET",
    headers: { Authorization: authHeader },
    timeoutMs: 1500,
  });

  if (backendData && backendData.data) {
    return NextResponse.json(backendData);
  }

  return NextResponse.json({
    data: TEMPLATES,
    meta: { timestamp: new Date().toISOString() },
    error: null,
  });
}

