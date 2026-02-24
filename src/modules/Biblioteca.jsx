import React, { useState, useEffect, useCallback } from "react";
import { BookOpen, Plus, Trash2, Edit3, Check, X, Search, Download, Upload, Copy, ChevronRight, Database, Tag, Layers, FileText } from "lucide-react";

const Fonts = () => <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}body{font-family:'Outfit',sans-serif;background:#F5F4F1}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#C8C5BE;border-radius:2px}input,select,textarea,button{font-family:'Outfit',sans-serif;outline:none}button{cursor:pointer}@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}.fade-up{animation:fadeUp .22s ease both}`}</style>;

const T = { bg:"#F5F4F1",surface:"#FFFFFF",surfaceAlt:"#FAFAF8",ink:"#111",inkMid:"#555",inkLight:"#909090",inkXLight:"#C8C5BE",border:"#E4E1DB",accent:"#EDEBE7",green:"#1E6B42",greenBg:"#E8F4EE",red:"#AE2C2C",redBg:"#FAE8E8",amber:"#7A5218",amberBg:"#FAF0E0",blue:"#1E4F8C",blueBg:"#E6EFF9",teal:"#0D5E6E",tealBg:"#E0F4F4",shadow:"0 1px 3px rgba(0,0,0,.06),0 4px 16px rgba(0,0,0,.05)" };
const uid = () => Math.random().toString(36).slice(2, 9);
const fmt = (n) => n ? new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(n) : "—";

function useStore(key, init) {
  const [data, setData] = useState(init);
  useEffect(() => { (async () => { try { const r = await window.storage?.get?.(key); if (r?.value) setData(JSON.parse(r.value)); } catch {} })(); }, [key]);
  const save = useCallback(async (v) => { const val = typeof v === "function" ? v(data) : v; setData(val); try { await window.storage?.set?.(key, JSON.stringify(val)); } catch {} }, [key, data]);
  return [data, save];
}

const Card = ({ children, style }) => <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:8, boxShadow:T.shadow, ...style }}>{children}</div>;
const Btn = ({ children, v, sm, on, style, ...p }) => (
  <button onClick={on} style={{ display:"inline-flex", alignItems:"center", gap:5, padding:sm?"5px 10px":"8px 16px", fontSize:sm?10:11, fontWeight:600, border:v==="sec"?`1px solid ${T.border}`:"none", borderRadius:5, cursor:"pointer", background:v==="sec"?"#fff":T.ink, color:v==="sec"?T.inkMid:"#fff", ...style }} {...p}>{children}</button>
);

const TABS = [
  { id:"dashboard",  lbl:"Dashboard",        I:Database,   desc:"Resumen de la biblioteca" },
  { id:"apus",       lbl:"APUs",            I:Database,   desc:"Análisis de precios unitarios normalizados" },
  { id:"materiales", lbl:"Materiales",      I:Layers,     desc:"Catálogo maestro de materiales y precios" },
  { id:"textos",     lbl:"Textos tipo",     I:FileText,   desc:"Plantillas de alcance, exclusiones y cláusulas" },
  { id:"categorias", lbl:"Categorías",      I:Tag,        desc:"Organización por capítulos y familias" },
];

const DEMO_APUS = [
  { id:uid(), codigo:"APU-001", nombre:"Pañete liso sobre muro e=1.5cm", unidad:"m²", costo:28500, categoria:"Pañetes", insumos:[
    { nombre:"Mortero 1:4", unidad:"m³", cantidad:0.018, precio:380000 },
    { nombre:"Mano de obra oficial", unidad:"h", cantidad:0.45, precio:22000 },
    { nombre:"Mano de obra ayudante", unidad:"h", cantidad:0.35, precio:14000 },
    { nombre:"Herramienta menor", unidad:"gl", cantidad:0.03, precio:50000 },
  ]},
  { id:uid(), codigo:"APU-002", nombre:"Mampostería en bloque No.5 e=12cm", unidad:"m²", costo:62000, categoria:"Mampostería", insumos:[
    { nombre:"Bloque No.5 (12x20x40)", unidad:"ud", cantidad:12.5, precio:2200 },
    { nombre:"Mortero de pega 1:4", unidad:"m³", cantidad:0.015, precio:380000 },
    { nombre:"Mano de obra oficial", unidad:"h", cantidad:0.65, precio:22000 },
    { nombre:"Mano de obra ayudante", unidad:"h", cantidad:0.50, precio:14000 },
  ]},
  { id:uid(), codigo:"APU-003", nombre:"Estuco sobre muro", unidad:"m²", costo:18500, categoria:"Acabados", insumos:[
    { nombre:"Estuco plástico", unidad:"kg", cantidad:1.5, precio:3200 },
    { nombre:"Mano de obra oficial", unidad:"h", cantidad:0.35, precio:22000 },
    { nombre:"Lija y herramienta", unidad:"gl", cantidad:0.02, precio:30000 },
  ]},
  { id:uid(), codigo:"APU-004", nombre:"Pintura vinilo 2 manos tipo 1", unidad:"m²", costo:14200, categoria:"Acabados", insumos:[
    { nombre:"Pintura vinilo tipo 1", unidad:"gl", cantidad:0.065, precio:72000 },
    { nombre:"Rodillo y bandeja", unidad:"gl", cantidad:0.01, precio:25000 },
    { nombre:"Mano de obra pintor", unidad:"h", cantidad:0.30, precio:22000 },
  ]},
  { id:uid(), codigo:"APU-005", nombre:"Piso porcelanato 60x60", unidad:"m²", costo:95000, categoria:"Pisos", insumos:[
    { nombre:"Porcelanato 60x60", unidad:"m²", cantidad:1.05, precio:55000 },
    { nombre:"Pegante para porcelanato", unidad:"kg", cantidad:5, precio:2800 },
    { nombre:"Boquilla", unidad:"kg", cantidad:0.5, precio:8500 },
    { nombre:"Mano de obra enchapador", unidad:"h", cantidad:0.80, precio:25000 },
  ]},
];

const DEMO_TEXTOS = [
  { id:uid(), titulo:"Exclusiones estándar — Obra", categoria:"Exclusiones", texto:"Esta propuesta NO incluye, salvo acuerdo escrito:\n- Licencias y permisos de construcción\n- Obra de estructura o cimentación no contemplada\n- Suministro e instalación de electrodomésticos\n- Mudanzas y trasteos\n- Diseño o rediseño arquitectónico\n- Adecuaciones en zonas comunes\n- Amoblamiento libre" },
  { id:uid(), titulo:"Garantías estándar — Obra", categoria:"Garantías", texto:"Habitaris garantiza los trabajos ejecutados por un período de 12 meses:\n- Estabilidad y solidez: 10 años (Ley 1796)\n- Impermeabilización: 5 años\n- Acabados y revestimientos: 1 año\n- Instalaciones: 1 año\n- Carpintería: 1 año" },
  { id:uid(), titulo:"Condiciones de pago — Obra integral", categoria:"Pagos", texto:"Forma de pago:\n1. 50% Anticipo contra firma de contrato\n2. 30% Contra avance del 50% de obra\n3. 10% Contra finalización de obra\n4. 10% Retención de garantía (3 meses)" },
  { id:uid(), titulo:"Términos generales", categoria:"Términos", texto:"Los precios incluyen materiales, mano de obra, herramienta y administración.\nCualquier trabajo no contemplado se cotizará como adicional.\nEl cronograma podrá ajustarse por fuerza mayor o cambios del cliente." },
];

export default function HabitarisBiblioteca() {
  const [tab, setTab] = useState("dashboard");
  const [apus, saveApus] = useStore("hab:biblioteca:apus", []);
  const [textos, saveTextos] = useStore("hab:biblioteca:textos", []);
  const [categorias, saveCategorias] = useStore("hab:biblioteca:categorias", ["Pañetes","Mampostería","Acabados","Pisos","Instalaciones","Carpintería","Demoliciones","Impermeabilización"]);
  const [search, setSearch] = useState("");
  const [expandedApu, setExpandedApu] = useState(null);

  const inp = { border:`1px solid ${T.border}`, borderRadius:4, padding:"6px 10px", fontSize:12, background:"#fff" };

  return (
    <>
      <Fonts/>
      <div style={{ height:"100vh", display:"flex", flexDirection:"column", background:T.bg, overflow:"hidden" }}>
        <div style={{ background:T.surface, borderBottom:`1px solid ${T.border}`, padding:"11px 28px", display:"flex", alignItems:"center", gap:14 }}>
          <svg width={26} height={26} viewBox="0 0 34 34" fill="none"><rect x="2.5" y="4.5" width="25" height="25" stroke={T.ink} strokeWidth="1.2"/><rect x="7.5" y="10" width="4" height="13" fill={T.ink}/><rect x="7.5" y="15.5" width="13" height="3" fill={T.ink}/><rect x="16.5" y="10" width="4" height="13" fill={T.ink}/></svg>
          <span style={{ fontSize:13, fontWeight:800, letterSpacing:3.5, textTransform:"uppercase" }}>HABITARIS</span>
          <span style={{ fontSize:11, color:T.inkLight }}>/ Biblioteca</span>
        </div>

        <div style={{ display:"flex", flex:1, minHeight:0 }}>
          <div style={{ width:200, flexShrink:0, background:T.surface, borderRight:`1px solid ${T.border}`, paddingTop:8, overflowY:"auto" }}>
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
            <div style={{ marginBottom:18 }}>
              <h2 style={{ fontSize:19, fontWeight:700 }}>{TABS.find(t=>t.id===tab)?.lbl}</h2>
              <p style={{ fontSize:11, color:T.inkLight, marginTop:2 }}>{TABS.find(t=>t.id===tab)?.desc}</p>
            </div>

            {/* DASHBOARD */}
            {tab === "dashboard" && (
              <div className="fade-up">
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
                  {[
                    ["📐 APUs",apus.length,"#111"],
                    ["🧱 Materiales",materiales.length,"#1E4F8C"],
                    ["📝 Textos tipo",textos.length,"#5B3A8C"],
                    ["📂 Categorías",categorias.length,"#7A5218"]
                  ].map(([l,v,c])=>(
                    <div key={l} style={{background:"#fff",border:`1px solid ${T.border}`,borderRadius:8,padding:"14px 16px",boxShadow:T.shadow}}>
                      <div style={{fontSize:8,fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>{l}</div>
                      <div style={{fontSize:22,fontWeight:800,fontFamily:"'DM Mono',monospace",color:c}}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
                  {TABS.filter(t=>t.id!=="dashboard").map(t=>(
                    <div key={t.id} onClick={()=>setTab(t.id)}
                      style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:"18px 16px",cursor:"pointer",boxShadow:T.shadow}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                        <t.I size={16} color={T.ink}/>
                        <div style={{fontSize:13,fontWeight:700}}>{t.lbl}</div>
                      </div>
                      <div style={{fontSize:10,color:T.inkLight}}>{t.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* APUs TAB */}
            {tab === "apus" && (
              <div className="fade-up">
                <div style={{ display:"flex", gap:8, marginBottom:14 }}>
                  <div style={{ position:"relative", flex:1 }}>
                    <Search size={12} style={{ position:"absolute", left:8, top:9, color:T.inkLight }}/>
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar APU..."
                      style={{ ...inp, width:"100%", paddingLeft:26 }}/>
                  </div>
                  <Btn sm on={() => { const n = { id:uid(), codigo:`APU-${String(apus.length+1).padStart(3,"0")}`, nombre:"Nuevo APU", unidad:"m²", costo:0, categoria:"", insumos:[] }; saveApus(prev=>[...prev,n]); setExpandedApu(n.id); }}>
                    <Plus size={10}/> Nuevo APU
                  </Btn>
                  {apus.length === 0 && <Btn sm v="sec" on={() => saveApus(DEMO_APUS)}>📥 Cargar ejemplos</Btn>}
                </div>

                <Card style={{ padding:0, overflow:"hidden" }}>
                  {apus.filter(a => !search || a.nombre.toLowerCase().includes(search.toLowerCase()) || a.codigo.toLowerCase().includes(search.toLowerCase()))
                    .map(apu => (
                    <div key={apu.id} style={{ borderBottom:`1px solid ${T.border}` }}>
                      <div onClick={() => setExpandedApu(expandedApu===apu.id?null:apu.id)}
                        style={{ padding:"10px 16px", cursor:"pointer", display:"flex", alignItems:"center", gap:10,
                          background:expandedApu===apu.id?T.surfaceAlt:"transparent" }}>
                        <span style={{ fontFamily:"'DM Mono',monospace", fontSize:9, fontWeight:700, color:T.teal, background:T.tealBg,
                          padding:"2px 6px", borderRadius:3 }}>{apu.codigo}</span>
                        <span style={{ flex:1, fontSize:12, fontWeight:600 }}>{apu.nombre}</span>
                        <span style={{ fontSize:9, color:T.inkLight, background:T.surfaceAlt, padding:"2px 6px", borderRadius:3 }}>{apu.categoria||"—"}</span>
                        <span style={{ fontSize:10, color:T.inkMid }}>{apu.unidad}</span>
                        <span style={{ fontFamily:"'DM Mono',monospace", fontSize:11, fontWeight:700, color:T.green }}>${fmt(apu.costo)}</span>
                        {expandedApu===apu.id?<ChevronRight size={12} style={{transform:"rotate(90deg)"}}/>:<ChevronRight size={12}/>}
                      </div>
                      {expandedApu === apu.id && (
                        <div style={{ padding:"0 16px 14px", background:T.surfaceAlt }}>
                          <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr", gap:8, marginBottom:8 }}>
                            <div><label style={{ fontSize:8, fontWeight:700, color:T.inkLight, textTransform:"uppercase" }}>Nombre</label>
                              <input value={apu.nombre} onChange={e => saveApus(prev=>prev.map(a=>a.id===apu.id?{...a,nombre:e.target.value}:a))} style={{ ...inp, width:"100%" }}/></div>
                            <div><label style={{ fontSize:8, fontWeight:700, color:T.inkLight, textTransform:"uppercase" }}>Código</label>
                              <input value={apu.codigo} onChange={e => saveApus(prev=>prev.map(a=>a.id===apu.id?{...a,codigo:e.target.value}:a))} style={{ ...inp, width:"100%", fontFamily:"'DM Mono',monospace" }}/></div>
                            <div><label style={{ fontSize:8, fontWeight:700, color:T.inkLight, textTransform:"uppercase" }}>Unidad</label>
                              <select value={apu.unidad} onChange={e => saveApus(prev=>prev.map(a=>a.id===apu.id?{...a,unidad:e.target.value}:a))} style={{ ...inp, width:"100%" }}>
                                {["ud","m","m²","m³","ml","kg","gl","l","h","día"].map(u=><option key={u}>{u}</option>)}
                              </select></div>
                            <div><label style={{ fontSize:8, fontWeight:700, color:T.inkLight, textTransform:"uppercase" }}>Categoría</label>
                              <select value={apu.categoria||""} onChange={e => saveApus(prev=>prev.map(a=>a.id===apu.id?{...a,categoria:e.target.value}:a))} style={{ ...inp, width:"100%" }}>
                                <option value="">—</option>{categorias.map(c=><option key={c}>{c}</option>)}
                              </select></div>
                          </div>
                          <div style={{ fontSize:9, fontWeight:700, color:T.inkLight, textTransform:"uppercase", marginBottom:4, marginTop:8 }}>Composición</div>
                          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:10 }}>
                            <thead><tr style={{ background:T.accent }}>
                              {["Insumo","Und","Cantidad","P.Unit","Subtotal",""].map(h=><th key={h} style={{ padding:"4px 8px", textAlign:h==="Subtotal"||h==="P.Unit"||h==="Cantidad"?"right":"left", fontSize:8, fontWeight:700, color:T.inkLight }}>{h}</th>)}
                            </tr></thead>
                            <tbody>
                              {(apu.insumos||[]).map((ins, ii) => (
                                <tr key={ii} style={{ borderBottom:`1px solid ${T.border}` }}>
                                  <td style={{ padding:"4px 8px" }}><input value={ins.nombre} onChange={e => { const n=[...(apu.insumos||[])]; n[ii]={...n[ii],nombre:e.target.value}; saveApus(prev=>prev.map(a=>a.id===apu.id?{...a,insumos:n}:a)); }} style={{ border:"none", background:"transparent", width:"100%", fontSize:10 }}/></td>
                                  <td style={{ padding:"4px 8px", width:40 }}><input value={ins.unidad} onChange={e => { const n=[...(apu.insumos||[])]; n[ii]={...n[ii],unidad:e.target.value}; saveApus(prev=>prev.map(a=>a.id===apu.id?{...a,insumos:n}:a)); }} style={{ border:"none", background:"transparent", width:30, fontSize:10, textAlign:"center" }}/></td>
                                  <td style={{ padding:"4px 8px", textAlign:"right", fontFamily:"'DM Mono',monospace" }}><input type="number" value={ins.cantidad} onChange={e => { const n=[...(apu.insumos||[])]; n[ii]={...n[ii],cantidad:+e.target.value}; const cost=n.reduce((s,x)=>s+x.cantidad*x.precio,0); saveApus(prev=>prev.map(a=>a.id===apu.id?{...a,insumos:n,costo:Math.round(cost)}:a)); }} style={{ border:"none", background:"transparent", width:50, fontSize:10, textAlign:"right", fontFamily:"'DM Mono',monospace" }}/></td>
                                  <td style={{ padding:"4px 8px", textAlign:"right", fontFamily:"'DM Mono',monospace" }}><input type="number" value={ins.precio} onChange={e => { const n=[...(apu.insumos||[])]; n[ii]={...n[ii],precio:+e.target.value}; const cost=n.reduce((s,x)=>s+x.cantidad*x.precio,0); saveApus(prev=>prev.map(a=>a.id===apu.id?{...a,insumos:n,costo:Math.round(cost)}:a)); }} style={{ border:"none", background:"transparent", width:70, fontSize:10, textAlign:"right", fontFamily:"'DM Mono',monospace" }}/></td>
                                  <td style={{ padding:"4px 8px", textAlign:"right", fontFamily:"'DM Mono',monospace", fontWeight:600 }}>${fmt(Math.round(ins.cantidad * ins.precio))}</td>
                                  <td style={{ padding:"4px 8px", width:24 }}><button onClick={() => { const n=(apu.insumos||[]).filter((_,i)=>i!==ii); const cost=n.reduce((s,x)=>s+x.cantidad*x.precio,0); saveApus(prev=>prev.map(a=>a.id===apu.id?{...a,insumos:n,costo:Math.round(cost)}:a)); }} style={{ background:"none", border:"none", color:T.red, cursor:"pointer" }}><Trash2 size={10}/></button></td>
                                </tr>
                              ))}
                              <tr style={{ background:T.greenBg }}>
                                <td colSpan={4} style={{ padding:"6px 8px", fontWeight:700, fontSize:11 }}>COSTO DIRECTO</td>
                                <td style={{ padding:"6px 8px", textAlign:"right", fontFamily:"'DM Mono',monospace", fontWeight:700, fontSize:11, color:T.green }}>${fmt(apu.costo)}</td>
                                <td/>
                              </tr>
                            </tbody>
                          </table>
                          <div style={{ display:"flex", gap:6, marginTop:8 }}>
                            <Btn sm v="sec" on={() => { const n=[...(apu.insumos||[]),{nombre:"",unidad:"ud",cantidad:1,precio:0}]; saveApus(prev=>prev.map(a=>a.id===apu.id?{...a,insumos:n}:a)); }}><Plus size={9}/> Insumo</Btn>
                            <Btn sm v="sec" on={() => navigator.clipboard?.writeText(JSON.stringify(apu, null, 2))}><Copy size={9}/> Copiar JSON</Btn>
                            <div style={{ flex:1 }}/>
                            <button onClick={() => saveApus(prev=>prev.filter(a=>a.id!==apu.id))} style={{ background:"none", border:"none", color:T.red, fontSize:10, cursor:"pointer" }}>🗑️ Eliminar APU</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {apus.length === 0 && <div style={{ padding:30, textAlign:"center", color:T.inkLight }}>Sin APUs. Carga los ejemplos o crea uno nuevo.</div>}
                </Card>
              </div>
            )}

            {/* MATERIALES TAB */}
            {tab === "materiales" && (
              <div className="fade-up">
                <Card style={{ padding:18 }}>
                  <div style={{ fontSize:13, fontWeight:700, marginBottom:4 }}>Catálogo maestro de materiales</div>
                  <div style={{ fontSize:11, color:T.inkLight, marginBottom:14 }}>Los materiales del catálogo se sincronizan con el módulo de Insumos del CRM.</div>
                  <div style={{ padding:20, textAlign:"center", background:T.surfaceAlt, borderRadius:6, border:`1px solid ${T.border}` }}>
                    <Database size={24} style={{ color:T.inkLight, opacity:0.3, marginBottom:8 }}/>
                    <div style={{ fontSize:12, fontWeight:600, color:T.inkMid }}>El catálogo maestro se gestiona desde el tab de Insumos en cada oferta del CRM</div>
                    <div style={{ fontSize:10, color:T.inkLight, marginTop:4 }}>Los precios de proveedores se centralizan allí con cotizaciones comparativas</div>
                  </div>
                </Card>
              </div>
            )}

            {/* TEXTOS TAB */}
            {tab === "textos" && (
              <div className="fade-up">
                <div style={{ display:"flex", gap:8, marginBottom:14 }}>
                  <div style={{ flex:1 }}/>
                  <Btn sm on={() => saveTextos(prev=>[...prev,{id:uid(),titulo:"Nuevo texto",categoria:"",texto:""}])}><Plus size={10}/> Nuevo texto</Btn>
                  {textos.length === 0 && <Btn sm v="sec" on={() => saveTextos(DEMO_TEXTOS)}>📥 Cargar ejemplos</Btn>}
                </div>
                {textos.map(t => (
                  <Card key={t.id} style={{ padding:16, marginBottom:10 }}>
                    <div style={{ display:"flex", gap:8, marginBottom:6, alignItems:"center" }}>
                      <input value={t.titulo} onChange={e => saveTextos(prev=>prev.map(x=>x.id===t.id?{...x,titulo:e.target.value}:x))}
                        style={{ flex:1, border:"none", background:"transparent", fontSize:14, fontWeight:700 }}/>
                      <select value={t.categoria||""} onChange={e => saveTextos(prev=>prev.map(x=>x.id===t.id?{...x,categoria:e.target.value}:x))}
                        style={{ ...inp, width:120, fontSize:10 }}>
                        <option value="">Sin categoría</option>
                        {["Alcance","Exclusiones","Garantías","Pagos","Términos","Legal","Otro"].map(c=><option key={c}>{c}</option>)}
                      </select>
                      <Btn sm v="sec" on={() => navigator.clipboard?.writeText(t.texto)}><Copy size={9}/> Copiar</Btn>
                      <button onClick={() => saveTextos(prev=>prev.filter(x=>x.id!==t.id))} style={{ background:"none", border:"none", color:T.red, cursor:"pointer" }}><Trash2 size={12}/></button>
                    </div>
                    <textarea value={t.texto} onChange={e => saveTextos(prev=>prev.map(x=>x.id===t.id?{...x,texto:e.target.value}:x))}
                      rows={5} style={{ width:"100%", border:`1px solid ${T.border}`, borderRadius:4, padding:"8px 10px", fontSize:11, resize:"vertical", lineHeight:1.6, background:T.surfaceAlt }}/>
                  </Card>
                ))}
                {textos.length === 0 && <Card style={{ padding:30, textAlign:"center" }}><div style={{ color:T.inkLight }}>Sin textos tipo. Carga los ejemplos o crea uno nuevo.</div></Card>}
              </div>
            )}

            {/* CATEGORIAS TAB */}
            {tab === "categorias" && (
              <div className="fade-up">
                <Card style={{ padding:18 }}>
                  <div style={{ fontSize:14, fontWeight:700, marginBottom:14 }}>Categorías de APUs</div>
                  {categorias.map((c, i) => (
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 0", borderBottom:`1px solid ${T.border}` }}>
                      <Tag size={12} color={T.teal}/>
                      <input value={c} onChange={e => { const n=[...categorias]; n[i]=e.target.value; saveCategorias(n); }}
                        style={{ flex:1, border:"none", background:"transparent", fontSize:12, fontWeight:500 }}/>
                      <span style={{ fontSize:9, color:T.inkLight }}>{apus.filter(a=>a.categoria===c).length} APUs</span>
                      <button onClick={() => saveCategorias(prev=>prev.filter((_,j)=>j!==i))}
                        style={{ background:"none", border:"none", color:T.red, cursor:"pointer" }}><Trash2 size={11}/></button>
                    </div>
                  ))}
                  <Btn sm v="sec" on={() => saveCategorias(prev=>[...prev,"Nueva categoría"])} style={{ marginTop:10 }}><Plus size={10}/> Añadir categoría</Btn>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
