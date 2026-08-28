import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { AdminDashboard } from "@/features/AdminDashboard";
import { CustomerDashboard } from "@/features/CustomerDashboard";
import { BrandLogo } from "@/components/BrandLogo";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { loading, session, role } = useAuth();

  if (loading || (session && !role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[oklch(0.18_0.05_155)] text-primary-foreground px-6">
        <div className="flex flex-col items-center gap-6 text-center animate-in fade-in duration-500">
          <div className="size-28 rounded-3xl overflow-hidden ring-2 ring-gold/40 shadow-gold bg-white/5 animate-pulse">
            <BrandLogo className="size-28 object-cover" />
          </div>
          <div>
            <div className="font-display text-3xl font-bold tracking-tight">ROYAL BROILER</div>
            <div className="text-xs text-gold tracking-[0.4em] mt-2">MANAGE • GROW • SUCCEED</div>
          </div>
          <div className="flex gap-1.5 mt-2">
            <span className="size-2 rounded-full bg-gold animate-bounce [animation-delay:-0.3s]" />
            <span className="size-2 rounded-full bg-gold animate-bounce [animation-delay:-0.15s]" />
            <span className="size-2 rounded-full bg-gold animate-bounce" />
          </div>
        </div>
      </div>
    );
  }
  if (!session) return <Navigate to="/auth" />;

  return <AppShell>{role === "admin" ? <AdminDashboard /> : <CustomerDashboard />}</AppShell>;
}
