import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AtSign, Mail, Lock, Phone, User, Fingerprint } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { signInWithIdentifier } from "@/lib/auth-resolve.functions";
import {
  biometricAvailable,
  enableBiometric,
  isBiometricEnabled,
  isNative,
  loginWithBiometric,
} from "@/lib/biometric";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

  const [signInId, setSignInId] = useState("");
  const [signInPwd, setSignInPwd] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suAddress, setSuAddress] = useState("");
  const [suPwd, setSuPwd] = useState("");

  const [resetEmail, setResetEmail] = useState("");

  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioEnabled, setBioEnabled] = useState(false);
  const [bioLabel, setBioLabel] = useState("Fingerprint");

  useEffect(() => {
    (async () => {
      const info = await biometricAvailable();
      setBioAvailable(info.available);
      setBioLabel(info.label);
      setBioEnabled(await isBiometricEnabled());
    })();
  }, []);

  const onBiometricLogin = async () => {
    setBusy(true);
    try {
      await loginWithBiometric();
      toast.success("Authentication Successful. Welcome back!");
      navigate({ to: "/", replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Biometric login failed");
    } finally {
      setBusy(false);
    }
  };

  const signInFn = useServerFn(signInWithIdentifier);

  const [showBioPrompt, setShowBioPrompt] = useState(false);

  const finishSignIn = async () => {
    if (isNative() && bioAvailable && !bioEnabled) {
      setShowBioPrompt(true);
      return;
    }
    navigate({ to: "/", replace: true });
  };

  const onSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { access_token, refresh_token } = await signInFn({
        data: { identifier: signInId, password: signInPwd },
      });
      const { error } = await supabase.auth.setSession({ access_token, refresh_token });
      if (error) throw error;
      toast.success("Welcome back!");
      await finishSignIn();
    } catch {
      toast.error("Invalid credentials");
    } finally {
      setBusy(false);
    }
  };

  const onEnableBioPrompt = async () => {
    try {
      await enableBiometric();
      setBioEnabled(true);
      toast.success(`${bioLabel} login enabled`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to enable");
    } finally {
      setShowBioPrompt(false);
      navigate({ to: "/", replace: true });
    }
  };

  const onSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: suEmail,
      password: suPwd,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: name, phone, address: suAddress },
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Account created! Awaiting admin approval before you can access your account.");
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
    <div className="relative min-h-screen overflow-hidden bg-[#0B1A14] text-primary-foreground">
      {/* Soft ambient glows */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 size-[28rem] rounded-full bg-[oklch(0.55_0.12_155)] opacity-30 blur-3xl" />
        <div className="absolute top-1/3 -right-24 size-[22rem] rounded-full bg-[oklch(0.78_0.16_85)] opacity-20 blur-3xl" />
        <div className="absolute -bottom-24 left-1/4 size-[20rem] rounded-full bg-[oklch(0.40_0.10_155)] opacity-25 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-12">
        {/* Brand lockup */}
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-6">
            <div className="absolute inset-0 rounded-3xl bg-gold/20 blur-xl" />
            <div className="relative size-20 rounded-2xl overflow-hidden ring-1 ring-gold/40 shadow-gold bg-[#0F2E24]">
              <BrandLogo className="size-20 object-cover" />
            </div>
          </div>

          <h1 className="font-display text-2xl font-bold tracking-tight">ROYAL BROILER</h1>
          <p className="mt-1 text-sm text-gold tracking-[0.3em] uppercase font-medium">Manage • Grow • Succeed</p>

          <p className="mt-6 text-2xl sm:text-3xl font-semibold leading-snug tracking-tight">
            Every Bird Counted.
            <span className="block text-gold mt-0.5">Every Rupee Tracked.</span>
          </p>

          <p className="mt-3 text-sm text-primary-foreground/60 max-w-xs leading-relaxed">
            Smart poultry business management for modern broiler farms.
          </p>
        </div>

        {/* Glass card */}
        <div className="w-full mt-10">
          <div className="rounded-3xl bg-white/[0.07] p-6 sm:p-8 ring-1 ring-white/15 shadow-[0_24px_64px_-20px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
            {showReset ? (
              <form onSubmit={onReset} className="space-y-5">
                <div>
                  <h2 className="font-display text-xl font-bold">Reset password</h2>
                  <p className="mt-1 text-sm text-primary-foreground/60">
                    We’ll email you a secure link.
                  </p>
                </div>
                <GlassField id="re" label="Email" icon={Mail} type="email" required value={resetEmail} onChange={(v) => setResetEmail(v)} placeholder="you@example.com" />
                <Button type="submit" disabled={busy} className="w-full h-11 gold-gradient text-gold-foreground hover:opacity-95 shadow-gold font-semibold">
                  Send reset link
                </Button>
                <button type="button" onClick={() => setShowReset(false)} className="block w-full text-center text-sm text-primary-foreground/60 hover:text-primary-foreground transition-colors">
                  Back to sign in
                </button>
              </form>
            ) : (
              <Tabs defaultValue="signin">
                <div className="mb-6 text-center">
                  <h2 className="font-display text-xl font-bold">Welcome</h2>
                  <p className="mt-1 text-sm text-primary-foreground/60">
                    Sign in to continue
                  </p>
                </div>
                <TabsList className="w-full grid grid-cols-2 bg-white/[0.06] ring-1 ring-white/10 backdrop-blur rounded-xl">
                  <TabsTrigger value="signin" className="data-[state=active]:bg-white/[0.10] data-[state=active]:text-primary-foreground data-[state=active]:shadow-none text-primary-foreground/60 rounded-lg">
                    Sign in
                  </TabsTrigger>
                  <TabsTrigger value="signup" className="data-[state=active]:bg-white/[0.10] data-[state=active]:text-primary-foreground data-[state=active]:shadow-none text-primary-foreground/60 rounded-lg">
                    Sign up
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="signin">
                  <form onSubmit={onSignIn} className="space-y-4 mt-6">
                    <GlassField id="si-id" label="Email or mobile number" icon={AtSign} type="text" required value={signInId} onChange={setSignInId} placeholder="you@example.com or 9xxxxxxxxx" autoComplete="username" />
                    <GlassField id="si-pwd" label="Password" icon={Lock} type="password" required value={signInPwd} onChange={setSignInPwd} placeholder="••••••••" autoComplete="current-password" />
                    <Button type="submit" disabled={busy} className="w-full h-11 gold-gradient text-gold-foreground hover:opacity-95 shadow-gold font-semibold">
                      {busy ? "Signing in..." : "Sign in"}
                    </Button>
                    <button type="button" onClick={() => setShowReset(true)} className="block w-full text-center text-sm text-primary-foreground/60 hover:text-gold transition-colors">
                      Forgot password?
                    </button>
                  </form>

                  {bioAvailable && bioEnabled && (
                    <div className="mt-6 pt-6 border-t border-white/10 flex flex-col items-center">
                      <button
                        type="button"
                        onClick={onBiometricLogin}
                        disabled={busy}
                        className="group flex flex-col items-center gap-2 focus:outline-none disabled:opacity-50"
                      >
                        <span className="relative flex size-20 items-center justify-center rounded-full bg-gold/10 ring-2 ring-gold/40 transition-all group-hover:bg-gold/20 group-active:scale-95">
                          <span className="absolute inset-0 rounded-full bg-gold/20 blur-lg animate-pulse" />
                          <Fingerprint className="relative size-10 text-gold" />
                        </span>
                        <span className="text-sm font-medium text-primary-foreground/80">
                          Tap to Login with {bioLabel}
                        </span>
                      </button>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="signup">
                  <form onSubmit={onSignUp} className="space-y-4 mt-6">
                    <GlassField id="su-name" label="Full name" icon={User} required value={name} onChange={setName} placeholder="Your name" />
                    <GlassField id="su-phone" label="Mobile number" icon={Phone} required value={phone} onChange={setPhone} placeholder="+91 9xxxxxxxxx" />
                    <GlassField id="su-email" label="Email" icon={Mail} type="email" required value={suEmail} onChange={setSuEmail} placeholder="you@example.com" />
                    <GlassField id="su-addr" label="Address" icon={Home} value={suAddress} onChange={setSuAddress} placeholder="Shop / delivery address" />
                    <GlassField id="su-pwd" label="Password" icon={Lock} type="password" required minLength={6} value={suPwd} onChange={setSuPwd} placeholder="At least 6 characters" />
                    <Button type="submit" disabled={busy} className="w-full h-11 gold-gradient text-gold-foreground hover:opacity-95 shadow-gold font-semibold">
                      {busy ? "Creating account..." : "Create account"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-primary-foreground/40">
          Trusted by poultry businesses. Built for growth.
        </p>
      </div>

      <AlertDialog open={showBioPrompt} onOpenChange={setShowBioPrompt}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Fingerprint className="size-5 text-gold" />
              Enable Biometric Login?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Sign in faster next time using {bioLabel}. Your password is never stored on the device.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setShowBioPrompt(false); navigate({ to: "/", replace: true }); }}>
              Not Now
            </AlertDialogCancel>
            <AlertDialogAction onClick={onEnableBioPrompt}>Enable</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function GlassField({
  id, label, icon: Icon, type = "text", required, minLength, value, onChange, placeholder, autoComplete,
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
  autoComplete?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-primary-foreground/70 text-xs uppercase tracking-wider font-medium">{label}</Label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-primary-foreground/40" />
        <Input
          id={id}
          type={type}
          required={required}
          minLength={minLength}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="h-11 pl-10 bg-white/[0.06] border-white/10 text-primary-foreground placeholder:text-primary-foreground/35 focus-visible:ring-gold focus-visible:border-gold/50 backdrop-blur rounded-xl transition-colors"
        />
      </div>
    </div>
  );
}
