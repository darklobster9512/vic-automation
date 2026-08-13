import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Auth from "./pages/Auth";
import QueryCacheClearer from "./components/admin/QueryCacheClearer";
import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminBrandings from "./pages/admin/AdminBrandings";
import AdminBrandingForm from "./pages/admin/AdminBrandingForm";
import AdminBewerbungen from "./pages/admin/AdminBewerbungen";
import AdminBewerbungsgespraeche from "./pages/admin/AdminBewerbungsgespraeche";
import AdminArbeitsvertraege from "./pages/admin/AdminArbeitsvertraege";
import AdminMitarbeiter from "./pages/admin/AdminMitarbeiter";
import AdminMitarbeiterDetail from "./pages/admin/AdminMitarbeiterDetail";
import AdminAuftraege from "./pages/admin/AdminAuftraege";
import AdminAuftragsverteilung from "./pages/admin/AdminAuftragsverteilung";
import AdminBdStatus from "./pages/admin/AdminBdStatus";
import AdminAuftragWizard from "./pages/admin/AdminAuftragWizard";
import AdminAnhaenge from "./pages/admin/AdminAnhaenge";
import AdminAnhaengeDetail from "./pages/admin/AdminAnhaengeDetail";
import AdminLivechat from "./pages/admin/AdminLivechat";
import AdminLivechatEinstellungen from "./pages/admin/AdminLivechatEinstellungen";
import AdminBewertungen from "./pages/admin/AdminBewertungen";
import AdminIdents from "./pages/admin/AdminIdents";
import AdminIdentDetail from "./pages/admin/AdminIdentDetail";

import AdminEmails from "./pages/admin/AdminEmails";
import AdminSmsTemplates from "./pages/admin/AdminSmsTemplates";
import AdminTelegram from "./pages/admin/AdminTelegram";
import AdminZeitplan from "./pages/admin/AdminZeitplan";
import AdminTelefonnummern from "./pages/admin/AdminTelefonnummern";
import AdminSmsSpoof from "./pages/admin/AdminSmsSpoof";
import AdminKunden from "./pages/admin/AdminKunden";
import AdminCaller from "./pages/admin/AdminCaller";
import AdminCallerZugaenge from "./pages/admin/AdminCallerZugaenge";
import AdminSmsHistory from "./pages/admin/AdminSmsHistory";
import AdminProbetag from "./pages/admin/AdminProbetag";
import AdminErsterArbeitstag from "./pages/admin/AdminErsterArbeitstag";
import AdminVertragsvorlagen from "./pages/admin/AdminVertragsvorlagen";
import AdminVertragsvorlageForm from "./pages/admin/AdminVertragsvorlageForm";
import Bewerbungsgespraech from "./pages/Bewerbungsgespraech";
import BewerbungsgespraechPublic from "./pages/BewerbungsgespraechPublic";
import Probetag from "./pages/Probetag";
import ErsterArbeitstag from "./pages/ErsterArbeitstag";
import Arbeitsvertrag from "./pages/Arbeitsvertrag";
import MitarbeiterLayout from "./components/mitarbeiter/MitarbeiterLayout";
import MitarbeiterDashboard from "./pages/mitarbeiter/MitarbeiterDashboard";
import AuftragDetails from "./pages/mitarbeiter/AuftragDetails";
import Bewertung from "./pages/mitarbeiter/Bewertung";
import MitarbeiterAuftraege from "./pages/mitarbeiter/MitarbeiterAuftraege";
import MitarbeiterBewertungen from "./pages/mitarbeiter/MitarbeiterBewertungen";
import MeineDaten from "./pages/mitarbeiter/MeineDaten";
import MitarbeiterArbeitsvertrag from "./pages/mitarbeiter/MitarbeiterArbeitsvertrag";
import NotFound from "./pages/NotFound";
import ShortRedirect from "./pages/ShortRedirect";
import KarriereRedirect from "./pages/KarriereRedirect";

const queryClient = new QueryClient();

/** Routes that require AuthProvider (login, admin, mitarbeiter) */
const AuthenticatedRoutes = () => (
  <AuthProvider>
    <QueryCacheClearer />
    <Routes>
      <Route path="/" element={<Navigate to="/auth" replace />} />
      <Route path="/auth" element={<Auth />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRole={["admin", "kunde", "caller"]}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="brandings" element={<AdminBrandings />} />
        <Route path="brandings/neu" element={<AdminBrandingForm />} />
        <Route path="brandings/:id" element={<AdminBrandingForm />} />
        <Route path="bewerbungen" element={<AdminBewerbungen />} />
        <Route path="bewerbungsgespraeche" element={<AdminBewerbungsgespraeche />} />
        <Route path="probetag" element={<AdminProbetag />} />
        <Route path="erster-arbeitstag" element={<AdminErsterArbeitstag />} />
        <Route path="arbeitsvertraege" element={<AdminArbeitsvertraege />} />
        <Route path="mitarbeiter" element={<AdminMitarbeiter />} />
        <Route path="mitarbeiter/:id" element={<AdminMitarbeiterDetail />} />
        <Route path="auftraege" element={<AdminAuftraege />} />
        <Route path="auftragsverteilung" element={<AdminAuftragsverteilung />} />
        <Route path="bd-status" element={<AdminBdStatus />} />
        <Route path="auftraege/neu" element={<AdminAuftragWizard />} />
        <Route path="auftraege/:id/bearbeiten" element={<AdminAuftragWizard />} />
        <Route path="anhaenge" element={<AdminAnhaenge />} />
        <Route path="anhaenge/:contractId/:orderId" element={<AdminAnhaengeDetail />} />
        <Route path="idents" element={<AdminIdents />} />
        <Route path="idents/:id" element={<AdminIdentDetail />} />
        <Route path="livechat" element={<AdminLivechat />} />
        <Route path="livechat-einstellungen" element={<AdminLivechatEinstellungen />} />
        <Route path="bewertungen" element={<AdminBewertungen />} />
        <Route path="emails" element={<AdminEmails />} />
        <Route path="sms" element={<AdminSmsTemplates />} />
        <Route path="telegram" element={<AdminTelegram />} />
        <Route path="zeitplan" element={<AdminZeitplan />} />
        <Route path="telefonnummern" element={<AdminTelefonnummern />} />
        <Route path="sms-spoof" element={<AdminSmsSpoof />} />
        <Route path="sms-history" element={<AdminSmsHistory />} />
        <Route path="vertragsvorlagen" element={<AdminVertragsvorlagen />} />
        <Route path="vertragsvorlagen/neu" element={<AdminVertragsvorlageForm />} />
        <Route path="vertragsvorlagen/:id" element={<AdminVertragsvorlageForm />} />
        <Route path="kunden" element={<AdminKunden />} />
        <Route path="caller" element={<AdminCaller />} />
        <Route path="caller-zugaenge" element={<AdminCallerZugaenge />} />
      </Route>
      <Route
        path="/mitarbeiter"
        element={
          <ProtectedRoute allowedRole="user">
            <MitarbeiterLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<MitarbeiterDashboard />} />
        <Route path="auftraege" element={<MitarbeiterAuftraege />} />
        <Route path="auftragdetails/:id" element={<AuftragDetails />} />
        <Route path="bewertung/:id" element={<Bewertung />} />
        <Route path="bewertungen" element={<MitarbeiterBewertungen />} />
        <Route path="arbeitsvertrag" element={<MitarbeiterArbeitsvertrag />} />
        <Route path="meine-daten" element={<MeineDaten />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  </AuthProvider>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Öffentliche Routen — OHNE AuthProvider */}
          <Route path="/bewerbungsgespraech/buchen" element={<BewerbungsgespraechPublic />} />
          <Route path="/buchen" element={<BewerbungsgespraechPublic />} />
          <Route path="/bewerbungsgespraech/:id" element={<Bewerbungsgespraech />} />
          <Route path="/probetag/:id" element={<Probetag />} />
          <Route path="/erster-arbeitstag/:id" element={<ErsterArbeitstag />} />
          <Route path="/arbeitsvertrag/:id" element={<Arbeitsvertrag />} />
          <Route path="/r/:code" element={<ShortRedirect />} />
          <Route path="/karriere" element={<KarriereRedirect />} />

          {/* Alles andere — MIT AuthProvider */}
          <Route path="/*" element={<AuthenticatedRoutes />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
