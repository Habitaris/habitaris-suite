/**
 * modules/Pais.jsx — Espacio país (nivel intermedio entre Holding y Empresa)
 *
 * Aquí se ven las empresas DE ESTE PAÍS, los miembros con acceso a ESTE PAÍS,
 * y el catálogo de tipos de documento del país.
 *
 * NO se mezcla con otros países. NO se ve nada de otro país desde aquí.
 *
 * Tabs:
 *  - Empresas: cards + crear nueva (solo país actual)
 *  - Miembros: usuarios con acceso a alguna empresa del país
 *  - Catálogo: tipos de documento del país
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
  accent: "#1E6B42",
  bgSoft: "#FAFAF8",
  danger: "#A23B3B",
};
const F = { fontFamily: "'DM Sans', sans-serif" };

function paisName(p) {
  return p === "CO" ? "Colombia" : p === "ES" ? "España" : p === "MX" ? "México" :
         p === "AR" ? "Argentina" : p === "PE" ? "Perú" : p === "CL" ? "Chile" :
         p === "US" ? "Estados Unidos" : p;
}

function paisToTaxIdType(p) {
  return p === "ES" ? "CIF" : p === "CO" ? "NIT" : p === "MX" ? "RFC" :
         p === "AR" ? "CUIT" : p === "PE" ? "RUC" : p === "CL" ? "RUT" : "ID";
}

// ─── Primitivas UI (compactas, mismo lenguaje que Holding) ──────────────────

function Btn({ children, onClick, tone = "ghost", size = "md", disabled, type = "button" }) {
  const tones = {
    primary: { bg: "#111", color: "#fff", border: "#111", hover: "#000" },
    ghost:   { bg: "transparent", color: C.ink, border: C.border, hover: C.bgSoft },
    danger:  { bg: "transparent", color: C.danger, border: "#EFC7C7", hover: "#FBEBEB" },
    accent:  { bg: C.accent, color: "#fff", border: C.accent, hover: "#185435" },
  };
  const s = tones[tone] || tones.ghost;
  const padding = size === "sm" ? "6px 12px" : "9px 16px";
  const fontSize = size === "sm" ? 12 : 13;
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      style={{
        ...F, fontSize, fontWeight: 600, padding, borderRadius: 6,
        background: s.bg, color: disabled ? "#bbb" : s.color, border: `1px solid ${disabled ? "#ddd" : s.border}`,
        cursor: disabled ? "not-allowed" : "pointer", letterSpacing: 0.2, transition: "all .15s",
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = s.hover; }}
      onMouseLeave={e => { if (!disabled) e.currentTarget.style.background = s.bg; }}>
      {children}
    </button>
  );
}

function Pill({ children, tone = "neutral" }) {
  const tones = {
    neutral: { bg: "#F0EEE9", color: "#555", border: "#E4E1DB" },
    accent:  { bg: "#E8F1EC", color: "#1E6B42", border: "#C8DDD0" },
    primary: { bg: "#111", color: "#fff", border: "#111" },
    soft:    { bg: "#FAFAF8", color: "#888", border: "#E4E1DB" },
    warning: { bg: "#FBF1E1", color: "#A06520", border: "#EFD9B0" },
    danger:  { bg: "#FBEBEB", color: "#A23B3B", border: "#EFC7C7" },
  };
  const s = tones[tone] || tones.neutral;
  return (
    <span style={{
      ...F, fontSize: 10, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase",
      padding: "3px 8px", borderRadius: 4, border: `1px solid ${s.border}`,
      background: s.bg, color: s.color
    }}>{children}</span>
  );
}

function Modal({ open, onClose, title, children, footer, width = 480 }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(17,17,17,0.45)", zIndex: 1200,
      display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "8vh 16px",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#fff", borderRadius: 12, width: "100%", maxWidth: width,
        boxShadow: "0 12px 48px rgba(0,0,0,0.18)", overflow: "hidden", ...F,
      }}>
        <div style={{ padding: "18px 22px", borderBottom: `1px solid ${C.border}` }}>
          <h3 style={{ ...F, fontSize: 16, fontWeight: 700, color: C.ink, margin: 0, letterSpacing: -0.2 }}>{title}</h3>
        </div>
        <div style={{ padding: "20px 22px", maxHeight: "65vh", overflowY: "auto" }}>{children}</div>
        {footer && <div style={{ padding: "14px 22px", borderTop: `1px solid ${C.border}`, background: C.bgSoft, display: "flex", justifyContent: "flex-end", gap: 8 }}>{footer}</div>}
      </div>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ ...F, display: "block", fontSize: 11, fontWeight: 600, color: C.inkMid, letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 5 }}>{label}</label>
      {children}
      {hint && <div style={{ ...F, fontSize: 11, color: C.inkLight, marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

const inputStyle = {
  ...F, fontSize: 13, color: C.ink, padding: "9px 11px",
  border: `1px solid ${C.border}`, borderRadius: 6, background: "#fff",
  width: "100%", boxSizing: "border-box", outline: "none",
};
function Input(props) { return <input {...props} style={{ ...inputStyle, ...(props.style || {}) }} />; }
function Select(props) { return <select {...props} style={{ ...inputStyle, cursor: "pointer", ...(props.style || {}) }}>{props.children}</select>; }

// ─── Modal Crear/Editar Empresa (solo del país actual) ──────────────────────

function ModalEmpresa({ empresa, pais, divisaDefault, tenantId, userId, onClose, onSave }) {
  const isNew = !empresa;
  const [legalName, setLegalName] = useState(empresa?.legal_name || "");
  const [displayName, setDisplayName] = useState(empresa?.display_name || "");
  const [slug, setSlug] = useState(empresa?.slug || "");
  const [taxIdType, setTaxIdType] = useState(empresa?.tax_id_type || paisToTaxIdType(pais));
  const [taxId, setTaxId] = useState(empresa?.tax_id || "");
  const [divisa, setDivisa] = useState(empresa?.divisa || divisaDefault || "USD");
  const [status, setStatus] = useState(empresa?.status || "active");
  const [domicilio, setDomicilio] = useState(empresa?.config?.domicilio || "");
  const [repLegal, setRepLegal] = useState(empresa?.config?.representante_legal || "");
  const [emailEmp, setEmailEmp] = useState(empresa?.config?.email || "");
  const [telefono, setTelefono] = useState(empresa?.config?.telefono || "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  // Auto-slug y display_name a partir de razón social (solo en creación)
  useEffect(() => {
    if (!isNew) return;
    if (!slug) {
      const auto = (legalName || "").toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9 ]/g, "").trim()
        .replace(/\s+/g, "-").substring(0, 40);
      if (auto) setSlug(auto);
    }
    if (!displayName && legalName) {
      const dn = legalName.replace(/\s+(S\.?A\.?S\.?|S\.?L\.?|S\.?A\.?|LTDA\.?|INC\.?|CORP\.?|GMBH\.?|LLC\.?).*/i, "").trim();
      setDisplayName(dn || legalName);
    }
  }, [legalName, isNew]);

  async function submit() {
    setErr("");
    if (!legalName.trim() || !taxId.trim() || !slug.trim()) {
      return setErr("Razón social, identificación fiscal y slug son obligatorios");
    }
    setSaving(true);
    const payload = {
      tenant_id: tenantId,
      pais, // FIJO al país de la pantalla
      type: "company",
      legal_name: legalName.trim(),
      display_name: (displayName || legalName).trim(),
      slug: slug.trim().toLowerCase(),
      tax_id: taxId.trim(),
      tax_id_type: taxIdType.trim().toUpperCase(),
      divisa: divisa.trim().toUpperCase(),
      status,
      config: {
        domicilio: domicilio.trim() || null,
        representante_legal: repLegal.trim() || null,
        email: emailEmp.trim() || null,
        telefono: telefono.trim() || null,
      },
    };
    let res;
    if (isNew) {
      res = await sb.from("companies").insert(payload).select("id").single();
    } else {
      res = await sb.from("companies").update(payload).eq("id", empresa.id).select("id").single();
    }
    setSaving(false);
    if (res.error) {
      if ((res.error.message || "").includes("duplicate") && (res.error.message || "").includes("slug")) {
        setErr("Ya existe una empresa con ese identificador en este tenant. Cambia el slug.");
      } else {
        setErr(res.error.message);
      }
      return;
    }

    // Auto-añadir al membership del owner si es nueva
    if (isNew && userId && res.data?.id) {
      const { data: meRow } = await sb.from("memberships")
        .select("id, empresas_acceso, paises_acceso")
        .eq("user_id", userId).eq("tenant_id", tenantId).maybeSingle();
      if (meRow) {
        const newEmps = Array.from(new Set([...(meRow.empresas_acceso || []), res.data.id]));
        const newPaises = Array.from(new Set([...(meRow.paises_acceso || []), pais]));
        await sb.from("memberships")
          .update({ empresas_acceso: newEmps, paises_acceso: newPaises })
          .eq("id", meRow.id);
      }
    }

    onSave(); onClose();
    if (window.toast) window.toast(isNew ? "Empresa creada" : "Empresa actualizada");
  }

  return (
    <Modal open={true} onClose={onClose} title={isNew ? `Nueva empresa en ${paisName(pais)}` : `Editar ${empresa.display_name}`} width={560}
      footer={<><Btn onClick={onClose}>Cancelar</Btn><Btn tone="primary" onClick={submit} disabled={saving}>{saving ? "Guardando…" : "Guardar"}</Btn></>}>
      <div style={{ background: C.bgSoft, padding: "10px 12px", borderRadius: 6, marginBottom: 16, ...F, fontSize: 12, color: C.inkMid }}>
        País: <strong style={{ color: C.ink }}>{paisName(pais)} ({pais})</strong> · Tipo doc: <strong style={{ color: C.ink }}>{taxIdType}</strong> · Divisa: <strong style={{ color: C.ink }}>{divisa}</strong>
      </div>

      <Field label="Razón social" hint="Nombre legal completo. Ej. Habitaris S.A.S., Habitaris España S.L.">
        <Input value={legalName} onChange={e => setLegalName(e.target.value)} placeholder="Razón social" autoFocus />
      </Field>
      <Field label="Nombre comercial" hint="Cómo se mostrará en la suite. Ej. Habitaris.">
        <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Habitaris" />
      </Field>
      <Field label="Identificador URL (slug)" hint="Único. Solo minúsculas, números y guiones.">
        <Input value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder="habitaris-sas" />
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr", gap: 12 }}>
        <Field label="Tipo">
          <Select value={taxIdType} onChange={e => setTaxIdType(e.target.value)}>
            {["NIT","CIF","RFC","CUIT","RUC","RUT","ID"].map(x => <option key={x} value={x}>{x}</option>)}
          </Select>
        </Field>
        <Field label="Identificación fiscal">
          <Input value={taxId} onChange={e => setTaxId(e.target.value)} placeholder={taxIdType === "CIF" ? "B12345678" : taxIdType === "NIT" ? "901.234.567-8" : ""} />
        </Field>
        <Field label="Divisa">
          <Select value={divisa} onChange={e => setDivisa(e.target.value)}>
            {["COP","EUR","USD","MXN","ARS","PEN","CLP","GBP"].map(x => <option key={x} value={x}>{x}</option>)}
          </Select>
        </Field>
      </div>

      <Field label="Estado">
        <Select value={status} onChange={e => setStatus(e.target.value)}>
          <option value="active">Activa</option>
          <option value="inactive">Inactiva</option>
          <option value="liquidated">Liquidada</option>
        </Select>
      </Field>

      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16, marginTop: 4 }}>
        <div style={{ ...F, fontSize: 11, color: C.inkLight, letterSpacing: 0.4, textTransform: "uppercase", fontWeight: 600, marginBottom: 10 }}>Datos opcionales</div>
        <Field label="Domicilio fiscal">
          <Input value={domicilio} onChange={e => setDomicilio(e.target.value)} placeholder="Calle, ciudad, país" />
        </Field>
        <Field label="Representante legal">
          <Input value={repLegal} onChange={e => setRepLegal(e.target.value)} placeholder="Nombre completo" />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Email">
            <Input value={emailEmp} onChange={e => setEmailEmp(e.target.value)} placeholder="contacto@empresa.com" />
          </Field>
          <Field label="Teléfono">
            <Input value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="+34 ..." />
          </Field>
        </div>
      </div>

      {err && <p style={{ ...F, fontSize: 12, color: C.danger, margin: "8px 0 0" }}>{err}</p>}
    </Modal>
  );
}

// ─── Card de empresa ─────────────────────────────────────────────────────────

function EmpresaCard({ empresa, onEnter, onEdit, canManage }) {
  const tipo = empresa.type === "jv" ? "UTE / Consorcio" : "Empresa propia";
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
      padding: 22, transition: "all .15s",
      display: "flex", flexDirection: "column", gap: 12,
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = C.ink; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...F, fontSize: 16, fontWeight: 700, color: C.ink, letterSpacing: -0.2 }}>{empresa.display_name}</div>
          <div style={{ ...F, fontSize: 12, color: C.inkLight, marginTop: 3 }}>{empresa.legal_name}</div>
        </div>
        <Pill tone={empresa.status === "active" ? "accent" : empresa.status === "liquidated" ? "soft" : "warning"}>{empresa.status}</Pill>
      </div>
      <div style={{ ...F, fontSize: 12, color: C.inkMid, display: "flex", flexWrap: "wrap", gap: "4px 10px" }}>
        <span>{empresa.tax_id_type} {empresa.tax_id}</span>
        <span>·</span>
        <span>{empresa.divisa}</span>
        <span>·</span>
        <span style={{ fontFamily: "ui-monospace, monospace", color: C.inkLight }}>{empresa.slug}</span>
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: "auto", paddingTop: 8 }}>
        <Btn tone="primary" size="sm" onClick={onEnter} disabled={empresa.status !== "active"}>
          {empresa.status === "active" ? "Entrar →" : tipo}
        </Btn>
        {canManage && <Btn size="sm" onClick={onEdit}>Editar</Btn>}
      </div>
    </div>
  );
}

// ─── Componente principal ───────────────────────────────────────────────────

export default function Pais({ pais, onSelectCompany, onBackToHolding }) {
  const t = useTenant();
  const [tab, setTab] = useState("empresas");
  const [companies, setCompanies] = useState([]);
  const [members, setMembers] = useState([]);
  const [docTypes, setDocTypes] = useState([]);
  const [paisesCatalogo, setPaisesCatalogo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [editingEmp, setEditingEmp] = useState(null);

  const tenantId = t.tenant && t.tenant.id;
  const userId = t.user && t.user.id;
  const role = t.role;
  const tenantName = (t.tenant && (t.tenant.display_name || t.tenant.legal_name || t.tenant.id)) || "Holding";
  const canManage = role === "owner" || role === "admin";

  const reload = useCallback(() => setReloadKey(k => k + 1), []);

  useEffect(() => {
    if (!t.isReady || !tenantId || !pais) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [r1, r2, r3, r4] = await Promise.all([
          sb.from("companies").select("*").eq("tenant_id", tenantId).eq("pais", pais).order("display_name"),
          sb.from("memberships").select("id, role, status, pais_default, paises_acceso, empresas_acceso, user_id").eq("tenant_id", tenantId),
          sb.from("document_types").select("*").eq("pais", pais).order("orden"),
          sb.from("country_configs").select("*").eq("pais", pais).maybeSingle(),
        ]);
        if (cancelled) return;
        setCompanies(r1.data || []);
        setDocTypes(r3.data || []);
        setPaisesCatalogo(r4.data ? [r4.data] : []);

        // Filtrar miembros por país: tienen acceso si paises_acceso incluye este país
        const ms = (r2.data || []).filter(m => (m.paises_acceso || []).includes(pais));
        if (ms.length > 0) {
          const ids = ms.map(m => m.user_id).filter(Boolean);
          const { data: usersData } = await sb.from("users")
            .select("id, username, display_name, nombre")
            .in("id", ids);
          const byId = Object.fromEntries((usersData || []).map(u => [u.id, u]));
          const enriched = ms.map(m => ({ ...m, ...(byId[m.user_id] || {}) }));
          if (!cancelled) setMembers(enriched);
        } else {
          if (!cancelled) setMembers([]);
        }
      } finally { if (!cancelled) setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, [t.isReady, tenantId, pais, reloadKey]);

  const empresasPropias = companies.filter(c => c.type === "company");
  const utes = companies.filter(c => c.type === "jv");
  const divisaPais = paisesCatalogo[0]?.divisa_default || "USD";

  if (!t.isReady) return <div style={{ padding: 40, ...F, color: C.inkLight, textAlign: "center" }}>Cargando…</div>;

  // Verificar acceso: el user debe tener acceso a este país
  const tieneAcceso = (t.paisesAcceso || []).includes(pais) || canManage;
  if (!tieneAcceso) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, ...F, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 40, textAlign: "center", maxWidth: 400 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.ink, marginBottom: 8 }}>Sin acceso a {paisName(pais)}</div>
          <p style={{ fontSize: 13, color: C.inkMid, lineHeight: 1.6, margin: "0 0 16px" }}>
            Tu usuario no tiene acceso a empresas de este país. Contacta con un administrador.
          </p>
          <Btn onClick={onBackToHolding}>← Volver al holding</Btn>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, ...F }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 32px 60px" }}>

        {/* Breadcrumb + Header */}
        <div style={{ marginBottom: 12, ...F, fontSize: 12, color: C.inkLight }}>
          <span style={{ cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }} onClick={onBackToHolding}>{tenantName}</span>
          <span style={{ margin: "0 8px" }}>›</span>
          <span style={{ color: C.ink, fontWeight: 600 }}>{paisName(pais)}</span>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 32, gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{
              display: "inline-flex", width: 44, height: 44, alignItems: "center", justifyContent: "center",
              background: "#111", color: "#fff", borderRadius: 10, fontSize: 14, fontWeight: 700, letterSpacing: 0.6,
            }}>{pais}</span>
            <div>
              <h1 style={{ ...F, fontSize: 28, fontWeight: 700, color: C.ink, margin: 0, letterSpacing: -0.5 }}>{paisName(pais)}</h1>
              <p style={{ ...F, fontSize: 12, color: C.inkMid, margin: "4px 0 0" }}>
                {empresasPropias.length} {empresasPropias.length === 1 ? "empresa propia" : "empresas propias"}
                {utes.length > 0 && <> · {utes.length} {utes.length === 1 ? "UTE" : "UTEs"}</>}
                {" · divisa "}{divisaPais}
              </p>
            </div>
          </div>
          <Btn onClick={onBackToHolding} size="sm">← Holding</Btn>
        </div>

        {/* Cuadro consolidado país */}
        <div style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
          padding: 20, marginBottom: 28,
        }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14, gap: 12 }}>
            <h2 style={{ ...F, fontSize: 14, fontWeight: 600, color: C.ink, margin: 0 }}>Consolidado {paisName(pais)}</h2>
            <span style={{ ...F, fontSize: 11, color: C.inkLight, fontStyle: "italic" }}>Disponible próximamente</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
            {[
              { label: "Empresas activas", value: empresasPropias.filter(c => c.status === "active").length.toString() },
              { label: "Headcount", value: "—" },
              { label: `Revenue Q YTD (${divisaPais})`, value: "—" },
              { label: "Aprobaciones", value: "—" },
            ].map((kpi, i) => (
              <div key={i} style={{ padding: 12, background: C.bgSoft, borderRadius: 6 }}>
                <div style={{ ...F, fontSize: 10, color: C.inkLight, letterSpacing: 0.4, textTransform: "uppercase", fontWeight: 600 }}>{kpi.label}</div>
                <div style={{ ...F, fontSize: 18, color: C.ink, fontWeight: 700, marginTop: 2 }}>{kpi.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, borderBottom: `1px solid ${C.border}`, marginBottom: 24 }}>
          {[
            { id: "empresas", label: `Empresas (${empresasPropias.length + utes.length})` },
            { id: "miembros", label: `Miembros (${members.length})` },
            { id: "catalogo", label: `Catálogo` },
          ].map(tb => {
            const sel = tab === tb.id;
            return (
              <button key={tb.id} onClick={() => setTab(tb.id)}
                style={{
                  ...F, fontSize: 13, fontWeight: 500, padding: "10px 14px",
                  background: "transparent", border: "none",
                  borderBottom: sel ? `2px solid ${C.ink}` : "2px solid transparent",
                  color: sel ? C.ink : C.inkMid, cursor: "pointer",
                  marginBottom: -1, transition: "all .15s",
                }}>
                {tb.label}
              </button>
            );
          })}
        </div>

        {/* Tab Empresas */}
        {tab === "empresas" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
              <div>
                <h3 style={{ ...F, fontSize: 14, fontWeight: 600, color: C.ink, margin: 0 }}>Empresas en {paisName(pais)}</h3>
                <p style={{ ...F, fontSize: 12, color: C.inkMid, margin: "3px 0 0" }}>
                  Cada empresa tiene su {paisToTaxIdType(pais)} propio, su contabilidad, sus empleados.
                </p>
              </div>
              {canManage && (
                <Btn tone="primary" size="sm" onClick={() => setEditingEmp("new")}>+ Nueva empresa</Btn>
              )}
            </div>

            {loading ? (
              <div style={{ padding: 40, color: C.inkLight, textAlign: "center", fontSize: 13 }}>Cargando…</div>
            ) : (empresasPropias.length === 0 && utes.length === 0) ? (
              <div style={{ background: C.card, border: `1px dashed ${C.border}`, borderRadius: 12, padding: 40, textAlign: "center" }}>
                <div style={{ fontSize: 13, color: C.ink, fontWeight: 600 }}>Sin empresas en {paisName(pais)} aún</div>
                <div style={{ fontSize: 12, color: C.inkMid, margin: "6px 0 14px" }}>Crea la primera para empezar a operar.</div>
                {canManage && <Btn tone="primary" size="sm" onClick={() => setEditingEmp("new")}>+ Crear primera empresa</Btn>}
              </div>
            ) : (
              <>
                {empresasPropias.length > 0 && (
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                    gap: 16,
                    marginBottom: utes.length > 0 ? 24 : 0,
                  }}>
                    {empresasPropias.map(c => (
                      <EmpresaCard key={c.id} empresa={c} canManage={canManage}
                        onEnter={() => onSelectCompany && onSelectCompany(c)}
                        onEdit={() => setEditingEmp(c)} />
                    ))}
                  </div>
                )}

                {utes.length > 0 && (
                  <div>
                    <div style={{ ...F, fontSize: 11, color: C.inkLight, letterSpacing: 0.6, textTransform: "uppercase", fontWeight: 600, marginBottom: 10 }}>Consorcios / UTEs</div>
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                      gap: 16,
                    }}>
                      {utes.map(c => (
                        <EmpresaCard key={c.id} empresa={c} canManage={canManage}
                          onEnter={() => onSelectCompany && onSelectCompany(c)}
                          onEdit={() => setEditingEmp(c)} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            <p style={{ ...F, fontSize: 11, color: C.inkLight, marginTop: 24, lineHeight: 1.6 }}>
              Las UTEs / Consorcios se crean desde el módulo CRM cuando una oferta se ejecuta vía consorcio. Esa funcionalidad se habilitará en Sprint E.
            </p>
          </div>
        )}

        {/* Tab Miembros */}
        {tab === "miembros" && (
          <div>
            <div style={{ marginBottom: 14 }}>
              <h3 style={{ ...F, fontSize: 14, fontWeight: 600, color: C.ink, margin: 0 }}>Miembros con acceso a {paisName(pais)}</h3>
              <p style={{ ...F, fontSize: 12, color: C.inkMid, margin: "3px 0 0" }}>
                Usuarios que pueden ver datos de empresas en este país. Para crear o editar miembros usa el módulo Usuarios global.
              </p>
            </div>

            {loading ? (
              <div style={{ padding: 40, color: C.inkLight, textAlign: "center", fontSize: 13 }}>Cargando…</div>
            ) : members.length === 0 ? (
              <div style={{ background: C.card, border: `1px dashed ${C.border}`, borderRadius: 12, padding: 40, textAlign: "center" }}>
                <div style={{ fontSize: 13, color: C.ink, fontWeight: 600 }}>Sin miembros con acceso a {paisName(pais)}</div>
                <div style={{ fontSize: 12, color: C.inkMid, margin: "6px 0 0" }}>Asigna acceso desde el módulo Usuarios.</div>
              </div>
            ) : (
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
                {members.map((m, i) => (
                  <div key={m.id} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "14px 18px", borderBottom: i < members.length - 1 ? `1px solid ${C.border}` : "none",
                    gap: 16,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: "50%", background: "#111", color: "#fff",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 13, fontWeight: 600, ...F,
                      }}>
                        {(m.display_name || m.nombre || "?").split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase()}
                      </div>
                      <div>
                        <div style={{ ...F, fontSize: 13, color: C.ink, fontWeight: 600 }}>{m.display_name || m.nombre || "Sin nombre"}</div>
                        <div style={{ ...F, fontSize: 11, color: C.inkLight, marginTop: 2, fontFamily: "ui-monospace, monospace" }}>@{m.username || "—"}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      {m.pais_default === pais && <Pill tone="accent">Por defecto</Pill>}
                      <Pill tone={m.role === "owner" ? "primary" : "neutral"}>{m.role}</Pill>
                      <Pill tone={m.status === "active" ? "soft" : "warning"}>{m.status}</Pill>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab Catálogo */}
        {tab === "catalogo" && (
          <div>
            <div style={{ marginBottom: 14 }}>
              <h3 style={{ ...F, fontSize: 14, fontWeight: 600, color: C.ink, margin: 0 }}>Tipos de documento de {paisName(pais)}</h3>
              <p style={{ ...F, fontSize: 12, color: C.inkMid, margin: "3px 0 0" }}>
                Documentos legales válidos para identificar personas en este país.
              </p>
            </div>

            {loading ? (
              <div style={{ padding: 40, color: C.inkLight, textAlign: "center", fontSize: 13 }}>Cargando…</div>
            ) : docTypes.length === 0 ? (
              <div style={{ background: C.card, border: `1px dashed ${C.border}`, borderRadius: 12, padding: 40, textAlign: "center" }}>
                <div style={{ fontSize: 13, color: C.ink, fontWeight: 600 }}>Sin tipos de documento definidos para {paisName(pais)}</div>
              </div>
            ) : (
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
                {docTypes.map((d, i) => (
                  <div key={d.id || `${d.pais}-${d.codigo}`} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "14px 18px", borderBottom: i < docTypes.length - 1 ? `1px solid ${C.border}` : "none",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{
                        ...F, fontSize: 11, fontWeight: 700, color: C.ink, fontFamily: "ui-monospace, monospace",
                        padding: "2px 8px", background: "#F0EEE9", borderRadius: 4
                      }}>{d.codigo}</span>
                      <span style={{ ...F, fontSize: 13, color: C.ink, fontWeight: 500 }}>{d.nombre}</span>
                    </div>
                    {d.activo === false ? <Pill tone="warning">Inactivo</Pill> : <Pill tone="accent">Activo</Pill>}
                  </div>
                ))}
              </div>
            )}
            <p style={{ ...F, fontSize: 11, color: C.inkLight, marginTop: 14 }}>
              Para añadir o editar tipos del catálogo usa el módulo Usuarios global (sección Catálogo).
            </p>
          </div>
        )}
      </div>

      {editingEmp && (
        <ModalEmpresa
          empresa={editingEmp === "new" ? null : editingEmp}
          pais={pais}
          divisaDefault={divisaPais}
          tenantId={tenantId}
          userId={userId}
          onClose={() => setEditingEmp(null)}
          onSave={reload}
        />
      )}
    </div>
  );
}
