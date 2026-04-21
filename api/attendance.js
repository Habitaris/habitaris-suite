// Endpoint de fichajes — usa REST de Supabase directo con fetch (no @supabase/supabase-js)
// para evitar dependencia de env vars que no están configuradas en Vercel.
// Mismo patrón que hiring.js.

const SB_URL = "https://xlzkasdskatnikuavefh.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhsemthc2Rza2F0bmlrdWF2ZWZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4OTE3NzQsImV4cCI6MjA4NzQ2Nzc3NH0.SR9tIpvL0YnV9CNrRq4T-xetifuNQOJZE0OnQpwtYLM";

function sbH(){return{"apikey":SB_KEY,"Authorization":"Bearer "+SB_KEY,"Content-Type":"application/json","Prefer":"return=representation"};}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    // ── GET: listar fichajes ──────────────────────────────────────
    if (req.method === "GET") {
      const { employee_id, fecha, limit = 100 } = req.query;
      let url = SB_URL + "/rest/v1/attendance?select=*&order=timestamp.desc&limit=" + Number(limit);
      if (employee_id) url += "&employee_id=eq." + encodeURIComponent(employee_id);
      if (fecha) url += "&fecha=eq." + encodeURIComponent(fecha);
      const r = await fetch(url, { headers: sbH() });
      if (!r.ok) {
        const txt = await r.text();
        return res.status(500).json({ ok: false, error: txt });
      }
      const data = await r.json();
      return res.status(200).json({ ok: true, data });
    }

    // ── POST: registrar fichaje ───────────────────────────────────
    if (req.method === "POST") {
      const body = req.body || {};
      const {
        employee_id, employee_nombre,
        tipo,
        fecha,
        timestamp: bodyTimestamp,
        gps_lat, gps_lng, gps_accuracy,
        foto_url, centro_costo, centro_id, ot_tipo,
        device_info,
      } = body;

      if (!employee_id || !tipo) {
        return res.status(400).json({ ok: false, error: "employee_id y tipo son requeridos" });
      }

      // Capturar IP real del request
      const ip_address =
        (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
        req.headers["x-real-ip"] ||
        req.connection?.remoteAddress ||
        "desconocida";

      // Columnas reales de la tabla attendance (verificadas contra schema Supabase):
      // centro_costo, centro_id, created_at, device_info, employee_id, employee_nombre,
      // face_match, fecha, foto_url, gps_accuracy, gps_error, gps_lat, gps_lng, id,
      // ip_address, lat, liveness_passed, lng, ot_id, ot_tipo, precision_m, timestamp, tipo.
      // NO existe: novedad_desc.
      const row = {
        employee_id,
        employee_nombre: employee_nombre || "",
        tipo,
        fecha: fecha || new Date().toISOString().slice(0, 10),
        // Timestamp: si el cliente manda uno válido (e.g., para imports/tests), lo respetamos.
        // Si no, usamos el tiempo del servidor (caso normal del portal empleado).
        timestamp: (bodyTimestamp && !isNaN(new Date(bodyTimestamp).getTime()))
          ? new Date(bodyTimestamp).toISOString()
          : new Date().toISOString(),
        gps_lat:      gps_lat    || null,
        gps_lng:      gps_lng    || null,
        precision_m:  gps_accuracy || null,
        ip_address,
        device_info:  device_info ? (typeof device_info === "string" ? device_info : JSON.stringify(device_info)) : null,
        foto_url:     foto_url || null,
        centro_costo: centro_costo || null,
        centro_id:    centro_id || null,
        ot_tipo:      ot_tipo   || null,
      };

      // Intento con las columnas nuevas. Si Postgres rechaza porque
      // centro_id/ot_tipo no existen, reintenta sin ellas.
      let r1 = await fetch(SB_URL + "/rest/v1/attendance", {
        method: "POST",
        headers: sbH(),
        body: JSON.stringify(row),
      });
      if (!r1.ok) {
        const errTxt = await r1.text();
        if (errTxt.toLowerCase().includes("does not exist") &&
            (errTxt.toLowerCase().includes("centro_id") || errTxt.toLowerCase().includes("ot_tipo"))) {
          // Fallback: insertar sin las columnas nuevas
          const { centro_id: _a, ot_tipo: _b, ...rowBase } = row;
          const r2 = await fetch(SB_URL + "/rest/v1/attendance", {
            method: "POST",
            headers: sbH(),
            body: JSON.stringify(rowBase),
          });
          if (!r2.ok) {
            const e2 = await r2.text();
            return res.status(500).json({ ok: false, error: "Insert (fallback) failed: " + e2 });
          }
          const d2 = await r2.json();
          return res.status(200).json({ ok: true, data: Array.isArray(d2) ? d2[0] : d2 });
        }
        return res.status(500).json({ ok: false, error: errTxt });
      }
      const d1 = await r1.json();
      return res.status(200).json({ ok: true, data: Array.isArray(d1) ? d1[0] : d1 });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    return res.status(500).json({ ok: false, error: "Exception: " + (err?.message || String(err)) });
  }
}
