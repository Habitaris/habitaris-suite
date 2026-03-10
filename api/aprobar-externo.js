// /api/aprobar-externo.js
// Endpoint público — aprobación externa de evaluaciones y examen médico sin login
import { createClient } from "@supabase/supabase-js";
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  const { token, tipo, accion } = req.method === "GET" ? req.query : req.body;

  if (!token || !tipo || !accion) {
    return res.status(400).send(page("Error", "Parámetros incompletos.", false));
  }

  // Buscar el proceso por token
  const campo = tipo === "rrhh"  ? "eval_token_rrhh"
              : tipo === "sst"   ? "eval_token_sst"
              : tipo === "examen_sst" ? "examen_token_sst"
              : null;

  if (!campo) return res.status(400).send(page("Error", "Tipo inválido.", false));

  const { data: proc, error } = await sb
    .from("hiring_processes")
    .select("id, estado, candidate_name, cargo, eval_aprobada_rrhh, eval_aprobada_sst, examen_apto")
    .eq(campo, token)
    .single();

  if (error || !proc) {
    return res.status(404).send(page("Enlace no válido", "Este enlace no existe o ya fue utilizado.", false));
  }

  const aprueba = accion === "aprobar";
  let patch = {};

  if (tipo === "rrhh")       patch = { eval_aprobada_rrhh: aprueba };
  else if (tipo === "sst")   patch = { eval_aprobada_sst:  aprueba };
  else if (tipo === "examen_sst") patch = { examen_apto: aprueba, examen_obs: aprueba ? "Apto — aprobado por revisor externo SST" : "No apto — rechazado por revisor externo SST" };

  await sb.from("hiring_processes").update(patch).eq("id", proc.id);

  // Auto-avanzar si ambas aprobaciones de evaluaciones están completas
  if (tipo !== "examen_sst") {
    const nuevaRRHH = tipo === "rrhh"  ? aprueba : proc.eval_aprobada_rrhh;
    const nuevaSST  = tipo === "sst"   ? aprueba : proc.eval_aprobada_sst;
    if (nuevaRRHH && nuevaSST && proc.estado === "evaluaciones") {
      await sb.from("hiring_processes").update({ estado: "examen_medico" }).eq("id", proc.id);
    }
  } else if (tipo === "examen_sst" && aprueba && proc.estado === "examen_recibido") {
    await sb.from("hiring_processes").update({ estado: "certificado_sst" }).eq("id", proc.id);
  }

  const msg = aprueba
    ? `✅ Has <strong>aprobado</strong> el proceso de ${proc.candidate_name || "el candidato"} para el cargo ${proc.cargo || ""}.`
    : `❌ Has <strong>rechazado</strong> el proceso de ${proc.candidate_name || "el candidato"} para el cargo ${proc.cargo || ""}.`;

  res.status(200).send(page(aprueba ? "Aprobado" : "Rechazado", msg, aprueba));
}

function page(titulo, mensaje, ok) {
  const color = ok ? "#1E6B42" : "#B91C1C";
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">
<title>${titulo} — Habitaris</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'DM Sans',system-ui,sans-serif;background:#F0EEE9;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:40px 20px}.card{background:#fff;border-radius:12px;padding:48px 40px;max-width:480px;width:100%;text-align:center;box-shadow:0 2px 20px rgba(0,0,0,.06)}.ico{font-size:48px;margin-bottom:20px}.h{font-size:22px;font-weight:700;color:#111;margin-bottom:12px}.msg{font-size:15px;color:#555;line-height:1.6;margin-bottom:24px}.pill{display:inline-block;padding:8px 24px;border-radius:6px;background:${color};color:#fff;font-size:14px;font-weight:600}img{height:32px;margin-bottom:24px;opacity:.7}</style>
</head><body><div class="card">
<img src="https://suite.habitaris.co/logo-negro.png" alt="Habitaris" onerror="this.style.display='none'">
<div class="ico">${ok?"✅":"❌"}</div>
<div class="h">${titulo}</div>
<div class="msg">${mensaje}</div>
<div class="pill">Habitaris RRHH</div>
<div style="font-size:11px;color:#aaa;margin-top:16px">Puedes cerrar esta ventana.</div>
</div></body></html>`;
}
