import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const key = req.headers.get('x-import-key')
  if (!key || key !== Deno.env.get('DB_REPLAY_KEY')) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
  try {
    const body = await req.json()
    const table = String(body.table ?? '')
    const rows = body.rows
    if (!['applications', 'interview_appointments'].includes(table) || !Array.isArray(rows)) {
      return new Response(JSON.stringify({ error: 'bad request' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { error } = await supabase.from(table).insert(rows)
    if (error) throw error
    return new Response(JSON.stringify({ inserted: rows.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
