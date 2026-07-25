import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ArrowLeft, CheckCircle, XCircle, ExternalLink, Maximize2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

const statusBadge = (status: string) => {
  switch (status) {
    case "genehmigt":
      return <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">Genehmigt</Badge>;
    case "abgelehnt":
      return <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50">Abgelehnt</Badge>;
    default:
      return <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50">Eingereicht</Badge>;
  }
};

/** After all attachments are approved, check if review is also done and auto-complete the order */
export async function tryAutoComplete(orderId: string, contractId: string) {
  // Load order to check required_attachments
  const { data: order } = await supabase
    .from("orders")
    .select("required_attachments, reward")
    .eq("id", orderId)
    .single();

  const requiredAttachments = (order as any)?.required_attachments ?? [];
  if (!Array.isArray(requiredAttachments) || requiredAttachments.length === 0) return;

  // Check if all attachments are approved
  const { data: attachments } = await supabase
    .from("order_attachments")
    .select("status")
    .eq("order_id", orderId)
    .eq("contract_id", contractId);

  const approvedCount = (attachments ?? []).filter((a) => a.status === "genehmigt").length;
  if (approvedCount < requiredAttachments.length) return;

  // Check current assignment status — only auto-complete if review was already approved (in_pruefung)
  const { data: assignment } = await supabase
    .from("order_assignments")
    .select("status")
    .eq("order_id", orderId)
    .eq("contract_id", contractId)
    .single();

  if ((assignment as any)?.status !== "in_pruefung") return;

  // All conditions met — mark as erfolgreich
  await supabase
    .from("order_assignments")
    .update({ status: "erfolgreich" })
    .eq("order_id", orderId)
    .eq("contract_id", contractId);

  // Credit reward
  const reward = parseFloat(((order as any)?.reward ?? "0").replace(/[^0-9.,]/g, "").replace(",", "."));
  if (reward > 0) {
    const { data: contract } = await supabase
      .from("employment_contracts")
      .select("balance")
      .eq("id", contractId)
      .single();

    const currentBalance = Number(contract?.balance ?? 0);
    await supabase
      .from("employment_contracts")
      .update({ balance: currentBalance + reward })
      .eq("id", contractId);
  }

  return true; // indicates auto-completed
}

export default function AdminAnhaengeDetail() {
  const { contractId, orderId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [fullscreenUrl, setFullscreenUrl] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-attachment-detail", contractId, orderId],
    enabled: !!contractId && !!orderId,
    queryFn: async () => {
      const [{ data: attachments, error }, { data: contract }, { data: order }] = await Promise.all([
        supabase
          .from("order_attachments" as any)
          .select("*")
          .eq("contract_id", contractId!)
          .eq("order_id", orderId!)
          .neq("status", "entwurf")
          .order("attachment_index", { ascending: true }),
        supabase
          .from("employment_contracts")
          .select("first_name, last_name")
          .eq("id", contractId!)
          .single(),
        supabase
          .from("orders")
          .select("title, required_attachments")
          .eq("id", orderId!)
          .single(),
      ]);
      if (error) throw error;
      const employeeName = `${(contract as any)?.first_name ?? ""} ${(contract as any)?.last_name ?? ""}`.trim() || "Unbekannt";
      return {
        attachments: (attachments ?? []) as any[],
        employeeName,
        orderTitle: (order as any)?.title ?? "–",
        requiredAttachments: (order as any)?.required_attachments ?? [],
      };
    },
  });

  const bulkApproveMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        const { error } = await supabase
          .from("order_attachments" as any)
          .update({ status: "genehmigt", reviewed_at: new Date().toISOString() } as any)
          .eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["admin-attachment-detail"] });
      queryClient.invalidateQueries({ queryKey: ["admin-order-attachments-grouped"] });

      const completed = await tryAutoComplete(orderId!, contractId!);
      if (completed) {
        queryClient.invalidateQueries({ queryKey: ["admin-bewertungen"] });
        toast({ title: "Alle Anhänge genehmigt — Auftrag abgeschlossen und Prämie gutgeschrieben!" });
      } else {
        toast({ title: "Alle Anhänge genehmigt" });
      }
    },
    onError: (e: Error) => {
      toast({ title: "Fehler", description: e.message, variant: "destructive" });
    },
  });

  const bulkRejectMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        const { error } = await supabase
          .from("order_attachments" as any)
          .update({ status: "abgelehnt", reviewed_at: new Date().toISOString() } as any)
          .eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-attachment-detail"] });
      queryClient.invalidateQueries({ queryKey: ["admin-order-attachments-grouped"] });
      toast({ title: "Alle Anhänge abgelehnt" });
    },
    onError: (e: Error) => {
      toast({ title: "Fehler", description: e.message, variant: "destructive" });
    },
  });

  const getAttachmentLabel = (index: number) => {
    const reqAtt = data?.requiredAttachments;
    if (Array.isArray(reqAtt) && reqAtt[index]) {
      const item = reqAtt[index];
      return typeof item === "string" ? item : (item as any)?.title ?? (item as any)?.label ?? `Anhang ${index + 1}`;
    }
    return `Anhang ${index + 1}`;
  };

  const isImage = (url: string) => /\.(png|jpe?g|gif|webp)$/i.test(url);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/anhaenge")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Anhänge — {data?.employeeName ?? "..."}
          </h2>
          <p className="text-muted-foreground text-sm">{data?.orderTitle}</p>
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Laden...</p>
      ) : !data?.attachments.length ? (
        <p className="text-muted-foreground">Keine Anhänge vorhanden.</p>
      ) : (
        <>
          {(() => {
            const pendingIds = data.attachments.filter((a: any) => a.status === "eingereicht").map((a: any) => a.id);
            if (pendingIds.length === 0) return null;
            return (
              <div className="flex justify-end gap-2 mb-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive border-destructive/30 hover:bg-destructive/5 rounded-xl"
                  disabled={bulkRejectMutation.isPending || bulkApproveMutation.isPending}
                  onClick={() => bulkRejectMutation.mutate(pendingIds)}
                >
                  <XCircle className="h-4 w-4 mr-1.5" />
                  Alle ablehnen ({pendingIds.length})
                </Button>
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white rounded-xl"
                  disabled={bulkApproveMutation.isPending || bulkRejectMutation.isPending}
                  onClick={() => bulkApproveMutation.mutate(pendingIds)}
                >
                  <CheckCircle className="h-4 w-4 mr-1.5" />
                  Alle genehmigen ({pendingIds.length})
                </Button>
              </div>
            );
          })()}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.attachments.map((a: any) => (
            <Card key={a.id} className="overflow-hidden">
              <div className="relative aspect-square bg-muted flex items-center justify-center overflow-hidden">
                {isImage(a.file_url) ? (
                  <>
                    <img src={a.file_url} alt={a.file_name} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setFullscreenUrl(a.file_url)}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 hover:bg-black/75 text-white transition-colors"
                      aria-label="Vollbild anzeigen"
                    >
                      <Maximize2 className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <a href={a.file_url} target="_blank" rel="noopener noreferrer"
                    className="text-primary hover:underline flex flex-col items-center gap-2 p-4 text-center">
                    <ExternalLink className="h-8 w-8" />
                    <span className="text-sm">{a.file_name || "Datei öffnen"}</span>
                  </a>
                )}
              </div>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{getAttachmentLabel(a.attachment_index)}</span>
                  {statusBadge(a.status)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(a.created_at), "dd.MM.yyyy HH:mm")}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
        </>
      )}

      <Dialog open={!!fullscreenUrl} onOpenChange={(open) => !open && setFullscreenUrl(null)}>
        <DialogContent className="max-w-[95vw] w-[95vw] max-h-[95vh] p-0 bg-black/95 border-0 flex items-center justify-center">
          {fullscreenUrl && (
            <img src={fullscreenUrl} alt="Vollbild" className="max-w-full max-h-[95vh] object-contain" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
