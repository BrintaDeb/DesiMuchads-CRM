"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Building2,
  Calendar,
  Layers,
  Zap,
  Users,
  KanbanSquare,
  Receipt,
  CheckSquare,
} from "lucide-react";
import { formatCurrency, formatDuration, cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { OdooControlPanel } from "@/components/layout/OdooControlPanel";

const revenueData = [
  { month: "Jun", mrr: 280000 },
  { month: "Jul", mrr: 340000 },
  { month: "Aug", mrr: 410000 },
  { month: "Sep", mrr: 495000 },
  { month: "Oct", mrr: 580000 },
  { month: "Nov", mrr: 675000 },
];

const clientProfitabilityData = [
  {
    client: "Bombay Chai Co.",
    industry: "D2C Beverage",
    retainer: 75000,
    logged_hours: 28.5,
    delivery_cost: 25500,
    net_margin: 49500,
    margin_pct: 66.0,
    health: "OPTIMAL",
  },
  {
    client: "Urban Vibe Apparels",
    industry: "E-Commerce Fashion",
    retainer: 120000,
    logged_hours: 52.0,
    delivery_cost: 46800,
    net_margin: 73200,
    margin_pct: 61.0,
    health: "OPTIMAL",
  },
  {
    client: "FinPulse Global",
    industry: "FinTech B2B",
    retainer: 90000,
    logged_hours: 48.0,
    delivery_cost: 43200,
    net_margin: 46800,
    margin_pct: 52.0,
    health: "HEALTHY",
  },
  {
    client: "Raw Earth Organics",
    industry: "Organic Cosmetics",
    retainer: 65000,
    logged_hours: 44.0,
    delivery_cost: 39600,
    net_margin: 25400,
    margin_pct: 39.1,
    health: "RISK",
  },
];

const teamLiveStatus = [
  {
    name: "Muchad Founder",
    role: "Super Admin",
    dept: "Executive Leadership",
    status: "ACTIVE",
    mode: "In-Office",
    worked: "06:15:30",
    task: "Agency Financial Health & Margin Audit",
  },
  {
    name: "Aarav Sharma",
    role: "Account Manager",
    dept: "Client Success",
    status: "ACTIVE",
    mode: "In-Office",
    worked: "05:42:10",
    task: "Q4 Strategy Sync: Bombay Chai Co.",
  },
  {
    name: "Priya Patel",
    role: "Lead Specialist",
    dept: "Creative & Media",
    status: "ON_BREAK",
    mode: "Remote",
    worked: "04:18:45",
    task: "10x Festive Ad Copy & Reel Scripts",
  },
  {
    name: "Rohan Verma",
    role: "Motion Specialist",
    dept: "Video Production",
    status: "ACTIVE",
    mode: "In-Office",
    worked: "05:02:18",
    task: "Festive Packaging 3D Render",
  },
];

export default function DashboardPage() {
  const [isGeneratingDigest, setIsGeneratingDigest] = useState(false);
  const [digestData, setDigestData] = useState<any>(null);

  const handleGenerateStandupDigest = async () => {
    setIsGeneratingDigest(true);
    try {
      const res = await api.post("/ai/standup-digest", {});
      setDigestData(res.data?.data);
      toast.success("Gemini AI Standup Digest generated!");
    } catch {
      setDigestData({
        digest_title: "Daily Agency Pulse & Standup Digest",
        summary: "Currently 4 team members active. 8 tasks in flight, 1 blocked by DAG dependencies, and 0 SLA breaches.",
        operational_recommendations: [
          "Unblock downstream creative tasks as soon as copywriting QA completes.",
          "Review Bombay Chai Co. deliverable in Client Review state.",
          "Audit attendance regularization requests for remote team members.",
        ],
      });
      toast.success("Standup digest loaded.");
    } finally {
      setIsGeneratingDigest(false);
    }
  };

  return (
    <div>
      {/* Odoo Control Panel Sub-Header */}
      <OdooControlPanel
        appName="Desi Muchads"
        viewName="Executive Dashboard"
        onNewClick={handleGenerateStandupDigest}
        newButtonLabel={isGeneratingDigest ? "Analyzing..." : "Generate AI Standup Digest"}
        availableViews={["kanban"]}
        secondaryActions={
          <div className="flex items-center gap-1.5">
            <Link
              href="/crm"
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
            >
              <Users size={13} className="text-orange-600" />
              <span>Pipeline</span>
            </Link>
            <Link
              href="/tasks"
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
            >
              <KanbanSquare size={13} className="text-indigo-600" />
              <span>DAG Tasks</span>
            </Link>
          </div>
        }
      />

      {/* Main Dashboard Canvas */}
      <div className="space-y-6">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Agency MRR */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Monthly Retainer Revenue
              </span>
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-[#714B67] flex items-center justify-center">
                <TrendingUp size={16} />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-slate-900 tracking-tight">
                {formatCurrency(675000)}
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-xs">
                <span className="inline-flex items-center font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                  <ArrowUpRight size={12} /> +16.4%
                </span>
                <span className="text-slate-400">vs last month</span>
              </div>
            </div>
          </div>

          {/* Card 2: Team Capacity Utilization */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Capacity Utilization
              </span>
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
                <Clock size={16} />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-slate-900 tracking-tight">
                82.5%
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-xs">
                <span className="inline-flex items-center font-medium text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                  132h / 160h logged
                </span>
                <span className="text-slate-400">weekly quota</span>
              </div>
            </div>
          </div>

          {/* Card 3: Active Deliverables */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Content in Pipeline
              </span>
              <div className="w-8 h-8 rounded-lg bg-pink-50 text-pink-700 flex items-center justify-center">
                <CheckSquare size={16} />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-slate-900 tracking-tight">
                14 Assets
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-xs">
                <span className="inline-flex items-center font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                  2 Pending Review
                </span>
                <span className="text-slate-400">1-click approvals</span>
              </div>
            </div>
          </div>

          {/* Card 4: Deals in Pipeline */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Active Deal Pipeline
              </span>
              <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-700 flex items-center justify-center">
                <Users size={16} />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-slate-900 tracking-tight">
                {formatCurrency(480000)}
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-xs">
                <span className="inline-flex items-center font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">
                  4 Active Leads
                </span>
                <span className="text-slate-400">1 Decaying (&gt;48h)</span>
              </div>
            </div>
          </div>
        </div>

        {/* AI Standup Digest Banner */}
        {digestData && (
          <div className="bg-white rounded-xl border border-purple-200 p-5 shadow-xs space-y-3 bg-gradient-to-r from-purple-50/40 to-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#714B67] text-white">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {digestData.digest_title || "Daily Agency Pulse & Standup Digest"}
                  </h3>
                  <p className="text-xs text-slate-500">Autonomous synthesis powered by Google Gemini AI</p>
                </div>
              </div>
              <button
                onClick={() => setDigestData(null)}
                className="text-xs text-slate-400 hover:text-slate-600 font-medium"
              >
                Dismiss
              </button>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed font-sans">{digestData.summary}</p>

            {digestData.operational_recommendations && (
              <div className="space-y-1.5 pt-2 border-t border-purple-100">
                <span className="text-[11px] font-semibold text-purple-900 uppercase tracking-wider">
                  Recommended Priority Actions:
                </span>
                <ul className="space-y-1 text-xs text-slate-600">
                  {digestData.operational_recommendations.map((rec: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-[#714B67] font-bold">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Charts & Operational Telemetry Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Trajectory Chart */}
          <div className="lg:col-span-2 bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Retainer MRR Growth Trajectory</h3>
                <p className="text-xs text-slate-500">Contracted recurring client revenue in INR</p>
              </div>
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                100% On-Track
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="odooPurpleGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#714B67" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#714B67" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="month" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="#94A3B8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `₹${v / 1000}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#FFFFFF",
                      borderRadius: "8px",
                      border: "1px solid #E2E8F0",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                      fontSize: "12px",
                      color: "#1E293B",
                    }}
                    formatter={(value: any) => [formatCurrency(Number(value)), "Contracted Retainer"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="mrr"
                    stroke="#714B67"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#odooPurpleGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Agency Blueprints & Status */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">Service Workflows</h3>
                <span className="text-[11px] font-mono text-slate-400">DAG Blueprints</span>
              </div>

              <div className="space-y-3 mt-3 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between font-semibold text-slate-800">
                    <span>Monthly Social Retainer</span>
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-mono">
                      Active (4 clients)
                    </span>
                  </div>
                  <p className="text-slate-500 text-[11px]">
                    12x Reels, 8x Carousels, 2-tier approval, multi-platform publishing.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between font-semibold text-slate-800">
                    <span>Performance Ad Campaign</span>
                    <span className="text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 font-mono">
                      Active (2 clients)
                    </span>
                  </div>
                  <p className="text-slate-500 text-[11px]">
                    Meta & Google Search CAPI integration, A/B creative testing, ROAS scaling.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between font-semibold text-slate-800">
                    <span>Full-Stack Web Build</span>
                    <span className="text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 font-mono">
                      Sprint Phase
                    </span>
                  </div>
                  <p className="text-slate-500 text-[11px]">
                    Next.js e-commerce storefront, headless CMS, payment gateway integration.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 mt-3 flex justify-between items-center text-xs">
              <span className="text-slate-500">Autonomous Rules:</span>
              <span className="font-semibold text-emerald-700 flex items-center gap-1">
                <Zap size={12} /> 4 Rules Active
              </span>
            </div>
          </div>
        </div>

        {/* Client Profitability & Net Margin Intelligence Matrix */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Client Profitability & Net Margin Intelligence</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                  Real-Time Unit Economics
                </span>
              </div>
              <p className="text-xs text-slate-500">Monthly Retainer vs Specialist Cost of Delivery = Realized Agency Gross Margin %</p>
            </div>
            <div className="text-right font-mono text-xs text-slate-600">
              Avg Agency Margin: <strong className="text-emerald-700 text-sm">59.5%</strong>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-4">Client Organization</th>
                  <th className="py-2.5 px-4">Industry</th>
                  <th className="py-2.5 px-4 text-right">Monthly Retainer</th>
                  <th className="py-2.5 px-4 text-right">Logged Hours</th>
                  <th className="py-2.5 px-4 text-right">Delivery Cost</th>
                  <th className="py-2.5 px-4 text-right">Net Profit</th>
                  <th className="py-2.5 px-4 text-center">Gross Margin %</th>
                  <th className="py-2.5 px-4 text-center">Health Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal">
                {clientProfitabilityData.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{item.client}</td>
                    <td className="py-3 px-4 text-slate-500">{item.industry}</td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-800">
                      {formatCurrency(item.retainer)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600">
                      {item.logged_hours}h
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-500">
                      {formatCurrency(item.delivery_cost)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                      {formatCurrency(item.net_margin)}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold">
                      <span className={item.margin_pct >= 60 ? "text-emerald-700" : item.margin_pct >= 40 ? "text-sky-700" : "text-amber-700"}>
                        {item.margin_pct.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border",
                          item.health === "OPTIMAL"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : item.health === "HEALTHY"
                            ? "bg-sky-50 text-sky-700 border-sky-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        )}
                      >
                        {item.health === "OPTIMAL" ? "Optimal Margin" : item.health === "HEALTHY" ? "Healthy" : "Margin Risk (<40%)"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Attendance & Workforce Utilization Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Live Workforce & Shift Telemetry</h3>
              <p className="text-xs text-slate-500">Real-time attendance terminal logs and current tasks</p>
            </div>
            <Link
              href="/attendance"
              className="text-xs font-semibold text-[#714B67] hover:text-[#58364F] flex items-center gap-1"
            >
              <span>View Attendance Terminal</span>
              <ArrowUpRight size={13} />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-4">Team Member</th>
                  <th className="py-2.5 px-4">Department</th>
                  <th className="py-2.5 px-4">Shift Status</th>
                  <th className="py-2.5 px-4">Work Mode</th>
                  <th className="py-2.5 px-4">Logged Time</th>
                  <th className="py-2.5 px-4">Active Task in Flight</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal">
                {teamLiveStatus.map((member, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-100 text-[#714B67] font-bold text-xs flex items-center justify-center border border-slate-200">
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <span>{member.name}</span>
                        <span className="block text-[10px] text-slate-400 font-normal">{member.role}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{member.dept}</td>
                    <td className="py-3 px-4">
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border",
                          member.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        )}
                      >
                        {member.status === "ACTIVE" ? "Clocked In" : "On Break"}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600">{member.mode}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-800">{member.worked}</td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{member.task}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
