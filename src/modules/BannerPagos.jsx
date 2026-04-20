// ──────────────────────────────────────────────────────────────
// BannerPagos: banner de alertas de fechas límite de pago.
// Se usa tanto en TabNomina (vista lista) como en el Dashboard
// de RRHH para que el recordatorio sea visible en todos lados.
//
// Criterio: vista del mes/año actual únicamente. Calcula
// fechas de vencimiento Q1 (día 15, o último hábil anterior)
// y Q2/mensual (último día del mes). Semáforo:
//   rojo 🚨  vencido/hoy/mañana
//   amarillo ⚠️  2-3 días
//   azul 🔔   4-14 días  (ventana amplia — 2 semanas de antelación)
// ──────────────────────────────────────────────────────────────

import React, { useMemo, useState, useEffect } from "react";

// Festivos Colombia — cálculo dinámico con Easter
function easter(y){const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),mo=Math.floor((h+l-7*m+114)/31),da=((h+l-7*m+114)%31)+1;return new Date(y,mo-1,da);}
function nxtMon(d){const w=d.getDay();if(w===1)return new Date(d);return new Date(d.getFullYear(),d.getMonth(),d.getDate()+(w===0?1:8-w));}
function addD(d,n){return new Date(d.getFullYear(),d.getMonth(),d.getDate()+n);}
function getHolidays(y){const e=easter(y),h=[];const F=(m,d,n)=>h.push({date:new Date(y,m-1,d),name:n});const E=(m,d,n)=>{h.push({date:nxtMon(new Date(y,m-1,d)),name:n});};F(1,1,"Año Nuevo");F(5,1,"Día Trabajo");F(7,20,"Independencia");F(8,7,"Boyacá");F(12,8,"Inmaculada");F(12,25,"Navidad");h.push({date:addD(e,-3),name:"Jueves Santo"});h.push({date:addD(e,-2),name:"Viernes Santo"});h.push({date:nxtMon(addD(e,39)),name:"Ascensión"});h.push({date:nxtMon(addD(e,60)),name:"Corpus Christi"});h.push({date:nxtMon(addD(e,68)),name:"Sagrado Corazón"});E(1,6,"Reyes Magos");E(3,19,"San José");E(6,29,"San Pedro y Pablo");E(8,15,"Asunción");E(10,12,"Día Raza");E(11,1,"Todos Santos");E(11,11,"Indep. Cartagena");return h;}
function sameDay(a,b){return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();}
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
function lblFecha(fecha, hoy){
  if (sameDay(fecha, hoy)) return "hoy";
  const mañana = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()+1);
  if (sameDay(fecha, mañana)) return "mañana";
  return fecha.toLocaleDateString("es-CO",{weekday:"short",day:"numeric",month:"short"});
}
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

// Componente: muestra alertas de vencimiento para el mes actual.
// Props:
//   noms: array opcional de nóminas del mes (si se provee, no hace fetch).
//         Útil desde TabNomina donde el estado React ya las tiene.
//   compact: si true, oculta la lista de nombres de pendientes (solo cuenta).
// Si no se provee noms, hace fetch a /api/hiring kv=nomina.
export function BannerPagos({ noms: nomsProp, compact = false }) {
  const [nomsFetched, setNomsFetched] = useState(null);
  const noms = nomsProp !== undefined ? nomsProp : nomsFetched;

  useEffect(() => {
    if (nomsProp !== undefined) return; // ya tenemos noms por prop, no fetch
    const hoy = new Date();
    const anio = hoy.getFullYear();
    const mes = hoy.getMonth();
    fetch(`/api/hiring?kv=nomina&anio=${anio}&mes=${mes}`)
      .then(r => r.json())
      .then(d => setNomsFetched(d.ok ? (d.data || []) : []))
      .catch(() => setNomsFetched([]));
  }, [nomsProp]);

  const alertas = useMemo(() => {
    if (!noms) return null;
    const today = new Date(); today.setHours(0,0,0,0);
    const anio = today.getFullYear();
    const mes = today.getMonth();
    const holidays = getHolidays(anio);
    const a = [];
    // Q1: día 15 (o último hábil anterior)
    const fechaQ1 = ultimoDiaHabil(new Date(anio, mes, 15), holidays);
    const pendQ1 = noms.filter(n => n.modalidadPago !== "mensual" && n.estado === "borrador");
    if (pendQ1.length > 0) {
      const alt = alertaPago(fechaQ1, today);
      if (alt) a.push({tipo:"Q1", fecha:fechaQ1, pendientes:pendQ1, alt});
    }
    // Fin de mes: último día del mes (o último hábil anterior)
    const finMesDate = new Date(anio, mes+1, 0);
    const fechaFin = ultimoDiaHabil(finMesDate, holidays);
    const pendQ2 = noms.filter(n => n.modalidadPago !== "mensual" && n.estado === "q1_pagado");
    const pendMensual = noms.filter(n => n.modalidadPago === "mensual" && n.estado === "borrador");
    const pendFin = [...pendQ2, ...pendMensual];
    if (pendFin.length > 0) {
      const alt = alertaPago(fechaFin, today);
      if (alt) a.push({tipo:"Fin de mes", fecha:fechaFin, pendientes:pendFin, altQ2:pendQ2.length, altMensual:pendMensual.length, alt});
    }
    return a;
  }, [noms]);

  if (!alertas || alertas.length === 0) return null;

  const today = new Date(); today.setHours(0,0,0,0);
  const colores = {
    rojo:{bg:"#FEF2F2",border:"#FCA5A5",ink:"#991B1B",accent:"#DC2626"},
    amarillo:{bg:"#FFFBEB",border:"#FCD34D",ink:"#92400E",accent:"#D97706"},
    azul:{bg:"#EFF6FF",border:"#93C5FD",ink:"#1E3A8A",accent:"#2563EB"}
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
      {alertas.map((a,i) => {
        const c = colores[a.alt.nivel];
        const icono = a.alt.nivel === "rojo" ? "🚨" : a.alt.nivel === "amarillo" ? "⚠️" : "🔔";
        const titulo = a.tipo === "Q1"
          ? `Anticipo Q1 quincenal · ${a.alt.msg}`
          : a.altQ2 && a.altMensual
            ? `Nómina de fin de mes · ${a.alt.msg}`
            : a.altMensual
              ? `Nómina mensual · ${a.alt.msg}`
              : `Q2 quincenal · ${a.alt.msg}`;
        const nombresPend = a.pendientes.map(p => {
          const partes = (p.nombre || "").split(" ");
          return partes.length >= 3 ? partes.slice(-2).join(" ") : p.nombre;
        });
        const fechaLbl = lblFecha(a.fecha, today);
        const today2 = new Date(today);
        const finMesDia = new Date(today2.getFullYear(), today2.getMonth()+1, 0).getDate();
        const esDiaAjustado = a.fecha.getDate() !== (a.tipo === "Q1" ? 15 : finMesDia);

        return (
          <div key={i} style={{background:c.bg, border:`1px solid ${c.border}`, borderRadius:6, padding:"12px 16px", display:"flex", alignItems:"center", gap:14}}>
            <div style={{fontSize:18}}>{icono}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:12, fontWeight:700, color:c.ink, marginBottom:2}}>{titulo}</div>
              <div style={{fontSize:11, color:c.ink}}>
                Fecha de pago: <strong>{fechaLbl}</strong>
                {esDiaAjustado && <span style={{color:c.accent, fontStyle:"italic"}}> (último día hábil anterior)</span>}
                {" · "}
                <strong>{a.pendientes.length} empleado{a.pendientes.length===1?"":"s"} pendiente{a.pendientes.length===1?"":"s"}</strong>
                {!compact && `: ${nombresPend.join(", ")}`}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default BannerPagos;
