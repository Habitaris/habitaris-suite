const SB_URL = "https://xlzkasdskatnikuavefh.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhsemthc2Rza2F0bmlrdWF2ZWZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4OTE3NzQsImV4cCI6MjA4NzQ2Nzc3NH0.SR9tIpvL0YnV9CNrRq4T-xetifuNQOJZE0OnQpwtYLM";

function sbH(){
  return { "apikey": SB_KEY, "Authorization": "Bearer "+SB_KEY, "Content-Type": "application/json" };
}

function html(title, body, color) {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — Habitaris</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',sans-serif;background:#F0EEE9;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
  .card{background:#fff;border-radius:12px;padding:40px;max-width:480px;width:100%;box-shadow:0 2px 16px rgba(0,0,0,.08)}
  .logo{font-size:11px;font-weight:700;letter-spacing:2px;color:#1E6B42;text-transform:uppercase;margin-bottom:24px}
  h1{font-size:20px;color:#111;margin-bottom:8px}
  p{font-size:14px;color:#666;line-height:1.6;margin-bottom:16px}
  .badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;margin-bottom:20px}
  .btn{display:block;width:100%;padding:14px;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;margin-bottom:10px;font-family:inherit}
  .btn-green{background:#1E6B42;color:#fff}
  .btn-red{background:#DC2626;color:#fff}
  .btn-gray{background:#F0EEE9;color:#666}
  .info{font-size:12px;color:#999;margin-top:16px;border-top:1px solid #eee;padding-top:16px}
</style></head><body>
<div class="card">${body}</div>
</body></html>`;
}

export default async function handler(req, res) {
  const { t: token, r: role, a: action, proceso } = req.method === 'GET'
    ? req.query
    : (req.body || {});

  if (!token) {
    return res.status(400).send(html('Error', '<div class="logo">Habitaris</div><h1>Enlace inválido</h1><p>Este enlace no es válido o ha expirado.</p>', 'red'));
  }

  // Determine which column based on role
  const tokenCol = role === 'sst' ? 'approval_token_sst' : 'approval_token_rrhh';
  const approvedCol = role === 'sst' ? 'eval_aprobado_sst' : 'eval_aprobado_rrhh';
  const roleLabel = role === 'sst' ? 'SST' : 'RRHH';

  // Fetch the process
  const fetchRes = await fetch(`${SB_URL}/rest/v1/hiring_processes?${tokenCol}=eq.${token}&select=id,candidate_name,cargo,estado,eval_aprobado_rrhh,eval_aprobado_sst`, {
    headers: sbH()
  });
  const rows = await fetchRes.json();

  if (!rows || rows.length === 0) {
    return res.status(404).send(html('No encontrado', '<div class="logo">Habitaris</div><h1>Enlace no encontrado</h1><p>Este enlace no existe o ya fue procesado.</p>', 'red'));
  }

  const p = rows[0];

  // GET — show confirmation page
  if (req.method === 'GET') {
    const isActionProvided = action === 'aprobar' || action === 'rechazar';
    const body = isActionProvided
      ? `<div class="logo">Habitaris</div>
         <h1>Confirmar ${action === 'aprobar' ? 'Aprobación' : 'Rechazo'}</h1>
         <p>Proceso: <strong>${p.candidate_name}</strong> — ${p.cargo}</p>
         <span class="badge" style="background:${action==='aprobar'?'#D1FAE5':'#FEE2E2'};color:${action==='aprobar'?'#065F46':'#991B1B'}">${roleLabel}</span>
         <form method="POST" action="/api/approve-token">
           <input type="hidden" name="t" value="${token}">
           <input type="hidden" name="r" value="${role}">
           <input type="hidden" name="a" value="${action}">
           <button class="btn ${action==='aprobar'?'btn-green':'btn-red'}">${action === 'aprobar' ? '✓ Confirmar aprobación' : '✗ Confirmar rechazo'}</button>
         </form>
         <div class="info">Esta acción quedará registrada en Habitaris Suite.</div>`
      : `<div class="logo">Habitaris</div>
         <h1>Evaluación de Candidato</h1>
         <p>Proceso: <strong>${p.candidate_name}</strong> — ${p.cargo}</p>
         <span class="badge" style="background:#F0EEE9;color:#1E6B42">Responsable ${roleLabel}</span>
         <p>¿Cuál es su decisión sobre este candidato?</p>
         <a href="/api/approve-token?t=${token}&r=${role}&a=aprobar"><button class="btn btn-green">✓ Aprobar</button></a>
         <a href="/api/approve-token?t=${token}&r=${role}&a=rechazar"><button class="btn btn-red">✗ Rechazar</button></a>
         <div class="info">Al hacer clic será redirigido a la pantalla de confirmación.</div>`;
    return res.status(200).setHeader('Content-Type','text/html').send(html(p.candidate_name, body));
  }

  // POST — process the decision
  if (req.method === 'POST') {
    const aprobado = action === 'aprobar';
    const update = { [approvedCol]: aprobado };

    // If both approved, advance estado
    const otherApproved = role === 'sst' ? p.eval_aprobado_rrhh : p.eval_aprobado_sst;
    const anyRejected = !aprobado;
    if (!anyRejected && otherApproved === true) {
      // Both approved — advance
      if (p.estado === 'evaluaciones' || p.estado === 'eval_revision') {
        update.estado = 'examen_medico';
      } else if (p.estado === 'examen_medico' || p.estado === 'examen_recibido') {
        update.estado = 'certificado_sst';
      }
    }
    if (anyRejected) {
      update.estado = 'datos_recibidos'; // back to start
    }

    await fetch(`${SB_URL}/rest/v1/hiring_processes?id=eq.${p.id}`, {
      method: 'PATCH', headers: { ...sbH(), Prefer: 'return=minimal' },
      body: JSON.stringify(update)
    });

    const msg = aprobado
      ? `<div class="logo">Habitaris</div><h1>✓ Aprobación registrada</h1><p>La evaluación de <strong>${p.candidate_name}</strong> ha sido aprobada por ${roleLabel}.</p><p style="color:#1E6B42;font-weight:600">${otherApproved === true ? 'El proceso avanza automáticamente a la siguiente etapa.' : 'Esperando aprobación de la otra parte.'}</p><div class="info">Puede cerrar esta ventana.</div>`
      : `<div class="logo">Habitaris</div><h1>✗ Rechazo registrado</h1><p>La evaluación de <strong>${p.candidate_name}</strong> ha sido rechazada por ${roleLabel}.</p><div class="info">Puede cerrar esta ventana.</div>`;

    return res.status(200).setHeader('Content-Type','text/html').send(html('Decisión registrada', msg));
  }

  return res.status(405).end();
}