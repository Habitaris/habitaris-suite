// api/send-email.js — Vercel Serverless Function
// Sends emails via Resend API from comercial@habitaris.co

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { client_name, client_email, form_name, form_link, link_info, from_name } = req.body || {};

  if (!client_email) return res.status(400).json({ error: "client_email is required" });

  const RESEND_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_KEY) return res.status(500).json({ error: "RESEND_API_KEY not configured" });

  const empresa = from_name || "Habitaris";
  const nombre = client_name || "Cliente";
  const formulario = form_name || "Formulario";
  const link = form_link || "#";
  const info = link_info || "";

  const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#F5F4F1;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F4F1;padding:40px 20px">
<tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)">

<!-- Header negro con logo -->
<tr><td style="background:#111111;padding:36px 40px;text-align:center">
<img src="https://suite.habitaris.co/logo-habitaris-blanco.png" alt="Habitaris" width="180" style="display:inline-block;max-width:180px" />
</td></tr>

<!-- Línea separadora -->
<tr><td style="background:#3B3B3B;height:2px"></td></tr>

<!-- Contenido principal -->
<tr><td style="padding:44px 40px 20px">
<div style="font-size:22px;color:#111;font-weight:bold;margin-bottom:12px">Hola ${nombre} 👋</div>
<div style="font-size:14px;color:#555;line-height:1.8;margin-bottom:28px">
Estamos emocionados de trabajar contigo.<br><br>
Para conocer mejor tu proyecto y prepararte la mejor propuesta, necesitamos que completes un breve formulario:
</div>
</td></tr>

<!-- Card del formulario -->
<tr><td style="padding:0 40px 30px">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F4F1;border-radius:10px;border:1px solid #E4E1DB">
<tr><td style="padding:28px 28px;text-align:center">
<div style="font-size:10px;color:#888;letter-spacing:3px;text-transform:uppercase;font-weight:bold;margin-bottom:10px">FORMULARIO</div>
<div style="font-size:18px;color:#111;font-weight:bold;margin-bottom:24px">📋 ${formulario}</div>
<a href="${link}" style="display:inline-block;background:#111111;color:#ffffff;text-decoration:none;padding:14px 44px;border-radius:6px;font-size:14px;font-weight:bold;letter-spacing:0.5px">Completar formulario →</a>
${info ? `<div style="font-size:11px;color:#999;margin-top:16px">${info}</div>` : ""}
</td></tr>
</table>
</td></tr>

<!-- Nota final -->
<tr><td style="padding:0 40px 40px">
<div style="font-size:12px;color:#999;line-height:1.6;text-align:center">
Es rápido y sencillo. Si tienes alguna pregunta,<br>no dudes en responder a este correo.
</div>
</td></tr>

<!-- Footer -->
<tr><td style="background:#F5F4F1;padding:24px 40px;text-align:center;border-top:1px solid #E4E1DB">
<div style="font-size:11px;color:#888;font-weight:bold">¡Gracias por confiar en nosotros!</div>
<div style="font-size:10px;color:#aaa;margin-top:8px">${empresa} · Bogotá D.C. · comercial@habitaris.co</div>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${empresa} <comercial@habitaris.co>`,
        to: [client_email],
        subject: `📋 ${formulario} — ${empresa}`,
        html,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      return res.status(200).json({ ok: true, id: data.id });
    } else {
      console.error("Resend error:", data);
      return res.status(response.status).json({ ok: false, error: data.message || "Send failed" });
    }
  } catch (err) {
    console.error("Send email error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
