import React, { useState, useEffect, useCallback } from "react";
import { store } from "../core/store.js";

import { Shield, Plus, Trash2, Check, X, Search, AlertTriangle, CheckCircle, Clock, Eye, FileText, Users, Clipboard, Activity, HardHat, ChevronRight, Camera } from "lucide-react";

const Fonts = () => <style>{`@import url('https://fonts.googleapis.com/css2?family=DM Sans:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}body{font-family:'DM Sans',sans-serif;background:#F5F4F1}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#C8C5BE;border-radius:2px}input,select,textarea,button{font-family:'DM Sans',sans-serif;outline:none}button{cursor:pointer}@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}.fade-up{animation:fadeUp .22s ease both}`}</style>;
const T = { bg:"#F5F4F1",surface:"#FFFFFF",surfaceAlt:"#FFFFFF",ink:"#111",inkMid:"#555",inkLight:"#909090",inkXLight:"#C8C5BE",border:"#E0E0E0",accent:"#EDEBE7",green:"#111111",greenBg:"#E8F4EE",red:"#B91C1C",redBg:"#FAE8E8",amber:"#8C6A00",amberBg:"#FAF0E0",blue:"#3B3B3B",blueBg:"#F0F0F0",shadow:"0 1px 3px rgba(0,0,0,.06),0 4px 16px rgba(0,0,0,.05)" };
const uid = () => Math.random().toString(36).slice(2, 9);
const today = () => new Date().toISOString().split("T")[0];
const fmtD = (d) => d ? new Date(d+"T12:00:00").toLocaleDateString("es-CO",{day:"2-digit",month:"short",year:"numeric"}) : "—";

function useStore(key, init) {
  const [data, setData] = useState(init);
  useEffect(() => { (async () => { try { const r = await store.get(key); if (r?.value) setData(JSON.parse(r)); } catch {} })(); }, [key]);
  const save = useCallback(async (v) => { const val = typeof v === "function" ? v(data) : v; setData(val); try { await store.set(key, JSON.stringify(val)); } catch {} }, [key, data]);
  return [data, save];
}

const Card = ({ children, style }) => <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:8, boxShadow:T.shadow, ...style }}>{children}</div>;
const Btn = ({ children, v, sm, on, style, ...p }) => <button onClick={on} style={{ display:"inline-flex", alignItems:"center", gap:5, padding:sm?"5px 10px":"8px 16px", fontSize:sm?10:11, fontWeight:600, border:v==="sec"?`1px solid ${T.border}`:"none", borderRadius:5, background:v==="sec"?"#fff":T.ink, color:v==="sec"?T.inkMid:"#fff", cursor:"pointer", ...style }} {...p}>{children}</button>;

const TABS = [
  { id:"dashboard",    lbl:"Dashboard",        I:Activity,      desc:"Indicadores de seguridad" },
  { id:"inspecciones", lbl:"Inspecciones",      I:Clipboard,     desc:"Inspecciones programadas y realizadas" },
  { id:"incidentes",   lbl:"Incidentes",        I:AlertTriangle, desc:"Registro de accidentes e incidentes" },
  { id:"riesgos",      lbl:"Matriz de riesgos", I:Shield,        desc:"Identificación y valoración de riesgos" },
  { id:"capacitaciones",lbl:"Capacitaciones",   I:Users,         desc:"Programa de formación SST" },
  { id:"permisos",     lbl:"Permisos trabajo",  I:FileText,      desc:"Permisos de trabajo en alturas, caliente, confinado" },
  { id:"epps",         lbl:"EPPs",             I:HardHat,       desc:"Control de entrega de EPPs y dotación" },
];

const TIPOS_RIESGO = ["Caída de alturas","Eléctrico","Mecánico","Químico","Biológico","Ergonómico","Psicosocial","Trabajo en caliente","Espacio confinado","Excavaciones"];
const SEVERIDAD = [
  { id:1, lbl:"Bajo", color:T.green, bg:T.greenBg },
  { id:2, lbl:"Medio", color:T.amber, bg:T.amberBg },
  { id:3, lbl:"Alto", color:"#D4840A", bg:"#FFF3E0" },
  { id:4, lbl:"Crítico", color:T.red, bg:T.redBg },
];

export default function HabitarisSST() {
  const [tab, setTab] = useState("dashboard");
  const [inspecciones, saveInsp] = useStore("hab:sst:inspecciones", []);
  const [incidentes, saveInc] = useStore("hab:sst:incidentes", []);
  const [riesgos, saveRiesgos] = useStore("hab:sst:riesgos", []);
  const [capacitaciones, saveCap] = useStore("hab:sst:capacitaciones", []);
  const [permisos, savePerm] = useStore("hab:sst:permisos", []);

  const inp = { border:`1px solid ${T.border}`, borderRadius:4, padding:"6px 10px", fontSize:12, background:"#fff" };

  const diasSinIncidentes = (() => {
    if (incidentes.length === 0) return "∞";
    const last = [...incidentes].sort((a,b) => b.fecha > a.fecha ? 1 : -1)[0];
    return Math.floor((Date.now() - new Date(last.fecha).getTime()) / 86400000);
  })();

  return (
    <>
      <Fonts/>
      <div style={{ height:"100vh", display:"flex", flexDirection:"column", background:T.bg, overflow:"hidden" }}>
        <div style={{ background:T.surface, borderBottom:`1px solid ${T.border}`, padding:"11px 28px", display:"flex", alignItems:"center", gap:14 }}>
          <svg width={26} height={26} viewBox="0 0 34 34" fill="none"><rect x="2.5" y="4.5" width="25" height="25" stroke={T.ink} strokeWidth="1.2"/><rect x="7.5" y="10" width="4" height="13" fill={T.ink}/><rect x="7.5" y="15.5" width="13" height="3" fill={T.ink}/><rect x="16.5" y="10" width="4" height="13" fill={T.ink}/></svg>
          <span style={{ fontSize:13, fontWeight:800, letterSpacing:3.5, textTransform:"uppercase" }}>HABITARIS</span>
          <span style={{ fontSize:11, color:T.inkLight }}>/ SST</span>
          <div style={{ flex:1 }}/>
          {incidentes.filter(i => i.estado === "abierto").length > 0 && (
            <div style={{ background:T.redBg, border:`1px solid ${T.red}33`, borderRadius:4, padding:"5px 10px", display:"flex", alignItems:"center", gap:5 }}>
              <AlertTriangle size={12} color={T.red}/>
              <span style={{ fontSize:10, fontWeight:700, color:T.red }}>{incidentes.filter(i=>i.estado==="abierto").length} incidente{incidentes.filter(i=>i.estado==="abierto").length!==1?"s":""} abierto{incidentes.filter(i=>i.estado==="abierto").length!==1?"s":""}</span>
            </div>
          )}
        </div>

        <div style={{ display:"flex", flex:1, minHeight:0 }}>
          <div style={{ width:210, flexShrink:0, background:T.surface, borderRight:`1px solid ${T.border}`, paddingTop:8, overflowY:"auto" }}>
            {TABS.map(t => {
              const act = tab === t.id;
              const badge = t.id==="incidentes" ? incidentes.filter(i=>i.estado==="abierto").length :
                            t.id==="inspecciones" ? inspecciones.filter(i=>i.estado==="pendiente").length : 0;
              return (
                <button key={t.id} onClick={() => setTab(t.id)} style={{
                  display:"flex", alignItems:"center", gap:9, padding:"10px 16px", border:"none",
                  borderLeft:act?`3px solid ${T.ink}`:"3px solid transparent",
                  background:act?T.accent:"transparent", color:act?T.ink:T.inkLight,
                  fontSize:12, fontWeight:act?700:400, cursor:"pointer", textAlign:"left", width:"100%" }}>
                  <t.I size={13}/> <span style={{ flex:1 }}>{t.lbl}</span>
                  {badge > 0 && <span style={{ background:T.red, color:"#fff", fontSize:8, fontWeight:800, padding:"1px 5px", borderRadius:8 }}>{badge}</span>}
                </button>
              );
            })}
          </div>

          <div style={{ flex:1, overflowY:"auto", padding:"24px 28px", maxWidth:1100 }}>
            <div className="fade-up">
              {/* DASHBOARD */}
              {tab === "dashboard" && <>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(5, 1fr)", gap:12, marginBottom:20 }}>
                  {[
                    { lbl:"Días sin incidentes", val:diasSinIncidentes, color:T.green, bg:T.greenBg },
                    { lbl:"Inspecciones mes", val:inspecciones.filter(i => { const d=new Date(i.fecha); const n=new Date(); return d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear(); }).length, color:T.blue, bg:T.blueBg },
                    { lbl:"Incidentes abiertos", val:incidentes.filter(i=>i.estado==="abierto").length, color:T.red, bg:T.redBg },
                    { lbl:"Riesgos altos", val:riesgos.filter(r=>r.severidad>=3).length, color:T.amber, bg:T.amberBg },
                    { lbl:"Capacitaciones", val:capacitaciones.length, color:"#5B3A8C", bg:"#F0ECF6" },
                  ].map(k => (
                    <Card key={k.lbl} style={{ padding:"14px 16px" }}>
                      <div style={{ fontSize:8, fontWeight:700, color:T.inkLight, textTransform:"uppercase", letterSpacing:1 }}>{k.lbl}</div>
                      <div style={{ fontSize:26, fontWeight:800, color:k.color, marginTop:4 }}>{k.val}</div>
                    </Card>
                  ))}
                </div>

                {/* Big safety banner */}
                <Card style={{ padding:24, marginBottom:16, background:diasSinIncidentes==="∞"||diasSinIncidentes>30?T.greenBg:diasSinIncidentes>7?T.amberBg:T.redBg,
                  border:`1px solid ${diasSinIncidentes==="∞"||diasSinIncidentes>30?T.green:diasSinIncidentes>7?T.amber:T.red}33`, textAlign:"center" }}>
                  <div style={{ fontSize:48, fontWeight:800, color:diasSinIncidentes==="∞"||diasSinIncidentes>30?T.green:diasSinIncidentes>7?T.amber:T.red }}>
                    🦺 {diasSinIncidentes}
                  </div>
                  <div style={{ fontSize:14, fontWeight:700, color:T.ink, marginTop:4 }}>Días sin incidentes</div>
                  <div style={{ fontSize:11, color:T.inkMid }}>Seguridad es responsabilidad de todos</div>
                </Card>
              </>}

              {/* INSPECCIONES */}
              {tab === "inspecciones" && <>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
                  <div style={{ fontSize:13, fontWeight:700 }}>Inspecciones de seguridad</div>
                  <Btn sm on={() => saveInsp(prev => [...prev, { id:uid(), fecha:today(), tipo:"General", ubicacion:"", inspector:"", estado:"pendiente", hallazgos:"", calificacion:0 }])}><Plus size={10}/> Nueva inspección</Btn>
                </div>
                <Card style={{ padding:0, overflow:"hidden" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse" }}>
                    <thead><tr style={{ background:T.surfaceAlt }}>
                      {["Fecha","Tipo","Ubicación","Inspector","Estado","Hallazgos","Calif.",""].map(h=>(
                        <th key={h} style={{ padding:"8px 10px", fontSize:8, fontWeight:700, color:T.inkLight, textTransform:"uppercase", textAlign:"left", borderBottom:`2px solid ${T.border}` }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {inspecciones.sort((a,b)=>b.fecha>a.fecha?1:-1).map(i => (
                        <tr key={i.id} style={{ borderBottom:`1px solid ${T.border}` }}>
                          <td style={{ padding:"6px 10px" }}><input type="date" value={i.fecha} onChange={e=>saveInsp(prev=>prev.map(x=>x.id===i.id?{...x,fecha:e.target.value}:x))} style={{ border:"none", background:"transparent", fontSize:10 }}/></td>
                          <td style={{ padding:"6px 10px" }}><select value={i.tipo} onChange={e=>saveInsp(prev=>prev.map(x=>x.id===i.id?{...x,tipo:e.target.value}:x))} style={{ border:"none", background:"transparent", fontSize:11 }}>
                            {["General","Alturas","Eléctrica","Orden y aseo","EPPs","Herramientas","Señalización","Excavaciones"].map(t=><option key={t}>{t}</option>)}
                          </select></td>
                          <td style={{ padding:"6px 10px" }}><input value={i.ubicacion} onChange={e=>saveInsp(prev=>prev.map(x=>x.id===i.id?{...x,ubicacion:e.target.value}:x))} placeholder="Zona..." style={{ border:"none", background:"transparent", fontSize:11, width:"100%" }}/></td>
                          <td style={{ padding:"6px 10px" }}><input value={i.inspector} onChange={e=>saveInsp(prev=>prev.map(x=>x.id===i.id?{...x,inspector:e.target.value}:x))} placeholder="Nombre" style={{ border:"none", background:"transparent", fontSize:11, width:80 }}/></td>
                          <td style={{ padding:"6px 10px" }}><select value={i.estado} onChange={e=>saveInsp(prev=>prev.map(x=>x.id===i.id?{...x,estado:e.target.value}:x))}
                            style={{ fontSize:9, padding:"2px 6px", border:`1px solid ${T.border}`, borderRadius:3, background:i.estado==="realizada"?T.greenBg:i.estado==="pendiente"?T.amberBg:"#fff" }}>
                            {["pendiente","realizada","cancelada"].map(s=><option key={s}>{s}</option>)}
                          </select></td>
                          <td style={{ padding:"6px 10px" }}><input value={i.hallazgos||""} onChange={e=>saveInsp(prev=>prev.map(x=>x.id===i.id?{...x,hallazgos:e.target.value}:x))} placeholder="Observaciones..." style={{ border:"none", background:"transparent", fontSize:10, width:"100%" }}/></td>
                          <td style={{ padding:"6px 10px" }}><input type="number" min={0} max={100} value={i.calificacion||""} onChange={e=>saveInsp(prev=>prev.map(x=>x.id===i.id?{...x,calificacion:+e.target.value}:x))} style={{ width:36, border:`1px solid ${T.border}`, borderRadius:3, padding:"2px 4px", fontSize:10, textAlign:"center", fontFamily:"'DM Mono',monospace" }}/></td>
                          <td style={{ padding:"6px 10px" }}><button onClick={()=>saveInsp(prev=>prev.filter(x=>x.id!==i.id))} style={{ background:"none", border:"none", color:T.red, cursor:"pointer" }}><Trash2 size={11}/></button></td>
                        </tr>
                      ))}
                      {inspecciones.length === 0 && <tr><td colSpan={8} style={{ padding:30, textAlign:"center", color:T.inkLight }}>Sin inspecciones</td></tr>}
                    </tbody>
                  </table>
                </Card>
              </>}

              {/* INCIDENTES */}
              {tab === "incidentes" && <>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
                  <div style={{ fontSize:13, fontWeight:700 }}>Registro de incidentes</div>
                  <Btn sm on={() => saveInc(prev => [...prev, { id:uid(), fecha:today(), tipo:"Incidente", descripcion:"", ubicacion:"", personas:"", severidad:1, estado:"abierto", accionCorrectiva:"" }])} style={{ background:T.red }}><Plus size={10}/> Reportar incidente</Btn>
                </div>
                {incidentes.sort((a,b)=>b.fecha>a.fecha?1:-1).map(i => {
                  const sev = SEVERIDAD.find(s => s.id === i.severidad) || SEVERIDAD[0];
                  return (
                    <Card key={i.id} style={{ padding:14, marginBottom:8, borderLeft:`4px solid ${sev.color}` }}>
                      <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                        <div style={{ flex:1 }}>
                          <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:4 }}>
                            <span style={{ fontSize:9, fontWeight:700, padding:"2px 6px", borderRadius:3, background:sev.bg, color:sev.color }}>{sev.lbl}</span>
                            <select value={i.tipo} onChange={e=>saveInc(prev=>prev.map(x=>x.id===i.id?{...x,tipo:e.target.value}:x))} style={{ border:"none", background:"transparent", fontSize:10, fontWeight:600 }}>
                              {["Incidente","Accidente","Casi-accidente","Condición insegura","Acto inseguro"].map(t=><option key={t}>{t}</option>)}
                            </select>
                            <input type="date" value={i.fecha} onChange={e=>saveInc(prev=>prev.map(x=>x.id===i.id?{...x,fecha:e.target.value}:x))} style={{ border:"none", background:"transparent", fontSize:10, color:T.inkLight }}/>
                            <div style={{ flex:1 }}/>
                            <select value={i.estado} onChange={e=>saveInc(prev=>prev.map(x=>x.id===i.id?{...x,estado:e.target.value}:x))}
                              style={{ fontSize:9, padding:"2px 6px", border:`1px solid ${T.border}`, borderRadius:3, background:i.estado==="cerrado"?T.greenBg:T.redBg }}>
                              {["abierto","en investigación","cerrado"].map(s=><option key={s}>{s}</option>)}
                            </select>
                            <select value={i.severidad} onChange={e=>saveInc(prev=>prev.map(x=>x.id===i.id?{...x,severidad:+e.target.value}:x))} style={{ fontSize:9, padding:"2px 6px", border:`1px solid ${T.border}`, borderRadius:3 }}>
                              {SEVERIDAD.map(s=><option key={s.id} value={s.id}>{s.lbl}</option>)}
                            </select>
                          </div>
                          <textarea value={i.descripcion} onChange={e=>saveInc(prev=>prev.map(x=>x.id===i.id?{...x,descripcion:e.target.value}:x))}
                            placeholder="Descripción del incidente..." rows={2}
                            style={{ width:"100%", border:`1px solid ${T.border}`, borderRadius:4, padding:"6px 8px", fontSize:11, resize:"vertical", background:T.surfaceAlt }}/>
                          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginTop:6 }}>
                            <input value={i.ubicacion||""} onChange={e=>saveInc(prev=>prev.map(x=>x.id===i.id?{...x,ubicacion:e.target.value}:x))} placeholder="📍 Ubicación" style={{ ...inp, fontSize:10 }}/>
                            <input value={i.personas||""} onChange={e=>saveInc(prev=>prev.map(x=>x.id===i.id?{...x,personas:e.target.value}:x))} placeholder="👤 Personas involucradas" style={{ ...inp, fontSize:10 }}/>
                          </div>
                          <input value={i.accionCorrectiva||""} onChange={e=>saveInc(prev=>prev.map(x=>x.id===i.id?{...x,accionCorrectiva:e.target.value}:x))} placeholder="✅ Acción correctiva..." style={{ ...inp, width:"100%", fontSize:10, marginTop:6 }}/>
                        </div>
                        <button onClick={()=>saveInc(prev=>prev.filter(x=>x.id!==i.id))} style={{ background:"none", border:"none", color:T.red, cursor:"pointer" }}><Trash2 size={12}/></button>
                      </div>
                    </Card>
                  );
                })}
                {incidentes.length === 0 && <Card style={{ padding:30, textAlign:"center" }}><div style={{ color:T.inkLight }}>Sin incidentes registrados 🎉</div></Card>}
              </>}

              {/* RIESGOS */}
              {tab === "riesgos" && <>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
                  <div style={{ fontSize:13, fontWeight:700 }}>Matriz de riesgos</div>
                  <Btn sm on={() => saveRiesgos(prev => [...prev, { id:uid(), tipo:"Caída de alturas", actividad:"", control:"", severidad:2, probabilidad:2, responsable:"" }])}><Plus size={10}/> Nuevo riesgo</Btn>
                </div>
                <Card style={{ padding:0, overflow:"hidden" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse" }}>
                    <thead><tr style={{ background:T.surfaceAlt }}>
                      {["Tipo de riesgo","Actividad","Control existente","Sev.","Prob.","Nivel","Responsable",""].map(h=>(
                        <th key={h} style={{ padding:"8px 10px", fontSize:8, fontWeight:700, color:T.inkLight, textTransform:"uppercase", textAlign:"left", borderBottom:`2px solid ${T.border}` }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {riesgos.map(r => {
                        const nivel = (r.severidad||1) * (r.probabilidad||1);
                        const nivelColor = nivel >= 9 ? T.red : nivel >= 4 ? T.amber : T.green;
                        return (
                          <tr key={r.id} style={{ borderBottom:`1px solid ${T.border}` }}>
                            <td style={{ padding:"6px 10px" }}><select value={r.tipo} onChange={e=>saveRiesgos(prev=>prev.map(x=>x.id===r.id?{...x,tipo:e.target.value}:x))} style={{ border:"none", background:"transparent", fontSize:11, fontWeight:600 }}>
                              {TIPOS_RIESGO.map(t=><option key={t}>{t}</option>)}
                            </select></td>
                            <td style={{ padding:"6px 10px" }}><input value={r.actividad||""} onChange={e=>saveRiesgos(prev=>prev.map(x=>x.id===r.id?{...x,actividad:e.target.value}:x))} placeholder="Actividad..." style={{ border:"none", background:"transparent", fontSize:11, width:"100%" }}/></td>
                            <td style={{ padding:"6px 10px" }}><input value={r.control||""} onChange={e=>saveRiesgos(prev=>prev.map(x=>x.id===r.id?{...x,control:e.target.value}:x))} placeholder="Medida de control..." style={{ border:"none", background:"transparent", fontSize:10, width:"100%" }}/></td>
                            <td style={{ padding:"6px 10px" }}><select value={r.severidad} onChange={e=>saveRiesgos(prev=>prev.map(x=>x.id===r.id?{...x,severidad:+e.target.value}:x))} style={{ width:42, fontSize:10, border:`1px solid ${T.border}`, borderRadius:3, textAlign:"center" }}>
                              {[1,2,3,4].map(n=><option key={n} value={n}>{n}</option>)}
                            </select></td>
                            <td style={{ padding:"6px 10px" }}><select value={r.probabilidad} onChange={e=>saveRiesgos(prev=>prev.map(x=>x.id===r.id?{...x,probabilidad:+e.target.value}:x))} style={{ width:42, fontSize:10, border:`1px solid ${T.border}`, borderRadius:3, textAlign:"center" }}>
                              {[1,2,3,4].map(n=><option key={n} value={n}>{n}</option>)}
                            </select></td>
                            <td style={{ padding:"6px 10px" }}><span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:3, background:nivelColor+"18", color:nivelColor }}>{nivel}</span></td>
                            <td style={{ padding:"6px 10px" }}><input value={r.responsable||""} onChange={e=>saveRiesgos(prev=>prev.map(x=>x.id===r.id?{...x,responsable:e.target.value}:x))} placeholder="—" style={{ border:"none", background:"transparent", fontSize:10, width:80 }}/></td>
                            <td style={{ padding:"6px 10px" }}><button onClick={()=>saveRiesgos(prev=>prev.filter(x=>x.id!==r.id))} style={{ background:"none", border:"none", color:T.red, cursor:"pointer" }}><Trash2 size={11}/></button></td>
                          </tr>
                        );
                      })}
                      {riesgos.length === 0 && <tr><td colSpan={8} style={{ padding:30, textAlign:"center", color:T.inkLight }}>Sin riesgos identificados</td></tr>}
                    </tbody>
                  </table>
                </Card>
              </>}

              {/* CAPACITACIONES */}
              {tab === "capacitaciones" && <>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
                  <div style={{ fontSize:13, fontWeight:700 }}>Programa de capacitaciones</div>
                  <Btn sm on={() => saveCap(prev => [...prev, { id:uid(), fecha:today(), tema:"", duracion:1, instructor:"", asistentes:0, estado:"programada" }])}><Plus size={10}/> Nueva capacitación</Btn>
                </div>
                {capacitaciones.sort((a,b)=>b.fecha>a.fecha?1:-1).map(c => (
                  <Card key={c.id} style={{ padding:14, marginBottom:8 }}>
                    <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                      <input type="date" value={c.fecha} onChange={e=>saveCap(prev=>prev.map(x=>x.id===c.id?{...x,fecha:e.target.value}:x))} style={{ border:`1px solid ${T.border}`, borderRadius:3, padding:"4px 8px", fontSize:10 }}/>
                      <input value={c.tema} onChange={e=>saveCap(prev=>prev.map(x=>x.id===c.id?{...x,tema:e.target.value}:x))} placeholder="Tema de la capacitación" style={{ flex:1, border:"none", background:"transparent", fontSize:13, fontWeight:600 }}/>
                      <span style={{ fontSize:9, color:T.inkLight }}>Duración:</span>
                      <input type="number" value={c.duracion} onChange={e=>saveCap(prev=>prev.map(x=>x.id===c.id?{...x,duracion:+e.target.value}:x))} style={{ width:36, border:`1px solid ${T.border}`, borderRadius:3, padding:"2px 4px", fontSize:10, textAlign:"center" }}/><span style={{ fontSize:9, color:T.inkLight }}>h</span>
                      <input value={c.instructor||""} onChange={e=>saveCap(prev=>prev.map(x=>x.id===c.id?{...x,instructor:e.target.value}:x))} placeholder="Instructor" style={{ width:100, border:`1px solid ${T.border}`, borderRadius:3, padding:"4px 8px", fontSize:10 }}/>
                      <span style={{ fontSize:9, color:T.inkLight }}>Asist:</span>
                      <input type="number" value={c.asistentes||""} onChange={e=>saveCap(prev=>prev.map(x=>x.id===c.id?{...x,asistentes:+e.target.value}:x))} style={{ width:36, border:`1px solid ${T.border}`, borderRadius:3, padding:"2px 4px", fontSize:10, textAlign:"center" }}/>
                      <select value={c.estado} onChange={e=>saveCap(prev=>prev.map(x=>x.id===c.id?{...x,estado:e.target.value}:x))} style={{ fontSize:9, padding:"2px 6px", border:`1px solid ${T.border}`, borderRadius:3, background:c.estado==="realizada"?T.greenBg:"#fff" }}>
                        {["programada","realizada","cancelada"].map(s=><option key={s}>{s}</option>)}
                      </select>
                      <button onClick={()=>saveCap(prev=>prev.filter(x=>x.id!==c.id))} style={{ background:"none", border:"none", color:T.red, cursor:"pointer" }}><Trash2 size={11}/></button>
                    </div>
                  </Card>
                ))}
                {capacitaciones.length === 0 && <Card style={{ padding:30, textAlign:"center" }}><div style={{ color:T.inkLight }}>Sin capacitaciones programadas</div></Card>}
              </>}

              {/* PERMISOS */}
              {tab === "permisos" && <>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
                  <div style={{ fontSize:13, fontWeight:700 }}>Permisos de trabajo</div>
                  <Btn sm on={() => savePerm(prev => [...prev, { id:uid(), fecha:today(), tipo:"Alturas", actividad:"", ubicacion:"", responsable:"", vigencia:today(), estado:"activo" }])}><Plus size={10}/> Nuevo permiso</Btn>
                </div>
                <Card style={{ padding:0, overflow:"hidden" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse" }}>
                    <thead><tr style={{ background:T.surfaceAlt }}>
                      {["Fecha","Tipo","Actividad","Ubicación","Responsable","Vigencia","Estado",""].map(h=>(
                        <th key={h} style={{ padding:"8px 10px", fontSize:8, fontWeight:700, color:T.inkLight, textTransform:"uppercase", textAlign:"left", borderBottom:`2px solid ${T.border}` }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {permisos.sort((a,b)=>b.fecha>a.fecha?1:-1).map(p => (
                        <tr key={p.id} style={{ borderBottom:`1px solid ${T.border}` }}>
                          <td style={{ padding:"6px 10px" }}><input type="date" value={p.fecha} onChange={e=>savePerm(prev=>prev.map(x=>x.id===p.id?{...x,fecha:e.target.value}:x))} style={{ border:"none", background:"transparent", fontSize:10 }}/></td>
                          <td style={{ padding:"6px 10px" }}><select value={p.tipo} onChange={e=>savePerm(prev=>prev.map(x=>x.id===p.id?{...x,tipo:e.target.value}:x))} style={{ border:"none", background:"transparent", fontSize:11, fontWeight:600 }}>
                            {["Alturas","Trabajo en caliente","Espacio confinado","Excavaciones","Eléctrico","Izaje de cargas"].map(t=><option key={t}>{t}</option>)}
                          </select></td>
                          <td style={{ padding:"6px 10px" }}><input value={p.actividad||""} onChange={e=>savePerm(prev=>prev.map(x=>x.id===p.id?{...x,actividad:e.target.value}:x))} placeholder="Actividad..." style={{ border:"none", background:"transparent", fontSize:11, width:"100%" }}/></td>
                          <td style={{ padding:"6px 10px" }}><input value={p.ubicacion||""} onChange={e=>savePerm(prev=>prev.map(x=>x.id===p.id?{...x,ubicacion:e.target.value}:x))} placeholder="Zona" style={{ border:"none", background:"transparent", fontSize:10, width:80 }}/></td>
                          <td style={{ padding:"6px 10px" }}><input value={p.responsable||""} onChange={e=>savePerm(prev=>prev.map(x=>x.id===p.id?{...x,responsable:e.target.value}:x))} placeholder="—" style={{ border:"none", background:"transparent", fontSize:10, width:80 }}/></td>
                          <td style={{ padding:"6px 10px" }}><input type="date" value={p.vigencia} onChange={e=>savePerm(prev=>prev.map(x=>x.id===p.id?{...x,vigencia:e.target.value}:x))} style={{ border:"none", background:"transparent", fontSize:10 }}/></td>
                          <td style={{ padding:"6px 10px" }}><select value={p.estado} onChange={e=>savePerm(prev=>prev.map(x=>x.id===p.id?{...x,estado:e.target.value}:x))} style={{ fontSize:9, padding:"2px 6px", border:`1px solid ${T.border}`, borderRadius:3, background:p.estado==="activo"?T.greenBg:T.redBg }}>
                            {["activo","cerrado","cancelado"].map(s=><option key={s}>{s}</option>)}
                          </select></td>
                          <td style={{ padding:"6px 10px" }}><button onClick={()=>savePerm(prev=>prev.filter(x=>x.id!==p.id))} style={{ background:"none", border:"none", color:T.red, cursor:"pointer" }}><Trash2 size={11}/></button></td>
                        </tr>
                      ))}
                      {permisos.length === 0 && <tr><td colSpan={8} style={{ padding:30, textAlign:"center", color:T.inkLight }}>Sin permisos</td></tr>}
                    </tbody>
                  </table>
                </Card>
              </>}

              {/* EPPS */}
              {tab === "epps" && (
                <Card style={{ padding:18 }}>
                  <div style={{ fontSize:14, fontWeight:700, marginBottom:4 }}>Control de EPPs y dotación</div>
                  <div style={{ fontSize:11, color:T.inkLight, marginBottom:14 }}>El inventario de EPPs se gestiona desde el módulo de Logística</div>
                  <div style={{ padding:20, textAlign:"center", background:T.surfaceAlt, borderRadius:6, border:`1px solid ${T.border}` }}>
                    <HardHat size={32} style={{ color:T.inkLight, opacity:0.3, marginBottom:8 }}/>
                    <div style={{ fontSize:12, fontWeight:600, color:T.inkMid }}>El control de entrega y reposición se sincroniza con Logística → EPPs</div>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
