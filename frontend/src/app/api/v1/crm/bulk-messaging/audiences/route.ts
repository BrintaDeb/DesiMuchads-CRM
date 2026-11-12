import { NextResponse } from "next/server";
import { forwardToBackend } from "@/lib/backendProxy";

const AUDIENCES = [
  { key: "ALL_LEADS", label: "All Leads & Opportunities", count: 8, description: "Every lead captured across all stages" },
  { key: "HOT_BUYERS", label: "Hot Buyers (Discovery / Proposal)", count: 4, description: "Active high-intent pipeline leads" },
  { key: "WON_CLIENTS", label: "Won Retainer Clients", count: 2, description: "Active monthly retainers" },
  { key: "TEAM", label: "Internal Team Members", count: 3, description: "Desi Muchads agency members" },
  { key: "CUSTOM", label: "Custom Contact List", count: 0, description: "Manual phone numbers or emails" },
];

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization") || "Bearer demo_token_super_admin";
  const backendData = await forwardToBackend("/crm/bulk-messaging/audiences", {
    method: "GET",
    headers: { Authorization: authHeader },
    timeoutMs: 1500,
  });

  if (backendData && backendData.data) {
    return NextResponse.json(backendData);
  }

  return NextResponse.json({
    data: { segments: AUDIENCES, total_segments: AUDIENCES.length },
    meta: { timestamp: new Date().toISOString() },
    error: null,
  });
}

