/**
 * modules/AjustesGrupo.jsx — Espacio de configuración del Grupo (holding)
 *
 * Vive bajo /grupo/ajustes y se accede desde el botón ⚙ Configuración de la
 * GrupoBar. Aquí se gestionan los ajustes que cuelgan del holding y que pueden
 * heredarse hacia países y empresas:
 *
 *  - Grupo            → datos básicos del holding (nombre, razón, divisa, idioma, zona horaria)
 *  - Estructura legal → países donde opera + empresas (lectura, +crear próximamente)
 *  - Branding         → logo, color, tipografía, slogan (3 niveles, próximamente)
 *  - Comunicaciones   → SMTP, plantillas (3 niveles, próximamente)
 *  - Miembros         → usuarios del grupo y permisos (próximamente)
 *
 * Sprint B3a: estructura completa con la tab "Grupo" funcional. Resto en TODO.
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
  { id: "grupo",     label: "Grupo",            desc: "Datos del holding" },
  { id: "legal",     label: "Estructura legal", desc: "Países y empresas" },
  { id: "branding",  label: "Branding",         desc: "Marca corporativa" },
  { id: "comms",     label: "Comunicaciones",   desc: "SMTP y plantillas" },
  { id: "miembros",  label: "Miembros",         desc: "Usuarios y permisos" },
];

const IDIOMAS = [
  { code: "es", label: "Español" },
  { code: "en", label: "English" },
  { code: "pt", label: "Português" },
];

const DIVISAS = [
  { code: "COP", label: "Peso colombiano (COP)" },
  { code: "EUR", label: "Euro (EUR)" },
  { code: "USD", label: "Dólar estadounidense (USD)" },
  { code: "MXN", label: "Peso mexicano (MXN)" },
  { code: "ARS", label: "Peso argentino (ARS)" },
  { code: "PEN", label: "Sol peruano (PEN)" },
  { code: "CLP", label: "Peso chileno (CLP)" },
];

const TIMEZONES = [
  "America/Bogota",
  "Europe/Madrid",
  "America/Mexico_City",
  "America/Argentina/Buenos_Aires",
  "America/Lima",
  "America/Santiago",
  "America/New_York",
  "UTC",
];

function paisName(p) {
  return p === "CO" ? "Colombia" : p === "ES" ? "España" : p === "MX" ? "México" :
         p === "AR" ? "Argentina" : p === "PE" ? "Perú" : p === "CL" ? "Chile" :
         p === "US" ? "Estados Unidos" : p;
}

function Btn({ children, tone = "ghost", size = "md", onClick, disabled, type = "button", style, ...rest }) {
  const isPrimary = tone === "primary";
  const isDanger = tone === "danger";
  const padY = size === "sm" ? 6 : 9;
  const padX = size === "sm" ? 12 : 16;
  const fs = size === "sm" ? 12 : 13;
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      style={{
        ...F, fontSize: fs, fontWeight: 600,
        padding: `${padY}px ${padX}px`, borderRadius: 6,
        border: isPrimary ? "1px solid #111" : isDanger ? "1px solid #B91C1C" : `1px solid ${C.border}`,
        background: disabled ? "#ccc" : isPrimary ? C.accent : isDanger ? "#fff" : "#fff",
        color: disabled ? "#888" : isPrimary ? "#fff" : isDanger ? "#B91C1C" : C.ink,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all .15s",
        ...(style || {}),
      }}
      {...rest}>
      {children}
    </button>
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

// ─── Tab: Grupo (datos del holding) ─────────────────────────────────────
function TabGrupo({ tenant, tenantConfig, onSaved }) {
  const [form, setForm] = useState({
    display_name: tenant?.display_name || "",
    legal_name: tenant?.legal_name || "",
    country_default: tenantConfig?.country_default || "CO",
    currency_default: tenantConfig?.currency_default || "COP",
    language_default: tenantConfig?.language_default || "es",
    timezone_default: tenantConfig?.timezone_default || "America/Bogota",
  });
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [error, setError] = useState(null);

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      // Update tenants
      const { error: e1 } = await sb.from("tenants")
        .update({
          display_name: form.display_name.trim(),
          legal_name: form.legal_name.trim() || null,
        })
        .eq("id", tenant.id);
      if (e1) throw e1;

      // Upsert tenant_config
      const newConfig = {
        ...(tenantConfig || {}),
        country_default: form.country_default,
        currency_default: form.currency_default,
        language_default: form.language_default,
        timezone_default: form.timezone_default,
      };
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
  };

  return (
    <div style={{ maxWidth: 640 }}>
      <p style={{ ...F, fontSize: 12, color: C.inkMid, margin: "0 0 22px", lineHeight: 1.5 }}>
        Datos básicos del grupo. Estos valores se usan como defaults cuando creas
        un país o una empresa nueva, y aparecen en cabeceras/firmas si no se
        sobrescriben en niveles inferiores.
      </p>

      <Field label="Nombre del grupo" hint="Nombre con el que aparece el holding en la suite">
        <input style={inputStyle} value={form.display_name} onChange={e => update("display_name", e.target.value)} />
      </Field>

      <Field label="Razón social" hint="Nombre legal del grupo (opcional)">
        <input style={inputStyle} value={form.legal_name} onChange={e => update("legal_name", e.target.value)} />
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Field label="País por defecto">
          <select style={inputStyle} value={form.country_default} onChange={e => update("country_default", e.target.value)}>
            <option value="CO">Colombia (CO)</option>
            <option value="ES">España (ES)</option>
            <option value="MX">México (MX)</option>
            <option value="AR">Argentina (AR)</option>
            <option value="PE">Perú (PE)</option>
            <option value="CL">Chile (CL)</option>
            <option value="US">Estados Unidos (US)</option>
          </select>
        </Field>

        <Field label="Divisa por defecto">
          <select style={inputStyle} value={form.currency_default} onChange={e => update("currency_default", e.target.value)}>
            {DIVISAS.map(d => <option key={d.code} value={d.code}>{d.label}</option>)}
          </select>
        </Field>

        <Field label="Idioma por defecto">
          <select style={inputStyle} value={form.language_default} onChange={e => update("language_default", e.target.value)}>
            {IDIOMAS.map(i => <option key={i.code} value={i.code}>{i.label}</option>)}
          </select>
        </Field>

        <Field label="Zona horaria por defecto">
          <select style={inputStyle} value={form.timezone_default} onChange={e => update("timezone_default", e.target.value)}>
            {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
          </select>
        </Field>
      </div>

      <div style={{ marginTop: 22, display: "flex", alignItems: "center", gap: 14 }}>
        <Btn tone="primary" onClick={save} disabled={saving}>
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
    </div>
  );
}

// ─── Tab: Estructura legal (lectura por ahora) ─────────────────────────
function TabLegal({ companies, tenantId }) {
  const paises = useMemo(() => Array.from(new Set(companies.map(c => c.pais).filter(Boolean))).sort(), [companies]);
  return (
    <div>
      <p style={{ ...F, fontSize: 12, color: C.inkMid, margin: "0 0 22px", lineHeight: 1.5 }}>
        Países donde opera el grupo y empresas registradas en cada uno.
        Para añadir un nuevo país o nueva empresa pulsa los botones correspondientes.
      </p>

      {paises.length === 0 ? (
        <div style={{
          background: C.card, border: `1px dashed ${C.border}`, borderRadius: 10,
          padding: 40, textAlign: "center"
        }}>
          <div style={{ ...F, fontSize: 13, color: C.inkMid }}>El grupo aún no tiene empresas registradas.</div>
        </div>
      ) : paises.map(p => {
        const empresasDePais = companies.filter(c => c.pais === p);
        return (
          <div key={p} style={{ marginBottom: 22 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>
              <h3 style={{ ...F, fontSize: 14, fontWeight: 600, color: C.ink, margin: 0 }}>{paisName(p)}</h3>
              <span style={{ ...F, fontSize: 11, color: C.inkLight, fontWeight: 500 }}>· {empresasDePais.length} {empresasDePais.length === 1 ? "empresa" : "empresas"}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {empresasDePais.map(emp => (
                <div key={emp.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 14px", background: C.bgSoft, borderRadius: 6,
                  border: `1px solid ${C.border}`,
                }}>
                  <div>
                    <div style={{ ...F, fontSize: 13, fontWeight: 600, color: C.ink }}>{emp.display_name || emp.legal_name}</div>
                    {emp.legal_name && emp.display_name !== emp.legal_name && (
                      <div style={{ ...F, fontSize: 11, color: C.inkLight, marginTop: 2 }}>{emp.legal_name}</div>
                    )}
                  </div>
                  <span style={{ ...F, fontSize: 10, color: C.inkLight, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>
                    {emp.type === "jv" ? "UTE" : "Empresa"} · {emp.divisa || "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <div style={{ marginTop: 26, padding: 16, background: C.bgSoft, border: `1px dashed ${C.border}`, borderRadius: 8 }}>
        <div style={{ ...F, fontSize: 12, color: C.inkMid, lineHeight: 1.5 }}>
          <strong style={{ color: C.ink }}>Próximamente:</strong> botones para abrir un nuevo país,
          añadir empresas, editar datos legales (NIT/CIF, domicilio, representante legal),
          configurar fiscalidad local, calendario laboral y plan contable por país.
        </div>
      </div>
    </div>
  );
}

// ─── Tab placeholder (Branding, Comms, Miembros) ────────────────────────
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
    try { return sessionStorage.getItem("hab:ajustes_grupo_tab") || "grupo"; }
    catch { return "grupo"; }
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
            Datos básicos, estructura legal, branding y miembros del holding.
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
            {active === "grupo" && <TabGrupo tenant={t.tenant} tenantConfig={t.tenantConfig} onSaved={onTabSaved} />}
            {active === "legal" && (
              companiesLoading
                ? <div style={{ padding: 40, ...F, color: C.inkLight, textAlign: "center" }}>Cargando…</div>
                : <TabLegal companies={companies} tenantId={tenantId} />
            )}
            {active === "branding" && (
              <TabPlaceholder
                title="Branding del grupo"
                desc="Logo, color primario, tipografía y eslogan del holding. Estos valores se heredan automáticamente a países y empresas a menos que cada uno los sobrescriba."
                sprintRef="Próximamente — Bloque 3c del Sprint B"
              />
            )}
            {active === "comms" && (
              <TabPlaceholder
                title="Comunicaciones del grupo"
                desc="Servidor SMTP, dominio verificado y plantillas de correo maestras. Configurables a 3 niveles (grupo → país → empresa) con herencia."
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
