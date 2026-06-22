import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Customer = { name: string; phone?: string | null; address?: string | null };
type Sale = { id: string; sale_date: string; weight_kg: number; rate_per_kg: number; total_amount: number };

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

  // Header band
  doc.setFillColor(30, 58, 138);
  doc.rect(0, 0, pageW, 90, "F");
  doc.setFillColor(212, 175, 55);
  doc.rect(0, 90, pageW, 6, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text("ROYAL BROILER", 40, 45);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Poultry Business Management", 40, 65);

  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE", pageW - 40, 45, { align: "right" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`#${opts.invoiceNo}`, pageW - 40, 65, { align: "right" });
  doc.text(opts.date, pageW - 40, 80, { align: "right" });

  // Bill to
  doc.setTextColor(20, 20, 30);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("BILL TO", 40, 130);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text(opts.customer.name, 40, 148);
  if (opts.customer.phone) doc.text(opts.customer.phone, 40, 164);
  if (opts.customer.address) doc.text(opts.customer.address, 40, 180, { maxWidth: 300 });

  // Items table
  autoTable(doc, {
    startY: 220,
    head: [["Description", "Weight (kg)", "Rate / kg", "Amount"]],
    body: [
      [
        "Live chicken sale",
        opts.sale.weight_kg.toFixed(2),
        `Rs. ${Number(opts.sale.rate_per_kg).toFixed(2)}`,
        `Rs. ${Number(opts.sale.total_amount).toFixed(2)}`,
      ],
    ],
    theme: "grid",
    headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: "bold" },
    styles: { fontSize: 11, cellPadding: 8 },
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
  });

  // Summary box
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;
  const boxX = pageW - 260;
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(1);
  doc.rect(boxX, finalY, 220, 90);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Previous balance", boxX + 12, finalY + 22);
  doc.text(`Rs. ${opts.previousBalance.toFixed(2)}`, boxX + 208, finalY + 22, { align: "right" });

  doc.text("This invoice", boxX + 12, finalY + 42);
  doc.text(`Rs. ${Number(opts.sale.total_amount).toFixed(2)}`, boxX + 208, finalY + 42, { align: "right" });

  doc.setDrawColor(220);
  doc.line(boxX + 8, finalY + 54, boxX + 212, finalY + 54);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Current balance", boxX + 12, finalY + 76);
  doc.text(`Rs. ${opts.currentBalance.toFixed(2)}`, boxX + 208, finalY + 76, { align: "right" });

  // Footer
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(
    "Thank you for your business. — ROYAL BROILER",
    pageW / 2,
    doc.internal.pageSize.getHeight() - 30,
    { align: "center" },
  );

  return doc;
}

export function generateStatementPDF(opts: {
  customer: Customer;
  rows: { date: string; description: string; debit: number; credit: number; balance: number }[];
  currentBalance: number;
}): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFillColor(30, 58, 138);
  doc.rect(0, 0, pageW, 80, "F");
  doc.setFillColor(212, 175, 55);
  doc.rect(0, 80, pageW, 5, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("ROYAL BROILER", 40, 40);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Customer Statement", 40, 60);
  doc.setFontSize(11);
  doc.text(new Date().toLocaleDateString("en-IN"), pageW - 40, 60, { align: "right" });

  doc.setTextColor(20, 20, 30);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(opts.customer.name, 40, 115);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  if (opts.customer.phone) doc.text(opts.customer.phone, 40, 130);

  autoTable(doc, {
    startY: 150,
    head: [["Date", "Description", "Debit", "Credit", "Balance"]],
    body: opts.rows.map((r) => [
      r.date,
      r.description,
      r.debit ? `Rs. ${r.debit.toFixed(2)}` : "—",
      r.credit ? `Rs. ${r.credit.toFixed(2)}` : "—",
      `Rs. ${r.balance.toFixed(2)}`,
    ]),
    theme: "striped",
    headStyles: { fillColor: [30, 58, 138], textColor: 255 },
    styles: { fontSize: 10, cellPadding: 6 },
    columnStyles: { 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } },
  });

  const y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(`Outstanding balance: Rs. ${opts.currentBalance.toFixed(2)}`, pageW - 40, y, { align: "right" });
  return doc;
}
