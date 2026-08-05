import React, { useState, useMemo, useCallback } from 'react';
import { useInvoices, useBillingSummary, useCreateInvoice } from "../hooks/useBilling";
import {
  Search,
  Bell,
  Plus,
  TrendingUp,
  TrendingDown,
  Download,
  ShieldCheck,
  Activity,
  Clock3,
  CircleDollarSign,
  BarChart3,
  ReceiptText,
  CreditCard,
  FileSpreadsheet,
  Stethoscope,
  ChevronDown,
  X,
} from 'lucide-react';

// Integration points — rendered once these modules land in the same directory.
import BillForm from './BillForm';
import BillTable from './BillTable';
import BillPrintTemplate from './BillPrintTemplate';
 const filters = useMemo(() => ({
  query,
  status: statusFilter,
  payer: payerFilter,
}), [query, statusFilter, payerFilter]);
const DISPLAY_FONT = "'Manrope', 'Inter', sans-serif";
const DATA_FONT = "'IBM Plex Mono', 'Roboto Mono', monospace";
const { data: invoices = [], isLoading } = useInvoices(filters);

const { data: revenueSummary = {} } = useBillingSummary();

const createInvoiceMutation = useCreateInvoice();
const STATUS_FILTERS = ['All', 'Paid', 'Pending', 'Overdue', 'Draft'];
const PAYER_FILTERS = ['All payers', 'Self-pay', 'Private insurance', 'Medicare', 'Medicaid'];

const currency = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value ?? 0);

/**
 * Vital-style readout for a single billing metric. Modeled on a clinical
 * monitor strip: a large tabular figure, a trend caret, and a thin status
 * bar whose color communicates whether the metric sits in a healthy range.
 */
function VitalReadout({ label, value, delta, tone = 'stable', format = 'currency' }) {
  const toneColor =
    tone === 'good' ? '#1C8C5B' : tone === 'watch' ? '#C2872A' : tone === 'risk' ? '#C24A3A' : '#2D5DA1';

  const displayValue =
    format === 'currency' ? currency(value) : format === 'percent' ? `${(value ?? 0).toFixed(1)}%` : value ?? 0;

  const isPositive = (delta ?? 0) >= 0;

  return (
    <div className="flex-1 min-w-[180px] px-5 py-4 border-r border-[#E2E7EB] last:border-r-0">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold tracking-[0.14em] uppercase text-[#5B6B7C]">{label}</span>
        {typeof delta === 'number' && (
          <span
            className={`flex items-center gap-0.5 text-[11px] font-medium ${
              isPositive ? 'text-[#1C8C5B]' : 'text-[#C24A3A]'
            }`}
          >
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(delta).toFixed(1)}%
          </span>
        )}
      </div>
      <div
        className="text-[26px] leading-none text-[#0F1B2D] tabular-nums"
        style={{ fontFamily: DATA_FONT, fontWeight: 500 }}
      >
        {displayValue}
      </div>
      <div className="mt-3 h-[3px] w-full rounded-full bg-[#EEF1F4] overflow-hidden">
        <div className="h-full rounded-full" style={{ width: '62%', backgroundColor: toneColor }} />
      </div>
    </div>
  );
}

function QuickAction({ icon: Icon, label, onClick, primary = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
        primary
          ? 'bg-[#0E7C86] text-white hover:bg-[#0C6B74]'
          : 'bg-white text-[#334255] border border-[#DEE3E8] hover:border-[#0E7C86] hover:text-[#0E7C86]'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

function FilterChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-[13px] font-medium border transition-colors ${
        active
          ? 'bg-[#0F1B2D] text-white border-[#0F1B2D]'
          : 'bg-white text-[#5B6B7C] border-[#DEE3E8] hover:border-[#0F1B2D] hover:text-[#0F1B2D]'
      }`}
    >
      {children}
    </button>
  );
}

function SectionPanel({ title, description, action, children }) {
  return (
    <section className="bg-white border border-[#E2E7EB] rounded-xl">
      <div className="flex items-start justify-between px-5 py-4 border-b border-[#E2E7EB]">
        <div>
          <h3 className="text-[15px] font-semibold text-[#0F1B2D]" style={{ fontFamily: DISPLAY_FONT }}>
            {title}
          </h3>
          {description && <p className="text-[13px] text-[#5B6B7C] mt-0.5">{description}</p>}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function EmptyMount({ label, hint }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-4 rounded-lg border border-dashed border-[#DEE3E8] bg-[#FAFBFC]">
      <p className="text-[13px] font-medium text-[#334255]">{label}</p>
      <p className="text-[12px] text-[#8B99A7] mt-1 max-w-sm">{hint}</p>
    </div>
  );
}

/**
 * NovaInvoice
 * Executive billing workspace for MediCare Pro. Orchestrates search,
 * smart filtering, and quick actions, and hosts the mount points for
 * BillForm, BillTable, and BillPrintTemplate. All figures are supplied
 * by the parent via props and are expected to originate from the
 * PostgreSQL-backed billing API (GET /api/billing/summary,
 * GET /api/billing/invoices) — no data is fetched or fabricated here.
 */
export default function NovaInvoice({
  currentUser = { name: 'Billing Administrator', role: 'Finance' },
  revenueSummary = { collected: 0, collectedDelta: 0, outstanding: 0, outstandingDelta: 0, collectionRate: 0, collectionRateDelta: 0, avgDaysToPay: 0, avgDaysToPayDelta: 0 },
  
  onCreateInvoice = () => {},
  onRecordPayment = () => {},
  onGenerateStatement = () => {},
  onFileClaim = () => {},
  onExport = () => {},
  onSearch = () => {},
  onOpenInvoice = () => {},
}) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [payerFilter, setPayerFilter] = useState('All payers');
  const [isNotificationsOpen, setNotificationsOpen] = useState(false);
  const [isFormOpen, setFormOpen] = useState(false);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const handleSearchChange = useCallback(
    (event) => {
      const value = event.target.value;
      setQuery(value);
      onSearch({ query: value, status: statusFilter, payer: payerFilter });
    },
    [onSearch, statusFilter, payerFilter]
  );

  const applyFilters = useCallback(
    (nextStatus, nextPayer) => {
      onSearch({ query, status: nextStatus, payer: nextPayer });
    },
    [onSearch, query]
  );

  return (
    <div className="min-h-screen bg-[#F7F9FA]">
      {/* Executive Header */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-[#E2E7EB]">
        <div className="max-w-[1400px] mx-auto px-6 py-3.5 flex items-center gap-4">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-[#0E7C86] flex items-center justify-center">
              <Stethoscope className="w-4.5 h-4.5 text-white" strokeWidth={2.25} />
            </div>
            <div className="leading-tight">
              <p className="text-[14px] font-semibold text-[#0F1B2D]" style={{ fontFamily: DISPLAY_FONT }}>
                MediCare Pro
              </p>
              <p className="text-[11px] text-[#8B99A7] tracking-wide">Enterprise Billing</p>
            </div>
          </div>

          <div className="flex-1 max-w-xl relative">
            <Search className="w-4 h-4 text-[#8B99A7] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={handleSearchChange}
              placeholder="Search invoices, patients, or MRN"
              className="w-full pl-9 pr-3 py-2 text-[13px] rounded-lg border border-[#DEE3E8] bg-[#FAFBFC] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0E7C86]/30 focus:border-[#0E7C86] transition-colors"
            />
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotificationsOpen((open) => !open)}
                className="relative w-9 h-9 flex items-center justify-center rounded-lg border border-[#DEE3E8] hover:border-[#0E7C86] transition-colors"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4 text-[#334255]" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#C24A3A] text-white text-[10px] font-semibold flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-[#E2E7EB] rounded-xl shadow-lg overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[#E2E7EB]">
                    <p className="text-[13px] font-semibold text-[#0F1B2D]">Notifications</p>
                    <button onClick={() => setNotificationsOpen(false)} aria-label="Close notifications">
                      <X className="w-4 h-4 text-[#8B99A7]" />
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-[13px] text-[#8B99A7] px-4 py-6 text-center">You're caught up.</p>
                    ) : (
                      notifications.map((note) => (
                        <div key={note.id} className="px-4 py-3 border-b border-[#F0F2F4] last:border-b-0">
                          <p className="text-[13px] text-[#334255]">{note.message}</p>
                          <p className="text-[11px] text-[#8B99A7] mt-0.5">{note.timestamp}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pl-3 border-l border-[#E2E7EB]">
              <div className="w-8 h-8 rounded-full bg-[#0F1B2D] text-white text-[12px] font-semibold flex items-center justify-center">
                {currentUser.name?.charAt(0) ?? 'U'}
              </div>
              <div className="hidden md:block leading-tight">
                <p className="text-[13px] font-medium text-[#0F1B2D]">{currentUser.name}</p>
                <p className="text-[11px] text-[#8B99A7]">{currentUser.role}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-6 space-y-6">
        {/* Billing Vitals — Revenue Cards + Billing Statistics */}
        <section className="bg-white border border-[#E2E7EB] rounded-xl flex flex-wrap overflow-hidden">
          <VitalReadout label="Revenue Collected" value={revenueSummary.collected} delta={revenueSummary.collectedDelta} tone="good" />
          <VitalReadout label="Outstanding Balance" value={revenueSummary.outstanding} delta={revenueSummary.outstandingDelta} tone="watch" />
          <VitalReadout label="Collection Rate" value={revenueSummary.collectionRate} delta={revenueSummary.collectionRateDelta} tone="good" format="percent" />
          <VitalReadout label="Avg. Days to Payment" value={revenueSummary.avgDaysToPay} delta={revenueSummary.avgDaysToPayDelta} tone="stable" format="number" />
        </section>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2.5">
          <QuickAction icon={Plus} label="New Invoice" primary onClick={() => setFormOpen(true)} />
          <QuickAction icon={CreditCard} label="Record Payment" onClick={onRecordPayment} />
          <QuickAction icon={ReceiptText} label="Generate Statement" onClick={onGenerateStatement} />
          <QuickAction icon={ShieldCheck} label="File Insurance Claim" onClick={onFileClaim} />
          <QuickAction icon={Download} label="Bulk Export" onClick={onExport} />
        </div>

        {/* Search + Smart Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 mr-1 text-[12px] font-medium text-[#8B99A7] uppercase tracking-wide">
            <CircleDollarSign className="w-3.5 h-3.5" />
            Filters
          </div>
          {STATUS_FILTERS.map((status) => (
            <FilterChip
              key={status}
              active={statusFilter === status}
              onClick={() => {
                setStatusFilter(status);
                applyFilters(status, payerFilter);
              }}
            >
              {status}
            </FilterChip>
          ))}
          <span className="w-px h-5 bg-[#E2E7EB] mx-1" />
          <div className="relative">
            <select
              value={payerFilter}
              onChange={(event) => {
                setPayerFilter(event.target.value);
                applyFilters(statusFilter, event.target.value);
              }}
              className="appearance-none pl-3 pr-8 py-1.5 rounded-full text-[13px] font-medium border border-[#DEE3E8] bg-white text-[#5B6B7C] focus:outline-none focus:border-[#0E7C86]"
            >
              {PAYER_FILTERS.map((payer) => (
                <option key={payer} value={payer}>
                  {payer}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#8B99A7] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Recent Invoices + Billing Table Mount */}
        <SectionPanel
          title="Recent Invoices"
          description="Latest activity across all departments, most recent first."
          action={
            <button className="text-[13px] font-medium text-[#0E7C86] hover:text-[#0C6B74]" onClick={() => onSearch({ query: '', status: 'All', payer: 'All payers' })}>
              View all
            </button>
          }
        >
          {invoices.length > 0 ? (
            <BillTable invoices={invoices} isLoading={isLoading} onOpenInvoice={onOpenInvoice} />
          ) : (
            <EmptyMount
              label="No invoices match the current filters"
              hint="Once BillTable.jsx is connected to GET /api/billing/invoices, results will render here with sorting, pagination, and row-level actions."
            />
          )}
        </SectionPanel>

        {/* Analytics, Export, Audit */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <SectionPanel title="Billing Analytics" description="Revenue trends and payer mix">
            <EmptyMount
              label="Analytics dashboard pending"
              hint="Reserved for revenue-over-time and payer-mix charts backed by GET /api/billing/analytics."
            />
            <div className="flex items-center gap-1.5 mt-3 text-[12px] text-[#8B99A7]">
              <BarChart3 className="w-3.5 h-3.5" />
              Charts render once analytics data is wired in.
            </div>
          </SectionPanel>

          <SectionPanel title="Export Center" description="Statements, ledgers, and claim batches">
            <EmptyMount
              label="No export jobs queued"
              hint="Bulk Export builds CSV, PDF, and 837 claim files through BillPrintTemplate.jsx and POST /api/billing/exports."
            />
            <div className="flex items-center gap-1.5 mt-3 text-[12px] text-[#8B99A7]">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Exports appear here once generated.
            </div>
          </SectionPanel>

          <SectionPanel title="Audit Trail" description="Every edit, payment, and adjustment">
            <EmptyMount
              label="No audit events loaded"
              hint="Populated from GET /api/billing/audit-log, scoped to this facility and retained per compliance policy."
            />
            <div className="flex items-center gap-1.5 mt-3 text-[12px] text-[#8B99A7]">
              <Activity className="w-3.5 h-3.5" />
              Full history, filterable by user and invoice.
            </div>
          </SectionPanel>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-[#8B99A7] pt-1">
          <Clock3 className="w-3.5 h-3.5" />
          Figures reflect the most recent sync with the billing database.
        </div>
      </main>

      {/* Invoice Creation Mount */}
      {isFormOpen && (
        <div className="fixed inset-0 z-30 bg-[#0F1B2D]/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E7EB]">
              <h3 className="text-[15px] font-semibold text-[#0F1B2D]" style={{ fontFamily: DISPLAY_FONT }}>
                New Invoice
              </h3>
              <button onClick={() => setFormOpen(false)} aria-label="Close">
                <X className="w-4 h-4 text-[#8B99A7]" />
              </button>
            </div>
            <div className="p-5">
              <BillForm
                onSubmit={(invoice) => {
                  onCreateInvoice(invoice);
                  setFormOpen(false);
                }}
                onCancel={() => setFormOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}