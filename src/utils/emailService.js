// ═══════════════════════════════════════════════════════════════
// src/utils/emailService.js
// Helper centralizado de email — Habitaris Suite
// Cualquier módulo importa: import { sendEmail } from '../utils/emailService'
// ═══════════════════════════════════════════════════════════════

import { store } from "../core/store.js";
import { getConfig } from "../modules/Configuracion.jsx";

// ─── PLANTILLAS DE EMAIL ──────────────────────────────────────

const PLANTILLAS = {

  form_enviado: {
    subject: "📋 {{formName}} — {{empresa}}",
    message: "Hola {{nombre}},\n\nTe compartimos el siguiente formulario para que lo completes a tu conveniencia.\n\nFormulario: {{formName}}\n\nHaz clic en el botón de abajo para acceder.",
    requiere: ["nombre", "formName"],
  },

  form_recibido: {
    subject: "\u2705 Nueva respuesta: {{formName}}",
    message: "Se ha recibido una nueva respuesta al formulario \u00AB{{formName}}\u00BB.",
    intro: "Nueva respuesta recibida",
    requiere: ["formName", "clienteNombre"],
    nota: "Incluye autom\u00E1ticamente: datos del cliente, respuestas con banderas \u{1F7E2}\u{1F7E1}\u{1F534} y scoring",
  },

  oferta_enviada: {
    subject: "📄 Propuesta {{refOferta}} — {{empresa}}",
    message: "Hola {{nombre}},\n\nAdjunto encontrarás nuestra propuesta comercial para el proyecto «{{proyecto}}».\n\nReferencia: {{refOferta}}\nValor: {{valor}}\n\nHaz clic en el botón para revisar y aprobar.",
    requiere: ["nombre", "refOferta", "proyecto"],
  },

  oferta_aprobada: {
    subject: "🎉 Oferta aprobada — {{refOferta}}",
    message: "La oferta «{{refOferta}}» para el proyecto «{{proyecto}}» ha sido APROBADA por el cliente.\n\nCliente: {{nombre}}\nFecha: {{fecha}}\n\nComentario: {{comentario}}",
    requiere: ["refOferta", "proyecto"],
  },

  oferta_rechazada: {
    subject: "❌ Oferta rechazada — {{refOferta}}",
    message: "La oferta «{{refOferta}}» para el proyecto «{{proyecto}}» ha sido RECHAZADA.\n\nCliente: {{nombre}}\nFecha: {{fecha}}\nMotivo: {{comentario}}",
    requiere: ["refOferta", "proyecto"],
  },

  oferta_revision: {
    subject: "🔄 Oferta en revisión — {{refOferta}}",
    message: "El cliente ha solicitado revisión de la oferta «{{refOferta}}» para «{{proyecto}}».\n\nCliente: {{nombre}}\nFecha: {{fecha}}\nComentario: {{comentario}}",
    requiere: ["refOferta", "proyecto"],
  },

  notificacion: {
    subject: "🔔 {{asunto}} — {{empresa}}",
    message: "{{mensaje}}",
    requiere: ["asunto", "mensaje"],
  },

  rrhh_novedad: {
    subject: "📝 Nueva novedad RRHH: {{tipo}} — {{empleado}}",
    message: "Se ha registrado una novedad de tipo «{{tipo}}» para el empleado {{empleado}}.\n\nPeríodo: {{periodo}}\nEstado: {{estado}}\nFecha: {{fecha}}",
    requiere: ["tipo", "empleado"],
  },

  invitacion: {
    subject: "👋 Invitación a {{empresa}} Suite",
    message: "Hola {{nombre}},\n\nHas sido invitado/a a la plataforma de {{empresa}}.\n\nHaz clic en el botón de abajo para configurar tu cuenta y acceder.",
    requiere: ["nombre"],
  },

  bienvenida: {
    subject: "👋 Bienvenido a {{empresa}}",
    message: "Hola {{nombre}},\n\nBienvenido/a a {{empresa}}. Tu cuenta ha sido creada exitosamente.\n\nAccede a la plataforma con el botón de abajo.",
    requiere: ["nombre"],
  },

  test: {
    subject: "🧪 Email de prueba — {{empresa}}",
    message: "Este es un email de prueba enviado desde la suite {{empresa}}.\n\nSi recibes este mensaje, la configuración de correo está funcionando correctamente.\n\nFecha: {{fecha}}",
    requiere: [],
  },

  generico: {
    subject: "{{asunto}}",
    message: "{{mensaje}}",
    requiere: ["asunto", "mensaje"],
  },
};

// ─── LEER PLANTILLAS PERSONALIZADAS DESDE STORAGE ────────────
const CUSTOM_KEY = "hab:comunicaciones:plantillas";
function getCustomPlantillas() {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    if (!raw) return {};
    const arr = JSON.parse(raw);
    const map = {};
    arr.forEach(p => { map[p.id] = p; });
    return map;
  } catch { return {}; }
}

// ─── OBTENER PLANTILLA (custom > default) ─────────────────────
function getPlantilla(tipo) {
  const custom = getCustomPlantillas();
  const base = PLANTILLAS[tipo] || PLANTILLAS.generico;
  if (custom[tipo]) {
    return {
      subject: custom[tipo].subject || base.subject,
      message: custom[tipo].message || base.message,
      requiere: base.requiere,
    };
  }
  return base;
}

// ─── INTERPOLADOR ─────────────────────────────────────────────
function interpolar(template, vars = {}) {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return vars[key] !== undefined && vars[key] !== null ? String(vars[key]) : "";
  });
}

// ─── BRAND PARAMS DESDE CONFIG ────────────────────────────────
function getBrandParams() {
  const cfg = getConfig();
  return {
    empresa:        cfg.empresa?.nombre        || "Habitaris",
    razonSocial:    cfg.empresa?.razonSocial    || "",
    domicilio:      cfg.empresa?.domicilio       || "Bogotá D.C.",
    emailPrincipal: cfg.correo?.emailPrincipal   || "comercial@habitaris.co",
    colorPrimario:  cfg.apariencia?.colorPrimario  || "#111111",
    colorSecundario:cfg.apariencia?.colorSecundario || "#3B3B3B",
    colorAcento:    cfg.apariencia?.colorAcento     || "#111111",
    logo:           cfg.apariencia?.logo            || "",
    slogan:         cfg.apariencia?.slogan || cfg.empresa?.eslogan || "",
  };
}


// ─── LOG DE HISTORIAL ─────────────────────────────────────────
async function logEmail(tipo, to, subject, ok, error) {
  try {
    const KEY = "hab:comunicaciones:historial";
    let hist = [];
    try { const raw = await store.get(KEY); if (raw) hist = JSON.parse(raw); } catch {}
    hist.push({ tipo, to, subject, ok, error: error || "", fecha: new Date().toISOString() });
    if (hist.length > 500) hist = hist.slice(-500); // max 500
    await store.set(KEY, JSON.stringify(hist));
  } catch(e) { console.warn("[emailService] Log error:", e); }
}

// ─── FUNCIÓN PRINCIPAL ────────────────────────────────────────
export async function sendEmail(tipo, params = {}) {
  try {
    const plantilla = getPlantilla(tipo);
    const brand = getBrandParams();

    const vars = {
      empresa: brand.empresa,
      fecha: new Date().toLocaleDateString("es-CO", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit", hour12: false,
      }),
      ...params,
    };

    const subject = params.subject || interpolar(plantilla.subject, vars);
    const message = params.message || interpolar(plantilla.message, vars);

    if (!params.to) {
      console.warn("[emailService] Falta 'to' (destinatario)");
      return { ok: false, error: "Falta destinatario (to)" };
    }

    const res = await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: params.to, subject, message, link: params.link || "", link_info: params.link_info || "", brand, type: tipo, extra: params.extra || null }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      console.error("[emailService] API error:", res.status, errText);
      await logEmail(tipo, params.to, subject, false, `Error ${res.status}`);
      return { ok: false, error: `Error ${res.status}: ${errText}` };
    }

    const data = await res.json().catch(() => ({}));
    console.log(`[emailService] ✅ Email "${tipo}" enviado a ${params.to}`);
    await logEmail(tipo, params.to, subject, true);
    return { ok: true, data };

  } catch (err) {
    console.error("[emailService] Error:", err);
    await logEmail(tipo, params?.to || "?", "?", false, err.message);
    return { ok: false, error: err.message };
  }
}

// ─── HELPERS DE CONVENIENCIA ──────────────────────────────────
export const enviarFormulario = (to, nombre, formName, link, link_info) =>
  sendEmail("form_enviado", { to, nombre, formName, link, link_info });

export const notificarRespuesta = (to, formName, clienteNombre, clienteEmail, clienteTel, contenido) =>
  sendEmail("form_recibido", { to, formName, clienteNombre, clienteEmail, clienteTel, contenido,
    extra: { form_name: formName, client_name: clienteNombre, client_email: clienteEmail, client_tel: clienteTel, contenido,
      fecha: new Date().toLocaleDateString("es-CO", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit", hour12:false }) }
  });

export const enviarOferta = (to, nombre, refOferta, proyecto, valor, link) =>
  sendEmail("oferta_enviada", { to, nombre, refOferta, proyecto, valor, link });

export const notificarEstadoOferta = (to, estado, refOferta, proyecto, nombre, comentario) => {
  const tipos = { aprobada: "oferta_aprobada", rechazada: "oferta_rechazada", revision: "oferta_revision" };
  return sendEmail(tipos[estado] || "notificacion", { to, refOferta, proyecto, nombre, comentario });
};

export const enviarInvitacion = (to, nombre, link) =>
  sendEmail("invitacion", { to, nombre, link });

export const enviarTest = (to) =>
  sendEmail("test", { to });

export const notificar = (to, asunto, mensaje, link) =>
  sendEmail("notificacion", { to, asunto, mensaje, link });

export function getPlantillas() {
  const custom = getCustomPlantillas();
  return Object.entries(PLANTILLAS).map(([key, val]) => {
    const c = custom[key];
    return {
      id: key,
      subject: c?.subject || val.subject,
      message: c?.message || val.message,
      requiere: val.requiere,
      isCustom: !!c,
    };
  });
}

export const EMAIL_TIPOS = Object.keys(PLANTILLAS);
