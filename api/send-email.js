export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { client_name, client_email, form_name, form_link, link_info, from_name, type, extra, fromEmail, to, subject, message, brand, link, link_info: linkInfo2} = req.body || {};
    const recipientEmail = to || client_email;
    if (!recipientEmail) return res.status(400).json({ ok: false, error: "email required" });

    const RESEND_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_KEY) return res.status(500).json({ ok: false, error: "RESEND_API_KEY not set" });

    const empresa = from_name || "Habitaris";
    const nombre = client_name || "Cliente";
    const formulario = form_name || "Formulario";
    const link = form_link || "#";
    const info = link_info || "";

    
  // ── Template especial: notificación de formulario recibido ──
  if (type === "form_recibido" && extra) {
    const e = extra;
    const formHtml = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#ffffff;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:${colorPrimario};padding:16px 24px;border-radius:8px 8px 0 0;">
      ${logoUrl ? `<img src="${logoUrl}" alt="${empresa}" style="height:28px;object-fit:contain;margin-bottom:4px;display:block;"/>` : `<h1 style="margin:0;color:#fff;font-size:16px;letter-spacing:2px;">${empresa.toUpperCase()}</h1>`}
      <p style="margin:4px 0 0;color:rgba(255,255,255,.5);font-size:11px;">${slogan}</p>
    </div>
    <div style="background:#fff;padding:24px;border:1px solid #E4E1DB;">
      <h2 style="margin:0 0 4px;font-size:18px;color:#111;">📋 ${e.form_name || "Formulario"}</h2>
      <p style="margin:0 0 16px;font-size:12px;color:#888;">Nueva respuesta recibida · ${e.fecha || new Date().toLocaleDateString("es-CO")}</p>
      <div style="background:#E6EFF9;border-radius:8px;padding:14px;margin-bottom:16px;">
        <p style="margin:0;font-size:11px;font-weight:bold;color:#1E4F8C;">👤 DATOS DEL CLIENTE</p>
        <p style="margin:6px 0 0;font-size:13px;color:#111;"><strong>${e.client_name || "—"}</strong></p>
        <p style="margin:2px 0;font-size:12px;color:#555;">${e.client_email || ""}${e.client_tel ? " · " + e.client_tel : ""}</p>
      </div>
      ${e.contenido || ""}
    </div>
    <div style="background:#F0EEE9;padding:16px 24px;border:1px solid #E4E1DB;border-top:none;border-radius:0 0 8px 8px;text-align:center;">
      <p style="margin:0;font-size:10px;color:#888;">${razonSocial || empresa} · ${domicilio}</p>
    </div>
  </div>
</body></html>`;

    const { data: d2, error: e2 } = await resend.emails.send({
      from: `${empresa} <${fromEmail || emailPrincipal}>`,
      to, subject, html: formHtml,
    });
    if (e2) return res.status(400).json({ error: e2.message });
    return res.status(200).json({ success: true, id: d2?.id });
  }

// ── Generic email (meetings, notifications, etc) ──
  if (to && subject && message && !type) {
    const b = brand || {};
    const empresa2 = b.empresa || from_name || "Habitaris";
    const cp = b.colorPrimario || "#111111";
    const logo2 = b.logo || "https://suite.habitaris.co/logo-habitaris-blanco.png";
    const slogan2 = b.slogan || "";
    const msgHtml = message.replace(/\n/g,"<br/>").replace(/
/g,"<br/>");
    const linkHtml = link ? `<a href="${link}" style="display:inline-block;background:${cp};color:#fff;text-decoration:none;padding:14px 44px;border-radius:6px;font-size:14px;font-weight:bold;letter-spacing:0.5px;margin-top:16px">${linkInfo2 || "Abrir enlace"} →</a>` : "";
    const genHtml = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F5F4F1;font-family:Arial,sans-serif"><table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F4F1;padding:40px 20px"><tr><td align="center"><table width="580" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)"><tr><td style="background:${cp};padding:28px 40px;text-align:center">${logo2 ? `<img src="${logo2}" alt="${empresa2}" style="height:28px;object-fit:contain;display:block;margin:0 auto"/>` : `<h1 style="margin:0;color:#fff;font-size:16px;letter-spacing:3px">${empresa2.toUpperCase()}</h1>`}${slogan2 ? `<p style="margin:6px 0 0;color:rgba(255,255,255,.4);font-size:10px;letter-spacing:1px">${slogan2}</p>` : ""}</td></tr><tr><td style="padding:36px 40px"><div style="font-size:14px;color:#333;line-height:1.8">${msgHtml}</div><div style="text-align:center;margin-top:24px">${linkHtml}</div></td></tr><tr><td style="background:#F5F4F1;padding:20px 40px;text-align:center;border-top:1px solid #E4E1DB"><p style="margin:0;font-size:10px;color:#aaa">${empresa2} · comercial@habitaris.co</p></td></tr></table></td></tr></table></body></html>`;
    const r2 = await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+RESEND_KEY,"Content-Type":"application/json"},body:JSON.stringify({from:(req.body.fromName||empresa2)+" <"+(req.body.fromEmail||"comercial@habitaris.co")+">",to:[to],subject:subject,html:genHtml})});
    const d2 = await r2.json();
    if(r2.ok) return res.status(200).json({ok:true,id:d2.id});
    return res.status(r2.status).json({ok:false,error:d2.message||"Send failed"});
  }

  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F5F4F1;font-family:Arial,Helvetica,sans-serif"><table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F4F1;padding:40px 20px"><tr><td align="center"><table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)"><tr><td style="background:#111111;padding:36px 40px;text-align:center"><img src="https://suite.habitaris.co/logo-habitaris-blanco.png" alt="Habitaris" width="180" style="display:inline-block;max-width:180px"/></td></tr><tr><td style="background:#3B3B3B;height:2px"></td></tr><tr><td style="padding:44px 40px 20px"><div style="font-size:22px;color:#111;font-weight:bold;margin-bottom:12px">Hola ${nombre} 👋</div><div style="font-size:14px;color:#555;line-height:1.8;margin-bottom:28px">Estamos emocionados de trabajar contigo.<br><br>Para conocer mejor tu proyecto y prepararte la mejor propuesta, necesitamos que completes un breve formulario:</div></td></tr><tr><td style="padding:0 40px 30px"><table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F4F1;border-radius:10px;border:1px solid #E4E1DB"><tr><td style="padding:28px;text-align:center"><div style="font-size:10px;color:#888;letter-spacing:3px;text-transform:uppercase;font-weight:bold;margin-bottom:10px">FORMULARIO</div><div style="font-size:18px;color:#111;font-weight:bold;margin-bottom:24px">📋 ${formulario}</div><a href="${link}" style="display:inline-block;background:#111111;color:#ffffff;text-decoration:none;padding:14px 44px;border-radius:6px;font-size:14px;font-weight:bold;letter-spacing:0.5px">Completar formulario →</a>${info ? `<div style="font-size:11px;color:#999;margin-top:16px">${info}</div>` : ""}</td></tr></table></td></tr><tr><td style="padding:0 40px 40px"><div style="font-size:12px;color:#999;line-height:1.6;text-align:center">Es rápido y sencillo. Si tienes alguna pregunta,<br>no dudes en responder a este correo.</div></td></tr><tr><td style="background:#F5F4F1;padding:24px 40px;text-align:center;border-top:1px solid #E4E1DB"><div style="font-size:11px;color:#888;font-weight:bold">¡Gracias por confiar en nosotros!</div><div style="font-size:10px;color:#aaa;margin-top:8px">${empresa} · Bogotá D.C. · comercial@habitaris.co</div></td></tr></table></td></tr></table></body></html>`;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + RESEND_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: empresa + " <comercial@habitaris.co>",
        to: [client_email],
        subject: "📋 " + formulario + " — " + empresa,
        html: html,
      }),
    });

    const data = await response.json();
    if (response.ok) return res.status(200).json({ ok: true, id: data.id });
    return res.status(response.status).json({ ok: false, error: data.message || "Send failed" });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
