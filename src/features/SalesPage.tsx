import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Receipt, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { inr, kg, fmtDate, todayISO } from "@/lib/format";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useT } from "@/lib/i18n";
import { exportToExcel } from "@/lib/excel";

export function SalesPage() {
  const qc = useQueryClient();
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    customer_id: "",
    sale_date: todayISO(),
    quantity_of_broilers: "",
    weight_kg: "",
    rate_per_kg: "",
    notes: "",
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("id,name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ["sales-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("id,sale_date,quantity_of_broilers,weight_kg,rate_per_kg,total_amount,notes,customer:customers(id,name)")
        .order("sale_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  const total = useMemo(() => {
    const w = Number(form.weight_kg || 0);
    const r = Number(form.rate_per_kg || 0);
    return w * r;
  }, [form.weight_kg, form.rate_per_kg]);

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("sales").insert({
        customer_id: form.customer_id,
        sale_date: form.sale_date,
        quantity_of_broilers: form.quantity_of_broilers ? Number(form.quantity_of_broilers) : null,
        weight_kg: Number(form.weight_kg),
        rate_per_kg: Number(form.rate_per_kg),
        total_amount: total,
        notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Sale recorded");
      qc.invalidateQueries({ queryKey: ["sales-list"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
      setOpen(false);
      setForm({ customer_id: "", sale_date: todayISO(), quantity_of_broilers: "", weight_kg: "", rate_per_kg: "", notes: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sales").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Sale removed");
      qc.invalidateQueries({ queryKey: ["sales-list"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const exportXLSX = () => {
    exportToExcel("sales", {
      Sales: sales.map((s) => ({
        Date: s.sale_date,
        Customer: (s.customer as { name: string } | null)?.name ?? "",
        "Quantity (birds)": s.quantity_of_broilers ?? "",
        "Weight (kg)": Number(s.weight_kg),
        "Rate /kg": Number(s.rate_per_kg),
        Total: Number(s.total_amount),
        Notes: s.notes ?? "",
      })),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight flex items-center gap-2">
            <Receipt className="size-7 text-gold" /> {t("sales")}
          </h1>
          <p className="text-sm text-muted-foreground">{sales.length} recent entries</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportXLSX}>{t("export")}</Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="shadow-royal"><Plus className="size-4 mr-1" /> {t("addSale")}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{t("addSale")}</DialogTitle></DialogHeader>
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
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>{t("date")}</Label>
                    <Input type="date" value={form.sale_date} onChange={(e) => setForm({ ...form, sale_date: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Quantity (birds)</Label>
                    <Input type="number" step="1" min="0" placeholder="e.g. 100" value={form.quantity_of_broilers} onChange={(e) => setForm({ ...form, quantity_of_broilers: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("weight")} (kg)</Label>
                    <Input type="number" step="0.01" min="0.01" required value={form.weight_kg} onChange={(e) => setForm({ ...form, weight_kg: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("rate")} (₹/kg)</Label>
                    <Input type="number" step="0.01" min="0" required value={form.rate_per_kg} onChange={(e) => setForm({ ...form, rate_per_kg: e.target.value })} />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label>{t("total")}</Label>
                    <Input value={inr(total)} disabled className="font-semibold" />
                  </div>
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
        <CardHeader><CardTitle className="text-base">Recent sales</CardTitle></CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading…</div>
          ) : !sales.length ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No sales yet</div>
          ) : (
            <div className="divide-y divide-border">
              {sales.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/40">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{(s.customer as { name: string } | null)?.name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {fmtDate(s.sale_date)} · {kg(s.weight_kg)} @ {inr(s.rate_per_kg)}
                    </div>
                  </div>
                  <div className="font-semibold text-primary">{inr(s.total_amount)}</div>
                  <Button size="icon" variant="ghost" onClick={() => { if (confirm("Delete this sale?")) del.mutate(s.id); }}>
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
