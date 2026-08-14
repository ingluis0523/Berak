const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)\s*$/);
  if (match) {
    let value = match[2].trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    env[match[1].trim()] = value;
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase env variables in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Fetching users mapping...");
  const { data: usuarios } = await supabase.from('usuarios').select('id, persona_id');
  const userToPersona = new Map();
  usuarios.forEach(u => userToPersona.set(u.id, u.persona_id));

  console.log("Fetching personas...");
  const { data: personas } = await supabase.from('personas').select('id, nombres, apellidos');
  const personaMap = new Map();
  personas.forEach(p => personaMap.set(p.id, `${p.nombres} ${p.apellidos}`));

  console.log("Fetching asistencias...");
  const { data: asistencias } = await supabase
    .from('asistencias')
    .select('registrado_por, evento_id, persona_id, created_at')
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  console.log(`Total asistencias in last 30 days: ${asistencias?.length ?? 0}`);

  const rawCounts = {}; // auth.users.id -> list of asistencias
  const uniqueEvents = {}; // auth.users.id -> Set of event_ids

  (asistencias ?? []).forEach(a => {
    if (!a.registrado_por) return;
    if (!rawCounts[a.registrado_por]) rawCounts[a.registrado_por] = 0;
    rawCounts[a.registrado_por]++;

    if (!uniqueEvents[a.registrado_por]) uniqueEvents[a.registrado_por] = new Set();
    uniqueEvents[a.registrado_por].add(a.evento_id);
  });

  console.log("\n--- LEADERS STATS ---");
  for (const userId in uniqueEvents) {
    const personaId = userToPersona.get(userId) || userId;
    const name = personaMap.get(personaId) || `User: ${userId}`;
    const totalAttendees = rawCounts[userId];
    const totalEvents = uniqueEvents[userId].size;
    console.log(`Líder: ${name}`);
    console.log(`  - Total personas registradas (rows in asistencias): ${totalAttendees}`);
    console.log(`  - Total eventos registrados (unique events): ${totalEvents}`);
  }
}

run().catch(console.error);
