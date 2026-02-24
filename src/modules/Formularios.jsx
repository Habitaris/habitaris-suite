import React, { useState, useMemo, useEffect } from "react";
import { Plus, Trash2, Check, X, Search, Edit3, Copy, Send, Eye, ChevronDown, ChevronUp, GripVertical, ToggleLeft, ToggleRight, Share2, Mail, MessageCircle, Link2, FileText, Star, TrendingUp, Layers, Settings, AlertTriangle } from "lucide-react";
import { encodeFormDef } from "./FormularioPublico.jsx";
import { getConfig, resolveTemplate } from "./Configuracion.jsx";
import * as SB from "./supabase.js";

/* ═══════════════════════════════════════════════════════════════
   FORMULARIOS — Habitaris Suite
   Constructor · Respuestas · Plantillas · Dashboard
   ═══════════════════════════════════════════════════════════════ */

const Fonts = () => <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}body{font-family:'Outfit',sans-serif;background:#F5F4F1}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#C8C5BE;border-radius:2px}input,select,textarea,button{font-family:'Outfit',sans-serif;outline:none}button{cursor:pointer}@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}.fade-up{animation:fadeUp .22s ease both}`}</style>;
const T = { bg:"#F5F4F1",surface:"#FFFFFF",ink:"#111",inkMid:"#555",inkLight:"#909090",inkXLight:"#C8C5BE",border:"#E4E1DB",accent:"#EDEBE7",green:"#1E6B42",greenBg:"#E8F4EE",red:"#AE2C2C",redBg:"#FAE8E8",amber:"#7A5218",amberBg:"#FAF0E0",blue:"#1E4F8C",blueBg:"#E6EFF9",purple:"#5B3A8C",shadow:"0 1px 3px rgba(0,0,0,.06),0 4px 16px rgba(0,0,0,.05)" };
const uid = () => Math.random().toString(36).slice(2,10);
const today = () => new Date().toISOString().split("T")[0];
const F = { fontFamily:"'Outfit',sans-serif" };

/* ── Scoring calculator ── */
function calculateScore(resp, form) {
  if (!form?.campos) return null;
  const campos = form.campos.filter(c => c.scoring?.enabled);
  if (campos.length === 0) return null;

  let totalPoints = 0;
  let maxPoints = 0;
  let greens = 0, reds = 0, yellows = 0;
  const details = [];

  campos.forEach(c => {
    const w = c.scoring.weight || 1;
    const key = c.mapKey || c.id;
    let val = resp[key];
    if (val === undefined) return;
    maxPoints += w;

    const rules = c.scoring.rules || {};
    let flag = "neutral";

    if (Array.isArray(val)) {
      // chips: check each selected value, use worst flag
      const flags = val.map(v => rules[v] || "neutral");
      if (flags.includes("red")) flag = "red";
      else if (flags.every(f => f === "green")) flag = "green";
      else flag = "neutral";
    } else {
      flag = rules[String(val)] || "neutral";
    }

    let points = 0;
    if (flag === "green") { points = w; greens++; }
    else if (flag === "neutral") { points = w * 0.5; yellows++; }
    else { points = 0; reds++; }

    totalPoints += points;
    details.push({ label: c.label, value: Array.isArray(val) ? val.join(", ") : String(val), flag, points, maxPoints: w });
  });

  const score = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) / 10 : 0;
  const level = score >= 7 ? "green" : score >= 4 ? "yellow" : "red";
  const levelLabel = level === "green" ? "🟢 Cliente potencial" : level === "yellow" ? "🟡 Revisar" : "🔴 No califica";
  const conclusion = level === "green"
    ? "Perfil alineado con los servicios. Recomendación: contactar en las próximas 24h."
    : level === "yellow"
    ? "Algunos puntos requieren validación. Recomendación: agendar llamada exploratoria."
    : "Expectativas no alineadas con los servicios. Recomendación: responder cortésmente y archivar.";

  return { score, level, levelLabel, conclusion, greens, reds, yellows, totalPoints, maxPoints, details };
}

/* ── EmailJS — reads from centralized config ── */
const sendEmailJS = async (params) => {
  try {
    const cfg = getConfig();
    const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({
        service_id: cfg.correo.emailjs_serviceId,
        template_id: cfg.correo.emailjs_templateId,
        user_id: cfg.correo.emailjs_publicKey,
        template_params: params,
      })
    });
    return res.ok;
  } catch { return false; }
};
const Card = ({children,style,...p}) => <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:16,boxShadow:T.shadow,...style}} {...p}>{children}</div>;
const Btn = ({children,on,v,style,...p}) => <button onClick={on} style={{padding:"7px 16px",borderRadius:5,border:v==="sec"?`1px solid ${T.border}`:"none",background:v==="sec"?"#fff":v==="danger"?"#AE2C2C":"#111",color:v==="sec"?T.inkMid:"#fff",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif",display:"inline-flex",alignItems:"center",gap:5,...style}} {...p}>{children}</button>;
const Badge = ({children,color}) => <span style={{fontSize:8,fontWeight:700,padding:"2px 8px",borderRadius:10,background:color+"22",color}}>{children}</span>;
const inp = { border:`1px solid ${T.border}`, borderRadius:4, padding:"6px 8px", fontSize:11, fontFamily:"'Outfit',sans-serif", background:"#fff" };
const ths = {padding:"5px 8px",fontSize:8,fontWeight:700,color:"#888",textTransform:"uppercase",borderBottom:`2px solid ${T.border}`,textAlign:"left"};
const tds = {padding:"5px 8px",fontSize:10,borderBottom:`1px solid ${T.border}`};

const STORE_KEY = "habitaris_formularios";
const TABS = [
  { id:"dashboard", lbl:"📊 Dashboard" },
  { id:"mis_forms", lbl:"📋 Mis formularios" },
  { id:"constructor", lbl:"🔨 Constructor" },
  { id:"enviados", lbl:"📤 Enviados" },
  { id:"respuestas", lbl:"📥 Respuestas" },
  { id:"estadisticas", lbl:"📈 Estadísticas" },
  { id:"plantillas", lbl:"📎 Plantillas" },
];

/* ── Block types ── */
const BLOQUES = [
  { tipo:"text",     lbl:"Texto corto",     icon:"📝", desc:"Una línea de texto" },
  { tipo:"textarea", lbl:"Texto largo",      icon:"📄", desc:"Párrafo multilínea" },
  { tipo:"number",   lbl:"Número",           icon:"🔢", desc:"Valor numérico" },
  { tipo:"email",    lbl:"Email",            icon:"📧", desc:"Correo electrónico" },
  { tipo:"tel",      lbl:"Teléfono",         icon:"📞", desc:"Número telefónico" },
  { tipo:"date",     lbl:"Fecha",            icon:"📅", desc:"Selector de fecha" },
  { tipo:"select",   lbl:"Desplegable",      icon:"📋", desc:"Lista de opciones" },
  { tipo:"radio",    lbl:"Opción única",     icon:"🔘", desc:"Elegir una opción" },
  { tipo:"chips",    lbl:"Selección múltiple",icon:"☑️", desc:"Elegir varias opciones" },
  { tipo:"rango",    lbl:"Rango/Escala",     icon:"📊", desc:"Rango numérico" },
  { tipo:"rating",   lbl:"Valoración",       icon:"⭐", desc:"Estrellas 1-5" },
  { tipo:"yesno",    lbl:"Sí / No",          icon:"✅", desc:"Pregunta de sí o no" },
  { tipo:"seccion",  lbl:"Sección",          icon:"📌", desc:"Encabezado de sección" },
  { tipo:"info",     lbl:"Texto informativo", icon:"ℹ️", desc:"Párrafo informativo (sin respuesta)" },
];

/* ── Module associations ── */
const MODULOS_ASOC = [
  { id:"general", lbl:"General" },
  { id:"crm",     lbl:"CRM / Ofertas" },
  { id:"rrhh",    lbl:"RRHH" },
  { id:"sst",     lbl:"SST" },
  { id:"calidad", lbl:"Calidad" },
  { id:"postventa",lbl:"Postventa" },
  { id:"proyectos",lbl:"Proyectos" },
  { id:"logistica",lbl:"Logística" },
  { id:"compras", lbl:"Compras" },
  { id:"flotas",  lbl:"Flotas" },
  { id:"admin",   lbl:"Administración" },
];

/* ── Templates ── */
const PLANTILLAS = [
  { id:"briefing_inicial", nombre:"Briefing Inicial Habitaris", modulo:"crm", desc:"Formulario completo de briefing para nuevos proyectos — réplica Formly",
    campos:[
      /* ── Aviso de Privacidad (PRIMERO — gate) ── */
      {id:"f_privacidad",tipo:"info",label:"Aviso de Privacidad: En Habitaris SAS (NIT 901.922.136-8, domicilio Bogotá D.C., email: comercial.co, tel: +57 350 5661545), tratamos tus datos personales para procesar tu solicitud de briefing, enviar cotizaciones y gestionar proyectos. Cumplimos con la Ley 1581/2012 y Régimen de Protección de Datos. Derechos (acceso, rectificación, supresión, revocación): vía comercial.co.",desc:"",required:false,opciones:[],logica:null},
      {id:"f_acepta_priv",tipo:"yesno",label:"¿Aceptas el aviso de privacidad?",placeholder:"",required:true,opciones:["Sí","No"],logica:null,mapKey:"aceptaPrivacidad"},

      /* ── Datos del cliente ── */
      {id:"s1",tipo:"seccion",label:"Datos del cliente",desc:"Información personal y de contacto",required:false,opciones:[],logica:{fieldId:"f_acepta_priv",value:"Sí"}},
      {id:"f_nombre",tipo:"text",label:"Nombre y apellidos",placeholder:"Escribe tu respuesta aquí...",required:true,opciones:[],logica:null,mapKey:"nombre"},
      {id:"f_email",tipo:"email",label:"Correo electrónico",placeholder:"name@example.com",required:true,opciones:[],logica:null,mapKey:"email"},
      {id:"f_tel",tipo:"tel",label:"Teléfono de contacto",placeholder:"+57",required:true,opciones:[],logica:null,mapKey:"telefono"},
      {id:"f_propietario",tipo:"select",label:"¿Cuál es tu relación con el inmueble?",placeholder:"",required:true,opciones:["Soy el propietario","Estoy en arriendo","Actúo en nombre del propietario","Actúo en nombre de un tercero"],logica:null,mapKey:"propietario",scoring:{enabled:true,weight:2,rules:{"Soy el propietario":"green","Estoy en arriendo":"neutral","Actúo en nombre del propietario":"red","Actúo en nombre de un tercero":"red"}}},

      /* ── Sobre el servicio ── */
      {id:"s2",tipo:"seccion",label:"Sobre el servicio",desc:"¿Qué necesitas de Habitaris?",required:false,opciones:[],logica:null},
      {id:"f_servicio",tipo:"chips",label:"¿Qué servicio te interesa?",placeholder:"",required:true,opciones:["Diseño arquitectónico / Obra nueva","Diseño arquitectónico / Reforma","Interiorismo / Diseño de interiores","Biointeriorismo","Supervisión de obra (Presencial)","Supervisión de obra (Online)","Asesoría de Compras"],logica:null,mapKey:"servicios"},
      {id:"f_tipo_proy",tipo:"select",label:"¿El proyecto es residencial, comercial o rural?",placeholder:"",required:true,opciones:["Residencial","Comercial","Rural"],logica:null,mapKey:"tipoProyecto"},

      /* ── Ubicación y espacio ── */
      {id:"s3",tipo:"seccion",label:"Ubicación y espacio",desc:"Detalles del inmueble",required:false,opciones:[],logica:null},
      {id:"f_ciudad",tipo:"text",label:"Ciudad o población",placeholder:"Escribe tu respuesta aquí...",required:true,opciones:[],logica:null,mapKey:"ciudad"},
      {id:"f_direccion",tipo:"textarea",label:"Dirección del proyecto",placeholder:"Escribe tu respuesta aquí...",required:true,opciones:[],logica:null,mapKey:"direccion"},
      {id:"f_edificio",tipo:"text",label:"Nombre del edificio o conjunto",placeholder:"Escribe tu respuesta aquí...",required:true,opciones:[],logica:null,mapKey:"edificio"},
      {id:"f_area",tipo:"text",label:"Área aproximada en m²",placeholder:"Escribe tu respuesta aquí...",required:true,opciones:[],logica:null,mapKey:"area"},
      {id:"f_habitaciones",tipo:"text",label:"Número de habitaciones/áreas a intervenir",placeholder:"Escribe tu respuesta aquí...",required:true,opciones:[],logica:null,mapKey:"habitaciones"},
      {id:"f_espacios",tipo:"chips",label:"¿Qué espacios incluye el proyecto?",placeholder:"",required:true,opciones:["Sala","Comedor","Cocina","Habitaciones","Baños","Terraza / Balcón","Estudio / Oficina","Local comercial"],logica:null,mapKey:"espacios"},

      /* ── Estilo y diseño ── */
      {id:"s4",tipo:"seccion",label:"Estilo y diseño",desc:"Tus preferencias estéticas",required:false,opciones:[],logica:null},
      {id:"f_estilo",tipo:"chips",label:"Estilo Preferido",placeholder:"",required:true,opciones:["Bio-natural/Orgánico","Bohemio","Clásico","Escandinavo","Industrial","Minimalista","Moderno","Otro"],logica:null,mapKey:"estilo"},
      {id:"f_colores",tipo:"textarea",label:"Colores, materiales y elementos clave",placeholder:"Escribe tu respuesta aquí...",required:true,opciones:[],logica:null,mapKey:"colores"},
      {id:"f_links_ref",tipo:"textarea",label:"Pega aquí los links de tus ideas o referentes",placeholder:"Escribe tu respuesta aquí...",required:false,opciones:[],logica:null,mapKey:"linksReferentes"},

      /* ── Expectativas ── */
      {id:"s5",tipo:"seccion",label:"Expectativas del proyecto",desc:"¿Qué esperas lograr?",required:false,opciones:[],logica:null},
      {id:"f_lograr",tipo:"chips",label:"¿Qué esperas lograr con este proyecto?",placeholder:"",required:true,opciones:["Inspiración o ideas generales","Planos base y distribución funcional","Diseño integral con renders, acabados y mobiliario","Supervisión y acompañamiento durante la ejecución"],logica:null,mapKey:"expectativas",scoring:{enabled:true,weight:3,rules:{"Inspiración o ideas generales":"red","Planos base y distribución funcional":"neutral","Diseño integral con renders, acabados y mobiliario":"green","Supervisión y acompañamiento durante la ejecución":"green"}}},
      {id:"f_importante",tipo:"chips",label:"Lo más importante para ti en el proyecto",placeholder:"",required:true,opciones:["Estética / Diseño","Funcionalidad","Presupuesto ajustado","Tiempo de entrega","Exclusividad / Personalización"],logica:null,mapKey:"prioridades",scoring:{enabled:true,weight:2,rules:{"Estética / Diseño":"green","Funcionalidad":"green","Presupuesto ajustado":"red","Tiempo de entrega":"neutral","Exclusividad / Personalización":"green"}}},

      /* ── Presupuesto y financiación ── */
      {id:"s6",tipo:"seccion",label:"Presupuesto y financiación",desc:"Información económica del proyecto",required:false,opciones:[],logica:null},
      {id:"f_presupuesto",tipo:"select",label:"Presupuesto estimado (COP) disponible para el proyecto",placeholder:"",required:true,opciones:["Menos de $10.000.000","$10.000.000 - $30.000.000","$30.000.000 - $60.000.000","$60.000.000 - $100.000.000","Más de $100.000.000"],logica:null,mapKey:"presupuesto",scoring:{enabled:true,weight:5,rules:{"Menos de $10.000.000":"red","$10.000.000 - $30.000.000":"neutral","$30.000.000 - $60.000.000":"green","$60.000.000 - $100.000.000":"green","Más de $100.000.000":"green"}}},
      {id:"f_honorarios",tipo:"select",label:"¿Tu presupuesto incluye los honorarios de diseño?",placeholder:"",required:true,opciones:["Sí, incluye diseño y ejecución","Solo ejecución/materiales, el diseño aparte","No, espero que el diseño esté incluido sin costo","No estoy seguro"],logica:null,mapKey:"honorariosDiseño",scoring:{enabled:true,weight:5,rules:{"Sí, incluye diseño y ejecución":"green","Solo ejecución/materiales, el diseño aparte":"green","No, espero que el diseño esté incluido sin costo":"red","No estoy seguro":"neutral"}}},
      {id:"f_financiar",tipo:"select",label:"¿Cómo planeas financiar el proyecto?",placeholder:"",required:true,opciones:["Con recursos propios","Crédito bancario o leasing habitacional","Con apoyo de un tercero","Aún no lo tengo definido"],logica:null,mapKey:"financiacion",scoring:{enabled:true,weight:3,rules:{"Con recursos propios":"green","Crédito bancario o leasing habitacional":"neutral","Con apoyo de un tercero":"neutral","Aún no lo tengo definido":"red"}}},
      {id:"f_invertido",tipo:"select",label:"¿Has invertido antes en diseño profesional?",placeholder:"",required:true,opciones:["Sí","No, pero estoy dispuesto","No, nunca lo haría"],logica:null,mapKey:"inversionPrevia",scoring:{enabled:true,weight:3,rules:{"Sí":"green","No, pero estoy dispuesto":"neutral","No, nunca lo haría":"red"}}},
      {id:"f_gratuito",tipo:"select",label:"¿Esperas que el diseño sea gratuito o solo de referencia?",placeholder:"",required:true,opciones:["Sí, solo busco ideas generales","No, estoy dispuesto a pagar por un diseño profesional"],logica:null,mapKey:"expectativaPago",scoring:{enabled:true,weight:4,rules:{"Sí, solo busco ideas generales":"red","No, estoy dispuesto a pagar por un diseño profesional":"green"}}},
      {id:"f_exceder",tipo:"select",label:"¿Aceptarías una propuesta que no cumpla con tu presupuesto, si garantiza calidad y durabilidad?",placeholder:"",required:true,opciones:["Sí, puedo ajustarme","No, solo lo hago si es más barato"],logica:null,mapKey:"flexibilidad",scoring:{enabled:true,weight:4,rules:{"Sí, puedo ajustarme":"green","No, solo lo hago si es más barato":"red"}}},
      {id:"f_anticipo",tipo:"yesno",label:"¿Dispuesto a pagar anticipo 30-50%?",placeholder:"",required:true,opciones:["Sí","No"],logica:null,mapKey:"anticipo",scoring:{enabled:true,weight:5,rules:{"Sí":"green","No":"red"}}},
      {id:"f_contratistas",tipo:"select",label:"¿Quieres que te recomendemos contratistas de confianza para la obra?",placeholder:"",required:true,opciones:["Sí","No"],logica:null,mapKey:"contratistas"},

      /* ── Plazos ── */
      {id:"s7",tipo:"seccion",label:"Plazos",desc:"Tiempos del proyecto",required:false,opciones:[],logica:null},
      {id:"f_plazo",tipo:"select",label:"Plazo esperado para finalización",placeholder:"",required:true,opciones:["1 - 3 meses","3 - 6 meses","> 6 Meses"],logica:null,mapKey:"plazo",scoring:{enabled:true,weight:2,rules:{"1 - 3 meses":"red","3 - 6 meses":"neutral","> 6 Meses":"green"}}},
      {id:"f_inicio",tipo:"date",label:"Fecha tentativa de inicio",placeholder:"",required:true,opciones:[],logica:null,mapKey:"fechaInicio"},

      /* ── Facturación ── */
      {id:"s8",tipo:"seccion",label:"Información de facturación",desc:"Datos para facturación electrónica",required:false,opciones:[],logica:null},
      {id:"f_razon_social",tipo:"text",label:"Nombre o razón social para facturación",placeholder:"Escribe tu respuesta aquí...",required:true,opciones:[],logica:null,mapKey:"razonSocial"},
      {id:"f_doc",tipo:"text",label:"Tipo y número de documento",placeholder:"Escribe tu respuesta aquí...",required:true,opciones:[],logica:null,mapKey:"documento"},
      {id:"f_email_fact",tipo:"email",label:"Email para envío de factura",placeholder:"name@example.com",required:true,opciones:[],logica:null,mapKey:"emailFactura"},
      {id:"f_dir_fact",tipo:"text",label:"Dirección de facturación",placeholder:"Escribe tu respuesta aquí...",required:true,opciones:[],logica:null,mapKey:"dirFacturacion"},
      {id:"f_forma_pago",tipo:"select",label:"Forma de pago preferida",placeholder:"",required:true,opciones:["Enlace PSE","Tarjeta de Crédito/débito"],logica:null,mapKey:"formaPago"},
      {id:"f_retenciones",tipo:"yesno",label:"¿Aplican retenciones especiales?",placeholder:"",required:true,opciones:["Sí","No"],logica:null,mapKey:"retenciones"},
      {id:"f_det_ret",tipo:"textarea",label:"Detalle de retenciones",placeholder:"Escribe tu respuesta aquí...",required:true,opciones:[],logica:{fieldId:"f_retenciones",value:"Sí"},mapKey:"detalleRetenciones"},

      /* ── Legal ── */
      {id:"s9",tipo:"seccion",label:"Autorizaciones legales",desc:"",required:false,opciones:[],logica:{fieldId:"f_acepta_priv",value:"Sí"}},
      {id:"f_confirmacion",tipo:"info",label:"✅ Confirmación: La información entregada es verídica y será utilizada únicamente para la elaboración de la propuesta de diseño. Habitaris S.A.S. garantiza la confidencialidad de los datos y no los compartirá con terceros, salvo con proveedores o contratistas de confianza cuando sea necesario para la correcta ejecución del proyecto, previa autorización del cliente.",desc:"",required:false,opciones:[],logica:{fieldId:"f_acepta_priv",value:"Sí"}},
      {id:"f_acepta_conf",tipo:"yesno",label:"¿Confirmas que la información es verídica?",placeholder:"",required:true,opciones:["Sí","No"],logica:{fieldId:"f_acepta_priv",value:"Sí"},mapKey:"confirmacion"},
      {id:"f_habeas",tipo:"info",label:"🔒 Autorización de tratamiento de datos personales: Al enviar este formulario autorizo a Habitaris S.A.S., para el uso de mis datos personales con el fin de elaborar propuestas de diseño, coordinar servicios relacionados y, en caso de ser necesario, compartirlos con proveedores o contratistas de confianza exclusivamente para la correcta ejecución del proyecto. En todo momento se garantizará la confidencialidad y protección de mi información, conforme a la normativa de Habeas Data en Colombia (Ley 1581 de 2012).",desc:"",required:false,opciones:[],logica:{fieldId:"f_acepta_priv",value:"Sí"}},
      {id:"f_acepta_habeas",tipo:"yesno",label:"¿Autorizas el tratamiento de datos personales?",placeholder:"",required:true,opciones:["Sí","No"],logica:{fieldId:"f_acepta_priv",value:"Sí"},mapKey:"habeasData"},
    ],
    config:{titulo:"BRIEFING INICIAL",subtitulo:"Cuéntanos sobre tu proyecto para preparar la mejor propuesta",mensajeExito:"Gracias por diligenciar el Briefing de tu proyecto. Nos pondremos en contacto contigo pronto.",telRespuesta:"573505661545"}
  },
  { id:"encuesta_satisfaccion", nombre:"Encuesta de satisfacción", modulo:"postventa", desc:"Evaluar experiencia del cliente post-entrega",
    campos:[
      {id:uid(),tipo:"seccion",label:"Tu experiencia",desc:"Ayúdanos a mejorar",required:false,opciones:[],logica:null},
      {id:uid(),tipo:"text",label:"Nombre",placeholder:"Tu nombre",required:true,opciones:[],logica:null},
      {id:uid(),tipo:"text",label:"Proyecto/Inmueble",placeholder:"Nombre del proyecto o dirección",required:true,opciones:[],logica:null},
      {id:uid(),tipo:"rating",label:"Calidad de la construcción",placeholder:"",required:true,opciones:[],logica:null},
      {id:uid(),tipo:"rating",label:"Cumplimiento de plazos",placeholder:"",required:true,opciones:[],logica:null},
      {id:uid(),tipo:"rating",label:"Atención al cliente",placeholder:"",required:true,opciones:[],logica:null},
      {id:uid(),tipo:"rating",label:"Relación calidad/precio",placeholder:"",required:true,opciones:[],logica:null},
      {id:uid(),tipo:"yesno",label:"¿Recomendarías nuestros servicios?",placeholder:"",required:true,opciones:[],logica:null},
      {id:uid(),tipo:"textarea",label:"Comentarios adicionales",placeholder:"Tu opinión nos importa...",required:false,opciones:[],logica:null},
    ],
    config:{titulo:"Encuesta de satisfacción",subtitulo:"Tu opinión nos ayuda a mejorar",mensajeExito:"¡Gracias por tu tiempo! Tu opinión es muy valiosa para nosotros."}
  },
  { id:"inspeccion_sst", nombre:"Inspección SST", modulo:"sst", desc:"Checklist de seguridad en obra",
    campos:[
      {id:uid(),tipo:"seccion",label:"Información general",desc:"",required:false,opciones:[],logica:null},
      {id:uid(),tipo:"text",label:"Proyecto/Obra",placeholder:"",required:true,opciones:[],logica:null},
      {id:uid(),tipo:"text",label:"Inspector",placeholder:"",required:true,opciones:[],logica:null},
      {id:uid(),tipo:"date",label:"Fecha de inspección",placeholder:"",required:true,opciones:[],logica:null},
      {id:uid(),tipo:"seccion",label:"Checklist de seguridad",desc:"Evalúe cada aspecto",required:false,opciones:[],logica:null},
      {id:uid(),tipo:"radio",label:"EPPs: ¿Personal usa casco?",placeholder:"",required:true,opciones:["Cumple","No cumple","N/A"],logica:null},
      {id:uid(),tipo:"radio",label:"EPPs: ¿Personal usa arnés en alturas?",placeholder:"",required:true,opciones:["Cumple","No cumple","N/A"],logica:null},
      {id:uid(),tipo:"radio",label:"EPPs: ¿Personal usa botas de seguridad?",placeholder:"",required:true,opciones:["Cumple","No cumple","N/A"],logica:null},
      {id:uid(),tipo:"radio",label:"Señalización: ¿Áreas demarcadas?",placeholder:"",required:true,opciones:["Cumple","No cumple","N/A"],logica:null},
      {id:uid(),tipo:"radio",label:"Orden y aseo: ¿Área de trabajo limpia?",placeholder:"",required:true,opciones:["Cumple","No cumple","N/A"],logica:null},
      {id:uid(),tipo:"radio",label:"Herramientas: ¿En buen estado?",placeholder:"",required:true,opciones:["Cumple","No cumple","N/A"],logica:null},
      {id:uid(),tipo:"textarea",label:"Hallazgos y observaciones",placeholder:"Detalle los hallazgos...",required:false,opciones:[],logica:null},
      {id:uid(),tipo:"radio",label:"Resultado general",placeholder:"",required:true,opciones:["Aprobado","Aprobado con observaciones","No aprobado"],logica:null},
    ],
    config:{titulo:"Inspección de Seguridad y Salud",subtitulo:"Checklist de verificación en obra",mensajeExito:"Inspección registrada correctamente."}
  },
  { id:"recepcion_material", nombre:"Recepción de material", modulo:"logistica", desc:"Registrar recepción en almacén",
    campos:[
      {id:uid(),tipo:"text",label:"Orden de compra / Referencia",placeholder:"OC-0001",required:true,opciones:[],logica:null},
      {id:uid(),tipo:"text",label:"Proveedor",placeholder:"",required:true,opciones:[],logica:null},
      {id:uid(),tipo:"date",label:"Fecha recepción",placeholder:"",required:true,opciones:[],logica:null},
      {id:uid(),tipo:"text",label:"Recibido por",placeholder:"Nombre almacenista",required:true,opciones:[],logica:null},
      {id:uid(),tipo:"textarea",label:"Materiales recibidos",placeholder:"Detalle ítems, cantidades...",required:true,opciones:[],logica:null},
      {id:uid(),tipo:"radio",label:"¿Estado del material conforme?",placeholder:"",required:true,opciones:["Conforme","No conforme","Parcialmente conforme"],logica:null},
      {id:uid(),tipo:"textarea",label:"Observaciones",placeholder:"Notas sobre estado, faltantes...",required:false,opciones:[],logica:null},
    ],
    config:{titulo:"Recepción de material",subtitulo:"Registro de entrada al almacén",mensajeExito:"Recepción registrada."}
  },
];

/* ═══════════════════════════════════════════════════════════════
   CONSTRUCTOR DE FORMULARIOS
   ═══════════════════════════════════════════════════════════════ */
function Constructor({ forms, setForms, editId, setEditId, onSaved, envios, addEnvio }) {
  const existing = editId ? forms.find(f=>f.id===editId) : null;
  const [nombre, setNombre] = useState(existing?.nombre || "");
  const [modulo, setModulo] = useState(existing?.modulo || "general");
  const [campos, setCampos] = useState(existing?.campos || []);
  const [config, setConfig] = useState(existing?.config || {titulo:"",subtitulo:"",mensajeExito:"¡Gracias por tu respuesta!",telRespuesta:"",vista:"pasos",colorAccent:"#111111",botonTexto:""});
  const [selIdx, setSelIdx] = useState(null);
  const [preview, setPreview] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [shareClient, setShareClient] = useState({nombre:"",email:"",tel:""});
  const [shareGenerated, setShareGenerated] = useState("");
  const [shareFileName, setShareFileName] = useState("");
  const [linkMaxUsos, setLinkMaxUsos] = useState(0);
  const [linkExpiry, setLinkExpiry] = useState("");
  const [dragIdx, setDragIdx] = useState(null);

  const addCampo = (tipo) => {
    const b = BLOQUES.find(bl=>bl.tipo===tipo);
    const c = { id:uid(), tipo, label:b?.lbl||tipo, placeholder:"", required:false, opciones:tipo==="rating"?[]:tipo==="yesno"?["Sí","No"]:[], logica:null, desc:"" };
    if (["select","radio","chips","rango"].includes(tipo)) c.opciones = ["Opción 1","Opción 2"];
    setCampos([...campos, c]);
    setSelIdx(campos.length);
  };
  const updCampo = (idx,k,v) => setCampos(campos.map((c,i)=>i===idx?{...c,[k]:v}:c));
  const delCampo = (idx) => { setCampos(campos.filter((_,i)=>i!==idx)); if(selIdx===idx) setSelIdx(null); else if(selIdx>idx) setSelIdx(selIdx-1); };
  const move = (from, dir) => {
    const to = from + dir;
    if (to<0||to>=campos.length) return;
    const arr = [...campos]; [arr[from],arr[to]] = [arr[to],arr[from]];
    setCampos(arr);
    setSelIdx(to);
  };

  const guardar = () => {
    if (!nombre.trim()) return;
    const form = {
      id: existing?.id || uid(),
      nombre, modulo, campos,
      config: {...config, titulo:config.titulo||nombre},
      createdAt: existing?.createdAt || today(),
      updatedAt: today(),
      activo: true,
    };
    if (existing) {
      setForms(forms.map(f=>f.id===form.id?form:f));
    } else {
      setForms([...forms, form]);
    }
    onSaved(form);
  };

  /* Generate standalone HTML form file */
  const generateFormHTML = (client) => {
    const cfg = getConfig();
    const def = { id:existing?.id||"form", nombre, campos, config:{...config,titulo:config.titulo||nombre}, cliente:client||null };
    const defJSON = JSON.stringify(def);
    const telWA = (config.telRespuesta||cfg.whatsapp.numero||"").replace(/[^0-9]/g,"");
    const empresaNombre = cfg.empresa.nombre.toUpperCase();
    const empresaEslogan = cfg.empresa.eslogan;

    return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${config.titulo||nombre||"Formulario"}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Outfit',sans-serif;background:#F5F4F1;color:#111}
.hdr{background:#111;padding:14px 24px}.hdr-in{max-width:640px;margin:0 auto;display:flex;justify-content:space-between;align-items:center}
.logo{font-weight:700;font-size:14px;letter-spacing:3px;color:#fff}.logo-sub{font-size:7px;letter-spacing:2px;color:rgba(255,255,255,.4);text-transform:uppercase;margin-top:2px}
.prog{max-width:640px;margin:8px auto 0;height:3px;background:rgba(255,255,255,.1);border-radius:2px}.prog-bar{height:100%;background:#1E6B42;border-radius:2px;transition:width .3s;width:0%}
.wrap{max-width:640px;margin:0 auto;padding:28px 20px 120px}
.client-b{background:#E6EFF9;border:1px solid rgba(30,79,140,.2);border-radius:8px;padding:12px 16px;margin-bottom:16px;display:flex;align-items:center;gap:10px}
.client-av{width:36px;height:36px;border-radius:50%;background:#1E4F8C;color:#fff;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700}
.client-n{font-size:13px;font-weight:700;color:#1E4F8C}.client-e{font-size:10px;color:#5A8BC2;margin-top:2px}
.title{text-align:center;margin-bottom:28px}.title h1{font-size:22px;font-weight:700;margin:0 0 6px}.title p{font-size:13px;color:#555}
.card{background:#fff;border-radius:10px;padding:24px 28px;border:1px solid #E4E1DB;box-shadow:0 2px 12px rgba(0,0,0,.04)}
.fld{margin-bottom:16px}.lbl{font-size:11px;font-weight:600;display:block;margin-bottom:5px}.req{color:#AE2C2C}
.inp{width:100%;padding:10px 14px;border:1px solid #E4E1DB;border-radius:6px;font-size:14px;font-family:'Outfit',sans-serif;color:#111;background:#fff;box-sizing:border-box}
.inp:disabled{background:#E6EFF9;border-color:rgba(30,79,140,.27);color:#1E4F8C;font-weight:600}
textarea.inp{resize:vertical}select.inp{appearance:auto}
.sec{margin-top:24px;margin-bottom:12px;padding-top:16px;border-top:2px solid #111}.sec h3{font-size:14px;font-weight:700}.sec p{font-size:11px;color:#909090;margin-top:4px}
.info-b{margin-bottom:16px;padding:12px 16px;background:#E6EFF9;border-radius:8px;border:1px solid rgba(30,79,140,.2);font-size:13px;color:#1E4F8C}
.radio-g{display:flex;flex-direction:column;gap:6px;margin-top:4px}.radio-g label{display:flex;align-items:center;gap:8px;font-size:13px;padding:6px 10px;border-radius:6px;cursor:pointer}
.radio-g label.sel{background:#E6EFF9;border:1px solid rgba(30,79,140,.2)}.radio-g input{accent-color:#111}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}.chip{padding:6px 14px;font-size:12px;border-radius:20px;border:1px solid #E4E1DB;background:#fff;cursor:pointer;font-family:'Outfit',sans-serif;transition:all .15s}
.chip.sel{background:#111;color:#fff;border-color:#111;font-weight:700}
.stars{display:flex;gap:6px;margin-top:4px}.star{font-size:28px;cursor:pointer;background:none;border:none;transition:all .15s}
.yn{display:flex;gap:8px;margin-top:6px}.yn-btn{padding:10px 24px;font-size:14px;border-radius:24px;border:1px solid #E4E1DB;background:#fff;cursor:pointer;font-family:'Outfit',sans-serif;transition:all .15s}
.yn-btn.sel{background:#111;color:#fff;border-color:#111;font-weight:700}
.sticky{position:fixed;bottom:0;left:0;right:0;background:#fff;border-top:2px solid #111;padding:12px 20px;z-index:200;box-shadow:0 -4px 20px rgba(0,0,0,.08)}
.sticky-in{max-width:640px;margin:0 auto;display:flex;justify-content:center}
.submit{padding:14px 40px;background:#111;color:#fff;border:none;border-radius:6px;font-size:15px;font-weight:700;cursor:pointer;letter-spacing:.5px;font-family:'Outfit',sans-serif}
.err{font-size:12px;color:#AE2C2C;text-align:center;margin:12px 0}
.ok{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#F5F4F1}
.ok-card{background:#fff;border-radius:12px;padding:40px;max-width:480px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,.08)}
.lock{font-size:8px;color:#1E4F8C;font-weight:400}
</style></head><body>
<div id="app"></div>
<script>
const DEF=${defJSON};
const cfg=DEF.config||{};const campos=DEF.campos||[];const cliente=DEF.cliente||null;
const empresaNombre="${cfg.empresa.nombre.toUpperCase().replace(/"/g,'\\"')}";
const empresaEslogan="${cfg.empresa.eslogan.replace(/"/g,'\\"')}";
const vals={};let submitted=false;
// One-time use check
const privField=campos.find(c=>c.mapKey==='aceptaPrivacidad');
const privId=privField?privField.id:'f_acepta_priv';
const formKey='hab_used_'+(DEF.id||'')+'_'+(cliente?cliente.email||cliente.nombre:'');
if(localStorage.getItem(formKey)){submitted=true;}
// Prefill client fields
if(cliente){campos.forEach(c=>{
  if(cliente.email&&(c.mapKey==="email"||c.tipo==="email"))vals[c.id]=cliente.email;
  if(cliente.nombre&&(c.mapKey==="nombre"||(c.tipo==="text"&&c.label.toLowerCase().includes("nombre"))))vals[c.id]=cliente.nombre;
  if(cliente.tel&&(c.mapKey==="telefono"||c.tipo==="tel"))vals[c.id]=cliente.tel;
});}
function isLocked(c){if(!cliente)return false;
  if(cliente.email&&(c.mapKey==="email"||c.tipo==="email"))return true;
  if(cliente.nombre&&(c.mapKey==="nombre"||(c.tipo==="text"&&c.label.toLowerCase().includes("nombre"))))return true;
  if(cliente.tel&&(c.mapKey==="telefono"||c.tipo==="tel"))return true;return false;}
function isVisible(c){if(!c.logica||!c.logica.fieldId||!c.logica.value)return true;
  const dv=vals[c.logica.fieldId];const ex=c.logica.value;
  if(Array.isArray(dv))return dv.includes(ex);return String(dv||"")===ex;}
function render(){
  const app=document.getElementById("app");
  if(submitted){app.innerHTML=\`<div class="ok"><div class="ok-card"><div style="font-size:48px;margin-bottom:12px">🎉</div><h2 style="font-size:20px;font-weight:700;color:#1E6B42;margin:0 0 8px">¡Enviado!</h2><p style="font-size:13px;color:#555;line-height:1.6">\${cfg.mensajeExito||"Gracias por completar el formulario."}</p></div></div>\`;return;}
  // Privacy gate: if user declined, show goodbye
  if(vals[privId]==='No'){app.innerHTML=\`<div class="ok"><div class="ok-card"><div style="font-size:48px;margin-bottom:12px">👋</div><h2 style="font-size:20px;font-weight:700;color:#111;margin:0 0 8px">Gracias por tu tiempo</h2><p style="font-size:13px;color:#555;line-height:1.6">Para poder continuar con el briefing, necesitamos tu autorización para el tratamiento de datos personales. Si cambias de opinión, vuelve a abrir este formulario.</p></div></div>\`;return;}
  const privAccepted=vals[privId]==='Sí';
  const privInfoField=campos.find(c=>c.tipo==='info'&&c.label&&c.label.includes('Aviso de Privacidad'));
  const visibleCampos=privAccepted?campos:campos.filter(c=>c.id===privId||(privInfoField&&c.id===privInfoField.id));
  const totalReq=visibleCampos.filter(c=>c.required&&c.tipo!=="seccion"&&c.tipo!=="info"&&isVisible(c)).length;
  const filledReq=visibleCampos.filter(c=>c.required&&c.tipo!=="seccion"&&c.tipo!=="info"&&isVisible(c)&&vals[c.id]&&(Array.isArray(vals[c.id])?vals[c.id].length>0:true)).length;
  const pct=totalReq>0?Math.round((filledReq/totalReq)*100):0;
  let h=\`<div class="hdr"><div class="hdr-in"><div><div class="logo">\${empresaNombre}</div><div class="logo-sub">\${empresaEslogan}</div></div><div style="font-size:10px;color:rgba(255,255,255,.4)">\${pct}% completo</div></div><div class="prog"><div class="prog-bar" style="width:\${pct}%"></div></div></div>\`;
  h+=\`<div class="wrap">\`;
  if(cliente){h+=\`<div class="client-b"><div class="client-av">\${(cliente.nombre||cliente.email||"?")[0].toUpperCase()}</div><div><div class="client-n">Formulario para: \${cliente.nombre||cliente.email}</div>\${cliente.email?\`<div class="client-e">\${cliente.email}</div>\`:""}</div></div>\`;}
  h+=\`<div class="title"><h1>\${cfg.titulo||DEF.nombre||"Formulario"}</h1>\${cfg.subtitulo?\`<p>\${cfg.subtitulo}</p>\`:""}</div>\`;
  h+=\`<div class="card">\`;
  visibleCampos.forEach((c,i)=>{
    if(!isVisible(c))return;
    if(c.tipo==="seccion"){h+=\`<div class="sec"><h3>\${c.label}</h3>\${c.desc?\`<p>\${c.desc}</p>\`:""}</div>\`;return;}
    if(c.tipo==="info"){h+=\`<div class="info-b">\${c.label}</div>\`;return;}
    const locked=isLocked(c);const v=vals[c.id]||"";const req=c.required?\`<span class="req"> *</span>\`:"";
    h+=\`<div class="fld">\`;
    if(locked){
      h+=\`<label class="lbl">\${c.label} <span class="lock">🔒 prellenado</span></label>\`;
      h+=\`<input class="inp" value="\${v}" disabled/>\`;
    }else if(["text","email","tel","number","date"].includes(c.tipo)){
      h+=\`<label class="lbl">\${c.label}\${req}</label>\`;
      h+=\`<input class="inp" type="\${c.tipo}" value="\${v}" placeholder="\${c.placeholder||""}" onchange="vals['\${c.id}']=this.value;render()"/>\`;
    }else if(c.tipo==="textarea"){
      h+=\`<label class="lbl">\${c.label}\${req}</label>\`;
      h+=\`<textarea class="inp" rows="3" placeholder="\${c.placeholder||""}" onchange="vals['\${c.id}']=this.value;render()">\${v}</textarea>\`;
    }else if(c.tipo==="select"||c.tipo==="rango"){
      h+=\`<label class="lbl">\${c.label}\${req}</label>\`;
      h+=\`<select class="inp" onchange="vals['\${c.id}']=this.value;render()"><option value="">Seleccionar...</option>\`;
      (c.opciones||[]).forEach(o=>{h+=\`<option value="\${o}" \${v===o?"selected":""}>\${o}</option>\`;});
      h+=\`</select>\`;
    }else if(c.tipo==="radio"){
      h+=\`<label class="lbl">\${c.label}\${req}</label><div class="radio-g">\`;
      (c.opciones||[]).forEach(o=>{h+=\`<label class="\${v===o?"sel":""}"><input type="radio" name="r\${c.id}" \${v===o?"checked":""} onchange="vals['\${c.id}']='\${o}';render()"/> \${o}</label>\`;});
      h+=\`</div>\`;
    }else if(c.tipo==="chips"){
      const sel=Array.isArray(vals[c.id])?vals[c.id]:[];
      h+=\`<label class="lbl">\${c.label}\${req}</label><div class="chips">\`;
      (c.opciones||[]).forEach(o=>{h+=\`<span class="chip \${sel.includes(o)?"sel":""}" onclick="var s=Array.isArray(vals['\${c.id}'])?vals['\${c.id}']:[];if(s.includes('\${o}'))s=s.filter(x=>x!=='\${o}');else s.push('\${o}');vals['\${c.id}']=s;render()">\${o}</span>\`;});
      h+=\`</div>\`;
    }else if(c.tipo==="rating"){
      const stars=parseInt(v)||0;
      h+=\`<label class="lbl">\${c.label}\${req}</label><div class="stars">\`;
      for(let n=1;n<=5;n++){h+=\`<button class="star" style="opacity:\${n<=stars?1:.3};filter:\${n<=stars?"none":"grayscale(1)"}" onclick="vals['\${c.id}']=\${n};render()">⭐</button>\`;}
      h+=\`</div>\${stars>0?\`<div style="font-size:11px;color:#555;margin-top:4px">\${stars} de 5</div>\`:""}\`;
    }else if(c.tipo==="yesno"){
      h+=\`<label class="lbl">\${c.label}\${req}</label><div class="yn">\`;
      ["Sí","No"].forEach(o=>{h+=\`<button class="yn-btn \${v===o?"sel":""}" onclick="vals['\${c.id}']='\${o}';render()">\${o}</button>\`;});
      h+=\`</div>\`;
    }
    h+=\`</div>\`;
  });
  h+=\`</div><div id="err" class="err"></div></div>\`;
  h+=\`<div class="sticky"><div class="sticky-in"><button class="submit" onclick="doSubmit()">Enviar formulario</button></div></div>\`;
  app.innerHTML=h;
}
function doSubmit(){
  document.getElementById("err").textContent="";
  for(const c of campos){
    if(c.required&&c.tipo!=="seccion"&&c.tipo!=="info"&&isVisible(c)&&!isLocked(c)){
      const v=vals[c.id];if(!v||(Array.isArray(v)&&v.length===0)){document.getElementById("err").textContent='El campo "'+c.label+'" es obligatorio.';return;}
    }
  }
  const lines=campos.filter(c=>c.tipo!=="seccion"&&c.tipo!=="info"&&vals[c.id]).map(c=>{
    const v=Array.isArray(vals[c.id])?vals[c.id].join(", "):vals[c.id];return"• "+c.label+": "+v;});
  const cl=cliente?"👤 Cliente: "+(cliente.nombre||"")+" ("+(cliente.email||"")+")\\n":"";
  const msg="📋 RESPUESTA: "+(DEF.nombre||"Formulario")+"\\n\\n"+cl+lines.join("\\n")+"\\n\\nFecha: "+new Date().toISOString().split("T")[0];
  const tel="${telWA}";
  submitted=true;localStorage.setItem(formKey,'1');render();
  setTimeout(()=>{window.open("https://wa.me/"+(tel?tel:"")+"?text="+encodeURIComponent(msg),"_blank");},600);
}
render();
<\/script></body></html>`;
  };

  const [sharePublicUrl, setSharePublicUrl] = useState("");

  const generateLink = () => {
    if (!shareClient.email && !shareClient.nombre) return;
    const client = {nombre:shareClient.nombre, email:shareClient.email, tel:shareClient.tel};
    // Generate standalone HTML file (for download/WhatsApp)
    const html = generateFormHTML(client);
    const blob = new Blob([html], {type:"text/html"});
    const url = URL.createObjectURL(blob);
    setShareGenerated(url);
    setShareFileName(`formulario-${(nombre||"form").replace(/\s+/g,"-").toLowerCase()}-${(shareClient.nombre||"cliente").replace(/\s+/g,"-").toLowerCase()}.html`);
    // Generate link ID for tracking
    const linkId = uid() + Date.now().toString(36);
    // Generate public URL (for email link)
    const cfg = getConfig();
    const appUrl = (cfg.app?.url || "").replace(/\/$/,"");
    if (appUrl) {
      const linkConfig = { linkId, maxUsos: linkMaxUsos||0, fechaCaducidad: linkExpiry||"" };
      const def = { id:existing?.id||"form", nombre, campos, config:{...config,titulo:config.titulo||nombre}, cliente:client||null, linkConfig, modulo, marca:{ logo:cfg.apariencia?.logo||"", colorPrimario:cfg.apariencia?.colorPrimario||"#111", colorSecundario:cfg.apariencia?.colorSecundario||"#1E4F8C", colorAcento:cfg.apariencia?.colorAcento||"#C9A84C", tipografia:cfg.apariencia?.tipografia||"Outfit", slogan:cfg.apariencia?.slogan||cfg.empresa?.eslogan||"", empresa:cfg.empresa?.nombre||"Habitaris", razonSocial:cfg.empresa?.razonSocial||"", domicilio:cfg.empresa?.domicilio||"" } };
      const encoded = encodeFormDef(def);
      setSharePublicUrl(`${appUrl}/form#${encoded}`);
      // Register link in Supabase
      if (SB.isConfigured()) {
        SB.createLink({
          form_id: existing?.id || "form",
          form_name: nombre,
          link_id: linkId,
          client_name: shareClient.nombre || null,
          client_email: shareClient.email || null,
          max_uses: linkMaxUsos || 0,
          expires_at: linkExpiry ? new Date(linkExpiry).toISOString() : null,
        }).catch(()=>{});
      }
    }
    // Track envio
    addEnvio({
      id: uid(),
      formId: existing?.id || "nuevo",
      formNombre: nombre || "(sin nombre)",
      cliente: client,
      fecha: today(),
      hora: new Date().toLocaleTimeString("es-CO",{hour:"2-digit",minute:"2-digit",hour12:false}),
      linkId,
      maxUsos: linkMaxUsos||0,
      expiry: linkExpiry||"",
    });
  };
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const downloadForm = () => {
    if (!shareGenerated) return;
    const a = document.createElement("a");
    a.href = shareGenerated;
    a.download = shareFileName || "formulario.html";
    a.click();
  };
  const shareWhatsApp = () => {
    const cfg = getConfig();
    const clientName = shareClient.nombre || "cliente";
    const linkText = sharePublicUrl ? `\n\n🔗 ${sharePublicUrl}` : "";
    const msg = cfg.whatsapp.mensajePlantilla
      .replace(/\{\{nombre\}\}/g, clientName)
      .replace(/\{\{formulario\}\}/g, nombre || "Formulario")
      .replace(/\{\{empresa\}\}/g, cfg.empresa.nombre) + linkText;
    const tel = shareClient.tel ? shareClient.tel.replace(/[^0-9]/g,"") : "";
    window.open(`https://wa.me/${tel}?text=${encodeURIComponent(msg)}`, "_blank");
  };
  const shareEmail = async () => {
    if (!shareClient.email) { alert("Ingresa el email del cliente"); return; }
    const cfg = getConfig();
    setEmailSending(true);
    const ok = await sendEmailJS({
      client_name: shareClient.nombre || "Cliente",
      client_email: shareClient.email,
      form_name: nombre || "Formulario",
      from_name: cfg.empresa.nombre,
      form_link: sharePublicUrl || "En breve recibirás el formulario por WhatsApp.",
    });
    setEmailSending(false);
    if (ok) {
      setEmailSent(true);
      setTimeout(() => setEmailSent(false), 5000);
    } else {
      alert("Error al enviar. Revisa Configuración → Correo / EmailJS.");
    }
  };
  const openShare = () => { setShareClient({nombre:"",email:"",tel:""}); setShareGenerated(""); setShareFileName(""); setSharePublicUrl(""); setShowShare(true); };

  const sel = selIdx!==null ? campos[selIdx] : null;

  return (
    <div className="fade-up">
      {/* Top bar */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
        <div style={{display:"flex",alignItems:"center",gap:10,flex:1}}>
          <input value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Nombre del formulario"
            style={{...inp,fontSize:16,fontWeight:700,padding:"8px 12px",flex:1,maxWidth:400}}/>
          <select value={modulo} onChange={e=>setModulo(e.target.value)} style={{...inp,width:160}}>
            {MODULOS_ASOC.map(m=><option key={m.id} value={m.id}>{m.lbl}</option>)}
          </select>
        </div>
        <div style={{display:"flex",gap:6}}>
          <Btn v="sec" on={()=>setPreview(!preview)}><Eye size={11}/> {preview?"Editor":"Vista previa"}</Btn>
          <Btn v="sec" on={openShare}><Share2 size={11}/> Compartir</Btn>
          <Btn on={guardar}><Check size={11}/> {existing?"Actualizar":"Guardar"}</Btn>
        </div>
      </div>

      {/* Config bar */}
      <Card style={{padding:"8px 14px",marginBottom:14,display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"}}>
        <div style={{flex:1,minWidth:150}}>
          <label style={{fontSize:7,fontWeight:700,color:"#888",textTransform:"uppercase"}}>Título público</label>
          <input value={config.titulo} onChange={e=>setConfig({...config,titulo:e.target.value})} placeholder={nombre} style={{...inp,width:"100%",fontSize:10}}/>
        </div>
        <div style={{flex:1,minWidth:150}}>
          <label style={{fontSize:7,fontWeight:700,color:"#888",textTransform:"uppercase"}}>Subtítulo</label>
          <input value={config.subtitulo||""} onChange={e=>setConfig({...config,subtitulo:e.target.value})} placeholder="Descripción breve" style={{...inp,width:"100%",fontSize:10}}/>
        </div>
        <div style={{flex:1,minWidth:150}}>
          <label style={{fontSize:7,fontWeight:700,color:"#888",textTransform:"uppercase"}}>Mensaje de éxito</label>
          <input value={config.mensajeExito||""} onChange={e=>setConfig({...config,mensajeExito:e.target.value})} placeholder="¡Gracias!" style={{...inp,width:"100%",fontSize:10}}/>
        </div>
        <div style={{width:130}}>
          <label style={{fontSize:7,fontWeight:700,color:"#888",textTransform:"uppercase"}}>Tel WhatsApp</label>
          <input value={config.telRespuesta||""} onChange={e=>setConfig({...config,telRespuesta:e.target.value})} placeholder="573001234567" style={{...inp,width:"100%",fontSize:10}}/>
        </div>
      </Card>

      {/* Presentation config */}
      <Card style={{padding:"8px 14px",marginBottom:14,display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"}}>
        <div style={{minWidth:120}}>
          <label style={{fontSize:7,fontWeight:700,color:"#888",textTransform:"uppercase"}}>Vista del formulario</label>
          <div style={{display:"flex",gap:4,marginTop:3}}>
            {[{v:"pasos",l:"📖 Paso a paso"},{v:"scroll",l:"📜 Completo"}].map(o=>(
              <button key={o.v} type="button" onClick={()=>setConfig({...config,vista:o.v})}
                style={{...F,padding:"4px 10px",fontSize:9,fontWeight:(config.vista||"pasos")===o.v?700:400,borderRadius:4,
                  border:(config.vista||"pasos")===o.v?`2px solid ${T.ink}`:`1px solid ${T.border}`,
                  background:(config.vista||"pasos")===o.v?T.ink:"#fff",color:(config.vista||"pasos")===o.v?"#fff":T.inkMid,
                  cursor:"pointer"}}>{o.l}</button>
            ))}
          </div>
        </div>
        <div style={{minWidth:100}}>
          <label style={{fontSize:7,fontWeight:700,color:"#888",textTransform:"uppercase"}}>Color del botón</label>
          <div style={{display:"flex",gap:4,marginTop:3,alignItems:"center"}}>
            {["#111111","#1E4F8C","#C9A84C","#1E6B42","#8B2252"].map(c=>(
              <button key={c} type="button" onClick={()=>setConfig({...config,colorAccent:c})}
                style={{width:20,height:20,borderRadius:"50%",background:c,border:(config.colorAccent||"#111111")===c?"3px solid #C9A84C":"2px solid #ddd",cursor:"pointer",padding:0}}/>
            ))}
            <input type="color" value={config.colorAccent||"#111111"} onChange={e=>setConfig({...config,colorAccent:e.target.value})}
              style={{width:20,height:20,border:"none",padding:0,cursor:"pointer",borderRadius:4}}/>
          </div>
        </div>
        <div style={{flex:1,minWidth:120}}>
          <label style={{fontSize:7,fontWeight:700,color:"#888",textTransform:"uppercase"}}>Texto del botón enviar</label>
          <input value={config.botonTexto||""} onChange={e=>setConfig({...config,botonTexto:e.target.value})} placeholder="Enviar formulario" style={{...inp,width:"100%",fontSize:10}}/>
        </div>
      </Card>

      {preview ? (
        /* ── PREVIEW ── */
        <Card style={{maxWidth:640,margin:"0 auto",padding:"32px 28px"}}>
          <div style={{textAlign:"center",marginBottom:24}}>
            <h2 style={{fontSize:20,fontWeight:700,margin:"0 0 4px"}}>{config.titulo||nombre||"Formulario"}</h2>
            {config.subtitulo && <p style={{fontSize:12,color:T.inkMid}}>{config.subtitulo}</p>}
          </div>
          {campos.map(c => {
            const b = BLOQUES.find(bl=>bl.tipo===c.tipo);
            if (c.tipo==="seccion") return <div key={c.id} style={{marginTop:20,marginBottom:8,paddingTop:14,borderTop:`2px solid ${T.ink}`}}><h3 style={{fontSize:14,fontWeight:700}}>{c.label}</h3>{c.desc&&<p style={{fontSize:10,color:T.inkMid,marginTop:2}}>{c.desc}</p>}</div>;
            if (c.tipo==="info") return <div key={c.id} style={{marginBottom:12,padding:"10px 14px",background:T.blueBg,borderRadius:6,fontSize:11,color:T.blue}}>{c.label}</div>;
            return (
              <div key={c.id} style={{marginBottom:14}}>
                <label style={{display:"block",fontSize:11,fontWeight:600,marginBottom:4}}>{c.label}{c.required&&<span style={{color:T.red}}> *</span>}</label>
                {(c.tipo==="text"||c.tipo==="email"||c.tipo==="tel"||c.tipo==="number"||c.tipo==="date") &&
                  <input type={c.tipo} placeholder={c.placeholder} disabled style={{...inp,width:"100%",background:"#FAFAF8"}}/>
                }
                {c.tipo==="textarea" && <textarea rows={2} placeholder={c.placeholder} disabled style={{...inp,width:"100%",resize:"vertical",background:"#FAFAF8"}}/>}
                {c.tipo==="select" && <select disabled style={{...inp,width:"100%",background:"#FAFAF8"}}><option>Seleccionar...</option>{(c.opciones||[]).map(o=><option key={o}>{o}</option>)}</select>}
                {c.tipo==="radio" && <div style={{display:"flex",flexDirection:"column",gap:4,marginTop:4}}>{(c.opciones||[]).map(o=><label key={o} style={{fontSize:11,display:"flex",alignItems:"center",gap:6,padding:"4px 8px",borderRadius:4,background:"#FAFAF8"}}><input type="radio" name={c.id} disabled/>{o}</label>)}</div>}
                {c.tipo==="chips" && <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:4}}>{(c.opciones||[]).map(o=><span key={o} style={{fontSize:10,padding:"4px 12px",borderRadius:14,border:`1px solid ${T.border}`,background:"#fff"}}>{o}</span>)}</div>}
                {c.tipo==="rango" && <select disabled style={{...inp,width:"100%",background:"#FAFAF8"}}><option>Seleccionar...</option>{(c.opciones||[]).map(o=><option key={o}>{o}</option>)}</select>}
                {c.tipo==="rating" && <div style={{display:"flex",gap:4,marginTop:4}}>{[1,2,3,4,5].map(n=><span key={n} style={{fontSize:20,opacity:.3}}>⭐</span>)}</div>}
                {c.tipo==="yesno" && <div style={{display:"flex",gap:8,marginTop:4}}>{["Sí","No"].map(o=><span key={o} style={{fontSize:10,padding:"6px 16px",borderRadius:14,border:`1px solid ${T.border}`,background:"#fff",fontWeight:600}}>{o}</span>)}</div>}
              </div>
            );
          })}
        </Card>
      ) : (
        /* ── EDITOR ── */
        <div style={{display:"flex",gap:14}}>
          {/* Left: blocks palette */}
          <Card style={{width:180,flexShrink:0,padding:8,alignSelf:"flex-start",position:"sticky",top:20}}>
            <div style={{fontSize:8,fontWeight:700,color:"#888",textTransform:"uppercase",padding:"4px 8px",marginBottom:4}}>Bloques</div>
            {BLOQUES.map(b => (
              <button key={b.tipo} onClick={()=>addCampo(b.tipo)}
                style={{display:"flex",alignItems:"center",gap:6,width:"100%",padding:"6px 8px",border:"none",background:"transparent",borderRadius:4,cursor:"pointer",fontSize:10,color:T.ink,fontFamily:"'Outfit',sans-serif",textAlign:"left"}}
                onMouseEnter={e=>e.currentTarget.style.background=T.accent}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <span>{b.icon}</span> {b.lbl}
              </button>
            ))}
          </Card>

          {/* Center: fields list */}
          <div style={{flex:1}}>
            {campos.length === 0 && (
              <Card style={{textAlign:"center",padding:40,color:T.inkLight}}>
                <div style={{fontSize:32,marginBottom:8}}>📋</div>
                <div style={{fontSize:14,fontWeight:600}}>Añade bloques desde el panel izquierdo</div>
                <div style={{fontSize:10,marginTop:4}}>Arrastra y configura los campos de tu formulario</div>
              </Card>
            )}
            {campos.map((c,i) => {
              const b = BLOQUES.find(bl=>bl.tipo===c.tipo);
              const isSel = selIdx===i;
              return (
                <div key={c.id} onClick={()=>setSelIdx(i)}
                  style={{background:"#fff",border:`1px solid ${isSel?T.blue:T.border}`,borderRadius:6,padding:"10px 12px",marginBottom:6,cursor:"pointer",
                    boxShadow:isSel?"0 0 0 2px #1E4F8C22":"none",transition:"all .15s",display:"flex",alignItems:"center",gap:8}}>
                  <div style={{display:"flex",flexDirection:"column",gap:2}}>
                    <button onClick={e=>{e.stopPropagation();move(i,-1)}} style={{background:"none",border:"none",cursor:"pointer",padding:0,color:i===0?T.inkXLight:T.inkMid}}><ChevronUp size={10}/></button>
                    <button onClick={e=>{e.stopPropagation();move(i,1)}} style={{background:"none",border:"none",cursor:"pointer",padding:0,color:i===campos.length-1?T.inkXLight:T.inkMid}}><ChevronDown size={10}/></button>
                  </div>
                  <span style={{fontSize:14}}>{b?.icon||"📝"}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:11,fontWeight:600}}>{c.label}{c.required&&<span style={{color:T.red,fontSize:9,marginLeft:4}}>obligatorio</span>}{c.scoring?.enabled&&<span style={{fontSize:9,marginLeft:4}}>🚩</span>}</div>
                    <div style={{fontSize:8,color:T.inkLight}}>{b?.lbl} {c.logica?`· Condicional: si "${campos.find(x=>x.id===c.logica?.fieldId)?.label||"?"}" = "${c.logica?.value||"?"}"`  :""}</div>
                  </div>
                  <button onClick={e=>{e.stopPropagation();updCampo(i,"required",!c.required)}} title={c.required?"Obligatorio":"Opcional"}
                    style={{background:"none",border:"none",cursor:"pointer",color:c.required?T.red:T.inkXLight}}>
                    {c.required?<ToggleRight size={16}/>:<ToggleLeft size={16}/>}
                  </button>
                  <button onClick={e=>{e.stopPropagation();delCampo(i)}} style={{background:"none",border:"none",cursor:"pointer",color:"#C44"}}><Trash2 size={12}/></button>
                </div>
              );
            })}
          </div>

          {/* Right: field config */}
          {sel && (
            <Card style={{width:260,flexShrink:0,padding:12,alignSelf:"flex-start",position:"sticky",top:20}}>
              <div style={{fontSize:10,fontWeight:700,marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
                <Settings size={12}/> Configurar campo
              </div>
              <div style={{marginBottom:8}}>
                <label style={{fontSize:7,fontWeight:700,color:"#888",textTransform:"uppercase"}}>Etiqueta / Pregunta</label>
                <input value={sel.label} onChange={e=>updCampo(selIdx,"label",e.target.value)} style={{...inp,width:"100%"}}/>
              </div>
              {sel.tipo!=="seccion"&&sel.tipo!=="info"&&(
                <div style={{marginBottom:8}}>
                  <label style={{fontSize:7,fontWeight:700,color:"#888",textTransform:"uppercase"}}>Placeholder</label>
                  <input value={sel.placeholder||""} onChange={e=>updCampo(selIdx,"placeholder",e.target.value)} style={{...inp,width:"100%"}}/>
                </div>
              )}
              {(sel.tipo==="seccion"||sel.tipo==="info")&&(
                <div style={{marginBottom:8}}>
                  <label style={{fontSize:7,fontWeight:700,color:"#888",textTransform:"uppercase"}}>Descripción</label>
                  <textarea value={sel.desc||""} onChange={e=>updCampo(selIdx,"desc",e.target.value)} rows={2} style={{...inp,width:"100%",resize:"vertical"}}/>
                </div>
              )}
              {["select","radio","chips","rango"].includes(sel.tipo) && (
                <div style={{marginBottom:8}}>
                  <label style={{fontSize:7,fontWeight:700,color:"#888",textTransform:"uppercase"}}>Opciones (una por línea)</label>
                  <textarea value={(sel.opciones||[]).join("\n")} onChange={e=>updCampo(selIdx,"opciones",e.target.value.split("\n").filter(Boolean))} rows={4} style={{...inp,width:"100%",resize:"vertical",fontFamily:"'DM Mono',monospace",fontSize:10}}/>
                </div>
              )}
              {/* Required toggle */}
              {sel.tipo!=="seccion"&&sel.tipo!=="info"&&(
                <div style={{marginBottom:8}}>
                  <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:10,fontWeight:600}}>
                    <input type="checkbox" checked={sel.required} onChange={e=>updCampo(selIdx,"required",e.target.checked)}
                      style={{accentColor:T.red}}/>
                    Obligatorio
                  </label>
                </div>
              )}
              {/* Logic condition */}
              {sel.tipo!=="seccion"&&sel.tipo!=="info"&&campos.filter(c=>c.id!==sel.id&&c.tipo!=="seccion"&&c.tipo!=="info").length>0&&(
                <div style={{marginBottom:8,borderTop:`1px solid ${T.border}`,paddingTop:8}}>
                  <label style={{fontSize:7,fontWeight:700,color:"#888",textTransform:"uppercase"}}>Lógica condicional</label>
                  <div style={{display:"flex",alignItems:"center",gap:4,marginTop:4}}>
                    <span style={{fontSize:9}}>Mostrar si</span>
                    <select value={sel.logica?.fieldId||""} onChange={e=>{
                      const fId = e.target.value;
                      updCampo(selIdx,"logica",fId?{fieldId:fId,value:sel.logica?.value||""}:null);
                    }} style={{...inp,fontSize:9,flex:1}}>
                      <option value="">Sin condición</option>
                      {campos.filter(c=>c.id!==sel.id&&c.tipo!=="seccion"&&c.tipo!=="info").map(c=>
                        <option key={c.id} value={c.id}>{c.label}</option>
                      )}
                    </select>
                  </div>
                  {sel.logica?.fieldId && (
                    <div style={{display:"flex",alignItems:"center",gap:4,marginTop:4}}>
                      <span style={{fontSize:9}}>= </span>
                      <input value={sel.logica?.value||""} onChange={e=>updCampo(selIdx,"logica",{...sel.logica,value:e.target.value})} placeholder="valor" style={{...inp,fontSize:9,flex:1}}/>
                    </div>
                  )}
                </div>
              )}
              {/* mapKey for integration */}
              <div style={{borderTop:`1px solid ${T.border}`,paddingTop:8}}>
                <label style={{fontSize:7,fontWeight:700,color:"#888",textTransform:"uppercase"}}>Clave de mapeo (integración)</label>
                <input value={sel.mapKey||""} onChange={e=>updCampo(selIdx,"mapKey",e.target.value)} placeholder="ej: nombre, email" style={{...inp,width:"100%",fontSize:9}}/>
              </div>
              {/* Scoring rules — for fields with options */}
              {["select","radio","chips","yesno","rango"].includes(sel.tipo) && (
                <div style={{borderTop:`1px solid ${T.border}`,paddingTop:8,marginTop:8}}>
                  <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:10,fontWeight:700,marginBottom:6}}>
                    <input type="checkbox" checked={!!sel.scoring?.enabled} onChange={e=>{
                      const sc = sel.scoring ? {...sel.scoring, enabled:e.target.checked} : {enabled:e.target.checked, weight:1, rules:{}};
                      updCampo(selIdx,"scoring",sc);
                    }} style={{accentColor:"#C9A84C"}}/>
                    🚩 Regla de scoring
                  </label>
                  {sel.scoring?.enabled && (
                    <div>
                      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                        <label style={{fontSize:7,fontWeight:700,color:"#888",textTransform:"uppercase"}}>Peso</label>
                        <select value={sel.scoring?.weight||1} onChange={e=>updCampo(selIdx,"scoring",{...sel.scoring,weight:parseInt(e.target.value)})}
                          style={{...inp,width:60,fontSize:9}}>
                          {[1,2,3,4,5].map(n=><option key={n} value={n}>{n} pts</option>)}
                        </select>
                      </div>
                      <div style={{fontSize:7,fontWeight:700,color:"#888",textTransform:"uppercase",marginBottom:4}}>Clasificar opciones</div>
                      {(sel.opciones||["Sí","No"]).map(opt => {
                        const flag = sel.scoring?.rules?.[opt] || "neutral";
                        return (
                          <div key={opt} style={{display:"flex",alignItems:"center",gap:4,marginBottom:3}}>
                            <div style={{flex:1,fontSize:9,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{opt}</div>
                            {[{v:"green",l:"🟢"},{v:"neutral",l:"🟡"},{v:"red",l:"🔴"}].map(f=>(
                              <button key={f.v} type="button" onClick={()=>{
                                const rules = {...(sel.scoring?.rules||{}), [opt]:f.v};
                                updCampo(selIdx,"scoring",{...sel.scoring,rules});
                              }} style={{width:22,height:22,border:flag===f.v?"2px solid #111":"1px solid #ddd",borderRadius:4,
                                background:flag===f.v?"#F5F4F1":"#fff",cursor:"pointer",fontSize:12,padding:0,
                                display:"flex",alignItems:"center",justifyContent:"center"}}>{f.l}</button>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {/* Share modal — generates downloadable HTML form */}
      {showShare && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:9999,display:"flex",alignItems:"flex-start",justifyContent:"center",paddingTop:40,overflowY:"auto"}} onClick={()=>setShowShare(false)}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:8,padding:28,width:460,maxHeight:"85vh",overflowY:"auto",boxShadow:"0 12px 40px rgba(0,0,0,0.2)",marginBottom:40}}>
            <h3 style={{margin:0,fontSize:16,fontWeight:700,marginBottom:4}}>📤 Enviar formulario a cliente</h3>
            <p style={{margin:"0 0 16px",fontSize:10,color:T.inkMid}}>{nombre || "Sin nombre"} · Se genera un archivo HTML que el cliente abre en su navegador</p>

            {/* Client info */}
            <div style={{background:T.accent,borderRadius:6,padding:"12px 14px",marginBottom:14}}>
              <div style={{fontSize:8,fontWeight:700,color:"#888",textTransform:"uppercase",marginBottom:8}}>👤 Datos del cliente</div>
              <div style={{display:"flex",gap:8,marginBottom:6}}>
                <div style={{flex:1}}>
                  <label style={{fontSize:7,fontWeight:700,color:"#888",textTransform:"uppercase"}}>Nombre *</label>
                  <input value={shareClient.nombre} onChange={e=>{ setShareClient({...shareClient,nombre:e.target.value}); setShareGenerated(""); }}
                    placeholder="Juan Pérez" style={{...inp,width:"100%",fontSize:11}}/>
                </div>
                <div style={{flex:1}}>
                  <label style={{fontSize:7,fontWeight:700,color:"#888",textTransform:"uppercase"}}>Email</label>
                  <input value={shareClient.email} onChange={e=>{ setShareClient({...shareClient,email:e.target.value}); setShareGenerated(""); }}
                    placeholder="juan@empresa.com" type="email" style={{...inp,width:"100%",fontSize:11}}/>
                </div>
              </div>
              <div>
                <label style={{fontSize:7,fontWeight:700,color:"#888",textTransform:"uppercase"}}>WhatsApp (con código país)</label>
                <input value={shareClient.tel} onChange={e=>{ setShareClient({...shareClient,tel:e.target.value}); setShareGenerated(""); }}
                  placeholder="573001234567" style={{...inp,width:"100%",fontSize:11}}/>
              </div>
            </div>

            {/* Link config: limits & expiry */}
            <div style={{background:"#F5F0FF",borderRadius:6,padding:"12px 14px",marginBottom:14,border:"1px solid #5B3A8C22"}}>
              <div style={{fontSize:8,fontWeight:700,color:"#5B3A8C",textTransform:"uppercase",marginBottom:8}}>🔒 Control del enlace</div>
              <div style={{display:"flex",gap:8}}>
                <div style={{flex:1}}>
                  <label style={{fontSize:7,fontWeight:700,color:"#888",textTransform:"uppercase"}}>Máximo de envíos</label>
                  <select value={linkMaxUsos} onChange={e=>{setLinkMaxUsos(parseInt(e.target.value));setShareGenerated("");}}
                    style={{...inp,width:"100%",fontSize:11}}>
                    <option value={0}>♾️ Ilimitado</option>
                    <option value={1}>1 vez</option>
                    <option value={2}>2 veces</option>
                    <option value={3}>3 veces</option>
                    <option value={5}>5 veces</option>
                    <option value={10}>10 veces</option>
                  </select>
                </div>
                <div style={{flex:1}}>
                  <label style={{fontSize:7,fontWeight:700,color:"#888",textTransform:"uppercase"}}>Fecha de caducidad</label>
                  <input type="date" value={linkExpiry} onChange={e=>{setLinkExpiry(e.target.value);setShareGenerated("");}}
                    min={new Date().toISOString().split("T")[0]}
                    style={{...inp,width:"100%",fontSize:11}}/>
                </div>
              </div>
              <div style={{fontSize:8,color:"#5B3A8C",marginTop:6,lineHeight:1.4}}>
                {linkMaxUsos>0 ? `⚡ El cliente podrá enviar máximo ${linkMaxUsos} ${linkMaxUsos===1?"vez":"veces"}` : "♾️ Sin límite de envíos"}
                {linkExpiry ? ` · ⏰ Caduca el ${new Date(linkExpiry+"T23:59:59").toLocaleDateString("es-CO",{day:"numeric",month:"short",year:"numeric"})}` : " · Sin caducidad"}
              </div>
            </div>

            {/* Generate button */}
            {!shareGenerated ? (
              <Btn on={generateLink} style={{width:"100%",justifyContent:"center",marginBottom:14,padding:"10px 0"}}
                disabled={!shareClient.nombre}>
                📄 Generar formulario personalizado
              </Btn>
            ) : (
              <div style={{marginBottom:10,padding:"8px 10px",background:T.greenBg,borderRadius:4,border:`1px solid ${T.green}33`,fontSize:9,color:T.green,fontWeight:600}}>
                ✅ Formulario listo para {shareClient.nombre||shareClient.email} — <strong>{shareFileName}</strong>
                {sharePublicUrl && <div style={{marginTop:4,fontSize:8,color:T.inkMid,fontWeight:400}}>🔗 Link público generado — se enviará por email y WhatsApp automáticamente</div>}
              </div>
            )}

            {/* Share actions */}
            <div style={{display:"flex",flexDirection:"column",gap:8,opacity:shareGenerated?1:.4,pointerEvents:shareGenerated?"auto":"none"}}>
              <button onClick={downloadForm} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",border:`1px solid ${T.border}`,borderRadius:6,background:"#fff",cursor:"pointer",fontFamily:"'Outfit',sans-serif",textAlign:"left"}}>
                <div style={{width:32,height:32,borderRadius:6,background:T.greenBg,display:"flex",alignItems:"center",justifyContent:"center"}}><FileText size={14} color={T.green}/></div>
                <div><div style={{fontSize:11,fontWeight:700}}>⬇ Descargar formulario (.html)</div><div style={{fontSize:8,color:T.inkMid}}>Archivo que puedes adjuntar por WhatsApp o email</div></div>
              </button>
              <button onClick={shareWhatsApp} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",border:`1px solid ${T.border}`,borderRadius:6,background:"#fff",cursor:"pointer",fontFamily:"'Outfit',sans-serif",textAlign:"left"}}>
                <div style={{width:32,height:32,borderRadius:6,background:"#E8F8E8",display:"flex",alignItems:"center",justifyContent:"center"}}><MessageCircle size={14} color="#25D366"/></div>
                <div><div style={{fontSize:11,fontWeight:700}}>Abrir WhatsApp</div><div style={{fontSize:8,color:T.inkMid}}>{shareClient.tel?`Mensaje al ${shareClient.tel}`:"Adjunta el archivo descargado"}</div></div>
              </button>
              <button onClick={shareEmail} disabled={emailSending} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",border:`1px solid ${emailSent?T.green:T.border}`,borderRadius:6,background:emailSent?T.greenBg:"#fff",cursor:emailSending?"wait":"pointer",fontFamily:"'Outfit',sans-serif",textAlign:"left",opacity:emailSending?.6:1}}>
                <div style={{width:32,height:32,borderRadius:6,background:emailSent?T.greenBg:T.amberBg,display:"flex",alignItems:"center",justifyContent:"center"}}><Mail size={14} color={emailSent?T.green:T.amber}/></div>
                <div><div style={{fontSize:11,fontWeight:700}}>{emailSending?"Enviando...":emailSent?"✅ Email enviado con link":`📧 Enviar email con link (${getConfig().correo.emailPrincipal})`}</div><div style={{fontSize:8,color:T.inkMid}}>{emailSent?`Enviado a ${shareClient.email} con link directo`:shareClient.email?`El cliente recibe email con link al formulario`:"Ingresa email del cliente"}</div></div>
              </button>
            </div>

            <div style={{marginTop:12,padding:"8px 10px",background:T.accent,borderRadius:4,fontSize:8,color:T.inkMid,lineHeight:1.5}}>
              💡 <strong>Flujo recomendado:</strong><br/>
              1️⃣ <strong>Email</strong> → el cliente recibe un link directo al formulario<br/>
              2️⃣ <strong>WhatsApp</strong> → también incluye el link al formulario<br/>
              3️⃣ <strong>Descargar</strong> → archivo .html de respaldo (funciona sin internet)
            </div>

            <Btn v="sec" on={()=>setShowShare(false)} style={{width:"100%",marginTop:10,justifyContent:"center"}}>Cerrar</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LISTA DE FORMULARIOS
   ═══════════════════════════════════════════════════════════════ */
function ListaForms({ forms, setForms, onEdit, onNew }) {
  const [search, setSearch] = useState("");
  const filtered = forms.filter(f => {
    const q = search.toLowerCase();
    return !q || f.nombre?.toLowerCase().includes(q) || f.modulo?.toLowerCase().includes(q);
  });
  const del = (id) => { if (confirm("¿Eliminar formulario?")) setForms(forms.filter(f=>f.id!==id)); };
  const dup = (f) => setForms([...forms, {...f, id:uid(), nombre:f.nombre+" (copia)", createdAt:today(), updatedAt:today()}]);

  return (
    <div className="fade-up">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <h2 style={{margin:0,fontSize:18,fontWeight:700}}>Mis formularios — {forms.length}</h2>
        <div style={{display:"flex",gap:6}}>
          <div style={{position:"relative"}}>
            <Search size={12} style={{position:"absolute",left:8,top:8,color:T.inkLight}}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar..." style={{...inp,paddingLeft:26,width:180}}/>
          </div>
          <Btn on={onNew}><Plus size={11}/> Nuevo formulario</Btn>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280,1fr))",gap:12}}>
        {filtered.map(f => {
          const camposCount = (f.campos||[]).filter(c=>c.tipo!=="seccion"&&c.tipo!=="info").length;
          const reqs = (f.campos||[]).filter(c=>c.required).length;
          const mod = MODULOS_ASOC.find(m=>m.id===f.modulo);
          return (
            <Card key={f.id} style={{padding:0,overflow:"hidden",cursor:"pointer"}} onClick={()=>onEdit(f.id)}>
              <div style={{padding:"14px 16px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:700}}>{f.nombre}</div>
                    <div style={{fontSize:9,color:T.inkMid,marginTop:2}}>{camposCount} campos · {reqs} obligatorios</div>
                  </div>
                  <Badge color={T.blue}>{mod?.lbl||"General"}</Badge>
                </div>
                <div style={{fontSize:8,color:T.inkLight,marginTop:6}}>Creado: {f.createdAt} · Editado: {f.updatedAt}</div>
              </div>
              <div style={{borderTop:`1px solid ${T.border}`,display:"flex",padding:"0"}}>
                <button onClick={e=>{e.stopPropagation();onEdit(f.id)}} style={{flex:1,padding:"6px 0",border:"none",background:"transparent",cursor:"pointer",fontSize:9,fontWeight:600,color:T.blue,fontFamily:"'Outfit',sans-serif"}}>✏️ Editar</button>
                <button onClick={e=>{e.stopPropagation();dup(f)}} style={{flex:1,padding:"6px 0",border:"none",borderLeft:`1px solid ${T.border}`,background:"transparent",cursor:"pointer",fontSize:9,fontWeight:600,color:T.inkMid,fontFamily:"'Outfit',sans-serif"}}>📋 Duplicar</button>
                <button onClick={e=>{e.stopPropagation();del(f.id)}} style={{flex:1,padding:"6px 0",border:"none",borderLeft:`1px solid ${T.border}`,background:"transparent",cursor:"pointer",fontSize:9,fontWeight:600,color:T.red,fontFamily:"'Outfit',sans-serif"}}>🗑 Eliminar</button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   RESPUESTAS
   ═══════════════════════════════════════════════════════════════ */
function TabRespuestas({ forms, respuestas, onReload, loading }) {
  const [selFormId, setSelFormId] = useState("");
  const [selResp, setSelResp] = useState(null);
  const [procesados, setProcesados] = useState(() => {
    try { return JSON.parse(localStorage.getItem("hab:form:procesados")||"[]"); } catch { return []; }
  });
  const [filtroEstado, setFiltroEstado] = useState("todos"); // todos | pendiente | procesado

  const markProcesado = (id, sbId) => {
    const next = [...procesados, id];
    setProcesados(next);
    localStorage.setItem("hab:form:procesados", JSON.stringify(next));
    if (sbId && SB.isConfigured()) SB.markProcessed(sbId).catch(()=>{});
  };

  const markPendiente = (id, sbId) => {
    const next = procesados.filter(x=>x!==id);
    setProcesados(next);
    localStorage.setItem("hab:form:procesados", JSON.stringify(next));
    if (sbId && SB.isConfigured()) SB.markUnprocessed(sbId).catch(()=>{});
  };

  const isProcesado = (r) => r.processed || procesados.includes(r.id);

  /* Procesar: crear cliente + borrador oferta en CRM */
  const procesarRespuesta = (r) => {
    // 1. Create client in CRM
    const crmData = JSON.parse(localStorage.getItem("habitaris_crm")||"{}");
    const clientes = (() => {
      try {
        const raw = localStorage.getItem("hab:crm:clientes2:local");
        return raw ? JSON.parse(raw) : [];
      } catch { return []; }
    })();

    // Check if client already exists by email
    const existingClient = clientes.find(c => c.email && c.email === r.clienteEmail);
    let clienteId;

    if (!existingClient) {
      const newClient = {
        id: Math.random().toString(36).slice(2,9),
        nombre: r.razonSocial || r.clienteNombre || "",
        tipo: r.razonSocial ? "Empresa" : "Persona natural",
        nit: r.documento || "",
        email: r.clienteEmail || "",
        telMovil: r.clienteTel || r.telefono || "",
        prefijoMovil: "+57",
        ciudad: r.ciudad || "",
        pais: "CO",
        notas: [
          r.edificio ? `Proyecto: ${r.edificio}` : "",
          r.tipoProyecto ? `Tipo: ${r.tipoProyecto}` : "",
          r.area ? `Área: ${r.area} m²` : "",
          r.presupuesto ? `Presupuesto: $${Number(r.presupuesto).toLocaleString("es-CO")}` : "",
        ].filter(Boolean).join(" | "),
        emailFactura: r.emailFactura || r.clienteEmail || "",
        dirFacturacion: r.dirFacturacion || "",
        briefingId: r.id,
        fechaAlta: new Date().toISOString().split("T")[0],
      };
      clientes.push(newClient);
      clienteId = newClient.id;
      // Save via localStorage for sync
      localStorage.setItem("hab:crm:clientes2:local", JSON.stringify(clientes));
      try { window.storage?.set?.("hab:crm:clientes2", JSON.stringify(clientes)); } catch {}
    } else {
      clienteId = existingClient.id;
    }

    // 2. Create draft offer in CRM
    const deals = crmData.deals || [];
    const newDeal = {
      id: Math.random().toString(36).slice(2,9) + Date.now().toString(36),
      cliente: r.clienteNombre || r.razonSocial || "",
      email: r.clienteEmail || "",
      telefono: r.clienteTel || r.telefono || "",
      ubicacion: [r.ciudad, r.edificio].filter(Boolean).join(" · "),
      proyecto: [r.edificio, r.clienteNombre?.split(" ").slice(-1)[0]].filter(Boolean).join(" · ") || "Nuevo proyecto",
      estado: "Prospecto",
      notas: [
        r.servicios?.length ? `Servicios: ${Array.isArray(r.servicios)?r.servicios.join(", "):r.servicios}` : "",
        r.estilo?.length ? `Estilo: ${Array.isArray(r.estilo)?r.estilo.join(", "):r.estilo}` : "",
        r.espacios?.length ? `Espacios: ${Array.isArray(r.espacios)?r.espacios.join(", "):r.espacios}` : "",
        r.colores ? `Materiales: ${r.colores}` : "",
        r.expectativas?.length ? `Expectativas: ${Array.isArray(r.expectativas)?r.expectativas.join("; "):r.expectativas}` : "",
        r.linksReferentes ? `Referencias: ${r.linksReferentes}` : "",
      ].filter(Boolean).join("\n"),
      razonSocial: r.razonSocial || "",
      documento: r.documento || "",
      emailFactura: r.emailFactura || r.clienteEmail || "",
      dirFacturacion: r.dirFacturacion || "",
      retencion: r.retenciones === "Sí",
      detalleRet: r.detalleRetenciones || "",
      anticipoAcept: r.anticipo || "",
      formaPago: r.formaPago || "",
      presupuesto: r.presupuesto ? Number(String(r.presupuesto).replace(/[^0-9]/g,"")) : 0,
      fecha: new Date().toISOString().split("T")[0],
      briefingId: r.id,
      clienteId,
    };

    deals.push(newDeal);
    crmData.deals = deals;
    localStorage.setItem("habitaris_crm", JSON.stringify(crmData));

    // 3. Mark as processed
    markProcesado(r.id, r._sbId);

    alert(`✅ Procesado:\n\n👤 Cliente: ${existingClient ? "ya existía" : "creado"} — ${r.clienteNombre||r.clienteEmail}\n📋 Oferta borrador creada en CRM\n\nVe a CRM → Ofertas para continuar.`);
  };

  let filtered = selFormId ? respuestas.filter(r=>r.formularioId===selFormId) : respuestas;
  if (filtroEstado === "pendiente") filtered = filtered.filter(r => !isProcesado(r));
  if (filtroEstado === "procesado") filtered = filtered.filter(r => isProcesado(r));

  const sinProcesar = respuestas.filter(r => !isProcesado(r));

  /* ── Generate branded PDF report ── */
  const generarInforme = (resp) => {
    const cfgG = getConfig();
    const form = forms.find(f=>f.id===resp.formularioId);
    const campos = form?.campos || [];
    const meta = ["id","fecha","formularioId","formularioNombre","clienteNombre","clienteEmail","clienteTel"];

    // Group fields by sections
    const sections = [];
    let currentSection = { title:"Información general", fields:[] };
    campos.forEach(c => {
      if (c.tipo === "seccion") {
        if (currentSection.fields.length > 0) sections.push(currentSection);
        currentSection = { title:c.label, desc:c.desc||"", fields:[] };
      } else if (c.tipo !== "info") {
        const key = c.mapKey || c.id;
        let val = resp[key];
        if (val === undefined) {
          // Try to find by label match
          Object.entries(resp).filter(([k])=>!meta.includes(k)).forEach(([k,v]) => {
            if (k === c.label || k === c.mapKey) val = v;
          });
        }
        if (val !== undefined) {
          currentSection.fields.push({ label:c.label, value:Array.isArray(val)?val.join(", "):String(val), tipo:c.tipo });
        }
      }
    });
    if (currentSection.fields.length > 0) sections.push(currentSection);

    // If no sections matched from form campos, use raw keys
    if (sections.length === 0 || sections.every(s=>s.fields.length===0)) {
      sections.length = 0;
      sections.push({ title:"Respuestas", desc:"", fields:
        Object.entries(resp).filter(([k])=>!meta.includes(k)).map(([k,v]) => ({
          label:k, value:Array.isArray(v)?v.join(", "):String(v), tipo:"text"
        }))
      });
    }

    const fechaHoy = new Date().toLocaleDateString("es-CO",{year:"numeric",month:"long",day:"numeric"});

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Outfit',sans-serif;color:#111;background:#fff}
@page{size:A4;margin:0}
.page{width:210mm;min-height:297mm;margin:0 auto;padding:0;position:relative}

/* Header */
.header{background:#111;color:#fff;padding:28px 36px;display:flex;justify-content:space-between;align-items:center}
.logo{font-size:18px;font-weight:800;letter-spacing:5px;text-transform:uppercase}
.logo-sub{font-size:7px;letter-spacing:3px;color:rgba(255,255,255,.4);text-transform:uppercase;margin-top:2px}
.header-right{text-align:right}
.header-right div{font-size:8px;color:rgba(255,255,255,.5);letter-spacing:1px}

/* Gold bar */
.gold-bar{height:3px;background:linear-gradient(90deg,#C9A84C,#E8D48B,#C9A84C)}

/* Title block */
.title-block{padding:28px 36px 20px;border-bottom:1px solid #E4E1DB}
.doc-type{font-size:8px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#909090;margin-bottom:4px}
.doc-title{font-size:22px;font-weight:700;line-height:1.2;margin-bottom:6px}
.doc-meta{display:flex;gap:24px;margin-top:10px}
.meta-item{font-size:9px;color:#555}
.meta-item strong{color:#111;font-weight:700}

/* Client card */
.client-card{margin:20px 36px;background:#F5F4F1;border:1px solid #E4E1DB;border-radius:6px;padding:16px 20px;display:flex;align-items:center;gap:14px}
.client-avatar{width:42px;height:42px;border-radius:50%;background:#111;color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;flex-shrink:0}
.client-info{flex:1}
.client-name{font-size:14px;font-weight:700}
.client-email{font-size:10px;color:#1E4F8C;margin-top:2px}
.client-tel{font-size:9px;color:#909090;margin-top:1px}

/* Sections */
.section{margin:20px 36px}
.section-title{font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#111;padding-bottom:6px;border-bottom:2px solid #111;margin-bottom:12px;display:flex;align-items:center;gap:6px}
.section-desc{font-size:9px;color:#909090;margin:-8px 0 12px;font-weight:400}

/* Fields */
.field{margin-bottom:10px;display:flex;border-bottom:1px solid #F0EEEA;padding-bottom:8px}
.field-label{width:180px;flex-shrink:0;font-size:9px;font-weight:700;color:#555;text-transform:uppercase;letter-spacing:.5px;padding-top:2px}
.field-value{flex:1;font-size:12px;font-weight:500;color:#111}
.field-rating{color:#C9A84C;font-size:14px;letter-spacing:2px}

/* Footer */
.footer{position:fixed;bottom:0;left:0;right:0;background:#111;color:#fff;padding:12px 36px;display:flex;justify-content:space-between;align-items:center;font-size:7px;letter-spacing:2px}
.footer-gold{height:2px;background:linear-gradient(90deg,#C9A84C,#E8D48B,#C9A84C)}

/* Print */
@media print{
  body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .page{width:100%;min-height:auto}
  .no-print{display:none!important}
}
</style></head><body>
<div class="page">
  <!-- Header -->
  <div class="header">
    <div>
      <div class="logo">${cfgG.empresa.nombre.toUpperCase()}</div>
      <div class="logo-sub">${cfgG.empresa.eslogan}</div>
    </div>
    <div class="header-right">
      <div>INFORME DE FORMULARIO</div>
      <div style="margin-top:4px;font-size:9px;color:rgba(255,255,255,.7)">${fechaHoy}</div>
    </div>
  </div>
  <div class="gold-bar"></div>

  <!-- Title -->
  <div class="title-block">
    <div class="doc-type">Formulario</div>
    <div class="doc-title">${resp.formularioNombre || form?.nombre || "Respuesta"}</div>
    <div class="doc-meta">
      <div class="meta-item"><strong>Fecha respuesta:</strong> ${resp.fecha}</div>
      <div class="meta-item"><strong>ID:</strong> ${resp.id?.slice(0,8)||"—"}</div>
      ${form ? `<div class="meta-item"><strong>Módulo:</strong> ${MODULOS_ASOC.find(m=>m.id===form.modulo)?.lbl||"General"}</div>` : ""}
      <div class="meta-item"><strong>Campos:</strong> ${sections.reduce((s,sec)=>s+sec.fields.length,0)}</div>
    </div>
  </div>

  <!-- Client card -->
  ${resp.clienteNombre || resp.clienteEmail ? `
  <div class="client-card">
    <div class="client-avatar">${(resp.clienteNombre||resp.clienteEmail||"?")[0].toUpperCase()}</div>
    <div class="client-info">
      ${resp.clienteNombre ? `<div class="client-name">${resp.clienteNombre}</div>` : ""}
      ${resp.clienteEmail ? `<div class="client-email">${resp.clienteEmail}</div>` : ""}
      ${resp.clienteTel ? `<div class="client-tel">📞 ${resp.clienteTel}</div>` : ""}
    </div>
  </div>` : ""}

  <!-- Scoring -->
  ${(function(){
    var sc = calculateScore(resp, form);
    if (!sc) return "";
    var colors = {green:{bg:"#E8F4EE",border:"#1E6B42",text:"#1E6B42"},yellow:{bg:"#FAF0E0",border:"#7A5218",text:"#7A5218"},red:{bg:"#FAE8E8",border:"#AE2C2C",text:"#AE2C2C"}};
    var col = colors[sc.level];
    var rows = sc.details.map(function(d){
      var fc = d.flag==="green"?"#1E6B42":d.flag==="red"?"#AE2C2C":"#7A5218";
      var icon = d.flag==="green"?"🟢":d.flag==="red"?"🔴":"🟡";
      return '<tr style="border-bottom:1px solid #F0EEEA"><td style="padding:6px 12px;font-weight:600">'+d.label+'</td><td style="padding:6px 12px">'+d.value+'</td><td style="padding:6px 12px;text-align:center;font-weight:700;color:'+fc+';font-family:DM Mono,monospace">'+d.points+'/'+d.maxPoints+'</td><td style="padding:6px 12px;text-align:center">'+icon+'</td></tr>';
    }).join("");
    return '<div style="margin:20px 36px;border:1px solid '+col.border+'44;border-radius:8px;overflow:hidden">'
      +'<div style="display:flex;align-items:center;gap:16px;padding:16px 20px;background:'+col.bg+'">'
      +'<div style="font-size:28px;font-weight:800;font-family:DM Mono,monospace;color:'+col.text+'">'+sc.score.toFixed(1)+'<span style="font-size:12px">/10</span></div>'
      +'<div style="flex:1"><div style="font-size:14px;font-weight:700;color:'+col.text+'">'+sc.levelLabel+'</div>'
      +'<div style="font-size:9px;color:'+col.text+';opacity:.8;margin-top:2px">'+sc.conclusion+'</div></div>'
      +'<div style="display:flex;gap:10px">'
      +'<div style="text-align:center"><div style="font-size:14px;font-weight:800;color:#1E6B42">'+sc.greens+'</div><div style="font-size:8px;color:#888">🟢</div></div>'
      +'<div style="text-align:center"><div style="font-size:14px;font-weight:800;color:#7A5218">'+sc.yellows+'</div><div style="font-size:8px;color:#888">🟡</div></div>'
      +'<div style="text-align:center"><div style="font-size:14px;font-weight:800;color:#AE2C2C">'+sc.reds+'</div><div style="font-size:8px;color:#888">🔴</div></div>'
      +'</div></div>'
      +'<table style="width:100%;border-collapse:collapse;font-size:10px"><thead><tr style="background:#F5F4F1">'
      +'<th style="padding:6px 12px;text-align:left;font-size:8px;font-weight:700;color:#888;text-transform:uppercase;border-bottom:1px solid #E4E1DB">Criterio</th>'
      +'<th style="padding:6px 12px;text-align:left;font-size:8px;font-weight:700;color:#888;text-transform:uppercase;border-bottom:1px solid #E4E1DB">Respuesta</th>'
      +'<th style="padding:6px 12px;text-align:center;font-size:8px;font-weight:700;color:#888;text-transform:uppercase;border-bottom:1px solid #E4E1DB">Puntos</th>'
      +'<th style="padding:6px 12px;text-align:center;font-size:8px;font-weight:700;color:#888;text-transform:uppercase;border-bottom:1px solid #E4E1DB"></th>'
      +'</tr></thead><tbody>'+rows+'</tbody></table></div>';
  })()}

  <!-- Sections -->
  ${sections.map((sec,si) => `
  <div class="section">
    <div class="section-title"><span style="color:#C9A84C">■</span> ${sec.title}</div>
    ${sec.desc ? `<div class="section-desc">${sec.desc}</div>` : ""}
    ${sec.fields.map(f => `
    <div class="field">
      <div class="field-label">${f.label}</div>
      <div class="field-value">${
        f.tipo === "rating" ? `<span class="field-rating">${"★".repeat(parseInt(f.value)||0)}${"☆".repeat(5-(parseInt(f.value)||0))}</span> <span style="font-size:10px;color:#909090">(${f.value}/5)</span>` :
        f.tipo === "yesno" ? `<span style="display:inline-block;padding:2px 12px;border-radius:10px;font-size:10px;font-weight:700;background:${f.value==="Sí"?"#E8F4EE":"#FAE8E8"};color:${f.value==="Sí"?"#1E6B42":"#AE2C2C"}">${f.value}</span>` :
        f.value
      }</div>
    </div>`).join("")}
  </div>`).join("")}

  <!-- Confidentiality -->
  <div style="margin:30px 36px;padding:12px 16px;background:#F5F4F1;border-radius:4px;border-left:3px solid #C9A84C">
    <div style="font-size:7px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#909090;margin-bottom:4px">CONFIDENCIALIDAD</div>
    <div style="font-size:8px;color:#555;line-height:1.6">Este documento contiene información confidencial de ${cfgG.empresa.nombre} y su cliente. Queda prohibida su reproducción o distribución sin autorización expresa.</div>
  </div>

  <!-- Footer -->
  <div class="footer-gold" style="position:fixed;bottom:28px;left:0;right:0"></div>
  <div class="footer">
    <span>${cfgG.empresa.nombre.toUpperCase()} · ${resp.formularioNombre||""} · ${resp.clienteNombre||""}</span>
    <span>${fechaHoy}</span>
  </div>
</div>

<!-- Print button -->
<div class="no-print" style="position:fixed;top:12px;right:12px;display:flex;gap:8px;z-index:100">
  <button onclick="window.print()" style="padding:10px 24px;background:#111;color:#fff;border:none;border-radius:6px;font-family:'Outfit',sans-serif;font-size:12px;font-weight:700;cursor:pointer;letter-spacing:1px">🖨️ Imprimir / PDF</button>
  <button onclick="window.close()" style="padding:10px 16px;background:#fff;color:#111;border:1px solid #E4E1DB;border-radius:6px;font-family:'Outfit',sans-serif;font-size:12px;cursor:pointer">✕ Cerrar</button>
</div>
</body></html>`;

    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
  };

  return (
    <div className="fade-up">
      {/* Banner sin procesar */}
      {sinProcesar.length > 0 && (
        <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",background:"#F3EEFF",border:"1px solid #5B3A8C33",borderRadius:8,marginBottom:14}}>
          <div style={{width:36,height:36,borderRadius:"50%",background:"#5B3A8C",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:700,flexShrink:0}}>{sinProcesar.length}</div>
          <div style={{flex:1}}>
            <div style={{fontSize:12,fontWeight:700,color:"#5B3A8C"}}>📋 Tienes {sinProcesar.length} formulario{sinProcesar.length>1?"s":""} sin asignar</div>
            <div style={{fontSize:9,color:"#7A5AAA",marginTop:2}}>Haz clic en "Procesar" para crear cliente y borrador de oferta en CRM automáticamente</div>
          </div>
          <button onClick={()=>setFiltroEstado("pendiente")} style={{padding:"6px 14px",fontSize:10,fontWeight:700,background:"#5B3A8C",color:"#fff",border:"none",borderRadius:4,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>Ver pendientes</button>
        </div>
      )}

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <h2 style={{margin:0,fontSize:18,fontWeight:700}}>Respuestas — {respuestas.length}</h2>
          {onReload && <button onClick={onReload} disabled={loading}
            style={{padding:"4px 10px",fontSize:9,fontWeight:600,cursor:loading?"wait":"pointer",fontFamily:"'Outfit',sans-serif",
              border:`1px solid ${T.border}`,borderRadius:4,background:"#fff",color:T.inkMid,opacity:loading?.5:1}}>
            🔄 {loading?"Cargando...":"Recargar"}
          </button>}
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <div style={{display:"flex",gap:0}}>
            {[{v:"todos",l:"Todos"},{v:"pendiente",l:"⏳ Pendientes"},{v:"procesado",l:"✅ Procesados"}].map((o,i)=>(
              <button key={o.v} onClick={()=>setFiltroEstado(o.v)}
                style={{padding:"5px 12px",fontSize:9,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif",
                  border:`1px solid ${T.border}`,borderLeft:i>0?"none":undefined,
                  borderRadius:i===0?"4px 0 0 4px":i===2?"0 4px 4px 0":"0",
                  background:filtroEstado===o.v?"#111":"#fff",color:filtroEstado===o.v?"#fff":T.inkMid}}>{o.l}</button>
            ))}
          </div>
          <select value={selFormId} onChange={e=>setSelFormId(e.target.value)} style={{...inp,width:200}}>
            <option value="">Todos los formularios</option>
            {forms.map(f=><option key={f.id} value={f.id}>{f.nombre}</option>)}
          </select>
        </div>
      </div>

      <Card style={{padding:0,overflow:"hidden"}}>
        <table style={{borderCollapse:"collapse",width:"100%"}}>
          <thead>
            <tr style={{background:"#EDEBE7"}}>
              {["Fecha","Hora","Formulario","Cliente","Email","Score","Estado","Acciones"].map(h=>
                <th key={h} style={ths}>{h}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.length===0 ? (
              <tr><td colSpan={8} style={{padding:24,textAlign:"center",color:T.inkLight,fontSize:11}}>Sin respuestas{filtroEstado!=="todos"?" con este filtro":""}</td></tr>
            ) : filtered.sort((a,b)=>(b.fecha||"").localeCompare(a.fecha||"")).map(r => {
              const proc = isProcesado(r);
              const dt = r.created_at ? new Date(r.created_at) : null;
              const fechaStr = dt ? dt.toISOString().split("T")[0] : r.fecha || "—";
              const horaStr = dt ? dt.toLocaleTimeString("es-CO",{hour:"2-digit",minute:"2-digit",hour12:false}) : "";
              return (
              <tr key={r.id} style={{cursor:"pointer",background:proc?"":"#FDFBFF"}} onClick={()=>setSelResp(selResp?.id===r.id?null:r)}>
                <td style={{...tds,fontFamily:"'DM Mono',monospace",fontSize:9}}>{fechaStr}</td>
                <td style={{...tds,fontSize:9}}>{horaStr}</td>
                <td style={{...tds,fontWeight:600,fontSize:10}}>{r.formularioNombre||forms.find(f=>f.id===r.formularioId)?.nombre||"—"}</td>
                <td style={{...tds,fontWeight:600,fontSize:10}}>{r.clienteNombre||"—"}</td>
                <td style={{...tds,fontSize:9,color:T.blue}}>{r.clienteEmail||"—"}</td>
                <td style={{...tds,textAlign:"center"}}>
                  {(()=>{
                    const form = forms.find(f=>f.id===r.formularioId);
                    const sc = calculateScore(r, form);
                    if (!sc) return <span style={{fontSize:8,color:T.inkLight}}>—</span>;
                    const col = sc.level==="green"?T.green:sc.level==="red"?T.red:T.amber;
                    const bg = sc.level==="green"?T.greenBg:sc.level==="red"?T.redBg:T.amberBg;
                    const icon = sc.level==="green"?"🟢":sc.level==="red"?"🔴":"🟡";
                    return <span style={{fontSize:9,fontWeight:700,padding:"2px 8px",borderRadius:10,background:bg,color:col}}>{icon} {sc.score.toFixed(1)}</span>;
                  })()}
                </td>
                <td style={tds}>
                  {proc
                    ? <span style={{fontSize:8,fontWeight:700,padding:"2px 8px",borderRadius:10,background:T.greenBg,color:T.green}}>✅ Procesado</span>
                    : <span style={{fontSize:8,fontWeight:700,padding:"2px 8px",borderRadius:10,background:"#F3EEFF",color:"#5B3A8C"}}>⏳ Pendiente</span>
                  }
                </td>
                <td style={{...tds,whiteSpace:"nowrap"}}>
                  <button onClick={e=>{e.stopPropagation();setSelResp(r)}} style={{background:"none",border:"none",cursor:"pointer",marginRight:4}} title="Ver detalle"><Eye size={11} color={T.blue}/></button>
                  <button onClick={e=>{e.stopPropagation();generarInforme(r)}} style={{background:"none",border:"none",cursor:"pointer",marginRight:4}} title="Generar informe"><FileText size={11} color={T.ink}/></button>
                  {!proc && (
                    <button onClick={e=>{e.stopPropagation();procesarRespuesta(r)}}
                      style={{padding:"3px 10px",fontSize:8,fontWeight:700,background:"#5B3A8C",color:"#fff",border:"none",borderRadius:3,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}
                      title="Crear cliente + oferta en CRM">⚡ Procesar</button>
                  )}
                  {proc && (
                    <button onClick={e=>{e.stopPropagation();markPendiente(r.id, r._sbId)}}
                      style={{padding:"3px 8px",fontSize:8,fontWeight:600,background:"#fff",color:T.inkMid,border:`1px solid ${T.border}`,borderRadius:3,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}
                      title="Marcar como pendiente">↩</button>
                  )}
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {selResp && (
        <Card style={{marginTop:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <h3 style={{fontSize:13,fontWeight:700}}>📋 Detalle respuesta — {selResp.clienteNombre||selResp.fecha}</h3>
            <div style={{display:"flex",gap:6}}>
              {!isProcesado(selResp) && (
                <Btn v="pri" on={()=>procesarRespuesta(selResp)}>⚡ Procesar → CRM</Btn>
              )}
              {isProcesado(selResp) && (
                <span style={{fontSize:9,fontWeight:700,padding:"4px 12px",borderRadius:10,background:T.greenBg,color:T.green,display:"flex",alignItems:"center"}}>✅ Procesado</span>
              )}
              <Btn v="sec" on={()=>generarInforme(selResp)}><FileText size={10}/> Generar informe</Btn>
              <button onClick={()=>setSelResp(null)} style={{background:"none",border:"none",cursor:"pointer"}}><X size={14}/></button>
            </div>
          </div>

          {/* Scoring panel */}
          {(() => {
            const form = forms.find(f=>f.id===selResp.formularioId);
            const sc = calculateScore(selResp, form);
            if (!sc) return null;
            const colors = {green:{bg:"#E8F4EE",border:"#1E6B42",text:"#1E6B42"},yellow:{bg:"#FAF0E0",border:"#7A5218",text:"#7A5218"},red:{bg:"#FAE8E8",border:"#AE2C2C",text:"#AE2C2C"}};
            const col = colors[sc.level];
            return (
              <div style={{marginBottom:14,border:`1px solid ${col.border}33`,borderRadius:8,overflow:"hidden"}}>
                <div style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",background:col.bg}}>
                  <div style={{fontSize:28,fontWeight:800,fontFamily:"'DM Mono',monospace",color:col.text}}>{sc.score.toFixed(1)}<span style={{fontSize:12}}>/10</span></div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:700,color:col.text}}>{sc.levelLabel}</div>
                    <div style={{fontSize:9,color:col.text,opacity:.8,marginTop:2}}>{sc.conclusion}</div>
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <div style={{textAlign:"center"}}><div style={{fontSize:14,fontWeight:800,color:T.green}}>{sc.greens}</div><div style={{fontSize:7,color:"#888"}}>🟢</div></div>
                    <div style={{textAlign:"center"}}><div style={{fontSize:14,fontWeight:800,color:T.amber}}>{sc.yellows}</div><div style={{fontSize:7,color:"#888"}}>🟡</div></div>
                    <div style={{textAlign:"center"}}><div style={{fontSize:14,fontWeight:800,color:T.red}}>{sc.reds}</div><div style={{fontSize:7,color:"#888"}}>🔴</div></div>
                  </div>
                </div>
                <div style={{padding:"10px 16px",background:"#fff"}}>
                  <div style={{fontSize:8,fontWeight:700,color:"#888",textTransform:"uppercase",marginBottom:6}}>Detalle de scoring</div>
                  <table style={{width:"100%",borderCollapse:"collapse"}}>
                    <thead><tr style={{background:T.bg}}>
                      {["Criterio","Respuesta","Puntos",""].map(h=><th key={h} style={{padding:"4px 8px",fontSize:7,fontWeight:700,color:"#888",textTransform:"uppercase",textAlign:"left",borderBottom:`1px solid ${T.border}`}}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {sc.details.map((d,i) => {
                        const fc = d.flag==="green"?T.green:d.flag==="red"?T.red:T.amber;
                        const icon = d.flag==="green"?"🟢":d.flag==="red"?"🔴":"🟡";
                        return (
                          <tr key={i} style={{borderBottom:`1px solid ${T.border}`}}>
                            <td style={{padding:"5px 8px",fontSize:10,fontWeight:600}}>{d.label}</td>
                            <td style={{padding:"5px 8px",fontSize:10}}>{d.value}</td>
                            <td style={{padding:"5px 8px",fontSize:10,fontWeight:700,color:fc,fontFamily:"'DM Mono',monospace"}}>{d.points}/{d.maxPoints}</td>
                            <td style={{padding:"5px 8px",fontSize:12}}>{icon}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {/* Client info card */}
          {(selResp.clienteNombre||selResp.clienteEmail) && (
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12,padding:"10px 14px",background:T.blueBg,borderRadius:6,border:`1px solid ${T.blue}22`}}>
              <div style={{width:32,height:32,borderRadius:"50%",background:T.blue,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700}}>
                {(selResp.clienteNombre||selResp.clienteEmail||"?")[0].toUpperCase()}
              </div>
              <div>
                {selResp.clienteNombre && <div style={{fontSize:12,fontWeight:700,color:T.blue}}>{selResp.clienteNombre}</div>}
                {selResp.clienteEmail && <div style={{fontSize:9,color:T.blue}}>{selResp.clienteEmail}</div>}
                {selResp.clienteTel && <div style={{fontSize:8,color:T.inkMid}}>📞 {selResp.clienteTel}</div>}
              </div>
            </div>
          )}
          <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8}}>
            {Object.entries(selResp).filter(([k])=>!["id","fecha","formularioId","formularioNombre","clienteNombre","clienteEmail","clienteTel"].includes(k)).map(([k,v]) => (
              <div key={k} style={{padding:"6px 10px",background:T.accent,borderRadius:4}}>
                <div style={{fontSize:7,fontWeight:700,color:"#888",textTransform:"uppercase"}}>{k}</div>
                <div style={{fontSize:11,fontWeight:600,marginTop:2}}>{Array.isArray(v)?v.join(", "):String(v)}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PLANTILLAS
   ═══════════════════════════════════════════════════════════════ */
function TabPlantillas({ forms, setForms, onEdit }) {
  const usePlantilla = (p) => {
    try {
      // Check if a form from this template already exists (by sourceTemplate OR by name match)
      const existing = forms.find(f => f.sourceTemplate === p.id || f.nombre === p.nombre);
      if (existing) {
        // Tag it with sourceTemplate if not already tagged
        if (!existing.sourceTemplate) {
          setForms(forms.map(f => f.id === existing.id ? {...f, sourceTemplate: p.id} : f));
        }
        onEdit(existing.id);
        return;
      }
      // Create ID mapping old→new and remap logica references
      const idMap = {};
      p.campos.forEach(c => { idMap[c.id] = uid(); });
      const newCampos = p.campos.map(c => {
        const nc = {...c, id: idMap[c.id]};
        if (nc.logica && nc.logica.fieldId && idMap[nc.logica.fieldId]) {
          nc.logica = {...nc.logica, fieldId: idMap[nc.logica.fieldId]};
        }
        return nc;
      });
      const f = { id:uid(), nombre:p.nombre, modulo:p.modulo||"general", campos:newCampos, config:{...(p.config||{}), titulo:p.config?.titulo||p.nombre, vista:p.config?.vista||"pasos"}, createdAt:today(), updatedAt:today(), activo:true, sourceTemplate:p.id };
      setForms([...forms, f]);
      onEdit(f.id);
    } catch(e) { console.error("Error al usar plantilla:", e); alert("Error al crear formulario desde plantilla"); }
  };

  return (
    <div className="fade-up">
      <h2 style={{margin:0,fontSize:18,fontWeight:700,marginBottom:14}}>Plantillas prediseñadas</h2>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280,1fr))",gap:12}}>
        {PLANTILLAS.map(p => {
          const mod = MODULOS_ASOC.find(m=>m.id===p.modulo);
          const alreadyUsed = forms.find(f => f.sourceTemplate === p.id || f.nombre === p.nombre);
          return (
            <Card key={p.id} style={{padding:0,overflow:"hidden"}}>
              <div style={{padding:"14px 16px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div style={{fontSize:13,fontWeight:700}}>{p.nombre}</div>
                  <Badge color={T.purple}>{mod?.lbl||"General"}</Badge>
                </div>
                <div style={{fontSize:10,color:T.inkMid,marginTop:4}}>{p.desc}</div>
                <div style={{fontSize:8,color:T.inkLight,marginTop:4}}>{p.campos.filter(c=>c.tipo!=="seccion").length} campos · {p.campos.filter(c=>c.required).length} obligatorios</div>
              </div>
              <div style={{borderTop:`1px solid ${T.border}`,padding:0}}>
                <button onClick={()=>usePlantilla(p)}
                  style={{width:"100%",padding:"8px 0",border:"none",background:"transparent",cursor:"pointer",fontSize:10,fontWeight:700,color:alreadyUsed?T.blue:T.green,fontFamily:"'Outfit',sans-serif"}}>
                  {alreadyUsed ? "✏️ Editar formulario existente" : "✨ Usar esta plantilla"}
                </button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TAB ESTADÍSTICAS — Supabase analytics
   ═══════════════════════════════════════════════════════════════ */
function TabEstadisticas({ forms }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [selectedForm, setSelectedForm] = useState("all");
  const [formStats, setFormStats] = useState(null);

  useEffect(() => {
    if (!SB.isConfigured()) { setLoading(false); return; }
    SB.getAllStats().then(r => { setStats(r); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedForm === "all" || !SB.isConfigured()) { setFormStats(null); return; }
    SB.getFormStats(selectedForm).then(r => setFormStats(r)).catch(() => {});
  }, [selectedForm]);

  if (!SB.isConfigured()) return (
    <Card style={{padding:28,textAlign:"center"}}>
      <div style={{fontSize:40,marginBottom:12}}>📊</div>
      <h3 style={{margin:"0 0 6px",fontSize:16,fontWeight:700}}>Estadísticas requieren Supabase</h3>
      <p style={{fontSize:11,color:T.inkMid,lineHeight:1.6}}>
        Para ver estadísticas de aperturas, tiempo y conversión, necesitas configurar Supabase.<br/>
        Ve a <strong>⚙️ Configuración → Base de datos</strong> para conectarlo.
      </p>
    </Card>
  );

  if (loading) return <Card style={{padding:28,textAlign:"center"}}><div style={{fontSize:11,color:T.inkMid}}>Cargando estadísticas...</div></Card>;

  const ev = stats?.events || [];
  const resp = stats?.responses || [];
  const opens = ev.filter(e => e.event_type === "open");
  const submits = ev.filter(e => e.event_type === "submit");
  const closes = ev.filter(e => e.event_type === "close" && e.duration_seconds > 0);
  const avgDuration = closes.length > 0 ? Math.round(closes.reduce((a,b)=>a+b.duration_seconds,0)/closes.length) : 0;
  const convRate = opens.length > 0 ? Math.round((submits.length / opens.length) * 100) : 0;

  const fmtTime = (s) => s < 60 ? `${s}s` : s < 3600 ? `${Math.floor(s/60)}m ${s%60}s` : `${Math.floor(s/3600)}h ${Math.floor((s%3600)/60)}m`;
  const fmtDate = (d) => d ? new Date(d).toLocaleString("es-CO",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit",hour12:false}) : "—";

  // Group events by form+client combo
  const grouped = {};
  ev.forEach(e => {
    const key = (e.form_id||"")+"_"+(e.client_email||e.client_name||"anon");
    if (!grouped[key]) grouped[key] = { form_id:e.form_id, form_name:e.form_name||e.form_id, client_name:e.client_name||"", client_email:e.client_email||"", opens:0, submits:0, lastDate:null, duration:0, durationCount:0 };
    if (e.event_type==="open") grouped[key].opens++;
    if (e.event_type==="submit") grouped[key].submits++;
    if (e.event_type==="close" && e.duration_seconds>0) { grouped[key].duration+=e.duration_seconds; grouped[key].durationCount++; }
    const d = e.created_at ? new Date(e.created_at) : null;
    if (d && (!grouped[key].lastDate || d > grouped[key].lastDate)) grouped[key].lastDate = d;
  });
  let rows = Object.values(grouped);
  // Filter by selected form
  if (selectedForm !== "all") rows = rows.filter(r => r.form_id === selectedForm);
  // Sort by most recent
  rows.sort((a,b) => (b.lastDate||0) - (a.lastDate||0));

  // Group by form
  const formIds = [...new Set(ev.map(e=>e.form_id).concat(resp.map(r=>r.form_id)))];

  const ths = {padding:"8px 10px",textAlign:"left",fontWeight:700,fontSize:8,textTransform:"uppercase",color:T.inkMid,borderBottom:`1px solid ${T.border}`};
  const tds = {padding:"8px 10px",fontSize:11,borderBottom:`1px solid ${T.border}`,verticalAlign:"middle"};

  return (
    <div>
      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
        {[
          ["👁️ Aperturas",opens.length,"#1E4F8C"],
          ["✅ Envíos",submits.length,"#1E6B42"],
          ["📊 Conversión",`${convRate}%`,"#5B3A8C"],
          ["⏱️ Tiempo promedio",fmtTime(avgDuration),"#7A5218"],
        ].map(([l,v,c])=>(
          <Card key={l} style={{padding:"14px 16px"}}>
            <div style={{fontSize:8,fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>{l}</div>
            <div style={{fontSize:22,fontWeight:800,fontFamily:"'DM Mono',monospace",color:c}}>{v}</div>
          </Card>
        ))}
      </div>

      {/* Form selector */}
      <Card style={{padding:"14px 16px",marginBottom:16}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{fontSize:9,fontWeight:700,color:T.inkMid,textTransform:"uppercase"}}>Filtrar por formulario:</div>
          <select value={selectedForm} onChange={e=>setSelectedForm(e.target.value)}
            style={{...inp,width:260,fontSize:11}}>
            <option value="all">📊 Todos los formularios</option>
            {forms.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
            {formIds.filter(id => !forms.find(f=>f.id===id)).map(id => <option key={id} value={id}>ID: {id}</option>)}
          </select>
        </div>
      </Card>

      {/* Per-form stats */}
      {formStats && (
        <Card style={{padding:"16px",marginBottom:16}}>
          <h3 style={{margin:"0 0 12px",fontSize:14,fontWeight:700}}>📈 Detalle del formulario</h3>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:14}}>
            {[
              ["Aperturas",formStats.totalOpens,"#1E4F8C"],
              ["Envíos",formStats.totalSubmits,"#1E6B42"],
              ["Conversión",formStats.conversionRate+"%","#5B3A8C"],
              ["Tiempo prom.",fmtTime(formStats.avgDurationSec),"#7A5218"],
            ].map(([l,v,c])=>(
              <div key={l} style={{padding:"10px 12px",background:T.bg,borderRadius:6,border:`1px solid ${T.border}`}}>
                <div style={{fontSize:7,fontWeight:700,color:"#888",textTransform:"uppercase"}}>{l}</div>
                <div style={{fontSize:18,fontWeight:800,fontFamily:"'DM Mono',monospace",color:c}}>{v}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Activity table — grouped by form+client */}
      <Card style={{padding:0,overflow:"hidden"}}>
        <div style={{padding:"14px 16px",borderBottom:`1px solid ${T.border}`}}>
          <h3 style={{margin:0,fontSize:14,fontWeight:700}}>📋 Formularios recibidos</h3>
        </div>
        {rows.length === 0 ? (
          <div style={{fontSize:11,color:T.inkMid,textAlign:"center",padding:28}}>No hay actividad registrada aún.</div>
        ) : (
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead>
                <tr style={{background:T.bg}}>
                  {["Estado","Fecha","Hora","Formulario","Cliente","Aperturas","Envíos","Tiempo","Conversión"].map(h=>
                    <th key={h} style={ths}>{h}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((r,i) => {
                  const hasSubmit = r.submits > 0;
                  const conv = r.opens > 0 ? Math.round((r.submits / r.opens) * 100) : 0;
                  const avgTime = r.durationCount > 0 ? Math.round(r.duration / r.durationCount) : 0;
                  const fechaStr = r.lastDate ? r.lastDate.toISOString().split("T")[0] : "—";
                  const horaStr = r.lastDate ? r.lastDate.toLocaleTimeString("es-CO",{hour:"2-digit",minute:"2-digit",hour12:false}) : "";
                  return (
                    <tr key={i} style={{background:i%2===0?"#fff":"#FAFAF8"}}>
                      <td style={tds}>
                        <span style={{fontSize:9,padding:"3px 10px",borderRadius:10,fontWeight:700,
                          color:hasSubmit?T.green:T.amber,
                          background:hasSubmit?T.greenBg:T.amberBg}}>
                          {hasSubmit?"✅ Recibido":"⏳ Pendiente"}
                        </span>
                      </td>
                      <td style={{...tds,fontFamily:"'DM Mono',monospace",fontSize:9}}>
                        {fechaStr}
                      </td>
                      <td style={{...tds,fontSize:9}}>
                        {horaStr}
                      </td>
                      <td style={{...tds,fontWeight:600}}>{r.form_name}</td>
                      <td style={tds}>
                        <div style={{fontWeight:600,fontSize:11}}>{r.client_name||"—"}</div>
                        {r.client_email && <div style={{fontSize:9,color:T.blue}}>{r.client_email}</div>}
                      </td>
                      <td style={{...tds,textAlign:"center",fontFamily:"'DM Mono',monospace",fontWeight:700,color:"#1E4F8C"}}>{r.opens}</td>
                      <td style={{...tds,textAlign:"center",fontFamily:"'DM Mono',monospace",fontWeight:700,color:"#1E6B42"}}>{r.submits}</td>
                      <td style={{...tds,textAlign:"center",fontSize:10,color:T.inkMid}}>{avgTime > 0 ? fmtTime(avgTime) : "—"}</td>
                      <td style={{...tds,textAlign:"center"}}>
                        <span style={{fontFamily:"'DM Mono',monospace",fontWeight:700,fontSize:10,
                          color:conv>=50?T.green:conv>0?T.amber:T.inkLight}}>{conv}%</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN EXPORT
   ═══════════════════════════════════════════════════════════════ */
export default function Formularios() {
  const [data, setData] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE_KEY)) || {};
      if (!saved.forms) saved.forms = [];
      return saved;
    } catch { return { forms: [] }; }
  });
  const save = (k,v) => setData(prev => { const n = {...prev,[k]:typeof v==="function"?v(prev[k]):v}; localStorage.setItem(STORE_KEY,JSON.stringify(n)); return n; });

  const forms = data.forms || [];
  const setForms = (v) => save("forms", typeof v==="function"?v(forms):v);

  // Auto-seed: create forms from PLANTILLAS if not already present
  useEffect(() => {
    const current = data.forms || [];
    const missing = PLANTILLAS.filter(p => !current.find(f => f.sourceTemplate === p.id || f.nombre === p.nombre));
    if (missing.length > 0) {
      const newForms = missing.map(p => {
        const idMap = {};
        p.campos.forEach(c => { idMap[c.id] = uid(); });
        const newCampos = p.campos.map(c => {
          const nc = {...c, id: idMap[c.id]};
          if (nc.logica && nc.logica.fieldId && idMap[nc.logica.fieldId]) {
            nc.logica = {...nc.logica, fieldId: idMap[nc.logica.fieldId]};
          }
          return nc;
        });
        return { id:uid(), nombre:p.nombre, modulo:p.modulo||"general", campos:newCampos, config:{...(p.config||{}), titulo:p.config?.titulo||p.nombre, vista:p.config?.vista||"pasos"}, createdAt:today(), updatedAt:today(), activo:true, sourceTemplate:p.id };
      });
      save("forms", [...current, ...newForms]);
    }
  }, []); // eslint-disable-line
  const envios = data.envios || [];
  const addEnvio = (e) => save("envios", [...envios, e]);

  // Load responses from Supabase + localStorage fallback
  const [respuestas, setRespuestas] = useState([]);
  const [respLoading, setRespLoading] = useState(false);
  const loadResponses = async () => {
    setRespLoading(true);
    const arr = [];
    const seen = new Set();
    // 1. Try Supabase first
    if (SB.isConfigured()) {
      try {
        const sbResp = await SB.getAllResponses();
        if (sbResp && sbResp.length > 0) {
          sbResp.forEach(r => {
            const respData = r.data || {};
            const merged = {
              ...respData,
              _sbId: r.id,
              id: respData.id || r.id,
              formularioId: r.form_id || respData.formularioId,
              formularioNombre: r.form_name || respData.formularioNombre,
              clienteNombre: r.client_name || respData.clienteNombre,
              clienteEmail: r.client_email || respData.clienteEmail,
              clienteTel: r.client_tel || respData.clienteTel,
              fecha: respData.fecha || (r.created_at ? r.created_at.split("T")[0] : ""),
              created_at: r.created_at || null,
              processed: r.processed || false,
            };
            if (!seen.has(merged.id)) { seen.add(merged.id); arr.push(merged); }
          });
        }
      } catch(e) { console.warn("Error loading Supabase responses:", e); }
    }
    // 2. Also check localStorage (backward compatible)
    for (let i=0; i<localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("shared:hab:briefing:")) {
        try {
          const r = JSON.parse(localStorage.getItem(key));
          if (r && r.id && !seen.has(r.id)) { seen.add(r.id); arr.push(r); }
        } catch {}
      }
    }
    setRespuestas(arr);
    setRespLoading(false);
  };
  useEffect(() => { loadResponses(); }, []);

  const [tab, setTab] = useState(() => localStorage.getItem("hab:form:tab") || "dashboard");
  const changeTab = (t) => { setTab(t); localStorage.setItem("hab:form:tab", t); };
  const [editId, setEditId] = useState(null);

  const goConstructor = (id) => { setEditId(id||null); changeTab("constructor"); };
  const goNew = () => { setEditId(null); changeTab("constructor"); };
  const onSaved = (form) => { setEditId(form.id); changeTab("mis_forms"); };

  return (
    <>
      <Fonts/>
      <div style={{padding:"30px 36px",maxWidth:1400,margin:"0 auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <div>
            <div style={{fontSize:22,fontWeight:800,letterSpacing:1}}>📋 Formularios</div>
            <div style={{fontSize:10,color:T.inkMid}}>Constructor · Plantillas · Respuestas · Compartir</div>
          </div>
        </div>

        <div style={{display:"flex",gap:0,marginBottom:20}}>
          {TABS.map((t,i) => (
            <button key={t.id} onClick={()=>{changeTab(t.id);if(t.id!=="constructor")setEditId(null);}}
              style={{padding:"10px 18px",fontSize:11,fontWeight:600,cursor:"pointer",
                border:`1px solid ${T.border}`,borderLeft:i>0?"none":undefined,
                fontFamily:"'Outfit',sans-serif",whiteSpace:"nowrap",
                borderRadius:i===0?"6px 0 0 6px":i===TABS.length-1?"0 6px 6px 0":"0",
                background:tab===t.id?"#111":"#fff",
                color:tab===t.id?"#fff":T.inkMid}}>
              {t.lbl}
            </button>
          ))}
        </div>

        {/* Dashboard */}
        {tab === "dashboard" && (
          <div className="fade-up">
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
              {(()=>{
                const proc = (() => { try { return JSON.parse(localStorage.getItem("hab:form:procesados")||"[]"); } catch { return []; } })();
                const sinProc = respuestas.filter(r => !proc.includes(r.id)).length;
                return [
                  ["📋 Formularios",forms.length,"#111"],
                  ["📤 Enviados",envios.length,"#1E4F8C"],
                  ["📥 Respuestas",respuestas.length,"#1E6B42"],
                  ["⏳ Sin asignar",sinProc,sinProc>0?"#5B3A8C":"#1E6B42"]
                ];
              })().map(([l,v,c])=>(
                <Card key={l} style={{padding:"14px 16px",cursor:l.includes("Sin asignar")&&v>0?"pointer":undefined}} onClick={l.includes("Sin asignar")&&v>0?()=>changeTab("respuestas"):undefined}><div style={{fontSize:8,fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>{l}</div><div style={{fontSize:22,fontWeight:800,fontFamily:"'DM Mono',monospace",color:c}}>{v}</div></Card>
              ))}
            </div>
            {/* Quick actions */}
            {(()=>{
              const proc = (() => { try { return JSON.parse(localStorage.getItem("hab:form:procesados")||"[]"); } catch { return []; } })();
              const sinProc = respuestas.filter(r => !proc.includes(r.id)).length;
              if (sinProc === 0) return null;
              return (
                <Card style={{padding:"12px 16px",marginBottom:16,background:"#F3EEFF",border:"1px solid #5B3A8C33",cursor:"pointer"}} onClick={()=>changeTab("respuestas")}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{width:32,height:32,borderRadius:"50%",background:"#5B3A8C",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700}}>{sinProc}</div>
                    <div>
                      <div style={{fontSize:12,fontWeight:700,color:"#5B3A8C"}}>📋 Tienes {sinProc} formulario{sinProc>1?"s":""} sin asignar</div>
                      <div style={{fontSize:9,color:"#7A5AAA",marginTop:1}}>Haz clic para ir a Respuestas y procesarlos → crear cliente + borrador oferta</div>
                    </div>
                  </div>
                </Card>
              );
            })()}
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
              <Card style={{padding:"18px 16px",cursor:"pointer",textAlign:"center"}} onClick={goNew}>
                <div style={{fontSize:24,marginBottom:6}}>✨</div>
                <div style={{fontSize:12,fontWeight:700}}>Crear formulario</div>
                <div style={{fontSize:9,color:T.inkMid,marginTop:2}}>Desde cero con el constructor</div>
              </Card>
              <Card style={{padding:"18px 16px",cursor:"pointer",textAlign:"center"}} onClick={()=>changeTab("plantillas")}>
                <div style={{fontSize:24,marginBottom:6}}>📎</div>
                <div style={{fontSize:12,fontWeight:700}}>Usar plantilla</div>
                <div style={{fontSize:9,color:T.inkMid,marginTop:2}}>Briefing, SST, encuestas...</div>
              </Card>
              <Card style={{padding:"18px 16px",cursor:"pointer",textAlign:"center"}} onClick={()=>changeTab("respuestas")}>
                <div style={{fontSize:24,marginBottom:6}}>📥</div>
                <div style={{fontSize:12,fontWeight:700}}>Ver respuestas</div>
                <div style={{fontSize:9,color:T.inkMid,marginTop:2}}>{respuestas.length} respuestas recibidas</div>
              </Card>
            </div>
          </div>
        )}
        {tab === "mis_forms"   && <ListaForms forms={forms} setForms={setForms} onEdit={goConstructor} onNew={goNew}/>}
        {tab === "constructor" && <Constructor forms={forms} setForms={setForms} editId={editId} setEditId={setEditId} onSaved={onSaved} envios={envios} addEnvio={addEnvio}/>}
        {tab === "enviados"    && (
          <div className="fade-up">
            <h2 style={{margin:0,fontSize:18,fontWeight:700,marginBottom:14}}>Formularios enviados — {envios.length}</h2>
            <Card style={{padding:0,overflow:"hidden"}}>
              <table style={{borderCollapse:"collapse",width:"100%"}}>
                <thead><tr style={{background:"#EDEBE7"}}>
                  {["Fecha","Hora","Formulario","Cliente","Email","Teléfono","Estado","Acciones"].map(h=><th key={h} style={ths}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {envios.length===0 ? (
                    <tr><td colSpan={8} style={{padding:24,textAlign:"center",color:T.inkLight,fontSize:11}}>No has enviado formularios aún</td></tr>
                  ) : [...envios].reverse().map(e => {
                    const hasResp = respuestas.some(r=>r.clienteEmail===e.cliente?.email && r.formularioId===e.formId);
                    const isBlocked = e.blocked;
                    return (
                      <tr key={e.id} style={{background:isBlocked?"#FDF5F5":""}}>
                        <td style={{...tds,fontFamily:"'DM Mono',monospace",fontSize:9}}>{e.fecha}</td>
                        <td style={{...tds,fontSize:9}}>{e.hora}</td>
                        <td style={{...tds,fontWeight:600}}>{e.formNombre}</td>
                        <td style={{...tds,fontWeight:600}}>{e.cliente?.nombre||"—"}</td>
                        <td style={{...tds,fontSize:9,color:T.blue}}>{e.cliente?.email||"—"}</td>
                        <td style={{...tds,fontSize:9}}>{e.cliente?.tel||"—"}</td>
                        <td style={tds}>
                          {isBlocked
                            ? <Badge color={T.red}>🚫 Bloqueado</Badge>
                            : hasResp ? <Badge color={T.green}>✅ Respondido</Badge> : <Badge color={T.amber}>⏳ Pendiente</Badge>
                          }
                        </td>
                        <td style={{...tds,whiteSpace:"nowrap"}}>
                          {isBlocked ? (
                            <button onClick={()=>{
                              const updated = envios.map(x => x.id===e.id ? {...x, blocked:false} : x);
                              save("envios", updated);
                              if (e.linkId && SB.isConfigured()) {
                                SB.toggleLink && SB.toggleLink(e.linkId, true).catch(()=>{});
                              }
                            }} style={{padding:"3px 10px",fontSize:8,fontWeight:700,background:T.green,color:"#fff",border:"none",borderRadius:3,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}
                              title="Desbloquear enlace">🔓 Desbloquear</button>
                          ) : (
                            <button onClick={()=>{
                              if (!confirm("¿Bloquear este enlace? El cliente verá un mensaje de formulario bloqueado.")) return;
                              const updated = envios.map(x => x.id===e.id ? {...x, blocked:true} : x);
                              save("envios", updated);
                              if (e.linkId && SB.isConfigured()) {
                                SB.toggleLink && SB.toggleLink(e.linkId, false).catch(()=>{});
                              }
                            }} style={{padding:"3px 10px",fontSize:8,fontWeight:700,background:T.red,color:"#fff",border:"none",borderRadius:3,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}
                              title="Bloquear enlace">🚫 Bloquear</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          </div>
        )}
        {tab === "respuestas"   && <TabRespuestas forms={forms} respuestas={respuestas} onReload={loadResponses} loading={respLoading}/>}
        {tab === "estadisticas" && <TabEstadisticas forms={forms}/>}
        {tab === "plantillas"   && <TabPlantillas forms={forms} setForms={setForms} onEdit={goConstructor}/>}
      </div>
    </>
  );
}
