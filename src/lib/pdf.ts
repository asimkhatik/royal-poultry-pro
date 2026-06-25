import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ROYAL_BROILER_LOGO_URL } from "@/components/BrandLogo";

type Customer = { name: string; phone?: string | null; address?: string | null };
type Sale = { id: string; sale_date: string; weight_kg: number; rate_per_kg: number; total_amount: number };

// Royal Broiler brand
const NAVY: [number, number, number] = [11, 61, 46]; // Dark Royal Green #0B3D2E
const GOLD: [number, number, number] = [212, 175, 55]; // Premium Gold #D4AF37
const INK: [number, number, number] = [20, 20, 30];
const MUTED: [number, number, number] = [110, 116, 130];
const SOFT: [number, number, number] = [245, 247, 252];

const rs = (n: number) => `Rs. ${Number(n).toFixed(2)}`;

// Cached logo dataURL — loaded once per session.
let logoDataPromise: Promise<string | null> | null = null;
function loadLogoDataUrl(): Promise<string | null> {
  if (logoDataPromise) return logoDataPromise;
  logoDataPromise = new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext("2d");
          if (!ctx) return resolve(null);
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/png"));
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = ROYAL_BROILER_LOGO_URL;
    } catch {
      resolve(null);
    }
  });
  return logoDataPromise;
}

function drawLogo(doc: jsPDF, dataUrl: string | null, x: number, y: number, size = 50) {
  if (dataUrl) {
    try {
      doc.addImage(dataUrl, "PNG", x, y, size, size, undefined, "FAST");
      return;
    } catch {
      /* fall through to fallback badge */
    }
  }
  // Fallback gold badge
  doc.setFillColor(...GOLD);
  doc.roundedRect(x, y, size, size, 8, 8, "F");
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(size * 0.32);
  doc.text("RB", x + size / 2, y + size * 0.65, { align: "center" });
}

function drawHeader(doc: jsPDF, logoDataUrl: string | null, title: string, meta: { label: string; value: string }[]) {
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, 110, "F");
  doc.setFillColor(...GOLD);
  doc.rect(0, 110, pageW, 5, "F");

  drawLogo(doc, logoDataUrl, 40, 30, 50);

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("ROYAL BROILER", 104, 56);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(220, 226, 240);
  doc.text("Poultry Business Management", 104, 72);
  doc.text("Live Chicken Sales  •  Wholesale & Retail", 104, 86);

  // Title
  doc.setTextColor(...GOLD);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(title, pageW - 40, 50, { align: "right" });

  // Meta lines
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(220, 226, 240);
  let my = 68;
  for (const m of meta) {
    doc.text(`${m.label}:`, pageW - 130, my, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(m.value, pageW - 40, my, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(220, 226, 240);
    my += 14;
  }
}

function drawFooter(doc: jsPDF) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.8);
    doc.line(40, pageH - 48, pageW - 40, pageH - 48);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text("Thank you for your business — ROYAL BROILER", 40, pageH - 30);
    doc.setFont("helvetica", "normal");
    doc.text(`Page ${i} of ${total}`, pageW - 40, pageH - 30, { align: "right" });
  }
}

export function generateInvoicePDF(opts: {
  invoiceNo: string;
  date: string;
  customer: Customer;
  sale: Sale;
  previousBalance: number;
  currentBalance: number;
}): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  drawHeader(doc, "INVOICE", [
    { label: "Invoice No", value: `#${opts.invoiceNo}` },
    { label: "Date", value: opts.date },
  ]);

  // Bill To card
  const billTop = 140;
  doc.setFillColor(...SOFT);
  doc.roundedRect(40, billTop, pageW - 80, 86, 6, 6, "F");

  doc.setTextColor(...MUTED);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("BILL TO", 56, billTop + 20);

  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(opts.customer.name, 56, billTop + 40);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  let by = billTop + 58;
  if (opts.customer.phone) {
    doc.text(`Phone: ${opts.customer.phone}`, 56, by);
    by += 14;
  }
  if (opts.customer.address) {
    doc.text(opts.customer.address, 56, by, { maxWidth: pageW - 120 });
  }

  // Items table — generous spacing for print
  autoTable(doc, {
    startY: billTop + 110,
    margin: { left: 40, right: 40 },
    head: [["#", "Description", "Weight (kg)", "Rate / kg", "Amount"]],
    body: [
      [
        "1",
        "Live chicken sale",
        opts.sale.weight_kg.toFixed(2),
        rs(opts.sale.rate_per_kg),
        rs(opts.sale.total_amount),
      ],
    ],
    theme: "grid",
    headStyles: {
      fillColor: NAVY,
      textColor: 255,
      fontStyle: "bold",
      fontSize: 10.5,
      cellPadding: { top: 10, right: 12, bottom: 10, left: 12 },
      lineColor: NAVY,
    },
    bodyStyles: {
      fontSize: 11,
      cellPadding: { top: 12, right: 12, bottom: 12, left: 12 },
      lineColor: [225, 228, 235],
      textColor: INK,
    },
    alternateRowStyles: { fillColor: [250, 251, 254] },
    columnStyles: {
      0: { halign: "center", cellWidth: 36 },
      1: { cellWidth: "auto" },
      2: { halign: "right", cellWidth: 90 },
      3: { halign: "right", cellWidth: 90 },
      4: { halign: "right", cellWidth: 110, fontStyle: "bold" },
    },
  });

  // Summary box
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 24;
  const boxW = 280;
  const boxX = pageW - 40 - boxW;
  const boxH = 108;

  doc.setFillColor(...SOFT);
  doc.roundedRect(boxX, finalY, boxW, boxH, 6, 6, "F");
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(1);
  doc.roundedRect(boxX, finalY, boxW, boxH, 6, 6, "S");

  const row = (label: string, value: string, y: number, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(bold ? 12 : 10.5);
    doc.setTextColor(...(bold ? INK : MUTED));
    doc.text(label, boxX + 16, y);
    doc.setTextColor(...INK);
    doc.text(value, boxX + boxW - 16, y, { align: "right" });
  };

  row("Previous balance", rs(opts.previousBalance), finalY + 24);
  row("This invoice", rs(opts.sale.total_amount), finalY + 44);

  doc.setDrawColor(220);
  doc.line(boxX + 12, finalY + 58, boxX + boxW - 12, finalY + 58);

  // Highlight current balance
  doc.setFillColor(...NAVY);
  doc.roundedRect(boxX + 8, finalY + 68, boxW - 16, 32, 4, 4, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text("Current balance", boxX + 20, finalY + 88);
  doc.setTextColor(...GOLD);
  doc.setFontSize(13);
  doc.text(rs(opts.currentBalance), boxX + boxW - 20, finalY + 88, { align: "right" });

  drawFooter(doc);
  return doc;
}

export function generateStatementPDF(opts: {
  customer: Customer;
  rows: { date: string; description: string; debit: number; credit: number; balance: number }[];
  currentBalance: number;
}): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  drawHeader(doc, "STATEMENT", [
    { label: "Generated", value: new Date().toLocaleDateString("en-IN") },
    { label: "Account", value: opts.customer.name },
  ]);

  // Customer block
  doc.setTextColor(...MUTED);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("ACCOUNT HOLDER", 40, 145);
  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(opts.customer.name, 40, 165);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  if (opts.customer.phone) doc.text(opts.customer.phone, 40, 180);

  autoTable(doc, {
    startY: 200,
    margin: { left: 40, right: 40 },
    head: [["Date", "Description", "Debit", "Credit", "Balance"]],
    body: opts.rows.map((r) => [
      r.date,
      r.description,
      r.debit ? rs(r.debit) : "—",
      r.credit ? rs(r.credit) : "—",
      rs(r.balance),
    ]),
    theme: "grid",
    headStyles: {
      fillColor: NAVY,
      textColor: 255,
      fontStyle: "bold",
      fontSize: 10.5,
      cellPadding: { top: 9, right: 10, bottom: 9, left: 10 },
      lineColor: NAVY,
    },
    bodyStyles: {
      fontSize: 10,
      cellPadding: { top: 9, right: 10, bottom: 9, left: 10 },
      lineColor: [225, 228, 235],
      textColor: INK,
    },
    alternateRowStyles: { fillColor: [250, 251, 254] },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: "auto" },
      2: { halign: "right", cellWidth: 80 },
      3: { halign: "right", cellWidth: 80 },
      4: { halign: "right", cellWidth: 90, fontStyle: "bold" },
    },
  });

  const y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 24;
  const boxW = 280;
  const boxX = pageW - 40 - boxW;
  doc.setFillColor(...NAVY);
  doc.roundedRect(boxX, y, boxW, 44, 6, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text("OUTSTANDING BALANCE", boxX + 16, y + 19);
  doc.setTextColor(...GOLD);
  doc.setFontSize(15);
  doc.text(rs(opts.currentBalance), boxX + boxW - 16, y + 30, { align: "right" });

  drawFooter(doc);
  return doc;
}
