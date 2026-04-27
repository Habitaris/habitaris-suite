export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  // Cron de Vercel hace GET con query string. Permitimos GET solo para type=cron_reminders.
  const isCronGet = req.method === "GET" && (req.query && req.query.type === "cron_reminders");
  if (req.method !== "POST" && !isCronGet) return res.status(405).json({ error: "Method not allowed" });

  try {
    const body = req.body || {};
    // Permitir leer type desde query string (para cron Vercel GET)
    if (!body.type && req.query && req.query.type) body.type = req.query.type;
    // ============================================================
    // Router por body.type: tipos especiales que NO necesitan recipientEmail directo
    // ============================================================
    if (body.type === "reminder") {
      return await handleReminder(body, res);
    }
    if (body.type === "cron_reminders") {
      return await handleCronReminders(body, res);
    }

    const recipientEmail = body.to || body.client_email;
    if (!recipientEmail) return res.status(400).json({ ok: false, error: "email required" });

    const RESEND_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_KEY) return res.status(500).json({ ok: false, error: "RESEND_API_KEY not set" });

    const empresa = body.from_name || "Habitaris";

    // ── 0) OTP code email (PIN reset / 2FA) ──
    if (body.type === "otp") {
      var code = body.code || "000000";
      var nombre = body.nombre || "Empleado";
      var otpHtml = '<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F5F4F1;font-family:Arial,sans-serif">'
        + '<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F4F1;padding:40px 20px"><tr><td align="center">'
        + '<table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">'
        + '<tr><td style="background:#111;padding:24px;text-align:center"><img src="https://suite.habitaris.es/logo-habitaris-blanco.jpg" alt="Habitaris" width="140"/></td></tr>'
        + '<tr><td style="padding:32px 40px;text-align:center">'
        + '<div style="font-size:18px;font-weight:bold;color:#111;margin-bottom:8px">Código de verificación</div>'
        + '<div style="font-size:13px;color:#666;margin-bottom:24px">Hola ' + nombre + ', usa este código para verificar tu identidad:</div>'
        + '<div style="background:#F5F4F1;border:2px solid #E5E3DE;border-radius:8px;padding:20px;margin:0 auto;width:fit-content">'
        + '<div style="font-size:32px;font-weight:800;letter-spacing:8px;font-family:monospace;color:#111">' + code + '</div></div>'
        + '<div style="font-size:11px;color:#999;margin-top:16px">Este código expira en 10 minutos.<br>Si no solicitaste este código, ignora este correo.</div>'
        + '</td></tr>'
        + '<tr><td style="background:#F5F4F1;padding:16px;text-align:center;border-top:1px solid #E5E3DE">'
        + '<div style="font-size:10px;color:#aaa">Habitaris S.A.S · NIT 901.922.136-8</div></td></tr>'
        + '</table></td></tr></table></body></html>';

      var rOtp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": "Bearer " + RESEND_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "Habitaris <noreply@habitaris.es>",
          to: [recipientEmail],
          subject: code + " — Código de verificación Habitaris",
          html: otpHtml,
        }),
      });
      var dOtp = await rOtp.json();
      if (rOtp.ok) return res.status(200).json({ ok: true, id: dOtp.id });
      return res.status(rOtp.status).json({ ok: false, error: dOtp.message || "Send failed" });
    }

    // ── 1) Generic email (meetings, notifications) ──
    if (body.to && body.subject && body.message && !body.type) {
      var b = body.brand || {};
      var emp = b.empresa || empresa;
      var cp = b.colorPrimario || "#111111";
      var logo = b.logo || "https://suite.habitaris.es/logo-habitaris-blanco.jpg";
      var slogan = b.slogan || "";
      var rawMsg = (body.message || "").replace(/\\n/g, "\n");
      var msgHtml = rawMsg.split("\n").map(function(line) {
        return '<div style="font-size:14px;color:#555;line-height:1.8">' + line + '</div>';
      }).join("");
      var lnk = body.link || "";
      var lnkInfo = body.link_info || "Abrir enlace";

      var logoBlock = logo
        ? '<img src="' + logo + '" alt="' + emp + '" width="180" style="display:inline-block;max-width:180px"/>'
        : '<h1 style="margin:0;color:#fff;font-size:16px;letter-spacing:3px">' + emp.toUpperCase() + '</h1>';

      var linkBtn = lnk
        ? '<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F4F1;border-radius:10px;border:1px solid #E4E1DB;margin-top:24px"><tr><td style="padding:28px;text-align:center">'
          + '<div style="font-size:10px;color:#888;letter-spacing:3px;text-transform:uppercase;font-weight:bold;margin-bottom:10px">VIDEOLLAMADA</div>'
          + '<a href="' + lnk + '" style="display:inline-block;background:#111111;color:#ffffff;text-decoration:none;padding:14px 44px;border-radius:6px;font-size:14px;font-weight:bold;letter-spacing:0.5px">' + lnkInfo + ' →</a>'
          + '</td></tr></table>'
        : "";

      var subj = encodeURIComponent(body.subject || "Reunion");
      var creatorEmail = body.fromEmail || "noreply@habitaris.es"; var baseUrl = "https://suite.habitaris.co/responder/?asunto=" + subj + "&email=" + encodeURIComponent(body.to) + "&creador=" + encodeURIComponent(creatorEmail) + (body.message ? "&fecha=" + encodeURIComponent((body.message.match(/Fecha: ([^\n]+)/)||["",""])[1]) + "&hora=" + encodeURIComponent((body.message.match(/Hora: ([^\n]+)/)||["",""])[1]) : "");
      var actionsHtml = '<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px"><tr>'
        + '<td width="33%" style="padding:4px"><a href="' + baseUrl + '&accion=confirmar" style="display:block;background:#059669;color:#fff;text-decoration:none;padding:12px;border-radius:6px;font-size:12px;font-weight:bold;text-align:center">✓ Confirmar</a></td>'
        + '<td width="33%" style="padding:4px"><a href="' + baseUrl + '&accion=reprogramar" style="display:block;background:#D97706;color:#fff;text-decoration:none;padding:12px;border-radius:6px;font-size:12px;font-weight:bold;text-align:center">🕐 Otra hora</a></td>'
        + '<td width="33%" style="padding:4px"><a href="' + baseUrl + '&accion=rechazar" style="display:block;background:#DC2626;color:#fff;text-decoration:none;padding:12px;border-radius:6px;font-size:12px;font-weight:bold;text-align:center">✗ No puedo</a></td>'
        + '</tr></table>';

      var html = '<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F5F4F1;font-family:Arial,Helvetica,sans-serif">'
        + '<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F4F1;padding:40px 20px"><tr><td align="center">'
        + '<table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)">'
        + '<tr><td style="background:#111111;padding:36px 40px;text-align:center">' + logoBlock + '</td></tr>'
        + '<tr><td style="background:#3B3B3B;height:2px"></td></tr>'
        + '<tr><td style="padding:44px 40px 20px">'
        + '<div style="font-size:22px;color:#111;font-weight:bold;margin-bottom:16px">📅 Reunion programada</div>'
        + msgHtml
        + linkBtn
        + actionsHtml
        + '</td></tr>'
        + '<tr><td style="background:#F5F4F1;padding:24px 40px;text-align:center;border-top:1px solid #E4E1DB">'
        + '<div style="font-size:11px;color:#888;font-weight:bold">Gracias por confiar en nosotros!</div>'
        + '<div style="font-size:10px;color:#aaa;margin-top:8px">' + emp + ' · Bogota D.C. · noreply@habitaris.es</div>'
        + '</td></tr></table></td></tr></table></body></html>';

      var r2 = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": "Bearer " + RESEND_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: (body.fromName || emp) + " <noreply@habitaris.es>",
          to: [body.to],
          subject: body.subject,
          html: html,
          reply_to: body.fromEmail || "noreply@habitaris.es",
        }),
      });
      var d2 = await r2.json();
      if (r2.ok) return res.status(200).json({ ok: true, id: d2.id });
      return res.status(r2.status).json({ ok: false, error: d2.message || "Send failed" });
    }

    // ── 2) Form recibido notification ──
    if (body.type === "form_recibido") {
      const e = body.extra || {};
      const formName = body.formName || e.form_name || "Formulario";
      const cn = body.clienteNombre || e.client_name || "Cliente";
      const ce = body.clienteEmail || e.client_email || "";
      const ct = body.clienteTel || e.client_tel || "";
      const score = e.score ? String(e.score) : null;
      const empresa = e.empresa || e.razonSocial || "Habitaris";
      const razonSocial = e.razonSocial || "Habitaris S.A.S";
      const respuestas = Array.isArray(e.respuestasResumen) ? e.respuestasResumen : [];
      const contenido = body.contenido || "";
      const crmUrl = e.crmUrl || "https://suite.habitaris.es/";

      // Construir lista de respuestas en HTML
      const respuestasHtml = respuestas.length > 0
        ? respuestas.map(r => `<tr><td style="padding:6px 12px;color:#666;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #eee;vertical-align:top;width:40%">${r.campo||""}</td><td style="padding:6px 12px;color:#111;font-size:13px;border-bottom:1px solid #eee">${r.valor||"—"}</td></tr>`).join("")
        : (contenido ? `<tr><td colspan="2" style="padding:12px;color:#444;font-size:13px;line-height:1.6">${contenido}</td></tr>` : `<tr><td colspan="2" style="padding:12px;color:#999;font-size:12px;text-align:center">— Sin respuestas detalladas —</td></tr>`);

      // Score badge color
      const scoreBg = score && parseFloat(score) >= 8 ? "#16a34a" : (score && parseFloat(score) >= 6 ? "#eab308" : "#dc2626");
      const scoreEmoji = score && parseFloat(score) >= 8 ? "🟢" : (score && parseFloat(score) >= 6 ? "🟡" : "🔴");

      const subject = `📥 Nueva respuesta · ${formName} · ${cn}`;

      const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f3f0ff;padding:24px 12px;color:#111;-webkit-text-size-adjust:100%">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05)">
    <div style="background:#111;padding:16px 24px;color:#fff">
      <div style="font-size:11px;letter-spacing:2px;font-weight:600;opacity:0.7">${empresa.toUpperCase()}</div>
      <div style="font-size:18px;font-weight:700;margin-top:4px">📥 Nueva respuesta recibida</div>
    </div>
    <div style="padding:24px">
      <div style="font-size:13px;color:#666;margin-bottom:4px">Formulario</div>
      <div style="font-size:20px;font-weight:700;color:#111;margin-bottom:20px">${formName}</div>
      ${score ? `<div style="display:inline-block;background:${scoreBg};color:#fff;padding:6px 14px;border-radius:20px;font-size:13px;font-weight:700;margin-bottom:20px">${scoreEmoji} Score: ${score}/10</div>` : ""}
      <div style="background:#fafafa;border:1px solid #eee;border-radius:8px;padding:16px;margin-bottom:20px">
        <div style="font-size:11px;color:#0066cc;font-weight:700;letter-spacing:1px;margin-bottom:10px">DATOS DEL CLIENTE</div>
        <div style="font-size:15px;font-weight:700;color:#111;margin-bottom:4px">${cn}</div>
        ${ce ? `<div style="font-size:13px;color:#444;margin-bottom:2px">📧 <a href="mailto:${ce}" style="color:#0066cc;text-decoration:none">${ce}</a></div>` : ""}
        ${ct ? `<div style="font-size:13px;color:#444">📱 ${ct}</div>` : ""}
      </div>
      ${respuestasHtml ? `<div style="font-size:13px;color:#666;font-weight:600;margin-bottom:8px">RESPUESTAS</div><table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #eee;border-radius:8px;overflow:hidden;margin-bottom:24px">${respuestasHtml}</table>` : ""}
      <div style="text-align:center;margin:24px 0">
        <a href="${crmUrl}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600">Ver en el CRM →</a>
      </div>
    </div>
    <div style="background:#f7f7f7;padding:16px 24px;border-top:1px solid #eee">
      <div style="font-size:11px;color:#999;text-align:center">Este correo se ha enviado automáticamente al recibir una nueva respuesta de formulario.</div>
      <div style="font-size:11px;color:#999;text-align:center;margin-top:6px">${razonSocial} · ${empresa.toLowerCase()}.es</div>
    </div>
  </div>
</div>
`;
      try {
        const r = await sendViaResend({ to: recipientEmail, subject, html, mappingKey: "response_notification" });
        return res.status(200).json({ ok: true, id: r.id });
      } catch (err) {
        return res.status(500).json({ ok: false, error: String(err.message || err) });
      }
    }

    // ── 3) Default: form link email ──
    var nombre = body.client_name || "Cliente";
    var formulario = body.form_name || "Formulario";
    var formLink = body.form_link || "#";
    var info = body.link_info || "";

    var defHtml = '<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F5F4F1;font-family:Arial,Helvetica,sans-serif">'
      + '<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F4F1;padding:40px 20px"><tr><td align="center">'
      + '<table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)">'
      + '<tr><td style="background:#111111;padding:36px 40px;text-align:center">'
      + '<img src="https://suite.habitaris.es/logo-habitaris-blanco.jpg" alt="Habitaris" width="180" style="display:inline-block;max-width:180px"/></td></tr>'
      + '<tr><td style="background:#3B3B3B;height:2px"></td></tr>'
      + '<tr><td style="padding:44px 40px 20px">'
      + '<div style="font-size:22px;color:#111;font-weight:bold;margin-bottom:12px">Hola ' + nombre + ' 👋</div>'
      + '<div style="font-size:14px;color:#555;line-height:1.8;margin-bottom:28px">Estamos emocionados de trabajar contigo.<br><br>'
      + 'Para conocer mejor tu proyecto y prepararte la mejor propuesta, necesitamos que completes un breve formulario:</div></td></tr>'
      + '<tr><td style="padding:0 40px 30px"><table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F4F1;border-radius:10px;border:1px solid #E4E1DB">'
      + '<tr><td style="padding:28px;text-align:center">'
      + '<div style="font-size:10px;color:#888;letter-spacing:3px;text-transform:uppercase;font-weight:bold;margin-bottom:10px">FORMULARIO</div>'
      + '<div style="font-size:18px;color:#111;font-weight:bold;margin-bottom:24px">📋 ' + formulario + '</div>'
      + '<a href="' + formLink + '" style="display:inline-block;background:#111111;color:#ffffff;text-decoration:none;padding:14px 44px;border-radius:6px;font-size:14px;font-weight:bold;letter-spacing:0.5px">Completar formulario →</a>'
      + (info ? '<div style="font-size:11px;color:#999;margin-top:16px">' + info + '</div>' : '')
      + '</td></tr></table></td></tr>'
      + '<tr><td style="padding:0 40px 40px"><div style="font-size:12px;color:#999;line-height:1.6;text-align:center">'
      + 'Es rapido y sencillo. Si tienes alguna pregunta,<br>no dudes en responder a este correo.</div></td></tr>'
      + '<tr><td style="background:#F5F4F1;padding:24px 40px;text-align:center;border-top:1px solid #E4E1DB">'
      + '<div style="font-size:11px;color:#888;font-weight:bold">Gracias por confiar en nosotros!</div>'
      + '<div style="font-size:10px;color:#aaa;margin-top:8px">' + empresa + ' · Bogota D.C. · noreply@habitaris.es</div>'
      + '</td></tr></table></td></tr></table></body></html>';

    var response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + RESEND_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: empresa + " <noreply@habitaris.es>",
        to: [body.client_email],
        subject: "📋 " + formulario + " — " + empresa,
        html: defHtml,
      }),
    });

    var data = await response.json();
    if (response.ok) return res.status(200).json({ ok: true, id: data.id });
    return res.status(response.status).json({ ok: false, error: data.message || "Send failed" });
  } catch (err) {
    console.error("send-email error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}


// ============================================================
// HELPERS — Reminder + Cron + Sender config (multi-tenant)
// ============================================================

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL || "https://xlzkasdskatnikuavefh.supabase.co";
  // Fallback hardcodeado a la anon key (publica, ya esta en el frontend). Se puede sobrescribir con env vars.
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhsemthc2Rza2F0bmlrdWF2ZWZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4OTE3NzQsImV4cCI6MjA4NzQ2Nzc3NH0.SR9tIpvL0YnV9CNrRq4T-xetifuNQOJZE0OnQpwtYLM";
  if (!key) throw new Error("missing supabase key");
  const headers = { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json" };
  return { url, headers };
}

// Lee la config de senders desde kv_store. Multi-tenant via tenant_id.
// Devuelve { email, name } del sender mapeado al mappingKey.
async function getSenderConfig(tenantId, mappingKey) {
  const fallback = { email: "noreply@habitaris.es", name: "Habitaris" };
  try {
    const sb = getSupabaseClient();
    const r = await fetch(sb.url + "/rest/v1/kv_store?key=eq.habitaris_email_senders&tenant_id=eq." + encodeURIComponent(tenantId || "habitaris") + "&select=value", { headers: sb.headers });
    const arr = await r.json();
    if (!Array.isArray(arr) || arr.length === 0) return fallback;
    const cfg = JSON.parse(arr[0].value);
    const aliasKey = (cfg.mappings && cfg.mappings[mappingKey]) || cfg.fallback || "noreply";
    if (cfg.senders && cfg.senders[aliasKey]) return cfg.senders[aliasKey];
    return fallback;
  } catch (e) {
    return fallback;
  }
}

// Helper de envío via Resend.
async function sendViaResend({ from, to, subject, html }) {
  const RESEND_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_KEY) throw new Error("missing RESEND_API_KEY");
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": "Bearer " + RESEND_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: Array.isArray(to) ? to : [to], subject, html })
  });
  const data = await r.json();
  return { ok: r.ok, status: r.status, data };
}

// Plantilla HTML del recordatorio "briefing a medias"
function reminderTemplate(link, sender) {
  const clientName = link.client_name || "";
  const formName = link.form_name || "tu formulario";
  const lastStep = link.last_completed_step || 0;
  const fieldCount = Object.keys(link.partial_responses || {}).length;
  const greeting = clientName ? ("Hola " + clientName + ",") : "Hola,";
  const subject = encodeURIComponent("Quiero terminar mi briefing - " + formName);
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/><title>Briefing a medias</title></head>
<body style="margin:0;padding:0;background:#F5F0FF;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F5F0FF;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.06);">
        <tr><td style="padding:32px 40px 16px 40px;">
          <div style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px;">Habitaris</div>
          <h1 style="margin:0 0 8px 0;font-size:22px;font-weight:700;color:#111;">` + greeting + `</h1>
          <p style="margin:0;font-size:15px;color:#444;line-height:1.6;">Vimos que comenzaste a llenar tu <strong>` + formName + `</strong> pero no llegaste a enviarlo.</p>
        </td></tr>
        <tr><td style="padding:8px 40px 16px 40px;">
          <div style="background:#F5F0FF;border-radius:8px;padding:16px 18px;font-size:13px;color:#666;">
            <div style="margin-bottom:6px;">📝 <strong>Avance guardado:</strong> paso ` + (lastStep + 1) + ` · ` + fieldCount + ` campos</div>
            <div>⏰ Tus respuestas están guardadas, solo tienes que continuar.</div>
          </div>
        </td></tr>
        <tr><td style="padding:8px 40px 24px 40px;">
          <p style="margin:0 0 18px 0;font-size:15px;color:#444;line-height:1.6;">¿Quieres terminarlo? Avísanos respondiendo a este correo y reactivamos tu enlace para que continúes donde lo dejaste.</p>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr><td style="background:#111;border-radius:8px;">
              <a href="mailto:` + sender.email + `?subject=` + subject + `" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:600;color:#fff;text-decoration:none;">Responder y continuar</a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:16px 40px 24px 40px;border-top:1px solid #eee;">
          <div style="font-size:11px;color:#aaa;line-height:1.5;">Este es un correo automático. Si recibiste este mensaje por error o ya enviaste tu briefing, ignóralo.</div>
          <div style="font-size:10px;color:#bbb;margin-top:8px;">Habitaris S.A.S · NIT 901.922.136-8 · Bogotá D.C., Colombia</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

// Handler: enviar recordatorio a UN link especifico (manual o cron interno)
async function handleReminder(body, res) {
  try {
    const linkId = body.link_id;
    const force = body.force === true;
    const tenantId = body.tenant_id || "habitaris";
    if (!linkId) return res.status(400).json({ ok: false, error: "link_id required" });

    const sb = getSupabaseClient();
    const linkR = await fetch(sb.url + "/rest/v1/form_links?link_id=eq." + encodeURIComponent(linkId) + "&select=*", { headers: sb.headers });
    const arr = await linkR.json();
    if (!Array.isArray(arr) || arr.length === 0) return res.status(404).json({ ok: false, error: "link not found" });
    const link = arr[0];

    if (!link.client_email) return res.status(400).json({ ok: false, error: "link has no client_email" });
    if (!link.has_partial_data) return res.status(400).json({ ok: false, error: "link has no partial data" });
    if (link.submitted_at) return res.status(400).json({ ok: false, error: "link already submitted" });
    if (!force && link.reminder_sent_at) return res.status(400).json({ ok: false, error: "reminder already sent at " + link.reminder_sent_at });

    const sender = await getSenderConfig(tenantId, "reminder");
    const fromHeader = sender.name + " <" + sender.email + ">";
    const html = reminderTemplate(link, sender);
    const subject = "📝 Tienes tu briefing a medias · Habitaris";

    const sendResult = await sendViaResend({ from: fromHeader, to: link.client_email, subject, html });
    if (!sendResult.ok) return res.status(500).json({ ok: false, error: "resend failed", detail: sendResult.data });

    await fetch(sb.url + "/rest/v1/form_links?link_id=eq." + encodeURIComponent(linkId), {
      method: "PATCH", headers: sb.headers,
      body: JSON.stringify({ reminder_sent_at: new Date().toISOString() })
    });

    return res.status(200).json({ ok: true, sent_to: link.client_email, from: fromHeader, resend_id: sendResult.data.id || null });
  } catch (err) {
    console.error("handleReminder error:", err);
    return res.status(500).json({ ok: false, error: String(err && err.message || err) });
  }
}

// Handler: cron diario que revisa links candidatos y envia recordatorios
// Llamado por Vercel Cron via GET /api/send-email?action=cron_reminders
// Filtros: current_uses>=max_uses AND has_partial_data=true AND submitted_at IS NULL AND reminder_sent_at IS NULL
async function handleCronReminders(body, res) {
  try {
    const tenantId = body.tenant_id || "habitaris";
    const sb = getSupabaseClient();

    // Buscar candidatos: usaron todos los usos, tienen datos parciales, no enviaron, no recibieron recordatorio
    const r = await fetch(sb.url + "/rest/v1/form_links?has_partial_data=eq.true&submitted_at=is.null&reminder_sent_at=is.null&select=*", { headers: sb.headers });
    const links = await r.json();
    if (!Array.isArray(links)) return res.status(500).json({ ok: false, error: "failed to query links" });

    // Filtrar por current_uses >= max_uses (filtro adicional, lo hacemos en JS porque PostgREST no permite comparar columnas)
    const candidates = links.filter(l => (l.max_uses > 0) && ((l.current_uses || 0) >= l.max_uses) && l.client_email);

    const sender = await getSenderConfig(tenantId, "reminder");
    const fromHeader = sender.name + " <" + sender.email + ">";
    const subject = "📝 Tienes tu briefing a medias · Habitaris";

    const results = [];
    for (const link of candidates) {
      try {
        const html = reminderTemplate(link, sender);
        const sendResult = await sendViaResend({ from: fromHeader, to: link.client_email, subject, html });
        if (sendResult.ok) {
          await fetch(sb.url + "/rest/v1/form_links?link_id=eq." + encodeURIComponent(link.link_id), {
            method: "PATCH", headers: sb.headers,
            body: JSON.stringify({ reminder_sent_at: new Date().toISOString() })
          });
          results.push({ link_id: link.link_id, email: link.client_email, ok: true });
        } else {
          results.push({ link_id: link.link_id, email: link.client_email, ok: false, error: sendResult.data });
        }
      } catch (e) {
        results.push({ link_id: link.link_id, ok: false, error: String(e && e.message || e) });
      }
    }

    return res.status(200).json({ ok: true, candidates_count: candidates.length, sent_count: results.filter(x => x.ok).length, results });
  } catch (err) {
    console.error("handleCronReminders error:", err);
    return res.status(500).json({ ok: false, error: String(err && err.message || err) });
  }
}
