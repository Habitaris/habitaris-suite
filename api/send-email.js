export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  // === BRIEFING FLOW ROUTER (3 acciones publicas) ===
  const briefingAction = req.query && req.query.action;
  if (briefingAction === "briefing_request") return await handleBriefingRequest(req, res);
  if (briefingAction === "briefing_approve") return await handleBriefingApprove(req, res);
  if (briefingAction === "briefing_reject")  return await handleBriefingReject(req, res);
  // Cron de Vercel hace GET con query string. Permitimos GET solo para crons unificados.
  const cronTypes = ["cron_daily"];
  const isCronGet = req.method === "GET" && (req.query && cronTypes.indexOf(req.query.type) !== -1);
  if (req.method !== "POST" && !isCronGet) return res.status(405).json({ error: "Method not allowed" });

  try {
    const body = req.body || {};
    // Permitir leer type desde query string (para cron Vercel GET)
    if (!body.type && req.query && req.query.type) body.type = req.query.type;
    // ============================================================
    // Router por body.type: tipos especiales que NO necesitan recipientEmail directo
    // ============================================================
    if (body.type === "cron_daily") {
      return await handleCronDaily(body, res);
    }
    if (body.type === "password_reset_request") {
      return await handlePasswordResetRequest(body, res);
    }
    if (body.type === "password_reset_confirm") {
      return await handlePasswordResetConfirm(body, res);
    }

    const recipientEmail = body.to || body.client_email;
    if (!recipientEmail) return res.status(400).json({ ok: false, error: "email required" });

    const RESEND_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_KEY) return res.status(500).json({ ok: false, error: "RESEND_API_KEY not set" });

    const empresa = body.from_name || "Habitaris";

    // ── 0) OTP code email (PIN reset / 2FA) ──
    if (body.type === "otp") {
      const __brand = await loadBrand(sb, body.tenant_id || "habitaris");
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
        + '<div style="font-size:10px;color:#aaa">' + (__brand.razon_social || "Habitaris S.A.S") + ' · NIT ' + (__brand.nit || "901.922.136-8") + ' · ' + (__brand.ciudad || "Bogotá D.C., Colombia") + ' · ' + (__brand.telefono || "+57 350 566 1545") + '</div></td></tr>'
        + '</table></td></tr></table></body></html>';

      var rOtp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": "Bearer " + RESEND_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: (__brand2.empresa || "Habitaris") + " <" + (__brand2.email_noreply || "noreply@habitaris.es") + ">",
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
        + '<div style="font-size:10px;color:#aaa;margin-top:8px">' + emp + ' · Bogotá D.C. · noreply@habitaris.es</div>'
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
        link.form_name = await getCurrentFormName(link, sb);
        const recipient = body.to || link.client_email;
        if (!recipient) return res.status(400).json({ ok: false, error: "recipient required" });
        const __brand = await loadBrand(sb, link.tenant_id || "habitaris");
        const html = invitationTemplate(link, __brand);
        const fromAddr = body.from || (__brand && __brand.empresa ? `${__brand.empresa} <${__brand.email_noreply || "noreply@habitaris.es"}>` : "Habitaris <noreply@habitaris.es>");
        const _short = (link.client_name || '').trim().split(/\s+/).filter(Boolean);
        const _shortName = _short.length >= 2 ? (_short[0] + ' ' + _short[_short.length - 1]) : (_short[0] || '');
        const subject = _shortName ? `${link.form_name || (__brand && __brand.empresa) || 'Habitaris'} — ${_shortName}` : (link.form_name || (__brand && __brand.empresa) || 'Habitaris');
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
        link.form_name = await getCurrentFormName(link, sb);
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
        const __brand_exp = await loadBrand(sb, link.tenant_id || "habitaris");
        const html = expiredTemplate(link, waPhone, __brand_exp);
        const fromAddr = body.from || ((__brand_exp && __brand_exp.empresa) ? `${__brand_exp.empresa} <${__brand_exp.email_noreply || "noreply@habitaris.es"}>` : "Habitaris <noreply@habitaris.es>");
        const _short = (link.client_name || '').trim().split(/\s+/).filter(Boolean);
        const _shortName = _short.length >= 2 ? (_short[0] + ' ' + _short[_short.length - 1]) : (_short[0] || '');
        const subject = _shortName ? `Tu enlace ha caducado — ${(__brand_exp && __brand_exp.empresa) || "Habitaris"} — ${_shortName}` : (`Tu enlace ha caducado — ${(__brand_exp && __brand_exp.empresa) || "Habitaris"}`);
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
      + '<div style="font-size:10px;color:#aaa;margin-top:8px">' + empresa + ' · Bogotá D.C. · noreply@habitaris.es</div>'
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

/**
 * Devuelve el nombre actual del formulario, leyendo de kv_store en tiempo real.
 * Si falla la lectura o no encuentra el form, hace fallback al snapshot link.form_name.
 * Esto resuelve el problema de que cambiar el nombre del formulario en la suite
 * no se reflejaba en los emails (el snapshot quedaba con el nombre antiguo).
 */
// Carga branding/identidad del tenant desde tenant_config.config (UNA SOLA query)
// Devuelve objeto plano con fallbacks a valores actuales para no romper nada.
// Primer paso para destrabar marca blanca: ir migrando hardcodes a brand.* progresivamente.
async function loadBrand(sb, tenantId) {
  const fallback = {
    empresa: "Habitaris",
    razon_social: "Habitaris S.A.S",
    nit: "901.922.136-8",
    tagline: "Diseño · Interiorismo · Arquitectura",
    ciudad: "Bogotá D.C., Colombia",
    pais: "Colombia",
    telefono: "+57 350 566 1545",
    email_publico: "comercial@habitaris.es",
    email_legal: "legal@habitaris.es",
    email_noreply: "noreply@habitaris.es",
    app_url: "https://suite.habitaris.es",
    web_url: "https://www.habitaris.es",
    logo_white_url: "/logo-habitaris-blanco.jpg",
    logo_black_url: "/logo-habitaris-negro.svg",
  };
  if (!sb || !tenantId) return fallback;
  try {
    const { data } = await sb.from("tenant_config").select("config").eq("tenant_id", tenantId).maybeSingle();
    const c = data && data.config ? data.config : {};
    const identity = c.identity || {};
    const empresa = c.empresa || {};
    const contact = c.contact || {};
    const contacto = c.contacto || {};
    const urls = c.urls || {};
    const branding = c.branding || {};
    const domCo = c.domicilio_co || {};
    const ciudad = domCo.ciudad ? (domCo.ciudad + (domCo.pais === "CO" ? " D.C., Colombia" : "")) : null;
    return {
      empresa:        identity.display_name   || empresa.nombre        || fallback.empresa,
      razon_social:   identity.legal_name     || empresa.razon_social  || fallback.razon_social,
      nit:            empresa.nit             || fallback.nit,
      tagline:        identity.tagline        || fallback.tagline,
      ciudad:         ciudad                  || fallback.ciudad,
      pais:           domCo.pais === "CO" ? "Colombia" : (domCo.pais || fallback.pais),
      telefono:       contact.primary_phone   || contacto.tel_co       || fallback.telefono,
      email_publico:  contact.primary_email   || contacto.email_publico|| fallback.email_publico,
      email_legal:    contact.legal_email     || fallback.email_legal,
      email_noreply:  contact.noreply_email   || fallback.email_noreply,
      app_url:        urls.app                || fallback.app_url,
      web_url:        urls.public_website     || fallback.web_url,
      logo_white_url: branding.logo_white_url || fallback.logo_white_url,
      logo_black_url: branding.logo_black_url || fallback.logo_black_url,
    };
  } catch (e) {
    return fallback;
  }
}

async function getCurrentFormName(link, sb) {
  try {
    const tenantId = link.tenant_id || "habitaris";
    const formId = link.form_id;
    if (!formId) return link.form_name || "tu briefing";
    const url = `${sb.url}/rest/v1/kv_store?tenant_id=eq.${tenantId}&key=eq.habitaris_formularios&select=value`;
    const r = await fetch(url, { headers: sb.headers });
    if (!r.ok) return link.form_name || "tu briefing";
    const rows = await r.json();
    if (!Array.isArray(rows) || !rows[0]) return link.form_name || "tu briefing";
    let data = rows[0].value;
    if (typeof data === "string") {
      try { data = JSON.parse(data); } catch (_) { return link.form_name || "tu briefing"; }
    }
    const forms = (data && data.forms) || [];
    const form = forms.find(f => f && f.id === formId);
    return (form && (form.nombre || form.name || form.title)) || link.form_name || "tu briefing";
  } catch (e) {
    return link.form_name || "tu briefing";
  }
}

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

// ============================================================
// CRON DAILY (unificado): ejecuta reminders + expired en una sola corrida.
// Llamado por Vercel Cron via GET /api/send-email?type=cron_daily
// ============================================================
async function handleCronDaily(body, res) {
  // Wrappers que evitan res.status(...).json(...) bloqueante en sub-handlers.
  const reminders = await runCronReminders().catch(err => ({ ok: false, error: String(err) }));
  const expired = await runCronExpired().catch(err => ({ ok: false, error: String(err) }));
  return res.status(200).json({
    ok: true,
    reminders,
    expired,
    ran_at: new Date().toISOString()
  });
}

// Ejecuta la lógica de reminders sin escribir res. Devuelve resumen.
async function runCronReminders() {
  try {
    const sb = getSupabaseClient();
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
    } catch(_) {}
    if (!enabled) return { ok: true, sent: 0, skipped: "disabled by config" };

    const now = new Date();
    const limitDate = new Date(now.getTime() + hoursBeforeExpiry * 3600 * 1000);
    const url = sb.url + "/rest/v1/form_links?active=eq.true&submitted_at=is.null&reminder_sent_at=is.null&expires_at=gt." + now.toISOString() + "&expires_at=lt." + limitDate.toISOString() + "&select=*";
    const r = await fetch(url, { headers: sb.headers });
    const candidates = await r.json().catch(() => []);
    if (!Array.isArray(candidates) || candidates.length === 0) return { ok: true, sent: 0, message: "no candidates" };

    const RESEND_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_KEY) return { ok: false, error: "RESEND_API_KEY missing" };

    let sent = 0, failed = 0; const results = [];
    for (const link of candidates) {
      const recipient = link.client_email;
      if (!recipient) { failed++; continue; }
      const __brand_pre = await loadBrand(sb, link.tenant_id || "habitaris");
      const sender = (__brand_pre && __brand_pre.empresa) ? `${__brand_pre.empresa} <${__brand_pre.email_noreply || "noreply@habitaris.es"}>` : "Habitaris <noreply@habitaris.es>";
      // Leer en vivo el nombre actual del formulario (kv_store > snapshot del link)
      try { link.form_name = await getCurrentFormName(link, sb); } catch(_) {}
      const html = preExpiryReminderTemplate(link, hoursBeforeExpiry, __brand_pre);
      const _formName = link.form_name || "tu formulario";
      const subject = `Caduca pronto — ${_formName} · ${(__brand_pre && __brand_pre.empresa) || "Habitaris"}`;
      try {
        const sendR = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + RESEND_KEY },
          body: JSON.stringify({ from: sender, to: recipient, subject, html })
        });
        if (sendR.ok) {
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
    return { ok: true, sent, failed, total: candidates.length, hours_before_expiry: hoursBeforeExpiry, results };
  } catch(err) {
    return { ok: false, error: String(err) };
  }
}

// Ejecuta la lógica de expired: links que caducaron por fecha O por agotar usos.
// Marca expired_notified_at para no duplicar.
async function runCronExpired() {
  try {
    const sb = getSupabaseClient();
    const nowIso = new Date().toISOString();

    // Candidatos: activos, no enviados, no notificados antes,
    //   Y (expires_at < now()  O  current_uses >= max_uses con max_uses>0)
    // Filtro principal: expired_notified_at IS NULL AND submitted_at IS NULL AND active=true
    // El criterio combinado lo aplicamos en JS porque PostgREST no permite OR fácilmente con ambos lados.
    const url = sb.url + "/rest/v1/form_links?active=eq.true&submitted_at=is.null&expired_notified_at=is.null&select=*";
    const r = await fetch(url, { headers: sb.headers });
    const all = await r.json().catch(() => []);
    if (!Array.isArray(all) || all.length === 0) return { ok: true, sent: 0, message: "no candidates" };

    const now = Date.now();
    const candidates = all.filter(l => {
      const byTime = l.expires_at && new Date(l.expires_at).getTime() < (now - 60 * 60 * 1000);
      const byUses = (l.max_uses || 0) > 0 && (l.current_uses || 0) >= l.max_uses;
      return byTime || byUses;
    });
    if (candidates.length === 0) return { ok: true, sent: 0, message: "no expired" };

    const RESEND_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_KEY) return { ok: false, error: "RESEND_API_KEY missing" };

    // Telefono WhatsApp desde kv_store
    let waPhone = "+57 350 5661545";
    try {
      const kvR = await fetch(sb.url + "/rest/v1/kv_store?key=eq.habitaris_phones&select=value", { headers: sb.headers });
      const kv = await kvR.json();
      if (Array.isArray(kv) && kv[0]) {
        const cfg = typeof kv[0].value === "string" ? JSON.parse(kv[0].value) : kv[0].value;
        const def = cfg.whatsapp_default || "co";
        if (cfg[def]) waPhone = cfg[def];
      }
    } catch(_) {}

    let sent = 0, failed = 0; const results = [];
    for (const link of candidates) {
      const recipient = link.client_email;
      if (!recipient) {
        // Sin email, marcamos notificado igual para no quedar atascado evaluando este registro
        await fetch(sb.url + "/rest/v1/form_links?link_id=eq." + link.link_id, {
          method: "PATCH",
          headers: { ...sb.headers, "Content-Type": "application/json", Prefer: "return=minimal" },
          body: JSON.stringify({ expired_notified_at: new Date().toISOString() })
        });
        failed++; results.push({ link_id: link.link_id, recipient: null, ok: false, reason: "no_email" });
        continue;
      }
      // Resolver form_name actualizado
      try { link.form_name = await getCurrentFormName(link, sb); } catch(_) {}
      const __brand_cron_exp = await loadBrand(sb, link.tenant_id || "habitaris");
      const sender = (__brand_cron_exp && __brand_cron_exp.empresa) ? `${__brand_cron_exp.empresa} <${__brand_cron_exp.email_noreply || "noreply@habitaris.es"}>` : "Habitaris <noreply@habitaris.es>";
      const html = expiredTemplate(link, waPhone, __brand_cron_exp);
      const _short = (link.client_name || "").trim().split(/\s+/).filter(Boolean);
      const _shortName = _short.length >= 2 ? (_short[0] + " " + _short[_short.length - 1]) : (_short[0] || "");
      const subject = _shortName ? ("Tu enlace ha caducado — Habitaris — " + _shortName) : "Tu enlace ha caducado — Habitaris";
      try {
        const sendR = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + RESEND_KEY },
          body: JSON.stringify({ from: sender, to: recipient, subject, html })
        });
        if (sendR.ok) {
          await fetch(sb.url + "/rest/v1/form_links?link_id=eq." + link.link_id, {
            method: "PATCH",
            headers: { ...sb.headers, "Content-Type": "application/json", Prefer: "return=minimal" },
            body: JSON.stringify({ expired_notified_at: new Date().toISOString() })
          });
          sent++; results.push({ link_id: link.link_id, recipient, ok: true });
        } else {
          failed++; results.push({ link_id: link.link_id, recipient, ok: false });
        }
      } catch(err) {
        failed++; results.push({ link_id: link.link_id, recipient, ok: false, err: String(err) });
      }
    }
    return { ok: true, sent, failed, total: candidates.length, results };
  } catch(err) {
    return { ok: false, error: String(err) };
  }
}

function preExpiryReminderTemplate(link, hoursBeforeExpiry, brand) {
  brand = brand || {};
  const nombre = (link.client_name || "").split(" ")[0] || "Hola";
  const formName = link.form_name || "tu formulario";
  const linkUrl = "https://suite.habitaris.es/formulario/" + link.link_id;
  const expiryDate = link.expires_at ? new Date(link.expires_at).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" }) : "";
  return `
<div style="background:#f5f3ff;padding:24px 16px;font-family:DM Sans,Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;">
    <div style="padding:16px 24px;border-bottom:1px solid #f0ecff;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="background:#fff;padding:24px;text-align:center;border-bottom:1px solid #f0ecff"><img src="${(brand.logo_black_url && brand.logo_black_url.indexOf('http')===0) ? brand.logo_black_url : ((brand.app_url || 'https://suite.habitaris.es') + (brand.logo_black_url || '/logo-habitaris.jpg'))}" alt="${brand.empresa || 'Habitaris'}" height="50" style="display:block;margin:0 auto;"/></td></tr>
      </table>
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
      ${brand.razon_social || "Habitaris S.A.S"} · NIT ${brand.nit || "901.922.136-8"} · ${brand.ciudad || "Bogotá D.C., Colombia"} · ${brand.telefono || "+57 350 566 1545"}
    </div>
  </div>
</div>`;
}

function invitationTemplate(link, brand) {
  brand = brand || {};
  const clientName = link.client_name || "";
  const formName = link.form_name || "tu briefing";
  const formUrl = (brand.app_url || "https://suite.habitaris.es") + "/formulario/" + link.link_id;
  const greeting = clientName ? "Hola " + clientName + "," : "Hola,";
  const maxUses = link.max_uses;

  // Calcular horas hasta caducidad (ahora vs expires_at)
  let hoursUntilExpiry = null;
  if (link.expires_at) {
    const now = new Date();
    const exp = new Date(link.expires_at);
    const diffMs = exp.getTime() - now.getTime();
    if (diffMs > 0) hoursUntilExpiry = Math.round(diffMs / (1000 * 60 * 60));
  }

  // Texto dinamico de aperturas
  let aperturasText;
  if (!maxUses || maxUses === 0) {
    aperturasText = "Puedes abrirlo las veces que quieras";
  } else if (maxUses === 1) {
    aperturasText = "Puedes abrirlo una sola vez para completarlo";
  } else {
    aperturasText = "Puedes abrirlo hasta " + maxUses + " veces para completarlo";
  }

  // Texto completo de vigencia
  let vigenciaText;
  if (hoursUntilExpiry === null || hoursUntilExpiry <= 0) {
    if (!maxUses || maxUses === 0) {
      vigenciaText = "Este link no caduca y puedes abrirlo cuantas veces quieras.";
    } else {
      vigenciaText = "Este link no caduca. " + aperturasText + ".";
    }
  } else {
    const horaWord = hoursUntilExpiry === 1 ? "hora" : "horas";
    vigenciaText = "Tu link caduca " + hoursUntilExpiry + " " + horaWord + " despues de recibir este correo. " + aperturasText + ".";
  }

  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f0ff;font-family:'DM Sans',Arial,sans-serif;color:#111;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f0ff;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#fff;border-radius:8px;overflow:hidden;">
        <tr><td style="background:#fff;padding:24px;text-align:center;border-bottom:1px solid #eee;">
          <img src="${(brand.logo_black_url && brand.logo_black_url.startsWith('http')) ? brand.logo_black_url : ((brand.app_url || 'https://suite.habitaris.es') + (brand.logo_black_url || '/logo-habitaris.jpg'))}" alt="${brand.empresa || 'Habitaris'}" height="50" style="height:50px;display:inline-block;">
        </td></tr>
        <tr><td style="padding:32px 28px;">
          <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#111;">${greeting}</p>
          <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#333;">Aquí tienes tu <strong>${formName}</strong>. Rellénalo con calma para que podamos entender bien tu proyecto.</p>
          <div style="text-align:center;margin:28px 0;">
            <a href="${formUrl}" style="display:inline-block;padding:14px 32px;background:#111;color:#fff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:500;">Empezar el briefing</a>
          </div>
          <div style="background:#f3f0ff;border-left:3px solid #111;border-radius:6px;padding:14px 18px;margin:24px 0;font-size:13px;line-height:1.6;color:#333;">
            ${vigenciaText}
          </div>
          <p style="margin:24px 0 0 0;font-size:14px;line-height:1.6;color:#333;">Si tienes cualquier duda, escribenos a <a href="mailto:comercial@habitaris.es" style="color:#111;">comercial@habitaris.es</a>.</p>
          <p style="margin:24px 0 0 0;font-size:14px;line-height:1.6;color:#333;">Un saludo,<br>El equipo de Habitaris</p>
        </td></tr>
        <tr><td style="padding:20px 28px;border-top:1px solid #eee;text-align:center;font-size:11px;color:#888;line-height:1.5;">
          " + (brand.razon_social || "Habitaris S.A.S") + " &middot; NIT " + (brand.nit || "901.922.136-8") + " &middot; " + (brand.ciudad || "Bogotá D.C., Colombia") + " &middot; " + (brand.telefono || "+57 350 566 1545") + "<br>
          <span style="color:#aaa;">Correo automático. Por favor, no responder a esta dirección.</span>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function expiredTemplate(link, whatsappPhone, brand) {
  brand = brand || {};
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
        <tr><td style="background:#fff;padding:24px;text-align:center;border-bottom:1px solid #eee"><img src="${(brand.logo_black_url && brand.logo_black_url.indexOf('http')===0) ? brand.logo_black_url : ((brand.app_url || 'https://suite.habitaris.es') + (brand.logo_black_url || '/logo-habitaris.jpg'))}" alt="${brand.empresa || 'Habitaris'}" height="50" style="display:block;margin:0 auto;"/></td></tr>
        <tr><td style="padding:32px 40px;">
          <h2 style="margin:0 0 16px 0;font-size:20px;font-weight:700;color:#111;">${greeting}</h2>
          <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#333;">Tu <strong>${formName}</strong> ha <strong>caducado</strong>.</p>
          <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#333;">Pulsa el siguiente botón si quieres reactivarlo:</p>
          <div style="text-align:center;margin:28px 0;">
            <a href="${waUrl}" style="display:inline-block;padding:12px 28px;background:#111;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">Reactivar enlace</a>
          </div>
          <p style="margin:16px 0 0 0;font-size:14px;color:#333;">Un saludo,<br><strong>El equipo de ${brand.empresa || 'Habitaris'}</strong></p>
        </td></tr>
        <tr><td style="padding:0 40px 16px 40px;text-align:center;">
          <p style="margin:0 0 6px 0;font-size:12px;color:#666;">Si tienes cualquier duda, escríbenos a <a href="mailto:${brand.email_publico || 'comercial@habitaris.es'}" style="color:#111;text-decoration:underline;">${brand.email_publico || 'comercial@habitaris.es'}</a>.</p>
          <p style="margin:0;font-size:11px;color:#999;font-style:italic;">Correo automático. Por favor, no responder a esta dirección.</p>
        </td></tr>
        <tr><td style="background:#fafafa;padding:16px 40px;border-top:1px solid #eee;">
          <p style="margin:0;font-size:11px;color:#999;line-height:1.5;">${brand.razon_social || "Habitaris S.A.S"} · NIT ${brand.nit || "901.922.136-8"} · ${brand.ciudad || "Bogotá D.C., Colombia"} · ${brand.telefono || "+57 350 566 1545"}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

// ──────────────────────────── PASSWORD RESET ────────────────────────────

async function sha256Hex(str) {
  const crypto = await import("crypto");
  return crypto.createHash("sha256").update(str).digest("hex");
}

function randomToken(bytes) {
  const arr = new Uint8Array(bytes || 32);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Resuelve identifier (username/email/documento) a {user_id, email_destino} server-side.
 * email_destino es el email principal donde mandar el reset link.
 */
async function resolveUserForReset(identifier) {
  const sb = getSupabaseClient();
  const v = (identifier || "").trim().toLowerCase();
  if (!v) return null;

  let userId = null;

  // Caso 1: email
  if (v.indexOf("@") !== -1) {
    // Buscar en users.email
    const r1 = await fetch(sb.url + "/rest/v1/users?select=id,email&email=eq." + encodeURIComponent(v) + "&limit=1", { headers: sb.headers });
    const d1 = await r1.json();
    if (Array.isArray(d1) && d1[0]) userId = d1[0].id;
    // Fallback en auth_methods
    if (!userId) {
      const r2 = await fetch(sb.url + "/rest/v1/auth_methods?select=user_id&type=eq.email&identifier=eq." + encodeURIComponent(v) + "&limit=1", { headers: sb.headers });
      const d2 = await r2.json();
      if (Array.isArray(d2) && d2[0]) userId = d2[0].user_id;
    }
  } else if (/^\d{5,}$/.test(v)) {
    // Caso 2: documento
    const r = await fetch(sb.url + "/rest/v1/user_documents?select=user_id&numero=eq." + encodeURIComponent(v) + "&limit=1", { headers: sb.headers });
    const d = await r.json();
    if (Array.isArray(d) && d[0]) userId = d[0].user_id;
  } else {
    // Caso 3: username
    const r = await fetch(sb.url + "/rest/v1/users?select=id&username=eq." + encodeURIComponent(v) + "&limit=1", { headers: sb.headers });
    const d = await r.json();
    if (Array.isArray(d) && d[0]) userId = d[0].id;
  }

  if (!userId) return null;

  // Buscar email principal en auth_methods (primary first)
  const rE = await fetch(sb.url + "/rest/v1/auth_methods?select=identifier&user_id=eq." + userId + "&type=eq.email&order=is_primary.desc&limit=1", { headers: sb.headers });
  const dE = await rE.json();
  let email = (Array.isArray(dE) && dE[0] && dE[0].identifier) || null;

  // Fallback: users.email
  if (!email) {
    const rU = await fetch(sb.url + "/rest/v1/users?select=email,display_name,nombre&id=eq." + userId + "&limit=1", { headers: sb.headers });
    const dU = await rU.json();
    if (Array.isArray(dU) && dU[0]) email = dU[0].email;
  }

  if (!email) return null;

  // Display name
  const rN = await fetch(sb.url + "/rest/v1/users?select=display_name,nombre&id=eq." + userId + "&limit=1", { headers: sb.headers });
  const dN = await rN.json();
  const nombre = (Array.isArray(dN) && dN[0] && (dN[0].display_name || dN[0].nombre)) || "";

  return { user_id: userId, email: email, nombre: nombre };
}

async function handlePasswordResetRequest(body, res) {
  const sb = getSupabaseClient();
  const __brand = await loadBrand(sb, body.tenant_id || "habitaris");
  try {
    const identifier = body.identifier;
    if (!identifier) return res.status(400).json({ ok: false, error: "identifier required" });

    const RESEND_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_KEY) return res.status(500).json({ ok: false, error: "RESEND_API_KEY not set" });

    const found = await resolveUserForReset(identifier);

    // Por seguridad: respondemos OK aunque el user no exista (no revelar)
    if (!found) {
      return res.status(200).json({ ok: true, sent: false });
    }

    const sb = getSupabaseClient();
    const token = randomToken(32);
    const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1h

    // Guardar token en users.invite_token + invite_expires
    const upd = await fetch(sb.url + "/rest/v1/users?id=eq." + found.user_id, {
      method: "PATCH",
      headers: Object.assign({}, sb.headers, { Prefer: "return=minimal" }),
      body: JSON.stringify({ invite_token: token, invite_expires: expires }),
    });
    if (!upd.ok) {
      const t = await upd.text().catch(() => "");
      return res.status(500).json({ ok: false, error: "no se pudo guardar el token: " + t });
    }

    // Construir link de reset
    const baseUrl = process.env.APP_BASE_URL || "https://suite.habitaris.es";
    const resetLink = baseUrl + "/recuperar?token=" + token;

    // Plantilla email
    const nombre = found.nombre || "";
    const greeting = nombre ? "Hola " + nombre.split(" ")[0] + "," : "Hola,";
    const html = '<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F5F4F1;font-family:Arial,sans-serif">'
      + '<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F4F1;padding:40px 20px"><tr><td align="center">'
      + '<table width="500" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">'
      + '<tr><td style="background:#fff;padding:24px;text-align:center;border-bottom:1px solid #eee"><img src="https://suite.habitaris.es/logo-habitaris.jpg" alt="Habitaris" width="140"/></td></tr>'
      + '<tr><td style="padding:32px 40px">'
      + '<div style="font-size:18px;font-weight:bold;color:#111;margin-bottom:12px">Restablecer contraseña</div>'
      + '<div style="font-size:14px;color:#555;line-height:1.7;margin-bottom:24px">' + greeting + '<br><br>Recibimos una solicitud para restablecer tu contraseña en la suite Habitaris. Pulsa el botón para crear una nueva:</div>'
      + '<div style="text-align:center;margin:24px 0">'
      + '<a href="' + resetLink + '" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:14px;font-weight:600">Establecer nueva contraseña</a>'
      + '</div>'
      + '<div style="font-size:12px;color:#999;margin-top:20px;line-height:1.6">Este enlace caduca en 1 hora. Si no solicitaste cambiar la contraseña, puedes ignorar este correo: tu contraseña actual seguirá funcionando.</div>'
      + '<div style="font-size:11px;color:#bbb;margin-top:12px;word-break:break-all">Si el botón no funciona, copia este enlace: ' + resetLink + '</div>'
      + '</td></tr>'
      + '<tr><td style="background:#F5F4F1;padding:16px;text-align:center;border-top:1px solid #E5E3DE">'
      + '<div style="font-size:10px;color:#aaa">' + (__brand.razon_social || "Habitaris S.A.S") + ' · NIT ' + (__brand.nit || "901.922.136-8") + ' · ' + (__brand.ciudad || "Bogotá D.C., Colombia") + '</div></td></tr>'
      + '</table></td></tr></table></body></html>';

    const sendR = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": "Bearer " + RESEND_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: (__brand.empresa || "Habitaris") + " <" + (__brand.email_noreply || "noreply@habitaris.es") + ">",
        to: [found.email],
        subject: "Restablecer contraseña — " + (__brand.empresa || "Habitaris") + " Suite",
        html: html,
      }),
    });
    const sendData = await sendR.json().catch(() => ({}));
    if (!sendR.ok) return res.status(500).json({ ok: false, error: sendData.message || "send failed" });
    return res.status(200).json({ ok: true, sent: true, resend_id: sendData.id || null });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e && e.message || e) });
  }
}

async function handlePasswordResetConfirm(body, res) {
  try {
    const token = body.token;
    const newPassword = body.new_password;
    if (!token || !newPassword) return res.status(400).json({ ok: false, error: "token y new_password requeridos" });
    if (newPassword.length < 6) return res.status(400).json({ ok: false, error: "La contraseña debe tener al menos 6 caracteres" });

    const sb = getSupabaseClient();

    // Buscar user con ese token y verificar expiración
    const r = await fetch(sb.url + "/rest/v1/users?select=id,invite_expires,email,display_name,nombre,rol,username&invite_token=eq." + encodeURIComponent(token) + "&limit=1", { headers: sb.headers });
    const d = await r.json();
    if (!Array.isArray(d) || !d[0]) return res.status(400).json({ ok: false, error: "Token inválido o ya usado" });
    const user = d[0];
    if (user.invite_expires && new Date(user.invite_expires).getTime() < Date.now()) {
      return res.status(400).json({ ok: false, error: "El enlace ha caducado. Solicita uno nuevo." });
    }

    const newHash = await sha256Hex(newPassword);
    const upd = await fetch(sb.url + "/rest/v1/users?id=eq." + user.id, {
      method: "PATCH",
      headers: Object.assign({}, sb.headers, { Prefer: "return=minimal" }),
      body: JSON.stringify({ password_hash: newHash, invite_token: null, invite_expires: null, estado: "activo" }),
    });
    if (!upd.ok) {
      const t = await upd.text().catch(() => "");
      return res.status(500).json({ ok: false, error: "No se pudo actualizar la contraseña: " + t });
    }

    return res.status(200).json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        nombre: user.display_name || user.nombre,
        rol: user.rol,
        username: user.username,
      },
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e && e.message || e) });
  }
}

// ====================================================
// BRIEFING FLOW: helpers + 3 handlers
// ====================================================

function briefingEscape(s) {
  if (s === null || s === undefined) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function briefingHtmlPage(title, bodyHtml) {
  return [
    "<!doctype html><html lang=\"es\"><head><meta charset=\"utf-8\"/>",
    "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"/>",
    "<title>" + briefingEscape(title) + " - Habitaris</title>",
    "<link href=\"https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap\" rel=\"stylesheet\">",
    "<style>",
    "*{box-sizing:border-box;}",
    "body{margin:0;font-family:Outfit,DM Sans,-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif;background:#f3f0ff;color:#111;min-height:100vh;}",
    ".card{max-width:560px;margin:48px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);}",
    ".header{background:#fff;padding:24px;text-align:center;border-bottom:1px solid #ebe7ff;}",
    ".header img{height:50px;display:inline-block;}",
    ".content{padding:32px 24px;text-align:center;}",
    "h1{font-size:24px;margin:0 0 16px;font-weight:600;color:#111;}",
    "p{margin:8px 0;font-size:15px;line-height:1.6;color:#3a3a39;}",
    ".small{font-size:13px;color:#666;margin-top:16px;}",
    ".footer{padding:16px 24px;text-align:center;font-size:11px;color:#999;background:#fafafa;}",
    "</style></head><body>",
    "<div class=\"card\">",
    "<div class=\"header\"><img src=\"https://suite.habitaris.es/logo-habitaris.jpg\" alt=\"Habitaris\"></div>",
    "<div class=\"content\">",
    bodyHtml,
    "</div>",
    "<div class=\"footer\">Habitaris S.A.S &middot; NIT 901.922.136-8 &middot; Bogot\u00e1 D.C., Colombia &middot; +57 350 566 1545</div>",
    "</div></body></html>",
  ].join("");
}
async function briefingGetRecipients(sb, eventType) {
  try {
    const u = sb.url + "/rest/v1/notification_recipients?tenant_id=eq.habitaris&event_type=eq." + encodeURIComponent(eventType) + "&active=is.true&select=email,role,form_id";
    console.log("[briefing_recipients] URL:", u);
    console.log("[briefing_recipients] headers keys:", Object.keys(sb.headers || {}));
    const r = await fetch(u, { headers: sb.headers });
    console.log("[briefing_recipients] status:", r.status, "ok:", r.ok);
    const bodyText = await r.text();
    console.log("[briefing_recipients] body (first 500):", bodyText.slice(0, 500));
    if (!r.ok) return [];
    let rows;
    try { rows = JSON.parse(bodyText); } catch(e) { console.error("[briefing_recipients] JSON parse fail:", e.message); return []; }
    console.log("[briefing_recipients] parsed rows count:", Array.isArray(rows) ? rows.length : 'NOT_ARRAY', "sample:", JSON.stringify(rows).slice(0, 300));
    return Array.isArray(rows) ? rows : [];
  } catch (e) {
    console.error("[briefing_recipients] EXCEPTION:", e.message, e.stack);
    return [];
  }
}
async function handleBriefingRequest(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Metodo no permitido" });
    }
    const body = req.body || {};
    const nombre = String(body.nombre_completo || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const telefono = String(body.telefono || "").trim();
    const mensaje = String(body.mensaje_opcional || "").trim();
    const honey = String(body.website || "").trim();

    if (honey.length > 0) {
      return res.status(200).json({ ok: true });
    }

    if (nombre.length < 3) return res.status(400).json({ ok: false, error: "Nombre demasiado corto" });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ ok: false, error: "Email invalido" });
    if (telefono.length < 7) return res.status(400).json({ ok: false, error: "Telefono invalido" });

    const RESEND_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_KEY) return res.status(500).json({ ok: false, error: "Servidor mal configurado" });

    const sb = getSupabaseClient();
    const __brand = await loadBrand(sb, body.tenant_id || "habitaris");

    const approveToken = randomToken(20);
    const rejectToken = randomToken(20);
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const ipAddress = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || null;
    const userAgent = String(req.headers["user-agent"] || "").slice(0, 500);

    const insertRes = await fetch(sb.url + "/rest/v1/briefing_requests", {
      method: "POST",
      headers: { ...sb.headers, "Content-Type": "application/json", "Prefer": "return=representation" },
      body: JSON.stringify({
        tenant_id: "habitaris",
        nombre_completo: nombre,
        email: email,
        telefono: telefono,
        mensaje_opcional: mensaje || null,
        status: "pendiente",
        approve_token: approveToken,
        reject_token: rejectToken,
        token_expires_at: expiresAt,
        ip_address: ipAddress,
        user_agent: userAgent,
      }),
    });
    if (!insertRes.ok) {
      const errTxt = await insertRes.text().catch(() => "");
      console.error("[briefing_request] insert failed:", insertRes.status, errTxt);
      return res.status(500).json({ ok: false, error: "No se pudo guardar la solicitud" });
    }

    const recipients = await briefingGetRecipients(sb, "briefing.request_received");
    const approvers = recipients.filter(r => r.role === "approver").map(r => r.email);
    const ccList = recipients.filter(r => r.role === "cc" || r.role === "info").map(r => r.email);
    console.log("[briefing_request] approvers count:", approvers.length, "list:", JSON.stringify(approvers));
    console.log("[briefing_request] ccList count:", ccList.length, "list:", JSON.stringify(ccList));

    if (approvers.length === 0) {
      console.warn("[briefing_request] no approvers configured");
      return res.status(200).json({ ok: true, warning: "no_approvers" });
    }

    const baseUrl = "https://suite.habitaris.es";
    const approveUrl = baseUrl + "/api/send-email?action=briefing_approve&token=" + encodeURIComponent(approveToken);
    const rejectUrl  = baseUrl + "/api/send-email?action=briefing_reject&token="  + encodeURIComponent(rejectToken);

    const emailHtml = [
      "<!doctype html><html><head><meta charset=\"utf-8\"/>",
      "<title>Nueva solicitud de briefing</title>",
      "<style>",
      "@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');",
      "body{margin:0;padding:0;background:#f3f0ff;font-family:'Outfit',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111;}",
      ".wrap{max-width:600px;margin:32px auto;padding:0 16px;}",
      ".card{background:#fff;border-radius:8px;overflow:hidden;}",
      ".header{background:#fff;padding:24px;text-align:center;border-bottom:1px solid #eee;}",
      ".header img{height:50px;display:inline-block;}",
      ".body{padding:32px 28px;}",
      "h1{font-size:22px;font-weight:600;margin:0 0 12px 0;color:#111;}",
      "p{font-size:15px;line-height:1.6;margin:0 0 16px 0;color:#333;}",
      ".datos{background:#f3f0ff;border-left:3px solid #111;border-radius:6px;padding:18px 20px;margin:20px 0;}",
      ".datos .row{margin-bottom:12px;}",
      ".datos .row:last-child{margin-bottom:0;}",
      ".datos .label{font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#666;font-weight:600;margin-bottom:2px;display:block;}",
      ".datos .val{font-size:14px;color:#111;font-weight:500;}",
      ".buttons{margin:28px 0 8px 0;text-align:center;}",
      ".btn{display:inline-block;padding:12px 28px;border-radius:6px;font-size:14px;font-weight:500;text-decoration:none;margin:0 6px;}",
      ".btn-approve{background:#111;color:#fff!important;}",
      ".btn-reject{background:#fff;color:#111!important;border:1px solid #ddd;}",
      ".note{font-size:12px;color:#888;text-align:center;margin-top:18px;line-height:1.5;}",
      ".footer{padding:24px;text-align:center;font-size:12px;color:#888;border-top:1px solid #eee;}",
      ".footer .sub{margin-top:6px;color:#aaa;}",
      "</style></head><body>",
      "<div class=\"wrap\"><div class=\"card\">",
      "<div class=\"header\"><img src=\"https://suite.habitaris.es/logo-habitaris.jpg\" alt=\"Habitaris\"/></div>",
      "<div class=\"body\">",
      "<h1>Nueva solicitud de briefing</h1>",
      "<p>Un cliente potencial ha solicitado el formulario de briefing. Revisa los datos y aprueba o rechaza la solicitud.</p>",
      "<div class=\"datos\">",
      "<div class=\"row\"><span class=\"label\">Nombre</span><span class=\"val\">" + briefingEscape(nombre) + "</span></div>",
      "<div class=\"row\"><span class=\"label\">Email</span><span class=\"val\">" + briefingEscape(email) + "</span></div>",
      "<div class=\"row\"><span class=\"label\">Teléfono</span><span class=\"val\">" + briefingEscape(telefono) + "</span></div>",
      mensaje ? "<div class=\"row\"><span class=\"label\">Mensaje</span><span class=\"val\">" + briefingEscape(mensaje) + "</span></div>" : "",
      "</div>",
      "<div class=\"buttons\">",
      "<a href=\"" + approveUrl + "\" class=\"btn btn-approve\">Aprobar y enviar</a>",
      "<a href=\"" + rejectUrl + "\" class=\"btn btn-reject\">Rechazar</a>",
      "</div>",
      "<p class=\"note\">Si apruebas, el cliente recibe automaticamente su link de briefing (validez 48h, 2 usos). Los botones expiran en 48 horas. Si los dos aprobadores hacen clic, gana el primero.</p>",
      "</div>",
      "<div class=\"footer\">" + (__brand.razon_social || "Habitaris S.A.S") + " &middot; NIT " + (__brand.nit || "901.922.136-8") + " &middot; " + (__brand.ciudad || "Bogotá D.C., Colombia") + " &middot; " + (__brand.telefono || "+57 350 566 1545") + "<div class=\"sub\">Si tienes cualquier duda, escribenos a " + (__brand.email_publico || "comercial@habitaris.es") + "</div></div>",
      "</div></div></body></html>"
    ].join("");

    const resendBody = {
      from: (__brand.empresa || "Habitaris") + " <" + (__brand.email_noreply || "noreply@habitaris.es") + ">",
      to: approvers,
      cc: ccList.length > 0 ? ccList : undefined,
      reply_to: "comercial@habitaris.es",
      subject: "Nueva solicitud de briefing - " + nombre,
      html: emailHtml,
    };

    console.log("[briefing_request] about to call resend, body.to:", JSON.stringify(resendBody.to), "subject:", resendBody.subject);
    let sendRes;
    try {
      sendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": "Bearer " + RESEND_KEY, "Content-Type": "application/json" },
        body: JSON.stringify(resendBody),
      });
      console.log("[briefing_request] resend returned status:", sendRes.status, "ok:", sendRes.ok);
    } catch (fetchErr) {
      console.error("[briefing_request] resend FETCH THREW:", fetchErr.message, fetchErr.stack);
      return res.status(500).json({ ok: false, error: "resend_fetch_threw", detail: fetchErr.message });
    }
    if (!sendRes.ok) {
      const errTxt = await sendRes.text().catch(() => "");
      console.error("[briefing_request] resend failed:", sendRes.status, errTxt);
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("[briefing_request] error:", e);
    return res.status(500).json({ ok: false, error: "Error interno" });
  }
}
async function handleBriefingApprove(req, res) {
  try {
    const token = String((req.query && req.query.token) || "").trim();
    if (!token || token.length < 20) {
      return res.status(400).send(briefingHtmlPage("Link invalido", "<h1>Link invalido</h1><p>El enlace no es valido o esta incompleto.</p>"));
    }

    const RESEND_KEY = process.env.RESEND_API_KEY;
    const sb = getSupabaseClient();

    const findUrl = sb.url + "/rest/v1/briefing_requests?approve_token=eq." + encodeURIComponent(token) + "&select=*";
    const findRes = await fetch(findUrl, { headers: sb.headers });
    if (!findRes.ok) {
      return res.status(500).send(briefingHtmlPage("Error", "<h1>Error</h1><p>No se pudo verificar el enlace. Intenta de nuevo en unos minutos.</p>"));
    }
    const rows = await findRes.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(404).send(briefingHtmlPage("No encontrado", "<h1>Solicitud no encontrada</h1><p>El enlace ya no es valido o nunca existio.</p>"));
    }
    const reqRow = rows[0];

    if (reqRow.status === "aprobado") {
      const who = reqRow.approved_by || "otro aprobador";
      const when = reqRow.approved_at ? new Date(reqRow.approved_at).toLocaleString("es-CO") : "";
      return res.status(200).send(briefingHtmlPage("Ya aprobada", "<h1>Ya fue aprobada</h1><p>Esta solicitud ya fue aprobada por <strong>" + briefingEscape(who) + "</strong>" + (when ? " el " + briefingEscape(when) : "") + ".</p><p class=\"small\">El cliente ya recibio su link de briefing.</p>"));
    }
    if (reqRow.status === "rechazado") {
      return res.status(200).send(briefingHtmlPage("Ya rechazada", "<h1>Ya fue rechazada</h1><p>Esta solicitud ya fue rechazada por otro aprobador.</p>"));
    }
    if (new Date(reqRow.token_expires_at) < new Date()) {
      return res.status(200).send(briefingHtmlPage("Caducada", "<h1>Solicitud caducada</h1><p>El enlace ha expirado (validez 48h).</p>"));
    }

    const updateUrl = sb.url + "/rest/v1/briefing_requests?id=eq." + encodeURIComponent(reqRow.id) + "&status=eq.pendiente";
    const updateRes = await fetch(updateUrl, {
      method: "PATCH",
      headers: { ...sb.headers, "Content-Type": "application/json", "Prefer": "return=representation" },
      body: JSON.stringify({ status: "aprobado", approved_at: new Date().toISOString(), approved_by: "aprobador" }),
    });
    if (!updateRes.ok) {
      console.error("[briefing_approve] update failed:", updateRes.status);
      return res.status(500).send(briefingHtmlPage("Error", "<h1>Error</h1><p>No se pudo procesar la aprobacion.</p>"));
    }
    const updRows = await updateRes.json();
    if (!Array.isArray(updRows) || updRows.length === 0) {
      return res.status(200).send(briefingHtmlPage("Ya procesada", "<h1>Ya fue procesada</h1><p>Otro aprobador acaba de procesar esta solicitud.</p>"));
    }

    // Crear form_link
    const kvUrl = sb.url + "/rest/v1/kv_store?tenant_id=eq.habitaris&key=eq.habitaris_formularios&select=value";
    const kvRes = await fetch(kvUrl, { headers: sb.headers });
    let formDef = null;
    let formName = "Briefing Inicial";
    try {
      const kvRows = await kvRes.json();
      if (Array.isArray(kvRows) && kvRows.length > 0) {
        const data = typeof kvRows[0].value === "string" ? JSON.parse(kvRows[0].value) : kvRows[0].value;
        const forms = (data && data.forms) || [];
        formDef = forms.find(f => f && f.id === "vxlk7nma") || null;
        if (formDef && formDef.nombre) formName = formDef.nombre;
      }
    } catch (e) {
      console.error("[briefing_approve] kv_store parse error:", e);
    }

    const linkId = "b" + randomToken(6);
    const linkExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    const linkBody = {
      link_id: linkId,
      form_id: "vxlk7nma",
      form_name: formName,
      client_name: reqRow.nombre_completo,
      client_email: reqRow.email,
      client_tel: reqRow.telefono,
      max_uses: 2,
      current_uses: 0,
      expires_at: linkExpiresAt,
      active: true,
      modulo: "CRM / Ofertas",
    };
    if (formDef) linkBody.form_def = formDef;

    const linkInsertRes = await fetch(sb.url + "/rest/v1/form_links", {
      method: "POST",
      headers: { ...sb.headers, "Content-Type": "application/json", "Prefer": "return=representation" },
      body: JSON.stringify(linkBody),
    });
    if (!linkInsertRes.ok) {
      const errTxt = await linkInsertRes.text().catch(() => "");
      console.error("[briefing_approve] form_link insert failed:", linkInsertRes.status, errTxt);
      return res.status(500).send(briefingHtmlPage("Error", "<h1>Error</h1><p>La solicitud fue aprobada pero no se pudo generar el link. Contacta al equipo tecnico.</p>"));
    }
    const linkInserted = await linkInsertRes.json();
    const newFormLinkId = Array.isArray(linkInserted) && linkInserted[0] ? linkInserted[0].id : null;

    if (newFormLinkId) {
      await fetch(sb.url + "/rest/v1/briefing_requests?id=eq." + encodeURIComponent(reqRow.id), {
        method: "PATCH",
        headers: { ...sb.headers, "Content-Type": "application/json" },
        body: JSON.stringify({ form_link_id: newFormLinkId }),
      }).catch(e => console.error("[briefing_approve] form_link_id update failed:", e));
    }

    const clientUrl = "https://suite.habitaris.es/formulario/" + linkId;
    if (RESEND_KEY) {
      const linkRow = (Array.isArray(linkInserted) && linkInserted.length > 0) ? linkInserted[0] : linkBody;
      console.log("[briefing_approve] linkRow keys:", Object.keys(linkRow || {}), "max_uses:", linkRow && linkRow.max_uses, "expires_at:", linkRow && linkRow.expires_at, "link_id:", linkRow && linkRow.link_id);
      const __brand2 = await loadBrand(sb, linkRow.tenant_id || "habitaris");
      const clientHtml = invitationTemplate(linkRow, __brand2);

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": "Bearer " + RESEND_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: (__brand.empresa || "Habitaris") + " <" + (__brand.email_noreply || "noreply@habitaris.es") + ">",
          to: [reqRow.email],
          reply_to: "comercial@habitaris.es",
          subject: "Tu briefing con Habitaris está listo",
          html: clientHtml,
        }),
      }).catch(e => console.error("[briefing_approve] resend client failed:", e));
    }

    return res.status(200).send(briefingHtmlPage("Aprobado", "<h1>&#10003; Briefing enviado</h1><p>Se ha enviado el link de briefing a <strong>" + briefingEscape(reqRow.nombre_completo) + "</strong> (" + briefingEscape(reqRow.email) + ").</p><p class=\"small\">El link caduca en 48 horas y permite 2 usos.</p>"));
  } catch (e) {
    console.error("[briefing_approve] error:", e);
    return res.status(500).send(briefingHtmlPage("Error", "<h1>Error</h1><p>Algo salio mal.</p>"));
  }
}
async function handleBriefingReject(req, res) {
  try {
    const token = String((req.query && req.query.token) || "").trim();
    if (!token || token.length < 20) {
      return res.status(400).send(briefingHtmlPage("Link invalido", "<h1>Link invalido</h1><p>El enlace no es valido.</p>"));
    }
    const sb = getSupabaseClient();

    const findUrl = sb.url + "/rest/v1/briefing_requests?reject_token=eq." + encodeURIComponent(token) + "&select=*";
    const findRes = await fetch(findUrl, { headers: sb.headers });
    if (!findRes.ok) {
      return res.status(500).send(briefingHtmlPage("Error", "<h1>Error</h1><p>No se pudo verificar el enlace.</p>"));
    }
    const rows = await findRes.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(404).send(briefingHtmlPage("No encontrado", "<h1>Solicitud no encontrada</h1><p>El enlace ya no es valido.</p>"));
    }
    const reqRow = rows[0];

    if (reqRow.status === "aprobado") {
      return res.status(200).send(briefingHtmlPage("Ya aprobada", "<h1>Ya fue aprobada</h1><p>Esta solicitud ya fue aprobada por otro aprobador.</p>"));
    }
    if (reqRow.status === "rechazado") {
      return res.status(200).send(briefingHtmlPage("Ya rechazada", "<h1>Ya fue rechazada</h1><p>Esta solicitud ya esta marcada como rechazada.</p>"));
    }
    if (new Date(reqRow.token_expires_at) < new Date()) {
      return res.status(200).send(briefingHtmlPage("Caducada", "<h1>Solicitud caducada</h1><p>El enlace ha expirado.</p>"));
    }

    const updateUrl = sb.url + "/rest/v1/briefing_requests?id=eq." + encodeURIComponent(reqRow.id) + "&status=eq.pendiente";
    const updateRes = await fetch(updateUrl, {
      method: "PATCH",
      headers: { ...sb.headers, "Content-Type": "application/json", "Prefer": "return=representation" },
      body: JSON.stringify({ status: "rechazado", rejected_at: new Date().toISOString(), rejected_by: "aprobador" }),
    });
    if (!updateRes.ok) {
      console.error("[briefing_reject] update failed:", updateRes.status);
      return res.status(500).send(briefingHtmlPage("Error", "<h1>Error</h1><p>No se pudo procesar el rechazo.</p>"));
    }
    const updRows = await updateRes.json();
    if (!Array.isArray(updRows) || updRows.length === 0) {
      return res.status(200).send(briefingHtmlPage("Ya procesada", "<h1>Ya fue procesada</h1><p>Otro aprobador acaba de procesar esta solicitud.</p>"));
    }

    return res.status(200).send(briefingHtmlPage("Rechazada", "<h1>Solicitud rechazada</h1><p>La solicitud de <strong>" + briefingEscape(reqRow.nombre_completo) + "</strong> ha sido rechazada.</p><p class=\"small\">El cliente no recibe ninguna notificacion.</p>"));
  } catch (e) {
    console.error("[briefing_reject] error:", e);
    return res.status(500).send(briefingHtmlPage("Error", "<h1>Error</h1><p>Algo salio mal.</p>"));
  }
}

