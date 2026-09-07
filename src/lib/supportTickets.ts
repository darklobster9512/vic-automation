import { supabase } from "@/integrations/supabase/client";

export const TICKET_CATEGORIES = [
  { value: "auftrag", label: "Auftrag" },
  { value: "bezahlung", label: "Bezahlung" },
  { value: "vertrag", label: "Vertrag" },
  { value: "technik", label: "Technik" },
  { value: "sonstiges", label: "Sonstiges" },
] as const;

export const TICKET_PRIORITIES = [
  { value: "niedrig", label: "Niedrig" },
  { value: "normal", label: "Normal" },
  { value: "hoch", label: "Hoch" },
] as const;

export const TICKET_STATUSES = [
  { value: "offen", label: "Offen" },
  { value: "in_bearbeitung", label: "In Bearbeitung" },
  { value: "wartet_auf_mitarbeiter", label: "Wartet auf Mitarbeiter" },
  { value: "geloest", label: "Gelöst" },
  { value: "geschlossen", label: "Geschlossen" },
] as const;

export const categoryLabel = (v: string) =>
  TICKET_CATEGORIES.find((c) => c.value === v)?.label ?? v;

export const priorityLabel = (v: string) =>
  TICKET_PRIORITIES.find((c) => c.value === v)?.label ?? v;

export const statusLabel = (v: string) =>
  TICKET_STATUSES.find((c) => c.value === v)?.label ?? v;

/** Tailwind classes for status badges (design tokens only). */
export const statusBadgeClass = (v: string) => {
  switch (v) {
    case "offen":
      return "bg-primary/10 text-primary border-primary/20";
    case "in_bearbeitung":
      return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    case "wartet_auf_mitarbeiter":
      return "bg-sky-500/10 text-sky-600 border-sky-500/20";
    case "geloest":
      return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    case "geschlossen":
      return "bg-muted text-muted-foreground border-border";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
};

export const priorityBadgeClass = (v: string) => {
  switch (v) {
    case "hoch":
      return "bg-destructive/10 text-destructive border-destructive/20";
    case "niedrig":
      return "bg-muted text-muted-foreground border-border";
    default:
      return "bg-primary/10 text-primary border-primary/20";
  }
};

export interface SupportTicket {
  id: string;
  ticket_number: string;
  contract_id: string | null;
  user_id: string;
  branding_id: string | null;
  subject: string;
  category: string;
  priority: string;
  status: string;
  assigned_to: string | null;
  last_message_at: string;
  unread_for_admin: boolean;
  unread_for_user: boolean;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupportTicketMessage {
  id: string;
  ticket_id: string;
  sender_role: string;
  created_by: string | null;
  content: string;
  attachment_url: string | null;
  is_internal: boolean;
  created_at: string;
}

/** Uploads a ticket attachment into the shared chat-attachments bucket. */
export async function uploadTicketAttachment(ticketId: string, file: File): Promise<string | null> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `tickets/${ticketId}/${crypto.randomUUID()}_${safeName}`;

  const { error } = await supabase.storage.from("chat-attachments").upload(path, file);
  if (error) {
    console.error("Ticket attachment upload error:", error);
    return null;
  }

  const { data } = supabase.storage.from("chat-attachments").getPublicUrl(path);
  return data.publicUrl;
}
