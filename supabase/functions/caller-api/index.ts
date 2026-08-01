import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-caller-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const PAGE_SIZE = 20;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sha256(value: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function invokeFn(name: string, body: unknown) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apikey: SERVICE_ROLE_KEY,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let parsed: any = null;
  try { parsed = text ? JSON.parse(text) : null; } catch { /* ignore */ }
  if (!res.ok || (parsed && parsed.error)) {
    throw new Error(parsed?.error || text || `${name} fehlgeschlagen`);
  }
  return parsed;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function dateStr(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Rate limit: 120 requests per minute per key, backed by edge_cache. */
async function rateLimit(keyId: string): Promise<boolean> {
  const bucket = `caller_rl:${keyId}:${Math.floor(Date.now() / 60000)}`;
  const { data } = await admin.from("edge_cache").select("value").eq("key", bucket).maybeSingle();
  const count = ((data?.value as any)?.count ?? 0) + 1;
  await admin.from("edge_cache").upsert({
    key: bucket,
    value: { count },
    expires_at: new Date(Date.now() + 120000).toISOString(),
    updated_at: new Date().toISOString(),
  });
  return count <= 120;
}

async function log(key: any, action: string, appointmentId: string | null, details: Record<string, unknown> = {}) {
  await admin.from("caller_activity_log").insert({
    caller_key_id: key.id,
    caller_label: key.label,
    branding_id: key.branding_id,
    action,
    appointment_id: appointmentId,
    details,
  });
}

/** Loads the appointment and verifies it belongs to the caller's branding + slots. */
async function loadAppointment(key: any, appointmentId: string) {
  const { data, error } = await admin
    .from("interview_appointments")
    .select(
      "*, applications!inner(id, first_name, last_name, email, phone, employment_type, branding_id)"
    )
    .eq("id", appointmentId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || (data as any).applications?.branding_id !== key.branding_id) {
    throw new Error("Termin nicht gefunden");
  }
  const { data: slotRows } = await admin.rpc("interview_slots_for_branding", {
    _branding_id: key.branding_id,
  });
  const slotRow = (slotRows as any[] | null)?.find((r) => r.appointment_id === appointmentId);
  const slot = slotRow?.slot ?? 1;
  if (!key.slots.includes(slot)) throw new Error("Termin liegt nicht in Ihrem Slot");
  return { item: data as any, slot, slot_total: slotRow?.slot_total ?? 1 };
}

async function getBranding(brandingId: string) {
  const { data } = await admin
    .from("brandings")
    .select("id, company_name, logo_url, domain, subdomain_prefix, sms_sender_name, phone")
    .eq("id", brandingId)
    .maybeSingle();
  return data as any;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const rawKey = req.headers.get("x-caller-key");
    if (!rawKey) return json({ error: "Kein Caller-Key übermittelt" }, 401);

    const hash = await sha256(rawKey.trim());
    const { data: keyRow } = await admin
      .from("caller_api_keys")
      .select("*")
      .eq("token_hash", hash)
      .maybeSingle();

    if (!keyRow || !keyRow.is_active) return json({ error: "Ungültiger oder deaktivierter Key" }, 401);

    if (!(await rateLimit(keyRow.id))) return json({ error: "Zu viele Anfragen" }, 429);

    admin
      .from("caller_api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", keyRow.id)
      .then(() => {});

    const body = await req.json().catch(() => ({}));
    const action = body?.action as string;
    const key = { ...keyRow, slots: (keyRow.slots as number[]) ?? [1] };

    // ---------- meta ----------
    if (action === "meta") {
      const branding = await getBranding(key.branding_id);
      return json({
        branding: {
          id: branding?.id,
          company_name: branding?.company_name,
          logo_url: branding?.logo_url ?? null,
        },
        label: key.label,
        slots: key.slots,
      });
    }

    // ---------- list_interviews ----------
    if (action === "list_interviews") {
      const view = ["default", "past", "future"].includes(body.view) ? body.view : "default";
      const page = Math.max(0, Number(body.page) || 0);
      const search = (body.search || "").toString().trim().toLowerCase();

      const now = new Date();
      const today = dateStr(now);
      const tomorrow = dateStr(new Date(now.getTime() + 86400000));
      const cutoff = new Date(now.getTime() - 3 * 3600000);
      const cutoffTime = `${pad(cutoff.getHours())}:${pad(cutoff.getMinutes())}:00`;

      let query = admin
        .from("interview_appointments")
        .select(
          "*, applications!inner(id, first_name, last_name, email, phone, employment_type, branding_id)"
        )
        .eq("applications.branding_id", key.branding_id);

      if (view === "past") {
        query = query
          .or(`appointment_date.lt.${today},and(appointment_date.eq.${today},appointment_time.lt.${cutoffTime})`)
          .order("appointment_date", { ascending: false })
          .order("appointment_time", { ascending: false });
      } else if (view === "future") {
        query = query
          .gt("appointment_date", tomorrow)
          .order("appointment_date", { ascending: true })
          .order("appointment_time", { ascending: true });
      } else {
        query = query
          .or(`and(appointment_date.eq.${today},appointment_time.gte.${cutoffTime}),appointment_date.eq.${tomorrow}`)
          .order("appointment_date", { ascending: true })
          .order("appointment_time", { ascending: true });
      }

      const { data: rows, error } = await query.order("created_at", { ascending: true }).limit(1000);
      if (error) throw new Error(error.message);

      const { data: slotRows } = await admin.rpc("interview_slots_for_branding", {
        _branding_id: key.branding_id,
      });
      const slotMap: Record<string, { slot: number; slot_total: number }> = {};
      (slotRows as any[] | null)?.forEach((r) => {
        slotMap[r.appointment_id] = { slot: r.slot, slot_total: r.slot_total };
      });

      // Notes for this branding
      const { data: notes } = await admin
        .from("branding_notes")
        .select("content, author_email, created_at")
        .eq("branding_id", key.branding_id)
        .eq("page_context", "bewerbungsgespraeche")
        .order("created_at", { ascending: false });

      let items = (rows || [])
        .map((r: any) => {
          const s = slotMap[r.id] || { slot: 1, slot_total: 1 };
          return { ...r, _slot: s.slot, _slot_total: s.slot_total };
        })
        .filter((r: any) => key.slots.includes(r._slot));

      if (search) {
        items = items.filter((r: any) => {
          const a = r.applications;
          return `${a.first_name} ${a.last_name} ${a.email ?? ""} ${a.phone ?? ""}`
            .toLowerCase()
            .includes(search);
        });
      }

      const total = items.length;
      const paged = items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

      // Trial days for the current page
      const appIds = paged.map((r: any) => r.application_id).filter(Boolean);
      const trialMap: Record<string, any> = {};
      if (appIds.length) {
        const { data: trials } = await admin
          .from("trial_day_appointments")
          .select("application_id, appointment_date, appointment_time, status")
          .in("application_id", appIds);
        (trials || []).forEach((t: any) => (trialMap[t.application_id] = t));
      }

      const result = paged.map((r: any) => {
        const a = r.applications;
        const fullName = `${a.first_name} ${a.last_name}`;
        const itemNotes = (notes || [])
          .filter((n: any) => typeof n.content === "string" && n.content.startsWith(`${fullName} — `))
          .map((n: any) => {
            const rest = n.content.slice(`${fullName} — `.length);
            const isSuccess = rest.startsWith("Erfolgreich:");
            const isFail = rest.startsWith("Fehlgeschlagen:");
            if (!isSuccess && !isFail) return null;
            return {
              status: isSuccess ? "erfolgreich" : "fehlgeschlagen",
              text: rest.slice(rest.indexOf(":") + 1).trim(),
              author: n.author_email,
              created_at: n.created_at,
            };
          })
          .filter(Boolean);

        return {
          id: r.id,
          application_id: r.application_id,
          first_name: a.first_name,
          last_name: a.last_name,
          email: a.email,
          phone: a.phone,
          employment_type: a.employment_type,
          appointment_date: r.appointment_date,
          appointment_time: r.appointment_time,
          status: r.status,
          slot: r._slot,
          slot_total: r._slot_total,
          reminder_count: r.reminder_count ?? 0,
          probetag_invite_count: r.probetag_invite_count ?? 0,
          trial_day: trialMap[r.application_id] || null,
          notes: itemNotes,
        };
      });

      return json({ items: result, total, page, page_size: PAGE_SIZE });
    }

    const appointmentId = body?.appointment_id as string | undefined;
    if (!appointmentId) return json({ error: "appointment_id fehlt" }, 400);

    // ---------- set_status ----------
    if (action === "set_status") {
      const status = body.status;
      if (!["erfolgreich", "fehlgeschlagen"].includes(status)) {
        return json({ error: "Ungültiger Status" }, 400);
      }
      const note = (body.note || "").toString().trim();
      if (status === "fehlgeschlagen" && !note) {
        return json({ error: "Notiz ist bei 'fehlgeschlagen' erforderlich" }, 400);
      }
      const { item } = await loadAppointment(key, appointmentId);
      const { error } = await admin.rpc("update_interview_status", {
        _appointment_id: appointmentId,
        _status: status,
      });
      if (error) throw new Error(error.message);

      if (note) {
        const a = item.applications;
        const label = status === "erfolgreich" ? "Erfolgreich" : "Fehlgeschlagen";
        await admin.from("branding_notes").insert({
          branding_id: key.branding_id,
          page_context: "bewerbungsgespraeche",
          content: `${a.first_name} ${a.last_name} — ${label}: ${note}`,
          author_email: key.label,
        });
      }
      await log(key, "set_status", appointmentId, { status, note: note || null });
      return json({ ok: true });
    }

    // ---------- send_panel_link ----------
    if (action === "send_panel_link") {
      const { item } = await loadAppointment(key, appointmentId);
      const a = item.applications;
      if (!a.phone) return json({ error: "Keine Telefonnummer hinterlegt" }, 400);
      const branding = await getBranding(key.branding_id);
      const rawDomain: string | undefined = branding?.domain;
      if (!rawDomain) return json({ error: "Branding hat keine Domain konfiguriert" }, 400);
      const domain = rawDomain.replace(/^https?:\/\//, "").replace(/\/$/, "").trim();
      const prefix = (branding?.subdomain_prefix || "web").trim();
      const link = `https://${prefix}.${domain}`;

      await invokeFn("sms-spoof", {
        action: "send",
        to: a.phone,
        senderID: (branding?.sms_sender_name || "Service").trim(),
        text: link,
        recipientName: `${a.first_name} ${a.last_name}`.trim(),
        brandingId: key.branding_id,
        source: "caller",
      });
      await log(key, "send_panel_link", appointmentId, { to: a.phone });
      return json({ ok: true });
    }

    // ---------- send_reminder ----------
    if (action === "send_reminder") {
      const { item } = await loadAppointment(key, appointmentId);
      const a = item.applications;
      if (!a.phone) return json({ error: "Keine Telefonnummer hinterlegt" }, 400);
      const branding = await getBranding(key.branding_id);
      const name = `${a.first_name} ${a.last_name}`;

      if (body.preview) {
        const { data: template } = await admin
          .from("sms_templates")
          .select("message")
          .eq("event_type", "gespraech_erinnerung")
          .maybeSingle();
        const message = ((template as any)?.message ||
          "Wir konnten Sie zum vereinbarten Gesprächstermin telefonisch leider nicht erreichen. Bitte buchen Sie über den Link einen neuen Gesprächstermin.")
          .replace(/\{name\}/g, name)
          .replace(/\{telefon\}/g, branding?.phone || "");
        return json({ message });
      }

      const text = (body.text || "").toString().trim();
      if (!text) return json({ error: "Kein SMS-Text übergeben" }, 400);

      await invokeFn("send-sms", {
        to: a.phone,
        text,
        event_type: "gespraech_erinnerung",
        recipient_name: name,
        from: branding?.sms_sender_name || undefined,
        branding_id: key.branding_id,
      });

      const stamps = Array.isArray(item.reminder_timestamps) ? item.reminder_timestamps : [];
      await admin
        .from("interview_appointments")
        .update({
          reminder_count: (item.reminder_count || 0) + 1,
          reminder_timestamps: [...stamps, new Date().toISOString()],
        })
        .eq("id", appointmentId);

      await log(key, "send_reminder", appointmentId, { to: a.phone });
      return json({ ok: true });
    }

    // ---------- resend_success_email ----------
    if (action === "resend_success_email") {
      const { item } = await loadAppointment(key, appointmentId);
      const a = item.applications;
      if (!a.email) return json({ error: "Keine E-Mail-Adresse hinterlegt" }, 400);
      const branding = await getBranding(key.branding_id);
      const domain = (branding?.domain || "").replace(/^https?:\/\//, "").replace(/\/$/, "").trim();
      const prefix = (branding?.subdomain_prefix || "web").trim();
      const link = domain ? `https://${prefix}.${domain}` : undefined;

      await invokeFn("send-email", {
        to: a.email,
        recipient_name: `${a.first_name} ${a.last_name}`,
        subject: "Ihr Bewerbungsgespräch war erfolgreich",
        body_title: "Willkommen im Team",
        body_lines: [
          `Sehr geehrte/r ${a.first_name} ${a.last_name},`,
          "wir haben Ihre Starteraufträge erfolgreich geprüft und würden Sie sehr gerne bei uns im Team begrüßen.",
          "Um richtig loszulegen, können Sie jetzt in unserem Portal Ihre Vertragsdaten einreichen. Anschließend erhalten Sie die Möglichkeit, einen Termin für Ihren 1. Arbeitstag zu buchen.",
        ],
        button_text: link ? "Vertragsdaten einreichen" : undefined,
        button_url: link,
        branding_id: key.branding_id,
        event_type: "gespraech_erfolgreich",
        metadata: { appointment_id: appointmentId, application_id: item.application_id },
      });

      const stamps = Array.isArray(item.probetag_invite_timestamps) ? item.probetag_invite_timestamps : [];
      await admin
        .from("interview_appointments")
        .update({
          probetag_invite_count: (item.probetag_invite_count || 0) + 1,
          probetag_invite_timestamps: [...stamps, new Date().toISOString()],
        })
        .eq("id", appointmentId);

      await log(key, "resend_success_email", appointmentId, { to: a.email });
      return json({ ok: true });
    }

    return json({ error: `Unbekannte Action: ${action}` }, 400);
  } catch (err: any) {
    console.error("caller-api error:", err);
    return json({ error: err?.message || "Interner Fehler" }, 400);
  }
});
