import React, { useState, useEffect } from "react";
import { store } from "../core/store.js";

import { Check, Save, Building2, Mail, MessageCircle, Shield, FileText, Users, Palette, RefreshCw, Link2, Database } from "lucide-react";
import { enviarTest } from "../utils/emailService";
import { testConnection, createTables, getCreateSQL } from "./supabase.js";

/* ── Storage key ── */
const STORAGE_KEY = "habitaris_config";

/* ── Default config — fresh install ── */
const DEFAULT_CONFIG = {
  empresa: {
    nombre: "Habitaris",
    razonSocial: "Habitaris S.A.S.",
    nit: "901.922.136-8",
    eslogan: "Diseño · Interiorismo · Arquitectura",
    domicilio: "Bogotá D.C.",
    telefono: "+57 350 5661545",
    web: "habitaris.co",
  },
  correo: {
    emailPrincipal: "comercial@habitaris.co",
  },
  app: {
    url: "https://suite.habitaris.co",
  },
  whatsapp: {
    numero: "573505661545",
    mensajePlantilla: "Hola {{nombre}} 👋\n\nSoy de *{{empresa}}*. Estamos emocionados de trabajar contigo.\n\nPara conocer mejor tu proyecto, necesitamos que completes un breve formulario:\n\n📋 *{{formulario}}*\n\nEs rápido y sencillo. Si tienes alguna duda, no dudes en escribirnos.\n\n¡Gracias por confiar en nosotros!\n— {{empresa}}",
  },
  legal: {
    avisoPrivacidad: "En {{razonSocial}} (NIT {{nit}}, domicilio {{domicilio}}, email: {{email}}, tel: {{telefono}}), tratamos tus datos personales para procesar tu solicitud de briefing, enviar cotizaciones y gestionar proyectos. Cumplimos con la Ley 1581/2012 y Régimen de Protección de Datos. Derechos (acceso, rectificación, supresión, revocación): vía {{email}}.",
    habeasData: "Al enviar este formulario autorizo a {{razonSocial}}, para el uso de mis datos personales con el fin de elaborar propuestas de diseño, coordinar servicios relacionados y, en caso de ser necesario, compartirlos con proveedores o contratistas de confianza exclusivamente para la correcta ejecución del proyecto. En todo momento se garantizará la confidencialidad y protección de mi información, conforme a la normativa de Habeas Data en Colombia (Ley 1581 de 2012).",
    confirmacion: "La información entregada es verídica y será utilizada únicamente para la elaboración de la propuesta de diseño. {{razonSocial}} garantiza la confidencialidad de los datos y no los compartirá con terceros, salvo con proveedores o contratistas de confianza cuando sea necesario para la correcta ejecución del proyecto, previa autorización del cliente.",
  },
  formularios: {
    mensajeExitoDefault: "Gracias por completar el formulario. Nos pondremos en contacto pronto.",
    firmaEmail: "{{razonSocial}}\n{{eslogan}}",
  },
  apariencia: {
    logo: "",
    colorPrimario: "#111111",
    colorSecundario: "#3B3B3B",
    colorAcento: "#111111",
    tipografia: "DM Sans",
    slogan: "Diseño · Interiorismo · Arquitectura",
  },
  supabase: {
    url: "https://xlzkasdskatnikuavefh.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhsemthc2Rza2F0bmlrdWF2ZWZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4OTE3NzQsImV4cCI6MjA4NzQ2Nzc3NH0.SR9tIpvL0YnV9CNrRq4T-xetifuNQOJZE0OnQpwtYLM",
  },
};

/* ── Public API: get config anywhere ── */
export function getConfig() {
  try {
    const raw = store.getSync(STORAGE_KEY);
    if (!raw) {
      // First time: auto-save defaults so they persist
      store.set(STORAGE_KEY, JSON.stringify(DEFAULT_CONFIG));
      return DEFAULT_CONFIG;
    }
    const saved = JSON.parse(raw);
    // Deep merge with defaults (so new fields are always present)
    const merged = deepMerge(DEFAULT_CONFIG, saved);
    // Ensure supabase credentials always have fallback
    if (!merged.supabase?.url) merged.supabase = { ...merged.supabase, url: DEFAULT_CONFIG.supabase.url };
    if (!merged.supabase?.anonKey) merged.supabase = { ...merged.supabase, anonKey: DEFAULT_CONFIG.supabase.anonKey };


    return merged;
  } catch { return DEFAULT_CONFIG; }
}

export function resolveTemplate(text, cfg) {
  if (!text) return text;
  const c = cfg || getConfig();
  return text
    .replace(/\{\{razonSocial\}\}/g, c.empresa.razonSocial)
    .replace(/\{\{nit\}\}/g, c.empresa.nit)
    .replace(/\{\{domicilio\}\}/g, c.empresa.domicilio)
    .replace(/\{\{email\}\}/g, c.correo.emailPrincipal)
    .replace(/\{\{telefono\}\}/g, c.empresa.telefono)
    .replace(/\{\{empresa\}\}/g, c.empresa.nombre)
    .replace(/\{\{eslogan\}\}/g, c.empresa.eslogan)
    .replace(/\{\{web\}\}/g, c.empresa.web);
}

function deepMerge(target, source) {
  const out = {...target};
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key]) && target[key]) {
      out[key] = deepMerge(target[key], source[key]);
    } else {
      out[key] = source[key];
    }
  }
  return out;
}

/* ── Theme ── */
const T = {
  ink:"#111", inkMid:"#444", inkLight:"#888",
  bg:"#F5F5F5", surface:"#FFFFFF", border:"#E0E0E0",
  green:"#111111", greenBg:"#E8F4EE",
  blue:"#3B3B3B", blueBg:"#F0F0F0",
  amber:"#8C6A00", amberBg:"#FFF4E0",
  red:"#B91C1C", redBg:"#FAE8E8",
  purple:"#5B3A8C",
  gold:"#111111",
  shadow:"0 1px 4px rgba(0,0,0,.06)",
};
const F = { fontFamily:"'DM Sans',sans-serif" };
const Card = ({children,style,...p}) => <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:16,boxShadow:T.shadow,...style}} {...p}>{children}</div>;
const Btn = ({children,on,v,style,...p}) => <button onClick={on} style={{padding:"7px 16px",borderRadius:5,border:v==="sec"?`1px solid ${T.border}`:"none",background:v==="sec"?"#fff":v==="danger"?"#B91C1C":"#111",color:v==="sec"?T.inkMid:"#fff",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",display:"inline-flex",alignItems:"center",gap:5,...style}} {...p}>{children}</button>;
const inp = { border:`1px solid ${T.border}`, borderRadius:4, padding:"6px 8px", fontSize:11, fontFamily:"'DM Sans',sans-serif", background:"#fff", width:"100%" };

/* ── Sections ── */
const SECTIONS = [
  { id:"empresa",      label:"Empresa",           icon:Building2, color:T.ink },
  { id:"correo",       label:"Correo",  icon:Mail,      color:T.blue },
  { id:"app",          label:"App / Deploy",       icon:Link2,     color:T.green },
  { id:"whatsapp",     label:"WhatsApp",           icon:MessageCircle, color:"#25D366" },
  { id:"legal",        label:"Textos legales",     icon:Shield,    color:T.red },
  { id:"formularios",  label:"Formularios",        icon:FileText,  color:T.purple },
  { id:"apariencia",   label:"Marca / Apariencia", icon:Palette,   color:T.gold },
  { id:"supabase",     label:"Base de datos",      icon:Database,  color:"#3ECF8E" },
];

/* ── Field definitions per section ── */
const FIELDS = {
  empresa: [
    { key:"nombre",      label:"Nombre comercial",       placeholder:"Habitaris" },
    { key:"razonSocial",  label:"Razón social",           placeholder:"Habitaris S.A.S." },
    { key:"nit",          label:"NIT",                    placeholder:"901.922.136-8" },
    { key:"eslogan",      label:"Eslogan / Subtítulo",    placeholder:"Diseño · Interiorismo · Arquitectura" },
    { key:"domicilio",    label:"Domicilio",              placeholder:"Bogotá D.C." },
    { key:"telefono",     label:"Teléfono principal",     placeholder:"+57 350 5661545" },
    { key:"web",          label:"Sitio web / dominio",    placeholder:"habitaris.co" },
  ],
  correo: [
    { key:"emailPrincipal",    label:"Email principal (remitente)",  placeholder:"comercial@habitaris.co" },
  ],
  app: [
    { key:"url", label:"URL de la app", placeholder:"https://suite.habitaris.co" },
  ],
  whatsapp: [
    { key:"numero",           label:"Número WhatsApp (con código país)", placeholder:"573505661545" },
    { key:"mensajePlantilla", label:"Mensaje plantilla",                  placeholder:"Hola {{nombre}},\n📋 *{{formulario}}*...", area:true },
  ],
  legal: [
    { key:"avisoPrivacidad", label:"Aviso de privacidad",                  placeholder:"En {{razonSocial}} (NIT {{nit}}...", area:true },
    { key:"habeasData",      label:"Autorización habeas data (Ley 1581)", placeholder:"Al enviar este formulario autorizo a {{razonSocial}}...", area:true },
    { key:"confirmacion",    label:"Texto de confirmación",                placeholder:"La información entregada es verídica...", area:true },
  ],
  formularios: [
    { key:"mensajeExitoDefault", label:"Mensaje de éxito por defecto", placeholder:"Gracias por completar el formulario." },
    { key:"firmaEmail",          label:"Firma en emails",              placeholder:"{{razonSocial}}\n{{eslogan}}", area:true },
  ],
  apariencia: [
    { key:"colorPrimario",   label:"Color primario (header, botones)",   placeholder:"#111111", color:true },
    { key:"colorSecundario", label:"Color secundario (enlaces, badges)", placeholder:"#3B3B3B", color:true },
    { key:"colorAcento",     label:"Color acento (destacados, progreso)",placeholder:"#111111", color:true },
    { key:"slogan",          label:"Slogan / Tagline",                   placeholder:"Diseño · Interiorismo · Arquitectura" },
  ],
  supabase: [
    { key:"url",     label:"Project URL",  placeholder:"https://xxxxx.supabase.co" },
    { key:"anonKey", label:"Anon Public Key", placeholder:"eyJhbGciOiJIUzI1NiIs..." },
  ],
};

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function Configuracion() {
  const [config, setConfig] = useState(() => getConfig());
  const [section, setSection] = useState("empresa");
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  const update = (sec, key, val) => {
    setConfig(prev => ({...prev, [sec]: {...prev[sec], [key]: val}}));
    setDirty(true);
    setSaved(false);
  };

  const guardar = () => {
    store.set(STORAGE_KEY, JSON.stringify(config));
    setDirty(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const resetear = () => {
    if (!confirm("¿Restablecer toda la configuración a los valores por defecto? Se perderán los cambios.")) return;
    store.delete(STORAGE_KEY);
    setConfig(DEFAULT_CONFIG);
    setDirty(false);
  };

  const sec = SECTIONS.find(s=>s.id===section);
  const fields = FIELDS[section] || [];

  return (
    <div style={{...F,maxWidth:1100,margin:"0 auto",padding:"20px 16px 80px"}}>
      <style>{`
        .fade-up{animation:fadeUp .3s ease}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .cfg-inp:focus{outline:none;border-color:${T.green}!important;box-shadow:0 0 0 2px ${T.green}22}
      `}</style>

      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div>
          <h1 style={{margin:0,fontSize:22,fontWeight:700}}>⚙️ Configuración</h1>
          <p style={{margin:"4px 0 0",fontSize:11,color:T.inkMid}}>Ajustes generales de la aplicación · Todos los módulos leen de aquí</p>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {dirty && <span style={{fontSize:9,color:T.amber,fontWeight:600}}>● Sin guardar</span>}
          {saved && <span style={{fontSize:9,color:T.green,fontWeight:600}}>✅ Guardado</span>}
          <Btn v="sec" on={resetear}><RefreshCw size={10}/> Restablecer</Btn>
          <Btn on={guardar}><Save size={10}/> Guardar configuración</Btn>
        </div>
      </div>

      <div style={{display:"flex",gap:16}}>
        {/* Sidebar */}
        <div style={{width:200,flexShrink:0}}>
          <Card style={{padding:8}}>
            {SECTIONS.map(s => {
              const Icon = s.icon;
              const active = section === s.id;
              return (
                <button key={s.id} onClick={()=>setSection(s.id)}
                  style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"8px 10px",
                    border:"none",borderRadius:6,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",
                    background:active?"#111":"transparent",color:active?"#fff":T.inkMid,
                    fontSize:11,fontWeight:active?700:500,textAlign:"left",transition:"all .15s",marginBottom:2}}>
                  <Icon size={13} color={active?"#fff":s.color}/>
                  {s.label}
                </button>
              );
            })}
          </Card>

          {/* Info card */}
          <Card style={{marginTop:12,padding:"12px 14px",background:T.blueBg,border:`1px solid ${T.blue}22`}}>
            <div style={{fontSize:8,fontWeight:700,color:T.blue,textTransform:"uppercase",marginBottom:4}}>💡 Variables dinámicas</div>
            <div style={{fontSize:9,color:T.blue,lineHeight:1.6}}>
              En textos legales puedes usar:<br/>
              <code style={{fontSize:8}}>{"{{razonSocial}}"}</code> <code style={{fontSize:8}}>{"{{nit}}"}</code><br/>
              <code style={{fontSize:8}}>{"{{email}}"}</code> <code style={{fontSize:8}}>{"{{telefono}}"}</code><br/>
              <code style={{fontSize:8}}>{"{{domicilio}}"}</code> <code style={{fontSize:8}}>{"{{empresa}}"}</code><br/>
              <code style={{fontSize:8}}>{"{{eslogan}}"}</code> <code style={{fontSize:8}}>{"{{web}}"}</code><br/>
              Se reemplazan automáticamente.
            </div>
          </Card>
        </div>

        {/* Content */}
        <div style={{flex:1}} className="fade-up" key={section}>
          <Card>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
              {sec && <sec.icon size={16} color={sec.color}/>}
              <h2 style={{margin:0,fontSize:16,fontWeight:700}}>{sec?.label}</h2>
            </div>

            {/* Apariencia extras: logo + font BEFORE color fields */}
            {section === "apariencia" && (
              <>
                {/* Logo upload */}
                <div style={{marginBottom:20,borderBottom:`1px solid ${T.border}`,paddingBottom:14}}>
                  <div style={{fontSize:9,fontWeight:700,color:T.inkMid,textTransform:"uppercase",marginBottom:8}}>🖼️ Logo de la empresa</div>
                  <div style={{display:"flex",gap:16,alignItems:"flex-start"}}>
                    {/* Current logo preview */}
                    <div style={{width:120,height:60,border:`2px dashed ${T.border}`,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",background:"#fff",flexShrink:0}}>
                      {config.apariencia?.logo ? (
                        <img src={config.apariencia.logo} alt="Logo" style={{maxWidth:"100%",maxHeight:"100%",objectFit:"contain"}}/>
                      ) : (
                        <span style={{fontSize:9,color:T.inkLight}}>Sin logo</span>
                      )}
                    </div>
                    <div style={{flex:1}}>
                      <input type="file" accept="image/png,image/svg+xml,image/jpeg" onChange={e=>{
                        const file = e.target.files?.[0]; if(!file) return;
                        if (file.size > 500000) { alert("El logo debe pesar menos de 500KB"); return; }
                        const reader = new FileReader();
                        reader.onload = (ev) => update("apariencia","logo",ev.target.result);
                        reader.readAsDataURL(file);
                      }} style={{fontSize:10,marginBottom:6}}/>
                      <div style={{fontSize:8,color:T.inkLight}}>PNG, SVG o JPG · máx 500KB · Se usa en header, formularios, PDFs y emails</div>
                      {config.apariencia?.logo && (
                        <button onClick={()=>update("apariencia","logo","")} style={{marginTop:4,fontSize:9,color:T.red,background:"none",border:"none",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>🗑 Eliminar logo</button>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              {fields.map(f => (
                <div key={f.key}>
                  <label style={{display:"block",fontSize:9,fontWeight:700,color:T.inkMid,textTransform:"uppercase",marginBottom:4,letterSpacing:.5}}>
                    {f.label}
                  </label>
                  {f.color ? (
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <input type="color" value={config[section]?.[f.key]||f.placeholder}
                        onChange={e=>update(section,f.key,e.target.value)}
                        style={{width:40,height:32,border:"none",borderRadius:4,cursor:"pointer"}}/>
                      <input className="cfg-inp" value={config[section]?.[f.key]||""} onChange={e=>update(section,f.key,e.target.value)}
                        placeholder={f.placeholder} style={{...inp,width:140,fontFamily:"'DM Mono',monospace",fontSize:10}}/>
                    </div>
                  ) : f.area ? (
                    <textarea className="cfg-inp" rows={4} value={config[section]?.[f.key]||""} onChange={e=>update(section,f.key,e.target.value)}
                      placeholder={f.placeholder} style={{...inp,resize:"vertical",lineHeight:1.6}}/>
                  ) : (
                    <input className="cfg-inp" value={config[section]?.[f.key]||""} onChange={e=>update(section,f.key,e.target.value)}
                      placeholder={f.placeholder} style={inp}/>
                  )}
                </div>
              ))}
            </div>

            {/* Preview for legal texts */}
            {section === "legal" && (
              <div style={{marginTop:20,borderTop:`1px solid ${T.border}`,paddingTop:14}}>
                <div style={{fontSize:9,fontWeight:700,color:T.inkMid,textTransform:"uppercase",marginBottom:8}}>📄 Vista previa (variables reemplazadas)</div>
                {fields.map(f => (
                  <div key={f.key} style={{marginBottom:10,padding:"8px 12px",background:T.bg,borderRadius:4,border:`1px solid ${T.border}`}}>
                    <div style={{fontSize:8,fontWeight:700,color:T.inkLight,marginBottom:3}}>{f.label}</div>
                    <div style={{fontSize:10,color:T.ink,lineHeight:1.5,whiteSpace:"pre-wrap"}}>
                      {resolveTemplate(config.legal?.[f.key]||"", config)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Apariencia extras: font + presets + preview */}
            {section === "apariencia" && (
              <>
                {/* Font selector */}
                <div style={{marginTop:20,borderTop:`1px solid ${T.border}`,paddingTop:14}}>
                  <div style={{fontSize:9,fontWeight:700,color:T.inkMid,textTransform:"uppercase",marginBottom:8}}>🔤 Tipografía</div>
                  <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=DM Sans:wght@400;500;600;700;800&family=Playfair+Display:wght@400;500;600;700&family=Poppins:wght@400;500;600;700&display=swap');`}</style>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    {["DM Sans","Inter","Poppins","DM Sans","Playfair Display"].map(font => {
                      const active = (config.apariencia?.tipografia||"DM Sans") === font;
                      return (
                        <button key={font} onClick={()=>update("apariencia","tipografia",font)}
                          style={{padding:"10px 16px",borderRadius:8,cursor:"pointer",fontFamily:`'${font}',sans-serif`,
                            border:active?`2px solid ${config.apariencia?.colorPrimario||"#111"}`:`1px solid ${T.border}`,
                            background:active?"#111":"#fff",color:active?"#fff":T.ink,
                            fontSize:13,fontWeight:600,transition:"all .15s",minWidth:100,textAlign:"center"}}>
                          <div>{font}</div>
                          <div style={{fontSize:9,fontWeight:400,marginTop:2,opacity:.6}}>Aa Bb Cc 123</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Color presets */}
                <div style={{marginTop:20,borderTop:`1px solid ${T.border}`,paddingTop:14}}>
                  <div style={{fontSize:9,fontWeight:700,color:T.inkMid,textTransform:"uppercase",marginBottom:8}}>🎨 Paletas predefinidas</div>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    {[
                      { name:"Elegante oscuro", p:"#111111", s:"#3B3B3B", a:"#111111" },
                      { name:"Profesional azul",p:"#1E3A5F", s:"#2E7D96", a:"#E8B931" },
                      { name:"Natural verde",   p:"#1B4332", s:"#52796F", a:"#D4A373" },
                      { name:"Moderno violeta", p:"#2D1B69", s:"#5B3A8C", a:"#F4A261" },
                      { name:"Cálido terracota",p:"#6B3A2A", s:"#A0522D", a:"#DEB887" },
                      { name:"Minimalista",     p:"#333333", s:"#666666", a:"#999999" },
                    ].map(pal => (
                      <button key={pal.name} onClick={()=>{
                        update("apariencia","colorPrimario",pal.p);
                        update("apariencia","colorSecundario",pal.s);
                        update("apariencia","colorAcento",pal.a);
                      }} style={{padding:"8px 12px",borderRadius:6,cursor:"pointer",border:`1px solid ${T.border}`,background:"#fff",fontFamily:"'DM Sans',sans-serif",textAlign:"center",transition:"all .15s"}}>
                        <div style={{display:"flex",gap:4,marginBottom:4,justifyContent:"center"}}>
                          <div style={{width:18,height:18,borderRadius:"50%",background:pal.p}}/>
                          <div style={{width:18,height:18,borderRadius:"50%",background:pal.s}}/>
                          <div style={{width:18,height:18,borderRadius:"50%",background:pal.a}}/>
                        </div>
                        <div style={{fontSize:8,color:T.inkMid,fontWeight:600}}>{pal.name}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live preview */}
                <div style={{marginTop:20,borderTop:`1px solid ${T.border}`,paddingTop:14}}>
                  <div style={{fontSize:9,fontWeight:700,color:T.inkMid,textTransform:"uppercase",marginBottom:8}}>👁️ Vista previa en vivo</div>
                  {(()=>{
                    const ap = config.apariencia || {};
                    const cp = ap.colorPrimario || "#111";
                    const cs = ap.colorSecundario || "#3B3B3B";
                    const ca = ap.colorAcento || "#111111";
                    const font = ap.tipografia || "DM Sans";
                    const slogan = ap.slogan || config.empresa?.eslogan || "Diseño · Interiorismo · Arquitectura";
                    const nombre = config.empresa?.nombre || "Habitaris";

                    return (
                      <div style={{borderRadius:10,overflow:"hidden",border:`1px solid ${T.border}`,boxShadow:"0 2px 12px rgba(0,0,0,.08)"}}>
                        {/* Header preview */}
                        <div style={{background:cp,padding:"14px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <div style={{display:"flex",alignItems:"center",gap:10}}>
                            {ap.logo ? (
                              <img src={ap.logo} alt="Logo" style={{height:28,objectFit:"contain"}}/>
                            ) : (
                              <div style={{fontFamily:`'${font}',sans-serif`,fontWeight:700,fontSize:14,letterSpacing:3,color:"#fff",textTransform:"uppercase"}}>{nombre}</div>
                            )}
                            <div style={{fontSize:7,letterSpacing:2,color:"rgba(255,255,255,.4)",textTransform:"uppercase",fontFamily:`'${font}',sans-serif`}}>{slogan}</div>
                          </div>
                          <div style={{fontSize:9,color:"rgba(255,255,255,.5)",fontFamily:`'${font}',sans-serif`}}>Paso 1 de 5</div>
                        </div>
                        {/* Accent bar */}
                        <div style={{height:3,background:`linear-gradient(90deg,${ca},${ca}88,${ca})`}}/>
                        {/* Content preview */}
                        <div style={{padding:"20px 24px",background:"#fff"}}>
                          <h3 style={{fontFamily:`'${font}',sans-serif`,fontSize:16,fontWeight:700,margin:"0 0 4px",color:cp}}>Briefing Inicial</h3>
                          <p style={{fontFamily:`'${font}',sans-serif`,fontSize:11,color:"#888",margin:"0 0 14px"}}>Cuéntanos sobre tu proyecto</p>
                          <div style={{display:"flex",gap:8,marginBottom:12}}>
                            <div style={{padding:"6px 14px",borderRadius:16,background:cp,color:"#fff",fontSize:10,fontWeight:600,fontFamily:`'${font}',sans-serif`}}>Diseño interior</div>
                            <div style={{padding:"6px 14px",borderRadius:16,border:`1px solid ${T.border}`,color:T.inkMid,fontSize:10,fontWeight:400,fontFamily:`'${font}',sans-serif`}}>Obra nueva</div>
                          </div>
                          <div style={{display:"flex",gap:8}}>
                            <button style={{padding:"8px 20px",background:cp,color:"#fff",border:"none",borderRadius:6,fontSize:11,fontWeight:700,fontFamily:`'${font}',sans-serif`,cursor:"default"}}>Siguiente →</button>
                            <button style={{padding:"8px 20px",background:"#fff",color:cs,border:`1px solid ${cs}44`,borderRadius:6,fontSize:11,fontWeight:600,fontFamily:`'${font}',sans-serif`,cursor:"default"}}>← Atrás</button>
                          </div>
                        </div>
                        {/* Footer preview */}
                        <div style={{padding:"10px 24px",background:T.bg,borderTop:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <div style={{fontFamily:`'${font}',sans-serif`,fontSize:9,color:T.inkLight}}>
                            {config.empresa?.razonSocial || "Empresa S.A.S."} · {config.empresa?.domicilio || "Bogotá"}
                          </div>
                          <div style={{display:"flex",gap:4}}>
                            <div style={{width:12,height:12,borderRadius:"50%",background:cp}}/>
                            <div style={{width:12,height:12,borderRadius:"50%",background:cs}}/>
                            <div style={{width:12,height:12,borderRadius:"50%",background:ca}}/>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </>
            )}

            {/* Test email */}
            {section === "correo" && (
              <div style={{marginTop:20,borderTop:`1px solid ${T.border}`,paddingTop:14}}>
                <div style={{fontSize:9,fontWeight:700,color:T.inkMid,textTransform:"uppercase",marginBottom:8}}>🧪 Probar conexión</div>
                <TestEmail config={config}/>
              </div>
            )}

            {/* Supabase setup */}
            {section === "supabase" && (
              <div style={{marginTop:20,borderTop:`1px solid ${T.border}`,paddingTop:14}}>
                <SupabaseSetup config={config}/>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ── Test email sub-component ── */
function TestEmail({ config }) {
  const [testTo, setTestTo] = useState("");
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!testTo) return;
    setSending(true);
    setStatus("Enviando...");
    try {
      const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          service_id: config.correo.emailjs_serviceId,
          template_id: config.correo.emailjs_templateId,
          user_id: config.correo.emailjs_publicKey,
          template_params: {
            client_name: "Test",
            client_email: testTo,
            form_name: "Email de prueba",
            from_name: config.empresa.nombre,
            form_link: "Este es un email de prueba desde Habitaris.",
          }
        })
      });
      setStatus(res.ok ? "✅ Email enviado correctamente" : "❌ Error: " + res.status);
    } catch(e) {
      setStatus("❌ Error: " + e.message);
    }
    setSending(false);
  };

  return (
    <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
      <div style={{flex:1}}>
        <label style={{fontSize:8,fontWeight:700,color:T.inkMid,textTransform:"uppercase"}}>Email de prueba</label>
        <input value={testTo} onChange={e=>setTestTo(e.target.value)} placeholder="tu@email.com" style={inp}/>
      </div>
      <Btn on={send} disabled={sending} style={{whiteSpace:"nowrap"}}>
        <Mail size={10}/> {sending?"Enviando...":"Enviar test"}
      </Btn>
      {status && <span style={{fontSize:9,color:status.startsWith("✅")?T.green:status.startsWith("❌")?T.red:T.amber,fontWeight:600}}>{status}</span>}
    </div>
  );
}

/* ── Supabase setup sub-component ── */
function SupabaseSetup({ config }) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState("");
  const [creating, setCreating] = useState(false);
  const [createResult, setCreateResult] = useState(null);
  const [showSQL, setShowSQL] = useState(false);

  const doTest = async () => {
    setTesting(true);
    setTestResult("Probando...");
    const r = await testConnection();
    setTestResult(r.ok ? "✅ Conexión exitosa" : "❌ " + r.error);
    setTesting(false);
  };

  const doCreate = async () => {
    setCreating(true);
    setCreateResult(null);
    const r = await createTables();
    setCreateResult(r);
    setCreating(false);
  };

  const hasConfig = config.supabase?.url && config.supabase?.anonKey;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      {/* Info card */}
      <div style={{padding:"12px 16px",background:"#E8F8EE",border:"1px solid #3ECF8E33",borderRadius:6}}>
        <div style={{fontSize:9,fontWeight:700,color:"#1B7A4B",marginBottom:4}}>📦 ¿Cómo configurar Supabase?</div>
        <div style={{fontSize:10,color:"#2D6A4F",lineHeight:1.6}}>
          1. Ve a <strong>supabase.com</strong> → Crea cuenta gratis<br/>
          2. Nuevo proyecto → Nombre: <code style={{fontSize:9}}>habitaris-suite</code> → Región: São Paulo<br/>
          3. Settings → API → Copia <strong>Project URL</strong> y <strong>anon public</strong> key<br/>
          4. Pégalos arriba y guarda configuración<br/>
          5. Haz clic en "Crear tablas" abajo
        </div>
      </div>

      {/* Test connection */}
      <div>
        <div style={{fontSize:9,fontWeight:700,color:T.inkMid,textTransform:"uppercase",marginBottom:8}}>🧪 Probar conexión</div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <Btn on={doTest} v={hasConfig?"":"sec"} disabled={testing || !hasConfig}>
            <Database size={10}/> {testing ? "Probando..." : "Probar conexión"}
          </Btn>
          {testResult && <span style={{fontSize:9,fontWeight:600,color:testResult.startsWith("✅")?T.green:testResult.startsWith("❌")?T.red:T.amber}}>{testResult}</span>}
          {!hasConfig && <span style={{fontSize:9,color:T.amber}}>⚠ Primero configura URL y Key arriba</span>}
        </div>
      </div>

      {/* Create tables */}
      <div>
        <div style={{fontSize:9,fontWeight:700,color:T.inkMid,textTransform:"uppercase",marginBottom:8}}>📋 Crear tablas</div>
        <p style={{fontSize:10,color:T.inkMid,marginBottom:8}}>
          Se crearán 3 tablas: <code style={{fontSize:9}}>form_events</code> (estadísticas), <code style={{fontSize:9}}>form_responses</code> (respuestas), <code style={{fontSize:9}}>form_links</code> (enlaces).
        </p>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <Btn on={doCreate} v="sec" disabled={creating || !hasConfig}>
            {creating ? "Creando..." : "🔧 Verificar / Crear tablas"}
          </Btn>
          <button onClick={()=>setShowSQL(!showSQL)} style={{fontSize:9,color:T.blue,background:"none",border:"none",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",textDecoration:"underline"}}>
            {showSQL?"Ocultar":"Ver"} SQL manual
          </button>
        </div>

        {createResult && (
          <div style={{marginTop:10,padding:"10px 14px",borderRadius:6,
            background:createResult.ok?"#E8F8EE":"#FFF4E0",
            border:`1px solid ${createResult.ok?"#3ECF8E":"#F59E0B"}33`}}>
            {createResult.ok ? (
              <span style={{fontSize:10,color:"#1B7A4B",fontWeight:600}}>✅ {createResult.msg || "Tablas listas"}</span>
            ) : createResult.error === "manual_sql" ? (
              <div>
                <span style={{fontSize:10,color:T.amber,fontWeight:600}}>⚠ Tablas faltantes: {createResult.missing.join(", ")}</span>
                <p style={{fontSize:9,color:T.inkMid,marginTop:4}}>
                  Necesitas ejecutar el SQL manualmente en Supabase → SQL Editor. Haz clic en "Ver SQL manual" y copia el código.
                </p>
              </div>
            ) : (
              <span style={{fontSize:10,color:T.red,fontWeight:600}}>❌ {createResult.error}</span>
            )}
          </div>
        )}

        {showSQL && (
          <div style={{marginTop:10}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
              <span style={{fontSize:8,fontWeight:700,color:T.inkMid,textTransform:"uppercase"}}>SQL para copiar en Supabase → SQL Editor</span>
              <button onClick={()=>{navigator.clipboard?.writeText(getCreateSQL());alert("✅ SQL copiado")}}
                style={{fontSize:9,color:T.blue,background:"none",border:"none",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>📋 Copiar</button>
            </div>
            <pre style={{fontSize:9,background:"#1a1a2e",color:"#e0e0e0",padding:14,borderRadius:6,overflow:"auto",maxHeight:300,lineHeight:1.5,fontFamily:"'DM Mono',monospace"}}>
              {getCreateSQL()}
            </pre>
          </div>
        )}
      </div>

      {/* Status indicators */}
      {hasConfig && (
        <div style={{padding:"10px 14px",background:T.bg,borderRadius:6,border:`1px solid ${T.border}`}}>
          <div style={{fontSize:8,fontWeight:700,color:T.inkMid,textTransform:"uppercase",marginBottom:6}}>Estado de conexión</div>
          <div style={{display:"flex",gap:16}}>
            <div style={{fontSize:10}}>
              <span style={{color:"#3ECF8E",fontWeight:700}}>●</span> URL: <code style={{fontSize:9}}>{config.supabase.url?.replace("https://","").slice(0,20)}...</code>
            </div>
            <div style={{fontSize:10}}>
              <span style={{color:"#3ECF8E",fontWeight:700}}>●</span> Key: <code style={{fontSize:9}}>{config.supabase.anonKey?.slice(0,20)}...</code>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
