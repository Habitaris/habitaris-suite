import React, { useState, useEffect, useMemo } from "react";
import { store } from "../core/store.js";
import { getConfig } from "./Configuracion.jsx";
import { getPlantillas, sendEmail, enviarTest, EMAIL_TIPOS } from "../utils/emailService";
import { Mail, FileText, Bell, Clock, Search, Copy, Edit3, Plus, Trash2, Send, CheckCircle, XCircle, AlertCircle, Filter, ChevronDown, Eye, Save, RefreshCw, Settings } from "lucide-react";

/* ── Theme ── */
const T = {
  ink:"#111",inkMid:"#555",inkLight:"#999",
  bg:"#F5F5F5",surface:"#fff",surfaceAlt:"#FAFAFA",border:"#E0E0E0",
  accent:"#111",green:"#2D6A2E",greenBg:"#E8F4EE",
  amber:"#8C6A00",amberBg:"#FAF0E0",
  red:"#B91C1C",redBg:"#FAE8E8",
  blue:"#1E40AF",blueBg:"#EFF6FF",
};
const F = { fontFamily:"'DM Sans',sans-serif" };
const Card = ({ children, style }) => (
  <div style={{ background:T.surface, borderRadius:8, border:`1px solid ${T.border}`, padding:16, ...style }}>{children}</div>
);
const Btn = ({ children, on, v, disabled, style }) => (
  <button onClick={on} disabled={disabled}
    style={{ ...F, display:"inline-flex", alignItems:"center", gap:5, padding:"7px 14px",
      background: v==="sec" ? "transparent" : v==="danger" ? T.red : T.accent,
      color: v==="sec" ? T.ink : "#fff",
      border: v==="sec" ? `1px solid ${T.border}` : "none",
      borderRadius:5, cursor: disabled?"not-allowed":"pointer", fontSize:11, fontWeight:600,
      opacity: disabled?.5:1, transition:"all .15s", ...style }}>
    {children}
  </button>
);
const Badge = ({ children, color, bg }) => (
  <span style={{ fontSize:9, fontWeight:700, padding:"2px 8px", borderRadius:10, color, background:bg }}>{children}</span>
);
const inp = { width:"100%", padding:"8px 10px", border:`1px solid ${T.border}`, borderRadius:4, fontSize:12, color:T.ink, fontFamily:"'DM Sans',sans-serif", background:T.surface };

/* ── Storage keys ── */
const KEYS = {
  plantillas: "hab:comunicaciones:plantillas",
  historial: "hab:comunicaciones:historial",
  notificaciones: "hab:comunicaciones:notificaciones",
};

/* ── Module labels ── */
const MODULOS = [
  { id:"general", lbl:"General" },
  { id:"formularios", lbl:"Formularios" },
  { id:"crm", lbl:"CRM / Ofertas" },
  { id:"rrhh", lbl:"RRHH" },
  { id:"sst", lbl:"SST" },
  { id:"calidad", lbl:"Calidad" },
  { id:"postventa", lbl:"Postventa" },
  { id:"proyectos", lbl:"Proyectos" },
  { id:"logistica", lbl:"Logística" },
  { id:"compras", lbl:"Compras" },
  { id:"login", lbl:"Login / Usuarios" },
];

/* ── Tipo labels ── */
const TIPO_LABELS = {
  form_enviado: { lbl:"Formulario enviado", mod:"formularios", icon:"📋", color:T.blue, bg:T.blueBg },
  form_recibido: { lbl:"Respuesta recibida", mod:"formularios", icon:"✅", color:T.green, bg:T.greenBg },
  oferta_enviada: { lbl:"Oferta enviada", mod:"crm", icon:"📄", color:T.blue, bg:T.blueBg },
  oferta_aprobada: { lbl:"Oferta aprobada", mod:"crm", icon:"🎉", color:T.green, bg:T.greenBg },
  oferta_rechazada: { lbl:"Oferta rechazada", mod:"crm", icon:"❌", color:T.red, bg:T.redBg },
  oferta_revision: { lbl:"Oferta en revisión", mod:"crm", icon:"🔄", color:T.amber, bg:T.amberBg },
  notificacion: { lbl:"Notificación", mod:"general", icon:"🔔", color:T.ink, bg:"#F0F0F0" },
  rrhh_novedad: { lbl:"Novedad RRHH", mod:"rrhh", icon:"📝", color:T.amber, bg:T.amberBg },
  invitacion: { lbl:"Invitación", mod:"login", icon:"👋", color:T.blue, bg:T.blueBg },
  bienvenida: { lbl:"Bienvenida", mod:"login", icon:"👋", color:T.green, bg:T.greenBg },
  test: { lbl:"Email de prueba", mod:"general", icon:"🧪", color:T.inkMid, bg:"#F0F0F0" },
  generico: { lbl:"Genérico", mod:"general", icon:"✉️", color:T.ink, bg:"#F0F0F0" },
};

/* ── Helpers ── */
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);
const today = () => new Date().toISOString().slice(0,10);
const now = () => new Date().toLocaleString("es-CO",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",hour12:false});

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════ */
export default function Comunicaciones({ lang }) {
  const [tab, setTab] = useState("plantillas");
  const [plantillas, setPlantillas] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [notifRules, setNotifRules] = useState([]);

  // Load
  useEffect(() => {
    (async () => {
      try {
        const p = await store.get(KEYS.plantillas);
        if (p) setPlantillas(JSON.parse(p));
      } catch {}
      try {
        const h = await store.get(KEYS.historial);
        if (h) setHistorial(JSON.parse(h));
      } catch {}
      try {
        const n = await store.get(KEYS.notificaciones);
        if (n) setNotifRules(JSON.parse(n));
      } catch {}
    })();
  }, []);

  // Save helpers
  const savePlantillas = (data) => { setPlantillas(data); store.set(KEYS.plantillas, JSON.stringify(data)); };
  const saveHistorial = (data) => { setHistorial(data); store.set(KEYS.historial, JSON.stringify(data)); };
  const saveNotifRules = (data) => { setNotifRules(data); store.set(KEYS.notificaciones, JSON.stringify(data)); };

  // Merge: predefinidas + custom
  const defaults = getPlantillas();
  const mergedPlantillas = useMemo(() => {
    const customMap = {};
    plantillas.forEach(p => { customMap[p.id] = p; });
    const merged = defaults.map(d => customMap[d.id] ? { ...d, ...customMap[d.id], isCustom:true } : { ...d, isCustom:false });
    const extraCustom = plantillas.filter(p => !defaults.find(d => d.id === p.id)).map(p => ({ ...p, isCustom:true, isCloned:true }));
    return [...merged, ...extraCustom];
  }, [plantillas, defaults]);

  const TABS = [
    { id:"plantillas", label:"Plantillas", icon:FileText, count:mergedPlantillas.length },
    { id:"historial", label:"Historial", icon:Clock, count:historial.length },
    { id:"notificaciones", label:"Notificaciones", icon:Bell, count:notifRules.length },
    { id:"config", label:"Configuración", icon:Settings },
  ];

  return (
    <div style={{...F, maxWidth:1200, margin:"0 auto", padding:"20px 16px 80px"}}>
      <style>{`
        .fade-up{animation:fadeUp .3s ease}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* Header */}
      <div style={{marginBottom:20}}>
        <h1 style={{margin:0,fontSize:22,fontWeight:700,color:T.ink}}>📧 Comunicaciones</h1>
        <p style={{margin:"4px 0 0",fontSize:11,color:T.inkMid}}>Plantillas de correo, historial de envíos y configuración de notificaciones</p>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:4,marginBottom:18,borderBottom:`2px solid ${T.border}`,paddingBottom:0}}>
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{...F,display:"flex",alignItems:"center",gap:6,padding:"10px 16px",
                border:"none",borderBottom:active?`2px solid ${T.accent}`:"2px solid transparent",
                background:"transparent",cursor:"pointer",fontSize:12,fontWeight:active?700:500,
                color:active?T.ink:T.inkMid,marginBottom:-2,transition:"all .15s"}}>
              <Icon size={13}/> {t.label}
              {t.count !== undefined && <span style={{fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:8,background:active?T.accent:"#E8E8E8",color:active?"#fff":T.inkMid}}>{t.count}</span>}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="fade-up">
        {tab === "plantillas" && <TabPlantillas plantillas={mergedPlantillas} onSave={savePlantillas} customList={plantillas} />}
        {tab === "historial" && <TabHistorial historial={historial} onClear={() => saveHistorial([])} />}
        {tab === "notificaciones" && <TabNotificaciones rules={notifRules} onSave={saveNotifRules} />}
        {tab === "config" && <TabConfig />}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   TAB: PLANTILLAS
   ══════════════════════════════════════════════════════════════ */
function TabPlantillas({ plantillas, onSave, customList }) {
  const [search, setSearch] = useState("");
  const [filterMod, setFilterMod] = useState("");
  const [editing, setEditing] = useState(null);
  const [editData, setEditData] = useState({});

  const filtered = plantillas.filter(p => {
    const info = TIPO_LABELS[p.id] || {};
    const q = search.toLowerCase();
    const matchSearch = !q || p.id.includes(q) || (info.lbl||"").toLowerCase().includes(q) || p.subject.toLowerCase().includes(q);
    const matchMod = !filterMod || (info.mod||"general") === filterMod;
    return matchSearch && matchMod;
  });

  const startEdit = (p) => { setEditing(p.id); setEditData({ subject: p.subject, message: p.message }); };
  const cancelEdit = () => { setEditing(null); setEditData({}); };
  const saveEdit = () => {
    const updated = [...customList];
    const idx = updated.findIndex(c => c.id === editing);
    if (idx >= 0) {
      updated[idx] = { ...updated[idx], ...editData };
    } else {
      updated.push({ id: editing, ...editData });
    }
    onSave(updated);
    setEditing(null);
    setEditData({});
  };

  const clonePlantilla = (p) => {
    const newId = p.id + "_" + uid();
    const info = TIPO_LABELS[p.id] || {};
    const cloned = { id: newId, subject: p.subject + " (copia)", message: p.message, requiere: p.requiere || [], clonedFrom: p.id };
    onSave([...customList, cloned]);
  };

  const deletePlantilla = (id) => {
    if (!confirm("¿Eliminar esta plantilla personalizada?")) return;
    onSave(customList.filter(c => c.id !== id));
  };

  const resetPlantilla = (id) => {
    onSave(customList.filter(c => c.id !== id));
  };

  return (
    <div>
      {/* Filters */}
      <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap"}}>
        <div style={{position:"relative",flex:1,minWidth:200}}>
          <Search size={13} style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",color:T.inkLight}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar plantilla..."
            style={{...inp,paddingLeft:30}}/>
        </div>
        <select value={filterMod} onChange={e=>setFilterMod(e.target.value)}
          style={{...inp,width:180,cursor:"pointer"}}>
          <option value="">Todos los módulos</option>
          {MODULOS.map(m => <option key={m.id} value={m.id}>{m.lbl}</option>)}
        </select>
      </div>

      {/* Grid */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(340,1fr))",gap:12}}>
        {filtered.map(p => {
          const info = TIPO_LABELS[p.id] || TIPO_LABELS[p.clonedFrom] || { lbl:p.id, icon:"✉️", color:T.ink, bg:"#F0F0F0", mod:"general" };
          const isEditing = editing === p.id;

          return (
            <Card key={p.id} style={{padding:14,borderLeft:`3px solid ${info.color}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:18}}>{info.icon}</span>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:T.ink}}>{info.lbl}</div>
                    <div style={{fontSize:9,color:T.inkLight}}>{p.id}</div>
                  </div>
                </div>
                <div style={{display:"flex",gap:4}}>
                  {p.isCustom && <Badge color={T.green} bg={T.greenBg}>editada</Badge>}
                  {p.isCloned && <Badge color={T.blue} bg={T.blueBg}>clonada</Badge>}
                </div>
              </div>

              {isEditing ? (
                <div>
                  <label style={{fontSize:9,fontWeight:700,color:T.inkMid,textTransform:"uppercase"}}>Subject</label>
                  <input value={editData.subject} onChange={e=>setEditData({...editData,subject:e.target.value})} style={{...inp,marginBottom:8}}/>
                  <label style={{fontSize:9,fontWeight:700,color:T.inkMid,textTransform:"uppercase"}}>Mensaje</label>
                  <textarea value={editData.message} onChange={e=>setEditData({...editData,message:e.target.value})}
                    style={{...inp,minHeight:120,resize:"vertical"}}/>
                  <div style={{display:"flex",gap:6,marginTop:8}}>
                    <Btn on={saveEdit}><Save size={10}/> Guardar</Btn>
                    <Btn v="sec" on={cancelEdit}>Cancelar</Btn>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{fontSize:10,fontWeight:600,color:T.inkMid,marginBottom:4}}>Subject:</div>
                  <div style={{fontSize:11,color:T.ink,marginBottom:8,padding:"6px 8px",background:T.surfaceAlt,borderRadius:4,fontFamily:"monospace",wordBreak:"break-all"}}>{p.subject}</div>
                  <div style={{fontSize:10,fontWeight:600,color:T.inkMid,marginBottom:4}}>Mensaje:</div>
                  <div style={{fontSize:10,color:T.inkMid,lineHeight:1.5,maxHeight:80,overflow:"hidden",padding:"6px 8px",background:T.surfaceAlt,borderRadius:4,whiteSpace:"pre-wrap"}}>{p.message}</div>

                  {p.requiere?.length > 0 && (
                    <div style={{marginTop:8,display:"flex",gap:4,flexWrap:"wrap"}}>
                      <span style={{fontSize:8,color:T.inkLight,fontWeight:700}}>Variables:</span>
                      {p.requiere.map(v => <span key={v} style={{fontSize:8,padding:"1px 5px",background:"#F0F0F0",borderRadius:3,color:T.inkMid,fontFamily:"monospace"}}>{`{{${v}}}`}</span>)}
                    </div>
                  )}

                  <div style={{display:"flex",gap:6,marginTop:10,borderTop:`1px solid ${T.border}`,paddingTop:8}}>
                    <Btn v="sec" on={() => startEdit(p)} style={{fontSize:10,padding:"5px 10px"}}><Edit3 size={10}/> Editar</Btn>
                    <Btn v="sec" on={() => clonePlantilla(p)} style={{fontSize:10,padding:"5px 10px"}}><Copy size={10}/> Duplicar</Btn>
                    {p.isCustom && !p.isCloned && <Btn v="sec" on={() => resetPlantilla(p.id)} style={{fontSize:10,padding:"5px 10px"}}><RefreshCw size={10}/> Reset</Btn>}
                    {p.isCloned && <Btn v="danger" on={() => deletePlantilla(p.id)} style={{fontSize:10,padding:"5px 10px"}}><Trash2 size={10}/></Btn>}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <Card style={{textAlign:"center",padding:40}}>
          <Mail size={24} color={T.inkLight}/>
          <p style={{fontSize:12,color:T.inkMid,margin:"8px 0 0"}}>No se encontraron plantillas</p>
        </Card>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   TAB: HISTORIAL
   ══════════════════════════════════════════════════════════════ */
function TabHistorial({ historial, onClear }) {
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState("");

  const sorted = [...historial].sort((a,b) => new Date(b.fecha) - new Date(a.fecha));
  const filtered = sorted.filter(h => {
    const q = search.toLowerCase();
    const matchSearch = !q || (h.to||"").toLowerCase().includes(q) || (h.subject||"").toLowerCase().includes(q) || (h.tipo||"").includes(q);
    const matchTipo = !filterTipo || h.tipo === filterTipo;
    return matchSearch && matchTipo;
  });

  // KPIs
  const total = historial.length;
  const exitosos = historial.filter(h => h.ok).length;
  const fallidos = historial.filter(h => !h.ok).length;
  const hoy = historial.filter(h => h.fecha?.startsWith(today())).length;

  return (
    <div>
      {/* KPIs */}
      <div style={{display:"flex",gap:10,marginBottom:16}}>
        {[
          { label:"Total enviados", value:total, icon:Mail, color:T.ink },
          { label:"Exitosos", value:exitosos, icon:CheckCircle, color:T.green },
          { label:"Fallidos", value:fallidos, icon:XCircle, color:T.red },
          { label:"Hoy", value:hoy, icon:Clock, color:T.blue },
        ].map((k,i) => {
          const Icon = k.icon;
          return (
            <Card key={i} style={{flex:1,padding:12,textAlign:"center"}}>
              <Icon size={16} color={k.color} style={{marginBottom:4}}/>
              <div style={{fontSize:20,fontWeight:800,color:k.color}}>{k.value}</div>
              <div style={{fontSize:9,color:T.inkMid,fontWeight:600}}>{k.label}</div>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <div style={{display:"flex",gap:10,marginBottom:14,justifyContent:"space-between"}}>
        <div style={{display:"flex",gap:10,flex:1}}>
          <div style={{position:"relative",flex:1,maxWidth:300}}>
            <Search size={13} style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",color:T.inkLight}}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por email o asunto..."
              style={{...inp,paddingLeft:30}}/>
          </div>
          <select value={filterTipo} onChange={e=>setFilterTipo(e.target.value)}
            style={{...inp,width:180,cursor:"pointer"}}>
            <option value="">Todos los tipos</option>
            {EMAIL_TIPOS.map(t => <option key={t} value={t}>{(TIPO_LABELS[t]||{}).lbl || t}</option>)}
          </select>
        </div>
        {historial.length > 0 && <Btn v="danger" on={onClear} style={{fontSize:10}}><Trash2 size={10}/> Limpiar historial</Btn>}
      </div>

      {/* Table */}
      <Card style={{padding:0,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
          <thead>
            <tr style={{borderBottom:`2px solid ${T.border}`,background:T.surfaceAlt}}>
              {["Estado","Tipo","Destinatario","Asunto","Fecha",""].map(h => (
                <th key={h} style={{padding:"9px 10px",textAlign:"left",fontSize:9,letterSpacing:1,textTransform:"uppercase",color:T.inkLight,fontWeight:700}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} style={{textAlign:"center",padding:40,color:T.inkLight,fontSize:12}}>
                {historial.length === 0 ? "No se han enviado correos aún" : "Sin resultados para el filtro"}
              </td></tr>
            ) : filtered.slice(0,100).map((h,i) => {
              const info = TIPO_LABELS[h.tipo] || { lbl:h.tipo, icon:"✉️", color:T.ink, bg:"#F0F0F0" };
              return (
                <tr key={i} style={{borderBottom:`1px solid ${T.border}`}}>
                  <td style={{padding:"8px 10px"}}>
                    {h.ok ? <CheckCircle size={14} color={T.green}/> : <XCircle size={14} color={T.red}/>}
                  </td>
                  <td style={{padding:"8px 10px"}}>
                    <Badge color={info.color} bg={info.bg}>{info.icon} {info.lbl}</Badge>
                  </td>
                  <td style={{padding:"8px 10px",color:T.ink,fontWeight:500}}>{h.to}</td>
                  <td style={{padding:"8px 10px",color:T.inkMid,maxWidth:250,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{h.subject}</td>
                  <td style={{padding:"8px 10px",color:T.inkLight,fontSize:10,whiteSpace:"nowrap"}}>{h.fecha}</td>
                  <td style={{padding:"8px 10px"}}>
                    {!h.ok && <span style={{fontSize:9,color:T.red}} title={h.error}>ver error</span>}
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

/* ══════════════════════════════════════════════════════════════
   TAB: NOTIFICACIONES
   ══════════════════════════════════════════════════════════════ */
function TabNotificaciones({ rules, onSave }) {
  const cfg = getConfig();
  const adminEmail = cfg.correo?.emailPrincipal || "comercial@habitaris.co";

  const defaultRules = [
    { id:"form_recibido", evento:"Respuesta a formulario recibida", modulo:"formularios", destinatario:adminEmail, activo:true },
    { id:"oferta_aprobada", evento:"Oferta aprobada por cliente", modulo:"crm", destinatario:adminEmail, activo:true },
    { id:"oferta_rechazada", evento:"Oferta rechazada por cliente", modulo:"crm", destinatario:adminEmail, activo:true },
    { id:"oferta_revision", evento:"Oferta en revisión", modulo:"crm", destinatario:adminEmail, activo:true },
    { id:"rrhh_novedad", evento:"Nueva novedad RRHH", modulo:"rrhh", destinatario:adminEmail, activo:false },
  ];

  const merged = useMemo(() => {
    const ruleMap = {};
    rules.forEach(r => { ruleMap[r.id] = r; });
    return defaultRules.map(d => ruleMap[d.id] ? { ...d, ...ruleMap[d.id] } : d);
  }, [rules]);

  const toggle = (id) => {
    const updated = merged.map(r => r.id === id ? { ...r, activo: !r.activo } : r);
    onSave(updated);
  };

  const updateEmail = (id, email) => {
    const updated = merged.map(r => r.id === id ? { ...r, destinatario: email } : r);
    onSave(updated);
  };

  return (
    <div>
      <Card style={{marginBottom:14,padding:12,background:T.surfaceAlt}}>
        <div style={{fontSize:11,color:T.inkMid,lineHeight:1.6}}>
          <strong>Notificaciones automáticas</strong> — Cuando ocurre un evento en un módulo, se envía un correo automático al destinatario configurado usando la plantilla correspondiente.
        </div>
      </Card>

      <Card style={{padding:0,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
          <thead>
            <tr style={{borderBottom:`2px solid ${T.border}`,background:T.surfaceAlt}}>
              {["Activo","Evento","Módulo","Destinatario","Plantilla"].map(h => (
                <th key={h} style={{padding:"10px 12px",textAlign:"left",fontSize:9,letterSpacing:1,textTransform:"uppercase",color:T.inkLight,fontWeight:700}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {merged.map(r => {
              const info = TIPO_LABELS[r.id] || {};
              const mod = MODULOS.find(m => m.id === r.modulo);
              return (
                <tr key={r.id} style={{borderBottom:`1px solid ${T.border}`,opacity:r.activo?1:0.5}}>
                  <td style={{padding:"10px 12px"}}>
                    <button onClick={() => toggle(r.id)}
                      style={{width:36,height:20,borderRadius:10,border:"none",cursor:"pointer",position:"relative",
                        background:r.activo?T.green:"#CCC",transition:"all .2s"}}>
                      <div style={{width:16,height:16,borderRadius:8,background:"#fff",position:"absolute",top:2,
                        left:r.activo?18:2,transition:"all .2s",boxShadow:"0 1px 3px rgba(0,0,0,.2)"}}/>
                    </button>
                  </td>
                  <td style={{padding:"10px 12px",fontWeight:600,color:T.ink}}>{r.evento}</td>
                  <td style={{padding:"10px 12px"}}><Badge color={T.ink} bg="#F0F0F0">{mod?.lbl || r.modulo}</Badge></td>
                  <td style={{padding:"10px 12px"}}>
                    <input value={r.destinatario} onChange={e => updateEmail(r.id, e.target.value)}
                      style={{...inp,width:220,fontSize:11}} placeholder="email@empresa.com"/>
                  </td>
                  <td style={{padding:"10px 12px"}}>
                    <span style={{fontSize:10,color:T.inkLight,fontFamily:"monospace"}}>{r.id}</span>
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

/* ══════════════════════════════════════════════════════════════
   TAB: CONFIG RÁPIDA
   ══════════════════════════════════════════════════════════════ */
function TabConfig() {
  const cfg = getConfig();
  const [testTo, setTestTo] = useState("");
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!testTo) return;
    setSending(true); setStatus("Enviando...");
    try {
      const result = await enviarTest(testTo);
      setStatus(result.ok ? "✅ Email enviado correctamente vía Resend" : "❌ " + result.error);
    } catch(e) { setStatus("❌ " + e.message); }
    setSending(false);
  };

  return (
    <div style={{maxWidth:600}}>
      <Card style={{marginBottom:16}}>
        <div style={{fontSize:13,fontWeight:700,color:T.ink,marginBottom:12}}>📧 Configuración de correo</div>

        <div style={{marginBottom:14}}>
          <label style={{fontSize:9,fontWeight:700,color:T.inkMid,textTransform:"uppercase"}}>Remitente</label>
          <div style={{padding:"8px 10px",background:T.surfaceAlt,borderRadius:4,fontSize:12,color:T.ink,border:`1px solid ${T.border}`}}>
            {cfg.correo?.emailPrincipal || "comercial@habitaris.co"}
          </div>
          <div style={{fontSize:9,color:T.inkLight,marginTop:4}}>Se configura desde Configuración → Empresa</div>
        </div>

        <div style={{marginBottom:14}}>
          <label style={{fontSize:9,fontWeight:700,color:T.inkMid,textTransform:"uppercase"}}>Proveedor</label>
          <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:T.greenBg,borderRadius:4,border:`1px solid ${T.green}22`}}>
            <CheckCircle size={14} color={T.green}/>
            <span style={{fontSize:12,fontWeight:600,color:T.green}}>Resend</span>
            <span style={{fontSize:10,color:T.inkMid}}>— Dominio habitaris.co verificado (SPF + DKIM + DMARC)</span>
          </div>
        </div>

        <div style={{marginBottom:14}}>
          <label style={{fontSize:9,fontWeight:700,color:T.inkMid,textTransform:"uppercase"}}>Marca blanca</label>
          <div style={{display:"flex",gap:8,alignItems:"center",padding:"8px 10px",background:T.surfaceAlt,borderRadius:4,border:`1px solid ${T.border}`}}>
            {cfg.apariencia?.logo && <img src={cfg.apariencia.logo} alt="Logo" style={{height:20,objectFit:"contain"}}/>}
            <span style={{fontSize:12,color:T.ink}}>{cfg.empresa?.nombre || "Habitaris"}</span>
            <div style={{display:"flex",gap:3,marginLeft:"auto"}}>
              <div style={{width:14,height:14,borderRadius:"50%",background:cfg.apariencia?.colorPrimario||"#111",border:`1px solid ${T.border}`}}/>
              <div style={{width:14,height:14,borderRadius:"50%",background:cfg.apariencia?.colorSecundario||"#3B3B3B",border:`1px solid ${T.border}`}}/>
              <div style={{width:14,height:14,borderRadius:"50%",background:cfg.apariencia?.colorAcento||"#111",border:`1px solid ${T.border}`}}/>
            </div>
          </div>
          <div style={{fontSize:9,color:T.inkLight,marginTop:4}}>Se configura desde Configuración → Marca / Apariencia</div>
        </div>
      </Card>

      <Card>
        <div style={{fontSize:13,fontWeight:700,color:T.ink,marginBottom:12}}>🧪 Enviar email de prueba</div>
        <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
          <div style={{flex:1}}>
            <input value={testTo} onChange={e=>setTestTo(e.target.value)} placeholder="tu@email.com" style={inp}/>
          </div>
          <Btn on={send} disabled={sending}><Send size={10}/> {sending?"Enviando...":"Enviar test"}</Btn>
        </div>
        {status && <div style={{marginTop:8,fontSize:11,color:status.includes("✅")?T.green:T.red,fontWeight:600}}>{status}</div>}
      </Card>
    </div>
  );
}
