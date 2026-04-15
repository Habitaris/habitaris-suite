const SB_URL = "https://xlzkasdskatnikuavefh.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhsemthc2Rza2F0bmlrdWF2ZWZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4OTE3NzQsImV4cCI6MjA4NzQ2Nzc3NH0.SR9tIpvL0YnV9CNrRq4T-xetifuNQOJZE0OnQpwtYLM";
function sbH(){return{"apikey":SB_KEY,"Authorization":"Bearer "+SB_KEY,"Content-Type":"application/json","Prefer":"return=representation"};}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Methods","GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");
  if(req.method==="OPTIONS") return res.status(200).end();

  try {
    var anio = req.query.anio || "2026";
    var mes = req.query.mes || "0";
    var kvKey = "hab:nomina:" + anio + ":" + mes;

    if (req.method === "GET") {
      var r = await fetch(SB_URL + "/rest/v1/kv_store?key=eq." + kvKey + "&select=value", { headers: sbH() });
      var d = await r.json();
      if (Array.isArray(d) && d.length > 0 && d[0].value) {
        return res.json({ ok: true, data: JSON.parse(d[0].value) });
      }
      return res.json({ ok: true, data: [] });
    }

    if (req.method === "POST") {
      var body = req.body;
      var val = JSON.stringify(body.data);
      var r1 = await fetch(SB_URL + "/rest/v1/kv_store?key=eq." + kvKey, {
        method: "PATCH",
        headers: {...sbH(), Prefer: "return=minimal"},
        body: JSON.stringify({ value: val })
      });
      if (r1.status === 200 || r1.status === 204) {
        var txt = await r1.text();
        if (!txt || txt === "[]" || txt === "") {
          await fetch(SB_URL + "/rest/v1/kv_store", {
            method: "POST",
            headers: sbH(),
            body: JSON.stringify({ key: kvKey, value: val, tenant_id: "habitaris" })
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
