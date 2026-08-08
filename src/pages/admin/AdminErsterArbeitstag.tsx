import { Fragment, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

import { Calendar, History, CheckCircle, XCircle, Search, Trash2, AlertTriangle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import BrandingNotes from "@/components/admin/BrandingNotes";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { format, addDays } from "date-fns";
import { toast } from "sonner";
import { useBrandingFilter } from "@/hooks/useBrandingFilter";

type ViewMode = "upcoming" | "past";

const dayLabel = (iso: string) => {
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const tomorrowStr = format(addDays(new Date(), 1), "yyyy-MM-dd");
  if (iso === todayStr) return "Heute";
  if (iso === tomorrowStr) return "Morgen";
  return new Date(iso + "T00:00:00").toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

interface ResolvedItem {
  item: any;
  firstName: string;
  lastName: string;
  displayEmail: string;
  displayPhone: string;
  employmentType: string;  // mutable for email-based fallback
  brandingName: string;
}

function resolveItemData(
  item: any,
  profilesMap: Map<string, any>,
  applicationsMap: Map<string, any>,
  templatesMap: Map<string, any>
): ResolvedItem {
  const ec = item.employment_contracts;
  const profile = ec?.user_id ? profilesMap.get(ec.user_id) : null;
  const app = ec?.application_id ? applicationsMap.get(ec.application_id) : null;
  const appFromItem = item.application_id ? applicationsMap.get(item.application_id) : null;
  const resolvedApp = app || appFromItem;

  const profileNameParts = profile?.full_name?.split(" ") || [];
  const firstName = ec?.first_name || profileNameParts[0] || resolvedApp?.first_name || "";
  const lastName = ec?.last_name || profileNameParts.slice(1).join(" ") || resolvedApp?.last_name || "";
  const displayEmail = ec?.email || profile?.email || resolvedApp?.email || "–";
  const displayPhone = ec?.phone || profile?.phone || resolvedApp?.phone || "";
  const template = ec?.template_id ? templatesMap.get(ec.template_id) : null;
  const employmentType = ec?.employment_type || resolvedApp?.employment_type || template?.employment_type || "–";
  const brandingName = ec?.brandings?.company_name || "–";

  return { item, firstName, lastName, displayEmail, displayPhone, employmentType, brandingName };
}

export default function AdminErsterArbeitstag() {
  const [viewMode, setViewMode] = useState<ViewMode>("upcoming");
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();
  const { activeBrandingId, ready } = useBrandingFilter();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [failTarget, setFailTarget] = useState<ResolvedItem | null>(null);
  const [failReason, setFailReason] = useState("");
  const [failSubmitting, setFailSubmitting] = useState(false);

  const now = new Date();
  const today = format(now, "yyyy-MM-dd");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["first-workday-appointments-admin", viewMode, activeBrandingId],
    enabled: ready,
    queryFn: async () => {
      const buildQuery = () => {
        let query = supabase
          .from("first_workday_appointments" as any)
          .select("*, employment_contracts:contract_id(id, first_name, last_name, email, phone, employment_type, branding_id, user_id, application_id, template_id, brandings:branding_id(id, company_name))");

        if (viewMode === "past") {
          query = query
            .lt("appointment_date", today)
            .order("appointment_date", { ascending: false })
            .order("appointment_time", { ascending: false });
        } else {
          query = query
            .gte("appointment_date", today)
            .order("appointment_date", { ascending: true })
            .order("appointment_time", { ascending: true });
        }
        return query;
      };

      // Alle Zeilen laden (Supabase-Limit von 1000 per Batch-Loop umgehen)
      const BATCH = 1000;
      let offset = 0;
      let items: any[] = [];
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { data: batch, error: mainErr } = await buildQuery().range(offset, offset + BATCH - 1);
        if (mainErr) throw mainErr;
        items = items.concat((batch as any[]) || []);
        if (!batch || (batch as any[]).length < BATCH) break;
        offset += BATCH;
      }

      // Filter by branding — left join means we filter client-side
      const rawItems = ((items || []) as any[]).filter((item: any) => {
        const ec = item.employment_contracts;
        return ec && ec.branding_id === activeBrandingId;
      });

      // Collect user_ids and application_ids for follow-up queries
      const userIds = new Set<string>();
      const applicationIds = new Set<string>();
      const templateIds = new Set<string>();

      for (const item of rawItems) {
        const ec = item.employment_contracts;
        if (ec?.user_id) userIds.add(ec.user_id);
        if (ec?.application_id) applicationIds.add(ec.application_id);
        if (ec?.template_id) templateIds.add(ec.template_id);
        if (item.application_id) applicationIds.add(item.application_id);
      }

      // Parallel follow-up queries
      const [profilesRes, applicationsRes, templatesRes] = await Promise.all([
        userIds.size > 0
          ? supabase.from("profiles").select("id, full_name, email, phone").in("id", Array.from(userIds))
          : { data: [] },
        applicationIds.size > 0
          ? supabase.from("applications").select("id, first_name, last_name, email, phone, employment_type").in("id", Array.from(applicationIds))
          : { data: [] },
        templateIds.size > 0
          ? supabase.from("contract_templates").select("id, employment_type").in("id", Array.from(templateIds))
          : { data: [] },
      ]);

      const profilesMap = new Map<string, any>();
      for (const p of (profilesRes.data || [])) profilesMap.set(p.id, p);

      const applicationsMap = new Map<string, any>();
      for (const a of (applicationsRes.data || [])) applicationsMap.set(a.id, a);

      const templatesMap = new Map<string, any>();
      for (const t of (templatesRes.data || [])) templatesMap.set(t.id, t);

      // First pass: resolve items to find which ones still lack employment_type
      const firstPass = rawItems.map((item: any) =>
        resolveItemData(item, profilesMap, applicationsMap, templatesMap)
      );

      // Collect emails where employmentType is still "–"
      const missingTypeEmails = new Set<string>();
      for (const r of firstPass) {
        if (r.employmentType === "–" && r.displayEmail && r.displayEmail !== "–") {
          missingTypeEmails.add(r.displayEmail);
        }
      }

      // Fourth follow-up: find employment_type from other contracts with same email
      let emailTypeMap = new Map<string, string>();
      if (missingTypeEmails.size > 0) {
        const { data: altContracts } = await supabase
          .from("employment_contracts")
          .select("email, employment_type")
          .in("email", Array.from(missingTypeEmails))
          .not("employment_type", "is", null)
          .eq("branding_id", activeBrandingId!);
        for (const c of (altContracts || [])) {
          if (c.email && c.employment_type) emailTypeMap.set(c.email, c.employment_type);
        }
      }

      return { items: rawItems, total: count || 0, profilesMap, applicationsMap, templatesMap, emailTypeMap };
    },
  });

  const totalPages = Math.ceil((data?.total || 0) / PAGE_SIZE);
  const profilesMap = data?.profilesMap ?? new Map();
  const applicationsMap = data?.applicationsMap ?? new Map();
  const templatesMap = data?.templatesMap ?? new Map();
  const emailTypeMap = data?.emailTypeMap ?? new Map();

  const handleStatusUpdate = async (item: any, newStatus: string) => {
    const { error } = await supabase.rpc("update_first_workday_status" as any, {
      _appointment_id: item.id,
      _status: newStatus,
    });
    if (error) {
      toast.error("Status konnte nicht aktualisiert werden.");
      return;
    }
    toast.success(`Status auf "${newStatus}" gesetzt.`);
    queryClient.invalidateQueries({ queryKey: ["first-workday-appointments-admin"] });
  };

  const toggleView = (mode: ViewMode) => {
    setViewMode((prev) => (prev === mode ? "upcoming" : mode));
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "erfolgreich":
        return <Badge className="bg-green-600 text-white border-green-600">Erfolgreich</Badge>;
      case "fehlgeschlagen":
        return <Badge variant="destructive">Fehlgeschlagen</Badge>;
      default:
        return <Badge variant="outline">Neu</Badge>;
    }
  };

  // Resolve all items
  const resolvedItems = (data?.items ?? []).map((item: any) => {
    const r = resolveItemData(item, profilesMap, applicationsMap, templatesMap);
    // Second pass: email-based fallback for employment_type
    if (r.employmentType === "–" && r.displayEmail && r.displayEmail !== "–") {
      const alt = emailTypeMap.get(r.displayEmail);
      if (alt) r.employmentType = alt;
    }
    return r;
  });

  const filteredItems = resolvedItems.filter((r) => {
    if (!search.trim()) return true;
    const name = `${r.firstName} ${r.lastName}`.toLowerCase();
    return name.includes(search.toLowerCase().trim());
  });

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">1. Arbeitstag-Termine</h2>
        <p className="text-muted-foreground mt-1">
          {viewMode === "upcoming" && "Alle anstehenden Termine ab heute."}
          {viewMode === "past" && "Vergangene Termine (bis gestern)."}
        </p>
      </motion.div>

      {activeBrandingId && <BrandingNotes brandingId={activeBrandingId} pageContext="erster-arbeitstag" />}

      <div className="flex gap-2 mb-4">
        <Button variant={viewMode === "past" ? "default" : "outline"} size="sm" onClick={() => toggleView("past")}>
          <History className="h-4 w-4 mr-1" /> Vergangene Termine
        </Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Name suchen..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        {isError ? (
          <div className="text-center py-12 border border-destructive/30 rounded-lg bg-destructive/5">
            <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-3" />
            <p className="text-destructive font-medium">Fehler beim Laden der Termine</p>
            <p className="text-muted-foreground text-sm mt-1">{(error as any)?.message || "Unbekannter Fehler"}</p>
          </div>
        ) : isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Laden...</div>
        ) : !filteredItems.length ? (
          <div className="text-center py-16 border border-dashed border-border rounded-lg">
            <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Keine 1. Arbeitstag-Termine in dieser Ansicht.</p>
          </div>
        ) : (
          <>
            <div className="premium-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Uhrzeit</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Telefon</TableHead>
                    <TableHead>E-Mail</TableHead>
                    <TableHead>Branding</TableHead>
                    <TableHead>Anstellungsart</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((r, i) => {
                    const showDayHeader = i === 0 || filteredItems[i - 1].item.appointment_date !== r.item.appointment_date;
                    return (
                    <Fragment key={r.item.id}>
                    {showDayHeader && (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={9} className="bg-muted/40 py-2">
                          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            {dayLabel(r.item.appointment_date)}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                    <TableRow>
                      <TableCell className="font-medium">
                        {new Date(r.item.appointment_date).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" })}
                      </TableCell>
                      <TableCell><Badge variant="outline">{r.item.appointment_time?.slice(0, 5)} Uhr</Badge></TableCell>
                      <TableCell className="font-medium">
                        {r.item.employment_contracts?.id ? (
                          <Link
                            to={`/admin/mitarbeiter/${r.item.employment_contracts.id}`}
                            className="text-foreground underline-offset-4 hover:text-primary hover:underline"
                          >
                            {r.firstName} {r.lastName}
                          </Link>
                        ) : (
                          `${r.firstName} ${r.lastName}`
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {r.displayPhone ? (
                          <span className="cursor-pointer hover:text-foreground transition-colors" onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(r.displayPhone); toast.success("Telefonnummer kopiert!"); }}>{r.displayPhone}</span>
                        ) : "–"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{r.displayEmail}</TableCell>
                      <TableCell className="text-muted-foreground">{r.brandingName}</TableCell>
                      <TableCell className="text-muted-foreground">{r.employmentType}</TableCell>
                      <TableCell>{statusBadge(r.item.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {r.item.status !== "erfolgreich" && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => handleStatusUpdate(r.item, "erfolgreich")} title="Als erfolgreich markieren">
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => {
                            setFailTarget(r);
                            setFailReason("");
                          }} title="Als fehlgeschlagen markieren">
                            <XCircle className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-red-50" onClick={() => setDeleteTarget({ id: r.item.id, name: `${r.firstName} ${r.lastName}` })} title="Termin löschen">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <p className="text-sm text-muted-foreground mt-4">{filteredItems.length} Termine</p>
          </>
        )}
      </motion.div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Termin löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Der 1. Arbeitstag-Termin von {deleteTarget?.name} wird unwiderruflich gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={async () => {
                const { error } = await supabase.from("first_workday_appointments" as any).delete().eq("id", deleteTarget!.id);
                if (error) { toast.error("Fehler beim Löschen."); }
                else { toast.success("Termin gelöscht."); queryClient.invalidateQueries({ queryKey: ["first-workday-appointments-admin"] }); }
                setDeleteTarget(null);
              }}
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!failTarget} onOpenChange={(v) => { if (!v) setFailTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grund für Fehlschlag</DialogTitle>
            <DialogDescription>
              Bitte gib einen Grund an, warum der 1. Arbeitstag von {failTarget?.firstName} {failTarget?.lastName} fehlgeschlagen ist.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Grund eingeben..."
            value={failReason}
            onChange={(e) => setFailReason(e.target.value)}
            className="min-h-[80px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setFailTarget(null)}>Abbrechen</Button>
            <Button
              variant="destructive"
              disabled={!failReason.trim() || failSubmitting}
              onClick={async () => {
                if (!failTarget || !failReason.trim()) return;
                setFailSubmitting(true);
                const name = `${failTarget.firstName} ${failTarget.lastName}`.trim();

                await handleStatusUpdate(failTarget.item, "fehlgeschlagen");

                const { data: userData } = await supabase.auth.getUser();
                const email = userData.user?.email ?? "System";
                await supabase.from("branding_notes" as any).insert({
                  branding_id: activeBrandingId,
                  page_context: "erster-arbeitstag",
                  content: `${name} — Fehlgeschlagen: ${failReason.trim()}`,
                  author_email: email,
                } as any);
                queryClient.invalidateQueries({ queryKey: ["branding-notes", activeBrandingId, "erster-arbeitstag"] });

                setFailTarget(null);
                setFailSubmitting(false);
              }}
            >
              Bestätigen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
