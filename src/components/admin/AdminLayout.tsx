import { Outlet, useLocation, Navigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/contexts/AuthContext";
import { BrandingProvider } from "@/contexts/BrandingContext";
import {} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const KUNDE_BLOCKED_PATHS = [
  "/admin/brandings",
  "/admin/emails",
  "/admin/sms",
  "/admin/telegram",
  "/admin/kunden",
  "/admin/caller",
  "/admin/caller-zugaenge",
  "/admin/auftragsverteilung",
  "/admin/bd-status",
];

export default function AdminLayout() {
  const { allowedPaths, loading, hasAccess } = useAdminPermissions();
  const { isKunde, isCaller, loading: roleLoading } = useUserRole();
  const { user } = useAuth();
  const location = useLocation();

  if (loading || roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if ((isKunde || isCaller) && KUNDE_BLOCKED_PATHS.some((p) => location.pathname === p || location.pathname.startsWith(p + "/"))) {
    return <Navigate to="/admin" replace />;
  }

  if (location.pathname === "/admin" && !hasAccess("/admin")) {
    const firstAllowed = allowedPaths?.[0];
    if (firstAllowed) {
      return <Navigate to={firstAllowed} replace />;
    }
  }

  if (location.pathname !== "/admin" && !hasAccess(location.pathname)) {
    const firstAllowed = allowedPaths?.[0] ?? "/admin";
    return <Navigate to={firstAllowed} replace />;
  }

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "AD";

  return (
    <BrandingProvider>
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AdminSidebar />
          <div className="flex-1 flex flex-col">
            <header className="border-b border-border bg-card sticky top-0 z-50 h-16 flex items-center px-6 gap-4"
              style={{ boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.05)' }}>
              <SidebarTrigger />
              <div className="flex-1" />
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </header>
            <main className="flex-1 p-6">
              <Outlet />
            </main>
          </div>
        </div>
      </SidebarProvider>
    </BrandingProvider>
  );
}
