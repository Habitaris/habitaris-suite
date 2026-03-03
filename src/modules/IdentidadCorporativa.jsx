import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { getConfig } from "./Configuracion.jsx";
import { store } from "../core/store.js";


/* ─────── palette ─────── */
const C = {
  ink:"#111", inkMid:"#444", inkLight:"#888",
  bg:"#F5F5F5", surface:"#FFFFFF", border:"#E0E0E0",
  accent:"#111111", accentBg:"#EBEBEB",
  info:"#3B3B3B", infoBg:"#F0F0F0",
  warning:"#8C6A00", warningBg:"#FFF8EE",
  danger:"#B91C1C", dangerBg:"#FDF0F0",
  shadow:"0 1px 4px rgba(0,0,0,.06)", shadowMd:"0 4px 16px rgba(0,0,0,.10)",
}
const F = { fontFamily:"'DM Sans',sans-serif" }

/* ─────── STORAGE ─────── */
const SK = "hab:carnets:"
const load = k => { try { return JSON.parse(store.getSync(SK+k)) || null } catch { return null }}
const save = (k, v) => { store.set(SK+k, JSON.stringify(v)); }
const genId = () => Date.now().toString(36)+Math.random().toString(36).slice(2,7)

/* ─────── QR code generator (SVG) ─────── */
/* Minimal QR encoder for URLs — produces a simple QR-like grid as SVG */
function generateQRSvg(text, size=120, darkColor="#111", lightColor="transparent") {
  // Simple hash-based visual pattern (not real QR, but visually representative)
  // In production, use a library like qrcode.react
  const grid = 21
  const cellSize = size / grid
  const hash = (s, i) => {
    let h = 0
    for(let j=0; j<s.length; j++) h = ((h << 5) - h + s.charCodeAt(j) * (i+1)) | 0
    return h
  }
  let cells = []
  // Position patterns (corners)
  const drawFinder = (ox, oy) => {
    for(let y=0;y<7;y++) for(let x=0;x<7;x++) {
      const outer = x===0||x===6||y===0||y===6
      const inner = x>=2&&x<=4&&y>=2&&y<=4
      if(outer||inner) cells.push({ x:ox+x, y:oy+y })
    }
  }
  drawFinder(0,0); drawFinder(14,0); drawFinder(0,14)
  // Data cells
  for(let y=0;y<grid;y++) for(let x=0;x<grid;x++) {
    const inFinder = (x<8&&y<8)||(x>12&&y<8)||(x<8&&y>12)
    if(!inFinder && (Math.abs(hash(text,x*grid+y)) % 3 !== 0)) cells.push({x,y})
  }
  const rects = cells.map(c =>
    `<rect x="${c.x*cellSize}" y="${c.y*cellSize}" width="${cellSize}" height="${cellSize}" fill="${darkColor}" rx="0.5"/>`
  ).join("")
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${rects}</svg>`
}

/* ─────── Brand config helper ─────── */
function getBrand() {
  try {
    const cfg = JSON.parse(store.getSync("habitaris_config")) || {}
    return {
      nombre: cfg.empresa?.nombre || "Habitaris",
      nit: cfg.empresa?.nit || "901.922.136-8",
      direccion: cfg.empresa?.direccion || "Bogotá D.C., Colombia",
      telefono: cfg.empresa?.telefono || "+57 350 566 1545",
      email: cfg.empresa?.email || "info@habitaris.co",
      web: cfg.empresa?.web || "www.habitaris.co",
      logo: cfg.apariencia?.logo || "/logo-habitaris-negro.svg",
      logoBlanco: cfg.apariencia?.logoBlanco || "/logo-habitaris-blanco.png",
      logoNegro: cfg.apariencia?.logoNegro || "/logo-habitaris-negro.svg",
      colorPrimario: cfg.apariencia?.colorPrimario || "#111111",
      colorAcento: cfg.apariencia?.colorAcento || "#111111",
      tipografia: cfg.apariencia?.tipografia || "DM Sans",
      slogan: cfg.apariencia?.slogan || "Arquitectura · Interiorismo",
    }
  } catch { return { nombre:"Habitaris", colorPrimario:"#111", colorAcento:"#111111", tipografia:"DM Sans", slogan:"Arquitectura · Interiorismo" } }
}

/* ─────── SAMPLE EMPLOYEES ─────── */
const SAMPLE_EMPLOYEES = [
  { id:"e1", nombre:"Ana García Ruiz", cargo:"Diseñadora de Interiores", departamento:"Diseño", email:"ana@habitaris.co", telefono:"+57 310 555 1234", foto:null, fechaIngreso:"2023-03-15", tipoDoc:"CC", documento:"1.020.456.789", rh:"O+", eps:"Sura", arl:"Sura" },
  { id:"e2", nombre:"Carlos López Mejía", cargo:"Arquitecto Senior", departamento:"Arquitectura", email:"carlos@habitaris.co", telefono:"+57 311 555 5678", foto:null, fechaIngreso:"2022-08-01", tipoDoc:"CC", documento:"80.456.123", rh:"A+", eps:"Compensar", arl:"Sura" },
  { id:"e3", nombre:"María Rodríguez Peña", cargo:"Directora de Obra", departamento:"Obra", email:"maria@habitaris.co", telefono:"+57 320 555 9012", foto:null, fechaIngreso:"2023-01-10", tipoDoc:"CC", documento:"52.789.456", rh:"B+", eps:"Sanitas", arl:"Positiva" },
  { id:"e4", nombre:"Pedro Martínez Torres", cargo:"Instalador Técnico", departamento:"Obra", email:"pedro@habitaris.co", telefono:"+57 300 555 3456", foto:null, fechaIngreso:"2024-02-20", tipoDoc:"CC", documento:"1.098.765.432", rh:"O-", eps:"Nueva EPS", arl:"Positiva" },
  { id:"e5", nombre:"Laura Sánchez Díaz", cargo:"Gerente General", departamento:"Dirección", email:"laura@habitaris.co", telefono:"+57 315 555 7890", foto:null, fechaIngreso:"2022-01-01", tipoDoc:"CC", documento:"35.123.789", rh:"AB+", eps:"Sura", arl:"Sura" },
  { id:"e6", nombre:"David Torres Vargas", cargo:"Asesor Comercial", departamento:"Comercial", email:"david@habitaris.co", telefono:"+57 318 555 2345", foto:null, fechaIngreso:"2024-06-01", tipoDoc:"CC", documento:"1.015.432.876", rh:"A-", eps:"Compensar", arl:"Sura" },
]

/* ─────── CARD TEMPLATES ─────── */
const CARNET_TEMPLATES = [
  { id:"classic",     label:"Clásico",     desc:"Diseño limpio con franja superior de color" },
  { id:"modern",      label:"Moderno",     desc:"Degradado diagonal con tipografía bold" },
  { id:"minimal",     label:"Minimalista", desc:"Blanco y negro con detalles de acento" },
  { id:"obra",        label:"Obra / SST",  desc:"Datos de emergencia, EPS, ARL, RH y contacto" },
]

const TARJETA_TEMPLATES = [
  { id:"corporate",   label:"Corporativa", desc:"Elegante con logo centrado y datos al reverso" },
  { id:"creative",    label:"Creativa",    desc:"Color de acento con layout asimétrico" },
  { id:"minimal_biz", label:"Minimalista", desc:"Tipografía limpia, máxima legibilidad" },
]

/* ─────── CARNET RENDERERS ─────── */
function CarnetClassic({ emp, brand, side }) {
  const bf = brand.tipografia
  if(side === "back") {
    const qrSvg = generateQRSvg(`https://${brand.web}/team/${emp.id}`, 80, brand.colorPrimario)
    return (
      <div style={{ width:320, height:200, background:"#fff", borderRadius:10, overflow:"hidden",
        border:`1px solid ${C.border}`, position:"relative", fontFamily:`'${bf}',sans-serif` }}>
        <div style={{ height:8, background:brand.colorPrimario }} />
        <div style={{ padding:"20px 24px", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"calc(100% - 8px)" }}>
          <div dangerouslySetInnerHTML={{ __html:qrSvg }} style={{ marginBottom:10 }} />
          <div style={{ fontSize:8, color:C.inkLight, textAlign:"center", lineHeight:1.5 }}>
            {emp.tipoDoc}: {emp.documento}<br/>
            RH: {emp.rh} · EPS: {emp.eps} · ARL: {emp.arl}<br/>
            Ingreso: {new Date(emp.fechaIngreso).toLocaleDateString("es-CO")}
          </div>
          <div style={{ fontSize:7, color:C.inkLight, marginTop:8 }}>
            En caso de emergencia contactar al {brand.telefono}
          </div>
        </div>
      </div>
    )
  }
  return (
    <div style={{ width:320, height:200, background:"#fff", borderRadius:10, overflow:"hidden",
      border:`1px solid ${C.border}`, position:"relative", fontFamily:`'${bf}',sans-serif` }}>
      <div style={{ height:56, background:brand.colorPrimario, display:"flex", alignItems:"center", padding:"0 20px", gap:10 }}>
        <img src={brand.logoBlanco} alt="" style={{ height:24, objectFit:"contain" }} />
      </div>
      <div style={{ padding:"14px 20px", display:"flex", gap:14 }}>
        <div style={{ width:64, height:76, borderRadius:8, background:C.bg, border:`2px solid ${brand.colorAcento}`,
          display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          {emp.foto ? <img src={emp.foto} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", borderRadius:6 }} /> :
            <span style={{ fontSize:28, fontWeight:700, color:brand.colorAcento }}>{emp.nombre[0]}</span>}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:700, color:C.ink, marginBottom:2, lineHeight:1.2 }}>{emp.nombre}</div>
          <div style={{ fontSize:10, fontWeight:600, color:brand.colorAcento, marginBottom:6 }}>{emp.cargo}</div>
          <div style={{ fontSize:8, color:C.inkLight, lineHeight:1.5 }}>
            {emp.departamento}<br/>
            {emp.email}<br/>
            {emp.telefono}
          </div>
        </div>
      </div>
      <div style={{ position:"absolute", bottom:0, left:0, right:0, height:3, background:brand.colorAcento }} />
    </div>
  )
}

function CarnetModern({ emp, brand, side }) {
  const bf = brand.tipografia
  if(side === "back") {
    const qrSvg = generateQRSvg(`https://${brand.web}/team/${emp.id}`, 80, "#fff")
    return (
      <div style={{ width:320, height:200, borderRadius:10, overflow:"hidden",
        background:`linear-gradient(135deg, ${brand.colorPrimario} 0%, ${brand.colorAcento} 100%)`,
        position:"relative", fontFamily:`'${bf}',sans-serif` }}>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", padding:20 }}>
          <div dangerouslySetInnerHTML={{ __html:qrSvg }} style={{ marginBottom:10 }} />
          <div style={{ fontSize:8, color:"rgba(255,255,255,.7)", textAlign:"center", lineHeight:1.6 }}>
            {emp.tipoDoc}: {emp.documento} · RH: {emp.rh}<br/>
            EPS: {emp.eps} · ARL: {emp.arl}<br/>
            Emergencias: {brand.telefono}
          </div>
        </div>
      </div>
    )
  }
  return (
    <div style={{ width:320, height:200, borderRadius:10, overflow:"hidden",
      background:`linear-gradient(135deg, ${brand.colorPrimario} 0%, ${brand.colorAcento} 100%)`,
      position:"relative", fontFamily:`'${bf}',sans-serif` }}>
      <div style={{ padding:"20px 24px", display:"flex", gap:16, height:"100%", boxSizing:"border-box" }}>
        <div style={{ width:68, height:82, borderRadius:10, background:"rgba(255,255,255,.15)", border:"2px solid rgba(255,255,255,.3)",
          display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          {emp.foto ? <img src={emp.foto} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", borderRadius:8 }} /> :
            <span style={{ fontSize:30, fontWeight:800, color:"rgba(255,255,255,.6)" }}>{emp.nombre[0]}</span>}
        </div>
        <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"center" }}>
          <div style={{ fontSize:15, fontWeight:800, color:"#fff", marginBottom:2, lineHeight:1.2, letterSpacing:-0.3 }}>{emp.nombre}</div>
          <div style={{ fontSize:10, fontWeight:500, color:"rgba(255,255,255,.65)", marginBottom:10 }}>{emp.cargo}</div>
          <div style={{ fontSize:8, color:"rgba(255,255,255,.5)", lineHeight:1.6 }}>
            {emp.departamento} · {emp.email}<br/>{emp.telefono}
          </div>
        </div>
      </div>
      <div style={{ position:"absolute", top:14, right:16 }}>
        <img src={brand.logoBlanco} alt="" style={{ height:18, objectFit:"contain", opacity:0.8 }} />
      </div>
    </div>
  )
}

function CarnetMinimal({ emp, brand, side }) {
  const bf = brand.tipografia
  if(side === "back") {
    const qrSvg = generateQRSvg(`https://${brand.web}/team/${emp.id}`, 80, C.ink)
    return (
      <div style={{ width:320, height:200, background:"#fff", borderRadius:10, overflow:"hidden",
        border:`1px solid ${C.border}`, position:"relative", fontFamily:`'${bf}',sans-serif` }}>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", padding:20 }}>
          <div dangerouslySetInnerHTML={{ __html:qrSvg }} style={{ marginBottom:10 }} />
          <div style={{ fontSize:8, color:C.inkLight, textAlign:"center", lineHeight:1.6 }}>
            {emp.tipoDoc} {emp.documento} · RH: {emp.rh}<br/>
            EPS: {emp.eps} · ARL: {emp.arl}<br/>
            {brand.telefono}
          </div>
        </div>
      </div>
    )
  }
  return (
    <div style={{ width:320, height:200, background:"#fff", borderRadius:10, overflow:"hidden",
      border:`1px solid ${C.border}`, position:"relative", fontFamily:`'${bf}',sans-serif` }}>
      <div style={{ display:"flex", height:"100%" }}>
        <div style={{ width:4, background:brand.colorAcento }} />
        <div style={{ flex:1, padding:"20px 22px", display:"flex", gap:14 }}>
          <div style={{ width:60, height:72, borderRadius:6, background:C.bg,
            display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            {emp.foto ? <img src={emp.foto} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", borderRadius:6 }} /> :
              <span style={{ fontSize:26, fontWeight:700, color:C.inkLight }}>{emp.nombre[0]}</span>}
          </div>
          <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"center" }}>
            <div style={{ fontSize:14, fontWeight:700, color:C.ink, marginBottom:1, letterSpacing:-0.3 }}>{emp.nombre}</div>
            <div style={{ fontSize:9, fontWeight:600, color:brand.colorAcento, marginBottom:8, textTransform:"uppercase", letterSpacing:0.5 }}>{emp.cargo}</div>
            <div style={{ fontSize:8, color:C.inkLight, lineHeight:1.6 }}>
              {emp.departamento}<br/>
              {emp.email} · {emp.telefono}
            </div>
          </div>
        </div>
      </div>
      <div style={{ position:"absolute", bottom:10, right:16 }}>
        <img src={brand.logoNegro} alt="" style={{ height:32, objectFit:"contain", opacity:0.7 }} />
      </div>
    </div>
  )
}

function CarnetObra({ emp, brand, side }) {
  const bf = brand.tipografia
  if(side === "back") {
    return (
      <div style={{ width:320, height:200, background:"#fff", borderRadius:10, overflow:"hidden",
        border:`1px solid ${C.border}`, position:"relative", fontFamily:`'${bf}',sans-serif` }}>
        <div style={{ height:32, background:"#B91C1C", display:"flex", alignItems:"center", padding:"0 16px" }}>
          <span style={{ fontSize:10, fontWeight:700, color:"#fff", letterSpacing:1 }}>🚨 DATOS DE EMERGENCIA</span>
        </div>
        <div style={{ padding:"10px 16px", fontSize:9, color:C.ink, lineHeight:1.8 }}>
          <div style={{ display:"grid", gridTemplateColumns:"auto 1fr", gap:"2px 10px" }}>
            <b>RH:</b><span style={{ fontSize:14, fontWeight:800, color:"#B91C1C" }}>{emp.rh}</span>
            <b>EPS:</b><span>{emp.eps}</span>
            <b>ARL:</b><span>{emp.arl}</span>
            <b>Doc:</b><span>{emp.tipoDoc} {emp.documento}</span>
            <b>Ingreso:</b><span>{new Date(emp.fechaIngreso).toLocaleDateString("es-CO")}</span>
          </div>
          <div style={{ marginTop:8, padding:"6px 10px", background:"#FFF3F3", borderRadius:4, border:"1px solid #B91C1C33" }}>
            <div style={{ fontSize:8, fontWeight:700, color:"#B91C1C" }}>Contacto de emergencia empresa:</div>
            <div style={{ fontSize:9, color:C.ink }}>{brand.telefono} · {brand.email}</div>
          </div>
        </div>
        <div style={{ position:"absolute", bottom:6, right:10, fontSize:7, color:C.inkLight }}>
          Si encuentra esta tarjeta, devuélvala a {brand.nombre}
        </div>
      </div>
    )
  }
  return (
    <div style={{ width:320, height:200, background:"#fff", borderRadius:10, overflow:"hidden",
      border:`1px solid ${C.border}`, position:"relative", fontFamily:`'${bf}',sans-serif` }}>
      <div style={{ height:44, background:brand.colorPrimario, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 16px" }}>
        <img src={brand.logoBlanco} alt="" style={{ height:20, objectFit:"contain" }} />
        <span style={{ fontSize:8, fontWeight:600, color:"rgba(255,255,255,.5)", background:"rgba(255,255,255,.1)", padding:"2px 8px", borderRadius:3 }}>PERSONAL DE OBRA</span>
      </div>
      <div style={{ padding:"10px 16px", display:"flex", gap:12 }}>
        <div style={{ width:58, height:70, borderRadius:6, background:C.bg, border:`2px solid ${brand.colorAcento}`,
          display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          {emp.foto ? <img src={emp.foto} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", borderRadius:4 }} /> :
            <span style={{ fontSize:24, fontWeight:700, color:brand.colorAcento }}>{emp.nombre[0]}</span>}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, fontWeight:700, color:C.ink, marginBottom:1 }}>{emp.nombre}</div>
          <div style={{ fontSize:9, fontWeight:600, color:brand.colorAcento, marginBottom:4 }}>{emp.cargo}</div>
          <div style={{ display:"flex", gap:6 }}>
            <span style={{ fontSize:18, fontWeight:800, color:"#B91C1C", padding:"2px 8px", background:"#FFF3F3", borderRadius:4 }}>{emp.rh}</span>
            <div style={{ fontSize:8, color:C.inkLight, lineHeight:1.5 }}>
              EPS: {emp.eps}<br/>ARL: {emp.arl}
            </div>
          </div>
        </div>
      </div>
      <div style={{ position:"absolute", bottom:0, left:0, right:0, height:3, background:"#B91C1C" }} />
    </div>
  )
}

const CARNET_RENDERERS = {
  classic: CarnetClassic,
  modern: CarnetModern,
  minimal: CarnetMinimal,
  obra: CarnetObra,
}

/* ─────── BUSINESS CARD RENDERERS ─────── */
function TarjetaCorporate({ emp, brand, side }) {
  const bf = brand.tipografia
  if(side === "back") {
    return (
      <div style={{ width:340, height:190, borderRadius:8, overflow:"hidden",
        background:brand.colorPrimario, display:"flex", alignItems:"center", justifyContent:"center",
        fontFamily:`'${bf}',sans-serif` }}>
        <div style={{ textAlign:"center" }}>
          <img src={brand.logoBlanco} alt="" style={{ height:32, objectFit:"contain", marginBottom:10 }} />
          <div style={{ fontSize:8, color:"rgba(255,255,255,.45)", letterSpacing:2, textTransform:"uppercase" }}>{brand.slogan}</div>
        </div>
      </div>
    )
  }
  return (
    <div style={{ width:340, height:190, background:"#fff", borderRadius:8, overflow:"hidden",
      border:`1px solid ${C.border}`, fontFamily:`'${bf}',sans-serif`, position:"relative" }}>
      <div style={{ height:4, background:brand.colorAcento }} />
      <div style={{ padding:"22px 24px" }}>
        <div style={{ fontSize:15, fontWeight:700, color:C.ink, marginBottom:1, letterSpacing:-0.3 }}>{emp.nombre}</div>
        <div style={{ fontSize:9, fontWeight:600, color:brand.colorAcento, textTransform:"uppercase", letterSpacing:0.8, marginBottom:14 }}>{emp.cargo}</div>
        <div style={{ display:"grid", gridTemplateColumns:"auto 1fr", gap:"3px 8px", fontSize:8, color:C.inkMid }}>
          <span style={{ color:C.inkLight }}>✉</span><span>{emp.email}</span>
          <span style={{ color:C.inkLight }}>✆</span><span>{emp.telefono}</span>
          <span style={{ color:C.inkLight }}>⌂</span><span>{brand.direccion}</span>
          <span style={{ color:C.inkLight }}>◉</span><span>{brand.web}</span>
        </div>
      </div>
      <div style={{ position:"absolute", bottom:12, right:16 }}>
        <img src={brand.logoNegro} alt="" style={{ height:16, objectFit:"contain", opacity:0.3 }} />
      </div>
    </div>
  )
}

function TarjetaCreative({ emp, brand, side }) {
  const bf = brand.tipografia
  if(side === "back") {
    const qrSvg = generateQRSvg(`https://${brand.web}/team/${emp.id}`, 70, "#fff")
    return (
      <div style={{ width:340, height:190, borderRadius:8, overflow:"hidden",
        background:`linear-gradient(145deg, ${brand.colorAcento} 0%, ${brand.colorPrimario} 100%)`,
        fontFamily:`'${bf}',sans-serif`, display:"flex", alignItems:"center", justifyContent:"center", gap:24, padding:"0 30px" }}>
        <div dangerouslySetInnerHTML={{ __html:qrSvg }} />
        <div style={{ textAlign:"left" }}>
          <img src={brand.logoBlanco} alt="" style={{ height:22, objectFit:"contain", marginBottom:8 }} />
          <div style={{ fontSize:7, color:"rgba(255,255,255,.5)", letterSpacing:1.5, textTransform:"uppercase", lineHeight:1.6 }}>
            {brand.slogan}<br/>{brand.web}
          </div>
        </div>
      </div>
    )
  }
  return (
    <div style={{ width:340, height:190, borderRadius:8, overflow:"hidden", position:"relative",
      background:"#fff", border:`1px solid ${C.border}`, fontFamily:`'${bf}',sans-serif` }}>
      <div style={{ position:"absolute", top:0, left:0, width:100, height:"100%",
        background:`linear-gradient(180deg, ${brand.colorAcento} 0%, ${brand.colorPrimario} 100%)` }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%" }}>
          <div style={{ width:44, height:52, borderRadius:8, background:"rgba(255,255,255,.15)", border:"1.5px solid rgba(255,255,255,.25)",
            display:"flex", alignItems:"center", justifyContent:"center" }}>
            {emp.foto ? <img src={emp.foto} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", borderRadius:6 }} /> :
              <span style={{ fontSize:22, fontWeight:800, color:"rgba(255,255,255,.6)" }}>{emp.nombre[0]}</span>}
          </div>
        </div>
      </div>
      <div style={{ marginLeft:112, padding:"22px 20px" }}>
        <div style={{ fontSize:15, fontWeight:700, color:C.ink, marginBottom:1, letterSpacing:-0.3 }}>{emp.nombre}</div>
        <div style={{ fontSize:9, fontWeight:600, color:brand.colorAcento, textTransform:"uppercase", letterSpacing:0.8, marginBottom:14 }}>{emp.cargo}</div>
        <div style={{ fontSize:8, color:C.inkMid, lineHeight:1.8 }}>
          {emp.email}<br/>{emp.telefono}<br/>{brand.web}
        </div>
      </div>
    </div>
  )
}

function TarjetaMinimal({ emp, brand, side }) {
  const bf = brand.tipografia
  if(side === "back") {
    return (
      <div style={{ width:340, height:190, background:"#fff", borderRadius:8, overflow:"hidden",
        border:`1px solid ${C.border}`, fontFamily:`'${bf}',sans-serif`,
        display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ textAlign:"center" }}>
          <img src={brand.logoNegro} alt="" style={{ height:28, objectFit:"contain", opacity:0.2 }} />
          <div style={{ fontSize:7, color:C.inkLight, letterSpacing:2, textTransform:"uppercase", marginTop:8 }}>
            {brand.slogan}
          </div>
        </div>
      </div>
    )
  }
  return (
    <div style={{ width:340, height:190, background:"#fff", borderRadius:8, overflow:"hidden",
      border:`1px solid ${C.border}`, fontFamily:`'${bf}',sans-serif`, position:"relative", padding:24, boxSizing:"border-box",
      display:"flex", flexDirection:"column", justifyContent:"flex-end" }}>
      <div style={{ position:"absolute", top:20, right:20 }}>
        <img src={brand.logoNegro} alt="" style={{ height:14, objectFit:"contain", opacity:0.25 }} />
      </div>
      <div>
        <div style={{ fontSize:16, fontWeight:700, color:C.ink, marginBottom:1, letterSpacing:-0.5 }}>{emp.nombre}</div>
        <div style={{ fontSize:9, fontWeight:500, color:brand.colorAcento, marginBottom:12 }}>{emp.cargo}</div>
        <div style={{ display:"flex", gap:16, fontSize:8, color:C.inkLight }}>
          <span>{emp.email}</span>
          <span>{emp.telefono}</span>
          <span>{brand.web}</span>
        </div>
      </div>
    </div>
  )
}

const TARJETA_RENDERERS = {
  corporate: TarjetaCorporate,
  creative: TarjetaCreative,
  minimal_biz: TarjetaMinimal,
}

/* ─────── VIRTUAL CARD (vCard / shareable) ─────── */
function VirtualCardPreview({ emp, brand }) {
  const bf = brand.tipografia
  const qrSvg = generateQRSvg(`https://${brand.web}/team/${emp.id}`, 100, brand.colorAcento)

  return (
    <div style={{ width:320, borderRadius:16, overflow:"hidden", background:"#fff",
      boxShadow:"0 8px 32px rgba(0,0,0,.12)", fontFamily:`'${bf}',sans-serif` }}>
      {/* Header */}
      <div style={{ height:80, background:`linear-gradient(135deg, ${brand.colorPrimario}, ${brand.colorAcento})`,
        position:"relative", display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
        <div style={{ position:"absolute", top:12, left:16 }}>
          <img src={brand.logoBlanco} alt="" style={{ height:16, objectFit:"contain", opacity:0.6 }} />
        </div>
        <div style={{ width:72, height:72, borderRadius:"50%", background:"#fff", border:"3px solid #fff",
          display:"flex", alignItems:"center", justifyContent:"center", transform:"translateY(36px)", boxShadow:"0 4px 12px rgba(0,0,0,.1)" }}>
          {emp.foto ? <img src={emp.foto} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", borderRadius:"50%" }} /> :
            <span style={{ fontSize:28, fontWeight:800, color:brand.colorAcento }}>{emp.nombre[0]}</span>}
        </div>
      </div>
      {/* Body */}
      <div style={{ padding:"44px 24px 20px", textAlign:"center" }}>
        <div style={{ fontSize:18, fontWeight:700, color:C.ink, marginBottom:2 }}>{emp.nombre}</div>
        <div style={{ fontSize:11, fontWeight:500, color:brand.colorAcento, marginBottom:4 }}>{emp.cargo}</div>
        <div style={{ fontSize:10, color:C.inkLight, marginBottom:16 }}>{emp.departamento} · {brand.nombre}</div>

        {/* Contact buttons */}
        <div style={{ display:"flex", gap:8, justifyContent:"center", marginBottom:16 }}>
          {[
            { icon:"✉", label:"Email", val:emp.email },
            { icon:"✆", label:"Llamar", val:emp.telefono },
            { icon:"◉", label:"Web", val:brand.web },
          ].map((c,i) => (
            <div key={i} style={{ flex:1, padding:"10px 6px", background:C.surface, borderRadius:10,
              border:`1px solid ${C.border}`, textAlign:"center" }}>
              <div style={{ fontSize:16, marginBottom:2 }}>{c.icon}</div>
              <div style={{ fontSize:8, fontWeight:600, color:C.inkMid }}>{c.label}</div>
            </div>
          ))}
        </div>

        {/* Details */}
        <div style={{ textAlign:"left", fontSize:10, color:C.inkMid, lineHeight:1.8, padding:"0 8px" }}>
          <div style={{ display:"flex", justifyContent:"space-between" }}>
            <span style={{ color:C.inkLight }}>Email</span><span>{emp.email}</span>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between" }}>
            <span style={{ color:C.inkLight }}>Teléfono</span><span>{emp.telefono}</span>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between" }}>
            <span style={{ color:C.inkLight }}>Dirección</span><span>{brand.direccion}</span>
          </div>
        </div>

        {/* QR */}
        <div style={{ marginTop:16, padding:16, background:C.surface, borderRadius:12, display:"inline-block" }}>
          <div dangerouslySetInnerHTML={{ __html:qrSvg }} />
          <div style={{ fontSize:8, color:C.inkLight, marginTop:4 }}>Escanea para guardar contacto</div>
        </div>
      </div>
    </div>
  )
}

/* ─────── BATCH PRINT LAYOUT ─────── */
function BatchPrintPreview({ empleados, brand, tipo, template }) {
  const Renderer = tipo === "carnet" ? CARNET_RENDERERS[template] : TARJETA_RENDERERS[template]
  if(!Renderer) return null

  return (
    <div style={{ background:"#fff", padding:20 }}>
      <div style={{ ...F, fontSize:11, color:C.inkLight, marginBottom:16, textAlign:"center" }}>
        Vista previa de impresión — {empleados.length} {tipo==="carnet"?"carnets":"tarjetas"} (frente y reverso)
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        {empleados.map(emp => (
          <React.Fragment key={emp.id}>
            <div style={{ textAlign:"center" }}>
              <div style={{ ...F, fontSize:9, color:C.inkLight, marginBottom:4 }}>Frente — {emp.nombre}</div>
              <Renderer emp={emp} brand={brand} side="front" />
            </div>
            <div style={{ textAlign:"center" }}>
              <div style={{ ...F, fontSize:9, color:C.inkLight, marginBottom:4 }}>Reverso</div>
              <Renderer emp={emp} brand={brand} side="back" />
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   MAIN MODULE EXPORT
   ═══════════════════════════════════════════════════ */
export default function IdentidadCorporativa() {
    const [tab, setTab] = useState("marca")

  const [cfg, setCfg] = useState(() => {
    try { return JSON.parse(store.getSync("habitaris_config")) || {}; } catch { return {}; }
  });
  const apariencia = cfg.apariencia || {};
  const updateApariencia = (key, val) => {
    const next = {...cfg, apariencia: {...(cfg.apariencia||{}), [key]: val}};
    setCfg(next);
    store.set("habitaris_config", JSON.stringify(next));
  };
  const brand = useMemo(() => ({
    nombre: cfg.empresa?.nombre || "Habitaris",
    nit: cfg.empresa?.nit || "901.922.136-8",
    direccion: cfg.empresa?.direccion || "Bogotá D.C., Colombia",
    telefono: cfg.empresa?.telefono || "+57 350 566 1545",
    email: cfg.empresa?.email || "info@habitaris.co",
    web: cfg.empresa?.web || "www.habitaris.co",
    logo: cfg.apariencia?.logo || "/logo-habitaris-negro.svg",
    logoBlanco: cfg.apariencia?.logoBlanco || "/logo-habitaris-blanco.png",
    logoNegro: cfg.apariencia?.logoNegro || "/logo-habitaris-negro.svg",
    colorPrimario: cfg.apariencia?.colorPrimario || "#111111",
    colorAcento: cfg.apariencia?.colorAcento || "#111111",
    tipografia: cfg.apariencia?.tipografia || "DM Sans",
    slogan: cfg.apariencia?.slogan || "Arquitectura · Interiorismo",
  }), [cfg]);


  const [empleados, setEmpleados] = useState(() => {
    // Leer de RRHH primero, fallback a datos propios
    try {
      const rrhh = JSON.parse(store.getSync("hab:rrhh:empleados"));
      const cargos = (() => { try { return JSON.parse(store.getSync("hab:rrhh:cargos")) || []; } catch { return []; } })();
      if (rrhh && rrhh.length > 0) {
        return rrhh.filter(e => e.activo !== false).map(e => ({
          ...e,
          cargo: cargos.find(c => c.id === e.cargo)?.nombre || e.cargo || "",
          departamento: cargos.find(c => c.id === e.cargo)?.departamento || "",
          rh: e.rh || "", eps: e.eps || "", arl: e.arl || "",
          fechaIngreso: e.fechaIngreso || "",
          tipoDoc: e.tipoDoc || "CC",
        }));
      }
    } catch {}
    return load("empleados") || SAMPLE_EMPLOYEES;
  })
  const [selEmp, setSelEmp] = useState(null)
  const [carnetTpl, setCarnetTpl] = useState("classic")
  const [tarjetaTpl, setTarjetaTpl] = useState("corporate")
  const [showSide, setShowSide] = useState("front")
  const [batchMode, setBatchMode] = useState(false)
  const [batchSelected, setBatchSelected] = useState([])
  const [editEmp, setEditEmp] = useState(null)
  const [search, setSearch] = useState("")

  useEffect(() => save("empleados", empleados), [empleados])

  const empFilt = useMemo(() => {
    if(!search) return empleados
    const s = search.toLowerCase()
    return empleados.filter(e => e.nombre.toLowerCase().includes(s) || e.cargo.toLowerCase().includes(s) || e.departamento.toLowerCase().includes(s))
  }, [empleados, search])

  const activeEmp = selEmp ? empleados.find(e=>e.id===selEmp) : empFilt[0]

  const toggleBatch = (id) => {
    setBatchSelected(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id])
  }

  /* ── Tabs ── */
  const tabs = [
    {id:"marca", label:"Marca / Apariencia"},
   
    { id:"carnets",   icon:"🪪", label:"Carnets Corporativos" },
    { id:"tarjetas",  icon:"💳", label:"Tarjetas de Visita" },
    { id:"virtual",   icon:"📱", label:"Tarjeta Virtual" },
    { id:"empleados", icon:"👥", label:"Empleados" },
  ]

  /* ── Employee editor modal ── */
  const renderEditModal = () => {
    if(!editEmp) return null
    const isNew = !empleados.find(e=>e.id===editEmp.id)
    const upd = (k,v) => setEditEmp(prev=>({...prev,[k]:v}))
    const guardar = () => {
      if(isNew) setEmpleados(prev=>[...prev, editEmp])
      else setEmpleados(prev=>prev.map(e=>e.id===editEmp.id?editEmp:e))
      setEditEmp(null)
    }

    const fields = [
      ["nombre","Nombre completo","text"],
      ["cargo","Cargo","text"],
      ["departamento","Departamento","text"],
      ["email","Email corporativo","email"],
      ["telefono","Teléfono","tel"],
      ["tipoDoc","Tipo documento","text"],
      ["documento","Nº documento","text"],
      ["rh","Grupo sanguíneo","text"],
      ["eps","EPS","text"],
      ["arl","ARL","text"],
      ["contactoEmergencia","Contacto emergencia","text"],
      ["telEmergencia","Tel. emergencia","text"],
      ["fechaIngreso","Fecha ingreso","date"],
    ]

    return (
      <div style={{ position:"fixed", inset:0, zIndex:1000, background:"rgba(0,0,0,.4)",
        display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
        onClick={()=>setEditEmp(null)}>
        <div onClick={e=>e.stopPropagation()} style={{ background:"#fff", borderRadius:14, maxWidth:520,
          width:"100%", maxHeight:"85vh", overflow:"auto", padding:28 }}>
          <h2 style={{ ...F, fontSize:16, fontWeight:700, color:C.ink, marginBottom:16 }}>
            {isNew ? "➕ Nuevo empleado" : "✏️ Editar empleado"}
          </h2>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            {fields.map(([key,label,type]) => (
              <div key={key} style={{ gridColumn: key==="nombre" ? "1 / -1" : undefined }}>
                <label style={{ ...F, fontSize:10, fontWeight:600, color:C.inkLight }}>{label}</label>
                <input type={type} value={editEmp[key]||""} onChange={e=>upd(key,e.target.value)}
                  style={{ ...F, width:"100%", padding:"7px 10px", fontSize:12, border:`1px solid ${C.border}`,
                    borderRadius:5, boxSizing:"border-box" }} />
              </div>
            ))}
          </div>
          {/* Photo upload placeholder */}
          <div style={{ marginTop:12 }}>
            <label style={{ ...F, fontSize:10, fontWeight:600, color:C.inkLight }}>Foto (URL)</label>
            <input value={editEmp.foto||""} onChange={e=>upd("foto",e.target.value)}
              placeholder="https://ejemplo.com/foto.jpg"
              style={{ ...F, width:"100%", padding:"7px 10px", fontSize:12, border:`1px solid ${C.border}`,
                borderRadius:5, boxSizing:"border-box" }} />
          </div>
          <div style={{ display:"flex", gap:8, marginTop:20, justifyContent:"flex-end" }}>
            <button onClick={()=>setEditEmp(null)}
              style={{ ...F, padding:"8px 20px", fontSize:12, color:C.inkMid, background:C.bg,
                border:`1px solid ${C.border}`, borderRadius:6, cursor:"pointer" }}>
              Cancelar
            </button>
            <button onClick={guardar}
              style={{ ...F, padding:"8px 24px", fontSize:12, fontWeight:700, color:"#fff",
                background:C.accent, border:"none", borderRadius:6, cursor:"pointer" }}>
              💾 Guardar
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ═══ CARNETS TAB ═══ */
  const renderMarca = () => {
    const T = {ink:"#111",inkMid:"#666",inkLight:"#999",border:"#E4E1DB",green:"#2D6A2E",surfaceAlt:"#F9F8F6"};
    const inp = {width:"100%",padding:"10px 12px",borderRadius:6,border:"1px solid #ddd",fontSize:13,fontFamily:"'DM Sans',sans-serif",background:"#fff"};
    return (
      <div style={{maxWidth:600}}>
        <div style={{background:"#fff",borderRadius:12,border:"1px solid #E4E1DB",padding:24,marginBottom:16}}>
          <h3 style={{margin:"0 0 16px",fontSize:16,fontWeight:700}}>Logo</h3>
          <div style={{marginBottom:12}}>
            <label style={{fontSize:9,fontWeight:700,color:T.inkMid,textTransform:"uppercase",display:"block",marginBottom:4}}>URL del logo</label>
            <input style={inp} value={apariencia.logo||""} onChange={e=>updateApariencia("logo",e.target.value)} placeholder="https://..." />
          </div>
          <img src={apariencia.logo || "/logo-habitaris-negro.svg"} alt="Logo" style={{height:40,objectFit:"contain",marginBottom:8}} />
        </div>

        <div style={{background:"#fff",borderRadius:12,border:"1px solid #E4E1DB",padding:24,marginBottom:16}}>
          <h3 style={{margin:"0 0 16px",fontSize:16,fontWeight:700}}>Colores</h3>
          {[
            {key:"colorPrimario",label:"Color primario",def:"#111111"},
            {key:"colorSecundario",label:"Color secundario",def:"#3B3B3B"},
            {key:"colorAcento",label:"Color acento",def:"#111111"},
          ].map(c => (
            <div key={c.key} style={{marginBottom:12,display:"flex",alignItems:"center",gap:12}}>
              <input type="color" value={apariencia[c.key]||c.def} onChange={e=>updateApariencia(c.key,e.target.value)} style={{width:36,height:36,border:"1px solid #ddd",borderRadius:6,cursor:"pointer",padding:2}} />
              <div style={{flex:1}}>
                <label style={{fontSize:9,fontWeight:700,color:T.inkMid,textTransform:"uppercase"}}>{c.label}</label>
                <input style={{...inp,marginTop:4}} value={apariencia[c.key]||c.def} onChange={e=>updateApariencia(c.key,e.target.value)} />
              </div>
            </div>
          ))}
        </div>

        <div style={{background:"#fff",borderRadius:12,border:"1px solid #E4E1DB",padding:24,marginBottom:16}}>
          <h3 style={{margin:"0 0 16px",fontSize:16,fontWeight:700}}>Tipografia y slogan</h3>
          <div style={{marginBottom:12}}>
            <label style={{fontSize:9,fontWeight:700,color:T.inkMid,textTransform:"uppercase",display:"block",marginBottom:4}}>Tipografia</label>
            <select style={{...inp,cursor:"pointer"}} value={apariencia.tipografia||"DM Sans"} onChange={e=>updateApariencia("tipografia",e.target.value)}>
              {["DM Sans","Inter","Poppins","Roboto","Montserrat","Lato","Open Sans","Raleway","Playfair Display"].map(f=><option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div style={{marginBottom:12}}>
            <label style={{fontSize:9,fontWeight:700,color:T.inkMid,textTransform:"uppercase",display:"block",marginBottom:4}}>Slogan</label>
            <input style={inp} value={apariencia.slogan||""} onChange={e=>updateApariencia("slogan",e.target.value)} placeholder="Tu slogan aqui..." />
          </div>
        </div>

        <div style={{background:"#fff",borderRadius:12,border:"1px solid #E4E1DB",padding:24}}>
          <h3 style={{margin:"0 0 12px",fontSize:16,fontWeight:700}}>Vista previa</h3>
          <div style={{padding:16,borderRadius:8,background:apariencia.colorPrimario||"#111",color:"#fff",fontFamily:apariencia.tipografia||"DM Sans"}}>
            <img src={apariencia.logoBlanco || apariencia.logo || "/logo-habitaris-blanco.png"} alt="" style={{height:28,objectFit:"contain",marginBottom:8,display:"block"}} />
            <div style={{fontSize:14,fontWeight:700,letterSpacing:1}}>{cfg.empresa?.nombre||"HABITARIS"}</div>
            <div style={{fontSize:10,opacity:0.6,marginTop:2}}>{apariencia.slogan||"Tu slogan"}</div>
          </div>
        </div>
      </div>
    );
  };

  const renderCarnets = () => {
    const Renderer = CARNET_RENDERERS[carnetTpl]
    return (
      <div>
        {/* Template selector */}
        <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
          {CARNET_TEMPLATES.map(t => (
            <button key={t.id} onClick={()=>setCarnetTpl(t.id)}
              style={{ ...F, padding:"8px 16px", fontSize:11, fontWeight: carnetTpl===t.id?700:500,
                color: carnetTpl===t.id?"#fff":C.inkMid,
                background: carnetTpl===t.id?C.accent:C.surface,
                border:`1px solid ${carnetTpl===t.id?C.accent:C.border}`, borderRadius:6, cursor:"pointer" }}>
              {t.label}
            </button>
          ))}
          <div style={{ flex:1 }} />
          <button onClick={()=>setShowSide(s=>s==="front"?"back":"front")}
            style={{ ...F, padding:"8px 14px", fontSize:11, color:C.info, background:C.infoBg,
              border:`1px solid ${C.info}33`, borderRadius:6, cursor:"pointer" }}>
            🔄 {showSide==="front"?"Ver reverso":"Ver frente"}
          </button>
          <button onClick={()=>setBatchMode(!batchMode)}
            style={{ ...F, padding:"8px 14px", fontSize:11, fontWeight:600,
              color: batchMode?C.danger:C.inkMid, background: batchMode?C.dangerBg:C.surface,
              border:`1px solid ${batchMode?C.danger+"33":C.border}`, borderRadius:6, cursor:"pointer" }}>
            {batchMode ? "✕ Cancelar lote" : "🖨 Imprimir lote"}
          </button>
        </div>

        <div style={{ display:"flex", gap:20 }}>
          {/* Employee list */}
          <div style={{ width:200, flexShrink:0 }}>
            <div style={{ marginBottom:8 }}>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar…"
                style={{ ...F, width:"100%", padding:"6px 10px", fontSize:11, border:`1px solid ${C.border}`, borderRadius:5, boxSizing:"border-box" }} />
            </div>
            {empFilt.map(e => (
              <div key={e.id} onClick={()=>{ setSelEmp(e.id); if(batchMode) toggleBatch(e.id) }}
                style={{ display:"flex", gap:8, alignItems:"center", padding:"8px 10px", borderRadius:6,
                  cursor:"pointer", marginBottom:2, transition:"all .1s",
                  background: selEmp===e.id ? C.accentBg : batchSelected.includes(e.id) ? C.infoBg : "transparent",
                  border:`1px solid ${selEmp===e.id ? C.accent+"33" : "transparent"}` }}>
                {batchMode && (
                  <input type="checkbox" checked={batchSelected.includes(e.id)} readOnly
                    style={{ accentColor:C.accent }} />
                )}
                <div style={{ width:28, height:28, borderRadius:"50%", background:C.bg,
                  display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:C.accent, flexShrink:0 }}>
                  {e.nombre[0]}
                </div>
                <div style={{ minWidth:0 }}>
                  <div style={{ ...F, fontSize:11, fontWeight:600, color:C.ink, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{e.nombre}</div>
                  <div style={{ ...F, fontSize:9, color:C.inkLight }}>{e.cargo}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Preview */}
          <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center" }}>
            {batchMode && batchSelected.length > 0 ? (
              <BatchPrintPreview empleados={empleados.filter(e=>batchSelected.includes(e.id))}
                brand={brand} tipo="carnet" template={carnetTpl} />
            ) : activeEmp ? (
              <div>
                <div style={{ ...F, fontSize:10, color:C.inkLight, textAlign:"center", marginBottom:8 }}>
                  {showSide==="front"?"FRENTE":"REVERSO"} — Plantilla: {CARNET_TEMPLATES.find(t=>t.id===carnetTpl)?.label}
                </div>
                <div style={{ transform:"scale(1.2)", transformOrigin:"top center", marginBottom:40 }}>
                  <Renderer emp={activeEmp} brand={brand} side={showSide} />
                </div>
                <div style={{ ...F, fontSize:10, color:C.inkLight, textAlign:"center", marginTop:60 }}>
                  Tamaño: 85.6mm × 54mm (estándar ISO/IEC 7810 CR80)
                </div>
              </div>
            ) : (
              <div style={{ ...F, textAlign:"center", padding:40, color:C.inkLight }}>
                <div style={{ fontSize:32, marginBottom:8 }}>🪪</div>
                <p style={{ fontSize:13 }}>Selecciona un empleado para ver su carnet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  /* ═══ TARJETAS TAB ═══ */
  const renderTarjetas = () => {
    const Renderer = TARJETA_RENDERERS[tarjetaTpl]
    return (
      <div>
        <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
          {TARJETA_TEMPLATES.map(t => (
            <button key={t.id} onClick={()=>setTarjetaTpl(t.id)}
              style={{ ...F, padding:"8px 16px", fontSize:11, fontWeight: tarjetaTpl===t.id?700:500,
                color: tarjetaTpl===t.id?"#fff":C.inkMid,
                background: tarjetaTpl===t.id?C.accent:C.surface,
                border:`1px solid ${tarjetaTpl===t.id?C.accent:C.border}`, borderRadius:6, cursor:"pointer" }}>
              {t.label}
            </button>
          ))}
          <div style={{ flex:1 }} />
          <button onClick={()=>setShowSide(s=>s==="front"?"back":"front")}
            style={{ ...F, padding:"8px 14px", fontSize:11, color:C.info, background:C.infoBg,
              border:`1px solid ${C.info}33`, borderRadius:6, cursor:"pointer" }}>
            🔄 {showSide==="front"?"Ver reverso":"Ver frente"}
          </button>
        </div>

        <div style={{ display:"flex", gap:20 }}>
          <div style={{ width:200, flexShrink:0 }}>
            <div style={{ marginBottom:8 }}>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar…"
                style={{ ...F, width:"100%", padding:"6px 10px", fontSize:11, border:`1px solid ${C.border}`, borderRadius:5, boxSizing:"border-box" }} />
            </div>
            {empFilt.map(e => (
              <div key={e.id} onClick={()=>setSelEmp(e.id)}
                style={{ display:"flex", gap:8, alignItems:"center", padding:"8px 10px", borderRadius:6,
                  cursor:"pointer", marginBottom:2,
                  background: selEmp===e.id ? C.accentBg : "transparent",
                  border:`1px solid ${selEmp===e.id ? C.accent+"33" : "transparent"}` }}>
                <div style={{ width:28, height:28, borderRadius:"50%", background:C.bg,
                  display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:C.accent, flexShrink:0 }}>
                  {e.nombre[0]}
                </div>
                <div style={{ minWidth:0 }}>
                  <div style={{ ...F, fontSize:11, fontWeight:600, color:C.ink, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{e.nombre}</div>
                  <div style={{ ...F, fontSize:9, color:C.inkLight }}>{e.cargo}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center" }}>
            {activeEmp ? (
              <div>
                <div style={{ ...F, fontSize:10, color:C.inkLight, textAlign:"center", marginBottom:8 }}>
                  {showSide==="front"?"FRENTE":"REVERSO"} — Plantilla: {TARJETA_TEMPLATES.find(t=>t.id===tarjetaTpl)?.label}
                </div>
                <div style={{ transform:"scale(1.15)", transformOrigin:"top center", marginBottom:30 }}>
                  <Renderer emp={activeEmp} brand={brand} side={showSide} />
                </div>
                <div style={{ ...F, fontSize:10, color:C.inkLight, textAlign:"center", marginTop:50 }}>
                  Tamaño: 90mm × 50mm (estándar europeo)
                </div>
              </div>
            ) : (
              <div style={{ ...F, textAlign:"center", padding:40, color:C.inkLight }}>
                <div style={{ fontSize:32, marginBottom:8 }}>💳</div>
                <p style={{ fontSize:13 }}>Selecciona un empleado</p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  /* ═══ VIRTUAL TAB ═══ */
  const renderVirtual = () => (
    <div>
      <div style={{ display:"flex", gap:20 }}>
        <div style={{ width:200, flexShrink:0 }}>
          <div style={{ marginBottom:8 }}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar…"
              style={{ ...F, width:"100%", padding:"6px 10px", fontSize:11, border:`1px solid ${C.border}`, borderRadius:5, boxSizing:"border-box" }} />
          </div>
          {empFilt.map(e => (
            <div key={e.id} onClick={()=>setSelEmp(e.id)}
              style={{ display:"flex", gap:8, alignItems:"center", padding:"8px 10px", borderRadius:6,
                cursor:"pointer", marginBottom:2,
                background: selEmp===e.id ? C.accentBg : "transparent",
                border:`1px solid ${selEmp===e.id ? C.accent+"33" : "transparent"}` }}>
              <div style={{ width:28, height:28, borderRadius:"50%", background:C.bg,
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:C.accent, flexShrink:0 }}>
                {e.nombre[0]}
              </div>
              <div style={{ minWidth:0 }}>
                <div style={{ ...F, fontSize:11, fontWeight:600, color:C.ink, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{e.nombre}</div>
                <div style={{ ...F, fontSize:9, color:C.inkLight }}>{e.cargo}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center" }}>
          {activeEmp ? (
            <div>
              <div style={{ ...F, fontSize:10, color:C.inkLight, textAlign:"center", marginBottom:12 }}>
                TARJETA VIRTUAL — vista previa móvil
              </div>
              <VirtualCardPreview emp={activeEmp} brand={brand} />
              <div style={{ display:"flex", gap:8, justifyContent:"center", marginTop:20 }}>
                <button style={{ ...F, padding:"8px 18px", fontSize:11, fontWeight:600,
                  color:C.accent, background:C.accentBg, border:`1px solid ${C.accent}33`, borderRadius:6, cursor:"pointer" }}>
                  📋 Copiar enlace
                </button>
                <button style={{ ...F, padding:"8px 18px", fontSize:11, fontWeight:600,
                  color:C.info, background:C.infoBg, border:`1px solid ${C.info}33`, borderRadius:6, cursor:"pointer" }}>
                  📤 Compartir WhatsApp
                </button>
                <button style={{ ...F, padding:"8px 18px", fontSize:11, fontWeight:600,
                  color:C.inkMid, background:C.surface, border:`1px solid ${C.border}`, borderRadius:6, cursor:"pointer" }}>
                  📥 Descargar vCard
                </button>
              </div>
              <div style={{ ...F, fontSize:10, color:C.inkLight, textAlign:"center", marginTop:12 }}>
                El destinatario puede guardar el contacto directamente escaneando el QR
              </div>
            </div>
          ) : (
            <div style={{ ...F, textAlign:"center", padding:40, color:C.inkLight }}>
              <div style={{ fontSize:32, marginBottom:8 }}>📱</div>
              <p style={{ fontSize:13 }}>Selecciona un empleado</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  /* ═══ EMPLEADOS TAB ═══ */
  const renderEmpleados = () => (
    <div>
      <div style={{ display:"flex", gap:10, marginBottom:16, alignItems:"center" }}>
        <div style={{ flex:1 }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por nombre, cargo, departamento…"
            style={{ ...F, width:"100%", padding:"8px 12px", fontSize:12, border:`1px solid ${C.border}`, borderRadius:6, boxSizing:"border-box" }} />
        </div>
        <button onClick={()=>setEditEmp({ id:genId(), nombre:"", cargo:"", departamento:"", email:"", telefono:"",
          tipoDoc:"CC", documento:"", rh:"O+", eps:"", arl:"", contactoEmergencia:"", telEmergencia:"", carnetGenerado:false, fechaIngreso:new Date().toISOString().slice(0,10), foto:null })}
          style={{ ...F, padding:"8px 18px", fontSize:11, fontWeight:700, color:"#fff",
            background:C.accent, border:"none", borderRadius:6, cursor:"pointer" }}>
          + Nuevo empleado
        </button>
      </div>

      <div style={{ background:"#fff", borderRadius:10, border:`1px solid ${C.border}`, overflow:"hidden" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
          <thead>
            <tr style={{ background:C.surface }}>
              {["","Nombre","Cargo","Depto","RH","EPS","ARL","Carnet",""].map((h,i) => (
                <th key={i} style={{ ...F, padding:"10px 12px", textAlign:"left", fontSize:10, fontWeight:600,
                  color:C.inkLight, borderBottom:`1px solid ${C.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {empFilt.map(e => (
              <tr key={e.id} style={{ borderBottom:`1px solid ${C.border}` }}
                onMouseEnter={ev=>ev.currentTarget.style.background=C.surface}
                onMouseLeave={ev=>ev.currentTarget.style.background="transparent"}>
                <td style={{ padding:"8px 12px" }}>
                  <div style={{ width:32, height:32, borderRadius:"50%", background:C.accentBg,
                    display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:700, color:C.accent }}>
                    {e.nombre[0]}
                  </div>
                </td>
                <td style={{ ...F, padding:"8px 12px", fontWeight:600, color:C.ink }}>{e.nombre}</td>
                <td style={{ ...F, padding:"8px 12px", color:C.inkMid }}>{e.cargo}</td>
                <td style={{ ...F, padding:"8px 12px", color:C.inkMid }}>{e.departamento}</td>
                <td style={{ ...F, padding:"8px 12px" }}>
                  <span style={{ fontWeight:700, color:"#B91C1C", fontSize:13 }}>{e.rh}</span>
                </td>
                <td style={{ ...F, padding:"8px 12px", color:C.inkMid, fontSize:11 }}>{e.eps||"—"}</td>
                <td style={{ ...F, padding:"8px 12px", color:C.inkMid, fontSize:11 }}>{e.arl||"—"}</td>
                <td style={{ ...F, padding:"8px 12px", textAlign:"center" }}>
                  <button onClick={()=>{const next=empleados.map(x=>x.id===e.id?{...x,carnetGenerado:!x.carnetGenerado}:x);setEmpleados(next);save("empleados",next);}} style={{background:"none",border:"none",cursor:"pointer",fontSize:14,padding:0}}>
                      {e.carnetGenerado ? "✅" : "❌"}
                    </button>
                </td>
                <td style={{ padding:"8px 12px" }}>
                  <button onClick={()=>setEditEmp({...e})}
                    style={{ ...F, padding:"4px 10px", fontSize:10, color:C.accent, background:C.accentBg,
                      border:`1px solid ${C.accent}33`, borderRadius:4, cursor:"pointer" }}>
                    ✏️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ ...F, fontSize:10, color:C.inkLight, marginTop:12 }}>
        💡 Tip: Los empleados se sincronizan desde RRHH. Marca ✅ cuando el carnet esté generado.
      </p>
    </div>
  )

  /* ═══════ RENDER ═══════ */
  return (
    <div style={{ ...F, padding:24 }}>
      <div style={{ marginBottom:20 }}>
        <h1 style={{ ...F, fontSize:22, fontWeight:700, color:C.ink, margin:"0 0 4px" }}>🪪 Identidad Corporativa</h1>
        <p style={{ ...F, fontSize:12, color:C.inkLight, margin:0 }}>Carnets corporativos, tarjetas de visita físicas y virtuales con la identidad de {brand.nombre}</p>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:2, borderBottom:`1px solid ${C.border}`, marginBottom:20 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{ ...F, padding:"10px 18px", fontSize:12, fontWeight: tab===t.id?700:500,
              color: tab===t.id ? C.accent : C.inkLight,
              background:"none", border:"none", borderBottom: tab===t.id ? `2px solid ${C.accent}` : "2px solid transparent",
              cursor:"pointer", transition:"all .15s" }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === "marca" && renderMarca()}
      {tab === "carnets" && renderCarnets()}
      {tab === "tarjetas" && renderTarjetas()}
      {tab === "virtual" && renderVirtual()}
      {tab === "empleados" && renderEmpleados()}

      {renderEditModal()}
    </div>
  )
}
