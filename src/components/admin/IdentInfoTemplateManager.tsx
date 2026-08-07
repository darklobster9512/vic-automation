import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";

export interface IdentInfoTemplate {
  id: string;
  name: string;
  content: string;
}

export function useIdentInfoTemplates(brandingId: string | null | undefined) {
  return useQuery({
    queryKey: ["ident-info-templates", brandingId ?? null],
    queryFn: async () => {
      let query = supabase
        .from("ident_info_templates")
        .select("id, name, content")
        .order("name");
      if (brandingId) query = query.eq("branding_id", brandingId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as IdentInfoTemplate[];
    },
  });
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandingId: string | null | undefined;
}

export default function IdentInfoTemplateManager({ open, onOpenChange, brandingId }: Props) {
  const qc = useQueryClient();
  const { data: templates } = useIdentInfoTemplates(brandingId);

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editContent, setEditContent] = useState("");

  const invalidate = () => qc.invalidateQueries({ queryKey: ["ident-info-templates"] });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("ident_info_templates").insert({
        name: name.trim(),
        content: content.trim(),
        branding_id: brandingId ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      setName("");
      setContent("");
      setShowCreate(false);
      toast.success("Vorlage erstellt");
    },
    onError: () => toast.error("Fehler beim Erstellen"),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("ident_info_templates")
        .update({ name: editName.trim(), content: editContent.trim() })
        .eq("id", editingId!);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      setEditingId(null);
      toast.success("Vorlage aktualisiert");
    },
    onError: () => toast.error("Fehler beim Aktualisieren"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ident_info_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Vorlage gelöscht");
    },
    onError: () => toast.error("Fehler beim Löschen"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Info-Vorlagen verwalten</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {templates?.map((t) => (
              <div key={t.id} className="p-3 bg-muted/30 rounded-xl">
                {editingId === t.id ? (
                  <div className="space-y-2">
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name" />
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="min-h-[160px] text-sm"
                      placeholder="Vorlagentext"
                    />
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => updateMutation.mutate()}
                        disabled={!editName.trim() || !editContent.trim() || updateMutation.isPending}
                      >
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setEditingId(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{t.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap mt-1">{t.content}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => {
                          setEditingId(t.id);
                          setEditName(t.name);
                          setEditContent(t.content);
                        }}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(t.id)}
                        className="text-destructive/60 hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {!templates?.length && (
              <p className="text-sm text-muted-foreground text-center py-4">Noch keine Vorlagen vorhanden</p>
            )}
          </div>

          {showCreate ? (
            <div className="space-y-3 border rounded-xl p-3">
              <Input placeholder="Name (z.B. Demo-WebID)" value={name} onChange={(e) => setName(e.target.value)} />
              <Textarea
                placeholder="Vorlagentext"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[160px]"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => addMutation.mutate()}
                  disabled={!name.trim() || !content.trim() || addMutation.isPending}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Erstellen
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowCreate(false);
                    setName("");
                    setContent("");
                  }}
                >
                  Abbrechen
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" className="w-full" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Vorlage erstellen
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
