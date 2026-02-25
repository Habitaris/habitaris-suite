import React, { useState, useMemo } from "react";
import { AlertTriangle, TrendingUp, TrendingDown, DollarSign, Calendar, Truck, FileText, Users, Package, Wrench, CreditCard, Briefcase } from "lucide-react";

/* ═══════════════════════════════════════════════════════════════
   DASHBOARD GENERAL — Habitaris Suite
   KPIs Financieros · Estado Proyectos · Alertas · Flujo Caja
   Filtro por módulo
   ═══════════════════════════════════════════════════════════════ */

const Fonts = () => <style>{`@import url('https://fonts.googleapis.com/css2?family=DM Sans:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}body{font-family:'DM Sans',sans-serif;background:#F5F4F1}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#C8C5BE;border-radius:2px}input,select,textarea,button{font-family:'DM Sans',sans-serif;outline:none}button{cursor:pointer}@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}.fade-up{animation:fadeUp .22s ease both}`}</style>;
const T = { bg:"#F5F4F1",surface:"#FFFFFF",ink:"#111",inkMid:"#555",inkLight:"#909090",inkXLight:"#C8C5BE",border:"#E0E0E0",accent:"#EDEBE7",green:"#111111",greenBg:"#E8F4EE",red:"#B91C1C",redBg:"#FAE8E8",amber:"#8C6A00",amberBg:"#FAF0E0",blue:"#3B3B3B",blueBg:"#F0F0F0",purple:"#5B3A8C",shadow:"0 1px 3px rgba(0,0,0,.06),0 4px 16px rgba(0,0,0,.05)" };
const fmt = (n) => new Intl.NumberFormat("es-CO",{maximumFractionDigits:0}).format(n||0);
const today = () => new Date().toISOString().split("T")[0];
const Card = ({children,style,...p}) => <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:16,boxShadow:T.shadow,...style}} {...p}>{children}</div>;
const Badge = ({children,color}) => <span style={{fontSize:8,fontWeight:700,padding:"2px 8px",borderRadius:10,background:color+"22",color}}>{children}</span>;

const MODULOS = [
  { id:"general",    lbl:"📊 General",        color:T.ink },
  { id:"proyectos",  lbl:"📅 Proyectos",      color:"#5B3A8C" },
  { id:"admin",      lbl:"💼 Administración",  color:"#6B5B8C" },
  { id:"compras",    lbl:"🛒 Compras",         color:"#0D5E6E" },
  { id:"flotas",     lbl:"🚗 Flotas",          color:"#2E5E4E" },
  { id:"rrhh",       lbl:"👷 RRHH",            color:"#3B3B3B" },
  { id:"crm",        lbl:"📋 CRM / Ofertas",   color:"#111111" },
  { id:"formularios",lbl:"📋 Formularios",      color:"#5B3A8C" },
];

/* Helper to safely read localStorage */
const getStore = (key) => { try { return JSON.parse(localStorage.getItem(key))||{}; } catch { return {}; } };

/* ── Data loaders from all modules ── */
function useAllData() {
  return useMemo(() => {
    const crm = getStore("habitaris_crm");
    const admin = getStore("habitaris_admin");
    const flotas = getStore("habitaris_flotas");
    const compras = getStore("habitaris_compras");
    const hoy = today();

    // ─── ADMIN DATA ───
    const cajas = admin.adm_cajas || [];
    const tarjeta = admin.adm_tarjeta || [];
    const viaticos = admin.adm_viaticos || [];
    const flujo = admin.adm_flujo || [];
    const cuentas = admin.adm_cuentas || [];

    const saldoCajas = cajas.reduce((s,c) => {
      const mov = (c.movimientos||[]);
      return s + (c.fondoInicial||0) + mov.reduce((ss,m)=>ss+(m.tipo==="entrada"?m.monto:-m.monto),0);
    }, 0);
    const tarjetaPend = tarjeta.filter(t=>t.estado==="pendiente");
    const viaticosPend = viaticos.filter(v=>v.estado==="solicitado"||v.estado==="aprobado");

    const flujoMes = (() => {
      const d = new Date();
      const mes = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      const movsMes = flujo.filter(m=>m.fecha?.startsWith(mes));
      const ing = movsMes.filter(m=>m.tipo==="ingreso").reduce((s,m)=>s+m.monto,0);
      const egr = movsMes.filter(m=>m.tipo==="egreso").reduce((s,m)=>s+m.monto,0);
      return { ing, egr, neto:ing-egr };
    })();

    const cxc = cuentas.filter(c=>c.tipo==="cobrar");
    const cxp = cuentas.filter(c=>c.tipo==="pagar");
    const cxcVigente = cxc.filter(c=>c.estado==="vigente").reduce((s,c)=>s+c.monto,0);
    const cxcVencida = cxc.filter(c=>c.estado==="vencida").reduce((s,c)=>s+c.monto,0);
    const cxpVigente = cxp.filter(c=>c.estado==="vigente").reduce((s,c)=>s+c.monto,0);
    const cxpVencida = cxp.filter(c=>c.estado==="vencida").reduce((s,c)=>s+c.monto,0);

    // ─── COMPRAS DATA ───
    const ocs = compras.ocs || [];
    const recep = compras.recepciones || [];
    const evals = compras.evaluaciones || [];
    const ocsPend = ocs.filter(o=>o.estado==="pendiente");
    const ocsEnviadas = ocs.filter(o=>o.estado==="enviada"||o.estado==="parcial");
    const totalCompras = ocs.filter(o=>o.estado!=="cancelada").reduce((s,o)=>s+o.total,0);

    // ─── FLOTAS DATA ───
    const vehs = flotas.vehiculos || [];
    const partesKm = flotas.partesKm || [];
    const tanqueos = flotas.tanqueos || [];
    const docVehs = flotas.docVehs || [];
    const mantos = flotas.mantos || [];

    const vehsActivos = vehs.filter(v=>v.estado==="activo").length;
    const vehsTaller = vehs.filter(v=>v.estado==="taller").length;
    const docsVencidos = docVehs.filter(d=>d.fechaVence && d.fechaVence < hoy);
    const mantosVencidos = mantos.filter(m=>m.estado==="programado" && m.fechaProg && m.fechaProg < hoy);
    const pronto = new Date(); pronto.setDate(pronto.getDate()+30);
    const prontoStr = pronto.toISOString().split("T")[0];
    const docsPorVencer = docVehs.filter(d=>d.fechaVence && d.fechaVence >= hoy && d.fechaVence <= prontoStr);

    const gastoCombusMes = (() => {
      const d = new Date();
      const mes = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      return tanqueos.filter(t=>t.fecha?.startsWith(mes)).reduce((s,t)=>s+t.valorTotal,0);
    })();

    // ─── CRM DATA ───
    const deals = crm.deals || [];
    const ganados = deals.filter(d=>d.estado==="Ganada");
    const totalVentas = ganados.reduce((s,d)=>s+(d.presupuestoFinal||d.presupuesto||0),0);
    const enCurso = deals.filter(d=>["Contacto","Visita","Propuesta","Negociación"].includes(d.estado));
    const pipeline = enCurso.reduce((s,d)=>s+(d.presupuesto||0),0);

    // ─── PROYECTOS DATA ───
    const proy = getStore("habitaris_proy");
    const proyectos = proy["hab:proyectos:lista"] || [];
    const actividades = proy["hab:proyectos:actividades"] || [];
    const hitosP = proy["hab:proyectos:hitos"] || [];

    const proyActivos = proyectos.filter(p=>p.estado==="activo");
    const proyCompletados = proyectos.filter(p=>p.estado==="completado");
    const avancesProy = proyActivos.map(p => {
      const acts = actividades.filter(a=>a.proyectoId===p.id);
      const avg = acts.length > 0 ? acts.reduce((s,a)=>s+(a.avance||0),0)/acts.length : 0;
      return { id:p.id, nombre:p.nombre, avance:Math.round(avg), acts:acts.length, fin:p.fin };
    });
    const avancePromedio = avancesProy.length > 0 ? Math.round(avancesProy.reduce((s,p)=>s+p.avance,0)/avancesProy.length) : 0;
    const hitosCompletos = hitosP.filter(h=>h.completado).length;
    const hitosPendientes = hitosP.filter(h=>!h.completado).length;
    const proyRetrasados = avancesProy.filter(p => {
      if (!p.fin) return false;
      const diasRestantes = Math.round((new Date(p.fin) - new Date()) / 86400000);
      return diasRestantes < 0 || (diasRestantes < 30 && p.avance < 70);
    });

    // ─── FORMULARIOS / RESPUESTAS SIN PROCESAR ───
    const formStore = getStore("habitaris_formularios");
    const formsList = formStore.forms || [];
    const formResp = [];
    for (let i=0; i<localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("shared:hab:briefing:")) {
        try { formResp.push(JSON.parse(localStorage.getItem(key))); } catch {}
      }
    }
    const procesados = (() => { try { return JSON.parse(localStorage.getItem("hab:form:procesados")||"[]"); } catch { return []; } })();
    const sinProcesar = formResp.filter(r => !procesados.includes(r.id));
    // Group by module
    const sinProcesarPorModulo = {};
    sinProcesar.forEach(r => {
      const form = formsList.find(f => f.id === r.formularioId);
      const mod = form?.modulo || "general";
      if (!sinProcesarPorModulo[mod]) sinProcesarPorModulo[mod] = [];
      sinProcesarPorModulo[mod].push({ ...r, _formNombre: form?.nombre || r.formularioNombre || "Formulario" });
    });

    // ─── BUILD ALERTS ───
    const alertas = [];

    // Form response alerts per module
    Object.entries(sinProcesarPorModulo).forEach(([mod, resps]) => {
      const modLabel = mod === "crm" ? "CRM" : mod === "sst" ? "SST" : mod.charAt(0).toUpperCase()+mod.slice(1);
      alertas.push({ mod, sev:"alta", icon:"📋", msg:`${resps.length} formulario${resps.length>1?"s":""} sin asignar en ${modLabel}`, color:T.purple, isForm:true, count:resps.length });
    });
    if (cxcVencida > 0) alertas.push({ mod:"admin", sev:"alta", icon:"💰", msg:`${cxc.filter(c=>c.estado==="vencida").length} CxC vencidas por $${fmt(cxcVencida)}`, color:T.red });
    if (cxpVencida > 0) alertas.push({ mod:"admin", sev:"alta", icon:"💸", msg:`${cxp.filter(c=>c.estado==="vencida").length} CxP vencidas por $${fmt(cxpVencida)}`, color:T.red });
    if (tarjetaPend.length > 0) alertas.push({ mod:"admin", sev:"media", icon:"💳", msg:`${tarjetaPend.length} legalizaciones tarjeta pendientes ($${fmt(tarjetaPend.reduce((s,t)=>s+t.monto,0))})`, color:T.amber });
    if (viaticosPend.length > 0) alertas.push({ mod:"admin", sev:"media", icon:"✈️", msg:`${viaticosPend.length} solicitudes viáticos pendientes`, color:T.amber });
    if (flujoMes.neto < 0) alertas.push({ mod:"admin", sev:"alta", icon:"📉", msg:`Flujo caja negativo este mes: $${fmt(flujoMes.neto)}`, color:T.red });

    if (docsVencidos.length > 0) alertas.push({ mod:"flotas", sev:"alta", icon:"📋", msg:`${docsVencidos.length} documentos vehiculares vencidos`, color:T.red });
    if (docsPorVencer.length > 0) alertas.push({ mod:"flotas", sev:"media", icon:"📋", msg:`${docsPorVencer.length} documentos por vencer en 30 días`, color:T.amber });
    if (mantosVencidos.length > 0) alertas.push({ mod:"flotas", sev:"alta", icon:"🔧", msg:`${mantosVencidos.length} mantenimientos vencidos`, color:T.red });
    if (vehsTaller > 0) alertas.push({ mod:"flotas", sev:"baja", icon:"🚗", msg:`${vehsTaller} vehículos en taller`, color:T.blue });

    if (ocsPend.length > 0) alertas.push({ mod:"compras", sev:"media", icon:"📦", msg:`${ocsPend.length} OCs pendientes de aprobación ($${fmt(ocsPend.reduce((s,o)=>s+o.total,0))})`, color:T.amber });
    if (ocsEnviadas.length > 0) alertas.push({ mod:"compras", sev:"baja", icon:"🚚", msg:`${ocsEnviadas.length} OCs esperando recepción`, color:T.blue });

    if (proyRetrasados.length > 0) alertas.push({ mod:"proyectos", sev:"alta", icon:"📅", msg:`${proyRetrasados.length} proyecto${proyRetrasados.length>1?"s":""} con retraso: ${proyRetrasados.map(p=>p.nombre).join(", ")}`, color:T.red });
    if (hitosPendientes > 0) alertas.push({ mod:"proyectos", sev:"baja", icon:"🏁", msg:`${hitosPendientes} hito${hitosPendientes>1?"s":""} pendiente${hitosPendientes>1?"s":""}`, color:T.blue });

    return {
      admin: { saldoCajas, tarjetaPend:tarjetaPend.length, viaticosPend:viaticosPend.length, flujoMes, cxcVigente, cxcVencida, cxpVigente, cxpVencida },
      compras: { total:ocs.length, pendientes:ocsPend.length, totalCompras, recepciones:recep.length, evals:evals.length },
      flotas: { total:vehs.length, activos:vehsActivos, taller:vehsTaller, docsVencidos:docsVencidos.length, docsPorVencer:docsPorVencer.length, mantosVencidos:mantosVencidos.length, gastoCombustible:gastoCombusMes },
      crm: { deals:deals.length, ganados:ganados.length, totalVentas, pipeline, enCurso:enCurso.length },
      proyectos: { total:proyectos.length, activos:proyActivos.length, completados:proyCompletados.length, avancePromedio, actividades:actividades.length, hitosCompletos, hitosPendientes, retrasados:proyRetrasados.length, avancesProy },
      formularios: { total:formResp.length, sinProcesar:sinProcesar.length, sinProcesarPorModulo },
      alertas,
    };
  }, []);
}

/* ═══════════════════════════════════════════════════════════════
   MAIN DASHBOARD
   ═══════════════════════════════════════════════════════════════ */
export default function Dashboard() {
  const [modulo, setModulo] = useState("general");
  const D = useAllData();

  const alertasFilt = modulo==="general" ? D.alertas : D.alertas.filter(a=>a.mod===modulo);
  const alertasAltas = alertasFilt.filter(a=>a.sev==="alta");

  const KPI = ({icon,label,value,sub,color,trend}) => (
    <Card style={{padding:"14px 16px",minWidth:0}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <div style={{fontSize:8,fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>{icon} {label}</div>
          <div style={{fontSize:22,fontWeight:800,fontFamily:"'DM Mono',monospace",color:color||T.ink}}>{value}</div>
          {sub && <div style={{fontSize:9,color:T.inkMid,marginTop:2}}>{sub}</div>}
        </div>
        {trend && (
          <div style={{fontSize:9,fontWeight:700,color:trend>=0?T.green:T.red,display:"flex",alignItems:"center",gap:2}}>
            {trend>=0?<TrendingUp size={10}/>:<TrendingDown size={10}/>} {trend>=0?"+":""}{trend}%
          </div>
        )}
      </div>
    </Card>
  );

  /* ── GENERAL VIEW ── */
  const ViewGeneral = () => (
    <div className="fade-up">
      {/* Top KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        <KPI icon="💰" label="Ventas (ganadas)" value={`$${fmt(D.crm.totalVentas)}`} sub={`${D.crm.ganados} proyectos ganados`} color={T.green}/>
        <KPI icon="📊" label="Pipeline activo" value={`$${fmt(D.crm.pipeline)}`} sub={`${D.crm.enCurso} oportunidades`} color={T.blue}/>
        <KPI icon="📈" label="Flujo caja mes" value={`$${fmt(D.admin.flujoMes.neto)}`} sub={`Ing: $${fmt(D.admin.flujoMes.ing)} · Egr: $${fmt(D.admin.flujoMes.egr)}`} color={D.admin.flujoMes.neto>=0?T.green:T.red}/>
        <KPI icon="🛒" label="Compras activas" value={`$${fmt(D.compras.totalCompras)}`} sub={`${D.compras.total} OCs · ${D.compras.pendientes} pendientes`} color={T.ink}/>
      </div>

      {/* Second row */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        <KPI icon="📥" label="CxC vigentes" value={`$${fmt(D.admin.cxcVigente)}`} sub={D.admin.cxcVencida>0?`⚠ $${fmt(D.admin.cxcVencida)} vencidas`:""} color={T.blue}/>
        <KPI icon="📤" label="CxP vigentes" value={`$${fmt(D.admin.cxpVigente)}`} sub={D.admin.cxpVencida>0?`⚠ $${fmt(D.admin.cxpVencida)} vencidas`:""} color={T.red}/>
        <KPI icon="🚗" label="Flota" value={`${D.flotas.activos}/${D.flotas.total}`} sub={`${D.flotas.taller} en taller · $${fmt(D.flotas.gastoCombustible)} combustible/mes`} color={T.ink}/>
        <KPI icon="💰" label="Saldo cajas chicas" value={`$${fmt(D.admin.saldoCajas)}`} sub={`${D.admin.tarjetaPend} legaliz. pend.`} color={D.admin.saldoCajas>=0?T.green:T.red}/>
      </div>

      {/* Third row - Proyectos */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        <KPI icon="📅" label="Proyectos activos" value={D.proyectos.activos} sub={`${D.proyectos.total} total · ${D.proyectos.completados} completados`} color={T.ink}/>
        <KPI icon="📊" label="Avance promedio" value={`${D.proyectos.avancePromedio}%`} color={D.proyectos.avancePromedio>=70?T.green:D.proyectos.avancePromedio>=40?T.amber:T.red}/>
        <KPI icon="⚠️" label="Retrasados" value={D.proyectos.retrasados} color={D.proyectos.retrasados>0?T.red:T.green}/>
        <KPI icon="📋" label="Formularios sin asignar" value={D.formularios.sinProcesar} color={D.formularios.sinProcesar>0?T.purple:T.green} sub={D.formularios.sinProcesar>0?Object.entries(D.formularios.sinProcesarPorModulo).map(([m,r])=>`${m}: ${r.length}`).join(" · "):"Todo al día"}/>
      </div>

      {/* Form alerts banner */}
      {D.formularios.sinProcesar > 0 && (
        <Card style={{padding:"14px 18px",marginBottom:20,background:"#F3EEFF",border:"1px solid #5B3A8C33"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:40,height:40,borderRadius:"50%",background:"#5B3A8C",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:700,flexShrink:0}}>{D.formularios.sinProcesar}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700,color:"#5B3A8C"}}>📋 Formularios sin asignar</div>
              <div style={{fontSize:10,color:"#7A5AAA",marginTop:2}}>
                {Object.entries(D.formularios.sinProcesarPorModulo).map(([mod, resps]) => {
                  const modLabel = mod==="crm"?"CRM/Ofertas":mod==="sst"?"SST":mod.charAt(0).toUpperCase()+mod.slice(1);
                  return `${resps.length} en ${modLabel}`;
                }).join(" · ")}
                {" — "}Ve a <strong>Formularios → Respuestas</strong> para procesar
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );

  /* ── ADMIN VIEW ── */
  const ViewAdmin = () => (
    <div className="fade-up">
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        <KPI icon="💰" label="Saldo cajas chicas" value={`$${fmt(D.admin.saldoCajas)}`} color={D.admin.saldoCajas>=0?T.green:T.red}/>
        <KPI icon="💳" label="Legaliz. pendientes" value={D.admin.tarjetaPend} color={D.admin.tarjetaPend>0?T.amber:T.green}/>
        <KPI icon="✈️" label="Viáticos pendientes" value={D.admin.viaticosPend} color={D.admin.viaticosPend>0?T.amber:T.green}/>
        <KPI icon="📈" label="Flujo neto mes" value={`$${fmt(D.admin.flujoMes.neto)}`} color={D.admin.flujoMes.neto>=0?T.green:T.red}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        <KPI icon="📥" label="CxC vigentes" value={`$${fmt(D.admin.cxcVigente)}`} color={T.blue}/>
        <KPI icon="🚨" label="CxC vencidas" value={`$${fmt(D.admin.cxcVencida)}`} color={D.admin.cxcVencida>0?T.red:T.green}/>
        <KPI icon="📤" label="CxP vigentes" value={`$${fmt(D.admin.cxpVigente)}`} color={T.amber}/>
        <KPI icon="🚨" label="CxP vencidas" value={`$${fmt(D.admin.cxpVencida)}`} color={D.admin.cxpVencida>0?T.red:T.green}/>
      </div>
    </div>
  );

  /* ── COMPRAS VIEW ── */
  const ViewCompras = () => (
    <div className="fade-up">
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        <KPI icon="📦" label="Total OCs" value={D.compras.total} color={T.ink}/>
        <KPI icon="⏳" label="OCs pendientes" value={D.compras.pendientes} color={D.compras.pendientes>0?T.amber:T.green}/>
        <KPI icon="💰" label="Valor compras" value={`$${fmt(D.compras.totalCompras)}`} color={T.ink}/>
        <KPI icon="📥" label="Recepciones" value={D.compras.recepciones} color={T.blue}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:12,marginBottom:20}}>
        <KPI icon="⭐" label="Evaluaciones proveedores" value={D.compras.evals} color={T.ink}/>
        <Card style={{padding:"14px 16px"}}>
          <div style={{fontSize:8,fontWeight:700,color:"#888",textTransform:"uppercase",marginBottom:4}}>📊 Tasa de recepción</div>
          <div style={{fontSize:22,fontWeight:800,fontFamily:"'DM Mono',monospace",color:T.green}}>
            {D.compras.total>0 ? Math.round(D.compras.recepciones/D.compras.total*100) : 0}%
          </div>
        </Card>
      </div>
    </div>
  );

  /* ── FLOTAS VIEW ── */
  const ViewFlotas = () => (
    <div className="fade-up">
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        <KPI icon="🚗" label="Total vehículos" value={D.flotas.total} sub={`${D.flotas.activos} activos`} color={T.ink}/>
        <KPI icon="🔧" label="En taller" value={D.flotas.taller} color={D.flotas.taller>0?T.amber:T.green}/>
        <KPI icon="⛽" label="Combustible mes" value={`$${fmt(D.flotas.gastoCombustible)}`} color={T.red}/>
        <KPI icon="📋" label="Docs vencidos" value={D.flotas.docsVencidos} sub={`${D.flotas.docsPorVencer} por vencer`} color={D.flotas.docsVencidos>0?T.red:T.green}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:12,marginBottom:20}}>
        <KPI icon="🔧" label="Mantenimientos vencidos" value={D.flotas.mantosVencidos} color={D.flotas.mantosVencidos>0?T.red:T.green}/>
        <KPI icon="📋" label="Docs por vencer (30d)" value={D.flotas.docsPorVencer} color={D.flotas.docsPorVencer>0?T.amber:T.green}/>
      </div>
    </div>
  );

  /* ── RRHH VIEW ── */
  const ViewRRHH = () => (
    <div className="fade-up">
      <Card style={{padding:20,textAlign:"center",color:T.inkMid}}>
        <Users size={32} style={{opacity:.2,marginBottom:8}}/>
        <p style={{fontSize:12}}>Los KPIs de RRHH se alimentan del módulo de RRHH.</p>
        <p style={{fontSize:10,color:T.inkXLight}}>Viáticos pendientes: {D.admin.viaticosPend}</p>
      </Card>
    </div>
  );

  /* ── CRM VIEW ── */
  const ViewCRM = () => (
    <div className="fade-up">
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        <KPI icon="📋" label="Total ofertas" value={D.crm.deals} color={T.ink}/>
        <KPI icon="🏆" label="Ganadas" value={D.crm.ganados} color={T.green}/>
        <KPI icon="💰" label="Ventas totales" value={`$${fmt(D.crm.totalVentas)}`} color={T.green}/>
        <KPI icon="📊" label="Pipeline" value={`$${fmt(D.crm.pipeline)}`} sub={`${D.crm.enCurso} activas`} color={T.blue}/>
      </div>
    </div>
  );

  /* ── PROYECTOS VIEW ── */
  const ViewProyectos = () => (
    <div className="fade-up">
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        <KPI icon="📅" label="Total proyectos" value={D.proyectos.total} sub={`${D.proyectos.activos} activos · ${D.proyectos.completados} completados`} color={T.ink}/>
        <KPI icon="📊" label="Avance promedio" value={`${D.proyectos.avancePromedio}%`} color={D.proyectos.avancePromedio>=70?T.green:D.proyectos.avancePromedio>=40?T.amber:T.red}/>
        <KPI icon="⚠️" label="Retrasados" value={D.proyectos.retrasados} color={D.proyectos.retrasados>0?T.red:T.green}/>
        <KPI icon="🏁" label="Hitos" value={`${D.proyectos.hitosCompletos}/${D.proyectos.hitosCompletos+D.proyectos.hitosPendientes}`} sub={`${D.proyectos.hitosPendientes} pendientes`} color={T.blue}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:12,marginBottom:20}}>
        <KPI icon="📋" label="Actividades totales" value={D.proyectos.actividades} color={T.ink}/>
        <Card style={{padding:"14px 16px"}}>
          <div style={{fontSize:8,fontWeight:700,color:"#888",textTransform:"uppercase",marginBottom:4}}>📊 Tasa de completitud</div>
          <div style={{fontSize:22,fontWeight:800,fontFamily:"'DM Mono',monospace",color:T.green}}>
            {D.proyectos.total>0 ? Math.round(D.proyectos.completados/D.proyectos.total*100) : 0}%
          </div>
        </Card>
      </div>

      {/* Project progress bars */}
      {(D.proyectos.avancesProy||[]).length > 0 && (
        <Card style={{marginBottom:16}}>
          <div style={{fontSize:10,fontWeight:700,marginBottom:10}}>📅 Avance por proyecto activo</div>
          {D.proyectos.avancesProy.map(p => (
            <div key={p.id} style={{marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                <span style={{fontSize:10,fontWeight:600}}>{p.nombre}</span>
                <span style={{fontSize:10,fontFamily:"'DM Mono',monospace",fontWeight:700,color:p.avance>=70?T.green:p.avance>=40?T.amber:T.red}}>{p.avance}%</span>
              </div>
              <div style={{height:8,background:T.accent,borderRadius:4,overflow:"hidden"}}>
                <div style={{width:`${p.avance}%`,height:"100%",borderRadius:4,background:p.avance>=70?T.green:p.avance>=40?T.amber:T.red,transition:"width .3s"}}/>
              </div>
              <div style={{fontSize:8,color:T.inkLight,marginTop:2}}>{p.acts} actividades · Fin: {p.fin||"—"}</div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );

  const VIEWS = { general:ViewGeneral, admin:ViewAdmin, compras:ViewCompras, flotas:ViewFlotas, rrhh:ViewRRHH, crm:ViewCRM, proyectos:ViewProyectos };
  const ViewComp = VIEWS[modulo] || ViewGeneral;

  return (
    <>
      <Fonts/>
      <div style={{padding:"30px 36px",maxWidth:1400,margin:"0 auto"}}>
        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <div>
            <div style={{fontSize:22,fontWeight:800,letterSpacing:1}}>📊 Dashboard</div>
            <div style={{fontSize:10,color:T.inkMid}}>Vista consolidada de la empresa · {new Date().toLocaleDateString("es-CO",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</div>
          </div>
        </div>

        {/* Module filter */}
        <div style={{display:"flex",gap:0,marginBottom:20}}>
          {MODULOS.map((m,i) => (
            <button key={m.id} onClick={()=>setModulo(m.id)}
              style={{padding:"10px 18px",fontSize:11,fontWeight:600,cursor:"pointer",
                border:`1px solid ${T.border}`,borderLeft:i>0?"none":undefined,
                fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap",
                borderRadius:i===0?"6px 0 0 6px":i===MODULOS.length-1?"0 6px 6px 0":"0",
                background:modulo===m.id?m.color:"#fff",
                color:modulo===m.id?"#fff":T.inkMid}}>
              {m.lbl}
            </button>
          ))}
        </div>

        {/* Module-specific view */}
        <ViewComp/>

        {/* ALERTS SECTION */}
        {alertasFilt.length > 0 && (
          <div style={{marginBottom:20}}>
            <div style={{fontSize:12,fontWeight:700,marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
              <AlertTriangle size={14} color={alertasAltas.length>0?T.red:T.amber}/>
              Alertas {modulo!=="general" && `— ${MODULOS.find(m=>m.id===modulo)?.lbl||""}`}
              <Badge color={alertasAltas.length>0?T.red:T.amber}>{alertasFilt.length}</Badge>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {alertasFilt.sort((a,b)=>{const p={alta:0,media:1,baja:2};return (p[a.sev]||2)-(p[b.sev]||2);}).map((a,i) => (
                <div key={i} style={{
                  background:a.sev==="alta"?T.redBg:a.sev==="media"?T.amberBg:T.blueBg,
                  border:`1px solid ${a.color}33`,borderRadius:6,padding:"8px 14px",
                  display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:16}}>{a.icon}</span>
                  <div style={{flex:1,fontSize:10,fontWeight:600,color:a.color}}>{a.msg}</div>
                  <Badge color={a.color}>{a.sev}</Badge>
                  {modulo==="general" && <Badge color={T.inkLight}>{a.mod}</Badge>}
                </div>
              ))}
            </div>
          </div>
        )}

        {alertasFilt.length === 0 && (
          <Card style={{textAlign:"center",padding:20,color:T.green,marginBottom:20}}>
            <div style={{fontSize:16,marginBottom:4}}>✅</div>
            <div style={{fontSize:12,fontWeight:700}}>Sin alertas activas</div>
            <div style={{fontSize:10,color:T.inkMid}}>Todo en orden</div>
          </Card>
        )}

        {/* FLUJO CAJA RESUMEN (only on general & admin) */}
        {(modulo==="general" || modulo==="admin") && (
          <Card style={{marginBottom:20}}>
            <div style={{fontSize:12,fontWeight:700,marginBottom:12}}>📈 Flujo de caja empresa — Mes actual</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:8,fontWeight:700,color:"#888",textTransform:"uppercase"}}>⬆ Ingresos</div>
                <div style={{fontSize:20,fontWeight:800,fontFamily:"'DM Mono',monospace",color:T.green}}>${fmt(D.admin.flujoMes.ing)}</div>
              </div>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:8,fontWeight:700,color:"#888",textTransform:"uppercase"}}>⬇ Egresos</div>
                <div style={{fontSize:20,fontWeight:800,fontFamily:"'DM Mono',monospace",color:T.red}}>${fmt(D.admin.flujoMes.egr)}</div>
              </div>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:8,fontWeight:700,color:"#888",textTransform:"uppercase"}}>📊 Neto</div>
                <div style={{fontSize:20,fontWeight:800,fontFamily:"'DM Mono',monospace",color:D.admin.flujoMes.neto>=0?T.green:T.red}}>${fmt(D.admin.flujoMes.neto)}</div>
              </div>
            </div>
            {/* Visual bar */}
            <div style={{marginTop:12,height:16,background:T.accent,borderRadius:8,overflow:"hidden",display:"flex"}}>
              {D.admin.flujoMes.ing > 0 && (
                <div style={{width:`${D.admin.flujoMes.ing/(D.admin.flujoMes.ing+D.admin.flujoMes.egr)*100}%`,background:T.green,borderRadius:"8px 0 0 8px",height:"100%",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <span style={{fontSize:7,color:"#fff",fontWeight:700}}>Ingresos</span>
                </div>
              )}
              {D.admin.flujoMes.egr > 0 && (
                <div style={{width:`${D.admin.flujoMes.egr/(D.admin.flujoMes.ing+D.admin.flujoMes.egr)*100}%`,background:T.red,borderRadius:"0 8px 8px 0",height:"100%",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <span style={{fontSize:7,color:"#fff",fontWeight:700}}>Egresos</span>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Footer */}
        <div style={{textAlign:"center",padding:"10px 0",fontSize:9,color:T.inkXLight}}>
          Habitaris Suite · Dashboard actualizado en tiempo real desde localStorage
        </div>
      </div>
    </>
  );
}
