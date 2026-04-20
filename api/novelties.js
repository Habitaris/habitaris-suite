const SB_URL = "https://xlzkasdskatnikuavefh.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhsemthc2Rza2F0bmlrdWF2ZWZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4OTE3NzQsImV4cCI6MjA4NzQ2Nzc3NH0.SR9tIpvL0YnV9CNrRq4T-xetifuNQOJZE0OnQpwtYLM";

function sbHeaders() {
  return { "apikey": SB_KEY, "Authorization": "Bearer " + SB_KEY, "Content-Type": "application/json", "Prefer": "return=representation" };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    // GET — list novelties
    if (req.method === "GET") {
      var empId = req.query.employee_id || "";
      var estado = req.query.estado || "";
      var params = "order=created_at.desc";
      if (empId) params += "&employee_id=eq." + empId;
      if (estado) params += "&estado=eq." + estado;
      
      var r = await fetch(SB_URL + "/rest/v1/hr_novelties?" + params, { headers: sbHeaders() });
      var data = await r.json();
      return res.status(200).json({ ok: true, data: data });
    }

    // POST — create novelty
    if (req.method === "POST") {
      var body = req.body || {};
      if (!body.employee_id || !body.tipo) {
        return res.status(400).json({ ok: false, error: "employee_id and tipo required" });
      }
      var record = {
        employee_id: body.employee_id,
        employee_nombre: body.employee_nombre || "",
        tipo: body.tipo,
        fecha_inicio: body.fecha_inicio,
        fecha_fin: body.fecha_fin || null,
        horas_extra: body.horas_extra || 0,
        motivo: body.motivo || "",
        adjunto_url: body.adjunto_url || null,
        estado: body.source === "rrhh" ? "aprobada" : "pendiente",
        aprobado_por: body.source === "rrhh" ? (body.aprobado_por || "admin") : null,
        aprobado_at: body.source === "rrhh" ? new Date().toISOString() : null,
        centro_costo: body.centro_costo || null,
        ot_id: body.ot_id || null,
      };
      var r2 = await fetch(SB_URL + "/rest/v1/hr_novelties", {
        method: "POST", headers: sbHeaders(), body: JSON.stringify(record)
      });
      var data2 = await r2.json();
      if (r2.ok) return res.status(200).json({ ok: true, data: data2 });
      return res.status(r2.status).json({ ok: false, error: data2.message || "Insert failed" });
    }

    // PATCH — approve/reject (admin)
    if (req.method === "PATCH") {
      var body = req.body || {};
      if (!body.id || !body.estado) return res.status(400).json({ ok: false, error: "id and estado required" });
      var h = sbHeaders();
      h["Prefer"] = "return=representation";
      var r3 = await fetch(SB_URL + "/rest/v1/hr_novelties?id=eq." + body.id, {
        method: "PATCH", headers: h,
        body: JSON.stringify({ estado: body.estado, aprobado_por: body.aprobado_por || "admin", aprobado_at: new Date().toISOString() })
      });
      var data3 = await r3.json();
      if (r3.ok) return res.status(200).json({ ok: true, data: data3 });
      return res.status(r3.status).json({ ok: false, error: data3.message || "Update failed" });
    }

    // DELETE — remove novelty by id or by employee+date+tipo
    if (req.method === "DELETE") {
      var body = req.body || {};
      var filter = "";
      if (body.id) {
        filter = "id=eq." + body.id;
      } else if (body.employee_id && body.fecha_inicio && body.tipo) {
        filter = "employee_id=eq." + body.employee_id + "&fecha_inicio=eq." + body.fecha_inicio + "&tipo=eq." + body.tipo;
      } else {
        return res.status(400).json({ ok: false, error: "id or (employee_id+fecha_inicio+tipo) required" });
      }
      var r4 = await fetch(SB_URL + "/rest/v1/hr_novelties?" + filter, {
        method: "DELETE", headers: sbHeaders()
      });
      return res.status(200).json({ ok: true, deleted: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
