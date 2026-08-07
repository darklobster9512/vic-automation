import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

export interface Conversation {
  contract_id: string;
  first_name: string | null;
  last_name: string | null;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

interface ConversationListProps {
  activeId: string | null;
  onSelect: (conv: Conversation) => void;
  conversations: Conversation[];
  search: string;
  onSearchChange: (val: string) => void;
  onlineContractIds?: Set<string>;
  onNewChat?: () => void;
}

export function ConversationList({ activeId, onSelect, conversations, search, onSearchChange, onlineContractIds, onNewChat }: ConversationListProps) {
  const filtered = conversations.filter((c) => {
    const name = `${c.first_name ?? ""} ${c.last_name ?? ""}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  return (
    <div className="flex flex-col h-full border-r border-border bg-card">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Mitarbeiter suchen..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 rounded-xl"
            />
          </div>
          {onNewChat && (
            <Button
              variant="outline"
              size="icon"
              className="rounded-xl shrink-0"
              onClick={onNewChat}
              title="Neuen Chat starten"
              aria-label="Neuen Chat starten"
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Keine Konversationen</p>
        ) : (
          filtered.map((conv) => (
            <button
              key={conv.contract_id}
              onClick={() => onSelect(conv)}
              className={cn(
                "w-full text-left px-4 py-3.5 border-b border-border/50 hover:bg-muted/30 transition-colors",
                activeId === conv.contract_id && "bg-primary/5 border-l-2 border-l-primary"
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  {onlineContractIds && (
                    <span className={cn(
                      "h-2 w-2 rounded-full shrink-0",
                      onlineContractIds.has(conv.contract_id) ? "bg-green-500" : "bg-muted-foreground/30"
                    )} />
                  )}
                  <span className="font-medium text-sm text-foreground truncate">
                    {conv.first_name} {conv.last_name}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                  {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true, locale: de })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground truncate pr-2">{conv.last_message}</p>
                {conv.unread_count > 0 && (
                  <span className="bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-5 min-w-[20px] flex items-center justify-center px-1 shrink-0">
                    {conv.unread_count}
                  </span>
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
