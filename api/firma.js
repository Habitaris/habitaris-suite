const SB_URL = "https://xlzkasdskatnikuavefh.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhsemthc2Rzc2thdG5pa3VhdmVmaCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzQwMTUyOTk3LCJleHAiOjIwNTU3Mjg5OTd9.DP5x1hNbnTSzIFRMFOG7tYbykaAJMc6BRXYC_dFNFgE";
const RESEND_KEY = process.env.RESEND_API_KEY;

function sbH() {
  return { "apikey": SB_KEY, "Authorization": "Bearer " + SB_KEY, "Content-Type": "application/json", "Prefer": "return=representation" };
}

function genCertCode() {
  var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  var code = "HAB-CERT-" + new Date().getFullYear() + "-";
  for (var i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

function genOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sha256(text) {
  var encoder = new TextEncoder();
  var data = encoder.encode(text);
  var buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map(function(b) { return b.toString(16).padStart(2, "0"); }).join("");
}

async function sendOTPEmail(email, name, otp, docTitle) {
  if (!RESEND_KEY) return false;
  try {
    var html = '<div style="font-family:DM Sans,Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px">'
      + '<div style="background:#111;padding:16px 20px;border-radius:8px 8px 0 0;text-align:center">'
      + '<span style="color:#fff;font-size:16px;font-weight:700;letter-spacing:2px">HABITARIS</span></div>'
      + '<div style="background:#fff;border:1px solid #eee;border-top:none;padding:30px;border-radius:0 0 8px 8px">'
      + '<p style="font-size:14px;color:#333">Hola <strong>' + name + '</strong>,</p>'
      + '<p style="font-size:13px;color:#666">Para firmar el documento <strong>' + docTitle + '</strong>, introduce el siguiente codigo de verificacion:</p>'
      + '<div style="background:#F0EEE9;border-radius:8px;padding:20px;text-align:center;margin:20px 0">'
      + '<div style="font-size:32px;font-weight:700;letter-spacing:8px;color:#111">' + otp + '</div>'
      + '<div style="font-size:11px;color:#888;margin-top:8px">Valido por 10 minutos</div></div>'
      + '<p style="font-size:11px;color:#999">Si no solicitaste esta firma, ignora este correo.</p>'
      + '</div></div>';

    var r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": "Bearer " + RESEND_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Habitaris Suite <comercial@habitaris.co>",
        to: [email],
        subject: "Codigo de verificacion — " + docTitle,
        html: html
      })
    });
    return r.ok;
  } catch (e) { console.error("OTP email error:", e); return false; }
}

// In-memory OTP store (valid for serverless lifetime)
var otpStore = {};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    if (req.method === "GET") {
      var token = req.query.token || "";
      var docCode = req.query.doc_code || "";
      var certCode = req.query.cert || "";

      if (certCode) {
        var r = await fetch(SB_URL + "/rest/v1/signature_certificates?certificate_code=eq." + certCode, { headers: sbH() });
        var d = await r.json();
        if (d && d.length > 0) return res.status(200).json({ ok: true, valid: true, certificate: d[0] });
        return res.status(200).json({ ok: true, valid: false });
      }

      if (token) {
        var r2 = await fetch(SB_URL + "/rest/v1/pending_signatures?token=eq." + token, { headers: sbH() });
        var d2 = await r2.json();
        if (d2 && d2.length > 0) return res.status(200).json({ ok: true, data: d2[0] });
        return res.status(404).json({ ok: false, error: "Token not found" });
      }

      if (docCode) {
        var r3 = await fetch(SB_URL + "/rest/v1/pending_signatures?doc_code=eq." + docCode + "&order=sign_order.asc", { headers: sbH() });
        var d3 = await r3.json();
        return res.status(200).json({ ok: true, data: d3 || [] });
      }

      var r4 = await fetch(SB_URL + "/rest/v1/signature_certificates?order=timestamp_utc.asc" + (req.query.doc ? "&doc_code=eq." + req.query.doc : ""), { headers: sbH() });
      var d4 = await r4.json();
      return res.status(200).json({ ok: true, data: d4 || [] });
    }

    if (req.method === "POST") {
      var body = req.body || {};
      var action = body.action || "sign";

      // Send OTP
      if (action === "send_otp") {
        var tk = body.token;
        if (!tk) return res.status(400).json({ ok: false, error: "token required" });
        var r5 = await fetch(SB_URL + "/rest/v1/pending_signatures?token=eq." + tk, { headers: sbH() });
        var d5 = await r5.json();
        if (!d5 || d5.length === 0) return res.status(404).json({ ok: false, error: "Token not found" });
        var pend = d5[0];
        if (!pend.signer_email) return res.status(400).json({ ok: false, error: "No email" });

        var otp = genOTP();
        otpStore[tk] = { code: otp, expires: Date.now() + 10 * 60 * 1000 };
        var sent = await sendOTPEmail(pend.signer_email, pend.signer_name, otp, pend.doc_title);
        var maskedEmail = pend.signer_email.replace(/(.{2})(.*)(@.*)/, "$1***$3");
        return res.status(200).json({ ok: true, sent: sent, email: maskedEmail });
      }

      // Verify OTP
      if (action === "verify_otp") {
        var tk = body.token;
        var code = body.code;
        if (!tk || !code) return res.status(400).json({ ok: false, error: "token and code required" });
        var stored = otpStore[tk];
        if (!stored) return res.status(400).json({ ok: false, error: "No OTP sent. Request a new one." });
        if (Date.now() > stored.expires) { delete otpStore[tk]; return res.status(400).json({ ok: false, error: "OTP expired. Request a new one." }); }
        if (stored.code !== code) return res.status(400).json({ ok: false, error: "Invalid code" });
        delete otpStore[tk];
        return res.status(200).json({ ok: true, verified: true });
      }

      // Create pending signatures
      if (action === "create_pending") {
        var signers = body.signers || [];
        var results = [];
        for (var i = 0; i < signers.length; i++) {
          var s = signers[i];
          var tk2 = genCertCode().replace("CERT", "SIGN");
          var rec = {
            doc_code: body.doc_code, doc_title: body.doc_title,
            doc_pdf_url: body.doc_pdf_url || null, doc_hash: body.doc_hash || null,
            signer_name: s.name, signer_email: s.email, signer_role: s.role,
            signer_id_number: s.id_number || null, token: tk2,
            sign_order: s.order || (i + 1), status: "pending",
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          };
          var r6 = await fetch(SB_URL + "/rest/v1/pending_signatures", {
            method: "POST", headers: sbH(), body: JSON.stringify(rec)
          });
          var d6 = await r6.json();
          results.push({ token: tk2, signer: s.name, email: s.email, link: "https://suite.habitaris.co/firmar?token=" + tk2 });
        }
        return res.status(200).json({ ok: true, data: results });
      }

      // Sign
      if (action === "sign") {
        var token = body.token;
        if (!token) return res.status(400).json({ ok: false, error: "token required" });

        var r7 = await fetch(SB_URL + "/rest/v1/pending_signatures?token=eq." + token, { headers: sbH() });
        var d7 = await r7.json();
        if (!d7 || d7.length === 0) return res.status(404).json({ ok: false, error: "Invalid token" });
        var pending = d7[0];
        if (pending.status !== "pending") return res.status(400).json({ ok: false, error: "Already " + pending.status });

        var certCode = genCertCode();
        var sigHash = await sha256(body.signature_image || "");
        var docHash = await sha256(pending.doc_code + pending.doc_title + pending.signer_name + new Date().toISOString());

        var cert = {
          doc_code: pending.doc_code, doc_title: pending.doc_title,
          doc_hash: pending.doc_hash || docHash,
          signer_name: pending.signer_name, signer_id_type: body.id_type || "CC",
          signer_id_number: pending.signer_id_number || body.id_number || "",
          signer_email: pending.signer_email, signer_role: pending.signer_role,
          signature_image: body.signature_image || null, signature_hash: sigHash,
          ip_address: req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || "unknown",
          user_agent: body.user_agent || "",
          geo_lat: body.lat || null, geo_lng: body.lng || null,
          certificate_code: certCode,
          verification_url: "https://suite.habitaris.co/verificar?cert=" + certCode,
        };

        var r8 = await fetch(SB_URL + "/rest/v1/signature_certificates", {
          method: "POST", headers: sbH(), body: JSON.stringify(cert)
        });
        var d8 = await r8.json();

        var h9 = sbH(); h9["Prefer"] = "return=representation";
        await fetch(SB_URL + "/rest/v1/pending_signatures?token=eq." + token, {
          method: "PATCH", headers: h9,
          body: JSON.stringify({ status: "signed", signed_at: new Date().toISOString(), certificate_id: d8[0]?.id || null })
        });

        return res.status(200).json({
          ok: true, certificate_code: certCode,
          verification_url: "https://suite.habitaris.co/verificar?cert=" + certCode,
          signed_at: new Date().toISOString()
        });
      }

      return res.status(400).json({ ok: false, error: "Unknown action" });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("Firma API error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
