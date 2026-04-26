// /api/send-reminder.js
// Envia un email de recordatorio "tienes el briefing a medias" a un cliente
// que abrio un link, dejo respuestas parciales y agoto sus usos sin enviar
//
// Acepta: { link_id }
// El sender se lee de kv_store.habitaris_email_senders.mappings.reminder
// Marca form_links.reminder_sent_at = now() para evitar duplicados

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "method not allowed" });

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const linkId = body.link_id;
    const force = body.force === true; // saltar check reminder_sent_at (para testing)
    if (!linkId) return res.status(400).json({ ok: false, error: "link_id required" });

    const RESEND_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_KEY) return res.status(500).json({ ok: false, error: "missing RESEND_API_KEY" });

    const SUPA_URL = process.env.SUPABASE_URL || "https://xlzkasdskatnikuavefh.supabase.co";
    const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
    if (!SUPA_KEY) return res.status(500).json({ ok: false, error: "missing supabase key" });
    const supaHeaders = { apikey: SUPA_KEY, Authorization: "Bearer " + SUPA_KEY, "Content-Type": "application/json" };

    // 1. Obtener el link
    const linkR = await fetch(SUPA_URL + "/rest/v1/form_links?link_id=eq." + encodeURIComponent(linkId) + "&select=*", { headers: supaHeaders });
    const linkArr = await linkR.json();
    if (!Array.isArray(linkArr) || linkArr.length === 0) {
      return res.status(404).json({ ok: false, error: "link not found" });
    }
    const link = linkArr[0];

    // 2. Validaciones
    if (!link.client_email) return res.status(400).json({ ok: false, error: "link has no client_email" });
    if (!link.has_partial_data) return res.status(400).json({ ok: false, error: "link has no partial data" });
    if (link.submitted_at) return res.status(400).json({ ok: false, error: "link already submitted" });
    if (!force && link.reminder_sent_at) return res.status(400).json({ ok: false, error: "reminder already sent at " + link.reminder_sent_at });

    // 3. Obtener config de senders desde kv_store
    let sender = { email: "noreply@habitaris.es", name: "Habitaris" };
    try {
      const cfgR = await fetch(SUPA_URL + "/rest/v1/kv_store?key=eq.habitaris_email_senders&tenant_id=eq.habitaris&select=value", { headers: supaHeaders });
      const cfgArr = await cfgR.json();
      if (Array.isArray(cfgArr) && cfgArr.length > 0) {
        const cfg = JSON.parse(cfgArr[0].value);
        const aliasKey = (cfg.mappings && cfg.mappings.reminder) || cfg.fallback || "noreply";
        if (cfg.senders && cfg.senders[aliasKey]) {
          sender = cfg.senders[aliasKey];
        }
      }
    } catch (e) { /* fallback al hardcodeado */ }

    // 4. Construir HTML del recordatorio
    const clientName = link.client_name || "";
    const formName = link.form_name || "tu formulario";
    const lastStep = link.last_completed_step || 0;
    const fieldCount = Object.keys(link.partial_responses || {}).length;
    const linkUrl = "https://suite.habitaris.es/formulario/" + linkId;

    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/><title>Briefing a medias</title></head>
<body style="margin:0;padding:0;background:#F5F0FF;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F5F0FF;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.06);">
        <tr><td style="padding:32px 40px 16px 40px;">
          <div style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px;">Habitaris</div>
          <h1 style="margin:0 0 8px 0;font-size:22px;font-weight:700;color:#111;">Hola${clientName ? " " + clientName : ""},</h1>
          <p style="margin:0;font-size:15px;color:#444;line-height:1.6;">Vimos que comenzaste a llenar tu <strong>${formName}</strong> pero no llegaste a enviarlo.</p>
        </td></tr>
        <tr><td style="padding:8px 40px 16px 40px;">
          <div style="background:#F5F0FF;border-radius:8px;padding:16px 18px;font-size:13px;color:#666;">
            <div style="margin-bottom:6px;">📝 <strong>Avance guardado:</strong> paso ${lastStep + 1} · ${fieldCount} campos</div>
            <div>⏰ Tus respuestas anteriores están guardadas, solo tienes que continuar.</div>
          </div>
        </td></tr>
        <tr><td style="padding:8px 40px 24px 40px;">
          <p style="margin:0 0 18px 0;font-size:15px;color:#444;line-height:1.6;">¿Quieres terminarlo? Avísanos respondiendo a este correo y reactivamos tu enlace para que continúes donde lo dejaste.</p>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr><td style="background:#111;border-radius:8px;">
              <a href="mailto:${sender.email}?subject=Quiero%20terminar%20mi%20briefing%20${encodeURIComponent(formName)}" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:600;color:#fff;text-decoration:none;">Responder y continuar</a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:16px 40px 24px 40px;border-top:1px solid #eee;">
          <div style="font-size:11px;color:#aaa;line-height:1.5;">
            Este es un correo automático. Si recibiste este mensaje por error o ya enviaste tu briefing, ignóralo.
          </div>
          <div style="font-size:10px;color:#bbb;margin-top:8px;">Habitaris S.A.S · NIT 901.922.136-8 · Bogotá D.C., Colombia</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

    const fromHeader = sender.name + " <" + sender.email + ">";
    const subject = "📝 Tienes tu briefing a medias · Habitaris";

    // 5. Enviar via Resend
    const resendR = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": "Bearer " + RESEND_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: fromHeader,
        to: [link.client_email],
        subject: subject,
        html: html
      })
    });
    const resendData = await resendR.json();

    if (!resendR.ok) {
      return res.status(500).json({ ok: false, error: "resend failed", detail: resendData });
    }

    // 6. Marcar reminder_sent_at en form_links
    await fetch(SUPA_URL + "/rest/v1/form_links?link_id=eq." + encodeURIComponent(linkId), {
      method: "PATCH",
      headers: supaHeaders,
      body: JSON.stringify({ reminder_sent_at: new Date().toISOString() })
    });

    return res.status(200).json({
      ok: true,
      sent_to: link.client_email,
      from: fromHeader,
      resend_id: resendData.id || null
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err && err.message || err) });
  }
}