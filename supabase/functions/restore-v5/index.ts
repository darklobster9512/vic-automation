import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } },
)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  try {
    const body = await req.json()
    const action = String(body.action || '')

    if (action === 'orders') {
      const pairs: Array<{ bid: string; title: string; source?: string; replace?: [string, string] }> = body.pairs
      const out: Record<string, string> = {}
      for (const p of pairs) {
        const { data: existing } = await admin.from('orders').select('id')
          .eq('branding_id', p.bid).eq('title', p.title).limit(1)
        if (existing && existing.length) { out[`${p.bid}|${p.title}`] = existing[0].id; continue }
        const { data: src } = await admin.from('orders').select('*')
          .eq('title', p.source || p.title).order('created_at').limit(1)
        if (!src || !src.length) { out[`${p.bid}|${p.title}`] = ''; continue }
        const s: Record<string, unknown> = { ...src[0] }
        delete s.id; delete s.created_at; delete s.created_by; delete s.order_number
        s.branding_id = p.bid
        s.title = p.title
        if (p.replace) {
          const [from, to] = p.replace
          const swap = (v: unknown): unknown =>
            typeof v === 'string' ? v.split(from).join(to)
              : Array.isArray(v) ? v.map(swap)
                : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, swap(x)]))
                  : v
          for (const k of ['description', 'project_goal', 'work_steps', 'review_questions', 'required_attachments']) {
            s[k] = swap(s[k])
          }
        }
        const { data: ins, error } = await admin.from('orders').insert(s).select('id').single()
        if (error) return json({ error: error.message, title: p.title }, 400)
        out[`${p.bid}|${p.title}`] = ins.id
      }
      return json({ ok: true, map: out })
    }

    if (action === 'users') {
      const out: Record<string, string> = {}
      for (const u of body.users as Array<{ email: string; password: string; name: string; phone: string }>) {
        const { data, error } = await admin.auth.admin.createUser({
          email: u.email, password: u.password, email_confirm: true,
          user_metadata: { full_name: u.name, phone: u.phone },
        })
        if (error) {
          const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 })
          out[u.email] = ''
          console.log('user error', u.email, error.message, list?.users?.length)
          continue
        }
        out[u.email] = data.user!.id
      }
      return json({ ok: true, map: out })
    }

    if (action === 'reviews') {
      const items = body.items as Array<{ contract_id: string; order_id: string; rating: number; quote: string; created_at: string }>
      const ids = [...new Set(items.map((i) => i.order_id))]
      const map: Record<string, string[]> = {}
      for (let i = 0; i < ids.length; i += 50) {
        const { data } = await admin.from('orders').select('id,review_questions').in('id', ids.slice(i, i + 50))
        for (const o of data || []) {
          const qs = Array.isArray(o.review_questions) ? o.review_questions : []
          map[o.id] = qs.map((q: unknown) => typeof q === 'string' ? q : String((q as Record<string, unknown>)?.question ?? ''))
            .filter((q: string) => q.length > 0)
        }
      }
      const rows: unknown[] = []
      for (const it of items) {
        const qs = map[it.order_id]?.length ? map[it.order_id] : ['Gesamtbewertung des Auftrags']
        qs.forEach((q, idx) => {
          rows.push({
            order_id: it.order_id, contract_id: it.contract_id, question: q,
            rating: Math.max(1, Math.min(5, Math.round(it.rating))),
            comment: idx === 0 && it.quote ? it.quote : 'Alles hat wie beschrieben funktioniert.',
            created_at: it.created_at,
          })
        })
      }
      for (let i = 0; i < rows.length; i += 500) {
        const { error } = await admin.from('order_reviews').insert(rows.slice(i, i + 500))
        if (error) return json({ error: error.message }, 400)
      }
      return json({ ok: true, count: rows.length })
    }

    if (action === 'attachments') {
      const items = body.items as Array<{ contract_id: string; order_id: string; created_at: string }>
      const ids = [...new Set(items.map((i) => i.order_id))]
      const map: Record<string, number> = {}
      for (let i = 0; i < ids.length; i += 50) {
        const { data } = await admin.from('orders').select('id,required_attachments').in('id', ids.slice(i, i + 50))
        for (const o of data || []) map[o.id] = Array.isArray(o.required_attachments) ? o.required_attachments.length : 1
      }
      const rows: unknown[] = []
      for (const it of items) {
        const n = Math.max(1, map[it.order_id] || 1)
        for (let i = 0; i < n; i++) {
          rows.push({
            order_id: it.order_id, contract_id: it.contract_id, attachment_index: i,
            file_url: 'https://placeholder.invalid/nachweis-nicht-wiederherstellbar',
            file_name: `nachweis-${i + 1}.jpg`, status: 'in_pruefung', created_at: it.created_at,
          })
        }
      }
      const { error } = await admin.from('order_attachments').insert(rows)
      if (error) return json({ error: error.message }, 400)
      return json({ ok: true, count: rows.length })
    }

    if (action === 'insert') {
      const { table, rows } = body as { table: string; rows: unknown[] }
      const { error } = await admin.from(table).insert(rows)
      if (error) return json({ error: error.message }, 400)
      return json({ ok: true, count: rows.length })
    }

    if (action === 'upsert') {
      const { table, rows, onConflict } = body as { table: string; rows: unknown[]; onConflict: string }
      const { error } = await admin.from(table).upsert(rows as never, { onConflict, ignoreDuplicates: true })
      if (error) return json({ error: error.message }, 400)
      return json({ ok: true, count: rows.length })
    }

    if (action === 'update') {
      const { table, match, values } = body as { table: string; match: Record<string, unknown>; values: Record<string, unknown> }
      const { error } = await admin.from(table).update(values).match(match)
      if (error) return json({ error: error.message }, 400)
      return json({ ok: true })
    }

    return json({ error: 'unknown action' }, 400)
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
