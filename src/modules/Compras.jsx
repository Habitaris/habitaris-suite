import React, { useState, useMemo } from "react";
import { Plus, Trash2, Check, X, Search, Edit3, AlertTriangle, ChevronDown, Eye, Star, Package, FileText, Truck } from "lucide-react";

/* ═══════════════════════════════════════════════════════════════
   COMPRAS — Habitaris Suite
   Tabs: Órdenes de Compra · Recepción · Evaluación Proveedores
   ═══════════════════════════════════════════════════════════════ */

const Fonts = () => <style>{`@import url('https://fonts.googleapis.com/css2?family=DM Sans:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}body{font-family:'DM Sans',sans-serif;background:#F5F4F1}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#C8C5BE;border-radius:2px}input,select,textarea,button{font-family:'DM Sans',sans-serif;outline:none}button{cursor:pointer}@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}.fade-up{animation:fadeUp .22s ease both}`}</style>;
const T = { bg:"#F5F4F1",surface:"#FFFFFF",ink:"#111",inkMid:"#555",inkLight:"#909090",inkXLight:"#C8C5BE",border:"#E0E0E0",accent:"#EDEBE7",green:"#111111",greenBg:"#E8F4EE",red:"#B91C1C",redBg:"#FAE8E8",amber:"#8C6A00",amberBg:"#FAF0E0",blue:"#3B3B3B",blueBg:"#F0F0F0",shadow:"0 1px 3px rgba(0,0,0,.06),0 4px 16px rgba(0,0,0,.05)" };
const uid = () => Math.random().toString(36).slice(2,10);
const today = () => new Date().toISOString().split("T")[0];
const fmt = (n) => new Intl.NumberFormat("es-CO",{maximumFractionDigits:0}).format(n||0);
const Card = ({children,style,...p}) => <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:16,boxShadow:T.shadow,...style}} {...p}>{children}</div>;
const Btn = ({children,on,v,style,...p}) => <button onClick={on} style={{padding:"7px 16px",borderRadius:5,border:v==="sec"?`1px solid ${T.border}`:"none",background:v==="sec"?"#fff":v==="danger"?"#B91C1C":"#111",color:v==="sec"?T.inkMid:"#fff",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",display:"inline-flex",alignItems:"center",gap:5,...style}} {...p}>{children}</button>;
const FI = ({lbl,val,on,ph,type,style,children,...p}) => <div style={{marginBottom:8,...style}}><label style={{display:"block",fontSize:8,fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:.5,marginBottom:2}}>{lbl}</label>{children||<input type={type||"text"} value={val} onChange={on} placeholder={ph||""} style={{width:"100%",padding:"6px 8px",border:`1px solid ${T.border}`,borderRadius:4,fontSize:11,background:"#fff"}} {...p}/>}</div>;
const Badge = ({children,color}) => <span style={{fontSize:8,fontWeight:700,padding:"2px 8px",borderRadius:10,background:color+"22",color}}>{children}</span>;
const inp = { border:`1px solid ${T.border}`, borderRadius:3, padding:"4px 8px", fontSize:11, fontFamily:"'DM Sans',sans-serif", background:"#fff" };
const ths = {padding:"5px 8px",fontSize:8,fontWeight:700,color:"#888",textTransform:"uppercase",borderBottom:`2px solid ${T.border}`,textAlign:"left"};
const tds = {padding:"5px 8px",fontSize:10,borderBottom:`1px solid ${T.border}`};

const STORE_KEY = "habitaris_compras";
const TABS = [
  { id:"dashboard",lbl:"📊 Dashboard" },
  { id:"oc",    lbl:"📦 Órdenes de Compra" },
  { id:"recep", lbl:"📥 Recepción" },
  { id:"eval",  lbl:"⭐ Evaluación Proveedores" },
];

/* ═══════════════════════════════════════════════════════════════
   TAB 1: ÓRDENES DE COMPRA
   ═══════════════════════════════════════════════════════════════ */
function TabOC({ ocs, setOCs }) {
  const [showNew, setShowNew] = useState(false);
  const [selId, setSelId] = useState(null);
  const [search, setSearch] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [form, setForm] = useState({ proveedor:"",proyecto:"",solicitante:"",fechaEntrega:"",condicionPago:"Contado",observaciones:"",items:[{id:uid(),desc:"",und:"",cant:0,valorUnit:0}] });

  const ESTADOS = { borrador:{lbl:"Borrador",c:T.inkLight}, pendiente:{lbl:"Pendiente",c:T.amber}, aprobada:{lbl:"Aprobada",c:T.blue}, enviada:{lbl:"Enviada prov.",c:"#5B3A8C"}, parcial:{lbl:"Recibida parcial",c:T.amber}, completa:{lbl:"Completa",c:T.green}, cancelada:{lbl:"Cancelada",c:T.red} };
  const COND_PAGO = ["Contado","Crédito 30 días","Crédito 60 días","Anticipo 50%","Contra entrega"];

  const crear = () => {
    const items = form.items.filter(i=>i.desc.trim()).map(i=>({...i,cant:parseFloat(i.cant)||0,valorUnit:parseFloat(i.valorUnit)||0}));
    if (!form.proveedor || items.length===0) return;
    const total = items.reduce((s,i)=>s+i.cant*i.valorUnit,0);
    const num = `OC-${String(ocs.length+1).padStart(4,"0")}`;
    const oc = { id:uid(), num, ...form, items, total, estado:"borrador", fecha:today(), historial:[{fecha:today(),accion:"Creada",usuario:"Admin"}] };
    setOCs([...ocs, oc]);
    setSelId(oc.id);
    setForm({ proveedor:"",proyecto:"",solicitante:"",fechaEntrega:"",condicionPago:"Contado",observaciones:"",items:[{id:uid(),desc:"",und:"",cant:0,valorUnit:0}] });
    setShowNew(false);
  };
  const updOC = (id,k,v) => setOCs(ocs.map(o=>o.id===id?{...o,[k]:v}:o));
  const cambiarEstado = (id, nuevoEstado) => {
    setOCs(ocs.map(o=>{
      if(o.id!==id) return o;
      return {...o, estado:nuevoEstado, historial:[...(o.historial||[]),{fecha:today(),accion:`Estado → ${ESTADOS[nuevoEstado]?.lbl}`,usuario:"Admin"}]};
    }));
  };
  const del = (id) => { setOCs(ocs.filter(o=>o.id!==id)); if(selId===id) setSelId(null); };
  const addItem = () => setForm({...form, items:[...form.items, {id:uid(),desc:"",und:"",cant:0,valorUnit:0}]});
  const updItem = (idx,k,v) => setForm({...form, items:form.items.map((it,i)=>i===idx?{...it,[k]:v}:it)});
  const delItem = (idx) => setForm({...form, items:form.items.filter((_,i)=>i!==idx)});

  const filtered = ocs.filter(o => {
    if (filtro!=="todos" && o.estado!==filtro) return false;
    const q = search.toLowerCase();
    return !q || o.num?.toLowerCase().includes(q) || o.proveedor?.toLowerCase().includes(q) || o.proyecto?.toLowerCase().includes(q);
  });
  const sel = ocs.find(o=>o.id===selId);
  const totalPend = ocs.filter(o=>o.estado==="pendiente").reduce((s,o)=>s+o.total,0);

  return (
    <div className="fade-up">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
        <div>
          <h2 style={{margin:0,fontSize:18,fontWeight:700}}>Órdenes de Compra — {ocs.length} OCs</h2>
          <p style={{margin:0,fontSize:10,color:T.inkMid}}>{ocs.filter(o=>o.estado==="pendiente").length} pendientes · ${fmt(totalPend)} por aprobar</p>
        </div>
        <div style={{display:"flex",gap:6}}>
          <div style={{position:"relative"}}>
            <Search size={12} style={{position:"absolute",left:8,top:8,color:T.inkLight}}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar OC, proveedor..."
              style={{...inp,paddingLeft:26,width:200}}/>
          </div>
          <Btn on={()=>setShowNew(true)}><Plus size={11}/> Nueva OC</Btn>
        </div>
      </div>

      {/* Filtros */}
      <div style={{display:"flex",gap:0,marginBottom:14,flexWrap:"wrap"}}>
        {[["todos","Todos"],...Object.entries(ESTADOS).map(([k,v])=>[k,v.lbl])].map(([k,lbl],i,arr) => (
          <button key={k} onClick={()=>setFiltro(k)}
            style={{padding:"5px 12px",fontSize:9,fontWeight:600,cursor:"pointer",border:`1px solid ${T.border}`,borderLeft:i>0?"none":undefined,
              fontFamily:"'DM Sans',sans-serif",borderRadius:i===0?"5px 0 0 5px":i===arr.length-1?"0 5px 5px 0":"0",
              background:filtro===k?"#111":"#fff",color:filtro===k?"#fff":T.inkMid}}>
            {lbl} <span style={{fontSize:7,marginLeft:2}}>({ocs.filter(o=>k==="todos"||o.estado===k).length})</span>
          </button>
        ))}
      </div>

      <div style={{display:"flex",gap:14}}>
        {/* Table */}
        <Card style={{flex:1,padding:0,overflow:"hidden"}}>
          <table style={{borderCollapse:"collapse",width:"100%"}}>
            <thead>
              <tr style={{background:"#EDEBE7"}}>
                {["Nro.","Fecha","Proveedor","Proyecto","Ítems","Total","Entrega","Estado"].map(h=>
                  <th key={h} style={{...ths,textAlign:h==="Total"?"right":"left"}}>{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.length===0 ? (
                <tr><td colSpan={8} style={{padding:24,textAlign:"center",color:T.inkLight,fontSize:11}}>Sin órdenes</td></tr>
              ) : filtered.sort((a,b)=>b.fecha.localeCompare(a.fecha)).map((o,i) => {
                const est = ESTADOS[o.estado]||ESTADOS.borrador;
                return (
                  <tr key={o.id} onClick={()=>setSelId(o.id===selId?null:o.id)}
                    style={{cursor:"pointer",background:selId===o.id?"#F0F0F022":i%2?"#FFFFFF":"#fff"}}>
                    <td style={{...tds,fontFamily:"'DM Mono',monospace",fontWeight:700,color:T.blue}}>{o.num}</td>
                    <td style={{...tds,fontFamily:"'DM Mono',monospace",fontSize:9}}>{o.fecha}</td>
                    <td style={{...tds,fontWeight:600}}>{o.proveedor}</td>
                    <td style={{...tds,fontSize:9,color:T.inkMid}}>{o.proyecto||"—"}</td>
                    <td style={{...tds,fontSize:9}}>{o.items?.length||0}</td>
                    <td style={{...tds,textAlign:"right",fontFamily:"'DM Mono',monospace",fontWeight:700}}>${fmt(o.total)}</td>
                    <td style={{...tds,fontFamily:"'DM Mono',monospace",fontSize:9}}>{o.fechaEntrega||"—"}</td>
                    <td style={tds}><Badge color={est.c}>{est.lbl}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>

        {/* Detail panel */}
        {sel && (
          <Card style={{width:360,flexShrink:0,padding:0,overflow:"hidden",alignSelf:"flex-start"}}>
            <div style={{padding:"12px 14px",background:"#EDEBE7"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{fontSize:14,fontWeight:700}}>{sel.num}</div>
                <button onClick={()=>del(sel.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#C44"}}><Trash2 size={12}/></button>
              </div>
              <div style={{fontSize:9,color:T.inkMid,marginTop:2}}>{sel.proveedor} · {sel.proyecto||"Sin proyecto"} · {sel.fecha}</div>
            </div>
            {/* Estado */}
            <div style={{padding:"8px 14px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",gap:8}}>
              <label style={{fontSize:9,fontWeight:600,color:T.inkMid}}>Estado:</label>
              <select value={sel.estado} onChange={e=>cambiarEstado(sel.id,e.target.value)}
                style={{fontSize:9,fontWeight:700,padding:"3px 8px",borderRadius:10,border:"none",cursor:"pointer",
                  background:(ESTADOS[sel.estado]?.c||T.inkLight)+"22",color:ESTADOS[sel.estado]?.c||T.inkLight}}>
                {Object.entries(ESTADOS).map(([k,v])=><option key={k} value={k}>{v.lbl}</option>)}
              </select>
            </div>
            {/* Info */}
            <div style={{padding:"8px 14px",borderBottom:`1px solid ${T.border}`,fontSize:9}}>
              <div><strong>Solicitante:</strong> {sel.solicitante||"—"}</div>
              <div><strong>Condición pago:</strong> {sel.condicionPago}</div>
              <div><strong>Entrega esperada:</strong> {sel.fechaEntrega||"—"}</div>
              {sel.observaciones && <div style={{marginTop:4,color:T.inkMid}}>{sel.observaciones}</div>}
            </div>
            {/* Items */}
            <div style={{padding:"6px 0"}}>
              <div style={{padding:"0 14px",fontSize:8,fontWeight:700,color:"#888",textTransform:"uppercase",marginBottom:4}}>Ítems</div>
              {(sel.items||[]).map((it,i) => (
                <div key={it.id||i} style={{padding:"4px 14px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",fontSize:9}}>
                  <div><strong>{it.cant} {it.und}</strong> — {it.desc}</div>
                  <div style={{fontFamily:"'DM Mono',monospace",fontWeight:700}}>${fmt(it.cant*it.valorUnit)}</div>
                </div>
              ))}
              <div style={{padding:"6px 14px",display:"flex",justifyContent:"space-between",fontWeight:800,fontSize:11,borderTop:`2px solid ${T.ink}`}}>
                <span>TOTAL</span>
                <span style={{fontFamily:"'DM Mono',monospace"}}>${fmt(sel.total)}</span>
              </div>
            </div>
            {/* Historial */}
            {(sel.historial||[]).length > 0 && (
              <div style={{padding:"8px 14px",borderTop:`1px solid ${T.border}`}}>
                <div style={{fontSize:8,fontWeight:700,color:"#888",textTransform:"uppercase",marginBottom:4}}>Historial</div>
                {sel.historial.map((h,i)=>(
                  <div key={i} style={{fontSize:8,color:T.inkMid,marginBottom:2}}>{h.fecha} · {h.accion}</div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Modal nueva OC */}
      {showNew && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setShowNew(false)}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:8,padding:24,width:600,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 12px 40px rgba(0,0,0,0.2)"}}>
            <h3 style={{margin:0,fontSize:14,fontWeight:700,marginBottom:14}}>Nueva Orden de Compra</h3>
            <div style={{display:"flex",gap:8}}>
              <FI lbl="Proveedor" val={form.proveedor} on={e=>setForm({...form,proveedor:e.target.value})} ph="Nombre proveedor" style={{flex:1}}/>
              <FI lbl="Proyecto" val={form.proyecto} on={e=>setForm({...form,proyecto:e.target.value})} ph="Obra / proyecto" style={{flex:1}}/>
            </div>
            <div style={{display:"flex",gap:8}}>
              <FI lbl="Solicitante" val={form.solicitante} on={e=>setForm({...form,solicitante:e.target.value})} ph="Quien solicita" style={{flex:1}}/>
              <FI lbl="Fecha entrega" val={form.fechaEntrega} on={e=>setForm({...form,fechaEntrega:e.target.value})} type="date" style={{flex:1}}/>
              <FI lbl="Condición pago" style={{flex:1}}>
                <select value={form.condicionPago} onChange={e=>setForm({...form,condicionPago:e.target.value})} style={{...inp,width:"100%"}}>
                  {COND_PAGO.map(c=><option key={c}>{c}</option>)}
                </select>
              </FI>
            </div>

            {/* Items */}
            <div style={{marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <label style={{fontSize:8,fontWeight:700,color:"#888",textTransform:"uppercase"}}>Ítems</label>
                <button onClick={addItem} style={{fontSize:9,color:T.blue,background:"none",border:"none",cursor:"pointer",fontWeight:600,fontFamily:"'DM Sans',sans-serif"}}>+ Añadir línea</button>
              </div>
              <table style={{borderCollapse:"collapse",width:"100%"}}>
                <thead>
                  <tr>
                    {["Descripción","Und","Cant","Valor unit.","Subtotal",""].map(h=>
                      <th key={h} style={{padding:"3px 4px",fontSize:7,fontWeight:700,color:"#888",textAlign:["Cant","Valor unit.","Subtotal"].includes(h)?"right":"left",borderBottom:`1px solid ${T.border}`}}>{h}</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {form.items.map((it,i) => (
                    <tr key={it.id}>
                      <td style={{padding:"2px 2px"}}><input value={it.desc} onChange={e=>updItem(i,"desc",e.target.value)} placeholder="Material o servicio" style={{...inp,width:"100%",fontSize:10}}/></td>
                      <td style={{padding:"2px 2px",width:50}}><input value={it.und} onChange={e=>updItem(i,"und",e.target.value)} placeholder="m³" style={{...inp,width:"100%",fontSize:10,textAlign:"center"}}/></td>
                      <td style={{padding:"2px 2px",width:65}}><input type="number" value={it.cant} onChange={e=>updItem(i,"cant",e.target.value)} style={{...inp,width:"100%",fontSize:10,textAlign:"right"}}/></td>
                      <td style={{padding:"2px 2px",width:90}}><input type="number" value={it.valorUnit} onChange={e=>updItem(i,"valorUnit",e.target.value)} style={{...inp,width:"100%",fontSize:10,textAlign:"right"}}/></td>
                      <td style={{padding:"2px 6px",textAlign:"right",fontFamily:"'DM Mono',monospace",fontWeight:700,fontSize:10,width:90}}>${fmt((parseFloat(it.cant)||0)*(parseFloat(it.valorUnit)||0))}</td>
                      <td style={{padding:"2px",width:20}}>{form.items.length>1&&<button onClick={()=>delItem(i)} style={{background:"none",border:"none",cursor:"pointer",color:"#C44"}}><Trash2 size={9}/></button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{textAlign:"right",fontFamily:"'DM Mono',monospace",fontWeight:800,fontSize:12,marginTop:6}}>
                Total: ${fmt(form.items.reduce((s,i)=>s+(parseFloat(i.cant)||0)*(parseFloat(i.valorUnit)||0),0))}
              </div>
            </div>

            <FI lbl="Observaciones" val={form.observaciones} on={e=>setForm({...form,observaciones:e.target.value})} ph="Notas adicionales"/>
            <div style={{display:"flex",gap:8,marginTop:10}}>
              <Btn on={crear} style={{flex:1}}><Check size={11}/> Crear OC</Btn>
              <Btn v="sec" on={()=>setShowNew(false)} style={{flex:1}}>Cancelar</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TAB 2: RECEPCIÓN DE MERCANCÍA
   ═══════════════════════════════════════════════════════════════ */
function TabRecepcion({ ocs, setOCs, recepciones, setRecepciones }) {
  const [showNew, setShowNew] = useState(false);
  const [selOcId, setSelOcId] = useState("");
  const [form, setForm] = useState({ ocId:"", fecha:today(), recibidoPor:"", observaciones:"", items:[] });

  const ocsActivas = ocs.filter(o=>["aprobada","enviada","parcial"].includes(o.estado));

  const initFromOC = (ocId) => {
    const oc = ocs.find(o=>o.id===ocId);
    if (!oc) return;
    // Calculate already received per item
    const recibido = {};
    recepciones.filter(r=>r.ocId===ocId).forEach(r => {
      (r.items||[]).forEach(it => { recibido[it.itemId] = (recibido[it.itemId]||0) + (it.cantRecibida||0); });
    });
    const items = (oc.items||[]).map(it => ({
      itemId:it.id, desc:it.desc, und:it.und, cantOC:it.cant, cantYaRecibida:recibido[it.id]||0, cantRecibida:0, conforme:true, observacion:""
    }));
    setForm({ ocId, fecha:today(), recibidoPor:"", observaciones:"", items });
    setSelOcId(ocId);
  };

  const guardar = () => {
    if (!form.ocId || form.items.every(i=>(parseFloat(i.cantRecibida)||0)===0)) return;
    const r = { id:uid(), ...form, items:form.items.map(i=>({...i,cantRecibida:parseFloat(i.cantRecibida)||0})) };
    setRecepciones([...recepciones, r]);
    // Update OC status
    const oc = ocs.find(o=>o.id===form.ocId);
    if (oc) {
      const totalRecibido = {};
      [...recepciones.filter(x=>x.ocId===form.ocId), r].forEach(rx => {
        (rx.items||[]).forEach(it => { totalRecibido[it.itemId] = (totalRecibido[it.itemId]||0) + it.cantRecibida; });
      });
      const completo = (oc.items||[]).every(it => (totalRecibido[it.id]||0) >= it.cant);
      setOCs(ocs.map(o => o.id===form.ocId ? {...o, estado:completo?"completa":"parcial",
        historial:[...(o.historial||[]),{fecha:today(),accion:completo?"Recepción completa":"Recepción parcial",usuario:form.recibidoPor||"Admin"}]} : o));
    }
    setForm({ ocId:"", fecha:today(), recibidoPor:"", observaciones:"", items:[] });
    setShowNew(false);
  };
  const del = (id) => setRecepciones(recepciones.filter(r=>r.id!==id));

  return (
    <div className="fade-up">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div>
          <h2 style={{margin:0,fontSize:18,fontWeight:700}}>Recepción de mercancía</h2>
          <p style={{margin:0,fontSize:10,color:T.inkMid}}>{recepciones.length} recepciones · {ocsActivas.length} OCs pendientes</p>
        </div>
        <Btn on={()=>setShowNew(true)}><Plus size={11}/> Nueva recepción</Btn>
      </div>

      {/* Recepciones list */}
      <Card style={{padding:0,overflow:"hidden"}}>
        <table style={{borderCollapse:"collapse",width:"100%"}}>
          <thead>
            <tr style={{background:"#EDEBE7"}}>
              {["Fecha","OC","Proveedor","Recibido por","Ítems","Conformes","Observaciones"].map(h=>
                <th key={h} style={ths}>{h}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {recepciones.length===0 ? (
              <tr><td colSpan={7} style={{padding:24,textAlign:"center",color:T.inkLight,fontSize:11}}>Sin recepciones</td></tr>
            ) : recepciones.sort((a,b)=>b.fecha.localeCompare(a.fecha)).map((r,i) => {
              const oc = ocs.find(o=>o.id===r.ocId);
              const totalItems = (r.items||[]).filter(it=>it.cantRecibida>0).length;
              const conformes = (r.items||[]).filter(it=>it.cantRecibida>0 && it.conforme).length;
              return (
                <tr key={r.id} style={{background:i%2?"#FFFFFF":"#fff"}}>
                  <td style={{...tds,fontFamily:"'DM Mono',monospace"}}>{r.fecha}</td>
                  <td style={{...tds,fontFamily:"'DM Mono',monospace",fontWeight:700,color:T.blue}}>{oc?.num||"—"}</td>
                  <td style={{...tds,fontWeight:600}}>{oc?.proveedor||"—"}</td>
                  <td style={{...tds,fontSize:9}}>{r.recibidoPor||"—"}</td>
                  <td style={{...tds,fontSize:9}}>{totalItems}</td>
                  <td style={tds}>
                    {conformes===totalItems ?
                      <Badge color={T.green}>✓ Todo conforme</Badge> :
                      <Badge color={T.red}>{conformes}/{totalItems} conformes</Badge>
                    }
                  </td>
                  <td style={{...tds,fontSize:8,color:T.inkMid,maxWidth:150,overflow:"hidden",textOverflow:"ellipsis"}}>{r.observaciones||"—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {/* Modal */}
      {showNew && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setShowNew(false)}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:8,padding:24,width:650,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 12px 40px rgba(0,0,0,0.2)"}}>
            <h3 style={{margin:0,fontSize:14,fontWeight:700,marginBottom:14}}>Recepción de mercancía</h3>
            <div style={{display:"flex",gap:8}}>
              <FI lbl="Orden de compra" style={{flex:1}}>
                <select value={form.ocId} onChange={e=>initFromOC(e.target.value)} style={{...inp,width:"100%"}}>
                  <option value="">— Seleccionar OC —</option>
                  {ocsActivas.map(o=><option key={o.id} value={o.id}>{o.num} — {o.proveedor} (${fmt(o.total)})</option>)}
                </select>
              </FI>
              <FI lbl="Fecha" val={form.fecha} on={e=>setForm({...form,fecha:e.target.value})} type="date" style={{flex:"0 0 140px"}}/>
              <FI lbl="Recibido por" val={form.recibidoPor} on={e=>setForm({...form,recibidoPor:e.target.value})} ph="Almacenista" style={{flex:1}}/>
            </div>

            {form.items.length > 0 && (
              <div style={{marginBottom:10}}>
                <div style={{fontSize:8,fontWeight:700,color:"#888",textTransform:"uppercase",marginBottom:6}}>Ítems de la OC</div>
                <table style={{borderCollapse:"collapse",width:"100%"}}>
                  <thead>
                    <tr>
                      {["Descripción","Und","Pedido","Ya recibido","Recibir ahora","¿Conforme?","Obs."].map(h=>
                        <th key={h} style={{padding:"3px 6px",fontSize:7,fontWeight:700,color:"#888",textAlign:["Pedido","Ya recibido","Recibir ahora"].includes(h)?"right":"left",borderBottom:`1px solid ${T.border}`}}>{h}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {form.items.map((it,i) => {
                      const pendiente = it.cantOC - it.cantYaRecibida;
                      return (
                        <tr key={it.itemId} style={{borderBottom:`1px solid ${T.border}`,background:i%2?"#FFFFFF":"#fff"}}>
                          <td style={{padding:"4px 6px",fontSize:10}}>{it.desc}</td>
                          <td style={{padding:"4px 6px",fontSize:9,textAlign:"center"}}>{it.und}</td>
                          <td style={{padding:"4px 6px",textAlign:"right",fontFamily:"'DM Mono',monospace",fontSize:10}}>{it.cantOC}</td>
                          <td style={{padding:"4px 6px",textAlign:"right",fontFamily:"'DM Mono',monospace",fontSize:10,color:T.inkMid}}>{it.cantYaRecibida}</td>
                          <td style={{padding:"2px 4px",width:80}}>
                            <input type="number" value={it.cantRecibida} max={pendiente}
                              onChange={e=>setForm({...form,items:form.items.map((x,j)=>j===i?{...x,cantRecibida:e.target.value}:x)})}
                              style={{...inp,width:"100%",textAlign:"right",fontSize:10,fontFamily:"'DM Mono',monospace",fontWeight:700,color:T.green}}/>
                          </td>
                          <td style={{padding:"2px 4px",textAlign:"center"}}>
                            <input type="checkbox" checked={it.conforme}
                              onChange={e=>setForm({...form,items:form.items.map((x,j)=>j===i?{...x,conforme:e.target.checked}:x)})}/>
                          </td>
                          <td style={{padding:"2px 4px",width:100}}>
                            <input value={it.observacion||""} placeholder="Nota"
                              onChange={e=>setForm({...form,items:form.items.map((x,j)=>j===i?{...x,observacion:e.target.value}:x)})}
                              style={{...inp,width:"100%",fontSize:8}}/>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <FI lbl="Observaciones generales" val={form.observaciones} on={e=>setForm({...form,observaciones:e.target.value})} ph="Notas sobre la recepción"/>
            <div style={{display:"flex",gap:8,marginTop:10}}>
              <Btn on={guardar} style={{flex:1}}><Check size={11}/> Registrar recepción</Btn>
              <Btn v="sec" on={()=>setShowNew(false)} style={{flex:1}}>Cancelar</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TAB 3: EVALUACIÓN DE PROVEEDORES
   ═══════════════════════════════════════════════════════════════ */
function TabEval({ ocs, recepciones, evaluaciones, setEvaluaciones }) {
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ proveedor:"", periodo:"", calidad:5, puntualidad:5, precio:5, comunicacion:5, documentacion:5, observaciones:"" });

  const CRITERIOS = [
    { id:"calidad", lbl:"Calidad del material/servicio", icon:"🎯" },
    { id:"puntualidad", lbl:"Puntualidad en entregas", icon:"⏰" },
    { id:"precio", lbl:"Competitividad de precios", icon:"💰" },
    { id:"comunicacion", lbl:"Comunicación y respuesta", icon:"📞" },
    { id:"documentacion", lbl:"Documentación y facturación", icon:"📋" },
  ];

  const add = () => {
    if (!form.proveedor) return;
    const promedio = (form.calidad+form.puntualidad+form.precio+form.comunicacion+form.documentacion)/5;
    setEvaluaciones([...evaluaciones, { id:uid(), ...form, promedio:Math.round(promedio*10)/10, fecha:today() }]);
    setForm({ proveedor:"", periodo:"", calidad:5, puntualidad:5, precio:5, comunicacion:5, documentacion:5, observaciones:"" });
    setShowNew(false);
  };
  const del = (id) => setEvaluaciones(evaluaciones.filter(e=>e.id!==id));

  // Unique providers from OCs
  const proveedores = [...new Set(ocs.map(o=>o.proveedor).filter(Boolean))];

  // Ranking
  const ranking = {};
  evaluaciones.forEach(e => {
    if (!ranking[e.proveedor]) ranking[e.proveedor] = { evals:[], sum:0 };
    ranking[e.proveedor].evals.push(e);
    ranking[e.proveedor].sum += e.promedio;
  });
  const rankList = Object.entries(ranking).map(([prov,r]) => ({
    prov, count:r.evals.length, promedio:Math.round(r.sum/r.evals.length*10)/10, last:r.evals.sort((a,b)=>b.fecha.localeCompare(a.fecha))[0]
  })).sort((a,b)=>b.promedio-a.promedio);

  const starColor = (n) => n>=8?T.green:n>=5?T.amber:T.red;

  const StarBar = ({val,max=10}) => (
    <div style={{display:"flex",alignItems:"center",gap:6}}>
      <div style={{width:80,height:6,background:"#E0E0E0",borderRadius:3,overflow:"hidden"}}>
        <div style={{width:`${val/max*100}%`,height:"100%",background:starColor(val),borderRadius:3}}/>
      </div>
      <span style={{fontSize:10,fontFamily:"'DM Mono',monospace",fontWeight:700,color:starColor(val)}}>{val}</span>
    </div>
  );

  return (
    <div className="fade-up">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div>
          <h2 style={{margin:0,fontSize:18,fontWeight:700}}>Evaluación de proveedores</h2>
          <p style={{margin:0,fontSize:10,color:T.inkMid}}>{evaluaciones.length} evaluaciones · {rankList.length} proveedores calificados</p>
        </div>
        <Btn on={()=>setShowNew(true)}><Plus size={11}/> Evaluar</Btn>
      </div>

      {/* Ranking */}
      {rankList.length > 0 && (
        <Card style={{padding:0,overflow:"hidden",marginBottom:16}}>
          <div style={{padding:"8px 14px",background:"#EDEBE7",fontSize:9,fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:1}}>⭐ Ranking general</div>
          <table style={{borderCollapse:"collapse",width:"100%"}}>
            <thead>
              <tr>
                {["#","Proveedor","Evaluaciones","Promedio","Tendencia"].map(h=>
                  <th key={h} style={{...ths,textAlign:h==="#"?"center":"left"}}>{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {rankList.map((r,i) => (
                <tr key={r.prov} style={{background:i%2?"#FFFFFF":"#fff"}}>
                  <td style={{...tds,textAlign:"center",fontWeight:800,fontSize:12,color:i===0?"#D4A700":i===1?"#888":i===2?"#A0522D":T.ink}}>
                    {i===0?"🥇":i===1?"🥈":i===2?"🥉":i+1}
                  </td>
                  <td style={{...tds,fontWeight:700}}>{r.prov}</td>
                  <td style={{...tds,fontSize:9}}>{r.count} eval{r.count>1?"s":""}</td>
                  <td style={tds}><StarBar val={r.promedio}/></td>
                  <td style={{...tds,fontSize:9,color:T.inkMid}}>Última: {r.last?.fecha}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* All evaluations */}
      <Card style={{padding:0,overflow:"hidden"}}>
        <div style={{padding:"8px 14px",background:"#F5F4F1",fontSize:9,fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:1}}>Historial de evaluaciones</div>
        <table style={{borderCollapse:"collapse",width:"100%"}}>
          <thead>
            <tr>
              {["Fecha","Proveedor","Período","Calidad","Puntualidad","Precio","Comun.","Doc.","Promedio",""].map(h=>
                <th key={h} style={{...ths,textAlign:["Calidad","Puntualidad","Precio","Comun.","Doc.","Promedio"].includes(h)?"center":"left"}}>{h}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {evaluaciones.length===0 ? (
              <tr><td colSpan={10} style={{padding:24,textAlign:"center",color:T.inkLight,fontSize:11}}>Sin evaluaciones</td></tr>
            ) : evaluaciones.sort((a,b)=>b.fecha.localeCompare(a.fecha)).map((e,i) => (
              <tr key={e.id} style={{background:i%2?"#FFFFFF":"#fff"}}>
                <td style={{...tds,fontFamily:"'DM Mono',monospace",fontSize:9}}>{e.fecha}</td>
                <td style={{...tds,fontWeight:600}}>{e.proveedor}</td>
                <td style={{...tds,fontSize:9}}>{e.periodo||"—"}</td>
                {["calidad","puntualidad","precio","comunicacion","documentacion"].map(c=>(
                  <td key={c} style={{...tds,textAlign:"center",fontFamily:"'DM Mono',monospace",fontWeight:700,color:starColor(e[c])}}>{e[c]}</td>
                ))}
                <td style={{...tds,textAlign:"center",fontFamily:"'DM Mono',monospace",fontWeight:800,fontSize:12,color:starColor(e.promedio)}}>
                  {e.promedio}
                </td>
                <td style={tds}><button onClick={()=>del(e.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#C44"}}><Trash2 size={10}/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Modal */}
      {showNew && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setShowNew(false)}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:8,padding:24,width:480,boxShadow:"0 12px 40px rgba(0,0,0,0.2)"}}>
            <h3 style={{margin:0,fontSize:14,fontWeight:700,marginBottom:14}}>Evaluar proveedor</h3>
            <div style={{display:"flex",gap:8}}>
              <FI lbl="Proveedor" style={{flex:1}}>
                <select value={form.proveedor} onChange={e=>setForm({...form,proveedor:e.target.value})} style={{...inp,width:"100%"}}>
                  <option value="">— Seleccionar —</option>
                  {proveedores.map(p=><option key={p}>{p}</option>)}
                  <option value="__otro">+ Otro...</option>
                </select>
                {form.proveedor==="__otro" && <input value="" onChange={e=>setForm({...form,proveedor:e.target.value})} placeholder="Nombre proveedor" style={{...inp,width:"100%",marginTop:4}}/>}
              </FI>
              <FI lbl="Período" val={form.periodo} on={e=>setForm({...form,periodo:e.target.value})} ph="Ene-Mar 2026" style={{flex:1}}/>
            </div>

            <div style={{marginBottom:12}}>
              <div style={{fontSize:9,fontWeight:700,color:"#888",textTransform:"uppercase",marginBottom:8}}>Calificación (1-10)</div>
              {CRITERIOS.map(c => (
                <div key={c.id} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                  <div style={{width:180,fontSize:10}}>{c.icon} {c.lbl}</div>
                  <input type="range" min="1" max="10" value={form[c.id]} onChange={e=>setForm({...form,[c.id]:parseInt(e.target.value)})}
                    style={{flex:1,accentColor:starColor(form[c.id])}}/>
                  <div style={{width:28,textAlign:"center",fontFamily:"'DM Mono',monospace",fontWeight:800,fontSize:14,color:starColor(form[c.id])}}>{form[c.id]}</div>
                </div>
              ))}
              <div style={{textAlign:"right",fontSize:12,fontWeight:800,fontFamily:"'DM Mono',monospace",color:starColor((form.calidad+form.puntualidad+form.precio+form.comunicacion+form.documentacion)/5),marginTop:4}}>
                Promedio: {((form.calidad+form.puntualidad+form.precio+form.comunicacion+form.documentacion)/5).toFixed(1)}
              </div>
            </div>

            <FI lbl="Observaciones" val={form.observaciones} on={e=>setForm({...form,observaciones:e.target.value})} ph="Notas sobre desempeño"/>
            <div style={{display:"flex",gap:8,marginTop:10}}>
              <Btn on={add} style={{flex:1}}><Check size={11}/> Guardar evaluación</Btn>
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
export default function Compras() {
  const [data, setData] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { return {}; }
  });
  const save = (k,v) => setData(prev => { const n = {...prev,[k]:typeof v==="function"?v(prev[k]):v}; localStorage.setItem(STORE_KEY,JSON.stringify(n)); try { window.storage?.set?.(STORE_KEY,JSON.stringify(n)); } catch {} return n; });

  const ocs = data.ocs || [];
  const setOCs = (v) => save("ocs", typeof v==="function"?v(ocs):v);
  const recepciones = data.recepciones || [];
  const setRecepciones = (v) => save("recepciones", typeof v==="function"?v(recepciones):v);
  const evaluaciones = data.evaluaciones || [];
  const setEvaluaciones = (v) => save("evaluaciones", typeof v==="function"?v(evaluaciones):v);

  const [tab, setTab] = useState("dashboard");
  const ocsPend = ocs.filter(o=>o.estado==="pendiente");
  const ocsComp = ocs.filter(o=>o.estado==="completa");
  const totalVal = ocs.filter(o=>o.estado!=="cancelada").reduce((s,o)=>s+o.total,0);
  const promEval = evaluaciones.length>0 ? evaluaciones.reduce((s,e)=>s+e.promedio,0)/evaluaciones.length : 0;

  return (
    <>
      <Fonts/>
      <div style={{padding:"30px 36px",maxWidth:1400,margin:"0 auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <div>
            <div style={{fontSize:22,fontWeight:800,letterSpacing:1}}>🛒 Compras</div>
            <div style={{fontSize:10,color:T.inkMid}}>Órdenes de compra · Recepción · Evaluación proveedores</div>
          </div>
        </div>

        <div style={{display:"flex",gap:0,marginBottom:20}}>
          {TABS.map((t,i) => (
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{padding:"10px 18px",fontSize:11,fontWeight:600,cursor:"pointer",
                border:`1px solid ${T.border}`,borderLeft:i>0?"none":undefined,
                fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap",
                borderRadius:i===0?"6px 0 0 6px":i===TABS.length-1?"0 6px 6px 0":"0",
                background:tab===t.id?"#111":"#fff",
                color:tab===t.id?"#fff":T.inkMid}}>
              {t.lbl}
            </button>
          ))}
        </div>

        {tab === "dashboard" && (
          <div className="fade-up">
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
              {[["📦 Total OCs",ocs.length,"#111"],["⏳ Pendientes",ocsPend.length,ocsPend.length>0?"#8C6A00":"#111111"],["✅ Completas",ocsComp.length,"#111111"],["💰 Valor total",`$${fmt(totalVal)}`,"#111"]].map(([l,v,c])=>(
                <div key={l} style={{background:"#fff",border:`1px solid ${T.border}`,borderRadius:8,padding:"14px 16px",boxShadow:T.shadow}}><div style={{fontSize:8,fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>{l}</div><div style={{fontSize:22,fontWeight:800,fontFamily:"'DM Mono',monospace",color:c}}>{v}</div></div>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:16}}>
              {[["📥 Recepciones",recepciones.length,"#3B3B3B"],["⭐ Evaluaciones",evaluaciones.length,"#111"],["⭐ Nota media proveedores",promEval>0?promEval.toFixed(1):"—",promEval>=8?"#111111":promEval>=5?"#8C6A00":"#B91C1C"]].map(([l,v,c])=>(
                <div key={l} style={{background:"#fff",border:`1px solid ${T.border}`,borderRadius:8,padding:"14px 16px",boxShadow:T.shadow}}><div style={{fontSize:8,fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>{l}</div><div style={{fontSize:22,fontWeight:800,fontFamily:"'DM Mono',monospace",color:c}}>{v}</div></div>
              ))}
            </div>
          </div>
        )}
        {tab === "oc"    && <TabOC ocs={ocs} setOCs={setOCs}/>}
        {tab === "recep" && <TabRecepcion ocs={ocs} setOCs={setOCs} recepciones={recepciones} setRecepciones={setRecepciones}/>}
        {tab === "eval"  && <TabEval ocs={ocs} recepciones={recepciones} evaluaciones={evaluaciones} setEvaluaciones={setEvaluaciones}/>}
      </div>
    </>
  );
}
