import { useRef, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Paperclip, X, Loader2, LifeBuoy } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { sendTelegram } from "@/lib/sendTelegram";
import {
  TICKET_CATEGORIES, TICKET_PRIORITIES, categoryLabel, priorityLabel,
  uploadTicketAttachment,
} from "@/lib/supportTickets";

interface LayoutContext {
  contract: { id: string; first_name: string | null; last_name: string | null; branding_id: string | null } | null;
  branding: { id: string; company_name: string } | null;
}

export default function MitarbeiterSupportNeu() {
  const { user } = useAuth();
  const { contract, branding } = useOutletContext<LayoutContext>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("sonstiges");
  const [priority, setPriority] = useState("normal");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const brandingId = branding?.id ?? contract?.branding_id ?? null;
  const brandingName = branding?.company_name ?? null;
  const employeeName =
    [contract?.first_name, contract?.last_name].filter(Boolean).join(" ") || user?.email || "Mitarbeiter";

  const submit = async () => {
    if (!user?.id) return;
    const trimmedSubject = subject.trim();
    const trimmedDescription = description.trim();
    if (!trimmedSubject || trimmedSubject.length > 150) {
      toast.error("Bitte gib einen Betreff mit maximal 150 Zeichen an.");
      return;
    }
    if (!trimmedDescription || trimmedDescription.length > 5000) {
      toast.error("Bitte beschreibe dein Anliegen (maximal 5000 Zeichen).");
      return;
    }

    setSaving(true);
    try {
      const { data: ticket, error } = await supabase
        .from("support_tickets")
        .insert({
          ticket_number: "", // wird per Datenbank-Trigger vergeben
          user_id: user.id,
          contract_id: contract?.id ?? null,
          branding_id: brandingId,
          subject: trimmedSubject,
          category,
          priority,
        })
        .select()
        .single();
      if (error) throw error;

      await supabase.from("support_ticket_messages").insert({
        ticket_id: ticket.id,
        sender_role: "user",
        created_by: user.id,
        content: trimmedDescription,
      });

      for (const file of files) {
        const url = await uploadTicketAttachment(ticket.id, file);
        if (url) {
          await supabase.from("support_ticket_messages").insert({
            ticket_id: ticket.id,
            sender_role: "user",
            created_by: user.id,
            content: "",
            attachment_url: url,
          });
        }
      }

      void sendTelegram(
        "ticket_neu",
        {
          icon: "🎫",
          title: "Neues Support-Ticket",
          fields: [
            { icon: "🔖", label: "Ticket", value: ticket.ticket_number, bold: true },
            { icon: "👤", label: "Mitarbeiter", value: employeeName },
            { icon: "📌", label: "Betreff", value: trimmedSubject },
            { icon: "🗂", label: "Kategorie", value: categoryLabel(category) },
            { icon: "⚡", label: "Priorität", value: priorityLabel(priority) },
            { icon: "💬", value: trimmedDescription.slice(0, 500) },
          ],
          brandingName,
        },
        brandingId,
      );

      toast.success(`Ticket ${ticket.ticket_number} wurde erstellt.`);
      await queryClient.invalidateQueries({ queryKey: ["my-support-tickets", user.id] });
      navigate(`/mitarbeiter/support/${ticket.id}`, { replace: true });
    } catch (e) {
      console.error(e);
      toast.error("Ticket konnte nicht erstellt werden.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-3xl mx-auto"
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/mitarbeiter/support")}
        className="mb-4 -ml-2"
        disabled={saving}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Zurück zur Übersicht
      </Button>

      <div className="mb-6 flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary">
          <LifeBuoy className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Neues Support-Ticket</h1>
          <p className="text-muted-foreground text-sm">
            Beschreibe dein Anliegen – wir melden uns schnellstmöglich.
          </p>
        </div>
      </div>

      <Card className="rounded-2xl border-border">
        <CardContent className="p-6 space-y-5">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Betreff</label>
            <Input
              value={subject}
              maxLength={150}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Kurze Zusammenfassung deines Anliegens"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Kategorie</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TICKET_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Priorität</label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TICKET_PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Beschreibung</label>
            <Textarea
              value={description}
              maxLength={5000}
              rows={8}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Beschreibe dein Anliegen so genau wie möglich."
            />
          </div>

          <div>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => {
                setFiles((prev) => [...prev, ...Array.from(e.target.files ?? [])]);
                e.target.value = "";
              }}
            />
            <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <Paperclip className="h-4 w-4 mr-2" />
              Anhang hinzufügen
            </Button>
            {files.length > 0 && (
              <ul className="mt-2 space-y-1">
                {files.map((f, i) => (
                  <li key={i} className="flex items-center justify-between text-sm bg-muted rounded-lg px-3 py-1.5">
                    <span className="truncate">{f.name}</span>
                    <button type="button" onClick={() => setFiles((p) => p.filter((_, idx) => idx !== i))}>
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              variant="outline"
              onClick={() => navigate("/mitarbeiter/support")}
              disabled={saving}
            >
              Abbrechen
            </Button>
            <Button onClick={submit} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Ticket erstellen
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
