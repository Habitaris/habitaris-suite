import React, { useState, useEffect, useCallback } from "react";
import { Home, Plus, Trash2, Check, X, Search, Clock, CheckCircle, AlertTriangle, MessageCircle, Star, Calendar, Camera, Phone, Mail, ChevronRight, Eye, BarChart2, FileText, Wrench } from "lucide-react";

const Fonts = () => <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}body{font-family:'Outfit',sans-serif;background:#F5F4F1}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#C8C5BE;border-radius:2px}input,select,textarea,button{font-family:'Outfit',sans-serif;outline:none}button{cursor:pointer}@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}.fade-up{animation:fadeUp .22s ease both}`}</style>;
const T = { bg:"#F5F4F1",surface:"#FFFFFF",surfaceAlt:"#FAFAF8",ink:"#111",inkMid:"#555",inkLight:"#909090",inkXLight:"#C8C5BE",border:"#E4E1DB",accent:"#EDEBE7",green:"#1E6B42",greenBg:"#E8F4EE",red:"#AE2C2C",redBg:"#FAE8E8",amber:"#7A5218",amberBg:"#FAF0E0",blue:"#1E4F8C",blueBg:"#E6EFF9",shadow:"0 1px 3px rgba(0,0,0,.06),0 4px 16px rgba(0,0,0,.05)" };
const uid = () => Math.random().toString(36).slice(2, 9);
const today = () => new Date().toISOString().split("T")[0];
const fmtD = (d) => d ? new Date(d+"T12:00:00").toLocaleDateString("es-CO",{day:"2-digit",month:"short",year:"numeric"}) : "—";
const ago = (d) => { if(!d) return ""; const ms=Date.now()-new Date(d).getTime(); const h=Math.floor(ms/3600000); if(h<24) return `hace ${h}h`; return `hace ${Math.floor(h/24)}d`; };

function useStore(key, init) {
  const [data, setData] = useState(init);
  useEffect(() => { (async () => { try { const r = await window.storage?.get?.(key); if (r?.value) setData(JSON.parse(r.value)); } catch {} })(); }, [key]);
  const save = useCallback(async (v) => { const val = typeof v === "function" ? v(data) : v; setData(val); try { await window.storage?.set?.(key, JSON.stringify(val)); } catch {} }, [key, data]);
  return [data, save];
}

const Card = ({ children, style }) => <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:8, boxShadow:T.shadow, ...style }}>{children}</div>;
const Btn = ({ children, v, sm, on, style, ...p }) => <button onClick={on} style={{ display:"inline-flex", alignItems:"center", gap:5, padding:sm?"5px 10px":"8px 16px", fontSize:sm?10:11, fontWeight:600, border:v==="sec"?`1px solid ${T.border}`:"none", borderRadius:5, background:v==="sec"?"#fff":T.ink, color:v==="sec"?T.inkMid:"#fff", cursor:"pointer", ...style }} {...p}>{children}</button>;

const TABS = [
  { id:"dashboard",   lbl:"Dashboard",      I:BarChart2,      desc:"Resumen de postventa y satisfacción" },
  { id:"tickets",     lbl:"Tickets",        I:MessageCircle,  desc:"Solicitudes y reclamos de clientes" },
  { id:"garantias",   lbl:"Garantías",      I:FileText,       desc:"Control de garantías vigentes" },
  { id:"visitas",     lbl:"Visitas",        I:Home,           desc:"Visitas de inspección y corrección" },
  { id:"encuestas",   lbl:"Satisfacción",   I:Star,           desc:"Encuestas y calificaciones" },
];

const PRIORIDAD = [
  { id:"baja",    lbl:"Baja",    color:T.green,  bg:T.greenBg },
  { id:"media",   lbl:"Media",   color:T.amber,  bg:T.amberBg },
  { id:"alta",    lbl:"Alta",    color:"#D4840A", bg:"#FFF3E0" },
  { id:"urgente", lbl:"Urgente", color:T.red,    bg:T.redBg },
];

const CATEGORIAS = ["Impermeabilización","Pintura","Grietas/fisuras","Instalaciones hidráulicas","Instalaciones eléctricas","Carpintería","Pisos","Cielos","Cerraduras/chapas","Otro"];

export default function HabitarisPostventa() {
  const [tab, setTab] = useState("dashboard");
  const [tickets, saveTickets] = useStore("hab:postventa:tickets", []);
  const [garantias, saveGarantias] = useStore("hab:postventa:garantias", []);
  const [visitas, saveVisitas] = useStore("hab:postventa:visitas", []);
  const [encuestas, saveEncuestas] = useStore("hab:postventa:encuestas", []);
  const [expandedTicket, setExpandedTicket] = useState(null);

  const inp = { border:`1px solid ${T.border}`, borderRadius:4, padding:"6px 10px", fontSize:12, background:"#fff" };

  const addTicket = () => {
    const n = { id:uid(), fecha:new Date().toISOString(), numero:`TK-${String(tickets.length+1).padStart(4,"0")}`,
      cliente:"", proyecto:"", categoria:"Otro", prioridad:"media", descripcion:"", estado:"abierto",
      contacto:"", telefono:"", email:"",
      seguimiento:[], resolucion:"" };
    saveTickets(prev => [...prev, n]);
    setExpandedTicket(n.id);
  };

  const updTicket = (id, k, v) => saveTickets(prev => prev.map(t => t.id === id ? { ...t, [k]: v } : t));

  const addSeguimiento = (ticketId, nota) => {
    saveTickets(prev => prev.map(t => t.id === ticketId ? {
      ...t, seguimiento: [...(t.seguimiento||[]), { id:uid(), fecha:new Date().toISOString(), nota, por:"Habitaris" }]
    } : t));
  };

  const openTickets = tickets.filter(t => t.estado === "abierto" || t.estado === "en_proceso");
  const avgSatisf = encuestas.length > 0 ? (encuestas.reduce((s,e)=>s+(e.calificacion||0),0)/encuestas.length).toFixed(1) : "—";

  return (
    <>
      <Fonts/>
      <div style={{ height:"100vh", display:"flex", flexDirection:"column", background:T.bg, overflow:"hidden" }}>
        <div style={{ background:T.surface, borderBottom:`1px solid ${T.border}`, padding:"11px 28px", display:"flex", alignItems:"center", gap:14 }}>
          <svg width={26} height={26} viewBox="0 0 34 34" fill="none"><rect x="2.5" y="4.5" width="25" height="25" stroke={T.ink} strokeWidth="1.2"/><rect x="7.5" y="10" width="4" height="13" fill={T.ink}/><rect x="7.5" y="15.5" width="13" height="3" fill={T.ink}/><rect x="16.5" y="10" width="4" height="13" fill={T.ink}/></svg>
          <span style={{ fontSize:13, fontWeight:800, letterSpacing:3.5, textTransform:"uppercase" }}>HABITARIS</span>
          <span style={{ fontSize:11, color:T.inkLight }}>/ Postventa</span>
          <div style={{ flex:1 }}/>
          {openTickets.length > 0 && (
            <div style={{ background:T.amberBg, border:`1px solid ${T.amber}33`, borderRadius:4, padding:"5px 10px", display:"flex", alignItems:"center", gap:5 }}>
              <AlertTriangle size={12} color={T.amber}/>
              <span style={{ fontSize:10, fontWeight:700, color:T.amber }}>{openTickets.length} ticket{openTickets.length!==1?"s":""} abierto{openTickets.length!==1?"s":""}</span>
            </div>
          )}
        </div>

        <div style={{ display:"flex", flex:1, minHeight:0 }}>
          <div style={{ width:200, flexShrink:0, background:T.surface, borderRight:`1px solid ${T.border}`, paddingTop:8 }}>
            {TABS.map(t => {
              const badge = t.id==="tickets" ? openTickets.length : 0;
              return (
                <button key={t.id} onClick={() => setTab(t.id)} style={{
                  display:"flex", alignItems:"center", gap:9, padding:"10px 16px", border:"none",
                  borderLeft:tab===t.id?`3px solid ${T.ink}`:"3px solid transparent",
                  background:tab===t.id?T.accent:"transparent", color:tab===t.id?T.ink:T.inkLight,
                  fontSize:12, fontWeight:tab===t.id?700:400, cursor:"pointer", textAlign:"left", width:"100%" }}>
                  <t.I size={13}/> <span style={{ flex:1 }}>{t.lbl}</span>
                  {badge > 0 && <span style={{ background:T.amber, color:"#fff", fontSize:8, fontWeight:800, padding:"1px 5px", borderRadius:8 }}>{badge}</span>}
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
                    { lbl:"Tickets abiertos", val:openTickets.length, color:T.amber, bg:T.amberBg },
                    { lbl:"Total tickets", val:tickets.length, color:T.blue, bg:T.blueBg },
                    { lbl:"Resueltos", val:tickets.filter(t=>t.estado==="cerrado").length, color:T.green, bg:T.greenBg },
                    { lbl:"Garantías activas", val:garantias.filter(g=>new Date(g.vencimiento)>new Date()).length, color:"#5B3A8C", bg:"#F0ECF6" },
                    { lbl:"Satisfacción", val:avgSatisf, color:parseFloat(avgSatisf)>=4?T.green:T.amber, bg:parseFloat(avgSatisf)>=4?T.greenBg:T.amberBg },
                  ].map(k => (
                    <Card key={k.lbl} style={{ padding:"14px 16px" }}>
                      <div style={{ fontSize:8, fontWeight:700, color:T.inkLight, textTransform:"uppercase", letterSpacing:1 }}>{k.lbl}</div>
                      <div style={{ fontSize:26, fontWeight:800, color:k.color, marginTop:4 }}>{k.val}</div>
                    </Card>
                  ))}
                </div>

                {/* Recent tickets */}
                <Card style={{ padding:0, overflow:"hidden" }}>
                  <div style={{ padding:"12px 16px", borderBottom:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between" }}>
                    <div style={{ fontSize:13, fontWeight:700 }}>Tickets recientes</div>
                    <Btn sm on={addTicket}><Plus size={10}/> Nuevo ticket</Btn>
                  </div>
                  {tickets.length === 0 ? (
                    <div style={{ padding:30, textAlign:"center", color:T.inkLight }}>
                      <Home size={28} style={{ opacity:0.3, marginBottom:8 }}/>
                      <div>Sin tickets de postventa</div>
                    </div>
                  ) : [...tickets].sort((a,b)=>b.fecha>a.fecha?1:-1).slice(0,8).map(t => {
                    const prio = PRIORIDAD.find(p=>p.id===t.prioridad)||PRIORIDAD[1];
                    return (
                      <div key={t.id} style={{ padding:"8px 16px", borderBottom:`1px solid #F0EEE9`, display:"flex", alignItems:"center", gap:10, fontSize:11, cursor:"pointer" }}
                        onClick={() => { setTab("tickets"); setExpandedTicket(t.id); }}>
                        <span style={{ fontFamily:"'DM Mono',monospace", fontSize:9, fontWeight:700, color:T.blue }}>{t.numero}</span>
                        <span style={{ flex:1, fontWeight:500 }}>{t.descripcion?.slice(0,60)||"Sin descripción"}{t.descripcion?.length>60?"...":""}</span>
                        <span style={{ fontSize:9, padding:"2px 6px", borderRadius:3, background:prio.bg, color:prio.color, fontWeight:700 }}>{prio.lbl}</span>
                        <span style={{ fontSize:9, padding:"2px 6px", borderRadius:3, background:t.estado==="cerrado"?T.greenBg:t.estado==="en_proceso"?T.blueBg:T.amberBg, color:t.estado==="cerrado"?T.green:t.estado==="en_proceso"?T.blue:T.amber, fontWeight:700 }}>{t.estado}</span>
                        <span style={{ fontSize:9, color:T.inkLight }}>{ago(t.fecha)}</span>
                      </div>
                    );
                  })}
                </Card>
              </>}

              {/* TICKETS */}
              {tab === "tickets" && <>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
                  <div style={{ fontSize:13, fontWeight:700 }}>Tickets de postventa</div>
                  <Btn sm on={addTicket}><Plus size={10}/> Nuevo ticket</Btn>
                </div>
                {tickets.sort((a,b)=>b.fecha>a.fecha?1:-1).map(t => {
                  const prio = PRIORIDAD.find(p=>p.id===t.prioridad)||PRIORIDAD[1];
                  const exp = expandedTicket === t.id;
                  return (
                    <Card key={t.id} style={{ marginBottom:8, padding:0, overflow:"hidden", borderLeft:`4px solid ${prio.color}` }}>
                      <div onClick={() => setExpandedTicket(exp?null:t.id)}
                        style={{ padding:"12px 16px", cursor:"pointer", display:"flex", alignItems:"center", gap:10,
                          background:exp?T.surfaceAlt:"transparent" }}>
                        <span style={{ fontFamily:"'DM Mono',monospace", fontSize:10, fontWeight:700, color:T.blue }}>{t.numero}</span>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:12, fontWeight:600 }}>{t.cliente || "Cliente"} · {t.proyecto || "Proyecto"}</div>
                          <div style={{ fontSize:10, color:T.inkLight }}>{t.categoria} · {fmtD(t.fecha?.split("T")[0])}</div>
                        </div>
                        <span style={{ fontSize:9, padding:"2px 6px", borderRadius:3, background:prio.bg, color:prio.color, fontWeight:700 }}>{prio.lbl}</span>
                        <select value={t.estado} onChange={e => { e.stopPropagation(); updTicket(t.id, "estado", e.target.value); }}
                          style={{ fontSize:9, padding:"2px 6px", border:`1px solid ${T.border}`, borderRadius:3,
                            background:t.estado==="cerrado"?T.greenBg:t.estado==="en_proceso"?T.blueBg:T.amberBg }}>
                          {["abierto","en_proceso","cerrado"].map(s=><option key={s} value={s}>{s}</option>)}
                        </select>
                        {exp?<ChevronRight size={12} style={{transform:"rotate(90deg)"}}/>:<ChevronRight size={12}/>}
                      </div>
                      {exp && (
                        <div style={{ padding:"0 16px 14px", background:T.surfaceAlt }}>
                          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:8 }}>
                            <div><label style={{ fontSize:8, fontWeight:700, color:T.inkLight, textTransform:"uppercase" }}>Cliente</label>
                              <input value={t.cliente||""} onChange={e=>updTicket(t.id,"cliente",e.target.value)} style={{ ...inp, width:"100%" }}/></div>
                            <div><label style={{ fontSize:8, fontWeight:700, color:T.inkLight, textTransform:"uppercase" }}>Proyecto</label>
                              <input value={t.proyecto||""} onChange={e=>updTicket(t.id,"proyecto",e.target.value)} style={{ ...inp, width:"100%" }}/></div>
                            <div><label style={{ fontSize:8, fontWeight:700, color:T.inkLight, textTransform:"uppercase" }}>Categoría</label>
                              <select value={t.categoria} onChange={e=>updTicket(t.id,"categoria",e.target.value)} style={{ ...inp, width:"100%" }}>
                                {CATEGORIAS.map(c=><option key={c}>{c}</option>)}
                              </select></div>
                          </div>
                          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:8 }}>
                            <input value={t.contacto||""} onChange={e=>updTicket(t.id,"contacto",e.target.value)} placeholder="👤 Contacto" style={inp}/>
                            <input value={t.telefono||""} onChange={e=>updTicket(t.id,"telefono",e.target.value)} placeholder="📱 Teléfono" style={inp}/>
                            <input value={t.email||""} onChange={e=>updTicket(t.id,"email",e.target.value)} placeholder="✉️ Email" style={inp}/>
                          </div>
                          <div style={{ marginBottom:8 }}>
                            <label style={{ fontSize:8, fontWeight:700, color:T.inkLight, textTransform:"uppercase" }}>Descripción del problema</label>
                            <textarea value={t.descripcion||""} onChange={e=>updTicket(t.id,"descripcion",e.target.value)}
                              rows={3} style={{ ...inp, width:"100%", resize:"vertical", lineHeight:1.5 }}/>
                          </div>
                          <div style={{ display:"flex", gap:8, marginBottom:8 }}>
                            <select value={t.prioridad} onChange={e=>updTicket(t.id,"prioridad",e.target.value)} style={{ ...inp, width:100 }}>
                              {PRIORIDAD.map(p=><option key={p.id} value={p.id}>{p.lbl}</option>)}
                            </select>
                          </div>

                          {/* Seguimiento */}
                          <div style={{ fontSize:9, fontWeight:700, color:T.inkLight, textTransform:"uppercase", marginBottom:4, marginTop:8 }}>Seguimiento</div>
                          {(t.seguimiento||[]).map(s => (
                            <div key={s.id} style={{ display:"flex", gap:8, padding:"4px 0", fontSize:10, borderLeft:`2px solid ${T.border}`, paddingLeft:10, marginLeft:4, marginBottom:2 }}>
                              <span style={{ color:T.inkLight, minWidth:60 }}>{fmtD(s.fecha?.split("T")[0])}</span>
                              <span style={{ fontWeight:600 }}>{s.por}</span>
                              <span style={{ color:T.inkMid }}>{s.nota}</span>
                            </div>
                          ))}
                          <div style={{ display:"flex", gap:6, marginTop:4 }}>
                            <input id={`seg-${t.id}`} placeholder="Añadir nota de seguimiento..." style={{ ...inp, flex:1, fontSize:10 }}/>
                            <Btn sm v="sec" on={() => {
                              const el = document.getElementById(`seg-${t.id}`);
                              if (el?.value.trim()) { addSeguimiento(t.id, el.value); el.value = ""; }
                            }}><Plus size={9}/> Añadir</Btn>
                          </div>

                          {t.estado === "cerrado" && (
                            <div style={{ marginTop:8 }}>
                              <label style={{ fontSize:8, fontWeight:700, color:T.inkLight, textTransform:"uppercase" }}>Resolución</label>
                              <textarea value={t.resolucion||""} onChange={e=>updTicket(t.id,"resolucion",e.target.value)}
                                rows={2} placeholder="Descripción de la solución aplicada..." style={{ ...inp, width:"100%", resize:"vertical", background:T.greenBg }}/>
                            </div>
                          )}

                          <div style={{ display:"flex", justifyContent:"flex-end", marginTop:8 }}>
                            <button onClick={()=>saveTickets(prev=>prev.filter(x=>x.id!==t.id))} style={{ background:"none", border:"none", color:T.red, fontSize:10, cursor:"pointer" }}>🗑️ Eliminar ticket</button>
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })}
                {tickets.length === 0 && <Card style={{ padding:30, textAlign:"center" }}><div style={{ color:T.inkLight }}>Sin tickets. Crea el primero.</div></Card>}
              </>}

              {/* GARANTÍAS */}
              {tab === "garantias" && <>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
                  <div style={{ fontSize:13, fontWeight:700 }}>Control de garantías</div>
                  <Btn sm on={() => saveGarantias(prev => [...prev, { id:uid(), proyecto:"", cliente:"", concepto:"", inicio:today(), vencimiento:(() => { const d=new Date(); d.setFullYear(d.getFullYear()+1); return d.toISOString().split("T")[0]; })(), estado:"vigente" }])}><Plus size={10}/> Nueva garantía</Btn>
                </div>
                <Card style={{ padding:0, overflow:"hidden" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse" }}>
                    <thead><tr style={{ background:T.surfaceAlt }}>
                      {["Proyecto","Cliente","Concepto","Inicio","Vencimiento","Estado",""].map(h=>(
                        <th key={h} style={{ padding:"8px 10px", fontSize:8, fontWeight:700, color:T.inkLight, textTransform:"uppercase", textAlign:"left", borderBottom:`2px solid ${T.border}` }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {garantias.map(g => {
                        const vigente = new Date(g.vencimiento) > new Date();
                        return (
                          <tr key={g.id} style={{ borderBottom:`1px solid ${T.border}` }}>
                            <td style={{ padding:"6px 10px" }}><input value={g.proyecto||""} onChange={e=>saveGarantias(prev=>prev.map(x=>x.id===g.id?{...x,proyecto:e.target.value}:x))} placeholder="Proyecto" style={{ border:"none", background:"transparent", fontSize:11, fontWeight:600, width:"100%" }}/></td>
                            <td style={{ padding:"6px 10px" }}><input value={g.cliente||""} onChange={e=>saveGarantias(prev=>prev.map(x=>x.id===g.id?{...x,cliente:e.target.value}:x))} placeholder="Cliente" style={{ border:"none", background:"transparent", fontSize:11, width:"100%" }}/></td>
                            <td style={{ padding:"6px 10px" }}><input value={g.concepto||""} onChange={e=>saveGarantias(prev=>prev.map(x=>x.id===g.id?{...x,concepto:e.target.value}:x))} placeholder="Concepto" style={{ border:"none", background:"transparent", fontSize:11, width:"100%" }}/></td>
                            <td style={{ padding:"6px 10px" }}><input type="date" value={g.inicio} onChange={e=>saveGarantias(prev=>prev.map(x=>x.id===g.id?{...x,inicio:e.target.value}:x))} style={{ border:"none", background:"transparent", fontSize:10 }}/></td>
                            <td style={{ padding:"6px 10px" }}><input type="date" value={g.vencimiento} onChange={e=>saveGarantias(prev=>prev.map(x=>x.id===g.id?{...x,vencimiento:e.target.value}:x))} style={{ border:"none", background:"transparent", fontSize:10 }}/></td>
                            <td style={{ padding:"6px 10px" }}><span style={{ fontSize:9, fontWeight:700, padding:"2px 6px", borderRadius:3, background:vigente?T.greenBg:T.redBg, color:vigente?T.green:T.red }}>{vigente?"Vigente":"Vencida"}</span></td>
                            <td style={{ padding:"6px 10px" }}><button onClick={()=>saveGarantias(prev=>prev.filter(x=>x.id!==g.id))} style={{ background:"none", border:"none", color:T.red, cursor:"pointer" }}><Trash2 size={11}/></button></td>
                          </tr>
                        );
                      })}
                      {garantias.length === 0 && <tr><td colSpan={7} style={{ padding:30, textAlign:"center", color:T.inkLight }}>Sin garantías registradas</td></tr>}
                    </tbody>
                  </table>
                </Card>
              </>}

              {/* VISITAS */}
              {tab === "visitas" && <>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
                  <div style={{ fontSize:13, fontWeight:700 }}>Visitas de postventa</div>
                  <Btn sm on={() => saveVisitas(prev => [...prev, { id:uid(), fecha:today(), proyecto:"", cliente:"", motivo:"", responsable:"", estado:"programada", observaciones:"" }])}><Plus size={10}/> Nueva visita</Btn>
                </div>
                {visitas.sort((a,b)=>b.fecha>a.fecha?1:-1).map(v => (
                  <Card key={v.id} style={{ padding:14, marginBottom:8 }}>
                    <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
                      <input type="date" value={v.fecha} onChange={e=>saveVisitas(prev=>prev.map(x=>x.id===v.id?{...x,fecha:e.target.value}:x))} style={{ border:`1px solid ${T.border}`, borderRadius:3, padding:"4px 8px", fontSize:10 }}/>
                      <input value={v.proyecto||""} onChange={e=>saveVisitas(prev=>prev.map(x=>x.id===v.id?{...x,proyecto:e.target.value}:x))} placeholder="Proyecto" style={{ flex:1, border:"none", background:"transparent", fontSize:12, fontWeight:600 }}/>
                      <input value={v.cliente||""} onChange={e=>saveVisitas(prev=>prev.map(x=>x.id===v.id?{...x,cliente:e.target.value}:x))} placeholder="Cliente" style={{ width:120, ...inp, fontSize:10 }}/>
                      <input value={v.responsable||""} onChange={e=>saveVisitas(prev=>prev.map(x=>x.id===v.id?{...x,responsable:e.target.value}:x))} placeholder="Responsable" style={{ width:100, ...inp, fontSize:10 }}/>
                      <select value={v.estado} onChange={e=>saveVisitas(prev=>prev.map(x=>x.id===v.id?{...x,estado:e.target.value}:x))} style={{ fontSize:9, padding:"2px 6px", border:`1px solid ${T.border}`, borderRadius:3, background:v.estado==="realizada"?T.greenBg:"#fff" }}>
                        {["programada","realizada","cancelada"].map(s=><option key={s}>{s}</option>)}
                      </select>
                      <button onClick={()=>saveVisitas(prev=>prev.filter(x=>x.id!==v.id))} style={{ background:"none", border:"none", color:T.red, cursor:"pointer" }}><Trash2 size={11}/></button>
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginTop:6 }}>
                      <input value={v.motivo||""} onChange={e=>saveVisitas(prev=>prev.map(x=>x.id===v.id?{...x,motivo:e.target.value}:x))} placeholder="Motivo de la visita" style={{ ...inp, fontSize:10 }}/>
                      <input value={v.observaciones||""} onChange={e=>saveVisitas(prev=>prev.map(x=>x.id===v.id?{...x,observaciones:e.target.value}:x))} placeholder="Observaciones" style={{ ...inp, fontSize:10 }}/>
                    </div>
                  </Card>
                ))}
                {visitas.length === 0 && <Card style={{ padding:30, textAlign:"center" }}><div style={{ color:T.inkLight }}>Sin visitas programadas</div></Card>}
              </>}

              {/* ENCUESTAS */}
              {tab === "encuestas" && <>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
                  <div style={{ fontSize:13, fontWeight:700 }}>Encuestas de satisfacción</div>
                  <Btn sm on={() => saveEncuestas(prev => [...prev, { id:uid(), fecha:today(), proyecto:"", cliente:"", calificacion:5, comentario:"" }])}><Plus size={10}/> Nueva encuesta</Btn>
                </div>

                {encuestas.length > 0 && (
                  <Card style={{ padding:16, marginBottom:14, textAlign:"center", background:parseFloat(avgSatisf)>=4?T.greenBg:T.amberBg }}>
                    <div style={{ fontSize:10, fontWeight:700, color:T.inkLight, textTransform:"uppercase" }}>Satisfacción promedio</div>
                    <div style={{ fontSize:36, fontWeight:800, color:parseFloat(avgSatisf)>=4?T.green:T.amber }}>
                      {"⭐".repeat(Math.round(parseFloat(avgSatisf)||0))} {avgSatisf}/5
                    </div>
                    <div style={{ fontSize:11, color:T.inkMid }}>{encuestas.length} encuestas realizadas</div>
                  </Card>
                )}

                {encuestas.sort((a,b)=>b.fecha>a.fecha?1:-1).map(e => (
                  <Card key={e.id} style={{ padding:14, marginBottom:8 }}>
                    <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                      <input type="date" value={e.fecha} onChange={ev=>saveEncuestas(prev=>prev.map(x=>x.id===e.id?{...x,fecha:ev.target.value}:x))} style={{ border:`1px solid ${T.border}`, borderRadius:3, padding:"4px 8px", fontSize:10 }}/>
                      <input value={e.proyecto||""} onChange={ev=>saveEncuestas(prev=>prev.map(x=>x.id===e.id?{...x,proyecto:ev.target.value}:x))} placeholder="Proyecto" style={{ flex:1, border:"none", background:"transparent", fontSize:12, fontWeight:600 }}/>
                      <input value={e.cliente||""} onChange={ev=>saveEncuestas(prev=>prev.map(x=>x.id===e.id?{...x,cliente:ev.target.value}:x))} placeholder="Cliente" style={{ width:120, ...inp, fontSize:10 }}/>
                      <div style={{ display:"flex", gap:2 }}>
                        {[1,2,3,4,5].map(n => (
                          <button key={n} onClick={()=>saveEncuestas(prev=>prev.map(x=>x.id===e.id?{...x,calificacion:n}:x))}
                            style={{ background:"none", border:"none", fontSize:18, cursor:"pointer", opacity:n<=e.calificacion?1:0.2 }}>⭐</button>
                        ))}
                      </div>
                      <button onClick={()=>saveEncuestas(prev=>prev.filter(x=>x.id!==e.id))} style={{ background:"none", border:"none", color:T.red, cursor:"pointer" }}><Trash2 size={11}/></button>
                    </div>
                    <input value={e.comentario||""} onChange={ev=>saveEncuestas(prev=>prev.map(x=>x.id===e.id?{...x,comentario:ev.target.value}:x))} placeholder="Comentarios del cliente..." style={{ ...inp, width:"100%", marginTop:6, fontSize:10 }}/>
                  </Card>
                ))}
                {encuestas.length === 0 && <Card style={{ padding:30, textAlign:"center" }}><div style={{ color:T.inkLight }}>Sin encuestas. Crea la primera.</div></Card>}
              </>}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
