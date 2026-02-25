import React, { useState, useEffect, useCallback, useMemo } from "react";
import { store } from "../core/store.js";

import {
  Calendar, Plus, Trash2, Edit3, Check, X, ChevronDown, ChevronRight,
  Save, Search, Download, BarChart2, Clock, AlertTriangle, CheckCircle,
  Target, Flag, Users, FileText, Eye, TrendingUp, Layers
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

const T = {
  bg:"#F5F4F1",surface:"#FFFFFF",surfaceAlt:"#FFFFFF",ink:"#111",inkMid:"#555",inkLight:"#909090",
  inkXLight:"#C8C5BE",border:"#E0E0E0",accent:"#EDEBE7",
  green:"#111111",greenBg:"#E8F4EE",red:"#B91C1C",redBg:"#FAE8E8",
  amber:"#8C6A00",amberBg:"#FAF0E0",blue:"#3B3B3B",blueBg:"#F0F0F0",
  purple:"#5B3A8C",purpleBg:"#F0ECF6",
  shadow:"0 1px 3px rgba(0,0,0,.06),0 4px 16px rgba(0,0,0,.05)",
};

const uid = () => Math.random().toString(36).slice(2, 9);
const today = () => new Date().toISOString().split("T")[0];
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x.toISOString().split("T")[0]; };
const diffDays = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);
const pct = (n) => Math.min(100, Math.max(0, Math.round(n)));
const fmtD = (d) => d ? new Date(d + "T12:00:00").toLocaleDateString("es-CO", { day:"2-digit", month:"short" }) : "—";

function useStore(key, init) {
  const lsKey = "habitaris_proy";
  const [data, setData] = useState(() => {
    try { const d = JSON.parse(store.getSync(lsKey))||{}; return d[key]!=null ? d[key] : init; } catch { return init; }
  });
  const save = useCallback((v) => {
    const val = typeof v === "function" ? v(data) : v;
    setData(val);
    try { const d = JSON.parse(store.getSync(lsKey))||{}; d[key]=val; store.set(lsKey,JSON.stringify(d)); } catch {}
  }, [key, data]);
  return [data, save];
}

const Card = ({ children, style }) => <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:8, boxShadow:T.shadow, ...style }}>{children}</div>;
const Btn = ({ children, v, sm, on, style, ...p }) => (
  <button onClick={on} style={{ display:"inline-flex", alignItems:"center", gap:5,
    padding:sm?"5px 10px":"8px 16px", fontSize:sm?10:11, fontWeight:600,
    border:v==="sec"?`1px solid ${T.border}`:"none", borderRadius:5, cursor:"pointer",
    background:v==="sec"?"#fff":v==="danger"?T.redBg:T.ink,
    color:v==="sec"?T.inkMid:v==="danger"?T.red:"#fff", ...style }} {...p}>{children}</button>
);

/* ─── TABS ─── */
const TABS = [
  { id:"dashboard",lbl:"Dashboard",  I:TrendingUp, desc:"KPIs y estado general" },
  { id:"gantt",    lbl:"Cronograma",   I:Calendar,    desc:"Diagrama de Gantt y programación" },
  { id:"avances",  lbl:"Avances",      I:TrendingUp,  desc:"Registro de avance por actividad" },
  { id:"hitos",    lbl:"Hitos",        I:Flag,        desc:"Hitos y entregables del proyecto" },
  { id:"tablero",  lbl:"Tablero",      I:Layers,      desc:"Vista Kanban de tareas" },
  { id:"equipo",   lbl:"Equipo",       I:Users,       desc:"Asignación de recursos" },
];

/* ═══ MAIN ═══ */
export default function HabitarisProyectos() {
  const [tab, setTab] = useState("dashboard");
  const [proyectos, saveProyectos] = useStore("hab:proyectos:lista", []);
  const [actProy, setActProy] = useState(null);
  const [actividades, saveActividades] = useStore("hab:proyectos:actividades", []);
  const [hitos, saveHitos] = useStore("hab:proyectos:hitos", []);

  const proy = proyectos.find(p => p.id === actProy);

  const addProyecto = () => {
    const n = { id:uid(), nombre:"Nuevo proyecto", inicio:today(), fin:addDays(today(),90), estado:"activo", descripcion:"", color:T.purple };
    saveProyectos(prev => [...prev, n]);
    setActProy(n.id);
  };

  const updProy = (k, v) => saveProyectos(prev => prev.map(p => p.id === actProy ? { ...p, [k]: v } : p));

  const actsProy = actividades.filter(a => a.proyectoId === actProy);
  const avanceGlobal = actsProy.length > 0 ? actsProy.reduce((s, a) => s + (a.avance || 0), 0) / actsProy.length : 0;

  const addActividad = () => {
    const n = { id:uid(), proyectoId:actProy, nombre:"Nueva actividad", inicio:today(), duracion:7, avance:0, responsable:"", predecessors:[], capitulo:"" };
    saveActividades(prev => [...prev, n]);
  };

  const updAct = (id, k, v) => saveActividades(prev => prev.map(a => a.id === id ? { ...a, [k]: v } : a));
  const delAct = (id) => saveActividades(prev => prev.filter(a => a.id !== id));

  const addHito = () => {
    const n = { id:uid(), proyectoId:actProy, nombre:"Nuevo hito", fecha:today(), completado:false, descripcion:"" };
    saveHitos(prev => [...prev, n]);
  };

  const hitosProy = hitos.filter(h => h.proyectoId === actProy);

  const inp = { border:`1px solid ${T.border}`, borderRadius:4, padding:"6px 10px", fontSize:12, background:"#fff", width:"100%" };

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
              <span style={{ fontSize:11, color:T.inkLight, marginLeft:10 }}>/ Proyectos</span>
            </div>
          </div>
          {proy && (
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:12, fontWeight:600 }}>{proy.nombre}</span>
              <span style={{ fontSize:10, padding:"2px 8px", borderRadius:10, background:T.purpleBg, color:T.purple, fontWeight:700 }}>
                {pct(avanceGlobal)}%
              </span>
            </div>
          )}
        </div>

        <div style={{ display:"flex", flex:1, minHeight:0 }}>
          {/* Sidebar */}
          <div style={{ width:210, flexShrink:0, background:T.surface, borderRight:`1px solid ${T.border}`,
            display:"flex", flexDirection:"column", paddingTop:8, overflowY:"auto" }}>
            {/* Project selector */}
            <div style={{ padding:"6px 12px 10px", borderBottom:`1px solid ${T.border}` }}>
              <div style={{ fontSize:8, fontWeight:700, color:T.inkLight, textTransform:"uppercase", letterSpacing:1, marginBottom:4 }}>Proyectos</div>
              {proyectos.map(p => (
                <button key={p.id} onClick={() => setActProy(p.id)}
                  style={{ display:"block", width:"100%", textAlign:"left", padding:"6px 10px", fontSize:11, fontWeight:actProy===p.id?700:400,
                    border:"none", borderRadius:4, cursor:"pointer", marginBottom:2,
                    background:actProy===p.id?T.purpleBg:"transparent", color:actProy===p.id?T.purple:T.inkMid }}>
                  📅 {p.nombre}
                </button>
              ))}
              <button onClick={addProyecto}
                style={{ display:"flex", alignItems:"center", gap:4, width:"100%", padding:"5px 10px", fontSize:10,
                  border:`1px dashed ${T.border}`, borderRadius:4, background:"transparent", color:T.inkLight, marginTop:4 }}>
                <Plus size={10}/> Nuevo proyecto
              </button>
            </div>

            {/* Tabs */}
            {actProy && TABS.map(t => {
              const act = tab === t.id;
              return (
                <button key={t.id} onClick={() => setTab(t.id)} style={{
                  display:"flex", alignItems:"center", gap:9, padding:"10px 16px",
                  border:"none", borderLeft:act?`3px solid ${T.ink}`:"3px solid transparent",
                  background:act?T.accent:"transparent", color:act?T.ink:T.inkLight,
                  fontSize:12, fontWeight:act?700:400, cursor:"pointer", textAlign:"left", width:"100%" }}>
                  <t.I size={13}/> {t.lbl}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div style={{ flex:1, overflowY:"auto", padding:"24px 28px", maxWidth:1200 }}>
            {!actProy ? (
              <div style={{ textAlign:"center", padding:60, color:T.inkLight }}>
                <Calendar size={40} style={{ opacity:0.3, marginBottom:12 }}/>
                <div style={{ fontSize:16, fontWeight:600, marginBottom:4 }}>Selecciona o crea un proyecto</div>
                <div style={{ fontSize:12, marginBottom:16 }}>Gestiona cronogramas, avances, hitos y equipo</div>
                <Btn on={addProyecto}><Plus size={12}/> Crear proyecto</Btn>
              </div>
            ) : (
              <div className="fade-up">
                {/* Dashboard view */}
                {tab === "dashboard" && (
                  <div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
                      {[
                        ["📅 Proyectos",proyectos.length,"#111",`${proyectos.filter(p=>p.estado==="activo").length} activos`],
                        ["📊 Avance global",`${pct(avanceGlobal)}%`,avanceGlobal>=70?"#111111":avanceGlobal>=40?"#8C6A00":"#B91C1C",`${actsProy.length} actividades`],
                        ["🏁 Hitos",`${hitosProy.filter(h=>h.completado).length}/${hitosProy.length}`,"#3B3B3B",`${hitosProy.filter(h=>!h.completado).length} pendientes`],
                        ["📋 Actividades",actsProy.length,"#111",proy?`en ${proy.nombre}`:""]
                      ].map(([l,v,c,s])=>(
                        <Card key={l} style={{padding:"14px 16px"}}><div style={{fontSize:8,fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>{l}</div><div style={{fontSize:22,fontWeight:800,fontFamily:"'DM Mono',monospace",color:c}}>{v}</div>{s&&<div style={{fontSize:9,color:"#909090",marginTop:2}}>{s}</div>}</Card>
                      ))}
                    </div>
                    {proy && (
                      <Card style={{marginBottom:12}}>
                        <div style={{fontSize:10,fontWeight:700,marginBottom:8}}>📊 Avance — {proy.nombre}</div>
                        <div style={{height:12,background:"#E0E0E0",borderRadius:6,overflow:"hidden",marginBottom:6}}>
                          <div style={{width:`${pct(avanceGlobal)}%`,height:"100%",borderRadius:6,background:avanceGlobal>=70?"#111111":avanceGlobal>=40?"#8C6A00":"#B91C1C"}}/>
                        </div>
                        <div style={{fontSize:9,color:"#909090"}}>Inicio: {proy.inicio} · Fin: {proy.fin} · {actsProy.length} actividades</div>
                      </Card>
                    )}
                  </div>
                )}
                {/* Project header editable */}
                {tab === "gantt" && <>
                  <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr", gap:10, marginBottom:16 }}>
                    <div>
                      <label style={{ fontSize:9, fontWeight:700, color:T.inkLight, textTransform:"uppercase" }}>Nombre del proyecto</label>
                      <input value={proy.nombre} onChange={e => updProy("nombre", e.target.value)} style={inp}/>
                    </div>
                    <div>
                      <label style={{ fontSize:9, fontWeight:700, color:T.inkLight, textTransform:"uppercase" }}>Inicio</label>
                      <input type="date" value={proy.inicio} onChange={e => updProy("inicio", e.target.value)} style={inp}/>
                    </div>
                    <div>
                      <label style={{ fontSize:9, fontWeight:700, color:T.inkLight, textTransform:"uppercase" }}>Fin estimado</label>
                      <input type="date" value={proy.fin} onChange={e => updProy("fin", e.target.value)} style={inp}/>
                    </div>
                    <div>
                      <label style={{ fontSize:9, fontWeight:700, color:T.inkLight, textTransform:"uppercase" }}>Estado</label>
                      <select value={proy.estado} onChange={e => updProy("estado", e.target.value)} style={inp}>
                        <option value="activo">Activo</option>
                        <option value="pausado">Pausado</option>
                        <option value="finalizado">Finalizado</option>
                      </select>
                    </div>
                  </div>

                  {/* Gantt-like table */}
                  <Card style={{ padding:0, overflow:"hidden", marginBottom:16 }}>
                    <div style={{ padding:"10px 16px", borderBottom:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <div style={{ fontSize:13, fontWeight:700 }}>Cronograma</div>
                      <Btn sm on={addActividad}><Plus size={10}/> Actividad</Btn>
                    </div>

                    {actsProy.length === 0 ? (
                      <div style={{ padding:30, textAlign:"center", color:T.inkLight, fontSize:12 }}>Sin actividades. Agrega la primera.</div>
                    ) : (
                      <div style={{ overflowX:"auto" }}>
                        <table style={{ width:"100%", borderCollapse:"collapse", minWidth:800 }}>
                          <thead>
                            <tr style={{ background:T.surfaceAlt }}>
                              {["#","Actividad","Inicio","Dur.(días)","Fin","Avance %","Responsable",""].map(h => (
                                <th key={h} style={{ padding:"8px 10px", fontSize:8, fontWeight:700, color:T.inkLight,
                                  textTransform:"uppercase", letterSpacing:.5, textAlign:"left", borderBottom:`2px solid ${T.border}`,
                                  whiteSpace:"nowrap" }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {actsProy.map((a, i) => {
                              const fin = addDays(a.inicio, a.duracion);
                              return (
                                <tr key={a.id} style={{ borderBottom:`1px solid ${T.border}` }}>
                                  <td style={{ padding:"6px 10px", fontSize:10, color:T.inkLight }}>{i + 1}</td>
                                  <td style={{ padding:"6px 10px" }}>
                                    <input value={a.nombre} onChange={e => updAct(a.id, "nombre", e.target.value)}
                                      style={{ border:"none", background:"transparent", fontSize:12, fontWeight:600, width:"100%" }}/>
                                  </td>
                                  <td style={{ padding:"6px 10px" }}>
                                    <input type="date" value={a.inicio} onChange={e => updAct(a.id, "inicio", e.target.value)}
                                      style={{ border:`1px solid ${T.border}`, borderRadius:3, padding:"3px 6px", fontSize:10, background:"#fff" }}/>
                                  </td>
                                  <td style={{ padding:"6px 10px" }}>
                                    <input type="number" value={a.duracion} onChange={e => updAct(a.id, "duracion", +e.target.value)}
                                      style={{ border:`1px solid ${T.border}`, borderRadius:3, padding:"3px 6px", fontSize:10, width:50, textAlign:"center",
                                        fontFamily:"'DM Mono',monospace", background:"#fff" }}/>
                                  </td>
                                  <td style={{ padding:"6px 10px", fontSize:10, color:T.inkMid, fontFamily:"'DM Mono',monospace" }}>{fmtD(fin)}</td>
                                  <td style={{ padding:"6px 10px" }}>
                                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                                      <div style={{ flex:1, height:6, background:T.border, borderRadius:3, overflow:"hidden" }}>
                                        <div style={{ height:"100%", width:`${a.avance||0}%`, background:a.avance>=100?T.green:T.purple, borderRadius:3, transition:"width .2s" }}/>
                                      </div>
                                      <input type="number" value={a.avance||0} min={0} max={100}
                                        onChange={e => updAct(a.id, "avance", pct(+e.target.value))}
                                        style={{ width:36, border:`1px solid ${T.border}`, borderRadius:3, padding:"2px 4px",
                                          fontSize:9, textAlign:"center", fontFamily:"'DM Mono',monospace", background:"#fff" }}/>
                                    </div>
                                  </td>
                                  <td style={{ padding:"6px 10px" }}>
                                    <input value={a.responsable||""} onChange={e => updAct(a.id, "responsable", e.target.value)}
                                      placeholder="—" style={{ border:"none", background:"transparent", fontSize:11, width:100 }}/>
                                  </td>
                                  <td style={{ padding:"6px 10px" }}>
                                    <button onClick={() => delAct(a.id)} style={{ background:"none", border:"none", color:T.red, cursor:"pointer" }}>
                                      <Trash2 size={12}/>
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </Card>

                  {/* Visual Gantt bars */}
                  {actsProy.length > 0 && (
                    <Card style={{ padding:16, marginBottom:16 }}>
                      <div style={{ fontSize:12, fontWeight:700, marginBottom:10 }}>Vista Gantt</div>
                      {(() => {
                        const minDate = actsProy.reduce((m, a) => a.inicio < m ? a.inicio : m, actsProy[0].inicio);
                        const maxDate = actsProy.reduce((m, a) => { const f = addDays(a.inicio, a.duracion); return f > m ? f : m; }, minDate);
                        const totalDays = Math.max(diffDays(minDate, maxDate), 1);
                        return actsProy.map(a => {
                          const start = diffDays(minDate, a.inicio);
                          const left = (start / totalDays) * 100;
                          const width = Math.max((a.duracion / totalDays) * 100, 2);
                          return (
                            <div key={a.id} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                              <div style={{ width:120, fontSize:10, fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{a.nombre}</div>
                              <div style={{ flex:1, height:14, background:T.surfaceAlt, borderRadius:3, position:"relative", border:`1px solid ${T.border}` }}>
                                <div style={{ position:"absolute", left:`${left}%`, width:`${width}%`, height:"100%",
                                  background:a.avance>=100?T.green:T.purple+"88", borderRadius:3 }}>
                                  <div style={{ height:"100%", width:`${a.avance||0}%`, background:a.avance>=100?T.green:T.purple, borderRadius:3 }}/>
                                </div>
                              </div>
                              <span style={{ fontSize:9, fontFamily:"'DM Mono',monospace", color:T.inkLight, minWidth:30, textAlign:"right" }}>{a.avance||0}%</span>
                            </div>
                          );
                        });
                      })()}
                    </Card>
                  )}

                  {/* Global progress */}
                  <Card style={{ padding:16 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <div>
                        <div style={{ fontSize:12, fontWeight:700 }}>Avance global del proyecto</div>
                        <div style={{ fontSize:10, color:T.inkLight }}>{actsProy.length} actividades · {actsProy.filter(a=>a.avance>=100).length} completadas</div>
                      </div>
                      <div style={{ fontSize:28, fontWeight:800, color:avanceGlobal>=100?T.green:T.purple }}>{pct(avanceGlobal)}%</div>
                    </div>
                    <div style={{ height:8, background:T.border, borderRadius:4, marginTop:8, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${avanceGlobal}%`, background:avanceGlobal>=100?T.green:T.purple, borderRadius:4, transition:"width .3s" }}/>
                    </div>
                  </Card>
                </>}

                {/* AVANCES TAB */}
                {tab === "avances" && (
                  <Card style={{ padding:18 }}>
                    <div style={{ fontSize:14, fontWeight:700, marginBottom:14 }}>Registro de avances</div>
                    {actsProy.length === 0 ? (
                      <div style={{ padding:20, textAlign:"center", color:T.inkLight }}>Agrega actividades primero en el Cronograma</div>
                    ) : actsProy.map(a => (
                      <div key={a.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom:`1px solid ${T.border}` }}>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:12, fontWeight:600 }}>{a.nombre}</div>
                          <div style={{ fontSize:9, color:T.inkLight }}>{a.responsable || "Sin asignar"} · {fmtD(a.inicio)} → {fmtD(addDays(a.inicio, a.duracion))}</div>
                        </div>
                        <div style={{ width:160, display:"flex", alignItems:"center", gap:6 }}>
                          <input type="range" min={0} max={100} value={a.avance||0}
                            onChange={e => updAct(a.id, "avance", +e.target.value)}
                            style={{ flex:1, accentColor:T.purple }}/>
                          <span style={{ fontSize:11, fontWeight:700, fontFamily:"'DM Mono',monospace", color:a.avance>=100?T.green:T.purple, minWidth:30 }}>
                            {a.avance||0}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </Card>
                )}

                {/* HITOS TAB */}
                {tab === "hitos" && (
                  <Card style={{ padding:18 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                      <div style={{ fontSize:14, fontWeight:700 }}>Hitos del proyecto</div>
                      <Btn sm on={addHito}><Plus size={10}/> Nuevo hito</Btn>
                    </div>
                    {hitosProy.length === 0 ? (
                      <div style={{ padding:20, textAlign:"center", color:T.inkLight }}>Sin hitos definidos</div>
                    ) : hitosProy.sort((a,b) => a.fecha > b.fecha ? 1 : -1).map(h => (
                      <div key={h.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom:`1px solid ${T.border}` }}>
                        <button onClick={() => saveHitos(prev => prev.map(x => x.id === h.id ? { ...x, completado: !x.completado } : x))}
                          style={{ width:24, height:24, borderRadius:"50%", border:`2px solid ${h.completado?T.green:T.border}`,
                            background:h.completado?T.greenBg:"#fff", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                          {h.completado && <Check size={12} color={T.green}/>}
                        </button>
                        <div style={{ flex:1 }}>
                          <input value={h.nombre} onChange={e => saveHitos(prev => prev.map(x => x.id === h.id ? { ...x, nombre: e.target.value } : x))}
                            style={{ border:"none", background:"transparent", fontSize:13, fontWeight:600, width:"100%",
                              textDecoration:h.completado?"line-through":"none", color:h.completado?T.inkLight:T.ink }}/>
                        </div>
                        <input type="date" value={h.fecha} onChange={e => saveHitos(prev => prev.map(x => x.id === h.id ? { ...x, fecha: e.target.value } : x))}
                          style={{ border:`1px solid ${T.border}`, borderRadius:3, padding:"3px 8px", fontSize:10, background:"#fff" }}/>
                        <Flag size={12} color={h.completado ? T.green : new Date(h.fecha) < new Date() ? T.red : T.amber}/>
                        <button onClick={() => saveHitos(prev => prev.filter(x => x.id !== h.id))}
                          style={{ background:"none", border:"none", color:T.red, cursor:"pointer" }}><Trash2 size={12}/></button>
                      </div>
                    ))}
                  </Card>
                )}

                {/* TABLERO TAB (Kanban) */}
                {tab === "tablero" && (
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:12 }}>
                    {[
                      { id:"pendiente", label:"Pendiente", color:T.inkLight, bg:T.surfaceAlt },
                      { id:"en_curso", label:"En curso", color:T.blue, bg:T.blueBg },
                      { id:"revision", label:"En revisión", color:T.amber, bg:T.amberBg },
                      { id:"completado", label:"Completado", color:T.green, bg:T.greenBg },
                    ].map(col => {
                      const items = actsProy.filter(a => {
                        if (col.id === "completado") return a.avance >= 100;
                        if (col.id === "revision") return a.avance >= 80 && a.avance < 100;
                        if (col.id === "en_curso") return a.avance > 0 && a.avance < 80;
                        return !a.avance || a.avance === 0;
                      });
                      return (
                        <div key={col.id}>
                          <div style={{ padding:"8px 12px", background:col.bg, borderRadius:"6px 6px 0 0", border:`1px solid ${T.border}`, borderBottom:"none",
                            display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                            <span style={{ fontSize:11, fontWeight:700, color:col.color }}>{col.label}</span>
                            <span style={{ fontSize:9, fontWeight:700, color:col.color, background:col.color+"22", padding:"1px 6px", borderRadius:8 }}>{items.length}</span>
                          </div>
                          <div style={{ border:`1px solid ${T.border}`, borderRadius:"0 0 6px 6px", minHeight:120, background:"#fff", padding:6 }}>
                            {items.map(a => (
                              <div key={a.id} style={{ padding:"8px 10px", marginBottom:4, background:T.surfaceAlt, borderRadius:4,
                                border:`1px solid ${T.border}`, fontSize:11 }}>
                                <div style={{ fontWeight:600, marginBottom:2 }}>{a.nombre}</div>
                                <div style={{ display:"flex", justifyContent:"space-between", fontSize:9, color:T.inkLight }}>
                                  <span>{a.responsable || "—"}</span>
                                  <span style={{ fontFamily:"'DM Mono',monospace" }}>{a.avance||0}%</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* EQUIPO TAB */}
                {tab === "equipo" && (
                  <Card style={{ padding:18 }}>
                    <div style={{ fontSize:14, fontWeight:700, marginBottom:14 }}>Asignación de recursos</div>
                    {(() => {
                      const responsables = [...new Set(actsProy.map(a => a.responsable).filter(Boolean))];
                      if (responsables.length === 0) return <div style={{ padding:20, textAlign:"center", color:T.inkLight }}>Asigna responsables en las actividades del Cronograma</div>;
                      return responsables.map(r => {
                        const tareas = actsProy.filter(a => a.responsable === r);
                        const avgAvance = tareas.reduce((s, a) => s + (a.avance||0), 0) / tareas.length;
                        return (
                          <div key={r} style={{ marginBottom:14, padding:"12px 16px", background:T.surfaceAlt, borderRadius:6, border:`1px solid ${T.border}` }}>
                            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                              <div style={{ fontSize:13, fontWeight:700 }}>👤 {r}</div>
                              <span style={{ fontSize:10, fontWeight:700, color:T.purple }}>{tareas.length} tareas · {pct(avgAvance)}% avance</span>
                            </div>
                            {tareas.map(a => (
                              <div key={a.id} style={{ display:"flex", gap:8, alignItems:"center", fontSize:10, padding:"3px 0" }}>
                                <span style={{ flex:1 }}>{a.nombre}</span>
                                <div style={{ width:60, height:4, background:T.border, borderRadius:2, overflow:"hidden" }}>
                                  <div style={{ height:"100%", width:`${a.avance||0}%`, background:T.purple, borderRadius:2 }}/>
                                </div>
                                <span style={{ fontFamily:"'DM Mono',monospace", fontSize:9, minWidth:24, textAlign:"right" }}>{a.avance||0}%</span>
                              </div>
                            ))}
                          </div>
                        );
                      });
                    })()}
                  </Card>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
