import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Users, ClipboardList, Paperclip, Video } from "lucide-react";
import { format } from "date-fns";
import { useBrandingFilter } from "@/hooks/useBrandingFilter";
import { Link } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type StatusKey =
  | "bewertung_genehmigt"
  | "bewertung_pruefung"
  | "fehlgeschlagen"
  | "anhaenge_abgelehnt"
  | "anhaenge_eingereicht"
  | "warte_anhaenge"
  | "ident_abgeschlossen"
  | "ident_laeuft"
  | "ident_abgebrochen"
  | "offen";

const STATUS_META: Record<StatusKey, { label: string; className: string }> = {
  bewertung_genehmigt: { label: "Bewertung genehmigt", className: "text-green-700 border-green-300 bg-green-50" },
  bewertung_pruefung: { label: "Bewertung in Prüfung", className: "text-amber-700 border-amber-300 bg-amber-50" },
  fehlgeschlagen: { label: "Fehlgeschlagen", className: "text-red-700 border-red-300 bg-red-50" },
  anhaenge_abgelehnt: { label: "Anhänge abgelehnt", className: "text-red-700 border-red-300 bg-red-50" },
  anhaenge_eingereicht: { label: "Anhänge eingereicht", className: "text-blue-700 border-blue-300 bg-blue-50" },
  warte_anhaenge: { label: "Warte auf Anhänge", className: "text-orange-700 border-orange-300 bg-orange-50" },
  ident_abgeschlossen: { label: "Ident abgeschlossen", className: "text-emerald-700 border-emerald-300 bg-emerald-50" },
  ident_laeuft: { label: "Ident läuft", className: "text-indigo-700 border-indigo-300 bg-indigo-50" },
  ident_abgebrochen: { label: "Ident abgebrochen", className: "text-slate-600 border-slate-300 bg-slate-50" },
  offen: { label: "Offen", className: "text-muted-foreground border-border bg-muted/40" },
};

const TYPE_LABEL: Record<string, string> = { bankdrop: "Bankdrop", exchanger: "Exchanger" };

async function fetchAllIn<T>(
  table: string,
  select: string,
  column: string,
  values: string[]
): Promise<T[]> {
  const out: T[] = [];
  const chunkSize = 200;
  for (let i = 0; i < values.length; i += chunkSize) {
    const chunk = values.slice(i, i + chunkSize);
    let from = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { data, error } = await supabase
        .from(table as any)
        .select(select)
        .in(column, chunk)
        .range(from, from + 999);
      if (error) throw error;
      const rows = (data ?? []) as unknown as T[];
      out.push(...rows);
      if (rows.length < 1000) break;
      from += 1000;
    }
  }
  return out;
}

function deriveStatus(row: {
  assignmentStatus: string;
  attachmentStatuses: string[];
  requiredCount: number;
  identStatuses: string[];
}): StatusKey {
  if (row.assignmentStatus === "erfolgreich") return "bewertung_genehmigt";
  if (row.assignmentStatus === "in_pruefung") return "bewertung_pruefung";
  if (row.assignmentStatus === "fehlgeschlagen") return "fehlgeschlagen";

  if (row.attachmentStatuses.includes("abgelehnt")) return "anhaenge_abgelehnt";
  if (row.attachmentStatuses.includes("eingereicht")) return "anhaenge_eingereicht";

  const approved = row.attachmentStatuses.filter((s) => s === "genehmigt").length;
  if (row.requiredCount > 0 && approved < row.requiredCount) return "warte_anhaenge";

  if (row.identStatuses.includes("completed")) return "ident_abgeschlossen";
  if (row.identStatuses.some((s) => s === "waiting" || s === "data_sent")) return "ident_laeuft";
  if (row.identStatuses.includes("cancelled")) return "ident_abgebrochen";

  return "offen";
}

export default function AdminBdStatus() {
  const { activeBrandingId, ready } = useBrandingFilter();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-bd-status", activeBrandingId],
    enabled: ready,
    queryFn: async () => {
      const { data: orders, error: oErr } = await supabase
        .from("orders")
        .select("id, title, order_type, required_attachments, order_number")
        .eq("branding_id", activeBrandingId!)
        .in("order_type", ["bankdrop", "exchanger"]);
      if (oErr) throw oErr;
      const orderList = orders ?? [];
      if (!orderList.length) return [];
      const orderMap = new Map(orderList.map((o: any) => [o.id, o]));
      const orderIds = orderList.map((o: any) => o.id);

      const assignments = await fetchAllIn<any>(
        "order_assignments",
        "id, order_id, contract_id, status, assigned_at, review_unlocked",
        "order_id",
        orderIds
      );
      if (!assignments.length) return [];

      const contractIds = Array.from(new Set(assignments.map((a) => a.contract_id)));
      const contracts = await fetchAllIn<any>(
        "employment_contracts",
        "id, first_name, last_name, is_suspended, branding_id",
        "id",
        contractIds
      );
      const contractMap = new Map(
        contracts
          .filter((c) => !c.is_suspended)
          .map((c) => [c.id, c])
      );

      const relevant = assignments.filter((a) => contractMap.has(a.contract_id));
      if (!relevant.length) return [];

      const relevantContractIds = Array.from(new Set(relevant.map((a) => a.contract_id)));

      const attachments = await fetchAllIn<any>(
        "order_attachments",
        "order_id, contract_id, status",
        "contract_id",
        relevantContractIds
      );
      const idents = await fetchAllIn<any>(
        "ident_sessions",
        "order_id, contract_id, status",
        "contract_id",
        relevantContractIds
      );

      const attMap = new Map<string, string[]>();
      for (const a of attachments) {
        const key = `${a.contract_id}__${a.order_id}`;
        if (!attMap.has(key)) attMap.set(key, []);
        attMap.get(key)!.push(a.status);
      }
      const identMap = new Map<string, string[]>();
      for (const s of idents) {
        const key = `${s.contract_id}__${s.order_id}`;
        if (!identMap.has(key)) identMap.set(key, []);
        identMap.get(key)!.push(s.status);
      }

      const rows = relevant.map((a) => {
        const order: any = orderMap.get(a.order_id);
        const contract: any = contractMap.get(a.contract_id);
        const key = `${a.contract_id}__${a.order_id}`;
        const attachmentStatuses = attMap.get(key) ?? [];
        const identStatuses = identMap.get(key) ?? [];
        const reqAtt = order?.required_attachments;
        const requiredCount = Array.isArray(reqAtt) ? reqAtt.length : 0;
        const status = deriveStatus({
          assignmentStatus: a.status,
          attachmentStatuses,
          requiredCount,
          identStatuses,
        });
        return {
          assignment_id: a.id,
          contract_id: a.contract_id,
          order_id: a.order_id,
          employee_name: `${contract?.first_name ?? ""} ${contract?.last_name ?? ""}`.trim() || "Ohne Namen",
          order_title: order?.title ?? "–",
          order_type: order?.order_type ?? "",
          assigned_at: a.assigned_at,
          review_unlocked: !!a.review_unlocked,
          approved_count: attachmentStatuses.filter((s) => s === "genehmigt").length,
          submitted_count: attachmentStatuses.filter((s) => s === "eingereicht").length,
          required_count: requiredCount,
          status,
        };
      });

      rows.sort((a, b) => (a.assigned_at < b.assigned_at ? 1 : -1));
      return rows;
    },
  });

  const rows = data ?? [];
  const searchLower = search.trim().toLowerCase();

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (typeFilter !== "all" && r.order_type !== typeFilter) return false;
        if (statusFilter !== "all" && r.status !== statusFilter) return false;
        if (
          searchLower &&
          !r.employee_name.toLowerCase().includes(searchLower) &&
          !r.order_title.toLowerCase().includes(searchLower)
        )
          return false;
        return true;
      }),
    [rows, typeFilter, statusFilter, searchLower]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, { contract_id: string; name: string; items: typeof filtered }>();
    for (const r of filtered) {
      if (!map.has(r.contract_id)) {
        map.set(r.contract_id, { contract_id: r.contract_id, name: r.employee_name, items: [] as any });
      }
      map.get(r.contract_id)!.items.push(r);
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [filtered]);

  const stats = {
    employees: grouped.length,
    assignments: filtered.length,
    openAttachments: filtered.filter((r) => r.status === "anhaenge_eingereicht" || r.status === "warte_anhaenge").length,
    runningIdents: filtered.filter((r) => r.status === "ident_laeuft").length,
  };

  const initials = (name: string) =>
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">BD Status</h2>
        <p className="text-muted-foreground mt-1">
          Alle aktiven Mitarbeiter mit Bankdrop- und Exchanger-Aufträgen inklusive Bearbeitungsstand.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Mitarbeiter", value: stats.employees, icon: Users },
          { label: "Zuweisungen", value: stats.assignments, icon: ClipboardList },
          { label: "Offene Anhänge", value: stats.openAttachments, icon: Paperclip },
          { label: "Laufende Idents", value: stats.runningIdents, icon: Video },
        ].map((s) => (
          <div key={s.label} className="premium-card p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <s.icon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xl font-bold leading-none">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Mitarbeiter oder Auftrag suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Tabs value={typeFilter} onValueChange={setTypeFilter}>
          <TabsList>
            <TabsTrigger value="all">Alle</TabsTrigger>
            <TabsTrigger value="bankdrop">Bankdrop</TabsTrigger>
            <TabsTrigger value="exchanger">Exchanger</TabsTrigger>
          </TabsList>
        </Tabs>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Alle Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            {(Object.keys(STATUS_META) as StatusKey[]).map((k) => (
              <SelectItem key={k} value={k}>
                {STATUS_META[k].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="premium-card p-8 text-center text-muted-foreground">Laden...</div>
      ) : !grouped.length ? (
        <div className="premium-card p-8 text-center text-muted-foreground">
          Keine Bankdrop- oder Exchanger-Zuweisungen gefunden.
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map((g) => (
            <div key={g.contract_id} className="premium-card p-5">
              <div className="flex items-center gap-3 mb-4">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    {initials(g.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/admin/mitarbeiter/${g.contract_id}`}
                    className="font-semibold hover:underline truncate block"
                  >
                    {g.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {g.items.length} {g.items.length === 1 ? "Auftrag" : "Aufträge"}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {g.items.map((r) => (
                  <div
                    key={r.assignment_id}
                    className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 rounded-xl border border-border/70 px-4 py-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{r.order_title}</span>
                        <Badge variant="secondary" className="text-[10px]">
                          {TYPE_LABEL[r.order_type] ?? r.order_type}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Zugewiesen am {format(new Date(r.assigned_at), "dd.MM.yyyy HH:mm")} Uhr
                        {r.required_count > 0 && (
                          <> · Anhänge {r.approved_count}/{r.required_count} genehmigt
                            {r.submitted_count > 0 && <> ({r.submitted_count} offen)</>}
                          </>
                        )}
                        {r.review_unlocked && <> · Bewertung freigeschaltet</>}
                      </p>
                    </div>
                    <Badge variant="outline" className={STATUS_META[r.status].className}>
                      {STATUS_META[r.status].label}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
