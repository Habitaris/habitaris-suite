// ──────────────────────────────────────────────────────────────
// Helper compartido: genera el HTML del PDF de nómina/anticipo.
// Lo usa tanto TabNomina.jsx (tab Descargables) como el payload
// que se publica al portal empleado. El HTML es autocontenido
// (CSS + scripts html2canvas/jspdf inline + logo embebido).
//
// Si se pasa `refBancaria`, aparece en el PDF como "Pagado con ref: ..."
// ──────────────────────────────────────────────────────────────

import { HAB_LOGO } from "./habLogo.js";
import {  getTenantDefaultsSync, getActiveCompanyLegalDataSync } from "../core/configHelpers.js";

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const fmt = n => n == null || isNaN(n) ? "$0" : "$" + Math.round(n).toLocaleString(getTenantDefaultsSync().locale);

// Enmascara un número de cuenta/teléfono dejando visibles solo los últimos 3 dígitos.
// Ej: "3212319523" -> "*******523". Para documentos de pago (anticipo/nómina/prima).
const maskCuenta = c => { const s = String(c||"").replace(/\s+/g,""); return s.length<=3 ? s : "*".repeat(s.length-3)+s.slice(-3); };
// Línea de medio de pago: "DaviPlata · *******523" (o solo el banco si no hay número).
const medioPago = n => `${n.banco||"—"}${n.cuenta?` · ${maskCuenta(n.cuenta)}`:""}`;

// Genera { fileName, html } para una nómina o justificante de anticipo.
// tipo: "anticipo" | "nomina"
export function buildNominaHtml({ selN, calc, anio, mes, tipo, refBancaria }) {
  const _diasIncapHtml = Object.values(selN.novDias||{}).filter(v=>v==='incapacidad').length;
  const _auxIncapHtml = Math.round((selN.sal/30)*_diasIncapHtml*0.6667);
  const mAbr = MESES[mes].substring(0,3).toUpperCase();
  const a2 = String(anio).slice(-2);
  const ape = (selN.nombre||"").split(" ").slice(-2).join("-").toUpperCase();
  const refInterna = `NOM ${mAbr}${a2} ${tipo==="anticipo"?"ANT":"PAG"} - ${ape}`;
  const fileName = `${tipo==="anticipo"?"ANTICIPO":"NOMINA"}-${mAbr}${a2}-${ape}`;
  const isQuinc = selN.modalidadPago !== "mensual";

  const items = [
    { c:`Salario básico (${calc.dias}d)`, d:calc.salProp, dd:0 },
    calc.aux>0 && { c:`Aux. transporte (${calc.diasComm}d)`, d:calc.aux, dd:0 },
    calc.bono>0 && { c:`Bono asistencia (${calc.diasAsist}d)`, d:calc.bono, dd:0 }, _diasIncapHtml>0 && {c:`Incapacidad (${_diasIncapHtml}d)`, d:_auxIncapHtml, ded:0},
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
    <div class="sig"><div><div class="line"></div><div class="name">${getActiveCompanyLegalDataSync().legalName}</div><div class="role">Administración de personal</div></div><div><div class="line"></div><div class="name">${selN.nombre}</div><div class="role">Recibí conforme</div></div></div>`;
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
    ${novEntries.map(([k,v])=>{const d=new Date(k+"T12:00:00");return `<tr><td>${d.toLocaleDateString(getTenantDefaultsSync().locale,{day:"numeric",month:"short"})}</td><td>${tipoLabel[v]||v}</td><td class="r">1</td></tr>`;}).join("")}
    </tbody></table>
    <div style="font-size:7pt;color:#999;margin:4px 0 0">Días laborados: ${diasLab} · Festivos: ${festivos} · Novedades: ${novEntries.length}</div>`;

    bodyHtml = `<h1>Nómina</h1>
    <div class="info"><div><span>Nombre: </span><b>${selN.nombre}</b></div><div><span>Documento: </span><b>${selN.cc}</b></div><div><span>Cargo: </span>${selN.cargo}</div><div><span>Contrato: </span>${selN.tipoContrato}</div><div><span>Período: </span><b>01 al ${new Date(anio,mes+1,0).getDate()} ${MESES[mes]} ${anio}</b></div><div><span>Días: </span><b>${calc.dias}/30</b></div><div><span>Ingreso: </span>${selN.fechaIngreso}</div><div><span>Antigüedad: </span><b>${antigTxt}</b></div><div><span>Medio de pago: </span>${medioPago(selN)}</div><div><span>Modalidad de pago: </span>${isQuinc?"Quincenal":"Mensual"}</div></div>
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
    <div class="sig"><div><div class="line"></div><div class="name">${getActiveCompanyLegalDataSync().legalName}</div><div class="role">Administración de personal</div></div><div><div class="line"></div><div class="name">${selN.nombre}</div><div class="role">Recibí conforme</div></div></div>`;
  }

  // Paper format: A5 for anticipo (cuartilla), A4 for nómina
  // NOTE: passing format as explicit [width, height] array in mm to avoid any jsPDF string parsing bugs
  const paper = tipo === "anticipo"
    ? { size: "a5", widthMm: 148, heightMm: 210, widthPx: 560, cssPage: "@page{size:A5 portrait;margin:8mm}" }
    : { size: "a4", widthMm: 210, heightMm: 297, widthPx: 794, cssPage: "@page{size:A4 portrait;margin:12mm}" };

  const css = `${paper.cssPage}*{margin:0;padding:0;box-sizing:border-box}body{font-family:'DM Sans','Helvetica Neue',Helvetica,Arial,sans-serif;background:#e8e8e8;padding:20px 0}#content{background:#fff;width:${paper.widthPx}px;margin:0 auto;padding:40px 50px;font-size:8.5pt;color:#333;line-height:1.5;box-shadow:0 1px 4px rgba(0,0,0,.1)}.hdr{padding-bottom:12px;margin-bottom:16px;border-bottom:1px solid #ddd;overflow:hidden}.hdr .l{float:left}.hdr .r{float:right;text-align:right;font-size:7.5pt;color:#999;padding-top:12px}.hdr img{height:46px}h1{font-size:10pt;font-weight:600;text-align:center;margin:10px 0 10px;letter-spacing:.3px;clear:both}.sub{text-align:center;font-size:7.5pt;color:#999;margin-bottom:14px}.info{margin-bottom:14px;font-size:8pt;overflow:hidden;border:1px solid #eee;border-radius:3px;padding:8px 12px}.info div{float:left;width:50%;padding:2px 0;color:#555}.info span{color:#999}.info b{color:#333}table{width:100%;border-collapse:collapse;font-size:8pt;clear:both;margin-bottom:4px}th{padding:5px 8px;text-align:left;font-size:6.5pt;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #ddd}td{padding:4px 8px;border-bottom:1px solid #f2f2f2;color:#444}.r{text-align:right;font-family:'DM Mono','SF Mono',Menlo,monospace;font-size:8pt}.tot td{border-top:1px solid #333;border-bottom:none;font-weight:600;color:#333;padding:6px 8px}.liq td{border-top:2px solid #333;border-bottom:none;font-weight:700;color:#111;padding:8px;font-size:9pt}.section-title{font-size:7pt;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:#999;margin:16px 0 4px;padding-top:12px;border-top:1px solid #eee}.emp td,.acum td{padding:3px 8px;border-bottom:1px solid #f5f5f5;color:#666;font-size:7.5pt}.emp .tot td,.acum .tot td{border-top:1px solid #ccc;font-weight:600;color:#444;padding:5px 8px}.acum th{font-size:6pt;padding:3px 8px}.neto{border:1px solid #333;border-radius:3px;padding:10px 14px;margin:8px 0;overflow:hidden}.neto .lbl{float:left;padding-top:2px}.neto .lbl div:first-child{font-size:7pt;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:#333}.neto .lbl div:last-child{font-size:6.5pt;color:#999;margin-top:1px}.neto .v{float:right;font-size:15pt;font-weight:700;font-family:'DM Mono','SF Mono',Menlo,monospace;color:#111}.q{overflow:hidden;margin:6px 0}.qb{float:left;width:49%;border:1px solid #e0e0e0;border-radius:3px;padding:5px;text-align:center}.qb:last-child{float:right}.qb .v{font-size:11pt;font-weight:700;font-family:'DM Mono','SF Mono',Menlo,monospace;color:#333}.qb .l{font-size:6pt;font-weight:600;text-transform:uppercase;color:#999;letter-spacing:.3px}.sig{margin-top:60px;overflow:hidden;padding:0 20px}.sig>div{float:left;width:44%;text-align:center}.sig>div:last-child{float:right}.sig .line{border-top:1px solid #999;margin-bottom:6px}.sig .name{font-size:8pt;font-weight:600;color:#333}.sig .role{font-size:7pt;color:#999;margin-top:1px}.foot{font-size:6pt;color:#bbb;text-align:center;margin-top:20px;clear:both;letter-spacing:.3px}.np{text-align:center;margin:16px auto;max-width:${paper.widthPx}px}.btn{background:#333;color:#fff;border:none;padding:8px 20px;border-radius:3px;cursor:pointer;font-size:10pt;font-weight:500;margin:0 4px;font-family:inherit}.btn2{background:#fff;color:#333;border:1px solid #ccc;padding:8px 20px;border-radius:3px;cursor:pointer;font-size:10pt;margin:0 4px;font-family:inherit}@media print{body{background:#fff;padding:0}.np{display:none}#content{width:100%;margin:0;padding:8mm 10mm;box-shadow:none}}`;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"><title>${fileName}</title><script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"><\/script><script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"><\/script><style>${css}</style></head><body><div id="content"><div class="hdr"><div class="l"><img src="${HAB_LOGO}" alt="Habitaris"/></div><div class="r"><div style="font-weight:600;color:#111">${getActiveCompanyLegalDataSync().legalName}</div><div>NIT: ${getActiveCompanyLegalDataSync().taxId}</div></div></div>${bodyHtml}<div class="foot">Documento generado por Habitaris Suite — ${fileName} · ${new Date().toLocaleDateString(getTenantDefaultsSync().locale)}</div></div><div class="np"><div id="np-info" style="font-size:9pt;color:#888;margin-bottom:10px">Tamaño: ${paper.size.toUpperCase()} · ${paper.widthMm}mm × ${paper.heightMm}mm</div><button class="btn" onclick="(function(){var el=document.getElementById('content');var info=document.getElementById('np-info');el.style.boxShadow='none';document.querySelector('.np').style.display='none';html2canvas(el,{scale:2,useCORS:true,backgroundColor:'#fff'}).then(function(c){var img=c.toDataURL('image/jpeg',0.98);var pdf=new jspdf.jsPDF({orientation:'portrait',unit:'mm',format:[${paper.widthMm},${paper.heightMm}]});var w=${paper.widthMm},h=(c.height*w)/c.width,pageH=${paper.heightMm};if(h<=pageH){pdf.addImage(img,'JPEG',0,0,w,h);}else{var yOff=0;while(yOff<h){pdf.addImage(img,'JPEG',0,-yOff,w,h);yOff+=pageH;if(yOff<h)pdf.addPage([${paper.widthMm},${paper.heightMm}],'portrait');}}var pw=pdf.internal.pageSize.getWidth().toFixed(1),ph=pdf.internal.pageSize.getHeight().toFixed(1);console.log('[Habitaris PDF] Formato generado:',pw+'x'+ph+'mm','páginas:',pdf.internal.getNumberOfPages(),'canvas:',c.width+'x'+c.height+'px');pdf.save('${fileName}.pdf');el.style.boxShadow='0 0 8px rgba(0,0,0,.15)';document.querySelector('.np').style.display='';info.innerHTML='✅ PDF descargado: '+pw+'mm × '+ph+'mm ('+pdf.internal.getNumberOfPages()+' página'+(pdf.internal.getNumberOfPages()===1?'':'s')+')';info.style.color='#166534';info.style.background='#F0FDF4';info.style.padding='6px 10px';info.style.borderRadius='4px';})})()" >📥 Descargar PDF en ${paper.size.toUpperCase()}</button></div></body></html>`;

  return { fileName, html };
}

// ──────────────────────────────────────────────────────────────
// Reporte de PRIMA DE SERVICIOS (cuartilla A5, mismo patrón visual que el anticipo).
// Recibe `prima` = objeto calculado por calcPrimaSemestre:
//   { semestre, base, sal, aux, aplA, meses:[{mes,diasVinc,ausencias,licNoRem,diasPrima}], diasTotal, prima }
// ──────────────────────────────────────────────────────────────
export function buildPrimaHtml({ selN, prima, anio }) {
  const sem = prima.semestre;
  const semLabel = sem === 1 ? "Primer semestre (enero–junio)" : "Segundo semestre (julio–diciembre)";
  const a2 = String(anio).slice(-2);
  const ape = (selN.nombre||"").split(" ").slice(-2).join("-").toUpperCase();
  const fileName = `PRIMA-PROVISIONAL-S${sem}${a2}-${ape}`;
  const leg = getActiveCompanyLegalDataSync();
  const loc = getTenantDefaultsSync().locale;
  const fd = s => { if(!s) return ""; const p=String(s).split("-"); return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:s; };

  const filas = (prima.meses||[]).filter(m=>m.diasVinc>0).map(m=>{
    const nov=[];
    if(m.licRem>0) nov.push(`${m.licRem} licencia${m.licRem>1?"s":""} rem.`);
    if(m.incap>0) nov.push(`${m.incap} incapacidad${m.incap>1?"es":""}`);
    if(m.vac>0) nov.push(`${m.vac} vacaciones`);
    if(m.licNoRem>0) nov.push(`${m.licNoRem} lic. no rem.`);
    if(m.ausencias>0) nov.push(`${m.ausencias} ausencia${m.ausencias>1?"s":""}`);
    const restan = (m.ausencias||0) + (m.licNoRem||0);
    const resta = restan>0 ? `Sí (−${restan})` : (nov.length ? "No" : "—");
    const dv = m.diasVinc<30 ? `${m.diasVinc} <span style="color:#999;font-size:7.5pt">(desde ingreso)</span>` : `${m.diasVinc}`;
    return `<tr><td><b>${MESES[m.mes]}</b></td><td class="c">${dv}</td><td class="c">${nov.length?nov.join(", "):"—"}</td><td class="c">${resta}</td><td class="c"><b>${m.diasPrima}</b></td></tr>`;
  }).join("");

  const bodyHtml = `<h1>Liquidación provisional de prima de servicios</h1>
  <div class="sub">${semLabel} · ${anio} · Art. 306 del Código Sustantivo del Trabajo</div>
  <div class="forwho">Documento de cálculo estimado para revisión y validación del área contable.</div>

  <div class="cols">
    <div class="col"><div class="ct">EMPLEADOR</div><b>${leg.legalName||""}</b><br/>NIT ${leg.taxId||""}</div>
    <div class="col"><div class="ct">TRABAJADORA</div><b>${selN.nombre||""}</b><br/>C.C. ${selN.cc||""}<br/>${selN.cargo||""}</div>
  </div>
  <div class="contrato"><b>Contrato:</b> ${selN.tipoContrato||"término fijo"} · ${fd(selN.fechaIngreso)}${selN.fechaFinContrato?` a ${fd(selN.fechaFinContrato)}`:""}. Prima causada desde la fecha de ingreso.</div>

  <h2>Base de cálculo</h2>
  <div class="kv"><div class="l">Salario mensual (SMLMV ${anio})</div><div class="v">${fmt(prima.sal)}</div></div>
  <div class="kv"><div class="l">Auxilio de transporte</div><div class="v">${fmt(prima.aux)}</div></div>
  <div class="kv tot"><div class="l">Base de la prima (salario + auxilio)</div><div class="v">${fmt(prima.base)}</div></div>
  <div class="mini">El bono complementario es un pago no salarial (Art. 128 CST) y no se incluye en la base.</div>

  <h2>Días computados por mes</h2>
  <div class="mini">Los días se cuentan por la vinculación al contrato (todos los días causados), con independencia del centro de trabajo.</div>
  <table>
    <thead><tr><th>Mes</th><th class="c">Días de vinculación</th><th class="c">Novedad</th><th class="c">¿Resta?</th><th class="c">Días prima</th></tr></thead>
    <tbody>${filas}
      <tr class="ttot"><td>TOTAL</td><td class="c"></td><td class="c"></td><td class="c"></td><td class="c">${prima.diasTotal}</td></tr>
    </tbody>
  </table>

  <div class="estbox">
    <div><div class="estlabel">VALOR ESTIMADO DE LA PRIMA</div><div class="estform">Base × ${prima.diasTotal} ÷ 360</div></div>
    <div class="estv">${fmt(prima.prima)}</div>
  </div>
  <div class="estnote"><b>Nota:</b> cálculo estimado generado por Habitaris Suite. Pendiente de confirmación y validación por el contador con base en la información remitida. No constituye liquidación definitiva.</div>

  <h2>Criterio de cálculo</h2>
  <ul class="crit">
    <li>Prima de servicios (Art. 306 CST): equivale a un mes de salario por año trabajado, proporcional al tiempo laborado en el semestre.</li>
    <li>Los días se computan por la <b>vinculación al contrato</b>; no se limitan a los días imputados a un centro de trabajo. El centro de coste es solo para el reparto interno y no afecta la base.</li>
    <li>Las <b>licencias remuneradas</b>, <b>incapacidades</b> y <b>vacaciones</b> no reducen los días de la prima.</li>
    <li>Las <b>ausencias injustificadas</b> y las <b>licencias no remuneradas</b> sí reducen los días computados.</li>
  </ul>`;

  const css = `@page{size:A4 portrait;margin:0}*{margin:0;padding:0;box-sizing:border-box}body{font-family:'DM Sans',Helvetica,Arial,sans-serif;background:#e5e5e5;padding:20px 0}#content{background:#fff;width:794px;margin:0 auto;padding:35px 45px;font-size:9.5pt;color:#111;line-height:1.45;box-shadow:0 0 8px rgba(0,0,0,.15)}.hdr{border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:14px;overflow:hidden}.hdr .l{float:left}.hdr .r{float:right;text-align:right;font-size:8.5pt;color:#666;padding-top:6px}.hdr img{height:40px}h1{font-size:15pt;margin:16px 0 3px;text-align:center;letter-spacing:.4px}.sub{text-align:center;font-size:8.5pt;color:#666;margin-bottom:8px}.forwho{text-align:center;font-size:8pt;color:#555;font-weight:600;margin-bottom:16px}.cols{display:flex;gap:16px;margin-bottom:10px}.col{flex:1;border:1px solid #eee;border-radius:4px;padding:9px 13px;font-size:9pt;color:#555}.ct{font-size:7pt;font-weight:700;color:#111;letter-spacing:.5px;margin-bottom:4px}.col b{color:#111}.contrato{font-size:8.5pt;color:#555;margin-bottom:6px}.contrato b{color:#111}h2{font-size:10.5pt;color:#111;font-weight:700;margin:18px 0 8px;border-bottom:1px solid #ccc;padding-bottom:3px}.kv{display:flex;justify-content:space-between;padding:5px 8px;font-size:9.5pt;border-bottom:1px solid #f2f2f2;color:#555}.kv .v{font-family:'DM Mono','SF Mono',Menlo,monospace;color:#111}.kv.tot{border-top:1.5px solid #111;border-bottom:none;font-weight:700;color:#111}.kv.tot .v{font-weight:700}.mini{font-size:7.5pt;color:#999;margin:4px 0 6px}table{width:100%;border-collapse:collapse;margin:6px 0;font-size:9pt}th{padding:6px 8px;text-align:left;font-weight:700;font-size:7.5pt;color:#666;text-transform:uppercase;letter-spacing:.4px;border-bottom:1.5px solid #111}td{padding:6px 8px;border-bottom:1px solid #f0f0f0;color:#333}.c{text-align:center}th.c{text-align:center}.ttot td{border-top:1.5px solid #111;border-bottom:none;font-weight:700;color:#111}.estbox{display:flex;justify-content:space-between;align-items:center;border:1.5px solid #111;padding:14px 20px;border-radius:5px;margin-top:14px}.estlabel{font-size:11pt;font-weight:700;color:#111}.estform{font-size:8pt;color:#666;margin-top:2px}.estv{font-size:22pt;font-weight:700;color:#111;font-family:'DM Mono','SF Mono',Menlo,monospace}.estnote{font-size:8pt;color:#444;border:1px solid #ddd;border-left:3px solid #111;border-radius:4px;padding:8px 12px;margin-top:8px;line-height:1.5}.crit{margin:4px 0 0 16px;font-size:8.5pt;color:#555;line-height:1.6}.crit li{margin-bottom:3px}.crit b{color:#111}.foot{font-size:7pt;color:#999;text-align:center;margin-top:18px}.np{text-align:center;margin:16px auto;max-width:794px}.btn{background:#111;color:#fff;border:none;padding:10px 24px;border-radius:4px;cursor:pointer;font-size:11pt;font-weight:600;margin:0 4px}@page{size:A4 portrait;margin:0}table,tr,thead{page-break-inside:avoid;break-inside:avoid}h1,h2{page-break-after:avoid;break-after:avoid}.kv,.estbox,.cols,.estnote{page-break-inside:avoid;break-inside:avoid}@media print{html,body{background:#fff;margin:0;padding:0;width:210mm}.np{display:none}#content{width:210mm;max-width:none;margin:0;padding:14mm 14mm;box-shadow:none;box-sizing:border-box}}`;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"><title>${fileName}</title><script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"><\/script><script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"><\/script><style>${css}</style></head><body><div id="content"><div class="hdr"><div class="l"><img src="${HAB_LOGO}" alt="${leg.legalName||"Habitaris"}"/></div><div class="r"><div style="font-weight:600;color:#111">${leg.legalName||""}</div><div>NIT: ${leg.taxId||""}</div></div></div>${bodyHtml}<div class="foot">Documento generado por Habitaris Suite — ${fileName} · ${new Date().toLocaleDateString(loc)}</div></div><div class="np"><div id="np-info" style="font-size:9pt;color:#888;margin-bottom:10px">Tamaño: A4 · 210mm × 297mm</div><button class="btn" onclick="(function(){var el=document.getElementById('content');var info=document.getElementById('np-info');el.style.boxShadow='none';document.querySelector('.np').style.display='none';html2canvas(el,{scale:2,useCORS:true,backgroundColor:'#fff'}).then(function(c){var img=c.toDataURL('image/jpeg',0.98);var pdf=new jspdf.jsPDF({orientation:'portrait',unit:'mm',format:'a4'});var w=210,h=(c.height*w)/c.width,pageH=297;if(h<=pageH){pdf.addImage(img,'JPEG',0,0,w,h);}else{var yOff=0;while(yOff<h){pdf.addImage(img,'JPEG',0,-yOff,w,h);yOff+=pageH;if(yOff<h)pdf.addPage('a4','portrait');}}pdf.save('${fileName}.pdf');el.style.boxShadow='0 0 8px rgba(0,0,0,.15)';document.querySelector('.np').style.display='';info.innerHTML='✅ PDF descargado (A4)';info.style.color='#166534';info.style.background='#F0FDF4';info.style.padding='6px 10px';info.style.borderRadius='4px';})})()">📥 Descargar PDF en A4</button></div></body></html>`;

  return { fileName, html };
}

// Justificante de pago de la PRIMA para la trabajadora (estilo del justificante de anticipo/nómina:
// A5, cabecera estándar, total pagado y firma "recibí conforme"). Documento real para la empleada,
// distinto del informe estimado para contadores (buildPrimaHtml).
export function buildPrimaJustificanteHtml({ selN, prima, anio, refBancaria }) {
  const sem = prima.semestre;
  const semLabel = sem === 1 ? "1.º semestre (enero–junio)" : "2.º semestre (julio–diciembre)";
  const fechaPago = sem === 1 ? `30 de junio de ${anio}` : `20 de diciembre de ${anio}`;
  const a2 = String(anio).slice(-2);
  const ape = (selN.nombre||"").split(" ").slice(-2).join("-").toUpperCase();
  const fileName = `JUST-PRIMA-S${sem}${a2}-${ape}`;
  const leg = getActiveCompanyLegalDataSync();
  const loc = getTenantDefaultsSync().locale;

  const bodyHtml = `<h1>Justificante de pago — Prima de servicios</h1>
  <div class="sub">${semLabel} · ${anio}</div>
  <div class="info"><div><span>Nombre: </span><b>${selN.nombre}</b></div><div><span>Documento: </span><b>${selN.cc}</b></div><div><span>Cargo: </span>${selN.cargo}</div><div><span>Contrato: </span>${selN.tipoContrato||"fijo"}</div><div><span>Período: </span><b>${semLabel}</b></div><div><span>Fecha de pago: </span><b>${fechaPago}</b></div><div><span>Medio de pago: </span><b>${medioPago(selN)}</b></div></div>
  <table><tbody><tr class="liq"><td>Prima de servicios pagada</td><td class="r"></td><td class="r">${fmt(prima.prima)}</td></tr></tbody></table>
  ${refBancaria?`<div style="font-size:8pt;color:#444;border:1px solid #ddd;border-left:3px solid #111;border-radius:3px;padding:6px 10px;margin:8px 0">Pagado con referencia: <b>${refBancaria}</b></div>`:""}
  <div style="font-size:7pt;color:#999;margin:10px 0">Art. 306 CST. Prima de servicios proporcional al tiempo laborado en el semestre.</div>
  <div class="sig"><div><div class="line"></div><div class="name">${leg.legalName||""}</div><div class="role">Administración de personal</div></div><div><div class="line"></div><div class="name">${selN.nombre}</div><div class="role">Recibí conforme</div></div></div>`;

  const css = `@page{size:A5 portrait;margin:8mm}*{margin:0;padding:0;box-sizing:border-box}body{font-family:'DM Sans','Helvetica Neue',Helvetica,Arial,sans-serif;background:#e8e8e8;padding:20px 0}#content{background:#fff;width:560px;margin:0 auto;padding:40px 50px;font-size:8.5pt;color:#333;line-height:1.5;box-shadow:0 1px 4px rgba(0,0,0,.1)}.hdr{padding-bottom:12px;margin-bottom:16px;border-bottom:1px solid #ddd;overflow:hidden}.hdr .l{float:left}.hdr .r{float:right;text-align:right;font-size:7.5pt;color:#999;padding-top:12px}.hdr img{height:46px}h1{font-size:10pt;font-weight:600;text-align:center;margin:10px 0 4px;letter-spacing:.3px;clear:both}.sub{text-align:center;font-size:7.5pt;color:#999;margin-bottom:14px}.info{margin-bottom:14px;font-size:8pt;overflow:hidden;border:1px solid #eee;border-radius:3px;padding:8px 12px}.info div{float:left;width:50%;padding:2px 0;color:#555}.info span{color:#999}.info b{color:#333}table{width:100%;border-collapse:collapse;font-size:8pt;clear:both;margin-bottom:4px}td{padding:4px 8px;border-bottom:1px solid #f2f2f2;color:#444}.r{text-align:right;font-family:'DM Mono','SF Mono',Menlo,monospace;font-size:8pt}.liq td{border-top:2px solid #333;border-bottom:none;font-weight:700;color:#111;padding:8px;font-size:9pt}.sig{margin-top:48px;overflow:hidden;padding:0 20px}.sig>div{float:left;width:44%;text-align:center}.sig>div:last-child{float:right}.sig .line{border-top:1px solid #999;margin-bottom:6px}.sig .name{font-size:8pt;font-weight:600;color:#333}.sig .role{font-size:7pt;color:#999;margin-top:1px}.foot{font-size:6pt;color:#bbb;text-align:center;margin-top:20px;clear:both;letter-spacing:.3px}.np{text-align:center;margin:16px auto;max-width:560px}.btn{background:#333;color:#fff;border:none;padding:8px 20px;border-radius:3px;cursor:pointer;font-size:10pt;font-weight:500;margin:0 4px;font-family:inherit}@media print{body{background:#fff;padding:0}.np{display:none}#content{width:100%;margin:0;padding:8mm 10mm;box-shadow:none}}`;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"><title>${fileName}</title><script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"><\/script><script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"><\/script><style>${css}</style></head><body><div id="content"><div class="hdr"><div class="l"><img src="${HAB_LOGO}" alt="${leg.legalName||"Habitaris"}"/></div><div class="r"><div style="font-weight:600;color:#111">${leg.legalName||""}</div><div>NIT: ${leg.taxId||""}</div></div></div>${bodyHtml}<div class="foot">Documento generado por Habitaris Suite — ${fileName} · ${new Date().toLocaleDateString(loc)}</div></div><div class="np"><button class="btn" onclick="(function(){var el=document.getElementById('content');document.querySelector('.np').style.display='none';el.style.boxShadow='none';html2canvas(el,{scale:2,useCORS:true,backgroundColor:'#fff'}).then(function(c){var img=c.toDataURL('image/jpeg',0.98);var pdf=new jspdf.jsPDF({orientation:'portrait',unit:'mm',format:[148,210]});var w=148,h=(c.height*w)/c.width,pageH=210;if(h<=pageH){pdf.addImage(img,'JPEG',0,0,w,h);}else{var yOff=0;while(yOff<h){pdf.addImage(img,'JPEG',0,-yOff,w,h);yOff+=pageH;if(yOff<h)pdf.addPage([148,210],'portrait');}}pdf.save('${fileName}.pdf');el.style.boxShadow='0 1px 4px rgba(0,0,0,.1)';document.querySelector('.np').style.display='';})})()">📥 Descargar PDF en A5</button></div></body></html>`;

  return { fileName, html };
}
