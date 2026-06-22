// FILE PATH: src/utils/billPdfGenerator.js
//
// PDF generation and browser print helpers for the billing module.
// Uses html2canvas + jsPDF — same approach as the existing pdfGenerator.js
// in this project, kept as a separate file to avoid altering shared utilities.
//
// Install if not already installed:
//   npm install jspdf html2canvas

import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/**
 * Renders a DOM element to an A4 PDF and triggers a browser download.
 * Returns true on success, false on failure.
 */
export async function generateBillPdf(element, fileName = "bill.pdf") {
  if (!element) {
    console.error("generateBillPdf: no element provided.");
    return false;
  }
  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
    });

    const imgData     = canvas.toDataURL("image/png");
    const pdf         = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth   = pdf.internal.pageSize.getWidth();
    const pageHeight  = pdf.internal.pageSize.getHeight();
    const imgWidthMm  = pageWidth;
    const imgHeightMm = (canvas.height * imgWidthMm) / canvas.width;

    let heightLeft = imgHeightMm;
    let position   = 0;

    pdf.addImage(imgData, "PNG", 0, position, imgWidthMm, imgHeightMm);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeightMm;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidthMm, imgHeightMm);
      heightLeft -= pageHeight;
    }

    pdf.save(fileName);
    return true;
  } catch (err) {
    console.error("generateBillPdf failed:", err);
    return false;
  }
}

/**
 * Opens a print dialog for the bill template element.
 */
export function printBill(element) {
  if (!element) return;
  const printWindow = window.open("", "_blank", "width=800,height=900");
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>MediCare Pro — Invoice</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, Helvetica, sans-serif; background: #fff; }
          @media print { @page { margin: 0; } }
        </style>
      </head>
      <body>${element.innerHTML}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => { printWindow.print(); }, 250);
}