import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, Receipt, Scale, TrendingUp, Wallet, Users } from "lucide-react";
import { inr, kg, fmtDate, todayISO } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { StatCard } from "@/components/StatCard";
// (local legacy StatCard removed; using shared component)
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function AdminDashboard() {
  const { t } = useT();
  const today = todayISO();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard", today],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 13);
      const sinceISO = since.toISOString().slice(0, 10);

      const [salesToday, salesAll, customers, payments, recentSales, recentPayments, topOutstanding, salesRange] =
        await Promise.all([
          supabase.from("sales").select("weight_kg,total_amount").eq("sale_date", today),
          supabase.from("sales").select("total_amount"),
          supabase.from("customers").select("id,name,current_balance,status"),
          supabase.from("payments").select("amount"),
          supabase
            .from("sales")
            .select("id,sale_date,total_amount,weight_kg,rate_per_kg,customer:customers(name)")
            .order("created_at", { ascending: false })
            .limit(5),
          supabase
            .from("payments")
            .select("id,payment_date,amount,payment_mode,customer:customers(name)")
            .order("created_at", { ascending: false })
            .limit(5),
          supabase
            .from("customers")
            .select("id,name,current_balance")
            .gt("current_balance", 0)
            .order("current_balance", { ascending: false })
            .limit(5),
          supabase.from("sales").select("sale_date,total_amount").gte("sale_date", sinceISO),
        ]);

      const todayWeight = (salesToday.data ?? []).reduce((a, r) => a + Number(r.weight_kg), 0);
      const todayRevenue = (salesToday.data ?? []).reduce((a, r) => a + Number(r.total_amount), 0);
      const totalRevenue = (salesAll.data ?? []).reduce((a, r) => a + Number(r.total_amount), 0);
      const totalCustomers = (customers.data ?? []).length;
      const outstanding = (customers.data ?? []).reduce((a, r) => a + Math.max(0, Number(r.current_balance)), 0);
      const totalPaid = (payments.data ?? []).reduce((a, r) => a + Number(r.amount), 0);

      // 14-day trend
      const byDay = new Map<string, number>();
      for (let i = 13; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        byDay.set(d.toISOString().slice(0, 10), 0);
      }
      for (const r of salesRange.data ?? []) {
        byDay.set(r.sale_date, (byDay.get(r.sale_date) ?? 0) + Number(r.total_amount));
      }
      const trend = Array.from(byDay.entries()).map(([date, amount]) => ({
        date: new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
        amount,
      }));

      return {
        todayWeight,
        todayRevenue,
        totalRevenue,
        totalCustomers,
        outstanding,
        totalPaid,
        recentSales: recentSales.data ?? [],
        recentPayments: recentPayments.data ?? [],
        topOutstanding: topOutstanding.data ?? [],
        trend,
      };
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Crown className="size-7 text-gold" />
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">{t("dashboard")}</h1>
          <p className="text-sm text-muted-foreground">Live snapshot of your business</p>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("todaySales")} value={Number(data?.todayRevenue ?? 0)} format="currency" tone="revenue" icon={Receipt} highlight />
        <StatCard label={t("todayWeight")} value={Number(data?.todayWeight ?? 0)} format="weight" tone="weight" icon={Scale} />
        <StatCard label={t("totalRevenue")} value={Number(data?.totalRevenue ?? 0)} format="currency" tone="revenue" icon={TrendingUp} />
        <StatCard label={t("outstanding")} value={Number(data?.outstanding ?? 0)} format="currency" tone="outstanding" icon={Wallet} />
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("totalCustomers")} value={Number(data?.totalCustomers ?? 0)} format="count" tone="customers" icon={Users} />
        <StatCard label={t("totalPaid")} value={Number(data?.totalPaid ?? 0)} format="currency" tone="paid" icon={Wallet} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Daily sales — last 14 days</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {isLoading ? null : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data?.trend ?? []}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => inr(v)} />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="var(--chart-1)"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "var(--chart-2)" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Top outstanding</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {(data?.topOutstanding ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No outstanding balances 🎉</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.topOutstanding ?? []} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip formatter={(v: number) => inr(v)} />
                  <Bar dataKey="current_balance" radius={[0, 6, 6, 0]}>
                    {(data?.topOutstanding ?? []).map((_, i) => (
                      <Cell key={i} fill={`var(--chart-${(i % 5) + 1})`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Recent sales</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {(data?.recentSales ?? []).map((s) => (
                <div key={s.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="font-medium text-sm">{(s.customer as { name: string } | null)?.name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {fmtDate(s.sale_date)} · {kg(s.weight_kg)} @ {inr(s.rate_per_kg)}
                    </div>
                  </div>
                  <div className="font-semibold text-primary">{inr(s.total_amount)}</div>
                </div>
              ))}
              {!data?.recentSales.length && (
                <div className="px-4 py-6 text-sm text-muted-foreground">No sales yet</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Recent payments</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {(data?.recentPayments ?? []).map((p) => (
                <div key={p.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="font-medium text-sm">{(p.customer as { name: string } | null)?.name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {fmtDate(p.payment_date)} · {p.payment_mode.toUpperCase()}
                    </div>
                  </div>
                  <div className="font-semibold text-success">{inr(p.amount)}</div>
                </div>
              ))}
              {!data?.recentPayments.length && (
                <div className="px-4 py-6 text-sm text-muted-foreground">No payments yet</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

