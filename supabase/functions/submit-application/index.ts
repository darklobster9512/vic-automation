import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildTelegramMessage } from "../_shared/telegramMessage.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return new Response(
        JSON.stringify({ error: "Content-Type must be multipart/form-data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const formData = await req.formData();

    const first_name = (formData.get("first_name") as string)?.trim();
    const last_name = (formData.get("last_name") as string)?.trim();
    const email = (formData.get("email") as string)?.trim();
    const phone = (formData.get("phone") as string)?.trim() || null;
    const street = (formData.get("street") as string)?.trim() || null;
    const zip_code = (formData.get("zip_code") as string)?.trim() || null;
    const city = (formData.get("city") as string)?.trim() || null;
    const employment_type = (formData.get("employment_type") as string)?.trim();
    const branding_id = (formData.get("branding_id") as string)?.trim() || null;
    const resume = formData.get("resume") as File | null;
    const auto_accept = (formData.get("auto_accept") as string)?.trim() === "true";
    const skip_acceptance_email =
      (formData.get("skip_acceptance_email") as string)?.trim() === "true";
    const public_booking = (formData.get("public_booking") as string)?.trim() === "true";

    // Validate required fields
    const missing: string[] = [];
    if (!first_name) missing.push("first_name");
    if (!last_name) missing.push("last_name");
    if (!email) missing.push("email");
    if (!auto_accept && !employment_type) missing.push("employment_type");

    if (missing.length > 0) {
      return new Response(
        JSON.stringify({ error: "Missing required fields", fields: missing }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate employment_type (skip if auto_accept and not provided)
    const validTypes = ["minijob", "teilzeit", "vollzeit"];
    if (employment_type && !validTypes.includes(employment_type)) {
      return new Response(
        JSON.stringify({ error: "Invalid employment_type. Must be: minijob, teilzeit, or vollzeit" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Validate branding_id if provided
    if (branding_id) {
      const { data: branding, error: brandingError } = await supabase
        .from("brandings")
        .select("id")
        .eq("id", branding_id)
        .maybeSingle();

      if (brandingError || !branding) {
        return new Response(
          JSON.stringify({ error: "Invalid branding_id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Upload resume if provided
    let resume_url: string | null = null;

    if (resume && resume.size > 0) {
      // Validate file type
      if (resume.type !== "application/pdf") {
        return new Response(
          JSON.stringify({ error: "Resume must be a PDF file" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Max 10MB
      if (resume.size > 10 * 1024 * 1024) {
        return new Response(
          JSON.stringify({ error: "Resume file too large (max 10MB)" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const fileExt = "pdf";
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `resumes/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("application-documents")
        .upload(filePath, resume, {
          contentType: "application/pdf",
          upsert: false,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        return new Response(
          JSON.stringify({ error: "Failed to upload resume" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: publicUrlData } = supabase.storage
        .from("application-documents")
        .getPublicUrl(filePath);

      resume_url = publicUrlData.publicUrl;
    }

    // Determine created_by from branding owner
    let owner_id: string | null = null;
    if (branding_id) {
      const { data: brandingRow } = await supabase
        .from("brandings")
        .select("created_by")
        .eq("id", branding_id)
        .maybeSingle();
      if (brandingRow?.created_by) {
        owner_id = brandingRow.created_by;
      }
    }

    // Insert application
    const { data: application, error: insertError } = await supabase
      .from("applications")
      .insert({
        first_name: first_name!,
        last_name: last_name!,
        email: email!,
        phone,
        street,
        zip_code,
        city,
        employment_type: employment_type || null,
        branding_id: branding_id || null,
        resume_url,
        created_by: owner_id,
        status: auto_accept ? "bewerbungsgespraech" : "neu",
        accepted_at: auto_accept ? new Date().toISOString() : null,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create application" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send confirmation email (and acceptance SMS) — skipped for direct booking flow
    try {
      const sendEmailUrl = `${supabaseUrl}/functions/v1/send-email`;
      const fullName = `${first_name} ${last_name}`;

      if (skip_acceptance_email) {
        console.log("skip_acceptance_email=true → no acceptance email/SMS sent");
      } else if (auto_accept) {
        // "Bewerbung angenommen" email with booking button (same as AdminBewerbungen)
        let bookingUrl = "";
        let karriereLink = "";
        if (branding_id) {
          const { data: brandingDomain } = await supabase
            .from("brandings")
            .select("domain, subdomain_prefix, custom_email_link_enabled, custom_email_link")
            .eq("id", branding_id)
            .maybeSingle();
          const customEnabled = (brandingDomain as any)?.custom_email_link_enabled;
          const customLinkRaw = (brandingDomain as any)?.custom_email_link as string | null | undefined;
          if (customEnabled && customLinkRaw && customLinkRaw.trim()) {
            const customLink = customLinkRaw.replace(/^https?:\/\//, "").replace(/\/$/, "").trim();
            bookingUrl = `https://${customLink}/bewerbungsgespraech/${application.id}`;
            karriereLink = `https://${customLink}/karriere`;
          } else if (brandingDomain?.domain) {
            const domain = brandingDomain.domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
            const prefix = brandingDomain.subdomain_prefix || "web";
            bookingUrl = `https://${prefix}.${domain}/bewerbungsgespraech/${application.id}`;
            karriereLink = `https://${domain}/karriere`;
          }
        }

        const footerLines = karriereLink
          ? [`Besuchen Sie auch unsere Karriereseite: ${karriereLink}`]
          : [];

        await fetch(sendEmailUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceRoleKey}` },
          body: JSON.stringify({
            to: email,
            recipient_name: fullName,
            subject: "Ihre Bewerbung wurde angenommen",
            body_title: "Ihre Bewerbung wurde angenommen",
            body_lines: [
              `Sehr geehrte/r ${fullName},`,
              "wir freuen uns, Ihnen mitzuteilen, dass Ihre Bewerbung angenommen wurde.",
              "Bitte buchen Sie nun einen Termin für Ihr Bewerbungsgespräch über den folgenden Link.",
            ],
            button_text: "Termin buchen",
            button_url: bookingUrl,
            footer_lines: footerLines,
            branding_id: branding_id || null,
            event_type: "bewerbung_angenommen",
            metadata: { application_id: application.id },
          }),
        });
      } else {
        // Standard "Bewerbung eingegangen" email
        await fetch(sendEmailUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceRoleKey}` },
          body: JSON.stringify({
            to: email,
            recipient_name: fullName,
            subject: "Ihre Bewerbung ist eingegangen",
            body_title: "Vielen Dank für Ihre Bewerbung",
            body_lines: [
              `Sehr geehrte/r ${fullName},`,
              "wir haben Ihre Bewerbung erhalten und werden diese sorgfältig prüfen.",
              "Wir melden uns zeitnah bei Ihnen mit weiteren Informationen zum Bewerbungsprozess.",
            ],
            branding_id: branding_id || null,
            event_type: "bewerbung_eingegangen",
            metadata: { application_id: application.id },
          }),
        });
      }
    } catch (emailErr) {
      console.error("send-email call failed:", emailErr);
    }

    // Send Telegram notification
    try {
      const sendTelegramUrl = `${supabaseUrl}/functions/v1/send-telegram`;
      await fetch(sendTelegramUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceRoleKey}` },
        body: JSON.stringify({
          event_type: "bewerbung_eingegangen",
          message: buildTelegramMessage({
            icon: "📝",
            title: "Neue Bewerbung eingegangen",
            fields: [
              { icon: "👤", label: "Name", value: `${first_name} ${last_name}`.trim(), bold: true },
              { icon: "✉️", label: "E-Mail", value: email },
              { icon: "📱", label: "Telefon", value: phone },
              { icon: "📍", label: "Ort", value: [zip_code, city].filter(Boolean).join(" ") },
              { icon: "💼", label: "Art", value: employment_type },
              { icon: "📄", label: "Lebenslauf", value: resume ? "Ja" : "Nein" },
              { icon: "⚡", label: "Auto-Annahme", value: auto_accept ? "Ja" : null },
            ],
          }),
          branding_id: branding_id || undefined,
        }),
      });
    } catch (tgErr) {
      console.error("Telegram notification failed:", tgErr);
    }

    return new Response(
      JSON.stringify({ success: true, application_id: application.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
