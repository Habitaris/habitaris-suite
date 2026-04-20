// ──────────────────────────────────────────────────────────────
// Helper compartido: genera el HTML del PDF de nómina/anticipo.
// Lo usa tanto TabNomina.jsx (tab Descargables) como el payload
// que se publica al portal empleado. El HTML es autocontenido
// (CSS + scripts html2canvas/jspdf inline + logo embebido).
//
// Si se pasa `refBancaria`, aparece en el PDF como "Pagado con ref: ..."
// ──────────────────────────────────────────────────────────────

import { HAB_LOGO } from "./habLogo.js";

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const fmt = n => n == null || isNaN(n) ? "$0" : "$" + Math.round(n).toLocaleString("es-CO");

// Genera { fileName, html } para una nómina o justificante de anticipo.
// tipo: "anticipo" | "nomina"
export function buildNominaHtml({ selN, calc, anio, mes, tipo, refBancaria }) {
  const mAbr = MESES[mes].substring(0,3).toUpperCase();
  const a2 = String(anio).slice(-2);
  const ape = (selN.nombre||"").split(" ").slice(-2).join("-").toUpperCase();
  const refInterna = `NOM ${mAbr}${a2} ${tipo==="anticipo"?"ANT":"PAG"} - ${ape}`;
  const fileName = `${tipo==="anticipo"?"ANTICIPO":"NOMINA"}-${mAbr}${a2}-${ape}`;
  const isQuinc = selN.modalidadPago !== "mensual";

  const items = [
    { c:"Salario básico", d:calc.salProp, dd:0 },
    calc.aux>0 && { c:`Aux. transporte (${calc.diasComm}d)`, d:calc.aux, dd:0 },
    calc.bono>0 && { c:`Bono asistencia (${calc.diasAsist}d)`, d:calc.bono, dd:0 },
    calc.totHex>0 && { c:"Horas extra", d:calc.totHex, dd:0 },
    calc.recFest>0 && { c:"Recargo festivos", d:calc.recFest, dd:0 },
    { c:"EPS (4%)", d:0, dd:calc.epsE },
    { c:"Pensión (4%)", d:0, dd:calc.penE },
    calc.rteF>0 && { c:"Retención fuente", d:0, dd:calc.rteF },
    calc.otrasDed>0 && { c:"Otras deducciones", d:0, dd:calc.otrasDed },
  ].filter(Boolean);

  let bodyHtml = "";

  if (tipo === "anticipo") {
    const fiDate2 = new Date((selN.fechaIngreso||"2026-01-01")+"T12:00:00");
    const antigDias2 = Math.floor((new Date()-fiDate2)/86400000);
    const antigMeses2 = Math.floor(antigDias2/30);
    const antigAnios2 = Math.floor(antigMeses2/12);
    const antigTxt2 = antigAnios2>0 ? antigAnios2+"a "+(antigMeses2%12)+"m" : antigMeses2+"m "+(antigDias2%30)+"d";
    bodyHtml = `<h1>Justificante de anticipo</h1>
    <div class="info"><div><span>Nombre: </span><b>${selN.nombre}</b></div><div><span>Documento: </span><b>${selN.cc}</b></div><div><span>Cargo: </span>${selN.cargo}</div><div><span>Contrato: </span>${selN.tipoContrato}</div><div><span>Fecha de pago: </span><b>15 de ${MESES[mes]} ${anio}</b></div><div><span>Antigüedad: </span><b>${antigTxt2}</b></div></div>
    <table><thead><tr><th>Concepto</th><th class="r">Base</th><th class="r">Importe</th></tr></thead><tbody>
    <tr><td>Anticipo primera quincena (${((selN.q1Pct||0.5)*100).toFixed(0)}% salario base)</td><td class="r">${fmt(selN.sal)}</td><td class="r">${fmt(calc.q1)}</td></tr>
    <tr class="liq"><td>Líquido a percibir</td><td class="r"></td><td class="r">${fmt(calc.q1)}</td></tr>
    </tbody></table>
    <div style="font-size:7pt;color:#bbb;margin:12px 0">Ref interna: ${refInterna}${refBancaria?` · Pagado con ref: ${refBancaria}`:""} · Este importe será descontado en la nómina del período</div>
    <div class="sig"><div><div class="line"></div><div class="name">Habitaris S.A.S</div><div class="role">Administración de personal</div></div><div><div class="line"></div><div class="name">${selN.nombre}</div><div class="role">Recibí conforme</div></div></div>`;
  } else {
    const allItems = [...items];
    if (isQuinc) allItems.push({ c:"Anticipo de nómina (15/"+MESES[mes].slice(0,3)+")", d:0, dd:calc.q1 });
    const totalDed = isQuinc ? calc.totD+calc.q1 : calc.totD;
    const liquido = isQuinc ? calc.q2 : calc.neto;
    const fiDate = new Date((selN.fechaIngreso||"2026-01-01")+"T12:00:00");
    const startY = fiDate.getFullYear()===anio ? fiDate.getMonth() : 0;
    const mesesYTD = mes-startY+1;
    const antigDias = Math.floor((new Date()-fiDate)/86400000);
    const antigMeses = Math.floor(antigDias/30);
    const antigAnios = Math.floor(antigMeses/12);
    const antigTxt = antigAnios>0 ? antigAnios+"a "+((antigMeses%12))+"m" : antigMeses+"m "+((antigDias%30))+"d";

    const nDias = selN.novDias||{};
    const novEntries = Object.entries(nDias).filter(([k])=>k.startsWith(anio+"-"+String(mes+1).padStart(2,"0"))).sort();
    const tipoLabel = { incapacidad:"Incapacidad", vacaciones:"Vacaciones", licencia:"Licencia rem.", licNoRem:"Licencia no rem.", ausencia:"Ausencia" };
    const festivos = calc.festMes||0;
    const diasLab = 30-novEntries.length;
    const novSection = novEntries.length===0 ? "" : `<div class="section-title">Novedades del período</div>
    <table class="acum"><thead><tr><th>Fecha</th><th>Tipo</th><th class="r">Días</th></tr></thead><tbody>
    ${novEntries.map(([k,v])=>{const d=new Date(k+"T12:00:00");return `<tr><td>${d.toLocaleDateString("es-CO",{day:"numeric",month:"short"})}</td><td>${tipoLabel[v]||v}</td><td class="r">1</td></tr>`;}).join("")}
    </tbody></table>
    <div style="font-size:7pt;color:#999;margin:4px 0 0">Días laborados: ${diasLab} · Festivos: ${festivos} · Novedades: ${novEntries.length}</div>`;

    bodyHtml = `<h1>Nómina</h1>
    <div class="info"><div><span>Nombre: </span><b>${selN.nombre}</b></div><div><span>Documento: </span><b>${selN.cc}</b></div><div><span>Cargo: </span>${selN.cargo}</div><div><span>Contrato: </span>${selN.tipoContrato}</div><div><span>Período: </span><b>01 al ${new Date(anio,mes+1,0).getDate()} ${MESES[mes]} ${anio}</b></div><div><span>Días: </span><b>${calc.dias}/30</b></div><div><span>Ingreso: </span>${selN.fechaIngreso}</div><div><span>Antigüedad: </span><b>${antigTxt}</b></div><div><span>Banco: </span>${selN.banco||"—"}</div><div><span>Modalidad de pago: </span>${isQuinc?"Quincenal":"Mensual"}</div></div>
    <table><thead><tr><th>Concepto</th><th class="r">Devengado</th><th class="r">Deducción</th></tr></thead><tbody>
    ${allItems.map(r=>"<tr><td>"+r.c+"</td><td class='r'>"+(r.d>0?fmt(r.d):"—")+"</td><td class='r'>"+(r.dd>0?fmt(r.dd):"—")+"</td></tr>").join("")}
    <tr class="tot"><td>Total devengado / Total deducido</td><td class="r">${fmt(calc.dev)}</td><td class="r">${fmt(totalDed)}</td></tr>
    <tr class="liq"><td>Líquido a percibir</td><td class="r"></td><td class="r">${fmt(liquido)}</td></tr>
    </tbody></table>

    ${novSection}

    <div class="section-title">Acumulados año ${anio} (${MESES[startY].slice(0,3)} — ${MESES[mes].slice(0,3)} · ${mesesYTD} mes${mesesYTD>1?"es":""})</div>
    <table class="acum"><thead><tr><th>Concepto</th><th class="r">Mes actual</th><th class="r">Acumulado año</th></tr></thead><tbody>
    <tr><td>Salario bruto</td><td class="r">${fmt(calc.dev)}</td><td class="r">${fmt(calc.dev*mesesYTD)}</td></tr>
    <tr><td>Seguridad social</td><td class="r">${fmt(calc.epsE+calc.penE)}</td><td class="r">${fmt((calc.epsE+calc.penE)*mesesYTD)}</td></tr>
    ${calc.rteF>0?`<tr><td>Retención fuente</td><td class="r">${fmt(calc.rteF)}</td><td class="r">${fmt(calc.rteF*mesesYTD)}</td></tr>`:""}
    <tr><td>Neto percibido</td><td class="r">${fmt(calc.neto)}</td><td class="r">${fmt(calc.neto*mesesYTD)}</td></tr>
    </tbody></table>

    <div style="font-size:7pt;color:#bbb;margin:12px 0">Ref interna: ${refInterna}${refBancaria?` · Pagado con ref: ${refBancaria}`:""}</div>
    <div class="sig"><div><div class="line"></div><div class="name">Habitaris S.A.S</div><div class="role">Administración de personal</div></div><div><div class="line"></div><div class="name">${selN.nombre}</div><div class="role">Recibí conforme</div></div></div>`;
  }

  // Paper format: A5 for anticipo (cuartilla), A4 for nómina
  const paper = tipo === "anticipo"
    ? { size: "a5", widthMm: 148, widthPx: 560, cssPage: "@page{size:A5 portrait;margin:8mm}" }
    : { size: "a4", widthMm: 210, widthPx: 794, cssPage: "@page{size:A4 portrait;margin:12mm}" };

  const css = `${paper.cssPage}*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background:#e8e8e8;padding:20px 0}#content{background:#fff;width:${paper.widthPx}px;margin:0 auto;padding:40px 50px;font-size:8.5pt;color:#333;line-height:1.5;box-shadow:0 1px 4px rgba(0,0,0,.1)}.hdr{padding-bottom:12px;margin-bottom:16px;border-bottom:1px solid #ddd;overflow:hidden}.hdr .l{float:left}.hdr .r{float:right;text-align:right;font-size:7.5pt;color:#999;padding-top:12px}.hdr img{height:46px}h1{font-size:10pt;font-weight:600;text-align:center;margin:10px 0 10px;letter-spacing:.3px;clear:both}.sub{text-align:center;font-size:7.5pt;color:#999;margin-bottom:14px}.info{margin-bottom:14px;font-size:8pt;overflow:hidden;border:1px solid #eee;border-radius:3px;padding:8px 12px}.info div{float:left;width:50%;padding:2px 0;color:#555}.info span{color:#999}.info b{color:#333}table{width:100%;border-collapse:collapse;font-size:8pt;clear:both;margin-bottom:4px}th{padding:5px 8px;text-align:left;font-size:6.5pt;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #ddd}td{padding:4px 8px;border-bottom:1px solid #f2f2f2;color:#444}.r{text-align:right;font-family:'SF Mono',Menlo,monospace;font-size:8pt}.tot td{border-top:1px solid #333;border-bottom:none;font-weight:600;color:#333;padding:6px 8px}.liq td{border-top:2px solid #333;border-bottom:none;font-weight:700;color:#111;padding:8px;font-size:9pt}.section-title{font-size:7pt;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:#999;margin:16px 0 4px;padding-top:12px;border-top:1px solid #eee}.emp td,.acum td{padding:3px 8px;border-bottom:1px solid #f5f5f5;color:#666;font-size:7.5pt}.emp .tot td,.acum .tot td{border-top:1px solid #ccc;font-weight:600;color:#444;padding:5px 8px}.acum th{font-size:6pt;padding:3px 8px}.neto{border:1px solid #333;border-radius:3px;padding:10px 14px;margin:8px 0;overflow:hidden}.neto .lbl{float:left;padding-top:2px}.neto .lbl div:first-child{font-size:7pt;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:#333}.neto .lbl div:last-child{font-size:6.5pt;color:#999;margin-top:1px}.neto .v{float:right;font-size:15pt;font-weight:700;font-family:'SF Mono',Menlo,monospace;color:#111}.q{overflow:hidden;margin:6px 0}.qb{float:left;width:49%;border:1px solid #e0e0e0;border-radius:3px;padding:5px;text-align:center}.qb:last-child{float:right}.qb .v{font-size:11pt;font-weight:700;font-family:'SF Mono',Menlo,monospace;color:#333}.qb .l{font-size:6pt;font-weight:600;text-transform:uppercase;color:#999;letter-spacing:.3px}.sig{margin-top:60px;overflow:hidden;padding:0 20px}.sig>div{float:left;width:44%;text-align:center}.sig>div:last-child{float:right}.sig .line{border-top:1px solid #999;margin-bottom:6px}.sig .name{font-size:8pt;font-weight:600;color:#333}.sig .role{font-size:7pt;color:#999;margin-top:1px}.foot{font-size:6pt;color:#bbb;text-align:center;margin-top:20px;clear:both;letter-spacing:.3px}.np{text-align:center;margin:16px auto;max-width:${paper.widthPx}px}.btn{background:#333;color:#fff;border:none;padding:8px 20px;border-radius:3px;cursor:pointer;font-size:10pt;font-weight:500;margin:0 4px;font-family:inherit}.btn2{background:#fff;color:#333;border:1px solid #ccc;padding:8px 20px;border-radius:3px;cursor:pointer;font-size:10pt;margin:0 4px;font-family:inherit}@media print{body{background:#fff;padding:0}.np{display:none}#content{width:100%;margin:0;padding:8mm 10mm;box-shadow:none}}`;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${fileName}</title><script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"><\/script><script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"><\/script><style>${css}</style></head><body><div id="content"><div class="hdr"><div class="l"><img src="${HAB_LOGO}" alt="Habitaris"/></div><div class="r"><div style="font-weight:600;color:#111">Habitaris S.A.S</div><div>NIT: 901.922.136-8</div></div></div>${bodyHtml}<div class="foot">Habitaris Suite · ${new Date().toLocaleDateString("es-CO")} · ${fileName}</div></div><div class="np"><button class="btn" onclick="(function(){var el=document.getElementById('content');el.style.boxShadow='none';document.querySelector('.np').style.display='none';html2canvas(el,{scale:2,useCORS:true,backgroundColor:'#fff'}).then(function(c){var img=c.toDataURL('image/jpeg',0.98);var pdf=new jspdf.jsPDF('portrait','mm','${paper.size}');var w=${paper.widthMm},h=(c.height*w)/c.width;pdf.addImage(img,'JPEG',0,0,w,h);pdf.save('${fileName}.pdf');el.style.boxShadow='0 0 8px rgba(0,0,0,.15)';document.querySelector('.np').style.display=''})})()" >📥 Descargar PDF</button><button class="btn2" onclick="window.print()">🖨️ Imprimir</button></div></body></html>`;

  return { fileName, html };
}
