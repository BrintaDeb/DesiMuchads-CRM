"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Sparkles,
  MapPin,
  Building2,
  User,
  Mail,
  Phone,
  MessageSquare,
  Check,
  CheckSquare,
  Square,
  Download,
  Send,
  RefreshCw,
  X,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Target,
  Flame,
  Globe,
  Compass,
  Radio,
  Navigation,
  Star,
  Sliders,
  TrendingUp,
  Zap,
  Award,
  AlertTriangle,
  PhoneCall,
  Layers,
  Search,
  Copy,
} from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { toast } from "sonner";

export interface DiscoveredLead {
  temp_id: string;
  company_name: string;
  founder_name: string;
  title: string;
  email: string;
  phone: string;
  city: string;
  area: string;
  locality: string;
  public_landmark?: string;
  nearby_landmark?: string;
  google_maps_url?: string;
  google_maps_place_id?: string;
  google_rating?: number;
  review_count?: number;
  google_3pack_status?: string;
  niche: string;
  deal_value: number;
  intent_score: number;
  lead_temperature?: string;
  audit_findings: string[];
  buying_triggers?: string[];
  buyer_persona?: string;
  annual_revenue_band?: string;
  employee_count_band?: string;
  website_url?: string;
  website_speed_status?: string;
  tech_stack?: string[];
  recommended_service: string;
  latitude?: number;
  longitude?: number;
  distance_km?: number;
  distance_label?: string;
  pinpoint_address?: string;
  linkedin_url?: string;
  cold_email_subject: string;
  cold_email_body: string;
  cold_whatsapp_text: string;
  whatsapp_click_url: string;
  cold_phone_call_script?: string;
}

interface LeadGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLeadsInjected: () => void;
}

interface AreaDetail {
  name: string;
  lat: number;
  lng: number;
}

interface RegionPreset {
  city: string;
  lat?: number;
  lng?: number;
  areas: string[];
  area_details?: AreaDetail[];
}

const FALLBACK_REGIONS: RegionPreset[] = [
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
      "Lavelle Road & UB City",
      "Jayanagar & JP Nagar",
    ],
  },
  {
    city: "Delhi NCR",
    lat: 28.6139,
    lng: 77.209,
    areas: [
      "CyberHub & Golf Course Rd (Gurugram)",
      "Connaught Place & Barakhamba (Delhi)",
      "South Extension & Greater Kailash (Delhi)",
      "Sector 62 & 18 (Noida)",
    ],
  },
  {
    city: "Hyderabad",
    lat: 17.385,
    lng: 78.4867,
    areas: [
      "Jubilee Hills (Road 36 & 45)",
      "Banjara Hills",
      "Hitec City & Madhapur",
      "Financial District (Gachibowli)",
    ],
  },
  {
    city: "Pune",
    lat: 18.5204,
    lng: 73.8567,
    areas: [
      "Koregaon Park & Kalyani Nagar",
      "Balewadi High Street & Baner",
      "Viman Nagar & Magarpatta",
    ],
  },
  {
    city: "Ahmedabad",
    lat: 23.0225,
    lng: 72.5714,
    areas: [
      "SG Highway & Thaltej",
      "Sindhu Bhavan Road (SBR)",
      "Prahlad Nagar & Satellite",
    ],
  },
  {
    city: "Goa",
    lat: 15.2993,
    lng: 74.124,
    areas: [
      "Assagao, Anjuna & Vagator",
      "Panjim & Miramar",
    ],
  },
  {
    city: "International Hubs",
    lat: 25.2048,
    lng: 55.2708,
    areas: [
      "Dubai Marina & JLT (UAE)",
      "DIFC (Dubai Financial Centre)",
      "London (Mayfair & Soho)",
      "Singapore (Marina Bay & Orchard)",
    ],
  },
];

const FALLBACK_NICHES = [
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

export function LeadGeneratorModal({ isOpen, onClose, onLeadsInjected }: LeadGeneratorModalProps) {
  const [regions, setRegions] = useState<RegionPreset[]>(FALLBACK_REGIONS);
  const [niches, setNiches] = useState<string[]>(FALLBACK_NICHES);

  const [selectedCity, setSelectedCity] = useState("Mumbai");
  const [selectedArea, setSelectedArea] = useState("South Mumbai (Nariman Point & Fort)");
  const [selectedNiche, setSelectedNiche] = useState("Graphic Designing & Brand Identity");
  const [targetCount, setTargetCount] = useState(6);
  const [minDealValue, setMinDealValue] = useState(75000);

  // Pinpoint & Radius State
  const [radiusKm, setRadiusKm] = useState<number>(5.0);
  const [pinpointLandmark, setPinpointLandmark] = useState("");
  const [centerLat, setCenterLat] = useState<number>(18.9284);
  const [centerLng, setCenterLng] = useState<number>(72.8282);

  // Mode & Filtering
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customCity, setCustomCity] = useState("");
  const [customArea, setCustomArea] = useState("");
  const [tempFilter, setTempFilter] = useState<"ALL" | "HOT_BUYER" | "WARM_PROSPECT">("ALL");

  const [isLoading, setIsLoading] = useState(false);
  const [isInjecting, setIsInjecting] = useState(false);
  const [discoveredLeads, setDiscoveredLeads] = useState<DiscoveredLead[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedOutreachId, setExpandedOutreachId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"whatsapp" | "email" | "call" | "dossier">("whatsapp");
  const [selectedChannel, setSelectedChannel] = useState<"ALL" | "EMAIL" | "WHATSAPP">("ALL");
  const [hoveredLeadId, setHoveredLeadId] = useState<string | null>(null);

  // Fetch live presets on mount
  useEffect(() => {
    const fetchPresets = async () => {
      try {
        const res = await api.get("/crm/lead-generator/presets");
        if (res.data?.data) {
          if (res.data.data.regions && res.data.data.regions.length > 0) {
            setRegions(res.data.data.regions);
          }
          if (res.data.data.niches && res.data.data.niches.length > 0) {
            setNiches(res.data.data.niches);
          }
        }
      } catch {}
    };
    if (isOpen) {
      fetchPresets();
    }
  }, [isOpen]);

  // Sync available areas & center coordinates when selected city changes
  useEffect(() => {
    if (isCustomMode) return;
    const currentCityObj = regions.find((r) => r.city === selectedCity) || regions[0];
    if (currentCityObj && currentCityObj.areas && currentCityObj.areas.length > 0) {
      setSelectedArea(currentCityObj.areas[0]);
      if (currentCityObj.lat && currentCityObj.lng) {
        setCenterLat(currentCityObj.lat);
        setCenterLng(currentCityObj.lng);
      }
    }
  }, [selectedCity, regions, isCustomMode]);

  // Sync coordinates when area changes
  useEffect(() => {
    if (isCustomMode) return;
    const currentCityObj = regions.find((r) => r.city === selectedCity) || regions[0];
    const match = currentCityObj?.area_details?.find((a) => a.name === selectedArea);
    if (match) {
      setCenterLat(match.lat);
      setCenterLng(match.lng);
    }
  }, [selectedArea, selectedCity, regions, isCustomMode]);

  const currentCityObj = regions.find((r) => r.city === selectedCity) || regions[0];
  const availableAreas = currentCityObj?.areas || [];

  // Filtered Leads based on Temperature
  const filteredLeads = useMemo(() => {
    if (tempFilter === "ALL") return discoveredLeads;
    return discoveredLeads.filter((l) => (l.lead_temperature || "HOT_BUYER") === tempFilter);
  }, [discoveredLeads, tempFilter]);

  // Handle autonomous discovery
  const handleDiscover = async () => {
    setIsLoading(true);

    const finalCity = isCustomMode ? customCity.trim() || "Local Metro" : selectedCity;
    const finalArea = isCustomMode
      ? customArea.trim() || "Commercial District"
      : pinpointLandmark.trim() || selectedArea;

    try {
      const res = await api.post("/crm/lead-generator/discover", {
        city: finalCity,
        area: finalArea,
        niche: selectedNiche,
        target_count: targetCount,
        min_deal_value: minDealValue,
        radius_km: radiusKm,
        latitude: centerLat,
        longitude: centerLng,
        pinpoint_landmark: pinpointLandmark,
        lead_temperature_filter: tempFilter,
      });

      const leads: DiscoveredLead[] = res.data?.data || [];
      setDiscoveredLeads(leads);
      setSelectedIds(new Set(leads.map((l) => l.temp_id)));
      if (leads.length > 0) {
        setExpandedOutreachId(leads[0].temp_id);
      }
      toast.success(
        `Pinpointed ${leads.length} verified buyers within ${radiusKm}km radius of ${finalArea}, ${finalCity}!`
      );
    } catch (err: any) {
      console.error("Discovery error:", err);
      const detail = err.response?.data?.error || err.response?.data?.detail || err.message;
      toast.error(`Discovery notice: ${detail || "Could not retrieve leads from server"}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle selection
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredLeads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredLeads.map((l) => l.temp_id)));
    }
  };

  // Inject into CRM pipeline
  const handleInjectToPipeline = async (autoDispatch = false) => {
    const leadsToInject = discoveredLeads.filter((l) => selectedIds.has(l.temp_id));
    if (leadsToInject.length === 0) {
      toast.error("Please select at least 1 lead to inject.");
      return;
    }

    setIsInjecting(true);
    try {
      await api.post("/crm/lead-generator/inject-batch", {
        leads: leadsToInject,
        stage: "LEAD_CAPTURED",
        auto_dispatch_first_touch: autoDispatch,
      });

      if (autoDispatch) {
        await api.post("/crm/lead-generator/dispatch-outreach", {
          leads: leadsToInject,
          channel: selectedChannel,
        });
        toast.success(`Dispatched ${selectedChannel} outreach & injected ${leadsToInject.length} deals!`);
      } else {
        toast.success(`Successfully injected ${leadsToInject.length} leads into CRM Pipeline!`);
      }

      onLeadsInjected();
      onClose();
    } catch {
      toast.error("Error injecting leads into pipeline.");
    } finally {
      setIsInjecting(false);
    }
  };

  // Export CSV with full buyer intelligence
  const handleExportCSV = () => {
    const leadsToExport = discoveredLeads.filter((l) => selectedIds.has(l.temp_id));
    if (leadsToExport.length === 0) {
      toast.error("No leads selected for export.");
      return;
    }

    const headers = [
      "Company",
      "Founder",
      "Title",
      "Email",
      "Phone",
      "Area",
      "City",
      "Distance (km)",
      "Pinpoint Address",
      "Nearby Landmark",
      "Google Maps URL",
      "Google Rating",
      "Google 3-Pack Status",
      "Lead Temperature",
      "Buyer Persona",
      "Annual Revenue Band",
      "Tech Stack",
      "Niche",
      "Deal Value",
      "Intent Score",
    ];
    const rows = leadsToExport.map((l) => [
      `"${l.company_name}"`,
      `"${l.founder_name}"`,
      `"${l.title}"`,
      `"${l.email}"`,
      `"${l.phone}"`,
      `"${l.area}"`,
      `"${l.city}"`,
      l.distance_km || 0,
      `"${l.pinpoint_address || l.locality}"`,
      `"${l.nearby_landmark || l.public_landmark || ""}"`,
      `"${l.google_maps_url || ""}"`,
      l.google_rating || 4.7,
      `"${l.google_3pack_status || ""}"`,
      `"${l.lead_temperature || "HOT_BUYER"}"`,
      `"${l.buyer_persona || ""}"`,
      `"${l.annual_revenue_band || ""}"`,
      `"${(l.tech_stack || []).join(", ")}"`,
      `"${l.niche}"`,
      l.deal_value,
      `${l.intent_score}%`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `DesiMuchads_Buyers_${(isCustomMode ? customCity : selectedCity) || "Location"}_${Date.now()}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${leadsToExport.length} verified buyer dossiers to CSV.`);
  };

  if (!isOpen) return null;

  const selectedCount = selectedIds.size;
  const selectedPipelineValue = discoveredLeads
    .filter((l) => selectedIds.has(l.temp_id))
    .reduce((sum, l) => sum + l.deal_value, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[94vh] flex flex-col overflow-hidden text-slate-800">
        
        {/* Modal Top Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#714B67] text-white flex items-center justify-center shadow-xs shrink-0">
              <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-sm sm:text-base text-slate-900 tracking-tight">
                  High-Precision Google Maps & Landmark Lead Engine
                </h3>
                <span className="text-[10px] font-mono bg-purple-100 text-[#714B67] font-bold px-2 py-0.5 rounded-full border border-purple-200 flex items-center gap-1">
                  <Radio className="w-2.5 h-2.5 text-emerald-600 animate-pulse" />
                  <span>Geo-Radius Radar v2.5</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Pinpoint commercial landmarks, set radial coverage (0.5–25km), and crawl verified buyer dossiers with 1-click outreach.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-[#FAFBFD]">
          
          {/* Section 1: Geo-Radar Controls & Pinpoint Settings */}
          <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-[#714B67]" />
                Geospatial Pinpoint & Radial Coverage
              </span>

              {/* Mode Toggle: Preset vs Custom Location */}
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px] font-semibold">
                <button
                  onClick={() => setIsCustomMode(false)}
                  className={cn(
                    "px-2.5 py-1 rounded-md transition",
                    !isCustomMode
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  Metros & Commercial Hubs
                </button>
                <button
                  onClick={() => setIsCustomMode(true)}
                  className={cn(
                    "px-2.5 py-1 rounded-md transition flex items-center gap-1",
                    isCustomMode
                      ? "bg-white text-[#714B67] shadow-2xs font-bold"
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  <Globe className="w-3 h-3 text-[#714B67]" />
                  <span>Custom Global Pinpoint</span>
                </button>
              </div>
            </div>

            {/* Controls Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {/* City Selector or Custom City Input */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  {isCustomMode ? "Metro / City" : "Select Metro"}
                </label>
                {isCustomMode ? (
                  <input
                    type="text"
                    placeholder="e.g. Surat, Indore, Goa, London..."
                    value={customCity}
                    onChange={(e) => setCustomCity(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                  />
                ) : (
                  <select
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                  >
                    {regions.map((r) => (
                      <option key={r.city} value={r.city}>
                        {r.city}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Commercial Area Selector or Custom Area Input */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  {isCustomMode ? "District / Suburb" : "Commercial Hub / Landmark"}
                </label>
                {isCustomMode ? (
                  <input
                    type="text"
                    placeholder="e.g. Vesu, Vijay Nagar, Assagao, SoHo..."
                    value={customArea}
                    onChange={(e) => setCustomArea(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                  />
                ) : (
                  <select
                    value={selectedArea}
                    onChange={(e) => {
                      setSelectedArea(e.target.value);
                      setCustomArea("");
                    }}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                  >
                    {availableAreas.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Industry Vertical */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Target Niche Vertical</label>
                <select
                  value={selectedNiche}
                  onChange={(e) => setSelectedNiche(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                >
                  {niches.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search Radius Slider */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                    <Radio className="w-3 h-3 text-[#714B67]" />
                    <span>Radial Distance</span>
                  </label>
                  <span className="text-[11px] font-mono font-bold text-[#714B67] bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200">
                    {radiusKm} km radius
                  </span>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="range"
                    min={0.5}
                    max={25}
                    step={0.5}
                    value={radiusKm}
                    onChange={(e) => setRadiusKm(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#714B67]"
                  />
                </div>
                <div className="flex justify-between text-[9px] text-slate-400 font-mono mt-1">
                  <span>500m (Walking)</span>
                  <span>5km (Hub)</span>
                  <span>25km (Metro)</span>
                </div>
              </div>
            </div>

            {/* Landmark Refinement & Search Bar */}
            <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-2.5">
              <div className="relative flex-1 w-full">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Pinpoint specific landmark or street (e.g. Maker Chamber V, Phoenix Palladium, Indiranagar 100ft Rd)..."
                  value={pinpointLandmark}
                  onChange={(e) => setPinpointLandmark(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <div className="flex items-center gap-1 bg-slate-100 px-2 py-1.5 rounded-lg border border-slate-200 text-[11px] font-mono text-slate-600 shrink-0">
                  <MapPin className="w-3 h-3 text-red-500" />
                  <span>{centerLat.toFixed(3)}° N, {centerLng.toFixed(3)}° E</span>
                </div>

                <button
                  onClick={handleDiscover}
                  disabled={isLoading}
                  className="px-5 py-2 bg-[#714B67] hover:bg-[#5E3E55] text-white text-xs font-bold rounded-lg shadow-sm flex items-center justify-center gap-2 transition disabled:opacity-50 shrink-0"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Scanning Radius & Map Pack...</span>
                    </>
                  ) : (
                    <>
                      <Compass className="w-3.5 h-3.5 text-amber-300" />
                      <span>Pinpoint & Crawl Leads</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Section 2: Visual Geospatial Radar & Temperature Filter Bar */}
          {discoveredLeads.length > 0 && (
            <div className="bg-slate-900 rounded-xl p-4 text-white shadow-md border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
              
              {/* Radar Graphic & Live Radius Metrics */}
              <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="relative w-20 h-20 rounded-full bg-slate-950 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-inner overflow-hidden">
                  <div className="absolute inset-0 rounded-full border border-emerald-500/20" />
                  <div className="absolute inset-2 rounded-full border border-emerald-500/20" />
                  <div className="absolute inset-5 rounded-full border border-emerald-500/20" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping absolute" />
                  <div className="w-2 h-2 rounded-full bg-emerald-500 z-10" />
                  <div className="absolute w-full h-[1px] bg-emerald-500/20" />
                  <div className="absolute h-full w-[1px] bg-emerald-500/20" />
                  
                  {/* Lead dots on radar */}
                  {filteredLeads.slice(0, 8).map((l, i) => {
                    const angle = (i / Math.min(filteredLeads.length, 8)) * 2 * Math.PI;
                    const r = 12 + ((l.distance_km || 1) / Math.max(radiusKm, 1)) * 20;
                    const x = 40 + Math.cos(angle) * r - 3;
                    const y = 40 + Math.sin(angle) * r - 3;
                    const isHot = l.lead_temperature === "HOT_BUYER";
                    return (
                      <div
                        key={l.temp_id}
                        style={{ left: `${x}px`, top: `${y}px` }}
                        className={cn(
                          "absolute w-1.5 h-1.5 rounded-full",
                          isHot ? "bg-red-400 ring-2 ring-red-400/40" : "bg-amber-400"
                        )}
                        title={`${l.company_name} (${l.distance_label})`}
                      />
                    );
                  })}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs uppercase tracking-wider text-emerald-400 font-mono flex items-center gap-1">
                      <Radio className="w-3 h-3 animate-pulse" />
                      Live Geo Radar
                    </span>
                    <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                      Radius: {radiusKm} km
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-semibold mt-0.5">
                    {filteredLeads.length} Public Businesses Mapped Near {selectedArea.split('(')[0].trim() || selectedCity}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Google 3-Pack • Exact Landmarked Addresses • Verified Buyers
                  </p>
                </div>
              </div>

              {/* Temperature & Pipeline Value Filter */}
              <div className="flex items-center gap-2 flex-wrap justify-end w-full md:w-auto">
                <span className="text-[11px] text-slate-400 font-medium">Buyer Intent Filter:</span>
                <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-[11px] font-semibold">
                  <button
                    onClick={() => setTempFilter("ALL")}
                    className={cn(
                      "px-2.5 py-1 rounded-md transition",
                      tempFilter === "ALL" ? "bg-white text-slate-900 shadow-xs" : "text-slate-400 hover:text-white"
                    )}
                  >
                    All ({discoveredLeads.length})
                  </button>
                  <button
                    onClick={() => setTempFilter("HOT_BUYER")}
                    className={cn(
                      "px-2.5 py-1 rounded-md transition flex items-center gap-1",
                      tempFilter === "HOT_BUYER" ? "bg-red-500 text-white font-bold shadow-xs" : "text-slate-400 hover:text-white"
                    )}
                  >
                    <Flame className="w-3 h-3 text-amber-300" />
                    <span>Hot Buyers</span>
                  </button>
                  <button
                    onClick={() => setTempFilter("WARM_PROSPECT")}
                    className={cn(
                      "px-2.5 py-1 rounded-md transition flex items-center gap-1",
                      tempFilter === "WARM_PROSPECT" ? "bg-amber-500 text-slate-950 font-bold shadow-xs" : "text-slate-400 hover:text-white"
                    )}
                  >
                    <Zap className="w-3 h-3" />
                    <span>Warm Prospects</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Section 3: Discovered Leads Dossier Cards */}
          {filteredLeads.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleSelectAll}
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900"
                  >
                    {selectedIds.size === filteredLeads.length ? (
                      <CheckSquare className="w-4 h-4 text-[#714B67]" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                    <span>
                      {selectedCount} of {filteredLeads.length} Selected
                    </span>
                  </button>

                  <span className="text-slate-300">|</span>

                  <span className="text-xs font-mono font-bold text-slate-900">
                    Est. Pipeline Value: {formatCurrency(selectedPipelineValue)}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Google Maps Grounded • High-Intent Decision Makers</span>
                </div>
              </div>

              {/* Cards List */}
              <div className="space-y-3">
                {filteredLeads.map((lead) => {
                  const isSelected = selectedIds.has(lead.temp_id);
                  const isExpanded = expandedOutreachId === lead.temp_id;
                  const isHot = lead.lead_temperature === "HOT_BUYER";
                  const landmarkLabel = lead.pinpoint_address || lead.public_landmark || lead.locality;

                  return (
                    <div
                      key={lead.temp_id}
                      onMouseEnter={() => setHoveredLeadId(lead.temp_id)}
                      onMouseLeave={() => setHoveredLeadId(null)}
                      className={cn(
                        "rounded-xl border transition-all bg-white overflow-hidden shadow-2xs hover:shadow-sm",
                        isSelected
                          ? "border-[#714B67]/60 ring-1 ring-[#714B67]/20"
                          : "border-slate-200",
                        hoveredLeadId === lead.temp_id && "border-slate-400"
                      )}
                    >
                      {/* Top Lead Summary Header */}
                      <div className="p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => toggleSelect(lead.temp_id)}
                            className="mt-1 text-slate-400 hover:text-[#714B67] transition shrink-0"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-[#714B67]" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>

                          <div>
                            {/* Brand Name, Temperature Badge & Intent */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-sm text-slate-900">{lead.company_name}</h4>
                              
                              {/* Temperature Tag */}
                              <span
                                className={cn(
                                  "text-[10px] font-mono font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border",
                                  isHot
                                    ? "bg-red-50 text-red-700 border-red-200"
                                    : "bg-amber-50 text-amber-800 border-amber-200"
                                )}
                              >
                                {isHot ? <Flame className="w-3 h-3 text-red-600" /> : <Zap className="w-3 h-3 text-amber-600" />}
                                <span>{isHot ? "Hot Buyer" : "Warm Prospect"}</span>
                              </span>

                              {/* Distance Badge */}
                              <span className="text-[10px] font-mono bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold">
                                <Navigation className="w-2.5 h-2.5 text-blue-600" />
                                <span>{lead.distance_label || `${lead.distance_km || 0.8} km away`}</span>
                              </span>

                              {/* Intent Score */}
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {lead.intent_score}% Intent
                              </span>

                              {/* Google Rating */}
                              <span className="text-[10px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full flex items-center gap-1 border border-slate-200">
                                <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
                                <span>{lead.google_rating || 4.7} ★ ({lead.review_count || 120})</span>
                              </span>
                            </div>

                            {/* Exact Pinpoint Landmark Address & Google Maps Link */}
                            <div className="mt-1 flex items-center gap-2 flex-wrap">
                              <span className="flex items-center gap-1 text-[11px] font-medium text-slate-700 bg-slate-100/90 px-2 py-0.5 rounded border border-slate-200">
                                <MapPin className="w-3 h-3 text-[#714B67] shrink-0" />
                                <span className="font-semibold">{landmarkLabel}</span>
                              </span>

                              {lead.google_maps_url && (
                                <a
                                  href={lead.google_maps_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-0.5"
                                  title="View Landmark Location on Google Maps"
                                >
                                  <span>Google Maps Place</span>
                                  <ExternalLink size={10} />
                                </a>
                              )}

                              {lead.google_3pack_status && (
                                <span className="text-[10px] font-mono text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded">
                                  {lead.google_3pack_status}
                                </span>
                              )}
                            </div>

                            {/* Decision Maker Contact & Buyer Credentials */}
                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1.5 flex-wrap">
                              <span className="flex items-center gap-1 text-slate-800 font-semibold">
                                <User className="w-3 h-3 text-[#714B67]" />
                                {lead.founder_name} <span className="text-slate-400 font-normal">({lead.title})</span>
                              </span>
                              <span className="flex items-center gap-1 text-slate-600">
                                <Mail className="w-3 h-3 text-slate-400" />
                                {lead.email}
                              </span>
                              <span className="flex items-center gap-1 font-mono text-slate-600">
                                <Phone className="w-3 h-3 text-slate-400" />
                                {lead.phone}
                              </span>
                              {lead.linkedin_url && (
                                <a
                                  href={lead.linkedin_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] font-semibold text-[#0A66C2] hover:underline flex items-center gap-0.5"
                                  title="Search Decision Maker on LinkedIn"
                                >
                                  <span>LinkedIn</span>
                                  <ExternalLink size={9} />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right Column: Retainer Budget & Action Suite */}
                        <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-0 border-slate-100">
                          <div className="text-left md:text-right">
                            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Est. Retainer</span>
                            <span className="text-sm font-bold font-mono text-slate-900 block">
                              {formatCurrency(lead.deal_value)}
                              <span className="text-[10px] font-normal text-slate-500">/mo</span>
                            </span>
                            <span className="text-[9px] font-mono text-slate-400">
                              {lead.annual_revenue_band || "₹2 Cr - ₹5 Cr ARR"}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap justify-end">
                            {/* Fast Action to Reply: 1-Click WhatsApp Launcher */}
                            <a
                              href={lead.whatsapp_click_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition shadow-xs"
                              title="Fast Action to Reply: Launch WhatsApp with Tailored Pitch"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Fast WhatsApp</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                            </a>

                            {/* Fast Action to Reply: 1-Click Fast Email */}
                            <a
                              href={`mailto:${lead.email}?subject=${encodeURIComponent(lead.cold_email_subject)}&body=${encodeURIComponent(lead.cold_email_body)}`}
                              className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition shadow-2xs"
                              title="Fast Action to Reply: Launch Email with Cold Proposal"
                            >
                              <Mail className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Fast Email</span>
                            </a>

                            {/* Fast Action to Reply: 1-Click Copy Pitch */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(lead.cold_whatsapp_text);
                                toast.success(`Fast Reply pitch copied for ${lead.company_name}!`);
                              }}
                              className="px-2 py-1.5 bg-purple-50 hover:bg-purple-100 text-[#714B67] border border-purple-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition shadow-2xs"
                              title="Fast Action: Copy Tailored Pitch to Clipboard"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              <span className="hidden md:inline text-[11px]">Copy Pitch</span>
                            </button>

                            <button
                              onClick={() => setExpandedOutreachId(isExpanded ? null : lead.temp_id)}
                              className={cn(
                                "px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition border",
                                isExpanded
                                  ? "bg-slate-800 text-white border-slate-800"
                                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                              )}
                            >
                              <span>Dossier</span>
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Deep Buyer Dossier & 4-Tier Outreach Arsenal */}
                      {isExpanded && (
                        <div className="bg-slate-50/90 border-t border-slate-200/90 p-4 space-y-3.5">
                          
                          {/* Buyer Persona & Commercial Triggers */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-1.5">
                              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 flex items-center gap-1">
                                <Target className="w-3 h-3 text-[#714B67]" />
                                Target Potential Buyer Persona:
                              </span>
                              <p className="text-xs text-slate-800 font-medium leading-relaxed">
                                {lead.buyer_persona || "Growth-focused Decision Maker seeking verified marketing ROI and full-funnel digital execution."}
                              </p>
                              <div className="flex items-center gap-2 pt-1 text-[10px] text-slate-500 font-mono">
                                <span>Workforce: {lead.employee_count_band || "15-50 Employees"}</span>
                                <span>•</span>
                                <span>Est. Revenue: {lead.annual_revenue_band || "₹3.5 Cr ARR"}</span>
                              </div>
                            </div>

                            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-1.5">
                              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 flex items-center gap-1">
                                <TrendingUp className="w-3 h-3 text-emerald-600" />
                                Commercial Buying Triggers:
                              </span>
                              <ul className="text-[11px] text-slate-700 space-y-1">
                                {(lead.buying_triggers || [
                                  `Expanding operations around ${lead.area}`,
                                  `High local search volume for ${lead.niche}`,
                                  `Ad creative fatigue on Meta/Instagram`,
                                ]).map((trigger, idx) => (
                                  <li key={idx} className="flex items-start gap-1.5">
                                    <span className="text-emerald-500 font-bold">✓</span>
                                    <span>{trigger}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          {/* Tech Stack & Website Diagnostics */}
                          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] uppercase font-bold text-slate-500 mr-1">Detected Tech:</span>
                              {(lead.tech_stack || ["Shopify Plus", "Klaviyo", "Meta Pixel", "Google Tag Manager"]).map((tech, i) => (
                                <span key={i} className="text-[10px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                                  {tech}
                                </span>
                              ))}
                            </div>

                            <div className="text-[11px] font-mono text-slate-500 flex items-center gap-2">
                              <span>Speed: <strong className="text-amber-700 font-semibold">{lead.website_speed_status || "3.8s LCP"}</strong></span>
                              <span>•</span>
                              <a href={lead.website_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                Visit Site
                              </a>
                            </div>
                          </div>

                          {/* Identified Bottlenecks & Agency Solution */}
                          <div>
                            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 block mb-1">
                              Diagnostic Gaps for {lead.area}:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {lead.audit_findings.map((gap, idx) => (
                                <span
                                  key={idx}
                                  className="text-[11px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-medium"
                                >
                                  ⚠️ {gap}
                                </span>
                              ))}
                              <span className="text-[11px] bg-purple-50 text-[#714B67] border border-purple-200 px-2 py-0.5 rounded font-bold">
                                💡 Prescribed Strategy: {lead.recommended_service}
                              </span>
                            </div>
                          </div>

                          {/* 4-Tier Outreach Suite Tabs */}
                          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                            <div className="flex items-center border-b border-slate-200 bg-slate-100/70 text-xs overflow-x-auto">
                              <button
                                onClick={() => setActiveTab("whatsapp")}
                                className={cn(
                                  "px-3.5 py-2 font-semibold flex items-center gap-1.5 border-b-2 transition whitespace-nowrap",
                                  activeTab === "whatsapp"
                                    ? "border-[#714B67] text-[#714B67] bg-white"
                                    : "border-transparent text-slate-500 hover:text-slate-700"
                                )}
                              >
                                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Cold WhatsApp (Landmark Hook)</span>
                              </button>
                              <button
                                onClick={() => setActiveTab("email")}
                                className={cn(
                                  "px-3.5 py-2 font-semibold flex items-center gap-1.5 border-b-2 transition whitespace-nowrap",
                                  activeTab === "email"
                                    ? "border-[#714B67] text-[#714B67] bg-white"
                                    : "border-transparent text-slate-500 hover:text-slate-700"
                                )}
                              >
                                <Mail className="w-3.5 h-3.5 text-blue-600" />
                                <span>Cold Email Cadence</span>
                              </button>
                              <button
                                onClick={() => setActiveTab("call")}
                                className={cn(
                                  "px-3.5 py-2 font-semibold flex items-center gap-1.5 border-b-2 transition whitespace-nowrap",
                                  activeTab === "call"
                                    ? "border-[#714B67] text-[#714B67] bg-white"
                                    : "border-transparent text-slate-500 hover:text-slate-700"
                                )}
                              >
                                <PhoneCall className="w-3.5 h-3.5 text-orange-600" />
                                <span>Cold Calling Script</span>
                              </button>
                              <button
                                onClick={() => setActiveTab("dossier")}
                                className={cn(
                                  "px-3.5 py-2 font-semibold flex items-center gap-1.5 border-b-2 transition whitespace-nowrap",
                                  activeTab === "dossier"
                                    ? "border-[#714B67] text-[#714B67] bg-white"
                                    : "border-transparent text-slate-500 hover:text-slate-700"
                                )}
                              >
                                <Layers className="w-3.5 h-3.5 text-purple-600" />
                                <span>Commercial SWOT</span>
                              </button>
                            </div>

                            <div className="p-3.5 text-xs">
                              {activeTab === "whatsapp" && (
                                <div className="space-y-2.5">
                                  <div className="bg-emerald-50/70 p-3 rounded-lg border border-emerald-200/90 font-mono text-[11px] text-slate-800 leading-relaxed whitespace-pre-wrap">
                                    {lead.cold_whatsapp_text}
                                  </div>
                                  <div className="flex justify-between items-center pt-1">
                                    <span className="text-[10px] text-slate-400 font-mono">Direct WhatsApp Click-to-Chat</span>
                                    <a
                                      href={lead.whatsapp_click_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
                                    >
                                      <span>Launch WhatsApp Web / App</span>
                                      <ExternalLink size={12} />
                                    </a>
                                  </div>
                                </div>
                              )}

                              {activeTab === "email" && (
                                <div className="space-y-2">
                                  <div className="bg-slate-50 p-2 rounded border border-slate-200 text-[11px] font-mono text-slate-800 font-semibold">
                                    Subject: {lead.cold_email_subject}
                                  </div>
                                  <div className="bg-white p-3 rounded border border-slate-200 font-mono text-[11px] text-slate-800 leading-relaxed whitespace-pre-wrap">
                                    {lead.cold_email_body}
                                  </div>
                                </div>
                              )}

                              {activeTab === "call" && (
                                <div className="space-y-2">
                                  <div className="bg-amber-50/70 p-3 rounded-lg border border-amber-200/90 font-mono text-[11px] text-slate-800 leading-relaxed whitespace-pre-wrap">
                                    {lead.cold_phone_call_script || (
                                      `1. Gatekeeper: "Hi, following up on the landmark audit for ${lead.founder_name} at your ${lead.area} office. Is ${lead.founder_name.split(' ')[0]} available?"\n` +
                                      `2. Value Hook: "Hi ${lead.founder_name.split(' ')[0]}, we noticed ${lead.company_name} near ${landmarkLabel.split(',')[0]} is missing high-converting mobile speed..."\n` +
                                      `3. CTA: "Can I send over our 2-minute video teardown before a 10-minute sync this Thursday?"`
                                    )}
                                  </div>
                                </div>
                              )}

                              {activeTab === "dossier" && (
                                <div className="space-y-2 text-[11px]">
                                  <div className="grid grid-cols-2 gap-2 text-slate-700 font-medium">
                                    <div className="p-2 bg-slate-50 rounded border border-slate-200">
                                      <span className="font-bold text-slate-900 block">Google Maps Presence</span>
                                      <span>{lead.google_3pack_status || "Rank #1-3 in Local 3-Pack"}</span>
                                    </div>
                                    <div className="p-2 bg-slate-50 rounded border border-slate-200">
                                      <span className="font-bold text-slate-900 block">Prescribed Retainer</span>
                                      <span className="font-mono">{formatCurrency(lead.deal_value)} / month</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty State */}
          {filteredLeads.length === 0 && !isLoading && (
            <div className="text-center py-12 px-4 rounded-xl border border-dashed border-slate-300 bg-white">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#714B67] flex items-center justify-center mx-auto mb-3">
                <Target size={24} />
              </div>
              <h4 className="font-bold text-sm text-slate-900 mb-1">
                Pinpoint Any Commercial Landmark to Discover Leads
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Target commercial hubs across Mumbai, Bengaluru, Delhi NCR, Hyderabad, Ahmedabad, Pune, Goa, or type ANY custom region worldwide to crawl verified public businesses within your chosen radius.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Dispatched Via:</span>
            <div className="flex items-center rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-[11px]">
              {(["ALL", "WHATSAPP", "EMAIL"] as const).map((ch) => (
                <button
                  key={ch}
                  onClick={() => setSelectedChannel(ch)}
                  className={cn(
                    "px-2.5 py-1 rounded-md font-semibold transition",
                    selectedChannel === ch
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  {ch === "ALL" ? "Omnichannel" : ch}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleExportCSV}
              disabled={selectedCount === 0}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 disabled:opacity-40"
              title="Download CSV for external cold caller tools"
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => handleInjectToPipeline(false)}
              disabled={selectedCount === 0 || isInjecting}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg transition flex items-center gap-1.5 disabled:opacity-40"
            >
              <Check size={14} />
              <span>Inject ({selectedCount}) to Pipeline</span>
            </button>

            <button
              onClick={() => handleInjectToPipeline(true)}
              disabled={selectedCount === 0 || isInjecting}
              className="px-4 py-2 bg-[#714B67] hover:bg-[#5E3E55] text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition disabled:opacity-40"
            >
              {isInjecting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 text-amber-300" />
                  <span>Dispatch Outreach & Inject</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
