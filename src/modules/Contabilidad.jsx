import React, { useState, useEffect, useCallback, useMemo } from "react";
import { DollarSign, Plus, Trash2, Edit3, Check, X, Search, Download, Upload, FileText, BarChart2, TrendingUp, CreditCard, Receipt, PieChart, ArrowUpRight, ArrowDownRight, Calendar } from "lucide-react";

const Fonts = () => <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}body{font-family:'Outfit',sans-serif;background:#F5F4F1}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#C8C5BE;border-radius:2px}input,select,textarea,button{font-family:'Outfit',sans-serif;outline:none}button{cursor:pointer}@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}.fade-up{animation:fadeUp .22s ease both}`}</style>;
const T = { bg:"#F5F4F1",surface:"#FFFFFF",surfaceAlt:"#FAFAF8",ink:"#111",inkMid:"#555",inkLight:"#909090",inkXLight:"#C8C5BE",border:"#E4E1DB",accent:"#EDEBE7",green:"#1E6B42",greenBg:"#E8F4EE",red:"#AE2C2C",redBg:"#FAE8E8",amber:"#7A5218",amberBg:"#FAF0E0",blue:"#1E4F8C",blueBg:"#E6EFF9",shadow:"0 1px 3px rgba(0,0,0,.06),0 4px 16px rgba(0,0,0,.05)" };
const uid = () => Math.random().toString(36).slice(2, 9);
const today = () => new Date().toISOString().split("T")[0];
const fmt = (n) => n ? new Intl.NumberFormat("es-CO", { maximumFractionDigits:0 }).format(n) : "$0";
const fmtD = (d) => d ? new Date(d+"T12:00:00").toLocaleDateString("es-CO",{day:"2-digit",month:"short",year:"numeric"}) : "—";

function useStore(key, init) {
  const [data, setData] = useState(init);
  useEffect(() => { (async () => { try { const r = await window.storage?.get?.(key); if (r?.value) setData(JSON.parse(r.value)); } catch {} })(); }, [key]);
  const save = useCallback(async (v) => { const val = typeof v === "function" ? v(data) : v; setData(val); try { await window.storage?.set?.(key, JSON.stringify(val)); } catch {} }, [key, data]);
  return [data, save];
}

const Card = ({ children, style }) => <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:8, boxShadow:T.shadow, ...style }}>{children}</div>;
const Btn = ({ children, v, sm, on, style, ...p }) => <button onClick={on} style={{ display:"inline-flex", alignItems:"center", gap:5, padding:sm?"5px 10px":"8px 16px", fontSize:sm?10:11, fontWeight:600, border:v==="sec"?`1px solid ${T.border}`:"none", borderRadius:5, background:v==="sec"?"#fff":T.ink, color:v==="sec"?T.inkMid:"#fff", cursor:"pointer", ...style }} {...p}>{children}</button>;

const TABS = [
  { id:"dashboard", lbl:"Dashboard",      I:BarChart2,    desc:"Resumen financiero del período" },
  { id:"ingresos",  lbl:"Ingresos",       I:ArrowUpRight, desc:"Facturación, cobros y anticipos" },
  { id:"egresos",   lbl:"Egresos",        I:ArrowDownRight,desc:"Pagos, compras y nómina" },
  { id:"facturas",  lbl:"Facturas",       I:Receipt,      desc:"Emisión y seguimiento de facturas" },
  { id:"costos",    lbl:"Costos reales",  I:PieChart,     desc:"Comparación presupuesto vs ejecución" },
  { id:"informes",  lbl:"Informes",       I:FileText,     desc:"Reportes financieros y tributarios" },
];

export default function HabitarisContabilidad() {
  const [tab, setTab] = useState("dashboard");
  const [movimientos, saveMov] = useStore("hab:conta:movimientos", []);
  const [facturas, saveFact] = useStore("hab:conta:facturas", []);

  const ingresos = movimientos.filter(m => m.tipo === "ingreso");
  const egresos = movimientos.filter(m => m.tipo === "egreso");
  const totalIng = ingresos.reduce((s, m) => s + (m.monto || 0), 0);
  const totalEgr = egresos.reduce((s, m) => s + (m.monto || 0), 0);
  const balance = totalIng - totalEgr;

  const addMov = (tipo) => {
    const n = { id:uid(), tipo, fecha:today(), concepto:"", monto:0, categoria:"", proyecto:"", estado:"registrado" };
    saveMov(prev => [...prev, n]);
  };

  const updMov = (id, k, v) => saveMov(prev => prev.map(m => m.id === id ? { ...m, [k]: v } : m));
  const delMov = (id) => saveMov(prev => prev.filter(m => m.id !== id));

  const addFactura = () => {
    const n = { id:uid(), numero:`FV-${String(facturas.length+1).padStart(4,"0")}`, fecha:today(), cliente:"", concepto:"", subtotal:0, iva:0, total:0, estado:"borrador" };
    saveFact(prev => [...prev, n]);
  };

  const inp = { border:`1px solid ${T.border}`, borderRadius:4, padding:"6px 10px", fontSize:12, background:"#fff" };

  return (
    <>
      <Fonts/>
      <div style={{ height:"100vh", display:"flex", flexDirection:"column", background:T.bg, overflow:"hidden" }}>
        <div style={{ background:T.surface, borderBottom:`1px solid ${T.border}`, padding:"11px 28px", display:"flex", alignItems:"center", gap:14 }}>
          <svg width={26} height={26} viewBox="0 0 34 34" fill="none"><rect x="2.5" y="4.5" width="25" height="25" stroke={T.ink} strokeWidth="1.2"/><rect x="7.5" y="10" width="4" height="13" fill={T.ink}/><rect x="7.5" y="15.5" width="13" height="3" fill={T.ink}/><rect x="16.5" y="10" width="4" height="13" fill={T.ink}/></svg>
          <span style={{ fontSize:13, fontWeight:800, letterSpacing:3.5, textTransform:"uppercase" }}>HABITARIS</span>
          <span style={{ fontSize:11, color:T.inkLight }}>/ Contabilidad</span>
        </div>

        <div style={{ display:"flex", flex:1, minHeight:0 }}>
          <div style={{ width:200, flexShrink:0, background:T.surface, borderRight:`1px solid ${T.border}`, paddingTop:8 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                display:"flex", alignItems:"center", gap:9, padding:"10px 16px", border:"none",
                borderLeft:tab===t.id?`3px solid ${T.ink}`:"3px solid transparent",
                background:tab===t.id?T.accent:"transparent", color:tab===t.id?T.ink:T.inkLight,
                fontSize:12, fontWeight:tab===t.id?700:400, cursor:"pointer", textAlign:"left", width:"100%" }}>
                <t.I size={13}/> {t.lbl}
              </button>
            ))}
          </div>

          <div style={{ flex:1, overflowY:"auto", padding:"24px 28px", maxWidth:1100 }}>
            <div className="fade-up">
              {/* DASHBOARD */}
              {tab === "dashboard" && <>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:12, marginBottom:20 }}>
                  {[
                    { lbl:"Ingresos", val:fmt(totalIng), color:T.green, bg:T.greenBg, icon:ArrowUpRight },
                    { lbl:"Egresos", val:fmt(totalEgr), color:T.red, bg:T.redBg, icon:ArrowDownRight },
                    { lbl:"Balance", val:fmt(balance), color:balance>=0?T.green:T.red, bg:balance>=0?T.greenBg:T.redBg, icon:DollarSign },
                    { lbl:"Facturas", val:facturas.length, color:T.blue, bg:T.blueBg, icon:Receipt },
                  ].map(k => (
                    <Card key={k.lbl} style={{ padding:"14px 16px" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <div>
                          <div style={{ fontSize:8, fontWeight:700, color:T.inkLight, textTransform:"uppercase", letterSpacing:1 }}>{k.lbl}</div>
                          <div style={{ fontSize:22, fontWeight:800, color:k.color, marginTop:4, fontFamily:"'DM Mono',monospace" }}>{k.val}</div>
                        </div>
                        <div style={{ width:32, height:32, borderRadius:8, background:k.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
                          <k.icon size={16} color={k.color}/>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Recent transactions */}
                <Card style={{ padding:0, overflow:"hidden" }}>
                  <div style={{ padding:"12px 16px", borderBottom:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between" }}>
                    <div style={{ fontSize:13, fontWeight:700 }}>Últimos movimientos</div>
                    <div style={{ display:"flex", gap:6 }}>
                      <Btn sm on={() => addMov("ingreso")} style={{ background:T.green }}><Plus size={10}/> Ingreso</Btn>
                      <Btn sm on={() => addMov("egreso")} style={{ background:T.red }}><Plus size={10}/> Egreso</Btn>
                    </div>
                  </div>
                  {movimientos.length === 0 ? (
                    <div style={{ padding:30, textAlign:"center", color:T.inkLight }}>Sin movimientos registrados</div>
                  ) : [...movimientos].sort((a,b) => b.fecha > a.fecha ? 1 : -1).slice(0,15).map(m => (
                    <div key={m.id} style={{ padding:"8px 16px", borderBottom:`1px solid #F0EEE9`, display:"flex", alignItems:"center", gap:10, fontSize:11 }}>
                      <span style={{ fontSize:14 }}>{m.tipo==="ingreso"?"💰":"💸"}</span>
                      <span style={{ fontSize:10, color:T.inkLight }}>{fmtD(m.fecha)}</span>
                      <span style={{ flex:1, fontWeight:500 }}>{m.concepto || "Sin concepto"}</span>
                      {m.proyecto && <span style={{ fontSize:9, padding:"2px 6px", background:T.blueBg, color:T.blue, borderRadius:3 }}>{m.proyecto}</span>}
                      <span style={{ fontFamily:"'DM Mono',monospace", fontWeight:700, color:m.tipo==="ingreso"?T.green:T.red }}>
                        {m.tipo==="ingreso"?"+":"−"}${fmt(m.monto)}
                      </span>
                    </div>
                  ))}
                </Card>
              </>}

              {/* INGRESOS / EGRESOS */}
              {(tab === "ingresos" || tab === "egresos") && (() => {
                const tipo = tab === "ingresos" ? "ingreso" : "egreso";
                const items = movimientos.filter(m => m.tipo === tipo);
                return <>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
                    <div style={{ fontSize:13, fontWeight:700 }}>{tab === "ingresos" ? "Registro de ingresos" : "Registro de egresos"}</div>
                    <Btn sm on={() => addMov(tipo)} style={{ background:tipo==="ingreso"?T.green:T.red }}>
                      <Plus size={10}/> Nuevo {tipo}
                    </Btn>
                  </div>
                  <Card style={{ padding:0, overflow:"hidden" }}>
                    <table style={{ width:"100%", borderCollapse:"collapse" }}>
                      <thead><tr style={{ background:T.surfaceAlt }}>
                        {["Fecha","Concepto","Categoría","Proyecto","Monto","Estado",""].map(h=>(
                          <th key={h} style={{ padding:"8px 10px", fontSize:8, fontWeight:700, color:T.inkLight, textTransform:"uppercase", textAlign:h==="Monto"?"right":"left", borderBottom:`2px solid ${T.border}` }}>{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>
                        {items.sort((a,b)=>b.fecha>a.fecha?1:-1).map(m => (
                          <tr key={m.id} style={{ borderBottom:`1px solid ${T.border}` }}>
                            <td style={{ padding:"6px 10px" }}><input type="date" value={m.fecha} onChange={e=>updMov(m.id,"fecha",e.target.value)} style={{ ...inp, padding:"3px 6px", fontSize:10, border:"none", background:"transparent" }}/></td>
                            <td style={{ padding:"6px 10px" }}><input value={m.concepto} onChange={e=>updMov(m.id,"concepto",e.target.value)} placeholder="Concepto..." style={{ border:"none", background:"transparent", fontSize:12, width:"100%" }}/></td>
                            <td style={{ padding:"6px 10px" }}><select value={m.categoria||""} onChange={e=>updMov(m.id,"categoria",e.target.value)} style={{ ...inp, fontSize:10, padding:"3px 6px", border:"none", background:"transparent" }}>
                              <option value="">—</option>
                              {(tipo==="ingreso"?["Anticipo","Corte de obra","Diseño","Consultoría","Otro"]:["Materiales","Mano de obra","Subcontrato","Equipos","Transporte","Servicios","Otro"]).map(c=><option key={c}>{c}</option>)}
                            </select></td>
                            <td style={{ padding:"6px 10px" }}><input value={m.proyecto||""} onChange={e=>updMov(m.id,"proyecto",e.target.value)} placeholder="—" style={{ border:"none", background:"transparent", fontSize:10, width:80 }}/></td>
                            <td style={{ padding:"6px 10px", textAlign:"right" }}><input type="number" value={m.monto||""} onChange={e=>updMov(m.id,"monto",+e.target.value)} style={{ border:`1px solid ${T.border}`, borderRadius:3, padding:"3px 6px", fontSize:11, width:100, textAlign:"right", fontFamily:"'DM Mono',monospace", background:"#fff" }}/></td>
                            <td style={{ padding:"6px 10px" }}><select value={m.estado} onChange={e=>updMov(m.id,"estado",e.target.value)} style={{ ...inp, fontSize:9, padding:"2px 6px" }}>
                              {["registrado","pendiente","pagado","anulado"].map(s=><option key={s}>{s}</option>)}
                            </select></td>
                            <td style={{ padding:"6px 10px" }}><button onClick={()=>delMov(m.id)} style={{ background:"none", border:"none", color:T.red, cursor:"pointer" }}><Trash2 size={11}/></button></td>
                          </tr>
                        ))}
                        {items.length === 0 && <tr><td colSpan={7} style={{ padding:20, textAlign:"center", color:T.inkLight }}>Sin {tipo}s registrados</td></tr>}
                        {items.length > 0 && <tr style={{ background:tipo==="ingreso"?T.greenBg:T.redBg }}>
                          <td colSpan={4} style={{ padding:"8px 10px", fontWeight:700 }}>TOTAL</td>
                          <td style={{ padding:"8px 10px", textAlign:"right", fontFamily:"'DM Mono',monospace", fontWeight:700, color:tipo==="ingreso"?T.green:T.red }}>${fmt(items.reduce((s,m)=>s+(m.monto||0),0))}</td>
                          <td colSpan={2}/>
                        </tr>}
                      </tbody>
                    </table>
                  </Card>
                </>;
              })()}

              {/* FACTURAS */}
              {tab === "facturas" && <>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
                  <div style={{ fontSize:13, fontWeight:700 }}>Facturación</div>
                  <Btn sm on={addFactura}><Plus size={10}/> Nueva factura</Btn>
                </div>
                <Card style={{ padding:0, overflow:"hidden" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse" }}>
                    <thead><tr style={{ background:T.surfaceAlt }}>
                      {["N°","Fecha","Cliente","Concepto","Subtotal","IVA","Total","Estado",""].map(h=>(
                        <th key={h} style={{ padding:"8px 10px", fontSize:8, fontWeight:700, color:T.inkLight, textTransform:"uppercase", textAlign:["Subtotal","IVA","Total"].includes(h)?"right":"left", borderBottom:`2px solid ${T.border}` }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {facturas.map(f => (
                        <tr key={f.id} style={{ borderBottom:`1px solid ${T.border}` }}>
                          <td style={{ padding:"6px 10px", fontFamily:"'DM Mono',monospace", fontSize:10, fontWeight:700 }}>{f.numero}</td>
                          <td style={{ padding:"6px 10px" }}><input type="date" value={f.fecha} onChange={e=>saveFact(prev=>prev.map(x=>x.id===f.id?{...x,fecha:e.target.value}:x))} style={{ border:"none", background:"transparent", fontSize:10 }}/></td>
                          <td style={{ padding:"6px 10px" }}><input value={f.cliente} onChange={e=>saveFact(prev=>prev.map(x=>x.id===f.id?{...x,cliente:e.target.value}:x))} placeholder="Cliente" style={{ border:"none", background:"transparent", fontSize:11, width:"100%" }}/></td>
                          <td style={{ padding:"6px 10px" }}><input value={f.concepto} onChange={e=>saveFact(prev=>prev.map(x=>x.id===f.id?{...x,concepto:e.target.value}:x))} placeholder="Concepto" style={{ border:"none", background:"transparent", fontSize:11, width:"100%" }}/></td>
                          <td style={{ padding:"6px 10px", textAlign:"right" }}><input type="number" value={f.subtotal||""} onChange={e=>{const st=+e.target.value;const iva=Math.round(st*0.19);saveFact(prev=>prev.map(x=>x.id===f.id?{...x,subtotal:st,iva,total:st+iva}:x));}} style={{ border:`1px solid ${T.border}`, borderRadius:3, padding:"3px 6px", fontSize:10, width:80, textAlign:"right", fontFamily:"'DM Mono',monospace", background:"#fff" }}/></td>
                          <td style={{ padding:"6px 10px", textAlign:"right", fontFamily:"'DM Mono',monospace", fontSize:10, color:T.inkLight }}>{fmt(f.iva)}</td>
                          <td style={{ padding:"6px 10px", textAlign:"right", fontFamily:"'DM Mono',monospace", fontSize:11, fontWeight:700 }}>{fmt(f.total)}</td>
                          <td style={{ padding:"6px 10px" }}><select value={f.estado} onChange={e=>saveFact(prev=>prev.map(x=>x.id===f.id?{...x,estado:e.target.value}:x))} style={{ fontSize:9, padding:"2px 6px", border:`1px solid ${T.border}`, borderRadius:3, background:f.estado==="pagada"?T.greenBg:f.estado==="enviada"?T.blueBg:"#fff" }}>
                            {["borrador","enviada","pagada","anulada"].map(s=><option key={s}>{s}</option>)}
                          </select></td>
                          <td style={{ padding:"6px 10px" }}><button onClick={()=>saveFact(prev=>prev.filter(x=>x.id!==f.id))} style={{ background:"none", border:"none", color:T.red, cursor:"pointer" }}><Trash2 size={11}/></button></td>
                        </tr>
                      ))}
                      {facturas.length === 0 && <tr><td colSpan={9} style={{ padding:30, textAlign:"center", color:T.inkLight }}>Sin facturas</td></tr>}
                    </tbody>
                  </table>
                </Card>
              </>}

              {/* COSTOS REALES */}
              {tab === "costos" && (
                <Card style={{ padding:18 }}>
                  <div style={{ fontSize:14, fontWeight:700, marginBottom:4 }}>Control de costos reales</div>
                  <div style={{ fontSize:11, color:T.inkLight, marginBottom:14 }}>Comparación entre presupuesto aprobado y ejecución real</div>
                  <div style={{ padding:30, textAlign:"center", background:T.surfaceAlt, borderRadius:6, border:`1px solid ${T.border}` }}>
                    <PieChart size={32} style={{ color:T.inkLight, opacity:0.3, marginBottom:8 }}/>
                    <div style={{ fontSize:12, fontWeight:600, color:T.inkMid }}>Se alimenta automáticamente de los egresos registrados por proyecto</div>
                    <div style={{ fontSize:10, color:T.inkLight, marginTop:4 }}>Registra egresos asociados a un proyecto para ver el comparativo</div>
                  </div>
                </Card>
              )}

              {/* INFORMES */}
              {tab === "informes" && (
                <Card style={{ padding:18 }}>
                  <div style={{ fontSize:14, fontWeight:700, marginBottom:14 }}>Informes financieros</div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                    {[
                      { lbl:"Estado de resultados", desc:"P&L por período con ingresos y gastos", icon:"📊" },
                      { lbl:"Flujo de caja real", desc:"Entradas y salidas por mes", icon:"💰" },
                      { lbl:"Cuentas por cobrar", desc:"Facturas pendientes de cobro", icon:"📋" },
                      { lbl:"Cuentas por pagar", desc:"Obligaciones pendientes con proveedores", icon:"📑" },
                      { lbl:"Retenciones", desc:"Retención en la fuente, ICA, IVA", icon:"🏛️" },
                      { lbl:"Reporte DIAN", desc:"Información exógena y declaraciones", icon:"🇨🇴" },
                    ].map(inf => (
                      <div key={inf.lbl} style={{ padding:"14px 16px", background:T.surfaceAlt, borderRadius:6, border:`1px solid ${T.border}`, cursor:"pointer" }}
                        onMouseEnter={e=>e.currentTarget.style.borderColor=T.blue} onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
                        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                          <span style={{ fontSize:18 }}>{inf.icon}</span>
                          <span style={{ fontSize:12, fontWeight:700 }}>{inf.lbl}</span>
                        </div>
                        <div style={{ fontSize:10, color:T.inkLight }}>{inf.desc}</div>
                      </div>
                    ))}
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
