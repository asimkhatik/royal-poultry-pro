import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Crown, Receipt, Scale, TrendingUp, Wallet, Users, UserCheck } from "lucide-react";
import { inr, kg, fmtDate } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { StatCard } from "@/components/StatCard";
import { DayPickerControl } from "@/components/DayPicker";
import { format } from "date-fns";

function toISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function AdminDashboard() {
  const { t } = useT();
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const dateISO = toISO(selectedDate);
  const isToday = dateISO === toISO(new Date());

  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard-day", dateISO],
    queryFn: async () => {
      const [salesDay, paymentsDay, customers, settings, dayReminders] = await Promise.all([
        supabase
          .from("sales")
          .select("id,customer_id,weight_kg,rate_per_kg,total_amount,quantity_of_broilers,sale_date,created_at,customer:customers(name)")
          .eq("sale_date", dateISO)
          .order("created_at", { ascending: false }),
        supabase
          .from("payments")
          .select("id,customer_id,amount,payment_mode,payment_date,created_at,customer:customers(name)")
          .eq("payment_date", dateISO)
          .order("created_at", { ascending: false }),
        supabase.from("customers").select("id,name,current_balance,status"),
        supabase.from("reminder_settings").select("enabled,send_hour").eq("id", true).maybeSingle(),
        supabase.from("reminder_logs").select("id,sent_at").eq("reminder_date", dateISO),
      ]);

      const sales = salesDay.data ?? [];
      const payments = paymentsDay.data ?? [];

      const todayWeight = sales.reduce((a, r) => a + Number(r.weight_kg), 0);
      const todayRevenue = sales.reduce((a, r) => a + Number(r.total_amount), 0);
      const todayPayments = payments.reduce((a, r) => a + Number(r.amount), 0);
      const todayOutstanding = Math.max(0, todayRevenue - todayPayments);
      const activeCustomerIds = new Set(sales.map((s) => s.customer_id));
      const totalOutstanding = (customers.data ?? []).reduce(
        (a, r) => a + Math.max(0, Number(r.current_balance)),
        0,
      );

      return {
        sales,
        payments,
        todayWeight,
        todayRevenue,
        todayPayments,
        todayOutstanding,
        activeCount: activeCustomerIds.size,
        salesCount: sales.length,
        totalOutstanding,
        totalCustomers: (customers.data ?? []).length,
        reminderEnabled: Boolean(settings.data?.enabled),
        reminderHour: Number(settings.data?.send_hour ?? 9),
        remindersToday: (dayReminders.data ?? []).length,
        remindersSentToday: (dayReminders.data ?? []).filter((r) => r.sent_at).length,
      };
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Crown className="size-7 text-gold" />
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">{t("dashboard")}</h1>
            <p className="text-sm text-muted-foreground">
              {isToday ? "Today" : format(selectedDate, "EEEE, dd MMM yyyy")} · daily snapshot
            </p>
          </div>
        </div>
        <DayPickerControl value={selectedDate} onChange={setSelectedDate} />
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={isToday ? "Today's sales" : "Sales"}
          value={Number(data?.todayRevenue ?? 0)}
          format="currency"
          tone="revenue"
          icon={Receipt}
          highlight
        />
        <StatCard
          label={isToday ? "Today's weight" : "Weight sold"}
          value={Number(data?.todayWeight ?? 0)}
          format="weight"
          tone="weight"
          icon={Scale}
        />
        <StatCard
          label={isToday ? "Today's payments" : "Payments"}
          value={Number(data?.todayPayments ?? 0)}
          format="currency"
          tone="paid"
          icon={Wallet}
        />
        <StatCard
          label={isToday ? "Today's outstanding" : "Day's outstanding"}
          value={Number(data?.todayOutstanding ?? 0)}
          format="currency"
          tone="outstanding"
          icon={TrendingUp}
        />
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Customers active"
          value={Number(data?.activeCount ?? 0)}
          format="count"
          tone="customers"
          icon={UserCheck}
        />
        <StatCard
          label="Transactions"
          value={Number(data?.salesCount ?? 0)}
          format="count"
          tone="revenue"
          icon={Receipt}
        />
        <Card>
          <CardContent className="p-5">
            <div className="text-[10px] sm:text-[11px] font-medium text-muted-foreground uppercase tracking-[0.12em]">
              Total customers
            </div>
            <div className="mt-2 font-stat tabular-nums leading-none text-2xl sm:text-3xl">
              {data?.totalCustomers ?? 0}
            </div>
            <Link to="/customers" className="text-xs text-primary hover:underline mt-2 inline-block">
              Manage →
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`size-10 rounded-lg flex items-center justify-center shrink-0 ${data?.reminderEnabled ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                {data?.reminderEnabled ? <Bell className="size-5" /> : <BellOff className="size-5" />}
              </div>
              <div className="min-w-0">
                <div className="text-[10px] sm:text-[11px] font-medium text-muted-foreground uppercase tracking-[0.12em]">
                  Reminders
                </div>
                <div className="text-sm font-semibold truncate">
                  {data?.reminderEnabled ? `On · ${String(data.reminderHour).padStart(2, "0")}:00` : "Off"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {data?.remindersSentToday ?? 0} / {data?.remindersToday ?? 0} sent
                </div>
              </div>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link to="/reminders">Open</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base font-semibold">
            Overall outstanding (all customers)
          </CardTitle>
          <Button asChild size="sm" variant="ghost">
            <Link to="/reports">View reports →</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="font-stat tabular-nums text-2xl font-semibold text-[oklch(0.55_0.20_25)] dark:text-[oklch(0.72_0.20_25)]">
            {inr(data?.totalOutstanding ?? 0)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Lifetime totals moved to Reports & Analytics.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              {isToday ? "Today's sales" : `Sales on ${format(selectedDate, "dd MMM")}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border max-h-80 overflow-y-auto">
              {isLoading && <div className="px-4 py-6 text-sm text-muted-foreground">Loading…</div>}
              {!isLoading && (data?.sales ?? []).map((s) => (
                <div key={s.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="font-medium text-sm">{(s.customer as { name: string } | null)?.name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {kg(s.weight_kg)} @ {inr(s.rate_per_kg)}
                      {s.quantity_of_broilers ? ` · ${s.quantity_of_broilers} birds` : ""}
                    </div>
                  </div>
                  <div className="font-semibold text-primary">{inr(s.total_amount)}</div>
                </div>
              ))}
              {!isLoading && !data?.sales.length && (
                <div className="px-4 py-6 text-sm text-muted-foreground">No sales on this date</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              {isToday ? "Today's payments" : `Payments on ${format(selectedDate, "dd MMM")}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border max-h-80 overflow-y-auto">
              {isLoading && <div className="px-4 py-6 text-sm text-muted-foreground">Loading…</div>}
              {!isLoading && (data?.payments ?? []).map((p) => (
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
              {!isLoading && !data?.payments.length && (
                <div className="px-4 py-6 text-sm text-muted-foreground">No payments on this date</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
