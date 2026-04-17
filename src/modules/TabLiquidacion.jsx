import React, { useState, useEffect, useMemo } from "react";
import { HAB_LOGO } from "./habLogo.js";
import { downloadPDF } from "./pdfUtil.js";

const SMLMV = 1_750_905, AUX_TR = 249_095;
const fmt = n => n == null || isNaN(n) ? "$0" : "$" + Math.round(n).toLocaleString("es-CO");
const T = {
  ink:"#1A1A19",inkMid:"#6B6B69",inkLight:"#9B9B99",
  border:"#E5E3DE",surface:"#FAFAF8",card:"#FFFFFF",
  green:"#1E6B42",greenBg:"#E8F4EE",
  blue:"#2563eb",blueBg:"#EFF6FF",
  amber:"#D97706",amberBg:"#FFFBEB",
  red:"#dc2626",redBg:"#FEF2F2",
};

const TIPOS_TERMINACION = [
  { id:"renuncia", label:"Renuncia voluntaria", icon:"📝", color:T.blue, indemniza:false },
  { id:"vencimiento", label:"Terminación de contrato (vencimiento)", icon:"📅", color:T.amber, indemniza:false },
  { id:"justa_causa", label:"Despido con justa causa", icon:"⚖️", color:T.amber, indemniza:false },
  { id:"sin_justa", label:"Despido sin justa causa", icon:"🚨", color:T.red, indemniza:true },
];

function calcLiquidacion(emp, tipo, fechaSalida) {
  const sal = emp.salario_base || 0;
  const aux = (sal <= 2*SMLMV) ? (emp.auxilio_transporte || AUX_TR) : 0;
  const bono = emp.bono_no_salarial || 0;
  const fechaIni = new Date((emp.fecha_inicio||"2026-01-01")+"T12:00:00");
  const fechaFin = new Date(fechaSalida+"T12:00:00");
  const durMeses = emp.duracion_meses || 0;
  const isFijo = (emp.tipo_contrato||"").toLowerCase().includes("fijo") || durMeses > 0;

  // Días trabajados totales
  const msTrab = fechaFin - fechaIni;
  const diasTotales = Math.max(1, Math.floor(msTrab / 86400000) + 1);

  // Días trabajados en el último mes
  const diaDelMes = fechaFin.getDate();

  // Días trabajados en el semestre actual (para prima)
  const inicioSem = fechaFin.getMonth() < 6
    ? new Date(fechaFin.getFullYear(), 0, 1)
    : new Date(fechaFin.getFullYear(), 6, 1);
  const diasSem = Math.max(1, Math.floor((fechaFin - Math.max(inicioSem, fechaIni)) / 86400000) + 1);

  // Años trabajados (fracción)
  const aniosTrab = diasTotales / 365;

  // 1. Salario pendiente (días del último mes)
  const salPendiente = Math.round((sal / 30) * diaDelMes);

  // 2. Vacaciones no disfrutadas = (sal × diasTotales) / 720
  const vacaciones = Math.round((sal * diasTotales) / 720);

  // 3. Prima proporcional = ((sal + aux) × diasSem) / 360
  const prima = Math.round(((sal + aux) * diasSem) / 360);

  // 4. Cesantías proporcionales = ((sal + aux) × diasTotales) / 360
  const cesantias = Math.round(((sal + aux) * diasTotales) / 360);

  // 5. Intereses sobre cesantías = cesantías × diasTotales × 12% / 360
  const intCes = Math.round((cesantias * diasTotales * 0.12) / 360);

  // 6. Indemnización (solo sin justa causa)
  let indemnizacion = 0;
  if (tipo === "sin_justa") {
    if (isFijo) {
      // Término fijo: salarios por el tiempo restante del contrato
      const fechaFinContrato = new Date(fechaIni.getFullYear(), fechaIni.getMonth() + durMeses, fechaIni.getDate() - 1);
      const diasRestantes = Math.max(0, Math.floor((fechaFinContrato - fechaFin) / 86400000));
      indemnizacion = Math.round((sal / 30) * Math.max(15, diasRestantes));
    } else {
      // Indefinido
      const salDia = sal / 30;
      if (sal <= 10 * SMLMV) {
        // ≤ 10 SMLMV: 30 días primer año + 20 días por año adicional
        const aniosCompletos = Math.floor(aniosTrab);
        const fraccion = aniosTrab - aniosCompletos;
        if (aniosCompletos < 1) {
          indemnizacion = Math.round(30 * salDia * aniosTrab);
        } else {
          indemnizacion = Math.round(30 * salDia + (aniosCompletos - 1 + fraccion) * 20 * salDia);
        }
      } else {
        // > 10 SMLMV: 20 días primer año + 15 días por año adicional
        const aniosCompletos = Math.floor(aniosTrab);
        const fraccion = aniosTrab - aniosCompletos;
        if (aniosCompletos < 1) {
          indemnizacion = Math.round(20 * salDia * aniosTrab);
        } else {
          indemnizacion = Math.round(20 * salDia + (aniosCompletos - 1 + fraccion) * 15 * salDia);
        }
      }
    }
  }

  const subtotal = salPendiente + vacaciones + prima + cesantias + intCes;
  const total = subtotal + indemnizacion;

  return {
    sal, aux, bono, fechaIni, fechaFin, diasTotales, diaDelMes, diasSem, aniosTrab, isFijo, durMeses,
    salPendiente, vacaciones, prima, cesantias, intCes, indemnizacion, subtotal, total,
    items: [
      { concepto:"Salario pendiente ("+diaDelMes+" días)", valor:salPendiente, norma:"Art. 65 CST" },
      { concepto:"Vacaciones no disfrutadas", valor:vacaciones, norma:"Art. 186 CST — "+diasTotales+"d/720" },
      { concepto:"Prima de servicios proporcional", valor:prima, norma:"Art. 306 CST — "+diasSem+"d semestre" },
      { concepto:"Cesantías proporcionales", valor:cesantias, norma:"Art. 249 CST — "+diasTotales+"d/360" },
      { concepto:"Intereses sobre cesantías", valor:intCes, norma:"Ley 52/1975 — 12% anual" },
      ...(indemnizacion > 0 ? [{ concepto:"Indemnización por despido sin justa causa", valor:indemnizacion, norma:isFijo?"Art. 64 CST — término fijo":"Art. 64 CST — indefinido" }] : []),
    ]
  };
}

function Card({children, style, accent}) {
  return <div style={{background:T.card,border:`1px solid ${accent||T.border}`,borderRadius:8,padding:"16px 18px",...style}}>{children}</div>;
}

function genCertificacionHTML(emp, conSalario) {
  const hoy = new Date().toLocaleDateString("es-CO",{day:"numeric",month:"long",year:"numeric"});
  return `<style>
*{margin:0;padding:0;box-sizing:border-box;font-family:Helvetica,Arial,sans-serif}
.hdr{border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:20px;overflow:hidden}
.hdr .l{float:left}.hdr .r{float:right;text-align:right;font-size:8pt;color:#666;padding-top:6px}
.hdr img{height:36px}
h1{font-size:13pt;text-align:center;margin:20px 0 16px}
.body{font-size:10.5pt;line-height:1.7;text-align:justify;margin-bottom:16px}
.sig{margin-top:50px;width:50%}.sig div{border-top:1px solid #111;padding-top:6px;font-size:9pt}
.foot{font-size:6.5pt;color:#999;text-align:center;margin-top:30px;clear:both}
</style>
<div class="hdr"><div class="l"><img src="${HAB_LOGO}" alt="Habitaris"/></div><div class="r"><div style="font-weight:600;color:#111">Habitaris S.A.S</div><div>NIT: 901.922.136-8</div></div></div>
<h1>CERTIFICACIÓN LABORAL</h1>
<div class="body">
<p>El suscrito representante legal de <b>HABITARIS S.A.S</b>, identificada con NIT 901.922.136-8, certifica que:</p>
<br/>
<p><b>${emp.candidato_nombre||""}</b>, identificado(a) con ${emp.tipo_documento||"C.C."} No. <b>${emp.candidato_cc||""}</b>, ${emp.fecha_inicio?"labora":"laboró"} en esta empresa desde el <b>${emp.fecha_inicio ? new Date(emp.fecha_inicio+"T12:00:00").toLocaleDateString("es-CO",{day:"numeric",month:"long",year:"numeric"}) : "—"}</b>, desempeñando el cargo de <b>${emp.cargo||""}</b> en el área <b>${emp.area||"Administrativa"}</b>.</p>
<br/>
${conSalario ? `<p>El trabajador devenga un salario mensual de <b>${fmt(emp.salario_base)}</b> (${(emp.salario_base||0)<=2*SMLMV ? "más auxilio de transporte de "+fmt(emp.auxilio_transporte||AUX_TR) : "salario integral"}).</p><br/>` : ""}
<p>La presente certificación se expide a solicitud del interesado, en Bogotá D.C., a los ${hoy}.</p>
<br/><br/>
</div>
<div class="sig">
<div><br/><b>Representante Legal</b><br/>Habitaris S.A.S<br/>NIT: 901.922.136-8</div>
</div>
<div class="foot">Habitaris Suite · ${hoy} · CERT-${(emp.candidato_cc||"").slice(-4)}</div>`;
}

function genCartaTerminacion(emp, tipo, liq) {
  const hoy = new Date().toLocaleDateString("es-CO",{day:"numeric",month:"long",year:"numeric"});
  const tipoInfo = TIPOS_TERMINACION.find(t=>t.id===tipo);
  const motivo = tipo==="renuncia" ? "por renuncia voluntaria del trabajador" : tipo==="vencimiento" ? "por vencimiento del término fijo pactado" : tipo==="justa_causa" ? "por despido con justa causa" : "por decisión unilateral del empleador sin justa causa";
  return `<style>
*{margin:0;padding:0;box-sizing:border-box;font-family:Helvetica,Arial,sans-serif}
.hdr{border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:20px;overflow:hidden}
.hdr .l{float:left}.hdr .r{float:right;text-align:right;font-size:8pt;color:#666;padding-top:6px}
.hdr img{height:36px}
h1{font-size:12pt;text-align:center;margin:16px 0 12px}
.body{font-size:10pt;line-height:1.7;text-align:justify}
table{width:100%;border-collapse:collapse;margin:12px 0;font-size:9.5pt}
th{background:#111;color:#fff;text-align:left;padding:5px 8px;font-size:8pt;text-transform:uppercase}
td{padding:4px 8px;border-bottom:1px solid #ddd}.r{text-align:right;font-family:monospace}
.tot td{border-top:2px solid #111;font-weight:700;font-size:10pt}
.sig{margin-top:40px;overflow:hidden}.sig div{float:left;width:48%;text-align:center;font-size:8pt;border-top:1px solid #111;padding-top:6px}.sig div:last-child{float:right}
.foot{font-size:6.5pt;color:#999;text-align:center;margin-top:20px;clear:both}
</style>
<div class="hdr"><div class="l"><img src="${HAB_LOGO}" alt="Habitaris"/></div><div class="r"><div style="font-weight:600;color:#111">Habitaris S.A.S</div><div>NIT: 901.922.136-8</div></div></div>
<h1>CARTA DE TERMINACIÓN DE CONTRATO</h1>
<div class="body">
<p>Bogotá D.C., ${hoy}</p><br/>
<p>Señor(a)<br/><b>${emp.candidato_nombre}</b><br/>${emp.tipo_documento||"C.C."} ${emp.candidato_cc}</p><br/>
<p>Ref: Terminación de contrato de trabajo</p><br/>
<p>Por medio de la presente, le comunicamos que su contrato de trabajo con <b>HABITARIS S.A.S</b> ha sido terminado <b>${motivo}</b>, con fecha efectiva <b>${liq.fechaFin.toLocaleDateString("es-CO",{day:"numeric",month:"long",year:"numeric"})}</b>.</p><br/>
<p>Datos del contrato:</p>
<p>- Cargo: <b>${emp.cargo}</b></p>
<p>- Fecha de ingreso: <b>${liq.fechaIni.toLocaleDateString("es-CO",{day:"numeric",month:"long",year:"numeric"})}</b></p>
<p>- Días trabajados: <b>${liq.diasTotales}</b></p>
<p>- Salario base: <b>${fmt(liq.sal)}</b></p><br/>
<p>A continuación se detalla la liquidación final de prestaciones sociales:</p>
</div>
<table><thead><tr><th>Concepto</th><th class="r">Valor</th><th>Base legal</th></tr></thead><tbody>
${liq.items.map(i=>"<tr><td>"+i.concepto+"</td><td class='r'>"+fmt(i.valor)+"</td><td style='font-size:8pt;color:#666'>"+i.norma+"</td></tr>").join("")}
<tr class="tot"><td>TOTAL A PAGAR</td><td class="r">${fmt(liq.total)}</td><td></td></tr>
</tbody></table>
<div class="body"><p>El valor total de la liquidación será consignado en la cuenta registrada del trabajador.</p></div>
<div class="sig"><div>Empleador<br/><b>Habitaris S.A.S</b><br/>NIT: 901.922.136-8</div><div>Trabajador<br/><b>${emp.candidato_nombre}</b><br/>${emp.tipo_documento||"C.C."} ${emp.candidato_cc}</div></div>
<div class="foot">Habitaris Suite · ${hoy} · LIQ-${(emp.candidato_cc||"").slice(-4)}</div>`;
}

function genPazYSalvo(emp, liq) {
  const hoy = new Date().toLocaleDateString("es-CO",{day:"numeric",month:"long",year:"numeric"});
  return `<style>
*{margin:0;padding:0;box-sizing:border-box;font-family:Helvetica,Arial,sans-serif}
.hdr{border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:20px;overflow:hidden}
.hdr .l{float:left}.hdr .r{float:right;text-align:right;font-size:8pt;color:#666;padding-top:6px}
.hdr img{height:36px}
h1{font-size:13pt;text-align:center;margin:20px 0 16px}
.body{font-size:10.5pt;line-height:1.7;text-align:justify}
.checks{margin:16px 0;font-size:10pt;line-height:2}
.sig{margin-top:50px;overflow:hidden}.sig div{float:left;width:48%;text-align:center;font-size:8pt;border-top:1px solid #111;padding-top:6px}.sig div:last-child{float:right}
.foot{font-size:6.5pt;color:#999;text-align:center;margin-top:20px;clear:both}
</style>
<div class="hdr"><div class="l"><img src="${HAB_LOGO}" alt="Habitaris"/></div><div class="r"><div style="font-weight:600;color:#111">Habitaris S.A.S</div><div>NIT: 901.922.136-8</div></div></div>
<h1>PAZ Y SALVO</h1>
<div class="body">
<p><b>HABITARIS S.A.S</b>, NIT 901.922.136-8, certifica que el(la) señor(a) <b>${emp.candidato_nombre}</b>, identificado(a) con ${emp.tipo_documento||"C.C."} No. <b>${emp.candidato_cc}</b>, quien laboró en el cargo de <b>${emp.cargo}</b> desde el ${liq.fechaIni.toLocaleDateString("es-CO",{day:"numeric",month:"long",year:"numeric"})} hasta el ${liq.fechaFin.toLocaleDateString("es-CO",{day:"numeric",month:"long",year:"numeric"})}, se encuentra a <b>PAZ Y SALVO</b> con la empresa por los siguientes conceptos:</p>
</div>
<div class="checks">
<p>☑ Salarios y prestaciones sociales</p>
<p>☑ Liquidación final de contrato</p>
<p>☑ Vacaciones</p>
<p>☑ Dotación y herramientas de trabajo</p>
<p>☑ Documentos y archivos de la empresa</p>
<p>☑ Llaves y accesos</p>
<p>☑ Obligaciones derivadas de cláusulas contractuales</p>
</div>
<div class="body">
<p>Se expide el presente paz y salvo en Bogotá D.C., a los ${hoy}.</p>
</div>
<div class="sig"><div>Empleador<br/><b>Habitaris S.A.S</b><br/>NIT: 901.922.136-8</div><div>Trabajador<br/><b>${emp.candidato_nombre}</b><br/>${emp.tipo_documento||"C.C."} ${emp.candidato_cc}</div></div>
<div class="foot">Habitaris Suite · ${hoy} · PYS-${(emp.candidato_cc||"").slice(-4)}</div>`;
}

export default function TabLiquidacion() {
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selEmp, setSelEmp] = useState(null);
  const [tipo, setTipo] = useState("renuncia");
  const [fechaSalida, setFechaSalida] = useState(new Date().toISOString().split("T")[0]);

  useEffect(()=>{
    (async()=>{
      try {
        const results = [];
        for(const est of ["firmado","afiliaciones","completado"]) {
          const r = await fetch("/api/hiring?estado="+est);
          const d = await r.json();
          if(d.ok && Array.isArray(d.data)) results.push(...d.data);
        }
        setEmpleados(results);
      } catch(e) { console.error(e); }
      setLoading(false);
    })();
  },[]);

  const emp = empleados.find(e=>e.id===selEmp);
  const liq = emp ? calcLiquidacion(emp, tipo, fechaSalida) : null;

  return (
    <div style={{fontFamily:"'DM Sans',sans-serif",color:T.ink}}>
      <div style={{fontSize:18,fontWeight:800,marginBottom:4}}>Liquidación Final y Documentos</div>
      <div style={{fontSize:11,color:T.inkLight,marginBottom:16}}>Cálculo de prestaciones según tipo de terminación · Genera carta, paz y salvo, y certificación laboral</div>

      {loading && <div style={{textAlign:"center",padding:32,color:T.inkLight}}>Cargando empleados...</div>}

      {!loading && (
        <div style={{display:"grid",gridTemplateColumns:"300px 1fr",gap:16}}>
          {/* Panel izquierdo: selector empleado + tipo + fecha */}
          <div>
            <Card style={{marginBottom:12}}>
              <div style={{fontSize:10,fontWeight:700,color:T.inkLight,letterSpacing:.8,textTransform:"uppercase",marginBottom:8}}>Empleado</div>
              {empleados.map(e=>(
                <div key={e.id} onClick={()=>setSelEmp(e.id)} style={{
                  padding:"8px 10px",borderRadius:6,marginBottom:4,cursor:"pointer",
                  background:selEmp===e.id?T.greenBg:T.surface,
                  border:`1px solid ${selEmp===e.id?T.green:T.border}`,
                  fontSize:11
                }}>
                  <div style={{fontWeight:600}}>{e.candidato_nombre||"Sin nombre"}</div>
                  <div style={{fontSize:10,color:T.inkLight}}>{e.cargo} · {e.tipo_contrato||"fijo"}</div>
                </div>
              ))}
              {empleados.length===0 && <div style={{fontSize:11,color:T.inkLight,padding:8}}>Sin empleados activos</div>}
            </Card>

            {emp && (
              <Card style={{marginBottom:12}}>
                <div style={{fontSize:10,fontWeight:700,color:T.inkLight,letterSpacing:.8,textTransform:"uppercase",marginBottom:8}}>Tipo de terminación</div>
                {TIPOS_TERMINACION.map(t=>(
                  <div key={t.id} onClick={()=>setTipo(t.id)} style={{
                    padding:"8px 10px",borderRadius:6,marginBottom:4,cursor:"pointer",
                    background:tipo===t.id?(t.color+"15"):T.surface,
                    border:`1px solid ${tipo===t.id?t.color:T.border}`,
                    fontSize:11
                  }}>
                    <span>{t.icon} {t.label}</span>
                    {t.indemniza && <span style={{fontSize:9,color:T.red,marginLeft:4,fontWeight:600}}>+ Indemnización</span>}
                  </div>
                ))}

                <div style={{marginTop:12}}>
                  <div style={{fontSize:10,fontWeight:700,color:T.inkLight,letterSpacing:.8,textTransform:"uppercase",marginBottom:4}}>Fecha de salida</div>
                  <input type="date" value={fechaSalida} onChange={e=>setFechaSalida(e.target.value)} style={{
                    width:"100%",padding:"6px 10px",border:`1px solid ${T.border}`,borderRadius:6,
                    fontSize:12,fontFamily:"'DM Sans',sans-serif"
                  }}/>
                </div>
              </Card>
            )}

            {emp && (
              <Card>
                <div style={{fontSize:10,fontWeight:700,color:T.inkLight,letterSpacing:.8,textTransform:"uppercase",marginBottom:8}}>Documentos</div>
                <button onClick={async()=>{
                  const ape=(emp.candidato_nombre||"").split(" ").slice(-2).join("-").toUpperCase();
                  await downloadPDF(genCartaTerminacion(emp, tipo, liq), `CARTA-TERM-${ape}`, "a4");
                }} style={{width:"100%",padding:"8px 10px",fontSize:11,fontWeight:600,border:`1px solid ${T.ink}`,borderRadius:6,background:T.surface,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",color:T.ink,marginBottom:6,textAlign:"left"}}>📄 Carta de terminación + Liquidación</button>

                <button onClick={async()=>{
                  const ape=(emp.candidato_nombre||"").split(" ").slice(-2).join("-").toUpperCase();
                  await downloadPDF(genPazYSalvo(emp, liq), `PAZ-Y-SALVO-${ape}`, "a4");
                }} style={{width:"100%",padding:"8px 10px",fontSize:11,fontWeight:600,border:`1px solid ${T.green}`,borderRadius:6,background:T.greenBg,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",color:T.green,marginBottom:6,textAlign:"left"}}>✅ Paz y salvo</button>

                <button onClick={async()=>{
                  const ape=(emp.candidato_nombre||"").split(" ").slice(-2).join("-").toUpperCase();
                  await downloadPDF(genCertificacionHTML(emp, true), `CERT-LAB-${ape}`, "a4");
                }} style={{width:"100%",padding:"8px 10px",fontSize:11,fontWeight:600,border:`1px solid ${T.blue}`,borderRadius:6,background:T.blueBg,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",color:T.blue,marginBottom:6,textAlign:"left"}}>📋 Certificación laboral (con salario)</button>

                <button onClick={async()=>{
                  const ape=(emp.candidato_nombre||"").split(" ").slice(-2).join("-").toUpperCase();
                  await downloadPDF(genCertificacionHTML(emp, false), `CERT-LAB-${ape}`, "a4");
                }} style={{width:"100%",padding:"8px 10px",fontSize:11,fontWeight:600,border:`1px solid ${T.border}`,borderRadius:6,background:T.surface,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",color:T.inkMid,textAlign:"left"}}>📋 Certificación laboral (sin salario)</button>
              </Card>
            )}
          </div>

          {/* Panel derecho: cálculos */}
          <div>
            {!emp && (
              <Card style={{textAlign:"center",padding:"60px 40px"}}>
                <div style={{fontSize:40,marginBottom:12}}>👈</div>
                <div style={{fontSize:14,fontWeight:600,color:T.inkMid}}>Selecciona un empleado para calcular su liquidación</div>
              </Card>
            )}

            {emp && liq && (
              <div>
                {/* Info empleado */}
                <Card style={{marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div>
                      <div style={{fontSize:16,fontWeight:700}}>{emp.candidato_nombre}</div>
                      <div style={{fontSize:11,color:T.inkLight}}>{emp.cargo} · CC {emp.candidato_cc} · {emp.tipo_contrato||"fijo"} {liq.durMeses?liq.durMeses+"m":""}</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:11,color:T.inkLight}}>Ingreso: {liq.fechaIni.toLocaleDateString("es-CO",{day:"numeric",month:"short",year:"numeric"})}</div>
                      <div style={{fontSize:11,color:T.inkLight}}>Salida: {liq.fechaFin.toLocaleDateString("es-CO",{day:"numeric",month:"short",year:"numeric"})}</div>
                      <div style={{fontSize:11,fontWeight:600}}>{liq.diasTotales} días trabajados ({(liq.aniosTrab).toFixed(1)} años)</div>
                    </div>
                  </div>
                </Card>

                {/* KPIs */}
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:12}}>
                  {[
                    ["Salario base",fmt(liq.sal),T.ink],
                    ["Aux. transporte",fmt(liq.aux),T.inkMid],
                    ["Tipo terminación",TIPOS_TERMINACION.find(t=>t.id===tipo)?.icon+" "+TIPOS_TERMINACION.find(t=>t.id===tipo)?.label.split(" ")[0],TIPOS_TERMINACION.find(t=>t.id===tipo)?.color],
                    ["TOTAL LIQUIDACIÓN",fmt(liq.total),T.green],
                  ].map(([l,v,c])=>(
                    <div key={l} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:6,padding:"10px 12px",textAlign:"center"}}>
                      <div style={{fontSize:8,fontWeight:700,color:T.inkLight,textTransform:"uppercase",letterSpacing:.8}}>{l}</div>
                      <div style={{fontSize:l==="TOTAL LIQUIDACIÓN"?18:14,fontWeight:800,color:c,fontFamily:l.includes("Tipo")?"'DM Sans'":"'DM Mono',monospace"}}>{v}</div>
                    </div>
                  ))}
                </div>

                {/* Tabla desglose */}
                <Card>
                  <div style={{fontSize:13,fontWeight:700,marginBottom:10}}>Desglose de la liquidación</div>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                    <thead>
                      <tr style={{borderBottom:`2px solid ${T.ink}`}}>
                        <th style={{padding:"6px 10px",textAlign:"left",fontSize:9,fontWeight:700,color:T.inkLight,letterSpacing:.8,textTransform:"uppercase"}}>Concepto</th>
                        <th style={{padding:"6px 10px",textAlign:"right",fontSize:9,fontWeight:700,color:T.inkLight,letterSpacing:.8,textTransform:"uppercase"}}>Valor</th>
                        <th style={{padding:"6px 10px",textAlign:"left",fontSize:9,fontWeight:700,color:T.inkLight,letterSpacing:.8,textTransform:"uppercase"}}>Base legal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {liq.items.map((item,i)=>(
                        <tr key={i} style={{borderBottom:`1px solid ${T.border}`,background:item.concepto.includes("Indemnización")?T.redBg:"transparent"}}>
                          <td style={{padding:"6px 10px",fontSize:12}}>{item.concepto}</td>
                          <td style={{padding:"6px 10px",textAlign:"right",fontFamily:"'DM Mono',monospace",fontWeight:600,fontSize:13}}>{fmt(item.valor)}</td>
                          <td style={{padding:"6px 10px",fontSize:10,color:T.inkMid}}>{item.norma}</td>
                        </tr>
                      ))}
                      <tr style={{borderTop:`2px solid ${T.ink}`,background:T.greenBg}}>
                        <td style={{padding:"8px 10px",fontSize:14,fontWeight:800}}>TOTAL A PAGAR</td>
                        <td style={{padding:"8px 10px",textAlign:"right",fontFamily:"'DM Mono',monospace",fontWeight:800,fontSize:18,color:T.green}}>{fmt(liq.total)}</td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Fórmulas de auditoría */}
                  <div style={{marginTop:16,padding:"12px 14px",background:T.surface,borderRadius:6,fontSize:10,color:T.inkMid,lineHeight:1.6}}>
                    <div style={{fontWeight:700,fontSize:11,color:T.ink,marginBottom:4}}>📐 Fórmulas aplicadas</div>
                    <div>Vacaciones = Salario × {liq.diasTotales}d ÷ 720 = {fmt(liq.vacaciones)}</div>
                    <div>Prima = (Sal+Aux) × {liq.diasSem}d semestre ÷ 360 = {fmt(liq.prima)}</div>
                    <div>Cesantías = (Sal+Aux) × {liq.diasTotales}d ÷ 360 = {fmt(liq.cesantias)}</div>
                    <div>Int. cesantías = {fmt(liq.cesantias)} × {liq.diasTotales}d × 12% ÷ 360 = {fmt(liq.intCes)}</div>
                    {liq.indemnizacion>0 && <div style={{color:T.red,fontWeight:600}}>Indemnización ({liq.isFijo?"término fijo":"indefinido"}) = {fmt(liq.indemnizacion)}</div>}
                  </div>
                </Card>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
