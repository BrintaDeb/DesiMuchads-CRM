"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  CalendarDays,
  Plus,
  ArrowRight,
  Sparkles,
  Check,
  RotateCcw,
  Clock,
  Instagram,
  Linkedin,
  Youtube,
  Globe,
  Share2,
  ExternalLink,
  Upload,
  X,
  FileCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ContentApprovalStatus, ContentPlatform, ContentType } from "@/types";
import { api } from "@/lib/api";
import { OdooControlPanel, ViewMode } from "@/components/layout/OdooControlPanel";

interface ContentCard {
  id: string;
  client_name: string;
  platform: ContentPlatform;
  content_type: ContentType;
  title: string;
  caption: string;
  media_url: string;
  scheduled_for: string;
  approval_status: ContentApprovalStatus;
  version: number;
  client_feedback?: string;
}

const initialContent: ContentCard[] = [
  {
    id: "c1",
    client_name: "Bombay Chai Co.",
    platform: "INSTAGRAM",
    content_type: "REEL",
    title: "The Winter Masala Ritual: Kadak Chai Symphony",
    caption:
      "There is nothing quite like a steaming cup of handmade kadak chai on a cold evening. Tap the link in bio to shop our freshly ground spices! ☕🍂 #BombayChai #ChaiLove #WinterVibes",
    media_url: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80",
    scheduled_for: "2026-11-14T18:00:00Z",
    approval_status: "CLIENT_REVIEW",
    version: 1,
  },
  {
    id: "c2",
    client_name: "Urban Vibe Apparels",
    platform: "LINKEDIN",
    content_type: "CAROUSEL",
    title: "How Sustainable D2C Fashion Scales Without Sacrificing Margins",
    caption:
      "A breakdown of the supply chain architecture behind zero-waste organic cotton apparel. Swipe through for the unit economics framework.",
    media_url: "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=800&q=80",
    scheduled_for: "2026-11-16T10:30:00Z",
    approval_status: "INTERNAL_QA",
    version: 2,
    client_feedback: "Previous feedback: Make slide 3 chart easier to read.",
  },
  {
    id: "c3",
    client_name: "Bombay Chai Co.",
    platform: "META_ADS",
    content_type: "STATIC",
    title: "Festive Gift Box Early Bird Offer (ROAS Retargeting)",
    caption:
      "Save 25% on our Royal Heritage Tea Hampers. Handcrafted brass strainer included with first 500 orders. Shop now before holiday cutoff.",
    media_url: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=800&q=80",
    scheduled_for: "2026-11-18T12:00:00Z",
    approval_status: "APPROVED",
    version: 1,
  },
  {
    id: "c4",
    client_name: "FinPulse Global",
    platform: "YOUTUBE",
    content_type: "VIDEO",
    title: "API-First Banking: Explaining Webhooks & Ledger Immutability",
    caption:
      "A 60-second animated explainer showing how high-throughput transactional ledgers prevent double-spend errors in modern fintech.",
    media_url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80",
    scheduled_for: "2026-11-20T14:00:00Z",
    approval_status: "DRAFTING",
    version: 1,
  },
];

export default function ContentCalendarPage() {
  const [items, setItems] = useState<ContentCard[]>(initialContent);
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [searchQuery, setSearchQuery] = useState("");
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Form state
  const [newClient, setNewClient] = useState("Bombay Chai Co.");
  const [newPlatform, setNewPlatform] = useState<ContentPlatform>("INSTAGRAM");
  const [newType, setNewType] = useState<ContentType>("REEL");
  const [newTitle, setNewTitle] = useState("");
  const [newCaption, setNewCaption] = useState("");
  const [newDate, setNewDate] = useState("2026-11-22T15:00");
  const [uploadedMediaUrl, setUploadedMediaUrl] = useState("https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80");
  const [isUploading, setIsUploading] = useState(false);

  // AI Hook & Storyboard Studio state
  const [isAIHookStudioOpen, setIsAIHookStudioOpen] = useState(false);
  const [hookBrand, setHookBrand] = useState("Bombay Chai Co.");
  const [hookTopic, setHookTopic] = useState("Winter Kadak Masala Symphony");
  const [hookFormat, setHookFormat] = useState("REEL");
  const [isGeneratingHooks, setIsGeneratingHooks] = useState(false);
  const [generatedHooksData, setGeneratedHooksData] = useState<any>(null);
  const aiHookDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = aiHookDialogRef.current;
    if (!dialog) return;
    if (isAIHookStudioOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isAIHookStudioOpen && dialog.open) {
      dialog.close();
    }
  }, [isAIHookStudioOpen]);

  const handleGenerateHooks = async () => {
    setIsGeneratingHooks(true);
    try {
      const res = await api.post("/ai/creative-hooks", {
        brand_name: hookBrand,
        topic: hookTopic,
        format_type: hookFormat,
      });
      setGeneratedHooksData(res.data?.data);
      toast.success("AI Hooks & Storyboard generated via Gemini AI!");
    } catch {
      setGeneratedHooksData({
        hooks: [
          { type: "Desi Cultural Punchline Hook", hook: `Dadi ke nuskhe fail ho gaye? Here is the real secret behind ${hookTopic}!`, cta: `Tap link in bio for ${hookBrand}.` },
          { type: "Curiosity & Shock Hook", hook: `Stop scrolling if you're still doing ${hookTopic} the old way in 2026. This changes everything.`, cta: `Save this reel before the algorithm hides it! Link in bio.` },
          { type: "Problem-Agitator Hook", hook: `Tired of wasting money? Here are 3 red flags you're ignoring with ${hookTopic}.`, cta: `DM us '${hookBrand.toUpperCase()}' for details.` },
          { type: "Urgency / Scarcity Hook", hook: `Only 48 hours left! Limited holiday batch dropping today.`, cta: `Grab yours at ${hookBrand} with code MUCHAD10.` },
          { type: "Direct Value Proposition Hook", hook: `How ${hookBrand} helped 10,000+ customers master ${hookTopic}.`, cta: `Tap shop now to experience the difference.` }
        ],
        storyboard: [
          { timestamp: "0:00 - 0:03", visual: "Fast zoom-in dynamic text hook on screen", audio: "Punchy trending acoustic hook beat" },
          { timestamp: "0:03 - 0:07", visual: "Split-screen comparison showing typical consumer frustration", audio: "Narrator voiceover addressing pain point" },
          { timestamp: "0:07 - 0:12", visual: `Introduce ${hookBrand} with aesthetic close-up product shot`, audio: "Upbeat sound effect with product reveal" },
          { timestamp: "0:12 - 0:15", visual: "Strong on-screen CTA pointing to link in bio", audio: "Brand audio sting" }
        ],
        hashtags: [`#${hookBrand.replace(/\s+/g, '')}`, `#${hookTopic.split(' ')[0]}Love`, "#DesiMuchadsGrowth", "#MarketingMagic", "#ReelTrends2026"]
      });
      toast.success("AI Hooks & Storyboard formulated!");
    } finally {
      setIsGeneratingHooks(false);
    }
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isScheduleModalOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isScheduleModalOpen && dialog.open) {
      dialog.close();
    }
  }, [isScheduleModalOpen]);

  const getPlatformIcon = (platform: ContentPlatform) => {
    switch (platform) {
      case "INSTAGRAM":
        return <Instagram size={14} className="text-pink-600" />;
      case "LINKEDIN":
        return <Linkedin size={14} className="text-blue-600" />;
      case "YOUTUBE":
        return <Youtube size={14} className="text-red-600" />;
      default:
        return <Globe size={14} className="text-purple-600" />;
    }
  };

  const getApprovalBadge = (status: ContentApprovalStatus) => {
    switch (status) {
      case "APPROVED":
      case "PUBLISHED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "CLIENT_REVIEW":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "INTERNAL_QA":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "REVISION_REQUESTED":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const presignResp = await api.post("/assets/presign-upload", {
        filename: file.name,
        content_type: file.type || "image/jpeg",
        folder: "content",
      });

      const { upload_url, method, storage_key, file_url, provider } = presignResp.data.data;

      if (provider === "LOCAL_STORAGE" || upload_url.includes("/api/v1/assets/upload")) {
        const formData = new FormData();
        formData.append("file", file);
        const uploadResp = await api.post(`/assets/upload?storage_key=${storage_key}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setUploadedMediaUrl(uploadResp.data.data.file_url);
      } else {
        await fetch(upload_url, {
          method: method || "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });
        setUploadedMediaUrl(file_url);
      }
      toast.success(`Asset "${file.name}" uploaded successfully!`);
    } catch {
      const previewUrl = URL.createObjectURL(file);
      setUploadedMediaUrl(previewUrl);
      toast.success(`Asset preview loaded.`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateContent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) {
      toast.error("Please enter a title");
      return;
    }

    const newItem: ContentCard = {
      id: `c${Date.now()}`,
      client_name: newClient,
      platform: newPlatform,
      content_type: newType,
      title: newTitle,
      caption: newCaption || "Draft caption prepared for client review.",
      media_url: uploadedMediaUrl,
      scheduled_for: new Date(newDate).toISOString(),
      approval_status: "DRAFTING",
      version: 1,
    };

    setItems((prev) => [newItem, ...prev]);
    setIsScheduleModalOpen(false);
    setNewTitle("");
    setNewCaption("");
    toast.success("New content slot scheduled! State: Drafting.");
  };

  const handleSpecialistSubmit = (id: string) => {
    setItems((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, approval_status: "INTERNAL_QA" } : i
      )
    );
    toast.success("Submitted to Account Lead for Internal QA");
  };

  const handleManagerForward = (id: string) => {
    setItems((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, approval_status: "CLIENT_REVIEW" } : i
      )
    );
    toast.info("Rule 2 Executed: Forwarded to Client Portal for 1-click review");
  };

  const handleClientDecision = (id: string, decision: "APPROVED" | "REVISION") => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.id === id) {
          if (decision === "APPROVED") {
            return { ...i, approval_status: "APPROVED" };
          } else {
            return {
              ...i,
              approval_status: "REVISION_REQUESTED",
              version: i.version + 1,
              client_feedback: "Client requested minor adjustment to hook and color balance.",
            };
          }
        }
        return i;
      })
    );
    toast.success(decision === "APPROVED" ? "Deliverable approved by client!" : "Revision requested. Returned to specialist.");
  };

  const filteredItems = items.filter(
    (i) =>
      i.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.platform.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      {/* Odoo Control Panel Sub-Header */}
      <OdooControlPanel
        appName="Content Approvals"
        viewName="Two-Tier Approval Pipeline"
        onNewClick={() => setIsScheduleModalOpen(true)}
        newButtonLabel="Schedule Deliverable"
        activeView={viewMode}
        onViewChange={setViewMode}
        availableViews={["kanban", "list"]}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        totalCount={filteredItems.length}
        secondaryActions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAIHookStudioOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-[#714B67] border border-purple-200 text-xs font-semibold transition-colors shadow-xs"
            >
              <Sparkles size={13} className="text-[#714B67]" />
              <span>AI Hook Studio</span>
            </button>
            <span className="text-[11px] font-mono px-2 py-1 rounded bg-pink-50 text-pink-700 border border-pink-200 hidden sm:inline-block">
              Two-Tier Approval Gate
            </span>
          </div>
        }
      />

      {/* Odoo Workflow Stage Banner */}
      <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs mb-6 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-semibold">1. Drafting</span>
          <ArrowRight size={12} className="text-slate-400" />
          <span className="px-2.5 py-1 rounded-md bg-purple-50 text-[#714B67] border border-purple-200 font-semibold">2. Internal QA</span>
          <ArrowRight size={12} className="text-slate-400" />
          <span className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200 font-semibold">3. Client Review</span>
          <ArrowRight size={12} className="text-slate-400" />
          <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">4. Approved / Published</span>
        </div>
        <span className="text-slate-400 text-[11px]">S3 Presigned Media Uploads</span>
      </div>

      {/* Main Grid: Cards View */}
      {viewMode === "kanban" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow group"
            >
              <div>
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-200">
                      {getPlatformIcon(item.platform)}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">{item.client_name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {item.platform} • {item.content_type}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                      v{item.version}
                    </span>
                    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", getApprovalBadge(item.approval_status))}>
                      {item.approval_status.replace("_", " ")}
                    </span>
                  </div>
                </div>

                {/* Media Preview & Copy */}
                <div className="mt-3 space-y-2">
                  <div className="relative h-44 w-full rounded-lg bg-slate-100 overflow-hidden border border-slate-200">
                    <img
                      src={item.media_url}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                    />
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-xs text-[10px] font-mono text-white">
                      Drop: {new Date(item.scheduled_for).toLocaleDateString()}
                    </div>
                  </div>

                  <h3 className="text-xs font-bold text-slate-900 line-clamp-1">{item.title}</h3>
                  <p className="text-[11px] text-slate-600 line-clamp-3 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-sans">
                    {item.caption}
                  </p>

                  {item.client_feedback && (
                    <div className="text-[11px] text-amber-800 font-mono bg-amber-50 p-2 rounded-lg border border-amber-200">
                      💬 {item.client_feedback}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="pt-3 border-t border-slate-100 mt-3 space-y-2">
                {item.approval_status === "DRAFTING" && (
                  <button
                    onClick={() => handleSpecialistSubmit(item.id)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-purple-50 text-[#714B67] hover:bg-purple-100 font-bold text-xs border border-purple-200 transition-colors"
                  >
                    <Sparkles size={13} />
                    <span>Submit for Internal QA (Tier 1)</span>
                  </button>
                )}

                {item.approval_status === "INTERNAL_QA" && (
                  <button
                    onClick={() => handleManagerForward(item.id)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-amber-50 text-amber-800 hover:bg-amber-100 font-bold text-xs border border-amber-300 transition-colors"
                  >
                    <ArrowRight size={13} />
                    <span>Manager Pass → Client Review (Tier 2)</span>
                  </button>
                )}

                {item.approval_status === "CLIENT_REVIEW" && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-semibold text-slate-500 block text-center">
                      Client Portal Sign-Off Actions:
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleClientDecision(item.id, "APPROVED")}
                        className="flex items-center justify-center gap-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs"
                      >
                        <Check size={13} />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => handleClientDecision(item.id, "REVISION")}
                        className="flex items-center justify-center gap-1 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold border border-rose-200"
                      >
                        <RotateCcw size={13} />
                        <span>Request Edit</span>
                      </button>
                    </div>
                  </div>
                )}

                {item.approval_status === "APPROVED" && (
                  <div className="text-center py-1.5 font-mono text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center justify-center gap-1">
                    <Check size={13} />
                    <span>Scheduled for autonomous publishing</span>
                  </div>
                )}

                {item.approval_status === "REVISION_REQUESTED" && (
                  <button
                    onClick={() => handleSpecialistSubmit(item.id)}
                    className="w-full flex items-center justify-center gap-1 py-2 rounded-lg bg-purple-50 text-[#714B67] hover:bg-purple-100 text-xs font-bold border border-purple-200"
                  >
                    <RotateCcw size={13} />
                    <span>Re-Submit Fixed Asset (v{item.version + 1})</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Title / Deliverable</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Platform & Format</th>
                  <th className="py-3 px-4">Approval State</th>
                  <th className="py-3 px-4">Version</th>
                  <th className="py-3 px-4">Publish Date</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{item.title}</td>
                    <td className="py-3 px-4 text-slate-700">{item.client_name}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {item.platform} • {item.content_type}
                    </td>
                    <td className="py-3 px-4">
                      <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold border", getApprovalBadge(item.approval_status))}>
                        {item.approval_status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-600">v{item.version}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {new Date(item.scheduled_for).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {item.approval_status === "DRAFTING" && (
                        <button
                          onClick={() => handleSpecialistSubmit(item.id)}
                          className="px-2 py-1 rounded bg-purple-50 text-[#714B67] hover:bg-purple-100 font-semibold text-[11px] border border-purple-200"
                        >
                          Submit QA
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Schedule Deliverable Modal */}
      <dialog
        ref={dialogRef}
        onCancel={() => setIsScheduleModalOpen(false)}
        className="fixed inset-0 m-auto bg-white rounded-2xl max-w-lg w-full p-0 shadow-2xl border border-slate-200 backdrop:bg-slate-900/40 backdrop:backdrop-blur-sm overflow-hidden"
      >
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Schedule New Deliverable</h2>
            <p className="text-[11px] text-slate-500">Initiates drafting in Tier 1 of the Content State Machine.</p>
          </div>
          <button onClick={() => setIsScheduleModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleCreateContent} className="p-5 space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">CLIENT</label>
              <select
                value={newClient}
                onChange={(e) => setNewClient(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#714B67] focus:bg-white"
              >
                <option value="Bombay Chai Co.">Bombay Chai Co.</option>
                <option value="Urban Vibe Apparels">Urban Vibe Apparels</option>
                <option value="FinPulse Global">FinPulse Global</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">PLATFORM</label>
              <select
                value={newPlatform}
                onChange={(e) => setNewPlatform(e.target.value as ContentPlatform)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#714B67] focus:bg-white"
              >
                <option value="INSTAGRAM">Instagram</option>
                <option value="LINKEDIN">LinkedIn</option>
                <option value="YOUTUBE">YouTube</option>
                <option value="META_ADS">Meta Ads</option>
                <option value="GOOGLE_ADS">Google Ads</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">FORMAT</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as ContentType)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#714B67] focus:bg-white"
              >
                <option value="REEL">Vertical Reel / Short</option>
                <option value="CAROUSEL">Multi-Slide Carousel</option>
                <option value="STATIC">Static Graphic Ad</option>
                <option value="VIDEO">Long-Form Video</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">TARGET PUBLISH DATE</label>
              <input
                type="datetime-local"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#714B67] focus:bg-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">TITLE & HOOK</label>
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Kadak Chai Brewing Masterclass: Winter Drop"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#714B67] focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">CAPTION / COPY</label>
            <textarea
              rows={3}
              value={newCaption}
              onChange={(e) => setNewCaption(e.target.value)}
              placeholder="Write the full caption, hashtags, and call to action..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#714B67] focus:bg-white resize-none"
            />
          </div>

          {/* S3 Media Upload Area */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">CREATIVE ASSET UPLOAD (S3 PRE-SIGNED)</label>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
              <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 font-semibold cursor-pointer border border-slate-200 transition-colors shadow-xs">
                <Upload size={13} />
                <span>{isUploading ? "Uploading..." : "Upload File"}</span>
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isUploading}
                />
              </label>

              {uploadedMediaUrl && (
                <div className="flex items-center gap-2 truncate text-slate-600 text-xs font-mono">
                  <FileCheck size={14} className="text-emerald-600 shrink-0" />
                  <span className="truncate">{uploadedMediaUrl}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsScheduleModalOpen(false)}
              className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-800 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-[#714B67] hover:bg-[#58364F] text-white font-semibold text-xs transition-colors shadow-xs"
            >
              Schedule Deliverable
            </button>
          </div>
        </form>
      </dialog>

      {/* Modal 2: AI Hook & Creative Studio Dialog */}
      <dialog
        ref={aiHookDialogRef}
        onCancel={() => setIsAIHookStudioOpen(false)}
        className="fixed inset-0 m-auto bg-white rounded-2xl max-w-2xl w-full p-0 shadow-2xl border border-slate-200 backdrop:bg-slate-900/40 backdrop:backdrop-blur-sm overflow-hidden"
      >
        <div className="flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 flex items-start justify-between bg-slate-50">
            <div>
              <span className="text-[11px] font-semibold text-[#714B67] flex items-center gap-1">
                <Sparkles size={13} /> Gemini AI Multimodal Creative Studio
              </span>
              <h2 className="text-base font-bold text-slate-900 mt-0.5">
                Generate High-Converting Copy Hooks & Video Storyboard
              </h2>
              <p className="text-xs text-slate-500">
                Generate 5 tailored hooks, second-by-second audio/video beats, and hashtags.
              </p>
            </div>
            <button
              onClick={() => setIsAIHookStudioOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200"
            >
              <X size={16} />
            </button>
          </div>

          {/* Form & Results Container */}
          <div className="p-5 overflow-y-auto space-y-4 text-xs">
            {/* Controls */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Brand Name</label>
                <input
                  type="text"
                  value={hookBrand}
                  onChange={(e) => setHookBrand(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-[#714B67]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Campaign Topic / Angle</label>
                <input
                  type="text"
                  value={hookTopic}
                  onChange={(e) => setHookTopic(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-[#714B67]"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleGenerateHooks}
                  disabled={isGeneratingHooks}
                  className="w-full py-2 rounded-lg bg-[#714B67] hover:bg-[#58364F] text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  <Sparkles size={13} />
                  <span>{isGeneratingHooks ? "Synthesizing..." : "Generate Hooks"}</span>
                </button>
              </div>
            </div>

            {/* Generated Results */}
            {generatedHooksData ? (
              <div className="space-y-4">
                {/* 5 Hooks */}
                <div className="space-y-2">
                  <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block">
                    5 High-Converting Hook Variations:
                  </span>
                  <div className="grid grid-cols-1 gap-2">
                    {generatedHooksData.hooks?.map((h: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-white border border-slate-200 hover:border-[#714B67]/50 transition-colors space-y-1.5 shadow-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-50 text-[#714B67] border border-purple-200 font-semibold">
                            {h.type}
                          </span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(`${h.hook}\n\n${h.cta}`);
                              setNewCaption(`${h.hook}\n\n${h.cta}\n\n${generatedHooksData.hashtags?.join(" ") || ""}`);
                              toast.success("Hook copied and injected into caption editor!");
                            }}
                            className="text-[11px] text-[#714B67] hover:underline font-semibold"
                          >
                            Apply to Caption
                          </button>
                        </div>
                        <p className="text-xs font-semibold text-slate-900">&ldquo;{h.hook}&rdquo;</p>
                        <p className="text-[11px] text-slate-500 font-mono">CTA: {h.cta}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Video Shot List Storyboard */}
                {generatedHooksData.storyboard && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block">
                      Video Reel Shot-By-Shot Storyboard:
                    </span>
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                      {generatedHooksData.storyboard.map((shot: any, idx: number) => (
                        <div key={idx} className="p-2.5 flex items-start gap-3 bg-white text-xs">
                          <span className="font-mono font-bold text-[#714B67] text-[11px] w-20 shrink-0">
                            {shot.timestamp}
                          </span>
                          <div className="space-y-0.5">
                            <div className="text-slate-800 font-medium">🎬 Visual: {shot.visual}</div>
                            <div className="text-slate-500 text-[11px] font-mono">🎵 Audio: {shot.audio}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hashtags */}
                {generatedHooksData.hashtags && (
                  <div className="pt-2 flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="font-semibold text-slate-600 text-[11px]">Hashtags:</span>
                    {generatedHooksData.hashtags.map((tag: string, idx: number) => (
                      <span key={idx} className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[10px]">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                Click &ldquo;Generate Hooks&rdquo; to formulate 5 psychological copy angles and full video shot list.
              </div>
            )}
          </div>

          <div className="p-3.5 border-t border-slate-100 flex items-center justify-end bg-slate-50">
            <button
              onClick={() => setIsAIHookStudioOpen(false)}
              className="px-4 py-1.5 rounded-lg bg-[#714B67] hover:bg-[#58364F] text-white text-xs font-semibold"
            >
              Done
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
