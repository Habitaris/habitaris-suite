const SB_URL = "https://xlzkasdskatnikuavefh.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhsemthc2Rza2F0bmlrdWF2ZWZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4OTE3NzQsImV4cCI6MjA4NzQ2Nzc3NH0.SR9tIpvL0YnV9CNrRq4T-xetifuNQOJZE0OnQpwtYLM";

function sbHeaders() {
  return { "apikey": SB_KEY, "Authorization": "Bearer " + SB_KEY, "Content-Type": "application/json", "Prefer": "return=representation" };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    // GET — list attendance by date and/or centro_costo
    if (req.method === "GET") {
      var fecha = req.query.fecha || new Date().toISOString().split("T")[0];
      var cc = req.query.cc || "";
      var ot = req.query.ot || "";
      var empId = req.query.employee_id || "";
      
      var params = "fecha=eq." + fecha + "&order=timestamp.asc";
      if (cc) params += "&centro_costo=eq." + cc;
      if (ot) params += "&ot_id=eq." + ot;
      if (empId) params += "&employee_id=eq." + empId;
      
      var r = await fetch(SB_URL + "/rest/v1/attendance?" + params, { headers: sbHeaders() });
      var data = await r.json();
      return res.status(200).json({ ok: true, data: data });
    }

    // POST — register entry/exit
    if (req.method === "POST") {
      var body = req.body || {};
      if (!body.employee_id || !body.tipo) {
        return res.status(400).json({ ok: false, error: "employee_id and tipo required" });
      }
      
      var record = {
        employee_id: body.employee_id,
        employee_nombre: body.employee_nombre || "",
        fecha: body.fecha || new Date().toISOString().split("T")[0],
        tipo: body.tipo,
        timestamp: new Date().toISOString(),
        lat: body.lat || null,
        lng: body.lng || null,
        precision_m: body.precision || null,
        foto_url: body.foto_url || null,
        centro_costo: body.centro_costo || "oficina",
        ot_id: body.ot_id || null,
        gps_error: body.gps_error || null,
      };
      
      var r2 = await fetch(SB_URL + "/rest/v1/attendance", {
        method: "POST", headers: sbHeaders(), body: JSON.stringify(record)
      });
      var data2 = await r2.json();
      if (r2.ok) return res.status(200).json({ ok: true, data: data2 });
      return res.status(r2.status).json({ ok: false, error: data2.message || "Insert failed" });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
