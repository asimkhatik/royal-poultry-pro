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

const rs = (n: number) =>
  `Rs. ${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** jsPDF core fonts have no glyphs for ₹ / em-dash — normalise to safe ASCII. */
const sanitize = (s: string) =>
  String(s ?? "")
    .replace(/₹\s?/g, "Rs. ")
    .replace(/[—–]/g, "-")
    .replace(/\s+/g, " ")
    .trim();


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

export async function generateInvoicePDF(opts: {
  invoiceNo: string;
  date: string;
  customer: Customer;
  sale: Sale;
  previousBalance: number;
  currentBalance: number;
}): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const logoDataUrl = await loadLogoDataUrl();

  drawHeader(doc, logoDataUrl, "INVOICE", [
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

export async function generateStatementPDF(opts: {
  customer: Customer & { id?: string | null; status?: string | null };
  rows: {
    date: string;
    description: string;
    reference: string;
    debit: number;
    credit: number;
    balance: number;
  }[];
  currentBalance: number;
  openingBalance?: number;
  periodStart?: string;
  periodEnd?: string;
}): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const logoDataUrl = await loadLogoDataUrl();

  const openingBalance = Number(opts.openingBalance ?? 0);
  const totalDebit = opts.rows
    .filter((r) => r.reference !== "OPEN")
    .reduce((a, r) => a + Number(r.debit || 0), 0);
  const totalCredit = opts.rows
    .filter((r) => r.reference !== "OPEN")
    .reduce((a, r) => a + Number(r.credit || 0), 0);

  const generatedOn = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const period =
    opts.periodStart && opts.periodEnd
      ? `${opts.periodStart} – ${opts.periodEnd}`
      : opts.rows.length
        ? `${opts.rows[0].date} – ${opts.rows[opts.rows.length - 1].date}`
        : "—";

  // ── Compact bank-style header ──
  const M = 40; // margin
  // Top brand strip
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, 78, "F");
  doc.setFillColor(...GOLD);
  doc.rect(0, 78, pageW, 3, "F");

  drawLogo(doc, logoDataUrl, M, 16, 46);

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("ROYAL BROILER", M + 58, 36);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(220, 226, 240);
  doc.text("Poultry Business Management", M + 58, 50);
  doc.text("Live Chicken Sales  •  Wholesale & Retail", M + 58, 62);

  // Right-aligned document title
  doc.setTextColor(...GOLD);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("CUSTOMER ACCOUNT STATEMENT", pageW - M, 34, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(220, 226, 240);
  doc.text(`Statement Period: ${period}`, pageW - M, 50, { align: "right" });
  doc.text(`Generated On: ${generatedOn}`, pageW - M, 62, { align: "right" });

  // ── Account holder ──
  const infoTop = 100;
  const colW = (pageW - M * 2 - 16) / 2;

  doc.setDrawColor(220, 224, 232);
  doc.setLineWidth(0.6);
  doc.rect(M, infoTop, colW, 62, "S");
  doc.setFillColor(...NAVY);
  doc.rect(M, infoTop, colW, 20, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("ACCOUNT HOLDER", M + 10, infoTop + 13);

  const holderRow = (label: string, value: string, y: number) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(label, M + 10, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...INK);
    doc.text(value || "-", M + colW - 10, y, { align: "right" });
  };
  holderRow("Customer Name", sanitize(opts.customer.name), infoTop + 36);
  holderRow("Mobile Number", opts.customer.phone || "-", infoTop + 53);

  // ── Transaction table ──
  const tableW = pageW - M * 2;
  const wDate = 66;
  const wRef = 64;
  const wMoney = 72;
  const wBal = 78;
  const wDesc = tableW - wDate - wRef - wMoney * 2 - wBal;

  autoTable(doc, {
    startY: infoTop + 86,
    margin: { left: M, right: M, top: 90, bottom: 70 },
    tableWidth: tableW,
    head: [["Date", "Description", "Reference", "Debit", "Credit", "Balance"]],
    body: opts.rows.map((r) => [
      r.date,
      sanitize(r.description),
      r.reference,
      r.debit ? rs(r.debit) : "-",
      r.credit ? rs(r.credit) : "-",
      rs(r.balance),
    ]),
    theme: "plain",
    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: { top: 7, right: 8, bottom: 7, left: 8 },
      lineColor: [220, 224, 232],
      lineWidth: 0.4,
      textColor: INK,
      overflow: "linebreak",
      valign: "middle",
    },
    headStyles: {
      fillColor: NAVY,
      textColor: 255,
      fontStyle: "bold",
      fontSize: 8.5,
      halign: "left",
      cellPadding: { top: 8, right: 8, bottom: 8, left: 8 },
      lineColor: NAVY,
      lineWidth: 0,
    },
    bodyStyles: {
      lineColor: [230, 233, 240],
      lineWidth: { top: 0, right: 0, bottom: 0.4, left: 0 } as unknown as number,
    },
    alternateRowStyles: { fillColor: [249, 250, 253] },
    columnStyles: {
      0: { cellWidth: wDate },
      1: { cellWidth: wDesc },
      2: { cellWidth: wRef, font: "courier", fontSize: 8, textColor: MUTED },
      3: { halign: "right", cellWidth: wMoney, textColor: [160, 30, 40] },
      4: { halign: "right", cellWidth: wMoney, textColor: [20, 110, 60] },
      5: { halign: "right", cellWidth: wBal, fontStyle: "bold" },
    },
    didParseCell: (data) => {
      if (data.section === "body" && (data.column.index === 3 || data.column.index === 4) && data.cell.raw === "-") {
        data.cell.styles.textColor = MUTED as unknown as [number, number, number];
      }
    },
  });


  // ── Closing balance strip ──
  const y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;
  const boxW = 260;
  const boxX = pageW - M - boxW;
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.8);
  doc.setFillColor(...NAVY);
  doc.rect(boxX, y, boxW, 52, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text("CLOSING ACCOUNT BALANCE", boxX + 14, y + 18);
  doc.setTextColor(...GOLD);
  doc.setFontSize(18);
  doc.text(rs(opts.currentBalance), boxX + boxW - 14, y + 38, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(220, 226, 240);
  doc.text("Amount Outstanding", boxX + 14, y + 44);

  // ── Bank-style footer on every page ──
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.6);
    doc.line(M, pageH - 54, pageW - M, pageH - 54);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(
      "This is a computer-generated statement. No signature is required.",
      M,
      pageH - 40,
    );
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...NAVY);
    doc.text("ROYAL BROILER", M, pageH - 26);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...MUTED);
    doc.text("Every Bird Counted. Every Rupee Tracked.", M + 90, pageH - 26);
    doc.setFont("helvetica", "normal");
    doc.text(`Page ${i} of ${total}`, pageW - M, pageH - 26, { align: "right" });
  }
  return doc;
}
