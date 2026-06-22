import { createFileRoute, Navigate } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/lib/auth";
import { ReportsPage } from "@/features/ReportsPage";

export const Route = createFileRoute("/reports")({
  component: () => {
    const { loading, session, role } = useAuth();
    if (loading) return null;
    if (!session) return <Navigate to="/auth" />;
    if (role !== "admin") return <Navigate to="/" />;
    return <AppShell><ReportsPage /></AppShell>;
  },
});
