import { useEffect, useState } from "react";
import { publicSupabase as supabase } from "@/integrations/supabase/publicClient";

const FALLBACK = "https://bbm-consult.solutions/karriere/onlineprozess-tester";

const KarriereRedirect = () => {
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const host = window.location.hostname.toLowerCase().replace(/^www\./, "");
        const parts = host.split(".");
        const root = parts.length > 2 ? parts.slice(-2).join(".") : host;
        const { data } = await supabase
          .from("brandings")
          .select("karriere_iframe_url")
          .eq("domain", root)
          .limit(1)
          .maybeSingle();
        let url = (data as any)?.karriere_iframe_url as string | null;
        if (!data) {
          const { data: extra } = await supabase
            .from("brandings")
            .select("karriere_iframe_url")
            .overlaps("additional_domains", [host, root])
            .limit(1)
            .maybeSingle();
          url = (extra as any)?.karriere_iframe_url ?? null;
        }
        setTarget(url && url.trim() ? url.trim() : FALLBACK);
      } catch {
        setTarget(FALLBACK);
      }
    };
    load();
  }, []);

  if (!target) return null;

  return (
    <iframe
      src={target}
      title="Karriere"
      style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh", border: "none" }}
    />
  );
};

export default KarriereRedirect;
