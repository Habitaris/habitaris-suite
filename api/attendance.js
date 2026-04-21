import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  // ── GET: listar fichajes ──────────────────────────────────────
  if (req.method === "GET") {
    const { employee_id, fecha, limit = 100 } = req.query;
    let q = supabase.from("attendance").select("*").order("timestamp", { ascending: false }).limit(Number(limit));
    if (employee_id) q = q.eq("employee_id", employee_id);
    if (fecha) q = q.eq("fecha", fecha);
    const { data, error } = await q;
    if (error) return res.status(500).json({ ok: false, error: error.message });
    return res.status(200).json({ ok: true, data });
  }

  // ── POST: registrar fichaje ───────────────────────────────────
  if (req.method === "POST") {
    const body = req.body || {};
    const {
      employee_id, employee_nombre,
      tipo,           // "entrada" | "salida" | "novedad"
      fecha,          // YYYY-MM-DD
      gps_lat, gps_lng, gps_accuracy,
      foto_url, centro_costo, centro_id, ot_tipo,
      device_info,    // { ua, brand, model, os, browser }
      novedad_desc,   // solo si tipo===novedad
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

    const baseRow = {
      employee_id,
      employee_nombre: employee_nombre || "",
      tipo,
      fecha: fecha || new Date().toISOString().slice(0, 10),
      timestamp: new Date().toISOString(),
      gps_lat:      gps_lat    || null,
      gps_lng:      gps_lng    || null,
      precision_m:  gps_accuracy || null,
      ip_address,
      device_info:  device_info || null,
      novedad_desc: novedad_desc || null,
      foto_url:     foto_url || null,
      centro_costo: centro_costo || null,
    };

    // Intento con los campos nuevos (centro_id, ot_tipo). Si la tabla
    // Supabase aún no tiene estas columnas el insert falla — reintenta
    // sin ellos. Las columnas deberían añadirse con:
    //   ALTER TABLE attendance ADD COLUMN centro_id text;
    //   ALTER TABLE attendance ADD COLUMN ot_tipo text;
    let inserted = null, insertError = null;
    const attempt1 = await supabase.from("attendance").insert([{
      ...baseRow,
      centro_id: centro_id || null,
      ot_tipo:   ot_tipo   || null,
    }]).select().single();

    if (attempt1.error) {
      // Detectar si es por columna faltante ("column ... does not exist" de Postgres)
      const msg = (attempt1.error.message || "").toLowerCase();
      if (msg.includes("column") && msg.includes("does not exist")) {
        const attempt2 = await supabase.from("attendance").insert([baseRow]).select().single();
        if (attempt2.error) { insertError = attempt2.error.message; }
        else { inserted = attempt2.data; }
      } else {
        insertError = attempt1.error.message;
      }
    } else {
      inserted = attempt1.data;
    }

    if (insertError) return res.status(500).json({ ok: false, error: insertError });
    return res.status(200).json({ ok: true, data: inserted });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
