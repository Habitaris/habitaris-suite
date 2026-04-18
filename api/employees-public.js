const SB_URL = "https://xlzkasdskatnikuavefh.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhsemthc2Rza2F0bmlrdWF2ZWZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4OTE3NzQsImV4cCI6MjA4NzQ2Nzc3NH0.SR9tIpvL0YnV9CNrRq4T-xetifuNQOJZE0OnQpwtYLM";
function sbH(){return{"apikey":SB_KEY,"Authorization":"Bearer "+SB_KEY,"Content-Type":"application/json","Prefer":"return=representation"};}

async function kvGet(key){
  var r=await fetch(SB_URL+"/rest/v1/kv_store?key=eq."+key+"&select=value",{headers:sbH()});
  var d=await r.json();return(d&&d[0])?d[0].value:null;
}
async function kvSet(key,val){
  var rp=await fetch(SB_URL+"/rest/v1/kv_store?key=eq."+key,{method:"PATCH",headers:{...sbH(),Prefer:"return=minimal"},body:JSON.stringify({value:val})});
  if(rp.status===204||rp.status===200){
    var chk=await fetch(SB_URL+"/rest/v1/kv_store?key=eq."+key+"&select=key",{headers:sbH()});
    var chkd=await chk.json();
    if(!Array.isArray(chkd)||chkd.length===0){
      await fetch(SB_URL+"/rest/v1/kv_store",{method:"POST",headers:sbH(),body:JSON.stringify({key:key,value:val,tenant_id:"habitaris"})});
    }
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    // GET: list or find employees
    if (req.method === "GET") {
      var empId = req.query.emp || "";
      var cc = req.query.cc || "";
      var filter = "estado=in.(firmado,afiliaciones,completado)";
      var select = "id,candidato_nombre,candidato_cc,cargo,fecha_inicio,candidato_celular,candidato_email,salario_base,auxilio_transporte,tipo_contrato,duracion_meses,candidato_eps,candidato_pension";
      if (empId) filter = "id=eq." + empId;
      if (cc) filter += "&candidato_cc=eq." + cc;
      var r = await fetch(SB_URL + "/rest/v1/hiring_processes?" + filter + "&select=" + select + "&order=candidato_nombre.asc", { headers: sbH() });
      var data = await r.json();
      var employees = (data || []).map(function(e) {
        return {
          id: e.id, nombre: e.candidato_nombre || "Sin nombre", documento: e.candidato_cc || "",
          cargo: e.cargo || "", celular: e.candidato_celular || "", email: e.candidato_email || "",
          email_masked: (e.candidato_email||"").replace(/^(.{2})(.*)(@.*)$/, function(m,a,b,c){return a+b.replace(/./g,"*")+c;}),
          fecha_inicio: e.fecha_inicio || "", salario_base: e.salario_base || 0,
          auxilio_transporte: e.auxilio_transporte || 0, tipo_contrato: e.tipo_contrato || "fijo",
          duracion_meses: e.duracion_meses || 0, eps: e.candidato_eps || "", pension: e.candidato_pension || ""
        };
      });
      for (var i = 0; i < employees.length; i++) {
        var customPin = await kvGet("hab:pin:" + employees[i].id);
        if (customPin) { employees[i].pin = customPin; employees[i].pin_changed = true; }
        else { employees[i].pin = (employees[i].documento || "0000").slice(-4); employees[i].pin_changed = false; }
        var twofa = await kvGet("hab:2fa:" + employees[i].id);
        employees[i].twofa_enabled = (twofa === "true");
      }
      return res.status(200).json({ ok: true, data: employees });
    }

    // POST: actions
    if (req.method === "POST") {
      var body = req.body || {};
      var action = body.action;

      if (action === "change_pin") {
        if (!body.emp_id || !body.new_pin) return res.status(400).json({ ok: false, error: "emp_id and new_pin required" });
        if (body.new_pin.length < 4 || body.new_pin.length > 6) return res.status(400).json({ ok: false, error: "PIN 4-6 digits" });
        await kvSet("hab:pin:" + body.emp_id, body.new_pin);
        return res.status(200).json({ ok: true });
      }

      if (action === "set_2fa") {
        if (!body.emp_id) return res.status(400).json({ ok: false, error: "emp_id required" });
        await kvSet("hab:2fa:" + body.emp_id, body.enabled ? "true" : "false");
        return res.status(200).json({ ok: true });
      }

      if (action === "send_otp") {
        if (!body.emp_id) return res.status(400).json({ ok: false, error: "emp_id required" });
        var r2 = await fetch(SB_URL + "/rest/v1/hiring_processes?id=eq." + body.emp_id + "&select=candidato_email,candidato_nombre", { headers: sbH() });
        var d2 = await r2.json();
        if (!d2 || !d2[0] || !d2[0].candidato_email) return res.status(400).json({ ok: false, error: "No email" });
        var otp = String(Math.floor(100000 + Math.random() * 900000));
        var expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
        await kvSet("hab:otp:" + body.emp_id, JSON.stringify({ code: otp, expires: expires }));
        var RESEND_KEY = process.env.RESEND_API_KEY;
        if (!RESEND_KEY) return res.status(500).json({ ok: false, error: "Email not configured" });
        var nombre = d2[0].candidato_nombre || "";
        var otpHtml = '<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F5F4F1;font-family:Arial,sans-serif"><table width="100%" style="background:#F5F4F1;padding:40px 20px"><tr><td align="center"><table width="480" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)"><tr><td style="background:#111;padding:24px;text-align:center"><img src="https://suite.habitaris.co/logo-habitaris-blanco.jpg" width="140"/></td></tr><tr><td style="padding:32px 40px;text-align:center"><div style="font-size:18px;font-weight:bold;color:#111;margin-bottom:8px">Código de verificación</div><div style="font-size:13px;color:#666;margin-bottom:24px">Hola ' + nombre + ', usa este código:</div><div style="background:#F5F4F1;border:2px solid #E5E3DE;border-radius:8px;padding:20px;display:inline-block"><div style="font-size:32px;font-weight:800;letter-spacing:8px;font-family:monospace;color:#111">' + otp + '</div></div><div style="font-size:11px;color:#999;margin-top:16px">Expira en 10 minutos.</div></td></tr><tr><td style="background:#F5F4F1;padding:16px;text-align:center;border-top:1px solid #E5E3DE"><div style="font-size:10px;color:#aaa">Habitaris S.A.S</div></td></tr></table></td></tr></table></body></html>';
        await fetch("https://api.resend.com/emails", { method: "POST",
          headers: { "Authorization": "Bearer " + RESEND_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({ from: "Habitaris <comercial@habitaris.co>", to: [d2[0].candidato_email], subject: otp + " — Código Habitaris", html: otpHtml })
        });
        return res.status(200).json({ ok: true });
      }

      if (action === "verify_otp") {
        if (!body.emp_id || !body.code) return res.status(400).json({ ok: false, error: "emp_id and code required" });
        var stored = await kvGet("hab:otp:" + body.emp_id);
        if (!stored) return res.status(400).json({ ok: false, error: "No OTP pending" });
        var otpData = JSON.parse(stored);
        if (new Date() > new Date(otpData.expires)) return res.status(400).json({ ok: false, error: "OTP expired" });
        if (otpData.code !== body.code) return res.status(400).json({ ok: false, error: "Invalid code" });
        await kvSet("hab:otp:" + body.emp_id, JSON.stringify({ code: "", expires: "" }));
        return res.status(200).json({ ok: true });
      }

      return res.status(400).json({ ok: false, error: "Unknown action" });
    }
    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
