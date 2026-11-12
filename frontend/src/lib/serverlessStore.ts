import fs from "fs";
import path from "path";
import os from "os";

export interface ServerlessDeal {
  id: string;
  company_name: string;
  industry: string;
  primary_contact_name: string;
  contact_name?: string;
  contact_email: string;
  email?: string;
  contact_phone: string;
  phone?: string;
  deal_stage: string;
  deal_value: number;
  retainer_amount: number;
  status: string;
  health_score: number;
  last_activity_at: string;
  is_decaying: boolean;
  notes?: string;
  created_at: string;
  proposal_id?: string;
  proposal_platforms?: string[];
}

export interface ServerlessClient {
  id: string;
  company_name: string;
  industry: string;
  primary_contact_name: string;
  contact_email: string;
  contact_phone: string;
  retainer_amount: number;
  status: string;
  billing_cycle_day: number;
  deal_stage?: string;
  deal_value?: number;
  created_at: string;
}

const DEALS_FILE = path.join(os.tmpdir(), "muchad_crm_deals.json");
const CLIENTS_FILE = path.join(os.tmpdir(), "muchad_crm_clients.json");

function ensureUuid(id?: string): string {
  if (id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return id;
  }
  return crypto.randomUUID();
}

// In-memory cache for ultra-fast serverless response
let memoryDeals: ServerlessDeal[] | null = null;
let memoryClients: ServerlessClient[] | null = null;

function loadDealsFromFile(): ServerlessDeal[] {
  if (memoryDeals) return memoryDeals;
  try {
    if (fs.existsSync(DEALS_FILE)) {
      const raw = fs.readFileSync(DEALS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        memoryDeals = parsed;
        return memoryDeals;
      }
    }
  } catch (err) {
    console.warn("[ServerlessStore] Error reading deals file:", err);
  }
  memoryDeals = [];
  return memoryDeals;
}

function persistDeals(deals: ServerlessDeal[]) {
  memoryDeals = deals;
  try {
    fs.writeFileSync(DEALS_FILE, JSON.stringify(deals, null, 2), "utf-8");
  } catch (err) {
    console.warn("[ServerlessStore] Error writing deals file:", err);
  }
}

function loadClientsFromFile(): ServerlessClient[] {
  if (memoryClients) return memoryClients;
  try {
    if (fs.existsSync(CLIENTS_FILE)) {
      const raw = fs.readFileSync(CLIENTS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        memoryClients = parsed;
        return memoryClients;
      }
    }
  } catch (err) {
    console.warn("[ServerlessStore] Error reading clients file:", err);
  }
  memoryClients = [];
  return memoryClients;
}

function persistClients(clients: ServerlessClient[]) {
  memoryClients = clients;
  try {
    fs.writeFileSync(CLIENTS_FILE, JSON.stringify(clients, null, 2), "utf-8");
  } catch (err) {
    console.warn("[ServerlessStore] Error writing clients file:", err);
  }
}

export function getAllDeals(): ServerlessDeal[] {
  return loadDealsFromFile();
}

export function getDealById(id: string): ServerlessDeal | undefined {
  const deals = loadDealsFromFile();
  return deals.find((d) => String(d.id) === String(id));
}

export function saveDeal(dealData: Partial<ServerlessDeal>): ServerlessDeal {
  const deals = loadDealsFromFile();
  const now = new Date().toISOString();
  const id = ensureUuid(dealData.id);

  const newDeal: ServerlessDeal = {
    id: String(id),
    company_name: dealData.company_name || "New Enterprise Prospect",
    industry: dealData.industry || "Marketing & Growth",
    primary_contact_name: dealData.primary_contact_name || dealData.contact_name || "Founder",
    contact_name: dealData.primary_contact_name || dealData.contact_name || "Founder",
    contact_email: dealData.contact_email || dealData.email || "founder@company.in",
    email: dealData.contact_email || dealData.email || "founder@company.in",
    contact_phone: dealData.contact_phone || dealData.phone || "+91 98000 00000",
    phone: dealData.contact_phone || dealData.phone || "+91 98000 00000",
    deal_stage: dealData.deal_stage || "LEAD_CAPTURED",
    deal_value: Number(dealData.deal_value) || 85000,
    retainer_amount: Number(dealData.retainer_amount) || Number(dealData.deal_value) || 85000,
    status: dealData.status || "LEAD",
    health_score: dealData.health_score || 95,
    last_activity_at: now,
    is_decaying: false,
    notes: dealData.notes || "",
    created_at: now,
  };

  const existingIndex = deals.findIndex((d) => String(d.id) === String(id));
  if (existingIndex >= 0) {
    deals[existingIndex] = { ...deals[existingIndex], ...newDeal, last_activity_at: now };
  } else {
    deals.unshift(newDeal);
  }

  persistDeals(deals);
  return newDeal;
}

export function updateDeal(id: string, updates: Partial<ServerlessDeal>): ServerlessDeal | null {
  const deals = loadDealsFromFile();
  const index = deals.findIndex((d) => String(d.id) === String(id));
  if (index === -1) return null;

  const existing = deals[index];
  const now = new Date().toISOString();

  const updated: ServerlessDeal = {
    ...existing,
    ...updates,
    last_activity_at: now,
  };

  // Sync alias fields
  if (updates.deal_stage) updated.deal_stage = updates.deal_stage;
  if (updates.deal_value) {
    updated.deal_value = Number(updates.deal_value);
    if (!updates.retainer_amount) updated.retainer_amount = Number(updates.deal_value);
  }
  if (updates.contact_name) updated.primary_contact_name = updates.contact_name;
  if (updates.primary_contact_name) updated.contact_name = updates.primary_contact_name;
  if (updates.email) updated.contact_email = updates.email;
  if (updates.contact_email) updated.email = updates.contact_email;
  if (updates.phone) updated.contact_phone = updates.phone;
  if (updates.contact_phone) updated.phone = updates.contact_phone;

  deals[index] = updated;
  persistDeals(deals);
  return updated;
}

export function deleteDeal(id: string): boolean {
  const deals = loadDealsFromFile();
  const initialLen = deals.length;
  const filtered = deals.filter((d) => String(d.id) !== String(id));
  if (filtered.length !== initialLen) {
    persistDeals(filtered);
    return true;
  }
  return false;
}

export function injectBatchLeads(leads: any[], stage = "LEAD_CAPTURED"): ServerlessDeal[] {
  const deals = loadDealsFromFile();
  const existingCompanyNames = new Set(deals.map((d) => d.company_name.toLowerCase().trim()));
  const now = new Date().toISOString();
  const created: ServerlessDeal[] = [];

  for (const lead of leads) {
    const company = (lead.company_name || "").trim();
    if (!company || existingCompanyNames.has(company.toLowerCase())) {
      continue;
    }

    const dealId = ensureUuid(
      lead.temp_id && lead.temp_id.length === 36 && lead.temp_id.includes("-") ? lead.temp_id : undefined
    );

    const deal: ServerlessDeal = {
      id: dealId,
      company_name: company,
      industry: lead.niche || lead.industry || "Marketing & Growth",
      primary_contact_name: lead.founder_name || lead.primary_contact_name || lead.contact_name || "Founder",
      contact_name: lead.founder_name || lead.primary_contact_name || lead.contact_name || "Founder",
      contact_email: lead.email || lead.contact_email || "founder@company.in",
      email: lead.email || lead.contact_email || "founder@company.in",
      contact_phone: lead.phone || lead.contact_phone || "+91 98000 00000",
      phone: lead.phone || lead.contact_phone || "+91 98000 00000",
      deal_stage: stage,
      deal_value: Number(lead.deal_value) || 75000,
      retainer_amount: Number(lead.deal_value) || 75000,
      status: "LEAD",
      health_score: Number(lead.intent_score) || 92,
      last_activity_at: now,
      is_decaying: false,
      notes: lead.audit_findings || lead.notes || "",
      created_at: now,
    };

    created.push(deal);
    existingCompanyNames.add(company.toLowerCase());
  }

  if (created.length > 0) {
    const updated = [...created, ...deals];
    persistDeals(updated);
  }

  return created;
}

export function getAllClients(): ServerlessClient[] {
  return loadClientsFromFile();
}

export function saveClientFromDeal(dealId: string, initialRetainer?: number): ServerlessClient | null {
  const deal = getDealById(dealId);
  if (!deal) return null;

  updateDeal(dealId, { deal_stage: "WON", status: "ACTIVE" });

  const clients = loadClientsFromFile();
  const now = new Date().toISOString();
  const newClient: ServerlessClient = {
    id: ensureUuid(),
    company_name: deal.company_name,
    industry: deal.industry,
    primary_contact_name: deal.primary_contact_name,
    contact_email: deal.contact_email,
    contact_phone: deal.contact_phone,
    retainer_amount: initialRetainer || deal.retainer_amount || deal.deal_value,
    status: "ACTIVE",
    billing_cycle_day: 1,
    deal_stage: "WON",
    deal_value: deal.deal_value,
    created_at: now,
  };

  const existingIdx = clients.findIndex((c) => c.company_name.toLowerCase() === deal.company_name.toLowerCase());
  if (existingIdx >= 0) {
    clients[existingIdx] = { ...clients[existingIdx], ...newClient };
  } else {
    clients.unshift(newClient);
  }

  persistClients(clients);
  return newClient;
}
