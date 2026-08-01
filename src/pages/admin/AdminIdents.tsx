import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBrandingFilter } from "@/hooks/useBrandingFilter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Video, Clock, User, MessageSquare, Hourglass, Search, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface IdentSession {
  id: string;
  order_id: string;
  contract_id: string;
  assignment_id: string;
  status: string;
  phone_api_url: string | null;
  test_data: Array<{ label: string; value: string }>;
  created_at: string;
  updated_at: string;
  branding_id: string | null;
}

interface PendingIdent {
  assignment_id: string;
  contract_id: string;
  order_id: string;
  contract_first_name: string;
  contract_last_name: string;
  order_title: string;
  branding_id: string | null;
}

export default function AdminIdents() {
  const { activeBrandingId } = useBrandingFilter();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [archiveOpen, setArchiveOpen] = useState(false);

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["ident-sessions", activeBrandingId],
    enabled: !!activeBrandingId,
    refetchInterval: 10000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ident_sessions" as any)
        .select("*")
        .eq("branding_id", activeBrandingId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as IdentSession[];
    },
  });

  // Query for pending idents: assignments to videochat orders without an ident_session
  const { data: pendingIdents = [] } = useQuery({
    queryKey: ["pending-idents", activeBrandingId, sessions],
    enabled: !!activeBrandingId,
    queryFn: async () => {
      // Get all videochat assignments for this branding
      const { data: assignments, error: aErr } = await supabase
        .from("order_assignments")
        .select("id, contract_id, order_id, employment_contracts!inner(first_name, last_name, branding_id), orders!inner(title, is_videochat)")
        .eq("orders.is_videochat", true)
        .eq("employment_contracts.branding_id", activeBrandingId!);
      if (aErr) throw aErr;
      if (!assignments?.length) return [];

      // Filter out assignments that already have an ident_session
      const existingAssignmentIds = new Set(sessions.map(s => s.assignment_id).filter(Boolean));
      
      return (assignments as any[])
        .filter(a => !existingAssignmentIds.has(a.id))
        .map(a => ({
          assignment_id: a.id,
          contract_id: a.contract_id,
          order_id: a.order_id,
          contract_first_name: a.employment_contracts?.first_name || "",
          contract_last_name: a.employment_contracts?.last_name || "",
          order_title: a.orders?.title || "",
          branding_id: activeBrandingId,
        })) as PendingIdent[];
    },
  });

  useEffect(() => {
    if (!activeBrandingId) return;
    const channel = supabase
      .channel("admin-ident-sessions")
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "ident_sessions", filter: `branding_id=eq.${activeBrandingId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["ident-sessions", activeBrandingId] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeBrandingId, queryClient]);

  const contractIds = [...new Set(sessions.map(s => s.contract_id))];
  const { data: contracts = [] } = useQuery({
    queryKey: ["ident-contracts", contractIds],
    enabled: contractIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("employment_contracts")
        .select("id, first_name, last_name")
        .in("id", contractIds);
      return data ?? [];
    },
  });

  const orderIds = [...new Set(sessions.map(s => s.order_id))];
  const { data: orders = [] } = useQuery({
    queryKey: ["ident-orders", orderIds],
    enabled: orderIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("id, title").in("id", orderIds);
      return data ?? [];
    },
  });

  const getContractName = (contractId: string) => {
    const c = contracts.find(c => c.id === contractId);
    return c ? `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Unbekannt" : "...";
  };

  const getOrderTitle = (orderId: string) => {
    const o = orders.find(o => o.id === orderId);
    return o?.title ?? "...";
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "waiting": return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Wartet</Badge>;
      case "data_sent": return <Badge className="gap-1 bg-blue-500"><MessageSquare className="h-3 w-3" /> Daten gesendet</Badge>;
      case "completed": return <Badge className="gap-1 bg-green-500">Abgeschlossen</Badge>;
      case "cancelled": return <Badge variant="destructive" className="gap-1">Abgebrochen</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleCreatePendingSession = async (pending: PendingIdent) => {
    if (creatingId) return;
    setCreatingId(pending.assignment_id);
    try {
      const { data, error } = await supabase
        .from("ident_sessions")
        .insert({
          contract_id: pending.contract_id,
          order_id: pending.order_id,
          assignment_id: pending.assignment_id,
          branding_id: pending.branding_id,
          status: "waiting",
        })
        .select("id")
        .single();
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["ident-sessions", activeBrandingId] });
      queryClient.invalidateQueries({ queryKey: ["pending-idents", activeBrandingId] });
      navigate(`/admin/idents/${data.id}`);
    } catch (e: any) {
      toast.error("Fehler beim Erstellen der Ident-Session");
      console.error(e);
    } finally {
      setCreatingId(null);
    }
  };

  const searchLower = search.trim().toLowerCase();
  const matchSession = (s: IdentSession) => !searchLower || getContractName(s.contract_id).toLowerCase().includes(searchLower);
  const matchPending = (p: PendingIdent) => !searchLower || `${p.contract_first_name} ${p.contract_last_name}`.toLowerCase().includes(searchLower);

  const activeSessions = sessions.filter(s => (s.status === "waiting" || s.status === "data_sent") && matchSession(s));
  const filteredPendingIdents = pendingIdents.filter(matchPending);
  const completedSessions = sessions.filter(s => (s.status === "completed" || s.status === "cancelled") && matchSession(s));
  const hasAnyContent = sessions.length > 0 || pendingIdents.length > 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Idents</h2>
        <div className="grid gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Idents</h2>
          <p className="text-sm text-muted-foreground">Video-Chat Verifizierungen verwalten</p>
        </div>
        {activeSessions.length > 0 && (
          <Badge variant="secondary" className="text-sm gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            {activeSessions.length} aktiv
          </Badge>
        )}
      </div>

      {hasAnyContent && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Name suchen..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      )}

      {!hasAnyContent ? (
        <Card className="border-dashed border-2">
          <CardContent className="py-16 text-center">
            <Video className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">Keine Ident-Sessions vorhanden.</p>
            <p className="text-xs text-muted-foreground mt-1">Sessions werden automatisch erstellt, wenn Mitarbeiter einen Video-Chat starten.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {activeSessions.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Aktiv</h3>
              <div className="grid gap-3">
                {activeSessions.map(session => (
                  <Card
                    key={session.id}
                    className="border border-border/60 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => navigate(`/admin/idents/${session.id}`)}
                  >
                    <CardContent className="py-4 flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{getContractName(session.contract_id)}</p>
                        <p className="text-xs text-muted-foreground truncate">{getOrderTitle(session.order_id)}</p>
                      </div>
                      <div className="text-right shrink-0 space-y-1">
                        {statusBadge(session.status)}
                        <p className="text-[10px] text-muted-foreground">{format(new Date(session.created_at), "dd.MM.yyyy HH:mm")}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {filteredPendingIdents.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Ausstehend</h3>
              <div className="grid gap-3">
                {filteredPendingIdents.map(pending => (
                  <Card
                    key={pending.assignment_id}
                    className="border border-dashed border-border/60 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleCreatePendingSession(pending)}
                  >
                    <CardContent className="py-4 flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <Hourglass className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {`${pending.contract_first_name} ${pending.contract_last_name}`.trim() || "Unbekannt"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{pending.order_title}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <Badge variant="outline" className="gap-1 text-muted-foreground">
                          <Hourglass className="h-3 w-3" />
                          {creatingId === pending.assignment_id ? "Erstelle..." : "Ausstehend"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {completedSessions.length > 0 && (
            <Collapsible open={archiveOpen} onOpenChange={setArchiveOpen} className="space-y-3">
              <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider hover:bg-muted/50 transition-colors">
                <ChevronRight className={`h-4 w-4 transition-transform ${archiveOpen ? "rotate-90" : ""}`} />
                Archiv
                <Badge variant="secondary" className="ml-auto normal-case tracking-normal">{completedSessions.length}</Badge>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Tabs defaultValue="completed" className="space-y-3">
                  <TabsList>
                    <TabsTrigger value="completed">Abgeschlossen ({doneSessions.length})</TabsTrigger>
                    <TabsTrigger value="cancelled">Abgebrochen ({cancelledSessions.length})</TabsTrigger>
                  </TabsList>
                  {([["completed", doneSessions], ["cancelled", cancelledSessions]] as const).map(([value, list]) => (
                    <TabsContent key={value} value={value} className="space-y-3">
                      {list.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-6 text-center">Keine Einträge.</p>
                      ) : (
                        <div className="grid gap-3">
                          {list.map(session => (
                            <Card
                              key={session.id}
                              className="border border-border/60 opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
                              onClick={() => navigate(`/admin/idents/${session.id}`)}
                            >
                              <CardContent className="py-3 flex items-center gap-4">
                                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                                  <User className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">{getContractName(session.contract_id)}</p>
                                  <p className="text-xs text-muted-foreground truncate">{getOrderTitle(session.order_id)}</p>
                                </div>
                                <div className="text-right shrink-0">
                                  {statusBadge(session.status)}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  ))}
                </Tabs>
              </CollapsibleContent>
            </Collapsible>
          )}

        </div>
      )}
    </div>
  );
}
