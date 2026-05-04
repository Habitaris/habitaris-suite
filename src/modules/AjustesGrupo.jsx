/**
 * modules/AjustesGrupo.jsx — Espacio de configuración del Grupo (holding)
 *
 * Vive bajo /grupo/ajustes y se accede desde el botón ⚙ Configuración de la
 * GrupoBar. Aquí se gestionan los ajustes que cuelgan del holding y que pueden
 * heredarse hacia países y empresas.
 *
 * Sprint C Capa 2 (2 mayo 2026):
 *   Pasamos de 1 tab funcional (grupo) + placeholders → 4 tabs reales.
 *   Toda la edición se persiste en `tenant_config.config` con la estructura
 *   nueva que consumen los helpers de src/core/configHelpers.js.
 *
 *   Estructura escrita en tenant_config.config:
 *     identity                      → display_name, legal_name, tagline
 *     urls                          → app, public_website
 *     contact                       → primary_email, noreply_email, legal_email, primary_phone
 *     branding                      → logo_white_url, logo_black_url, color_primary..., font_family_*
 *     defaults                      → country, locale, currency, timezone
 *     default_legal_representative  → name, cargo, email, document_type, document_number
 *
 *   Tabs:
 *     Identidad         → identity + defaults (regional)
 *     Contacto          → contact + urls
 *     Branding          → branding (logos, colores, tipografías)
 *     Rep. legal        → default_legal_representative
 *     Estructura legal  → países y empresas (lectura por ahora)
 *     Comunicaciones    → SMTP (próximamente)
 *     Miembros          → usuarios (próximamente)
 */
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { sb } from "../core/supabase.js";
import { useTenant } from "../core/TenantContext.jsx";

const C = {
  bg: "#F0EEE9",
  card: "#FFFFFF",
  ink: "#111",
  inkMid: "#555",
  inkLight: "#999",
  border: "#E4E1DB",
  bgSoft: "#FAFAF8",
  accent: "#111",
  accentBg: "#EBEBEB",
  success: "#2D6A2E",
  danger: "#B91C1C",
};
const F = { fontFamily: "'DM Sans', sans-serif" };

const TABS = [
  { id: "identidad", label: "Identidad",        desc: "Nombre, razón, defaults" },
  { id: "contacto",  label: "Contacto",         desc: "Emails, teléfono, URLs" },
  { id: "branding",  label: "Branding",         desc: "Logos, colores, tipografía" },
  { id: "rep_legal", label: "Rep. legal",       desc: "Firmante por defecto" },
  { id: "legal",     label: "Estructura legal", desc: "Países y empresas" },
  { id: "comms",     label: "Comunicaciones",   desc: "SMTP y plantillas" },
  { id: "miembros",  label: "Miembros",         desc: "Usuarios y permisos" },
];

const LOCALES = [
  { code: "es-CO", label: "Español (Colombia)" },
  { code: "es-ES", label: "Español (España)" },
  { code: "es-MX", label: "Español (México)" },
  { code: "es-AR", label: "Español (Argentina)" },
  { code: "es-CL", label: "Español (Chile)" },
  { code: "es-PE", label: "Español (Perú)" },
  { code: "en-US", label: "English (US)" },
  { code: "pt-BR", label: "Português (Brasil)" },
];

const DIVISAS = [
  { code: "COP", label: "Peso colombiano (COP)" },
  { code: "EUR", label: "Euro (EUR)" },
  { code: "USD", label: "Dólar estadounidense (USD)" },
  { code: "MXN", label: "Peso mexicano (MXN)" },
  { code: "ARS", label: "Peso argentino (ARS)" },
  { code: "PEN", label: "Sol peruano (PEN)" },
  { code: "CLP", label: "Peso chileno (CLP)" },
  { code: "BRL", label: "Real brasileño (BRL)" },
];

const PAISES = [
  { code: "CO", label: "Colombia" },
  { code: "ES", label: "España" },
  { code: "MX", label: "México" },
  { code: "AR", label: "Argentina" },
  { code: "PE", label: "Perú" },
  { code: "CL", label: "Chile" },
  { code: "BR", label: "Brasil" },
  { code: "US", label: "Estados Unidos" },
];

const TIMEZONES = [
  "America/Bogota", "America/Mexico_City", "America/Buenos_Aires",
  "America/Lima", "America/Santiago", "America/Sao_Paulo",
  "America/New_York", "America/Los_Angeles",
  "Europe/Madrid", "Europe/London",
];

const FONTS = ["DM Sans", "Inter", "Roboto", "Helvetica", "Arial", "Georgia", "Times New Roman"];

const DOC_TYPES = [
  { code: "CC",  label: "Cédula de Ciudadanía (CC)" },
  { code: "CE",  label: "Cédula de Extranjería (CE)" },
  { code: "DNI", label: "DNI (España)" },
  { code: "NIE", label: "NIE (España)" },
  { code: "Pas", label: "Pasaporte" },
  { code: "RFC", label: "RFC (México)" },
];

// ─── Helpers de país (label) ─────────────────────────────────────────────
function paisName(code) {
  const p = PAISES.find(x => x.code === code);
  return p ? p.label : (code || "—");
}

// ─── Componentes UI compartidos ───────────────────────────────────────────
function Btn({ children, onClick, disabled, tone = "ghost" }) {
  const styles = {
    primary: { background: C.ink, color: "#fff", border: `1px solid ${C.ink}` },
    ghost:   { background: "transparent", color: C.ink, border: `1px solid ${C.border}` },
  };
  const st = styles[tone] || styles.ghost;
  return (
    <button onClick={onClick} disabled={disabled}
      style={{
        ...F, ...st, padding: "9px 18px", borderRadius: 6,
        fontSize: 13, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}>{children}</button>
  );
}

function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ ...F, display: "block", fontSize: 12, fontWeight: 600, color: C.ink, marginBottom: 6, letterSpacing: 0.2 }}>
        {label}
      </label>
      {children}
      {hint && <div style={{ ...F, fontSize: 11, color: C.inkLight, marginTop: 5 }}>{hint}</div>}
    </div>
  );
}

const inputStyle = {
  ...F, fontSize: 13, padding: "9px 12px", borderRadius: 6,
  border: `1px solid ${C.border}`, background: "#fff", color: C.ink,
  width: "100%", boxSizing: "border-box", outline: "none",
};

// ─── Upload de logo a bucket 'branding' de Supabase Storage ───────────────
function LogoUploadField({ label, hint, value, onChange, slot }) {
  // slot: "white" | "black" | "pdf" — determina el path en el bucket
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const onPickFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      // Path: tenant_id/slot-timestamp.ext  →  habitaris/white-1746...jpg
      const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
      const ts = Date.now();
      const path = `habitaris/${slot || "logo"}-${ts}.${ext}`;
      const { error: upErr } = await sb.storage
        .from("branding")
        .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
      if (upErr) throw upErr;
      const { data } = sb.storage.from("branding").getPublicUrl(path);
      const publicUrl = data && data.publicUrl;
      if (!publicUrl) throw new Error("No se pudo obtener URL pública");
      onChange(publicUrl);
    } catch (err) {
      console.error("[LogoUpload] error:", err);
      setUploadError(err.message || "Error subiendo");
    } finally {
      setUploading(false);
      e.target.value = ""; // reset para permitir resubir el mismo archivo
    }
  };

  const inputId = `logo-upload-${slot || "x"}`;

  return (
    <Field label={label} hint={hint}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        {/* Preview */}
        <div style={{
          width: 88, height: 56, border: `1px solid ${C.border}`, borderRadius: 6,
          background: slot === "white" ? "#111" : "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, overflow: "hidden",
        }}>
          {value ? (
            <img src={value} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
              onError={e => { e.currentTarget.style.display = "none"; }}/>
          ) : (
            <span style={{ ...F, fontSize: 9, color: C.inkLight }}>sin logo</span>
          )}
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
          <input style={inputStyle} value={value || ""} onChange={e => onChange(e.target.value)} placeholder="URL o sube archivo →" />
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input id={inputId} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif"
              onChange={onPickFile} style={{ display: "none" }} />
            <label htmlFor={inputId} style={{
              ...F, fontSize: 11, fontWeight: 600, padding: "5px 10px",
              border: `1px solid ${C.border}`, borderRadius: 5, background: "#fff",
              cursor: uploading ? "wait" : "pointer", color: C.ink,
            }}>{uploading ? "Subiendo…" : "📤 Subir archivo"}</label>
            {value && (
              <button onClick={() => onChange("")}
                style={{ ...F, fontSize: 11, padding: "5px 10px", border: `1px solid ${C.border}`,
                  borderRadius: 5, background: "#fff", cursor: "pointer", color: C.inkMid }}>
                Quitar
              </button>
            )}
            {uploadError && <span style={{ ...F, fontSize: 11, color: C.danger }}>⚠ {uploadError}</span>}
          </div>
        </div>
      </div>
    </Field>
  );
}

function ColorField({ label, hint, value, onChange }) {
  return (
    <Field label={label} hint={hint}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          type="color"
          value={value || "#111111"}
          onChange={e => onChange(e.target.value)}
          style={{ width: 44, height: 36, padding: 0, border: `1px solid ${C.border}`, borderRadius: 6, cursor: "pointer", background: "#fff" }}
        />
        <input
          style={{ ...inputStyle, fontFamily: "monospace", textTransform: "uppercase" }}
          value={value || ""}
          placeholder="#111111"
          onChange={e => onChange(e.target.value)}
        />
      </div>
    </Field>
  );
}

function SaveBar({ saving, savedAt, error, onSave }) {
  return (
    <div style={{ marginTop: 22, display: "flex", alignItems: "center", gap: 14, paddingTop: 18, borderTop: `1px solid ${C.border}` }}>
      <Btn tone="primary" onClick={onSave} disabled={saving}>
        {saving ? "Guardando…" : "Guardar cambios"}
      </Btn>
      {savedAt && !saving && (
        <span style={{ ...F, fontSize: 12, color: C.success, fontWeight: 600 }}>
          ✓ Guardado a las {savedAt.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
        </span>
      )}
      {error && (
        <span style={{ ...F, fontSize: 12, color: C.danger }}>{error}</span>
      )}
    </div>
  );
}

// ─── Hook: lógica de save de un sub-objeto de tenant_config.config ─────
function useSaveConfigSection({ tenant, tenantConfig, onSaved, sectionKey }) {
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [error, setError] = useState(null);

  const save = useCallback(async (sectionData, extraTenantUpdate = null) => {
    setSaving(true);
    setError(null);
    try {
      // Si extraTenantUpdate viene (caso identidad → tenants.display_name/legal_name), aplicarlo
      if (extraTenantUpdate && Object.keys(extraTenantUpdate).length > 0) {
        const { error: e1 } = await sb.from("tenants").update(extraTenantUpdate).eq("id", tenant.id);
        if (e1) throw e1;
      }

      // Construir nuevo config preservando otras secciones
      const baseConfig = tenantConfig || {};
      const newConfig = sectionKey
        ? { ...baseConfig, [sectionKey]: { ...(baseConfig[sectionKey] || {}), ...sectionData } }
        : { ...baseConfig, ...sectionData };

      const { error: e2 } = await sb.from("tenant_config")
        .upsert({ tenant_id: tenant.id, config: newConfig }, { onConflict: "tenant_id" });
      if (e2) throw e2;

      setSavedAt(new Date());
      if (onSaved) onSaved();
      if (typeof window !== "undefined" && window.toast) {
        window.toast("Cambios guardados", "success");
      }
    } catch (e) {
      console.error("[AjustesGrupo] error guardando:", e);
      setError(e.message || "No se pudieron guardar los cambios");
    } finally {
      setSaving(false);
    }
  }, [tenant, tenantConfig, onSaved, sectionKey]);

  return { saving, savedAt, error, save };
}

// ─── Tab 1: Identidad (identity + defaults regionales) ──────────────────
function TabIdentidad({ tenant, tenantConfig, onSaved }) {
  const cfg = tenantConfig || {};
  const id = cfg.identity || {};
  const def = cfg.defaults || {};

  const [form, setForm] = useState({
    display_name: id.display_name || tenant?.display_name || "",
    legal_name:   id.legal_name   || tenant?.legal_name   || "",
    tagline:      id.tagline      || "",
    country:      def.country     || cfg.country_default  || "CO",
    locale:       def.locale      || cfg.language_default || "es-CO",
    currency:     def.currency    || cfg.currency_default || "COP",
    timezone:     def.timezone    || cfg.timezone_default || "America/Bogota",
  });
  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Guarda dos secciones en tenant_config.config: identity y defaults.
  // Y también actualiza tenants.display_name / legal_name para retrocompatibilidad.
  const { saving, savedAt, error, save } = useSaveConfigSection({ tenant, tenantConfig, onSaved });

  const onSave = async () => {
    const sectionData = {
      identity: {
        display_name: form.display_name.trim(),
        legal_name:   form.legal_name.trim() || null,
        tagline:      form.tagline.trim() || null,
      },
      defaults: {
        country:  form.country,
        locale:   form.locale,
        currency: form.currency,
        timezone: form.timezone,
      },
      // Mantener compat con keys planas (TenantContext lee algunas)
      country_default:  form.country,
      currency_default: form.currency,
      language_default: form.locale,
      timezone_default: form.timezone,
    };
    await save(sectionData, {
      display_name: form.display_name.trim(),
      legal_name: form.legal_name.trim() || null,
    });
  };

  return (
    <div style={{ maxWidth: 640 }}>
      <p style={{ ...F, fontSize: 12, color: C.inkMid, margin: "0 0 22px", lineHeight: 1.5 }}>
        Datos de identidad del grupo y defaults regionales. Estos valores aparecen
        como nombre del producto, en cabeceras de plantillas y como defaults cuando
        creas un nuevo país o una nueva empresa.
      </p>

      <h3 style={{ ...F, fontSize: 13, fontWeight: 700, color: C.ink, margin: "0 0 14px", textTransform: "uppercase", letterSpacing: 0.5 }}>Identidad</h3>

      <Field label="Nombre del grupo" hint="Nombre con el que aparece el holding en la suite (cabecera, footer, emails)">
        <input style={inputStyle} value={form.display_name} onChange={e => update("display_name", e.target.value)} placeholder="Habitaris" />
      </Field>

      <Field label="Razón social" hint="Nombre legal completo del grupo (ej: Habitaris S.A.S.)">
        <input style={inputStyle} value={form.legal_name} onChange={e => update("legal_name", e.target.value)} placeholder="Habitaris S.A.S." />
      </Field>

      <Field label="Tagline / Eslogan" hint="Frase corta que aparece bajo el nombre del grupo (opcional)">
        <input style={inputStyle} value={form.tagline} onChange={e => update("tagline", e.target.value)} placeholder="Diseño · Interiorismo · Arquitectura" />
      </Field>

      <h3 style={{ ...F, fontSize: 13, fontWeight: 700, color: C.ink, margin: "26px 0 14px", textTransform: "uppercase", letterSpacing: 0.5 }}>Defaults regionales</h3>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Field label="País por defecto">
          <select style={inputStyle} value={form.country} onChange={e => update("country", e.target.value)}>
            {PAISES.map(p => <option key={p.code} value={p.code}>{p.label} ({p.code})</option>)}
          </select>
        </Field>

        <Field label="Divisa por defecto">
          <select style={inputStyle} value={form.currency} onChange={e => update("currency", e.target.value)}>
            {DIVISAS.map(d => <option key={d.code} value={d.code}>{d.label}</option>)}
          </select>
        </Field>

        <Field label="Locale (idioma + región)" hint="Determina formato de fechas y números">
          <select style={inputStyle} value={form.locale} onChange={e => update("locale", e.target.value)}>
            {LOCALES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
        </Field>

        <Field label="Zona horaria por defecto">
          <select style={inputStyle} value={form.timezone} onChange={e => update("timezone", e.target.value)}>
            {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
          </select>
        </Field>
      </div>

      <SaveBar saving={saving} savedAt={savedAt} error={error} onSave={onSave} />
    </div>
  );
}

// ─── Tab 2: Contacto (contact + urls) ──────────────────────────────────
function TabContacto({ tenant, tenantConfig, onSaved }) {
  const cfg = tenantConfig || {};
  const contact = cfg.contact || {};
  const urls = cfg.urls || {};

  const [form, setForm] = useState({
    primary_email: contact.primary_email || "",
    noreply_email: contact.noreply_email || "",
    legal_email:   contact.legal_email   || "",
    primary_phone: contact.primary_phone || "",
    app:            urls.app             || "https://suite.habitaris.es",
    public_website: urls.public_website  || "https://www.habitaris.es",
  });
  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const { saving, savedAt, error, save } = useSaveConfigSection({ tenant, tenantConfig, onSaved });

  const onSave = async () => {
    const sectionData = {
      contact: {
        primary_email: form.primary_email.trim(),
        noreply_email: form.noreply_email.trim(),
        legal_email:   form.legal_email.trim(),
        primary_phone: form.primary_phone.trim(),
      },
      urls: {
        app:            form.app.trim().replace(/\/$/, ""),
        public_website: form.public_website.trim().replace(/\/$/, ""),
      },
    };
    await save(sectionData);
  };

  return (
    <div style={{ maxWidth: 640 }}>
      <p style={{ ...F, fontSize: 12, color: C.inkMid, margin: "0 0 22px", lineHeight: 1.5 }}>
        Datos de contacto del holding. Los emails se usan como remitentes de
        correos automáticos y como direcciones de respuesta. Las URLs determinan
        a dónde apuntan los enlaces de portales (empleado, cliente, formularios)
        y los correos enviados.
      </p>

      <h3 style={{ ...F, fontSize: 13, fontWeight: 700, color: C.ink, margin: "0 0 14px", textTransform: "uppercase", letterSpacing: 0.5 }}>Emails</h3>

      <Field label="Email principal" hint="Remitente por defecto. Se ve en respuestas de clientes y candidatos.">
        <input style={inputStyle} type="email" value={form.primary_email} onChange={e => update("primary_email", e.target.value)} placeholder="comercial@habitaris.es" />
      </Field>

      <Field label="Email de envío automático (noreply)" hint="Se usa como `From` en correos automáticos del sistema (notificaciones, recordatorios).">
        <input style={inputStyle} type="email" value={form.noreply_email} onChange={e => update("noreply_email", e.target.value)} placeholder="noreply@habitaris.es" />
      </Field>

      <Field label="Email legal / habeas data" hint="Se usa en avisos de privacidad y en la cabecera de derechos ARCO.">
        <input style={inputStyle} type="email" value={form.legal_email} onChange={e => update("legal_email", e.target.value)} placeholder="legal@habitaris.es" />
      </Field>

      <Field label="Teléfono principal" hint="Aparece en plantillas, firmas de email y avisos de privacidad.">
        <input style={inputStyle} value={form.primary_phone} onChange={e => update("primary_phone", e.target.value)} placeholder="+57 350 566 1545" />
      </Field>

      <h3 style={{ ...F, fontSize: 13, fontWeight: 700, color: C.ink, margin: "26px 0 14px", textTransform: "uppercase", letterSpacing: 0.5 }}>URLs</h3>

      <Field label="URL de la suite (app)" hint="Dominio donde vive la suite. Se usa para construir los links que se envían (portal empleado, cliente, formularios).">
        <input style={inputStyle} value={form.app} onChange={e => update("app", e.target.value)} placeholder="https://suite.habitaris.es" />
      </Field>

      <Field label="Sitio web público" hint="Web institucional del grupo. Aparece en firmas y avisos de privacidad.">
        <input style={inputStyle} value={form.public_website} onChange={e => update("public_website", e.target.value)} placeholder="https://www.habitaris.es" />
      </Field>

      <SaveBar saving={saving} savedAt={savedAt} error={error} onSave={onSave} />
    </div>
  );
}

// ─── Tab 3: Branding (logos + colores + tipografía) ────────────────────
function TabBranding({ tenant, tenantConfig, onSaved }) {
  const cfg = tenantConfig || {};
  const b = cfg.branding || {};

  const [form, setForm] = useState({
    logo_white_url: b.logo_white_url || "/logo-habitaris-blanco.jpg",
    logo_black_url: b.logo_black_url || "/logo-habitaris-negro.svg",
    color_primary:   b.color_primary   || "#111111",
    color_secondary: b.color_secondary || "#3B3B3B",
    color_accent:    b.color_accent    || "#1E6B42",
    color_success:   b.color_success   || "#10B981",
    color_warning:   b.color_warning   || "#D97706",
    color_danger:    b.color_danger    || "#B91C1C",
    font_family_primary: b.font_family_primary || "DM Sans",
    font_family_mono:    b.font_family_mono    || "DM Mono",
  });
  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const { saving, savedAt, error, save } = useSaveConfigSection({ tenant, tenantConfig, onSaved, sectionKey: "branding" });

  const onSave = async () => {
    await save(form);
  };

  // Preview helper
  const Preview = (
    <div style={{ background: form.color_primary, color: "#fff", padding: 16, borderRadius: 8, marginBottom: 18, fontFamily: `'${form.font_family_primary}', sans-serif` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <img src={form.logo_white_url} alt="Logo" style={{ height: 24, objectFit: "contain" }} onError={e => { e.currentTarget.style.display = "none"; }} />
        <div style={{ fontSize: 14, fontWeight: 600 }}>{tenant?.display_name || "Grupo"}</div>
      </div>
      <div style={{ fontSize: 11, opacity: 0.85, marginTop: 6 }}>Vista previa de cabecera (color primario + logo blanco + tipografía)</div>
      <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
        <span style={{ background: form.color_accent, color: "#fff", padding: "3px 10px", borderRadius: 999, fontSize: 11 }}>Accent</span>
        <span style={{ background: form.color_success, color: "#fff", padding: "3px 10px", borderRadius: 999, fontSize: 11 }}>Success</span>
        <span style={{ background: form.color_warning, color: "#fff", padding: "3px 10px", borderRadius: 999, fontSize: 11 }}>Warning</span>
        <span style={{ background: form.color_danger,  color: "#fff", padding: "3px 10px", borderRadius: 999, fontSize: 11 }}>Danger</span>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 640 }}>
      <p style={{ ...F, fontSize: 12, color: C.inkMid, margin: "0 0 22px", lineHeight: 1.5 }}>
        Marca corporativa del grupo: logos, colores y tipografía. Estos valores
        se aplican automáticamente en cabeceras de la suite, en correos enviados,
        y en plantillas de PDF a medida que cada módulo va migrando a leer
        desde aquí.
      </p>

      {Preview}

      <h3 style={{ ...F, fontSize: 13, fontWeight: 700, color: C.ink, margin: "0 0 14px", textTransform: "uppercase", letterSpacing: 0.5 }}>Logos</h3>

      <LogoUploadField
        slot="white"
        label="Logo blanco (sobre fondo oscuro)"
        hint="Para cabecera de la suite y footer de emails. Sube un archivo o pega una URL."
        value={form.logo_white_url}
        onChange={v => update("logo_white_url", v)}
      />

      <LogoUploadField
        slot="black"
        label="Logo negro (sobre fondo claro)"
        hint="Para PDFs, certificados y cabeceras claras."
        value={form.logo_black_url}
        onChange={v => update("logo_black_url", v)}
      />

      <h3 style={{ ...F, fontSize: 13, fontWeight: 700, color: C.ink, margin: "26px 0 14px", textTransform: "uppercase", letterSpacing: 0.5 }}>Colores</h3>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <ColorField label="Primario"   hint="Color base de la marca" value={form.color_primary}   onChange={v => update("color_primary", v)} />
        <ColorField label="Secundario" hint="Apoyo del primario"     value={form.color_secondary} onChange={v => update("color_secondary", v)} />
        <ColorField label="Accent"     hint="Color de acción/realce" value={form.color_accent}    onChange={v => update("color_accent", v)} />
        <ColorField label="Success"    hint="Verde de confirmación"  value={form.color_success}   onChange={v => update("color_success", v)} />
        <ColorField label="Warning"    hint="Amarillo de aviso"      value={form.color_warning}   onChange={v => update("color_warning", v)} />
        <ColorField label="Danger"     hint="Rojo de error/peligro"  value={form.color_danger}    onChange={v => update("color_danger", v)} />
      </div>

      <h3 style={{ ...F, fontSize: 13, fontWeight: 700, color: C.ink, margin: "26px 0 14px", textTransform: "uppercase", letterSpacing: 0.5 }}>Tipografía</h3>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Field label="Tipografía principal">
          <select style={inputStyle} value={form.font_family_primary} onChange={e => update("font_family_primary", e.target.value)}>
            {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </Field>
        <Field label="Tipografía mono">
          <input style={inputStyle} value={form.font_family_mono} onChange={e => update("font_family_mono", e.target.value)} placeholder="DM Mono" />
        </Field>
      </div>

      <SaveBar saving={saving} savedAt={savedAt} error={error} onSave={onSave} />
    </div>
  );
}

// ─── Tab 4: Representante legal por defecto ────────────────────────────
function TabRepresentanteLegal({ tenant, tenantConfig, onSaved }) {
  const cfg = tenantConfig || {};
  const r = cfg.default_legal_representative || {};

  const [form, setForm] = useState({
    name:            r.name            || "",
    cargo:           r.cargo           || "",
    email:           r.email           || "",
    document_type:   r.document_type   || "CC",
    document_number: r.document_number || "",
  });
  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const { saving, savedAt, error, save } = useSaveConfigSection({
    tenant, tenantConfig, onSaved, sectionKey: "default_legal_representative"
  });

  const onSave = async () => {
    await save({
      name:            form.name.trim(),
      cargo:           form.cargo.trim(),
      email:           form.email.trim(),
      document_type:   form.document_type,
      document_number: form.document_number.trim(),
    });
  };

  return (
    <div style={{ maxWidth: 640 }}>
      <p style={{ ...F, fontSize: 12, color: C.inkMid, margin: "0 0 22px", lineHeight: 1.5 }}>
        Persona que firma por defecto en nombre del grupo en contratos, certificaciones
        laborales, paz y salvos y demás documentos legales. Cualquier empresa
        del grupo puede sobrescribir este firmante con uno propio.
      </p>

      <Field label="Nombre completo" hint="Tal cual aparece en documentos firmados">
        <input style={inputStyle} value={form.name} onChange={e => update("name", e.target.value)} placeholder="Ana María Díaz Buitrago" />
      </Field>

      <Field label="Cargo" hint="Aparece bajo la firma">
        <input style={inputStyle} value={form.cargo} onChange={e => update("cargo", e.target.value)} placeholder="Directora Creativa y Diseño" />
      </Field>

      <Field label="Email">
        <input style={inputStyle} type="email" value={form.email} onChange={e => update("email", e.target.value)} placeholder="amdiaz@habitaris.es" />
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 14 }}>
        <Field label="Tipo de documento">
          <select style={inputStyle} value={form.document_type} onChange={e => update("document_type", e.target.value)}>
            {DOC_TYPES.map(d => <option key={d.code} value={d.code}>{d.label}</option>)}
          </select>
        </Field>

        <Field label="Número de documento">
          <input style={inputStyle} value={form.document_number} onChange={e => update("document_number", e.target.value)} placeholder="1.109.293.384" />
        </Field>
      </div>

      <SaveBar saving={saving} savedAt={savedAt} error={error} onSave={onSave} />
    </div>
  );
}

// ─── Tab 5: Estructura legal (lectura por ahora) ───────────────────────
// ─── Tab 5: Estructura legal (CRUD países y empresas) ────────────────────
function TabLegal({ companies: initialCompanies }) {
  const t = useTenant();
  const tenantId = (t.tenant && t.tenant.id) || "habitaris";
  const [companies, setCompanies] = useState(initialCompanies || []);
  const [countryConfigs, setCountryConfigs] = useState([]);
  const [editing, setEditing] = useState(null);
  const [addingCountry, setAddingCountry] = useState(false);

  useEffect(() => {
    sb.from("country_configs")
      .select("pais, nombre, flag_emoji, divisa_default, idioma_default, default_locale, default_timezone, phone_code")
      .order("pais")
      .then(({ data }) => { if (data) setCountryConfigs(data); });
  }, []);

  const reload = async () => {
    const { data } = await sb.from("companies")
      .select("*")
      .eq("tenant_id", tenantId)
      .neq("status", "archived")
      .order("pais")
      .order("legal_name");
    if (data) setCompanies(data);
  };

  const byCountry = useMemo(() => {
    const m = {};
    (companies || []).forEach(c => {
      if (c.status === "archived") return;
      if (!m[c.pais]) m[c.pais] = [];
      m[c.pais].push(c);
    });
    return m;
  }, [companies]);

  const activePaises = Object.keys(byCountry);
  const availableCountries = countryConfigs.filter(cc => !activePaises.includes(cc.pais));

  return (
    <>
      <p style={{ ...F, fontSize: 13, color: C.inkMid, margin: "0 0 16px" }}>
        Países donde opera el grupo y empresas registradas en cada uno. Edita los datos legales (NIT/CIF, domicilio, representante legal) que se usarán en certificaciones, contratos y plantillas.
      </p>

      {activePaises.map(pais => {
        const cc = countryConfigs.find(c => c.pais === pais) || { nombre: pais, flag_emoji: "🌍" };
        const empresas = byCountry[pais];
        return (
          <div key={pais} style={{ marginBottom: 24, border: `1px solid ${C.border}`, borderRadius: 8, background: "#fff" }}>
            <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h4 style={{ ...F, fontSize: 15, fontWeight: 700, color: C.ink, margin: 0 }}>
                  {cc.flag_emoji || "🌍"} {cc.nombre || pais}
                </h4>
                <span style={{ ...F, fontSize: 11, color: C.inkLight }}>
                  {empresas.length} empresa{empresas.length !== 1 ? "s" : ""}
                </span>
              </div>
              <button
                onClick={() => setEditing({ company: null, isNew: true, paisCode: pais, paisConfig: cc })}
                style={{ ...F, fontSize: 12, fontWeight: 600, padding: "6px 12px", border: `1px solid ${C.border}`, borderRadius: 6, background: "#fff", cursor: "pointer", color: C.ink }}>
                + Añadir empresa
              </button>
            </div>
            <div style={{ padding: "8px 0" }}>
              {empresas.map(emp => <CompanyRow key={emp.id} company={emp} onEdit={() => setEditing({ company: emp, isNew: false, paisCode: emp.pais, paisConfig: cc })} onArchive={async () => {
                if (!window.confirm(`¿Archivar la empresa "${emp.legal_name || emp.display_name}"? No se elimina, queda como archivada.`)) return;
                const { error } = await sb.from("companies").update({ status: "archived" }).eq("id", emp.id);
                if (error) { window.toast("Error: " + error.message, "error"); return; }
                window.toast("Empresa archivada", "success");
                await reload();
              }} />)}
            </div>
          </div>
        );
      })}

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button onClick={() => setAddingCountry(true)} style={{ ...F, fontSize: 13, fontWeight: 600, padding: "8px 14px", border: `1px solid ${C.ink}`, borderRadius: 6, background: C.ink, color: "#fff", cursor: "pointer" }}>
          + Abrir nuevo país
        </button>
      </div>

      {addingCountry && (
        <ModalAddCountry
          available={availableCountries}
          onSelect={(cc) => { setAddingCountry(false); setEditing({ company: null, isNew: true, paisCode: cc.pais, paisConfig: cc }); }}
          onClose={() => setAddingCountry(false)}
        />
      )}

      {editing && (
        <ModalEditCompany
          existing={editing.company}
          isNew={editing.isNew}
          paisCode={editing.paisCode}
          paisConfig={editing.paisConfig}
          tenantId={tenantId}
          onSaved={async () => { setEditing(null); await reload(); }}
          onCancel={() => setEditing(null)}
        />
      )}
    </>
  );
}

// Tarjeta de una empresa con datos clave + acciones
function CompanyRow({ company, onEdit, onArchive }) {
  const dom = company.domicilio_legal || {};
  const rep = company.legal_representative || {};
  return (
    <div style={{ padding: "12px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${C.bg}` }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...F, fontSize: 14, fontWeight: 600, color: C.ink }}>{company.display_name || company.legal_name}</div>
        <div style={{ ...F, fontSize: 11, color: C.inkLight, display: "flex", gap: 12, flexWrap: "wrap", marginTop: 2 }}>
          <span>{company.legal_name}</span>
          {company.tax_id && <span>· {company.tax_id_type || "NIT"} {company.tax_id}</span>}
          {dom.ciudad && <span>· {dom.ciudad}</span>}
          {rep.name && <span>· Rep: {rep.name}</span>}
          <span>· {company.divisa || "—"}</span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={onEdit} style={{ ...F, fontSize: 11, padding: "5px 10px", border: `1px solid ${C.border}`, borderRadius: 5, background: "#fff", cursor: "pointer", color: C.ink }}>Editar</button>
        <button onClick={onArchive} style={{ ...F, fontSize: 11, padding: "5px 10px", border: `1px solid ${C.border}`, borderRadius: 5, background: "#fff", cursor: "pointer", color: C.danger }}>Archivar</button>
      </div>
    </div>
  );
}

// Modal para seleccionar nuevo país a abrir
// Modal para seleccionar nuevo país a abrir
function ModalAddCountry({ available, onSelect, onClose }) {
  const [mode, setMode] = useState("pick"); // "pick" | "custom"
  const [form, setForm] = useState({
    pais: "", nombre: "", flag_emoji: "", phone_code: "+",
    divisa_default: "USD", idioma_default: "es",
    default_locale: "", default_timezone: "",
  });
  const [saving, setSaving] = useState(false);
  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const onCreateCustom = async () => {
    const code = (form.pais || "").trim().toUpperCase();
    const nombre = (form.nombre || "").trim();
    if (!/^[A-Z]{2,3}$/.test(code)) { window.toast("El código del país debe ser 2 o 3 letras (ej: MX, USA)", "error"); return; }
    if (!nombre) { window.toast("El nombre del país es obligatorio", "error"); return; }
    setSaving(true);
    const payload = {
      pais: code,
      nombre,
      flag_emoji: form.flag_emoji || "🌍",
      phone_code: form.phone_code || "+",
      divisa_default: (form.divisa_default || "USD").toUpperCase(),
      idioma_default: form.idioma_default || "es",
      default_locale: form.default_locale || (form.idioma_default + "-" + code),
      default_timezone: form.default_timezone || "UTC",
      config: {},
    };
    const { error, data } = await sb.from("country_configs").insert(payload).select().single();
    setSaving(false);
    if (error) {
      if (error.code === "23505") { window.toast("Ese código de país ya existe", "error"); }
      else { window.toast("Error: " + error.message, "error"); }
      return;
    }
    window.toast("País creado: " + nombre, "success");
    onSelect(data);
  };

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={{ ...modalContentStyle, maxHeight: "85vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <h3 style={{ ...F, fontSize: 16, fontWeight: 700, margin: "0 0 12px", color: C.ink }}>
          {mode === "pick" ? "Abrir nuevo país" : "Crear país personalizado"}
        </h3>

        {mode === "pick" && (
          <>
            <p style={{ ...F, fontSize: 12, color: C.inkMid, margin: "0 0 16px" }}>
              Selecciona el país. Se abrirá el formulario para registrar la primera empresa de ese país. Si no encuentras el tuyo, créalo personalizado.
            </p>
            {available.length === 0 ? (
              <p style={{ ...F, fontSize: 13, color: C.inkLight, fontStyle: "italic" }}>
                Ya has abierto todos los países del catálogo. Puedes crear uno personalizado.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                {available.map(cc => (
                  <button key={cc.pais} onClick={() => onSelect(cc)}
                    style={{ ...F, fontSize: 13, padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: 6, background: "#fff", cursor: "pointer", color: C.ink, textAlign: "left", display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 18 }}>{cc.flag_emoji || "🌍"}</span>
                    <span style={{ flex: 1 }}>{cc.nombre}</span>
                    <span style={{ ...F, fontSize: 11, color: C.inkLight }}>{cc.divisa_default} · {cc.default_locale || cc.idioma_default}</span>
                  </button>
                ))}
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 16, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
              <button onClick={() => setMode("custom")} style={{ ...F, fontSize: 12, fontWeight: 600, padding: "8px 14px", border: `1px solid ${C.border}`, borderRadius: 6, background: "#fff", cursor: "pointer", color: C.ink }}>
                + Crear país personalizado
              </button>
              <button onClick={onClose} style={cancelBtnStyle}>Cerrar</button>
            </div>
          </>
        )}

        {mode === "custom" && (
          <>
            <p style={{ ...F, fontSize: 12, color: C.inkMid, margin: "0 0 16px" }}>
              Solo si tu país no está en el catálogo. Puedes completar después los catálogos legales y normativa desde la configuración del país.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8 }}>
              <Field label="Código (ISO-2)" hint="Ej: MX, US, DE">
                <input style={inputStyle} value={form.pais} onChange={e => upd("pais", e.target.value.toUpperCase())} placeholder="MX" maxLength={3} />
              </Field>
              <Field label="Nombre del país">
                <input style={inputStyle} value={form.nombre} onChange={e => upd("nombre", e.target.value)} placeholder="México" />
              </Field>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <Field label="Bandera (emoji)" hint="Pega el emoji de bandera">
                <input style={inputStyle} value={form.flag_emoji} onChange={e => upd("flag_emoji", e.target.value)} placeholder="🇲🇽" />
              </Field>
              <Field label="Prefijo telefónico">
                <input style={inputStyle} value={form.phone_code} onChange={e => upd("phone_code", e.target.value)} placeholder="+52" />
              </Field>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <Field label="Divisa por defecto" hint="Código ISO de 3 letras">
                <input style={inputStyle} value={form.divisa_default} onChange={e => upd("divisa_default", e.target.value.toUpperCase())} placeholder="MXN" maxLength={3} />
              </Field>
              <Field label="Idioma por defecto" hint="Código ISO de 2 letras">
                <input style={inputStyle} value={form.idioma_default} onChange={e => upd("idioma_default", e.target.value.toLowerCase())} placeholder="es" maxLength={3} />
              </Field>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <Field label="Locale completo" hint="Ej: es-MX, en-US">
                <input style={inputStyle} value={form.default_locale} onChange={e => upd("default_locale", e.target.value)} placeholder={form.idioma_default && form.pais ? form.idioma_default + "-" + form.pais : "es-MX"} />
              </Field>
              <Field label="Zona horaria" hint="Ej: America/Mexico_City">
                <input style={inputStyle} value={form.default_timezone} onChange={e => upd("default_timezone", e.target.value)} placeholder="America/Mexico_City" />
              </Field>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 16, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
              <button onClick={() => setMode("pick")} style={cancelBtnStyle}>← Volver</button>
              <button onClick={onCreateCustom} disabled={saving} style={saveBtnStyle}>
                {saving ? "Creando…" : "Crear país"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ModalEditCompany({ existing, isNew, paisCode, paisConfig, tenantId, onSaved, onCancel }) {
  const [form, setForm] = useState(() => {
    const e = existing || {};
    const dom = e.domicilio_legal || {};
    const rep = e.legal_representative || {};
    return {
      legal_name:    e.legal_name    || "",
      display_name:  e.display_name  || "",
      slug:          e.slug          || "",
      tax_id:        e.tax_id        || "",
      tax_id_type:   e.tax_id_type   || (paisCode === "ES" ? "CIF" : "NIT"),
      phone:         e.phone         || "",
      divisa:        e.divisa        || (paisConfig && paisConfig.divisa_default) || "COP",
      type:          e.type          || "company",
      dom_ciudad:        dom.ciudad        || "",
      dom_departamento:  dom.departamento  || "",
      dom_direccion:     dom.direccion     || "",
      dom_codigo_postal: dom.codigo_postal || "",
      rep_name:           rep.name            || "",
      rep_cargo:          rep.cargo           || "Representante Legal",
      rep_email:          rep.email           || "",
      rep_document_type:  rep.document_type   || "CC",
      rep_document_number: rep.document_number || "",
    };
  });
  const [saving, setSaving] = useState(false);
  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const onSave = async () => {
    if (!form.legal_name.trim()) { window.toast("La razón social es obligatoria", "error"); return; }
    if (!form.display_name.trim()) { window.toast("El nombre comercial es obligatorio", "error"); return; }
    setSaving(true);
    const payload = {
      tenant_id: tenantId,
      pais: paisCode,
      type: form.type,
      legal_name: form.legal_name.trim(),
      display_name: form.display_name.trim(),
      slug: form.slug.trim() || form.display_name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      tax_id: form.tax_id.trim(),
      tax_id_type: form.tax_id_type,
      phone: form.phone.trim(),
      divisa: form.divisa,
      status: "active",
      domicilio_legal: {
        ciudad: form.dom_ciudad.trim(),
        departamento: form.dom_departamento.trim(),
        direccion: form.dom_direccion.trim(),
        codigo_postal: form.dom_codigo_postal.trim(),
        pais: paisCode,
      },
      legal_representative: form.rep_name.trim() ? {
        name: form.rep_name.trim(),
        cargo: form.rep_cargo.trim(),
        email: form.rep_email.trim(),
        document_type: form.rep_document_type,
        document_number: form.rep_document_number.trim(),
      } : null,
    };
    let error;
    if (isNew) {
      ({ error } = await sb.from("companies").insert(payload));
    } else {
      ({ error } = await sb.from("companies").update(payload).eq("id", existing.id));
    }
    setSaving(false);
    if (error) { window.toast("Error: " + error.message, "error"); return; }
    window.toast(isNew ? "Empresa creada" : "Empresa actualizada", "success");
    if (onSaved) await onSaved();
  };

  const isCO = paisCode === "CO";
  const docTypes = isCO ? ["CC", "CE", "PA", "TI", "NIT"] : ["DNI", "NIE", "PA"];
  const taxTypes = isCO ? ["NIT"] : ["CIF", "NIF"];

  return (
    <div style={modalOverlayStyle} onClick={onCancel}>
      <div style={{ ...modalContentStyle, maxWidth: 720, maxHeight: "85vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <h3 style={{ ...F, fontSize: 16, fontWeight: 700, margin: "0 0 4px", color: C.ink }}>
          {isNew ? "Nueva empresa" : "Editar empresa"} · {(paisConfig && paisConfig.flag_emoji) || "🌍"} {(paisConfig && paisConfig.nombre) || paisCode}
        </h3>
        <p style={{ ...F, fontSize: 12, color: C.inkMid, margin: "0 0 16px" }}>
          Estos datos se utilizan en certificaciones laborales, contratos, facturas y plantillas legales.
        </p>

        <h4 style={sectionH4}>Identidad</h4>
        <Field label="Razón social" hint="Nombre legal completo (ej: Habitaris S.A.S.)">
          <input style={inputStyle} value={form.legal_name} onChange={e => upd("legal_name", e.target.value)} placeholder="Habitaris S.A.S." />
        </Field>
        <Field label="Nombre comercial" hint="Cómo se referencia en la suite y documentos (ej: Habitaris)">
          <input style={inputStyle} value={form.display_name} onChange={e => upd("display_name", e.target.value)} placeholder="Habitaris" />
        </Field>
        <Field label="Slug" hint="Identificador URL-safe. Si lo dejas vacío se genera del nombre comercial.">
          <input style={inputStyle} value={form.slug} onChange={e => upd("slug", e.target.value)} placeholder="habitaris-sas" />
        </Field>

        <h4 style={sectionH4}>Datos legales</h4>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8 }}>
          <Field label="Tipo">
            <select style={inputStyle} value={form.tax_id_type} onChange={e => upd("tax_id_type", e.target.value)}>
              {taxTypes.map(tt => <option key={tt} value={tt}>{tt}</option>)}
            </select>
          </Field>
          <Field label={form.tax_id_type}>
            <input style={inputStyle} value={form.tax_id} onChange={e => upd("tax_id", e.target.value)} placeholder="901.922.136-8" />
          </Field>
        </div>
        <Field label="Teléfono">
          <input style={inputStyle} value={form.phone} onChange={e => upd("phone", e.target.value)} placeholder={(paisConfig && paisConfig.phone_code) ? paisConfig.phone_code + " 350 566 1545" : "+57 350 566 1545"} />
        </Field>
        <Field label="Divisa">
          <select style={inputStyle} value={form.divisa} onChange={e => upd("divisa", e.target.value)}>
            <option value="COP">COP — Peso colombiano</option>
            <option value="EUR">EUR — Euro</option>
            <option value="USD">USD — Dólar</option>
            <option value="MXN">MXN — Peso mexicano</option>
          </select>
        </Field>

        <h4 style={sectionH4}>Domicilio legal</h4>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Field label="Ciudad"><input style={inputStyle} value={form.dom_ciudad} onChange={e => upd("dom_ciudad", e.target.value)} placeholder="Bogotá D.C." /></Field>
          <Field label={isCO ? "Departamento" : "Provincia"}><input style={inputStyle} value={form.dom_departamento} onChange={e => upd("dom_departamento", e.target.value)} placeholder={isCO ? "Bogotá D.C." : "Madrid"} /></Field>
        </div>
        <Field label="Dirección"><input style={inputStyle} value={form.dom_direccion} onChange={e => upd("dom_direccion", e.target.value)} placeholder="Calle 106 # 45-39" /></Field>
        <Field label="Código postal"><input style={inputStyle} value={form.dom_codigo_postal} onChange={e => upd("dom_codigo_postal", e.target.value)} placeholder="" /></Field>

        <h4 style={sectionH4}>Representante legal</h4>
        <p style={{ ...F, fontSize: 11, color: C.inkLight, margin: "-8px 0 8px" }}>
          Persona que firma los contratos y documentos legales. Si lo dejas vacío, se hereda el representante por defecto del grupo (pestaña Rep. legal).
        </p>
        <Field label="Nombre completo"><input style={inputStyle} value={form.rep_name} onChange={e => upd("rep_name", e.target.value)} placeholder="Ana María Díaz Buitrago" /></Field>
        <Field label="Cargo"><input style={inputStyle} value={form.rep_cargo} onChange={e => upd("rep_cargo", e.target.value)} placeholder="Representante Legal" /></Field>
        <Field label="Email"><input style={inputStyle} value={form.rep_email} onChange={e => upd("rep_email", e.target.value)} placeholder="amdiaz@habitaris.es" /></Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8 }}>
          <Field label="Tipo doc.">
            <select style={inputStyle} value={form.rep_document_type} onChange={e => upd("rep_document_type", e.target.value)}>
              {docTypes.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </Field>
          <Field label="Número doc.">
            <input style={inputStyle} value={form.rep_document_number} onChange={e => upd("rep_document_number", e.target.value)} placeholder="1.109.293.384" />
          </Field>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
          <button onClick={onCancel} style={cancelBtnStyle}>Cancelar</button>
          <button onClick={onSave} disabled={saving} style={saveBtnStyle}>
            {saving ? "Guardando…" : (isNew ? "Crear empresa" : "Guardar cambios")}
          </button>
        </div>
      </div>
    </div>
  );
}

// Estilos compartidos para modales de Estructura Legal
const modalOverlayStyle = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 };
const modalContentStyle = { background: "#fff", borderRadius: 10, padding: 24, maxWidth: 480, width: "100%", boxShadow: "0 10px 40px rgba(0,0,0,0.2)" };
const sectionH4 = { ...F, fontSize: 12, fontWeight: 700, color: C.ink, margin: "16px 0 8px", textTransform: "uppercase", letterSpacing: 0.5 };
const cancelBtnStyle = { ...F, fontSize: 13, fontWeight: 600, padding: "8px 14px", border: `1px solid ${C.border}`, borderRadius: 6, background: "#fff", cursor: "pointer", color: C.inkMid };
const saveBtnStyle = { ...F, fontSize: 13, fontWeight: 600, padding: "8px 14px", border: "none", borderRadius: 6, background: C.ink, color: "#fff", cursor: "pointer" };

function TabPlaceholder({ title, desc, sprintRef }) {
  return (
    <div style={{
      background: C.card, border: `1px dashed ${C.border}`, borderRadius: 12,
      padding: 60, textAlign: "center"
    }}>
      <div style={{ ...F, fontSize: 16, color: C.ink, fontWeight: 600 }}>{title}</div>
      <div style={{ ...F, fontSize: 13, color: C.inkMid, margin: "10px 0 0", maxWidth: 460, marginLeft: "auto", marginRight: "auto", lineHeight: 1.5 }}>
        {desc}
      </div>
      {sprintRef && (
        <div style={{ ...F, fontSize: 11, color: C.inkLight, marginTop: 14, fontStyle: "italic" }}>
          {sprintRef}
        </div>
      )}
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────
export default function AjustesGrupo({ onBack }) {
  const t = useTenant();
  const [active, setActive] = useState(() => {
    try { return sessionStorage.getItem("hab:ajustes_grupo_tab") || "identidad"; }
    catch { return "identidad"; }
  });
  const [companies, setCompanies] = useState([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const tenantId = t.tenant && t.tenant.id;

  const setTab = (id) => {
    setActive(id);
    try { sessionStorage.setItem("hab:ajustes_grupo_tab", id); } catch (_) {}
  };

  // Cargar empresas para tabs que las necesitan (legal, miembros)
  useEffect(() => {
    if (!t.isReady || !tenantId) return;
    let cancelled = false;
    (async () => {
      setCompaniesLoading(true);
      try {
        const { data } = await sb.from("companies").select("*").eq("tenant_id", tenantId).order("pais").order("display_name");
        if (!cancelled) setCompanies(data || []);
      } finally {
        if (!cancelled) setCompaniesLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [t.isReady, tenantId, reloadKey]);

  const onTabSaved = useCallback(() => {
    setReloadKey(k => k + 1);
    if (t.reload) t.reload(); // refresca TenantContext también
  }, [t]);

  if (!t.isReady) return <div style={{ padding: 40, ...F, color: C.inkLight, textAlign: "center" }}>Cargando…</div>;

  return (
    <div style={{ ...F }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 32px 60px" }}>

        {/* Header de la página */}
        <div style={{ marginBottom: 28 }}>
          <button onClick={onBack}
            style={{ ...F, background: "none", border: "none", color: C.inkMid, cursor: "pointer",
              fontSize: 12, fontWeight: 600, padding: 0, marginBottom: 10 }}>
            ← Volver al Grupo
          </button>
          <div style={{ ...F, fontSize: 11, color: C.inkLight, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 600, marginBottom: 6 }}>
            Espacio Grupo · Ajustes
          </div>
          <h1 style={{ ...F, fontSize: 28, fontWeight: 700, color: C.ink, margin: 0, letterSpacing: -0.5 }}>
            Configuración del grupo
          </h1>
          <p style={{ ...F, fontSize: 13, color: C.inkMid, margin: "6px 0 0" }}>
            Identidad, contacto, branding y miembros del holding.
          </p>
        </div>

        {/* Layout dos columnas: tabs sidebar + contenido */}
        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 32, alignItems: "flex-start" }}>

          {/* Sidebar de tabs */}
          <div style={{ position: "sticky", top: 64 }}>
            {TABS.map(tab => {
              const isActive = active === tab.id;
              return (
                <button key={tab.id}
                  onClick={() => setTab(tab.id)}
                  style={{
                    ...F, display: "block", width: "100%", textAlign: "left",
                    padding: "10px 14px", borderRadius: 6, marginBottom: 4,
                    background: isActive ? C.accentBg : "transparent",
                    border: "none", cursor: "pointer",
                    transition: "all .15s",
                  }}>
                  <div style={{ ...F, fontSize: 13, fontWeight: isActive ? 700 : 500, color: isActive ? C.ink : C.inkMid }}>
                    {tab.label}
                  </div>
                  <div style={{ ...F, fontSize: 11, color: C.inkLight, marginTop: 2 }}>
                    {tab.desc}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Contenido */}
          <div style={{
            background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
            padding: 28, minHeight: 400,
          }}>
            {active === "identidad" && <TabIdentidad           tenant={t.tenant} tenantConfig={t.tenantConfig} onSaved={onTabSaved} />}
            {active === "contacto"  && <TabContacto            tenant={t.tenant} tenantConfig={t.tenantConfig} onSaved={onTabSaved} />}
            {active === "branding"  && <TabBranding            tenant={t.tenant} tenantConfig={t.tenantConfig} onSaved={onTabSaved} />}
            {active === "rep_legal" && <TabRepresentanteLegal  tenant={t.tenant} tenantConfig={t.tenantConfig} onSaved={onTabSaved} />}
            {active === "legal" && (
              companiesLoading
                ? <div style={{ padding: 40, ...F, color: C.inkLight, textAlign: "center" }}>Cargando…</div>
                : <TabLegal companies={companies} />
            )}
            {active === "comms" && (
              <TabPlaceholder
                title="Comunicaciones del grupo"
                desc="Servidor SMTP, dominio verificado y plantillas maestras de correo. Configurables a 3 niveles (grupo → país → empresa) con herencia. El módulo Notificaciones genérico configurable vivirá aquí."
                sprintRef="Próximamente — Sprint posterior"
              />
            )}
            {active === "miembros" && (
              <TabPlaceholder
                title="Miembros y permisos"
                desc="Usuarios con acceso a la suite del grupo, qué empresas pueden ver y qué pueden hacer en cada módulo. Plantillas de permisos por rol."
                sprintRef="Próximamente — Bloque 3b del Sprint B"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
