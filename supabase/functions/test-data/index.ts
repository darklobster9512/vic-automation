import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve((req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const data = {
    anrede: 'Herr',
    vorname: 'Fabian',
    nachname: 'Schmidt',
    geburtsdatum: '15.10.1991',
    geburtsort: 'Berlin',
    familienstand: 'ledig',
    staatsangehoerigkeit: 'Deutschland',
    strasse: 'Quellenstr.',
    hausnummer: '42',
    plz: '59556',
    stadt: 'Lippstadt',
    telefonnummer: '017637235412',
    email: 'susannemueller@web.de',
    geburtsland: 'Deutschland',
    passwort: 'BBva551xx',
  };

  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  });
});
