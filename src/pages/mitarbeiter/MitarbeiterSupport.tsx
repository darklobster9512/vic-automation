import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { LifeBuoy, Plus } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import { useAuth } from "@/contexts/AuthContext";
import {
  categoryLabel, priorityLabel, statusLabel, statusBadgeClass, priorityBadgeClass,
} from "@/lib/supportTickets";
import { useMyTickets, useSupportTicketsRealtime } from "@/hooks/useSupportTickets";

export default function MitarbeiterSupport() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: tickets = [], isLoading } = useMyTickets(user?.id);

  useSupportTicketsRealtime([["my-support-tickets", user?.id]]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-4xl mx-auto"
    >
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary">
              <LifeBuoy className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Support</h1>
          </div>
          <p className="text-muted-foreground">
            Stelle hier eine Anfrage an dein Support-Team und verfolge den Bearbeitungsstand.
          </p>
        </div>
        <Button onClick={() => navigate("/mitarbeiter/support/neu")} className="rounded-xl">
          <Plus className="h-4 w-4 mr-2" />
          Neues Ticket
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
        </div>
      ) : tickets.length === 0 ? (
        <Card className="rounded-2xl border-border">
          <CardContent className="py-14 text-center">
            <LifeBuoy className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
            <p className="font-medium text-foreground">Noch keine Tickets</p>
            <p className="text-sm text-muted-foreground mt-1">
              Erstelle ein Ticket, wenn du Hilfe brauchst – wir melden uns schnellstmöglich.
            </p>
            <Button className="mt-4 rounded-xl" onClick={() => navigate("/mitarbeiter/support/neu")}>
              <Plus className="h-4 w-4 mr-2" />
              Neues Ticket
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tickets.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <button
                onClick={() => navigate(`/mitarbeiter/support/${t.id}`)}
                className="w-full text-left"
              >
                <Card className="rounded-2xl border-border hover:border-primary/40 transition-colors">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-muted-foreground">{t.ticket_number}</span>
                          {t.unread_for_user && (
                            <span className="h-2 w-2 rounded-full bg-primary" aria-label="Neue Antwort" />
                          )}
                        </div>
                        <p className="font-semibold text-foreground truncate">{t.subject}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {categoryLabel(t.category)} · Letzte Aktivität{" "}
                          {format(new Date(t.last_message_at), "dd.MM.yyyy HH:mm", { locale: de })}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <Badge variant="outline" className={statusBadgeClass(t.status)}>
                          {statusLabel(t.status)}
                        </Badge>
                        <Badge variant="outline" className={priorityBadgeClass(t.priority)}>
                          {priorityLabel(t.priority)}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
