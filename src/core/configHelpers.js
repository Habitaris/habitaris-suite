/**
 * src/core/configHelpers.js
 *
 * Helpers de configuración del tenant — Sprint C Capa 1 (2 mayo 2026).
 *
 * Filosofía:
 *   - Cualquier módulo de la suite que necesite branding, URLs, datos de contacto,
 *     datos legales o defaults regionales DEBE leerlos a través de estos helpers.
 *   - NUNCA hardcodear "Habitaris", "comercial@habitaris.es", colores, NIT, etc. en
 *     componentes. Eso va en BD (tenant_config / companies / country_configs).
 *   - Cada helper devuelve un FALLBACK al valor hardcoded actual cuando la BD no
 *     tiene aún el valor. Esto permite migrar módulo a módulo sin romper nada
 *     mientras la BD se completa.
 *
 * Estructura BD esperada (ver SQL de migración en sprintC-config-helpers):
 *
 *   tenant_config.config (JSONB):
 *     {
 *       identity:    { display_name, legal_name, tagline },
 *       urls:        { app, public_website },
 *       contact:     { primary_email, noreply_email, legal_email, primary_phone },
 *       branding:    { logo_white_url, logo_black_url, logo_pdf_base64,
 *                      color_primary, color_secondary, color_accent,
 *                      color_success, color_warning, color_danger,
 *                      font_family_primary, font_family_mono },
 *       defaults:    { country, locale, currency, timezone },
 *       default_legal_representative: { name, cargo, email, document_type, document_number },
 *     }
 *
 *   companies (campos relevantes):
 *     id, tenant_id, display_name, legal_name, tax_id, pais, divisa,
 *     domicilio_legal (jsonb), phone, legal_representative (jsonb),
 *     branding_override (jsonb)
 *
 *   country_configs (tabla nueva):
 *     code (PK), name, flag_emoji, phone_code,
 *     default_locale, default_currency, default_timezone,
 *     config (jsonb): { legal_constants, arl_levels, normative_refs,
 *                       departamentos, compliance_urls, legal_text_templates }
 *
 * IMPORTANTE: este módulo NO toca BD ni tiene side effects. Solo lee del
 * TenantContext (que ya carga tenant_config en cada sesión).
 *
 * Para country_configs (que NO está en TenantContext todavía) se usa un cache
 * en memoria y un fetch lazy. Cuando un módulo llama a useCountryConfig("CO")
 * por primera vez, se carga; las siguientes llamadas son síncronas.
 */

import { useEffect, useMemo, useState } from "react";
import { useTenant } from "./TenantContext.jsx";
import { sb } from "./supabase.js";

// ── Fallbacks (valores actuales hardcoded en código) ────────────────────
// Si la BD no tiene aún estos campos, los helpers devuelven esto.
// La meta es que estos fallbacks desaparezcan cuando la migración esté completa
// y el seeder haya rellenado todos los tenants.

const FALLBACK_TENANT = {
  identity: {
    display_name: "Habitaris",
    legal_name: "Habitaris S.A.S.",
    tagline: "Diseño · Interiorismo · Arquitectura",
  },
  urls: {
    app: "https://suite.habitaris.es",
    public_website: "https://www.habitaris.es",
  },
  contact: {
    primary_email: "comercial@habitaris.es",
    noreply_email: "noreply@habitaris.es",
    legal_email:   "legal@habitaris.es",
    primary_phone: "+57 350 566 1545",
  },
  branding: {
    logo_white_url: "/logo-habitaris-blanco.jpg",
    logo_black_url: "/logo-habitaris-negro.svg",
    logo_pdf_base64: null, // se carga dinámicamente desde habLogo.js si null
    color_primary:   "#111111",
    color_secondary: "#3B3B3B",
    color_accent:    "#1E6B42",
    color_success:   "#10B981",
    color_warning:   "#D97706",
    color_danger:    "#B91C1C",
    font_family_primary: "DM Sans",
    font_family_mono:    "DM Mono",
  },
  defaults: {
    country:  "CO",
    locale:   "es-CO",
    currency: "COP",
    timezone: "America/Bogota",
  },
  default_legal_representative: {
    name: "Ana María Díaz Buitrago",
    cargo: "Directora Creativa y Diseño",
    email: "amdiaz@habitaris.es",
    document_type: "CC",
    document_number: "1.109.293.384",
  },
};

// IMPORTANTE: la tabla country_configs en BD usa nombres ES (pais, nombre,
// divisa_default, idioma_default) por compatibilidad con módulos existentes
// (Usuarios.jsx, Grupo.jsx, Pais.jsx). Los fallbacks aquí siguen ese esquema.
// Los helpers exponen alias en EN (code, name, currency, locale) para uso interno.
const FALLBACK_COUNTRY_CONFIGS = {
  CO: {
    pais: "CO",
    nombre: "Colombia",
    flag_emoji: "🇨🇴",
    phone_code: "+57",
    default_locale: "es-CO",
    divisa_default: "COP",
    idioma_default: "es",
    default_timezone: "America/Bogota",
    config: {
      legal_constants: {
        smlmv: { value: 1750905, valid_from: "2026-01-01", currency: "COP" },
        aux_transporte: { value: 249095, valid_from: "2026-01-01", currency: "COP" },
        uvt: { value: 49799, valid_from: "2026-01-01", currency: "COP" },
        horas_mensuales_legal: 220,
      },
      arl_levels: [
        { nivel: "I",   percent: 0.522, label: "Mínimo" },
        { nivel: "II",  percent: 1.044, label: "Bajo" },
        { nivel: "III", percent: 2.436, label: "Medio" },
        { nivel: "IV",  percent: 4.350, label: "Alto" },
        { nivel: "V",   percent: 6.960, label: "Máximo" },
      ],
      normative_refs: [
        { ley: "Ley 1581/2012",   desc: "Habeas Data — protección de datos personales" },
        { ley: "Decreto 1377/2013", desc: "Reglamento de Habeas Data" },
        { ley: "Ley 50/1990",     desc: "Reforma laboral, prima, cesantías" },
        { ley: "Ley 100/1993",    desc: "Sistema de seguridad social integral" },
      ],
      departamentos: [
        "Amazonas","Antioquia","Arauca","Atlántico","Bogotá D.C.","Bolívar",
        "Boyacá","Caldas","Caquetá","Casanare","Cauca","Cesar","Chocó","Córdoba",
        "Cundinamarca","Guainía","Guaviare","Huila","La Guajira","Magdalena",
        "Meta","Nariño","Norte de Santander","Putumayo","Quindío","Risaralda",
        "San Andrés y Providencia","Santander","Sucre","Tolima","Valle del Cauca",
        "Vaupés","Vichada",
      ],
      compliance_urls: {
        antecedentes_policia:     "https://antecedentes.policia.gov.co:7005/WebJudicial/",
        antecedentes_procuraduria:"https://www.procuraduria.gov.co/Pages/Consulta-de-Antecedentes.aspx",
        antecedentes_contraloria: "https://www.contraloria.gov.co/control-fiscal/responsabilidad-fiscal/certificado-de-antecedentes-fiscales",
      },
      legal_text_templates: {
        privacy_notice: "En {{razon_social}} (NIT {{tax_id}}, domicilio {{domicilio}}, email: {{primary_email}}, tel: {{primary_phone}}), tratamos tus datos personales para procesar tu solicitud, enviar cotizaciones y gestionar proyectos. Cumplimos con la Ley 1581/2012 y Régimen de Protección de Datos. Derechos (acceso, rectificación, supresión, revocación): vía {{primary_email}}.",
        habeas_data: "Al enviar este formulario autorizo a {{razon_social}}, para el uso de mis datos personales con el fin de elaborar propuestas de diseño, coordinar servicios relacionados y, en caso de ser necesario, compartirlos con proveedores o contratistas de confianza exclusivamente para la correcta ejecución del proyecto. En todo momento se garantizará la confidencialidad y protección de mi información, conforme a la normativa de Habeas Data en Colombia (Ley 1581 de 2012).",
        confirmation: "La información entregada es verídica y será utilizada únicamente para la elaboración de la propuesta de diseño. {{razon_social}} garantiza la confidencialidad de los datos y no los compartirá con terceros, salvo con proveedores o contratistas de confianza cuando sea necesario para la correcta ejecución del proyecto, previa autorización del cliente.",
      },
    },
  },
  ES: {
    pais: "ES",
    nombre: "España",
    flag_emoji: "🇪🇸",
    phone_code: "+34",
    default_locale: "es-ES",
    divisa_default: "EUR",
    idioma_default: "es",
    default_timezone: "Europe/Madrid",
    config: {
      legal_constants: {
        smi: { value: 1184, valid_from: "2026-01-01", currency: "EUR" }, // SMI mensual aproximado
        horas_mensuales_legal: 173.33,
      },
      normative_refs: [
        { ley: "RGPD (UE) 2016/679", desc: "Reglamento General de Protección de Datos" },
        { ley: "LOPDGDD 3/2018",    desc: "Ley Orgánica de Protección de Datos" },
        { ley: "ET (RDL 2/2015)",   desc: "Estatuto de los Trabajadores" },
      ],
      departamentos: [], // pendiente: provincias
      compliance_urls: {},
      legal_text_templates: {
        privacy_notice: "En {{razon_social}} (CIF {{tax_id}}, domicilio {{domicilio}}, email: {{primary_email}}, tel: {{primary_phone}}), tratamos tus datos personales conforme al RGPD y la LOPDGDD. Derechos: acceso, rectificación, supresión, oposición, portabilidad y limitación, vía {{primary_email}}.",
        habeas_data:    "",
        confirmation:   "",
      },
    },
  },
};

// ── Helpers de lectura desde TenantContext ──────────────────────────────

/** Lee la sección `identity` del tenant con fallback. */
export function useTenantIdentity() {
  const t = useTenant();
  const c = (t.tenantConfig || {});
  const fb = FALLBACK_TENANT.identity;
  const v = c.identity || {};
  return {
    displayName: v.display_name || fb.display_name,
    legalName:   v.legal_name   || fb.legal_name,
    tagline:     v.tagline      || fb.tagline,
  };
}

/** URLs del holding. Devuelve también URLs derivadas (portal empleado, cliente, etc.). */
export function useTenantUrls() {
  const t = useTenant();
  const c = (t.tenantConfig || {});
  const fb = FALLBACK_TENANT.urls;
  const v = c.urls || {};
  const app = v.app || fb.app;
  return {
    app,
    publicWebsite: v.public_website || fb.public_website,
    portalEmpleado:    app + "/empleado",
    portalCliente:     app + "/portal",
    formularioPublico: app + "/formulario",
    propuesta:         app + "/propuesta",
    contratacion:      app + "/contratacion",
    psicotecnico:      app + "/psicotecnico",
    firmar:            app + "/firmar",
    aprobar:           app + "/aprobar",
    recuperar:         app + "/recuperar",
  };
}

/** Datos de contacto del holding (emails, teléfonos). */
export function useTenantContact() {
  const t = useTenant();
  const c = (t.tenantConfig || {});
  const fb = FALLBACK_TENANT.contact;
  const v = c.contact || {};
  return {
    primaryEmail: v.primary_email || fb.primary_email,
    noreplyEmail: v.noreply_email || fb.noreply_email,
    legalEmail:   v.legal_email   || fb.legal_email,
    primaryPhone: v.primary_phone || fb.primary_phone,
  };
}

/** Branding del holding (logos, colores, tipografías). */
export function useTenantBranding() {
  const t = useTenant();
  const c = (t.tenantConfig || {});
  const fb = FALLBACK_TENANT.branding;
  const v = c.branding || {};
  return {
    logoWhite:       v.logo_white_url      || fb.logo_white_url,
    logoBlack:       v.logo_black_url      || fb.logo_black_url,
    logoPdfBase64:   v.logo_pdf_base64     || fb.logo_pdf_base64,
    colorPrimary:    v.color_primary       || fb.color_primary,
    colorSecondary:  v.color_secondary     || fb.color_secondary,
    colorAccent:     v.color_accent        || fb.color_accent,
    colorSuccess:    v.color_success       || fb.color_success,
    colorWarning:    v.color_warning       || fb.color_warning,
    colorDanger:     v.color_danger        || fb.color_danger,
    fontPrimary:     v.font_family_primary || fb.font_family_primary,
    fontMono:        v.font_family_mono    || fb.font_family_mono,
  };
}

/** Defaults regionales del holding (país, locale, divisa, zona horaria). */
export function useTenantDefaults() {
  const t = useTenant();
  const c = (t.tenantConfig || {});
  const fb = FALLBACK_TENANT.defaults;
  const v = c.defaults || {};
  return {
    country:  v.country  || c.country_default  || fb.country,
    locale:   v.locale   || c.language_default || fb.locale,
    currency: v.currency || c.currency_default || fb.currency,
    timezone: v.timezone || c.timezone_default || fb.timezone,
  };
}

/** Representante legal por defecto del holding (heredable por empresa). */
export function useTenantLegalRepresentative() {
  const t = useTenant();
  const c = (t.tenantConfig || {});
  const fb = FALLBACK_TENANT.default_legal_representative;
  const v = c.default_legal_representative || {};
  return {
    name:           v.name            || fb.name,
    cargo:          v.cargo           || fb.cargo,
    email:          v.email           || fb.email,
    documentType:   v.document_type   || fb.document_type,
    documentNumber: v.document_number || fb.document_number,
  };
}

/**
 * Datos legales completos de UNA empresa concreta (no del tenant).
 * Si la empresa no define algún campo, hereda del tenant_config.
 *
 * @param {string} companyId  ID de la empresa.
 * @returns {object|null}     null si companyId no se encuentra en t.companies.
 */
export function useCompanyLegalData(companyId) {
  const t = useTenant();
  const tenantRep = useTenantLegalRepresentative();
  const tenantId  = useTenantIdentity();

  const company = (t.companies || []).find(c => c.id === companyId);
  if (!company) return null;

  const rep = company.legal_representative || {};
  return {
    id:          company.id,
    displayName: company.display_name || company.legal_name || tenantId.displayName,
    legalName:   company.legal_name   || tenantId.legalName,
    taxId:       company.tax_id       || "",
    pais:        company.pais         || "CO",
    divisa:      company.divisa       || "COP",
    domicilio:   company.domicilio_legal || {},
    phone:       company.phone        || "",
    legalRepresentative: {
      name:           rep.name           || tenantRep.name,
      cargo:          rep.cargo          || tenantRep.cargo,
      email:          rep.email          || tenantRep.email,
      documentType:   rep.document_type  || tenantRep.documentType,
      documentNumber: rep.document_number|| tenantRep.documentNumber,
    },
  };
}

/** Datos legales de la empresa actualmente activa en el contexto. */
export function useActiveCompanyLegalData() {
  const t = useTenant();
  const id = t.companyActiva && t.companyActiva.id;
  return useCompanyLegalData(id);
}

// ── country_configs (cache en memoria, fetch lazy) ───────────────────────

const _countryCache = {};      // { CO: {...}, ES: {...} }
const _countryPromises = {};   // promesas en vuelo, evita doble fetch

async function _fetchCountryConfig(code) {
  if (_countryCache[code]) return _countryCache[code];
  if (_countryPromises[code]) return _countryPromises[code];

  _countryPromises[code] = (async () => {
    try {
      const { data, error } = await sb
        .from("country_configs")
        .select("*")
        .eq("pais", code)
        .maybeSingle();
      if (error) {
        // Tabla puede no existir todavía (fase de migración)
        // No spammear consola con errores esperados durante la transición.
        const msg = String(error.message || "");
        if (!msg.toLowerCase().includes("does not exist") &&
            !msg.toLowerCase().includes("not found")) {
          console.warn("[configHelpers] country_configs error:", error);
        }
        _countryCache[code] = FALLBACK_COUNTRY_CONFIGS[code] || null;
        return _countryCache[code];
      }
      _countryCache[code] = data || FALLBACK_COUNTRY_CONFIGS[code] || null;
      return _countryCache[code];
    } catch (e) {
      console.warn("[configHelpers] country_configs exception:", e);
      _countryCache[code] = FALLBACK_COUNTRY_CONFIGS[code] || null;
      return _countryCache[code];
    } finally {
      delete _countryPromises[code];
    }
  })();

  return _countryPromises[code];
}

/**
 * Hook reactivo para configuración de país.
 *
 * @param {string} code  Código del país ("CO", "ES", etc.). Si no se pasa, usa el
 *                       default del tenant.
 * @returns {object|null}  Estado: { ready, data, error }. data contiene el shape
 *                         de country_configs (BD usa pais/nombre/divisa_default/
 *                         idioma_default; el helper expone tambien alias EN
 *                         code/name/currency/locale para uso interno).
 */
export function useCountryConfig(code) {
  const defaults = useTenantDefaults();
  const targetCode = code || defaults.country;
  const cached = _countryCache[targetCode] || null;

  const [state, setState] = useState({
    ready: !!cached,
    data: _withAliases(cached),
    error: null,
  });

  useEffect(() => {
    if (!targetCode) return;
    if (_countryCache[targetCode]) {
      setState({ ready: true, data: _withAliases(_countryCache[targetCode]), error: null });
      return;
    }
    let cancelled = false;
    _fetchCountryConfig(targetCode).then(d => {
      if (!cancelled) setState({ ready: true, data: _withAliases(d), error: null });
    }).catch(e => {
      if (!cancelled) setState({ ready: true, data: _withAliases(FALLBACK_COUNTRY_CONFIGS[targetCode] || null), error: e });
    });
    return () => { cancelled = true; };
  }, [targetCode]);

  return state;
}

/**
 * Versión síncrona — devuelve el fallback inmediatamente si no hay cache.
 * Útil para plantillas de PDF que no son async.
 */
export function getCountryConfigSync(code) {
  if (_countryCache[code]) return _withAliases(_countryCache[code]);
  return _withAliases(FALLBACK_COUNTRY_CONFIGS[code] || null);
}

/**
 * Adjunta alias EN a un objeto country_config con nombres ES.
 * No muta, devuelve un nuevo objeto. Acepta null (devuelve null).
 *   pais        → code
 *   nombre      → name
 *   divisa_default → currency
 *   idioma_default → locale_short
 *   default_locale → locale (puede coincidir con el campo BD si existe)
 */
function _withAliases(c) {
  if (!c) return null;
  return {
    ...c,
    code:         c.code || c.pais,
    name:         c.name || c.nombre,
    currency:     c.default_currency || c.divisa_default,
    locale:       c.default_locale || (c.idioma_default && c.pais ? `${c.idioma_default}-${c.pais}` : c.idioma_default),
    locale_short: c.idioma_default || (c.default_locale ? c.default_locale.split('-')[0] : null),
    timezone:     c.default_timezone,
  };
}

// ── Helpers de formato (locale-aware) ────────────────────────────────────

/** Formatea cantidad como divisa según defaults del tenant. */
export function useFormatMoney() {
  const d = useTenantDefaults();
  return useMemo(() => {
    return (amount, opts = {}) => {
      const locale   = opts.locale   || d.locale   || "es-CO";
      const currency = opts.currency || d.currency || "COP";
      try {
        return new Intl.NumberFormat(locale, {
          style: "currency",
          currency,
          maximumFractionDigits: opts.maxDecimals != null ? opts.maxDecimals : 0,
          minimumFractionDigits: opts.minDecimals != null ? opts.minDecimals : 0,
        }).format(Number(amount) || 0);
      } catch (_) {
        return String(amount);
      }
    };
  }, [d.locale, d.currency]);
}

/** Formatea fecha según locale del tenant. */
export function useFormatDate() {
  const d = useTenantDefaults();
  return useMemo(() => {
    return (date, opts = {}) => {
      const locale = opts.locale || d.locale || "es-CO";
      if (!date) return "";
      try {
        return new Date(date).toLocaleDateString(locale, opts);
      } catch (_) {
        return String(date);
      }
    };
  }, [d.locale]);
}

/** Formatea fecha-hora según locale del tenant. */
export function useFormatDateTime() {
  const d = useTenantDefaults();
  return useMemo(() => {
    return (date, opts = {}) => {
      const locale = opts.locale || d.locale || "es-CO";
      if (!date) return "";
      try {
        return new Date(date).toLocaleString(locale, opts);
      } catch (_) {
        return String(date);
      }
    };
  }, [d.locale]);
}

// ── Sustitución de placeholders en plantillas legales ───────────────────

/**
 * Sustituye placeholders {{key}} en una plantilla con valores de un objeto.
 * Soporta claves anidadas con notación de punto: {{contact.primary_email}}.
 *
 * @param {string} template  Plantilla con placeholders {{...}}.
 * @param {object} data      Objeto con los valores. Las claves se buscan en
 *                           profundidad si tienen punto.
 * @returns {string}
 */
export function renderTemplate(template, data) {
  if (!template) return "";
  return template.replace(/\{\{([a-z_][a-z0-9_.]*)\}\}/gi, (m, path) => {
    const parts = path.split(".");
    let v = data;
    for (const p of parts) {
      if (v == null) return "";
      v = v[p];
    }
    return v == null ? "" : String(v);
  });
}

/**
 * Renderiza un texto legal del país (privacy_notice, habeas_data, confirmation)
 * sustituyendo placeholders con datos del tenant + empresa.
 *
 * @param {string} key       "privacy_notice" | "habeas_data" | "confirmation"
 * @param {string} countryCode  "CO" | "ES" | ...
 * @param {object} extraData    Datos adicionales para sustituir (ej: {tax_id, domicilio}).
 * @returns {string}            Texto con placeholders sustituidos.
 */
export function useLegalText(key, countryCode, extraData = {}) {
  const country = useCountryConfig(countryCode);
  const identity = useTenantIdentity();
  const contact  = useTenantContact();

  const template = country.data?.config?.legal_text_templates?.[key] || "";
  const data = {
    razon_social:  identity.legalName,
    primary_email: contact.primaryEmail,
    primary_phone: contact.primaryPhone,
    ...extraData,
  };
  return renderTemplate(template, data);
}

// ── Export agrupado (para imports concisos) ─────────────────────────────

export const FALLBACKS = {
  TENANT: FALLBACK_TENANT,
  COUNTRY_CONFIGS: FALLBACK_COUNTRY_CONFIGS,
};
