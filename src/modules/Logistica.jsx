import { useState, useEffect, useMemo, useCallback } from "react";
import { store } from "../core/store.js";

import {
  Package, Plus, Trash2, Edit3, Check, X, Search,
  Download, Upload, ChevronDown, ChevronUp, Save,
  DollarSign, Truck, Shield, HardHat, Wrench,
  Eye, Filter, Copy, FileText, AlertTriangle
} from "lucide-react";

/* ─── TOKENS ─────────────────────────────────────── */
const C = {
  bg:"#F5F4F1", surface:"#FFFFFF", ink:"#111", inkMid:"#555",
  inkLight:"#909090", border:"#E0E0E0", borderMid:"#D5D2CC",
  accent:"#EDEBE7", accentBg:"#FFFFFF",
  success:"#111111", successBg:"#E8F4EE",
  warning:"#8C6A00", warningBg:"#FFF8E7",
  danger:"#B91C1C", dangerBg:"#FAE8E8",
  info:"#3B3B3B", infoBg:"#F0F0F0",
  sidebar:"#111", sidebarHover:"#222",
};

const uid = () => Math.random().toString(36).slice(2,11) + Date.now().toString(36);
const today = () => new Date().toISOString().split("T")[0];

/* ─── STORAGE (async, same pattern as RRHH) ────── */
const store = {
  get: async (k) => { try { const r = await store.get(k); return r ? JSON.parse(r) : null; } catch { return null; } },
  set: async (k, v) => { try { await store.set(k, JSON.stringify(v)); } catch {} },
};
const NS = {
  items:       "hab:logistica:items",
  proveedores: "hab:logistica:proveedores",
  cotizaciones:"hab:logistica:cotizaciones",
};

/* ─── FAMILIES ───────────────────────────────────── */
const FAMILIAS = [
  { id:"epp",           label:"EPPs",                   icon:"🦺", color:"#B91C1C", desc:"Elementos de protección personal" },
  { id:"dotacion",      label:"Dotaciones",             icon:"👕", color:"#5B3A8C", desc:"Uniformes, chalecos, calzado de dotación" },
  { id:"herr_menor",    label:"Herramienta menor",      icon:"🔨", color:"#8C6A00", desc:"Martillos, niveles, flexómetros, paletas, llanas" },
  { id:"herr_mayor",    label:"Herramienta mayor",      icon:"⚙️", color:"#3B3B3B", desc:"Taladros, pulidoras, cortadoras, mezcladoras" },
  { id:"equipo_obra",   label:"Equipos de obra",        icon:"🏗️", color:"#0D5E6E", desc:"Andamios, escaleras, formaletas, compresores" },
  { id:"equipo_medic",  label:"Equipos de medición",    icon:"📐", color:"#111111", desc:"Niveles láser, distanciómetros, estaciones" },
  { id:"equipo_computo",label:"Equipos de cómputo",     icon:"💻", color:"#555",    desc:"PCs, portátiles, tablets, monitores" },
  { id:"consumible",    label:"Consumibles",            icon:"📦", color:"#7C3A1E", desc:"Discos de corte, brocas, lijas, cintas" },
  { id:"seguridad",     label:"Señalización / Seguridad",icon:"🚧",color:"#B91C1C", desc:"Conos, cintas, señales, extintores, botiquines" },
  { id:"transporte",    label:"Transporte / Vehículos", icon:"🚛", color:"#555",    desc:"Vehículos, carretillas, montacargas" },
];

const SUBFAMILIAS_EPP = [
  "Cabeza","Ojos y cara","Oídos","Respiratorio","Manos","Pies","Cuerpo","Trabajo en alturas","Otro"
];

const UNIDADES = ["ud","par","juego","m","m²","kg","l","rollo","caja","gl"];

/* ─── COMPONENTS ─────────────────────────────────── */
const Card = ({ children, style }) => (
  <div style={{ background:C.surface, borderRadius:8, border:`1px solid ${C.border}`,
    boxShadow:"0 1px 3px rgba(0,0,0,.04)", ...style }}>{children}</div>
);
const Btn = ({ children, on, sm, v, style, ...p }) => {
  const base = { display:"inline-flex", alignItems:"center", gap:5, border:"none",
    borderRadius:4, cursor:"pointer", fontFamily:"'DM Sans',sans-serif",
    fontWeight:600, transition:"filter .15s", ...style };
  const variants = {
    pri:  { background:C.ink, color:"#fff", padding:sm?"5px 12px":"8px 18px", fontSize:sm?10:12 },
    sec:  { background:C.accent, color:C.ink, padding:sm?"5px 12px":"8px 18px", fontSize:sm?10:12, border:`1px solid ${C.border}` },
    ghost:{ background:"transparent", color:C.inkMid, padding:sm?"4px 8px":"6px 12px", fontSize:sm?10:11 },
    danger:{ background:C.dangerBg, color:C.danger, padding:sm?"5px 12px":"8px 18px", fontSize:sm?10:12, border:`1px solid ${C.danger}33` },
  };
  return <button onClick={on} style={{ ...base, ...(variants[v]||variants.pri) }}
    onMouseEnter={e=>e.currentTarget.style.filter="brightness(1.1)"}
    onMouseLeave={e=>e.currentTarget.style.filter="none"} {...p}>{children}</button>;
};
const STitle = ({ t, s }) => (<>
  <h3 style={{ fontSize:14, fontWeight:700, color:C.ink, margin:"0 0 2px" }}>{t}</h3>
  {s && <p style={{ fontSize:10, color:C.inkLight, margin:"0 0 10px" }}>{s}</p>}
</>);
const FI = ({ lbl, val, on, type="text", ph, style }) => (
  <div style={{ marginBottom:8, ...style }}>
    <label style={{ display:"block", fontSize:9, fontWeight:600, color:C.inkLight,
      marginBottom:3, textTransform:"uppercase", letterSpacing:1 }}>{lbl}</label>
    <input type={type} value={val||""} onChange={on} placeholder={ph}
      style={{ width:"100%", padding:"6px 10px", border:`1px solid ${C.border}`,
        borderRadius:3, fontSize:12, fontFamily:"'DM Sans',sans-serif", background:C.bg, color:C.ink }}/>
  </div>
);

/* ─── MAIN MODULE ────────────────────────────────── */
export default function Logistica() {
  // Data
  const [items, setItems] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [cotizaciones, setCotizaciones] = useState({});
  const [ready, setReady] = useState(false);

  // Load
  useEffect(() => {
    (async () => {
      const [it, pr, co] = await Promise.all([
        store.get(NS.items), store.get(NS.proveedores), store.get(NS.cotizaciones)
      ]);
      if (it) setItems(it);
      if (pr) setProveedores(pr);
      if (co) setCotizaciones(co);
      setReady(true);
    })();
  }, []);

  // Save
  const saveItems = useCallback((v) => { const nx = typeof v==="function"?v(items):v; setItems(nx); store.set(NS.items, nx); }, [items]);
  const saveProvs = useCallback((v) => { const nx = typeof v==="function"?v(proveedores):v; setProveedores(nx); store.set(NS.proveedores, nx); }, [proveedores]);
  const saveCots  = useCallback((v) => { const nx = typeof v==="function"?v(cotizaciones):v; setCotizaciones(nx); store.set(NS.cotizaciones, nx); }, [cotizaciones]);

  // UI state
  const [tab, setTab] = useState("dashboard");
  const [familiaFilter, setFamiliaFilter] = useState("todos");
  const [search, setSearch] = useState("");
  const [editItem, setEditItem] = useState(null);
  const [editProv, setEditProv] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [vistaCompra, setVistaCompra] = useState(false);

  const fmt = (n) => n ? new Intl.NumberFormat("es-CO",{ maximumFractionDigits:0 }).format(n) : "—";

  // Filtered items
  const filtered = useMemo(() => {
    let list = items;
    if (familiaFilter !== "todos") list = list.filter(i => i.familia === familiaFilter);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(i => (i.nombre||"").toLowerCase().includes(s) || (i.referencia||"").toLowerCase().includes(s));
    }
    return list;
  }, [items, familiaFilter, search]);

  // Stats
  const stats = useMemo(() => {
    const byFam = {};
    FAMILIAS.forEach(f => byFam[f.id] = { count:0, valor:0 });
    items.forEach(i => {
      if (byFam[i.familia]) {
        byFam[i.familia].count++;
        byFam[i.familia].valor += (i.precio||0) * (i.stockActual||0);
      }
    });
    return { total: items.length, byFam, provs: proveedores.length,
      valorTotal: items.reduce((s,i) => s + (i.precio||0)*(i.stockActual||0), 0) };
  }, [items, proveedores]);

  // Default item
  const defItem = (familia = "epp") => ({
    id: uid(), nombre: "", familia, subfamilia: "",
    referencia: "", marca: "", unidad: "ud",
    precio: 0, proveedorId: "",
    vidaUtil: 12, reposicionMeses: 12,
    stockMinimo: 0, stockActual: 0,
    asociadoACargo: false, cargosAsociados: [],
    notas: "", activo: true, fechaCreacion: today(),
  });

  const defProv = () => ({
    id: uid(), nombre: "", nit: "", contacto: "",
    telefono: "", email: "", ciudad: "",
    especialidad: "", notas: "", activo: true,
  });

  // CRUD
  const saveItem = (item) => {
    saveItems(prev => {
      const exists = prev.find(i => i.id === item.id);
      return exists ? prev.map(i => i.id === item.id ? item : i) : [...prev, item];
    });
    setEditItem(null);
    setShowForm(false);
  };
  const deleteItem = (id) => saveItems(prev => prev.filter(i => i.id !== id));

  const saveProv = (prov) => {
    saveProvs(prev => {
      const exists = prev.find(p => p.id === prov.id);
      return exists ? prev.map(p => p.id === prov.id ? prov : p) : [...prev, prov];
    });
    setEditProv(null);
  };
  const deleteProv = (id) => saveProvs(prev => prev.filter(p => p.id !== id));

  // Cotización helpers
  const setCot = (itemId, provId, precio) => {
    saveCots(prev => {
      const next = {...prev};
      if (!next[itemId]) next[itemId] = {};
      next[itemId][provId] = { precio: +precio, fecha: today() };
      return next;
    });
  };
  const getCot = (itemId, provId) => cotizaciones[itemId]?.[provId] || {};
  const getBestProv = (itemId) => {
    const cots = cotizaciones[itemId] || {};
    let best = null, bestP = Infinity;
    Object.entries(cots).forEach(([pid, c]) => {
      if (c.precio > 0 && c.precio < bestP) { bestP = c.precio; best = pid; }
    });
    return best;
  };

  // Load RRHH cargos for association
  const [rrhhCargos, setRrhhCargos] = useState([]);
  useEffect(() => {
    (async () => {
      try { const r = await store.get("hab:rrhh:cargos"); if (r) setRrhhCargos(JSON.parse(r)||[]); } catch {}
    })();
  }, []);

  // ─── Export CSV ───
  const exportCSV = () => {
    const head = ["Familia","Nombre","Referencia","Marca","Unidad","Precio","Stock","Vida útil (meses)","Proveedor"];
    const rows = items.map(i => {
      const p = proveedores.find(x=>x.id===i.proveedorId);
      return [FAMILIAS.find(f=>f.id===i.familia)?.label||i.familia, i.nombre, i.referencia, i.marca, i.unidad, i.precio, i.stockActual, i.vidaUtil, p?.nombre||""];
    });
    const csv = "\uFEFF" + [head,...rows].map(r=>r.map(c=>`"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type:"text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "logistica_inventario.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  if (!ready) return <div style={{ padding:40, textAlign:"center", color:C.inkLight }}>Cargando...</div>;

  return (
    <div style={{ minHeight:"100vh", background:C.bg }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM Sans:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        input:focus, select:focus { outline: none; border-color: ${C.ink} !important; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 2px; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
        .fade { animation: fadeUp .15s ease both; }
      `}</style>

      <div style={{ maxWidth:1400, margin:"0 auto", padding:"20px 24px" }}>
        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20, flexWrap:"wrap", gap:12 }}>
          <div>
            <p style={{ fontSize:9, letterSpacing:2, textTransform:"uppercase", color:C.inkLight, margin:"0 0 3px" }}>Logística y recursos</p>
            <h1 style={{ fontFamily:"'DM Sans',sans-serif", fontSize:24, fontWeight:800, color:C.ink, margin:0 }}>
              Almacén · EPPs · Herramientas · Equipos
            </h1>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <Btn sm v="sec" on={exportCSV}><Download size={12}/> Exportar CSV</Btn>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", borderBottom:`1px solid ${C.border}`, marginBottom:20 }}>
          {[{id:"dashboard",lbl:"Dashboard"},{id:"inventario",lbl:"Inventario"},{id:"proveedores",lbl:"Proveedores"},{id:"comparativo",lbl:"Comparativo precios"},{id:"compras",lbl:"Lista de compra"}].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{ padding:"10px 16px", border:"none", cursor:"pointer", fontFamily:"'DM Sans',sans-serif",
                fontSize:11, fontWeight:600, letterSpacing:1, textTransform:"uppercase", background:"transparent",
                color:tab===t.id?C.ink:C.inkLight, borderBottom:tab===t.id?`2px solid ${C.ink}`:"2px solid transparent",
                transition:"all .15s", marginBottom:-1 }}>{t.lbl}</button>
          ))}
        </div>

        {/* ═══ DASHBOARD ═══ */}
        {tab === "dashboard" && (
          <div className="fade">
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
              {[
                ["📦 Ítems inventario",items.length,"#111"],
                ["🏢 Proveedores",proveedores.length,"#3B3B3B"],
                ["⚠️ Stock bajo",items.filter(i=>i.stockActual<=i.stockMinimo).length,items.filter(i=>i.stockActual<=i.stockMinimo).length>0?"#B91C1C":"#111111"],
                ["💰 Valor inventario","$"+fmt(items.reduce((s,i)=>s+(i.stockActual||0)*(i.precioRef||0),0)),"#111"]
              ].map(([l,v,c])=>(
                <div key={l} style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:8,padding:"14px 16px",boxShadow:"0 1px 3px rgba(0,0,0,.06)"}}>
                  <div style={{fontSize:8,fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>{l}</div>
                  <div style={{fontSize:22,fontWeight:800,fontFamily:"'DM Mono',monospace",color:c}}>{v}</div>
                </div>
              ))}
            </div>
            {items.filter(i=>i.stockActual<=i.stockMinimo).length>0&&(
              <div style={{background:"#FAE8E8",border:"1px solid #B91C1C33",borderRadius:6,padding:"10px 14px",fontSize:10,color:"#B91C1C",fontWeight:600}}>
                ⚠️ Stock bajo: {items.filter(i=>i.stockActual<=i.stockMinimo).map(i=>i.nombre).join(", ")}
              </div>
            )}
          </div>
        )}

        {/* ═══ INVENTARIO ═══ */}
        {tab === "inventario" && (
          <div className="fade">
            {/* KPIs by family */}
            <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap" }}>
              {FAMILIAS.map(f => (
                <button key={f.id} onClick={()=>setFamiliaFilter(familiaFilter===f.id?"todos":f.id)}
                  style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 12px",
                    border:`1px solid ${familiaFilter===f.id?f.color:C.border}`, borderRadius:6,
                    background:familiaFilter===f.id?f.color+"15":"#fff", cursor:"pointer",
                    fontFamily:"'DM Sans',sans-serif", transition:"all .1s" }}>
                  <span style={{ fontSize:16 }}>{f.icon}</span>
                  <div style={{ textAlign:"left" }}>
                    <div style={{ fontSize:10, fontWeight:600, color:familiaFilter===f.id?f.color:C.inkMid }}>{f.label}</div>
                    <div style={{ fontSize:13, fontWeight:700, color:C.ink }}>{stats.byFam[f.id]?.count||0}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Toolbar */}
            <div style={{ display:"flex", gap:8, marginBottom:12, alignItems:"center", flexWrap:"wrap" }}>
              <div style={{ position:"relative", flex:1, minWidth:200 }}>
                <Search size={14} style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:C.inkLight }}/>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por nombre o referencia..."
                  style={{ width:"100%", padding:"8px 8px 8px 32px", border:`1px solid ${C.border}`, borderRadius:4,
                    fontSize:12, fontFamily:"'DM Sans',sans-serif", background:"#fff" }}/>
              </div>
              <Btn on={()=>{ setEditItem(defItem(familiaFilter==="todos"?"epp":familiaFilter)); setShowForm(true); }}>
                <Plus size={12}/> Nuevo ítem
              </Btn>
            </div>

            {/* Items table */}
            <Card style={{ padding:0, overflow:"hidden" }}>
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", minWidth:900 }}>
                  <thead><tr style={{ background:"#EDEBE7" }}>
                    {["","Nombre","Ref/Marca","Familia","Unid","Precio","Stock","Vida útil","Proveedor",""].map((h,i)=>(
                      <th key={i} style={{ padding:"7px 8px", fontSize:9, fontWeight:700, color:"#888",
                        textTransform:"uppercase", letterSpacing:.4, borderBottom:`2px solid ${C.border}`,
                        textAlign:i>=4?"center":"left" }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {filtered.length === 0 && (
                      <tr><td colSpan={10} style={{ padding:32, textAlign:"center", color:C.inkLight, fontSize:13 }}>
                        Sin ítems{familiaFilter!=="todos"?` en ${FAMILIAS.find(f=>f.id===familiaFilter)?.label}`:""}.
                      </td></tr>
                    )}
                    {filtered.map((item, idx) => {
                      const fam = FAMILIAS.find(f=>f.id===item.familia);
                      const prov = proveedores.find(p=>p.id===item.proveedorId);
                      return (
                        <tr key={item.id} style={{ background:idx%2===0?"#fff":"#FFFFFF", borderBottom:`1px solid #F5F5F5` }}>
                          <td style={{ padding:"5px 6px", fontSize:16, textAlign:"center" }}>{fam?.icon||"📦"}</td>
                          <td style={{ padding:"5px 8px" }}>
                            <div style={{ fontSize:12, fontWeight:600, color:C.ink }}>{item.nombre||"Sin nombre"}</div>
                            {item.notas && <div style={{ fontSize:9, color:C.inkLight, marginTop:1 }}>{item.notas}</div>}
                          </td>
                          <td style={{ padding:"5px 8px" }}>
                            <div style={{ fontSize:10, color:C.inkMid }}>{item.referencia||"—"}</div>
                            <div style={{ fontSize:9, color:C.inkLight }}>{item.marca||""}</div>
                          </td>
                          <td style={{ padding:"5px 8px" }}>
                            <span style={{ fontSize:9, fontWeight:600, color:fam?.color||C.inkMid, background:fam?.color+"15",
                              padding:"2px 6px", borderRadius:3 }}>{fam?.label||item.familia}</span>
                          </td>
                          <td style={{ padding:"5px 6px", textAlign:"center", fontSize:10 }}>{item.unidad}</td>
                          <td style={{ padding:"5px 6px", textAlign:"center", fontFamily:"'DM Mono',monospace", fontSize:11, fontWeight:600 }}>
                            {fmt(item.precio)}
                          </td>
                          <td style={{ padding:"5px 6px", textAlign:"center" }}>
                            <span style={{ fontSize:11, fontWeight:600,
                              color: item.stockActual <= item.stockMinimo ? C.danger : C.ink }}>
                              {item.stockActual||0}
                            </span>
                            {item.stockMinimo > 0 && item.stockActual <= item.stockMinimo && (
                              <span style={{ fontSize:8, color:C.danger, display:"block" }}>⚠ bajo</span>
                            )}
                          </td>
                          <td style={{ padding:"5px 6px", textAlign:"center", fontSize:10, color:C.inkMid }}>
                            {item.vidaUtil||"—"} meses
                          </td>
                          <td style={{ padding:"5px 8px", fontSize:10 }}>{prov?.nombre||"—"}</td>
                          <td style={{ padding:"5px 4px", textAlign:"center", whiteSpace:"nowrap" }}>
                            <button onClick={()=>{ setEditItem({...item}); setShowForm(true); }}
                              style={{ background:"none",border:"none",cursor:"pointer",color:C.inkLight,padding:3 }}><Edit3 size={12}/></button>
                            <button onClick={()=>deleteItem(item.id)}
                              style={{ background:"none",border:"none",cursor:"pointer",color:C.danger,padding:3 }}><Trash2 size={12}/></button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* ═══ PROVEEDORES ═══ */}
        {tab === "proveedores" && (
          <div className="fade">
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
              <STitle t={`${proveedores.length} proveedores registrados`} s="Gestión de proveedores para cotizaciones" />
              <Btn on={()=>setEditProv(defProv())}><Plus size={12}/> Nuevo proveedor</Btn>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))", gap:12 }}>
              {proveedores.map(p => (
                <Card key={p.id} style={{ padding:14 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                    <div>
                      <div style={{ fontSize:14, fontWeight:700, color:C.ink }}>{p.nombre}</div>
                      <div style={{ fontSize:10, color:C.inkMid, marginTop:2 }}>{p.nit&&`NIT: ${p.nit} · `}{p.ciudad||""}</div>
                    </div>
                    <div style={{ display:"flex", gap:4 }}>
                      <button onClick={()=>setEditProv({...p})} style={{ background:"none",border:"none",cursor:"pointer",color:C.inkLight,padding:3 }}><Edit3 size={12}/></button>
                      <button onClick={()=>deleteProv(p.id)} style={{ background:"none",border:"none",cursor:"pointer",color:C.danger,padding:3 }}><Trash2 size={12}/></button>
                    </div>
                  </div>
                  {p.contacto && <div style={{ fontSize:11, marginTop:6 }}>👤 {p.contacto}</div>}
                  {p.telefono && <div style={{ fontSize:11, color:C.inkMid }}>📱 {p.telefono}</div>}
                  {p.email && <div style={{ fontSize:11, color:C.inkMid }}>✉ {p.email}</div>}
                  {p.especialidad && <div style={{ fontSize:10, color:C.info, marginTop:4, fontWeight:600 }}>{p.especialidad}</div>}
                </Card>
              ))}
              {proveedores.length === 0 && (
                <Card style={{ padding:32, textAlign:"center", gridColumn:"1/-1" }}>
                  <Truck size={28} style={{ color:C.inkLight, opacity:.3, marginBottom:8 }}/>
                  <p style={{ color:C.inkLight, fontSize:13 }}>Sin proveedores. Añade el primero.</p>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* ═══ COMPARATIVO ═══ */}
        {tab === "comparativo" && (
          <div className="fade">
            <STitle t="Comparativo de precios por proveedor" s="Ingresa precios de cada proveedor para comparar" />
            {proveedores.length === 0 ? (
              <Card style={{ padding:32, textAlign:"center" }}>
                <p style={{ color:C.inkLight }}>Primero añade proveedores en la pestaña Proveedores.</p>
              </Card>
            ) : (
              <Card style={{ padding:0, overflow:"hidden", marginTop:12 }}>
                <div style={{ overflowX:"auto" }}>
                  <table style={{ borderCollapse:"collapse", width:"100%", minWidth:500+proveedores.length*120 }}>
                    <thead><tr style={{ background:"#EDEBE7" }}>
                      <th style={{ padding:"7px 8px", fontSize:9, fontWeight:700, color:"#888", textTransform:"uppercase",
                        borderBottom:`2px solid ${C.border}`, textAlign:"left", position:"sticky", left:0, background:"#EDEBE7", zIndex:2, minWidth:50 }}>#</th>
                      <th style={{ padding:"7px 8px", fontSize:9, fontWeight:700, color:"#888", textTransform:"uppercase",
                        borderBottom:`2px solid ${C.border}`, textAlign:"left", position:"sticky", left:50, background:"#EDEBE7", zIndex:2, minWidth:180 }}>ÍTEM</th>
                      <th style={{ padding:"7px 8px", fontSize:9, fontWeight:700, color:"#888", textTransform:"uppercase",
                        borderBottom:`2px solid ${C.border}`, textAlign:"center", width:50 }}>UND</th>
                      {proveedores.map(p=>(
                        <th key={p.id} style={{ padding:"7px 8px", fontSize:9, fontWeight:700, textTransform:"uppercase",
                          borderBottom:`2px solid ${C.border}`, textAlign:"center", minWidth:110,
                          color:C.info, background:C.infoBg }}>{p.nombre}</th>
                      ))}
                      <th style={{ padding:"7px 8px", fontSize:9, fontWeight:700, color:C.success, textTransform:"uppercase",
                        borderBottom:`2px solid ${C.border}`, textAlign:"center", width:100, background:C.successBg }}>MEJOR</th>
                    </tr></thead>
                    <tbody>
                      {items.map((item,idx)=>{
                        const bestId = getBestProv(item.id);
                        const bestCot = bestId ? getCot(item.id, bestId) : {};
                        const fam = FAMILIAS.find(f=>f.id===item.familia);
                        return (
                          <tr key={item.id} style={{ background:idx%2===0?"#fff":"#FFFFFF", borderBottom:`1px solid ${C.border}` }}>
                            <td style={{ padding:"4px 8px", fontSize:10, color:"#999", position:"sticky", left:0, background:idx%2===0?"#fff":"#FFFFFF", zIndex:1 }}>{idx+1}</td>
                            <td style={{ padding:"4px 8px", position:"sticky", left:50, background:idx%2===0?"#fff":"#FFFFFF", zIndex:1 }}>
                              <span style={{ fontSize:11, fontWeight:500 }}>{fam?.icon} {item.nombre}</span>
                            </td>
                            <td style={{ padding:"4px 6px", textAlign:"center", fontSize:10, color:C.inkMid }}>{item.unidad}</td>
                            {proveedores.map(p=>{
                              const cot = getCot(item.id, p.id);
                              const isBest = bestId === p.id && cot.precio > 0;
                              return (
                                <td key={p.id} style={{ padding:"3px 4px", textAlign:"center", background:isBest?C.successBg:"transparent", borderLeft:`1px solid ${C.border}` }}>
                                  <input type="number" value={cot.precio||""} placeholder="—"
                                    onChange={e=>setCot(item.id, p.id, e.target.value)}
                                    style={{ border:`1px solid ${isBest?C.success:C.border}`, borderRadius:3, padding:"3px 5px",
                                      fontSize:10, fontFamily:"'DM Mono',monospace", width:85, textAlign:"right",
                                      background:isBest?"#D4EDDA":"#fff", fontWeight:isBest?700:400 }}/>
                                </td>
                              );
                            })}
                            <td style={{ padding:"4px 6px", textAlign:"center", fontFamily:"'DM Mono',monospace", fontSize:11,
                              fontWeight:700, color:C.success, background:C.successBg }}>
                              {bestCot.precio > 0 ? fmt(bestCot.precio) : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ═══ LISTA DE COMPRA ═══ */}
        {tab === "compras" && (
          <div className="fade">
            <STitle t="Lista de compra" s="Ítems con stock bajo o sin stock, agrupados por proveedor" />
            {(() => {
              const lowStock = items.filter(i => i.stockActual <= (i.stockMinimo||0));
              if (lowStock.length === 0) return (
                <Card style={{ padding:32, textAlign:"center", marginTop:12 }}>
                  <Package size={28} style={{ color:C.inkLight, opacity:.3, marginBottom:8 }}/>
                  <p style={{ color:C.inkLight }}>No hay ítems con stock bajo. Define stock mínimo en cada ítem para activar alertas.</p>
                </Card>
              );
              // Group by best proveedor
              const grouped = {};
              lowStock.forEach(i => {
                const bestId = getBestProv(i.id) || i.proveedorId || "sin_prov";
                if (!grouped[bestId]) grouped[bestId] = [];
                grouped[bestId].push(i);
              });
              return (
                <div style={{ display:"grid", gap:12, marginTop:12 }}>
                  {Object.entries(grouped).map(([provId, lista]) => {
                    const prov = proveedores.find(p=>p.id===provId);
                    return (
                      <Card key={provId} style={{ padding:14 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                          <div>
                            <div style={{ fontSize:13, fontWeight:700 }}>🚛 {prov?.nombre||"Sin proveedor asignado"}</div>
                            {prov?.telefono && <div style={{ fontSize:10, color:C.inkMid }}>{prov.telefono} · {prov.email||""}</div>}
                          </div>
                          <span style={{ fontSize:11, fontWeight:600, color:C.danger }}>{lista.length} ítem{lista.length!==1?"s":""}</span>
                        </div>
                        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                          <thead><tr style={{ borderBottom:`1px solid ${C.border}` }}>
                            <th style={{ padding:"4px 6px", textAlign:"left", fontSize:9, color:"#888", fontWeight:700 }}>ÍTEM</th>
                            <th style={{ padding:"4px 6px", textAlign:"center", fontSize:9, color:"#888", fontWeight:700, width:50 }}>UND</th>
                            <th style={{ padding:"4px 6px", textAlign:"center", fontSize:9, color:"#888", fontWeight:700, width:60 }}>STOCK</th>
                            <th style={{ padding:"4px 6px", textAlign:"center", fontSize:9, color:"#888", fontWeight:700, width:60 }}>MÍN</th>
                            <th style={{ padding:"4px 6px", textAlign:"center", fontSize:9, color:C.danger, fontWeight:700, width:60 }}>PEDIR</th>
                            <th style={{ padding:"4px 6px", textAlign:"right", fontSize:9, color:"#888", fontWeight:700, width:80 }}>P.U.</th>
                            <th style={{ padding:"4px 6px", textAlign:"right", fontSize:9, color:"#888", fontWeight:700, width:90 }}>SUBTOTAL</th>
                          </tr></thead>
                          <tbody>
                            {lista.map(i => {
                              const pedir = Math.max(0, (i.stockMinimo||1) - (i.stockActual||0));
                              const bestId = getBestProv(i.id);
                              const bestCot = bestId ? getCot(i.id, bestId) : {};
                              const pu = bestCot.precio || i.precio || 0;
                              return (
                                <tr key={i.id} style={{ borderBottom:`1px solid #F5F5F5` }}>
                                  <td style={{ padding:"4px 6px", fontWeight:500 }}>
                                    {FAMILIAS.find(f=>f.id===i.familia)?.icon} {i.nombre}
                                  </td>
                                  <td style={{ padding:"4px 6px", textAlign:"center", color:C.inkMid }}>{i.unidad}</td>
                                  <td style={{ padding:"4px 6px", textAlign:"center", color:C.danger, fontWeight:600 }}>{i.stockActual||0}</td>
                                  <td style={{ padding:"4px 6px", textAlign:"center" }}>{i.stockMinimo||0}</td>
                                  <td style={{ padding:"4px 6px", textAlign:"center", fontWeight:700, color:C.danger, background:C.dangerBg }}>{pedir}</td>
                                  <td style={{ padding:"4px 6px", textAlign:"right", fontFamily:"'DM Mono',monospace", fontSize:10 }}>{fmt(pu)}</td>
                                  <td style={{ padding:"4px 6px", textAlign:"right", fontFamily:"'DM Mono',monospace", fontSize:10, fontWeight:600 }}>{fmt(pu*pedir)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </Card>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* ═══ ITEM FORM MODAL ═══ */}
        {showForm && editItem && (
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:9999,
            display:"flex", alignItems:"center", justifyContent:"center" }}
            onClick={()=>{ setShowForm(false); setEditItem(null); }}>
            <div onClick={e=>e.stopPropagation()}
              style={{ background:"#fff", borderRadius:8, padding:24, width:520, maxHeight:"85vh", overflowY:"auto",
                boxShadow:"0 12px 40px rgba(0,0,0,0.2)" }}>
              <STitle t={editItem.fechaCreacion===today()?"Nuevo ítem":"Editar ítem"} s="Registro de recurso / material" />

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                <FI lbl="Nombre" val={editItem.nombre} on={e=>setEditItem({...editItem,nombre:e.target.value})} ph="Ej: Casco de seguridad"/>
                <div style={{ marginBottom:8 }}>
                  <label style={{ display:"block", fontSize:9, fontWeight:600, color:C.inkLight, marginBottom:3, textTransform:"uppercase", letterSpacing:1 }}>Familia</label>
                  <select value={editItem.familia} onChange={e=>setEditItem({...editItem,familia:e.target.value})}
                    style={{ width:"100%", padding:"6px 10px", border:`1px solid ${C.border}`, borderRadius:3, fontSize:12, fontFamily:"'DM Sans',sans-serif", background:C.bg }}>
                    {FAMILIAS.map(f=><option key={f.id} value={f.id}>{f.icon} {f.label}</option>)}
                  </select>
                </div>
              </div>

              {editItem.familia === "epp" && (
                <div style={{ marginBottom:8 }}>
                  <label style={{ display:"block", fontSize:9, fontWeight:600, color:C.inkLight, marginBottom:3, textTransform:"uppercase", letterSpacing:1 }}>Subfamilia EPP</label>
                  <select value={editItem.subfamilia||""} onChange={e=>setEditItem({...editItem,subfamilia:e.target.value})}
                    style={{ width:"100%", padding:"6px 10px", border:`1px solid ${C.border}`, borderRadius:3, fontSize:12, fontFamily:"'DM Sans',sans-serif", background:C.bg }}>
                    <option value="">— Seleccionar —</option>
                    {SUBFAMILIAS_EPP.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
                <FI lbl="Referencia" val={editItem.referencia} on={e=>setEditItem({...editItem,referencia:e.target.value})} ph="Ref."/>
                <FI lbl="Marca" val={editItem.marca} on={e=>setEditItem({...editItem,marca:e.target.value})} ph="Marca"/>
                <div style={{ marginBottom:8 }}>
                  <label style={{ display:"block", fontSize:9, fontWeight:600, color:C.inkLight, marginBottom:3, textTransform:"uppercase", letterSpacing:1 }}>Unidad</label>
                  <select value={editItem.unidad} onChange={e=>setEditItem({...editItem,unidad:e.target.value})}
                    style={{ width:"100%", padding:"6px 10px", border:`1px solid ${C.border}`, borderRadius:3, fontSize:12, fontFamily:"'DM Sans',sans-serif", background:C.bg }}>
                    {UNIDADES.map(u=><option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8 }}>
                <FI lbl="Precio unitario" type="number" val={editItem.precio} on={e=>setEditItem({...editItem,precio:+e.target.value})}/>
                <FI lbl="Stock actual" type="number" val={editItem.stockActual} on={e=>setEditItem({...editItem,stockActual:+e.target.value})}/>
                <FI lbl="Stock mínimo" type="number" val={editItem.stockMinimo} on={e=>setEditItem({...editItem,stockMinimo:+e.target.value})}/>
                <FI lbl="Vida útil (meses)" type="number" val={editItem.vidaUtil} on={e=>setEditItem({...editItem,vidaUtil:+e.target.value})}/>
              </div>

              <div style={{ marginBottom:8 }}>
                <label style={{ display:"block", fontSize:9, fontWeight:600, color:C.inkLight, marginBottom:3, textTransform:"uppercase", letterSpacing:1 }}>Proveedor principal</label>
                <select value={editItem.proveedorId||""} onChange={e=>setEditItem({...editItem,proveedorId:e.target.value})}
                  style={{ width:"100%", padding:"6px 10px", border:`1px solid ${C.border}`, borderRadius:3, fontSize:12, fontFamily:"'DM Sans',sans-serif", background:C.bg }}>
                  <option value="">— Sin asignar —</option>
                  {proveedores.map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>

              {/* Asociar a cargos */}
              {(editItem.familia === "epp" || editItem.familia === "dotacion") && (
                <div style={{ marginBottom:8, background:C.warningBg, borderRadius:4, padding:"8px 10px" }}>
                  <label style={{ display:"block", fontSize:9, fontWeight:600, color:C.warning, marginBottom:4, textTransform:"uppercase", letterSpacing:1 }}>
                    Asociar a cargos (para cálculo en APU)
                  </label>
                  <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                    {rrhhCargos.filter(c=>c.activo!==false).map(cargo => {
                      const selected = (editItem.cargosAsociados||[]).includes(cargo.id);
                      return (
                        <button key={cargo.id} onClick={()=>{
                          const list = editItem.cargosAsociados||[];
                          setEditItem({...editItem, cargosAsociados: selected ? list.filter(x=>x!==cargo.id) : [...list, cargo.id], asociadoACargo:true});
                        }}
                          style={{ padding:"3px 8px", fontSize:10, cursor:"pointer", border:`1px solid ${selected?C.warning:C.border}`,
                            borderRadius:3, background:selected?C.warning+"25":"#fff", color:selected?C.warning:C.inkMid,
                            fontFamily:"'DM Sans',sans-serif", fontWeight:selected?600:400 }}>
                          {selected?"✓ ":""}{cargo.nombre}
                        </button>
                      );
                    })}
                    {rrhhCargos.filter(c=>c.activo!==false).length === 0 && (
                      <span style={{ fontSize:10, color:C.inkLight }}>Sin cargos en RRHH.</span>
                    )}
                  </div>
                </div>
              )}

              <FI lbl="Notas" val={editItem.notas} on={e=>setEditItem({...editItem,notas:e.target.value})} ph="Observaciones..."/>

              <div style={{ display:"flex", gap:8, marginTop:8 }}>
                <Btn on={()=>saveItem(editItem)} style={{ flex:1 }}><Check size={12}/> Guardar</Btn>
                <Btn v="sec" on={()=>{ setShowForm(false); setEditItem(null); }} style={{ flex:1 }}>Cancelar</Btn>
              </div>
            </div>
          </div>
        )}

        {/* ═══ PROVEEDOR FORM MODAL ═══ */}
        {editProv && (
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:9999,
            display:"flex", alignItems:"center", justifyContent:"center" }}
            onClick={()=>setEditProv(null)}>
            <div onClick={e=>e.stopPropagation()}
              style={{ background:"#fff", borderRadius:8, padding:24, width:420, boxShadow:"0 12px 40px rgba(0,0,0,0.2)" }}>
              <STitle t="Proveedor" s="Datos del proveedor" />
              <FI lbl="Nombre / Empresa" val={editProv.nombre} on={e=>setEditProv({...editProv,nombre:e.target.value})} ph="Nombre"/>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                <FI lbl="NIT / CIF" val={editProv.nit} on={e=>setEditProv({...editProv,nit:e.target.value})} ph="NIT"/>
                <FI lbl="Ciudad" val={editProv.ciudad} on={e=>setEditProv({...editProv,ciudad:e.target.value})} ph="Ciudad"/>
              </div>
              <FI lbl="Contacto" val={editProv.contacto} on={e=>setEditProv({...editProv,contacto:e.target.value})} ph="Persona de contacto"/>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                <FI lbl="Teléfono" val={editProv.telefono} on={e=>setEditProv({...editProv,telefono:e.target.value})} ph="+57..."/>
                <FI lbl="Email" val={editProv.email} on={e=>setEditProv({...editProv,email:e.target.value})} ph="email@..."/>
              </div>
              <FI lbl="Especialidad" val={editProv.especialidad} on={e=>setEditProv({...editProv,especialidad:e.target.value})} ph="Ej: EPPs, ferretería, eléctricos"/>
              <FI lbl="Notas" val={editProv.notas} on={e=>setEditProv({...editProv,notas:e.target.value})} ph="Observaciones"/>
              <div style={{ display:"flex", gap:8, marginTop:8 }}>
                <Btn on={()=>saveProv(editProv)} style={{ flex:1 }}><Check size={12}/> Guardar</Btn>
                <Btn v="sec" on={()=>setEditProv(null)} style={{ flex:1 }}>Cancelar</Btn>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
