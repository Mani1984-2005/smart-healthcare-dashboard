import { useEffect, useMemo, useState } from "react";
import {
  useBillingStore,
  generateBillingInsights,
  InvoiceRecord,
  PaymentMethod,
} from "../stores/billingStore.ts";
import Input from "../components/common/Input.jsx";
import Select from "../components/common/Select.jsx";
import Button from "../components/common/Button.jsx";
import Toast from "../components/common/Toast.jsx";
import Pagination from "../components/common/Pagination.jsx";
import BillingSummaryCards from "../components/billing/BillingSummaryCards.tsx";
import AIBillingInsights from "../components/billing/AIBillingInsights.tsx";
import InvoiceTable from "../components/billing/InvoiceTable.tsx";
import InvoiceModal from "../components/billing/InvoiceModal.tsx";
import InvoiceForm, { InvoiceFormData } from "../components/billing/InvoiceForm.tsx";
import InvoiceDetail from "../components/billing/InvoiceDetail.tsx";
import RecordPaymentForm from "../components/billing/RecordPaymentForm.tsx";

const statusOptions = ["All", "Draft", "Unpaid", "Partially Paid", "Paid", "Overdue", "Cancelled"];
const paymentMethodOptions = ["All", "Cash", "Card", "UPI", "Insurance", "Pending"];

function toFormData(invoice: InvoiceRecord): InvoiceFormData {
  return {
    patientId: invoice.patientId,
    patientName: invoice.patientName,
    phone: invoice.phone,
    doctorName: invoice.doctorName,
    department: invoice.department,
    items: invoice.items,
    discount: String(invoice.discount),
    tax: String(invoice.tax),
    insuranceCoverage: String(invoice.insuranceCoverage),
    insuranceProvider: invoice.insuranceProvider,
    amountPaid: String(invoice.amountPaid),
    paymentMethod: invoice.paymentMethod,
    status: invoice.status,
    dueDate: invoice.dueDate,
    notes: invoice.notes,
  };
}

export default function Billing() {
  const {
    invoices,
    loading,
    error,
    searchTerm,
    filters,
    page,
    pageSize,
    loadInvoices,
    addInvoice,
    updateInvoice,
    recordPayment,
    deleteInvoice,
    searchInvoices,
    filterInvoices,
    setPage,
    clearError,
  } = useBillingStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<InvoiceRecord | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<InvoiceRecord | null>(null);
  const [payingInvoice, setPayingInvoice] = useState<InvoiceRecord | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; variant: "success" | "danger" | "info" } | null>(null);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const filteredInvoices = useMemo(() => {
    let list = invoices;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(
        (invoice) =>
          invoice.invoiceNumber.toLowerCase().includes(term) ||
          invoice.patientName.toLowerCase().includes(term) ||
          invoice.patientId.toLowerCase().includes(term) ||
          invoice.doctorName.toLowerCase().includes(term)
      );
    }
    if (filters.status !== "All") {
      list = list.filter((invoice) => invoice.status === filters.status);
    }
    if (filters.paymentMethod !== "All") {
      list = list.filter((invoice) => invoice.paymentMethod === filters.paymentMethod);
    }
    return list;
  }, [invoices, searchTerm, filters]);

  const totalPages = Math.max(Math.ceil(filteredInvoices.length / pageSize), 1);
  const pageInvoices = filteredInvoices.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages, setPage]);

  const insights = useMemo(() => generateBillingInsights(invoices), [invoices]);

  const handleAddInvoice = () => {
    setEditingInvoice(null);
    setModalOpen(true);
  };

  const handleEditInvoice = (id: string) => {
    const invoice = invoices.find((item) => item.id === id);
    if (!invoice) return;
    setEditingInvoice(invoice);
    setModalOpen(true);
  };

  const handleSaveInvoice = async (form: InvoiceFormData) => {
    const payload = {
      patientId: form.patientId,
      patientName: form.patientName,
      phone: form.phone,
      doctorName: form.doctorName,
      department: form.department,
      items: form.items,
      discount: Number(form.discount) || 0,
      tax: Number(form.tax) || 0,
      insuranceCoverage: Number(form.insuranceCoverage) || 0,
      insuranceProvider: form.insuranceProvider,
      amountPaid: Number(form.amountPaid) || 0,
      paymentMethod: form.paymentMethod,
      status: form.status,
      dueDate: form.dueDate,
      notes: form.notes,
      subtotal: 0,
      grandTotal: 0,
      balanceDue: 0,
    };

    if (editingInvoice) {
      await updateInvoice(editingInvoice.id, payload);
      setToast({ message: "Invoice updated successfully.", variant: "success" });
    } else {
      await addInvoice(payload);
      setToast({ message: "Invoice created successfully.", variant: "success" });
    }
    setModalOpen(false);
    setEditingInvoice(null);
  };

  const handleRecordPayment = async (amount: number, method: PaymentMethod) => {
    if (!payingInvoice) return;
    await recordPayment(payingInvoice.id, amount, method);
    setToast({ message: "Payment recorded.", variant: "success" });
    setPayingInvoice(null);
  };

  const handleDeleteInvoice = async () => {
    if (!deleteTargetId) return;
    await deleteInvoice(deleteTargetId);
    setToast({ message: "Invoice deleted.", variant: "success" });
    setDeleteTargetId(null);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-slate-500 dark:text-slate-400">Billing &amp; invoicing</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-100">Hospital financial operations</h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
              Generate itemized invoices, track payments and insurance coverage, and catch billing issues before they reach patients.
            </p>
          </div>
          <Button onClick={handleAddInvoice}>New invoice</Button>
        </div>
      </section>

      <BillingSummaryCards invoices={invoices} />

      <AIBillingInsights insights={insights} />

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-slate-950">
        <div className="grid gap-4 xl:grid-cols-[minmax(180px,320px)_1fr] xl:items-center">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <Input
              label="Search invoices"
              id="invoice-search"
              placeholder="Invoice #, patient, or doctor"
              value={searchTerm}
              onChange={(event) => searchInvoices(event.target.value)}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Status" id="invoice-status-filter" value={filters.status} onChange={(event) => filterInvoices({ status: event.target.value })}>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </Select>
              <Select label="Payment method" id="invoice-payment-filter" value={filters.paymentMethod} onChange={(event) => filterInvoices({ paymentMethod: event.target.value })}>
                {paymentMethodOptions.map((method) => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={() => { searchInvoices(""); filterInvoices({ status: "All", paymentMethod: "All" }); setPage(1); }}>
              Reset filters
            </Button>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950 dark:text-rose-100">
          <p className="font-semibold">Unable to load billing data</p>
          <p className="mt-1">{error}</p>
          <Button variant="secondary" onClick={() => { clearError(); loadInvoices(); }}>Retry</Button>
        </div>
      )}

      <InvoiceTable
        invoices={pageInvoices}
        loading={loading}
        onView={(id) => setViewingInvoice(invoices.find((invoice) => invoice.id === id) || null)}
        onEdit={handleEditInvoice}
        onRecordPayment={(id) => setPayingInvoice(invoices.find((invoice) => invoice.id === id) || null)}
        onDelete={(id) => setDeleteTargetId(id)}
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">Showing {pageInvoices.length} of {filteredInvoices.length} invoices</p>
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      <InvoiceModal
        open={modalOpen}
        title={editingInvoice ? "Edit invoice" : "New invoice"}
        onClose={() => { setModalOpen(false); setEditingInvoice(null); }}
      >
        <InvoiceForm
          initialValues={editingInvoice ? toFormData(editingInvoice) : undefined}
          onCancel={() => { setModalOpen(false); setEditingInvoice(null); }}
          onSubmit={handleSaveInvoice}
          submitLabel={editingInvoice ? "Update invoice" : "Create invoice"}
          loading={loading}
        />
      </InvoiceModal>

      <InvoiceModal
        open={Boolean(viewingInvoice)}
        title={viewingInvoice ? `Invoice ${viewingInvoice.invoiceNumber}` : "Invoice"}
        onClose={() => setViewingInvoice(null)}
      >
        {viewingInvoice && <InvoiceDetail invoice={viewingInvoice} />}
      </InvoiceModal>

      <InvoiceModal
        open={Boolean(payingInvoice)}
        title={payingInvoice ? `Record payment — ${payingInvoice.invoiceNumber}` : "Record payment"}
        onClose={() => setPayingInvoice(null)}
      >
        {payingInvoice && (
          <RecordPaymentForm
            invoice={payingInvoice}
            onCancel={() => setPayingInvoice(null)}
            onSubmit={handleRecordPayment}
            loading={loading}
          />
        )}
      </InvoiceModal>

      <InvoiceModal
        open={Boolean(deleteTargetId)}
        title="Confirm deletion"
        onClose={() => setDeleteTargetId(null)}
        confirmLabel="Delete"
        onConfirm={handleDeleteInvoice}
        loading={loading}
      >
        <p>Are you sure you want to permanently delete this invoice? This action cannot be undone.</p>
      </InvoiceModal>

      {toast && <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />}
    </div>
  );
}
