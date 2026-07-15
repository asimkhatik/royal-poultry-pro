import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Fingerprint, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  biometricAvailable,
  disableBiometric,
  enableBiometric,
  isBiometricEnabled,
  isNative,
} from "@/lib/biometric";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [{ title: "Settings — ROYAL BROILER" }],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const [enabled, setEnabled] = useState(false);
  const [available, setAvailable] = useState(false);
  const [label, setLabel] = useState("Biometric");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const info = await biometricAvailable();
      setAvailable(info.available);
      setLabel(info.label);
      setEnabled(await isBiometricEnabled());
    })();
  }, []);

  const onToggle = async (next: boolean) => {
    setBusy(true);
    try {
      if (next) {
        await enableBiometric();
        setEnabled(true);
        toast.success(`${label} login enabled`);
      } else {
        await disableBiometric();
        setEnabled(false);
        toast.success("Biometric login disabled");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const onReRegister = async () => {
    setBusy(true);
    try {
      await enableBiometric();
      toast.success("Biometrics re-registered");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your account and security</p>
        </div>

        <section className="rounded-2xl border bg-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-10 rounded-xl bg-gold/10 text-gold flex items-center justify-center">
              <Fingerprint className="size-5" />
            </div>
            <div>
              <h2 className="font-semibold">Biometric Authentication</h2>
              <p className="text-xs text-muted-foreground">
                {available ? `${label} available on this device` : "Not available on this device"}
              </p>
            </div>
          </div>

          {!isNative() && (
            <div className="text-sm text-muted-foreground rounded-lg bg-muted p-3 mb-4 flex gap-2">
              <ShieldCheck className="size-4 shrink-0 mt-0.5" />
              Biometric login works inside the ROYAL BROILER Android/iOS app.
            </div>
          )}

          <div className="flex items-center justify-between py-3 border-t">
            <div>
              <div className="font-medium">Enable {label} login</div>
              <div className="text-xs text-muted-foreground">Sign in without typing your password</div>
            </div>
            <Switch checked={enabled} disabled={!available || busy} onCheckedChange={onToggle} />
          </div>

          {enabled && (
            <div className="flex items-center justify-between py-3 border-t">
              <div>
                <div className="font-medium">Re-register biometrics</div>
                <div className="text-xs text-muted-foreground">Refresh the saved secure session</div>
              </div>
              <Button variant="outline" size="sm" disabled={busy} onClick={onReRegister}>
                Re-register
              </Button>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
