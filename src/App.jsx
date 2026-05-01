import React, { useState, Suspense, useMemo } from 'react'
import { store } from "./core/store.js";
import { tenant } from "./core/tenant.js";
import { useTenant } from "./core/TenantContext.jsx";
import { ToastContainer } from "./core/Toast.jsx";

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
import Comunicaciones from './modules/Comunicaciones.jsx'
import Calendario, { CalendarioPublico } from './modules/Calendario.jsx'
import PortalCliente from './modules/PortalCliente.jsx'
import FormularioPublico from './modules/FormularioPublico.jsx'
import Usuarios from './modules/Usuarios.jsx'
import Holding from './modules/Holding.jsx'
import Pais from './modules/Pais.jsx'
import LoginScreen, { isLoggedIn, login as doLogin, logout, isAuthConfigured } from './modules/Login.jsx'
import AprobarExterno from './modules/AprobarExterno.jsx'
import RecuperarPassword from './modules/RecuperarPassword.jsx'

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
  { id:"formularios", label:"Formularios",              icon:"📋", desc:"Constructor, plantillas, lógica condicional, compartir WhatsApp/email", color:"#111111", component:Formularios,  ready:true  },
  { id:"crm",          label:"CRM / Ofertas",          icon:"💼", desc:"Ofertas, clientes, proveedores, APU, borrador y presupuesto",         color:"#111111", component:CRM,          ready:true  },
  { id:"rrhh",         label:"RRHH",                   icon:"👷", desc:"Equipo, cargos, partes de trabajo, asistencia y nómina",               color:"#111111", component:RRHH,         ready:true  },
  { id:"herramientas", label:"Herramientas Técnicas",   icon:"🔧", desc:"Cuadro de cargas, concreto, cubicación, materiales, unidades",         color:"#111111", component:Herramientas, ready:true  },
  { id:"logistica",    label:"Logística",               icon:"📦", desc:"Almacén, EPPs, dotaciones, herramientas, equipos, compras y proveedores", color:"#111111", component:Logistica,    ready:true  },
  { id:"compras",      label:"Compras",                 icon:"🛒", desc:"Órdenes de compra, recepción mercancía, evaluación proveedores",       color:"#111111", component:Compras,      ready:true  },
  { id:"aprobaciones", label:"Aprobaciones",             icon:"✅", desc:"Flujos de aprobación, cadenas, umbrales y permisos por módulo",           color:"#111111", component:Aprobaciones, ready:true  },
  { id:"proyectos",    label:"Proyectos",               icon:"🏗️", desc:"Gantt, avances, seguimiento de obra y control de calidad",             color:"#111111", component:Proyectos,    ready:true  },
  { id:"biblioteca",   label:"Biblioteca",              icon:"📚", desc:"APUs normalizados, materiales, precios unitarios y textos tipo",       color:"#111111", component:Biblioteca,   ready:true  },
  { id:"contabilidad", label:"Contabilidad",            icon:"📊", desc:"Facturación, costos reales, ingresos, egresos e informes",             color:"#555555", component:Contabilidad, ready:true  },
  { id:"sst",          label:"SST",                    icon:"🦺", desc:"Seguridad y salud en el trabajo, inspecciones y riesgos",              color:"#111111", component:SST,          ready:true  },
  { id:"formacion",    label:"Formación",               icon:"🎓", desc:"Cursos obligatorios y operativos, evaluaciones, certificados, control de vencimientos", color:"#111111", component:Formacion,    ready:true  },
  { id:"carnets",      label:"Identidad Corporativa",   icon:"🪪", desc:"Carnets, tarjetas de visita físicas y virtuales, QR de contacto, branding del equipo", color:"#111111", component:IdentidadCorporativa,      ready:true  },
  { id:"firmas",       label:"Firma Digital",            icon:"✍️", desc:"Firma de documentos con pad digital, trazabilidad, firmas guardadas y certificados",  color:"#111111", component:FirmaDigital, ready:true  },
  { id:"legal",        label:"Legal",                    icon:"⚖️", desc:"Plantillas contractuales, pólizas/seguros, procesos legales, comunicaciones",        color:"#111111", component:Legal,        ready:true  },
  { id:"calidad",      label:"Calidad y Auditoría",    icon:"🔍", desc:"No conformidades, auditorías, protocolos, checklists e indicadores",   color:"#111111", component:Calidad,      ready:true  },
  { id:"postventa",    label:"Postventa",               icon:"🏡", desc:"Garantías, incidencias y atención al cliente post-entrega",           color:"#111111", component:Postventa,    ready:true  },
  { id:"admin",        label:"Administración",          icon:"💼", desc:"Caja chica, tarjeta corporativa, viáticos, flujo empresa, CxC/CxP",  color:"#111111", component:Administracion, ready:true  },
  { id:"flotas",       label:"Control de Flotas",       icon:"🚗", desc:"Vehículos, kilómetros, combustible, documentación, mantenimiento",   color:"#111111", component:Flotas,         ready:true  },
  { id:"calendario",     label:"Calendario",          icon:"📅", desc:"Agenda de citas, reuniones internas, videollamadas Jitsi, embed WordPress",  color:"#111111", component:Calendario,    ready:true  },
  { id:"comunicaciones", label:"Comunicaciones",       icon:"📧", desc:"Plantillas de correo, historial de envíos, notificaciones automáticas", color:"#111111", component:Comunicaciones, ready:true  },
  { id:"config",       label:"Configuración",           icon:"⚙️", desc:"Empresa, correo, WhatsApp, legal, apariencia — ajustes globales",    color:"#555555", component:Configuracion,  ready:true  },
  { id:"usuarios",     label:"Usuarios",                icon:"👤", desc:"Identidad, miembros del tenant y catálogo de documentos",            color:"#111111", component:Usuarios,       ready:true  },
]

const F = { fontFamily:"'DM Sans',sans-serif" }

function Spinner() {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", flexDirection:"column", gap:16 }}>
      <div style={{ width:40, height:40, border:"3px solid #E4E1DB", borderTopColor:"#111111", borderRadius:"50%", animation:"spin 0.8s linear infinite" }}/>
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
            background: lang===code ? "#111111" : "rgba(255,255,255,0.12)",
            color: lang===code ? "#fff" : "rgba(255,255,255,0.55)",
            transition:"all .15s" }}>
          {lbl}
        </button>
      ))}
    </div>
  )
}

function TenantBadge() {
  const t = useTenant();
  const [open, setOpen] = React.useState(false);
  const wrapRef = React.useRef(null);

  // Cerrar al hacer click fuera
  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  if (!t.isReady) return null;
  const paises = (t.paisesAcceso && t.paisesAcceso.length) ? t.paisesAcceso : [];
  if (paises.length === 0) return null;
  // Verdad: si hay empresa activa, su país manda. Si no, el paisActivo del context.
  const activo = (t.companyActiva && t.companyActiva.pais) || t.paisActivo || paises[0];

  // Si solo tiene acceso a 1 país, mostrar solo el código sin dropdown
  if (paises.length === 1) {
    return (
      <span title={`País: ${activo}`}
        style={{ fontSize:11, color:"rgba(255,255,255,0.7)", letterSpacing:0.6,
          fontWeight:600, padding:"4px 8px", border:"1px solid rgba(255,255,255,0.14)",
          borderRadius:4, background:"transparent", fontFamily:"'DM Sans',sans-serif" }}>
        {activo}
      </span>
    );
  }

  // Multi-país: dropdown clicable
  return (
    <div ref={wrapRef} style={{ position:"relative" }}>
      <button onClick={() => setOpen(o => !o)}
        title={`País activo: ${activo}. Click para cambiar.`}
        style={{ display:"inline-flex", alignItems:"center", gap:6, fontSize:11,
          color:"rgba(255,255,255,0.7)", letterSpacing:0.6, fontWeight:600,
          padding:"4px 8px", border:"1px solid rgba(255,255,255,0.14)", borderRadius:4,
          background:"transparent", cursor:"pointer", fontFamily:"'DM Sans',sans-serif",
          transition:"all .15s" }}
        onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,0.06)"}
        onMouseLeave={e => e.currentTarget.style.background="transparent"}>
        <span>{activo}</span>
        <span style={{ fontSize:9, opacity:0.6, transform: open ? "rotate(180deg)" : "rotate(0)", transition:"transform .2s" }}>▾</span>
      </button>
      {open && (
        <div style={{ position:"absolute", top:"calc(100% + 6px)", right:0,
          background:"#1a1a1a", border:"1px solid rgba(255,255,255,0.1)",
          borderRadius:6, minWidth:180, padding:4, zIndex:1100,
          fontFamily:"'DM Sans',sans-serif" }}>
          <div style={{ padding:"8px 10px 4px", fontSize:9, color:"rgba(255,255,255,0.35)",
            letterSpacing:1.2, textTransform:"uppercase" }}>País activo</div>
          {paises.map(p => {
            const sel = p === activo;
            return (
              <button key={p} onClick={() => { t.setPaisActivo(p); setOpen(false); }}
                style={{ width:"100%", display:"flex", alignItems:"center",
                  justifyContent:"space-between", padding:"8px 10px",
                  background: sel ? "rgba(255,255,255,0.05)" : "transparent",
                  border:"none", borderRadius:4, cursor:"pointer",
                  fontFamily:"'DM Sans',sans-serif",
                  color: sel ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.7)",
                  fontSize:13, marginTop: sel ? 0 : 2 }}
                onMouseEnter={e => { if (!sel) e.currentTarget.style.background="rgba(255,255,255,0.03)"; }}
                onMouseLeave={e => { if (!sel) e.currentTarget.style.background="transparent"; }}>
                <span style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ display:"inline-flex", width:18, height:14,
                    alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:600,
                    background:"rgba(255,255,255,0.1)", borderRadius:2,
                    color:"rgba(255,255,255,0.7)" }}>{p}</span>
                  <span>{p === "CO" ? "Colombia" : p === "ES" ? "España" : p === "MX" ? "México" : p === "AR" ? "Argentina" : p}</span>
                </span>
                <span style={{ color: sel ? "rgba(255,255,255,0.6)" : "transparent", fontSize:11 }}>✓</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
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
            <img src="/logo-habitaris-blanco.jpg" alt="Habitaris" style={{height:28}} />
          )}
          {ap.slogan && <span style={{ fontFamily:`'${bf}',sans-serif`, fontSize:8, letterSpacing:1.5, color:"rgba(255,255,255,.35)", textTransform:"uppercase" }}>{ap.slogan}</span>}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <a href="/holding" onClick={(e) => { e.preventDefault(); window.history.pushState({}, "", "/holding"); window.dispatchEvent(new PopStateEvent("popstate")); }}
            title="Espacio holding (multi-país, multi-empresa)"
            style={{ ...F, padding:"4px 12px", borderRadius:4, border:"1px solid rgba(255,255,255,0.15)", cursor:"pointer",
              fontSize:10, fontWeight:600, background:"rgba(255,255,255,0.08)", color:"rgba(255,255,255,0.55)", textDecoration:"none", transition:"all .15s",
              display:"inline-flex", alignItems:"center", gap:5 }}
            onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,0.18)"}
            onMouseLeave={e => e.currentTarget.style.background="rgba(255,255,255,0.08)"}>
            🌐 Holding
          </a>
          <TenantBadge />
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
          v1.0 · {brand.empresa?.razonSocial||"Habitaris S.A.S"} · NIT {brand.empresa?.nit||"901.922.136-8"} · {brand.empresa?.domicilio||"Bogotá D.C."}
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
      <img src={ap.logoBlanco || "/logo-habitaris-blanco.jpg"} alt="Habitaris" style={{height:22, objectFit:"contain"}} />
      <span style={{ fontSize:13, color:"rgba(255,255,255,0.4)" }}>/ {mod.label}</span>
      <div style={{ flex:1 }}/>
      <TenantBadge />
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
  return (
    <>
      <AppInner />
      <ToastContainer />
    </>
  );
}

function AppInner() {
  const [storeReady, setStoreReady] = useState(false);
  const [active, setActive] = useState(() => sessionStorage.getItem("hab:active_module") || null)
  const [lang, setLang]     = useState("es")
  const [authed, setAuthed]   = useState(isLoggedIn())
  const [path, setPath] = useState(() => window.location.pathname)
  React.useEffect(() => { store.init((JSON.parse(sessionStorage.getItem("hab:session")||"{}")).tenant_id||"habitaris").then(() => setStoreReady(true)).catch(() => setStoreReady(true)); }, []);
  React.useEffect(() => {
    const handler = () => setPath(window.location.pathname);
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);
  if (!storeReady) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",fontFamily:"DM Sans,sans-serif",color:"#999"}}>Cargando...</div>;
  const mod = MODULES.find(m => m.id === active)

  const selectModule = (id) => { sessionStorage.setItem("hab:active_module", id); setActive(id); }
  const goHome = () => { sessionStorage.removeItem("hab:active_module"); setActive(null); }
  const doLogout = () => { logout(); setAuthed(false); }

  // Public routes — no login required
  if (path.startsWith("/aprobar-externo")) return <AprobarExterno />
  if (path.startsWith("/recuperar")) return <RecuperarPassword />
  if (path.startsWith("/portal")) return <PortalCliente />
  if (path.startsWith("/form")) return <FormularioPublico />
  if (path.startsWith("/agendar")) return <CalendarioPublico />

  // Auth gate — only if auth is configured
  if (!authed) {
    return <LoginScreen onSuccess={() => setAuthed(true)} />
  }

  // ─── Espacios holding y país (rutas explícitas) ────────────────────────
  // /holding → espacio raíz del tenant (multi-país)
  // /<pais>  → espacio país (ej. /co, /es) — códigos ISO de 2 letras minúsculas
  // Estas rutas están disponibles si el user las visita explícitamente.
  // Tras login, hay redirección automática según los datos del user (ver más abajo).

  const goTo = (newPath) => {
    if (window.history && window.history.pushState) {
      window.history.pushState({}, "", newPath);
      // Forzar re-render con un evento personalizado
      window.dispatchEvent(new PopStateEvent("popstate"));
    } else {
      window.location.href = newPath;
    }
  };

  const enterCompany = (company) => {
    // Por ahora la suite operativa NO está aislada por company (Sprint A4).
    // Seleccionar empresa solo guarda contexto en sessionStorage para futura referencia,
    // y navega al Home actual (que muestra los módulos de la suite).
    if (company && company.id) {
      sessionStorage.setItem("hab:company_active", JSON.stringify({ id: company.id, slug: company.slug, pais: company.pais, display_name: company.display_name }));
    }
    goTo("/");
  };

  if (path === "/holding" || path.startsWith("/holding/")) {
    return <Holding
      onSelectCountry={(p) => goTo(`/${p.toLowerCase()}`)}
      onBackToSuite={() => goTo("/")}
    />;
  }

  // /co, /es, /mx, /ar... — rutas de 2 letras (códigos país)
  const paisMatch = path.match(/^\/([a-z]{2})\/?$/i);
  if (paisMatch) {
    const codigoPais = paisMatch[1].toUpperCase();
    return <Pais
      pais={codigoPais}
      onBackToHolding={() => goTo("/holding")}
      onSelectCompany={enterCompany}
    />;
  }
  // ───────────────────────────────────────────────────────────────────────

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
