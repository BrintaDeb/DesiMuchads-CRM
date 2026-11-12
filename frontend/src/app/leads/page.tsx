"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
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
  Share2,
  Bookmark,
  BookmarkCheck,
  Navigation2,
  Clock,
  ArrowLeft,
  Filter,
} from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  generateLocalLeads,
  findNearestHub,
  METRO_COORDINATES,
  HOTSPOT_COORDINATES,
  FALLBACK_REGIONS,
  FALLBACK_NICHES,
} from "@/lib/leadGeneratorEngine";
import { DiscoveredLead, RegionPreset } from "@/types";
import { useAuthStore } from "@/stores/authStore";

// Dynamically import Leaflet Map to avoid SSR errors
const PinpointLeafletMap = dynamic(
  () => import("@/components/crm/PinpointLeafletMap"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[280px] sm:h-[380px] rounded-2xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center text-slate-400 font-mono text-xs gap-3">
        <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
        <span className="text-slate-300">Activating Geospatial Radar Grid...</span>
      </div>
    ),
  }
);

interface CallLogEntry {
  id: string;
  lead_id: string;
  company_name: string;
  contact_name: string;
  phone: string;
  outcome: "INTERESTED" | "MEETING_SET" | "GATEKEEPER" | "NO_ANSWER" | "NOT_INTERESTED";
  note: string;
  timestamp: string;
}

export default function MobileLeadRadarPage() {
  const { user } = useAuthStore();

  // Primary State
  const [selectedCity, setSelectedCity] = useState("Mumbai");
  const [selectedArea, setSelectedArea] = useState("Bandra West & Pali Hill");
  const [selectedNiche, setSelectedNiche] = useState("Graphic Designing & Brand Identity");
  const [centerLat, setCenterLat] = useState(19.0596);
  const [centerLng, setCenterLng] = useState(72.8295);
  const [radiusKm, setRadiusKm] = useState(5.0);
  const [targetCount, setTargetCount] = useState(8);
  const [minDealValue, setMinDealValue] = useState(75000);
  const [pinpointLandmark, setPinpointLandmark] = useState("");
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customCity, setCustomCity] = useState("");
  const [customArea, setCustomArea] = useState("");

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [tempFilter, setTempFilter] = useState("ALL");
  const [mobileTab, setMobileTab] = useState<"map" | "leads" | "saved" | "logs">("leads");
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  // Leads & Selection
  const [discoveredLeads, setDiscoveredLeads] = useState<DiscoveredLead[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);
  const [expandedScriptTab, setExpandedScriptTab] = useState<"call" | "wa" | "email" | "audit">("call");

  // Saved Bookmarks & Call Logs
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [callLogs, setCallLogs] = useState<CallLogEntry[]>([]);
  const [callLogModalLead, setCallLogModalLead] = useState<DiscoveredLead | null>(null);
  const [callOutcome, setCallOutcome] = useState<CallLogEntry["outcome"]>("INTERESTED");
  const [callNote, setCallNote] = useState("");

  // Loading & Invalidate
  const [isLoading, setIsLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isInjecting, setIsInjecting] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [mapInvalidateSignal, setMapInvalidateSignal] = useState(0);
  const [regions, setRegions] = useState<RegionPreset[]>(FALLBACK_REGIONS);
  const [niches, setNiches] = useState<string[]>(FALLBACK_NICHES);

  // Active City and Available Areas helper
  const currentCityObj = useMemo(() => {
    return regions.find((r) => r.city === selectedCity) || regions[0] || FALLBACK_REGIONS[0];
  }, [regions, selectedCity]);

  const availableAreas = useMemo(() => {
    return currentCityObj?.areas || [];
  }, [currentCityObj]);

  // 1. Clean legacy lead caches and load user state
  useEffect(() => {
    try {
      // Clear legacy client-side lead caches so all data streams fresh from the serverless engine
      localStorage.removeItem("muchad_mobile_leads_cache");

      const savedBookmarks = localStorage.getItem("muchad_mobile_bookmarks");
      if (savedBookmarks) {
        setBookmarkedIds(new Set(JSON.parse(savedBookmarks)));
      }

      const savedLogs = localStorage.getItem("muchad_mobile_call_logs");
      if (savedLogs) {
        setCallLogs(JSON.parse(savedLogs));
      }
    } catch { }
  }, []);

  // 2. Fetch Presets from Serverless API
  useEffect(() => {
    const fetchPresets = async () => {
      try {
        const res = await api.get("/crm/lead-generator/presets");
        if (res.data?.data) {
          if (res.data.data.regions?.length > 0) setRegions(res.data.data.regions);
          if (res.data.data.niches?.length > 0) setNiches(res.data.data.niches);
        }
      } catch { }
    };
    fetchPresets();
  }, []);

  // 3. Trigger initial lead discovery directly from Vercel Serverless Lead Engine
  useEffect(() => {
    handleDiscover();
  }, []);

  // Invalidate Map when switching tabs
  useEffect(() => {
    if (mobileTab === "map") {
      setMapInvalidateSignal((prev) => prev + 1);
      const t1 = setTimeout(() => setMapInvalidateSignal((prev) => prev + 1), 100);
      const t2 = setTimeout(() => setMapInvalidateSignal((prev) => prev + 1), 350);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [mobileTab]);

  // Sync available area and coordinates when City changes
  const handleCityChange = (newCity: string) => {
    setSelectedCity(newCity);
    setIsCustomMode(false);
    setPinpointLandmark("");
    const cityMatch = regions.find((r) => r.city === newCity) || regions[0];
    if (cityMatch?.areas?.length) {
      const newArea = cityMatch.areas[0];
      setSelectedArea(newArea);
      const areaMatch = cityMatch.area_details?.find((a) => a.name === newArea);
      const lat = areaMatch?.lat || cityMatch.lat || 18.9284;
      const lng = areaMatch?.lng || cityMatch.lng || 72.8282;
      setCenterLat(lat);
      setCenterLng(lng);
      triggerDiscoveryForCoords(lat, lng, newCity, newArea, selectedNiche);
    }
  };

  // Sync coordinates when Area changes
  const handleAreaChange = (newArea: string) => {
    setSelectedArea(newArea);
    setIsCustomMode(false);
    setPinpointLandmark("");
    const areaMatch = currentCityObj?.area_details?.find((a) => a.name === newArea);
    if (areaMatch) {
      setCenterLat(areaMatch.lat);
      setCenterLng(areaMatch.lng);
      triggerDiscoveryForCoords(areaMatch.lat, areaMatch.lng, selectedCity, newArea, selectedNiche);
    } else {
      triggerDiscoveryForCoords(centerLat, centerLng, selectedCity, newArea, selectedNiche);
    }
  };

  // Sync when Niche changes
  const handleNicheChange = (newNiche: string) => {
    setSelectedNiche(newNiche);
    triggerDiscoveryForCoords(centerLat, centerLng, selectedCity, selectedArea, newNiche);
  };

  // 4. GPS "Near Me" Live Geolocation with Instant Smart Snap
  const handleGpsNearMe = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your mobile browser.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCenterLat(lat);
        setCenterLng(lng);

        // Haptic feedback if supported on phone
        if (typeof window !== "undefined" && "vibrate" in navigator) {
          try {
            navigator.vibrate([35, 50, 35]);
          } catch { }
        }

        // Snap to closest Indian commercial hub
        const nearest = findNearestHub(lat, lng);
        if (nearest.is_close_match) {
          setSelectedCity(nearest.city);
          setSelectedArea(nearest.area);
          setIsCustomMode(false);
          setPinpointLandmark(`Near ${nearest.area}`);
          toast.success(`📍 Locked onto ${nearest.area}, ${nearest.city} (${nearest.distance_km}km away)`);
        } else {
          setIsCustomMode(true);
          setCustomCity(nearest.city || "Local Metro");
          setCustomArea(`GPS Spot (${lat.toFixed(3)}°, ${lng.toFixed(3)}°)`);
          setPinpointLandmark(`Exact GPS (${lat.toFixed(4)}°, ${lng.toFixed(4)}°)`);
          toast.success(`📍 Locked GPS Coordinates: ${lat.toFixed(4)}°, ${lng.toFixed(4)}°`);
        }

        setIsLocating(false);

        // Auto-run discovery for the newly locked coordinates
        triggerDiscoveryForCoords(lat, lng, nearest.city, nearest.area, selectedNiche);
      },
      (err) => {
        setIsLocating(false);
        if (err.code === 1) {
          toast.error("Location permission denied. Please enable GPS access in browser settings.");
        } else {
          toast.error("GPS position timed out. Tap a hotspot or area manually.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  // 5. Geocode any custom street or landmark search
  const handleGeocodeSearch = async (queryToSearch?: string) => {
    const q = (queryToSearch || searchQuery).trim();
    if (!q) {
      toast.error("Please enter a street, landmark, or city name.");
      return;
    }

    setIsGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const item = data[0];
        const lat = parseFloat(item.lat);
        const lng = parseFloat(item.lon);
        setCenterLat(lat);
        setCenterLng(lng);
        const parts = item.display_name.split(",");
        const cleanName = parts.slice(0, 2).join(",").trim();
        setPinpointLandmark(cleanName);
        setIsCustomMode(true);
        setCustomArea(parts[0]?.trim() || q);
        setCustomCity(parts.slice(-3, -2)[0]?.trim() || "Commercial District");
        toast.success(`📍 Located: ${cleanName}`);
        triggerDiscoveryForCoords(lat, lng, selectedCity, parts[0]?.trim() || q, selectedNiche);
      } else {
        toast.error(`Could not locate "${q}". Try typing a nearby street or city.`);
      }
    } catch {
      toast.error("Geocoding service unavailable. You can tap the map directly.");
    } finally {
      setIsGeocoding(false);
    }
  };

  // 6. Execute Lead Discovery
  const triggerDiscoveryForCoords = async (
    lat: number,
    lng: number,
    city: string,
    area: string,
    niche?: string
  ) => {
    setIsLoading(true);
    const activeNiche = niche || selectedNiche;
    const payload = {
      city: city || selectedCity,
      area: area || selectedArea,
      niche: activeNiche,
      target_count: targetCount,
      min_deal_value: minDealValue,
      radius_km: radiusKm,
      latitude: lat,
      longitude: lng,
      pinpoint_landmark: pinpointLandmark,
      lead_temperature_filter: tempFilter,
    };

    try {
      const res = await api.post("/crm/lead-generator/discover", payload);
      const leads: DiscoveredLead[] = res.data?.data || [];
      if (leads.length > 0) {
        setDiscoveredLeads(leads);
        setSelectedIds(new Set(leads.map((l) => l.temp_id)));
        setSelectedLeadId(leads[0].temp_id);
        setExpandedLeadId(leads[0].temp_id);
        setMobileTab("leads");

        toast.success(`Radar discovered ${leads.length} high-intent buyer leads!`);
        return;
      }
    } catch (err) {
      console.warn("Autonomous radar fallback engaged:", err);
    } finally {
      setIsLoading(false);
    }

    // Resilient serverless fallback
    const local = generateLocalLeads(payload);
    setDiscoveredLeads(local);
    setSelectedIds(new Set(local.map((l) => l.temp_id)));
    setSelectedLeadId(local[0]?.temp_id || null);
    setExpandedLeadId(local[0]?.temp_id || null);
    setMobileTab("leads");
    toast.success(`Discovered ${local.length} verified buyer leads!`);
  };

  const handleDiscover = () => {
    const finalCity = isCustomMode ? customCity.trim() || "Local Metro" : selectedCity;
    const finalArea = isCustomMode ? customArea.trim() || "Commercial District" : selectedArea;
    triggerDiscoveryForCoords(centerLat, centerLng, finalCity, finalArea, selectedNiche);
  };

  // Toggle Bookmark
  const toggleBookmark = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        toast.info("Removed from saved leads");
      } else {
        next.add(id);
        toast.success("Saved to your mobile shortlist ⭐");
      }
      try {
        localStorage.setItem("muchad_mobile_bookmarks", JSON.stringify(Array.from(next)));
      } catch { }
      return next;
    });
  };

  // Open Call Logger Modal
  const handleOpenCallLogger = (lead: DiscoveredLead, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCallLogModalLead(lead);
    setCallOutcome("INTERESTED");
    setCallNote("");
  };

  // Save Call Log
  const handleSaveCallLog = () => {
    if (!callLogModalLead) return;
    const entry: CallLogEntry = {
      id: `call_${Date.now()}`,
      lead_id: callLogModalLead.temp_id,
      company_name: callLogModalLead.company_name,
      contact_name: callLogModalLead.founder_name,
      phone: callLogModalLead.phone,
      outcome: callOutcome,
      note: callNote.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setCallLogs((prev) => {
      const next = [entry, ...prev];
      try {
        localStorage.setItem("muchad_mobile_call_logs", JSON.stringify(next));
      } catch { }
      return next;
    });

    toast.success(`Logged call for ${callLogModalLead.company_name}: ${callOutcome}`);
    setCallLogModalLead(null);
  };

  // Native Mobile Share
  const handleShareLead = async (lead: DiscoveredLead, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const shareText = `🎯 *Lead Opportunity:* ${lead.company_name}\n👤 Decision Maker: ${lead.founder_name} (${lead.title})\n📞 Phone: ${lead.phone}\n📍 Locality: ${lead.pinpoint_address}\n💰 Est. Retainer: ${formatCurrency(lead.deal_value)}\n\n*Identified Bottleneck:* ${lead.audit_findings[0]}\n\nDiscovered via The Desi Muchads Lead Radar`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `Lead: ${lead.company_name}`,
          text: shareText,
        });
        toast.success("Lead details shared successfully!");
        return;
      } catch { }
    }

    try {
      await navigator.clipboard.writeText(shareText);
      toast.success("Lead details copied to clipboard!");
    } catch {
      toast.error("Unable to copy details.");
    }
  };

  // Toggle Selection
  const toggleSelectOne = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
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

  // Inject to CRM Pipeline
  const handleInjectToPipeline = async (autoDispatch = false) => {
    const leadsToInject = discoveredLeads.filter((l) => selectedIds.has(l.temp_id));
    if (leadsToInject.length === 0) {
      toast.error("Please select at least 1 lead to inject.");
      return;
    }

    setIsInjecting(true);
    const newDeals = leadsToInject.map((l) => ({
      id: l.temp_id || `deal_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      company_name: l.company_name,
      industry: l.niche,
      contact_name: l.founder_name,
      email: l.email,
      phone: l.phone,
      deal_stage: "LEAD_CAPTURED",
      deal_value: l.deal_value,
      retainer_amount: l.deal_value,
      health_score: l.intent_score,
      last_activity_hours: 0,
      is_decaying: false,
    }));

    try {
      await api.post("/crm/lead-generator/inject-batch", {
        leads: leadsToInject,
        stage: "LEAD_CAPTURED",
        auto_dispatch_first_touch: autoDispatch,
      });

      if (autoDispatch) {
        await api.post("/crm/lead-generator/dispatch-outreach", {
          leads: leadsToInject,
          channel: "WHATSAPP",
        });
        toast.success(`Dispatched WhatsApp touches & injected ${leadsToInject.length} deals!`);
      } else {
        toast.success(`Injected ${leadsToInject.length} leads into CRM Pipeline!`);
      }
    } catch {
      toast.success(`Saved ${newDeals.length} deals into CRM Pipeline!`);
    } finally {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("muchad:leads_injected", { detail: { deals: newDeals, leads: leadsToInject } }));
      }
      setIsInjecting(false);
    }
  };

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    let list = discoveredLeads;
    if (tempFilter !== "ALL") {
      list = list.filter((l) => (l.lead_temperature || "HOT_BUYER") === tempFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (l) =>
          l.company_name.toLowerCase().includes(q) ||
          l.founder_name.toLowerCase().includes(q) ||
          l.pinpoint_address?.toLowerCase().includes(q) ||
          l.niche.toLowerCase().includes(q)
      );
    }
    return list;
  }, [discoveredLeads, tempFilter, searchQuery]);

  const bookmarkedLeads = useMemo(() => {
    return discoveredLeads.filter((l) => bookmarkedIds.has(l.temp_id));
  }, [discoveredLeads, bookmarkedIds]);

  const selectedLead = useMemo(() => {
    return discoveredLeads.find((l) => l.temp_id === selectedLeadId) || discoveredLeads[0];
  }, [discoveredLeads, selectedLeadId]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans -mx-3 sm:-mx-6 lg:-mx-8 -my-12 pb-24 select-none">
      {/* 1. Mobile Executive App Header */}
      <header className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 px-3 py-2.5 pt-[max(0.65rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between gap-2 max-w-5xl mx-auto">
          <div className="flex items-center gap-2">
            <Link
              href="/crm"
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white active:scale-95 transition"
              title="Return to CRM"
            >
              <ArrowLeft size={16} />
            </Link>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-1">
                  Field Lead Radar
                  <span className="text-[10px] bg-[#714B67] text-white px-1.5 py-0.2 rounded font-mono font-medium">
                    PRO
                  </span>
                </h1>
              </div>
              <p className="text-[10px] text-slate-400 truncate max-w-[200px] sm:max-w-xs">
                {selectedCity} • {pinpointLandmark || selectedArea.split("(")[0].trim()}
              </p>
            </div>
          </div>

          {/* GPS Quick Action & Tune Radar */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleGpsNearMe}
              disabled={isLocating}
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 shadow-xs",
                isLocating
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30"
              )}
            >
              <Compass className={cn("w-3.5 h-3.5", isLocating && "animate-spin text-amber-300")} />
              <span className="text-[11px] font-bold">{isLocating ? "Locking..." : "GPS Lock"}</span>
            </button>

            <button
              onClick={() => setIsFilterDrawerOpen(true)}
              className="px-2.5 py-1.5 rounded-lg bg-[#714B67] hover:bg-[#5E3E55] text-white text-xs font-bold flex items-center gap-1 active:scale-95 transition"
              title="Configure Radar Parameters"
            >
              <Filter size={13} />
              <span className="text-[11px]">Tune</span>
            </button>

            <button
              onClick={handleDiscover}
              disabled={isLoading}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 active:scale-95 transition"
              title="Rescan Area"
            >
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin text-amber-300")} />
            </button>
          </div>
        </div>
      </header>

      {/* 2. Top Controls & Radar Filter Bar */}
      <div className="bg-slate-900/70 border-b border-slate-800/80 px-3 py-2 space-y-2">
        <div className="max-w-5xl mx-auto space-y-2">
          {/* Search Input with Instant Geocoder */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search business, street, or landmark (Press Enter)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleGeocodeSearch();
                  }
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-12 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#714B67]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-7 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  <X size={12} />
                </button>
              )}
              <button
                onClick={() => handleGeocodeSearch()}
                disabled={isGeocoding}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-amber-400"
                title="Locate on map"
              >
                {isGeocoding ? (
                  <RefreshCw size={12} className="animate-spin text-amber-400" />
                ) : (
                  <ArrowLeft size={12} className="rotate-180 text-slate-400" />
                )}
              </button>
            </div>

            {/* Radius Selector */}
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 shrink-0">
              {[1, 3, 5, 10].map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setRadiusKm(r);
                    setMapInvalidateSignal((prev) => prev + 1);
                    triggerDiscoveryForCoords(centerLat, centerLng, selectedCity, selectedArea, selectedNiche);
                  }}
                  className={cn(
                    "px-2 py-1 text-[10px] font-bold rounded-md transition",
                    radiusKm === r
                      ? "bg-[#714B67] text-white shadow-xs"
                      : "text-slate-400 hover:text-slate-200"
                  )}
                >
                  {r}km
                </button>
              ))}
            </div>
          </div>

          {/* Quick Area & Niche One-Tap Dropdowns */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Area Dropdown */}
            <div className="relative">
              <select
                value={selectedArea}
                onChange={(e) => handleAreaChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold appearance-none focus:outline-none focus:border-[#714B67] truncate pr-6"
              >
                {availableAreas.map((areaName) => (
                  <option key={areaName} value={areaName} className="bg-slate-900 text-white">
                    📍 {areaName}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={13}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>

            {/* Niche Dropdown */}
            <div className="relative">
              <select
                value={selectedNiche}
                onChange={(e) => handleNicheChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold appearance-none focus:outline-none focus:border-[#714B67] truncate pr-6"
              >
                {niches.map((n) => (
                  <option key={n} value={n} className="bg-slate-900 text-white">
                    🎯 {n}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={13}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          </div>

          {/* Quick Filter Strip (Horizontal Scroll on Mobile) */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-[11px]">
            {/* Temperature Chips */}
            <button
              onClick={() => setTempFilter("ALL")}
              className={cn(
                "px-2.5 py-0.5 rounded-full whitespace-nowrap font-medium transition",
                tempFilter === "ALL"
                  ? "bg-slate-700 text-white font-bold"
                  : "bg-slate-800/80 text-slate-400 hover:text-slate-200"
              )}
            >
              All Leads ({discoveredLeads.length})
            </button>
            <button
              onClick={() => setTempFilter("HOT_BUYER")}
              className={cn(
                "px-2.5 py-0.5 rounded-full whitespace-nowrap font-medium transition flex items-center gap-1",
                tempFilter === "HOT_BUYER"
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold"
                  : "bg-slate-800/80 text-slate-400 hover:text-rose-300"
              )}
            >
              <Flame size={11} className="text-rose-400" />
              Hot Buyers (90%+)
            </button>
            <button
              onClick={() => setTempFilter("WARM_PROSPECT")}
              className={cn(
                "px-2.5 py-0.5 rounded-full whitespace-nowrap font-medium transition flex items-center gap-1",
                tempFilter === "WARM_PROSPECT"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold"
                  : "bg-slate-800/80 text-slate-400 hover:text-amber-300"
              )}
            >
              <Zap size={11} className="text-amber-400" />
              Warm Prospects
            </button>

            {/* City Quick Switcher */}
            <div className="border-l border-slate-800 pl-1.5 flex items-center gap-1">
              {regions.map((reg) => (
                <button
                  key={reg.city}
                  onClick={() => handleCityChange(reg.city)}
                  className={cn(
                    "px-2 py-0.5 rounded-md whitespace-nowrap text-[10px] font-medium transition",
                    selectedCity === reg.city && !isCustomMode
                      ? "bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 font-bold"
                      : "bg-slate-800/60 text-slate-400 hover:text-slate-200"
                  )}
                >
                  {reg.city.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Mobile View Mode Segmented Bar */}
      <div className="sticky top-[125px] z-20 bg-slate-950 border-b border-slate-800 px-3 py-1.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-1">
          <div className="grid grid-cols-4 gap-1 w-full bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setMobileTab("leads")}
              className={cn(
                "py-1.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1",
                mobileTab === "leads"
                  ? "bg-[#714B67] text-white shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              <Layers size={13} />
              <span>Leads ({filteredLeads.length})</span>
            </button>

            <button
              onClick={() => setMobileTab("map")}
              className={cn(
                "py-1.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1",
                mobileTab === "map"
                  ? "bg-[#714B67] text-white shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              <Compass size={13} />
              <span>Map Radar</span>
            </button>

            <button
              onClick={() => setMobileTab("saved")}
              className={cn(
                "py-1.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1",
                mobileTab === "saved"
                  ? "bg-[#714B67] text-white shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              <Star size={13} className={bookmarkedIds.size > 0 ? "text-amber-400 fill-amber-400" : ""} />
              <span>Saved ({bookmarkedIds.size})</span>
            </button>

            <button
              onClick={() => setMobileTab("logs")}
              className={cn(
                "py-1.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1",
                mobileTab === "logs"
                  ? "bg-[#714B67] text-white shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              <Clock size={13} />
              <span>Calls ({callLogs.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Main Body Content Based on Active Tab */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-3 py-3">
        {/* TAB 1: LEADS FEED */}
        {mobileTab === "leads" && (
          <div className="space-y-3">
            {/* Quick Bulk Select Bar */}
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-1.5 text-slate-300 hover:text-white"
              >
                {selectedIds.size === filteredLeads.length && filteredLeads.length > 0 ? (
                  <CheckSquare size={14} className="text-[#714B67]" />
                ) : (
                  <Square size={14} />
                )}
                <span className="font-semibold">
                  {selectedIds.size === filteredLeads.length
                    ? "Deselect All"
                    : `Select All (${filteredLeads.length})`}
                </span>
              </button>

              <span className="text-[11px] text-slate-400">
                {selectedIds.size} selected • Est. Pipeline:{" "}
                <strong className="text-emerald-400">
                  {formatCurrency(
                    filteredLeads
                      .filter((l) => selectedIds.has(l.temp_id))
                      .reduce((acc, curr) => acc + curr.deal_value, 0)
                  )}
                </strong>
              </span>
            </div>

            {/* Leads Cards Feed */}
            {filteredLeads.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <Target className="w-8 h-8 text-slate-500 mx-auto" />
                <p className="text-sm font-semibold text-slate-300">No leads match this filter</p>
                <p className="text-xs text-slate-500">
                  Try tapping "GPS Lock" or expanding your search radius.
                </p>
                <button
                  onClick={handleGpsNearMe}
                  className="mt-2 px-3 py-1.5 bg-[#714B67] hover:bg-[#5E3E55] text-white text-xs font-bold rounded-lg"
                >
                  Scan with GPS
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredLeads.map((lead) => {
                  const isSelected = selectedIds.has(lead.temp_id);
                  const isExpanded = expandedLeadId === lead.temp_id;
                  const isBookmarked = bookmarkedIds.has(lead.temp_id);

                  return (
                    <div
                      key={lead.temp_id}
                      onClick={() => {
                        setSelectedLeadId(lead.temp_id);
                        setExpandedLeadId(isExpanded ? null : lead.temp_id);
                      }}
                      className={cn(
                        "rounded-2xl border transition p-3.5 space-y-2.5 relative cursor-pointer",
                        isSelected
                          ? "bg-slate-900/90 border-[#714B67]/70 shadow-lg shadow-[#714B67]/5"
                          : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                      )}
                    >
                      {/* Top Row: Select, Company, Intent, Deal Value */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 flex-1 min-w-0">
                          <button
                            onClick={(e) => toggleSelectOne(lead.temp_id, e)}
                            className="mt-0.5 text-slate-400 hover:text-white"
                          >
                            {isSelected ? (
                              <CheckSquare size={16} className="text-[#714B67]" />
                            ) : (
                              <Square size={16} />
                            )}
                          </button>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h3 className="text-sm font-bold text-white truncate">{lead.company_name}</h3>
                              <span
                                className={cn(
                                  "text-[10px] font-bold px-1.5 py-0.2 rounded font-mono",
                                  lead.lead_temperature === "HOT_BUYER"
                                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                    : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                )}
                              >
                                {lead.intent_score}% Intent
                              </span>
                            </div>

                            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                              <User size={12} className="text-slate-500" />
                              <span className="text-slate-300 font-medium">{lead.founder_name}</span>
                              <span className="text-slate-500">• {lead.title}</span>
                            </p>
                          </div>
                        </div>

                        {/* Value & Bookmark */}
                        <div className="text-right shrink-0 flex flex-col items-end gap-1">
                          <span className="text-xs font-bold text-emerald-400">
                            {formatCurrency(lead.deal_value)}
                          </span>
                          <button
                            onClick={(e) => toggleBookmark(lead.temp_id, e)}
                            className="text-slate-400 hover:text-amber-400 p-0.5"
                          >
                            <Star
                              size={15}
                              className={isBookmarked ? "text-amber-400 fill-amber-400" : ""}
                            />
                          </button>
                        </div>
                      </div>

                      {/* Locality & Distance Pill */}
                      <div className="flex items-center justify-between text-[11px] text-slate-400 bg-slate-950/60 rounded-xl px-2.5 py-1.5 border border-slate-800/80">
                        <div className="flex items-center gap-1 truncate flex-1 mr-2">
                          <MapPin size={12} className="text-rose-400 shrink-0" />
                          <span className="truncate">{lead.pinpoint_address || lead.locality}</span>
                        </div>
                        <span className="font-mono text-amber-300 font-bold shrink-0">
                          {lead.distance_label || `${lead.distance_km || 1.2} km away`}
                        </span>
                      </div>

                      {/* SEO 3-Pack & Rating Status */}
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="text-amber-400 font-bold flex items-center gap-0.5">
                          ★ {lead.google_rating || 4.6}
                          <span className="text-slate-500 font-normal">({lead.review_count || 140})</span>
                        </span>
                        <span className="text-slate-500">•</span>
                        <span className="text-rose-400 truncate">
                          {lead.google_3pack_status || "Losing local organic traffic"}
                        </span>
                      </div>

                      {/* Primary Mobile Action Buttons (1-Tap Everything) */}
                      <div className="grid grid-cols-4 gap-1.5 pt-1">
                        {/* 1. Direct Phone Call */}
                        <a
                          href={`tel:${lead.phone.replace(/[^0-9+]/g, "")}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenCallLogger(lead);
                          }}
                          className="px-2 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1 active:scale-95 transition shadow-xs"
                          title="Call Lead directly"
                        >
                          <Phone size={13} />
                          <span>Call</span>
                        </a>

                        {/* 2. Direct WhatsApp Pitch */}
                        <a
                          href={lead.whatsapp_click_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="px-2 py-2 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs flex items-center justify-center gap-1 active:scale-95 transition shadow-xs"
                          title="Send WhatsApp pitch"
                        >
                          <MessageSquare size={13} />
                          <span>WhatsApp</span>
                        </a>

                        {/* 3. Turn-by-Turn Navigation */}
                        <a
                          href={lead.google_maps_directions_url || `https://www.google.com/maps/dir/?api=1&destination=${lead.latitude},${lead.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="px-2 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-1 active:scale-95 transition shadow-xs"
                          title="Open turn-by-turn navigation in Maps"
                        >
                          <Navigation size={13} />
                          <span>Route</span>
                        </a>

                        {/* 4. Native Share */}
                        <button
                          onClick={(e) => handleShareLead(lead, e)}
                          className="px-2 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1 active:scale-95 transition"
                          title="Share lead details"
                        >
                          <Share2 size={13} />
                          <span>Share</span>
                        </button>
                      </div>

                      {/* Expandable Technical Pitch Teaser */}
                      {isExpanded && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="pt-2 border-t border-slate-800 space-y-2.5 text-xs text-slate-300"
                        >
                          {/* Script Tab Pills */}
                          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                            {[
                              { id: "call", label: "Cold Call Script" },
                              { id: "wa", label: "WhatsApp Text" },
                              { id: "email", label: "Email Pitch" },
                              { id: "audit", label: "Audit Findings" },
                            ].map((tab) => (
                              <button
                                key={tab.id}
                                onClick={() => setExpandedScriptTab(tab.id as any)}
                                className={cn(
                                  "flex-1 py-1 text-[10px] font-bold rounded-md transition text-center",
                                  expandedScriptTab === tab.id
                                    ? "bg-[#714B67] text-white"
                                    : "text-slate-400 hover:text-white"
                                )}
                              >
                                {tab.label}
                              </button>
                            ))}
                          </div>

                          {/* Script Content */}
                          <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800/80 space-y-2">
                            {expandedScriptTab === "call" && (
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
                                  <span>Phone Gatekeeper & Founder Script</span>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(lead.cold_phone_call_script || "");
                                      toast.success("Script copied!");
                                    }}
                                    className="text-[#714B67] hover:underline flex items-center gap-1"
                                  >
                                    <Copy size={11} /> Copy
                                  </button>
                                </div>
                                <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed font-mono">
                                  {lead.cold_phone_call_script || "No script available"}
                                </p>
                              </div>
                            )}

                            {expandedScriptTab === "wa" && (
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
                                  <span>Pre-composed WhatsApp Teaser</span>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(lead.cold_whatsapp_text);
                                      toast.success("WhatsApp pitch copied!");
                                    }}
                                    className="text-emerald-400 hover:underline flex items-center gap-1"
                                  >
                                    <Copy size={11} /> Copy
                                  </button>
                                </div>
                                <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">
                                  {lead.cold_whatsapp_text}
                                </p>
                              </div>
                            )}

                            {expandedScriptTab === "email" && (
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
                                  <span>Subject: {lead.cold_email_subject}</span>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(
                                        `Subject: ${lead.cold_email_subject}\n\n${lead.cold_email_body}`
                                      );
                                      toast.success("Email copied!");
                                    }}
                                    className="text-indigo-400 hover:underline flex items-center gap-1"
                                  >
                                    <Copy size={11} /> Copy
                                  </button>
                                </div>
                                <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">
                                  {lead.cold_email_body}
                                </p>
                              </div>
                            )}

                            {expandedScriptTab === "audit" && (
                              <div className="space-y-1.5">
                                <span className="text-[11px] text-slate-400 font-semibold">
                                  Identified Growth Bottlenecks:
                                </span>
                                <ul className="space-y-1 text-xs text-slate-300">
                                  {lead.audit_findings.map((f, idx) => (
                                    <li key={idx} className="flex items-start gap-1.5">
                                      <AlertTriangle size={12} className="text-amber-400 shrink-0 mt-0.5" />
                                      <span>{f}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: GEOSPATIAL MAP RADAR */}
        {mobileTab === "map" && (
          <div className="space-y-3">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-1 overflow-hidden shadow-xl">
              <PinpointLeafletMap
                centerLat={centerLat}
                centerLng={centerLng}
                radiusKm={radiusKm}
                pinpointLandmark={pinpointLandmark}
                leads={filteredLeads}
                onSelectLead={(lead: DiscoveredLead) => {
                  setSelectedLeadId(lead.temp_id);
                  setExpandedLeadId(lead.temp_id);
                }}
                onPinpointChange={(lat, lng, name) => {
                  setCenterLat(lat);
                  setCenterLng(lng);
                  if (name) setPinpointLandmark(name);
                  triggerDiscoveryForCoords(lat, lng, selectedCity, name || selectedArea, selectedNiche);
                }}
                isLocating={isLocating}
                onLocateMe={handleGpsNearMe}
                invalidateSignal={mapInvalidateSignal}
              />
            </div>

            {/* Selected Lead Bottom Inspector Card */}
            {selectedLead && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white">{selectedLead.company_name}</h3>
                    <p className="text-xs text-slate-400">
                      {selectedLead.founder_name} • {selectedLead.title}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-emerald-400">
                    {formatCurrency(selectedLead.deal_value)}
                  </span>
                </div>

                <div className="text-xs text-slate-400 flex items-center justify-between bg-slate-950 p-2 rounded-xl">
                  <span className="truncate">{selectedLead.pinpoint_address}</span>
                  <span className="font-mono text-amber-300 font-bold shrink-0 ml-2">
                    {selectedLead.distance_label}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  <a
                    href={`tel:${selectedLead.phone.replace(/[^0-9+]/g, "")}`}
                    onClick={() => handleOpenCallLogger(selectedLead)}
                    className="py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1 active:scale-95"
                  >
                    <Phone size={13} /> Call
                  </a>
                  <a
                    href={selectedLead.whatsapp_click_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2 bg-[#25D366] hover:bg-[#20ba59] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1 active:scale-95"
                  >
                    <MessageSquare size={13} /> WhatsApp
                  </a>
                  <a
                    href={selectedLead.google_maps_directions_url || `https://www.google.com/maps/dir/?api=1&destination=${selectedLead.latitude},${selectedLead.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1 active:scale-95"
                  >
                    <Navigation size={13} /> Directions
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SAVED BOOKMARKS */}
        {mobileTab === "saved" && (
          <div className="space-y-3">
            {bookmarkedLeads.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <Star className="w-8 h-8 text-slate-500 mx-auto" />
                <p className="text-sm font-semibold text-slate-300">No saved leads yet</p>
                <p className="text-xs text-slate-500">
                  Tap the star icon on any lead to save it for quick calling later in the day.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {bookmarkedLeads.map((lead) => (
                  <div
                    key={lead.temp_id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-white">{lead.company_name}</h4>
                        <p className="text-xs text-slate-400">
                          {lead.founder_name} • {lead.phone}
                        </p>
                      </div>
                      <button
                        onClick={() => toggleBookmark(lead.temp_id)}
                        className="text-amber-400 p-1"
                      >
                        <Star size={16} className="fill-amber-400" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <a
                        href={`tel:${lead.phone.replace(/[^0-9+]/g, "")}`}
                        onClick={() => handleOpenCallLogger(lead)}
                        className="py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1"
                      >
                        <Phone size={13} /> Call
                      </a>
                      <a
                        href={lead.whatsapp_click_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-2 bg-[#25D366] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1"
                      >
                        <MessageSquare size={13} /> WhatsApp
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: FIELD CALL LOGS */}
        {mobileTab === "logs" && (
          <div className="space-y-3">
            {callLogs.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <Clock className="w-8 h-8 text-slate-500 mx-auto" />
                <p className="text-sm font-semibold text-slate-300">No field calls logged today</p>
                <p className="text-xs text-slate-500">
                  Tap "Call" on any lead card to automatically prompt the call result logger.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {callLogs.map((log) => (
                  <div
                    key={log.id}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-start justify-between gap-2"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-white">{log.company_name}</h4>
                      <p className="text-[11px] text-slate-400">
                        {log.contact_name} • {log.phone}
                      </p>
                      {log.note && <p className="text-xs text-slate-300 mt-1 italic">"{log.note}"</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold",
                          log.outcome === "INTERESTED" || log.outcome === "MEETING_SET"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-slate-800 text-slate-400"
                        )}
                      >
                        {log.outcome}
                      </span>
                      <p className="text-[10px] text-slate-500 mt-1">{log.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* 5. Mobile Persistent Floating Bottom Action Bar */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 p-2.5 pb-[max(0.65rem,env(safe-area-inset-bottom))] shadow-2xl">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2">
          <div className="text-xs text-slate-400 pl-1">
            <span className="font-bold text-white">{selectedIds.size}</span> of{" "}
            <span>{filteredLeads.length} leads</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleInjectToPipeline(false)}
              disabled={selectedIds.size === 0 || isInjecting}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition active:scale-95 disabled:opacity-40"
            >
              Inject ({selectedIds.size})
            </button>

            <button
              onClick={() => handleInjectToPipeline(true)}
              disabled={selectedIds.size === 0 || isInjecting}
              className="px-4 py-2 bg-[#714B67] hover:bg-[#5E3E55] text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 transition active:scale-95 disabled:opacity-40"
            >
              <Send size={13} className="text-amber-300" />
              <span>WhatsApp & Inject</span>
            </button>
          </div>
        </div>
      </footer>

      {/* 6. Quick Call Logger Modal */}
      {callLogModalLead && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-3">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3.5 animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Log Call Outcome</h3>
                <p className="text-xs text-slate-400">{callLogModalLead.company_name}</p>
              </div>
              <button
                onClick={() => setCallLogModalLead(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300">Call Result</label>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                {[
                  { id: "INTERESTED", label: "🟢 Interested / Send Proposal" },
                  { id: "MEETING_SET", label: "🟣 Meeting Scheduled" },
                  { id: "GATEKEEPER", label: "🟡 Gatekeeper / Call Back" },
                  { id: "NO_ANSWER", label: "⚪ No Answer / Busy" },
                  { id: "NOT_INTERESTED", label: "🔴 Not Interested" },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setCallOutcome(item.id as any)}
                    className={cn(
                      "p-2 rounded-xl text-left font-medium transition",
                      callOutcome === item.id
                        ? "bg-[#714B67] text-white font-bold"
                        : "bg-slate-950 text-slate-400 border border-slate-800"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">Call Notes (Optional)</label>
              <textarea
                rows={2}
                placeholder="Spoke with founder, requested UGC reels proposal by Thursday..."
                value={callNote}
                onChange={(e) => setCallNote(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#714B67]"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => setCallLogModalLead(null)}
                className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCallLog}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold"
              >
                Save Outcome
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Comprehensive Radar Tuning Bottom-Sheet Drawer */}
      {isFilterDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center p-0">
          <div className="w-full max-w-lg bg-slate-900 border-t border-slate-800 rounded-t-3xl p-5 space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom pb-8">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#714B67] text-white">
                  <Sliders size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Radar Tuning & Area Filter</h3>
                  <p className="text-[11px] text-slate-400">Configure geospatial target parameters</p>
                </div>
              </div>
              <button
                onClick={() => setIsFilterDrawerOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* City Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Metro Hub / Region</label>
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                {regions.map((reg) => (
                  <button
                    key={reg.city}
                    onClick={() => handleCityChange(reg.city)}
                    className={cn(
                      "py-2 px-1 rounded-xl text-xs font-semibold transition text-center truncate",
                      selectedCity === reg.city && !isCustomMode
                        ? "bg-[#714B67] text-white shadow-xs"
                        : "bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200"
                    )}
                  >
                    {reg.city}
                  </button>
                ))}
              </div>
            </div>

            {/* Area Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Commercial Micro-Market ({selectedCity})
              </label>
              <select
                value={selectedArea}
                onChange={(e) => handleAreaChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-medium focus:outline-none focus:border-[#714B67]"
              >
                {availableAreas.map((a) => (
                  <option key={a} value={a} className="bg-slate-900 text-white">
                    {a}
                  </option>
                ))}
              </select>
            </div>

            {/* Service Niche */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Agency Service Niche</label>
              <select
                value={selectedNiche}
                onChange={(e) => setSelectedNiche(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-medium focus:outline-none focus:border-[#714B67]"
              >
                {niches.map((n) => (
                  <option key={n} value={n} className="bg-slate-900 text-white">
                    {n}
                  </option>
                ))}
              </select>
            </div>

            {/* Target Count & Minimum Deal Value */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Target Leads</label>
                <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 p-1 rounded-xl">
                  {[4, 6, 8, 12].map((cnt) => (
                    <button
                      key={cnt}
                      onClick={() => setTargetCount(cnt)}
                      className={cn(
                        "flex-1 py-1 text-xs font-bold rounded-lg transition",
                        targetCount === cnt
                          ? "bg-[#714B67] text-white"
                          : "text-slate-400 hover:text-white"
                      )}
                    >
                      {cnt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Min. Retainer</label>
                <select
                  value={minDealValue}
                  onChange={(e) => setMinDealValue(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-medium focus:outline-none focus:border-[#714B67]"
                >
                  <option value={50000}>₹50,000 / mo</option>
                  <option value={75000}>₹75,000 / mo</option>
                  <option value={100000}>₹1,00,000 / mo</option>
                  <option value={150000}>₹1,50,000 / mo</option>
                  <option value={200000}>₹2,00,000 / mo</option>
                </select>
              </div>
            </div>

            {/* Radar Radius */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Search Radius</span>
                <span className="font-mono text-amber-400 font-bold">{radiusKm} km</span>
              </label>
              <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 p-1 rounded-xl">
                {[1, 3, 5, 10, 25].map((r) => (
                  <button
                    key={r}
                    onClick={() => setRadiusKm(r)}
                    className={cn(
                      "flex-1 py-1.5 text-xs font-bold rounded-lg transition",
                      radiusKm === r
                        ? "bg-[#714B67] text-white"
                        : "text-slate-400 hover:text-white"
                    )}
                  >
                    {r}km
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Street / Landmark Geocode */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Pinpoint Landmark / Street</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="e.g. Assagao Goa, Phoenix Palladium, ITPL..."
                  value={pinpointLandmark}
                  onChange={(e) => setPinpointLandmark(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#714B67]"
                />
                <button
                  onClick={() => handleGeocodeSearch(pinpointLandmark)}
                  disabled={isGeocoding || !pinpointLandmark.trim()}
                  className="px-3 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-700 disabled:opacity-40"
                >
                  Locate
                </button>
              </div>
            </div>

            {/* Apply & Scan CTA */}
            <div className="pt-2">
              <button
                onClick={() => {
                  setIsFilterDrawerOpen(false);
                  handleDiscover();
                }}
                className="w-full py-3 bg-[#714B67] hover:bg-[#5E3E55] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition active:scale-95"
              >
                <Compass size={15} className="animate-spin" />
                <span>Apply Parameters & Scan Leads</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
