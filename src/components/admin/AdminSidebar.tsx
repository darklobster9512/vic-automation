import { LayoutDashboard, Palette, FileText, Calendar, FileCheck, LogOut, Users, ClipboardList, MessageCircle, Star, Mail, Smartphone, Send, Clock, Phone, MessageSquareText, UserPlus, History, Building2, ChevronsUpDown, Paperclip, Video, ScrollText, Briefcase, KeyRound, Banknote, BarChart3 } from "lucide-react";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { useUserRole } from "@/hooks/useUserRole";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { useBranding } from "@/contexts/BrandingContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const KUNDE_HIDDEN_PATHS = [
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

const navGroups = [
  {
    label: null,
    items: [
      { title: "Übersicht", url: "/admin", icon: LayoutDashboard },
      { title: "Statistiken", url: "/admin/statistiken", icon: BarChart3 },
    ],
  },
  {
    label: "Recruiting",
    items: [
      { title: "Bewerbungen", url: "/admin/bewerbungen", icon: FileText },
      { title: "Bewerbungsgespräche", url: "/admin/bewerbungsgespraeche", icon: Calendar },
      { title: "Probetage", url: "/admin/probetag", icon: Building2 },
      { title: "1. Arbeitstag", url: "/admin/erster-arbeitstag", icon: Briefcase },
      { title: "Arbeitsverträge", url: "/admin/arbeitsvertraege", icon: FileCheck },
    ],
  },
  {
    label: "Betrieb",
    items: [
      { title: "Mitarbeiter", url: "/admin/mitarbeiter", icon: Users },
      { title: "Aufträge", url: "/admin/auftraege", icon: ClipboardList },
      { title: "Auftragsverteilung", url: "/admin/auftragsverteilung", icon: ClipboardList },
      { title: "BD Status", url: "/admin/bd-status", icon: Banknote },
      { title: "Idents", url: "/admin/idents", icon: Video },
      { title: "Livechat", url: "/admin/livechat", icon: MessageCircle },
      { title: "Bewertungen", url: "/admin/bewertungen", icon: Star },
      { title: "Anhänge", url: "/admin/anhaenge", icon: Paperclip },
      { title: "Telefonnummern", url: "/admin/telefonnummern", icon: Phone },
      { title: "SMS Spoof", url: "/admin/sms-spoof", icon: MessageSquareText },
    ],
  },
  {
    label: "Einstellungen",
    items: [
      { title: "Brandings", url: "/admin/brandings", icon: Palette },
      { title: "E-Mails", url: "/admin/emails", icon: Mail },
      { title: "SMS", url: "/admin/sms", icon: Smartphone },
      { title: "SMS History", url: "/admin/sms-history", icon: History },
      { title: "Telegram", url: "/admin/telegram", icon: Send },
      { title: "Vertragsvorlagen", url: "/admin/vertragsvorlagen", icon: ScrollText },
      { title: "Livechat", url: "/admin/livechat-einstellungen", icon: MessageCircle },
      { title: "Zeitplan", url: "/admin/zeitplan", icon: Clock },
      { title: "Kunden", url: "/admin/kunden", icon: UserPlus },
      { title: "Caller", url: "/admin/caller", icon: Phone },
      { title: "Caller-Zugänge", url: "/admin/caller-zugaenge", icon: KeyRound },
    ],
  },
];

export function AdminSidebar() {
  const { user, signOut } = useAuth();
  const { hasAccess, loading: permissionsLoading } = useAdminPermissions();
  const { isKunde, isCaller } = useUserRole();
  const { brandings, activeBrandingId, setActiveBrandingId } = useBranding();
  const [brandingOpen, setBrandingOpen] = useState(false);

  const activeBranding = brandings.find((b) => b.id === activeBrandingId);

  // --- Badge counts (filtered by activeBrandingId) ---

  const { data: neuCount } = useQuery({
    queryKey: ["badge-bewerbungen-neu", activeBrandingId],
    enabled: !!activeBrandingId,
    queryFn: async () => {
      const { count } = await supabase.from("applications").select("*", { count: "exact", head: true }).eq("status", "neu").eq("branding_id", activeBrandingId!);
      return count ?? 0;
    },
    refetchInterval: 30000,
  });

  const { data: todayCount } = useQuery({
    queryKey: ["badge-gespraeche-heute", activeBrandingId],
    enabled: !!activeBrandingId,
    queryFn: async () => {
      const now = new Date();
      const today = format(now, "yyyy-MM-dd");
      const nowTime = format(now, "HH:mm:ss");
      const { count } = await supabase.from("interview_appointments").select("*, applications!inner(branding_id)", { count: "exact", head: true }).eq("appointment_date", today).gte("appointment_time", nowTime).eq("applications.branding_id", activeBrandingId!);
      return count ?? 0;
    },
    refetchInterval: 30000,
  });

  const { data: eingereichtCount } = useQuery({
    queryKey: ["badge-vertraege-eingereicht", activeBrandingId],
    enabled: !!activeBrandingId,
    queryFn: async () => {
      const { count } = await supabase.from("employment_contracts").select("*", { count: "exact", head: true }).eq("status", "eingereicht").eq("branding_id", activeBrandingId!);
      return count ?? 0;
    },
    refetchInterval: 30000,
  });

  const { data: chatUnreadCount } = useQuery({
    queryKey: ["badge-chat-unread", activeBrandingId],
    enabled: !!activeBrandingId,
    queryFn: async () => {
      // Get contract IDs for active branding
      const { data: contracts } = await supabase
        .from("employment_contracts")
        .select("id")
        .eq("branding_id", activeBrandingId!);
      const contractIds = (contracts ?? []).map((c) => c.id);
      if (!contractIds.length) return 0;
      let total = 0;
      for (let i = 0; i < contractIds.length; i += 100) {
        const { count } = await supabase.from("chat_messages").select("*", { count: "exact", head: true }).eq("sender_role", "user").eq("read", false).in("contract_id", contractIds.slice(i, i + 100));
        total += count ?? 0;
      }
      return total;

    },
    refetchInterval: 10000,
  });

  const { data: inPruefungCount } = useQuery({
    queryKey: ["badge-bewertungen-pruefung", activeBrandingId],
    enabled: !!activeBrandingId,
    queryFn: async () => {
      // Get contract IDs for active branding, then count in_pruefung assignments
      const { data: contracts } = await supabase.from("employment_contracts").select("id").eq("branding_id", activeBrandingId!);
      const contractIds = (contracts ?? []).map((c) => c.id);
      if (!contractIds.length) return 0;
      let total = 0;
      for (let i = 0; i < contractIds.length; i += 100) {
        const { count } = await supabase.from("order_assignments").select("*", { count: "exact", head: true }).eq("status", "in_pruefung").in("contract_id", contractIds.slice(i, i + 100));
        total += count ?? 0;
      }
      return total;

    },
    refetchInterval: 30000,
  });

  const { data: probetagTodayCount } = useQuery({
    queryKey: ["badge-probetag-heute", activeBrandingId],
    enabled: !!activeBrandingId,
    queryFn: async () => {
      const now = new Date();
      const today = format(now, "yyyy-MM-dd");
      const nowTime = format(now, "HH:mm:ss");
      const { count } = await supabase.from("trial_day_appointments" as any).select("*, applications!inner(branding_id)", { count: "exact", head: true }).eq("appointment_date", today).gte("appointment_time", nowTime).eq("applications.branding_id", activeBrandingId!);
      return count ?? 0;
    },
    refetchInterval: 30000,
  });

  const { data: firstWorkdayTodayCount } = useQuery({
    queryKey: ["badge-erster-arbeitstag-heute", activeBrandingId],
    enabled: !!activeBrandingId,
    queryFn: async () => {
      const now = new Date();
      const today = format(now, "yyyy-MM-dd");
      const nowTime = format(now, "HH:mm:ss");
      const { count } = await supabase.from("first_workday_appointments").select("*, employment_contracts!inner(branding_id)", { count: "exact", head: true }).eq("appointment_date", today).gte("appointment_time", nowTime).eq("employment_contracts.branding_id", activeBrandingId!);
      return count ?? 0;
    },
    refetchInterval: 30000,
  });

  const { data: identWaitingCount } = useQuery({
    queryKey: ["badge-idents-waiting", activeBrandingId],
    enabled: !!activeBrandingId,
    queryFn: async () => {
      const { count } = await supabase
        .from("ident_sessions" as any)
        .select("*", { count: "exact", head: true })
        .eq("status", "waiting")
        .eq("branding_id", activeBrandingId!);
      return count ?? 0;
    },
    refetchInterval: 10000,
  });

  const { data: anhaengeEingereichtCount } = useQuery({
    queryKey: ["badge-anhaenge-eingereicht", activeBrandingId],
    enabled: !!activeBrandingId,
    queryFn: async () => {
      const { data: contracts } = await supabase
        .from("employment_contracts")
        .select("id")
        .eq("branding_id", activeBrandingId!);
      const contractIds = (contracts ?? []).map((c) => c.id);
      if (!contractIds.length) return 0;
      // IDs chunken, damit die Request-URL nicht zu lang wird (400 Bad Request)
      const groups = new Set<string>();
      for (let i = 0; i < contractIds.length; i += 100) {
        const { data } = await supabase
          .from("order_attachments")
          .select("contract_id, order_id")
          .eq("status", "eingereicht")
          .in("contract_id", contractIds.slice(i, i + 100));
        for (const a of (data ?? []) as any[]) groups.add(`${a.contract_id}__${a.order_id}`);
      }
      return groups.size;

    },
    refetchInterval: 30000,
  });

  const badgeCounts: Record<string, number> = {
    "/admin/bewerbungen": neuCount ?? 0,
    "/admin/bewerbungsgespraeche": todayCount ?? 0,
    "/admin/probetag": probetagTodayCount ?? 0,
    "/admin/erster-arbeitstag": firstWorkdayTodayCount ?? 0,
    "/admin/arbeitsvertraege": eingereichtCount ?? 0,
    "/admin/idents": identWaitingCount ?? 0,
    "/admin/anhaenge": anhaengeEingereichtCount ?? 0,
    "/admin/livechat": chatUnreadCount ?? 0,
    "/admin/bewertungen": inPruefungCount ?? 0,
  };

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "AD";

  return (
    <Sidebar className="border-r-0">
      <SidebarContent className="bg-[hsl(var(--sidebar-background))] px-3 pt-2">
        {/* Brand */}
        <div className="px-3 py-5 mb-1">
          <h2 className="text-lg font-bold tracking-tight text-white">
            Vic <span className="text-[hsl(var(--sidebar-primary))]">{isCaller ? "Caller" : isKunde ? "Kunde" : "Admin"}</span>
          </h2>
          <p className="text-[11px] text-[hsl(var(--sidebar-foreground))] mt-0.5 opacity-60">Kontrollpanel</p>
        </div>

        {/* Branding Switcher */}
        {brandings.length > 0 && (
          <div className="px-2 mb-3">
            <Popover open={brandingOpen} onOpenChange={setBrandingOpen}>
              <PopoverTrigger asChild>
                <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[hsl(var(--sidebar-muted))] hover:bg-[hsl(var(--sidebar-muted))]/80 transition-colors text-left">
                  {activeBranding?.logo_url ? (
                    <img src={activeBranding.logo_url} alt="" className="h-6 w-6 rounded object-contain bg-white shrink-0" />
                  ) : (
                    <div className="h-6 w-6 rounded bg-[hsl(var(--sidebar-primary))] flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                      {activeBranding?.company_name?.charAt(0) ?? "?"}
                    </div>
                  )}
                  <span className="flex-1 text-sm font-medium text-white truncate">
                    {activeBranding?.company_name ?? "Branding wählen"}
                  </span>
                  <ChevronsUpDown className="h-4 w-4 text-[hsl(var(--sidebar-foreground))] opacity-50 shrink-0" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-1" align="start" side="bottom">
                {brandings.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      setActiveBrandingId(b.id);
                      setBrandingOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                      b.id === activeBrandingId
                        ? "bg-primary text-primary-foreground font-medium"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    {b.logo_url ? (
                      <img src={b.logo_url} alt="" className="h-5 w-5 rounded object-contain bg-white shrink-0" />
                    ) : (
                      <div className="h-5 w-5 rounded bg-muted flex items-center justify-center text-[9px] font-bold shrink-0">
                        {b.company_name?.charAt(0)}
                      </div>
                    )}
                    <span className="truncate">{b.company_name}</span>
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          </div>
        )}

        {!permissionsLoading && navGroups.map((group, groupIndex) => {
          const visibleItems = group.items.filter((item) => {
            if (!hasAccess(item.url)) return false;
            if (isKunde && KUNDE_HIDDEN_PATHS.includes(item.url)) return false;
            if (isCaller && KUNDE_HIDDEN_PATHS.includes(item.url)) return false;
            return true;
          });
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.label ?? "overview"}>
              {groupIndex > 0 && (
                <div className="mx-3 my-3 border-t border-[hsl(var(--sidebar-border))]" />
              )}
              <SidebarGroup>
                {group.label && (
                  <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[hsl(var(--sidebar-foreground))] opacity-50 px-3 mb-1">
                    {group.label}
                  </SidebarGroupLabel>
                )}
                <SidebarGroupContent>
                  <SidebarMenu>
                    {visibleItems.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild>
                          <NavLink
                            to={item.url}
                            end
                            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-muted))] transition-all duration-150"
                            activeClassName="!bg-[hsl(var(--sidebar-primary))] !text-white font-medium shadow-md shadow-[hsl(var(--sidebar-primary))]/25"
                          >
                            <item.icon className="h-4 w-4 shrink-0" />
                            <span className="flex-1 truncate">{item.title}</span>
                            {badgeCounts[item.url] > 0 && (
                              <span className="ml-auto text-[10px] font-bold min-w-[1.25rem] h-5 flex items-center justify-center rounded-full bg-destructive text-white px-1.5">
                                {badgeCounts[item.url]}
                              </span>
                            )}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </div>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="bg-[hsl(var(--sidebar-background))] border-t border-[hsl(var(--sidebar-border))] p-4">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarFallback className="bg-[hsl(var(--sidebar-primary))] text-white text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <p className="text-xs text-[hsl(var(--sidebar-foreground))] truncate flex-1">{user?.email}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full border-[hsl(var(--sidebar-border))] text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-muted))] hover:text-white bg-transparent"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Abmelden
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
