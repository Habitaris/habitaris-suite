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
        + '<tr><td style="background:#fff;padding:24px;text-align:center;border-bottom:1px solid #eee"><img src="https://suite.habitaris.es/logo-habitaris.jpg" alt="Habitaris" width="140"/></td></tr>'
        + '<tr><td style="padding:32px 40px;text-align:center">'
        + '<div style="font-size:18px;font-weight:bold;color:#111;margin-bottom:8px">Código de verificación</div>'
        + '<div style="font-size:13px;color:#666;margin-bottom:24px">Hola ' + nombre + ', usa este código para verificar tu identidad:</div>'
        + '<div style="background:#F5F4F1;border:2px solid #E5E3DE;border-radius:8px;padding:20px;margin:0 auto;width:fit-content">'
        + '<div style="font-size:32px;font-weight:800;letter-spacing:8px;font-family:monospace;color:#111">' + code + '</div></div>'
        + '<div style="font-size:11px;color:#999;margin-top:16px">Este código expira en 10 minutos.<br>Si no solicitaste este código, ignora este correo.</div>'
        + '</td></tr>'
        + '<tr><td style="background:#F5F4F1;padding:16px;text-align:center;border-top:1px solid #E5E3DE">'
        + '<div style="font-size:10px;color:#aaa">Habitaris S.A.S · NIT 901.922.136-8 · Bogotá D.C., Colombia · +57 350 566 1545</div></td></tr>'
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
      var logo = b.logo || "https://suite.habitaris.es/logo-habitaris.jpg";
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
    // -- 2 form recibido notification - simple template --
    // ── Invitation: cuando se crea el link ──
    if (body.type === "invitation") {
      const linkId = body.link_id;
      if (!linkId) return res.status(400).json({ ok: false, error: "link_id required" });
      try {
        const sb = getSupabaseClient();
        const r = await fetch(`${sb.url}/rest/v1/form_links?link_id=eq.${linkId}&select=*`, { headers: sb.headers });
        const links = await r.json();
        if (!Array.isArray(links) || links.length === 0) return res.status(404).json({ ok: false, error: "link not found" });
        const link = links[0];
        const recipient = body.to || link.client_email;
        if (!recipient) return res.status(400).json({ ok: false, error: "recipient required" });
        const html = invitationTemplate(link);
        const fromAddr = body.from || "Habitaris <noreply@habitaris.es>";
        const _short = (link.client_name || '').trim().split(/\s+/).filter(Boolean);
        const _shortName = _short.length >= 2 ? (_short[0] + ' ' + _short[_short.length - 1]) : (_short[0] || '');
        const subject = _shortName ? `${link.form_name || 'Habitaris'} — ${_shortName}` : (link.form_name || 'Habitaris');
        const sendR = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from: fromAddr, to: recipient, subject, html })
        });
        const data = await sendR.json().catch(() => ({}));
        if (!sendR.ok) return res.status(500).json({ ok: false, error: data.message || "send failed" });
        return res.status(200).json({ ok: true, sent_to: recipient, resend_id: data.id || null });
      } catch (err) {
        return res.status(500).json({ ok: false, error: String(err && err.message || err) });
      }
    }
    // ── Expired: cuando el link ya caducó ──
    if (body.type === "expired") {
      const linkId = body.link_id;
      if (!linkId) return res.status(400).json({ ok: false, error: "link_id required" });
      try {
        const sb = getSupabaseClient();
        // Leer link
        const r = await fetch(`${sb.url}/rest/v1/form_links?link_id=eq.${linkId}&select=*`, { headers: sb.headers });
        const links = await r.json();
        if (!Array.isArray(links) || links.length === 0) return res.status(404).json({ ok: false, error: "link not found" });
        const link = links[0];
        const recipient = body.to || link.client_email;
        if (!recipient) return res.status(400).json({ ok: false, error: "recipient required" });
        // Leer telefono de kv_store
        let waPhone = "+57 350 5661545";
        try {
          const kvR = await fetch(`${sb.url}/rest/v1/kv_store?key=eq.habitaris_phones&select=value`, { headers: sb.headers });
          const kv = await kvR.json();
          if (Array.isArray(kv) && kv[0]) {
            const cfg = typeof kv[0].value === "string" ? JSON.parse(kv[0].value) : kv[0].value;
            const def = cfg.whatsapp_default || "co";
            if (cfg[def]) waPhone = cfg[def];
          }
        } catch (_) {}
        const html = expiredTemplate(link, waPhone);
        const fromAddr = body.from || "Habitaris <noreply@habitaris.es>";
        const _short = (link.client_name || '').trim().split(/\s+/).filter(Boolean);
        const _shortName = _short.length >= 2 ? (_short[0] + ' ' + _short[_short.length - 1]) : (_short[0] || '');
        const subject = _shortName ? `Tu enlace ha caducado — Habitaris — ${_shortName}` : 'Tu enlace ha caducado — Habitaris';
        const sendR = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from: fromAddr, to: recipient, subject, html })
        });
        const data = await sendR.json().catch(() => ({}));
        if (!sendR.ok) return res.status(500).json({ ok: false, error: data.message || "send failed" });
        return res.status(200).json({ ok: true, sent_to: recipient, resend_id: data.id || null, wa_phone: waPhone });
      } catch (err) {
        return res.status(500).json({ ok: false, error: String(err && err.message || err) });
      }
    }
    if (body.type === "form_recibido") {
      const e = body.extra || {};
      const formName = body.formName || e.form_name || "Formulario";
      const cn = body.clienteNombre || e.client_name || "Un cliente";
      const recipient = body.to || body.client_email;
      if (!recipient) return res.status(400).json({ ok: false, error: "recipient required" });

      // Sender (default noreply)
      const fromAddr = body.from || "Habitaris <noreply@habitaris.es>";
      const subject = `Nueva respuesta: ${formName} - ${cn}`;

      // HTML simple y minimalista
      const suiteUrl = "https://suite.habitaris.es";
      const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f0ff;font-family:DM Sans,Arial,sans-serif;color:#111;">
  <div style="max-width:560px;margin:32px auto;padding:24px;background:#fff;border-radius:8px;">
    <table cellpadding='0' cellspacing='0' border='0' style='border-collapse:collapse;margin-bottom:16px;'><tr><td valign='middle' style='padding-right:14px;'><div style='position:relative;width:34px;height:40px;'><div style='position:absolute;top:5px;left:5px;width:30px;height:30px;border:1.5px solid #111;background:transparent;'></div><div style='position:absolute;top:0;left:0;width:30px;height:30px;border:1.5px solid #111;background:#fff;text-align:center;line-height:28px;font-family:Georgia,serif;font-weight:700;font-size:20px;color:#111;'>H</div></div></td><td valign='middle' style='font-family:DM Sans,Arial,sans-serif;font-weight:300;font-size:15px;letter-spacing:0.38em;color:#111;text-transform:lowercase;padding-bottom:2px;'>abitaris</td></tr></table>
    <h2 style="margin:0 0 12px 0;font-size:18px;font-weight:700;">Formulario cumplimentado</h2>
    <p style="margin:0 0 16px 0;font-size:14px;line-height:1.5;">El formulario <strong>${formName}</strong> de <strong>${cn}</strong> ha sido cumplimentado.</p>
    <p style="margin:0 0 24px 0;font-size:14px;line-height:1.5;">Puedes verlo en la suite:</p>
    <a href="${suiteUrl}" style="display:inline-block;padding:10px 20px;background:#111;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px;">Abrir suite Habitaris</a>
    <hr style="margin:24px 0 16px 0;border:none;border-top:1px solid #e5e5e5;">
    <p style="margin:0;font-size:11px;color:#999;line-height:1.6;">Habitaris S.A.S - NIT 901.922.136-8 - Bogot&aacute; D.C., Colombia - +57 350 566 1545</p>
  </div>
</body></html>`;

      // Enviar via Resend
      try {
        const r = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from: fromAddr, to: recipient, subject, html })
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) return res.status(500).json({ ok: false, error: data.message || "send failed" });
        return res.status(200).json({ ok: true, sent_to: recipient, resend_id: data.id || null });
      } catch (err) {
        return res.status(500).json({ ok: false, error: String(err && err.message || err) });
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
      + '<img src="https://suite.habitaris.es/logo-habitaris.jpg" alt="Habitaris" width="180" style="display:inline-block;max-width:180px"/></td></tr>'
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
  const formName = link.form_name || "tu briefing";
  const lastStep = link.last_completed_step || 0;
  const fieldsCount = link.partial_fields_count || 0;
  const formUrl = `https://suite.habitaris.es/formulario/${link.link_id}`;
  const greeting = clientName ? `Hola ${clientName},` : "Hola,";

  // Calcular cuanto queda hasta caducar
  let timeLeft = "pronto";
  if (link.expires_at) {
    const now = new Date();
    const exp = new Date(link.expires_at);
    const diffMs = exp - now;
    const diffH = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffH < 0) timeLeft = "hoy";
    else if (diffH < 24) timeLeft = `en ${diffH} horas`;
    else if (diffH < 48) timeLeft = "mañana";
    else timeLeft = `en ${Math.floor(diffH/24)} días`;
  }

  const hasPartial = lastStep > 0 || fieldsCount > 0;
  const partialBlock = hasPartial
    ? `<div style="background:#f3f0ff;border-left:3px solid #111;padding:14px 16px;margin:20px 0;border-radius:4px;"><p style="margin:0;font-size:14px;color:#333;">Tus respuestas siguen guardadas, solo tienes que continuar donde lo dejaste.</p></div>`
    : "";

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f0ff;font-family:DM Sans,Arial,sans-serif;color:#111;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f0ff;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;max-width:560px;width:100%;">
        <tr><td style="background:#fff;padding:24px;text-align:center;border-bottom:1px solid #eee"><img src="https://suite.habitaris.es/logo-habitaris.jpg" alt="Habitaris" height="50" style="display:block;margin:0 auto;"/></td></tr>
        <tr><td style="padding:32px 40px;">
          <h2 style="margin:0 0 16px 0;font-size:20px;font-weight:700;color:#111;">${greeting}</h2>
          <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#333;">Tu <strong>${formName}</strong> <strong>caduca ${timeLeft}</strong>.</p>
          <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#333;">Si no llegas a enviarlo a tiempo, el enlace se bloqueará y tendrás que solicitar uno nuevo.</p>
          ${partialBlock}
          <div style="text-align:center;margin:28px 0;">
            <a href="${formUrl}" style="display:inline-block;padding:12px 28px;background:#111;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">Continuar el briefing</a>
          </div>
          <p style="margin:16px 0 0 0;font-size:14px;color:#333;">Un saludo,<br><strong>El equipo de Habitaris</strong></p>
        </td></tr>
        <tr><td style="padding:0 40px 16px 40px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#999;font-style:italic;">Correo automático. Por favor, no responder a esta dirección.</p>
        </td></tr>
        <tr><td style="background:#fafafa;padding:16px 40px;border-top:1px solid #eee;">
          <p style="margin:0;font-size:11px;color:#999;line-height:1.5;">Habitaris S.A.S · NIT 901.922.136-8 · Bogotá D.C., Colombia · +57 350 566 1545</p>
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
    const _short = (link.client_name || '').trim().split(/\s+/).filter(Boolean);
    const _shortName = _short.length >= 2 ? (_short[0] + ' ' + _short[_short.length - 1]) : (_short[0] || '');
    const _formName = link.form_name || 'Habitaris';
    const subject = _shortName ? `Caduca pronto — ${_formName} — ${_shortName}` : `Caduca pronto — ${_formName}`;

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
    const sb = getSupabaseClient();

    // CONFIG: leer kv_store.habitaris_reminder_config (con fallback)
    let hoursBeforeExpiry = 24;
    let enabled = true;
    try {
      const cfgR = await fetch(sb.url + "/rest/v1/kv_store?key=eq.habitaris_reminder_config&select=value", { headers: sb.headers });
      const cfgArr = await cfgR.json().catch(() => []);
      if (cfgArr && cfgArr.length > 0 && cfgArr[0].value) {
        const cfg = typeof cfgArr[0].value === "string" ? JSON.parse(cfgArr[0].value) : cfgArr[0].value;
        if (typeof cfg.hours_before_expiry === "number") hoursBeforeExpiry = cfg.hours_before_expiry;
        if (typeof cfg.enabled === "boolean") enabled = cfg.enabled;
      }
    } catch(_) { /* usar defaults */ }

    if (!enabled) return res.status(200).json({ ok: true, sent: 0, skipped: "disabled by config" });

    // Filtrar links que caducan en menos de N horas, no enviados, no recordados, activos
    const now = new Date();
    const limitDate = new Date(now.getTime() + hoursBeforeExpiry * 3600 * 1000);
    const nowIso = now.toISOString();
    const limitIso = limitDate.toISOString();

    const url = sb.url + "/rest/v1/form_links?active=eq.true&submitted_at=is.null&reminder_sent_at=is.null&expires_at=gt." + nowIso + "&expires_at=lt." + limitIso + "&select=*";
    const r = await fetch(url, { headers: sb.headers });
    const candidates = await r.json().catch(() => []);

    if (!Array.isArray(candidates) || candidates.length === 0) {
      return res.status(200).json({ ok: true, sent: 0, message: "no candidates" });
    }

    const RESEND_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_KEY) return res.status(500).json({ ok: false, error: "RESEND_API_KEY missing" });

    let sent = 0; let failed = 0; const results = [];
    for (const link of candidates) {
      const recipient = link.client_email;
      if (!recipient) { failed++; continue; }
      const sender = "Habitaris <noreply@habitaris.es>";
      const html = preExpiryReminderTemplate(link, hoursBeforeExpiry);
      const subject = "Tu formulario caduca en " + hoursBeforeExpiry + " horas · Habitaris";
      try {
        const sendR = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + RESEND_KEY },
          body: JSON.stringify({ from: sender, to: recipient, subject, html })
        });
        if (sendR.ok) {
          // Marcar reminder_sent_at
          await fetch(sb.url + "/rest/v1/form_links?link_id=eq." + link.link_id, {
            method: "PATCH",
            headers: { ...sb.headers, "Content-Type": "application/json", Prefer: "return=minimal" },
            body: JSON.stringify({ reminder_sent_at: new Date().toISOString() })
          });
          sent++; results.push({ link_id: link.link_id, recipient, ok: true });
        } else {
          failed++; results.push({ link_id: link.link_id, recipient, ok: false });
        }
      } catch(err) {
        failed++; results.push({ link_id: link.link_id, recipient, ok: false, err: String(err) });
      }
    }

    return res.status(200).json({ ok: true, sent, failed, total: candidates.length, hours_before_expiry: hoursBeforeExpiry, results });
  } catch(err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
}

function preExpiryReminderTemplate(link, hoursBeforeExpiry) {
  const nombre = (link.client_name || "").split(" ")[0] || "Hola";
  const formName = link.form_name || "tu formulario";
  const linkUrl = "https://suite.habitaris.es/formulario/" + link.link_id;
  const expiryDate = link.expires_at ? new Date(link.expires_at).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" }) : "";
  return `
<div style="background:#f5f3ff;padding:24px 16px;font-family:DM Sans,Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;">
    <div style="padding:16px 24px;border-bottom:1px solid #f0ecff;">
      <table cellpadding='0' cellspacing='0' border='0' style='border-collapse:collapse;margin-bottom:16px;'><tr><td valign='middle' style='padding-right:14px;'><div style='position:relative;width:34px;height:40px;'><div style='position:absolute;top:5px;left:5px;width:30px;height:30px;border:1.5px solid #111;background:transparent;'></div><div style='position:absolute;top:0;left:0;width:30px;height:30px;border:1.5px solid #111;background:#fff;text-align:center;line-height:28px;font-family:Georgia,serif;font-weight:700;font-size:20px;color:#111;'>H</div></div></td><td valign='middle' style='font-family:DM Sans,Arial,sans-serif;font-weight:300;font-size:15px;letter-spacing:0.38em;color:#111;text-transform:lowercase;padding-bottom:2px;'>abitaris</td></tr></table>
    </div>
    <div style="padding:24px;">
      <h2 style="margin:0 0 12px 0;font-size:20px;font-weight:700;color:#111;">Hola ${nombre},</h2>
      <p style="margin:0 0 16px 0;font-size:14px;line-height:1.55;color:#333;">
        Te recordamos que tu <strong>${formName}</strong> caduca en <strong>${hoursBeforeExpiry} horas</strong>${expiryDate ? " (" + expiryDate + ")" : ""}.
      </p>
      <p style="margin:0 0 20px 0;font-size:14px;line-height:1.55;color:#333;">
        Si no lo cumplimentas a tiempo, el enlace se bloqueará y tendrás que solicitar uno nuevo.
      </p>
      <a href="${linkUrl}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:11px 20px;border-radius:6px;font-size:13px;font-weight:600;">
        Continuar con mi formulario →
      </a>
    </div>
    <div style="padding:16px 24px;border-top:1px solid #f0ecff;font-size:11px;color:#888;">
      Habitaris S.A.S · NIT 901.922.136-8 · Bogotá D.C., Colombia · +57 350 566 1545
    </div>
  </div>
</div>`;
}

function invitationTemplate(link) {
  const clientName = link.client_name || "";
  const formName = link.form_name || "tu briefing";
  const expiresDate = link.expires_at ? new Date(link.expires_at).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" }) : "la fecha indicada";
  const formUrl = `https://suite.habitaris.es/formulario/${link.link_id}`;
  const greeting = clientName ? `Hola ${clientName},` : "Hola,";
  const maxUses = link.max_uses;
  const expiryRulesText = (maxUses && maxUses > 0)
    ? `Caduca el ${expiresDate} y tienes un máximo de ${maxUses} ${maxUses === 1 ? 'apertura' : 'aperturas'}.`
    : `Tienes hasta el ${expiresDate} para completarlo.`;
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f0ff;font-family:DM Sans,Arial,sans-serif;color:#111;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f0ff;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;max-width:560px;width:100%;">
        <tr><td style="background:#fff;padding:24px;text-align:center;border-bottom:1px solid #eee"><img src="https://suite.habitaris.es/logo-habitaris.jpg" alt="Habitaris" height="50" style="display:block;margin:0 auto;"/></td></tr>
        <tr><td style="padding:32px 40px;">
          <h2 style="margin:0 0 16px 0;font-size:20px;font-weight:700;color:#111;">${greeting}</h2>
          <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#333;">Aquí tienes tu <strong>${formName}</strong>.</p>
          <div style="background:#f3f0ff;border-left:3px solid #111;padding:14px 16px;margin:20px 0;border-radius:4px;">
            <p style="margin:0;font-size:14px;color:#333;">📅 <strong>${expiryRulesText}</strong></p>
          </div>
          <div style="text-align:center;margin:28px 0;">
            <a href="${formUrl}" style="display:inline-block;padding:12px 28px;background:#111;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">Empezar el briefing</a>
          </div>
          <p style="margin:24px 0 0 0;font-size:14px;line-height:1.6;color:#666;">Si tienes cualquier duda, escríbenos a <a href="mailto:comercial@habitaris.es" style="color:#111;text-decoration:underline;">comercial@habitaris.es</a>.</p>
          <p style="margin:16px 0 0 0;font-size:14px;color:#333;">Un saludo,<br><strong>El equipo de Habitaris</strong></p>
        </td></tr>
        <tr><td style="padding:0 40px 16px 40px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#999;font-style:italic;">Correo automático. Por favor, no responder a esta dirección.</p>
        </td></tr>
        <tr><td style="background:#fafafa;padding:16px 40px;border-top:1px solid #eee;">
          <p style="margin:0;font-size:11px;color:#999;line-height:1.5;">Habitaris S.A.S · NIT 901.922.136-8 · Bogotá D.C., Colombia · +57 350 566 1545</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function expiredTemplate(link, whatsappPhone) {
  const clientName = link.client_name || "";
  const formName = link.form_name || "tu briefing";
  const greeting = clientName ? `Hola ${clientName},` : "Hola,";
  // Construir mensaje pre-rellenado de WhatsApp
  const phoneClean = (whatsappPhone || "+57 350 5661545").replace(/[^0-9]/g, "");
  const waText = encodeURIComponent(
    `Hola, quiero reactivar mi briefing. Soy ${clientName || '[mi nombre]'}.`
  );
  const waUrl = `https://wa.me/${phoneClean}?text=${waText}`;

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f0ff;font-family:DM Sans,Arial,sans-serif;color:#111;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f0ff;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;max-width:560px;width:100%;">
        <tr><td style="background:#fff;padding:24px;text-align:center;border-bottom:1px solid #eee"><img src="https://suite.habitaris.es/logo-habitaris.jpg" alt="Habitaris" height="50" style="display:block;margin:0 auto;"/></td></tr>
        <tr><td style="padding:32px 40px;">
          <h2 style="margin:0 0 16px 0;font-size:20px;font-weight:700;color:#111;">${greeting}</h2>
          <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#333;">Tu <strong>${formName}</strong> ha <strong>caducado</strong>.</p>
          <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#333;">Pulsa el siguiente botón si quieres reactivarlo:</p>
          <div style="text-align:center;margin:28px 0;">
            <a href="${waUrl}" style="display:inline-block;padding:12px 28px;background:#111;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">Reactivar enlace</a>
          </div>
          <p style="margin:16px 0 0 0;font-size:14px;color:#333;">Un saludo,<br><strong>El equipo de Habitaris</strong></p>
        </td></tr>
        <tr><td style="padding:0 40px 16px 40px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#999;font-style:italic;">Correo automático. Por favor, no responder a esta dirección.</p>
        </td></tr>
        <tr><td style="background:#fafafa;padding:16px 40px;border-top:1px solid #eee;">
          <p style="margin:0;font-size:11px;color:#999;line-height:1.5;">Habitaris S.A.S · NIT 901.922.136-8 · Bogotá D.C., Colombia · +57 350 566 1545</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
