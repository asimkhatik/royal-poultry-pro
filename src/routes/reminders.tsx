import { createFileRoute, Navigate } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/lib/auth";
import { RemindersPage } from "@/features/RemindersPage";

export const Route = createFileRoute("/reminders")({
  component: () => {
    const { loading, session, role } = useAuth();
    if (loading) return null;
    if (!session) return <Navigate to="/auth" />;
    if (role !== "admin") return <Navigate to="/" />;
    return <AppShell><RemindersPage /></AppShell>;
  },
});
