const SB_URL = "https://xlzkasdskatnikuavefh.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhsemthc2Rza2F0bmlrdWF2ZWZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4OTE3NzQsImV4cCI6MjA4NzQ2Nzc3NH0.SR9tIpvL0YnV9CNrRq4T-xetifuNQOJZE0OnQpwtYLM";

export default async function handler(req, res) {
  // Try adding columns one by one via REST API insert test
  const cols = [
    { name: "_condiciones", type: "jsonb" },
    { name: "_expediente", type: "jsonb" },
    { name: "bono_concepto", type: "text" },
    { name: "bono_es_salarial", type: "boolean" },
    { name: "regimen_salud", type: "text" },
    { name: "arl_nivel", type: "integer" },
    { name: "candidato_cc", type: "text" },
    { name: "candidato_celular", type: "text" },
    { name: "candidato_eps", type: "text" },
    { name: "candidato_pension", type: "text" },
  ];

  // Check which columns exist by fetching one record
  const h = { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY, "Content-Type": "application/json" };
  const r = await fetch(SB_URL + "/rest/v1/hiring_processes?limit=0", { headers: h });
  
  // The Supabase anon key can't run ALTER TABLE directly.
  // Instead, we'll try to use the rpc endpoint if a function exists,
  // or report which columns need to be added.
  
  // Test: try inserting a dummy record with all columns to see which fail
  const testRec = {};
  cols.forEach(c => {
    if (c.type === "jsonb") testRec[c.name] = null;
    else if (c.type === "boolean") testRec[c.name] = false;
    else if (c.type === "integer") testRec[c.name] = 0;
    else testRec[c.name] = null;
  });
  testRec.codigo = "TEST-MIGRATE";
  testRec.estado = "cancelado";
  testRec.cargo = "test";
  testRec.token_propuesta = "MIGRATE1";
  testRec.token_datos = "MIGRATE2";

  const r2 = await fetch(SB_URL + "/rest/v1/hiring_processes", {
    method: "POST", headers: { ...h, Prefer: "return=representation" },
    body: JSON.stringify(testRec)
  });
  const d2 = await r2.text();
  
  if (r2.ok) {
    // Clean up test record
    const parsed = JSON.parse(d2);
    const id = parsed[0]?.id || parsed.id;
    if (id) {
      await fetch(SB_URL + "/rest/v1/hiring_processes?id=eq." + id, { method: "DELETE", headers: h });
    }
    return res.status(200).json({ ok: true, message: "All columns exist! Migration not needed.", status: r2.status });
  }
  
  return res.status(200).json({
    ok: false,
    message: "Some columns are missing. Please run this SQL in Supabase SQL Editor:",
    sql: `ALTER TABLE hiring_processes 
ADD COLUMN IF NOT EXISTS _condiciones jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS _expediente jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS bono_concepto text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS bono_es_salarial boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS regimen_salud text DEFAULT 'contributivo',
ADD COLUMN IF NOT EXISTS arl_nivel integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS candidato_cc text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS candidato_celular text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS candidato_eps text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS candidato_pension text DEFAULT NULL;`,
    error: d2
  });
}
