import React, { useState, useEffect, useMemo, useCallback } from 'react'

/* ─────── palette ─────── */
const C = {
  ink:"#111", inkMid:"#444", inkLight:"#888",
  bg:"#F0EEE9", surface:"#FAFAF8", border:"#E4E1DB",
  accent:"#1E6B42", accentBg:"#EEF6F2",
  info:"#1E4F8C", infoBg:"#E6EFF9",
  warning:"#7A5218", warningBg:"#FFF8EE",
  danger:"#AE2C2C", dangerBg:"#FDF0F0",
  shadow:"0 1px 4px rgba(0,0,0,.06)", shadowMd:"0 4px 16px rgba(0,0,0,.10)",
}
const F = { fontFamily:"'Outfit',sans-serif" }
const SK = "hab:portal:"
const load  = k => { try { return JSON.parse(localStorage.getItem(SK+k)) || null } catch { return null }}
const save  = (k,v) => localStorage.setItem(SK+k, JSON.stringify(v))
const genId = () => Date.now().toString(36)+Math.random().toString(36).slice(2,7)
const fmtDate = d => d ? new Date(d).toLocaleDateString("es-CO",{ day:"2-digit", month:"short", year:"numeric" }) : "—"
function daysUntil(d) { return d ? Math.ceil((new Date(d)-new Date())/(1000*60*60*24)) : Infinity }
function Badge({ children, color, bg, style }) {
  return <span style={{ ...F, display:"inline-block", padding:"2px 10px", borderRadius:10, fontSize:10, fontWeight:600, color, background:bg, ...style }}>{children}</span>
}

/* ─────── BRAND ─────── */
function getBrand() {
  try {
    const cfg = JSON.parse(localStorage.getItem("hab:config")) || {}
    return {
      nombre: cfg.empresa?.nombre || "Habitaris",
      logo: cfg.apariencia?.logo || null,
      colorPrimario: cfg.apariencia?.colorPrimario || "#111111",
      colorAcento: cfg.apariencia?.colorAcento || "#1E6B42",
      tipografia: cfg.apariencia?.tipografia || "Outfit",
      telefono: cfg.empresa?.telefono || "+57 350 566 1545",
      email: cfg.empresa?.email || "info@habitaris.co",
      web: cfg.empresa?.web || "www.habitaris.co",
    }
  } catch { return { nombre:"Habitaris", colorPrimario:"#111", colorAcento:"#1E6B42", tipografia:"Outfit" } }
}

/* ═══════════════════════════════════════════════════
   ESTADOS Y CONFIGURACIÓN
   ═══════════════════════════════════════════════════ */
const SECCIONES_PORTAL = [
  { id:"resumen",     label:"Resumen del proyecto",   icon:"📊", desc:"Estado general, progreso, datos clave" },
  { id:"documentos",  label:"Documentos",             icon:"📄", desc:"Contratos, planos, presupuestos, actas" },
  { id:"firmas",      label:"Firmas pendientes",      icon:"✍️", desc:"Documentos que requieren firma del cliente" },
  { id:"avance",      label:"Avance de obra",         icon:"🏗", desc:"Progreso por fase, fotos, bitácora" },
  { id:"pagos",       label:"Pagos y facturas",       icon:"💰", desc:"Estado de cuenta, facturas, recibos" },
  { id:"cronograma",  label:"Cronograma",             icon:"📅", desc:"Fases del proyecto con fechas" },
  { id:"comunicaciones",label:"Comunicaciones",       icon:"💬", desc:"Mensajes y notificaciones del equipo" },
  { id:"garantias",   label:"Garantías",              icon:"🛡", desc:"Pólizas, garantías post-entrega" },
]

const ESTADOS_PROYECTO = [
  { id:"briefing",    label:"Briefing",       color:"#888",    bg:"#F0EEE9", pct:5 },
  { id:"diseno",      label:"Diseño",         color:"#5B3A8C", bg:"#F3EEF9", pct:20 },
  { id:"aprobacion",  label:"Aprobación",     color:"#7A5218", bg:"#FFF8EE", pct:30 },
  { id:"licencias",   label:"Licencias",      color:"#1E4F8C", bg:"#E6EFF9", pct:35 },
  { id:"obra",        label:"En obra",        color:"#D4840A", bg:"#FFF3E0", pct:60 },
  { id:"acabados",    label:"Acabados",       color:"#0D7377", bg:"#E6F5F5", pct:85 },
  { id:"entrega",     label:"Entrega",        color:"#1E6B42", bg:"#EEF6F2", pct:95 },
  { id:"postventa",   label:"Postventa",      color:"#1E6B42", bg:"#EEF6F2", pct:100 },
]

/* ═══════════════════════════════════════════════════
   SAMPLE DATA — portales de clientes
   ═══════════════════════════════════════════════════ */
const SAMPLE_PORTALES = [
  { id:"portal_1", clienteId:"c1", clienteNombre:"María Fernanda Gómez", clienteEmail:"mfgomez@email.com",
    proyecto:"Diseño Interior — Apto 502 Rosales", estado:"diseno", progreso:25,
    ofertaRef:"OFR-2026-001", valorContrato:"$45.000.000 COP",
    equipoAsignado:[ { nombre:"Ana García", cargo:"Diseñadora líder" }, { nombre:"Carlos López", cargo:"Arquitecto" } ],
    fechaInicio:"2026-02-15", fechaEstimadaFin:"2026-06-15",
    seccionesActivas:["resumen","documentos","firmas","pagos","cronograma","comunicaciones"],
    accessToken:"mfg502ros",
    documentos:[
      { id:"doc1", nombre:"Contrato de Diseño Interior", tipo:"contrato", fecha:"2026-02-15", estado:"firmado", descargable:true },
      { id:"doc2", nombre:"Brief de Diseño Aprobado", tipo:"brief", fecha:"2026-02-18", estado:"aprobado", descargable:true },
      { id:"doc3", nombre:"Propuesta de Concepto v1", tipo:"diseño", fecha:"2026-02-25", estado:"en_revision", descargable:true },
      { id:"doc4", nombre:"Presupuesto Estimado de Obra", tipo:"presupuesto", fecha:"2026-02-20", estado:"pendiente", descargable:false },
    ],
    firmasPendientes:[
      { id:"fp1", documento:"Aprobación de Concepto de Diseño", fechaLimite:"2026-03-10", estado:"pendiente" },
    ],
    pagos:[
      { id:"pago1", concepto:"Anticipo — Diseño (50%)", valor:"$22.500.000", fecha:"2026-02-15", estado:"pagado" },
      { id:"pago2", concepto:"Segundo pago — Diseño (30%)", valor:"$13.500.000", fecha:"2026-04-01", estado:"pendiente" },
      { id:"pago3", concepto:"Pago final — Diseño (20%)", valor:"$9.000.000", fecha:"2026-06-15", estado:"pendiente" },
    ],
    cronograma:[
      { fase:"Briefing y levantamiento", inicio:"2026-02-15", fin:"2026-02-22", completado:100 },
      { fase:"Concepto de diseño", inicio:"2026-02-23", fin:"2026-03-10", completado:60 },
      { fase:"Anteproyecto", inicio:"2026-03-11", fin:"2026-04-05", completado:0 },
      { fase:"Proyecto ejecutivo", inicio:"2026-04-06", fin:"2026-05-15", completado:0 },
      { fase:"Detalles técnicos y planos de obra", inicio:"2026-05-16", fin:"2026-06-10", completado:0 },
      { fase:"Entrega final", inicio:"2026-06-11", fin:"2026-06-15", completado:0 },
    ],
    comunicaciones:[
      { id:"com1", fecha:"2026-02-25", de:"Ana García", mensaje:"Hola María Fernanda, ya tenemos lista la primera propuesta de concepto. La subimos al portal para tu revisión. ¡Esperamos tus comentarios!" },
      { id:"com2", fecha:"2026-02-20", de:"Sistema", mensaje:"Se ha generado tu portal de cliente. Aquí podrás seguir el avance de tu proyecto." },
      { id:"com3", fecha:"2026-02-15", de:"Laura Sánchez", mensaje:"¡Bienvenida! Estamos encantados de iniciar este proyecto contigo. Tu diseñadora líder será Ana García." },
    ],
    garantias:[] },

  { id:"portal_2", clienteId:"c2", clienteNombre:"Andrés Mejía Ruiz", clienteEmail:"amejia@email.com",
    proyecto:"Remodelación Integral — Casa Chicó Norte", estado:"obra", progreso:55,
    ofertaRef:"OFR-2025-089", valorContrato:"$120.000.000 COP",
    equipoAsignado:[ { nombre:"Carlos López", cargo:"Director de proyecto" }, { nombre:"María Rodríguez", cargo:"Directora de obra" }, { nombre:"Pedro Martínez", cargo:"Instalador técnico" } ],
    fechaInicio:"2025-10-01", fechaEstimadaFin:"2026-04-30",
    seccionesActivas:["resumen","documentos","firmas","avance","pagos","cronograma","comunicaciones","garantias"],
    accessToken:"amr_chico",
    documentos:[
      { id:"doc5", nombre:"Contrato de Obra", tipo:"contrato", fecha:"2025-10-01", estado:"firmado", descargable:true },
      { id:"doc6", nombre:"Acta de Inicio", tipo:"acta", fecha:"2025-10-05", estado:"firmado", descargable:true },
      { id:"doc7", nombre:"Acta de Vecindad", tipo:"acta", fecha:"2025-10-05", estado:"firmado", descargable:true },
      { id:"doc8", nombre:"Planos Aprobados", tipo:"planos", fecha:"2025-09-20", estado:"aprobado", descargable:true },
      { id:"doc9", nombre:"Acta Comité #8", tipo:"acta", fecha:"2026-02-20", estado:"aprobado", descargable:true },
      { id:"doc10", nombre:"Otrosí — Cambio de acabados baño", tipo:"otrosi", fecha:"2026-02-10", estado:"firmado", descargable:true },
    ],
    firmasPendientes:[
      { id:"fp2", documento:"Acta de Comité #9 — Febrero", fechaLimite:"2026-03-01", estado:"pendiente" },
      { id:"fp3", documento:"Aprobación cambio cocina integral", fechaLimite:"2026-03-05", estado:"pendiente" },
    ],
    pagos:[
      { id:"pago4", concepto:"Anticipo (30%)", valor:"$36.000.000", fecha:"2025-10-01", estado:"pagado" },
      { id:"pago5", concepto:"Avance 1 — Demolición y estructura (20%)", valor:"$24.000.000", fecha:"2025-11-15", estado:"pagado" },
      { id:"pago6", concepto:"Avance 2 — Instalaciones (20%)", valor:"$24.000.000", fecha:"2026-01-15", estado:"pagado" },
      { id:"pago7", concepto:"Avance 3 — Acabados (20%)", valor:"$24.000.000", fecha:"2026-03-15", estado:"pendiente" },
      { id:"pago8", concepto:"Pago final (10%)", valor:"$12.000.000", fecha:"2026-04-30", estado:"pendiente" },
    ],
    cronograma:[
      { fase:"Demolición y preparación", inicio:"2025-10-05", fin:"2025-10-30", completado:100 },
      { fase:"Estructura y mampostería", inicio:"2025-11-01", fin:"2025-12-15", completado:100 },
      { fase:"Instalaciones (eléctrica, hidráulica)", inicio:"2025-12-16", fin:"2026-01-31", completado:100 },
      { fase:"Pañetes y pisos", inicio:"2026-02-01", fin:"2026-02-28", completado:70 },
      { fase:"Carpintería y acabados", inicio:"2026-03-01", fin:"2026-04-10", completado:0 },
      { fase:"Limpieza y entrega", inicio:"2026-04-11", fin:"2026-04-30", completado:0 },
    ],
    avanceObra:[
      { fecha:"2026-02-24", nota:"Avance de pisos en sala y comedor al 80%. Pendiente habitaciones.", fotos:3 },
      { fecha:"2026-02-17", nota:"Inicio de instalación de piso en sala principal. Material llegó completo.", fotos:5 },
      { fecha:"2026-02-10", nota:"Pañetes terminados en toda la casa. Se inicia alistamiento de pisos.", fotos:4 },
      { fecha:"2026-01-30", nota:"Pruebas de presión hidráulica OK. Instalación eléctrica completada.", fotos:6 },
    ],
    comunicaciones:[
      { id:"com4", fecha:"2026-02-24", de:"María Rodríguez", mensaje:"Andrés, el avance de pisos va al 80% en sala. Esta semana arrancamos habitaciones. Te subí las fotos al portal." },
      { id:"com5", fecha:"2026-02-10", de:"Carlos López", mensaje:"Otrosí del cambio de acabados del baño ya está firmado por ambas partes. Queda en el portal." },
      { id:"com6", fecha:"2026-02-01", de:"Sistema", mensaje:"Nuevo documento pendiente de firma: Acta de Comité #9" },
    ],
    garantias:[
      { tipo:"Todo Riesgo Construcción", aseguradora:"Seguros Bolívar", vigencia:"2026-07-15", poliza:"POL-2026-001245" },
      { tipo:"RC Extracontractual", aseguradora:"Sura", vigencia:"2026-12-31", poliza:"RC-2026-778899" },
    ] },

  { id:"portal_3", clienteId:"c3", clienteNombre:"TechStar S.A.S", clienteEmail:"admin@techstar.co",
    proyecto:"Adecuación Oficina 301 — WTC Bogotá", estado:"postventa", progreso:100,
    ofertaRef:"OFR-2025-045", valorContrato:"$85.000.000 COP",
    equipoAsignado:[ { nombre:"Ana García", cargo:"Diseñadora" }, { nombre:"María Rodríguez", cargo:"Directora de obra" } ],
    fechaInicio:"2025-06-01", fechaEstimadaFin:"2025-12-15",
    seccionesActivas:["resumen","documentos","pagos","garantias"],
    accessToken:"ts_301wtc",
    documentos:[
      { id:"doc11", nombre:"Contrato de Obra", tipo:"contrato", fecha:"2025-06-01", estado:"firmado", descargable:true },
      { id:"doc12", nombre:"Acta de Entrega Final", tipo:"acta", fecha:"2025-12-10", estado:"firmado", descargable:true },
      { id:"doc13", nombre:"Acta de Conformidad", tipo:"acta", fecha:"2025-12-10", estado:"firmado", descargable:true },
      { id:"doc14", nombre:"Planos As-Built", tipo:"planos", fecha:"2025-12-12", estado:"entregado", descargable:true },
    ],
    firmasPendientes:[],
    pagos:[
      { id:"pago9", concepto:"Anticipo (30%)", valor:"$25.500.000", fecha:"2025-06-01", estado:"pagado" },
      { id:"pago10", concepto:"Avance 1 (30%)", valor:"$25.500.000", fecha:"2025-08-15", estado:"pagado" },
      { id:"pago11", concepto:"Avance 2 (30%)", valor:"$25.500.000", fecha:"2025-11-01", estado:"pagado" },
      { id:"pago12", concepto:"Retención final (10%)", valor:"$8.500.000", fecha:"2025-12-15", estado:"pagado" },
    ],
    cronograma:[], comunicaciones:[],
    garantias:[
      { tipo:"Estabilidad de obra", aseguradora:"Seguros Bolívar", vigencia:"2030-12-10", poliza:"CAL-2025-112233" },
      { tipo:"Cumplimiento", aseguradora:"Liberty Seguros", vigencia:"2026-06-01", poliza:"CUM-2025-556677" },
    ] },
]

/* ═══════════════════════════════════════════════════
   DETECCIÓN: ¿PORTAL PÚBLICO o ADMIN?
   La ruta /portal?token=xxx es la vista del cliente
   Si no tiene token o se renderiza dentro de la suite → admin
   ═══════════════════════════════════════════════════ */
function getPortalToken() {
  try {
    const params = new URLSearchParams(window.location.search)
    return params.get("token") || params.get("t") || null
  } catch { return null }
}

/* ═══════════════════════════════════════════════════
   VISTA PÚBLICA DEL CLIENTE
   ═══════════════════════════════════════════════════ */
function ClientePortalView({ portal, brand }) {
  const [seccion, setSeccion] = useState("resumen")
  const bf = brand.tipografia || "Outfit"
  const cp = brand.colorPrimario
  const ca = brand.colorAcento

  const est = ESTADOS_PROYECTO.find(e=>e.id===portal.estado)
  const activas = SECCIONES_PORTAL.filter(s => portal.seccionesActivas.includes(s.id))

  /* ── Resumen ── */
  const renderResumen = () => (
    <div>
      {/* Progress */}
      <div style={{ background:"#fff", borderRadius:12, padding:24, marginBottom:16, border:`1px solid ${C.border}` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <div>
            <div style={{ ...F, fontSize:10, color:C.inkLight, textTransform:"uppercase", letterSpacing:1 }}>Estado actual</div>
            <div style={{ ...F, fontSize:18, fontWeight:700, color:est?.color }}>{est?.label}</div>
          </div>
          <div style={{ ...F, fontSize:32, fontWeight:800, color:ca }}>{portal.progreso}%</div>
        </div>
        <div style={{ height:10, background:C.bg, borderRadius:5, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${portal.progreso}%`, background:ca, borderRadius:5, transition:"width .5s" }} />
        </div>
        {/* Phase indicators */}
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:12 }}>
          {ESTADOS_PROYECTO.slice(0,7).map(e => (
            <div key={e.id} style={{ textAlign:"center" }}>
              <div style={{ width:10, height:10, borderRadius:"50%", margin:"0 auto 4px",
                background: portal.progreso >= e.pct ? ca : C.border }} />
              <div style={{ ...F, fontSize:8, color: portal.progreso >= e.pct ? C.ink : C.inkLight }}>{e.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Info cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px,1fr))", gap:12, marginBottom:16 }}>
        {[
          { label:"Valor contrato", val:portal.valorContrato, icon:"💰" },
          { label:"Inicio", val:fmtDate(portal.fechaInicio), icon:"📅" },
          { label:"Entrega estimada", val:fmtDate(portal.fechaEstimadaFin), icon:"🏁" },
          { label:"Oferta ref.", val:portal.ofertaRef, icon:"📋" },
        ].map((item,i) => (
          <div key={i} style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:10, padding:16 }}>
            <div style={{ ...F, fontSize:10, color:C.inkLight }}>{item.icon} {item.label}</div>
            <div style={{ ...F, fontSize:14, fontWeight:700, color:C.ink, marginTop:2 }}>{item.val}</div>
          </div>
        ))}
      </div>

      {/* Team */}
      <div style={{ background:"#fff", borderRadius:12, padding:20, border:`1px solid ${C.border}`, marginBottom:16 }}>
        <div style={{ ...F, fontSize:13, fontWeight:700, color:C.ink, marginBottom:12 }}>👥 Tu equipo</div>
        <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
          {portal.equipoAsignado.map((m,i) => (
            <div key={i} style={{ display:"flex", gap:10, alignItems:"center", padding:"8px 14px",
              background:C.surface, borderRadius:8 }}>
              <div style={{ width:36, height:36, borderRadius:"50%", background:ca+"22",
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:700, color:ca }}>
                {m.nombre[0]}
              </div>
              <div>
                <div style={{ ...F, fontSize:12, fontWeight:600, color:C.ink }}>{m.nombre}</div>
                <div style={{ ...F, fontSize:10, color:C.inkLight }}>{m.cargo}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Alerts */}
      {portal.firmasPendientes.length > 0 && (
        <div style={{ background:C.warningBg, border:`1px solid ${C.warning}33`, borderRadius:10, padding:16, marginBottom:12 }}>
          <div style={{ ...F, fontSize:12, fontWeight:700, color:C.warning }}>✍️ Tienes {portal.firmasPendientes.length} documento(s) pendiente(s) de firma</div>
          <div style={{ ...F, fontSize:11, color:C.warning, marginTop:4 }}>Ve a la sección "Firmas pendientes" para revisarlos y firmar.</div>
        </div>
      )}
      {portal.pagos.filter(p=>p.estado==="pendiente").length > 0 && (
        <div style={{ background:C.infoBg, border:`1px solid ${C.info}33`, borderRadius:10, padding:16 }}>
          <div style={{ ...F, fontSize:12, fontWeight:700, color:C.info }}>💰 Próximo pago: {portal.pagos.find(p=>p.estado==="pendiente")?.concepto}</div>
          <div style={{ ...F, fontSize:11, color:C.info, marginTop:4 }}>{portal.pagos.find(p=>p.estado==="pendiente")?.valor} — {fmtDate(portal.pagos.find(p=>p.estado==="pendiente")?.fecha)}</div>
        </div>
      )}
    </div>
  )

  /* ── Documentos ── */
  const renderDocumentos = () => (
    <div>
      <div style={{ ...F, fontSize:14, fontWeight:700, color:C.ink, marginBottom:16 }}>📄 Documentos del proyecto</div>
      {portal.documentos.map(d => {
        const eColors = { firmado:{ c:C.accent, bg:C.accentBg }, aprobado:{ c:C.accent, bg:C.accentBg },
          en_revision:{ c:C.warning, bg:C.warningBg }, pendiente:{ c:C.info, bg:C.infoBg }, entregado:{ c:C.accent, bg:C.accentBg } }
        const ec = eColors[d.estado] || { c:C.inkLight, bg:C.bg }
        return (
          <div key={d.id} style={{ display:"flex", gap:12, alignItems:"center", padding:"14px 16px",
            background:"#fff", border:`1px solid ${C.border}`, borderRadius:10, marginBottom:8 }}>
            <div style={{ fontSize:24 }}>📄</div>
            <div style={{ flex:1 }}>
              <div style={{ ...F, fontSize:13, fontWeight:600, color:C.ink }}>{d.nombre}</div>
              <div style={{ ...F, fontSize:10, color:C.inkLight }}>{d.tipo} · {fmtDate(d.fecha)}</div>
            </div>
            <Badge color={ec.c} bg={ec.bg}>{d.estado}</Badge>
            {d.descargable && (
              <button style={{ ...F, padding:"6px 12px", fontSize:10, fontWeight:600, color:ca,
                background:ca+"15", border:`1px solid ${ca}33`, borderRadius:5, cursor:"pointer" }}>
                📥 Descargar
              </button>
            )}
          </div>
        )
      })}
    </div>
  )

  /* ── Firmas ── */
  const renderFirmas = () => (
    <div>
      <div style={{ ...F, fontSize:14, fontWeight:700, color:C.ink, marginBottom:16 }}>✍️ Documentos pendientes de firma</div>
      {portal.firmasPendientes.length === 0 ? (
        <div style={{ textAlign:"center", padding:40 }}>
          <div style={{ fontSize:32, marginBottom:8 }}>✅</div>
          <p style={{ ...F, fontSize:13, color:C.accent }}>No tienes documentos pendientes de firma</p>
        </div>
      ) : portal.firmasPendientes.map(fp => (
        <div key={fp.id} style={{ display:"flex", gap:12, alignItems:"center", padding:"16px 18px",
          background:"#fff", border:`1px solid ${C.warning}44`, borderRadius:10, marginBottom:10 }}>
          <div style={{ fontSize:28 }}>✍️</div>
          <div style={{ flex:1 }}>
            <div style={{ ...F, fontSize:13, fontWeight:700, color:C.ink }}>{fp.documento}</div>
            <div style={{ ...F, fontSize:11, color:C.inkLight }}>Fecha límite: {fmtDate(fp.fechaLimite)}</div>
          </div>
          <button style={{ ...F, padding:"8px 20px", fontSize:12, fontWeight:700, color:"#fff",
            background:ca, border:"none", borderRadius:6, cursor:"pointer" }}>
            ✍️ Firmar ahora
          </button>
        </div>
      ))}
    </div>
  )

  /* ── Avance ── */
  const renderAvance = () => (
    <div>
      <div style={{ ...F, fontSize:14, fontWeight:700, color:C.ink, marginBottom:16 }}>🏗 Avance de obra</div>
      {(portal.avanceObra||[]).length === 0 ? (
        <p style={{ ...F, fontSize:12, color:C.inkLight }}>Aún no hay registros de avance.</p>
      ) : (
        <div style={{ borderLeft:`2px solid ${C.border}`, paddingLeft:20, marginLeft:10 }}>
          {portal.avanceObra.map((a,i) => (
            <div key={i} style={{ marginBottom:20, position:"relative" }}>
              <div style={{ position:"absolute", left:-27, top:2, width:12, height:12, borderRadius:"50%",
                background: i===0 ? ca : C.bg, border:`2px solid ${i===0 ? ca : C.border}` }} />
              <div style={{ ...F, fontSize:10, fontWeight:600, color:ca }}>{fmtDate(a.fecha)}</div>
              <div style={{ ...F, fontSize:13, color:C.ink, marginTop:4, lineHeight:1.6 }}>{a.nota}</div>
              {a.fotos > 0 && <div style={{ ...F, fontSize:10, color:C.inkLight, marginTop:4 }}>📷 {a.fotos} foto(s) adjuntas</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )

  /* ── Pagos ── */
  const renderPagos = () => {
    const pagados = portal.pagos.filter(p=>p.estado==="pagado")
    const pendientes = portal.pagos.filter(p=>p.estado==="pendiente")
    const totalPagado = pagados.length
    const totalPagos = portal.pagos.length

    return (
      <div>
        <div style={{ ...F, fontSize:14, fontWeight:700, color:C.ink, marginBottom:12 }}>💰 Estado de pagos</div>
        <div style={{ display:"flex", gap:12, marginBottom:16 }}>
          <div style={{ flex:1, padding:16, background:C.accentBg, borderRadius:10, border:`1px solid ${C.accent}33` }}>
            <div style={{ ...F, fontSize:10, color:C.accent }}>Pagado</div>
            <div style={{ ...F, fontSize:20, fontWeight:700, color:C.accent }}>{totalPagado}/{totalPagos}</div>
          </div>
          {pendientes.length > 0 && (
            <div style={{ flex:1, padding:16, background:C.warningBg, borderRadius:10, border:`1px solid ${C.warning}33` }}>
              <div style={{ ...F, fontSize:10, color:C.warning }}>Próximo pago</div>
              <div style={{ ...F, fontSize:14, fontWeight:700, color:C.warning }}>{pendientes[0].valor}</div>
              <div style={{ ...F, fontSize:10, color:C.warning }}>{fmtDate(pendientes[0].fecha)}</div>
            </div>
          )}
        </div>
        {portal.pagos.map(p => (
          <div key={p.id} style={{ display:"flex", gap:12, alignItems:"center", padding:"12px 16px",
            background:"#fff", border:`1px solid ${C.border}`, borderRadius:8, marginBottom:6 }}>
            <div style={{ fontSize:18 }}>{p.estado==="pagado" ? "✅" : "⏳"}</div>
            <div style={{ flex:1 }}>
              <div style={{ ...F, fontSize:12, fontWeight:600, color:C.ink }}>{p.concepto}</div>
              <div style={{ ...F, fontSize:10, color:C.inkLight }}>{fmtDate(p.fecha)}</div>
            </div>
            <div style={{ ...F, fontSize:13, fontWeight:700, color: p.estado==="pagado" ? C.accent : C.ink }}>{p.valor}</div>
            <Badge color={p.estado==="pagado" ? C.accent : C.warning} bg={p.estado==="pagado" ? C.accentBg : C.warningBg}>
              {p.estado==="pagado" ? "Pagado" : "Pendiente"}
            </Badge>
          </div>
        ))}
      </div>
    )
  }

  /* ── Cronograma ── */
  const renderCronograma = () => (
    <div>
      <div style={{ ...F, fontSize:14, fontWeight:700, color:C.ink, marginBottom:16 }}>📅 Cronograma del proyecto</div>
      {portal.cronograma.map((f,i) => (
        <div key={i} style={{ display:"flex", gap:12, alignItems:"center", padding:"12px 16px",
          background:"#fff", border:`1px solid ${C.border}`, borderRadius:8, marginBottom:6 }}>
          <div style={{ width:40, textAlign:"center" }}>
            <div style={{ ...F, fontSize:18, fontWeight:800, color: f.completado===100 ? C.accent : f.completado>0 ? C.warning : C.inkLight }}>
              {f.completado===100 ? "✓" : `${f.completado}%`}
            </div>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ ...F, fontSize:12, fontWeight:600, color:C.ink }}>{f.fase}</div>
            <div style={{ ...F, fontSize:10, color:C.inkLight }}>{fmtDate(f.inicio)} → {fmtDate(f.fin)}</div>
            <div style={{ height:4, background:C.bg, borderRadius:2, marginTop:4, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${f.completado}%`, borderRadius:2,
                background: f.completado===100 ? C.accent : ca }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )

  /* ── Comunicaciones ── */
  const renderComunicaciones = () => (
    <div>
      <div style={{ ...F, fontSize:14, fontWeight:700, color:C.ink, marginBottom:16 }}>💬 Comunicaciones</div>
      {portal.comunicaciones.map(c => (
        <div key={c.id} style={{ display:"flex", gap:12, padding:"14px 16px",
          background:"#fff", border:`1px solid ${C.border}`, borderRadius:10, marginBottom:8 }}>
          <div style={{ width:36, height:36, borderRadius:"50%", background:ca+"22",
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:700, color:ca, flexShrink:0 }}>
            {c.de[0]}
          </div>
          <div>
            <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:4 }}>
              <span style={{ ...F, fontSize:12, fontWeight:600, color:C.ink }}>{c.de}</span>
              <span style={{ ...F, fontSize:10, color:C.inkLight }}>{fmtDate(c.fecha)}</span>
            </div>
            <div style={{ ...F, fontSize:12, color:C.inkMid, lineHeight:1.6 }}>{c.mensaje}</div>
          </div>
        </div>
      ))}
    </div>
  )

  /* ── Garantías ── */
  const renderGarantias = () => (
    <div>
      <div style={{ ...F, fontSize:14, fontWeight:700, color:C.ink, marginBottom:16 }}>🛡 Garantías y pólizas</div>
      {(portal.garantias||[]).length === 0 ? (
        <p style={{ ...F, fontSize:12, color:C.inkLight }}>Las garantías se activarán al finalizar el proyecto.</p>
      ) : portal.garantias.map((g,i) => (
        <div key={i} style={{ display:"flex", gap:12, alignItems:"center", padding:"14px 16px",
          background:"#fff", border:`1px solid ${C.border}`, borderRadius:10, marginBottom:8 }}>
          <div style={{ fontSize:24 }}>🛡</div>
          <div style={{ flex:1 }}>
            <div style={{ ...F, fontSize:13, fontWeight:600, color:C.ink }}>{g.tipo}</div>
            <div style={{ ...F, fontSize:10, color:C.inkLight }}>{g.aseguradora} · Póliza: {g.poliza}</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ ...F, fontSize:11, color:C.inkMid }}>Vigente hasta</div>
            <div style={{ ...F, fontSize:12, fontWeight:600, color: daysUntil(g.vigencia)<60 ? C.warning : C.accent }}>{fmtDate(g.vigencia)}</div>
          </div>
        </div>
      ))}
    </div>
  )

  const sectionRenderers = { resumen:renderResumen, documentos:renderDocumentos, firmas:renderFirmas,
    avance:renderAvance, pagos:renderPagos, cronograma:renderCronograma,
    comunicaciones:renderComunicaciones, garantias:renderGarantias }

  /* ═══ CLIENT PORTAL LAYOUT ═══ */
  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:`'${bf}',sans-serif` }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=${bf.replace(/ /g,"+")}:wght@300;400;500;600;700;800&display=swap');`}</style>

      {/* Header */}
      <div style={{ background:cp, padding:"0 24px", height:56, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          {brand.logo ? <img src={brand.logo} alt="" style={{ height:26, objectFit:"contain" }} /> :
            <span style={{ fontSize:15, fontWeight:700, color:"#fff", letterSpacing:1.5 }}>{brand.nombre.toUpperCase()}</span>}
          <span style={{ fontSize:10, color:"rgba(255,255,255,.4)", letterSpacing:1 }}>PORTAL CLIENTE</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:"50%", background:"rgba(255,255,255,.12)",
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:700, color:"rgba(255,255,255,.6)" }}>
            {portal.clienteNombre[0]}
          </div>
          <span style={{ fontSize:11, color:"rgba(255,255,255,.6)" }}>{portal.clienteNombre}</span>
        </div>
      </div>
      {brand.colorAcento && <div style={{ height:3, background:`linear-gradient(90deg,${ca},${ca}88)` }} />}

      {/* Project title */}
      <div style={{ padding:"24px 24px 0", maxWidth:960, margin:"0 auto" }}>
        <div style={{ ...F, fontSize:10, color:C.inkLight, textTransform:"uppercase", letterSpacing:1.5, marginBottom:4 }}>Proyecto</div>
        <h1 style={{ ...F, fontSize:22, fontWeight:700, color:C.ink, margin:"0 0 20px" }}>{portal.proyecto}</h1>
      </div>

      <div style={{ display:"flex", maxWidth:960, margin:"0 auto", padding:"0 24px 40px", gap:20 }}>
        {/* Sidebar nav */}
        <div style={{ width:200, flexShrink:0 }}>
          {activas.map(s => (
            <button key={s.id} onClick={()=>setSeccion(s.id)}
              style={{ ...F, display:"flex", gap:8, alignItems:"center", width:"100%", padding:"10px 14px",
                fontSize:12, fontWeight: seccion===s.id ? 700 : 500, textAlign:"left",
                color: seccion===s.id ? ca : C.inkMid,
                background: seccion===s.id ? ca+"12" : "transparent",
                border:"none", borderRadius:8, cursor:"pointer", marginBottom:2, transition:"all .15s" }}>
              <span>{s.icon}</span> {s.label}
              {s.id==="firmas" && portal.firmasPendientes.length > 0 && (
                <span style={{ marginLeft:"auto", background:C.warning, color:"#fff", padding:"1px 6px", borderRadius:8, fontSize:9 }}>
                  {portal.firmasPendientes.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex:1, minWidth:0 }}>
          {sectionRenderers[seccion] ? sectionRenderers[seccion]() : <p>Sección no disponible</p>}
        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign:"center", padding:"20px 24px 30px", borderTop:`1px solid ${C.border}` }}>
        <p style={{ ...F, fontSize:10, color:C.inkLight }}>
          {brand.nombre} · {brand.telefono} · {brand.email}
        </p>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   VISTA ADMIN — Gestión de portales
   ═══════════════════════════════════════════════════ */
function AdminPortalView() {
  const brand = useMemo(() => getBrand(), [])
  const [portales, setPortales] = useState(() => load("portales") || SAMPLE_PORTALES)
  const [selPortal, setSelPortal] = useState(null)
  const [editPortal, setEditPortal] = useState(null)
  const [previewPortal, setPreviewPortal] = useState(null)
  const [search, setSearch] = useState("")

  useEffect(() => save("portales", portales), [portales])

  const portalFilt = useMemo(() => {
    if(!search) return portales
    const s = search.toLowerCase()
    return portales.filter(p => p.clienteNombre.toLowerCase().includes(s) || p.proyecto.toLowerCase().includes(s))
  }, [portales, search])

  /* ── Portal detail/config ── */
  const renderConfig = () => {
    const p = selPortal ? portales.find(x=>x.id===selPortal) : null
    if(!p) return null
    const est = ESTADOS_PROYECTO.find(e=>e.id===p.estado)

    const toggleSeccion = (secId) => {
      setPortales(prev => prev.map(x => {
        if(x.id !== p.id) return x
        const activas = x.seccionesActivas.includes(secId)
          ? x.seccionesActivas.filter(s=>s!==secId)
          : [...x.seccionesActivas, secId]
        return { ...x, seccionesActivas:activas }
      }))
    }

    const updateField = (field, value) => {
      setPortales(prev => prev.map(x => x.id===p.id ? { ...x, [field]:value } : x))
    }

    return (
      <div style={{ position:"fixed", inset:0, zIndex:1000, background:"rgba(0,0,0,.4)",
        display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
        onClick={()=>setSelPortal(null)}>
        <div onClick={e=>e.stopPropagation()} style={{ background:"#fff", borderRadius:14, maxWidth:700,
          width:"100%", maxHeight:"88vh", overflow:"auto", padding:28 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"start", marginBottom:16 }}>
            <div>
              <Badge color={est?.color} bg={est?.bg}>{est?.label}</Badge>
              <h2 style={{ ...F, fontSize:18, fontWeight:700, color:C.ink, margin:"8px 0 2px" }}>{p.proyecto}</h2>
              <div style={{ ...F, fontSize:12, color:C.inkLight }}>Cliente: {p.clienteNombre} · {p.clienteEmail}</div>
            </div>
            <button onClick={()=>setSelPortal(null)} style={{ ...F, fontSize:18, color:C.inkLight, background:"none", border:"none", cursor:"pointer" }}>✕</button>
          </div>

          {/* Access link */}
          <div style={{ background:C.infoBg, border:`1px solid ${C.info}22`, borderRadius:8, padding:14, marginBottom:16 }}>
            <div style={{ ...F, fontSize:10, fontWeight:600, color:C.info, marginBottom:4 }}>🔗 Enlace del cliente</div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <code style={{ ...F, flex:1, fontSize:11, background:"#fff", padding:"6px 10px", borderRadius:4, border:`1px solid ${C.border}`,
                overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {`${window.location.origin}/portal?token=${p.accessToken}`}
              </code>
              <button onClick={()=>{ navigator.clipboard?.writeText(`${window.location.origin}/portal?token=${p.accessToken}`); alert("✅ Enlace copiado") }}
                style={{ ...F, padding:"6px 12px", fontSize:10, fontWeight:600, color:C.info, background:"#fff",
                  border:`1px solid ${C.info}33`, borderRadius:5, cursor:"pointer" }}>
                📋 Copiar
              </button>
              <button style={{ ...F, padding:"6px 12px", fontSize:10, fontWeight:600, color:"#fff", background:"#25D366",
                border:"none", borderRadius:5, cursor:"pointer" }}>
                📱 WhatsApp
              </button>
            </div>
          </div>

          {/* Estado y progreso */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
            <div>
              <label style={{ ...F, fontSize:10, fontWeight:600, color:C.inkLight }}>Estado del proyecto</label>
              <select value={p.estado} onChange={e=>updateField("estado",e.target.value)}
                style={{ ...F, width:"100%", padding:"7px 10px", fontSize:12, border:`1px solid ${C.border}`, borderRadius:5 }}>
                {ESTADOS_PROYECTO.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ ...F, fontSize:10, fontWeight:600, color:C.inkLight }}>Progreso (%)</label>
              <input type="number" min={0} max={100} value={p.progreso} onChange={e=>updateField("progreso",parseInt(e.target.value)||0)}
                style={{ ...F, width:"100%", padding:"7px 10px", fontSize:12, border:`1px solid ${C.border}`, borderRadius:5, boxSizing:"border-box" }} />
            </div>
          </div>

          {/* Secciones visibles */}
          <div style={{ marginBottom:16 }}>
            <div style={{ ...F, fontSize:12, fontWeight:700, color:C.ink, marginBottom:8 }}>👁 Secciones visibles para el cliente</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
              {SECCIONES_PORTAL.map(s => (
                <label key={s.id} style={{ ...F, display:"flex", gap:8, alignItems:"center", padding:"8px 12px",
                  background: p.seccionesActivas.includes(s.id) ? C.accentBg : C.surface,
                  border:`1px solid ${p.seccionesActivas.includes(s.id) ? C.accent+"33" : C.border}`,
                  borderRadius:6, cursor:"pointer", fontSize:12 }}>
                  <input type="checkbox" checked={p.seccionesActivas.includes(s.id)}
                    onChange={()=>toggleSeccion(s.id)} style={{ accentColor:C.accent }} />
                  <span>{s.icon}</span>
                  <span style={{ fontWeight: p.seccionesActivas.includes(s.id) ? 600 : 400 }}>{s.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Quick stats */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8, marginBottom:16 }}>
            <div style={{ padding:10, background:C.surface, borderRadius:6, textAlign:"center" }}>
              <div style={{ ...F, fontSize:16, fontWeight:700, color:C.ink }}>{p.documentos.length}</div>
              <div style={{ ...F, fontSize:9, color:C.inkLight }}>Documentos</div>
            </div>
            <div style={{ padding:10, background:C.surface, borderRadius:6, textAlign:"center" }}>
              <div style={{ ...F, fontSize:16, fontWeight:700, color:C.warning }}>{p.firmasPendientes.length}</div>
              <div style={{ ...F, fontSize:9, color:C.inkLight }}>Firmas pend.</div>
            </div>
            <div style={{ padding:10, background:C.surface, borderRadius:6, textAlign:"center" }}>
              <div style={{ ...F, fontSize:16, fontWeight:700, color:C.accent }}>{p.pagos.filter(x=>x.estado==="pagado").length}/{p.pagos.length}</div>
              <div style={{ ...F, fontSize:9, color:C.inkLight }}>Pagos</div>
            </div>
            <div style={{ padding:10, background:C.surface, borderRadius:6, textAlign:"center" }}>
              <div style={{ ...F, fontSize:16, fontWeight:700, color:C.ink }}>{p.comunicaciones.length}</div>
              <div style={{ ...F, fontSize:9, color:C.inkLight }}>Mensajes</div>
            </div>
          </div>

          <div style={{ display:"flex", gap:8 }}>
            <button onClick={()=>{ setPreviewPortal(p); setSelPortal(null) }}
              style={{ ...F, padding:"8px 18px", fontSize:11, fontWeight:600, color:C.info, background:C.infoBg,
                border:`1px solid ${C.info}33`, borderRadius:6, cursor:"pointer" }}>
              👁 Vista previa cliente
            </button>
            <button style={{ ...F, padding:"8px 18px", fontSize:11, fontWeight:600, color:C.accent, background:C.accentBg,
              border:`1px solid ${C.accent}33`, borderRadius:6, cursor:"pointer" }}>
              📄 Añadir documento
            </button>
            <button style={{ ...F, padding:"8px 18px", fontSize:11, fontWeight:600, color:C.warning, background:C.warningBg,
              border:`1px solid ${C.warning}33`, borderRadius:6, cursor:"pointer" }}>
              💬 Enviar mensaje
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ── Preview modal ── */
  const renderPreview = () => {
    if(!previewPortal) return null
    return (
      <div style={{ position:"fixed", inset:0, zIndex:1001, background:"rgba(0,0,0,.6)" }}
        onClick={()=>setPreviewPortal(null)}>
        <div style={{ position:"absolute", top:10, right:20, zIndex:2 }}>
          <button onClick={()=>setPreviewPortal(null)}
            style={{ ...F, padding:"8px 18px", fontSize:12, fontWeight:700, color:"#fff",
              background:"rgba(0,0,0,.6)", border:"none", borderRadius:8, cursor:"pointer" }}>
            ✕ Cerrar vista previa
          </button>
        </div>
        <div onClick={e=>e.stopPropagation()} style={{ height:"100%", overflow:"auto" }}>
          <ClientePortalView portal={previewPortal} brand={brand} />
        </div>
      </div>
    )
  }

  /* ═══ ADMIN VIEW ═══ */
  return (
    <div style={{ ...F, padding:24 }}>
      <div style={{ marginBottom:20 }}>
        <h1 style={{ ...F, fontSize:22, fontWeight:700, color:C.ink, margin:"0 0 4px" }}>🌐 Portal de Clientes</h1>
        <p style={{ ...F, fontSize:12, color:C.inkLight, margin:0 }}>Gestiona los entornos de acceso de tus clientes: documentos, firmas, avances y pagos</p>
      </div>

      {/* Stats */}
      <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
        {[
          { label:"Portales activos", val:portales.length, icon:"🌐" },
          { label:"En diseño", val:portales.filter(p=>p.estado==="diseno").length, icon:"🎨" },
          { label:"En obra", val:portales.filter(p=>["obra","acabados"].includes(p.estado)).length, icon:"🏗" },
          { label:"Firmas pendientes", val:portales.reduce((a,p)=>a+p.firmasPendientes.length,0), icon:"✍️", warn:true },
          { label:"Completados", val:portales.filter(p=>p.estado==="postventa").length, icon:"✅" },
        ].map((s,i) => (
          <div key={i} style={{ flex:1, minWidth:120, padding:"10px 14px", background:"#fff",
            border:`1px solid ${C.border}`, borderRadius:8 }}>
            <div style={{ ...F, fontSize:9, color:C.inkLight }}>{s.icon} {s.label}</div>
            <div style={{ ...F, fontSize:18, fontWeight:700, color:C.ink }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Search + actions */}
      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        <div style={{ flex:1 }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por cliente o proyecto…"
            style={{ ...F, width:"100%", padding:"8px 12px", fontSize:12, border:`1px solid ${C.border}`, borderRadius:6, boxSizing:"border-box" }} />
        </div>
        <button style={{ ...F, padding:"8px 18px", fontSize:11, fontWeight:700, color:"#fff",
          background:C.accent, border:"none", borderRadius:6, cursor:"pointer" }}>
          + Nuevo portal
        </button>
      </div>

      {/* Portal cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(320px,1fr))", gap:12 }}>
        {portalFilt.map(p => {
          const est = ESTADOS_PROYECTO.find(e=>e.id===p.estado)
          const firmasPend = p.firmasPendientes.length
          const pagosPend = p.pagos.filter(x=>x.estado==="pendiente").length

          return (
            <div key={p.id} onClick={()=>setSelPortal(p.id)}
              style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:12, padding:20,
                cursor:"pointer", boxShadow:C.shadow, transition:"all .15s" }}
              onMouseEnter={e=>e.currentTarget.style.boxShadow=C.shadowMd}
              onMouseLeave={e=>e.currentTarget.style.boxShadow=C.shadow}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                <Badge color={est?.color} bg={est?.bg}>{est?.label}</Badge>
                <span style={{ ...F, fontSize:18, fontWeight:800, color:C.accent }}>{p.progreso}%</span>
              </div>
              <div style={{ ...F, fontSize:15, fontWeight:700, color:C.ink, marginBottom:2 }}>{p.proyecto}</div>
              <div style={{ ...F, fontSize:12, color:C.inkLight, marginBottom:10 }}>{p.clienteNombre}</div>

              {/* Progress bar */}
              <div style={{ height:6, background:C.bg, borderRadius:3, overflow:"hidden", marginBottom:12 }}>
                <div style={{ height:"100%", width:`${p.progreso}%`, background:C.accent, borderRadius:3 }} />
              </div>

              <div style={{ display:"flex", gap:8 }}>
                <span style={{ ...F, fontSize:10, color:C.inkLight }}>📄 {p.documentos.length} docs</span>
                {firmasPend > 0 && <Badge color={C.warning} bg={C.warningBg}>✍️ {firmasPend} firmas</Badge>}
                {pagosPend > 0 && <span style={{ ...F, fontSize:10, color:C.inkLight }}>💰 {pagosPend} pagos pend.</span>}
              </div>

              <div style={{ ...F, fontSize:10, color:C.inkLight, marginTop:8 }}>
                {fmtDate(p.fechaInicio)} → {fmtDate(p.fechaEstimadaFin)} · {p.seccionesActivas.length} secciones activas
              </div>
            </div>
          )
        })}
      </div>

      {renderConfig()}
      {renderPreview()}
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   EXPORT — detecta si es público o admin
   ═══════════════════════════════════════════════════ */
export default function PortalCliente() {
  const brand = useMemo(() => getBrand(), [])
  const token = getPortalToken()
  const portales = load("portales") || SAMPLE_PORTALES

  // Si viene con token → vista pública del cliente
  if(token) {
    const portal = portales.find(p => p.accessToken === token)
    if(!portal) {
      return (
        <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ textAlign:"center", padding:40 }}>
            <div style={{ fontSize:48, marginBottom:16 }}>🔒</div>
            <h2 style={{ ...F, fontSize:20, fontWeight:700, color:C.ink }}>Portal no encontrado</h2>
            <p style={{ ...F, fontSize:13, color:C.inkLight }}>El enlace no es válido o ha expirado. Contacta a {brand.nombre}.</p>
            <p style={{ ...F, fontSize:12, color:C.inkLight, marginTop:8 }}>{brand.telefono} · {brand.email}</p>
          </div>
        </div>
      )
    }
    return <ClientePortalView portal={portal} brand={brand} />
  }

  // Sin token → vista admin (dentro de la suite)
  return <AdminPortalView />
}
