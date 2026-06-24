import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarChart3, Download } from "lucide-react";
import { inr, inrShort, kg, fmtDate, todayISO } from "@/lib/format";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useT } from "@/lib/i18n";
import { exportToExcel } from "@/lib/excel";

export function ReportsPage() {
  const { t } = useT();
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(todayISO());
  const [filter, setFilter] = useState<"all" | "outstanding" | "paid">("all");

  const { data } = useQuery({
    queryKey: ["reports", from, to],
    queryFn: async () => {
      const [{ data: sales }, { data: payments }, { data: customers }] = await Promise.all([
        supabase
          .from("sales")
          .select("id,sale_date,weight_kg,total_amount,customer:customers(id,name)")
          .gte("sale_date", from)
          .lte("sale_date", to),
        supabase
          .from("payments")
          .select("id,payment_date,amount,payment_mode,customer:customers(id,name)")
          .gte("payment_date", from)
          .lte("payment_date", to),
        supabase.from("customers").select("id,name,current_balance,phone"),
      ]);
      return { sales: sales ?? [], payments: payments ?? [], customers: customers ?? [] };
    },
  });

  const summary = useMemo(() => {
    const sales = data?.sales ?? [];
    const payments = data?.payments ?? [];
    return {
      totalWeight: sales.reduce((a, s) => a + Number(s.weight_kg), 0),
      totalSales: sales.reduce((a, s) => a + Number(s.total_amount), 0),
      totalCollections: payments.reduce((a, p) => a + Number(p.amount), 0),
      saleCount: sales.length,
      paymentCount: payments.length,
    };
  }, [data]);

  const customers = (data?.customers ?? []).filter((c) => {
    if (filter === "outstanding") return Number(c.current_balance) > 0;
    if (filter === "paid") return Number(c.current_balance) <= 0;
    return true;
  });

  const totalOutstanding = customers.reduce((a, c) => a + Math.max(0, Number(c.current_balance)), 0);

  const exportAll = () => {
    exportToExcel(`royal-broiler-report-${from}_${to}`, {
      Summary: [
        { Metric: "From", Value: from },
        { Metric: "To", Value: to },
        { Metric: "Total weight (kg)", Value: summary.totalWeight },
        { Metric: "Total sales", Value: summary.totalSales },
        { Metric: "Total collections", Value: summary.totalCollections },
        { Metric: "Total outstanding (all customers)", Value: totalOutstanding },
      ],
      Sales: (data?.sales ?? []).map((s) => ({
        Date: s.sale_date,
        Customer: (s.customer as { name: string } | null)?.name ?? "",
        "Weight (kg)": Number(s.weight_kg),
        Total: Number(s.total_amount),
      })),
      Payments: (data?.payments ?? []).map((p) => ({
        Date: p.payment_date,
        Customer: (p.customer as { name: string } | null)?.name ?? "",
        Amount: Number(p.amount),
        Mode: p.payment_mode,
      })),
      Customers: customers.map((c) => ({
        Name: c.name,
        Phone: c.phone ?? "",
        "Outstanding balance": Number(c.current_balance),
      })),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="size-7 text-gold" /> {t("reports")}
          </h1>
          <p className="text-sm text-muted-foreground">Filter by date and export</p>
        </div>
        <Button onClick={exportAll}><Download className="size-4 mr-2" /> {t("export")}</Button>
      </div>

      <Card>
        <CardContent className="p-4 grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Customer filter</Label>
            <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="outstanding">Outstanding only</SelectItem>
                <SelectItem value="paid">Fully paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Metric label="Weight sold" value={kg(summary.totalWeight)} />
        <Metric label="Total sales" value={inr(summary.totalSales)} />
        <Metric label="Collections" value={inr(summary.totalCollections)} />
        <Metric label="Outstanding (all)" value={inr(totalOutstanding)} danger />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Customers ({customers.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60">
                <tr>
                  <th className="text-left px-4 py-2.5 font-semibold">Name</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Phone</th>
                  <th className="text-right px-4 py-2.5 font-semibold">Outstanding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-2.5">{c.name}</td>
                    <td className="px-4 py-2.5">{c.phone || "—"}</td>
                    <td className={`px-4 py-2.5 text-right font-semibold ${Number(c.current_balance) > 0 ? "text-destructive" : ""}`}>
                      {inr(c.current_balance)}
                    </td>
                  </tr>
                ))}
                {!customers.length && (
                  <tr><td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">No customers match</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Sales in range</CardTitle></CardHeader>
          <CardContent className="p-0 max-h-96 overflow-y-auto">
            <div className="divide-y divide-border">
              {(data?.sales ?? []).map((s) => (
                <div key={s.id} className="px-4 py-2.5 flex justify-between text-sm">
                  <div>
                    <div className="font-medium">{(s.customer as { name: string } | null)?.name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{fmtDate(s.sale_date)} · {kg(s.weight_kg)}</div>
                  </div>
                  <div className="font-semibold">{inr(s.total_amount)}</div>
                </div>
              ))}
              {!data?.sales.length && <div className="p-6 text-sm text-muted-foreground">No sales in this range</div>}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Payments in range</CardTitle></CardHeader>
          <CardContent className="p-0 max-h-96 overflow-y-auto">
            <div className="divide-y divide-border">
              {(data?.payments ?? []).map((p) => (
                <div key={p.id} className="px-4 py-2.5 flex justify-between text-sm">
                  <div>
                    <div className="font-medium">{(p.customer as { name: string } | null)?.name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{fmtDate(p.payment_date)} · {p.payment_mode.toUpperCase()}</div>
                  </div>
                  <div className="font-semibold text-success">{inr(p.amount)}</div>
                </div>
              ))}
              {!data?.payments.length && <div className="p-6 text-sm text-muted-foreground">No payments in this range</div>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Metric({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <div className="text-[10px] sm:text-[11px] font-medium text-muted-foreground uppercase tracking-[0.12em]">
          {label}
        </div>
        <div
          className={`mt-2 font-stat tabular-nums leading-none text-2xl sm:text-[28px] ${
            danger
              ? "text-[oklch(0.55_0.20_25)] dark:text-[oklch(0.72_0.20_25)]"
              : "text-foreground"
          }`}
        >
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
