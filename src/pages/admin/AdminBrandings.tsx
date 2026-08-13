import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Palette, Trash2, Copy, Pencil, Megaphone } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useBrandingFilter } from "@/hooks/useBrandingFilter";
import { useState } from "react";
import DomainAnnouncementDialog from "@/components/admin/DomainAnnouncementDialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export default function AdminBrandings() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeBrandingId, ready } = useBrandingFilter();
  const [announceBrandingId, setAnnounceBrandingId] = useState<string | null>(null);

  const { data: brandings, isLoading } = useQuery({
    queryKey: ["brandings", activeBrandingId],
    enabled: ready,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brandings")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("brandings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brandings"] });
      toast.success("Branding gelöscht");
    },
    onError: () => toast.error("Fehler beim Löschen"),
  });

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8"
      >
        <div className="flex items-center gap-6 mb-4">
          <img src="/fortellogo.png" alt="for.tel" className="h-10 object-contain" />
          <img src="/limexlogo.png" alt="limex" className="h-10 object-contain" />
          <img src="/vonalogo.png" alt="VONA" className="h-10 object-contain" />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Brandings</h2>
            <p className="text-muted-foreground mt-1">Verwalten Sie alle Ihre Landingpage-Brandings.</p>
          </div>
          <Button onClick={() => navigate("/admin/brandings/neu")}>
            <Plus className="h-4 w-4 mr-2" />
            Branding hinzufügen
          </Button>
        </div>
      </motion.div>


      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Laden...</div>
        ) : !brandings?.length ? (
          <div className="text-center py-16 border border-dashed border-border rounded-lg">
            <Palette className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">Noch keine Brandings vorhanden.</p>
            <Button variant="outline" onClick={() => navigate("/admin/brandings/neu")}>
              <Plus className="h-4 w-4 mr-2" />
              Erstes Branding hinzufügen
            </Button>
          </div>
        ) : (
          <div className="premium-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Logo</TableHead>
                  <TableHead>Unternehmen</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Farbe</TableHead>
                  <TableHead>Erstellt</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {brandings.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <code className="text-xs text-muted-foreground">{b.id.slice(0, 8)}</code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => {
                            navigator.clipboard.writeText(b.id);
                            toast.success("ID kopiert");
                          }}
                        >
                          <Copy className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      {b.logo_url ? (
                        <img src={b.logo_url} alt="Logo" className="h-8 w-8 rounded object-contain" />
                      ) : (
                        <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                          <Palette className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{b.company_name}</TableCell>
                    <TableCell className="text-muted-foreground">{b.domain || "–"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-5 w-5 rounded-full border border-border"
                          style={{ backgroundColor: b.brand_color || "#3B82F6" }}
                        />
                        <span className="text-xs text-muted-foreground">{b.brand_color}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(b.created_at).toLocaleDateString("de-DE")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setAnnounceBrandingId(b.id)}
                            >
                              <Megaphone className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Störungs-Info senden</TooltipContent>
                        </Tooltip>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/admin/brandings/${b.id}`)}
                        >
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(b.id)}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </motion.div>

      <DomainAnnouncementDialog
        brandingId={announceBrandingId}
        open={!!announceBrandingId}
        onOpenChange={(v) => !v && setAnnounceBrandingId(null)}
      />
    </>
  );
}
