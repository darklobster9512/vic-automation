import { LayoutDashboard, ClipboardList, Star, LogOut, User, FileText, AlertTriangle, HelpCircle } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

interface MitarbeiterSidebarProps {
  branding: {
    logo_url: string | null;
    company_name: string;
    brand_color: string | null;
  } | null;
  brandingLoading: boolean;
  showContractLink: boolean;
  contractSubmittedAt: string | null;
}

const navItems = [
  { title: "Dashboard", url: "/mitarbeiter", icon: LayoutDashboard },
  { title: "Aufträge", url: "/mitarbeiter/auftraege", icon: ClipboardList },
  { title: "Bewertungen", url: "/mitarbeiter/bewertungen", icon: Star },
  { title: "Arbeitsvertrag", url: "/mitarbeiter/arbeitsvertrag", icon: FileText },
  { title: "Meine Daten", url: "/mitarbeiter/meine-daten", icon: User },
  { title: "FAQ", url: "/mitarbeiter/faq", icon: HelpCircle },
];

export function MitarbeiterSidebar({ branding, brandingLoading, showContractLink, contractSubmittedAt }: MitarbeiterSidebarProps) {
  const { user, signOut } = useAuth();
  const { isMobile, setOpenMobile } = useSidebar();

  const filteredNavItems = navItems.filter((item) => {
    if (item.url === "/mitarbeiter/arbeitsvertrag") {
      return showContractLink;
    }
    return true;
  });

  const userInitial = user?.email?.charAt(0).toUpperCase() || "?";

  const handleNavClick = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar className="border-r border-border/30 bg-white">
      {/* Logo */}
      <div className="py-7 px-5 border-b border-border/30 flex justify-center items-center">
        {branding?.logo_url ? (
          <img
            src={branding.logo_url}
            alt={branding.company_name}
            className="max-h-14 w-auto object-contain"
          />
        ) : (
          <span className="text-sm font-semibold text-foreground">
            {branding?.company_name || "Unbekannt"}
          </span>
        )}
      </div>

      {/* Navigation */}
      <SidebarContent className="pt-5 px-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {filteredNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      onClick={handleNavClick}
                      className="relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-150"
                      activeClassName="bg-primary text-white font-medium shadow-md"
                    >
                      <item.icon className="h-5 w-5" />
                      <span className="text-sm">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Contract reminder */}
      {!contractSubmittedAt && (
        <Link
          to="/mitarbeiter/arbeitsvertrag"
          onClick={handleNavClick}
          className="mx-3 mb-3 p-4 bg-primary/10 border border-primary/30 rounded-xl flex items-center gap-3 hover:bg-primary/20 transition-colors"
        >
          <AlertTriangle className="h-6 w-6 text-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-primary">Vertragsdaten ausfüllen</p>
            <p className="text-xs text-primary/70">Bitte vervollständigen</p>
          </div>
        </Link>
      )}

      {/* Footer */}
      <SidebarFooter className="border-t border-border/30 p-4">
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-3 px-1">
            <div className="w-8 h-8 rounded-full bg-primary/10 ring-2 ring-primary/20 flex items-center justify-center text-primary text-xs font-semibold shrink-0">
              {userInitial}
            </div>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors duration-150"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Abmelden
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
