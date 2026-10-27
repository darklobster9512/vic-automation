import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBrandingFilter } from "@/hooks/useBrandingFilter";
import { AvatarUpload } from "@/components/chat/AvatarUpload";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { isChatOnline } from "@/lib/isChatOnline";

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const h = String(i).padStart(2, "0");
  return { value: `${h}:00`, label: `${h}:00` };
});

export default function AdminLivechatEinstellungen() {
  const { activeBrandingId, ready } = useBrandingFilter();
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [onlineFrom, setOnlineFrom] = useState("08:00");
  const [onlineUntil, setOnlineUntil] = useState("17:00");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState(new Date());

  // Tick every 60s to keep the preview status current
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!activeBrandingId || !ready) return;
    setLoading(true);
    supabase
      .from("brandings")
      .select("chat_display_name, chat_avatar_url, chat_online_from, chat_online_until")
      .eq("id", activeBrandingId)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data) {
          setDisplayName(data.chat_display_name ?? "");
          setAvatarUrl(data.chat_avatar_url ?? null);
          setOnlineFrom((data.chat_online_from ?? "08:00:00").slice(0, 5));
          setOnlineUntil((data.chat_online_until ?? "17:00:00").slice(0, 5));
        }
        setLoading(false);
      });
  }, [activeBrandingId, ready]);

  const handleSave = async () => {
    if (!activeBrandingId) return;
    setSaving(true);
    const { error } = await supabase
      .from("brandings")
      .update({
        chat_display_name: displayName || null,
        chat_avatar_url: avatarUrl,
        chat_online_from: onlineFrom + ":00",
        chat_online_until: onlineUntil + ":00",
      } as any)
      .eq("id", activeBrandingId);
    setSaving(false);
    if (error) {
      toast.error("Fehler beim Speichern");
    } else {
      toast.success("Livechat-Einstellungen gespeichert");
    }
  };

  const currentlyOnline = isChatOnline(onlineFrom, onlineUntil);

  if (!ready || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Livechat-Einstellungen</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Diese Einstellungen gelten für alle Mitarbeiter dieses Brandings.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Chat-Profil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar */}
          <div className="space-y-2">
            <Label>Avatar</Label>
            <div className="flex items-center gap-4">
              <AvatarUpload
                avatarUrl={avatarUrl}
                name={displayName || "Chat"}
                size={64}
                editable
                fileKey={`branding-${activeBrandingId}`}
                updateProfile={false}
                onUploaded={(url) => setAvatarUrl(url)}
              />
              <p className="text-xs text-muted-foreground">
                Wird den Mitarbeitern im Livechat angezeigt.
              </p>
            </div>
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="chat-name">Anzeigename</Label>
            <Input
              id="chat-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="z.B. Support Team"
              className="max-w-sm"
            />
          </div>

          {/* Online-Zeiten */}
          <div className="space-y-3">
            <Label>Erreichbarkeit</Label>
            <p className="text-xs text-muted-foreground">
              Chat wird als "Online" angezeigt zwischen diesen Uhrzeiten.
            </p>
            <div className="flex items-center gap-3 max-w-sm">
              <Select value={onlineFrom} onValueChange={setOnlineFrom}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HOUR_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">bis</span>
              <Select value={onlineUntil} onValueChange={setOnlineUntil}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HOUR_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`h-2.5 w-2.5 rounded-full ${currentlyOnline ? "bg-green-500" : "bg-muted-foreground/30"}`} />
              <span className="text-sm text-muted-foreground">
                Aktuell {currentlyOnline ? "online" : "offline"}
              </span>
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="mt-2">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Speichern
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
