const SB = "https://xlzkasdskatnikuavefh.supabase.co";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhsemthc2Rzc2thdG5pa3VhdmVmaCIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE3NDAxNTI5OTcsImV4cCI6MjA1NTcyODk5N30.SR9tIpvL0YnV9CNrRq4TKa1VNG0HPGDsPDuacirMbwQ";
const H = { "Content-Type":"application/json", apikey:KEY, Authorization:"Bearer "+KEY };

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Methods","GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");
  if(req.method==="OPTIONS") return res.status(200).end();

  try {
    const { anio, mes } = req.query;
    const kvKey = "hab:nomina:" + anio + ":" + mes;

    if (req.method === "GET") {
      const r = await fetch(SB + "/rest/v1/kv_store?key=eq." + kvKey + "&select=value", { headers: H });
      const d = await r.json();
      if (d && d[0]?.value) {
        return res.json({ ok: true, data: JSON.parse(d[0].value) });
      }
      return res.json({ ok: true, data: [] });
    }

    if (req.method === "POST") {
      const body = req.body;
      // Upsert via Prefer header
      const r = await fetch(SB + "/rest/v1/kv_store", {
        method: "POST",
        headers: { ...H, Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify({ key: kvKey, value: JSON.stringify(body.data), tenant_id: "habitaris" })
      });
      if (!r.ok) {
        // Try update instead
        const r2 = await fetch(SB + "/rest/v1/kv_store?key=eq." + kvKey, {
          method: "PATCH",
          headers: { ...H, Prefer: "return=minimal" },
          body: JSON.stringify({ value: JSON.stringify(body.data) })
        });
        if (!r2.ok) {
          // Insert fresh
          await fetch(SB + "/rest/v1/kv_store", {
            method: "POST",
            headers: H,
            body: JSON.stringify({ key: kvKey, value: JSON.stringify(body.data), tenant_id: "habitaris" })
          });
        }
      }
      return res.json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
