import { jsPDF } from "jspdf";

export const STORAGE_KEY = "pharmacy_medicines";

export const CATEGORIES = [
  "Antibiotic", "Analgesic", "Antiviral", "Antifungal", "Antihistamine",
  "Cardiovascular", "Diabetes", "Vitamins & Supplements", "Respiratory",
  "Gastrointestinal", "Neurological", "Oncology", "Dermatology", "Ophthalmology", "Other",
];

export const DOSAGE_FORMS = [
  "Tablet", "Capsule", "Syrup", "Injection", "Cream", "Ointment", "Drops",
  "Inhaler", "Patch", "Suppository", "Powder", "Suspension", "Gel", "Lotion", "Spray",
];

export const STATUS_OPTIONS = ["Available", "Out of Stock", "Discontinued"];
export const LOW_STOCK_THRESHOLD = 10;
export const EXPIRY_WARNING_DAYS = 30;

export const emptyForm = {
  medicineId: "", name: "", genericName: "", brand: "", manufacturer: "",
  category: "", dosageForm: "", strength: "", packSize: "", batchNumber: "",
  manufacturingDate: "", expiryDate: "", purchasePrice: "", sellingPrice: "",
  mrp: "", gst: "", supplier: "", stockQuantity: "", minimumStock: "",
  storageInstructions: "", barcode: "", qrCode: "", notes: "", status: "Available",
  quantity: "", price: "",
};

export function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export function daysUntilExpiry(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date(todayStr())) / (1000 * 60 * 60 * 24));
}

export function isExpired(dateStr) {
  return dateStr ? new Date(dateStr) < new Date(todayStr()) : false;
}

export function isExpiringSoon(dateStr) {
  const days = daysUntilExpiry(dateStr);
  return days !== null && days >= 0 && days <= EXPIRY_WARNING_DAYS;
}

export function isLowStock(medicine) {
  const qty = getQty(medicine);
  return qty > 0 && qty <= LOW_STOCK_THRESHOLD;
}

export function getQty(medicine) {
  return Number(medicine.stockQuantity ?? medicine.quantity ?? 0);
}

export function getPrice(medicine) {
  return Number(medicine.sellingPrice ?? medicine.price ?? 0);
}

export function getPurchasePrice(medicine) {
  return Number(medicine.purchasePrice ?? 0);
}

export function getStockStatus(medicine) {
  if (isExpired(medicine.expiryDate)) return "Expired";
  if (isExpiringSoon(medicine.expiryDate)) return "Expiring Soon";
  if (getQty(medicine) === 0) return "Out of Stock";
  if (isLowStock(medicine)) return "Low Stock";
  return "Available";
}

export function formatCurrency(val) {
  const n = Number(val);
  if (isNaN(n) || !val) return "—";
  return `\u20B9${n.toFixed(2)}`;
}

export function formatCurrencyCompact(val) {
  const n = Number(val);
  if (isNaN(n)) return "\u20B90";
  if (n >= 100000) return `\u20B9${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `\u20B9${(n / 1000).toFixed(1)}K`;
  return `\u20B9${n.toFixed(0)}`;
}

export function formatDate(dateStr) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch { return dateStr; }
}

export function downloadMedicinePDF(medicine) {
  const doc = new jsPDF();
  const status = getStockStatus(medicine);
  doc.setFillColor(15, 118, 110);
  doc.rect(0, 0, 210, 38, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("MediCare Pro", 20, 18);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Pharmacy Inventory Report", 20, 28);
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`, 120, 28);
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text(medicine.name || "—", 20, 52);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  const subtitle = [medicine.genericName, medicine.brand, medicine.manufacturer].filter(Boolean).join(" \u00B7 ");
  if (subtitle) doc.text(subtitle, 20, 60);
  const fields = [
    ["Medicine ID", medicine.medicineId], ["Generic Name", medicine.genericName || "—"],
    ["Brand", medicine.brand || "—"], ["Manufacturer", medicine.manufacturer || "—"],
    ["Category", medicine.category || "—"], ["Dosage Form", medicine.dosageForm || "—"],
    ["Strength", medicine.strength || "—"], ["Pack Size", medicine.packSize || "—"],
    ["Batch Number", medicine.batchNumber || "—"],
    ["Manufacturing Date", formatDate(medicine.manufacturingDate)],
    ["Expiry Date", formatDate(medicine.expiryDate)],
    ["Purchase Price", formatCurrency(medicine.purchasePrice)],
    ["Selling Price", formatCurrency(medicine.sellingPrice ?? medicine.price)],
    ["MRP", formatCurrency(medicine.mrp)], ["GST", medicine.gst ? `${medicine.gst}%` : "—"],
    ["Supplier", medicine.supplier || "—"], ["Stock Quantity", String(getQty(medicine))],
    ["Minimum Stock", medicine.minimumStock || "—"], ["Status", status],
    ["Storage Instructions", medicine.storageInstructions || "—"], ["Notes", medicine.notes || "—"],
  ];
  let y = 70;
  doc.setFontSize(9);
  fields.forEach(([k, v], i) => {
    if (y > 270) { doc.addPage(); y = 20; }
    doc.setFillColor(i % 2 === 0 ? 248 : 255, i % 2 === 0 ? 250 : 255, i % 2 === 0 ? 252 : 255);
    doc.rect(18, y - 4, 174, 9, "F");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(80);
    doc.text(k, 20, y + 2);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30);
    doc.text(String(v ?? "—"), 90, y + 2);
    y += 9;
  });
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text("Computer-generated pharmacy inventory report. MediCare Pro — Enterprise Healthcare System.", 20, 285);
  doc.save(`${medicine.medicineId || "medicine"}_report.pdf`);
}

export function downloadInventoryPDF(medicines) {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFillColor(15, 118, 110);
  doc.rect(0, 0, 297, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("MediCare Pro — Pharmacy Inventory Report", 15, 14);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${new Date().toLocaleString("en-IN")} | Total: ${medicines.length} medicines`, 15, 22);
  const headers = ["ID", "Name", "Category", "Batch", "Expiry", "Stock", "Price", "Status"];
  const colWidths = [22, 55, 28, 28, 25, 18, 22, 25];
  let x = 15; let y = 40;
  doc.setFillColor(240, 253, 250);
  doc.rect(15, y - 5, 267, 9, "F");
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 118, 110);
  doc.setFontSize(8);
  headers.forEach((h, i) => { doc.text(h, x, y); x += colWidths[i]; });
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30);
  medicines.forEach((m, idx) => {
    if (y > 190) { doc.addPage(); y = 20; }
    const status = getStockStatus(m);
    if (idx % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(15, y - 4, 267, 8, "F"); }
    x = 15;
    const row = [
      m.medicineId?.substring(0, 8) || "—", (m.name || "—").substring(0, 25),
      (m.category || "—").substring(0, 14), (m.batchNumber || "—").substring(0, 12),
      formatDate(m.expiryDate), String(getQty(m)),
      formatCurrency(m.sellingPrice ?? m.price), status,
    ];
    doc.setFontSize(7.5);
    if (status === "Expired") doc.setTextColor(200, 50, 50);
    else if (status === "Low Stock") doc.setTextColor(180, 120, 0);
    else doc.setTextColor(30);
    row.forEach((val, i) => { doc.text(String(val), x, y); x += colWidths[i]; });
    y += 8;
  });
  doc.setFontSize(7.5);
  doc.setTextColor(150);
  doc.text("MediCare Pro — Computer-generated pharmacy inventory report.", 15, 205);
  doc.save(`pharmacy_inventory_${todayStr()}.pdf`);
}

export const exportUtils = {
  singlePDF: downloadMedicinePDF,
  inventoryPDF: downloadInventoryPDF,
  excel: (data) => console.warn("Excel export not yet implemented", data),
  csv: (data) => console.warn("CSV export not yet implemented", data),
  print: (data) => console.warn("Print not yet implemented", data),
};
