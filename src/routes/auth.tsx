import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — ROYAL BROILER" },
      { name: "description", content: "Sign in to manage your poultry business or view your customer account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) navigate({ to: "/", replace: true });
  }, [loading, session, navigate]);

  const [busy, setBusy] = useState(false);
  const [showReset, setShowReset] = useState(false);

  // Sign in
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPwd, setSignInPwd] = useState("");

  // Sign up
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPwd, setSuPwd] = useState("");

  // reset
  const [resetEmail, setResetEmail] = useState("");

  const onSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: signInEmail, password: signInPwd });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back!");
    navigate({ to: "/", replace: true });
  };

  const onSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: suEmail,
      password: suPwd,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: name, phone },
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Account created. You can sign in now.");
  };

  const onReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Reset link sent. Check your inbox.");
    setShowReset(false);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Brand side */}
      <div className="royal-gradient text-primary-foreground lg:w-1/2 px-8 py-12 lg:py-0 lg:flex lg:items-center">
        <div className="max-w-md mx-auto lg:mx-0 lg:ml-auto lg:pr-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="size-14 rounded-2xl gold-gradient flex items-center justify-center shadow-gold">
              <Crown className="size-7 text-gold-foreground" />
            </div>
            <div>
              <div className="font-display font-bold text-2xl tracking-tight">ROYAL</div>
              <div className="text-sm text-gold tracking-[0.3em] -mt-1">BROILER</div>
            </div>
          </div>
          <h1 className="font-display text-4xl lg:text-5xl font-bold leading-tight">
            Run your poultry business like royalty.
          </h1>
          <p className="mt-4 text-primary-foreground/80 text-base lg:text-lg">
            Daily sales entry, customer ledgers, automatic balance tracking, professional invoices —
            all in one secure cloud-powered app.
          </p>
          <ul className="mt-8 space-y-2 text-sm text-primary-foreground/70">
            <li>• Auto-calculated balances on every sale & payment</li>
            <li>• PDF invoices & WhatsApp sharing</li>
            <li>• Multi-language (English, हिंदी, मराठी)</li>
            <li>• Bank-grade security with role-based access</li>
          </ul>
        </div>
      </div>

      {/* Form side */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 lg:p-12 bg-background">
        <div className="w-full max-w-sm">
          {showReset ? (
            <form onSubmit={onReset} className="space-y-4">
              <h2 className="font-display text-2xl font-bold">Reset password</h2>
              <div className="space-y-1.5">
                <Label htmlFor="re">Email</Label>
                <Input id="re" type="email" required value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} />
              </div>
              <Button type="submit" disabled={busy} className="w-full">Send reset link</Button>
              <button type="button" onClick={() => setShowReset(false)} className="text-sm text-muted-foreground hover:text-foreground w-full">
                Back to sign in
              </button>
            </form>
          ) : (
            <Tabs defaultValue="signin">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Sign up</TabsTrigger>
              </TabsList>
              <TabsContent value="signin">
                <form onSubmit={onSignIn} className="space-y-4 mt-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="si-email">Email</Label>
                    <Input id="si-email" type="email" required value={signInEmail} onChange={(e) => setSignInEmail(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="si-pwd">Password</Label>
                    <Input id="si-pwd" type="password" required value={signInPwd} onChange={(e) => setSignInPwd(e.target.value)} />
                  </div>
                  <Button type="submit" disabled={busy} className="w-full">Sign in</Button>
                  <button type="button" onClick={() => setShowReset(true)} className="text-sm text-muted-foreground hover:text-foreground w-full text-center">
                    Forgot password?
                  </button>
                </form>
              </TabsContent>
              <TabsContent value="signup">
                <form onSubmit={onSignUp} className="space-y-4 mt-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="su-name">Full name</Label>
                    <Input id="su-name" required value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="su-phone">Mobile number</Label>
                    <Input id="su-phone" required value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="su-email">Email</Label>
                    <Input id="su-email" type="email" required value={suEmail} onChange={(e) => setSuEmail(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="su-pwd">Password</Label>
                    <Input id="su-pwd" type="password" required minLength={6} value={suPwd} onChange={(e) => setSuPwd(e.target.value)} />
                  </div>
                  <Button type="submit" disabled={busy} className="w-full">Create account</Button>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}
