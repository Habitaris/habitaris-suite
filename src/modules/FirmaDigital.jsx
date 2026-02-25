import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'

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
const SK = "hab:firmas:"
const load  = k => { try { return JSON.parse(localStorage.getItem(SK+k)) || null } catch { return null }}
const save  = (k,v) => { localStorage.setItem(SK+k, JSON.stringify(v)); try { window.storage?.set?.(SK+k, JSON.stringify(v)); } catch {} }
const genId = () => Date.now().toString(36)+Math.random().toString(36).slice(2,7)
const fmtDate = d => d ? new Date(d).toLocaleDateString("es-CO",{ day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" }) : "—"
const fmtDateShort = d => d ? new Date(d).toLocaleDateString("es-CO",{ day:"2-digit", month:"short", year:"numeric" }) : "—"

/* ─────── SIGNATURE PAD COMPONENT ─────── */
function SignaturePad({ onSave, onCancel, signer, width=480, height=200 }) {
  const canvasRef = useRef(null)
  const [drawing, setDrawing] = useState(false)
  const [hasContent, setHasContent] = useState(false)
  const lastPoint = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if(!canvas) return
    const ctx = canvas.getContext("2d")
    ctx.fillStyle = "#fff"
    ctx.fillRect(0, 0, width, height)
    // Guide line
    ctx.strokeStyle = "#E4E1DB"
    ctx.lineWidth = 1
    ctx.setLineDash([4,4])
    ctx.beginPath()
    ctx.moveTo(30, height-40)
    ctx.lineTo(width-30, height-40)
    ctx.stroke()
    ctx.setLineDash([])
    // Label
    ctx.fillStyle = "#AAA"
    ctx.font = "10px 'Outfit', sans-serif"
    ctx.fillText("Firma aquí", 30, height-20)
  }, [width, height])

  const getPos = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return { x: (clientX - rect.left) * (width/rect.width), y: (clientY - rect.top) * (height/rect.height) }
  }

  const startDraw = (e) => {
    e.preventDefault()
    setDrawing(true)
    lastPoint.current = getPos(e)
  }

  const draw = (e) => {
    if(!drawing) return
    e.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    const pos = getPos(e)
    ctx.strokeStyle = "#111"
    ctx.lineWidth = 2.5
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.beginPath()
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    lastPoint.current = pos
    setHasContent(true)
  }

  const stopDraw = () => { setDrawing(false); lastPoint.current = null }

  const clear = () => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    ctx.fillStyle = "#fff"
    ctx.fillRect(0, 0, width, height)
    ctx.strokeStyle = "#E4E1DB"
    ctx.lineWidth = 1
    ctx.setLineDash([4,4])
    ctx.beginPath()
    ctx.moveTo(30, height-40)
    ctx.lineTo(width-30, height-40)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = "#AAA"
    ctx.font = "10px 'Outfit', sans-serif"
    ctx.fillText("Firma aquí", 30, height-20)
    setHasContent(false)
  }

  const handleSave = () => {
    if(!hasContent) return
    const dataUrl = canvasRef.current.toDataURL("image/png")
    onSave(dataUrl)
  }

  return (
    <div style={{ background:"#fff", borderRadius:12, padding:20, border:`1px solid ${C.border}` }}>
      {signer && (
        <div style={{ ...F, fontSize:12, color:C.inkMid, marginBottom:12 }}>
          Firmante: <b>{signer}</b>
        </div>
      )}
      <div style={{ border:`2px solid ${C.border}`, borderRadius:8, overflow:"hidden", marginBottom:12,
        touchAction:"none", cursor:"crosshair" }}>
        <canvas ref={canvasRef} width={width} height={height}
          style={{ width:"100%", height:"auto", display:"block" }}
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw} />
      </div>
      <div style={{ display:"flex", gap:8, justifyContent:"space-between" }}>
        <button onClick={clear}
          style={{ ...F, padding:"7px 16px", fontSize:11, color:C.inkMid, background:C.bg,
            border:`1px solid ${C.border}`, borderRadius:6, cursor:"pointer" }}>
          🗑 Limpiar
        </button>
        <div style={{ display:"flex", gap:8 }}>
          {onCancel && <button onClick={onCancel}
            style={{ ...F, padding:"7px 16px", fontSize:11, color:C.inkMid, background:C.bg,
              border:`1px solid ${C.border}`, borderRadius:6, cursor:"pointer" }}>
            Cancelar
          </button>}
          <button onClick={handleSave} disabled={!hasContent}
            style={{ ...F, padding:"7px 20px", fontSize:11, fontWeight:700, color:"#fff",
              background: hasContent ? C.accent : C.inkLight,
              border:"none", borderRadius:6, cursor: hasContent?"pointer":"not-allowed" }}>
            ✓ Firmar
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─────── SIGNATURE DISPLAY ─────── */
function SignatureDisplay({ firma, size="md" }) {
  const s = size==="sm" ? 60 : size==="lg" ? 120 : 80
  if(!firma?.imagen) return <span style={{ ...F, fontSize:10, color:C.inkLight }}>Sin firma</span>
  return (
    <div style={{ display:"inline-block", border:`1px solid ${C.border}`, borderRadius:6, overflow:"hidden", background:"#fff" }}>
      <img src={firma.imagen} alt="Firma" style={{ height:s, objectFit:"contain", display:"block" }} />
    </div>
  )
}

/* ─────── HASH GENERATOR (simple visual) ─────── */
function generateHash(text) {
  let hash = 0
  for(let i=0; i<text.length; i++) hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0
  return Math.abs(hash).toString(16).toUpperCase().padStart(8,"0")
}

/* ─────── DOCUMENT TYPES ─────── */
const DOC_TYPES = [
  { id:"contrato",         label:"Contrato",            icon:"📄", color:"#1E4F8C" },
  { id:"acta",             label:"Acta",                icon:"📋", color:"#1E6B42" },
  { id:"otrosí",           label:"Otrosí / Anexo",      icon:"📎", color:"#5B3A8C" },
  { id:"carta",            label:"Carta / Comunicación", icon:"✉️", color:"#7A5218" },
  { id:"poder",            label:"Poder / Autorización", icon:"🔏", color:"#0D5E6E" },
  { id:"poliza",           label:"Póliza / Seguro",     icon:"🛡", color:"#AE2C2C" },
  { id:"recibo",           label:"Recibo / Paz y Salvo", icon:"✅", color:"#1E6B42" },
  { id:"conformidad",      label:"Acta de Conformidad",  icon:"🤝", color:"#0D7377" },
  { id:"otro",             label:"Otro documento",       icon:"📁", color:"#555" },
]

const ESTADOS_FIRMA = [
  { id:"borrador",    label:"Borrador",      color:"#888",    bg:"#F0EEE9" },
  { id:"pendiente",   label:"Pendiente",     color:"#7A5218", bg:"#FFF8EE" },
  { id:"parcial",     label:"Firma parcial", color:"#1E4F8C", bg:"#E6EFF9" },
  { id:"completado",  label:"Firmado",       color:"#1E6B42", bg:"#EEF6F2" },
  { id:"rechazado",   label:"Rechazado",     color:"#AE2C2C", bg:"#FDF0F0" },
  { id:"vencido",     label:"Vencido",       color:"#AE2C2C", bg:"#FDF0F0" },
]

/* ─────── SAMPLE DATA ─────── */
const SAMPLE_DOCS = [
  { id:"d1", tipo:"contrato", titulo:"Contrato de Diseño Interior — Apto 502 Rosales",
    descripcion:"Contrato de prestación de servicios de diseño interior para apartamento en Rosales, Bogotá.",
    cliente:"María Fernanda Gómez", proyecto:"Apto 502 Rosales", valor:"$45.000.000 COP",
    firmantes:[
      { id:"f1", nombre:"Laura Sánchez Díaz", rol:"Representante Legal", email:"laura@habitaris.co", estado:"pendiente", firma:null, fechaFirma:null },
      { id:"f2", nombre:"María Fernanda Gómez", rol:"Cliente", email:"mfgomez@email.com", estado:"pendiente", firma:null, fechaFirma:null },
    ],
    estado:"pendiente", fechaCreacion:"2026-02-20T10:00:00Z", fechaLimite:"2026-03-05",
    auditoria:[ { fecha:"2026-02-20T10:00:00Z", accion:"Documento creado", usuario:"Sistema" } ] },
  { id:"d2", tipo:"acta", titulo:"Acta de Inicio — Remodelación Casa Chicó",
    descripcion:"Acta de inicio de obras de remodelación integral.",
    cliente:"Andrés Mejía Ruiz", proyecto:"Casa Chicó Norte", valor:"$120.000.000 COP",
    firmantes:[
      { id:"f3", nombre:"Carlos López Mejía", rol:"Director de Proyecto", email:"carlos@habitaris.co", estado:"firmado", firma:{ imagen:"data:image/png;base64,demo1", fecha:"2026-02-18T14:30:00Z" }, fechaFirma:"2026-02-18T14:30:00Z" },
      { id:"f4", nombre:"Andrés Mejía Ruiz", rol:"Propietario", email:"amejia@email.com", estado:"pendiente", firma:null, fechaFirma:null },
      { id:"f5", nombre:"María Rodríguez Peña", rol:"Directora de Obra", email:"maria@habitaris.co", estado:"firmado", firma:{ imagen:"data:image/png;base64,demo2", fecha:"2026-02-18T15:00:00Z" }, fechaFirma:"2026-02-18T15:00:00Z" },
    ],
    estado:"parcial", fechaCreacion:"2026-02-18T09:00:00Z", fechaLimite:"2026-02-28",
    auditoria:[
      { fecha:"2026-02-18T09:00:00Z", accion:"Documento creado", usuario:"Sistema" },
      { fecha:"2026-02-18T14:30:00Z", accion:"Firmado por Carlos López Mejía", usuario:"Carlos López" },
      { fecha:"2026-02-18T15:00:00Z", accion:"Firmado por María Rodríguez Peña", usuario:"María Rodríguez" },
    ] },
  { id:"d3", tipo:"conformidad", titulo:"Acta de Conformidad — Entrega Oficina 301",
    descripcion:"Acta de conformidad y recepción final de obra de adecuación de oficina.",
    cliente:"TechStar S.A.S", proyecto:"Oficina 301 WTC", valor:"$85.000.000 COP",
    firmantes:[
      { id:"f6", nombre:"Laura Sánchez Díaz", rol:"Gerente General", email:"laura@habitaris.co", estado:"firmado", firma:{ imagen:"data:image/png;base64,demo3", fecha:"2026-02-10T11:00:00Z" }, fechaFirma:"2026-02-10T11:00:00Z" },
      { id:"f7", nombre:"Roberto Acosta", rol:"Rep. Legal TechStar", email:"racosta@techstar.co", estado:"firmado", firma:{ imagen:"data:image/png;base64,demo4", fecha:"2026-02-10T16:00:00Z" }, fechaFirma:"2026-02-10T16:00:00Z" },
    ],
    estado:"completado", fechaCreacion:"2026-02-10T08:00:00Z", fechaLimite:"2026-02-15",
    auditoria:[
      { fecha:"2026-02-10T08:00:00Z", accion:"Documento creado", usuario:"Sistema" },
      { fecha:"2026-02-10T11:00:00Z", accion:"Firmado por Laura Sánchez Díaz", usuario:"Laura Sánchez" },
      { fecha:"2026-02-10T16:00:00Z", accion:"Firmado por Roberto Acosta", usuario:"Roberto Acosta" },
      { fecha:"2026-02-10T16:00:00Z", accion:"Documento completado — todas las firmas recogidas", usuario:"Sistema" },
    ] },
]

/* ─────── BADGE ─────── */
function Badge({ children, color, bg }) {
  return <span style={{ ...F, display:"inline-block", padding:"2px 10px", borderRadius:10, fontSize:10, fontWeight:600, color, background:bg }}>{children}</span>
}

/* ═══════════════════════════════════════════════════
   MAIN MODULE
   ═══════════════════════════════════════════════════ */
export default function FirmaDigital() {
  const [tab, setTab] = useState("documentos")
  const [docs, setDocs] = useState(() => load("docs") || SAMPLE_DOCS)
  const [firmasGuardadas, setFirmasGuardadas] = useState(() => load("firmas_guardadas") || [])
  const [search, setSearch] = useState("")
  const [filtroEstado, setFiltroEstado] = useState("all")
  const [filtroTipo, setFiltroTipo] = useState("all")
  const [selDoc, setSelDoc] = useState(null)
  const [editDoc, setEditDoc] = useState(null)
  const [signModal, setSignModal] = useState(null) // { docId, firmanteId }
  const [showAudit, setShowAudit] = useState(null)

  useEffect(() => save("docs", docs), [docs])
  useEffect(() => save("firmas_guardadas", firmasGuardadas), [firmasGuardadas])

  /* derived */
  const docsFilt = useMemo(() => {
    return docs.filter(d => {
      if(filtroEstado !== "all" && d.estado !== filtroEstado) return false
      if(filtroTipo !== "all" && d.tipo !== filtroTipo) return false
      if(search) {
        const s = search.toLowerCase()
        return d.titulo.toLowerCase().includes(s) || d.cliente?.toLowerCase().includes(s) || d.proyecto?.toLowerCase().includes(s)
      }
      return true
    })
  }, [docs, filtroEstado, filtroTipo, search])

  const stats = useMemo(() => {
    const total = docs.length
    const pendientes = docs.filter(d=>d.estado==="pendiente"||d.estado==="parcial").length
    const completados = docs.filter(d=>d.estado==="completado").length
    const rechazados = docs.filter(d=>d.estado==="rechazado").length
    const vencidos = docs.filter(d=>d.estado!=="completado"&&d.fechaLimite&&new Date(d.fechaLimite)<new Date()).length
    const firmasPendientes = docs.reduce((acc,d) => acc + d.firmantes.filter(f=>f.estado==="pendiente").length, 0)
    return { total, pendientes, completados, rechazados, vencidos, firmasPendientes }
  }, [docs])

  /* ── Sign a document ── */
  const firmarDocumento = (docId, firmanteId, imagenFirma) => {
    setDocs(prev => prev.map(d => {
      if(d.id !== docId) return d
      const firmantes = d.firmantes.map(f => {
        if(f.id !== firmanteId) return f
        return { ...f, estado:"firmado", firma:{ imagen:imagenFirma, fecha:new Date().toISOString() }, fechaFirma:new Date().toISOString() }
      })
      const todosFirmaron = firmantes.every(f => f.estado==="firmado")
      const algunoFirmo = firmantes.some(f => f.estado==="firmado")
      const estado = todosFirmaron ? "completado" : algunoFirmo ? "parcial" : d.estado
      const f = firmantes.find(x=>x.id===firmanteId)
      const auditoria = [...d.auditoria, { fecha:new Date().toISOString(), accion:`Firmado por ${f?.nombre}`, usuario:f?.nombre }]
      if(todosFirmaron) auditoria.push({ fecha:new Date().toISOString(), accion:"Documento completado — todas las firmas recogidas", usuario:"Sistema" })
      return { ...d, firmantes, estado, auditoria }
    }))
    setSignModal(null)
  }

  /* ── Reject ── */
  const rechazarFirma = (docId, firmanteId, motivo) => {
    setDocs(prev => prev.map(d => {
      if(d.id !== docId) return d
      const firmantes = d.firmantes.map(f => f.id===firmanteId ? { ...f, estado:"rechazado", motivoRechazo:motivo } : f)
      const auditoria = [...d.auditoria, { fecha:new Date().toISOString(), accion:`Rechazado por ${firmantes.find(f=>f.id===firmanteId)?.nombre}: ${motivo}`, usuario:firmantes.find(f=>f.id===firmanteId)?.nombre }]
      return { ...d, firmantes, estado:"rechazado", auditoria }
    }))
  }

  /* ── Doc detail modal ── */
  const renderDocDetail = () => {
    const doc = selDoc ? docs.find(d=>d.id===selDoc) : null
    if(!doc) return null
    const tipo = DOC_TYPES.find(t=>t.id===doc.tipo)
    const est = ESTADOS_FIRMA.find(e=>e.id===doc.estado)
    const hash = generateHash(doc.id + doc.titulo + doc.fechaCreacion)
    const vencido = doc.fechaLimite && new Date(doc.fechaLimite) < new Date() && doc.estado !== "completado"

    return (
      <div style={{ position:"fixed", inset:0, zIndex:1000, background:"rgba(0,0,0,.4)",
        display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
        onClick={()=>setSelDoc(null)}>
        <div onClick={e=>e.stopPropagation()} style={{ background:"#fff", borderRadius:14, maxWidth:720,
          width:"100%", maxHeight:"88vh", overflow:"auto", padding:28 }}>

          {/* Header */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"start", marginBottom:16 }}>
            <div>
              <div style={{ display:"flex", gap:6, alignItems:"center", marginBottom:6 }}>
                <Badge color={tipo?.color} bg={tipo?.color+"18"}>{tipo?.icon} {tipo?.label}</Badge>
                <Badge color={est?.color} bg={est?.bg}>{est?.label}</Badge>
                {vencido && <Badge color={C.danger} bg={C.dangerBg}>⚠️ Vencido</Badge>}
              </div>
              <h2 style={{ ...F, fontSize:18, fontWeight:700, color:C.ink, margin:0 }}>{doc.titulo}</h2>
            </div>
            <button onClick={()=>setSelDoc(null)} style={{ ...F, fontSize:18, color:C.inkLight, background:"none", border:"none", cursor:"pointer" }}>✕</button>
          </div>

          <p style={{ ...F, fontSize:12, color:C.inkMid, lineHeight:1.6, marginBottom:16 }}>{doc.descripcion}</p>

          {/* Info grid */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:20 }}>
            {[
              { label:"Cliente", val:doc.cliente },
              { label:"Proyecto", val:doc.proyecto },
              { label:"Valor", val:doc.valor },
              { label:"Creado", val:fmtDateShort(doc.fechaCreacion) },
              { label:"Fecha límite", val:fmtDateShort(doc.fechaLimite) },
              { label:"Hash", val:`#${hash}` },
            ].map((item,i) => (
              <div key={i} style={{ padding:10, background:C.surface, borderRadius:6 }}>
                <div style={{ ...F, fontSize:9, color:C.inkLight, marginBottom:2 }}>{item.label}</div>
                <div style={{ ...F, fontSize:12, fontWeight:600, color:C.ink }}>{item.val || "—"}</div>
              </div>
            ))}
          </div>

          {/* Firmantes */}
          <div style={{ marginBottom:20 }}>
            <div style={{ ...F, fontSize:13, fontWeight:700, color:C.ink, marginBottom:12 }}>✍️ Firmantes</div>
            {doc.firmantes.map((f,i) => {
              const firmado = f.estado === "firmado"
              const rechaz = f.estado === "rechazado"
              return (
                <div key={f.id} style={{ display:"flex", gap:14, alignItems:"center", padding:"12px 16px",
                  background: firmado ? C.accentBg : rechaz ? C.dangerBg : C.surface,
                  border:`1px solid ${firmado ? C.accent+"33" : rechaz ? C.danger+"33" : C.border}`,
                  borderRadius:8, marginBottom:8 }}>
                  <div style={{ width:40, height:40, borderRadius:"50%",
                    background: firmado ? C.accent+"22" : rechaz ? C.danger+"22" : C.bg,
                    display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:700,
                    color: firmado ? C.accent : rechaz ? C.danger : C.inkLight }}>
                    {firmado ? "✓" : rechaz ? "✕" : (i+1)}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ ...F, fontSize:13, fontWeight:600, color:C.ink }}>{f.nombre}</div>
                    <div style={{ ...F, fontSize:10, color:C.inkLight }}>{f.rol} · {f.email}</div>
                    {firmado && f.fechaFirma && <div style={{ ...F, fontSize:9, color:C.accent, marginTop:2 }}>Firmado: {fmtDate(f.fechaFirma)}</div>}
                    {rechaz && f.motivoRechazo && <div style={{ ...F, fontSize:9, color:C.danger, marginTop:2 }}>Motivo: {f.motivoRechazo}</div>}
                  </div>
                  {firmado && f.firma?.imagen && f.firma.imagen.startsWith("data:image") && (
                    <div style={{ border:`1px solid ${C.border}`, borderRadius:6, overflow:"hidden", background:"#fff" }}>
                      <img src={f.firma.imagen} alt="Firma" style={{ height:50, objectFit:"contain" }} />
                    </div>
                  )}
                  {f.estado === "pendiente" && doc.estado !== "rechazado" && (
                    <div style={{ display:"flex", gap:6 }}>
                      <button onClick={()=>{ setSignModal({ docId:doc.id, firmanteId:f.id, nombre:f.nombre }); setSelDoc(null) }}
                        style={{ ...F, padding:"6px 14px", fontSize:10, fontWeight:700, color:"#fff",
                          background:C.accent, border:"none", borderRadius:5, cursor:"pointer" }}>
                        ✍️ Firmar
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Progress bar */}
          <div style={{ marginBottom:20 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
              <span style={{ ...F, fontSize:10, color:C.inkLight }}>Progreso de firmas</span>
              <span style={{ ...F, fontSize:10, fontWeight:600, color:C.accent }}>
                {doc.firmantes.filter(f=>f.estado==="firmado").length}/{doc.firmantes.length}
              </span>
            </div>
            <div style={{ height:6, background:C.bg, borderRadius:3, overflow:"hidden" }}>
              <div style={{ height:"100%", borderRadius:3, transition:"width .3s",
                width:`${(doc.firmantes.filter(f=>f.estado==="firmado").length / doc.firmantes.length)*100}%`,
                background: doc.estado==="completado" ? C.accent : doc.estado==="rechazado" ? C.danger : C.warning }} />
            </div>
          </div>

          {/* Audit trail */}
          <div>
            <div style={{ ...F, fontSize:13, fontWeight:700, color:C.ink, marginBottom:10 }}>📋 Trazabilidad / Auditoría</div>
            <div style={{ borderLeft:`2px solid ${C.border}`, paddingLeft:16, marginLeft:8 }}>
              {doc.auditoria.map((a,i) => (
                <div key={i} style={{ marginBottom:12, position:"relative" }}>
                  <div style={{ position:"absolute", left:-22, top:2, width:12, height:12, borderRadius:"50%",
                    background: i===doc.auditoria.length-1 ? C.accent : C.bg, border:`2px solid ${i===doc.auditoria.length-1 ? C.accent : C.border}` }} />
                  <div style={{ ...F, fontSize:10, color:C.inkLight }}>{fmtDate(a.fecha)}</div>
                  <div style={{ ...F, fontSize:12, color:C.ink }}>{a.accion}</div>
                  <div style={{ ...F, fontSize:10, color:C.inkLight }}>por {a.usuario}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Certificate preview for completed docs */}
          {doc.estado === "completado" && (
            <div style={{ marginTop:20, padding:20, borderRadius:10,
              background:"linear-gradient(135deg, #EEF6F2 0%, #E6EFF9 100%)", border:`1px solid ${C.accent}33`, textAlign:"center" }}>
              <div style={{ fontSize:28, marginBottom:8 }}>🔏</div>
              <div style={{ ...F, fontSize:14, fontWeight:700, color:C.accent }}>Documento firmado digitalmente</div>
              <div style={{ ...F, fontSize:11, color:C.inkMid, marginTop:4 }}>
                Hash de integridad: <code style={{ background:"#fff", padding:"2px 8px", borderRadius:4, fontSize:10 }}>SHA-{hash}-{doc.firmantes.length}F</code>
              </div>
              <div style={{ ...F, fontSize:10, color:C.inkLight, marginTop:4 }}>
                {doc.firmantes.length} firmante(s) · Completado: {fmtDate(doc.auditoria[doc.auditoria.length-1]?.fecha)}
              </div>
            </div>
          )}

          <div style={{ display:"flex", gap:8, marginTop:20 }}>
            <button onClick={()=>{ setEditDoc({...doc, firmantes:doc.firmantes.map(f=>({...f}))}); setSelDoc(null) }}
              style={{ ...F, padding:"8px 18px", fontSize:11, color:C.accent, background:C.accentBg,
                border:`1px solid ${C.accent}33`, borderRadius:6, cursor:"pointer" }}>
              ✏️ Editar
            </button>
            <button style={{ ...F, padding:"8px 18px", fontSize:11, color:C.info, background:C.infoBg,
              border:`1px solid ${C.info}33`, borderRadius:6, cursor:"pointer" }}>
              📤 Enviar por email
            </button>
            <button style={{ ...F, padding:"8px 18px", fontSize:11, color:C.inkMid, background:C.surface,
              border:`1px solid ${C.border}`, borderRadius:6, cursor:"pointer" }}>
              📥 Descargar PDF
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ── Sign modal ── */
  const renderSignModal = () => {
    if(!signModal) return null
    return (
      <div style={{ position:"fixed", inset:0, zIndex:1001, background:"rgba(0,0,0,.5)",
        display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
        onClick={()=>setSignModal(null)}>
        <div onClick={e=>e.stopPropagation()} style={{ maxWidth:560, width:"100%" }}>
          <div style={{ ...F, fontSize:14, fontWeight:700, color:"#fff", marginBottom:12, textAlign:"center" }}>
            ✍️ Firma Digital
          </div>
          <SignaturePad
            signer={signModal.nombre}
            onSave={(img) => firmarDocumento(signModal.docId, signModal.firmanteId, img)}
            onCancel={() => setSignModal(null)}
          />
          {/* Saved signatures */}
          {firmasGuardadas.length > 0 && (
            <div style={{ background:"#fff", borderRadius:10, padding:14, marginTop:12, border:`1px solid ${C.border}` }}>
              <div style={{ ...F, fontSize:11, fontWeight:600, color:C.inkMid, marginBottom:8 }}>O usar firma guardada:</div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {firmasGuardadas.map(fg => (
                  <div key={fg.id} onClick={()=>firmarDocumento(signModal.docId, signModal.firmanteId, fg.imagen)}
                    style={{ border:`1px solid ${C.border}`, borderRadius:6, padding:4, cursor:"pointer",
                      background:"#fff", transition:"all .15s" }}
                    onMouseEnter={e=>e.currentTarget.style.borderColor=C.accent}
                    onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
                    <img src={fg.imagen} alt={fg.nombre} style={{ height:40, objectFit:"contain" }} />
                    <div style={{ ...F, fontSize:8, color:C.inkLight, textAlign:"center" }}>{fg.nombre}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  /* ── Doc editor modal ── */
  const renderEditDoc = () => {
    if(!editDoc) return null
    const isNew = !docs.find(d=>d.id===editDoc.id)
    const upd = (k,v) => setEditDoc(prev=>({...prev,[k]:v}))
    const addFirmante = () => upd("firmantes",[...editDoc.firmantes, { id:genId(), nombre:"", rol:"", email:"", estado:"pendiente", firma:null, fechaFirma:null }])
    const updFirmante = (i,k,v) => { const f=[...editDoc.firmantes]; f[i]={...f[i],[k]:v}; upd("firmantes",f) }
    const rmFirmante = (i) => upd("firmantes", editDoc.firmantes.filter((_,idx)=>idx!==i))

    const guardar = () => {
      const doc = { ...editDoc }
      if(isNew) {
        doc.fechaCreacion = new Date().toISOString()
        doc.auditoria = [{ fecha:new Date().toISOString(), accion:"Documento creado", usuario:"Sistema" }]
        doc.estado = "pendiente"
        setDocs(prev=>[...prev, doc])
      } else {
        doc.auditoria = [...doc.auditoria, { fecha:new Date().toISOString(), accion:"Documento editado", usuario:"Sistema" }]
        setDocs(prev=>prev.map(d=>d.id===doc.id?doc:d))
      }
      setEditDoc(null)
    }

    return (
      <div style={{ position:"fixed", inset:0, zIndex:1000, background:"rgba(0,0,0,.4)",
        display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
        onClick={()=>setEditDoc(null)}>
        <div onClick={e=>e.stopPropagation()} style={{ background:"#fff", borderRadius:14, maxWidth:640,
          width:"100%", maxHeight:"88vh", overflow:"auto", padding:28 }}>
          <h2 style={{ ...F, fontSize:16, fontWeight:700, color:C.ink, marginBottom:16 }}>
            {isNew ? "➕ Nuevo documento para firma" : "✏️ Editar documento"}
          </h2>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
            <div>
              <label style={{ ...F, fontSize:10, fontWeight:600, color:C.inkLight }}>Tipo de documento</label>
              <select value={editDoc.tipo} onChange={e=>upd("tipo",e.target.value)}
                style={{ ...F, width:"100%", padding:"7px 10px", fontSize:12, border:`1px solid ${C.border}`, borderRadius:5 }}>
                {DOC_TYPES.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ ...F, fontSize:10, fontWeight:600, color:C.inkLight }}>Fecha límite de firma</label>
              <input type="date" value={editDoc.fechaLimite||""} onChange={e=>upd("fechaLimite",e.target.value)}
                style={{ ...F, width:"100%", padding:"7px 10px", fontSize:12, border:`1px solid ${C.border}`, borderRadius:5, boxSizing:"border-box" }} />
            </div>
          </div>

          <div style={{ marginBottom:10 }}>
            <label style={{ ...F, fontSize:10, fontWeight:600, color:C.inkLight }}>Título del documento</label>
            <input value={editDoc.titulo||""} onChange={e=>upd("titulo",e.target.value)}
              style={{ ...F, width:"100%", padding:"7px 10px", fontSize:12, border:`1px solid ${C.border}`, borderRadius:5, boxSizing:"border-box" }} />
          </div>

          <div style={{ marginBottom:10 }}>
            <label style={{ ...F, fontSize:10, fontWeight:600, color:C.inkLight }}>Descripción</label>
            <textarea value={editDoc.descripcion||""} onChange={e=>upd("descripcion",e.target.value)} rows={2}
              style={{ ...F, width:"100%", padding:"7px 10px", fontSize:12, border:`1px solid ${C.border}`, borderRadius:5, resize:"vertical", boxSizing:"border-box" }} />
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:16 }}>
            <div>
              <label style={{ ...F, fontSize:10, fontWeight:600, color:C.inkLight }}>Cliente</label>
              <input value={editDoc.cliente||""} onChange={e=>upd("cliente",e.target.value)}
                style={{ ...F, width:"100%", padding:"7px 10px", fontSize:12, border:`1px solid ${C.border}`, borderRadius:5, boxSizing:"border-box" }} />
            </div>
            <div>
              <label style={{ ...F, fontSize:10, fontWeight:600, color:C.inkLight }}>Proyecto</label>
              <input value={editDoc.proyecto||""} onChange={e=>upd("proyecto",e.target.value)}
                style={{ ...F, width:"100%", padding:"7px 10px", fontSize:12, border:`1px solid ${C.border}`, borderRadius:5, boxSizing:"border-box" }} />
            </div>
            <div>
              <label style={{ ...F, fontSize:10, fontWeight:600, color:C.inkLight }}>Valor</label>
              <input value={editDoc.valor||""} onChange={e=>upd("valor",e.target.value)}
                style={{ ...F, width:"100%", padding:"7px 10px", fontSize:12, border:`1px solid ${C.border}`, borderRadius:5, boxSizing:"border-box" }} />
            </div>
          </div>

          {/* Firmantes */}
          <div style={{ marginBottom:16 }}>
            <div style={{ ...F, fontSize:12, fontWeight:600, color:C.ink, marginBottom:8 }}>✍️ Firmantes ({editDoc.firmantes.length})</div>
            {editDoc.firmantes.map((f,i) => (
              <div key={f.id||i} style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr auto", gap:8, marginBottom:6, alignItems:"end" }}>
                <div>
                  {i===0 && <label style={{ ...F, fontSize:9, color:C.inkLight }}>Nombre</label>}
                  <input value={f.nombre} onChange={e=>updFirmante(i,"nombre",e.target.value)} placeholder="Nombre completo"
                    style={{ ...F, width:"100%", padding:"6px 8px", fontSize:11, border:`1px solid ${C.border}`, borderRadius:4, boxSizing:"border-box" }} />
                </div>
                <div>
                  {i===0 && <label style={{ ...F, fontSize:9, color:C.inkLight }}>Rol</label>}
                  <input value={f.rol} onChange={e=>updFirmante(i,"rol",e.target.value)} placeholder="Ej: Rep. Legal"
                    style={{ ...F, width:"100%", padding:"6px 8px", fontSize:11, border:`1px solid ${C.border}`, borderRadius:4, boxSizing:"border-box" }} />
                </div>
                <div>
                  {i===0 && <label style={{ ...F, fontSize:9, color:C.inkLight }}>Email</label>}
                  <input value={f.email} onChange={e=>updFirmante(i,"email",e.target.value)} placeholder="email@..."
                    style={{ ...F, width:"100%", padding:"6px 8px", fontSize:11, border:`1px solid ${C.border}`, borderRadius:4, boxSizing:"border-box" }} />
                </div>
                <button onClick={()=>rmFirmante(i)} style={{ ...F, padding:"6px 8px", fontSize:10, color:C.danger, background:"none", border:"none", cursor:"pointer" }}>✕</button>
              </div>
            ))}
            <button onClick={addFirmante}
              style={{ ...F, padding:"5px 14px", fontSize:10, color:C.accent, background:C.accentBg,
                border:`1px solid ${C.accent}33`, borderRadius:5, cursor:"pointer", marginTop:4 }}>
              + Añadir firmante
            </button>
          </div>

          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <button onClick={()=>setEditDoc(null)}
              style={{ ...F, padding:"8px 20px", fontSize:12, color:C.inkMid, background:C.bg, border:`1px solid ${C.border}`, borderRadius:6, cursor:"pointer" }}>
              Cancelar
            </button>
            <button onClick={guardar}
              style={{ ...F, padding:"8px 24px", fontSize:12, fontWeight:700, color:"#fff", background:C.accent, border:"none", borderRadius:6, cursor:"pointer" }}>
              💾 Guardar
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ── Saved signatures manager ── */
  const renderMisFirmas = () => (
    <div>
      <div style={{ ...F, fontSize:13, fontWeight:700, color:C.ink, marginBottom:12 }}>Mis firmas guardadas</div>
      <p style={{ ...F, fontSize:12, color:C.inkLight, marginBottom:16 }}>
        Guarda tus firmas frecuentes para reutilizarlas rápidamente al firmar documentos.
      </p>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px,1fr))", gap:12, marginBottom:20 }}>
        {firmasGuardadas.map(fg => (
          <div key={fg.id} style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:10, padding:16, textAlign:"center" }}>
            <div style={{ border:`1px solid ${C.border}`, borderRadius:6, overflow:"hidden", marginBottom:8, background:"#fff" }}>
              <img src={fg.imagen} alt={fg.nombre} style={{ height:70, objectFit:"contain", display:"block", margin:"0 auto" }} />
            </div>
            <div style={{ ...F, fontSize:12, fontWeight:600, color:C.ink }}>{fg.nombre}</div>
            <div style={{ ...F, fontSize:10, color:C.inkLight }}>{fmtDateShort(fg.fecha)}</div>
            <button onClick={()=>setFirmasGuardadas(prev=>prev.filter(f=>f.id!==fg.id))}
              style={{ ...F, marginTop:8, padding:"4px 12px", fontSize:10, color:C.danger, background:C.dangerBg,
                border:`1px solid ${C.danger}33`, borderRadius:4, cursor:"pointer" }}>
              🗑 Eliminar
            </button>
          </div>
        ))}
      </div>

      <div style={{ maxWidth:520 }}>
        <div style={{ ...F, fontSize:12, fontWeight:600, color:C.inkMid, marginBottom:8 }}>Crear nueva firma guardada</div>
        <SignaturePad onSave={(img) => {
          const nombre = prompt("Nombre para esta firma (ej: 'Mi firma formal'):")
          if(nombre) setFirmasGuardadas(prev=>[...prev, { id:genId(), nombre, imagen:img, fecha:new Date().toISOString() }])
        }} />
      </div>
    </div>
  )

  /* ═══ DOCUMENTOS TAB ═══ */
  const renderDocumentos = () => (
    <div>
      {/* Stats */}
      <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
        {[
          { label:"Total", val:stats.total, icon:"📄" },
          { label:"Pendientes", val:stats.pendientes, icon:"⏳", warn:stats.pendientes>0 },
          { label:"Firmados", val:stats.completados, icon:"✅" },
          { label:"Firmas pendientes", val:stats.firmasPendientes, icon:"✍️", warn:stats.firmasPendientes>0 },
          { label:"Vencidos", val:stats.vencidos, icon:"🔴", danger:stats.vencidos>0 },
        ].map((s,i) => (
          <div key={i} style={{ flex:1, minWidth:110, padding:"10px 14px",
            background: s.danger ? C.dangerBg : s.warn ? C.warningBg : "#fff",
            border:`1px solid ${s.danger ? C.danger+"33" : s.warn ? C.warning+"33" : C.border}`, borderRadius:8 }}>
            <div style={{ ...F, fontSize:9, color:C.inkLight }}>{s.icon} {s.label}</div>
            <div style={{ ...F, fontSize:18, fontWeight:700, color: s.danger ? C.danger : s.warn ? C.warning : C.ink }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
        <select value={filtroEstado} onChange={e=>setFiltroEstado(e.target.value)}
          style={{ ...F, padding:"6px 12px", fontSize:11, border:`1px solid ${C.border}`, borderRadius:6, background:"#fff" }}>
          <option value="all">Todos los estados</option>
          {ESTADOS_FIRMA.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
        </select>
        <select value={filtroTipo} onChange={e=>setFiltroTipo(e.target.value)}
          style={{ ...F, padding:"6px 12px", fontSize:11, border:`1px solid ${C.border}`, borderRadius:6, background:"#fff" }}>
          <option value="all">Todos los tipos</option>
          {DOC_TYPES.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
        </select>
        <div style={{ flex:1, minWidth:180 }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por título, cliente, proyecto…"
            style={{ ...F, width:"100%", padding:"6px 12px", fontSize:11, border:`1px solid ${C.border}`, borderRadius:6, boxSizing:"border-box" }} />
        </div>
        <button onClick={()=>setEditDoc({ id:genId(), tipo:"contrato", titulo:"", descripcion:"", cliente:"", proyecto:"", valor:"",
          firmantes:[{ id:genId(), nombre:"", rol:"", email:"", estado:"pendiente", firma:null, fechaFirma:null }],
          estado:"borrador", fechaCreacion:null, fechaLimite:"", auditoria:[] })}
          style={{ ...F, padding:"7px 16px", fontSize:11, fontWeight:700, color:"#fff",
            background:C.accent, border:"none", borderRadius:6, cursor:"pointer" }}>
          + Nuevo documento
        </button>
      </div>

      {/* Document list */}
      {docsFilt.map(d => {
        const tipo = DOC_TYPES.find(t=>t.id===d.tipo)
        const est = ESTADOS_FIRMA.find(e=>e.id===d.estado)
        const firmados = d.firmantes.filter(f=>f.estado==="firmado").length
        const total = d.firmantes.length
        const vencido = d.fechaLimite && new Date(d.fechaLimite) < new Date() && d.estado !== "completado"

        return (
          <div key={d.id} onClick={()=>setSelDoc(d.id)}
            style={{ display:"flex", gap:14, alignItems:"center", padding:"14px 18px",
              background:"#fff", border:`1px solid ${C.border}`, borderRadius:10, marginBottom:8,
              cursor:"pointer", transition:"all .15s", boxShadow:C.shadow }}
            onMouseEnter={e=>e.currentTarget.style.boxShadow=C.shadowMd}
            onMouseLeave={e=>e.currentTarget.style.boxShadow=C.shadow}>
            <div style={{ width:42, height:42, borderRadius:10, background:tipo?.color+"15",
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>
              {tipo?.icon}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ ...F, fontSize:13, fontWeight:700, color:C.ink, marginBottom:2 }}>{d.titulo}</div>
              <div style={{ ...F, fontSize:11, color:C.inkLight }}>
                {d.cliente} · {d.proyecto} {d.valor && `· ${d.valor}`}
              </div>
            </div>
            <div style={{ display:"flex", gap:6, alignItems:"center", flexShrink:0 }}>
              {/* Firma progress */}
              <div style={{ textAlign:"center", marginRight:8 }}>
                <div style={{ ...F, fontSize:10, fontWeight:600, color:C.inkMid }}>{firmados}/{total}</div>
                <div style={{ width:40, height:4, background:C.bg, borderRadius:2, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${(firmados/total)*100}%`, borderRadius:2,
                    background: d.estado==="completado" ? C.accent : C.warning }} />
                </div>
              </div>
              <Badge color={est?.color} bg={est?.bg}>{est?.label}</Badge>
              {vencido && <Badge color={C.danger} bg={C.dangerBg}>⚠️</Badge>}
            </div>
          </div>
        )
      })}

      {docsFilt.length === 0 && (
        <div style={{ textAlign:"center", padding:40, color:C.inkLight }}>
          <div style={{ fontSize:32, marginBottom:8 }}>📄</div>
          <p style={{ ...F, fontSize:13 }}>No se encontraron documentos</p>
        </div>
      )}
    </div>
  )

  /* ═══ RENDER ═══ */
  const tabs = [
    { id:"documentos", icon:"📄", label:"Documentos", badge:stats.pendientes||null },
    { id:"firmas",     icon:"✍️", label:"Mis Firmas" },
  ]

  return (
    <div style={{ ...F, padding:24 }}>
      <div style={{ marginBottom:20 }}>
        <h1 style={{ ...F, fontSize:22, fontWeight:700, color:C.ink, margin:"0 0 4px" }}>✍️ Firma Digital</h1>
        <p style={{ ...F, fontSize:12, color:C.inkLight, margin:0 }}>Firma y gestión de documentos digitales con trazabilidad completa</p>
      </div>

      <div style={{ display:"flex", gap:2, borderBottom:`1px solid ${C.border}`, marginBottom:20 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{ ...F, padding:"10px 18px", fontSize:12, fontWeight: tab===t.id?700:500,
              color: tab===t.id ? C.accent : C.inkLight,
              background:"none", border:"none", borderBottom: tab===t.id ? `2px solid ${C.accent}` : "2px solid transparent",
              cursor:"pointer" }}>
            {t.icon} {t.label}
            {t.badge && <span style={{ marginLeft:6, background:C.warning, color:"#fff", padding:"1px 7px", borderRadius:10, fontSize:10 }}>{t.badge}</span>}
          </button>
        ))}
      </div>

      {tab === "documentos" && renderDocumentos()}
      {tab === "firmas" && renderMisFirmas()}

      {renderDocDetail()}
      {renderSignModal()}
      {renderEditDoc()}
    </div>
  )
}
