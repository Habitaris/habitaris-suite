import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { HAB_LOGO } from "./habLogo.js";
import {  getTenantUrlsSync, getTenantIdentitySync, getLegalConstantsSync, getActiveCompanyLegalDataSync } from "../core/configHelpers.js";
import { downloadPDF } from "./pdfUtil.js";
import { buildNominaHtml, buildPrimaHtml, buildPrimaJustificanteHtml } from "./nominaHtml.js";
import { BannerPagos } from "./BannerPagos.jsx";
import { condicionVigente } from "./condicionesHelper.js";
import DashboardTrabajadorAnio from "./DashboardTrabajadorAnio.jsx";
import HistorialCondiciones from "./HistorialCondiciones.jsx";
import { openReport, openFileViewer } from "./reportModal.js";
import { getTenantDefaultsSync } from "../core/configHelpers.js";

// Sprint C Capa 3 paso 7: catálogos legales desde country_configs (BD prioritaria con fallback al hardcoded 2026).
// Si en BD se cambia el SMLMV, hay que recargar la página para que estos valores se actualicen (constantes evaluadas al cargar el módulo).
const __LC_NOM = getLegalConstantsSync("CO");
const SMLMV = __LC_NOM.smlmv ?? 1_750_905, AUX_TR = __LC_NOM.aux_transporte ?? 249_095, UVT = __LC_NOM.uvt ?? 49_799;
const ARL_OPTS = [
  { n:"I", t:0.00522, lbl:"I — Mínimo" }, { n:"II", t:0.01044, lbl:"II — Bajo" },
  { n:"III", t:0.02436, lbl:"III — Medio" }, { n:"IV", t:0.04350, lbl:"IV — Alto" },
  { n:"V", t:0.06960, lbl:"V — Máximo" },
];
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DL_SHORT = ["L","M","X","J","V","S","D"];
// Festivos Colombia — cálculo dinámico con Easter
function easter(y){const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),mo=Math.floor((h+l-7*m+114)/31),da=((h+l-7*m+114)%31)+1;return new Date(y,mo-1,da)}
function nxtMon(d){const w=d.getDay();if(w===1)return new Date(d);return new Date(d.getFullYear(),d.getMonth(),d.getDate()+(w===0?1:8-w))}
function addD(d,n){return new Date(d.getFullYear(),d.getMonth(),d.getDate()+n)}
function getHolidays(y){const e=easter(y),h=[];const F=(m,d,n)=>h.push({date:new Date(y,m-1,d),name:n});const E=(m,d,n)=>{h.push({date:nxtMon(new Date(y,m-1,d)),name:n})};
F(1,1,"Año Nuevo");F(5,1,"Día Trabajo");F(7,20,"Independencia");F(8,7,"Boyacá");F(12,8,"Inmaculada");F(12,25,"Navidad");
h.push({date:addD(e,-3),name:"Jueves Santo"});h.push({date:addD(e,-2),name:"Viernes Santo"});
h.push({date:nxtMon(addD(e,39)),name:"Ascensión"});h.push({date:nxtMon(addD(e,60)),name:"Corpus Christi"});h.push({date:nxtMon(addD(e,68)),name:"Sagrado Corazón"});
E(1,6,"Reyes Magos");E(3,19,"San José");E(6,29,"San Pedro y Pablo");E(8,15,"Asunción");E(10,12,"Día Raza");E(11,1,"Todos Santos");E(11,11,"Indep. Cartagena");
return h}
function sameDay(a,b){return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();}

// Último día hábil <= fecha dada. Saltea sábado, domingo y festivos.
function ultimoDiaHabil(fecha, holidays){
  let d = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  for (let i = 0; i < 14; i++) {
    const dow = d.getDay();
    const esFestivo = holidays.some(h => sameDay(h.date, d));
    if (dow !== 0 && dow !== 6 && !esFestivo) return d;
    d = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);
  }
  return d;
}

// Etiqueta legible de una fecha: "vie 14 abr" o "hoy" o "mañana"
function lblFecha(fecha, hoy){
  if (sameDay(fecha, hoy)) return "hoy";
  const mañana = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()+1);
  if (sameDay(fecha, mañana)) return "mañana";
  return fecha.toLocaleDateString(getTenantDefaultsSync().locale,{weekday:"short",day:"numeric",month:"short"});
}

// Estado de alerta de una fecha objetivo. Devuelve {nivel, dias, msg} o null.
// nivel: "rojo" vencido/hoy/mañana, "amarillo" 2-3d, "azul" 4-14d, null >14d
// Rango amplio: el usuario ve el aviso ~2 semanas antes del pago para prepararse con tiempo.
function alertaPago(fechaObjetivo, hoy){
  const diffMs = fechaObjetivo - hoy;
  const dias = Math.floor(diffMs / (1000*60*60*24));
  if (dias < 0) return {nivel:"rojo", dias, msg:`Vencido hace ${-dias} día${-dias===1?"":"s"}`};
  if (dias === 0) return {nivel:"rojo", dias, msg:"Vence HOY"};
  if (dias === 1) return {nivel:"rojo", dias, msg:"Vence mañana"};
  if (dias <= 3) return {nivel:"amarillo", dias, msg:`Vence en ${dias} días`};
  if (dias <= 14) return {nivel:"azul", dias, msg:`Vence en ${dias} días`};
  return null;
}

// Novedad types for calendar
const NOV_TIPOS = [
  {id:"normal",label:"Normal",color:"transparent",icon:""},
  {id:"incapacidad",label:"Incapacidad",color:"#FEE2E2",icon:"🏥"},
  {id:"vacaciones",label:"Vacaciones",color:"#DBEAFE",icon:"🏖️"},
  {id:"licencia",label:"Licencia rem.",color:"#FEF3C7",icon:"📋"},
  {id:"licNoRem",label:"Lic. NO rem.",color:"#F3E8FF",icon:"⚠️"},
  {id:"ausencia",label:"Ausencia",color:"#FEE2E2",icon:"❌"},
];

// Paleta de 8 colores que se asigna deterministamente a cada OT por su id (hash mod 8).
// Así dos OTs distintas se ven con colores distintos en el calendario sin necesidad
// de almacenar un color por OT en BD (las OTs vienen de Centros de Trabajo).
const OT_COLORS = ["#DDD6FE","#FED7AA","#A7F3D0","#FBCFE8","#BFDBFE","#FDE68A","#C7D2FE","#FCA5A5"];
function colorForOT(otId){
  let h = 0;
  const s = String(otId || "");
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return OT_COLORS[Math.abs(h) % OT_COLORS.length];
}

const uid = () => Math.random().toString(36).slice(2, 10);
const fmt = n => n == null || isNaN(n) ? "$0" : "$" + Math.round(n).toLocaleString(getTenantDefaultsSync().locale);
const fPct = n => (n * 100).toFixed(2) + "%";
// Abre un archivo (data URI base64) en una pestaña nueva. Los navegadores bloquean abrir
// data: URIs grandes directamente con target=_blank (política anti-phishing), así que lo
// convertimos a un Blob URL, que sí se permite. Funciona para PDF e imágenes de cualquier tamaño.
const verArchivo = (dataUri, filename) => {
  try {
    if (!dataUri) return;
    // Abrir en el visor modal dentro de la app (no en pestaña nueva): obliga a Descargar o Cerrar.
    openFileViewer(dataUri, filename || "archivo");
  } catch (e) {
    window.toast && window.toast("No se pudo abrir el archivo", "error");
  }
};

async function fetchEmps(){try{
  const estados=["firmado","afiliaciones","completado"];
  const datas=await Promise.all(estados.map(est=>fetch("/api/hiring?estado="+est).then(r=>r.json()).catch(()=>({ok:false}))));
  const results=[];
  datas.forEach(d=>{if(d.ok&&Array.isArray(d.data))results.push(...d.data);});
  return results;
}catch{return[];}}
async function loadEmpMaestro(){try{const r=await fetch("/api/hiring?kv=rrhh:empleados&flat=1");const d=await r.json();return Array.isArray(d?.value)?d.value:(d?.value?JSON.parse(d.value):[])}catch(_){return[]}}
async function loadN(a,m){try{const r=await fetch("/api/hiring?kv=nomina&anio="+a+"&mes="+m);const d=await r.json();return d.ok?d.data:[];}catch{return[];}}
// Prima de servicios del semestre (Art. 306 CST). Recorre los meses del semestre del mesActual,
// cuenta por mes los días de vinculación menos las novedades que NO computan (ausencia injustificada
// y licencia no remunerada); incapacidad, vacaciones y licencia remunerada SÍ computan.
// base = salario + auxilio de transporte (si aplica). prima = base × díasTotal / 360.
async function calcPrimaSemestre(emp, anio, mesActual){
  const sal=emp.sal||0, aplA=sal<=2*SMLMV, aux=aplA?AUX_TR:0, base=sal+aux;
  const semStart=mesActual<=5?0:6;
  const fi=emp.fechaIngreso?new Date(emp.fechaIngreso+"T12:00:00"):null;
  const ff=emp.fechaFinContrato?new Date(emp.fechaFinContrato+"T12:00:00"):null;
  const meses=[];
  for(let m=semStart;m<=mesActual;m++){
    let diasVinc=30;
    if(fi){ if(fi.getFullYear()>anio||(fi.getFullYear()===anio&&fi.getMonth()>m)) diasVinc=0;
            else if(fi.getFullYear()===anio&&fi.getMonth()===m) diasVinc=30-(fi.getDate()-1); }
    if(ff){ if(ff.getFullYear()<anio||(ff.getFullYear()===anio&&ff.getMonth()<m)) diasVinc=0;
            else if(ff.getFullYear()===anio&&ff.getMonth()===m) diasVinc=Math.min(diasVinc,Math.min(30,ff.getDate())); }
    diasVinc=Math.max(0,diasVinc);
    let ausencias=0, licNoRem=0, incap=0, licRem=0, vac=0;
    if(diasVinc>0){
      const arr=await loadN(anio,m);
      const rec=(arr||[]).find(n=>n.empId===emp.empId);
      if(rec){ const vals=Object.values(rec.novDias||{});
        ausencias=vals.filter(v=>v==="ausencia").length;
        licNoRem=vals.filter(v=>v==="licNoRem").length;
        incap=vals.filter(v=>v==="incapacidad").length;
        licRem=vals.filter(v=>v==="licencia").length;
        vac=vals.filter(v=>v==="vacaciones").length; }
    }
    const diasPrima=Math.max(0,diasVinc-ausencias-licNoRem);
    meses.push({mes:m,diasVinc,ausencias,licNoRem,incap,licRem,vac,diasPrima});
  }
  const diasTotal=meses.reduce((s,x)=>s+x.diasPrima,0);
  const prima=Math.round(base*diasTotal/360);
  return {semestre:semStart===0?1:2, base, sal, aux, aplA, meses, diasTotal, prima};
}
// Condiciones laborales con fecha de vigencia (ARL, salario, etc.) del empleado.
async function loadCond(empId){try{const r=await fetch("/api/hiring?kv=rrhh:condiciones:"+empId+"&flat=1");const d=await r.json();return Array.isArray(d.data)?d.data:[];}catch(_){return[];}}
// Redondeo PILA: la plataforma (MiPlanilla) aproxima cada aporte al múltiplo de 100 superior.
// Confirmado por el contador: las aproximaciones las asume la empresa al pagar; NO se trasladan
// al trabajador. Por eso ceil100 se aplica SOLO al lado PILA, nunca a la nómina del empleado.
const ceil100=(x)=>Math.ceil((Number(x)||0)/100)*100;
async function saveN(a,m,data){await fetch("/api/hiring?kv=nomina&anio="+a+"&mes="+m,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({data})});}

// Calcula las horas mensuales reales del empleado según los calendarios de los centros donde esta asignado,
// descontando 1h de almuerzo en los calendarios marcados como incluye_almuerzo:true.
// Si no hay centros configurados para el empleado o faltan datos, devuelve 240h (legacy: 8h x 30d).
function calcHorasMesEmp(empId, anio, mes, centros){
  if(!empId || !Array.isArray(centros) || centros.length === 0) return 240;
  const diasSemMap = ["D","L","M","X","J","V","S"]; // 0=Domingo, 1=Lunes, ...
  const diasEnMes = new Date(anio, mes+1, 0).getDate();
  let totalHoras = 0;
  let algunCal = false;
  for(let d=1; d<=diasEnMes; d++){
    const fecha = new Date(anio, mes, d);
    const diaSemana = diasSemMap[fecha.getDay()];
    for(const centro of centros){
      for(const cal of (centro.calendarios||[])){
        if(!Array.isArray(cal.empleados) || !cal.empleados.includes(empId)) continue;
        if(!Array.isArray(cal.dias) || !cal.dias.includes(diaSemana)) continue;
        algunCal = true;
        const eH = parseInt((cal.entrada||"00:00").split(":")[0]) || 0;
        const sH = parseInt((cal.salida||"00:00").split(":")[0]) || 0;
        const almuerzo = cal.incluye_almuerzo ? 1 : 0;
        totalHoras += Math.max(0, sH - eH - almuerzo);
      }
    }
  }
  return algunCal && totalHoras > 0 ? totalHoras : 240;
}

function calcN(n) {
  const dias=n.dias||30, ratio=dias/30, diasIBC=dias+(n.diasIncap||0)+(n.diasVac||0)+(n.diasLicRem||0), ratioIBC=diasIBC/30, sal=n.sal||0;
  const festMes=n.festMes||0;
  const licRem=n.diasLicRem||0;
  // Ausencia injustificada: contador propio. Usa el guardado si existe; si no, lo deriva de novDias (robusto con datos antiguos sin el campo).
  const diasAusencia = n.diasAusencia != null ? n.diasAusencia : Object.values(n.novDias||{}).filter(v=>v==="ausencia").length;
  // Días de vinculación del mes (para el piso de IBC conforme a ley). El IBC mínimo es 1 SMLMV completo salvo
  // fracción de mes por ingreso/retiro, donde es proporcional (Ley 100; doctrina UGPP). Una ausencia DENTRO de un
  // mes completo descuenta salario pero NO reduce el piso de 1 SMLMV.
  let diasVinc = 30;
  { const _fi=n.fechaIngreso?new Date(n.fechaIngreso+"T12:00:00"):null, _ff=n.fechaFinContrato?new Date(n.fechaFinContrato+"T12:00:00"):null;
    if(_fi&&_fi.getFullYear()===n.anio&&_fi.getMonth()===n.mes) diasVinc=30-(_fi.getDate()-1);
    if(_ff&&_ff.getFullYear()===n.anio&&_ff.getMonth()===n.mes) diasVinc=Math.min(diasVinc,Math.min(30,_ff.getDate()));
    diasVinc=Math.max(0,diasVinc); }
  const ratioVinc=diasVinc/30;
  // Días que se transportó = días laborados - licencias rem (festivos SÍ incluidos — Concepto 219821/2020)
  const diasComm=Math.max(0,dias-licRem);
  const ratioComm=diasComm/30;
  // Días asistidos = días que se transportó - festivos (para bono asistencia)
  const diasAsist=Math.max(0,diasComm-festMes);
  const ratioAsist=diasAsist/30;
  // Aux transporte: por días que se transportó (excluye lic rem, incluye festivos)
  const aplA=sal<=2*SMLMV, aux=aplA?AUX_TR*ratioComm:0;
  // Bono asistencia: por días asistidos (excluye festivos y lic rem)
  const bono=(n.bono||0)*ratioAsist;
  const vH=sal/(n.horasMes||240);
  const hexD=(n.hexD||0)*vH*1.25, hexN=(n.hexN||0)*vH*1.75, hexDD=(n.hexDD||0)*vH*2, hexDN=(n.hexDN||0)*vH*2.5;
  const totHex=hexD+hexN+hexDD+hexDN, recFest=(n.festLab||0)*vH*8*0.75;
  // Bonos manuales del mes (lista). Salariales: entran a IBC, devengado y prestaciones.
  // No salariales: entran al devengado; y por regla 40/60 (Ley 1393/2010) el excedente
  // sobre el 40% de la remuneración total se incluye en el IBC. La base excluye los
  // auxilios legales (transporte, incapacidad). Criterio a validar con el contador.
  const _bonos=Array.isArray(n.bonos)?n.bonos:[];
  const bonosSal=_bonos.filter(b=>b&&b.salarial).reduce((s,b)=>s+(+b.valor||0),0);
  const bonosNoSal=_bonos.filter(b=>b&&!b.salarial).reduce((s,b)=>s+(+b.valor||0),0);
  // Salario siempre sobre 30 días (incluye festivos y domingos)
  const salProp=sal*ratio, salPropIBC=sal*ratioIBC, auxIncap=Math.round((sal/30)*(n.diasIncap||0)*0.6667);
  const remunSal=salProp+totHex+recFest+bonosSal, remunNoSal=bono+bonosNoSal, totalRemun=remunSal+remunNoSal;
  const topeNoSal=totalRemun*0.40, excedenteNoSal=remunNoSal>topeNoSal?(remunNoSal-topeNoSal):0;
  const ibc=Math.max(salPropIBC+totHex+recFest+bonosSal+excedenteNoSal, SMLMV*ratioVinc);
  const dev=salProp+totHex+recFest+aux+bono+bonosSal+bonosNoSal+(n.otrosIng||0)+auxIncap;
  const eSub=n.reg==="subsidiado", epsE=eSub?0:ibc*0.04, penE=ibc*0.04;
  const rteF=(ibc/UVT)>95?((ibc/UVT)-95)*UVT*0.19:0;
  const totD=epsE+penE+rteF+(n.otrasDed||0), neto=dev-totD;
  const q1Pct=n.q1Pct!=null?n.q1Pct:0.5, q1=Math.round(sal*q1Pct), q2=neto-q1;
  const enSM=sal/SMLMV, exS=n.ex114!==false&&enSM<10, tasa=ARL_OPTS[n.arl||0]?.t||0.00522;
  // ARL: se suspende durante incapacidad (EG/AT) y licencia NO remunerada — no hay exposición a riesgo.
  // Vacaciones y licencia remunerada SÍ mantienen ARL. Salud/pensión/caja siguen sobre ibc completo.
  const diasARL=dias+(n.diasVac||0)+(n.diasLicRem||0), ratioARL=diasARL/30;
  const epsEr=(eSub||exS)?0:ibc*0.085, penEr=ibc*0.12, arlV=Math.max(sal*ratioARL+totHex+recFest,SMLMV*ratioARL)*tasa;
  const caja=ibc*0.04, icbf=exS?0:ibc*0.03, sena=exS?0:ibc*0.02;
  const totAp=epsEr+penEr+arlV+caja+icbf+sena;
  const bPr=salProp+aux+bonosSal, prima=bPr/12, ces=bPr/12, intC=ces*0.12/12, vac=salProp*15/360;
  const totPr=prima+ces+intC+vac, costoT=dev+totAp+totPr;
  return {sal,salProp,bono,aux,aplA,dev,ibc,eSub,vH,totHex,hexD,hexN,hexDD,hexDN,recFest,epsE,penE,rteF,otrasDed:n.otrasDed||0,totD,neto,q1,q2,q1Pct,epsEr,penEr,arlV,caja,icbf,sena,totAp,exS,tasa,prima,ces,intC,vac,totPr,costoT,ratio,dias,festMes,diasComm,ratioComm,diasAsist,ratioAsist,diasAusencia,diasVinc,ratioVinc,horasMes:n.horasMes||240,bonosSal,bonosNoSal,excedenteNoSal,topeNoSal,remunNoSal};
}

const T={bg:"#F5F4F1",surface:"#FFFFFF",ink:"#111",inkMid:"#666",inkLight:"#999",inkXLight:"#CCC",border:"#E5E3DE",accent:"#F5F5F3",green:"#16A34A",greenBg:"#F0FDF4",red:"#DC2626",redBg:"#FEF2F2",blue:"#2563EB",blueBg:"#EFF6FF",amber:"#D97706",amberBg:"#FFFBEB",purple:"#7C3AED",purpleBg:"#F5F3FF",shadow:"0 1px 3px rgba(0,0,0,.06)"};

const Card=({children,style,accent})=><div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:"16px 18px",marginBottom:10,boxShadow:T.shadow,borderLeft:accent?`3px solid ${accent}`:undefined,...style}}>{children}</div>;
const Lbl=({children})=><label style={{display:"block",fontSize:9,fontWeight:700,color:T.inkLight,textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>{children}</label>;
const Inp=({label,value,onChange,type="text",disabled,suf,small,...rest})=><div style={{marginBottom:8}}>{label&&<Lbl>{label}</Lbl>}<div style={{position:"relative"}}><input type={type} value={value} onChange={e=>onChange(type==="number"?+e.target.value:e.target.value)} disabled={disabled} style={{width:"100%",boxSizing:"border-box",border:`1px solid ${T.border}`,borderRadius:4,padding:small?"5px 8px":"6px 10px",paddingRight:suf?32:undefined,fontSize:small?11:12,fontFamily:"'DM Mono',monospace",background:disabled?T.accent:"#fff",color:T.ink}} {...rest}/>{suf&&<span style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",fontSize:9,color:T.inkLight,fontFamily:"'DM Mono',monospace"}}>{suf}</span>}</div></div>;
const Sel=({label,value,onChange,opts,disabled})=><div style={{marginBottom:8}}>{label&&<Lbl>{label}</Lbl>}<select value={value} onChange={e=>onChange(e.target.value)} disabled={disabled} style={{width:"100%",border:`1px solid ${T.border}`,borderRadius:4,padding:"6px 10px",fontSize:12,fontFamily:"'DM Sans',sans-serif",background:disabled?T.accent:"#fff",color:T.ink}}>{opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}</select></div>;
const Row=({lbl,val,color,bold,sub,indent,bg})=><div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",padding:`${sub?2:4}px ${indent?10:0}px`,background:bg||"transparent",borderRadius:bg?3:0,marginBottom:bg?3:0}}><span style={{fontSize:sub?10:11,color:sub?T.inkLight:(color||T.inkMid),fontWeight:bold?700:400}}>{indent&&<span style={{color:T.inkXLight,marginRight:4}}>└</span>}{lbl}</span><span style={{fontSize:sub?10:12,fontWeight:bold?800:500,color:color||T.ink,fontFamily:"'DM Mono',monospace"}}>{fmt(val)}</span></div>;
const Div=()=><div style={{height:1,background:T.border,margin:"6px 0"}}/>;
const STit=({children,color})=><div style={{fontSize:12,fontWeight:700,color:color||T.ink,marginBottom:8}}>{children}</div>;
// Pill de estado de nómina. El flujo actual solo usa: borrador → q1_pagado → pagada.
// 'liquidada' y 'aprobada' son estados legacy (pre Punto 3) que pueden existir
// en datos antiguos; se muestran con el mismo estilo verde y label "pagada".
const Pill=({e})=>{const m={borrador:{bg:"#F5F4F1",c:"#888"},q1_pagado:{bg:T.blueBg,c:T.blue},liquidada:{bg:T.greenBg,c:T.green},pagada:{bg:T.greenBg,c:T.green},aprobada:{bg:T.greenBg,c:T.green}};const s=m[e]||m.borrador;const label=e==="q1_pagado"?"Q1 pagado · Falta Q2":(e==="liquidada"||e==="aprobada")?"pagada":e;return<span style={{padding:"2px 8px",borderRadius:10,fontSize:9,fontWeight:700,background:s.bg,color:s.c}}>{label}</span>;};
// EstadoPills: renderiza pills separados por tipo de pago (Q1, Q2 o Mes) según la modalidad del empleado
const EstadoPills=({n})=>{
  const pillStyle=(paid)=>({display:"inline-block",padding:"2px 7px",borderRadius:10,fontSize:9,fontWeight:700,background:paid?T.greenBg:"#F5F4F1",color:paid?T.green:"#999",minWidth:36,textAlign:"center"});
  if(n.modalidadPago==="mensual"){
    const paid=n.estado==="pagada"||n.estado==="liquidada";
    return <span style={pillStyle(paid)}>{paid?"✓ Mes":"Mes"}</span>;
  }
  // Quincenal
  const q1Paid=n.estado==="q1_pagado"||n.estado==="pagada"||n.estado==="liquidada";
  const q2Paid=n.estado==="pagada"||n.estado==="liquidada";
  return <div style={{display:"flex",gap:4}}><span style={pillStyle(q1Paid)}>{q1Paid?"✓ Q1":"Q1"}</span><span style={pillStyle(q2Paid)}>{q2Paid?"✓ Q2":"Q2"}</span></div>;
};
const Btn=({children,pri,small,onClick,disabled,style:sx})=><button onClick={onClick} disabled={disabled} style={{padding:small?"4px 10px":"7px 14px",borderRadius:5,border:pri?"none":`1px solid ${T.border}`,background:pri?T.ink:T.surface,color:pri?"#fff":T.ink,fontSize:small?10:11,fontWeight:600,fontFamily:"'DM Sans',sans-serif",cursor:disabled?"default":"pointer",opacity:disabled?0.5:1,display:"inline-flex",alignItems:"center",gap:5,...sx}}>{children}</button>;

/* ── ASISTENCIA POR EMPLEADO (sub-tab) ── */
function AsistenciaPanel({selN, MESES, mes, anio}) {
  const [regs, setRegs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mesAtt, setMesAtt] = useState(mes);

  useEffect(()=>{
    if(!selN?.empId) { setLoading(false); return; }
    setLoading(true);
    (async()=>{
      try {
        const r = await fetch("/api/attendance?employee_id="+selN.empId+"&limit=200");
        const d = await r.json();
        setRegs(d.data||[]);
      } catch(e) { console.error(e); }
      setLoading(false);
    })();
  },[selN?.empId]);

  // Filter by selected month
  const mesStr = String(anio)+"-"+String(mesAtt+1).padStart(2,"0");
  const filtered = regs.filter(r=>(r.fecha||"").startsWith(mesStr)).sort((a,b)=>a.timestamp<b.timestamp?-1:1);

  // Group by date
  const byDate = {};
  filtered.forEach(r=>{
    if(!byDate[r.fecha]) byDate[r.fecha]=[];
    byDate[r.fecha].push(r);
  });
  const dates = Object.keys(byDate).sort();

  // Stats
  const diasConEntrada = dates.filter(d=>byDate[d].some(r=>r.tipo==="entrada")).length;
  const diasConSalida = dates.filter(d=>byDate[d].some(r=>r.tipo==="salida")).length;
  const totalHoras = dates.reduce((sum,d)=>{
    const ent = byDate[d].find(r=>r.tipo==="entrada");
    const sal = byDate[d].find(r=>r.tipo==="salida");
    if(ent&&sal){
      const diff = (new Date(sal.timestamp)-new Date(ent.timestamp))/3600000;
      return sum + Math.max(0, diff);
    }
    return sum;
  }, 0);

  const fichajeLink = getTenantUrlsSync().portalEmpleado;
  const portalLink = getTenantUrlsSync().portalEmpleado;

  return (
    <div>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div>
          <div style={{fontSize:13,fontWeight:700}}>📍 Registros de asistencia — {selN.nombre}</div>
          <div style={{fontSize:10,color:T.inkLight}}>Cédula + PIN · Fichaje con foto + GPS</div>
        </div>
        <div style={{display:"flex",gap:6}}>
          <select value={mesAtt} onChange={e=>setMesAtt(parseInt(e.target.value))} style={{padding:"5px 10px",border:`1px solid ${T.border}`,borderRadius:4,fontSize:11,fontFamily:"'DM Sans',sans-serif"}}>
            {MESES.map((m,i)=><option key={i} value={i}>{m}</option>)}
          </select>
          <Btn small onClick={()=>{(()=>{const u=getTenantUrlsSync();const id=getTenantIdentitySync();window.open("https://wa.me/?text="+encodeURIComponent(id.displayName+"\n\n👤 Portal del empleado:\n"+u.portalEmpleado+"\n\nIngresa tu cédula y PIN (últimos 4 dígitos de tu cédula)"),"_blank");})();}}>💬 Enviar link</Btn>
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:12}}>
        {[
          ["Días con entrada",diasConEntrada,T.green],
          ["Días con salida",diasConSalida,T.blue],
          ["Fichajes total",filtered.length,T.ink],
          ["Horas registradas",totalHoras.toFixed(1)+"h",T.amber],
        ].map(([l,v,c])=>(
          <div key={l} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:6,padding:"10px 12px",textAlign:"center"}}>
            <div style={{fontSize:8,fontWeight:700,color:T.inkLight,textTransform:"uppercase",letterSpacing:.8}}>{l}</div>
            <div style={{fontSize:18,fontWeight:800,color:c,fontFamily:"'DM Mono',monospace"}}>{v}</div>
          </div>
        ))}
      </div>

      {loading && <div style={{textAlign:"center",padding:24,color:T.inkLight}}>Cargando fichajes...</div>}

      {!loading && dates.length===0 && (
        <Card style={{textAlign:"center",padding:"30px 20px"}}>
          <div style={{fontSize:32,marginBottom:8}}>📭</div>
          <div style={{fontSize:13,color:T.inkMid}}>Sin registros en {MESES[mesAtt]} {anio}</div>
          <div style={{fontSize:11,color:T.inkLight,marginTop:6}}>Envía el link de fichaje al trabajador para que empiece a registrar su asistencia</div>
        </Card>
      )}

      {!loading && dates.length>0 && (
        <Card style={{padding:0,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead>
              <tr style={{borderBottom:`2px solid ${T.ink}`,background:T.surface}}>
                {["Fecha","Entrada","Salida","Horas","GPS","Foto"].map(h=>(
                  <th key={h} style={{padding:"6px 10px",textAlign:"left",fontSize:9,fontWeight:700,color:T.inkLight,letterSpacing:.8,textTransform:"uppercase"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dates.map((d,i)=>{
                const dayRegs = byDate[d];
                const entrada = dayRegs.find(r=>r.tipo==="entrada");
                const salida = dayRegs.find(r=>r.tipo==="salida");
                const horas = (entrada&&salida) ? ((new Date(salida.timestamp)-new Date(entrada.timestamp))/3600000).toFixed(1) : null;
                const dt = new Date(d+"T12:00:00");
                const dayName = dt.toLocaleDateString(getTenantDefaultsSync().locale,{weekday:"short"});
                const dayNum = dt.toLocaleDateString(getTenantDefaultsSync().locale,{day:"numeric",month:"short"});
                const isSun = dt.getDay()===0;
                return (
                  <tr key={d} style={{borderBottom:`1px solid ${T.border}`,background:i%2===0?T.card:"#FAFAF8",opacity:isSun?0.5:1}}>
                    <td style={{padding:"6px 10px"}}>
                      <div style={{fontWeight:600,fontSize:12,textTransform:"capitalize"}}>{dayName} {dayNum}</div>
                    </td>
                    <td style={{padding:"6px 10px",fontFamily:"'DM Mono',monospace",fontSize:12,color:entrada?T.green:T.inkLight}}>
                      {entrada?new Date(entrada.timestamp).toLocaleTimeString(getTenantDefaultsSync().locale,{hour:"2-digit",minute:"2-digit"}):"–"}
                    </td>
                    <td style={{padding:"6px 10px",fontFamily:"'DM Mono',monospace",fontSize:12,color:salida?T.red:T.inkLight}}>
                      {salida?new Date(salida.timestamp).toLocaleTimeString(getTenantDefaultsSync().locale,{hour:"2-digit",minute:"2-digit"}):"–"}
                    </td>
                    <td style={{padding:"6px 10px",fontFamily:"'DM Mono',monospace",fontWeight:600,fontSize:12}}>
                      {horas ? horas+"h" : "–"}
                    </td>
                    <td style={{padding:"6px 10px",fontSize:11}}>
                      {entrada?.gps_lat ? (
                        <a href={`https://www.google.com/maps?q=${entrada.gps_lat},${entrada.gps_lng}`} target="_blank" rel="noreferrer" style={{color:T.blue,textDecoration:"none"}}>
                          📍 {entrada.precision_m||""}m
                        </a>
                      ) : <span style={{color:T.inkLight}}>–</span>}
                    </td>
                    <td style={{padding:"6px 10px"}}>
                      {entrada?.foto_url ? (
                        <img src={entrada.foto_url} alt="foto" style={{width:32,height:32,borderRadius:4,objectFit:"cover",cursor:"pointer",border:`1px solid ${T.border}`}}
                          onClick={()=>{openReport(`<img src="${entrada.foto_url}" style="max-width:100%"/>`);}}/>
                      ) : <span style={{color:T.inkLight,fontSize:11}}>–</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

/* ── NOVEDADES PANEL (sub-tab dentro del liquidador) ── */
function NovedadesPanel({selN, anio, mes, MESES, novHist, setNovHist, novYear, setNovYear, fmt}) {
  const [loading, setLoading] = useState(true);
  // Por defecto muestra el mes que se está liquidando; el usuario puede cambiar a otro mes o "Todo el año".
  const [filtroMes, setFiltroMes] = useState(String(mes));

  useEffect(()=>{
    setLoading(true);
    fetch("/api/novelties?employee_id="+selN.empId).then(r=>r.json()).then(d=>{
      setNovHist(d.data||[]);setLoading(false);
    }).catch(()=>{setNovHist([]);setLoading(false);});
  },[selN.empId]);

  // Vacation calc: 15 days/year proportional to time worked
  const fechaIng = selN.fechaIngreso ? new Date(selN.fechaIngreso+"T12:00:00") : null;
  const hoy = new Date();
  const diasTrabajados = fechaIng ? Math.max(0,Math.floor((hoy-fechaIng)/86400000)) : 0;
  const aniosTrab = diasTrabajados/365;
  const vacGanados = Math.round(aniosTrab*15*10)/10;
  const vacTomados = novHist.filter(n=>n.tipo==="vacaciones"&&n.estado!=="rechazada").reduce((s,n)=>{
    if(!n.fecha_inicio)return s;
    const fi=new Date(n.fecha_inicio), ff=n.fecha_fin?new Date(n.fecha_fin):fi;
    return s+Math.max(1,Math.floor((ff-fi)/86400000)+1);
  },0);
  const vacDisp = Math.max(0, Math.round((vacGanados-vacTomados)*10)/10);

  // Filter by year and month — se usa fecha_inicio (cuándo OCURRE la novedad),
  // no created_at (cuándo se registró el dato). Parseo con T12:00:00 para evitar
  // desfase de timezone (Bogotá -5) que movería la fecha al día anterior.
  const novDate = n => new Date((n.fecha_inicio||n.created_at||"").slice(0,10)+"T12:00:00");
  const filtered = novHist.filter(n=>{
    const d = novDate(n);
    if(isNaN(d)) return false;
    if(d.getFullYear()!==novYear) return false;
    if(filtroMes!=="all" && d.getMonth()!==parseInt(filtroMes)) return false;
    return true;
  }).sort((a,b)=>novDate(b)-novDate(a));

  // Group by year for all-years view — también por fecha_inicio
  const years = [...new Set(novHist.map(n=>novDate(n).getFullYear()).filter(y=>!isNaN(y)))].sort((a,b)=>b-a);
  if(years.indexOf(novYear)===-1 && years.length) years.unshift(novYear);
  if(years.indexOf(hoy.getFullYear())===-1) years.unshift(hoy.getFullYear());

  const tipoIcon = {vacaciones:"🏖️",licencia_remunerada:"📋",licencia_no_remunerada:"⚠️",permiso:"🕐",incapacidad:"🏥",ausencia:"❌"};
  const estadoBadge = (e)=>e==="aprobada"?`<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:9px;font-weight:700;background:#E8F4EE;color:#1E6B42">aprobada</span>`:e==="rechazada"?`<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:9px;font-weight:700;background:#FEF2F2;color:#dc2626">rechazada</span>`:`<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:9px;font-weight:700;background:#FFFBEB;color:#D97706">pendiente</span>`;

  if(loading) return <div style={{textAlign:"center",padding:40}}><div style={{width:20,height:20,border:`3px solid ${T.border}`,borderTopColor:T.ink,borderRadius:"50%",animation:"spin 1s linear infinite",margin:"0 auto"}}/></div>;

  return(
    <div>
      {/* KPIs Vacaciones */}
      <Card accent={T.ink}>
        <STit>🏖️ Vacaciones — {selN.nombre}</STit>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:8}}>
          <div style={{background:T.greenBg,borderRadius:6,padding:10,textAlign:"center"}}>
            <div style={{fontSize:7,fontWeight:700,color:T.green,textTransform:"uppercase",letterSpacing:1}}>Ganados</div>
            <div style={{fontSize:20,fontWeight:800,fontFamily:"'DM Mono',monospace",color:T.green}}>{vacGanados.toFixed(1)}d</div>
          </div>
          <div style={{background:T.blueBg,borderRadius:6,padding:10,textAlign:"center"}}>
            <div style={{fontSize:7,fontWeight:700,color:T.blue,textTransform:"uppercase",letterSpacing:1}}>Tomados</div>
            <div style={{fontSize:20,fontWeight:800,fontFamily:"'DM Mono',monospace",color:T.blue}}>{vacTomados}d</div>
          </div>
          <div style={{background:"#FFF8EE",borderRadius:6,padding:10,textAlign:"center"}}>
            <div style={{fontSize:7,fontWeight:700,color:T.amber,textTransform:"uppercase",letterSpacing:1}}>Disponibles</div>
            <div style={{fontSize:20,fontWeight:800,fontFamily:"'DM Mono',monospace",color:T.amber}}>{vacDisp}d</div>
          </div>
          <div style={{background:T.accent,borderRadius:6,padding:10,textAlign:"center"}}>
            <div style={{fontSize:7,fontWeight:700,color:T.inkLight,textTransform:"uppercase",letterSpacing:1}}>Antigüedad</div>
            <div style={{fontSize:20,fontWeight:800,fontFamily:"'DM Mono',monospace",color:T.inkMid}}>{aniosTrab.toFixed(1)}a</div>
          </div>
        </div>
        <div style={{fontSize:9,color:T.inkLight}}>15 días hábiles/año (Art.186 CST) · Ingreso: {selN.fechaIngreso||"—"}</div>
      </Card>

      {/* Filters */}
      <Card accent={T.ink}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <STit>📋 Histórico de novedades</STit>
          <div style={{display:"flex",gap:6}}>
            <select value={novYear} onChange={e=>setNovYear(parseInt(e.target.value))} style={{padding:"4px 8px",border:`1px solid ${T.border}`,borderRadius:4,fontSize:11,fontFamily:"'DM Sans',sans-serif"}}>
              {years.map(y=><option key={y} value={y}>{y}</option>)}
            </select>
            <select value={filtroMes} onChange={e=>setFiltroMes(e.target.value)} style={{padding:"4px 8px",border:`1px solid ${T.border}`,borderRadius:4,fontSize:11,fontFamily:"'DM Sans',sans-serif"}}>
              <option value="all">Todo el año</option>
              {MESES.map((m,i)=><option key={i} value={i}>{m}</option>)}
            </select>
            <button type="button" disabled={filtered.length===0} onClick={()=>{
              const periodoLbl = filtroMes==="all" ? `Año ${novYear}` : `${MESES[parseInt(filtroMes)]} ${novYear}`;
              const filas = filtered.map(n=>{
                const f=novDate(n);
                const dias = (()=>{ if(!n.fecha_inicio) return 1; const fi=new Date(n.fecha_inicio+"T12:00:00"), ff=n.fecha_fin?new Date(n.fecha_fin+"T12:00:00"):fi; return Math.max(1,Math.floor((ff-fi)/86400000)+1); })();
                return `<tr><td>${f.toLocaleDateString(getTenantDefaultsSync().locale,{day:"numeric",month:"short",year:"numeric"})}</td><td>${tipoIcon[n.tipo]||"📋"} ${n.tipo}</td><td style="font-family:monospace;font-size:7.5pt">${n.fecha_inicio||""}${n.fecha_fin&&n.fecha_fin!==n.fecha_inicio?" → "+n.fecha_fin:""}</td><td style="text-align:center">${dias}</td><td>${n.motivo||"—"}</td><td>${n.estado||""}</td></tr>`;
              }).join("");
              const totalDias = filtered.reduce((s,n)=>{ if(!n.fecha_inicio) return s+1; const fi=new Date(n.fecha_inicio+"T12:00:00"), ff=n.fecha_fin?new Date(n.fecha_fin+"T12:00:00"):fi; return s+Math.max(1,Math.floor((ff-fi)/86400000)+1); },0);
              const _mAbrNov = filtroMes==="all"?"ANUAL":MESES[parseInt(filtroMes)].substring(0,3).toUpperCase();
              const _a2Nov = String(novYear).slice(-2);
              const _apeNov = (selN.nombre||"").split(" ").slice(-2).join("-").toUpperCase();
              const fileNameNov = `NOVEDADES-${_mAbrNov}${_a2Nov}-${_apeNov}-${(selN.cc||"").replace(/\D/g,"")}`;
              const legalNov = getActiveCompanyLegalDataSync();
              const html = `<!doctype html><html><head><meta charset="utf-8">
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"><\/script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"><\/script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Helvetica,Arial,sans-serif;background:#e5e5e5;margin:0;padding:20px 0}
.np{position:sticky;top:0;text-align:center;padding:10px;background:#e5e5e5;z-index:10}
.np .btn,.np .btn2{font-size:12px;font-weight:600;border-radius:5px;padding:8px 16px;cursor:pointer;font-family:Helvetica,Arial,sans-serif;margin:0 4px}
.np .btn{background:#111;color:#fff;border:1px solid #111}
.np .btn2{background:#fff;color:#111;border:1px solid #bbb}
#content{background:#fff;width:794px;margin:0 auto;padding:35px 45px;font-size:9pt;color:#111;line-height:1.35;box-shadow:0 0 8px rgba(0,0,0,.15)}
.hdr{border-bottom:2px solid #111;padding-bottom:6px;margin-bottom:10px;overflow:hidden}
.hdr .l{float:left}.hdr .r{float:right;text-align:right;font-size:8pt;color:#666;padding-top:6px}
.hdr img{height:36px}
h1{font-size:12pt;text-align:center;margin:4px 0 2px;clear:both}
.sub{font-size:8pt;color:#666;text-align:center;margin-bottom:10px}
.info{margin-bottom:10px;font-size:8.5pt;overflow:hidden}.info div{float:left;width:50%;padding:1px 0}
.info span{color:#666}.info b{color:#111}
table{width:100%;border-collapse:collapse;margin-bottom:8px;font-size:8.5pt;clear:both}
th{text-align:left;padding:4px 6px;font-size:7pt;font-weight:700;text-transform:uppercase;border-bottom:2px solid #111}
td{padding:3px 6px;border-bottom:1px solid #ddd}
.foot{font-size:6.5pt;color:#999;text-align:center;margin-top:10px;clear:both}
@page{size:A4 portrait;margin:0}table,tr,thead{page-break-inside:avoid;break-inside:avoid}@media print{html,body{background:#fff;margin:0;padding:0}.np{display:none}#content{width:210mm;margin:0;padding:14mm;box-shadow:none}}
</style></head><body>
<div class="np"><button class="btn" onclick="(function(){var el=document.getElementById('content');el.style.boxShadow='none';document.querySelector('.np').style.display='none';html2canvas(el,{scale:2,useCORS:true,width:el.scrollWidth,windowWidth:el.scrollWidth,backgroundColor:'#fff'}).then(function(c){var img=c.toDataURL('image/jpeg',0.98);var pW=210,pH=(c.height*pW)/c.width;var pdf=new jspdf.jsPDF({orientation:'portrait',unit:'mm',format:'a4'});if(pH<=297){pdf.addImage(img,'JPEG',0,0,pW,pH)}else{var pos=0,pg=0;while(pos<pH){if(pg>0)pdf.addPage();pdf.addImage(img,'JPEG',0,-pos,pW,pH);pos+=297;pg++}}pdf.save('${fileNameNov}.pdf');el.style.boxShadow='0 0 8px rgba(0,0,0,.15)';document.querySelector('.np').style.display=''})})()">📥 Descargar PDF</button><button class="btn2" onclick="window.print()">🖨️ Imprimir</button></div>
<div id="content">
<div class="hdr"><div class="l"><img src="${HAB_LOGO}" alt="logo"/></div><div class="r"><div style="font-weight:600;color:#111">${legalNov.legalName}</div><div>NIT: ${legalNov.taxId}</div></div></div>
<h1>INFORME DE NOVEDADES</h1>
<div class="sub">${periodoLbl} &middot; ${filtered.length} novedad(es) &middot; ${totalDias} día(s) en total &middot; Ref: ${fileNameNov}</div>
<div class="info">
<div><span>Empleado: </span><b>${selN.nombre}</b></div>
<div><span>Documento: </span><b>${selN.cc||""}</b></div>
<div><span>Cargo: </span><b>${selN.cargo||"—"}</b></div>
<div><span>Período: </span><b>${periodoLbl}</b></div>
</div>
<table><thead><tr><th>Fecha</th><th>Tipo</th><th>Período</th><th style="text-align:center">Días</th><th>Motivo</th><th>Estado</th></tr></thead><tbody>${filas}</tbody></table>
<div class="foot">${getTenantIdentitySync().displayName} · Generado ${new Date().toLocaleDateString(getTenantDefaultsSync().locale)}</div>
</div></body></html>`;
              openReport(html);
            }} style={{padding:"4px 10px",border:`1px solid ${T.border}`,borderRadius:4,fontSize:11,fontWeight:600,background:filtered.length===0?"#f5f5f5":"#fff",color:filtered.length===0?T.inkLight:T.ink,cursor:filtered.length===0?"default":"pointer",fontFamily:"'DM Sans',sans-serif"}}>📄 Informe</button>
          </div>
        </div>

        {filtered.length===0 ? (
          <div style={{textAlign:"center",padding:24,color:T.inkLight}}>
            <div style={{fontSize:24,marginBottom:6}}>📭</div>
            <div style={{fontSize:12}}>Sin novedades en {novYear}{filtroMes!=="all"?" · "+MESES[parseInt(filtroMes)]:""}</div>
          </div>
        ) : (
          <table style={{width:"100%",fontSize:11,borderCollapse:"collapse"}}>
            <thead><tr style={{borderBottom:`2px solid ${T.ink}`}}>
              <th style={{padding:"5px 8px",textAlign:"left",fontSize:8,fontWeight:700,color:T.inkLight,letterSpacing:1}}>FECHA</th>
              <th style={{padding:"5px 8px",textAlign:"left",fontSize:8,fontWeight:700,color:T.inkLight,letterSpacing:1}}>TIPO</th>
              <th style={{padding:"5px 8px",textAlign:"left",fontSize:8,fontWeight:700,color:T.inkLight,letterSpacing:1}}>PERIODO</th>
              <th style={{padding:"5px 8px",textAlign:"left",fontSize:8,fontWeight:700,color:T.inkLight,letterSpacing:1}}>MOTIVO</th>
              <th style={{padding:"5px 8px",textAlign:"left",fontSize:8,fontWeight:700,color:T.inkLight,letterSpacing:1}}>ESTADO</th>
            </tr></thead>
            <tbody>
              {filtered.map((n,i)=>(
                <tr key={i} style={{borderBottom:`1px solid ${T.border}`}}>
                  <td style={{padding:"5px 8px",fontWeight:600}}>{novDate(n).toLocaleDateString(getTenantDefaultsSync().locale,{day:"numeric",month:"short"})}</td>
                  <td style={{padding:"5px 8px"}}>{tipoIcon[n.tipo]||"📋"} {n.tipo}</td>
                  <td style={{padding:"5px 8px",fontFamily:"'DM Mono',monospace",fontSize:10}}>{n.fecha_inicio||""}{n.fecha_fin?" → "+n.fecha_fin:""}</td>
                  <td style={{padding:"5px 8px",color:T.inkMid,maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{n.motivo||"—"}</td>
                  <td style={{padding:"5px 8px"}} dangerouslySetInnerHTML={{__html:estadoBadge(n.estado)}}/>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div style={{display:"flex",gap:8,marginTop:12}}>
          <div style={{fontSize:9,color:T.inkLight,flex:1}}>
            {filtered.length} novedad(es) en {novYear}{filtroMes!=="all"?" · "+MESES[parseInt(filtroMes)]:""}
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ── LIQUIDACIÓN FINAL (sub-tab dentro del liquidador) ── */
const TIPOS_TERM = [
  { id:"renuncia", label:"Renuncia voluntaria", icon:"📝", color:T.blue, indemniza:false },
  { id:"vencimiento", label:"Terminación contrato", icon:"📅", color:T.amber, indemniza:false },
  { id:"justa_causa", label:"Despido con justa causa", icon:"⚖️", color:T.amber, indemniza:false },
  { id:"sin_justa", label:"Despido sin justa causa", icon:"🚨", color:T.red, indemniza:true },
];

function calcLiqFinal(selN, tipo, fechaSalida) {
  const sal=selN.sal||0, aux=(sal<=2*SMLMV)?(selN.auxT||AUX_TR):0;
  const fi=new Date((selN.fechaIngreso||"2026-01-01")+"T12:00:00");
  const ff=new Date(fechaSalida+"T12:00:00");
  const durMeses=selN.duracionMeses||0;
  const isFijo=(selN.tipoContrato||"").toLowerCase().includes("fijo")||durMeses>0;
  const diasTot=Math.max(1,Math.floor((ff-fi)/86400000)+1);
  const diaUltMes=ff.getDate();
  const iniSem=ff.getMonth()<6?new Date(ff.getFullYear(),0,1):new Date(ff.getFullYear(),6,1);
  const diasSem=Math.max(1,Math.floor((ff-Math.max(iniSem,fi))/86400000)+1);
  const anios=diasTot/365;
  const salPend=Math.round((sal/30)*diaUltMes);
  const vac=Math.round((sal*diasTot)/720);
  const prima=Math.round(((sal+aux)*diasSem)/360);
  const ces=Math.round(((sal+aux)*diasTot)/360);
  const intCes=Math.round((ces*diasTot*0.12)/360);
  let indem=0;
  if(tipo==="sin_justa"){
    if(isFijo){
      // Art. 64 CST — Término fijo: salario por el tiempo restante del contrato, mínimo 15 días
      let ffc;
      if(selN.fechaFinContrato) {
        ffc=new Date(selN.fechaFinContrato+"T12:00:00"); // fecha real del contrato
      } else if(durMeses>0) {
        ffc=new Date(fi.getFullYear(),fi.getMonth()+durMeses,fi.getDate()-1);
      } else {
        ffc=new Date(fi.getFullYear()+1,fi.getMonth(),fi.getDate()-1); // fallback 1 año
      }
      const dr=Math.max(0,Math.floor((ffc-ff)/86400000));
      indem=Math.round((sal/30)*Math.max(15,dr));
    } else {
      // Art. 64 CST — Término indefinido
      const sd=sal/30;
      const aniosComp=Math.floor(anios);
      const fraccion=anios-aniosComp;
      if(sal<=10*SMLMV){
        // ≤10 SMLMV: 30d primer año + 20d por cada año adicional (proporcional)
        if(anios<=1) indem=Math.round(30*sd*Math.max(anios,1));
        else indem=Math.round(30*sd + (aniosComp-1+fraccion)*20*sd);
      } else {
        // >10 SMLMV: 20d primer año + 15d por cada año adicional (proporcional)
        if(anios<=1) indem=Math.round(20*sd*Math.max(anios,1));
        else indem=Math.round(20*sd + (aniosComp-1+fraccion)*15*sd);
      }
    }
  }
  const sub=salPend+vac+prima+ces+intCes;
  return {sal,aux,fi,ff,diasTot,diaUltMes,diasSem,anios,isFijo,durMeses,salPend,vac,prima,ces,intCes,indem,sub,total:sub+indem,
    items:[
      {c:"Salario pendiente ("+diaUltMes+" días)",v:salPend,n:"Art. 65 CST"},
      {c:"Vacaciones no disfrutadas",v:vac,n:"Art. 186 CST — "+diasTot+"d/720"},
      {c:"Prima proporcional",v:prima,n:"Art. 306 CST — "+diasSem+"d semestre"},
      {c:"Cesantías proporcionales",v:ces,n:"Art. 249 CST — "+diasTot+"d/360"},
      {c:"Intereses sobre cesantías",v:intCes,n:"Ley 52/1975 — 12%"},
      ...(indem>0?[{c:"Indemnización sin justa causa",v:indem,n:isFijo?"Art. 64 CST — fijo":"Art. 64 CST — indefinido"}]:[]),
    ]};
}

function LiqFinalPanel({selN, calc, fmt, MESES, mes, anio, HAB_LOGO}) {
  const [tipo, setTipo] = useState("renuncia");
  const [fechaSalida, setFechaSalida] = useState(new Date().toISOString().split("T")[0]);
  const liq = calcLiqFinal(selN, tipo, fechaSalida);
  const tipoInfo = TIPOS_TERM.find(t=>t.id===tipo);

  const openPreview = (title, bodyHtml, fileName, fullPage) => {
    const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${fileName}</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"><\/script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"><\/script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Helvetica,Arial,sans-serif;background:#e5e5e5;padding:20px 0}
#content{background:#fff;width:794px;margin:0 auto;padding:35px 45px;font-size:9pt;color:#111;line-height:1.45;box-shadow:0 0 8px rgba(0,0,0,.15)}
.hdr{border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:14px;overflow:hidden}
.hdr .l{float:left}.hdr .r{float:right;text-align:right;font-size:8pt;color:#666;padding-top:6px}
.hdr img{height:36px}
h1{font-size:12pt;text-align:center;margin:8px 0 6px;clear:both}
.sub{font-size:8pt;color:#666;text-align:center;margin-bottom:12px}
.body{font-size:10pt;line-height:1.7;text-align:justify;margin-bottom:10px}
table{width:100%;border-collapse:collapse;margin:10px 0;font-size:9pt;clear:both}
th{padding:5px 8px;text-align:left;font-size:7pt;font-weight:700;text-transform:uppercase;border-bottom:2px solid #111}
td{padding:4px 8px;border-bottom:1px solid #ddd}.r{text-align:right;font-family:monospace}
.tot td{border-top:2px solid #111;font-weight:700;font-size:10pt;padding:6px 8px}
.checks{margin:14px 0;font-size:10pt;line-height:2}
.sig{margin-top:36px;overflow:hidden}.sig div{float:left;width:48%;text-align:center;font-size:8pt;border-top:1px solid #111;padding-top:6px}.sig div:last-child{float:right}
.foot{font-size:6pt;color:#999;text-align:center;margin-top:14px;clear:both}
.fullpage{display:flex;flex-direction:column;min-height:1123px}
.fullpage .cierre{margin-top:auto;clear:both}
.cierre p{margin-bottom:55px}
.np{text-align:center;margin:16px auto;max-width:794px}
.btn{background:#111;color:#fff;border:none;padding:10px 24px;border-radius:4px;cursor:pointer;font-size:11pt;font-weight:600;margin:0 4px}
.btn2{background:#fff;color:#111;border:1px solid #111;padding:10px 24px;border-radius:4px;cursor:pointer;font-size:11pt;margin:0 4px}
@page{size:A4 portrait;margin:0}table,tr,thead{page-break-inside:avoid;break-inside:avoid}h1,h2,h3{page-break-after:avoid;break-after:avoid}.kv,.kv.bigtot,.info,.notebox,.sig{page-break-inside:avoid;break-inside:avoid}.page-break{page-break-before:always;break-before:page}@media print{html,body{background:#fff;margin:0;padding:0;width:210mm}.np{display:none}#content{width:210mm;max-width:none;margin:0;padding:14mm 14mm;box-shadow:none;box-sizing:border-box}}
</style></head><body>
<div id="content" class="${fullPage?"fullpage":""}">
<div class="hdr"><div class="l"><img src="${HAB_LOGO}" alt="Habitaris"/></div><div class="r"><div style="font-weight:600;color:#111">${getActiveCompanyLegalDataSync().legalName}</div><div>NIT: ${getActiveCompanyLegalDataSync().taxId}</div></div></div>
${bodyHtml}
</div>
<div class="np">
<button class="btn" onclick="(function(){var el=document.getElementById('content');el.style.boxShadow='none';document.querySelector('.np').style.display='none';html2canvas(el,{scale:2,useCORS:true,width:el.scrollWidth,windowWidth:el.scrollWidth,backgroundColor:'#fff'}).then(function(c){var img=c.toDataURL('image/jpeg',0.98);var pW=210,pH=(c.height*pW)/c.width;var pdf=new jspdf.jsPDF({orientation:'portrait',unit:'mm',format:'a4'});if(pH<=297){pdf.addImage(img,'JPEG',0,0,pW,pH)}else{var pos=0,pg=0;while(pos<pH){if(pg>0)pdf.addPage();pdf.addImage(img,'JPEG',0,-pos,pW,pH);pos+=297;pg++}}pdf.save('${fileName}.pdf');el.style.boxShadow='0 0 8px rgba(0,0,0,.15)';document.querySelector('.np').style.display=''})})()">📥 Descargar PDF</button>
<button class="btn2" onclick="window.print()">🖨️ Imprimir</button>
</div></body></html>`;
    openReport(html);
  };

  const hoy=new Date().toLocaleDateString(getTenantDefaultsSync().locale,{day:"numeric",month:"long",year:"numeric"});
  const ape=(selN.nombre||"").split(" ").slice(-2).join("-").toUpperCase();
  const motivo=tipo==="renuncia"?"por renuncia voluntaria":tipo==="vencimiento"?"por vencimiento del término fijo":tipo==="justa_causa"?"por despido con justa causa":"por decisión unilateral sin justa causa";

  return (
    <div>
      {/* Info empleado */}
      <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:8,padding:"14px 18px",marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:15,fontWeight:700}}>{selN.nombre}</div>
          <div style={{fontSize:11,color:T.inkLight}}>{selN.cargo} · CC {selN.cc} · {selN.tipoContrato} {selN.duracionMeses?selN.duracionMeses+"m":""}</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:10,color:T.inkLight}}>Ingreso: {selN.fechaIngreso}</div>
          <div style={{fontSize:10,color:T.inkLight}}>Salida: {fechaSalida}</div>
          <div style={{fontSize:11,fontWeight:700}}>{liq.diasTot} días ({liq.anios.toFixed(1)} años)</div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:12}}>
        {[
          ["Salario base",fmt(liq.sal),T.ink],
          ["Aux. transporte",fmt(liq.aux),T.inkMid],
          ["Tipo",tipoInfo.icon+" "+tipoInfo.label.split(" ")[0],tipoInfo.color],
          ["TOTAL LIQUIDACIÓN",fmt(liq.total),T.green],
        ].map(([l,v,c])=>(
          <div key={l} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:6,padding:"10px 12px",textAlign:"center"}}>
            <div style={{fontSize:8,fontWeight:700,color:T.inkLight,textTransform:"uppercase",letterSpacing:.8}}>{l}</div>
            <div style={{fontSize:l.includes("TOTAL")?18:14,fontWeight:800,color:c,fontFamily:l==="Tipo"?"'DM Sans'":"'DM Mono',monospace"}}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"280px 1fr",gap:12}}>
        {/* Izquierda: Config + Docs */}
        <div>
          <Card accent={T.ink} style={{marginBottom:10}}>
            <STit>Tipo de terminación</STit>
            {TIPOS_TERM.map(t=>(
              <div key={t.id} onClick={()=>setTipo(t.id)} style={{padding:"7px 10px",borderRadius:6,marginBottom:3,cursor:"pointer",background:tipo===t.id?(t.color+"15"):T.surface,border:`1px solid ${tipo===t.id?t.color:T.border}`,fontSize:11,fontWeight:tipo===t.id?600:400}}>
                {t.icon} {t.label}{t.indemniza&&<span style={{fontSize:9,color:T.red,marginLeft:4,fontWeight:600}}>+ Indemnización</span>}
              </div>
            ))}
            <div style={{marginTop:10}}>
              <div style={{fontSize:9,fontWeight:700,color:T.inkLight,letterSpacing:.8,textTransform:"uppercase",marginBottom:3}}>Fecha de salida</div>
              <input type="date" value={fechaSalida} onChange={e=>{setFechaSalida(e.target.value);e.target.blur();}} style={{width:"100%",padding:"6px 10px",border:`1px solid ${T.border}`,borderRadius:6,fontSize:12,fontFamily:"'DM Sans',sans-serif"}}/>
            </div>
          </Card>

          <Card accent={T.ink}>
            <STit>📄 Documentos</STit>
            {[
              {id:"preaviso",lbl:"Preaviso de no renovación (30 días)",icon:"📩",color:T.amber,bg:T.amberBg},
              {id:"carta",lbl:"Carta terminación + Liquidación",icon:"📄",color:T.ink,bg:T.surface},
              {id:"paz",lbl:"Paz y salvo",icon:"✅",color:T.green,bg:T.greenBg},
              {id:"cesantias",lbl:"Carta retiro de cesantías",icon:"🏦",color:T.amber,bg:T.amberBg},
              {id:"cert_con",lbl:"Certificación laboral (con salario)",icon:"📋",color:T.blue,bg:T.blueBg},
              {id:"cert_sin",lbl:"Certificación laboral (sin salario)",icon:"📋",color:T.inkMid,bg:T.surface},
            ].map(d=>(
              <button key={d.id} onClick={()=>{
                const fn = d.id==="preaviso" ? `PREAVISO-${ape}` : d.id.startsWith("cert") ? `CERT-LAB-${ape}` : d.id==="carta" ? `CARTA-TERM-${ape}` : d.id==="paz" ? `PAZ-SALVO-${ape}` : `RETIRO-CES-${ape}`;
                let body = "";
                if(d.id==="preaviso"){
                  const venc = selN.fechaFinContrato ? new Date(selN.fechaFinContrato+"T12:00:00").toLocaleDateString(getTenantDefaultsSync().locale,{day:"numeric",month:"long",year:"numeric"}) : liq.ff.toLocaleDateString(getTenantDefaultsSync().locale,{day:"numeric",month:"long",year:"numeric"});
                  const ini = liq.fi.toLocaleDateString(getTenantDefaultsSync().locale,{day:"numeric",month:"long",year:"numeric"});
                  body=`<h1>PREAVISO DE NO RENOVACIÓN DE CONTRATO</h1><div class="sub" style="text-align:center;font-size:8.5pt;color:#888;margin-bottom:16px">Contrato a término fijo · Art. 46 CST</div><div class="body"><p>Bogotá D.C., ${hoy}</p><br/><p>Señor(a)<br/><b>${selN.nombre}</b><br/>C.C. ${(selN.cc||"").replace(/\D/g,"")}<br/>Cargo: ${selN.cargo}</p><div style="margin:14px 0;padding:10px 14px;background:#FAFAF7;border-left:3px solid #111;font-size:9.5pt"><b>Referencia:</b> No prórroga del contrato de trabajo a término fijo suscrito el ${ini}.</div><p>Por medio de la presente le comunicamos, con una antelación no inferior a treinta (30) días, la decisión de <b>${getActiveCompanyLegalDataSync().legalName}</b> de <b>no renovar ni prorrogar</b> su contrato de trabajo a término fijo, el cual terminará en su fecha de vencimiento pactada, esto es, el <b>${venc}</b> (Art. 46 CST).</p><br/><p>Por tratarse de una terminación legal por vencimiento del plazo pactado, no hay lugar a indemnización. La liquidación definitiva de sus prestaciones sociales le será entregada a la terminación del contrato.</p><br/><p>Agradecemos su aporte durante el tiempo de vinculación.</p></div><div class="cierre"><p>Atentamente,</p><div class="sig"><div>Empleador<br/><b>${getActiveCompanyLegalDataSync().legalName}</b><br/>NIT: ${getActiveCompanyLegalDataSync().taxId}</div><div>Recibido — Trabajador<br/><b>${selN.nombre}</b></div></div></div><div class="foot">Habitaris Suite · ${hoy}</div>`;
                } else if(d.id==="carta"){
                  body=`<h1>CARTA DE TERMINACIÓN Y LIQUIDACIÓN</h1><div class="body"><p>Bogotá D.C., ${hoy}</p><br/><p>Señor(a) <b>${selN.nombre}</b><br/>C.C. ${(selN.cc||"").replace(/\D/g,"")}</p><br/><p>Comunicamos la terminación de su contrato <b>${motivo}</b>, efectiva el <b>${liq.ff.toLocaleDateString(getTenantDefaultsSync().locale,{day:"numeric",month:"long",year:"numeric"})}</b>.</p><br/><p>Cargo: <b>${selN.cargo}</b> · Ingreso: <b>${liq.fi.toLocaleDateString(getTenantDefaultsSync().locale,{day:"numeric",month:"long",year:"numeric"})}</b> · ${liq.diasTot} días trabajados.</p></div><table><thead><tr><th>Concepto</th><th class="r">Valor</th><th>Base legal</th></tr></thead><tbody>${liq.items.map(i=>"<tr><td>"+i.c+"</td><td class='r'>"+fmt(i.v)+"</td><td style='font-size:8pt;color:#666'>"+i.n+"</td></tr>").join("")}<tr class="tot"><td>TOTAL A PAGAR</td><td class="r">${fmt(liq.total)}</td><td></td></tr></tbody></table><div class="sig"><div>Empleador<br/><b>${getActiveCompanyLegalDataSync().legalName}</b></div><div>Trabajador<br/><b>${selN.nombre}</b></div></div><div class="foot">Habitaris Suite · ${hoy}</div>`;
                } else if(d.id==="paz"){
                  body=`<h1>PAZ Y SALVO</h1><div class="body"><p><b>${getActiveCompanyLegalDataSync().legalName}</b> certifica que <b>${selN.nombre}</b>, C.C. ${(selN.cc||"").replace(/\D/g,"")}, quien laboró como <b>${selN.cargo}</b> desde el ${liq.fi.toLocaleDateString(getTenantDefaultsSync().locale,{day:"numeric",month:"long",year:"numeric"})} hasta el ${liq.ff.toLocaleDateString(getTenantDefaultsSync().locale,{day:"numeric",month:"long",year:"numeric"})}, se encuentra a <b>PAZ Y SALVO</b>:</p></div><div class="checks"><p>☑ Salarios y prestaciones sociales</p><p>☑ Liquidación final</p><p>☑ Vacaciones</p><p>☑ Dotación y herramientas</p><p>☑ Documentos y archivos</p><p>☑ Llaves y accesos</p></div><div class="body"><p>Bogotá D.C., ${hoy}</p></div><div class="sig"><div>Empleador<br/><b>${getActiveCompanyLegalDataSync().legalName}</b></div><div>Trabajador<br/><b>${selN.nombre}</b></div></div><div class="foot">Habitaris Suite · ${hoy}</div>`;
                } else if(d.id==="cesantias"){
                  body=`<h1>CARTA DE RETIRO DE CESANTÍAS</h1><div class="body"><p>Bogotá D.C., ${hoy}</p><br/><p>Señores<br/><b>${selN.pen||"Fondo de Cesantías"}</b></p><br/><p>Ref: Retiro de cesantías por terminación de contrato</p><br/><p><b>${getActiveCompanyLegalDataSync().legalName}</b>, NIT ${getActiveCompanyLegalDataSync().taxId}, certifica que <b>${selN.nombre}</b>, C.C. <b>${(selN.cc||"").replace(/\D/g,"")}</b>, laboró desde el <b>${liq.fi.toLocaleDateString(getTenantDefaultsSync().locale,{day:"numeric",month:"long",year:"numeric"})}</b> hasta el <b>${liq.ff.toLocaleDateString(getTenantDefaultsSync().locale,{day:"numeric",month:"long",year:"numeric"})}</b> (${liq.diasTot} días).</p><br/><p>La relación laboral terminó <b>${motivo}</b>. El monto de cesantías proporcionales: <b>${fmt(liq.ces)}</b> (Art. 249 CST).</p><br/><p>Solicitamos autorizar el retiro de cesantías a favor del trabajador.</p></div><div class="sig"><div>Representante Legal<br/><b>${getActiveCompanyLegalDataSync().legalName}</b></div><div>Trabajador<br/><b>${selN.nombre}</b></div></div><div class="foot">Habitaris Suite · ${hoy}</div>`;
                } else if(d.id==="cert_con"){
                  body=`<h1>CERTIFICACIÓN LABORAL</h1><div class="body"><p>El suscrito representante legal de <b>${getActiveCompanyLegalDataSync().legalName}</b>, NIT ${getActiveCompanyLegalDataSync().taxId}, certifica que:</p><br/><p><b>${selN.nombre}</b>, C.C. No. <b>${(selN.cc||"").replace(/\D/g,"")}</b>, ${selN.fechaIngreso?"laboró":"labora"} en esta empresa desde el <b>${liq.fi.toLocaleDateString(getTenantDefaultsSync().locale,{day:"numeric",month:"long",year:"numeric"})}</b>, desempeñando el cargo de <b>${selN.cargo}</b>.</p><br/><p>El trabajador devenga un salario mensual de <b>${fmt(selN.sal)}</b>${liq.aux>0?" (más auxilio de transporte de "+fmt(liq.aux)+")":""}.</p><br/><p>Se expide a solicitud del interesado en Bogotá D.C., ${hoy}.</p></div><div class="sig"><div><br/><b>Representante Legal</b><br/>${getActiveCompanyLegalDataSync().legalName}</div></div><div class="foot">Habitaris Suite · ${hoy}</div>`;
                } else {
                  body=`<h1>CERTIFICACIÓN LABORAL</h1><div class="body"><p>El suscrito representante legal de <b>${getActiveCompanyLegalDataSync().legalName}</b>, NIT ${getActiveCompanyLegalDataSync().taxId}, certifica que:</p><br/><p><b>${selN.nombre}</b>, C.C. No. <b>${(selN.cc||"").replace(/\D/g,"")}</b>, ${selN.fechaIngreso?"laboró":"labora"} en esta empresa desde el <b>${liq.fi.toLocaleDateString(getTenantDefaultsSync().locale,{day:"numeric",month:"long",year:"numeric"})}</b>, desempeñando el cargo de <b>${selN.cargo}</b>.</p><br/><p>Se expide a solicitud del interesado en Bogotá D.C., ${hoy}.</p></div><div class="sig"><div><br/><b>Representante Legal</b><br/>${getActiveCompanyLegalDataSync().legalName}</div></div><div class="foot">Habitaris Suite · ${hoy}</div>`;
                }
                openPreview(d.lbl, body, fn, d.id==="preaviso");
              }} style={{width:"100%",padding:"7px 10px",fontSize:11,fontWeight:600,border:`1px solid ${d.color}`,borderRadius:6,background:d.bg,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",color:d.color,marginBottom:4,textAlign:"left"}}>
                {d.icon} {d.lbl}
              </button>
            ))}
          </Card>
        </div>

        {/* Derecha: Desglose */}
        <Card accent={tipoInfo.color}>
          <STit>Desglose de la liquidación</STit>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead>
              <tr style={{borderBottom:`2px solid ${T.ink}`}}>
                <th style={{padding:"6px 8px",textAlign:"left",fontSize:9,fontWeight:700,color:T.inkLight,letterSpacing:.8,textTransform:"uppercase"}}>Concepto</th>
                <th style={{padding:"6px 8px",textAlign:"right",fontSize:9,fontWeight:700,color:T.inkLight,letterSpacing:.8,textTransform:"uppercase"}}>Valor</th>
                <th style={{padding:"6px 8px",textAlign:"left",fontSize:9,fontWeight:700,color:T.inkLight,letterSpacing:.8,textTransform:"uppercase"}}>Base legal</th>
              </tr>
            </thead>
            <tbody>
              {liq.items.map((item,i)=>(
                <tr key={i} style={{borderBottom:`1px solid ${T.border}`,background:item.c.includes("Indemnización")?T.redBg:"transparent"}}>
                  <td style={{padding:"6px 8px"}}>{item.c}</td>
                  <td style={{padding:"6px 8px",textAlign:"right",fontFamily:"'DM Mono',monospace",fontWeight:600,fontSize:13}}>{fmt(item.v)}</td>
                  <td style={{padding:"6px 8px",fontSize:10,color:T.inkMid}}>{item.n}</td>
                </tr>
              ))}
              <tr style={{borderTop:`2px solid ${T.ink}`,background:T.greenBg}}>
                <td style={{padding:"8px",fontSize:14,fontWeight:800}}>TOTAL A PAGAR</td>
                <td style={{padding:"8px",textAlign:"right",fontFamily:"'DM Mono',monospace",fontWeight:800,fontSize:20,color:T.green}}>{fmt(liq.total)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>

          {/* Fórmulas */}
          <div style={{marginTop:14,padding:"10px 12px",background:T.surface,borderRadius:6,fontSize:10,color:T.inkMid,lineHeight:1.6}}>
            <strong style={{color:T.ink}}>📐 Fórmulas aplicadas</strong>
            <div>Vacaciones = Sal × {liq.diasTot}d ÷ 720 = {fmt(liq.vac)}</div>
            <div>Prima = (Sal+Aux) × {liq.diasSem}d sem ÷ 360 = {fmt(liq.prima)}</div>
            <div>Cesantías = (Sal+Aux) × {liq.diasTot}d ÷ 360 = {fmt(liq.ces)}</div>
            <div>Int. cesantías = {fmt(liq.ces)} × {liq.diasTot}d × 12% ÷ 360 = {fmt(liq.intCes)}</div>
            {liq.indem>0&&<div style={{color:T.red,fontWeight:600}}>Indemnización ({liq.isFijo?"término fijo":"indefinido"}) = {fmt(liq.indem)}</div>}
          </div>
        </Card>
      </div>
    </div>
  );
}

export function TabNomina(){
  const hoy=new Date();
  const[anio,setAnio]=useState(hoy.getFullYear());
  const[mes,setMes]=useState(hoy.getMonth());
  const[estadosAnio,setEstadosAnio]=useState({});
  const[noms,setNoms]=useState([]);
  const[loading,setLoading]=useState(true);
  const[guard,setGuard]=useState(false);
  const[sel,setSel]=useState(null);
  const[vista,setVista]=useState("lista");
  const[subTab,setSubTab]=useState("nomina");
  const[pagoForm,setPagoForm]=useState(null); // null=hidden, {tipo:"q1"|"nomina", ref:"", soporte:null}
  const holidays=useMemo(()=>getHolidays(anio),[anio]);
  const festivosMes=holidays.filter(h=>h.date.getMonth()===mes);
  const [novDias,setNovDias]=useState({});  // {dayKey: novType}
  const [selNovTipo,setSelNovTipo]=useState("incapacidad");
  // Imputaciónes OOTT: se persisten dentro de cada nómina mensual como selN.impDias
  // (mismo patrón que selN.novDias). Un día puede tener novedad Y/O imputación —
  // son ortogonales: la novedad reduce días salariales, la imputación dice a qué OT
  // imputar las horas trabajadas. No interfieren en cálculos de nómina.
  const [modoCal,setModoCal]=useState("novedad"); // "novedad" | "imputacion" (mantenido por compatibilidad, ya no se usa en UI)
  // Sprint UX-1: modal contextual al clicar día. null = cerrado, {day, k} = abierto sobre ese día
  const [dayEditor,setDayEditor]=useState(null);
  // Sprint OOTT: modo edicion de imputaciones para meses ya pagados.
  // Cuando esta activo, el calendario se vuelve clickable aunque selN.estado=="pagada".
  // Solo deberia tocar las imputaciones de OT (informativas, no afectan cálculo de nomina).
  const [modoEditarImp,setModoEditarImp]=useState(false);
  // Adjuntos de novedades del mes en curso: objeto { "<empId>:<fechaKey>": [{name,size,data}] }.
  // Se persiste en kv_store con clave hab:nov_adjuntos:<anio>:<mes> (mismo mecanismo que soporte de pago).
  const [novAdjuntos,setNovAdjuntos]=useState({});
  const [adjUploading,setAdjUploading]=useState(false);
  const [adjDrag,setAdjDrag]=useState(false); // true mientras se arrastra un archivo sobre la zona de adjuntar
  // Justificantes de pago del mes. kv_store hab:soporte_pago:<anio>:<mes>.
  // Formato antiguo: objeto plano {empId,tipo,ref,archivo,data}. Formato nuevo: { "<empId>:<tipo>": {ref,archivo,data} }.
  const [soportesPago,setSoportesPago]=useState({});
  // Fichaje habilitado en días de descanso (domingo/festivo). kv_store hab:fichaje_habilitado:<anio>:<mes>.
  // Estructura { "<empId>:<fecha>": true }. El admin lo activa desde el calendario para que el
  // trabajador pueda fichar ese día de descanso desde su portal (vía administrativos, opción 2).
  const [fichajeHab,setFichajeHab]=useState({});
  const [rangoFin,setRangoFin]=useState(""); // fecha fin del rango de novedad
  const [modoNov,setModoNov]=useState("dia"); // "dia" = solo este día | "rango" = fecha inicio→fin
  const [rangoInicio,setRangoInicio]=useState(""); // fecha inicio editable del rango (por defecto el día clicado)
  const [notaNov,setNotaNov]=useState(""); // nota manual (motivo) al registrar la novedad
  // Centros de Trabajo (OTs) cargados desde BD. Cada centro: {id, codigo, nombre, activo, empleados:[uuid]}.
  // Las OTs disponibles para imputar a un empleado se filtran por activo=true AND selN.empId IN empleados.
  const [centros,setCentros]=useState([]);
  const [selOtt,setSelOtt]=useState(""); // se inicializa al primer OT disponible del empleado seleccionado
  const [novHist,setNovHist]=useState([]);
  const [novYear,setNovYear]=useState(hoy.getFullYear());
  const [buscar,setBuscar]=useState("");
  const [sortBy,setSortBy]=useState("nombre");
  const [sortDir,setSortDir]=useState("asc");

  useEffect(()=>{
    setLoading(true);
    const hols=getHolidays(anio);
    // Count festivos on work days (Mon-Sat) for this month
    const festCount=hols.filter(h=>h.date.getMonth()===mes&&h.date.getDay()!==0).length;
    Promise.all([fetchEmps(),loadN(anio,mes),loadN(mes===0?anio-1:anio,mes===0?11:mes-1),loadEmpMaestro()]).then(async ([emps,saved,prevSaved,maestro])=>{
      const ex=saved||[];
      const lista=emps.map(e=>{const f=ex.find(n=>n.empId===e.id);if(f){if(f.festMes===undefined)f.festMes=festCount;if(!f.fechaFinContrato)f.fechaFinContrato=e.fecha_fin_contrato||"";if(!f.duracionMeses)f.duracionMeses=e.duracion_meses||0;if(!f.fechaIngreso)f.fechaIngreso=e.fecha_inicio||"";if(!f.tipoContrato)f.tipoContrato=e.tipo_contrato||"";if(!f.banco)f.banco=((maestro||[]).find(x=>x.empId===e.id)?.banco)||((prevSaved||[]).find(x=>x.empId===e.id)?.banco)||e.candidato_banco||"";if(!f.cuenta)f.cuenta=((maestro||[]).find(x=>x.empId===e.id)?.cuenta)||((prevSaved||[]).find(x=>x.empId===e.id)?.cuenta)||e.candidato_numero_cuenta||"";if(!f.tipoCuenta)f.tipoCuenta=((maestro||[]).find(x=>x.empId===e.id)?.tipoCuenta)||((prevSaved||[]).find(x=>x.empId===e.id)?.tipoCuenta)||e.candidato_tipo_cuenta||"";if(!f.modalidadPago){f.modalidadPago=e.modalidad_pago||"quincenal";if(f.modalidadPago==="mensual"&&f.q1Pct>0)f.q1Pct=0;}return f;}
        return{id:uid(),empId:e.id,nombre:e.candidato_nombre||"",cc:e.candidato_cc||"",cargo:e.cargo||"",sal:e.salario_base||SMLMV,bono:e.bono_no_salarial||0,bonoConcepto:e.bono_concepto||"",bonoPrest:e.bono_es_salarial||false,dias:30,festMes:festCount,reg:e.regimen_salud||"contributivo",arl:e.arl_nivel||0,ex114:true,q1Pct:(e.modalidad_pago||"quincenal")==="mensual"?0:0.5,modalidadPago:e.modalidad_pago||"quincenal",hexD:0,hexN:0,hexDD:0,hexDN:0,festLab:0,diasIncap:0,diasLicRem:0,diasLicNoRem:0,diasVac:0,diasAusencia:0,novNotas:{},otrosIng:0,otrasDed:0,nov:"",estado:"borrador",eps:e.candidato_eps||"",pen:e.candidato_pension||"",banco:e.candidato_banco||"",cuenta:e.candidato_numero_cuenta||"",tipoCuenta:e.candidato_tipo_cuenta||"",fechaIngreso:e.fecha_inicio||"",tipoContrato:e.tipo_contrato||"Término fijo",duracionMeses:e.duracion_meses||0,fechaFinContrato:e.fecha_fin_contrato||"",auxT:e.auxilio_transporte||AUX_TR,netoRef:e.salario_neto||0,anio,mes};});
      // Condiciones con fecha de vigencia (ARL, salario, etc.): para meses NO pagados,
      // los valores salen de la condición vigente en ese mes, no del valor crudo de la ficha.
      // Mes pagado = inmutable: se respeta lo que se liquidó. Si algo falla, queda como hoy.
      try{
        const conds=await Promise.all(lista.map(n=>loadCond(n.empId)));
        lista.forEach((n,i)=>{
          if(n.estado==="pagada")return;
          const vig=condicionVigente(conds[i]||[],anio,mes);
          Object.keys(vig).forEach(k=>{ if(k!=="_nota") n[k]=vig[k]; });
        });
      }catch(_){/* sin condiciones: se usan los valores de la ficha, como hoy */}
      setNoms(lista);setLoading(false);
    });
    // Cargar adjuntos de novedades del mes (kv_store). Aislado: si falla, queda {}.
    fetch("/api/hiring?kv=nov_adjuntos&anio="+anio+"&mes="+mes).then(r=>r.json()).then(d=>{
      setNovAdjuntos(d.ok && d.data && !Array.isArray(d.data) ? d.data : {});
    }).catch(()=>setNovAdjuntos({}));
    // Cargar justificantes de pago del mes. Normaliza formato antiguo (plano) a indexado {empId:tipo}.
    fetch("/api/hiring?kv=soporte_pago&anio="+anio+"&mes="+mes).then(r=>r.json()).then(d=>{
      const raw = d.ok && d.data && !Array.isArray(d.data) ? d.data : {};
      // Formato antiguo: tiene empId+tipo a nivel raíz → migrar a clave indexada
      if (raw.empId && raw.tipo) {
        setSoportesPago({ [raw.empId+":"+raw.tipo]: {ref:raw.ref,archivo:raw.archivo,data:raw.data} });
      } else {
        setSoportesPago(raw);
      }
    }).catch(()=>setSoportesPago({}));
    // Cargar fichajes habilitados en días de descanso del mes.
    fetch("/api/hiring?kv=fichaje_habilitado&anio="+anio+"&mes="+mes).then(r=>r.json()).then(d=>{
      setFichajeHab(d.ok && d.data && !Array.isArray(d.data) ? d.data : {});
    }).catch(()=>setFichajeHab({}));
  },[anio,mes]);

  // Barra de progreso del año: estados de los 12 meses (una sola query al cambiar de año o guardar)
  useEffect(()=>{
    fetch("/api/hiring?estados_anio="+anio).then(r=>r.json()).then(d=>{
      const m={}; (d.ok&&Array.isArray(d.data)?d.data:[]).forEach(x=>{m[x.mes]=x.estado;});
      setEstadosAnio(m);
    }).catch(()=>setEstadosAnio({}));
  },[anio,noms]);


    // Helper: dado un día del mes (1..31), devuelve la letra del día de la semana en formato L M X J V S D
  // (Lunes=L, Martes=M, Miércoles=X, Jueves=J, Viernes=V, Sábado=S, Domingo=D)
  // Hacemos esto para que coincida con DIAS_SEM del módulo TabPersonal (RRHH.jsx).
  const diaSemanaLetra = (a,m,d) => {
    const dow = new Date(a, m, d).getDay(); // 0=Dom, 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie, 6=Sáb
    return ["D","L","M","X","J","V","S"][dow];
  };

  // aplicaBaseAEmpleado(n): recorre el mes del empleado n y devuelve impDias auto-generadas
  // desde sus calendarios base. Salta domingos, festivos y días con novedad existente.
  // Si un día está cubierto por varios calendarios → devuelve "__conflicto__" para ese día,
  // lo que dispara el render visual de conflicto.
  const aplicaBaseAEmpleado = (n) => {
    // Recorrer centros y juntar calendarios donde este empleado este asignado.
    // Cada centro tiene array opcional "calendarios" con {id, dias, entrada, salida, empleados:[], vigencia_*}.
    const cals = [];
    for (const c of centros) {
      if (!Array.isArray(c.calendarios)) continue;
      for (const cal of c.calendarios) {
        if (Array.isArray(cal.empleados) && cal.empleados.includes(n.empId)) {
          cals.push({ ...cal, otId: c.id });
        }
      }
    }
    if (cals.length === 0) return {};
    const hols = getHolidays(n.anio);
    const totalDays = new Date(n.anio, n.mes+1, 0).getDate();
    const novDias = n.novDias || {};
    const result = {};
    for (let d = 1; d <= totalDays; d++) {
      const date = new Date(n.anio, n.mes, d);
      const dow = date.getDay();
      if (dow === 0) continue; // domingo: descanso
      if (hols.find(h => sameDay(h.date, date))) continue; // festivo: descanso
      const k = n.anio+"-"+String(n.mes+1).padStart(2,"0")+"-"+String(d).padStart(2,"0");
      if (novDias[k]) continue; // novedad ya registrada, no auto-imputar
      const letra = diaSemanaLetra(n.anio, n.mes, d);
      // Buscar calendarios cuya vigencia incluye este día y tienen esta letra
      const aplicables = cals.filter(c => {
        if (!Array.isArray(c.dias) || !c.dias.includes(letra)) return false;
        if (c.vigencia_desde && k < c.vigencia_desde) return false;
        if (c.vigencia_hasta && k > c.vigencia_hasta) return false;
        return true;
      });
      if (aplicables.length === 1) {
        result[k] = aplicables[0].otId;
      } else if (aplicables.length > 1) {
        result[k] = "__conflicto__"; // marcador especial para render visual
      }
    }
    return result;
  };

  // Una vez cargados los centros (con sus calendarios) y las nóminas, aplicar el calendario base
  // SOLO a los empleados cuyo impDias está vacío (primera vez que se abre el mes).
  // Cumple la opción 2: "auto-aplica primera vez, respeta cambios manuales".
  useEffect(()=>{
    if (centros.length === 0) return;
    if (noms.length === 0) return;
    setNoms(prev => prev.map(n => {
      const tieneImp = n.impDias && Object.keys(n.impDias).length > 0;
      if (tieneImp) return n; // ya tiene imputaciones manuales, no tocar
      // Verificar rápido si el empleado tiene algún calendario asignado en algún centro
      const tieneCals = centros.some(c =>
        Array.isArray(c.calendarios) &&
        c.calendarios.some(cal => Array.isArray(cal.empleados) && cal.empleados.includes(n.empId))
      );
      if (!tieneCals) return n;
      const autoImp = aplicaBaseAEmpleado(n);
      if (Object.keys(autoImp).length === 0) return n;
      return { ...n, impDias: autoImp };
    }));
  },[centros, noms.length, anio, mes]);

  // Cargar Centros de Trabajo (OTs) una vez al montar. Se filtran después por empleado.
  useEffect(()=>{
    fetch("/api/hiring?kv=centros&anio=0&mes=0").then(r=>r.json()).then(d=>{
      if(d.ok && Array.isArray(d.data)) setCentros(d.data);
    }).catch(()=>setCentros([]));
  },[]);

  const selN=useMemo(()=>noms.find(n=>n.id===sel),[noms,sel]);
  // Emite el período (mes/año) y si está cerrado (todas las nóminas del mes pagadas/liquidadas)
  useEffect(()=>{
    const cerrado = noms.length>0 && noms.every(n=>n.estado==="pagada"||n.estado==="liquidada");
    try{ window.dispatchEvent(new CustomEvent("hab:nomina:periodo",{detail:{label:`${MESES[mes]} ${anio}`,cerrado}})); }catch(e){}
  },[mes,anio,noms]);
  useEffect(()=>()=>{ try{ window.dispatchEvent(new CustomEvent("hab:nomina:periodo",{detail:null})); }catch(e){} },[]);
  const calc=useMemo(()=>selN?calcN({...selN,horasMes:calcHorasMesEmp(selN.empId,anio,mes,centros)}):null,[selN,anio,mes,centros]);
  const upd=(id,f)=>setNoms(p=>p.map(n=>n.id===id?{...n,...f}:n));
  const guardar=async()=>{setGuard(true);await saveN(anio,mes,noms);setGuard(false);};
  const totN=noms.reduce((s,n)=>s+calcN(n).neto,0);
  const totC=noms.reduce((s,n)=>s+calcN(n).costoT,0);
  const totQ1=noms.reduce((s,n)=>s+calcN(n).q1,0);
  const totQ2=noms.reduce((s,n)=>s+calcN(n).q2,0);

  // Reporte de Conciliación Contable Mensual (consolidado, todos los empleados activos)
  // Pensado para que David valide contra los recibos PILA del contador.
  // Aplica Lógica B: festivos y novedades al centro base de cada empleado.
  const genConciliaciónMensualHtml = () => {
    if (!noms || noms.length === 0) return null;
    const fmtCurr = v => new Intl.NumberFormat(getTenantDefaultsSync().locale,{style:"currency",currency:"COP",maximumFractionDigits:0}).format(v||0);
    const fmtPct = v => (v||0).toFixed(1) + "%";
    const ultDiaMes = new Date(anio, mes+1, 0).getDate();
    const fechaAStr = (f) => `${f.getFullYear()}-${String(f.getMonth()+1).padStart(2,"0")}-${String(f.getDate()).padStart(2,"0")}`;
    const dowMap = ["D","L","M","X","J","V","S"];
    // Calendario base por empleado: dado fechaStr+empId devuelve el centro base
    const centroBaseParaFechaEmp = (fechaStr, empId) => {
      const d = new Date(fechaStr + "T12:00:00");
      const diaSem = dowMap[d.getDay()];
      for (const c of (centros||[])) {
        if (c.activo === false) continue;
        for (const cal of (c.calendarios||[])) {
          if (!Array.isArray(cal.dias)) continue;
          if (!cal.dias.includes(diaSem)) continue;
          const emps = cal.empleados || c.empleados || [];
          if (!emps.includes(empId)) continue;
          if (cal.vigencia_desde && fechaStr < cal.vigencia_desde) continue;
          if (cal.vigencia_hasta && fechaStr > cal.vigencia_hasta) continue;
          return c.id;
        }
      }
      return null;
    };

    // === AGREGADOS A NIVEL MES (consolidado) ===
    // Lista de empleados con sus calc y dias agregados por OT (Lógica B)
    const empleados = noms.map(n => {
      const c = calcN(n);
      const iDias = n.impDias || {};
      const nDias = n.novDias || {};
      // Acumular dias por OT con desglose trab/fest/nov
      const diasOT = {};
      const vistos = new Set();
      const bump = (otId, tipo) => {
        if (!diasOT[otId]) diasOT[otId] = {trab:0, fest:0, nov:0, total:0};
        diasOT[otId][tipo]++;
        diasOT[otId].total++;
      };
      // 1) Imputaciónes manuales = trabajados
      Object.entries(iDias).forEach(([k, otId]) => {
        if (!otId || otId === "__conflicto__") return;
        bump(otId, "trab");
        vistos.add(k);
      });
      // 2) Festivos del mes - centro base del empleado
      festivosMes.forEach(h => {
        const k = fechaAStr(h.date);
        if (vistos.has(k)) return;
        const cId = centroBaseParaFechaEmp(k, n.empId);
        if (cId) { bump(cId, "fest"); vistos.add(k); }
      });
      // 3) Novedades - centro base del empleado
      Object.entries(nDias).forEach(([k, tipoNov]) => {
        if (vistos.has(k) || tipoNov === "normal") return;
        const cId = centroBaseParaFechaEmp(k, n.empId);
        if (cId) { bump(cId, "nov"); vistos.add(k); }
      });
      return { n, calc: c, diasOT };
    });

    // Totales mes
    const totDev = empleados.reduce((s,e) => s + e.calc.dev, 0);
    const totDed = empleados.reduce((s,e) => s + e.calc.totD, 0);
    const totNeto = empleados.reduce((s,e) => s + e.calc.neto, 0);
    const totQ1m = empleados.reduce((s,e) => s + e.calc.q1, 0);
    const totQ2m = empleados.reduce((s,e) => s + e.calc.q2, 0);
    // Aportes empresa CAJA (PILA). Redondeo a centena superior por concepto agregado
    // (trabajador+empleador), regla MiPlanilla. La diferencia la asume la empresa: la
    // deducción del trabajador (totDed) NO se modifica.
    const apSalud = ceil100(empleados.reduce((s,e) => s + e.calc.epsEr + e.calc.epsE, 0)) - empleados.reduce((s,e) => s + e.calc.epsE, 0);
    const apPensión = ceil100(empleados.reduce((s,e) => s + e.calc.penEr + e.calc.penE, 0)) - empleados.reduce((s,e) => s + e.calc.penE, 0);
    const apArl = ceil100(empleados.reduce((s,e) => s + e.calc.arlV, 0));
    const apCaja = ceil100(empleados.reduce((s,e) => s + e.calc.caja, 0));
    const apIcbf = ceil100(empleados.reduce((s,e) => s + e.calc.icbf, 0));
    const apSena = ceil100(empleados.reduce((s,e) => s + e.calc.sena, 0));
    const totSegSocial = apSalud + apPensión + apArl + apCaja + apIcbf + apSena;
    // Provisiones
    const prPrima = empleados.reduce((s,e) => s + e.calc.prima, 0);
    const prCes = empleados.reduce((s,e) => s + e.calc.ces, 0);
    const prIntC = empleados.reduce((s,e) => s + e.calc.intC, 0);
    const prVac = empleados.reduce((s,e) => s + e.calc.vac, 0);
    const totProvisiones = prPrima + prCes + prIntC + prVac;
    // Totales por categoria
    const totCaja = totQ1m + totQ2m + totDed + totSegSocial;
    const totCostoEmp = totCaja + totProvisiones;

    // Distribución consolidada por OT (todos los empleados)
    const consolidadoOT = {};
    const bumpCons = (otId, tipo, monto) => {
      if (!consolidadoOT[otId]) {
        const c = centros.find(x => x.id === otId);
        consolidadoOT[otId] = {
          id: otId,
          codigo: c ? c.codigo : otId,
          nombre: c ? c.nombre : "(OT no encontrada)",
          trab: 0, fest: 0, nov: 0, total: 0,
          costo: 0
        };
      }
      consolidadoOT[otId][tipo]++;
      consolidadoOT[otId].total++;
    };
    empleados.forEach(e => {
      const totalDiasEmp = Object.values(e.diasOT).reduce((s,d) => s + d.total, 0);
      Object.entries(e.diasOT).forEach(([otId, dias]) => {
        if (!consolidadoOT[otId]) {
          const c = centros.find(x => x.id === otId);
          consolidadoOT[otId] = {
            id: otId,
            codigo: c ? c.codigo : otId,
            nombre: c ? c.nombre : "(OT no encontrada)",
            trab: 0, fest: 0, nov: 0, total: 0,
            costo: 0
          };
        }
        consolidadoOT[otId].trab += dias.trab;
        consolidadoOT[otId].fest += dias.fest;
        consolidadoOT[otId].nov += dias.nov;
        consolidadoOT[otId].total += dias.total;
        // Imputar costo proporcional del empleado
        if (totalDiasEmp > 0) {
          const pctEmp = dias.total / totalDiasEmp;
          consolidadoOT[otId].costo += e.calc.costoT * pctEmp;
        }
      });
    });
    const otsCons = Object.values(consolidadoOT).sort((a,b) => (a.codigo||"").localeCompare(b.codigo||""));
    const totDiasCons = otsCons.reduce((s,o) => s + o.total, 0);

    // === HTML ===
    const tenantId = getTenantIdentitySync();
    const legal = getActiveCompanyLegalDataSync();
    const empresaName = legal.legalName || tenantId.legalName || "";
    const empresaNit = legal.taxId || "";
    const fileName = `CONCILIACION-${MESES[mes].toUpperCase()}${String(anio).slice(-2)}-${(tenantId.slug||"empresa").toUpperCase()}`;

    let bloqueEmpleados = `<table style="font-size:8.5pt"><thead><tr style="background:#F5F4F1"><th>Empleado</th><th>CC</th><th style="text-align:right">Devengado</th><th style="text-align:right">Deducc.</th><th style="text-align:right">Neto</th><th style="text-align:right">Q1</th><th style="text-align:right">Q2</th><th style="text-align:right">Aportes</th><th style="text-align:right">Provis.</th><th style="text-align:right">Costo total</th></tr></thead><tbody>`;
    empleados.forEach(e => {
      // Aporte PILA del empleado, redondeado a centena superior por concepto agregado (trab+emp).
      const apE = (ceil100(e.calc.epsEr + e.calc.epsE) - e.calc.epsE)
                + (ceil100(e.calc.penEr + e.calc.penE) - e.calc.penE)
                + ceil100(e.calc.arlV) + ceil100(e.calc.caja) + ceil100(e.calc.icbf) + ceil100(e.calc.sena);
      const prE = e.calc.prima + e.calc.ces + e.calc.intC + e.calc.vac;
      bloqueEmpleados += `<tr><td><b>${e.n.nombre||""}</b></td><td>${e.n.cc||""}</td><td style="text-align:right;font-family:monospace">${fmtCurr(e.calc.dev)}</td><td style="text-align:right;font-family:monospace;color:#B91C1C">-${fmtCurr(e.calc.totD)}</td><td style="text-align:right;font-family:monospace"><b>${fmtCurr(e.calc.neto)}</b></td><td style="text-align:right;font-family:monospace">${fmtCurr(e.calc.q1)}</td><td style="text-align:right;font-family:monospace">${fmtCurr(e.calc.q2)}</td><td style="text-align:right;font-family:monospace">${fmtCurr(apE)}</td><td style="text-align:right;font-family:monospace">${fmtCurr(prE)}</td><td style="text-align:right;font-family:monospace"><b>${fmtCurr(e.calc.costoT)}</b></td></tr>`;
    });
    bloqueEmpleados += `<tr style="background:#111;color:#fff;font-weight:700"><td colspan="2">TOTAL ${empleados.length} EMPLEADO${empleados.length===1?"":"S"}</td><td style="text-align:right;font-family:monospace">${fmtCurr(totDev)}</td><td style="text-align:right;font-family:monospace">-${fmtCurr(totDed)}</td><td style="text-align:right;font-family:monospace">${fmtCurr(totNeto)}</td><td style="text-align:right;font-family:monospace">${fmtCurr(totQ1m)}</td><td style="text-align:right;font-family:monospace">${fmtCurr(totQ2m)}</td><td style="text-align:right;font-family:monospace">${fmtCurr(totSegSocial)}</td><td style="text-align:right;font-family:monospace">${fmtCurr(totProvisiones)}</td><td style="text-align:right;font-family:monospace">${fmtCurr(totCostoEmp)}</td></tr></tbody></table>`;

    // Tabla distribucion consolidada por OT
    let tablaOTCons = `<table><thead><tr><th>CT</th><th>Centro / Proyecto</th><th style="text-align:right">Trab.</th><th style="text-align:right">Fest.</th><th style="text-align:right">Nov.</th><th style="text-align:right">Días-Emp.</th><th style="text-align:right">%</th><th style="text-align:right">Costo total imputado</th></tr></thead><tbody>`;
    otsCons.forEach(o => {
      const pct = totDiasCons > 0 ? (o.total / totDiasCons) * 100 : 0;
      tablaOTCons += `<tr><td><b>${o.codigo}</b></td><td>${o.nombre}</td><td style="text-align:right;color:#444">${o.trab}</td><td style="text-align:right;color:#92400E">${o.fest||""}</td><td style="text-align:right;color:#B91C1C">${o.nov||""}</td><td style="text-align:right"><b>${o.total}</b></td><td style="text-align:right">${fmtPct(pct)}</td><td style="text-align:right;font-family:monospace"><b>${fmtCurr(o.costo)}</b></td></tr>`;
    });
    const tTcons = otsCons.reduce((s,o)=>s+o.trab,0);
    const tFcons = otsCons.reduce((s,o)=>s+o.fest,0);
    const tNcons = otsCons.reduce((s,o)=>s+o.nov,0);
    const totCostoOT = otsCons.reduce((s,o)=>s+o.costo,0);
    tablaOTCons += `<tr style="background:#111;color:#fff"><td colspan="2"><b>TOTAL</b></td><td style="text-align:right">${tTcons}</td><td style="text-align:right">${tFcons||""}</td><td style="text-align:right">${tNcons||""}</td><td style="text-align:right"><b>${totDiasCons}</b></td><td style="text-align:right"><b>100%</b></td><td style="text-align:right;font-family:monospace"><b>${fmtCurr(totCostoOT)}</b></td></tr></tbody></table>`;

    // Reparto de un monto entre los CT consolidados (según % de días-empleado). Espeja tablaOTs del informe mensual.
    const tablaOTconsMonto = (monto, label) => {
      if (!otsCons.length) return `<div style="padding:8px;background:#FAFAF7;border:1px solid #eee;border-radius:4px;font-size:8pt;color:#999;font-style:italic;text-align:center;margin-bottom:6px">Sin imputaciones</div>`;
      let h = `<table><thead><tr><th>CT</th><th>Centro / Proyecto</th><th style="text-align:right">Días-Emp.</th><th style="text-align:right">%</th><th style="text-align:right">${label}</th></tr></thead><tbody>`;
      otsCons.forEach(o => { const pct = totDiasCons>0?(o.total/totDiasCons)*100:0; h += `<tr><td><b>${o.codigo}</b></td><td>${o.nombre}</td><td style="text-align:right"><b>${o.total}</b></td><td style="text-align:right">${fmtPct(pct)}</td><td style="text-align:right;font-family:monospace"><b>${fmtCurr(monto*pct/100)}</b></td></tr>`; });
      h += `<tr style="background:#111;color:#fff"><td colspan="2"><b>TOTAL</b></td><td style="text-align:right"><b>${totDiasCons}</b></td><td style="text-align:right"><b>100%</b></td><td style="text-align:right;font-family:monospace"><b>${fmtCurr(monto)}</b></td></tr></tbody></table>`;
      return h;
    };

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${fileName}</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"><\/script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"><\/script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Helvetica,Arial,sans-serif;background:#e5e5e5;margin:0;padding:20px 0}
#content{background:#fff;width:794px;margin:0 auto;padding:35px 45px;font-size:9pt;color:#111;line-height:1.35;box-shadow:0 0 8px rgba(0,0,0,.15)}
.hdr{border-bottom:2px solid #111;padding-bottom:6px;margin-bottom:10px;overflow:hidden}
.hdr .l{float:left}.hdr .r{float:right;text-align:right;font-size:8pt;color:#666;padding-top:6px}
.hdr img{height:36px}
h1{font-size:13pt;margin:14px 0 4px;text-align:center;letter-spacing:.5px}
.sub{text-align:center;font-size:9pt;color:#666;margin-bottom:14px}
.meta{display:grid;grid-template-columns:1fr 1fr;gap:6px 18px;margin-bottom:14px;padding:8px 12px;background:#FAFAF7;border:1px solid #eee;border-radius:4px;font-size:9pt}
h2{font-size:10pt;background:#111;color:#fff;padding:5px 10px;margin:14px 0 6px;border-radius:3px}
h3{font-size:9.5pt;margin:8px 0 4px;color:#333}
table{width:100%;border-collapse:collapse;margin:6px 0;font-size:9pt}
th{background:#F5F4F1;padding:5px 8px;text-align:left;font-weight:700;font-size:8.5pt;border-bottom:1px solid #ddd}
td{padding:4px 8px;border-bottom:1px solid #f0f0f0}
.kv{display:flex;justify-content:space-between;padding:3px 6px;font-size:9pt}
.kv .v{font-family:monospace}
.kv.subtot{border-top:1px solid #ccc;font-weight:700;background:#fafafa;padding:5px 6px}
.kv.bigtot{border-top:2px solid #111;font-size:11pt;font-weight:800;background:#111;color:#fff;padding:8px 10px;border-radius:3px;margin-top:6px}
.kv.bigtot .v{color:#fff}
.notebox{background:#FEF9E7;border:1px solid #F4D85E;border-radius:4px;padding:10px 12px;font-size:8.5pt;line-height:1.6;margin-top:10px}
@page{size:A4 portrait;margin:0}table,tr,thead{page-break-inside:avoid;break-inside:avoid}h1,h2,h3{page-break-after:avoid;break-after:avoid}.kv,.kv.bigtot,.info,.notebox,.sig{page-break-inside:avoid;break-inside:avoid}.page-break{page-break-before:always;break-before:page}@media print{html,body{background:#fff;margin:0;padding:0;width:210mm}#content{width:210mm;max-width:none;margin:0;padding:14mm 14mm;box-shadow:none;box-sizing:border-box}}
</style></head><body><div id="content">
<div class="hdr"><div class="l">${empresaName?`<img src="${HAB_LOGO}" style="height:36px"/><div style="font-size:10pt;font-weight:700;margin-top:2px">${empresaName}</div>`:""}</div><div class="r">${empresaName}<br/>${empresaNit ? `NIT: ${empresaNit}` : ""}</div></div>
<h1>INFORME MENSUAL DE LA EMPRESA</h1>
<div class="sub">${MESES[mes]} ${anio} &middot; ${empleados.length} empleado${empleados.length===1?"":"s"} activo${empleados.length===1?"":"s"} &middot; Ref: ${fileName}</div>

<div class="meta">
<div><b>Período:</b> ${MESES[mes]} ${anio} (1 al ${ultDiaMes})</div>
<div><b>Empresa:</b> ${empresaName || "—"}</div>
<div><b>Empleados activos:</b> ${empleados.length}</div>
<div><b>Festivos del mes:</b> ${festivosMes.length}</div>
</div>

<h2>1. RESUMEN DE PLANTILLA</h2>
${bloqueEmpleados}

<h2>2. SALARIO NETO — total plantilla</h2>
<div class="kv"><div class="l">Devengado bruto (todos los empleados)</div><div class="v">${fmtCurr(totDev)}</div></div>
<div class="kv"><div class="l" style="padding-left:12px">&nbsp;&nbsp;(-) Total deducciones empleado (salud + pensión)</div><div class="v">- ${fmtCurr(totDed)}</div></div>
<div class="kv bigtot"><div class="l">NETO TOTAL A LOS TRABAJADORES</div><div class="v">${fmtCurr(totNeto)}</div></div>
<div class="kv" style="padding-left:12px"><div class="l">&nbsp;&nbsp;Q1 anticipo (quincenales)</div><div class="v">${fmtCurr(totQ1m)}</div></div>
<div class="kv" style="padding-left:12px"><div class="l">&nbsp;&nbsp;Q2 / mes</div><div class="v">${fmtCurr(totQ2m)}</div></div>
<h3 style="font-size:8pt;margin-top:8px;color:#666">Reparto del NETO por CT</h3>
${tablaOTconsMonto(totNeto, "Neto imputado")}

<h2 class="page-break">3. SEGURIDAD SOCIAL — PILA (mes siguiente)</h2>
<h3 style="font-size:9pt;margin-top:4px">Aportes del trabajador</h3>
<div class="kv"><div class="l">Salud + pensión trabajador (4% + 4% IBC)</div><div class="v">${fmtCurr(totDed)}</div></div>
<h3 style="font-size:9pt;margin-top:6px">Aportes de la empresa</h3>
<div class="kv"><div class="l">Salud empresa (8.5% IBC) ${apSalud===0?"<i style='color:#666'>— exonerada Art.114-1 ET</i>":""}</div><div class="v">${fmtCurr(apSalud)}</div></div>
<div class="kv"><div class="l">Pensión empresa (12% IBC)</div><div class="v">${fmtCurr(apPensión)}</div></div>
<div class="kv"><div class="l">ARL</div><div class="v">${fmtCurr(apArl)}</div></div>
<div class="kv"><div class="l">Caja de Compensación (4% IBC)</div><div class="v">${fmtCurr(apCaja)}</div></div>
<div class="kv"><div class="l">ICBF (3% IBC) ${apIcbf===0?"<i style='color:#666'>— exonerada Art.114-1 ET</i>":""}</div><div class="v">${fmtCurr(apIcbf)}</div></div>
<div class="kv"><div class="l">SENA (2% IBC) ${apSena===0?"<i style='color:#666'>— exonerada Art.114-1 ET</i>":""}</div><div class="v">${fmtCurr(apSena)}</div></div>
<div class="kv subtot"><div class="l">Subtotal aportes empresa</div><div class="v">${fmtCurr(totSegSocial)}</div></div>
<div class="kv bigtot"><div class="l">TOTAL PILA (trabajador + empresa)</div><div class="v">${fmtCurr(totDed + totSegSocial)}</div></div>
<h3 style="font-size:8pt;margin-top:8px;color:#666">Reparto del PILA por CT</h3>
${tablaOTconsMonto(totDed + totSegSocial, "PILA imputado")}

<h2 class="page-break">4. PROVISIÓNES — pasivo acumulado, pago futuro</h2>
<div class="kv"><div class="l">Prima de servicios (8.33% — pago semestral jun/dic)</div><div class="v">${fmtCurr(prPrima)}</div></div>
<div class="kv"><div class="l">Cesantías (8.33% — consigna feb año siguiente)</div><div class="v">${fmtCurr(prCes)}</div></div>
<div class="kv"><div class="l">Intereses sobre cesantías (1% — paga ene año siguiente)</div><div class="v">${fmtCurr(prIntC)}</div></div>
<div class="kv"><div class="l">Vacaciones (4.17% — al disfrutarlas o en liquidación)</div><div class="v">${fmtCurr(prVac)}</div></div>
<div class="kv bigtot" style="background:#92400E"><div class="l">TOTAL PROVISIÓNES</div><div class="v">${fmtCurr(totProvisiones)}</div></div>
<h3 style="font-size:8pt;margin-top:8px;color:#666">Reparto de las PROVISIÓNES por CT</h3>
${tablaOTconsMonto(totProvisiones, "Provisión imputada")}

<h2 class="page-break" style="background:#7F1D1D">5. 💵 GASTO TOTAL DE CAJA DEL MES</h2>
<div class="kv"><div class="l">Neto a los trabajadores (sale del banco este mes)</div><div class="v">${fmtCurr(totNeto)}</div></div>
<div class="kv"><div class="l">PILA — trabajador + empresa (sale del banco mes siguiente)</div><div class="v">${fmtCurr(totDed + totSegSocial)}</div></div>
<div class="kv bigtot" style="background:#7F1D1D"><div class="l">TOTAL CAJA DEL MES</div><div class="v">${fmtCurr(totCaja)}</div></div>
<h3 style="font-size:8pt;margin-top:8px;color:#666">Reparto de la CAJA por CT</h3>
${tablaOTconsMonto(totCaja, "Caja imputada")}

<h2 style="background:#78350F">6. 🏷️ COSTO TOTAL EMPRESA DEL MES</h2>
<div class="kv"><div class="l">💵 Caja del mes</div><div class="v">${fmtCurr(totCaja)}</div></div>
<div class="kv"><div class="l">📊 Provisiones del mes</div><div class="v">${fmtCurr(totProvisiones)}</div></div>
<div class="kv bigtot" style="background:#78350F"><div class="l">COSTO TOTAL EMPRESA</div><div class="v">${fmtCurr(totCostoEmp)}</div></div>
<h3 style="font-size:8pt;margin-top:8px;color:#666">Reparto del COSTO TOTAL por CT</h3>
${tablaOTconsMonto(totCostoEmp, "Costo total imputado")}

<div class="notebox">
<b>Notas para conciliacion contable PILA:</b><br/>
&bull; <b>💵 CAJA del mes</b> agrupa todo lo que sale efectivamente del banco de la empresa: salarios netos al empleado este mes (Q1 + Q2 o pago mensual completo), deducciones del empleado (salud y pension del trabajador descontadas del salario, que la empresa traslada al sistema PILA), y aportes del empleador a seguridad social y parafiscales (que se pagan en PILA del mes siguiente).<br/>
&bull; <b>📊 PROVISIÓNES</b> son obligaciones legales que se reconocen contablemente este mes pero se desembolsan en distinto calendario: prima de servicios (semestral, jun/dic), cesantias (consigna feb año siguiente), intereses sobre cesantias (paga ene año siguiente), vacaciones (cuando se disfrutan o en liquidación del contrato).<br/>
&bull; <b>Distribución por CT (Lógica B):</b> festivos y dias de novedad (incapacidad, vacaciones, licencias) se asignan al centro al que le tocaba ese dia según el calendario base de cada empleado. Las imputaciones manuales prevalecen sobre el calendario base.<br/>
&bull; <b>Exoneracion Art.114-1 ET:</b> empresas que pagan salarios &lt; 10 SMLMV estan exoneradas del 8.5% de salud, 3% ICBF y 2% SENA sobre esos salarios. Si en la tabla aparece $0 en esos conceptos, es por esta exoneración.<br/>
&bull; <b>Validacion contra PILA:</b> el subtotal "Aportes empresa a seguridad social" mas las "Deducciones empleado" deberia coincidir con el total a pagar en la planilla PILA del mes siguiente. Verificar con el contador.<br/>
</div>

<table style="margin-top:24px;border-top:1px solid #ccc;padding-top:8px"><tr><td style="width:33%;text-align:center;border:none">________________________<br/><span style="font-size:8pt;color:#666">Elaborado por</span><br/><span style="font-size:7pt;color:#999">RRHH ${empresaName||""}</span></td><td style="width:33%;text-align:center;border:none">________________________<br/><span style="font-size:8pt;color:#666">Revisado por</span><br/><span style="font-size:7pt;color:#999">Contador</span></td><td style="width:33%;text-align:center;border:none">________________________<br/><span style="font-size:8pt;color:#666">Aprobado por</span><br/><span style="font-size:7pt;color:#999">Gerencia</span></td></tr></table>

<div style="text-align:center;margin-top:12px;font-size:7.5pt;color:#999">${empresaName||""} Suite &middot; ${new Date().toLocaleDateString(getTenantDefaultsSync().locale,{day:"numeric",month:"long",year:"numeric"})} &middot; ${fileName}</div>

</div></body></html>`;

    return { html, fileName };
  };

  // Sprint C: validación de pendientes por periodo para bloqueo de liquidación
  // Recorre los días del periodo y detecta los que están sin imputar o en conflicto
  // (excluyendo domingos, festivos y días con novedad registrada).
  const validarPeríodo = (n, dDesde, dHasta) => {
    if (!n) return { pendientes: [], count: 0 };
    const hols = getHolidays(n.anio);
    const novDias = n.novDias || {};
    const impDias = n.impDias || {};
    const fi = n.fechaIngreso || null;          // "YYYY-MM-DD"
    const ff = n.fechaFinContrato || null;       // "YYYY-MM-DD"
    const pendientes = [];
    for (let d = dDesde; d <= dHasta; d++) {
      const date = new Date(n.anio, n.mes, d);
      if (date.getDay() === 0) continue;
      if (hols.find(h => sameDay(h.date, date))) continue;
      const k = n.anio+"-"+String(n.mes+1).padStart(2,"0")+"-"+String(d).padStart(2,"0");
      // Fuera del periodo de vinculación (antes del ingreso o tras el fin de contrato): no se exige imputar.
      if (fi && k < fi) continue;
      if (ff && k > ff) continue;
      if (novDias[k]) continue;
      const imp = impDias[k];
      if (!imp) pendientes.push({ day: d, key: k, motivo: "sin_imputar" });
      else if (imp === "__conflicto__") pendientes.push({ day: d, key: k, motivo: "conflicto" });
    }
    return { pendientes, count: pendientes.length };
  };
  // Calcular pendientes del mes/quincena para selN
  const _lastDay = selN ? new Date(selN.anio, selN.mes+1, 0).getDate() : 0;
  const periodoQ1 = selN ? validarPeríodo(selN, 1, 15) : { pendientes: [], count: 0 };
  const periodoQ2 = selN ? validarPeríodo(selN, 16, _lastDay) : { pendientes: [], count: 0 };
  const periodoMes = selN ? validarPeríodo(selN, 1, _lastDay) : { pendientes: [], count: 0 };

  if(vista==="detalle"&&selN&&calc){
    const esBorrador=selN.estado==="borrador"||selN.estado==="q1_pagado";
    const ed=esBorrador||modoEditarImp;
    const esPagada=selN.estado==="pagada"||selN.estado==="liquidada";
    const isQ=selN.modalidadPago!=="mensual";
    const u=(f)=>upd(selN.id,f);
    // ── Referencia de pago automática ──
    // Patrón: NOM <MES><AA> <ANT|Q2> - <APELLIDOS>. Punto único editable para cambiar la lógica.
    // tipoForm: "q1" (anticipo) | "nomina" (Q2 si quincenal, mes completo si mensual).
    const sugerirRef=(tipoForm)=>{
      const mesAbr=MESES[mes].substring(0,3).toUpperCase();
      const aa=String(anio).slice(-2);
      // Apellidos = últimas 2 palabras del nombre, en mayúsculas, unidas por guion
      const apellidos=(selN.nombre||"").trim().split(/\s+/).slice(-2).join("-").toUpperCase();
      if(tipoForm==="prima") return `PRIMA ${mesAbr}${aa} - ${apellidos}`;
      const sufijo=tipoForm==="q1"?"ANT":(isQ?"Q2":"");
      return `NOM ${mesAbr}${aa}${sufijo?" "+sufijo:""} - ${apellidos}`;
    };
    const pubNomina=(tipo,liq,refBancaria,soporteName)=>{
      const { html } = buildNominaHtml({ selN, calc, anio, mes, tipo, refBancaria });
      return fetch("/api/hiring",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"pub_nomina",employee_id:selN.empId,anio,mes,tipo,nombre_mes:MESES[mes],devengado:calc.dev,deducciones:calc.totD,neto:calc.neto,liquido:liq,modalidad:selN.modalidadPago||"quincenal",html,ref:refBancaria||null,soporte_name:soporteName||null})});
    };
    // ── Adjuntos de novedades ──
    // Clave por empleado+día dentro del objeto novAdjuntos (que es del mes en curso).
    const adjKey = (fechaKey)=>selN.empId+":"+fechaKey;
    // Persistir todo el objeto novAdjuntos del mes en kv_store.
    const saveAdjuntos = (obj)=>fetch("/api/hiring?kv=nov_adjuntos&anio="+anio+"&mes="+mes,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({data:obj})});
    // Añadir un archivo al día indicado (varios permitidos).
    const addAdjunto = (fechaKey,file)=>{
      if(!file) return;
      if(file.size>=5*1024*1024){window.toast("Archivo demasiado grande · Máximo 5MB","error");return;}
      setAdjUploading(true);
      const r=new FileReader();
      r.onload=()=>{
        const kk=adjKey(fechaKey);
        const prev=novAdjuntos[kk]||[];
        const nuevo={...novAdjuntos,[kk]:[...prev,{name:file.name,size:file.size,data:r.result}]};
        setNovAdjuntos(nuevo);
        saveAdjuntos(nuevo).then(()=>{setAdjUploading(false);window.toast("Archivo adjuntado","success");}).catch(()=>{setAdjUploading(false);window.toast("Error al guardar adjunto","error");});
      };
      r.readAsDataURL(file);
    };
    // Borrar un archivo (por índice) del día indicado.
    const delAdjunto = (fechaKey,idx)=>{
      const kk=adjKey(fechaKey);
      const arr=(novAdjuntos[kk]||[]).filter((_,i)=>i!==idx);
      const nuevo={...novAdjuntos};
      if(arr.length) nuevo[kk]=arr; else delete nuevo[kk];
      setNovAdjuntos(nuevo);
      saveAdjuntos(nuevo).catch(()=>window.toast("Error al borrar adjunto","error"));
    };
    // Habilitar/deshabilitar el fichaje del trabajador en un día de descanso (domingo/festivo).
    // Guarda en kv_store hab:fichaje_habilitado:<anio>:<mes> indexado por empId:fecha.
    const toggleFichaje = (fechaKey)=>{
      const kk=selN.empId+":"+fechaKey;
      const nuevo={...fichajeHab};
      const activando=!nuevo[kk];
      if(activando) nuevo[kk]=true; else delete nuevo[kk];
      setFichajeHab(nuevo);
      fetch("/api/hiring?kv=fichaje_habilitado&anio="+anio+"&mes="+mes,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({data:nuevo})})
        .then(()=>window.toast(activando?"Fichaje habilitado para este día":"Fichaje deshabilitado","success"))
        .catch(()=>window.toast("Error al guardar","error"));
    };
    const genNovedadesHtml = () => {
            const nDias=selN.novDias||{};
            const nNotas=selN.novNotas||{};
            const TIPO_META={incapacidad:{icon:"🏥",label:"Incapacidad EG"},vacaciones:{icon:"🏖️",label:"Vacaciones"},licencia:{icon:"📋",label:"Licencia remunerada"},licNoRem:{icon:"⚠️",label:"Licencia no remunerada"},ausencia:{icon:"❌",label:"Ausencia injustificada"}};
            // Ocurrencias: una fila por novedad. Agrupa días contiguos del mismo tipo y misma nota en un rango;
            // si la nota cambia o no son contiguos, fila aparte. Así caben 1, 2, 3+ días con su nota propia.
            const _dk=Object.keys(nDias).sort();
            const ocurrencias=[]; let _cur=null;
            for(const k of _dk){
              const _t=nDias[k], _n=(nNotas[k]||"").trim(), _d=new Date(k+"T12:00:00");
              if(_cur && _cur.tipo===_t && _cur.nota===_n && (_d-_cur.last)===86400000){ _cur.fin=_d; _cur.dias++; _cur.last=_d; }
              else { if(_cur) ocurrencias.push(_cur); _cur={tipo:_t,nota:_n,ini:_d,fin:_d,last:_d,dias:1}; }
            }
            if(_cur) ocurrencias.push(_cur);
            const _ff=d=>d.toLocaleDateString(getTenantDefaultsSync().locale,{day:"numeric",month:"short"});
            const novGrpRows=ocurrencias.map(o=>{
              const m=TIPO_META[o.tipo]||{icon:"•",label:o.tipo};
              const fechas=o.dias===1?_ff(o.ini):`${_ff(o.ini)} – ${_ff(o.fin)}`;
              return `<tr><td class="tp">${m.icon} ${m.label}</td><td style="white-space:nowrap">${fechas}</td><td class="dd">${o.dias}</td><td style="font-size:8pt;color:#555">${o.nota||"—"}</td></tr>`;
            }).join("");
            const _tiposCon=new Set(ocurrencias.map(o=>o.tipo));
            const _sinNov=Object.entries(TIPO_META).filter(([id])=>!_tiposCon.has(id)).map(([,m])=>m.label);
            const sinNovTxt=_sinNov.length?`<div style="font-size:7.5pt;color:#aaa;margin:2px 0 4px">Sin novedades este mes: ${_sinNov.join(" · ")}.</div>`:"";
            const festList=festivosMes.map(h=>({fecha:h.date.toLocaleDateString(getTenantDefaultsSync().locale,{weekday:"short",day:"numeric",month:"short"}),name:h.name}));
            const mAbr=MESES[mes].substring(0,3).toUpperCase();const a2=String(anio).slice(-2);
            const ape=(selN.nombre||"").split(" ").slice(-2).join("-").toUpperCase();
            const fileName=`NOV-${mAbr}${a2}-${ape}-${selN.cc||""}`;
            const _fdN=(d)=>d?new Date(d+"T12:00:00").toLocaleDateString(getTenantDefaultsSync().locale,{day:"2-digit",month:"2-digit",year:"numeric"}):null;
            const _contratoLbl=`${selN.tipoContrato||"término fijo"}${_fdN(selN.fechaIngreso)?` · ${_fdN(selN.fechaIngreso)}${_fdN(selN.fechaFinContrato)?` a ${_fdN(selN.fechaFinContrato)}`:""}`:""}`;
            const _leg=getActiveCompanyLegalDataSync();
            const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${fileName}</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"><\/script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"><\/script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Helvetica,Arial,sans-serif;background:#e5e5e5;margin:0;padding:20px 0}
#content{background:#fff;width:794px;margin:0 auto;padding:35px 45px;font-size:9pt;color:#111;line-height:1.35;box-shadow:0 0 8px rgba(0,0,0,.15)}
.hdr{border-bottom:2px solid #111;padding-bottom:6px;margin-bottom:10px;overflow:hidden}
.hdr .l{float:left}.hdr .r{float:right;text-align:right;font-size:8pt;color:#666;padding-top:6px}
.hdr img{height:36px}
h1{font-size:12pt;text-align:center;margin:4px 0 2px;clear:both}
h2{font-size:9.5pt;margin:10px 0 4px;border-bottom:1px solid #ccc;padding-bottom:2px;clear:both}
.sub{font-size:8pt;color:#666;text-align:center;margin-bottom:10px}
.info{margin-bottom:10px;font-size:8.5pt;overflow:hidden}.info div{float:left;width:50%;padding:1px 0}
.info span{color:#666}.info b{color:#111}
table{width:100%;border-collapse:collapse;margin-bottom:8px;font-size:8.5pt;clear:both}
th{text-align:left;padding:4px 6px;font-size:7pt;font-weight:700;text-transform:uppercase;border-bottom:2px solid #111}
td{padding:3px 6px;border-bottom:1px solid #ddd}
.cols{display:flex;gap:16px;margin-bottom:10px}.col{flex:1;border:1px solid #eee;border-radius:4px;padding:9px 13px;font-size:9pt;color:#555}.ct{font-size:7pt;font-weight:700;color:#111;letter-spacing:.5px;margin-bottom:4px}.col b{color:#111}.contrato{font-size:8.5pt;color:#555;margin-bottom:8px}.contrato b{color:#111}
.dias{margin-bottom:12px}.dias td{padding:8px 10px;border-bottom:1px solid #eee;vertical-align:middle}
.dias .cpt{font-weight:700;color:#111;font-size:9pt;width:34%}
.dias .num{font-family:'SF Mono',Menlo,monospace;text-align:right;white-space:nowrap;width:16%}
.dias .num .big{font-size:15pt;font-weight:800;color:#111}.dias .num .den{font-size:8pt;color:#bbb;font-weight:600}
.dias .rule{font-size:7.5pt;color:#888;line-height:1.35}
.efx td{padding:6px 8px;vertical-align:middle;border-bottom:1px solid #eee}.efx th{text-align:center}.efx th:first-child{text-align:left}
.efx .tp{font-weight:600;color:#111}.efx .dd{text-align:center;font-family:'SF Mono',Menlo,monospace;color:#666}
.pill{display:inline-block;padding:2px 9px;border-radius:10px;font-size:6.5pt;font-weight:700;text-transform:uppercase;letter-spacing:.3px;white-space:nowrap}
.pill.ok{color:#15803D;background:#ECFDF3}.pill.no{color:#B42318;background:#FEF3F2}.pill.neu{color:#475467;background:#F2F4F7}
.summary{margin:8px 0;overflow:hidden}
.sbox{float:left;width:31%;margin-right:3%;border:1px solid #ccc;border-radius:4px;padding:6px;text-align:center;margin-bottom:6px}
.sbox:nth-child(3n){margin-right:0}
.sbox .n{font-size:16pt;font-weight:800;font-family:monospace}.sbox .l{font-size:7pt;color:#666;text-transform:uppercase}
.sig{margin-top:20px;overflow:hidden}.sig div{float:left;width:30%;margin-right:5%;text-align:center;font-size:8pt;border-top:1px solid #111;padding-top:5px}
.sig div:last-child{margin-right:0}
.foot{font-size:6.5pt;color:#999;text-align:center;margin-top:10px;clear:both}
.np{text-align:center;margin:16px auto;max-width:794px}
.btn{background:#111;color:#fff;border:none;padding:10px 24px;border-radius:4px;cursor:pointer;font-size:11pt;font-weight:600;margin:0 4px}
.btn2{background:#fff;color:#111;border:1px solid #111;padding:10px 24px;border-radius:4px;cursor:pointer;font-size:11pt;margin:0 4px}
@page{size:A4 portrait;margin:0}table,tr,thead{page-break-inside:avoid;break-inside:avoid}h1,h2,h3{page-break-after:avoid;break-after:avoid}.kv,.kv.bigtot,.info,.notebox,.sig{page-break-inside:avoid;break-inside:avoid}.page-break{page-break-before:always;break-before:page}@media print{html,body{background:#fff;margin:0;padding:0;width:210mm}.np{display:none}#content{width:210mm;max-width:none;margin:0;padding:14mm 14mm;box-shadow:none;box-sizing:border-box}}
</style></head><body>
<div id="content">
<div class="hdr"><div class="l"><img src="${HAB_LOGO}" alt="Habitaris"/></div><div class="r"><div style="font-weight:600;color:#111">${getActiveCompanyLegalDataSync().legalName}</div><div>NIT: ${getActiveCompanyLegalDataSync().taxId}</div></div></div>
<h1>REPORTE DE NOVEDADES DE NÓMINA</h1>
<div class="sub">${MESES[mes]} ${anio} · Ref: ${fileName}</div>
<div class="cols">
<div class="col"><div class="ct">EMPLEADOR</div><b>${_leg.legalName||""}</b><br/>NIT ${_leg.taxId||""}</div>
<div class="col"><div class="ct">TRABAJADORA</div><b>${selN.nombre||""}</b><br/>C.C. ${selN.cc||""}<br/>${selN.cargo||""}<br/>EPS: ${selN.eps||"—"} · Pensión: ${selN.pen||"—"}</div>
</div>
<div class="contrato"><b>Contrato:</b> ${_contratoLbl}.</div>
<h2>Festivos del mes</h2>
<table><thead><tr><th>Fecha</th><th>Motivo</th></tr></thead><tbody>
${festList.length>0?festList.map(f=>`<tr class="fest"><td>${f.fecha}</td><td>${f.name}</td></tr>`).join(""):`<tr><td colspan="2" style="color:#999;text-align:center">Sin festivos</td></tr>`}
</tbody></table>
<h2>Novedades del mes</h2>
<table class="efx"><thead><tr><th>Tipo</th><th style="text-align:left">Fechas</th><th>Días</th><th style="text-align:left">Nota</th></tr></thead><tbody>
${novGrpRows||`<tr><td colspan="4" style="color:#aaa;font-style:italic;text-align:center;padding:8px">Sin novedades registradas en el mes</td></tr>`}
</tbody></table>
${sinNovTxt}
<h2>Días por concepto</h2>
<table class="dias"><tbody>
<tr><td class="cpt">Salario</td><td class="num"><span class="big">${calc.dias}</span><span class="den">/30</span></td><td class="rule">Días pagados. Restan ausencias injustificadas y licencias no remuneradas; la licencia remunerada no resta.</td></tr>
<tr><td class="cpt">Auxilio de transporte</td><td class="num"><span class="big">${calc.diasComm}</span><span class="den">/30</span></td><td class="rule">Restan las licencias remuneradas; los festivos sí cuentan (Concepto 219821/2020).</td></tr>
<tr><td class="cpt">Bono de asistencia</td><td class="num"><span class="big">${calc.diasAsist}</span><span class="den">/30</span></td><td class="rule">Restan festivos, novedades y licencias remuneradas.</td></tr>
<tr><td class="cpt">Base de cotización (IBC)</td><td class="num"><span class="big">${calc.diasVinc}</span><span class="den">/30</span></td><td class="rule">Días de vinculación del mes. Piso de 1 SMLMV en mes completo, aunque haya ausencias.</td></tr>
</tbody></table>
</tbody></table>
<div class="foot">Documento generado por Habitaris Suite — ${fileName} · ${new Date().toLocaleDateString(getTenantDefaultsSync().locale,{day:"numeric",month:"long",year:"numeric"})}</div>
</div>
<div class="np">
<button class="btn" onclick="(function(){var el=document.getElementById('content');var hdrEl=el.querySelector('.hdr');var sigEl=el.querySelector('.sig');el.style.boxShadow='none';document.querySelector('.np').style.display='none';var st=document.createElement('div');st.style.cssText='text-align:center;padding:10px;font-family:monospace;color:#999';st.textContent='Generando PDF...';document.body.appendChild(st);var pbList=el.querySelectorAll('.page-break');var elRect=el.getBoundingClientRect();var hdrRect=hdrEl.getBoundingClientRect();var hdrEnd=hdrRect.bottom-elRect.top+8;var sigStart=sigEl?(sigEl.getBoundingClientRect().top-elRect.top-8):el.scrollHeight;var breakPoints=[hdrEnd];pbList.forEach(function(pb){var r=pb.getBoundingClientRect();breakPoints.push(r.top-elRect.top)});breakPoints.push(sigStart);html2canvas(el,{scale:2,useCORS:true,width:el.scrollWidth,windowWidth:el.scrollWidth,backgroundColor:'#fff'}).then(function(canvas){var iW=canvas.width,iH=canvas.height,pW=210;var scaleY=iH/el.scrollHeight;var J=jspdf.jsPDF;var pdf=new J({orientation:'portrait',unit:'mm',format:'a4'});var hdrHpx=Math.floor(hdrEnd*scaleY);var hc=document.createElement('canvas');hc.width=iW;hc.height=hdrHpx;var hctx=hc.getContext('2d');hctx.fillStyle='#fff';hctx.fillRect(0,0,iW,hdrHpx);hctx.drawImage(canvas,0,0,iW,hdrHpx,0,0,iW,hdrHpx);var hdrImg=hc.toDataURL('image/jpeg',0.92);var hdrHmm=hdrHpx*pW/iW;var sigImg=null,sigHmm=0;if(sigEl){var sigSpx=Math.floor((sigEl.getBoundingClientRect().top-elRect.top)*scaleY);var sigEpx=Math.floor(el.scrollHeight*scaleY);var sigHpx=sigEpx-sigSpx;if(sigHpx>0){var sc=document.createElement('canvas');sc.width=iW;sc.height=sigHpx;var sctx=sc.getContext('2d');sctx.fillStyle='#fff';sctx.fillRect(0,0,iW,sigHpx);sctx.drawImage(canvas,0,sigSpx,iW,sigHpx,0,0,iW,sigHpx);sigImg=sc.toDataURL('image/jpeg',0.92);sigHmm=sigHpx*pW/iW}}var totalPages=breakPoints.length-1;for(var i=0;i<totalPages;i++){var startPx=Math.floor(breakPoints[i]*scaleY);var endPx=Math.floor(breakPoints[i+1]*scaleY);var sliceH=endPx-startPx;if(sliceH<=0)continue;var pc=document.createElement('canvas');pc.width=iW;pc.height=sliceH;var ctx=pc.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,iW,sliceH);ctx.drawImage(canvas,0,startPx,iW,sliceH,0,0,iW,sliceH);var sImg=pc.toDataURL('image/jpeg',0.92);var sHmm=sliceH*pW/iW;if(i>0)pdf.addPage();pdf.addImage(hdrImg,'JPEG',0,0,pW,hdrHmm);var contentY=hdrHmm;var isLast=(i===totalPages-1);var reservaFirmas=(isLast&&sigImg)?(sigHmm+30):0;var availH=297-hdrHmm-12-reservaFirmas;if(sHmm>availH){var ratio=availH/sHmm;var scaledW=pW*ratio;var marginX=(pW-scaledW)/2;pdf.addImage(sImg,'JPEG',marginX,contentY,scaledW,availH)}else{pdf.addImage(sImg,'JPEG',0,contentY,pW,sHmm)}if(isLast&&sigImg){pdf.addImage(sigImg,'JPEG',0,297-sigHmm-10,pW,sigHmm)}pdf.setFontSize(8);pdf.setTextColor(120);pdf.text('Página '+(i+1)+' de '+totalPages,pW/2,291,{align:'center'})}pdf.save('${fileName}.pdf');st.textContent='PDF descargado ✅';el.style.boxShadow='0 0 8px rgba(0,0,0,.15)';document.querySelector('.np').style.display='';}).catch(function(e){st.textContent='Error: '+e.message;document.querySelector('.np').style.display=''})})()">📥 Descargar PDF</button>
<button class="btn2" onclick="window.print()">🖨️ Imprimir</button>
</div>
</body></html>`;
      return html;
    };
    // Nota corta de reembolso interempresa Q1 (anticipo del 15).
    // Se emite al cerrar Q1 para enviar al otro centro de coste pidiendole
    // el reembolso de su parte del anticipo pagado.
    const genNotaReembolsoQ1Html = () => {
      const esQuincenal = (selN.modalidadPago || "quincenal") === "quincenal";
      if (!esQuincenal) {
        window.alert("Esta nota solo aplica para empleados con modalidad quincenal.");
        return null;
      }
      const calc = calcN(selN);
      const fmtCurr = v => new Intl.NumberFormat(getTenantDefaultsSync().locale,{style:"currency",currency:"COP",maximumFractionDigits:0}).format(v||0);
      const fmtPct = v => (v||0).toFixed(1) + "%";
      const fechaAStr = (f) => `${f.getFullYear()}-${String(f.getMonth()+1).padStart(2,"0")}-${String(f.getDate()).padStart(2,"0")}`;
      const dowMap = ["D","L","M","X","J","V","S"];
      const centroBaseParaFecha = (fechaStr) => {
        const d = new Date(fechaStr + "T12:00:00");
        const diaSem = dowMap[d.getDay()];
        for (const c of (centros||[])) {
          if (c.activo === false) continue;
          for (const cal of (c.calendarios||[])) {
            if (!Array.isArray(cal.dias)) continue;
            if (!cal.dias.includes(diaSem)) continue;
            const emps = cal.empleados || c.empleados || [];
            if (!emps.includes(selN.empId)) continue;
            if (cal.vigencia_desde && fechaStr < cal.vigencia_desde) continue;
            if (cal.vigencia_hasta && fechaStr > cal.vigencia_hasta) continue;
            return c.id;
          }
        }
        return null;
      };
      const iDias = selN.impDias || {};
      const nDias = selN.novDias || {};
      // Calcular dias Q1 con desglose por centro
      const diasOT = {};
      const vistos = new Set();
      const bump = (otId, tipo) => {
        if (!diasOT[otId]) diasOT[otId] = {trab:0, fest:0, nov:0, total:0};
        diasOT[otId][tipo]++;
        diasOT[otId].total++;
      };
      Object.entries(iDias).forEach(([k, otId]) => {
        if (!otId || otId === "__conflicto__") return;
        const dia = parseInt(k.split("-")[2], 10);
        if (dia < 1 || dia > 15) return;
        bump(otId, "trab");
        vistos.add(k);
      });
      (festivosMes || []).forEach(h => {
        const k = fechaAStr(h.date);
        if (vistos.has(k)) return;
        if (h.date.getDate() > 15) return;
        const cId = centroBaseParaFecha(k);
        if (cId) { bump(cId, "fest"); vistos.add(k); }
      });
      Object.entries(nDias).forEach(([k, tipoNov]) => {
        if (vistos.has(k)) return;
        if (tipoNov === "normal") return;
        const dia = parseInt(k.split("-")[2], 10);
        if (dia < 1 || dia > 15) return;
        const cId = centroBaseParaFecha(k);
        if (cId) { bump(cId, "nov"); vistos.add(k); }
      });

      const totDiasQ1 = Object.values(diasOT).reduce((s,d) => s + d.total, 0);
      const otsConDias = Object.entries(diasOT).map(([otId, info]) => {
        const c = centros.find(x => x.id === otId);
        return {
          codigo: c ? c.codigo : otId,
          nombre: c ? c.nombre : "(OT no encontrada)",
          trab: info.trab, fest: info.fest, nov: info.nov,
          dias: info.total,
          pct: totDiasQ1 > 0 ? (info.total / totDiasQ1) * 100 : 0
        };
      }).sort((a,b) => (a.codigo||"").localeCompare(b.codigo||""));

      const anticipoQ1 = calc.q1 || 0;
      const empresaNombre = getActiveCompanyLegalDataSync().legalName || "";
      const empresaNit = getActiveCompanyLegalDataSync().taxId || "";
      const mAbr = MESES[mes].substring(0,3).toUpperCase();
      const a2 = String(anio).slice(-2);
      const ape = (selN.nombre || "").split(" ").slice(-2).join("-").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase().replace(/[^A-Z0-9-]/g,"");
      const fileName = `NOTA-REEMBOLSO-Q1-${mAbr}${a2}-${ape}`;

      let tablaHtml = `<table><thead><tr><th>CT</th><th>Centro</th><th style="text-align:right">Trab.</th><th style="text-align:right">Fest.</th><th style="text-align:right">Nov.</th><th style="text-align:right">Dias</th><th style="text-align:right">%</th><th style="text-align:right">Importe Q1</th></tr></thead><tbody>`;
      otsConDias.forEach(o => {
        const monto = anticipoQ1 * (o.pct / 100);
        tablaHtml += `<tr><td><b>${o.codigo}</b></td><td>${o.nombre}</td><td style="text-align:right">${o.trab}</td><td style="text-align:right;color:#92400E">${o.fest||""}</td><td style="text-align:right;color:#B91C1C">${o.nov||""}</td><td style="text-align:right"><b>${o.dias}</b></td><td style="text-align:right">${fmtPct(o.pct)}</td><td style="text-align:right;font-family:monospace"><b>${fmtCurr(monto)}</b></td></tr>`;
      });
      tablaHtml += `<tr style="background:#111;color:#fff"><td colspan="5"><b>TOTAL</b></td><td style="text-align:right"><b>${totDiasQ1}</b></td><td style="text-align:right"><b>100%</b></td><td style="text-align:right;font-family:monospace"><b>${fmtCurr(anticipoQ1)}</b></td></tr></tbody></table>`;

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${fileName}</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"><\/script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"><\/script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Helvetica,Arial,sans-serif;background:#e5e5e5;margin:0;padding:20px 0}
#content{background:#fff;width:794px;margin:0 auto;padding:35px 45px;font-size:9.5pt;color:#111;line-height:1.4;box-shadow:0 0 8px rgba(0,0,0,.15)}
.hdr{border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:12px;overflow:hidden}
.hdr .l{float:left}.hdr .r{float:right;text-align:right;font-size:8.5pt;color:#666;padding-top:6px}
.hdr img{height:38px}
h1{font-size:14pt;margin:18px 0 4px;text-align:center;letter-spacing:.5px}
.sub{text-align:center;font-size:9pt;color:#666;margin-bottom:18px}
.info{background:#FAFAF7;border:1px solid #eee;border-radius:4px;padding:10px 14px;margin-bottom:14px;font-size:9pt}
.info div{padding:2px 0}.info span{color:#666}.info b{color:#111}
h2{font-size:11pt;background:#111;color:#fff;padding:6px 12px;margin:14px 0 8px;border-radius:3px}
table{width:100%;border-collapse:collapse;margin:6px 0;font-size:9pt}
th{background:#F5F4F1;padding:6px 8px;text-align:left;font-weight:700;font-size:8.5pt;border-bottom:1px solid #ddd}
td{padding:5px 8px;border-bottom:1px solid #f0f0f0}
.kv{display:flex;justify-content:space-between;padding:4px 8px;font-size:10pt;border-bottom:1px dotted #ddd}
.kv .v{font-family:monospace;font-weight:600}
.kv.bigtot{background:#1E40AF;color:#fff;font-weight:700;font-size:13pt;padding:10px 14px;margin-top:8px;border-radius:4px}
.kv.bigtot .l{color:#fff}.kv.bigtot .v{color:#fff;font-size:14pt}
.notebox{padding:10px 14px;background:#FEF9E7;border:1px solid #F4D85E;border-radius:4px;font-size:8.5pt;color:#92400E;margin-top:14px;line-height:1.6}
.sig{margin-top:32px;overflow:hidden}.sig div{float:left;width:46%;margin-right:8%;text-align:center;font-size:9pt;border-top:1px solid #111;padding-top:6px}
.sig div:last-child{margin-right:0}
.foot{font-size:7pt;color:#999;text-align:center;margin-top:14px}
.np{text-align:center;margin:16px auto;max-width:794px}
.btn{background:#111;color:#fff;border:none;padding:10px 24px;border-radius:4px;cursor:pointer;font-size:11pt;font-weight:600;margin:0 4px}
@page{size:A4 portrait;margin:0}table,tr,thead{page-break-inside:avoid;break-inside:avoid}h1,h2,h3{page-break-after:avoid;break-after:avoid}.kv,.kv.bigtot,.info,.notebox,.sig{page-break-inside:avoid;break-inside:avoid}.page-break{page-break-before:always;break-before:page}@media print{html,body{background:#fff;margin:0;padding:0;width:210mm}.np{display:none}#content{width:210mm;max-width:none;margin:0;padding:14mm 14mm;box-shadow:none;box-sizing:border-box}}
</style></head><body>
<div id="content">
<div class="hdr"><div class="l"><img src="${HAB_LOGO}" alt="${empresaNombre}"/></div><div class="r"><div style="font-weight:600;color:#111">${empresaNombre}</div><div>NIT: ${empresaNit}</div></div></div>
<h1>NOTA DE REEMBOLSO INTEREMPRESA — Q1</h1>
<div class="sub">${MESES[mes]} ${anio} · Anticipo quincenal pagado el 15 · Ref: ${fileName}</div>

<div class="info">
<div><span>Empleado: </span><b>${selN.nombre||""}</b> &middot; <span>CC: </span><b>${selN.cc||""}</b></div>
<div><span>Cargo: </span><b>${selN.cargo||""}</b> &middot; <span>Salario base: </span><b>${fmtCurr(selN.sal||0)}</b></div>
<div><span>Período: </span><b>1 al 15 de ${MESES[mes].toLowerCase()} ${anio}</b></div>
</div>

<h2>Reparto del anticipo Q1 por centro</h2>
${tablaHtml}

<div class="kv bigtot"><div class="l">ANTICIPO Q1 TOTAL PAGADO</div><div class="v">${fmtCurr(anticipoQ1)}</div></div>

<div class="notebox">
<b>Notas:</b><br/>
&bull; El anticipo Q1 equivale al 50% del salario base proporcional. Se paga el dia 15 desde la empresa pagadora del grupo.<br/>
&bull; La distribucion por centro respeta la <b>Lógica B</b>: los días trabajados se asignan según imputacion manual, los festivos y dias de novedad (incapacidades, vacaciones, licencias) se asignan al centro al que le tocaba ese dia según el calendario base del empleado.<br/>
&bull; Este documento es informativo para conciliacion contable entre centros. Cada centro debe abonar a la empresa pagadora el importe correspondiente a su porcentaje, según los procedimientos internos del grupo.<br/>
&bull; El informe mensual completo (con Q2, PILA y provisiones) se emitira al cierre del mes.<br/>
</div>

<div class="sig">
<div>Emitido por<br/><span style="font-size:7.5pt;color:#999">RRHH ${empresaNombre}</span></div>
<div>Recibido por<br/><span style="font-size:7.5pt;color:#999">Centro destinatario</span></div>
</div>

<div class="foot">${empresaNombre} Suite &middot; ${new Date().toLocaleDateString(getTenantDefaultsSync().locale,{day:"numeric",month:"long",year:"numeric"})} &middot; ${fileName}</div>

</div>
<div class="np">
<button class="btn" onclick="window.print()">🖨 Imprimir / Guardar como PDF</button>
</div>
</body></html>`;

      return html;
    };

    const genImputaciónesHtml = async () => {
            const calc = calcN(selN);
            // Prima de servicios del semestre: desglose mes a mes (solo en meses de pago jun/dic).
            let primaSemBlock = "";
            if (mes === 5 || mes === 11) {
              const ps = await calcPrimaSemestre(selN, anio, mes);
              const filasPS = ps.meses.filter(m=>m.diasVinc>0).map(m=>{
                const obs=[]; if(m.ausencias>0)obs.push(`−${m.ausencias} ausencia`); if(m.licNoRem>0)obs.push(`−${m.licNoRem} lic. no rem.`);
                return `<div class="kv"><div class="l">${MESES[m.mes]} · ${m.diasVinc} días de vinculación → ${m.diasPrima} computados${obs.length?` (${obs.join(", ")})`:""}</div><div class="v">${m.diasPrima} d</div></div>`;
              }).join("");
              primaSemBlock = `<h2 style="background:#1E40AF">5b. 🎁 PRIMA DE SERVICIOS DEL SEMESTRE</h2>
<div class="kv"><div class="l">Base (salario ${fmtCurr(ps.sal)} + aux. transporte ${fmtCurr(ps.aux)})</div><div class="v">${fmtCurr(ps.base)}</div></div>
${filasPS}
<div class="kv"><div class="l">Total días computados (base 360)</div><div class="v">${ps.diasTotal} d</div></div>
<div class="kv bigtot" style="background:#1E40AF"><div class="l">PRIMA A PAGAR (base × ${ps.diasTotal} ÷ 360)</div><div class="v">${fmtCurr(ps.prima)}</div></div>
<div style="font-size:7pt;color:#999;margin:4px 0 8px">Art. 306 CST. Incapacidades, vacaciones y licencias remuneradas computan como tiempo de servicio; las ausencias injustificadas y licencias no remuneradas no computan.</div>`;
            }
            const iDias = selN.impDias || {};
            const nDias = selN.novDias || {};
            const esQuincenal = (selN.modalidadPago || "quincenal") === "quincenal";
            const fmtCurr = v => new Intl.NumberFormat(getTenantDefaultsSync().locale,{style:"currency",currency:"COP",maximumFractionDigits:0}).format(v||0);
            const fmtPct = v => (v||0).toFixed(1) + "%";

            // Lógica B (acordada con David, 31/05/2026): festivos y dias de novedad
            // se asignan al CENTRO BASE según calendario del empleado. Es mas equitativo
            // que repartir proporcionalmente (lo importante: en Colombia casi todos los
            // lunes son festivos por Ley Emiliani, y un centro que solo tiene lunes seria
            // injustamente cargado con todos los festivos diluidos si se reparten
            // proporcionalmente).
            //
            // Si el usuario imputa MANUALMENTE un dia festivo o de novedad (modo Editar
            // imputaciones), esa imputacion manual prevalece sobre el calendario base.
            const centroBaseParaFecha = (fechaStr) => {
              const d = new Date(fechaStr + "T12:00:00");
              const dow = d.getDay();
              const dowMap = ["D","L","M","X","J","V","S"];
              const diaSem = dowMap[dow];
              for (const c of (centros||[])) {
                if (c.activo === false) continue;
                for (const cal of (c.calendarios||[])) {
                  if (!Array.isArray(cal.dias)) continue;
                  if (!cal.dias.includes(diaSem)) continue;
                  const emps = cal.empleados || c.empleados || [];
                  if (!emps.includes(selN.empId)) continue;
                  if (cal.vigencia_desde && fechaStr < cal.vigencia_desde) continue;
                  if (cal.vigencia_hasta && fechaStr > cal.vigencia_hasta) continue;
                  return c.id;
                }
              }
              return null;
            };
            // Convertir Date a "YYYY-MM-DD"
            const fechaAStr = (f) => `${f.getFullYear()}-${String(f.getMonth()+1).padStart(2,"0")}-${String(f.getDate()).padStart(2,"0")}`;

            // Para un rango de dias (Q1, Q2 o mes completo), devuelve {otId: dias}
            // incluyendo: imputaciones manuales + festivos del periodo + dias de novedad
            // Devuelve {otId: {trab, fest, nov, total}} para que la tabla muestre el desglose
            const diasPorOTExtendido = (incluyeDia) => {
              const out = {};
              const vistos = new Set();
              const bump = (otId, tipo) => {
                if (!out[otId]) out[otId] = {trab:0, fest:0, nov:0, total:0};
                out[otId][tipo]++;
                out[otId].total++;
              };
              // 1) Imputaciónes manuales = días trabajados
              Object.entries(iDias).forEach(([k, otId]) => {
                if (!otId || otId === "__conflicto__") return;
                const dia = parseInt(k.split("-")[2], 10);
                if (!incluyeDia(dia)) return;
                bump(otId, "trab");
                vistos.add(k);
              });
              // 2) Festivos del periodo - centro base
              (festivosMes || []).forEach(h => {
                const k = fechaAStr(h.date);
                if (vistos.has(k)) return;
                if (!incluyeDia(h.date.getDate())) return;
                const cId = centroBaseParaFecha(k);
                if (cId) { bump(cId, "fest"); vistos.add(k); }
              });
              // 3) Novedades - centro base
              Object.entries(nDias).forEach(([k, tipoNov]) => {
                if (vistos.has(k)) return;
                if (tipoNov === "normal") return;
                const dia = parseInt(k.split("-")[2], 10);
                if (!incluyeDia(dia)) return;
                const cId = centroBaseParaFecha(k);
                if (cId) { bump(cId, "nov"); vistos.add(k); }
              });
              return out;
            };

            const ultDiaMes = new Date(anio, mes+1, 0).getDate();
            const diasQ1 = diasPorOTExtendido(d => d >= 1 && d <= 15);
            const diasQ2 = diasPorOTExtendido(d => d >= 16 && d <= ultDiaMes);
            const diasMes = diasPorOTExtendido(d => true);
            const sumarTotales = (mapa) => Object.values(mapa).reduce((a,b)=>a+b.total,0);
            const sumarPorTipo = (mapa, tipo) => Object.values(mapa).reduce((a,b)=>a+b[tipo],0);
            const totQ1 = sumarTotales(diasQ1);
            const totQ2 = sumarTotales(diasQ2);
            const totMes = sumarTotales(diasMes);

            const otsConDias = (mapa, total) => {
              return Object.entries(mapa).map(([otId, info]) => {
                const c = centros.find(x => x.id === otId);
                return {
                  id: otId,
                  codigo: c ? c.codigo : otId,
                  nombre: c ? c.nombre : "(OT no encontrada)",
                  trab: info.trab, fest: info.fest, nov: info.nov,
                  dias: info.total,
                  pct: total > 0 ? (info.total / total) * 100 : 0
                };
              }).sort((a,b) => (a.codigo||"").localeCompare(b.codigo||""));
            };

            // === BLOQUE 1: ANTICIPO Q1 (solo quincenal) ===
            // q1 ya viene calculado de calcN: ratioAsist * (sal*q1Pct)
            const q1Total = esQuincenal ? (calc.q1 || 0) : 0;
            const otsQ1 = otsConDias(diasQ1, totQ1);

            // === BLOQUE 2: RESTO Q2 (o pago mensual completo) ===
            // Para quincenal: q2 = neto - q1 (lo que se paga a fin de mes)
            // Para mensual: q2 = neto completo (no hubo anticipo)
            const q2Total = esQuincenal ? (calc.q2 || 0) : (calc.neto || 0);
            const otsQ2 = otsConDias(diasQ2, totQ2);

            // Desglose del bloque 2 (devengado del periodo - deducciones - q1)
            // calc.dev = devengado total del mes
            // calc.totD = total deducciones empleado
            const dev = calc.dev || 0;
            const totDed = calc.totD || 0;

            // === BLOQUE 3: SEGURIDAD SOCIAL Y PRESTACIONES ===
            // Lado PILA: cada concepto se aproxima a centena superior (regla MiPlanilla,
            // confirmada por contador). El redondeo se hace sobre el concepto COMPLETO
            // (trabajador + empleador, p.ej. pensión 4%+12%), y la diferencia la asume la
            // empresa: la deducción del trabajador (calc.epsE/penE) NO se toca.
            const _saludEmp = calc.epsEr || 0, _pensEmp = calc.penEr || 0;
            const _saludTrab = calc.epsE || 0, _pensTrab = calc.penE || 0;
            const segSocial = {
              salud:   ceil100(_saludEmp + _saludTrab) - _saludTrab,  // concepto salud completo redondeado, menos parte trabajador
              pension: ceil100(_pensEmp + _pensTrab) - _pensTrab,      // concepto pensión completo redondeado, menos parte trabajador
              arl:     ceil100(calc.arlV || 0),
              caja:    ceil100(calc.caja || 0),
              icbf:    ceil100(calc.icbf || 0),
              sena:    ceil100(calc.sena || 0)
            };
            const totSegSocial = segSocial.salud + segSocial.pension + segSocial.arl + segSocial.caja + segSocial.icbf + segSocial.sena;
            const prestaciones = {
              prima:   calc.prima || 0,   // 8.33%
              ces:     calc.ces   || 0,   // 8.33%
              intC:    calc.intC  || 0,   // 1% (12% anual sobre ces)
              vac:     calc.vac   || 0    // 4.17%
            };
            const totPrestaciones = prestaciones.prima + prestaciones.ces + prestaciones.intC + prestaciones.vac;
            const totBloque3 = totSegSocial + totPrestaciones;
            const otsMes = otsConDias(diasMes, totMes);

            // === RESUMEN TOTAL: costo empresa ===
            // costoT = neto + totDed (devengado liquido) + segSocial + prestaciones
            const totalCostoEmpresa = calc.costoT || 0;

            // % aportes empleador sobre IBC (para mostrar)
            const ibc = calc.ibc || 0;
            const pctSalud = ibc > 0 ? (segSocial.salud / ibc) * 100 : 0;
            const pctPensión = ibc > 0 ? (segSocial.pension / ibc) * 100 : 0;
            const pctArl = ibc > 0 ? (segSocial.arl / ibc) * 100 : 0;
            const pctCaja = ibc > 0 ? (segSocial.caja / ibc) * 100 : 0;
            const pctIcbf = ibc > 0 ? (segSocial.icbf / ibc) * 100 : 0;
            const pctSena = ibc > 0 ? (segSocial.sena / ibc) * 100 : 0;

            const mAbr = MESES[mes].substring(0,3).toUpperCase();
            const a2 = String(anio).slice(-2);
            const ape = (selN.nombre || "").split(" ").slice(-2).join("-").toUpperCase();
            const fileName = `INFORME-MENSUAL-${mAbr}${a2}-${ape}-${selN.cc||""}`;

            // === RENDER HELPERS ===
            const tablaOTs = (ots, montoTotal, labelTotal) => {
              if (ots.length === 0) {
                return `<div style="padding:8px;background:#FAFAF7;border:1px solid #eee;border-radius:4px;font-size:8pt;color:#999;font-style:italic;text-align:center;margin-bottom:6px">Sin imputaciones en este periodo</div>`;
              }
              let h = `<table><thead><tr><th>CT</th><th>Centro / Proyecto</th><th style="text-align:right" title="Días trabajados (imputaciones manuales)">Trab.</th><th style="text-align:right" title="Festivos asignados al centro base">Fest.</th><th style="text-align:right" title="Novedades (incap/vac/lic) al centro base">Nov.</th><th style="text-align:right">Dias</th><th style="text-align:right">%</th><th style="text-align:right">${labelTotal}</th></tr></thead><tbody>`;
              ots.forEach(o => {
                const monto = montoTotal * (o.pct / 100);
                h += `<tr class="imp"><td><b>${o.codigo}</b></td><td>${o.nombre}</td><td style="text-align:right;color:#444">${o.trab}</td><td style="text-align:right;color:#92400E">${o.fest||""}</td><td style="text-align:right;color:#B91C1C">${o.nov||""}</td><td style="text-align:right"><b>${o.dias}</b></td><td style="text-align:right">${fmtPct(o.pct)}</td><td style="text-align:right;font-family:monospace"><b>${fmtCurr(monto)}</b></td></tr>`;
              });
              const tT = ots.reduce((s,o)=>s+o.trab,0);
              const tF = ots.reduce((s,o)=>s+o.fest,0);
              const tN = ots.reduce((s,o)=>s+o.nov,0);
              h += `<tr style="background:#111;color:#fff"><td colspan="2"><b>TOTAL</b></td><td style="text-align:right">${tT}</td><td style="text-align:right">${tF||""}</td><td style="text-align:right">${tN||""}</td><td style="text-align:right"><b>${ots.reduce((s,o)=>s+o.dias,0)}</b></td><td style="text-align:right"><b>100%</b></td><td style="text-align:right;font-family:monospace"><b>${fmtCurr(montoTotal)}</b></td></tr>`;
              h += `</tbody></table>`;
              return h;
            };

            // Listas para el bloque 0: festivos del mes, novedades del mes
            const festListInforme = festivosMes.map(h => {
              const k = fechaAStr(h.date);
              const centroId = centroBaseParaFecha(k);
              const c = centros.find(x => x.id === centroId);
              return {
                fechaTxt: h.date.toLocaleDateString(getTenantDefaultsSync().locale, {weekday:"short", day:"numeric", month:"short"}),
                motivo: h.name,
                centroCod: c ? c.codigo : "—"
              };
            });
            const novListInforme = Object.entries(nDias).sort().map(([k, v]) => {
              if (v === "normal") return null;
              const d = new Date(k + "T12:00:00");
              const info = NOV_TIPOS.find(n => n.id === v);
              const centroId = centroBaseParaFecha(k);
              const c = centros.find(x => x.id === centroId);
              return {
                fechaTxt: d.toLocaleDateString(getTenantDefaultsSync().locale, {weekday:"short", day:"numeric", month:"short"}),
                tipo: info?.label || v,
                centroCod: c ? c.codigo : "—",
                tipoId: v
              };
            }).filter(Boolean);
            // Conteos por tipo para el resumen
            const cntIncap = Object.values(nDias).filter(v => v === "incapacidad").length;
            const cntVac = Object.values(nDias).filter(v => v === "vacaciones").length;
            const cntLicRem = Object.values(nDias).filter(v => v === "licencia").length;
            const cntLicNoRem = Object.values(nDias).filter(v => v === "licNoRem").length;
            const cntAus = Object.values(nDias).filter(v => v === "ausencia").length;

            const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${fileName}</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"><\/script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"><\/script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Helvetica,Arial,sans-serif;background:#e5e5e5;margin:0;padding:20px 0}
#content{background:#fff;width:794px;margin:0 auto;padding:35px 45px;font-size:9pt;color:#111;line-height:1.35;box-shadow:0 0 8px rgba(0,0,0,.15)}
.hdr{border-bottom:2px solid #111;padding-bottom:6px;margin-bottom:10px;overflow:hidden}
.hdr .l{float:left}.hdr .r{float:right;text-align:right;font-size:8pt;color:#666;padding-top:6px}
.hdr img{height:36px}
h1{font-size:12pt;text-align:center;margin:4px 0 2px;clear:both}
h2{font-size:9.5pt;margin:14px 0 4px;padding:6px 8px;background:#111;color:#fff;border-radius:3px;clear:both}
h3{font-size:8.5pt;margin:8px 0 4px;color:#666;text-transform:uppercase;letter-spacing:.5px;clear:both}
.sub{font-size:8pt;color:#666;text-align:center;margin-bottom:10px}
.info{margin-bottom:10px;font-size:8.5pt;overflow:hidden}.info div{float:left;width:50%;padding:1px 0}
.info span{color:#666}.info b{color:#111}
table{width:100%;border-collapse:collapse;margin-bottom:8px;font-size:8.5pt;clear:both}
th{text-align:left;padding:4px 6px;font-size:7pt;font-weight:700;text-transform:uppercase;border-bottom:2px solid #111}
td{padding:3px 6px;border-bottom:1px solid #ddd}
.imp{background:#f4f4f4}
.kv{display:flex;justify-content:space-between;padding:3px 8px;font-size:8.5pt;border-bottom:1px dotted #ddd}
.kv .l{color:#444}.kv .v{font-family:monospace;color:#111;font-weight:600}
.kv.subtot{background:#e8f4ee;border-bottom:1px solid #1E6B42;font-weight:700;color:#1E6B42}
.kv.bigtot{background:#111;color:#fff;font-weight:700;font-size:9.5pt;padding:6px 8px;margin-top:4px;border-radius:3px}
.kv.bigtot .l{color:#fff}.kv.bigtot .v{color:#fff;font-size:10pt}
.notebox{padding:8px 10px;background:#FEF3C7;border:1px solid #F59E0B;border-radius:4px;font-size:7.5pt;color:#92400E;margin:8px 0}
.sig{margin-top:20px;overflow:hidden}.sig div{float:left;width:30%;margin-right:5%;text-align:center;font-size:8pt;border-top:1px solid #111;padding-top:5px}
.sig div:last-child{margin-right:0}
.foot{font-size:6.5pt;color:#999;text-align:center;margin-top:10px;clear:both}
.np{text-align:center;margin:16px auto;max-width:794px}
.btn{background:#111;color:#fff;border:none;padding:10px 24px;border-radius:4px;cursor:pointer;font-size:11pt;font-weight:600;margin:0 4px}
.btn2{background:#fff;color:#111;border:1px solid #111;padding:10px 24px;border-radius:4px;cursor:pointer;font-size:11pt;margin:0 4px}
@page{size:A4 portrait;margin:0}table,tr,thead{page-break-inside:avoid;break-inside:avoid}h1,h2,h3{page-break-after:avoid;break-after:avoid}.kv,.kv.bigtot,.info,.notebox,.sig{page-break-inside:avoid;break-inside:avoid}.page-break{page-break-before:always;break-before:page}@media print{html,body{background:#fff;margin:0;padding:0;width:210mm}.np{display:none}#content{width:210mm;max-width:none;margin:0;padding:14mm 14mm;box-shadow:none;box-sizing:border-box}}
</style></head><body>
<div id="content">
<div class="hdr"><div class="l"><img src="${HAB_LOGO}" alt="Habitaris"/></div><div class="r"><div style="font-weight:600;color:#111">${getActiveCompanyLegalDataSync().legalName}</div><div>NIT: ${getActiveCompanyLegalDataSync().taxId}</div></div></div>
<h1>INFORME MENSUAL COMPLETO</h1>
<div class="sub">${MESES[mes]} ${anio} · Ref: ${fileName}</div>
<div class="info">
<div><span>Empleado: </span><b>${selN.nombre}</b></div>
<div><span>Documento: </span><b>${selN.cc}</b></div>
<div><span>Cargo: </span><b>${selN.cargo}</b></div>
<div><span>Modalidad: </span><b>${esQuincenal?"Quincenal":"Mensual"}</b></div>
<div><span>Salario base: </span><b>${fmtCurr(selN.sal||0)}</b></div>
<div><span>Días trabajados: </span><b>${calc.dias||0}</b></div>
</div>

<h2>1. ASISTENCIA Y NOVEDADES DEL MES</h2>

<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:10px">
<div style="padding:6px 8px;background:#FAFAF7;border:1px solid #eee;border-radius:4px"><div style="font-size:6.5pt;color:#999;text-transform:uppercase;letter-spacing:.5px;font-weight:700">Trabajados</div><div style="font-size:13pt;font-weight:700;color:#111">${calc.dias||0}</div></div>
<div style="padding:6px 8px;background:#FFFBEB;border:1px solid #F4D85E;border-radius:4px"><div style="font-size:6.5pt;color:#92400E;text-transform:uppercase;letter-spacing:.5px;font-weight:700">Festivos</div><div style="font-size:13pt;font-weight:700;color:#92400E">${festivosMes.length}</div></div>
<div style="padding:6px 8px;background:#FEE2E2;border:1px solid #FCA5A5;border-radius:4px"><div style="font-size:6.5pt;color:#B91C1C;text-transform:uppercase;letter-spacing:.5px;font-weight:700">Novedades</div><div style="font-size:13pt;font-weight:700;color:#B91C1C">${novListInforme.length}</div></div>
<div style="padding:6px 8px;background:#EFF6FF;border:1px solid #93C5FD;border-radius:4px"><div style="font-size:6.5pt;color:#1D4ED8;text-transform:uppercase;letter-spacing:.5px;font-weight:700">Asistidos</div><div style="font-size:13pt;font-weight:700;color:#1D4ED8">${calc.diasAsist||0}</div></div>
</div>

${festListInforme.length > 0 ? `
<h3 style="font-size:9pt;margin:6px 0 3px">🎉 Festivos del mes</h3>
<table style="margin-bottom:6px"><thead><tr><th style="width:30%">Fecha</th><th>Motivo</th><th style="width:20%;text-align:right">Centro base</th></tr></thead><tbody>
${festListInforme.map(f => `<tr><td>${f.fechaTxt}</td><td>${f.motivo}</td><td style="text-align:right;font-family:monospace">${f.centroCod}</td></tr>`).join("")}
</tbody></table>` : ""}

${novListInforme.length > 0 ? `
<h3 style="font-size:9pt;margin:6px 0 3px">🏥 Novedades del mes</h3>
<table style="margin-bottom:6px"><thead><tr><th style="width:30%">Fecha</th><th>Tipo</th><th style="width:20%;text-align:right">Centro base</th></tr></thead><tbody>
${novListInforme.map(n => `<tr><td>${n.fechaTxt}</td><td>${n.tipo}</td><td style="text-align:right;font-family:monospace">${n.centroCod}</td></tr>`).join("")}
</tbody></table>
<div style="font-size:7.5pt;color:#666;margin:2px 0 8px;padding-left:4px">Resumen: 🏥 Incap. ${cntIncap}d &middot; 🏖️ Vac. ${cntVac}d &middot; 📋 Lic.rem. ${cntLicRem}d &middot; ⚠️ Lic.NO rem. ${cntLicNoRem}d &middot; ❌ Aus. ${cntAus}d</div>
` : ""}

<h3 style="font-size:9pt;margin:6px 0 3px">📍 Imputación total del mes por centro</h3>
<table style="margin-bottom:6px"><thead><tr><th>Centro</th><th>Nombre</th><th style="text-align:right">Trab.</th><th style="text-align:right">Fest.</th><th style="text-align:right">Nov.</th><th style="text-align:right">Total días</th><th style="text-align:right">%</th></tr></thead><tbody>
${otsMes.map(o => `<tr class="imp"><td><b>${o.codigo}</b></td><td>${o.nombre}</td><td style="text-align:right;color:#444">${o.trab}</td><td style="text-align:right;color:#92400E">${o.fest||""}</td><td style="text-align:right;color:#B91C1C">${o.nov||""}</td><td style="text-align:right"><b>${o.dias}</b></td><td style="text-align:right">${fmtPct(o.pct)}</td></tr>`).join("")}
<tr style="background:#111;color:#fff"><td colspan="2"><b>TOTAL</b></td><td style="text-align:right">${otsMes.reduce((s,o)=>s+o.trab,0)}</td><td style="text-align:right">${otsMes.reduce((s,o)=>s+o.fest,0)||""}</td><td style="text-align:right">${otsMes.reduce((s,o)=>s+o.nov,0)||""}</td><td style="text-align:right"><b>${otsMes.reduce((s,o)=>s+o.dias,0)}</b></td><td style="text-align:right"><b>100%</b></td></tr>
</tbody></table>

<h2>2. SALARIO NETO — lo que se paga al trabajador</h2>
<div class="kv"><div class="l">Devengado bruto</div><div class="v">${fmtCurr(dev)}</div></div>
<div class="kv"><div class="l" style="padding-left:12px">&nbsp;&nbsp;(-) Salud empleado (4% IBC)</div><div class="v">- ${fmtCurr(calc.epsE||0)}</div></div>
<div class="kv"><div class="l" style="padding-left:12px">&nbsp;&nbsp;(-) Pensión empleado (4% IBC)</div><div class="v">- ${fmtCurr(calc.penE||0)}</div></div>
${(calc.rteF||0) > 0 ? `<div class="kv"><div class="l" style="padding-left:12px">&nbsp;&nbsp;(-) Retencion en la fuente</div><div class="v">- ${fmtCurr(calc.rteF||0)}</div></div>` : ''}
${(calc.otrasDed||0) > 0 ? `<div class="kv"><div class="l" style="padding-left:12px">&nbsp;&nbsp;(-) Otras deducciones</div><div class="v">- ${fmtCurr(calc.otrasDed||0)}</div></div>` : ''}
<div class="kv subtot"><div class="l">Total deducciones</div><div class="v">- ${fmtCurr(totDed)}</div></div>
<div class="kv bigtot"><div class="l">NETO AL TRABAJADOR</div><div class="v">${fmtCurr(dev - totDed)}</div></div>
${esQuincenal ? `<div class="kv" style="padding-left:12px"><div class="l">&nbsp;&nbsp;Q1 anticipo (pagado 15 ${MESES[mes].toLowerCase()})</div><div class="v">${fmtCurr(q1Total)}</div></div>
<div class="kv" style="padding-left:12px"><div class="l">&nbsp;&nbsp;Q2 fin de mes</div><div class="v">${fmtCurr(q2Total)}</div></div>` : ''}
<h3 style="font-size:8pt;margin-top:8px;color:#666">Reparto del NETO por CT</h3>
${tablaOTs(otsMes, dev - totDed, "Neto imputado")}

${esQuincenal ? `
<h2 class="page-break">3. DETALLE QUINCENAL — pagos al trabajador por quincena</h2>

<h3 style="font-size:9.5pt;margin:8px 0 4px;color:#1E3A8A">📅 Quincena 1 (1-15 ${MESES[mes].toLowerCase()}) — Anticipo Q1</h3>
<div class="kv"><div class="l">Anticipo Q1 pagado (50% salario base proporcional)</div><div class="v">${fmtCurr(q1Total)}</div></div>
<h3 style="font-size:8pt;margin:4px 0 3px;color:#666">Reparto Q1 por CT (${totQ1} días del 1 al 15)</h3>
${tablaOTs(otsQ1, q1Total, "Q1 imputado")}

<h3 style="font-size:9.5pt;margin:14px 0 4px;color:#1E3A8A">📅 Quincena 2 (16-${new Date(anio,mes+1,0).getDate()} ${MESES[mes].toLowerCase()}) — Pago Q2 (neto Q2)</h3>
<div class="kv"><div class="l">Pago Q2 (neto del mes menos anticipo Q1)</div><div class="v">${fmtCurr(q2Total)}</div></div>
<h3 style="font-size:8pt;margin:4px 0 3px;color:#666">Reparto Q2 por CT (${totQ2} días del 16 al ${new Date(anio,mes+1,0).getDate()})</h3>
${tablaOTs(otsQ2, q2Total, "Q2 imputado")}
` : ''}

<h2>4. SEGURIDAD SOCIAL — lo que se paga a PILA mes siguiente</h2>
<h3 style="font-size:9pt;margin-top:4px">Aportes del trabajador</h3>
<div class="kv"><div class="l">Salud trabajador (4% IBC ${fmtCurr(ibc)})</div><div class="v">${fmtCurr(calc.epsE||0)}</div></div>
<div class="kv"><div class="l">Pensión trabajador (4% IBC)</div><div class="v">${fmtCurr(calc.penE||0)}</div></div>
<div class="kv subtot"><div class="l">Subtotal aportes trabajador</div><div class="v">${fmtCurr((calc.epsE||0)+(calc.penE||0))}</div></div>

<h3 style="font-size:9pt;margin-top:6px">Aportes de la empresa</h3>
<div class="kv"><div class="l">Salud empresa (8.5% IBC) ${calc.exS?"<i style='color:#666'>— exonerada Art.114-1 ET</i>":""}</div><div class="v">${fmtCurr(segSocial.salud)}</div></div>
<div class="kv"><div class="l">Pensión empresa (12% IBC)</div><div class="v">${fmtCurr(segSocial.pension)}</div></div>
<div class="kv"><div class="l">ARL (${fmtPct(pctArl)} IBC, nivel ${selN.arl||0})</div><div class="v">${fmtCurr(segSocial.arl)}</div></div>
<div class="kv"><div class="l">Caja de Compensación (4% IBC)</div><div class="v">${fmtCurr(segSocial.caja)}</div></div>
<div class="kv"><div class="l">ICBF (3% IBC) ${calc.exS?"<i style='color:#666'>— exonerada Art.114-1 ET</i>":""}</div><div class="v">${fmtCurr(segSocial.icbf)}</div></div>
<div class="kv"><div class="l">SENA (2% IBC) ${calc.exS?"<i style='color:#666'>— exonerada Art.114-1 ET</i>":""}</div><div class="v">${fmtCurr(segSocial.sena)}</div></div>
<div class="kv subtot"><div class="l">Subtotal aportes empresa</div><div class="v">${fmtCurr(totSegSocial)}</div></div>

<div class="kv bigtot"><div class="l">TOTAL PILA EMPRESA (trabajador + empresa)</div><div class="v">${fmtCurr(totDed + totSegSocial)}</div></div>
<h3 style="font-size:8pt;margin-top:8px;color:#666">Reparto del PILA por CT</h3>
${tablaOTs(otsMes, totDed + totSegSocial, "PILA imputado")}

<h2 class="page-break">5. PROVISIÓNES — pasivo acumulado, pago futuro</h2>
<div class="kv"><div class="l">Prima de servicios (8.33% — pago semestral jun/dic)</div><div class="v">${fmtCurr(prestaciones.prima)}</div></div>
<div class="kv"><div class="l">Cesantías (8.33% — consigna feb año siguiente)</div><div class="v">${fmtCurr(prestaciones.ces)}</div></div>
<div class="kv"><div class="l">Intereses sobre cesantias (1% — paga ene año siguiente)</div><div class="v">${fmtCurr(prestaciones.intC)}</div></div>
<div class="kv"><div class="l">Vacaciones (4.17% — cuando se disfrutan o en liquidación)</div><div class="v">${fmtCurr(prestaciones.vac)}</div></div>
<div class="kv bigtot"><div class="l">TOTAL PROVISIÓNES</div><div class="v">${fmtCurr(totPrestaciones)}</div></div>
<h3 style="font-size:8pt;margin-top:8px;color:#666">Reparto de las PROVISIÓNES por CT</h3>
${tablaOTs(otsMes, totPrestaciones, "Provisión imputada")}
${primaSemBlock}

<h2 style="background:#7F1D1D">6. 💵 GASTO TOTAL DE CAJA DEL MES</h2>
<div class="kv"><div class="l">Neto al trabajador (sale del banco al empleado)</div><div class="v">${fmtCurr(dev - totDed)}</div></div>
<div class="kv"><div class="l">PILA empresa (sale del banco al sistema, mes siguiente)</div><div class="v">${fmtCurr(totDed + totSegSocial)}</div></div>
<div class="kv bigtot" style="background:#7F1D1D"><div class="l">TOTAL CAJA DEL MES</div><div class="v">${fmtCurr((dev - totDed) + (totDed + totSegSocial))}</div></div>
<h3 style="font-size:8pt;margin-top:8px;color:#666">Reparto de la CAJA TOTAL por CT</h3>
${tablaOTs(otsMes, (dev - totDed) + (totDed + totSegSocial), "Caja imputada")}

<h2 style="background:#78350F">7. 🏷️ COSTO TOTAL CON PROVISIÓNES</h2>
<div class="kv"><div class="l">💵 Caja del mes</div><div class="v">${fmtCurr((dev - totDed) + (totDed + totSegSocial))}</div></div>
<div class="kv"><div class="l">📊 Provisiones del mes</div><div class="v">${fmtCurr(totPrestaciones)}</div></div>
<div class="kv bigtot" style="background:#78350F"><div class="l">COSTO TOTAL EMPRESA</div><div class="v">${fmtCurr(totalCostoEmpresa)}</div></div>
<h3 style="font-size:8pt;margin-top:8px;color:#666">Reparto del COSTO TOTAL por CT</h3>
${tablaOTs(otsMes, totalCostoEmpresa, "Costo total imputado")}

<div class="sig">
<div>Elaborado por<br><span style="color:#999">RRHH</span></div>
<div>Revisado por<br><span style="color:#999">Contabilidad</span></div>
<div>Aprobado por<br><span style="color:#999">Dirección</span></div>
</div>
<div class="foot">Habitaris Suite &middot; ${new Date().toLocaleDateString(getTenantDefaultsSync().locale,{day:"numeric",month:"long",year:"numeric"})} &middot; ${fileName}</div>
</div>
<div class="np">
<button class="btn" onclick="(function(){var el=document.getElementById('content');var hdrEl=el.querySelector('.hdr');el.style.boxShadow='none';document.querySelector('.np').style.display='none';var st=document.createElement('div');st.style.cssText='text-align:center;padding:10px;font-family:monospace;color:#999';st.textContent='Generando PDF...';document.body.appendChild(st);var pbList=el.querySelectorAll('.page-break');var elRect=el.getBoundingClientRect();var hdrRect=hdrEl.getBoundingClientRect();var hdrEnd=hdrRect.bottom-elRect.top+8;var breakPoints=[hdrEnd];pbList.forEach(function(pb){var r=pb.getBoundingClientRect();breakPoints.push(r.top-elRect.top)});breakPoints.push(el.scrollHeight);html2canvas(el,{scale:2,useCORS:true,width:el.scrollWidth,windowWidth:el.scrollWidth,backgroundColor:'#fff'}).then(function(canvas){var iW=canvas.width,iH=canvas.height,pW=210;var scaleY=iH/el.scrollHeight;var J=jspdf.jsPDF;var pdf=new J({orientation:'portrait',unit:'mm',format:'a4'});var hdrHpx=Math.floor(hdrEnd*scaleY);var hc=document.createElement('canvas');hc.width=iW;hc.height=hdrHpx;var hctx=hc.getContext('2d');hctx.fillStyle='#fff';hctx.fillRect(0,0,iW,hdrHpx);hctx.drawImage(canvas,0,0,iW,hdrHpx,0,0,iW,hdrHpx);var hdrImg=hc.toDataURL('image/jpeg',0.92);var hdrHmm=hdrHpx*pW/iW;var totalPages=breakPoints.length-1;for(var i=0;i<totalPages;i++){var startPx=Math.floor(breakPoints[i]*scaleY);var endPx=Math.floor(breakPoints[i+1]*scaleY);var sliceH=endPx-startPx;if(sliceH<=0)continue;var pc=document.createElement('canvas');pc.width=iW;pc.height=sliceH;var ctx=pc.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,iW,sliceH);ctx.drawImage(canvas,0,startPx,iW,sliceH,0,0,iW,sliceH);var sImg=pc.toDataURL('image/jpeg',0.92);var sHmm=sliceH*pW/iW;if(i>0)pdf.addPage();pdf.addImage(hdrImg,'JPEG',0,0,pW,hdrHmm);var contentY=hdrHmm;var availH=297-hdrHmm-12;if(sHmm>availH){var ratio=availH/sHmm;var scaledW=pW*ratio;var marginX=(pW-scaledW)/2;pdf.addImage(sImg,'JPEG',marginX,contentY,scaledW,availH)}else{pdf.addImage(sImg,'JPEG',0,contentY,pW,sHmm)}pdf.setFontSize(8);pdf.setTextColor(120);pdf.text('Página '+(i+1)+' de '+totalPages,pW/2,291,{align:'center'})}pdf.save('${fileName}.pdf');st.textContent='PDF descargado';el.style.boxShadow='0 0 8px rgba(0,0,0,.15)';document.querySelector('.np').style.display='';}).catch(function(e){st.textContent='Error: '+e.message;document.querySelector('.np').style.display=''})})()">Descargar PDF</button>
<button class="btn2" onclick="window.print()">Imprimir</button>
</div>
</body></html>`;
      return html;
    };
    const genCostesHtml = () => {
            // Sprint D: Informe de costes por OT con Fórmula A (proporcional a días imputados)
            // Por cada empleado: repartir calcN(n).costoT entre las OTs según días imputados.
            // Domingos, festivos y novedades quedan absorbidos proporcionalmente.
            const acumOT={};
            noms.forEach(n=>{
              const calc=calcN(n);
              const costoTotal=calc.costoT||0;
              if(costoTotal===0)return;
              const impDias=n.impDias||{};
              const diasPorOT={};
              Object.values(impDias).forEach(otId=>{
                if(otId&&otId!=="__conflicto__")diasPorOT[otId]=(diasPorOT[otId]||0)+1;
              });
              const totalDias=Object.values(diasPorOT).reduce((a,b)=>a+b,0);
              if(totalDias===0)return;
              Object.entries(diasPorOT).forEach(([otId,dias])=>{
                const costePorOT=(dias/totalDias)*costoTotal;
                if(!acumOT[otId])acumOT[otId]={dias:0,coste:0,empleados:[]};
                acumOT[otId].dias+=dias;
                acumOT[otId].coste+=costePorOT;
                acumOT[otId].empleados.push({empId:n.empId,nombre:n.nombre,cargo:n.cargo,dias:dias,coste:costePorOT,costoTotal:costoTotal});
              });
            });
            const fmtCurr=v=>new Intl.NumberFormat(getTenantDefaultsSync().locale,{style:"currency",currency:"COP",maximumFractionDigits:0}).format(v);
            const otsArr=Object.entries(acumOT).map(([id,info])=>({id:id,info:info,centro:centros.find(c=>c.id===id)})).sort((a,b)=>b.info.coste-a.info.coste);
            const totalCostes=otsArr.reduce((s,x)=>s+x.info.coste,0);
            const empUnicos=new Set();
            otsArr.forEach(x=>x.info.empleados.forEach(e=>empUnicos.add(e.empId)));
            const totalEmpUnicos=empUnicos.size;
            const totalDiasGlobal=otsArr.reduce((s,x)=>s+x.info.dias,0);
            const mAbr=MESES[mes].substring(0,3).toUpperCase();
            const a2=String(anio).slice(-2);
            const fileName=`COSTES-OT-${mAbr}${a2}`;
            const fechaGen=new Date().toLocaleDateString(getTenantDefaultsSync().locale,{day:"numeric",month:"long",year:"numeric"});
            let body='';
            if(otsArr.length===0){
              body='<div style="padding:24px;text-align:center;color:#999;font-style:italic;background:#FAFAF7;border-radius:4px;">No hay imputaciones de OT en este mes para distribuir costes. Asegúrate de que los empleados tienen calendarios laborales asignados en Centros de Trabajo.</div>';
            }else{
              // Tarjetas resumen tipo "sbox"
              body+=`<div class="summary">`;
              body+=`<div class="sbox"><div class="n">${totalEmpUnicos}</div><div class="l">Empleados</div></div>`;
              body+=`<div class="sbox"><div class="n">${totalDiasGlobal}</div><div class="l">Días imputados</div></div>`;
              body+=`<div class="sbox"><div class="n" style="font-size:11pt;">${fmtCurr(totalCostes)}</div><div class="l">Coste total</div></div>`;
              body+=`</div>`;
              // Tabla resumen por OT
              body+='<h2>Resumen por OT</h2><table><thead><tr><th>CT</th><th>Nombre</th><th style="text-align:right">Empleados</th><th style="text-align:right">Días</th><th style="text-align:right">% del total</th><th style="text-align:right">Coste imputado</th></tr></thead><tbody>';
              otsArr.forEach(x=>{
                const pct=totalCostes?((x.info.coste/totalCostes)*100).toFixed(1):'0';
                body+=`<tr><td><b>${x.centro?x.centro.codigo:x.id}</b></td><td>${x.centro?x.centro.nombre:''}</td><td style="text-align:right">${x.info.empleados.length}</td><td style="text-align:right">${x.info.dias}</td><td style="text-align:right">${pct}%</td><td style="text-align:right"><b>${fmtCurr(x.info.coste)}</b></td></tr>`;
              });
              body+=`<tr class="imp"><td colspan="2"><b>TOTAL</b></td><td style="text-align:right"><b>${totalEmpUnicos}</b></td><td style="text-align:right"><b>${totalDiasGlobal}</b></td><td style="text-align:right"><b>100%</b></td><td style="text-align:right"><b>${fmtCurr(totalCostes)}</b></td></tr>`;
              body+='</tbody></table>';
              // Detalle por OT
              body+='<h2>Detalle por OT</h2>';
              otsArr.forEach(x=>{
                body+=`<h3 style="font-size:9pt;margin:8px 0 4px;color:#111;background:#f4f4f4;padding:4px 6px;">${x.centro?x.centro.codigo:x.id} — ${x.centro?x.centro.nombre:''} · ${fmtCurr(x.info.coste)} (${x.info.dias} días)</h3>`;
                body+='<table><thead><tr><th>Empleado</th><th>Cargo</th><th style="text-align:right">Días</th><th style="text-align:right">Coste empresa total</th><th style="text-align:right">Coste imputado</th></tr></thead><tbody>';
                x.info.empleados.forEach(e=>{
                  body+=`<tr><td>${e.nombre}</td><td>${e.cargo||'-'}</td><td style="text-align:right">${e.dias}</td><td style="text-align:right">${fmtCurr(e.costoTotal)}</td><td style="text-align:right"><b>${fmtCurr(e.coste)}</b></td></tr>`;
                });
                body+='</tbody></table>';
              });
              body+='<div style="margin-top:12px;font-size:7.5pt;color:#555;font-style:italic;padding:8px;background:#FAFAF7;border-left:3px solid #111;">Fórmula A (proporcional a días imputados): el coste mensual de cada empleado (devengado + auxilios + cargas empresariales) se reparte entre las OTs según los días imputados. Domingos, festivos y novedades quedan absorbidos proporcionalmente.</div>';
            }
            const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${fileName}</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"><\/script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"><\/script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Helvetica,Arial,sans-serif;background:#e5e5e5;margin:0;padding:20px 0}
#content{background:#fff;width:794px;margin:0 auto;padding:35px 45px;font-size:9pt;color:#111;line-height:1.35;box-shadow:0 0 8px rgba(0,0,0,.15)}
.hdr{border-bottom:2px solid #111;padding-bottom:6px;margin-bottom:10px;overflow:hidden}
.hdr .l{float:left}.hdr .r{float:right;text-align:right;font-size:8pt;color:#666;padding-top:6px}
.hdr img{height:36px}
h1{font-size:12pt;text-align:center;margin:4px 0 2px;clear:both}
h2{font-size:9.5pt;margin:10px 0 4px;border-bottom:1px solid #ccc;padding-bottom:2px;clear:both}
.sub{font-size:8pt;color:#666;text-align:center;margin-bottom:10px}
table{width:100%;border-collapse:collapse;margin-bottom:8px;font-size:8.5pt;clear:both}
th{text-align:left;padding:4px 6px;font-size:7pt;font-weight:700;text-transform:uppercase;border-bottom:2px solid #111}
td{padding:3px 6px;border-bottom:1px solid #ddd}
.imp{background:#f4f4f4}
.summary{margin:8px 0;overflow:hidden}
.sbox{float:left;width:31%;margin-right:3%;border:1px solid #ccc;border-radius:4px;padding:6px;text-align:center;margin-bottom:6px}
.sbox:nth-child(3n){margin-right:0}
.sbox .n{font-size:16pt;font-weight:800;font-family:monospace}.sbox .l{font-size:7pt;color:#666;text-transform:uppercase}
.foot{font-size:6.5pt;color:#999;text-align:center;margin-top:10px;clear:both}
.np{text-align:center;margin:16px auto;max-width:794px}
.btn{background:#111;color:#fff;border:none;padding:10px 24px;border-radius:4px;cursor:pointer;font-size:11pt;font-weight:600;margin:0 4px}
.btn2{background:#fff;color:#111;border:1px solid #111;padding:10px 24px;border-radius:4px;cursor:pointer;font-size:11pt;margin:0 4px}
@page{size:A4 portrait;margin:0}table,tr,thead{page-break-inside:avoid;break-inside:avoid}h1,h2,h3{page-break-after:avoid;break-after:avoid}.kv,.kv.bigtot,.info,.notebox,.sig{page-break-inside:avoid;break-inside:avoid}.page-break{page-break-before:always;break-before:page}@media print{html,body{background:#fff;margin:0;padding:0;width:210mm}.np{display:none}#content{width:210mm;max-width:none;margin:0;padding:14mm 14mm;box-shadow:none;box-sizing:border-box}}
</style></head><body>
<div id="content">
<div class="hdr"><div class="l"><img src="${HAB_LOGO}" alt="Habitaris"/></div><div class="r"><div style="font-weight:600;color:#111">${getActiveCompanyLegalDataSync().legalName}</div><div>NIT: ${getActiveCompanyLegalDataSync().taxId}</div></div></div>
<h1>INFORME DE COSTES POR ORDEN DE TRABAJO</h1>
<div class="sub">${MESES[mes]} ${anio} · Ref: ${fileName}</div>
${body}
<div class="foot">Habitaris Suite · ${fechaGen} · ${fileName}</div>
</div>
<div class="np"><button class="btn" onclick="window.print()">🖨 Imprimir</button><button class="btn2" onclick="window.close()">Cerrar</button></div>
</body></html>`;
      return html;
    };
    return(
      <div className="fade-up" style={{maxWidth:1050,margin:"0 auto"}}>
        {/* FILA 1: acciones primarias (Volver, nombre/cargo, Guardar, Pagar, Ref pago, EstadoPills) */}
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8,flexWrap:"wrap"}}>
          <Btn onClick={()=>{setVista("lista");setSubTab("nomina");}}>← Volver</Btn>
          <div style={{flex:1,minWidth:240}}>
            <div style={{fontSize:16,fontWeight:700,lineHeight:1.2}}>{selN.nombre}</div>
            <div style={{fontSize:11,color:T.inkLight,marginTop:2}}>{selN.cargo} · {selN.cc} · <span style={{fontWeight:600,color:selN.modalidadPago==="mensual"?T.ink:T.blue}}>{selN.modalidadPago==="mensual"?"Pago mensual":"Pago quincenal"}</span></div>
          </div>
          <EstadoPills n={selN}/>
          <Btn pri small onClick={guardar} disabled={guard}>{guard?"…":"💾 Guardar"}</Btn>
          {isQ&&selN.estado==="borrador"&&<Btn small disabled={periodoQ1.count > 0} onClick={()=>{if(periodoQ1.count > 0){alert("⚠️ Quedan "+periodoQ1.count+" día(s) pendientes en la primera quincena (1-15). Imputa una OT o registra novedad antes de liquidar.");return;}setPagoForm({tipo:"q1",ref:sugerirRef("q1"),soporte:null});}}>💵 Pagar Q1 (anticipo)</Btn>}
          {isQ&&selN.estado==="q1_pagado"&&<Btn pri small disabled={periodoQ2.count > 0} onClick={()=>{if(periodoQ2.count > 0){alert("⚠️ Quedan "+periodoQ2.count+" día(s) pendientes en la segunda quincena. Imputa una OT o registra novedad antes de liquidar.");return;}setPagoForm({tipo:"nomina",ref:sugerirRef("nomina"),soporte:null});}}>💵 Pagar Q2 (liquidar)</Btn>}
          {!isQ&&selN.estado==="borrador"&&<Btn pri small disabled={periodoMes.count > 0} onClick={()=>{if(periodoMes.count > 0){alert("⚠️ Quedan "+periodoMes.count+" día(s) pendientes en el mes. Imputa una OT o registra novedad antes de liquidar.");return;}setPagoForm({tipo:"nomina",ref:sugerirRef("nomina"),soporte:null});}}>💵 Pagar nómina</Btn>}
          {(mes===5||mes===11)&&!(soportesPago[selN.empId+":prima"]&&soportesPago[selN.empId+":prima"].data)&&<Btn pri small onClick={async()=>{const ps=await calcPrimaSemestre(selN,anio,mes);setPagoForm({tipo:"prima",ref:sugerirRef("prima"),soporte:null,monto:ps.prima});}}>🎁 Pagar prima</Btn>}
          {(selN.estado==="q1_pagado"||selN.estado==="liquidada"||selN.estado==="pagada")&&selN.refPago&&<span style={{fontSize:9,color:T.inkLight,padding:"4px 8px",background:T.accent,borderRadius:4,display:"inline-flex",alignItems:"center",gap:6}}>Ref: {selN.refPago}<button type="button" title="Copiar referencia" onClick={()=>{navigator.clipboard.writeText(selN.refPago).then(()=>window.toast("Referencia copiada","success")).catch(()=>window.toast("No se pudo copiar","error"));}} style={{border:"none",background:"none",cursor:"pointer",fontSize:11,padding:0,lineHeight:1}}>📋</button></span>}
          <Btn small onClick={()=>{(()=>{const u=getTenantUrlsSync();const id=getTenantIdentitySync();window.open("https://wa.me/?text="+encodeURIComponent(id.displayName+"\n\n👤 Portal del empleado:\n"+u.portalEmpleado+"\n\nIngresa tu cédula y PIN (últimos 4 dígitos de tu cédula)"),"_blank");})();}}>💬 Link empleados</Btn>
        </div>

        {/* Payment form */}
        {pagoForm&&(
          <div style={{background:T.surface,border:`2px solid ${T.ink}`,borderRadius:8,padding:16,marginBottom:14}}>
            <div style={{fontSize:13,fontWeight:700,marginBottom:10}}>{pagoForm.tipo==="q1"?"💵 Confirmar pago anticipo Q1":pagoForm.tipo==="prima"?"🎁 Confirmar pago de prima":"💵 Confirmar pago de nómina"}</div>
            <div style={{fontSize:11,color:T.inkLight,marginBottom:12}}>
              {pagoForm.tipo==="q1"?`Anticipo: ${fmt(calc.q1)} · ${selN.nombre}`:pagoForm.tipo==="prima"?`Prima de servicios: ${fmt(pagoForm.monto||0)} · ${selN.nombre}`:`Neto: ${fmt(isQ?calc.q2:calc.neto)} · ${selN.nombre}`}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
              <div>
                <label style={{fontSize:10,fontWeight:600,color:T.inkMid,display:"block",marginBottom:4}}>Referencia bancaria *</label>
                <div style={{display:"flex",gap:6}}>
                  <input value={pagoForm.ref} onChange={e=>setPagoForm({...pagoForm,ref:e.target.value})} placeholder="Ej: NOM MAY26 ANT - APELLIDOS" style={{flex:1,padding:"8px 12px",border:`1px solid ${T.border}`,borderRadius:4,fontSize:12,fontFamily:"'DM Mono',monospace"}}/>
                  <button type="button" title="Copiar referencia" onClick={()=>{navigator.clipboard.writeText(pagoForm.ref).then(()=>window.toast("Referencia copiada","success")).catch(()=>window.toast("No se pudo copiar","error"));}} style={{padding:"0 10px",border:`1px solid ${T.border}`,borderRadius:4,background:"#fff",cursor:"pointer",fontSize:13}}>📋</button>
                  <button type="button" title="Regenerar referencia sugerida" onClick={()=>setPagoForm({...pagoForm,ref:sugerirRef(pagoForm.tipo)})} style={{padding:"0 10px",border:`1px solid ${T.border}`,borderRadius:4,background:"#fff",cursor:"pointer",fontSize:13}}>↻</button>
                </div>
              </div>
              <div>
                <label style={{fontSize:10,fontWeight:600,color:T.inkMid,display:"block",marginBottom:4}}>Soporte de pago (opcional)</label>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e=>{const f=e.target.files[0];if(f&&f.size<5*1024*1024){const r=new FileReader();r.onload=()=>setPagoForm(p=>({...p,soporte:{name:f.name,size:f.size,data:r.result}}));r.readAsDataURL(f);}else if(f){window.toast("Archivo demasiado grande · Máximo 5MB","error");}}} style={{fontSize:11,padding:"6px 0"}}/>
                {pagoForm.soporte&&<div style={{fontSize:9,color:T.green,marginTop:2}}>✓ {pagoForm.soporte.name}</div>}
              </div>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>{
                if(!pagoForm.ref.trim()){window.toast("Ingresa la referencia bancaria","warning");return;}
                if(pagoForm.tipo==="prima"){
                  if(!pagoForm.soporte){window.toast("Adjunta el comprobante de la prima","warning");return;}
                  const nuevoSoporte={...soportesPago,[selN.empId+":prima"]:{ref:pagoForm.ref,archivo:pagoForm.soporte.name,data:pagoForm.soporte.data}};
                  setSoportesPago(nuevoSoporte);
                  fetch("/api/hiring?kv=soporte_pago&anio="+anio+"&mes="+mes,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({data:nuevoSoporte})})
                    .then(()=>{setPagoForm(null);window.toast("✓ Prima pagada · Ref: "+pagoForm.ref,"success",5000);})
                    .catch(()=>window.toast("Error al guardar el comprobante","error"));
                  return;
                }
                const liq=pagoForm.tipo==="q1"?calc.q1:(isQ?calc.q2:calc.neto);
                const tipo=pagoForm.tipo==="q1"?"anticipo":"nomina";
                const nuevoEstado=pagoForm.tipo==="q1"?"q1_pagado":"pagada";
                pubNomina(tipo,liq,pagoForm.ref,pagoForm.soporte?pagoForm.soporte.name:null).then(r=>r.json()).then(async d=>{
                  if(d.ok){
                    // Build updated array locally so saveN has the fresh value (avoids React setState closure bug)
                    const updatedNoms=noms.map(n=>n.id===selN.id?{...n,estado:nuevoEstado,refPago:pagoForm.ref,soportePago:pagoForm.soporte?pagoForm.soporte.name:null}:n);
                    setNoms(updatedNoms);
                    // Save soporte in kv if exists. Indexado por empId:tipo para no pisar
                    // soportes de otros empleados ni de la otra quincena del mismo mes.
                    if(pagoForm.soporte){
                      const nuevoSoporte={...soportesPago,[selN.empId+":"+tipo]:{ref:pagoForm.ref,archivo:pagoForm.soporte.name,data:pagoForm.soporte.data}};
                      setSoportesPago(nuevoSoporte);
                      fetch("/api/hiring?kv=soporte_pago&anio="+anio+"&mes="+mes,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({data:nuevoSoporte})});
                    }
                    // Persist the updated array directly - don't rely on guardar() which uses stale closure
                    setGuard(true);
                    await saveN(anio,mes,updatedNoms);
                    setGuard(false);
                    setPagoForm(null);
                    window.toast("✓ "+(pagoForm.tipo==="q1"?"Anticipo Q1 pagado":"Nómina pagada")+" · Ref: "+pagoForm.ref,"success",5000);
                  }
                });
              }} style={{padding:"8px 20px",background:T.ink,color:"#fff",border:"none",borderRadius:4,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Confirmar pago</button>
              <button onClick={()=>setPagoForm(null)} style={{padding:"8px 20px",background:"#fff",color:T.ink,border:`1px solid ${T.border}`,borderRadius:4,fontSize:12,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Cancelar</button>
            </div>
          </div>
        )}

        <div style={{display:"grid",gridTemplateColumns:selN.modalidadPago==="mensual"?"repeat(3,1fr)":"repeat(5,1fr)",gap:8,marginBottom:14}}>
          {(selN.modalidadPago==="mensual"
            ?[["Devengado",calc.dev,T.ink],["Deducciones",calc.totD,T.red],["Neto mes",calc.neto,T.green]]
            :[["Devengado",calc.dev,T.ink],["Deducciones",calc.totD,T.red],["Neto mes",calc.neto,T.green],["Q1 anticipo",calc.q1,T.blue],["Q2 ajuste",calc.q2,calc.q2>=0?T.green:T.red]]
          ).map(([l,v,c])=>(
            <div key={l} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:6,padding:"10px 12px",textAlign:"center"}}>
              <div style={{fontSize:8,fontWeight:700,color:T.inkLight,textTransform:"uppercase",letterSpacing:.8,marginBottom:2}}>{l}</div>
              <div style={{fontSize:17,fontWeight:800,color:c,fontFamily:"'DM Mono',monospace"}}>{fmt(v)}</div>
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:0,marginBottom:14,borderBottom:`1px solid ${T.border}`}}>
          {[{id:"nomina",lbl:"💰 Nómina"},{id:"novedades",lbl:"📋 Novedades"},{id:"asistencia",lbl:"📍 Asistencia"},{id:"ficha",lbl:"👤 Ficha"},{id:"descargables",lbl:"📊 Reportes"},{id:"liqfinal",lbl:"🚪 Liquidación Final"}].map(t=>(
            <button key={t.id} onClick={()=>setSubTab(t.id)} style={{padding:"8px 16px",fontSize:11,fontWeight:subTab===t.id?700:400,border:"none",borderBottom:subTab===t.id?`2px solid ${T.ink}`:"2px solid transparent",background:"transparent",color:subTab===t.id?T.ink:T.inkLight,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>{t.lbl}</button>
          ))}
        </div>

        {subTab==="nomina"&&(
          <div>
            {/* ── CALENDARIO + NOVEDADES ── */}
            <Card accent={T.ink} style={{marginBottom:12}}>
              {/* Sprint C: Banner de pendientes que bloquean la liquidación */}
              {(() => {
                const isMensual = !isQ;
                // Mostrar banner si hay pendientes en el período que aplica:
                //  - Quincenal Q1 (mientras esté en borrador y no se haya pagado Q1)
                //  - Quincenal Q2 (siempre que haya pendientes en Q2)
                //  - Mensual (siempre que haya pendientes en el mes)
                const showQ1 = isQ && selN.estado === "borrador" && periodoQ1.count > 0;
                const showQ2 = isQ && periodoQ2.count > 0;
                const showMes = isMensual && periodoMes.count > 0;
                if (!showQ1 && !showQ2 && !showMes) return null;
                const renderDias = (lista) => lista.slice(0,10).map(p => {
                  const lbl = p.motivo === "conflicto" ? "⚠️" : "🔴";
                  return p.day + " " + lbl;
                }).join(" · ") + (lista.length > 10 ? " · …+"+(lista.length-10)+" más" : "");
                return <div style={{padding:"10px 14px",marginBottom:14,background:"#FEE2E2",border:"1px solid #dc2626",borderRadius:6}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#991B1B",marginBottom:4}}>⚠️ Liquidación bloqueada — días pendientes</div>
                  {showQ1 && <div style={{fontSize:11,color:"#991B1B",marginTop:4}}><strong>Primera quincena:</strong> {periodoQ1.count} día(s) sin imputar. {renderDias(periodoQ1.pendientes)}</div>}
                  {showQ2 && <div style={{fontSize:11,color:"#991B1B",marginTop:4}}><strong>Segunda quincena:</strong> {periodoQ2.count} día(s) sin imputar. {renderDias(periodoQ2.pendientes)}</div>}
                  {showMes && <div style={{fontSize:11,color:"#991B1B",marginTop:4}}><strong>Mes completo:</strong> {periodoMes.count} día(s) sin imputar. {renderDias(periodoMes.pendientes)}</div>}
                  <div style={{fontSize:10,color:"#7F1D1D",marginTop:6,fontStyle:"italic"}}>🔴 = día laboral sin OT · ⚠️ = día con conflicto entre calendarios. Haz click en el día del calendario para resolverlo, o registra una novedad si no se trabajó.</div>
                </div>;
              })()}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,gap:8,flexWrap:"wrap"}}>
                <STit>📅 Calendario {MESES[mes]} {anio}</STit>
                {!modoEditarImp && (
                  <button
                    type="button"
                    onClick={()=>{
                      if(esPagada && !confirm("Vas a entrar en MODO EDICION DE IMPUTACIONES.\n\nSolo deberias cambiar a que OT corresponde cada dia trabajado. NO modifiques novedades ni horas extras ni nada mas - el mes ya esta pagado.\n\nLos cambios en imputaciones son informativos (afectan al informe de Costos por OT, no a la nomina pagada).\n\n¿Continuar?")) return;
                      setModoEditarImp(true);
                    }}
                    style={{padding:"4px 10px",fontSize:10,fontWeight:600,border:"1px solid #1E6B42",borderRadius:4,background:"#E8F4EE",color:"#1E6B42",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}
                    title="Reabre el calendario para corregir imputaciones de OT. No afecta el pago de nomina ya realizado."
                  >✏️ Editar imputaciones</button>
                )}
                {modoEditarImp && (
                  <button
                    type="button"
                    onClick={()=>{ setModoEditarImp(false); window.toast&&window.toast("Modo edicion cerrado","success"); }}
                    style={{padding:"4px 10px",fontSize:10,fontWeight:700,border:"1px solid #92400E",borderRadius:4,background:"#FEF3C7",color:"#92400E",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}
                    title="Cierra el modo edicion. No deshace los cambios ya hechos."
                  >✓ Salir de modo edicion</button>
                )}
                {(() => {
                  // Verificar que el empleado tiene calendarios asignados en algún centro
                  const tieneCals = centros.some(c =>
                    Array.isArray(c.calendarios) &&
                    c.calendarios.some(cal => Array.isArray(cal.empleados) && cal.empleados.includes(selN.empId))
                  );
                  if (!tieneCals) return null;
                  return (
                    <button
                      type="button"
                      onClick={()=>{
                        if (!ed) return;
                        if (!confirm("Esto borrará todas las imputaciones manuales del mes. Al recargar, los días se rellenarán automáticamente desde el calendario base configurado en Centros de Trabajo. ¿Continuar?")) return;
                        (async()=>{try{setGuard(true);const rn=await fetch(`/api/hiring?kv=nomina&anio=${anio}&mes=${mes}`);const dn=await rn.json();const arr=dn.data||[];const idx=arr.findIndex(n=>n.empId===selN.empId);if(idx<0){setGuard(false);throw new Error("emp");}const DOW=["D","L","M","X","J","V","S"];const nov=arr[idx].novDias||{};const ult=new Date(anio,mes+1,0).getDate();const f2s=(d)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;const calcFestCO=(yr)=>{const a=yr%19,b=Math.floor(yr/100),c=yr%100,dd=Math.floor(b/4),ee=b%4,ff=Math.floor((b+8)/25),gg=Math.floor((b-ff+1)/3),hh=(19*a+b-dd-gg+15)%30,ii=Math.floor(c/4),kk=c%4,ll=(32+2*ee+2*ii-hh-kk)%7,mm=Math.floor((a+11*hh+22*ll)/451),mes2=Math.floor((hh+ll-7*mm+114)/31),dia2=((hh+ll-7*mm+114)%31)+1;const pascua=new Date(yr,mes2-1,dia2);const aLunes=(fe)=>{const w=fe.getDay();if(w===1)return fe;const diff=w===0?1:8-w;return new Date(fe.getTime()+diff*86400000);};const addDias=(fe,n)=>new Date(fe.getTime()+n*86400000);const set=new Set();set.add(`${yr}-01-01`);set.add(f2s(aLunes(new Date(yr,0,6))));set.add(f2s(aLunes(new Date(yr,2,19))));set.add(f2s(addDias(pascua,-3)));set.add(f2s(addDias(pascua,-2)));set.add(`${yr}-05-01`);set.add(f2s(aLunes(addDias(pascua,43))));set.add(f2s(aLunes(addDias(pascua,64))));set.add(f2s(aLunes(addDias(pascua,71))));set.add(f2s(aLunes(new Date(yr,5,29))));set.add(`${yr}-07-20`);set.add(`${yr}-08-07`);set.add(f2s(aLunes(new Date(yr,7,15))));set.add(f2s(aLunes(new Date(yr,9,12))));set.add(f2s(aLunes(new Date(yr,10,1))));set.add(f2s(aLunes(new Date(yr,10,11))));set.add(`${yr}-12-08`);set.add(`${yr}-12-25`);return set;};const festSet=calcFestCO(anio);const nuevoImp={};for(let d=1;d<=ult;d++){const f=new Date(anio,mes,d);const dow=DOW[f.getDay()];const k=`${anio}-${String(mes+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;if(nov[k])continue;if(festSet.has(k))continue;for(const c of (centros||[])){if(c.activo===false)continue;let ok=false;for(const cal of (c.calendarios||[])){if(!cal.dias||!cal.dias.includes(dow))continue;const emps=cal.empleados||c.empleados||[];if(!emps.includes(selN.empId))continue;if(cal.vigencia_desde&&k<cal.vigencia_desde)continue;if(cal.vigencia_hasta&&k>cal.vigencia_hasta)continue;nuevoImp[k]=c.id;ok=true;break;}if(ok)break;}}arr[idx].impDias=nuevoImp;const rs=await fetch(`/api/hiring?kv=nomina&anio=${anio}&mes=${mes}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({data:arr})});const sd=await rs.json();if(!sd.ok){setGuard(false);throw new Error("save");}setNoms(arr);setGuard(false);window.toast&&window.toast("✓ Calendario restablecido desde la base","success");}catch(e){setGuard(false);window.toast&&window.toast("Error al restablecer el calendario","error");}})();
                      }}
                      disabled={!ed}
                      title={!ed ? "Mes ya pagado, no se puede modificar" : "Vacía las imputaciones manuales del mes. Al recargar, los días se rellenan automáticamente desde el calendario base de Centros de Trabajo."}
                      style={{padding:"4px 10px",fontSize:10,fontWeight:600,border:`1px solid ${T.border}`,borderRadius:4,background:ed?"#fff":"#f5f5f5",color:ed?T.inkMid:"#999",cursor:ed?"pointer":"not-allowed",fontFamily:"'DM Sans',sans-serif"}}
                    >🧹 Limpiar imputaciones manuales</button>
                  );
                })()}
                {(()=>{
                  return (
                    <button
                      type="button"
                      onClick={()=>{
                        if (!ed) return;
                        if (!confirm("⚠️ Vas a borrar TODO el mes para "+selN.nombre+":\n\n• Imputaciónes de OT (días asignados a centros)\n• Novedades (vacaciones, incapacidades, licencias, ausencias)\n• Horas extras y festivos laborados\n• Otros ingresos y deducciones\n\nEsta acción NO se puede deshacer. ¿Continuar?")) return;
                        if (!confirm("¿Estás 100% seguro? Esto es IRREVERSIBLE para "+selN.nombre+" en "+["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"][mes]+" "+anio+".")) return;
                        (async()=>{
                          try{
                            setGuard(true);
                            const rn=await fetch(`/api/hiring?kv=nomina&anio=${anio}&mes=${mes}`);
                            const dn=await rn.json();
                            const arr=dn.data||[];
                            const idx=arr.findIndex(n=>n.empId===selN.empId);
                            if(idx<0){setGuard(false);throw new Error("emp no encontrado");}
                            arr[idx]={
                              ...arr[idx],
                              impDias:{},
                              novDias:{},
                              novNotas:{},
                              hexD:0, hexN:0, hexDD:0, hexDN:0, festLab:0,
                              diasIncap:0, diasLicRem:0, diasLicNoRem:0, diasVac:0, diasAusencia:0,
                              otrosIng:0, otrasDed:0,
                              bonos:[],
                              nov:""
                            };
                            const rs=await fetch(`/api/hiring?kv=nomina&anio=${anio}&mes=${mes}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({data:arr})});
                            const sd=await rs.json();
                            if(!sd.ok){setGuard(false);throw new Error("save fallo");}
                            // Limpiar adjuntos del empleado en hab:nov_adjuntos del mes
                            try{
                              const ra=await fetch(`/api/hiring?kv=nov_adjuntos&anio=${anio}&mes=${mes}`);
                              const da=await ra.json();
                              const adj=da.data||{};
                              if(adj[selN.empId]){
                                delete adj[selN.empId];
                                await fetch(`/api/hiring?kv=nov_adjuntos&anio=${anio}&mes=${mes}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({data:adj})});
                              }
                            }catch(_){/* adjuntos opcionales, ignorar */}
                            setNoms(arr);
                            setGuard(false);
                            window.toast&&window.toast("✓ Mes borrado completamente para "+selN.nombre,"success");
                          }catch(e){
                            setGuard(false);
                            console.error("Borrar mes error:",e);
                            window.toast&&window.toast("Error al borrar el mes: "+(e.message||"desconocido"),"error");
                          }
                        })();
                      }}
                      disabled={!ed}
                      title={!ed ? "Mes ya pagado, no se puede modificar" : "Borra TODAS las imputaciones, novedades, horas extras y adjuntos del empleado en este mes. Acción irreversible."}
                      style={{padding:"4px 10px",fontSize:10,fontWeight:600,border:`1px solid ${ed?"#dc2626":T.border}`,borderRadius:4,background:ed?"#fff":"#f5f5f5",color:ed?"#dc2626":"#999",cursor:ed?"pointer":"not-allowed",fontFamily:"'DM Sans',sans-serif"}}
                    >🗑 Borrar TODO del mes</button>
                  );
                })()}
              </div>
              {modoEditarImp && (
                <div style={{padding:"8px 12px",marginBottom:8,background:"#FEF3C7",border:"1px solid #F59E0B",borderRadius:4,fontSize:11,color:"#92400E"}}>
                  ⚠️ <strong>MODO EDICION DE IMPUTACIONES ACTIVO</strong> — {esPagada?"el mes ya esta pagado. Solo cambia la OT de los días trabajados (las imputaciones son informativas, no afectan el pago). NO modifiques novedades, horas extras u otros valores.":"asigna cada día trabajado a su centro/OT haciendo click en el día del calendario."}
                </div>
              )}
              <div style={{display:"flex",gap:6,marginBottom:8,alignItems:"center",padding:"6px 10px",background:"#F9F8F4",borderRadius:4,border:`1px dashed ${T.border}`}}>
                <span style={{fontSize:10,color:T.inkLight}}>💡 <strong>Haz click en cualquier día</strong> para imputar OT, registrar novedad o limpiar.</span>
              </div>
              {/* Calendar grid */}
              {(()=>{
                const firstDay=new Date(anio,mes,1);
                const lastDay=new Date(anio,mes+1,0);
                const startPad=(firstDay.getDay()+6)%7; // Monday=0
                const totalDays=lastDay.getDate();
                const nDias=selN.novDias||{};
                const iDias=selN.impDias||{}; // {dayKey: otCódigo}
                // Count novedades
                const counts={incapacidad:0,vacaciones:0,licencia:0,licNoRem:0,ausencia:0};
                Object.values(nDias).forEach(v=>{if(counts[v]!==undefined)counts[v]++;});
                const diasNoLab=counts.incapacidad+counts.vacaciones+counts.licencia+counts.licNoRem+counts.ausencia;
                const diasLab=Math.max(0,30-diasNoLab);
                const diasSalario=Math.max(0,30-(counts.incapacidad+counts.vacaciones+counts.licNoRem+counts.ausencia)); // Lic rem NO reduce salario

                const toggleDay=(day)=>{
                  if(!ed)return;
                  const k=anio+"-"+String(mes+1).padStart(2,"0")+"-"+String(day).padStart(2,"0");
                  // Modo IMPUTACIÓN: marca/desmarca OT en el día (no toca novedades)
                  if(modoCal==="imputacion"){
                    const cur={...iDias};
                    if(cur[k]===selOtt){
                      delete cur[k]; // mismo OT clicado de nuevo → borrar
                    } else {
                      cur[k]=selOtt; // marcar / sobrescribir con OT seleccionada
                    }
                    u({impDias:cur}); // persistencia: mismo flujo que novedades
                    return;
                  }
                  // Modo NOVEDAD (comportamiento original, sin cambios)
                  const cur={...nDias};
                  const wasSet=cur[k]===selNovTipo;
                  if(wasSet)delete cur[k]; else cur[k]=selNovTipo;
                  // Update counts
                  const nc={incapacidad:0,vacaciones:0,licencia:0,licNoRem:0,ausencia:0};
                  Object.values(cur).forEach(v=>{if(nc[v]!==undefined)nc[v]++;});
                  // Licencia remunerada NO reduce días (trabajador sigue cobrando)
                  // Solo reducen: incapacidad, lic NO rem, ausencia, vacaciones
                  const diasRed = nc.incapacidad + nc.vacaciones + nc.licNoRem + nc.ausencia;
                  u({novDias:cur,dias:Math.max(0,30-diasRed),diasIncap:nc.incapacidad,diasVac:nc.vacaciones,diasLicRem:nc.licencia,diasLicNoRem:nc.licNoRem,diasAusencia:nc.ausencia});
                  // Sync to hr_novelties
                  const tipoMap={incapacidad:"incapacidad",vacaciones:"vacaciones",licencia:"licencia_remunerada",licNoRem:"licencia_no_remunerada",ausencia:"ausencia"};
                  const apiTipo=tipoMap[selNovTipo]||selNovTipo;
                  if(wasSet){
                    // Remove from hr_novelties
                    fetch("/api/novelties",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({employee_id:selN.empId,fecha_inicio:k,tipo:apiTipo})}).catch(()=>{});
                  } else {
                    // Add to hr_novelties (auto-approved from RRHH)
                    fetch("/api/novelties",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({employee_id:selN.empId,employee_nombre:selN.nombre,tipo:apiTipo,fecha_inicio:k,fecha_fin:k,motivo:"Registrado por RRHH",source:"rrhh"})}).catch(()=>{});
                  }
                };

                return <>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:8}}>
                    {DL_SHORT.map(d=><div key={d} style={{textAlign:"center",fontSize:8,fontWeight:700,color:T.inkLight,padding:"2px 0"}}>{d}</div>)}
                    {Array.from({length:startPad}).map((_,i)=><div key={"p"+i}/>)}
                    {Array.from({length:totalDays}).map((_,i)=>{
                      const day=i+1;
                      const k=anio+"-"+String(mes+1).padStart(2,"0")+"-"+String(day).padStart(2,"0");
                      const date=new Date(anio,mes,day);
                      const dow=date.getDay(); // 0=Sun
                      const isSun=dow===0;
                      const hol=holidays.find(h=>sameDay(h.date,date));
                      const nov=nDias[k];
                      const novInfo=nov?NOV_TIPOS.find(n=>n.id===nov):null;
                      const imp=iDias[k];
                      const isConflicto = imp === "__conflicto__";
                      const impInfo=imp && !isConflicto?centros.find(c=>c.id===imp):null;
                      const impColor=imp && !isConflicto?colorForOT(imp):null;
                      const isToday=sameDay(date,new Date());

                      const tooltipParts=[];
                      if(hol)tooltipParts.push("🔶 "+hol.name+" — Descanso remunerado. Click si se trabajó.");
                      else if(isSun&&!nov&&!imp)tooltipParts.push("Domingo — descanso. Click para imputar si trabajó.");
                      if(novInfo)tooltipParts.push(novInfo.label);
                      if(isConflicto)tooltipParts.push("⚠️ Conflicto: el empleado tiene 2+ OTs configuradas para este día. Click para resolver.");
                      else if(impInfo)tooltipParts.push("OT: "+impInfo.codigo+" — "+impInfo.nombre);

                      return <div key={day} onClick={()=>{if(ed){setModoNov("dia");setRangoInicio(k);setRangoFin("");setNotaNov((selN.novNotas||{})[k]||"");setDayEditor({day,k,date});}}} title={tooltipParts.join(" · ")} style={{
                        textAlign:"center",padding:"4px 2px",borderRadius:4,fontSize:11,fontWeight:isToday?800:(hol?700:400),
                        cursor:!ed?"default":"pointer",
                        background:novInfo?novInfo.color:hol?"#FDE68A":isSun?"#F5F4F1":"transparent",
                        color:hol?"#999":isToday?"#1E6B42":(isSun&&!nov&&!imp?"#999":"#111"),
                        border:isToday?`2px solid #1E6B42`:"2px solid transparent",
                        position:"relative",opacity:isSun&&!nov&&!imp?0.55:1
                      }}>
                        {day}
                        {hol&&<div style={{fontSize:6,color:"#D97706",lineHeight:1,marginTop:1}}>🔶</div>}
                        {isSun&&!hol&&<div style={{fontSize:6,color:"#ccc",lineHeight:1,marginTop:1}}>—</div>}
                        {novInfo&&<div style={{fontSize:7,lineHeight:1,marginTop:1}}>{novInfo.icon}</div>}
                        {isConflicto&&<div style={{fontSize:8,lineHeight:1,marginTop:1,color:"#dc2626",fontWeight:700}}>⚠️</div>}
                        {impColor&&<div style={{position:"absolute",bottom:0,left:0,right:0,height:3,background:impColor,borderRadius:"0 0 4px 4px"}}/>}
                        {isConflicto&&<div style={{position:"absolute",bottom:0,left:0,right:0,height:3,background:"repeating-linear-gradient(45deg,#dc2626,#dc2626 3px,#FCA5A5 3px,#FCA5A5 6px)",borderRadius:"0 0 4px 4px"}}/>}
                      </div>;
                    })}
                  </div>
                  {/* Leyenda y resumen */}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                      {festivosMes.map((h,i)=><span key={i} style={{fontSize:9,color:T.amber,background:T.amberBg,padding:"2px 6px",borderRadius:4}}>🔶 {h.date.getDate()} {h.name}</span>)}
                    </div>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      {NOV_TIPOS.filter(n=>n.id!=="normal").map(n=>{const c=counts[n.id]||0;return c>0?<span key={n.id} style={{fontSize:9,background:n.color,padding:"2px 6px",borderRadius:4,fontWeight:600}}>{n.icon} {n.label}: {c}d</span>:null;})}
                      <span style={{fontSize:9,background:T.greenBg,padding:"2px 6px",borderRadius:4,fontWeight:700,color:T.green}}>Sal: {diasSalario}d</span>
                      {diasSalario!==diasLab&&<span style={{fontSize:9,background:T.accent,padding:"2px 6px",borderRadius:4,color:T.inkLight}}>Asist: {diasLab}d</span>}
                    </div>
                  </div>
                </>;
              })()}
            </Card>

            <div style={{display:"grid",gridTemplateColumns:"260px 1fr 1fr",gap:12}}>
            <div>
              <Card accent={T.ink}><STit>Período</STit>
                <Inp label="Días laborados" type="number" value={selN.dias} onChange={v=>u({dias:v})} suf="/30" disabled={!ed} small/>
                <Inp label="Festivos en días lab." type="number" value={selN.festMes||0} onChange={v=>u({festMes:v})} suf="días" disabled={!ed} small/>
                <Inp label="Festivos trabajados" type="number" value={selN.festLab||0} onChange={v=>u({festLab:v})} suf="días" disabled={!ed} small/>
                {festivosMes.length>0&&<div style={{fontSize:9,color:T.amber,background:T.amberBg,borderRadius:3,padding:"5px 8px",marginBottom:6}}>📅 {festivosMes.length} festivos: {festivosMes.map(h=>h.date.getDate()+" "+h.name).join(", ")}</div>}
                <div style={{fontSize:9,color:T.inkLight,background:T.accent,borderRadius:3,padding:"5px 8px"}}>
                  Sal: {selN.dias}d · Asist: {(selN.dias||30)-(selN.festMes||0)}d · Fest: {selN.festMes||0}d
                </div>
              </Card>
              <Card accent={T.purple}><STit>Horas extra</STit>
                <Inp label="HE diurna (×1.25)" type="number" value={selN.hexD||0} onChange={v=>u({hexD:v})} suf="h" small disabled={!ed}/>
                <Inp label="HE nocturna (×1.75)" type="number" value={selN.hexN||0} onChange={v=>u({hexN:v})} suf="h" small disabled={!ed}/>
                <Inp label="HE dom/fest diurna (×2.0)" type="number" value={selN.hexDD||0} onChange={v=>u({hexDD:v})} suf="h" small disabled={!ed}/>
                <Inp label="HE dom/fest noct. (×2.5)" type="number" value={selN.hexDN||0} onChange={v=>u({hexDN:v})} suf="h" small disabled={!ed}/>
                {calc.totHex>0&&<div style={{fontSize:10,fontFamily:"'DM Mono',monospace",color:T.purple,marginTop:2}}>Total: {fmt(calc.totHex)}</div>}
              </Card>
              <Card><STit>Parámetros</STit>
                <div style={{fontSize:9,color:T.inkLight,background:T.accent,borderRadius:3,padding:"5px 8px",marginBottom:8}}>🔒 Salario, bono base, régimen y ARL se gestionan en <b>Condiciones</b> (ficha del empleado). Aquí solo se consultan.</div>
                <Inp label="Salario base" type="number" value={selN.sal} onChange={()=>{}} suf="COP" disabled={true} small/>
                <Inp label="Bono (Art.128)" type="number" value={selN.bono} onChange={()=>{}} suf="COP" disabled={true} small/>
                {selN.modalidadPago!=="mensual"&&<Inp label="Anticipo Q1 (%)" type="number" value={(selN.q1Pct||0.5)*100} onChange={v=>u({q1Pct:v/100})} suf="%" disabled={!ed} small/>}
                <Sel label="Régimen" value={selN.reg} onChange={()=>{}} disabled={true} opts={[{v:"contributivo",l:"Contributivo (EPS)"},{v:"subsidiado",l:"Subsidiado (SISBEN)"}]}/>
                <Sel label="Nivel ARL" value={selN.arl} onChange={()=>{}} disabled={true} opts={ARL_OPTS.map((a,i)=>({v:i,l:`${a.lbl} — ${fPct(a.t)}`}))}/>
                <Inp label="Otros ingresos" type="number" value={selN.otrosIng||0} onChange={v=>u({otrosIng:v})} suf="COP" disabled={!ed} small/>
                <Inp label="Otras deducciones" type="number" value={selN.otrasDed||0} onChange={v=>u({otrasDed:v})} suf="COP" disabled={!ed} small/>
                {/* Otros bonos del mes — lista dinámica, regla 40/60 (Ley 1393) */}
                <div style={{marginTop:10,borderTop:`1px solid ${T.border}`,paddingTop:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <Lbl>Otros bonos del mes</Lbl>
                    {ed&&<button onClick={()=>u({bonos:[...(selN.bonos||[]),{nombre:"",valor:0,salarial:false}]})} style={{fontSize:10,fontWeight:600,border:`1px solid ${T.green}`,color:T.green,background:"#fff",borderRadius:5,padding:"3px 8px",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>+ Añadir bono</button>}
                  </div>
                  {(selN.bonos||[]).length===0&&<div style={{fontSize:9,color:T.inkLight,fontStyle:"italic"}}>Sin bonos adicionales este mes.</div>}
                  {(selN.bonos||[]).map((b,i)=>(
                    <div key={i} style={{display:"flex",gap:4,alignItems:"center",marginBottom:5}}>
                      <input value={b.nombre||""} disabled={!ed} placeholder="Concepto" onChange={e=>{const a=[...(selN.bonos||[])];a[i]={...a[i],nombre:e.target.value};u({bonos:a});}} style={{flex:"1 1 80px",minWidth:0,border:`1px solid ${T.border}`,borderRadius:4,padding:"4px 6px",fontSize:10,fontFamily:"'DM Sans',sans-serif",background:ed?"#fff":T.accent,color:T.ink}}/>
                      <input type="number" value={b.valor||0} disabled={!ed} onChange={e=>{const a=[...(selN.bonos||[])];a[i]={...a[i],valor:+e.target.value};u({bonos:a});}} style={{width:72,border:`1px solid ${T.border}`,borderRadius:4,padding:"4px 6px",fontSize:10,fontFamily:"'DM Mono',monospace",background:ed?"#fff":T.accent,color:T.ink}}/>
                      <button onClick={()=>{if(!ed)return;const a=[...(selN.bonos||[])];a[i]={...a[i],salarial:!a[i].salarial};u({bonos:a});}} title="Click para cambiar salarial / no salarial" style={{fontSize:9,fontWeight:700,border:"none",borderRadius:4,padding:"4px 7px",cursor:ed?"pointer":"default",whiteSpace:"nowrap",background:b.salarial?T.greenBg:T.accent,color:b.salarial?T.green:T.inkMid,fontFamily:"'DM Sans',sans-serif"}}>{b.salarial?"Salarial":"No salarial"}</button>
                      {ed&&<button onClick={()=>{const a=(selN.bonos||[]).filter((_,j)=>j!==i);u({bonos:a});}} style={{border:"none",background:"none",color:"#dc2626",cursor:"pointer",fontSize:13,padding:"0 2px"}}>×</button>}
                    </div>
                  ))}
                  {calc.excedenteNoSal>0&&<div style={{fontSize:9,color:T.amber,background:T.amberBg,borderRadius:3,padding:"5px 7px",marginTop:4,lineHeight:1.4}}>⚠️ Los pagos no salariales superan el 40% de la remuneración. El excedente de {fmt(calc.excedenteNoSal)} entra al IBC (Ley 1393).</div>}
                </div>
              </Card>
            </div>
            <Card accent={T.green}><STit color={T.green}>✅ Devengado</STit>
              <div style={{fontSize:9,color:T.inkLight,marginBottom:8}}>{calc.dias}/30 días · Ratio: {(calc.ratio*100).toFixed(1)}%</div>
              {((selN.diasIncap||0)>0||(selN.diasVac||0)>0||(selN.diasLicNoRem||0)>0||(selN.diasLicRem||0)>0)&&(
                <div style={{fontSize:9,color:T.inkMid,marginBottom:8,padding:"6px 8px",background:T.accent,borderRadius:4,lineHeight:1.5}}>
                  <strong>Novedades del mes:</strong> 30 días base
                  {(selN.diasIncap||0)>0&&<> · 🏥 −{selN.diasIncap} incap.</>}
                  {(selN.diasVac||0)>0&&<> · 🏖️ −{selN.diasVac} vac.</>}
                  {(selN.diasLicNoRem||0)>0&&<> · ⚠️ −{selN.diasLicNoRem} lic. no rem.</>}
                  {(selN.diasLicRem||0)>0&&<> · 📋 {selN.diasLicRem} lic. rem. (no reduce)</>}
                  {" "}= <strong>{calc.dias} días de salario</strong>
                </div>
              )}
              <div style={{fontSize:10,fontWeight:600,color:T.inkMid,marginBottom:4}}>SALARIAL (base EPS/Pensión)</div>
              <Row lbl="Salario proporcional" val={calc.salProp}/>
              {calc.totHex>0&&<><Row lbl="Horas extra" val={calc.totHex}/>{calc.hexD>0&&<Row lbl="HE diurna ×1.25" val={calc.hexD} indent sub/>}{calc.hexN>0&&<Row lbl="HE nocturna ×1.75" val={calc.hexN} indent sub/>}{calc.hexDD>0&&<Row lbl="HE dom ×2.0" val={calc.hexDD} indent sub/>}{calc.hexDN>0&&<Row lbl="HE dom noct ×2.5" val={calc.hexDN} indent sub/>}</>}
              {calc.recFest>0&&<Row lbl="Recargo festivos" val={calc.recFest}/>}
              <Div/><Row lbl="IBC (Base Cotización)" val={calc.ibc} bold bg={T.accent}/>
              <div style={{height:10}}/><div style={{fontSize:10,fontWeight:600,color:T.inkMid,marginBottom:4}}>NO SALARIAL</div>
              {calc.aplA&&<Row lbl={"Auxilio transporte ("+calc.diasComm+"d)"} val={calc.aux}/>}
              {calc.bono>0&&<Row lbl={(selN.bonoConcepto||"Bono asistencia")+" ("+calc.diasAsist+"d)"} val={calc.bono}/>}
              {(calc.festMes>0||(selN.diasLicRem||0)>0)&&<div style={{fontSize:8,color:T.amber,fontStyle:"italic",marginTop:2}}>Aux: {calc.diasComm}d (−{selN.diasLicRem||0} lic.rem) · Bono: {calc.diasAsist}d (−{calc.festMes} fest −{selN.diasLicRem||0} lic.rem)</div>}
              <Div/><Row lbl="TOTAL DEVENGADO" val={calc.dev} bold color={T.green} bg={T.greenBg}/>
            </Card>
            <div>
              <Card accent={T.red}><STit color={T.red}>🔻 Deducciones</STit>
                <div style={{fontSize:9,color:T.inkLight,marginBottom:8}}>Base: IBC {fmt(calc.ibc)}</div>
                <Row lbl={`EPS (4%) ${calc.eSub?"— SISBEN $0":""}`} val={calc.epsE} color={T.red}/>
                <Row lbl="Pensión (4%)" val={calc.penE} color={T.red}/>
                {calc.rteF>0&&<Row lbl="Retención fuente" val={calc.rteF} color={T.red}/>}
                {calc.otrasDed>0&&<Row lbl="Otras deducciones" val={calc.otrasDed} color={T.red}/>}
                <Div/><Row lbl="TOTAL DEDUCCIONES" val={calc.totD} bold color={T.red} bg={T.redBg}/>
              </Card>
              <div style={{border:`1px solid ${T.ink}`,borderRadius:6,padding:"12px 16px",marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:8,fontWeight:600,letterSpacing:1,color:T.inkMid,textTransform:"uppercase"}}>Neto a pagar</div>
                  <div style={{fontSize:9,color:T.inkLight,marginTop:2}}>{selN.modalidadPago==="mensual"?"Pago mensual":`Q1: ${fmt(calc.q1)} · Q2: ${fmt(calc.q2)}`}</div>
                </div>
                <div style={{fontSize:22,fontWeight:700,fontFamily:"'DM Mono',monospace",color:T.ink}}>{fmt(calc.neto)}</div>
              </div>
              <Card style={{background:T.accent}}><div style={{fontSize:10,fontFamily:"'DM Mono',monospace",color:T.inkMid,lineHeight:1.8}}>
                Sal.prop = {fmt(selN.sal)} × {calc.dias}/30<br/>EPS = IBC × 4% = {fmt(calc.ibc)} × 0.04<br/>Pen = IBC × 4%<br/>Neto = {fmt(calc.dev)} − {fmt(calc.totD)}
              </div></Card>
            </div>
          </div>
          </div>
        )}

        {subTab==="descargables"&&(
          <Card accent={T.ink}>
            <STit>📊 Reportes y documentos</STit>
            <div style={{fontSize:11,color:T.inkLight,marginBottom:14}}>{selN.nombre} — {MESES[mes]} {anio}</div>
            {(()=>{
              const isMensual = selN.modalidadPago==="mensual";
              const esPrimaMes = (mes===5||mes===11);
              const q1Listo = (selN.estado==="q1_pagado"||selN.estado==="pagada"||selN.estado==="liquidada");
              const semLbl = mes===5?"1.º":"2.º";

              // Reportes del trabajador — ordenados por flujo de pago: anticipo Q1 → prima → Q2/nómina
              const trabajador=[];
              if(!isMensual) trabajador.push({icon:"📋",label:"Justificante de anticipo Q1",desc:`Anticipo ${fmt(calc.q1)} · 15 de ${MESES[mes]}`,action:"anticipo"});
              if(esPrimaMes) trabajador.push({icon:"🎁",label:`Justificante de prima (${semLbl} sem.)`,desc:`Comprobante del pago de la prima para la trabajadora (recibí conforme)`,gen:async()=>buildPrimaJustificanteHtml({selN,prima:await calcPrimaSemestre(selN,anio,mes),anio,refBancaria:(soportesPago[selN.empId+":prima"]||{}).ref}).html});
              trabajador.push({icon:"📄",label:isMensual?"Nómina mensual":"Nómina · Q2",desc:`Devengado ${fmt(calc.dev)} · Deducciones ${fmt(calc.totD)} · Neto ${fmt(calc.neto)}`,action:"nomina"});

              // Reportes de la empresa / interempresa
              const empresa=[];
              empresa.push({icon:"📋",label:"Informe de novedades (contador)",desc:`Festivos y novedades del mes — sin valores económicos`,gen:genNovedadesHtml});
              if(esPrimaMes) empresa.push({icon:"📑",label:`Liquidación provisional de prima — contadores (${semLbl} sem.)`,desc:`Cálculo estimado del semestre para validación del contador · Art. 306 CST`,gen:async()=>buildPrimaHtml({selN,prima:await calcPrimaSemestre(selN,anio,mes),anio}).html});
              empresa.push({icon:"📊",label:"Informe Mensual Completo",desc:`Cierre post-pago: salario, Q1, Q2, PILA, provisiones y reparto por centro`,gen:genImputaciónesHtml});
              if(!isMensual&&q1Listo) empresa.push({icon:"💸",label:"Nota de Reembolso Q1 (interempresa)",desc:`Reparto anticipo Q1 por centro · enviar al centro destinatario`,gen:genNotaReembolsoQ1Html});

              const Row=(d,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",background:"#FAFAF8",border:`1px solid ${T.border}`,borderRadius:8,marginBottom:8,cursor:"pointer",transition:"all .15s"}}
                  onClick={async()=>{
                    const r = d.gen ? d.gen() : buildNominaHtml({ selN, calc, anio, mes, tipo:d.action, refBancaria:selN.refPago||null }).html;
                    const html = (r && typeof r.then === "function") ? await r : r;
                    if (html) openReport(html);
                  }}
                  onMouseEnter={e=>e.currentTarget.style.borderColor=T.ink}
                  onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
                  <div style={{fontSize:22,width:36,textAlign:"center"}}>{d.icon}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:700,color:T.ink}}>{d.label}</div>
                    <div style={{fontSize:10,color:T.inkLight,marginTop:1}}>{d.desc}</div>
                  </div>
                  <div style={{display:"flex",gap:6}}>
                    <div style={{fontSize:11,fontWeight:600,color:T.ink,background:T.accent,borderRadius:4,padding:"6px 14px"}}>👁 Ver</div>
                  </div>
                </div>
              );
              const SecTitle=(t)=>(<div style={{fontSize:11,fontWeight:700,color:T.inkLight,textTransform:"uppercase",letterSpacing:"0.05em",margin:"2px 0 10px"}}>{t}</div>);
              return (<>
                {SecTitle("Reportes del trabajador")}
                {trabajador.map(Row)}
                <div style={{marginTop:14,paddingTop:14,borderTop:`1px solid ${T.border}`}}>
                  {SecTitle("Reportes de la empresa / interempresa")}
                  {empresa.map(Row)}
                </div>
              </>);
            })()}
            {(()=>{
              const tipos=[{k:"anticipo",lbl:"Justificante de pago — Anticipo Q1"},{k:"nomina",lbl:"Justificante de pago — Nómina/Q2"},{k:"prima",lbl:"Justificante de pago — Prima de servicios"}];
              const items=tipos.map(t=>({...t,sop:soportesPago[selN.empId+":"+t.k]})).filter(t=>t.sop&&t.sop.data);
              if(items.length===0) return null;
              return (
                <div style={{marginTop:18,paddingTop:14,borderTop:`1px solid ${T.border}`}}>
                  <div style={{fontSize:11,fontWeight:700,color:T.inkLight,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:10}}>💳 Justificantes de pago adjuntados</div>
                  {items.map((t,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:14,padding:"12px 16px",background:"#F0FDF4",border:`1px solid #BBF7D0`,borderRadius:8,marginBottom:8}}>
                      <div style={{fontSize:22,width:36,textAlign:"center"}}>💳</div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:700,color:T.ink}}>{t.lbl}</div>
                        <div style={{fontSize:10,color:T.inkLight,marginTop:1}}>{t.sop.archivo}{t.sop.ref?` · Ref: ${t.sop.ref}`:""}</div>
                      </div>
                      <div style={{display:"flex",gap:6}}>
                        <button onClick={()=>verArchivo(t.sop.data, t.sop.archivo)} style={{fontSize:11,fontWeight:600,color:T.blue,background:"#fff",border:`1px solid ${T.border}`,borderRadius:4,padding:"6px 12px",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>👁 Ver</button>
                        <a href={t.sop.data} download={t.sop.archivo} style={{fontSize:11,fontWeight:600,color:T.ink,textDecoration:"none",background:"#fff",border:`1px solid ${T.border}`,borderRadius:4,padding:"6px 12px"}}>⬇ Descargar</a>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
            {/* Adjuntos de novedades del mes (todos los archivos subidos a novedades de este empleado) */}
            {(()=>{
              const prefijo = selN.empId+":";
              const entradas = Object.entries(novAdjuntos)
                .filter(([k,arr])=>k.startsWith(prefijo) && Array.isArray(arr) && arr.length>0)
                .map(([k,arr])=>({fecha:k.slice(prefijo.length), arr}))
                .sort((a,b)=>a.fecha.localeCompare(b.fecha));
              if(entradas.length===0) return null;
              const totalArch = entradas.reduce((s,e)=>s+e.arr.length,0);
              return (
                <div style={{marginTop:18,paddingTop:14,borderTop:`1px solid ${T.border}`}}>
                  <div style={{fontSize:11,fontWeight:700,color:T.inkLight,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:10}}>📎 Adjuntos de novedades <span style={{color:T.green}}>({totalArch})</span></div>
                  {entradas.map((e,ei)=>{
                    const tipoNov = (selN.novDias||{})[e.fecha];
                    const info = tipoNov ? NOV_TIPOS.find(n=>n.id===tipoNov) : null;
                    const fechaLbl = new Date(e.fecha+"T12:00:00").toLocaleDateString(getTenantDefaultsSync().locale,{day:"numeric",month:"short",year:"numeric"});
                    return e.arr.map((f,fi)=>{
                      // Generar nombre descriptivo: TipoNovedad-FECHA-APELLIDOS.ext
                      // Conserva el nombre original como subtitulo para referencia.
                      const tipoLabel = info?.label || "Novedad";
                      const tipoSlug = tipoLabel.replace(/\./g,"").replace(/\s+/g,"-");
                      const ape = (selN.nombre||"").split(" ").slice(-2).join("-").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase().replace(/[^A-Z0-9-]/g,"");
                      const m = (f.name||"").match(/\.[a-zA-Z0-9]+$/);
                      const ext = m ? m[0].toLowerCase() : "";
                      const nombreDescriptivo = `${tipoSlug}-${e.fecha}-${ape}${ext}`;
                      return (
                      <div key={ei+"-"+fi} style={{display:"flex",alignItems:"center",gap:14,padding:"12px 16px",background:"#FAFAF8",border:`1px solid ${T.border}`,borderRadius:8,marginBottom:8}}>
                        <div style={{fontSize:20,width:32,textAlign:"center"}}>{info?.icon||"📎"}</div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:13,fontWeight:700,color:T.ink}}>{nombreDescriptivo}</div>
                          <div style={{fontSize:10,color:T.inkLight,marginTop:1}}>{tipoLabel} · {fechaLbl} · {(f.size/1024).toFixed(0)} KB <span style={{color:"#bbb"}}>· archivo original: {f.name}</span></div>
                        </div>
                        <div style={{display:"flex",gap:6}}>
                          <button onClick={()=>verArchivo(f.data, nombreDescriptivo)} style={{fontSize:11,fontWeight:600,color:T.blue,background:"#fff",border:`1px solid ${T.border}`,borderRadius:4,padding:"6px 12px",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>👁 Ver</button>
                          <a href={f.data} download={nombreDescriptivo} style={{fontSize:11,fontWeight:600,color:T.ink,textDecoration:"none",background:"#fff",border:`1px solid ${T.border}`,borderRadius:4,padding:"6px 12px"}}>⬇ Descargar</a>
                        </div>
                      </div>
                    );});
                  })}
                </div>
              );
            })()}
          </Card>
        )}

        {subTab==="nomina"&&(
          <div style={{borderTop:`2px solid ${T.border}`,marginTop:20,paddingTop:16}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:10,color:T.ink}}>🏢 Costo Empleador</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
            <Card accent={T.blue}><STit color={T.blue}>🏢 Aportes empleador</STit>
              <div style={{fontSize:9,color:T.inkLight,marginBottom:6}}>Base: IBC {fmt(calc.ibc)}</div>
              <Row lbl={`EPS (${fPct(0.085)})`} val={calc.epsEr}/><Row lbl={`Pensión (${fPct(0.12)})`} val={calc.penEr}/>
              <Row lbl={`ARL ${ARL_OPTS[selN.arl||0]?.n} (${fPct(calc.tasa)})`} val={calc.arlV}/>
              <Row lbl={`Caja (${fPct(0.04)})`} val={calc.caja}/><Row lbl="SENA" val={calc.sena} sub/><Row lbl="ICBF" val={calc.icbf} sub/>
              {calc.exS&&<div style={{fontSize:8,color:T.inkLight,fontStyle:"italic",marginTop:2}}>Exonerado SENA/ICBF (Art.114-1 ET)</div>}
              <Div/><Row lbl="Total aportes" val={calc.totAp} bold color={T.blue} bg={T.blueBg}/>
            </Card>
            <Card accent={T.purple}><STit color={T.purple}>📦 Provisiones</STit>
              <div style={{fontSize:9,color:T.inkLight,marginBottom:6}}>Base: Sal+Aux {fmt(calc.salProp+calc.aux)}</div>
              <Row lbl="Prima (8.33%)" val={calc.prima}/><Row lbl="Cesantías (8.33%)" val={calc.ces}/>
              <Row lbl="Int. cesantías (1%)" val={calc.intC}/><Row lbl="Vacaciones (4.17%)" val={calc.vac}/>
              <Div/><Row lbl="Total provisiones" val={calc.totPr} bold color={T.purple} bg={T.purpleBg}/>
            </Card>
            <Card accent={T.ink}><STit>💼 Costo total</STit>
              <div style={{fontSize:9,color:T.inkLight,marginBottom:10}}>Costo real de este empleado</div>
              <Row lbl="Devengado" val={calc.dev}/><Row lbl="Aportes empleador" val={calc.totAp} color={T.blue}/>
              <Row lbl="Provisiones" val={calc.totPr} color={T.purple}/><Div/><Row lbl="COSTO TOTAL" val={calc.costoT} bold bg={T.accent}/>
              <div style={{height:12}}/>
              <div style={{background:T.accent,borderRadius:4,padding:"10px 12px",textAlign:"center"}}>
                <div style={{fontSize:9,color:T.inkLight}}>Factor prestacional</div>
                <div style={{fontSize:20,fontWeight:800,fontFamily:"'DM Mono',monospace"}}>{calc.salProp>0?(calc.costoT/calc.salProp).toFixed(3):"—"}×</div>
              </div>
              <div style={{marginTop:8,fontSize:10,color:T.inkMid}}>Costo/hora ({calc.horasMes}h): <strong style={{fontFamily:"'DM Mono',monospace"}}>{fmt(calc.costoT/calc.horasMes)}</strong></div>
            </Card>
          </div>
          </div>
        )}

        {subTab==="novedades"&&(
          <NovedadesPanel selN={selN} anio={anio} mes={mes} MESES={MESES} novHist={novHist} setNovHist={setNovHist} novYear={novYear} setNovYear={setNovYear} fmt={fmt}/>
        )}

        {subTab==="asistencia"&&(
          <AsistenciaPanel selN={selN} MESES={MESES} mes={mes} anio={anio}/>
        )}

        {subTab==="ficha"&&(()=>{
          // Ficha editorial (solo lectura). Estética sobria: papel, filetes finos, sin colores ni emojis.
          const fechaFmt=(s)=>s?new Date(s+"T12:00:00").toLocaleDateString(getTenantDefaultsSync().locale,{day:"numeric",month:"long",year:"numeric"}):"—";
          const arlLbl=ARL_OPTS[selN.arl||0]?`${ARL_OPTS[selN.arl||0].lbl} (${fPct(ARL_OPTS[selN.arl||0].t)})`:"—";
          const cc=(selN.cc||"").replace(/\D/g,"")||selN.cc;
          const estadoLbl={borrador:"En borrador",q1_pagado:"Q1 pagado",liquidada:"Liquidada",pagada:"Pagada",aprobada:"Aprobada"}[selN.estado]||selN.estado;
          // Dato en pareja etiqueta/valor (rejilla)
          const D=({l,v})=>(
            <div style={{padding:"9px 0",borderBottom:`1px solid ${T.border}`}}>
              <div style={{fontSize:8.5,fontWeight:700,color:T.inkLight,textTransform:"uppercase",letterSpacing:".7px"}}>{l}</div>
              <div style={{fontSize:12.5,color:T.ink,marginTop:3,fontWeight:500}}>{v||"—"}</div>
            </div>
          );
          // Título de sección editorial (filete + label)
          const SecTit=({n,children})=>(
            <div style={{display:"flex",alignItems:"baseline",gap:10,margin:"26px 0 6px"}}>
              <span style={{fontSize:9,fontWeight:700,color:T.inkLight,fontFamily:"'DM Mono',monospace"}}>{n}</span>
              <span style={{fontSize:11,fontWeight:700,color:T.ink,textTransform:"uppercase",letterSpacing:"1px"}}>{children}</span>
              <span style={{flex:1,height:1,background:T.border}}/>
            </div>
          );
          const grid={display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 32px"};
          // Tiempo restante hasta fin de contrato
          let restanteTxt=null, restanteAlerta=false;
          if(selN.fechaFinContrato){
            const fin=new Date(selN.fechaFinContrato+"T12:00:00");
            const diffDias=Math.ceil((fin-new Date())/86400000);
            if(diffDias<0){ restanteTxt="Contrato vencido"; restanteAlerta=true; }
            else{
              const mm=Math.floor(diffDias/30), dd=diffDias%30;
              restanteTxt=`${diffDias} días`+(mm>0?` · ${mm} mes${mm===1?"":"es"} ${dd}d`:"");
              restanteAlerta=diffDias<=33;
            }
          }
          return (
            <div style={{maxWidth:780,margin:"0 auto",background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:"34px 40px",boxShadow:T.shadow}}>
              {/* Cabecera de identidad */}
              <div style={{borderBottom:`2px solid ${T.ink}`,paddingBottom:16,marginBottom:4,display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div>
                  <div style={{fontSize:9,fontWeight:700,color:T.inkLight,textTransform:"uppercase",letterSpacing:"1.5px",marginBottom:6}}>Ficha del trabajador</div>
                  <div style={{fontSize:26,fontWeight:700,color:T.ink,lineHeight:1.1,letterSpacing:"-.5px"}}>{selN.nombre}</div>
                  <div style={{fontSize:12.5,color:T.inkMid,marginTop:5}}>{selN.cargo||"—"}{cc?`  ·  C.C. ${cc}`:""}</div>
                </div>
                <div style={{textAlign:"right",paddingTop:4}}>
                  <div style={{fontSize:8.5,fontWeight:700,color:T.inkLight,textTransform:"uppercase",letterSpacing:".7px"}}>Nómina {MESES[mes]} {anio}</div>
                  <div style={{fontSize:13,fontWeight:700,color:T.ink,marginTop:4}}>{estadoLbl}</div>
                </div>
              </div>

              <SecTit n="01">Contrato</SecTit>
              <div style={grid}>
                <D l="Tipo de contrato" v={selN.tipoContrato}/>
                <D l="Modalidad de pago" v={selN.modalidadPago==="mensual"?"Mensual":"Quincenal"}/>
                <D l="Fecha de ingreso" v={fechaFmt(selN.fechaIngreso)}/>
                <D l="Fin de contrato" v={selN.fechaFinContrato?fechaFmt(selN.fechaFinContrato):"Indefinido"}/>
                {(selN.duracionMeses||0)>0&&<D l="Duración pactada" v={selN.duracionMeses+" meses"}/>}
                {restanteTxt&&<div style={{padding:"9px 0",borderBottom:`1px solid ${T.border}`}}>
                  <div style={{fontSize:8.5,fontWeight:700,color:restanteAlerta?T.red:T.inkLight,textTransform:"uppercase",letterSpacing:".7px"}}>Tiempo restante{restanteAlerta?" · próximo a vencer":""}</div>
                  <div style={{fontSize:12.5,color:restanteAlerta?T.red:T.ink,marginTop:3,fontWeight:restanteAlerta?700:500}}>{restanteTxt}</div>
                </div>}
              </div>

              <SecTit n="02">Condiciones salariales</SecTit>
              <div style={grid}>
                <D l="Salario base" v={fmt(selN.sal)}/>
                <D l="Auxilio de transporte" v={fmt(selN.auxT)}/>
                {(selN.bono||0)>0&&<D l={(selN.bonoConcepto||"Bono")+(selN.bonoPrest?" · salarial":" · no salarial")} v={fmt(selN.bono)}/>}
                {(selN.netoRef||0)>0&&<D l="Neto de referencia" v={fmt(selN.netoRef)}/>}
              </div>

              <SecTit n="03">Afiliaciones</SecTit>
              <div style={grid}>
                <D l="Régimen de salud" v={selN.reg==="subsidiado"?"Subsidiado":"Contributivo"}/>
                <D l="EPS" v={selN.eps}/>
                <D l="Fondo de pensión" v={selN.pen}/>
                <D l="Nivel de riesgo ARL" v={arlLbl}/>
              </div>

              <SecTit n="04">Datos bancarios</SecTit>
              <div style={grid}>
                <D l="Banco" v={selN.banco}/>
                <D l="Tipo de cuenta" v={selN.tipoCuenta}/>
                <D l="Número de cuenta" v={selN.cuenta}/>
              </div>

              <SecTit n="05">Resumen del año</SecTit>
              <DashboardTrabajadorAnio empId={selN.empId} fechaIngreso={selN.fechaIngreso} fechaFin={selN.fechaFinContrato} anio={anio} nombre={selN.nombre} durMeses={selN.duracionMeses} embedded={true}/>

              <SecTit n="06">Historial de condiciones</SecTit>
              <HistorialCondiciones empId={selN.empId}/>

              <div style={{marginTop:24,paddingTop:12,borderTop:`1px solid ${T.border}`,fontSize:9,color:T.inkLight,fontStyle:"italic"}}>
                Ficha de consulta. Los datos se editan en Contratación o Personal.
              </div>
            </div>
          );
        })()}

        {subTab==="nomina"&&(
          <div style={{borderTop:`2px solid ${T.border}`,marginTop:20,paddingTop:16}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:10,color:T.ink}}>🔍 Auditoría de Fórmulas</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Card accent={T.ink}>
              <STit>📐 Base de cálculo</STit>
              <table style={{width:"100%",fontSize:11,borderCollapse:"collapse"}}>
                <tbody>
                {[
                  ["SMLMV 2026",fmt(SMLMV),"Decreto 1469/2025"],
                  ["Auxilio transporte",fmt(AUX_TR),"Decreto 1470/2025"],
                  ["UVT 2026",fmt(UVT),"DIAN"],
                  ["","",""],
                  ["Salario base mes",fmt(selN.sal),"Pactado en contrato"],
                  ["Salario/día",fmt(selN.sal/30),"Sal ÷ 30"],
                  ["Días base mes","30","Mes comercial (Colombia)"],
                  ...((selN.diasIncap||0)>0?[["— Incapacidad","−"+selN.diasIncap+"d","Reduce salario e IBC"]]:[]),
                  ...((selN.diasVac||0)>0?[["— Vacaciones","−"+selN.diasVac+"d","Se pagan aparte (no salario ordinario)"]]:[]),
                  ...((selN.diasLicNoRem||0)>0?[["— Licencia no remunerada","−"+selN.diasLicNoRem+"d","Reduce salario e IBC"]]:[]),
                  ...((selN.diasLicRem||0)>0?[["— Licencia remunerada",selN.diasLicRem+"d","NO reduce salario (informativo)"]]:[]),
                  ["Días laborados",selN.dias+"/30","30 − incapacidad − vacaciones − lic. no rem."],
                  ["Festivos (L-S)",calc.festMes+"d","No se trabaja, sí se paga salario"],
                  ["Días asistidos",calc.diasAsist+"d","Días − festivos (para aux y bono)"],
                  ["Ratio salario",((selN.dias/30)*100).toFixed(1)+"%","Días ÷ 30"],
                  ["Ratio asistencia",((calc.diasAsist/30)*100).toFixed(1)+"%","Días asistidos ÷ 30"],
                  ["","",""],
                  ["Salario proporcional",fmt(calc.salProp),fmt(selN.sal)+" × "+selN.dias+"/30"],
                  ["Bono "+(selN.bonoConcepto||"Art.128"),fmt(calc.bono),fmt(selN.bono)+" × "+calc.diasAsist+"/30 (días asistidos)"],
                  ["Auxilio transporte",fmt(calc.aux),selN.sal<=2*SMLMV?fmt(AUX_TR)+" × "+calc.diasComm+"/30 (fest. incluidos, lic.rem excluidas)":"No aplica (sal > 2 SMLMV)"],
                  ["","",""],
                  ["TOTAL DEVENGADO",fmt(calc.dev),"Sal + Bono + Aux + HE + Otros"],
                ].map(([l,v,f],i)=>l===""?<tr key={i}><td colSpan={3} style={{borderBottom:`1px solid ${T.border}`,height:8}}/></tr>:
                  <tr key={i}><td style={{padding:"4px 0",color:T.inkMid}}>{l}</td><td style={{padding:"4px 8px",fontWeight:700,fontFamily:"'DM Mono',monospace",textAlign:"right"}}>{v}</td><td style={{padding:"4px 0",fontSize:9,color:T.inkLight,fontStyle:"italic"}}>{f}</td></tr>
                )}
                </tbody>
              </table>
            </Card>

            <Card accent={T.red}>
              <STit color={T.red}>📊 Deducciones y aportes</STit>
              <table style={{width:"100%",fontSize:11,borderCollapse:"collapse"}}>
                <tbody>
                {[
                  ["IBC (Base cotización)",fmt(calc.ibc),"Max(SalProp + HE, SMLMV×ratio)"],
                  ["IBC en SMLMV",(calc.ibc/(SMLMV*(selN.dias/30))).toFixed(2)+"×","Para FSP y exoneración"],
                  ["","",""],
                  ["— DEDUCCIONES EMPLEADO —","",""],
                  [calc.eSub?"EPS (SISBEN — $0)":"EPS empleado (4%)",fmt(calc.epsE),calc.eSub?"Subsidiado":fmt(calc.ibc)+" × 4%"],
                  ["Pensión empleado (4%)",fmt(calc.penE),fmt(calc.ibc)+" × 4%"],
                  calc.rteF>0?["Retención fuente",fmt(calc.rteF),"Proc. 1 Art.383 ET"]:null,
                  calc.otrasDed>0?["Otras deducciones",fmt(calc.otrasDed),"Manual"]:null,
                  ["TOTAL DEDUCCIONES",fmt(calc.totD),""],
                  ["","",""],
                  ["— APORTES EMPLEADOR —","",""],
                  [calc.exS?"EPS empleador (exonerado Art.114-1)":"EPS empleador (8.5%)",fmt(calc.epsEr),calc.exS?"Exonerado <10 SMLMV":fmt(calc.ibc)+" × 8.5%"],
                  ["Pensión empleador (12%)",fmt(calc.penEr),fmt(calc.ibc)+" × 12%"],
                  ["ARL nivel "+ARL_OPTS[selN.arl||0]?.n+" ("+fPct(calc.tasa)+")",fmt(calc.arlV),"Max(IBC,SMLMV) × "+fPct(calc.tasa)],
                  ["Caja compensación (4%)",fmt(calc.caja),fmt(calc.ibc)+" × 4%"],
                  [calc.exS?"ICBF (exonerado)":"ICBF (3%)",fmt(calc.icbf),calc.exS?"Exonerado":fmt(calc.ibc)+" × 3%"],
                  [calc.exS?"SENA (exonerado)":"SENA (2%)",fmt(calc.sena),calc.exS?"Exonerado":fmt(calc.ibc)+" × 2%"],
                  ["TOTAL APORTES",fmt(calc.totAp),""],
                ].filter(Boolean).map(([l,v,f],i)=>l===""?<tr key={i}><td colSpan={3} style={{borderBottom:`1px solid ${T.border}`,height:8}}/></tr>:
                  l.startsWith("—")?<tr key={i}><td colSpan={3} style={{padding:"6px 0 2px",fontWeight:700,fontSize:10,color:T.inkMid}}>{l}</td></tr>:
                  <tr key={i}><td style={{padding:"3px 0",color:l.includes("TOTAL")?T.ink:T.inkMid,fontWeight:l.includes("TOTAL")?700:400}}>{l}</td><td style={{padding:"3px 8px",fontWeight:l.includes("TOTAL")?800:600,fontFamily:"'DM Mono',monospace",textAlign:"right",color:l.includes("TOTAL")?T.red:T.ink}}>{v}</td><td style={{padding:"3px 0",fontSize:9,color:T.inkLight,fontStyle:"italic"}}>{f}</td></tr>
                )}
                </tbody>
              </table>
            </Card>

            <Card accent={T.purple}>
              <STit color={T.purple}>📦 Provisiones mensuales</STit>
              <table style={{width:"100%",fontSize:11,borderCollapse:"collapse"}}>
                <tbody>
                {[
                  ["Base prestaciones",fmt(calc.salProp+calc.aux),"Sal.prop + Aux.transporte"],
                  ["","",""],
                  ["Prima servicios (8.33%)",fmt(calc.prima),fmt(calc.salProp+calc.aux)+" × 30/360"],
                  ["Cesantías (8.33%)",fmt(calc.ces),fmt(calc.salProp+calc.aux)+" × 30/360"],
                  ["Int. cesantías (1%)",fmt(calc.intC),"Cesantías × 12% ÷ 12"],
                  ["Vacaciones (4.17%)",fmt(calc.vac),fmt(calc.salProp)+" × 15/360 (sobre sal, sin aux)"],
                  ["","",""],
                  ["TOTAL PROVISIÓNES",fmt(calc.totPr),""],
                ].map(([l,v,f],i)=>l===""?<tr key={i}><td colSpan={3} style={{borderBottom:`1px solid ${T.border}`,height:8}}/></tr>:
                  <tr key={i}><td style={{padding:"3px 0",color:l.includes("TOTAL")?T.ink:T.inkMid,fontWeight:l.includes("TOTAL")?700:400}}>{l}</td><td style={{padding:"3px 8px",fontWeight:l.includes("TOTAL")?800:600,fontFamily:"'DM Mono',monospace",textAlign:"right",color:l.includes("TOTAL")?T.purple:T.ink}}>{v}</td><td style={{padding:"3px 0",fontSize:9,color:T.inkLight,fontStyle:"italic"}}>{f}</td></tr>
                )}
                </tbody>
              </table>
            </Card>

            <Card accent={T.green}>
              <STit color={T.green}>✅ Resumen final</STit>
              <table style={{width:"100%",fontSize:11,borderCollapse:"collapse"}}>
                <tbody>
                {[
                  ["Devengado bruto",fmt(calc.dev),"Lo que se genera"],
                  ["(-) Deducciones empleado",fmt(calc.totD),"EPS + Pen + RteF"],
                  ["= NETO A PAGAR",fmt(calc.neto),"Lo que recibe el trabajador"],
                  ...(selN.modalidadPago!=="mensual"?[
                    ["","",""],
                    ["Q1 — Anticipo fijo",fmt(calc.q1),fmt(selN.sal)+" × "+((selN.q1Pct||0.5)*100)+"%"],
                    ["Q2 — Ajuste real",fmt(calc.q2),"Neto − Q1"],
                  ]:[]),
                  ["","",""],
                  ["(+) Aportes empleador",fmt(calc.totAp),"Lo que paga la empresa adicional"],
                  ["(+) Provisiones",fmt(calc.totPr),"Reserva mensual obligatoria"],
                  ["","",""],
                  ["COSTO TOTAL EMPRESA",fmt(calc.costoT),"Devengado + Aportes + Provisiones"],
                  ["Factor prestacional",calc.salProp>0?(calc.costoT/calc.salProp).toFixed(3)+"×":"—","Costo ÷ Sal.prop"],
                  [`Costo/hora (${calc.horasMes}h/mes)`,fmt(calc.costoT/calc.horasMes),`Costo ÷ ${calc.horasMes}`],
                ].map(([l,v,f],i)=>l===""?<tr key={i}><td colSpan={3} style={{borderBottom:`1px solid ${T.border}`,height:8}}/></tr>:
                  <tr key={i} style={{background:l.includes("NETO")?"#E8F4EE":l.includes("COSTO TOTAL")?"#F5F4F1":"transparent"}}><td style={{padding:"4px 6px",color:l.includes("NETO")||l.includes("COSTO")?T.ink:T.inkMid,fontWeight:l.includes("=")||l.includes("COSTO")?700:400}}>{l}</td><td style={{padding:"4px 8px",fontWeight:l.includes("=")||l.includes("COSTO")?800:600,fontFamily:"'DM Mono',monospace",textAlign:"right",color:l.includes("NETO")?T.green:l.includes("COSTO")?T.ink:T.ink,fontSize:l.includes("NETO")||l.includes("COSTO")?14:12}}>{v}</td><td style={{padding:"4px 0",fontSize:9,color:T.inkLight,fontStyle:"italic"}}>{f}</td></tr>
                )}
                </tbody>
              </table>
              <div style={{marginTop:10,padding:"8px 10px",background:T.accent,borderRadius:4,fontSize:9,color:T.inkLight,lineHeight:1.6}}>
                <strong>Normativa:</strong> CST Arts. 127-128 (salario/no salarial) · Ley 100/93 (IBC, aportes) · Art. 114-1 ET (exoneración) · Ley 1393/2010 (límite 40%) · Decretos 1469-1470/2025 (SMLMV, Aux.T)
              </div>
            </Card>
          </div>
          </div>
        )}

        {subTab==="liqfinal"&&(
          <LiqFinalPanel selN={selN} calc={calc} fmt={fmt} MESES={MESES} mes={mes} anio={anio} HAB_LOGO={HAB_LOGO}/>
        )}
      {/* Sprint UX-1: Modal contextual al clicar día del calendario */}
      {dayEditor && (() => {
        const {day,k,date} = dayEditor;
        const nDias=selN.novDias||{};
        const iDias=selN.impDias||{};
        const currentNov = nDias[k] || null;
        const currentImp = iDias[k] || null;
        const isConflict = currentImp === "__conflicto__";
        // ¿Es día de descanso? (domingo o festivo) → se puede habilitar fichaje manual
        const esDomingo = date.getDay()===0;
        const esFestivo = holidays.some(h=>sameDay(h.date,date));
        const esDescanso = esDomingo || esFestivo;
        const fichajeActivo = !!fichajeHab[selN.empId+":"+k];
        const centrosEmp = centros.filter(c=>c.activo && Array.isArray(c.empleados) && c.empleados.includes(selN.empId));
        const fechaLabel = date.toLocaleDateString(getTenantDefaultsSync().locale,{weekday:"long",day:"numeric",month:"long",year:"numeric"});
        const novOpts = NOV_TIPOS.filter(n=>n.id!=="normal");

        // Aplicar acción: imputar OT
        const aplicarOT = (otId) => {
          const cur = {...iDias};
          cur[k] = otId;
          // La imputación (centro/OT) y la novedad CONVIVEN, como un festivo: imputar
          // solo asigna el coste del día a un centro; NO borra la novedad. Una licencia
          // remunerada es un día pagado cuyo coste debe quedar imputado a un centro.
          u({impDias:cur});
          setDayEditor(null);
        };

        // Aplicar acción: registrar novedad (solo este día, o rango inicio→fin editable)
        const aplicarNov = (tipoNov) => {
          const cur = {...nDias};
          const iCur = {...iDias};
          const tipoMap={incapacidad:"incapacidad",vacaciones:"vacaciones",licencia:"licencia_remunerada",licNoRem:"licencia_no_remunerada",ausencia:"ausencia"};
          // Determinar inicio y fin según el modo
          const ini = (modoNov==="rango" && rangoInicio) ? rangoInicio : k;
          const fin = (modoNov==="rango" && rangoFin && rangoFin>=ini) ? rangoFin : ini;
          // Construir lista de días laborables del rango (omite domingos y festivos)
          const dias=[];
          let cursor=new Date(ini+"T12:00:00");
          const finDate=new Date(fin+"T12:00:00");
          while(cursor<=finDate){
            const kk=cursor.getFullYear()+"-"+String(cursor.getMonth()+1).padStart(2,"0")+"-"+String(cursor.getDate()).padStart(2,"0");
            const esDom=cursor.getDay()===0;
            const esFest=holidays.some(h=>sameDay(h.date,cursor));
            if(!esDom&&!esFest) dias.push(kk);
            cursor.setDate(cursor.getDate()+1);
          }
          if(dias.length===0) dias.push(ini); // seguridad: al menos el día de inicio
          // Aplicar el tipo a cada día. La imputación (centro/OT) CONVIVE con la novedad
          // (como un festivo): no se borra al registrar una novedad.
          dias.forEach(kk=>{ cur[kk]=tipoNov; });
          // Nota manual (motivo): se guarda por día en novNotas y se manda como motivo a hr_novelties.
          const curNotas={...(selN.novNotas||{})};
          const _nota=(notaNov||"").trim();
          dias.forEach(kk=>{ if(_nota) curNotas[kk]=_nota; else delete curNotas[kk]; });
          const ncCounts={incapacidad:0,vacaciones:0,licencia:0,licNoRem:0,ausencia:0};
          Object.values(cur).forEach(v=>{if(ncCounts[v]!==undefined)ncCounts[v]++;});
          const diasRed = ncCounts.incapacidad + ncCounts.vacaciones + ncCounts.licNoRem + ncCounts.ausencia;
          u({novDias:cur,novNotas:curNotas,impDias:iCur,dias:Math.max(0,30-diasRed),diasIncap:ncCounts.incapacidad,diasVac:ncCounts.vacaciones,diasLicRem:ncCounts.licencia,diasLicNoRem:ncCounts.licNoRem,diasAusencia:ncCounts.ausencia});
          // UN solo registro en hr_novelties con fecha_inicio→fecha_fin del rango
          fetch("/api/novelties",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({employee_id:selN.empId,employee_nombre:selN.nombre,tipo:tipoMap[tipoNov]||tipoNov,fecha_inicio:dias[0],fecha_fin:dias[dias.length-1],motivo:_nota||"Registrado por RRHH",source:"rrhh"})}).catch(()=>{});
          // Si estamos en modo rango y el día de inicio no es el día abierto, mover el editor al día de inicio
          // para que la sección de adjuntos apunte al inicio del rango (donde se guarda el archivo único).
          if(dias[0]!==k){
            const d0=new Date(dias[0]+"T12:00:00");
            setDayEditor({day:d0.getDate(),k:dias[0],date:d0});
          }
          // No cerramos el modal: el usuario puede adjuntar el archivo que engloba el rango.
        };

        // Aplicar acción: limpiar día
        const limpiarDia = () => {
          const iCur = {...iDias};
          const nCur = {...nDias};
          if (currentImp) delete iCur[k];
          if (currentNov) {
            delete nCur[k];
            const nNotas={...(selN.novNotas||{})}; delete nNotas[k];
            const ncCounts={incapacidad:0,vacaciones:0,licencia:0,licNoRem:0,ausencia:0};
            Object.values(nCur).forEach(v=>{if(ncCounts[v]!==undefined)ncCounts[v]++;});
            const diasRed = ncCounts.incapacidad + ncCounts.vacaciones + ncCounts.licNoRem + ncCounts.ausencia;
            u({impDias:iCur,novDias:nCur,novNotas:nNotas,dias:Math.max(0,30-diasRed),diasIncap:ncCounts.incapacidad,diasVac:ncCounts.vacaciones,diasLicRem:ncCounts.licencia,diasLicNoRem:ncCounts.licNoRem,diasAusencia:ncCounts.ausencia});
            const tipoMap={incapacidad:"incapacidad",vacaciones:"vacaciones",licencia:"licencia_remunerada",licNoRem:"licencia_no_remunerada",ausencia:"ausencia"};
            fetch("/api/novelties",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({employee_id:selN.empId,fecha_inicio:k,tipo:tipoMap[currentNov]||currentNov})}).catch(()=>{});
            // El adjunto va con la novedad: al limpiar la novedad, borrar también su archivo de este día.
            const kk=selN.empId+":"+k;
            if(novAdjuntos[kk]){
              const nuevoAdj={...novAdjuntos};
              delete nuevoAdj[kk];
              setNovAdjuntos(nuevoAdj);
              saveAdjuntos(nuevoAdj).catch(()=>{});
            }
          } else {
            u({impDias:iCur});
          }
          setDayEditor(null);
        };

        return createPortal((
          <div style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={()=>setDayEditor(null)}>
            <div onClick={e=>e.stopPropagation()} style={{maxWidth:560,width:"100%",maxHeight:"90vh",overflowY:"auto",background:"#fff",borderRadius:12,padding:24,boxShadow:"0 8px 30px rgba(0,0,0,.2)"}}>
              {/* Header */}
              <div style={{marginBottom:16,borderBottom:`1px solid ${T.border}`,paddingBottom:12}}>
                <div style={{fontSize:11,color:T.inkLight,textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:600}}>📅 Editando día</div>
                <div style={{fontSize:18,fontWeight:700,color:T.ink,marginTop:2,textTransform:"capitalize"}}>{fechaLabel}</div>
                {/* Estado actual */}
                {(currentImp||currentNov||isConflict)&&(
                  <div style={{marginTop:8,padding:"6px 10px",background:isConflict?"#FEE2E2":currentNov?(NOV_TIPOS.find(n=>n.id===currentNov)?.color||"#F3F4F6"):"#EDE9FE",borderRadius:4,fontSize:11,fontWeight:600,color:isConflict?"#991B1B":T.ink}}>
                    Estado actual: {isConflict?"⚠️ Conflicto entre 2+ calendarios — elige una OT":currentNov?(NOV_TIPOS.find(n=>n.id===currentNov)?.icon+" "+NOV_TIPOS.find(n=>n.id===currentNov)?.label):"📊 Imputado a "+(centros.find(c=>c.id===currentImp)?.codigo||currentImp)}
                  </div>
                )}
              </div>

              {/* SECCIÓN 1: Imputar OT */}
              <div style={{marginBottom:18}}>
                <div style={{fontSize:11,fontWeight:700,color:T.inkLight,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:8}}>📊 ¿Trabajó en una OT?</div>
                {centrosEmp.length===0 ? (
                  <div style={{padding:"8px 12px",fontSize:11,color:"#D97706",background:"#FEF3C7",borderRadius:6}}>⚠️ El empleado no tiene OTs asignadas. Configúralas en Centros de Trabajo.</div>
                ) : (
                  <div style={{display:"flex",flexDirection:"column",gap:4}}>
                    {centrosEmp.map(c => {
                      const isActive = currentImp === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={()=>aplicarOT(c.id)}
                          style={{textAlign:"left",padding:"8px 12px",fontSize:12,fontWeight:isActive?700:500,border:isActive?"2px solid #111":`1px solid ${T.border}`,borderRadius:6,background:isActive?colorForOT(c.id):"#fff",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",display:"flex",alignItems:"center",justifyContent:"space-between"}}
                        >
                          <span><strong>{c.codigo}</strong> — {c.nombre}</span>
                          {isActive && <span style={{fontSize:10,color:T.green}}>✓ actual</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* SECCIÓN 2: Novedad */}
              <div style={{marginBottom:18}}>
                <div style={{fontSize:11,fontWeight:700,color:T.inkLight,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:8}}>📋 ¿O fue novedad?</div>
                {/* Selector de modo: solo este día o rango de fechas */}
                <div style={{display:"flex",gap:6,marginBottom:10}}>
                  <button type="button" onClick={()=>setModoNov("dia")} style={{flex:1,padding:"7px 10px",fontSize:11,fontWeight:modoNov==="dia"?700:500,border:modoNov==="dia"?`2px solid ${T.ink}`:`1px solid ${T.border}`,borderRadius:6,background:modoNov==="dia"?T.accent:"#fff",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
                    📅 Solo este día
                  </button>
                  <button type="button" onClick={()=>{setModoNov("rango");if(!rangoInicio)setRangoInicio(k);}} style={{flex:1,padding:"7px 10px",fontSize:11,fontWeight:modoNov==="rango"?700:500,border:modoNov==="rango"?`2px solid ${T.ink}`:`1px solid ${T.border}`,borderRadius:6,background:modoNov==="rango"?T.accent:"#fff",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
                    📆 Rango de fechas
                  </button>
                </div>
                {/* Campos de rango (solo en modo rango) */}
                {modoNov==="rango" && (
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,padding:"8px 10px",background:"#FAFAF8",border:`1px solid ${T.border}`,borderRadius:6,flexWrap:"wrap"}}>
                    <div style={{display:"flex",alignItems:"center",gap:5}}>
                      <span style={{fontSize:10,color:T.inkLight}}>Desde:</span>
                      <input type="date" value={rangoInicio||k} onChange={e=>{setRangoInicio(e.target.value);e.target.blur();}} style={{fontSize:11,padding:"3px 6px",border:`1px solid ${T.border}`,borderRadius:4,fontFamily:"'DM Sans',sans-serif"}}/>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:5}}>
                      <span style={{fontSize:10,color:T.inkLight}}>Hasta:</span>
                      <input type="date" value={rangoFin} min={rangoInicio||k} onChange={e=>{setRangoFin(e.target.value);e.target.blur();}} style={{fontSize:11,padding:"3px 6px",border:`1px solid ${T.border}`,borderRadius:4,fontFamily:"'DM Sans',sans-serif"}}/>
                    </div>
                  </div>
                )}
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:10,fontWeight:700,color:T.inkLight,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4}}>📝 Nota (opcional)</div>
                  <textarea value={notaNov} onChange={e=>setNotaNov(e.target.value)} rows={2} placeholder="Ej.: dijo que fue al médico, sin justificante" style={{width:"100%",fontSize:11,padding:"6px 8px",border:`1px solid ${T.border}`,borderRadius:6,fontFamily:"'DM Sans',sans-serif",resize:"vertical",boxSizing:"border-box"}}/>
                  <div style={{fontSize:9,color:T.inkLight,marginTop:2}}>Se guarda con la novedad y aparece en el informe del contador. Escríbela y luego elige el tipo.</div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:6}}>
                  {novOpts.map(n => {
                    const isActive = currentNov === n.id;
                    return (
                      <button
                        key={n.id}
                        type="button"
                        onClick={()=>aplicarNov(n.id)}
                        style={{padding:"8px 12px",fontSize:11,fontWeight:isActive?700:500,border:isActive?"2px solid #111":`1px solid ${T.border}`,borderRadius:6,background:isActive?n.color:"#fff",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",textAlign:"left"}}
                      >
                        {n.icon} {n.label} {isActive && <span style={{fontSize:9,color:T.green,marginLeft:4}}>✓</span>}
                      </button>
                    );
                  })}
                </div>
                {modoNov==="rango" && rangoFin && rangoFin>=(rangoInicio||k) && (
                  <div style={{fontSize:9,color:T.inkLight,marginTop:6}}>Al elegir el tipo, se aplicará a los días laborables entre {rangoInicio||k} y {rangoFin} (omite domingos y festivos). Un solo archivo cubrirá todo el rango.</div>
                )}
                {modoNov==="rango" && rangoFin && rangoFin<(rangoInicio||k) && (
                  <div style={{fontSize:9,color:"#dc2626",marginTop:6}}>La fecha fin debe ser igual o posterior a la de inicio.</div>
                )}
              </div>

              {/* SECCIÓN 3: Adjuntos de la novedad (solo si hay novedad activa) */}
              {currentNov && (()=>{
                const arr = novAdjuntos[selN.empId+":"+k] || [];
                return (
                  <div style={{marginBottom:18,padding:"12px 14px",background:"#FAFAF8",border:`1px solid ${T.border}`,borderRadius:8}}>
                    <div style={{fontSize:11,fontWeight:700,color:T.inkLight,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:8}}>📎 Adjuntos {arr.length>0&&<span style={{color:T.green}}>({arr.length})</span>}</div>
                    {arr.length>0 && (
                      <div style={{display:"flex",flexDirection:"column",gap:4,marginBottom:8}}>
                        {arr.map((f,i)=>(
                          <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 8px",background:"#fff",border:`1px solid ${T.border}`,borderRadius:5,fontSize:11}}>
                            <span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>📄 {f.name}</span>
                            <span style={{fontSize:9,color:T.inkLight}}>{(f.size/1024).toFixed(0)} KB</span>
                            <button onClick={()=>verArchivo(f.data, f.name)} style={{fontSize:10,fontWeight:600,color:T.blue,background:"none",border:"none",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",padding:0}}>👁 Ver</button>
                            <a href={f.data} download={f.name} style={{fontSize:10,fontWeight:600,color:T.ink,textDecoration:"none"}}>⬇ Descargar</a>
                            {ed && <button onClick={()=>delAdjunto(k,i)} style={{fontSize:10,fontWeight:600,color:"#dc2626",border:"none",background:"none",cursor:"pointer"}}>✕</button>}
                          </div>
                        ))}
                      </div>
                    )}
                    {ed ? (
                      <label
                        onDragOver={e=>{e.preventDefault();if(!adjUploading)setAdjDrag(true);}}
                        onDragLeave={e=>{e.preventDefault();setAdjDrag(false);}}
                        onDrop={e=>{e.preventDefault();setAdjDrag(false);if(adjUploading)return;const f=e.dataTransfer.files&&e.dataTransfer.files[0];if(f)addAdjunto(k,f);}}
                        style={{display:"block",fontSize:11,fontWeight:600,color:adjDrag?T.green:T.inkMid,padding:"16px 12px",border:`2px dashed ${adjDrag?T.green:T.border}`,borderRadius:8,cursor:adjUploading?"wait":"pointer",background:adjDrag?T.greenBg:"#FAFAF8",textAlign:"center",transition:"all .12s"}}>
                        {adjUploading?"⏳ Subiendo…":adjDrag?"📥 Suelta el archivo aquí":"📎 Arrastra un archivo aquí o haz clic para seleccionar"}
                        <input type="file" accept=".pdf,.jpg,.jpeg,.png" disabled={adjUploading} onChange={e=>{const f=e.target.files[0];addAdjunto(k,f);e.target.value="";}} style={{display:"none"}}/>
                      </label>
                    ) : (
                      arr.length===0 && <div style={{fontSize:10,color:T.inkLight}}>Sin adjuntos · mes ya liquidado (solo lectura)</div>
                    )}
                    <div style={{fontSize:9,color:T.inkLight,marginTop:6}}>PDF o imagen · máx. 5MB · varios permitidos</div>
                  </div>
                );
              })()}

              {/* SECCIÓN 4: Habilitar fichaje en día de descanso (solo domingos/festivos) */}
              {esDescanso && (
                <div style={{marginBottom:18,padding:"12px 14px",background:fichajeActivo?"#F0FDF4":"#FAFAF8",border:`1px solid ${fichajeActivo?"#BBF7D0":T.border}`,borderRadius:8}}>
                  <div style={{fontSize:11,fontWeight:700,color:T.inkLight,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:8}}>🕐 Trabajo en {esFestivo?"festivo":"domingo"}</div>
                  <div style={{fontSize:11,color:T.inkMid,marginBottom:10,lineHeight:1.5}}>
                    Este día es de descanso. Puedes <strong>imputarlo tú directamente</strong> arriba (OT o novedad), o <strong>habilitar el fichaje</strong> para que {selN.nombre.split(" ")[0]} registre su asistencia desde su portal.
                  </div>
                  {ed ? (
                    <button onClick={()=>toggleFichaje(k)} style={{padding:"8px 14px",fontSize:11,fontWeight:600,border:`1px solid ${fichajeActivo?T.green:T.border}`,borderRadius:6,background:fichajeActivo?T.green:"#fff",color:fichajeActivo?"#fff":T.ink,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
                      {fichajeActivo?"✓ Fichaje habilitado — clic para quitar":"+ Habilitar fichaje este día"}
                    </button>
                  ) : (
                    <div style={{fontSize:10,color:fichajeActivo?T.green:T.inkLight,fontWeight:600}}>{fichajeActivo?"✓ Fichaje habilitado":"Fichaje no habilitado · mes liquidado (solo lectura)"}</div>
                  )}
                </div>
              )}

              {/* Acciones inferiores */}
              <div style={{display:"flex",gap:8,paddingTop:12,borderTop:`1px solid ${T.border}`}}>
                {(currentImp||currentNov) && (
                  <button onClick={limpiarDia} style={{padding:"8px 16px",fontSize:11,fontWeight:600,border:"1px solid #dc2626",borderRadius:6,background:"#fff",color:"#dc2626",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",flex:1}}>
                    🗑 Limpiar este día
                  </button>
                )}
                <button onClick={()=>setDayEditor(null)} style={{padding:"8px 16px",fontSize:12,fontWeight:700,border:"none",borderRadius:6,background:T.ink,color:"#fff",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",flex:2}}>
                  ✓ Aceptar
                </button>
              </div>
              {ed && (
                <div style={{fontSize:10,color:T.amber,marginTop:8,textAlign:"center",lineHeight:1.4}}>
                  💡 Los cambios se aplican al aceptar. Recuerda pulsar <strong>💾 Guardar</strong> arriba para dejarlos permanentes.
                </div>
              )}
            </div>
          </div>
        ), document.body);
      })()}
      </div>
    );
  }

  return(
    <div className="fade-up">
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
        <div style={{fontSize:11,color:T.inkLight}}>Colombia 2026 · SMLMV {fmt(SMLMV)} · Aux.T {fmt(AUX_TR)}</div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <select value={anio} onChange={e=>setAnio(parseInt(e.target.value))} style={{padding:"6px 10px",border:`1px solid ${T.border}`,borderRadius:4,fontSize:12,fontFamily:"'DM Sans',sans-serif",background:"#fff",width:84}}>{(()=>{const yA=new Date().getFullYear();return[yA-2,yA-1,yA,yA+1];})().map(y=><option key={y} value={y}>{y}</option>)}</select>
          <Btn pri onClick={guardar} disabled={guard}>{guard?"Guardando…":"💾 Guardar"}</Btn>
        </div>
      </div>
      {/* Barra de progreso del año (estilo Excel): cerrado=verde · en curso=ámbar · pendiente=gris · activo=oscuro */}
      <div style={{display:"flex",gap:3,flexWrap:"wrap",marginBottom:6}}>
        {MESES.map((m,i)=>{
          const activo=i===mes, est=estadosAnio[i];
          let bg="#fff",col=T.inkLight,bd=T.border,mark=null;
          if(est==="cerrada"){bg=T.greenBg;col=T.green;bd="#BBF7D0";mark="✓";}
          else if(est==="borrador"){bg=T.amberBg;col=T.amber;bd="#FDE68A";}
          if(activo){bg=T.ink;col="#fff";bd=T.ink;}
          return(
            <button key={i} onClick={()=>setMes(i)} style={{position:"relative",flex:"1 1 0",minWidth:54,padding:"6px 4px",borderRadius:5,border:`1.5px solid ${bd}`,background:bg,color:col,fontSize:11,fontWeight:activo?700:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",transition:"all .12s"}}>
              {m.substring(0,3)}{mark&&!activo&&<span style={{marginLeft:3,fontSize:9}}>{mark}</span>}
            </button>
          );
        })}
      </div>
      <div style={{display:"flex",gap:14,marginBottom:16,fontSize:9,color:T.inkLight}}>
        <span><span style={{display:"inline-block",width:8,height:8,borderRadius:2,background:T.greenBg,border:`1px solid #BBF7D0`,marginRight:4,verticalAlign:"middle"}}/>Cerrado</span>
        <span><span style={{display:"inline-block",width:8,height:8,borderRadius:2,background:T.amberBg,border:`1px solid #FDE68A`,marginRight:4,verticalAlign:"middle"}}/>En curso</span>
        <span><span style={{display:"inline-block",width:8,height:8,borderRadius:2,background:"#fff",border:`1px solid ${T.border}`,marginRight:4,verticalAlign:"middle"}}/>Pendiente</span>
      </div>
      {(()=>{const h=new Date();return h.getFullYear()===anio&&h.getMonth()===mes;})() && <BannerPagos noms={noms} />}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:16}}>
        {[["Empleados",noms.length,T.ink],["Pagadas",noms.filter(n=>n.estado==="liquidada"||n.estado==="pagada").length,T.green],["Neto total",fmt(totN),T.ink],["Total Q1",fmt(totQ1),T.blue],["Total Q2",fmt(totQ2),T.green]].map(([l,v,c])=>(
          <div key={l} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:6,padding:"12px 14px",boxShadow:T.shadow}}>
            <div style={{fontSize:8,fontWeight:700,color:T.inkLight,textTransform:"uppercase",letterSpacing:.6,marginBottom:2}}>{l}</div>
            <div style={{fontSize:18,fontWeight:800,color:c,fontFamily:"'DM Mono',monospace"}}>{v}</div>
          </div>
        ))}
      </div>
      {loading?<Card style={{padding:0,overflow:"hidden"}}>
        <div style={{padding:"10px 16px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",gap:12}}>
          <div className="sk-bar" style={{width:140,height:14}}/>
          <div style={{flex:1}}/>
          <div className="sk-bar" style={{width:160,height:10}}/>
        </div>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{background:T.accent}}>
            {["Empleado","Cargo","Salario","Bono","Días","Neto","Q1","Q2","Costo","Estado",""].map((l,i)=>(
              <th key={i} style={{padding:"7px 12px",fontSize:9,fontWeight:700,color:T.inkLight,textAlign:"left",letterSpacing:.6,textTransform:"uppercase"}}>{l}</th>
            ))}
          </tr></thead>
          <tbody>{[0,1,2].map(i=>(
            <tr key={i} style={{borderTop:`1px solid ${T.border}`}}>
              {[120,90,70,50,30,70,60,60,70,60,40].map((w,j)=>(
                <td key={j} style={{padding:"10px 12px"}}>
                  <div className="sk-bar" style={{width:w,height:11,animationDelay:(i*0.15+j*0.05)+"s"}}/>
                </td>
              ))}
            </tr>
          ))}</tbody>
        </table>
      </Card>:
      noms.length===0?<Card style={{textAlign:"center",padding:40}}><div style={{fontSize:28,marginBottom:8}}>📋</div><div style={{fontSize:13,fontWeight:600,color:T.ink}}>Sin empleados vinculados</div><div style={{fontSize:11,color:T.inkLight,marginTop:4}}>Los empleados con contrato firmado aparecerán automáticamente.</div></Card>:
      <Card style={{padding:0,overflow:"hidden"}}>
        <div style={{padding:"10px 16px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
          <span style={{fontSize:12,fontWeight:700,whiteSpace:"nowrap"}}>Nómina {MESES[mes]} {anio}</span>
          <input value={buscar} onChange={e=>setBuscar(e.target.value)} placeholder="🔍 Buscar empleado…" style={{flex:1,maxWidth:280,padding:"6px 12px",border:`1px solid ${T.border}`,borderRadius:6,fontSize:12,fontFamily:"'DM Sans',sans-serif",outline:"none"}}/>
          <span style={{fontSize:10,color:T.inkLight,whiteSpace:"nowrap"}}>Costo empresa: <strong style={{color:T.ink}}>{fmt(totC)}</strong></span>
          <button
            type="button"
            onClick={()=>{
              const rep = genConciliaciónMensualHtml();
              if (rep) openReport(rep.html);
              else window.toast && window.toast("Sin empleados para conciliar","warning");
            }}
            style={{padding:"6px 12px",fontSize:11,fontWeight:600,border:`1px solid ${T.border}`,borderRadius:5,background:"#FAFAF8",color:T.ink,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap"}}
            title="Reporte consolidado del mes: caja, provisiones y distribucion por OT de todos los empleados. Util para validar contra el contador y la PILA."
          >📊 Conciliación contable</button>
        </div>
        {(()=>{
          const getApellido=(nom)=>{const p=(nom||"").split(" ");return p.length>=3?p.slice(-2).join(" "):p.length>=2?p[p.length-1]:nom||"";};
          const q=buscar.toLowerCase();
          const filtered=noms.filter(n=>!q||(n.nombre||"").toLowerCase().includes(q)||(n.cc||"").includes(q)||(n.cargo||"").toLowerCase().includes(q));
          const sorted=[...filtered].sort((a,b)=>{
            let va,vb;
            if(sortBy==="nombre"){va=getApellido(a.nombre);vb=getApellido(b.nombre);}
            else if(sortBy==="cargo"){va=a.cargo||"";vb=b.cargo||"";}
            else if(sortBy==="sal"){va=a.sal||0;vb=b.sal||0;}
            else if(sortBy==="neto"){va=calcN(a).neto;vb=calcN(b).neto;}
            else{va=a.nombre||"";vb=b.nombre||"";}
            const cmp=typeof va==="number"?va-vb:String(va).localeCompare(String(vb),"es");
            return sortDir==="asc"?cmp:-cmp;
          });
          const toggleSort=(col)=>{if(sortBy===col)setSortDir(d=>d==="asc"?"desc":"asc");else{setSortBy(col);setSortDir("asc");}};
          const sortIcon=(col)=>sortBy===col?(sortDir==="asc"?"▲":"▼"):"";
          return <>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{background:T.accent}}>
            {[{k:"nombre",l:"Empleado"},{k:"cargo",l:"Cargo"},{k:"sal",l:"Salario"},{k:"",l:"Bono"},{k:"",l:"Días"},{k:"neto",l:"Neto"},{k:"",l:"Q1"},{k:"",l:"Q2"},{k:"",l:"Costo"},{k:"",l:"Estado"},{k:"",l:""}].map(h=>(
              <th key={h.l} onClick={h.k?()=>toggleSort(h.k):undefined} style={{padding:"7px 12px",fontSize:9,fontWeight:700,color:sortBy===h.k?T.ink:T.inkLight,textAlign:"left",letterSpacing:.6,textTransform:"uppercase",cursor:h.k?"pointer":"default",userSelect:"none"}}>{h.l} {sortIcon(h.k)}</th>
            ))}
          </tr></thead>
          <tbody>{sorted.length===0?<tr><td colSpan={11} style={{padding:24,textAlign:"center",color:T.inkLight,fontSize:12}}>Sin resultados para "{buscar}"</td></tr>:sorted.map(n=>{const c=calcN(n);return(
            <tr key={n.id} style={{borderTop:`1px solid ${T.border}`,cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background=T.accent} onMouseLeave={e=>e.currentTarget.style.background=""}>
              <td style={{padding:"9px 12px"}}><div style={{fontWeight:600,fontSize:12}}>{(()=>{const p=(n.nombre||"").split(" ");if(p.length>=3){const ape=p.slice(-2).join(" ");const nom=p.slice(0,-2).join(" ");return <>{ape}<span style={{fontWeight:400,color:T.inkLight}}>, {nom}</span></>;}return n.nombre;})()}</div></td>
              <td style={{padding:"9px 12px",fontSize:11,color:T.inkLight}}>{n.cargo}</td>
              <td style={{padding:"9px 12px",fontSize:12,fontFamily:"'DM Mono',monospace"}}>{fmt(n.sal)}</td>
              <td style={{padding:"9px 12px",fontSize:11,color:T.inkLight,fontFamily:"'DM Mono',monospace"}}>{n.bono>0?fmt(n.bono):"—"}</td>
              <td style={{padding:"9px 12px",fontSize:11,fontFamily:"'DM Mono',monospace"}}>{n.dias}</td>
              <td style={{padding:"9px 12px",fontSize:12,fontWeight:700,color:T.green,fontFamily:"'DM Mono',monospace"}}>{fmt(c.neto)}</td>
              <td style={{padding:"9px 12px",fontSize:11,color:T.blue,fontFamily:"'DM Mono',monospace"}}>{n.modalidadPago==="mensual"?"—":fmt(c.q1)}</td>
              <td style={{padding:"9px 12px",fontSize:11,color:T.green,fontFamily:"'DM Mono',monospace"}}>{n.modalidadPago==="mensual"?"—":fmt(c.q2)}</td>
              <td style={{padding:"9px 12px",fontSize:11,color:T.inkMid,fontFamily:"'DM Mono',monospace"}}>{fmt(c.costoT)}</td>
              <td style={{padding:"9px 12px"}}><EstadoPills n={n}/></td>
              <td style={{padding:"9px 12px"}}><Btn small onClick={()=>{setSel(n.id);setVista("detalle");setSubTab("nomina");}}>Ver →</Btn></td>
            </tr>);})}</tbody>
        </table>
        <div style={{padding:"8px 16px",borderTop:`1px solid ${T.border}`,fontSize:10,color:T.inkLight}}>
          {sorted.length} de {noms.length} empleado(s){buscar?" · filtrado por \""+buscar+"\"":""}  · Ordenado por {sortBy==="nombre"?"apellido":sortBy} {sortDir==="asc"?"A→Z":"Z→A"}
        </div>
        </>;})()}
      </Card>}
      <div style={{marginTop:12,padding:"10px 14px",background:T.accent,borderRadius:4,fontSize:9,color:T.inkLight,display:"flex",gap:20}}>
        <span>CST Art. 127-128 · Ley 100/93 · Art. 114-1 ET</span>
        <span>Q1 = anticipo fijo · Q2 = ajuste real · Bono Art.128 = NO salarial</span>
      </div>

    </div>
  );
}
