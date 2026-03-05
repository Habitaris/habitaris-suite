const SB_URL = "https://xlzkasdskatnikuavefh.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhsemthc2Rza2F0bmlrdWF2ZWZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4OTE3NzQsImV4cCI6MjA4NzQ2Nzc3NH0.SR9tIpvL0YnV9CNrRq4T-xetifuNQOJZE0OnQpwtYLM";

function sbH() {
  return { "apikey": SB_KEY, "Authorization": "Bearer " + SB_KEY, "Content-Type": "application/json", "Prefer": "return=representation" };
}

function genCertCode() {
  var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  var code = "HAB-CERT-" + new Date().getFullYear() + "-";
  for (var i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

async function sha256(text) {
  var encoder = new TextEncoder();
  var data = encoder.encode(text);
  var buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map(function(b) { return b.toString(16).padStart(2, "0"); }).join("");
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    // GET — get pending signatures by token or doc_code
    if (req.method === "GET") {
      var token = req.query.token || "";
      var docCode = req.query.doc_code || "";
      var certCode = req.query.cert || "";

      // Verify certificate
      if (certCode) {
        var r = await fetch(SB_URL + "/rest/v1/signature_certificates?certificate_code=eq." + certCode, { headers: sbH() });
        var d = await r.json();
        if (d && d.length > 0) return res.status(200).json({ ok: true, valid: true, certificate: d[0] });
        return res.status(200).json({ ok: true, valid: false });
      }

      // Get pending by token
      if (token) {
        var r2 = await fetch(SB_URL + "/rest/v1/pending_signatures?token=eq." + token, { headers: sbH() });
        var d2 = await r2.json();
        if (d2 && d2.length > 0) return res.status(200).json({ ok: true, data: d2[0] });
        return res.status(404).json({ ok: false, error: "Token not found" });
      }

      // Get all pending by doc_code
      if (docCode) {
        var r3 = await fetch(SB_URL + "/rest/v1/pending_signatures?doc_code=eq." + docCode + "&order=sign_order.asc", { headers: sbH() });
        var d3 = await r3.json();
        return res.status(200).json({ ok: true, data: d3 || [] });
      }

      // Get all certs for a doc
      var r4 = await fetch(SB_URL + "/rest/v1/signature_certificates?order=timestamp_utc.asc" + (req.query.doc ? "&doc_code=eq." + req.query.doc : ""), { headers: sbH() });
      var d4 = await r4.json();
      return res.status(200).json({ ok: true, data: d4 || [] });
    }

    // POST — sign or create pending
    if (req.method === "POST") {
      var body = req.body || {};
      var action = body.action || "sign";

      // Create pending signatures for a document
      if (action === "create_pending") {
        var signers = body.signers || [];
        var results = [];
        for (var i = 0; i < signers.length; i++) {
          var s = signers[i];
          var tk = genCertCode().replace("CERT", "SIGN");
          var rec = {
            doc_code: body.doc_code,
            doc_title: body.doc_title,
            doc_pdf_url: body.doc_pdf_url || null,
            doc_hash: body.doc_hash || null,
            signer_name: s.name,
            signer_email: s.email,
            signer_role: s.role,
            signer_id_number: s.id_number || null,
            token: tk,
            sign_order: s.order || (i + 1),
            status: "pending",
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          };
          var r5 = await fetch(SB_URL + "/rest/v1/pending_signatures", {
            method: "POST", headers: sbH(), body: JSON.stringify(rec)
          });
          var d5 = await r5.json();
          results.push({ token: tk, signer: s.name, email: s.email, link: "https://suite.habitaris.co/firmar?token=" + tk });
        }
        return res.status(200).json({ ok: true, data: results });
      }

      // Sign a document
      if (action === "sign") {
        var token = body.token;
        if (!token) return res.status(400).json({ ok: false, error: "token required" });

        // Get pending
        var r6 = await fetch(SB_URL + "/rest/v1/pending_signatures?token=eq." + token, { headers: sbH() });
        var d6 = await r6.json();
        if (!d6 || d6.length === 0) return res.status(404).json({ ok: false, error: "Invalid token" });
        var pending = d6[0];
        if (pending.status !== "pending") return res.status(400).json({ ok: false, error: "Already " + pending.status });

        // Generate certificate
        var certCode = genCertCode();
        var sigHash = await sha256(body.signature_image || "");
        var docHash = await sha256(pending.doc_code + pending.doc_title + pending.signer_name + new Date().toISOString());

        var cert = {
          doc_code: pending.doc_code,
          doc_title: pending.doc_title,
          doc_hash: pending.doc_hash || docHash,
          signer_name: pending.signer_name,
          signer_id_type: body.id_type || "CC",
          signer_id_number: pending.signer_id_number || body.id_number || "",
          signer_email: pending.signer_email,
          signer_role: pending.signer_role,
          signature_image: body.signature_image || null,
          signature_hash: sigHash,
          ip_address: req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || "unknown",
          user_agent: body.user_agent || "",
          geo_lat: body.lat || null,
          geo_lng: body.lng || null,
          certificate_code: certCode,
          verification_url: "https://suite.habitaris.co/verificar?cert=" + certCode,
        };

        var r7 = await fetch(SB_URL + "/rest/v1/signature_certificates", {
          method: "POST", headers: sbH(), body: JSON.stringify(cert)
        });
        var d7 = await r7.json();

        // Update pending to signed
        var h8 = sbH();
        h8["Prefer"] = "return=representation";
        await fetch(SB_URL + "/rest/v1/pending_signatures?token=eq." + token, {
          method: "PATCH", headers: h8,
          body: JSON.stringify({ status: "signed", signed_at: new Date().toISOString(), certificate_id: d7[0]?.id || null })
        });

        return res.status(200).json({
          ok: true,
          certificate_code: certCode,
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
