import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // supabase handles the recovery hash; just wait for a session
    supabase.auth.getSession().then(({ data }) => setReady(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setReady(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    navigate({ to: "/", replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 bg-card p-6 rounded-2xl shadow-royal border border-border">
        <h1 className="font-display text-2xl font-bold">Set a new password</h1>
        {!ready && <p className="text-sm text-muted-foreground">Validating reset link…</p>}
        <div className="space-y-1.5">
          <Label htmlFor="np">New password</Label>
          <Input id="np" type="password" required minLength={6} value={pwd} onChange={(e) => setPwd(e.target.value)} />
        </div>
        <Button type="submit" disabled={busy || !ready} className="w-full">Update password</Button>
      </form>
    </div>
  );
}
