import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Bell, Send, RefreshCw, CheckCircle2, Clock } from "lucide-react";
import { inrShort } from "@/lib/format";

type Settings = {
  enabled: boolean;
  send_hour: number;
  message_template: string;
};

type ReminderLog = {
  id: string;
  customer_id: string;
  reminder_date: string;
  balance: number;
  whatsapp_number: string | null;
  message: string;
  whatsapp_url: string;
  status: string;
  sent_at: string | null;
  customers?: { name: string; phone: string | null } | null;
};

export function RemindersPage() {
  const [settings, setSettings] = useState<Settings>({
    enabled: true,
    send_hour: 9,
    message_template: "",
  });
  const [logs, setLogs] = useState<ReminderLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  async function load() {
    setLoading(true);
    const [{ data: s }, { data: l }] = await Promise.all([
      supabase.from("reminder_settings").select("*").eq("id", true).maybeSingle(),
      supabase
        .from("reminder_logs")
        .select("*, customers(name, phone)")
        .order("reminder_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    if (s) setSettings({ enabled: s.enabled, send_hour: s.send_hour, message_template: s.message_template });
    if (l) setLogs(l as ReminderLog[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function saveSettings() {
    setSaving(true);
    const { error } = await supabase
      .from("reminder_settings")
      .update({
        enabled: settings.enabled,
        send_hour: settings.send_hour,
        message_template: settings.message_template,
        updated_at: new Date().toISOString(),
      })
      .eq("id", true);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Reminder settings saved");
  }

  async function generateNow() {
    setGenerating(true);
    // Build reminder rows client-side by querying eligible customers
    const { data: customers, error: cErr } = await supabase
      .from("customers")
      .select("id, name, phone, whatsapp_number, current_balance, reminder_enabled, status")
      .eq("status", "active")
      .eq("reminder_enabled", true)
      .gt("current_balance", 0);

    if (cErr) {
      setGenerating(false);
      toast.error(cErr.message);
      return;
    }
    const tpl = settings.message_template;
    const payLink = "upi://pay?pa=asimkhatik1116-1@okicici&pn=ROYAL%20BROILER";
    const rows = (customers ?? [])
      .map((c) => {
        const raw = (c.whatsapp_number || c.phone || "").replace(/\D/g, "");
        if (raw.length < 10) return null;
        const phone = raw.length === 10 ? "91" + raw : raw;
        const msg = tpl
          .replaceAll("{name}", c.name)
          .replaceAll("{balance}", Number(c.current_balance).toFixed(2))
          .replaceAll("{pay_link}", payLink);
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
        return {
          customer_id: c.id,
          reminder_date: today,
          balance: Number(c.current_balance),
          whatsapp_number: phone,
          message: msg,
          whatsapp_url: url,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    if (rows.length === 0) {
      setGenerating(false);
      toast.info("No eligible customers right now.");
      return;
    }

    const { error } = await supabase.from("reminder_logs").upsert(rows, {
      onConflict: "customer_id,reminder_date",
      ignoreDuplicates: true,
    });
    setGenerating(false);
    if (error) toast.error(error.message);
    else {
      toast.success(`Generated ${rows.length} reminder${rows.length > 1 ? "s" : ""}`);
      load();
    }
  }

  async function markSent(log: ReminderLog) {
    window.open(log.whatsapp_url, "_blank");
    await supabase
      .from("reminder_logs")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", log.id);
    load();
  }

  const todayLogs = logs.filter((l) => l.reminder_date === today);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-xl bg-primary/10 grid place-items-center text-primary">
          <Bell className="size-5" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold">WhatsApp Reminders</h1>
          <p className="text-sm text-muted-foreground">
            Daily reminders for customers with outstanding balances.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reminder settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <div>
              <div className="font-medium text-sm">Daily reminders enabled</div>
              <div className="text-xs text-muted-foreground">
                When on, reminders are generated automatically every day at the chosen hour.
              </div>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(v) => setSettings((s) => ({ ...s, enabled: v }))}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="hour">Send hour (24h, IST)</Label>
              <Input
                id="hour"
                type="number"
                min={0}
                max={23}
                value={settings.send_hour}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, send_hour: Math.max(0, Math.min(23, Number(e.target.value) || 0)) }))
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                Reminders are generated at {String(settings.send_hour).padStart(2, "0")}:00 IST daily.
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="tpl">Message template</Label>
            <Textarea
              id="tpl"
              rows={4}
              value={settings.message_template}
              onChange={(e) => setSettings((s) => ({ ...s, message_template: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Placeholders: <code>{"{name}"}</code>, <code>{"{balance}"}</code>, <code>{"{pay_link}"}</code>
            </p>
          </div>

          <div className="flex gap-2">
            <Button onClick={saveSettings} disabled={saving}>
              {saving ? "Saving…" : "Save settings"}
            </Button>
            <Button variant="outline" onClick={generateNow} disabled={generating}>
              <RefreshCw className={`size-4 mr-2 ${generating ? "animate-spin" : ""}`} />
              Generate today's reminders
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            Today's reminders
            <span className="text-xs font-normal text-muted-foreground">
              ({todayLogs.length} pending of {todayLogs.length + 0})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : todayLogs.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No reminders for today yet. Click "Generate today's reminders" above.
            </div>
          ) : (
            <div className="divide-y">
              {todayLogs.map((log) => (
                <div key={log.id} className="py-3 flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">
                        {log.customers?.name ?? "—"}
                      </span>
                      {log.status === "sent" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide bg-green-500/15 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded">
                          <CheckCircle2 className="size-3" /> Sent
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide bg-amber-500/15 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded">
                          <Clock className="size-3" /> Pending
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {log.whatsapp_number} · Balance {inrShort(Number(log.balance))}
                    </div>
                    <div className="text-xs mt-1 line-clamp-2 text-muted-foreground/90">
                      {log.message}
                    </div>
                  </div>
                  <Button size="sm" onClick={() => markSent(log)}>
                    <Send className="size-4 mr-1.5" />
                    {log.status === "sent" ? "Resend" : "Send"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent history</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-sm text-muted-foreground">No reminders yet.</div>
          ) : (
            <div className="text-sm divide-y">
              {logs.slice(0, 30).map((log) => (
                <div key={log.id} className="py-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{log.customers?.name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {log.reminder_date} · {inrShort(Number(log.balance))}
                    </div>
                  </div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    {log.status}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
