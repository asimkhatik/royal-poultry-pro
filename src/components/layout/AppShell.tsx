import { Link, useRouterState } from "@tanstack/react-router";
import { type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { useT, type Lang } from "@/lib/i18n";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  Receipt,
  Wallet,
  BarChart3,
  LogOut,
  Moon,
  Sun,
  Languages,
  Crown,
  UserCircle,
  Bell,

import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const adminNav = [
  { to: "/", key: "dashboard", icon: LayoutDashboard },
  { to: "/customers", key: "customers", icon: Users },
  { to: "/sales", key: "sales", icon: Receipt },
  { to: "/payments", key: "payments", icon: Wallet },
  { to: "/reports", key: "reports", icon: BarChart3 },
] as const;

const customerNav = [
  { to: "/", key: "myAccount", icon: UserCircle },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { role, profile, signOut } = useAuth();
  const { t, lang, setLang } = useT();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("rb-theme");
    if (saved === "dark") {
      document.documentElement.classList.add("dark");
      setDark(true);
    }
  }, []);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("rb-theme", next ? "dark" : "light");
  };

  const nav = role === "admin" ? adminNav : customerNav;
  const langs: { code: Lang; label: string }[] = [
    { code: "en", label: "English" },
    { code: "hi", label: "हिंदी" },
    { code: "mr", label: "मराठी" },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background lg:flex-row">
      {/* Sidebar (desktop) */}
      <aside className="hidden lg:flex w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-2xl overflow-hidden ring-1 ring-gold/40 shadow-gold bg-white/5">
              <BrandLogo className="size-12 object-cover" />
            </div>
            <div>
              <div className="font-display text-lg font-bold tracking-tight">ROYAL</div>
              <div className="text-xs text-gold -mt-1 tracking-widest">BROILER</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <Icon className="size-4" />
                {t(item.key)}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-sidebar-border space-y-2">
          <div className="text-xs text-sidebar-foreground/60 px-2">
            {profile?.full_name || profile?.email}
            <div className="text-gold/90 uppercase text-[10px] tracking-wider mt-0.5">{role}</div>
          </div>
          <Button
            onClick={signOut}
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="size-4 mr-2" /> {t("signOut")}
          </Button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-40 royal-gradient text-primary-foreground border-b border-sidebar-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="size-10 rounded-xl overflow-hidden ring-1 ring-gold/40 bg-white/5">
              <BrandLogo className="size-10 object-cover" />
            </div>
            <div>
              <div className="font-display font-bold text-sm tracking-tight">ROYAL BROILER</div>
              <div className="text-[10px] text-gold tracking-widest">{role?.toUpperCase()}</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="text-primary-foreground hover:bg-white/10">
                  <Languages className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {langs.map((l) => (
                  <DropdownMenuItem key={l.code} onClick={() => setLang(l.code)}>
                    {l.label} {lang === l.code && "✓"}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="icon" variant="ghost" onClick={toggleDark} className="text-primary-foreground hover:bg-white/10">
              {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
            <Button size="icon" variant="ghost" onClick={signOut} className="text-primary-foreground hover:bg-white/10">
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Desktop top toolbar */}
      <div className="hidden lg:flex items-center justify-end gap-2 px-6 py-3 border-b border-border bg-card">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost">
              <Languages className="size-4 mr-2" /> {langs.find((l) => l.code === lang)?.label}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {langs.map((l) => (
              <DropdownMenuItem key={l.code} onClick={() => setLang(l.code)}>
                {l.label} {lang === l.code && "✓"}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button size="icon" variant="ghost" onClick={toggleDark}>
          {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>
      </div>

      <main className="flex-1 min-w-0">
        <div className="p-4 md:p-6 lg:p-8 pb-24 lg:pb-8 max-w-7xl mx-auto w-full">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-sidebar text-sidebar-foreground border-t border-sidebar-border">
        <div className="grid grid-cols-5">
          {nav.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const active = pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] ${
                  active ? "text-gold" : "text-sidebar-foreground/70"
                }`}
              >
                <Icon className="size-5" />
                {t(item.key)}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
