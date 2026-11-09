"use client";

import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { Navigation, MapPin, Radio, Compass, RefreshCw, Layers, ExternalLink, MessageSquare, Phone } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { DiscoveredLead } from "./LeadGeneratorModal";

interface PinpointLeafletMapProps {
  centerLat: number;
  centerLng: number;
  radiusKm: number;
  pinpointLandmark?: string;
  onPinpointChange: (lat: number, lng: number, resolvedName?: string) => void;
  leads: DiscoveredLead[];
  onSelectLead: (lead: DiscoveredLead) => void;
  isLocating?: boolean;
  onLocateMe?: () => void;
}

export default function PinpointLeafletMap({
  centerLat,
  centerLng,
  radiusKm,
  pinpointLandmark,
  onPinpointChange,
  leads,
  onSelectLead,
  isLocating = false,
  onLocateMe,
}: PinpointLeafletMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const centerMarkerRef = useRef<L.Marker | null>(null);
  const radiusCircleRef = useRef<L.Circle | null>(null);
  const leadMarkersGroupRef = useRef<L.LayerGroup | null>(null);

  const [mapReady, setMapReady] = useState(false);
  const [mapStyle, setMapStyle] = useState<"standard" | "satellite">("standard");

  // 1. Initialize Map instance
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Fix default marker icon issues by avoiding external images and using DivIcon
    const map = L.map(mapContainerRef.current, {
      center: [centerLat, centerLng],
      zoom: radiusKm <= 1 ? 15 : radiusKm <= 5 ? 13 : radiusKm <= 15 ? 12 : 10,
      zoomControl: false,
      tapHold: true,
    });

    // Custom touch-friendly zoom control on bottom right
    L.control.zoom({ position: "bottomright" }).addTo(map);

    // Standard OpenStreetMap Tile Layer
    const tileUrl =
      mapStyle === "satellite"
        ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        : "https://{s}.tile.openstreetmap.org/{z}/{y}/{x}.png";

    const tiles = L.tileLayer(tileUrl, {
      attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // Click/Tap anywhere on map to pinpoint new search center
    map.on("click", async (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      let placeName = "";

      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16`
        );
        const data = await res.json();
        if (data?.display_name) {
          const parts = data.display_name.split(",");
          placeName = parts.slice(0, 3).join(",").trim();
        }
      } catch {}

      onPinpointChange(lat, lng, placeName);
    });

    // Layer group for discovered lead pins
    const leadGroup = L.layerGroup().addTo(map);
    leadMarkersGroupRef.current = leadGroup;

    mapInstanceRef.current = map;
    setMapReady(true);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Update Center Marker & Radius Circle when coordinates or radius change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    // Center icon: Pulsing Pinpoint Radar Beacon
    const centerIcon = L.divIcon({
      className: "custom-center-pin",
      html: `
        <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 32px; height: 32px; border-radius: 9999px; background-color: rgba(113, 75, 103, 0.35); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: relative; width: 26px; height: 26px; border-radius: 9999px; background-color: #714B67; border: 2.5px solid #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
          </div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    // Update or create Center Marker
    if (!centerMarkerRef.current) {
      const marker = L.marker([centerLat, centerLng], {
        icon: centerIcon,
        draggable: true,
      }).addTo(map);

      marker.on("dragend", async () => {
        const pos = marker.getLatLng();
        let name = "";
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.lat}&lon=${pos.lng}&zoom=16`
          );
          const data = await res.json();
          if (data?.display_name) {
            name = data.display_name.split(",").slice(0, 3).join(",").trim();
          }
        } catch {}
        onPinpointChange(pos.lat, pos.lng, name);
      });

      centerMarkerRef.current = marker;
    } else {
      centerMarkerRef.current.setLatLng([centerLat, centerLng]);
    }

    // Update or create Radius Circle
    if (!radiusCircleRef.current) {
      const circle = L.circle([centerLat, centerLng], {
        radius: radiusKm * 1000,
        color: "#714B67",
        weight: 2,
        dashArray: "4, 6",
        fillColor: "#9333ea",
        fillOpacity: 0.12,
      }).addTo(map);
      radiusCircleRef.current = circle;
    } else {
      radiusCircleRef.current.setLatLng([centerLat, centerLng]);
      radiusCircleRef.current.setRadius(radiusKm * 1000);
    }

    // Pan map smoothly to new center
    map.panTo([centerLat, centerLng], { animate: true, duration: 0.8 });
  }, [centerLat, centerLng, radiusKm, mapReady]);

  // 3. Render Discovered Leads as Clickable Pins on the Map
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = leadMarkersGroupRef.current;
    if (!map || !group || !mapReady) return;

    group.clearLayers();

    leads.forEach((lead) => {
      if (lead.latitude === undefined || lead.longitude === undefined) return;

      const isHot = lead.lead_temperature === "HOT_BUYER";
      const isWarm = lead.lead_temperature === "WARM_PROSPECT";
      const pinColor = isHot ? "#EF4444" : isWarm ? "#F59E0B" : "#10B981";

      const leadIcon = L.divIcon({
        className: "custom-lead-pin",
        html: `
          <div style="position: relative; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            <div style="width: 24px; height: 24px; border-radius: 9999px; background-color: ${pinColor}; border: 2px solid #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; color: white;">
              <span style="font-size: 10px; font-weight: bold;">${isHot ? "🔥" : "📍"}</span>
            </div>
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });

      const leadMarker = L.marker([lead.latitude, lead.longitude], { icon: leadIcon });

      // Interactive popup
      const cleanDigits = lead.phone.replace(/[^0-9]/g, "");
      const waUrl = lead.whatsapp_click_url;

      const popupContent = `
        <div style="font-family: inherit; min-width: 200px; padding: 2px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px; margin-bottom: 4px;">
            <strong style="font-size: 12px; color: #1E293B;">${lead.company_name}</strong>
            <span style="font-size: 9px; font-weight: bold; background: ${isHot ? '#FEE2E2' : '#FEF3C7'}; color: ${isHot ? '#991B1B' : '#92400E'}; padding: 1px 5px; border-radius: 4px;">
              ${lead.lead_temperature || 'LEAD'}
            </span>
          </div>
          <div style="font-size: 11px; color: #64748B; margin-bottom: 2px;">
            👤 ${lead.founder_name} (${lead.title})
          </div>
          <div style="font-size: 10px; color: #475569; margin-bottom: 6px;">
            📍 ${lead.nearby_landmark || lead.area}
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; font-size: 11px; font-weight: bold; color: #714B67; margin-bottom: 8px;">
            <span>${formatCurrency(lead.deal_value)} / mo</span>
            <span style="font-size: 10px; color: #10B981;">⭐ ${lead.google_rating || '4.8'} (${lead.review_count || 120})</span>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
            <a href="${waUrl}" target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; justify-content: center; gap: 4px; background: #059669; color: white; padding: 6px; border-radius: 6px; font-size: 10px; font-weight: bold; text-decoration: none; text-align: center;">
              💬 WhatsApp
            </a>
            <a href="tel:${cleanDigits}" style="display: flex; align-items: center; justify-content: center; gap: 4px; background: #3B82F6; color: white; padding: 6px; border-radius: 6px; font-size: 10px; font-weight: bold; text-decoration: none; text-align: center;">
              📞 Call
            </a>
          </div>
        </div>
      `;

      leadMarker.bindPopup(popupContent, { maxWidth: 260 });
      leadMarker.on("click", () => onSelectLead(lead));

      leadMarker.addTo(group);
    });
  }, [leads, mapReady]);

  return (
    <div className="relative w-full h-[280px] sm:h-[360px] md:h-[400px] rounded-xl overflow-hidden border border-slate-200 shadow-inner bg-slate-100">
      {/* Map Target Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Top Overlay: Pinpoint Instructions & Current Coords */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="bg-white/95 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-slate-200/90 shadow-sm pointer-events-auto flex items-center gap-2 text-xs">
          <div className="w-2.5 h-2.5 rounded-full bg-[#714B67] animate-pulse shrink-0" />
          <div className="truncate max-w-[210px] sm:max-w-xs">
            <span className="font-bold text-slate-800 text-[11px] block truncate">
              {pinpointLandmark || `${centerLat.toFixed(3)}°N, ${centerLng.toFixed(3)}°E`}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              Radius: {radiusKm} km • Tap map anywhere to drop pin
            </span>
          </div>
        </div>

        {/* Action Controls: GPS Locate Me & Map Switcher */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          {onLocateMe && (
            <button
              type="button"
              onClick={onLocateMe}
              disabled={isLocating}
              className="px-2.5 py-1.5 bg-white/95 hover:bg-white text-slate-700 hover:text-[#714B67] rounded-lg border border-slate-200 shadow-sm text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
              title="Use Phone GPS to pinpoint exact current location"
            >
              {isLocating ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#714B67]" />
              ) : (
                <Navigation className="w-3.5 h-3.5 text-blue-600 fill-blue-600" />
              )}
              <span className="hidden sm:inline">My GPS</span>
            </button>
          )}

          <div className="bg-white/95 backdrop-blur-md rounded-lg border border-slate-200 shadow-sm p-0.5 flex text-[10px] font-semibold">
            <button
              type="button"
              onClick={() => setMapStyle("standard")}
              className={cn(
                "px-2 py-1 rounded transition",
                mapStyle === "standard" ? "bg-[#714B67] text-white" : "text-slate-600 hover:text-slate-900"
              )}
            >
              Map
            </button>
            <button
              type="button"
              onClick={() => setMapStyle("satellite")}
              className={cn(
                "px-2 py-1 rounded transition",
                mapStyle === "satellite" ? "bg-[#714B67] text-white" : "text-slate-600 hover:text-slate-900"
              )}
            >
              Satellite
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Hint Banner for Touch Devices */}
      <div className="absolute bottom-2.5 left-2.5 z-10 pointer-events-none">
        <div className="bg-slate-900/85 backdrop-blur-md text-white text-[10px] px-2.5 py-1 rounded-md shadow-sm border border-slate-700/60 font-mono flex items-center gap-1.5">
          <MapPin size={11} className="text-red-400" />
          <span>Tap/Drag pin to set center • {leads.length} leads mapped</span>
        </div>
      </div>
    </div>
  );
}
