const SB_URL = "https://xlzkasdskatnikuavefh.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhsemthc2Rzc2thdG5pa3VhdmVmaCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzQwMTUyOTk3LCJleHAiOjIwNTU3Mjg5OTd9.DP5x1hNbnTSzIFRMFOG7tYbykaAJMc6BRXYC_dFNFgE";

function sbHeaders() {
  return { "apikey": SB_KEY, "Authorization": "Bearer " + SB_KEY, "Content-Type": "application/json", "Prefer": "return=representation" };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    var cc = req.query.cc || "";
    var ot = req.query.ot || "";
    
    // Only return active employees, minimal data (no salary, no full details)
    var params = "activo=eq.true&select=id,nombre,documento,cargo,pin,centro_costo,ot_asignada&order=nombre.asc";
    if (cc) params += "&centro_costo=eq." + cc;
    if (ot) params += "&ot_asignada=eq." + ot;
    
    var r = await fetch(SB_URL + "/rest/v1/employees?" + params, { headers: sbHeaders() });
    var data = await r.json();
    return res.status(200).json({ ok: true, data: data });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
