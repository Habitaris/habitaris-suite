import React, { useState, useEffect, useCallback, useMemo } from "react";
import { store } from "../core/store.js";

import { getTenantDefaultsSync } from "../core/configHelpers.js";
import {
  ClipboardCheck, Plus, Trash2, Check, X, Search, AlertTriangle, CheckCircle,
  Clock, Eye, FileText, ChevronRight, ChevronDown, Camera, Star, BarChart2,
  Target, Shield, Layers, Edit3, Download, Filter, Flag
} from "lucide-react";

/* ─── STYLES ─── */
const Fonts = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=DM Sans:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'DM Sans',sans-serif;background:#F5F4F1;-webkit-font-smoothing:antialiased}
    ::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-thumb{background:#C8C5BE;border-radius:2px}
    input,select,textarea{font-family:'DM Sans',sans-serif;outline:none}
    button{font-family:'DM Sans',sans-serif;cursor:pointer}
    @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
    .fade-up{animation:fadeUp .22s ease both}
  `}</style>
);

/* ─── TOKENS ─── */
const T = {
  bg:"#F5F4F1", surface:"#FFFFFF", surfaceAlt:"#FFFFFF", ink:"#111", inkMid:"#555",
  inkLight:"#909090", inkXLight:"#C8C5BE", border:"#E0E0E0", accent:"#EDEBE7",
  green:"#111111", greenBg:"#E8F4EE", red:"#B91C1C", redBg:"#FAE8E8",
  amber:"#8C6A00", amberBg:"#FAF0E0", blue:"#3B3B3B", blueBg:"#F0F0F0",
  purple:"#5B3A8C", purpleBg:"#F0ECF6", teal:"#0D5E6E", tealBg:"#E0F4F4",
  shadow:"0 1px 3px rgba(0,0,0,.06),0 4px 16px rgba(0,0,0,.05)",
};

/* ─── UTILS ─── */
const uid = () => Math.random().toString(36).slice(2, 9);
const today = () => new Date().toISOString().split("T")[0];
const now = () => new Date().toISOString();
const fmtD = (d) => d ? new Date(d+"T12:00:00").toLocaleDateString(getTenantDefaultsSync().locale,{day:"2-digit",month:"short",year:"numeric"}) : "—";
const ago = (iso) => { if(!iso) return ""; const ms=Date.now()-new Date(iso).getTime(); const h=Math.floor(ms/3600000); if(h<1) return "hace momentos"; if(h<24) return `hace ${h}h`; return `hace ${Math.floor(h/24)}d`; };
const pct = (n) => Math.min(100, Math.max(0, Math.round(n||0)));

/* ─── STORAGE HOOK ─── */
function useStore(key, init) {
  const [data, setData] = useState(init);
  useEffect(() => { (() => { try { const r = store.getSync(key); if (r?.value) setData(JSON.parse(r)); } catch {} })(); }, [key]);
  const save = useCallback(async (v) => { const val = typeof v === "function" ? v(data) : v; setData(val); try { store.set(key, JSON.stringify(val)); } catch {} }, [key, data]);
  return [data, save];
}

/* ─── UI PRIMITIVES ─── */
const Card = ({ children, style }) => <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:8, boxShadow:T.shadow, ...style }}>{children}</div>;
const Btn = ({ children, v, sm, on, style, ...p }) => (
  <button onClick={on} style={{ display:"inline-flex", alignItems:"center", gap:5,
    padding:sm?"5px 10px":"8px 16px", fontSize:sm?10:11, fontWeight:600,
    border:v==="sec"?`1px solid ${T.border}`:"none", borderRadius:5, cursor:"pointer",
    background:v==="sec"?"#fff":v==="danger"?T.redBg:T.ink,
    color:v==="sec"?T.inkMid:v==="danger"?T.red:"#fff", ...style }} {...p}>{children}</button>
);
const Badge = ({ label, color, bg }) => (
  <span style={{ display:"inline-flex", alignItems:"center", gap:3, padding:"2px 7px", borderRadius:3,
    background:bg, color, fontSize:9, fontWeight:700 }}>{label}</span>
);

/* ─── CONSTANTS ─── */
const TABS = [
  { id:"dashboard",    lbl:"Dashboard",          I:BarChart2,      desc:"Indicadores generales de calidad" },
  { id:"nc",           lbl:"No conformidades",   I:AlertTriangle,  desc:"Registro y gestión de no conformidades" },
  { id:"auditorias",   lbl:"Auditorías",         I:ClipboardCheck, desc:"Auditorías internas y externas programadas" },
  { id:"protocolos",   lbl:"Protocolos",         I:FileText,       desc:"Protocolos de ensayo, pruebas y recepción" },
  { id:"checklists",   lbl:"Listas de chequeo",  I:Check,          desc:"Listas de verificación por actividad" },
  { id:"entregas",     lbl:"Actas de entrega",   I:Layers,         desc:"Actas parciales y finales de obra" },
  { id:"indicadores",  lbl:"Indicadores KPI",    I:Target,         desc:"Métricas y metas de calidad" },
];

const SEVERIDAD_NC = [
  { id:"menor",    lbl:"Menor",    color:T.amber, bg:T.amberBg },
  { id:"mayor",    lbl:"Mayor",    color:"#D4840A", bg:"#FFF3E0" },
  { id:"critica",  lbl:"Crítica",  color:T.red,   bg:T.redBg },
];

const CATEGORIAS_NC = [
  "Materiales fuera de especificación", "Dimensiones fuera de tolerancia", "Acabado defectuoso",
  "Instalación incorrecta", "Falta de planeidad", "Fisuras o grietas", "Humedad o filtración",
  "Incumplimiento de planos", "Incumplimiento de norma", "Falta de documentación", "Otro"
];

const TIPO_AUDITORIA = ["Interna", "Externa", "Seguimiento", "Pre-entrega", "Recepción materiales"];

const PROTOCOLOS_TIPO = [
  "Ensayo de resistencia (concreto)", "Prueba hidrostática", "Prueba de estanqueidad",
  "Verificación de niveles", "Prueba de aislamiento eléctrico", "Ensayo de compactación",
  "Verificación de planeidad", "Prueba de carga", "Inspección visual de soldadura",
  "Prueba de adherencia (pintura)", "Otro"
];

/* ═══════════════════════════════════════════════
   MAIN MODULE
═══════════════════════════════════════════════ */
export default function HabitarisCalidad() {
  const [tab, setTab] = useState("dashboard");
  const [ncs, saveNcs]             = useStore("hab:calidad:nc", []);
  const [auditorias, saveAud]      = useStore("hab:calidad:auditorias", []);
  const [protocolos, saveProt]     = useStore("hab:calidad:protocolos", []);
  const [checklists, saveCheck]    = useStore("hab:calidad:checklists", []);
  const [entregas, saveEntregas]   = useStore("hab:calidad:entregas", []);
  const [indicadores, saveKpi]     = useStore("hab:calidad:indicadores", [
    { id:uid(), nombre:"Tasa de NC por actividad", meta:5, actual:3.2, unidad:"%", periodo:"mensual" },
    { id:uid(), nombre:"NC cerradas en plazo", meta:90, actual:78, unidad:"%", periodo:"mensual" },
    { id:uid(), nombre:"Auditorías realizadas", meta:4, actual:2, unidad:"ud", periodo:"trimestral" },
    { id:uid(), nombre:"Satisfacción cliente", meta:4.5, actual:4.2, unidad:"/5", periodo:"por proyecto" },
    { id:uid(), nombre:"Reprocesos", meta:2, actual:1, unidad:"%", periodo:"mensual" },
  ]);

  const inp = { border:`1px solid ${T.border}`, borderRadius:4, padding:"6px 10px", fontSize:12, background:"#fff" };

  // Stats
  const ncAbiertas = ncs.filter(n => n.estado === "abierta" || n.estado === "en_proceso").length;
  const ncCerradas = ncs.filter(n => n.estado === "cerrada").length;
  const audPendientes = auditorias.filter(a => a.estado === "programada").length;
  const ncCriticas = ncs.filter(n => n.severidad === "critica" && n.estado !== "cerrada").length;

  return (
    <>
      <Fonts/>
      <div style={{ height:"100vh", display:"flex", flexDirection:"column", background:T.bg, overflow:"hidden" }}>
        {/* HEADER */}
        <div style={{ background:T.surface, borderBottom:`1px solid ${T.border}`, padding:"11px 28px",
          display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100 }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <svg width={26} height={26} viewBox="0 0 34 34" fill="none">
              <rect x="2.5" y="4.5" width="25" height="25" stroke={T.ink} strokeWidth="1.2"/>
              <rect x="7.5" y="10" width="4" height="13" fill={T.ink}/>
              <rect x="7.5" y="15.5" width="13" height="3" fill={T.ink}/>
              <rect x="16.5" y="10" width="4" height="13" fill={T.ink}/>
            </svg>
            <div>
              <span style={{ fontSize:13, fontWeight:800, letterSpacing:3.5, textTransform:"uppercase" }}>HABITARIS</span>
              <span style={{ fontSize:11, color:T.inkLight, marginLeft:10 }}>/ Calidad y Auditoría</span>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            {ncCriticas > 0 && (
              <div style={{ background:T.redBg, border:`1px solid ${T.red}33`, borderRadius:4, padding:"5px 10px", display:"flex", alignItems:"center", gap:5, cursor:"pointer" }}
                onClick={() => setTab("nc")}>
                <AlertTriangle size={12} color={T.red}/>
                <span style={{ fontSize:10, fontWeight:700, color:T.red }}>{ncCriticas} NC crítica{ncCriticas!==1?"s":""}</span>
              </div>
            )}
            {audPendientes > 0 && (
              <div style={{ background:T.blueBg, border:`1px solid ${T.blue}33`, borderRadius:4, padding:"5px 10px", display:"flex", alignItems:"center", gap:5, cursor:"pointer" }}
                onClick={() => setTab("auditorias")}>
                <ClipboardCheck size={12} color={T.blue}/>
                <span style={{ fontSize:10, fontWeight:700, color:T.blue }}>{audPendientes} auditoría{audPendientes!==1?"s":""} pendiente{audPendientes!==1?"s":""}</span>
              </div>
            )}
          </div>
        </div>

        {/* LAYOUT */}
        <div style={{ display:"flex", flex:1, minHeight:0 }}>
          {/* Sidebar */}
          <div style={{ width:210, flexShrink:0, background:T.surface, borderRight:`1px solid ${T.border}`,
            display:"flex", flexDirection:"column", paddingTop:8, overflowY:"auto" }}>
            {TABS.map(t => {
              const act = tab === t.id;
              const badge = t.id==="nc" ? ncAbiertas : t.id==="auditorias" ? audPendientes : 0;
              return (
                <button key={t.id} onClick={() => setTab(t.id)} style={{
                  display:"flex", alignItems:"center", gap:9, padding:"10px 16px", border:"none",
                  borderLeft:act?`3px solid ${T.ink}`:"3px solid transparent",
                  background:act?T.accent:"transparent", color:act?T.ink:T.inkLight,
                  fontSize:12, fontWeight:act?700:400, cursor:"pointer", textAlign:"left", width:"100%" }}>
                  <t.I size={13}/> <span style={{ flex:1, lineHeight:1.2 }}>{t.lbl}</span>
                  {badge > 0 && <span style={{ background:t.id==="nc"?T.red:T.amber, color:"#fff", fontSize:8, fontWeight:800, padding:"1px 5px", borderRadius:8 }}>{badge}</span>}
                </button>
              );
            })}
            <div style={{ flex:1 }}/>
            <div style={{ padding:"10px 16px", fontSize:9, color:T.inkXLight, letterSpacing:0.8, borderTop:`1px solid ${T.border}` }}>
              Auto-guardado activo
            </div>
          </div>

          {/* Content */}
          <div style={{ flex:1, overflowY:"auto", paddingBottom:40 }}>
            <div style={{ padding:"24px 28px", maxWidth:1100 }}>
              <div style={{ marginBottom:18 }}>
                <h2 style={{ fontSize:19, fontWeight:700, color:T.ink, letterSpacing:-.2 }}>{TABS.find(t=>t.id===tab)?.lbl}</h2>
                <p style={{ fontSize:11, color:T.inkLight, marginTop:2 }}>{TABS.find(t=>t.id===tab)?.desc}</p>
              </div>

              {tab === "dashboard" && <TabDashboard ncs={ncs} auditorias={auditorias} indicadores={indicadores} ncAbiertas={ncAbiertas} ncCerradas={ncCerradas} audPendientes={audPendientes} ncCriticas={ncCriticas} setTab={setTab}/>}
              {tab === "nc" && <TabNC ncs={ncs} saveNcs={saveNcs} inp={inp}/>}
              {tab === "auditorias" && <TabAuditorias auditorias={auditorias} saveAud={saveAud} inp={inp}/>}
              {tab === "protocolos" && <TabProtocolos protocolos={protocolos} saveProt={saveProt} inp={inp}/>}
              {tab === "checklists" && <TabChecklists checklists={checklists} saveCheck={saveCheck} inp={inp}/>}
              {tab === "entregas" && <TabEntregas entregas={entregas} saveEntregas={saveEntregas} inp={inp}/>}
              {tab === "indicadores" && <TabKPI indicadores={indicadores} saveKpi={saveKpi} inp={inp}/>}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ═══ DASHBOARD ═══ */
function TabDashboard({ ncs, auditorias, indicadores, ncAbiertas, ncCerradas, audPendientes, ncCriticas, setTab }) {
  const totalNC = ncs.length;
  const tasaCierre = totalNC > 0 ? Math.round((ncCerradas / totalNC) * 100) : 100;

  return (
    <div className="fade-up">
      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5, 1fr)", gap:12, marginBottom:20 }}>
        {[
          { lbl:"NC abiertas", val:ncAbiertas, color:T.red, bg:T.redBg },
          { lbl:"NC críticas", val:ncCriticas, color:ncCriticas>0?T.red:T.green, bg:ncCriticas>0?T.redBg:T.greenBg },
          { lbl:"Tasa de cierre", val:`${tasaCierre}%`, color:tasaCierre>=80?T.green:T.amber, bg:tasaCierre>=80?T.greenBg:T.amberBg },
          { lbl:"Auditorías pend.", val:audPendientes, color:T.blue, bg:T.blueBg },
          { lbl:"Total NC", val:totalNC, color:T.inkMid, bg:T.surfaceAlt },
        ].map(k => (
          <Card key={k.lbl} style={{ padding:"14px 16px" }}>
            <div style={{ fontSize:8, fontWeight:700, color:T.inkLight, textTransform:"uppercase", letterSpacing:1 }}>{k.lbl}</div>
            <div style={{ fontSize:26, fontWeight:800, color:k.color, marginTop:4 }}>{k.val}</div>
          </Card>
        ))}
      </div>

      {/* Calidad score */}
      <Card style={{ padding:20, marginBottom:16, textAlign:"center",
        background: tasaCierre >= 80 && ncCriticas === 0 ? T.greenBg : ncCriticas > 0 ? T.redBg : T.amberBg,
        border:`1px solid ${tasaCierre >= 80 && ncCriticas === 0 ? T.green : ncCriticas > 0 ? T.red : T.amber}33` }}>
        <div style={{ fontSize:40, fontWeight:800, color: tasaCierre >= 80 && ncCriticas === 0 ? T.green : ncCriticas > 0 ? T.red : T.amber }}>
          {tasaCierre >= 80 && ncCriticas === 0 ? "✅" : ncCriticas > 0 ? "⚠️" : "🔶"} {tasaCierre}%
        </div>
        <div style={{ fontSize:14, fontWeight:700, color:T.ink, marginTop:4 }}>Índice de conformidad</div>
        <div style={{ fontSize:11, color:T.inkMid }}>
          {ncCriticas > 0 ? `${ncCriticas} no conformidad(es) crítica(s) requieren atención inmediata` :
           ncAbiertas > 0 ? `${ncAbiertas} NC abiertas pendientes de resolución` :
           "Sistema de calidad sin hallazgos abiertos"}
        </div>
      </Card>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        {/* NC recientes */}
        <Card style={{ padding:0, overflow:"hidden" }}>
          <div style={{ padding:"12px 16px", background:T.redBg, borderBottom:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontSize:12, fontWeight:700, color:T.red }}>NC recientes</span>
            <button onClick={() => setTab("nc")} style={{ background:"none", border:"none", fontSize:9, color:T.red, fontWeight:600, cursor:"pointer" }}>Ver todas →</button>
          </div>
          {ncs.length === 0 ? (
            <div style={{ padding:20, textAlign:"center", color:T.inkLight, fontSize:11 }}>Sin no conformidades 🎉</div>
          ) : [...ncs].sort((a,b)=>b.fecha>a.fecha?1:-1).slice(0,5).map(n => {
            const sev = SEVERIDAD_NC.find(s => s.id === n.severidad) || SEVERIDAD_NC[0];
            return (
              <div key={n.id} style={{ padding:"8px 16px", borderBottom:"1px solid #F5F5F5", display:"flex", alignItems:"center", gap:8, fontSize:10 }}>
                <Badge label={sev.lbl} color={sev.color} bg={sev.bg}/>
                <span style={{ flex:1, fontWeight:500 }}>{n.descripcion?.slice(0,50)||"Sin descripción"}</span>
                <Badge label={n.estado} color={n.estado==="cerrada"?T.green:T.amber} bg={n.estado==="cerrada"?T.greenBg:T.amberBg}/>
              </div>
            );
          })}
        </Card>

        {/* KPIs */}
        <Card style={{ padding:0, overflow:"hidden" }}>
          <div style={{ padding:"12px 16px", background:T.blueBg, borderBottom:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontSize:12, fontWeight:700, color:T.blue }}>Indicadores clave</span>
            <button onClick={() => setTab("indicadores")} style={{ background:"none", border:"none", fontSize:9, color:T.blue, fontWeight:600, cursor:"pointer" }}>Configurar →</button>
          </div>
          {indicadores.slice(0, 5).map(k => {
            const cumple = k.unidad === "%" ? k.actual <= k.meta : k.actual >= k.meta;
            const ratio = k.meta > 0 ? Math.min((k.actual / k.meta) * 100, 100) : 0;
            return (
              <div key={k.id} style={{ padding:"8px 16px", borderBottom:"1px solid #F5F5F5" }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, marginBottom:3 }}>
                  <span style={{ fontWeight:600 }}>{k.nombre}</span>
                  <span style={{ fontFamily:"'DM Mono',monospace", fontWeight:700, color:cumple?T.green:T.amber }}>
                    {k.actual}{k.unidad} / {k.meta}{k.unidad}
                  </span>
                </div>
                <div style={{ height:4, background:T.border, borderRadius:2, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${ratio}%`, background:cumple?T.green:T.amber, borderRadius:2, transition:"width .3s" }}/>
                </div>
              </div>
            );
          })}
        </Card>
      </div>

      {/* Empty state with demo */}
      {ncs.length === 0 && auditorias.length === 0 && (
        <Card style={{ padding:24, textAlign:"center", marginTop:16 }}>
          <ClipboardCheck size={32} style={{ color:T.inkLight, opacity:0.3, marginBottom:8 }}/>
          <div style={{ fontSize:13, fontWeight:600, color:T.inkMid, marginBottom:12 }}>Sin datos de calidad aún</div>
          <Btn on={() => {
            // Demo NCs
            const demoNCs = [
              { id:uid(), fecha:now(), numero:"NC-001", proyecto:"Torre Norte Apto 301", ubicacion:"Baño principal", categoria:"Fisuras o grietas", severidad:"mayor", descripcion:"Fisura longitudinal en pañete de muro, longitud aprox 1.2m. Zona húmeda del baño principal.", estado:"abierta", responsable:"Residente", accionCorrectiva:"", fechaLimite:(() => { const d=new Date(); d.setDate(d.getDate()+7); return d.toISOString().split("T")[0]; })(), evidencias:"Foto tomada", seguimiento:[] },
              { id:uid(), fecha:now(), numero:"NC-002", proyecto:"Torre Norte Apto 301", ubicacion:"Cocina", categoria:"Dimensiones fuera de tolerancia", severidad:"menor", descripcion:"Mesón de cocina 2cm más corto de lo especificado en plano. No afecta funcionalidad.", estado:"en_proceso", responsable:"Contratista carpintería", accionCorrectiva:"Se ajustará la pieza en la próxima visita", fechaLimite:(() => { const d=new Date(); d.setDate(d.getDate()+5); return d.toISOString().split("T")[0]; })(), evidencias:"", seguimiento:[{fecha:now(), nota:"Se contactó al proveedor para rehacer pieza", por:"Residente"}] },
              { id:uid(), fecha:now(), numero:"NC-003", proyecto:"Oficinas Chicó", ubicacion:"Piso 4 - Zona abierta", categoria:"Acabado defectuoso", severidad:"critica", descripcion:"Porcelanato presenta manchas de óxido en 15m² de la zona abierta. Material de lote defectuoso.", estado:"abierta", responsable:"Proveedor Cerámicas", accionCorrectiva:"", fechaLimite:today(), evidencias:"Fotos y video", seguimiento:[] },
              { id:uid(), fecha:now(), numero:"NC-004", proyecto:"Casa Campestre Chía", ubicacion:"Cubierta", categoria:"Humedad o filtración", severidad:"mayor", descripcion:"Filtración en unión de cubierta con muro fachada norte. Se evidencia humedad en cielo raso.", estado:"cerrada", responsable:"Impermeabilizador", accionCorrectiva:"Se reselló junta con membrana asfáltica y se verificó estanqueidad", fechaLimite:today(), evidencias:"Antes/después", seguimiento:[{fecha:now(),nota:"Reparación ejecutada",por:"Residente"},{fecha:now(),nota:"Prueba de estanqueidad OK, se cierra NC",por:"Director"}] },
            ];
            saveNcs(demoNCs);
            // Demo auditorías
            const demoAud = [
              { id:uid(), fecha:today(), tipo:"Interna", proyecto:"Torre Norte", auditor:"David Parra", alcance:"Revisión acabados pisos 1-3", estado:"programada", hallazgos:"", calificacion:0 },
              { id:uid(), fecha:(() => { const d=new Date(); d.setDate(d.getDate()-7); return d.toISOString().split("T")[0]; })(), tipo:"Pre-entrega", proyecto:"Casa Campestre Chía", auditor:"Ana María Díaz", alcance:"Verificación general pre-entrega al cliente", estado:"realizada", hallazgos:"3 hallazgos menores en acabados de pintura", calificacion:85 },
            ];
            saveAud(demoAud);
          }}>
            <Plus size={12}/> Crear datos de ejemplo
          </Btn>
        </Card>
      )}
    </div>
  );
}

/* ═══ NO CONFORMIDADES ═══ */
function TabNC({ ncs, saveNcs, inp }) {
  const [filtro, setFiltro] = useState("todos");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null);

  const addNC = () => {
    const n = { id:uid(), fecha:now(), numero:`NC-${String(ncs.length+1).padStart(3,"0")}`,
      proyecto:"", ubicacion:"", categoria:"Otro", severidad:"menor", descripcion:"",
      estado:"abierta", responsable:"", accionCorrectiva:"", fechaLimite:"",
      evidencias:"", seguimiento:[] };
    saveNcs(prev => [...prev, n]);
    setExpanded(n.id);
  };

  const updNC = (id, k, v) => saveNcs(prev => prev.map(n => n.id === id ? { ...n, [k]: v } : n));

  const addSeguimiento = (ncId, nota) => {
    saveNcs(prev => prev.map(n => n.id === ncId ? {
      ...n, seguimiento: [...(n.seguimiento||[]), { fecha: now(), nota, por: "Usuario" }]
    } : n));
  };

  const filtered = ncs.filter(n => {
    if (filtro !== "todos" && n.estado !== filtro) return false;
    if (search && !(n.descripcion||"").toLowerCase().includes(search.toLowerCase()) &&
        !(n.numero||"").toLowerCase().includes(search.toLowerCase()) &&
        !(n.proyecto||"").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a, b) => b.fecha > a.fecha ? 1 : -1);

  return (
    <div className="fade-up">
      {/* Toolbar */}
      <div style={{ display:"flex", gap:8, marginBottom:12, alignItems:"center", flexWrap:"wrap" }}>
        <div style={{ display:"flex", gap:0 }}>
          {[["todos","Todas"],["abierta","Abiertas"],["en_proceso","En proceso"],["cerrada","Cerradas"]].map(([k,lbl],i,arr) => (
            <button key={k} onClick={() => setFiltro(k)}
              style={{ padding:"5px 12px", fontSize:10, fontWeight:600, cursor:"pointer",
                border:`1px solid ${T.border}`, borderLeft:i>0?"none":undefined,
                borderRadius:i===0?"4px 0 0 4px":i===arr.length-1?"0 4px 4px 0":"0",
                background:filtro===k?T.ink:"#fff", color:filtro===k?"#fff":T.inkMid }}>
              {lbl} {k==="abierta"?`(${ncs.filter(n=>n.estado==="abierta").length})`:""}
            </button>
          ))}
        </div>
        <div style={{ flex:1 }}/>
        <div style={{ position:"relative" }}>
          <Search size={12} style={{ position:"absolute", left:8, top:9, color:T.inkLight }}/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar NC..."
            style={{ ...inp, paddingLeft:26, width:200 }}/>
        </div>
        <Btn sm on={addNC} style={{ background:T.red }}><Plus size={10}/> Nueva NC</Btn>
      </div>

      {/* List */}
      <Card style={{ padding:0, overflow:"hidden" }}>
        {filtered.length === 0 ? (
          <div style={{ padding:30, textAlign:"center", color:T.inkLight, fontSize:12 }}>Sin no conformidades {filtro !== "todos" ? `con estado "${filtro}"` : ""}</div>
        ) : filtered.map(n => {
          const sev = SEVERIDAD_NC.find(s => s.id === n.severidad) || SEVERIDAD_NC[0];
          const exp = expanded === n.id;
          const vencida = n.fechaLimite && new Date(n.fechaLimite) < new Date() && n.estado !== "cerrada";
          return (
            <div key={n.id} style={{ borderBottom:`1px solid ${T.border}` }}>
              <div onClick={() => setExpanded(exp ? null : n.id)}
                style={{ padding:"10px 16px", cursor:"pointer", display:"flex", alignItems:"center", gap:10,
                  background:exp?T.surfaceAlt:"transparent", borderLeft:`4px solid ${sev.color}` }}>
                <span style={{ fontFamily:"'DM Mono',monospace", fontSize:9, fontWeight:700, color:T.blue, background:T.blueBg,
                  padding:"2px 6px", borderRadius:3 }}>{n.numero}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {n.descripcion || "Sin descripción"}
                  </div>
                  <div style={{ fontSize:9, color:T.inkLight, marginTop:1 }}>
                    {n.proyecto || "Sin proyecto"} · {n.ubicacion || "Sin ubicación"} · {n.categoria}
                  </div>
                </div>
                <Badge label={sev.lbl} color={sev.color} bg={sev.bg}/>
                {vencida && <Badge label="VENCIDA" color={T.red} bg={T.redBg}/>}
                <Badge label={n.estado} color={n.estado==="cerrada"?T.green:n.estado==="en_proceso"?T.blue:T.amber} bg={n.estado==="cerrada"?T.greenBg:n.estado==="en_proceso"?T.blueBg:T.amberBg}/>
                <span style={{ fontSize:9, color:T.inkLight }}>{ago(n.fecha)}</span>
                {exp ? <ChevronDown size={12}/> : <ChevronRight size={12}/>}
              </div>

              {exp && (
                <div style={{ padding:"0 16px 14px 20px", background:T.surfaceAlt }}>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8, marginBottom:8, marginTop:8 }}>
                    <div><label style={{ fontSize:8, fontWeight:700, color:T.inkLight, textTransform:"uppercase" }}>Proyecto</label>
                      <input value={n.proyecto||""} onChange={e => updNC(n.id, "proyecto", e.target.value)} style={{ ...inp, width:"100%" }}/></div>
                    <div><label style={{ fontSize:8, fontWeight:700, color:T.inkLight, textTransform:"uppercase" }}>Ubicación</label>
                      <input value={n.ubicacion||""} onChange={e => updNC(n.id, "ubicacion", e.target.value)} style={{ ...inp, width:"100%" }}/></div>
                    <div><label style={{ fontSize:8, fontWeight:700, color:T.inkLight, textTransform:"uppercase" }}>Responsable</label>
                      <input value={n.responsable||""} onChange={e => updNC(n.id, "responsable", e.target.value)} style={{ ...inp, width:"100%" }}/></div>
                    <div><label style={{ fontSize:8, fontWeight:700, color:T.inkLight, textTransform:"uppercase" }}>Fecha límite</label>
                      <input type="date" value={n.fechaLimite||""} onChange={e => updNC(n.id, "fechaLimite", e.target.value)} style={{ ...inp, width:"100%" }}/></div>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:8 }}>
                    <div><label style={{ fontSize:8, fontWeight:700, color:T.inkLight, textTransform:"uppercase" }}>Categoría</label>
                      <select value={n.categoria} onChange={e => updNC(n.id, "categoria", e.target.value)} style={{ ...inp, width:"100%" }}>
                        {CATEGORIAS_NC.map(c => <option key={c}>{c}</option>)}
                      </select></div>
                    <div><label style={{ fontSize:8, fontWeight:700, color:T.inkLight, textTransform:"uppercase" }}>Severidad</label>
                      <select value={n.severidad} onChange={e => updNC(n.id, "severidad", e.target.value)} style={{ ...inp, width:"100%" }}>
                        {SEVERIDAD_NC.map(s => <option key={s.id} value={s.id}>{s.lbl}</option>)}
                      </select></div>
                    <div><label style={{ fontSize:8, fontWeight:700, color:T.inkLight, textTransform:"uppercase" }}>Estado</label>
                      <select value={n.estado} onChange={e => updNC(n.id, "estado", e.target.value)} style={{ ...inp, width:"100%",
                        background:n.estado==="cerrada"?T.greenBg:n.estado==="en_proceso"?T.blueBg:"#fff" }}>
                        {["abierta","en_proceso","cerrada"].map(s => <option key={s} value={s}>{s}</option>)}
                      </select></div>
                  </div>
                  <div style={{ marginBottom:8 }}>
                    <label style={{ fontSize:8, fontWeight:700, color:T.inkLight, textTransform:"uppercase" }}>Descripción del hallazgo</label>
                    <textarea value={n.descripcion||""} onChange={e => updNC(n.id, "descripcion", e.target.value)}
                      rows={2} style={{ ...inp, width:"100%", resize:"vertical", lineHeight:1.5 }}/>
                  </div>
                  <div style={{ marginBottom:8 }}>
                    <label style={{ fontSize:8, fontWeight:700, color:T.inkLight, textTransform:"uppercase" }}>Acción correctiva</label>
                    <textarea value={n.accionCorrectiva||""} onChange={e => updNC(n.id, "accionCorrectiva", e.target.value)}
                      rows={2} placeholder="Describir la acción correctiva aplicada o propuesta..."
                      style={{ ...inp, width:"100%", resize:"vertical", lineHeight:1.5, background:n.estado==="cerrada"?T.greenBg:"#fff" }}/>
                  </div>

                  {/* Seguimiento */}
                  <div style={{ fontSize:9, fontWeight:700, color:T.inkLight, textTransform:"uppercase", marginBottom:4, marginTop:8 }}>Seguimiento</div>
                  {(n.seguimiento||[]).map((s, i) => (
                    <div key={i} style={{ display:"flex", gap:8, padding:"4px 0", fontSize:10, borderLeft:`2px solid ${T.border}`, paddingLeft:10, marginLeft:4, marginBottom:2 }}>
                      <span style={{ color:T.inkLight, minWidth:60, fontSize:9 }}>{fmtD(s.fecha?.split("T")[0])}</span>
                      <span style={{ fontWeight:600, fontSize:9 }}>{s.por}</span>
                      <span style={{ color:T.inkMid }}>{s.nota}</span>
                    </div>
                  ))}
                  <div style={{ display:"flex", gap:6, marginTop:4 }}>
                    <input id={`seg-nc-${n.id}`} placeholder="Añadir nota de seguimiento..." style={{ ...inp, flex:1, fontSize:10 }}/>
                    <Btn sm v="sec" on={() => {
                      const el = document.getElementById(`seg-nc-${n.id}`);
                      if (el?.value.trim()) { addSeguimiento(n.id, el.value); el.value = ""; }
                    }}><Plus size={9}/> Añadir</Btn>
                  </div>

                  <div style={{ display:"flex", justifyContent:"flex-end", marginTop:8 }}>
                    <button onClick={() => saveNcs(prev => prev.filter(x => x.id !== n.id))}
                      style={{ background:"none", border:"none", color:T.red, fontSize:10, cursor:"pointer" }}>🗑️ Eliminar NC</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </Card>
    </div>
  );
}

/* ═══ AUDITORÍAS ═══ */
function TabAuditorias({ auditorias, saveAud, inp }) {
  const addAud = () => {
    saveAud(prev => [...prev, { id:uid(), fecha:today(), tipo:"Interna", proyecto:"", auditor:"", alcance:"", estado:"programada", hallazgos:"", calificacion:0, items:[] }]);
  };
  const updAud = (id, k, v) => saveAud(prev => prev.map(a => a.id === id ? { ...a, [k]: v } : a));

  return (
    <div className="fade-up">
      <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:14 }}>
        <Btn sm on={addAud}><Plus size={10}/> Nueva auditoría</Btn>
      </div>
      {auditorias.sort((a,b) => b.fecha > a.fecha ? 1 : -1).map(a => (
        <Card key={a.id} style={{ padding:16, marginBottom:10, borderLeft:`4px solid ${a.estado==="realizada"?T.green:a.estado==="programada"?T.blue:T.inkLight}` }}>
          <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:8 }}>
            <input type="date" value={a.fecha} onChange={e => updAud(a.id, "fecha", e.target.value)}
              style={{ border:`1px solid ${T.border}`, borderRadius:3, padding:"4px 8px", fontSize:10 }}/>
            <select value={a.tipo} onChange={e => updAud(a.id, "tipo", e.target.value)}
              style={{ ...inp, width:140, fontSize:11, fontWeight:600 }}>
              {TIPO_AUDITORIA.map(t => <option key={t}>{t}</option>)}
            </select>
            <input value={a.proyecto||""} onChange={e => updAud(a.id, "proyecto", e.target.value)}
              placeholder="Proyecto" style={{ flex:1, ...inp, fontWeight:600 }}/>
            <input value={a.auditor||""} onChange={e => updAud(a.id, "auditor", e.target.value)}
              placeholder="Auditor" style={{ width:140, ...inp, fontSize:10 }}/>
            <select value={a.estado} onChange={e => updAud(a.id, "estado", e.target.value)}
              style={{ fontSize:9, padding:"3px 8px", border:`1px solid ${T.border}`, borderRadius:3,
                background:a.estado==="realizada"?T.greenBg:a.estado==="programada"?T.blueBg:"#fff" }}>
              {["programada","en_curso","realizada","cancelada"].map(s => <option key={s}>{s}</option>)}
            </select>
            <button onClick={() => saveAud(prev => prev.filter(x => x.id !== a.id))}
              style={{ background:"none", border:"none", color:T.red, cursor:"pointer" }}><Trash2 size={12}/></button>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:8 }}>
            <div>
              <label style={{ fontSize:8, fontWeight:700, color:T.inkLight, textTransform:"uppercase" }}>Alcance</label>
              <input value={a.alcance||""} onChange={e => updAud(a.id, "alcance", e.target.value)}
                placeholder="Áreas y actividades a auditar" style={{ ...inp, width:"100%" }}/>
            </div>
            <div>
              <label style={{ fontSize:8, fontWeight:700, color:T.inkLight, textTransform:"uppercase" }}>Calificación (%)</label>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <input type="range" min={0} max={100} value={a.calificacion||0}
                  onChange={e => updAud(a.id, "calificacion", +e.target.value)}
                  style={{ flex:1, accentColor:a.calificacion>=80?T.green:T.amber }}/>
                <span style={{ fontFamily:"'DM Mono',monospace", fontSize:12, fontWeight:700,
                  color:a.calificacion>=80?T.green:a.calificacion>=50?T.amber:T.red }}>{a.calificacion||0}%</span>
              </div>
            </div>
          </div>
          {a.estado === "realizada" && (
            <div style={{ marginTop:8 }}>
              <label style={{ fontSize:8, fontWeight:700, color:T.inkLight, textTransform:"uppercase" }}>Hallazgos</label>
              <textarea value={a.hallazgos||""} onChange={e => updAud(a.id, "hallazgos", e.target.value)}
                rows={2} placeholder="Resumen de hallazgos..." style={{ ...inp, width:"100%", resize:"vertical", lineHeight:1.5 }}/>
            </div>
          )}
        </Card>
      ))}
      {auditorias.length === 0 && <Card style={{ padding:30, textAlign:"center" }}><div style={{ color:T.inkLight }}>Sin auditorías programadas</div></Card>}
    </div>
  );
}

/* ═══ PROTOCOLOS ═══ */
function TabProtocolos({ protocolos, saveProt, inp }) {
  const addProt = () => {
    saveProt(prev => [...prev, { id:uid(), fecha:today(), tipo:"Otro", proyecto:"", ubicacion:"", responsable:"",
      resultado:"pendiente", valor:"", valorRef:"", observaciones:"" }]);
  };
  const updProt = (id, k, v) => saveProt(prev => prev.map(p => p.id === id ? { ...p, [k]: v } : p));

  return (
    <div className="fade-up">
      <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:14 }}>
        <Btn sm on={addProt}><Plus size={10}/> Nuevo protocolo</Btn>
      </div>
      <Card style={{ padding:0, overflow:"hidden" }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead><tr style={{ background:T.surfaceAlt }}>
            {["Fecha","Tipo de ensayo/prueba","Proyecto","Ubicación","Valor","Ref.","Resultado","Responsable",""].map(h => (
              <th key={h} style={{ padding:"8px 10px", fontSize:8, fontWeight:700, color:T.inkLight, textTransform:"uppercase", textAlign:"left", borderBottom:`2px solid ${T.border}` }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {protocolos.sort((a,b)=>b.fecha>a.fecha?1:-1).map(p => (
              <tr key={p.id} style={{ borderBottom:`1px solid ${T.border}` }}>
                <td style={{ padding:"6px 10px" }}><input type="date" value={p.fecha} onChange={e=>updProt(p.id,"fecha",e.target.value)} style={{ border:"none", background:"transparent", fontSize:10 }}/></td>
                <td style={{ padding:"6px 10px" }}><select value={p.tipo} onChange={e=>updProt(p.id,"tipo",e.target.value)} style={{ border:"none", background:"transparent", fontSize:10, fontWeight:600 }}>
                  {PROTOCOLOS_TIPO.map(t=><option key={t}>{t}</option>)}
                </select></td>
                <td style={{ padding:"6px 10px" }}><input value={p.proyecto||""} onChange={e=>updProt(p.id,"proyecto",e.target.value)} placeholder="—" style={{ border:"none", background:"transparent", fontSize:10, width:80 }}/></td>
                <td style={{ padding:"6px 10px" }}><input value={p.ubicacion||""} onChange={e=>updProt(p.id,"ubicacion",e.target.value)} placeholder="—" style={{ border:"none", background:"transparent", fontSize:10, width:80 }}/></td>
                <td style={{ padding:"6px 10px" }}><input value={p.valor||""} onChange={e=>updProt(p.id,"valor",e.target.value)} placeholder="—" style={{ border:"none", background:"transparent", fontSize:10, width:60, fontFamily:"'DM Mono',monospace" }}/></td>
                <td style={{ padding:"6px 10px" }}><input value={p.valorRef||""} onChange={e=>updProt(p.id,"valorRef",e.target.value)} placeholder="—" style={{ border:"none", background:"transparent", fontSize:10, width:60, fontFamily:"'DM Mono',monospace" }}/></td>
                <td style={{ padding:"6px 10px" }}><select value={p.resultado} onChange={e=>updProt(p.id,"resultado",e.target.value)}
                  style={{ fontSize:9, padding:"2px 6px", border:`1px solid ${T.border}`, borderRadius:3,
                    background:p.resultado==="conforme"?T.greenBg:p.resultado==="no_conforme"?T.redBg:"#fff" }}>
                  {[["pendiente","Pendiente"],["conforme","Conforme"],["no_conforme","No conforme"]].map(([v,l])=><option key={v} value={v}>{l}</option>)}
                </select></td>
                <td style={{ padding:"6px 10px" }}><input value={p.responsable||""} onChange={e=>updProt(p.id,"responsable",e.target.value)} placeholder="—" style={{ border:"none", background:"transparent", fontSize:10, width:70 }}/></td>
                <td style={{ padding:"6px 10px" }}><button onClick={()=>saveProt(prev=>prev.filter(x=>x.id!==p.id))} style={{ background:"none", border:"none", color:T.red, cursor:"pointer" }}><Trash2 size={11}/></button></td>
              </tr>
            ))}
            {protocolos.length === 0 && <tr><td colSpan={9} style={{ padding:30, textAlign:"center", color:T.inkLight }}>Sin protocolos registrados</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/* ═══ CHECKLISTS ═══ */
function TabChecklists({ checklists, saveCheck, inp }) {
  const [expanded, setExpanded] = useState(null);

  const addChecklist = () => {
    const n = { id:uid(), nombre:"Nueva lista de chequeo", proyecto:"", fecha:today(), responsable:"", items:[
      { id:uid(), texto:"Verificar niveles y plomos", ok:false },
      { id:uid(), texto:"Verificar dimensiones según plano", ok:false },
      { id:uid(), texto:"Verificar acabado superficial", ok:false },
      { id:uid(), texto:"Verificar juntas y sellantes", ok:false },
      { id:uid(), texto:"Verificar limpieza del área", ok:false },
    ]};
    saveCheck(prev => [...prev, n]);
    setExpanded(n.id);
  };

  const updCheck = (id, k, v) => saveCheck(prev => prev.map(c => c.id === id ? { ...c, [k]: v } : c));

  const toggleItem = (checkId, itemId) => {
    saveCheck(prev => prev.map(c => c.id === checkId ? {
      ...c, items: c.items.map(i => i.id === itemId ? { ...i, ok: !i.ok } : i)
    } : c));
  };

  const addItem = (checkId) => {
    saveCheck(prev => prev.map(c => c.id === checkId ? {
      ...c, items: [...c.items, { id: uid(), texto: "", ok: false }]
    } : c));
  };

  return (
    <div className="fade-up">
      <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:14 }}>
        <Btn sm on={addChecklist}><Plus size={10}/> Nueva lista</Btn>
      </div>
      {checklists.map(cl => {
        const done = cl.items.filter(i => i.ok).length;
        const total = cl.items.length;
        const pctDone = total > 0 ? Math.round((done / total) * 100) : 0;
        const exp = expanded === cl.id;
        return (
          <Card key={cl.id} style={{ marginBottom:10, padding:0, overflow:"hidden" }}>
            <div onClick={() => setExpanded(exp ? null : cl.id)}
              style={{ padding:"12px 16px", cursor:"pointer", display:"flex", alignItems:"center", gap:10,
                background:exp?T.surfaceAlt:"transparent" }}>
              <div style={{ width:32, height:32, borderRadius:"50%", border:`3px solid ${pctDone>=100?T.green:T.border}`,
                display:"flex", alignItems:"center", justifyContent:"center",
                background:pctDone>=100?T.greenBg:"transparent", flexShrink:0 }}>
                {pctDone >= 100 ? <CheckCircle size={16} color={T.green}/> :
                  <span style={{ fontSize:9, fontWeight:800, fontFamily:"'DM Mono',monospace", color:T.inkMid }}>{pctDone}%</span>}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:700 }}>{cl.nombre}</div>
                <div style={{ fontSize:9, color:T.inkLight }}>{cl.proyecto||"Sin proyecto"} · {done}/{total} items · {fmtD(cl.fecha)}</div>
              </div>
              <div style={{ width:80, height:6, background:T.border, borderRadius:3, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${pctDone}%`, background:pctDone>=100?T.green:T.blue, borderRadius:3 }}/>
              </div>
              {exp ? <ChevronDown size={12}/> : <ChevronRight size={12}/>}
            </div>

            {exp && (
              <div style={{ padding:"0 16px 14px", background:T.surfaceAlt }}>
                <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr", gap:8, marginBottom:10 }}>
                  <div><label style={{ fontSize:8, fontWeight:700, color:T.inkLight, textTransform:"uppercase" }}>Nombre</label>
                    <input value={cl.nombre} onChange={e => updCheck(cl.id, "nombre", e.target.value)} style={{ ...inp, width:"100%", fontWeight:700 }}/></div>
                  <div><label style={{ fontSize:8, fontWeight:700, color:T.inkLight, textTransform:"uppercase" }}>Proyecto</label>
                    <input value={cl.proyecto||""} onChange={e => updCheck(cl.id, "proyecto", e.target.value)} style={{ ...inp, width:"100%" }}/></div>
                  <div><label style={{ fontSize:8, fontWeight:700, color:T.inkLight, textTransform:"uppercase" }}>Responsable</label>
                    <input value={cl.responsable||""} onChange={e => updCheck(cl.id, "responsable", e.target.value)} style={{ ...inp, width:"100%" }}/></div>
                </div>

                {cl.items.map((item, ii) => (
                  <div key={item.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 0", borderBottom:`1px solid ${T.border}` }}>
                    <button onClick={() => toggleItem(cl.id, item.id)}
                      style={{ width:22, height:22, borderRadius:4, border:`2px solid ${item.ok?T.green:T.border}`,
                        background:item.ok?T.greenBg:"#fff", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      {item.ok && <Check size={12} color={T.green}/>}
                    </button>
                    <input value={item.texto} onChange={e => {
                      saveCheck(prev => prev.map(c => c.id === cl.id ? {
                        ...c, items: c.items.map(i => i.id === item.id ? { ...i, texto: e.target.value } : i)
                      } : c));
                    }} placeholder="Descripción del item..."
                      style={{ flex:1, border:"none", background:"transparent", fontSize:11,
                        textDecoration:item.ok?"line-through":"none", color:item.ok?T.inkLight:T.ink }}/>
                    <button onClick={() => saveCheck(prev => prev.map(c => c.id === cl.id ? {
                      ...c, items: c.items.filter(i => i.id !== item.id)
                    } : c))} style={{ background:"none", border:"none", color:T.red, cursor:"pointer" }}><Trash2 size={10}/></button>
                  </div>
                ))}
                <div style={{ display:"flex", gap:6, marginTop:8 }}>
                  <Btn sm v="sec" on={() => addItem(cl.id)}><Plus size={9}/> Añadir item</Btn>
                  <div style={{ flex:1 }}/>
                  <button onClick={() => saveCheck(prev => prev.filter(x => x.id !== cl.id))}
                    style={{ background:"none", border:"none", color:T.red, fontSize:10, cursor:"pointer" }}>🗑️ Eliminar lista</button>
                </div>
              </div>
            )}
          </Card>
        );
      })}
      {checklists.length === 0 && <Card style={{ padding:30, textAlign:"center" }}><div style={{ color:T.inkLight }}>Sin listas de chequeo. Crea la primera.</div></Card>}
    </div>
  );
}

/* ═══ ACTAS DE ENTREGA ═══ */
function TabEntregas({ entregas, saveEntregas, inp }) {
  const addEntrega = () => {
    saveEntregas(prev => [...prev, { id:uid(), fecha:today(), tipo:"parcial", proyecto:"", cliente:"",
      descripcion:"", items:[], estado:"borrador", observaciones:"", firmaCliente:false, firmaHabitaris:false }]);
  };
  const updEnt = (id, k, v) => saveEntregas(prev => prev.map(e => e.id === id ? { ...e, [k]: v } : e));

  return (
    <div className="fade-up">
      <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:14 }}>
        <Btn sm on={addEntrega}><Plus size={10}/> Nueva acta</Btn>
      </div>
      {entregas.sort((a,b) => b.fecha > a.fecha ? 1 : -1).map(e => (
        <Card key={e.id} style={{ padding:16, marginBottom:10, borderLeft:`4px solid ${e.estado==="firmada"?T.green:e.estado==="enviada"?T.blue:T.inkLight}` }}>
          <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:8 }}>
            <input type="date" value={e.fecha} onChange={ev => updEnt(e.id, "fecha", ev.target.value)}
              style={{ border:`1px solid ${T.border}`, borderRadius:3, padding:"4px 8px", fontSize:10 }}/>
            <select value={e.tipo} onChange={ev => updEnt(e.id, "tipo", ev.target.value)}
              style={{ ...inp, width:100, fontSize:11, fontWeight:600 }}>
              <option value="parcial">Parcial</option>
              <option value="final">Final</option>
              <option value="provisional">Provisional</option>
            </select>
            <input value={e.proyecto||""} onChange={ev => updEnt(e.id, "proyecto", ev.target.value)}
              placeholder="Proyecto" style={{ flex:1, ...inp, fontWeight:600 }}/>
            <input value={e.cliente||""} onChange={ev => updEnt(e.id, "cliente", ev.target.value)}
              placeholder="Cliente" style={{ width:140, ...inp, fontSize:10 }}/>
            <select value={e.estado} onChange={ev => updEnt(e.id, "estado", ev.target.value)}
              style={{ fontSize:9, padding:"3px 8px", border:`1px solid ${T.border}`, borderRadius:3,
                background:e.estado==="firmada"?T.greenBg:e.estado==="enviada"?T.blueBg:"#fff" }}>
              {["borrador","enviada","firmada"].map(s => <option key={s}>{s}</option>)}
            </select>
            <button onClick={() => saveEntregas(prev => prev.filter(x => x.id !== e.id))}
              style={{ background:"none", border:"none", color:T.red, cursor:"pointer" }}><Trash2 size={12}/></button>
          </div>
          <textarea value={e.descripcion||""} onChange={ev => updEnt(e.id, "descripcion", ev.target.value)}
            rows={2} placeholder="Descripción de los trabajos entregados..."
            style={{ ...inp, width:"100%", resize:"vertical", lineHeight:1.5, marginBottom:6 }}/>
          <div style={{ display:"flex", gap:12, alignItems:"center", fontSize:10 }}>
            <label style={{ display:"flex", alignItems:"center", gap:4, cursor:"pointer" }}>
              <input type="checkbox" checked={e.firmaHabitaris||false} onChange={ev => updEnt(e.id, "firmaHabitaris", ev.target.checked)}/>
              <span style={{ fontWeight:600 }}>Firma Habitaris</span>
            </label>
            <label style={{ display:"flex", alignItems:"center", gap:4, cursor:"pointer" }}>
              <input type="checkbox" checked={e.firmaCliente||false} onChange={ev => updEnt(e.id, "firmaCliente", ev.target.checked)}/>
              <span style={{ fontWeight:600 }}>Firma Cliente</span>
            </label>
            <input value={e.observaciones||""} onChange={ev => updEnt(e.id, "observaciones", ev.target.value)}
              placeholder="Observaciones..." style={{ flex:1, ...inp, fontSize:10 }}/>
          </div>
        </Card>
      ))}
      {entregas.length === 0 && <Card style={{ padding:30, textAlign:"center" }}><div style={{ color:T.inkLight }}>Sin actas de entrega</div></Card>}
    </div>
  );
}

/* ═══ INDICADORES KPI ═══ */
function TabKPI({ indicadores, saveKpi, inp }) {
  const addKpi = () => {
    saveKpi(prev => [...prev, { id:uid(), nombre:"Nuevo indicador", meta:0, actual:0, unidad:"%", periodo:"mensual" }]);
  };
  const updKpi = (id, k, v) => saveKpi(prev => prev.map(i => i.id === id ? { ...i, [k]: v } : i));

  return (
    <div className="fade-up">
      <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:14 }}>
        <Btn sm on={addKpi}><Plus size={10}/> Nuevo indicador</Btn>
      </div>
      <Card style={{ padding:0, overflow:"hidden" }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead><tr style={{ background:T.surfaceAlt }}>
            {["Indicador","Meta","Actual","Unidad","Período","Cumplimiento",""].map(h => (
              <th key={h} style={{ padding:"8px 12px", fontSize:8, fontWeight:700, color:T.inkLight, textTransform:"uppercase",
                textAlign:["Meta","Actual"].includes(h)?"right":"left", borderBottom:`2px solid ${T.border}` }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {indicadores.map(k => {
              const ratio = k.meta > 0 ? Math.min((k.actual / k.meta) * 100, 150) : 0;
              const cumple = k.unidad === "%" ? (k.nombre.toLowerCase().includes("reproceso") || k.nombre.toLowerCase().includes("nc por") ? k.actual <= k.meta : k.actual >= k.meta) : k.actual >= k.meta;
              return (
                <tr key={k.id} style={{ borderBottom:`1px solid ${T.border}` }}>
                  <td style={{ padding:"8px 12px" }}>
                    <input value={k.nombre} onChange={e => updKpi(k.id, "nombre", e.target.value)}
                      style={{ border:"none", background:"transparent", fontSize:12, fontWeight:600, width:"100%" }}/>
                  </td>
                  <td style={{ padding:"8px 12px", textAlign:"right" }}>
                    <input type="number" value={k.meta||""} onChange={e => updKpi(k.id, "meta", +e.target.value)}
                      style={{ width:50, border:`1px solid ${T.border}`, borderRadius:3, padding:"3px 6px", fontSize:11,
                        textAlign:"right", fontFamily:"'DM Mono',monospace", background:"#fff" }}/>
                  </td>
                  <td style={{ padding:"8px 12px", textAlign:"right" }}>
                    <input type="number" value={k.actual||""} onChange={e => updKpi(k.id, "actual", +e.target.value)}
                      style={{ width:50, border:`1px solid ${T.border}`, borderRadius:3, padding:"3px 6px", fontSize:11,
                        textAlign:"right", fontFamily:"'DM Mono',monospace", fontWeight:700,
                        background:cumple?T.greenBg:T.amberBg, color:cumple?T.green:T.amber }}/>
                  </td>
                  <td style={{ padding:"8px 12px" }}>
                    <select value={k.unidad} onChange={e => updKpi(k.id, "unidad", e.target.value)}
                      style={{ border:"none", background:"transparent", fontSize:10 }}>
                      {["%","ud","/5","días","h"].map(u => <option key={u}>{u}</option>)}
                    </select>
                  </td>
                  <td style={{ padding:"8px 12px" }}>
                    <select value={k.periodo} onChange={e => updKpi(k.id, "periodo", e.target.value)}
                      style={{ border:"none", background:"transparent", fontSize:10 }}>
                      {["mensual","trimestral","semestral","anual","por proyecto"].map(p => <option key={p}>{p}</option>)}
                    </select>
                  </td>
                  <td style={{ padding:"8px 12px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <div style={{ flex:1, height:6, background:T.border, borderRadius:3, overflow:"hidden" }}>
                        <div style={{ height:"100%", width:`${Math.min(ratio, 100)}%`, background:cumple?T.green:T.amber, borderRadius:3, transition:"width .3s" }}/>
                      </div>
                      <span style={{ fontSize:9, fontWeight:700, color:cumple?T.green:T.amber }}>{cumple?"✅":"⚠️"}</span>
                    </div>
                  </td>
                  <td style={{ padding:"8px 12px" }}>
                    <button onClick={() => saveKpi(prev => prev.filter(x => x.id !== k.id))}
                      style={{ background:"none", border:"none", color:T.red, cursor:"pointer" }}><Trash2 size={11}/></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
