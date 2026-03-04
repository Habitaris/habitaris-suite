export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const body = req.body || {};
    const recipientEmail = body.to || body.client_email;
    if (!recipientEmail) return res.status(400).json({ ok: false, error: "email required" });

    const RESEND_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_KEY) return res.status(500).json({ ok: false, error: "RESEND_API_KEY not set" });

    const empresa = body.from_name || "Habitaris";

    // ── 1) Generic email (meetings, notifications) ──
    if (body.to && body.subject && body.message && !body.type) {
      const b = body.brand || {};
      const emp = b.empresa || empresa;
      const cp = b.colorPrimario || "#111111";
      const logo = b.logo || "https://suite.habitaris.co/logo-habitaris-blanco.png";
      const slogan = b.slogan || "";
      const msg = (body.message || "").replace(/\\n/g, "\n").replace(/\n/g, "<br/>");
      const lnk = body.link || "";
      const lnkInfo = body.link_info || "Abrir enlace";

      const linkBtn = lnk
        ? '<div style="text-align:center;margin-top:24px"><a href="' + lnk + '" style="display:inline-block;background:' + cp + ';color:#fff;text-decoration:none;padding:14px 44px;border-radius:6px;font-size:14px;font-weight:bold">' + lnkInfo + ' &rarr;</a></div>'
        : "";

      const logoBlock = logo
        ? '<img src="' + logo + '" alt="' + emp + '" style="height:28px;object-fit:contain;display:block;margin:0 auto"/>'
        : '<h1 style="margin:0;color:#fff;font-size:16px;letter-spacing:3px">' + emp.toUpperCase() + '</h1>';

      const sloganBlock = slogan
        ? '<p style="margin:6px 0 0;color:rgba(255,255,255,.4);font-size:10px;letter-spacing:1px">' + slogan + '</p>'
        : "";

      const html = '<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F5F4F1;font-family:Arial,sans-serif">'
        + '<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F4F1;padding:40px 20px"><tr><td align="center">'
        + '<table width="580" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">'
        + '<tr><td style="background:' + cp + ';padding:28px 40px;text-align:center">' + logoBlock + sloganBlock + '</td></tr>'
        + '<tr><td style="padding:36px 40px"><div style="font-size:14px;color:#333;line-height:1.8">' + msg + '</div>' + linkBtn + '</td></tr>'
        + '<tr><td style="background:#F5F4F1;padding:20px 40px;text-align:center;border-top:1px solid #E4E1DB">'
        + '<p style="margin:0;font-size:10px;color:#aaa">' + emp + ' &middot; comercial@habitaris.co</p></td></tr>'
        + '</table></td></tr></table></body></html>';

      const r2 = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": "Bearer " + RESEND_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: (body.fromName || emp) + " <comercial@habitaris.co>",
          to: [body.to],
          subject: body.subject,
          html: html,
          reply_to: body.fromEmail || "comercial@habitaris.co",
        }),
      });
      const d2 = await r2.json();
      if (r2.ok) return res.status(200).json({ ok: true, id: d2.id });
      console.error("Resend error:", d2);
      return res.status(r2.status).json({ ok: false, error: d2.message || "Send failed" });
    }

    // ── 2) Form recibido notification ──
    if (body.type === "form_recibido" && body.extra) {
      const e = body.extra;
      const cp2 = e.colorPrimario || "#111111";
      const logo2 = e.logo || "";
      const slogan2 = e.slogan || "";
      const rs = e.razonSocial || empresa;
      const dom = e.domicilio || "";

      const logoH = logo2
        ? '<img src="' + logo2 + '" alt="' + empresa + '" style="height:28px;object-fit:contain;margin-bottom:4px;display:block;"/>'
        : '<h1 style="margin:0;color:#fff;font-size:16px;letter-spacing:2px;">' + empresa.toUpperCase() + '</h1>';

      const formHtml = '<!DOCTYPE html><html><body style="margin:0;padding:0;background:#ffffff;font-family:Arial,sans-serif;">'
        + '<div style="max-width:600px;margin:0 auto;padding:20px;">'
        + '<div style="background:' + cp2 + ';padding:16px 24px;border-radius:8px 8px 0 0;">'
        + logoH
        + '<p style="margin:4px 0 0;color:rgba(255,255,255,.5);font-size:11px;">' + slogan2 + '</p></div>'
        + '<div style="background:#fff;padding:24px;border:1px solid #E4E1DB;">'
        + '<h2 style="margin:0 0 4px;font-size:18px;color:#111;">' + (e.form_name || "Formulario") + '</h2>'
        + '<p style="margin:0 0 16px;font-size:12px;color:#888;">Nueva respuesta recibida</p>'
        + '<div style="background:#E6EFF9;border-radius:8px;padding:14px;margin-bottom:16px;">'
        + '<p style="margin:0;font-size:11px;font-weight:bold;color:#1E4F8C;">DATOS DEL CLIENTE</p>'
        + '<p style="margin:6px 0 0;font-size:13px;color:#111;"><strong>' + (e.client_name || "") + '</strong></p>'
        + '<p style="margin:2px 0;font-size:12px;color:#555;">' + (e.client_email || "") + '</p></div>'
        + (e.contenido || "")
        + '</div>'
        + '<div style="background:#F0EEE9;padding:16px 24px;border:1px solid #E4E1DB;border-top:none;border-radius:0 0 8px 8px;text-align:center;">'
        + '<p style="margin:0;font-size:10px;color:#888;">' + rs + ' &middot; ' + dom + '</p></div></div></body></html>';

      const r3 = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": "Bearer " + RESEND_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: empresa + " <comercial@habitaris.co>",
          to: [recipientEmail],
          subject: body.subject || "Nueva respuesta: " + (e.form_name || "Formulario"),
          html: formHtml,
        }),
      });
      const d3 = await r3.json();
      if (r3.ok) return res.status(200).json({ ok: true, id: d3.id });
      return res.status(r3.status).json({ ok: false, error: d3.message || "Send failed" });
    }

    // ── 3) Default: form link email ──
    const nombre = body.client_name || "Cliente";
    const formulario = body.form_name || "Formulario";
    const formLink = body.form_link || "#";
    const info = body.link_info || "";

    const html = '<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F5F4F1;font-family:Arial,Helvetica,sans-serif">'
      + '<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F4F1;padding:40px 20px"><tr><td align="center">'
      + '<table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)">'
      + '<tr><td style="background:#111111;padding:36px 40px;text-align:center">'
      + '<img src="https://suite.habitaris.co/logo-habitaris-blanco.png" alt="Habitaris" width="180" style="display:inline-block;max-width:180px"/></td></tr>'
      + '<tr><td style="background:#3B3B3B;height:2px"></td></tr>'
      + '<tr><td style="padding:44px 40px 20px">'
      + '<div style="font-size:22px;color:#111;font-weight:bold;margin-bottom:12px">Hola ' + nombre + ' &#128075;</div>'
      + '<div style="font-size:14px;color:#555;line-height:1.8;margin-bottom:28px">Estamos emocionados de trabajar contigo.<br><br>'
      + 'Para conocer mejor tu proyecto y prepararte la mejor propuesta, necesitamos que completes un breve formulario:</div></td></tr>'
      + '<tr><td style="padding:0 40px 30px"><table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F4F1;border-radius:10px;border:1px solid #E4E1DB">'
      + '<tr><td style="padding:28px;text-align:center">'
      + '<div style="font-size:10px;color:#888;letter-spacing:3px;text-transform:uppercase;font-weight:bold;margin-bottom:10px">FORMULARIO</div>'
      + '<div style="font-size:18px;color:#111;font-weight:bold;margin-bottom:24px">&#128203; ' + formulario + '</div>'
      + '<a href="' + formLink + '" style="display:inline-block;background:#111111;color:#ffffff;text-decoration:none;padding:14px 44px;border-radius:6px;font-size:14px;font-weight:bold;letter-spacing:0.5px">Completar formulario &rarr;</a>'
      + (info ? '<div style="font-size:11px;color:#999;margin-top:16px">' + info + '</div>' : '')
      + '</td></tr></table></td></tr>'
      + '<tr><td style="padding:0 40px 40px"><div style="font-size:12px;color:#999;line-height:1.6;text-align:center">'
      + 'Es r&aacute;pido y sencillo. Si tienes alguna pregunta,<br>no dudes en responder a este correo.</div></td></tr>'
      + '<tr><td style="background:#F5F4F1;padding:24px 40px;text-align:center;border-top:1px solid #E4E1DB">'
      + '<div style="font-size:11px;color:#888;font-weight:bold">&iexcl;Gracias por confiar en nosotros!</div>'
      + '<div style="font-size:10px;color:#aaa;margin-top:8px">' + empresa + ' &middot; Bogot&aacute; D.C. &middot; comercial@habitaris.co</div>'
      + '</td></tr></table></td></tr></table></body></html>';

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + RESEND_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: empresa + " <comercial@habitaris.co>",
        to: [body.client_email],
        subject: "&#128203; " + formulario + " — " + empresa,
        html: html,
      }),
    });

    const data = await response.json();
    if (response.ok) return res.status(200).json({ ok: true, id: data.id });
    return res.status(response.status).json({ ok: false, error: data.message || "Send failed" });
  } catch (err) {
    console.error("send-email error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
