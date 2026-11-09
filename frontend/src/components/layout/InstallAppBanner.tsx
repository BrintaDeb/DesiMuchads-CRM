"use client";

import React, { useState, useEffect } from "react";
import { Download, Smartphone, X, Check, Apple, Sparkles, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function InstallAppBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSTip, setShowIOSTip] = useState(false);

  useEffect(() => {
    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Listen for beforeinstallprompt (Android / Chrome)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        toast.success("Thank you for installing The Desi Muchads OS!");
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSTip(true);
    } else {
      // Trigger APK download directly
      handleDownloadAPK();
    }
  };

  const handleDownloadAPK = () => {
    const link = document.createElement("a");
    link.href = "/desi-muchads-os.apk";
    link.download = "The-Desi-Muchads-AgencyOS.apk";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Downloading The Desi Muchads Android APK package...", {
      description: "Direct server-connected mobile client (v2.4.0)",
    });
  };

  if (isDismissed) return null;

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-18 md:bottom-4 right-3 md:right-4 z-50 p-2.5 bg-[#714B67] hover:bg-[#5E3E55] text-white rounded-full shadow-xl border border-white/20 flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 group"
        title="Download / Install Mobile App"
      >
        <div className="w-5 h-5 rounded-full overflow-hidden bg-black flex items-center justify-center shrink-0 border border-white/20">
          <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover" />
        </div>
        <span className="text-[11px] font-bold pr-1 hidden sm:inline">Get App</span>
        <Download className="w-3.5 h-3.5 text-white animate-bounce" />
      </button>
    );
  }

  return (
    <aside
      aria-label="Download mobile app"
      className="fixed bottom-18 md:bottom-4 right-3 md:right-4 z-50 w-[310px] sm:w-[330px] bg-[#09090B] text-white border border-[#714B67]/70 rounded-2xl shadow-2xl p-3.5 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-3 duration-200"
    >
      {/* Top row: Brand & Close */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl overflow-hidden bg-black flex items-center justify-center shrink-0 border border-white/20 shadow-xs relative">
            <img src="/logo.jpg" alt="Desi Muchads" className="w-full h-full object-cover" />
            <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="font-bold text-xs text-white tracking-tight">The Desi Muchads OS</h4>
              <span className="text-[9px] font-mono bg-purple-950 text-purple-300 px-1.5 py-0.2 rounded border border-purple-800">
                v2.4
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">Android APK & iOS Mobile App</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1 text-zinc-400 hover:text-white rounded hover:bg-white/10 transition"
            title="Minimize"
          >
            <span className="text-xs font-bold leading-none block px-0.5">_</span>
          </button>
          <button
            onClick={() => setIsDismissed(true)}
            className="p-1 text-zinc-400 hover:text-white rounded hover:bg-white/10 transition"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Feature Bullet Strip */}
      <div className="mt-2.5 py-1.5 px-2 bg-zinc-900/80 rounded-lg border border-zinc-800 text-[10px] text-zinc-300 flex items-center justify-between">
        <span className="flex items-center gap-1">
          <Check className="w-3 h-3 text-emerald-400 shrink-0" /> Live Workflows
        </span>
        <span className="flex items-center gap-1">
          <Check className="w-3 h-3 text-emerald-400 shrink-0" /> Push Alerts
        </span>
        <span className="flex items-center gap-1">
          <Check className="w-3 h-3 text-emerald-400 shrink-0" /> Direct Backend
        </span>
      </div>

      {/* Action Buttons */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          onClick={handleDownloadAPK}
          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-[#714B67] hover:bg-[#5E3E55] active:bg-[#4E3246] text-white rounded-xl text-xs font-bold shadow-sm transition hover:scale-102 active:scale-98"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download APK</span>
        </button>

        <button
          onClick={handleInstallPWA}
          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-white rounded-xl text-xs font-bold border border-zinc-700 transition hover:scale-102 active:scale-98"
        >
          {isIOS ? <Apple className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}
          <span>{isIOS ? "iOS Install" : "Install App"}</span>
        </button>
      </div>

      {/* iOS Instructions Drawer if requested */}
      {showIOSTip && (
        <div className="mt-2.5 p-2 bg-purple-950/70 border border-purple-800/80 rounded-lg text-[10px] text-purple-200 space-y-1 animate-in fade-in">
          <p className="font-bold flex items-center gap-1 text-white">
            <Share2 className="w-3 h-3 text-purple-400" /> How to install on iPhone Safari:
          </p>
          <p>1. Tap the Share button (⎋ box with arrow up) at the bottom.</p>
          <p>2. Scroll down & tap <strong>"Add to Home Screen"</strong>.</p>
        </div>
      )}
    </aside>
  );
}

