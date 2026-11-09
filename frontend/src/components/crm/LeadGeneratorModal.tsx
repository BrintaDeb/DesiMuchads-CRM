"use client";

import React, { useState, useEffect } from "react";
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
  google_maps_url?: string;
  niche: string;
  deal_value: number;
  intent_score: number;
  audit_findings: string[];
  recommended_service: string;
  cold_email_subject: string;
  cold_email_body: string;
  cold_whatsapp_text: string;
  whatsapp_click_url: string;
}

interface LeadGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLeadsInjected: () => void;
}

interface RegionPreset {
  city: string;
  areas: string[];
}

const FALLBACK_REGIONS: RegionPreset[] = [
  {
    city: "Mumbai",
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
    areas: [
      "CyberHub & Golf Course Rd (Gurugram)",
      "Connaught Place & Barakhamba (Delhi)",
      "South Extension & Greater Kailash (Delhi)",
      "Sector 62 & 18 (Noida)",
    ],
  },
  {
    city: "Hyderabad",
    areas: [
      "Jubilee Hills (Road 36 & 45)",
      "Banjara Hills",
      "Hitec City & Madhapur",
      "Financial District (Gachibowli)",
    ],
  },
  {
    city: "Pune",
    areas: [
      "Koregaon Park & Kalyani Nagar",
      "Balewadi High Street & Baner",
      "Viman Nagar & Magarpatta",
    ],
  },
  {
    city: "Ahmedabad",
    areas: [
      "SG Highway & Thaltej",
      "Sindhu Bhavan Road (SBR)",
      "Prahlad Nagar & Satellite",
    ],
  },
  {
    city: "Kolkata",
    areas: [
      "Park Street & Camac Street",
      "Salt Lake Sector V & New Town",
    ],
  },
  {
    city: "Chennai",
    areas: [
      "Nungambakkam & Alwarpet",
      "OMR (Old Mahabalipuram Rd) & T. Nagar",
    ],
  },
  {
    city: "Jaipur",
    areas: [
      "C-Scheme & Civil Lines",
      "Malviya Nagar & Tonk Road",
    ],
  },
  {
    city: "Chandigarh",
    areas: [
      "Sector 17 & Sector 35",
      "IT Park & Industrial Area",
    ],
  },
  {
    city: "Goa",
    areas: [
      "Assagao, Anjuna & Vagator",
      "Panjim & Miramar",
    ],
  },
  {
    city: "International Hubs",
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

  // Custom city and area states for ANY place
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customCity, setCustomCity] = useState("");
  const [customArea, setCustomArea] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [isInjecting, setIsInjecting] = useState(false);
  const [discoveredLeads, setDiscoveredLeads] = useState<DiscoveredLead[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedOutreachId, setExpandedOutreachId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"email" | "whatsapp">("whatsapp");
  const [selectedChannel, setSelectedChannel] = useState<"ALL" | "EMAIL" | "WHATSAPP">("ALL");

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

  // Sync available areas when selected city changes
  useEffect(() => {
    if (isCustomMode) return;
    const currentCityObj = regions.find((r) => r.city === selectedCity) || regions[0];
    if (currentCityObj && currentCityObj.areas && currentCityObj.areas.length > 0) {
      setSelectedArea(currentCityObj.areas[0]);
    }
  }, [selectedCity, regions, isCustomMode]);

  const currentCityObj = regions.find((r) => r.city === selectedCity) || regions[0];
  const availableAreas = currentCityObj?.areas || [];

  // Handle autonomous discovery
  const handleDiscover = async () => {
    setIsLoading(true);

    const finalCity = isCustomMode ? customCity.trim() || "Local Metro" : selectedCity;
    const finalArea = isCustomMode
      ? customArea.trim() || "Commercial District"
      : customArea.trim() || selectedArea;

    try {
      const res = await api.post("/crm/lead-generator/discover", {
        city: finalCity,
        area: finalArea,
        niche: selectedNiche,
        target_count: targetCount,
        min_deal_value: minDealValue,
      });

      const leads: DiscoveredLead[] = res.data?.data || [];
      setDiscoveredLeads(leads);
      setSelectedIds(new Set(leads.map((l) => l.temp_id)));
      if (leads.length > 0) {
        setExpandedOutreachId(leads[0].temp_id);
      }
      toast.success(
        `Discovered ${leads.length} verified public businesses in ${finalArea}, ${finalCity}!`
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
    if (selectedIds.size === discoveredLeads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(discoveredLeads.map((l) => l.temp_id)));
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

  // Export CSV
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
      "Public Landmark",
      "Google Maps URL",
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
      `"${l.public_landmark || l.locality}"`,
      `"${l.google_maps_url || ""}"`,
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
      `Muchads_Leads_${(isCustomMode ? customCity : selectedCity) || "Location"}_${Date.now()}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${leadsToExport.length} leads to CSV with public landmark addresses.`);
  };

  if (!isOpen) return null;

  const selectedCount = selectedIds.size;
  const selectedPipelineValue = discoveredLeads
    .filter((l) => selectedIds.has(l.temp_id))
    .reduce((sum, l) => sum + l.deal_value, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden text-slate-800">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#714B67] text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-900 tracking-tight">
                  Autonomous Area Lead Engine & Public Commercial Directory
                </h3>
                <span className="text-[10px] font-mono bg-purple-100 text-[#714B67] font-semibold px-2 py-0.5 rounded-full border border-purple-200">
                  v2.4
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Target any city, commercial hub, or custom global region to crawl verified public businesses, landmarks, and cold pitch sequences.
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
        <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-[#FAFBFD]">
          {/* Section 1: Region & Niche Controls */}
          <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-[#714B67]" />
                Location & Commercial Area Selection
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
                  Metros & Hubs
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
                  <span>Any Custom Region</span>
                </button>
              </div>
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {/* City Selector or Custom City Input */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  {isCustomMode ? "Enter Any City / Place" : "Metro / City"}
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
                  {isCustomMode ? "Commercial District / Area" : "Commercial Hub / Area"}
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

              {/* Niche Vertical */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Industry Vertical</label>
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

              {/* Target Count & Min Deal */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Count</label>
                  <select
                    value={targetCount}
                    onChange={(e) => setTargetCount(Number(e.target.value))}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                  >
                    <option value={3}>3 leads</option>
                    <option value={6}>6 leads</option>
                    <option value={9}>9 leads</option>
                    <option value={12}>12 leads</option>
                  </select>
                </div>

                <div className="flex-1">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Min Value</label>
                  <select
                    value={minDealValue}
                    onChange={(e) => setMinDealValue(Number(e.target.value))}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                  >
                    <option value={50000}>₹50k/mo</option>
                    <option value={75000}>₹75k/mo</option>
                    <option value={100000}>₹1.0L/mo</option>
                    <option value={150000}>₹1.5L/mo</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Custom Locality Input if in Preset Mode */}
            {!isCustomMode && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1 border-t border-slate-100">
                <div className="flex-1 flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="Or refine with specific street / building in this area (e.g. Phoenix Palladium, Worli)..."
                    value={customArea}
                    onChange={(e) => setCustomArea(e.target.value)}
                    className="w-full text-xs bg-transparent border-0 outline-none text-slate-700 placeholder:text-slate-400"
                  />
                </div>

                <button
                  onClick={handleDiscover}
                  disabled={isLoading}
                  className="px-4 py-2 bg-[#714B67] hover:bg-[#5E3E55] text-white text-xs font-bold rounded-lg shadow-sm flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Crawling Area Businesses...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>Discover Public Area Leads</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Action button if in Custom Mode */}
            {isCustomMode && (
              <div className="flex justify-end pt-1 border-t border-slate-100">
                <button
                  onClick={handleDiscover}
                  disabled={isLoading}
                  className="px-5 py-2.5 bg-[#714B67] hover:bg-[#5E3E55] text-white text-xs font-bold rounded-lg shadow-sm flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Crawling {customCity || "Region"} Businesses...</span>
                    </>
                  ) : (
                    <>
                      <Compass className="w-4 h-4 text-amber-300 animate-spin" />
                      <span>Run Discovery on {customCity || "Custom Place"}</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Section 2: Discovered Leads Display */}
          {discoveredLeads.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleSelectAll}
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900"
                  >
                    {selectedIds.size === discoveredLeads.length ? (
                      <CheckSquare className="w-4 h-4 text-[#714B67]" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                    <span>
                      {selectedCount} of {discoveredLeads.length} Selected
                    </span>
                  </button>

                  <span className="text-slate-300">|</span>

                  <span className="text-xs font-mono font-bold text-slate-900">
                    Est. Value: {formatCurrency(selectedPipelineValue)}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Public Landmarks & Google Maps Verified</span>
                </div>
              </div>

              <div className="space-y-3">
                {discoveredLeads.map((lead) => {
                  const isSelected = selectedIds.has(lead.temp_id);
                  const isExpanded = expandedOutreachId === lead.temp_id;
                  const publicLandmark = lead.public_landmark || lead.locality;

                  return (
                    <div
                      key={lead.temp_id}
                      className={cn(
                        "rounded-xl border transition-all bg-white overflow-hidden shadow-2xs",
                        isSelected
                          ? "border-[#714B67]/50 ring-1 ring-[#714B67]/20"
                          : "border-slate-200"
                      )}
                    >
                      {/* Top Lead Summary Row */}
                      <div className="p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => toggleSelect(lead.temp_id)}
                            className="mt-1 text-slate-400 hover:text-[#714B67] transition"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-[#714B67]" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-sm text-slate-900">{lead.company_name}</h4>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                                {lead.niche}
                              </span>
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                <Flame className="w-3 h-3 text-emerald-600" />
                                {lead.intent_score}% Intent
                              </span>
                            </div>

                            {/* Public Landmark Address with Maps button */}
                            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                              <span className="flex items-center gap-1 text-[11px] font-medium text-slate-700 bg-slate-100/80 px-2 py-0.5 rounded border border-slate-200">
                                <MapPin className="w-3 h-3 text-[#714B67] shrink-0" />
                                <span>{publicLandmark}</span>
                              </span>

                              {lead.google_maps_url && (
                                <a
                                  href={lead.google_maps_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-0.5"
                                  title="View Public Area & Location on Google Maps"
                                >
                                  <span>Google Maps</span>
                                  <ExternalLink size={10} />
                                </a>
                              )}
                            </div>

                            {/* Contact Details */}
                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1.5 flex-wrap">
                              <span className="flex items-center gap-1 text-slate-700 font-medium">
                                <User className="w-3 h-3 text-slate-400" />
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
                            </div>
                          </div>
                        </div>

                        {/* Right side: Deal Value & Action Buttons */}
                        <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-0 border-slate-100">
                          <div className="text-left md:text-right">
                            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Est. Retainer</span>
                            <span className="text-sm font-bold font-mono text-slate-900 block">
                              {formatCurrency(lead.deal_value)}
                              <span className="text-[10px] font-normal text-slate-500">/mo</span>
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {/* Instant WhatsApp Direct button */}
                            <a
                              href={lead.whatsapp_click_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition shadow-2xs"
                              title="Direct Click-to-Chat on WhatsApp"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">WhatsApp</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                            </a>

                            <button
                              onClick={() => setExpandedOutreachId(isExpanded ? null : lead.temp_id)}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1 transition"
                            >
                              <span>Pitch</span>
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Expandable Cold Outreach Pitch Teardown */}
                      {isExpanded && (
                        <div className="bg-slate-50 border-t border-slate-200/80 p-4 space-y-3">
                          {/* Identified Marketing Bottlenecks */}
                          <div>
                            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 block mb-1.5">
                              Audit Observations for {lead.area}:
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
                              <span className="text-[11px] bg-purple-50 text-[#714B67] border border-purple-200 px-2 py-0.5 rounded font-medium">
                                💡 Strategy: {lead.recommended_service}
                              </span>
                            </div>
                          </div>

                          {/* Cold Pitch Tabs (WhatsApp vs Email) */}
                          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                            <div className="flex items-center border-b border-slate-200 bg-slate-100/70 text-xs">
                              <button
                                onClick={() => setActiveTab("whatsapp")}
                                className={cn(
                                  "px-3.5 py-2 font-semibold flex items-center gap-1.5 border-b-2 transition",
                                  activeTab === "whatsapp"
                                    ? "border-[#714B67] text-[#714B67] bg-white"
                                    : "border-transparent text-slate-500 hover:text-slate-700"
                                )}
                              >
                                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Cold WhatsApp Text (Location Hook)</span>
                              </button>
                              <button
                                onClick={() => setActiveTab("email")}
                                className={cn(
                                  "px-3.5 py-2 font-semibold flex items-center gap-1.5 border-b-2 transition",
                                  activeTab === "email"
                                    ? "border-[#714B67] text-[#714B67] bg-white"
                                    : "border-transparent text-slate-500 hover:text-slate-700"
                                )}
                              >
                                <Mail className="w-3.5 h-3.5 text-blue-600" />
                                <span>Cold Email Pitch Sequence</span>
                              </button>
                            </div>

                            <div className="p-3 text-xs">
                              {activeTab === "whatsapp" ? (
                                <div className="space-y-2">
                                  <div className="bg-emerald-50/60 p-3 rounded-lg border border-emerald-200/80 font-mono text-[11px] text-slate-800 leading-relaxed whitespace-pre-wrap">
                                    {lead.cold_whatsapp_text}
                                  </div>
                                  <div className="flex justify-end">
                                    <a
                                      href={lead.whatsapp_click_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800"
                                    >
                                      <span>Launch in WhatsApp Web / App</span>
                                      <ExternalLink size={12} />
                                    </a>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <div className="bg-slate-50 p-2 rounded border border-slate-200 text-[11px] font-mono text-slate-700 font-semibold">
                                    Subject: {lead.cold_email_subject}
                                  </div>
                                  <div className="bg-white p-3 rounded border border-slate-200 font-mono text-[11px] text-slate-800 leading-relaxed whitespace-pre-wrap">
                                    {lead.cold_email_body}
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

          {/* Empty state when no leads discovered yet */}
          {discoveredLeads.length === 0 && !isLoading && (
            <div className="text-center py-12 px-4 rounded-xl border border-dashed border-slate-300 bg-white">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#714B67] flex items-center justify-center mx-auto mb-3">
                <Target size={24} />
              </div>
              <h4 className="font-bold text-sm text-slate-800 mb-1">
                Select or Enter Any Place to Discover Leads
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Target commercial hubs across Mumbai, Bengaluru, Delhi NCR, Hyderabad, Ahmedabad, Pune, Goa, or type ANY custom region worldwide to crawl public business landmarks and decision makers.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
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
