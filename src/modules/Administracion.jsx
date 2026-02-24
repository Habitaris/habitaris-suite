import React, { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, Check, X, Search, DollarSign, CreditCard, Briefcase, TrendingUp, TrendingDown, FileText, ChevronRight, Download, AlertTriangle, Eye } from "lucide-react";

/* ═══════════════════════════════════════════════════════════════
   ADMINISTRACIÓN — Habitaris Suite
   Tabs: Caja Chica · Legalizaciones Tarjeta · Viáticos ·
         Flujo de Caja Empresa · Cuentas por Cobrar / Pagar
   ═══════════════════════════════════════════════════════════════ */

const Fonts = () => <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}body{font-family:'Outfit',sans-serif;background:#F5F4F1}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#C8C5BE;border-radius:2px}input,select,textarea,button{font-family:'Outfit',sans-serif;outline:none}button{cursor:pointer}@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}.fade-up{animation:fadeUp .22s ease both}`}</style>;
const T = { bg:"#F5F4F1",surface:"#FFFFFF",surfaceAlt:"#FAFAF8",ink:"#111",inkMid:"#555",inkLight:"#909090",inkXLight:"#C8C5BE",border:"#E4E1DB",accent:"#EDEBE7",green:"#1E6B42",greenBg:"#E8F4EE",red:"#AE2C2C",redBg:"#FAE8E8",amber:"#7A5218",amberBg:"#FAF0E0",blue:"#1E4F8C",blueBg:"#E6EFF9",shadow:"0 1px 3px rgba(0,0,0,.06),0 4px 16px rgba(0,0,0,.05)" };
const uid = () => Math.random().toString(36).slice(2,10);
const today = () => new Date().toISOString().split("T")[0];
const fmt = (n) => new Intl.NumberFormat("es-CO",{maximumFractionDigits:0}).format(n||0);
const Card = ({children,style,...p}) => <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:16,boxShadow:T.shadow,...style}} {...p}>{children}</div>;
const Btn = ({children,on,v,style,...p}) => <button onClick={on} style={{padding:"7px 16px",borderRadius:5,border:v==="sec"?`1px solid ${T.border}`:"none",background:v==="sec"?"#fff":v==="danger"?"#AE2C2C":"#111",color:v==="sec"?T.inkMid:v==="danger"?"#fff":"#fff",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif",display:"inline-flex",alignItems:"center",gap:5,...style}} {...p}>{children}</button>;
const FI = ({lbl,val,on,ph,type,style,...p}) => <div style={{marginBottom:8,...style}}><label style={{display:"block",fontSize:8,fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:.5,marginBottom:2}}>{lbl}</label><input type={type||"text"} value={val} onChange={on} placeholder={ph||""} style={{width:"100%",padding:"6px 8px",border:`1px solid ${T.border}`,borderRadius:4,fontSize:11,background:"#fff"}} {...p}/></div>;
const STitle = ({t,s}) => <div style={{marginBottom:12}}><h3 style={{margin:0,fontSize:14,fontWeight:700}}>{t}</h3>{s && <p style={{margin:0,fontSize:10,color:T.inkMid}}>{s}</p>}</div>;
const Badge = ({children,color}) => <span style={{fontSize:8,fontWeight:700,padding:"2px 8px",borderRadius:10,background:color+"22",color}}>{children}</span>;
const inp = { border:`1px solid ${T.border}`, borderRadius:3, padding:"4px 8px", fontSize:11, fontFamily:"'Outfit',sans-serif", background:"#fff" };

const TABS = [
  { id:"dashboard",lbl:"📊 Dashboard",       icon:TrendingUp },
  { id:"caja",    lbl:"💰 Caja Chica",       icon:DollarSign },
  { id:"tarjeta", lbl:"💳 Legalizaciones",    icon:CreditCard },
  { id:"viaticos",lbl:"✈️ Viáticos",          icon:Briefcase },
  { id:"flujo",   lbl:"📈 Flujo Empresa",     icon:TrendingUp },
  { id:"cxc",     lbl:"📋 CxC / CxP",         icon:FileText },
];

/* ═══════════════════════════════════════════════════════════════
   TAB 1: CAJA CHICA
   ═══════════════════════════════════════════════════════════════ */
function TabCaja({ data, save }) {
  const cajas = data.adm_cajas || [];
  const setCajas = (v) => save("adm_cajas", typeof v==="function"?v(cajas):v);
  const [selCaja, setSelCaja] = useState(cajas[0]?.id || null);
  const [showNew, setShowNew] = useState(false);
  const [showMov, setShowMov] = useState(false);
  const [newCaja, setNewCaja] = useState({ nombre:"", fondoInicial:0, responsable:"" });
  const [newMov, setNewMov] = useState({ fecha:today(), tipo:"salida", concepto:"", monto:0, responsable:"", soporte:"", proyecto:"" });

  const caja = cajas.find(c=>c.id===selCaja);
  const movimientos = caja?.movimientos || [];
  const saldo = (caja?.fondoInicial||0) + movimientos.reduce((s,m) => s + (m.tipo==="entrada"?m.monto:-m.monto), 0);

  const crearCaja = () => {
    const c = { id:uid(), ...newCaja, fondoInicial:parseFloat(newCaja.fondoInicial)||0, movimientos:[], estado:"abierta", fechaCreacion:today() };
    setCajas([...cajas, c]);
    setSelCaja(c.id);
    setNewCaja({ nombre:"", fondoInicial:0, responsable:"" });
    setShowNew(false);
  };
  const addMov = () => {
    const m = { id:uid(), ...newMov, monto:parseFloat(newMov.monto)||0 };
    setCajas(cajas.map(c => c.id===selCaja ? {...c, movimientos:[...c.movimientos, m]} : c));
    setNewMov({ fecha:today(), tipo:"salida", concepto:"", monto:0, responsable:"", soporte:"", proyecto:"" });
    setShowMov(false);
  };
  const delMov = (mid) => setCajas(cajas.map(c => c.id===selCaja ? {...c, movimientos:c.movimientos.filter(m=>m.id!==mid)} : c));
  const cerrarCaja = () => setCajas(cajas.map(c => c.id===selCaja ? {...c, estado:"cerrada", fechaCierre:today()} : c));
  const reponerCaja = () => {
    const gastado = movimientos.filter(m=>m.tipo==="salida").reduce((s,m)=>s+m.monto,0) - movimientos.filter(m=>m.tipo==="entrada").reduce((s,m)=>s+m.monto,0);
    if (gastado <= 0) return;
    const m = { id:uid(), fecha:today(), tipo:"entrada", concepto:"Reposición de caja chica", monto:gastado, responsable:"Admin", soporte:"", proyecto:"" };
    setCajas(cajas.map(c => c.id===selCaja ? {...c, movimientos:[...c.movimientos, m]} : c));
  };

  return (
    <div className="fade-up">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div>
          <p style={{margin:0,fontSize:10,color:T.inkLight,letterSpacing:1.5,textTransform:"uppercase"}}>Caja chica</p>
          <h2 style={{margin:0,fontSize:18,fontWeight:700}}>Control de fondos menores</h2>
        </div>
        <Btn on={()=>setShowNew(true)}><Plus size={11}/> Nueva caja</Btn>
      </div>

      {cajas.length === 0 ? (
        <Card style={{textAlign:"center",padding:40,color:T.inkLight}}>Sin cajas creadas. Pulsa "+ Nueva caja" para empezar.</Card>
      ) : (
        <div style={{display:"flex",gap:14}}>
          {/* Sidebar cajas */}
          <div style={{width:200,flexShrink:0}}>
            {cajas.map(c => {
              const sal = (c.fondoInicial||0) + (c.movimientos||[]).reduce((s,m)=>s+(m.tipo==="entrada"?m.monto:-m.monto),0);
              return (
                <Card key={c.id} onClick={()=>setSelCaja(c.id)}
                  style={{padding:"10px 12px",marginBottom:6,cursor:"pointer",
                    border:selCaja===c.id?`2px solid ${T.green}`:`1px solid ${T.border}`}}>
                  <div style={{fontSize:11,fontWeight:700}}>{c.nombre}</div>
                  <div style={{fontSize:9,color:T.inkMid}}>{c.responsable}</div>
                  <div style={{fontSize:14,fontWeight:800,fontFamily:"'DM Mono',monospace",color:sal>=0?T.green:T.red,marginTop:4}}>${fmt(sal)}</div>
                  <Badge color={c.estado==="abierta"?T.green:T.red}>{c.estado==="abierta"?"Abierta":"Cerrada"}</Badge>
                </Card>
              );
            })}
          </div>

          {/* Detalle */}
          {caja && (
            <Card style={{flex:1,padding:0,overflow:"hidden"}}>
              {/* Header */}
              <div style={{padding:"12px 16px",background:"#EDEBE7",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:14,fontWeight:700}}>{caja.nombre}</div>
                  <div style={{fontSize:9,color:T.inkMid}}>Fondo: ${fmt(caja.fondoInicial)} · Responsable: {caja.responsable}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:8,fontWeight:700,color:"#888",textTransform:"uppercase"}}>Saldo actual</div>
                  <div style={{fontSize:22,fontWeight:800,fontFamily:"'DM Mono',monospace",color:saldo>=0?T.green:T.red}}>${fmt(saldo)}</div>
                </div>
              </div>
              {/* Actions */}
              <div style={{padding:"8px 16px",borderBottom:`1px solid ${T.border}`,display:"flex",gap:6}}>
                {caja.estado==="abierta" && <>
                  <Btn on={()=>setShowMov(true)}><Plus size={10}/> Movimiento</Btn>
                  <Btn v="sec" on={reponerCaja}>💰 Reponer</Btn>
                  <Btn v="sec" on={cerrarCaja}>🔒 Cerrar caja</Btn>
                </>}
                {caja.estado==="cerrada" && <Badge color={T.red}>Caja cerrada el {caja.fechaCierre}</Badge>}
              </div>
              {/* Tabla movimientos */}
              <div style={{overflowX:"auto"}}>
                <table style={{borderCollapse:"collapse",width:"100%"}}>
                  <thead>
                    <tr style={{background:"#F5F4F1"}}>
                      {["Fecha","Tipo","Concepto","Proyecto","Responsable","Soporte","Monto",""].map(h=>
                        <th key={h} style={{padding:"5px 8px",fontSize:8,fontWeight:700,color:"#888",textTransform:"uppercase",borderBottom:`1px solid ${T.border}`,textAlign:h==="Monto"?"right":"left"}}>{h}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {movimientos.length === 0 ? (
                      <tr><td colSpan={8} style={{padding:20,textAlign:"center",color:T.inkLight,fontSize:11}}>Sin movimientos</td></tr>
                    ) : movimientos.map((m,i) => (
                      <tr key={m.id} style={{borderBottom:`1px solid ${T.border}`,background:i%2?"#FAFAF8":"#fff"}}>
                        <td style={{padding:"5px 8px",fontSize:10,fontFamily:"'DM Mono',monospace"}}>{m.fecha}</td>
                        <td style={{padding:"5px 8px"}}><Badge color={m.tipo==="entrada"?T.green:T.red}>{m.tipo==="entrada"?"⬆ Entrada":"⬇ Salida"}</Badge></td>
                        <td style={{padding:"5px 8px",fontSize:10,fontWeight:500}}>{m.concepto}</td>
                        <td style={{padding:"5px 8px",fontSize:9,color:T.inkMid}}>{m.proyecto||"—"}</td>
                        <td style={{padding:"5px 8px",fontSize:9,color:T.inkMid}}>{m.responsable}</td>
                        <td style={{padding:"5px 8px",fontSize:8,color:T.blue}}>{m.soporte||"—"}</td>
                        <td style={{padding:"5px 8px",textAlign:"right",fontFamily:"'DM Mono',monospace",fontWeight:700,fontSize:11,color:m.tipo==="entrada"?T.green:T.red}}>
                          {m.tipo==="entrada"?"+":"−"}${fmt(m.monto)}
                        </td>
                        <td style={{padding:"3px 4px"}}>
                          {caja.estado==="abierta" && <button onClick={()=>delMov(m.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#C44"}}><Trash2 size={10}/></button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Modal nueva caja */}
      {showNew && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setShowNew(false)}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:8,padding:24,width:400,boxShadow:"0 12px 40px rgba(0,0,0,0.2)"}}>
            <STitle t="Nueva caja chica" s="Fondo rotatorio para gastos menores"/>
            <FI lbl="Nombre" val={newCaja.nombre} on={e=>setNewCaja({...newCaja,nombre:e.target.value})} ph="Caja obra Chicó"/>
            <FI lbl="Fondo inicial" val={newCaja.fondoInicial} on={e=>setNewCaja({...newCaja,fondoInicial:e.target.value})} type="number" ph="500000"/>
            <FI lbl="Responsable" val={newCaja.responsable} on={e=>setNewCaja({...newCaja,responsable:e.target.value})} ph="Almacenista"/>
            <div style={{display:"flex",gap:8,marginTop:10}}>
              <Btn on={crearCaja} style={{flex:1}}><Check size={11}/> Crear</Btn>
              <Btn v="sec" on={()=>setShowNew(false)} style={{flex:1}}>Cancelar</Btn>
            </div>
          </div>
        </div>
      )}

      {/* Modal movimiento */}
      {showMov && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setShowMov(false)}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:8,padding:24,width:420,boxShadow:"0 12px 40px rgba(0,0,0,0.2)"}}>
            <STitle t="Nuevo movimiento" s={caja?.nombre}/>
            <div style={{display:"flex",gap:8,marginBottom:8}}>
              <FI lbl="Fecha" val={newMov.fecha} on={e=>setNewMov({...newMov,fecha:e.target.value})} type="date" style={{flex:1}}/>
              <div style={{flex:1,marginBottom:8}}>
                <label style={{display:"block",fontSize:8,fontWeight:700,color:"#888",textTransform:"uppercase",marginBottom:2}}>Tipo</label>
                <select value={newMov.tipo} onChange={e=>setNewMov({...newMov,tipo:e.target.value})} style={{...inp,width:"100%"}}>
                  <option value="salida">⬇ Salida</option>
                  <option value="entrada">⬆ Entrada</option>
                </select>
              </div>
            </div>
            <FI lbl="Concepto" val={newMov.concepto} on={e=>setNewMov({...newMov,concepto:e.target.value})} ph="Taxi obra, material menor..."/>
            <FI lbl="Monto" val={newMov.monto} on={e=>setNewMov({...newMov,monto:e.target.value})} type="number" ph="25000"/>
            <div style={{display:"flex",gap:8}}>
              <FI lbl="Proyecto" val={newMov.proyecto} on={e=>setNewMov({...newMov,proyecto:e.target.value})} ph="Chicó 94" style={{flex:1}}/>
              <FI lbl="Responsable" val={newMov.responsable} on={e=>setNewMov({...newMov,responsable:e.target.value})} ph="Quien gasta" style={{flex:1}}/>
            </div>
            <FI lbl="Soporte / factura" val={newMov.soporte} on={e=>setNewMov({...newMov,soporte:e.target.value})} ph="Ref. factura o soporte"/>
            <div style={{display:"flex",gap:8,marginTop:10}}>
              <Btn on={addMov} style={{flex:1}}><Check size={11}/> Registrar</Btn>
              <Btn v="sec" on={()=>setShowMov(false)} style={{flex:1}}>Cancelar</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TAB 2: LEGALIZACIONES TARJETA CORPORATIVA
   ═══════════════════════════════════════════════════════════════ */
function TabTarjeta({ data, save }) {
  const movs = data.adm_tarjeta || [];
  const setMovs = (v) => save("adm_tarjeta", typeof v==="function"?v(movs):v);
  const [showNew, setShowNew] = useState(false);
  const [filtro, setFiltro] = useState("todos");
  const [newMov, setNewMov] = useState({ fecha:today(), concepto:"", monto:0, tarjeta:"Corp. Visa", proyecto:"", centroCosto:"", factura:"", correoRef:"", estado:"pendiente" });

  const add = () => {
    setMovs([...movs, { id:uid(), ...newMov, monto:parseFloat(newMov.monto)||0 }]);
    setNewMov({ fecha:today(), concepto:"", monto:0, tarjeta:"Corp. Visa", proyecto:"", centroCosto:"", factura:"", correoRef:"", estado:"pendiente" });
    setShowNew(false);
  };
  const upd = (id,k,v) => setMovs(movs.map(m=>m.id===id?{...m,[k]:v}:m));
  const del = (id) => setMovs(movs.filter(m=>m.id!==id));

  const filtered = filtro==="todos" ? movs : movs.filter(m=>m.estado===filtro);
  const pendientes = movs.filter(m=>m.estado==="pendiente");
  const totalPend = pendientes.reduce((s,m)=>s+m.monto,0);

  const ESTADOS = { pendiente:{lbl:"Pendiente",color:T.amber}, legalizado:{lbl:"Legalizado",color:T.blue}, aprobado:{lbl:"Aprobado",color:T.green}, rechazado:{lbl:"Rechazado",color:T.red} };

  return (
    <div className="fade-up">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div>
          <p style={{margin:0,fontSize:10,color:T.inkLight,letterSpacing:1.5,textTransform:"uppercase"}}>Tarjeta corporativa</p>
          <h2 style={{margin:0,fontSize:18,fontWeight:700}}>Legalizaciones · {pendientes.length} pendientes · ${fmt(totalPend)}</h2>
        </div>
        <Btn on={()=>setShowNew(true)}><Plus size={11}/> Nuevo movimiento</Btn>
      </div>

      {/* Filtros */}
      <div style={{display:"flex",gap:0,marginBottom:14}}>
        {[["todos","Todos"],["pendiente","Pendientes"],["legalizado","Legalizados"],["aprobado","Aprobados"],["rechazado","Rechazados"]].map(([k,lbl],i,arr) => (
          <button key={k} onClick={()=>setFiltro(k)}
            style={{padding:"6px 14px",fontSize:10,fontWeight:600,cursor:"pointer",border:`1px solid ${T.border}`,borderLeft:i>0?"none":undefined,
              fontFamily:"'Outfit',sans-serif",borderRadius:i===0?"5px 0 0 5px":i===arr.length-1?"0 5px 5px 0":"0",
              background:filtro===k?"#111":"#fff",color:filtro===k?"#fff":T.inkMid}}>
            {lbl} {k!=="todos" && <span style={{marginLeft:3,fontSize:8}}>({movs.filter(m=>k==="todos"||m.estado===k).length})</span>}
          </button>
        ))}
      </div>

      <Card style={{padding:0,overflow:"hidden"}}>
        <table style={{borderCollapse:"collapse",width:"100%"}}>
          <thead>
            <tr style={{background:"#EDEBE7"}}>
              {["Fecha","Tarjeta","Concepto","Proyecto","Centro costo","Factura","Correo ref.","Monto","Estado",""].map(h=>
                <th key={h} style={{padding:"6px 8px",fontSize:8,fontWeight:700,color:"#888",textTransform:"uppercase",borderBottom:`2px solid ${T.border}`,textAlign:h==="Monto"?"right":"left"}}>{h}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.length===0 ? (
              <tr><td colSpan={10} style={{padding:24,textAlign:"center",color:T.inkLight,fontSize:11}}>Sin movimientos</td></tr>
            ) : filtered.map((m,i) => (
              <tr key={m.id} style={{borderBottom:`1px solid ${T.border}`,background:i%2?"#FAFAF8":"#fff"}}>
                <td style={{padding:"4px 8px",fontSize:10,fontFamily:"'DM Mono',monospace"}}>{m.fecha}</td>
                <td style={{padding:"4px 8px",fontSize:9}}>{m.tarjeta}</td>
                <td style={{padding:"4px 8px",fontSize:10,fontWeight:500}}>{m.concepto}</td>
                <td style={{padding:"4px 8px",fontSize:9,color:T.inkMid}}>{m.proyecto||"—"}</td>
                <td style={{padding:"4px 8px",fontSize:9,color:T.inkMid}}>{m.centroCosto||"—"}</td>
                <td style={{padding:"4px 8px",fontSize:8,color:T.blue}}>{m.factura||"—"}</td>
                <td style={{padding:"4px 8px",fontSize:8,color:T.inkMid}}>{m.correoRef||"—"}</td>
                <td style={{padding:"4px 8px",textAlign:"right",fontFamily:"'DM Mono',monospace",fontWeight:700,fontSize:11}}>${fmt(m.monto)}</td>
                <td style={{padding:"4px 8px"}}>
                  <select value={m.estado} onChange={e=>upd(m.id,"estado",e.target.value)}
                    style={{fontSize:8,fontWeight:700,padding:"2px 6px",borderRadius:10,border:"none",cursor:"pointer",
                      background:ESTADOS[m.estado]?.color+"22",color:ESTADOS[m.estado]?.color}}>
                    {Object.entries(ESTADOS).map(([k,v])=><option key={k} value={k}>{v.lbl}</option>)}
                  </select>
                </td>
                <td style={{padding:"3px"}}>
                  <button onClick={()=>del(m.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#C44"}}><Trash2 size={10}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Modal */}
      {showNew && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setShowNew(false)}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:8,padding:24,width:460,boxShadow:"0 12px 40px rgba(0,0,0,0.2)"}}>
            <STitle t="Nuevo movimiento tarjeta" s="Registrar gasto para legalizar"/>
            <div style={{display:"flex",gap:8}}>
              <FI lbl="Fecha" val={newMov.fecha} on={e=>setNewMov({...newMov,fecha:e.target.value})} type="date" style={{flex:1}}/>
              <FI lbl="Tarjeta" val={newMov.tarjeta} on={e=>setNewMov({...newMov,tarjeta:e.target.value})} ph="Corp. Visa" style={{flex:1}}/>
            </div>
            <FI lbl="Concepto" val={newMov.concepto} on={e=>setNewMov({...newMov,concepto:e.target.value})} ph="Almuerzo equipo, materiales..."/>
            <FI lbl="Monto" val={newMov.monto} on={e=>setNewMov({...newMov,monto:e.target.value})} type="number"/>
            <div style={{display:"flex",gap:8}}>
              <FI lbl="Proyecto" val={newMov.proyecto} on={e=>setNewMov({...newMov,proyecto:e.target.value})} ph="Opcional" style={{flex:1}}/>
              <FI lbl="Centro de costo" val={newMov.centroCosto} on={e=>setNewMov({...newMov,centroCosto:e.target.value})} ph="Admin, Obra..." style={{flex:1}}/>
            </div>
            <div style={{display:"flex",gap:8}}>
              <FI lbl="Ref. factura" val={newMov.factura} on={e=>setNewMov({...newMov,factura:e.target.value})} ph="FV-001234" style={{flex:1}}/>
              <FI lbl="Correo referencia" val={newMov.correoRef} on={e=>setNewMov({...newMov,correoRef:e.target.value})} ph="Asunto email" style={{flex:1}}/>
            </div>
            <div style={{display:"flex",gap:8,marginTop:10}}>
              <Btn on={add} style={{flex:1}}><Check size={11}/> Registrar</Btn>
              <Btn v="sec" on={()=>setShowNew(false)} style={{flex:1}}>Cancelar</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TAB 3: VIÁTICOS
   ═══════════════════════════════════════════════════════════════ */
function TabViaticos({ data, save }) {
  const viaticos = data.adm_viaticos || [];
  const setViaticos = (v) => save("adm_viaticos", typeof v==="function"?v(viaticos):v);
  const [showNew, setShowNew] = useState(false);
  const [selId, setSelId] = useState(null);
  const [showGasto, setShowGasto] = useState(false);
  const [newV, setNewV] = useState({ solicitante:"", destino:"", dias:1, concepto:"", fecha:today(), fechaRegreso:"" });
  const [newGasto, setNewGasto] = useState({ fecha:today(), concepto:"", monto:0, soporte:"" });

  const ITEMS_VIAJE = [
    { id:"vuelo_ida", lbl:"✈️ Vuelo ida", icon:"✈️" },
    { id:"vuelo_vuelta", lbl:"✈️ Vuelo vuelta", icon:"✈️" },
    { id:"hotel", lbl:"🏨 Hotel", icon:"🏨" },
    { id:"transporte", lbl:"🚕 Transporte terrestre", icon:"🚕" },
    { id:"alimentacion", lbl:"🍽️ Alimentación", icon:"🍽️" },
    { id:"otros", lbl:"📋 Otros", icon:"📋" },
  ];

  const sel = viaticos.find(v=>v.id===selId);
  const ESTADOS = { solicitado:{lbl:"Solicitado",color:T.amber}, aprobado:{lbl:"Aprobado",color:T.blue}, entregado:{lbl:"Anticipo entregado",color:"#5B3A8C"}, legalizado:{lbl:"Legalizado",color:T.green}, rechazado:{lbl:"Rechazado",color:T.red} };

  // Compute totals for a viatico
  const totales = (v) => {
    const items = v.itemsViaje || {};
    const estimado = ITEMS_VIAJE.reduce((s,it) => s + (parseFloat(items[it.id]?.estimado)||0), 0);
    const real = ITEMS_VIAJE.reduce((s,it) => s + (parseFloat(items[it.id]?.real)||0), 0);
    const gastosExtra = (v.gastos||[]).reduce((s,g) => s + g.monto, 0);
    return { estimado, real, gastosExtra, totalReal: real + gastosExtra };
  };

  const crear = () => {
    // Build initial items
    const itemsViaje = {};
    ITEMS_VIAJE.forEach(it => { itemsViaje[it.id] = { estimado:0, real:0, detalle:"" }; });
    const v = { id:uid(), ...newV, dias:parseInt(newV.dias)||1, estado:"solicitado", gastos:[], anticipoEntregado:0, itemsViaje };
    setViaticos([...viaticos, v]);
    setSelId(v.id);
    setNewV({ solicitante:"", destino:"", dias:1, concepto:"", fecha:today(), fechaRegreso:"" });
    setShowNew(false);
  };
  const updV = (id,k,v) => setViaticos(viaticos.map(x=>x.id===id?{...x,[k]:v}:x));
  const updItem = (vId, itemId, field, val) => {
    setViaticos(viaticos.map(v => {
      if (v.id !== vId) return v;
      const items = {...(v.itemsViaje||{})};
      items[itemId] = {...(items[itemId]||{estimado:0,real:0,detalle:""}), [field]:val};
      return {...v, itemsViaje:items};
    }));
  };
  const addGasto = () => {
    const g = { id:uid(), ...newGasto, monto:parseFloat(newGasto.monto)||0 };
    setViaticos(viaticos.map(v=>v.id===selId?{...v,gastos:[...v.gastos,g]}:v));
    setNewGasto({ fecha:today(), concepto:"", monto:0, soporte:"" });
    setShowGasto(false);
  };
  const delGasto = (gid) => setViaticos(viaticos.map(v=>v.id===selId?{...v,gastos:v.gastos.filter(g=>g.id!==gid)}:v));
  const delViatico = (id) => { setViaticos(viaticos.filter(v=>v.id!==id)); if(selId===id) setSelId(null); };

  return (
    <div className="fade-up">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div>
          <p style={{margin:0,fontSize:10,color:T.inkLight,letterSpacing:1.5,textTransform:"uppercase"}}>Viáticos</p>
          <h2 style={{margin:0,fontSize:18,fontWeight:700}}>Solicitudes, anticipos y legalizaciones</h2>
        </div>
        <Btn on={()=>setShowNew(true)}><Plus size={11}/> Nueva solicitud</Btn>
      </div>

      <div style={{display:"flex",gap:14}}>
        {/* Lista */}
        <div style={{width:280,flexShrink:0}}>
          {viaticos.length===0 ? (
            <Card style={{textAlign:"center",padding:20,color:T.inkLight,fontSize:11}}>Sin solicitudes</Card>
          ) : viaticos.map(v => {
            const t = totales(v);
            const saldo = (v.anticipoEntregado||0) - t.totalReal;
            return (
              <Card key={v.id} onClick={()=>setSelId(v.id)}
                style={{padding:"10px 12px",marginBottom:6,cursor:"pointer",
                  border:selId===v.id?`2px solid ${T.green}`:`1px solid ${T.border}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{fontSize:11,fontWeight:700}}>{v.solicitante}</div>
                  <Badge color={ESTADOS[v.estado]?.color||T.amber}>{ESTADOS[v.estado]?.lbl||v.estado}</Badge>
                </div>
                <div style={{fontSize:9,color:T.inkMid}}>{v.destino} · {v.dias} días · {v.fecha}</div>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:4,fontSize:8}}>
                  <span>Est: <strong style={{fontFamily:"'DM Mono',monospace"}}>${fmt(t.estimado)}</strong></span>
                  <span>Real: <strong style={{fontFamily:"'DM Mono',monospace"}}>${fmt(t.totalReal)}</strong></span>
                  <span style={{color:saldo>=0?T.green:T.red}}>
                    {saldo>=0?"Sobra":"Debe"}: <strong style={{fontFamily:"'DM Mono',monospace"}}>${fmt(Math.abs(saldo))}</strong>
                  </span>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Detalle */}
        {sel ? (
          <Card style={{flex:1,padding:0,overflow:"hidden"}}>
            {/* Header */}
            <div style={{padding:"12px 16px",background:"#EDEBE7",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
              <div>
                <div style={{fontSize:14,fontWeight:700}}>{sel.solicitante} — {sel.destino}</div>
                <div style={{fontSize:9,color:T.inkMid}}>{sel.concepto} · {sel.dias} días · {sel.fecha}{sel.fechaRegreso?` → ${sel.fechaRegreso}`:""}</div>
              </div>
              <div style={{display:"flex",gap:4,alignItems:"center"}}>
                <select value={sel.estado} onChange={e=>updV(sel.id,"estado",e.target.value)}
                  style={{...inp,fontSize:9,fontWeight:600}}>
                  {Object.entries(ESTADOS).map(([k,v])=><option key={k} value={k}>{v.lbl}</option>)}
                </select>
                <button onClick={()=>delViatico(sel.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#C44"}} title="Eliminar"><Trash2 size={12}/></button>
              </div>
            </div>

            {/* KPIs */}
            {(()=>{ const t=totales(sel); const saldo=(sel.anticipoEntregado||0)-t.totalReal; return (
              <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:6,padding:"10px 16px",borderBottom:`1px solid ${T.border}`}}>
                {[
                  ["Estimado",fmt(t.estimado),T.ink],
                  ["Anticipo",fmt(sel.anticipoEntregado||0),T.blue],
                  ["Real ítems",fmt(t.real),"#5B3A8C"],
                  ["Otros gastos",fmt(t.gastosExtra),T.red],
                  [saldo>=0?"Saldo a favor":"Saldo a deber",fmt(Math.abs(saldo)),saldo>=0?T.green:T.red],
                ].map(([l,v,c])=>(
                  <div key={l} style={{textAlign:"center"}}>
                    <div style={{fontSize:7,fontWeight:700,color:"#888",textTransform:"uppercase"}}>{l}</div>
                    <div style={{fontSize:13,fontWeight:800,fontFamily:"'DM Mono',monospace",color:c}}>${v}</div>
                  </div>
                ))}
              </div>
            ); })()}

            {/* Anticipo */}
            <div style={{padding:"8px 16px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",gap:8}}>
              <label style={{fontSize:9,fontWeight:600,color:T.inkMid}}>Anticipo entregado:</label>
              <input type="number" value={sel.anticipoEntregado||""} placeholder="0"
                onChange={e=>updV(sel.id,"anticipoEntregado",parseFloat(e.target.value)||0)}
                style={{...inp,width:130,fontFamily:"'DM Mono',monospace",fontWeight:700}}/>
            </div>

            {/* ── DESGLOSE ÍTEMS VIAJE: Estimado vs Real ── */}
            <div style={{padding:"10px 16px",borderBottom:`1px solid ${T.border}`}}>
              <div style={{fontSize:9,fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Desglose del viaje — Estimado vs Real</div>
              <table style={{borderCollapse:"collapse",width:"100%"}}>
                <thead>
                  <tr style={{background:"#F5F4F1"}}>
                    <th style={{padding:"4px 8px",fontSize:8,fontWeight:700,color:"#888",textAlign:"left",borderBottom:`1px solid ${T.border}`,width:"30%"}}>ÍTEM</th>
                    <th style={{padding:"4px 8px",fontSize:8,fontWeight:700,color:"#888",textAlign:"left",borderBottom:`1px solid ${T.border}`,width:"25%"}}>DETALLE</th>
                    <th style={{padding:"4px 8px",fontSize:8,fontWeight:700,color:T.blue,textAlign:"right",borderBottom:`1px solid ${T.border}`,width:"18%"}}>ESTIMADO</th>
                    <th style={{padding:"4px 8px",fontSize:8,fontWeight:700,color:"#5B3A8C",textAlign:"right",borderBottom:`1px solid ${T.border}`,width:"18%"}}>REAL</th>
                    <th style={{padding:"4px 8px",fontSize:8,fontWeight:700,color:"#888",textAlign:"right",borderBottom:`1px solid ${T.border}`,width:"9%"}}>DIF.</th>
                  </tr>
                </thead>
                <tbody>
                  {ITEMS_VIAJE.map((it,i) => {
                    const item = (sel.itemsViaje||{})[it.id] || { estimado:0, real:0, detalle:"" };
                    const est = parseFloat(item.estimado)||0;
                    const real = parseFloat(item.real)||0;
                    const dif = real - est;
                    return (
                      <tr key={it.id} style={{borderBottom:`1px solid ${T.border}`,background:i%2?"#FAFAF8":"#fff"}}>
                        <td style={{padding:"5px 8px",fontSize:10,fontWeight:600}}>{it.icon} {it.lbl.replace(/^[^\s]+ /,"")}</td>
                        <td style={{padding:"3px 4px"}}>
                          <input type="text" value={item.detalle||""} placeholder="Aerolínea, hotel..."
                            onChange={e=>updItem(sel.id,it.id,"detalle",e.target.value)}
                            style={{...inp,width:"100%",fontSize:9,padding:"3px 6px"}}/>
                        </td>
                        <td style={{padding:"3px 4px"}}>
                          <input type="number" value={item.estimado||""} placeholder="0"
                            onChange={e=>updItem(sel.id,it.id,"estimado",e.target.value)}
                            style={{...inp,width:"100%",textAlign:"right",fontSize:10,fontFamily:"'DM Mono',monospace",fontWeight:600,color:T.blue,padding:"3px 6px"}}/>
                        </td>
                        <td style={{padding:"3px 4px"}}>
                          <input type="number" value={item.real||""} placeholder="0"
                            onChange={e=>updItem(sel.id,it.id,"real",e.target.value)}
                            style={{...inp,width:"100%",textAlign:"right",fontSize:10,fontFamily:"'DM Mono',monospace",fontWeight:600,color:"#5B3A8C",padding:"3px 6px"}}/>
                        </td>
                        <td style={{padding:"4px 8px",textAlign:"right",fontSize:9,fontFamily:"'DM Mono',monospace",fontWeight:700,
                          color:dif===0?T.inkLight:dif>0?T.red:T.green}}>
                          {dif===0?"—":dif>0?`+${fmt(dif)}`:`−${fmt(Math.abs(dif))}`}
                        </td>
                      </tr>
                    );
                  })}
                  {/* Totals row */}
                  {(()=>{ const t=totales(sel); const dif=t.real-t.estimado; return (
                    <tr style={{borderTop:`2px solid ${T.ink}`,background:"#EDEBE7"}}>
                      <td colSpan={2} style={{padding:"5px 8px",fontSize:10,fontWeight:800}}>TOTAL ÍTEMS</td>
                      <td style={{padding:"5px 8px",textAlign:"right",fontSize:11,fontFamily:"'DM Mono',monospace",fontWeight:800,color:T.blue}}>${fmt(t.estimado)}</td>
                      <td style={{padding:"5px 8px",textAlign:"right",fontSize:11,fontFamily:"'DM Mono',monospace",fontWeight:800,color:"#5B3A8C"}}>${fmt(t.real)}</td>
                      <td style={{padding:"5px 8px",textAlign:"right",fontSize:9,fontFamily:"'DM Mono',monospace",fontWeight:700,
                        color:dif===0?T.inkLight:dif>0?T.red:T.green}}>
                        {dif===0?"—":dif>0?`+${fmt(dif)}`:`−${fmt(Math.abs(dif))}`}
                      </td>
                    </tr>
                  ); })()}
                </tbody>
              </table>
            </div>

            {/* ── OTROS GASTOS ADICIONALES ── */}
            <div style={{padding:"8px 16px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:9,fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:1}}>Otros gastos (no previstos)</div>
              <Btn on={()=>setShowGasto(true)} style={{padding:"4px 10px",fontSize:9}}><Plus size={9}/> Gasto</Btn>
            </div>
            <table style={{borderCollapse:"collapse",width:"100%"}}>
              <thead>
                <tr style={{background:"#F5F4F1"}}>
                  {["Fecha","Concepto","Soporte","Monto",""].map(h=>
                    <th key={h} style={{padding:"4px 8px",fontSize:8,fontWeight:700,color:"#888",textTransform:"uppercase",borderBottom:`1px solid ${T.border}`,textAlign:h==="Monto"?"right":"left"}}>{h}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {(sel.gastos||[]).length===0 ? (
                  <tr><td colSpan={5} style={{padding:12,textAlign:"center",color:T.inkLight,fontSize:9}}>Sin gastos adicionales</td></tr>
                ) : (sel.gastos||[]).map((g,i) => (
                  <tr key={g.id} style={{borderBottom:`1px solid ${T.border}`,background:i%2?"#FAFAF8":"#fff"}}>
                    <td style={{padding:"4px 8px",fontSize:10,fontFamily:"'DM Mono',monospace"}}>{g.fecha}</td>
                    <td style={{padding:"4px 8px",fontSize:10}}>{g.concepto}</td>
                    <td style={{padding:"4px 8px",fontSize:8,color:T.blue}}>{g.soporte||"—"}</td>
                    <td style={{padding:"4px 8px",textAlign:"right",fontFamily:"'DM Mono',monospace",fontWeight:700,fontSize:11,color:T.red}}>−${fmt(g.monto)}</td>
                    <td style={{padding:"3px"}}><button onClick={()=>delGasto(g.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#C44"}}><Trash2 size={10}/></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        ) : (
          <Card style={{flex:1,textAlign:"center",padding:40,color:T.inkLight}}>Selecciona una solicitud</Card>
        )}
      </div>

      {/* Modal nueva solicitud */}
      {showNew && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setShowNew(false)}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:8,padding:24,width:440,boxShadow:"0 12px 40px rgba(0,0,0,0.2)"}}>
            <STitle t="Nueva solicitud de viáticos" s="Se creará con desglose de ítems para estimar costos"/>
            <FI lbl="Solicitante" val={newV.solicitante} on={e=>setNewV({...newV,solicitante:e.target.value})} ph="Nombre completo"/>
            <div style={{display:"flex",gap:8}}>
              <FI lbl="Destino" val={newV.destino} on={e=>setNewV({...newV,destino:e.target.value})} ph="Ciudad / lugar" style={{flex:1}}/>
              <FI lbl="Días" val={newV.dias} on={e=>setNewV({...newV,dias:e.target.value})} type="number" style={{flex:"0 0 65px"}}/>
            </div>
            <div style={{display:"flex",gap:8}}>
              <FI lbl="Fecha ida" val={newV.fecha} on={e=>setNewV({...newV,fecha:e.target.value})} type="date" style={{flex:1}}/>
              <FI lbl="Fecha regreso" val={newV.fechaRegreso} on={e=>setNewV({...newV,fechaRegreso:e.target.value})} type="date" style={{flex:1}}/>
            </div>
            <FI lbl="Concepto / motivo" val={newV.concepto} on={e=>setNewV({...newV,concepto:e.target.value})} ph="Visita obra, capacitación, reunión cliente..."/>
            <div style={{display:"flex",gap:8,marginTop:10}}>
              <Btn on={crear} style={{flex:1}}><Check size={11}/> Crear solicitud</Btn>
              <Btn v="sec" on={()=>setShowNew(false)} style={{flex:1}}>Cancelar</Btn>
            </div>
          </div>
        </div>
      )}

      {/* Modal gasto extra */}
      {showGasto && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setShowGasto(false)}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:8,padding:24,width:380,boxShadow:"0 12px 40px rgba(0,0,0,0.2)"}}>
            <STitle t="Gasto adicional" s={sel?.solicitante+" — "+sel?.destino}/>
            <FI lbl="Fecha" val={newGasto.fecha} on={e=>setNewGasto({...newGasto,fecha:e.target.value})} type="date"/>
            <FI lbl="Concepto" val={newGasto.concepto} on={e=>setNewGasto({...newGasto,concepto:e.target.value})} ph="Imprevisto, taxi extra..."/>
            <FI lbl="Monto" val={newGasto.monto} on={e=>setNewGasto({...newGasto,monto:e.target.value})} type="number"/>
            <FI lbl="Soporte" val={newGasto.soporte} on={e=>setNewGasto({...newGasto,soporte:e.target.value})} ph="Ref. factura"/>
            <div style={{display:"flex",gap:8,marginTop:10}}>
              <Btn on={addGasto} style={{flex:1}}><Check size={11}/> Añadir</Btn>
              <Btn v="sec" on={()=>setShowGasto(false)} style={{flex:1}}>Cancelar</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TAB 4: FLUJO DE CAJA EMPRESA
   ═══════════════════════════════════════════════════════════════ */
function TabFlujoEmpresa({ data, save }) {
  const movs = data.adm_flujo || [];
  const setMovs = (v) => save("adm_flujo", typeof v==="function"?v(movs):v);
  const [showNew, setShowNew] = useState(false);
  const [mesVista, setMesVista] = useState(() => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; });
  const [newMov, setNewMov] = useState({ fecha:today(), tipo:"ingreso", categoria:"", concepto:"", monto:0, proyecto:"", factura:"", estado:"realizado" });

  const CATS_ING = ["Cobro proyecto","Anticipo cliente","Reembolso","Otro ingreso"];
  const CATS_EGR = ["Nómina","Proveedores","Arriendo","Servicios","Impuestos","Seguros","Transporte","Materiales","Otro egreso"];

  const add = () => {
    setMovs([...movs, { id:uid(), ...newMov, monto:parseFloat(newMov.monto)||0 }]);
    setNewMov({ fecha:today(), tipo:"ingreso", categoria:"", concepto:"", monto:0, proyecto:"", factura:"", estado:"realizado" });
    setShowNew(false);
  };
  const del = (id) => setMovs(movs.filter(m=>m.id!==id));

  // Mes actual filtro
  const movsMes = movs.filter(m => m.fecha?.startsWith(mesVista));
  const ingMes = movsMes.filter(m=>m.tipo==="ingreso").reduce((s,m)=>s+m.monto,0);
  const egrMes = movsMes.filter(m=>m.tipo==="egreso").reduce((s,m)=>s+m.monto,0);

  // Saldo acumulado hasta mes seleccionado
  const movsHasta = movs.filter(m => m.fecha <= mesVista+"-31" && m.estado==="realizado");
  const saldoAcum = movsHasta.reduce((s,m) => s+(m.tipo==="ingreso"?m.monto:-m.monto), 0);

  // Proyectados
  const proyectados = movsMes.filter(m=>m.estado==="proyectado");
  const totalProyIng = proyectados.filter(m=>m.tipo==="ingreso").reduce((s,m)=>s+m.monto,0);
  const totalProyEgr = proyectados.filter(m=>m.tipo==="egreso").reduce((s,m)=>s+m.monto,0);

  // Meses disponibles
  const meses = [...new Set(movs.map(m=>m.fecha?.slice(0,7)).filter(Boolean))].sort();
  if (!meses.includes(mesVista)) meses.push(mesVista);
  meses.sort();

  return (
    <div className="fade-up">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div>
          <p style={{margin:0,fontSize:10,color:T.inkLight,letterSpacing:1.5,textTransform:"uppercase"}}>Flujo de caja empresa</p>
          <h2 style={{margin:0,fontSize:18,fontWeight:700}}>Ingresos, egresos y proyección</h2>
        </div>
        <div style={{display:"flex",gap:6}}>
          <select value={mesVista} onChange={e=>setMesVista(e.target.value)} style={{...inp,fontWeight:600}}>
            {meses.map(m=><option key={m} value={m}>{m}</option>)}
          </select>
          <Btn on={()=>setShowNew(true)}><Plus size={11}/> Movimiento</Btn>
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
        {[
          ["Ingresos mes",fmt(ingMes),T.green,"⬆"],
          ["Egresos mes",fmt(egrMes),T.red,"⬇"],
          ["Neto mes",fmt(ingMes-egrMes),(ingMes-egrMes)>=0?T.green:T.red,"📊"],
          ["Saldo acumulado",fmt(saldoAcum),saldoAcum>=0?T.green:T.red,"💰"],
        ].map(([l,v,c,ico])=>(
          <Card key={l} style={{padding:"10px 14px",textAlign:"center"}}>
            <div style={{fontSize:8,fontWeight:700,color:"#888",textTransform:"uppercase"}}>{ico} {l}</div>
            <div style={{fontSize:18,fontWeight:800,fontFamily:"'DM Mono',monospace",color:c,marginTop:2}}>${v}</div>
          </Card>
        ))}
      </div>

      {saldoAcum < 0 && (
        <div style={{background:T.redBg,border:`1px solid ${T.red}33`,borderRadius:6,padding:"8px 14px",marginBottom:14,display:"flex",alignItems:"center",gap:8}}>
          <AlertTriangle size={14} color={T.red}/>
          <div style={{fontSize:10,color:T.red,fontWeight:600}}>⚠️ Saldo acumulado negativo. Revisa cobros pendientes o reduce egresos.</div>
        </div>
      )}

      {/* Tabla */}
      <Card style={{padding:0,overflow:"hidden"}}>
        <table style={{borderCollapse:"collapse",width:"100%"}}>
          <thead>
            <tr style={{background:"#EDEBE7"}}>
              {["Fecha","Tipo","Categoría","Concepto","Proyecto","Factura","Estado","Monto",""].map(h=>
                <th key={h} style={{padding:"6px 8px",fontSize:8,fontWeight:700,color:"#888",textTransform:"uppercase",borderBottom:`2px solid ${T.border}`,textAlign:h==="Monto"?"right":"left"}}>{h}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {movsMes.length===0 ? (
              <tr><td colSpan={9} style={{padding:24,textAlign:"center",color:T.inkLight,fontSize:11}}>Sin movimientos en {mesVista}</td></tr>
            ) : movsMes.sort((a,b)=>a.fecha.localeCompare(b.fecha)).map((m,i) => (
              <tr key={m.id} style={{borderBottom:`1px solid ${T.border}`,background:i%2?"#FAFAF8":"#fff",opacity:m.estado==="proyectado"?0.6:1}}>
                <td style={{padding:"4px 8px",fontSize:10,fontFamily:"'DM Mono',monospace"}}>{m.fecha}</td>
                <td style={{padding:"4px 8px"}}><Badge color={m.tipo==="ingreso"?T.green:T.red}>{m.tipo==="ingreso"?"⬆ Ingreso":"⬇ Egreso"}</Badge></td>
                <td style={{padding:"4px 8px",fontSize:9,color:T.inkMid}}>{m.categoria||"—"}</td>
                <td style={{padding:"4px 8px",fontSize:10,fontWeight:500}}>{m.concepto}</td>
                <td style={{padding:"4px 8px",fontSize:9,color:T.inkMid}}>{m.proyecto||"—"}</td>
                <td style={{padding:"4px 8px",fontSize:8,color:T.blue}}>{m.factura||"—"}</td>
                <td style={{padding:"4px 8px"}}><Badge color={m.estado==="realizado"?T.green:T.amber}>{m.estado==="realizado"?"Realizado":"Proyectado"}</Badge></td>
                <td style={{padding:"4px 8px",textAlign:"right",fontFamily:"'DM Mono',monospace",fontWeight:700,fontSize:11,color:m.tipo==="ingreso"?T.green:T.red}}>
                  {m.tipo==="ingreso"?"+":"−"}${fmt(m.monto)}
                </td>
                <td style={{padding:"3px"}}><button onClick={()=>del(m.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#C44"}}><Trash2 size={10}/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Modal */}
      {showNew && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setShowNew(false)}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:8,padding:24,width:460,boxShadow:"0 12px 40px rgba(0,0,0,0.2)"}}>
            <STitle t="Nuevo movimiento" s="Ingreso o egreso de la empresa"/>
            <div style={{display:"flex",gap:8}}>
              <FI lbl="Fecha" val={newMov.fecha} on={e=>setNewMov({...newMov,fecha:e.target.value})} type="date" style={{flex:1}}/>
              <div style={{flex:1,marginBottom:8}}>
                <label style={{display:"block",fontSize:8,fontWeight:700,color:"#888",textTransform:"uppercase",marginBottom:2}}>Tipo</label>
                <select value={newMov.tipo} onChange={e=>setNewMov({...newMov,tipo:e.target.value,categoria:""})} style={{...inp,width:"100%"}}>
                  <option value="ingreso">⬆ Ingreso</option>
                  <option value="egreso">⬇ Egreso</option>
                </select>
              </div>
              <div style={{flex:1,marginBottom:8}}>
                <label style={{display:"block",fontSize:8,fontWeight:700,color:"#888",textTransform:"uppercase",marginBottom:2}}>Estado</label>
                <select value={newMov.estado} onChange={e=>setNewMov({...newMov,estado:e.target.value})} style={{...inp,width:"100%"}}>
                  <option value="realizado">Realizado</option>
                  <option value="proyectado">Proyectado</option>
                </select>
              </div>
            </div>
            <div style={{marginBottom:8}}>
              <label style={{display:"block",fontSize:8,fontWeight:700,color:"#888",textTransform:"uppercase",marginBottom:2}}>Categoría</label>
              <select value={newMov.categoria} onChange={e=>setNewMov({...newMov,categoria:e.target.value})} style={{...inp,width:"100%"}}>
                <option value="">— Seleccionar —</option>
                {(newMov.tipo==="ingreso"?CATS_ING:CATS_EGR).map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <FI lbl="Concepto" val={newMov.concepto} on={e=>setNewMov({...newMov,concepto:e.target.value})} ph="Descripción"/>
            <FI lbl="Monto" val={newMov.monto} on={e=>setNewMov({...newMov,monto:e.target.value})} type="number"/>
            <div style={{display:"flex",gap:8}}>
              <FI lbl="Proyecto" val={newMov.proyecto} on={e=>setNewMov({...newMov,proyecto:e.target.value})} ph="Opcional" style={{flex:1}}/>
              <FI lbl="Factura" val={newMov.factura} on={e=>setNewMov({...newMov,factura:e.target.value})} ph="FV-001234" style={{flex:1}}/>
            </div>
            <div style={{display:"flex",gap:8,marginTop:10}}>
              <Btn on={add} style={{flex:1}}><Check size={11}/> Registrar</Btn>
              <Btn v="sec" on={()=>setShowNew(false)} style={{flex:1}}>Cancelar</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TAB 5: CUENTAS POR COBRAR / PAGAR
   ═══════════════════════════════════════════════════════════════ */
function TabCxCxP({ data, save }) {
  const cuentas = data.adm_cuentas || [];
  const setCuentas = (v) => save("adm_cuentas", typeof v==="function"?v(cuentas):v);
  const [vista, setVista] = useState("cobrar"); // cobrar | pagar
  const [showNew, setShowNew] = useState(false);
  const [newC, setNewC] = useState({ tipo:"cobrar", tercero:"", concepto:"", monto:0, fechaEmision:today(), fechaVence:"", factura:"", proyecto:"", estado:"vigente" });

  const filtered = cuentas.filter(c=>c.tipo===vista);
  const totalVigente = filtered.filter(c=>c.estado==="vigente").reduce((s,c)=>s+c.monto,0);
  const totalVencida = filtered.filter(c=>c.estado==="vencida").reduce((s,c)=>s+c.monto,0);
  const totalPagada = filtered.filter(c=>c.estado==="pagada").reduce((s,c)=>s+c.monto,0);

  const add = () => {
    setCuentas([...cuentas, { id:uid(), ...newC, tipo:vista, monto:parseFloat(newC.monto)||0 }]);
    setNewC({ tipo:vista, tercero:"", concepto:"", monto:0, fechaEmision:today(), fechaVence:"", factura:"", proyecto:"", estado:"vigente" });
    setShowNew(false);
  };
  const upd = (id,k,v) => setCuentas(cuentas.map(c=>c.id===id?{...c,[k]:v}:c));
  const del = (id) => setCuentas(cuentas.filter(c=>c.id!==id));

  // Check vencidas
  useEffect(() => {
    const hoy = today();
    const updated = cuentas.map(c => {
      if (c.estado==="vigente" && c.fechaVence && c.fechaVence < hoy) return {...c, estado:"vencida"};
      return c;
    });
    if (JSON.stringify(updated) !== JSON.stringify(cuentas)) setCuentas(updated);
  }, []);

  const ESTADOS = { vigente:{lbl:"Vigente",color:T.blue}, vencida:{lbl:"Vencida",color:T.red}, pagada:{lbl:vista==="cobrar"?"Cobrada":"Pagada",color:T.green}, parcial:{lbl:"Parcial",color:T.amber} };

  return (
    <div className="fade-up">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div>
          <p style={{margin:0,fontSize:10,color:T.inkLight,letterSpacing:1.5,textTransform:"uppercase"}}>Cuentas por {vista==="cobrar"?"cobrar":"pagar"}</p>
          <h2 style={{margin:0,fontSize:18,fontWeight:700}}>{vista==="cobrar"?"Lo que nos deben":"Lo que debemos"}</h2>
        </div>
        <div style={{display:"flex",gap:6}}>
          <div style={{display:"flex",gap:0}}>
            {[["cobrar","📥 Por cobrar"],["pagar","📤 Por pagar"]].map(([k,lbl],i)=>(
              <button key={k} onClick={()=>setVista(k)}
                style={{padding:"6px 14px",fontSize:10,fontWeight:600,cursor:"pointer",border:`1px solid ${T.border}`,
                  borderLeft:i>0?"none":undefined,fontFamily:"'Outfit',sans-serif",
                  borderRadius:i===0?"5px 0 0 5px":"0 5px 5px 0",
                  background:vista===k?"#111":"#fff",color:vista===k?"#fff":T.inkMid}}>
                {lbl}
              </button>
            ))}
          </div>
          <Btn on={()=>setShowNew(true)}><Plus size={11}/> Nueva cuenta</Btn>
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:16}}>
        {[
          ["Vigentes",fmt(totalVigente),T.blue],
          ["Vencidas",fmt(totalVencida),T.red],
          [vista==="cobrar"?"Cobradas":"Pagadas",fmt(totalPagada),T.green],
        ].map(([l,v,c])=>(
          <Card key={l} style={{padding:"10px 14px",textAlign:"center"}}>
            <div style={{fontSize:8,fontWeight:700,color:"#888",textTransform:"uppercase"}}>{l}</div>
            <div style={{fontSize:18,fontWeight:800,fontFamily:"'DM Mono',monospace",color:c,marginTop:2}}>${v}</div>
          </Card>
        ))}
      </div>

      {totalVencida > 0 && (
        <div style={{background:T.redBg,border:`1px solid ${T.red}33`,borderRadius:6,padding:"8px 14px",marginBottom:14,display:"flex",alignItems:"center",gap:8}}>
          <AlertTriangle size={14} color={T.red}/>
          <div style={{fontSize:10,color:T.red,fontWeight:600}}>
            {filtered.filter(c=>c.estado==="vencida").length} {vista==="cobrar"?"facturas por cobrar":"facturas por pagar"} vencidas por ${fmt(totalVencida)}
          </div>
        </div>
      )}

      {/* Tabla */}
      <Card style={{padding:0,overflow:"hidden"}}>
        <table style={{borderCollapse:"collapse",width:"100%"}}>
          <thead>
            <tr style={{background:"#EDEBE7"}}>
              {["Factura","Tercero","Concepto","Proyecto","Emitida","Vence","Monto","Estado",""].map(h=>
                <th key={h} style={{padding:"6px 8px",fontSize:8,fontWeight:700,color:"#888",textTransform:"uppercase",borderBottom:`2px solid ${T.border}`,textAlign:h==="Monto"?"right":"left"}}>{h}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.length===0 ? (
              <tr><td colSpan={9} style={{padding:24,textAlign:"center",color:T.inkLight,fontSize:11}}>Sin cuentas registradas</td></tr>
            ) : filtered.sort((a,b)=>(a.fechaVence||"").localeCompare(b.fechaVence||"")).map((c,i) => (
              <tr key={c.id} style={{borderBottom:`1px solid ${T.border}`,background:c.estado==="vencida"?"#FAE8E844":i%2?"#FAFAF8":"#fff"}}>
                <td style={{padding:"4px 8px",fontSize:10,fontFamily:"'DM Mono',monospace",fontWeight:700}}>{c.factura||"—"}</td>
                <td style={{padding:"4px 8px",fontSize:10,fontWeight:600}}>{c.tercero}</td>
                <td style={{padding:"4px 8px",fontSize:10}}>{c.concepto}</td>
                <td style={{padding:"4px 8px",fontSize:9,color:T.inkMid}}>{c.proyecto||"—"}</td>
                <td style={{padding:"4px 8px",fontSize:9,fontFamily:"'DM Mono',monospace"}}>{c.fechaEmision}</td>
                <td style={{padding:"4px 8px",fontSize:9,fontFamily:"'DM Mono',monospace",color:c.estado==="vencida"?T.red:T.ink,fontWeight:c.estado==="vencida"?700:400}}>{c.fechaVence||"—"}</td>
                <td style={{padding:"4px 8px",textAlign:"right",fontFamily:"'DM Mono',monospace",fontWeight:700,fontSize:11}}>${fmt(c.monto)}</td>
                <td style={{padding:"4px 8px"}}>
                  <select value={c.estado} onChange={e=>upd(c.id,"estado",e.target.value)}
                    style={{fontSize:8,fontWeight:700,padding:"2px 6px",borderRadius:10,border:"none",cursor:"pointer",
                      background:ESTADOS[c.estado]?.color+"22",color:ESTADOS[c.estado]?.color}}>
                    {Object.entries(ESTADOS).map(([k,v])=><option key={k} value={k}>{v.lbl}</option>)}
                  </select>
                </td>
                <td style={{padding:"3px"}}><button onClick={()=>del(c.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#C44"}}><Trash2 size={10}/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Modal */}
      {showNew && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setShowNew(false)}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:8,padding:24,width:460,boxShadow:"0 12px 40px rgba(0,0,0,0.2)"}}>
            <STitle t={`Nueva cuenta por ${vista}`} s={vista==="cobrar"?"Factura emitida a cliente":"Factura recibida de proveedor"}/>
            <div style={{display:"flex",gap:8}}>
              <FI lbl="Tercero" val={newC.tercero} on={e=>setNewC({...newC,tercero:e.target.value})} ph={vista==="cobrar"?"Cliente":"Proveedor"} style={{flex:1}}/>
              <FI lbl="Nro. factura" val={newC.factura} on={e=>setNewC({...newC,factura:e.target.value})} ph="FV-001234" style={{flex:1}}/>
            </div>
            <FI lbl="Concepto" val={newC.concepto} on={e=>setNewC({...newC,concepto:e.target.value})} ph="Anticipo 30%, Acta parcial..."/>
            <FI lbl="Monto" val={newC.monto} on={e=>setNewC({...newC,monto:e.target.value})} type="number"/>
            <div style={{display:"flex",gap:8}}>
              <FI lbl="Fecha emisión" val={newC.fechaEmision} on={e=>setNewC({...newC,fechaEmision:e.target.value})} type="date" style={{flex:1}}/>
              <FI lbl="Fecha vencimiento" val={newC.fechaVence} on={e=>setNewC({...newC,fechaVence:e.target.value})} type="date" style={{flex:1}}/>
            </div>
            <FI lbl="Proyecto" val={newC.proyecto} on={e=>setNewC({...newC,proyecto:e.target.value})} ph="Opcional"/>
            <div style={{display:"flex",gap:8,marginTop:10}}>
              <Btn on={add} style={{flex:1}}><Check size={11}/> Registrar</Btn>
              <Btn v="sec" on={()=>setShowNew(false)} style={{flex:1}}>Cancelar</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN EXPORT
   ═══════════════════════════════════════════════════════════════ */
export default function Administracion() {
  const STORE_KEY = "habitaris_admin";
  const [data, setData] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { return {}; }
  });
  const save = (k,v) => setData(prev => { const n = {...prev,[k]:v}; localStorage.setItem(STORE_KEY,JSON.stringify(n)); return n; });
  const [tab, setTab] = useState("dashboard");

  /* Mini-dashboard KPIs */
  const cajas = data.adm_cajas || [];
  const tarjeta = data.adm_tarjeta || [];
  const viaticos = data.adm_viaticos || [];
  const flujo = data.adm_flujo || [];
  const cuentas = data.adm_cuentas || [];
  const saldoCajas = cajas.reduce((s,c) => { const mov=(c.movimientos||[]); return s+(c.fondoInicial||0)+mov.reduce((ss,m)=>ss+(m.tipo==="entrada"?m.monto:-m.monto),0); },0);
  const tarjPend = tarjeta.filter(t=>t.estado==="pendiente");
  const viatPend = viaticos.filter(v=>v.estado==="solicitado"||v.estado==="aprobado");
  const hoy = new Date().toISOString().split("T")[0];
  const mesActual = hoy.slice(0,7);
  const flujoMes = flujo.filter(m=>m.fecha?.startsWith(mesActual));
  const ingMes = flujoMes.filter(m=>m.tipo==="ingreso").reduce((s,m)=>s+m.monto,0);
  const egrMes = flujoMes.filter(m=>m.tipo==="egreso").reduce((s,m)=>s+m.monto,0);
  const cxcVenc = cuentas.filter(c=>c.tipo==="cobrar"&&c.estado==="vencida").reduce((s,c)=>s+c.monto,0);
  const cxpVenc = cuentas.filter(c=>c.tipo==="pagar"&&c.estado==="vencida").reduce((s,c)=>s+c.monto,0);
  const F=n=>new Intl.NumberFormat("es-CO",{maximumFractionDigits:0}).format(n||0);

  return (
    <>
      <Fonts/>
      <div style={{padding:"30px 36px",maxWidth:1400,margin:"0 auto"}}>
        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <div>
            <div style={{fontSize:22,fontWeight:800,letterSpacing:1}}>💼 Administración</div>
            <div style={{fontSize:10,color:T.inkMid}}>Caja chica · Tarjeta · Viáticos · Flujo empresa · CxC / CxP</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{display:"flex",gap:0,marginBottom:20}}>
          {TABS.map((t,i) => (
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{padding:"10px 18px",fontSize:11,fontWeight:600,cursor:"pointer",
                border:`1px solid ${T.border}`,borderLeft:i>0?"none":undefined,
                fontFamily:"'Outfit',sans-serif",whiteSpace:"nowrap",
                borderRadius:i===0?"6px 0 0 6px":i===TABS.length-1?"0 6px 6px 0":"0",
                background:tab===t.id?"#111":"#fff",
                color:tab===t.id?"#fff":T.inkMid,
                borderBottom:tab===t.id?`2px solid #fff`:`1px solid ${T.border}`}}>
              {t.lbl}
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === "dashboard" && (
          <div className="fade-up">
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
              {[["💰 Saldo cajas","$"+F(saldoCajas),saldoCajas>=0?"#1E6B42":"#AE2C2C"],["💳 Legaliz. pend.",tarjPend.length,tarjPend.length>0?"#7A5218":"#1E6B42"],["✈️ Viáticos pend.",viatPend.length,viatPend.length>0?"#7A5218":"#1E6B42"],["📈 Flujo neto mes","$"+F(ingMes-egrMes),(ingMes-egrMes)>=0?"#1E6B42":"#AE2C2C"]].map(([l,v,c])=>(
                <div key={l} style={{background:"#fff",border:`1px solid ${T.border}`,borderRadius:8,padding:"14px 16px",boxShadow:T.shadow}}>
                  <div style={{fontSize:8,fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>{l}</div>
                  <div style={{fontSize:22,fontWeight:800,fontFamily:"'DM Mono',monospace",color:c}}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
              {[["⬆ Ingresos mes","$"+F(ingMes),"#1E6B42"],["⬇ Egresos mes","$"+F(egrMes),"#AE2C2C"],["🚨 CxC vencidas","$"+F(cxcVenc),cxcVenc>0?"#AE2C2C":"#1E6B42"],["🚨 CxP vencidas","$"+F(cxpVenc),cxpVenc>0?"#AE2C2C":"#1E6B42"]].map(([l,v,c])=>(
                <div key={l} style={{background:"#fff",border:`1px solid ${T.border}`,borderRadius:8,padding:"14px 16px",boxShadow:T.shadow}}>
                  <div style={{fontSize:8,fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>{l}</div>
                  <div style={{fontSize:22,fontWeight:800,fontFamily:"'DM Mono',monospace",color:c}}>{v}</div>
                </div>
              ))}
            </div>
            {(cxcVenc>0||cxpVenc>0||tarjPend.length>0)&&<div style={{background:"#FAE8E8",border:"1px solid #AE2C2C33",borderRadius:6,padding:"10px 14px",fontSize:10,color:"#AE2C2C",fontWeight:600}}>
              ⚠️ {[cxcVenc>0&&`CxC vencidas $${F(cxcVenc)}`,cxpVenc>0&&`CxP vencidas $${F(cxpVenc)}`,tarjPend.length>0&&`${tarjPend.length} legalizaciones pendientes`].filter(Boolean).join(" · ")}
            </div>}
          </div>
        )}
        {tab === "caja"     && <TabCaja data={data} save={save}/>}
        {tab === "tarjeta"  && <TabTarjeta data={data} save={save}/>}
        {tab === "viaticos" && <TabViaticos data={data} save={save}/>}
        {tab === "flujo"    && <TabFlujoEmpresa data={data} save={save}/>}
        {tab === "cxc"      && <TabCxCxP data={data} save={save}/>}
      </div>
    </>
  );
}
