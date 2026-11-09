"use client";

import React, { useState } from "react";
import {
  Receipt,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Download,
  CreditCard,
  Building2,
  Check,
  FileText,
  QrCode,
  X,
} from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { toast } from "sonner";
import { InvoiceStatus } from "@/types";
import { OdooControlPanel, ViewMode } from "@/components/layout/OdooControlPanel";

interface InvoiceRow {
  id: string;
  invoice_number: string;
  client_name: string;
  gst_tax_id: string;
  subtotal: number;
  tax_amount: number; // 18% GST
  total_amount: number;
  currency: string;
  status: InvoiceStatus;
  due_date: string;
  paid_at?: string;
}

const initialInvoices: InvoiceRow[] = [
  {
    id: "inv_1",
    invoice_number: "INV-202611-0001",
    client_name: "Bombay Chai Co.",
    gst_tax_id: "27AABCB1234D1Z5",
    subtotal: 75000,
    tax_amount: 13500, // 18% GST
    total_amount: 88500,
    currency: "INR",
    status: "PAID",
    due_date: "2026-11-08",
    paid_at: "2026-11-08T11:20:00Z",
  },
  {
    id: "inv_2",
    invoice_number: "INV-202611-0002",
    client_name: "Urban Vibe Apparels",
    gst_tax_id: "29XYZAB5678C1Z2",
    subtotal: 120000,
    tax_amount: 21600,
    total_amount: 141600,
    currency: "INR",
    status: "SENT",
    due_date: "2026-11-18",
  },
  {
    id: "inv_3",
    invoice_number: "INV-202610-0042",
    client_name: "Apex Gaming Gear",
    gst_tax_id: "07AAACR4455B1Z9",
    subtotal: 95000,
    tax_amount: 17100,
    total_amount: 112100,
    currency: "INR",
    status: "OVERDUE",
    due_date: "2026-10-25",
  },
];

export default function BillingPage() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>(initialInvoices);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInvoiceForUPI, setSelectedInvoiceForUPI] = useState<InvoiceRow | null>(null);
  const upiDialogRef = React.useRef<HTMLDialogElement>(null);

  React.useEffect(() => {
    const dialog = upiDialogRef.current;
    if (!dialog) return;
    if (selectedInvoiceForUPI && !dialog.open) {
      dialog.showModal();
    } else if (!selectedInvoiceForUPI && dialog.open) {
      dialog.close();
    }
  }, [selectedInvoiceForUPI]);

  const totalCollected = invoices
    .filter((i) => i.status === "PAID")
    .reduce((sum, i) => sum + i.total_amount, 0);

  const totalPending = invoices
    .filter((i) => i.status === "SENT")
    .reduce((sum, i) => sum + i.total_amount, 0);

  const totalOverdue = invoices
    .filter((i) => i.status === "OVERDUE")
    .reduce((sum, i) => sum + i.total_amount, 0);

  const handleDownloadPDF = (inv: InvoiceRow) => {
    toast.info(`Generating official PDF for ${inv.invoice_number}...`);
    window.open(`/api/v1/billing/invoices/${inv.id}/pdf`, "_blank");
  };

  const handleSimulatePayment = (id: string) => {
    setInvoices((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, status: "PAID", paid_at: new Date().toISOString() } : i
      )
    );
    toast.success("Payment recorded. Rule 4 Triggered: Client receipt dispatched.");
  };

  const filteredInvoices = invoices.filter(
    (i) =>
      i.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.client_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      {/* Odoo Control Panel Sub-Header */}
      <OdooControlPanel
        appName="Invoicing"
        viewName="Customer Invoices & GST Ledger"
        onNewClick={() => toast.info("New invoice creation: Go to CRM or client portal")}
        newButtonLabel="Create Invoice"
        activeView={viewMode}
        onViewChange={setViewMode}
        availableViews={["list"]}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        totalCount={filteredInvoices.length}
        totalAmountText={`Collected: ${formatCurrency(totalCollected)}`}
        secondaryActions={
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono px-2 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 hidden sm:inline-block">
              SAC 998311 • 18% GST Compliance
            </span>
          </div>
        }
      />

      <div className="space-y-6">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Invoiced & Collected
            </span>
            <div className="mt-2">
              <span className="text-2xl font-bold text-slate-900 tracking-tight">
                {formatCurrency(totalCollected)}
              </span>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-emerald-700 font-semibold">
                <CheckCircle2 size={13} />
                <span>Cleared into HDFC Agency Current Account</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Pending Receivables (Active)
            </span>
            <div className="mt-2">
              <span className="text-2xl font-bold text-slate-900 tracking-tight">
                {formatCurrency(totalPending)}
              </span>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-amber-700 font-medium">
                <span>Due within 7-day payment window</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Overdue Balances (&gt;7 Days)
            </span>
            <div className="mt-2">
              <span className="text-2xl font-bold text-rose-600 tracking-tight">
                {formatCurrency(totalOverdue)}
              </span>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-rose-700 font-medium">
                <AlertTriangle size={13} />
                <span>Automated payment reminders active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Invoices List View (Odoo Accounting Table) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">GSTIN</th>
                  <th className="py-3 px-4 text-right">Retainer Subtotal</th>
                  <th className="py-3 px-4 text-right">GST (18%)</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#714B67]">
                      {inv.invoice_number}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{inv.client_name}</td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">{inv.gst_tax_id}</td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                      {formatCurrency(inv.subtotal)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-500">
                      {formatCurrency(inv.tax_amount)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(inv.total_amount)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border",
                          inv.status === "PAID"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : inv.status === "SENT"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                        )}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">{inv.due_date}</td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedInvoiceForUPI(inv)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple-50 hover:bg-purple-100 text-[#714B67] border border-purple-200 font-semibold text-xs transition-colors shadow-xs"
                          title="Instant UPI Payment Hub"
                        >
                          <QrCode size={12} />
                          <span>UPI QR</span>
                        </button>

                        <button
                          onClick={() => handleDownloadPDF(inv)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
                          title="Download ReportLab Tax Invoice PDF"
                        >
                          <Download size={12} />
                          <span>PDF</span>
                        </button>

                        {inv.status !== "PAID" && (
                          <button
                            onClick={() => handleSimulatePayment(inv.id)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs border border-emerald-300 transition-colors"
                            title="Record Payment"
                          >
                            <CreditCard size={12} />
                            <span>Mark Paid</span>
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
      </div>

      {/* UPI QR Payment Modal */}
      <dialog
        ref={upiDialogRef}
        onCancel={() => setSelectedInvoiceForUPI(null)}
        className="fixed inset-0 m-auto bg-white rounded-2xl max-w-sm w-full p-0 shadow-2xl border border-slate-200 backdrop:bg-slate-900/40 backdrop:backdrop-blur-sm overflow-hidden"
      >
        {selectedInvoiceForUPI && (
          <div className="p-6 space-y-4 text-center">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-[#714B67] text-white flex items-center justify-center font-bold text-xs">
                  M
                </div>
                <span className="font-bold text-xs text-slate-800">The Desi Muchads Smart UPI Hub</span>
              </div>
              <button onClick={() => setSelectedInvoiceForUPI(null)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">{selectedInvoiceForUPI.client_name}</h3>
              <p className="text-xs text-slate-500 font-mono">Invoice #{selectedInvoiceForUPI.invoice_number}</p>
              <div className="text-2xl font-black text-slate-900 tracking-tight pt-1">
                {formatCurrency(selectedInvoiceForUPI.total_amount)}
              </div>
              <p className="text-[11px] text-slate-400 font-mono">Includes 18% GST (SAC 998311)</p>
            </div>

            {/* UPI QR Display Container */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center space-y-2">
              <div className="w-44 h-44 rounded-lg bg-white p-2 border border-slate-200 flex items-center justify-center shadow-xs">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                    `upi://pay?pa=desimuchads@icici&pn=The+Desi+Muchads&am=${selectedInvoiceForUPI.total_amount}&tr=${selectedInvoiceForUPI.invoice_number}&cu=INR`
                  )}`}
                  alt="UPI Payment QR Code"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="text-xs font-mono font-semibold text-slate-700">UPI ID: desimuchads@icici</div>
              <div className="text-[10px] text-slate-500">Scan via Google Pay, PhonePe, Paytm, or BHIM</div>
            </div>

            {/* 1-Click Instant Webhook Settlement */}
            <div className="pt-2">
              <button
                onClick={() => {
                  handleSimulatePayment(selectedInvoiceForUPI.id);
                  setSelectedInvoiceForUPI(null);
                }}
                className="w-full py-2.5 rounded-lg bg-[#008784] hover:bg-[#00706D] text-white font-semibold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Check size={14} />
                <span>Simulate Instant Webhook Settlement</span>
              </button>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}
