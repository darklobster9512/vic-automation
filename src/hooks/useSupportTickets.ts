import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { SupportTicket, SupportTicketMessage } from "@/lib/supportTickets";

/**
 * Realtime subscription for the support ticket tables.
 * Invalidates the passed query keys whenever anything changes.
 */
export function useSupportTicketsRealtime(queryKeys: unknown[][]) {
  const queryClient = useQueryClient();
  const serialized = JSON.stringify(queryKeys);

  useEffect(() => {
    const invalidate = () => {
      for (const key of JSON.parse(serialized) as unknown[][]) {
        queryClient.invalidateQueries({ queryKey: key });
      }
    };

    const channel = supabase
      .channel(`support-tickets-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "support_ticket_messages" }, invalidate)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [serialized, queryClient]);
}

/** All tickets of the signed-in employee. */
export function useMyTickets(userId: string | undefined) {
  return useQuery({
    queryKey: ["my-support-tickets", userId],
    enabled: !!userId,
    queryFn: async (): Promise<SupportTicket[]> => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("user_id", userId!)
        .order("last_message_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SupportTicket[];
    },
  });
}

/** Messages of a single ticket. */
export function useTicketMessages(ticketId: string | null) {
  return useQuery({
    queryKey: ["support-ticket-messages", ticketId],
    enabled: !!ticketId,
    queryFn: async (): Promise<SupportTicketMessage[]> => {
      const { data, error } = await supabase
        .from("support_ticket_messages")
        .select("*")
        .eq("ticket_id", ticketId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as SupportTicketMessage[];
    },
  });
}
