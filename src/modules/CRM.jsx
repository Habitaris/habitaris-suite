import React, { useState, useEffect, useCallback, useMemo } from "react";

/* ─── CLOUD STORE (Supabase multi-tenant) ──────────────────── */
import { store } from "../core/store.js";



import {
  LayoutDashboard, FileText, Plus, Settings, ChevronRight,
  TrendingUp, CheckCircle2, Edit2, Trash2,
  Download, ArrowLeft, Save, Search, X,
  Calculator, Layers, BarChart3, Copy,
  ClipboardList, Share2, MessageCircle, Mail, Link2,
  ExternalLink, ChevronDown, ChevronUp, Inbox, Send, User,
  ArrowRight, Check, Globe, DollarSign, HardHat, Calendar,
  Star, ClipboardCheck, Eye, Shield, Clock, AlertCircle,
  UserCheck, FileCheck, RotateCcw, XCircle, ExternalLink as LinkIcon
} from "lucide-react";
import API, { USUARIOS_INTERNOS, getAprobador, aprobaciones, portal, notificaciones } from "../api.js";
import { createPortal as createOfferPortal } from "./offerPortal.js";
import { encodeFormDef } from "./FormularioPublico.jsx";

/* ─── TIPOGRAFÍA (Manual de Marca: una sola sans-serif) ─────── */
const FontLink = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=DM Sans:wght@300;400;500;600;700&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { font-size: 14px; }
    body { font-family: 'DM Sans', sans-serif; background: #F5F4F1; color: #111; -webkit-font-smoothing: antialiased; }
    ::-webkit-scrollbar { width: 5px; height: 5px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #C8C5BE; border-radius: 2px; }
    input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
    input:focus, select:focus, textarea:focus { outline: none; }
    @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes spin { to { transform: rotate(360deg); } }
    .fade { animation: fadeUp .2s ease; }
    @media print {
      .no-print { display:none!important; visibility:hidden!important; height:0!important; overflow:hidden!important; margin:0!important; padding:0!important; }
      body { background:#fff!important; -webkit-print-color-adjust:exact; print-color-adjust:exact; margin:0; padding:0; font-size:10pt; line-height:1.55; color:#111; }
      * { box-shadow:none!important; animation:none!important; }
      @page { size:A4; margin:12mm 16mm 14mm 16mm; }
      main,[style*="marginLeft"]{ margin-left:0!important; max-width:100%!important; padding:0!important; }
      div[style*="position: fixed"],div[style*="position:fixed"]{ display:none!important; }
      div[style*="width: 200"],div[style*="width:200px"]{ display:none!important; width:0!important; }
      table { page-break-inside:auto; width:100%!important; border-collapse:collapse; font-size:9pt; }
      tr { page-break-inside:avoid; }
      h1,h2,h3 { page-break-after:avoid; }
      img { max-width:100%!important; }
      input,select { border:none!important; background:transparent!important; padding:1px 0!important; font-size:10pt!important; -webkit-appearance:none!important; color:#111!important; font-family:'DM Sans',sans-serif!important; }
      textarea { display:none!important; }
      .ptr { display:block!important; white-space:pre-wrap; font-size:10pt; line-height:1.55; color:#111; }
      button { display:none!important; }
      .print-only { display:block!important; }
      .print-flex { display:flex!important; }
      .print-page-break { page-break-before:always; }
      .print-section { page-break-inside:avoid; margin-bottom:10pt!important; }
      .p-cover { display:flex!important; flex-direction:column; justify-content:center; align-items:center; min-height:92vh; page-break-after:always; text-align:center; }
      .p-hdr { display:flex!important; justify-content:space-between; align-items:center; border-bottom:1.5pt solid #111; padding-bottom:6pt; margin-bottom:12pt; }
    }
    @media (max-width:1200px) {
      [style*="gridTemplateColumns: 1fr 1fr 1fr"]{ grid-template-columns:1fr 1fr!important; }
    }
    @media (max-width:900px) {
      [style*="gridTemplateColumns: 1fr 1fr 1fr"],[style*="gridTemplateColumns: 1fr 1fr"]{ grid-template-columns:1fr!important; }
    }
    .print-only,.print-flex,.p-cover,.p-hdr,.ptr { display:none; }
  `}</style>
);

/* ─── PALETA (Manual: B&W puro) ─────────────────────────────── */
const C = {
  bg:         "#F5F4F1",
  surface:    "#FFFFFF",
  sidebar:    "#111111",
  sidebarHov: "#1C1C1C",
  sidebarAct: "#242424",
  ink:        "#111111",
  inkMid:     "#555555",
  inkLight:   "#999999",
  inkXLight:  "#BBBBBB",
  border:     "#E0E0E0",
  borderMid:  "#CCCAC4",
  accentBg:   "#EDEBE7",
  success:    "#2B7A52",
  successBg:  "#E6F4EC",
  warning:    "#8A6020",
  warningBg:  "#FAF2E2",
  error:      "#B91C1C",
  errorBg:    "#FAE8E8",
  info:       "#2A5F8C",
  infoBg:     "#E8F1FA",
  shadow:     "0 1px 2px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)",
  shadowMd:   "0 4px 20px rgba(0,0,0,0.10)",
  accent:     "#111111",
  danger:     "#B91C1C",
};

/* ─── LOGO SVG (fiel al manual: H en cuadrado doble) ────────── */
const LogoMark = ({ size = 34, color = "#fff" }) => (
  <svg width={size} height={size} viewBox="0 0 34 34" fill="none">
    <rect x="4.5" y="2.5" width="25" height="25" stroke={color} strokeWidth="0.7" opacity="0.4"/>
    <rect x="2.5" y="4.5" width="25" height="25" stroke={color} strokeWidth="1.1"/>
    <rect x="7.5"  y="10" width="4"   height="13" fill={color}/>
    <rect x="7.5"  y="15.5" width="13" height="3" fill={color}/>
    <rect x="16.5" y="10" width="4"   height="13" fill={color}/>
  </svg>
);

/* ─── ENTREGABLES (tu Excel) ─────────────────────────────────── */
const SUBTIPO = [
  "Proyecto Arquitectónico Completo",
  "Proyecto Interiorismo",
  "Proyecto Interiorismo Espacio",
];
const ENTREGABLES = [
  { nombre: "Planta arquitectónica levantamiento",            arq: 5,  int: 3,  esp: 2 },
  { nombre: "Planta arquitectónica propuesta",                arq: 8,  int: 5,  esp: 2 },
  { nombre: "Cortes longitudinal y transversal",              arq: 3,  int: 2,  esp: 1 },
  { nombre: "Fachadas",                                       arq: 3,  int: 0,  esp: 0 },
  { nombre: "Planta arquitectónica demoliciones",             arq: 2,  int: 2,  esp: 1 },
  { nombre: "Planta arquitectónica constructiva / cotas",     arq: 2,  int: 2,  esp: 1 },
  { nombre: "Planta arquitectónica cielo rasos",              arq: 2,  int: 2,  esp: 1 },
  { nombre: "Planta arquitectónica pisos y enchapes",         arq: 2,  int: 2,  esp: 1 },
  { nombre: "Planta de iluminación y puntos eléctricos",      arq: 4,  int: 3,  esp: 1 },
  { nombre: "Tabla de iluminación",                           arq: 5,  int: 3,  esp: 2 },
  { nombre: "Planos de carpinterías, detalles y despieces",   arq: 8,  int: 6,  esp: 3 },
  { nombre: "Detalles constructivos",                         arq: 8,  int: 6,  esp: 2 },
  { nombre: "Plano de puertas y ventanas",                    arq: 8,  int: 4,  esp: 2 },
  { nombre: "Plano de amueblamiento",                         arq: 4,  int: 4,  esp: 2 },
  { nombre: "Moodboard",                                      arq: 3,  int: 2,  esp: 1 },
  { nombre: "Tabla de acabados y especificaciones",           arq: 16, int: 8,  esp: 6 },
  { nombre: "Lista de compras / FF&E",                        arq: 8,  int: 8,  esp: 5 },
  { nombre: "Memoria de calidades",                           arq: 8,  int: 6,  esp: 3 },
  { nombre: "Modelado 3D",                                    arq: 24, int: 16, esp: 8 },
  { nombre: "Renderizado",                                    arq: 8,  int: 6,  esp: 3 },
];
const getH = (e, sub) => sub === SUBTIPO[0] ? e.arq : sub === SUBTIPO[1] ? e.int : e.esp;
const planosDefault = () => ENTREGABLES.map(e => ({
  nombre: e.nombre, incluir: false, cant: 1,
  horasArq: e.arq, horasInt: e.int, horasEsp: e.esp,
}));

/* ─── CODIGOS DE ACTIVIDAD ───────────────────────────────────── */
const ACTIVIDADES = [
  { grupo: "DISEÑO",                    cod: "DAN", label: "Diseño arquitectónico – Obra nueva" },
  { grupo: "DISEÑO",                    cod: "DAR", label: "Diseño arquitectónico – Reforma parcial" },
  { grupo: "DISEÑO",                    cod: "DIN", label: "Diseño de interiores" },
  { grupo: "DISEÑO",                    cod: "DBI", label: "Biointeriorismo" },
  { grupo: "EJECUCIÓN",                 cod: "REF", label: "Reforma parcial" },
  { grupo: "EJECUCIÓN",                 cod: "RIN", label: "Reforma integral" },
  { grupo: "EJECUCIÓN",                 cod: "ONV", label: "Obra nueva (ejecución)" },
  { grupo: "DIRECCIÓN / CONTROL",       cod: "SUP", label: "Supervisión presencial" },
  { grupo: "DIRECCIÓN / CONTROL",       cod: "SUO", label: "Supervisión online" },
  { grupo: "SERVICIOS COMPLEMENTARIOS", cod: "ASC", label: "Asesoría de compras" },
];

const TIPOS_INMUEBLE = [
  { val: "apartamento",        label: "Apartamento",         ph1: "Nombre del edificio",  ph2: "Ej: Apto 403" },
  { val: "casa_conjunto",      label: "Casa en conjunto",    ph1: "Nombre del conjunto",  ph2: "Ej: Casa 12" },
  { val: "casa_independiente", label: "Casa independiente",  ph1: "Nombre del lugar",     ph2: "Ej: La Colina" },
  { val: "local",              label: "Local / Oficina",     ph1: "Nombre del edificio",  ph2: "Ej: Local 201" },
  { val: "otro",               label: "Otro",                ph1: "Lugar / Referencia",   ph2: "Referencia adicional" },
];

// Genera código de oferta: COD_AAMMDD_DC_R00
const genCodigo = (cod, dc = "01", rev = 0) => {
  const now = new Date();
  const AA = String(now.getFullYear()).slice(2);
  const MM = String(now.getMonth() + 1).padStart(2, "0");
  const DD = String(now.getDate()).padStart(2, "0");
  const R  = `R${String(rev).padStart(2, "0")}`;
  return `${cod}_${AA}${MM}${DD}_${String(dc).padStart(2, "0")}_${R}`;
};

// Genera nombre de proyecto según tipo de inmueble
const genNombreProyecto = (tipoInmueble, lugar, referencia) => {
  if (!lugar && !referencia) return "";
  const l = lugar?.trim() || "";
  const r = referencia?.trim() || "";
  if (!l && !r) return "";
  if (!r) return l;
  if (!l) return r;
  return `${l} · ${r}`;
};

/* ─── CONSTANTES ─────────────────────────────────────────────── */
const ESTADOS = ["Borrador", "Presentada", "En revisión", "Ganada", "Perdida", "Cancelada"];
const BADGE_CFG = {
  "Borrador":    { bg: "#EDEBE7", txt: "#777" },
  "Presentada":  { bg: C.infoBg,    txt: C.info },
  "En revisión": { bg: C.warningBg, txt: C.warning },
  "Ganada":      { bg: C.successBg, txt: C.success },
  "Perdida":     { bg: C.errorBg,   txt: C.error },
  "Cancelada":   { bg: "#EDE8F0",   txt: "#826B82" },
};
const TEMPLATE = {
  // Codificación automática
  actividadCod: "DIN", digitoControl: "01", revision: 0, codigoOferta: "",
  // Nombre automático
  tipoInmueble: "apartamento", lugarNombre: "", lugarReferencia: "",
  // General
  cliente: "", proyecto: "", ubicacion: "", estado: "Borrador", notas: "", relacionadaCon: null,
  emailCliente: "", telCliente: "", fechaInicio: "", fechaEntrega: "",
  firmaRepresentante: "David Parra Galera", elaboradoPor: "",
  tipoProyecto: "OBRA", subtipoDiseno: SUBTIPO[1],
  tarifaIVA: 0.19, margen: 0.25, uDecl: 0.10,
  uDeclMode: "auto",  // "auto" = usar margen, "manual" = usar uDecl independiente
  modoCalcObra: "margen", // "margen" o "aiu"
  aiuA: 0.08, aiuI: 0.03, aiuU: 0.07,
  tipoCliente: "PN", medioPago: "PSE", aplicar4x1000: "SI",
  pctRCE: 0.007, pctTRC: 0.007, pctAdm: 0.002, pctICA: 0.009,
  pctReteFuente: 0, pctReteICA: 0, pctReteIVA: 0,
  costosDirectos: [],
  apuSalarioAnual: 0, apuPrestaciones: 0.65,
  apuHDia: 8, apuDiasSem: 5, apuSemanas: 52, apuPctProductivas: 0.60,
  apuLicencias: 0, apuEquipos: 0, apuAccesorios: 0, apuIndirectos: 0,
  apuModoHora: "AUTO", apuCostoHoraManual: 0,
  planos: planosDefault(),
  // v5: país, borrador, márgenes
  pais: "CO", divisa: "COP",
  borradorLineas: [],
  pctU: 0.07,
  gg: 0.13,
  bi: 0.06,
  // Organigrama
  orgNodos: [],
  // Materiales y cotizaciones
  matProveedores: [], // [{id, nombre, contacto, tel, email, fecha}]
  matCotizaciones: {}, // { lineaId: { provId: {precio, notas, disponible, plazo} } }
  // Equipos de trabajo de la oferta
  ofertaEquipos: [], // [{id, nombre, cargos:[{id,catId,cantidad}], equiposCosto, licenciasCosto, rendimiento, notas}]
};

/* ─── MOTOR DE CÁLCULO ───────────────────────────────────────── */
function calc(o) {
  const {
    tarifaIVA, margen, tipoProyecto, subtipoDiseno,
    medioPago, aplicar4x1000, pctRCE, pctTRC, pctAdm, pctICA,
    pctReteFuente, pctReteICA, pctReteIVA, costosDirectos,
    apuSalarioAnual, apuPrestaciones, apuHDia, apuDiasSem, apuSemanas, apuPctProductivas,
    apuLicencias, apuEquipos, apuAccesorios, apuIndirectos,
    apuModoHora, apuCostoHoraManual, planos = [],
  } = o;

  const hAnio = apuHDia * apuDiasSem * apuSemanas * apuPctProductivas;
  const estr  = apuSalarioAnual * (1 + apuPrestaciones)
    + Number(apuLicencias) + Number(apuEquipos) + Number(apuAccesorios) + Number(apuIndirectos);
  const costoH = apuModoHora === "MANUAL" ? Number(apuCostoHoraManual) : (hAnio > 0 ? estr / hAnio : 0);

  const gH = p => subtipoDiseno === SUBTIPO[0] ? p.horasArq : subtipoDiseno === SUBTIPO[1] ? p.horasInt : p.horasEsp;
  const hDis = planos.filter(p => p.incluir).reduce((s, p) => s + Number(p.cant) * gH(p), 0);
  const costoDis = hDis * costoH;

  const cdM  = costosDirectos.filter(c => c.tipo === "M").reduce((s, c) => s + (parseFloat(c.valor) || 0), 0);
  const cdMO = costosDirectos.filter(c => c.tipo === "MO").reduce((s, c) => s + (parseFloat(c.valor) || 0), 0);
  const cdSB = costosDirectos.filter(c => c.tipo === "SUB").reduce((s, c) => s + (parseFloat(c.valor) || 0), 0);
  // Borrador de costes como fuente principal (tiene prioridad sobre costosDirectos)
  const borradorCD = (o.borradorLineas || [])
    .filter(l => !l.esCapitulo)
    .reduce((s, l) => s + (l.precioCD || 0), 0);
  const useBorrador = borradorCD > 0;
  const COSTO = useBorrador
    ? borradorCD
    : cdM + cdMO + cdSB + (tipoProyecto === "DISEÑO" ? costoDis : 0);

  const _ivaC = o.ivaComision ?? 0.19;
  let fFin = 0;
  if (medioPago === "PSE")          fFin = (o.pctComPSE   ?? 0.012) * (1 + _ivaC);
  else if (medioPago === "Tarjeta") fFin = (o.pctComTarjeta ?? 0.036) * (1 + _ivaC);
  else if (medioPago === "Transferencia") fFin = (o.pctComTransf ?? 0) * (1 + _ivaC);
  else if (medioPago === "Manual")  fFin = (o.pctComManual ?? 0);
  const f4k = aplicar4x1000 === "SI" ? 0.004 : 0;
  const f = fFin + f4k;  // GF total (sin margen)
  const g = pctRCE + pctTRC + pctAdm + pctICA;  // GC total (coste directo, lleva margen)

  // ─── MODO CÁLCULO ───
  // GC = coste directo → lleva margen (va en denominador con M)
  // GF = gasto financiero → NO lleva margen (se aplica después)
  // GG = gastos generales → lleva margen (va en denominador, proporcional al CD)
  // Margen: PVP = CD / ((1 - M - GC - GG) × (1 - GF))
  // AIU:    PVP = CD × (1 + A + I + U) / ((1 - GC) × (1 - GF))  (A ya incluye GG)
  const modoCalcObra = o.modoCalcObra || "margen";
  const ggPct = o.ggPct || 0; // % GG from TGG component (totalGG / costoDirecto)
  let PVP, den1, denGF, coefMult, U, margenEfectivo;

  if (tipoProyecto === "OBRA" && (o.pais||"CO") === "CO" && modoCalcObra === "aiu") {
    // AIU mode: PVP = CD × (1 + A + I + U) / ((1-GC) × (1-GF))
    // GG already included in aiuA (updated by TGG)
    const aiuA = o.aiuA ?? 0.08;
    const aiuI = o.aiuI ?? 0.03;
    const aiuU = o.aiuU ?? 0.07;
    const aiuTotal = aiuA + aiuI + aiuU;
    const baseAIU = COSTO * (1 + aiuTotal);
    den1 = 1 - g;       // GC en denominador
    denGF = 1 - f;      // GF en denominador separado
    const denTotal = den1 * denGF;
    PVP = denTotal > 0 ? baseAIU / denTotal : 0;
    coefMult = denTotal > 0 ? (1 + aiuTotal) / denTotal : 0;
    U = aiuU;
    margenEfectivo = aiuTotal;
  } else {
    // Margen mode: PVP = CD / ((1 - M - GC - GG) × (1 - GF))
    den1 = 1 - margen - g - ggPct;   // M + GC + GG en denominador (llevan margen)
    denGF = 1 - f;                    // GF separado (no lleva margen)
    const denTotal = den1 * denGF;
    PVP = denTotal > 0 ? COSTO / denTotal : 0;
    coefMult = denTotal > 0 ? 1 / denTotal : 0;
    // U para IVA en OBRA: editable o = margen
    U = tipoProyecto === "OBRA" ? (o.uDecl ?? margen) : margen;
    margenEfectivo = margen;
  }
  const den = den1 * denGF; // denominador total para display

  const IVA = tipoProyecto === "OBRA" ? U * PVP * tarifaIVA : PVP * tarifaIVA;
  const PVP_IVA = PVP + IVA;
  const ret = (pctReteFuente + pctReteICA + pctReteIVA) * PVP;
  const margenCOP = tipoProyecto === "OBRA" && modoCalcObra === "aiu"
    ? PVP - COSTO - g*PVP - f*PVP
    : margenEfectivo * PVP;
  return { COSTO, costoDis, cdM, cdMO, cdSB, f, g, ggPct, den, den1, denGF, coefMult, U, margenEfectivo,
    hAnio, estr, costoH, hDis, PVP, IVA, PVP_IVA,
    GC: g * PVP, GG: ggPct * PVP, ICA: pctICA * PVP, fin: f * PVP,
    margenCOP, ret, neto: PVP_IVA - ret };
}

/* ─── UTILS ──────────────────────────────────────────────────── */
const fmt = (n, d = 0) => {
  if (n === null || n === undefined || isNaN(n)) return "—";
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: d, minimumFractionDigits: d }).format(n);
};
const pct = n => `${(n * 100).toFixed(2)}%`;
const uid  = () => Math.random().toString(36).substr(2, 9);
const today = () => new Date().toISOString().split("T")[0];

/* ─── STORAGE ────────────────────────────────────────────────── */
async function loadData() { try { const r = store.getSync("hab:v4"); return r ? JSON.parse(r) : []; } catch { return []; } }
async function saveData(d) { try { store.set("hab:v4", JSON.stringify(d)); } catch(e) { console.error(e); } }

/* ─── BRIEFING STORAGE ───────────────────────────────────────── */
async function loadBriefings() {
  try {
    const items = store.listSync("hab:briefing:").items;
    return items
      .map(r => { try { return JSON.parse(r); } catch { return null; } })
      .filter(Boolean)
      .sort((a,b) => new Date(b.fecha||0) - new Date(a.fecha||0));
  } catch { return []; }
}
function saveBriefingEntry(data) {
  try { store.set("hab:briefing:" + data.id, JSON.stringify(data)); } catch {}
}
async function deleteBriefingEntry(id) {
  try { store.delete("hab:briefing:" + id); } catch {}
}

/* ─── BRIEFING → OFERTA (mapeador de campos) ─────────────────── */
function briefingToOffer(b) {
  return {
    cliente:        b.nombre        || "",
    email:          b.email         || "",
    telefono:       b.telefono      || "",
    ubicacion:      [b.ciudad, b.edificio].filter(Boolean).join(" · ") || "",
    proyecto:       [b.edificio, b.nombre?.split(" ").slice(-1)[0]].filter(Boolean).join(" · ") || "",
    estado:         "Prospecto",
    notas:          [
      b.estilo?.length      ? `Estilo: ${Array.isArray(b.estilo) ? b.estilo.join(", ") : b.estilo}` : "",
      b.espacios?.length    ? `Espacios: ${Array.isArray(b.espacios) ? b.espacios.join(", ") : b.espacios}` : "",
      b.colores_materiales  ? `Materiales: ${b.colores_materiales}` : "",
      b.que_esperas?.length ? `Expectativas: ${Array.isArray(b.que_esperas) ? b.que_esperas.join("; ") : b.que_esperas}` : "",
      b.links_ref           ? `Referencias: ${b.links_ref}` : "",
    ].filter(Boolean).join("\n"),
    razonSocial:    b.razon_social  || "",
    documento:      b.documento     || "",
    emailFactura:   b.email_factura || b.email || "",
    dirFacturacion: b.dir_facturacion || "",
    retencion:      b.retenciones === "Sí",
    detalleRet:     b.detalle_retenciones || "",
    anticipoAcept:  b.anticipo      || "",
    formaPago:      b.forma_pago    || "",
    briefingId:     b.id,
  };
}

/* ─── BRIEFING → CLIENTE (mapeador de campos) ─────────────────── */
function briefingToClient(b) {
  return {
    id:       Math.random().toString(36).slice(2,9),
    nombre:   b.razon_social || b.nombre || "",
    tipo:     b.razon_social ? "Empresa" : "Persona natural",
    nit:      b.documento || "",
    email:    b.email || "",
    telMovil: b.telefono || "",
    prefijoMovil: "+57",
    ciudad:   b.ciudad || "",
    pais:     "CO",
    notas:    [
      b.edificio          ? `Proyecto: ${b.edificio}` : "",
      b.tipo_proyecto     ? `Tipo: ${b.tipo_proyecto}` : "",
      b.area_m2           ? `Área: ${b.area_m2} m²` : "",
      b.presupuesto       ? `Presupuesto: $ ${Number(b.presupuesto).toLocaleString("es-CO")}` : "",
      b.como_conociste    ? `Canal: ${b.como_conociste}` : "",
    ].filter(Boolean).join(" | "),
    emailFactura:   b.email_factura || b.email || "",
    dirFacturacion: b.dir_facturacion || "",
    briefingId:     b.id,
    fechaAlta:      new Date().toISOString().split("T")[0],
  };
}

/* ─── LINK DEL FORMULARIO ────────────────────────────────────── */
const BRIEFING_LINK = "https://getformly.app/uixUnA";
const WA_MSG = (nombre) =>
  `Hola${nombre ? ` ${nombre}` : ""}! 👋 Para preparar tu propuesta personalizada de diseño, te invitamos a diligenciar nuestro *Briefing Inicial* de Habitaris.\n\n📋 Solo toma 5-7 minutos y nos ayuda a entender mejor tu proyecto:\n${BRIEFING_LINK}\n\nCualquier duda, con gusto te atendemos. ¡Gracias!`;
const EMAIL_SUBJ = "Briefing Inicial – Habitaris";
const EMAIL_BODY = (nombre) =>
  `Hola${nombre ? ` ${nombre}` : ""},\n\nPara preparar tu propuesta personalizada, te invitamos a diligenciar nuestro formulario de Briefing Inicial. Solo toma 5–7 minutos:\n\n${BRIEFING_LINK}\n\nTus respuestas nos ayudan a conocer tu proyecto y darte una cotización precisa. Si tienes alguna duda, escríbenos o llámanos.\n\n¡Muchas gracias!\n\nEquipo Habitaris\nhabitaris.arq | comercial.co | +57 350 5661545`;

/* ─── ATOMS ──────────────────────────────────────────────────── */
const Badge = ({ e }) => {
  const c = BADGE_CFG[e] || BADGE_CFG["Borrador"];
  return <span style={{ background: c.bg, color: c.txt, padding: "3px 10px", borderRadius: 2, fontSize: 10, fontWeight: 600, letterSpacing: 0.8, textTransform: "uppercase", display: "inline-block", whiteSpace: "nowrap", fontFamily: "'DM Sans', sans-serif" }}>{e}</span>;
};

const Card = ({ children, style, ...p }) => (
  <div style={{ background: C.surface, borderRadius: 3, boxShadow: C.shadow, border: `1px solid ${C.border}`, ...style }} {...p}>{children}</div>
);

const Btn = ({ children, v = "pri", on, icon: I, sm, style, dis, ...p }) => {
  const base = { display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 2, fontFamily: "'DM Sans', sans-serif", fontWeight: 500, cursor: dis ? "not-allowed" : "pointer", transition: "all .15s", border: "none", fontSize: sm ? 11 : 12, padding: sm ? "5px 11px" : "9px 16px", letterSpacing: 0.4, opacity: dis ? .5 : 1, ...style };
  const vars = {
    pri:    { background: C.ink,      color: "#fff" },
    sec:    { background: C.accentBg, color: C.ink },
    ghost:  { background: "transparent", color: C.inkMid },
    danger: { background: C.errorBg,  color: C.error },
    out:    { background: "transparent", color: C.ink, border: `1px solid ${C.borderMid}` },
  };
  return <button style={{ ...base, ...vars[v] }} onClick={on} disabled={dis} {...p}>{I && <I size={sm ? 12 : 13} />}{children}</button>;
};

const FI = ({ lbl, val, on, type = "text", ph, rt, note, step, min, style }) => {
  const [local, setLocal] = useState(String(val ?? ""));
  const [editing, setEditing] = useState(false);
  // Sync from parent when not editing
  useEffect(() => { if (!editing) setLocal(String(val ?? "")); }, [val, editing]);
  return (
    <div style={{ marginBottom: 14 }}>
      {lbl && <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: C.inkLight, marginBottom: 5, textTransform: "uppercase", letterSpacing: 1, fontFamily: "'DM Sans', sans-serif" }}>{lbl}</label>}
      <div style={{ position: "relative" }}>
        <input type={type} value={local} placeholder={ph} step={step} min={min}
          onChange={e => { setLocal(e.target.value); on(e); }}
          style={{ width: "100%", padding: "9px 12px", paddingRight: rt ? 38 : 12, border: `1px solid ${C.border}`, borderRadius: 2, fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: C.ink, background: C.bg, transition: "border .15s", ...style }}
          onFocus={e => { setEditing(true); e.target.style.borderColor = C.ink; e.target.select(); }}
          onBlur={e => { setEditing(false); e.target.style.borderColor = C.border; }} />
        {rt && <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: C.inkLight }}>{rt}</span>}
      </div>
      {note && <p style={{ fontSize: 10, color: C.inkLight, margin: "3px 0 0" }}>{note}</p>}
    </div>
  );
};

const FS = ({ lbl, val, on, opts, note }) => (
  <div style={{ marginBottom: 14 }}>
    {lbl && <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: C.inkLight, marginBottom: 5, textTransform: "uppercase", letterSpacing: 1 }}>{lbl}</label>}
    <select value={val} onChange={on} style={{ width: "100%", padding: "9px 12px", border: `1px solid ${C.border}`, borderRadius: 2, fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: C.ink, background: C.bg }}
      onFocus={e => e.target.style.borderColor = C.ink}
      onBlur={e => e.target.style.borderColor = C.border}>
      {opts.map(o => <option key={o.v ?? o} value={o.v ?? o}>{o.l ?? o}</option>)}
    </select>
    {note && <p style={{ fontSize: 10, color: C.inkLight, margin: "3px 0 0" }}>{note}</p>}
  </div>
);

const STitle = ({ t, s }) => (
  <div style={{ marginBottom: 18 }}>
    <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 600, color: C.ink, margin: 0, letterSpacing: 0.2, textTransform: "uppercase" }}>{t}</h3>
    {s && <p style={{ fontSize: 11, color: C.inkLight, margin: "3px 0 0", fontWeight: 400 }}>{s}</p>}
  </div>
);

const KPI = ({ lbl, val, icon: I, col, sub }) => (
  <Card style={{ padding: "18px 20px", flex: 1, minWidth: 150 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div>
        <p style={{ fontSize: 9, fontWeight: 600, color: C.inkLight, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: 1.5 }}>{lbl}</p>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 22, fontWeight: 700, color: col, margin: 0 }}>{val}</p>
        {sub && <p style={{ fontSize: 10, color: C.inkLight, margin: "4px 0 0" }}>{sub}</p>}
      </div>
      <div style={{ background: `${col}15`, borderRadius: 2, padding: 8 }}><I size={15} color={col} /></div>
    </div>
  </Card>
);

/* ─── FORMULARIOS ────────────────────────────────────────────── */
const BRIEFING_CAMPOS = [
  { key:"nombre",           lbl:"Nombre",              icon:"👤" },
  { key:"email",            lbl:"Email",               icon:"✉️" },
  { key:"telefono",         lbl:"Teléfono",            icon:"📱" },
  { key:"como_conociste",   lbl:"¿Cómo nos conoció?",  icon:"🔍" },
  { key:"ciudad",           lbl:"Ciudad",              icon:"📍" },
  { key:"edificio",         lbl:"Edificio / Conjunto",  icon:"🏢" },
  { key:"direccion_proyecto",lbl:"Dirección proyecto", icon:"🗺️" },
  { key:"tipo_proyecto",    lbl:"Tipo de proyecto",    icon:"🏗️" },
  { key:"area_m2",          lbl:"Área (m²)",           icon:"📐" },
  { key:"num_habitaciones", lbl:"Habitaciones / áreas",icon:"🛏️" },
  { key:"estilo",           lbl:"Estilo preferido",    icon:"🎨" },
  { key:"colores_materiales",lbl:"Colores y materiales",icon:"🪵" },
  { key:"espacios",         lbl:"Espacios a intervenir",icon:"🏠" },
  { key:"fecha_inicio",     lbl:"Fecha tentativa inicio",icon:"📅" },
  { key:"plazo",            lbl:"Plazo de finalización",icon:"⏱️" },
  { key:"presupuesto",      lbl:"Presupuesto (COP)",   icon:"💰" },
  { key:"financiacion",     lbl:"Financiación",        icon:"🏦" },
  { key:"lo_mas_importante",lbl:"Prioridad principal", icon:"⭐" },
  { key:"que_esperas",      lbl:"¿Qué espera lograr?", icon:"🎯" },
  { key:"contratistas",     lbl:"¿Recomendar contratistas?",icon:"🔨" },
  { key:"forma_pago",       lbl:"Forma de pago",       icon:"💳" },
  { key:"razon_social",     lbl:"Razón social",        icon:"🏛️" },
  { key:"documento",        lbl:"Documento",           icon:"📄" },
  { key:"email_factura",    lbl:"Email facturación",   icon:"🧾" },
  { key:"dir_facturacion",  lbl:"Dirección facturación",icon:"📮" },
  { key:"retenciones",      lbl:"Retenciones especiales",icon:"⚖️" },
  { key:"detalle_retenciones",lbl:"Detalle retenciones",icon:"📋" },
];

function BriefingDetalle({ b, onClose, onCreateOffer, onCreateClient }) {
  const fmtVal = (key, val) => {
    if (!val || val === "") return "—";
    if (Array.isArray(val)) return val.join(", ");
    if (key === "presupuesto") return `$ ${Number(val).toLocaleString("es-CO")} COP`;
    return String(val);
  };
  const filled = BRIEFING_CAMPOS.filter(c => b[c.key] && b[c.key] !== "");
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:C.surface, borderRadius:4, width:"100%", maxWidth:680, maxHeight:"85vh", overflow:"hidden", display:"flex", flexDirection:"column", boxShadow:C.shadowMd }}>
        {/* Header */}
        <div style={{ padding:"18px 22px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <h3 style={{ fontSize:16, fontWeight:700, margin:0 }}>{b.nombre || "Sin nombre"}</h3>
            <p style={{ fontSize:11, color:C.inkLight, margin:"3px 0 0", letterSpacing:.5 }}>
              Briefing recibido · {b.fecha || "—"} · {b.ciudad || "—"}
            </p>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            {onCreateClient && <button onClick={onCreateClient} style={{
              padding:"8px 16px", background:C.infoBg, color:C.info, border:`1px solid ${C.info}33`, borderRadius:3,
              fontFamily:"'DM Sans',sans-serif", fontSize:11, fontWeight:700, cursor:"pointer",
              letterSpacing:1, textTransform:"uppercase",
            }}>+ Crear cliente</button>}
            <button onClick={onCreateOffer} style={{
              padding:"8px 16px", background:C.ink, color:"#fff", border:"none", borderRadius:3,
              fontFamily:"'DM Sans',sans-serif", fontSize:11, fontWeight:700, cursor:"pointer",
              letterSpacing:1, textTransform:"uppercase",
            }}>+ Crear oferta</button>
            <button onClick={onClose} style={{ padding:"8px 12px", background:"transparent", border:`1px solid ${C.border}`, borderRadius:3, cursor:"pointer", color:C.inkMid }}>
              <X size={14} />
            </button>
          </div>
        </div>
        {/* Body */}
        <div style={{ overflowY:"auto", padding:"18px 22px" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            {filled.map(c => (
              <div key={c.key} style={{ padding:"10px 12px", background:C.bg, borderRadius:3, border:`1px solid ${C.border}` }}>
                <p style={{ fontSize:9, letterSpacing:1.5, textTransform:"uppercase", color:C.inkLight, margin:"0 0 4px" }}>{c.icon} {c.lbl}</p>
                <p style={{ fontSize:13, fontWeight:500, color:C.ink, margin:0, lineHeight:1.4 }}>{fmtVal(c.key, b[c.key])}</p>
              </div>
            ))}
          </div>
          {b.links_ref && (
            <div style={{ marginTop:10, padding:"10px 12px", background:C.infoBg, borderRadius:3, border:`1px solid ${C.info}22` }}>
              <p style={{ fontSize:9, letterSpacing:1.5, textTransform:"uppercase", color:C.info, margin:"0 0 4px" }}>🔗 Links de referencia</p>
              <p style={{ fontSize:12, color:C.ink, margin:0, wordBreak:"break-all" }}>{b.links_ref}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── FORM STORAGE ────────────────────────────────────────────── */
async function loadForms() {
  try {
    const items = store.listSync("hab:forms:").items;
    return items
      .map(r => { try { return JSON.parse(r); } catch { return null; } })
      .filter(Boolean)
      .sort((a,b) => (b.updatedAt||"").localeCompare(a.updatedAt||""));
  } catch { return []; }
}
function saveForm(f) {
  try { f.updatedAt = new Date().toISOString(); store.set(`hab:forms:${f.id}`, JSON.stringify(f)); } catch {}
}
async function deleteForm(id) {
  try { store.delete(`hab:forms:${id}`); } catch {}
}

/* ─── TEMPLATES ───────────────────────────────────────────────── */
const uid3 = () => Math.random().toString(36).slice(2,8);

const FORM_TEMPLATES = [
  {
    nombre:"Briefing Diseño Interior",
    desc:"Formulario completo para proyectos de diseño",
    icon:"🎨",
    config:{ titulo:"Cuéntanos sobre tu proyecto", subtitulo:"Solo toma 5-7 minutos. Tus respuestas nos ayudan a preparar una propuesta personalizada.", mensajeExito:"¡Gracias! Nos pondremos en contacto pronto con tu propuesta.", telRespuesta:"573183818736" },
    campos:[
      { tipo:"seccion", label:"Datos personales", icon:"👤", desc:"Información de contacto" },
      { tipo:"text",    label:"Nombre completo",     required:true, mapKey:"nombre" },
      { tipo:"email",   label:"Correo electrónico",  required:true, mapKey:"email" },
      { tipo:"tel",     label:"WhatsApp / Celular",   required:true, mapKey:"telefono" },
      { tipo:"select",  label:"¿Cómo nos conociste?", mapKey:"como_conociste", opciones:["Instagram","Google","Referido","Página web","Evento","Otro"] },
      { tipo:"seccion", label:"Tu proyecto", icon:"🏠" },
      { tipo:"text",    label:"Ciudad",               required:true, mapKey:"ciudad" },
      { tipo:"text",    label:"Edificio / Conjunto",   mapKey:"edificio" },
      { tipo:"text",    label:"Dirección del proyecto", mapKey:"direccion_proyecto" },
      { tipo:"select",  label:"Tipo de proyecto",     required:true, mapKey:"tipo_proyecto", opciones:["Diseño interior","Remodelación","Obra nueva","Adecuación comercial","Otro"] },
      { tipo:"number",  label:"Área aproximada (m²)", mapKey:"area_m2" },
      { tipo:"text",    label:"Número de habitaciones o áreas", mapKey:"num_habitaciones" },
      { tipo:"seccion", label:"Estilo y preferencias", icon:"🎨" },
      { tipo:"chips",   label:"Estilos que te gustan", mapKey:"estilo", opciones:["Moderno","Contemporáneo","Minimalista","Industrial","Nórdico","Clásico","Rústico","Ecléctico","Japandi","Otro"] },
      { tipo:"chips",   label:"Espacios a intervenir", mapKey:"espacios", opciones:["Sala","Comedor","Cocina","Hab. principal","Hab. secundaria","Baño social","Baño privado","Estudio","Terraza/Balcón","Lavandería"] },
      { tipo:"textarea",label:"Colores y materiales que te gustan", mapKey:"colores_materiales", placeholder:"Ej: tonos cálidos, madera natural, mármol..." },
      { tipo:"textarea",label:"Links de referencia (Pinterest, Instagram...)", mapKey:"links_ref", placeholder:"Pega aquí los links de inspiración" },
      { tipo:"seccion", label:"Presupuesto y tiempos", icon:"💰" },
      { tipo:"rango",   label:"Presupuesto aproximado", mapKey:"presupuesto", opciones:["Menos de $20M","$20M - $50M","$50M - $100M","$100M - $200M","Más de $200M","Aún no definido"] },
      { tipo:"select",  label:"Financiación", mapKey:"financiacion", opciones:["Recursos propios","Crédito hipotecario","Leasing","Otro"] },
      { tipo:"date",    label:"Fecha tentativa de inicio", mapKey:"fecha_inicio" },
      { tipo:"text",    label:"Plazo deseado de finalización", mapKey:"plazo", placeholder:"Ej: 3 meses" },
      { tipo:"seccion", label:"Expectativas", icon:"⭐" },
      { tipo:"textarea",label:"¿Qué es lo más importante para ti en este proyecto?", mapKey:"lo_mas_importante" },
      { tipo:"textarea",label:"¿Qué esperas lograr con el diseño?", mapKey:"que_esperas" },
      { tipo:"radio",   label:"¿Necesitas que recomendemos contratistas?", mapKey:"contratistas", opciones:["Sí","No","Tal vez"] },
      { tipo:"seccion", label:"Facturación (opcional)", icon:"🧾", desc:"Solo si necesita factura" },
      { tipo:"text",    label:"Razón social", mapKey:"razon_social" },
      { tipo:"text",    label:"NIT / Cédula", mapKey:"documento" },
      { tipo:"email",   label:"Email de facturación", mapKey:"email_factura" },
      { tipo:"text",    label:"Dirección de facturación", mapKey:"dir_facturacion" },
      { tipo:"radio",   label:"¿Tiene retenciones especiales?", mapKey:"retenciones", opciones:["No","Sí"] },
      { tipo:"radio",   label:"Confirmo que la información es correcta", mapKey:"confirmacion", required:true, opciones:["Sí"] },
    ],
  },
  {
    nombre:"Briefing Obra / Remodelación",
    desc:"Enfocado en construcción y remodelación",
    icon:"🏗️",
    config:{ titulo:"Cuéntanos sobre tu obra", subtitulo:"Necesitamos algunos datos para preparar tu presupuesto.", mensajeExito:"¡Gracias! Te enviaremos el presupuesto pronto.", telRespuesta:"573183818736" },
    campos:[
      { tipo:"seccion", label:"Datos de contacto", icon:"👤" },
      { tipo:"text",    label:"Nombre completo",     required:true, mapKey:"nombre" },
      { tipo:"email",   label:"Correo electrónico",  required:true, mapKey:"email" },
      { tipo:"tel",     label:"WhatsApp / Celular",   required:true, mapKey:"telefono" },
      { tipo:"seccion", label:"La obra", icon:"🏗️" },
      { tipo:"text",    label:"Ciudad",               required:true, mapKey:"ciudad" },
      { tipo:"text",    label:"Dirección de la obra", mapKey:"direccion_proyecto" },
      { tipo:"select",  label:"Tipo de obra", required:true, mapKey:"tipo_proyecto", opciones:["Remodelación total","Remodelación parcial","Obra nueva","Ampliación","Adecuación","Otro"] },
      { tipo:"number",  label:"Área total (m²)",      mapKey:"area_m2" },
      { tipo:"chips",   label:"Áreas a intervenir",  mapKey:"espacios", opciones:["Estructura","Mampostería","Pisos","Cielos","Cocina","Baños","Instalaciones eléctricas","Instalaciones hidráulicas","Pintura","Carpintería","Fachada"] },
      { tipo:"textarea",label:"Descripción de lo que necesita", mapKey:"lo_mas_importante", placeholder:"Describe brevemente el alcance de la obra" },
      { tipo:"seccion", label:"Tiempos y presupuesto", icon:"📅" },
      { tipo:"rango",   label:"Presupuesto aproximado", mapKey:"presupuesto", opciones:["Menos de $30M","$30M - $80M","$80M - $150M","$150M - $300M","Más de $300M","Sin definir"] },
      { tipo:"date",    label:"Fecha deseada de inicio", mapKey:"fecha_inicio" },
      { tipo:"text",    label:"Plazo esperado", mapKey:"plazo" },
      { tipo:"radio",   label:"¿Ya tiene planos?", mapKey:"tiene_planos", opciones:["Sí","No","En proceso"] },
      { tipo:"radio",   label:"¿Ya tiene permisos/licencias?", mapKey:"tiene_licencias", opciones:["Sí","No","En trámite","No sé si aplica"] },
      { tipo:"seccion", label:"Facturación", icon:"🧾" },
      { tipo:"text",    label:"Razón social", mapKey:"razon_social" },
      { tipo:"text",    label:"NIT / Cédula", mapKey:"documento" },
      { tipo:"email",   label:"Email de facturación", mapKey:"email_factura" },
    ],
  },
  {
    nombre:"Encuesta de satisfacción",
    desc:"Post-proyecto para feedback del cliente",
    icon:"⭐",
    config:{ titulo:"¿Cómo fue tu experiencia?", subtitulo:"Tu opinión nos ayuda a mejorar.", mensajeExito:"¡Gracias por tu feedback! Lo valoramos mucho.", telRespuesta:"573183818736" },
    campos:[
      { tipo:"text",    label:"Nombre", required:true, mapKey:"nombre" },
      { tipo:"text",    label:"Proyecto", mapKey:"edificio" },
      { tipo:"radio",   label:"Satisfacción general", required:true, mapKey:"satisfaccion", opciones:["⭐ Excelente","✅ Buena","😐 Regular","👎 Mala"] },
      { tipo:"radio",   label:"Calidad del diseño", mapKey:"calidad_diseno", opciones:["⭐ Excelente","✅ Buena","😐 Regular","👎 Mala"] },
      { tipo:"radio",   label:"Comunicación del equipo", mapKey:"comunicacion", opciones:["⭐ Excelente","✅ Buena","😐 Regular","👎 Mala"] },
      { tipo:"radio",   label:"Cumplimiento de plazos", mapKey:"cumplimiento", opciones:["⭐ Excelente","✅ Bueno","😐 Regular","👎 Malo"] },
      { tipo:"radio",   label:"¿Nos recomendaría?", required:true, mapKey:"recomendaria", opciones:["Definitivamente sí","Probablemente sí","No estoy seguro","Probablemente no"] },
      { tipo:"textarea",label:"¿Qué fue lo mejor del proyecto?", mapKey:"lo_mejor" },
      { tipo:"textarea",label:"¿Qué podríamos mejorar?", mapKey:"mejorar" },
      { tipo:"textarea",label:"Comentarios adicionales", mapKey:"comentarios" },
    ],
  },
];

const FIELD_TYPES = [
  { tipo:"text",     label:"Texto corto",  icon:"Aa" },
  { tipo:"email",    label:"Email",         icon:"@" },
  { tipo:"tel",      label:"Teléfono",      icon:"📱" },
  { tipo:"number",   label:"Número",        icon:"#" },
  { tipo:"date",     label:"Fecha",         icon:"📅" },
  { tipo:"textarea", label:"Texto largo",   icon:"¶" },
  { tipo:"select",   label:"Desplegable",   icon:"▼" },
  { tipo:"radio",    label:"Opción única",  icon:"◉" },
  { tipo:"chips",    label:"Selección múlt.",icon:"☑" },
  { tipo:"rango",    label:"Rango",         icon:"↔" },
  { tipo:"seccion",  label:"Separador",     icon:"—" },
];

function FormBuilder() {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);      // form being edited
  const [preview, setPreview] = useState(false);
  const [sharing, setSharing] = useState(null);       // form being shared
  const [shareTel, setShareTel] = useState("");
  const [shareEmail, setShareEmail] = useState("");
  const [shareNombre, setShareNombre] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => { loadForms().then(fs => { setForms(fs); setLoading(false); }); }, []);

  const refresh = () => { setLoading(true); loadForms().then(fs => { setForms(fs); setLoading(false); }); };

  /* Create from template */
  const fromTemplate = (tpl) => {
    const f = {
      id: uid3() + Date.now().toString(36),
      nombre: tpl.nombre,
      config: { ...tpl.config },
      campos: tpl.campos.map(c => ({ ...c, id: c.id || uid3() })),
      createdAt: new Date().toISOString(),
    };
    setEditing(f);
  };

  /* Create blank */
  const createBlank = () => {
    setEditing({
      id: uid3() + Date.now().toString(36),
      nombre: "Nuevo formulario",
      config: { titulo:"", subtitulo:"", mensajeExito:"¡Gracias por tu respuesta!", telRespuesta:"573183818736" },
      campos: [],
      createdAt: new Date().toISOString(),
    });
  };

  /* Save current */
  const doSave = async () => {
    if (!editing) return;
    await saveForm(editing);
    setForms(prev => {
      const exists = prev.find(f => f.id === editing.id);
      return exists ? prev.map(f => f.id===editing.id ? editing : f) : [editing, ...prev];
    });
    setEditing(null);
  };

  /* Delete */
  const doDelete = async (id) => {
    if (!window.confirm("¿Eliminar este formulario?")) return;
    await deleteForm(id);
    setForms(f => f.filter(x => x.id !== id));
  };

  /* Generate URL */
  const getFormUrl = (f) => {
    const hash = encodeFormDef(f);
    return `${window.location.origin}/form#${hash}`;
  };

  const copyUrl = (f) => {
    try {
      const url = getFormUrl(f);
      navigator.clipboard?.writeText(url);
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const shareWA = (f) => {
    const url = getFormUrl(f);
    const msg = `Hola${shareNombre?` ${shareNombre}`:""}! 👋 Te invitamos a completar este formulario:\n\n📋 ${f.config?.titulo || f.nombre}\n${url}\n\n¡Gracias!`;
    const num = shareTel.replace(/\D/g,"");
    window.open(num ? `https://wa.me/57${num}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const shareEmailFn = (f) => {
    const url = getFormUrl(f);
    const subj = encodeURIComponent(f.config?.titulo || f.nombre);
    const body = encodeURIComponent(`Hola${shareNombre?` ${shareNombre}`:""},\n\nTe invitamos a completar este formulario:\n\n${f.config?.titulo || f.nombre}\n${url}\n\n¡Gracias!\nEquipo Habitaris`);
    window.open(`mailto:${shareEmail}?subject=${subj}&body=${body}`, "_blank");
  };

  const fieldS = { width:"100%", padding:"7px 10px", border:`1px solid ${C.border}`, borderRadius:4,
    fontFamily:"'DM Sans',sans-serif", fontSize:12, background:C.surface, color:C.ink, boxSizing:"border-box" };
  const lblS = { fontSize:9, fontWeight:600, color:C.inkLight, display:"block", marginBottom:4,
    textTransform:"uppercase", letterSpacing:1 };

  /* ═══ EDITING MODE ═══ */
  if (editing) {
    const e = editing;
    const setE = (upd) => setEditing(prev => ({ ...prev, ...upd }));
    const setCampo = (idx, upd) => setEditing(prev => ({
      ...prev,
      campos: prev.campos.map((c,i) => i===idx ? { ...c, ...upd } : c),
    }));
    const removeCampo = (idx) => setEditing(prev => ({
      ...prev, campos: prev.campos.filter((_,i) => i!==idx),
    }));
    const moveCampo = (idx, dir) => setEditing(prev => {
      const arr = [...prev.campos];
      const ni = idx + dir;
      if (ni < 0 || ni >= arr.length) return prev;
      [arr[idx], arr[ni]] = [arr[ni], arr[idx]];
      return { ...prev, campos: arr };
    });
    const addCampo = (tipo) => {
      const base = { id:uid3(), tipo, label: FIELD_TYPES.find(t=>t.tipo===tipo)?.label || tipo, required:false, mapKey:"" };
      if (["select","radio","chips","rango"].includes(tipo)) base.opciones = ["Opción 1","Opción 2"];
      if (tipo === "seccion") { base.icon = "📋"; base.desc = ""; }
      setEditing(prev => ({ ...prev, campos: [...prev.campos, base] }));
    };

    return (
      <div className="fade">
        {/* Toolbar */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <button onClick={() => { if(window.confirm("¿Descartar cambios?")) setEditing(null); }}
              style={{ background:"none", border:"none", cursor:"pointer", color:C.inkMid, padding:4 }}><ArrowLeft size={18}/></button>
            <div>
              <input value={e.nombre} onChange={ev=>setE({nombre:ev.target.value})}
                style={{ border:"none", fontSize:18, fontWeight:700, fontFamily:"'DM Sans',sans-serif", background:"transparent", width:320 }}
                placeholder="Nombre del formulario"/>
              <p style={{ fontSize:10, color:C.inkLight, margin:0 }}>{e.campos.length} campos</p>
            </div>
          </div>
          <div style={{ display:"flex", gap:6 }}>
            <Btn v="out" on={() => setPreview(!preview)}>{preview ? "✏️ Editar" : "👁 Preview"}</Btn>
            <Btn icon={Check} on={doSave}>Guardar formulario</Btn>
          </div>
        </div>

        {/* Config */}
        {!preview && (
          <Card style={{ padding:16, marginBottom:16, borderLeft:`3px solid ${C.info}` }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <div><label style={lblS}>Título visible al cliente</label>
                <input value={e.config?.titulo||""} onChange={ev=>setE({config:{...e.config,titulo:ev.target.value}})} style={fieldS} placeholder="Cuéntanos sobre tu proyecto"/></div>
              <div><label style={lblS}>Subtítulo</label>
                <input value={e.config?.subtitulo||""} onChange={ev=>setE({config:{...e.config,subtitulo:ev.target.value}})} style={fieldS} placeholder="Solo toma 5 minutos"/></div>
              <div><label style={lblS}>Mensaje al enviar</label>
                <input value={e.config?.mensajeExito||""} onChange={ev=>setE({config:{...e.config,mensajeExito:ev.target.value}})} style={fieldS}/></div>
              <div><label style={lblS}>WhatsApp de respuestas</label>
                <input value={e.config?.telRespuesta||""} onChange={ev=>setE({config:{...e.config,telRespuesta:ev.target.value}})} style={fieldS} placeholder="573183818736"/></div>
            </div>
          </Card>
        )}

        {/* PREVIEW MODE */}
        {preview ? (
          <Card style={{ padding:24, maxWidth:640, margin:"0 auto" }}>
            <div style={{ textAlign:"center", marginBottom:20 }}>
              <h2 style={{ fontSize:18, fontWeight:700, margin:"0 0 4px" }}>{e.config?.titulo || e.nombre}</h2>
              {e.config?.subtitulo && <p style={{ fontSize:12, color:C.inkMid }}>{e.config.subtitulo}</p>}
            </div>
            {e.campos.map((c,i) => {
              if (c.tipo === "seccion") return (
                <div key={i} style={{ marginTop:20, marginBottom:8, paddingTop:12, borderTop:`2px solid ${C.ink}` }}>
                  <h3 style={{ fontSize:13, fontWeight:700 }}>{c.icon||""} {c.label}</h3>
                  {c.desc && <p style={{ fontSize:11, color:C.inkMid }}>{c.desc}</p>}
                </div>
              );
              return (
                <div key={i} style={{ marginBottom:12 }}>
                  <label style={{ fontSize:11, fontWeight:600, display:"block", marginBottom:4 }}>{c.label}{c.required && <span style={{ color:"#B91C1C" }}> *</span>}</label>
                  {["text","email","tel","number","date"].includes(c.tipo) && <input disabled style={{ ...fieldS, opacity:.6 }} placeholder={c.placeholder||""} type={c.tipo}/>}
                  {c.tipo==="textarea" && <textarea disabled rows={2} style={{ ...fieldS, opacity:.6, resize:"none" }} placeholder={c.placeholder||""}/>}
                  {(c.tipo==="select"||c.tipo==="rango") && <select disabled style={{ ...fieldS, opacity:.6 }}><option>{(c.opciones||[])[0]||"..."}</option></select>}
                  {c.tipo==="radio" && <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:2 }}>{(c.opciones||[]).map(o=><label key={o} style={{ fontSize:11, display:"flex", gap:4, alignItems:"center" }}><input type="radio" disabled/>{o}</label>)}</div>}
                  {c.tipo==="chips" && <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginTop:2 }}>{(c.opciones||[]).map(o=><span key={o} style={{ padding:"3px 10px", fontSize:10, border:`1px solid ${C.border}`, borderRadius:20 }}>{o}</span>)}</div>}
                </div>
              );
            })}
          </Card>
        ) : (
          /* EDIT MODE — field cards */
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {e.campos.map((c, idx) => (
              <Card key={c.id || idx} style={{ padding:"10px 14px", borderLeft: c.tipo==="seccion" ? `3px solid ${C.ink}` : `3px solid ${C.border}` }}>
                <div style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
                  {/* Reorder + type badge */}
                  <div style={{ display:"flex", flexDirection:"column", gap:2, alignItems:"center", paddingTop:2 }}>
                    <button onClick={()=>moveCampo(idx,-1)} disabled={idx===0}
                      style={{ background:"none", border:"none", cursor:idx>0?"pointer":"default", opacity:idx>0?1:.3, fontSize:10, padding:0 }}>▲</button>
                    <span style={{ fontSize:8, color:C.inkLight, background:C.bg, borderRadius:2, padding:"1px 5px", letterSpacing:.5, textTransform:"uppercase" }}>
                      {FIELD_TYPES.find(t=>t.tipo===c.tipo)?.icon || "?"}</span>
                    <button onClick={()=>moveCampo(idx,1)} disabled={idx===e.campos.length-1}
                      style={{ background:"none", border:"none", cursor:idx<e.campos.length-1?"pointer":"default", opacity:idx<e.campos.length-1?1:.3, fontSize:10, padding:0 }}>▼</button>
                  </div>

                  {/* Field config */}
                  <div style={{ flex:1, display:"grid", gridTemplateColumns: c.tipo==="seccion" ? "1fr auto" : "2fr 1fr 1fr auto", gap:6, alignItems:"center" }}>
                    <input value={c.label} onChange={ev=>setCampo(idx,{label:ev.target.value})}
                      style={{ ...fieldS, fontWeight: c.tipo==="seccion" ? 700 : 400, fontSize: c.tipo==="seccion" ? 13 : 12 }}
                      placeholder="Etiqueta"/>
                    {c.tipo !== "seccion" && (
                      <>
                        <input value={c.mapKey||""} onChange={ev=>setCampo(idx,{mapKey:ev.target.value})}
                          style={{ ...fieldS, fontSize:10, fontFamily:"'DM Mono',monospace" }}
                          placeholder="clave" title="Clave para mapeo a briefing"/>
                        <label style={{ display:"flex", alignItems:"center", gap:4, fontSize:10, color:C.inkMid, cursor:"pointer" }}>
                          <input type="checkbox" checked={!!c.required} onChange={ev=>setCampo(idx,{required:ev.target.checked})}/>
                          Obligatorio
                        </label>
                      </>
                    )}
                    <button onClick={()=>removeCampo(idx)}
                      style={{ background:"none", border:"none", cursor:"pointer", color:C.error, padding:2 }}>
                      <Trash2 size={12}/>
                    </button>
                  </div>
                </div>

                {/* Options editor for select/radio/chips/rango */}
                {["select","radio","chips","rango"].includes(c.tipo) && (
                  <div style={{ marginTop:6, marginLeft:28 }}>
                    <label style={{ ...lblS, marginBottom:3 }}>Opciones (una por línea)</label>
                    <textarea value={(c.opciones||[]).join("\n")}
                      onChange={ev=>setCampo(idx,{opciones:ev.target.value.split("\n")})}
                      rows={Math.min((c.opciones||[]).length + 1, 6)}
                      style={{ ...fieldS, fontSize:11, resize:"vertical" }}/>
                  </div>
                )}

                {/* Placeholder for text fields */}
                {["text","email","tel","number","textarea"].includes(c.tipo) && (
                  <div style={{ marginTop:4, marginLeft:28 }}>
                    <input value={c.placeholder||""} onChange={ev=>setCampo(idx,{placeholder:ev.target.value})}
                      style={{ ...fieldS, fontSize:10, color:C.inkLight }} placeholder="Placeholder (opcional)"/>
                  </div>
                )}

                {/* Section desc */}
                {c.tipo === "seccion" && (
                  <div style={{ marginTop:4, marginLeft:28, display:"flex", gap:6 }}>
                    <input value={c.icon||""} onChange={ev=>setCampo(idx,{icon:ev.target.value})}
                      style={{ ...fieldS, width:40, textAlign:"center" }} placeholder="🏠"/>
                    <input value={c.desc||""} onChange={ev=>setCampo(idx,{desc:ev.target.value})}
                      style={{ ...fieldS, flex:1, fontSize:10 }} placeholder="Descripción de la sección"/>
                  </div>
                )}
              </Card>
            ))}

            {/* Add field buttons */}
            <Card style={{ padding:"12px 16px", background:C.bg, borderStyle:"dashed" }}>
              <p style={{ fontSize:9, letterSpacing:1.5, textTransform:"uppercase", color:C.inkLight, margin:"0 0 8px" }}>
                Agregar campo
              </p>
              <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                {FIELD_TYPES.map(ft => (
                  <button key={ft.tipo} onClick={()=>addCampo(ft.tipo)}
                    style={{ padding:"5px 10px", fontSize:10, fontFamily:"'DM Sans',sans-serif",
                      border:`1px solid ${C.border}`, borderRadius:4, background:C.surface,
                      cursor:"pointer", color:C.ink, display:"flex", alignItems:"center", gap:4 }}>
                    <span style={{ fontSize:11 }}>{ft.icon}</span> {ft.label}
                  </button>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    );
  }

  /* ═══ SHARING MODAL ═══ */
  const sharingModal = sharing && (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", zIndex:500, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}
      onClick={ev => ev.target===ev.currentTarget && setSharing(null)}>
      <div style={{ background:"#fff", borderRadius:10, maxWidth:520, width:"100%", padding:24, boxShadow:"0 20px 60px rgba(0,0,0,.2)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <h3 style={{ fontSize:15, fontWeight:700, margin:0 }}>📤 Compartir: {sharing.nombre}</h3>
          <button onClick={()=>setSharing(null)} style={{ background:"none", border:"none", cursor:"pointer", color:C.inkMid }}><X size={18}/></button>
        </div>

        {/* Link */}
        <div style={{ marginBottom:14 }}>
          <label style={lblS}>Link del formulario</label>
          <div style={{ display:"flex", gap:6 }}>
            <div style={{ flex:1, padding:"8px 10px", background:C.bg, border:`1px solid ${C.border}`, borderRadius:4, fontSize:10, color:C.inkMid, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", fontFamily:"'DM Mono',monospace" }}>
              {getFormUrl(sharing)}
            </div>
            <button onClick={() => copyUrl(sharing)}
              style={{ padding:"8px 14px", border:`1px solid ${C.border}`, borderRadius:4, fontSize:11, fontWeight:600,
                background: copied ? C.successBg : C.surface, color: copied ? C.success : C.inkMid,
                cursor:"pointer", fontFamily:"'DM Sans',sans-serif", whiteSpace:"nowrap" }}>
              {copied ? "✅ Copiado" : "📋 Copiar"}
            </button>
          </div>
        </div>

        {/* Preview link */}
        <div style={{ marginBottom:16, textAlign:"center" }}>
          <a href={getFormUrl(sharing)} target="_blank" rel="noreferrer"
            style={{ fontSize:11, color:C.info }}>
            👁 Ver preview en nueva pestaña
          </a>
        </div>

        {/* Contact fields */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:14 }}>
          <div><label style={lblS}>Nombre (opc.)</label>
            <input value={shareNombre} onChange={e=>setShareNombre(e.target.value)} style={fieldS} placeholder="Juan"/></div>
          <div><label style={lblS}>WhatsApp</label>
            <input value={shareTel} onChange={e=>setShareTel(e.target.value)} style={fieldS} placeholder="300 123 4567"/></div>
          <div><label style={lblS}>Email</label>
            <input value={shareEmail} onChange={e=>setShareEmail(e.target.value)} style={fieldS} placeholder="juan@mail.com"/></div>
        </div>

        {/* Send buttons */}
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={() => shareWA(sharing)}
            style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:"12px",
              background:"#25D366", border:"none", borderRadius:6, cursor:"pointer", fontSize:13, fontWeight:700, color:"#fff",
              fontFamily:"'DM Sans',sans-serif" }}>
            <MessageCircle size={16}/> WhatsApp
          </button>
          <button onClick={() => shareEmailFn(sharing)} disabled={!shareEmail}
            style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:"12px",
              background: shareEmail ? C.ink : C.bg, border:"none", borderRadius:6,
              cursor: shareEmail ? "pointer" : "default", fontSize:13, fontWeight:600,
              color: shareEmail ? "#fff" : C.inkLight, fontFamily:"'DM Sans',sans-serif" }}>
            <Mail size={16}/> Email
          </button>
        </div>
      </div>
    </div>
  );

  /* ═══ LIST MODE ═══ */
  return (
    <div className="fade">
      {sharingModal}

      {/* Templates */}
      <div style={{ marginBottom:24 }}>
        <p style={{ fontSize:10, letterSpacing:1.5, textTransform:"uppercase", color:C.inkLight, margin:"0 0 10px" }}>
          Crear desde plantilla
        </p>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:10 }}>
          {FORM_TEMPLATES.map((tpl, i) => (
            <div key={i} onClick={() => fromTemplate(tpl)}
              style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:6, padding:16,
                cursor:"pointer", transition:"all .15s" }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=C.ink; e.currentTarget.style.boxShadow=C.shadowSm;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border; e.currentTarget.style.boxShadow="none";}}>
              <div style={{ fontSize:28, marginBottom:8 }}>{tpl.icon}</div>
              <div style={{ fontSize:13, fontWeight:700, marginBottom:2 }}>{tpl.nombre}</div>
              <div style={{ fontSize:11, color:C.inkLight }}>{tpl.desc}</div>
              <div style={{ fontSize:9, color:C.inkXLight, marginTop:6 }}>{tpl.campos.length} campos</div>
            </div>
          ))}
          <div onClick={createBlank}
            style={{ background:C.bg, border:`2px dashed ${C.border}`, borderRadius:6, padding:16,
              cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
              minHeight:120, transition:"all .15s" }}
            onMouseEnter={e=>e.currentTarget.style.borderColor=C.ink}
            onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
            <Plus size={24} style={{ color:C.inkLight, marginBottom:6 }}/>
            <div style={{ fontSize:12, fontWeight:600, color:C.inkMid }}>En blanco</div>
          </div>
        </div>
      </div>

      {/* Saved forms */}
      {loading ? (
        <div style={{ textAlign:"center", padding:40, color:C.inkLight }}>Cargando...</div>
      ) : forms.length > 0 && (
        <div>
          <p style={{ fontSize:10, letterSpacing:1.5, textTransform:"uppercase", color:C.inkLight, margin:"0 0 10px" }}>
            Mis formularios ({forms.length})
          </p>
          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            {forms.map(f => (
              <div key={f.id} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:4,
                padding:"12px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ fontWeight:600, fontSize:13 }}>{f.nombre}</div>
                  <div style={{ fontSize:10, color:C.inkLight, marginTop:2 }}>
                    {f.campos?.length||0} campos · {f.updatedAt ? new Date(f.updatedAt).toLocaleDateString("es-CO") : ""}
                  </div>
                </div>
                <div style={{ display:"flex", gap:6 }}>
                  <button onClick={() => setSharing(f)}
                    style={{ padding:"6px 12px", background:"#25D366", color:"#fff", border:"none", borderRadius:4,
                      fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                    📤 Compartir
                  </button>
                  <button onClick={() => setEditing({...f, campos: f.campos?.map(c=>({...c}))||[]})}
                    style={{ padding:"6px 12px", background:C.surface, border:`1px solid ${C.border}`, borderRadius:4,
                      fontSize:10, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                    ✏️ Editar
                  </button>
                  <button onClick={() => doDelete(f.id)}
                    style={{ padding:"6px 8px", background:"transparent", border:`1px solid ${C.border}`, borderRadius:4,
                      cursor:"pointer", color:C.error }}>
                    <Trash2 size={11}/>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EnviarBriefing() {
  // Legacy — kept as fallback but replaced by FormBuilder
  return <FormBuilder />;
}

function Formularios({ sv, onCreateOfferFromBriefing, onCreateClientFromBriefing }) {
  const [tab, setTab] = useState("enviar"); // enviar | recibidos | ingresar
  const [briefings, setBriefings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [showJson, setShowJson] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [manualForm, setManualForm] = useState(null);

  useEffect(() => {
    loadBriefings().then(bs => { setBriefings(bs); setLoading(false); });
  }, []);

  const refresh = () => { setLoading(true); loadBriefings().then(bs => { setBriefings(bs); setLoading(false); }); };

  const handleDel = async (id) => {
    if (!window.confirm("¿Eliminar este briefing?")) return;
    setDeleting(id);
    await deleteBriefingEntry(id);
    setBriefings(bs => bs.filter(b => b.id !== id));
    setDeleting(null);
  };

  /* ── Guardar briefing (manual o JSON) ── */
  const saveBriefing = async (data) => {
    const entry = { id: Math.random().toString(36).slice(2,9) + Date.now().toString(36), fecha: new Date().toISOString().split("T")[0], ...data };
    await saveBriefingEntry(entry);
    setBriefings(prev => [entry, ...prev]);
    return entry;
  };

  /* ── Import JSON ── */
  const importJson = async () => {
    try {
      let parsed = JSON.parse(jsonText);
      // Getformly puede enviar un array o un objeto
      if (Array.isArray(parsed)) {
        for (const item of parsed) await saveBriefing(item);
        alert(`✅ ${parsed.length} briefing(s) importados`);
      } else {
        await saveBriefing(parsed);
        alert("✅ Briefing importado");
      }
      setJsonText(""); setShowJson(false);
    } catch {
      alert("❌ JSON inválido. Copia el JSON exacto de Getformly.");
    }
  };

  /* ── Formulario manual vacío ── */
  const newManual = () => ({
    nombre:"", email:"", telefono:"", como_conociste:"", ciudad:"", edificio:"",
    direccion_proyecto:"", tipo_proyecto:"Diseño interior", area_m2:"", num_habitaciones:"",
    estilo:[], colores_materiales:"", espacios:[], fecha_inicio:"", plazo:"",
    presupuesto:"", financiacion:"", lo_mas_importante:"", que_esperas:[],
    contratistas:"", forma_pago:"", razon_social:"", documento:"",
    email_factura:"", dir_facturacion:"", retenciones:"No", detalle_retenciones:"",
    links_ref:"",
  });

  const TABS = [
    { id:"enviar",    lbl:"Mis formularios",   I:Layers },
    { id:"recibidos", lbl:`Recibidos (${briefings.length})`, I:Inbox },
    { id:"ingresar",  lbl:"Ingresar manual",     I:Edit2 },
  ];

  const fieldS = { width:"100%", padding:"7px 10px", border:`1px solid ${C.border}`, borderRadius:4,
    fontFamily:"'DM Sans',sans-serif", fontSize:12, background:C.surface, color:C.ink, boxSizing:"border-box" };
  const lblS = { fontSize:9, fontWeight:600, color:C.inkLight, display:"block", marginBottom:4,
    textTransform:"uppercase", letterSpacing:1 };

  return (
    <div className="fade">
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700, letterSpacing:-0.5, margin:"0 0 4px" }}>Formularios</h1>
          <p style={{ fontSize:12, color:C.inkLight, margin:0 }}>Envía el briefing, ingresa respuestas y crea clientes y ofertas</p>
        </div>
        <div style={{ display:"flex", gap:6 }}>
          <button onClick={() => setShowJson(true)} style={{ padding:"7px 14px", border:`1px solid ${C.border}`, borderRadius:3, background:C.surface, color:C.inkMid, fontFamily:"'DM Sans',sans-serif", fontSize:11, cursor:"pointer", display:"flex", alignItems:"center", gap:4 }}>
            📥 Importar JSON
          </button>
          <button onClick={refresh} style={{ padding:"7px 14px", border:`1px solid ${C.border}`, borderRadius:3, background:C.surface, color:C.inkMid, fontFamily:"'DM Sans',sans-serif", fontSize:11, cursor:"pointer" }}>
            ↻ Actualizar
          </button>
        </div>
      </div>

      {/* JSON Import Modal */}
      {showJson && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", zIndex:500, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}
          onClick={e => e.target===e.currentTarget && setShowJson(false)}>
          <div style={{ background:"#fff", borderRadius:10, maxWidth:560, width:"100%", padding:24, boxShadow:"0 20px 60px rgba(0,0,0,.2)" }}>
            <h3 style={{ fontSize:15, fontWeight:700, margin:"0 0 8px" }}>📥 Importar JSON de Getformly</h3>
            <p style={{ fontSize:11, color:C.inkMid, margin:"0 0 12px" }}>
              Pega el JSON de la respuesta del formulario. Acepta un objeto o un array de objetos.
            </p>
            <textarea value={jsonText} onChange={e=>setJsonText(e.target.value)}
              placeholder='{"nombre": "Juan Pérez", "email": "juan@mail.com", ...}'
              rows={10} style={{ ...fieldS, fontSize:11, fontFamily:"'DM Mono',monospace", resize:"vertical" }}/>
            <div style={{ display:"flex", gap:8, marginTop:12 }}>
              <button onClick={importJson}
                style={{ padding:"8px 18px", background:C.ink, color:"#fff", border:"none", borderRadius:4,
                  fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                Importar
              </button>
              <button onClick={() => { setShowJson(false); setJsonText(""); }}
                style={{ padding:"8px 18px", background:"transparent", color:C.inkMid, border:`1px solid ${C.border}`,
                  borderRadius:4, fontSize:12, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:"flex", gap:2, marginBottom:20, borderBottom:`1px solid ${C.border}`, paddingBottom:0 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            display:"flex", alignItems:"center", gap:7, padding:"10px 18px",
            border:"none", borderBottom: tab===t.id ? `2px solid ${C.ink}` : "2px solid transparent",
            background:"transparent", color: tab===t.id ? C.ink : C.inkLight,
            fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight: tab===t.id ? 700 : 400,
            cursor:"pointer", letterSpacing:.5, marginBottom:-1,
          }}>
            <t.I size={13} />{t.lbl}
          </button>
        ))}
      </div>

      {/* Tab: Enviar */}
      {tab === "enviar" && <EnviarBriefing />}

      {/* Tab: Ingresar manual */}
      {tab === "ingresar" && (() => {
        const f = manualForm || newManual();
        const mset = (k,v) => setManualForm(prev => ({ ...(prev||newManual()), [k]:v }));
        if (!manualForm) setManualForm(newManual());

        const ESTILOS = ["Moderno","Contemporáneo","Minimalista","Industrial","Nórdico","Clásico","Rústico","Ecléctico","Japandi","Otro"];
        const ESPACIOS = ["Sala","Comedor","Cocina","Habitación principal","Habitación secundaria","Baño social","Baño privado","Estudio","Terraza/Balcón","Zona de lavandería","Lobby/Hall"];

        const saveManual = async () => {
          if (!f.nombre) { alert("El nombre es obligatorio"); return; }
          const entry = await saveBriefing(f);
          setManualForm(newManual());
          setTab("recibidos");
          alert(`✅ Briefing de "${entry.nombre}" guardado`);
        };

        return (
          <div className="fade">
            <Card style={{ padding:22, borderLeft:`3px solid ${C.ink}` }}>
              <STitle t="Ingresar respuesta de briefing" s="Completa los campos según la información proporcionada por el cliente" />

              {/* Sección 1: Datos personales */}
              <div style={{ marginTop:16, marginBottom:20 }}>
                <h4 style={{ fontSize:10, fontWeight:700, letterSpacing:2, textTransform:"uppercase", color:C.info, margin:"0 0 10px", paddingBottom:6, borderBottom:`1px solid ${C.border}` }}>
                  👤 Datos del cliente
                </h4>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
                  <div><label style={lblS}>Nombre completo *</label><input value={f.nombre} onChange={e=>mset("nombre",e.target.value)} style={fieldS}/></div>
                  <div><label style={lblS}>Email</label><input type="email" value={f.email} onChange={e=>mset("email",e.target.value)} style={fieldS}/></div>
                  <div><label style={lblS}>Teléfono</label><input value={f.telefono} onChange={e=>mset("telefono",e.target.value)} placeholder="300 123 4567" style={fieldS}/></div>
                  <div><label style={lblS}>¿Cómo nos conoció?</label>
                    <select value={f.como_conociste} onChange={e=>mset("como_conociste",e.target.value)} style={fieldS}>
                      <option value="">—</option>
                      {["Instagram","Google","Referido","Página web","Evento","Otro"].map(o=><option key={o}>{o}</option>)}
                    </select>
                  </div>
                  <div><label style={lblS}>Ciudad</label><input value={f.ciudad} onChange={e=>mset("ciudad",e.target.value)} style={fieldS}/></div>
                  <div><label style={lblS}>Edificio / Conjunto</label><input value={f.edificio} onChange={e=>mset("edificio",e.target.value)} style={fieldS}/></div>
                </div>
              </div>

              {/* Sección 2: Proyecto */}
              <div style={{ marginBottom:20 }}>
                <h4 style={{ fontSize:10, fontWeight:700, letterSpacing:2, textTransform:"uppercase", color:C.info, margin:"0 0 10px", paddingBottom:6, borderBottom:`1px solid ${C.border}` }}>
                  🏗️ Datos del proyecto
                </h4>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
                  <div><label style={lblS}>Tipo de proyecto</label>
                    <select value={f.tipo_proyecto} onChange={e=>mset("tipo_proyecto",e.target.value)} style={fieldS}>
                      {["Diseño interior","Remodelación","Obra nueva","Adecuación comercial","Otro"].map(o=><option key={o}>{o}</option>)}
                    </select>
                  </div>
                  <div><label style={lblS}>Dirección del proyecto</label><input value={f.direccion_proyecto} onChange={e=>mset("direccion_proyecto",e.target.value)} style={fieldS}/></div>
                  <div><label style={lblS}>Área (m²)</label><input type="number" value={f.area_m2} onChange={e=>mset("area_m2",e.target.value)} style={fieldS}/></div>
                  <div><label style={lblS}>N° habitaciones / áreas</label><input value={f.num_habitaciones} onChange={e=>mset("num_habitaciones",e.target.value)} style={fieldS}/></div>
                  <div><label style={lblS}>Fecha tentativa inicio</label><input type="date" value={f.fecha_inicio} onChange={e=>mset("fecha_inicio",e.target.value)} style={fieldS}/></div>
                  <div><label style={lblS}>Plazo deseado</label><input value={f.plazo} onChange={e=>mset("plazo",e.target.value)} placeholder="Ej: 3 meses" style={fieldS}/></div>
                </div>
              </div>

              {/* Sección 3: Estilo y espacios */}
              <div style={{ marginBottom:20 }}>
                <h4 style={{ fontSize:10, fontWeight:700, letterSpacing:2, textTransform:"uppercase", color:C.info, margin:"0 0 10px", paddingBottom:6, borderBottom:`1px solid ${C.border}` }}>
                  🎨 Estilo y preferencias
                </h4>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  <div>
                    <label style={lblS}>Estilos preferidos (seleccionar varios)</label>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginTop:2 }}>
                      {ESTILOS.map(e => {
                        const sel = (f.estilo||[]).includes(e);
                        return <button key={e} onClick={() => mset("estilo", sel ? (f.estilo||[]).filter(x=>x!==e) : [...(f.estilo||[]),e])}
                          style={{ padding:"4px 10px", fontSize:10, fontWeight:sel?700:400, borderRadius:20,
                            border: sel ? `1px solid ${C.ink}` : `1px solid ${C.border}`,
                            background: sel ? C.ink : "#fff", color: sel ? "#fff" : C.inkMid,
                            cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>{e}</button>;
                      })}
                    </div>
                  </div>
                  <div>
                    <label style={lblS}>Espacios a intervenir</label>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginTop:2 }}>
                      {ESPACIOS.map(e => {
                        const sel = (f.espacios||[]).includes(e);
                        return <button key={e} onClick={() => mset("espacios", sel ? (f.espacios||[]).filter(x=>x!==e) : [...(f.espacios||[]),e])}
                          style={{ padding:"4px 10px", fontSize:10, fontWeight:sel?700:400, borderRadius:20,
                            border: sel ? `1px solid ${C.info}` : `1px solid ${C.border}`,
                            background: sel ? C.infoBg : "#fff", color: sel ? C.info : C.inkMid,
                            cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>{e}</button>;
                      })}
                    </div>
                  </div>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:10 }}>
                  <div><label style={lblS}>Colores y materiales preferidos</label>
                    <textarea value={f.colores_materiales} onChange={e=>mset("colores_materiales",e.target.value)} rows={2} style={{ ...fieldS, resize:"vertical" }}/></div>
                  <div><label style={lblS}>Links de referencia (Pinterest, etc.)</label>
                    <textarea value={f.links_ref} onChange={e=>mset("links_ref",e.target.value)} rows={2} style={{ ...fieldS, resize:"vertical" }}/></div>
                </div>
              </div>

              {/* Sección 4: Presupuesto */}
              <div style={{ marginBottom:20 }}>
                <h4 style={{ fontSize:10, fontWeight:700, letterSpacing:2, textTransform:"uppercase", color:C.info, margin:"0 0 10px", paddingBottom:6, borderBottom:`1px solid ${C.border}` }}>
                  💰 Presupuesto y expectativas
                </h4>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
                  <div><label style={lblS}>Presupuesto aproximado (COP)</label><input type="number" value={f.presupuesto} onChange={e=>mset("presupuesto",e.target.value)} style={fieldS}/></div>
                  <div><label style={lblS}>Financiación</label>
                    <select value={f.financiacion} onChange={e=>mset("financiacion",e.target.value)} style={fieldS}>
                      <option value="">—</option>
                      {["Recursos propios","Crédito hipotecario","Leasing","Otro"].map(o=><option key={o}>{o}</option>)}
                    </select>
                  </div>
                  <div><label style={lblS}>Forma de pago</label>
                    <select value={f.forma_pago} onChange={e=>mset("forma_pago",e.target.value)} style={fieldS}>
                      <option value="">—</option>
                      {["Transferencia","Tarjeta de crédito","Efectivo","Cheque","Otro"].map(o=><option key={o}>{o}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:10 }}>
                  <div><label style={lblS}>Lo más importante del proyecto</label>
                    <textarea value={f.lo_mas_importante} onChange={e=>mset("lo_mas_importante",e.target.value)} rows={2} style={{ ...fieldS, resize:"vertical" }} placeholder="¿Qué es lo que más le importa al cliente?"/></div>
                  <div><label style={lblS}>¿Qué espera lograr?</label>
                    <textarea value={Array.isArray(f.que_esperas)?f.que_esperas.join("\n"):f.que_esperas||""} onChange={e=>mset("que_esperas",e.target.value.split("\n"))} rows={2} style={{ ...fieldS, resize:"vertical" }} placeholder="Una línea por expectativa"/></div>
                </div>
              </div>

              {/* Sección 5: Facturación */}
              <div style={{ marginBottom:20 }}>
                <h4 style={{ fontSize:10, fontWeight:700, letterSpacing:2, textTransform:"uppercase", color:C.info, margin:"0 0 10px", paddingBottom:6, borderBottom:`1px solid ${C.border}` }}>
                  🧾 Datos de facturación (si aplica)
                </h4>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
                  <div><label style={lblS}>Razón social</label><input value={f.razon_social} onChange={e=>mset("razon_social",e.target.value)} style={fieldS}/></div>
                  <div><label style={lblS}>NIT / Cédula</label><input value={f.documento} onChange={e=>mset("documento",e.target.value)} style={fieldS}/></div>
                  <div><label style={lblS}>Email facturación</label><input value={f.email_factura} onChange={e=>mset("email_factura",e.target.value)} style={fieldS}/></div>
                  <div><label style={lblS}>Dirección facturación</label><input value={f.dir_facturacion} onChange={e=>mset("dir_facturacion",e.target.value)} style={fieldS}/></div>
                  <div><label style={lblS}>Retenciones especiales</label>
                    <select value={f.retenciones} onChange={e=>mset("retenciones",e.target.value)} style={fieldS}>
                      {["No","Sí"].map(o=><option key={o}>{o}</option>)}
                    </select>
                  </div>
                  {f.retenciones === "Sí" && (
                    <div><label style={lblS}>Detalle retenciones</label><input value={f.detalle_retenciones} onChange={e=>mset("detalle_retenciones",e.target.value)} style={fieldS}/></div>
                  )}
                </div>
              </div>

              {/* Botones */}
              <div style={{ display:"flex", gap:8, marginTop:16, paddingTop:16, borderTop:`1px solid ${C.border}` }}>
                <Btn icon={Check} on={saveManual}>Guardar briefing</Btn>
                <Btn v="out" on={async () => {
                  if (!f.nombre) { alert("El nombre es obligatorio"); return; }
                  const entry = await saveBriefing(f);
                  if (onCreateClientFromBriefing) onCreateClientFromBriefing(entry);
                  setManualForm(newManual()); setTab("recibidos");
                }}>💾 Guardar + Crear cliente</Btn>
                <Btn v="out" on={async () => {
                  if (!f.nombre) { alert("El nombre es obligatorio"); return; }
                  const entry = await saveBriefing(f);
                  onCreateOfferFromBriefing(entry, sv);
                  setManualForm(newManual());
                }}>💾 Guardar + Crear oferta</Btn>
                <Btn v="out" on={() => setManualForm(newManual())}>Limpiar</Btn>
              </div>
            </Card>
          </div>
        );
      })()}

      {/* Tab: Recibidos */}
      {tab === "recibidos" && (
        loading ? (
          <div style={{ textAlign:"center", padding:"60px 0", color:C.inkLight }}>Cargando briefings...</div>
        ) : briefings.length === 0 ? (
          <div style={{ textAlign:"center", padding:"80px 0" }}>
            <Inbox size={40} style={{ color:C.inkXLight, display:"block", margin:"0 auto 14px" }} />
            <p style={{ color:C.inkLight, fontSize:14 }}>No hay briefings recibidos aún</p>
            <p style={{ color:C.inkXLight, fontSize:12, marginTop:6 }}>Ingresa uno manualmente o importa un JSON desde Getformly</p>
            <div style={{ display:"flex", gap:8, justifyContent:"center", marginTop:16 }}>
              <button onClick={() => setTab("ingresar")}
                style={{ padding:"8px 18px", background:C.ink, color:"#fff", border:"none", borderRadius:6,
                  cursor:"pointer", fontSize:12, fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>
                <Edit2 size={12} style={{ marginRight:4 }}/> Ingresar manualmente
              </button>
              <button onClick={() => setShowJson(true)}
                style={{ padding:"8px 18px", background:"transparent", color:C.inkMid, border:`1px solid ${C.border}`,
                  borderRadius:6, cursor:"pointer", fontSize:12, fontFamily:"'DM Sans',sans-serif" }}>
                📥 Importar JSON
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
            {briefings.map(b => (
              <div key={b.id} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:3, padding:"14px 18px", display:"flex", justifyContent:"space-between", alignItems:"center", transition:"border-color .15s" }}
                onMouseEnter={e=>e.currentTarget.style.borderColor=C.borderMid}
                onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <span style={{ fontWeight:600, fontSize:14, color:C.ink }}>{b.nombre || "Sin nombre"}</span>
                    {b.confirmacion === "Sí" && (
                      <span style={{ fontSize:9, letterSpacing:1, textTransform:"uppercase", background:C.successBg, color:C.success, border:`1px solid ${C.success}33`, padding:"2px 7px", borderRadius:2, fontWeight:700 }}>Completo</span>
                    )}
                  </div>
                  <div style={{ display:"flex", gap:16, marginTop:4, flexWrap:"wrap" }}>
                    {[
                      b.email       && { ic:"✉️", v:b.email },
                      b.ciudad      && { ic:"📍", v:b.ciudad },
                      b.tipo_proyecto&&{ ic:"🏗️", v:b.tipo_proyecto },
                      b.area_m2     && { ic:"📐", v:`${b.area_m2} m²` },
                      b.presupuesto && { ic:"💰", v:`$ ${Number(b.presupuesto).toLocaleString("es-CO")} COP` },
                    ].filter(Boolean).map((item,i) => (
                      <span key={i} style={{ fontSize:11, color:C.inkLight }}>{item.ic} {item.v}</span>
                    ))}
                  </div>
                </div>
                <div style={{ display:"flex", gap:6, alignItems:"center", flexShrink:0, marginLeft:16 }}>
                  <span style={{ fontSize:10, color:C.inkXLight, marginRight:4 }}>{b.fecha || ""}</span>
                  <button onClick={() => setSelected(b)} style={{ padding:"6px 12px", background:C.accentBg, border:`1px solid ${C.border}`, borderRadius:3, fontFamily:"'DM Sans',sans-serif", fontSize:10, cursor:"pointer", color:C.ink, fontWeight:600 }}>
                    Ver detalle
                  </button>
                  <button onClick={() => { if(onCreateClientFromBriefing) onCreateClientFromBriefing(b); }} style={{ padding:"6px 12px", background:C.infoBg, border:`1px solid ${C.info}33`, borderRadius:3, fontFamily:"'DM Sans',sans-serif", fontSize:10, cursor:"pointer", color:C.info, fontWeight:600 }}>
                    + Cliente
                  </button>
                  <button onClick={() => onCreateOfferFromBriefing(b, sv)} style={{ padding:"6px 12px", background:C.ink, border:"none", borderRadius:3, fontFamily:"'DM Sans',sans-serif", fontSize:10, cursor:"pointer", color:"#fff", fontWeight:700, letterSpacing:.5 }}>
                    + Oferta
                  </button>
                  <button onClick={() => handleDel(b.id)} disabled={deleting===b.id} style={{ padding:"6px 8px", background:"transparent", border:`1px solid ${C.border}`, borderRadius:3, cursor:"pointer", color:C.error, opacity: deleting===b.id ? .4 : 1 }}>
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Modal detalle */}
      {selected && (
        <BriefingDetalle
          b={selected}
          onClose={() => setSelected(null)}
          onCreateOffer={() => { setSelected(null); onCreateOfferFromBriefing(selected, sv); }}
          onCreateClient={() => { setSelected(null); if(onCreateClientFromBriefing) onCreateClientFromBriefing(selected); }}
        />
      )}
    </div>
  );
}

/* ─── SIDEBAR ────────────────────────────────────────────────── */

/* ─── CLIENTES CRM ───────────────────────────────────────────── */
function TabClientesCRM() {
  const SKEY = "hab:crm:clientes2";
  const [clientes, setClientes] = useState([]);
  const [form, setForm] = useState(null);
  const [search, setSearch] = useState("");
  const [briefings, setBriefings] = useState([]);
  const [showBriefPicker, setShowBriefPicker] = useState(false);

  useEffect(() => {
    (() => { try { const r = store.getSync(SKEY); if(r) setClientes(JSON.parse(r)||[]); } catch{} })();
    loadBriefings().then(bs => setBriefings(bs));
  }, []);
  const save = (list) => { setClientes(list); try{ store.set(SKEY, JSON.stringify(list)); }catch{} };
  const uid2 = () => Math.random().toString(36).slice(2,9);

  const defForm = () => ({ id:uid2(), nombre:"", tipo:"Empresa", nit:"", email:"", tel:"", ciudad:"", pais:"CO", notas:"" });
  const filtered = clientes.filter(c => !search || c.nombre.toLowerCase().includes(search.toLowerCase()) || (c.nit||"").includes(search));

  const importFromBriefing = (b) => {
    const c = briefingToClient(b);
    setForm(c);
    setShowBriefPicker(false);
  };

  const inp = (extra={}) => ({ border:"1px solid #E0E0E0", borderRadius:6, padding:"7px 10px", fontSize:13, fontFamily:"'DM Sans',sans-serif", width:"100%", ...extra });

  return (
    <div className="fade">
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div><h1 style={{ fontSize:22, fontWeight:700, margin:0 }}>Clientes</h1>
          <p style={{ fontSize:12, color:C.inkLight, margin:"3px 0 0" }}>{clientes.length} registros</p></div>
        <div style={{ display:"flex", gap:8 }}>
          {briefings.length > 0 && (
            <button onClick={() => setShowBriefPicker(true)}
              style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px",
                background:C.infoBg, color:C.info, border:`1px solid ${C.info}33`, borderRadius:6, cursor:"pointer",
                fontSize:12, fontWeight:600 }}>
              📋 Desde briefing ({briefings.length})
            </button>
          )}
          <button onClick={() => setForm(defForm())}
            style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px",
              background:C.ink, color:"#fff", border:"none", borderRadius:6, cursor:"pointer",
              fontSize:13, fontWeight:600 }}>
            <Plus size={14}/> Nuevo cliente
          </button>
        </div>
      </div>

      {/* Briefing picker modal */}
      {showBriefPicker && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", zIndex:500,
          display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}
          onClick={e => e.target===e.currentTarget && setShowBriefPicker(false)}>
          <div style={{ background:"#fff", borderRadius:10, maxWidth:520, width:"100%",
            maxHeight:"65vh", overflow:"hidden", display:"flex", flexDirection:"column",
            boxShadow:"0 20px 60px rgba(0,0,0,.2)" }}>
            <div style={{ padding:"14px 18px", borderBottom:"1px solid #E0E0E0",
              display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontWeight:700, fontSize:15 }}>Crear cliente desde briefing</div>
                <div style={{ fontSize:10, color:"#888", marginTop:2 }}>Los datos se pre-llenarán en el formulario</div>
              </div>
              <button onClick={() => setShowBriefPicker(false)}
                style={{ background:"none", border:"none", cursor:"pointer", color:"#888" }}>
                <X size={18}/>
              </button>
            </div>
            <div style={{ overflowY:"auto", padding:14 }}>
              {briefings.map(b => (
                <div key={b.id} onClick={() => importFromBriefing(b)}
                  style={{ padding:"12px 14px", border:"1px solid #E0E0E0", borderRadius:8,
                    marginBottom:8, cursor:"pointer" }}
                  onMouseEnter={e=>e.currentTarget.style.background="#F5F4F1"}
                  onMouseLeave={e=>e.currentTarget.style.background="#fff"}>
                  <div style={{ fontWeight:600, fontSize:13 }}>{b.nombre || "Sin nombre"}</div>
                  <div style={{ fontSize:11, color:"#888", marginTop:2, display:"flex", gap:12 }}>
                    {b.email && <span>✉️ {b.email}</span>}
                    {b.telefono && <span>📱 {b.telefono}</span>}
                    {b.ciudad && <span>📍 {b.ciudad}</span>}
                    {b.razon_social && <span>🏛️ {b.razon_social}</span>}
                  </div>
                </div>
              ))}
              {briefings.length === 0 && (
                <div style={{ textAlign:"center", padding:30, color:"#888", fontSize:12 }}>
                  No hay briefings. Ingresa uno en Formularios → Ingresar manual.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div style={{ position:"relative", marginBottom:16 }}>
        <Search size={14} style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:C.inkLight }}/>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por nombre o NIT..."
          style={{ ...inp(), paddingLeft:32 }}/>
      </div>

      {form && (
        <Card style={{ padding:22, marginBottom:20, borderLeft:`3px solid ${C.ink}` }}>
          <STitle t={form.id && clientes.find(c=>c.id===form.id) ? "Editar cliente" : "Nuevo cliente"} s="" />
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
            <FI lbl="Nombre / Razón social" val={form.nombre} on={e=>setForm(f=>({...f,nombre:e.target.value}))} />
            <div>
              <label style={{ display:"block", fontSize:10, fontWeight:600, color:C.inkLight, marginBottom:5, textTransform:"uppercase", letterSpacing:1 }}>Tipo</label>
              <select value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))} style={{ ...inp() }}>
                {["Empresa","Persona natural","Promotor","Particular"].map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <FI lbl="NIT / CIF / DNI" val={form.nit} on={e=>setForm(f=>({...f,nit:e.target.value}))} />
            <FI lbl="Email" val={form.email} on={e=>setForm(f=>({...f,email:e.target.value}))} />
            <div>
              <label style={{ display:"block", fontSize:10, fontWeight:600, color:C.inkLight, marginBottom:5, textTransform:"uppercase", letterSpacing:1 }}>Móvil</label>
              <div style={{ display:"flex", gap:4 }}>
                <select value={form.prefijoMovil||"+57"} onChange={e=>setForm(f=>({...f,prefijoMovil:e.target.value}))}
                  style={{ ...inp(), width:82, flexShrink:0, fontSize:12 }}>
                  {["+57 🇨🇴","+34 🇪🇸","+52 🇲🇽","+1 🇺🇸"].map(p=><option key={p} value={p.split(" ")[0]}>{p}</option>)}
                </select>
                <input value={form.telMovil||form.tel||""} onChange={e=>setForm(f=>({...f,telMovil:e.target.value}))}
                  placeholder="300 123 4567" style={{ ...inp() }}/>
              </div>
            </div>
            <div>
              <label style={{ display:"block", fontSize:10, fontWeight:600, color:C.inkLight, marginBottom:5, textTransform:"uppercase", letterSpacing:1 }}>Fijo</label>
              <div style={{ display:"flex", gap:4 }}>
                <select value={form.prefijoFijo||"+57"} onChange={e=>setForm(f=>({...f,prefijoFijo:e.target.value}))}
                  style={{ ...inp(), width:82, flexShrink:0, fontSize:12 }}>
                  {["+57 🇨🇴","+34 🇪🇸","+52 🇲🇽","+1 🇺🇸"].map(p=><option key={p} value={p.split(" ")[0]}>{p}</option>)}
                </select>
                <input value={form.telFijo||""} onChange={e=>setForm(f=>({...f,telFijo:e.target.value}))}
                  placeholder="601 234 5678" style={{ ...inp() }}/>
              </div>
            </div>
            <FI lbl="Ciudad" val={form.ciudad} on={e=>setForm(f=>({...f,ciudad:e.target.value}))} />
            <div>
              <label style={{ display:"block", fontSize:10, fontWeight:600, color:C.inkLight, marginBottom:5, textTransform:"uppercase", letterSpacing:1 }}>País</label>
              <select value={form.pais} onChange={e=>setForm(f=>({...f,pais:e.target.value}))} style={{ ...inp() }}>
                {["CO","ES","MX","US","Otro"].map(p=><option key={p}>{p}</option>)}
              </select>
            </div>
            <div style={{ gridColumn:"2 / -1" }}>
              <label style={{ display:"block", fontSize:10, fontWeight:600, color:C.inkLight, marginBottom:5, textTransform:"uppercase", letterSpacing:1 }}>Notas</label>
              <textarea value={form.notas} onChange={e=>setForm(f=>({...f,notas:e.target.value}))}
                rows={2} style={{ ...inp(), resize:"vertical" }}/>
            </div>
          </div>
          <div style={{ display:"flex", gap:8, marginTop:14 }}>
            <Btn icon={Check} on={() => {
              if (!form.nombre) { alert("El nombre es obligatorio"); return; }
              const exists = clientes.find(c=>c.id===form.id);
              save(exists ? clientes.map(c=>c.id===form.id?form:c) : [...clientes,form]);
              setForm(null);
            }}>Guardar</Btn>
            <Btn v="out" on={()=>setForm(null)}>Cancelar</Btn>
            {clientes.find(c=>c.id===form.id) && (
              <Btn v="out" on={() => { if(window.confirm("¿Eliminar?")) { save(clientes.filter(c=>c.id!==form.id)); setForm(null); }}}>
                <Trash2 size={13}/> Eliminar
              </Btn>
            )}
          </div>
        </Card>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:12 }}>
        {filtered.map(c => (
          <Card key={c.id} style={{ padding:18, cursor:"pointer", transition:"box-shadow .15s" }}
            onClick={() => setForm({...c})}
            onMouseEnter={e=>e.currentTarget.style.boxShadow=C.shadowMd}
            onMouseLeave={e=>e.currentTarget.style.boxShadow=C.shadow}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <div>
                <div style={{ fontWeight:700, fontSize:14, color:C.ink }}>{c.nombre}</div>
                <div style={{ fontSize:11, color:C.inkLight, marginTop:2 }}>{c.tipo} · {c.ciudad||"–"} · {c.pais}</div>
              </div>
              <div style={{ background:C.accentBg, borderRadius:4, padding:"2px 7px", fontSize:10, color:C.inkMid }}>{c.nit||"–"}</div>
            </div>
            {(c.email||c.telMovil||c.tel||c.telFijo) && (
              <div style={{ marginTop:8, fontSize:11, color:C.inkMid, display:"flex", gap:12, flexWrap:"wrap" }}>
                {c.email && <span>✉ {c.email}</span>}
                {(c.telMovil||c.tel) && <span>📱 {c.prefijoMovil||"+57"} {c.telMovil||c.tel}</span>}
                {c.telFijo && <span>📞 {c.prefijoFijo||"+57"} {c.telFijo}</span>}
              </div>
            )}
          </Card>
        ))}
        {filtered.length === 0 && (
          <div style={{ gridColumn:"1/-1", textAlign:"center", padding:40, color:C.inkLight, fontSize:13 }}>
            {search ? "Sin resultados. Prueba otro término." : "Sin clientes. Añade el primero."}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── PROVEEDORES CRM ────────────────────────────────────────── */
function TabProveedores() {
  const SKEY = "hab:crm:proveedores";
  const [provs, setProvs] = useState([]);
  const [form, setForm] = useState(null);
  const [search, setSearch] = useState("");
  const [catFiltro, setCatFiltro] = useState("Todos");

  const CATEGORIAS = ["Todos",
    "Preliminares","Demoliciones","Movimiento de tierras","Cimentaciones","Estructura",
    "Mampostería","Cubierta","Instalaciones eléctricas","Instalaciones hidrosanitarias",
    "Instalaciones de gas","Acabados","Pisos y enchapes","Pintura",
    "Carpintería metálica","Carpintería madera / mobiliario",
    "Obras exteriores","Equipamiento especial","Diseño y dirección","Otros"
  ];

  useEffect(() => {
    (() => { try { const r = store.getSync(SKEY); if(r) setProvs(JSON.parse(r)||[]); } catch{} })();
  }, []);
  const save = (list) => { setProvs(list); try{ store.set(SKEY, JSON.stringify(list)); }catch{} };
  const uid2 = () => Math.random().toString(36).slice(2,9);

  const defForm = () => ({ id:uid2(), nombre:"", categoria:"Materiales", nit:"", email:"", tel:"", contacto:"", ciudad:"", web:"", notas:"", calificacion:5, metodoPago:"Transferencia", formaPago:"Contado", prefijoFijo:"+601" });
  const filtered = provs.filter(p =>
    (catFiltro === "Todos" || p.categoria === catFiltro) &&
    (!search || p.nombre.toLowerCase().includes(search.toLowerCase()))
  );
  const inp = (extra={}) => ({ border:"1px solid #E0E0E0", borderRadius:6, padding:"7px 10px", fontSize:13, fontFamily:"'DM Sans',sans-serif", width:"100%", ...extra });

  return (
    <div className="fade">
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div><h1 style={{ fontSize:22, fontWeight:700, margin:0 }}>Proveedores</h1>
          <p style={{ fontSize:12, color:C.inkLight, margin:"3px 0 0" }}>{provs.length} registros</p></div>
        <button onClick={() => setForm(defForm())}
          style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px",
            background:C.ink, color:"#fff", border:"none", borderRadius:6, cursor:"pointer",
            fontSize:13, fontWeight:600 }}>
          <Plus size={14}/> Nuevo proveedor
        </button>
      </div>

      <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
        <div style={{ position:"relative", flex:1, minWidth:200 }}>
          <Search size={14} style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:C.inkLight }}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar proveedor..."
            style={{ ...inp(), paddingLeft:32 }}/>
        </div>
        {CATEGORIAS.map(cat => (
          <button key={cat} onClick={() => setCatFiltro(cat)}
            style={{ padding:"6px 12px", border:`1px solid ${catFiltro===cat?C.ink:C.border}`,
              borderRadius:20, background:catFiltro===cat?C.ink:"transparent",
              color:catFiltro===cat?"#fff":C.inkMid, cursor:"pointer", fontSize:11,
              fontFamily:"'DM Sans',sans-serif", fontWeight:catFiltro===cat?600:400 }}>
            {cat}
          </button>
        ))}
      </div>

      {form && (
        <Card style={{ padding:22, marginBottom:20, borderLeft:`3px solid #3B3B3B` }}>
          <STitle t={provs.find(p=>p.id===form.id) ? "Editar proveedor" : "Nuevo proveedor"} s="" />
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
            <FI lbl="Nombre / Razón social" val={form.nombre} on={e=>setForm(f=>({...f,nombre:e.target.value}))} />
            <div>
              <label style={{ display:"block", fontSize:10, fontWeight:600, color:C.inkLight, marginBottom:5, textTransform:"uppercase", letterSpacing:1 }}>Categoría</label>
              <select value={form.categoria} onChange={e=>setForm(f=>({...f,categoria:e.target.value}))} style={{ ...inp() }}>
                {CATEGORIAS.filter(c=>c!=="Todos").map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <FI lbl="NIT / CIF" val={form.nit} on={e=>setForm(f=>({...f,nit:e.target.value}))} />
            <FI lbl="Contacto" val={form.contacto} on={e=>setForm(f=>({...f,contacto:e.target.value}))} />
            <FI lbl="Email" val={form.email} on={e=>setForm(f=>({...f,email:e.target.value}))} />
            <div>
              <label style={{ display:"block", fontSize:10, fontWeight:600, color:C.inkLight, marginBottom:5, textTransform:"uppercase", letterSpacing:1 }}>Móvil</label>
              <div style={{ display:"flex", gap:4 }}>
                <select value={form.prefijoMovil||"+57"} onChange={e=>setForm(f=>({...f,prefijoMovil:e.target.value}))}
                  style={{ ...inp(), width:82, flexShrink:0, fontSize:12 }}>
                  {["+57 🇨🇴","+34 🇪🇸","+52 🇲🇽","+1 🇺🇸"].map(p=><option key={p} value={p.split(" ")[0]}>{p}</option>)}
                </select>
                <input value={form.telMovil||form.tel||""} onChange={e=>setForm(f=>({...f,telMovil:e.target.value}))}
                  placeholder="300 123 4567" style={{ ...inp() }}/>
              </div>
            </div>
            <FI lbl="Ciudad" val={form.ciudad} on={e=>setForm(f=>({...f,ciudad:e.target.value}))} />
            <div>
              <label style={{ display:"block", fontSize:10, fontWeight:600, color:C.inkLight, marginBottom:5, textTransform:"uppercase", letterSpacing:1 }}>Teléfono fijo</label>
              <div style={{ display:"flex", gap:4 }}>
                <select value={form.prefijoFijo||"+601"} onChange={e=>setForm(f=>({...f,prefijoFijo:e.target.value}))}
                  style={{ ...inp(), width:90, flexShrink:0, fontSize:12 }}>
                  {["+601 🇨🇴 Bog","+602 🇨🇴 Cali","+604 🇨🇴 Med","+605 🇨🇴 B/manga","+91 🇪🇸 Mad","+93 🇪🇸 Bcn"].map(p=><option key={p} value={p.split(" ")[0]}>{p}</option>)}
                </select>
                <input value={form.telFijo||""} onChange={e=>setForm(f=>({...f,telFijo:e.target.value}))}
                  placeholder="234 5678" style={{ ...inp() }}/>
              </div>
            </div>
            <div>
              <label style={{ display:"block", fontSize:10, fontWeight:600, color:C.inkLight, marginBottom:5, textTransform:"uppercase", letterSpacing:1 }}>Método de pago</label>
              <select value={form.metodoPago||"Transferencia"} onChange={e=>setForm(f=>({...f,metodoPago:e.target.value}))} style={{ ...inp() }}>
                {["Transferencia","Cheque","Efectivo","PSE","Consignación","Otro"].map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display:"block", fontSize:10, fontWeight:600, color:C.inkLight, marginBottom:5, textTransform:"uppercase", letterSpacing:1 }}>Forma de pago (plazo)</label>
              <select value={form.formaPago||"Contado"} onChange={e=>setForm(f=>({...f,formaPago:e.target.value}))} style={{ ...inp() }}>
                {["Contado","Crédito 15d","Crédito 30d","Crédito 45d","Crédito 60d","Crédito 90d","Anticipo + saldo","Otro"].map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <FI lbl="Sitio web" val={form.web} on={e=>setForm(f=>({...f,web:e.target.value}))} />
            <div>
              <label style={{ display:"block", fontSize:10, fontWeight:600, color:C.inkLight, marginBottom:5, textTransform:"uppercase", letterSpacing:1 }}>Calificación (1-5)</label>
              <div style={{ display:"flex", gap:4 }}>
                {[1,2,3,4,5].map(n => (
                  <button key={n} onClick={() => setForm(f=>({...f,calificacion:n}))}
                    style={{ fontSize:20, background:"none", border:"none", cursor:"pointer",
                      color: n <= form.calificacion ? "#F5A623" : "#DDD" }}>★</button>
                ))}
              </div>
            </div>
            <div style={{ gridColumn:"1 / -1" }}>
              <label style={{ display:"block", fontSize:10, fontWeight:600, color:C.inkLight, marginBottom:5, textTransform:"uppercase", letterSpacing:1 }}>Notas</label>
              <textarea value={form.notas} onChange={e=>setForm(f=>({...f,notas:e.target.value}))}
                rows={2} style={{ ...inp(), resize:"vertical" }}/>
            </div>
          </div>
          <div style={{ display:"flex", gap:8, marginTop:14 }}>
            <Btn icon={Check} on={() => {
              if (!form.nombre) { alert("El nombre es obligatorio"); return; }
              const exists = provs.find(p=>p.id===form.id);
              save(exists ? provs.map(p=>p.id===form.id?form:p) : [...provs,form]);
              setForm(null);
            }}>Guardar</Btn>
            <Btn v="out" on={()=>setForm(null)}>Cancelar</Btn>
            {provs.find(p=>p.id===form.id) && (
              <Btn v="out" on={() => { if(window.confirm("¿Eliminar?")) { save(provs.filter(p=>p.id!==form.id)); setForm(null); }}}>
                <Trash2 size={13}/> Eliminar
              </Btn>
            )}
          </div>
        </Card>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))", gap:12 }}>
        {filtered.map(p => (
          <Card key={p.id} style={{ padding:18, cursor:"pointer", transition:"box-shadow .15s" }}
            onClick={() => setForm({...p})}
            onMouseEnter={e=>e.currentTarget.style.boxShadow=C.shadowMd}
            onMouseLeave={e=>e.currentTarget.style.boxShadow=C.shadow}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, fontSize:14, color:C.ink }}>{p.nombre}</div>
                <div style={{ fontSize:11, color:C.inkLight, marginTop:2 }}>{p.categoria} · {p.ciudad||"–"}</div>
              </div>
              <div style={{ display:"flex", gap:1 }}>
                {[1,2,3,4,5].map(n=>(
                  <span key={n} style={{ fontSize:12, color: n<=(p.calificacion||0)?"#F5A623":"#DDD" }}>★</span>
                ))}
              </div>
            </div>
            {(p.contacto||p.email||p.telMovil||p.tel||p.telFijo) && (
              <div style={{ marginTop:8, fontSize:11, color:C.inkMid, display:"flex", gap:10, flexWrap:"wrap" }}>
                {p.contacto && <span>👤 {p.contacto}</span>}
                {p.email && <span>✉ {p.email}</span>}
                {(p.telMovil||p.tel) && <span>📱 {p.prefijoMovil||"+57"} {p.telMovil||p.tel}</span>}
                {p.telFijo && <span>☎ {p.prefijoFijo||"+601"} {p.telFijo}</span>}
              </div>
            )}
            {(p.formaPago||p.metodoPago||p.nit) && (
              <div style={{ marginTop:4, fontSize:10, color:C.inkLight, display:"flex", gap:10 }}>
                {p.nit && <span>NIT: {p.nit}</span>}
                {p.metodoPago && <span>💳 {p.metodoPago}</span>}
                {p.formaPago && <span>📅 {p.formaPago}</span>}
              </div>
            )}
          </Card>
        ))}
        {filtered.length === 0 && (
          <div style={{ gridColumn:"1/-1", textAlign:"center", padding:40, color:C.inkLight, fontSize:13 }}>
            {search || catFiltro !== "Todos" ? "Sin resultados." : "Sin proveedores. Añade el primero."}
          </div>
        )}
      </div>
    </div>
  );
}


const NAV = [
  { id: "dashboard",    lbl: "Dashboard",      en: "Dashboard",      I: LayoutDashboard },
  { id: "offers",       lbl: "Ofertas",         en: "Offers",         I: FileText },
  { id: "clientes",     lbl: "Clientes",        en: "Clients",        I: User },
  { id: "proveedores",  lbl: "Proveedores",     en: "Suppliers",      I: HardHat },
  { id: "formularios",  lbl: "Formularios",     en: "Forms",          I: ClipboardList },
  { id: "encuestas",    lbl: "Encuestas ISO",   en: "ISO Surveys",    I: ClipboardCheck },
  { id: "settings",     lbl: "Configuración",   en: "Settings",       I: Settings },
];

function Sidebar({ view, sv, lang, setLang, open, toggle }) {
  return (
    <>
      {/* Toggle button — always visible */}
      <button onClick={toggle} className="no-print" style={{
        position:"fixed", top:10, left:open?208:10, zIndex:1002, width:28, height:28,
        background:open?"rgba(255,255,255,0.1)":"#111", color:open?"rgba(255,255,255,0.5)":"#fff",
        border:"none", borderRadius:4, cursor:"pointer", fontSize:14, display:"flex",
        alignItems:"center", justifyContent:"center", transition:"left .2s ease",
      }}>
        {open ? "◀" : "▶"}
      </button>
      {/* Sidebar panel */}
      <div className="no-print" style={{
        width:200, background:C.sidebar, height:"100vh", position:"fixed", left:open?0:-200, top:0,
        display:"flex", flexDirection:"column", transition:"left .2s ease", zIndex:1001,
      }}>
      {/* Logo */}
      <div style={{ padding: "22px 18px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <LogoMark size={32} color="#fff" />
          <div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 14, letterSpacing: 4, color: "#fff", textTransform: "uppercase" }}>HABITARIS</div>
            <div style={{ fontSize: 9, letterSpacing: 2, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", fontWeight: 400 }}>{lang==="en"?"CRM · Offers":"CRM · Ofertas"}</div>
          </div>
        </div>
      </div>
      {/* Nav */}
      <nav style={{ padding: "12px 8px", flex: 1 }}>
        {NAV.map(it => {
          const act = view === it.id || (view.startsWith("offer-") && it.id === "offers");
          return (
            <button key={it.id} onClick={() => sv(it.id)} style={{
              display: "flex", alignItems: "center", gap: 10, width: "100%",
              padding: "10px 12px", borderRadius: 2, border: "none", cursor: "pointer",
              background: act ? C.sidebarAct : "transparent",
              color: act ? "#fff" : "rgba(255,255,255,0.35)",
              fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: act ? 600 : 400,
              letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 1,
              transition: "all .15s",
              borderLeft: act ? "2px solid rgba(255,255,255,0.6)" : "2px solid transparent",
            }}>
              <it.I size={13} />{lang==="en" && it.en ? it.en : it.lbl}
            </button>
          );
        })}
      </nav>
      <div style={{ padding: "14px 18px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ display:"flex", gap:0, marginBottom:8 }}>
          {[["es","🇪🇸 ES"],["en","🇬🇧 EN"]].map(([code,lbl])=>(
            <button key={code} onClick={()=>setLang(code)}
              style={{ flex:1, padding:"5px 0", fontSize:10, fontWeight:600, cursor:"pointer",
                border:"1px solid rgba(255,255,255,0.15)", fontFamily:"'DM Sans',sans-serif",
                borderRadius:code==="es"?"4px 0 0 4px":"0 4px 4px 0",
                background:lang===code?"#fff":"transparent",
                color:lang===code?"#111":"rgba(255,255,255,0.4)" }}>{lbl}</button>
          ))}
        </div>
        <p style={{ fontSize: 9, color: "rgba(255,255,255,0.15)", margin: 0, letterSpacing: 1, textTransform: "uppercase" }}>v3.0 · Fase 2 · 2025</p>
      </div>
    </div>
    </>
  );
}

/* ─── DASHBOARD ──────────────────────────────────────────────── */
function Dashboard({ offers, sv, sei, lang }) {
  const st = useMemo(() => {
    const gan = offers.filter(o => o.estado === "Ganada");
    const per = offers.filter(o => o.estado === "Perdida");
    const act = offers.filter(o => !["Ganada", "Perdida", "Cancelada"].includes(o.estado));
    return {
      gan, per, act,
      pip: act.reduce((s, o) => s + (calc(o).PVP_IVA || 0), 0),
      ganado: gan.reduce((s, o) => s + (calc(o).PVP_IVA || 0), 0),
      tasa: (gan.length + per.length) > 0 ? (gan.length / (gan.length + per.length) * 100).toFixed(0) : 0,
    };
  }, [offers]);

  const rec = [...offers].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 6);

  return (
    <div className="fade">
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 9, letterSpacing: 2.5, textTransform: "uppercase", color: C.inkLight, margin: "0 0 6px" }}>{lang==="en"?"General panel":"Panel general"}</p>
        <h1 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 28, fontWeight: 700, color: C.ink, margin: 0, letterSpacing: -0.5 }}>Dashboard</h1>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <KPI lbl={lang==="en"?"Total offers":"Total ofertas"}    val={offers.length}    icon={FileText}     col={C.ink} />
        <KPI lbl={lang==="en"?"Active pipeline":"Pipeline activo"} val={fmt(st.pip)}   icon={TrendingUp}   col={C.info}    sub={`${st.act.length} ${lang==="en"?"offer(s)":"oferta(s)"}`} />
        <KPI lbl={lang==="en"?"Total won":"Total ganado"}        val={fmt(st.ganado)}   icon={CheckCircle2} col={C.success} sub={`${st.gan.length} ${lang==="en"?"won":"ganada(s)"}`} />
        <KPI lbl={lang==="en"?"Win rate":"% Adjudicación"}       val={`${st.tasa}%`}   icon={BarChart3}    col={C.warning} sub={`${st.per.length} ${lang==="en"?"lost":"perdida(s)"}`} />
      </div>

      {/* Estado chips */}
      <div style={{ display: "flex", gap: 8, marginBottom: 22, flexWrap: "wrap" }}>
        {ESTADOS.map(e => {
          const n = offers.filter(o => o.estado === e).length;
          if (!n) return null;
          return (
            <div key={e} onClick={() => sv("offers")} style={{ display: "flex", alignItems: "center", gap: 8, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 2, padding: "7px 13px", cursor: "pointer" }}>
              <Badge e={e} /><span style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{n}</span>
            </div>
          );
        })}
      </div>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 700, color: C.ink, margin: 0, textTransform: "uppercase", letterSpacing: 0.5 }}>Ofertas recientes</h3>
          <Btn v="ghost" sm icon={ChevronRight} on={() => sv("offers")}>Ver todas</Btn>
        </div>
        {rec.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: C.inkLight }}>
            <FileText size={30} style={{ opacity: .2, marginBottom: 10 }} />
            <p style={{ margin: "0 0 14px", fontSize: 13 }}>Aún no hay ofertas</p>
            <Btn icon={Plus} on={() => sv("offer-new")}>Nueva oferta</Btn>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#FFFFFF" }}>
                {["Cliente", "Proyecto", "Tipo", "PVP c/IVA", "Estado", ""].map(h => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 9, fontWeight: 600, color: C.inkLight, textTransform: "uppercase", letterSpacing: 1.2 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rec.map(o => {
                const r = calc(o);
                return (
                  <tr key={o.id} style={{ borderTop: `1px solid ${C.border}` }}
                    onMouseEnter={e => e.currentTarget.style.background = "#FFFFFF"}
                    onMouseLeave={e => e.currentTarget.style.background = ""}>
                    <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 500, color: C.ink }}>{o.cliente || "—"}</td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: C.inkMid }}>{o.proyecto || "—"}</td>
                    <td style={{ padding: "12px 16px" }}><span style={{ fontSize: 9, background: C.accentBg, color: C.ink, padding: "2px 8px", borderRadius: 2, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>{o.tipoProyecto === "DISEÑO" ? (o.subtipoDiseno || "Diseño").split(" ").pop() : o.tipoProyecto}</span></td>
                    <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700, color: C.ink }}>{fmt(r.PVP_IVA)}</td>
                    <td style={{ padding: "12px 16px" }}><Badge e={o.estado} /></td>
                    <td style={{ padding: "12px 16px" }}><Btn sm v="ghost" icon={Edit2} on={() => { sei(o.id); sv("offer-edit"); }} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

/* ─── LISTA DE OFERTAS ───────────────────────────────────────── */
function Lista({ offers, sv, sei, onDel, onDup }) {
  const [srch, setSrch] = useState("");
  const [fE, setFE] = useState("Todos");
  const [fT, setFT] = useState("Todos");

  const fil = useMemo(() => offers.filter(o => {
    const ms = !srch || [o.cliente, o.proyecto, o.ubicacion].join(" ").toLowerCase().includes(srch.toLowerCase());
    return ms && (fE === "Todos" || o.estado === fE) && (fT === "Todos" || o.tipoProyecto === fT);
  }).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)), [offers, srch, fE, fT]);

  return (
    <div className="fade">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <p style={{ fontSize: 9, letterSpacing: 2.5, textTransform: "uppercase", color: C.inkLight, margin: "0 0 6px" }}>Biblioteca</p>
          <h1 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 28, fontWeight: 700, color: C.ink, margin: 0, letterSpacing: -0.5 }}>Ofertas</h1>
          <p style={{ color: C.inkLight, fontSize: 11, margin: "4px 0 0" }}>{offers.length} oferta(s) registrada(s)</p>
        </div>
        <Btn icon={Plus} on={() => sv("offer-new")}>Nueva oferta</Btn>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.inkLight }} />
          <input value={srch} onChange={e => setSrch(e.target.value)} placeholder="Buscar cliente, proyecto..."
            style={{ width: "100%", padding: "9px 12px 9px 32px", border: `1px solid ${C.border}`, borderRadius: 2, fontFamily: "'DM Sans', sans-serif", fontSize: 12, background: C.surface, color: C.ink }} />
        </div>
        {[{ val: fE, sv: setFE, opts: ["Todos", ...ESTADOS] }, { val: fT, sv: setFT, opts: ["Todos", "OBRA", "DISEÑO"] }].map(({ val, sv, opts }, i) => (
          <select key={i} value={val} onChange={e => sv(e.target.value)}
            style={{ padding: "9px 12px", border: `1px solid ${C.border}`, borderRadius: 2, fontFamily: "'DM Sans', sans-serif", fontSize: 12, background: C.surface, color: C.ink }}>
            {opts.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ))}
      </div>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        {fil.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: C.inkLight }}><p style={{ fontSize: 13 }}>No se encontraron ofertas</p></div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#FFFFFF" }}>
                {["#", "Cliente / Proyecto", "Modalidad", "Costo dir.", "PVP c/IVA", "Margen", "Estado", "Fecha", ""].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 9, fontWeight: 600, color: C.inkLight, textTransform: "uppercase", letterSpacing: 1, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fil.map((o, i) => {
                const r = calc(o);
                return (
                  <tr key={o.id} style={{ borderTop: `1px solid ${C.border}` }}
                    onMouseEnter={e => e.currentTarget.style.background = "#FFFFFF"}
                    onMouseLeave={e => e.currentTarget.style.background = ""}>
                    <td style={{ padding: "11px 14px", fontSize: 10, color: C.inkLight, fontWeight: 600 }}>{String(i + 1).padStart(3, "0")}</td>
                    <td style={{ padding: "11px 14px" }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: C.ink }}>{o.cliente || "—"}</p>
                      <p style={{ margin: 0, fontSize: 11, color: C.inkLight }}>{o.proyecto || "Sin nombre"}</p>
                    </td>
                    <td style={{ padding: "11px 14px" }}><span style={{ fontSize: 9, background: C.accentBg, color: C.ink, padding: "2px 8px", borderRadius: 2, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase" }}>{o.tipoProyecto === "DISEÑO" ? (o.subtipoDiseno || "Diseño") : o.tipoProyecto}</span></td>
                    <td style={{ padding: "11px 14px", fontSize: 12, color: C.inkMid }}>{fmt(r.COSTO)}</td>
                    <td style={{ padding: "11px 14px", fontSize: 13, fontWeight: 700, color: C.ink }}>{fmt(r.PVP_IVA)}</td>
                    <td style={{ padding: "11px 14px", fontSize: 12, color: r.PVP > 0 ? C.success : C.inkLight }}>{r.PVP > 0 ? pct(o.margen) : "—"}</td>
                    <td style={{ padding: "11px 14px" }}><Badge e={o.estado} /></td>
                    <td style={{ padding: "11px 14px", fontSize: 10, color: C.inkLight, whiteSpace: "nowrap" }}>{o.updatedAt ? new Date(o.updatedAt).toLocaleDateString("es-CO") : "—"}</td>
                    <td style={{ padding: "11px 14px" }}>
                      <div style={{ display: "flex", gap: 3 }}>
                        <Btn sm v="ghost" icon={Edit2} on={() => { sei(o.id); sv("offer-edit"); }} />
                        <Btn sm v="ghost" icon={Copy} on={() => onDup(o.id)} />
                        <Btn sm v="danger" icon={Trash2} on={() => onDel(o.id)} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════
// NEW SECTIONS FOR CRM v5
// ═══════════════════════════════════════════════════════════════

/* ─── TIPOS DE LÍNEA (6 códigos) ──────────────────────────── */
const TIPOS_LINEA = [
  { id:"DIS", label:"Diseño",                    color:"#5B3A8C", icon:"✏️",  modo:"diseno"    },
  { id:"REF", label:"Reforma / construcción",    color:"#8C6A00", icon:"🏗️",  modo:"ejecucion" },
  { id:"INS", label:"Instalaciones",             color:"#3B3B3B", icon:"⚡",  modo:"ejecucion" },
  { id:"MOB", label:"Carpintería y mobiliario",  color:"#6B4226", icon:"🪵",  modo:"ejecucion" },
  { id:"DIR", label:"Dirección / supervisión",   color:"#0D5E6E", icon:"👁️",  modo:"diseno"    },
  { id:"SER", label:"Servicios técnicos",        color:"#555555", icon:"🔧",  modo:"diseno"    },
];

// Capítulos de presupuesto de obra (diferentes a los tipos de línea)
const TIPOS_CAPITULO = [
  { id:"CAP00", label:"00 · Preliminares e instalaciones provisionales", color:"#555555" },
  { id:"CAP01", label:"01 · Demoliciones y desmonte",                     color:"#8C6A00" },
  { id:"CAP02", label:"02 · Movimiento de tierras",                       color:"#6B4226" },
  { id:"CAP03", label:"03 · Cimentaciones",                               color:"#5B3A8C" },
  { id:"CAP04", label:"04 · Estructura",                                  color:"#3B3B3B" },
  { id:"CAP05", label:"05 · Mampostería y cerramientos",                  color:"#0D5E6E" },
  { id:"CAP06", label:"06 · Cubierta e impermeabilización",               color:"#8C6A00" },
  { id:"CAP07", label:"07 · Instalaciones eléctricas",                    color:"#111111" },
  { id:"CAP08", label:"08 · Instalaciones hidrosanitarias",               color:"#3B3B3B" },
  { id:"CAP09", label:"09 · Instalaciones de gas",                        color:"#B91C1C" },
  { id:"CAP10", label:"10 · Acabados generales",                          color:"#555555" },
  { id:"CAP11", label:"11 · Pisos y enchapes",                            color:"#6B4226" },
  { id:"CAP12", label:"12 · Pintura",                                     color:"#5B3A8C" },
  { id:"CAP13", label:"13 · Carpintería metálica y vidriería",            color:"#0D5E6E" },
  { id:"CAP14", label:"14 · Carpintería de madera y mobiliario",          color:"#6B4226" },
  { id:"CAP15", label:"15 · Obras exteriores y urbanismo",                color:"#111111" },
  { id:"CAP16", label:"16 · Equipamiento especial",                       color:"#555555" },
  { id:"CAP17", label:"17 · Diseño y dirección técnica",                  color:"#5B3A8C" },
  { id:"CAP18", label:"18 · Admin, imprevistos y utilidad (AIU)",         color:"#3B3B3B" },
];

/* ─── ESTUDIOS/ENTREGABLES PARA DISEÑO (biblioteca) ─────────── */
const ESTUDIOS_DISENO = [
  { id:"lev",     nombre:"Levantamiento arquitectónico",           horas:4,  tipo:"plano" },
  { id:"propArq", nombre:"Propuesta arquitectónica",               horas:8,  tipo:"plano" },
  { id:"propInt", nombre:"Propuesta de interiores",                horas:6,  tipo:"plano" },
  { id:"cortes",  nombre:"Cortes y fachadas",                      horas:3,  tipo:"plano" },
  { id:"det",     nombre:"Detalles constructivos",                 horas:4,  tipo:"plano" },
  { id:"inst_e",  nombre:"Plano instalaciones eléctricas",         horas:3,  tipo:"plano" },
  { id:"inst_h",  nombre:"Plano instalaciones hidrosanitarias",    horas:3,  tipo:"plano" },
  { id:"render",  nombre:"Renders 3D exteriores (x3)",             horas:12, tipo:"render" },
  { id:"render_i",nombre:"Renders 3D interiores (x5)",             horas:10, tipo:"render" },
  { id:"recorrido",nombre:"Recorrido virtual 360°",                horas:16, tipo:"render" },
  { id:"memoria", nombre:"Memoria descriptiva",                    horas:4,  tipo:"doc" },
  { id:"cuadro",  nombre:"Cuadro de áreas",                        horas:2,  tipo:"doc" },
  { id:"presup",  nombre:"Presupuesto de obra (ítem por ítem)",    horas:8,  tipo:"doc" },
  { id:"licencia",nombre:"Gestión licencia construcción",          horas:20, tipo:"tramite" },
  { id:"topog",   nombre:"Levantamiento topográfico",              horas:0,  tipo:"subcontrata" },
  { id:"estruc",  nombre:"Cálculo estructural",                    horas:0,  tipo:"subcontrata" },
  { id:"suelos",  nombre:"Estudio de suelos",                      horas:0,  tipo:"subcontrata" },
];

/* ─── CATÁLOGO CODIFICADO DE RECURSOS ───────────────────────── */
const CATALOGO_RECURSOS = [
  // ── EPP ──
  { codigo:"EPP-001", nombre:"Casco de seguridad",        familia:"epp",       unidad:"ud", vidaUtilMeses:24, precioRef:35000 },
  { codigo:"EPP-002", nombre:"Botas de seguridad",        familia:"epp",       unidad:"par",vidaUtilMeses:12, precioRef:120000 },
  { codigo:"EPP-003", nombre:"Guantes de carnaza",        familia:"epp",       unidad:"par",vidaUtilMeses:3,  precioRef:12000 },
  { codigo:"EPP-004", nombre:"Gafas de seguridad",        familia:"epp",       unidad:"ud", vidaUtilMeses:12, precioRef:18000 },
  { codigo:"EPP-005", nombre:"Chaleco reflectivo",        familia:"epp",       unidad:"ud", vidaUtilMeses:12, precioRef:25000 },
  { codigo:"EPP-006", nombre:"Protección auditiva",       familia:"epp",       unidad:"ud", vidaUtilMeses:6,  precioRef:8000 },
  { codigo:"EPP-007", nombre:"Mascarilla con filtro",     familia:"epp",       unidad:"ud", vidaUtilMeses:1,  precioRef:15000 },
  { codigo:"EPP-008", nombre:"Arnés de seguridad",        familia:"epp",       unidad:"ud", vidaUtilMeses:36, precioRef:180000 },
  { codigo:"EPP-009", nombre:"Guantes de nitrilo",        familia:"epp",       unidad:"caja",vidaUtilMeses:1, precioRef:28000 },
  { codigo:"EPP-010", nombre:"Careta de soldar",          familia:"epp",       unidad:"ud", vidaUtilMeses:24, precioRef:85000 },
  // ── Dotación ──
  { codigo:"DOT-001", nombre:"Overol de trabajo",         familia:"dotacion",  unidad:"ud", vidaUtilMeses:6,  precioRef:65000 },
  { codigo:"DOT-002", nombre:"Camiseta con logo",         familia:"dotacion",  unidad:"ud", vidaUtilMeses:6,  precioRef:30000 },
  { codigo:"DOT-003", nombre:"Pantalón de trabajo",       familia:"dotacion",  unidad:"ud", vidaUtilMeses:6,  precioRef:45000 },
  // ── Herramienta menor ──
  { codigo:"HM-001", nombre:"Martillo de uña",            familia:"herr_menor",unidad:"ud", vidaUtilMeses:24, precioRef:35000 },
  { codigo:"HM-002", nombre:"Juego destornilladores",     familia:"herr_menor",unidad:"jgo",vidaUtilMeses:24, precioRef:45000 },
  { codigo:"HM-003", nombre:"Flexómetro 5m",              familia:"herr_menor",unidad:"ud", vidaUtilMeses:12, precioRef:22000 },
  { codigo:"HM-004", nombre:"Nivel de burbuja 60cm",      familia:"herr_menor",unidad:"ud", vidaUtilMeses:24, precioRef:38000 },
  { codigo:"HM-005", nombre:"Llana dentada",              familia:"herr_menor",unidad:"ud", vidaUtilMeses:12, precioRef:18000 },
  { codigo:"HM-006", nombre:"Llana lisa",                 familia:"herr_menor",unidad:"ud", vidaUtilMeses:12, precioRef:15000 },
  { codigo:"HM-007", nombre:"Maceta 2lb",                 familia:"herr_menor",unidad:"ud", vidaUtilMeses:24, precioRef:25000 },
  { codigo:"HM-008", nombre:"Cincel plano",               familia:"herr_menor",unidad:"ud", vidaUtilMeses:12, precioRef:12000 },
  { codigo:"HM-009", nombre:"Pala redonda",               familia:"herr_menor",unidad:"ud", vidaUtilMeses:18, precioRef:30000 },
  { codigo:"HM-010", nombre:"Pica",                       familia:"herr_menor",unidad:"ud", vidaUtilMeses:18, precioRef:28000 },
  { codigo:"HM-011", nombre:"Carretilla",                 familia:"herr_menor",unidad:"ud", vidaUtilMeses:18, precioRef:95000 },
  { codigo:"HM-012", nombre:"Pinza pelacables",           familia:"herr_menor",unidad:"ud", vidaUtilMeses:24, precioRef:25000 },
  { codigo:"HM-013", nombre:"Alicate universal",          familia:"herr_menor",unidad:"ud", vidaUtilMeses:24, precioRef:28000 },
  { codigo:"HM-014", nombre:"Llave ajustable 10\"",       familia:"herr_menor",unidad:"ud", vidaUtilMeses:36, precioRef:32000 },
  { codigo:"HM-015", nombre:"Espátula 3\"",               familia:"herr_menor",unidad:"ud", vidaUtilMeses:6,  precioRef:8000 },
  { codigo:"HM-016", nombre:"Rodillo de pintura",         familia:"herr_menor",unidad:"ud", vidaUtilMeses:3,  precioRef:12000 },
  { codigo:"HM-017", nombre:"Brocha 4\"",                 familia:"herr_menor",unidad:"ud", vidaUtilMeses:3,  precioRef:8000 },
  // ── Herramienta mayor ──
  { codigo:"HY-001", nombre:"Taladro percutor",           familia:"herr_mayor",unidad:"ud", vidaUtilMeses:48, precioRef:280000 },
  { codigo:"HY-002", nombre:"Pulidora 7\"",               familia:"herr_mayor",unidad:"ud", vidaUtilMeses:36, precioRef:350000 },
  { codigo:"HY-003", nombre:"Sierra circular",            familia:"herr_mayor",unidad:"ud", vidaUtilMeses:48, precioRef:420000 },
  { codigo:"HY-004", nombre:"Rotomartillo SDS",           familia:"herr_mayor",unidad:"ud", vidaUtilMeses:48, precioRef:650000 },
  { codigo:"HY-005", nombre:"Cortadora de baldosa",       familia:"herr_mayor",unidad:"ud", vidaUtilMeses:36, precioRef:380000 },
  { codigo:"HY-006", nombre:"Compresor de aire",          familia:"herr_mayor",unidad:"ud", vidaUtilMeses:60, precioRef:850000 },
  { codigo:"HY-007", nombre:"Equipo de soldadura",        familia:"herr_mayor",unidad:"ud", vidaUtilMeses:60, precioRef:950000 },
  // ── Equipo de obra ──
  { codigo:"EO-001", nombre:"Andamio certificado",        familia:"equipo_obra",unidad:"cuerpo",vidaUtilMeses:60,precioRef:180000 },
  { codigo:"EO-002", nombre:"Escalera tijera 2m",         familia:"equipo_obra",unidad:"ud", vidaUtilMeses:48, precioRef:180000 },
  { codigo:"EO-003", nombre:"Escalera extensión 4m",      familia:"equipo_obra",unidad:"ud", vidaUtilMeses:48, precioRef:350000 },
  { codigo:"EO-004", nombre:"Mezcladora de concreto",     familia:"equipo_obra",unidad:"ud", vidaUtilMeses:60, precioRef:2500000 },
  { codigo:"EO-005", nombre:"Vibrador de concreto",       familia:"equipo_obra",unidad:"ud", vidaUtilMeses:48, precioRef:1200000 },
  { codigo:"EO-006", nombre:"Pluma grúa manual",          familia:"equipo_obra",unidad:"ud", vidaUtilMeses:60, precioRef:3500000 },
  // ── Equipo de medición ──
  { codigo:"EM-001", nombre:"Flexómetro láser",           familia:"equipo_medic",unidad:"ud",vidaUtilMeses:36, precioRef:250000 },
  { codigo:"EM-002", nombre:"Nivel láser",                familia:"equipo_medic",unidad:"ud",vidaUtilMeses:36, precioRef:480000 },
  { codigo:"EM-003", nombre:"Multímetro digital",         familia:"equipo_medic",unidad:"ud",vidaUtilMeses:36, precioRef:120000 },
  // ── Consumible ──
  { codigo:"CO-001", nombre:"Cinta aislante",             familia:"consumible",unidad:"rollo",vidaUtilMeses:1,precioRef:5000 },
  { codigo:"CO-002", nombre:"Silicona transparente",      familia:"consumible",unidad:"tubo", vidaUtilMeses:1,precioRef:12000 },
  { codigo:"CO-003", nombre:"Disco de corte 7\"",         familia:"consumible",unidad:"ud",   vidaUtilMeses:1,precioRef:8000 },
  { codigo:"CO-004", nombre:"Broca para concreto set",    familia:"consumible",unidad:"jgo",  vidaUtilMeses:3,precioRef:35000 },
  { codigo:"CO-005", nombre:"Lija #80 pliego",            familia:"consumible",unidad:"pliego",vidaUtilMeses:1,precioRef:3000 },
  // ── Seguridad colectiva ──
  { codigo:"SC-001", nombre:"Cinta de demarcación",       familia:"seguridad",unidad:"rollo",vidaUtilMeses:1, precioRef:15000 },
  { codigo:"SC-002", nombre:"Malla de cerramiento",       familia:"seguridad",unidad:"rollo",vidaUtilMeses:6, precioRef:45000 },
  { codigo:"SC-003", nombre:"Señalización obra",          familia:"seguridad",unidad:"jgo",  vidaUtilMeses:12,precioRef:85000 },
  { codigo:"SC-004", nombre:"Extintor multipropósito",    familia:"seguridad",unidad:"ud",   vidaUtilMeses:12,precioRef:65000 },
  { codigo:"SC-005", nombre:"Botiquín tipo A",            familia:"seguridad",unidad:"ud",   vidaUtilMeses:12,precioRef:120000 },
];

// Defaults de EPP por tipo de cargo (cargoId → códigos del catálogo)
const EPP_DEFAULTS_POR_CARGO = {
  peon:      ["EPP-001","EPP-002","EPP-003","EPP-004","EPP-005","EPP-006","DOT-001"],
  ayudante:  ["EPP-001","EPP-002","EPP-003","EPP-004","EPP-005","DOT-001"],
  oficial2:  ["EPP-001","EPP-002","EPP-003","EPP-004","EPP-005","EPP-006","DOT-001"],
  oficial1:  ["EPP-001","EPP-002","EPP-003","EPP-004","EPP-005","EPP-006","DOT-001"],
  encargado: ["EPP-001","EPP-002","EPP-004","EPP-005","DOT-002","DOT-003"],
  residente: ["EPP-001","EPP-002","EPP-005","DOT-002"],
  jefe_obra: ["EPP-001","EPP-002","EPP-005","DOT-002"],
  arq:       ["EPP-001","EPP-005"],
  ing:       ["EPP-001","EPP-002","EPP-005","DOT-002"],
};

// Defaults de herramientas por tipo de equipo de biblioteca
const HERR_DEFAULTS_POR_EQUIPO = {
  eq_elec_basico: ["HY-001","HM-002","HM-012","HM-013","EM-003","CO-001","EO-002"],
  eq_obra_civil:  ["HM-009","HM-010","HM-011","HM-004","HM-003","HM-007","HM-008","HM-005","EO-003","EO-001"],
  eq_diseno_int:  ["EM-001","EM-002","HM-003"],
};

const FAMILIA_LABELS = { epp:"EPP", dotacion:"Dotación", herr_menor:"Herram. menor", herr_mayor:"Herram. mayor",
  equipo_obra:"Equipo obra", equipo_medic:"Medición", consumible:"Consumible", seguridad:"Seguridad" };
const FAMILIA_ICONS_CAT = { epp:"🦺", dotacion:"👕", herr_menor:"🔨", herr_mayor:"⚙️", equipo_obra:"🏗️", equipo_medic:"📐", consumible:"📦", seguridad:"🚧" };

const getRecursoByCodigo = (codigo) => CATALOGO_RECURSOS.find(r => r.codigo === codigo);

/* ─── CO/ES TARIFAS MO (precargadas 2025) ───────────────────── */
const TARIFAS_MO = {
  CO: {
    categorias: [
      { id:"peon",      label:"Peón de obra",           salario:1423500, factor:1.618, horasMes:192 },
      { id:"oficial2",  label:"Oficial 2ª",              salario:1750000, factor:1.618, horasMes:192 },
      { id:"oficial1",  label:"Oficial 1ª",              salario:2100000, factor:1.618, horasMes:192 },
      { id:"encargado", label:"Encargado de obra",       salario:2800000, factor:1.618, horasMes:192 },
      { id:"residente", label:"Residente / Inspector",   salario:4200000, factor:1.618, horasMes:192 },
      { id:"arq",       label:"Arquitecto",              salario:3500000, factor:1.618, horasMes:192 },
      { id:"ing",       label:"Ingeniero",               salario:4500000, factor:1.618, horasMes:192 },
    ],
  },
  ES: {
    categorias: [
      { id:"peon",      label:"Peón ordinario",          salarioAnual:20800, ss:0.299, horasAnio:1736 },
      { id:"ayudante",  label:"Ayudante",                salarioAnual:22400, ss:0.299, horasAnio:1736 },
      { id:"oficial2",  label:"Oficial 2ª",              salarioAnual:24600, ss:0.299, horasAnio:1736 },
      { id:"oficial1",  label:"Oficial 1ª",              salarioAnual:27200, ss:0.299, horasAnio:1736 },
      { id:"encargado", label:"Encargado",               salarioAnual:32000, ss:0.299, horasAnio:1736 },
      { id:"jefe_obra", label:"Jefe de obra",            salarioAnual:45000, ss:0.299, horasAnio:1736 },
      { id:"arq",       label:"Arquitecto/Aparejador",   salarioAnual:40000, ss:0.299, horasAnio:1736 },
    ],
  },
};

const costHoraCO = (cat) =>
  (cat.salario * cat.factor) / cat.horasMes;

const costHoraES = (cat) =>
  (cat.salarioAnual * (1 + cat.ss)) / cat.horasAnio;

const costHoraCat = (catId, pais) => {
  const cats = TARIFAS_MO[pais]?.categorias || [];
  const cat = cats.find(c => c.id === catId);
  if (!cat) return 0;
  return pais === "CO" ? costHoraCO(cat) : costHoraES(cat);
};

/* ─── CALC APU POR LINEA ─────────────────────────────────────── */
const calcLineaAPU = (linea, oferta) => {
  const pais    = oferta.pais || "CO";
  const moneda  = pais === "CO" ? "COP" : "EUR";
  const apu     = linea.apu || {};
  const tipo    = linea.tipo; // capítulo tipo

  // Modo Diseño
  if (tipo === "diseno_arq" || tipo === "diseno_int") {
    const estudios = apu.estudios || [];
    const moItems  = apu.mo       || [];
    const subItems = apu.subcontratas || [];
    const horasTotal = estudios.reduce((s, e) => s + (e.horas || 0), 0);
    const costoH = oferta.apuModoHora === "MANUAL"
      ? (oferta.apuCostoHoraManual || 0)
      : (() => {
          const hAnio = (oferta.apuHDia||8)*(oferta.apuDiasSem||5)*(oferta.apuSemanas||52)*(oferta.apuPctProductivas||0.6);
          const estr  = (oferta.apuSalarioAnual||0)*(1+(oferta.apuPrestaciones||0.65))
            + (oferta.apuLicencias||0) + (oferta.apuEquipos||0) + (oferta.apuAccesorios||0);
          return hAnio > 0 ? estr / hAnio : 0;
        })();
    const cdDis = horasTotal * costoH;
    const cdMO  = moItems.reduce((s,r) => s + (r.horas||0)*costHoraCat(r.catId, pais), 0);
    const cdSub = subItems.reduce((s,r) => s + (r.importe||0), 0);
    const CD = cdDis + cdMO + cdSub;
    return { CD, cdDis, cdMO, cdSub, horasTotal, costoH, moneda };
  }

  // Modo Ejecución
  const cuadrillas  = apu.cuadrillas  || [];
  const materiales  = apu.materiales  || [];
  const equipos     = apu.equipos     || [];
  const subcontratas = apu.subcontratas || [];

  // equiposUsados references biblioteca — compute inline
  const equiposUsados = apu.equiposUsados || [];
  const cdMO = equiposUsados.reduce((s, eu) => {
    // Load from storage biblioteca
    let bibEq = null;
    try {
      const bib = JSON.parse(store.get("hab:crm:equipos")?.value || "null") || EQUIPOS_DEFAULTS;
      bibEq = bib.find(e => e.id === eu.eqId);
    } catch {}
    if (!bibEq) return s;
    const rend = eu.rendimientoOverride ?? bibEq.rendimiento;
    const hTotal = rend * (linea.cantidad || 1);
    return s + bibEq.cargos.reduce((cs, cargo) => {
      const ch = costHoraCat(cargo.catId, pais);
      return cs + ch * hTotal * (cargo.cantidad || 1);
    }, 0) + (bibEq.equiposCosto || 0) + (bibEq.licenciasCosto || 0);
  }, 0);
  const cdMat = materiales.reduce((s, m) => s + (m.cantidad||0)*(m.precio||0), 0);
  const cdEq  = equipos.reduce((s, e) => s + (e.cantidad||0)*(e.precio||0), 0);
  const cdSub = subcontratas.reduce((s, r) => s + (r.importe||0), 0);
  const CD = cdMO + cdMat + cdEq + cdSub;
  return { CD, cdMO, cdMat, cdEq, cdSub, moneda };
};

/* ─── BIBLIOTECA DE EQUIPOS (global, persistente) ───────────── */
const EQUIPOS_DEFAULTS = [
  {
    id: "eq_elec_basico", nombre: "Equipo eléctrico básico",
    cargos: [
      { id: "c1", catId: "oficial1",  cantidad: 1 },
      { id: "c2", catId: "ayudante",  cantidad: 1 },
    ],
    equiposCosto: 15000, licenciasCosto: 0,
    rendimiento: 0.05,
  },
  {
    id: "eq_obra_civil", nombre: "Equipo obra civil",
    cargos: [
      { id: "c3", catId: "oficial1",  cantidad: 1 },
      { id: "c4", catId: "peon",      cantidad: 2 },
    ],
    equiposCosto: 25000, licenciasCosto: 0,
    rendimiento: 0.08,
  },
  {
    id: "eq_diseno_int", nombre: "Equipo diseño",
    cargos: [
      { id: "c5", catId: "arq",       cantidad: 1 },
    ],
    equiposCosto: 0, licenciasCosto: 8000,
    rendimiento: 1,
  },
];

function useEquiposBiblioteca() {
  const [equipos, setEquipos] = useState(() => {
    try {
      const s = store.get("hab:crm:equipos");
      const loaded = s ? JSON.parse(s.value) : null;
      return loaded?.length ? loaded : EQUIPOS_DEFAULTS;
    } catch { return EQUIPOS_DEFAULTS; }
  });
  const save = (list) => {
    setEquipos(list);
    try { store.set("hab:crm:equipos", JSON.stringify(list)); } catch {}
  };
  return [equipos, save];
}

/* ─── MODAL GESTIÓN BIBLIOTECA DE EQUIPOS ───────────────────── */
function EquiposBibliotecaModal({ pais, onClose }) {
  const [equipos, saveEquipos] = useEquiposBiblioteca();
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(null);
  const catsMO = TARIFAS_MO[pais]?.categorias || [];
  const uid2 = () => Math.random().toString(36).slice(2, 9);
  const fmtN3 = (n) => n != null && !isNaN(n)
    ? new Intl.NumberFormat("es-ES", { minimumFractionDigits:0, maximumFractionDigits:0 }).format(n)
    : "0";
  const moneda = pais === "CO" ? "COP" : "EUR";

  const defForm = () => ({
    id: uid2(), nombre: "", rendimiento: 0.1,
    cargos: [{ id: uid2(), catId: catsMO[0]?.id || "", cantidad: 1 }],
    equiposCosto: 0, licenciasCosto: 0,
  });

  const calcCostoEquipo = (eq) => {
    return eq.cargos.reduce((s, c) => {
      const ch = costHoraCat(c.catId, pais);
      return s + ch * eq.rendimiento * (c.cantidad || 1);
    }, 0) + (eq.equiposCosto || 0) + (eq.licenciasCosto || 0);
  };

  const inp = (extra={}) => ({
    border:"1px solid #E0E0E0", borderRadius:4, padding:"4px 7px",
    fontSize:12, fontFamily:"'DM Sans',sans-serif", ...extra
  });

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.55)", zIndex:1100,
      display:"flex", alignItems:"flex-start", justifyContent:"center",
      overflowY:"auto", padding:"20px 16px" }}>
      <div style={{ background:"#fff", borderRadius:10, width:"100%", maxWidth:680,
        boxShadow:"0 20px 60px rgba(0,0,0,.2)" }}>
        <div style={{ padding:"14px 18px", borderBottom:"1px solid #E0E0E0",
          display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:11, fontWeight:600, color:"#888", textTransform:"uppercase",
              letterSpacing:0.5 }}>Biblioteca global</div>
            <div style={{ fontSize:16, fontWeight:700, color:"#111" }}>Equipos de trabajo</div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={() => { setForm(defForm()); setEditId(null); }}
              style={{ padding:"6px 12px", background:"#111111", color:"#fff", border:"none",
                borderRadius:6, cursor:"pointer", fontSize:12, fontWeight:600,
                display:"flex", alignItems:"center", gap:4 }}>
              <Plus size={12}/> Nuevo equipo
            </button>
            <button onClick={onClose}
              style={{ background:"none", border:"none", cursor:"pointer", color:"#888" }}>
              <X size={20}/>
            </button>
          </div>
        </div>

        <div style={{ padding:"14px 18px" }}>
          {/* Form nuevo/editar equipo */}
          {form && (
            <div style={{ border:"1px solid #111111", borderRadius:8, padding:14, marginBottom:16,
              background:"#F0FAF5" }}>
              <div style={{ fontSize:12, fontWeight:700, color:"#111111", marginBottom:10 }}>
                {editId ? "Editando equipo" : "Nuevo equipo"}
              </div>
              <div style={{ display:"flex", gap:10, marginBottom:10 }}>
                <div style={{ flex:2 }}>
                  <div style={{ fontSize:10, fontWeight:600, color:"#888", textTransform:"uppercase",
                    letterSpacing:0.5, marginBottom:3 }}>Nombre del equipo</div>
                  <input value={form.nombre}
                    onChange={e => setForm(f => ({...f, nombre: e.target.value}))}
                    placeholder="Ej: Equipo eléctrico básico"
                    style={{ ...inp(), width:"100%", fontSize:13 }}/>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:10, fontWeight:600, color:"#888", textTransform:"uppercase",
                    letterSpacing:0.5, marginBottom:3 }}>Rendimiento (h/ud)</div>
                  <input type="number" min="0" step="0.01" value={form.rendimiento}
                    onChange={e => setForm(f => ({...f, rendimiento: parseFloat(e.target.value)||0}))}
                    style={{ ...inp(), width:"100%", textAlign:"center" }}/>
                </div>
              </div>

              {/* Cargos */}
              <div style={{ fontSize:10, fontWeight:600, color:"#888", textTransform:"uppercase",
                letterSpacing:0.5, marginBottom:5 }}>Cargos</div>
              {form.cargos.map((c, ci) => (
                <div key={c.id} style={{ display:"flex", gap:8, marginBottom:6, alignItems:"center" }}>
                  <select value={c.catId}
                    onChange={e => setForm(f => ({...f, cargos: f.cargos.map((x, xi) => xi===ci ? {...x, catId:e.target.value} : x)}))}
                    style={{ ...inp(), flex:2 }}>
                    {catsMO.map(cat => <option key={cat.id} value={cat.id}>{cat.label}</option>)}
                  </select>
                  <div style={{ display:"flex", alignItems:"center", gap:4, flex:1 }}>
                    <span style={{ fontSize:11, color:"#888" }}>×</span>
                    <input type="number" min="1" value={c.cantidad}
                      onChange={e => setForm(f => ({...f, cargos: f.cargos.map((x, xi) => xi===ci ? {...x, cantidad:parseInt(e.target.value)||1} : x)}))}
                      style={{ ...inp(), width:50, textAlign:"center" }}/>
                  </div>
                  <span style={{ fontSize:11, color:"#888", fontFamily:"'DM Mono',monospace", flex:1 }}>
                    {fmtN3(costHoraCat(c.catId, pais))} {moneda}/h
                  </span>
                  <button onClick={() => setForm(f => ({...f, cargos: f.cargos.filter((_, xi) => xi!==ci)}))}
                    style={{ background:"none", border:"none", cursor:"pointer", color:"#B91C1C" }}>
                    <Trash2 size={12}/>
                  </button>
                </div>
              ))}
              <button onClick={() => setForm(f => ({...f, cargos: [...f.cargos, {id:uid2(), catId:catsMO[0]?.id||"", cantidad:1}]}))}
                style={{ fontSize:11, color:"#3B3B3B", background:"none", border:"none", cursor:"pointer",
                  display:"flex", alignItems:"center", gap:3, marginBottom:10 }}>
                <Plus size={11}/> Añadir cargo
              </button>

              <div style={{ display:"flex", gap:10, marginBottom:10 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:10, fontWeight:600, color:"#888", textTransform:"uppercase",
                    letterSpacing:0.5, marginBottom:3 }}>Equipos/herramientas</div>
                  <input type="number" min="0" value={form.equiposCosto}
                    onChange={e => setForm(f => ({...f, equiposCosto: parseFloat(e.target.value)||0}))}
                    style={{ ...inp(), width:"100%" }}/>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:10, fontWeight:600, color:"#888", textTransform:"uppercase",
                    letterSpacing:0.5, marginBottom:3 }}>Licencias/medios</div>
                  <input type="number" min="0" value={form.licenciasCosto}
                    onChange={e => setForm(f => ({...f, licenciasCosto: parseFloat(e.target.value)||0}))}
                    style={{ ...inp(), width:"100%" }}/>
                </div>
              </div>

              <div style={{ fontSize:12, color:"#111111", fontWeight:600, marginBottom:10 }}>
                Costo/ud estimado: {fmtN3(calcCostoEquipo(form))} {moneda}
              </div>

              <div style={{ display:"flex", gap:8 }}>
                <button onClick={() => {
                  if (!form.nombre) { alert("Pon un nombre al equipo"); return; }
                  if (editId) {
                    saveEquipos(equipos.map(e => e.id === editId ? {...form, id:editId} : e));
                  } else {
                    saveEquipos([...equipos, form]);
                  }
                  setForm(null); setEditId(null);
                }} style={{ padding:"6px 14px", background:"#111111", color:"#fff", border:"none",
                  borderRadius:6, cursor:"pointer", fontSize:12, fontWeight:600,
                  display:"flex", alignItems:"center", gap:4 }}>
                  <Check size={12}/> Guardar
                </button>
                <button onClick={() => { setForm(null); setEditId(null); }}
                  style={{ padding:"6px 14px", border:"1px solid #E0E0E0", background:"#fff",
                    borderRadius:6, cursor:"pointer", fontSize:12 }}>
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Lista equipos */}
          {equipos.map((eq, i) => (
            <div key={eq.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0",
              borderBottom:"1px solid #E0E0E0" }}>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:13, color:"#111" }}>{eq.nombre}</div>
                <div style={{ fontSize:11, color:"#888", marginTop:2 }}>
                  {eq.cargos.map(c => {
                    const cat = TARIFAS_MO[pais]?.categorias?.find(x=>x.id===c.catId);
                    return `${c.cantidad}× ${cat?.label||c.catId}`;
                  }).join(" · ")}
                  {eq.equiposCosto > 0 ? ` · +${fmtN3(eq.equiposCosto)} eq.` : ""}
                  {eq.licenciasCosto > 0 ? ` · +${fmtN3(eq.licenciasCosto)} lic.` : ""}
                </div>
              </div>
              <div style={{ fontFamily:"'DM Mono',monospace", fontSize:13, fontWeight:600, color:"#111111",
                minWidth:100, textAlign:"right" }}>
                {fmtN3(calcCostoEquipo(eq))}<br/>
                <span style={{ fontSize:10, fontWeight:400, color:"#888" }}>{moneda}/ud · rend {eq.rendimiento}h</span>
              </div>
              <div style={{ display:"flex", gap:4 }}>
                <button onClick={() => { setForm({...eq}); setEditId(eq.id); }}
                  style={{ background:"none", border:"1px solid #E0E0E0", borderRadius:4,
                    cursor:"pointer", padding:"4px 8px", fontSize:11, color:"#555" }}>
                  Editar
                </button>
                <button onClick={() => { if(window.confirm("¿Eliminar este equipo?")) saveEquipos(equipos.filter(x=>x.id!==eq.id)); }}
                  style={{ background:"none", border:"none", cursor:"pointer", color:"#B91C1C" }}>
                  <Trash2 size={13}/>
                </button>
              </div>
            </div>
          ))}

          {equipos.length === 0 && (
            <div style={{ textAlign:"center", padding:"24px", color:"#888", fontSize:13 }}>
              Sin equipos. Crea el primero.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── EQUIPOS SELECTOR (dentro del APU modal, modo ejecución) ── */
function EquiposSelector({ pais, linea, apu, setApu }) {
  const [biblioteca, saveBiblioteca] = useEquiposBiblioteca();
  const [showBiblioteca, setShowBiblioteca] = useState(false);
  const moneda = pais === "CO" ? "COP" : "EUR";
  const fmtN = (n) => n != null ? new Intl.NumberFormat("es-ES",
    { minimumFractionDigits:0, maximumFractionDigits:0 }).format(n) : "0";

  const equiposUsados = apu.equiposUsados || [];

  const addEquipo = (eqId) => {
    if (equiposUsados.find(e => e.eqId === eqId)) return;
    const eq = biblioteca.find(e => e.id === eqId);
    if (!eq) return;
    setApu(a => ({ ...a, equiposUsados: [...(a.equiposUsados||[]),
      { id: Math.random().toString(36).slice(2,8), eqId, rendimientoOverride: null }
    ]}));
  };

  const removeEquipo = (id) =>
    setApu(a => ({ ...a, equiposUsados: (a.equiposUsados||[]).filter(e => e.id !== id) }));

  const updEquipo = (id, k, v) =>
    setApu(a => ({ ...a, equiposUsados: (a.equiposUsados||[]).map(e =>
      e.id === id ? { ...e, [k]: v } : e
    )}));

  const calcCostoEquipo = (eq, rend) => {
    const r = rend ?? eq.rendimiento;
    return eq.cargos.reduce((s, c) => {
      const ch = costHoraCat(c.catId, pais);
      return s + ch * r * (c.cantidad || 1);
    }, 0) + (eq.equiposCosto || 0) + (eq.licenciasCosto || 0);
  };

  const totalMO = equiposUsados.reduce((s, eu) => {
    const eq = biblioteca.find(e => e.id === eu.eqId);
    if (!eq) return s;
    const rend = eu.rendimientoOverride ?? eq.rendimiento;
    return s + calcCostoEquipo(eq, rend) * (linea.cantidad || 1);
  }, 0);

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
        marginBottom:8, paddingBottom:4, borderBottom:"1px solid #E0E0E0" }}>
        <div style={{ fontSize:11, fontWeight:700, color:"#888", textTransform:"uppercase",
          letterSpacing:0.5 }}>Equipos de trabajo (MO)</div>
        <div style={{ display:"flex", gap:6 }}>
          <select defaultValue=""
            onChange={e => { if (e.target.value) { addEquipo(e.target.value); e.target.value=""; }}}
            style={{ border:"1px solid #3B3B3B", borderRadius:5, padding:"3px 8px",
              fontSize:12, color:"#3B3B3B", cursor:"pointer",
              fontFamily:"'DM Sans',sans-serif", background:"#F0F0F0" }}>
            <option value="">+ Añadir equipo de biblioteca…</option>
            {biblioteca.map(eq => (
              <option key={eq.id} value={eq.id}>
                {eq.nombre} · {fmtN(calcCostoEquipo(eq, null))}{moneda}/ud
              </option>
            ))}
          </select>
          <button onClick={() => setShowBiblioteca(true)}
            style={{ border:"1px solid #E0E0E0", borderRadius:5, padding:"3px 8px",
              fontSize:11, cursor:"pointer", background:"#fff", color:"#555",
              fontFamily:"'DM Sans',sans-serif" }}>
            Gestionar biblioteca
          </button>
        </div>
      </div>

      {equiposUsados.length === 0 && (
        <div style={{ color:"#BBB", fontSize:12, padding:"8px 0", textAlign:"center" }}>
          Selecciona equipos de la biblioteca para calcular MO
        </div>
      )}

      {equiposUsados.map(eu => {
        const eq = biblioteca.find(e => e.id === eu.eqId);
        if (!eq) return null;
        const rend = eu.rendimientoOverride ?? eq.rendimiento;
        const costoUd = calcCostoEquipo(eq, rend);
        const costoTotal = costoUd * (linea.cantidad || 1);
        const catsMO = TARIFAS_MO[pais]?.categorias || [];
        return (
          <div key={eu.id} style={{ border:"1px solid #E0E0E0", borderRadius:8,
            marginBottom:8, overflow:"hidden" }}>
            <div style={{ background:"#F5F4F1", padding:"7px 12px",
              display:"flex", alignItems:"center", gap:10, borderBottom:"1px solid #E0E0E0" }}>
              <div style={{ fontWeight:600, fontSize:13, color:"#111", flex:1 }}>{eq.nombre}</div>
              <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:"#555" }}>
                <span>Rendimiento:</span>
                <input type="number" min="0" step="0.001" value={rend}
                  onChange={e => updEquipo(eu.id, "rendimientoOverride", parseFloat(e.target.value)||0)}
                  style={{ width:65, border:"1px solid #E0E0E0", borderRadius:4,
                    padding:"3px 5px", fontSize:12, textAlign:"center",
                    fontFamily:"'DM Sans',sans-serif" }}/>
                <span>h/{linea.unidad||"ud"}</span>
                <span style={{ fontSize:10, color:"#BBB", marginLeft:2 }}>
                  (bib: {eq.rendimiento}h)
                </span>
              </div>
              <button onClick={() => removeEquipo(eu.id)}
                style={{ background:"none", border:"none", cursor:"pointer", color:"#B91C1C" }}>
                <Trash2 size={13}/>
              </button>
            </div>
            <div style={{ padding:"8px 12px", fontSize:12, color:"#555" }}>
              {eq.cargos.map((c, ci) => {
                const cat = catsMO.find(x => x.id === c.catId);
                const ch = costHoraCat(c.catId, pais);
                return (
                  <span key={ci} style={{ marginRight:12 }}>
                    {c.cantidad}× {cat?.label||c.catId} ({fmtN(ch)}{moneda}/h)
                  </span>
                );
              })}
              {eq.equiposCosto > 0 && <span style={{ marginRight:12 }}>+{fmtN(eq.equiposCosto)} eq.</span>}
              {eq.licenciasCosto > 0 && <span>+{fmtN(eq.licenciasCosto)} lic.</span>}
              <span style={{ float:"right", fontWeight:700, color:"#111111",
                fontFamily:"'DM Mono',monospace" }}>
                {fmtN(costoUd)}/ud · {fmtN(costoTotal)} total
              </span>
            </div>
          </div>
        );
      })}

      {equiposUsados.length > 0 && (
        <div style={{ textAlign:"right", fontSize:13, fontWeight:600, color:"#111111",
          fontFamily:"'DM Mono',monospace", marginBottom:8 }}>
          Total MO: {fmtN(totalMO)} {moneda}
        </div>
      )}

      {showBiblioteca && (
        <EquiposBibliotecaModal pais={pais} onClose={() => setShowBiblioteca(false)}/>
      )}
    </div>
  );
}

/* ─── BORRADOR: APU MODAL (adapta por tipo) ─────────────────── */
function APULineaModal({ linea, oferta, onSave, onClose }) {
  const pais   = oferta.pais || "CO";
  const moneda = pais === "CO" ? "COP" : "EUR";
  const tipo   = linea.tipo;
  const tInfo  = TIPOS_LINEA.find(t => t.id === tipo);
  const esModoDiseno = tInfo?.modo === "diseno";

  const [apu, setApu] = useState(linea.apu || {
    estudios: [], mo: [], subcontratas: [],
    equiposUsados: [], materiales: [], equipos: [],
  });

  const res = calcLineaAPU({ ...linea, apu }, oferta);
  const catsMO = TARIFAS_MO[pais]?.categorias || [];

  // ── Helpers mutación
  const updArr = (key, id, k, v) =>
    setApu(a => ({ ...a, [key]: a[key].map(r => r.id === id ? { ...r, [k]: v } : r) }));
  const delArr = (key, id) =>
    setApu(a => ({ ...a, [key]: a[key].filter(r => r.id !== id) }));
  const addItem = (key, obj) =>
    setApu(a => ({ ...a, [key]: [...(a[key]||[]), { id: uid(), ...obj }] }));

  // ── Cargos dentro de cuadrilla
  const updCargo = (cqId, cargoId, k, v) =>
    setApu(a => ({ ...a, cuadrillas: a.cuadrillas.map(cq =>
      cq.id === cqId ? { ...cq, cargos: cq.cargos.map(c => c.id === cargoId ? { ...c, [k]: v } : c) } : cq
    )}));
  const delCargo = (cqId, cargoId) =>
    setApu(a => ({ ...a, cuadrillas: a.cuadrillas.map(cq =>
      cq.id === cqId ? { ...cq, cargos: cq.cargos.filter(c => c.id !== cargoId) } : cq
    )}));
  const addCargo = (cqId) =>
    setApu(a => ({ ...a, cuadrillas: a.cuadrillas.map(cq =>
      cq.id === cqId ? { ...cq, cargos: [...cq.cargos, { id: uid(), catId: catsMO[0]?.id||"", cantidad: 1 }] } : cq
    )}));

  const fmtN2 = (n, d=0) => n != null && !isNaN(n)
    ? new Intl.NumberFormat("es-ES", { minimumFractionDigits: d, maximumFractionDigits: d }).format(n)
    : "0";

  const thS = { padding:"5px 8px", fontSize:10, fontWeight:700, color:"#888",
    textTransform:"uppercase", letterSpacing:0.5, background:"#F5F4F1",
    borderBottom:"1px solid #E0E0E0", textAlign:"left" };
  const tdS = { padding:"5px 6px", borderBottom:"1px solid #E0E0E0", fontSize:13, verticalAlign:"middle" };
  const inp = (extra={}) => ({ border:"1px solid #E0E0E0", borderRadius:4,
    padding:"4px 6px", fontSize:12, fontFamily:"'DM Sans',sans-serif", ...extra });

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.55)", zIndex:999,
      display:"flex", alignItems:"flex-start", justifyContent:"center",
      overflowY:"auto", padding:"20px 16px" }}>
      <div style={{ background:"#fff", borderRadius:10, width:"100%", maxWidth:820,
        boxShadow:"0 20px 60px rgba(0,0,0,.2)" }}>

        {/* Header modal */}
        <div style={{ padding:"14px 18px", borderBottom:"1px solid #E0E0E0",
          display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:11, fontWeight:600, color:"#888", textTransform:"uppercase",
              letterSpacing:0.5 }}>APU — {tInfo?.icon} {tInfo?.label}</div>
            <div style={{ fontSize:15, fontWeight:700, color:"#111", marginTop:2 }}>
              {linea.descripcion || "Partida sin nombre"} · {linea.cantidad} {linea.unidad}
            </div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"#888" }}>
            <X size={20}/>
          </button>
        </div>

        <div style={{ padding:"14px 18px" }}>

          {/* ══ MODO DISEÑO ══ */}
          {esModoDiseno && (<>
            {/* Estudios/Planos - biblioteca */}
            <div style={{ fontSize:11, fontWeight:700, color:"#888", textTransform:"uppercase",
              letterSpacing:0.5, marginBottom:8, paddingBottom:4, borderBottom:"1px solid #E0E0E0" }}>
              Estudios / Entregables
            </div>
            <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:8 }}>
              <thead>
                <tr>
                  <th style={thS}>Entregable</th>
                  <th style={{ ...thS, textAlign:"center", width:80 }}>Horas</th>
                  <th style={{ ...thS, textAlign:"center", width:60 }}>Incl.</th>
                  <th style={thS}/>
                </tr>
              </thead>
              <tbody>
                {(apu.estudios||[]).map(e => (
                  <tr key={e.id}>
                    <td style={tdS}>
                      <select value={e.estudioId} onChange={ev => {
                        const ref = ESTUDIOS_DISENO.find(s => s.id === ev.target.value);
                        updArr("estudios", e.id, "estudioId", ev.target.value);
                        if (ref) updArr("estudios", e.id, "nombre", ref.nombre);
                        if (ref && e.tipo !== "subcontrata") updArr("estudios", e.id, "horas", ref.horas);
                        updArr("estudios", e.id, "tipo", ref?.tipo || "plano");
                      }} style={{ ...inp(), width:"100%" }}>
                        <option value="">– Seleccionar –</option>
                        {["plano","render","doc","tramite","subcontrata"].map(grupo => (
                          <optgroup key={grupo} label={grupo.toUpperCase()}>
                            {ESTUDIOS_DISENO.filter(s => s.tipo === grupo).map(s => (
                              <option key={s.id} value={s.id}>{s.nombre}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </td>
                    <td style={tdS}>
                      {e.tipo === "subcontrata"
                        ? <input type="number" value={e.importe||0}
                            onChange={ev => updArr("estudios", e.id, "importe", parseFloat(ev.target.value)||0)}
                            placeholder="importe" style={{ ...inp(), width:90, textAlign:"right" }}/>
                        : <input type="number" value={e.horas||0}
                            onChange={ev => updArr("estudios", e.id, "horas", parseFloat(ev.target.value)||0)}
                            style={{ ...inp(), width:60, textAlign:"center" }}/>
                      }
                    </td>
                    <td style={{ ...tdS, textAlign:"center" }}>
                      {e.tipo === "subcontrata"
                        ? <span style={{ fontSize:11, color:"#888" }}>sub</span>
                        : <span style={{ fontFamily:"'DM Mono',monospace", fontSize:12 }}>
                            {fmtN2((e.horas||0) * res.costoH, 0)}
                          </span>}
                    </td>
                    <td style={tdS}>
                      <button onClick={() => delArr("estudios", e.id)}
                        style={{ background:"none", border:"none", cursor:"pointer", color:"#B91C1C" }}>
                        <Trash2 size={12}/>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={() => addItem("estudios", { estudioId:"", nombre:"", horas:0, tipo:"plano", importe:0 })}
              style={{ fontSize:12, color:"#3B3B3B", background:"none", border:"none", cursor:"pointer",
                display:"flex", alignItems:"center", gap:4, marginBottom:12 }}>
              <Plus size={12}/> Añadir entregable
            </button>
            {/* Costo/hora source info */}
            <div style={{ background:"#F5F4F1", borderRadius:6, padding:"8px 12px",
              fontSize:11, color:"#555", marginBottom:8, display:"flex",
              alignItems:"center", gap:6, flexWrap:"wrap" }}>
              <span style={{ fontWeight:600 }}>Costo/hora:</span>
              {oferta.apuModoHora === "MANUAL"
                ? <span style={{ fontFamily:"'DM Mono',monospace", color:"#3B3B3B" }}>
                    Manual: {fmtN2(oferta.apuCostoHoraManual||0,0)} {moneda}/h
                  </span>
                : <span style={{ fontFamily:"'DM Mono',monospace", color:"#3B3B3B" }}>
                    {fmtN2(res.costoH||0,0)} {moneda}/h
                    <span style={{ color:"#888", fontFamily:"'DM Sans',sans-serif" }}>
                      &nbsp;(salario {(oferta.apuSalarioAnual||0).toLocaleString("es-CO")} +
                      {((oferta.apuPrestaciones||0)*100).toFixed(0)}% SS ÷
                      {fmtN2((oferta.apuHDia||8)*(oferta.apuDiasSem||5)*(oferta.apuSemanas||52)*(oferta.apuPctProductivas||0.6),0)}h prod.)
                    </span>
                  </span>
              }
              <span style={{ color:"#BBB", marginLeft:"auto", fontSize:10 }}>
                Configurable en tab APU Diseño (oferta)
              </span>
            </div>
            <div style={{ textAlign:"right", fontSize:13, fontWeight:600, color:"#111", marginBottom:12 }}>
              Total horas: <span style={{ fontFamily:"'DM Mono',monospace" }}>{fmtN2(res.horasTotal||0,1)} h</span>
              &nbsp;·&nbsp;Subtotal MO diseño: <span style={{ fontFamily:"'DM Mono',monospace", color:"#111111" }}>{fmtN2(res.cdDis||0,0)} {moneda}</span>
            </div>
          </>)}

          {/* ══ MODO EJECUCIÓN — EQUIPOS + MATERIALES ══ */}
          {!esModoDiseno && (<>
            <EquiposSelector pais={pais} linea={linea} apu={apu} setApu={setApu} />

            {/* Materiales */}
            <div style={{ fontSize:11, fontWeight:700, color:"#888", textTransform:"uppercase",
              letterSpacing:0.5, margin:"12px 0 8px", paddingBottom:4, borderBottom:"1px solid #E0E0E0" }}>
              Materiales
            </div>
            <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:6 }}>
              <thead><tr>
                <th style={{ ...thS, width:90 }}>Código</th>
                <th style={{ ...thS, width:"35%" }}>Descripción</th>
                <th style={thS}>Unidad</th>
                <th style={{ ...thS, textAlign:"center", width:80 }}>Cant.</th>
                <th style={{ ...thS, textAlign:"right", width:110 }}>Precio unit.</th>
                <th style={{ ...thS, textAlign:"right", width:100 }}>Subtotal</th>
                <th style={thS}/>
              </tr></thead>
              <tbody>
                {(apu.materiales||[]).map(m => (
                  <tr key={m.id}>
                    <td style={tdS}>
                      <select value={m.codigoCat||""} onChange={e => {
                        const cod = e.target.value;
                        const rec = CATALOGO_RECURSOS.find(r => r.codigo === cod);
                        if (rec) {
                          updArr("materiales",m.id,"codigoCat",cod);
                          updArr("materiales",m.id,"descripcion",rec.nombre);
                          updArr("materiales",m.id,"unidad",rec.unidad||"ud");
                          if (!m.precio && rec.precioRef) updArr("materiales",m.id,"precio",rec.precioRef);
                        } else {
                          updArr("materiales",m.id,"codigoCat","");
                        }
                      }} style={{ ...inp(), width:"100%", fontSize:10, fontFamily:"'DM Mono',monospace", padding:"3px 4px" }}>
                        <option value="">—</option>
                        {CATALOGO_RECURSOS.filter(r=>["consumible","seguridad"].includes(r.familia)).map(r=>
                          <option key={r.codigo} value={r.codigo}>{r.codigo}</option>
                        )}
                      </select>
                    </td>
                    <td style={tdS}><input value={m.descripcion||""} onChange={e => updArr("materiales",m.id,"descripcion",e.target.value)} style={{ ...inp(), width:"100%" }} placeholder="Material..."/></td>
                    <td style={tdS}><select value={m.unidad||"ud"} onChange={e => updArr("materiales",m.id,"unidad",e.target.value)} style={inp()}>
                      {["m²","m³","ml","kg","ton","ud","gl","l","m","rollo","pliego","jgo","caja","tubo","par"].map(u=><option key={u}>{u}</option>)}
                    </select></td>
                    <td style={tdS}><input type="number" min="0" step="0.001" value={m.cantidad||0} onChange={e => updArr("materiales",m.id,"cantidad",parseFloat(e.target.value)||0)} style={{ ...inp(), width:70, textAlign:"center" }}/></td>
                    <td style={tdS}><input type="number" min="0" value={m.precio||0} onChange={e => updArr("materiales",m.id,"precio",parseFloat(e.target.value)||0)} style={{ ...inp(), width:100, textAlign:"right" }}/></td>
                    <td style={{ ...tdS, textAlign:"right", fontFamily:"'DM Mono',monospace", fontSize:12, fontWeight:600 }}>{fmtN2((m.cantidad||0)*(m.precio||0),0)}</td>
                    <td style={tdS}><button onClick={() => delArr("materiales",m.id)} style={{ background:"none",border:"none",cursor:"pointer",color:"#B91C1C" }}><Trash2 size={11}/></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={() => addItem("materiales", { codigoCat:"", descripcion:"", unidad:"ud", cantidad:0, precio:0 })}
              style={{ fontSize:12, color:"#3B3B3B", background:"none", border:"none", cursor:"pointer",
                display:"flex", alignItems:"center", gap:4, marginBottom:4 }}>
              <Plus size={12}/> Añadir material
            </button>

            {/* Equipos directos */}
            <div style={{ fontSize:11, fontWeight:700, color:"#888", textTransform:"uppercase",
              letterSpacing:0.5, margin:"12px 0 8px", paddingBottom:4, borderBottom:"1px solid #E0E0E0" }}>
              Equipos / herramientas directos
            </div>
            <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:6 }}>
              <thead><tr>
                <th style={{ ...thS, width:90 }}>Código</th>
                <th style={{ ...thS, width:"35%" }}>Descripción</th>
                <th style={thS}>Unidad</th>
                <th style={{ ...thS, textAlign:"center", width:80 }}>Cant.</th>
                <th style={{ ...thS, textAlign:"right", width:110 }}>Precio unit.</th>
                <th style={{ ...thS, textAlign:"right", width:100 }}>Subtotal</th>
                <th style={thS}/>
              </tr></thead>
              <tbody>
                {(apu.equipos||[]).map(eq => (
                  <tr key={eq.id}>
                    <td style={tdS}>
                      <select value={eq.codigoCat||""} onChange={e => {
                        const cod = e.target.value;
                        const rec = CATALOGO_RECURSOS.find(r => r.codigo === cod);
                        if (rec) {
                          updArr("equipos",eq.id,"codigoCat",cod);
                          updArr("equipos",eq.id,"descripcion",rec.nombre);
                          updArr("equipos",eq.id,"unidad",rec.unidad||"ud");
                          if (!eq.precio && rec.precioRef) updArr("equipos",eq.id,"precio",rec.precioRef);
                        } else {
                          updArr("equipos",eq.id,"codigoCat","");
                        }
                      }} style={{ ...inp(), width:"100%", fontSize:10, fontFamily:"'DM Mono',monospace", padding:"3px 4px" }}>
                        <option value="">—</option>
                        {CATALOGO_RECURSOS.filter(r=>["herr_menor","herr_mayor","equipo_obra","equipo_medic"].includes(r.familia)).map(r=>
                          <option key={r.codigo} value={r.codigo}>{r.codigo} {r.nombre}</option>
                        )}
                      </select>
                    </td>
                    <td style={tdS}><input value={eq.descripcion||eq.nombre||""} onChange={e => updArr("equipos",eq.id,"descripcion",e.target.value)} style={{ ...inp(), width:"100%" }} placeholder="Equipo..."/></td>
                    <td style={tdS}><select value={eq.unidad||"ud"} onChange={e => updArr("equipos",eq.id,"unidad",e.target.value)} style={inp()}>
                      {["ud","h","día","mes","gl","cuerpo","jgo"].map(u=><option key={u}>{u}</option>)}
                    </select></td>
                    <td style={tdS}><input type="number" min="0" step="0.01" value={eq.cantidad||0} onChange={e => updArr("equipos",eq.id,"cantidad",parseFloat(e.target.value)||0)} style={{ ...inp(), width:70, textAlign:"center" }}/></td>
                    <td style={tdS}><input type="number" min="0" value={eq.precio||0} onChange={e => updArr("equipos",eq.id,"precio",parseFloat(e.target.value)||0)} style={{ ...inp(), width:100, textAlign:"right" }}/></td>
                    <td style={{ ...tdS, textAlign:"right", fontFamily:"'DM Mono',monospace", fontSize:12, fontWeight:600 }}>{fmtN2((eq.cantidad||0)*(eq.precio||0),0)}</td>
                    <td style={tdS}><button onClick={() => delArr("equipos",eq.id)} style={{ background:"none",border:"none",cursor:"pointer",color:"#B91C1C" }}><Trash2 size={11}/></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={() => addItem("equipos", { codigoCat:"", descripcion:"", unidad:"ud", cantidad:0, precio:0 })}
              style={{ fontSize:12, color:"#3B3B3B", background:"none", border:"none", cursor:"pointer",
                display:"flex", alignItems:"center", gap:4, marginBottom:4 }}>
              <Plus size={12}/> Añadir equipo/herramienta
            </button>
          </>)}

          {/* ══ SUBCONTRATAS (ambos modos) ══ */}
          <div style={{ fontSize:11, fontWeight:700, color:"#888", textTransform:"uppercase",
            letterSpacing:0.5, margin:"12px 0 8px", paddingBottom:4, borderBottom:"1px solid #E0E0E0" }}>
            Subcontratas
          </div>
          <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:6 }}>
            <thead><tr>
              <th style={{ ...thS, width:"70%" }}>Descripción del trabajo subcontratado</th>
              <th style={{ ...thS, textAlign:"right" }}>Importe</th>
              <th style={thS}/>
            </tr></thead>
            <tbody>
              {(apu.subcontratas||[]).map(s => (
                <tr key={s.id}>
                  <td style={tdS}><input value={s.descripcion||""} onChange={e => updArr("subcontratas",s.id,"descripcion",e.target.value)} style={{ ...inp(), width:"100%" }}/></td>
                  <td style={tdS}><input type="number" min="0" value={s.importe||0} onChange={e => updArr("subcontratas",s.id,"importe",parseFloat(e.target.value)||0)} style={{ ...inp(), width:120, textAlign:"right" }}/></td>
                  <td style={tdS}><button onClick={() => delArr("subcontratas",s.id)} style={{ background:"none",border:"none",cursor:"pointer",color:"#B91C1C" }}><Trash2 size={11}/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={() => addItem("subcontratas", { descripcion:"", importe:0 })}
            style={{ fontSize:12, color:"#3B3B3B", background:"none", border:"none", cursor:"pointer",
              display:"flex", alignItems:"center", gap:4, marginBottom:12 }}>
            <Plus size={12}/> Añadir subcontrata
          </button>

          {/* ══ RESUMEN ══ */}
          <div style={{ background:"#E8F4EE", border:"1px solid #B8DEC9", borderRadius:8, padding:"12px 14px",
            marginTop:8 }}>
            <div style={{ fontSize:11, fontWeight:700, color:"#111111", marginBottom:8,
              textTransform:"uppercase", letterSpacing:0.5 }}>Resumen costos directos</div>
            {esModoDiseno
              ? [["Diseño/planos", res.cdDis], ["MO directa", res.cdMO], ["Subcontratas", res.cdSub]]
                  .map(([l,v]) => (
                    <div key={l} style={{ display:"flex", justifyContent:"space-between",
                      fontSize:13, padding:"2px 0", borderBottom:"1px solid #B8DEC9" }}>
                      <span style={{ color:"#111111" }}>{l}</span>
                      <span style={{ fontFamily:"'DM Mono',monospace", fontWeight:600, color:"#111111" }}>
                        {fmtN2(v||0,0)} {moneda}
                      </span>
                    </div>
                  ))
              : [["Mano de obra (cuadrillas)", res.cdMO], ["Materiales", res.cdMat], ["Equipos directos", res.cdEq], ["Subcontratas", res.cdSub]]
                  .map(([l,v]) => (
                    <div key={l} style={{ display:"flex", justifyContent:"space-between",
                      fontSize:13, padding:"2px 0", borderBottom:"1px solid #B8DEC9" }}>
                      <span style={{ color:"#111111" }}>{l}</span>
                      <span style={{ fontFamily:"'DM Mono',monospace", fontWeight:600, color:"#111111" }}>
                        {fmtN2(v||0,0)} {moneda}
                      </span>
                    </div>
                  ))}
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:15,
              padding:"8px 0 0", fontWeight:700, color:"#111111" }}>
              <span>CD Total</span>
              <span style={{ fontFamily:"'DM Mono',monospace" }}>{fmtN2(res.CD||0,0)} {moneda}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding:"12px 18px", borderTop:"1px solid #E0E0E0",
          display:"flex", justifyContent:"flex-end", gap:8 }}>
          <button onClick={onClose} style={{ padding:"7px 16px", border:"1px solid #E0E0E0",
            borderRadius:6, background:"#fff", cursor:"pointer", fontSize:13 }}>Cancelar</button>
          <button onClick={() => onSave({ apu, precioCD: res.CD })}
            style={{ padding:"7px 16px", border:"none", borderRadius:6, background:"#111111",
              color:"#fff", cursor:"pointer", fontSize:13, fontWeight:600,
              display:"flex", alignItems:"center", gap:5 }}>
            <Check size={14}/> Guardar APU
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── HELPER: PU venta por línea (incluye GC + GF + GG + márgenes + AIU) ── */
const calcPUVentaLinea = (precioCD, cantidad, oferta) => {
  const pais   = oferta.pais || "CO";
  const margen = oferta.margen || 0.25;
  const ggPct  = oferta.ggPct || 0;  // GG% from gastos generales tab
  const g = (oferta.pctRCE||0) + (oferta.pctTRC||0) + (oferta.pctAdm||0) + (oferta.pctICA||0);
  const _ivaC = oferta.ivaComision ?? 0.19;
  let fFin = 0;
  if (oferta.medioPago === "PSE") fFin = (oferta.pctComPSE ?? 0.012) * (1 + _ivaC);
  else if (oferta.medioPago === "Tarjeta") fFin = (oferta.pctComTarjeta ?? 0.036) * (1 + _ivaC);
  else if (oferta.medioPago === "Transferencia") fFin = (oferta.pctComTransf ?? 0) * (1 + _ivaC);
  else if (oferta.medioPago === "Manual") fFin = (oferta.pctComManual ?? 0);
  const f4k = oferta.aplicar4x1000 === "SI" ? 0.004 : 0;
  const f = fFin + f4k;
  // GC + GG llevan margen, GF no
  const modoCalc = oferta.modoCalcObra || "margen";
  const den1 = (oferta.tipoProyecto === "OBRA" && modoCalc === "aiu")
    ? (1 - g)
    : (1 - margen - g - ggPct);  // GG enters denominator in margin mode
  const denGF = 1 - f;
  const denTotal = den1 * denGF;
  // AIU or margen
  let cdBase = precioCD;
  if (oferta.tipoProyecto === "OBRA" && modoCalc === "aiu") {
    const aiuTotal = (oferta.aiuA||0.08) + (oferta.aiuI||0.03) + (oferta.aiuU||0.07);
    cdBase = precioCD * (1 + aiuTotal);
  }
  const pvpLinea = denTotal > 0 ? cdBase / denTotal : 0;
  const qty = cantidad || 1;
  const ggLinea = modoCalc === "aiu" ? (oferta.aiuA||0.08) * precioCD : ggPct * pvpLinea;
  return {
    puCoste:    qty > 0 ? precioCD / qty : 0,
    totalCoste: precioCD,
    puVenta:    qty > 0 ? pvpLinea / qty : 0,
    totalVenta: pvpLinea,
    // APU venta breakdown
    cd: precioCD,
    gc: g * pvpLinea,
    gg: ggLinea,
    gf: f * pvpLinea,
    margenCOP: margen * pvpLinea,
    pvp: pvpLinea,
    coefMult: denTotal > 0 ? (modoCalc==="aiu" ? cdBase/precioCD : 1) / denTotal : 0,
    den: denTotal,
  };
};

/* ─── TAB BORRADOR DE COSTES ─────────────────────────────────── */
function TBorrador({ d, set, r }) {
  const pais   = d.pais || "CO";
  const moneda = pais === "CO" ? "COP" : "EUR";
  const fmt2   = (n) => n != null && !isNaN(n)
    ? new Intl.NumberFormat(pais === "CO" ? "es-CO" : "es-ES",
        { style:"currency", currency:moneda, minimumFractionDigits:0, maximumFractionDigits:0 }).format(n)
    : "–";
  const fmtN2 = (n, dec=0) => n != null && !isNaN(n)
    ? new Intl.NumberFormat("es-ES", { minimumFractionDigits:dec, maximumFractionDigits:dec }).format(n)
    : "0";

  const [apuOpen, setApuOpen] = useState(null);
  const [apuVentaOpen, setApuVentaOpen] = useState(null);
  const [showApuVentaViewer, setShowApuVentaViewer] = useState(false);
  const [apuVentaFilter, setApuVentaFilter] = useState("todos");
  const [vistaVenta, setVistaVenta] = useState(false);
  const [vistaPresup, setVistaPresup] = useState("detallado"); // detallado | capitulos | total
  const [dragId, setDragId] = useState(null);
  const lineas  = d.borradorLineas || [];

  const updLineas = (newLineas) => set("borradorLineas", newLineas);
  const addCapitulo = () => updLineas([...lineas, {
    id:uid(), esCapitulo:true, nombre:"CAPÍTULO " + (lineas.filter(l=>l.esCapitulo).length+1),
    tipo: TIPOS_CAPITULO[0].id,
  }]);
  const addLinea = (tipoCapitulo) => updLineas([...lineas, {
    id:uid(), esCapitulo:false, tipo:tipoCapitulo||TIPOS_CAPITULO[0].id,
    codigo:"", descripcion:"", unidad:"m²", cantidad:1, apu:null, precioCD:0,
  }]);
  const updLinea = (id, k, v) => updLineas(lineas.map(l => l.id===id ? {...l,[k]:v} : l));
  const delLinea = (id) => updLineas(lineas.filter(l => l.id !== id));
  const moveLinea = (id, dir) => {
    const arr = [...lineas];
    const i = arr.findIndex(l => l.id===id);
    if (i+dir < 0 || i+dir >= arr.length) return;
    [arr[i], arr[i+dir]] = [arr[i+dir], arr[i]];
    updLineas(arr);
  };
  // Drag & drop reorder
  const handleDragStart = (id) => setDragId(id);
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (targetId) => {
    if (!dragId || dragId === targetId) { setDragId(null); return; }
    const arr = [...lineas];
    const fromIdx = arr.findIndex(l => l.id === dragId);
    const toIdx = arr.findIndex(l => l.id === targetId);
    if (fromIdx < 0 || toIdx < 0) { setDragId(null); return; }
    const [moved] = arr.splice(fromIdx, 1);
    arr.splice(toIdx, 0, moved);
    updLineas(arr);
    setDragId(null);
  };

  const saveAPU = (lineaId, apuData) => {
    updLineas(lineas.map(l => l.id===lineaId ? {...l, ...apuData} : l));
    setApuOpen(null);
  };

  // Exportar actividades al Gantt
  const exportarGantt = () => {
    const acts = lineas.filter(l => !l.esCapitulo && l.descripcion).map(l => ({
      id:l.id, otId:d.id, otNombre:d.proyecto||d.cliente,
      codigo:l.codigo, nombre:l.descripcion, unidad:l.unidad,
      cantidad:l.cantidad, presupuesto:l.precioCD||0, avance:0, estado:"pendiente",
    }));
    try {
      store.set("hab:proj:actividades:"+d.id, JSON.stringify(acts));
      alert(`✅ ${acts.length} actividades exportadas al módulo Proyectos.`);
    } catch(e) { alert("Error: "+e.message); }
  };

  // Totales
  const totalCD = lineas.filter(l=>!l.esCapitulo).reduce((s,l)=>s+(l.precioCD||0),0);
  const pctU    = d.pctU || 0.07;
  const pctAdminAIU = 0.08;
  const pctImpAIU   = 0.03;
  const aiuTotal = pais === "CO" ? totalCD * (pctAdminAIU + pctImpAIU + pctU) : 0;
  const ggTotal  = pais === "ES" ? totalCD * (d.gg || 0.13) : 0;
  const biTotal  = pais === "ES" ? totalCD * (d.bi || 0.06) : 0;
  const sinIVA   = totalCD + aiuTotal + ggTotal + biTotal;
  const tasaIVA  = pais === "CO" ? (d.tarifaIVA||0.19) : (d.tarifaIVA||0.10);
  const ivaTotal = sinIVA * tasaIVA;
  const conIVA   = sinIVA + ivaTotal;

  const lineaApu = lineas.find(l => l.id === apuOpen);

  const UNIDADES = ["m²","m³","ml","m","kg","ton","ud","gl","h","día","sem","mes","l","m²xl","vje"];

  // último tipo de capítulo en la lista (para nuevas líneas)
  const lastTipoCap = () => {
    for (let i = lineas.length-1; i >= 0; i--) {
      if (lineas[i].esCapitulo) return lineas[i].tipo;
    }
    return TIPOS_CAPITULO[0].id;
  };

  return (
    <div className="fade">
      <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap", alignItems:"center" }}>
        <button onClick={addCapitulo}
          style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 14px",
            border:"1px solid #E0E0E0", borderRadius:6, background:"#F5F4F1",
            cursor:"pointer", fontSize:13, fontFamily:"'DM Sans',sans-serif", fontWeight:500 }}>
          <Layers size={13}/> Añadir capítulo
        </button>
        <button onClick={() => addLinea(lastTipoCap())}
          style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 14px",
            border:"none", borderRadius:6, background:"#111111", color:"#fff",
            cursor:"pointer", fontSize:13, fontFamily:"'DM Sans',sans-serif", fontWeight:600 }}>
          <Plus size={13}/> Nueva partida
        </button>
        <div style={{ flex:1 }}/>
        {/* Toggle vista */}
        <div style={{ display:"flex", border:"1px solid #E0E0E0", borderRadius:6, overflow:"hidden" }}>
          {[["coste","Vista interna",false],["venta","Vista cliente",true]].map(([k,lbl,isVenta])=>(
            <button key={k} onClick={()=>setVistaVenta(isVenta)}
              style={{ padding:"6px 14px", border:"none", fontSize:11, fontWeight:600,
                cursor:"pointer", fontFamily:"'DM Sans',sans-serif",
                background: vistaVenta===isVenta ? "#111" : "#fff",
                color: vistaVenta===isVenta ? "#fff" : "#555",
                transition:"all .15s" }}>
              {lbl}
            </button>
          ))}
        </div>
        {/* Presupuesto view selector - only in Vista cliente */}
        {vistaVenta && (
          <div style={{ display:"flex", border:"1px solid #E0E0E0", borderRadius:6, overflow:"hidden", marginLeft:8 }}>
            {[["detallado","Detallado"],["capitulos","Capítulos"],["total","Total"]].map(([k,lbl])=>(
              <button key={k} onClick={()=>setVistaPresup(k)}
                style={{ padding:"6px 10px", border:"none", fontSize:10, fontWeight:600,
                  cursor:"pointer", fontFamily:"'DM Sans',sans-serif",
                  background: vistaPresup===k ? "#3B3B3B" : "#fff",
                  color: vistaPresup===k ? "#fff" : "#888",
                  transition:"all .15s" }}>
                {lbl}
              </button>
            ))}
          </div>
        )}
        {/* APUs de Venta viewer */}
        <button onClick={() => setShowApuVentaViewer(true)}
          style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 14px", marginLeft:8,
            border:"none", borderRadius:6, background:"#3B3B3B", color:"#fff",
            cursor:"pointer", fontSize:12, fontFamily:"'DM Sans',sans-serif", fontWeight:700 }}>
          <Eye size={13}/> APUs de Venta
        </button>
        {d.estado === "Ganada" && (
          <button onClick={exportarGantt}
            style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 14px",
              border:"none", borderRadius:6, background:"#3B3B3B", color:"#fff",
              cursor:"pointer", fontSize:13, fontFamily:"'DM Sans',sans-serif", fontWeight:600 }}>
            <ArrowRight size={13}/> Exportar al Gantt
          </button>
        )}
      </div>

      {/* KPIs arriba */}
      {(() => {
        const totalVentaSinIVA = lineas.filter(l=>!l.esCapitulo && l.precioCD)
          .reduce((s,l) => s + calcPUVentaLinea(l.precioCD||0, l.cantidad||1, d).totalVenta, 0);
        const ivaVenta = totalVentaSinIVA * tasaIVA;
        const totalVentaConIVA = totalVentaSinIVA + ivaVenta;
        const margenBruto = totalVentaSinIVA - totalCD;
        const margenPct  = totalVentaSinIVA > 0 ? (margenBruto/totalVentaSinIVA*100).toFixed(1) : 0;
        return (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(145px,1fr))", gap:8, marginBottom:14 }}>
            {[
              ["Costos directos", fmtN2(totalCD,0)+" "+moneda, "#555"],
              pais==="CO"
                ? ["AIU "+((pctAdminAIU+pctImpAIU+pctU)*100).toFixed(0)+"%", fmtN2(aiuTotal,0)+" "+moneda, "#8C6A00"]
                : ["GG+BI "+((d.gg||0.13)*100+((d.bi||0.06)*100)).toFixed(0)+"%", fmtN2(ggTotal+biTotal,0)+" "+moneda, "#3B3B3B"],
              ["Venta s/IVA", fmtN2(totalVentaSinIVA,0)+" "+moneda, "#3B3B3B"],
              ["IVA "+((tasaIVA)*100).toFixed(0)+"%", fmtN2(ivaVenta,0)+" "+moneda, "#555"],
              ["TOTAL c/IVA", fmtN2(totalVentaConIVA,0)+" "+moneda, "#111111"],
              ["Margen", margenPct+"% · "+fmtN2(margenBruto,0), "#2B7A52"],
            ].map(([l,v,color])=>(
              <div key={l} style={{ background:"#fff", border:"1px solid #E0E0E0",
                borderRadius:8, padding:"8px 10px", borderLeft:"3px solid "+color }}>
                <div style={{ fontSize:9, color:"#888", marginBottom:2 }}>{l}</div>
                <div style={{ fontSize:12, fontWeight:700, color, fontFamily:"'DM Mono',monospace" }}>{v}</div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Tabla */}
      <div style={{ border:"1px solid #E0E0E0", borderRadius:8, overflow:"hidden",
        marginBottom:14, overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", minWidth:vistaVenta?700:1100 }}>
          <thead>
            <tr style={{ background:"#F5F4F1" }}>
              {[
                {l:"Cód",w:52},{l:"Descripción / Actividad",w:"20%"},
                {l:"Tipo",w:96},{l:"Unid",w:52},{l:"Cant.",w:68},
                ...(!vistaVenta ? [{l:"PU coste",w:86},{l:"CD Total ✎",w:100}] : []),
                {l:"PU venta",w:96},{l:"Total venta",w:106},
                ...(!vistaVenta ? [{l:"% Inc.",w:52}] : []),
                ...(!vistaVenta ? [{l:"APU",w:64}] : [{l:"APU Vta",w:64}]),
                {l:"",w:52},
              ].filter(h=>h.w!==0).map(h=>(
                <th key={h.l} style={{ padding:"7px 8px", fontSize:9, fontWeight:700,
                  color:"#888", textTransform:"uppercase", letterSpacing:0.4,
                  borderBottom:"2px solid #E0E0E0", textAlign:"left",
                  width:h.w, minWidth:typeof h.w==="number"?h.w:undefined }}>{h.l}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lineas.length === 0 && (
              <tr><td colSpan={vistaVenta?8:12} style={{ padding:"32px", textAlign:"center", color:"#999", fontSize:13 }}>
                Añade un capítulo y partidas para construir el borrador.
              </td></tr>
            )}
            {/* Vista Total: una sola fila */}
            {vistaVenta && vistaPresup === "total" && lineas.length > 0 && (() => {
              const totalVenta = lineas.filter(l=>!l.esCapitulo && l.precioCD)
                .reduce((s,l) => s + calcPUVentaLinea(l.precioCD||0, l.cantidad||1, d).totalVenta, 0);
              return (
                <tr style={{ background:"#fff" }}>
                  <td colSpan={5} style={{ padding:"12px 12px", fontSize:13, fontWeight:600 }}>
                    {d.proyecto || "Proyecto"} — Precio total
                  </td>
                  <td style={{ padding:"12px 8px", textAlign:"right", fontFamily:"'DM Mono',monospace", fontSize:14, fontWeight:700, color:"#3B3B3B" }}>—</td>
                  <td style={{ padding:"12px 8px", textAlign:"right", fontFamily:"'DM Mono',monospace", fontSize:14, fontWeight:700, color:"#111111" }}>
                    {fmtN2(totalVenta,0)}
                  </td>
                  <td/>
                </tr>
              );
            })()}
            {/* Vista Capítulos: una fila por capítulo con subtotal */}
            {vistaVenta && vistaPresup === "capitulos" && lineas.length > 0 && (() => {
              const caps = [];
              let currentCap = null;
              let currentItems = [];
              lineas.forEach(l => {
                if (l.esCapitulo) {
                  if (currentCap) caps.push({ cap: currentCap, items: currentItems });
                  currentCap = l; currentItems = [];
                } else {
                  currentItems.push(l);
                }
              });
              if (currentCap) caps.push({ cap: currentCap, items: currentItems });
              // Items without chapter
              const orphans = [];
              let foundCap = false;
              lineas.forEach(l => { if (l.esCapitulo) foundCap = true; if (!foundCap && !l.esCapitulo) orphans.push(l); });
              return (<>
                {orphans.length > 0 && (
                  <tr style={{ background:"#FFFFFF" }}>
                    <td colSpan={5} style={{ padding:"10px 12px", fontSize:12, fontWeight:600, fontStyle:"italic" }}>Partidas sin capítulo</td>
                    <td style={{ padding:"10px 8px", textAlign:"right", fontFamily:"'DM Mono',monospace", fontSize:12, color:"#3B3B3B" }}>—</td>
                    <td style={{ padding:"10px 8px", textAlign:"right", fontFamily:"'DM Mono',monospace", fontSize:12, fontWeight:700, color:"#111111" }}>
                      {fmtN2(orphans.reduce((s,l) => s + (l.precioCD>0 ? calcPUVentaLinea(l.precioCD,l.cantidad||1,d).totalVenta : 0),0),0)}
                    </td>
                    <td/>
                  </tr>
                )}
                {caps.map(({cap, items}, ci) => {
                  const capTotal = items.reduce((s,l) => s + (l.precioCD>0 ? calcPUVentaLinea(l.precioCD,l.cantidad||1,d).totalVenta : 0),0);
                  return (
                    <tr key={cap.id} style={{ background:ci%2===0?"#fff":"#FFFFFF", borderBottom:`1px solid ${C.border}` }}>
                      <td colSpan={5} style={{ padding:"10px 12px" }}>
                        <span style={{ fontWeight:700, fontSize:12, textTransform:"uppercase", letterSpacing:0.5 }}>{cap.nombre||"Capítulo"}</span>
                        <span style={{ marginLeft:8, fontSize:10, color:C.inkLight }}>{items.length} partida{items.length!==1?"s":""}</span>
                      </td>
                      <td style={{ padding:"10px 8px", textAlign:"right", fontFamily:"'DM Mono',monospace", fontSize:12, color:"#3B3B3B" }}>—</td>
                      <td style={{ padding:"10px 8px", textAlign:"right", fontFamily:"'DM Mono',monospace", fontSize:13, fontWeight:700, color:"#111111" }}>
                        {fmtN2(capTotal,0)}
                      </td>
                      <td/>
                    </tr>
                  );
                })}
              </>);
            })()}
            {/* Vista Detallada (o Vista interna): todas las líneas */}
            {(!vistaVenta || vistaPresup === "detallado") && lineas.map((l, i) => {
              if (l.esCapitulo) {
                const capTInfo = TIPOS_CAPITULO.find(t => t.id === (l.tipo||"CAP00"));
                return (
                  <tr key={l.id} draggable onDragStart={()=>handleDragStart(l.id)}
                    onDragOver={handleDragOver} onDrop={()=>handleDrop(l.id)}
                    style={{ background: dragId===l.id ? "#D5D2CC" : "#EDEBE7",
                      cursor:"grab", opacity: dragId===l.id ? 0.5 : 1 }}>
                    <td colSpan={2} style={{ padding:"8px 12px" }}>
                      <input value={l.nombre||""} onChange={e => updLinea(l.id,"nombre",e.target.value)}
                        style={{ fontWeight:700, fontSize:13, color:"#111", background:"transparent",
                          border:"none", outline:"none", width:"100%", textTransform:"uppercase",
                          letterSpacing:0.5 }}/>
                    </td>
                    <td style={{ padding:"6px 8px" }}>
                      <select value={l.tipo||"CAP00"} onChange={e => updLinea(l.id,"tipo",e.target.value)}
                        style={{ border:"1px solid #CCC", borderRadius:5, padding:"3px 7px",
                          fontSize:11, background:"#fff", cursor:"pointer", fontFamily:"'DM Sans',sans-serif",
                          color:capTInfo?.color||"#8C6A00", width:"100%" }}>
                        {TIPOS_CAPITULO.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                      </select>
                    </td>
                    <td colSpan={vistaVenta?4:7} style={{ padding:"6px 8px", color:"#AAA", fontSize:10, fontStyle:"italic" }}>
                      Capítulo agrupador
                    </td>
                    <td style={{ padding:"6px 8px", textAlign:"right" }}>
                      <button onClick={() => delLinea(l.id)}
                        style={{ background:"none", border:"none", cursor:"pointer", color:"#B91C1C" }}>
                        <Trash2 size={12}/>
                      </button>
                    </td>
                  </tr>
                );
              }

              const tInfo = TIPOS_LINEA.find(t => t.id === l.tipo);
              const tieneAPU = l.apu && (
                (l.apu.estudios?.length||0) + (l.apu.equiposUsados?.length||0) +
                (l.apu.materiales?.length||0) + (l.apu.subcontratas?.length||0) > 0
              );

              return (
                <tr key={l.id} draggable onDragStart={()=>handleDragStart(l.id)}
                  onDragOver={handleDragOver} onDrop={()=>handleDrop(l.id)}
                  style={{ background: dragId===l.id ? "#D5E8F9" : (i%2===0?"#fff":"#F9F8F5"),
                    transition:"background .1s", cursor:"grab",
                    opacity: dragId===l.id ? 0.5 : 1 }}
                  onMouseEnter={e=>{ if(!dragId) e.currentTarget.style.background="#F0F0F0"; }}
                  onMouseLeave={e=>{ if(!dragId) e.currentTarget.style.background=i%2===0?"#fff":"#F9F8F5"; }}>
                  <td style={{ padding:"5px 8px" }}>
                    <input value={l.codigo||""} onChange={e=>updLinea(l.id,"codigo",e.target.value)}
                      style={{ width:52, border:"1px solid #E0E0E0", borderRadius:4,
                        padding:"3px 5px", fontSize:11, fontFamily:"'DM Mono',monospace",
                        textAlign:"center" }}/>
                  </td>
                  <td style={{ padding:"5px 8px" }}>
                    <input value={l.descripcion||""} onChange={e=>updLinea(l.id,"descripcion",e.target.value)}
                      placeholder="Descripción de la actividad..."
                      style={{ width:"100%", border:"1px solid #E0E0E0", borderRadius:4,
                        padding:"5px 8px", fontSize:13 }}/>
                  </td>
                  <td style={{ padding:"5px 8px" }}>
                    <select value={l.tipo||TIPOS_LINEA[0].id}
                      onChange={e => updLinea(l.id, "tipo", e.target.value)}
                      style={{ border:"1px solid #E0E0E0", borderRadius:5, padding:"3px 6px",
                        fontSize:11, background:"transparent", cursor:"pointer",
                        color:tInfo?.color||"#555", fontFamily:"'DM Sans',sans-serif",
                        maxWidth:110 }}>
                      {TIPOS_LINEA.map(t => (
                        <option key={t.id} value={t.id}>{t.icon} {t.label}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding:"5px 8px" }}>
                    <select value={l.unidad||"m²"} onChange={e=>updLinea(l.id,"unidad",e.target.value)}
                      style={{ border:"1px solid #E0E0E0", borderRadius:4, padding:"4px 4px",
                        fontSize:12, width:56 }}>
                      {UNIDADES.map(u=><option key={u}>{u}</option>)}
                    </select>
                  </td>
                  <td style={{ padding:"5px 8px" }}>
                    <input type="number" min="0" step="0.01" value={l.cantidad||0}
                      onChange={e=>updLinea(l.id,"cantidad",parseFloat(e.target.value)||0)}
                      style={{ width:72, border:"1px solid #E0E0E0", borderRadius:4,
                        padding:"4px 6px", fontSize:13, textAlign:"right",
                        fontFamily:"'DM Mono',monospace" }}/>
                  </td>
                  {(() => {
                    const venta = (tieneAPU || l.precioCD > 0) ? calcPUVentaLinea(l.precioCD||0, l.cantidad||1, d) : null;
                    const totalVentaAll = lineas.filter(x=>!x.esCapitulo && x.precioCD)
                      .reduce((s,x) => s + calcPUVentaLinea(x.precioCD||0, x.cantidad||1, d).totalVenta, 0);
                    const incidencia = venta && totalVentaAll > 0 ? (venta.totalVenta / totalVentaAll * 100) : 0;
                    const tdNum = { padding:"5px 8px", textAlign:"right",
                      fontFamily:"'DM Mono',monospace", fontSize:12, verticalAlign:"middle" };
                    return (<>
                      {!vistaVenta && (
                        <>
                        <td style={{ ...tdNum, color:(tieneAPU||l.precioCD>0)?"#555":"#DDD" }}>
                          {(tieneAPU||l.precioCD>0) && venta ? fmtN2(venta.puCoste,0) : "—"}
                        </td>
                        <td style={{ ...tdNum, fontWeight:(tieneAPU||l.precioCD>0)?600:400, color:(tieneAPU||l.precioCD>0)?"#111":"#DDD" }}>
                          <input type="number" min="0" step="100"
                            value={l.precioCD||""}
                            placeholder="0"
                            onChange={e => updLinea(l.id, "precioCD", parseFloat(e.target.value)||0)}
                            style={{ width:90, border:`1px solid ${l.precioCD>0?"#111111":"#E0E0E0"}`,
                              borderRadius:4, padding:"3px 6px", fontSize:12, textAlign:"right",
                              fontFamily:"'DM Mono',monospace", fontWeight:600,
                              background: l.precioCD>0 ? "#E6F4EC" : "#fff",
                              color: l.precioCD>0 ? "#111" : "#999" }} />
                        </td>
                        </>
                      )}
                      <td style={{ ...tdNum, color:(tieneAPU||l.precioCD>0)?"#3B3B3B":"#DDD", fontWeight:600 }}>
                        {(tieneAPU||l.precioCD>0) && venta ? fmtN2(venta.puVenta,0) : "—"}
                      </td>
                      <td style={{ ...tdNum, color:(tieneAPU||l.precioCD>0)?"#111111":"#DDD", fontWeight:700 }}>
                        {(tieneAPU||l.precioCD>0) && venta ? fmtN2(venta.totalVenta,0) : "—"}
                      </td>
                      {!vistaVenta && (
                      <td style={{ ...tdNum, fontSize:10, color:incidencia>5?"#111111":"#999" }}>
                        {(tieneAPU || l.precioCD > 0) ? incidencia.toFixed(1)+"%" : "—"}
                      </td>
                      )}
                    </>);
                  })()}
                  {!vistaVenta && (
                  <td style={{ padding:"5px 8px", textAlign:"center" }}>
                    <div style={{ display:"flex", gap:3, justifyContent:"center" }}>
                    <button onClick={() => setApuOpen(l.id)}
                      style={{ background:tieneAPU?"#111111":"transparent",
                        color:tieneAPU?"#fff":"#3B3B3B",
                        border:`1px solid ${tieneAPU?"#111111":"#3B3B3B"}`,
                        borderRadius:5, padding:"3px 8px", fontSize:11, fontWeight:600,
                        cursor:"pointer", display:"flex", alignItems:"center", gap:3 }}>
                      <Calculator size={10}/>{tieneAPU?"APU ✓":"+ APU"}
                    </button>
                    {(Number(l.precioCD) > 0 || tieneAPU) && (
                      <button onClick={() => setApuVentaOpen(l.id)}
                        style={{ background:"#3B3B3B", color:"#fff", border:"none",
                          borderRadius:5, padding:"3px 7px", fontSize:10, fontWeight:600,
                          cursor:"pointer", display:"flex", alignItems:"center", gap:2 }}>
                        <Eye size={10}/> Venta
                      </button>
                    )}
                    </div>
                  </td>
                  )}
                  <td style={{ padding:"5px 4px" }}>
                    <div style={{ display:"flex", gap:1 }}>
                      {vistaVenta && (Number(l.precioCD) > 0 || tieneAPU) && (
                        <button onClick={() => setApuVentaOpen(l.id)}
                          style={{ background:"#3B3B3B", color:"#fff", border:"none",
                            borderRadius:4, padding:"3px 7px", fontSize:10, fontWeight:600,
                            cursor:"pointer", display:"flex", alignItems:"center", gap:2 }}>
                          <Eye size={10}/>APU Venta
                        </button>
                      )}
                      {!vistaVenta && <>
                      <button onClick={()=>moveLinea(l.id,-1)} style={{ background:"none",border:"none",cursor:"pointer",color:"#BBB",padding:2 }}><ChevronUp size={11}/></button>
                      <button onClick={()=>moveLinea(l.id,1)} style={{ background:"none",border:"none",cursor:"pointer",color:"#BBB",padding:2 }}><ChevronDown size={11}/></button>
                      <button onClick={()=>delLinea(l.id)} style={{ background:"none",border:"none",cursor:"pointer",color:"#B91C1C",padding:2 }}><Trash2 size={11}/></button>
                      </>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            {(() => {
              const totalVenta = lineas.filter(l=>!l.esCapitulo && l.precioCD)
                .reduce((s,l) => s + calcPUVentaLinea(l.precioCD||0, l.cantidad||1, d).totalVenta, 0);
              const isObra = d.tipoProyecto === "OBRA";
              const uVal = r.U || d.margen;
              const ivaVenta = isObra ? uVal * totalVenta * (d.tarifaIVA||0.19) : totalVenta * (d.tarifaIVA||0.19);
              const totalConIVA = totalVenta + ivaVenta;
              const nCols = vistaVenta ? 8 : 12;

              if (vistaVenta) return (<>
                {/* Vista cliente: Subtotal + IVA + Total */}
                <tr style={{ background:"#F5F4F1", borderTop:"2px solid #333" }}>
                  <td colSpan={nCols-1} style={{ padding:"10px 12px", fontSize:12, fontWeight:700 }}>Subtotal</td>
                  <td style={{ padding:"10px 8px", textAlign:"right",
                    fontFamily:"'DM Mono',monospace", fontSize:14, fontWeight:700 }}>
                    {fmtN2(totalVenta,0)} {moneda}
                  </td>
                </tr>
                <tr style={{ background:"#F5F4F1" }}>
                  <td colSpan={nCols-1} style={{ padding:"6px 12px", fontSize:11, color:C.inkMid }}>
                    {isObra ? `IVA ${((d.tarifaIVA||0.19)*100).toFixed(0)}% sobre utilidad` : `IVA ${((d.tarifaIVA||0.19)*100).toFixed(0)}%`}
                  </td>
                  <td style={{ padding:"6px 8px", textAlign:"right",
                    fontFamily:"'DM Mono',monospace", fontSize:12 }}>
                    {fmtN2(ivaVenta,0)} {moneda}
                  </td>
                </tr>
                <tr style={{ background:"#111" }}>
                  <td colSpan={nCols-1} style={{ padding:"12px 12px", color:"#fff", fontSize:14, fontWeight:700 }}>TOTAL</td>
                  <td style={{ padding:"12px 8px", textAlign:"right",
                    color:"#fff", fontFamily:"'DM Mono',monospace", fontSize:16, fontWeight:700 }}>
                    {fmtN2(totalConIVA,0)} {moneda}
                  </td>
                </tr>
              </>);

              // Vista interna: totales completos
              return (
                <tr style={{ background:"#111" }}>
                  <td colSpan={4} style={{ padding:"10px 12px", color:"#fff", fontSize:13, fontWeight:600 }}>TOTALES</td>
                  <td style={{ padding:"10px 8px", textAlign:"right", color:"#ccc",
                    fontFamily:"'DM Mono',monospace", fontSize:11 }}>
                    {lineas.filter(l=>!l.esCapitulo).length} partidas
                  </td>
                  <td style={{ padding:"10px 8px" }}/>
                  <td style={{ padding:"10px 8px", textAlign:"right",
                    color:"#aaa", fontFamily:"'DM Mono',monospace", fontSize:12 }}>
                    {fmtN2(totalCD,0)}
                  </td>
                  <td style={{ padding:"10px 8px" }}/>
                  <td style={{ padding:"10px 8px", textAlign:"right",
                    color:"#fff", fontFamily:"'DM Mono',monospace", fontSize:14, fontWeight:700 }}>
                    {fmtN2(totalVenta,0)} {moneda}
                  </td>
                  <td style={{ padding:"10px 8px", textAlign:"right", color:"#aaa", fontSize:10 }}>100%</td>
                  <td colSpan={2}/>
                </tr>
              );
            })()}
          </tfoot>
        </table>
      </div>

      {/* Modal APU coste */}
      {apuOpen && lineaApu && (
        <APULineaModal
          linea={lineaApu} oferta={d}
          onSave={(data) => saveAPU(lineaApu.id, data)}
          onClose={() => setApuOpen(null)}/>
      )}

      {/* Modal APU venta */}
      {/* ═══ APU DE VENTA VIEWER (todos o por capítulo) ═══ */}
      {showApuVentaViewer && (() => {
        const isObra = d.tipoProyecto === "OBRA";
        const uVal = r.U || d.margen;
        // Get chapters and items
        const chapters = lineas.filter(l => l.esCapitulo);
        const items = lineas.filter(l => !l.esCapitulo && Number(l.precioCD) > 0);
        // Group items by chapter
        const grouped = {};
        let currentCap = null;
        lineas.forEach(l => {
          if (l.esCapitulo) { currentCap = l; return; }
          if (!l.esCapitulo && Number(l.precioCD) > 0) {
            const capId = currentCap ? currentCap.id : "__sin_cap__";
            const capName = currentCap ? currentCap.descripcion : "Sin capítulo";
            if (!grouped[capId]) grouped[capId] = { nombre: capName, items: [] };
            const v = calcPUVentaLinea(Number(l.precioCD), l.cantidad||1, d);
            const ivaL = isObra ? uVal * v.pvp * (d.tarifaIVA||0.19) : v.pvp * (d.tarifaIVA||0.19);
            grouped[capId].items.push({ ...l, v, ivaL });
          }
        });
        const capIds = Object.keys(grouped);
        const filteredGroups = apuVentaFilter === "todos" ? capIds : capIds.filter(id => id === apuVentaFilter);

        // Totals
        const grandTotalVenta = items.reduce((s,l) => s + calcPUVentaLinea(l.precioCD||0, l.cantidad||1, d).pvp, 0);
        const grandTotalCoste = items.reduce((s,l) => s + Number(l.precioCD||0), 0);

        // Export CSV
        const exportCSV = () => {
          const header = ["Capítulo","Código","Descripción","Und","Cant","PU Coste","CD Total","GC","GF","Margen","PVP s/IVA","PU Venta","IVA","PVP c/IVA","Coef.Mult"];
          const rows = [];
          filteredGroups.forEach(capId => {
            const g = grouped[capId];
            g.items.forEach(it => {
              rows.push([
                g.nombre, it.codigo||"", it.descripcion||"", it.und||"", it.cantidad||1,
                (it.v.puCoste||0).toFixed(0), (it.v.cd||0).toFixed(0),
                (it.v.gc||0).toFixed(0), (it.v.gf||0).toFixed(0), (it.v.margenCOP||0).toFixed(0),
                (it.v.pvp||0).toFixed(0), (it.v.puVenta||0).toFixed(0),
                (it.ivaL||0).toFixed(0), (it.v.pvp + it.ivaL).toFixed(0),
                (it.v.coefMult||0).toFixed(4),
              ]);
            });
          });
          const csv = [header.join(";"), ...rows.map(r => r.join(";"))].join("\n");
          const blob = new Blob(["\ufeff"+csv], { type:"text/csv;charset=utf-8" });
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = `APUs_Venta_${d.codigoOferta||"oferta"}.csv`;
          a.click();
        };

        // Export printable
        const exportPrint = () => {
          const w = window.open("","_blank");
          let html = `<html><head><title>APUs de Venta - ${d.codigoOferta||""}</title>
          <style>@import url('https://fonts.googleapis.com/css2?family=DM Sans:wght@400;600;700&family=DM+Mono:wght@400;500&display=swap');
          *{margin:0;padding:0;box-sizing:border-box}body{font-family:'DM Sans',sans-serif;padding:28px;color:#111;font-size:11px}
          h1{font-size:18px;margin-bottom:4px}h2{font-size:13px;margin:20px 0 8px;padding:6px 0;border-bottom:2px solid #111}
          .meta{color:#888;font-size:10px;margin-bottom:16px}
          table{width:100%;border-collapse:collapse;margin-bottom:16px}
          th{background:#F5F4F1;padding:5px 6px;font-size:8px;text-transform:uppercase;letter-spacing:0.5px;text-align:right;border-bottom:2px solid #E0E0E0}
          th:nth-child(1),th:nth-child(2){text-align:left}
          td{padding:5px 6px;border-bottom:1px solid #E0E0E0;font-size:10px;text-align:right}
          td:nth-child(1),td:nth-child(2){text-align:left}
          .mono{font-family:'DM Mono',monospace}.bold{font-weight:700}.green{color:#111111}.blue{color:#3B3B3B}
          .totrow td{font-weight:700;border-top:2px solid #111;padding-top:8px}
          .param{background:#F5F4F1;padding:10px 14px;border-radius:4px;font-size:9px;color:#555;margin-bottom:16px}
          @media print{body{padding:12px}}
          </style></head><body>`;
          html += `<h1>APUs de Venta · ${d.proyecto || d.codigoOferta || "Oferta"}</h1>`;
          html += `<div class="meta">${d.codigoOferta||""} · ${d.cliente||""} · ${moneda} · ${new Date().toLocaleDateString("es-CO")}</div>`;
          html += `<div class="param">Margen: ${(d.margen*100).toFixed(1)}% · GC: ${((r.g||0)*100).toFixed(2)}% · GF: ${((r.f||0)*100).toFixed(2)}% · IVA: ${((d.tarifaIVA||0.19)*100).toFixed(0)}%${isObra?" (sobre utilidad)":""}</div>`;

          filteredGroups.forEach(capId => {
            const g = grouped[capId];
            html += `<h2>${g.nombre}</h2><table><tr><th>Descripción</th><th>Und</th><th>Cant</th><th>PU Coste</th><th>CD</th><th>GC</th><th>GF</th><th>Margen</th><th>PVP s/IVA</th><th>PU Venta</th><th>IVA</th><th>PVP c/IVA</th></tr>`;
            let capTotal = 0;
            g.items.forEach(it => {
              const total = it.v.pvp + it.ivaL;
              capTotal += total;
              html += `<tr><td>${it.descripcion||""}</td><td>${it.und||""}</td><td class="mono">${it.cantidad||1}</td>`;
              html += `<td class="mono">${fmtN2(it.v.puCoste,0)}</td><td class="mono">${fmtN2(it.v.cd,0)}</td>`;
              html += `<td class="mono">${fmtN2(it.v.gc,0)}</td><td class="mono">${fmtN2(it.v.gf,0)}</td>`;
              html += `<td class="mono">${fmtN2(it.v.margenCOP,0)}</td>`;
              html += `<td class="mono bold blue">${fmtN2(it.v.pvp,0)}</td>`;
              html += `<td class="mono">${fmtN2(it.v.puVenta,0)}</td>`;
              html += `<td class="mono">${fmtN2(it.ivaL,0)}</td>`;
              html += `<td class="mono bold green">${fmtN2(total,0)}</td></tr>`;
            });
            html += `<tr class="totrow"><td colspan="8">Subtotal ${g.nombre}</td><td colspan="4" class="mono green">${fmtN2(capTotal,0)} ${moneda}</td></tr></table>`;
          });

          html += `<table style="margin-top:16px"><tr class="totrow"><td colspan="8" style="font-size:14px">TOTAL VENTA</td><td colspan="4" class="mono green" style="font-size:14px">${fmtN2(grandTotalVenta + items.reduce((s,it) => { const v=calcPUVentaLinea(it.precioCD||0,it.cantidad||1,d); return s+(isObra?uVal*v.pvp*(d.tarifaIVA||0.19):v.pvp*(d.tarifaIVA||0.19)); },0),0)} ${moneda}</td></tr></table>`;
          html += `</body></html>`;
          w.document.write(html);
          w.document.close();
          setTimeout(() => w.print(), 300);
        };

        const numStyle = { fontFamily:"'DM Mono',monospace", fontSize:11, textAlign:"right" };

        return (
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:9999,
            display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
            onClick={() => setShowApuVentaViewer(false)}>
            <div onClick={e=>e.stopPropagation()}
              style={{ background:"#fff", borderRadius:10, width:"95%", maxWidth:1100, maxHeight:"90vh",
                display:"flex", flexDirection:"column", boxShadow:"0 20px 60px rgba(0,0,0,.25)" }}>

              {/* Header */}
              <div style={{ padding:"16px 22px", borderBottom:"2px solid #111", display:"flex",
                justifyContent:"space-between", alignItems:"center", flexShrink:0 }}>
                <div>
                  <h2 style={{ fontSize:17, fontWeight:700, margin:0 }}>📊 APUs de Venta</h2>
                  <p style={{ fontSize:10, color:"#888", margin:"3px 0 0" }}>
                    {d.codigoOferta||""} · {d.cliente||""} · {items.length} partidas con precio
                  </p>
                </div>
                <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                  {/* Filter */}
                  <select value={apuVentaFilter} onChange={e=>setApuVentaFilter(e.target.value)}
                    style={{ padding:"6px 10px", border:"1px solid #E0E0E0", borderRadius:4, fontSize:11,
                      fontFamily:"'DM Sans',sans-serif" }}>
                    <option value="todos">Todos los capítulos</option>
                    {capIds.map(id => <option key={id} value={id}>{grouped[id].nombre}</option>)}
                  </select>
                  <button onClick={exportCSV}
                    style={{ padding:"6px 14px", background:"#fff", border:"1px solid #E0E0E0", borderRadius:4,
                      fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"'DM Sans',sans-serif",
                      display:"flex", alignItems:"center", gap:4 }}>
                    <Download size={12}/> CSV
                  </button>
                  <button onClick={exportPrint}
                    style={{ padding:"6px 14px", background:"#111", color:"#fff", border:"none", borderRadius:4,
                      fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"'DM Sans',sans-serif",
                      display:"flex", alignItems:"center", gap:4 }}>
                    <FileText size={12}/> PDF / Imprimir
                  </button>
                  <button onClick={() => setShowApuVentaViewer(false)}
                    style={{ background:"none", border:"none", cursor:"pointer", color:"#888", padding:4 }}>
                    <X size={18}/>
                  </button>
                </div>
              </div>

              {/* Params bar */}
              <div style={{ padding:"8px 22px", background:"#F5F4F1", borderBottom:"1px solid #E0E0E0",
                display:"flex", gap:20, flexShrink:0, fontSize:10, color:"#555" }}>
                <span>Margen: <strong>{(d.margen*100).toFixed(1)}%</strong></span>
                <span>GC: <strong>{((r.g||0)*100).toFixed(2)}%</strong></span>
                <span>GF: <strong>{((r.f||0)*100).toFixed(2)}%</strong></span>
                <span>IVA: <strong>{((d.tarifaIVA||0.19)*100).toFixed(0)}%</strong>{isObra ? " (sobre U)" : ""}</span>
                <span>Coef. mult: <strong>× {items.length > 0 ? calcPUVentaLinea(1,1,d).coefMult?.toFixed(4) : "—"}</strong></span>
                <span style={{ marginLeft:"auto", fontWeight:700, color:"#111111" }}>
                  Total coste: {fmtN2(grandTotalCoste,0)} · Total venta: {fmtN2(grandTotalVenta,0)} {moneda}
                </span>
              </div>

              {/* Table body */}
              <div style={{ overflowY:"auto", flex:1, padding:"0 22px 22px" }}>
                {items.length === 0 ? (
                  <div style={{ textAlign:"center", padding:"60px 0", color:"#888" }}>
                    <p style={{ fontSize:14 }}>No hay partidas con precio para mostrar APUs de venta.</p>
                    <p style={{ fontSize:11, marginTop:6 }}>Añade partidas con costo directo en el borrador.</p>
                  </div>
                ) : filteredGroups.map(capId => {
                  const g = grouped[capId];
                  const capTotalVenta = g.items.reduce((s,it) => s + it.v.pvp, 0);
                  const capTotalIVA = g.items.reduce((s,it) => s + it.ivaL, 0);
                  return (
                    <div key={capId}>
                      <h3 style={{ fontSize:12, fontWeight:700, margin:"18px 0 8px", padding:"8px 0 6px",
                        borderBottom:"2px solid #111", display:"flex", justifyContent:"space-between" }}>
                        <span>{g.nombre}</span>
                        <span style={{ fontFamily:"'DM Mono',monospace", color:"#111111" }}>
                          {fmtN2(capTotalVenta + capTotalIVA, 0)} {moneda}
                        </span>
                      </h3>
                      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                        <thead>
                          <tr style={{ background:"#FFFFFF" }}>
                            {["Descripción","Und","Cant","PU Coste","CD Total","GC","GF","Margen","PVP s/IVA","PU Venta","IVA","PVP c/IVA"].map(h => (
                              <th key={h} style={{ padding:"5px 6px", fontSize:8, fontWeight:700, color:"#888",
                                textTransform:"uppercase", letterSpacing:.4, textAlign: h==="Descripción"||h==="Und" ? "left" : "right",
                                borderBottom:"1px solid #E0E0E0" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {g.items.map(it => {
                            const total = it.v.pvp + it.ivaL;
                            return (
                              <tr key={it.id} style={{ borderBottom:"1px solid #F5F5F5" }}
                                onMouseEnter={e=>e.currentTarget.style.background="#FFFFFF"}
                                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                                <td style={{ padding:"6px", fontSize:11, maxWidth:200, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{it.descripcion||"—"}</td>
                                <td style={{ padding:"6px", fontSize:10, color:"#888" }}>{it.und||"—"}</td>
                                <td style={{ ...numStyle, padding:"6px" }}>{it.cantidad||1}</td>
                                <td style={{ ...numStyle, padding:"6px", color:"#888" }}>{fmtN2(it.v.puCoste,0)}</td>
                                <td style={{ ...numStyle, padding:"6px" }}>{fmtN2(it.v.cd,0)}</td>
                                <td style={{ ...numStyle, padding:"6px", color:"#888" }}>{fmtN2(it.v.gc,0)}</td>
                                <td style={{ ...numStyle, padding:"6px", color:"#888" }}>{fmtN2(it.v.gf,0)}</td>
                                <td style={{ ...numStyle, padding:"6px", color:"#D4A017" }}>{fmtN2(it.v.margenCOP,0)}</td>
                                <td style={{ ...numStyle, padding:"6px", fontWeight:700, color:"#3B3B3B" }}>{fmtN2(it.v.pvp,0)}</td>
                                <td style={{ ...numStyle, padding:"6px" }}>{fmtN2(it.v.puVenta,0)}</td>
                                <td style={{ ...numStyle, padding:"6px", color:"#888" }}>{fmtN2(it.ivaL,0)}</td>
                                <td style={{ ...numStyle, padding:"6px", fontWeight:700, color:"#111111" }}>{fmtN2(total,0)}</td>
                              </tr>
                            );
                          })}
                          {/* Subtotal row */}
                          <tr style={{ borderTop:"2px solid #111" }}>
                            <td colSpan={8} style={{ padding:"8px 6px", fontWeight:700, fontSize:11 }}>Subtotal {g.nombre}</td>
                            <td style={{ ...numStyle, padding:"8px 6px", fontWeight:700, color:"#3B3B3B" }}>{fmtN2(capTotalVenta,0)}</td>
                            <td style={{ ...numStyle, padding:"8px 6px" }}>—</td>
                            <td style={{ ...numStyle, padding:"8px 6px", color:"#888" }}>{fmtN2(capTotalIVA,0)}</td>
                            <td style={{ ...numStyle, padding:"8px 6px", fontWeight:700, color:"#111111" }}>{fmtN2(capTotalVenta+capTotalIVA,0)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  );
                })}

                {/* Grand total */}
                {items.length > 0 && (
                  <div style={{ marginTop:20, padding:"14px 0", borderTop:"3px solid #111",
                    display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontSize:16, fontWeight:700 }}>TOTAL VENTA</span>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontFamily:"'DM Mono',monospace", fontSize:18, fontWeight:700, color:"#111111" }}>
                        {fmtN2(grandTotalVenta + items.reduce((s,it) => { const v=calcPUVentaLinea(it.precioCD||0,it.cantidad||1,d); return s+(isObra?uVal*v.pvp*(d.tarifaIVA||0.19):v.pvp*(d.tarifaIVA||0.19)); },0),0)} {moneda}
                      </div>
                      <div style={{ fontSize:10, color:"#888", marginTop:2 }}>
                        sin IVA: {fmtN2(grandTotalVenta,0)} + IVA: {fmtN2(items.reduce((s,it)=>{const v=calcPUVentaLinea(it.precioCD||0,it.cantidad||1,d);return s+(isObra?uVal*v.pvp*(d.tarifaIVA||0.19):v.pvp*(d.tarifaIVA||0.19));},0),0)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {apuVentaOpen && (() => {
        const linea = lineas.find(l => l.id === apuVentaOpen);
        if (!linea || Number(linea.precioCD) <= 0) return null;
        const v = calcPUVentaLinea(Number(linea.precioCD), linea.cantidad||1, d);
        const isObra = d.tipoProyecto === "OBRA";
        const uVal = r.U || d.margen;
        const ivaLinea = isObra ? uVal * v.pvp * (d.tarifaIVA||0.19) : v.pvp * (d.tarifaIVA||0.19);
        const rowS = { display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:`1px solid ${C.border}`, fontSize:13 };
        const numS = { fontFamily:"'DM Mono',monospace", fontWeight:600 };
        return (
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center" }}
            onClick={() => setApuVentaOpen(null)}>
            <div onClick={e=>e.stopPropagation()}
              style={{ background:"#fff", borderRadius:8, padding:28, maxWidth:520, width:"90%", boxShadow:"0 12px 40px rgba(0,0,0,0.2)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                <div>
                  <h3 style={{ margin:0, fontSize:16, fontWeight:700 }}>APU de Venta</h3>
                  <p style={{ margin:"4px 0 0", fontSize:11, color:C.inkLight }}>{linea.descripcion || "Partida"} — Cant: {linea.cantidad||1} {linea.und||"und"}</p>
                </div>
                <button onClick={() => setApuVentaOpen(null)} style={{ background:"none", border:"none", cursor:"pointer", color:C.inkLight }}><X size={18}/></button>
              </div>
              <div style={rowS}><span>Costo directo (CD)</span><span style={numS}>{fmt(v.cd)}</span></div>
              <div style={rowS}><span style={{ color:C.inkMid, paddingLeft:12 }}>→ PU coste</span><span style={{...numS,color:C.inkMid}}>{fmt(v.puCoste)}</span></div>
              <div style={rowS}><span>Gastos contratación (GC) {pct(r.g||0)}</span><span style={numS}>{fmt(v.gc)}</span></div>
              <div style={rowS}><span>Gastos financieros (GF) {pct(r.f||0)}</span><span style={numS}>{fmt(v.gf)}</span></div>
              <div style={rowS}><span>Margen {pct(d.margen)}</span><span style={numS}>{fmt(v.margenCOP)}</span></div>
              <div style={{ ...rowS, fontWeight:700, fontSize:15, borderBottom:"2px solid #111" }}><span>PVP sin IVA</span><span style={numS}>{fmt(v.pvp)}</span></div>
              <div style={rowS}><span style={{ color:C.inkMid, paddingLeft:12 }}>→ PU venta</span><span style={{...numS,color:C.inkMid}}>{fmt(v.puVenta)}</span></div>
              <div style={rowS}><span>IVA {isObra ? `(U ${pct(uVal)} × ${pct(d.tarifaIVA)})` : pct(d.tarifaIVA)}</span><span style={numS}>{fmt(ivaLinea)}</span></div>
              <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", fontSize:16, fontWeight:700 }}><span>PVP con IVA</span><span style={{...numS,color:C.success}}>{fmt(v.pvp + ivaLinea)}</span></div>
              <div style={{ background:C.accentBg, borderRadius:4, padding:"8px 12px", fontSize:11, color:C.inkMid, marginTop:8 }}>
                Coef. multiplicador: <strong>× {v.coefMult?.toFixed(4)}</strong> · Denominador: <strong>{v.den?.toFixed(4)}</strong>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}


/* ─── TAB PLACEHOLDER ───────────────────────────────────────── */
function TabPlaceholder({ icon, title, desc }) {
  return (
    <div className="fade" style={{ display:"flex", alignItems:"center", justifyContent:"center",
      minHeight:320 }}>
      <div style={{ textAlign:"center", maxWidth:420 }}>
        <div style={{ fontSize:48, marginBottom:16 }}>{icon}</div>
        <h2 style={{ fontSize:20, fontWeight:700, color:C.ink, margin:"0 0 10px" }}>{title}</h2>
        <p style={{ fontSize:13, color:C.inkLight, lineHeight:1.6, margin:0 }}>{desc}</p>
      </div>
    </div>
  );
}

/* ─── FORM ───────────────────────────────────────────────────── */
const TABS = [
  { id: "general",    lbl: "General",          en: "General" },
  { id: "params",     lbl: "Parámetros",       en: "Parameters" },
  { id: "borrador",   lbl: "Borrador + APU",   en: "Draft + APU" },
  { id: "cronograma", lbl: "Cronograma",       en: "Schedule" },
  { id: "flujo",      lbl: "Flujo de caja",    en: "Cash Flow" },
  { id: "organigrama",lbl: "Organigrama",      en: "Org Chart" },
  { id: "gg",         lbl: "Gastos generales",  en: "Overhead" },
  { id: "insumos",    lbl: "Insumos",          en: "Supplies" },
  { id: "equipos",    lbl: "Equipos trabajo",  en: "Work Teams" },
  { id: "resumen",    lbl: "Resumen",           en: "Summary" },
  { id: "entrega",    lbl: "Entrega cliente",   en: "Client Delivery" },
];

function Form({ offers, editId, prefillData, onSave, onBack, lang }) {
  const base = editId ? offers.find(o => o.id === editId) : null;
  const [d, setD] = useState(() => ({
    ...TEMPLATE,
    ...(base || {}),
    ...((!editId && prefillData) ? prefillData : {}),
    id: base?.id || uid(), createdAt: base?.createdAt || today(), updatedAt: today(),
    planos: base?.planos || planosDefault(),
  }));
  const [tab, setTab] = useState("general");
  const [saved, setSaved] = useState(false);
  const set = (k, v) => setD(x => ({ ...x, [k]: v, updatedAt: today() }));
  const r = useMemo(() => calc(d), [d]);

  const doSave = () => { onSave(d); setSaved(true); setTimeout(() => setSaved(false), 2200); };

  const doCSV = () => {
    const rows = [
      ["Campo", "Valor"], ["Cliente", d.cliente], ["Proyecto", d.proyecto],
      ["Estado", d.estado], ["Tipo", d.tipoProyecto],
      ...(d.tipoProyecto === "DISEÑO" ? [["Modalidad", d.subtipoDiseno]] : []),
      ["Costo (COP)", r.COSTO], ["PVP sin IVA", r.PVP], ["IVA", r.IVA], ["PVP c/IVA", r.PVP_IVA],
      ["Margen $", r.margenCOP], ["Financieros", r.fin], ["Retenciones", r.ret], ["Neto", r.neto],
    ];
    const blob = new Blob(["\uFEFF" + rows.map(rw => rw.map(c => `"${c}"`).join(",")).join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `Oferta_${d.cliente || "Habitaris"}_${d.proyecto || "SN"}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="fade">
      {/* Header */}
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: C.inkMid, padding: 4 }}><ArrowLeft size={18} /></button>
          <div>
            <p style={{ fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: C.inkLight, margin: "0 0 3px" }}>
              {editId ? (lang==="en"?"Edit offer":"Editar oferta") : (lang==="en"?"New offer":"Nueva oferta")}
              {!editId && prefillData?.briefingId && <span style={{ marginLeft:8, background:"#E6F4EC", color:"#2B7A52", border:"1px solid #2B7A5233", borderRadius:2, padding:"1px 7px", fontSize:8, fontWeight:700, letterSpacing:.5 }}>📋 {lang==="en"?"FROM BRIEFING":"DESDE BRIEFING"}</span>}
            </p>
            <h1 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 22, fontWeight: 700, color: C.ink, margin: 0 }}>
              {d.cliente || (lang==="en"?"No client":"Sin cliente")}{d.proyecto ? ` · ${d.proyecto}` : ""}
            </h1>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn v="out" icon={Download} sm on={doCSV}>{lang==="en"?"Export CSV":"Exportar CSV"}</Btn>
          <Btn v="out" icon={FileText} sm on={() => window.print()}>PDF / {lang==="en"?"Print":"Imprimir"}</Btn>
          <Btn icon={Save} on={doSave} style={saved ? { background: C.success } : {}}>{saved ? (lang==="en"?"Saved!":"¡Guardado!") : (lang==="en"?"Save offer":"Guardar oferta")}</Btn>
        </div>
      </div>

      {/* Tabs */}
      <div className="no-print" style={{ display: "flex", borderBottom: `1px solid ${C.border}`, marginBottom: 22, overflowX: "auto", whiteSpace: "nowrap" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "10px 16px", border: "none", cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600,
            letterSpacing: 1, textTransform: "uppercase",
            background: "transparent",
            color: tab === t.id ? C.ink : C.inkLight,
            borderBottom: tab === t.id ? `2px solid ${C.ink}` : "2px solid transparent",
            transition: "all .15s", marginBottom: -1,
          }}>{lang==="en" && t.en ? t.en : t.lbl}</button>
        ))}
      </div>

      {tab === "general"    && <TGen d={d} set={set} offers={offers} />}
      {tab === "params"     && <TPar d={d} set={set} r={r} />}
      {tab === "borrador"   && <TBorrador d={d} set={set} r={r} />}
      {tab === "cronograma" && <TPla d={d} set={set} r={r} />}
      {tab === "flujo"      && <TFlu d={d} set={set} r={r} />}
      {tab === "organigrama" && <TOrg d={d} set={set} />}
      {tab === "gg"         && <TGG d={d} set={set} r={r} />}
      {tab === "insumos"    && <TMat d={d} set={set} r={r} />}
      {tab === "equipos"    && <TEqu d={d} set={set} />}
      {tab === "resumen"    && <TRes d={d} r={r} />}
      {tab === "entrega"    && <TEnt d={d} set={set} r={r} />}
    </div>
  );
}

/* ── General ── */
function TGen({ d, set, offers }) {
  const tipoInfo = TIPOS_INMUEBLE.find(t => t.val === d.tipoInmueble) || TIPOS_INMUEBLE[0];
  const actInfo  = ACTIVIDADES.find(a => a.cod === d.actividadCod) || ACTIVIDADES[0];
  const gruposActs = [...new Set(ACTIVIDADES.map(a => a.grupo))];
  const [briefings, setBriefings] = useState([]);
  const [showBriefingPicker, setShowBriefingPicker] = useState(false);
  const [showQuickBriefing, setShowQuickBriefing] = useState(false);
  useEffect(() => { loadBriefings().then(bs => setBriefings(bs)); }, []);

  // Auto-sync código oferta cuando cambia actividad/DC/rev
  const updateCodigo = (cod, dc, rev) => {
    const c = genCodigo(cod, dc, rev);
    set("codigoOferta", c);
  };

  // Auto-sync nombre cuando cambia lugar/referencia
  const updateNombre = (lugar, ref) => {
    set("proyecto", genNombreProyecto(d.tipoInmueble, lugar, ref));
  };

  const handleActChange = (cod) => {
    set("actividadCod", cod);
    updateCodigo(cod, d.digitoControl, d.revision);
  };
  const handleDCChange = (dc) => {
    set("digitoControl", dc);
    updateCodigo(d.actividadCod, dc, d.revision);
  };
  const handleRevChange = (rev) => {
    set("revision", rev);
    updateCodigo(d.actividadCod, d.digitoControl, rev);
  };
  const handleLugarChange = (v) => {
    set("lugarNombre", v);
    updateNombre(v, d.lugarReferencia);
  };
  const handleRefChange = (v) => {
    set("lugarReferencia", v);
    updateNombre(d.lugarNombre, v);
  };

  const codigoActual = d.codigoOferta || genCodigo(d.actividadCod, d.digitoControl, d.revision);

  return (
    <div className="fade">
      {/* Importar desde briefing — SIEMPRE VISIBLE */}
      {d.briefingId ? (
        <div style={{ background:"#E8F4EE", border:"1px solid #B8DEC9", borderRadius:8,
          padding:"10px 16px", marginBottom:16, display:"flex", alignItems:"center", gap:8 }}>
          <CheckCircle2 size={14} style={{ color:"#111111" }}/>
          <span style={{ fontSize:12, color:"#111111", fontWeight:600 }}>Oferta creada desde briefing</span>
        </div>
      ) : (
        <div style={{ background:"#F0F0F0", border:"1px solid #B8D4F0", borderRadius:8,
          padding:"12px 16px", marginBottom:16, display:"flex", alignItems:"center",
          justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <ClipboardList size={16} style={{ color:"#3B3B3B" }}/>
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:"#3B3B3B" }}>
                {briefings.length > 0
                  ? `${briefings.length} briefing${briefings.length>1?"s":""} disponible${briefings.length>1?"s":""}`
                  : "¿Tienes datos de un briefing?"}
              </div>
              <div style={{ fontSize:10, color:"#3B3B3B99" }}>
                {briefings.length > 0
                  ? "Importa los datos del cliente para pre-llenar la oferta"
                  : "Ingresa un briefing en Formularios y luego impórtalo aquí"}
              </div>
            </div>
          </div>
          <div style={{ display:"flex", gap:6 }}>
            {briefings.length > 0 && (
              <button onClick={() => setShowBriefingPicker(true)}
                style={{ padding:"6px 14px", background:"#3B3B3B", color:"#fff", border:"none",
                  borderRadius:6, cursor:"pointer", fontSize:11, fontWeight:700,
                  display:"flex", alignItems:"center", gap:5, fontFamily:"'DM Sans',sans-serif" }}>
                📋 Importar briefing
              </button>
            )}
            <button onClick={() => setShowQuickBriefing(true)}
              style={{ padding:"6px 14px", background: briefings.length > 0 ? "#fff" : "#3B3B3B",
                color: briefings.length > 0 ? "#3B3B3B" : "#fff",
                border: briefings.length > 0 ? "1px solid #3B3B3B33" : "none",
                borderRadius:6, cursor:"pointer", fontSize:11, fontWeight:600,
                display:"flex", alignItems:"center", gap:5, fontFamily:"'DM Sans',sans-serif" }}>
              ✏️ Ingresar rápido
            </button>
          </div>
        </div>
      )}
      {showBriefingPicker && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", zIndex:500,
          display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}
          onClick={e => e.target===e.currentTarget && setShowBriefingPicker(false)}>
          <div style={{ background:"#fff", borderRadius:10, maxWidth:520, width:"100%",
            maxHeight:"65vh", overflow:"hidden", display:"flex", flexDirection:"column",
            boxShadow:"0 20px 60px rgba(0,0,0,.2)" }}>
            <div style={{ padding:"14px 18px", borderBottom:"1px solid #E0E0E0",
              display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ fontWeight:700, fontSize:15 }}>Seleccionar briefing</div>
              <button onClick={() => setShowBriefingPicker(false)}
                style={{ background:"none", border:"none", cursor:"pointer", color:"#888" }}>
                <X size={18}/>
              </button>
            </div>
            <div style={{ overflowY:"auto", padding:14 }}>
              {briefings.map(b => (
                <div key={b.id} onClick={() => {
                  const imported = briefingToOffer(b);
                  Object.entries(imported).forEach(([k,v]) => set(k,v));
                  set("briefingId", b.id);
                  setShowBriefingPicker(false);
                }} style={{ padding:"12px 14px", border:"1px solid #E0E0E0", borderRadius:8,
                  marginBottom:8, cursor:"pointer" }}
                  onMouseEnter={e=>e.currentTarget.style.background="#F5F4F1"}
                  onMouseLeave={e=>e.currentTarget.style.background="#fff"}>
                  <div style={{ fontWeight:600, fontSize:13 }}>{b.nombre || "Sin nombre"}</div>
                  <div style={{ fontSize:11, color:"#888", marginTop:2 }}>
                    {b.email||"–"} · {new Date(b.creadoEn||Date.now()).toLocaleDateString("es-CO")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quick Briefing Entry Modal */}
      {showQuickBriefing && (() => {
        const QB_FIELDS = [
          { k:"nombre", l:"Nombre completo *", ph:"Juan Pérez", required:true },
          { k:"email", l:"Email", ph:"juan@mail.com", type:"email" },
          { k:"telefono", l:"WhatsApp", ph:"300 123 4567", type:"tel" },
          { k:"ciudad", l:"Ciudad", ph:"Bogotá" },
          { k:"edificio", l:"Edificio / Conjunto", ph:"Torres del Parque" },
          { k:"tipo_proyecto", l:"Tipo de proyecto", ph:"", sel:["Diseño interior","Remodelación","Obra nueva","Adecuación comercial","Otro"] },
          { k:"area_m2", l:"Área (m²)", ph:"80", type:"number" },
          { k:"presupuesto", l:"Presupuesto (COP)", ph:"50000000", type:"number" },
          { k:"lo_mas_importante", l:"¿Qué necesita el cliente?", ph:"Descripción breve del proyecto...", ta:true },
          { k:"razon_social", l:"Razón social", ph:"Empresa S.A.S" },
          { k:"documento", l:"NIT / Cédula", ph:"901.000.000-0" },
        ];
        return (
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", zIndex:500,
            display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}
            onClick={e => e.target===e.currentTarget && setShowQuickBriefing(false)}>
            <div style={{ background:"#fff", borderRadius:10, maxWidth:600, width:"100%",
              maxHeight:"80vh", overflow:"hidden", display:"flex", flexDirection:"column",
              boxShadow:"0 20px 60px rgba(0,0,0,.2)" }}>
              <div style={{ padding:"16px 20px", borderBottom:"1px solid #E0E0E0",
                display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:15 }}>✏️ Ingreso rápido de briefing</div>
                  <div style={{ fontSize:10, color:"#888", marginTop:2 }}>Los datos se importarán directamente a esta oferta</div>
                </div>
                <button onClick={() => setShowQuickBriefing(false)}
                  style={{ background:"none", border:"none", cursor:"pointer", color:"#888" }}>
                  <X size={18}/>
                </button>
              </div>
              <div style={{ overflowY:"auto", padding:"16px 20px" }} id="qb-form">
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  {QB_FIELDS.map(f => (
                    <div key={f.k} style={f.ta ? { gridColumn:"1/-1" } : {}}>
                      <label style={{ display:"block", fontSize:9, fontWeight:600, color:"#888",
                        marginBottom:3, textTransform:"uppercase", letterSpacing:1 }}>{f.l}</label>
                      {f.sel ? (
                        <select data-qb={f.k} defaultValue=""
                          style={{ width:"100%", padding:"8px 10px", border:"1px solid #E0E0E0", borderRadius:4,
                            fontSize:12, fontFamily:"'DM Sans',sans-serif" }}>
                          <option value="">Seleccionar...</option>
                          {f.sel.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : f.ta ? (
                        <textarea data-qb={f.k} rows={2} placeholder={f.ph}
                          style={{ width:"100%", padding:"8px 10px", border:"1px solid #E0E0E0", borderRadius:4,
                            fontSize:12, fontFamily:"'DM Sans',sans-serif", resize:"vertical", boxSizing:"border-box" }}/>
                      ) : (
                        <input data-qb={f.k} type={f.type||"text"} placeholder={f.ph}
                          style={{ width:"100%", padding:"8px 10px", border:"1px solid #E0E0E0", borderRadius:4,
                            fontSize:12, fontFamily:"'DM Sans',sans-serif", boxSizing:"border-box" }}/>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ padding:"12px 20px", borderTop:"1px solid #E0E0E0", display:"flex", gap:8, justifyContent:"flex-end" }}>
                <button onClick={async () => {
                  // Collect values
                  const bData = { id: Math.random().toString(36).slice(2,9)+Date.now().toString(36), fecha:new Date().toISOString().split("T")[0] };
                  document.querySelectorAll("[data-qb]").forEach(el => {
                    const k = el.getAttribute("data-qb");
                    if (el.value) bData[k] = el.value;
                  });
                  if (!bData.nombre) { alert("El nombre es obligatorio"); return; }
                  // Save as briefing
                  await saveBriefingEntry(bData);
                  setBriefings(prev => [bData, ...prev]);
                  // Import to current offer
                  const imported = briefingToOffer(bData);
                  Object.entries(imported).forEach(([k,v]) => set(k,v));
                  set("briefingId", bData.id);
                  setShowQuickBriefing(false);
                }}
                  style={{ padding:"8px 20px", background:"#111", color:"#fff", border:"none", borderRadius:6,
                    cursor:"pointer", fontSize:12, fontWeight:700, fontFamily:"'DM Sans',sans-serif" }}>
                  Importar a esta oferta
                </button>
                <button onClick={async () => {
                  const bData = { id: Math.random().toString(36).slice(2,9)+Date.now().toString(36), fecha:new Date().toISOString().split("T")[0] };
                  document.querySelectorAll("[data-qb]").forEach(el => {
                    const k = el.getAttribute("data-qb");
                    if (el.value) bData[k] = el.value;
                  });
                  if (!bData.nombre) { alert("El nombre es obligatorio"); return; }
                  await saveBriefingEntry(bData);
                  setBriefings(prev => [bData, ...prev]);
                  setShowQuickBriefing(false);
                  alert("✅ Briefing guardado. Puedes importarlo cuando quieras.");
                }}
                  style={{ padding:"8px 20px", background:"transparent", color:"#555", border:"1px solid #E0E0E0",
                    borderRadius:6, cursor:"pointer", fontSize:12, fontFamily:"'DM Sans',sans-serif" }}>
                  Solo guardar briefing
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <Card style={{ padding: 22 }}>
          <STitle t="Codificación del proyecto" s="Código automático según formato Habitaris" />

        {/* Selector actividad agrupado */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: C.inkLight, marginBottom: 5, textTransform: "uppercase", letterSpacing: 1 }}>Tipo de actividad</label>
          <select value={d.actividadCod} onChange={e => handleActChange(e.target.value)}
            style={{ width: "100%", padding: "9px 12px", border: `1px solid ${C.border}`, borderRadius: 2, fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: C.ink, background: C.bg }}
            onFocus={e => e.target.style.borderColor = C.ink}
            onBlur={e => e.target.style.borderColor = C.border}>
            {gruposActs.map(g => (
              <optgroup key={g} label={g}>
                {ACTIVIDADES.filter(a => a.grupo === g).map(a => (
                  <option key={a.cod} value={a.cod}>{a.cod} — {a.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <FI lbl="Dígito de control" val={d.digitoControl}
            on={e => handleDCChange(e.target.value)} ph="01"
            note="2 dígitos — orden del día" />
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: C.inkLight, marginBottom: 5, textTransform: "uppercase", letterSpacing: 1 }}>Revisión</label>
            <select value={d.revision} onChange={e => handleRevChange(+e.target.value)}
              style={{ width: "100%", padding: "9px 12px", border: `1px solid ${C.border}`, borderRadius: 2, fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: C.ink, background: C.bg }}
              onFocus={e => e.target.style.borderColor = C.ink}
              onBlur={e => e.target.style.borderColor = C.border}>
              {[0,1,2,3,4,5,6,7,8,9].map(n => <option key={n} value={n}>R{String(n).padStart(2,"0")}</option>)}
            </select>
          </div>
        </div>

        {/* Código generado */}
        <div style={{ background: C.ink, borderRadius: 2, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ margin: "0 0 3px", fontSize: 9, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1.5 }}>Código de oferta</p>
            <p style={{ margin: 0, fontFamily: "'DM Sans', sans-serif", fontSize: 16, fontWeight: 700, color: "#fff", letterSpacing: 1.5 }}>{codigoActual}</p>
          </div>
          <button onClick={() => navigator.clipboard?.writeText(codigoActual)}
            style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 2, padding: "6px 12px", color: "#fff", fontFamily: "'DM Sans', sans-serif", fontSize: 10, cursor: "pointer", letterSpacing: 0.8 }}>
            COPIAR
          </button>
        </div>
      </Card>

      {/* NOMBRE DEL PROYECTO */}
      <Card style={{ padding: 22 }}>
        <STitle t="Identificación del proyecto" s="Nombre automático según tipo de inmueble" />

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: C.inkLight, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Tipo de inmueble</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {TIPOS_INMUEBLE.map(t => (
              <button key={t.val} onClick={() => set("tipoInmueble", t.val)} style={{
                padding: "5px 12px", borderRadius: 2, border: `1px solid ${d.tipoInmueble === t.val ? C.ink : C.border}`,
                fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: d.tipoInmueble === t.val ? 700 : 400,
                background: d.tipoInmueble === t.val ? C.ink : "transparent",
                color: d.tipoInmueble === t.val ? "#fff" : C.inkMid, cursor: "pointer", transition: "all .15s"
              }}>{t.label}</button>
            ))}
          </div>
        </div>

        <FI lbl={tipoInfo.ph1} val={d.lugarNombre}       on={e => handleLugarChange(e.target.value)}  ph={`Ej: ${tipoInfo.ph1}`} />
        <FI lbl={tipoInfo.ph2} val={d.lugarReferencia}   on={e => handleRefChange(e.target.value)}    ph={tipoInfo.ph2} />

        {/* Nombre generado */}
        <div style={{ background: C.accentBg, borderRadius: 2, padding: "12px 16px", border: `1px solid ${C.borderMid}`, marginBottom: 14 }}>
          <p style={{ margin: "0 0 3px", fontSize: 9, color: C.inkLight, textTransform: "uppercase", letterSpacing: 1.5 }}>Nombre del proyecto</p>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.ink }}>{d.proyecto || <span style={{ color: C.inkLight, fontWeight: 400 }}>Se completará automáticamente</span>}</p>
        </div>

        <FI lbl="Cliente / Empresa"  val={d.cliente}   on={e => set("cliente", e.target.value)}   ph="Nombre del cliente" />
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <FI lbl="Email cliente"    val={d.emailCliente||""}   on={e => set("emailCliente", e.target.value)}   ph="cliente@email.com" />
          <FI lbl="Teléfono cliente" val={d.telCliente||""}     on={e => set("telCliente", e.target.value)}     ph="+57 300 000 0000" />
        </div>
        <FI lbl="Ciudad / Barrio"    val={d.ubicacion} on={e => set("ubicacion", e.target.value)} ph="Ej: Bogotá, Chapinero" />
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <FI lbl="Fecha inicio estimada" type="date" val={d.fechaInicio||""} on={e => set("fechaInicio", e.target.value)} />
          <FI lbl="Fecha entrega estimada" type="date" val={d.fechaEntrega||""} on={e => set("fechaEntrega", e.target.value)} />
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <FS lbl="Firma / Representante" val={d.firmaRepresentante||"David Parra Galera"} on={e => set("firmaRepresentante", e.target.value)}
            opts={["David Parra Galera","Ana María Díaz Buitrago"]} />
          <FI lbl="Elaborado por" val={d.elaboradoPor||""} on={e => set("elaboradoPor", e.target.value)} ph="Nombre de quien elabora" />
        </div>
        <FS lbl="Estado"             val={d.estado}    on={e => set("estado", e.target.value)}    opts={ESTADOS} />
      </Card>

      {/* NOTAS Y RELACIONES */}
      <Card style={{ padding: 22, gridColumn: "1 / -1" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div>
            <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: C.inkLight, marginBottom: 5, textTransform: "uppercase", letterSpacing: 1 }}>Notas internas</label>
            <textarea value={d.notas} onChange={e => set("notas", e.target.value)} rows={3}
              placeholder="Observaciones, acuerdos, follow-ups..."
              style={{ width: "100%", padding: "9px 12px", border: `1px solid ${C.border}`, borderRadius: 2, fontFamily: "'DM Sans', sans-serif", fontSize: 12, background: C.bg, resize: "vertical", color: C.ink }} />
          </div>
          <div>
            <FS lbl="Relacionada con oferta" val={d.relacionadaCon || ""} on={e => set("relacionadaCon", e.target.value || null)}
              note="Vincula a una revisión o variante anterior"
              opts={[{ v: "", l: "— Ninguna —" }, ...offers.filter(o => o.id !== d.id).map(o => ({ v: o.id, l: `${o.codigoOferta || o.cliente} · ${o.proyecto || "sin nombre"}` }))]} />
            <div style={{ background: C.accentBg, borderRadius: 2, padding: "10px 14px", fontSize: 11, color: C.inkMid }}>
              Creada: <strong>{d.createdAt}</strong> · Actualizada: <strong>{d.updatedAt}</strong>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Alcance y descripción del servicio ── */}
      <Card style={{ padding:22, marginTop:16 }}>
        <STitle t="Alcance del proyecto" s="Descripción del servicio para la propuesta" />
        <div style={{ display:"flex", gap:6, marginBottom:10 }}>
          {(d.tipoProyecto === "OBRA"
            ? [["obra_integral","Obra integral"],["obra_parcial","Obra parcial"],["remodelacion","Remodelación"],["custom","Personalizado"]]
            : [["diseno_integral","Diseño integral"],["diseno_espacios","Diseño de espacios"],["consultoria","Consultoría"],["custom","Personalizado"]]
          ).map(([k,lbl])=>(
            <button key={k} onClick={()=>{
              set("alcanceTipo", k);
              if (k !== "custom") {
                const templates = {
                  obra_integral: "El presente presupuesto comprende la ejecución integral de obra civil, acabados e instalaciones del proyecto, incluyendo:\n\n• Obra civil: cimentación, estructura, mampostería, cubierta\n• Instalaciones: hidrosanitarias, eléctricas, gas, red de datos\n• Acabados: pisos, enchapes, pintura, carpintería metálica y en madera\n• Equipamiento fijo: cocina, baños, closets\n\nNo incluye: mobiliario suelto, electrodomésticos, decoración ni paisajismo exterior salvo que se indique expresamente.",
                  obra_parcial: "El presente presupuesto comprende la ejecución parcial de las actividades indicadas en el borrador de costes, según las especificaciones técnicas acordadas.\n\nEl alcance se limita estrictamente a las partidas incluidas en el presupuesto detallado. Cualquier trabajo adicional será objeto de una adenda o presupuesto complementario.",
                  remodelacion: "El presente presupuesto comprende los trabajos de remodelación del espacio indicado, incluyendo:\n\n• Demoliciones y retiro de escombros\n• Modificaciones en instalaciones existentes\n• Nuevos acabados según diseño aprobado\n• Carpintería y mobiliario fijo indicado\n\nSe asume que la estructura existente se encuentra en buen estado. Cualquier refuerzo estructural requerido será presupuestado aparte.",
                  diseno_integral: "El servicio de diseño integral comprende:\n\n• Levantamiento y diagnóstico del espacio existente\n• Propuesta conceptual y desarrollo de concepto\n• Diseño arquitectónico: plantas, cortes, fachadas\n• Diseño interior: selección de materiales, mobiliario, iluminación\n• Planos técnicos de detalle para ejecución\n• Especificaciones técnicas y libro de acabados\n• Acompañamiento en la selección de proveedores\n\nIncluye hasta 2 rondas de ajustes por etapa de diseño.",
                  diseno_espacios: "El servicio de diseño de espacios comprende:\n\n• Análisis funcional del espacio\n• Propuesta de distribución y layout\n• Selección de paleta de materiales y acabados\n• Renders 3D fotorrealistas (3 vistas principales)\n• Planos de mobiliario y especificaciones\n\nNo incluye planos técnicos de instalaciones ni dirección de obra.",
                  consultoria: "El servicio de consultoría incluye:\n\n• Visita técnica al sitio\n• Informe de diagnóstico y recomendaciones\n• Estimación presupuestaria de referencia\n• Cronograma indicativo\n\nNo incluye desarrollo de diseño ni planos técnicos."
                };
                set("alcanceTexto", templates[k] || "");
              }
            }}
              style={{ padding:"6px 12px", fontSize:10, fontWeight:600, cursor:"pointer",
                border:`1px solid ${d.alcanceTipo===k?C.ink:C.border}`, borderRadius:4,
                background:d.alcanceTipo===k?C.ink:"#fff", color:d.alcanceTipo===k?"#fff":C.inkMid,
                fontFamily:"'DM Sans',sans-serif" }}>
              {lbl}
            </button>
          ))}
        </div>
        <textarea value={d.alcanceTexto||""} onChange={e=>set("alcanceTexto",e.target.value)}
          rows={10} placeholder="Describe el alcance del servicio..."
          style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:4,
            padding:"10px 12px", fontSize:12, fontFamily:"'DM Sans',sans-serif",
            resize:"vertical", lineHeight:1.6, background:C.bg, color:C.ink }}/>
        <p style={{ fontSize:10, color:C.inkLight, marginTop:6, margin:0 }}>
          Este texto aparecerá en la sección "Alcance" del documento de entrega al cliente.
        </p>
      </Card>
    </div>
    </div>
  );
}
function TPar({ d, set, r }) {
  const pais = d.pais || "CO";

  // Auto-fill retenciones when tipoCliente or pais changes
  const autoFillRete = (tipoCliente, paisVal) => {
    if (paisVal === "CO") {
      if (tipoCliente === "PN") {
        set("pctReteFuente", 0.02);   // 2% sobre servicios hasta 100 UVT
        set("pctReteICA",   0.009);   // 0.9% Bogotá
        set("pctReteIVA",   0.15);    // 15% del IVA
      } else { // EMPRESA
        set("pctReteFuente", 0.035);  // 3.5% servicios en general
        set("pctReteICA",   0.009);
        set("pctReteIVA",   0.15);
      }
    } else { // ES
      set("pctReteFuente", 0.15);    // IRPF 15% profesionales
      set("pctReteICA",   0);
      set("pctReteIVA",   0);
    }
  };

  return (
    <>
    <div className="fade" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
      <Card style={{ padding: 22 }}>
        <STitle t="País y Tipo Fiscal" s="Localización y márgenes" />
        <div style={{ marginBottom: 14 }}>
          <label style={{ display:"block", fontSize:10, fontWeight:600, color:"#999", marginBottom:5, textTransform:"uppercase", letterSpacing:1 }}>País / Mercado</label>
          <div style={{ display:"flex", gap:6 }}>
            {[{id:"CO",flag:"🇨🇴",label:"Colombia"},{id:"ES",flag:"🇪🇸",label:"España"}].map(p => (
              <button key={p.id} onClick={() => { set("pais", p.id); set("divisa", p.id==="CO"?"COP":"EUR"); set("tarifaIVA", p.id==="CO"?0.19:0.10); }}
                style={{ flex:1, padding:"7px 4px", border:`2px solid ${pais===p.id?(p.id==="CO"?"#111111":"#3B3B3B"):"#E0E0E0"}`, borderRadius:6,
                  background:pais===p.id?(p.id==="CO"?"#E8F4EE":"#F0F0F0"):"transparent",
                  cursor:"pointer", fontSize:12, fontWeight:pais===p.id?700:400,
                  color:pais===p.id?(p.id==="CO"?"#111111":"#3B3B3B"):"#555", fontFamily:"'DM Sans',sans-serif" }}>
                {p.flag} {p.label}
              </button>
            ))}
          </div>
        </div>
        <FS lbl="Tipo fiscal"                val={d.tipoProyecto}  on={e => set("tipoProyecto", e.target.value)}  opts={["OBRA", "DISEÑO"]} note="OBRA → IVA sobre utilidad · DISEÑO → IVA pleno" />
        <FI lbl={pais==="CO"?"Tarifa IVA":"IVA (21%=general, 10%=obra, 4%=superred.)"}
                                             type="number" val={(d.tarifaIVA * 100).toFixed(0)} on={e => set("tarifaIVA", +e.target.value / 100)} rt="%" step="1" />
        {/* ═══ MODO MARGEN vs AIU (solo OBRA CO) ═══ */}
        {d.pais === "CO" && d.tipoProyecto === "OBRA" ? (<>
          <div style={{ marginBottom:10, marginTop:6 }}>
            <label style={{ display:"block", fontSize:10, fontWeight:600, color:"#999", marginBottom:5, textTransform:"uppercase", letterSpacing:1 }}>Modo de cálculo (OBRA)</label>
            <div style={{ display:"flex", gap:0 }}>
              {[{id:"margen",lbl:"Margen"},{id:"aiu",lbl:"AIU"}].map(opt=>(
                <button key={opt.id} onClick={()=>set("modoCalcObra",opt.id)}
                  style={{ flex:1, padding:"8px 12px", fontSize:12, cursor:"pointer", fontWeight:600,
                    border:`1px solid #111`, fontFamily:"'DM Sans',sans-serif",
                    borderRadius:opt.id==="margen"?"6px 0 0 6px":"0 6px 6px 0",
                    background:(d.modoCalcObra||"margen")===opt.id?"#111":"#fff",
                    color:(d.modoCalcObra||"margen")===opt.id?"#fff":"#555" }}>
                  {opt.lbl}
                </button>
              ))}
            </div>
          </div>
          {(d.modoCalcObra||"margen") === "margen" ? (<>
            <FI lbl="Margen (%)" type="number" val={(d.margen * 100).toFixed(1)} on={e => set("margen", +e.target.value / 100)} rt="%" step="0.1"
              note={`PVP = CD / ${(1 - d.margen).toFixed(2)} (ej: 30% → /0.70, 20% → /0.80)`} />
            <FI lbl="U declarada para IVA (%)" type="number" val={((d.uDecl||0.10)*100).toFixed(1)} on={e => set("uDecl", +e.target.value / 100)} rt="%" step="0.1"
              note="Solo para calcular el IVA sobre utilidad. No afecta al PVP." />
            <div style={{ background:C.accentBg, borderRadius:4, padding:"8px 12px", fontSize:11, color:C.inkMid }}>
              PVP = CD / <strong>{(1 - d.margen).toFixed(2)}</strong> · IVA = U <strong>{((d.uDecl||0.10)*100).toFixed(1)}%</strong> × PVP × <strong>{(d.tarifaIVA*100).toFixed(0)}%</strong> = {fmt(r.IVA)}
            </div>
          </>) : (<>
            <FI lbl="A — Administración (%)" type="number" val={((d.aiuA||0.08)*100).toFixed(1)} on={e => set("aiuA", +e.target.value / 100)} rt="%" step="0.1" />
            <FI lbl="I — Imprevistos (%)" type="number" val={((d.aiuI||0.03)*100).toFixed(1)} on={e => set("aiuI", +e.target.value / 100)} rt="%" step="0.1" />
            <FI lbl="U — Utilidad (%)" type="number" val={((d.aiuU||0.07)*100).toFixed(1)} on={e => set("aiuU", +e.target.value / 100)} rt="%" step="0.1" />
            <div style={{ background:C.accentBg, borderRadius:4, padding:"8px 12px", fontSize:11, color:C.inkMid }}>
              AIU = <strong>{(((d.aiuA||0.08)+(d.aiuI||0.03)+(d.aiuU||0.07))*100).toFixed(1)}%</strong> sobre CD ·
              IVA = U <strong>{((d.aiuU||0.07)*100).toFixed(1)}%</strong> × PVP × <strong>{(d.tarifaIVA*100).toFixed(0)}%</strong> = {fmt(r.IVA)}
            </div>
          </>)}
        </>) : (<>
          <FI lbl="Margen objetivo" type="number" val={(d.margen * 100).toFixed(1)} on={e => set("margen", +e.target.value / 100)} rt="%" step="0.1"
            note="Para cálculo del PVP" />
          <div style={{ background: C.accentBg, borderRadius: 4, padding: "8px 12px", fontSize: 11, color: C.inkMid }}>
            IVA {d.pais==="ES"?"ES":"DISEÑO"} = IVA pleno sobre <strong>PVP completo</strong> = {fmt(r.IVA)}
          </div>
        </>)}
        {pais === "ES" && (<>
          <FI lbl="% Gastos Generales (GG)" type="number" val={((d.gg||0.13)*100).toFixed(1)} on={e => set("gg", +e.target.value/100)} rt="%" step="0.1" />
          <FI lbl="% Beneficio Industrial (BI)" type="number" val={((d.bi||0.06)*100).toFixed(1)} on={e => set("bi", +e.target.value/100)} rt="%" step="0.1" />
        </>)}
      </Card>
      <Card style={{ padding: 22 }}>
        <STitle t="Gastos de Contratación (GC)" s="Coste directo — llevan margen" />
        <FI lbl="% RCE"                   type="number" val={(d.pctRCE * 100).toFixed(2)}  on={e => set("pctRCE", +e.target.value / 100)} rt="%" step="0.01" />
        <FI lbl="% TRC"                   type="number" val={(d.pctTRC * 100).toFixed(2)}  on={e => set("pctTRC", +e.target.value / 100)} rt="%" step="0.01" />
        <FI lbl="% Adm. contratación PH"  type="number" val={(d.pctAdm * 100).toFixed(2)}  on={e => set("pctAdm", +e.target.value / 100)} rt="%" step="0.01" />
        <FI lbl="% ICA (Bogotá)"          type="number" val={(d.pctICA * 100).toFixed(2)}  on={e => set("pctICA", +e.target.value / 100)} rt="%" step="0.01" />
        <div style={{ background:C.accentBg, borderRadius:4, padding:"8px 12px", fontSize:11, color:C.inkMid, marginTop:6 }}>
          Total GC: <strong>{pct((d.pctRCE||0)+(d.pctTRC||0)+(d.pctAdm||0)+(d.pctICA||0))}</strong> — sobre PVP, llevan margen
        </div>
      </Card>
      <Card style={{ padding: 22 }}>
        <STitle t="Retenciones" s="Solo impactan flujo de caja" />
        <FS lbl="Tipo de cliente" val={d.tipoCliente} on={e => { set("tipoCliente", e.target.value); autoFillRete(e.target.value, pais); }} opts={["PN", "EMPRESA"]}
           note={pais==="CO" ? (d.tipoCliente==="PN" ? "PN → ReteFuente 2% · ReteICA 0.9% · ReteIVA 15%" : "Empresa → ReteFuente 3.5% · ReteICA 0.9% · ReteIVA 15%") : "ES → IRPF 15%"} />
        <FI lbl="% ReteFuente" type="number" val={(d.pctReteFuente * 100).toFixed(2)} on={e => set("pctReteFuente", +e.target.value / 100)} rt="%" step="0.01" />
        <FI lbl="% ReteICA"    type="number" val={(d.pctReteICA * 100).toFixed(2)}    on={e => set("pctReteICA", +e.target.value / 100)}    rt="%" step="0.01" />
        <FI lbl="% ReteIVA"    type="number" val={(d.pctReteIVA * 100).toFixed(2)}    on={e => set("pctReteIVA", +e.target.value / 100)}    rt="%" step="0.01" />
        <div style={{ background: C.accentBg, borderRadius: 2, padding: "10px 14px", fontSize: 11, color: C.inkMid, marginTop: 8 }}>
          Total retenciones: <strong>{pct(d.pctReteFuente + d.pctReteICA + d.pctReteIVA)}</strong>
        </div>
      </Card>
    </div>
    {/* ── FILA 2: Condiciones de Pago + GF ── */}
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginTop:20 }}>
      <Card style={{ padding: 22 }}>
        <STitle t="Condiciones de pago" s="Para el documento de entrega al cliente" />
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
          {[
            ["Anticipo / firma",    "condPct1", 0.30],
            ["Avance 50%",          "condPct2", 0.30],
            ["Entrega final",       "condPct3", 0.30],
            ["Retención (30 días)", "condPct4", 0.10],
          ].map(([lbl, key, def]) => (
            <div key={key}>
              <label style={{ display:"block", fontSize:10, fontWeight:600, color:"#999", marginBottom:4, textTransform:"uppercase", letterSpacing:1 }}>{lbl}</label>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <input type="number" value={((d[key]??def)*100).toFixed(0)} min={0} max={100}
                  onChange={e => set(key, +e.target.value/100)}
                  style={{ width:60, border:`1px solid ${C.border}`, borderRadius:4, padding:"6px 8px", fontSize:13, fontFamily:"'DM Sans',sans-serif", background:C.bg, textAlign:"right" }}/>
                <span style={{ fontSize:11, color:C.inkLight }}>%</span>
                <span style={{ fontSize:11, color:C.inkLight }}>= {fmt((d[key]??def) * (r.PVP||0))}</span>
              </div>
            </div>
          ))}
        </div>
        <div style={{ fontSize:11, color: Math.abs(((d.condPct1??0.30)+(d.condPct2??0.30)+(d.condPct3??0.30)+(d.condPct4??0.10))-1) < 0.001 ? C.success : C.warning }}>
          Total: {(((d.condPct1??0.30)+(d.condPct2??0.30)+(d.condPct3??0.30)+(d.condPct4??0.10))*100).toFixed(0)}%
          {Math.abs(((d.condPct1??0.30)+(d.condPct2??0.30)+(d.condPct3??0.30)+(d.condPct4??0.10))-1) >= 0.001 ? " ⚠️ debe sumar 100%" : " ✓"}
        </div>
      </Card>
      <Card style={{ padding: 22 }}>
        <STitle t="Gastos Financieros (GF)" s="NO llevan margen · Editables" />
        {/* Mode selector */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:6, marginBottom:10 }}>
          {[["PSE","PSE"],["Tarjeta","Tarjeta"],["Transferencia","Transf."],["Manual","Manual"]].map(([val,lbl])=>(
            <button key={val} onClick={()=>set("medioPago",val)}
              style={{ padding:"5px 6px", fontSize:10, fontWeight:600, cursor:"pointer",
                border:`1px solid ${d.medioPago===val?C.ink:C.border}`, borderRadius:4,
                background:d.medioPago===val?C.ink:"#fff",
                color:d.medioPago===val?"#fff":C.inkMid, fontFamily:"'DM Sans',sans-serif" }}>
              {lbl}
            </button>
          ))}
        </div>
        {/* Always-visible rate inputs */}
        {d.medioPago === "PSE" && (
          <div style={{ marginBottom:8 }}>
            <label style={{ display:"block", fontSize:9, fontWeight:600, color:"#999", marginBottom:3, textTransform:"uppercase", letterSpacing:0.8 }}>Banco PSE</label>
            <select value={d.bancoPSE||"custom"} onChange={e => {
              const sel = e.target.value; set("bancoPSE", sel);
              const tasas = {bancolombia:0.01,davivienda:0.009,nequi:0.012,bbva:0.01};
              if(tasas[sel]!==undefined) set("pctComPSE", tasas[sel]);
            }} style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:4, padding:"5px 8px", fontSize:12, fontFamily:"'DM Sans',sans-serif", background:C.bg }}>
              {[["bancolombia","Bancolombia (1.0%)"],["davivienda","Davivienda (0.9%)"],["nequi","Nequi (1.2%)"],["bbva","BBVA (1.0%)"],["custom","Otro"]].map(([v,l])=><option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        )}
        {d.medioPago === "Tarjeta" && (
          <div style={{ marginBottom:8 }}>
            <label style={{ display:"block", fontSize:9, fontWeight:600, color:"#999", marginBottom:3, textTransform:"uppercase", letterSpacing:0.8 }}>Pasarela</label>
            <select value={d.pasarelaTarjeta||"custom"} onChange={e => {
              const sel = e.target.value; set("pasarelaTarjeta", sel);
              const tasas = {wompi:0.029,getnet:0.025,epayco:0.032,mercadopago:0.0349,redsys:0.005};
              if(tasas[sel]!==undefined) set("pctComTarjeta", tasas[sel]);
            }} style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:4, padding:"5px 8px", fontSize:12, fontFamily:"'DM Sans',sans-serif", background:C.bg }}>
              {(pais==="CO"
                ? [["wompi","Wompi (2.9%)"],["getnet","Getnet (2.5%)"],["epayco","ePayco (3.2%)"],["mercadopago","M.Pago (3.49%)"],["custom","Otra"]]
                : [["redsys","Redsys (0.5%)"],["custom","Otra"]]
              ).map(([v,l])=><option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        )}
        <FI lbl={d.medioPago==="PSE"?"Tasa PSE (% sin IVA)":d.medioPago==="Tarjeta"?"Tasa tarjeta (% sin IVA)":d.medioPago==="Manual"?"Comisión manual (%)":"Tasa transferencia (%)"}
          type="number"
          val={((d.medioPago==="PSE"?(d.pctComPSE??0.012):d.medioPago==="Tarjeta"?(d.pctComTarjeta??0.036):d.medioPago==="Manual"?(d.pctComManual??0):(d.pctComTransf??0))*100).toFixed(2)}
          on={e => {
            const v = +e.target.value/100;
            if(d.medioPago==="PSE") set("pctComPSE",v);
            else if(d.medioPago==="Tarjeta") set("pctComTarjeta",v);
            else if(d.medioPago==="Manual") set("pctComManual",v);
            else set("pctComTransf",v);
          }} rt="%" step="0.01" />
        {d.medioPago !== "Manual" && (
          <FI lbl="IVA sobre comisión" type="number" val={((d.ivaComision??0.19)*100).toFixed(0)} on={e=>set("ivaComision",+e.target.value/100)} rt="%" step="1" />
        )}
        <FS lbl="Aplicar 4×1000" val={d.aplicar4x1000} on={e => set("aplicar4x1000", e.target.value)} opts={["SI", "NO"]} />
        <div style={{ background:"#FFF8E7", borderRadius:4, padding:"8px 12px", fontSize:11, color:"#8C6A00", marginTop:6, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span>Total GF: <strong>{pct(r.f||0)}</strong> = {fmt(r.fin||0)}</span>
          <button onClick={()=>{
            set("pctComPSE",0.012); set("pctComTarjeta",0.036); set("pctComTransf",0);
            set("pctComManual",0); set("ivaComision", pais==="CO"?0.19:0.21); set("aplicar4x1000","SI");
          }} style={{ background:"none", border:"1px solid #C9A254", borderRadius:3, padding:"2px 8px", fontSize:9, fontWeight:600, color:"#8C6A00", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
            Restablecer
          </button>
        </div>
      </Card>
    </div>

    {/* ── REPRESENTANTES Y FIRMA ── */}
    <Card style={{ padding:22, marginTop:20 }}>
      <STitle t="Representantes Habitaris" s="Para documentos de entrega y firma" />
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginTop:10 }}>
        <div>
          <label style={{ display:"block", fontSize:10, fontWeight:600, color:"#999", marginBottom:5, textTransform:"uppercase", letterSpacing:1 }}>Firma del documento</label>
          <select value={d.firmaRepresentante||"David Parra Galera"}
            onChange={e => set("firmaRepresentante", e.target.value)}
            style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:4, padding:"8px 10px",
              fontSize:13, fontFamily:"'DM Sans',sans-serif", background:C.bg }}>
            <option value="David Parra Galera">David Parra Galera — Dir. Ejecutivo y Producción</option>
            <option value="Ana María Díaz Buitrago">Ana María Díaz Buitrago — Dir. Creativa y Diseño</option>
          </select>
        </div>
        <div>
          <label style={{ display:"block", fontSize:10, fontWeight:600, color:"#999", marginBottom:5, textTransform:"uppercase", letterSpacing:1 }}>Elaborado por</label>
          <input value={d.elaboradoPor||""} onChange={e => set("elaboradoPor", e.target.value)}
            placeholder="Nombre de quien elaboró la oferta"
            style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:4, padding:"8px 10px",
              fontSize:13, fontFamily:"'DM Sans',sans-serif", background:C.bg, marginBottom:6 }}/>
          <label style={{ display:"block", fontSize:10, fontWeight:600, color:"#999", marginBottom:5, textTransform:"uppercase", letterSpacing:1 }}>Cargo elaborador</label>
          <input value={d.cargoElaborador||""} onChange={e => set("cargoElaborador", e.target.value)}
            placeholder="Cargo"
            style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:4, padding:"8px 10px",
              fontSize:13, fontFamily:"'DM Sans',sans-serif", background:C.bg }}/>
        </div>
      </div>
    </Card>

    {/* ── DESGLOSE GF + GC EN VIVO ── */}
    {(() => {
      const pais = d.pais || "CO";
      // GF — Gastos Financieros
      let fFinPct = 0, fFinLabel = "Sin comisión";
      const _ivaC2 = d.ivaComision ?? 0.19;
      if (d.medioPago === "PSE")           { fFinPct = (d.pctComPSE??0.012)*(1+_ivaC2); fFinLabel = `PSE ${((d.pctComPSE??0.012)*100).toFixed(2)}% + IVA ${(_ivaC2*100).toFixed(0)}%`; }
      if (d.medioPago === "Tarjeta")       { fFinPct = (d.pctComTarjeta??0.036)*(1+_ivaC2); fFinLabel = `Tarjeta ${((d.pctComTarjeta??0.036)*100).toFixed(2)}% + IVA ${(_ivaC2*100).toFixed(0)}%`; }
      if (d.medioPago === "Transferencia") { fFinPct = (d.pctComTransf??0)*(1+_ivaC2); fFinLabel = fFinPct>0 ? `Transf. ${((d.pctComTransf??0)*100).toFixed(2)}% + IVA ${(_ivaC2*100).toFixed(0)}%` : "Transferencia (sin comisión)"; }
      if (d.medioPago === "Manual")        { fFinPct = d.pctComManual??0; fFinLabel = `Manual ${((d.pctComManual??0)*100).toFixed(2)}%`; }
      const f4kPct   = d.aplicar4x1000 === "SI" ? 0.004 : 0;
      const totalGF  = fFinPct + f4kPct;
      // GC — Gastos de Contratación
      const gcPols   = (d.pctRCE||0) + (d.pctTRC||0) + (d.pctAdm||0);
      const gcIca    = d.pctICA || 0;
      const totalGC  = gcPols + gcIca;
      // Total y denominadores
      const modoCalc = d.modoCalcObra || "margen";
      const margen      = d.margen || 0.25;
      // GC lleva margen: den1 = 1 - M - GC
      // GF no lleva margen: denGF = 1 - GF
      const den1 = modoCalc === "aiu" ? (1 - totalGC) : (1 - margen - totalGC);
      const denGF = 1 - totalGF;
      const denTotal = den1 * denGF;
      const coefMult    = denTotal > 0 ? (modoCalc === "aiu" ? (1 + (d.aiuA||0.08)+(d.aiuI||0.03)+(d.aiuU||0.07)) / denTotal : 1 / denTotal) : 0;

      const rowStyle = { display:"flex", justifyContent:"space-between", alignItems:"center",
        padding:"5px 0", borderBottom:"1px solid #E0E0E0", fontSize:12 };
      const numStyle = { fontFamily:"'DM Mono',monospace", fontWeight:600, fontSize:12 };
      const subLabel = { fontSize:11, color:C.inkLight, marginLeft:12 };

      return (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginTop:20 }}>
          {/* GF */}
          <Card style={{ padding:18 }}>
            <STitle t="Gastos Financieros (GF)" s="NO llevan margen — se suman al final" />
            <div style={rowStyle}>
              <span>Comisión cobro <span style={subLabel}>{fFinLabel}</span></span>
              <span style={numStyle}>{pct(fFinPct)}</span>
            </div>
            <div style={rowStyle}>
              <span>Gravamen 4×1000</span>
              <span style={numStyle}>{pct(f4kPct)}</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", padding:"8px 0 0",
              fontWeight:700, fontSize:13 }}>
              <span>Total GF</span>
              <span style={{ ...numStyle, color: totalGF > 0 ? C.warning : C.inkLight }}>
                {pct(totalGF)}
              </span>
            </div>
          </Card>

          {/* GC */}
          <Card style={{ padding:18 }}>
            <STitle t="Gastos de Contratación (GC)" s="Coste directo — LLEVA margen" />
            <div style={rowStyle}>
              <span>Póliza RCE</span>
              <span style={numStyle}>{pct(d.pctRCE||0)}</span>
            </div>
            <div style={rowStyle}>
              <span>Póliza TRC</span>
              <span style={numStyle}>{pct(d.pctTRC||0)}</span>
            </div>
            <div style={rowStyle}>
              <span>Adm. contratación</span>
              <span style={numStyle}>{pct(d.pctAdm||0)}</span>
            </div>
            <div style={rowStyle}>
              <span>ICA {pais==="CO" ? "(Bogotá)" : "(municipal)"}</span>
              <span style={numStyle}>{pct(d.pctICA||0)}</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", padding:"8px 0 0",
              fontWeight:700, fontSize:13 }}>
              <span>Total GC</span>
              <span style={{ ...numStyle, color: totalGC > 0 ? C.warning : C.inkLight }}>
                {pct(totalGC)}
              </span>
            </div>
          </Card>

          {/* Impacto consolidado */}
          <Card style={{ padding:18, gridColumn:"1 / -1",
            background: C.ink, borderRadius:6 }}>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12 }}>
              {[
                [modoCalc==="aiu"?"AIU":"Margen", modoCalc==="aiu"?pct((d.aiuA||0.08)+(d.aiuI||0.03)+(d.aiuU||0.07)):pct(margen), "#aaa"],
                ["GC (lleva M)", pct(totalGC), "#aaa"],
                ["Den (1−M−GC)", den1.toFixed(4), "#fff"],
                ["GF (sin M)", pct(totalGF), "#aaa"],
                ["Den (1−GF)", denGF.toFixed(4), "#fff"],
              ].map(([lbl, val, col]) => (
                <div key={lbl}>
                  <div style={{ fontSize:9, color:"rgba(255,255,255,0.4)", textTransform:"uppercase",
                    letterSpacing:0.8, marginBottom:4 }}>{lbl}</div>
                  <div style={{ fontFamily:"'DM Mono',monospace", fontSize:16, fontWeight:700,
                    color:col }}>{val}</div>
                </div>
              ))}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginTop:14, paddingTop:12, borderTop:"1px solid rgba(255,255,255,0.1)" }}>
              <div>
                <div style={{ fontSize:9, color:"rgba(255,255,255,0.4)", textTransform:"uppercase", letterSpacing:0.8, marginBottom:4 }}>Denominador total</div>
                <div style={{ fontFamily:"'DM Mono',monospace", fontSize:20, fontWeight:700, color:"#fff" }}>{denTotal.toFixed(4)}</div>
              </div>
              <div>
                <div style={{ fontSize:9, color:"rgba(255,255,255,0.4)", textTransform:"uppercase", letterSpacing:0.8, marginBottom:4 }}>Coeficiente multiplicador</div>
                <div style={{ fontFamily:"'DM Mono',monospace", fontSize:20, fontWeight:700, color:"#fff" }}>× {coefMult.toFixed(4)}</div>
              </div>
            </div>
            <div style={{ marginTop:12, paddingTop:10, borderTop:"1px solid rgba(255,255,255,0.1)",
              fontSize:11, color:"rgba(255,255,255,0.5)" }}>
              {modoCalc === "aiu"
                ? `Fórmula AIU: PVP = CD × (1+AIU) / (1−GC) / (1−GF)`
                : `Fórmula: PVP = CD / (1−M−GC) / (1−GF)`
              } → un CD de 1.000.000 genera PVP = {
                denTotal > 0 ? fmt(modoCalc==="aiu" ? 1000000*(1+(d.aiuA||0.08)+(d.aiuI||0.03)+(d.aiuU||0.07))/denTotal : 1000000 / denTotal) : "∞"
              }
            </div>
          </Card>
        </div>
      );
    })()}
    </>
  );
}

/* ── Costos Directos ── */
function TCos({ d, set }) {
  const add = () => set("costosDirectos", [...d.costosDirectos, { id: uid(), descripcion: "", tipo: "M", valor: "", notas: "" }]);
  const del = id => set("costosDirectos", d.costosDirectos.filter(c => c.id !== id));
  const up  = (id, k, v) => set("costosDirectos", d.costosDirectos.map(c => c.id === id ? { ...c, [k]: v } : c));
  const tM  = d.costosDirectos.filter(c => c.tipo === "M").reduce((s, c) => s + (parseFloat(c.valor) || 0), 0);
  const tMO = d.costosDirectos.filter(c => c.tipo === "MO").reduce((s, c) => s + (parseFloat(c.valor) || 0), 0);
  const tSB = d.costosDirectos.filter(c => c.tipo === "SUB").reduce((s, c) => s + (parseFloat(c.valor) || 0), 0);
  const inp = { padding: "6px 8px", border: `1px solid ${C.border}`, borderRadius: 2, fontFamily: "'DM Sans', sans-serif", fontSize: 12, background: C.bg, width: "100%" };

  return (
    <div className="fade">
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <STitle t="Costos directos" s="M · Materiales · MO · Mano de obra · SUB · Subcontratas" />
          <Btn icon={Plus} sm on={add}>Agregar ítem</Btn>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr style={{ background: "#FFFFFF" }}>
            {["Descripción", "Tipo", "Valor (COP)", "Notas", ""].map(h => (
              <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 9, fontWeight: 600, color: C.inkLight, textTransform: "uppercase", letterSpacing: 1 }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {d.costosDirectos.map(c => (
              <tr key={c.id} style={{ borderTop: `1px solid ${C.border}` }}>
                <td style={{ padding: "7px 10px", width: "40%" }}><input value={c.descripcion} onChange={e => up(c.id, "descripcion", e.target.value)} placeholder="Descripción" style={inp} /></td>
                <td style={{ padding: "7px 10px", width: 90 }}><select value={c.tipo} onChange={e => up(c.id, "tipo", e.target.value)} style={{ ...inp, width: 70 }}><option>M</option><option>MO</option><option>SUB</option></select></td>
                <td style={{ padding: "7px 10px", width: 160 }}><input type="number" value={c.valor} onChange={e => up(c.id, "valor", e.target.value)} placeholder="0" style={{ ...inp, textAlign: "right" }} /></td>
                <td style={{ padding: "7px 10px" }}><input value={c.notas} onChange={e => up(c.id, "notas", e.target.value)} placeholder="Notas" style={inp} /></td>
                <td style={{ padding: "7px 10px", width: 36 }}><button onClick={() => del(c.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.error, padding: 4 }}><X size={13} /></button></td>
              </tr>
            ))}
            {d.costosDirectos.length === 0 && <tr><td colSpan={5} style={{ padding: 28, textAlign: "center", color: C.inkLight, fontSize: 13 }}>Clic en "Agregar ítem" para empezar</td></tr>}
          </tbody>
          <tfoot><tr style={{ borderTop: `2px solid ${C.border}`, background: "#FFFFFF" }}>
            <td colSpan={2} style={{ padding: "10px 14px", fontSize: 10, fontWeight: 600, color: C.inkMid, textTransform: "uppercase", letterSpacing: 0.8 }}>Totales</td>
            <td colSpan={3}><div style={{ display: "flex", gap: 10, padding: "6px 10px" }}>
              {[["M", tM, C.info], ["MO", tMO, C.warning], ["SUB", tSB, C.success], ["TOTAL", tM + tMO + tSB, C.ink]].map(([l, v, col]) => (
                <div key={l} style={{ background: `${col}10`, borderRadius: 2, padding: "6px 12px" }}>
                  <p style={{ margin: 0, fontSize: 9, color: col, fontWeight: 700, letterSpacing: 0.8 }}>{l}</p>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: col }}>{fmt(v)}</p>
                </div>
              ))}
            </div></td>
          </tr></tfoot>
        </table>
      </Card>
    </div>
  );
}

/* ── APU ── */
function TAPU({ d, set, r }) {
  if (d.tipoProyecto !== "DISEÑO") return (
    <Card style={{ padding: 48, textAlign: "center" }}>
      <Calculator size={30} style={{ color: C.inkLight, opacity: .3, marginBottom: 12 }} />
      <p style={{ color: C.inkLight, margin: 0, fontSize: 13 }}>El APU aplica solo para tipo fiscal <strong>DISEÑO</strong>.</p>
    </Card>
  );
  return (
    <div className="fade" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      <Card style={{ padding: 22 }}>
        <STitle t="Base talento" s="Cálculo del costo por hora productiva" />
        <FI lbl="Salario anual diseñador (COP)"       type="number" val={d.apuSalarioAnual}                      on={e => set("apuSalarioAnual", +e.target.value)}         ph="0" />
        <FI lbl="% Prestaciones / SS sobre salario"   type="number" val={(d.apuPrestaciones * 100).toFixed(0)}   on={e => set("apuPrestaciones", +e.target.value / 100)}   rt="%" step="1" />
        <div style={{ height: 1, background: C.border, margin: "12px 0" }} />
        <STitle t="Estructura anual" s="Costos fijos asignados" />
        <FI lbl="Licencias anuales (COP)"             type="number" val={d.apuLicencias}   on={e => set("apuLicencias", +e.target.value)} />
        <FI lbl="Equipos – depreciación anual (COP)"  type="number" val={d.apuEquipos}     on={e => set("apuEquipos", +e.target.value)} />
        <FI lbl="Accesorios / periféricos (COP)"      type="number" val={d.apuAccesorios}  on={e => set("apuAccesorios", +e.target.value)} />
        <FI lbl="Indirectos asignados (COP)"          type="number" val={d.apuIndirectos}  on={e => set("apuIndirectos", +e.target.value)} />
        <div style={{ background: C.accentBg, borderRadius: 2, padding: "10px 14px", fontSize: 11, color: C.inkMid }}>
          Total estructura anual: <strong>{fmt(r.estr)}</strong>
        </div>
      </Card>
      <Card style={{ padding: 22 }}>
        <STitle t="Jornada laboral" s="Horas productivas por año" />
        <FI lbl="Horas jornada (h/día)"    type="number" val={d.apuHDia}                            on={e => set("apuHDia", +e.target.value)}                step="0.5" />
        <FI lbl="Días laborales / semana"  type="number" val={d.apuDiasSem}                         on={e => set("apuDiasSem", +e.target.value)} />
        <FI lbl="Semanas / año"            type="number" val={d.apuSemanas}                         on={e => set("apuSemanas", +e.target.value)} />
        <FI lbl="% Horas productivas"      type="number" val={(d.apuPctProductivas * 100).toFixed(0)} on={e => set("apuPctProductivas", +e.target.value / 100)} rt="%" step="1" note="Horas netas descontando reuniones y admin" />
        <div style={{ height: 1, background: C.border, margin: "12px 0" }} />
        <FS lbl="Modo costo/hora" val={d.apuModoHora} on={e => set("apuModoHora", e.target.value)} opts={["AUTO", "MANUAL"]} note="AUTO calcula del APU · MANUAL permite fijar el valor" />
        {d.apuModoHora === "MANUAL" && <FI lbl="Costo hora manual (COP)" type="number" val={d.apuCostoHoraManual} on={e => set("apuCostoHoraManual", +e.target.value)} />}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14 }}>
          {[["Horas prod/año", `${r.hAnio?.toFixed(0)} h`], ["Costo / hora", fmt(r.costoH)], ["Horas diseño", `${r.hDis} h`], ["Costo diseño", fmt(r.costoDis)]].map(([l, v]) => (
            <div key={l} style={{ background: C.accentBg, borderRadius: 2, padding: "10px 12px" }}>
              <p style={{ margin: 0, fontSize: 9, color: C.inkLight, letterSpacing: 1, textTransform: "uppercase" }}>{l}</p>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.ink }}>{v}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ── Cronograma / Gantt MS-Project style ───────────────────── */
function TPla({ d, set, r }) {
  const pais = d.pais || "CO";
  const moneda = pais === "CO" ? "COP" : "EUR";
  const fmtC = (n) => n ? new Intl.NumberFormat(pais==="CO"?"es-CO":"es-ES",
    { style:"currency", currency:moneda, minimumFractionDigits:0, maximumFractionDigits:0 }).format(n) : "—";

  const acts = d.cronogramaActivos || [];
  const setActs = (v) => set("cronogramaActivos", typeof v === "function" ? v(acts) : v);

  // Import from borrador with hierarchy
  const syncFromBorrador = () => {
    const bLines = d.borradorLineas || [];
    const newActs = [];
    bLines.forEach(l => {
      if (l.esCapitulo) {
        if (!acts.find(a=>a.srcId===l.id)) {
          newActs.push({ id:uid(), srcId:l.id, nombre:l.nombre||l.descripcion||"Capítulo",
            inicio:d.fechaInicio||today(), duracion:30, avance:0, nivel:0,
            responsable:"", color:"#111111", precioCD:0, esCapitulo:true });
        } else { newActs.push(acts.find(a=>a.srcId===l.id)); }
      } else {
        const venta = l.precioCD > 0 ? calcPUVentaLinea(l.precioCD, l.cantidad||1, d) : null;
        if (!acts.find(a=>a.srcId===l.id)) {
          newActs.push({ id:uid(), srcId:l.id, nombre:l.descripcion||"Actividad",
            inicio:d.fechaInicio||today(), duracion:15, avance:0, nivel:1,
            responsable:"", color:"#2A5F8C", pred:"",
            precioCD:l.precioCD||0, totalVenta:venta?.totalVenta||0, esCapitulo:false });
        } else {
          const existing = acts.find(a=>a.srcId===l.id);
          newActs.push({...existing, precioCD:l.precioCD||0, totalVenta:venta?.totalVenta||0 });
        }
      }
    });
    acts.filter(a=>!a.srcId).forEach(a=>newActs.push(a));
    setActs(newActs);
  };

  const addAct = () => setActs([...acts, { id:uid(), nombre:"Nueva actividad", inicio:d.fechaInicio||today(),
    duracion:7, avance:0, nivel:0, responsable:"", color:"#2A5F8C", pred:"", precioCD:0, esCapitulo:false }]);
  const addCap = () => setActs([...acts, { id:uid(), nombre:"NUEVO CAPÍTULO", inicio:d.fechaInicio||today(),
    duracion:30, avance:0, nivel:0, responsable:"", color:"#111111", precioCD:0, esCapitulo:true }]);
  const delAct = (id) => setActs(acts.filter(a=>a.id!==id));
  const updAct = (id,k,v) => setActs(acts.map(a=>a.id===id?{...a,[k]:v}:a));
  const indent = (id) => setActs(acts.map(a=>a.id===id?{...a,nivel:Math.min(3,(a.nivel||0)+1)}:a));
  const outdent = (id) => setActs(acts.map(a=>a.id===id?{...a,nivel:Math.max(0,(a.nivel||0)-1)}:a));
  const moveAct = (id, dir) => {
    const arr = [...acts]; const idx = arr.findIndex(a=>a.id===id);
    if (dir===-1 && idx>0) [arr[idx-1],arr[idx]]=[arr[idx],arr[idx-1]];
    if (dir===1 && idx<arr.length-1) [arr[idx],arr[idx+1]]=[arr[idx+1],arr[idx]];
    setActs(arr);
  };

  // Auto-calc summary tasks from children
  const getSummary = (capIdx) => {
    const children = [];
    for (let j=capIdx+1; j<acts.length; j++) {
      if (acts[j].esCapitulo || (acts[j].nivel||0)===0) break;
      children.push(acts[j]);
    }
    if (children.length === 0) return { start: acts[capIdx]?.inicio, dur: acts[capIdx]?.duracion||30, cd:0, venta:0, avance:0 };
    const starts = children.map(c=>new Date(c.inicio||today()).getTime());
    const ends = children.map(c=>{ const s=new Date(c.inicio||today()); s.setDate(s.getDate()+(c.duracion||1)-1); return s.getTime(); });
    const minS = Math.min(...starts); const maxE = Math.max(...ends);
    const dur = Math.ceil((maxE-minS)/86400000)+1;
    const cd = children.reduce((s,c)=>s+(c.precioCD||0),0);
    const venta = children.reduce((s,c)=>s+(c.totalVenta||0),0);
    const avance = children.length>0 ? Math.round(children.reduce((s,c)=>s+(c.avance||0),0)/children.length) : 0;
    return { start: new Date(minS).toISOString().split("T")[0], dur, cd, venta, avance };
  };

  // Gantt calculations
  const endDate = (a) => { const s=new Date(a.inicio||today()); s.setDate(s.getDate()+(a.duracion||1)-1); return s.toISOString().split("T")[0]; };
  const allT = acts.flatMap(a=>[new Date(a.inicio||today()).getTime(), new Date(endDate(a)).getTime()]);
  const minD = new Date(allT.length ? Math.min(...allT) : Date.now());
  const maxD = new Date(allT.length ? Math.max(...allT) : Date.now()+90*86400000);
  const totalDays = Math.max(30, Math.ceil((maxD-minD)/86400000)+14);
  const dayPx = 4; // pixels per day
  const ganttWidth = totalDays * dayPx;
  const dayX = (dateStr) => Math.max(0, Math.ceil((new Date(dateStr||today())-minD)/86400000));

  // Weeks for header
  const weeks = [];
  for (let w=0; w<Math.ceil(totalDays/7); w++) {
    const dd=new Date(minD); dd.setDate(dd.getDate()+w*7);
    weeks.push(dd);
  }

  // Toggle
  const [vistaVal, setVistaVal] = useState(false);
  const [ganttSplit, setGanttSplit] = useState(50); // % width for table
  const [showRecursos, setShowRecursos] = useState(false);

  const totalCD = acts.filter(a=>!a.esCapitulo).reduce((s,a)=>s+(a.precioCD||0),0);
  const totalVenta = acts.filter(a=>!a.esCapitulo).reduce((s,a)=>s+(a.totalVenta||0),0);

  /* ── Print preview ── */
  const printCronograma = () => {
    const w = window.open("","_blank");
    const fI = d.fechaInicio ? new Date(d.fechaInicio).toLocaleDateString("es-CO",{year:"numeric",month:"long",day:"numeric"}) : "—";
    const fE = d.fechaEntrega ? new Date(d.fechaEntrega).toLocaleDateString("es-CO",{year:"numeric",month:"long",day:"numeric"}) : "—";
    const durDias = acts.length > 0 ? totalDays : "—";
    let html = `<html><head><title>Cronograma - ${d.codigoOferta||""}</title>
    <style>@import url('https://fonts.googleapis.com/css2?family=DM Sans:wght@300;400;600;700;800&family=DM+Mono:wght@400;500&display=swap');
    @page{size:landscape;margin:12mm}*{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'DM Sans',sans-serif;color:#111;font-size:10px;padding:20px}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;padding-bottom:12px;border-bottom:3px solid #111}
    .logo{font-size:16px;font-weight:800;letter-spacing:3px}
    .logo-sub{font-size:7px;letter-spacing:2px;color:#888;text-transform:uppercase}
    .project-info{text-align:right}
    .project-title{font-size:14px;font-weight:700}
    .project-meta{font-size:9px;color:#555;margin-top:2px}
    .kpis{display:flex;gap:16px;margin-bottom:14px;padding:8px 0;border-bottom:1px solid #E0E0E0}
    .kpi{font-size:9px;color:#555}.kpi strong{color:#111;font-size:11px}
    table{width:100%;border-collapse:collapse;margin-bottom:8px}
    th{background:#F5F4F1;padding:4px 6px;font-size:7px;text-transform:uppercase;letter-spacing:0.5px;font-weight:700;color:#888;text-align:left;border-bottom:2px solid #E0E0E0}
    td{padding:4px 6px;border-bottom:1px solid #F5F5F5;font-size:9px}
    .cap td{font-weight:700;background:#F5F4F1;border-bottom:2px solid #E0E0E0;font-size:10px}
    .mono{font-family:'DM Mono',monospace}.green{color:#111111}.blue{color:#3B3B3B}
    .bar-row{height:18px;position:relative;margin:1px 0}
    .bar{height:14px;border-radius:3px;position:absolute;top:2px;min-width:4px}
    .avance{height:14px;border-radius:3px;position:absolute;top:2px;opacity:0.3}
    .gantt-header{font-size:7px;color:#888;border-bottom:1px solid #E0E0E0;padding:2px 0}
    .footer{margin-top:12px;padding-top:8px;border-top:1px solid #E0E0E0;display:flex;justify-content:space-between;font-size:8px;color:#888}
    .totrow td{font-weight:700;border-top:2px solid #111;padding-top:6px}
    @media print{body{padding:0}}
    </style></head><body>`;

    // Header
    html += `<div class="header"><div><div class="logo">HABITARIS</div><div class="logo-sub">Arquitectura · Interiorismo · Construcción</div></div>`;
    html += `<div class="project-info"><div class="project-title">${d.proyecto || d.codigoOferta || "Proyecto"}</div>`;
    html += `<div class="project-meta">${d.codigoOferta||""} · Rev. ${d.revision||"R00"} · ${d.cliente||"Sin cliente"}</div>`;
    html += `<div class="project-meta">${d.ubicacion||""}</div></div></div>`;

    // KPIs
    html += `<div class="kpis">`;
    html += `<div class="kpi">Inicio: <strong>${fI}</strong></div>`;
    html += `<div class="kpi">Entrega: <strong>${fE}</strong></div>`;
    html += `<div class="kpi">Duración: <strong>${durDias} días</strong></div>`;
    html += `<div class="kpi">Actividades: <strong>${acts.filter(a=>!a.esCapitulo).length}</strong></div>`;
    html += `<div class="kpi">CD Total: <strong class="mono">${fmtC(totalCD)}</strong></div>`;
    html += `<div class="kpi">Venta Total: <strong class="mono green">${fmtC(totalVenta)}</strong></div>`;
    html += `</div>`;

    // Table
    html += `<table><thead><tr><th>#</th><th>WBS</th><th style="min-width:140px">Actividad</th><th>Días</th><th>Inicio</th><th>Fin</th><th>Avance</th><th>Pred</th><th>CD</th><th>Venta</th><th>Responsable</th></tr></thead><tbody>`;
    let wbs = [0];
    acts.forEach((a,i) => {
      const isCap = a.esCapitulo;
      const niv = a.nivel || 0;
      // WBS
      wbs = wbs.slice(0, niv+1);
      wbs[niv] = (wbs[niv]||0) + 1;
      const wbsStr = wbs.filter((_,x)=>x<=niv).join(".");
      const indent = niv * 16;
      const summary = isCap ? getSummary(i) : null;
      const dur = isCap && summary ? summary.dur : (a.duracion||0);
      const fin = (() => { const s=new Date(a.inicio||today()); s.setDate(s.getDate()+dur-1); return s.toLocaleDateString("es-CO"); })();
      const inicio = new Date(isCap && summary?.start ? summary.start : a.inicio||today()).toLocaleDateString("es-CO");
      const avance = isCap && summary ? summary.avance : (a.avance||0);
      const cd = isCap && summary ? summary.cd : (a.precioCD||0);
      const venta = isCap && summary ? summary.venta : (a.totalVenta||0);

      html += `<tr class="${isCap?"cap":""}">`;
      html += `<td>${i+1}</td><td>${wbsStr}</td>`;
      html += `<td style="padding-left:${6+indent}px">${a.nombre||"—"}</td>`;
      html += `<td class="mono">${dur}</td><td>${inicio}</td><td>${fin}</td>`;
      html += `<td>${avance}%</td><td>${a.pred||""}</td>`;
      html += `<td class="mono">${cd>0?fmtC(cd):""}</td>`;
      html += `<td class="mono green">${venta>0?fmtC(venta):""}</td>`;
      html += `<td>${a.responsable||""}</td></tr>`;
    });
    // Total row
    html += `<tr class="totrow"><td colspan="8"><strong>TOTAL PROYECTO</strong></td>`;
    html += `<td class="mono"><strong>${fmtC(totalCD)}</strong></td>`;
    html += `<td class="mono green"><strong>${fmtC(totalVenta)}</strong></td><td></td></tr>`;
    html += `</tbody></table>`;

    // Footer
    html += `<div class="footer"><span>HABITARIS · ${d.codigoOferta||""} · Cronograma valorado</span>`;
    html += `<span>Generado: ${new Date().toLocaleDateString("es-CO")} · Página 1</span></div>`;
    html += `</body></html>`;
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 400);
  };

  /* ── COMPREHENSIVE Resource Plan from APU + Cronograma ── */
  const calcRecursosFull = () => {
    const bLines = d.borradorLineas || [];
    const pais2 = d.pais || "CO";
    const cats = TARIFAS_MO[pais2]?.categorias || [];
    let bibEquipos = EQUIPOS_DEFAULTS;
    try { const r2 = store.get("hab:crm:equipos"); if(r2?.value) bibEquipos = JSON.parse(r2.value); } catch {}

    // Containers
    const personal = {};   // catId => { label, horas, costo, actividades:[{nombre,inicio,fin,horas,cant,equipo}] }
    const herramientas = {}; // key => { nombre, unidad, cantTotal, actividades:[{nombre,inicio,fin,cant}] }
    const equiposObra = {};  // key => { nombre, unidad, cantTotal, actividades:[{nombre,inicio,fin,cant}] }
    const eppList = {};    // key => { nombre, cantPorPersona, personas, actividades }

    // EPP defaults per category - now reads from cargo's recursosAsignados or defaults
    const getEppsCargo = (cargoId, cargoData) => {
      if (cargoData?.recursosAsignados?.length > 0) return cargoData.recursosAsignados;
      return EPP_DEFAULTS_POR_CARGO[cargoId] || [];
    };

    acts.filter(a => !a.esCapitulo).forEach(act => {
      const bl = bLines.find(l => l.id === act.srcId || l.descripcion === act.nombre);
      if (!bl) return;
      const apu = bl.apu || {};
      const inicio = act.inicio || d.fechaInicio || today();
      const finDate = (() => { const s=new Date(inicio); s.setDate(s.getDate()+(act.duracion||1)-1); return s.toISOString().split("T")[0]; })();

      // Find matching ofertaEquipo for herramientas
      const ofertaEquipos = d.ofertaEquipos || [];

      // 1) PERSONAL from equiposUsados (cuadrillas)
      const equiposUsados = apu.equiposUsados || [];
      equiposUsados.forEach(eu => {
        const bibEq = bibEquipos.find(e => e.id === eu.eqId);
        if (!bibEq) return;
        const rend = eu.rendimientoOverride ?? bibEq.rendimiento;
        const hTotal = rend * (bl.cantidad || 1);

        // Herramientas from ofertaEquipos assignment (codified) or defaults
        const matchingOfertaEq = ofertaEquipos.find(oe => oe.nombre === bibEq.nombre);
        const herrCodes = matchingOfertaEq?.herrAsignadas || HERR_DEFAULTS_POR_EQUIPO[bibEq.id] || [];
        herrCodes.forEach(cod => {
          const rec = getRecursoByCodigo(cod);
          if (!rec) return;
          const key = cod;
          if (!herramientas[key]) herramientas[key] = { codigo:cod, nombre:rec.nombre, familia:rec.familia, unidad:rec.unidad||"ud", cantTotal:0, precioRef:rec.precioRef||0, actividades:[] };
          herramientas[key].cantTotal = Math.max(herramientas[key].cantTotal, 1);
          herramientas[key].actividades.push({ nombre:act.nombre, inicio, fin:finDate, cant:1 });
        });

        bibEq.cargos.forEach(cargo => {
          const catInfo = cats.find(c => c.id === cargo.catId);
          if (!catInfo) return;
          const hPerson = hTotal * (cargo.cantidad || 1);
          const ch = costHoraCat(cargo.catId, pais2);

          if (!personal[cargo.catId]) personal[cargo.catId] = { label:catInfo.label, catId:cargo.catId, horas:0, costo:0, actividades:[], personas:0 };
          personal[cargo.catId].horas += hPerson;
          personal[cargo.catId].costo += hPerson * ch;
          personal[cargo.catId].actividades.push({
            nombre:act.nombre, equipo:bibEq.nombre, inicio, fin:finDate,
            horas:hPerson, cant:cargo.cantidad, dias:act.duracion||0,
          });

          // EPPs for this cargo — from ofertaEquipo cargo assignment or defaults
          const matchCargo = matchingOfertaEq?.cargos?.find(c => c.cargoId === cargo.catId);
          const eppCodes = getEppsCargo(cargo.catId, matchCargo);
          eppCodes.forEach(cod => {
            const rec = getRecursoByCodigo(cod);
            if (!rec) return;
            if (!eppList[cod]) eppList[cod] = { codigo:cod, nombre:rec.nombre, familia:rec.familia, unidad:rec.unidad, precioRef:rec.precioRef||0, personas:new Set(), actividades:[], cantTotal:0 };
            for (let p=0; p<(cargo.cantidad||1); p++) {
              eppList[cod].personas.add(`${cargo.catId}_${act.id}_${p}`);
            }
            eppList[cod].actividades.push({ nombre:act.nombre, inicio, fin:finDate, cant:cargo.cantidad||1 });
          });
        });
      });

      // 2) PERSONAL from direct MO
      const moItems = apu.mo || [];
      moItems.forEach(mo => {
        const catInfo = cats.find(c => c.id === mo.catId);
        if (!catInfo) return;
        const ch = costHoraCat(mo.catId, pais2);
        if (!personal[mo.catId]) personal[mo.catId] = { label:catInfo.label, catId:mo.catId, horas:0, costo:0, actividades:[], personas:0 };
        personal[mo.catId].horas += (mo.horas||0);
        personal[mo.catId].costo += (mo.horas||0) * ch;
        personal[mo.catId].actividades.push({
          nombre:act.nombre, equipo:"MO directa", inicio, fin:finDate,
          horas:mo.horas||0, cant:1, dias:act.duracion||0,
        });
        const eppCodes = EPP_DEFAULTS_POR_CARGO[mo.catId] || [];
        eppCodes.forEach(cod => {
          const rec = getRecursoByCodigo(cod);
          if (!rec) return;
          if (!eppList[cod]) eppList[cod] = { codigo:cod, nombre:rec.nombre, familia:rec.familia, unidad:rec.unidad, precioRef:rec.precioRef||0, personas:new Set(), actividades:[], cantTotal:0 };
          eppList[cod].personas.add(`${mo.catId}_${act.id}_mo`);
          eppList[cod].actividades.push({ nombre:act.nombre, inicio, fin:finDate, cant:1 });
        });
      });

      // 3) EQUIPOS/HERRAMIENTAS from APU equipos line items
      (apu.equipos || []).forEach(eq => {
        const key = eq.descripcion || eq.nombre || "Equipo";
        if (!equiposObra[key]) equiposObra[key] = { codigo:"—", nombre:key, familia:"equipo_obra", unidad:eq.unidad||"ud", cantTotal:0, precioRef:eq.precio||0, actividades:[] };
        equiposObra[key].cantTotal = Math.max(equiposObra[key].cantTotal, eq.cantidad||1);
        equiposObra[key].actividades.push({ nombre:act.nombre, inicio, fin:finDate, cant:eq.cantidad||1 });
      });
    });

    // Calc personas necesarias per category (peak concurrent)
    Object.values(personal).forEach(p => {
      const timeline = {};
      p.actividades.forEach(a => {
        const s = new Date(a.inicio);
        for (let dd=0; dd < a.dias; dd++) {
          const key = new Date(s.getTime() + dd*86400000).toISOString().split("T")[0];
          timeline[key] = (timeline[key]||0) + (a.cant||1);
        }
      });
      p.personas = Math.max(1, ...Object.values(timeline));
      p.inicioMasTemprano = p.actividades.reduce((m,a) => a.inicio < m ? a.inicio : m, "9999");
      p.finMasTardio = p.actividades.reduce((m,a) => a.fin > m ? a.fin : m, "0000");
    });

    // EPP totals
    Object.values(eppList).forEach(epp => {
      epp.cantTotal = epp.personas.size;
      epp.inicioNecesario = epp.actividades.reduce((m,a) => a.inicio < m ? a.inicio : m, "9999");
      epp.costoTotal = epp.cantTotal * (epp.precioRef || 0);
    });

    // Herramientas earliest date
    Object.values(herramientas).forEach(h => {
      h.inicioNecesario = h.actividades.reduce((m,a) => a.inicio < m ? a.inicio : m, "9999");
    });
    Object.values(equiposObra).forEach(eq => {
      eq.inicioNecesario = eq.actividades.reduce((m,a) => a.inicio < m ? a.inicio : m, "9999");
    });

    return {
      personal: Object.values(personal).sort((a,b) => b.horas - a.horas),
      herramientas: Object.values(herramientas).sort((a,b) => a.inicioNecesario.localeCompare(b.inicioNecesario)),
      equiposObra: Object.values(equiposObra).sort((a,b) => a.inicioNecesario.localeCompare(b.inicioNecesario)),
      epps: Object.values(eppList).sort((a,b) => b.cantTotal - a.cantTotal),
    };
  };

  const fmtFecha = (f) => f && f !== "9999" ? new Date(f).toLocaleDateString("es-CO",{day:"numeric",month:"short",year:"numeric"}) : "—";

  const exportRecursosPrint = (rec) => {
    const w = window.open("","_blank");
    const { personal: pers, herramientas: herr, equiposObra: eqO, epps } = rec;
    const totalH = pers.reduce((s,p) => s+p.horas, 0);
    const totalC = pers.reduce((s,p) => s+p.costo, 0);
    const totalPers = pers.reduce((s,p) => s+p.personas, 0);
    const pais2 = d.pais || "CO";
    const S = `@import url('https://fonts.googleapis.com/css2?family=DM Sans:wght@300;400;600;700;800&family=DM+Mono:wght@400;500&display=swap');@page{size:portrait;margin:12mm}*{margin:0;padding:0;box-sizing:border-box}body{font-family:'DM Sans',sans-serif;color:#111;font-size:9px;padding:20px}.header{display:flex;justify-content:space-between;margin-bottom:12px;padding-bottom:10px;border-bottom:3px solid #111}.logo{font-size:16px;font-weight:800;letter-spacing:3px}.logo-sub{font-size:7px;letter-spacing:2px;color:#888;text-transform:uppercase}h2{font-size:12px;margin:14px 0 6px;padding:5px 0;border-bottom:2px solid #111}h3{font-size:10px;margin:8px 0 4px}.kpis{display:flex;gap:16px;margin-bottom:12px;font-size:9px;color:#555}.kpi strong{color:#111}table{width:100%;border-collapse:collapse;margin-bottom:10px}th{background:#F5F4F1;padding:3px 5px;font-size:7px;text-transform:uppercase;letter-spacing:.4px;font-weight:700;color:#888;text-align:left;border-bottom:2px solid #E0E0E0}td{padding:3px 5px;border-bottom:1px solid #F5F5F5;font-size:8px}.mono{font-family:'DM Mono',monospace}.green{color:#111111}.blue{color:#3B3B3B}.bold{font-weight:700}.totrow td{font-weight:700;border-top:2px solid #111}.badge{background:#F0F0F0;color:#3B3B3B;padding:2px 8px;border-radius:3px;font-weight:700;font-size:10px}.footer{margin-top:12px;padding-top:6px;border-top:1px solid #E0E0E0;display:flex;justify-content:space-between;font-size:7px;color:#888}@media print{body{padding:8px}}`;
    let html = `<html><head><title>Plan de Recursos - ${d.codigoOferta||""}</title><style>${S}</style></head><body>`;

    html += `<div class="header"><div><div class="logo">HABITARIS</div><div class="logo-sub">Arquitectura · Interiorismo · Construcción</div></div>`;
    html += `<div style="text-align:right"><div style="font-size:14px;font-weight:700">Plan de Recursos y Contratación</div>`;
    html += `<div style="font-size:8px;color:#555">${d.proyecto||""} · ${d.codigoOferta||""} · ${d.cliente||""}</div></div></div>`;

    html += `<div class="kpis"><div class="kpi">Total personas: <strong class="badge">${totalPers}</strong></div>`;
    html += `<div class="kpi">Horas MO: <strong class="mono">${totalH.toFixed(0)} h</strong></div>`;
    html += `<div class="kpi">Costo MO: <strong class="mono green">${fmtC(totalC)}</strong></div>`;
    html += `<div class="kpi">EPPs: <strong>${epps.length} ítems</strong></div>`;
    html += `<div class="kpi">Herramientas: <strong>${herr.length + eqO.length} ítems</strong></div></div>`;

    // 1) Personal
    html += `<h2>👷 1. Personal — Contratación</h2>`;
    html += `<table><tr><th>Categoría</th><th>Personas</th><th>Horas</th><th>Costo</th><th>Ingreso estimado</th><th>Hasta</th><th>Actividades</th></tr>`;
    pers.forEach(p => {
      html += `<tr><td class="bold">${p.label}</td><td class="badge mono">${p.personas}</td>`;
      html += `<td class="mono">${p.horas.toFixed(0)}h</td><td class="mono green">${fmtC(p.costo)}</td>`;
      html += `<td class="mono">${fmtFecha(p.inicioMasTemprano)}</td><td class="mono">${fmtFecha(p.finMasTardio)}</td>`;
      html += `<td>${p.actividades.map(a=>a.nombre).filter((v,i,s)=>s.indexOf(v)===i).join(", ")}</td></tr>`;
    });
    html += `<tr class="totrow"><td>TOTAL</td><td class="badge mono">${totalPers}</td><td class="mono">${totalH.toFixed(0)}h</td><td class="mono green">${fmtC(totalC)}</td><td colspan="3"></td></tr></table>`;

    // 2) EPPs
    html += `<h2>🦺 2. Elementos de Protección Personal (EPP)</h2>`;
    html += `<table><tr><th>Código</th><th>Elemento</th><th>Cant.</th><th>Precio ref.</th><th>Subtotal</th><th>Necesario desde</th></tr>`;
    epps.forEach(e => { html += `<tr><td class="mono bold">${e.codigo||"—"}</td><td>${e.nombre}</td><td class="mono">${e.cantTotal}</td><td class="mono">${fmtC(e.precioRef||0)}</td><td class="mono green bold">${fmtC(e.costoTotal||0)}</td><td class="mono">${fmtFecha(e.inicioNecesario)}</td></tr>`; });
    html += `<tr class="totrow"><td colspan="2">TOTAL EPPs</td><td class="mono">${epps.reduce((s,e)=>s+e.cantTotal,0)}</td><td></td><td class="mono green bold">${fmtC(epps.reduce((s,e)=>s+(e.costoTotal||0),0))}</td><td></td></tr></table>`;

    // 3) Herramientas + Equipos
    html += `<h2>🔨 3. Herramientas y Equipos</h2>`;
    html += `<table><tr><th>Código</th><th>Recurso</th><th>Tipo</th><th>Cant.</th><th>Precio ref.</th><th>Necesario desde</th><th>Actividades</th></tr>`;
    [...herr, ...eqO].forEach(h => {
      html += `<tr><td class="mono bold">${h.codigo||"—"}</td><td>${h.nombre}</td><td>${FAMILIA_LABELS[h.familia]||""}</td><td class="mono">${h.cantTotal}</td>`;
      html += `<td class="mono">${fmtC(h.precioRef||0)}</td><td class="mono">${fmtFecha(h.inicioNecesario)}</td>`;
      html += `<td>${h.actividades.map(a=>a.nombre).filter((v,i,s)=>s.indexOf(v)===i).join(", ")}</td></tr>`;
    });
    html += `</table>`;

    html += `<div class="footer"><span>HABITARIS · ${d.codigoOferta||""} · Plan de recursos</span><span>${new Date().toLocaleDateString("es-CO")}</span></div>`;
    html += `</body></html>`;
    w.document.write(html); w.document.close();
    setTimeout(() => w.print(), 400);
  };

  const inp = { border:`1px solid ${C.border}`, borderRadius:3, padding:"3px 5px",
    fontSize:11, fontFamily:"'DM Sans',sans-serif", background:"#fff" };

  return (
    <div className="fade">
      {/* Toolbar */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, flexWrap:"wrap", gap:8 }}>
        <div>
          <p style={{ margin:0, fontSize:10, color:C.inkLight, letterSpacing:1.5, textTransform:"uppercase" }}>Cronograma valorado</p>
          <h2 style={{ margin:0, fontSize:18, fontWeight:700 }}>{acts.length} actividades · {fmtC(totalCD)} CD → {fmtC(totalVenta)} venta</h2>
        </div>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          <Btn sm v="sec" on={syncFromBorrador}><Download size={11}/> Importar borrador</Btn>
          <Btn sm v="sec" on={addCap}><Plus size={11}/> Capítulo</Btn>
          <Btn sm on={addAct}><Plus size={11}/> Actividad</Btn>
          <button onClick={()=>setVistaVal(!vistaVal)}
            style={{ padding:"5px 12px", fontSize:10, fontWeight:600, cursor:"pointer",
              border:`1px solid ${vistaVal?C.accent:C.border}`, borderRadius:4,
              background:vistaVal?"#E6F4EC":"#fff", color:vistaVal?"#111111":C.inkMid,
              fontFamily:"'DM Sans',sans-serif" }}>
            {vistaVal?"💰 Valorado":"📊 Valorado"}
          </button>
          <button onClick={printCronograma}
            style={{ padding:"5px 12px", fontSize:10, fontWeight:600, cursor:"pointer",
              border:"none", borderRadius:4, background:"#111", color:"#fff",
              fontFamily:"'DM Sans',sans-serif", display:"flex", alignItems:"center", gap:4 }}>
            <FileText size={11}/> Vista PDF
          </button>
          <button onClick={()=>setShowRecursos(true)}
            style={{ padding:"5px 12px", fontSize:10, fontWeight:600, cursor:"pointer",
              border:"none", borderRadius:4, background:"#3B3B3B", color:"#fff",
              fontFamily:"'DM Sans',sans-serif", display:"flex", alignItems:"center", gap:4 }}>
            <HardHat size={11}/> Recursos
          </button>
        </div>
      </div>

      {acts.length === 0 ? (
        <Card style={{ padding:40, textAlign:"center" }}>
          <Calendar size={32} style={{ color:C.inkLight, opacity:0.3, marginBottom:12 }}/>
          <p style={{ color:C.inkLight, fontSize:13, margin:0 }}>Sin actividades. Importa desde el borrador o añade manualmente.</p>
        </Card>
      ) : (
        /* ═══ SPLIT VIEW: Table left + Gantt right ═══ */
        <Card style={{ padding:0, overflow:"hidden" }}>
          <div style={{ display:"flex", minHeight:200 }}>
            {/* LEFT: Task table */}
            <div style={{ width:`${ganttSplit}%`, minWidth:400, flexShrink:0, borderRight:`2px solid ${C.border}`, overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                <thead>
                  <tr style={{ background:"#EDEBE7" }}>
                    <th style={{ width:30, padding:"6px 4px", fontSize:9, color:"#888", fontWeight:700, borderBottom:`2px solid ${C.border}` }}>#</th>
                    <th style={{ width:34, padding:"6px 2px", fontSize:8, color:"#888", fontWeight:700, borderBottom:`2px solid ${C.border}` }}>WBS</th>
                    <th style={{ padding:"6px 8px", fontSize:9, color:"#888", fontWeight:700, borderBottom:`2px solid ${C.border}`, textAlign:"left", minWidth:160 }}>ACTIVIDAD</th>
                    <th style={{ width:50, padding:"6px 4px", fontSize:9, color:"#888", fontWeight:700, borderBottom:`2px solid ${C.border}` }}>DÍAS</th>
                    <th style={{ width:95, padding:"6px 4px", fontSize:9, color:"#888", fontWeight:700, borderBottom:`2px solid ${C.border}` }}>INICIO</th>
                    <th style={{ width:80, padding:"6px 4px", fontSize:9, color:"#888", fontWeight:700, borderBottom:`2px solid ${C.border}` }}>FIN</th>
                    <th style={{ width:50, padding:"6px 4px", fontSize:9, color:"#888", fontWeight:700, borderBottom:`2px solid ${C.border}` }}>%</th>
                    <th style={{ width:60, padding:"6px 4px", fontSize:9, color:"#888", fontWeight:700, borderBottom:`2px solid ${C.border}` }}>PRED</th>
                    {vistaVal && <>
                      <th style={{ width:80, padding:"6px 4px", fontSize:9, color:"#888", fontWeight:700, borderBottom:`2px solid ${C.border}` }}>CD</th>
                      <th style={{ width:80, padding:"6px 4px", fontSize:9, color:"#888", fontWeight:700, borderBottom:`2px solid ${C.border}` }}>VENTA</th>
                    </>}
                    <th style={{ width:64, padding:"6px 4px", borderBottom:`2px solid ${C.border}` }}/>
                  </tr>
                </thead>
                <tbody>
                  {acts.map((a, idx) => {
                    const nivel = a.nivel || 0;
                    const isCap = a.esCapitulo;
                    const summary = isCap ? getSummary(idx) : null;
                    const displayDur = isCap && summary ? summary.dur : a.duracion;
                    const displayAvance = isCap && summary ? summary.avance : (a.avance||0);
                    return (
                      <tr key={a.id} style={{
                        background: isCap ? "#F5F4F1" : (idx%2===0 ? "#fff" : "#FFFFFF"),
                        borderBottom: `1px solid ${isCap ? C.border : "#F5F5F5"}`,
                        height: isCap ? 32 : 28
                      }}>
                        <td style={{ padding:"2px 4px", textAlign:"center", fontSize:9, color:"#BBB" }}>{idx+1}</td>
                        <td style={{ padding:"2px 2px", textAlign:"center" }}>
                          <div style={{ display:"flex", gap:1, justifyContent:"center" }}>
                            <button onClick={()=>outdent(a.id)} title="Quitar sangría"
                              style={{ background:"none", border:"none", cursor:"pointer", color:nivel>0?"#888":"#DDD", padding:0, fontSize:10, lineHeight:1 }}>◀</button>
                            <button onClick={()=>indent(a.id)} title="Añadir sangría"
                              style={{ background:"none", border:"none", cursor:"pointer", color:nivel<3?"#888":"#DDD", padding:0, fontSize:10, lineHeight:1 }}>▶</button>
                          </div>
                        </td>
                        <td style={{ padding:"2px 6px" }}>
                          <div style={{ paddingLeft: nivel*16, display:"flex", alignItems:"center", gap:4 }}>
                            {isCap && <span style={{ background:"#111111", color:"#fff", padding:"0px 4px", borderRadius:2, fontSize:7, fontWeight:700, lineHeight:"14px" }}>▼</span>}
                            <input value={a.nombre||""} onChange={e=>updAct(a.id,"nombre",e.target.value)}
                              style={{ border:"none", background:"transparent", outline:"none", width:"100%",
                                fontWeight:isCap?700:400, fontSize:isCap?11:10.5, color:C.ink,
                                textTransform:isCap?"uppercase":"none", padding:"1px 0" }}/>
                          </div>
                        </td>
                        <td style={{ padding:"2px 3px" }}>
                          {isCap ? <span style={{ fontSize:10, color:C.inkMid, textAlign:"center", display:"block" }}>{displayDur}</span> :
                          <input type="number" value={a.duracion||""} min={1} onChange={e=>updAct(a.id,"duracion",+e.target.value)}
                            style={{ ...inp, width:40, textAlign:"center", padding:"2px 3px" }}/>}
                        </td>
                        <td style={{ padding:"2px 3px" }}>
                          {isCap ? <span style={{ fontSize:9, color:C.inkMid }}>{summary?.start||""}</span> :
                          <input type="date" value={a.inicio||""} onChange={e=>updAct(a.id,"inicio",e.target.value)}
                            style={{ ...inp, width:90, fontSize:10, padding:"2px 3px" }}/>}
                        </td>
                        <td style={{ padding:"2px 4px", fontSize:9, color:C.inkMid, textAlign:"center" }}>{endDate(a)}</td>
                        <td style={{ padding:"2px 3px", textAlign:"center" }}>
                          <span style={{ fontSize:9, fontWeight:displayAvance>0?600:400,
                            color: displayAvance>=100?"#111111":displayAvance>0?"#3B3B3B":"#CCC" }}>
                            {displayAvance}%
                          </span>
                        </td>
                        <td style={{ padding:"2px 3px" }}>
                          {!isCap && <input value={a.pred||""} placeholder="—" onChange={e=>updAct(a.id,"pred",e.target.value)}
                            title="Predecesor: nº de fila (ej: 3, 5)" 
                            style={{ ...inp, width:36, textAlign:"center", fontSize:9, padding:"2px 2px" }}/>}
                        </td>
                        {vistaVal && <>
                          <td style={{ padding:"2px 4px", textAlign:"right", fontSize:9, fontFamily:"'DM Mono',monospace",
                            fontWeight:isCap?700:400, color:C.inkMid }}>
                            {isCap ? fmtC(summary?.cd||0) : (a.precioCD>0 ? fmtC(a.precioCD) : "—")}
                          </td>
                          <td style={{ padding:"2px 4px", textAlign:"right", fontSize:9, fontFamily:"'DM Mono',monospace",
                            fontWeight:isCap?700:400, color:isCap?"#111111":"#3B3B3B" }}>
                            {isCap ? fmtC(summary?.venta||0) : (a.totalVenta>0 ? fmtC(a.totalVenta) : "—")}
                          </td>
                        </>}
                        <td style={{ padding:"2px 2px", textAlign:"center", whiteSpace:"nowrap" }}>
                          <button onClick={()=>moveAct(a.id,-1)} style={{ background:"none",border:"none",cursor:"pointer",color:"#CCC",padding:1,fontSize:9 }}>▲</button>
                          <button onClick={()=>moveAct(a.id,1)} style={{ background:"none",border:"none",cursor:"pointer",color:"#CCC",padding:1,fontSize:9 }}>▼</button>
                          <button onClick={()=>delAct(a.id)} style={{ background:"none",border:"none",cursor:"pointer",color:"#C44",padding:1 }}><Trash2 size={10}/></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {vistaVal && (
                <tfoot><tr style={{ background:"#E6F4EC", borderTop:"2px solid #111111" }}>
                  <td colSpan={8} style={{ padding:"6px 8px", fontSize:10, fontWeight:700, color:"#111111" }}>TOTAL PROYECTO</td>
                  <td style={{ padding:"6px 4px", textAlign:"right", fontSize:10, fontWeight:700, fontFamily:"'DM Mono',monospace", color:"#111111" }}>{fmtC(totalCD)}</td>
                  <td style={{ padding:"6px 4px", textAlign:"right", fontSize:10, fontWeight:700, fontFamily:"'DM Mono',monospace", color:"#111111" }}>{fmtC(totalVenta)}</td>
                  <td/>
                </tr></tfoot>
                )}
              </table>
            </div>

            {/* RIGHT: Gantt bars */}
            <div style={{ flex:1, overflowX:"auto", overflowY:"hidden", background:"#FFFFFF" }}>
              {/* Week headers */}
              <div style={{ display:"flex", borderBottom:`2px solid ${C.border}`, background:"#EDEBE7", height:28, position:"sticky", top:0 }}>
                {weeks.map((dd,w) => (
                  <div key={w} style={{ width:7*dayPx, minWidth:7*dayPx, flexShrink:0,
                    fontSize:8, color:"#888", textAlign:"center", borderRight:"1px solid #E0E0E0",
                    display:"flex", alignItems:"center", justifyContent:"center", fontWeight:600 }}>
                    {dd.toLocaleDateString("es",{month:"short",day:"numeric"})}
                  </div>
                ))}
              </div>
              {/* Bars */}
              {acts.map((a, idx) => {
                const isCap = a.esCapitulo;
                const summary = isCap ? getSummary(idx) : null;
                const startStr = isCap && summary ? summary.start : a.inicio;
                const dur = isCap && summary ? summary.dur : Math.max(1, a.duracion||1);
                const avance = isCap && summary ? summary.avance : (a.avance||0);
                const startX = dayX(startStr);
                const pctDone = avance/100;
                const barLeft = startX * dayPx;
                const barWidth = Math.max(dur * dayPx, 4);
                const rowH = isCap ? 32 : 28;
                const barH = isCap ? 8 : 18;
                const barTop = (rowH - barH) / 2;

                // Dependency arrow
                const predIdx = a.pred ? parseInt(a.pred)-1 : -1;
                const predAct = predIdx >= 0 && predIdx < acts.length ? acts[predIdx] : null;

                return (
                  <div key={a.id} style={{ position:"relative", height:rowH,
                    borderBottom:`1px solid ${isCap?"#E0E0E0":"#F5F5F5"}` }}>
                    {/* Today line */}
                    {idx===0 && (() => {
                      const todayX = dayX(today()) * dayPx;
                      return todayX > 0 ? <div style={{ position:"absolute", left:todayX, top:0, bottom:0, width:1, background:"#E44", zIndex:2, opacity:0.5 }}/> : null;
                    })()}
                    {/* Background bar (total) */}
                    <div style={{ position:"absolute", left:barLeft, top:barTop,
                      width:barWidth, height:barH,
                      background: isCap ? "#999" : (a.color||"#2A5F8C"),
                      borderRadius: isCap ? "2px 2px 0 0" : 3, opacity:0.2 }}/>
                    {/* Progress bar */}
                    <div style={{ position:"absolute", left:barLeft, top:barTop,
                      width:barWidth*pctDone, height:barH,
                      background: isCap ? "#555" : (a.color||"#2A5F8C"),
                      borderRadius: isCap ? "2px 2px 0 0" : 3 }}/>
                    {/* Diamond markers for summary tasks */}
                    {isCap && <>
                      <div style={{ position:"absolute", left:barLeft-3, top:barTop+barH-2, width:6, height:6,
                        background:"#555", transform:"rotate(45deg)" }}/>
                      <div style={{ position:"absolute", left:barLeft+barWidth-3, top:barTop+barH-2, width:6, height:6,
                        background:"#555", transform:"rotate(45deg)" }}/>
                    </>}
                    {/* Label on bar */}
                    {!isCap && barWidth > 30 && (
                      <span style={{ position:"absolute", left:barLeft+4, top:barTop+1,
                        fontSize:8, color:"#fff", fontWeight:600, lineHeight:barH+"px",
                        textShadow:"0 1px 2px rgba(0,0,0,0.5)", pointerEvents:"none",
                        maxWidth:barWidth-8, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {avance>0 ? `${avance}%` : ""}
                      </span>
                    )}
                    {/* Dependency arrow from predecessor */}
                    {predAct && (() => {
                      const pEnd = (dayX(predAct.inicio) + Math.max(1,predAct.duracion||1)) * dayPx;
                      return pEnd < barLeft ? (
                        <svg style={{ position:"absolute", top:0, left:0, width:"100%", height:rowH, pointerEvents:"none", overflow:"visible" }}>
                          <line x1={pEnd} y1={rowH/2} x2={barLeft} y2={rowH/2} stroke="#E44" strokeWidth={1} strokeDasharray="3,2" markerEnd="url(#arrow)"/>
                          <defs><marker id="arrow" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto"><path d="M0,0 L6,2 L0,4" fill="#E44"/></marker></defs>
                        </svg>
                      ) : null;
                    })()}
                    {/* Avance slider on click */}
                    {!isCap && (
                      <input type="range" min={0} max={100} value={avance}
                        onChange={e=>updAct(a.id,"avance",+e.target.value)}
                        title={`Avance: ${avance}%`}
                        style={{ position:"absolute", left:barLeft, top:barTop,
                          width:barWidth, height:barH, opacity:0, cursor:"pointer" }}/>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {/* ═══ MODAL RECURSOS COMPLETO ═══ */}
      {showRecursos && (() => {
        const rec = calcRecursosFull();
        const { personal: pers, herramientas: herr, equiposObra: eqO, epps } = rec;
        const totalH = pers.reduce((s,p) => s+p.horas, 0);
        const totalC = pers.reduce((s,p) => s+p.costo, 0);
        const totalPers = pers.reduce((s,p) => s+p.personas, 0);
        const pais2 = d.pais || "CO";
        const hasData = pers.length > 0 || herr.length > 0 || eqO.length > 0;

        const exportCSVRecursos = () => {
          let csv = "\ufeffSección;Código;Recurso;Familia;Cantidad;Horas;Costo;Precio ref.;Necesario desde;Hasta;Actividades\n";
          pers.forEach(p => { csv += `Personal;;${p.label};;${p.personas};${p.horas.toFixed(0)};${p.costo.toFixed(0)};;${p.inicioMasTemprano||""};${p.finMasTardio||""};${p.actividades.map(a=>a.nombre).filter((v,i,s)=>s.indexOf(v)===i).join(" | ")}\n`; });
          epps.forEach(e => { csv += `EPP;${e.codigo||""};${e.nombre};${FAMILIA_LABELS[e.familia]||""};${e.cantTotal};;${e.costoTotal||0};${e.precioRef||0};${e.inicioNecesario||""};;${e.actividades.map(a=>a.nombre).filter((v,i,s)=>s.indexOf(v)===i).join(" | ")}\n`; });
          [...herr,...eqO].forEach(h => { csv += `Herramienta;${h.codigo||""};${h.nombre};${FAMILIA_LABELS[h.familia]||""};${h.cantTotal};;;${h.precioRef||0};${h.inicioNecesario||""};;${h.actividades.map(a=>a.nombre).filter((v,i,s)=>s.indexOf(v)===i).join(" | ")}\n`; });
          const blob = new Blob([csv], { type:"text/csv;charset=utf-8" });
          const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
          a.download = `Recursos_${d.codigoOferta||"proyecto"}.csv`; a.click();
        };

        const thS = { padding:"5px 8px", fontSize:8, fontWeight:700, color:"#888", textTransform:"uppercase",
          letterSpacing:.4, borderBottom:"2px solid #E0E0E0", textAlign:"left" };
        const thR = { ...thS, textAlign:"right" };

        return (
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.55)", zIndex:9999,
            display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
            onClick={() => setShowRecursos(false)}>
            <div onClick={e=>e.stopPropagation()}
              style={{ background:"#fff", borderRadius:10, width:"95%", maxWidth:1050, maxHeight:"90vh",
                display:"flex", flexDirection:"column", boxShadow:"0 20px 60px rgba(0,0,0,.25)" }}>

              {/* Header */}
              <div style={{ padding:"14px 22px", borderBottom:"2px solid #111", display:"flex",
                justifyContent:"space-between", alignItems:"center", flexShrink:0 }}>
                <div>
                  <h2 style={{ fontSize:16, fontWeight:700, margin:0 }}>👷 Plan de Recursos y Contratación</h2>
                  <p style={{ fontSize:10, color:"#888", margin:"2px 0 0" }}>
                    Desde APUs + cronograma · {d.codigoOferta||""} · {d.cliente||""}
                  </p>
                </div>
                <div style={{ display:"flex", gap:6 }}>
                  <button onClick={exportCSVRecursos}
                    style={{ padding:"5px 12px", background:"#fff", border:"1px solid #E0E0E0", borderRadius:4,
                      fontSize:10, fontWeight:600, cursor:"pointer", fontFamily:"'DM Sans',sans-serif",
                      display:"flex", alignItems:"center", gap:4 }}><Download size={11}/> CSV</button>
                  <button onClick={() => exportRecursosPrint(rec)}
                    style={{ padding:"5px 12px", background:"#111", color:"#fff", border:"none", borderRadius:4,
                      fontSize:10, fontWeight:600, cursor:"pointer", fontFamily:"'DM Sans',sans-serif",
                      display:"flex", alignItems:"center", gap:4 }}><FileText size={11}/> PDF</button>
                  <button onClick={() => setShowRecursos(false)}
                    style={{ background:"none", border:"none", cursor:"pointer", color:"#888" }}><X size={18}/></button>
                </div>
              </div>

              {/* KPIs */}
              <div style={{ padding:"8px 22px", background:"#F5F4F1", borderBottom:"1px solid #E0E0E0",
                display:"flex", gap:18, flexWrap:"wrap", flexShrink:0, fontSize:10, color:"#555" }}>
                <span>👷 Personas: <strong style={{ background:"#F0F0F0", color:"#3B3B3B", padding:"2px 8px", borderRadius:3, fontFamily:"'DM Mono',monospace" }}>{totalPers}</strong></span>
                <span>⏱ Horas MO: <strong style={{ fontFamily:"'DM Mono',monospace" }}>{totalH.toFixed(0)}h</strong></span>
                <span>💰 Costo MO: <strong style={{ fontFamily:"'DM Mono',monospace", color:"#111111" }}>{fmtC(totalC)}</strong></span>
                <span>🦺 EPPs: <strong>{epps.length} ítems</strong></span>
                <span>🔨 Herr./Equipos: <strong>{herr.length + eqO.length}</strong></span>
              </div>

              {/* Body */}
              <div style={{ overflowY:"auto", flex:1, padding:"0 22px 22px" }}>
                {!hasData ? (
                  <div style={{ textAlign:"center", padding:"50px 0", color:"#888" }}>
                    <HardHat size={32} style={{ opacity:.3, marginBottom:10 }}/>
                    <p style={{ fontSize:13, fontWeight:600 }}>No se encontraron recursos en los APUs.</p>
                    <p style={{ fontSize:11, marginTop:8, lineHeight:1.6, maxWidth:400, margin:"8px auto 0" }}>
                      Para generar el plan necesitas: partidas con APU en el borrador (con cuadrillas/MO asignada) → importar actividades al cronograma.
                    </p>
                  </div>
                ) : (<>

                  {/* ─── 1. PERSONAL ─── */}
                  <h3 style={{ fontSize:13, fontWeight:700, margin:"16px 0 8px", padding:"8px 0 6px",
                    borderBottom:"2px solid #111", display:"flex", alignItems:"center", gap:6 }}>
                    👷 1. Personal — Contratación y fechas de ingreso
                  </h3>
                  <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:16 }}>
                    <thead>
                      <tr style={{ background:"#FFFFFF" }}>
                        <th style={thS}>Categoría</th><th style={thR}>Personas</th><th style={thR}>Horas</th>
                        <th style={thR}>Costo</th><th style={thS}>Ingreso estimado</th><th style={thS}>Hasta</th>
                        <th style={thS}>Actividades</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pers.map(p => (
                        <tr key={p.catId} style={{ borderBottom:"1px solid #F5F5F5" }}>
                          <td style={{ padding:"7px 8px", fontWeight:600 }}>{p.label}</td>
                          <td style={{ padding:"7px 8px", textAlign:"right" }}>
                            <span style={{ background:"#F0F0F0", color:"#3B3B3B", padding:"2px 10px",
                              borderRadius:4, fontWeight:700, fontFamily:"'DM Mono',monospace", fontSize:13 }}>{p.personas}</span>
                          </td>
                          <td style={{ padding:"7px 8px", textAlign:"right", fontFamily:"'DM Mono',monospace" }}>{p.horas.toFixed(0)}h</td>
                          <td style={{ padding:"7px 8px", textAlign:"right", fontFamily:"'DM Mono',monospace", color:"#111111", fontWeight:600 }}>{fmtC(p.costo)}</td>
                          <td style={{ padding:"7px 8px" }}>
                            <span style={{ background:"#E8F4EE", color:"#111111", padding:"2px 8px", borderRadius:3, fontWeight:600, fontSize:10 }}>
                              📅 {fmtFecha(p.inicioMasTemprano)}
                            </span>
                          </td>
                          <td style={{ padding:"7px 8px", fontSize:10, color:"#888" }}>{fmtFecha(p.finMasTardio)}</td>
                          <td style={{ padding:"7px 8px", fontSize:9, color:"#888", maxWidth:180 }}>
                            {p.actividades.map(a=>a.nombre).filter((v,i,s)=>s.indexOf(v)===i).join(", ")}
                          </td>
                        </tr>
                      ))}
                      <tr style={{ borderTop:"2px solid #111" }}>
                        <td style={{ padding:"8px", fontWeight:700, fontSize:12 }}>TOTAL</td>
                        <td style={{ padding:"8px", textAlign:"right" }}>
                          <span style={{ background:"#111", color:"#fff", padding:"3px 12px",
                            borderRadius:4, fontWeight:700, fontFamily:"'DM Mono',monospace", fontSize:14 }}>{totalPers}</span>
                        </td>
                        <td style={{ padding:"8px", textAlign:"right", fontFamily:"'DM Mono',monospace", fontWeight:700 }}>{totalH.toFixed(0)}h</td>
                        <td style={{ padding:"8px", textAlign:"right", fontFamily:"'DM Mono',monospace", fontWeight:700, color:"#111111", fontSize:13 }}>{fmtC(totalC)}</td>
                        <td colSpan={3}/>
                      </tr>
                    </tbody>
                  </table>

                  {/* ─── 2. EPPs ─── */}
                  {epps.length > 0 && (<>
                    <h3 style={{ fontSize:13, fontWeight:700, margin:"16px 0 8px", padding:"8px 0 6px",
                      borderBottom:"2px solid #111", display:"flex", alignItems:"center", gap:6, justifyContent:"space-between" }}>
                      <span>🦺 2. Elementos de Protección Personal (EPP)</span>
                      <span style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:"#111111", fontWeight:600 }}>
                        Est. {fmtC(epps.reduce((s,e) => s + (e.costoTotal||0), 0))}
                      </span>
                    </h3>
                    <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:16 }}>
                      <thead>
                        <tr style={{ background:"#FFFFFF" }}>
                          <th style={thS}>Código</th><th style={thS}>Elemento</th><th style={thR}>Cant.</th>
                          <th style={thR}>Precio ref.</th><th style={thR}>Subtotal</th><th style={thS}>Necesario desde</th>
                        </tr>
                      </thead>
                      <tbody>
                        {epps.map((e,i) => (
                          <tr key={i} style={{ borderBottom:"1px solid #F5F5F5" }}>
                            <td style={{ padding:"6px 8px" }}>
                              <span style={{ fontFamily:"'DM Mono',monospace", fontWeight:700, fontSize:10, background:"#FFF8E7", color:"#8C6A00", padding:"1px 6px", borderRadius:3 }}>
                                {e.codigo||"—"}
                              </span>
                            </td>
                            <td style={{ padding:"6px 8px", fontWeight:600 }}>{FAMILIA_ICONS_CAT[e.familia]||"🦺"} {e.nombre}</td>
                            <td style={{ padding:"6px 8px", textAlign:"right", fontFamily:"'DM Mono',monospace", fontWeight:700 }}>{e.cantTotal}</td>
                            <td style={{ padding:"6px 8px", textAlign:"right", fontFamily:"'DM Mono',monospace", fontSize:10, color:"#888" }}>{fmtC(e.precioRef||0)}</td>
                            <td style={{ padding:"6px 8px", textAlign:"right", fontFamily:"'DM Mono',monospace", fontWeight:600, color:"#111111" }}>{fmtC(e.costoTotal||0)}</td>
                            <td style={{ padding:"6px 8px" }}>
                              <span style={{ background:"#FFF8E7", color:"#8C6A00", padding:"2px 8px", borderRadius:3, fontSize:10, fontWeight:600 }}>
                                📅 {fmtFecha(e.inicioNecesario)}
                              </span>
                            </td>
                          </tr>
                        ))}
                        <tr style={{ borderTop:"2px solid #111" }}>
                          <td colSpan={2} style={{ padding:"6px 8px", fontWeight:700 }}>TOTAL EPPs</td>
                          <td style={{ padding:"6px 8px", textAlign:"right", fontFamily:"'DM Mono',monospace", fontWeight:700 }}>{epps.reduce((s,e)=>s+e.cantTotal,0)}</td>
                          <td/>
                          <td style={{ padding:"6px 8px", textAlign:"right", fontFamily:"'DM Mono',monospace", fontWeight:700, color:"#111111" }}>{fmtC(epps.reduce((s,e)=>s+(e.costoTotal||0),0))}</td>
                          <td/>
                        </tr>
                      </tbody>
                    </table>
                  </>)}

                  {/* ─── 3. HERRAMIENTAS Y EQUIPOS ─── */}
                  {(herr.length > 0 || eqO.length > 0) && (<>
                    <h3 style={{ fontSize:13, fontWeight:700, margin:"16px 0 8px", padding:"8px 0 6px",
                      borderBottom:"2px solid #111", display:"flex", alignItems:"center", gap:6 }}>
                      🔨 3. Herramientas y Equipos de Obra
                    </h3>
                    <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:16 }}>
                      <thead>
                        <tr style={{ background:"#FFFFFF" }}>
                          <th style={thS}>Código</th><th style={thS}>Recurso</th><th style={thS}>Tipo</th>
                          <th style={thR}>Cant.</th><th style={thR}>Precio ref.</th><th style={thS}>Necesario desde</th>
                          <th style={thS}>Actividades</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...herr, ...eqO].map((h,i) => (
                          <tr key={i} style={{ borderBottom:"1px solid #F5F5F5" }}>
                            <td style={{ padding:"6px 8px" }}>
                              <span style={{ fontFamily:"'DM Mono',monospace", fontWeight:700, fontSize:10, background:"#F0F0F0", color:"#3B3B3B", padding:"1px 6px", borderRadius:3 }}>
                                {h.codigo||"—"}
                              </span>
                            </td>
                            <td style={{ padding:"6px 8px", fontWeight:600 }}>
                              {FAMILIA_ICONS_CAT[h.familia]||"🔧"} {h.nombre}
                            </td>
                            <td style={{ padding:"6px 8px", fontSize:9, color:"#888" }}>{FAMILIA_LABELS[h.familia]||h.familia}</td>
                            <td style={{ padding:"6px 8px", textAlign:"right", fontFamily:"'DM Mono',monospace", fontWeight:700 }}>{h.cantTotal}</td>
                            <td style={{ padding:"6px 8px", textAlign:"right", fontFamily:"'DM Mono',monospace", fontSize:10, color:"#888" }}>{fmtC(h.precioRef||0)}</td>
                            <td style={{ padding:"6px 8px" }}>
                              <span style={{ background:"#F0F0F0", color:"#3B3B3B", padding:"2px 8px", borderRadius:3, fontSize:10, fontWeight:600 }}>
                                📅 {fmtFecha(h.inicioNecesario)}
                              </span>
                            </td>
                            <td style={{ padding:"6px 8px", fontSize:9, color:"#888" }}>
                              {h.actividades.map(a=>a.nombre).filter((v,i2,s)=>s.indexOf(v)===i2).join(", ")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>)}

                  {/* ─── 4. DETALLE POR ACTIVIDAD ─── */}
                  <h3 style={{ fontSize:13, fontWeight:700, margin:"16px 0 8px", padding:"8px 0 6px",
                    borderBottom:"2px solid #111", display:"flex", alignItems:"center", gap:6 }}>
                    📋 4. Detalle de personal por actividad
                  </h3>
                  {pers.map(p => (
                    <div key={p.catId} style={{ marginBottom:12 }}>
                      <h4 style={{ fontSize:11, fontWeight:700, margin:"8px 0 4px", display:"flex", justifyContent:"space-between" }}>
                        <span>{p.label}</span>
                        <span style={{ fontFamily:"'DM Mono',monospace", color:"#111111", fontWeight:600, fontSize:10 }}>
                          {p.personas} pers. · {p.horas.toFixed(0)}h · {fmtC(p.costo)}
                        </span>
                      </h4>
                      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:10 }}>
                        <thead>
                          <tr style={{ background:"#FFFFFF" }}>
                            {["Actividad","Equipo","Pers.","Horas","Inicio","Fin","Días"].map(h => (
                              <th key={h} style={{ padding:"3px 6px", fontSize:7, fontWeight:700, color:"#888",
                                textTransform:"uppercase", letterSpacing:.4, borderBottom:"1px solid #E0E0E0",
                                textAlign: h==="Actividad"||h==="Equipo"||h==="Inicio"||h==="Fin" ? "left" : "right" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {p.actividades.map((a,i) => (
                            <tr key={i} style={{ borderBottom:"1px solid #F5F5F5" }}>
                              <td style={{ padding:"4px 6px" }}>{a.nombre}</td>
                              <td style={{ padding:"4px 6px", color:"#888" }}>{a.equipo}</td>
                              <td style={{ padding:"4px 6px", textAlign:"right", fontFamily:"'DM Mono',monospace" }}>{a.cant}</td>
                              <td style={{ padding:"4px 6px", textAlign:"right", fontFamily:"'DM Mono',monospace" }}>{a.horas.toFixed(1)}</td>
                              <td style={{ padding:"4px 6px", fontSize:9 }}>{fmtFecha(a.inicio)}</td>
                              <td style={{ padding:"4px 6px", fontSize:9 }}>{fmtFecha(a.fin)}</td>
                              <td style={{ padding:"4px 6px", textAlign:"right", fontFamily:"'DM Mono',monospace" }}>{a.dias}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </>)}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}


/* ── Gastos Generales (overhead distributable) ──────────────── */
const GG_CATEGORIAS = [
  { id:"personal_dir", label:"👔 Personal de dirección y administración", items:[
    { desc:"Director de proyecto", unidad:"mes", cant:0, valorUnit:0 },
    { desc:"Residente de obra / Coordinador", unidad:"mes", cant:0, valorUnit:0 },
    { desc:"Profesional HSE / SISO", unidad:"mes", cant:0, valorUnit:0 },
    { desc:"Coordinador administrativo", unidad:"mes", cant:0, valorUnit:0 },
    { desc:"Almacenista", unidad:"mes", cant:0, valorUnit:0 },
  ]},
  { id:"seguridad", label:"🦺 Seguridad y salud en el trabajo", items:[
    { desc:"Ambulancia / servicio médico", unidad:"mes", cant:0, valorUnit:0 },
    { desc:"Señalización y demarcación", unidad:"gl", cant:0, valorUnit:0 },
    { desc:"Botiquín y elementos de emergencia", unidad:"gl", cant:0, valorUnit:0 },
    { desc:"Capacitaciones SST", unidad:"gl", cant:0, valorUnit:0 },
    { desc:"Exámenes médicos ocupacionales", unidad:"gl", cant:0, valorUnit:0 },
  ]},
  { id:"instalaciones", label:"🏢 Instalaciones provisionales", items:[
    { desc:"Campamento / oficina temporal", unidad:"mes", cant:0, valorUnit:0 },
    { desc:"Baños portátiles", unidad:"mes", cant:0, valorUnit:0 },
    { desc:"Cerramiento provisional", unidad:"ml", cant:0, valorUnit:0 },
    { desc:"Acometidas temporales (agua, luz)", unidad:"gl", cant:0, valorUnit:0 },
  ]},
  { id:"servicios", label:"📋 Servicios y seguros", items:[
    { desc:"Póliza todo riesgo construcción", unidad:"gl", cant:0, valorUnit:0 },
    { desc:"Póliza responsabilidad civil", unidad:"gl", cant:0, valorUnit:0 },
    { desc:"Servicios públicos obra", unidad:"mes", cant:0, valorUnit:0 },
    { desc:"Transporte y logística", unidad:"mes", cant:0, valorUnit:0 },
    { desc:"Comunicaciones", unidad:"mes", cant:0, valorUnit:0 },
  ]},
  { id:"otros", label:"📦 Otros gastos generales", items:[
    { desc:"Papelería y consumibles oficina", unidad:"mes", cant:0, valorUnit:0 },
    { desc:"Ensayos y laboratorio", unidad:"gl", cant:0, valorUnit:0 },
    { desc:"Imprevistos", unidad:"gl", cant:0, valorUnit:0 },
  ]},
];

function TGG({ d, set, r }) {
  const pais = d.pais || "CO";
  const moneda = pais === "CO" ? "COP" : "EUR";
  const fmt = (n) => new Intl.NumberFormat("es-CO",{maximumFractionDigits:0}).format(n||0);
  // Duration: manual or from cronograma
  const ggMeses = d.ggMeses || 6;
  const mesesCrono = (() => {
    const ca = (d.cronogramaActivos||[]).filter(a=>!a.esCapitulo && a.duracion>0);
    if (ca.length === 0) return 0;
    const fb = d.fechaInicio ? new Date(d.fechaInicio) : new Date();
    let mx = fb.getTime();
    ca.forEach(a => { const e = new Date(a.inicio||fb).getTime()+(a.duracion||1)*86400000; if(e>mx)mx=e; });
    return Math.max(1, Math.ceil((mx-fb.getTime())/(30*86400000)));
  })();
  const mesesEjec = ggMeses; // always use manual value

  // Items persisted in oferta
  const [items, setItems] = useState(() => {
    if (d.ggItems?.length > 0) return d.ggItems;
    // Initialize from template
    const init = [];
    GG_CATEGORIAS.forEach(cat => {
      cat.items.forEach(it => {
        init.push({ id:uid(), categoria:cat.id, desc:it.desc, unidad:it.unidad, cant:it.cant, valorUnit:it.valorUnit });
      });
    });
    return init;
  });
  useEffect(() => { set("ggItems", items); }, [items]);

  const updItem = (id, k, v) => setItems(its => its.map(i => i.id===id ? {...i,[k]:v} : i));
  const delItem = (id) => setItems(its => its.filter(i => i.id !== id));
  const addItem = (catId) => setItems(its => [...its, { id:uid(), categoria:catId, desc:"", unidad:"mes", cant:0, valorUnit:0 }]);

  const subtotalItem = (it) => (it.cant||0) * (it.valorUnit||0);
  const totalGG = items.reduce((s,it) => s + subtotalItem(it), 0);
  const costoDirecto = r.COSTO || 0;
  const pctGG = costoDirecto > 0 ? totalGG / costoDirecto : 0;
  const totalActividades = (d.borradorLineas||[]).filter(l=>!l.esCapitulo).length || 1;

  // Auto-fill meses from cronograma for month-based items
  const autoFillMeses = () => {
    setItems(its => its.map(it => it.unidad === "mes" ? { ...it, cant: ggMeses } : it));
  };
  const sincronizarCrono = (conCierre) => {
    if (mesesCrono <= 0) return;
    set("ggMeses", mesesCrono + (conCierre ? 1 : 0));
    if (conCierre) set("ggMesCierre", true);
  };
  const hayDiscrepancia = mesesCrono > 0 && mesesCrono !== ggMeses && mesesCrono + 1 !== ggMeses;

  // Distribution criterion
  const criterio = d.ggCriterio || "costo"; // costo | duracion | mo

  // Update the AIU "A" coefficient or ggPct automatically
  useEffect(() => {
    if (d.modoCalcObra === "aiu") {
      set("aiuA", Math.round(pctGG * 10000) / 10000);
    }
    // Always set ggPct — used by calc() in margin mode
    set("ggPct", Math.round(pctGG * 10000) / 10000);
  }, [totalGG, costoDirecto]);

  // Generate organigrama from GG personal + equipos cuadrillas
  const generarOrgAutomatic = () => {
    const orgNodes = [];
    // 1) GG personal → top-level roles
    const personalItems = items.filter(it => it.categoria === "personal_dir" && it.desc.trim().length > 0);
    const colorMap = { "director":"#111111", "residente":"#2A5F8C", "hse":"#8C2A2A", "siso":"#8C2A2A",
      "coordinador":"#6B5B8C", "almacen":"#5B8DB8", "admin":"#6B5B8C" };
    const iconMap = { "director":"👔", "residente":"📋", "hse":"🦺", "siso":"🦺",
      "coordinador":"💼", "almacen":"📦", "admin":"💼" };
    const getMatch = (desc) => {
      const d2 = desc.toLowerCase();
      for (const [k,v] of Object.entries(colorMap)) { if (d2.includes(k)) return k; }
      return null;
    };

    // Root: first director-like role
    const dirItem = personalItems.find(it => it.desc.toLowerCase().includes("director"));
    const rootId = uid();
    if (dirItem) {
      orgNodes.push({ id:rootId, parentId:null, nombre:"", cargo:dirItem.desc, color:"#111111", icon:"👔" });
    } else {
      orgNodes.push({ id:rootId, parentId:null, nombre:"", cargo:"Director de Proyecto", color:"#111111", icon:"👔" });
    }

    // Other GG personnel as direct reports
    personalItems.filter(it => it !== dirItem).forEach(it => {
      const match = getMatch(it.desc);
      orgNodes.push({ id:uid(), parentId:rootId, nombre:"", cargo:it.desc,
        color:match ? colorMap[match] : "#555", icon:match ? iconMap[match] : "👤" });
    });

    // 2) From ofertaEquipos cuadrillas → operational roles under director/residente
    const operParent = orgNodes.find(n => n.cargo.toLowerCase().includes("residente")) || orgNodes.find(n => n.parentId === rootId) || orgNodes[0];
    const equipos = d.ofertaEquipos || [];
    const seenCargos = new Set();
    equipos.forEach(eq => {
      (eq.cargos || []).forEach(c => {
        const cat = (TARIFAS_MO[pais]?.categorias || []).find(x => x.id === c.cargoId);
        const label = cat?.label || c.cargoId;
        if (!seenCargos.has(label) && !orgNodes.find(n => n.cargo.toLowerCase() === label.toLowerCase())) {
          seenCargos.add(label);
          orgNodes.push({ id:uid(), parentId:operParent?.id || rootId, nombre:"",
            cargo:label, color:"#5B8DB8", icon:"👷" });
        }
      });
    });

    set("orgNodos", orgNodes);
  };

  // PDF Export
  const printGG = () => {
    const w = window.open("","_blank");
    const S = `@import url('https://fonts.googleapis.com/css2?family=DM Sans:wght@300;400;600;700;800&family=DM+Mono:wght@400;500&display=swap');@page{size:portrait;margin:12mm}*{margin:0;padding:0;box-sizing:border-box}body{font-family:'DM Sans',sans-serif;color:#111;font-size:9px;padding:20px}.header{display:flex;justify-content:space-between;margin-bottom:12px;padding-bottom:8px;border-bottom:3px solid #111}.logo{font-size:14px;font-weight:800;letter-spacing:3px}.logo-sub{font-size:6px;letter-spacing:2px;color:#888;text-transform:uppercase}h2{font-size:12px;margin:10px 0 4px;padding:6px 0 4px;border-bottom:2px solid #111}.kpis{display:flex;gap:14px;margin-bottom:10px;font-size:9px;color:#555}.kpi strong{color:#111}.kpi .badge{background:#111111;color:#fff;padding:1px 8px;border-radius:3px;font-weight:700;font-family:'DM Mono',monospace}table{width:100%;border-collapse:collapse;margin-bottom:8px}th{background:#F5F4F1;padding:3px 6px;font-size:7px;text-transform:uppercase;letter-spacing:.3px;font-weight:700;color:#888;text-align:left;border-bottom:1px solid #E0E0E0}td{padding:3px 6px;font-size:8px;border-bottom:1px solid #F5F5F5}.mono{font-family:'DM Mono',monospace}.green{color:#111111}.bold{font-weight:700}.r{text-align:right}.cat{background:#E8E6E1;font-weight:700;font-size:7px;text-transform:uppercase;letter-spacing:.4px;padding:4px 6px}.totrow td{border-top:2px solid #111;font-weight:700}.footer{margin-top:10px;padding-top:4px;border-top:1px solid #E0E0E0;display:flex;justify-content:space-between;font-size:7px;color:#888}`;
    let html = `<html><head><title>Gastos Generales - ${d.codigoOferta||""}</title><style>${S}</style></head><body>`;
    html += `<div class="header"><div><div class="logo">HABITARIS</div><div class="logo-sub">Arquitectura · Interiorismo · Construcción</div></div>`;
    html += `<div style="text-align:right"><div style="font-size:13px;font-weight:700">Gastos Generales de Obra</div>`;
    html += `<div style="font-size:8px;color:#555">${d.proyecto||""} · ${d.codigoOferta||""} · ${d.cliente||""}</div></div></div>`;
    html += `<div class="kpis"><div class="kpi">Costo directo: <strong class="mono">${fmt(costoDirecto)}</strong></div>`;
    html += `<div class="kpi">Total GG: <strong class="mono green">${fmt(totalGG)}</strong></div>`;
    html += `<div class="kpi">% GG: <span class="badge">${(pctGG*100).toFixed(2)}%</span></div>`;
    html += `<div class="kpi">Duración: <strong>${mesesEjec} meses</strong></div></div>`;

    GG_CATEGORIAS.forEach(cat => {
      const catItems = items.filter(it => it.categoria === cat.id && subtotalItem(it) > 0);
      if (catItems.length === 0) return;
      const catTotal = catItems.reduce((s,it) => s + subtotalItem(it), 0);
      html += `<h2>${cat.label} — ${fmt(catTotal)}</h2>`;
      html += `<table><tr><th>Descripción</th><th>Unidad</th><th class="r">Cant.</th><th class="r">Valor unit.</th><th class="r">Subtotal</th></tr>`;
      catItems.forEach(it => {
        html += `<tr><td>${it.desc}</td><td>${it.unidad}</td><td class="mono r">${it.cant}</td>`;
        html += `<td class="mono r">${fmt(it.valorUnit)}</td><td class="mono r bold green">${fmt(subtotalItem(it))}</td></tr>`;
      });
      html += `</table>`;
    });

    html += `<table style="margin-top:12px"><tr class="totrow"><td colspan="4" class="bold">TOTAL GASTOS GENERALES</td>`;
    html += `<td class="mono r bold green" style="font-size:11px">${fmt(totalGG)} ${moneda}</td></tr>`;
    html += `<tr><td colspan="4">Incidencia sobre costo directo</td><td class="mono r bold" style="font-size:11px">${(pctGG*100).toFixed(2)}%</td></tr></table>`;
    html += `<div class="footer"><span>HABITARIS · ${d.codigoOferta||""} · Gastos generales</span><span>${new Date().toLocaleDateString("es-CO")}</span></div>`;
    html += `</body></html>`;
    w.document.write(html); w.document.close();
    setTimeout(() => w.print(), 400);
  };

  // CSV Export
  const exportCSV = () => {
    let csv = "\ufeffCategoría;Descripción;Unidad;Cantidad;Valor unitario;Subtotal\n";
    GG_CATEGORIAS.forEach(cat => {
      items.filter(it => it.categoria === cat.id).forEach(it => {
        csv += `${cat.label};${it.desc};${it.unidad};${it.cant};${it.valorUnit};${subtotalItem(it)}\n`;
      });
    });
    csv += `;;;;;;TOTAL;${totalGG}\n;;;;;;% GG;${(pctGG*100).toFixed(2)}%\n`;
    const blob = new Blob([csv], { type:"text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `GG_${d.codigoOferta||"proyecto"}.csv`; a.click();
  };

  const inp = { border:`1px solid ${C.border}`, borderRadius:3, padding:"3px 6px", fontSize:11, fontFamily:"'DM Sans',sans-serif", background:"#fff" };

  return (
    <div className="fade">
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, flexWrap:"wrap", gap:8 }}>
        <div>
          <p style={{ margin:0, fontSize:10, color:C.inkLight, letterSpacing:1.5, textTransform:"uppercase" }}>Gastos generales de obra</p>
          <h2 style={{ margin:0, fontSize:18, fontWeight:700 }}>Costos indirectos distribuibles</h2>
        </div>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          <button onClick={autoFillMeses}
            style={{ padding:"6px 12px", border:`1px solid ${C.border}`, borderRadius:4, background:"#fff",
              fontSize:10, fontWeight:600, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", color:C.inkMid }}>
            ⚡ Auto {ggMeses} meses
          </button>
          <button onClick={generarOrgAutomatic}
            style={{ padding:"6px 12px", border:`1px solid ${C.border}`, borderRadius:4, background:"#fff",
              fontSize:10, fontWeight:600, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", color:C.inkMid }}>
            👔 → Organigrama
          </button>
          <button onClick={exportCSV}
            style={{ padding:"6px 12px", border:`1px solid ${C.border}`, borderRadius:4, background:"#fff",
              fontSize:10, fontWeight:600, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", color:C.inkMid }}>
            📥 CSV
          </button>
          <button onClick={printGG}
            style={{ padding:"6px 14px", background:"#111", color:"#fff", border:"none", borderRadius:5,
              fontSize:10, fontWeight:600, cursor:"pointer", fontFamily:"'DM Sans',sans-serif",
              display:"flex", alignItems:"center", gap:4 }}>
            <FileText size={11}/> Vista PDF
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5, 1fr)", gap:12, marginBottom:16 }}>
        {[
          ["Costo directo", fmt(costoDirecto), C.ink],
          ["Total GG", fmt(totalGG), "#111111"],
          ["% GG / CD", (pctGG*100).toFixed(2)+"%", "#3B3B3B"],
          ["GG por actividad", fmt(totalActividades > 0 ? totalGG/totalActividades : 0), "#8C6A00"],
        ].map(([l,v,col]) => (
          <Card key={l} style={{ padding:"10px 14px", textAlign:"center" }}>
            <div style={{ fontSize:8, fontWeight:700, color:"#888", textTransform:"uppercase", letterSpacing:0.5 }}>{l}</div>
            <div style={{ fontSize:18, fontWeight:800, color:col, fontFamily:"'DM Mono',monospace", marginTop:2 }}>{v}</div>
          </Card>
        ))}
        {/* Editable duration — hybrid */}
        <Card style={{ padding:"10px 14px", textAlign:"center" }}>
          <div style={{ fontSize:8, fontWeight:700, color:"#888", textTransform:"uppercase", letterSpacing:0.5 }}>Duración GG</div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:4, marginTop:2 }}>
            <input type="number" min={1} max={120} value={ggMeses}
              onChange={e=>set("ggMeses", Math.max(1,parseInt(e.target.value)||1))}
              style={{ width:50, fontSize:18, fontWeight:800, color:C.ink, fontFamily:"'DM Mono',monospace",
                textAlign:"center", border:"none", borderBottom:`2px solid ${C.border}`, background:"transparent",
                outline:"none" }}/>
            <span style={{ fontSize:12, fontWeight:600, color:"#888" }}>meses</span>
          </div>
          {/* Checkbox: mes de cierre administrativo */}
          <label style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:4, marginTop:5,
            fontSize:8, color:C.inkMid, cursor:"pointer" }}>
            <input type="checkbox" checked={!!d.ggMesCierre}
              onChange={e=>{
                const on = e.target.checked;
                set("ggMesCierre", on);
                set("ggMeses", on ? ggMeses + 1 : Math.max(1, ggMeses - 1));
              }}
              style={{ width:12, height:12, accentColor:"#111111" }}/>
            +1 mes cierre admin.
          </label>
          {/* Discrepancy alert */}
          {hayDiscrepancia && (
            <div style={{ marginTop:6, background:"#FFF8E6", border:"1px solid #E6D44D55", borderRadius:4, padding:"5px 8px" }}>
              <div style={{ fontSize:8, color:"#8C6A00", fontWeight:600, marginBottom:3 }}>
                ⚠️ Cronograma da {mesesCrono} meses, tienes {ggMeses}
              </div>
              <div style={{ display:"flex", gap:3 }}>
                <button onClick={()=>sincronizarCrono(false)}
                  style={{ flex:1, padding:"3px 4px", fontSize:7, fontWeight:700, cursor:"pointer",
                    border:`1px solid #3B3B3B44`, borderRadius:3, background:"#F0F0F0", color:"#3B3B3B",
                    fontFamily:"'DM Sans',sans-serif" }}>
                  Usar {mesesCrono}m
                </button>
                <button onClick={()=>sincronizarCrono(true)}
                  style={{ flex:1, padding:"3px 4px", fontSize:7, fontWeight:700, cursor:"pointer",
                    border:`1px solid #11111144`, borderRadius:3, background:"#E8F4EE", color:"#111111",
                    fontFamily:"'DM Sans',sans-serif" }}>
                  {mesesCrono}m + 1 cierre
                </button>
              </div>
            </div>
          )}
          {mesesCrono > 0 && !hayDiscrepancia && (
            <div style={{ fontSize:7, color:"#111111", marginTop:4 }}>✅ Sincronizado con cronograma</div>
          )}
        </Card>
      </div>

      {/* Criterion + info banner */}
      <Card style={{ padding:"12px 16px", marginBottom:14 }}>
        <div style={{ display:"flex", gap:16, alignItems:"flex-start", flexWrap:"wrap" }}>
          <div style={{ flex:"0 0 260px" }}>
            <div style={{ fontSize:9, fontWeight:700, color:"#888", textTransform:"uppercase", letterSpacing:1, marginBottom:6 }}>
              Criterio de distribución
            </div>
            <div style={{ display:"flex", gap:0 }}>
              {[
                { id:"costo", lbl:"📊 Prop. al CD", desc:"Según costo directo de cada actividad" },
                { id:"duracion", lbl:"📅 Prop. duración", desc:"Según días de duración" },
                { id:"mo", lbl:"👷 Prop. a M.O.", desc:"Según mano de obra" },
              ].map((opt,i) => (
                <button key={opt.id} onClick={()=>set("ggCriterio",opt.id)}
                  style={{ flex:1, padding:"5px 4px", fontSize:9, cursor:"pointer", fontWeight:600,
                    border:`1px solid ${C.border}`, fontFamily:"'DM Sans',sans-serif",
                    borderRadius:i===0?"4px 0 0 4px":i===2?"0 4px 4px 0":"0",
                    borderLeft:i>0?"none":undefined,
                    background:criterio===opt.id?"#F0F0F0":"#fff",
                    color:criterio===opt.id?"#3B3B3B":C.inkMid }}>
                  {opt.lbl}
                </button>
              ))}
            </div>
            <div style={{ fontSize:9, color:"#888", marginTop:4 }}>
              {criterio==="costo" ? "Cada actividad recibe GG proporcional a su costo directo" :
               criterio==="duracion" ? "Cada actividad recibe GG proporcional a su duración en días" :
               "Cada actividad recibe GG proporcional a su componente de mano de obra"}
            </div>
          </div>
          <div style={{ flex:1, background:"#F0F0F0", borderRadius:4, padding:"8px 12px" }}>
            <div style={{ fontSize:11, color:"#3B3B3B" }}>
              💡 Estos gastos se <strong>distribuyen en cada actividad</strong> como coeficiente indirecto.
              {d.modoCalcObra==="aiu"
                ? ` En AIU → entra como A (Administración) = ${(pctGG*100).toFixed(2)}%. Se multiplica: CD × (1 + ${(pctGG*100).toFixed(1)}% + I + U).`
                : ` En modo margen → GG = ${(pctGG*100).toFixed(2)}% entra en el denominador: PVP = CD / (1 − M − GC − GG) × (1 − GF).`}
            </div>
            <div style={{ fontSize:10, color:"#3B3B3B", marginTop:4, fontWeight:600 }}>
              No visible en presupuesto de venta salvo que se solicite la estructura de costos.
            </div>
          </div>
        </div>
      </Card>

      {/* Categories */}
      {GG_CATEGORIAS.map(cat => {
        const catItems = items.filter(it => it.categoria === cat.id);
        const catTotal = catItems.reduce((s,it) => s + subtotalItem(it), 0);
        return (
          <Card key={cat.id} style={{ padding:0, marginBottom:12, overflow:"hidden" }}>
            <div style={{ padding:"8px 14px", background:"#F5F4F1", borderBottom:`1px solid ${C.border}`,
              display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ fontSize:12, fontWeight:700, color:C.ink }}>{cat.label}</div>
              <div style={{ fontFamily:"'DM Mono',monospace", fontSize:12, fontWeight:700, color:catTotal>0?"#111111":"#CCC" }}>
                {fmt(catTotal)} {moneda}
              </div>
            </div>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ background:"#FFFFFF" }}>
                  <th style={{ padding:"4px 8px", fontSize:8, fontWeight:700, color:"#888", textTransform:"uppercase", textAlign:"left", width:"40%" }}>Descripción</th>
                  <th style={{ padding:"4px 8px", fontSize:8, fontWeight:700, color:"#888", textTransform:"uppercase", textAlign:"center", width:70 }}>Unidad</th>
                  <th style={{ padding:"4px 8px", fontSize:8, fontWeight:700, color:"#888", textTransform:"uppercase", textAlign:"center", width:80 }}>Cant.</th>
                  <th style={{ padding:"4px 8px", fontSize:8, fontWeight:700, color:"#888", textTransform:"uppercase", textAlign:"right", width:120 }}>Valor unit.</th>
                  <th style={{ padding:"4px 8px", fontSize:8, fontWeight:700, color:"#888", textTransform:"uppercase", textAlign:"right", width:120 }}>Subtotal</th>
                  <th style={{ width:30 }}/>
                </tr>
              </thead>
              <tbody>
                {catItems.map(it => (
                  <tr key={it.id} style={{ borderBottom:`1px solid ${C.border}` }}>
                    <td style={{ padding:"4px 8px" }}>
                      <input value={it.desc} onChange={e=>updItem(it.id,"desc",e.target.value)}
                        style={{ ...inp, width:"100%" }} placeholder="Descripción del gasto"/>
                    </td>
                    <td style={{ padding:"4px 8px", textAlign:"center" }}>
                      <select value={it.unidad} onChange={e=>updItem(it.id,"unidad",e.target.value)}
                        style={{ ...inp, textAlign:"center" }}>
                        {["mes","gl","ud","ml","m²","jgo","día"].map(u=><option key={u}>{u}</option>)}
                      </select>
                    </td>
                    <td style={{ padding:"4px 8px" }}>
                      <input type="number" min="0" step="0.1" value={it.cant||0}
                        onChange={e=>updItem(it.id,"cant",parseFloat(e.target.value)||0)}
                        style={{ ...inp, width:"100%", textAlign:"center", fontFamily:"'DM Mono',monospace" }}/>
                    </td>
                    <td style={{ padding:"4px 8px" }}>
                      <input type="number" min="0" value={it.valorUnit||0}
                        onChange={e=>updItem(it.id,"valorUnit",parseFloat(e.target.value)||0)}
                        style={{ ...inp, width:"100%", textAlign:"right", fontFamily:"'DM Mono',monospace" }}/>
                    </td>
                    <td style={{ padding:"4px 8px", textAlign:"right", fontFamily:"'DM Mono',monospace", fontWeight:700,
                      fontSize:11, color:subtotalItem(it)>0?"#111111":"#CCC" }}>
                      {fmt(subtotalItem(it))}
                    </td>
                    <td style={{ padding:"4px 4px" }}>
                      <button onClick={()=>delItem(it.id)} style={{ background:"none",border:"none",cursor:"pointer",color:"#C44",padding:2 }}>
                        <Trash2 size={10}/>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ padding:"4px 8px" }}>
              <button onClick={()=>addItem(cat.id)}
                style={{ width:"100%", padding:"4px 8px", fontSize:10, cursor:"pointer",
                  border:`1px dashed ${C.border}`, borderRadius:3, background:"#fff", color:C.inkMid,
                  fontFamily:"'DM Sans',sans-serif" }}>
                + Añadir ítem
              </button>
            </div>
          </Card>
        );
      })}

      {/* TOTAL */}
      <Card style={{ padding:"14px 18px", background:"#E8F4EE", border:"1px solid #B8DEC9" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:"#111111", textTransform:"uppercase", letterSpacing:0.5 }}>Total gastos generales</div>
            <div style={{ fontSize:10, color:"#111111", marginTop:2 }}>
              Incidencia: <strong>{(pctGG*100).toFixed(2)}%</strong> sobre costo directo →
              {d.modoCalcObra==="aiu" ? ` AIU → A = ${(pctGG*100).toFixed(2)}%` : ` Coeficiente GG = ${(pctGG*100).toFixed(2)}%`}
            </div>
          </div>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:22, fontWeight:800, color:"#111111" }}>
            {fmt(totalGG)} <span style={{ fontSize:11, fontWeight:600 }}>{moneda}</span>
          </div>
        </div>
      </Card>

      {/* Distribution preview per activity */}
      {(() => {
        const lineas = (d.borradorLineas||[]).filter(l => !l.esCapitulo && (l.precioCD||0) > 0);
        if (lineas.length === 0 || totalGG === 0) return null;

        // Calculate distribution weights per criterion
        const totCD = lineas.reduce((s,l) => s + (l.precioCD||0), 0);
        const totDur = lineas.reduce((s,l) => s + (l.duracion||l.cantidad||1), 0);
        const totMO = lineas.reduce((s,l) => {
          const apu = l.apuData;
          if (!apu) return s;
          const moTotal = (apu.equiposUsados||[]).reduce((sm,eq) => {
            return sm + (eq.cuadrilla||[]).reduce((sc,c) => sc + (c.cant||0) * (c.jornal||0) * (c.rendimiento||1), 0);
          }, 0) + (apu.moDirecta||[]).reduce((sm2,m) => sm2 + (m.cant||0)*(m.jornal||0)*(m.rendimiento||1), 0);
          return s + moTotal;
        }, 0);

        const getWeight = (l) => {
          if (criterio === "duracion") return totDur > 0 ? (l.duracion||l.cantidad||1) / totDur : 0;
          if (criterio === "mo") {
            const apu = l.apuData;
            if (!apu || totMO === 0) return totCD > 0 ? (l.precioCD||0)/totCD : 0;
            const moLine = (apu.equiposUsados||[]).reduce((sm,eq) =>
              sm + (eq.cuadrilla||[]).reduce((sc,c) => sc + (c.cant||0)*(c.jornal||0)*(c.rendimiento||1),0),0)
              + (apu.moDirecta||[]).reduce((sm2,m) => sm2 + (m.cant||0)*(m.jornal||0)*(m.rendimiento||1),0);
            return totMO > 0 ? moLine / totMO : 0;
          }
          // Default: proporcional al CD
          return totCD > 0 ? (l.precioCD||0) / totCD : 0;
        };

        return (
          <Card style={{ padding:0, marginTop:12, overflow:"hidden" }}>
            <div style={{ padding:"8px 14px", background:"#F5F4F1", borderBottom:`1px solid ${C.border}`,
              display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ fontSize:11, fontWeight:700 }}>
                📊 Distribución por actividad
                <span style={{ fontSize:9, fontWeight:400, color:"#888", marginLeft:8 }}>
                  Criterio: {criterio==="costo"?"proporcional al CD":criterio==="duracion"?"proporcional a duración":"proporcional a M.O."}
                </span>
              </div>
              <div style={{ fontSize:10, color:"#888" }}>{lineas.length} actividades</div>
            </div>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr style={{ background:"#FFFFFF" }}>
                    <th style={{ padding:"4px 8px", fontSize:8, fontWeight:700, color:"#888", textAlign:"left" }}>Actividad</th>
                    <th style={{ padding:"4px 8px", fontSize:8, fontWeight:700, color:"#888", textAlign:"right" }}>CD</th>
                    <th style={{ padding:"4px 8px", fontSize:8, fontWeight:700, color:"#888", textAlign:"right" }}>Peso %</th>
                    <th style={{ padding:"4px 8px", fontSize:8, fontWeight:700, color:"#888", textAlign:"right" }}>GG asignado</th>
                    <th style={{ padding:"4px 8px", fontSize:8, fontWeight:700, color:"#888", textAlign:"right" }}>CD + GG</th>
                    <th style={{ padding:"4px 8px", fontSize:8, fontWeight:700, color:"#888", textAlign:"right" }}>Incid. GG</th>
                  </tr>
                </thead>
                <tbody>
                  {lineas.slice(0, 20).map((l,i) => {
                    const w = getWeight(l);
                    const ggLine = totalGG * w;
                    const cdGG = (l.precioCD||0) + ggLine;
                    return (
                      <tr key={l.id||i} style={{ borderBottom:`1px solid ${C.border}` }}>
                        <td style={{ padding:"3px 8px", fontSize:10, maxWidth:250, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                          {l.descripcion||l.partida||"Línea "+(i+1)}
                        </td>
                        <td style={{ padding:"3px 8px", fontSize:10, textAlign:"right", fontFamily:"'DM Mono',monospace" }}>
                          {fmt(l.precioCD||0)}
                        </td>
                        <td style={{ padding:"3px 8px", fontSize:10, textAlign:"right", fontFamily:"'DM Mono',monospace", color:"#3B3B3B" }}>
                          {(w*100).toFixed(1)}%
                        </td>
                        <td style={{ padding:"3px 8px", fontSize:10, textAlign:"right", fontFamily:"'DM Mono',monospace", fontWeight:600, color:"#111111" }}>
                          {fmt(ggLine)}
                        </td>
                        <td style={{ padding:"3px 8px", fontSize:10, textAlign:"right", fontFamily:"'DM Mono',monospace", fontWeight:700 }}>
                          {fmt(cdGG)}
                        </td>
                        <td style={{ padding:"3px 8px", fontSize:10, textAlign:"right" }}>
                          <div style={{ background:"#F0F0F0", borderRadius:10, height:6, overflow:"hidden" }}>
                            <div style={{ background:"#3B3B3B", height:"100%", width:`${Math.min(w*100*3,100)}%`, borderRadius:10 }}/>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {lineas.length > 20 && (
                    <tr><td colSpan={6} style={{ padding:"4px 8px", fontSize:9, color:"#888", textAlign:"center" }}>
                      ... y {lineas.length-20} actividades más
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        );
      })()}
    </div>
  );
}


/* ── Flujo de Caja (proyección desde oferta) ────────────────── */
function TFlu({ d, set, r }) {
  const pais = d.pais || "CO";
  const moneda = pais === "CO" ? "COP" : "EUR";
  const fmt = (n) => new Intl.NumberFormat("es-CO",{maximumFractionDigits:0}).format(n||0);

  // ── Modo de cobro: hitos | avance | avance_anticipo ──
  const modoCobro = d.modoCobro || "avance_anticipo";
  const fuenteAvance = d.fuenteAvance || "cronograma"; // cronograma | manual

  // ── Anticipo configurable ──
  const pctAnticipo = d.fluPctAnticipo ?? 0.30;
  const mesPrimerCobro = d.fluMesPrimerCobro ?? 1; // month # for first billing
  const diasPago = d.condDiasPago || 30;  // days to pay suppliers
  const diasCobro = d.condDiasCobro || 30; // days to collect from client

  // ── Duration from cronograma ──
  const calcDuracionAuto = () => {
    const cronoActs = (d.cronogramaActivos||[]).filter(a=>!a.esCapitulo && a.duracion > 0);
    if (cronoActs.length > 0) {
      const fechaBase = d.fechaInicio ? new Date(d.fechaInicio) : new Date();
      let maxEnd = fechaBase.getTime();
      cronoActs.forEach(a => {
        const start = new Date(a.inicio || fechaBase);
        const end = start.getTime() + (a.duracion||1) * 86400000;
        if (end > maxEnd) maxEnd = end;
      });
      return Math.max(1, Math.ceil((maxEnd - fechaBase.getTime()) / (30*86400000)));
    }
    if (d.fechaInicio && d.fechaEntrega) {
      const diff = new Date(d.fechaEntrega) - new Date(d.fechaInicio);
      return Math.max(1, Math.ceil(diff / (30*86400000)));
    }
    return d.ggMeses || 6;
  };
  const mesesEjec = calcDuracionAuto();
  const mesesDesfaseCobro = Math.ceil(diasCobro / 30);
  const mesesDesfasePago = Math.ceil(diasPago / 30);
  const nMesesCalc = (() => {
    if (modoCobro === "hitos") {
      const maxH = Math.max(0, ...(d.flujoCobros||[]).map(h => h.mes||0));
      return Math.max(12, maxH + mesesDesfaseCobro + 2);
    }
    return Math.max(12, mesesEjec + Math.max(mesesDesfaseCobro, mesesDesfasePago) + 2);
  })();

  // ── Hitos de pago (for hitos mode) ──
  const [hitos, setHitos] = useState(() => d.flujoCobros || [
    { id:uid(), nombre:"Anticipo / Firma", pct:0.30, mes:0 },
    { id:uid(), nombre:"Avance 50%", pct:0.30, mes:2 },
    { id:uid(), nombre:"Entrega final", pct:0.30, mes:4 },
    { id:uid(), nombre:"Retención final", pct:0.10, mes:5 },
  ]);
  useEffect(() => { set("flujoCobros", hitos); }, [hitos]);
  const updHito = (id, k, v) => setHitos(h => h.map(x=>x.id===id?{...x,[k]:v}:x));
  const addHito = () => setHitos(h=>[...h,{id:uid(),nombre:"Nuevo hito",pct:0,mes:0}]);
  const delHito = (id) => setHitos(h=>h.filter(x=>x.id!==id));
  const totalPctHitos = hitos.reduce((s,h)=>s+(h.pct||0),0);

  // ── Manual advance % per month (for manual mode) ──
  const [avanceManual, setAvanceManual] = useState(() => d.fluAvanceManual || Array.from({length:12},()=>0));
  useEffect(() => { set("fluAvanceManual", avanceManual); }, [avanceManual]);
  const updAvManual = (i,v) => setAvanceManual(a => a.map((x,j) => j===i ? v : x));
  const totalPctManual = avanceManual.reduce((s,v) => s+v, 0);

  // ── Avance from cronograma (% per month) ──
  const calcAvanceCrono = () => {
    const cronoActs = (d.cronogramaActivos||[]).filter(a => !a.esCapitulo && (a.precioVenta||a.precioCD) > 0);
    const totalVenta = cronoActs.reduce((s,a) => s + (a.precioVenta||a.precioCD||0), 0);
    if (totalVenta === 0) return Array.from({length:nMesesCalc},()=>0);
    const fechaBase = d.fechaInicio ? new Date(d.fechaInicio) : new Date();
    const pctPerMes = Array.from({length:nMesesCalc},()=>0);
    cronoActs.forEach(a => {
      const startDate = new Date(a.inicio || fechaBase);
      const mesInicio = Math.max(0, Math.round((startDate - fechaBase) / (30*86400000)));
      const durMeses = Math.max(1, Math.ceil((a.duracion||30) / 30));
      const pctAct = (a.precioVenta||a.precioCD||0) / totalVenta;
      for (let m = mesInicio; m < mesInicio + durMeses && m < nMesesCalc; m++) {
        pctPerMes[m] += pctAct / durMeses;
      }
    });
    return pctPerMes;
  };

  const avanceMensual = fuenteAvance === "manual" ? avanceManual : calcAvanceCrono();

  // ── Financial data ──
  const pvp = r.PVP || 0;
  const iva = r.IVA || 0;
  const pvpIVA = pvp + iva;
  const costo = r.COSTO || 0;
  const ret = r.ret || 0;
  const FISCAL = pais === "CO" ? {
    reteFuente: { pct: d.pctReteFuente || 0 },
    reteICA:    { pct: d.pctReteICA || 0 },
    reteIVA:    { pct: d.pctReteIVA || 0 },
    iva:        { pct: d.tarifaIVA || 0.19 },
  } : { iva: { pct: d.tarifaIVA || 0.21 } };
  const totalRetPct = pais === "CO" ? (FISCAL.reteFuente?.pct||0) + (FISCAL.reteICA?.pct||0) + (FISCAL.reteIVA?.pct||0) : 0;

  // ── Cost distribution per month (from cronograma or linear) ──
  const cronoActs = (d.cronogramaActivos||[]).filter(a=>!a.esCapitulo && a.precioCD > 0);
  const costoMes = (m) => {
    if (cronoActs.length > 0) {
      const fechaBase = d.fechaInicio ? new Date(d.fechaInicio) : new Date();
      let total = 0;
      cronoActs.forEach(a => {
        const startDate = new Date(a.inicio || fechaBase);
        const mesInicio = Math.max(0, Math.round((startDate - fechaBase) / (30*86400000)));
        const durMeses = Math.max(1, Math.ceil((a.duracion||30) / 30));
        if (m >= mesInicio && m < mesInicio + durMeses) total += (a.precioCD||0) / durMeses;
      });
      return total;
    }
    // Fallback: distribute evenly over execution period
    if (m >= 0 && m < mesesEjec) return costo / Math.max(1, mesesEjec);
    return 0;
  };

  // ── CASH FLOW SERIES ──
  const meses = Array.from({length:nMesesCalc},(_,i)=>i);
  let acum = 0;
  const series = meses.map(m => {
    let cobro = 0, anticipoM = 0, amortM = 0;

    if (modoCobro === "hitos") {
      cobro = hitos.filter(h => h.mes === m).reduce((s,h) => s + (h.pct||0) * pvp, 0);
    } else {
      // avance or avance_anticipo
      const esConAnticipo = modoCobro === "avance_anticipo";
      if (esConAnticipo && m === 0) {
        anticipoM = pctAnticipo * pvp;
        cobro = anticipoM;
      } else if (m >= mesPrimerCobro) {
        const avPct = avanceMensual[m - mesPrimerCobro] || 0;
        const certBruto = avPct * pvp;
        if (esConAnticipo) {
          amortM = avPct * pctAnticipo * pvp; // proportional amortization
          cobro = certBruto - amortM;
        } else {
          cobro = certBruto;
        }
      }
    }

    const ivaM = cobro > 0 ? (d.tipoProyecto === "OBRA" ? (r.U||d.margen||0) * cobro * (FISCAL.iva?.pct||0) : cobro * (FISCAL.iva?.pct||0)) : 0;
    const retM = cobro > 0 && pais === "CO" ? cobro * totalRetPct : 0;
    const ingNeto = cobro + ivaM - retM;
    const cos = costoMes(m);
    const neto = ingNeto - cos;
    acum += neto;
    return { m, cobro, anticipoM, amortM, ivaM, retM, ingNeto, cos, neto, acum,
      avPct: (modoCobro !== "hitos" && m >= mesPrimerCobro) ? (avanceMensual[m - mesPrimerCobro]||0) : 0 };
  });

  // ── PDF Export ──
  const printFlujoCaja = () => {
    const w = window.open("","_blank");
    const totalCobro = series.reduce((s,d2) => s+d2.cobro, 0);
    const totalIva = series.reduce((s,d2) => s+d2.ivaM, 0);
    const totalRet = series.reduce((s,d2) => s+d2.retM, 0);
    const totalCos = series.reduce((s,d2) => s+d2.cos, 0);
    const lastAcum = series.length > 0 ? series[series.length-1].acum : 0;
    const S = `@import url('https://fonts.googleapis.com/css2?family=DM Sans:wght@300;400;600;700;800&family=DM+Mono:wght@400;500&display=swap');@page{size:landscape;margin:10mm}*{margin:0;padding:0;box-sizing:border-box}body{font-family:'DM Sans',sans-serif;color:#111;font-size:8px;padding:16px}.header{display:flex;justify-content:space-between;margin-bottom:10px;padding-bottom:8px;border-bottom:3px solid #111}.logo{font-size:14px;font-weight:800;letter-spacing:3px}.logo-sub{font-size:6px;letter-spacing:2px;color:#888;text-transform:uppercase}h2{font-size:11px;margin:10px 0 4px}.kpis{display:flex;gap:14px;margin-bottom:8px;font-size:8px;color:#555}.kpi strong{color:#111}table{width:100%;border-collapse:collapse}th{background:#F5F4F1;padding:2px 4px;font-size:6px;text-transform:uppercase;letter-spacing:.3px;font-weight:700;color:#888;text-align:right;border-bottom:1px solid #E0E0E0}th:first-child{text-align:left}td{padding:2px 4px;font-size:7px;text-align:right;border-bottom:1px solid #F5F5F5}td:first-child{text-align:left;font-weight:600;background:#FFFFFF}td.section{background:#E8E6E1;font-weight:700;font-size:6px;text-transform:uppercase;letter-spacing:.4px;text-align:left;padding:3px 4px}.mono{font-family:'DM Mono',monospace}.green{color:#111111}.red{color:#B91C1C}.bold{font-weight:700}.footer{margin-top:8px;padding-top:4px;border-top:1px solid #E0E0E0;display:flex;justify-content:space-between;font-size:6px;color:#888}`;
    let html = `<html><head><title>Flujo de caja - ${d.codigoOferta||""}</title><style>${S}</style></head><body>`;
    html += `<div class="header"><div><div class="logo">HABITARIS</div><div class="logo-sub">Arquitectura · Interiorismo · Construcción</div></div>`;
    html += `<div style="text-align:right"><div style="font-size:12px;font-weight:700">Flujo de Caja Proyectado</div>`;
    html += `<div style="font-size:7px;color:#555">${d.proyecto||""} · ${d.codigoOferta||""} · ${d.cliente||""}</div></div></div>`;
    html += `<div class="kpis"><div class="kpi">PVP: <strong class="mono">${fmt(pvp)}</strong></div>`;
    html += `<div class="kpi">Costo: <strong class="mono">${fmt(costo)}</strong></div>`;
    html += `<div class="kpi">Duración: <strong>${mesesEjec} meses</strong></div>`;
    html += `<div class="kpi">Modo: <strong>${modoCobro==="hitos"?"Hitos":modoCobro==="avance"?"Avance s/anticipo":"Avance c/anticipo"}</strong></div>`;
    html += `${modoCobro!=="hitos"?`<div class="kpi">Anticipo: <strong>${(pctAnticipo*100).toFixed(0)}%</strong></div>`:""}</div>`;

    html += `<table><thead><tr><th>Concepto</th>`;
    series.forEach(s => { html += `<th>${s.m===0?"M0":s.m+"°"}</th>`; });
    html += `<th style="background:#E6F4EC;color:#111111">Total</th></tr></thead><tbody>`;

    // Avance %
    if (modoCobro !== "hitos") {
      html += `<tr><td class="section" colspan="${series.length+2}">AVANCE</td></tr>`;
      html += `<tr><td>% Avance</td>`;
      series.forEach(s => { html += `<td class="mono">${s.avPct>0?(s.avPct*100).toFixed(1)+"%":"—"}</td>`; });
      html += `<td class="mono bold">${(series.reduce((a,s)=>a+s.avPct,0)*100).toFixed(1)}%</td></tr>`;
    }

    html += `<tr><td class="section" colspan="${series.length+2}">COBROS</td></tr>`;
    html += `<tr><td>Cobros</td>`;
    series.forEach(s => { html += `<td class="mono ${s.cobro>0?"green":""}">${s.cobro?fmt(s.cobro):"—"}</td>`; });
    html += `<td class="mono green bold">${fmt(totalCobro)}</td></tr>`;

    if (modoCobro === "avance_anticipo") {
      html += `<tr><td>↳ Anticipo</td>`;
      series.forEach(s => { html += `<td class="mono">${s.anticipoM?fmt(s.anticipoM):"—"}</td>`; });
      html += `<td class="mono">${fmt(series.reduce((a,s)=>a+s.anticipoM,0))}</td></tr>`;
      html += `<tr><td>↳ Amortización</td>`;
      series.forEach(s => { html += `<td class="mono">${s.amortM?fmt(s.amortM):"—"}</td>`; });
      html += `<td class="mono">${fmt(series.reduce((a,s)=>a+s.amortM,0))}</td></tr>`;
    }

    html += `<tr><td class="section" colspan="${series.length+2}">IVA</td></tr>`;
    html += `<tr><td>IVA facturado</td>`;
    series.forEach(s => { html += `<td class="mono">${s.ivaM?fmt(s.ivaM):"—"}</td>`; });
    html += `<td class="mono">${fmt(totalIva)}</td></tr>`;

    if (pais === "CO") {
      html += `<tr><td class="section" colspan="${series.length+2}">RETENCIONES</td></tr>`;
      html += `<tr><td>Total retenciones</td>`;
      series.forEach(s => { html += `<td class="mono red">${s.retM?fmt(s.retM):"—"}</td>`; });
      html += `<td class="mono red bold">${fmt(totalRet)}</td></tr>`;
    }

    html += `<tr><td class="section" colspan="${series.length+2}">COSTOS</td></tr>`;
    html += `<tr><td>Costos directos</td>`;
    series.forEach(s => { html += `<td class="mono red">${s.cos?fmt(s.cos):"—"}</td>`; });
    html += `<td class="mono red bold">${fmt(totalCos)}</td></tr>`;

    html += `<tr><td class="section" colspan="${series.length+2}">RESULTADO</td></tr>`;
    html += `<tr style="background:#F0F7FF"><td style="background:#F0F7FF" class="bold">Caja mensual</td>`;
    series.forEach(s => { html += `<td class="mono bold ${s.neto>=0?"green":"red"}">${fmt(s.neto)}</td>`; });
    html += `<td></td></tr>`;
    html += `<tr style="background:#E6F4EC"><td style="background:#E6F4EC" class="bold">Caja acumulada</td>`;
    series.forEach(s => { html += `<td class="mono bold ${s.acum>=0?"green":"red"}">${fmt(s.acum)}</td>`; });
    html += `<td class="mono bold ${lastAcum>=0?"green":"red"}">${fmt(lastAcum)}</td></tr>`;

    html += `</tbody></table>`;
    html += `<div class="footer"><span>HABITARIS · ${d.codigoOferta||""} · Flujo de caja</span><span>${new Date().toLocaleDateString("es-CO")}</span></div>`;
    html += `</body></html>`;
    w.document.write(html); w.document.close();
    setTimeout(() => w.print(), 400);
  };

  // ── UI ──
  const inp = { border:`1px solid ${C.border}`, borderRadius:4, padding:"5px 8px",
    fontSize:12, fontFamily:"'DM Sans',sans-serif", background:C.bg };
  const modos = [
    { id:"hitos", lbl:"Hitos de pago", desc:"Pagos en fechas específicas" },
    { id:"avance", lbl:"Avance s/ anticipo", desc:"Certificación mensual por avance" },
    { id:"avance_anticipo", lbl:"Avance c/ anticipo", desc:"Anticipo + certificación - amortización" },
  ];

  return (
    <div className="fade">
      {/* ── Header with PDF button ── */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, flexWrap:"wrap", gap:8 }}>
        <div>
          <p style={{ margin:0, fontSize:10, color:C.inkLight, letterSpacing:1.5, textTransform:"uppercase" }}>Flujo de caja proyectado</p>
          <h2 style={{ margin:0, fontSize:18, fontWeight:700 }}>{mesesEjec} meses · {fmt(pvp)} PVP · {fmt(costo)} costo</h2>
        </div>
        <button onClick={printFlujoCaja}
          style={{ padding:"7px 16px", background:"#111", color:"#fff", border:"none", borderRadius:5,
            fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"'DM Sans',sans-serif",
            display:"flex", alignItems:"center", gap:6 }}>
          <FileText size={12}/> Vista PDF
        </button>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
        {/* ── LEFT: Config ── */}
        <Card style={{ padding:18 }}>
          <STitle t="Configuración de cobros" s="Selecciona modalidad de facturación" />

          {/* Mode selector — 3 buttons */}
          <div style={{ display:"flex", gap:0, marginBottom:14 }}>
            {modos.map((opt,i) => (
              <button key={opt.id} onClick={()=>set("modoCobro",opt.id)}
                style={{ flex:1, padding:"8px 6px", fontSize:10, cursor:"pointer", fontWeight:600,
                  border:`1px solid ${C.ink}`, fontFamily:"'DM Sans',sans-serif",
                  borderRadius:i===0?"5px 0 0 5px":i===2?"0 5px 5px 0":"0",
                  borderLeft:i>0?"none":undefined,
                  background:modoCobro===opt.id?C.ink:"#fff",
                  color:modoCobro===opt.id?"#fff":C.inkMid }}>
                {opt.lbl}
              </button>
            ))}
          </div>

          {/* Source info */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:12 }}>
            <div style={{ background:"#F5F4F1", borderRadius:4, padding:"6px 10px" }}>
              <div style={{ fontSize:8, fontWeight:700, color:"#888", textTransform:"uppercase" }}>Duración</div>
              <div style={{ fontSize:15, fontWeight:700 }}>{mesesEjec} meses</div>
              <div style={{ fontSize:8, color:"#888" }}>← {(d.cronogramaActivos||[]).length > 0 ? "cronograma" : "estimado"}</div>
            </div>
            <div style={{ background:"#F5F4F1", borderRadius:4, padding:"6px 10px" }}>
              <div style={{ fontSize:8, fontWeight:700, color:"#888", textTransform:"uppercase" }}>Primer mes cobro</div>
              <input type="number" value={mesPrimerCobro} min={0} max={12}
                onChange={e => set("fluMesPrimerCobro", +e.target.value)}
                style={{ ...inp, width:"100%", fontSize:14, fontWeight:700, textAlign:"center", padding:"2px 6px" }}/>
            </div>
            {modoCobro === "avance_anticipo" && (
              <div style={{ background:"#FFF8E7", borderRadius:4, padding:"6px 10px" }}>
                <div style={{ fontSize:8, fontWeight:700, color:"#8C6A00", textTransform:"uppercase" }}>% Anticipo</div>
                <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                  <input type="number" value={(pctAnticipo*100).toFixed(0)} min={0} max={100}
                    onChange={e => set("fluPctAnticipo", +e.target.value/100)}
                    style={{ ...inp, width:50, fontSize:14, fontWeight:700, textAlign:"center", padding:"2px 6px" }}/>
                  <span style={{ fontSize:12, fontWeight:600, color:"#8C6A00" }}>%</span>
                </div>
                <div style={{ fontSize:8, color:"#8C6A00" }}>{fmt(pctAnticipo * pvp)} {moneda}</div>
              </div>
            )}
            {modoCobro === "hitos" && (
              <div style={{ background:"#F5F4F1", borderRadius:4, padding:"6px 10px" }}>
                <div style={{ fontSize:8, fontWeight:700, color:"#888", textTransform:"uppercase" }}>Meses mostrados</div>
                <div style={{ fontSize:15, fontWeight:700 }}>{nMesesCalc}</div>
              </div>
            )}
          </div>

          {/* ── HITOS CONFIG ── */}
          {modoCobro === "hitos" && (<>
            {hitos.map(h => (
              <div key={h.id} style={{ display:"flex", gap:6, alignItems:"center", marginBottom:6 }}>
                <input style={{ ...inp, flex:2, minWidth:0 }} value={h.nombre}
                  onChange={e=>updHito(h.id,"nombre",e.target.value)} placeholder="Descripción"/>
                <div style={{ position:"relative", flex:"0 0 60px" }}>
                  <input type="number" style={{ ...inp, width:"100%", paddingRight:16 }} value={(h.pct*100).toFixed(0)} min={0} max={100}
                    onChange={e=>updHito(h.id,"pct",+e.target.value/100)}/>
                  <span style={{ position:"absolute", right:6, top:"50%", transform:"translateY(-50%)", fontSize:10, color:C.inkLight }}>%</span>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:4, flex:"0 0 65px" }}>
                  <span style={{ fontSize:10, color:C.inkLight }}>Mes</span>
                  <input type="number" style={{ ...inp, width:36 }} value={h.mes} min={0}
                    onChange={e=>updHito(h.id,"mes",+e.target.value)}/>
                </div>
                <button onClick={()=>delHito(h.id)} style={{ background:"none",border:"none",cursor:"pointer",color:C.danger,padding:4 }}>
                  <Trash2 size={12}/>
                </button>
              </div>
            ))}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:6 }}>
              <Btn sm v="ghost" on={addHito}><Plus size={11}/> Añadir hito</Btn>
              <span style={{ fontSize:11, color: Math.abs(totalPctHitos-1)<0.001?C.success:C.warning }}>
                Total: {(totalPctHitos*100).toFixed(0)}% {Math.abs(totalPctHitos-1)>=0.001?"⚠️":"✓"}
              </span>
            </div>
          </>)}

          {/* ── AVANCE CONFIG ── */}
          {modoCobro !== "hitos" && (<>
            {/* Source selector: cronograma vs manual */}
            <div style={{ display:"flex", gap:0, marginBottom:10 }}>
              {[{id:"cronograma",lbl:"📊 Desde cronograma"},{id:"manual",lbl:"✏️ Manual"}].map((opt,i) => (
                <button key={opt.id} onClick={()=>set("fuenteAvance",opt.id)}
                  style={{ flex:1, padding:"6px 10px", fontSize:10, cursor:"pointer", fontWeight:600,
                    border:`1px solid ${C.border}`, fontFamily:"'DM Sans',sans-serif",
                    borderRadius:i===0?"4px 0 0 4px":"0 4px 4px 0", borderLeft:i>0?"none":undefined,
                    background:fuenteAvance===opt.id?"#F0F0F0":"#fff",
                    color:fuenteAvance===opt.id?"#3B3B3B":C.inkMid }}>
                  {opt.lbl}
                </button>
              ))}
            </div>

            {fuenteAvance === "cronograma" ? (
              <div style={{ background:"#E6F4EC", borderRadius:4, padding:"8px 10px", fontSize:11, color:"#111111" }}>
                ✅ Avance calculado desde <strong>{(d.cronogramaActivos||[]).filter(a=>!a.esCapitulo).length} actividades</strong> del cronograma.
                El % de avance mensual se distribuye proporcionalmente al valor de cada actividad.
              </div>
            ) : (
              <div>
                <div style={{ fontSize:10, color:C.inkLight, marginBottom:6 }}>
                  Ingresa % de avance por mes (debe sumar 100%). Mes 1 = primer mes de ejecución.
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(6, 1fr)", gap:4 }}>
                  {Array.from({length:Math.max(mesesEjec,6)},(_,i)=>i).map(i => (
                    <div key={i} style={{ textAlign:"center" }}>
                      <div style={{ fontSize:8, color:"#888", fontWeight:700 }}>Mes {i+1}</div>
                      <input type="number" min={0} max={100} value={((avanceManual[i]||0)*100).toFixed(0)}
                        onChange={e => updAvManual(i, +e.target.value/100)}
                        style={{ ...inp, width:"100%", textAlign:"center", fontSize:12, fontWeight:600, padding:"3px 2px" }}/>
                    </div>
                  ))}
                </div>
                <div style={{ textAlign:"right", fontSize:11, marginTop:4,
                  color: Math.abs(totalPctManual-1)<0.01 ? C.success : C.warning }}>
                  Total: {(totalPctManual*100).toFixed(0)}% {Math.abs(totalPctManual-1)>=0.01?"⚠️":"✓"}
                </div>
              </div>
            )}

            {/* Explanation box */}
            {modoCobro === "avance_anticipo" && (
              <div style={{ background:"#FFF8E7", borderRadius:4, padding:"8px 10px", fontSize:10, color:"#8C6A00", marginTop:8 }}>
                <strong>Anticipo amortizable:</strong> Mes 0 → prefactura {(pctAnticipo*100).toFixed(0)}% ({fmt(pctAnticipo*pvp)}).
                Desde mes {mesPrimerCobro} → certificación por avance − amortización proporcional del anticipo.
              </div>
            )}
            {modoCobro === "avance" && (
              <div style={{ background:"#F0F0F0", borderRadius:4, padding:"8px 10px", fontSize:10, color:"#3B3B3B", marginTop:8 }}>
                <strong>Sin anticipo:</strong> Desde mes {mesPrimerCobro} → certificación directa por % de avance ejecutado.
              </div>
            )}
          </>)}
        </Card>

        {/* ── RIGHT: Summary ── */}
        <Card style={{ padding:18 }}>
          <STitle t="Resumen proyectado" s="Flujo neto con IVA y retenciones" />
          {[
            ["PVP sin IVA",     fmt(pvp),       C.ink],
            ["+ IVA facturado",  fmt(iva),       C.info],
            ["PVP con IVA",     fmt(pvpIVA),     C.ink],
            ...(pais === "CO" ? [
              ["– ReteFuente",   fmt(pvp*(FISCAL.reteFuente?.pct||0)), C.warning],
              ["– ReteICA",      fmt(pvp*(FISCAL.reteICA?.pct||0)),    C.warning],
              ["– ReteIVA",      fmt(pvp*(FISCAL.reteIVA?.pct||0)),    C.warning],
            ] : []),
            ["Total retenciones", fmt(ret),      C.danger],
            ["Costo total",     fmt(costo),       C.warning],
            ["Neto a recibir",  fmt(pvpIVA-ret), C.success],
          ].map(([l,v,col]) => (
            <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0",
              borderBottom:`1px solid ${C.border}`, fontSize:12 }}>
              <span style={{ color:C.inkMid }}>{l}</span>
              <span style={{ fontFamily:"'DM Mono',monospace", fontWeight:600, color:col }}>{v}</span>
            </div>
          ))}
        </Card>
      </div>

      {/* ═══ CASH FLOW TABLE ═══ */}
      <Card style={{ padding:0, overflow:"auto" }}>
        <div style={{ padding:"14px 18px", borderBottom:`1px solid ${C.border}` }}>
          <STitle t="Proyección mes a mes" s={`${modoCobro==="hitos"?"Hitos":modoCobro==="avance"?"Avance":"Avance + anticipo"} · ${fuenteAvance==="manual"?"Manual":"Cronograma"} · ${nMesesCalc} meses`} />
        </div>
        <div style={{ overflowX:"auto" }}>
          {(() => {
            const mArr = series;
            const th = { padding:"5px 6px", fontSize:8, fontWeight:700, color:"#666", textTransform:"uppercase",
              letterSpacing:0.3, borderBottom:"2px solid #CCC", textAlign:"right", whiteSpace:"nowrap" };
            const tdL = { padding:"4px 8px", fontSize:10, fontWeight:600, color:"#333", whiteSpace:"nowrap",
              borderRight:"1px solid #E0E0E0", background:"#F5F4F1", position:"sticky", left:0, zIndex:1, minWidth:160 };
            const td = (v, color) => ({ padding:"4px 6px", fontSize:10, fontFamily:"'DM Mono',monospace",
              textAlign:"right", color: v===0||v===undefined ? "#CCC" : (color||"#333"), whiteSpace:"nowrap" });
            const fmtS = (n) => n===0?"—":new Intl.NumberFormat("es-CO",{maximumFractionDigits:0}).format(n);
            const secHdr = (label, bg) => (
              <tr key={label} style={{ background:bg||"#E8E6E1" }}>
                <td style={{ ...tdL, background:bg||"#E8E6E1", fontWeight:700, fontSize:9, textTransform:"uppercase", letterSpacing:0.5 }}>{label}</td>
                {mArr.map(s=><td key={s.m} style={{ padding:"3px", borderBottom:"1px solid #DDD" }}/>)}
                <td style={{ padding:"3px", borderBottom:"1px solid #DDD" }}/>
              </tr>
            );
            const totCobro = mArr.reduce((s,d2)=>s+d2.cobro,0);
            const totIva = mArr.reduce((s,d2)=>s+d2.ivaM,0);
            const totRet = mArr.reduce((s,d2)=>s+d2.retM,0);
            const totCos = mArr.reduce((s,d2)=>s+d2.cos,0);
            const lastAcum = mArr.length>0 ? mArr[mArr.length-1].acum : 0;

            return (
              <table style={{ borderCollapse:"collapse", width:"100%", minWidth:mArr.length*72+170 }}>
                <thead><tr>
                  <th style={{ ...th, textAlign:"left", position:"sticky", left:0, background:"#F5F4F1", zIndex:2, minWidth:160 }}>CONCEPTO</th>
                  {mArr.map(s=><th key={s.m} style={th}>{s.m===0?"MES 0":s.m+"°"}</th>)}
                  <th style={{ ...th, background:"#E8F4EE", color:"#111111" }}>TOTAL</th>
                </tr></thead>
                <tbody>
                  {/* Avance % */}
                  {modoCobro !== "hitos" && (<>
                    {secHdr("% AVANCE","#F0F0F0")}
                    <tr>
                      <td style={tdL}>% Avance ejecutado</td>
                      {mArr.map(s=><td key={s.m} style={td(s.avPct,"#3B3B3B")}>{s.avPct>0?(s.avPct*100).toFixed(1)+"%":"—"}</td>)}
                      <td style={td(1,"#3B3B3B")}><strong>{(mArr.reduce((a,s)=>a+s.avPct,0)*100).toFixed(1)}%</strong></td>
                    </tr>
                  </>)}

                  {secHdr("COBROS","#D4EDDA")}
                  <tr>
                    <td style={tdL}>{modoCobro==="hitos"?"Cobros hitos":"Cobro neto"}</td>
                    {mArr.map(s=><td key={s.m} style={td(s.cobro,"#111111")}>{fmtS(s.cobro)}</td>)}
                    <td style={td(totCobro,"#111111")}><strong>{fmtS(totCobro)}</strong></td>
                  </tr>
                  {modoCobro==="avance_anticipo" && (<>
                    <tr>
                      <td style={tdL}>↳ Anticipo ({(pctAnticipo*100).toFixed(0)}%)</td>
                      {mArr.map(s=><td key={s.m} style={td(s.anticipoM,"#8C6A00")}>{fmtS(s.anticipoM)}</td>)}
                      <td style={td(mArr.reduce((a,s)=>a+s.anticipoM,0),"#8C6A00")}><strong>{fmtS(mArr.reduce((a,s)=>a+s.anticipoM,0))}</strong></td>
                    </tr>
                    <tr>
                      <td style={tdL}>↳ Amortización anticipo</td>
                      {mArr.map(s=><td key={s.m} style={td(s.amortM,"#8C6A00")}>{fmtS(s.amortM)}</td>)}
                      <td style={td(mArr.reduce((a,s)=>a+s.amortM,0),"#8C6A00")}><strong>{fmtS(mArr.reduce((a,s)=>a+s.amortM,0))}</strong></td>
                    </tr>
                  </>)}

                  {secHdr("IMPUESTOS","#FFF3CD")}
                  <tr>
                    <td style={tdL}>IVA facturado</td>
                    {mArr.map(s=><td key={s.m} style={td(s.ivaM,"#8C6A00")}>{fmtS(s.ivaM)}</td>)}
                    <td style={td(totIva,"#8C6A00")}><strong>{fmtS(totIva)}</strong></td>
                  </tr>

                  {pais === "CO" && (<>
                    {secHdr("RETENCIONES","#FCE4EC")}
                    <tr>
                      <td style={tdL}>Total retenciones</td>
                      {mArr.map(s=><td key={s.m} style={td(s.retM,"#B91C1C")}>{fmtS(s.retM)}</td>)}
                      <td style={td(totRet,"#B91C1C")}><strong>{fmtS(totRet)}</strong></td>
                    </tr>
                  </>)}

                  {secHdr("COSTOS","#F8D7DA")}
                  <tr>
                    <td style={tdL}>{cronoActs.length>0?"Costos (cronograma)":"Costos (distribución lineal)"}</td>
                    {mArr.map(s=><td key={s.m} style={td(s.cos,"#B91C1C")}>{fmtS(s.cos)}</td>)}
                    <td style={td(totCos,"#B91C1C")}><strong>{fmtS(totCos)}</strong></td>
                  </tr>

                  {secHdr("RESULTADO","#D6E9F8")}
                  <tr style={{ background:"#F0F7FF" }}>
                    <td style={{ ...tdL, background:"#F0F7FF", fontWeight:700 }}>Caja mensual</td>
                    {mArr.map(s=><td key={s.m} style={{ ...td(s.neto, s.neto>=0?"#111111":"#B91C1C"), fontWeight:700 }}>{fmtS(s.neto)}</td>)}
                    <td style={{ ...td(0), fontWeight:700 }}/>
                  </tr>
                  <tr style={{ background:"#E6F4EC" }}>
                    <td style={{ ...tdL, background:"#E6F4EC", fontWeight:700 }}>Caja acumulada</td>
                    {mArr.map(s=><td key={s.m} style={{ ...td(s.acum, s.acum>=0?"#111111":"#B91C1C"), fontWeight:700, fontSize:11 }}>{fmtS(s.acum)}</td>)}
                    <td style={{ ...td(lastAcum, lastAcum>=0?"#111111":"#B91C1C"), fontWeight:700, fontSize:11 }}><strong>{fmtS(lastAcum)}</strong></td>
                  </tr>
                </tbody>
              </table>
            );
          })()}
        </div>
      </Card>
    </div>
  );
}


/* ── Resumen / Cierre ── */
/* ── Equipos de Trabajo (cuadrillas para APUs) — lee de RRHH ── */
function TEqu({ d, set }) {
  const pais = d.pais || "CO";
  const moneda = pais === "CO" ? "COP" : "EUR";
  const fmtN = (n) => n ? new Intl.NumberFormat(pais==="CO"?"es-CO":"es-ES",{ maximumFractionDigits:0 }).format(n) : "0";

  // ── Read from RRHH module storage ──
  const [rrhhCargos, setRrhhCargos] = useState([]);
  const [rrhhActivos, setRrhhActivos] = useState([]);
  const [rrhhLicencias, setRrhhLicencias] = useState([]);
  const [rrhhJornada, setRrhhJornada] = useState({ hDia:8, diasSemana:5, semanasAnio:50, pctProductivas:75, diasFestivos:18, diasAusencias:5 });
  // ── Read from Logística module storage ──
  const [logItems, setLogItems] = useState([]);
  const [rrhhLoaded, setRrhhLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [cR, aR, lR, jR, liR] = await Promise.all([
          store.get("hab:rrhh:cargos"),
          store.get("hab:rrhh:activos"),
          store.get("hab:rrhh:licencias"),
          store.get("hab:rrhh:jornada"),
          store.get("hab:logistica:items"),
        ]);
        if (cR) setRrhhCargos(JSON.parse(cR.value) || []);
        if (aR) setRrhhActivos(JSON.parse(aR.value) || []);
        if (lR) setRrhhLicencias(JSON.parse(lR.value) || []);
        if (jR) setRrhhJornada(JSON.parse(jR.value));
        if (liR) setLogItems(JSON.parse(liR.value) || []);
      } catch {}
      setRrhhLoaded(true);
    })();
  }, []);

  // Productive hours from jornada
  const horasProdAnio = useMemo(() => {
    const j = rrhhJornada;
    const diasLab = j.diasSemana * j.semanasAnio - (j.diasFestivos||18) - (j.diasAusencias||5);
    return diasLab * j.hDia * ((j.pctProductivas||75) / 100);
  }, [rrhhJornada]);

  // Cost/hour per cargo from RRHH
  const costoHoraCargo = (cargoId) => {
    const c = rrhhCargos.find(x => x.id === cargoId);
    if (!c || !c.salarioBruto) return 0;
    const factor = 1 + ((c.prestaciones||52.18) + (c.segSocial||12.5) + (c.parafiscales||9)) / 100;
    const costoTotal = c.salarioBruto * factor;
    return horasProdAnio > 0 ? costoTotal / horasProdAnio : 0;
  };

  // Fallback: use TARIFAS_MO if no RRHH cargos
  const catsMO = TARIFAS_MO[pais]?.categorias || [];
  const useFallback = rrhhCargos.filter(c => c.activo !== false).length === 0;
  const cargosList = useFallback
    ? catsMO.map(c => ({ id: c.id, nombre: c.label, _fallback: true }))
    : rrhhCargos.filter(c => c.activo !== false);

  const getCostoHora = (cargoId) => {
    if (useFallback) return costHoraCat(cargoId, pais);
    return costoHoraCargo(cargoId);
  };
  const getCargoNombre = (cargoId) => {
    const c = cargosList.find(x => x.id === cargoId);
    return c?.nombre || c?.label || cargoId;
  };

  // Active activos for cost reference
  const activosActivos = rrhhActivos.filter(a => a.activo !== false && a.valorCompra > 0);
  const licenciasActivas = rrhhLicencias.filter(l => l.activo !== false && l.costoAnual > 0);

  // Depreciation cost/hour for an activo
  const costoHoraActivo = (activoId) => {
    const a = rrhhActivos.find(x => x.id === activoId);
    if (!a || !a.valorCompra) return 0;
    const depAnual = a.valorCompra / (a.vidaUtilAnios || 5);
    const horasUso = a.usoAnual || 1760;
    return depAnual / horasUso;
  };

  // ── Equipos de la oferta ──
  const equipos = d.ofertaEquipos || [];
  const setEquipos = (v) => set("ofertaEquipos", typeof v === "function" ? v(equipos) : v);
  const [editId, setEditId] = useState(null);

  // CRUD
  const addEquipo = (plantilla) => {
    const nuevo = {
      id: uid(),
      nombre: plantilla ? plantilla.nombre : "Nuevo equipo",
      cargos: (plantilla?.cargos || [{cargoId:cargosList[0]?.id||"",cantidad:1}]).map(c=>({...c,id:uid()})),
      activosUsados: plantilla?.activosUsados || [],
      licenciasUsadas: plantilla?.licenciasUsadas || [],
      rendimiento: plantilla?.rendimiento || 0.1,
      notas: "",
    };
    setEquipos([...equipos, nuevo]);
    setEditId(nuevo.id);
  };
  const delEquipo = (id) => { setEquipos(equipos.filter(e=>e.id!==id)); if(editId===id) setEditId(null); };
  const updEquipo = (id, k, v) => setEquipos(equipos.map(e=>e.id===id?{...e,[k]:v}:e));
  const addCargo = (eqId) => setEquipos(equipos.map(e => e.id===eqId ? { ...e, cargos:[...e.cargos, {id:uid(), cargoId:cargosList[0]?.id||"", cantidad:1}] } : e));
  const delCargo = (eqId, cId) => setEquipos(equipos.map(e => e.id===eqId ? { ...e, cargos:e.cargos.filter(c=>c.id!==cId) } : e));
  const updCargo = (eqId, cId, k, v) => setEquipos(equipos.map(e => e.id===eqId ? { ...e, cargos:e.cargos.map(c=>c.id===cId?{...c,[k]:v}:c) } : e));
  const addActivo = (eqId) => setEquipos(equipos.map(e => e.id===eqId ? { ...e, activosUsados:[...(e.activosUsados||[]),{id:uid(),activoId:"",cantidad:1}] } : e));
  const delActivo = (eqId, aId) => setEquipos(equipos.map(e => e.id===eqId ? { ...e, activosUsados:(e.activosUsados||[]).filter(a=>a.id!==aId) } : e));
  const updActivo = (eqId, aId, k, v) => setEquipos(equipos.map(e => e.id===eqId ? { ...e, activosUsados:(e.activosUsados||[]).map(a=>a.id===aId?{...a,[k]:v}:a) } : e));
  const addLic = (eqId) => setEquipos(equipos.map(e => e.id===eqId ? { ...e, licenciasUsadas:[...(e.licenciasUsadas||[]),{id:uid(),licId:"",cantidad:1}] } : e));
  const delLic = (eqId, lId) => setEquipos(equipos.map(e => e.id===eqId ? { ...e, licenciasUsadas:(e.licenciasUsadas||[]).filter(l=>l.id!==lId) } : e));
  const updLic = (eqId, lId, k, v) => setEquipos(equipos.map(e => e.id===eqId ? { ...e, licenciasUsadas:(e.licenciasUsadas||[]).map(l=>l.id===lId?{...l,[k]:v}:l) } : e));
  // Logística items CRUD (EPPs, dotaciones, herramientas menores)
  const addLogItem = (eqId) => setEquipos(equipos.map(e => e.id===eqId ? { ...e, logItemsUsados:[...(e.logItemsUsados||[]),{id:uid(),itemId:"",cantidad:1}] } : e));
  const delLogItem = (eqId, liId) => setEquipos(equipos.map(e => e.id===eqId ? { ...e, logItemsUsados:(e.logItemsUsados||[]).filter(l=>l.id!==liId) } : e));
  const updLogItem = (eqId, liId, k, v) => setEquipos(equipos.map(e => e.id===eqId ? { ...e, logItemsUsados:(e.logItemsUsados||[]).map(l=>l.id===liId?{...l,[k]:v}:l) } : e));

  // Logística items by family
  const logEpps = logItems.filter(i => i.familia === "epp" || i.familia === "dotacion");
  const logHerr = logItems.filter(i => i.familia === "herr_menor" || i.familia === "herr_mayor" || i.familia === "consumible");
  const logEquipos = logItems.filter(i => i.familia === "equipo_obra" || i.familia === "equipo_medic" || i.familia === "equipo_computo");
  const logAll = [...logEpps, ...logHerr, ...logEquipos];
  const FAMILIA_ICONS = { epp:"🦺", dotacion:"👕", herr_menor:"🔨", herr_mayor:"⚙️", equipo_obra:"🏗️", equipo_medic:"📐", equipo_computo:"💻", consumible:"📦", seguridad:"🚧", transporte:"🚛" };

  // Cost/hour for a logística item (price / life in hours)
  const costoHoraLogItem = (itemId) => {
    const item = logItems.find(x => x.id === itemId);
    if (!item || !item.precio) return 0;
    const vidaMeses = item.vidaUtil || 12;
    const horasVida = vidaMeses * (horasProdAnio || 1760) / 12;
    return item.precio / horasVida;
  };

  // Auto-add EPPs based on cargos associations
  const getAutoEpps = (eq) => {
    const cargoIds = eq.cargos.map(c => c.cargoId);
    return logItems.filter(i =>
      (i.familia === "epp" || i.familia === "dotacion") &&
      i.asociadoACargo && (i.cargosAsociados || []).some(cId => cargoIds.includes(cId))
    );
  };

  // Calc cost
  const calcCosto = (eq) => {
    const moH = eq.cargos.reduce((s,c) => s + getCostoHora(c.cargoId) * (c.cantidad||1), 0);
    const eqH = (eq.activosUsados||[]).reduce((s,a) => s + costoHoraActivo(a.activoId) * (a.cantidad||1), 0);
    const licH = (eq.licenciasUsadas||[]).reduce((s,l) => {
      const lic = rrhhLicencias.find(x=>x.id===l.licId);
      if (!lic) return s;
      return s + ((lic.costoAnual||0) / (horasProdAnio||1760)) * (l.cantidad||1);
    }, 0);
    // Logística items (EPPs, dotaciones, herramientas)
    const logH = (eq.logItemsUsados||[]).reduce((s,li) => s + costoHoraLogItem(li.itemId) * (li.cantidad||1), 0);
    // Auto EPPs from cargo associations
    const autoEpps = getAutoEpps(eq);
    const autoH = autoEpps.reduce((s,item) => s + costoHoraLogItem(item.id), 0);
    const totalLogH = logH + autoH;
    return { moH, eqH, licH, logH: totalLogH, totalH: moH+eqH+licH+totalLogH, totalMes: (moH+eqH+licH+totalLogH) * ((horasProdAnio||1760) / 12) };
  };

  const inp = { border:`1px solid ${C.border}`, borderRadius:3, padding:"4px 6px", fontSize:11, fontFamily:"'DM Sans',sans-serif", background:"#fff" };

  // ── PDF export ──
  const printEquipos = () => {
    const w = window.open("","_blank");
    const S = `@import url('https://fonts.googleapis.com/css2?family=DM Sans:wght@300;400;600;700;800&family=DM+Mono:wght@400;500&display=swap');@page{size:portrait;margin:12mm}*{margin:0;padding:0;box-sizing:border-box}body{font-family:'DM Sans',sans-serif;color:#111;font-size:9px;padding:20px}.header{display:flex;justify-content:space-between;margin-bottom:12px;padding-bottom:8px;border-bottom:3px solid #111}.logo{font-size:14px;font-weight:800;letter-spacing:3px}.logo-sub{font-size:6px;letter-spacing:2px;color:#888;text-transform:uppercase}.eq-card{border:1.5px solid #3B3B3B;border-radius:6px;margin-bottom:10px;overflow:hidden;page-break-inside:avoid}.eq-header{background:#F0F0F0;padding:6px 12px;border-bottom:1px solid #C4D8EE}.eq-name{font-size:12px;font-weight:700}.eq-sub{font-size:7px;color:#555;margin-top:1px}.eq-body{padding:8px 12px}.section-title{font-size:7px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.5px;margin:6px 0 3px;padding-bottom:2px;border-bottom:1px solid #F5F5F5}table{width:100%;border-collapse:collapse}th{font-size:6px;font-weight:700;color:#888;text-transform:uppercase;text-align:left;padding:2px 4px;border-bottom:1px solid #E0E0E0}td{padding:2px 4px;font-size:8px;border-bottom:1px solid #F5F5F5}.mono{font-family:'DM Mono',monospace}.bold{font-weight:700}.r{text-align:right}.blue{color:#3B3B3B}.green{color:#111111}.tag{font-size:7px;background:#FFF8E7;color:#8C6A00;padding:1px 5px;border-radius:3px;display:inline-block;margin:1px}.tag-blue{background:#F0F0F0;color:#3B3B3B}.cost-box{background:#F5F4F1;border-radius:4px;padding:6px 10px;margin-top:6px;font-size:9px}.cost-row{display:flex;justify-content:space-between;margin-bottom:2px}.cost-total{border-top:1px solid #DDD;padding-top:3px;margin-top:3px;font-weight:700}.footer{margin-top:14px;padding-top:4px;border-top:1px solid #E0E0E0;display:flex;justify-content:space-between;font-size:7px;color:#888}`;

    let html = `<html><head><title>Equipos - ${d.codigoOferta||""}</title><style>${S}</style></head><body>`;
    html += `<div class="header"><div><div class="logo">HABITARIS</div><div class="logo-sub">Arquitectura · Interiorismo · Construcción</div></div>`;
    html += `<div style="text-align:right"><div style="font-size:13px;font-weight:700">Equipos de Trabajo</div>`;
    html += `<div style="font-size:8px;color:#555">${d.proyecto||""} · ${d.codigoOferta||""} · ${d.cliente||""}</div>`;
    html += `<div style="font-size:8px;color:#888;margin-top:2px">${equipos.length} equipos · ${cargosList.length} cargos disponibles</div></div></div>`;

    equipos.forEach(eq => {
      const cost = calcCosto(eq);
      html += `<div class="eq-card"><div class="eq-header"><div class="eq-name">${eq.nombre}</div>`;
      html += `<div class="eq-sub">${eq.cargos.length} cargos · Rendimiento: ${eq.rendimiento} h/ud · Total: ${fmtN(cost.totalH)} ${moneda}/h</div></div>`;
      html += `<div class="eq-body">`;

      // Mano de obra
      html += `<div class="section-title">👷 Mano de obra</div>`;
      html += `<table><tr><th>Cargo</th><th class="r">Cant</th><th class="r">${moneda}/h</th><th class="r">Subtotal/h</th></tr>`;
      eq.cargos.forEach(c => {
        const ch = getCostoHora(c.cargoId);
        html += `<tr><td>${getCargoNombre(c.cargoId)}</td><td class="mono r">${c.cantidad||1}</td>`;
        html += `<td class="mono r">${fmtN(ch)}</td><td class="mono r bold">${fmtN(ch*(c.cantidad||1))}</td></tr>`;
        // EPPs por cargo
        const epps = c.recursosAsignados || EPP_DEFAULTS_POR_CARGO[c.cargoId] || [];
        if (epps.length > 0) {
          html += `<tr><td colspan="4" style="padding-left:16px">`;
          epps.forEach(cod => { const rec = getRecursoByCodigo(cod); if(rec) html += `<span class="tag">${cod} ${rec.nombre}</span> `; });
          html += `</td></tr>`;
        }
      });
      html += `</table>`;

      // Herramientas asignadas
      if ((eq.herrAsignadas||[]).length > 0) {
        html += `<div class="section-title">🔨 Herramientas y equipos</div><div>`;
        (eq.herrAsignadas||[]).forEach(cod => {
          const rec = getRecursoByCodigo(cod);
          if (rec) html += `<span class="tag tag-blue">${cod} ${rec.nombre}</span> `;
        });
        html += `</div>`;
      }

      // Cost summary
      html += `<div class="cost-box">`;
      html += `<div class="cost-row"><span>M.O. / hora</span><span class="mono bold">${fmtN(cost.moH)}</span></div>`;
      if (cost.eqH > 0) html += `<div class="cost-row"><span>Equipos / hora</span><span class="mono">${fmtN(cost.eqH)}</span></div>`;
      if (cost.licH > 0) html += `<div class="cost-row"><span>Licencias / hora</span><span class="mono">${fmtN(cost.licH)}</span></div>`;
      if (cost.logH > 0) html += `<div class="cost-row"><span>EPPs+Herram. / hora</span><span class="mono">${fmtN(cost.logH)}</span></div>`;
      html += `<div class="cost-row cost-total"><span>Total / hora</span><span class="mono blue" style="font-size:11px">${fmtN(cost.totalH)} ${moneda}</span></div>`;
      html += `</div></div></div>`;
    });

    html += `<div class="footer"><span>HABITARIS · ${d.codigoOferta||""} · Equipos de trabajo</span><span>${new Date().toLocaleDateString("es-CO")}</span></div>`;
    html += `</body></html>`;
    w.document.write(html); w.document.close();
    setTimeout(() => w.print(), 400);
  };

  return (
    <div className="fade">
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, flexWrap:"wrap", gap:8 }}>
        <div>
          <p style={{ margin:0, fontSize:10, color:C.inkLight, letterSpacing:1.5, textTransform:"uppercase" }}>Conformación de equipos de trabajo</p>
          <h2 style={{ margin:0, fontSize:18, fontWeight:700 }}>{equipos.length} equipos / cuadrillas</h2>
        </div>
        <div style={{ display:"flex", gap:6 }}>
          <Btn sm on={()=>addEquipo(null)}><Plus size={11}/> Nuevo equipo</Btn>
          {equipos.length > 0 && (
            <button onClick={printEquipos}
              style={{ padding:"6px 14px", background:"#111", color:"#fff", border:"none", borderRadius:5,
                fontSize:10, fontWeight:600, cursor:"pointer", fontFamily:"'DM Sans',sans-serif",
                display:"flex", alignItems:"center", gap:4 }}>
              <FileText size={11}/> Vista PDF
            </button>
          )}
        </div>
      </div>

      {/* RRHH data status */}
      <Card style={{ padding:"10px 14px", marginBottom:14, background: useFallback ? "#FFF8E7" : "#E6F4EC" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", fontSize:11 }}>
          {useFallback ? (
            <><span style={{ color:"#8C6A00" }}>⚠️ <strong>Sin cargos en RRHH</strong> — Usando tarifas predeterminadas.
              Crea cargos en el módulo <strong>RRHH → Cargos</strong> para que se reflejen aquí.</span></>
          ) : (
            <><span style={{ color:"#111111" }}>✅ <strong>{rrhhCargos.filter(c=>c.activo!==false).length} cargos</strong> desde RRHH ·
              <strong>{activosActivos.length} activos</strong> · <strong>{licenciasActivas.length} licencias</strong> ·
              Horas productivas/año: <strong>{Math.round(horasProdAnio)}</strong>
              {logItems.length > 0 && <> · <strong>{logItems.length} ítems</strong> desde Logística</>}
            </span></>
          )}
        </div>
      </Card>

      {equipos.length === 0 ? (
        <Card style={{ padding:40, textAlign:"center" }}>
          <HardHat size={32} style={{ color:C.inkLight, opacity:0.3, marginBottom:12 }}/>
          <p style={{ color:C.inkLight, fontSize:13, margin:"0 0 12px" }}>Sin equipos definidos. Crea el primero.</p>
          <Btn sm on={()=>addEquipo(null)}><Plus size={11}/> Nuevo equipo</Btn>
        </Card>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(380px, 1fr))", gap:14 }}>
          {equipos.map(eq => {
            const cost = calcCosto(eq);
            const isE = editId === eq.id;
            return (
              <Card key={eq.id} style={{ padding:0, overflow:"hidden", border:isE?"2px solid #3B3B3B":`1px solid ${C.border}` }}>
                {/* Header */}
                <div style={{ padding:"10px 14px", background:isE?"#F0F0F0":"#F5F4F1", borderBottom:`1px solid ${C.border}`,
                  display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div style={{ flex:1 }}>
                    {isE ? <input value={eq.nombre} onChange={e=>updEquipo(eq.id,"nombre",e.target.value)}
                      style={{ ...inp, fontSize:13, fontWeight:700, width:"100%", background:"#fff" }}/> :
                    <div style={{ fontSize:13, fontWeight:700, color:C.ink }}>{eq.nombre}</div>}
                    <div style={{ fontSize:9, color:C.inkLight, marginTop:2 }}>
                      {eq.cargos.length} cargo{eq.cargos.length!==1?"s":""} · Rend: {eq.rendimiento} h/ud
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:4 }}>
                    <button onClick={()=>setEditId(isE?null:eq.id)} style={{ background:"none",border:"none",cursor:"pointer",color:isE?"#3B3B3B":C.inkLight,padding:4 }}><Edit2 size={13}/></button>
                    <button onClick={()=>delEquipo(eq.id)} style={{ background:"none",border:"none",cursor:"pointer",color:"#C44",padding:4 }}><Trash2 size={13}/></button>
                  </div>
                </div>

                <div style={{ padding:"10px 14px" }}>
                  {/* ── CARGOS (from RRHH) ── */}
                  <div style={{ fontSize:9, fontWeight:700, color:C.inkLight, textTransform:"uppercase", letterSpacing:1, marginBottom:4 }}>
                    👷 Mano de obra {!useFallback && <span style={{ fontWeight:400 }}>(desde RRHH)</span>}
                  </div>
                  <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:6, fontSize:11 }}>
                    <thead><tr style={{ borderBottom:`1px solid ${C.border}` }}>
                      <th style={{ padding:"3px 4px", textAlign:"left", fontSize:8, color:"#888", fontWeight:700 }}>CARGO</th>
                      <th style={{ padding:"3px 4px", textAlign:"center", fontSize:8, color:"#888", fontWeight:700, width:40 }}>CANT</th>
                      <th style={{ padding:"3px 4px", textAlign:"right", fontSize:8, color:"#888", fontWeight:700, width:70 }}>{moneda}/H</th>
                      <th style={{ padding:"3px 4px", textAlign:"right", fontSize:8, color:"#888", fontWeight:700, width:75 }}>SUBTOT/H</th>
                      {isE && <th style={{ width:20 }}/>}
                    </tr></thead>
                    <tbody>
                      {eq.cargos.map(c => {
                        const ch = getCostoHora(c.cargoId);
                        return (
                          <React.Fragment key={c.id}>
                          <tr style={{ borderBottom:`1px solid #F5F5F5` }}>
                            <td style={{ padding:"3px 4px" }}>
                              {isE ? <select value={c.cargoId} onChange={e=>updCargo(eq.id,c.id,"cargoId",e.target.value)}
                                style={{ ...inp, width:"100%", fontSize:10 }}>
                                <option value="">— Seleccionar —</option>
                                {cargosList.map(cm=><option key={cm.id} value={cm.id}>{cm.nombre||cm.label}</option>)}
                              </select> : <span>{getCargoNombre(c.cargoId)}</span>}
                            </td>
                            <td style={{ padding:"3px 4px", textAlign:"center" }}>
                              {isE ? <input type="number" value={c.cantidad||1} min={1} onChange={e=>updCargo(eq.id,c.id,"cantidad",+e.target.value)}
                                style={{ ...inp, width:36, textAlign:"center", fontSize:10 }}/> :
                              <span style={{ fontFamily:"'DM Mono',monospace" }}>{c.cantidad||1}</span>}
                            </td>
                            <td style={{ padding:"3px 4px", textAlign:"right", fontFamily:"'DM Mono',monospace", fontSize:10, color:C.inkMid }}>{fmtN(ch)}</td>
                            <td style={{ padding:"3px 4px", textAlign:"right", fontFamily:"'DM Mono',monospace", fontSize:10, fontWeight:600 }}>{fmtN(ch*(c.cantidad||1))}</td>
                            {isE && <td><button onClick={()=>delCargo(eq.id,c.id)} style={{ background:"none",border:"none",cursor:"pointer",color:"#C44",padding:1 }}><X size={10}/></button></td>}
                          </tr>
                          {/* EPPs assigned to this cargo */}
                          <tr><td colSpan={isE?5:4} style={{ padding:"0 4px 4px 20px" }}>
                            <div style={{ display:"flex", flexWrap:"wrap", gap:3, alignItems:"center" }}>
                              <span style={{ fontSize:7, color:"#888", fontWeight:700, textTransform:"uppercase" }}>EPP:</span>
                              {(c.recursosAsignados || EPP_DEFAULTS_POR_CARGO[c.cargoId] || []).map(cod => {
                                const rec = getRecursoByCodigo(cod);
                                return rec ? (
                                  <span key={cod} style={{ fontSize:8, background:"#FFF8E7", color:"#8C6A00", padding:"1px 5px",
                                    borderRadius:3, display:"inline-flex", alignItems:"center", gap:2 }}>
                                    {FAMILIA_ICONS_CAT[rec.familia]||"📦"} <span style={{ fontFamily:"'DM Mono',monospace", fontWeight:600 }}>{cod}</span> {rec.nombre}
                                    {isE && <button onClick={()=>{
                                      const curr = c.recursosAsignados || [...(EPP_DEFAULTS_POR_CARGO[c.cargoId]||[])];
                                      updCargo(eq.id,c.id,"recursosAsignados",curr.filter(x=>x!==cod));
                                    }} style={{ background:"none",border:"none",cursor:"pointer",color:"#C44",fontSize:8,padding:0,marginLeft:2 }}>×</button>}
                                  </span>
                                ) : null;
                              })}
                              {isE && (
                                <select value="" onChange={e=>{
                                  if(!e.target.value) return;
                                  const curr = c.recursosAsignados || [...(EPP_DEFAULTS_POR_CARGO[c.cargoId]||[])];
                                  if(!curr.includes(e.target.value)) updCargo(eq.id,c.id,"recursosAsignados",[...curr,e.target.value]);
                                  e.target.value="";
                                }} style={{ fontSize:8, padding:"1px 4px", border:`1px dashed ${C.border}`, borderRadius:3, background:"#fff", cursor:"pointer", maxWidth:130 }}>
                                  <option value="">+ EPP/Dotación</option>
                                  {CATALOGO_RECURSOS.filter(r=>r.familia==="epp"||r.familia==="dotacion").map(r=>
                                    <option key={r.codigo} value={r.codigo}>{r.codigo} {r.nombre}</option>
                                  )}
                                </select>
                              )}
                            </div>
                          </td></tr>
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                  {isE && <button onClick={()=>addCargo(eq.id)} style={{ background:"none", border:`1px dashed ${C.border}`, borderRadius:3,
                    padding:"2px 8px", fontSize:9, cursor:"pointer", color:C.inkMid, width:"100%", marginBottom:8 }}>+ Añadir cargo</button>}

                  {/* ── HERRAMIENTAS DEL EQUIPO (codificadas) ── */}
                  <div style={{ fontSize:9, fontWeight:700, color:C.inkLight, textTransform:"uppercase", letterSpacing:1, marginBottom:4, marginTop:6 }}>
                    🔨 Herramientas y equipos asignados
                  </div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:3, marginBottom:6 }}>
                    {(eq.herrAsignadas || []).map(cod => {
                      const rec = getRecursoByCodigo(cod);
                      return rec ? (
                        <span key={cod} style={{ fontSize:8, background:"#F0F0F0", color:"#3B3B3B", padding:"2px 6px",
                          borderRadius:3, display:"inline-flex", alignItems:"center", gap:2 }}>
                          {FAMILIA_ICONS_CAT[rec.familia]||"🔧"} <span style={{ fontFamily:"'DM Mono',monospace", fontWeight:600 }}>{cod}</span> {rec.nombre}
                          {isE && <button onClick={()=>{
                            updEquipo(eq.id,"herrAsignadas",(eq.herrAsignadas||[]).filter(x=>x!==cod));
                          }} style={{ background:"none",border:"none",cursor:"pointer",color:"#C44",fontSize:8,padding:0,marginLeft:2 }}>×</button>}
                        </span>
                      ) : null;
                    })}
                    {(eq.herrAsignadas||[]).length === 0 && !isE && (
                      <span style={{ fontSize:9, color:"#999", fontStyle:"italic" }}>Sin herramientas asignadas</span>
                    )}
                    {isE && (
                      <select value="" onChange={e=>{
                        if(!e.target.value) return;
                        const curr = eq.herrAsignadas || [];
                        if(!curr.includes(e.target.value)) updEquipo(eq.id,"herrAsignadas",[...curr,e.target.value]);
                        e.target.value="";
                      }} style={{ fontSize:8, padding:"2px 6px", border:`1px dashed ${C.border}`, borderRadius:3, background:"#fff", cursor:"pointer" }}>
                        <option value="">+ Herramienta / Equipo</option>
                        {CATALOGO_RECURSOS.filter(r=>["herr_menor","herr_mayor","equipo_obra","equipo_medic","consumible","seguridad"].includes(r.familia)).map(r=>
                          <option key={r.codigo} value={r.codigo}>{r.codigo} {r.nombre} ({FAMILIA_LABELS[r.familia]})</option>
                        )}
                      </select>
                    )}
                    {isE && (eq.herrAsignadas||[]).length === 0 && (() => {
                      // Suggest defaults based on equipo biblioteca match
                      const matchKey = Object.keys(HERR_DEFAULTS_POR_EQUIPO).find(k => eq.nombre?.toLowerCase().includes(k.replace("eq_","").replace("_"," ")));
                      return matchKey ? (
                        <button onClick={()=>updEquipo(eq.id,"herrAsignadas",[...(eq.herrAsignadas||[]),...HERR_DEFAULTS_POR_EQUIPO[matchKey]])}
                          style={{ fontSize:8, padding:"2px 8px", background:"#E6F4EC", border:"1px solid #111111", borderRadius:3, color:"#111111", cursor:"pointer", fontWeight:600 }}>
                          ⚡ Cargar defaults
                        </button>
                      ) : null;
                    })()}
                  </div>

                  {/* ── ACTIVOS / EQUIPOS (from RRHH) ── */}
                  {(isE || (eq.activosUsados||[]).length > 0) && (<>
                    <div style={{ fontSize:9, fontWeight:700, color:C.inkLight, textTransform:"uppercase", letterSpacing:1, marginBottom:4, marginTop:6 }}>
                      ⚙️ Equipos / herramientas {!useFallback && <span style={{ fontWeight:400 }}>(desde RRHH → Activos)</span>}
                    </div>
                    {(eq.activosUsados||[]).length === 0 && activosActivos.length === 0 ? (
                      <div style={{ fontSize:10, color:"#999", marginBottom:6 }}>Sin activos en RRHH. Regístralos en RRHH → Activos fijos.</div>
                    ) : (
                      <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:4, fontSize:10 }}>
                        <tbody>
                          {(eq.activosUsados||[]).map(a => {
                            const act = rrhhActivos.find(x=>x.id===a.activoId);
                            const ch = costoHoraActivo(a.activoId);
                            return (
                              <tr key={a.id} style={{ borderBottom:`1px solid #F5F5F5` }}>
                                <td style={{ padding:"2px 4px" }}>
                                  {isE ? <select value={a.activoId} onChange={e=>updActivo(eq.id,a.id,"activoId",e.target.value)}
                                    style={{ ...inp, width:"100%", fontSize:10 }}>
                                    <option value="">— Seleccionar activo —</option>
                                    {activosActivos.map(ac=><option key={ac.id} value={ac.id}>{ac.nombre} ({ac.categoria})</option>)}
                                  </select> : <span>{act?.nombre||"—"}</span>}
                                </td>
                                <td style={{ padding:"2px 4px", textAlign:"center", width:36 }}>
                                  {isE ? <input type="number" value={a.cantidad||1} min={1} onChange={e=>updActivo(eq.id,a.id,"cantidad",+e.target.value)}
                                    style={{ ...inp, width:32, textAlign:"center", fontSize:10 }}/> : <span>{a.cantidad||1}</span>}
                                </td>
                                <td style={{ padding:"2px 4px", textAlign:"right", fontFamily:"'DM Mono',monospace", fontSize:9, color:C.inkMid, width:60 }}>{fmtN(ch)}/h</td>
                                {isE && <td style={{ width:20 }}><button onClick={()=>delActivo(eq.id,a.id)} style={{ background:"none",border:"none",cursor:"pointer",color:"#C44",padding:1 }}><X size={9}/></button></td>}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                    {isE && activosActivos.length > 0 && <button onClick={()=>addActivo(eq.id)} style={{ background:"none", border:`1px dashed ${C.border}`, borderRadius:3,
                      padding:"2px 8px", fontSize:9, cursor:"pointer", color:C.inkMid, width:"100%", marginBottom:6 }}>+ Añadir equipo/herramienta</button>}
                  </>)}

                  {/* ── LICENCIAS (from RRHH) ── */}
                  {(isE || (eq.licenciasUsadas||[]).length > 0) && (<>
                    <div style={{ fontSize:9, fontWeight:700, color:C.inkLight, textTransform:"uppercase", letterSpacing:1, marginBottom:4, marginTop:6 }}>
                      💻 Licencias software {!useFallback && <span style={{ fontWeight:400 }}>(desde RRHH → Licencias)</span>}
                    </div>
                    {(eq.licenciasUsadas||[]).length === 0 && licenciasActivas.length === 0 ? (
                      <div style={{ fontSize:10, color:"#999", marginBottom:6 }}>Sin licencias en RRHH.</div>
                    ) : (
                      <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:4, fontSize:10 }}>
                        <tbody>
                          {(eq.licenciasUsadas||[]).map(l => {
                            const lic = rrhhLicencias.find(x=>x.id===l.licId);
                            const ch = lic ? (lic.costoAnual||0) / (horasProdAnio||1760) : 0;
                            return (
                              <tr key={l.id} style={{ borderBottom:`1px solid #F5F5F5` }}>
                                <td style={{ padding:"2px 4px" }}>
                                  {isE ? <select value={l.licId} onChange={e=>updLic(eq.id,l.id,"licId",e.target.value)}
                                    style={{ ...inp, width:"100%", fontSize:10 }}>
                                    <option value="">— Seleccionar licencia —</option>
                                    {licenciasActivas.map(li=><option key={li.id} value={li.id}>{li.nombre} ({li.plan||"—"})</option>)}
                                  </select> : <span>{lic?.nombre||"—"}</span>}
                                </td>
                                <td style={{ padding:"2px 4px", textAlign:"center", width:36 }}>
                                  {isE ? <input type="number" value={l.cantidad||1} min={1} onChange={e=>updLic(eq.id,l.id,"cantidad",+e.target.value)}
                                    style={{ ...inp, width:32, textAlign:"center", fontSize:10 }}/> : <span>{l.cantidad||1}</span>}
                                </td>
                                <td style={{ padding:"2px 4px", textAlign:"right", fontFamily:"'DM Mono',monospace", fontSize:9, color:C.inkMid, width:60 }}>{fmtN(ch)}/h</td>
                                {isE && <td style={{ width:20 }}><button onClick={()=>delLic(eq.id,l.id)} style={{ background:"none",border:"none",cursor:"pointer",color:"#C44",padding:1 }}><X size={9}/></button></td>}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                    {isE && licenciasActivas.length > 0 && <button onClick={()=>addLic(eq.id)} style={{ background:"none", border:`1px dashed ${C.border}`, borderRadius:3,
                      padding:"2px 8px", fontSize:9, cursor:"pointer", color:C.inkMid, width:"100%", marginBottom:6 }}>+ Añadir licencia</button>}
                  </>)}

                  {/* ── EPPs / DOTACIONES / HERRAMIENTAS (from Logística) ── */}
                  {(() => {
                    const autoEpps = getAutoEpps(eq);
                    const manualItems = (eq.logItemsUsados||[]);
                    const hasLogData = autoEpps.length > 0 || manualItems.length > 0 || isE;
                    if (!hasLogData) return null;
                    return (<>
                      <div style={{ fontSize:9, fontWeight:700, color:C.inkLight, textTransform:"uppercase", letterSpacing:1, marginBottom:4, marginTop:6 }}>
                        🦺 EPPs · Dotaciones · Herramientas <span style={{ fontWeight:400 }}>(desde Logística)</span>
                      </div>
                      {/* Auto EPPs from cargo association */}
                      {autoEpps.length > 0 && (
                        <div style={{ background:"#FFF8E7", borderRadius:3, padding:"4px 8px", marginBottom:4, fontSize:9 }}>
                          <span style={{ fontWeight:600, color:C.warning }}>Auto por cargo:</span>
                          {autoEpps.map(item => (
                            <span key={item.id} style={{ marginLeft:6, color:C.inkMid }}>
                              {FAMILIA_ICONS[item.familia]||"📦"} {item.nombre} ({fmtN(costoHoraLogItem(item.id))}/h)
                            </span>
                          ))}
                        </div>
                      )}
                      {/* Manual items */}
                      {manualItems.length > 0 && (
                        <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:4, fontSize:10 }}>
                          <tbody>
                            {manualItems.map(li => {
                              const item = logItems.find(x=>x.id===li.itemId);
                              const ch = costoHoraLogItem(li.itemId);
                              return (
                                <tr key={li.id} style={{ borderBottom:`1px solid #F5F5F5` }}>
                                  <td style={{ padding:"2px 4px" }}>
                                    {isE ? <select value={li.itemId} onChange={e=>updLogItem(eq.id,li.id,"itemId",e.target.value)}
                                      style={{ ...inp, width:"100%", fontSize:10 }}>
                                      <option value="">— Seleccionar —</option>
                                      {logAll.map(it=><option key={it.id} value={it.id}>{FAMILIA_ICONS[it.familia]||"📦"} {it.nombre} ({it.familia})</option>)}
                                    </select> : <span>{FAMILIA_ICONS[item?.familia]||"📦"} {item?.nombre||"—"}</span>}
                                  </td>
                                  <td style={{ padding:"2px 4px", textAlign:"center", width:36 }}>
                                    {isE ? <input type="number" value={li.cantidad||1} min={1} onChange={e=>updLogItem(eq.id,li.id,"cantidad",+e.target.value)}
                                      style={{ ...inp, width:32, textAlign:"center", fontSize:10 }}/> : <span>{li.cantidad||1}</span>}
                                  </td>
                                  <td style={{ padding:"2px 4px", textAlign:"right", fontFamily:"'DM Mono',monospace", fontSize:9, color:C.inkMid, width:60 }}>{fmtN(ch)}/h</td>
                                  {isE && <td style={{ width:20 }}><button onClick={()=>delLogItem(eq.id,li.id)} style={{ background:"none",border:"none",cursor:"pointer",color:"#C44",padding:1 }}><X size={9}/></button></td>}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                      {isE && logAll.length > 0 && <button onClick={()=>addLogItem(eq.id)} style={{ background:"none", border:`1px dashed ${C.border}`, borderRadius:3,
                        padding:"2px 8px", fontSize:9, cursor:"pointer", color:C.inkMid, width:"100%", marginBottom:6 }}>+ Añadir EPP / herramienta</button>}
                      {isE && logAll.length === 0 && <div style={{ fontSize:9, color:"#999", marginBottom:6 }}>Sin ítems en Logística. Regístralos en el módulo Logística.</div>}
                    </>);
                  })()}

                  {/* Rendimiento */}
                  {isE && (
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, marginTop:8, marginBottom:6 }}>
                      <div>
                        <label style={{ display:"block", fontSize:8, color:C.inkLight, fontWeight:600, textTransform:"uppercase", marginBottom:2 }}>Rendimiento (h/ud)</label>
                        <input type="number" value={eq.rendimiento||0} step={0.01} onChange={e=>updEquipo(eq.id,"rendimiento",+e.target.value)}
                          style={{ ...inp, width:"100%", textAlign:"right" }}/>
                      </div>
                      <div>
                        <label style={{ display:"block", fontSize:8, color:C.inkLight, fontWeight:600, textTransform:"uppercase", marginBottom:2 }}>Notas</label>
                        <input value={eq.notas||""} onChange={e=>updEquipo(eq.id,"notas",e.target.value)}
                          placeholder="Observaciones..." style={{ ...inp, width:"100%" }}/>
                      </div>
                    </div>
                  )}

                  {/* Cost summary */}
                  <div style={{ background:"#F5F4F1", borderRadius:4, padding:"6px 10px", fontSize:10, marginTop:6 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:2 }}>
                      <span style={{ color:C.inkLight }}>M.O. / hora</span>
                      <span style={{ fontFamily:"'DM Mono',monospace", fontWeight:600 }}>{fmtN(cost.moH)}</span>
                    </div>
                    {cost.eqH > 0 && <div style={{ display:"flex", justifyContent:"space-between", marginBottom:2 }}>
                      <span style={{ color:C.inkLight }}>Equipos / hora</span>
                      <span style={{ fontFamily:"'DM Mono',monospace" }}>{fmtN(cost.eqH)}</span>
                    </div>}
                    {cost.licH > 0 && <div style={{ display:"flex", justifyContent:"space-between", marginBottom:2 }}>
                      <span style={{ color:C.inkLight }}>Licencias / hora</span>
                      <span style={{ fontFamily:"'DM Mono',monospace" }}>{fmtN(cost.licH)}</span>
                    </div>}
                    {cost.logH > 0 && <div style={{ display:"flex", justifyContent:"space-between", marginBottom:2 }}>
                      <span style={{ color:C.inkLight }}>EPPs+Herram. / hora</span>
                      <span style={{ fontFamily:"'DM Mono',monospace" }}>{fmtN(cost.logH)}</span>
                    </div>}
                    <div style={{ display:"flex", justifyContent:"space-between", borderTop:`1px solid ${C.border}`, paddingTop:3, marginTop:3 }}>
                      <span style={{ fontWeight:600 }}>Total / hora</span>
                      <span style={{ fontFamily:"'DM Mono',monospace", fontWeight:700, color:"#3B3B3B" }}>{fmtN(cost.totalH)} {moneda}</span>
                    </div>
                  </div>

                  {/* Save / close edit button */}
                  {isE && (
                    <button onClick={()=>setEditId(null)}
                      style={{ width:"100%", marginTop:10, padding:"7px 12px", fontSize:11, fontWeight:700, cursor:"pointer",
                        border:"none", borderRadius:4, background:"#111111", color:"#fff",
                        fontFamily:"'DM Sans',sans-serif", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                      <Check size={12}/> Guardar equipo
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Materiales: Listado General + Comparativo Proveedores ──── */
function TMat({ d, set, r }) {
  const pais = d.pais || "CO";
  const moneda = pais === "CO" ? "COP" : "EUR";
  const fmtM = (n) => n ? new Intl.NumberFormat(pais==="CO"?"es-CO":"es-ES",{ maximumFractionDigits:0 }).format(n) : "—";

  const FAMILIAS = [
    { id:"civil",     label:"🧱 Materiales civiles",    icon:"🧱" },
    { id:"electrico", label:"⚡ Materiales eléctricos",  icon:"⚡" },
    { id:"hidro",     label:"💧 Hidráulico / sanitario", icon:"💧" },
    { id:"acabados",  label:"🎨 Acabados",               icon:"🎨" },
    { id:"epp",       label:"🦺 EPPs y dotación",        icon:"🦺" },
    { id:"herr",      label:"🔧 Herramientas y equipos", icon:"🔧" },
    { id:"transporte",label:"🚛 Transporte",              icon:"🚛" },
    { id:"otros",     label:"📦 Otros insumos",           icon:"📦" },
  ];

  const [familiaActiva, setFamiliaActiva] = useState("civil");
  const [showAddInsumo, setShowAddInsumo] = useState(false);
  const [showAddProv, setShowAddProv] = useState(false);
  const [editProv, setEditProv] = useState(null);
  const [newInsumo, setNewInsumo] = useState({ codigo:"", descripcion:"", unidad:"ud", familia:"civil" });
  const [newProv, setNewProv] = useState({ nombre:"", contacto:"", tel:"", email:"", nit:"" });
  const [busqueda, setBusqueda] = useState("");
  const [selIds, setSelIds] = useState([]); // multi-select insumos
  const [showAsignar, setShowAsignar] = useState(false); // modal assign prov to selected
  const [showAsignarProv, setShowAsignarProv] = useState(null); // which slot 1/2/3

  // ── Persistent data ──
  const insumos = d.insumosLista || [];
  const setInsumos = (v) => set("insumosLista", typeof v === "function" ? v(insumos) : v);
  const proveedores = d.matProveedores || [];
  const setProvs = (v) => set("matProveedores", typeof v === "function" ? v(proveedores) : v);
  // Cotizaciones: { insId: { slot1: { provId, precio, cotArchivo, correoRef }, slot2: {...}, slot3: {...} } }
  const cotizaciones = d.insCotizaciones2 || {};
  const setCots = (v) => set("insCotizaciones2", typeof v === "function" ? v(cotizaciones) : v);
  // Adjudicación: { insId: "slot1"|"slot2"|"slot3" }
  const adjudicacion = d.insAdjudicacion || {};
  const setAdj = (v) => set("insAdjudicacion", typeof v === "function" ? v(adjudicacion) : v);

  const SLOTS = ["slot1","slot2","slot3"];
  const SLOT_LABELS = { slot1:"Cotización 1", slot2:"Cotización 2", slot3:"Cotización 3" };
  const SLOT_COLORS = { slot1:"#3B3B3B", slot2:"#8C6A00", slot3:"#5B3A8C" };
  const SLOT_BGS = { slot1:"#F0F0F0", slot2:"#FAF0E0", slot3:"#F0ECF6" };

  // ── Auto-generate code ──
  const nextCode = (fam) => {
    const prefix = { civil:"MC", electrico:"ME", hidro:"MH", acabados:"MA", epp:"EPP",
      herr:"HE", transporte:"TR", otros:"OT" }[fam] || "XX";
    const existing = insumos.filter(i => i.familia === fam);
    const maxN = existing.reduce((mx,i) => {
      const m = i.codigo.match(/(\d+)$/);
      return m ? Math.max(mx, parseInt(m[1])) : mx;
    }, 0);
    return `${prefix}-${String(maxN+1).padStart(3,"0")}`;
  };

  // ── CRUD insumos ──
  const addInsumo = () => {
    const fam = newInsumo.familia || familiaActiva;
    const codigo = newInsumo.codigo || nextCode(fam);
    setInsumos([...insumos, { id:uid(), codigo, descripcion:newInsumo.descripcion, unidad:newInsumo.unidad,
      familia:fam, precioPrevisto:0, cantidad:1 }]);
    setNewInsumo({ codigo:"", descripcion:"", unidad:"ud", familia:fam });
    setShowAddInsumo(false);
  };
  const updInsumo = (id, k, v) => setInsumos(insumos.map(i => i.id===id ? {...i,[k]:v} : i));
  const delInsumo = (id) => {
    setInsumos(insumos.filter(i => i.id!==id));
    const nc = {...cotizaciones}; delete nc[id]; setCots(nc);
    const na = {...adjudicacion}; delete na[id]; setAdj(na);
    setSelIds(selIds.filter(x=>x!==id));
  };

  // ── CRUD proveedores ──
  const addProv = () => {
    if (!newProv.nombre.trim()) return;
    const p = { ...newProv, id:uid(), fecha:today() };
    setProvs([...proveedores, p]);
    setNewProv({ nombre:"", contacto:"", tel:"", email:"", nit:"" });
    setShowAddProv(false);
  };
  const updProv = (id, k, v) => setProvs(proveedores.map(p => p.id===id ? {...p,[k]:v} : p));
  const delProv = (id) => {
    setProvs(proveedores.filter(p=>p.id!==id));
    // Clean cotizaciones that reference this prov
    const nc = {...cotizaciones};
    Object.keys(nc).forEach(insId => {
      SLOTS.forEach(s => { if(nc[insId]?.[s]?.provId === id) delete nc[insId][s]; });
    });
    setCots(nc);
  };

  // ── Cotizaciones ──
  const getCot = (insId, slot) => cotizaciones[insId]?.[slot] || null;
  const setCot = (insId, slot, data) => {
    const nc = {...cotizaciones};
    if(!nc[insId]) nc[insId] = {};
    nc[insId][slot] = { ...(nc[insId][slot]||{}), ...data };
    setCots(nc);
  };
  const clearCot = (insId, slot) => {
    const nc = {...cotizaciones};
    if(nc[insId]) { delete nc[insId][slot]; }
    setCots(nc);
    if(adjudicacion[insId] === slot) { const na={...adjudicacion}; delete na[insId]; setAdj(na); }
  };

  // ── Assign proveedor to selected insumos ──
  const asignarProvASeleccion = (provId, slot) => {
    const nc = {...cotizaciones};
    selIds.forEach(insId => {
      if(!nc[insId]) nc[insId] = {};
      nc[insId][slot] = { provId, precio:0, cotArchivo:"", correoRef:"" };
    });
    setCots(nc);
    setShowAsignar(false);
    setSelIds([]);
  };

  // ── Assign prov to single insumo ──
  const asignarProvUnitario = (insId, slot, provId) => {
    setCot(insId, slot, { provId, precio:getCot(insId,slot)?.precio||0, cotArchivo:getCot(insId,slot)?.cotArchivo||"", correoRef:getCot(insId,slot)?.correoRef||"" });
  };

  // ── Adjudicate ──
  const adjudicar = (insId, slot) => {
    setAdj({...adjudicacion, [insId]:slot });
  };
  const quitarAdj = (insId) => {
    const na = {...adjudicacion}; delete na[insId]; setAdj(na);
  };

  // ── Precio final: from adjudicated slot ──
  const getPrecioFinal = (insId) => {
    const slot = adjudicacion[insId];
    if (slot) {
      const cot = getCot(insId, slot);
      if (cot?.precio > 0) {
        const prov = proveedores.find(p=>p.id===cot.provId);
        return { precio:cot.precio, provNombre:prov?.nombre||"—", slot, adjudicado:true };
      }
    }
    return { precio:0, provNombre:"—", slot:null, adjudicado:false };
  };

  // ── Load from catalog ──
  const cargarDesdeEPP = () => {
    const nuevos = [];
    (CATALOGO_RECURSOS || []).filter(r2 => r2.familia === "epp" || r2.familia === "dotacion").forEach(r2 => {
      if (!insumos.find(i => i.codigo === r2.codigo))
        nuevos.push({ id:uid(), codigo:r2.codigo, descripcion:r2.nombre, unidad:r2.unidad, familia:"epp", precioPrevisto:r2.precioRef||0, cantidad:1 });
    });
    if (nuevos.length > 0) setInsumos([...insumos, ...nuevos]);
  };
  const cargarDesdeHerr = () => {
    const nuevos = [];
    (CATALOGO_RECURSOS || []).filter(r2 => ["herr_menor","herr_mayor","equipo_obra","equipo_medic","consumible","seguridad"].includes(r2.familia)).forEach(r2 => {
      if (!insumos.find(i => i.codigo === r2.codigo))
        nuevos.push({ id:uid(), codigo:r2.codigo, descripcion:r2.nombre, unidad:r2.unidad, familia:"herr", precioPrevisto:r2.precioRef||0, cantidad:1 });
    });
    if (nuevos.length > 0) setInsumos([...insumos, ...nuevos]);
  };

  // ── Filter ──
  const insFiltered = insumos.filter(i => {
    if (i.familia !== familiaActiva) return false;
    if (busqueda && !i.descripcion.toLowerCase().includes(busqueda.toLowerCase()) && !i.codigo.toLowerCase().includes(busqueda.toLowerCase())) return false;
    return true;
  });

  // ── Stats ──
  const totalInsumos = insumos.length;
  const adjudicados = Object.keys(adjudicacion).length;
  const cotizados = insumos.filter(i => SLOTS.some(s => getCot(i.id,s)?.precio > 0)).length;

  // ── Selection ──
  const allSelected = insFiltered.length > 0 && insFiltered.every(i => selIds.includes(i.id));
  const toggleAll = () => {
    if (allSelected) setSelIds(selIds.filter(x => !insFiltered.find(i=>i.id===x)));
    else setSelIds([...new Set([...selIds, ...insFiltered.map(i=>i.id)])]);
  };
  const toggleOne = (id) => {
    setSelIds(selIds.includes(id) ? selIds.filter(x=>x!==id) : [...selIds, id]);
  };

  // ── PDF ──
  const printInsumos = () => {
    const w = window.open("","_blank");
    const S = `@import url('https://fonts.googleapis.com/css2?family=DM Sans:wght@300;400;600;700;800&family=DM+Mono:wght@400;500&display=swap');@page{size:landscape;margin:10mm}*{margin:0;padding:0;box-sizing:border-box}body{font-family:'DM Sans',sans-serif;color:#111;font-size:8px;padding:16px}.header{display:flex;justify-content:space-between;margin-bottom:10px;padding-bottom:8px;border-bottom:3px solid #111}.logo{font-size:14px;font-weight:800;letter-spacing:3px}h2{font-size:11px;margin:10px 0 4px;border-bottom:2px solid #111;padding-bottom:4px}table{width:100%;border-collapse:collapse;margin-bottom:8px}th{background:#F5F4F1;padding:3px 4px;font-size:6px;text-transform:uppercase;letter-spacing:.3px;font-weight:700;color:#888;text-align:left;border-bottom:1px solid #E0E0E0}td{padding:2px 4px;font-size:7px;border-bottom:1px solid #F5F5F5}.mono{font-family:'DM Mono',monospace}.green{color:#111111}.r{text-align:right}.bold{font-weight:700}.adj{background:#D4EDDA;font-weight:700;color:#111111}.footer{margin-top:10px;padding-top:4px;border-top:1px solid #E0E0E0;display:flex;justify-content:space-between;font-size:6px;color:#888}`;
    let html = `<html><head><title>Comparativo - ${d.codigoOferta||""}</title><style>${S}</style></head><body>`;
    html += `<div class="header"><div><div class="logo">HABITARIS</div></div>`;
    html += `<div style="text-align:right"><div style="font-size:13px;font-weight:700">Comparativo de Insumos</div>`;
    html += `<div style="font-size:8px;color:#555">${d.proyecto||""} · ${d.codigoOferta||""}</div></div></div>`;
    FAMILIAS.forEach(fam => {
      const famIns = insumos.filter(i => i.familia === fam.id);
      if (famIns.length === 0) return;
      html += `<h2>${fam.label} (${famIns.length})</h2>`;
      html += `<table><tr><th>Código</th><th>Descripción</th><th>Und</th><th>Cant</th><th class="r">P. Previsto</th>`;
      SLOTS.forEach(s => html += `<th class="r">${SLOT_LABELS[s]}</th>`);
      html += `<th class="r" style="background:#E6F4EC">P. Final</th><th>Adjudicado a</th></tr>`;
      famIns.forEach(ins => {
        const pf = getPrecioFinal(ins.id);
        html += `<tr><td class="mono bold">${ins.codigo}</td><td>${ins.descripcion}</td><td>${ins.unidad}</td><td class="mono">${ins.cantidad||1}</td>`;
        html += `<td class="mono r">${fmtM(ins.precioPrevisto)}</td>`;
        SLOTS.forEach(s => {
          const c = getCot(ins.id,s);
          const isAdj = adjudicacion[ins.id] === s;
          const prov = c?.provId ? proveedores.find(p=>p.id===c.provId) : null;
          html += `<td class="mono r ${isAdj?"adj":""}">${prov?prov.nombre+": ":""}${c?.precio>0?fmtM(c.precio):"—"}</td>`;
        });
        html += `<td class="mono r bold green">${pf.adjudicado?fmtM(pf.precio):"—"}</td>`;
        html += `<td>${pf.adjudicado?pf.provNombre:"Pendiente"}</td></tr>`;
      });
      html += `</table>`;
    });
    html += `<div class="footer"><span>HABITARIS · Comparativo · ${d.codigoOferta||""}</span><span>${new Date().toLocaleDateString("es-CO")}</span></div>`;
    html += `</body></html>`;
    w.document.write(html); w.document.close();
    setTimeout(() => w.print(), 400);
  };

  const inp = { border:`1px solid ${C.border}`, borderRadius:3, padding:"3px 6px", fontSize:11, fontFamily:"'DM Sans',sans-serif", background:"#fff" };
  const chk = { width:15, height:15, accentColor:"#111111", cursor:"pointer" };

  return (
    <div className="fade">
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, flexWrap:"wrap", gap:8 }}>
        <div>
          <p style={{ margin:0, fontSize:10, color:C.inkLight, letterSpacing:1.5, textTransform:"uppercase" }}>Insumos y comparativo de proveedores</p>
          <h2 style={{ margin:0, fontSize:18, fontWeight:700 }}>{totalInsumos} insumos · {proveedores.length} proveedores · {adjudicados} adjudicados</h2>
        </div>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {selIds.length > 0 && (
            <button onClick={()=>setShowAsignar(true)}
              style={{ padding:"6px 14px", background:"#3B3B3B", color:"#fff", border:"none", borderRadius:5,
                fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
              📋 Asignar proveedor a {selIds.length} insumos
            </button>
          )}
          <button onClick={()=>{ setNewInsumo({...newInsumo, familia:familiaActiva}); setShowAddInsumo(true); }}
            style={{ padding:"6px 12px", border:`1px solid ${C.border}`, borderRadius:4, background:"#fff",
              fontSize:10, fontWeight:600, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", color:C.inkMid }}>
            + Insumo
          </button>
          <button onClick={()=>{ setNewProv({ nombre:"", contacto:"", tel:"", email:"", nit:"" }); setEditProv(null); setShowAddProv(true); }}
            style={{ padding:"6px 12px", border:`1px solid ${C.border}`, borderRadius:4, background:"#fff",
              fontSize:10, fontWeight:600, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", color:C.inkMid }}>
            + Proveedor
          </button>
          <button onClick={printInsumos}
            style={{ padding:"6px 14px", background:"#111", color:"#fff", border:"none", borderRadius:5,
              fontSize:10, fontWeight:600, cursor:"pointer", fontFamily:"'DM Sans',sans-serif",
              display:"flex", alignItems:"center", gap:4 }}>
            <FileText size={11}/> Vista PDF
          </button>
        </div>
      </div>

      {/* Family tabs */}
      <div style={{ display:"flex", gap:0, marginBottom:14, overflowX:"auto" }}>
        {FAMILIAS.map((fam,i) => {
          const cnt = insumos.filter(ins => ins.familia === fam.id).length;
          return (
            <button key={fam.id} onClick={()=>{setFamiliaActiva(fam.id);setSelIds([]);}}
              style={{ padding:"8px 12px", fontSize:10, fontWeight:600, cursor:"pointer",
                border:`1px solid ${C.border}`, borderLeft:i>0?"none":undefined,
                fontFamily:"'DM Sans',sans-serif", whiteSpace:"nowrap",
                borderRadius:i===0?"5px 0 0 5px":i===FAMILIAS.length-1?"0 5px 5px 0":"0",
                background:familiaActiva===fam.id?"#111":"#fff",
                color:familiaActiva===fam.id?"#fff":C.inkMid }}>
              {fam.icon} {fam.label.split(" ").slice(1).join(" ")} {cnt>0 && <span style={{ marginLeft:4,
                background:familiaActiva===fam.id?"rgba(255,255,255,0.2)":"#F5F5F5",
                padding:"0 5px", borderRadius:8, fontSize:9 }}>{cnt}</span>}
            </button>
          );
        })}
      </div>

      <div style={{ display:"flex", gap:14 }}>
        {/* ── LEFT: Providers sidebar ── */}
        <div style={{ width:240, flexShrink:0 }}>
          <Card style={{ padding:"8px 10px", marginBottom:10 }}>
            <div style={{ fontSize:9, fontWeight:700, color:"#888", textTransform:"uppercase", letterSpacing:1, marginBottom:6 }}>
              Proveedores ({proveedores.length})
            </div>
            {proveedores.map(p => (
              <div key={p.id} style={{ padding:"6px 0", borderBottom:`1px solid ${C.border}` }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:11, fontWeight:700 }}>{p.nombre}</div>
                    {p.contacto && <div style={{ fontSize:9, color:"#888" }}>{p.contacto}</div>}
                    {p.email && <div style={{ fontSize:8, color:"#3B3B3B" }}>✉ {p.email}</div>}
                    {p.nit && <div style={{ fontSize:8, color:"#888" }}>NIT: {p.nit}</div>}
                  </div>
                  <div style={{ display:"flex", gap:2 }}>
                    <button onClick={()=>{ setEditProv(p.id); setNewProv({nombre:p.nombre,contacto:p.contacto||"",tel:p.tel||"",email:p.email||"",nit:p.nit||""}); setShowAddProv(true); }}
                      style={{ background:"none",border:"none",cursor:"pointer",color:"#3B3B3B",padding:2,fontSize:10 }}>✏️</button>
                    <button onClick={()=>delProv(p.id)}
                      style={{ background:"none",border:"none",cursor:"pointer",color:"#C44",padding:2 }}><X size={10}/></button>
                  </div>
                </div>
              </div>
            ))}
            {proveedores.length === 0 && <div style={{ fontSize:10, color:"#CCC", padding:"8px 0" }}>Sin proveedores</div>}
            <button onClick={()=>{ setNewProv({ nombre:"", contacto:"", tel:"", email:"", nit:"" }); setEditProv(null); setShowAddProv(true); }}
              style={{ width:"100%", marginTop:6, padding:"5px", fontSize:10, cursor:"pointer",
                border:`1px dashed ${C.border}`, borderRadius:4, background:"#fff", color:C.inkMid,
                fontFamily:"'DM Sans',sans-serif" }}>+ Añadir proveedor</button>
          </Card>

          {familiaActiva === "epp" && (
            <button onClick={cargarDesdeEPP}
              style={{ width:"100%", padding:"6px 10px", fontSize:10, fontWeight:600, cursor:"pointer",
                border:`1px solid ${C.border}`, borderRadius:4, background:"#FFF8E7", color:"#8C6A00",
                fontFamily:"'DM Sans',sans-serif", marginBottom:8 }}>
              ⚡ Cargar EPPs desde catálogo
            </button>
          )}
          {familiaActiva === "herr" && (
            <button onClick={cargarDesdeHerr}
              style={{ width:"100%", padding:"6px 10px", fontSize:10, fontWeight:600, cursor:"pointer",
                border:`1px solid ${C.border}`, borderRadius:4, background:"#FFF8E7", color:"#8C6A00",
                fontFamily:"'DM Sans',sans-serif", marginBottom:8 }}>
              ⚡ Cargar herramientas desde catálogo
            </button>
          )}

          <input value={busqueda} onChange={e=>setBusqueda(e.target.value)} placeholder="🔍 Buscar insumo..."
            style={{ ...inp, width:"100%", marginBottom:8 }}/>

          {selIds.length > 0 && (
            <div style={{ background:"#F0F0F0", border:"1px solid #3B3B3B33", borderRadius:6, padding:"8px 10px", fontSize:10 }}>
              <strong>{selIds.length}</strong> insumos seleccionados
              <button onClick={()=>setShowAsignar(true)}
                style={{ display:"block", width:"100%", marginTop:4, padding:"5px", fontSize:10, fontWeight:700,
                  cursor:"pointer", border:"none", borderRadius:4, background:"#3B3B3B", color:"#fff",
                  fontFamily:"'DM Sans',sans-serif" }}>
                📋 Asignar proveedor
              </button>
              <button onClick={()=>setSelIds([])}
                style={{ display:"block", width:"100%", marginTop:3, padding:"4px", fontSize:9,
                  cursor:"pointer", border:`1px solid ${C.border}`, borderRadius:4, background:"#fff", color:C.inkMid,
                  fontFamily:"'DM Sans',sans-serif" }}>
                Deseleccionar todo
              </button>
            </div>
          )}
        </div>

        {/* ── RIGHT: Comparative table ── */}
        <Card style={{ flex:1, padding:0, overflow:"hidden" }}>
          <div style={{ overflowX:"auto" }}>
            <table style={{ borderCollapse:"collapse", width:"100%", minWidth:900 }}>
              <thead>
                <tr style={{ background:"#EDEBE7" }}>
                  <th style={{ padding:"6px 4px", width:30, borderBottom:"2px solid #CCC" }}>
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} style={chk}/>
                  </th>
                  <th style={{ padding:"6px 8px", fontSize:8, fontWeight:700, color:"#888", textTransform:"uppercase",
                    borderBottom:"2px solid #CCC", textAlign:"left", width:80 }}>Código</th>
                  <th style={{ padding:"6px 8px", fontSize:8, fontWeight:700, color:"#888", textTransform:"uppercase",
                    borderBottom:"2px solid #CCC", textAlign:"left", minWidth:150 }}>Descripción</th>
                  <th style={{ padding:"6px 4px", fontSize:8, fontWeight:700, color:"#888", textTransform:"uppercase",
                    borderBottom:"2px solid #CCC", textAlign:"center", width:35 }}>Und</th>
                  <th style={{ padding:"6px 4px", fontSize:8, fontWeight:700, color:"#888", textTransform:"uppercase",
                    borderBottom:"2px solid #CCC", textAlign:"center", width:40 }}>Cant</th>
                  <th style={{ padding:"6px 6px", fontSize:8, fontWeight:700, color:"#888", textTransform:"uppercase",
                    borderBottom:"2px solid #CCC", textAlign:"right", width:80 }}>P. Prev.</th>
                  {SLOTS.map(s => (
                    <th key={s} style={{ padding:"6px 6px", fontSize:8, fontWeight:700, textTransform:"uppercase",
                      borderBottom:`2px solid ${SLOT_COLORS[s]}`, textAlign:"center", minWidth:140,
                      color:SLOT_COLORS[s], background:SLOT_BGS[s] }}>
                      {SLOT_LABELS[s]}
                    </th>
                  ))}
                  <th style={{ padding:"6px 6px", fontSize:8, fontWeight:700, color:"#111111", textTransform:"uppercase",
                    borderBottom:"2px solid #111111", textAlign:"center", width:120, background:"#E6F4EC" }}>
                    P. Final / Adjud.
                  </th>
                  <th style={{ width:30 }}/>
                </tr>
              </thead>
              <tbody>
                {insFiltered.length === 0 ? (
                  <tr><td colSpan={10} style={{ padding:"24px", textAlign:"center", color:"#CCC", fontSize:12 }}>
                    Sin insumos en esta categoría. Pulsa "+ Insumo" para añadir.
                  </td></tr>
                ) : insFiltered.map((ins, idx) => {
                  const pf = getPrecioFinal(ins.id);
                  const isSel = selIds.includes(ins.id);
                  return (
                    <tr key={ins.id} style={{ background:isSel?"#F0F0F022":idx%2===0?"#fff":"#FFFFFF", borderBottom:`1px solid ${C.border}` }}>
                      <td style={{ padding:"4px 4px", textAlign:"center" }}>
                        <input type="checkbox" checked={isSel} onChange={()=>toggleOne(ins.id)} style={chk}/>
                      </td>
                      <td style={{ padding:"4px 6px" }}>
                        <span style={{ fontFamily:"'DM Mono',monospace", fontWeight:700, fontSize:10,
                          background:"#F5F5F5", padding:"1px 6px", borderRadius:3 }}>{ins.codigo}</span>
                      </td>
                      <td style={{ padding:"4px 6px" }}>
                        <input value={ins.descripcion} onChange={e=>updInsumo(ins.id,"descripcion",e.target.value)}
                          style={{ ...inp, width:"100%", border:"none", background:"transparent", fontWeight:500, fontSize:11 }}
                          placeholder="Descripción"/>
                      </td>
                      <td style={{ padding:"2px 2px", textAlign:"center" }}>
                        <select value={ins.unidad} onChange={e=>updInsumo(ins.id,"unidad",e.target.value)}
                          style={{ ...inp, fontSize:9, border:"none", background:"transparent", textAlign:"center", padding:"2px" }}>
                          {["ud","m","m²","m³","ml","kg","gl","l","par","jgo","rollo","bulto","caneca","caja","saco","día","mes","h","viaje"].map(u=><option key={u}>{u}</option>)}
                        </select>
                      </td>
                      <td style={{ padding:"2px 2px" }}>
                        <input type="number" value={ins.cantidad||1} min={1}
                          onChange={e=>updInsumo(ins.id,"cantidad",parseInt(e.target.value)||1)}
                          style={{ ...inp, width:36, textAlign:"center", fontFamily:"'DM Mono',monospace", fontSize:10, border:"none", background:"transparent" }}/>
                      </td>
                      <td style={{ padding:"2px 4px" }}>
                        <input type="number" value={ins.precioPrevisto||""} placeholder="0"
                          onChange={e=>updInsumo(ins.id,"precioPrevisto",parseFloat(e.target.value)||0)}
                          style={{ ...inp, width:"100%", textAlign:"right", fontFamily:"'DM Mono',monospace", fontSize:10, color:"#888" }}/>
                      </td>
                      {/* ── 3 Comparative columns ── */}
                      {SLOTS.map(slot => {
                        const cot = getCot(ins.id, slot);
                        const prov = cot?.provId ? proveedores.find(p=>p.id===cot.provId) : null;
                        const isAdj = adjudicacion[ins.id] === slot;
                        return (
                          <td key={slot} style={{ padding:"3px 4px", borderLeft:`1px solid ${SLOT_COLORS[slot]}22`,
                            background:isAdj?"#D4EDDA":cot?SLOT_BGS[slot]+"44":"transparent", verticalAlign:"top" }}>
                            {cot ? (
                              <div>
                                {/* Provider name */}
                                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:2 }}>
                                  <select value={cot.provId||""} onChange={e=>setCot(ins.id,slot,{provId:e.target.value})}
                                    style={{ fontSize:8, fontWeight:700, color:SLOT_COLORS[slot], border:"none", background:"transparent",
                                      cursor:"pointer", maxWidth:100 }}>
                                    <option value="">— Prov —</option>
                                    {proveedores.map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}
                                  </select>
                                  <button onClick={()=>clearCot(ins.id,slot)} title="Quitar"
                                    style={{ background:"none",border:"none",cursor:"pointer",color:"#C44",fontSize:8,padding:0 }}>×</button>
                                </div>
                                {/* Price input */}
                                <input type="number" value={cot.precio||""} placeholder="Precio"
                                  onChange={e=>setCot(ins.id,slot,{precio:parseFloat(e.target.value)||0})}
                                  style={{ ...inp, width:"100%", textAlign:"right", fontSize:10,
                                    fontFamily:"'DM Mono',monospace",
                                    fontWeight:isAdj?700:400,
                                    border:isAdj?"2px solid #111111":`1px solid ${C.border}`,
                                    background:isAdj?"#D4EDDA":"#fff" }}/>
                                {/* Attachments */}
                                <div style={{ display:"flex", gap:2, marginTop:2 }}>
                                  <input value={cot.cotArchivo||""} placeholder="📎 Cotización"
                                    onChange={e=>setCot(ins.id,slot,{cotArchivo:e.target.value})}
                                    style={{ fontSize:7, padding:"1px 3px", border:`1px solid ${C.border}`, borderRadius:2,
                                      width:"50%", background:"#fff" }}/>
                                  <input value={cot.correoRef||""} placeholder="✉ Correo"
                                    onChange={e=>setCot(ins.id,slot,{correoRef:e.target.value})}
                                    style={{ fontSize:7, padding:"1px 3px", border:`1px solid ${C.border}`, borderRadius:2,
                                      width:"50%", background:"#fff" }}/>
                                </div>
                                {/* Adjudicate button */}
                                {cot.precio > 0 && (
                                  <button onClick={()=>isAdj?quitarAdj(ins.id):adjudicar(ins.id,slot)}
                                    style={{ width:"100%", marginTop:3, padding:"2px", fontSize:8, fontWeight:700,
                                      border:isAdj?"1px solid #111111":`1px dashed ${C.border}`, borderRadius:3,
                                      background:isAdj?"#111111":"#fff",
                                      color:isAdj?"#fff":"#888", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                                    {isAdj?"✅ Adjudicado":"Adjudicar"}
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div style={{ textAlign:"center", padding:"6px 0" }}>
                                <select value="" onChange={e=>{ if(e.target.value) asignarProvUnitario(ins.id,slot,e.target.value); }}
                                  style={{ fontSize:8, padding:"2px 4px", border:`1px dashed ${C.border}`, borderRadius:3,
                                    background:"#fff", cursor:"pointer", color:C.inkMid, width:"100%" }}>
                                  <option value="">+ Proveedor</option>
                                  {proveedores.map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}
                                </select>
                              </div>
                            )}
                          </td>
                        );
                      })}
                      {/* ── P. FINAL ── */}
                      <td style={{ padding:"4px 6px", textAlign:"center", background:"#E6F4EC", verticalAlign:"middle" }}>
                        {pf.adjudicado ? (
                          <div>
                            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:12, fontWeight:800, color:"#111111" }}>
                              {fmtM(pf.precio)}
                            </div>
                            <div style={{ fontSize:7, color:"#111111", fontWeight:600 }}>✅ {pf.provNombre}</div>
                          </div>
                        ) : (
                          <span style={{ fontSize:8, color:"#999", fontStyle:"italic" }}>Pendiente</span>
                        )}
                      </td>
                      <td style={{ padding:"2px 4px" }}>
                        <button onClick={()=>delInsumo(ins.id)}
                          style={{ background:"none",border:"none",cursor:"pointer",color:"#C44",padding:2 }}><Trash2 size={10}/></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Add inline */}
          <div style={{ padding:"6px 8px", borderTop:`1px solid ${C.border}` }}>
            <button onClick={()=>{ setNewInsumo({...newInsumo, familia:familiaActiva}); setShowAddInsumo(true); }}
              style={{ width:"100%", padding:"5px 8px", fontSize:10, cursor:"pointer",
                border:`1px dashed ${C.border}`, borderRadius:3, background:"#fff", color:C.inkMid,
                fontFamily:"'DM Sans',sans-serif" }}>
              + Añadir insumo a {FAMILIAS.find(f=>f.id===familiaActiva)?.label||""}
            </button>
          </div>
        </Card>
      </div>

      {/* ── Add insumo modal ── */}
      {showAddInsumo && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:9999,
          display:"flex", alignItems:"center", justifyContent:"center" }}
          onClick={()=>setShowAddInsumo(false)}>
          <div onClick={e=>e.stopPropagation()}
            style={{ background:"#fff", borderRadius:8, padding:24, width:420, boxShadow:"0 12px 40px rgba(0,0,0,0.2)" }}>
            <STitle t="Nuevo insumo" s="Se agrega a la maestra del proyecto" />
            <div style={{ display:"flex", gap:8, marginBottom:8 }}>
              <div style={{ flex:"0 0 100px" }}>
                <label style={{ display:"block", fontSize:8, fontWeight:700, color:"#888", textTransform:"uppercase", marginBottom:2 }}>Código</label>
                <input value={newInsumo.codigo || nextCode(newInsumo.familia||familiaActiva)}
                  onChange={e=>setNewInsumo({...newInsumo,codigo:e.target.value})}
                  style={{ ...inp, width:"100%", fontFamily:"'DM Mono',monospace", fontWeight:700 }}/>
              </div>
              <div style={{ flex:1 }}>
                <label style={{ display:"block", fontSize:8, fontWeight:700, color:"#888", textTransform:"uppercase", marginBottom:2 }}>Descripción</label>
                <input value={newInsumo.descripcion} onChange={e=>setNewInsumo({...newInsumo,descripcion:e.target.value})}
                  style={{ ...inp, width:"100%" }} placeholder="Ej: Cemento Portland tipo I"/>
              </div>
            </div>
            <div style={{ display:"flex", gap:8, marginBottom:8 }}>
              <div style={{ flex:1 }}>
                <label style={{ display:"block", fontSize:8, fontWeight:700, color:"#888", textTransform:"uppercase", marginBottom:2 }}>Familia</label>
                <select value={newInsumo.familia||familiaActiva} onChange={e=>setNewInsumo({...newInsumo,familia:e.target.value})}
                  style={{ ...inp, width:"100%" }}>
                  {FAMILIAS.map(f=><option key={f.id} value={f.id}>{f.label}</option>)}
                </select>
              </div>
              <div style={{ flex:"0 0 80px" }}>
                <label style={{ display:"block", fontSize:8, fontWeight:700, color:"#888", textTransform:"uppercase", marginBottom:2 }}>Unidad</label>
                <select value={newInsumo.unidad} onChange={e=>setNewInsumo({...newInsumo,unidad:e.target.value})}
                  style={{ ...inp, width:"100%" }}>
                  {["ud","m","m²","m³","ml","kg","gl","l","par","jgo","rollo","bulto","caneca","caja","saco","día","mes","h","viaje"].map(u=><option key={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display:"flex", gap:8, marginTop:10 }}>
              <Btn on={addInsumo} style={{ flex:1 }}><Check size={11}/> Añadir</Btn>
              <Btn v="sec" on={()=>setShowAddInsumo(false)} style={{ flex:1 }}>Cancelar</Btn>
            </div>
          </div>
        </div>
      )}

      {/* ── Add/Edit proveedor modal ── */}
      {showAddProv && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:9999,
          display:"flex", alignItems:"center", justifyContent:"center" }}
          onClick={()=>setShowAddProv(false)}>
          <div onClick={e=>e.stopPropagation()}
            style={{ background:"#fff", borderRadius:8, padding:24, width:420, boxShadow:"0 12px 40px rgba(0,0,0,0.2)" }}>
            <STitle t={editProv?"Editar proveedor":"Nuevo proveedor"} s="Para comparar cotizaciones" />
            <FI lbl="Nombre / Empresa" val={newProv.nombre} on={e=>setNewProv({...newProv,nombre:e.target.value})} ph="Ej: Ferretería El Tornillo"/>
            <FI lbl="NIT / CIF" val={newProv.nit||""} on={e=>setNewProv({...newProv,nit:e.target.value})} ph="900.123.456-7"/>
            <FI lbl="Contacto" val={newProv.contacto} on={e=>setNewProv({...newProv,contacto:e.target.value})} ph="Nombre persona"/>
            <FI lbl="Teléfono" val={newProv.tel} on={e=>setNewProv({...newProv,tel:e.target.value})} ph="+57 300..."/>
            <FI lbl="Email" val={newProv.email} on={e=>setNewProv({...newProv,email:e.target.value})} ph="prov@email.com"/>
            <div style={{ display:"flex", gap:8, marginTop:8 }}>
              <Btn on={()=>{
                if(editProv) {
                  setProvs(proveedores.map(p=>p.id===editProv?{...p,...newProv}:p));
                  setShowAddProv(false); setEditProv(null);
                } else { addProv(); }
              }} style={{ flex:1 }}><Check size={11}/> {editProv?"Guardar":"Añadir"}</Btn>
              <Btn v="sec" on={()=>{setShowAddProv(false);setEditProv(null);}} style={{ flex:1 }}>Cancelar</Btn>
            </div>
          </div>
        </div>
      )}

      {/* ── Assign proveedor modal (multi-select) ── */}
      {showAsignar && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:9999,
          display:"flex", alignItems:"center", justifyContent:"center" }}
          onClick={()=>setShowAsignar(false)}>
          <div onClick={e=>e.stopPropagation()}
            style={{ background:"#fff", borderRadius:8, padding:24, width:480, boxShadow:"0 12px 40px rgba(0,0,0,0.2)" }}>
            <STitle t={`Asignar proveedor a ${selIds.length} insumos`} s="Elige proveedor y columna de cotización" />
            {proveedores.length === 0 ? (
              <div style={{ padding:16, textAlign:"center", color:"#888", fontSize:12 }}>
                Primero añade proveedores
              </div>
            ) : (
              <div>
                <div style={{ fontSize:10, fontWeight:600, marginBottom:8, color:"#555" }}>¿A qué columna asignar?</div>
                {SLOTS.map(slot => (
                  <div key={slot} style={{ marginBottom:10 }}>
                    <div style={{ fontSize:9, fontWeight:700, color:SLOT_COLORS[slot], textTransform:"uppercase", letterSpacing:1, marginBottom:4 }}>
                      {SLOT_LABELS[slot]}
                    </div>
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                      {proveedores.map(p => (
                        <button key={p.id} onClick={()=>asignarProvASeleccion(p.id, slot)}
                          style={{ padding:"6px 14px", border:`1px solid ${SLOT_COLORS[slot]}44`, borderRadius:5,
                            background:SLOT_BGS[slot], color:SLOT_COLORS[slot], fontSize:10, fontWeight:700,
                            cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                          {p.nombre}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginTop:10 }}>
              <Btn v="sec" on={()=>setShowAsignar(false)} style={{ width:"100%" }}>Cerrar</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Organigrama del Proyecto ───────────────────────────────── */
function TOrg({ d, set }) {
  const nodos = d.orgNodos || [];
  const setNodos = (v) => set("orgNodos", typeof v === "function" ? v(nodos) : v);
  const [selId, setSelId] = useState(null);
  const [showNames, setShowNames] = useState(true);

  const PLANTILLAS = {
    obra: { label:"🏗️ Obra civil", nodes:[
      { id:"o1", parentId:null, nombre:"", cargo:"Director de Proyecto", color:"#111111", icon:"👔" },
      { id:"o2", parentId:"o1", nombre:"", cargo:"Director de Obra", color:"#2A5F8C", icon:"🏗️" },
      { id:"o3", parentId:"o2", nombre:"", cargo:"Residente de Obra", color:"#5B8DB8", icon:"📋" },
      { id:"o4", parentId:"o2", nombre:"", cargo:"Maestro de Obra", color:"#5B8DB8", icon:"🔨" },
      { id:"o5", parentId:"o2", nombre:"", cargo:"Almacenista", color:"#5B8DB8", icon:"📦" },
      { id:"o6", parentId:"o1", nombre:"", cargo:"Directora de Diseño", color:"#8C5B2A", icon:"🎨" },
      { id:"o7", parentId:"o6", nombre:"", cargo:"Arquitecto", color:"#B88C5B", icon:"📐" },
      { id:"o8", parentId:"o1", nombre:"", cargo:"Ing. HSE / SISO", color:"#8C2A2A", icon:"🦺" },
      { id:"o9", parentId:"o1", nombre:"", cargo:"Coord. Administrativo", color:"#6B5B8C", icon:"💼" },
    ]},
    diseno: { label:"🎨 Diseño interior", nodes:[
      { id:"d1", parentId:null, nombre:"", cargo:"Director de Proyecto", color:"#111111", icon:"👔" },
      { id:"d2", parentId:"d1", nombre:"", cargo:"Directora Creativa", color:"#8C5B2A", icon:"🎨" },
      { id:"d3", parentId:"d2", nombre:"", cargo:"Diseñador Senior", color:"#B88C5B", icon:"✏️" },
      { id:"d4", parentId:"d2", nombre:"", cargo:"Diseñador Junior", color:"#B88C5B", icon:"📐" },
      { id:"d5", parentId:"d2", nombre:"", cargo:"Visualizador 3D", color:"#B88C5B", icon:"🖥️" },
      { id:"d6", parentId:"d1", nombre:"", cargo:"Coord. Técnico", color:"#2A5F8C", icon:"📋" },
      { id:"d7", parentId:"d6", nombre:"", cargo:"Dibujante / Planos", color:"#5B8DB8", icon:"📏" },
    ]},
    mixto: { label:"🏠 Obra + Diseño", nodes:[
      { id:"m1", parentId:null, nombre:"", cargo:"Gerente de Proyecto", color:"#111111", icon:"👔" },
      { id:"m2", parentId:"m1", nombre:"", cargo:"Director de Obra", color:"#2A5F8C", icon:"🏗️" },
      { id:"m3", parentId:"m2", nombre:"", cargo:"Residente de Obra", color:"#5B8DB8", icon:"📋" },
      { id:"m4", parentId:"m2", nombre:"", cargo:"Maestro de Obra", color:"#5B8DB8", icon:"🔨" },
      { id:"m5", parentId:"m2", nombre:"", cargo:"Almacenista", color:"#5B8DB8", icon:"📦" },
      { id:"m6", parentId:"m1", nombre:"", cargo:"Directora de Diseño", color:"#8C5B2A", icon:"🎨" },
      { id:"m7", parentId:"m6", nombre:"", cargo:"Arquitecto", color:"#B88C5B", icon:"📐" },
      { id:"m8", parentId:"m6", nombre:"", cargo:"Diseñador Interior", color:"#B88C5B", icon:"✏️" },
      { id:"m9", parentId:"m1", nombre:"", cargo:"Ing. HSE / SISO", color:"#8C2A2A", icon:"🦺" },
      { id:"m10", parentId:"m1", nombre:"", cargo:"Coord. Administrativo", color:"#6B5B8C", icon:"💼" },
      { id:"m11", parentId:"m1", nombre:"", cargo:"Coord. Compras", color:"#6B5B8C", icon:"🚛" },
    ]},
    pequeno: { label:"📐 Proyecto pequeño", nodes:[
      { id:"p1", parentId:null, nombre:"", cargo:"Director de Proyecto", color:"#111111", icon:"👔" },
      { id:"p2", parentId:"p1", nombre:"", cargo:"Arquitecto / Diseñador", color:"#8C5B2A", icon:"🎨" },
      { id:"p3", parentId:"p1", nombre:"", cargo:"Maestro de Obra", color:"#2A5F8C", icon:"🔨" },
    ]},
  };

  const loadPlantilla = (key) => {
    const tpl = PLANTILLAS[key].nodes;
    const newNodes = tpl.map(n => ({ ...n, id: uid() }));
    // Remap parentIds
    const origIds = tpl.map(n => n.id);
    newNodes.forEach((n, i) => {
      const pIdx = origIds.indexOf(tpl[i].parentId);
      n.parentId = pIdx >= 0 ? newNodes[pIdx].id : null;
    });
    setNodos(newNodes);
    setSelId(null);
  };

  const addNodo = (parentId) => {
    const nuevo = { id:uid(), parentId, nombre:"", cargo:"Nuevo cargo", color:"#555", icon:"👤" };
    setNodos([...nodos, nuevo]);
    setSelId(nuevo.id);
  };
  const delNodo = (id) => {
    const toDelete = new Set([id]);
    let changed = true;
    while (changed) { changed = false; nodos.forEach(n => { if (n.parentId && toDelete.has(n.parentId) && !toDelete.has(n.id)) { toDelete.add(n.id); changed = true; } }); }
    setNodos(nodos.filter(n => !toDelete.has(n.id)));
    if (selId && toDelete.has(selId)) setSelId(null);
  };
  const updNodo = (id, k, v) => setNodos(nodos.map(n => n.id === id ? { ...n, [k]: v } : n));

  const roots = nodos.filter(n => !n.parentId);
  const getChildren = (pid) => nodos.filter(n => n.parentId === pid);

  // Depth for indent
  const getDepth = (id) => { let d2 = 0, n = nodos.find(x=>x.id===id); while(n?.parentId) { d2++; n = nodos.find(x=>x.id===n.parentId); } return d2; };
  // Ordered list (tree order) for left panel
  const orderedNodes = (() => {
    const result = [];
    const visit = (pid) => { nodos.filter(n=>n.parentId===pid).forEach(n => { result.push(n); visit(n.id); }); };
    roots.forEach(r2 => { result.push(r2); visit(r2.id); });
    return result;
  })();

  const ICONS = ["👔","🏗️","📋","🔨","📦","🎨","📐","✏️","🖥️","📏","🦺","💼","👤","👷","🧑‍💻","📊","🔧","🏠","🧹","📞","🚛","⚡","💧","🧑‍🔬"];
  const COLORS = ["#111111","#2A5F8C","#8C5B2A","#8C2A2A","#6B5B8C","#5B8DB8","#B88C5B","#555","#2B7A52","#3B3B3B","#C44","#888"];
  const inp = { border:`1px solid ${C.border}`, borderRadius:3, padding:"3px 6px", fontSize:11, fontFamily:"'DM Sans',sans-serif", background:"#fff" };

  // Visual org chart node
  const NodeCard = ({ node }) => {
    const children = getChildren(node.id);
    const isSel = selId === node.id;
    return (
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
        <div style={{
          background:"#fff", border:`2px solid ${node.color||"#555"}`,
          borderRadius:8, padding:"8px 12px", minWidth:120, maxWidth:180,
          textAlign:"center", cursor:"pointer",
          boxShadow: isSel ? `0 0 0 3px ${node.color||"#555"}44` : "0 1px 6px rgba(0,0,0,0.06)",
        }}
          onClick={() => setSelId(node.id)}>
          <div style={{ fontSize:18, marginBottom:2 }}>{node.icon||"👤"}</div>
          {showNames && node.nombre && (
            <div style={{ fontSize:11, fontWeight:700, color:C.ink, lineHeight:1.2 }}>{node.nombre}</div>
          )}
          <div style={{ fontSize:9, color:node.color||"#555", fontWeight:700, textTransform:"uppercase", letterSpacing:0.4, lineHeight:1.3, marginTop:1 }}>
            {node.cargo}
          </div>
        </div>
        {children.length > 0 && <div style={{ width:2, height:16, background:"#DDD" }}/>}
        {children.length > 0 && (
          <div style={{ display:"flex", gap:12, alignItems:"flex-start", position:"relative" }}>
            {children.length > 1 && (
              <div style={{ position:"absolute", top:0, height:2, background:"#DDD",
                left:`${100/(children.length*2)}%`, right:`${100/(children.length*2)}%` }}/>
            )}
            {children.map(ch => (
              <div key={ch.id} style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
                <div style={{ width:2, height:16, background:"#DDD" }}/>
                <NodeCard node={ch}/>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // PDF Print
  const printOrg = () => {
    const w = window.open("","_blank");
    const S = `@import url('https://fonts.googleapis.com/css2?family=DM Sans:wght@300;400;600;700;800&family=DM+Mono:wght@400;500&display=swap');@page{size:landscape;margin:12mm}*{margin:0;padding:0;box-sizing:border-box}body{font-family:'DM Sans',sans-serif;color:#111;padding:20px}.header{display:flex;justify-content:space-between;margin-bottom:16px;padding-bottom:10px;border-bottom:3px solid #111}.logo{font-size:16px;font-weight:800;letter-spacing:3px}.logo-sub{font-size:7px;letter-spacing:2px;color:#888;text-transform:uppercase}.org-container{display:flex;justify-content:center;padding:16px 0}.node{background:#fff;border:2px solid var(--c);border-radius:8px;padding:8px 14px;min-width:120px;max-width:180px;text-align:center;display:inline-flex;flex-direction:column;align-items:center}.node .icon{font-size:18px;margin-bottom:2px}.node .name{font-size:10px;font-weight:700;color:#111;line-height:1.2}.node .role{font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:var(--c);line-height:1.2;margin-top:1px}.branch{display:flex;flex-direction:column;align-items:center}.children{display:flex;gap:12px;align-items:flex-start;position:relative}.vline{width:2px;height:16px;background:#DDD;margin:0 auto}.hline{position:absolute;top:0;height:2px;background:#DDD}.footer{margin-top:20px;padding-top:6px;border-top:1px solid #E0E0E0;display:flex;justify-content:space-between;font-size:7px;color:#888}`;

    const renderNode = (node) => {
      const children = getChildren(node.id);
      let h = `<div class="branch"><div class="node" style="--c:${node.color||'#555'}"><div class="icon">${node.icon||'👤'}</div>`;
      if (showNames && node.nombre) h += `<div class="name">${node.nombre}</div>`;
      h += `<div class="role">${node.cargo}</div></div>`;
      if (children.length > 0) {
        h += `<div class="vline"></div><div class="children">`;
        if (children.length > 1) h += `<div class="hline" style="left:${100/(children.length*2)}%;right:${100/(children.length*2)}%"></div>`;
        children.forEach(ch => { h += `<div class="branch"><div class="vline"></div>${renderNode(ch)}</div>`; });
        h += `</div>`;
      }
      h += `</div>`;
      return h;
    };

    let html = `<html><head><title>Organigrama - ${d.codigoOferta||""}</title><style>${S}</style></head><body>`;
    html += `<div class="header"><div><div class="logo">HABITARIS</div><div class="logo-sub">Arquitectura · Interiorismo · Construcción</div></div>`;
    html += `<div style="text-align:right"><div style="font-size:14px;font-weight:700">Organigrama del Proyecto</div>`;
    html += `<div style="font-size:8px;color:#555">${d.proyecto||""} · ${d.codigoOferta||""} · ${d.cliente||""}</div>`;
    html += `<div style="font-size:8px;color:#888;margin-top:2px">${nodos.length} integrantes</div></div></div>`;
    html += `<div class="org-container">`;
    roots.forEach(r2 => { html += renderNode(r2); });
    html += `</div>`;
    html += `<div class="footer"><span>HABITARIS · ${d.codigoOferta||""} · Organigrama</span><span>${new Date().toLocaleDateString("es-CO")}</span></div>`;
    html += `</body></html>`;
    w.document.write(html); w.document.close();
    setTimeout(() => w.print(), 400);
  };

  const selNode = nodos.find(n => n.id === selId);

  return (
    <div className="fade">
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, flexWrap:"wrap", gap:8 }}>
        <div>
          <p style={{ margin:0, fontSize:10, color:C.inkLight, letterSpacing:1.5, textTransform:"uppercase" }}>Organigrama del proyecto</p>
          <h2 style={{ margin:0, fontSize:18, fontWeight:700 }}>{nodos.length} integrantes</h2>
        </div>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
          <label style={{ display:"flex", alignItems:"center", gap:4, fontSize:10, color:C.inkMid, cursor:"pointer" }}>
            <input type="checkbox" checked={showNames} onChange={e=>setShowNames(e.target.checked)}/> Mostrar nombres
          </label>
          <button onClick={printOrg}
            style={{ padding:"6px 14px", background:"#111", color:"#fff", border:"none", borderRadius:5,
              fontSize:10, fontWeight:600, cursor:"pointer", fontFamily:"'DM Sans',sans-serif",
              display:"flex", alignItems:"center", gap:4 }}>
            <FileText size={11}/> Vista PDF
          </button>
        </div>
      </div>

      <div style={{ display:"flex", gap:16 }}>
        {/* ── LEFT: Node list + edit panel ── */}
        <div style={{ width:300, flexShrink:0 }}>
          {/* Template selector */}
          <Card style={{ padding:"10px 12px", marginBottom:10 }}>
            <div style={{ fontSize:9, fontWeight:700, color:"#888", textTransform:"uppercase", letterSpacing:1, marginBottom:6 }}>Plantilla</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:4 }}>
              {Object.entries(PLANTILLAS).map(([k,v]) => (
                <button key={k} onClick={()=>loadPlantilla(k)}
                  style={{ padding:"6px 8px", fontSize:10, fontWeight:600, cursor:"pointer",
                    border:`1px solid ${C.border}`, borderRadius:4, background:"#fff",
                    fontFamily:"'DM Sans',sans-serif", color:C.inkMid, textAlign:"left",
                    whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                  {v.label}
                </button>
              ))}
            </div>
          </Card>

          {/* Node list */}
          <Card style={{ padding:"6px 0", maxHeight:520, overflowY:"auto" }}>
            <div style={{ padding:"4px 12px 6px", fontSize:9, fontWeight:700, color:"#888", textTransform:"uppercase", letterSpacing:1,
              borderBottom:`1px solid ${C.border}` }}>
              Cargos del proyecto
            </div>
            {orderedNodes.map(n => {
              const depth = getDepth(n.id);
              const isSel = selId === n.id;
              return (
                <div key={n.id}
                  onClick={() => setSelId(isSel ? null : n.id)}
                  style={{ padding:"5px 10px 5px " + (12 + depth*16) + "px",
                    display:"flex", alignItems:"center", gap:6, cursor:"pointer",
                    background:isSel ? "#F0F0F0" : "transparent",
                    borderLeft:isSel ? `3px solid ${n.color||"#555"}` : "3px solid transparent",
                    borderBottom:`1px solid ${C.border}`,
                    transition:"background .1s" }}>
                  <span style={{ fontSize:14, flexShrink:0 }}>{n.icon||"👤"}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:10, fontWeight:700, color:n.color||"#555", textTransform:"uppercase", letterSpacing:0.3, lineHeight:1.2,
                      whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                      {n.cargo}
                    </div>
                    <div style={{ fontSize:10, color:C.ink, lineHeight:1.2,
                      whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                      {n.nombre || <span style={{ color:"#CCC", fontStyle:"italic" }}>Sin asignar</span>}
                    </div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); addNodo(n.id); }}
                    title="Añadir subordinado" style={{ background:"none", border:"none", cursor:"pointer", color:n.color||"#555", padding:2, fontSize:14 }}>+</button>
                </div>
              );
            })}
            {nodos.length === 0 && (
              <div style={{ padding:"16px 12px", textAlign:"center", color:"#CCC", fontSize:11 }}>
                Selecciona una plantilla o añade un cargo
              </div>
            )}
            <div style={{ padding:"6px 12px" }}>
              <button onClick={() => addNodo(null)}
                style={{ width:"100%", padding:"5px 8px", fontSize:10, fontWeight:600, cursor:"pointer",
                  border:`1px dashed ${C.border}`, borderRadius:4, background:"#fff", color:C.inkMid,
                  fontFamily:"'DM Sans',sans-serif" }}>
                + Añadir cargo raíz
              </button>
            </div>
          </Card>

          {/* Edit selected node */}
          {selNode && (
            <Card style={{ padding:14, marginTop:10 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                <div style={{ fontSize:11, fontWeight:700, color:selNode.color||"#555" }}>Editar: {selNode.cargo}</div>
                <button onClick={()=>setSelId(null)} style={{ background:"none",border:"none",cursor:"pointer",color:C.inkLight,padding:2 }}><X size={14}/></button>
              </div>
              <div style={{ marginBottom:6 }}>
                <label style={{ display:"block", fontSize:8, fontWeight:700, color:"#888", textTransform:"uppercase", marginBottom:2 }}>Cargo</label>
                <input value={selNode.cargo} onChange={e=>updNodo(selNode.id,"cargo",e.target.value)}
                  style={{ ...inp, width:"100%" }}/>
              </div>
              <div style={{ marginBottom:6 }}>
                <label style={{ display:"block", fontSize:8, fontWeight:700, color:"#888", textTransform:"uppercase", marginBottom:2 }}>Nombre</label>
                <input value={selNode.nombre||""} onChange={e=>updNodo(selNode.id,"nombre",e.target.value)}
                  placeholder="Nombre completo" style={{ ...inp, width:"100%" }}/>
              </div>
              <div style={{ marginBottom:6 }}>
                <label style={{ display:"block", fontSize:8, fontWeight:700, color:"#888", textTransform:"uppercase", marginBottom:2 }}>Contacto</label>
                <input value={selNode.contacto||""} onChange={e=>updNodo(selNode.id,"contacto",e.target.value)}
                  placeholder="Tel o email" style={{ ...inp, width:"100%" }}/>
              </div>
              <div style={{ marginBottom:6 }}>
                <label style={{ display:"block", fontSize:8, fontWeight:700, color:"#888", textTransform:"uppercase", marginBottom:2 }}>Reporta a</label>
                <select value={selNode.parentId||""} onChange={e=>updNodo(selNode.id,"parentId",e.target.value||null)}
                  style={{ ...inp, width:"100%" }}>
                  <option value="">— Raíz (sin jefe) —</option>
                  {nodos.filter(n=>n.id!==selNode.id).map(n=><option key={n.id} value={n.id}>{n.cargo} {n.nombre?`(${n.nombre})`:""}</option>)}
                </select>
              </div>
              {/* Icons */}
              <div style={{ marginBottom:6 }}>
                <label style={{ display:"block", fontSize:8, fontWeight:700, color:"#888", textTransform:"uppercase", marginBottom:2 }}>Icono</label>
                <div style={{ display:"flex", flexWrap:"wrap", gap:3 }}>
                  {ICONS.map(ic=>(
                    <button key={ic} onClick={()=>updNodo(selNode.id,"icon",ic)}
                      style={{ width:24, height:24, border:`1px solid ${selNode.icon===ic?"#111":"#E0E0E0"}`,
                        borderRadius:3, background:selNode.icon===ic?"#F5F4F1":"#fff",
                        cursor:"pointer", fontSize:12, display:"flex", alignItems:"center", justifyContent:"center" }}>{ic}</button>
                  ))}
                </div>
              </div>
              {/* Colors */}
              <div style={{ marginBottom:8 }}>
                <label style={{ display:"block", fontSize:8, fontWeight:700, color:"#888", textTransform:"uppercase", marginBottom:2 }}>Color</label>
                <div style={{ display:"flex", flexWrap:"wrap", gap:3 }}>
                  {COLORS.map(cl=>(
                    <button key={cl} onClick={()=>updNodo(selNode.id,"color",cl)}
                      style={{ width:20, height:20, borderRadius:3, background:cl, cursor:"pointer",
                        border:selNode.color===cl?"2px solid #111":"2px solid #E0E0E0" }}/>
                  ))}
                </div>
              </div>
              <div style={{ display:"flex", gap:6 }}>
                <button onClick={()=>addNodo(selNode.id)}
                  style={{ flex:1, padding:"5px 8px", fontSize:10, fontWeight:600, cursor:"pointer",
                    border:`1px solid ${C.border}`, borderRadius:4, background:"#fff", color:C.inkMid,
                    fontFamily:"'DM Sans',sans-serif" }}>
                  + Subordinado
                </button>
                <button onClick={()=>delNodo(selNode.id)}
                  style={{ padding:"5px 10px", fontSize:10, fontWeight:600, cursor:"pointer",
                    border:"1px solid #C44", borderRadius:4, background:"#FEE", color:"#C44",
                    fontFamily:"'DM Sans',sans-serif" }}>
                  <Trash2 size={10}/>
                </button>
              </div>
            </Card>
          )}
        </div>

        {/* ── RIGHT: Visual chart ── */}
        <Card style={{ flex:1, padding:20, overflowX:"auto", minHeight:300 }}>
          {nodos.length === 0 ? (
            <div style={{ textAlign:"center", padding:40 }}>
              <User size={32} style={{ color:C.inkLight, opacity:0.3, marginBottom:12 }}/>
              <p style={{ color:C.inkLight, fontSize:13, margin:"0 0 12px" }}>Selecciona una plantilla para comenzar</p>
              <div style={{ display:"flex", gap:6, justifyContent:"center", flexWrap:"wrap" }}>
                {Object.entries(PLANTILLAS).map(([k,v]) => (
                  <Btn key={k} sm v="sec" on={()=>loadPlantilla(k)}>{v.label}</Btn>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ display:"flex", justifyContent:"center", paddingTop:8, paddingBottom:20 }}>
              {roots.map(root => <NodeCard key={root.id} node={root}/>)}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}


function TRes({ d, r }) {
  const isObra = d.tipoProyecto === "OBRA";
  const modoCalc = d.modoCalcObra || "margen";
  const uDecl = r.U || 0;

  const rows = [
    { l: "Costo directo total (CD)", v: r.COSTO, b: true },
    { l: "→ Materiales (M)",    v: r.cdM,  sub: true },
    { l: "→ Mano de obra (MO)", v: r.cdMO, sub: true },
    { l: "→ Subcontratas (SUB)",v: r.cdSB, sub: true },
    ...(d.tipoProyecto === "DISEÑO" ? [{ l: "→ Diseño APU", v: r.costoDis, sub: true }] : []),
    null,
    { l: "Gastos de contratación (GC) " + pct(r.g), v: r.GC },
    { l: "→ Pólizas (RCE+TRC+Adm)", v: ((d.pctRCE||0)+(d.pctTRC||0)+(d.pctAdm||0)) * r.PVP, sub: true },
    { l: "→ ICA", v: r.ICA, sub: true },
    { l: "Gastos financieros (GF) " + pct(r.f), v: r.fin },
    null,
    { l: `Margen objetivo ${pct(d.margen)}`, v: r.margenCOP, b: true, col: C.success },
    ...(isObra ? [
      { l: `→ Utilidad declarada para IVA (U): ${pct(uDecl)}${modoCalc==="aiu"?" (AIU)":" (manual)"}`, v: uDecl * r.PVP, sub: true, col: "#3B3B3B" },
      { l: modoCalc==="aiu"
        ? `→ AIU: A ${pct(d.aiuA||0.08)} + I ${pct(d.aiuI||0.03)} + U ${pct(d.aiuU||0.07)} = ${pct((d.aiuA||0.08)+(d.aiuI||0.03)+(d.aiuU||0.07))}`
        : `→ Margen ${pct(d.margen)} sobre PVP · U para IVA: ${pct(uDecl)}`, v: null, sub: true, note: true },
    ] : []),
    null,
    { l: "PVP sin IVA",  v: r.PVP, b: true },
    { l: isObra
        ? `IVA ${pct(d.tarifaIVA)} sobre U ${pct(uDecl)} del PVP`
        : d.pais === "ES"
          ? `IVA ${pct(d.tarifaIVA)} (España)`
          : `IVA ${pct(d.tarifaIVA)} pleno (DISEÑO)`,
      v: r.IVA, sub: true },
    { l: "PVP con IVA", v: r.PVP_IVA, b: true, col: C.ink },
  ];

  return (
    <div className="fade" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}` }}>
          <STitle t="Desglose de costos" s="Construcción del precio de venta" />
        </div>
        <div style={{ padding: "6px 0" }}>
          {rows.map((rw, i) => rw === null
            ? <div key={i} style={{ borderTop: `1px solid ${C.border}`, margin: "6px 0" }} />
            : (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 20px", background: rw.b && !rw.sub ? C.accentBg : "" }}>
                <span style={{ fontSize: rw.sub ? 11 : 12, color: rw.col || C.inkMid, paddingLeft: rw.sub ? 12 : 0, fontWeight: rw.b ? 700 : 400 }}>{rw.l}</span>
                {rw.v != null && <span style={{ fontSize: rw.sub ? 11 : 12, color: rw.col || C.ink, fontWeight: rw.b ? 700 : 500, fontFamily:"'DM Mono',monospace" }}>{fmt(rw.v)}</span>}
              </div>
            ))}
        </div>
        {/* Coeficientes */}
        <div style={{ borderTop:`2px solid ${C.border}`, padding:"14px 20px", background:"#F5F4F1" }}>
          <p style={{ fontSize:9, fontWeight:700, color:"#888", textTransform:"uppercase", letterSpacing:1, margin:"0 0 8px" }}>Coeficientes aplicados</p>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8 }}>
            {[
              ["Den. (1−M−GC)", (r.den1||0).toFixed(4)],
              ["Den. (1−GF)", (r.denGF||0).toFixed(4)],
              ["Den. total", (r.den||0).toFixed(4)],
              ["Coef. ×", (r.coefMult||0).toFixed(4)],
            ].map(([l,v])=>(
              <div key={l}>
                <div style={{ fontSize:9, color:"#999", marginBottom:2 }}>{l}</div>
                <div style={{ fontSize:11, fontWeight:600, fontFamily:"'DM Mono',monospace" }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Hero PVP */}
        <div style={{ background: C.ink, borderRadius: 3, padding: "28px 28px" }}>
          <p style={{ margin: "0 0 6px", fontSize: 9, letterSpacing: 2.5, textTransform: "uppercase", color: "rgba(255,255,255,0.4)" }}>PVP Total al cliente</p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 40, fontWeight: 700, color: "#fff", margin: "0 0 10px", letterSpacing: -1 }}>{fmt(r.PVP_IVA)}</p>
          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", margin: 0 }}>
            IVA {pct(d.tarifaIVA)} · Modo {d.tipoProyecto}
            {isObra && ` · U declarada ${pct(uDecl)}`}
            {d.tipoProyecto === "DISEÑO" && ` · ${d.subtipoDiseno}`}
          </p>
        </div>

        {/* Métricas */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            ["PVP sin IVA",      fmt(r.PVP),       C.ink],
            ["IVA",              fmt(r.IVA),        C.info],
            ["Margen (" + pct(d.margen) + ")", fmt(r.margenCOP), C.success],
            ...(isObra ? [["Utilidad decl. ("+pct(uDecl)+")", fmt(uDecl*r.PVP), "#3B3B3B"]] : []),
            ["Retenciones", fmt(r.ret), C.warning],
            ["Neto a recibir",   fmt(r.neto),       C.ink],
          ].map(([l, v, col]) => (
            <Card key={l} style={{ padding: "13px 16px" }}>
              <p style={{ margin: "0 0 4px", fontSize: 9, fontWeight: 600, color: C.inkLight, textTransform: "uppercase", letterSpacing: 1 }}>{l}</p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 16, fontWeight: 700, color: col, margin: 0 }}>{v}</p>
            </Card>
          ))}
        </div>

        {/* Tags */}
        <Card style={{ padding: 16 }}>
          <p style={{ fontSize: 9, fontWeight: 600, color: C.inkLight, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 10px" }}>Parámetros aplicados</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {[`Margen ${pct(d.margen)}`,
              ...(isObra ? [`U decl. ${pct(uDecl)}`] : []),
              `IVA ${pct(d.tarifaIVA)}`, d.medioPago,
              d.aplicar4x1000 === "SI" ? "4×1000" : "Sin 4×1000",
              `GC ${pct(r.g||0)}`,
              `GF ${pct(r.f || 0)}`,
              `Coef. ×${(r.coefMult||0).toFixed(4)}`,
            ].map(t => (
              <span key={t} style={{ background: C.accentBg, color: C.inkMid, fontSize: 10, padding: "3px 8px", borderRadius: 2, letterSpacing: 0.4 }}>{t}</span>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ── Entrega al cliente ─────────────────────────────────────── */
function TEnt({ d, set, r }) {
  const getText = (k, def) => d["ent_"+k] ?? def;
  const setText = (k, v) => set("ent_"+k, v);
  const isObra = d.tipoProyecto === "OBRA";
  const condPct4 = d.condPct4 ?? 0.10;

  /* textarea + print render */
  const ta = (k, def, rows=3) => (<>
    <textarea value={getText(k, def)} rows={rows}
      onChange={e => setText(k, e.target.value)}
      style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:4, padding:"8px 10px",
        fontSize:12, fontFamily:"'DM Sans',sans-serif", resize:"vertical", lineHeight:1.5,
        background:C.bg, color:C.ink }}/>
    <div className="ptr" style={{ fontSize:12, lineHeight:1.6 }}>{getText(k, def)}</div>
  </>);
  const inp = (k, def) => (
    <input value={getText(k, def)} onChange={e => setText(k, e.target.value)}
      style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:4, padding:"7px 10px",
        fontSize:13, fontFamily:"'DM Sans',sans-serif", background:C.bg, color:C.ink }}/>
  );
  const label = (text) => (
    <p className="no-print" style={{ fontSize:9, fontWeight:600, color:C.inkLight, textTransform:"uppercase",
      letterSpacing:1, margin:"0 0 5px" }}>{text}</p>
  );
  const plabel = (text) => (
    <p style={{ fontSize:9, fontWeight:600, color:C.inkLight, textTransform:"uppercase",
      letterSpacing:1, margin:"0 0 5px" }}>{text}</p>
  );

  const [nivelDetalle, setNivelDetalle] = useState(d.ent_nivelDetalle || "capitulos");
  const onNivelChange = (v) => { setNivelDetalle(v); set("ent_nivelDetalle", v); };
  const [inclCrono, setInclCrono] = useState(d.ent_inclCrono ?? false);
  const [inclOrganigrama, setInclOrganigrama] = useState(d.ent_inclOrganigrama ?? false);
  const onToggle = (k, v, setter) => { setter(v); set("ent_"+k, v); };

  const borLineas = (d.borradorLineas||[]);
  const capitulos = borLineas.filter(l => l.esCapitulo);
  const capTotals = capitulos.map(cap => {
    const capIdx = borLineas.indexOf(cap);
    const nextCapIdx = borLineas.findIndex((l, i) => i > capIdx && l.esCapitulo);
    const items = borLineas.slice(capIdx + 1, nextCapIdx === -1 ? borLineas.length : nextCapIdx).filter(l => !l.esCapitulo);
    const total = items.reduce((s, l) => {
      const v = l.precioCD ? calcPUVentaLinea(l.precioCD, l.cantidad||1, d) : null;
      return s + (v ? v.totalVenta : 0);
    }, 0);
    return { ...cap, total, items };
  });

  const representante = d.firmaRepresentante || "David Parra Galera";
  const cargo = representante === "Ana María Díaz Buitrago" ? "Directora Creativa y de Diseño" : "Director Ejecutivo y de Producción";

  const titulo = getText("titulo", isObra ? "PRESUPUESTO DE EJECUCIÓN" : "PROPUESTA DE DISEÑO");
  const refOferta = getText("ref", d.codigoOferta || "");
  const clienteNombre = getText("cliente", d.cliente || "");
  const fechaDoc = getText("fecha", d.fechaOferta || today());
  const revision = d.revision || 1;

  /* ── PDF download with proper filename ── */
  const downloadPDF = () => {
    const parts = [refOferta, d.proyecto||"Habitaris", `Rev${revision}`].filter(Boolean);
    const filename = parts.join("_").replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ_\-]/g, "_");
    document.title = filename;
    window.print();
    setTimeout(() => { document.title = "Habitaris Suite"; }, 1500);
  };

  /* ── Apply service template ── */
  const applyTemplate = (tplId) => {
    const T = {
      obra_integral: {
        titulo: "PRESUPUESTO DE EJECUCIÓN",
        alcance: `El presente alcance comprende la ejecución integral del proyecto ${d.proyecto||""}, incluyendo:\n\n1. OBRA CIVIL: Demoliciones selectivas, mampostería, pañetes, nivelación de pisos y cielos.\n2. INSTALACIONES: Red hidrosanitaria, red eléctrica y puntos de datos según planos técnicos aprobados.\n3. ACABADOS: Suministro e instalación de pisos, enchapes, pintura, carpintería en madera y metálica.\n4. MOBILIARIO FIJO: Cocina integral, closets, muebles de baño y demás mobiliario fijo según diseño.\n5. SUPERVISIÓN: Dirección de obra, control de calidad, coordinación de subcontratistas y proveedores.\n\nEl proyecto se ejecutará en la dirección ${d.ubicacion||"___"} conforme a los diseños previamente aprobados por el cliente.`,
        fases: "1. Firma de contrato y pago de anticipo\n2. Acta de inicio de obra\n3. Demoliciones y obra negra\n4. Instalaciones técnicas (hidrosanitaria, eléctrica, gas)\n5. Obra gris (pañetes, nivelación, impermeabilización)\n6. Acabados (pisos, enchapes, pintura)\n7. Carpintería y mobiliario fijo\n8. Aseo final y entrega\n9. Acta de recepción y cierre",
        exclusiones: "Esta propuesta NO incluye, salvo acuerdo escrito:\n\n- Licencias y permisos de construcción\n- Obra de estructura o cimentación no contemplada en diseños\n- Suministro e instalación de electrodomésticos\n- Mudanzas y trasteos\n- Diseño o rediseño (ya aprobado previamente)\n- Adecuaciones en zonas comunes del edificio\n- Amoblamiento libre (sofás, camas, mesas, sillas)\n\nTodos los entregables se comparten exclusivamente en formato digital.",
        condPago: `Forma de pago:\n\n1. ${((d.condPct1||0.5)*100).toFixed(0)}% Anticipo contra firma de contrato\n2. ${((d.condPct2||0.3)*100).toFixed(0)}% Contra avance del 50% de obra\n3. ${((d.condPct3||0.1)*100).toFixed(0)}% Contra finalización de obra\n4. ${((condPct4)*100).toFixed(0)}% Retención de garantía (a 3 meses)`,
        plazo: `El plazo de ejecución estimado es de ${d.plazoSemanas||12} semanas calendario contadas a partir del acta de inicio de obra.`,
        garantias: "Habitaris garantiza los trabajos ejecutados por un período de 12 meses contados a partir del acta de entrega final:\n\n- Estabilidad y solidez de obra civil: 10 años según Ley 1796 de 2016\n- Impermeabilización: 5 años\n- Acabados y revestimientos: 1 año\n- Instalaciones hidrosanitarias y eléctricas: 1 año\n- Carpintería y mobiliario fijo: 1 año\n\nLa garantía no cubre daños por uso inadecuado, modificaciones del cliente o fuerza mayor.",
      },
      obra_parcial: {
        titulo: "PRESUPUESTO DE EJECUCIÓN PARCIAL",
        alcance: `El presente alcance comprende la ejecución parcial de obras en el proyecto ${d.proyecto||""}, limitado a las partidas descritas en el presupuesto adjunto.\n\nLos trabajos se realizarán conforme a los planos y especificaciones técnicas proporcionados por el cliente o su equipo de diseño.\n\nHabitaris actuará como ejecutor de las obras descritas, sin responsabilidad sobre el diseño ni sobre partidas no incluidas en esta propuesta.`,
        fases: "1. Firma de contrato y pago de anticipo\n2. Programación y alistamiento de obra\n3. Ejecución de partidas contratadas\n4. Control de calidad y verificación\n5. Entrega y acta de recepción",
        exclusiones: "Esta propuesta NO incluye:\n\n- Diseño arquitectónico o de interiores\n- Partidas no listadas explícitamente en el presupuesto\n- Licencias, permisos o trámites ante entidades\n- Interventoría externa\n- Suministro de electrodomésticos o amoblamiento\n\nCualquier trabajo adicional será cotizado por separado.",
        condPago: `Forma de pago:\n\n1. ${((d.condPct1||0.5)*100).toFixed(0)}% Anticipo contra firma de contrato\n2. ${((d.condPct2||0.3)*100).toFixed(0)}% Contra avance del 50%\n3. ${((d.condPct3||0.1)*100).toFixed(0)}% Contra finalización\n4. ${((condPct4)*100).toFixed(0)}% Retención de garantía`,
        plazo: `El plazo de ejecución estimado es de ${d.plazoSemanas||8} semanas calendario.`,
        garantias: "Garantía de 12 meses sobre los trabajos ejecutados, contados desde el acta de entrega.",
      },
      diseno_int: {
        titulo: "PROPUESTA DE DISEÑO INTERIOR",
        alcance: `Diseño interior integral del proyecto ${d.proyecto||""} ubicado en ${d.ubicacion||"___"}.\n\nEl servicio incluye:\n\n1. LEVANTAMIENTO: Visita técnica, toma de medidas y registro fotográfico del estado actual.\n2. CONCEPTUALIZACIÓN: Desarrollo de concepto de diseño, moodboards, paleta de materiales y colores.\n3. DISEÑO BÁSICO: Plantas de distribución, propuesta de mobiliario, iluminación general.\n4. DISEÑO DETALLADO: Planos técnicos de construcción (plantas, cortes, detalles), especificaciones de acabados, cuadros de cantidades.\n5. RENDERS: Visualizaciones 3D de los espacios principales.\n6. ACOMPAÑAMIENTO: Seguimiento durante la ejecución de obra.`,
        fases: "1. Firma de contrato y anticipo\n2. Levantamiento y mediciones\n3. Concepto de diseño y moodboard\n4. Presentación de diseño básico\n5. Aprobación del cliente\n6. Desarrollo de planos técnicos\n7. Entrega de planos y especificaciones\n8. Acompañamiento en obra (si aplica)",
        exclusiones: "Esta propuesta NO incluye:\n\n- Ejecución de obra civil o instalaciones\n- Suministro o compra de materiales, mobiliario o equipos\n- Diseño estructural o de ingeniería especializada\n- Renders adicionales a los incluidos\n- Trámites de licencias urbanísticas\n- Interventoría de obra\n\nTodos los entregables se comparten en formato digital.",
        condPago: `Forma de pago:\n\n1. 50% Anticipo contra firma de contrato\n2. 30% Contra entrega de diseño básico aprobado\n3. 20% Contra entrega de planos técnicos finales`,
        plazo: `El plazo de desarrollo es de ${d.plazoSemanas||6} semanas a partir de la aprobación del concepto.`,
        garantias: "Los entregables de diseño se entregan en formato digital editable. Se incluyen hasta 2 rondas de ajustes por etapa. Modificaciones adicionales se cotizarán por separado.",
      },
      diseno_arq: {
        titulo: "PROPUESTA DE DISEÑO ARQUITECTÓNICO",
        alcance: `Diseño arquitectónico del proyecto ${d.proyecto||""} ubicado en ${d.ubicacion||"___"}.\n\n1. ESQUEMA BÁSICO: Análisis del programa, zonificación, volumetría.\n2. ANTEPROYECTO: Plantas, fachadas, cortes y perspectivas.\n3. PROYECTO: Planos definitivos, detalles constructivos, memorias.\n4. COORDINACIÓN: Integración con ingenierías.`,
        fases: "1. Visita al sitio y levantamiento\n2. Programa arquitectónico\n3. Esquema básico\n4. Anteproyecto\n5. Proyecto definitivo\n6. Coordinación técnica\n7. Entrega final",
        exclusiones: "NO incluye estudios de suelos, topografía, diseño estructural, hidrosanitario, eléctrico, licencias de construcción ni ejecución de obra.",
        condPago: "1. 40% Anticipo\n2. 30% Contra entrega de anteproyecto\n3. 30% Contra entrega de proyecto definitivo",
        plazo: `Plazo estimado: ${d.plazoSemanas||8} semanas.`,
        garantias: "Entregables en formato digital. 2 rondas de ajustes incluidas por etapa.",
      },
      consultoria: {
        titulo: "PROPUESTA DE CONSULTORÍA",
        alcance: `Consultoría especializada para el proyecto ${d.proyecto||""}.\n\n1. Diagnóstico y análisis del estado actual\n2. Propuesta de intervención con alternativas\n3. Estimación presupuestal\n4. Informe técnico con recomendaciones\n5. Acompañamiento en la toma de decisiones`,
        fases: "1. Reunión de inicio\n2. Visita técnica\n3. Análisis y diagnóstico\n4. Presentación de alternativas\n5. Informe final",
        exclusiones: "NO incluye desarrollo de planos técnicos, ejecución de obras ni compra de materiales.",
        condPago: "1. 50% Anticipo\n2. 50% Contra entrega de informe final",
        plazo: `Plazo estimado: ${d.plazoSemanas||4} semanas.`,
        garantias: "Informe entregado en formato digital.",
      },
      custom: { titulo:"", alcance:"", fases:"", exclusiones:"", condPago:"", plazo:"", garantias:"" },
    };
    const t = T[tplId];
    if (!t) return;
    if (t.titulo) setText("titulo", t.titulo);
    setText("alcance", t.alcance);
    setText("fases", t.fases);
    setText("exclusiones", t.exclusiones);
    if (t.condPago) setText("condPago", t.condPago);
    if (t.plazo) setText("plazo", t.plazo);
    if (t.garantias) setText("garantias", t.garantias);
  };

  /* ── Vista previa profesional (new window) ── */
  const printEntregaPreview = () => {
    const w = window.open("","_blank");
    const S = `@import url('https://fonts.googleapis.com/css2?family=DM Sans:wght@300;400;600;700;800&family=DM+Mono:wght@400;500&display=swap');
    @page{size:A4 portrait;margin:15mm 18mm}
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'DM Sans',sans-serif;color:#1A1A1A;font-size:10px;line-height:1.6}
    .cover{min-height:100vh;display:flex;flex-direction:column;justify-content:space-between;padding:40px 50px;page-break-after:always}
    .cover-brand{border-bottom:3px solid #111;padding-bottom:16px}
    .cover-brand h1{font-size:36px;font-weight:800;letter-spacing:10px;text-transform:uppercase}
    .cover-brand p{font-size:8px;letter-spacing:3px;color:#888;text-transform:uppercase;margin-top:4px}
    .cover-title{margin:80px 0}
    .cover-title h2{font-size:26px;font-weight:700;letter-spacing:3px;text-transform:uppercase;line-height:1.3;color:#111}
    .cover-title .ref{font-size:13px;color:#666;margin-top:10px}
    .cover-info{font-size:12px;color:#444;line-height:2}
    .cover-info strong{color:#111}
    .cover-footer{border-top:1px solid #DDD;padding-top:16px;text-align:center}
    .cover-footer p{font-size:8px;color:#999;letter-spacing:1px}
    .toc{padding:40px 50px;page-break-after:always}
    .toc h2{font-size:18px;font-weight:700;letter-spacing:3px;text-transform:uppercase;border-bottom:3px solid #111;padding-bottom:8px;margin-bottom:24px}
    .toc-item{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px dotted #CCC;font-size:12px}
    .toc-item span:first-child{font-weight:600}
    .toc-item span:last-child{font-family:'DM Mono',monospace;color:#888;font-size:10px}
    .page{padding:30px 50px;page-break-after:always;min-height:90vh}
    .page-header{display:flex;justify-content:space-between;align-items:flex-end;padding-bottom:8px;border-bottom:2px solid #111;margin-bottom:20px}
    .page-header .brand{font-weight:700;font-size:12px;letter-spacing:4px}
    .page-header .meta{text-align:right;font-size:8px;color:#666}
    .section-title{font-size:16px;font-weight:700;letter-spacing:1px;color:#111;margin:20px 0 10px;padding-bottom:4px;border-bottom:1px solid #E0E0E0}
    .section-num{color:#888;font-weight:400;margin-right:8px}
    .content{font-size:11px;line-height:1.8;color:#333;white-space:pre-wrap}
    table{width:100%;border-collapse:collapse;margin:10px 0}
    th{background:#F5F4F1;padding:8px 12px;font-size:8px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.5px;text-align:left;border-bottom:2px solid #DDD}
    td{padding:7px 12px;font-size:10px;border-bottom:1px solid #F5F5F5}
    .mono{font-family:'DM Mono',monospace}
    .r{text-align:right}
    .bold{font-weight:700}
    .total-row{background:#111;color:#fff}
    .total-row td{color:#fff;font-weight:700;font-size:12px;padding:10px 12px}
    .iva-row{background:#F5F4F1}
    .sign-block{margin-top:40px;display:grid;grid-template-columns:1fr 1fr;gap:40px}
    .sign-box{text-align:center;padding-top:40px;border-top:1px solid #111}
    .sign-box .name{font-size:11px;font-weight:700}
    .sign-box .role{font-size:9px;color:#666}
    .doc-footer{position:fixed;bottom:10mm;left:18mm;right:18mm;display:flex;justify-content:space-between;font-size:7px;color:#AAA;border-top:1px solid #E0E0E0;padding-top:4px}`;

    const hdr = `<div class="page-header"><div class="brand">HABITARIS</div><div class="meta"><div>${titulo}</div><div>${refOferta} · Rev.${revision} · ${fechaDoc}</div></div></div>`;
    const nl2p = (txt) => (txt||"").split("\n").map(l=>l.trim()).filter(Boolean).map(l=>`<p>${l}</p>`).join("");

    let html = `<html><head><title>${refOferta} - ${d.proyecto||"Habitaris"}</title><style>${S}</style></head><body>`;

    // ── COVER PAGE ──
    html += `<div class="cover">`;
    html += `<div class="cover-brand"><h1>HABITARIS</h1><p>Arquitectura · Interiorismo · Construcción</p></div>`;
    html += `<div class="cover-title"><h2>${titulo}</h2>`;
    html += `<div class="ref">${refOferta} · Revisión ${revision}</div></div>`;
    html += `<div class="cover-info">`;
    if(clienteNombre) html += `<div><strong>Cliente:</strong> ${clienteNombre}</div>`;
    if(d.proyecto) html += `<div><strong>Proyecto:</strong> ${d.proyecto}</div>`;
    if(d.ubicacion) html += `<div><strong>Ubicación:</strong> ${d.ubicacion}</div>`;
    html += `<div><strong>Fecha:</strong> ${fechaDoc}</div>`;
    html += `<div><strong>Vigencia:</strong> 30 días calendario</div></div>`;
    html += `<div class="cover-footer"><p>Habitaris S.A.S · NIT 901.922.136-8 · Bogotá D.C.</p><p>Documento confidencial · Uso exclusivo del destinatario</p></div>`;
    html += `</div>`;

    // ── TABLE OF CONTENTS ──
    let secNum = 0;
    const secs = [];
    secs.push("Alcance del servicio");
    if(isObra) secs.push("Fases del proyecto");
    secs.push("Exclusiones");
    secs.push("Presupuesto");
    if(d.ent_inclCondPago !== false) secs.push("Condiciones de pago");
    if(d.ent_inclGarantias !== false) secs.push("Plazo y garantías");
    secs.push("Términos y condiciones");
    secs.push("Firma de aceptación");

    html += `<div class="toc"><h2>Contenido</h2>`;
    secs.forEach((s,i) => { html += `<div class="toc-item"><span>${i+1}. ${s}</span><span>${i+2}</span></div>`; });
    html += `</div>`;

    // ── ALCANCE ──
    html += `<div class="page">${hdr}`;
    secNum++;
    html += `<div class="section-title"><span class="section-num">${secNum}.</span>Alcance del servicio</div>`;
    html += `<div class="content">${getText("alcance","")}</div>`;

    // FASES
    if(isObra) {
      secNum++;
      html += `<div class="section-title"><span class="section-num">${secNum}.</span>Fases del proyecto</div>`;
      html += `<div class="content">${getText("fases","")}</div>`;
    }

    // EXCLUSIONES
    secNum++;
    html += `<div class="section-title"><span class="section-num">${secNum}.</span>Exclusiones</div>`;
    html += `<div class="content">${getText("exclusiones","")}</div>`;
    html += `</div>`;

    // ── PRESUPUESTO ──
    html += `<div class="page">${hdr}`;
    secNum++;
    html += `<div class="section-title"><span class="section-num">${secNum}.</span>Presupuesto</div>`;

    if(nivelDetalle === "total") {
      html += `<table><thead><tr><th>Item</th><th>Descripción</th><th class="r">Valor</th></tr></thead><tbody>`;
      html += `<tr><td>1</td><td>${getText("descTotal",d.proyecto||"Proyecto")}</td><td class="mono r bold">${fmt(r.PVP)}</td></tr>`;
      html += `<tr class="iva-row"><td colspan="2">${isObra?"IVA sobre la utilidad":`IVA ${pct(d.tarifaIVA)}`}</td><td class="mono r">${fmt(r.IVA)}</td></tr>`;
      html += `<tr class="total-row"><td colspan="2">VALOR TOTAL</td><td class="mono r">${fmt(r.PVP_IVA)}</td></tr>`;
      html += `</tbody></table>`;
    } else if(nivelDetalle === "capitulos") {
      html += `<table><thead><tr><th>Item</th><th>Descripción</th><th class="r">Total</th></tr></thead><tbody>`;
      capTotals.forEach((cap,i) => {
        html += `<tr><td class="bold">${i+1}</td><td class="bold">${cap.nombre||"Capítulo "+(i+1)}</td><td class="mono r bold">${fmt(cap.total)}</td></tr>`;
      });
      html += `<tr style="border-top:2px solid #111;background:#FFFFFF"><td colspan="2" class="bold">Subtotal</td><td class="mono r bold">${fmt(r.PVP)}</td></tr>`;
      html += `<tr class="iva-row"><td colspan="2">${isObra?"IVA sobre la utilidad":`IVA ${pct(d.tarifaIVA)}`}</td><td class="mono r">${fmt(r.IVA)}</td></tr>`;
      html += `<tr class="total-row"><td colspan="2">VALOR TOTAL</td><td class="mono r">${fmt(r.PVP_IVA)}</td></tr>`;
      html += `</tbody></table>`;
    } else {
      html += `<table><thead><tr><th>#</th><th>Descripción</th><th class="r">Und</th><th class="r">Cant</th><th class="r">P.U.</th><th class="r">Total</th></tr></thead><tbody>`;
      capTotals.forEach((cap,ci) => {
        html += `<tr style="background:#F5F4F1"><td class="bold" colspan="5">${ci+1}. ${cap.nombre||""}</td><td class="mono r bold">${fmt(cap.total)}</td></tr>`;
        (cap.items||[]).forEach((it,ii) => {
          const v = it.precioCD ? calcPUVentaLinea(it.precioCD, it.cantidad||1, d) : null;
          html += `<tr><td>${ci+1}.${ii+1}</td><td>${it.descripcion||""}</td><td class="r">${it.und||"ud"}</td>`;
          html += `<td class="mono r">${it.cantidad||1}</td><td class="mono r">${v?fmt(v.puVenta):"—"}</td><td class="mono r">${v?fmt(v.totalVenta):"—"}</td></tr>`;
        });
      });
      html += `<tr style="border-top:2px solid #111;background:#FFFFFF"><td colspan="5" class="bold">Subtotal</td><td class="mono r bold">${fmt(r.PVP)}</td></tr>`;
      html += `<tr class="iva-row"><td colspan="5">${isObra?"IVA sobre la utilidad":`IVA ${pct(d.tarifaIVA)}`}</td><td class="mono r">${fmt(r.IVA)}</td></tr>`;
      html += `<tr class="total-row"><td colspan="5">VALOR TOTAL</td><td class="mono r">${fmt(r.PVP_IVA)}</td></tr>`;
      html += `</tbody></table>`;
    }

    html += `<div style="margin-top:16px;padding:10px 14px;background:#F5F4F1;border-radius:4px;font-size:9px;color:#666">`;
    html += `Valores expresados en ${d.divisa||"COP"}. ${isObra?"IVA calculado sobre la utilidad según normativa colombiana.":"IVA incluido según tarifa vigente."} Propuesta válida por 30 días calendario.</div>`;
    html += `</div>`;

    // ── CONDICIONES DE PAGO ──
    if(d.ent_inclCondPago !== false) {
      html += `<div class="page">${hdr}`;
      secNum++;
      html += `<div class="section-title"><span class="section-num">${secNum}.</span>Condiciones de pago</div>`;
      html += `<div class="content">${getText("condPago","")}</div>`;
    }

    // ── PLAZO Y GARANTÍAS ──
    if(d.ent_inclGarantias !== false) {
      if(d.ent_inclCondPago === false) html += `<div class="page">${hdr}`;
      secNum++;
      html += `<div class="section-title"><span class="section-num">${secNum}.</span>Plazo y garantías</div>`;
      html += `<div class="content">${getText("plazo","")}</div>`;
      html += `<div style="margin-top:10px" class="content">${getText("garantias","")}</div>`;
    }

    // ── TÉRMINOS ──
    secNum++;
    html += `<div class="section-title"><span class="section-num">${secNum}.</span>Términos y condiciones</div>`;
    html += `<div class="content">${getText("terminos","Los precios incluyen materiales, mano de obra, herramienta y administración según lo descrito en el alcance.\n\nCualquier trabajo no contemplado en esta propuesta se cotizará como adicional previo a su ejecución y deberá ser aprobado por escrito.\n\nEl cronograma propuesto podrá ajustarse por causas de fuerza mayor, cambios solicitados por el cliente o condiciones no previstas del inmueble.")}</div>`;
    if(d.ent_inclCondPago !== false || d.ent_inclGarantias !== false) html += `</div>`;

    // ── FIRMA ──
    html += `<div class="page">${hdr}`;
    secNum++;
    html += `<div class="section-title"><span class="section-num">${secNum}.</span>Firma de aceptación</div>`;
    html += `<div style="font-size:11px;line-height:1.8;color:#333;margin:16px 0 30px">`;
    html += `Con la firma del presente documento, el Cliente acepta los términos y condiciones descritos en esta propuesta, `;
    html += `y autoriza a Habitaris S.A.S. a proceder con la ejecución del servicio de acuerdo al alcance, presupuesto y plazos aquí establecidos.</div>`;

    html += `<div class="sign-block">`;
    html += `<div class="sign-box"><div class="name">${representante}</div><div class="role">${cargo}</div><div style="font-size:8px;color:#888;margin-top:2px">Habitaris S.A.S. · NIT 901.922.136-8</div></div>`;
    html += `<div class="sign-box"><div class="name">${clienteNombre || "________________________"}</div><div class="role">Cliente</div><div style="font-size:8px;color:#888;margin-top:2px">Firma y fecha de aceptación</div></div>`;
    html += `</div>`;

    html += `<div style="margin-top:40px;padding:14px;background:#F5F4F1;border-radius:4px;font-size:9px;color:#666;text-align:center">`;
    html += `Habitaris S.A.S. · NIT 901.922.136-8 · Bogotá D.C., Colombia<br/>`;
    html += `info@habitaris.co · +57 318 381 8736 · www.habitaris.co</div>`;
    html += `</div>`;

    html += `</body></html>`;
    w.document.write(html); w.document.close();
    setTimeout(() => w.print(), 500);
  };

  /* ── WORKFLOW DE APROBACIÓN ── */
  const [wfHistory, setWfHistory] = useState([]);
  const [wfPortals, setWfPortals] = useState([]);
  const [wfLoading, setWfLoading] = useState(true);
  const [wfComment, setWfComment] = useState("");
  const [wfUsuario, setWfUsuario] = useState(d.wf_usuario || "david");

  // Load workflow data
  useEffect(() => {
    (async () => {
      if (!d.id) { setWfLoading(false); return; }
      const [hist, ports] = await Promise.all([
        aprobaciones.getByOferta(d.id),
        portal.getByOferta(d.id),
      ]);
      setWfHistory(hist);
      setWfPortals(ports);
      setWfLoading(false);
    })();
  }, [d.id]);

  // Current workflow state
  const wfEstado = useMemo(() => {
    if (wfHistory.length === 0) return "borrador";
    const last = wfHistory[wfHistory.length - 1];
    if (last.accion === "solicitar") return "pendiente_aprobacion";
    if (last.accion === "aprobar_interno") return "aprobada_internamente";
    if (last.accion === "devolver_interno") return "devuelta_internamente";
    if (last.accion === "enviar") return "enviada";
    if (last.accion === "aprobar_cliente") return "aprobada_cliente";
    if (last.accion === "rechazar_cliente") return "rechazada_cliente";
    if (last.accion === "devolver_cliente") return "devuelta_cliente";
    if (last.accion === "reenviar") return "enviada";
    return "borrador";
  }, [wfHistory]);

  const wfElaborador = USUARIOS_INTERNOS.find(u => u.id === wfUsuario);
  const wfAprobador = (() => {
    if (wfUsuario === "david") return USUARIOS_INTERNOS.find(u => u.id === "ana");
    if (wfUsuario === "ana") return USUARIOS_INTERNOS.find(u => u.id === "david");
    // Si es otro, aprueba el de la firma
    const firmante = d.firmaRepresentante || "David Parra Galera";
    return USUARIOS_INTERNOS.find(u => u.nombre === firmante) || USUARIOS_INTERNOS[0];
  })();

  // Actions
  const wfAction = async (accion, extra = {}) => {
    const entry = await aprobaciones.add({
      ofertaId: d.id,
      tipo: accion.includes("cliente") ? "cliente" : "interna",
      revision,
      accion,
      por: { id: wfUsuario, nombre: wfElaborador?.nombre || wfUsuario, cargo: wfElaborador?.cargo || "" },
      comentarios: wfComment,
      ...extra,
    });
    setWfHistory(prev => [...prev, entry]);
    setWfComment("");

    // Auto-update offer estado
    if (accion === "aprobar_cliente") set("estado", "Ganada");
    if (accion === "rechazar_cliente") set("estado", "Perdida");
    if (accion === "enviar" || accion === "reenviar") set("estado", "Presentada");
    if (accion === "solicitar") set("estado", "En revisión");

    // Notification
    if (accion === "solicitar") {
      await notificaciones.add({ tipo:"aprobacion", ofertaId:d.id, mensaje:`${wfElaborador?.nombre} solicita aprobación de ${refOferta}`, para:wfAprobador?.id });
    }
  };


  const wfEnviarCliente = async () => {
    const portalData = {
      ref: refOferta, titulo, cliente: clienteNombre, proyecto: d.proyecto||"",
      ubicacion: d.ubicacion||"", fecha: fechaDoc, revision,
      pvp: r.PVP, pvpIva: r.PVP_IVA, iva: r.IVA, divisa: d.divisa||"COP",
      alcance: getText("alcance",""), fases: getText("fases",""),
      exclusiones: getText("exclusiones",""), condPago: getText("condPago",""),
      plazo: getText("plazo",""), garantias: getText("garantias",""),
      terminos: getText("terminos",""), notaLegal: getText("notaLegal",""),
      firmante: representante,
      clienteEmail: d.emailCliente||"", telHabitaris: "573183818736",
    };
    const parentToken = d.wf_lastPortalToken || null;
    const p = await createOfferPortal(d.id, portalData, revision, parentToken);
    setWfPortals(prev => [...prev, p]);
    await wfAction("enviar", { portalToken: p.token });
    set("wf_lastPortalUrl", p.portalUrl);
    set("wf_lastPortalToken", p.token);
    return p;
  };
  const WF_ESTADOS = {
    borrador:              { label:"Borrador",               color:"#888",    icon:"📝", desc:"En elaboración" },
    pendiente_aprobacion:  { label:"Pendiente aprobación",   color:"#D4840A", icon:"⏳", desc:`Esperando aprobación de ${wfAprobador?.nombre||"—"}` },
    devuelta_internamente: { label:"Devuelta con cambios",   color:"#B91C1C", icon:"🔄", desc:"Requiere correcciones antes de aprobar" },
    aprobada_internamente: { label:"Aprobada internamente",  color:"#111111", icon:"✅", desc:"Lista para enviar al cliente" },
    enviada:               { label:"Enviada al cliente",     color:"#3B3B3B", icon:"📨", desc:"Esperando respuesta del cliente" },
    aprobada_cliente:      { label:"Aprobada por cliente",   color:"#111111", icon:"🎉", desc:"¡Oferta ganada!" },
    rechazada_cliente:     { label:"Rechazada por cliente",  color:"#B91C1C", icon:"❌", desc:"Cliente rechazó la propuesta" },
    devuelta_cliente:      { label:"Devuelta por cliente",   color:"#D4840A", icon:"💬", desc:"Cliente solicita cambios" },
  };
  const wfInfo = WF_ESTADOS[wfEstado] || WF_ESTADOS.borrador;

  return (
    <div className="fade">

      {/* ═══════════ COVER PAGE (print only) ═══════════ */}
      <div className="p-cover">
        <div style={{ borderBottom:"2pt solid #111", paddingBottom:16, marginBottom:40, width:"100%" }}>
          <div style={{ fontFamily:"'DM Sans',sans-serif", fontWeight:800, fontSize:32, letterSpacing:8, textTransform:"uppercase" }}>HABITARIS</div>
          <div style={{ fontSize:9, letterSpacing:3, color:"#999", textTransform:"uppercase", marginTop:4 }}>Arquitectura · Interiorismo · Construcción</div>
        </div>
        <div style={{ marginTop:60, marginBottom:60 }}>
          <div style={{ fontSize:22, fontWeight:700, letterSpacing:2, textTransform:"uppercase", lineHeight:1.3 }}>{titulo}</div>
          {refOferta && <div style={{ fontSize:13, color:"#666", marginTop:8 }}>{refOferta} · Revisión {revision}</div>}
        </div>
        <div style={{ marginTop:40, fontSize:12, color:"#555", lineHeight:1.8 }}>
          {clienteNombre && <div><strong>Cliente:</strong> {clienteNombre}</div>}
          {d.proyecto && <div><strong>Proyecto:</strong> {d.proyecto}</div>}
          {d.ubicacion && <div><strong>Ubicación:</strong> {d.ubicacion}</div>}
          <div><strong>Fecha:</strong> {fechaDoc}</div>
        </div>
        <div style={{ marginTop:"auto", paddingTop:60, borderTop:"1pt solid #DDD", width:"100%", textAlign:"center" }}>
          <div style={{ fontSize:9, color:"#999", letterSpacing:1 }}>Habitaris S.A.S · NIT 901.922.136-8 · Bogotá D.C.</div>
          <div style={{ fontSize:8, color:"#BBB", marginTop:4 }}>Documento confidencial · Uso exclusivo del destinatario</div>
        </div>
      </div>

      {/* ═══════════ TABLE OF CONTENTS (print only) ═══════════ */}
      <div className="print-only print-page-break" style={{ paddingTop:20 }}>
        <div style={{ fontSize:16, fontWeight:700, letterSpacing:2, textTransform:"uppercase", borderBottom:"2pt solid #111", paddingBottom:6, marginBottom:20 }}>Contenido</div>
        <div style={{ fontSize:11, lineHeight:2.2 }}>
          <div style={{ display:"flex", justifyContent:"space-between", borderBottom:"1px dotted #CCC", padding:"2px 0" }}><span style={{ fontWeight:600 }}>1. Alcance del servicio</span></div>
          {isObra && <div style={{ display:"flex", justifyContent:"space-between", borderBottom:"1px dotted #CCC", padding:"2px 0" }}><span style={{ fontWeight:600 }}>2. Fases del proyecto</span></div>}
          <div style={{ display:"flex", justifyContent:"space-between", borderBottom:"1px dotted #CCC", padding:"2px 0" }}><span style={{ fontWeight:600 }}>{isObra?"3":"2"}. Exclusiones</span></div>
          <div style={{ display:"flex", justifyContent:"space-between", borderBottom:"1px dotted #CCC", padding:"2px 0" }}><span style={{ fontWeight:600 }}>{isObra?"4":"3"}. Presupuesto</span></div>
          <div style={{ display:"flex", justifyContent:"space-between", borderBottom:"1px dotted #CCC", padding:"2px 0" }}><span style={{ fontWeight:600 }}>{isObra?"5":"4"}. Formas de pago</span></div>
          <div style={{ display:"flex", justifyContent:"space-between", borderBottom:"1px dotted #CCC", padding:"2px 0" }}><span style={{ fontWeight:600 }}>{isObra?"6":"5"}. Plazo y garantías</span></div>
          <div style={{ display:"flex", justifyContent:"space-between", borderBottom:"1px dotted #CCC", padding:"2px 0" }}><span style={{ fontWeight:600 }}>{isObra?"7":"6"}. Términos y condiciones</span></div>
          <div style={{ display:"flex", justifyContent:"space-between", borderBottom:"1px dotted #CCC", padding:"2px 0" }}><span style={{ fontWeight:600 }}>{isObra?"8":"7"}. Firma de aceptación</span></div>
        </div>
      </div>

      {/* ═══════════ PRINT HEADER (repeats each section) ═══════════ */}
      {/* We'll insert a header-like div before each section for print */}

      {/* ═══════════ TOOLBAR (no-print) ═══════════ */}
      <Card className="no-print" style={{ padding:0, marginBottom:16, overflow:"hidden" }}>
        {/* Row 1: Service Template Selector */}
        <div style={{ padding:"14px 20px", background:"#F5F4F1", borderBottom:`1px solid ${C.border}` }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
            <div>
              <div style={{ fontSize:9, fontWeight:700, color:"#888", textTransform:"uppercase", letterSpacing:1, marginBottom:4 }}>Plantilla del servicio</div>
              <div style={{ display:"flex", gap:0 }}>
                {[
                  { id:"obra_integral", lbl:"🏗️ Obra integral", tipo:"OBRA" },
                  { id:"obra_parcial",  lbl:"🔨 Obra parcial", tipo:"OBRA" },
                  { id:"diseno_int",    lbl:"🎨 Diseño interior", tipo:"DISEÑO" },
                  { id:"diseno_arq",    lbl:"📐 Diseño arquitectónico", tipo:"DISEÑO" },
                  { id:"consultoria",   lbl:"💼 Consultoría" },
                  { id:"custom",        lbl:"📄 En blanco" },
                ].map((pl,i,arr) => {
                  const active = d.ent_plantilla === pl.id;
                  return (
                    <button key={pl.id} onClick={() => {
                      set("ent_plantilla", pl.id);
                      applyTemplate(pl.id);
                    }}
                      style={{ padding:"7px 14px", fontSize:10, fontWeight:600, cursor:"pointer",
                        border:`1px solid ${active?"#111111":C.border}`, borderLeft:i>0?"none":undefined,
                        fontFamily:"'DM Sans',sans-serif", whiteSpace:"nowrap",
                        borderRadius:i===0?"5px 0 0 5px":i===arr.length-1?"0 5px 5px 0":"0",
                        background:active?"#111111":"#fff",
                        color:active?"#fff":C.ink }}>
                      {pl.lbl}
                    </button>
                  );
                })}
              </div>
            </div>
            <button onClick={printEntregaPreview}
              style={{ padding:"8px 18px", background:"#111", color:"#fff", border:"none", borderRadius:5,
                fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"'DM Sans',sans-serif",
                display:"flex", alignItems:"center", gap:6 }}>
              <FileText size={12}/> Vista previa PDF
            </button>
          </div>
        </div>
        {/* Row 2: Detail level + includes */}
        <div style={{ padding:"12px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
          <div>
            <label style={{ fontSize:9, fontWeight:600, color:"#999", textTransform:"uppercase", letterSpacing:1, display:"block", marginBottom:4 }}>Nivel de detalle presupuesto</label>
            <div style={{ display:"flex", gap:0 }}>
              {[["detallado","Detallado"],["capitulos","Por capítulos"],["total","Total único"]].map(([k,lbl],i)=>(
                <button key={k} onClick={()=>onNivelChange(k)}
                  style={{ padding:"6px 14px", fontSize:11, fontWeight:600, cursor:"pointer",
                    border:`1px solid ${C.border}`, fontFamily:"'DM Sans',sans-serif",
                    borderRadius: k==="detallado"?"5px 0 0 5px":k==="total"?"0 5px 5px 0":"0",
                    borderLeft:i>0?"none":undefined,
                    background:nivelDetalle===k?"#111":"#fff",
                    color:nivelDetalle===k?"#fff":"#555" }}>{lbl}</button>
              ))}
            </div>
          </div>
          <div style={{ display:"flex", gap:16, flexWrap:"wrap", alignItems:"center" }}>
            {[["inclCrono", inclCrono, setInclCrono, "📅 Incluir cronograma"],
              ["inclOrganigrama", inclOrganigrama, setInclOrganigrama, "👥 Incluir organigrama"],
            ].map(([k, val, setter, lbl]) => (
              <label key={k} style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer", fontSize:11,
                padding:"5px 10px", borderRadius:4, background:val?"#E8F4EE":"#F5F4F1",
                border:`1px solid ${val?"#111111":"transparent"}` }}>
                <input type="checkbox" checked={val} onChange={e => onToggle(k, e.target.checked, setter)}
                  style={{ accentColor:"#111111" }} />
                <span style={{ fontWeight:val?600:400, color:val?"#111111":C.inkMid }}>{lbl}</span>
              </label>
            ))}
            <label style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer", fontSize:11,
              padding:"5px 10px", borderRadius:4, background:d.ent_inclCondPago?"#E8F4EE":"#F5F4F1",
              border:`1px solid ${d.ent_inclCondPago?"#111111":"transparent"}` }}>
              <input type="checkbox" checked={d.ent_inclCondPago??true} onChange={e => set("ent_inclCondPago", e.target.checked)}
                style={{ accentColor:"#111111" }} />
              <span style={{ fontWeight:d.ent_inclCondPago?600:400, color:d.ent_inclCondPago?"#111111":C.inkMid }}>💰 Condiciones de pago</span>
            </label>
            <label style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer", fontSize:11,
              padding:"5px 10px", borderRadius:4, background:d.ent_inclGarantias?"#E8F4EE":"#F5F4F1",
              border:`1px solid ${d.ent_inclGarantias?"#111111":"transparent"}` }}>
              <input type="checkbox" checked={d.ent_inclGarantias??true} onChange={e => set("ent_inclGarantias", e.target.checked)}
                style={{ accentColor:"#111111" }} />
              <span style={{ fontWeight:d.ent_inclGarantias?600:400, color:d.ent_inclGarantias?"#111111":C.inkMid }}>🛡️ Garantías</span>
            </label>
          </div>
        </div>
      </Card>

      {/* ═══════════ WORKFLOW DE APROBACIÓN (no-print) ═══════════ */}
      <Card className="no-print" style={{ padding:0, marginBottom:16, overflow:"hidden" }}>
        {/* Status bar */}
        <div style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 20px",
          background: wfInfo.color + "12", borderBottom:`2px solid ${wfInfo.color}33` }}>
          <span style={{ fontSize:22 }}>{wfInfo.icon}</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:700, color:wfInfo.color }}>{wfInfo.label}</div>
            <div style={{ fontSize:10, color:C.inkMid }}>{wfInfo.desc}</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:9, color:C.inkLight, textTransform:"uppercase", letterSpacing:1 }}>Revisión</div>
            <div style={{ fontSize:18, fontWeight:700, color:C.ink }}>{revision}</div>
          </div>
        </div>

        {/* Workflow steps visualization */}
        <div style={{ display:"flex", padding:"12px 20px", gap:0, overflowX:"auto" }}>
          {[
            { key:"borrador", lbl:"Borrador", icon:"📝" },
            { key:"pendiente_aprobacion", lbl:"Revisión interna", icon:"⏳" },
            { key:"aprobada_internamente", lbl:"Aprobada", icon:"✅" },
            { key:"enviada", lbl:"Enviada", icon:"📨" },
            { key:"aprobada_cliente", lbl:"Aceptada", icon:"🎉" },
          ].map((step, i, arr) => {
            const states = ["borrador","pendiente_aprobacion","aprobada_internamente","enviada","aprobada_cliente"];
            const currentIdx = states.indexOf(wfEstado);
            const stepIdx = states.indexOf(step.key);
            const done = stepIdx <= currentIdx;
            const active = step.key === wfEstado || (wfEstado === "devuelta_internamente" && step.key === "pendiente_aprobacion") || (wfEstado === "devuelta_cliente" && step.key === "enviada");
            return (
              <div key={step.key} style={{ display:"flex", alignItems:"center" }}>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", minWidth:70 }}>
                  <div style={{ width:28, height:28, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center",
                    background: done ? "#111111" : active ? "#D4840A" : "#E0E0E0",
                    fontSize:13, transition:"all .2s" }}>
                    {done ? <span style={{ color:"#fff", fontSize:11 }}>✓</span> : <span>{step.icon}</span>}
                  </div>
                  <span style={{ fontSize:8, fontWeight:600, color: done ? "#111111" : active ? "#D4840A" : "#999",
                    marginTop:3, textAlign:"center", lineHeight:1.2 }}>{step.lbl}</span>
                </div>
                {i < arr.length - 1 && (
                  <div style={{ width:30, height:2, background: stepIdx < currentIdx ? "#111111" : "#E0E0E0", margin:"0 2px", marginBottom:14 }}/>
                )}
              </div>
            );
          })}
        </div>

        {/* Actions panel */}
        <div style={{ padding:"12px 20px 16px", borderTop:`1px solid ${C.border}` }}>
          {/* User selector */}
          <div style={{ display:"flex", gap:10, marginBottom:10, alignItems:"center" }}>
            <span style={{ fontSize:9, fontWeight:600, color:C.inkLight, textTransform:"uppercase", letterSpacing:1 }}>Trabajando como:</span>
            {USUARIOS_INTERNOS.map(u => (
              <button key={u.id} onClick={() => { setWfUsuario(u.id); set("wf_usuario", u.id); }}
                style={{ padding:"4px 10px", fontSize:10, fontWeight:600, cursor:"pointer",
                  border:`1px solid ${wfUsuario===u.id ? "#111111" : C.border}`, borderRadius:4,
                  background: wfUsuario===u.id ? "#E8F4EE" : "#fff",
                  color: wfUsuario===u.id ? "#111111" : C.inkMid,
                  fontFamily:"'DM Sans',sans-serif" }}>
                {u.id === "david" ? "👤" : "👩"} {u.nombre.split(" ")[0]}
              </button>
            ))}
          </div>

          {/* Comment field */}
          {["pendiente_aprobacion","devuelta_internamente","devuelta_cliente"].includes(wfEstado) && (
            <div style={{ marginBottom:10 }}>
              <input value={wfComment} onChange={e => setWfComment(e.target.value)}
                placeholder={wfEstado === "pendiente_aprobacion" ? "Observaciones de aprobación (opcional)..." : "Comentarios sobre los cambios realizados..."}
                style={{ width:"100%", padding:"8px 12px", border:`1px solid ${C.border}`, borderRadius:4,
                  fontSize:12, fontFamily:"'DM Sans',sans-serif", background:"#fff" }}/>
            </div>
          )}

          {/* Action buttons per state */}
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {wfEstado === "borrador" && (
              <button onClick={() => wfAction("solicitar")}
                style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px",
                  background:"#D4840A", color:"#fff", border:"none", borderRadius:5,
                  cursor:"pointer", fontSize:12, fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>
                <Send size={13}/> Solicitar aprobación a {wfAprobador?.nombre?.split(" ")[0]}
              </button>
            )}
            {wfEstado === "pendiente_aprobacion" && wfUsuario === wfAprobador?.id && (<>
              <button onClick={() => wfAction("aprobar_interno")}
                style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px",
                  background:"#111111", color:"#fff", border:"none", borderRadius:5,
                  cursor:"pointer", fontSize:12, fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>
                <Check size={13}/> Aprobar
              </button>
              <button onClick={() => { if(!wfComment) { alert("Escribe las observaciones"); return; } wfAction("devolver_interno"); }}
                style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px",
                  background:"#FFF8E7", color:"#D4840A", border:"1px solid #D4840A33", borderRadius:5,
                  cursor:"pointer", fontSize:12, fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>
                <RotateCcw size={13}/> Devolver con observaciones
              </button>
            </>)}
            {wfEstado === "pendiente_aprobacion" && wfUsuario !== wfAprobador?.id && (
              <div style={{ fontSize:11, color:"#D4840A", padding:"8px 0" }}>
                ⏳ Esperando que <strong>{wfAprobador?.nombre}</strong> apruebe. Cambia a su usuario para simular la aprobación.
              </div>
            )}
            {wfEstado === "devuelta_internamente" && (
              <button onClick={() => wfAction("solicitar")}
                style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px",
                  background:"#D4840A", color:"#fff", border:"none", borderRadius:5,
                  cursor:"pointer", fontSize:12, fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>
                <Send size={13}/> Re-solicitar aprobación
              </button>
            )}
            {wfEstado === "aprobada_internamente" && (<>
              <button onClick={async () => {
                const p = await wfEnviarCliente();
                navigator.clipboard?.writeText(p.portalUrl);
                alert(`✅ Portal creado y URL copiada.\n\nEnvía este link al cliente:\n${p.portalUrl}`);
              }}
                style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px",
                  background:"#3B3B3B", color:"#fff", border:"none", borderRadius:5,
                  cursor:"pointer", fontSize:12, fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>
                <Send size={13}/> Enviar al cliente (crear portal)
              </button>
              <button onClick={downloadPDF}
                style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px",
                  background:"#111", color:"#fff", border:"none", borderRadius:5,
                  cursor:"pointer", fontSize:12, fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>
                <Download size={13}/> Descargar PDF
              </button>
            </>)}
            {wfEstado === "enviada" && (
              <div style={{ fontSize:11, color:"#3B3B3B", padding:"8px 0" }}>
                📨 Esperando respuesta del cliente. Portal activo.
                {d.wf_lastPortalUrl && (
                  <button onClick={() => navigator.clipboard?.writeText(d.wf_lastPortalUrl).then(() => alert("✅ URL copiada"))}
                    style={{ marginLeft:8, background:"#F0F0F0", border:"1px solid #3B3B3B33", borderRadius:3,
                      padding:"3px 8px", fontSize:10, cursor:"pointer", color:"#3B3B3B", fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>
                    📋 Copiar URL portal
                  </button>
                )}
              </div>
            )}
            {wfEstado === "devuelta_cliente" && (<>
              <button onClick={() => { set("revision", revision + 1); wfAction("solicitar"); }}
                style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px",
                  background:"#D4840A", color:"#fff", border:"none", borderRadius:5,
                  cursor:"pointer", fontSize:12, fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>
                <RotateCcw size={13}/> Crear Rev.{revision+1} y solicitar aprobación
              </button>
            </>)}
            {wfEstado === "aprobada_cliente" && (
              <div style={{ fontSize:12, color:"#111111", padding:"8px 0", fontWeight:600 }}>
                🎉 ¡Oferta ganada! El cliente aceptó la propuesta.
              </div>
            )}
            {wfEstado === "rechazada_cliente" && (
              <div style={{ fontSize:12, color:"#B91C1C", padding:"8px 0" }}>
                ❌ El cliente rechazó la propuesta. {wfHistory.filter(h=>h.accion==="rechazar_cliente").slice(-1)[0]?.comentarios && (
                  <span style={{ fontStyle:"italic" }}>Motivo: "{wfHistory.filter(h=>h.accion==="rechazar_cliente").slice(-1)[0]?.comentarios}"</span>
                )}
              </div>
            )}

            {/* Always show PDF download */}
            {!["aprobada_internamente"].includes(wfEstado) && (
              <button onClick={downloadPDF}
                style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px",
                  background:"transparent", color:C.inkMid, border:`1px solid ${C.border}`, borderRadius:5,
                  cursor:"pointer", fontSize:11, fontWeight:500, fontFamily:"'DM Sans',sans-serif" }}>
                <Download size={12}/> PDF
              </button>
            )}
          </div>
        </div>

        {/* History timeline */}
        {wfHistory.length > 0 && (
          <div style={{ padding:"0 20px 14px", borderTop:`1px solid ${C.border}`, marginTop:0 }}>
            <details>
              <summary style={{ fontSize:10, fontWeight:600, color:C.inkLight, cursor:"pointer", padding:"10px 0 4px",
                textTransform:"uppercase", letterSpacing:1 }}>
                Historial ({wfHistory.length} acciones)
              </summary>
              <div style={{ maxHeight:200, overflowY:"auto" }}>
                {wfHistory.slice().reverse().map((h, i) => {
                  const ACCION_LBL = {
                    solicitar:"Solicitó aprobación", aprobar_interno:"Aprobó internamente",
                    devolver_interno:"Devolvió con observaciones", enviar:"Envió al cliente",
                    reenviar:"Re-envió al cliente", aprobar_cliente:"Cliente aprobó",
                    rechazar_cliente:"Cliente rechazó", devolver_cliente:"Cliente devolvió"
                  };
                  return (
                    <div key={h.id||i} style={{ display:"flex", gap:8, padding:"5px 0", borderBottom:`1px solid #F5F5F5`, fontSize:10 }}>
                      <div style={{ minWidth:100, color:C.inkLight }}>{new Date(h.fecha).toLocaleString("es-CO",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}</div>
                      <div style={{ flex:1 }}>
                        <span style={{ fontWeight:600 }}>{h.por?.nombre?.split(" ")[0] || "—"}</span>
                        <span style={{ color:C.inkMid }}> · {ACCION_LBL[h.accion] || h.accion}</span>
                        {h.comentarios && <div style={{ color:"#D4840A", fontStyle:"italic", marginTop:2 }}>💬 {h.comentarios}</div>}
                      </div>
                      <div style={{ fontSize:9, color:C.inkLight }}>Rev.{h.revision}</div>
                    </div>
                  );
                })}
              </div>
            </details>
          </div>
        )}

        {/* Portal history */}
        {wfPortals.length > 0 && (
          <div style={{ padding:"0 20px 14px", borderTop:`1px solid ${C.border}` }}>
            <details>
              <summary style={{ fontSize:10, fontWeight:600, color:C.inkLight, cursor:"pointer", padding:"10px 0 4px",
                textTransform:"uppercase", letterSpacing:1 }}>
                Portales cliente ({wfPortals.length})
              </summary>
              {wfPortals.map((p, i) => (
                <div key={p.token||i} style={{ display:"flex", gap:8, padding:"5px 0", borderBottom:`1px solid #F5F5F5`, fontSize:10, alignItems:"center" }}>
                  <span style={{ fontSize:14 }}>{p.estado==="aprobada"?"✅":p.estado==="rechazada"?"❌":p.estado==="devuelta"?"🔄":"📨"}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600 }}>Rev.{p.revision} · {new Date(p.fechaCreacion).toLocaleDateString("es-CO")}</div>
                    <div style={{ color:C.inkLight }}>{p.clienteEmail || p.clienteNombre}</div>
                  </div>
                  <span style={{ fontSize:9, fontWeight:600, padding:"2px 6px", borderRadius:3,
                    color: p.estado==="pendiente"?"#3B3B3B":p.estado==="aprobada"?"#111111":"#B91C1C",
                    background: p.estado==="pendiente"?"#F0F0F0":p.estado==="aprobada"?"#E8F4EE":"#FAE8E8" }}>
                    {p.estado}
                  </span>
                </div>
              ))}
            </details>
          </div>
        )}
      </Card>

      {/* ═══════════ PRINT SECTION HEADER ═══════════ */}
      <div className="p-hdr print-page-break">
        <div>
          <div style={{ fontWeight:700, fontSize:13, letterSpacing:4 }}>HABITARIS</div>
          <div style={{ fontSize:7, letterSpacing:2, color:"#999", textTransform:"uppercase" }}>Arquitectura · Interiorismo · Construcción</div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:10, fontWeight:700 }}>{titulo}</div>
          <div style={{ fontSize:8, color:"#666" }}>{refOferta} · {fechaDoc}</div>
        </div>
      </div>

      {/* ═══════════ PORTADA (screen only) ═══════════ */}
      <div className="no-print" style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:16, marginBottom:16 }}>
        <Card style={{ padding:22 }}>
          <STitle t="Portada" s="Datos visibles en la portada del documento" />
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginTop:12 }}>
            <div>{label("Tipo de documento")}{inp("titulo", isObra ? "PRESUPUESTO DE EJECUCIÓN" : "PROPUESTA DE DISEÑO")}</div>
            <div>{label("N° Oferta")}{inp("ref", d.codigoOferta || "")}</div>
            <div>{label("Cliente")}{inp("cliente", d.cliente || "")}</div>
            <div>{label("Fecha")}{inp("fecha", d.fechaOferta || today())}</div>
          </div>
        </Card>
        <Card style={{ padding:22, background:C.ink, color:"#fff", position:"relative" }}>
          <div style={{ position:"absolute", top:8, right:10, background:"rgba(255,255,255,0.15)", padding:"2px 8px", borderRadius:3, fontSize:8, fontWeight:600, color:"rgba(255,255,255,0.5)", textTransform:"uppercase", letterSpacing:0.8 }}>Solo uso interno</div>
          <p style={{ fontSize:9, letterSpacing:1.5, textTransform:"uppercase", color:"rgba(255,255,255,0.4)", margin:"0 0 6px" }}>PVP Total</p>
          <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:32, fontWeight:700, color:"#fff", margin:"0 0 4px", letterSpacing:-1 }}>{fmt(r.PVP_IVA)}</p>
          <p style={{ fontSize:10, color:"rgba(255,255,255,0.4)", margin:"0 0 16px" }}>{isObra ? "IVA sobre utilidad" : "IVA incluido"} · {d.divisa||"COP"}</p>
          <div style={{ borderTop:"1px solid rgba(255,255,255,0.15)", paddingTop:12 }}>
            {[["PVP sin IVA", fmt(r.PVP)],
              [isObra ? `IVA (${pct(d.tarifaIVA)} × U ${pct(r.U)})` : `IVA ${pct(d.tarifaIVA)}`, fmt(r.IVA)],
              ...(r.ret > 0 ? [["Retenciones (flujo)", "-"+fmt(r.ret)]] : []),
            ].map(([l,v])=>(
              <div key={l} style={{ display:"flex", justifyContent:"space-between", fontSize:11, marginBottom:4 }}>
                <span style={{ color:"rgba(255,255,255,0.5)" }}>{l}</span>
                <span style={{ fontFamily:"'DM Mono',monospace", color:"rgba(255,255,255,0.8)" }}>{v}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ═══════════ ALCANCE ═══════════ */}
      <div className="print-section" style={{ marginBottom:16 }}>
        <Card style={{ padding:22 }}>
          <STitle t="Alcance del servicio" s="" />
          {d.alcanceTexto && (
            <div className="no-print" style={{ background:"#E8F4EE", borderRadius:4, padding:"8px 12px", fontSize:10, color:"#111111", marginTop:6, marginBottom:6, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span>📋 Hay un alcance configurado en la pestaña General</span>
              <button onClick={()=>set("ent_alcance", d.alcanceTexto)}
                style={{ background:"#111111", color:"#fff", border:"none", borderRadius:3, padding:"3px 10px", fontSize:10, fontWeight:600, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                Usar plantilla
              </button>
            </div>
          )}
          <div style={{ marginTop:10 }}>
            {plabel("Descripción del alcance")}
            {ta("alcance", d.alcanceTexto || (isObra
              ? `El presente alcance comprende la ejecución integral del proyecto de diseño previamente aprobado, incluyendo construcción, suministro de materiales, acabados e interventoría, garantizando coherencia entre diseño, presupuesto y resultado final.`
              : `Diseño y desarrollo integral del proyecto ${d.proyecto||""} ubicado en ${d.ubicacion||""}. Incluye levantamiento, conceptualización, desarrollo de planos técnicos y acompañamiento en la ejecución.`), 5)}
          </div>
          {isObra && (
            <div style={{ marginTop:14 }}>
              {plabel("Fases del proyecto")}
              {ta("fases", "- Firma de contrato\n- Recepción de anticipo\n- Aprobación de planos técnicos\n- Aprobación de acabados\n- Validación formal de materiales y especificaciones\n- Firma de acta de inicio de obra\n- Inicio de obra\n- Recepción de obra\n- Firma de acta final", 6)}
            </div>
          )}
          <div style={{ marginTop:14 }}>
            {plabel("Exclusiones")}
            {ta("exclusiones", isObra
              ? "Esta propuesta no incluye, salvo que se acuerde por escrito, ejecuciones adicionales a las contempladas en los diseños aprobados.\n\n- Licencias y permisos de construcción\n- Obra civil de estructura y cimentación no contemplada en diseños\n- Suministro e instalación de electrodomésticos\n- Gestión de condominio o administración\n- Mudanzas y trasteos\n- Diseño o rediseño arquitectónico (ya aprobado previamente)\n\nTodos los entregables se comparten exclusivamente en formato digital."
              : "Esta propuesta no incluye, salvo que se acuerde por escrito:\n\n- Licencias y permisos de construcción\n- Obra civil de estructura y cimentación\n- Suministro e instalación de electrodomésticos\n- Gestión de condominio o administración\n- Ejecución de obra o interventoría\n- Renders 3D fotorrealistas (se cotizan aparte)\n\nTodos los entregables se comparten exclusivamente en formato digital.", 6)}
          </div>
        </Card>
      </div>

      {/* ═══════════ PRESUPUESTO ═══════════ */}
      <div className="print-page-break print-section">
        {/* Print header repeat */}
        <div className="p-hdr">
          <div><div style={{ fontWeight:700, fontSize:13, letterSpacing:4 }}>HABITARIS</div></div>
          <div style={{ textAlign:"right" }}><div style={{ fontSize:10, fontWeight:700 }}>{titulo}</div><div style={{ fontSize:8, color:"#666" }}>{refOferta} · {fechaDoc}</div></div>
        </div>
        <Card style={{ padding:0, overflow:"hidden", marginBottom:16 }}>
          <div style={{ padding:"14px 20px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <STitle t="Presupuesto" s={`Vista: ${nivelDetalle==="detallado"?"Detallado":nivelDetalle==="capitulos"?"Por capítulos":"Total único"}`} />
          </div>
          {nivelDetalle === "total" ? (
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead><tr style={{ background:"#FFFFFF" }}>
                {["Item","Descripción","Total"].map(h=>(
                  <th key={h} style={{ padding:"9px 14px", textAlign:h==="Total"?"right":"left",
                    fontSize:9, fontWeight:600, color:C.inkLight, textTransform:"uppercase", letterSpacing:0.8 }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                <tr style={{ borderTop:`1px solid ${C.border}` }}>
                  <td style={{ padding:"10px 14px" }}>1</td>
                  <td style={{ padding:"10px 14px" }}>{getText("descTotal", isObra
                    ? `Reforma integral de espacios según diseño, incluye obras civiles, carpinterías y acabados según diseño aprobado.`
                    : `Diseño integral — ${d.proyecto||"proyecto"}`)}</td>
                  <td style={{ padding:"10px 14px", textAlign:"right", fontFamily:"'DM Mono',monospace", fontWeight:700 }}>{fmt(r.PVP)}</td>
                </tr>
                <tr style={{ background:"#F5F4F1" }}>
                  <td colSpan={2} style={{ padding:"8px 14px", fontSize:11, color:C.inkMid }}>{isObra ? `IVA sobre la utilidad` : `IVA ${pct(d.tarifaIVA)}`}</td>
                  <td style={{ padding:"8px 14px", textAlign:"right", fontFamily:"'DM Mono',monospace" }}>{fmt(r.IVA)}</td>
                </tr>
                <tr style={{ background:C.ink }}>
                  <td colSpan={2} style={{ padding:"12px 14px", fontWeight:700, color:"#fff", fontSize:14 }}>Valor total</td>
                  <td style={{ padding:"12px 14px", textAlign:"right", fontFamily:"'DM Mono',monospace", fontWeight:700, fontSize:16, color:"#fff" }}>{fmt(r.PVP_IVA)}</td>
                </tr>
              </tbody>
            </table>
          ) : nivelDetalle === "capitulos" ? (
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead><tr style={{ background:"#FFFFFF" }}>
                {["Item","Descripción","Total"].map(h=>(
                  <th key={h} style={{ padding:"9px 14px", textAlign:h==="Total"?"right":"left",
                    fontSize:9, fontWeight:600, color:C.inkLight, textTransform:"uppercase", letterSpacing:0.8 }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {capTotals.map((cap, i) => (
                  <tr key={cap.id} style={{ borderTop:`1px solid ${C.border}` }}>
                    <td style={{ padding:"10px 14px" }}>{i+1}</td>
                    <td style={{ padding:"10px 14px", fontWeight:600 }}>{cap.nombre||"Capítulo "+(i+1)}</td>
                    <td style={{ padding:"10px 14px", textAlign:"right", fontFamily:"'DM Mono',monospace", fontWeight:600 }}>{fmt(cap.total)}</td>
                  </tr>
                ))}
                <tr style={{ borderTop:`2px solid ${C.ink}`, background:"#F5F4F1" }}>
                  <td colSpan={2} style={{ padding:"10px 14px", fontWeight:700 }}>Subtotal</td>
                  <td style={{ padding:"10px 14px", textAlign:"right", fontFamily:"'DM Mono',monospace", fontWeight:700 }}>{fmt(r.PVP)}</td>
                </tr>
                <tr style={{ background:"#F5F4F1" }}>
                  <td colSpan={2} style={{ padding:"6px 14px", fontSize:11, color:C.inkMid }}>{isObra ? `IVA sobre la utilidad` : `IVA ${pct(d.tarifaIVA)}`}</td>
                  <td style={{ padding:"6px 14px", textAlign:"right", fontFamily:"'DM Mono',monospace" }}>{fmt(r.IVA)}</td>
                </tr>
                <tr style={{ background:C.ink }}>
                  <td colSpan={2} style={{ padding:"12px 14px", fontWeight:700, color:"#fff", fontSize:14 }}>Valor total</td>
                  <td style={{ padding:"12px 14px", textAlign:"right", fontFamily:"'DM Mono',monospace", fontWeight:700, fontSize:16, color:"#fff" }}>{fmt(r.PVP_IVA)}</td>
                </tr>
              </tbody>
            </table>
          ) : (
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead><tr style={{ background:"#FFFFFF" }}>
                {["Ref.","Descripción","Und","Cant.","PU","Total"].map(h=>(
                  <th key={h} style={{ padding:"9px 14px", textAlign:h==="Total"||h==="PU"?"right":"left",
                    fontSize:9, fontWeight:600, color:C.inkLight, textTransform:"uppercase", letterSpacing:0.8 }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {borLineas.map((l, i) => {
                  if (l.esCapitulo) return (
                    <tr key={l.id} style={{ background:C.accentBg, borderTop:`2px solid ${C.border}` }}>
                      <td colSpan={6} style={{ padding:"8px 14px", fontWeight:700, fontSize:12, color:C.ink, textTransform:"uppercase" }}>{l.nombre || l.tipo}</td>
                    </tr>
                  );
                  const venta = l.precioCD ? calcPUVentaLinea(l.precioCD, l.cantidad||1, d) : null;
                  return (
                    <tr key={l.id} style={{ borderTop:`1px solid ${C.border}` }}>
                      <td style={{ padding:"8px 14px", color:C.inkLight, fontSize:11 }}>{l.codigo||String(i+1).padStart(2,"0")}</td>
                      <td style={{ padding:"8px 14px" }}>{l.descripcion||"—"}</td>
                      <td style={{ padding:"8px 14px", color:C.inkMid }}>{l.unidad||"Gl"}</td>
                      <td style={{ padding:"8px 14px", color:C.inkMid, textAlign:"right" }}>{l.cantidad||1}</td>
                      <td style={{ padding:"8px 14px", textAlign:"right", fontFamily:"'DM Mono',monospace" }}>{venta ? fmt(venta.puVenta) : "—"}</td>
                      <td style={{ padding:"8px 14px", textAlign:"right", fontFamily:"'DM Mono',monospace", fontWeight:600 }}>{venta ? fmt(venta.totalVenta) : "—"}</td>
                    </tr>
                  );
                })}
                <tr style={{ borderTop:`2px solid ${C.ink}`, background:"#F5F4F1" }}>
                  <td colSpan={5} style={{ padding:"10px 14px", fontWeight:700 }}>Subtotal</td>
                  <td style={{ padding:"10px 14px", textAlign:"right", fontFamily:"'DM Mono',monospace", fontWeight:700 }}>{fmt(r.PVP)}</td>
                </tr>
                <tr style={{ background:"#F5F4F1" }}>
                  <td colSpan={5} style={{ padding:"6px 14px", fontSize:11, color:C.inkMid }}>{isObra ? `IVA sobre la utilidad` : `IVA ${pct(d.tarifaIVA)}`}</td>
                  <td style={{ padding:"6px 14px", textAlign:"right", fontFamily:"'DM Mono',monospace" }}>{fmt(r.IVA)}</td>
                </tr>
                <tr style={{ background:C.ink }}>
                  <td colSpan={5} style={{ padding:"12px 14px", fontWeight:700, color:"#fff", fontSize:14 }}>Valor total</td>
                  <td style={{ padding:"12px 14px", textAlign:"right", fontFamily:"'DM Mono',monospace", fontWeight:700, fontSize:16, color:"#fff" }}>{fmt(r.PVP_IVA)}</td>
                </tr>
              </tbody>
            </table>
          )}
        </Card>
      </div>

      {/* ═══════════ CONDICIONES + PLAZO ═══════════ */}
      <div className="print-page-break print-section" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
        <Card style={{ padding:22 }}>
          <STitle t="Formas de pago" s="" />
          <div style={{ marginTop:10 }}>
            {ta("condPago", [
              `${Math.round((d.condPct1??0.30)*100)}% de anticipo`,
              `${Math.round((d.condPct2??0.30)*100)}% a la mitad de ejecución del proyecto`,
              ...(condPct4 > 0 ? [`${Math.round((d.condPct3??0.30)*100)}% a la entrega / acta de recepción`, `${Math.round(condPct4*100)}% retención a 30 días`] : [`${Math.round((d.condPct3??0.30)*100)}% al acta de recepción`]),
            ].join("\n"), 5)}
          </div>
          <div style={{ marginTop:10 }}>
            {plabel("Medios de pago")}
            {inp("medioPago", d.medioPago==="PSE" ? "Link PSE" : d.medioPago==="Tarjeta" ? "Pago con tarjeta (pasarela online)" : "Transferencia bancaria")}
          </div>
        </Card>
        <Card style={{ padding:22 }}>
          <STitle t="Plazo y garantías" s="" />
          <div style={{ marginTop:10 }}>
            {plabel("Plazo de ejecución")}
            {inp("plazo", getText("duracion", "__ semanas desde la firma de acta de inicio"))}
            <div style={{ marginTop:10 }}>
              {plabel("Garantías")}
              {ta("garantias", "- Garantía de obra: 1 año sobre defectos de ejecución\n- Garantía de materiales: según fabricante\n- Póliza todo riesgo durante la ejecución", 4)}
            </div>
          </div>
        </Card>
      </div>

      {/* ═══════════ TÉRMINOS ═══════════ */}
      <div className="print-section" style={{ marginBottom:16 }}>
        <Card style={{ padding:22 }}>
          <STitle t="Términos y condiciones" s="" />
          <div style={{ marginTop:10 }}>
            {ta("terminos",
              "- Vigencia: La propuesta tiene una validez de 20 días calendario desde la fecha de envío.\n" +
              "- Moneda: Pesos colombianos (COP).\n" +
              "- Aprobación: Se considera aceptada al recibir confirmación escrita y el pago del anticipo.\n" +
              "- Formalización: La relación contractual se considerará establecida mediante la firma de un contrato u orden de servicio que incorpore esta propuesta.\n" +
              "- Pago inicial: El inicio de los trabajos estará condicionado al cumplimiento de todas las condiciones de inicio.\n" +
              "- Reajustes: Los plazos y valores podrán ser modificados en función de nuevos requerimientos o cambios en el alcance original.", 8)}
          </div>
          <div style={{ marginTop:14 }}>
            {plabel("Nota legal")}
            {ta("notaLegal",
              "Esta propuesta tiene carácter informativo y comercial. No constituye, por sí sola, un contrato. La relación contractual entre las partes solo se considerará establecida mediante la firma de un contrato, orden de servicio u otro documento que incorpore esta propuesta como anexo o referencia.\n\n" +
              "La información contenida en esta propuesta es confidencial y de uso exclusivo del cliente. No podrá ser reproducida, compartida ni utilizada con fines comerciales o de ejecución por terceros sin autorización previa y por escrito de Habitaris S.A.S.", 5)}
          </div>
        </Card>
      </div>

      {/* ═══════════ FIRMA ═══════════ */}
      <div className="print-page-break print-section" style={{ marginBottom:16 }}>
        {/* Print header */}
        <div className="p-hdr">
          <div><div style={{ fontWeight:700, fontSize:13, letterSpacing:4 }}>HABITARIS</div></div>
          <div style={{ textAlign:"right" }}><div style={{ fontSize:10, fontWeight:700 }}>{titulo}</div><div style={{ fontSize:8, color:"#666" }}>{refOferta} · {fechaDoc}</div></div>
        </div>
        <Card style={{ padding:22 }}>
          <STitle t="Firma de aceptación" s="" />
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginTop:14 }}>
            <div>
              {plabel("Representante Habitaris")}
              <div style={{ border:`1px solid ${C.border}`, borderRadius:4, padding:"10px 12px", background:"#F5F4F1" }}>
                <div style={{ fontWeight:700, fontSize:13 }}>{representante}</div>
                <div style={{ fontSize:11, color:C.inkMid }}>{cargo}</div>
                <div style={{ fontSize:10, color:C.inkLight, marginTop:4 }}>Habitaris S.A.S · NIT 901.922.136-8</div>
              </div>
              {getText("elaboradoPor","") && (
                <div style={{ marginTop:8 }}>
                  {plabel("Elaborado por")}
                  <div style={{ fontSize:12 }}>{getText("elaboradoPor","")}</div>
                  {getText("elaboradoPorCargo","") && <div style={{ fontSize:11, color:C.inkMid }}>{getText("elaboradoPorCargo","")}</div>}
                </div>
              )}
              <div className="no-print" style={{ marginTop:8 }}>
                {label("Elaborado por (opcional)")}
                {inp("elaboradoPor", "")}
                {getText("elaboradoPor","") && (<>
                  {label("Cargo")}
                  {inp("elaboradoPorCargo", "")}
                </>)}
              </div>
            </div>
            <div>
              {plabel("Firma del cliente")}
              <div className="no-print">{inp("firmaC", d.cliente || "")}</div>
              <div className="print-only" style={{ fontSize:12, marginTop:4 }}>{getText("firmaC", d.cliente || "")}</div>
              <div style={{ borderBottom:"1px solid #999", marginTop:60, width:"80%" }}/>
              <div style={{ fontSize:9, color:C.inkLight, marginTop:4 }}>Firma y sello de aceptación</div>
              <div style={{ borderBottom:"1px solid #999", marginTop:30, width:"80%" }}/>
              <div style={{ fontSize:9, color:C.inkLight, marginTop:4 }}>Fecha</div>
            </div>
          </div>
        </Card>
      </div>

      {/* ═══════════ COMPARTIR (no-print) ═══════════ */}
      <Card className="no-print" style={{ padding:16, background:"#F5F5F5" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
          <span style={{ fontSize:10, fontWeight:600, color:C.inkLight, textTransform:"uppercase", letterSpacing:1 }}>Compartir manualmente</span>
          <div style={{ display:"flex", gap:6 }}>
            <button onClick={() => {
              const email = d.emailCliente || prompt("Email del cliente:");
              if (email) {
                const subject = encodeURIComponent(`${titulo} — ${d.proyecto||"Habitaris"}`);
                const body = encodeURIComponent(`Estimado/a ${clienteNombre},\n\nAdjuntamos la propuesta para ${d.proyecto||"el proyecto"} por un valor de ${fmt(r.PVP_IVA)} (IVA incluido).\n\nQuedamos atentos a sus comentarios.\n\nCordialmente,\n${representante}\n${cargo}\nHabitaris S.A.S`);
                window.open(`mailto:${email}?subject=${subject}&body=${body}`);
              }
            }}
              style={{ display:"flex", alignItems:"center", gap:4, padding:"6px 12px",
                background:"#3B3B3B", color:"#fff", border:"none", borderRadius:4,
                cursor:"pointer", fontSize:10, fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>
              <Mail size={11}/> Email
            </button>
            <button onClick={() => {
              const tel = d.telCliente || prompt("Teléfono (con código de país):");
              if (tel) { const num = tel.replace(/[^0-9]/g,""); window.open(`https://wa.me/${num}?text=${encodeURIComponent(`Hola ${clienteNombre}, le envío la propuesta de ${d.proyecto||"Habitaris"} por ${fmt(r.PVP_IVA)} (IVA incluido). — ${representante}, Habitaris`)}`); }
            }}
              style={{ display:"flex", alignItems:"center", gap:4, padding:"6px 12px",
                background:"#25D366", color:"#fff", border:"none", borderRadius:4,
                cursor:"pointer", fontSize:10, fontWeight:600, fontFamily:"'DM Sans',sans-serif" }}>
              <MessageCircle size={11}/> WhatsApp
            </button>
            <button onClick={() => { navigator.clipboard?.writeText(`${titulo} — ${refOferta} — ${clienteNombre} — PVP: ${fmt(r.PVP_IVA)}`); alert("✅ Copiado"); }}
              style={{ display:"flex", alignItems:"center", gap:4, padding:"6px 12px",
                background:"transparent", color:"#555", border:`1px solid ${C.border}`, borderRadius:4,
                cursor:"pointer", fontSize:10, fontWeight:500, fontFamily:"'DM Sans',sans-serif" }}>
              <Copy size={11}/> Copiar
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}


/* ─── ENCUESTAS ISO 9001 ─────────────────────────────────────── */
const PREGUNTAS_SATISFACCION = [
  { id:"q1", texto:"¿Cómo califica la calidad del diseño entregado?", tipo:"estrellas" },
  { id:"q2", texto:"¿Se cumplieron los plazos pactados?", tipo:"estrellas" },
  { id:"q3", texto:"¿La comunicación con el equipo fue adecuada?", tipo:"estrellas" },
  { id:"q4", texto:"¿El presupuesto final se ajustó al acordado?", tipo:"estrellas" },
  { id:"q5", texto:"¿Recomendaría nuestros servicios? (NPS)", tipo:"nps" },
  { id:"q6", texto:"¿Qué podríamos mejorar?", tipo:"texto" },
  { id:"q7", texto:"Comentarios adicionales", tipo:"texto" },
];

const PREGUNTAS_PROVEEDOR = [
  { id:"p1", texto:"Calidad del material / servicio entregado", tipo:"estrellas" },
  { id:"p2", texto:"Cumplimiento de plazos de entrega", tipo:"estrellas" },
  { id:"p3", texto:"Relación calidad/precio", tipo:"estrellas" },
  { id:"p4", texto:"Facilidad de comunicación", tipo:"estrellas" },
  { id:"p5", texto:"¿Volvería a contratar este proveedor?", tipo:"sino" },
  { id:"p6", texto:"Observaciones", tipo:"texto" },
];

function TabEncuestas({ offers }) {
  const SKEY_SAT = "hab:crm:encuestas:satisfaccion";
  const SKEY_PRV = "hab:crm:encuestas:proveedores";
  const [encSat, setEncSat] = useState([]);
  const [encPrv, setEncPrv] = useState([]);
  const [vista, setVista] = useState("satisfaccion");
  const [formSat, setFormSat] = useState(null);
  const [formPrv, setFormPrv] = useState(null);

  useEffect(() => {
    (() => {
      try { const r = store.getSync(SKEY_SAT); if(r) setEncSat(JSON.parse(r)||[]); } catch{}
      try { const r = store.getSync(SKEY_PRV); if(r) setEncPrv(JSON.parse(r)||[]); } catch{}
    })();
  }, []);
  const saveSat = (list) => { setEncSat(list); try{ store.set(SKEY_SAT, JSON.stringify(list)); }catch{} };
  const savePrv = (list) => { setEncPrv(list); try{ store.set(SKEY_PRV, JSON.stringify(list)); }catch{} };

  const ofertasGanadas = offers.filter(o => o.estado === "Ganada");
  const uid2 = () => Math.random().toString(36).slice(2,9);

  const nuevaEncSat = (oferta) => ({
    id: uid2(), ofertaId: oferta?.id||"", proyecto: oferta?.proyecto||"",
    cliente: oferta?.cliente||"", fecha: new Date().toISOString().slice(0,10),
    respuestas: {}, estado: "pendiente",
  });
  const nuevaEncPrv = () => ({
    id: uid2(), proveedor: "", proyecto: "", fecha: new Date().toISOString().slice(0,10),
    respuestas: {}, estado: "pendiente",
  });

  const StarRating = ({ value, onChange }) => (
    <div style={{ display:"flex", gap:2 }}>
      {[1,2,3,4,5].map(n => (
        <button key={n} onClick={()=>onChange(n)}
          style={{ fontSize:22, background:"none", border:"none", cursor:"pointer",
            color: n <= (value||0) ? "#F5A623" : "#DDD", transition:"color .1s" }}>★</button>
      ))}
      {value > 0 && <span style={{ fontSize:11, color:C.inkLight, marginLeft:6, alignSelf:"center" }}>{value}/5</span>}
    </div>
  );

  const NPSRating = ({ value, onChange }) => (
    <div style={{ display:"flex", gap:3, flexWrap:"wrap" }}>
      {Array.from({length:11},(_,i)=>i).map(n => (
        <button key={n} onClick={()=>onChange(n)}
          style={{ width:32, height:32, borderRadius:6, border:"1px solid "+(n===value?"#111":"#E0E0E0"),
            background: n===value ? (n>=9?"#111111":n>=7?"#F5A623":"#B91C1C") : "#fff",
            color: n===value ? "#fff" : "#555", fontWeight:n===value?700:400, fontSize:12,
            cursor:"pointer", transition:"all .1s" }}>{n}</button>
      ))}
      <div style={{ display:"flex", justifyContent:"space-between", width:"100%", fontSize:9, color:C.inkLight, marginTop:2 }}>
        <span>Nada probable</span><span>Muy probable</span>
      </div>
    </div>
  );

  const promedioEstrellas = (lista) => {
    const vals = lista.flatMap(e => Object.values(e.respuestas||{}).filter(v => typeof v === "number" && v >= 1 && v <= 5));
    return vals.length > 0 ? (vals.reduce((s,v)=>s+v,0)/vals.length).toFixed(1) : "—";
  };

  const npsScore = (lista) => {
    const npsVals = lista.map(e => e.respuestas?.q5).filter(v => typeof v === "number");
    if (npsVals.length === 0) return "—";
    const promotores = npsVals.filter(v => v >= 9).length;
    const detractores = npsVals.filter(v => v <= 6).length;
    return ((promotores - detractores) / npsVals.length * 100).toFixed(0);
  };

  const renderForm = (preguntas, resp, setResp) => (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      {preguntas.map(q => (
        <div key={q.id}>
          <label style={{ display:"block", fontSize:12, fontWeight:600, color:C.ink, marginBottom:6 }}>{q.texto}</label>
          {q.tipo === "estrellas" && <StarRating value={resp[q.id]||0} onChange={v => setResp({...resp, [q.id]:v})} />}
          {q.tipo === "nps" && <NPSRating value={resp[q.id]} onChange={v => setResp({...resp, [q.id]:v})} />}
          {q.tipo === "sino" && (
            <div style={{ display:"flex", gap:8 }}>
              {["Sí","No","Con reservas"].map(op => (
                <button key={op} onClick={() => setResp({...resp, [q.id]:op})}
                  style={{ padding:"6px 16px", borderRadius:6, border:`1px solid ${resp[q.id]===op?"#111":"#E0E0E0"}`,
                    background:resp[q.id]===op?"#111":"#fff", color:resp[q.id]===op?"#fff":"#555",
                    fontSize:12, cursor:"pointer", fontWeight:resp[q.id]===op?600:400 }}>{op}</button>
              ))}
            </div>
          )}
          {q.tipo === "texto" && (
            <textarea value={resp[q.id]||""} onChange={e => setResp({...resp, [q.id]:e.target.value})}
              rows={2} placeholder="Escribe aquí..."
              style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 10px",
                fontSize:12, fontFamily:"'DM Sans',sans-serif", resize:"vertical" }} />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="fade">
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700, margin:0 }}>Encuestas ISO 9001</h1>
          <p style={{ fontSize:12, color:C.inkLight, margin:"3px 0 0" }}>Satisfacción del cliente y evaluación de proveedores</p>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:10, marginBottom:16 }}>
        {[
          ["Enc. satisfacción", encSat.length, "#111111"],
          ["Promedio general", promedioEstrellas(encSat)+"★", "#F5A623"],
          ["NPS Score", npsScore(encSat), "#3B3B3B"],
          ["Eval. proveedores", encPrv.length, "#8C6A00"],
          ["Promedio proveed.", promedioEstrellas(encPrv)+"★", "#F5A623"],
        ].map(([l,v,color])=>(
          <div key={l} style={{ background:"#fff", border:"1px solid #E0E0E0", borderRadius:8,
            padding:"10px 12px", borderLeft:"3px solid "+color }}>
            <div style={{ fontSize:9, color:"#888", marginBottom:2 }}>{l}</div>
            <div style={{ fontSize:16, fontWeight:700, color, fontFamily:"'DM Mono',monospace" }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Vista toggle */}
      <div style={{ display:"flex", gap:0, marginBottom:16 }}>
        {[["satisfaccion","Satisfacción cliente"],["proveedores","Evaluación proveedores"]].map(([k,lbl])=>(
          <button key={k} onClick={()=>setVista(k)}
            style={{ padding:"8px 18px", border:`1px solid ${C.border}`, borderRadius:k==="satisfaccion"?"6px 0 0 6px":"0 6px 6px 0",
              fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"'DM Sans',sans-serif",
              background:vista===k?"#111":"#fff", color:vista===k?"#fff":"#555" }}>
            {lbl}
          </button>
        ))}
      </div>

      {/* SATISFACCIÓN */}
      {vista === "satisfaccion" && (<>
        <div style={{ display:"flex", gap:8, marginBottom:14 }}>
          <select onChange={e => { if(e.target.value) { const of = ofertasGanadas.find(o=>o.id===e.target.value); setFormSat(nuevaEncSat(of)); e.target.value=""; }}}
            style={{ border:`1px solid ${C.border}`, borderRadius:6, padding:"7px 12px", fontSize:12, fontFamily:"'DM Sans',sans-serif" }}>
            <option value="">+ Nueva encuesta desde oferta ganada...</option>
            {ofertasGanadas.map(o => <option key={o.id} value={o.id}>{o.proyecto||o.cliente||o.id}</option>)}
          </select>
          <button onClick={()=>setFormSat(nuevaEncSat({}))}
            style={{ padding:"7px 14px", border:"none", borderRadius:6, background:"#111111",
              color:"#fff", cursor:"pointer", fontSize:12, fontWeight:600, display:"flex", alignItems:"center", gap:4 }}>
            <Plus size={12}/> Nueva en blanco
          </button>
        </div>
        {formSat && (
          <Card style={{ padding:22, marginBottom:16, borderLeft:"3px solid #111111" }}>
            <STitle t="Encuesta de satisfacción" s={formSat.proyecto||"Proyecto sin nombre"} />
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
              <FI lbl="Cliente" val={formSat.cliente} on={e=>setFormSat(f=>({...f,cliente:e.target.value}))} />
              <FI lbl="Proyecto" val={formSat.proyecto} on={e=>setFormSat(f=>({...f,proyecto:e.target.value}))} />
            </div>
            {renderForm(PREGUNTAS_SATISFACCION, formSat.respuestas, r => setFormSat(f=>({...f,respuestas:r})))}
            <div style={{ display:"flex", gap:8, marginTop:16 }}>
              <Btn icon={Check} on={()=>{
                const updated = {...formSat, estado:"completada"};
                const exists = encSat.find(e=>e.id===formSat.id);
                saveSat(exists ? encSat.map(e=>e.id===formSat.id?updated:e) : [...encSat,updated]);
                setFormSat(null);
              }}>Guardar</Btn>
              <Btn v="out" on={()=>setFormSat(null)}>Cancelar</Btn>
            </div>
          </Card>
        )}
        {encSat.length > 0 && (
          <div style={{ border:`1px solid ${C.border}`, borderRadius:8, overflow:"hidden" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead><tr style={{ background:"#F5F4F1" }}>
                {["Fecha","Cliente","Proyecto","Promedio","NPS","Estado",""].map(h=>(
                  <th key={h} style={{ padding:"8px 12px", textAlign:"left", fontSize:9, fontWeight:700,
                    color:"#888", textTransform:"uppercase", letterSpacing:0.5, borderBottom:"2px solid #E0E0E0" }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {encSat.map((e,i)=>{
                  const vals = Object.entries(e.respuestas||{}).filter(([k,v])=>typeof v==="number"&&v>=1&&v<=5);
                  const avg = vals.length>0?(vals.reduce((s,[,v])=>s+v,0)/vals.length).toFixed(1):"—";
                  return (
                    <tr key={e.id} style={{ borderBottom:`1px solid ${C.border}`, background:i%2?"#F9F8F5":"#fff" }}>
                      <td style={{ padding:"8px 12px" }}>{e.fecha}</td>
                      <td style={{ padding:"8px 12px", fontWeight:600 }}>{e.cliente||"—"}</td>
                      <td style={{ padding:"8px 12px" }}>{e.proyecto||"—"}</td>
                      <td style={{ padding:"8px 12px", color:"#F5A623", fontWeight:700 }}>{avg}★</td>
                      <td style={{ padding:"8px 12px", fontFamily:"'DM Mono',monospace" }}>{e.respuestas?.q5??"-"}</td>
                      <td style={{ padding:"8px 12px" }}>
                        <span style={{ background:e.estado==="completada"?"#E6F4EC":"#FFF3E0",
                          color:e.estado==="completada"?"#111111":"#F5A623", padding:"2px 8px",
                          borderRadius:4, fontSize:10, fontWeight:600 }}>{e.estado}</span>
                      </td>
                      <td style={{ padding:"8px 12px" }}>
                        <div style={{ display:"flex", gap:4 }}>
                          <button onClick={()=>setFormSat({...e})} style={{ background:"none",border:"none",cursor:"pointer",color:C.ink }}><Edit2 size={12}/></button>
                          <button onClick={()=>{ if(window.confirm("¿Eliminar?")) saveSat(encSat.filter(x=>x.id!==e.id)); }} style={{ background:"none",border:"none",cursor:"pointer",color:"#B91C1C" }}><Trash2 size={12}/></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </>)}

      {/* PROVEEDORES */}
      {vista === "proveedores" && (<>
        <div style={{ marginBottom:14 }}>
          <button onClick={()=>setFormPrv(nuevaEncPrv())}
            style={{ padding:"7px 14px", border:"none", borderRadius:6, background:"#8C6A00",
              color:"#fff", cursor:"pointer", fontSize:12, fontWeight:600, display:"flex", alignItems:"center", gap:4 }}>
            <Plus size={12}/> Evaluar proveedor
          </button>
        </div>
        {formPrv && (
          <Card style={{ padding:22, marginBottom:16, borderLeft:"3px solid #8C6A00" }}>
            <STitle t="Evaluación de proveedor" s="" />
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
              <FI lbl="Proveedor" val={formPrv.proveedor} on={e=>setFormPrv(f=>({...f,proveedor:e.target.value}))} />
              <FI lbl="Proyecto / Referencia" val={formPrv.proyecto} on={e=>setFormPrv(f=>({...f,proyecto:e.target.value}))} />
            </div>
            {renderForm(PREGUNTAS_PROVEEDOR, formPrv.respuestas, r => setFormPrv(f=>({...f,respuestas:r})))}
            <div style={{ display:"flex", gap:8, marginTop:16 }}>
              <Btn icon={Check} on={()=>{
                const updated = {...formPrv, estado:"completada"};
                const exists = encPrv.find(e=>e.id===formPrv.id);
                savePrv(exists ? encPrv.map(e=>e.id===formPrv.id?updated:e) : [...encPrv,updated]);
                setFormPrv(null);
              }}>Guardar</Btn>
              <Btn v="out" on={()=>setFormPrv(null)}>Cancelar</Btn>
            </div>
          </Card>
        )}
        {encPrv.length > 0 && (
          <div style={{ border:`1px solid ${C.border}`, borderRadius:8, overflow:"hidden" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead><tr style={{ background:"#F5F4F1" }}>
                {["Fecha","Proveedor","Proyecto","Promedio","¿Repetir?","Estado",""].map(h=>(
                  <th key={h} style={{ padding:"8px 12px", textAlign:"left", fontSize:9, fontWeight:700,
                    color:"#888", textTransform:"uppercase", letterSpacing:0.5, borderBottom:"2px solid #E0E0E0" }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {encPrv.map((e,i)=>{
                  const vals = Object.entries(e.respuestas||{}).filter(([k,v])=>typeof v==="number"&&v>=1&&v<=5);
                  const avg = vals.length>0?(vals.reduce((s,[,v])=>s+v,0)/vals.length).toFixed(1):"—";
                  return (
                    <tr key={e.id} style={{ borderBottom:`1px solid ${C.border}`, background:i%2?"#F9F8F5":"#fff" }}>
                      <td style={{ padding:"8px 12px" }}>{e.fecha}</td>
                      <td style={{ padding:"8px 12px", fontWeight:600 }}>{e.proveedor||"—"}</td>
                      <td style={{ padding:"8px 12px" }}>{e.proyecto||"—"}</td>
                      <td style={{ padding:"8px 12px", color:"#F5A623", fontWeight:700 }}>{avg}★</td>
                      <td style={{ padding:"8px 12px" }}>{e.respuestas?.p5||"—"}</td>
                      <td style={{ padding:"8px 12px" }}>
                        <span style={{ background:e.estado==="completada"?"#E6F4EC":"#FFF3E0",
                          color:e.estado==="completada"?"#111111":"#F5A623", padding:"2px 8px",
                          borderRadius:4, fontSize:10, fontWeight:600 }}>{e.estado}</span>
                      </td>
                      <td style={{ padding:"8px 12px" }}>
                        <div style={{ display:"flex", gap:4 }}>
                          <button onClick={()=>setFormPrv({...e})} style={{ background:"none",border:"none",cursor:"pointer",color:C.ink }}><Edit2 size={12}/></button>
                          <button onClick={()=>{ if(window.confirm("¿Eliminar?")) savePrv(encPrv.filter(x=>x.id!==e.id)); }} style={{ background:"none",border:"none",cursor:"pointer",color:"#B91C1C" }}><Trash2 size={12}/></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </>)}
    </div>
  );
}


/* ─── SETTINGS ───────────────────────────────────────────────── */
function Config() {
  return (
    <div className="fade">
      <p style={{ fontSize: 9, letterSpacing: 2.5, textTransform: "uppercase", color: C.inkLight, margin: "0 0 6px" }}>Sistema</p>
      <h1 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 28, fontWeight: 700, color: C.ink, margin: "0 0 28px", letterSpacing: -0.5 }}>Configuración</h1>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <Card style={{ padding: 24 }}>
          <STitle t="Marca" s="Identidad visual aplicada" />
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
            <div style={{ background: C.ink, borderRadius: 3, padding: "16px" }}><LogoMark size={44} color="#fff" /></div>
            <div>
              <p style={{ margin: "0 0 2px", fontFamily: "'DM Sans', sans-serif", fontSize: 16, fontWeight: 700, color: C.ink }}>Habitaris</p>
              <p style={{ margin: "0 0 2px", fontSize: 11, color: C.inkLight }}>Tipografía: DM Sans (sans-serif)</p>
              <p style={{ margin: 0, fontSize: 11, color: C.inkLight }}>Paleta: B&W + off-white. Manual 2025 ✓</p>
            </div>
          </div>
          <div style={{ background: C.accentBg, borderRadius: 2, padding: "12px 16px", border: `1px dashed ${C.borderMid}` }}>
            <p style={{ margin: 0, fontSize: 11, color: C.inkMid }}>Una sola familia tipográfica sans-serif según manual. Sin serif.</p>
          </div>
        </Card>
        <Card style={{ padding: 24 }}>
          <STitle t="Datos" s="Almacenamiento local persistente" />
          <p style={{ fontSize: 12, color: C.inkMid, margin: "0 0 16px", lineHeight: 1.6 }}>Los datos se guardan en tu navegador. No requieren servidor ni cuenta externa.</p>
          <Btn v="danger" icon={Trash2} on={async () => {
            if (!window.confirm("¿Eliminar TODOS los datos? Irreversible.")) return;
            store.delete("hab:v4");
            window.location.reload();
          }}>Borrar todos los datos</Btn>
        </Card>
      </div>
    </div>
  );
}

/* ─── APP ROOT ───────────────────────────────────────────────── */
export default function CRMModule({ lang: langProp }) {
  const [lang, setLang] = useState(langProp || "es");
  // Sync with parent prop changes
  useEffect(() => { if (langProp) setLang(langProp); }, [langProp]);
  const [view, setView]   = useState("dashboard");
  const [sideOpen, setSideOpen] = useState(false);
  const [offers, setOffers] = useState([]);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData().then(d => { setOffers(d); setLoading(false); }); }, []);

  const saveOffer = useCallback(async (o) => {
    const upd = offers.some(x => x.id === o.id) ? offers.map(x => x.id === o.id ? o : x) : [...offers, o];
    setOffers(upd); await saveData(upd);
  }, [offers]);

  const delOffer = useCallback(async (id) => {
    if (!window.confirm("¿Eliminar esta oferta?")) return;
    const upd = offers.filter(o => o.id !== id); setOffers(upd); await saveData(upd);
  }, [offers]);

  const dupOffer = useCallback(async (id) => {
    const o = offers.find(x => x.id === id); if (!o) return;
    const copy = { ...o, id: uid(), createdAt: today(), updatedAt: today(), estado: "Borrador", proyecto: (o.proyecto || "") + " (copia)", relacionadaCon: id };
    const upd = [...offers, copy]; setOffers(upd); await saveData(upd);
  }, [offers]);

  // Crear oferta desde briefing
  const [prefill, setPrefill] = useState(null);
  const createOfferFromBriefing = useCallback((b, sv) => {
    setPrefill(briefingToOffer(b)); sv("offer-new");
  }, []);

  // Crear cliente desde briefing
  const createClientFromBriefing = useCallback(async (b) => {
    const cliente = briefingToClient(b);
    // Leer clientes existentes, agregar el nuevo, guardar
    try {
      const r = store.getSync("hab:crm:clientes2");
      const list = r ? JSON.parse(r) || [] : [];
      // Evitar duplicados por email
      const existe = list.find(c => c.email && c.email === cliente.email);
      if (existe) {
        alert(`⚠️ Ya existe un cliente con email ${cliente.email}: "${existe.nombre}"`);
        setView("clientes");
        return;
      }
      list.push(cliente);
      store.set("hab:crm:clientes2", JSON.stringify(list));
      alert(`✅ Cliente "${cliente.nombre}" creado desde briefing`);
    } catch {
      alert("Error guardando cliente");
    }
    setView("clientes");
  }, []);

  if (loading) return (
    <>
      <FontLink />
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg }}>
        <div style={{ textAlign: "center" }}>
          <LogoMark size={52} color={C.ink} />
          <div style={{ width: 28, height: 28, border: `2px solid ${C.border}`, borderTopColor: C.ink, borderRadius: "50%", animation: "spin .7s linear infinite", margin: "18px auto 0" }} />
        </div>
      </div>
    </>
  );

  return (
    <>
      <FontLink />
      <div style={{ display: "flex", minHeight: "100vh", background: C.bg, minWidth: 0 }}>
        <Sidebar view={view} sv={setView} lang={lang} setLang={setLang} open={sideOpen} toggle={()=>setSideOpen(!sideOpen)} />
        <main style={{ marginLeft: sideOpen?200:0, flex: 1, padding: "32px 36px", maxWidth: sideOpen?"calc(100vw - 200px)":"100vw", overflowX: "auto", transition:"margin-left .2s ease, max-width .2s ease" }}>
          {view === "dashboard"                              && <Dashboard offers={offers} sv={setView} sei={setEditId} lang={lang} />}
          {view === "offers"                                 && <Lista offers={offers} sv={setView} sei={setEditId} onDel={delOffer} onDup={dupOffer} />}
          {(view === "offer-new" || view === "offer-edit")  && <Form lang={lang} offers={offers} editId={view === "offer-edit" ? editId : null} prefillData={view === "offer-new" ? prefill : null} onSave={async o => { setPrefill(null); await saveOffer(o); }} onBack={() => { setPrefill(null); setView("offers"); }} />}
          {view === "formularios"                            && <Formularios sv={setView} onCreateOfferFromBriefing={createOfferFromBriefing} onCreateClientFromBriefing={createClientFromBriefing} />}
          {view === "clientes"                              && <TabClientesCRM />}
          {view === "proveedores"                           && <TabProveedores />}
          {view === "encuestas"                             && <TabEncuestas offers={offers} />}
          {view === "settings"                              && <Config />}
        </main>
      </div>
    </>
  );
}
