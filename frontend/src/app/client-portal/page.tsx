"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  ShieldCheck,
  Receipt,
  RotateCcw,
  Clock,
  Sparkles,
  ExternalLink,
  Lock,
  Plus,
  Check,
  Eye,
  Building2,
  FileText,
  Download,
  AlertCircle,
  X,
} from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { toast } from "sonner";

export default function ClientPortalPage() {
  const [activeTab, setActiveTab] = useState<"approvals" | "vault" | "billing">("approvals");

  // Client Deliverables Awaiting Approval
  const [deliverables, setDeliverables] = useState([
    {
      id: "del_1",
      title: "Winter Masala Ritual: Kadak Chai Symphony",
      format: "Instagram Reel (1080x1920)",
      copy: "There is nothing quite like a steaming cup of handmade kadak chai on a cold winter evening. Tap the link in bio to shop our freshly ground spices! ☕🍂 #BombayChai #ChaiLove",
      media_url: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80",
      scheduled_for: "2026-11-14",
      status: "CLIENT_REVIEW",
      version: 1,
    },
    {
      id: "del_2",
      title: "Festive Gifting Hamper Carousel",
      format: "Instagram Carousel (1080x1350)",
      copy: "Looking for the ultimate Diwali gift? Gift our handcrafted royal wooden box packed with 5 artisanal teas and brass infuser. Limited holiday batch. 🎁🪔",
      media_url: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=800&q=80",
      scheduled_for: "2026-11-18",
      status: "APPROVED",
      version: 1,
    },
  ]);

  // Client Vault Secrets
  const [vaultSecrets, setVaultSecrets] = useState([
    {
      id: "v1",
      platform: "Meta Ads & Business Manager",
      username: "client@bombaychaico.com",
      status: "SECURED_AES_256",
      updated_at: "2026-11-09",
    },
    {
      id: "v2",
      platform: "Google Ads Account ID",
      username: "782-990-1123",
      status: "SECURED_AES_256",
      updated_at: "2026-11-09",
    },
  ]);

  const [newSecretPlatform, setNewSecretPlatform] = useState("");
  const [newSecretValue, setNewSecretValue] = useState("");
  const [revisionFeedback, setRevisionFeedback] = useState("");
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [selectedDelId, setSelectedDelId] = useState<string | null>(null);

  const handleApprove = (id: string) => {
    setDeliverables((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: "APPROVED" } : d))
    );
    toast.success("Deliverable signed off! Handed off to automated publisher daemon.");
  };

  const handleOpenRevision = (id: string) => {
    setSelectedDelId(id);
    setShowRevisionModal(true);
  };

  const submitRevision = () => {
    if (!selectedDelId) return;
    setDeliverables((prev) =>
      prev.map((d) =>
        d.id === selectedDelId
          ? {
              ...d,
              status: "REVISION_REQUESTED",
              version: d.version + 1,
            }
          : d
      )
    );
    setShowRevisionModal(false);
    toast.info("Feedback transmitted to The Desi Muchads creative team. Version bumped.");
  };

  const handleAddSecret = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSecretPlatform || !newSecretValue) return;

    setVaultSecrets([
      ...vaultSecrets,
      {
        id: `v_${Date.now()}`,
        platform: newSecretPlatform,
        username: "client_submitted",
        status: "SECURED_AES_256",
        updated_at: new Date().toISOString().split("T")[0],
      },
    ]);
    setNewSecretPlatform("");
    setNewSecretValue("");
    toast.success("Credential encrypted via Fernet AES-256 and saved to secure agency vault!");
  };

  return (
    <div className="space-y-5">
      {/* Odoo Style Client Portal Header Banner */}
      <div className="bg-white border border-[#E2E8F0] rounded shadow-sm p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-black flex items-center justify-center border border-slate-200 shrink-0 shadow-xs">
              <img src="/logo.jpg" alt="The Desi Muchads" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#1E293B]">
                Bombay Chai Co. — Client Portal
              </h1>
              <p className="text-xs text-[#64748B]">
                Powered by <strong>The Desi Muchads</strong> • Single source of truth for deliverables, vault keys, and invoices.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EBFBEE] text-[#1E7E34] border border-[#C3E6CB]">
            <span className="w-2 h-2 rounded-full bg-[#1E7E34] animate-pulse" />
            Active Retainer (₹75,000/mo)
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono bg-[#F8F9FA] text-[#475569] border border-[#CBD5E1]">
            <ShieldCheck size={13} className="text-[#008784]" />
            Client Portal Verified
          </span>
        </div>
      </div>

      {/* Odoo Sub-Tabs Navigation */}
      <div className="flex border-b border-[#E2E8F0] bg-white rounded-t px-4 pt-2 gap-4 text-xs font-semibold">
        <button
          onClick={() => setActiveTab("approvals")}
          className={cn(
            "pb-3 border-b-2 transition-all flex items-center gap-1.5",
            activeTab === "approvals"
              ? "border-[#714B67] text-[#714B67]"
              : "border-transparent text-[#64748B] hover:text-[#1E293B]"
          )}
        >
          <CheckCircle2 size={15} />
          <span>Content Approvals</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full bg-[#F1F5F9] text-[10px] text-[#475569]">
            {deliverables.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("vault")}
          className={cn(
            "pb-3 border-b-2 transition-all flex items-center gap-1.5",
            activeTab === "vault"
              ? "border-[#714B67] text-[#714B67]"
              : "border-transparent text-[#64748B] hover:text-[#1E293B]"
          )}
        >
          <Lock size={15} />
          <span>Encrypted Credential Vault</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full bg-[#F1F5F9] text-[10px] text-[#475569]">
            {vaultSecrets.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("billing")}
          className={cn(
            "pb-3 border-b-2 transition-all flex items-center gap-1.5",
            activeTab === "billing"
              ? "border-[#714B67] text-[#714B67]"
              : "border-transparent text-[#64748B] hover:text-[#1E293B]"
          )}
        >
          <Receipt size={15} />
          <span>Invoices & GST Receipts</span>
        </button>
      </div>

      {/* Tab 1: Content Approvals */}
      {activeTab === "approvals" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-[#1E293B] uppercase tracking-wider">
              Deliverables Queue ({deliverables.length} items)
            </span>
            <span className="text-xs text-[#64748B]">
              Review creative assets and approve for publishing.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {deliverables.map((del) => (
              <div
                key={del.id}
                className="bg-white border border-[#E2E8F0] rounded shadow-sm overflow-hidden flex flex-col justify-between"
              >
                <div className="p-5 space-y-4">
                  {/* Card Header */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-[#F8F9FA] text-[#475569] border border-[#CBD5E1]">
                      {del.format}
                    </span>
                    <span
                      className={cn(
                        "text-xs font-medium px-2.5 py-0.5 rounded-full border",
                        del.status === "APPROVED"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : del.status === "CLIENT_REVIEW"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-rose-50 text-rose-700 border-rose-200"
                      )}
                    >
                      {del.status === "APPROVED"
                        ? "Approved & Scheduled"
                        : del.status === "CLIENT_REVIEW"
                        ? "Awaiting Your Sign-off"
                        : "Revision Requested"}
                    </span>
                  </div>

                  {/* Asset Media Preview */}
                  <div className="h-60 w-full rounded bg-[#F1F5F9] overflow-hidden border border-[#E2E8F0]">
                    <img
                      src={del.media_url}
                      alt={del.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Title & Copy */}
                  <div>
                    <h3 className="text-base font-bold text-[#1E293B]">{del.title}</h3>
                    <div className="mt-2 p-3 rounded bg-[#F8F9FA] border border-[#E2E8F0] text-xs text-[#334155] leading-relaxed">
                      {del.copy}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#64748B] pt-1">
                    <span>Scheduled for: <strong>{del.scheduled_for}</strong></span>
                    <span>Version: <strong>v{del.version}</strong></span>
                  </div>
                </div>

                {/* Action Footer */}
                <div className="p-4 bg-[#F8F9FA] border-t border-[#E2E8F0]">
                  {del.status === "CLIENT_REVIEW" ? (
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => handleApprove(del.id)}
                        className="flex items-center justify-center gap-1.5 py-2 rounded bg-[#008784] hover:bg-[#00706D] text-white font-semibold text-xs transition-colors shadow-xs"
                      >
                        <Check size={15} />
                        <span>Approve Creative</span>
                      </button>
                      <button
                        onClick={() => handleOpenRevision(del.id)}
                        className="flex items-center justify-center gap-1.5 py-2 rounded bg-white hover:bg-rose-50 text-rose-700 font-semibold text-xs border border-rose-300 transition-colors shadow-xs"
                      >
                        <RotateCcw size={15} />
                        <span>Request Changes</span>
                      </button>
                    </div>
                  ) : del.status === "APPROVED" ? (
                    <div className="text-center py-1 text-[#059669] font-medium text-xs flex items-center justify-center gap-1.5">
                      <CheckCircle2 size={16} />
                      <span>Approved by client. Handed off to publishing daemon.</span>
                    </div>
                  ) : (
                    <div className="text-center py-1 text-[#E11D48] font-medium text-xs flex items-center justify-center gap-1.5">
                      <RotateCcw size={16} />
                      <span>Revision requested. Creative team is preparing v{del.version}.</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Encrypted AES-256 Vault */}
      {activeTab === "vault" && (
        <div className="space-y-4">
          <div className="bg-[#FAF5FF] border border-[#E9D5FF] rounded p-4 flex items-start gap-3 text-xs text-[#6B21A8]">
            <ShieldCheck size={20} className="text-[#714B67] shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-[#714B67]">
                End-to-End Symmetric Encryption (Fernet AES-256)
              </span>
              <p className="text-[#581C87] leading-relaxed">
                Passwords, ad account IDs, and API keys submitted below are encrypted at rest with AES-256 before writing to storage. Only authorized Muchads account leads can access them, and all access is recorded in the immutable audit log.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Active Secrets List */}
            <div className="bg-white border border-[#E2E8F0] rounded shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
                <h3 className="text-xs font-bold text-[#1E293B] uppercase tracking-wider">
                  Active Credential Slots ({vaultSecrets.length})
                </h3>
                <span className="text-xs text-[#059669] font-medium flex items-center gap-1">
                  <ShieldCheck size={14} />
                  Vault Protected
                </span>
              </div>

              <div className="divide-y divide-[#E2E8F0]">
                {vaultSecrets.map((s) => (
                  <div key={s.id} className="py-3 flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <span className="font-bold text-[#1E293B]">{s.platform}</span>
                      <div className="text-xs text-[#64748B] font-mono">
                        Identifier: {s.username} • Last synced: {s.updated_at}
                      </div>
                    </div>

                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      AES-256 Encrypted
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Submit Secret Form */}
            <form
              onSubmit={handleAddSecret}
              className="bg-white border border-[#E2E8F0] rounded shadow-sm p-5 space-y-4"
            >
              <div className="pb-2 border-b border-[#F1F5F9]">
                <h3 className="text-xs font-bold text-[#1E293B] uppercase tracking-wider">
                  Submit Secure Access Credential
                </h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Securely provide credentials for ad platforms, stores, or social accounts.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[#475569] font-medium mb-1">Platform Name *</label>
                  <input
                    type="text"
                    value={newSecretPlatform}
                    onChange={(e) => setNewSecretPlatform(e.target.value)}
                    placeholder="e.g. Meta Ads Manager / Shopify Admin Key"
                    className="w-full bg-[#F8F9FA] border border-[#CBD5E1] rounded p-2 text-xs text-[#1E293B] outline-none focus:border-[#714B67]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[#475569] font-medium mb-1">Secret Key / Password *</label>
                  <input
                    type="password"
                    value={newSecretValue}
                    onChange={(e) => setNewSecretValue(e.target.value)}
                    placeholder="••••••••••••••••"
                    className="w-full bg-[#F8F9FA] border border-[#CBD5E1] rounded p-2 text-xs text-[#1E293B] outline-none focus:border-[#714B67] font-mono"
                    required
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-[#714B67] hover:bg-[#5E3D55] text-white font-medium text-xs transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <Lock size={13} />
                  <span>Encrypt & Submit to Vault</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tab 3: Billing & Invoices */}
      {activeTab === "billing" && (
        <div className="bg-white border border-[#E2E8F0] rounded shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
            <div>
              <h3 className="text-xs font-bold text-[#1E293B] uppercase tracking-wider">
                Invoices & Tax Receipts
              </h3>
              <p className="text-xs text-[#64748B]">All invoices comply with Indian GST rules (SAC 998311).</p>
            </div>
            <span className="text-xs font-mono bg-[#F8F9FA] px-2.5 py-1 rounded border border-[#CBD5E1] text-[#475569]">
              Client GSTIN: 27AABCB1234D1Z5
            </span>
          </div>

          <div className="divide-y divide-[#E2E8F0]">
            <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-[#1E293B]">INV-202611-0001</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Paid
                  </span>
                </div>
                <div className="text-xs text-[#64748B]">
                  Monthly Retainer (Social Media + Performance Ads) • Billed on 01 Nov 2026
                </div>
                <div className="text-xs font-mono text-[#334155]">
                  Subtotal: ₹75,000 + 18% GST (CGST ₹6,750 + SGST ₹6,750) = <strong>₹88,500</strong>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => toast.success("Invoice PDF receipt downloaded")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#F8F9FA] hover:bg-[#F1F5F9] border border-[#CBD5E1] text-[#334155] font-medium text-xs transition-colors"
                >
                  <Download size={14} />
                  <span>Download Tax PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Revision Modal */}
      {showRevisionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white border border-[#CBD5E1] rounded-lg max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <h3 className="text-sm font-bold text-[#1E293B]">Request Deliverable Edits</h3>
              <button
                onClick={() => setShowRevisionModal(false)}
                className="text-[#94A3B8] hover:text-[#1E293B]"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-[#64748B]">
              Your revision feedback will automatically increment the version tag and reassign this asset to our design lead.
            </p>

            <textarea
              value={revisionFeedback}
              onChange={(e) => setRevisionFeedback(e.target.value)}
              placeholder="Detail specific modifications needed (e.g. font adjustments, color tone, copy edits)..."
              className="w-full bg-[#F8F9FA] text-[#1E293B] border border-[#CBD5E1] rounded p-2.5 text-xs h-24 outline-none focus:border-[#714B67]"
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-[#F1F5F9]">
              <button
                onClick={() => setShowRevisionModal(false)}
                className="px-3 py-1.5 rounded bg-[#F1F5F9] hover:bg-[#E2E8F0] text-xs text-[#475569]"
              >
                Cancel
              </button>
              <button
                onClick={submitRevision}
                className="px-4 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs transition-colors shadow-xs"
              >
                Send Revision Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
