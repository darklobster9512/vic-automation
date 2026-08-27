import { useState, useEffect, useRef } from "react";
import { Sparkles, Check, X, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "./useChatRealtime";

interface AiSuggestionBarProps {
  contractId: string;
  messages: ChatMessage[];
  onAccept: (text: string) => void;
}

export function AiSuggestionBar({ contractId, messages, onAccept }: AiSuggestionBarProps) {
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastUserMsgIdRef = useRef<string | null>(null);
  const contractIdRef = useRef<string | null>(null);

  // Find last user message
  const lastUserMsg = [...messages].reverse().find((m) => m.sender_role === "user");
  const lastMsgOverall = messages[messages.length - 1];

  useEffect(() => {
    const contractChanged = contractIdRef.current !== contractId;
    if (contractChanged) {
      contractIdRef.current = contractId;
      lastUserMsgIdRef.current = null;
      setSuggestion(null);
      setError(null);
      setDismissed(false);
    }

    if (!lastUserMsg) return;
    // Nur vorschlagen, wenn die neueste Nachricht vom Mitarbeiter stammt
    if (lastMsgOverall?.sender_role !== "user") return;
    if (lastUserMsg.id === lastUserMsgIdRef.current) return;

    lastUserMsgIdRef.current = lastUserMsg.id;
    setDismissed(false);
    setSuggestion(null);
    setError(null);
    fetchSuggestion();
  }, [lastUserMsg?.id, lastMsgOverall?.id, contractId]);


  const fetchSuggestion = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("ai-chat-suggest", {
        body: { contract_id: contractId },
      });

      if (fnError) {
        throw new Error(fnError.message || "Fehler beim Laden");
      }
      if (data?.error) {
        setError(data.error);
      } else {
        setSuggestion(data?.suggestion || null);
      }
    } catch (err: any) {
      console.error("AI suggestion error:", err);
      setError("KI-Vorschlag konnte nicht geladen werden");
    } finally {
      setLoading(false);
    }
  };

  // Nur anzeigen, wenn die neueste Nachricht vom Mitarbeiter stammt
  if (!lastUserMsg || dismissed) return null;
  if (lastMsgOverall?.sender_role !== "user") return null;
  if (!loading && !suggestion && !error) return null;


  if (error) {
    return (
      <div className="mx-3 mb-1 px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
        <Sparkles className="h-4 w-4 shrink-0" />
        <span className="flex-1">{error}</span>
        <button onClick={() => setDismissed(true)} className="shrink-0 hover:opacity-70">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="mx-3 mb-1 px-4 py-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
      <div className="flex items-center gap-2 mb-1.5">
        <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">KI-Vorschlag</span>
      </div>

      {loading ? (
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-full bg-blue-100 dark:bg-blue-900/40" />
          <Skeleton className="h-4 w-3/4 bg-blue-100 dark:bg-blue-900/40" />
        </div>
      ) : suggestion ? (
        <>
          <p className="text-sm text-blue-900 dark:text-blue-100 leading-relaxed mb-2">
            {suggestion}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onAccept(suggestion);
                setDismissed(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors"
            >
              <Check className="h-3.5 w-3.5" />
              Übernehmen
            </button>
            <button
              onClick={fetchSuggestion}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-medium hover:bg-blue-200 dark:hover:bg-blue-900/70 transition-colors"
              title="Neuen Vorschlag generieren"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="ml-auto text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
