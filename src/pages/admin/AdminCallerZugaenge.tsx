import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Copy, KeyRound, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { motion } from "framer-motion";

async function sha256(value: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function generateKey() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return "clk_" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default function AdminCallerZugaenge() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [brandingId, setBrandingId] = useState<string>("");
  const [slots, setSlots] = useState<number[]>([1]);
  const [saving, setSaving] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [rotateTarget, setRotateTarget] = useState<any | null>(null);
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [editLabel, setEditLabel] = useState("");

  const { data: brandings } = useQuery({
    queryKey: ["caller-key-brandings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brandings")
        .select("id, company_name")
        .order("company_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: scheduleSettings } = useQuery({
    queryKey: ["caller-key-schedule", brandingId],
    enabled: !!brandingId,
    queryFn: async () => {
      const { data } = await supabase
        .from("branding_schedule_settings")
        .select("interview_slots_per_time")
        .eq("branding_id", brandingId)
        .eq("schedule_type", "interview")
        .maybeSingle();
      return data;
    },
  });

  const maxSlots = Math.max(1, (scheduleSettings as any)?.interview_slots_per_time ?? 1);

  const { data: keys, isLoading } = useQuery({
    queryKey: ["caller-api-keys"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("caller_api_keys")
        .select("*, brandings(company_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const resetForm = () => {
    setLabel("");
    setBrandingId("");
    setSlots([1]);
  };

  const toggleSlot = (n: number) => {
    setSlots((prev) => (prev.includes(n) ? prev.filter((s) => s !== n) : [...prev, n].sort((a, b) => a - b)));
  };

  const handleCreate = async () => {
    if (!label.trim() || !brandingId || slots.length === 0) {
      toast.error("Bitte Bezeichnung, Branding und mindestens einen Slot angeben.");
      return;
    }
    setSaving(true);
    try {
      const plain = generateKey();
      const token_hash = await sha256(plain);
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from("caller_api_keys").insert({
        label: label.trim(),
        token_hash,
        branding_id: brandingId,
        slots,
        created_by: userData.user?.id ?? null,
      });
      if (error) throw error;
      setNewKey(plain);
      setCreateOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["caller-api-keys"] });
    } catch (e: any) {
      toast.error(e?.message || "Fehler beim Erstellen");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (row: any) => {
    const { error } = await supabase
      .from("caller_api_keys")
      .update({ is_active: !row.is_active })
      .eq("id", row.id);
    if (error) toast.error("Änderung fehlgeschlagen");
    else {
      toast.success(row.is_active ? "Zugang deaktiviert" : "Zugang aktiviert");
      queryClient.invalidateQueries({ queryKey: ["caller-api-keys"] });
    }
  };

  const handleUpdateSlots = async (row: any, n: number) => {
    const current: number[] = row.slots ?? [];
    const next = current.includes(n) ? current.filter((s) => s !== n) : [...current, n].sort((a, b) => a - b);
    if (next.length === 0) {
      toast.error("Mindestens ein Slot muss zugewiesen sein.");
      return;
    }
    const { error } = await supabase.from("caller_api_keys").update({ slots: next }).eq("id", row.id);
    if (error) toast.error("Slots konnten nicht gespeichert werden");
    else queryClient.invalidateQueries({ queryKey: ["caller-api-keys"] });
  };

  const handleRotate = async (row: any) => {
    const plain = generateKey();
    const token_hash = await sha256(plain);
    const { error } = await supabase
      .from("caller_api_keys")
      .update({ token_hash, is_active: true })
      .eq("id", row.id);
    if (error) {
      toast.error("Key konnte nicht erneuert werden");
      return;
    }
    setNewKey(plain);
    setRotateTarget(null);
    queryClient.invalidateQueries({ queryKey: ["caller-api-keys"] });
  };

  const handleRename = async () => {
    if (!editTarget) return;
    const next = editLabel.trim();
    if (!next) {
      toast.error("Bezeichnung darf nicht leer sein.");
      return;
    }
    const { error } = await supabase
      .from("caller_api_keys")
      .update({ label: next })
      .eq("id", editTarget.id);
    if (error) {
      toast.error("Bezeichnung konnte nicht gespeichert werden");
      return;
    }
    toast.success("Bezeichnung aktualisiert");
    setEditTarget(null);
    queryClient.invalidateQueries({ queryKey: ["caller-api-keys"] });
  };

  const handleDelete = async (row: any) => {
    const { error } = await supabase.from("caller_api_keys").delete().eq("id", row.id);
    if (error) toast.error("Löschen fehlgeschlagen");
    else {
      toast.success("Zugang gelöscht");
      queryClient.invalidateQueries({ queryKey: ["caller-api-keys"] });
    }
    setDeleteTarget(null);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8 flex items-start justify-between gap-4"
      >
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Caller-Zugänge</h2>
          <p className="text-muted-foreground mt-1">
            API-Zugänge für das externe Caller-Panel. Jeder Zugang ist auf ein Branding und bestimmte Slots begrenzt.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Zugang erstellen
        </Button>
      </motion.div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <KeyRound className="h-4 w-4" /> Vorhandene Zugänge
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Lädt…</p>
          ) : !keys?.length ? (
            <p className="text-sm text-muted-foreground italic">Noch keine Caller-Zugänge angelegt.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bezeichnung</TableHead>
                  <TableHead>Branding</TableHead>
                  <TableHead>Slots</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Zuletzt genutzt</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(keys as any[]).map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.label}</TableCell>
                    <TableCell>{row.brandings?.company_name ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Badge
                            key={n}
                            variant={row.slots?.includes(n) ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => handleUpdateSlots(row, n)}
                          >
                            {n}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {row.is_active ? (
                        <Badge className="bg-green-600 text-white border-green-600">Aktiv</Badge>
                      ) : (
                        <Badge variant="destructive">Inaktiv</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {row.last_used_at ? format(new Date(row.last_used_at), "dd.MM.yyyy HH:mm") : "—"}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="outline" size="sm" onClick={() => handleToggleActive(row)}>
                        {row.is_active ? "Deaktivieren" : "Aktivieren"}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setRotateTarget(row)}>
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(row)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Caller-Zugang erstellen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Bezeichnung</Label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="z. B. Caller Max" />
            </div>
            <div className="space-y-1.5">
              <Label>Branding</Label>
              <Select value={brandingId} onValueChange={(v) => { setBrandingId(v); setSlots([1]); }}>
                <SelectTrigger><SelectValue placeholder="Branding wählen" /></SelectTrigger>
                <SelectContent>
                  {(brandings ?? []).map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>{b.company_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Slots</Label>
              <div className="flex gap-4 flex-wrap">
                {Array.from({ length: maxSlots }, (_, i) => i + 1).map((n) => (
                  <label key={n} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={slots.includes(n)} onCheckedChange={() => toggleSlot(n)} />
                    Slot {n}
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Das Branding hat {maxSlots} Slot(s) pro Uhrzeit konfiguriert.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Abbrechen</Button>
            <Button onClick={handleCreate} disabled={saving}>Erstellen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!newKey} onOpenChange={(o) => { if (!o) setNewKey(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Caller-Key (nur jetzt sichtbar)</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Kopieren Sie diesen Key jetzt — er wird nur als Hash gespeichert und kann später nicht mehr angezeigt werden.
            </p>
            <div className="flex gap-2">
              <Input readOnly value={newKey ?? ""} className="font-mono text-xs" />
              <Button
                variant="outline"
                onClick={() => { navigator.clipboard.writeText(newKey ?? ""); toast.success("Key kopiert"); }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setNewKey(null)}>Fertig</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!rotateTarget} onOpenChange={(o) => { if (!o) setRotateTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Key neu generieren?</AlertDialogTitle>
            <AlertDialogDescription>
              Der bisherige Key von {rotateTarget?.label} wird sofort ungültig.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleRotate(rotateTarget)}>Neu generieren</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Zugang löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Der Caller-Zugang {deleteTarget?.label} wird unwiderruflich gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => handleDelete(deleteTarget)}>
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
