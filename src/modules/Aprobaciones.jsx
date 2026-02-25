import React, { useState, useEffect, useMemo, useCallback } from "react";
import { store } from "../core/store.js";

import {
  CheckCircle, XCircle, Clock, Send, RotateCcw, AlertTriangle,
  Check, X, ChevronDown, ChevronRight, FileText, Search, Filter,
  Settings, Users, Shield, DollarSign, Bell, Eye, Trash2,
  Plus, Edit3, Save, Download, BarChart2, Briefcase, Package,
  HardHat, ClipboardList, ArrowLeft, Layers, Lock, Unlock
} from "lucide-react";

/* ─── STYLES ─── */
const Fonts = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=DM Sans:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'DM Sans', sans-serif; background: #F5F4F1; -webkit-font-smoothing: antialiased; }
    ::-webkit-scrollbar { width: 4px; height: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #C8C5BE; border-radius: 2px; }
    input, select, textarea { font-family: 'DM Sans', sans-serif; outline: none; }
    button { font-family: 'DM Sans', sans-serif; cursor: pointer; }
    @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
    .fade-up { animation: fadeUp .22s ease both; }
  `}</style>
);

/* ─── TOKENS ─── */
const T = {
  bg:"#F5F4F1", surface:"#FFFFFF", surfaceAlt:"#FFFFFF", ink:"#111111",
  inkMid:"#555555", inkLight:"#909090", inkXLight:"#C8C5BE",
  border:"#E0E0E0", accent:"#EDEBE7",
  green:"#111111", greenBg:"#E8F4EE", red:"#B91C1C", redBg:"#FAE8E8",
  amber:"#8C6A00", amberBg:"#FAF0E0", blue:"#3B3B3B", blueBg:"#F0F0F0",
  shadow:"0 1px 3px rgba(0,0,0,.06), 0 4px 16px rgba(0,0,0,.05)",
};

/* ─── UTILS ─── */
const uid = () => Math.random().toString(36).slice(2, 9);
const now = () => new Date().toISOString();
const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("es-CO", { day:"2-digit", month:"short", year:"numeric" });
};
const fmtTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString("es-CO", { hour:"2-digit", minute:"2-digit" });
};
const fmtM = (n) => n ? new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(n) : "—";
const ago = (iso) => {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 60) return `hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h/24)}d`;
};

/* ─── STORAGE HOOK ─── */
function useStore(key, init) {
  const [data, setData] = useState(init);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const r = await store.get(key);
        if (r?.value) setData(JSON.parse(r));
      } catch {}
      setLoaded(true);
    })();
  }, [key]);
  const save = useCallback(async (v) => {
    const val = typeof v === "function" ? v(data) : v;
    setData(val);
    try { await store.set(key, JSON.stringify(val)); } catch {}
  }, [key, data]);
  return [data, save, loaded];
}

/* ─── MODULES THAT GENERATE APPROVALS ─── */
const MODULOS_APROB = [
  { id:"ofertas",   label:"Ofertas / CRM",         icon:ClipboardList, color:"#111111", desc:"Presupuestos y propuestas comerciales" },
  { id:"compras",   label:"Compras / Insumos",      icon:Package,       color:"#0D5E6E", desc:"Órdenes de compra y contratos proveedores" },
  { id:"rrhh",      label:"RRHH",                   icon:Users,         color:"#3B3B3B", desc:"Contrataciones, vacaciones y novedades" },
  { id:"pagos",     label:"Pagos / Tesorería",      icon:DollarSign,    color:"#8C6A00", desc:"Pagos a proveedores, anticipos y facturas" },
  { id:"subcontratos",label:"Subcontratos",          icon:Briefcase,     color:"#5B3A8C", desc:"Contratos con subcontratistas" },
  { id:"calidad",   label:"Calidad / SST",          icon:Shield,        color:"#B91C1C", desc:"No conformidades, inspecciones y permisos" },
];

/* ─── ESTADOS ─── */
const ESTADOS = {
  pendiente:  { label:"Pendiente",  color:T.amber, bg:T.amberBg, icon:Clock },
  aprobado:   { label:"Aprobado",   color:T.green, bg:T.greenBg, icon:CheckCircle },
  rechazado:  { label:"Rechazado",  color:T.red,   bg:T.redBg,   icon:XCircle },
  devuelto:   { label:"Devuelto",   color:"#D4840A", bg:"#FFF3E0", icon:RotateCcw },
};

/* ─── SIDEBAR TABS ─── */
const TABS = [
  { id:"dashboard",  lbl:"Dashboard",       I:BarChart2,     desc:"Resumen general de aprobaciones" },
  { id:"ofertas",    lbl:"Ofertas",          I:ClipboardList, desc:"Aprobaciones de presupuestos y propuestas" },
  { id:"compras",    lbl:"Compras",          I:Package,       desc:"Órdenes de compra y contratos" },
  { id:"rrhh",       lbl:"RRHH",            I:Users,         desc:"Contrataciones y novedades" },
  { id:"pagos",      lbl:"Pagos",           I:DollarSign,    desc:"Pagos y tesorería" },
  { id:"subcontratos",lbl:"Subcontratos",   I:Briefcase,     desc:"Contratos subcontratistas" },
  { id:"calidad",    lbl:"Calidad / SST",   I:Shield,        desc:"No conformidades e inspecciones" },
  { id:"config",     lbl:"Configuración",   I:Settings,      desc:"Cadenas de aprobación y umbrales" },
];

/* ─── UI PRIMITIVES ─── */
const Card = ({ children, style, ...p }) => (
  <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:8, boxShadow:T.shadow, ...style }} {...p}>{children}</div>
);
const Badge = ({ estado }) => {
  const e = ESTADOS[estado] || ESTADOS.pendiente;
  const Icon = e.icon;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"3px 8px", borderRadius:4,
      background:e.bg, color:e.color, fontSize:10, fontWeight:700 }}>
      <Icon size={11}/> {e.label}
    </span>
  );
};
const Btn = ({ children, v, sm, on, style, ...p }) => (
  <button onClick={on} style={{
    display:"inline-flex", alignItems:"center", gap:5,
    padding: sm ? "5px 10px" : "8px 16px",
    fontSize: sm ? 10 : 11, fontWeight:600,
    border: v==="sec" ? `1px solid ${T.border}` : v==="danger" ? "none" : "none",
    borderRadius:5, cursor:"pointer",
    background: v==="sec" ? "#fff" : v==="danger" ? T.redBg : T.ink,
    color: v==="sec" ? T.inkMid : v==="danger" ? T.red : "#fff",
    ...style
  }} {...p}>{children}</button>
);

/* ═══════════════════════════════════════════════
   MAIN MODULE COMPONENT
═══════════════════════════════════════════════ */
export default function HabitarisAprobaciones({ pais = "CO" }) {
  const [tab, setTab] = useState("dashboard");

  // ── Storage ──
  const [aprobaciones, saveAprobaciones, loadedA] = useStore("hab:aprobaciones:items", []);
  const [config, saveConfig, loadedC] = useStore("hab:aprobaciones:config", {
    usuarios: [
      { id:"david", nombre:"David Parra Galera", cargo:"Director Ejecutivo", email:"david@habitaris.co", nivel:1, avatar:"👤" },
      { id:"ana",   nombre:"Ana María Díaz Buitrago", cargo:"Directora Creativa", email:"ana@habitaris.co", nivel:1, avatar:"👩" },
      { id:"residente", nombre:"Residente de obra", cargo:"Residente", email:"residente@habitaris.co", nivel:2, avatar:"👷" },
      { id:"admin", nombre:"Coordinador Administrativo", cargo:"Admin", email:"admin@habitaris.co", nivel:3, avatar:"📋" },
    ],
    cadenas: {
      ofertas:      { aprobadores:["david","ana"], umbral:0, umbralAlto:50000000, aprobadorAlto:"david" },
      compras:      { aprobadores:["residente"], umbral:5000000, aprobadorAlto:"david", umbralAlto:20000000 },
      rrhh:         { aprobadores:["david","ana"], umbral:0 },
      pagos:        { aprobadores:["david"], umbral:0, umbralAlto:10000000, aprobadorAlto:"david" },
      subcontratos: { aprobadores:["david"], umbral:10000000, aprobadorAlto:"david" },
      calidad:      { aprobadores:["residente","david"], umbral:0 },
    },
    notificaciones: true,
  });
  const [usuarioActivo, setUsuarioActivo] = useState("david");

  // ── Read CRM offers for context ──
  const [ofertas, setOfertas] = useState([]);
  useEffect(() => {
    (async () => {
      try {
        const r = await store.get("hab:crm:ofertas");
        if (r?.value) setOfertas(JSON.parse(r) || []);
      } catch {}
    })();
  }, []);

  // ── Helper: add approval ──
  const addAprobacion = (item) => {
    const nuevo = { id:uid(), fecha:now(), estado:"pendiente", historial:[], ...item };
    saveAprobaciones(prev => [...prev, nuevo]);
    return nuevo;
  };

  // ── Helper: act on approval ──
  const actuar = (aprobId, accion, comentario = "") => {
    saveAprobaciones(prev => prev.map(a => {
      if (a.id !== aprobId) return a;
      const nuevoEstado = accion === "aprobar" ? "aprobado" : accion === "rechazar" ? "rechazado" : "devuelto";
      return {
        ...a,
        estado: nuevoEstado,
        historial: [...(a.historial||[]), {
          accion, fecha:now(), por:usuarioActivo,
          porNombre: config.usuarios.find(u=>u.id===usuarioActivo)?.nombre || usuarioActivo,
          comentario,
        }],
      };
    }));
  };

  // ── Stats ──
  const stats = useMemo(() => {
    const pendientes = aprobaciones.filter(a => a.estado === "pendiente");
    const misPendientes = pendientes.filter(a => {
      const cadena = config.cadenas[a.modulo];
      return cadena?.aprobadores?.includes(usuarioActivo);
    });
    const aprobados = aprobaciones.filter(a => a.estado === "aprobado");
    const rechazados = aprobaciones.filter(a => a.estado === "rechazado");
    const devueltos = aprobaciones.filter(a => a.estado === "devuelto");
    const byModule = {};
    MODULOS_APROB.forEach(m => {
      byModule[m.id] = {
        total: aprobaciones.filter(a => a.modulo === m.id).length,
        pendientes: aprobaciones.filter(a => a.modulo === m.id && a.estado === "pendiente").length,
      };
    });
    return { pendientes:pendientes.length, misPendientes:misPendientes.length, aprobados:aprobados.length,
      rechazados:rechazados.length, devueltos:devueltos.length, byModule, total:aprobaciones.length };
  }, [aprobaciones, usuarioActivo, config]);

  // ── Filtered items for module tab ──
  const getModuleItems = (moduloId) => aprobaciones.filter(a => a.modulo === moduloId);

  const inp = { border:`1px solid ${T.border}`, borderRadius:4, padding:"6px 10px", fontSize:12, background:"#fff" };

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
              <span style={{ fontSize:13, fontWeight:800, letterSpacing:3.5, textTransform:"uppercase", color:T.ink }}>HABITARIS</span>
              <span style={{ fontSize:11, color:T.inkLight, marginLeft:10 }}>/ Aprobaciones</span>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            {stats.misPendientes > 0 && (
              <div style={{ background:T.amberBg, border:`1px solid ${T.amber}33`, borderRadius:4, padding:"5px 10px",
                display:"flex", alignItems:"center", gap:5 }}>
                <Bell size={12} color={T.amber}/>
                <span style={{ fontSize:10, fontWeight:700, color:T.amber }}>{stats.misPendientes} pendiente{stats.misPendientes!==1?"s":""}</span>
              </div>
            )}
            {/* User selector */}
            <select value={usuarioActivo} onChange={e => setUsuarioActivo(e.target.value)}
              style={{ ...inp, fontSize:11, fontWeight:600, padding:"5px 8px", minWidth:160 }}>
              {config.usuarios.map(u => (
                <option key={u.id} value={u.id}>{u.avatar} {u.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        {/* LAYOUT */}
        <div style={{ display:"flex", flex:1, minHeight:0 }}>
          {/* Sidebar */}
          <div style={{ width:210, flexShrink:0, background:T.surface, borderRight:`1px solid ${T.border}`,
            display:"flex", flexDirection:"column", paddingTop:8, overflowY:"auto" }}>
            {TABS.map(t => {
              const act = tab === t.id;
              const modStats = stats.byModule[t.id];
              const pending = modStats?.pendientes || 0;
              return (
                <button key={t.id} onClick={()=>setTab(t.id)} style={{
                  display:"flex", alignItems:"center", gap:9, padding:"10px 16px",
                  border:"none", borderLeft: act ? `3px solid ${T.ink}` : "3px solid transparent",
                  background: act ? T.accent : "transparent",
                  color: act ? T.ink : T.inkLight,
                  fontSize:12, fontWeight:act?700:400, cursor:"pointer",
                  textAlign:"left", width:"100%", transition:"all .1s" }}>
                  <t.I size={13} style={{ flexShrink:0 }}/>
                  <span style={{ flex:1, lineHeight:1.2 }}>{t.lbl}</span>
                  {pending > 0 && t.id !== "dashboard" && t.id !== "config" && (
                    <span style={{ background:T.amber, color:"#fff", fontSize:8, fontWeight:800, padding:"1px 5px", borderRadius:8 }}>{pending}</span>
                  )}
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

              {tab === "dashboard" && <TabDashboard stats={stats} aprobaciones={aprobaciones} config={config}
                usuarioActivo={usuarioActivo} actuar={actuar} setTab={setTab} ofertas={ofertas}/>}
              {tab === "config" && <TabConfig config={config} saveConfig={saveConfig}/>}
              {["ofertas","compras","rrhh","pagos","subcontratos","calidad"].includes(tab) && (
                <TabModulo modulo={tab} items={getModuleItems(tab)} config={config}
                  usuarioActivo={usuarioActivo} actuar={actuar} addAprobacion={addAprobacion} ofertas={ofertas}/>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════
   DASHBOARD TAB
═══════════════════════════════════════════════ */
function TabDashboard({ stats, aprobaciones, config, usuarioActivo, actuar, setTab, ofertas }) {
  const misPendientes = aprobaciones.filter(a => {
    if (a.estado !== "pendiente") return false;
    const cadena = config.cadenas[a.modulo];
    return cadena?.aprobadores?.includes(usuarioActivo);
  }).sort((a, b) => b.fecha > a.fecha ? 1 : -1);

  const recientes = [...aprobaciones].sort((a, b) => b.fecha > a.fecha ? 1 : -1).slice(0, 10);
  const usuario = config.usuarios.find(u => u.id === usuarioActivo);

  return (
    <div className="fade-up">
      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5, 1fr)", gap:12, marginBottom:20 }}>
        {[
          { label:"Mis pendientes", val:stats.misPendientes, color:T.amber, bg:T.amberBg },
          { label:"Total pendientes", val:stats.pendientes, color:"#D4840A", bg:"#FFF3E0" },
          { label:"Aprobadas", val:stats.aprobados, color:T.green, bg:T.greenBg },
          { label:"Rechazadas", val:stats.rechazados, color:T.red, bg:T.redBg },
          { label:"Devueltas", val:stats.devueltos, color:T.blue, bg:T.blueBg },
        ].map(kpi => (
          <Card key={kpi.label} style={{ padding:"14px 16px" }}>
            <div style={{ fontSize:8, fontWeight:700, color:T.inkLight, textTransform:"uppercase", letterSpacing:1 }}>{kpi.label}</div>
            <div style={{ fontSize:26, fontWeight:800, color:kpi.color, marginTop:4 }}>{kpi.val}</div>
          </Card>
        ))}
      </div>

      {/* Welcome + user info */}
      <Card style={{ padding:"16px 20px", marginBottom:16, background:T.greenBg, border:`1px solid ${T.green}33` }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:28 }}>{usuario?.avatar || "👤"}</span>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:T.green }}>{usuario?.nombre || "Usuario"}</div>
            <div style={{ fontSize:11, color:T.inkMid }}>{usuario?.cargo} · {Object.entries(config.cadenas)
              .filter(([,v]) => v.aprobadores?.includes(usuarioActivo)).map(([k]) => k).join(", ") || "Sin módulos asignados"}</div>
          </div>
        </div>
      </Card>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        {/* Mis pendientes */}
        <Card style={{ padding:0, overflow:"hidden" }}>
          <div style={{ padding:"12px 16px", background:T.amberBg, borderBottom:`1px solid ${T.border}` }}>
            <div style={{ fontSize:12, fontWeight:700, color:T.amber, display:"flex", alignItems:"center", gap:6 }}>
              <Clock size={13}/> Mis pendientes ({misPendientes.length})
            </div>
          </div>
          <div style={{ maxHeight:400, overflowY:"auto" }}>
            {misPendientes.length === 0 ? (
              <div style={{ padding:24, textAlign:"center", color:T.inkLight, fontSize:12 }}>
                <CheckCircle size={24} style={{ marginBottom:8, opacity:0.3 }}/>
                <div>Sin aprobaciones pendientes 🎉</div>
              </div>
            ) : misPendientes.map(a => (
              <ApprovalRow key={a.id} item={a} actuar={actuar} config={config}
                usuarioActivo={usuarioActivo} compact ofertas={ofertas}/>
            ))}
          </div>
        </Card>

        {/* By module */}
        <Card style={{ padding:0, overflow:"hidden" }}>
          <div style={{ padding:"12px 16px", background:T.blueBg, borderBottom:`1px solid ${T.border}` }}>
            <div style={{ fontSize:12, fontWeight:700, color:T.blue, display:"flex", alignItems:"center", gap:6 }}>
              <Layers size={13}/> Por módulo
            </div>
          </div>
          {MODULOS_APROB.map(m => {
            const ms = stats.byModule[m.id] || {};
            const Icon = m.icon;
            return (
              <div key={m.id} onClick={() => setTab(m.id)}
                style={{ padding:"10px 16px", borderBottom:`1px solid ${T.border}`, cursor:"pointer",
                  display:"flex", alignItems:"center", gap:10, transition:"background .1s" }}
                onMouseEnter={e => e.currentTarget.style.background = T.surfaceAlt}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <div style={{ width:28, height:28, borderRadius:6, background:m.color+"15", display:"flex",
                  alignItems:"center", justifyContent:"center" }}>
                  <Icon size={14} color={m.color}/>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12, fontWeight:600 }}>{m.label}</div>
                  <div style={{ fontSize:9, color:T.inkLight }}>{ms.total||0} total</div>
                </div>
                {ms.pendientes > 0 && (
                  <span style={{ background:T.amber, color:"#fff", fontSize:9, fontWeight:800,
                    padding:"2px 7px", borderRadius:10 }}>{ms.pendientes}</span>
                )}
                <ChevronRight size={12} color={T.inkLight}/>
              </div>
            );
          })}
        </Card>
      </div>

      {/* Recent activity */}
      {recientes.length > 0 && (
        <Card style={{ marginTop:16, padding:0, overflow:"hidden" }}>
          <div style={{ padding:"12px 16px", borderBottom:`1px solid ${T.border}` }}>
            <div style={{ fontSize:12, fontWeight:700, color:T.ink }}>Actividad reciente</div>
          </div>
          {recientes.map(a => {
            const lastAction = (a.historial||[]).slice(-1)[0];
            const modInfo = MODULOS_APROB.find(m => m.id === a.modulo);
            return (
              <div key={a.id} style={{ padding:"8px 16px", borderBottom:`1px solid #F5F5F5`,
                display:"flex", alignItems:"center", gap:10, fontSize:11 }}>
                <Badge estado={a.estado}/>
                <div style={{ flex:1 }}>
                  <span style={{ fontWeight:600 }}>{a.titulo || a.referencia || "Sin título"}</span>
                  <span style={{ color:T.inkLight, marginLeft:6, fontSize:9 }}>{modInfo?.label}</span>
                </div>
                {a.monto > 0 && <span style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:T.inkMid }}>${fmtM(a.monto)}</span>}
                <span style={{ fontSize:9, color:T.inkLight }}>{ago(lastAction?.fecha || a.fecha)}</span>
              </div>
            );
          })}
        </Card>
      )}

      {/* Empty state with demo data */}
      {aprobaciones.length === 0 && (
        <Card style={{ padding:30, textAlign:"center", marginTop:16 }}>
          <Shield size={36} style={{ color:T.inkLight, opacity:0.3, marginBottom:12 }}/>
          <div style={{ fontSize:14, fontWeight:600, color:T.inkMid, marginBottom:6 }}>Sin aprobaciones registradas</div>
          <div style={{ fontSize:11, color:T.inkLight, marginBottom:16 }}>Las aprobaciones se generan desde cada módulo (Ofertas, Compras, etc.) o puedes crear una demo.</div>
          <Btn on={() => {
            // Demo data
            const demos = [
              { modulo:"ofertas", titulo:"OF-2026-001 — Apto 301 Torre Norte", referencia:"OF-2026-001", monto:85000000, solicitante:"ana", tipo:"Presupuesto de ejecución" },
              { modulo:"ofertas", titulo:"OF-2026-002 — Diseño interior Oficinas", referencia:"OF-2026-002", monto:25000000, solicitante:"david", tipo:"Propuesta de diseño" },
              { modulo:"compras", titulo:"OC-001 — Cemento y acero", referencia:"OC-001", monto:12500000, solicitante:"residente", tipo:"Orden de compra" },
              { modulo:"compras", titulo:"OC-002 — Pisos porcelanato 60x60", referencia:"OC-002", monto:8200000, solicitante:"residente", tipo:"Orden de compra" },
              { modulo:"pagos", titulo:"PAG-001 — Anticipo Ferretería El Tornillo", referencia:"PAG-001", monto:6000000, solicitante:"admin", tipo:"Pago a proveedor" },
              { modulo:"subcontratos", titulo:"SC-001 — Instalaciones eléctricas", referencia:"SC-001", monto:18000000, solicitante:"residente", tipo:"Subcontrato" },
              { modulo:"rrhh", titulo:"Contratación auxiliar de obra", referencia:"RRHH-001", monto:2800000, solicitante:"residente", tipo:"Nueva contratación" },
              { modulo:"calidad", titulo:"NC-001 — Fisura en pañete fachada", referencia:"NC-001", monto:0, solicitante:"residente", tipo:"No conformidad" },
            ];
            demos.forEach(d => {
              const sol = config.usuarios.find(u => u.id === d.solicitante);
              saveAprobaciones(prev => [...prev, {
                id:uid(), fecha:now(), estado:"pendiente",
                historial:[{ accion:"solicitar", fecha:now(), por:d.solicitante, porNombre:sol?.nombre||d.solicitante, comentario:"" }],
                ...d,
              }]);
            });
          }}>
            <Plus size={12}/> Crear datos de ejemplo
          </Btn>
        </Card>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   APPROVAL ROW (reusable)
═══════════════════════════════════════════════ */
function ApprovalRow({ item, actuar, config, usuarioActivo, compact, ofertas }) {
  const [expanded, setExpanded] = useState(false);
  const [comment, setComment] = useState("");
  const canAct = item.estado === "pendiente" && config.cadenas[item.modulo]?.aprobadores?.includes(usuarioActivo);
  const modInfo = MODULOS_APROB.find(m => m.id === item.modulo);

  const doAction = (accion) => {
    if (accion !== "aprobar" && !comment.trim()) { alert("Escribe un comentario"); return; }
    actuar(item.id, accion, comment);
    setComment("");
    setExpanded(false);
  };

  return (
    <div style={{ borderBottom:`1px solid ${T.border}` }}>
      <div onClick={() => setExpanded(!expanded)}
        style={{ padding: compact ? "8px 16px" : "12px 16px", cursor:"pointer", display:"flex", alignItems:"center", gap:10,
          transition:"background .1s", background: expanded ? T.surfaceAlt : "transparent" }}
        onMouseEnter={e => { if(!expanded) e.currentTarget.style.background = "#FFFFFF"; }}
        onMouseLeave={e => { if(!expanded) e.currentTarget.style.background = "transparent"; }}>
        {/* Module icon */}
        {!compact && modInfo && (
          <div style={{ width:24, height:24, borderRadius:4, background:modInfo.color+"15",
            display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <modInfo.icon size={12} color={modInfo.color}/>
          </div>
        )}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:12, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {item.titulo || item.referencia || "Sin título"}
          </div>
          <div style={{ fontSize:9, color:T.inkLight, marginTop:1 }}>
            {item.tipo||""} {item.solicitante && `· por ${config.usuarios.find(u=>u.id===item.solicitante)?.nombre?.split(" ")[0] || item.solicitante}`}
          </div>
        </div>
        {item.monto > 0 && (
          <span style={{ fontFamily:"'DM Mono',monospace", fontSize:10, fontWeight:600, color:T.inkMid, flexShrink:0 }}>
            ${fmtM(item.monto)}
          </span>
        )}
        <Badge estado={item.estado}/>
        <span style={{ fontSize:9, color:T.inkLight, flexShrink:0 }}>{ago(item.fecha)}</span>
        {expanded ? <ChevronDown size={12} color={T.inkLight}/> : <ChevronRight size={12} color={T.inkLight}/>}
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ padding:"0 16px 14px", background:T.surfaceAlt }}>
          {/* Timeline */}
          {(item.historial||[]).length > 0 && (
            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:9, fontWeight:700, color:T.inkLight, textTransform:"uppercase", letterSpacing:1, marginBottom:4 }}>Historial</div>
              {(item.historial||[]).map((h, i) => (
                <div key={i} style={{ display:"flex", gap:8, padding:"4px 0", fontSize:10, borderLeft:`2px solid ${T.border}`, paddingLeft:10, marginLeft:4 }}>
                  <span style={{ color:T.inkLight, minWidth:60 }}>{fmtDate(h.fecha)} {fmtTime(h.fecha)}</span>
                  <span style={{ fontWeight:600 }}>{h.porNombre || h.por}</span>
                  <span style={{ color:T.inkMid }}>
                    {h.accion === "solicitar" ? "solicitó aprobación" :
                     h.accion === "aprobar" ? "✅ aprobó" :
                     h.accion === "rechazar" ? "❌ rechazó" :
                     h.accion === "devolver" ? "🔄 devolvió" : h.accion}
                  </span>
                  {h.comentario && <span style={{ color:T.amber, fontStyle:"italic" }}>💬 {h.comentario}</span>}
                </div>
              ))}
            </div>
          )}

          {/* Action buttons */}
          {canAct && (
            <div style={{ marginTop:8 }}>
              <input value={comment} onChange={e => setComment(e.target.value)}
                placeholder="Comentario (obligatorio para rechazar/devolver)..."
                style={{ width:"100%", padding:"6px 10px", border:`1px solid ${T.border}`, borderRadius:4,
                  fontSize:11, marginBottom:8, background:"#fff" }}/>
              <div style={{ display:"flex", gap:6 }}>
                <Btn sm on={() => doAction("aprobar")}>
                  <Check size={11}/> Aprobar
                </Btn>
                <Btn sm v="sec" on={() => doAction("devolver")} style={{ color:T.amber, borderColor:T.amber+"44" }}>
                  <RotateCcw size={11}/> Devolver
                </Btn>
                <Btn sm v="danger" on={() => doAction("rechazar")}>
                  <X size={11}/> Rechazar
                </Btn>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MODULE TAB (for Ofertas, Compras, etc.)
═══════════════════════════════════════════════ */
function TabModulo({ modulo, items, config, usuarioActivo, actuar, addAprobacion, ofertas }) {
  const [filtro, setFiltro] = useState("todos");
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [newItem, setNewItem] = useState({ titulo:"", referencia:"", monto:0, tipo:"" });

  const modInfo = MODULOS_APROB.find(m => m.id === modulo);
  const filtered = items.filter(a => {
    if (filtro !== "todos" && a.estado !== filtro) return false;
    if (search && !(a.titulo||"").toLowerCase().includes(search.toLowerCase()) &&
        !(a.referencia||"").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a, b) => b.fecha > a.fecha ? 1 : -1);

  const pendientes = items.filter(a => a.estado === "pendiente").length;

  const crearAprobacion = () => {
    if (!newItem.titulo.trim()) return;
    addAprobacion({
      modulo,
      titulo: newItem.titulo,
      referencia: newItem.referencia,
      monto: parseFloat(newItem.monto) || 0,
      tipo: newItem.tipo,
      solicitante: usuarioActivo,
      historial: [{ accion:"solicitar", fecha:now(), por:usuarioActivo,
        porNombre:config.usuarios.find(u=>u.id===usuarioActivo)?.nombre || usuarioActivo, comentario:"" }],
    });
    setNewItem({ titulo:"", referencia:"", monto:0, tipo:"" });
    setShowNew(false);
  };

  const cadena = config.cadenas[modulo] || {};
  const aprobadores = (cadena.aprobadores||[]).map(id => config.usuarios.find(u=>u.id===id)).filter(Boolean);

  return (
    <div className="fade-up">
      {/* Module header */}
      <Card style={{ padding:"14px 18px", marginBottom:14, background:modInfo?.color+"08", border:`1px solid ${modInfo?.color}22` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            {modInfo && <modInfo.icon size={18} color={modInfo.color}/>}
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:T.ink }}>{modInfo?.label}</div>
              <div style={{ fontSize:10, color:T.inkMid }}>
                {items.length} total · {pendientes} pendientes ·
                Aprobadores: {aprobadores.map(u => u.nombre.split(" ")[0]).join(", ") || "Sin configurar"}
                {cadena.umbral > 0 && ` · Umbral: $${fmtM(cadena.umbral)}`}
              </div>
            </div>
          </div>
          <Btn sm on={() => setShowNew(true)}><Plus size={11}/> Nueva solicitud</Btn>
        </div>
      </Card>

      {/* Filters */}
      <div style={{ display:"flex", gap:8, marginBottom:12, alignItems:"center", flexWrap:"wrap" }}>
        <div style={{ display:"flex", gap:0 }}>
          {[["todos","Todos"],["pendiente","Pendientes"],["aprobado","Aprobados"],["rechazado","Rechazados"],["devuelto","Devueltos"]].map(([k,lbl],i,arr) => (
            <button key={k} onClick={() => setFiltro(k)}
              style={{ padding:"5px 12px", fontSize:10, fontWeight:600, cursor:"pointer",
                border:`1px solid ${T.border}`, borderLeft:i>0?"none":undefined,
                borderRadius:i===0?"4px 0 0 4px":i===arr.length-1?"0 4px 4px 0":"0",
                background:filtro===k?T.ink:"#fff", color:filtro===k?"#fff":T.inkMid }}>
              {lbl} {k==="pendiente" && pendientes>0 ? `(${pendientes})` : ""}
            </button>
          ))}
        </div>
        <div style={{ flex:1 }}/>
        <div style={{ position:"relative" }}>
          <Search size={12} style={{ position:"absolute", left:8, top:8, color:T.inkLight }}/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..."
            style={{ ...{border:`1px solid ${T.border}`,borderRadius:4,padding:"6px 10px",fontSize:11,background:"#fff"},
              paddingLeft:26, width:200 }}/>
        </div>
      </div>

      {/* List */}
      <Card style={{ padding:0, overflow:"hidden" }}>
        {filtered.length === 0 ? (
          <div style={{ padding:30, textAlign:"center", color:T.inkLight, fontSize:12 }}>
            Sin aprobaciones {filtro !== "todos" ? `con estado "${filtro}"` : ""} en {modInfo?.label}
          </div>
        ) : filtered.map(a => (
          <ApprovalRow key={a.id} item={a} actuar={actuar} config={config}
            usuarioActivo={usuarioActivo} ofertas={ofertas}/>
        ))}
      </Card>

      {/* New approval modal */}
      {showNew && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:9999,
          display:"flex", alignItems:"center", justifyContent:"center" }} onClick={() => setShowNew(false)}>
          <div onClick={e => e.stopPropagation()}
            style={{ background:"#fff", borderRadius:8, padding:24, width:460, boxShadow:"0 12px 40px rgba(0,0,0,0.2)" }}>
            <div style={{ fontSize:15, fontWeight:700, marginBottom:4 }}>Nueva solicitud de aprobación</div>
            <div style={{ fontSize:11, color:T.inkLight, marginBottom:16 }}>Módulo: {modInfo?.label}</div>

            <div style={{ marginBottom:8 }}>
              <label style={{ display:"block", fontSize:9, fontWeight:700, color:T.inkLight, textTransform:"uppercase", marginBottom:3 }}>Título / Descripción</label>
              <input value={newItem.titulo} onChange={e => setNewItem({...newItem, titulo:e.target.value})}
                placeholder="Ej: Orden de compra acero corrugado" style={{ ...{border:`1px solid ${T.border}`,borderRadius:4,padding:"8px 10px",fontSize:12,background:"#fff"}, width:"100%" }}/>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
              <div>
                <label style={{ display:"block", fontSize:9, fontWeight:700, color:T.inkLight, textTransform:"uppercase", marginBottom:3 }}>Referencia</label>
                <input value={newItem.referencia} onChange={e => setNewItem({...newItem, referencia:e.target.value})}
                  placeholder="OC-001" style={{ ...{border:`1px solid ${T.border}`,borderRadius:4,padding:"8px 10px",fontSize:12,background:"#fff"}, width:"100%" }}/>
              </div>
              <div>
                <label style={{ display:"block", fontSize:9, fontWeight:700, color:T.inkLight, textTransform:"uppercase", marginBottom:3 }}>Monto</label>
                <input type="number" value={newItem.monto||""} onChange={e => setNewItem({...newItem, monto:e.target.value})}
                  placeholder="0" style={{ ...{border:`1px solid ${T.border}`,borderRadius:4,padding:"8px 10px",fontSize:12,background:"#fff"}, width:"100%", fontFamily:"'DM Mono',monospace" }}/>
              </div>
            </div>
            <div style={{ marginBottom:12 }}>
              <label style={{ display:"block", fontSize:9, fontWeight:700, color:T.inkLight, textTransform:"uppercase", marginBottom:3 }}>Tipo de solicitud</label>
              <input value={newItem.tipo} onChange={e => setNewItem({...newItem, tipo:e.target.value})}
                placeholder="Ej: Orden de compra, Pago, Contrato..."
                style={{ ...{border:`1px solid ${T.border}`,borderRadius:4,padding:"8px 10px",fontSize:12,background:"#fff"}, width:"100%" }}/>
            </div>

            <div style={{ background:T.surfaceAlt, borderRadius:4, padding:"8px 12px", fontSize:10, color:T.inkMid, marginBottom:12 }}>
              📋 Aprobadores configurados: <strong>{aprobadores.map(u=>u.nombre.split(" ")[0]).join(", ")||"Ninguno"}</strong>
              {cadena.umbral > 0 && <span> · Umbral auto: <strong>${fmtM(cadena.umbral)}</strong></span>}
            </div>

            <div style={{ display:"flex", gap:8 }}>
              <Btn on={crearAprobacion} style={{ flex:1 }}><Send size={11}/> Solicitar aprobación</Btn>
              <Btn v="sec" on={() => setShowNew(false)} style={{ flex:1 }}>Cancelar</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   CONFIGURATION TAB
═══════════════════════════════════════════════ */
function TabConfig({ config, saveConfig }) {
  const [editUser, setEditUser] = useState(null);
  const [newUser, setNewUser] = useState({ nombre:"", cargo:"", email:"", nivel:3, avatar:"👤" });
  const [showAddUser, setShowAddUser] = useState(false);

  const updCadena = (modulo, key, val) => {
    saveConfig(prev => ({
      ...prev,
      cadenas: { ...prev.cadenas, [modulo]: { ...prev.cadenas[modulo], [key]: val } }
    }));
  };

  const toggleAprobador = (modulo, userId) => {
    const cadena = config.cadenas[modulo] || {};
    const current = cadena.aprobadores || [];
    const next = current.includes(userId) ? current.filter(id => id !== userId) : [...current, userId];
    updCadena(modulo, "aprobadores", next);
  };

  const addUser = () => {
    if (!newUser.nombre.trim()) return;
    saveConfig(prev => ({
      ...prev,
      usuarios: [...prev.usuarios, { ...newUser, id: uid() }],
    }));
    setNewUser({ nombre:"", cargo:"", email:"", nivel:3, avatar:"👤" });
    setShowAddUser(false);
  };

  const delUser = (id) => {
    saveConfig(prev => ({
      ...prev,
      usuarios: prev.usuarios.filter(u => u.id !== id),
      cadenas: Object.fromEntries(Object.entries(prev.cadenas).map(([k,v]) => [k, {
        ...v, aprobadores: (v.aprobadores||[]).filter(a => a !== id)
      }])),
    }));
  };

  const inp = { border:`1px solid ${T.border}`, borderRadius:4, padding:"6px 10px", fontSize:12, background:"#fff" };

  return (
    <div className="fade-up">
      {/* Users */}
      <Card style={{ padding:18, marginBottom:16 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:T.ink }}>Usuarios aprobadores</div>
            <div style={{ fontSize:10, color:T.inkLight }}>Personas que participan en cadenas de aprobación</div>
          </div>
          <Btn sm on={() => setShowAddUser(true)}><Plus size={11}/> Añadir usuario</Btn>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(220px, 1fr))", gap:10 }}>
          {config.usuarios.map(u => (
            <div key={u.id} style={{ border:`1px solid ${T.border}`, borderRadius:6, padding:"10px 14px", background:T.surfaceAlt }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                <span style={{ fontSize:20 }}>{u.avatar}</span>
                <button onClick={() => delUser(u.id)}
                  style={{ background:"none", border:"none", cursor:"pointer", color:T.red, padding:2 }}>
                  <Trash2 size={11}/>
                </button>
              </div>
              <div style={{ fontSize:12, fontWeight:700 }}>{u.nombre}</div>
              <div style={{ fontSize:10, color:T.inkMid }}>{u.cargo}</div>
              <div style={{ fontSize:9, color:T.inkLight, marginTop:2 }}>{u.email}</div>
              <div style={{ display:"flex", alignItems:"center", gap:4, marginTop:4 }}>
                <span style={{ fontSize:8, fontWeight:700, color:T.inkLight, textTransform:"uppercase" }}>Nivel:</span>
                {[1,2,3].map(n => (
                  <button key={n} onClick={() => saveConfig(prev => ({
                    ...prev, usuarios: prev.usuarios.map(x => x.id === u.id ? { ...x, nivel:n } : x)
                  }))}
                    style={{ width:20, height:20, borderRadius:"50%", border:`1px solid ${u.nivel===n?T.green:T.border}`,
                      background:u.nivel===n?T.greenBg:"#fff", color:u.nivel===n?T.green:T.inkLight,
                      fontSize:9, fontWeight:700, cursor:"pointer" }}>{n}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Approval chains per module */}
      <Card style={{ padding:18 }}>
        <div style={{ fontSize:14, fontWeight:700, color:T.ink, marginBottom:4 }}>Cadenas de aprobación por módulo</div>
        <div style={{ fontSize:10, color:T.inkLight, marginBottom:14 }}>
          Define quién aprueba en cada módulo y los umbrales de monto. Si el monto supera el umbral alto, se requiere el aprobador de nivel superior.
        </div>

        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ background:T.surfaceAlt }}>
              <th style={{ padding:"8px 12px", textAlign:"left", fontSize:9, fontWeight:700, color:T.inkLight,
                textTransform:"uppercase", letterSpacing:.5, borderBottom:`2px solid ${T.border}` }}>Módulo</th>
              <th style={{ padding:"8px 12px", textAlign:"left", fontSize:9, fontWeight:700, color:T.inkLight,
                textTransform:"uppercase", borderBottom:`2px solid ${T.border}` }}>Aprobadores</th>
              <th style={{ padding:"8px 12px", textAlign:"right", fontSize:9, fontWeight:700, color:T.inkLight,
                textTransform:"uppercase", borderBottom:`2px solid ${T.border}`, width:120 }}>Umbral estándar</th>
              <th style={{ padding:"8px 12px", textAlign:"right", fontSize:9, fontWeight:700, color:T.inkLight,
                textTransform:"uppercase", borderBottom:`2px solid ${T.border}`, width:120 }}>Umbral alto</th>
              <th style={{ padding:"8px 12px", textAlign:"left", fontSize:9, fontWeight:700, color:T.inkLight,
                textTransform:"uppercase", borderBottom:`2px solid ${T.border}`, width:140 }}>Aprobador nivel alto</th>
            </tr>
          </thead>
          <tbody>
            {MODULOS_APROB.map(m => {
              const cadena = config.cadenas[m.id] || {};
              const Icon = m.icon;
              return (
                <tr key={m.id} style={{ borderBottom:`1px solid ${T.border}` }}>
                  <td style={{ padding:"10px 12px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <Icon size={14} color={m.color}/>
                      <span style={{ fontSize:12, fontWeight:600 }}>{m.label}</span>
                    </div>
                  </td>
                  <td style={{ padding:"10px 12px" }}>
                    <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                      {config.usuarios.map(u => {
                        const active = (cadena.aprobadores||[]).includes(u.id);
                        return (
                          <button key={u.id} onClick={() => toggleAprobador(m.id, u.id)}
                            style={{ padding:"3px 8px", fontSize:9, fontWeight:600, borderRadius:4, cursor:"pointer",
                              border:`1px solid ${active?T.green:T.border}`,
                              background:active?T.greenBg:"#fff", color:active?T.green:T.inkLight }}>
                            {active ? <Lock size={8} style={{ marginRight:3 }}/> : <Unlock size={8} style={{ marginRight:3 }}/>}
                            {u.nombre.split(" ")[0]}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                  <td style={{ padding:"10px 12px" }}>
                    <input type="number" value={cadena.umbral||""} placeholder="0"
                      onChange={e => updCadena(m.id, "umbral", parseFloat(e.target.value)||0)}
                      style={{ ...inp, width:"100%", textAlign:"right", fontFamily:"'DM Mono',monospace", fontSize:10 }}/>
                  </td>
                  <td style={{ padding:"10px 12px" }}>
                    <input type="number" value={cadena.umbralAlto||""} placeholder="0"
                      onChange={e => updCadena(m.id, "umbralAlto", parseFloat(e.target.value)||0)}
                      style={{ ...inp, width:"100%", textAlign:"right", fontFamily:"'DM Mono',monospace", fontSize:10 }}/>
                  </td>
                  <td style={{ padding:"10px 12px" }}>
                    <select value={cadena.aprobadorAlto||""} onChange={e => updCadena(m.id, "aprobadorAlto", e.target.value)}
                      style={{ ...inp, width:"100%", fontSize:10 }}>
                      <option value="">— Sin definir —</option>
                      {config.usuarios.filter(u=>u.nivel<=1).map(u => (
                        <option key={u.id} value={u.id}>{u.nombre}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {/* Add user modal */}
      {showAddUser && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:9999,
          display:"flex", alignItems:"center", justifyContent:"center" }} onClick={() => setShowAddUser(false)}>
          <div onClick={e => e.stopPropagation()}
            style={{ background:"#fff", borderRadius:8, padding:24, width:400, boxShadow:"0 12px 40px rgba(0,0,0,0.2)" }}>
            <div style={{ fontSize:15, fontWeight:700, marginBottom:12 }}>Nuevo usuario aprobador</div>
            {[
              ["nombre","Nombre completo","Ej: Carlos Rodríguez"],
              ["cargo","Cargo","Ej: Residente de obra"],
              ["email","Email","carlos@habitaris.co"],
            ].map(([k,lbl,ph]) => (
              <div key={k} style={{ marginBottom:8 }}>
                <label style={{ display:"block", fontSize:9, fontWeight:700, color:T.inkLight, textTransform:"uppercase", marginBottom:3 }}>{lbl}</label>
                <input value={newUser[k]} onChange={e => setNewUser({...newUser, [k]:e.target.value})}
                  placeholder={ph} style={{ ...inp, width:"100%" }}/>
              </div>
            ))}
            <div style={{ display:"flex", gap:8, marginBottom:8 }}>
              <div style={{ flex:1 }}>
                <label style={{ display:"block", fontSize:9, fontWeight:700, color:T.inkLight, textTransform:"uppercase", marginBottom:3 }}>Avatar</label>
                <div style={{ display:"flex", gap:4 }}>
                  {["👤","👩","👷","📋","🏗️","💼","🔧","🦺"].map(a => (
                    <button key={a} onClick={() => setNewUser({...newUser, avatar:a})}
                      style={{ width:28, height:28, borderRadius:4, cursor:"pointer", fontSize:16,
                        border:`2px solid ${newUser.avatar===a?T.green:T.border}`,
                        background:newUser.avatar===a?T.greenBg:"#fff" }}>{a}</button>
                  ))}
                </div>
              </div>
              <div style={{ width:80 }}>
                <label style={{ display:"block", fontSize:9, fontWeight:700, color:T.inkLight, textTransform:"uppercase", marginBottom:3 }}>Nivel</label>
                <select value={newUser.nivel} onChange={e => setNewUser({...newUser, nivel:+e.target.value})}
                  style={{ ...inp, width:"100%" }}>
                  <option value={1}>1 (Director)</option>
                  <option value={2}>2 (Coordinador)</option>
                  <option value={3}>3 (Operativo)</option>
                </select>
              </div>
            </div>
            <div style={{ display:"flex", gap:8, marginTop:12 }}>
              <Btn on={addUser} style={{ flex:1 }}><Check size={11}/> Guardar</Btn>
              <Btn v="sec" on={() => setShowAddUser(false)} style={{ flex:1 }}>Cancelar</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
