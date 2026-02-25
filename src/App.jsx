import React, { useState, Suspense, useMemo } from 'react'
import CRM  from './modules/CRM.jsx'
import RRHH from './modules/RRHH.jsx'
import Herramientas from './modules/Herramientas.jsx'
import Logistica from './modules/Logistica.jsx'
import Aprobaciones from './modules/Aprobaciones.jsx'
import Proyectos from './modules/Proyectos.jsx'
import Biblioteca from './modules/Biblioteca.jsx'
import Contabilidad from './modules/Contabilidad.jsx'
import SST from './modules/SST.jsx'
import Formacion from './modules/Formacion.jsx'
import IdentidadCorporativa from './modules/IdentidadCorporativa.jsx'
import FirmaDigital from './modules/FirmaDigital.jsx'
import Legal from './modules/Legal.jsx'
import Calidad from './modules/Calidad.jsx'
import Postventa from './modules/Postventa.jsx'
import Administracion from './modules/Administracion.jsx'
import Flotas from './modules/Flotas.jsx'
import Compras from './modules/Compras.jsx'
import Dashboard from './modules/Dashboard.jsx'
import Formularios from './modules/Formularios.jsx'
import Configuracion, { getConfig } from './modules/Configuracion.jsx'
import PortalCliente from './modules/PortalCliente.jsx'
import FormularioPublico from './modules/FormularioPublico.jsx'
import LoginScreen, { isLoggedIn, login as doLogin, logout, isAuthConfigured } from './modules/Login.jsx'

export const C = {
  ink:"#111111", inkMid:"#555555", inkLight:"#999999",
  bg:"#F5F5F5", surface:"#FFFFFF", border:"#E0E0E0",
  accent:"#111111", accentBg:"#EBEBEB",
  info:"#3B3B3B", infoBg:"#F0F0F0",
  warning:"#8C6A00", success:"#2D6A2E", danger:"#B91C1C",
  shadow:"0 1px 4px rgba(0,0,0,.06)", shadowMd:"0 4px 16px rgba(0,0,0,.10)",
}

const MODULES = [
  { id:"dashboard",    label:"Dashboard",               icon:"📊", desc:"KPIs financieros, alertas, flujo caja, vista consolidada empresa",    color:"#111111", component:Dashboard,    ready:true  },
  { id:"formularios", label:"Formularios",              icon:"📋", desc:"Constructor, plantillas, lógica condicional, compartir WhatsApp/email", color:"#5B3A8C", component:Formularios,  ready:true  },
  { id:"crm",          label:"CRM / Ofertas",          icon:"📋", desc:"Ofertas, clientes, proveedores, APU, borrador y presupuesto",         color:"#1E6B42", component:CRM,          ready:true  },
  { id:"rrhh",         label:"RRHH",                   icon:"👷", desc:"Equipo, cargos, partes de trabajo, asistencia y nómina",               color:"#1E4F8C", component:RRHH,         ready:true  },
  { id:"herramientas", label:"Herramientas Técnicas",   icon:"🔧", desc:"Cuadro de cargas, concreto, cubicación, materiales, unidades",         color:"#7A5218", component:Herramientas, ready:true  },
  { id:"logistica",    label:"Logística",               icon:"📦", desc:"Almacén, EPPs, dotaciones, herramientas, equipos, compras y proveedores", color:"#0D5E6E", component:Logistica,    ready:true  },
  { id:"compras",      label:"Compras",                 icon:"🛒", desc:"Órdenes de compra, recepción mercancía, evaluación proveedores",       color:"#0D5E6E", component:Compras,      ready:true  },
  { id:"aprobaciones", label:"Aprobaciones",             icon:"✅", desc:"Flujos de aprobación, cadenas, umbrales y permisos por módulo",           color:"#D4840A", component:Aprobaciones, ready:true  },
  { id:"proyectos",    label:"Proyectos",               icon:"📅", desc:"Gantt, avances, seguimiento de obra y control de calidad",             color:"#5B3A8C", component:Proyectos,    ready:true  },
  { id:"biblioteca",   label:"Biblioteca",              icon:"📚", desc:"APUs normalizados, materiales, precios unitarios y textos tipo",       color:"#0D5E6E", component:Biblioteca,   ready:true  },
  { id:"contabilidad", label:"Contabilidad",            icon:"📊", desc:"Facturación, costos reales, ingresos, egresos e informes",             color:"#555555", component:Contabilidad, ready:true  },
  { id:"sst",          label:"SST",                    icon:"🦺", desc:"Seguridad y salud en el trabajo, inspecciones y riesgos",              color:"#AE2C2C", component:SST,          ready:true  },
  { id:"formacion",    label:"Formación",               icon:"🎓", desc:"Cursos obligatorios y operativos, evaluaciones, certificados, control de vencimientos", color:"#5B3A8C", component:Formacion,    ready:true  },
  { id:"carnets",      label:"Identidad Corporativa",   icon:"🪪", desc:"Carnets, tarjetas de visita físicas y virtuales, QR de contacto, branding del equipo", color:"#0D5E6E", component:IdentidadCorporativa,      ready:true  },
  { id:"firmas",       label:"Firma Digital",            icon:"✍️", desc:"Firma de documentos con pad digital, trazabilidad, firmas guardadas y certificados",  color:"#5B3A8C", component:FirmaDigital, ready:true  },
  { id:"legal",        label:"Legal",                    icon:"⚖️", desc:"Plantillas contractuales, pólizas/seguros, procesos legales, comunicaciones",        color:"#1E4F8C", component:Legal,        ready:true  },
  { id:"calidad",      label:"Calidad y Auditoría",    icon:"🔍", desc:"No conformidades, auditorías, protocolos, checklists e indicadores",   color:"#0D7377", component:Calidad,      ready:true  },
  { id:"postventa",    label:"Postventa",               icon:"🏡", desc:"Garantías, incidencias y atención al cliente post-entrega",           color:"#1E4F8C", component:Postventa,    ready:true  },
  { id:"admin",        label:"Administración",          icon:"💼", desc:"Caja chica, tarjeta corporativa, viáticos, flujo empresa, CxC/CxP",  color:"#6B5B8C", component:Administracion, ready:true  },
  { id:"flotas",       label:"Control de Flotas",       icon:"🚗", desc:"Vehículos, kilómetros, combustible, documentación, mantenimiento",   color:"#2E5E4E", component:Flotas,         ready:true  },
  { id:"config",       label:"Configuración",           icon:"⚙️", desc:"Empresa, correo, WhatsApp, legal, apariencia — ajustes globales",    color:"#555555", component:Configuracion,  ready:true  },
]

const F = { fontFamily:"'DM Sans',sans-serif" }

function Spinner() {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", flexDirection:"column", gap:16 }}>
      <div style={{ width:40, height:40, border:"3px solid #E4E1DB", borderTopColor:"#1E6B42", borderRadius:"50%", animation:"spin 0.8s linear infinite" }}/>
      <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
      <p style={{ ...F, fontSize:13, color:"#888" }}>Cargando módulo…</p>
    </div>
  )
}

function LangSwitch({ lang, setLang }) {
  return (
    <div style={{ display:"flex", gap:4 }}>
      {[["es","🇪🇸 Español"],["en","🇬🇧 English"]].map(([code,lbl]) => (
        <button key={code} onClick={() => setLang(code)}
          style={{ ...F, padding:"4px 10px", borderRadius:4, border:"none", cursor:"pointer",
            fontSize:10, fontWeight:600,
            background: lang===code ? "#1E6B42" : "rgba(255,255,255,0.12)",
            color: lang===code ? "#fff" : "rgba(255,255,255,0.55)",
            transition:"all .15s" }}>
          {lbl}
        </button>
      ))}
    </div>
  )
}

function Home({ onSelect, lang, setLang, onLogout }) {
  const ready  = MODULES.filter(m => m.ready)
  const coming = MODULES.filter(m => !m.ready)
  const brand = useMemo(() => getConfig(), [])
  const ap = brand.apariencia || {}
  const cp = ap.colorPrimario || "#111"
  const bf = ap.tipografia || "DM Sans"
  return (
    <div style={{ minHeight:"100vh", background:"#F0EEE9" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=${bf.replace(/ /g,"+")}:wght@300;400;500;600;700;800&display=swap');`}</style>
      <div style={{ background:cp, padding:"0 28px", height:52,
        display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          {ap.logo ? (
            <img src={ap.logo} alt="Logo" style={{ height:28, objectFit:"contain" }}/>
          ) : (
            <span style={{ fontFamily:`'${bf}',sans-serif`, fontSize:17, fontWeight:700, color:"#fff", letterSpacing:2, textTransform:"uppercase" }}>{brand.empresa?.nombre||"HABITARIS"}</span>
          )}
          {ap.slogan && <span style={{ fontFamily:`'${bf}',sans-serif`, fontSize:8, letterSpacing:1.5, color:"rgba(255,255,255,.35)", textTransform:"uppercase" }}>{ap.slogan}</span>}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <LangSwitch lang={lang} setLang={setLang} />
          {onLogout && <button onClick={onLogout}
            style={{ ...F, padding:"4px 12px", borderRadius:4, border:"1px solid rgba(255,255,255,0.15)", cursor:"pointer",
              fontSize:10, fontWeight:600, background:"rgba(255,255,255,0.08)", color:"rgba(255,255,255,0.55)", transition:"all .15s" }}
            onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,0.18)"}
            onMouseLeave={e => e.currentTarget.style.background="rgba(255,255,255,0.08)"}>
            🔒 Salir
          </button>}
        </div>
      </div>
      {ap.colorAcento && <div style={{ height:3, background:`linear-gradient(90deg,${ap.colorAcento},${ap.colorAcento}88,${ap.colorAcento})` }}/>}
      <div style={{ maxWidth:920, margin:"0 auto", padding:"48px 28px 40px" }}>
        <p style={{ fontFamily:`'${bf}',sans-serif`, fontSize:10, color:"#888", letterSpacing:1.5, textTransform:"uppercase", marginBottom:6 }}>Suite de gestión</p>
        <h1 style={{ fontFamily:`'${bf}',sans-serif`, fontSize:30, fontWeight:700, color:"#111", marginBottom:4, letterSpacing:-0.5 }}>Selecciona un módulo</h1>
        <p style={{ fontFamily:`'${bf}',sans-serif`, fontSize:13, color:"#888", marginBottom:40 }}>{brand.empresa?.nombre||"Habitaris"} · {lang==="es"?"Español":"English"}</p>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(240px,1fr))", gap:14, marginBottom:36 }}>
          {ready.map(m => (
            <button key={m.id} onClick={() => onSelect(m.id)}
              style={{ background:"#fff", border:"1px solid #E4E1DB", borderRadius:10,
                padding:22, textAlign:"left", cursor:"pointer", transition:"all .15s",
                boxShadow:"0 1px 4px rgba(0,0,0,.06)", fontFamily:"'DM Sans',sans-serif" }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,.10)"; e.currentTarget.style.borderColor=m.color }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,.06)"; e.currentTarget.style.borderColor="#E4E1DB" }}>
              <div style={{ fontSize:26, marginBottom:10 }}>{m.icon}</div>
              <div style={{ ...F, fontSize:14, fontWeight:700, color:"#111", marginBottom:4 }}>{m.label}</div>
              <div style={{ ...F, fontSize:11, color:"#888", lineHeight:1.5, marginBottom:12 }}>{m.desc}</div>
              <div style={{ ...F, fontSize:10, fontWeight:700, color:m.color, textTransform:"uppercase", letterSpacing:0.8 }}>Abrir →</div>
            </button>
          ))}
        </div>

        <p style={{ ...F, fontSize:10, color:"#AAA", letterSpacing:1.5, textTransform:"uppercase", marginBottom:10 }}>Próximamente</p>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(190px,1fr))", gap:10 }}>
          {coming.map(m => (
            <div key={m.id} style={{ background:"#FAFAF8", border:"1px solid #E4E1DB",
              borderRadius:8, padding:"13px 15px", opacity:0.6, fontFamily:"'DM Sans',sans-serif" }}>
              <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:4 }}>
                <span style={{ fontSize:17 }}>{m.icon}</span>
                <span style={{ fontSize:12, fontWeight:600, color:"#555" }}>{m.label}</span>
              </div>
              <div style={{ fontSize:10, color:"#999", lineHeight:1.5, marginBottom:7 }}>{m.desc}</div>
              <div style={{ fontSize:9, fontWeight:700, color:"#AAA", textTransform:"uppercase", letterSpacing:0.8 }}>En desarrollo</div>
            </div>
          ))}
        </div>
        <p style={{ ...F, marginTop:40, fontSize:11, color:"#AAA", textAlign:"center" }}>
          v1.0 · Habitaris S.A.S · NIT 901.922.136-8 · Bogotá D.C.
        </p>
      </div>
    </div>
  )
}

function ModuleBar({ mod, onBack, lang, setLang, onLogout }) {
  const brand = useMemo(() => getConfig(), [])
  const ap = brand.apariencia || {}
  const cp = ap.colorPrimario || "#111"
  const bf = ap.tipografia || "DM Sans"
  return (
    <div style={{ position:"fixed", top:0, left:0, right:0, height:48, background:cp,
      zIndex:1000, display:"flex", alignItems:"center", padding:"0 18px", gap:14,
      fontFamily:`'${bf}',sans-serif` }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=${bf.replace(/ /g,"+")}:wght@300;400;500;600;700;800&display=swap');`}</style>
      <button onClick={onBack}
        style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 12px",
          background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.15)",
          borderRadius:5, cursor:"pointer", color:"rgba(255,255,255,0.65)",
          fontSize:12, fontWeight:500, transition:"all .15s", fontFamily:`'${bf}',sans-serif` }}
        onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,0.18)"}
        onMouseLeave={e => e.currentTarget.style.background="rgba(255,255,255,0.1)"}>
        ← Módulos
      </button>
      <div style={{ width:1, height:18, background:"rgba(255,255,255,0.15)" }}/>
      <span style={{ fontSize:13, color:"rgba(255,255,255,0.35)" }}>{mod.icon}</span>
      {ap.logo ? (
        <img src={ap.logo} alt="Logo" style={{ height:22, objectFit:"contain" }}/>
      ) : (
        <span style={{ fontSize:13, fontWeight:700, color:"#fff", letterSpacing:0.3, textTransform:"uppercase" }}>{brand.empresa?.nombre||"HABITARIS"}</span>
      )}
      <span style={{ fontSize:13, color:"rgba(255,255,255,0.4)" }}>/ {mod.label}</span>
      <div style={{ flex:1 }}/>
      <LangSwitch lang={lang} setLang={setLang} />
      {onLogout && <button onClick={onLogout}
        style={{ marginLeft:8, padding:"4px 10px", borderRadius:4, border:"1px solid rgba(255,255,255,0.15)", cursor:"pointer",
          fontSize:10, fontWeight:600, background:"rgba(255,255,255,0.08)", color:"rgba(255,255,255,0.55)",
          fontFamily:`'${bf}',sans-serif`, transition:"all .15s" }}
        onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,0.18)"}
        onMouseLeave={e => e.currentTarget.style.background="rgba(255,255,255,0.08)"}>
        🔒 Salir
      </button>}
      <div style={{ position:"absolute", bottom:0, left:0, right:0, height:2,
        background:`linear-gradient(90deg, ${mod.color}, ${mod.color}44)` }}/>
    </div>
  )
}

export default function App() {
  const [active, setActive] = useState(() => sessionStorage.getItem("hab:active_module") || null)
  const [lang, setLang]     = useState("es")
  const [authed, setAuthed]   = useState(isLoggedIn())
  const mod = MODULES.find(m => m.id === active)

  const selectModule = (id) => { sessionStorage.setItem("hab:active_module", id); setActive(id); }
  const goHome = () => { sessionStorage.removeItem("hab:active_module"); setActive(null); }
  const doLogout = () => { logout(); setAuthed(false); }

  // Public routes — no login required
  const path = window.location.pathname
  if (path.startsWith("/portal")) return <PortalCliente />
  if (path.startsWith("/form")) return <FormularioPublico />

  // Auth gate — only if auth is configured
  if (!authed) {
    return <LoginScreen onSuccess={() => setAuthed(true)} />
  }

  if (!active || !mod?.component) {
    return <Home onSelect={selectModule} lang={lang} setLang={setLang} onLogout={isAuthConfigured() ? doLogout : null} />
  }

  const MC = mod.component
  return (
    <div style={{ minHeight:"100vh", background:"#F0EEE9", paddingTop:48 }}>
      <ModuleBar mod={mod} onBack={goHome} lang={lang} setLang={setLang} onLogout={isAuthConfigured() ? doLogout : null} />
      <Suspense fallback={<Spinner />}>
        <MC lang={lang} />
      </Suspense>
    </div>
  )
}
