import { createFileRoute, Navigate } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/lib/auth";
import { CustomerDetailPage } from "@/features/CustomerDetailPage";

export const Route = createFileRoute("/customers/$id")({
  component: () => {
    const { id } = Route.useParams();
    const { loading, session, role } = useAuth();
    if (loading) return null;
    if (!session) return <Navigate to="/auth" />;
    if (role !== "admin") return <Navigate to="/" />;
    return <AppShell><CustomerDetailPage id={id} /></AppShell>;
  },
});
