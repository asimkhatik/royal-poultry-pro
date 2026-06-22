import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { inr, fmtDate, todayISO } from "@/lib/format";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useT } from "@/lib/i18n";
import { exportToExcel } from "@/lib/excel";

export function PaymentsPage() {
  const qc = useQueryClient();
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    customer_id: "",
    payment_date: todayISO(),
    amount: "",
    payment_mode: "cash",
    notes: "",
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("id,name,current_balance").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["payments-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("id,payment_date,amount,payment_mode,notes,customer:customers(id,name)")
        .order("payment_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("payments").insert({
        customer_id: form.customer_id,
        payment_date: form.payment_date,
        amount: Number(form.amount),
        payment_mode: form.payment_mode as "cash" | "upi" | "bank_transfer",
        notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Payment recorded");
      qc.invalidateQueries({ queryKey: ["payments-list"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["customers-list"] });
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
      setOpen(false);
      setForm({ customer_id: "", payment_date: todayISO(), amount: "", payment_mode: "cash", notes: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("payments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Payment removed");
      qc.invalidateQueries({ queryKey: ["payments-list"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const exportXLSX = () => {
    exportToExcel("payments", {
      Payments: payments.map((p) => ({
        Date: p.payment_date,
        Customer: (p.customer as { name: string } | null)?.name ?? "",
        Amount: Number(p.amount),
        Mode: p.payment_mode,
        Notes: p.notes ?? "",
      })),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight flex items-center gap-2">
            <Wallet className="size-7 text-gold" /> {t("payments")}
          </h1>
          <p className="text-sm text-muted-foreground">{payments.length} recent entries</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportXLSX}>{t("export")}</Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="shadow-royal"><Plus className="size-4 mr-1" /> {t("addPayment")}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{t("addPayment")}</DialogTitle></DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!form.customer_id) return toast.error("Select a customer");
                  add.mutate();
                }}
                className="space-y-3"
              >
                <div className="space-y-1.5">
                  <Label>{t("customer")}</Label>
                  <Select value={form.customer_id} onValueChange={(v) => setForm({ ...form, customer_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} {Number(c.current_balance) > 0 ? `· ${inr(c.current_balance)} due` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>{t("date")}</Label>
                    <Input type="date" value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("amount")}</Label>
                    <Input type="number" step="0.01" min="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("mode")}</Label>
                  <Select value={form.payment_mode} onValueChange={(v) => setForm({ ...form, payment_mode: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("notes")}</Label>
                  <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={add.isPending}>{t("save")}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent payments</CardTitle></CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading…</div>
          ) : !payments.length ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No payments yet</div>
          ) : (
            <div className="divide-y divide-border">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/40">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{(p.customer as { name: string } | null)?.name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{fmtDate(p.payment_date)} · {p.payment_mode.toUpperCase()}</div>
                  </div>
                  <div className="font-semibold text-success">{inr(p.amount)}</div>
                  <Button size="icon" variant="ghost" onClick={() => { if (confirm("Delete this payment?")) del.mutate(p.id); }}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
