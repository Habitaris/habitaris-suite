const SB_URL = "https://xlzkasdskatnikuavefh.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhsemthc2Rza2F0bmlrdWF2ZWZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4OTE3NzQsImV4cCI6MjA4NzQ2Nzc3NH0.SR9tIpvL0YnV9CNrRq4T-xetifuNQOJZE0OnQpwtYLM";
function sbH(){return{"apikey":SB_KEY,"Authorization":"Bearer "+SB_KEY,"Content-Type":"application/json","Prefer":"return=representation"};}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    var empId = req.query.emp || "";
    
    // Read from hiring_processes (real employees)
    var filter = "estado=in.(firmado,afiliaciones,completado)&select=id,candidato_nombre,candidato_cc,cargo,fecha_inicio,candidato_celular,salario_base,auxilio_transporte,tipo_contrato,duracion_meses,candidato_eps,candidato_pension";
    if (empId) filter = "id=eq." + empId + "&select=id,candidato_nombre,candidato_cc,cargo,fecha_inicio,candidato_celular,salario_base,auxilio_transporte,tipo_contrato,duracion_meses,candidato_eps,candidato_pension";
    
    var r = await fetch(SB_URL + "/rest/v1/hiring_processes?" + filter + "&order=candidato_nombre.asc", { headers: sbH() });
    var data = await r.json();
    
    // Map to attendance format
    var employees = (data || []).map(function(e) {
      return {
        id: e.id,
        nombre: e.candidato_nombre || "Sin nombre",
        documento: e.candidato_cc || "",
        cargo: e.cargo || "",
        pin: (e.candidato_cc || "0000").slice(-4),
        celular: e.candidato_celular || "",
        fecha_inicio: e.fecha_inicio || "",
        salario_base: e.salario_base || 0,
        auxilio_transporte: e.auxilio_transporte || 0,
        tipo_contrato: e.tipo_contrato || "fijo",
        duracion_meses: e.duracion_meses || 0,
        eps: e.candidato_eps || "",
        pension: e.candidato_pension || ""
      };
    });
    
    return res.status(200).json({ ok: true, data: employees });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
