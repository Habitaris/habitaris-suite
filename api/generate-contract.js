const SB_URL = "https://xlzkasdskatnikuavefh.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhsemthc2Rza2F0bmlrdWF2ZWZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4OTE3NzQsImV4cCI6MjA4NzQ2Nzc3NH0.SR9tIpvL0YnV9CNrRq4T-xetifuNQOJZE0OnQpwtYLM";
function sbH(){return{"apikey":SB_KEY,"Authorization":"Bearer "+SB_KEY,"Content-Type":"application/json","Prefer":"return=representation"};}

function fmtMoney(n){return n?new Intl.NumberFormat("es-CO",{style:"currency",currency:"COP",maximumFractionDigits:0}).format(n):"$0";}
function fmtDate(d){if(!d)return"";var dt=new Date(d);var meses=["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];return dt.getDate()+" de "+meses[dt.getMonth()]+" de "+dt.getFullYear();}

export default async function handler(req,res){
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Methods","GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");
  if(req.method==="OPTIONS")return res.status(200).end();

  var hid=req.query.hiring_id||"";
  if(!hid)return res.status(400).json({ok:false,error:"hiring_id required"});

  try{
    var r=await fetch(SB_URL+"/rest/v1/hiring_processes?id=eq."+hid,{headers:sbH()});
    var d=await r.json();
    if(!d||!d.length)return res.status(404).json({ok:false,error:"Not found"});
    var h=d[0];

    // Fetch template
    var r2=await fetch(SB_URL+"/rest/v1/contract_templates?id=eq."+(h.contrato_plantilla||"tpl_contrato_fijo"),{headers:sbH()});
    var d2=await r2.json();
    var tpl=d2&&d2.length?d2[0]:null;

    var year=new Date().getFullYear();
    var code="HAB-CTR-"+year+"-"+String(Math.floor(Math.random()*999)+1).padStart(3,"0");
    var tipoLabel=h.tipo_contrato==="fijo"?"Individual a t\u00e9rmino fijo":h.tipo_contrato==="indefinido"?"Individual a t\u00e9rmino indefinido":"Obra o labor";

    // Generate contract HTML matching PDF format
    var html=`<!DOCTYPE html><html><head><meta charset="UTF-8"/><style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Helvetica,Arial,sans-serif;color:#111;font-size:9pt;line-height:1.4}
.page{max-width:700px;margin:0 auto;padding:20px}
.header{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #ddd;padding-bottom:10px;margin-bottom:16px}
.logo{font-weight:700;font-size:18px}
.slogan{font-size:6.5pt;color:#999}
.code{font-size:7pt;color:#999}
h1{font-size:12pt;text-align:center;margin-bottom:16px;font-weight:700}
table{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:8.5pt}
th{background:#111;color:#fff;text-align:left;padding:5px 8px;font-size:7.5pt;font-weight:600}
td{padding:4px 8px;border:0.5px solid #ddd}
td.label{background:#F8F7F5;font-weight:700;font-size:7.5pt;color:#666;width:18%}
td.label2{background:#F8F7F5;font-weight:700;font-size:7.5pt;color:#666;width:15%}
.clause{margin-bottom:6px;text-align:justify;font-size:9pt}
.clause b{font-weight:700}
.section-title{font-weight:700;font-size:10pt;margin:12px 0 6px;border-bottom:1px solid #ddd;padding-bottom:4px}
.footer{border-top:1px solid #ddd;margin-top:20px;padding-top:8px;font-size:6pt;color:#999;display:flex;justify-content:space-between}
.sig-block{display:flex;justify-content:space-around;margin-top:40px;text-align:center;font-size:9pt}
.sig-col{width:30%}
.sig-line{border-top:1px solid #111;margin-top:40px;padding-top:6px}
.sig-name{font-weight:700;font-size:9pt}
.sig-role{font-size:8pt;color:#666}
@media print{.page{padding:0}}
</style></head><body><div class="page">
<div class="header"><div><span class="logo">Habitaris</span> <span class="slogan">ARQUITECTURA · INTERIORISMO</span></div><div class="code">${code}</div></div>
<h1>CONTRATO INDIVIDUAL DE TRABAJO</h1>
<table>
<tr><th colspan="4">DATOS DEL CONTRATO</th></tr>
<tr><td class="label">Contrato No.</td><td>${code}</td><td class="label2">Fecha</td><td>${fmtDate(h.fecha_inicio||new Date())}</td></tr>
<tr><td class="label">Clase</td><td>${tipoLabel}</td><td class="label2">Duraci\u00f3n</td><td>${h.duracion_meses?h.duracion_meses+" meses":"Indefinido"}</td></tr>
<tr><th colspan="4">EMPLEADOR</th></tr>
<tr><td class="label">Raz\u00f3n social</td><td>HABITARIS SAS</td><td class="label2">NIT</td><td>901.922.136-8</td></tr>
<tr><td class="label">Rep. legal</td><td>Ana Mar\u00eda D\u00edaz Buitrago</td><td class="label2">CC</td><td>1.109.293.384</td></tr>
<tr><td class="label">Direcci\u00f3n</td><td colspan="3">Calle 106 No. 45-39, Bogot\u00e1 D.C.</td></tr>
<tr><th colspan="4">TRABAJADOR(A)</th></tr>
<tr><td class="label">Nombre</td><td>${h.candidato_nombre||"{{nombre}}"}</td><td class="label2">CC</td><td>${h.candidato_cc||"{{cc}}"}</td></tr>
<tr><td class="label">Direcci\u00f3n</td><td>${h.candidato_direccion||"{{direcci\u00f3n}}"}</td><td class="label2">Celular</td><td>${h.candidato_celular||"{{celular}}"}</td></tr>
<tr><td class="label">Email</td><td colspan="3">${h.candidato_email||"{{email}}"}</td></tr>
<tr><th colspan="4">CONDICIONES LABORALES</th></tr>
<tr><td class="label">Cargo</td><td>${h.cargo}</td><td class="label2">Ciudad</td><td>${h.ciudad||"Bogot\u00e1 D.C."}</td></tr>
<tr><td class="label">Inicio labores</td><td>${fmtDate(h.fecha_inicio)}</td><td class="label2">Prueba</td><td>${h.periodo_prueba||"Dos (2) meses"}</td></tr>
<tr><td class="label">Salario neto</td><td colspan="3">${fmtMoney(h.salario_neto)}${h.auxilio_transporte?" (incluye aux. transporte)":""}</td></tr>
<tr><td class="label">Jornada</td><td>${h.jornada_horas} horas semanales</td><td class="label2">Horario</td><td>${h.horario}</td></tr>
<tr><td class="label">D\u00edas laborales</td><td colspan="3">${h.dias_laborales}</td></tr>
</table>`;

    // Add clauses from template or default
    var clausulas = tpl && tpl.contenido ? tpl.contenido : "";
    if(clausulas){
      html+=`<div class="section-title">CL\u00c1USULAS</div>`;
      var parrs = clausulas.split("\n\n");
      for(var i=0;i<parrs.length;i++){
        var p=parrs[i].trim();
        if(!p)continue;
        // Replace variables
        p=p.replace(/\{\{nombre_trabajador\}\}/g, h.candidato_nombre||"");
        p=p.replace(/\{\{numero_doc\}\}/g, (h.candidato_cc||"").replace(/^[A-Z]+ /,""));
        p=p.replace(/\{\{tipo_doc\}\}/g, (h.candidato_cc||"").split(" ")[0]||"CC");
        p=p.replace(/\{\{cargo\}\}/g, h.cargo||"");
        p=p.replace(/\{\{salario_neto\}\}/g, fmtMoney(h.salario_neto));
        p=p.replace(/\{\{jornada_horas\}\}/g, String(h.jornada_horas||""));
        p=p.replace(/\{\{horario\}\}/g, h.horario||"");
        p=p.replace(/\{\{dias_laborales\}\}/g, h.dias_laborales||"");
        p=p.replace(/\{\{duracion_meses\}\}/g, String(h.duracion_meses||""));
        p=p.replace(/\{\{fecha_inicio\}\}/g, fmtDate(h.fecha_inicio));
        p=p.replace(/\{\{fecha_texto\}\}/g, fmtDate(h.fecha_inicio));
        p=p.replace(/\{\{periodo_prueba\}\}/g, h.periodo_prueba||"");
        p=p.replace(/\{\{ciudad\}\}/g, h.ciudad||"Bogot\u00e1 D.C.");
        p=p.replace(/\{\{empresa_nombre\}\}/g, "HABITARIS SAS");
        p=p.replace(/\{\{empresa_nit\}\}/g, "901.922.136-8");
        p=p.replace(/\{\{rep_legal_nombre\}\}/g, "Ana Mar\u00eda D\u00edaz Buitrago");
        p=p.replace(/\{\{rep_legal_cc\}\}/g, "1.109.293.384");
        p=p.replace(/\{\{descriptor_codigo\}\}/g, h.descriptor_codigo||"");
        p=p.replace(/\{\{direccion_trabajo\}\}/g, "Calle 106 No. 45-39, Bogot\u00e1 D.C.");
        // Bold uppercase words
        p=p.replace(/\\b([A-Z\u00c1\u00c9\u00cd\u00d3\u00da\u00d1]{2,})\\b/g, "<b>$1</b>");
        // Bold clause titles
        p=p.replace(/^((?:PRIMERA|SEGUNDA|TERCERA|CUARTA|QUINTA|SEXTA|S[EÉ]PTIMA|OCTAVA|NOVENA|D[EÉ]CIMA?(?:\\s+\\w+)?)[.\\-\\s:]+)/i, "<b>$1</b>");
        p=p.replace(/^(Par[aá]grafo[\\s\\w]*[.\\-:\\s]+)/i, "<b>$1</b>");
        html+=`<div class="clause">${p}</div>`;
      }
    }

    // Signature block
    html+=`<div class="sig-block">
<div class="sig-col"><div class="sig-line"></div><div class="sig-name">REVISADO POR</div><div class="sig-role">${h.abogado_nombre||"{{Abogado}}"}<br/>Asesor(a) Legal</div></div>
<div class="sig-col"><div class="sig-line"></div><div class="sig-name">${h.candidato_nombre||"TRABAJADOR"}</div><div class="sig-role">${h.candidato_cc||""}</div></div>
<div class="sig-col"><div class="sig-line"></div><div class="sig-name">ANA MAR\u00cdA D\u00cdAZ BUITRAGO</div><div class="sig-role">CC 1.109.293.384<br/>Rep. Legal HABITARIS SAS</div></div>
</div>
<div class="footer"><span>HABITARIS SAS · NIT 901.922.136-8 · Calle 106 No. 45-39, Bogot\u00e1 D.C.</span><span>Documento generado por Habitaris Suite v1.0 · ${code}</span></div>
</div></body></html>`;

    return res.status(200).json({ok:true,html:html,code:code});
  }catch(e){return res.status(500).json({ok:false,error:e.message});}
}
