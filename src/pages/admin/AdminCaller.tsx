import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import { UserPlus, Settings, Trash2, Users, Building2, Phone, KeyRound } from "lucide-react";
import { motion } from "framer-motion";
import { useBrandingFilter } from "@/hooks/useBrandingFilter";

export default function AdminCaller() {
  const queryClient = useQueryClient();
  const { activeBrandingId, ready } = useBrandingFilter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [callerType, setCallerType] = useState<"bewerbungsgespraeche" | "probetag">("bewerbungsgespraeche");
  const [selectedBrandings, setSelectedBrandings] = useState<string[]>([]);
  const [expandedCaller, setExpandedCaller] = useState<string | null>(null);
  const [pwCaller, setPwCaller] = useState<{ id: string; name: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const { data: callers, isLoading } = useQuery({
    queryKey: ["admin-callers"],
    enabled: ready,
    queryFn: async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "caller" as any);

      if (!roles?.length) return [];

      const userIds = roles.map((r) => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, display_name, email")
        .in("id", userIds);

      // Get permissions for each caller
      const { data: permissions } = await supabase
        .from("admin_permissions" as any)
        .select("user_id, allowed_path")
        .in("user_id", userIds);

      return userIds.map((uid) => {
        const profile = profiles?.find((p) => p.id === uid);
        const userPerms = (permissions as any[])?.filter((p: any) => p.user_id === uid) || [];
        const hasProbetag = userPerms.some((p: any) => p.allowed_path === "/admin/probetag" || p.allowed_path === "/admin/erster-arbeitstag");
        return {
          id: uid,
          name: profile?.display_name || profile?.full_name || profile?.email || uid,
          callerType: hasProbetag ? "probetag" : "bewerbungsgespraeche",
        };
      });
    },
  });

  const { data: brandings } = useQuery({
    queryKey: ["admin-all-brandings-caller"],
    enabled: ready,
    queryFn: async () => {
      const { data } = await supabase.from("brandings").select("id, company_name");
      return data ?? [];
    },
  });

  const { data: callerAssignments } = useQuery({
    queryKey: ["caller-brandings", expandedCaller],
    enabled: !!expandedCaller,
    queryFn: async () => {
      const { data } = await supabase
        .from("kunde_brandings" as any)
        .select("branding_id")
        .eq("user_id", expandedCaller!);
      return ((data as any[]) ?? []).map((d: any) => d.branding_id as string);
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("create-caller-account", {
        body: { email, password, callerType, brandingIds: selectedBrandings },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast({ title: "Caller-Konto erstellt" });
      setOpen(false);
      setEmail("");
      setPassword("");
      setCallerType("bewerbungsgespraeche");
      setSelectedBrandings([]);
      queryClient.invalidateQueries({ queryKey: ["admin-callers"] });
    },
    onError: (e: any) => {
      toast({ title: "Fehler", description: e.message, variant: "destructive" });
    },
  });

  const toggleBranding = useMutation({
    mutationFn: async ({ callerId, brandingId, assign }: { callerId: string; brandingId: string; assign: boolean }) => {
      if (assign) {
        const { error } = await supabase
          .from("kunde_brandings" as any)
          .upsert({ user_id: callerId, branding_id: brandingId } as any, { onConflict: "user_id,branding_id" });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("kunde_brandings" as any).delete().eq("user_id", callerId).eq("branding_id", brandingId);
        if (error) throw error;
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["caller-brandings", variables.callerId] });
      toast({ title: variables.assign ? "Branding zugewiesen" : "Branding entfernt" });
    },
    onError: (e: any) => {
      toast({ title: "Fehler", description: e.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (callerId: string) => {
      // Remove role, permissions, and branding assignments
      await supabase.from("user_roles").delete().eq("user_id", callerId).eq("role", "caller" as any);
      await supabase.from("admin_permissions" as any).delete().eq("user_id", callerId);
      await supabase.from("kunde_brandings" as any).delete().eq("user_id", callerId);
    },
    onSuccess: () => {
      toast({ title: "Caller-Zugang entfernt" });
      queryClient.invalidateQueries({ queryKey: ["admin-callers"] });
    },
    onError: (e: any) => {
      toast({ title: "Fehler", description: e.message, variant: "destructive" });
    },
  });

  const passwordMutation = useMutation({
    mutationFn: async ({ userId, password }: { userId: string; password: string }) => {
      const { data, error } = await supabase.functions.invoke("reset-caller-password", {
        body: { user_id: userId, new_password: password },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      toast({ title: "Passwort geändert" });
      setPwCaller(null);
      setNewPassword("");
    },
    onError: (e: any) => {
      toast({ title: "Fehler", description: e.message, variant: "destructive" });
    },
  });

  const getInitials = (name: string) => {
    const parts = name.split(" ").filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return (name[0] || "?").toUpperCase();
  };

  const typeLabel = (t: string) => t === "probetag" ? "Probetage & 1. Arbeitstag" : "Bewerbungsgespräche";

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Caller</h2>
            <p className="text-muted-foreground mt-1">Caller-Konten verwalten und Brandings zuweisen.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Phone className="h-4 w-4 mr-2" />
                Caller erstellen
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Neues Caller-Konto</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <Label>E-Mail</Label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="caller@example.de" type="email" />
                </div>
                <div>
                  <Label>Passwort</Label>
                  <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Passwort" type="text" />
                </div>
                <div>
                  <Label className="mb-2 block">Caller-Typ</Label>
                  <RadioGroup value={callerType} onValueChange={(v) => setCallerType(v as any)} className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="bewerbungsgespraeche" id="ct-bg" />
                      <Label htmlFor="ct-bg" className="cursor-pointer font-normal">Bewerbungsgespräche</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="probetag" id="ct-pt" />
                      <Label htmlFor="ct-pt" className="cursor-pointer font-normal">Probetage</Label>
                    </div>
                  </RadioGroup>
                </div>
                <div>
                  <Label className="mb-2 block">Brandings zuweisen</Label>
                  {!brandings?.length ? (
                    <p className="text-sm text-muted-foreground">Keine Brandings vorhanden.</p>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {brandings.map((b) => (
                        <label key={b.id} className="flex items-center gap-2.5 cursor-pointer hover:bg-muted/50 rounded-md px-2 py-1.5 -mx-2 transition-colors">
                          <Checkbox
                            checked={selectedBrandings.includes(b.id)}
                            onCheckedChange={(checked) => {
                              setSelectedBrandings((prev) =>
                                checked ? [...prev, b.id] : prev.filter((id) => id !== b.id)
                              );
                            }}
                          />
                          <span className="text-sm text-foreground">{b.company_name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  className="w-full shadow-sm hover:shadow-md transition-all"
                  onClick={() => createMutation.mutate()}
                  disabled={!email || !password || !selectedBrandings.length || createMutation.isPending}
                >
                  {createMutation.isPending ? "Erstelle..." : "Konto erstellen"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Laden...</div>
        ) : !callers?.length ? (
          <div className="text-center py-16 border border-dashed border-border rounded-lg">
            <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Noch keine Caller vorhanden.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {callers.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <div className="premium-card p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
                  <div className="flex-shrink-0 h-11 w-11 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                    {getInitials(c.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground truncate">{c.name}</span>
                      <Badge variant="secondary" className="text-xs">{typeLabel(c.callerType)}</Badge>
                    </div>
                    {expandedCaller === c.id && callerAssignments && (
                      <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                        <Building2 className="h-3.5 w-3.5" />
                        <span>{callerAssignments.length} Branding{callerAssignments.length !== 1 ? "s" : ""} zugewiesen</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setExpandedCaller(expandedCaller === c.id ? null : c.id)}
                          className={expandedCaller === c.id ? "text-primary" : ""}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Brandings verwalten</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setPwCaller({ id: c.id, name: c.name })}
                        >
                          <KeyRound className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Passwort ändern</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm("Caller-Zugang wirklich entfernen?")) {
                              deleteMutation.mutate(c.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Zugang entfernen</TooltipContent>
                    </Tooltip>
                  </div>
                </div>

                {expandedCaller === c.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    transition={{ duration: 0.2 }}
                    className="bg-muted/30 rounded-lg p-4 mt-2 ml-[60px]"
                  >
                    <p className="text-sm font-medium text-foreground mb-3">Zugewiesene Brandings</p>
                    {!brandings?.length ? (
                      <p className="text-sm text-muted-foreground">Keine Brandings vorhanden.</p>
                    ) : (
                      <div className="space-y-2">
                        {brandings.map((b) => {
                          const isAssigned = callerAssignments?.includes(b.id) ?? false;
                          return (
                            <label key={b.id} className="flex items-center gap-2.5 cursor-pointer hover:bg-muted/50 rounded-md px-2 py-1.5 -mx-2 transition-colors">
                              <Checkbox
                                checked={isAssigned}
                                disabled={toggleBranding.isPending}
                                onCheckedChange={(checked) => {
                                  toggleBranding.mutate({
                                    callerId: c.id,
                                    brandingId: b.id,
                                    assign: !!checked,
                                  });
                                }}
                              />
                              <span className="text-sm text-foreground">{b.company_name}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      <Dialog open={!!pwCaller} onOpenChange={(o) => { if (!o) { setPwCaller(null); setNewPassword(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Passwort ändern</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">Für: <span className="font-medium text-foreground">{pwCaller?.name}</span></p>
            <div>
              <Label>Neues Passwort</Label>
              <Input
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mindestens 6 Zeichen"
                type="text"
              />
            </div>
            <Button
              className="w-full"
              onClick={() => pwCaller && passwordMutation.mutate({ userId: pwCaller.id, password: newPassword })}
              disabled={!newPassword || newPassword.length < 6 || passwordMutation.isPending}
            >
              {passwordMutation.isPending ? "Speichere..." : "Passwort speichern"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
