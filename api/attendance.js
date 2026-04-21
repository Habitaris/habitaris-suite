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

    const { data, error } = await supabase.from("attendance").insert([{
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
      centro_id:    centro_id || null,
      ot_tipo:      ot_tipo || null,
    }]).select().single();

    if (error) return res.status(500).json({ ok: false, error: error.message });
    return res.status(200).json({ ok: true, data });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
