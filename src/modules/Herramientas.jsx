import { useState, useMemo, useCallback } from "react";
import { store } from "../core/store.js";

import { Zap, Hammer, Building2, Package, ArrowLeftRight, Plus, Trash2, Download, AlertTriangle, CheckCircle, Info, Sun, ChevronRight, ChevronDown, TrendingUp } from "lucide-react";

/* ─── TOKENS ─────────────────────────────────────────────────────────── */
const T = {
  bg:"#F5F4F1", surface:"#FFFFFF", ink:"#111111", inkMid:"#555555",
  inkLight:"#909090", inkXLight:"#C0BDB8", border:"#E0E0E0",
  accent:"#EDEBE7", shadow:"0 1px 3px rgba(0,0,0,.06)",
  shadowMd:"0 4px 20px rgba(0,0,0,.09)",
  green:"#111111", greenBg:"#E8F4EE",
  red:"#B91C1C",   redBg:"#FAE8E8",
  amber:"#8C6A00", amberBg:"#FAF0E0",
  blue:"#3B3B3B",  blueBg:"#F0F0F0",
  orange:"#7C3A1E",orangeBg:"#FDF0E8",
};

const Fonts = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=DM Sans:wght@300;400;500;600;700;800;900&family=DM+Mono:wght@400;500&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:'DM Sans',sans-serif;background:${T.bg};}
    .mono{font-family:'DM Mono',monospace;}
    @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
    .fade-up{animation:fadeUp .18s ease both}
    input,button,select{font-family:'DM Sans',sans-serif;}
    input:focus,select:focus{outline:none;border-color:${T.ink}!important;}
    ::-webkit-scrollbar{width:4px;height:4px;}
    ::-webkit-scrollbar-thumb{background:${T.border};border-radius:2px;}
    table{border-collapse:collapse;}
  `}</style>
);

/* ─── STORAGE ────────────────────────────────────────────────────────── */
function useStore(key, init) {
  const [v,sv] = useState(init);
  useEffect(()=>{store.get(key).then(r=>{if(r)try{sv(JSON.parse(r));}catch{}}).catch(()=>{});},[key]);
  const set = cb=>{const nx=typeof cb==="function"?cb(v):cb;sv(nx);try{store.set(key,JSON.stringify(nx));}catch{}};
  return [v,set];
}

/* ─── NORMATIVAS ─────────────────────────────────────────────────────── */
const NORMA = {
  CO: {
    label:"Colombia",flag:"🇨🇴",ref:"NTC 2050 / RETIE",
    mono_V:120, tri_VLN:120, tri_VLL:208,
    FS:1.25,
    curvas:["C","D"],
    dV_max_rama:3,   // % caída máxima por circuito
    dV_max_total:5,  // % caída máxima acumulada
    breakers:[6,10,15,20,25,30,40,50,60,70,80,90,100,110,125,150,175,200],
  },
  ES: {
    label:"España",flag:"🇪🇸",ref:"REBT ITC-BT-19",
    mono_V:230, tri_VLN:230, tri_VLL:400,
    FS:1.25,
    curvas:["B","C","D"],
    dV_max_rama:3,
    dV_max_total:5,
    breakers:[6,10,13,16,20,25,32,40,50,63,80,100,125,160,200,250],
  },
};

// Secciones normalizadas mm²
const SECCIONES = [1.5,2.5,4,6,10,16,25,35,50,70,95,120];
// Resistividad Ω·mm²/m a 20°C
const RHO = { Cobre:0.01786, Aluminio:0.02857 };
// Capacidad de corriente por sección (Cu en tubo empotrado, aprox NTC/REBT)
const I_MAX_CU = {1.5:15,2.5:21,4:27,6:34,10:46,16:61,25:80,35:99,50:119,70:151,95:182,120:210};
const I_MAX_AL = {1.5:null,2.5:null,4:20,6:26,10:35,16:46,25:60,35:75,50:90,70:115,95:138,120:160};

function nextBreaker(I, pais) {
  const bs = NORMA[pais].breakers;
  return bs.find(b => b >= I) || bs[bs.length-1];
}

function sectionForCurrent(I, material) {
  const table = material==="Cobre" ? I_MAX_CU : I_MAX_AL;
  for(const s of SECCIONES) {
    if(table[s] && table[s] >= I) return s;
  }
  return 120;
}

function calcVdrop(L, I, seccion, material, red, pais) {
  const rho = RHO[material];
  const N   = NORMA[pais];
  const V   = red==="Monofásica" ? N.mono_V : N.tri_VLL;
  const k   = red==="Monofásica" ? 2 : Math.sqrt(3);
  return (k * L * I * rho / seccion) / V * 100;
}

function calcIcc(L, seccion, material, red, pais, Icc_barra_kA) {
  const rho  = RHO[material];
  const N    = NORMA[pais];
  const Vsrc = red==="Monofásica" ? N.mono_V : N.tri_VLL;
  const k    = red==="Monofásica" ? 2 : Math.sqrt(3);
  const Zs   = Vsrc / (Icc_barra_kA * 1000);
  const Zl   = k * L * rho / seccion;
  return (Vsrc / (Zs + Zl)) / 1000;
}

/* ─── ATOMS ──────────────────────────────────────────────────────────── */
const fmt = n => isNaN(n)||n==null?"—":Number(n).toLocaleString("es-CO",{maximumFractionDigits:2});
const fmtM = n => isNaN(n)||n==null?"—":"$ "+Number(n).toLocaleString("es-CO",{minimumFractionDigits:0,maximumFractionDigits:0});

const Inp = ({label,value,onChange,unit,type="number",placeholder="",step,min}) => (
  <div style={{marginBottom:10}}>
    {label&&<div style={{fontSize:9,color:T.inkLight,letterSpacing:1,textTransform:"uppercase",fontWeight:700,marginBottom:4}}>
      {label}{unit&&<span style={{color:T.inkXLight,marginLeft:4}}>({unit})</span>}
    </div>}
    <input type={type} value={value} onChange={e=>onChange(e.target.value)}
      placeholder={placeholder} step={step} min={min}
      style={{width:"100%",padding:"8px 10px",border:`1.5px solid ${T.border}`,borderRadius:4,fontSize:12,background:T.surface,color:T.ink}}/>
  </div>
);

const Sel = ({label,value,onChange,options,small=false}) => (
  <div style={{marginBottom:small?0:10}}>
    {label&&<div style={{fontSize:9,color:T.inkLight,letterSpacing:1,textTransform:"uppercase",fontWeight:700,marginBottom:4}}>{label}</div>}
    <select value={value} onChange={e=>onChange(e.target.value)}
      style={{width:"100%",padding:small?"6px 8px":"8px 10px",border:`1.5px solid ${T.border}`,borderRadius:4,fontSize:12,background:T.surface,color:T.ink}}>
      {options.map(o=><option key={o.v||o} value={o.v||o}>{o.l||o}</option>)}
    </select>
  </div>
);

const Chip = ({ok,warn,text}) => (
  <div style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 8px",borderRadius:3,
    background:warn?T.amberBg:ok?T.greenBg:T.redBg,
    border:`1px solid ${warn?T.amber:ok?T.green:T.red}33`}}>
    {warn?<AlertTriangle size={9} color={T.amber}/>:ok?<CheckCircle size={9} color={T.green}/>:<AlertTriangle size={9} color={T.red}/>}
    <span style={{fontSize:9,fontWeight:700,color:warn?T.amber:ok?T.green:T.red}}>{text}</span>
  </div>
);

const Norma = ({pais}) => (
  <div style={{display:"inline-flex",alignItems:"center",gap:5,padding:"3px 10px",
    borderRadius:12,background:T.accent,border:`1px solid ${T.border}`,fontSize:10,color:T.inkMid}}>
    <span>{NORMA[pais].flag}</span>
    <span style={{fontWeight:700}}>{pais==="CO"?"NTC 2050 · RETIE":"REBT · ITC-BT"}</span>
  </div>
);

/* ─── TABS ───────────────────────────────────────────────────────────── */
const TABS = [
  {id:"dashboard",    label:"Dashboard",        I:TrendingUp,    desc:"Vista general de herramientas"},
  {id:"cuadro",       label:"Cuadro de Cargas", I:Zap,           desc:"Tabla completa circuito a circuito"},
  {id:"circuito",     label:"Circuito Rápido",  I:Zap,           desc:"Cálculo unitario de un circuito"},
  {id:"iluminacion",  label:"Iluminación",       I:Sun,           desc:"Diseño luminotécnico — RETILAP / CTE DB-HE3"},
  {id:"concreto",     label:"Concreto",          I:Hammer,        desc:"Volúmenes y mezclas ACI 211"},
  {id:"cubicacion",   label:"Cubicación",        I:Building2,     desc:"Áreas, volúmenes y perímetros"},
  {id:"materiales",   label:"Materiales",        I:Package,       desc:"Presupuesto rápido de obra"},
  {id:"unidades",     label:"Unidades",          I:ArrowLeftRight,desc:"Conversión entre sistemas"},
];

/* ═══════════════════════════════════════════════════════════════════════
   1. CUADRO DE CARGAS COMPLETO
═══════════════════════════════════════════════════════════════════════ */
const DEF_CIRCUITO = () => ({
  id:Date.now()+Math.random(),
  desc:"", tipo:"General", cant:1, wUnit:"", fp:0.9, simult:1.0,
  material:"Cobre", longitud:"", seccionManual:"", curva:"C", fase:"L1",
});

function CuadroDeCargas({pais}) {
  const N = NORMA[pais];
  const [red,   setRed]   = useStore("hab:herr:cuadro:red",   "Monofásica");
  const [Iccb,  setIccb]  = useStore("hab:herr:cuadro:iccb",  "6");
  const [filas, setFilas] = useStore("hab:herr:cuadro:filas", [DEF_CIRCUITO()]);
  const [nombre,setNombre]= useStore("hab:herr:cuadro:nombre","Tablero General");

  const V_ref = red==="Monofásica" ? N.mono_V : N.tri_VLL;
  const VLN   = red==="Monofásica" ? N.mono_V : N.tri_VLN;

  const upd = (id, k, v) => setFilas(prev => prev.map(f => f.id===id ? {...f,[k]:v} : f));
  const addRow = () => setFilas(prev => [...prev, DEF_CIRCUITO()]);
  const delRow = id => setFilas(prev => prev.filter(f => f.id!==id));

  // Computed values per row
  const computed = useMemo(() => filas.map(f => {
    const cant = Number(f.cant)||0;
    const wU   = Number(f.wUnit)||0;
    const fp   = Number(f.fp)||1;
    const sim  = Number(f.simult)||1;
    const L    = Number(f.longitud)||0;

    const totalW  = cant * wU * sim;
    const totalVA = fp > 0 ? totalW / fp : totalW;
    const I       = V_ref > 0 && totalVA > 0 ? totalVA / VLN : 0;
    const Id      = I * N.FS;
    const breaker = Id > 0 ? nextBreaker(Id, pais) : null;

    // Section: manual override or auto
    const secAuto = Id > 0 ? sectionForCurrent(Id, f.material) : null;
    const seccion = Number(f.seccionManual) || secAuto || 0;

    const dV      = L > 0 && I > 0 && seccion > 0 ? calcVdrop(L, I, seccion, f.material, red, pais) : null;
    const iccFin  = L > 0 && seccion > 0 && Number(Iccb) > 0
      ? calcIcc(L, seccion, f.material, red, pais, Number(Iccb)) : null;

    const iMaxCond = f.material==="Cobre" ? I_MAX_CU[seccion] : I_MAX_AL[seccion];
    const dVok    = dV !== null ? dV <= N.dV_max_rama : null;
    const iccOk   = iccFin !== null ? iccFin > 0.001 : null; // mínimo para disparar

    return { totalW, totalVA, I, Id, breaker, seccion, secAuto, dV, iccFin, dVok, iccOk, iMaxCond };
  }), [filas, red, pais, Iccb, V_ref, VLN, N]);

  const totW  = computed.reduce((s,c)=>s+c.totalW,0);
  const totVA = computed.reduce((s,c)=>s+c.totalVA,0);
  const Itotal = V_ref > 0 ? totVA / VLN : 0;
  const breakerPrincipal = nextBreaker(Itotal * N.FS, pais);

  const TIPOS = ["General","Iluminación","Tomacorriente","Motor","Aire Acondicionado","Calefacción","Bomba","UPS","Carga EV","Otro"];
  const FASES = red==="Monofásica" ? ["L1"] : ["L1","L2","L3"];

  const thStyle = {padding:"7px 8px",fontSize:8,letterSpacing:.8,textTransform:"uppercase",color:T.inkLight,fontWeight:700,textAlign:"left",background:T.bg,borderBottom:`2px solid ${T.border}`,whiteSpace:"nowrap"};
  const tdStyle = {padding:"5px 6px",fontSize:11,borderBottom:`1px solid ${T.border}`,verticalAlign:"middle"};

  return (
    <div className="fade-up">
      {/* Header config */}
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:10,marginBottom:12,background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:"14px 16px"}}>
        <Inp label="Nombre del tablero" value={nombre} onChange={setNombre} type="text"/>
        <Sel label="Tipo de red" value={red} onChange={setRed}
          options={[{v:"Monofásica",l:"Monofásica"},{v:"Trifásica",l:"Trifásica"}]}/>
        <Inp label="Icc barra (kA)" value={Iccb} onChange={setIccb} step="0.5" min="1"/>
        <div>
          <div style={{fontSize:9,color:T.inkLight,letterSpacing:1,textTransform:"uppercase",fontWeight:700,marginBottom:4}}>Normativa</div>
          <div style={{padding:"8px 0"}}><Norma pais={pais}/></div>
        </div>
      </div>

      {/* Info bar */}
      <div style={{display:"flex",gap:10,marginBottom:10,flexWrap:"wrap",alignItems:"center"}}>
        <div style={{fontSize:11,color:T.inkMid}}>
          <span style={{fontWeight:700,color:T.ink}} className="mono">{fmt(totW)} W</span> totales ·
          <span style={{fontWeight:700,color:T.blue,marginLeft:6}} className="mono">{fmt(totVA)} VA</span> ·
          <span style={{fontWeight:700,color:T.red,marginLeft:6}} className="mono">I={fmt(Itotal)} A</span> ·
          <span style={{fontWeight:700,color:T.amber,marginLeft:6}}>Breaker principal: {breakerPrincipal} A</span>
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:6}}>
          <button onClick={addRow} style={{display:"flex",alignItems:"center",gap:5,padding:"7px 12px",background:T.ink,color:"#fff",border:"none",borderRadius:4,cursor:"pointer",fontSize:11,fontWeight:600,fontFamily:"'DM Sans',sans-serif"}}>
            <Plus size={12}/>Circuito
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{overflowX:"auto",background:T.surface,border:`1px solid ${T.border}`,borderRadius:8}}>
        <table style={{width:"100%",minWidth:1200}}>
          <thead>
            <tr>
              <th style={thStyle}>#</th>
              <th style={{...thStyle,minWidth:130}}>Descripción</th>
              <th style={thStyle}>Tipo</th>
              <th style={{...thStyle,width:50}}>Cant</th>
              <th style={{...thStyle,width:70}}>W unit</th>
              <th style={{...thStyle,width:50}}>FP</th>
              <th style={{...thStyle,width:60}}>Simult.</th>
              <th style={thStyle}>Total W</th>
              <th style={thStyle}>Total VA</th>
              <th style={thStyle}>I (A)</th>
              <th style={thStyle}>I·FS (A)</th>
              <th style={thStyle}>Breaker</th>
              <th style={thStyle}>Curva</th>
              <th style={thStyle}>Material</th>
              <th style={{...thStyle,width:60}}>Long (m)</th>
              <th style={thStyle}>Secc mm²</th>
              <th style={thStyle}>ΔV %</th>
              <th style={thStyle}>Icc fin</th>
              {red==="Trifásica"&&<th style={thStyle}>Fase</th>}
              <th style={thStyle}></th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f,i) => {
              const c = computed[i];
              return (
                <tr key={f.id} style={{background:i%2===0?T.surface:T.bg+"80"}}>
                  <td style={{...tdStyle,color:T.inkLight,fontWeight:700}}>{i+1}</td>
                  <td style={tdStyle}>
                    <input value={f.desc} onChange={e=>upd(f.id,"desc",e.target.value)}
                      placeholder="Ej: Iluminación sala"
                      style={{width:"100%",padding:"4px 6px",border:`1px solid ${T.border}`,borderRadius:3,fontSize:11,background:"transparent"}}/>
                  </td>
                  <td style={tdStyle}>
                    <select value={f.tipo} onChange={e=>upd(f.id,"tipo",e.target.value)}
                      style={{width:"100%",padding:"4px 6px",border:`1px solid ${T.border}`,borderRadius:3,fontSize:10,background:"transparent"}}>
                      {TIPOS.map(t=><option key={t}>{t}</option>)}
                    </select>
                  </td>
                  <td style={tdStyle}>
                    <input type="number" value={f.cant} onChange={e=>upd(f.id,"cant",e.target.value)} min="1"
                      style={{width:"100%",padding:"4px 6px",border:`1px solid ${T.border}`,borderRadius:3,fontSize:11,background:"transparent"}}/>
                  </td>
                  <td style={tdStyle}>
                    <input type="number" value={f.wUnit} onChange={e=>upd(f.id,"wUnit",e.target.value)} placeholder="0"
                      style={{width:"100%",padding:"4px 6px",border:`1px solid ${T.border}`,borderRadius:3,fontSize:11,background:"transparent"}}/>
                  </td>
                  <td style={tdStyle}>
                    <input type="number" value={f.fp} onChange={e=>upd(f.id,"fp",e.target.value)} step="0.01" min="0.1" max="1"
                      style={{width:"100%",padding:"4px 6px",border:`1px solid ${T.border}`,borderRadius:3,fontSize:11,background:"transparent"}}/>
                  </td>
                  <td style={tdStyle}>
                    <input type="number" value={f.simult} onChange={e=>upd(f.id,"simult",e.target.value)} step="0.1" min="0.1" max="1"
                      style={{width:"100%",padding:"4px 6px",border:`1px solid ${T.border}`,borderRadius:3,fontSize:11,background:"transparent"}}/>
                  </td>
                  {/* Calculated */}
                  <td style={{...tdStyle,fontWeight:c.totalW>0?600:400}} className="mono">{c.totalW>0?fmt(c.totalW):"—"}</td>
                  <td style={{...tdStyle}} className="mono">{c.totalVA>0?fmt(c.totalVA):"—"}</td>
                  <td style={{...tdStyle,color:T.blue,fontWeight:600}} className="mono">{c.I>0?fmt(c.I):"—"}</td>
                  <td style={{...tdStyle}} className="mono">{c.Id>0?fmt(c.Id):"—"}</td>
                  <td style={{...tdStyle}}>
                    {c.breaker
                      ? <span style={{background:T.ink,color:"#fff",borderRadius:3,padding:"2px 7px",fontSize:10,fontWeight:700,fontFamily:"'DM Mono',monospace"}}>{c.breaker}A</span>
                      : "—"}
                  </td>
                  <td style={tdStyle}>
                    <select value={f.curva} onChange={e=>upd(f.id,"curva",e.target.value)}
                      style={{padding:"3px 6px",border:`1px solid ${T.border}`,borderRadius:3,fontSize:11,background:"transparent"}}>
                      {N.curvas.map(c=><option key={c}>{c}</option>)}
                    </select>
                  </td>
                  <td style={tdStyle}>
                    <select value={f.material} onChange={e=>upd(f.id,"material",e.target.value)}
                      style={{padding:"3px 6px",border:`1px solid ${T.border}`,borderRadius:3,fontSize:11,background:"transparent",minWidth:70}}>
                      <option>Cobre</option><option>Aluminio</option>
                    </select>
                  </td>
                  <td style={tdStyle}>
                    <input type="number" value={f.longitud} onChange={e=>upd(f.id,"longitud",e.target.value)} placeholder="0"
                      style={{width:"100%",padding:"4px 6px",border:`1px solid ${T.border}`,borderRadius:3,fontSize:11,background:"transparent"}}/>
                  </td>
                  <td style={tdStyle}>
                    <select value={f.seccionManual||c.secAuto||""} onChange={e=>upd(f.id,"seccionManual",e.target.value)}
                      style={{padding:"3px 6px",border:`1px solid ${T.border}`,borderRadius:3,fontSize:11,background:f.seccionManual?"transparent":T.greenBg,minWidth:55}}>
                      <option value="">Auto</option>
                      {SECCIONES.map(s=><option key={s} value={s}>{s}</option>)}
                    </select>
                    {c.seccion>0&&<div style={{fontSize:8,color:T.green,marginTop:1}} className="mono">{c.seccion}mm²</div>}
                  </td>
                  <td style={tdStyle}>
                    {c.dV !== null
                      ? <><span className="mono" style={{fontSize:11,fontWeight:700,color:c.dVok?T.green:T.red}}>{fmt(c.dV)}%</span>
                          <div style={{marginTop:2}}><Chip ok={c.dVok} text={c.dVok?`≤${N.dV_max_rama}% ✓`:`>${N.dV_max_rama}% ✗`}/></div>
                        </>
                      : <span style={{color:T.inkXLight}}>—</span>}
                  </td>
                  <td style={tdStyle}>
                    {c.iccFin !== null
                      ? <span className="mono" style={{fontSize:11,color:T.inkMid}}>{c.iccFin.toFixed(2)} kA</span>
                      : <span style={{color:T.inkXLight}}>—</span>}
                  </td>
                  {red==="Trifásica"&&(
                    <td style={tdStyle}>
                      <select value={f.fase} onChange={e=>upd(f.id,"fase",e.target.value)}
                        style={{padding:"3px 6px",border:`1px solid ${T.border}`,borderRadius:3,fontSize:11,background:"transparent"}}>
                        {FASES.map(f=><option key={f}>{f}</option>)}
                      </select>
                    </td>
                  )}
                  <td style={tdStyle}>
                    <button onClick={()=>delRow(f.id)} style={{background:"none",border:"none",cursor:"pointer",color:T.red,fontSize:16,lineHeight:1,padding:2}}>×</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          {/* Totales */}
          <tfoot>
            <tr style={{background:T.ink}}>
              <td colSpan={7} style={{padding:"10px 12px",fontSize:10,fontWeight:700,color:"rgba(255,255,255,.5)",textTransform:"uppercase",letterSpacing:1}}>
                TOTALES · {filas.length} circuitos · FS={N.FS} · {V_ref}V
              </td>
              <td style={{padding:"10px 8px"}} className="mono"><span style={{fontSize:13,fontWeight:800,color:"#fff"}}>{fmt(totW)} W</span></td>
              <td style={{padding:"10px 8px"}} className="mono"><span style={{fontSize:13,fontWeight:800,color:"#adf"}}>{fmt(totVA)} VA</span></td>
              <td style={{padding:"10px 8px"}} className="mono"><span style={{fontSize:13,fontWeight:800,color:"#faa"}}>{fmt(Itotal)} A</span></td>
              <td style={{padding:"10px 8px"}} className="mono"><span style={{fontSize:11,color:"rgba(255,255,255,.5)"}}>{fmt(Itotal*N.FS)} A</span></td>
              <td style={{padding:"10px 8px"}}>
                <span style={{background:"#fff",color:T.ink,borderRadius:3,padding:"3px 8px",fontSize:12,fontWeight:800,fontFamily:"'DM Mono',monospace"}}>{breakerPrincipal}A</span>
              </td>
              <td colSpan={red==="Trifásica"?7:6}/>
              <td/>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Legend */}
      <div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap"}}>
        <div style={{fontSize:9,color:T.inkLight}}>
          <span style={{background:T.greenBg,padding:"1px 5px",borderRadius:2,fontSize:8}}>Auto</span> Sección calculada automáticamente por corriente
        </div>
        <div style={{fontSize:9,color:T.inkLight}}>· ΔV max permitido: <strong>{N.dV_max_rama}%</strong> por circuito ({N.ref})</div>
        <div style={{fontSize:9,color:T.inkLight}}>· Resistividad Cu: 0.01786 Ω·mm²/m · Al: 0.02857 Ω·mm²/m · T=20°C</div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   2. CIRCUITO RÁPIDO (unitario)
═══════════════════════════════════════════════════════════════════════ */
function CircuitoRapido({pais}) {
  const N = NORMA[pais];
  const [red,     setRed]     = useState("Monofásica");
  const [potencia,setPot]     = useState("");
  const [fp,      setFp]      = useState("0.9");
  const [simult,  setSim]     = useState("1.0");
  const [longitud,setLong]    = useState("");
  const [material,setMat]     = useState("Cobre");
  const [Iccb,    setIccb]    = useState("6");
  const [secMan,  setSecMan]  = useState("");

  const V   = red==="Monofásica" ? N.mono_V : N.tri_VLN;
  const VLL = red==="Monofásica" ? N.mono_V : N.tri_VLL;
  const W   = Number(potencia)*Number(simult)||0;
  const VA  = fp>0 ? W/Number(fp) : W;
  const I   = V>0&&VA>0 ? VA/V : 0;
  const Id  = I*N.FS;
  const breaker = Id>0 ? nextBreaker(Id,pais) : null;
  const secAuto = Id>0 ? sectionForCurrent(Id,material) : null;
  const sec = Number(secMan)||secAuto||0;
  const dV  = Number(longitud)>0&&I>0&&sec>0 ? calcVdrop(Number(longitud),I,sec,material,red,pais) : null;
  const icc = Number(longitud)>0&&sec>0&&Number(Iccb)>0 ? calcIcc(Number(longitud),sec,material,red,pais,Number(Iccb)) : null;
  const dVok = dV!==null ? dV<=N.dV_max_rama : null;

  const Res = ({label,val,unit,hi,warn}) => (
    <div style={{background:hi?T.ink:warn?T.amberBg:T.bg,border:`1px solid ${hi?T.ink:warn?T.amber+"44":T.border}`,borderRadius:6,padding:"12px 14px"}}>
      <div style={{fontSize:9,color:hi?"rgba(255,255,255,.4)":T.inkLight,letterSpacing:1,textTransform:"uppercase",fontWeight:600,marginBottom:4}}>{label}</div>
      <div className="mono" style={{fontSize:18,fontWeight:800,color:hi?"#fff":warn?T.amber:T.ink}}>{val||"—"}</div>
      {unit&&<div style={{fontSize:9,color:hi?"rgba(255,255,255,.4)":T.inkLight,marginTop:2}}>{unit}</div>}
    </div>
  );

  return (
    <div className="fade-up" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,maxWidth:800}}>
      {/* Inputs */}
      <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:"20px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div style={{fontSize:10,letterSpacing:1,textTransform:"uppercase",color:T.inkLight,fontWeight:700}}>Datos del circuito</div>
          <Norma pais={pais}/>
        </div>
        <Sel label="Tipo de red" value={red} onChange={setRed} options={[{v:"Monofásica",l:`Monofásica (${N.mono_V}V)`},{v:"Trifásica",l:`Trifásica (${N.tri_VLL||"—"}V)`}]}/>
        <Inp label="Potencia total instalada" value={potencia} onChange={setPot} unit="W"/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <Inp label="Factor de potencia" value={fp} onChange={setFp} step="0.01" min="0.5" max="1"/>
          <Inp label="Factor simultaneidad" value={simult} onChange={setSim} step="0.1" min="0.1" max="1"/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <Inp label="Longitud circuito" value={longitud} onChange={setLong} unit="m"/>
          <Inp label="Icc en barra (kA)" value={Iccb} onChange={setIccb} step="0.5"/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <Sel label="Material conductor" value={material} onChange={setMat} options={["Cobre","Aluminio"]}/>
          <Sel label="Sección (vacío=auto)" value={secMan} onChange={setSecMan}
            options={[{v:"",l:"Auto"}, ...SECCIONES.map(s=>({v:s,l:`${s} mm²`}))]}/>
        </div>
      </div>

      {/* Results */}
      <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:"20px"}}>
        <div style={{fontSize:10,letterSpacing:1,textTransform:"uppercase",color:T.inkLight,fontWeight:700,marginBottom:14}}>Resultados</div>
        {I>0 ? (
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <Res label={`Potencia activa (×${Number(simult)})`} val={`${fmt(W)} W`}/>
              <Res label="Potencia aparente" val={`${fmt(VA)} VA`}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <Res label={`Corriente nominal (${V}V)`} val={`${fmt(I)} A`}/>
              <Res label={`Corriente diseño (×${N.FS})`} val={`${fmt(Id)} A`}/>
            </div>
            <Res label="Breaker recomendado" val={`${breaker} A · Curva ${N.curvas[0]}`} hi/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <Res label={`Sección ${secMan?"manual":"auto (${material})"}`} val={`${sec} mm²`} warn={secMan&&Number(secMan)<(secAuto||0)}/>
              {dV!==null&&<div style={{background:dVok?T.greenBg:T.redBg,border:`1px solid ${dVok?T.green:T.red}33`,borderRadius:6,padding:"12px 14px"}}>
                <div style={{fontSize:9,color:dVok?T.green:T.red,letterSpacing:1,textTransform:"uppercase",fontWeight:700,marginBottom:4}}>Caída de tensión</div>
                <div className="mono" style={{fontSize:18,fontWeight:800,color:dVok?T.green:T.red}}>{fmt(dV)}%</div>
                <div style={{fontSize:9,color:dVok?T.green:T.red,marginTop:2}}>{dVok?`✓ ≤ ${N.dV_max_rama}% (${N.ref})`:`✗ Supera ${N.dV_max_rama}% máx`}</div>
              </div>}
            </div>
            {icc!==null&&<Res label="Corriente cortocircuito fin de línea" val={`${icc.toFixed(3)} kA`}/>}
            <div style={{background:T.accent,borderRadius:4,padding:"8px 10px",fontSize:10,color:T.inkMid,lineHeight:1.7,marginTop:4}}>
              <strong>Normativa {N.flag} {pais}:</strong> {N.ref} · FS={N.FS} · ΔV_max={N.dV_max_rama}% por rama / {N.dV_max_total}% total
            </div>
          </div>
        ) : (
          <div style={{textAlign:"center",padding:"40px 0",color:T.inkXLight,fontSize:12}}>Completa los datos para ver resultados</div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   3. CONCRETO
═══════════════════════════════════════════════════════════════════════ */
function CalcConcreto() {
  const [vol,setVol]=useState(""); const [resist,setResist]=useState("21"); const [tipo,setTipo]=useState("normal");
  const DOSIF={"14":{ce:280,ag:205,ar:810,gr:960},"17.5":{ce:310,ag:200,ar:790,gr:940},"21":{ce:350,ag:195,ar:760,gr:920},"28":{ce:400,ag:190,ar:720,gr:880},"35":{ce:450,ag:185,ar:680,gr:850}};
  const d=DOSIF[resist]||DOSIF["21"]; const v=Number(vol)||0;
  const Res=({l,val,u,hi})=>(
    <div style={{background:hi?T.ink:T.bg,border:`1px solid ${hi?T.ink:T.border}`,borderRadius:6,padding:"12px 14px",textAlign:"center"}}>
      <div style={{fontSize:9,color:hi?"rgba(255,255,255,.4)":T.inkLight,letterSpacing:1,textTransform:"uppercase",fontWeight:600,marginBottom:6}}>{l}</div>
      <div className="mono" style={{fontSize:18,fontWeight:800,color:hi?"#fff":T.ink}}>{val}</div>
      {u&&<div style={{fontSize:9,color:hi?"rgba(255,255,255,.4)":T.inkLight,marginTop:2}}>{u}</div>}
    </div>
  );
  return(
    <div className="fade-up" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,maxWidth:800}}>
      <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:"20px"}}>
        <div style={{fontSize:10,letterSpacing:1,textTransform:"uppercase",color:T.inkLight,fontWeight:700,marginBottom:14}}>Datos ACI 211</div>
        <Inp label="Volumen requerido" value={vol} onChange={setVol} unit="m³"/>
        <Sel label="Resistencia f'c" value={resist} onChange={setResist} options={[
          {v:"14",l:"14 MPa (2000 PSI) — Ciclópeo"},{v:"17.5",l:"17.5 MPa (2500 PSI) — Cimientos"},
          {v:"21",l:"21 MPa (3000 PSI) — Estructural"},{v:"28",l:"28 MPa (4000 PSI) — Alta resist."},
          {v:"35",l:"35 MPa (5000 PSI) — Especial"}]}/>
        <Sel label="Tipo de agregado" value={tipo} onChange={setTipo} options={[{v:"normal",l:"Normal (grava triturada)"},{v:"liviano",l:"Liviano (+8% agua)"}]}/>
        <div style={{background:T.blueBg,border:`1px solid ${T.blue}22`,borderRadius:5,padding:"10px 12px",marginTop:8}}>
          <div style={{fontSize:9,fontWeight:700,color:T.blue,marginBottom:4,letterSpacing:1,textTransform:"uppercase"}}>Dosificación por m³</div>
          <div style={{fontSize:11,color:T.blue}}>Ce: {d.ce} kg · Ag: {d.ag} L · Ar: {d.ar} kg · Gr: {d.gr} kg</div>
        </div>
      </div>
      <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:"20px"}}>
        <div style={{fontSize:10,letterSpacing:1,textTransform:"uppercase",color:T.inkLight,fontWeight:700,marginBottom:14}}>Cantidades para {v||"?"} m³</div>
        {v>0?<div style={{display:"flex",flexDirection:"column",gap:8}}>
          <Res l="Cemento" val={`${(d.ce*v).toFixed(0)} kg`} hi/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <Res l="Sacos 50 kg" val={Math.ceil(d.ce*v/50)} u="sacos"/>
            <Res l="Agua" val={`${(d.ag*v*(tipo==="liviano"?1.08:1)).toFixed(0)} L`}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <Res l="Arena" val={`${(d.ar*v).toFixed(0)} kg`}/>
            <Res l="Grava" val={`${(d.gr*v).toFixed(0)} kg`}/>
          </div>
        </div>:<div style={{textAlign:"center",padding:"40px 0",color:T.inkXLight,fontSize:12}}>Ingresa el volumen</div>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   4. CUBICACIÓN
═══════════════════════════════════════════════════════════════════════ */
function CalcCubicacion() {
  const [forma,setForma]=useState("losa");
  const [a,setA]=useState(""); const [b,setB]=useState(""); const [h,setH]=useState("");
  const [r,setR]=useState(""); const [esp,setEsp]=useState("0.12");
  const calc = useMemo(()=>{
    const A=Number(a)||0,B=Number(b)||0,H=Number(h)||0,R=Number(r)||0,E=Number(esp)||0;
    if(forma==="losa")     return{area:A*B,volumen:A*B*E,perimetro:2*(A+B)};
    if(forma==="columna")  return{area:A*B,volumen:A*B*H,perimetro:2*(A+B)};
    if(forma==="viga")     return{area:A*B,volumen:A*B*H,perimetro:2*(A+B)};
    if(forma==="cilindro") return{area:Math.PI*R*R,volumen:Math.PI*R*R*H,perimetro:2*Math.PI*R};
    if(forma==="muro")     return{area:A*H,volumen:A*H*E,perimetro:2*(A+H)};
    return{area:0,volumen:0,perimetro:0};
  },[forma,a,b,h,r,esp]);
  const Res=({l,val,u,hi})=>(
    <div style={{background:hi?T.ink:T.bg,border:`1px solid ${hi?T.ink:T.border}`,borderRadius:6,padding:"12px 14px",textAlign:"center"}}>
      <div style={{fontSize:9,color:hi?"rgba(255,255,255,.4)":T.inkLight,letterSpacing:1,textTransform:"uppercase",fontWeight:600,marginBottom:6}}>{l}</div>
      <div className="mono" style={{fontSize:18,fontWeight:800,color:hi?"#fff":T.ink}}>{val||"—"}</div>
      {u&&<div style={{fontSize:9,color:hi?"rgba(255,255,255,.4)":T.inkLight,marginTop:2}}>{u}</div>}
    </div>
  );
  return(
    <div className="fade-up" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,maxWidth:800}}>
      <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:"20px"}}>
        <div style={{fontSize:10,letterSpacing:1,textTransform:"uppercase",color:T.inkLight,fontWeight:700,marginBottom:14}}>Elemento estructural</div>
        <Sel label="Tipo" value={forma} onChange={setForma} options={[{v:"losa",l:"Losa / Placa"},{v:"columna",l:"Columna"},{v:"viga",l:"Viga"},{v:"cilindro",l:"Pilote / Cilindro"},{v:"muro",l:"Muro / Pared"}]}/>
        {forma!=="cilindro"&&<Inp label={forma==="muro"?"Longitud":"Ancho (a)"} value={a} onChange={setA} unit="m"/>}
        {(forma==="losa")&&<Inp label="Largo (b)" value={b} onChange={setB} unit="m"/>}
        {(forma==="columna"||forma==="viga")&&<Inp label="Ancho (b)" value={b} onChange={setB} unit="m"/>}
        {forma==="cilindro"&&<Inp label="Radio" value={r} onChange={setR} unit="m"/>}
        {(forma!=="losa")&&<Inp label="Altura / Longitud" value={h} onChange={setH} unit="m"/>}
        {(forma==="losa"||forma==="muro")&&<Inp label={forma==="losa"?"Espesor":"Ancho muro"} value={esp} onChange={setEsp} unit="m"/>}
      </div>
      <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:"20px"}}>
        <div style={{fontSize:10,letterSpacing:1,textTransform:"uppercase",color:T.inkLight,fontWeight:700,marginBottom:14}}>Resultados</div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          <Res l="Área" val={calc.area>0?`${calc.area.toFixed(3)}`:"—"} u="m²" hi/>
          <Res l="Volumen" val={calc.volumen>0?`${calc.volumen.toFixed(4)}`:"—"} u="m³"/>
          <Res l="Perímetro" val={calc.perimetro>0?`${calc.perimetro.toFixed(2)}`:"—"} u="m"/>
          {calc.volumen>0&&<div style={{background:T.greenBg,border:`1px solid ${T.green}22`,borderRadius:6,padding:"12px 14px"}}>
            <div style={{fontSize:9,color:T.green,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>Concreto estimado (f'c=21MPa +10%)</div>
            <div className="mono" style={{fontSize:13,fontWeight:700,color:T.green}}>{(calc.volumen*1.1*350).toFixed(0)} kg cemento · {Math.ceil(calc.volumen*1.1*350/50)} sacos</div>
          </div>}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   5. MATERIALES
═══════════════════════════════════════════════════════════════════════ */
function CalcMateriales() {
  const [items,setItems]=useStore("hab:herr:materiales",[]);
  const [form,setForm]=useState({nombre:"",unidad:"m²",cantidad:"",precioUnit:""});
  const upd=(k,v)=>setForm(f=>({...f,[k]:v}));
  const add=()=>{if(!form.nombre||!form.cantidad||!form.precioUnit)return;setItems(p=>[...p,{...form,id:Date.now(),sub:Number(form.cantidad)*Number(form.precioUnit)}]);setForm({nombre:"",unidad:"m²",cantidad:"",precioUnit:""});};
  const del=id=>setItems(p=>p.filter(i=>i.id!==id));
  const total=items.reduce((s,i)=>s+i.sub,0);
  return(
    <div className="fade-up" style={{maxWidth:900}}>
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr auto",gap:8,marginBottom:12,background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:"14px 16px",alignItems:"end"}}>
        <Inp label="Material / Ítem" value={form.nombre} onChange={v=>upd("nombre",v)} type="text" placeholder="Ej. Concreto f'c=21MPa"/>
        <Sel label="Unidad" value={form.unidad} onChange={v=>upd("unidad",v)} options={["m²","m³","ml","kg","und","gl","m"]}/>
        <Inp label="Cantidad" value={form.cantidad} onChange={v=>upd("cantidad",v)}/>
        <Inp label="Precio unitario" value={form.precioUnit} onChange={v=>upd("precioUnit",v)}/>
        <div style={{paddingBottom:0}}><button onClick={add} style={{padding:"9px 16px",background:T.ink,color:"#fff",border:"none",borderRadius:4,cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap",height:36}}>+ Añadir</button></div>
      </div>
      {items.length===0
        ?<div style={{textAlign:"center",padding:"40px",color:T.inkXLight,fontSize:12,background:T.surface,border:`1px solid ${T.border}`,borderRadius:8}}>Añade materiales para calcular</div>
        :<div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,overflow:"hidden"}}>
          <table style={{width:"100%",fontSize:12}}>
            <thead><tr style={{background:T.bg,borderBottom:`2px solid ${T.border}`}}>
              {["Material","Unidad","Cantidad","Precio Unit.","Subtotal",""].map(h=><th key={h} style={{padding:"9px 12px",textAlign:"left",fontSize:9,letterSpacing:1,textTransform:"uppercase",color:T.inkLight,fontWeight:700}}>{h}</th>)}
            </tr></thead>
            <tbody>{items.map(i=>(
              <tr key={i.id} style={{borderBottom:`1px solid ${T.border}`}}>
                <td style={{padding:"10px 12px",fontWeight:500}}>{i.nombre}</td>
                <td style={{padding:"10px 12px",color:T.inkMid}}>{i.unidad}</td>
                <td style={{padding:"10px 12px"}} className="mono">{Number(i.cantidad).toLocaleString()}</td>
                <td style={{padding:"10px 12px"}} className="mono">{fmtM(Number(i.precioUnit))}</td>
                <td style={{padding:"10px 12px",fontWeight:700}} className="mono">{fmtM(i.sub)}</td>
                <td style={{padding:"10px 12px"}}><button onClick={()=>del(i.id)} style={{background:"none",border:"none",cursor:"pointer",color:T.red,fontSize:16}}>×</button></td>
              </tr>
            ))}</tbody>
            <tfoot><tr style={{background:T.ink}}>
              <td colSpan={4} style={{padding:"12px",fontSize:11,fontWeight:700,color:"rgba(255,255,255,.5)",textTransform:"uppercase",letterSpacing:1}}>Total presupuesto de materiales</td>
              <td style={{padding:"12px"}} className="mono"><span style={{fontSize:16,fontWeight:800,color:"#fff"}}>{fmtM(total)}</span></td>
              <td/>
            </tr></tfoot>
          </table>
        </div>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   DISEÑO DE ILUMINACIÓN — RETILAP (CO) / CTE DB-HE3 (ES)
═══════════════════════════════════════════════════════════════════════ */
const ESPACIOS_LUX = [
  { id:"oficina_gral",  lbl:"Oficina general",         luxCO:500, luxES:500, veei:3.0, ugr:19, ra:80, cat:"Oficinas" },
  { id:"oficina_tec",   lbl:"Oficina técnica / Dibujo",luxCO:750, luxES:750, veei:3.0, ugr:16, ra:80, cat:"Oficinas" },
  { id:"sala_reuniones", lbl:"Sala de reuniones",       luxCO:300, luxES:500, veei:3.0, ugr:19, ra:80, cat:"Oficinas" },
  { id:"recepcion",     lbl:"Recepción / Lobby",       luxCO:300, luxES:300, veei:3.5, ugr:22, ra:80, cat:"Oficinas" },
  { id:"archivo",       lbl:"Archivo / Bodega oficina", luxCO:200, luxES:200, veei:4.0, ugr:25, ra:60, cat:"Oficinas" },
  { id:"sala_estar",    lbl:"Sala de estar",           luxCO:150, luxES:200, veei:7.5, ugr:22, ra:80, cat:"Residencial" },
  { id:"dormitorio",    lbl:"Dormitorio",              luxCO:100, luxES:150, veei:7.5, ugr:22, ra:80, cat:"Residencial" },
  { id:"cocina_res",    lbl:"Cocina residencial",      luxCO:300, luxES:300, veei:7.5, ugr:22, ra:80, cat:"Residencial" },
  { id:"bano",          lbl:"Baño",                    luxCO:200, luxES:200, veei:7.5, ugr:22, ra:80, cat:"Residencial" },
  { id:"circulacion",   lbl:"Circulación / Pasillo",   luxCO:100, luxES:100, veei:7.5, ugr:25, ra:80, cat:"Residencial" },
  { id:"escalera",      lbl:"Escaleras",               luxCO:150, luxES:150, veei:4.0, ugr:25, ra:80, cat:"Residencial" },
  { id:"garaje",        lbl:"Garaje / Parqueadero",    luxCO:75,  luxES:75,  veei:5.0, ugr:25, ra:40, cat:"Residencial" },
  { id:"aula",          lbl:"Aula de clase",           luxCO:500, luxES:500, veei:3.5, ugr:19, ra:80, cat:"Educación" },
  { id:"laboratorio",   lbl:"Laboratorio",             luxCO:500, luxES:500, veei:3.5, ugr:19, ra:80, cat:"Educación" },
  { id:"biblioteca",    lbl:"Biblioteca / Lectura",    luxCO:500, luxES:500, veei:3.5, ugr:19, ra:80, cat:"Educación" },
  { id:"comercio",      lbl:"Comercio general",        luxCO:300, luxES:300, veei:5.0, ugr:22, ra:80, cat:"Comercio" },
  { id:"supermercado",  lbl:"Supermercado",            luxCO:500, luxES:500, veei:5.0, ugr:22, ra:80, cat:"Comercio" },
  { id:"restaurante",   lbl:"Restaurante",             luxCO:200, luxES:200, veei:8.0, ugr:22, ra:80, cat:"Comercio" },
  { id:"hospital",      lbl:"Hospital — general",      luxCO:300, luxES:300, veei:4.0, ugr:19, ra:80, cat:"Salud" },
  { id:"consultorio",   lbl:"Consultorio médico",      luxCO:500, luxES:500, veei:4.0, ugr:19, ra:90, cat:"Salud" },
  { id:"quirofano",     lbl:"Quirófano",               luxCO:1000,luxES:1000,veei:4.0, ugr:19, ra:90, cat:"Salud" },
  { id:"nave_ind",      lbl:"Nave industrial general", luxCO:300, luxES:300, veei:4.0, ugr:25, ra:60, cat:"Industrial" },
  { id:"ind_fina",      lbl:"Industria — trabajo fino",luxCO:500, luxES:500, veei:4.0, ugr:22, ra:80, cat:"Industrial" },
  { id:"almacen",       lbl:"Almacén / Depósito",      luxCO:150, luxES:100, veei:5.0, ugr:25, ra:60, cat:"Industrial" },
  { id:"ext_acera",     lbl:"Acera / Andén exterior",  luxCO:20,  luxES:20,  veei:null,ugr:null,ra:20, cat:"Exterior" },
  { id:"ext_parqueo",   lbl:"Parqueadero exterior",    luxCO:50,  luxES:50,  veei:null,ugr:null,ra:20, cat:"Exterior" },
];

const LUMINARIAS_CAT = [
  { id:"panel_40w",    lbl:"Panel LED 60×60 — 40W",        w:40,  lm:4000,  tipo:"Empotrado", temp:"4000K", vida:50000, irc:80 },
  { id:"panel_36w",    lbl:"Panel LED 60×60 — 36W",        w:36,  lm:3600,  tipo:"Empotrado", temp:"4000K", vida:50000, irc:80 },
  { id:"panel_24w",    lbl:"Panel LED 30×30 — 24W",        w:24,  lm:2400,  tipo:"Empotrado", temp:"4000K", vida:50000, irc:80 },
  { id:"down_18w",     lbl:"Downlight LED Ø20 — 18W",      w:18,  lm:1800,  tipo:"Empotrado", temp:"3000K", vida:40000, irc:80 },
  { id:"down_12w",     lbl:"Downlight LED Ø15 — 12W",      w:12,  lm:1200,  tipo:"Empotrado", temp:"3000K", vida:40000, irc:80 },
  { id:"down_9w",      lbl:"Downlight LED Ø12 — 9W",       w:9,   lm:900,   tipo:"Empotrado", temp:"3000K", vida:40000, irc:80 },
  { id:"tubo_18w",     lbl:"Tubo LED T8 120cm — 18W",      w:18,  lm:2000,  tipo:"Regleta",   temp:"6500K", vida:30000, irc:80 },
  { id:"tubo_9w",      lbl:"Tubo LED T8 60cm — 9W",        w:9,   lm:1000,  tipo:"Regleta",   temp:"6500K", vida:30000, irc:80 },
  { id:"regleta_36w",  lbl:"Regleta 2×T8 LED — 36W",       w:36,  lm:4000,  tipo:"Regleta",   temp:"6500K", vida:30000, irc:80 },
  { id:"campana_100w", lbl:"Campana LED industrial — 100W", w:100, lm:13000, tipo:"Suspendido", temp:"5000K", vida:50000, irc:70 },
  { id:"campana_150w", lbl:"Campana LED industrial — 150W", w:150, lm:20000, tipo:"Suspendido", temp:"5000K", vida:50000, irc:70 },
  { id:"campana_200w", lbl:"Campana LED industrial — 200W", w:200, lm:26000, tipo:"Suspendido", temp:"5000K", vida:50000, irc:70 },
  { id:"aplique_12w",  lbl:"Aplique de pared — 12W",        w:12,  lm:1000,  tipo:"Aplique",   temp:"3000K", vida:30000, irc:80 },
  { id:"plafon_24w",   lbl:"Plafón LED Ø30 — 24W",         w:24,  lm:2200,  tipo:"Adosado",   temp:"4000K", vida:40000, irc:80 },
  { id:"plafon_18w",   lbl:"Plafón LED Ø25 — 18W",         w:18,  lm:1600,  tipo:"Adosado",   temp:"4000K", vida:40000, irc:80 },
  { id:"spot_9w",      lbl:"Spot LED GU10 — 9W",           w:9,   lm:800,   tipo:"Spot",      temp:"3000K", vida:25000, irc:80 },
  { id:"lineal_20w",   lbl:"Perfil lineal LED — 20W/m",    w:20,  lm:2200,  tipo:"Lineal",    temp:"4000K", vida:50000, irc:90 },
];

function getCU_ilum(k, rT, rP) {
  const base = Math.min(0.95, 0.25 + 0.35 * Math.log10(1 + k));
  const refF = 1 + (rT - 0.5) * 0.15 + (rP - 0.3) * 0.10;
  return Math.min(0.90, Math.max(0.20, base * refF));
}

function CalcIluminacion({pais}) {
  const [showRef, setShowRef] = useState(false);
  const [tipo, setTipo]       = useState("oficina_gral");
  const [largo, setLargo]     = useState("5");
  const [ancho, setAncho]     = useState("4");
  const [alto, setAlto]       = useState("2.8");
  const [hPlano, setHPlano]   = useState("0.85");
  const [hSusp, setHSusp]     = useState("0");
  const [rT, setRT]           = useState("0.7");
  const [rP, setRP]           = useState("0.5");
  const [rS, setRS]           = useState("0.2");
  const [lum, setLum]         = useState("panel_40w");
  const [cm, setCm]           = useState("0.8");

  const td = ESPACIOS_LUX.find(e => e.id === tipo);
  const ld = LUMINARIAS_CAT.find(l => l.id === lum);

  const calc = useMemo(() => {
    if (!td || !ld) return null;
    const L=+largo, A=+ancho, H=+alto, hp=+hPlano, hs=+hSusp, Cm=+cm;
    if (L<=0 || A<=0 || H<=0) return null;
    const luxReq = pais==="CO" ? td.luxCO : td.luxES;
    const S = L * A;
    const h = H - hp - hs;
    if (h <= 0) return null;
    const K = (L * A) / (h * (L + A));
    const CU = getCU_ilum(K, +rT, +rP);
    const flujoTotal = (luxReq * S) / (CU * Cm);
    const nCalc = Math.ceil(flujoTotal / ld.lm);
    const nMin = Math.max(1, nCalc);
    const ratio = L / A;
    let cols = Math.round(Math.sqrt(nMin / ratio));
    let rows = Math.ceil(nMin / Math.max(1, cols));
    if (cols < 1) cols = 1;
    if (rows * cols < nMin) rows++;
    const nReal = rows * cols;
    const luxReal = (nReal * ld.lm * CU * Cm) / S;
    const distL = L / rows;
    const distA = A / cols;
    const potTotal = nReal * ld.w;
    const dpea = potTotal / S;
    const veei = luxReal > 0 ? (potTotal * 100) / (S * luxReal) : 0;
    const unifEst = Math.min(0.95, 0.4 + 0.3 * CU + 0.1 * (K > 2 ? 1 : K / 2));
    const luxOk = luxReal >= luxReq;
    const veeiOk = td.veei ? veei <= td.veei : true;
    const ircOk = ld.irc >= td.ra;
    const unifOk = unifEst >= 0.6;
    const distMaxOk = Math.max(distL, distA) <= 1.5 * h;
    return { luxReq, S, h, K, CU, flujoTotal, nCalc:nMin, nReal, rows, cols, luxReal, distL, distA, potTotal, dpea, veei, unifEst, luxOk, veeiOk, ircOk, unifOk, distMaxOk, allOk:luxOk&&veeiOk&&ircOk&&unifOk&&distMaxOk };
  }, [tipo, largo, ancho, alto, hPlano, hSusp, rT, rP, cm, lum, pais, td, ld]);

  // ── Auto-recommendation engine ──
  const recomendaciones = useMemo(() => {
    if (!td) return [];
    const L=+largo, A=+ancho, H=+alto, hp=+hPlano, hs=+hSusp, Cm=+cm;
    if (L<=0 || A<=0 || H<=0) return [];
    const luxReq = pais==="CO" ? td.luxCO : td.luxES;
    const S = L * A;
    const h = H - hp - hs;
    if (h <= 0) return [];
    const K = (L * A) / (h * (L + A));
    const CU = getCU_ilum(K, +rT, +rP);

    const opciones = [];
    LUMINARIAS_CAT.forEach(lumOp => {
      // Check IRC compatibility
      if (lumOp.irc < td.ra) return;
      const flujoTotal = (luxReq * S) / (CU * Cm);
      const nCalc = Math.ceil(flujoTotal / lumOp.lm);
      const nMin = Math.max(1, nCalc);
      const ratio = L / A;
      let cols = Math.round(Math.sqrt(nMin / ratio));
      let rows = Math.ceil(nMin / Math.max(1, cols));
      if (cols < 1) cols = 1;
      if (rows * cols < nMin) rows++;
      const nReal = rows * cols;
      const luxReal = (nReal * lumOp.lm * CU * Cm) / S;
      const distL = L / rows;
      const distA = A / cols;
      const potTotal = nReal * lumOp.w;
      const veei = luxReal > 0 ? (potTotal * 100) / (S * luxReal) : 0;
      const unifEst = Math.min(0.95, 0.4 + 0.3 * CU + 0.1 * (K > 2 ? 1 : K / 2));
      const luxOk = luxReal >= luxReq;
      const veeiOk = td.veei ? veei <= td.veei : true;
      const unifOk = unifEst >= 0.6;
      const distMaxOk = Math.max(distL, distA) <= 1.5 * h;
      const allOk = luxOk && veeiOk && unifOk && distMaxOk;
      if (!allOk) return;
      const eficacia = lumOp.lm / lumOp.w;
      const dpea = potTotal / S;
      opciones.push({ lumOp, nReal, rows, cols, luxReal:Math.round(luxReal), potTotal, dpea:dpea.toFixed(1), veei:veei.toFixed(2), eficacia:eficacia.toFixed(0), distL:distL.toFixed(2), distA:distA.toFixed(2) });
    });
    // Sort by lowest total wattage (most efficient solution)
    opciones.sort((a,b) => a.potTotal - b.potTotal);
    return opciones.slice(0, 5);
  }, [tipo, largo, ancho, alto, hPlano, hSusp, rT, rP, cm, pais, td]);

  const aplicarRecomendacion = (rec) => { setLum(rec.lumOp.id); };

  const sec = {background:T.surface, border:`1px solid ${T.border}`, borderRadius:8, padding:16, marginBottom:12, boxShadow:T.shadow};

  return (
    <div className="fade-up" style={{maxWidth:1100}}>
      {/* Ref table toggle */}
      <div style={{display:"flex",gap:8,marginBottom:12}}>
        <button onClick={()=>setShowRef(!showRef)} style={{padding:"6px 14px",border:`1px solid ${T.border}`,borderRadius:4,background:showRef?T.blueBg:"#fff",color:showRef?T.blue:T.inkLight,fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
          📋 {showRef?"Ocultar":"Ver"} tabla normativa — {pais==="CO"?"RETILAP":"UNE 12464-1"}
        </button>
        <Norma pais={pais}/>
      </div>

      {showRef && (
        <div style={{...sec, background:T.blueBg, maxHeight:220, overflowY:"auto", marginBottom:16}}>
          <table style={{width:"100%",fontSize:9}}>
            <thead><tr style={{background:"rgba(30,79,140,.06)"}}>
              {["Cat.","Espacio","Lux mín (CO)","Lux mín (ES)","UGR máx","Ra mín","VEEI lím"].map(h=>(
                <th key={h} style={{padding:"4px 8px",textAlign:"left",fontWeight:700,color:T.blue,borderBottom:`1px solid ${T.blue}33`}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{ESPACIOS_LUX.map(e=>(
              <tr key={e.id} style={{borderBottom:`1px solid ${T.border}`,background:e.id===tipo?"rgba(30,79,140,.08)":"transparent"}}>
                <td style={{padding:"3px 8px",color:T.inkLight}}>{e.cat}</td>
                <td style={{padding:"3px 8px",fontWeight:e.id===tipo?700:400}}>{e.lbl}</td>
                <td style={{padding:"3px 8px"}} className="mono">{e.luxCO}</td>
                <td style={{padding:"3px 8px"}} className="mono">{e.luxES}</td>
                <td style={{padding:"3px 8px"}} className="mono">{e.ugr??'—'}</td>
                <td style={{padding:"3px 8px"}} className="mono">{e.ra}</td>
                <td style={{padding:"3px 8px"}} className="mono">{e.veei??'N/A'}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        {/* LEFT — Inputs */}
        <div>
          <div style={sec}>
            <div style={{fontSize:11,fontWeight:700,marginBottom:8}}>🏢 Tipo de espacio</div>
            <Sel value={tipo} onChange={setTipo} options={
              Object.entries(ESPACIOS_LUX.reduce((g,e)=>{(g[e.cat]=g[e.cat]||[]).push(e);return g;},{}))
                .flatMap(([cat,items])=>[{v:"__"+cat,l:`── ${cat} ──`},...items.map(i=>({v:i.id,l:`${i.lbl} — ${pais==="CO"?i.luxCO:i.luxES} lux`}))])
            }/>
            {td && <div style={{display:"flex",gap:8,marginTop:8,fontSize:9}}>
              <span style={{padding:"3px 8px",borderRadius:3,background:T.amberBg,color:T.amber,fontWeight:700}}>Req: {pais==="CO"?td.luxCO:td.luxES} lux</span>
              <span style={{padding:"3px 8px",borderRadius:3,background:T.accent,color:T.inkMid}}>UGR ≤ {td.ugr??'—'}</span>
              <span style={{padding:"3px 8px",borderRadius:3,background:T.accent,color:T.inkMid}}>Ra ≥ {td.ra}</span>
              {td.veei && <span style={{padding:"3px 8px",borderRadius:3,background:T.accent,color:T.inkMid}}>VEEI ≤ {td.veei}</span>}
            </div>}
          </div>

          <div style={sec}>
            <div style={{fontSize:11,fontWeight:700,marginBottom:8}}>📐 Dimensiones (m)</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
              <Inp label="Largo" value={largo} onChange={setLargo} step="0.1" min="0.1"/>
              <Inp label="Ancho" value={ancho} onChange={setAncho} step="0.1" min="0.1"/>
              <Inp label="Alto total" value={alto} onChange={setAlto} step="0.1" min="0.5"/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <Inp label="Plano de trabajo" value={hPlano} onChange={setHPlano} step="0.05" unit="m"/>
              <Inp label="Suspensión luminaria" value={hSusp} onChange={setHSusp} step="0.05" unit="m"/>
            </div>
          </div>

          <div style={sec}>
            <div style={{fontSize:11,fontWeight:700,marginBottom:8}}>🎨 Reflectancias</div>
            {[["Techo",rT,setRT],["Paredes",rP,setRP],["Suelo",rS,setRS]].map(([l,v,fn])=>(
              <div key={l} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                <span style={{fontSize:10,width:55,fontWeight:500}}>{l}</span>
                <input type="range" min={0.1} max={0.9} step={0.05} value={v} onChange={e=>fn(e.target.value)}
                  style={{flex:1,accentColor:T.blue}}/>
                <span className="mono" style={{fontSize:11,fontWeight:700,color:T.blue,minWidth:30}}>{(v*100).toFixed(0)}%</span>
              </div>
            ))}
            <div style={{fontSize:8,color:T.inkLight}}>Techo blanco ≈ 70% · Pared clara ≈ 50% · Suelo oscuro ≈ 20%</div>
          </div>

          <div style={sec}>
            <div style={{fontSize:11,fontWeight:700,marginBottom:8}}>💡 Luminaria</div>
            <Sel value={lum} onChange={setLum} options={
              Object.entries(LUMINARIAS_CAT.reduce((g,l)=>{(g[l.tipo]=g[l.tipo]||[]).push(l);return g;},{}))
                .flatMap(([tipo,items])=>[{v:"__"+tipo,l:`── ${tipo} ──`},...items.map(l=>({v:l.id,l:`${l.lbl} — ${l.lm}lm`}))])
            }/>
            {ld && <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginTop:8,fontSize:9}}>
              {[{l:"Flujo",v:`${ld.lm} lm`},{l:"Potencia",v:`${ld.w} W`},{l:"Eficacia",v:`${Math.round(ld.lm/ld.w)} lm/W`},{l:"IRC",v:`${ld.irc}`}].map(d=>(
                <div key={d.l} style={{background:T.bg,padding:"5px 8px",borderRadius:4,textAlign:"center"}}>
                  <div className="mono" style={{fontWeight:700,color:T.blue}}>{d.v}</div>
                  <div style={{color:T.inkLight,fontSize:8}}>{d.l}</div>
                </div>
              ))}
            </div>}
            <div style={{marginTop:10}}>
              <div style={{fontSize:9,color:T.inkLight,letterSpacing:1,textTransform:"uppercase",fontWeight:700,marginBottom:4}}>Factor de mantenimiento (Cm)</div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <input type="range" min={0.5} max={1} step={0.05} value={cm} onChange={e=>setCm(e.target.value)}
                  style={{flex:1,accentColor:T.blue}}/>
                <span className="mono" style={{fontSize:11,fontWeight:700,color:T.blue,minWidth:24}}>{cm}</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:8,color:T.inkXLight}}><span>Sucio 0.5</span><span>Limpio 1.0</span></div>
            </div>
          </div>
        </div>

        {/* RIGHT — Results */}
        <div>
          {calc ? <>
            {/* Compliance */}
            <div style={{...sec, background:calc.allOk?T.greenBg:T.redBg, border:`1px solid ${calc.allOk?T.green:T.red}33`, textAlign:"center", padding:20}}>
              <div style={{fontSize:28,fontWeight:800,color:calc.allOk?T.green:T.red}}>
                {calc.allOk?"✅ CUMPLE":"❌ NO CUMPLE"}
              </div>
              <div style={{fontSize:10,color:T.inkMid,marginTop:2}}>
                {pais==="CO"?"RETILAP — Res. 181331/2009":"CTE DB-HE3 / UNE-EN 12464-1"}
              </div>
            </div>

            {/* ── AUTO-FIX: Recommendations when non-compliant ── */}
            {!calc.allOk && recomendaciones.length > 0 && (
              <div style={{...sec, background:"#FFFBE6", border:`1px solid #E6D44D55`, padding:14}}>
                <div style={{fontSize:11,fontWeight:700,color:"#8C6A00",marginBottom:8}}>💡 Soluciones que SÍ cumplen normativa</div>
                <div style={{fontSize:9,color:T.inkMid,marginBottom:8}}>Haz clic en "Aplicar" para usar esa opción automáticamente</div>
                {recomendaciones.slice(0,3).map((rec,i) => (
                  <div key={rec.lumOp.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",
                    background:i===0?"#E8F4EE":"#fff",border:`1px solid ${i===0?T.green+"44":T.border}`,
                    borderRadius:6,marginBottom:4}}>
                    {i===0 && <span style={{fontSize:14}}>🏆</span>}
                    <div style={{flex:1}}>
                      <div style={{fontSize:10,fontWeight:700,color:i===0?T.green:T.ink}}>{rec.lumOp.lbl}</div>
                      <div style={{fontSize:8,color:T.inkMid}}>
                        {rec.nReal} uds ({rec.rows}×{rec.cols}) · {rec.luxReal} lux · {rec.potTotal}W total · VEEI {rec.veei} · {rec.eficacia} lm/W
                      </div>
                    </div>
                    <button onClick={()=>aplicarRecomendacion(rec)}
                      style={{padding:"4px 12px",background:i===0?T.green:"#fff",color:i===0?"#fff":T.blue,
                        border:i===0?"none":`1px solid ${T.blue}`,borderRadius:4,fontSize:9,fontWeight:700,
                        cursor:"pointer",fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap"}}>
                      Aplicar
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* ── BEST OPTIONS: Always show when compliant too ── */}
            {calc.allOk && recomendaciones.length > 1 && (
              <div style={{...sec, background:T.blueBg, border:`1px solid ${T.blue}22`, padding:14}}>
                <div style={{fontSize:11,fontWeight:700,color:T.blue,marginBottom:6}}>⚡ ¿Se puede optimizar?</div>
                {recomendaciones.filter(r=>r.lumOp.id !== lum).slice(0,2).map((rec) => {
                  const mejora = calc.potTotal - rec.potTotal;
                  return mejora > 0 ? (
                    <div key={rec.lumOp.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 8px",
                      background:"#fff",border:`1px solid ${T.border}`,borderRadius:5,marginBottom:3}}>
                      <div style={{flex:1}}>
                        <div style={{fontSize:10,fontWeight:600}}>{rec.lumOp.lbl}</div>
                        <div style={{fontSize:8,color:T.inkMid}}>
                          {rec.nReal} uds · {rec.luxReal} lux · {rec.potTotal}W
                          <span style={{color:T.green,fontWeight:700,marginLeft:4}}>↓ Ahorra {mejora}W</span>
                        </div>
                      </div>
                      <button onClick={()=>aplicarRecomendacion(rec)}
                        style={{padding:"3px 10px",background:"#fff",color:T.blue,border:`1px solid ${T.blue}`,
                          borderRadius:3,fontSize:8,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
                        Cambiar
                      </button>
                    </div>
                  ) : null;
                })}
              </div>
            )}

            {!calc.allOk && recomendaciones.length === 0 && (
              <div style={{...sec, background:T.redBg, border:`1px solid ${T.red}33`, padding:14}}>
                <div style={{fontSize:11,fontWeight:700,color:T.red,marginBottom:4}}>⚠️ Ninguna luminaria del catálogo cumple</div>
                <div style={{fontSize:9,color:T.inkMid}}>
                  Prueba a: aumentar reflectancias, reducir altura de suspensión, o el espacio requiere una luminaria de mayor flujo no incluida en el catálogo.
                </div>
              </div>
            )}

            {/* Key numbers */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
              {[
                {l:"Luminarias",v:calc.nReal,u:`${calc.rows}×${calc.cols}`,ok:true},
                {l:"Iluminación",v:Math.round(calc.luxReal),u:`lux (req: ${calc.luxReq})`,ok:calc.luxOk},
                {l:"Potencia total",v:calc.potTotal,u:"W",ok:true},
                {l:"DPEA",v:calc.dpea.toFixed(1),u:"W/m²",ok:true},
                {l:"VEEI",v:calc.veei.toFixed(2),u:`W/m²·100lx${td?.veei?` (lím: ${td.veei})`:''}`,ok:calc.veeiOk},
                {l:"Superficie",v:calc.S.toFixed(1),u:"m²",ok:true},
              ].map(r=>(
                <div key={r.l} style={{background:T.surface,border:`1px solid ${r.ok?T.border:T.red}`,borderRadius:6,padding:"10px 12px",boxShadow:T.shadow}}>
                  <div style={{fontSize:8,fontWeight:700,color:r.ok?T.inkLight:T.red,textTransform:"uppercase",letterSpacing:.5}}>{r.l}</div>
                  <div className="mono" style={{fontSize:20,fontWeight:800,color:r.ok?T.ink:T.red,marginTop:2}}>{r.v}</div>
                  <div style={{fontSize:8,color:T.inkLight}}>{r.u}</div>
                </div>
              ))}
            </div>

            {/* Checks */}
            <div style={sec}>
              <div style={{fontSize:11,fontWeight:700,marginBottom:8}}>✅ Verificaciones normativas</div>
              {[
                {l:`Iluminación ≥ ${calc.luxReq} lux`,v:`${Math.round(calc.luxReal)} lux`,ok:calc.luxOk},
                {l:`VEEI ≤ ${td?.veei??'N/A'}`,v:td?.veei?calc.veei.toFixed(2):'N/A',ok:calc.veeiOk},
                {l:`IRC ≥ ${td?.ra}`,v:`${ld?.irc}`,ok:calc.ircOk},
                {l:`Uniformidad ≥ 0.6`,v:calc.unifEst.toFixed(2),ok:calc.unifOk},
                {l:`Dist. luminarias ≤ ${(1.5*calc.h).toFixed(2)}m`,v:`${Math.max(calc.distL,calc.distA).toFixed(2)}m`,ok:calc.distMaxOk},
              ].map(ch=>(
                <div key={ch.l} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:`1px solid ${T.accent}`}}>
                  <span style={{fontSize:13}}>{ch.ok?"✅":"❌"}</span>
                  <span style={{flex:1,fontSize:10,fontWeight:500}}>{ch.l}</span>
                  <span className="mono" style={{fontSize:10,fontWeight:700,color:ch.ok?T.green:T.red}}>{ch.v}</span>
                </div>
              ))}
            </div>

            {/* Memoria de cálculo */}
            <div style={sec}>
              <div style={{fontSize:11,fontWeight:700,marginBottom:8}}>📊 Memoria de cálculo</div>
              <div style={{fontSize:9,lineHeight:2,color:T.inkMid}}>
                {[
                  ["Superficie (S)",`${largo} × ${ancho} = ${calc.S.toFixed(1)} m²`],
                  ["Altura útil (h)",`${alto} − ${hPlano} − ${hSusp} = ${calc.h.toFixed(2)} m`],
                  ["Índice local (K)",`(${largo}×${ancho}) / (${calc.h.toFixed(2)}×(${largo}+${ancho})) = ${calc.K.toFixed(2)}`],
                  ["Coef. utilización",`CU = ${calc.CU.toFixed(3)} (ρt=${(rT*100).toFixed(0)}%, ρp=${(rP*100).toFixed(0)}%)`],
                  ["Flujo necesario",`(${calc.luxReq}×${calc.S.toFixed(1)})/(${calc.CU.toFixed(3)}×${cm}) = ${Math.round(calc.flujoTotal).toLocaleString()} lm`],
                  ["N° luminarias",`${Math.round(calc.flujoTotal).toLocaleString()} / ${ld.lm.toLocaleString()} ≈ ${calc.nCalc} → ${calc.nReal} ud (${calc.rows}×${calc.cols})`],
                  ["Separación",`Largo: ${calc.distL.toFixed(2)}m · Ancho: ${calc.distA.toFixed(2)}m`],
                ].map(([k,v])=>(
                  <div key={k} style={{display:"flex",gap:8}}>
                    <span style={{fontWeight:700,color:T.ink,minWidth:130}}>{k}:</span>
                    <span className="mono" style={{fontWeight:500}}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Planta visual */}
            <div style={sec}>
              <div style={{fontSize:11,fontWeight:700,marginBottom:8}}>🔲 Disposición en planta</div>
              <div style={{position:"relative",background:T.bg,border:`2px solid ${T.border}`,borderRadius:4,
                width:"100%",aspectRatio:`${largo}/${ancho}`,maxHeight:200,overflow:"hidden"}}>
                <div style={{position:"absolute",top:2,left:"50%",transform:"translateX(-50%)",fontSize:8,color:T.inkLight}} className="mono">{largo}m</div>
                <div style={{position:"absolute",right:4,top:"50%",transform:"translateY(-50%) rotate(90deg)",fontSize:8,color:T.inkLight}} className="mono">{ancho}m</div>
                {Array.from({length:calc.rows},(_,r)=>
                  Array.from({length:calc.cols},(_,c)=>{
                    const x=((c+0.5)/calc.cols)*100;
                    const y=((r+0.5)/calc.rows)*100;
                    return <div key={`${r}-${c}`} style={{position:"absolute",left:`${x}%`,top:`${y}%`,transform:"translate(-50%,-50%)",
                      width:12,height:12,borderRadius:"50%",background:"radial-gradient(circle,#FFD600 30%,#FFD60044 100%)",
                      border:"2px solid #FFC107",boxShadow:"0 0 6px #FFD60055"}}/>;
                  })
                )}
              </div>
              <div style={{display:"flex",justifyContent:"center",gap:16,marginTop:6,fontSize:8,color:T.inkLight}}>
                <span>{calc.rows}×{calc.cols} = {calc.nReal} luminarias</span>
                <span>Sep: {calc.distL.toFixed(2)}m × {calc.distA.toFixed(2)}m</span>
              </div>
            </div>
          </> : (
            <div style={{...sec,textAlign:"center",padding:40,color:T.inkLight}}>
              <Sun size={32} style={{opacity:.3,marginBottom:8}}/>
              <div style={{fontSize:12,fontWeight:600}}>Completa los datos para ver el cálculo</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   6. CONVERSIÓN DE UNIDADES
═══════════════════════════════════════════════════════════════════════ */
function CalcUnidades() {
  const [cat,setCat]=useState("longitud"); const [from,setFrom]=useState("m"); const [to,setTo]=useState("ft"); const [val,setVal]=useState("");
  const CATS={longitud:{l:"Longitud",u:{m:1,cm:0.01,mm:0.001,km:1000,ft:0.3048,in:0.0254,yd:0.9144}},area:{l:"Área",u:{"m²":1,"cm²":0.0001,"km²":1e6,"ft²":0.092903,"in²":0.00064516,"ha":10000,"ac":4046.86}},volumen:{l:"Volumen",u:{"m³":1,"cm³":1e-6,"l":0.001,"ml":1e-6,"gal":0.00378541,"ft³":0.0283168}},peso:{l:"Masa",u:{kg:1,g:0.001,t:1000,lb:0.453592,oz:0.0283495}},temperatura:{l:"Temperatura",special:true},presion:{l:"Presión",u:{Pa:1,kPa:1000,MPa:1e6,"kgf/cm²":98066.5,PSI:6894.76,bar:1e5}}};
  const cd=CATS[cat]; const units=cd?.u?Object.keys(cd.u):["°C","°F","K"];
  const convTemp=(v,f,t)=>{let c;if(f==="°C")c=v;else if(f==="°F")c=(v-32)*5/9;else c=v-273.15;if(t==="°C")return c;if(t==="°F")return c*9/5+32;return c+273.15;};
  const result=useMemo(()=>{const n=Number(val);if(isNaN(n)||!val)return null;if(cat==="temperatura")return convTemp(n,from,to).toFixed(4);const u=cd?.u||{};if(!u[from]||!u[to])return null;return((n*u[from])/u[to]).toFixed(8).replace(/\.?0+$/,"");},[val,from,to,cat]);
  const handleCat=c=>{setCat(c);const u=CATS[c]?.u?Object.keys(CATS[c].u):["°C","°F","K"];setFrom(u[0]||"");setTo(u[1]||"");setVal("");};
  return(
    <div className="fade-up" style={{maxWidth:620}}>
      <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:16}}>
        {Object.entries(CATS).map(([k,v])=>(
          <button key={k} onClick={()=>handleCat(k)} style={{padding:"6px 14px",border:`1px solid ${cat===k?T.ink:T.border}`,borderRadius:20,background:cat===k?T.ink:"transparent",color:cat===k?"#fff":T.inkMid,fontSize:11,fontWeight:cat===k?700:400,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>{v.l}</button>
        ))}
      </div>
      <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:"24px"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 50px 1fr",gap:10,alignItems:"end",marginBottom:14}}>
          <div><div style={{fontSize:9,color:T.inkLight,textTransform:"uppercase",letterSpacing:.8,fontWeight:700,marginBottom:5}}>De</div>
            <select value={from} onChange={e=>setFrom(e.target.value)} style={{width:"100%",padding:"9px 10px",border:`1.5px solid ${T.border}`,borderRadius:4,fontSize:12,background:T.surface}}>
              {units.map(u=><option key={u}>{u}</option>)}
            </select></div>
          <div style={{textAlign:"center",fontSize:18,color:T.inkXLight,paddingBottom:4}}>→</div>
          <div><div style={{fontSize:9,color:T.inkLight,textTransform:"uppercase",letterSpacing:.8,fontWeight:700,marginBottom:5}}>A</div>
            <select value={to} onChange={e=>setTo(e.target.value)} style={{width:"100%",padding:"9px 10px",border:`1.5px solid ${T.border}`,borderRadius:4,fontSize:12,background:T.surface}}>
              {units.map(u=><option key={u}>{u}</option>)}
            </select></div>
        </div>
        <Inp label="Valor" value={val} onChange={setVal} placeholder="Ingresa el valor..."/>
        {result!==null
          ?<div style={{background:T.ink,borderRadius:6,padding:"20px",textAlign:"center"}}>
            <div style={{fontSize:11,color:"rgba(255,255,255,.4)",marginBottom:6}}>{val} {from} =</div>
            <div className="mono" style={{fontSize:28,fontWeight:800,color:"#fff"}}>{result}</div>
            <div style={{fontSize:14,color:"rgba(255,255,255,.4)",marginTop:4}}>{to}</div>
          </div>
          :<div style={{textAlign:"center",padding:"20px 0",color:T.inkXLight,fontSize:12}}>Ingresa un valor</div>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   APP ROOT
═══════════════════════════════════════════════════════════════════════ */
export default function HerramientasTecnicas() {
  const [tab, setTab]   = useState("dashboard");
  const [pais,setPais]  = useStore("hab:config:pais","CO");
  const N = NORMA[pais];

  return (
    <>
      <Fonts/>
      <div style={{minHeight:"100vh",background:T.bg,fontFamily:"'DM Sans',sans-serif"}}>
        {/* Header */}
        <div style={{background:T.ink,padding:"14px 28px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontSize:13,fontWeight:800,letterSpacing:2,textTransform:"uppercase",color:"#fff"}}>HABITARIS</div>
            <div style={{fontSize:9,color:"rgba(255,255,255,.3)",letterSpacing:1}}>Herramientas Técnicas</div>
          </div>
          {/* CO/ES selector */}
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:10,color:"rgba(255,255,255,.4)"}}>Normativa:</span>
            <div style={{display:"flex",background:"rgba(255,255,255,.08)",borderRadius:4,overflow:"hidden",border:"1px solid rgba(255,255,255,.12)"}}>
              {["CO","ES"].map(p=>(
                <button key={p} onClick={()=>setPais(p)}
                  style={{padding:"6px 14px",border:"none",background:pais===p?"#fff":"transparent",color:pais===p?T.ink:"rgba(255,255,255,.5)",fontSize:11,fontWeight:pais===p?700:400,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",display:"flex",alignItems:"center",gap:5,transition:"all .12s"}}>
                  <span style={{fontSize:13}}>{p==="CO"?"🇨🇴":"🇪🇸"}</span>{p==="CO"?"Colombia":"España"}
                </button>
              ))}
            </div>
            <span style={{fontSize:10,color:"rgba(255,255,255,.35)"}}>{N.ref}</span>
          </div>
        </div>

        {/* Sub-tabs */}
        <div style={{background:T.surface,borderBottom:`1px solid ${T.border}`,display:"flex",overflowX:"auto",scrollbarWidth:"none",paddingLeft:16}}>
          {TABS.map(t=>{
            const act=tab===t.id;
            return(
              <button key={t.id} onClick={()=>setTab(t.id)}
                style={{display:"flex",alignItems:"center",gap:6,padding:"12px 16px",border:"none",background:"transparent",flexShrink:0,borderBottom:act?`2px solid ${T.ink}`:"2px solid transparent",color:act?T.ink:T.inkLight,fontSize:11,fontWeight:act?700:400,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",letterSpacing:.2,transition:"color .1s"}}>
                <t.I size={12}/>{t.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div style={{padding:"24px 28px 60px"}}>
          <div style={{marginBottom:16,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div>
              <h2 style={{fontSize:18,fontWeight:800,color:T.ink,letterSpacing:-.2}}>{TABS.find(t=>t.id===tab)?.label}</h2>
              <p style={{fontSize:11,color:T.inkLight,marginTop:2}}>{TABS.find(t=>t.id===tab)?.desc}</p>
            </div>
            <Norma pais={pais}/>
          </div>
          {tab==="dashboard" &&(
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
              {TABS.filter(t=>t.id!=="dashboard").map(t=>(
                <div key={t.id} onClick={()=>setTab(t.id)}
                  style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:"20px 18px",cursor:"pointer",boxShadow:T.shadow,transition:"all .15s"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                    <t.I size={18} color={T.ink}/>
                    <div style={{fontSize:14,fontWeight:700}}>{t.label}</div>
                  </div>
                  <div style={{fontSize:10,color:T.inkLight,lineHeight:1.5}}>{t.desc}</div>
                </div>
              ))}
            </div>
          )}
          {tab==="cuadro"    &&<CuadroDeCargas  pais={pais}/>}
          {tab==="circuito"  &&<CircuitoRapido  pais={pais}/>}
          {tab==="iluminacion"&&<CalcIluminacion pais={pais}/>}
          {tab==="concreto"  &&<CalcConcreto/>}
          {tab==="cubicacion"&&<CalcCubicacion/>}
          {tab==="materiales"&&<CalcMateriales/>}
          {tab==="unidades"  &&<CalcUnidades/>}
        </div>
      </div>
    </>
  );
}
