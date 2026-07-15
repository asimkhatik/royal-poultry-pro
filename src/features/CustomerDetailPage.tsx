import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Download, ChevronLeft, FileText, Share2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { inr, inrShort, kg, fmtDate } from "@/lib/format";
import { buildLedger, LedgerTable } from "@/components/LedgerTable";
import { generateInvoicePDF, generateStatementPDF } from "@/lib/pdf";
import { exportToExcel } from "@/lib/excel";
import { deleteCustomerCompletely } from "@/lib/admin-customers.functions";

export function CustomerDetailPage({ id }: { id: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reason, setReason] = useState("");
  const deleteFn = useServerFn(deleteCustomerCompletely);

  const { data, isLoading } = useQuery({
    queryKey: ["customer-detail", id],
    queryFn: async () => {
      const [{ data: customer }, { data: sales }, { data: payments }] = await Promise.all([
        supabase.from("customers").select("*").eq("id", id).maybeSingle(),
        supabase.from("sales").select("*").eq("customer_id", id).order("sale_date", { ascending: true }),
        supabase.from("payments").select("*").eq("customer_id", id).order("payment_date", { ascending: true }),
      ]);
      return { customer, sales: sales ?? [], payments: payments ?? [] };
    },
  });

  const del = useMutation({
    mutationFn: () => deleteFn({ data: { customerId: id, reason: reason || undefined } }),
    onSuccess: () => {
      toast.success("Customer and all associated records have been deleted successfully.");
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
      setConfirmOpen(false);
      navigate({ to: "/customers" });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to delete customer"),
  });

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  const c = data?.customer;
  if (!c) return <div>Customer not found</div>;

  const rows = buildLedger(data!.sales, data!.payments);
  const totalPurchase = data!.sales.reduce((a, s) => a + Number(s.total_amount), 0);
  const totalPaid = data!.payments.reduce((a, p) => a + Number(p.amount), 0);

  const downloadStatement = async () => {
    const pdf = await generateStatementPDF({
      customer: { name: c.name, phone: c.phone, address: c.address },
      rows,
      currentBalance: Number(c.current_balance),
    });
    pdf.save(`statement-${c.name.replace(/\s+/g, "_")}.pdf`);
  };

  const exportXLSX = () => {
    exportToExcel(`${c.name}-records`, {
      Sales: data!.sales.map((s) => ({
        Date: s.sale_date,
        "Weight (kg)": Number(s.weight_kg),
        "Rate /kg": Number(s.rate_per_kg),
        Total: Number(s.total_amount),
      })),
      Payments: data!.payments.map((p) => ({
        Date: p.payment_date,
        Amount: Number(p.amount),
        Mode: p.payment_mode,
        Notes: p.notes ?? "",
      })),
      Ledger: rows.map((r) => ({
        Date: r.date,
        Description: r.description,
        Debit: r.debit,
        Credit: r.credit,
        Balance: r.balance,
      })),
    });
  };

  const downloadInvoice = async (saleId: string) => {
    const idx = data!.sales.findIndex((s) => s.id === saleId);
    if (idx < 0) return;
    const sale = data!.sales[idx];
    // previous balance = sum of all prior debits & credits up to but not including this sale (approx)
    let prev = 0;
    for (let i = 0; i < idx; i++) prev += Number(data!.sales[i].total_amount);
    for (const p of data!.payments) {
      if (new Date(p.payment_date) < new Date(sale.sale_date)) prev -= Number(p.amount);
    }
    const current = prev + Number(sale.total_amount);
    const pdf = await generateInvoicePDF({
      invoiceNo: sale.id.slice(0, 8).toUpperCase(),
      date: fmtDate(sale.sale_date),
      customer: { name: c.name, phone: c.phone, address: c.address },
      sale: {
        id: sale.id,
        sale_date: sale.sale_date,
        weight_kg: Number(sale.weight_kg),
        rate_per_kg: Number(sale.rate_per_kg),
        total_amount: Number(sale.total_amount),
      },
      previousBalance: prev,
      currentBalance: current,
    });
    pdf.save(`invoice-${c.name.replace(/\s+/g, "_")}-${sale.id.slice(0, 8)}.pdf`);
  };

  const shareWhatsApp = (saleId: string) => {
    const sale = data!.sales.find((s) => s.id === saleId);
    if (!sale) return;
    const msg = encodeURIComponent(
      `*ROYAL BROILER — Invoice*%0A
Hello ${c.name},%0A
Date: ${fmtDate(sale.sale_date)}%0A
Weight: ${Number(sale.weight_kg).toFixed(2)} kg%0A
Rate: ₹${Number(sale.rate_per_kg).toFixed(2)}/kg%0A
Total: ₹${Number(sale.total_amount).toFixed(2)}%0A
Current Balance: ₹${Number(c.current_balance).toFixed(2)}%0A
Thank you for your business!`,
    );
    const phone = (c.phone || "").replace(/\D/g, "");
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
  };

  return (
    <div className="space-y-6">
      <Link to="/customers" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Back to customers
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">{c.name}</h1>
          <p className="text-sm text-muted-foreground">
            {c.phone || "—"} · {c.address || "No address"}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={exportXLSX}>
            <FileText className="size-4 mr-2" /> Excel
          </Button>
          <Button onClick={downloadStatement}>
            <Download className="size-4 mr-2" /> Statement
          </Button>
          <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
            <Trash2 className="size-4 mr-2" /> Delete Customer
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete <span className="font-semibold text-foreground">{c.name}</span> and
              all related data (sales, payments, ledger, invoices, reminders, login account). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Reason (optional)</label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this customer being deleted?"
              rows={2}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={del.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); del.mutate(); }}
              disabled={del.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {del.isPending ? "Deleting…" : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid grid-cols-3 gap-4">
       <Stat label="Outstanding" value={inrShort(c.current_balance)} tone={Number(c.current_balance) > 0 ? "danger" : "success"} />
       <Stat label="Total purchase" value={inrShort(totalPurchase)} />
       <Stat label="Total paid" value={inrShort(totalPaid)} tone="success" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ledger</CardTitle>
        </CardHeader>
        <CardContent className="p-0"><LedgerTable rows={rows} /></CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sales & invoices</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {data!.sales.slice().reverse().map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{fmtDate(s.sale_date)} · {kg(s.weight_kg)} @ {inr(s.rate_per_kg)}</div>
                  <div className="text-xs text-muted-foreground">Invoice #{s.id.slice(0, 8).toUpperCase()}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="font-semibold">{inr(s.total_amount)}</div>
                  <Button size="icon" variant="ghost" onClick={() => downloadInvoice(s.id)} title="Download PDF">
                    <Download className="size-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => shareWhatsApp(s.id)} title="Share on WhatsApp">
                    <Share2 className="size-4 text-success" />
                  </Button>
                </div>
              </div>
            ))}
            {!data!.sales.length && <div className="p-6 text-sm text-muted-foreground">No sales yet</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "danger" | "success" }) {
  const color =
    tone === "danger"
      ? "text-[oklch(0.55_0.20_25)] dark:text-[oklch(0.72_0.20_25)]"
      : tone === "success"
        ? "text-[oklch(0.45_0.14_150)] dark:text-[oklch(0.78_0.16_150)]"
        : "text-foreground";
  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <div className="text-[10px] sm:text-[11px] font-medium text-muted-foreground uppercase tracking-[0.12em]">
          {label}
        </div>
        <div className={`mt-2 font-stat tabular-nums leading-none text-2xl sm:text-[28px] ${color}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
