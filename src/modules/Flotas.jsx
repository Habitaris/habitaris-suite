import React, { useState, useEffect, useMemo } from "react";
import { store } from "../core/store.js";

import { Plus, Trash2, Check, X, Search, Truck, Fuel, FileText, Wrench, AlertTriangle, Calendar, Edit3, ChevronRight } from "lucide-react";

/* ═══════════════════════════════════════════════════════════════
   FLOTAS — Habitaris Suite
   Tabs: Vehículos · Partes KM · Combustible · Documentación · Mantenimiento
   ═══════════════════════════════════════════════════════════════ */

const Fonts = () => <style>{`@import url('https://fonts.googleapis.com/css2?family=DM Sans:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}body{font-family:'DM Sans',sans-serif;background:#F5F4F1}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#C8C5BE;border-radius:2px}input,select,textarea,button{font-family:'DM Sans',sans-serif;outline:none}button{cursor:pointer}@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}.fade-up{animation:fadeUp .22s ease both}`}</style>;
const T = { bg:"#F5F4F1",surface:"#FFFFFF",surfaceAlt:"#FFFFFF",ink:"#111",inkMid:"#555",inkLight:"#909090",inkXLight:"#C8C5BE",border:"#E0E0E0",accent:"#EDEBE7",green:"#111111",greenBg:"#E8F4EE",red:"#B91C1C",redBg:"#FAE8E8",amber:"#8C6A00",amberBg:"#FAF0E0",blue:"#3B3B3B",blueBg:"#F0F0F0",shadow:"0 1px 3px rgba(0,0,0,.06),0 4px 16px rgba(0,0,0,.05)" };
const uid = () => Math.random().toString(36).slice(2,10);
const today = () => new Date().toISOString().split("T")[0];
const fmt = (n) => new Intl.NumberFormat("es-CO",{maximumFractionDigits:0}).format(n||0);
const fmtDec = (n) => new Intl.NumberFormat("es-CO",{maximumFractionDigits:1}).format(n||0);
const Card = ({children,style,...p}) => <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:16,boxShadow:T.shadow,...style}} {...p}>{children}</div>;
const Btn = ({children,on,v,style,...p}) => <button onClick={on} style={{padding:"7px 16px",borderRadius:5,border:v==="sec"?`1px solid ${T.border}`:"none",background:v==="sec"?"#fff":v==="danger"?"#B91C1C":"#111",color:v==="sec"?T.inkMid:v==="danger"?"#fff":"#fff",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",display:"inline-flex",alignItems:"center",gap:5,...style}} {...p}>{children}</button>;
const FI = ({lbl,val,on,ph,type,style,children,...p}) => <div style={{marginBottom:8,...style}}><label style={{display:"block",fontSize:8,fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:.5,marginBottom:2}}>{lbl}</label>{children||<input type={type||"text"} value={val} onChange={on} placeholder={ph||""} style={{width:"100%",padding:"6px 8px",border:`1px solid ${T.border}`,borderRadius:4,fontSize:11,background:"#fff"}} {...p}/>}</div>;
const Badge = ({children,color}) => <span style={{fontSize:8,fontWeight:700,padding:"2px 8px",borderRadius:10,background:color+"22",color}}>{children}</span>;
const inp = { border:`1px solid ${T.border}`, borderRadius:3, padding:"4px 8px", fontSize:11, fontFamily:"'DM Sans',sans-serif", background:"#fff" };
const th = {padding:"5px 8px",fontSize:8,fontWeight:700,color:"#888",textTransform:"uppercase",borderBottom:`2px solid ${T.border}`,textAlign:"left"};
const td = {padding:"5px 8px",fontSize:10,borderBottom:`1px solid ${T.border}`};

const STORE_KEY = "habitaris_flotas";
const TABS = [
  { id:"dashboard",  lbl:"📊 Dashboard" },
  { id:"vehiculos",  lbl:"🚗 Vehículos" },
  { id:"km",         lbl:"📏 Partes KM" },
  { id:"combustible", lbl:"⛽ Combustible" },
  { id:"docs",       lbl:"📋 Documentación" },
  { id:"manto",      lbl:"🔧 Mantenimiento" },
];

const TIPOS_VEH = ["Camioneta","Camión","Volqueta","Furgón","Automóvil","Motocicleta","Maquinaria","Otro"];
const ESTADOS_VEH = { activo:{lbl:"Activo",c:T.green}, taller:{lbl:"En taller",c:T.amber}, inactivo:{lbl:"Inactivo",c:T.red} };

/* ═══════════════════════════════════════════════════════════════
   TAB 1: VEHÍCULOS
   ═══════════════════════════════════════════════════════════════ */
function TabVehiculos({ vehs, setVehs }) {
  const [showNew, setShowNew] = useState(false);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ placa:"",marca:"",modelo:"",anio:new Date().getFullYear(),tipo:"Camioneta",conductor:"",proyecto:"",kmActual:0,estado:"activo",color:"",vin:"",observaciones:"" });

  const resetForm = () => setForm({ placa:"",marca:"",modelo:"",anio:new Date().getFullYear(),tipo:"Camioneta",conductor:"",proyecto:"",kmActual:0,estado:"activo",color:"",vin:"",observaciones:"" });
  const openEdit = (v) => { setForm({...v}); setEditId(v.id); setShowNew(true); };
  const openNew = () => { resetForm(); setEditId(null); setShowNew(true); };

  const save = () => {
    if (!form.placa) return;
    if (editId) {
      setVehs(vehs.map(v=>v.id===editId?{...form,id:editId}:v));
    } else {
      setVehs([...vehs, {...form, id:uid(), fechaRegistro:today()}]);
    }
    setShowNew(false); resetForm(); setEditId(null);
  };
  const del = (id) => setVehs(vehs.filter(v=>v.id!==id));

  const filtered = vehs.filter(v => {
    const q = search.toLowerCase();
    return !q || v.placa?.toLowerCase().includes(q) || v.marca?.toLowerCase().includes(q) || v.conductor?.toLowerCase().includes(q) || v.proyecto?.toLowerCase().includes(q);
  });

  const activos = vehs.filter(v=>v.estado==="activo").length;
  const enTaller = vehs.filter(v=>v.estado==="taller").length;

  return (
    <div className="fade-up">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
        <div>
          <h2 style={{margin:0,fontSize:18,fontWeight:700}}>Flota vehicular — {vehs.length} vehículos</h2>
          <p style={{margin:0,fontSize:10,color:T.inkMid}}>{activos} activos · {enTaller} en taller</p>
        </div>
        <div style={{display:"flex",gap:6}}>
          <div style={{position:"relative"}}>
            <Search size={12} style={{position:"absolute",left:8,top:8,color:T.inkLight}}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar placa, marca, conductor..."
              style={{...inp,paddingLeft:26,width:220}}/>
          </div>
          <Btn on={openNew}><Plus size={11}/> Nuevo vehículo</Btn>
        </div>
      </div>

      <Card style={{padding:0,overflow:"hidden"}}>
        <table style={{borderCollapse:"collapse",width:"100%"}}>
          <thead>
            <tr style={{background:"#EDEBE7"}}>
              {["Placa","Tipo","Marca / Modelo","Año","Conductor","Proyecto","KM actual","Estado",""].map(h=>
                <th key={h} style={{...th,textAlign:h==="KM actual"?"right":"left"}}>{h}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.length===0 ? (
              <tr><td colSpan={9} style={{padding:24,textAlign:"center",color:T.inkLight,fontSize:11}}>Sin vehículos registrados</td></tr>
            ) : filtered.map((v,i) => {
              const est = ESTADOS_VEH[v.estado]||ESTADOS_VEH.activo;
              return (
                <tr key={v.id} style={{background:i%2?"#FFFFFF":"#fff"}}>
                  <td style={{...td,fontFamily:"'DM Mono',monospace",fontWeight:700,fontSize:12}}>{v.placa}</td>
                  <td style={{...td,fontSize:9}}>{v.tipo}</td>
                  <td style={{...td,fontWeight:600}}>{v.marca} {v.modelo}</td>
                  <td style={{...td,fontFamily:"'DM Mono',monospace"}}>{v.anio}</td>
                  <td style={{...td,fontSize:9,color:T.inkMid}}>{v.conductor||"—"}</td>
                  <td style={{...td,fontSize:9,color:T.inkMid}}>{v.proyecto||"—"}</td>
                  <td style={{...td,textAlign:"right",fontFamily:"'DM Mono',monospace",fontWeight:600}}>{fmt(v.kmActual)}</td>
                  <td style={td}><Badge color={est.c}>{est.lbl}</Badge></td>
                  <td style={{...td,whiteSpace:"nowrap"}}>
                    <button onClick={()=>openEdit(v)} style={{background:"none",border:"none",cursor:"pointer",color:T.blue,marginRight:4}}><Edit3 size={11}/></button>
                    <button onClick={()=>del(v.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#C44"}}><Trash2 size={10}/></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {/* Modal */}
      {showNew && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>{setShowNew(false);setEditId(null);}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:8,padding:24,width:500,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 12px 40px rgba(0,0,0,0.2)"}}>
            <h3 style={{margin:0,fontSize:14,fontWeight:700,marginBottom:14}}>{editId?"Editar vehículo":"Nuevo vehículo"}</h3>
            <div style={{display:"flex",gap:8}}>
              <FI lbl="Placa" val={form.placa} on={e=>setForm({...form,placa:e.target.value.toUpperCase()})} ph="ABC-123" style={{flex:"0 0 120px"}}/>
              <FI lbl="Tipo" style={{flex:1}}>
                <select value={form.tipo} onChange={e=>setForm({...form,tipo:e.target.value})} style={{...inp,width:"100%"}}>
                  {TIPOS_VEH.map(t=><option key={t}>{t}</option>)}
                </select>
              </FI>
              <FI lbl="Estado" style={{flex:1}}>
                <select value={form.estado} onChange={e=>setForm({...form,estado:e.target.value})} style={{...inp,width:"100%"}}>
                  {Object.entries(ESTADOS_VEH).map(([k,v])=><option key={k} value={k}>{v.lbl}</option>)}
                </select>
              </FI>
            </div>
            <div style={{display:"flex",gap:8}}>
              <FI lbl="Marca" val={form.marca} on={e=>setForm({...form,marca:e.target.value})} ph="Toyota" style={{flex:1}}/>
              <FI lbl="Modelo" val={form.modelo} on={e=>setForm({...form,modelo:e.target.value})} ph="Hilux" style={{flex:1}}/>
              <FI lbl="Año" val={form.anio} on={e=>setForm({...form,anio:e.target.value})} type="number" style={{flex:"0 0 80px"}}/>
            </div>
            <div style={{display:"flex",gap:8}}>
              <FI lbl="Color" val={form.color} on={e=>setForm({...form,color:e.target.value})} ph="Blanco" style={{flex:1}}/>
              <FI lbl="VIN / Chasis" val={form.vin} on={e=>setForm({...form,vin:e.target.value})} ph="Opcional" style={{flex:1}}/>
            </div>
            <div style={{display:"flex",gap:8}}>
              <FI lbl="Conductor asignado" val={form.conductor} on={e=>setForm({...form,conductor:e.target.value})} ph="Nombre" style={{flex:1}}/>
              <FI lbl="Proyecto" val={form.proyecto} on={e=>setForm({...form,proyecto:e.target.value})} ph="Obra asignada" style={{flex:1}}/>
            </div>
            <FI lbl="KM actual" val={form.kmActual} on={e=>setForm({...form,kmActual:e.target.value})} type="number"/>
            <FI lbl="Observaciones" val={form.observaciones} on={e=>setForm({...form,observaciones:e.target.value})} ph="Notas"/>
            <div style={{display:"flex",gap:8,marginTop:10}}>
              <Btn on={save} style={{flex:1}}><Check size={11}/> {editId?"Guardar":"Crear"}</Btn>
              <Btn v="sec" on={()=>{setShowNew(false);setEditId(null);}} style={{flex:1}}>Cancelar</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TAB 2: PARTES KM MENSUALES
   ═══════════════════════════════════════════════════════════════ */
function TabKM({ vehs, setVehs, partes, setPartes }) {
  const [showNew, setShowNew] = useState(false);
  const [mesVista, setMesVista] = useState(() => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; });
  const [form, setForm] = useState({ vehId:"", fecha:today(), kmInicio:0, kmFin:0, conductor:"", proyecto:"", ruta:"", observaciones:"" });

  const add = () => {
    const veh = vehs.find(v=>v.id===form.vehId);
    if (!veh) return;
    const p = { id:uid(), ...form, kmInicio:parseFloat(form.kmInicio)||0, kmFin:parseFloat(form.kmFin)||0, placa:veh.placa };
    setPartes([...partes, p]);
    // Update vehicle km
    if (p.kmFin > (parseFloat(veh.kmActual)||0)) {
      setVehs(vehs.map(v=>v.id===form.vehId?{...v,kmActual:p.kmFin}:v));
    }
    setForm({ vehId:"", fecha:today(), kmInicio:0, kmFin:0, conductor:"", proyecto:"", ruta:"", observaciones:"" });
    setShowNew(false);
  };
  const del = (id) => setPartes(partes.filter(p=>p.id!==id));

  const partesMes = partes.filter(p=>p.fecha?.startsWith(mesVista)).sort((a,b)=>a.fecha.localeCompare(b.fecha));
  const totalKm = partesMes.reduce((s,p)=>s+Math.max(0,(p.kmFin||0)-(p.kmInicio||0)),0);
  const meses = [...new Set(partes.map(p=>p.fecha?.slice(0,7)).filter(Boolean))];
  if (!meses.includes(mesVista)) meses.push(mesVista);
  meses.sort();

  return (
    <div className="fade-up">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
        <div>
          <h2 style={{margin:0,fontSize:18,fontWeight:700}}>Partes de kilómetros</h2>
          <p style={{margin:0,fontSize:10,color:T.inkMid}}>{mesVista} · {partesMes.length} registros · {fmt(totalKm)} km total</p>
        </div>
        <div style={{display:"flex",gap:6}}>
          <select value={mesVista} onChange={e=>setMesVista(e.target.value)} style={{...inp,fontWeight:600}}>
            {meses.map(m=><option key={m} value={m}>{m}</option>)}
          </select>
          <Btn on={()=>setShowNew(true)}><Plus size={11}/> Registro</Btn>
        </div>
      </div>

      <Card style={{padding:0,overflow:"hidden"}}>
        <table style={{borderCollapse:"collapse",width:"100%"}}>
          <thead>
            <tr style={{background:"#EDEBE7"}}>
              {["Fecha","Placa","Conductor","Proyecto","Ruta","KM inicio","KM fin","Recorrido",""].map(h=>
                <th key={h} style={{...th,textAlign:["KM inicio","KM fin","Recorrido"].includes(h)?"right":"left"}}>{h}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {partesMes.length===0 ? (
              <tr><td colSpan={9} style={{padding:24,textAlign:"center",color:T.inkLight,fontSize:11}}>Sin registros en {mesVista}</td></tr>
            ) : partesMes.map((p,i) => {
              const rec = Math.max(0,(p.kmFin||0)-(p.kmInicio||0));
              return (
                <tr key={p.id} style={{background:i%2?"#FFFFFF":"#fff"}}>
                  <td style={{...td,fontFamily:"'DM Mono',monospace"}}>{p.fecha}</td>
                  <td style={{...td,fontFamily:"'DM Mono',monospace",fontWeight:700}}>{p.placa}</td>
                  <td style={{...td,fontSize:9}}>{p.conductor||"—"}</td>
                  <td style={{...td,fontSize:9,color:T.inkMid}}>{p.proyecto||"—"}</td>
                  <td style={{...td,fontSize:9}}>{p.ruta||"—"}</td>
                  <td style={{...td,textAlign:"right",fontFamily:"'DM Mono',monospace"}}>{fmt(p.kmInicio)}</td>
                  <td style={{...td,textAlign:"right",fontFamily:"'DM Mono',monospace"}}>{fmt(p.kmFin)}</td>
                  <td style={{...td,textAlign:"right",fontFamily:"'DM Mono',monospace",fontWeight:700,color:T.green}}>{fmt(rec)} km</td>
                  <td style={td}><button onClick={()=>del(p.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#C44"}}><Trash2 size={10}/></button></td>
                </tr>
              );
            })}
            {partesMes.length > 0 && (
              <tr style={{background:"#EDEBE7"}}>
                <td colSpan={7} style={{...td,fontWeight:800,borderTop:`2px solid ${T.ink}`}}>TOTAL MES</td>
                <td style={{...td,textAlign:"right",fontFamily:"'DM Mono',monospace",fontWeight:800,color:T.green,fontSize:12,borderTop:`2px solid ${T.ink}`}}>{fmt(totalKm)} km</td>
                <td style={{...td,borderTop:`2px solid ${T.ink}`}}/>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {showNew && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setShowNew(false)}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:8,padding:24,width:460,boxShadow:"0 12px 40px rgba(0,0,0,0.2)"}}>
            <h3 style={{margin:0,fontSize:14,fontWeight:700,marginBottom:14}}>Nuevo registro KM</h3>
            <div style={{display:"flex",gap:8}}>
              <FI lbl="Vehículo" style={{flex:1}}>
                <select value={form.vehId} onChange={e=>{
                  const v=vehs.find(x=>x.id===e.target.value);
                  setForm({...form, vehId:e.target.value, kmInicio:v?.kmActual||0, conductor:v?.conductor||form.conductor});
                }} style={{...inp,width:"100%"}}>
                  <option value="">— Seleccionar —</option>
                  {vehs.filter(v=>v.estado==="activo").map(v=><option key={v.id} value={v.id}>{v.placa} — {v.marca} {v.modelo}</option>)}
                </select>
              </FI>
              <FI lbl="Fecha" val={form.fecha} on={e=>setForm({...form,fecha:e.target.value})} type="date" style={{flex:"0 0 140px"}}/>
            </div>
            <div style={{display:"flex",gap:8}}>
              <FI lbl="KM inicio" val={form.kmInicio} on={e=>setForm({...form,kmInicio:e.target.value})} type="number" style={{flex:1}}/>
              <FI lbl="KM fin" val={form.kmFin} on={e=>setForm({...form,kmFin:e.target.value})} type="number" style={{flex:1}}/>
              <div style={{flex:1,marginBottom:8}}>
                <label style={{display:"block",fontSize:8,fontWeight:700,color:"#888",textTransform:"uppercase",marginBottom:2}}>Recorrido</label>
                <div style={{padding:"6px 8px",fontSize:14,fontWeight:800,fontFamily:"'DM Mono',monospace",color:T.green}}>
                  {fmt(Math.max(0,(parseFloat(form.kmFin)||0)-(parseFloat(form.kmInicio)||0)))} km
                </div>
              </div>
            </div>
            <div style={{display:"flex",gap:8}}>
              <FI lbl="Conductor" val={form.conductor} on={e=>setForm({...form,conductor:e.target.value})} ph="Nombre" style={{flex:1}}/>
              <FI lbl="Proyecto" val={form.proyecto} on={e=>setForm({...form,proyecto:e.target.value})} ph="Obra" style={{flex:1}}/>
            </div>
            <FI lbl="Ruta / destino" val={form.ruta} on={e=>setForm({...form,ruta:e.target.value})} ph="Bogotá → Obra Chicó → Bogotá"/>
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
   TAB 3: COMBUSTIBLE
   ═══════════════════════════════════════════════════════════════ */
function TabCombustible({ vehs, tanqueos, setTanqueos }) {
  const [showNew, setShowNew] = useState(false);
  const [mesVista, setMesVista] = useState(() => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; });
  const [form, setForm] = useState({ vehId:"", fecha:today(), litros:0, valorTotal:0, km:0, estacion:"", tipoCombus:"Diesel", factura:"" });

  const TIPOS_COMB = ["Diesel","Gasolina corriente","Gasolina extra","Gas natural","Eléctrico"];

  const add = () => {
    const veh = vehs.find(v=>v.id===form.vehId);
    if (!veh) return;
    setTanqueos([...tanqueos, { id:uid(), ...form, litros:parseFloat(form.litros)||0, valorTotal:parseFloat(form.valorTotal)||0, km:parseFloat(form.km)||0, placa:veh.placa }]);
    setForm({ vehId:"", fecha:today(), litros:0, valorTotal:0, km:0, estacion:"", tipoCombus:"Diesel", factura:"" });
    setShowNew(false);
  };
  const del = (id) => setTanqueos(tanqueos.filter(t=>t.id!==id));

  const tMes = tanqueos.filter(t=>t.fecha?.startsWith(mesVista));
  const totalLitros = tMes.reduce((s,t)=>s+t.litros,0);
  const totalGasto = tMes.reduce((s,t)=>s+t.valorTotal,0);
  const precioPromLitro = totalLitros>0 ? totalGasto/totalLitros : 0;

  const meses = [...new Set(tanqueos.map(t=>t.fecha?.slice(0,7)).filter(Boolean))];
  if (!meses.includes(mesVista)) meses.push(mesVista);
  meses.sort();

  // Per-vehicle summary
  const resumen = {};
  tMes.forEach(t => {
    if (!resumen[t.placa]) resumen[t.placa] = { litros:0, gasto:0, tanqueos:0 };
    resumen[t.placa].litros += t.litros;
    resumen[t.placa].gasto += t.valorTotal;
    resumen[t.placa].tanqueos++;
  });

  return (
    <div className="fade-up">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
        <div>
          <h2 style={{margin:0,fontSize:18,fontWeight:700}}>Consumo de combustible</h2>
          <p style={{margin:0,fontSize:10,color:T.inkMid}}>{mesVista} · {tMes.length} tanqueos</p>
        </div>
        <div style={{display:"flex",gap:6}}>
          <select value={mesVista} onChange={e=>setMesVista(e.target.value)} style={{...inp,fontWeight:600}}>
            {meses.map(m=><option key={m} value={m}>{m}</option>)}
          </select>
          <Btn on={()=>setShowNew(true)}><Plus size={11}/> Tanqueo</Btn>
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
        {[
          ["⛽ Litros total",fmtDec(totalLitros)+" L",T.blue],
          ["💰 Gasto total","$"+fmt(totalGasto),T.red],
          ["📊 $/Litro prom.","$"+fmt(precioPromLitro),T.ink],
          ["🚗 Vehículos",Object.keys(resumen).length+"",T.ink],
        ].map(([l,v,c])=>(
          <Card key={l} style={{padding:"10px 14px",textAlign:"center"}}>
            <div style={{fontSize:8,fontWeight:700,color:"#888",textTransform:"uppercase"}}>{l}</div>
            <div style={{fontSize:16,fontWeight:800,fontFamily:"'DM Mono',monospace",color:c,marginTop:2}}>{v}</div>
          </Card>
        ))}
      </div>

      {/* Per-vehicle summary */}
      {Object.keys(resumen).length > 0 && (
        <Card style={{padding:0,overflow:"hidden",marginBottom:14}}>
          <div style={{padding:"8px 12px",background:"#EDEBE7",fontSize:9,fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:1}}>Resumen por vehículo</div>
          <table style={{borderCollapse:"collapse",width:"100%"}}>
            <thead><tr><th style={th}>Placa</th><th style={{...th,textAlign:"right"}}>Tanqueos</th><th style={{...th,textAlign:"right"}}>Litros</th><th style={{...th,textAlign:"right"}}>Gasto</th><th style={{...th,textAlign:"right"}}>$/Litro</th></tr></thead>
            <tbody>
              {Object.entries(resumen).sort((a,b)=>b[1].gasto-a[1].gasto).map(([placa,r],i) => (
                <tr key={placa} style={{background:i%2?"#FFFFFF":"#fff"}}>
                  <td style={{...td,fontFamily:"'DM Mono',monospace",fontWeight:700}}>{placa}</td>
                  <td style={{...td,textAlign:"right"}}>{r.tanqueos}</td>
                  <td style={{...td,textAlign:"right",fontFamily:"'DM Mono',monospace"}}>{fmtDec(r.litros)} L</td>
                  <td style={{...td,textAlign:"right",fontFamily:"'DM Mono',monospace",fontWeight:600,color:T.red}}>${fmt(r.gasto)}</td>
                  <td style={{...td,textAlign:"right",fontFamily:"'DM Mono',monospace"}}>${fmt(r.litros>0?r.gasto/r.litros:0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Detail table */}
      <Card style={{padding:0,overflow:"hidden"}}>
        <table style={{borderCollapse:"collapse",width:"100%"}}>
          <thead>
            <tr style={{background:"#F5F4F1"}}>
              {["Fecha","Placa","Tipo","Estación","Litros","Valor","KM","Factura",""].map(h=>
                <th key={h} style={{...th,textAlign:["Litros","Valor","KM"].includes(h)?"right":"left"}}>{h}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {tMes.length===0 ? (
              <tr><td colSpan={9} style={{padding:24,textAlign:"center",color:T.inkLight,fontSize:11}}>Sin tanqueos en {mesVista}</td></tr>
            ) : tMes.sort((a,b)=>a.fecha.localeCompare(b.fecha)).map((t,i) => (
              <tr key={t.id} style={{background:i%2?"#FFFFFF":"#fff"}}>
                <td style={{...td,fontFamily:"'DM Mono',monospace"}}>{t.fecha}</td>
                <td style={{...td,fontFamily:"'DM Mono',monospace",fontWeight:700}}>{t.placa}</td>
                <td style={{...td,fontSize:9}}>{t.tipoCombus}</td>
                <td style={{...td,fontSize:9}}>{t.estacion||"—"}</td>
                <td style={{...td,textAlign:"right",fontFamily:"'DM Mono',monospace"}}>{fmtDec(t.litros)} L</td>
                <td style={{...td,textAlign:"right",fontFamily:"'DM Mono',monospace",fontWeight:600}}>${fmt(t.valorTotal)}</td>
                <td style={{...td,textAlign:"right",fontFamily:"'DM Mono',monospace"}}>{fmt(t.km)}</td>
                <td style={{...td,fontSize:8,color:T.blue}}>{t.factura||"—"}</td>
                <td style={td}><button onClick={()=>del(t.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#C44"}}><Trash2 size={10}/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {showNew && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setShowNew(false)}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:8,padding:24,width:460,boxShadow:"0 12px 40px rgba(0,0,0,0.2)"}}>
            <h3 style={{margin:0,fontSize:14,fontWeight:700,marginBottom:14}}>Registrar tanqueo</h3>
            <div style={{display:"flex",gap:8}}>
              <FI lbl="Vehículo" style={{flex:1}}>
                <select value={form.vehId} onChange={e=>setForm({...form,vehId:e.target.value})} style={{...inp,width:"100%"}}>
                  <option value="">— Seleccionar —</option>
                  {vehs.map(v=><option key={v.id} value={v.id}>{v.placa} — {v.marca} {v.modelo}</option>)}
                </select>
              </FI>
              <FI lbl="Fecha" val={form.fecha} on={e=>setForm({...form,fecha:e.target.value})} type="date" style={{flex:"0 0 140px"}}/>
            </div>
            <div style={{display:"flex",gap:8}}>
              <FI lbl="Tipo combustible" style={{flex:1}}>
                <select value={form.tipoCombus} onChange={e=>setForm({...form,tipoCombus:e.target.value})} style={{...inp,width:"100%"}}>
                  {TIPOS_COMB.map(t=><option key={t}>{t}</option>)}
                </select>
              </FI>
              <FI lbl="Estación" val={form.estacion} on={e=>setForm({...form,estacion:e.target.value})} ph="Terpel Cra 7" style={{flex:1}}/>
            </div>
            <div style={{display:"flex",gap:8}}>
              <FI lbl="Litros" val={form.litros} on={e=>setForm({...form,litros:e.target.value})} type="number" style={{flex:1}}/>
              <FI lbl="Valor total" val={form.valorTotal} on={e=>setForm({...form,valorTotal:e.target.value})} type="number" style={{flex:1}}/>
              <FI lbl="KM odómetro" val={form.km} on={e=>setForm({...form,km:e.target.value})} type="number" style={{flex:1}}/>
            </div>
            <FI lbl="Ref. factura" val={form.factura} on={e=>setForm({...form,factura:e.target.value})} ph="FV-00123"/>
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
   TAB 4: DOCUMENTACIÓN VEHICULAR
   ═══════════════════════════════════════════════════════════════ */
function TabDocs({ vehs, docVehs, setDocVehs }) {
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ vehId:"", tipo:"soat", fechaExpedicion:today(), fechaVence:"", entidad:"", poliza:"", costo:0, observaciones:"" });

  const TIPOS_DOC = [
    { id:"soat", lbl:"SOAT", icon:"🛡️" },
    { id:"tecno", lbl:"Tecnomecánica", icon:"🔧" },
    { id:"seguro", lbl:"Seguro todo riesgo", icon:"🔐" },
    { id:"tarjeta_prop", lbl:"Tarjeta de propiedad", icon:"📄" },
    { id:"licencia_trans", lbl:"Licencia de tránsito", icon:"📋" },
    { id:"revision_gas", lbl:"Revisión de gases", icon:"💨" },
    { id:"poliza_rce", lbl:"Póliza RCE", icon:"📑" },
    { id:"otro", lbl:"Otro", icon:"📎" },
  ];

  const add = () => {
    const veh = vehs.find(v=>v.id===form.vehId);
    if (!veh) return;
    setDocVehs([...docVehs, { id:uid(), ...form, costo:parseFloat(form.costo)||0, placa:veh.placa }]);
    setForm({ vehId:"", tipo:"soat", fechaExpedicion:today(), fechaVence:"", entidad:"", poliza:"", costo:0, observaciones:"" });
    setShowNew(false);
  };
  const del = (id) => setDocVehs(docVehs.filter(d=>d.id!==id));

  // Check vencidos
  const hoy = today();
  const pronto = new Date(); pronto.setDate(pronto.getDate()+30);
  const prontoStr = pronto.toISOString().split("T")[0];

  const vencidos = docVehs.filter(d=>d.fechaVence && d.fechaVence < hoy);
  const porVencer = docVehs.filter(d=>d.fechaVence && d.fechaVence >= hoy && d.fechaVence <= prontoStr);

  return (
    <div className="fade-up">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
        <div>
          <h2 style={{margin:0,fontSize:18,fontWeight:700}}>Documentación vehicular</h2>
          <p style={{margin:0,fontSize:10,color:T.inkMid}}>{docVehs.length} documentos · {vencidos.length} vencidos · {porVencer.length} por vencer</p>
        </div>
        <Btn on={()=>setShowNew(true)}><Plus size={11}/> Documento</Btn>
      </div>

      {(vencidos.length>0 || porVencer.length>0) && (
        <div style={{display:"flex",gap:8,marginBottom:14}}>
          {vencidos.length>0 && (
            <div style={{flex:1,background:T.redBg,border:`1px solid ${T.red}33`,borderRadius:6,padding:"8px 12px",display:"flex",alignItems:"center",gap:6}}>
              <AlertTriangle size={14} color={T.red}/>
              <div style={{fontSize:10,color:T.red,fontWeight:600}}>🚨 {vencidos.length} documento{vencidos.length>1?"s":""} vencido{vencidos.length>1?"s":""}: {vencidos.map(d=>d.placa+" "+TIPOS_DOC.find(t=>t.id===d.tipo)?.lbl).join(", ")}</div>
            </div>
          )}
          {porVencer.length>0 && (
            <div style={{flex:1,background:T.amberBg,border:`1px solid ${T.amber}33`,borderRadius:6,padding:"8px 12px",display:"flex",alignItems:"center",gap:6}}>
              <AlertTriangle size={14} color={T.amber}/>
              <div style={{fontSize:10,color:T.amber,fontWeight:600}}>⚠️ {porVencer.length} por vencer en 30 días</div>
            </div>
          )}
        </div>
      )}

      <Card style={{padding:0,overflow:"hidden"}}>
        <table style={{borderCollapse:"collapse",width:"100%"}}>
          <thead>
            <tr style={{background:"#EDEBE7"}}>
              {["Placa","Documento","Entidad","Póliza/Nro","Expedición","Vencimiento","Costo","Estado",""].map(h=>
                <th key={h} style={{...th,textAlign:h==="Costo"?"right":"left"}}>{h}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {docVehs.length===0 ? (
              <tr><td colSpan={9} style={{padding:24,textAlign:"center",color:T.inkLight,fontSize:11}}>Sin documentos</td></tr>
            ) : docVehs.sort((a,b)=>(a.fechaVence||"z").localeCompare(b.fechaVence||"z")).map((d,i) => {
              const tipoDoc = TIPOS_DOC.find(t=>t.id===d.tipo)||TIPOS_DOC[7];
              const vencido = d.fechaVence && d.fechaVence < hoy;
              const proximo = d.fechaVence && !vencido && d.fechaVence <= prontoStr;
              return (
                <tr key={d.id} style={{background:vencido?"#FAE8E844":proximo?"#FAF0E044":i%2?"#FFFFFF":"#fff"}}>
                  <td style={{...td,fontFamily:"'DM Mono',monospace",fontWeight:700}}>{d.placa}</td>
                  <td style={{...td,fontWeight:600}}>{tipoDoc.icon} {tipoDoc.lbl}</td>
                  <td style={{...td,fontSize:9}}>{d.entidad||"—"}</td>
                  <td style={{...td,fontSize:9,fontFamily:"'DM Mono',monospace"}}>{d.poliza||"—"}</td>
                  <td style={{...td,fontFamily:"'DM Mono',monospace",fontSize:9}}>{d.fechaExpedicion}</td>
                  <td style={{...td,fontFamily:"'DM Mono',monospace",fontSize:9,fontWeight:vencido||proximo?700:400,color:vencido?T.red:proximo?T.amber:T.ink}}>{d.fechaVence||"N/A"}</td>
                  <td style={{...td,textAlign:"right",fontFamily:"'DM Mono',monospace"}}>${fmt(d.costo)}</td>
                  <td style={td}>
                    {vencido ? <Badge color={T.red}>Vencido</Badge> :
                     proximo ? <Badge color={T.amber}>Por vencer</Badge> :
                     <Badge color={T.green}>Vigente</Badge>}
                  </td>
                  <td style={td}><button onClick={()=>del(d.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#C44"}}><Trash2 size={10}/></button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {showNew && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setShowNew(false)}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:8,padding:24,width:460,boxShadow:"0 12px 40px rgba(0,0,0,0.2)"}}>
            <h3 style={{margin:0,fontSize:14,fontWeight:700,marginBottom:14}}>Nuevo documento</h3>
            <div style={{display:"flex",gap:8}}>
              <FI lbl="Vehículo" style={{flex:1}}>
                <select value={form.vehId} onChange={e=>setForm({...form,vehId:e.target.value})} style={{...inp,width:"100%"}}>
                  <option value="">— Seleccionar —</option>
                  {vehs.map(v=><option key={v.id} value={v.id}>{v.placa} — {v.marca} {v.modelo}</option>)}
                </select>
              </FI>
              <FI lbl="Tipo" style={{flex:1}}>
                <select value={form.tipo} onChange={e=>setForm({...form,tipo:e.target.value})} style={{...inp,width:"100%"}}>
                  {TIPOS_DOC.map(t=><option key={t.id} value={t.id}>{t.icon} {t.lbl}</option>)}
                </select>
              </FI>
            </div>
            <div style={{display:"flex",gap:8}}>
              <FI lbl="Entidad / aseguradora" val={form.entidad} on={e=>setForm({...form,entidad:e.target.value})} ph="Sura, Colpatria..." style={{flex:1}}/>
              <FI lbl="Nro. póliza / doc" val={form.poliza} on={e=>setForm({...form,poliza:e.target.value})} ph="POL-123" style={{flex:1}}/>
            </div>
            <div style={{display:"flex",gap:8}}>
              <FI lbl="Fecha expedición" val={form.fechaExpedicion} on={e=>setForm({...form,fechaExpedicion:e.target.value})} type="date" style={{flex:1}}/>
              <FI lbl="Fecha vencimiento" val={form.fechaVence} on={e=>setForm({...form,fechaVence:e.target.value})} type="date" style={{flex:1}}/>
            </div>
            <FI lbl="Costo" val={form.costo} on={e=>setForm({...form,costo:e.target.value})} type="number"/>
            <FI lbl="Observaciones" val={form.observaciones} on={e=>setForm({...form,observaciones:e.target.value})} ph="Notas"/>
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
   TAB 5: MANTENIMIENTO
   ═══════════════════════════════════════════════════════════════ */
function TabMantenimiento({ vehs, mantos, setMantos }) {
  const [showNew, setShowNew] = useState(false);
  const [filtro, setFiltro] = useState("todos");
  const [form, setForm] = useState({ vehId:"", tipo:"preventivo", descripcion:"", fechaProg:"", fechaReal:"", kmProg:0, kmReal:0, taller:"", costo:0, estado:"programado", factura:"", observaciones:"" });

  const TIPOS_MANTO = [
    { id:"preventivo", lbl:"🔧 Preventivo", desc:"Cambio aceite, filtros, revisión general" },
    { id:"correctivo", lbl:"🔨 Correctivo", desc:"Reparación de falla o avería" },
    { id:"llantas", lbl:"🛞 Llantas", desc:"Cambio, rotación o alineación" },
    { id:"frenos", lbl:"🛑 Frenos", desc:"Pastillas, discos, líquido" },
    { id:"electrico", lbl:"⚡ Eléctrico", desc:"Batería, alternador, luces" },
    { id:"carroceria", lbl:"🚗 Carrocería", desc:"Pintura, latonería, vidrios" },
    { id:"otro", lbl:"📋 Otro", desc:"Otro tipo de mantenimiento" },
  ];
  const ESTADOS_M = { programado:{lbl:"Programado",c:T.blue}, en_curso:{lbl:"En curso",c:T.amber}, completado:{lbl:"Completado",c:T.green}, cancelado:{lbl:"Cancelado",c:T.red} };

  const add = () => {
    const veh = vehs.find(v=>v.id===form.vehId);
    if (!veh) return;
    setMantos([...mantos, { id:uid(), ...form, kmProg:parseFloat(form.kmProg)||0, kmReal:parseFloat(form.kmReal)||0, costo:parseFloat(form.costo)||0, placa:veh.placa }]);
    setForm({ vehId:"", tipo:"preventivo", descripcion:"", fechaProg:"", fechaReal:"", kmProg:0, kmReal:0, taller:"", costo:0, estado:"programado", factura:"", observaciones:"" });
    setShowNew(false);
  };
  const upd = (id,k,v) => setMantos(mantos.map(m=>m.id===id?{...m,[k]:v}:m));
  const del = (id) => setMantos(mantos.filter(m=>m.id!==id));

  const filtered = filtro==="todos" ? mantos : mantos.filter(m=>m.estado===filtro);
  const totalCosto = mantos.filter(m=>m.estado==="completado").reduce((s,m)=>s+m.costo,0);
  const programados = mantos.filter(m=>m.estado==="programado");

  // Check overdue
  const hoy = today();
  const vencidos = programados.filter(m=>m.fechaProg && m.fechaProg < hoy);

  return (
    <div className="fade-up">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
        <div>
          <h2 style={{margin:0,fontSize:18,fontWeight:700}}>Plan de mantenimiento</h2>
          <p style={{margin:0,fontSize:10,color:T.inkMid}}>{mantos.length} registros · {programados.length} programados · ${fmt(totalCosto)} invertido</p>
        </div>
        <Btn on={()=>setShowNew(true)}><Plus size={11}/> Mantenimiento</Btn>
      </div>

      {vencidos.length > 0 && (
        <div style={{background:T.redBg,border:`1px solid ${T.red}33`,borderRadius:6,padding:"8px 14px",marginBottom:14,display:"flex",alignItems:"center",gap:8}}>
          <AlertTriangle size={14} color={T.red}/>
          <div style={{fontSize:10,color:T.red,fontWeight:600}}>🚨 {vencidos.length} mantenimiento{vencidos.length>1?"s":""} vencido{vencidos.length>1?"s":""}: {vencidos.map(m=>m.placa).join(", ")}</div>
        </div>
      )}

      {/* Filtros */}
      <div style={{display:"flex",gap:0,marginBottom:14}}>
        {[["todos","Todos"],["programado","Programados"],["en_curso","En curso"],["completado","Completados"]].map(([k,lbl],i,arr) => (
          <button key={k} onClick={()=>setFiltro(k)}
            style={{padding:"6px 14px",fontSize:10,fontWeight:600,cursor:"pointer",border:`1px solid ${T.border}`,borderLeft:i>0?"none":undefined,
              fontFamily:"'DM Sans',sans-serif",borderRadius:i===0?"5px 0 0 5px":i===arr.length-1?"0 5px 5px 0":"0",
              background:filtro===k?"#111":"#fff",color:filtro===k?"#fff":T.inkMid}}>
            {lbl}
          </button>
        ))}
      </div>

      <Card style={{padding:0,overflow:"hidden"}}>
        <table style={{borderCollapse:"collapse",width:"100%"}}>
          <thead>
            <tr style={{background:"#EDEBE7"}}>
              {["Placa","Tipo","Descripción","Taller","F. programada","F. real","Costo","Estado",""].map(h=>
                <th key={h} style={{...th,textAlign:h==="Costo"?"right":"left"}}>{h}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.length===0 ? (
              <tr><td colSpan={9} style={{padding:24,textAlign:"center",color:T.inkLight,fontSize:11}}>Sin mantenimientos</td></tr>
            ) : filtered.sort((a,b)=>(a.fechaProg||"z").localeCompare(b.fechaProg||"z")).map((m,i) => {
              const tipoM = TIPOS_MANTO.find(t=>t.id===m.tipo)||TIPOS_MANTO[6];
              const est = ESTADOS_M[m.estado]||ESTADOS_M.programado;
              const vencido = m.estado==="programado" && m.fechaProg && m.fechaProg < hoy;
              return (
                <tr key={m.id} style={{background:vencido?"#FAE8E844":i%2?"#FFFFFF":"#fff"}}>
                  <td style={{...td,fontFamily:"'DM Mono',monospace",fontWeight:700}}>{m.placa}</td>
                  <td style={{...td,fontSize:9}}>{tipoM.lbl}</td>
                  <td style={{...td,fontSize:10,maxWidth:200}}>{m.descripcion||"—"}</td>
                  <td style={{...td,fontSize:9}}>{m.taller||"—"}</td>
                  <td style={{...td,fontFamily:"'DM Mono',monospace",fontSize:9,color:vencido?T.red:T.ink,fontWeight:vencido?700:400}}>{m.fechaProg||"—"}</td>
                  <td style={{...td,fontFamily:"'DM Mono',monospace",fontSize:9}}>{m.fechaReal||"—"}</td>
                  <td style={{...td,textAlign:"right",fontFamily:"'DM Mono',monospace",fontWeight:600}}>${fmt(m.costo)}</td>
                  <td style={td}>
                    <select value={m.estado} onChange={e=>upd(m.id,"estado",e.target.value)}
                      style={{fontSize:8,fontWeight:700,padding:"2px 6px",borderRadius:10,border:"none",cursor:"pointer",
                        background:est.c+"22",color:est.c}}>
                      {Object.entries(ESTADOS_M).map(([k,v])=><option key={k} value={k}>{v.lbl}</option>)}
                    </select>
                  </td>
                  <td style={td}><button onClick={()=>del(m.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#C44"}}><Trash2 size={10}/></button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {showNew && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setShowNew(false)}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:8,padding:24,width:500,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 12px 40px rgba(0,0,0,0.2)"}}>
            <h3 style={{margin:0,fontSize:14,fontWeight:700,marginBottom:14}}>Programar mantenimiento</h3>
            <div style={{display:"flex",gap:8}}>
              <FI lbl="Vehículo" style={{flex:1}}>
                <select value={form.vehId} onChange={e=>setForm({...form,vehId:e.target.value})} style={{...inp,width:"100%"}}>
                  <option value="">— Seleccionar —</option>
                  {vehs.map(v=><option key={v.id} value={v.id}>{v.placa} — {v.marca} {v.modelo}</option>)}
                </select>
              </FI>
              <FI lbl="Tipo" style={{flex:1}}>
                <select value={form.tipo} onChange={e=>setForm({...form,tipo:e.target.value})} style={{...inp,width:"100%"}}>
                  {TIPOS_MANTO.map(t=><option key={t.id} value={t.id}>{t.lbl}</option>)}
                </select>
              </FI>
            </div>
            <FI lbl="Descripción" val={form.descripcion} on={e=>setForm({...form,descripcion:e.target.value})} ph="Cambio aceite 10W-40, filtro aceite, filtro aire..."/>
            <div style={{display:"flex",gap:8}}>
              <FI lbl="Fecha programada" val={form.fechaProg} on={e=>setForm({...form,fechaProg:e.target.value})} type="date" style={{flex:1}}/>
              <FI lbl="Fecha real" val={form.fechaReal} on={e=>setForm({...form,fechaReal:e.target.value})} type="date" style={{flex:1}}/>
            </div>
            <div style={{display:"flex",gap:8}}>
              <FI lbl="KM programado" val={form.kmProg} on={e=>setForm({...form,kmProg:e.target.value})} type="number" style={{flex:1}}/>
              <FI lbl="KM real" val={form.kmReal} on={e=>setForm({...form,kmReal:e.target.value})} type="number" style={{flex:1}}/>
            </div>
            <div style={{display:"flex",gap:8}}>
              <FI lbl="Taller" val={form.taller} on={e=>setForm({...form,taller:e.target.value})} ph="Nombre taller" style={{flex:1}}/>
              <FI lbl="Costo" val={form.costo} on={e=>setForm({...form,costo:e.target.value})} type="number" style={{flex:1}}/>
            </div>
            <FI lbl="Ref. factura" val={form.factura} on={e=>setForm({...form,factura:e.target.value})} ph="FV-00123"/>
            <FI lbl="Observaciones" val={form.observaciones} on={e=>setForm({...form,observaciones:e.target.value})} ph="Notas"/>
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
export default function Flotas() {
  const [data, setData] = useState(() => {
    try { return JSON.parse(await store.get(STORE_KEY)) || {}; } catch { return {}; }
  });
  const save = (k,v) => setData(prev => { const n = {...prev,[k]:typeof v==="function"?v(prev[k]):v}; await store.set(STORE_KEY,JSON.stringify(n)); try { store.set(STORE_KEY,JSON.stringify(n)); } catch {} return n; });

  const vehs = data.vehiculos || [];
  const setVehs = (v) => save("vehiculos", typeof v==="function"?v(vehs):v);
  const partes = data.partesKm || [];
  const setPartes = (v) => save("partesKm", typeof v==="function"?v(partes):v);
  const tanqueos = data.tanqueos || [];
  const setTanqueos = (v) => save("tanqueos", typeof v==="function"?v(tanqueos):v);
  const docVehs = data.docVehs || [];
  const setDocVehs = (v) => save("docVehs", typeof v==="function"?v(docVehs):v);
  const mantos = data.mantos || [];
  const setMantos = (v) => save("mantos", typeof v==="function"?v(mantos):v);

  const [tab, setTab] = useState("dashboard");
  const hoy = today();
  const mesAct = hoy.slice(0,7);
  const pronto30 = new Date(); pronto30.setDate(pronto30.getDate()+30);
  const prStr = pronto30.toISOString().split("T")[0];
  const vAct = vehs.filter(v=>v.estado==="activo").length;
  const vTaller = vehs.filter(v=>v.estado==="taller").length;
  const docsVenc = docVehs.filter(d=>d.fechaVence&&d.fechaVence<hoy).length;
  const docsPronto = docVehs.filter(d=>d.fechaVence&&d.fechaVence>=hoy&&d.fechaVence<=prStr).length;
  const mantVenc = mantos.filter(m=>m.estado==="programado"&&m.fechaProg&&m.fechaProg<hoy).length;
  const kmMes = partes.filter(p=>p.fecha?.startsWith(mesAct)).reduce((s,p)=>s+Math.max(0,(p.kmFin||0)-(p.kmInicio||0)),0);
  const combMes = tanqueos.filter(t=>t.fecha?.startsWith(mesAct)).reduce((s,t)=>s+t.valorTotal,0);
  const litMes = tanqueos.filter(t=>t.fecha?.startsWith(mesAct)).reduce((s,t)=>s+t.litros,0);
  const costoManto = mantos.filter(m=>m.estado==="completado").reduce((s,m)=>s+m.costo,0);

  return (
    <>
      <Fonts/>
      <div style={{padding:"30px 36px",maxWidth:1400,margin:"0 auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <div>
            <div style={{fontSize:22,fontWeight:800,letterSpacing:1}}>🚗 Control de Flotas</div>
            <div style={{fontSize:10,color:T.inkMid}}>Vehículos · Kilómetros · Combustible · Documentos · Mantenimiento</div>
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
              {[["🚗 Vehículos activos",`${vAct}/${vehs.length}`,T.ink],["🔧 En taller",vTaller,vTaller>0?"#8C6A00":"#111111"],["📏 KM mes",`${fmt(kmMes)} km`,"#3B3B3B"],["⛽ Combustible mes",`$${fmt(combMes)}`,"#B91C1C"]].map(([l,v,c])=>(
                <Card key={l} style={{padding:"14px 16px"}}><div style={{fontSize:8,fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>{l}</div><div style={{fontSize:22,fontWeight:800,fontFamily:"'DM Mono',monospace",color:c}}>{v}</div></Card>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
              {[["📋 Docs vencidos",docsVenc,docsVenc>0?"#B91C1C":"#111111"],["⚠️ Docs por vencer",docsPronto,docsPronto>0?"#8C6A00":"#111111"],["🔧 Mantos vencidos",mantVenc,mantVenc>0?"#B91C1C":"#111111"],["💰 Costo mantos total",`$${fmt(costoManto)}`,T.ink]].map(([l,v,c])=>(
                <Card key={l} style={{padding:"14px 16px"}}><div style={{fontSize:8,fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>{l}</div><div style={{fontSize:22,fontWeight:800,fontFamily:"'DM Mono',monospace",color:c}}>{v}</div></Card>
              ))}
            </div>
            {litMes>0&&<Card style={{marginBottom:12,padding:"10px 14px"}}><div style={{fontSize:9,fontWeight:600,color:T.inkMid}}>⛽ Precio promedio/litro: <strong style={{color:T.ink}}>${fmt(combMes/litMes)}</strong> · Litros mes: <strong>{fmtDec(litMes)} L</strong></div></Card>}
            {(docsVenc>0||mantVenc>0)&&<div style={{background:"#FAE8E8",border:"1px solid #B91C1C33",borderRadius:6,padding:"10px 14px",fontSize:10,color:"#B91C1C",fontWeight:600}}>
              ⚠️ {[docsVenc>0&&`${docsVenc} documentos vencidos`,mantVenc>0&&`${mantVenc} mantenimientos vencidos`].filter(Boolean).join(" · ")}
            </div>}
          </div>
        )}
        {tab === "vehiculos"   && <TabVehiculos vehs={vehs} setVehs={setVehs}/>}
        {tab === "km"          && <TabKM vehs={vehs} setVehs={setVehs} partes={partes} setPartes={setPartes}/>}
        {tab === "combustible" && <TabCombustible vehs={vehs} tanqueos={tanqueos} setTanqueos={setTanqueos}/>}
        {tab === "docs"        && <TabDocs vehs={vehs} docVehs={docVehs} setDocVehs={setDocVehs}/>}
        {tab === "manto"       && <TabMantenimiento vehs={vehs} mantos={mantos} setMantos={setMantos}/>}
      </div>
    </>
  );
}
