import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mail, Lock, Phone, User } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
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
      { name: "description", content: "Sign in to ROYAL BROILER to manage your poultry business or view your customer account." },
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

  const [signInEmail, setSignInEmail] = useState("");
  const [signInPwd, setSignInPwd] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPwd, setSuPwd] = useState("");

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
    <div className="relative min-h-screen overflow-hidden bg-[oklch(0.18_0.05_155)] text-primary-foreground">
      {/* Aurora background */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-32 size-[28rem] rounded-full bg-[oklch(0.40_0.10_155)] opacity-50 blur-3xl" />
        <div className="absolute top-1/3 -right-40 size-[32rem] rounded-full bg-[oklch(0.78_0.18_85)] opacity-30 blur-3xl" />
        <div className="absolute -bottom-40 left-1/4 size-[26rem] rounded-full bg-[oklch(0.55_0.20_300)] opacity-25 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col lg:flex-row">
        {/* Brand side */}
        <div className="flex flex-1 items-center px-6 pt-10 pb-4 lg:px-10 lg:py-16">
          <div className="w-full max-w-md mx-auto lg:mx-0">
            <div className="flex flex-col items-center lg:items-start mb-8">
              <div className="size-24 rounded-3xl overflow-hidden ring-2 ring-gold/40 shadow-gold bg-white/5 mb-4">
                <BrandLogo className="size-24 object-cover" />
              </div>
              <div className="text-center lg:text-left">
                <div className="font-display font-bold text-2xl tracking-tight">ROYAL BROILER</div>
                <div className="text-xs text-gold tracking-[0.4em] mt-1">MANAGE • GROW • SUCCEED</div>
              </div>
            </div>

            <h1 className="font-display text-4xl lg:text-5xl font-bold leading-[1.05] tracking-tight">
              Welcome to
              <span className="block bg-gradient-to-r from-[oklch(0.92_0.12_85)] via-[oklch(0.82_0.16_75)] to-[oklch(0.95_0.05_85)] bg-clip-text text-transparent">
                ROYAL BROILER
              </span>
            </h1>

            <p className="mt-5 text-base lg:text-lg text-primary-foreground/75 leading-relaxed">
              Manage • Grow • Succeed — your complete poultry business workspace
              for daily sales, customer ledgers, and professional invoices.
            </p>

            <ul className="mt-8 space-y-3 text-sm">
              {[
                { icon: Sparkles, text: "Auto-calculated balances on every sale & payment" },
                { icon: ShieldCheck, text: "Bank-grade security with role-based access" },
                { icon: Crown, text: "Premium PDF invoices & WhatsApp sharing" },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-3 text-primary-foreground/85">
                  <span className="mt-0.5 grid size-7 place-items-center rounded-lg bg-white/10 ring-1 ring-white/15 backdrop-blur">
                    <Icon className="size-3.5 text-gold" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>

            <p className="mt-10 hidden lg:block text-xs text-primary-foreground/50">
              Stay signed in across all your devices — securely.
            </p>
          </div>
        </div>

        {/* Form side — glass card */}
        <div className="flex flex-1 items-center justify-center px-4 pb-10 pt-2 lg:px-10 lg:py-16">
          <div className="w-full max-w-md">
            <div className="rounded-3xl bg-white/10 p-6 sm:p-8 ring-1 ring-white/20 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
              {showReset ? (
                <form onSubmit={onReset} className="space-y-5">
                  <div>
                    <h2 className="font-display text-2xl font-bold">Reset password</h2>
                    <p className="mt-1 text-sm text-primary-foreground/70">
                      We'll email you a secure link.
                    </p>
                  </div>
                  <GlassField id="re" label="Email" icon={Mail} type="email" required value={resetEmail} onChange={(v) => setResetEmail(v)} placeholder="you@example.com" />
                  <Button type="submit" disabled={busy} className="w-full h-11 gold-gradient text-gold-foreground hover:opacity-95 shadow-gold font-semibold">
                    Send reset link
                  </Button>
                  <button type="button" onClick={() => setShowReset(false)} className="block w-full text-center text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                    Back to sign in
                  </button>
                </form>
              ) : (
                <Tabs defaultValue="signin">
                  <div className="mb-5">
                    <h2 className="font-display text-2xl font-bold">Welcome</h2>
                    <p className="mt-1 text-sm text-primary-foreground/70">
                      Sign in or create your ROYAL BROILER account.
                    </p>
                  </div>
                  <TabsList className="w-full grid grid-cols-2 bg-white/10 ring-1 ring-white/15 backdrop-blur">
                    <TabsTrigger value="signin" className="data-[state=active]:bg-white/15 data-[state=active]:text-primary-foreground data-[state=active]:shadow-none text-primary-foreground/70">
                      Sign in
                    </TabsTrigger>
                    <TabsTrigger value="signup" className="data-[state=active]:bg-white/15 data-[state=active]:text-primary-foreground data-[state=active]:shadow-none text-primary-foreground/70">
                      Sign up
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="signin">
                    <form onSubmit={onSignIn} className="space-y-4 mt-5">
                      <GlassField id="si-email" label="Email" icon={Mail} type="email" required value={signInEmail} onChange={setSignInEmail} placeholder="you@example.com" />
                      <GlassField id="si-pwd" label="Password" icon={Lock} type="password" required value={signInPwd} onChange={setSignInPwd} placeholder="••••••••" />
                      <Button type="submit" disabled={busy} className="w-full h-11 gold-gradient text-gold-foreground hover:opacity-95 shadow-gold font-semibold">
                        {busy ? "Signing in..." : "Sign in"}
                      </Button>
                      <button type="button" onClick={() => setShowReset(true)} className="block w-full text-center text-sm text-primary-foreground/70 hover:text-gold transition-colors">
                        Forgot password?
                      </button>
                      <p className="text-center text-xs text-primary-foreground/50 pt-1">
                        You'll stay signed in on this device.
                      </p>
                    </form>
                  </TabsContent>

                  <TabsContent value="signup">
                    <form onSubmit={onSignUp} className="space-y-4 mt-5">
                      <GlassField id="su-name" label="Full name" icon={User} required value={name} onChange={setName} placeholder="Your name" />
                      <GlassField id="su-phone" label="Mobile number" icon={Phone} required value={phone} onChange={setPhone} placeholder="+91 9xxxxxxxxx" />
                      <GlassField id="su-email" label="Email" icon={Mail} type="email" required value={suEmail} onChange={setSuEmail} placeholder="you@example.com" />
                      <GlassField id="su-pwd" label="Password" icon={Lock} type="password" required minLength={6} value={suPwd} onChange={setSuPwd} placeholder="At least 6 characters" />
                      <Button type="submit" disabled={busy} className="w-full h-11 gold-gradient text-gold-foreground hover:opacity-95 shadow-gold font-semibold">
                        {busy ? "Creating account..." : "Create account"}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              )}
            </div>

            <p className="mt-5 text-center text-xs text-primary-foreground/55">
              By continuing, you agree to ROYAL BROILER's terms & privacy policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function GlassField({
  id, label, icon: Icon, type = "text", required, minLength, value, onChange, placeholder,
}: {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  type?: string;
  required?: boolean;
  minLength?: number;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-primary-foreground/85 text-xs uppercase tracking-wider">{label}</Label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-primary-foreground/50" />
        <Input
          id={id}
          type={type}
          required={required}
          minLength={minLength}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-11 pl-10 bg-white/10 border-white/15 text-primary-foreground placeholder:text-primary-foreground/40 focus-visible:ring-gold focus-visible:border-gold/50 backdrop-blur"
        />
      </div>
    </div>
  );
}
