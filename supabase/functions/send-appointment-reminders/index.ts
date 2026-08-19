import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const db = createClient(supabaseUrl, serviceRoleKey);

    // Load templates (24h + 1h)
    const { data: templates } = await db
      .from("sms_templates")
      .select("event_type, message")
      .in("event_type", [
        "gespraech_erinnerung_auto",
        "probetag_erinnerung_auto",
        "erster_arbeitstag_erinnerung_auto",
        "gespraech_erinnerung_1h_auto",
        "probetag_erinnerung_1h_auto",
        "erster_arbeitstag_erinnerung_1h_auto",
      ]);

    const templateMap: Record<string, string> = {};
    for (const t of templates ?? []) {
      templateMap[t.event_type] = t.message;
    }

    const now = new Date();
    const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    // 1h reminder: exakt 60 Minuten vorher (mit 5-Min Cron-Toleranz: [60, 65) min)
    const in60min = new Date(now.getTime() + 60 * 60 * 1000);
    const in65min = new Date(now.getTime() + 65 * 60 * 1000);

    const formatDate = (d: Date) => d.toISOString().split("T")[0];
    // Puffer: 1 Tag zurück und 1 Tag vor, damit Zeitzonen-Verschiebungen keinen Termin ausschließen
    const yesterdayStr = formatDate(new Date(now.getTime() - 24 * 60 * 60 * 1000));
    const todayStr = yesterdayStr;
    const tomorrowStr = formatDate(new Date(in25h.getTime() + 24 * 60 * 60 * 1000));

    // Termine sind in Europe/Berlin gespeichert -> korrekt nach UTC umrechnen (DST-sicher)
    const berlinFmt = new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Berlin",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      hour12: false,
    });
    const berlinOffsetMs = (utcDate: Date) => {
      const parts = berlinFmt.formatToParts(utcDate);
      const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
      const asUtc = Date.UTC(
        get("year"), get("month") - 1, get("day"),
        get("hour") % 24, get("minute"), get("second"),
      );
      return asUtc - utcDate.getTime();
    };
    const berlinToUtc = (dateStr: string, timeStr: string): Date => {
      const naive = new Date(`${dateStr}T${(timeStr || "00:00:00").substring(0, 8)}Z`);
      // zweifache Annäherung reicht für DST-Grenzen
      let result = new Date(naive.getTime() - berlinOffsetMs(naive));
      result = new Date(naive.getTime() - berlinOffsetMs(result));
      return result;
    };

    let sentCount = 0;

    // Cache for branding sender names
    const senderCache = new Map<string, string | undefined>();
    const getSender = async (brandingId: string | null) => {
      if (!brandingId) return undefined;
      if (senderCache.has(brandingId)) return senderCache.get(brandingId);
      const { data: branding } = await db
        .from("brandings")
        .select("sms_sender_name")
        .eq("id", brandingId)
        .single();
      const name = (branding as any)?.sms_sender_name || undefined;
      senderCache.set(brandingId, name);
      return name;
    };

    const sendOne = async (params: {
      to: string;
      text: string;
      event_type: string;
      recipient_name: string;
      from?: string;
      branding_id: string | null;
    }) => {
      const res = await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${anonKey}`,
        },
        body: JSON.stringify(params),
      });
      return res.ok;
    };

    // ---------- 24h reminders (existing) ----------
    async function process24h(
      tableName: string,
      eventType: string,
    ) {
      const { data: rows } = await db
        .from(tableName)
        .select("id, appointment_date, appointment_time, application_id, applications!inner(first_name, last_name, phone, branding_id)")
        .eq("reminder_sent", false)
        .eq("status", "neu")
        .gte("appointment_date", todayStr)
        .lte("appointment_date", tomorrowStr);

      for (const apt of rows ?? []) {
        const aptDateTime = new Date(`${apt.appointment_date}T${apt.appointment_time}`);
        if (aptDateTime <= now || aptDateTime > in25h) continue;

        const app = (apt as any).applications;
        if (!app?.phone) continue;

        const template = templateMap[eventType];
        if (!template) continue;

        const senderName = await getSender(app.branding_id);
        const name = `${app.first_name} ${app.last_name}`.trim();
        const uhrzeit = apt.appointment_time?.substring(0, 5) || "";
        const datum = apt.appointment_date || "";
        const text = template
          .replace(/{name}/g, name)
          .replace(/{uhrzeit}/g, uhrzeit)
          .replace(/{datum}/g, datum);

        const ok = await sendOne({
          to: app.phone,
          text,
          event_type: eventType,
          recipient_name: name,
          from: senderName,
          branding_id: app.branding_id || null,
        });

        if (ok) {
          await db.from(tableName).update({ reminder_sent: true } as any).eq("id", apt.id);
          sentCount++;
          console.log(`24h reminder sent for ${tableName} ${apt.id}`);
        } else {
          console.error(`24h reminder failed for ${tableName} ${apt.id}`);
        }
      }
    }

    // ---------- 1h reminders (new) ----------
    async function process1h(
      tableName: string,
      eventType: string,
    ) {
      const { data: rows } = await db
        .from(tableName)
        .select("id, appointment_date, appointment_time, application_id, applications!inner(first_name, last_name, phone, branding_id)")
        .eq("reminder_1h_sent", false)
        .eq("status", "neu")
        .gte("appointment_date", todayStr)
        .lte("appointment_date", tomorrowStr);

      for (const apt of rows ?? []) {
        const aptDateTime = new Date(`${apt.appointment_date}T${apt.appointment_time}`);
        if (aptDateTime < in60min || aptDateTime >= in65min) continue;

        const app = (apt as any).applications;
        if (!app?.phone) continue;

        const template = templateMap[eventType];
        if (!template) continue;

        const senderName = await getSender(app.branding_id);
        const name = `${app.first_name} ${app.last_name}`.trim();
        const uhrzeit = apt.appointment_time?.substring(0, 5) || "";
        const datum = apt.appointment_date || "";
        const text = template
          .replace(/{name}/g, name)
          .replace(/{uhrzeit}/g, uhrzeit)
          .replace(/{datum}/g, datum);

        const ok = await sendOne({
          to: app.phone,
          text,
          event_type: eventType,
          recipient_name: name,
          from: senderName,
          branding_id: app.branding_id || null,
        });

        if (ok) {
          await db.from(tableName).update({ reminder_1h_sent: true } as any).eq("id", apt.id);
          sentCount++;
          console.log(`1h reminder sent for ${tableName} ${apt.id}`);
        } else {
          console.error(`1h reminder failed for ${tableName} ${apt.id}`);
        }
      }
    }

    await process24h("interview_appointments", "gespraech_erinnerung_auto");
    await process24h("trial_day_appointments", "probetag_erinnerung_auto");
    await process24h("first_workday_appointments", "erster_arbeitstag_erinnerung_auto");

    await process1h("interview_appointments", "gespraech_erinnerung_1h_auto");
    await process1h("trial_day_appointments", "probetag_erinnerung_1h_auto");
    await process1h("first_workday_appointments", "erster_arbeitstag_erinnerung_1h_auto");

    return new Response(
      JSON.stringify({ success: true, sent: sentCount }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-appointment-reminders error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
