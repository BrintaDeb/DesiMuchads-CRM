"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import {
  Navigation,
  MapPin,
  Radio,
  Compass,
  RefreshCw,
  Layers,
  ExternalLink,
  MessageSquare,
  Phone,
  Maximize2,
  Crosshair,
  Sliders,
} from "lucide-react";
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
  invalidateSignal?: any;
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
  invalidateSignal,
}: PinpointLeafletMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const centerMarkerRef = useRef<L.Marker | null>(null);
  const radiusCircleRef = useRef<L.Circle | null>(null);
  const leadMarkersGroupRef = useRef<L.LayerGroup | null>(null);

  const [mapReady, setMapReady] = useState(false);
  const [mapStyle, setMapStyle] = useState<"standard" | "satellite">("standard");

  // Helper to safely invalidate map size on container dimension shifts
  const triggerInvalidateSize = useCallback(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.invalidateSize({ pan: false });
    }
  }, []);

  // 1. Initialize Map instance
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Initialize Leaflet map with touch-friendly mobile defaults
    const map = L.map(mapContainerRef.current, {
      center: [centerLat, centerLng],
      zoom: radiusKm <= 1 ? 15 : radiusKm <= 5 ? 13 : radiusKm <= 15 ? 12 : 10,
      zoomControl: false,
      attributionControl: false,
      tapHold: true,
      touchZoom: true,
      doubleClickZoom: true,
      scrollWheelZoom: true,
    });

    // Touch-friendly zoom control on bottom right
    L.control.zoom({ position: "bottomright" }).addTo(map);

    // Initial Tile Layer
    const tileUrl = "https://{s}.tile.openstreetmap.org/{z}/{y}/{x}.png";
    const tiles = L.tileLayer(tileUrl, {
      maxZoom: 19,
      crossOrigin: true,
    }).addTo(map);
    tileLayerRef.current = tiles;

    // Single Tap / Click anywhere on map to pinpoint new search beacon
    map.on("click", async (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      let placeName = "";

      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16`,
          { headers: { "Accept-Language": "en" } }
        );
        if (res.ok) {
          const data = await res.json();
          if (data?.display_name) {
            const parts = data.display_name.split(",");
            placeName = parts.slice(0, 3).join(",").trim();
          }
        }
      } catch {}

      onPinpointChange(lat, lng, placeName);
    });

    // Layer group for discovered lead pins
    const leadGroup = L.layerGroup().addTo(map);
    leadMarkersGroupRef.current = leadGroup;

    mapInstanceRef.current = map;
    setMapReady(true);

    // Invalidate size immediately, at 150ms, and at 450ms for mobile animation completion
    setTimeout(() => map.invalidateSize(), 150);
    setTimeout(() => map.invalidateSize(), 450);

    // Also attach resize listener for phone orientation changes
    const handleResize = () => map.invalidateSize();
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
      map.remove();
      mapInstanceRef.current = null;
      tileLayerRef.current = null;
    };
  }, []);

  // 2. React to tile style change (Standard OSM vs Esri Satellite)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const tileUrl =
      mapStyle === "satellite"
        ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        : "https://{s}.tile.openstreetmap.org/{z}/{y}/{x}.png";

    const newTiles = L.tileLayer(tileUrl, {
      maxZoom: 19,
      crossOrigin: true,
    }).addTo(map);

    tileLayerRef.current = newTiles;
    map.invalidateSize();
  }, [mapStyle, mapReady]);

  // 3. React to invalidate signals (e.g. switching tabs on mobile)
  useEffect(() => {
    if (mapReady) {
      triggerInvalidateSize();
      const t = setTimeout(triggerInvalidateSize, 120);
      return () => clearTimeout(t);
    }
  }, [invalidateSignal, mapReady, triggerInvalidateSize]);

  // 4. Update Center Beacon & Radius Circle when coords/radius change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    // Custom Pulsing Radar Beacon
    const centerIcon = L.divIcon({
      className: "custom-center-pin",
      html: `
        <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; cursor: grab;">
          <div style="position: absolute; width: 36px; height: 36px; border-radius: 9999px; background-color: rgba(113, 75, 103, 0.4); animation: ping 1.6s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: relative; width: 28px; height: 28px; border-radius: 9999px; background-color: #714B67; border: 2.5px solid #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: white;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
          </div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    // Update or create Center Marker
    if (!centerMarkerRef.current) {
      const marker = L.marker([centerLat, centerLng], {
        icon: centerIcon,
        draggable: true,
        autoPan: true,
      }).addTo(map);

      marker.on("dragend", async () => {
        const pos = marker.getLatLng();
        let name = "";
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.lat}&lon=${pos.lng}&zoom=16`,
            { headers: { "Accept-Language": "en" } }
          );
          if (res.ok) {
            const data = await res.json();
            if (data?.display_name) {
              name = data.display_name.split(",").slice(0, 3).join(",").trim();
            }
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
        dashArray: "5, 6",
        fillColor: "#714B67",
        fillOpacity: 0.12,
      }).addTo(map);
      radiusCircleRef.current = circle;
    } else {
      radiusCircleRef.current.setLatLng([centerLat, centerLng]);
      radiusCircleRef.current.setRadius(radiusKm * 1000);
    }

    // Smoothly pan map to new coordinates
    map.panTo([centerLat, centerLng], { animate: true, duration: 0.6 });
    map.invalidateSize();
  }, [centerLat, centerLng, radiusKm, mapReady]);

  // 5. Render Discovered Leads as Interactive Pins on the Map
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
          <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            <div style="width: 26px; height: 26px; border-radius: 9999px; background-color: ${pinColor}; border: 2px solid #ffffff; box-shadow: 0 3px 8px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; color: white;">
              <span style="font-size: 11px; font-weight: bold;">${isHot ? "🔥" : "📍"}</span>
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const leadMarker = L.marker([lead.latitude, lead.longitude], { icon: leadIcon });

      // Clean phone number for tel: link
      const cleanDigits = lead.phone.replace(/[^0-9]/g, "");
      const waUrl = lead.whatsapp_click_url;

      const popupContent = `
        <div style="font-family: system-ui, -apple-system, sans-serif; min-width: 210px; max-width: 250px; padding: 2px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px; margin-bottom: 4px;">
            <strong style="font-size: 13px; color: #0F172A; line-height: 1.2;">${lead.company_name}</strong>
            <span style="font-size: 9px; font-weight: 800; background: ${isHot ? '#FEE2E2' : '#FEF3C7'}; color: ${isHot ? '#991B1B' : '#92400E'}; padding: 1px 5px; border-radius: 4px;">
              ${lead.lead_temperature || 'LEAD'}
            </span>
          </div>
          <div style="font-size: 11px; color: #475569; margin-bottom: 3px;">
            👤 ${lead.founder_name} <span style="color: #64748B;">(${lead.title})</span>
          </div>
          <div style="font-size: 10px; color: #64748B; margin-bottom: 6px;">
            📍 ${lead.nearby_landmark || lead.area}
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; font-size: 11px; font-weight: 700; color: #714B67; margin-bottom: 8px;">
            <span>${formatCurrency(lead.deal_value)} / mo</span>
            <span style="font-size: 10px; color: #059669;">⭐ ${lead.google_rating || '4.8'} (${lead.review_count || 120})</span>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
            <a href="${waUrl}" target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; justify-content: center; gap: 4px; background: #059669; color: white; padding: 6px; border-radius: 6px; font-size: 11px; font-weight: 700; text-decoration: none; text-align: center;">
              💬 WhatsApp
            </a>
            <a href="tel:${cleanDigits}" style="display: flex; align-items: center; justify-content: center; gap: 4px; background: #2563EB; color: white; padding: 6px; border-radius: 6px; font-size: 11px; font-weight: 700; text-decoration: none; text-align: center;">
              📞 Call
            </a>
          </div>
        </div>
      `;

      leadMarker.bindPopup(popupContent, { maxWidth: 260, autoPanPadding: [20, 20] });
      leadMarker.on("click", () => onSelectLead(lead));
      leadMarker.addTo(group);
    });
  }, [leads, mapReady]);

  // Center & Fit Bounds
  const handleRecenter = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.setView([centerLat, centerLng], radiusKm <= 1 ? 15 : radiusKm <= 5 ? 13 : radiusKm <= 15 ? 12 : 10, { animate: true });
    triggerInvalidateSize();
  };

  return (
    <div className="relative w-full h-[300px] sm:h-[380px] md:h-[420px] rounded-xl overflow-hidden border border-slate-200 shadow-inner bg-slate-100 touch-pan-x touch-pan-y">
      {/* Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full z-0" style={{ touchAction: "pan-x pan-y" }} />

      {/* Top Floating Controls Banner */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Landmark & Radius Tag */}
        <div className="bg-white/95 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-sm pointer-events-auto flex items-center gap-2 text-xs">
          <div className="w-2.5 h-2.5 rounded-full bg-[#714B67] animate-pulse shrink-0" />
          <div className="truncate max-w-[190px] sm:max-w-xs">
            <span className="font-bold text-slate-800 text-[11px] block truncate">
              {pinpointLandmark || `${centerLat.toFixed(3)}°N, ${centerLng.toFixed(3)}°E`}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              Coverage: <strong>{radiusKm} km</strong> • Tap anywhere to drop pin
            </span>
          </div>
        </div>

        {/* Action Controls: GPS, Re-Center & Satellite Toggle */}
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

          <button
            type="button"
            onClick={handleRecenter}
            className="p-1.5 bg-white/95 hover:bg-white text-slate-700 hover:text-[#714B67] rounded-lg border border-slate-200 shadow-sm text-xs transition"
            title="Re-center map to radar beacon"
          >
            <Crosshair className="w-3.5 h-3.5" />
          </button>

          {/* Map vs Satellite Style Toggle */}
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

      {/* Bottom Hint Banner for Remote Mobile Devices */}
      <div className="absolute bottom-2.5 left-2.5 z-10 pointer-events-none">
        <div className="bg-slate-900/90 backdrop-blur-md text-white text-[10px] px-2.5 py-1 rounded-md shadow-sm border border-slate-700 font-mono flex items-center gap-1.5">
          <MapPin size={11} className="text-red-400" />
          <span>Tap map or drag beacon • {leads.length} leads in radius</span>
        </div>
      </div>
    </div>
  );
}
