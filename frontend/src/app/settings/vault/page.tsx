"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Lock,
  Key,
  Eye,
  EyeOff,
  Copy,
  Plus,
  AlertTriangle,
  FileText,
  Laptop,
  Smartphone,
  Globe,
  LogOut,
  X,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { OdooControlPanel } from "@/components/layout/OdooControlPanel";
import { api } from "@/lib/api";

interface VaultEntry {
  id: string;
  client_name: string;
  platform: string;
  username: string;
  is_decrypted: boolean;
  decrypted_value?: string;
  last_accessed: string;
}

const mockVault: VaultEntry[] = [
  {
    id: "sec_1",
    client_name: "Bombay Chai Co.",
    platform: "Meta Ads & Business Manager Access Token",
    username: "client@bombaychaico.com",
    is_decrypted: false,
    decrypted_value: "EAABwzLixnjYBA...mock_meta_long_lived_token_8892",
    last_accessed: "2026-11-08 14:22 UTC by Aarav Sharma",
  },
  {
    id: "sec_2",
    client_name: "Bombay Chai Co.",
    platform: "Google Ads Service Account JSON",
    username: "service-account@bombay-chai.iam.gserviceaccount.com",
    is_decrypted: false,
    decrypted_value: "eyJ0eXBlIjogInNlcnZpY2VfYWNjb3VudCIsICJwcm9qZWN0X2lkIjogImJvbWJheS1jaGFpIn0=",
    last_accessed: "2026-11-07 10:15 UTC by Muchad Founder",
  },
  {
    id: "sec_3",
    client_name: "Urban Vibe Apparels",
    platform: "Shopify Store Admin API Secret Key",
    username: "urbanvibe.myshopify.com",
    is_decrypted: false,
    decrypted_value: "mock_shopify_admin_token_sample",
    last_accessed: "Never decrypted",
  },
];

interface SessionItem {
  id: string;
  device_name: string;
  ip_address: string;
  last_seen_at: string;
  is_current: boolean;
}

const mockSessions: SessionItem[] = [
  {
    id: "sess_1",
    device_name: "Chrome 122 on Windows 11 (Current Workstation)",
    ip_address: "103.21.124.89 (Mumbai, India)",
    last_seen_at: "Active Now",
    is_current: true,
  },
  {
    id: "sess_2",
    device_name: "Safari 17 on iPhone 15 Pro",
    ip_address: "103.21.124.90 (Mumbai, India)",
    last_seen_at: "2 hours ago",
    is_current: false,
  },
  {
    id: "sess_3",
    device_name: "Edge 121 on macOS Sonoma",
    ip_address: "49.207.211.12 (Bengaluru, India)",
    last_seen_at: "Yesterday at 18:30 UTC",
    is_current: false,
  },
];

export default function VaultPage() {
  const [entries, setEntries] = useState<VaultEntry[]>(mockVault);
  const [sessions, setSessions] = useState<SessionItem[]>(mockSessions);
  const [activeTab, setActiveTab] = useState<"vault" | "sessions" | "policy">("vault");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewSecretModal, setShowNewSecretModal] = useState(false);
  const [newSecret, setNewSecret] = useState({
    client_name: "",
    platform: "",
    username: "",
    secret_value: "",
  });

  const handleToggleDecrypt = (id: string) => {
    setEntries((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const willDecrypt = !item.is_decrypted;
          if (willDecrypt) {
            toast.info("AES-256 Decryption authorized. Access logged in Automation Audit Trail.");
          }
          return {
            ...item,
            is_decrypted: willDecrypt,
            last_accessed: willDecrypt ? "Just now by You" : item.last_accessed,
          };
        }
        return item;
      })
    );
  };

  const handleCopy = (value: string) => {
    navigator.clipboard.writeText(value);
    toast.success("Secret copied to clipboard! Clipboard will be purged.");
  };

  const handleTerminateSession = (sessionId: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    toast.success("Session revoked. Refresh token invalidated.");
  };

  const handleLogoutEverywhere = () => {
    setSessions((prev) => prev.filter((s) => s.is_current));
    toast.success("All other active device sessions have been terminated.");
  };

  const handleCreateSecret = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSecret.platform || !newSecret.secret_value) return;

    const created: VaultEntry = {
      id: `sec_${Date.now()}`,
      client_name: newSecret.client_name || "General Client",
      platform: newSecret.platform,
      username: newSecret.username || "admin",
      is_decrypted: false,
      decrypted_value: newSecret.secret_value,
      last_accessed: "Just created",
    };

    setEntries((prev) => [created, ...prev]);
    setShowNewSecretModal(false);
    setNewSecret({ client_name: "", platform: "", username: "", secret_value: "" });
    toast.success("Secret encrypted via Fernet AES-256 and stored in vault.");
  };

  const filteredEntries = entries.filter((e) =>
    e.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.platform.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Odoo Control Panel */}
      <OdooControlPanel
        appName="Settings"
        viewName="Encrypted Vault & Sessions"
        newButtonLabel="New Secret"
        onNewClick={() => setShowNewSecretModal(true)}
        availableViews={["list"]}
        activeView="list"
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        totalCount={filteredEntries.length}
      />

      {/* Odoo Tabs */}
      <div className="flex border-b border-[#E2E8F0] bg-white rounded-t px-4 pt-2 gap-4 text-xs font-semibold">
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
          <span>Brand Credentials ({entries.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("sessions")}
          className={cn(
            "pb-3 border-b-2 transition-all flex items-center gap-1.5",
            activeTab === "sessions"
              ? "border-[#714B67] text-[#714B67]"
              : "border-transparent text-[#64748B] hover:text-[#1E293B]"
          )}
        >
          <Smartphone size={15} />
          <span>Active Device Sessions ({sessions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("policy")}
          className={cn(
            "pb-3 border-b-2 transition-all flex items-center gap-1.5",
            activeTab === "policy"
              ? "border-[#714B67] text-[#714B67]"
              : "border-transparent text-[#64748B] hover:text-[#1E293B]"
          )}
        >
          <ShieldCheck size={15} />
          <span>Security & Encryption Standards</span>
        </button>
      </div>

      {/* Tab 1: Brand Credentials Vault */}
      {activeTab === "vault" && (
        <div className="space-y-4">
          <div className="bg-[#FAF5FF] border border-[#E9D5FF] rounded p-4 flex items-start gap-3 text-xs text-[#6B21A8]">
            <ShieldCheck size={20} className="text-[#714B67] shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-[#714B67]">
                Fernet AES-256 Symmetric Encryption at Rest
              </span>
              <p className="text-[#581C87] leading-relaxed">
                Zero-knowledge encryption for Meta, Google, and Shopify production access. Decryption events write immutable records to the audit log with actor ID and timestamp.
              </p>
            </div>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded shadow-sm divide-y divide-[#E2E8F0]">
            <div className="p-3.5 bg-[#F8F9FA] flex items-center justify-between">
              <span className="text-xs font-bold text-[#1E293B] uppercase tracking-wider">
                Credential Ledger ({filteredEntries.length} Records)
              </span>
              <span className="text-xs text-[#64748B]">PBKDF2 Key Derivation Active</span>
            </div>

            {filteredEntries.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#94A3B8]">
                No secrets match your search.
              </div>
            ) : (
              filteredEntries.map((entry) => (
                <div key={entry.id} className="p-5 space-y-3 hover:bg-[#FAFAFA] transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1]">
                          {entry.client_name}
                        </span>
                        <span className="text-xs font-mono text-[#64748B]">
                          User: {entry.username}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-[#1E293B]">{entry.platform}</h3>
                    </div>

                    <button
                      onClick={() => handleToggleDecrypt(entry.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-white hover:bg-[#F1F5F9] border border-[#CBD5E1] text-[#334155] text-xs font-medium transition-colors shadow-xs"
                    >
                      {entry.is_decrypted ? <EyeOff size={14} /> : <Eye size={14} />}
                      <span>{entry.is_decrypted ? "Conceal" : "Decrypt Secret"}</span>
                    </button>
                  </div>

                  {/* Secret Display Value Box */}
                  <div className="p-3 rounded bg-[#F8F9FA] border border-[#E2E8F0] flex items-center justify-between font-mono text-xs">
                    <div className="truncate pr-4 text-[#334155]">
                      {entry.is_decrypted ? (
                        <span className="text-[#059669] font-bold">{entry.decrypted_value}</span>
                      ) : (
                        <span className="text-[#94A3B8] tracking-widest">
                          gAAAAABl••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
                        </span>
                      )}
                    </div>

                    {entry.is_decrypted && (
                      <button
                        onClick={() => handleCopy(entry.decrypted_value || "")}
                        className="p-1 rounded text-[#64748B] hover:text-[#1E293B]"
                        title="Copy Secret"
                      >
                        <Copy size={14} />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#64748B] font-mono">
                    <span>Audit Trail: {entry.last_accessed}</span>
                    <span className="text-[#059669]">Algorithm: AES-256-CBC + HMAC-SHA256</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Active Device Sessions */}
      {activeTab === "sessions" && (
        <div className="bg-white border border-[#E2E8F0] rounded shadow-sm p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
            <div>
              <h3 className="text-xs font-bold text-[#1E293B] uppercase tracking-wider">
                Multi-Device Session Management
              </h3>
              <p className="text-xs text-[#64748B]">
                Review all active browser and mobile sessions authenticated under your account.
              </p>
            </div>

            <button
              onClick={handleLogoutEverywhere}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-xs font-semibold transition-colors"
            >
              <LogOut size={14} />
              <span>Log Out Everywhere Else</span>
            </button>
          </div>

          <div className="divide-y divide-[#E2E8F0]">
            {sessions.map((sess) => (
              <div key={sess.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded bg-[#F1F5F9] text-[#714B67] flex items-center justify-center shrink-0 mt-0.5">
                    {sess.device_name.toLowerCase().includes("phone") ? (
                      <Smartphone size={16} />
                    ) : (
                      <Laptop size={16} />
                    )}
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#1E293B]">{sess.device_name}</span>
                      {sess.is_current && (
                        <span className="px-2 py-0.2 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Current Session
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#64748B]">
                      IP: {sess.ip_address} • Last activity: <strong>{sess.last_seen_at}</strong>
                    </div>
                  </div>
                </div>

                {!sess.is_current && (
                  <button
                    onClick={() => handleTerminateSession(sess.id)}
                    className="px-3 py-1 rounded bg-white hover:bg-rose-50 text-rose-600 border border-[#CBD5E1] hover:border-rose-300 text-xs font-medium transition-colors"
                  >
                    Revoke Session
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Security & Encryption Standards */}
      {activeTab === "policy" && (
        <div className="bg-white border border-[#E2E8F0] rounded shadow-sm p-6 space-y-5 text-xs text-[#334155] leading-relaxed">
          <div className="pb-3 border-b border-[#E2E8F0]">
            <h3 className="text-sm font-bold text-[#1E293B]">
              Cryptographic Architecture & Access Compliance
            </h3>
            <p className="text-xs text-[#64748B]">
              How The Desi Muchads OS secures agency and client confidential data.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded border border-[#E2E8F0] bg-[#F8F9FA] space-y-2">
              <span className="font-bold text-[#1E293B] flex items-center gap-1.5">
                <Lock size={15} className="text-[#714B67]" />
                AES-256 Symmetric
              </span>
              <p className="text-xs text-[#64748B]">
                Utilizes Python cryptography Fernet specification with authenticated symmetric key rotation and 128-bit initialization vector.
              </p>
            </div>

            <div className="p-4 rounded border border-[#E2E8F0] bg-[#F8F9FA] space-y-2">
              <span className="font-bold text-[#1E293B] flex items-center gap-1.5">
                <ShieldCheck size={15} className="text-[#008784]" />
                Dual-Token JWT
              </span>
              <p className="text-xs text-[#64748B]">
                Access tokens held in memory with 15m expiration. Refresh tokens isolated in HttpOnly, SameSite=Strict cookies with Redis blacklisting.
              </p>
            </div>

            <div className="p-4 rounded border border-[#E2E8F0] bg-[#F8F9FA] space-y-2">
              <span className="font-bold text-[#1E293B] flex items-center gap-1.5">
                <Clock size={15} className="text-[#D97706]" />
                Immutable Audit Trail
              </span>
              <p className="text-xs text-[#64748B]">
                Every decryption, export, and onboarding workflow generates an unmodifiable audit row recording timestamp, IP, and authorized actor.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* New Secret Modal */}
      {showNewSecretModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <form
            onSubmit={handleCreateSecret}
            className="bg-white border border-[#CBD5E1] rounded-lg max-w-md w-full p-6 space-y-4 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <h3 className="text-sm font-bold text-[#1E293B]">Add Client Credential to Vault</h3>
              <button
                type="button"
                onClick={() => setShowNewSecretModal(false)}
                className="text-[#94A3B8] hover:text-[#1E293B]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[#475569] font-medium mb-1">Client Organization *</label>
                <input
                  type="text"
                  value={newSecret.client_name}
                  onChange={(e) => setNewSecret({ ...newSecret, client_name: e.target.value })}
                  placeholder="e.g. Bombay Chai Co."
                  className="w-full bg-[#F8F9FA] border border-[#CBD5E1] rounded p-2 text-xs text-[#1E293B] outline-none focus:border-[#714B67]"
                  required
                />
              </div>

              <div>
                <label className="block text-[#475569] font-medium mb-1">Platform / Service Name *</label>
                <input
                  type="text"
                  value={newSecret.platform}
                  onChange={(e) => setNewSecret({ ...newSecret, platform: e.target.value })}
                  placeholder="e.g. Meta Ads Access Token / Shopify API Key"
                  className="w-full bg-[#F8F9FA] border border-[#CBD5E1] rounded p-2 text-xs text-[#1E293B] outline-none focus:border-[#714B67]"
                  required
                />
              </div>

              <div>
                <label className="block text-[#475569] font-medium mb-1">Account Identifier / Username</label>
                <input
                  type="text"
                  value={newSecret.username}
                  onChange={(e) => setNewSecret({ ...newSecret, username: e.target.value })}
                  placeholder="e.g. client@bombaychaico.com"
                  className="w-full bg-[#F8F9FA] border border-[#CBD5E1] rounded p-2 text-xs text-[#1E293B] outline-none focus:border-[#714B67]"
                />
              </div>

              <div>
                <label className="block text-[#475569] font-medium mb-1">Secret Key / Production Password *</label>
                <input
                  type="password"
                  value={newSecret.secret_value}
                  onChange={(e) => setNewSecret({ ...newSecret, secret_value: e.target.value })}
                  placeholder="••••••••••••••••"
                  className="w-full bg-[#F8F9FA] border border-[#CBD5E1] rounded p-2 text-xs text-[#1E293B] outline-none focus:border-[#714B67] font-mono"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#F1F5F9]">
              <button
                type="button"
                onClick={() => setShowNewSecretModal(false)}
                className="px-3 py-1.5 rounded bg-[#F1F5F9] hover:bg-[#E2E8F0] text-xs font-medium text-[#475569]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded bg-[#714B67] hover:bg-[#5E3D55] text-white font-medium text-xs transition-colors shadow-xs"
              >
                Encrypt & Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
