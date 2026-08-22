import { useState, useMemo } from "react";
import { sendEmail } from "@/lib/sendEmail";
import { sendSms } from "@/lib/sendSms";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { buildBrandingUrl } from "@/lib/buildBrandingUrl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { FileCheck, ChevronLeft, ChevronRight, Eye, CheckCircle, User, Phone, Mail, Building2, CreditCard, Shield, ImageIcon, Copy, CalendarIcon, Search, Trash2, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { de } from "date-fns/locale/de";
import { useBrandingFilter } from "@/hooks/useBrandingFilter";

const PAGE_SIZE = 20;

type TabValue = "all" | "offen" | "eingereicht" | "genehmigt";

export default function AdminArbeitsvertraege() {
  const [page, setPage] = useState(0);
  const [activeTab, setActiveTab] = useState<TabValue>("all");
  const [search, setSearch] = useState("");
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [startDateDialogOpen, setStartDateDialogOpen] = useState(false);
  const [confirmedStartDate, setConfirmedStartDate] = useState<Date | undefined>(undefined);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();
  const { activeBrandingId, ready } = useBrandingFilter();

  const { data, isLoading } = useQuery({
    queryKey: ["arbeitsvertraege", activeBrandingId],
    enabled: ready,
    queryFn: async () => {
      const { data: contracts, error } = await supabase
        .from("employment_contracts")
        .select("*, applications(id, first_name, last_name, email, phone, branding_id, brandings(id, company_name)), contract_templates(title)")
        .eq("branding_id", activeBrandingId!)
        .neq("status", "offen")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return contracts || [];
    },
  });

  // Counts per status
  const counts = useMemo(() => {
    if (!data) return { all: 0, offen: 0, eingereicht: 0, genehmigt: 0 };
    const c = { all: data.length, offen: 0, eingereicht: 0, genehmigt: 0 };
    data.forEach((item: any) => {
      const s = item.status;
      if (s === "eingereicht" || s === "unterzeichnet") c.eingereicht++;
      else if (s === "genehmigt") c.genehmigt++;
      else c.offen++;
    });
    return c;
  }, [data]);

  const sortedItems = useMemo(() => {
    if (!data) return [];
    const statusOrder: Record<string, number> = { unterzeichnet: 0, genehmigt: 1, eingereicht: 2 };
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const filtered = activeTab === "all"
      ? data
      : data.filter((item: any) => {
          const s = item.status;
          if (activeTab === "offen") return !s || s === "offen";
          if (activeTab === "eingereicht") return s === "eingereicht" || s === "unterzeichnet";
          return s === activeTab;
        });

    const searched = search.trim()
      ? filtered.filter((item: any) => {
          const name = `${item.first_name || ""} ${item.last_name || ""}`.toLowerCase();
          return name.includes(search.trim().toLowerCase());
        })
      : filtered;

    return [...searched].sort((a, b) => {
      const rankA = statusOrder[a.status] ?? 3;
      const rankB = statusOrder[b.status] ?? 3;
      if (rankA !== rankB) return rankA - rankB;

      const dateA = a.desired_start_date ? new Date(a.desired_start_date + "T00:00:00") : null;
      const dateB = b.desired_start_date ? new Date(b.desired_start_date + "T00:00:00") : null;

      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;

      const futureA = dateA >= today;
      const futureB = dateB >= today;
      if (futureA && !futureB) return -1;
      if (!futureA && futureB) return 1;
      if (futureA && futureB) return dateA.getTime() - dateB.getTime();
      return dateB.getTime() - dateA.getTime();
    });
  }, [data, activeTab, search]);

  const paginatedItems = sortedItems.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(sortedItems.length / PAGE_SIZE);

  const handleTabChange = (val: string) => {
    setActiveTab(val as TabValue);
    setPage(0);
  };

  const openStartDateDialog = (contract: any) => {
    const dateStr = contract.desired_start_date;
    const parsed = dateStr ? new Date(dateStr + "T00:00:00") : undefined;
    setConfirmedStartDate(parsed);
    setStartDateDialogOpen(true);
  };


  const handleApprove = async (contractId: string) => {
    try {
      // 1. Save start date if set
      if (confirmedStartDate) {
        const formatted = format(confirmedStartDate, "yyyy-MM-dd");
        const { error: updateError } = await supabase
          .from("employment_contracts")
          .update({ desired_start_date: formatted })
          .eq("id", contractId);
        if (updateError) {
          toast.error("Fehler beim Aktualisieren des Startdatums.");
          return;
        }
      }

      // 2. Build first workday link directly from contract id
      const brandingId = selectedContract?.branding_id || selectedContract?.applications?.brandings?.id;
      const firstWorkdayLink = await buildBrandingUrl(brandingId, `/erster-arbeitstag/${contractId}`);

      // 3. Approve the contract
      const { error } = await supabase.rpc("approve_employment_contract", { _contract_id: contractId });
      if (error) {
        toast.error("Fehler beim Genehmigen.");
        return;
      }

      // 4. Send vertrag_genehmigt email WITH guaranteed button
      if (selectedContract?.email) {
        const startDateDisplay = confirmedStartDate
          ? confirmedStartDate.toLocaleDateString("de-DE")
          : selectedContract.desired_start_date
            ? new Date(selectedContract.desired_start_date).toLocaleDateString("de-DE")
            : null;

        let projectManagerName = "";
        if (brandingId) {
          const { data: pmBranding } = await supabase
            .from("brandings")
            .select("project_manager_name")
            .eq("id", brandingId)
            .maybeSingle();
          projectManagerName = ((pmBranding as any)?.project_manager_name || "").trim();
        }

        await sendEmail({
          to: selectedContract.email,
          recipient_name: `${selectedContract.first_name || ""} ${selectedContract.last_name || ""}`.trim(),
          subject: "Herzlichen Glückwunsch – Sie sind nun vollwertiger Mitarbeiter",
          body_title: "Willkommen im Team!",
          body_lines: [
            `Sehr geehrte/r ${selectedContract.first_name || ""} ${selectedContract.last_name || ""}`.trim() + ",",
            "herzlichen Glückwunsch! Ihr Arbeitsvertrag wurde genehmigt – Sie sind nun vollwertiger Mitarbeiter.",
            startDateDisplay
              ? `Ab Ihrem Startdatum (${startDateDisplay}) werden Ihnen Aufträge zugewiesen.`
              : "Sie werden in Kürze Ihre ersten Aufträge erhalten.",
            "Bitte vereinbaren Sie mit uns einen Termin für Ihren ersten Arbeitstag.",
            ...(projectManagerName
              ? [`${projectManagerName} wird Sie anschließend telefonisch kontaktieren, um mit Ihnen die ersten Aufträge durchzugehen.`]
              : []),
            "Wir freuen uns auf die Zusammenarbeit!",
          ],
          button_text: "Termin für 1. Arbeitstag buchen",
          button_url: firstWorkdayLink,
          branding_id: brandingId || null,
          event_type: "vertrag_genehmigt",
          metadata: { contract_id: contractId },
        });
      }

      // 5. Send SMS
      const phone = selectedContract?.phone || selectedContract?.applications?.phone;
      if (phone) {
        const contractName = `${selectedContract.first_name || ""} ${selectedContract.last_name || ""}`.trim();
        const { data: tpl } = await supabase
          .from("sms_templates" as any)
          .select("message")
          .eq("event_type", "vertrag_genehmigt")
          .single();
        const smsText = (tpl as any)?.message
          ? ((tpl as any).message as string).replace("{name}", contractName)
          : `Hallo ${contractName}, herzlichen Glückwunsch! Ihr Arbeitsvertrag wurde genehmigt. Wir freuen uns auf die Zusammenarbeit!`;

        let senderName: string | undefined;
        if (brandingId) {
          const { data: branding } = await supabase
            .from("brandings")
            .select("sms_sender_name")
            .eq("id", brandingId)
            .single();
          senderName = (branding as any)?.sms_sender_name || undefined;
        }

        await sendSms({
          to: phone,
          text: smsText,
          event_type: "vertrag_genehmigt",
          recipient_name: contractName,
          from: senderName,
          branding_id: brandingId || null,
        });
      }

      toast.success("Vertrag genehmigt!");
      setStartDateDialogOpen(false);
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["arbeitsvertraege"] });
    } catch {
      toast.error("Fehler beim Genehmigen.");
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "eingereicht":
        return <Badge className="bg-yellow-500 text-white border-yellow-500">Eingereicht</Badge>;
      case "unterzeichnet":
        return <Badge className="bg-blue-600 text-white border-blue-600">Unterzeichnet</Badge>;
      case "genehmigt":
        return <Badge className="bg-green-600 text-white border-green-600">Genehmigt</Badge>;
      default:
        return <Badge variant="outline">Offen</Badge>;
    }
  };

  const getInitials = (first?: string, last?: string) => {
    return `${(first || "?")[0]}${(last || "?")[0]}`.toUpperCase();
  };

  const openDetails = (contract: any) => {
    setSelectedContract(contract);
    setDialogOpen(true);
  };

  const InfoRow = ({ label, value }: { label: string; value?: string | null }) => (
    <div className="flex justify-between py-1.5 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value || "–"}</span>
    </div>
  );

  const TabBadge = ({ count }: { count: number }) => (
    <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground min-w-[22px]">
      {count}
    </span>
  );

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Arbeitsverträge</h2>
        <p className="text-muted-foreground mt-1">Bewerber mit erfolgreichem Bewerbungsgespräch.</p>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Laden...</div>
        ) : !data?.length ? (
          <div className="text-center py-16 border border-dashed border-border rounded-lg">
            <FileCheck className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Keine erfolgreichen Bewerbungsgespräche vorhanden.</p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="mb-6 bg-muted/50 p-1">
              <TabsTrigger value="all">Alle<TabBadge count={counts.all} /></TabsTrigger>
              <TabsTrigger value="offen">Offen<TabBadge count={counts.offen} /></TabsTrigger>
              <TabsTrigger value="eingereicht">Eingereicht<TabBadge count={counts.eingereicht} /></TabsTrigger>
              <TabsTrigger value="genehmigt">Genehmigt<TabBadge count={counts.genehmigt} /></TabsTrigger>
              
            </TabsList>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Name suchen..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 mb-4" />
            </div>

            {/* Single content area for all tabs since filtering is done via sortedItems */}
            <div className="space-y-3">
              {paginatedItems.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-border rounded-lg">
                  <p className="text-muted-foreground">Keine Einträge in dieser Kategorie.</p>
                </div>
              ) : (
                paginatedItems.map((item: any, i: number) => {
                  const firstName = item.applications?.first_name || item.first_name || "";
                  const lastName = item.applications?.last_name || item.last_name || "";
                  const email = (item.applications?.email || item.email || "").trim().toLowerCase();
                  const phone = item.applications?.phone || item.phone || "";
                  const branding = item.applications?.brandings?.company_name || "";
                  const startDate = item.desired_start_date
                    ? format(new Date(item.desired_start_date + "T00:00:00"), "dd. MMM yyyy", { locale: de })
                    : null;
                  const hasData = item.status === "eingereicht" || item.status === "genehmigt" || item.status === "unterzeichnet";

                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="premium-card p-4 flex items-center gap-4 hover:shadow-md transition-shadow"
                    >
                      {/* Avatar */}
                      <div className="flex-shrink-0 h-11 w-11 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                        {getInitials(firstName, lastName)}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-foreground truncate">{firstName} {lastName}</span>
                          {statusBadge(item.status)}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                          {email && (
                            <span className="flex items-center gap-1 truncate">
                              <Mail className="h-3.5 w-3.5" />{email}
                            </span>
                          )}
                          {phone && (
                            <span
                              className="flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors"
                              onClick={() => { navigator.clipboard.writeText(phone); toast.success("Telefonnummer kopiert!"); }}
                            >
                              <Phone className="h-3.5 w-3.5" />{phone}
                            </span>
                          )}
                          {branding && (
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3.5 w-3.5" />{branding}
                            </span>
                          )}
                          {startDate && (
                            <span className="flex items-center gap-1">
                              <CalendarIcon className="h-3.5 w-3.5" />{startDate}
                            </span>
                          )}
                          {item.contract_templates?.title && (
                            <span className="flex items-center gap-1">
                              <FileCheck className="h-3.5 w-3.5" />{item.contract_templates.title}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {item.status === "genehmigt" && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={async () => {
                                  const brandingId = item.applications?.brandings?.id || item.branding_id;
                                  const url = await buildBrandingUrl(brandingId, `/erster-arbeitstag/${item.id}`);
                                  navigator.clipboard.writeText(url);
                                  toast.success("1. Arbeitstag Link kopiert!");
                                }}
                              >
                                <CalendarIcon className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>1. Arbeitstag Link kopieren</TooltipContent>
                          </Tooltip>
                        )}

                        {hasData ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDetails(item)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Daten ansehen</TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-xs text-muted-foreground px-2">Warten auf Daten</span>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">Seite {page + 1} von {totalPages} ({sortedItems.length} Einträge)</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                    <ChevronLeft className="h-4 w-4 mr-1" /> Zurück
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                    Weiter <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </Tabs>
        )}
      </motion.div>

      {/* Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Eingereichte Vertragsdaten</DialogTitle>
            <DialogDescription>Übersicht der vom Bewerber eingereichten Informationen.</DialogDescription>
          </DialogHeader>

          {selectedContract && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold text-sm">Persönliche Informationen</h4>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <InfoRow label="Vorname" value={selectedContract.first_name} />
                  <InfoRow label="Nachname" value={selectedContract.last_name} />
                  <InfoRow label="E-Mail" value={selectedContract.email} />
                  <InfoRow label="Telefon" value={selectedContract.phone} />
                  <InfoRow label="Geburtsdatum" value={selectedContract.birth_date} />
                  <InfoRow label="Geburtsort" value={selectedContract.birth_place} />
                  <InfoRow label="Nationalität" value={selectedContract.nationality} />
                  <InfoRow label="Straße" value={selectedContract.street} />
                  <InfoRow label="PLZ & Stadt" value={`${selectedContract.zip_code || ""} ${selectedContract.city || ""}`} />
                  <InfoRow label="Familienstand" value={selectedContract.marital_status} />
                  <InfoRow label="Art der Beschäftigung" value={selectedContract.employment_type} />
                  <InfoRow label="Vertragsform" value={selectedContract.contract_templates?.title} />
                  <InfoRow label="Gewünschtes Startdatum" value={selectedContract.desired_start_date} />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold text-sm">Steuerliche Angaben</h4>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <InfoRow label="Sozialversicherungsnr." value={selectedContract.social_security_number} />
                  <InfoRow label="Steuer-ID" value={selectedContract.tax_id} />
                  <InfoRow label="Krankenversicherung" value={selectedContract.health_insurance} />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold text-sm">Bankverbindung</h4>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <InfoRow label="IBAN" value={selectedContract.iban} />
                  <InfoRow label="BIC" value={selectedContract.bic} />
                  <InfoRow label="Bank" value={selectedContract.bank_name} />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ImageIcon className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold text-sm">Ausweisdokumente</h4>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {selectedContract.id_front_url && (
                    <div className="cursor-pointer" onClick={() => setImagePreview(selectedContract.id_front_url)}>
                      <p className="text-xs text-muted-foreground mb-1">Vorderseite</p>
                      <img src={selectedContract.id_front_url} alt="Ausweis Vorderseite" className="rounded-lg border border-border w-full h-32 object-cover hover:opacity-80 transition-opacity" />
                    </div>
                  )}
                  {selectedContract.id_back_url && (
                    <div className="cursor-pointer" onClick={() => setImagePreview(selectedContract.id_back_url)}>
                      <p className="text-xs text-muted-foreground mb-1">Rückseite</p>
                      <img src={selectedContract.id_back_url} alt="Ausweis Rückseite" className="rounded-lg border border-border w-full h-32 object-cover hover:opacity-80 transition-opacity" />
                    </div>
                  )}
                  {selectedContract.proof_of_address_url && (
                    <div className="cursor-pointer" onClick={() => {
                      if (selectedContract.proof_of_address_url.endsWith('.pdf')) {
                        window.open(selectedContract.proof_of_address_url, '_blank');
                      } else {
                        setImagePreview(selectedContract.proof_of_address_url);
                      }
                    }}>
                      <p className="text-xs text-muted-foreground mb-1">Meldenachweis</p>
                      {selectedContract.proof_of_address_url.endsWith('.pdf') ? (
                        <div className="rounded-lg border border-border w-full h-32 flex items-center justify-center bg-muted/30 hover:opacity-80 transition-opacity">
                          <FileCheck className="h-8 w-8 text-muted-foreground" />
                          <span className="ml-2 text-sm text-muted-foreground">PDF öffnen</span>
                        </div>
                      ) : (
                        <img src={selectedContract.proof_of_address_url} alt="Meldenachweis" className="rounded-lg border border-border w-full h-32 object-cover hover:opacity-80 transition-opacity" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                const c = selectedContract;
                if (!c) return;
                const birthParts = c.birth_date?.split("-");
                const birthFormatted = birthParts?.length === 3 ? `${birthParts[2]}.${birthParts[1]}.${birthParts[0]}` : (c.birth_date || "–");
                const address = `${c.street || ""}${c.street ? ", " : ""}${c.zip_code || ""} ${c.city || ""}`.trim() || "–";
                const text = `Vorname: ${c.first_name || ""} ${c.last_name || ""}\n\nGeburtsdatum: ${birthFormatted}\n\nGeburtsort: ${c.birth_place || "–"}\n\nAdresse: ${address}\n\nFamilienstand: ${c.marital_status || "–"}\n\nStaatsangehörigkeit: ${c.nationality || "–"}`;
                navigator.clipboard.writeText(text);
                toast.success("Daten kopiert!");
              }}
            >
              <Copy className="h-4 w-4 mr-1" /> Daten kopieren
            </Button>
            {selectedContract?.status === "genehmigt" && (
              <Button
                variant="ghost"
                onClick={async () => {
                  const brandingId = selectedContract?.branding_id || selectedContract?.applications?.brandings?.id;
                  const url = await buildBrandingUrl(brandingId, `/erster-arbeitstag/${selectedContract.id}`);
                  navigator.clipboard.writeText(url);
                  toast.success("1. Arbeitstag Link kopiert!");
                }}
              >
                <CalendarIcon className="h-4 w-4 mr-1" /> 1. Arbeitstag Link kopieren
              </Button>
            )}
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Schließen</Button>
            {selectedContract?.status === "eingereicht" && (
              <Button className="bg-green-600 hover:bg-green-700 text-white shadow-sm hover:shadow-md transition-all" onClick={() => openStartDateDialog(selectedContract)}>
                <CheckCircle className="h-4 w-4 mr-1" /> Genehmigen
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Preview Dialog */}
      <Dialog open={!!imagePreview} onOpenChange={() => setImagePreview(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Dokumentenvorschau</DialogTitle>
            <DialogDescription>Klicken Sie außerhalb zum Schließen.</DialogDescription>
          </DialogHeader>
          {imagePreview && (
            <img src={imagePreview} alt="Dokumentenvorschau" className="w-full rounded-lg" />
          )}
        </DialogContent>
      </Dialog>

      {/* Start Date Confirmation Dialog */}
      <Dialog open={startDateDialogOpen} onOpenChange={setStartDateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Startdatum bestätigen</DialogTitle>
            <DialogDescription>
              Bitte bestätigen oder ändern Sie das gewünschte Startdatum des Mitarbeiters.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4 py-4">
            <div className="text-sm text-muted-foreground">
              Gewähltes Datum:{" "}
              <span className="font-semibold text-foreground">
                {confirmedStartDate ? format(confirmedStartDate, "dd. MMMM yyyy", { locale: de }) : "Kein Datum"}
              </span>
            </div>
            <Calendar
              mode="single"
              selected={confirmedStartDate}
              onSelect={setConfirmedStartDate}
              locale={de}
              className="rounded-md border pointer-events-auto"
            />
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setStartDateDialogOpen(false)}>Abbrechen</Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white shadow-sm hover:shadow-md transition-all"
              disabled={!confirmedStartDate}
              onClick={() => selectedContract && handleApprove(selectedContract.id)}
            >
              <CheckCircle className="h-4 w-4 mr-1" /> Genehmigen & bestätigen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
