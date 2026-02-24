import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
const DEF_EQUIPO = () => ({
  id: uid(), nombre: "", descripcion: "", tipo: "obra",
  miembros: [],
  activo: true,
});
import {
  Users, Clock, Monitor, Package, BarChart2, ClipboardList,
  Plus, Trash2, Edit3, Check, X, ChevronDown, ChevronUp,
  Save, RefreshCw, AlertTriangle, CheckCircle, Search,
  Download, Upload, Calendar, Briefcase, DollarSign,
  TrendingUp, Eye, Send, ArrowLeft, LogOut, Home,
  Paperclip, FileText, Bell, Plane, Shield, ChevronRight, Info,
  Stethoscope, Star, Camera} from "lucide-react";

/* ─────────────────────────────────────────────
   STYLES
───────────────────────────────────────────── */
const Fonts = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Outfit', sans-serif; background: #F5F4F1; -webkit-font-smoothing: antialiased; }
    ::-webkit-scrollbar { width: 4px; height: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #C8C5BE; border-radius: 2px; }
    input, select, textarea { font-family: 'Outfit', sans-serif; outline: none; }
    button { font-family: 'Outfit', sans-serif; cursor: pointer; }
    @keyframes fadeUp   { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
    @keyframes fadeIn   { from { opacity:0; } to { opacity:1; } }
    @keyframes slideIn  { from { transform:translateX(-6px); opacity:0; } to { transform:translateX(0); opacity:1; } }
    @keyframes popIn    { from { transform:scale(.95); opacity:0; } to { transform:scale(1); opacity:1; } }
    .fade-up  { animation: fadeUp .22s ease both; }
    .fade-in  { animation: fadeIn .18s ease both; }
    .pop-in   { animation: popIn .18s ease both; }
    .mono     { font-family: 'DM Mono', monospace; }
  `}</style>
);

/* ─────────────────────────────────────────────
   DESIGN TOKENS
───────────────────────────────────────────── */
const T = {
  bg:          "#F5F4F1",
  surface:     "#FFFFFF",
  surfaceAlt:  "#FAFAF8",
  sidebar:     "#0D0D0D",
  ink:         "#111111",
  inkMid:      "#555555",
  inkLight:    "#909090",
  inkXLight:   "#C8C5BE",
  border:      "#E4E1DB",
  borderMid:   "#C8C5BE",
  accent:      "#EDEBE7",
  green:       "#1E6B42",
  greenBg:     "#E8F4EE",
  greenLight:  "#D0EBDA",
  red:         "#AE2C2C",
  redBg:       "#FAE8E8",
  amber:       "#7A5218",
  amberBg:     "#FAF0E0",
  blue:        "#1E4F8C",
  blueBg:      "#E6EFF9",
  shadow:      "0 1px 3px rgba(0,0,0,.06), 0 4px 16px rgba(0,0,0,.05)",
  shadowMd:    "0 8px 32px rgba(0,0,0,.12)",
  // aliases for C.* references in components
  card:        "#FFFFFF",
  greenL:      "#D0EBDA",
  redL:        "#FAE8E8",
  blueL:       "#E6EFF9",
  amberL:      "#FAF0E0",
  teal:        "#0D7377",
  tealL:       "#E0F4F4",
};

/* ─────────────────────────────────────────────
   UTILS
───────────────────────────────────────────── */
const C = T; // alias — muchos componentes internos referencian C en lugar de T
const uid  = () => Math.random().toString(36).slice(2, 9);
const today = () => new Date().toISOString().slice(0, 10);
const nowISO = () => new Date().toISOString();
const fmtDate = (d) => {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("es-CO", { day:"2-digit", month:"short", year:"numeric" }); }
  catch { return d; }
};

const TIPOS_CONTRATO_CO = [
  "Término indefinido", "Término fijo", "Obra o labor", "Prestación de servicios", "Aprendizaje"
];
const TIPOS_CONTRATO_ES = [
  "Indefinido", "Temporal", "Formación", "Prácticas", "Obra o servicio", "Autónomo"
];

const fmt = (n, dec = 0) => {
  if (n == null || n === "") return "—";
  return new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP",
    minimumFractionDigits: dec, maximumFractionDigits: dec,
  }).format(Number(n));
};
const fmtN = (n, dec = 0) =>
  new Intl.NumberFormat("es-CO", { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(Number(n) || 0);
const pct = v => `${(Number(v) || 0).toFixed(1)}%`;

/* ─────────────────────────────────────────────
   STORAGE
───────────────────────────────────────────── */
const NS = {
  cargos:    "hab:rrhh:cargos",
  asistencia:"hab:rrhh:asistencia",
  jornada:   "hab:rrhh:jornada",
  activos:   "hab:rrhh:activos",
  licencias: "hab:rrhh:licencias",
  gastos:    "hab:rrhh:gastos",
  partes:    "hab:rrhh:partes",
  empleados: "hab:rrhh:empleados",
  novedades: "hab:rrhh:novedades",
  fichas:    "hab:rrhh:fichas",
  docs:      "hab:rrhh:docs",
  equipos:   "hab:rrhh:equipos",
};

const store = {
  get: async (k) => { try { const r = await window.storage.get(k); return r ? JSON.parse(r.value) : null; } catch { return null; } },
  set: async (k, v) => { try { await window.storage.set(k, JSON.stringify(v)); } catch {} },
};

const useStore = (key, init) => {
  const [data, setData] = useState(init);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    store.get(key).then(v => { if (v != null) setData(v); setReady(true); });
  }, [key]);
  const save = useCallback(async (val) => {
    const next = typeof val === "function" ? val(data) : val;
    setData(next); await store.set(key, next);
  }, [key, data]);
  return [data, save, ready];
};

/* ─────────────────────────────────────────────
   DEFAULT DATA
───────────────────────────────────────────── */
const DEF_JORNADA = {
  hDia: 8, diasSemana: 5, semanasAnio: 50,
  pctProductivas: 75, diasVacaciones: 15,
  diasFestivos: 18, diasAusencias: 5,
};
const DEF_CARGO = () => ({
  id: uid(), nombre: "", salarioBruto: 0,
  prestaciones: 52.18, segSocial: 12.5, parafiscales: 9,
  activo: true, fechaIngreso: today(),
});
const DEF_FICHA = (nombre = "") => ({
  nombre, apellidos: "", email: "", telefono: "",
  fechaNacimiento: "", tipoDocumento: "CC", numeroDocumento: "",
  cargo: "", tipoContrato: "", fechaIngreso: "", salarioBruto: 0,
  eps: "", afp: "", arl: "", cajaCompensacion: "",
  entidadBancaria: "", tipoCuenta: "", cuentaBancaria: "",
});
/* ─────────────────────────────────────────────
   CATÁLOGO NIIF — Vida útil por tipo de activo
   Fuente: NIIF PYMES Sección 17 · Art.137 E.T.
───────────────────────────────────────────── */
const NIIF_CATS = [
  { cat:"Equipos de Cómputo",         vida:3,  metodo:"Línea recta", base:"NIIF S.17 / Art.137 E.T.", nota:"PCs, portátiles, tablets, servidores",                icono:"💻", usoRef:1760 },
  { cat:"Impresoras y Plotters",       vida:3,  metodo:"Línea recta", base:"NIIF S.17 / Art.137 E.T.", nota:"Impresoras, escáneres, plotters",                     icono:"🖨️", usoRef:1200 },
  { cat:"Equipos de Medición",         vida:5,  metodo:"Línea recta", base:"NIIF S.17",               nota:"Distanciómetros, niveles láser, estaciones totales",   icono:"📐", usoRef:800  },
  { cat:"Mobiliario y Enseres",        vida:10, metodo:"Línea recta", base:"NIIF S.17 / Art.137 E.T.", nota:"Mesas, sillas, archivadores, muebles oficina",        icono:"🪑", usoRef:1760 },
  { cat:"Equipos de Oficina",          vida:5,  metodo:"Línea recta", base:"NIIF S.17",               nota:"Teléfonos, proyectores, pantallas externas",           icono:"📱", usoRef:1200 },
  { cat:"Vehículos",                   vida:5,  metodo:"Línea recta", base:"NIIF S.17 / Art.137 E.T.", nota:"Automóviles, camionetas, motocicletas",               icono:"🚗", usoRef:1500 },
  { cat:"Maquinaria y Equipo",         vida:10, metodo:"Línea recta", base:"NIIF S.17",               nota:"Maquinaria de obra, herramientas especializadas",      icono:"⚙️", usoRef:1200 },
  { cat:"Mejoras Locativas",           vida:10, metodo:"Línea recta", base:"NIIF S.17 / NIC 16",      nota:"Adecuaciones a espacios arrendados",                   icono:"🏗️", usoRef:1760 },
  { cat:"Software licencia perpetua",  vida:3,  metodo:"Línea recta", base:"NIIF S.18 Intangibles",   nota:"CAD, BIM, render (licencias de compra única)",         icono:"📦", usoRef:1760 },
  { cat:"Otro / Personalizado",        vida:5,  metodo:"Línea recta", base:"Manual",                  nota:"Define la vida útil manualmente",                      icono:"📎", usoRef:1760 },
];

const anioActual = new Date().getFullYear();

const DEF_ACTIVO = () => ({
  id: uid(), nombre: "", categoria: "", valorCompra: 0,
  anioCompra: anioActual, vidaUtilAnios: 5,
  metodo: "Línea recta", usoAnual: 1760,
  baseNiif: "", activo: true, vidaUtilEditada: false,
});
const DEF_LICENCIA = () => ({
  id: uid(), nombre: "", plan: "", costoAnual: 0,
  usuarios: 1, activo: true,
});
const DEF_GASTO = () => ({
  id: uid(), concepto: "", montoMensual: 0, categoria: "Oficina",
});
/* ─────────────────────────────────────────────
   TIPOS DE NOVEDAD DE NÓMINA
───────────────────────────────────────────── */
const NOVEDAD_TIPOS = [
  { id:"vacaciones",   lbl:"Vacaciones",       icono:"🏖️",  color:"#1E6B42", bg:"#E8F4EE", requiereDoc:false, requiereFechas:true,  requiereHoras:false },
  { id:"baja",         lbl:"Baja Médica",       icono:"🏥",  color:"#AE2C2C", bg:"#FAE8E8", requiereDoc:true,  requiereFechas:true,  requiereHoras:false },
  { id:"permiso",      lbl:"Permiso / Ausencia",icono:"📋",  color:"#7A5218", bg:"#FAF0E0", requiereDoc:false, requiereFechas:false, requiereHoras:true  },
  { id:"horasExtra",   lbl:"Horas Extra",       icono:"⏰",  color:"#1E4F8C", bg:"#E6EFF9", requiereDoc:false, requiereFechas:false, requiereHoras:true  },
  { id:"licEspecial",  lbl:"Licencia Especial", icono:"📄",  color:"#5B3A8C", bg:"#EDE8F4", requiereDoc:true,  requiereFechas:true,  requiereHoras:false },
  { id:"otro",         lbl:"Otro",              icono:"📎",  color:"#555555", bg:"#EDEBE7", requiereDoc:false, requiereFechas:false, requiereHoras:false },
];

const MOTIVOS_PERMISO = [
  "Cita médica personal","Cita médica familiar","Trámite personal","Asuntos académicos / formación",
  "Duelo familiar","Matrimonio","Mudanza","Asuntos legales","Otro",
];

const MOTIVOS_LIC = [
  "Licencia de maternidad","Licencia de paternidad","Licencia por luto","Licencia por matrimonio",
  "Licencia por fuerza mayor","Otra licencia especial",
];

const DEF_NOVEDAD = (nombre="") => ({
  id: uid(),
  empleadoNombre: nombre,
  tipo: "",
  estado: "Pendiente",
  fechaSolicitud: today(),
  fechaInicio: today(),
  fechaFin: "",
  dias: 0,
  horas: 0,
  motivo: "",
  descripcion: "",
  docNombre: "",
  docBase64: "",
  comentarioAdmin: "",
  fechaResolucion: "",
});

const DEF_PARTE = () => ({
  id: uid(), empleadoId: "", empleadoNombre: "",
  fecha: today(), otCodigo: "", actividad: "",
  horasNormales: 0, horasExtra: 0, horasNoProd: 0,
  descripcion: "", estado: "Borrador",
});

// Roles que pueden crear partes
const ROLES_PARTE = ["encargado","supervisor","jefe_obra","residente","admin","superadmin"];

/* ─────────────────────────────────────────────
   MINI COMPONENTS
───────────────────────────────────────────── */
const Label = ({ children }) => (
  <span style={{ fontSize: 9, letterSpacing: 2, textTransform: "uppercase", fontWeight: 700, color: T.inkLight }}>
    {children}
  </span>
);

const Badge = ({ children, color = T.inkLight, bg = T.accent }) => (
  <span style={{
    display: "inline-flex", alignItems: "center",
    fontSize: 9, fontWeight: 700, letterSpacing: 1.2,
    textTransform: "uppercase", padding: "2px 8px",
    borderRadius: 2, background: bg, color, flexShrink: 0,
  }}>{children}</span>
);

const Row = ({ children, gap = 12, align = "flex-start", wrap = false, style: s = {} }) => (
  <div style={{ display:"flex", gap, alignItems:align, flexWrap:wrap?"wrap":"nowrap", ...s }}>{children}</div>
);
const Col = ({ children, flex = 1, style: s = {} }) => (
  <div style={{ flex, minWidth:0, ...s }}>{children}</div>
);
const Inp = ({ label, value, onChange, type="text", placeholder="", readOnly=false, note="", ...rest }) => (
  <div>
    {label && <label style={{ display:"block", fontSize:10, fontWeight:600, color:T.inkLight, marginBottom:4, textTransform:"uppercase", letterSpacing:0.8 }}>{label}</label>}
    <input type={type} value={value??""} onChange={onChange} placeholder={placeholder} readOnly={readOnly}
      style={{ width:"100%", padding:"7px 10px", border:`1px solid ${T.border}`, borderRadius:3,
        fontSize:12, color:T.ink, background:readOnly?T.accent:T.surface, fontFamily:"'Outfit',sans-serif" }} {...rest}/>
    {note && <p style={{ fontSize:10, color:T.inkLight, marginTop:3 }}>{note}</p>}
  </div>
);

const Btn = ({ children, onClick, variant = "ghost", small, disabled, icon: Icon, style: s = {} }) => {
  const styles = {
    primary: { background: T.ink, color: "#fff", border: "none" },
    ghost:   { background: T.accent, color: T.inkMid, border: `1px solid ${T.border}` },
    danger:  { background: T.redBg, color: T.red, border: `1px solid ${T.red}33` },
    success: { background: T.greenBg, color: T.green, border: `1px solid ${T.green}33` },
    outline: { background: "transparent", color: T.inkMid, border: `1px solid ${T.border}` },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: small ? "5px 10px" : "7px 14px",
      borderRadius: 3, fontSize: small ? 10 : 11,
      fontWeight: 600, letterSpacing: .5,
      transition: "opacity .12s",
      opacity: disabled ? .45 : 1,
      ...styles[variant], ...s,
    }}>{Icon && <Icon size={small?10:12}/>}{children}</button>
  );
};

const Input = ({ value, onChange, placeholder, type = "text", small, style: s = {}, readOnly }) => (
  <input
    type={type} value={value ?? ""} onChange={e => onChange?.(e.target.value)}
    placeholder={placeholder} readOnly={readOnly}
    style={{
      width: "100%", padding: small ? "5px 8px" : "7px 10px",
      background: readOnly ? T.accent : T.surface,
      border: `1px solid ${T.border}`, borderRadius: 3,
      fontSize: 12, color: T.ink,
      transition: "border-color .12s", ...s,
    }}
    onFocus={e => !readOnly && (e.target.style.borderColor = T.borderMid)}
    onBlur={e => e.target.style.borderColor = T.border}
  />
);

const Select = ({ value, onChange, options, small, style: s = {} }) => (
  <select value={value ?? ""} onChange={e => onChange(e.target.value)} style={{
    width: "100%", padding: small ? "5px 8px" : "7px 10px",
    background: T.surface, border: `1px solid ${T.border}`,
    borderRadius: 3, fontSize: 12, color: T.ink,
    appearance: "none", ...s,
  }}>
    {options.map(o => (
      <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
    ))}
  </select>
);

/* Aliases y componentes faltantes */
const Sel = ({ label, value, onChange, options, ...p }) => (
  <div>
    {label && <label style={{ display:"block", fontSize:10, fontWeight:600, color:T.inkLight, marginBottom:4, textTransform:"uppercase", letterSpacing:0.8 }}>{label}</label>}
    <select value={value ?? ""} onChange={onChange} style={{
      width:"100%", padding:"7px 10px", background:T.surface,
      border:`1px solid ${T.border}`, borderRadius:3, fontSize:12, color:T.ink, appearance:"none",
    }}>
      {(options||[]).map(o => (
        <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
      ))}
    </select>
  </div>
);
const Lbl = ({ children }) => (
  <label style={{ display:"block", fontSize:10, fontWeight:600, color:T.inkLight, marginBottom:4, textTransform:"uppercase", letterSpacing:0.8 }}>{children}</label>
);
const STitle = ({ icon: I, children, color }) => (
  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
    {I && <I size={15} style={{ color: color || T.ink, flexShrink:0 }}/>}
    <span style={{ fontSize:14, fontWeight:700, color: color || T.ink }}>{children}</span>
  </div>
);

const FieldRow = ({ label, children, note }) => (
  <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 12, alignItems: "center", marginBottom: 10 }}>
    <div>
      <Label>{label}</Label>
      {note && <div style={{ fontSize: 9, color: T.inkLight, marginTop: 2 }}>{note}</div>}
    </div>
    {children}
  </div>
);

const Card = ({ children, style: s = {} }) => (
  <div style={{
    background: T.surface, border: `1px solid ${T.border}`,
    borderRadius: 4, padding: "18px 20px",
    boxShadow: T.shadow, ...s
  }}>{children}</div>
);

const SectionTitle = ({ children, action }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
    <h3 style={{ fontSize: 13, fontWeight: 700, letterSpacing: .3, color: T.ink }}>{children}</h3>
    {action}
  </div>
);

const KpiBox = ({ label, value, sub, color = T.ink, icon: I }) => (
  <div style={{
    background: T.surface, border: `1px solid ${T.border}`,
    borderRadius: 4, padding: "14px 16px", flex: 1,
  }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <Label>{label}</Label>
      {I && <I size={13} color={T.inkXLight} />}
    </div>
    <div style={{ marginTop: 8, fontSize: 22, fontWeight: 700, color, lineHeight: 1 }} className="mono">{value}</div>
    {sub && <div style={{ marginTop: 4, fontSize: 10, color: T.inkLight }}>{sub}</div>}
  </div>
);

/* ─────────────────────────────────────────────
   TABS: CARGOS Y SALARIOS
───────────────────────────────────────────── */

function TabCargos({ cargos, saveCargos, jornada }) {
  const [form, setForm]   = useState(null); // null=closed, obj=editing
  const [isNew, setIsNew] = useState(false);

  const totalHorasProd = useMemo(() => {
    const j = jornada;
    const diasLab = j.diasSemana * j.semanasAnio - j.diasFestivos - j.diasAusencias;
    return diasLab * j.hDia * (j.pctProductivas / 100);
  }, [jornada]);

  const costoTotal = (c) => {
    const base = Number(c.salarioBruto) || 0;
    const factor = 1 + (Number(c.prestaciones) + Number(c.segSocial) + Number(c.parafiscales)) / 100;
    return base * factor;
  };
  const costoHora = (c) => totalHorasProd > 0 ? costoTotal(c) / totalHorasProd : 0;

  const openNew  = () => { setForm(DEF_CARGO()); setIsNew(true); };
  const openEdit = (c) => { setForm({ ...c }); setIsNew(false); };
  const close    = () => setForm(null);

  const save = () => {
    if (!form.nombre) return;
    saveCargos(prev =>
      isNew ? [...prev, form] : prev.map(c => c.id === form.id ? form : c)
    );
    close();
  };
  const del = (id) => saveCargos(prev => prev.filter(c => c.id !== id));
  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fade-up">
      {/* KPIs */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
        <KpiBox label="Cargos activos"    value={cargos.filter(c=>c.activo).length}           icon={Users} />
        <KpiBox label="Masa salarial/mes" value={fmt(cargos.filter(c=>c.activo).reduce((s,c)=>s+costoTotal(c)/12,0))} icon={DollarSign} />
        <KpiBox label="Horas productivas/año" value={fmtN(totalHorasProd)} sub="por empleado (config. en Jornada)" icon={Clock} color={T.blue} />
        <KpiBox label="Rango coste/hora"
          value={cargos.length
            ? `${fmt(Math.min(...cargos.map(costoHora)))} – ${fmt(Math.max(...cargos.map(costoHora)))}`
            : "—"
          } sub="sin estructura" icon={TrendingUp} color={T.green} />
      </div>

      <Card>
        <SectionTitle action={<Btn variant="primary" small onClick={openNew}><Plus size={12}/>Nuevo cargo</Btn>}>
          Cargos y Salarios
        </SectionTitle>

        {cargos.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: T.inkLight }}>
            <Users size={32} style={{ opacity: .2, marginBottom: 10 }} />
            <p style={{ fontSize: 12 }}>Sin cargos registrados. Añade el primero.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${T.border}` }}>
                  {["Cargo", "Salario bruto/año", "Prestac.", "Seg. Social", "Parafiscal", "Costo total/año", "Costo/hora", ""].map(h => (
                    <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", color: T.inkLight, fontWeight: 700 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cargos.map(c => (
                  <tr key={c.id} style={{ borderBottom: `1px solid ${T.border}`, transition: "background .1s" }}
                    onMouseEnter={e => e.currentTarget.style.background = T.surfaceAlt}
                    onMouseLeave={e => e.currentTarget.style.background = ""}>
                    <td style={{ padding: "10px 10px" }}>
                      <span style={{ fontWeight: 600, color: T.ink }}>{c.nombre || "—"}</span>
                      {!c.activo && <Badge color={T.amber} bg={T.amberBg} style={{ marginLeft: 6 }}>Inactivo</Badge>}
                    </td>
                    <td style={{ padding: "10px 10px" }} className="mono">{fmt(c.salarioBruto)}</td>
                    <td style={{ padding: "10px 10px", color: T.inkMid }} className="mono">{pct(c.prestaciones)}</td>
                    <td style={{ padding: "10px 10px", color: T.inkMid }} className="mono">{pct(c.segSocial)}</td>
                    <td style={{ padding: "10px 10px", color: T.inkMid }} className="mono">{pct(c.parafiscales)}</td>
                    <td style={{ padding: "10px 10px", fontWeight: 600 }} className="mono">{fmt(costoTotal(c))}</td>
                    <td style={{ padding: "10px 10px" }}>
                      <Badge color={T.green} bg={T.greenBg}>{fmt(costoHora(c))}/h</Badge>
                    </td>
                    <td style={{ padding: "10px 10px" }}>
                      <div style={{ display: "flex", gap: 4 }}>
                        <Btn small variant="ghost" onClick={() => openEdit(c)}><Edit3 size={11}/></Btn>
                        <Btn small variant="danger" onClick={() => del(c.id)}><Trash2 size={11}/></Btn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal form */}
      {form && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 200,
          display: "flex", alignItems: "center", justifyContent: "center",
        }} onClick={close}>
          <div className="pop-in" style={{
            background: T.surface, borderRadius: 6, padding: 28,
            width: 480, boxShadow: T.shadowMd,
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 20, fontSize: 15, fontWeight: 700 }}>
              {isNew ? "Nuevo cargo" : "Editar cargo"}
            </h3>
            <FieldRow label="Nombre del cargo">
              <Input value={form.nombre} onChange={v => upd("nombre", v)} placeholder="Ej. Diseñador Senior" />
            </FieldRow>
            <FieldRow label="Salario bruto anual" note="COP · sin prestaciones">
              <Input type="number" value={form.salarioBruto} onChange={v => upd("salarioBruto", v)} />
            </FieldRow>
            <div style={{ background: T.accent, borderRadius: 3, padding: "12px 14px", marginBottom: 12 }}>
              <p style={{ fontSize: 10, color: T.inkLight, marginBottom: 8 }}>CARGAS SOCIALES SOBRE SALARIO</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                {[
                  { k: "prestaciones", lbl: "Prestaciones (%)", note: "~52.18" },
                  { k: "segSocial",    lbl: "Seg. Social (%)",  note: "~12.5" },
                  { k: "parafiscales", lbl: "Parafiscales (%)", note: "~9.0" },
                ].map(f => (
                  <div key={f.k}>
                    <Label>{f.lbl}</Label>
                    <Input type="number" value={form[f.k]} onChange={v => upd(f.k, v)} small style={{ marginTop: 4 }} />
                  </div>
                ))}
              </div>
            </div>
            {form.salarioBruto > 0 && (
              <div style={{ background: T.greenBg, borderRadius: 3, padding: "10px 14px", marginBottom: 16, display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, color: T.green }}>Costo total empleador/año</span>
                <strong style={{ fontSize: 13, color: T.green }} className="mono">{fmt(costoTotal(form))}</strong>
              </div>
            )}
            <FieldRow label="Estado">
              <Select value={form.activo ? "true" : "false"} onChange={v => upd("activo", v === "true")}
                options={[{value:"true",label:"Activo"},{value:"false",label:"Inactivo"}]} />
            </FieldRow>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20, paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
              <Btn variant="outline" onClick={close}>Cancelar</Btn>
              <Btn variant="primary" onClick={save}><Save size={12}/>Guardar</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   TABS: JORNADA LABORAL
───────────────────────────────────────────── */

function TabJornada({ jornada, saveJornada }) {
  const [form, setForm] = useState({ ...jornada });
  const [saved, setSaved] = useState(false);
  const upd = (k, v) => setForm(f => ({ ...f, [k]: Number(v) || 0 }));

  const diasLaborales = useMemo(() => {
    return form.diasSemana * form.semanasAnio - form.diasFestivos - form.diasAusencias;
  }, [form]);
  const horasTotales   = diasLaborales * form.hDia;
  const horasProd      = horasTotales * (form.pctProductivas / 100);
  const horasVacac     = form.diasVacaciones * form.hDia;
  const horasEfectivas = Math.max(0, horasProd - horasVacac);

  const doSave = async () => {
    await saveJornada(form); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const campo = (lbl, k, note, unit = "") => (
    <div key={k} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 3, padding: "12px 14px" }}>
      <Label>{lbl}</Label>
      {note && <div style={{ fontSize: 9, color: T.inkLight, marginTop: 1, marginBottom: 6 }}>{note}</div>}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: note ? 0 : 6 }}>
        <Input type="number" value={form[k]} onChange={v => upd(k, v)} style={{ flex: 1 }} />
        {unit && <span style={{ fontSize: 11, color: T.inkLight, whiteSpace: "nowrap" }}>{unit}</span>}
      </div>
    </div>
  );

  return (
    <div className="fade-up">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 16 }}>
        {/* Configuración */}
        <div>
          <Card>
            <SectionTitle>Configuración de jornada</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {campo("Horas por día",       "hDia",          null,         "h/día")}
              {campo("Días a la semana",     "diasSemana",    null,         "días")}
              {campo("Semanas al año",       "semanasAnio",   null,         "semanas")}
              {campo("% Horas productivas",  "pctProductivas","Reuniones, dessp., admin.", "%")}
              {campo("Días de vacaciones",   "diasVacaciones","Según contrato", "días/año")}
              {campo("Festivos nacionales",  "diasFestivos",  "Colombia 2025", "días")}
              {campo("Ausencias estimadas",  "diasAusencias", "Prom. bajas / permisos", "días/año")}
            </div>
            <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
              <Btn variant="primary" onClick={doSave}>
                {saved ? <><CheckCircle size={12}/>Guardado</> : <><Save size={12}/>Guardar</>}
              </Btn>
            </div>
          </Card>
        </div>

        {/* Resumen calculado */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Card>
            <SectionTitle>Cálculo anual por empleado</SectionTitle>
            {[
              { lbl: "Días laborales brutos",     val: fmtN(form.diasSemana * form.semanasAnio), unit: "días" },
              { lbl: "Menos festivos",            val: `– ${form.diasFestivos}`, unit: "días", color: T.red },
              { lbl: "Menos ausencias estimadas", val: `– ${form.diasAusencias}`, unit: "días", color: T.amber },
              { lbl: "Días laborales efectivos",  val: fmtN(diasLaborales), unit: "días", bold: true },
              null,
              { lbl: "Horas brutas totales",      val: fmtN(horasTotales), unit: "h" },
              { lbl: "Horas productivas efectivas", val: fmtN(horasProd), unit: "h", color: T.inkMid },
              { lbl: "Menos horas vacaciones",    val: `– ${horasVacac}`, unit: "h", color: T.red },
            ].map((r, i) => r === null
              ? <div key={i} style={{ borderTop: `1px dashed ${T.border}`, margin: "6px 0" }} />
              : (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0" }}>
                  <span style={{ fontSize: 12, color: T.inkMid }}>{r.lbl}</span>
                  <span style={{ fontSize: 12, fontWeight: r.bold ? 700 : 400, color: r.color || T.ink }} className="mono">
                    {r.val} <span style={{ color: T.inkLight, fontSize: 10 }}>{r.unit}</span>
                  </span>
                </div>
              )
            )}
            <div style={{ marginTop: 10, background: T.greenBg, borderRadius: 3, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <Label>Horas productivas netas / año</Label>
                <div style={{ fontSize: 9, color: T.green, marginTop: 2 }}>Base para cálculo de coste/hora</div>
              </div>
              <span style={{ fontSize: 26, fontWeight: 800, color: T.green }} className="mono">{fmtN(horasEfectivas)}</span>
            </div>
          </Card>

          <Card>
            <SectionTitle>¿Cómo se usa este dato?</SectionTitle>
            <p style={{ fontSize: 11, color: T.inkMid, lineHeight: 1.6 }}>
              Las <strong>{fmtN(horasEfectivas)} horas productivas</strong> son el denominador del cálculo de coste/hora por cargo:
            </p>
            <div style={{ marginTop: 10, background: T.accent, borderRadius: 3, padding: "10px 12px", fontFamily: "'DM Mono', monospace", fontSize: 11, color: T.inkMid, lineHeight: 1.8 }}>
              Coste/hora = Costo empleador anual ÷ {fmtN(horasEfectivas)} h<br/>
              <span style={{ color: T.inkLight, fontSize: 10 }}>+ fracción de estructura (activos + licencias + gastos generales)</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   TABS: ACTIVOS & LICENCIAS (combined)
───────────────────────────────────────────── */

function TabActivos({ activos, saveActivos, licencias, saveLicencias, gastos, saveGastos }) {
  const [subTab, setSubTab] = useState("activos");
  const [formA, setFormA]   = useState(null);
  const [formL, setFormL]   = useState(null);
  const [formG, setFormG]   = useState(null);

  // Totales
  const totalDepAnual  = activos.reduce((s, a) => s + (a.valorCompra / a.vidaUtilAnios || 0), 0);
  const totalLicAnual  = licencias.reduce((s, l) => s + Number(l.costoAnual || 0), 0);
  const totalGastMes   = gastos.reduce((s, g) => s + Number(g.montoMensual || 0), 0);
  const totalEstructura = totalDepAnual + totalLicAnual + totalGastMes * 12;

  const saveItem = (lista, setLista, form, isNew) => {
    setLista(prev => isNew ? [...prev, form] : prev.map(x => x.id === form.id ? form : x));
    setFormA(null); setFormL(null); setFormG(null);
  };

  const miniTab = (id, lbl) => (
    <button onClick={() => setSubTab(id)} style={{
      padding: "6px 14px", background: subTab === id ? T.ink : "transparent",
      color: subTab === id ? "#fff" : T.inkMid,
      border: `1px solid ${subTab === id ? T.ink : T.border}`,
      borderRadius: 3, fontSize: 11, fontWeight: 600, letterSpacing: .5,
      cursor: "pointer",
    }}>{lbl}</button>
  );

  return (
    <div className="fade-up">
      <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
        <KpiBox label="Depreciación anual activos" value={fmt(totalDepAnual)}     icon={Package} />
        <KpiBox label="Licencias / año"            value={fmt(totalLicAnual)}     icon={Monitor} />
        <KpiBox label="Gastos generales / año"     value={fmt(totalGastMes * 12)} icon={Briefcase} />
        <KpiBox label="Total estructura / año"     value={fmt(totalEstructura)}   icon={TrendingUp} color={T.blue}
          sub="se prorratea sobre las horas productivas" />
      </div>

      <Card>
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          {miniTab("activos",   "Activos NIIF")}
          {miniTab("licencias", "Licencias Software")}
          {miniTab("gastos",    "Gastos Generales")}
        </div>

        {/* ── ACTIVOS ── */}
        {subTab === "activos" && (
          <>
            <SectionTitle action={<Btn small variant="primary" onClick={() => setFormA({...DEF_ACTIVO(), isNew:true})}><Plus size={12}/>Nuevo activo</Btn>}>
              Inventario de Activos
            </SectionTitle>
            <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead><tr style={{ borderBottom:`2px solid ${T.border}`, background:T.surfaceAlt }}>
                {["Activo","Categoría NIIF","Año compra","Valor compra","Vida útil","Dep./año","Dep. acumulada","Valor neto","Costo/hora"].map(h=>(
                  <th key={h} style={{ padding:"8px 10px",textAlign:"left",fontSize:9,letterSpacing:1.2,textTransform:"uppercase",color:T.inkLight,fontWeight:700,whiteSpace:"nowrap" }}>{h}</th>
                ))}
                <th></th>
              </tr></thead>
              <tbody>
                {activos.length === 0 && <tr><td colSpan={10} style={{ textAlign:"center", padding:"36px 0", color:T.inkLight, fontSize:12 }}>
                  Sin activos registrados. Pulsa «Nuevo activo» para añadir el primero.
                </td></tr>}
                {activos.map(a => {
                  const dep         = a.vidaUtilAnios > 0 ? a.valorCompra / a.vidaUtilAnios : 0;
                  const aniosUsados = Math.min(anioActual - Number(a.anioCompra||anioActual), Number(a.vidaUtilAnios));
                  const depAcum     = dep * Math.max(0, aniosUsados);
                  const valorNeto   = Math.max(0, a.valorCompra - depAcum);
                  const chUso       = a.usoAnual > 0 ? dep / a.usoAnual : 0;
                  const pctAmort    = a.valorCompra > 0 ? (depAcum / a.valorCompra * 100) : 0;
                  const niif        = NIIF_CATS.find(n => n.cat === a.categoria);
                  const colorNeto   = pctAmort >= 90 ? T.red : pctAmort >= 60 ? T.amber : T.green;
                  return (
                    <tr key={a.id} style={{ borderBottom:`1px solid ${T.border}` }}
                      onMouseEnter={e=>e.currentTarget.style.background=T.surfaceAlt}
                      onMouseLeave={e=>e.currentTarget.style.background=""}>
                      <td style={{ padding:"10px 10px" }}>
                        <div style={{ fontWeight:600, color:T.ink }}>{a.nombre||"—"}</div>
                        {a.baseNiif && <div style={{ fontSize:9, color:T.inkLight, marginTop:1 }}>{a.baseNiif}</div>}
                      </td>
                      <td style={{ padding:"10px 10px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                          <span>{niif?.icono || "📎"}</span>
                          <span style={{ fontSize:11, color:T.inkMid }}>{a.categoria||"—"}</span>
                        </div>
                      </td>
                      <td className="mono" style={{ padding:"10px 10px", textAlign:"center", color:T.inkMid }}>{a.anioCompra||"—"}</td>
                      <td className="mono" style={{ padding:"10px 10px" }}>{fmt(a.valorCompra)}</td>
                      <td style={{ padding:"10px 10px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                          <span className="mono" style={{ fontSize:12, fontWeight:600 }}>{a.vidaUtilAnios} años</span>
                          {a.vidaUtilEditada && <Badge color={T.amber} bg={T.amberBg}>Manual</Badge>}
                        </div>
                        <div style={{ fontSize:9, color:T.inkLight }}>{a.metodo}</div>
                      </td>
                      <td className="mono" style={{ padding:"10px 10px" }}>{fmt(dep)}</td>
                      <td style={{ padding:"10px 10px" }}>
                        <div className="mono" style={{ fontSize:12 }}>{fmt(depAcum)}</div>
                        <div style={{ marginTop:3, background:T.accent, borderRadius:2, height:3 }}>
                          <div style={{ width:`${Math.min(pctAmort,100)}%`, height:"100%", borderRadius:2,
                            background: pctAmort>=90?T.red:pctAmort>=60?T.amber:T.blue }} />
                        </div>
                        <div style={{ fontSize:9, color:T.inkLight, marginTop:1 }}>{pctAmort.toFixed(0)}% amortizado</div>
                      </td>
                      <td style={{ padding:"10px 10px" }}>
                        <span className="mono" style={{ fontSize:12, fontWeight:700, color:colorNeto }}>{fmt(valorNeto)}</span>
                        {valorNeto === 0 && <div style={{ fontSize:9, color:T.red }}>Totalmente amortizado</div>}
                      </td>
                      <td style={{ padding:"10px 10px" }}>
                        <Badge color={T.blue} bg={T.blueBg}>{fmt(chUso)}/h</Badge>
                      </td>
                      <td style={{ padding:"10px 10px" }}>
                        <div style={{display:"flex",gap:4}}>
                          <Btn small variant="ghost" onClick={()=>setFormA({...a,isNew:false})}><Edit3 size={11}/></Btn>
                          <Btn small variant="danger" onClick={()=>saveActivos(p=>p.filter(x=>x.id!==a.id))}><Trash2 size={11}/></Btn>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
            {activos.length > 0 && (
              <div style={{ marginTop:12, display:"flex", gap:12, flexWrap:"wrap" }}>
                {[
                  { lbl:"Total en libros (valor neto)", val: fmt(activos.reduce((s,a)=>{
                      const dep=a.vidaUtilAnios>0?a.valorCompra/a.vidaUtilAnios:0;
                      const ac=dep*Math.min(anioActual-Number(a.anioCompra||anioActual),Number(a.vidaUtilAnios));
                      return s+Math.max(0,a.valorCompra-ac);
                    },0)), color:T.ink },
                  { lbl:"Dep. anual total en estructura", val: fmt(activos.reduce((s,a)=>s+(a.vidaUtilAnios>0?a.valorCompra/a.vidaUtilAnios:0),0)), color:T.blue },
                  { lbl:"Activos totalmente amortizados", val: activos.filter(a=>{
                      const dep=a.vidaUtilAnios>0?a.valorCompra/a.vidaUtilAnios:0;
                      return a.valorCompra-dep*Math.min(anioActual-Number(a.anioCompra||anioActual),Number(a.vidaUtilAnios))<=0;
                    }).length, color:T.red, isNum:true },
                ].map(x => (
                  <div key={x.lbl} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:3, padding:"10px 14px", flex:1, minWidth:160 }}>
                    <Label>{x.lbl}</Label>
                    <div style={{ fontSize:16, fontWeight:700, color:x.color, marginTop:5 }} className="mono">{x.isNum?x.val:x.val}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── LICENCIAS ── */}
        {subTab === "licencias" && (
          <>
            <SectionTitle action={<Btn small variant="primary" onClick={() => setFormL({...DEF_LICENCIA(),isNew:true})}><Plus size={12}/>Nueva licencia</Btn>}>
              Licencias de Software
            </SectionTitle>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead><tr style={{ borderBottom:`2px solid ${T.border}` }}>
                {["Software","Plan","Usuarios","Costo/año","Costo/mes","Costo/hora*"].map(h=>(
                  <th key={h} style={{ padding:"8px 10px",textAlign:"left",fontSize:9,letterSpacing:1.5,textTransform:"uppercase",color:T.inkLight,fontWeight:700 }}>{h}</th>
                ))}
                <th></th>
              </tr></thead>
              <tbody>
                {licencias.length === 0 && <tr><td colSpan={7} style={{ textAlign:"center", padding:"30px 0", color:T.inkLight, fontSize:12 }}>Sin licencias registradas</td></tr>}
                {licencias.map(l => (
                  <tr key={l.id} style={{ borderBottom:`1px solid ${T.border}` }}
                    onMouseEnter={e=>e.currentTarget.style.background=T.surfaceAlt}
                    onMouseLeave={e=>e.currentTarget.style.background=""}>
                    <td style={{ padding:"10px 10px", fontWeight:600 }}>{l.nombre||"—"}</td>
                    <td style={{ padding:"10px 10px", color:T.inkMid }}>{l.plan||"—"}</td>
                    <td className="mono" style={{ padding:"10px 10px", textAlign:"center" }}>{l.usuarios}</td>
                    <td className="mono" style={{ padding:"10px 10px" }}>{fmt(l.costoAnual)}</td>
                    <td className="mono" style={{ padding:"10px 10px", color:T.inkMid }}>{fmt(l.costoAnual/12)}</td>
                    <td style={{ padding:"10px 10px" }}><Badge color={T.blue} bg={T.blueBg}>{fmt(l.costoAnual/1760/l.usuarios||1)}/h</Badge></td>
                    <td style={{ padding:"10px 10px" }}>
                      <div style={{display:"flex",gap:4}}>
                        <Btn small variant="ghost" onClick={()=>setFormL({...l,isNew:false})}><Edit3 size={11}/></Btn>
                        <Btn small variant="danger" onClick={()=>saveLicencias(p=>p.filter(x=>x.id!==l.id))}><Trash2 size={11}/></Btn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ fontSize:9, color:T.inkLight, marginTop:10 }}>* Basado en 1.760 h/año. Se recalcula con la jornada configurada en la pestaña de Jornada.</p>
          </>
        )}

        {/* ── GASTOS GENERALES ── */}
        {subTab === "gastos" && (
          <>
            <SectionTitle action={<Btn small variant="primary" onClick={() => setFormG({...DEF_GASTO(),isNew:true})}><Plus size={12}/>Nuevo gasto</Btn>}>
              Gastos Generales de Empresa
            </SectionTitle>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead><tr style={{ borderBottom:`2px solid ${T.border}` }}>
                {["Concepto","Categoría","Mensual","Anual"].map(h=>(
                  <th key={h} style={{ padding:"8px 10px",textAlign:"left",fontSize:9,letterSpacing:1.5,textTransform:"uppercase",color:T.inkLight,fontWeight:700 }}>{h}</th>
                ))}
                <th></th>
              </tr></thead>
              <tbody>
                {gastos.length === 0 && <tr><td colSpan={5} style={{ textAlign:"center", padding:"30px 0", color:T.inkLight, fontSize:12 }}>Sin gastos registrados</td></tr>}
                {gastos.map(g => (
                  <tr key={g.id} style={{ borderBottom:`1px solid ${T.border}` }}
                    onMouseEnter={e=>e.currentTarget.style.background=T.surfaceAlt}
                    onMouseLeave={e=>e.currentTarget.style.background=""}>
                    <td style={{ padding:"10px 10px", fontWeight:600 }}>{g.concepto||"—"}</td>
                    <td style={{ padding:"10px 10px" }}><Badge>{g.categoria}</Badge></td>
                    <td className="mono" style={{ padding:"10px 10px" }}>{fmt(g.montoMensual)}</td>
                    <td className="mono" style={{ padding:"10px 10px" }}>{fmt(g.montoMensual*12)}</td>
                    <td style={{ padding:"10px 10px" }}>
                      <div style={{display:"flex",gap:4}}>
                        <Btn small variant="ghost" onClick={()=>setFormG({...g,isNew:false})}><Edit3 size={11}/></Btn>
                        <Btn small variant="danger" onClick={()=>saveGastos(p=>p.filter(x=>x.id!==g.id))}><Trash2 size={11}/></Btn>
                      </div>
                    </td>
                  </tr>
                ))}
                {gastos.length > 0 && (
                  <tr style={{ background:T.accent, fontWeight:700 }}>
                    <td colSpan={2} style={{ padding:"10px 10px", fontSize:11 }}>TOTAL GASTOS GENERALES</td>
                    <td className="mono" style={{ padding:"10px 10px" }}>{fmt(totalGastMes)}</td>
                    <td className="mono" style={{ padding:"10px 10px" }}>{fmt(totalGastMes*12)}</td>
                    <td></td>
                  </tr>
                )}
              </tbody>
            </table>
          </>
        )}
      </Card>

      {/* Activo modal */}
      {formA && (() => {
        const niifMatch = NIIF_CATS.find(n => n.cat === formA.categoria);
        const dep        = formA.vidaUtilAnios > 0 ? formA.valorCompra / formA.vidaUtilAnios : 0;
        const aniosUsados= Math.min(anioActual - Number(formA.anioCompra||anioActual), Number(formA.vidaUtilAnios));
        const depAcum    = dep * Math.max(0, aniosUsados);
        const valorNeto  = Math.max(0, formA.valorCompra - depAcum);
        return (
        <Modal title={formA.isNew ? "Nuevo activo NIIF" : "Editar activo"} onClose={() => setFormA(null)} wide>
          {/* Selector de categoría */}
          <div style={{ marginBottom:14 }}>
            <Label>Categoría NIIF</Label>
            <div style={{ marginTop:6, display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:6 }}>
              {NIIF_CATS.map(n => (
                <button key={n.cat} onClick={() => setFormA(f => ({
                  ...f, categoria: n.cat, metodo: n.metodo, baseNiif: n.base,
                  vidaUtilAnios: n.vida, usoAnual: n.usoRef, vidaUtilEditada: false,
                }))} style={{
                  padding:"8px 6px", borderRadius:3, border:`1px solid ${formA.categoria===n.cat?T.ink:T.border}`,
                  background: formA.categoria===n.cat ? T.ink : T.surface,
                  color: formA.categoria===n.cat ? "#fff" : T.inkMid,
                  fontSize:10, cursor:"pointer", textAlign:"center", lineHeight:1.3,
                  fontFamily:"'Outfit',sans-serif",
                }}>
                  <div style={{ fontSize:18, marginBottom:3 }}>{n.icono}</div>
                  <div style={{ fontWeight: formA.categoria===n.cat ? 700 : 400 }}>{n.cat}</div>
                </button>
              ))}
            </div>
            {niifMatch && (
              <div style={{ marginTop:8, background:T.blueBg, borderRadius:3, padding:"8px 12px", display:"flex", gap:12, alignItems:"flex-start" }}>
                <div style={{ flex:1 }}>
                  <span style={{ fontSize:10, fontWeight:700, color:T.blue }}>Norma aplicable: </span>
                  <span style={{ fontSize:10, color:T.blue }}>{niifMatch.base}</span>
                </div>
                <div style={{ flex:2, fontSize:10, color:T.blue, opacity:.8 }}>{niifMatch.nota}</div>
              </div>
            )}
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:8 }}>
            <FieldRow label="Nombre del activo">
              <Input value={formA.nombre} onChange={v=>setFormA(f=>({...f,nombre:v}))} placeholder="Ej. MacBook Pro 14 M3"/>
            </FieldRow>
            <FieldRow label="Año de compra">
              <Input type="number" value={formA.anioCompra}
                onChange={v=>setFormA(f=>({...f,anioCompra:v}))}
                placeholder={String(anioActual)}/>
            </FieldRow>
            <FieldRow label="Valor de compra (COP)">
              <Input type="number" value={formA.valorCompra} onChange={v=>setFormA(f=>({...f,valorCompra:v}))}/>
            </FieldRow>
            <FieldRow label="Horas de uso estimadas/año">
              <Input type="number" value={formA.usoAnual} onChange={v=>setFormA(f=>({...f,usoAnual:v}))}/>
            </FieldRow>
          </div>

          {/* Vida útil: auto o manual */}
          <div style={{ background:T.accent, borderRadius:3, padding:"12px 14px", marginBottom:12 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
              <Label>Vida útil (años)</Label>
              <button onClick={() => setFormA(f=>({...f, vidaUtilEditada:!f.vidaUtilEditada}))} style={{
                fontSize:9, color:T.blue, background:"none", border:"none", cursor:"pointer", textDecoration:"underline"
              }}>
                {formA.vidaUtilEditada ? "← Restaurar valor NIIF" : "Editar manualmente"}
              </button>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
              <div>
                <Label>Vida útil</Label>
                <Input type="number" value={formA.vidaUtilAnios}
                  readOnly={!formA.vidaUtilEditada}
                  onChange={v=>setFormA(f=>({...f,vidaUtilAnios:v,vidaUtilEditada:true}))}
                  style={{ marginTop:4, background: formA.vidaUtilEditada ? T.surface : T.accent }}/>
                {niifMatch && !formA.vidaUtilEditada && (
                  <div style={{ fontSize:9, color:T.green, marginTop:2 }}>✓ Según {niifMatch.base}</div>
                )}
              </div>
              <div>
                <Label>Método</Label>
                <Input value={formA.metodo} readOnly style={{ marginTop:4, background:T.accent }}/>
              </div>
              <div>
                <Label>Norma</Label>
                <Input value={formA.baseNiif} readOnly style={{ marginTop:4, background:T.accent, fontSize:10 }}/>
              </div>
            </div>
          </div>

          {/* Preview depreciación */}
          {formA.valorCompra > 0 && formA.vidaUtilAnios > 0 && (
            <div style={{ background:T.greenBg, borderRadius:3, padding:"12px 14px", marginBottom:8 }}>
              <Label>Vista previa de depreciación</Label>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginTop:8 }}>
                {[
                  { lbl:"Dep. anual",       val:fmt(dep) },
                  { lbl:"Dep. acumulada",   val:fmt(depAcum) },
                  { lbl:"Valor neto libros",val:fmt(valorNeto), bold:true },
                  { lbl:"Costo/hora uso",   val:fmt(formA.usoAnual>0?dep/formA.usoAnual:0)+"/h" },
                ].map(x=>(
                  <div key={x.lbl}>
                    <div style={{ fontSize:9, color:T.green, marginBottom:3 }}>{x.lbl}</div>
                    <div style={{ fontSize:13, fontWeight:x.bold?800:600, color:T.green }} className="mono">{x.val}</div>
                  </div>
                ))}
              </div>
              {depAcum >= formA.valorCompra && (
                <div style={{ marginTop:8, fontSize:10, color:T.red, fontWeight:600 }}>
                  ⚠️ Este activo está totalmente amortizado. Considera darlo de baja o actualizar el año de compra.
                </div>
              )}
            </div>
          )}

          <ModalFooter onCancel={() => setFormA(null)}
            onSave={() => saveItem(activos, saveActivos, formA, formA.isNew)} />
        </Modal>
        );
      })()}

      {/* Licencia modal */}
      {formL && (
        <Modal title={formL.isNew ? "Nueva licencia" : "Editar licencia"} onClose={() => setFormL(null)}>
          {[["nombre","Software","text"],["plan","Plan","text"],["usuarios","Nº usuarios","number"],["costoAnual","Costo anual (COP)","number"]].map(([k,l,t])=>(
            <FieldRow key={k} label={l}><Input type={t} value={formL[k]} onChange={v=>setFormL(f=>({...f,[k]:v}))}/></FieldRow>
          ))}
          <ModalFooter onCancel={() => setFormL(null)}
            onSave={() => saveItem(licencias, saveLicencias, formL, formL.isNew)} />
        </Modal>
      )}

      {/* Gasto modal */}
      {formG && (
        <Modal title={formG.isNew ? "Nuevo gasto" : "Editar gasto"} onClose={() => setFormG(null)}>
          <FieldRow label="Concepto"><Input value={formG.concepto} onChange={v=>setFormG(f=>({...f,concepto:v}))}/></FieldRow>
          <FieldRow label="Categoría">
            <Select value={formG.categoria} onChange={v=>setFormG(f=>({...f,categoria:v}))}
              options={["Oficina","Comunicaciones","Seguros","Suscripciones","Transporte","Otros"]} />
          </FieldRow>
          <FieldRow label="Monto mensual (COP)">
            <Input type="number" value={formG.montoMensual} onChange={v=>setFormG(f=>({...f,montoMensual:v}))}/>
          </FieldRow>
          <ModalFooter onCancel={() => setFormG(null)}
            onSave={() => saveItem(gastos, saveGastos, formG, formG.isNew)} />
        </Modal>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   TABS: COSTE/HORA
───────────────────────────────────────────── */

function TabEquipo({ equipo, setEquipo, cargos, pais }) {
  const [form, setForm] = useState(null);
  const [busca, setBusca] = useState("");
  const tipos = pais==="CO" ? TIPOS_CONTRATO_CO : TIPOS_CONTRATO_ES;

  const def = () => ({
    id:uid(), nombre:"", documento:"", cargo:cargos[0]?.id||"", email:"", telefono:"",
    tipoContrato:tipos[0], fechaIngreso:today(), pin:"", activo:true, pais, foto:null
  });

  const filtrados = useMemo(()=>equipo.filter(e=>
    !busca || e.nombre.toLowerCase().includes(busca.toLowerCase()) ||
    e.documento?.includes(busca) || e.email?.toLowerCase().includes(busca.toLowerCase())
  ),[equipo,busca]);

  return (
    <div>
      <Row align="center" style={{marginBottom:16}} wrap>
        <div style={{flex:1,fontSize:16,fontWeight:700,color:C.ink}}>Equipo ({equipo.filter(e=>e.activo).length} activos)</div>
        <div style={{position:"relative"}}>
          <Search size={13} style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",color:C.inkLight}}/>
          <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar..." style={{padding:"7px 10px 7px 28px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,outline:"none",width:180}}/>
        </div>
        <Btn icon={Plus} onClick={()=>setForm(def())}>Añadir empleado</Btn>
      </Row>

      {form&&(
        <Card style={{marginBottom:16,border:`1px solid ${C.green}`}}>
          <STitle icon={Users}>Nuevo empleado</STitle>
          <Row gap={14} wrap>
            <Col><Inp label="Nombre completo" req value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})}/></Col>
            <Col><Inp label={pais==="CO"?"Cédula / CC":"DNI / NIE"} req value={form.documento} onChange={e=>setForm({...form,documento:e.target.value})}/></Col>
            <Col><Sel label="Cargo" value={form.cargo} onChange={e=>setForm({...form,cargo:e.target.value})} options={[{value:"",label:"– Sin cargo –"},...cargos.map(c=>({value:c.id,label:c.nombre}))]}/></Col>
          </Row>
          <Row gap={14} wrap>
            <Col><Inp label="Email" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></Col>
            <Col><Inp label="Teléfono" value={form.telefono} onChange={e=>setForm({...form,telefono:e.target.value})}/></Col>
            <Col><Inp label="Fecha ingreso" type="date" value={form.fechaIngreso} onChange={e=>setForm({...form,fechaIngreso:e.target.value})}/></Col>
          </Row>
          <Row gap={14} wrap>
            <Col><Sel label="Tipo contrato" value={form.tipoContrato} onChange={e=>setForm({...form,tipoContrato:e.target.value})} options={tipos}/></Col>
            <Col>
              <Inp label="PIN de 4 dígitos (para fichaje de obra)" type="password" maxLength={4} value={form.pin} onChange={e=>setForm({...form,pin:e.target.value.replace(/\D/g,"").slice(0,4)})} placeholder="••••"/>
              <div style={{fontSize:11,color:C.inkLight,marginTop:-8}}>El trabajador lo usa para fichar en obra</div>
            </Col>
            <Col><div style={{marginBottom:12}}><Lbl>Estado</Lbl>
              <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",marginTop:6}}>
                <input type="checkbox" checked={form.activo} onChange={e=>setForm({...form,activo:e.target.checked})} style={{width:16,height:16}}/>
                <span style={{fontSize:13}}>Empleado activo</span>
              </label>
            </div></Col>
          </Row>
          <Row gap={8}>
            <Btn icon={Check} onClick={()=>{setEquipo(p=>[...p,form]);setForm(null);}}>Guardar</Btn>
            <Btn variant="secondary" onClick={()=>setForm(null)}>Cancelar</Btn>
          </Row>
        </Card>
      )}

      <div style={{overflowX:"auto",border:`1px solid ${C.border}`,borderRadius:8}}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:600}}>
          <thead>
            <tr style={{background:C.bg}}>
              {["Empleado","Cargo","Tipo contrato","Ingreso","Estado","PIN",""].map(h=>(
                <th key={h} style={{padding:"8px 12px",fontSize:11,fontWeight:600,color:C.inkLight,textTransform:"uppercase",letterSpacing:0.4,textAlign:"left",borderBottom:`1px solid ${C.border}`}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.map((e,i)=>{
              const cargo = cargos.find(c=>c.id===e.cargo);
              return (
                <tr key={e.id} style={{background:i%2===0?C.card:C.bg}}>
                  <td style={{padding:"10px 12px"}}>
                    <div style={{fontWeight:600,fontSize:13}}>{e.nombre}</div>
                    <div style={{fontSize:11,color:C.inkLight}}>{e.documento}</div>
                  </td>
                  <td style={{padding:"10px 12px",fontSize:13,color:C.inkMid}}>{cargo?.nombre||"–"}</td>
                  <td style={{padding:"10px 12px",fontSize:12,color:C.inkMid}}>{e.tipoContrato}</td>
                  <td style={{padding:"10px 12px",fontSize:12,color:C.inkMid}}>{fmtDate(e.fechaIngreso)}</td>
                  <td style={{padding:"10px 12px"}}><Badge color={e.activo?C.green:C.inkLight}>{e.activo?"Activo":"Inactivo"}</Badge></td>
                  <td style={{padding:"10px 12px",fontSize:12,color:C.inkLight,fontFamily:"'DM Mono',monospace"}}>{e.pin?"••••":"–"}</td>
                  <td style={{padding:"10px 12px"}}>
                    <button onClick={()=>setEquipo(p=>p.filter(x=>x.id!==e.id))} style={{background:"none",border:"none",cursor:"pointer",color:C.red,padding:2}}><Trash2 size={13}/></button>
                  </td>
                </tr>
              );
            })}
            {filtrados.length===0&&<tr><td colSpan={7} style={{padding:"32px",textAlign:"center",color:C.inkLight,fontSize:13}}>Sin empleados.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}



function TabCosteHora({ cargos, jornada, activos, licencias, gastos, equipos }) {
  const activosCargos  = cargos.filter(c => c.activo);
  const totalEmpls     = activosCargos.length || 1;

  const diasLab = jornada.diasSemana * jornada.semanasAnio - jornada.diasFestivos - jornada.diasAusencias;
  const hProdBruto = diasLab * jornada.hDia * (jornada.pctProductivas / 100);
  const hProdNeto  = Math.max(0, hProdBruto - jornada.diasVacaciones * jornada.hDia);

  const totalDepAnual  = activos.reduce((s,a) => s + (a.valorCompra / (a.vidaUtilAnios||1)), 0);
  const totalLicAnual  = licencias.reduce((s,l) => s + Number(l.costoAnual||0), 0);
  const totalGastAnual = gastos.reduce((s,g) => s + Number(g.montoMensual||0)*12, 0);
  const totalEstructura = totalDepAnual + totalLicAnual + totalGastAnual;

  const estructuraPorEmpl = totalEmpls > 0 ? totalEstructura / totalEmpls : 0;
  const estructuraPorHora = hProdNeto  > 0 ? estructuraPorEmpl / hProdNeto : 0;

  const costoTotalEmpl = (c) => {
    const base = Number(c.salarioBruto) || 0;
    return base * (1 + (Number(c.prestaciones) + Number(c.segSocial) + Number(c.parafiscales)) / 100);
  };
  const costoHoraSalario    = (c) => hProdNeto > 0 ? costoTotalEmpl(c) / hProdNeto : 0;
  const costoHoraTotal      = (c) => costoHoraSalario(c) + estructuraPorHora;

  return (
    <div className="fade-up">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Tabla por cargo */}
        <div>
          <Card>
            <SectionTitle>Coste/hora por cargo</SectionTitle>
            <p style={{ fontSize: 11, color: T.inkMid, marginBottom: 14, lineHeight: 1.5 }}>
              Coste total del empleado dividido entre las <strong>{fmtN(hProdNeto)} horas productivas</strong> netas anuales, más la fracción de estructura.
            </p>
            {activosCargos.length === 0
              ? <p style={{ textAlign:"center", color:T.inkLight, padding:"30px 0", fontSize:12 }}>Configura cargos en la pestaña Cargos</p>
              : (
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                  <thead><tr style={{ borderBottom:`2px solid ${T.border}` }}>
                    {["Cargo","Salario","Estructura","TOTAL/HORA"].map(h=>(
                      <th key={h} style={{ padding:"8px 8px",textAlign:h==="TOTAL/HORA"?"right":"left",fontSize:9,letterSpacing:1.5,textTransform:"uppercase",color:T.inkLight,fontWeight:700 }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {activosCargos.map(c => (
                      <tr key={c.id} style={{ borderBottom:`1px solid ${T.border}` }}>
                        <td style={{ padding:"10px 8px", fontWeight:600 }}>{c.nombre}</td>
                        <td className="mono" style={{ padding:"10px 8px", color:T.inkMid }}>{fmt(costoHoraSalario(c))}/h</td>
                        <td className="mono" style={{ padding:"10px 8px", color:T.inkMid }}>{fmt(estructuraPorHora)}/h</td>
                        <td style={{ padding:"10px 8px", textAlign:"right" }}>
                          <span style={{ fontSize:15, fontWeight:800, color:T.green }} className="mono">
                            {fmt(costoHoraTotal(c))}/h
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            }
          </Card>
        </div>

        {/* Desglose estructura */}
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <Card>
            <SectionTitle>Desglose de estructura</SectionTitle>
            {[
              { lbl:"Depreciación activos/año", val:totalDepAnual,   color:T.inkMid },
              { lbl:"Licencias software/año",   val:totalLicAnual,   color:T.inkMid },
              { lbl:"Gastos generales/año",      val:totalGastAnual,  color:T.inkMid },
              { lbl:"Total estructura/año",      val:totalEstructura, bold:true },
              null,
              { lbl:`Nº de empleados activos`,   val:totalEmpls,      unit:"cargos", isNum:true },
              { lbl:"Estructura por empleado",   val:estructuraPorEmpl, color:T.inkMid },
              { lbl:`Horas productivas netas`,   val:hProdNeto, unit:"h/año", isNum:true },
            ].map((r,i) => r === null
              ? <div key={i} style={{ borderTop:`1px dashed ${T.border}`, margin:"6px 0" }} />
              : (
                <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0" }}>
                  <span style={{ fontSize:11, color:T.inkMid }}>{r.lbl}</span>
                  <span style={{ fontSize:12, fontWeight:r.bold?700:400, color:r.color||T.ink }} className="mono">
                    {r.isNum ? `${fmtN(r.val)} ${r.unit||""}` : fmt(r.val)}
                  </span>
                </div>
              )
            )}
            <div style={{ marginTop:10, background:T.blueBg, borderRadius:3, padding:"12px 14px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <Label>Estructura por hora productiva</Label>
                <div style={{ fontSize:9, color:T.blue, marginTop:2 }}>Se suma al coste de cada cargo</div>
              </div>
              <span style={{ fontSize:22, fontWeight:800, color:T.blue }} className="mono">{fmt(estructuraPorHora)}/h</span>
            </div>
          </Card>

          <Card>
            <SectionTitle>Uso en Ofertas — Entregables</SectionTitle>
            <p style={{ fontSize:11, color:T.inkMid, lineHeight:1.6 }}>
              Cuando crees un APU de Mano de Obra o uses la pestaña <strong>Entregables</strong> en Ofertas, podrás seleccionar el cargo y el sistema calculará automáticamente el coste total con estas cifras.
            </p>
            <div style={{ marginTop:12, background:T.accent, borderRadius:3, padding:"10px 12px" }}>
              <p style={{ fontSize:10, color:T.inkLight, marginBottom:6 }}>EJEMPLO: 120 horas de Diseñador Senior</p>
              {activosCargos[0] ? (
                <div style={{ display:"flex", justifyContent:"space-between" }}>
                  <span style={{ fontSize:12, color:T.inkMid }}>120 h × {fmt(costoHoraTotal(activosCargos[0]))}/h</span>
                  <strong style={{ fontSize:13, color:T.green }} className="mono">{fmt(120 * costoHoraTotal(activosCargos[0]))}</strong>
                </div>
              ) : <span style={{ fontSize:11, color:T.inkLight }}>Añade cargos para ver el ejemplo</span>}
            </div>
          </Card>
        </div>
      </div>
      {/* Coste por equipo */}
      {equipos&&equipos.filter(e=>e.activo&&(e.miembros||[]).length>0).length>0&&(()=>{
        const chCargo=(c)=>{const b=Number(c.salarioBruto)||0;const f=1+(Number(c.prestaciones)+Number(c.segSocial)+Number(c.parafiscales))/100;return horasProd>0?(b*f)/horasProd:0;};
        const chEq=(eq)=>(eq.miembros||[]).reduce((s,m)=>{const c=cargos.find(x=>x.id===m.cargoId);return c?s+chCargo(c)*(m.pctDedicacion/100):s;},0);
        return(
          <Card style={{marginTop:16}}>
            <SectionTitle>Coste / Hora por Equipo de Trabajo</SectionTitle>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead><tr style={{borderBottom:`2px solid ${T.border}`}}>
                  {["Equipo","Tipo","Cargos","Coste MO/h","+ Estructura/h","Total/h"].map(h=>(
                    <th key={h} style={{padding:"8px 10px",textAlign:"left",fontSize:9,letterSpacing:1.2,textTransform:"uppercase",color:T.inkLight,fontWeight:700}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>{equipos.filter(e=>e.activo).map(eq=>{
                  const ch=chEq(eq); const tot=ch+estructura;
                  return(
                    <tr key={eq.id} style={{borderBottom:`1px solid ${T.border}`}}>
                      <td style={{padding:"10px"}}><strong>{eq.nombre}</strong></td>
                      <td style={{padding:"10px",color:T.inkMid}}>{eq.tipo}</td>
                      <td style={{padding:"10px",fontSize:11,color:T.inkMid}}>{(eq.miembros||[]).map(m=>m.cargoNombre).filter(Boolean).join(", ")||"—"}</td>
                      <td style={{padding:"10px"}}><Badge color={T.blue} bg={T.blueBg}>{fmt(ch)}/h</Badge></td>
                      <td style={{padding:"10px"}} className="mono">{fmt(estructura)}/h</td>
                      <td style={{padding:"10px"}}><Badge color={T.green} bg={T.greenBg}>{fmt(tot)}/h</Badge></td>
                    </tr>
                  );
                })}</tbody>
              </table>
            </div>
          </Card>
        );
      })()}
    </div>
  );
}

/* ─────────────────────────────────────────────
   TABS: PARTES DE TRABAJO
───────────────────────────────────────────── */

function TabPartes({ partes, setPartes, equipo, cargos, currentUser, pais }) {
  const [form, setForm] = useState(null);
  const [verParte, setVerParte] = useState(null);
  const [filtroOT, setFiltroOT] = useState("todas");

  // OTs y actividades desde el CRM (exportadas al Gantt)
  const [actividadesGantt, setActividadesGantt] = useState({});
  useEffect(()=>{
    // Cargar actividades de todos los proyectos exportados desde CRM
    const all = {};
    try {
      if (window.storage) {
        // Buscar todas las claves hab:proj:actividades:*
        const listed = window.storage.list?.("hab:proj:actividades:");
        if (listed?.keys) {
          listed.keys.forEach(k=>{
            try {
              const data = window.storage.get?.(k);
              if (data?.value) {
                const acts = JSON.parse(data.value);
                const otId = k.replace("hab:proj:actividades:","");
                all[otId] = acts;
              }
            } catch{}
          });
        }
      }
    } catch{}
    setActividadesGantt(all);
  },[]);

  const puedeCrear = !currentUser || ROLES_PARTE.includes(currentUser.rol);
  const otIds = [...new Set(partes.map(p=>p.otId).filter(Boolean))];

  const defParte = () => ({
    id:uid(), fecha:today(), encargadoId:currentUser?.id||"",
    encargadoNombre:currentUser?.nombre||"",
    otId:"", actividadId:"", actividadNombre:"",
    trabajadores:[], horasPorTrabajador:{},
    avance:0, notas:"", fotos:[], estado:"borrador",
    creadoEn:nowISO(),
  });

  const miEquipo = useMemo(()=>{
    if (!currentUser) return equipo;
    // El encargado solo ve su equipo directo (activos)
    return equipo.filter(e=>e.activo);
  },[equipo,currentUser]);

  const actividadesOT = (otId) => actividadesGantt[otId] || [];
  const otIdsList = Object.keys(actividadesGantt);

  const filtrados = useMemo(()=>
    partes.filter(p=>filtroOT==="todas"||p.otId===filtroOT)
  ,[partes,filtroOT]);

  return (
    <div>
      {/* Header */}
      <Row align="center" style={{marginBottom:16}} wrap>
        <div style={{flex:1,fontSize:16,fontWeight:700,color:C.ink}}>Partes de Trabajo ({partes.length})</div>
        {!puedeCrear&&<Badge color={C.amber}>Solo encargados y supervisores pueden crear partes</Badge>}
        {puedeCrear&&<Btn icon={Plus} onClick={()=>setForm(defParte())}>Nuevo parte</Btn>}
      </Row>

      {/* Info box */}
      <div style={{background:C.blueL,border:`1px solid ${C.blue}22`,borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:12,color:C.blue}}>
        <strong>Reglas de partes:</strong> Solo el encargado/supervisor/jefe crea partes. Selecciona la OT → la actividad del Gantt (definida en el borrador de costes del CRM) → el equipo que trabajó. El avance del Gantt se actualiza automáticamente.
      </div>

      {/* Formulario nuevo parte */}
      {form&&(
        <Card style={{marginBottom:16,border:`1px solid ${C.green}`}}>
          <STitle icon={FileText} color={C.green}>Nuevo parte de trabajo</STitle>

          <Row gap={14} wrap>
            <Col>
              <Inp label="Fecha" type="date" value={form.fecha} onChange={e=>setForm({...form,fecha:e.target.value})}/>
            </Col>
            <Col>
              <Inp label="Encargado responsable" value={form.encargadoNombre||currentUser?.nombre||""} disabled/>
            </Col>
          </Row>

          {/* Selección OT */}
          <div style={{marginBottom:12}}>
            <Lbl req>OT / Proyecto</Lbl>
            {otIdsList.length===0 ? (
              <div style={{padding:"10px 12px",background:C.amberL,borderRadius:6,fontSize:12,color:C.amber}}>
                ⚠️ No hay OTs con actividades del Gantt. Ve al módulo CRM, completa el borrador de costes de una oferta ganada y usa "Exportar al Gantt".
              </div>
            ) : (
              <select value={form.otId} onChange={e=>{setForm({...form,otId:e.target.value,actividadId:"",actividadNombre:""})}} style={{width:"100%",padding:"8px 10px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,background:C.card}}>
                <option value="">– Seleccionar OT –</option>
                {otIdsList.map(id=>(
                  <option key={id} value={id}>{actividadesGantt[id]?.[0]?.otNombre || id}</option>
                ))}
              </select>
            )}
          </div>

          {/* Actividad del Gantt */}
          {form.otId && (
            <div style={{marginBottom:12}}>
              <Lbl req>Actividad del Gantt</Lbl>
              <select value={form.actividadId} onChange={e=>{
                const act = actividadesOT(form.otId).find(a=>a.id===e.target.value);
                setForm({...form,actividadId:e.target.value,actividadNombre:act?.nombre||""});
              }} style={{width:"100%",padding:"8px 10px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,background:C.card}}>
                <option value="">– Seleccionar actividad –</option>
                {actividadesOT(form.otId).map(a=>(
                  <option key={a.id} value={a.id}>{a.codigo} · {a.nombre} ({a.cantidad} {a.unidad})</option>
                ))}
              </select>
              {form.actividadId && (
                <div style={{marginTop:8}}>
                  <Lbl>% Avance de esta actividad al finalizar hoy</Lbl>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <input type="range" min={0} max={100} step={5} value={form.avance} onChange={e=>setForm({...form,avance:parseInt(e.target.value)})} style={{flex:1}}/>
                    <span style={{fontFamily:"'DM Mono',monospace",fontWeight:700,fontSize:15,color:C.green,minWidth:40}}>{form.avance}%</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Equipo */}
          <div style={{marginBottom:12}}>
            <Lbl>Equipo que trabajó hoy en esta actividad</Lbl>
            <div style={{border:`1px solid ${C.border}`,borderRadius:6,overflow:"hidden"}}>
              {miEquipo.length===0&&<div style={{padding:"12px",fontSize:12,color:C.inkLight}}>Sin empleados en el equipo. Ve a la pestaña Equipo para añadir trabajadores.</div>}
              {miEquipo.map((emp,i)=>{
                const sel = form.trabajadores.includes(emp.id);
                return (
                  <div key={emp.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:sel?C.greenL:i%2===0?C.card:C.bg,borderBottom:`1px solid ${C.border}`,cursor:"pointer"}}
                    onClick={()=>setForm(f=>{
                      const trab = sel ? f.trabajadores.filter(x=>x!==emp.id) : [...f.trabajadores,emp.id];
                      const horas = {...f.horasPorTrabajador};
                      if (!sel) horas[emp.id]=8;
                      else delete horas[emp.id];
                      return {...f,trabajadores:trab,horasPorTrabajador:horas};
                    })}>
                    <input type="checkbox" readOnly checked={sel} style={{width:15,height:15,accentColor:C.green}}/>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:sel?600:400,color:C.ink}}>{emp.nombre}</div>
                      <div style={{fontSize:11,color:C.inkLight}}>{cargos.find(c=>c.id===emp.cargo)?.nombre||"Sin cargo"}</div>
                    </div>
                    {sel&&(
                      <div style={{display:"flex",alignItems:"center",gap:5}} onClick={e=>e.stopPropagation()}>
                        <span style={{fontSize:11,color:C.inkMid}}>Horas:</span>
                        <input type="number" min="0" max="24" step="0.5" value={form.horasPorTrabajador[emp.id]||8}
                          onChange={e=>setForm(f=>({...f,horasPorTrabajador:{...f.horasPorTrabajador,[emp.id]:parseFloat(e.target.value)||0}}))}
                          style={{width:56,border:`1px solid ${C.green}`,borderRadius:4,padding:"3px 6px",fontSize:13,textAlign:"center",fontFamily:"'DM Mono',monospace"}}/>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {form.trabajadores.length>0&&(
              <div style={{fontSize:12,color:C.inkMid,marginTop:6}}>
                Total horas parte: {fmtN(Object.values(form.horasPorTrabajador).reduce((s,h)=>s+h,0),1)} h · {form.trabajadores.length} personas
              </div>
            )}
          </div>

          {/* Notas */}
          <div style={{marginBottom:12}}>
            <Lbl>Observaciones / Notas de obra</Lbl>
            <textarea value={form.notas} onChange={e=>setForm({...form,notas:e.target.value})} rows={2}
              style={{width:"100%",boxSizing:"border-box",padding:"8px 10px",border:`1px solid ${C.border}`,borderRadius:6,fontSize:13,resize:"vertical"}}
              placeholder="Incidencias, materiales consumidos, condiciones de trabajo..."/>
          </div>

          <Row gap={8}>
            <Btn icon={Check} onClick={()=>{
              if (!form.otId||!form.actividadId) {alert("Selecciona OT y actividad.");return;}
              if (form.trabajadores.length===0) {alert("Selecciona al menos un trabajador.");return;}
              const nuevo = {...form, estado:"confirmado"};
              setPartes(p=>[nuevo,...p]);
              // Actualizar avance en storage
              try {
                const key = "hab:proj:actividades:"+form.otId;
                const data = window.storage?.get?.(key);
                if (data?.value) {
                  const acts = JSON.parse(data.value);
                  const updated = acts.map(a=>a.id===form.actividadId?{...a,avance:form.avance}:a);
                  window.storage?.set?.(key,JSON.stringify(updated));
                }
              } catch{}
              setForm(null);
            }}>Confirmar parte</Btn>
            <Btn variant="secondary" onClick={()=>setForm(null)}>Cancelar</Btn>
          </Row>
        </Card>
      )}

      {/* Filtro OT */}
      {otIds.length>0&&(
        <Row gap={6} style={{marginBottom:12}} wrap>
          {["todas",...otIds].map(id=>(
            <button key={id} onClick={()=>setFiltroOT(id)} style={{padding:"5px 12px",borderRadius:20,border:`1px solid ${filtroOT===id?C.green:C.border}`,background:filtroOT===id?C.greenL:"transparent",fontSize:12,cursor:"pointer",color:filtroOT===id?C.green:C.inkMid}}>
              {id==="todas"?"Todas las OTs":id}
            </button>
          ))}
        </Row>
      )}

      {/* Lista partes */}
      <div style={{border:`1px solid ${C.border}`,borderRadius:8,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead>
            <tr style={{background:C.bg}}>
              {["Fecha","OT / Actividad","Encargado","Equipo","Horas totales","Avance","Estado",""].map(h=>(
                <th key={h} style={{padding:"7px 10px",fontSize:11,fontWeight:600,color:C.inkLight,textTransform:"uppercase",letterSpacing:0.4,textAlign:"left",borderBottom:`1px solid ${C.border}`}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.length===0&&<tr><td colSpan={8} style={{padding:"32px",textAlign:"center",color:C.inkLight,fontSize:13}}>Sin partes de trabajo.</td></tr>}
            {filtrados.map((p,i)=>{
              const horasTotal = Object.values(p.horasPorTrabajador||{}).reduce((s,h)=>s+h,0);
              const estadoColor = p.estado==="confirmado"?C.green:p.estado==="validado"?C.blue:C.amber;
              return (
                <tr key={p.id} style={{background:i%2===0?C.card:C.bg,cursor:"pointer"}}
                  onClick={()=>setVerParte(p)}
                  onMouseEnter={e=>e.currentTarget.style.background=C.blueL}
                  onMouseLeave={e=>e.currentTarget.style.background=i%2===0?C.card:C.bg}>
                  <td style={{padding:"9px 10px",fontSize:12}}>{fmtDate(p.fecha)}</td>
                  <td style={{padding:"9px 10px"}}>
                    <div style={{fontWeight:600,fontSize:13}}>{p.otId||"–"}</div>
                    <div style={{fontSize:11,color:C.inkMid}}>{p.actividadNombre}</div>
                  </td>
                  <td style={{padding:"9px 10px",fontSize:12,color:C.inkMid}}>{p.encargadoNombre||"–"}</td>
                  <td style={{padding:"9px 10px",fontSize:12}}>{p.trabajadores?.length||0} personas</td>
                  <td style={{padding:"9px 10px",fontFamily:"'DM Mono',monospace",fontSize:13,fontWeight:600}}>{fmtN(horasTotal,1)} h</td>
                  <td style={{padding:"9px 10px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <div style={{flex:1,height:6,background:C.border,borderRadius:3,overflow:"hidden"}}>
                        <div style={{width:`${p.avance||0}%`,height:"100%",background:p.avance>=80?C.green:p.avance>=40?C.amber:C.blue,borderRadius:3}}/>
                      </div>
                      <span style={{fontSize:11,color:C.inkMid,minWidth:28,fontFamily:"'DM Mono',monospace"}}>{p.avance||0}%</span>
                    </div>
                  </td>
                  <td style={{padding:"9px 10px"}}><Badge color={estadoColor}>{p.estado}</Badge></td>
                  <td style={{padding:"9px 10px"}}>
                    <button onClick={e=>{e.stopPropagation();setPartes(pr=>pr.filter(x=>x.id!==p.id))}} style={{background:"none",border:"none",cursor:"pointer",color:C.red,padding:2}}><Trash2 size={12}/></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal ver parte */}
      {verParte&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:C.card,borderRadius:12,width:"100%",maxWidth:540,maxHeight:"85vh",overflow:"auto",boxShadow:"0 20px 60px rgba(0,0,0,.2)"}}>
            <div style={{padding:"14px 18px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{fontWeight:700,fontSize:15}}>Parte · {fmtDate(verParte.fecha)}</div>
              <button onClick={()=>setVerParte(null)} style={{background:"none",border:"none",cursor:"pointer",color:C.inkLight}}><X size={18}/></button>
            </div>
            <div style={{padding:18}}>
              {[["OT",verParte.otId],["Actividad",verParte.actividadNombre],["Encargado",verParte.encargadoNombre],["% Avance",verParte.avance+"%"],["Notas",verParte.notas||"–"]].map(([k,v])=>(
                <div key={k} style={{display:"flex",gap:12,padding:"7px 0",borderBottom:`1px solid ${C.border}`,fontSize:13}}>
                  <span style={{fontWeight:600,color:C.inkMid,minWidth:90}}>{k}</span>
                  <span style={{color:C.ink}}>{v}</span>
                </div>
              ))}
              <div style={{marginTop:12}}>
                <div style={{fontWeight:600,fontSize:12,color:C.inkMid,textTransform:"uppercase",letterSpacing:0.5,marginBottom:8}}>Equipo y horas</div>
                {(verParte.trabajadores||[]).map(tId=>{
                  const emp = equipo.find(e=>e.id===tId);
                  const horas = verParte.horasPorTrabajador?.[tId]||0;
                  return (
                    <div key={tId} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",fontSize:13,borderBottom:`1px solid ${C.border}`}}>
                      <span>{emp?.nombre||tId}</span>
                      <span style={{fontFamily:"'DM Mono',monospace",fontWeight:600}}>{fmtN(horas,1)} h</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}




function TabAsistencia({ equipo, asistencia, setAsistencia, pais }) {
  const [modo, setModo] = useState("encargado"); // "encargado" | "fichaje"
  const [fecha, setFecha] = useState(today());
  const [fichando, setFichando] = useState(false);

  // Estado del proceso de fichaje (trabajador móvil)
  const [paso, setPaso] = useState(1); // 1=selección 2=pin 3=foto 4=gps 5=confirmado
  const [selTrab, setSelTrab] = useState(null);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [fotoSrc, setFotoSrc] = useState(null);
  const [coords, setCoords] = useState(null);
  const [gpsError, setGpsError] = useState(null);
  const [captureErr, setCaptureErr] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const registrosHoy = useMemo(()=>
    asistencia.filter(r=>r.fecha===fecha).sort((a,b)=>a.timestamp<b.timestamp?-1:1)
  ,[asistencia,fecha]);

  const presentes = useMemo(()=>{
    const map = {};
    registrosHoy.forEach(r=>{
      if (!map[r.empleadoId]) map[r.empleadoId]=[];
      map[r.empleadoId].push(r);
    });
    return map;
  },[registrosHoy]);

  // Arrancar cámara
  const startCamera = async () => {
    try {
      setCaptureErr(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video:{facingMode:"user",width:{ideal:640},height:{ideal:480}},audio:false
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch(e) {
      setCaptureErr("No se pudo acceder a la cámara: "+e.message+". Asegúrate de dar permiso.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t=>t.stop());
      streamRef.current = null;
    }
  };

  // Capturar foto
  const tomarFoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth||640;
    canvas.height = videoRef.current.videoHeight||480;
    canvas.getContext("2d").drawImage(videoRef.current,0,0,canvas.width,canvas.height);
    const jpeg = canvas.toDataURL("image/jpeg",0.7);
    setFotoSrc(jpeg);
    stopCamera();
    // Capturar GPS simultáneamente
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos=>setCoords({lat:pos.coords.latitude,lng:pos.coords.longitude,precision:Math.round(pos.coords.accuracy)}),
        e=>setGpsError("GPS no disponible: "+e.message),
        {timeout:8000,maximumAge:0}
      );
    } else {
      setGpsError("Geolocalización no disponible en este dispositivo.");
    }
    setPaso(4);
  };

  // Confirmar registro
  const confirmarFichaje = () => {
    if (!fotoSrc) { alert("La foto es obligatoria."); return; }
    const tipo = presentes[selTrab.id]?.length%2===0 ? "entrada" : "salida";
    const reg = {
      id:uid(), empleadoId:selTrab.id, empleadoNombre:selTrab.nombre,
      fecha, timestamp:nowISO(), tipo,
      foto:fotoSrc, lat:coords?.lat||null, lng:coords?.lng||null,
      precision:coords?.precision||null, gpsError:gpsError||null,
    };
    setAsistencia(a=>[...a,reg]);
    setPaso(5);
    stopCamera();
  };

  const resetFichaje = () => {
    setPaso(1); setSelTrab(null); setPinInput(""); setPinError(false);
    setFotoSrc(null); setCoords(null); setGpsError(null); setCaptureErr(null);
    stopCamera();
  };

  useEffect(()=>{ return ()=>stopCamera(); },[]);

  return (
    <div>
      {/* Selector de modo */}
      <Row gap={8} style={{marginBottom:16}} wrap>
        <button onClick={()=>setModo("encargado")} style={{flex:1,padding:"10px 16px",borderRadius:8,border:`2px solid ${modo==="encargado"?C.green:C.border}`,background:modo==="encargado"?C.greenL:C.card,cursor:"pointer",fontFamily:"Outfit,sans-serif",fontSize:13,fontWeight:modo==="encargado"?600:400,color:modo==="encargado"?C.green:C.inkMid}}>
          👔 Vista encargado — Panel del día
        </button>
        <button onClick={()=>{setModo("fichaje");resetFichaje();}} style={{flex:1,padding:"10px 16px",borderRadius:8,border:`2px solid ${modo==="fichaje"?C.teal:C.border}`,background:modo==="fichaje"?C.tealL:C.card,cursor:"pointer",fontFamily:"Outfit,sans-serif",fontSize:13,fontWeight:modo==="fichaje"?600:400,color:modo==="fichaje"?C.teal:C.inkMid}}>
          📱 Fichaje del trabajador — Foto + GPS
        </button>
      </Row>

      {/* ── VISTA ENCARGADO ── */}
      {modo==="encargado"&&(
        <div>
          <Row align="center" style={{marginBottom:16}} wrap>
            <div style={{fontSize:16,fontWeight:700,color:C.ink,flex:1}}>Asistencia de obra</div>
            <Inp label="" type="date" value={fecha} onChange={e=>setFecha(e.target.value)} style={{marginBottom:0,width:160}}/>
          </Row>

          {/* KPIs */}
          <Row gap={12} style={{marginBottom:16}} wrap>
            {[
              ["Presentes",Object.keys(presentes).filter(id=>presentes[id].some(r=>r.tipo==="entrada"&&!presentes[id].some(r2=>r2.tipo==="salida"&&r2.timestamp>r.timestamp))).length.toString(),C.green],
              ["Fichajes hoy",registrosHoy.length.toString(),C.blue],
              ["Sin fichar",equipo.filter(e=>e.activo&&!presentes[e.id]).length.toString(),C.amber],
            ].map(([l,v,color])=>(
              <div key={l} style={{flex:1,minWidth:100,background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 14px",borderLeft:`3px solid ${color}`}}>
                <div style={{fontSize:11,color:C.inkLight}}>{l}</div>
                <div style={{fontSize:20,fontWeight:700,color,fontFamily:"'DM Mono',monospace"}}>{v}</div>
              </div>
            ))}
          </Row>

          {/* Tabla registros */}
          <Card style={{padding:0,overflow:"hidden"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead>
                <tr style={{background:C.bg}}>
                  {["Empleado","Entrada","Salida","Horas","Foto","GPS","Estado"].map(h=>(
                    <th key={h} style={{padding:"8px 12px",fontSize:11,fontWeight:600,color:C.inkLight,textTransform:"uppercase",letterSpacing:0.4,textAlign:"left",borderBottom:`1px solid ${C.border}`}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {equipo.filter(e=>e.activo).map((emp,i)=>{
                  const regs = presentes[emp.id]||[];
                  const entrada = regs.find(r=>r.tipo==="entrada");
                  const salida = regs.find(r=>r.tipo==="salida");
                  const horas = diffHours(entrada?.timestamp,salida?.timestamp);
                  const presente = entrada&&!salida;
                  return (
                    <tr key={emp.id} style={{background:i%2===0?C.card:C.bg}}>
                      <td style={{padding:"9px 12px"}}>
                        <div style={{fontWeight:600,fontSize:13}}>{emp.nombre}</div>
                        <div style={{fontSize:11,color:C.inkLight}}>{emp.documento}</div>
                      </td>
                      <td style={{padding:"9px 12px",fontFamily:"'DM Mono',monospace",fontSize:13,color:entrada?C.green:C.inkLight}}>{entrada?fmtTime(entrada.timestamp):"–"}</td>
                      <td style={{padding:"9px 12px",fontFamily:"'DM Mono',monospace",fontSize:13,color:salida?C.red:C.inkLight}}>{salida?fmtTime(salida.timestamp):"–"}</td>
                      <td style={{padding:"9px 12px",fontFamily:"'DM Mono',monospace",fontWeight:600,fontSize:13}}>{horas?fmtN(horas,1)+" h":"–"}</td>
                      <td style={{padding:"9px 12px"}}>
                        {entrada?.foto ? (
                          <img src={entrada.foto} alt="foto" style={{width:36,height:36,borderRadius:4,objectFit:"cover",cursor:"pointer",border:`1px solid ${C.border}`}}
                            onClick={()=>{const w=window.open();w.document.write(`<img src="${entrada.foto}" style="max-width:100%"/>`);}}/>
                        ):<span style={{fontSize:11,color:C.inkLight}}>–</span>}
                      </td>
                      <td style={{padding:"9px 12px",fontSize:12}}>
                        {entrada?.lat ? (
                          <a href={`https://www.openstreetmap.org/?mlat=${entrada.lat}&mlon=${entrada.lng}&zoom=17`} target="_blank" rel="noreferrer" style={{color:C.blue,fontSize:11}}>
                            📍 {entrada.precision}m
                          </a>
                        ):<span style={{fontSize:11,color:C.inkLight}}>{entrada?.gpsError?"Sin GPS":"–"}</span>}
                      </td>
                      <td style={{padding:"9px 12px"}}>
                        {!entrada?<Badge color={C.amber}>Sin fichar</Badge>
                        :presente?<Badge color={C.green}>En obra</Badge>
                        :<Badge color={C.inkLight}>Salida</Badge>}
                      </td>
                    </tr>
                  );
                })}
                {equipo.filter(e=>e.activo).length===0&&<tr><td colSpan={7} style={{padding:"24px",textAlign:"center",color:C.inkLight,fontSize:13}}>Sin empleados activos.</td></tr>}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* ── FICHAJE TRABAJADOR (móvil) ── */}
      {modo==="fichaje"&&(
        <div style={{maxWidth:400,margin:"0 auto"}}>

          {paso===5?(
            <div style={{textAlign:"center",padding:"40px 20px"}}>
              <div style={{fontSize:48,marginBottom:16}}>✅</div>
              <div style={{fontSize:20,fontWeight:700,color:C.green,marginBottom:8}}>Fichaje registrado</div>
              <div style={{fontSize:14,color:C.inkMid,marginBottom:24}}>
                {selTrab?.nombre} · {presentes[selTrab?.id]?.length%2===0?"SALIDA":"ENTRADA"} · {new Date().toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"})}
              </div>
              {fotoSrc&&<img src={fotoSrc} style={{width:"100%",borderRadius:8,marginBottom:16}}/>}
              {coords&&<div style={{fontSize:12,color:C.inkMid}}>📍 GPS: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)} (±{coords.precision}m)</div>}
              {gpsError&&<div style={{fontSize:12,color:C.amber}}>⚠️ {gpsError}</div>}
              <Btn onClick={resetFichaje} style={{marginTop:20,width:"100%",justifyContent:"center"}}>Nuevo fichaje</Btn>
            </div>
          ): paso===1?(
            /* PASO 1 — Selección nombre */
            <Card>
              <div style={{textAlign:"center",marginBottom:20}}>
                <div style={{fontSize:32,marginBottom:8}}>👷</div>
                <div style={{fontSize:18,fontWeight:700,color:C.ink}}>Control de acceso</div>
                <div style={{fontSize:13,color:C.inkMid}}>Selecciona tu nombre</div>
              </div>
              <div style={{maxHeight:300,overflowY:"auto",border:`1px solid ${C.border}`,borderRadius:8}}>
                {equipo.filter(e=>e.activo).map((emp,i)=>(
                  <div key={emp.id} onClick={()=>{setSelTrab(emp);setPaso(2);}}
                    style={{padding:"12px 16px",cursor:"pointer",borderBottom:`1px solid ${C.border}`,background:i%2===0?C.card:C.bg,fontSize:14,fontWeight:500,color:C.ink}}
                    onMouseEnter={e=>e.currentTarget.style.background=C.greenL}
                    onMouseLeave={e=>e.currentTarget.style.background=i%2===0?C.card:C.bg}>
                    {emp.nombre}
                  </div>
                ))}
                {equipo.filter(e=>e.activo).length===0&&<div style={{padding:20,fontSize:13,color:C.inkLight,textAlign:"center"}}>Sin empleados. El encargado debe registrarlos primero.</div>}
              </div>
            </Card>
          ): paso===2?(
            /* PASO 2 — PIN */
            <Card style={{textAlign:"center"}}>
              <div style={{fontSize:32,marginBottom:8}}>🔢</div>
              <div style={{fontSize:18,fontWeight:700,color:C.ink,marginBottom:4}}>Hola, {selTrab?.nombre}</div>
              <div style={{fontSize:13,color:C.inkMid,marginBottom:20}}>Introduce tu PIN de 4 dígitos</div>
              <div style={{display:"flex",justifyContent:"center",gap:12,marginBottom:16}}>
                {[0,1,2,3].map(i=>(
                  <div key={i} style={{width:14,height:14,borderRadius:"50%",background:i<pinInput.length?C.green:C.border}}/>
                ))}
              </div>
              {pinError&&<div style={{color:C.red,fontSize:12,marginBottom:12}}>PIN incorrecto. Inténtalo de nuevo.</div>}
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,maxWidth:200,margin:"0 auto"}}>
                {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map(k=>(
                  <button key={k} onClick={()=>{
                    if (k==="⌫") { setPinInput(p=>p.slice(0,-1)); return; }
                    if (k==="") return;
                    const next = pinInput+k;
                    setPinInput(next);
                    if (next.length===4) {
                      if (next===selTrab?.pin) { setPinError(false); setPinInput(""); setPaso(3); startCamera(); }
                      else { setPinError(true); setPinInput(""); }
                    }
                  }} style={{padding:"14px 0",fontSize:18,fontWeight:600,border:`1px solid ${C.border}`,borderRadius:8,background:k==="⌫"?C.redL:C.bg,cursor:k===""?"default":"pointer",color:C.ink}}>
                    {k}
                  </button>
                ))}
              </div>
              <Btn variant="ghost" small onClick={resetFichaje} style={{marginTop:16}}>Volver</Btn>
            </Card>
          ): paso===3?(
            /* PASO 3 — Cámara */
            <Card style={{textAlign:"center"}}>
              <div style={{fontSize:18,fontWeight:700,color:C.ink,marginBottom:12}}>📸 Tómate una selfie</div>
              <div style={{fontSize:13,color:C.inkMid,marginBottom:12}}>La foto es obligatoria para registrar tu asistencia.</div>
              {captureErr ? (
                <div style={{background:C.redL,border:`1px solid ${C.red}`,borderRadius:8,padding:12,fontSize:12,color:C.red,marginBottom:12}}>{captureErr}</div>
              ) : (
                <video ref={videoRef} autoPlay playsInline muted style={{width:"100%",borderRadius:8,background:"#000",aspectRatio:"4/3",objectFit:"cover",marginBottom:12}}/>
              )}
              <Row gap={8} style={{justifyContent:"center"}} wrap>
                {!captureErr&&<Btn icon={Camera} onClick={tomarFoto} style={{width:"100%",justifyContent:"center",fontSize:15,padding:"12px"}}>Capturar y registrar</Btn>}
                {captureErr&&<Btn onClick={startCamera} style={{width:"100%",justifyContent:"center"}}>Reintentar cámara</Btn>}
                <Btn variant="ghost" small onClick={resetFichaje}>Cancelar</Btn>
              </Row>
            </Card>
          ): paso===4?(
            /* PASO 4 — Confirmación */
            <Card style={{textAlign:"center"}}>
              <div style={{fontSize:18,fontWeight:700,color:C.ink,marginBottom:12}}>Confirmar registro</div>
              {fotoSrc&&<img src={fotoSrc} style={{width:"100%",borderRadius:8,marginBottom:12,border:`1px solid ${C.border}`}}/>}
              <div style={{background:C.bg,borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:13,textAlign:"left"}}>
                <div><strong>Nombre:</strong> {selTrab?.nombre}</div>
                <div><strong>Tipo:</strong> {presentes[selTrab?.id]?.length%2===0?"ENTRADA":"SALIDA"}</div>
                <div><strong>Hora:</strong> {new Date().toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"})}</div>
                <div><strong>GPS:</strong> {coords?`${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)} (±${coords.precision}m)`:gpsError?"No disponible":"Obteniendo..."}</div>
              </div>
              <Row gap={8} style={{justifyContent:"center"}} wrap>
                <Btn icon={Check} onClick={confirmarFichaje} style={{flex:1,justifyContent:"center"}}>Confirmar fichaje</Btn>
                <Btn variant="secondary" onClick={()=>{setFotoSrc(null);setCoords(null);setGpsError(null);setPaso(3);startCamera();}}>Repetir foto</Btn>
              </Row>
              <Btn variant="ghost" small onClick={resetFichaje} style={{marginTop:8}}>Cancelar</Btn>
            </Card>
          ):null}
        </div>
      )}
    </div>
  );
}

function TabNovedades({ novedades, saveNovedades }) {
  const [filter, setFilter] = useState({ tipo:"", estado:"", texto:"" });
  const [detalle, setDetalle] = useState(null);
  const [comentario, setComentario] = useState("");

  const filtered = useMemo(() => novedades.filter(n => {
    if (filter.tipo   && n.tipo   !== filter.tipo)   return false;
    if (filter.estado && n.estado !== filter.estado) return false;
    if (filter.texto  && !n.empleadoNombre.toLowerCase().includes(filter.texto.toLowerCase())) return false;
    return true;
  }), [novedades, filter]);

  const pendientes = novedades.filter(n => n.estado === "Pendiente").length;

  const resolver = (id, nuevoEstado) => {
    saveNovedades(prev => prev.map(n => n.id === id
      ? { ...n, estado: nuevoEstado, comentarioAdmin: comentario, fechaResolucion: today() }
      : n
    ));
    setDetalle(null); setComentario("");
  };

  const tipoInfo = (t) => NOVEDAD_TIPOS.find(x => x.id === t) || NOVEDAD_TIPOS[5];

  const estadoBadge = (e) => ({
    "Pendiente":   { color:"#7A5218", bg:"#FAF0E0" },
    "En revisión": { color:"#1E4F8C", bg:"#E6EFF9" },
    "Aprobada":    { color:"#1E6B42", bg:"#E8F4EE" },
    "Rechazada":   { color:"#AE2C2C", bg:"#FAE8E8" },
  }[e] || { color:"#555", bg:"#EDEBE7" });

  return (
    <div className="fade-up">
      {/* KPIs */}
      <div style={{ display:"flex", gap:10, marginBottom:18 }}>
        <KpiBox label="Solicitudes pendientes" value={pendientes} color={pendientes>0?T.amber:T.ink} icon={Bell} />
        <KpiBox label="Aprobadas este mes"     value={novedades.filter(n=>n.estado==="Aprobada").length}  color={T.green} icon={CheckCircle} />
        <KpiBox label="Rechazadas"             value={novedades.filter(n=>n.estado==="Rechazada").length} color={T.red}   icon={X} />
        <KpiBox label="Total novedades"        value={novedades.length} icon={ClipboardList} />
      </div>

      {/* Filtros */}
      <div style={{ display:"flex", gap:10, marginBottom:14, flexWrap:"wrap" }}>
        <div style={{ position:"relative", flex:1, minWidth:180 }}>
          <Search size={13} style={{ position:"absolute", left:9, top:"50%", transform:"translateY(-50%)", color:T.inkLight }} />
          <input value={filter.texto} onChange={e=>setFilter(f=>({...f,texto:e.target.value}))}
            placeholder="Buscar empleado…"
            style={{ width:"100%", paddingLeft:30, padding:"7px 10px 7px 30px", border:`1px solid ${T.border}`, borderRadius:3, fontSize:12, color:T.ink, background:T.surface }} />
        </div>
        <Select value={filter.tipo} onChange={v=>setFilter(f=>({...f,tipo:v}))} style={{ width:180 }}
          options={[{value:"",label:"Todos los tipos"}, ...NOVEDAD_TIPOS.map(t=>({value:t.id,label:`${t.icono} ${t.lbl}` }))]} />
        <Select value={filter.estado} onChange={v=>setFilter(f=>({...f,estado:v}))} style={{ width:150 }}
          options={[{value:"",label:"Todos los estados"},"Pendiente","En revisión","Aprobada","Rechazada"]} />
      </div>

      <Card>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
          <thead><tr style={{ borderBottom:`2px solid ${T.border}`, background:T.surfaceAlt }}>
            {["Empleado","Tipo","Fecha solicitud","Período / Horas","Documento","Estado",""].map(h=>(
              <th key={h} style={{ padding:"9px 10px",textAlign:"left",fontSize:9,letterSpacing:1.2,textTransform:"uppercase",color:T.inkLight,fontWeight:700 }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign:"center", padding:"40px 0", color:T.inkLight, fontSize:12 }}>
                {novedades.length===0 ? "Sin novedades. Los empleados las crean desde su portal." : "Sin resultados."}
              </td></tr>
            )}
            {filtered.map(n => {
              const ti = tipoInfo(n.tipo);
              const bc = estadoBadge(n.estado);
              return (
                <tr key={n.id} style={{ borderBottom:`1px solid ${T.border}`, cursor:"pointer" }}
                  onMouseEnter={e=>e.currentTarget.style.background=T.surfaceAlt}
                  onMouseLeave={e=>e.currentTarget.style.background=""}
                  onClick={() => { setDetalle(n); setComentario(n.comentarioAdmin||""); }}>
                  <td style={{ padding:"11px 10px", fontWeight:600 }}>{n.empleadoNombre}</td>
                  <td style={{ padding:"11px 10px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                      <span>{ti.icono}</span>
                      <span style={{ color:ti.color, fontWeight:600, fontSize:11 }}>{ti.lbl}</span>
                    </div>
                  </td>
                  <td className="mono" style={{ padding:"11px 10px", color:T.inkLight, fontSize:11 }}>{n.fechaSolicitud}</td>
                  <td style={{ padding:"11px 10px", fontSize:11 }}>
                    {n.fechaInicio && <span className="mono">{n.fechaInicio}</span>}
                    {n.fechaFin    && <span className="mono" style={{ color:T.inkLight }}> → {n.fechaFin}</span>}
                    {n.horas>0     && <span className="mono"> {n.horas} h</span>}
                    {n.dias>0      && <span style={{ color:T.inkMid }}> ({n.dias} días)</span>}
                  </td>
                  <td style={{ padding:"11px 10px" }}>
                    {n.docNombre
                      ? <div style={{ display:"flex", alignItems:"center", gap:4, color:T.green, fontSize:11 }}><Paperclip size={11}/>{n.docNombre}</div>
                      : <span style={{ color:T.inkXLight, fontSize:10 }}>Sin doc.</span>
                    }
                  </td>
                  <td style={{ padding:"11px 10px" }}><Badge color={bc.color} bg={bc.bg}>{n.estado}</Badge></td>
                  <td style={{ padding:"11px 10px" }}>
                    <ChevronRight size={14} color={T.inkXLight}/>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {/* Detalle / resolución modal */}
      {detalle && (() => {
        const ti = tipoInfo(detalle.tipo);
        const bc = estadoBadge(detalle.estado);
        return (
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center" }}
            onClick={() => setDetalle(null)}>
            <div className="pop-in" style={{ background:T.surface, borderRadius:6, width:560, maxWidth:"95vw", maxHeight:"90vh", overflowY:"auto", boxShadow:T.shadowMd }}
              onClick={e=>e.stopPropagation()}>
              {/* Modal header */}
              <div style={{ padding:"18px 22px", borderBottom:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between", alignItems:"center", background:ti.bg }}>
                <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                  <span style={{ fontSize:26 }}>{ti.icono}</span>
                  <div>
                    <div style={{ fontWeight:700, fontSize:14, color:ti.color }}>{ti.lbl}</div>
                    <div style={{ fontSize:11, color:ti.color, opacity:.7 }}>{detalle.empleadoNombre} · Solicitud {detalle.fechaSolicitud}</div>
                  </div>
                </div>
                <Badge color={bc.color} bg={"rgba(255,255,255,.7)"}>{detalle.estado}</Badge>
              </div>

              <div style={{ padding:"20px 22px" }}>
                {/* Datos */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
                  {[
                    { lbl:"Tipo",           val: ti.lbl },
                    { lbl:"Estado",         val: detalle.estado },
                    detalle.fechaInicio && { lbl:"Fecha inicio",   val: detalle.fechaInicio },
                    detalle.fechaFin    && { lbl:"Fecha fin",      val: detalle.fechaFin },
                    detalle.dias > 0    && { lbl:"Días solicitados",val: `${detalle.dias} días` },
                    detalle.horas > 0   && { lbl:"Horas",          val: `${detalle.horas} h` },
                    detalle.motivo      && { lbl:"Motivo",          val: detalle.motivo },
                  ].filter(Boolean).map(f => (
                    <div key={f.lbl} style={{ background:T.accent, borderRadius:3, padding:"10px 12px" }}>
                      <Label>{f.lbl}</Label>
                      <div style={{ fontSize:12, fontWeight:600, color:T.ink, marginTop:3 }}>{f.val}</div>
                    </div>
                  ))}
                </div>

                {detalle.descripcion && (
                  <div style={{ background:T.accent, borderRadius:3, padding:"10px 12px", marginBottom:12 }}>
                    <Label>Descripción del empleado</Label>
                    <p style={{ fontSize:12, color:T.inkMid, marginTop:4, lineHeight:1.5 }}>{detalle.descripcion}</p>
                  </div>
                )}

                {detalle.docNombre && (
                  <div style={{ background:T.blueBg, border:`1px solid ${T.blue}33`, borderRadius:3, padding:"10px 12px", marginBottom:12, display:"flex", gap:8, alignItems:"center" }}>
                    <Paperclip size={14} color={T.blue}/>
                    <div>
                      <div style={{ fontSize:11, fontWeight:600, color:T.blue }}>Documento adjunto</div>
                      <div style={{ fontSize:11, color:T.blue, opacity:.8 }}>{detalle.docNombre}</div>
                    </div>
                    {detalle.docBase64 && (
                      <a href={detalle.docBase64} download={detalle.docNombre}
                        style={{ marginLeft:"auto", fontSize:10, color:T.blue, textDecoration:"underline" }}>
                        Descargar
                      </a>
                    )}
                  </div>
                )}

                {detalle.fechaResolucion && detalle.comentarioAdmin && (
                  <div style={{ background: detalle.estado==="Aprobada"?T.greenBg:T.redBg, borderRadius:3, padding:"10px 12px", marginBottom:12 }}>
                    <Label>Resolución · {detalle.fechaResolucion}</Label>
                    <p style={{ fontSize:12, color:T.inkMid, marginTop:4 }}>{detalle.comentarioAdmin}</p>
                  </div>
                )}

                {detalle.estado === "Pendiente" && (
                  <>
                    <div style={{ marginBottom:10 }}>
                      <Label>Comentario para el empleado (opcional)</Label>
                      <textarea value={comentario} onChange={e=>setComentario(e.target.value)}
                        placeholder="Motivo de aprobación o rechazo…"
                        style={{ width:"100%", marginTop:5, padding:"8px 10px", border:`1px solid ${T.border}`, borderRadius:3, fontSize:12, minHeight:70, resize:"vertical", fontFamily:"'Outfit',sans-serif" }}/>
                    </div>
                    <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
                      <Btn variant="outline" onClick={() => setDetalle(null)}>Cancelar</Btn>
                      <Btn variant="danger"  onClick={() => resolver(detalle.id, "Rechazada")}><X size={12}/>Rechazar</Btn>
                      <Btn variant="success" onClick={() => resolver(detalle.id, "Aprobada")}><Check size={12}/>Aprobar</Btn>
                    </div>
                  </>
                )}
                {detalle.estado !== "Pendiente" && (
                  <div style={{ textAlign:"right" }}>
                    <Btn variant="outline" onClick={() => setDetalle(null)}>Cerrar</Btn>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

/* ─────────────────────────────────────────────
   PORTAL EMPLEADO — COMPLETO
───────────────────────────────────────────── */
/* ─────────────────────────────────────────────
   PORTAL EMPLEADO — CALENDARIO LABORAL
───────────────────────────────────────────── */

const MESES_NAMES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

const TIPO_DOC_OPTS = [
  { value:"nomina",       label:"Nómina",            color:T.blue },
  { value:"contrato",     label:"Contrato",          color:T.green },
  { value:"certificado",  label:"Certificado laboral",color:T.amber },
  { value:"retencion",    label:"Retención fuente",  color:T.red },
  { value:"otro_laboral", label:"Otro documento",    color:T.inkMid },
  { value:"otro",         label:"Otro",              color:T.inkLight },
];

const DEF_DOC = (empNombre = "") => ({
  id: uid(), empleadoNombre: empNombre, tipo: "nomina", nombre: "",
  docNombre: "", docBase64: null, anio: new Date().getFullYear(), mes: "",
  fechaSubida: today(),
});

/* Styles for Portal Empleado */
const S = {
  page:   { minHeight:"100vh", background:T.bg, fontFamily:"'Outfit',sans-serif" },
  card:   { background:T.surface, border:`1px solid ${T.border}`, borderRadius:8, padding:16, marginBottom:12, boxShadow:T.shadow },
  overlay:{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center" },
  modal:  { background:T.surface, borderRadius:8, padding:24, width:520, maxWidth:"95vw", boxShadow:T.shadowMd, maxHeight:"90vh", overflowY:"auto" },
  th:     { padding:"8px 10px", fontSize:10, fontWeight:600, color:T.inkLight, textTransform:"uppercase", letterSpacing:0.6, textAlign:"left", borderBottom:`1px solid ${T.border}`, background:T.surfaceAlt },
  td:     { padding:"8px 10px", fontSize:12, color:T.ink, borderBottom:`1px solid ${T.border}` },
  kpiMini: () => ({ background:T.surfaceAlt, borderRadius:4, padding:"6px 10px", textAlign:"center" }),
  navBtn: (act) => ({
    display:"flex", alignItems:"center", gap:7, padding:"9px 14px",
    border:"none", background: act ? "rgba(255,255,255,.08)" : "transparent",
    color: act ? "#fff" : "rgba(255,255,255,.55)",
    fontSize:12, fontWeight: act ? 600 : 400, cursor:"pointer", width:"100%",
    textAlign:"left", transition:"all .1s",
  }),
};

function TabDocumentos({ docs, saveDocs, fichas, cargos }) {
  const [form,       setForm]       = useState(null);
  const [filtroEmp,  setFiltroEmp]  = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [isNew,      setIsNew]      = useState(false);

  // Lista de empleados conocidos (fichas + cargos)
  const empleadosKnown = useMemo(() => {
    const names = new Set();
    fichas.forEach(f => names.add(f.nombre));
    docs.forEach(d => names.add(d.empleadoNombre));
    return [...names].sort();
  }, [fichas, docs]);

  const filtered = docs.filter(d => {
    if (filtroEmp  && d.empleadoNombre !== filtroEmp)  return false;
    if (filtroTipo && d.tipo           !== filtroTipo) return false;
    return true;
  });

  const tipoInfo = (t) => TIPO_DOC_OPTS.find(x=>x.value===t) || TIPO_DOC_OPTS[5];

  const handleFile = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const r = new FileReader();
    r.onload = ev => setForm(f => ({ ...f, docNombre:file.name, docBase64:ev.target.result }));
    r.readAsDataURL(file);
  };

  const saveDoc = () => {
    if (!form.empleadoNombre || !form.docNombre) return;
    const d = { ...form, fechaSubida: today() };
    saveDocs(prev => isNew ? [...prev, d] : prev.map(x => x.id===d.id?d:x));
    setForm(null);
  };

  const openNew = (empNombre="") => {
    setForm({ ...DEF_DOC(empNombre) });
    setIsNew(true);
  };

  return (
    <div className="fade-up">
      <div style={{ display:"flex", gap:10, marginBottom:18 }}>
        <KpiBox label="Total documentos"  value={docs.length}       icon={FileText} />
        <KpiBox label="Empleados con docs" value={new Set(docs.map(d=>d.empleadoNombre)).size} icon={Users} />
        <KpiBox label="Nóminas subidas"   value={docs.filter(d=>d.tipo==="nomina").length}    icon={Briefcase} color={T.blue} />
        <KpiBox label="Contratos"         value={docs.filter(d=>d.tipo==="contrato").length}  icon={Shield}    color={T.green} />
      </div>

      {/* Filtros + acción */}
      <div style={{ display:"flex", gap:10, marginBottom:14, alignItems:"center" }}>
        <Select value={filtroEmp} onChange={setFiltroEmp} style={{ width:200 }}
          options={[{value:"",label:"Todos los empleados"}, ...empleadosKnown.map(n=>({value:n,label:n}))]} />
        <Select value={filtroTipo} onChange={setFiltroTipo} style={{ width:200 }}
          options={[{value:"",label:"Todos los tipos"}, ...TIPO_DOC_OPTS]} />
        <div style={{ flex:1 }}/>
        <Btn variant="primary" small onClick={() => openNew(filtroEmp)}>
          <Plus size={12}/>Subir documento
        </Btn>
      </div>

      {/* Por empleado — agrupado */}
      {filtroEmp === "" ? (
        empleadosKnown.length === 0
          ? (
            <Card>
              <div style={{ textAlign:"center", padding:"40px 0", color:T.inkLight }}>
                <FileText size={32} style={{ opacity:.2, marginBottom:10 }}/>
                <p style={{ fontSize:12 }}>Sin documentos aún. Los empleados se crean desde sus fichas en el Portal.</p>
              </div>
            </Card>
          )
          : empleadosKnown.map(emp => {
            const empDocs = docs.filter(d => d.empleadoNombre===emp && (!filtroTipo || d.tipo===filtroTipo));
            if (empDocs.length===0 && filtroTipo) return null;
            return (
              <Card key={emp} style={{ marginBottom:12 }}>
                <SectionTitle action={<Btn small variant="ghost" onClick={()=>openNew(emp)}><Plus size={11}/>Añadir</Btn>}>
                  <span style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ width:28,height:28,borderRadius:3,background:T.ink,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800 }}>
                      {emp[0]?.toUpperCase()}
                    </div>
                    {emp}
                    <Badge>{empDocs.length} docs</Badge>
                  </span>
                </SectionTitle>
                {empDocs.length===0
                  ? <p style={{ fontSize:11,color:T.inkLight }}>Sin documentos para este empleado.</p>
                  : (
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:8 }}>
                      {empDocs.map(d => {
                        const ti = tipoInfo(d.tipo);
                        return (
                          <div key={d.id} style={{ border:`1px solid ${T.border}`, borderRadius:4, padding:"12px 14px", background:T.surfaceAlt }}>
                            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                              <span style={{ fontSize:10, fontWeight:700, color:ti.color }}>{ti.label}</span>
                              <div style={{ display:"flex", gap:4 }}>
                                {d.docBase64 && (
                                  <a href={d.docBase64} download={d.docNombre}
                                    style={{ fontSize:9, color:T.blue, textDecoration:"none", padding:"2px 6px", border:`1px solid ${T.blue}33`, borderRadius:2 }}>
                                    ↓
                                  </a>
                                )}
                                <button onClick={()=>saveDocs(prev=>prev.filter(x=>x.id!==d.id))}
                                  style={{ background:"none", border:"none", cursor:"pointer", color:T.red, fontSize:11, padding:"1px 4px" }}>×</button>
                              </div>
                            </div>
                            <div style={{ fontSize:12, fontWeight:600, color:T.ink, marginBottom:2 }}>
                              {d.docNombre || d.nombre || "—"}
                            </div>
                            {(d.anio||d.mes) && (
                              <div style={{ fontSize:10, color:T.inkLight }}>
                                {d.mes ? MESES_NAMES[Number(d.mes)-1] : ""} {d.anio}
                              </div>
                            )}
                            <div style={{ fontSize:9, color:T.inkXLight, marginTop:3 }}>Subido {d.fechaSubida}</div>
                          </div>
                        );
                      })}
                    </div>
                  )
                }
              </Card>
            );
          })
      ) : (
        <Card>
          <SectionTitle action={<Btn small variant="primary" onClick={()=>openNew(filtroEmp)}><Plus size={12}/>Subir</Btn>}>
            Documentos de {filtroEmp}
          </SectionTitle>
          {filtered.length===0
            ? <p style={{ textAlign:"center",color:T.inkLight,padding:"30px 0",fontSize:12 }}>Sin documentos.</p>
            : (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:8 }}>
                {filtered.map(d => {
                  const ti=tipoInfo(d.tipo);
                  return (
                    <div key={d.id} style={{ border:`1px solid ${T.border}`,borderRadius:4,padding:"12px 14px",background:T.surfaceAlt }}>
                      <div style={{ fontSize:10,fontWeight:700,color:ti.color,marginBottom:4 }}>{ti.label}</div>
                      <div style={{ fontSize:12,fontWeight:600,color:T.ink }}>{d.docNombre||d.nombre||"—"}</div>
                      {(d.anio||d.mes)&&<div style={{ fontSize:10,color:T.inkLight }}>{d.mes?MESES_NAMES[Number(d.mes)-1]:""} {d.anio}</div>}
                      {d.docBase64&&<a href={d.docBase64} download={d.docNombre} style={{ fontSize:10,color:T.blue,display:"block",marginTop:4 }}>Descargar ↓</a>}
                    </div>
                  );
                })}
              </div>
            )
          }
        </Card>
      )}

      {/* Modal subir */}
      {form && (
        <Modal title={isNew?"Subir documento":"Editar documento"} onClose={()=>setForm(null)} wide>
          <FieldRow label="Empleado">
            {empleadosKnown.length > 0
              ? <Select value={form.empleadoNombre} onChange={v=>setForm(f=>({...f,empleadoNombre:v}))}
                  options={[{value:"",label:"Seleccionar empleado…"},...empleadosKnown.map(n=>({value:n,label:n}))]}/>
              : <Input value={form.empleadoNombre} onChange={v=>setForm(f=>({...f,empleadoNombre:v}))} placeholder="Nombre del empleado"/>
            }
          </FieldRow>
          <FieldRow label="Tipo de documento">
            <Select value={form.tipo} onChange={v=>setForm(f=>({...f,tipo:v}))} options={TIPO_DOC_OPTS}/>
          </FieldRow>
          {(form.tipo==="nomina"||form.tipo==="certificado"||form.tipo==="retencion") && (
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10 }}>
              <div>
                <Label>Año</Label>
                <Input type="number" value={form.anio} onChange={v=>setForm(f=>({...f,anio:v}))} style={{ marginTop:4 }}/>
              </div>
              <div>
                <Label>Mes {form.tipo==="certificado"||form.tipo==="retencion"?"(opcional)":""}</Label>
                <Select value={form.mes} onChange={v=>setForm(f=>({...f,mes:v}))} style={{ marginTop:4 }}
                  options={[{value:"",label:"—"},...MESES_NAMES.map((m,i)=>({value:i+1,label:m}))]}/>
              </div>
            </div>
          )}
          <FieldRow label="Descripción (opcional)">
            <Input value={form.nombre} onChange={v=>setForm(f=>({...f,nombre:v}))} placeholder="Ej. Nómina mayo 2025"/>
          </FieldRow>
          <div style={{ marginBottom:14 }}>
            <Label>Archivo</Label>
            <div style={{ marginTop:6,display:"flex",alignItems:"center",gap:10 }}>
              <label style={{ display:"inline-flex",alignItems:"center",gap:6,padding:"7px 14px",background:T.accent,border:`1px solid ${T.border}`,borderRadius:3,cursor:"pointer",fontSize:11,color:T.inkMid,fontWeight:600 }}>
                <Paperclip size={12}/>Seleccionar archivo
                <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xlsx" onChange={handleFile} style={{ display:"none" }}/>
              </label>
              {form.docNombre && (
                <span style={{ fontSize:11,color:T.green,display:"flex",alignItems:"center",gap:4 }}>
                  <CheckCircle size={12}/>{form.docNombre}
                </span>
              )}
            </div>
            <p style={{ fontSize:9,color:T.inkLight,marginTop:5 }}>PDF, imagen o Word. Se almacena como base64 en el navegador.</p>
          </div>
          <ModalFooter onCancel={()=>setForm(null)} onSave={saveDoc} saveLabel="Subir documento"/>
        </Modal>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   MODAL & FOOTER helpers
───────────────────────────────────────────── */

function Modal({ title, children, onClose, wide }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={onClose}>
      <div className="pop-in" style={{ background:T.surface, borderRadius:6, padding:28, width:wide?600:480, maxWidth:"95vw", boxShadow:T.shadowMd, maxHeight:"90vh", overflowY:"auto" }} onClick={e=>e.stopPropagation()}>
        <h3 style={{ marginBottom:20, fontSize:15, fontWeight:700 }}>{title}</h3>
        {children}
      </div>
    </div>
  );
}


function PortalEmpleado({ partes, savePartes, novedades, saveNovedades, fichas, saveFichas, docs, saveDocs, cargos, empleados, saveEmpleados }) {
  const [nombre,setNombre]=useState(""); const [logged,setLogged]=useState(false);
  const [view,setView]=useState("calendario");
  const [calYear,setCalYear]=useState(new Date().getFullYear());
  const [calMonth,setCalMonth]=useState(new Date().getMonth());
  const [selDay,setSelDay]=useState(null);
  const [formParte,setFormParte]=useState(null);
  const [formNov,setFormNov]=useState(null);
  const [fichaEdit,setFichaEdit]=useState(false);
  const [fichaForm,setFichaForm]=useState(null);

  const DIAS=["Lu","Ma","Mi","Ju","Vi","Sa","Do"];
  const MESES=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  const OTS=["OT-DIN_250101_01","OT-INT_250115_02","OT-INT_250201_03"];

  const misPartes=partes.filter(p=>p.empleadoNombre===nombre);
  const misNov=novedades.filter(n=>n.empleadoNombre===nombre);
  const misDocs=docs.filter(d=>d.empleadoNombre===nombre);
  const miFicha=fichas.find(f=>f.nombre===nombre)||DEF_FICHA(nombre);

  const tipoInfo=t=>NOVEDAD_TIPOS.find(x=>x.id===t)||NOVEDAD_TIPOS[5];
  const calcDias=(a,b)=>!a||!b?0:Math.max(0,Math.round((new Date(b)-new Date(a))/864e5)+1);
  const toISO=(y,m,d)=>`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;

  const calDays=useMemo(()=>{
    const first=(new Date(calYear,calMonth,1).getDay()+6)%7;
    const n=new Date(calYear,calMonth+1,0).getDate();
    return [...Array(first).fill(null),...Array.from({length:n},(_,i)=>i+1)];
  },[calYear,calMonth]);

  const evByDay=useMemo(()=>{
    const map={};
    misPartes.forEach(p=>{(map[p.fecha]??=[]).push({kind:"parte",obj:p});});
    misNov.forEach(n=>{
      if(!n.fechaInicio) return;
      const s=new Date(n.fechaInicio),e=n.fechaFin?new Date(n.fechaFin):s;
      for(let d=new Date(s);d<=e;d.setDate(d.getDate()+1)){
        const iso=d.toISOString().slice(0,10);
        (map[iso]??=[]).push({kind:"novedad",obj:n});
      }
    });
    return map;
  },[misPartes,misNov]);

  const pendNov=misNov.filter(n=>n.estado==="Pendiente").length;
  const horasAprob=misPartes.filter(p=>p.estado==="Aprobado").reduce((s,p)=>s+Number(p.horasNormales||0)+Number(p.horasExtra||0),0);
  const vacAprob=misNov.filter(n=>n.tipo==="vacaciones"&&n.estado==="Aprobada").reduce((s,n)=>s+Number(n.dias||0),0);
  const bajaActiva=misNov.find(n=>n.tipo==="baja"&&n.estado==="Aprobada"&&!n.fechaFin);

  const upd=(set,k,v)=>set(f=>({...f,[k]:v}));
  const estC=e=>({Borrador:{c:T.inkLight,bg:T.accent},Enviado:{c:T.blue,bg:T.blueBg},Aprobado:{c:T.green,bg:T.greenBg},Rechazado:{c:T.red,bg:T.redBg},Pendiente:{c:"#7A5218",bg:"#FAF0E0"},Aprobada:{c:T.green,bg:T.greenBg},Rechazada:{c:T.red,bg:T.redBg}}[e]||{c:T.inkLight,bg:T.accent});

  const saveParte=()=>{
    if(!formParte?.otCodigo||!formParte?.actividad) return;
    const isNew=!partes.find(p=>p.id===formParte.id);
    savePartes(prev=>isNew?[...prev,formParte]:prev.map(p=>p.id===formParte.id?formParte:p));
    setFormParte(null);
  };
  const enviarParte=id=>savePartes(prev=>prev.map(p=>p.id===id?{...p,estado:"Enviado"}:p));

  const saveNov=()=>{
    if(!formNov?.tipo) return;
    const dias=calcDias(formNov.fechaInicio,formNov.fechaFin);
    const n={...formNov,dias,empleadoNombre:nombre,estado:"Pendiente"};
    const isNew=!novedades.find(x=>x.id===n.id);
    saveNovedades(prev=>isNew?[...prev,n]:prev.map(x=>x.id===n.id?n:x));
    setFormNov(null);
  };
  const saveFicha=()=>{
    if(!fichaForm) return;
    const f={...fichaForm,nombre};
    const exists=fichas.find(x=>x.nombre===nombre);
    saveFichas(prev=>exists?prev.map(x=>x.nombre===nombre?f:x):[...prev,f]);
    setFichaEdit(false);
  };

  /* ── Styles ── */
  const S={
    page:{minHeight:"100vh",background:T.bg,fontFamily:"'Outfit',sans-serif"},
    card:{background:T.surface,border:`1px solid ${T.border}`,borderRadius:6,padding:"16px 18px",marginBottom:12},
    row:{display:"flex",gap:8,alignItems:"center"},
    col:{display:"flex",flexDirection:"column",gap:4},
    th:{padding:"7px 10px",fontSize:9,letterSpacing:1.2,textTransform:"uppercase",color:T.inkLight,fontWeight:700,textAlign:"left",borderBottom:`2px solid ${T.border}`},
    td:{padding:"9px 10px",borderBottom:`1px solid ${T.border}`,fontSize:12},
    overlay:{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center"},
    modal:{background:T.surface,borderRadius:6,padding:24,width:460,maxWidth:"95vw",boxShadow:T.shadowMd,maxHeight:"90vh",overflowY:"auto"},
    navBtn:(active)=>({padding:"11px 14px",border:"none",background:"transparent",borderBottom:active?`2px solid ${T.ink}`:"2px solid transparent",color:active?T.ink:T.inkLight,fontSize:10,fontWeight:active?700:400,letterSpacing:.3,textTransform:"uppercase",cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,display:"flex",alignItems:"center",gap:5}),
    calDay:(ds,today,sel)=>({borderRadius:4,aspectRatio:"1",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:11,fontWeight:ds.c?700:400,color:sel?"#fff":ds.c||T.ink,background:sel?T.ink:ds.bg||"transparent",border:today?`1px solid ${T.ink}`:"1px solid transparent"}),
    kpiMini:(color)=>({flex:1,background:T.surface,border:`1px solid ${T.border}`,borderRadius:5,padding:"10px 12px",minWidth:0}),
  };

  /* ── LOGIN ── */
  if(!logged) return (
    <div style={{...S.page,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{...S.card,width:360,overflow:"hidden",padding:0}}>
        <div style={{background:T.ink,padding:"28px 24px",textAlign:"center"}}>
          <svg width={34} height={34} viewBox="0 0 34 34" fill="none" style={{margin:"0 auto 12px",display:"block"}}>
            <rect x="2.5" y="4.5" width="25" height="25" stroke="rgba(255,255,255,.25)" strokeWidth="0.8"/>
            <rect x="2.5" y="4.5" width="25" height="25" stroke="#fff" strokeWidth="1.2"/>
            <rect x="7.5" y="10" width="4" height="13" fill="#fff"/>
            <rect x="7.5" y="15.5" width="13" height="3" fill="#fff"/>
            <rect x="16.5" y="10" width="4" height="13" fill="#fff"/>
          </svg>
          <div style={{fontSize:14,fontWeight:800,letterSpacing:3,textTransform:"uppercase",color:"#fff"}}>HABITARIS</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,.4)",marginTop:3}}>Portal del Empleado</div>
        </div>
        <div style={{padding:"20px 20px 16px"}}>
          <p style={{fontSize:11,color:T.inkLight,marginBottom:10,textAlign:"center"}}>Introduce tu nombre completo para acceder</p>
          <Input value={nombre} onChange={setNombre} placeholder="Ej. María García López"
            style={{marginBottom:8}} onKeyDown={e=>e.key==="Enter"&&nombre.trim()&&setLogged(true)}/>
          <button onClick={()=>nombre.trim()&&setLogged(true)}
            style={{width:"100%",padding:"9px",background:T.ink,color:"#fff",border:"none",borderRadius:3,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>
            Entrar al portal
          </button>
          <p style={{fontSize:9,color:T.inkXLight,marginTop:10,textAlign:"center",lineHeight:1.4}}>Fase 1 · En producción se usará email + contraseña</p>
        </div>
      </div>
    </div>
  );

  /* ── NAV ── */
  const NAV=[
    {id:"calendario",lbl:"📅 Calendario",badge:0},
    {id:"partes",lbl:"📋 Mis Partes",badge:misPartes.filter(p=>p.estado==="Borrador").length},
    {id:"solicitudes",lbl:"📨 Solicitudes",badge:pendNov},
    {id:"viajes",lbl:"✈️ Viajes",badge:0},
    {id:"ficha",lbl:"👤 Mi Ficha",badge:0},
    {id:"documentos",lbl:"📁 Mis Docs",badge:0},
  ];

  /* ── VISTA CALENDARIO ── */
  const todayISO=new Date().toISOString().slice(0,10);
  const prevMonth=()=>{let m=calMonth-1,y=calYear;if(m<0){m=11;y--;}setCalMonth(m);setCalYear(y);};
  const nextMonth=()=>{let m=calMonth+1,y=calYear;if(m>11){m=0;y++;}setCalMonth(m);setCalYear(y);};

  const VCalendario=()=>(
    <div className="fade-up">
      {bajaActiva&&<div style={{background:T.redBg,border:`1px solid ${T.red}33`,borderRadius:4,padding:"10px 14px",marginBottom:12,display:"flex",gap:8,alignItems:"center"}}>
        <span style={{fontSize:18}}>🏥</span>
        <div><div style={{fontSize:12,fontWeight:700,color:T.red}}>Baja médica activa desde {bajaActiva.fechaInicio}</div>
          <div style={{fontSize:10,color:T.red,opacity:.7}}>{bajaActiva.motivo}</div></div>
      </div>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
        {[["Horas aprobadas",`${horasAprob}h`,T.blue],[`Días vacaciones`,`${vacAprob}d`,T.green],["Partes borrador",misPartes.filter(p=>p.estado==="Borrador").length,T.amber],["Sol. pendientes",pendNov,pendNov>0?T.amber:T.ink]].map(([lbl,val,col])=>(
          <div key={lbl} style={S.kpiMini()}>
            <div style={{fontSize:9,letterSpacing:1,textTransform:"uppercase",color:T.inkLight,marginBottom:4}}>{lbl}</div>
            <div style={{fontSize:20,fontWeight:800,color:col,fontFamily:"'DM Mono',monospace"}}>{val}</div>
          </div>
        ))}
      </div>
      <div style={S.card}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <button onClick={prevMonth} style={{background:T.accent,border:`1px solid ${T.border}`,borderRadius:3,padding:"5px 12px",cursor:"pointer",fontSize:16}}>‹</button>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:15,fontWeight:800,color:T.ink}}>{MESES[calMonth]} {calYear}</div>
            <div style={{fontSize:10,color:T.inkLight,marginTop:1}}>Pulsa un día para ver / imputar</div>
          </div>
          <button onClick={nextMonth} style={{background:T.accent,border:`1px solid ${T.border}`,borderRadius:3,padding:"5px 12px",cursor:"pointer",fontSize:16}}>›</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:4}}>
          {DIAS.map(d=><div key={d} style={{textAlign:"center",fontSize:9,fontWeight:700,color:T.inkLight,padding:"4px 0",letterSpacing:.5}}>{d}</div>)}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
          {calDays.map((day,i)=>{
            if(!day) return <div key={`e${i}`}/>;
            const iso=toISO(calYear,calMonth,day);
            const evs=evByDay[iso]||[];
            const isToday=iso===todayISO;
            const isSel=iso===selDay;
            const isWE=new Date(calYear,calMonth,day).getDay()%6===0;
            let dotC=null;
            if(evs.some(e=>e.kind==="novedad"&&e.obj.estado==="Rechazada")) dotC=T.red;
            else if(evs.some(e=>e.kind==="novedad"&&e.obj.estado==="Aprobada")) dotC=T.green;
            else if(evs.some(e=>e.kind==="novedad"&&e.obj.estado==="Pendiente")) dotC="#7A5218";
            else if(evs.some(e=>e.kind==="parte"&&e.obj.estado==="Aprobado")) dotC=T.blue;
            else if(evs.length) dotC="#555";
            return (
              <div key={iso} onClick={()=>{setSelDay(iso===selDay?null:iso);}}
                style={{borderRadius:4,padding:"5px 2px",display:"flex",flexDirection:"column",alignItems:"center",cursor:"pointer",background:isSel?T.ink:isWE?"#F8F7F4":"transparent",border:isToday?`1px solid ${T.ink}`:"1px solid transparent",transition:"background .1s"}}>
                <span style={{fontSize:11,fontWeight:isSel||isToday?700:400,color:isSel?"#fff":isWE?T.inkLight:T.ink}}>{day}</span>
                {dotC&&<div style={{width:4,height:4,borderRadius:"50%",background:isSel?"rgba(255,255,255,.7)":dotC,marginTop:2}}/>}
              </div>
            );
          })}
        </div>
      </div>
      {selDay&&(()=>{
        const evs=evByDay[selDay]||[];
        const dStr=new Date(selDay+"T12:00:00").toLocaleDateString("es-CO",{weekday:"long",day:"numeric",month:"long"});
        return (
          <div style={S.card}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontSize:13,fontWeight:700,color:T.ink,textTransform:"capitalize"}}>{dStr}</div>
              <Btn small variant="primary" onClick={()=>setFormParte({...DEF_PARTE(nombre),fecha:selDay})}><Plus size={11}/>Imputar horas</Btn>
            </div>
            {evs.length===0&&<p style={{fontSize:11,color:T.inkLight,textAlign:"center",padding:"12px 0"}}>Sin registros para este día.</p>}
            {evs.map((e,i)=>{
              const s=estC(e.obj.estado);
              if(e.kind==="parte"){
                const p=e.obj;
                return <div key={i} style={{background:T.surfaceAlt||T.accent,borderRadius:4,padding:"10px 12px",marginBottom:6}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontWeight:600,fontSize:12}}>{p.otCodigo} · {p.actividad}</span>
                    <Badge color={s.c} bg={s.bg}>{p.estado}</Badge>
                  </div>
                  <div style={{fontSize:11,color:T.inkMid,marginTop:4}}>{p.horasNormales}h normales · {p.horasExtra}h extra</div>
                  {p.estado==="Borrador"&&<div style={{marginTop:6}}><Btn small variant="primary" onClick={()=>enviarParte(p.id)}>Enviar</Btn></div>}
                </div>;
              }
              const ti=tipoInfo(e.obj.tipo);
              return <div key={i} style={{background:ti.bg,borderRadius:4,padding:"10px 12px",marginBottom:6}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontWeight:600,fontSize:12,color:ti.color}}>{ti.icono} {ti.lbl}</span>
                  <Badge color={s.c} bg={s.bg}>{e.obj.estado}</Badge>
                </div>
                {e.obj.motivo&&<div style={{fontSize:11,color:ti.color,opacity:.8,marginTop:3}}>{e.obj.motivo}</div>}
              </div>;
            })}
          </div>
        );
      })()}
    </div>
  );

  /* ── VISTA PARTES ── */
  const VPartes=()=>(
    <div className="fade-up">
      <div style={{marginBottom:12,display:"flex",justifyContent:"flex-end"}}>
        <Btn variant="primary" small onClick={()=>setFormParte({...DEF_PARTE(nombre),fecha:todayISO})}><Plus size={11}/>Nuevo parte</Btn>
      </div>
      {misPartes.length===0?<div style={{textAlign:"center",padding:"40px 0",color:T.inkLight}}><ClipboardList size={32} style={{opacity:.2,marginBottom:8}}/><p style={{fontSize:12}}>Sin partes registrados.</p></div>:(
        <div style={S.card,{padding:0}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr>{["Fecha","OT","Actividad","H.Norm","H.Extra","Estado",""].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>{misPartes.sort((a,b)=>b.fecha?.localeCompare(a.fecha)||0).map(p=>{
              const s=estC(p.estado);
              return <tr key={p.id} onMouseEnter={e=>e.currentTarget.style.background=T.surfaceAlt||"#F5F4F0"} onMouseLeave={e=>e.currentTarget.style.background=""}>
                <td style={S.td} className="mono">{p.fecha}</td>
                <td style={S.td}>{p.otCodigo}</td>
                <td style={S.td}>{p.actividad}</td>
                <td style={{...S.td,textAlign:"center"}}>{p.horasNormales}</td>
                <td style={{...S.td,textAlign:"center"}}>{p.horasExtra||0}</td>
                <td style={S.td}><Badge color={s.c} bg={s.bg}>{p.estado}</Badge></td>
                <td style={S.td}>
                  {p.estado==="Borrador"&&<div style={{display:"flex",gap:4}}>
                    <Btn small variant="primary" onClick={()=>enviarParte(p.id)}>Enviar</Btn>
                    <Btn small variant="ghost" onClick={()=>setFormParte({...p})}><Edit3 size={11}/></Btn>
                    <Btn small variant="danger" onClick={()=>savePartes(prev=>prev.filter(x=>x.id!==p.id))}><Trash2 size={11}/></Btn>
                  </div>}
                  {p.estado==="Rechazado"&&p.comentarioAdmin&&<span style={{fontSize:10,color:T.red}}>Motivo: {p.comentarioAdmin}</span>}
                </td>
              </tr>;
            })}</tbody>
          </table>
        </div>
      )}
    </div>
  );

  /* ── VISTA SOLICITUDES ── */
  const VSolicitudes=()=>(
    <div className="fade-up">
      <div style={{marginBottom:12,display:"flex",justifyContent:"flex-end"}}>
        <Btn variant="primary" small onClick={()=>setFormNov({...DEF_NOVEDAD(nombre)})}><Plus size={11}/>Nueva solicitud</Btn>
      </div>
      {misNov.length===0?<div style={{textAlign:"center",padding:"40px 0",color:T.inkLight}}><Bell size={32} style={{opacity:.2,marginBottom:8}}/><p style={{fontSize:12}}>Sin solicitudes.</p></div>:(
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {misNov.sort((a,b)=>b.fechaSolicitud?.localeCompare(a.fechaSolicitud)||0).map(n=>{
            const ti=tipoInfo(n.tipo); const s=estC(n.estado);
            return <div key={n.id} style={{...S.card,borderLeft:`3px solid ${ti.color}`,marginBottom:0}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div>
                  <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:4}}>
                    <span style={{fontSize:16}}>{ti.icono}</span>
                    <span style={{fontWeight:700,fontSize:13,color:ti.color}}>{ti.lbl}</span>
                    <Badge color={s.c} bg={s.bg}>{n.estado}</Badge>
                  </div>
                  {n.fechaInicio&&<div style={{fontSize:11,color:T.inkMid}}>{n.fechaInicio}{n.fechaFin&&` → ${n.fechaFin}`} {n.dias>0&&`· ${n.dias} días`}</div>}
                  {n.horas>0&&<div style={{fontSize:11,color:T.inkMid}}>{n.horas}h</div>}
                  {n.motivo&&<div style={{fontSize:11,color:T.inkMid,marginTop:2}}>{n.motivo}</div>}
                  {n.comentarioAdmin&&<div style={{fontSize:11,color:s.c,marginTop:4,fontStyle:"italic"}}>Admin: {n.comentarioAdmin}</div>}
                </div>
                <div style={{fontSize:10,color:T.inkLight}}>{n.fechaSolicitud}</div>
              </div>
            </div>;
          })}
        </div>
      )}
    </div>
  );

  /* ── VISTA FICHA ── */
  const VFicha=()=>{
    const f=fichaEdit?fichaForm:miFicha;
    return <div className="fade-up">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <h3 style={{fontSize:14,fontWeight:700,color:T.ink}}>Mi Ficha Personal</h3>
        {!fichaEdit
          ?<Btn small variant="outline" onClick={()=>{setFichaForm({...miFicha});setFichaEdit(true);}}><Edit3 size={11}/>Editar</Btn>
          :<div style={{display:"flex",gap:6}}><Btn small variant="outline" onClick={()=>setFichaEdit(false)}>Cancelar</Btn><Btn small variant="primary" onClick={saveFicha}><Save size={11}/>Guardar</Btn></div>
        }
      </div>
      {[
        {sec:"Datos Personales",fields:[["Nombre",f.nombre],["Apellidos",f.apellidos],["Email",f.email],["Teléfono",f.telefono],["Fecha nacimiento",f.fechaNacimiento],["Documento",`${f.tipoDocumento} ${f.numeroDocumento}`]]},
        {sec:"Contrato",fields:[["Cargo",f.cargo],["Tipo contrato",f.tipoContrato],["Fecha ingreso",f.fechaIngreso],["Salario bruto",f.salarioBruto?`$ ${Number(f.salarioBruto).toLocaleString()}`:""]]},
        {sec:"Seguridad Social",fields:[["EPS",f.eps],["AFP",f.afp],["ARL",f.arl],["Caja compensación",f.cajaCompensacion]]},
        {sec:"Datos Bancarios",fields:[["Entidad",f.entidadBancaria],["Tipo cuenta",f.tipoCuenta],["Nº cuenta",f.cuentaBancaria]]},
      ].map(({sec,fields})=>(
        <div key={sec} style={S.card}>
          <div style={{fontSize:10,letterSpacing:1.2,textTransform:"uppercase",color:T.inkLight,fontWeight:700,marginBottom:10}}>{sec}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {fields.map(([lbl,val])=>(
              <div key={lbl}>
                <div style={{fontSize:9,color:T.inkLight,letterSpacing:.5,textTransform:"uppercase",marginBottom:2}}>{lbl}</div>
                {fichaEdit
                  ?<Input value={fichaForm[Object.keys(DEF_FICHA()).find(k=>DEF_FICHA()[k]===val||lbl.toLowerCase().includes(k.toLowerCase()))||lbl]||""} onChange={v=>setFichaForm(f=>({...f,[lbl.toLowerCase().replace(/\s/g,"")]:v}))} small/>
                  :<div style={{fontSize:12,color:T.ink,fontWeight:val?400:300}}>{val||<span style={{color:T.inkXLight}}>—</span>}</div>
                }
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>;
  };

  /* ── VISTA DOCS ── */
  const VDocs=()=>(
    <div className="fade-up">
      {misDocs.length===0?<div style={{textAlign:"center",padding:"40px 0",color:T.inkLight}}><Briefcase size={32} style={{opacity:.2,marginBottom:8}}/><p style={{fontSize:12}}>Sin documentos compartidos todavía.</p><p style={{fontSize:11,color:T.inkXLight,marginTop:4}}>Cuando RRHH suba tus documentos aparecerán aquí.</p></div>:(
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {misDocs.map(d=>{
            const tc=TIPO_DOC_OPTS.find(x=>x.value===d.tipo)||TIPO_DOC_OPTS[5];
            return <div key={d.id} style={{...S.card,display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:0}}>
              <div>
                <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:2}}>
                  <span>{tc.label}</span>
                  <Badge color={tc.color} bg={tc.color+"22"}>{MESES_NAMES[d.mes-1]||""} {d.anio}</Badge>
                </div>
                <div style={{fontSize:11,color:T.inkMid}}>{d.nombre||d.docNombre}</div>
              </div>
              {d.docBase64&&<a href={d.docBase64} download={d.docNombre||"documento.pdf"}>
                <Btn small variant="outline"><Download size={11}/>Descargar</Btn>
              </a>}
            </div>;
          })}
        </div>
      )}
    </div>
  );

  /* ── VIAJES: shared data with Admin module ── */
  const ADM_KEY = "habitaris_admin";
  const getAdm = () => { try { return JSON.parse(localStorage.getItem(ADM_KEY))||{}; } catch { return {}; } };
  const saveAdm = (k,v) => { const d=getAdm(); d[k]=v; localStorage.setItem(ADM_KEY,JSON.stringify(d)); };
  const [misViajes, setMisViajes] = useState(() => (getAdm().adm_viaticos||[]).filter(v=>v.solicitante===nombre));
  const refreshViajes = () => setMisViajes((getAdm().adm_viaticos||[]).filter(v=>v.solicitante===nombre));
  const [showNewViaje, setShowNewViaje] = useState(false);
  const [selViaje, setSelViaje] = useState(null);
  const [newViaje, setNewViaje] = useState({ destino:"", dias:1, concepto:"", fecha:today(), fechaRegreso:"" });

  const ITEMS_VIAJE = [
    { id:"vuelo_ida", lbl:"Vuelo ida", icon:"✈️" },
    { id:"vuelo_vuelta", lbl:"Vuelo vuelta", icon:"✈️" },
    { id:"hotel", lbl:"Hotel", icon:"🏨" },
    { id:"transporte", lbl:"Transporte", icon:"🚕" },
    { id:"alimentacion", lbl:"Alimentación", icon:"🍽️" },
    { id:"otros", lbl:"Otros", icon:"📋" },
  ];

  const crearViaje = () => {
    const itemsViaje = {};
    ITEMS_VIAJE.forEach(it => { itemsViaje[it.id] = { estimado:0, real:0, detalle:"" }; });
    const v = { id:Math.random().toString(36).slice(2,10), solicitante:nombre, ...newViaje,
      dias:parseInt(newViaje.dias)||1, estado:"solicitado", gastos:[], anticipoEntregado:0, itemsViaje, creadoDesde:"portal" };
    const all = [...(getAdm().adm_viaticos||[]), v];
    saveAdm("adm_viaticos", all);
    setMisViajes(all.filter(x=>x.solicitante===nombre));
    setSelViaje(v.id);
    setNewViaje({ destino:"", dias:1, concepto:"", fecha:today(), fechaRegreso:"" });
    setShowNewViaje(false);
  };

  const updViajeItem = (vId, itemId, field, val) => {
    const all = (getAdm().adm_viaticos||[]).map(v => {
      if (v.id !== vId) return v;
      const items = {...(v.itemsViaje||{})};
      items[itemId] = {...(items[itemId]||{estimado:0,real:0,detalle:""}), [field]:val};
      return {...v, itemsViaje:items};
    });
    saveAdm("adm_viaticos", all);
    setMisViajes(all.filter(x=>x.solicitante===nombre));
  };

  const addGastoViaje = (vId, gasto) => {
    const all = (getAdm().adm_viaticos||[]).map(v =>
      v.id===vId ? {...v, gastos:[...(v.gastos||[]), { id:Math.random().toString(36).slice(2,10), ...gasto }]} : v);
    saveAdm("adm_viaticos", all);
    setMisViajes(all.filter(x=>x.solicitante===nombre));
  };

  const viajeEstimado = (v) => ITEMS_VIAJE.reduce((s,it) => s + (parseFloat((v.itemsViaje||{})[it.id]?.estimado)||0), 0);
  const viajeReal = (v) => ITEMS_VIAJE.reduce((s,it) => s + (parseFloat((v.itemsViaje||{})[it.id]?.real)||0), 0) + (v.gastos||[]).reduce((s,g)=>s+g.monto,0);

  const VEST = { solicitado:{lbl:"Solicitado",c:T.amber}, aprobado:{lbl:"Aprobado",c:T.blue}, entregado:{lbl:"Anticipo entregado",c:"#5B3A8C"}, legalizado:{lbl:"Legalizado",c:T.green}, rechazado:{lbl:"Rechazado",c:T.red} };

  const selV = misViajes.find(v=>v.id===selViaje);
  const [newGastoV, setNewGastoV] = useState(null);

  const VViajes=()=>(
    <div className="fade-up">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div><h3 style={{margin:0,fontSize:16,fontWeight:700}}>✈️ Mis Viajes y Viáticos</h3>
          <p style={{margin:0,fontSize:10,color:T.inkLight}}>Solicita viáticos, registra gastos y legaliza</p></div>
        <button onClick={()=>setShowNewViaje(true)}
          style={{padding:"8px 16px",background:T.ink,color:"#fff",border:"none",borderRadius:5,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif",display:"flex",alignItems:"center",gap:5}}>
          <Plus size={11}/> Solicitar viaje
        </button>
      </div>

      {misViajes.length===0 ? (
        <div style={{...S.card,textAlign:"center",padding:40,color:T.inkLight}}>
          <Briefcase size={32} style={{opacity:.2,marginBottom:8}}/>
          <p style={{fontSize:12}}>No tienes solicitudes de viaje.</p>
          <p style={{fontSize:10,color:T.inkXLight}}>Pulsa "Solicitar viaje" para crear una.</p>
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {misViajes.map(v => {
            const est = viajeEstimado(v);
            const re = viajeReal(v);
            const vst = VEST[v.estado]||VEST.solicitado;
            return (
              <div key={v.id} onClick={()=>setSelViaje(v.id===selViaje?null:v.id)}
                style={{...S.card,cursor:"pointer",marginBottom:0,border:selViaje===v.id?`2px solid ${T.ink}`:`1px solid ${T.border}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:700}}>{v.destino} <span style={{fontSize:10,fontWeight:400,color:T.inkMid}}>· {v.dias} días · {v.fecha}{v.fechaRegreso?` → ${v.fechaRegreso}`:""}</span></div>
                    <div style={{fontSize:10,color:T.inkMid,marginTop:2}}>{v.concepto}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <span style={{fontSize:8,fontWeight:700,padding:"2px 8px",borderRadius:10,background:vst.c+"22",color:vst.c}}>{vst.lbl}</span>
                    <div style={{fontSize:10,fontFamily:"'DM Mono',monospace",fontWeight:700,marginTop:4}}>
                      Est: ${new Intl.NumberFormat("es-CO",{maximumFractionDigits:0}).format(est)}
                      {re>0 && <span style={{color:"#5B3A8C",marginLeft:8}}>Real: ${new Intl.NumberFormat("es-CO",{maximumFractionDigits:0}).format(re)}</span>}
                    </div>
                  </div>
                </div>

                {/* Expanded detail */}
                {selViaje===v.id && (
                  <div style={{marginTop:12,borderTop:`1px solid ${T.border}`,paddingTop:12}} onClick={e=>e.stopPropagation()}>
                    {/* Items table */}
                    <div style={{fontSize:9,fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Desglose estimado</div>
                    <table style={{borderCollapse:"collapse",width:"100%",marginBottom:12}}>
                      <thead>
                        <tr style={{background:"#F5F4F1"}}>
                          <th style={{padding:"4px 8px",fontSize:8,fontWeight:700,color:"#888",textAlign:"left",borderBottom:`1px solid ${T.border}`}}>Ítem</th>
                          <th style={{padding:"4px 8px",fontSize:8,fontWeight:700,color:"#888",textAlign:"left",borderBottom:`1px solid ${T.border}`}}>Detalle</th>
                          <th style={{padding:"4px 8px",fontSize:8,fontWeight:700,color:T.blue,textAlign:"right",borderBottom:`1px solid ${T.border}`}}>Estimado</th>
                          {(v.estado==="entregado"||v.estado==="legalizado") && (
                            <th style={{padding:"4px 8px",fontSize:8,fontWeight:700,color:"#5B3A8C",textAlign:"right",borderBottom:`1px solid ${T.border}`}}>Real</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {ITEMS_VIAJE.map((it,i) => {
                          const item = (v.itemsViaje||{})[it.id] || { estimado:0, real:0, detalle:"" };
                          const canEdit = v.estado==="solicitado" || v.estado==="aprobado";
                          const canEditReal = v.estado==="entregado" || v.estado==="legalizado";
                          return (
                            <tr key={it.id} style={{borderBottom:`1px solid ${T.border}`,background:i%2?"#FAFAF8":"#fff"}}>
                              <td style={{padding:"4px 8px",fontSize:10,fontWeight:600}}>{it.icon} {it.lbl}</td>
                              <td style={{padding:"3px 4px"}}>
                                {canEdit ? (
                                  <input type="text" value={item.detalle||""} placeholder="Detalle..."
                                    onChange={e=>updViajeItem(v.id,it.id,"detalle",e.target.value)}
                                    style={{width:"100%",border:`1px solid ${T.border}`,borderRadius:3,padding:"3px 6px",fontSize:9,background:"#fff",fontFamily:"'Outfit',sans-serif"}}/>
                                ) : <span style={{fontSize:9,color:T.inkMid}}>{item.detalle||"—"}</span>}
                              </td>
                              <td style={{padding:"3px 4px"}}>
                                {canEdit ? (
                                  <input type="number" value={item.estimado||""} placeholder="0"
                                    onChange={e=>updViajeItem(v.id,it.id,"estimado",e.target.value)}
                                    style={{width:"100%",textAlign:"right",border:`1px solid ${T.border}`,borderRadius:3,padding:"3px 6px",fontSize:10,fontFamily:"'DM Mono',monospace",fontWeight:600,color:T.blue,background:"#fff"}}/>
                                ) : <div style={{textAlign:"right",fontSize:10,fontFamily:"'DM Mono',monospace",fontWeight:600,color:T.blue,padding:"3px 6px"}}>${new Intl.NumberFormat("es-CO",{maximumFractionDigits:0}).format(parseFloat(item.estimado)||0)}</div>}
                              </td>
                              {(v.estado==="entregado"||v.estado==="legalizado") && (
                                <td style={{padding:"3px 4px"}}>
                                  {canEditReal ? (
                                    <input type="number" value={item.real||""} placeholder="0"
                                      onChange={e=>updViajeItem(v.id,it.id,"real",e.target.value)}
                                      style={{width:"100%",textAlign:"right",border:`1px solid ${T.border}`,borderRadius:3,padding:"3px 6px",fontSize:10,fontFamily:"'DM Mono',monospace",fontWeight:600,color:"#5B3A8C",background:"#fff"}}/>
                                  ) : <div style={{textAlign:"right",fontSize:10,fontFamily:"'DM Mono',monospace",fontWeight:600,color:"#5B3A8C",padding:"3px 6px"}}>${new Intl.NumberFormat("es-CO",{maximumFractionDigits:0}).format(parseFloat(item.real)||0)}</div>}
                                </td>
                              )}
                            </tr>
                          );
                        })}
                        <tr style={{borderTop:`2px solid ${T.ink}`,background:"#EDEBE7"}}>
                          <td colSpan={2} style={{padding:"4px 8px",fontSize:10,fontWeight:800}}>TOTAL</td>
                          <td style={{padding:"4px 8px",textAlign:"right",fontSize:11,fontFamily:"'DM Mono',monospace",fontWeight:800,color:T.blue}}>
                            ${new Intl.NumberFormat("es-CO",{maximumFractionDigits:0}).format(est)}
                          </td>
                          {(v.estado==="entregado"||v.estado==="legalizado") && (
                            <td style={{padding:"4px 8px",textAlign:"right",fontSize:11,fontFamily:"'DM Mono',monospace",fontWeight:800,color:"#5B3A8C"}}>
                              ${new Intl.NumberFormat("es-CO",{maximumFractionDigits:0}).format(viajeReal(v))}
                            </td>
                          )}
                        </tr>
                      </tbody>
                    </table>

                    {/* Status messages */}
                    {v.estado==="solicitado" && (
                      <div style={{background:T.amberBg,border:`1px solid ${T.amber}33`,borderRadius:4,padding:"8px 12px",fontSize:10,color:T.amber,fontWeight:600}}>
                        ⏳ Pendiente de aprobación por Administración. Completa el desglose estimado arriba.
                      </div>
                    )}
                    {v.estado==="aprobado" && (
                      <div style={{background:T.blueBg,border:`1px solid ${T.blue}33`,borderRadius:4,padding:"8px 12px",fontSize:10,color:T.blue,fontWeight:600}}>
                        ✅ Aprobado. Administración gestionará la compra de tiquetes y hotel.
                      </div>
                    )}
                    {v.estado==="entregado" && (
                      <div style={{background:"#F0ECF6",border:"1px solid #5B3A8C33",borderRadius:4,padding:"8px 12px",fontSize:10,color:"#5B3A8C",fontWeight:600}}>
                        💰 Anticipo entregado: ${new Intl.NumberFormat("es-CO",{maximumFractionDigits:0}).format(v.anticipoEntregado||0)}. Registra los gastos reales en la columna "Real" y añade gastos extra abajo.
                        <button onClick={()=>setNewGastoV({fecha:today(),concepto:"",monto:0,soporte:""})}
                          style={{display:"block",marginTop:6,padding:"4px 12px",background:"#5B3A8C",color:"#fff",border:"none",borderRadius:3,fontSize:9,fontWeight:700,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>
                          + Añadir gasto extra
                        </button>
                      </div>
                    )}
                    {v.estado==="legalizado" && (
                      <div style={{background:T.greenBg,border:`1px solid ${T.green}33`,borderRadius:4,padding:"8px 12px",fontSize:10,color:T.green,fontWeight:600}}>
                        ✅ Legalizado y cerrado.
                      </div>
                    )}
                    {v.estado==="rechazado" && (
                      <div style={{background:T.redBg,border:`1px solid ${T.red}33`,borderRadius:4,padding:"8px 12px",fontSize:10,color:T.red,fontWeight:600}}>
                        ❌ Rechazado por Administración.
                      </div>
                    )}

                    {/* Gastos extra list */}
                    {(v.gastos||[]).length > 0 && (
                      <div style={{marginTop:10}}>
                        <div style={{fontSize:9,fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Gastos extra</div>
                        {v.gastos.map(g=>(
                          <div key={g.id} style={{display:"flex",justifyContent:"space-between",padding:"4px 8px",borderBottom:`1px solid ${T.border}`,fontSize:10}}>
                            <span>{g.fecha} · {g.concepto}</span>
                            <span style={{fontFamily:"'DM Mono',monospace",fontWeight:700,color:T.red}}>−${new Intl.NumberFormat("es-CO",{maximumFractionDigits:0}).format(g.monto)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal nueva solicitud */}
      {showNewViaje && (
        <div style={S.overlay} onClick={()=>setShowNewViaje(false)}>
          <div style={S.modal} onClick={e=>e.stopPropagation()}>
            <h3 style={{marginBottom:4,fontSize:14,fontWeight:700}}>✈️ Solicitar viaje</h3>
            <p style={{fontSize:10,color:T.inkLight,marginBottom:14}}>Después de crear podrás completar el desglose (vuelos, hotel, etc.)</p>
            <FieldRow label="Destino"><Input value={newViaje.destino} onChange={v=>setNewViaje({...newViaje,destino:v})} placeholder="Ciudad / lugar"/></FieldRow>
            <div style={{display:"grid",gridTemplateColumns:"1fr 80px",gap:10}}>
              <FieldRow label="Concepto / motivo"><Input value={newViaje.concepto} onChange={v=>setNewViaje({...newViaje,concepto:v})} placeholder="Visita obra, capacitación..."/></FieldRow>
              <FieldRow label="Días"><Input type="number" value={newViaje.dias} onChange={v=>setNewViaje({...newViaje,dias:v})}/></FieldRow>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <FieldRow label="Fecha ida"><Input type="date" value={newViaje.fecha} onChange={v=>setNewViaje({...newViaje,fecha:v})}/></FieldRow>
              <FieldRow label="Fecha regreso"><Input type="date" value={newViaje.fechaRegreso} onChange={v=>setNewViaje({...newViaje,fechaRegreso:v})}/></FieldRow>
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16,paddingTop:12,borderTop:`1px solid ${T.border}`}}>
              <Btn variant="outline" onClick={()=>setShowNewViaje(false)}>Cancelar</Btn>
              <Btn variant="primary" onClick={crearViaje} disabled={!newViaje.destino}><Send size={12}/>Enviar solicitud</Btn>
            </div>
          </div>
        </div>
      )}

      {/* Modal gasto extra */}
      {newGastoV && (
        <div style={S.overlay} onClick={()=>setNewGastoV(null)}>
          <div style={S.modal} onClick={e=>e.stopPropagation()}>
            <h3 style={{marginBottom:12,fontSize:14,fontWeight:700}}>Gasto extra</h3>
            <FieldRow label="Fecha"><Input type="date" value={newGastoV.fecha} onChange={v=>setNewGastoV({...newGastoV,fecha:v})}/></FieldRow>
            <FieldRow label="Concepto"><Input value={newGastoV.concepto} onChange={v=>setNewGastoV({...newGastoV,concepto:v})} placeholder="Taxi, imprevisto..."/></FieldRow>
            <FieldRow label="Monto"><Input type="number" value={newGastoV.monto} onChange={v=>setNewGastoV({...newGastoV,monto:v})}/></FieldRow>
            <FieldRow label="Soporte"><Input value={newGastoV.soporte} onChange={v=>setNewGastoV({...newGastoV,soporte:v})} placeholder="Ref. factura"/></FieldRow>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16,paddingTop:12,borderTop:`1px solid ${T.border}`}}>
              <Btn variant="outline" onClick={()=>setNewGastoV(null)}>Cancelar</Btn>
              <Btn variant="primary" onClick={()=>{addGastoViaje(selViaje,{...newGastoV,monto:parseFloat(newGastoV.monto)||0});setNewGastoV(null);}}><Save size={12}/>Guardar</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  /* ── FORM PARTE (modal) ── */
  const FormParte=()=>formParte?(
    <div style={S.overlay} onClick={()=>setFormParte(null)}>
      <div style={S.modal} onClick={e=>e.stopPropagation()}>
        <h3 style={{marginBottom:16,fontSize:14,fontWeight:700}}>Imputar horas · {formParte.fecha}</h3>
        <FieldRow label="Fecha"><Input type="date" value={formParte.fecha} onChange={v=>upd(setFormParte,"fecha",v)}/></FieldRow>
        <FieldRow label="Orden de trabajo (OT)">
          <Select value={formParte.otCodigo} onChange={v=>upd(setFormParte,"otCodigo",v)}
            options={[{value:"",label:"Seleccionar OT..."},...OTS.map(o=>({value:o,label:o}))]}/>
        </FieldRow>
        <FieldRow label="Actividad"><Input value={formParte.actividad} onChange={v=>upd(setFormParte,"actividad",v)} placeholder="Ej. Diseño conceptual"/></FieldRow>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <FieldRow label="Horas normales"><Input type="number" value={formParte.horasNormales} onChange={v=>upd(setFormParte,"horasNormales",Number(v))}/></FieldRow>
          <FieldRow label="Horas extra"><Input type="number" value={formParte.horasExtra||0} onChange={v=>upd(setFormParte,"horasExtra",Number(v))}/></FieldRow>
        </div>
        <FieldRow label="Descripción (opcional)"><Input value={formParte.descripcion||""} onChange={v=>upd(setFormParte,"descripcion",v)} placeholder="Notas sobre el trabajo realizado"/></FieldRow>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16,paddingTop:12,borderTop:`1px solid ${T.border}`}}>
          <Btn variant="outline" onClick={()=>setFormParte(null)}>Cancelar</Btn>
          <Btn variant="primary" onClick={saveParte}><Save size={12}/>Guardar borrador</Btn>
        </div>
      </div>
    </div>
  ):null;

  /* ── FORM NOVEDAD (modal) ── */
  const FormNovedad=()=>formNov?(
    <div style={S.overlay} onClick={()=>setFormNov(null)}>
      <div style={S.modal} onClick={e=>e.stopPropagation()}>
        <h3 style={{marginBottom:16,fontSize:14,fontWeight:700}}>Nueva solicitud</h3>
        <FieldRow label="Tipo de solicitud">
          <Select value={formNov.tipo} onChange={v=>upd(setFormNov,"tipo",v)}
            options={[{value:"",label:"Seleccionar..."},...NOVEDAD_TIPOS.map(t=>({value:t.id,label:`${t.icono} ${t.lbl}`}))]}/>
        </FieldRow>
        {formNov.tipo&&(()=>{
          const ti=tipoInfo(formNov.tipo);
          return <>
            {ti.requiereFechas&&<>
              <FieldRow label="Fecha inicio"><Input type="date" value={formNov.fechaInicio} onChange={v=>upd(setFormNov,"fechaInicio",v)}/></FieldRow>
              <FieldRow label="Fecha fin"><Input type="date" value={formNov.fechaFin} onChange={v=>upd(setFormNov,"fechaFin",v)}/></FieldRow>
            </>}
            {ti.requiereHoras&&<FieldRow label="Horas"><Input type="number" value={formNov.horas||0} onChange={v=>upd(setFormNov,"horas",Number(v))}/></FieldRow>}
            <FieldRow label="Motivo / Descripción">
              <Select value={formNov.motivo} onChange={v=>upd(setFormNov,"motivo",v)}
                options={[{value:"",label:"Seleccionar motivo..."},...(formNov.tipo==="licEspecial"?MOTIVOS_LIC:MOTIVOS_PERMISO).map(m=>({value:m,label:m}))]}/>
            </FieldRow>
            <FieldRow label="Descripción adicional (opcional)">
              <Input value={formNov.descripcion||""} onChange={v=>upd(setFormNov,"descripcion",v)} placeholder="Añade detalle si lo deseas..."/>
            </FieldRow>
            {ti.requiereDoc&&<FieldRow label="Documento adjunto (opcional)">
              <input type="file" accept="application/pdf,image/*"
                onChange={e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>setFormNov(x=>({...x,docNombre:f.name,docBase64:ev.target.result}));r.readAsDataURL(f);}}
                style={{fontSize:11}}/>
              {formNov.docNombre&&<div style={{fontSize:10,color:T.green,marginTop:3}}>✓ {formNov.docNombre}</div>}
            </FieldRow>}
          </>;
        })()}
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16,paddingTop:12,borderTop:`1px solid ${T.border}`}}>
          <Btn variant="outline" onClick={()=>setFormNov(null)}>Cancelar</Btn>
          <Btn variant="primary" onClick={saveNov} disabled={!formNov.tipo}><Send size={12}/>Enviar solicitud</Btn>
        </div>
      </div>
    </div>
  ):null;

  /* ── MAIN RENDER ── */
  return (
    <div style={S.page}>
      {/* portal nav bar */}
      <div style={{background:T.surface,borderBottom:`1px solid ${T.border}`,padding:"0 20px",display:"flex",overflowX:"auto"}}>
        <div style={{display:"flex",alignItems:"center",gap:6,padding:"10px 12px 10px 0",borderRight:`1px solid ${T.border}`,marginRight:8,minWidth:"fit-content"}}>
          <div style={{width:24,height:24,background:T.ink,borderRadius:3,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <span style={{fontSize:10,fontWeight:800,color:"#fff",letterSpacing:.5}}>H</span>
          </div>
          <span style={{fontSize:11,fontWeight:700,color:T.ink}}>{nombre}</span>
        </div>
        {NAV.map(n=>{
          const act=view===n.id;
          return <button key={n.id} onClick={()=>setView(n.id)} style={S.navBtn(act)}>
            {n.lbl}
            {n.badge>0&&<span style={{background:T.amber,color:"#fff",fontSize:8,fontWeight:800,padding:"1px 5px",borderRadius:8}}>{n.badge}</span>}
          </button>;
        })}
        <div style={{flex:1}}/>
        <button onClick={()=>setLogged(false)} style={{...S.navBtn(false),color:T.red}}>
          <LogOut size={11}/>Salir
        </button>
      </div>

      <div style={{padding:"20px 20px",maxWidth:900,margin:"0 auto",paddingBottom:40}}>
        {view==="calendario"  && <VCalendario/>}
        {view==="partes"      && <VPartes/>}
        {view==="solicitudes" && <VSolicitudes/>}
        {view==="viajes"      && <VViajes/>}
        {view==="ficha"       && <VFicha/>}
        {view==="documentos"  && <VDocs/>}
      </div>

      <FormParte/>
      <FormNovedad/>
    </div>
  );
}


function ModalFooter({ onCancel, onSave, saveLabel = "Guardar" }) {
  return (
    <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:20, paddingTop:16, borderTop:`1px solid ${T.border}` }}>
      <Btn variant="outline" onClick={onCancel}>Cancelar</Btn>
      <Btn variant="primary" onClick={onSave}><Save size={12}/>{saveLabel}</Btn>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN APP
───────────────────────────────────────────── */

/* ─────────────────────────────────────────────
   MAIN APP
───────────────────────────────────────────── */

const TABS = [
  { id:"dashboard", lbl:"Dashboard",          I:TrendingUp,   desc:"KPIs y métricas de RRHH" },
  { id:"cargos",    lbl:"Cargos y Salarios",   I:Users,        desc:"Plantilla y cargas sociales" },
  { id:"jornada",   lbl:"Jornada Laboral",      I:Clock,        desc:"Horas, festivos y productividad" },
  { id:"activos",   lbl:"Activos y Estructura", I:Package,      desc:"NIIF, licencias y gastos" },
  { id:"equipos",   lbl:"Equipos de Trabajo",   I:Users,        desc:"Configura equipos para APUs" },
    { id:"asistencia", lbl:"Asistencia Obra", I:Camera, desc:"Control GPS+Foto de entrada/salida" },
  { id:"partes",    lbl:"Partes de Trabajo",    I:ClipboardList,desc:"Vista admin — empleados imputan desde Portal" },
  { id:"novedades", lbl:"Novedades Nómina",     I:FileText,     desc:"Vacaciones, bajas, permisos y horas extra" },
  { id:"docs",      lbl:"Documentos",           I:Briefcase,    desc:"Nóminas, contratos y certificados" },
  { id:"portal",    lbl:"Portal Empleado",      I:Eye,          desc:"Vista del trabajador" },
];

export default function HabitarisRRHH({ pais = "CO" }) {
  const [tab, setTab] = useState("dashboard");
  const currentUser = { pais }; // placeholder hasta que exista auth
  const [cargos,    saveCargos]    = useStore(NS.cargos,    []);
  const [jornada,   saveJornada]   = useStore(NS.jornada,   DEF_JORNADA);
  const [activos,   saveActivos]   = useStore(NS.activos,   []);
  const [licencias, saveLicencias] = useStore(NS.licencias, []);
  const [gastos,    saveGastos]    = useStore(NS.gastos,    []);
  const [equipos,   saveEquipos]   = useStore(NS.equipos,   []);
  const [partes,    savePartes]    = useStore(NS.partes,    []);
  const [asistencia, saveAsistencia] = useStore(NS.asistencia, []);
  const [empleados, saveEmpleados] = useStore(NS.empleados, []);
  const [novedades, saveNovedades] = useStore(NS.novedades, []);
  const [fichas,    saveFichas]    = useStore(NS.fichas,    []);
  const [docs,      saveDocs]      = useStore(NS.docs,      []);

  const pendientes   = partes.filter(p => p.estado === "Enviado").length;
  const pendNovAdmin = novedades.filter(n => n.estado === "Pendiente").length;

  return (
    <>
      <Fonts/>
      <div style={{ height:"100vh", display:"flex", flexDirection:"column", background:T.bg, overflow:"hidden" }}>
        {/* HEADER */}
        <div style={{ background:T.surface, borderBottom:`1px solid ${T.border}`, padding:"11px 28px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100 }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <svg width={26} height={26} viewBox="0 0 34 34" fill="none">
              <rect x="2.5" y="4.5" width="25" height="25" stroke={T.ink} strokeWidth="1.2"/>
              <rect x="7.5" y="10" width="4" height="13" fill={T.ink}/>
              <rect x="7.5" y="15.5" width="13" height="3" fill={T.ink}/>
              <rect x="16.5" y="10" width="4" height="13" fill={T.ink}/>
            </svg>
            <div>
              <span style={{ fontSize:13, fontWeight:800, letterSpacing:3.5, textTransform:"uppercase", color:T.ink }}>HABITARIS</span>
              <span style={{ fontSize:11, color:T.inkLight, marginLeft:10 }}>/ Recursos Humanos</span>
            </div>
          </div>
          <div style={{ display:"flex", gap:6 }}>
            {pendientes>0&&<div style={{ background:T.amberBg, border:`1px solid ${T.amber}33`, borderRadius:3, padding:"5px 10px", display:"flex", alignItems:"center", gap:5, cursor:"pointer" }} onClick={()=>setTab("partes")}>
              <AlertTriangle size={11} color={T.amber}/>
              <span style={{ fontSize:10, fontWeight:700, color:T.amber }}>{pendientes} parte{pendientes>1?"s":""} pendiente{pendientes>1?"s":""}</span>
            </div>}
            {pendNovAdmin>0&&<div style={{ background:"#FAF0E0", border:`1px solid #7A521833`, borderRadius:3, padding:"5px 10px", display:"flex", alignItems:"center", gap:5, cursor:"pointer" }} onClick={()=>setTab("novedades")}>
              <Bell size={11} color="#7A5218"/>
              <span style={{ fontSize:10, fontWeight:700, color:"#7A5218" }}>{pendNovAdmin} nov. pendiente{pendNovAdmin>1?"s":""}</span>
            </div>}
          </div>
        </div>

        {/* LAYOUT: SIDEBAR IZQUIERDO + CONTENT */}
        <div style={{ display:"flex", flex:1, minHeight:0 }}>
          {/* Sidebar izquierdo */}
          <div style={{ width:210, flexShrink:0, background:T.surface, borderRight:`1px solid ${T.border}`,
            display:"flex", flexDirection:"column", paddingTop:8, overflowY:"auto" }}>
            {TABS.map(t => {
              const act = tab === t.id;
              return (
                <button key={t.id} onClick={()=>setTab(t.id)} style={{
                  display:"flex", alignItems:"center", gap:9, padding:"10px 16px",
                  border:"none", borderLeft: act?`3px solid ${T.ink}`:"3px solid transparent",
                  background: act ? T.accent : "transparent",
                  color: act ? T.ink : T.inkLight,
                  fontSize:12, fontWeight:act?700:400, cursor:"pointer",
                  textAlign:"left", width:"100%", position:"relative",
                  transition:"all .1s",
                }}>
                  <t.I size={13} style={{ flexShrink:0 }}/>
                  <span style={{ lineHeight:1.2 }}>{t.lbl}</span>
                  {t.id==="partes"    && pendientes>0   && <span style={{marginLeft:"auto",background:T.amber,color:"#fff",fontSize:8,fontWeight:800,padding:"1px 5px",borderRadius:8}}>{pendientes}</span>}
                  {t.id==="novedades" && pendNovAdmin>0  && <span style={{marginLeft:"auto",background:"#7A5218",color:"#fff",fontSize:8,fontWeight:800,padding:"1px 5px",borderRadius:8}}>{pendNovAdmin}</span>}
                </button>
              );
            })}
            <div style={{ flex:1 }}/>
            <div style={{ padding:"10px 16px", fontSize:9, color:T.inkXLight, letterSpacing:0.8, borderTop:`1px solid ${T.border}` }}>
              Auto-guardado activo
            </div>
          </div>

          {/* Contenido principal */}
          <div style={{ flex:1, overflowY:"auto", paddingBottom:40 }}>
            {tab === "portal"
              ? <PortalEmpleado partes={partes} savePartes={savePartes} novedades={novedades} saveNovedades={saveNovedades} fichas={fichas} saveFichas={saveFichas} docs={docs} saveDocs={saveDocs} cargos={cargos} empleados={empleados} saveEmpleados={saveEmpleados}/>
              : (
                <div style={{ padding:"24px 28px", maxWidth:1100 }}>
                  <div style={{ marginBottom:18 }}>
                    <h2 style={{ fontSize:19, fontWeight:700, color:T.ink, letterSpacing:-.2 }}>{TABS.find(t=>t.id===tab)?.lbl}</h2>
                    <p style={{ fontSize:11, color:T.inkLight, marginTop:2 }}>{TABS.find(t=>t.id===tab)?.desc}</p>
                  </div>
                  {tab==="dashboard" && (
                    <div className="fade-up" style={{padding:"20px 0"}}>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
                        {[
                          ["👷 Cargos",cargos.length,"#111"],
                          ["👥 Empleados",empleados.length,"#1E4F8C"],
                          ["📋 Partes",partes.length,"#111"],
                          ["📨 Novedades pend.",novedades.filter(n=>n.estado==="Pendiente").length,novedades.filter(n=>n.estado==="Pendiente").length>0?"#7A5218":"#1E6B42"]
                        ].map(([l,v,c])=>(
                          <div key={l} style={{background:"#fff",border:`1px solid #E4E1DB`,borderRadius:8,padding:"14px 16px",boxShadow:"0 1px 3px rgba(0,0,0,.06)"}}>
                            <div style={{fontSize:8,fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>{l}</div>
                            <div style={{fontSize:22,fontWeight:800,fontFamily:"'DM Mono',monospace",color:c}}>{v}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
                        {[
                          ["⏰ Horas aprobadas",partes.filter(p=>p.estado==="Aprobado").reduce((s,p)=>s+Number(p.horasNormales||0)+Number(p.horasExtra||0),0)+"h","#1E6B42"],
                          ["🏖️ Vacaciones aprobadas",novedades.filter(n=>n.tipo==="vacaciones"&&n.estado==="Aprobada").reduce((s,n)=>s+Number(n.dias||0),0)+"d","#1E4F8C"],
                          ["🏥 Bajas activas",novedades.filter(n=>n.tipo==="baja"&&n.estado==="Aprobada").length,"#AE2C2C"],
                          ["✈️ Viáticos pend.",(()=>{try{return(JSON.parse(localStorage.getItem("habitaris_admin"))||{}).adm_viaticos||[];}catch{return[];}})().filter(v=>v.estado==="solicitado").length,"#7A5218"]
                        ].map(([l,v,c])=>(
                          <div key={l} style={{background:"#fff",border:`1px solid #E4E1DB`,borderRadius:8,padding:"14px 16px",boxShadow:"0 1px 3px rgba(0,0,0,.06)"}}>
                            <div style={{fontSize:8,fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>{l}</div>
                            <div style={{fontSize:22,fontWeight:800,fontFamily:"'DM Mono',monospace",color:c}}>{v}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {tab==="cargos"    && <TabCargos    cargos={cargos}    saveCargos={saveCargos}    jornada={jornada}/>}
                  {tab==="jornada"   && <TabJornada   jornada={jornada}  saveJornada={saveJornada}/>}
                  {tab==="activos"   && <TabActivos   activos={activos}  saveActivos={saveActivos}  licencias={licencias} saveLicencias={saveLicencias} gastos={gastos} saveGastos={saveGastos}/>}
                  {tab==="equipos"   && <TabEquipo    equipo={equipos}   setEquipo={saveEquipos}    cargos={cargos} pais={currentUser?.pais||"CO"}/>}
                  {tab==="asistencia"&& <TabAsistencia equipo={equipos} asistencia={asistencia} setAsistencia={saveAsistencia} pais={currentUser?.pais||"CO"}/>}
                  {tab==="partes"    && <TabPartes    partes={partes}    setPartes={savePartes}    equipo={equipos} cargos={cargos} currentUser={null} pais={currentUser?.pais||"CO"}/>}
                  {tab==="novedades" && <TabNovedades novedades={novedades} saveNovedades={saveNovedades}/>}
                  {tab==="docs"      && <TabDocumentos docs={docs}       saveDocs={saveDocs}        fichas={fichas} cargos={cargos}/>}
                </div>
              )
            }
          </div>
        </div>
      </div>
    </>
  );
}
