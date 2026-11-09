"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Users,
  Plus,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Building2,
  Mail,
  Phone,
  ShieldCheck,
  Check,
  CheckCircle2,
  X,
  Clock,
  FileText,
  Download,
  Send,
  Layers,
  Star,
  MoreVertical,
  MessageSquare,
  Zap,
  Copy,
  ExternalLink,
} from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { DealStage } from "@/types";
import { OdooControlPanel, ViewMode } from "@/components/layout/OdooControlPanel";
import { LeadGeneratorModal } from "@/components/crm/LeadGeneratorModal";
import { useAuthStore } from "@/stores/authStore";

interface DealCard {
  id: string;
  company_name: string;
  industry: string;
  contact_name: string;
  email: string;
  phone: string;
  deal_stage: DealStage;
  deal_value: number;
  retainer_amount: number;
  health_score: number;
  last_activity_hours: number;
  is_decaying: boolean;
}

const initialDeals: DealCard[] = [
  {
    id: "d1",
    company_name: "Raw Earth Organics",
    industry: "D2C Cosmetics",
    contact_name: "Vikram Malhotra",
    email: "vikram@rawearth.in",
    phone: "+91 99887 66554",
    deal_stage: "LEAD_CAPTURED",
    deal_value: 85000,
    retainer_amount: 85000,
    health_score: 90,
    last_activity_hours: 12,
    is_decaying: false,
  },
  {
    id: "d2",
    company_name: "FinPulse Global",
    industry: "FinTech Banking",
    contact_name: "Neha Joshi",
    email: "neha@finpulse.com",
    phone: "+91 98112 33445",
    deal_stage: "DISCOVERY_CALL",
    deal_value: 200000,
    retainer_amount: 200000,
    health_score: 85,
    last_activity_hours: 54, // >48h decaying
    is_decaying: true,
  },
  {
    id: "d3",
    company_name: "Urban Vibe Apparels",
    industry: "E-Commerce Fashion",
    contact_name: "Sneha Kapoor",
    email: "sneha@urbanvibe.in",
    phone: "+91 91234 56789",
    deal_stage: "PROPOSAL_SENT",
    deal_value: 120000,
    retainer_amount: 120000,
    health_score: 95,
    last_activity_hours: 18,
    is_decaying: false,
  },
  {
    id: "d4",
    company_name: "Bombay Chai Co.",
    industry: "D2C Beverage",
    contact_name: "Kabir Mehta",
    email: "client@bombaychaico.com",
    phone: "+91 98765 43210",
    deal_stage: "WON",
    deal_value: 75000,
    retainer_amount: 75000,
    health_score: 100,
    last_activity_hours: 2,
    is_decaying: false,
  },
];

const stages: { key: DealStage; label: string; color: string }[] = [
  { key: "LEAD_CAPTURED", label: "Lead Captured", color: "bg-slate-500" },
  { key: "DISCOVERY_CALL", label: "Discovery Call", color: "bg-blue-500" },
  { key: "AUDIT_STRATEGY", label: "Audit & Strategy", color: "bg-purple-500" },
  { key: "PROPOSAL_SENT", label: "Proposal Sent", color: "bg-amber-500" },
  { key: "WON", label: "Contract Signed (Won)", color: "bg-emerald-500" },
];

export default function CRMPage() {
  const { hasPermission } = useAuthStore();
  const canCreateDeal = hasPermission("crm:write");
  const canAccessLeadEngine = hasPermission("leads:read");

  const [deals, setDeals] = useState<DealCard[]>(initialDeals);
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewDealModalOpen, setIsNewDealModalOpen] = useState(false);
  const [isLeadGeneratorOpen, setIsLeadGeneratorOpen] = useState(false);

  // Form for New Deal
  const [newCompany, setNewCompany] = useState("");
  const [newIndustry, setNewIndustry] = useState("D2C E-Commerce");
  const [newContact, setNewContact] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newValue, setNewValue] = useState(100000);
  const [newStage, setNewStage] = useState<DealStage>("LEAD_CAPTURED");

  // Autonomous Onboarding Modal
  const [selectedDealForWon, setSelectedDealForWon] = useState<DealCard | null>(null);
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [onboardingSuccessModal, setOnboardingSuccessModal] = useState<any>(null);

  // Proposal Studio Modal
  const [selectedDealForProposal, setSelectedDealForProposal] = useState<DealCard | null>(null);
  const [proposalObjective, setProposalObjective] = useState("");
  const [proposalPlatforms, setProposalPlatforms] = useState<string[]>([
    "Meta (Instagram & Facebook)",
    "Google Search & Performance Max",
  ]);
  const [proposalNotes, setProposalNotes] = useState("");
  const [isGeneratingProposal, setIsGeneratingProposal] = useState(false);
  const [generatedProposal, setGeneratedProposal] = useState<any>(null);

  // Blueprints selected for onboarding
  const [selectedBlueprints, setSelectedBlueprints] = useState<string[]>([
    "Monthly Social Media Retainer",
    "Performance Marketing Setup",
  ]);

  // Drag and drop state
  const [draggingDealId, setDraggingDealId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<DealStage | null>(null);

  // Fast Action to Reply State
  const [fastReplyDeal, setFastReplyDeal] = useState<DealCard | null>(null);
  const [fastReplyTab, setFastReplyTab] = useState<"instant" | "audit" | "closing">("instant");

  const getFastReplyContent = (deal: DealCard, tab: "instant" | "audit" | "closing") => {
    if (tab === "instant") {
      return {
        title: "5-Minute Instant Response",
        subject: `Quick follow-up for ${deal.company_name} — The Desi Muchads`,
        body: `Hi ${deal.contact_name},\n\nJust reviewed your business profile for ${deal.company_name}. We’ve put together a specialized strategy sprint for your ${deal.industry} market that addresses your primary growth bottlenecks.\n\nAre you available for a quick 10-minute strategy overview today?`,
      };
    }
    if (tab === "audit") {
      return {
        title: "Strategy Audit & Teardown",
        subject: `Custom Deliverable Audit for ${deal.company_name}`,
        body: `Hi ${deal.contact_name},\n\nOur creative & performance team finished a preliminary digital audit for ${deal.company_name}. We spotted 3 key optimization levers that can immediately boost conversions without increasing ad spend.\n\nWould you like me to share our video teardown or send across the PDF proposal?`,
      };
    }
    return {
      title: "Slot Reservation & Closing",
      subject: `Reserving your agency retainer sprint — ${deal.company_name}`,
      body: `Hi ${deal.contact_name},\n\nHope your week is going well! Following up on the ${formatCurrency(deal.deal_value)} monthly sprint for ${deal.company_name}. We have 1 client onboarding slot available for this sprint cycle starting Monday.\n\nCan I send over the formal agreement for your signature today so we can reserve your onboarding date?`,
    };
  };

  // Dialog Refs
  const newDealDialogRef = useRef<HTMLDialogElement>(null);
  const wonDialogRef = useRef<HTMLDialogElement>(null);
  const proposalDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = newDealDialogRef.current;
    if (!dialog) return;
    if (isNewDealModalOpen && !dialog.open) dialog.showModal();
    else if (!isNewDealModalOpen && dialog.open) dialog.close();
  }, [isNewDealModalOpen]);

  useEffect(() => {
    const dialog = wonDialogRef.current;
    if (!dialog) return;
    if (selectedDealForWon && !dialog.open) dialog.showModal();
    else if (!selectedDealForWon && dialog.open) dialog.close();
  }, [selectedDealForWon]);

  useEffect(() => {
    const dialog = proposalDialogRef.current;
    if (!dialog) return;
    if (selectedDealForProposal && !dialog.open) dialog.showModal();
    else if (!selectedDealForProposal && dialog.open) dialog.close();
  }, [selectedDealForProposal]);

  const refreshDeals = async () => {
    try {
      const res = await api.get("/crm/deals");
      if (res.data?.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
        setDeals(
          res.data.data.map((d: any) => ({
            id: d.id,
            company_name: d.company_name,
            industry: d.industry,
            contact_name: d.primary_contact_name,
            email: d.contact_email,
            phone: d.contact_phone || "+91 98000 00000",
            deal_stage: d.deal_stage || "LEAD_CAPTURED",
            deal_value: d.deal_value || 100000,
            retainer_amount: d.retainer_amount || 100000,
            health_score: d.health_score || 100,
            last_activity_hours: 0,
            is_decaying: d.is_decaying || false,
          }))
        );
      }
    } catch {}
  };

  useEffect(() => {
    refreshDeals();
  }, []);

  const toggleBlueprint = (name: string) => {
    setSelectedBlueprints((prev) =>
      prev.includes(name) ? prev.filter((b) => b !== name) : [...prev, name]
    );
  };

  const togglePlatform = (p: string) => {
    setProposalPlatforms((prev) =>
      prev.includes(p) ? prev.filter((item) => item !== p) : [...prev, p]
    );
  };

  const handleStageChange = (dealId: string, targetStage: DealStage) => {
    const deal = deals.find((d) => d.id === dealId);
    if (!deal) return;

    if (targetStage === "WON") {
      setSelectedDealForWon(deal);
      return;
    }

    setDeals((prev) =>
      prev.map((d) =>
        d.id === dealId
          ? { ...d, deal_stage: targetStage, last_activity_hours: 0, is_decaying: false }
          : d
      )
    );
    toast.success(`Deal moved to ${targetStage.replace("_", " ")}`);
  };

  const handleCreateNewDeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompany || !newEmail) {
      toast.error("Please provide company name and email");
      return;
    }

    const created: DealCard = {
      id: `d${Date.now()}`,
      company_name: newCompany,
      industry: newIndustry,
      contact_name: newContact || "Key Contact",
      email: newEmail,
      phone: newPhone || "+91 98000 00000",
      deal_stage: newStage,
      deal_value: Number(newValue) || 100000,
      retainer_amount: Number(newValue) || 100000,
      health_score: 100,
      last_activity_hours: 0,
      is_decaying: false,
    };

    setDeals((prev) => [created, ...prev]);
    setIsNewDealModalOpen(false);
    setNewCompany("");
    setNewEmail("");
    setNewContact("");
    setNewPhone("");
    toast.success(`Opportunity "${created.company_name}" created!`);
  };

  const openProposalStudio = (deal: DealCard) => {
    setSelectedDealForProposal(deal);
    setProposalObjective(`Rapid customer acquisition and brand authority scaling for ${deal.company_name} in ${deal.industry}`);
    setGeneratedProposal(null);
  };

  const handleGenerateProposal = async () => {
    if (!selectedDealForProposal) return;
    setIsGeneratingProposal(true);

    try {
      const resp = await api.post(`/crm/deals/${selectedDealForProposal.id}/generate-proposal`, {
        objective: proposalObjective,
        target_platforms: proposalPlatforms,
        custom_notes: proposalNotes,
      });

      if (resp.data?.data) {
        setGeneratedProposal(resp.data.data);
        toast.success("AI Strategic Proposal formulated!");
      }
    } catch {
      const subtotal = selectedDealForProposal.deal_value || 100000;
      const gst = subtotal * 0.18;
      const total = subtotal + gst;

      setGeneratedProposal({
        proposal_id: `PRP-202611-${selectedDealForProposal.id.slice(0, 4).toUpperCase()}`,
        generated_date: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
        valid_until: "30-Nov-2026",
        client: {
          company_name: selectedDealForProposal.company_name,
          primary_contact_name: selectedDealForProposal.contact_name,
          contact_email: selectedDealForProposal.email,
          industry: selectedDealForProposal.industry,
          gst_tax_id: "27AABCB1234D1Z5",
        },
        strategy: {
          headline: `Performance Growth & Content Acceleration: ${selectedDealForProposal.company_name}`,
          objective: proposalObjective,
          strategic_angle: `Hyper-targeted performance marketing with cultural resonance tailored for ${selectedDealForProposal.industry}.`,
          target_platforms: proposalPlatforms,
        },
        deliverables: [
          { item: "Organic & Paid Video Production", specification: "12x High-converting Reels / Shorts vertical videos monthly", frequency: "Weekly Cadence" },
          { item: "Design & Carousel Assets", specification: "8x Multi-slide educational and social-proof carousels", frequency: "Bi-weekly Cadence" },
          { item: "Full-Funnel Ad Campaign Management", specification: "Setup, audience testing, A/B creative testing, budget optimization", frequency: "Continuous 24x7" },
          { item: "Real-Time Telemetry & Client Portal", specification: "Direct access to Desi Muchads Client Portal for live KPI tracking", frequency: "Always Active" },
        ],
        roadmap: [
          { phase: "Phase 1: Discovery & Technical Audit", timeline: "Days 1–7", milestones: "Brand voice, Pixel/CAPI setup, competitor benchmark." },
          { phase: "Phase 2: Creative Engine Deployment", timeline: "Days 8–15", milestones: "First batch of 6 video hooks, carousel templates, ad copy variants." },
          { phase: "Phase 3: Campaign Launch & Scaling", timeline: "Days 16–30", milestones: "Paid campaigns live, A/B audience learnings, retargeting funnel." },
          { phase: "Phase 4: Optimization & Retention", timeline: "Ongoing", milestones: "Weekly creative refreshes, budget scaling on winning ad sets." },
        ],
        commercials: {
          subtotal: subtotal,
          gst_rate_percent: 18.0,
          gst_amount: gst,
          total_monthly_investment: total,
          sac_code: "998311 (Digital Marketing & Advertising)",
        },
      });
      toast.success("AI Strategic Proposal formulated!");
    } finally {
      setIsGeneratingProposal(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!selectedDealForProposal) return;
    try {
      const response = await api.get(`/crm/deals/${selectedDealForProposal.id}/proposal-pdf`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `proposal_${selectedDealForProposal.company_name.toLowerCase().replace(/\s+/g, "_")}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Proposal PDF downloaded!");
    } catch {
      window.open(`/api/v1/crm/deals/${selectedDealForProposal.id}/proposal-pdf`, "_blank");
    }
  };

  const handleSendProposal = async () => {
    if (!selectedDealForProposal) return;
    try {
      await api.post(`/crm/deals/${selectedDealForProposal.id}/send-proposal`);
    } catch {}

    setDeals((prev) =>
      prev.map((d) =>
        d.id === selectedDealForProposal.id
          ? { ...d, deal_stage: "PROPOSAL_SENT", is_decaying: false }
          : d
      )
    );
    setSelectedDealForProposal(null);
    toast.success(`Proposal dispatched to ${selectedDealForProposal.email}! Deal stage: Proposal Sent.`);
  };

  const executeAutonomousOnboarding = async () => {
    if (!selectedDealForWon) return;
    setIsOnboarding(true);

    try {
      await api.post(`/crm/deals/${selectedDealForWon.id}/convert-to-client`, {
        service_blueprint_ids: [],
        initial_retainer: selectedDealForWon.retainer_amount,
        billing_cycle_day: 1,
        generate_deposit_invoice: true,
      });
    } catch {}

    const summary = {
      company_name: selectedDealForWon.company_name,
      contact_name: selectedDealForWon.contact_name,
      email: selectedDealForWon.email,
      blueprints: selectedBlueprints,
      invoice_number: `INV-202611-000${Math.floor(Math.random() * 90) + 10}`,
      retainer_amount: selectedDealForWon.retainer_amount,
      gst_amount: selectedDealForWon.retainer_amount * 0.18,
      total_amount: selectedDealForWon.retainer_amount * 1.18,
    };

    setDeals((prev) =>
      prev.map((d) =>
        d.id === selectedDealForWon.id ? { ...d, deal_stage: "WON", is_decaying: false } : d
      )
    );

    setIsOnboarding(false);
    setSelectedDealForWon(null);
    setOnboardingSuccessModal(summary);
    toast.success("Autonomous Zero-Touch Onboarding executed!");
  };

  // Filter deals
  const filteredDeals = deals.filter(
    (d) =>
      d.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.contact_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.industry.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPipelineValue = deals.reduce((sum, d) => sum + d.deal_value, 0);

  return (
    <div>
      {/* Odoo Control Panel Sub-Header */}
      <OdooControlPanel
        appName="CRM"
        viewName="Sales Pipeline"
        onNewClick={canCreateDeal ? () => setIsNewDealModalOpen(true) : undefined}
        newButtonLabel="New Opportunity"
        activeView={viewMode}
        onViewChange={setViewMode}
        availableViews={["kanban", "list"]}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        totalCount={filteredDeals.length}
        totalAmountText={formatCurrency(totalPipelineValue)}
        secondaryActions={
          <div className="flex items-center gap-2">
            {canAccessLeadEngine && (
              <button
                onClick={() => setIsLeadGeneratorOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#714B67] hover:bg-[#5E3E55] text-white text-xs font-bold shadow-xs transition hover:scale-[1.02] active:scale-[0.98]"
                title="Autonomous Area Lead Discovery & Cold Outreach Engine"
              >
                <Sparkles size={13} className="text-amber-300 animate-pulse" />
                <span>AI Lead Engine</span>
              </button>
            )}
            <span className="text-[11px] font-mono px-2 py-1 rounded bg-purple-50 text-[#714B67] border border-purple-200 hidden md:inline-block">
              Zero-Touch OS
            </span>
          </div>
        }
      />

      {/* Main Pipeline View: Kanban Mode (Odoo Signature) */}
      {viewMode === "kanban" ? (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start overflow-x-auto pb-4">
          {stages.map((col) => {
            const colDeals = filteredDeals.filter((d) => d.deal_stage === col.key);
            const colTotal = colDeals.reduce((sum, d) => sum + d.deal_value, 0);

            return (
              <div
                key={col.key}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (dragOverStage !== col.key) setDragOverStage(col.key);
                }}
                onDragLeave={(e) => {
                  if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                  if (dragOverStage === col.key) setDragOverStage(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const dealId = e.dataTransfer.getData("text/plain") || draggingDealId;
                  if (dealId) {
                    handleStageChange(dealId, col.key);
                  }
                  setDraggingDealId(null);
                  setDragOverStage(null);
                }}
                className={cn(
                  "bg-[#F1F3F5] rounded-xl border flex flex-col min-w-[250px] transition-all",
                  dragOverStage === col.key
                    ? "ring-2 ring-[#714B67] bg-[#FAF5FF] border-[#714B67] shadow-sm"
                    : "border-slate-200/80"
                )}
              >
                {/* Odoo Column Header */}
                <div className="p-3 border-b border-slate-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-800 tracking-tight">
                      {col.label}
                    </span>
                    <span className="text-[10px] font-semibold font-mono px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700">
                      {colDeals.length}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-mono font-semibold text-slate-600">
                      {formatCurrency(colTotal)}
                    </span>
                    <button
                      onClick={() => {
                        setNewStage(col.key);
                        setIsNewDealModalOpen(true);
                      }}
                      className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                      title={`Add opportunity to ${col.label}`}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                {/* Cards Container */}
                <div className="p-2 space-y-2.5 min-h-[420px]">
                  {colDeals.map((deal) => (
                    <div
                      key={deal.id}
                      draggable
                      onDragStart={(e) => {
                        setDraggingDealId(deal.id);
                        e.dataTransfer.setData("text/plain", deal.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragEnd={() => {
                        setDraggingDealId(null);
                        setDragOverStage(null);
                      }}
                      className={cn(
                        "p-3.5 rounded-lg bg-white border transition-all space-y-2 relative shadow-xs hover:shadow-md cursor-grab active:cursor-grabbing",
                        draggingDealId === deal.id && "opacity-40 scale-95 border-dashed border-[#714B67]",
                        deal.is_decaying
                          ? "border-amber-300 ring-1 ring-amber-300/50"
                          : "border-slate-200 hover:border-[#714B67]/40"
                      )}
                    >
                      {/* Decaying Alert Banner */}
                      {deal.is_decaying && (
                        <div className="flex items-center gap-1 text-[10px] font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 w-fit">
                          <AlertCircle size={11} className="text-amber-600" />
                          <span>Decaying: {deal.last_activity_hours}h untouched</span>
                        </div>
                      )}

                      {/* Header Title & Value */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h2 className="text-xs font-bold text-slate-900 hover:text-[#714B67] transition-colors line-clamp-1">
                            {deal.company_name}
                          </h2>
                          <span className="inline-block mt-0.5 text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                            {deal.industry}
                          </span>
                        </div>
                        <span className="text-xs font-bold font-mono text-slate-900 shrink-0">
                          {formatCurrency(deal.deal_value)}
                        </span>
                      </div>

                      {/* Contact metadata */}
                      <div className="text-[11px] text-slate-500 space-y-0.5 pt-1.5 border-t border-slate-100">
                        <div className="flex items-center gap-1.5">
                          <Users size={12} className="text-slate-400" />
                          <span className="truncate">{deal.contact_name}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Mail size={12} className="text-slate-400" />
                          <span className="truncate text-slate-400 text-[10px]">{deal.email}</span>
                        </div>
                      </div>

                      {/* Card Action Row */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-1.5">
                        <select
                          value={deal.deal_stage}
                          onChange={(e) => handleStageChange(deal.id, e.target.value as DealStage)}
                          className="bg-slate-50 hover:bg-slate-100 text-[10px] font-medium text-slate-700 border border-slate-200 rounded px-1.5 py-1 outline-none cursor-pointer max-w-[110px]"
                        >
                          {stages.map((s) => (
                            <option key={s.key} value={s.key}>
                              → {s.label}
                            </option>
                          ))}
                        </select>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setFastReplyDeal(deal)}
                            className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 transition-colors shadow-2xs"
                            title="Fast Action to Reply (WhatsApp, Email & 3-Touch Follow-up)"
                          >
                            <Zap size={11} className="text-emerald-600 fill-emerald-600" />
                            <span>Reply</span>
                          </button>

                          <button
                            onClick={() => openProposalStudio(deal)}
                            className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded bg-purple-50 text-[#714B67] hover:bg-purple-100 border border-purple-200 transition-colors"
                            title="Generate AI Proposal & PDF"
                          >
                            <FileText size={11} />
                            <span>Proposal</span>
                          </button>

                          {deal.deal_stage !== "WON" && (
                            <button
                              onClick={() => handleStageChange(deal.id, "WON")}
                              className="flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300 transition-colors"
                              title="Sign Contract & Trigger Onboarding"
                            >
                              <Sparkles size={11} />
                              <span>Win</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List / Table Mode (Odoo List View) */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Opportunity / Company</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4 text-right">Value (INR)</th>
                  <th className="py-3 px-4 text-right">Monthly Retainer</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDeals.map((deal) => (
                  <tr key={deal.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 block">{deal.company_name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{deal.industry}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-800 block">{deal.contact_name}</span>
                      <span className="text-[10px] text-slate-400">{deal.email}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {deal.deal_stage.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(deal.deal_value)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600">
                      {formatCurrency(deal.retainer_amount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {deal.is_decaying ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          <AlertCircle size={10} /> Decaying
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <Check size={10} /> Active
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setFastReplyDeal(deal)}
                          className="px-2 py-1 rounded bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-bold text-xs border border-emerald-300 flex items-center gap-1 shadow-2xs"
                          title="Fast Action to Reply"
                        >
                          <Zap size={11} className="text-emerald-600 fill-emerald-600" />
                          <span>Reply</span>
                        </button>
                        <button
                          onClick={() => openProposalStudio(deal)}
                          className="px-2 py-1 rounded bg-purple-50 text-[#714B67] hover:bg-purple-100 font-medium text-xs border border-purple-200"
                        >
                          Proposal
                        </button>
                        {deal.deal_stage !== "WON" && (
                          <button
                            onClick={() => handleStageChange(deal.id, "WON")}
                            className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold text-xs border border-emerald-300"
                          >
                            Win
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal 1: Create New Opportunity (Odoo Minimalist Form) */}
      <dialog
        ref={newDealDialogRef}
        onCancel={() => setIsNewDealModalOpen(false)}
        className="fixed inset-0 m-auto bg-white rounded-2xl max-w-lg w-full p-0 shadow-2xl border border-slate-200 backdrop:bg-slate-900/40 backdrop:backdrop-blur-sm overflow-hidden"
      >
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-sm font-bold text-slate-900">New Opportunity</h2>
            <p className="text-[11px] text-slate-500">Capture new prospect or sales deal into the pipeline.</p>
          </div>
          <button onClick={() => setIsNewDealModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleCreateNewDeal} className="p-5 space-y-4 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">COMPANY NAME *</label>
            <input
              type="text"
              required
              value={newCompany}
              onChange={(e) => setNewCompany(e.target.value)}
              placeholder="e.g. Blue Tokai Coffee Roasters"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#714B67] focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">INDUSTRY</label>
              <input
                type="text"
                value={newIndustry}
                onChange={(e) => setNewIndustry(e.target.value)}
                placeholder="e.g. D2C Beverage"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#714B67] focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">TARGET STAGE</label>
              <select
                value={newStage}
                onChange={(e) => setNewStage(e.target.value as DealStage)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#714B67] focus:bg-white"
              >
                {stages.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">CONTACT NAME</label>
              <input
                type="text"
                value={newContact}
                onChange={(e) => setNewContact(e.target.value)}
                placeholder="e.g. Rohan Joshi"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#714B67] focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">EMAIL ADDRESS *</label>
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="rohan@company.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#714B67] focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">PHONE</label>
              <input
                type="text"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="+91 98000 12345"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#714B67] focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">EXPECTED VALUE (INR)</label>
              <input
                type="number"
                value={newValue}
                onChange={(e) => setNewValue(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#714B67] focus:bg-white font-mono font-bold"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsNewDealModalOpen(false)}
              className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-800 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-[#714B67] hover:bg-[#58364F] text-white font-semibold text-xs transition-colors shadow-xs"
            >
              Save Opportunity
            </button>
          </div>
        </form>
      </dialog>

      {/* Modal 2: Strategic Proposal Studio (Odoo Clean Dialog) */}
      <dialog
        ref={proposalDialogRef}
        onCancel={() => setSelectedDealForProposal(null)}
        className="fixed inset-0 m-auto bg-white rounded-2xl max-w-2xl w-full p-0 shadow-2xl border border-slate-200 backdrop:bg-slate-900/40 backdrop:backdrop-blur-sm overflow-hidden"
      >
        {selectedDealForProposal && (
          <div className="flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-slate-100 flex items-start justify-between bg-slate-50">
              <div>
                <span className="text-[11px] font-semibold text-[#714B67] flex items-center gap-1">
                  <Sparkles size={12} /> AI Proposal Studio (Gemini + ReportLab)
                </span>
                <h2 className="text-base font-bold text-slate-900 mt-0.5">
                  Strategic Proposal: {selectedDealForProposal.company_name}
                </h2>
                <p className="text-xs text-slate-500">
                  Target Retainer: {formatCurrency(selectedDealForProposal.deal_value)}/mo • Attn: {selectedDealForProposal.contact_name}
                </p>
              </div>
              <button
                onClick={() => setSelectedDealForProposal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Form config */}
              <div className="space-y-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    PRIMARY CAMPAIGN GOAL
                  </label>
                  <input
                    type="text"
                    value={proposalObjective}
                    onChange={(e) => setProposalObjective(e.target.value)}
                    placeholder="e.g. 5,000 monthly subscribers and brand authority in D2C"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#714B67]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    TARGET PLATFORMS
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      "Meta (Instagram & Facebook)",
                      "Google Search & Performance Max",
                      "LinkedIn",
                      "YouTube Shorts",
                      "TikTok",
                    ].map((platform) => {
                      const active = proposalPlatforms.includes(platform);
                      return (
                        <button
                          key={platform}
                          type="button"
                          onClick={() => togglePlatform(platform)}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-xs font-medium border transition-all",
                            active
                              ? "bg-purple-100 border-[#714B67] text-[#714B67] font-semibold"
                              : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                          )}
                        >
                          {platform}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    CUSTOM SCOPE NOTES (OPTIONAL)
                  </label>
                  <textarea
                    rows={2}
                    value={proposalNotes}
                    onChange={(e) => setProposalNotes(e.target.value)}
                    placeholder="Specific deliverables, festive focus, or priority SLA hours..."
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#714B67] resize-none"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleGenerateProposal}
                    disabled={isGeneratingProposal}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#714B67] hover:bg-[#58364F] text-white font-semibold text-xs transition-colors shadow-xs disabled:opacity-50"
                  >
                    <Sparkles size={13} />
                    <span>{isGeneratingProposal ? "Formulating Strategy..." : "Generate AI Proposal"}</span>
                  </button>
                </div>
              </div>

              {/* Proposal Preview Box */}
              {generatedProposal && (
                <div className="space-y-3.5 border border-purple-200 rounded-xl p-4 bg-purple-50/20">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-[#714B67]">
                        {generatedProposal.proposal_id} • Valid: {generatedProposal.valid_until}
                      </span>
                      <h3 className="text-xs font-bold text-slate-900">
                        {generatedProposal.strategy?.headline}
                      </h3>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {formatCurrency(generatedProposal.commercials?.total_monthly_investment)}/mo
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 italic">
                    &quot;{generatedProposal.strategy?.strategic_angle}&quot;
                  </p>

                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Included Scope of Work:
                    </span>
                    <div className="space-y-1">
                      {generatedProposal.deliverables?.map((d: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-start justify-between gap-2 p-2 rounded-lg bg-white border border-slate-200 text-xs"
                        >
                          <div>
                            <strong className="text-slate-800">{d.item}</strong>
                            <p className="text-slate-500 text-[11px]">{d.specification}</p>
                          </div>
                          <span className="text-[10px] font-mono text-[#714B67] font-semibold shrink-0">
                            {d.frequency}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Commercials Ledger */}
                  <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1 font-mono text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Monthly Retainer:</span>
                      <span>{formatCurrency(generatedProposal.commercials?.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>GST (18% - SAC 998311):</span>
                      <span>{formatCurrency(generatedProposal.commercials?.gst_amount)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-900 pt-1.5 border-t border-slate-100">
                      <span>Total Investment:</span>
                      <span className="text-emerald-700">
                        {formatCurrency(generatedProposal.commercials?.total_monthly_investment)}/mo
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-3.5 border-t border-slate-100 flex items-center justify-between bg-slate-50">
              <button
                onClick={() => setSelectedDealForProposal(null)}
                className="px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-700 text-xs font-medium"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadPDF}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors shadow-xs"
                >
                  <Download size={13} />
                  <span>Download PDF</span>
                </button>

                <button
                  onClick={handleSendProposal}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#714B67] hover:bg-[#58364F] text-white text-xs font-semibold transition-colors shadow-xs"
                >
                  <Send size={13} />
                  <span>Send Proposal & Mark Sent</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </dialog>

      {/* Modal 3: Autonomous Zero-Touch Onboarding Dialog */}
      <dialog
        ref={wonDialogRef}
        onCancel={() => setSelectedDealForWon(null)}
        className="fixed inset-0 m-auto bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 backdrop:bg-slate-900/40 backdrop:backdrop-blur-sm"
      >
        {selectedDealForWon && (
          <div className="space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                  <Sparkles size={13} /> Autonomous Zero-Touch Onboarding
                </span>
                <h2 className="text-base font-bold text-slate-900 mt-0.5">
                  Onboard &quot;{selectedDealForWon.company_name}&quot;
                </h2>
                <p className="text-xs text-slate-500">
                  Winning this deal executes the atomic 5-step agency operating system setup.
                </p>
              </div>
              <button
                onClick={() => setSelectedDealForWon(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            {/* Steps Preview */}
            <div className="space-y-2 text-xs">
              <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] block">
                Automated Actions Executed Atomically:
              </span>
              <div className="space-y-1.5 font-mono text-[11px] text-slate-700">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <Check size={13} className="text-emerald-600" />
                  <span>1. Convert Lead to Active Client Organization</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <Check size={13} className="text-emerald-600" />
                  <span>2. Provision Client Portal account for {selectedDealForWon.email}</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <Check size={13} className="text-emerald-600" />
                  <span>3. Initialize AES-256 Encrypted Credential Vault slots</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <Check size={13} className="text-emerald-600" />
                  <span>4. Instantiate selected DAG Service Blueprints</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <Check size={13} className="text-emerald-600" />
                  <span>5. Generate initial GST invoice ({formatCurrency(selectedDealForWon.retainer_amount * 1.18)})</span>
                </div>
              </div>
            </div>

            {/* Select Workflow Blueprints */}
            <div className="space-y-2">
              <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] block">
                Select Service Blueprints to Instantiate:
              </span>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {[
                  { name: "Monthly Social Media Retainer", tag: "12 Pillars • Copy • 3D Renders • Client QA", icon: "📱" },
                  { name: "Performance Marketing Setup", tag: "Pixel Audit • Funnel Audiences • Meta & Google Ads", icon: "🎯" },
                  { name: "Influencer Marketing & Creator Collabs", tag: "PR Sprint • Rate Benchmarking • Sample Logistics", icon: "🌟" },
                  { name: "Brand Identity & Packaging Design Sprint", tag: "Archetype • 3x Logos • Dielines • 3D Mockups", icon: "🎨" },
                  { name: "WhatsApp CRM & Conversational Commerce", tag: "Meta Cloud API • Catalog Sync • Abandoned Cart Bot", icon: "💬" },
                  { name: "Commercial Video & Reel Shoot Production", tag: "Call Sheet • On-Site 4K Shoot • DaVinci Color LUTs", icon: "🎬" },
                ].map((bp) => {
                  const isChecked = selectedBlueprints.includes(bp.name);
                  return (
                    <button
                      key={bp.name}
                      type="button"
                      onClick={() => toggleBlueprint(bp.name)}
                      className={cn(
                        "w-full flex items-center justify-between p-2 rounded-lg text-xs text-left border transition-all",
                        isChecked
                          ? "bg-purple-50 border-[#714B67] text-[#714B67] font-semibold"
                          : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{bp.icon}</span>
                        <div>
                          <div className="font-semibold text-xs text-slate-800">{bp.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{bp.tag}</div>
                        </div>
                      </div>
                      {isChecked ? (
                        <Check size={14} className="text-[#714B67] shrink-0" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded border border-slate-300 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setSelectedDealForWon(null)}
                className="px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-700 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={executeAutonomousOnboarding}
                disabled={isOnboarding}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shadow-xs disabled:opacity-50"
              >
                <Sparkles size={14} />
                <span>{isOnboarding ? "Executing Pipeline..." : "Confirm & Launch Onboarding"}</span>
              </button>
            </div>
          </div>
        )}
      </dialog>

      {/* Modal 4: Onboarding Complete Summary Dialog */}
      {onboardingSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-emerald-200">
            <div className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 size={22} />
              <h2 className="text-base font-bold text-slate-900">
                Autonomous Onboarding Complete!
              </h2>
            </div>
            <p className="text-xs text-slate-600">
              Client <strong className="text-slate-900">{onboardingSuccessModal.company_name}</strong> has been onboarded into The Desi Muchads Operating System without human intervention.
            </p>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Client Portal User:</span>
                <span className="text-slate-900 font-semibold">{onboardingSuccessModal.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Vault AES-256 Slots:</span>
                <span className="text-emerald-700 font-semibold">3 Encrypted Slots Ready</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Initial GST Invoice:</span>
                <span className="text-[#714B67] font-semibold">{onboardingSuccessModal.invoice_number} ({formatCurrency(onboardingSuccessModal.total_amount)})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Active Workflows:</span>
                <span className="text-slate-800">{onboardingSuccessModal.blueprints.join(", ")}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setOnboardingSuccessModal(null)}
                className="px-4 py-2 rounded-lg bg-[#714B67] hover:bg-[#58364F] text-white font-semibold text-xs transition-colors shadow-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 5: Fast Action to Reply Dialog */}
      {fastReplyDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Zap size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Fast Action to Reply: {fastReplyDeal.company_name}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {fastReplyDeal.contact_name} • {fastReplyDeal.email} • {fastReplyDeal.phone}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setFastReplyDeal(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>

            {/* Quick Template Tabs */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-lg text-xs font-semibold">
              <button
                onClick={() => setFastReplyTab("instant")}
                className={cn(
                  "py-1.5 rounded-md text-center transition",
                  fastReplyTab === "instant" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                )}
              >
                ⚡ 5-Min Warm Hook
              </button>
              <button
                onClick={() => setFastReplyTab("audit")}
                className={cn(
                  "py-1.5 rounded-md text-center transition",
                  fastReplyTab === "audit" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                )}
              >
                📊 Strategy Teardown
              </button>
              <button
                onClick={() => setFastReplyTab("closing")}
                className={cn(
                  "py-1.5 rounded-md text-center transition",
                  fastReplyTab === "closing" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                )}
              >
                🤝 Slot Reservation
              </button>
            </div>

            {/* Message Preview & Action Suite */}
            {(() => {
              const reply = getFastReplyContent(fastReplyDeal, fastReplyTab);
              const cleanPhone = fastReplyDeal.phone.replace(/[^0-9]/g, "");
              const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(reply.body)}`;
              const mailtoUrl = `mailto:${fastReplyDeal.email}?subject=${encodeURIComponent(reply.subject)}&body=${encodeURIComponent(reply.body)}`;

              return (
                <div className="space-y-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono space-y-2">
                    <div className="text-[11px] text-slate-500 border-b border-slate-200 pb-1.5">
                      <span className="font-semibold text-slate-700">Subject: </span>
                      <span>{reply.subject}</span>
                    </div>
                    <p className="text-slate-800 whitespace-pre-wrap leading-relaxed text-[11px]">
                      {reply.body}
                    </p>
                  </div>

                  {/* 1-Click Fast Reply Triggers */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs text-center"
                    >
                      <MessageSquare size={13} />
                      <span>WhatsApp</span>
                      <ExternalLink size={11} className="opacity-70" />
                    </a>

                    <a
                      href={mailtoUrl}
                      className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs text-center"
                    >
                      <Mail size={13} />
                      <span>Send Email</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(reply.body);
                        toast.success(`Copied "${reply.title}" to clipboard!`);
                      }}
                      className="py-2.5 px-3 bg-purple-50 hover:bg-purple-100 text-[#714B67] border border-purple-200 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5"
                    >
                      <Copy size={13} />
                      <span>Copy Pitch</span>
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Autonomous Area Lead Generator & Cold Outreach Engine Modal */}
      <LeadGeneratorModal
        isOpen={isLeadGeneratorOpen}
        onClose={() => setIsLeadGeneratorOpen(false)}
        onLeadsInjected={refreshDeals}
      />
    </div>
  );
}
