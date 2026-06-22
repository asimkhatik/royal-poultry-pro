import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { AdminDashboard } from "@/features/AdminDashboard";
import { CustomerDashboard } from "@/features/CustomerDashboard";
import { Crown } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { loading, session, role } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Crown className="size-5 text-gold animate-pulse" /> Loading…
        </div>
      </div>
    );
  }
  if (!session) return <Navigate to="/auth" />;

  return <AppShell>{role === "admin" ? <AdminDashboard /> : <CustomerDashboard />}</AppShell>;
}
