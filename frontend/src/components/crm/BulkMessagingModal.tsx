"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Send,
  MessageSquare,
  Mail,
  Smartphone,
  Users,
  Sparkles,
  Copy,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  History,
  Play,
  RotateCw,
  Flame,
  Briefcase,
  Layers,
  ChevronRight,
  ShieldCheck,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { cn, formatCurrency } from "@/lib/utils";

interface BulkMessagingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AudienceSegment {
  key: string;
  label: string;
  count: number;
  description: string;
}

interface MessageTemplate {
  id: string;
  name: string;
  channel: "WHATSAPP" | "EMAIL" | "SMS";
  category: string;
  body: string;
}

interface SampleRecipient {
  recipient_name: string;
  target_identifier: string;
  rendered_message: string;
  whatsapp_url?: string;
  client_id?: string;
}

interface CampaignRecord {
  id: string;
  title: string;
  channel: string;
  target_audience: string;
  status: string;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
  completed_at?: string;
}

const TEMPLATE_VARIABLES = [
  { tag: "{{first_name}}", label: "First Name", sample: "Vikram" },
  { tag: "{{company_name}}", label: "Company", sample: "Raw Earth Organics" },
  { tag: "{{city}}", label: "City", sample: "Mumbai" },
  { tag: "{{deal_value}}", label: "Deal Value", sample: "₹85,000" },
  { tag: "{{niche}}", label: "Industry", sample: "D2C Cosmetics" },
];

export const BulkMessagingModal: React.FC<BulkMessagingModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<"compose" | "history">("compose");
  const [selectedChannel, setSelectedChannel] = useState<"WHATSAPP" | "EMAIL" | "SMS">("WHATSAPP");
  const [selectedAudience, setSelectedAudience] = useState<string>("ALL_LEADS");
  const [campaignTitle, setCampaignTitle] = useState<string>("Q4 High-Intent Outreach");
  const [messageTemplate, setMessageTemplate] = useState<string>(
    "Namaste {{first_name}} ji! We noticed {{company_name}} in {{city}} is scaling rapidly. Our creative team at Desi Muchads prepared a tailored performance blueprint for your brand. Can we share a 3-minute video breakdown?"
  );
  const [customRecipients, setCustomRecipients] = useState<string>("");

  const [audiences, setAudiences] = useState<AudienceSegment[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [sampleRecipients, setSampleRecipients] = useState<SampleRecipient[]>([]);
  const [totalRecipientsCount, setTotalRecipientsCount] = useState<number>(0);
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);

  const [isLoadingAudiences, setIsLoadingAudiences] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [openedWhatsAppIndices, setOpenedWhatsAppIndices] = useState<Set<number>>(new Set());

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch Audiences & Templates on open
  useEffect(() => {
    if (!isOpen) return;

    const fetchMetadata = async () => {
      setIsLoadingAudiences(true);
      try {
        const [audResp, tplResp] = await Promise.all([
          api.get("/crm/bulk-messaging/audiences"),
          api.get("/crm/bulk-messaging/templates"),
        ]);

        if (audResp.data?.data?.segments) {
          setAudiences(audResp.data.data.segments);
        }
        if (tplResp.data?.data) {
          setTemplates(tplResp.data.data);
        }
      } catch (err) {
        console.warn("Failed to load bulk messaging metadata, using local fallbacks:", err);
        setAudiences([
          { key: "ALL_LEADS", label: "All Leads & Opportunities", count: 8, description: "Every lead captured across all stages" },
          { key: "HOT_BUYERS", label: "Hot Buyers (Discovery / Proposal)", count: 4, description: "Active high-intent pipeline leads" },
          { key: "WON_CLIENTS", label: "Won Retainer Clients", count: 2, description: "Active monthly retainers" },
          { key: "TEAM", label: "Internal Team Members", count: 3, description: "Desi Muchads agency members" },
          { key: "CUSTOM", label: "Custom Contact List", count: 0, description: "Manual phone numbers or emails" },
        ]);
      } finally {
        setIsLoadingAudiences(false);
      }
    };

    fetchMetadata();
  }, [isOpen]);

  // Fetch campaign history when tab switched
  useEffect(() => {
    if (activeTab === "history" && isOpen) {
      loadCampaignHistory();
    }
  }, [activeTab, isOpen]);

  const loadCampaignHistory = async () => {
    try {
      const resp = await api.get("/crm/bulk-messaging/campaigns");
      if (resp.data?.data) {
        setCampaigns(resp.data.data);
      }
    } catch {
      // Local fallback
      setCampaigns([]);
    }
  };

  // Generate Preview
  const handleGeneratePreview = async () => {
    if (!messageTemplate.trim()) {
      toast.error("Please enter a message template.");
      return;
    }

    setIsPreviewLoading(true);
    try {
      const customList =
        selectedAudience === "CUSTOM"
          ? customRecipients
              .split("\n")
              .map((line) => {
                const parts = line.split(",").map((p) => p.trim());
                return {
                  name: parts[0] || "Client",
                  identifier: parts[1] || parts[0],
                  company: parts[2] || "Brand",
                  city: parts[3] || "India",
                };
              })
              .filter((c) => c.identifier)
          : undefined;

      const resp = await api.post("/crm/bulk-messaging/preview", {
        target_audience: selectedAudience,
        channel: selectedChannel,
        message_template: messageTemplate,
        custom_recipients: customList,
      });

      if (resp.data?.data) {
        setSampleRecipients(resp.data.data.sample_recipients || []);
        setTotalRecipientsCount(resp.data.data.total_count || 0);
        toast.success(`Preview updated for ${resp.data.data.total_count} recipients!`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Could not generate preview.");
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // Run preview automatically when audience or channel changes
  useEffect(() => {
    if (isOpen && messageTemplate) {
      const timer = setTimeout(() => {
        handleGeneratePreview();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [selectedAudience, selectedChannel, isOpen]);

  // Insert Variable Token
  const insertVariable = (tag: string) => {
    if (!textareaRef.current) {
      setMessageTemplate((prev) => prev + " " + tag);
      return;
    }

    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const current = messageTemplate;
    const updated = current.substring(0, start) + tag + current.substring(end);
    setMessageTemplate(updated);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(start + tag.length, start + tag.length);
      }
    }, 50);
  };

  // Apply Pre-configured Template
  const handleApplyTemplate = (tpl: MessageTemplate) => {
    setMessageTemplate(tpl.body);
    setSelectedChannel(tpl.channel);
    toast.success(`Applied template "${tpl.name}"!`);
  };

  // Dispatch Campaign
  const handleDispatch = async (autoSimulate: boolean = true) => {
    if (!campaignTitle.trim()) {
      toast.error("Please enter a campaign title.");
      return;
    }
    if (!messageTemplate.trim()) {
      toast.error("Please compose a message template.");
      return;
    }

    setIsDispatching(true);
    try {
      const customList =
        selectedAudience === "CUSTOM"
          ? customRecipients
              .split("\n")
              .map((line) => {
                const parts = line.split(",").map((p) => p.trim());
                return {
                  name: parts[0] || "Client",
                  identifier: parts[1] || parts[0],
                  company: parts[2] || "Brand",
                  city: parts[3] || "India",
                };
              })
              .filter((c) => c.identifier)
          : undefined;

      const resp = await api.post("/crm/bulk-messaging/dispatch", {
        title: campaignTitle,
        target_audience: selectedAudience,
        channel: selectedChannel,
        message_template: messageTemplate,
        custom_recipients: customList,
        auto_dispatch_simulation: autoSimulate,
      });

      if (resp.data?.data) {
        const camp = resp.data.data;
        toast.success(
          `Campaign "${camp.title}" dispatched! ${camp.sent_count} messages sent successfully.`
        );
        setActiveTab("history");
        loadCampaignHistory();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Dispatch failed. Please check your network.");
    } finally {
      setIsDispatching(false);
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    toast.success("Message copied to clipboard!");
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleOpenWhatsApp = (url?: string, idx?: number) => {
    if (!url) return;
    window.open(url, "_blank");
    if (idx !== undefined) {
      setOpenedWhatsAppIndices((prev) => new Set(prev).add(idx));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#714B67] via-[#5E3E55] to-[#45283E] px-6 py-4 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/20">
              <MessageSquare className="h-5 w-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight">Bulk Broadcast Studio</h2>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400 text-slate-900 shadow-xs">
                  Omni-Channel
                </span>
              </div>
              <p className="text-xs text-white/80">
                Segment-driven bulk outreach via WhatsApp, Email & SMS with variable personalization
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab Toggles */}
            <div className="bg-white/10 p-1 rounded-xl flex items-center gap-1 border border-white/10">
              <button
                onClick={() => setActiveTab("compose")}
                className={cn(
                  "px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5",
                  activeTab === "compose"
                    ? "bg-white text-[#714B67] shadow-sm"
                    : "text-white/80 hover:text-white"
                )}
              >
                <Send size={13} />
                <span>Composer</span>
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={cn(
                  "px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5",
                  activeTab === "history"
                    ? "bg-white text-[#714B67] shadow-sm"
                    : "text-white/80 hover:text-white"
                )}
              >
                <History size={13} />
                <span>History</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              title="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        {activeTab === "compose" ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Step 1: Target Audience Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Users size={14} className="text-[#714B67]" />
                  <span>1. Select Target Audience Segment</span>
                </label>
                <span className="text-[11px] text-slate-500 font-mono">
                  Total Reachable: <strong className="text-slate-800">{totalRecipientsCount} contacts</strong>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                {audiences.map((seg) => {
                  const isSelected = selectedAudience === seg.key;
                  return (
                    <button
                      key={seg.key}
                      onClick={() => setSelectedAudience(seg.key)}
                      className={cn(
                        "p-3 rounded-xl border text-left transition-all relative overflow-hidden group",
                        isSelected
                          ? "border-[#714B67] bg-[#FAF5FF] ring-2 ring-[#714B67]/30 shadow-sm"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700">
                          {seg.count} contacts
                        </span>
                        {isSelected && (
                          <CheckCircle2 size={14} className="text-[#714B67]" />
                        )}
                      </div>
                      <div className="text-xs font-bold text-slate-800 truncate group-hover:text-[#714B67]">
                        {seg.label}
                      </div>
                      <div className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                        {seg.description}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Custom Recipients Input Box if "CUSTOM" selected */}
              {selectedAudience === "CUSTOM" && (
                <div className="mt-3 p-3 rounded-xl border border-dashed border-amber-300 bg-amber-50/50 space-y-2">
                  <div className="flex items-center justify-between text-xs text-amber-800">
                    <span className="font-semibold">Enter contacts (one per line, comma-separated format):</span>
                    <span className="font-mono text-[10px]">Name, Phone/Email, Company, City</span>
                  </div>
                  <textarea
                    rows={3}
                    value={customRecipients}
                    onChange={(e) => setCustomRecipients(e.target.value)}
                    placeholder={"Rohit Roy, +919876543210, Roy Enterprises, Bengaluru\nAnanya Sharma, ananya@startup.io, CloudWave, Pune"}
                    className="w-full text-xs font-mono p-2.5 rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#714B67]"
                  />
                </div>
              )}
            </div>

            {/* Step 2: Channel & Preset Templates */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
              {/* Channel Selector */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-2 flex items-center gap-1.5">
                  <Layers size={14} className="text-[#714B67]" />
                  <span>2. Dispatch Channel</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setSelectedChannel("WHATSAPP")}
                    className={cn(
                      "p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1",
                      selectedChannel === "WHATSAPP"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/30 font-bold shadow-xs"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <MessageSquare size={16} className={selectedChannel === "WHATSAPP" ? "text-emerald-600" : "text-slate-400"} />
                    <span className="text-xs">WhatsApp</span>
                  </button>

                  <button
                    onClick={() => setSelectedChannel("EMAIL")}
                    className={cn(
                      "p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1",
                      selectedChannel === "EMAIL"
                        ? "border-blue-500 bg-blue-50 text-blue-800 ring-2 ring-blue-500/30 font-bold shadow-xs"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <Mail size={16} className={selectedChannel === "EMAIL" ? "text-blue-600" : "text-slate-400"} />
                    <span className="text-xs">Direct Email</span>
                  </button>

                  <button
                    onClick={() => setSelectedChannel("SMS")}
                    className={cn(
                      "p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1",
                      selectedChannel === "SMS"
                        ? "border-purple-500 bg-purple-50 text-purple-800 ring-2 ring-purple-500/30 font-bold shadow-xs"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <Smartphone size={16} className={selectedChannel === "SMS" ? "text-purple-600" : "text-slate-400"} />
                    <span className="text-xs">SMS Text</span>
                  </button>
                </div>
              </div>

              {/* Campaign Title & Quick Template Selector */}
              <div className="md:col-span-2 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Campaign Title
                  </label>
                  <span className="text-[11px] text-slate-400">Internal reference tag</span>
                </div>
                <input
                  type="text"
                  value={campaignTitle}
                  onChange={(e) => setCampaignTitle(e.target.value)}
                  placeholder="e.g., Diwali Growth Offer 2026"
                  className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#714B67]"
                />
              </div>
            </div>

            {/* Template Presets Picker */}
            {templates.length > 0 && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-amber-500" />
                    <span>High-Converting Preset Templates:</span>
                  </span>
                  <span className="text-[10px] text-slate-500">Click to apply to composer</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {templates.map((tpl) => (
                    <button
                      key={tpl.id}
                      onClick={() => handleApplyTemplate(tpl)}
                      className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-white hover:bg-[#FAF5FF] hover:border-[#714B67] text-slate-700 hover:text-[#714B67] transition-all flex items-center gap-1 font-medium shadow-2xs"
                    >
                      <span className="text-[10px] font-mono px-1 rounded bg-slate-100 text-slate-500 font-bold">
                        {tpl.channel}
                      </span>
                      <span>{tpl.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Message Template Composer with Variable Chips */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <MessageSquare size={14} className="text-[#714B67]" />
                  <span>3. Compose Template & Personalization Tags</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-slate-500">
                    {messageTemplate.length} chars
                  </span>
                  <button
                    onClick={handleGeneratePreview}
                    disabled={isPreviewLoading}
                    className="text-xs text-[#714B67] hover:underline font-semibold flex items-center gap-1"
                  >
                    <RotateCw size={12} className={isPreviewLoading ? "animate-spin" : ""} />
                    <span>Refresh Preview</span>
                  </button>
                </div>
              </div>

              {/* Variable Token Insertion Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pb-1">
                <span className="text-[11px] font-semibold text-slate-500 mr-1">Insert tag:</span>
                {TEMPLATE_VARIABLES.map((v) => (
                  <button
                    key={v.tag}
                    onClick={() => insertVariable(v.tag)}
                    className="px-2 py-0.5 rounded-md bg-purple-50 text-[#714B67] border border-purple-200 text-xs font-mono font-semibold hover:bg-purple-100 hover:border-purple-300 transition-colors"
                    title={`Click to insert ${v.tag} (${v.label})`}
                  >
                    {v.tag}
                  </button>
                ))}
              </div>

              <textarea
                ref={textareaRef}
                rows={4}
                value={messageTemplate}
                onChange={(e) => setMessageTemplate(e.target.value)}
                placeholder="Compose your personalized broadcast message here..."
                className="w-full text-xs font-sans p-3 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#714B67] leading-relaxed"
              />
            </div>

            {/* Step 4: Live Recipient Preview & 1-Tap Queue Runner */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Flame size={14} className="text-amber-500" />
                  <span>4. Real-Time Recipient Preview & 1-Tap Action Queue</span>
                </label>
                <span className="text-xs text-slate-500">
                  Showing {sampleRecipients.length} of {totalRecipientsCount} recipients
                </span>
              </div>

              {sampleRecipients.length === 0 ? (
                <div className="p-6 text-center border rounded-xl bg-slate-50 text-slate-500 text-xs">
                  No preview available. Select an audience segment with contacts or enter custom recipients.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {sampleRecipients.map((rec, idx) => {
                    const isWhatsAppOpened = openedWhatsAppIndices.has(idx);
                    return (
                      <div
                        key={idx}
                        className={cn(
                          "p-3 rounded-xl border transition-all bg-white flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs",
                          isWhatsAppOpened ? "border-emerald-300 bg-emerald-50/30" : "border-slate-200"
                        )}
                      >
                        {/* Recipient Details & Message */}
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-800">
                              {rec.recipient_name}
                            </span>
                            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
                              {rec.target_identifier}
                            </span>
                            {isWhatsAppOpened && (
                              <span className="text-[10px] font-semibold text-emerald-700 flex items-center gap-1 bg-emerald-100 px-1.5 py-0.2 rounded-full">
                                <Check size={10} />
                                <span>Opened in WhatsApp</span>
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 italic">
                            &ldquo;{rec.rendered_message}&rdquo;
                          </div>
                        </div>

                        {/* Action Buttons for this specific recipient */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => copyToClipboard(rec.rendered_message, idx)}
                            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs transition-colors"
                            title="Copy message to clipboard"
                          >
                            {copiedIndex === idx ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                          </button>

                          {selectedChannel === "WHATSAPP" && rec.whatsapp_url && (
                            <button
                              onClick={() => handleOpenWhatsApp(rec.whatsapp_url, idx)}
                              className={cn(
                                "px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all",
                                isWhatsAppOpened
                                  ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
                              )}
                              title="Open 1-Tap WhatsApp chat with pre-filled message"
                            >
                              <MessageSquare size={13} />
                              <span>1-Tap WhatsApp</span>
                              <ExternalLink size={11} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Tab 2: Broadcast History */
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Broadcast Campaign History</h3>
                <p className="text-xs text-slate-500">Complete audit log of dispatched and queued messages</p>
              </div>
              <button
                onClick={loadCampaignHistory}
                className="px-3 py-1.5 rounded-lg border text-xs font-semibold text-slate-600 hover:bg-slate-50 flex items-center gap-1.5"
              >
                <RotateCw size={12} />
                <span>Refresh Log</span>
              </button>
            </div>

            {campaigns.length === 0 ? (
              <div className="p-12 text-center border rounded-xl bg-slate-50 text-slate-500 space-y-2">
                <History size={24} className="mx-auto text-slate-400" />
                <p className="text-xs font-semibold">No past bulk campaigns logged yet.</p>
                <p className="text-[11px] text-slate-400">Launch a campaign from the composer to see delivery metrics here.</p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider text-[10px] font-bold">
                    <tr>
                      <th className="p-3">Campaign</th>
                      <th className="p-3">Channel</th>
                      <th className="p-3">Audience</th>
                      <th className="p-3">Sent / Total</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Dispatched Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {campaigns.map((camp) => (
                      <tr key={camp.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-semibold text-slate-800">{camp.title}</td>
                        <td className="p-3">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-slate-100 text-slate-700">
                            {camp.channel}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600">{camp.target_audience}</td>
                        <td className="p-3 font-mono font-bold">
                          <span className="text-emerald-700">{camp.sent_count}</span>
                          <span className="text-slate-400"> / {camp.total_recipients}</span>
                        </td>
                        <td className="p-3">
                          <span
                            className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded-full",
                              camp.status === "COMPLETED"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            )}
                          >
                            {camp.status}
                          </span>
                        </td>
                        <td className="p-3 text-slate-500 font-mono text-[11px]">
                          {new Date(camp.created_at).toLocaleString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        {activeTab === "compose" && (
          <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <ShieldCheck size={16} className="text-[#714B67]" />
              <span>
                Ready to reach <strong className="text-slate-900">{totalRecipientsCount}</strong> contacts via{" "}
                <strong className="text-slate-900">{selectedChannel}</strong>
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>

              <button
                onClick={() => handleDispatch(true)}
                disabled={isDispatching || totalRecipientsCount === 0}
                className="flex-1 sm:flex-none px-5 py-2 rounded-xl bg-[#714B67] hover:bg-[#5E3E55] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isDispatching ? (
                  <>
                    <RotateCw size={14} className="animate-spin" />
                    <span>Dispatching...</span>
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    <span>Dispatch Bulk Broadcast</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
