import { NextResponse } from "next/server";
import { forwardToBackend } from "@/lib/backendProxy";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization") || "Bearer demo_token_super_admin";
  const backendData = await forwardToBackend("/crm/lead-generator/presets", {
    method: "GET",
    headers: { Authorization: authHeader },
    timeoutMs: 1500,
  });
  if (backendData && backendData.data) {
    return NextResponse.json(backendData);
  }
  const regions = [
    {
      city: "Mumbai",
      lat: 18.9284,
      lng: 72.8282,
      areas: [
        "South Mumbai (Nariman Point & Fort)",
        "BKC (Bandra Kurla Complex)",
        "Bandra West & Pali Hill",
        "Lower Parel (Kamala Mills)",
        "Andheri West (Lokhandwala & Oshiwara)",
        "Powai (Hiranandani Gardens)",
        "Juhu & Vile Parle",
      ],
      area_details: [
        { name: "South Mumbai (Nariman Point & Fort)", lat: 18.9284, lng: 72.8282 },
        { name: "BKC (Bandra Kurla Complex)", lat: 19.0657, lng: 72.8687 },
        { name: "Bandra West & Pali Hill", lat: 19.0596, lng: 72.8295 },
        { name: "Lower Parel (Kamala Mills)", lat: 18.9953, lng: 72.8306 },
        { name: "Andheri West (Lokhandwala & Oshiwara)", lat: 19.1363, lng: 72.8277 },
        { name: "Powai (Hiranandani Gardens)", lat: 19.1176, lng: 72.906 },
        { name: "Juhu & Vile Parle", lat: 19.1075, lng: 72.8263 },
      ],
    },
    {
      city: "Bengaluru",
      lat: 12.9716,
      lng: 77.5946,
      areas: [
        "Indiranagar (100ft Rd & 12th Main)",
        "Koramangala (4th & 5th Block)",
        "HSR Layout (27th Main)",
        "Whitefield & ITPL",
        "MG Road & Lavelle Road",
      ],
      area_details: [
        { name: "Indiranagar (100ft Rd & 12th Main)", lat: 12.9784, lng: 77.6408 },
        { name: "Koramangala (4th & 5th Block)", lat: 12.9352, lng: 77.6245 },
        { name: "HSR Layout (27th Main)", lat: 12.9121, lng: 77.6446 },
        { name: "Whitefield & ITPL", lat: 12.9698, lng: 77.75 },
        { name: "MG Road & Lavelle Road", lat: 12.9719, lng: 77.5978 },
      ],
    },
    {
      city: "Delhi NCR",
      lat: 28.6139,
      lng: 77.209,
      areas: [
        "Cyber City & DLF Phase 2 (Gurugram)",
        "Golf Course Road & Sector 54",
        "Connaught Place & Barakhamba",
        "Aerocity & Worldmark Towers",
        "Noida Sector 62 & 126 Tech Corridor",
      ],
      area_details: [
        { name: "Cyber City & DLF Phase 2 (Gurugram)", lat: 28.4952, lng: 77.0895 },
        { name: "Golf Course Road & Sector 54", lat: 28.4595, lng: 77.0988 },
        { name: "Connaught Place & Barakhamba", lat: 28.6315, lng: 77.2167 },
        { name: "Aerocity & Worldmark Towers", lat: 28.5494, lng: 77.1211 },
        { name: "Noida Sector 62 & 126 Tech Corridor", lat: 28.6258, lng: 77.3688 },
      ],
    },
    {
      city: "Hyderabad",
      lat: 17.385,
      lng: 78.4867,
      areas: [
        "Hitec City & Madhapur",
        "Gachibowli & Financial District",
        "Jubilee Hills & Banjara Hills Road 36",
      ],
      area_details: [
        { name: "Hitec City & Madhapur", lat: 17.4474, lng: 78.3762 },
        { name: "Gachibowli & Financial District", lat: 17.4401, lng: 78.3489 },
        { name: "Jubilee Hills & Banjara Hills Road 36", lat: 17.4326, lng: 78.4071 },
      ],
    },
    {
      city: "Pune",
      lat: 18.5204,
      lng: 73.8567,
      areas: [
        "Koregaon Park & Kalyani Nagar",
        "Baner & Balewadi High Street",
        "Viman Nagar & Kharadi IT Park",
      ],
      area_details: [
        { name: "Koregaon Park & Kalyani Nagar", lat: 18.5362, lng: 73.894 },
        { name: "Baner & Balewadi High Street", lat: 18.559, lng: 73.7868 },
        { name: "Viman Nagar & Kharadi IT Park", lat: 18.5679, lng: 73.9143 },
      ],
    },
    {
      city: "Goa",
      lat: 15.2993,
      lng: 74.124,
      areas: [
        "Candolim, Calangute & Anjuna Coastal Hub",
        "Panaji & Miramar Promenade",
      ],
      area_details: [
        { name: "Candolim, Calangute & Anjuna Coastal Hub", lat: 15.5186, lng: 73.7634 },
        { name: "Panaji & Miramar Promenade", lat: 15.4909, lng: 73.8278 },
      ],
    },
    {
      city: "International Hubs",
      lat: 25.2048,
      lng: 55.2708,
      areas: [
        "Downtown Dubai & Business Bay",
        "DIFC (Dubai Financial Centre)",
        "Singapore Marina Bay & Raffles Place",
        "London Mayfair & Soho",
      ],
      area_details: [
        { name: "Downtown Dubai & Business Bay", lat: 25.1867, lng: 55.2655 },
        { name: "DIFC (Dubai Financial Centre)", lat: 25.2104, lng: 55.2818 },
        { name: "Singapore Marina Bay & Raffles Place", lat: 1.2847, lng: 103.861 },
        { name: "London Mayfair & Soho", lat: 51.5113, lng: -0.1444 },
      ],
    },
  ];

  const niches = [
    "Graphic Designing & Brand Identity",
    "Website Development & Web Apps",
    "Search Engine Optimization (SEO) & Google 3-Pack",
    "D2C Brands & Consumer Goods",
    "Real Estate & Luxury Living",
    "Fine Dining, Cafes & Luxury Hospitality",
    "Aesthetic Clinics, Dermatology & Healthcare",
    "Tech Startups, SaaS & AI Ventures",
    "Luxury Retail & Designer Fashion",
  ];

  return NextResponse.json({
    data: { regions, niches },
    meta: { timestamp: new Date().toISOString() },
    error: null,
  });
}
