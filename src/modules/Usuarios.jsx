/**
 * modules/Usuarios.jsx — Módulo de gestión de identidad (Capa 2 — modo lectura)
 *
 * Tabs:
 *   1. Mi perfil — mi identidad, documentos, métodos de contacto
 *   2. Miembros — lista de users del tenant
 *   3. Catálogo — tipos de documento disponibles por país
 *
 * NO crea/edita users todavía (siguiente paso). Solo lectura.
 */
import React, { useEffect, useMemo, useState } from "react";
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
};

const F = { fontFamily: "'DM Sans', sans-serif" };

function Initials({ name, size = 44 }) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  const initials = parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : (parts[0] || "?")[0].toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "#111", color: "#fff",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.36, fontWeight: 600, ...F, letterSpacing: 0.5
    }}>{initials}</div>
  );
}

function Pill({ children, tone = "neutral" }) {
  const tones = {
    neutral: { bg: "#F0EEE9", color: "#555", border: "#E4E1DB" },
    accent:  { bg: "#E8F1EC", color: "#1E6B42", border: "#C8DDD0" },
    primary: { bg: "#111", color: "#fff", border: "#111" },
    soft:    { bg: "#FAFAF8", color: "#888", border: "#E4E1DB" },
    warning: { bg: "#FBF1E1", color: "#A06520", border: "#EFD9B0" },
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

function Section({ title, subtitle, children, action }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <h3 style={{ ...F, fontSize: 14, fontWeight: 600, color: C.ink, margin: 0, letterSpacing: -0.2 }}>{title}</h3>
          {subtitle && <p style={{ ...F, fontSize: 12, color: C.inkMid, margin: "3px 0 0" }}>{subtitle}</p>}
        </div>
        {action}
      </div>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
        {children}
      </div>
    </div>
  );
}

function Row({ children, last }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "14px 18px", borderBottom: last ? "none" : `1px solid ${C.border}`, gap: 16
    }}>{children}</div>
  );
}

function Empty({ title, hint }) {
  return (
    <div style={{ padding: "32px 18px", textAlign: "center" }}>
      <div style={{ ...F, fontSize: 13, color: C.inkMid, fontWeight: 500, marginBottom: 4 }}>{title}</div>
      {hint && <div style={{ ...F, fontSize: 12, color: C.inkLight }}>{hint}</div>}
    </div>
  );
}

function Loading() {
  return (
    <div style={{ padding: 40, ...F, fontSize: 13, color: C.inkLight, textAlign: "center" }}>Cargando…</div>
  );
}

// ──────────────────────────── TAB: MI PERFIL ────────────────────────────

function TabMiPerfil({ t, docs, auths, docTypes, loading }) {
  if (loading) return <Loading />;

  const user = t.user || {};
  const role = t.role || "—";
  const tenantName = (t.tenant && (t.tenant.display_name || t.tenant.nombre)) || "—";
  const paisDef = (t.membership && t.membership.pais_default) || "—";
  const paisesAcc = (t.membership && t.membership.paises_acceso) || [];

  function tipoLabel(pais, codigo) {
    const dt = (docTypes || []).find(d => d.pais === pais && d.codigo === codigo);
    return dt ? dt.nombre : codigo;
  }

  return (
    <div>
      {/* Header con identidad principal */}
      <div style={{
        background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
        padding: "22px 22px 24px", marginBottom: 28,
        display: "flex", alignItems: "center", gap: 18
      }}>
        <Initials name={user.display_name || user.nombre} size={56} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ ...F, fontSize: 20, fontWeight: 700, color: C.ink, margin: 0, letterSpacing: -0.3 }}>
            {user.display_name || user.nombre || "Sin nombre"}
          </h2>
          <p style={{ ...F, fontSize: 13, color: C.inkMid, margin: "4px 0 8px" }}>
            @{user.username || "—"} · {tenantName}
          </p>
          <div style={{ display: "flex", gap: 6 }}>
            <Pill tone="primary">{role}</Pill>
            <Pill tone="accent">País: {paisDef}</Pill>
            {paisesAcc.length > 1 && <Pill tone="soft">Acceso: {paisesAcc.join(" · ")}</Pill>}
          </div>
        </div>
      </div>

      {/* Identidad */}
      <Section title="Identidad" subtitle="Datos básicos de tu cuenta. Edición en próxima versión.">
        <Row>
          <span style={{ ...F, fontSize: 12, color: C.inkMid, fontWeight: 500 }}>Nombre para mostrar</span>
          <span style={{ ...F, fontSize: 13, color: C.ink, fontWeight: 500 }}>{user.display_name || "—"}</span>
        </Row>
        <Row>
          <span style={{ ...F, fontSize: 12, color: C.inkMid, fontWeight: 500 }}>Usuario</span>
          <span style={{ ...F, fontSize: 13, color: C.ink, fontWeight: 500, fontFamily: "ui-monospace, monospace" }}>{user.username || "—"}</span>
        </Row>
        <Row>
          <span style={{ ...F, fontSize: 12, color: C.inkMid, fontWeight: 500 }}>Idioma preferido</span>
          <span style={{ ...F, fontSize: 13, color: C.ink, fontWeight: 500 }}>{user.preferred_locale || "es"}</span>
        </Row>
        <Row last>
          <span style={{ ...F, fontSize: 12, color: C.inkMid, fontWeight: 500 }}>ID interno</span>
          <span style={{ ...F, fontSize: 11, color: C.inkLight, fontFamily: "ui-monospace, monospace" }}>{user.id || "—"}</span>
        </Row>
      </Section>

      {/* Documentos legales */}
      <Section
        title="Documentos legales"
        subtitle={docs.some(d => /^PENDIENTE/.test(d.numero)) ? "Tienes documentos con número placeholder. La edición llega en la próxima versión." : "Tus documentos por país."}>
        {docs.length === 0 ? <Empty title="Aún no tienes documentos registrados" /> :
          docs.map((d, i) => (
            <Row key={d.id} last={i === docs.length - 1}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                <span style={{
                  display: "inline-flex", width: 32, height: 22, alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 700, background: "#F0EEE9", borderRadius: 4, color: C.inkMid, ...F, letterSpacing: 0.5
                }}>{d.pais}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ ...F, fontSize: 13, color: C.ink, fontWeight: 500 }}>{tipoLabel(d.pais, d.tipo)}</div>
                  <div style={{ ...F, fontSize: 11, color: C.inkLight, marginTop: 2 }}>{d.tipo}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{
                  ...F, fontSize: 13, color: /^PENDIENTE/.test(d.numero) ? "#A06520" : C.ink,
                  fontWeight: 500, fontFamily: "ui-monospace, monospace"
                }}>{d.numero}</span>
                {d.is_primary && <Pill tone="accent">Principal</Pill>}
              </div>
            </Row>
          ))}
      </Section>

      {/* Métodos de contacto / login */}
      <Section title="Métodos de contacto" subtitle="Canales para login y recuperación de contraseña.">
        {auths.length === 0 ? <Empty title="Aún no hay métodos registrados" /> :
          auths.map((a, i) => (
            <Row key={a.id} last={i === auths.length - 1}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{
                  display: "inline-flex", width: 32, height: 22, alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 700, background: "#F0EEE9", borderRadius: 4, color: C.inkMid, ...F, textTransform: "uppercase", letterSpacing: 0.5
                }}>{a.type}</span>
                <span style={{ ...F, fontSize: 13, color: C.ink, fontWeight: 500 }}>{a.identifier}</span>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {a.is_primary && <Pill tone="accent">Principal</Pill>}
                {a.verified_at && <Pill tone="soft">Verificado</Pill>}
              </div>
            </Row>
          ))}
      </Section>
    </div>
  );
}

// ──────────────────────────── TAB: MIEMBROS ────────────────────────────

function TabMiembros({ miembros, loading }) {
  if (loading) return <Loading />;
  if (!miembros || miembros.length === 0) {
    return (
      <Section title="Miembros del tenant" subtitle="Personas con acceso al tenant.">
        <Empty title="Aún no hay miembros registrados" hint="La gestión de miembros llega en la próxima versión." />
      </Section>
    );
  }
  return (
    <Section title="Miembros del tenant" subtitle={`${miembros.length} ${miembros.length === 1 ? "miembro" : "miembros"} con acceso.`}>
      {miembros.map((m, i) => (
        <Row key={m.id} last={i === miembros.length - 1}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            <Initials name={m.display_name || m.nombre} size={36} />
            <div style={{ minWidth: 0 }}>
              <div style={{ ...F, fontSize: 13, color: C.ink, fontWeight: 600 }}>
                {m.display_name || m.nombre || "Sin nombre"}
              </div>
              <div style={{ ...F, fontSize: 11, color: C.inkLight, marginTop: 2, fontFamily: "ui-monospace, monospace" }}>
                @{m.username || "—"}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {m.pais_default && <Pill tone="soft">{m.pais_default}</Pill>}
            <Pill tone={m.role === "owner" ? "primary" : "accent"}>{m.role}</Pill>
            <Pill tone={m.status === "active" ? "soft" : "warning"}>{m.status}</Pill>
          </div>
        </Row>
      ))}
    </Section>
  );
}

// ──────────────────────────── TAB: CATÁLOGO ────────────────────────────

function TabCatalogo({ docTypes, loading }) {
  if (loading) return <Loading />;
  const porPais = useMemo(() => {
    const m = new Map();
    (docTypes || []).forEach(d => {
      if (!m.has(d.pais)) m.set(d.pais, []);
      m.get(d.pais).push(d);
    });
    for (const arr of m.values()) arr.sort((a, b) => (a.orden || 0) - (b.orden || 0));
    return Array.from(m.entries()).sort();
  }, [docTypes]);

  if (porPais.length === 0) {
    return <Section title="Catálogo de documentos"><Empty title="Sin tipos definidos" /></Section>;
  }

  const paisName = (p) => p === "CO" ? "Colombia" : p === "ES" ? "España" : p === "MX" ? "México" : p === "AR" ? "Argentina" : p;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ ...F, fontSize: 14, fontWeight: 600, color: C.ink, margin: 0, letterSpacing: -0.2 }}>
          Catálogo de documentos por país
        </h3>
        <p style={{ ...F, fontSize: 12, color: C.inkMid, margin: "3px 0 0" }}>
          Tipos válidos cuando se registra un documento legal. La gestión del catálogo llega en la próxima versión.
        </p>
      </div>
      {porPais.map(([pais, items]) => (
        <div key={pais} style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{
              display: "inline-flex", width: 28, height: 20, alignItems: "center", justifyContent: "center",
              fontSize: 10, fontWeight: 700, background: "#111", color: "#fff", borderRadius: 4, ...F, letterSpacing: 0.5
            }}>{pais}</span>
            <span style={{ ...F, fontSize: 12, color: C.inkMid, fontWeight: 500 }}>{paisName(pais)}</span>
          </div>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
            {items.map((d, i) => (
              <Row key={d.codigo} last={i === items.length - 1}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{
                    ...F, fontSize: 11, fontWeight: 700, color: C.ink, fontFamily: "ui-monospace, monospace",
                    padding: "2px 8px", background: "#F0EEE9", borderRadius: 4
                  }}>{d.codigo}</span>
                  <span style={{ ...F, fontSize: 13, color: C.ink, fontWeight: 500 }}>{d.nombre}</span>
                </div>
                {d.activo ? <Pill tone="accent">Activo</Pill> : <Pill tone="warning">Inactivo</Pill>}
              </Row>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ──────────────────────────── COMPONENTE PRINCIPAL ────────────────────────────

export default function Usuarios() {
  const t = useTenant();
  const [tab, setTab] = useState("perfil");
  const [docs, setDocs] = useState([]);
  const [auths, setAuths] = useState([]);
  const [miembros, setMiembros] = useState([]);
  const [docTypes, setDocTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  const tenantId = t.tenant && t.tenant.id;
  const userId = t.user && t.user.id;

  useEffect(() => {
    if (!t.isReady) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [r1, r2, r3, r4] = await Promise.all([
          userId ? sb.from("user_documents").select("*").eq("user_id", userId).order("is_primary", { ascending: false }) : { data: [] },
          userId ? sb.from("auth_methods").select("*").eq("user_id", userId).order("is_primary", { ascending: false }) : { data: [] },
          tenantId ? sb.from("memberships").select("id, role, status, pais_default, paises_acceso, user_id").eq("tenant_id", tenantId) : { data: [] },
          sb.from("document_types").select("*").order("pais").order("orden"),
        ]);
        if (cancelled) return;
        setDocs(r1.data || []);
        setAuths(r2.data || []);
        setDocTypes(r4.data || []);

        // Hidratar usernames + display_name de los miembros
        const ms = r3.data || [];
        if (ms.length > 0) {
          const ids = ms.map(m => m.user_id).filter(Boolean);
          const { data: users } = await sb.from("users")
            .select("id, username, display_name, nombre")
            .in("id", ids);
          const byId = Object.fromEntries((users || []).map(u => [u.id, u]));
          const enriched = ms.map(m => ({ ...m, ...(byId[m.user_id] || {}) }));
          if (!cancelled) setMiembros(enriched);
        } else {
          if (!cancelled) setMiembros([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [t.isReady, tenantId, userId]);

  if (!t.isReady) {
    return (
      <div style={{ padding: 40, background: C.bg, minHeight: "100vh", ...F, fontSize: 13, color: C.inkLight, textAlign: "center" }}>
        Cargando contexto del tenant…
      </div>
    );
  }

  const TABS = [
    { id: "perfil",   label: "Mi perfil" },
    { id: "miembros", label: "Miembros" },
    { id: "catalogo", label: "Catálogo" },
  ];

  return (
    <div style={{ padding: "24px 28px 60px", background: C.bg, minHeight: "100vh", ...F }}>
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ ...F, fontSize: 26, fontWeight: 700, color: C.ink, margin: 0, letterSpacing: -0.5 }}>
            Usuarios
          </h1>
          <p style={{ ...F, fontSize: 13, color: C.inkMid, margin: "4px 0 0" }}>
            Identidad, miembros del tenant y catálogo de documentos.
          </p>
        </div>

        <div style={{ display: "flex", gap: 4, borderBottom: `1px solid ${C.border}`, marginBottom: 24 }}>
          {TABS.map(tb => {
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

        {tab === "perfil"   && <TabMiPerfil   t={t} docs={docs} auths={auths} docTypes={docTypes} loading={loading} />}
        {tab === "miembros" && <TabMiembros   miembros={miembros} loading={loading} />}
        {tab === "catalogo" && <TabCatalogo   docTypes={docTypes} loading={loading} />}
      </div>
    </div>
  );
}
