/**
 * modules/Usuarios.jsx — Capa 2 escritura completa
 *
 * Tabs:
 *   1. Mi perfil — identidad + documentos + métodos auth (con edición)
 *   2. Miembros — lista + crear + editar role + suspender/reactivar (solo owner/admin)
 *   3. Catálogo — tipos de documento + añadir/desactivar (solo owner)
 *
 * Crear usuario: queda en status='invited'. Cuando se migre a Supabase Auth
 * (Capa 3), se le envía magic link para establecer contraseña.
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

// ──────────────────────────── PRIMITIVAS UI ────────────────────────────

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

function Section({ title, subtitle, children, action }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12, gap: 12 }}>
        <div style={{ minWidth: 0 }}>
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
  return <div style={{ padding: 40, ...F, fontSize: 13, color: C.inkLight, textAlign: "center" }}>Cargando…</div>;
}

function Btn({ children, onClick, tone = "ghost", size = "md", type = "button", disabled }) {
  const tones = {
    primary: { bg: "#111", color: "#fff", border: "#111", hover: "#000" },
    ghost:   { bg: "transparent", color: C.ink, border: C.border, hover: C.bgSoft },
    danger:  { bg: "transparent", color: C.danger, border: "#EFC7C7", hover: "#FBEBEB" },
    accent:  { bg: C.accent, color: "#fff", border: C.accent, hover: "#185435" },
  };
  const s = tones[tone] || tones.ghost;
  const padding = size === "sm" ? "5px 10px" : "8px 14px";
  const fontSize = size === "sm" ? 11 : 12;
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      style={{
        ...F, fontSize, fontWeight: 600, padding, borderRadius: 6,
        background: s.bg, color: disabled ? "#bbb" : s.color, border: `1px solid ${disabled ? "#ddd" : s.border}`,
        cursor: disabled ? "not-allowed" : "pointer", letterSpacing: 0.2,
        transition: "all .15s",
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = s.hover; }}
      onMouseLeave={e => { if (!disabled) e.currentTarget.style.background = s.bg; }}>
      {children}
    </button>
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

function Confirm({ open, title, message, onCancel, onConfirm, confirmLabel = "Confirmar", tone = "danger" }) {
  return (
    <Modal open={open} onClose={onCancel} title={title} width={400}
      footer={<>
        <Btn onClick={onCancel}>Cancelar</Btn>
        <Btn tone={tone} onClick={onConfirm}>{confirmLabel}</Btn>
      </>}>
      <p style={{ ...F, fontSize: 13, color: C.inkMid, margin: 0, lineHeight: 1.6 }}>{message}</p>
    </Modal>
  );
}

// ──────────────────────────── HELPERS ────────────────────────────

function genUsername(displayName) {
  const parts = (displayName || "").trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  return `${parts[0]}.${parts[parts.length - 1]}`;
}

function paisName(p) {
  return p === "CO" ? "Colombia" : p === "ES" ? "España" : p === "MX" ? "México" : p === "AR" ? "Argentina" : p;
}

// ──────────────────────────── TAB: MI PERFIL ────────────────────────────

function TabMiPerfil({ t, docs, auths, docTypes, loading, onReload }) {
  const [editingDoc, setEditingDoc] = useState(null);
  const [editingAuth, setEditingAuth] = useState(null);
  const [editingName, setEditingName] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);

  if (loading) return <Loading />;

  const user = t.user || {};
  const role = t.role || "—";
  const tenantName = (t.tenant && (t.tenant.display_name || t.tenant.nombre)) || "—";
  const paisDef = (t.membership && t.membership.pais_default) || "—";
  const paisesAcc = (t.membership && t.membership.paises_acceso) || [];

  const tipoLabel = (pais, codigo) => {
    const dt = (docTypes || []).find(d => d.pais === pais && d.codigo === codigo);
    return dt ? dt.nombre : codigo;
  };

  async function deleteDoc(id) {
    await sb.from("user_documents").delete().eq("id", id);
    setConfirmDel(null);
    onReload();
  }
  async function deleteAuth(id) {
    await sb.from("auth_methods").delete().eq("id", id);
    setConfirmDel(null);
    onReload();
  }

  return (
    <div>
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
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <Pill tone="primary">{role}</Pill>
            <Pill tone="accent">País: {paisDef}</Pill>
            {paisesAcc.length > 1 && <Pill tone="soft">Acceso: {paisesAcc.join(" · ")}</Pill>}
          </div>
        </div>
        <Btn size="sm" onClick={() => setEditingName(true)}>Editar nombre</Btn>
      </div>

      <Section title="Identidad" subtitle="Datos básicos de tu cuenta.">
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

      <Section
        title="Documentos legales"
        subtitle={docs.some(d => /^PENDIENTE/.test(d.numero)) ? "Tienes documentos con número placeholder. Edita para ponerlos al día." : "Tus documentos por país."}
        action={<Btn tone="primary" size="sm" onClick={() => setEditingDoc("new")}>+ Añadir</Btn>}>
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
                <Btn size="sm" onClick={() => setEditingDoc(d)}>Editar</Btn>
                <Btn size="sm" tone="danger" onClick={() => setConfirmDel({ kind: "doc", id: d.id, label: `${tipoLabel(d.pais, d.tipo)} ${d.numero}` })}>Borrar</Btn>
              </div>
            </Row>
          ))}
      </Section>

      <Section
        title="Métodos de contacto"
        subtitle="Canales para login y recuperación de contraseña."
        action={<Btn tone="primary" size="sm" onClick={() => setEditingAuth("new")}>+ Añadir</Btn>}>
        {auths.length === 0 ? <Empty title="Sin métodos registrados" /> :
          auths.map((a, i) => (
            <Row key={a.id} last={i === auths.length - 1}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Pill tone="soft">{a.type}</Pill>
                <span style={{ ...F, fontSize: 13, color: C.ink, fontWeight: 500, fontFamily: "ui-monospace, monospace" }}>{a.identifier}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {a.verified_at && <Pill tone="accent">Verificado</Pill>}
                {a.is_primary && <Pill tone="primary">Principal</Pill>}
                <Btn size="sm" onClick={() => setEditingAuth(a)}>Editar</Btn>
                <Btn size="sm" tone="danger" onClick={() => setConfirmDel({ kind: "auth", id: a.id, label: a.identifier })}>Borrar</Btn>
              </div>
            </Row>
          ))}
      </Section>

      {editingName && <ModalEditName user={user} onClose={() => setEditingName(false)} onSave={onReload} />}
      {editingDoc && <ModalEditDoc doc={editingDoc === "new" ? null : editingDoc} userId={user.id} docTypes={docTypes} paisesAcceso={paisesAcc} onClose={() => setEditingDoc(null)} onSave={onReload} />}
      {editingAuth && <ModalEditAuth auth={editingAuth === "new" ? null : editingAuth} userId={user.id} onClose={() => setEditingAuth(null)} onSave={onReload} />}
      <Confirm
        open={!!confirmDel}
        title="Confirmar borrado"
        message={confirmDel ? `¿Borrar "${confirmDel.label}"? Esta acción no se puede deshacer.` : ""}
        onCancel={() => setConfirmDel(null)}
        onConfirm={() => confirmDel && (confirmDel.kind === "doc" ? deleteDoc(confirmDel.id) : deleteAuth(confirmDel.id))}
        confirmLabel="Borrar"
      />
    </div>
  );
}

// ──────────────────────────── MODALES MI PERFIL ────────────────────────────

function ModalEditName({ user, onClose, onSave }) {
  const [val, setVal] = useState(user.display_name || user.nombre || "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    if (!val.trim()) { setErr("El nombre no puede estar vacío"); return; }
    setSaving(true); setErr("");
    const { error } = await sb.from("users").update({ display_name: val.trim() }).eq("id", user.id);
    setSaving(false);
    if (error) { setErr(error.message); return; }
    onSave(); onClose();
    if (window.toast) window.toast("Nombre actualizado");
  }

  return (
    <Modal open={true} onClose={onClose} title="Editar nombre"
      footer={<><Btn onClick={onClose}>Cancelar</Btn><Btn tone="primary" onClick={submit} disabled={saving}>{saving ? "Guardando…" : "Guardar"}</Btn></>}>
      <Field label="Nombre para mostrar">
        <Input value={val} onChange={e => setVal(e.target.value)} autoFocus />
      </Field>
      {err && <p style={{ ...F, fontSize: 12, color: C.danger, margin: "8px 0 0" }}>{err}</p>}
    </Modal>
  );
}

function ModalEditDoc({ doc, userId, docTypes, paisesAcceso, onClose, onSave }) {
  const isNew = !doc;
  const initialPais = doc?.pais || (paisesAcceso[0] || "CO");
  const [pais, setPais] = useState(initialPais);
  const [tipo, setTipo] = useState(doc?.tipo || "");
  const [numero, setNumero] = useState(doc?.numero && !/^PENDIENTE/.test(doc.numero) ? doc.numero : "");
  const [primary, setPrimary] = useState(doc?.is_primary || false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const tiposPais = useMemo(() => (docTypes || []).filter(d => d.pais === pais && d.activo !== false), [docTypes, pais]);
  useEffect(() => {
    if (!tiposPais.some(t => t.codigo === tipo)) setTipo(tiposPais[0]?.codigo || "");
  }, [pais, tiposPais.length]);

  async function submit() {
    if (!pais || !tipo || !numero.trim()) { setErr("País, tipo y número son obligatorios"); return; }
    setSaving(true); setErr("");
    try {
      if (primary) {
        await sb.from("user_documents").update({ is_primary: false }).eq("user_id", userId);
      }
      let res;
      if (isNew) {
        res = await sb.from("user_documents").insert({ user_id: userId, pais, tipo, numero: numero.trim(), is_primary: primary });
      } else {
        res = await sb.from("user_documents").update({ pais, tipo, numero: numero.trim(), is_primary: primary }).eq("id", doc.id);
      }
      if (res.error) {
        if ((res.error.message || "").includes("duplicate")) setErr("Ya existe un documento con ese país, tipo y número.");
        else setErr(res.error.message);
        setSaving(false);
        return;
      }
      setSaving(false);
      onSave(); onClose();
      if (window.toast) window.toast(isNew ? "Documento añadido" : "Documento actualizado");
    } catch (e) { setErr(e.message || "Error"); setSaving(false); }
  }

  return (
    <Modal open={true} onClose={onClose} title={isNew ? "Añadir documento" : "Editar documento"}
      footer={<><Btn onClick={onClose}>Cancelar</Btn><Btn tone="primary" onClick={submit} disabled={saving}>{saving ? "Guardando…" : "Guardar"}</Btn></>}>
      <Field label="País">
        <Select value={pais} onChange={e => setPais(e.target.value)}>
          {(paisesAcceso.length ? paisesAcceso : ["CO","ES"]).map(p => <option key={p} value={p}>{paisName(p)} ({p})</option>)}
        </Select>
      </Field>
      <Field label="Tipo de documento">
        <Select value={tipo} onChange={e => setTipo(e.target.value)}>
          {tiposPais.length === 0 && <option value="">Sin tipos disponibles</option>}
          {tiposPais.map(d => <option key={d.codigo} value={d.codigo}>{d.nombre} ({d.codigo})</option>)}
        </Select>
      </Field>
      <Field label="Número" hint="Sin espacios ni puntos para mejor búsqueda.">
        <Input value={numero} onChange={e => setNumero(e.target.value)} placeholder="Ej. 1234567890" />
      </Field>
      <Field label="">
        <label style={{ ...F, display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.ink, cursor: "pointer" }}>
          <input type="checkbox" checked={primary} onChange={e => setPrimary(e.target.checked)} />
          Marcar como documento principal
        </label>
      </Field>
      {err && <p style={{ ...F, fontSize: 12, color: C.danger, margin: "8px 0 0" }}>{err}</p>}
    </Modal>
  );
}

function ModalEditAuth({ auth, userId, onClose, onSave }) {
  const isNew = !auth;
  const [type, setType] = useState(auth?.type || "email");
  const [identifier, setIdentifier] = useState(auth?.identifier || "");
  const [primary, setPrimary] = useState(auth?.is_primary || false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    if (!identifier.trim()) { setErr("El identificador es obligatorio"); return; }
    if (type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier.trim())) { setErr("Email inválido"); return; }
    setSaving(true); setErr("");
    try {
      if (primary) {
        await sb.from("auth_methods").update({ is_primary: false }).eq("user_id", userId);
      }
      let res;
      if (isNew) {
        res = await sb.from("auth_methods").insert({ user_id: userId, type, identifier: identifier.trim().toLowerCase(), is_primary: primary });
      } else {
        res = await sb.from("auth_methods").update({ type, identifier: identifier.trim().toLowerCase(), is_primary: primary }).eq("id", auth.id);
      }
      if (res.error) {
        if ((res.error.message || "").includes("duplicate")) setErr("Ya existe ese identificador. Cada email/teléfono solo puede pertenecer a un usuario.");
        else setErr(res.error.message);
        setSaving(false);
        return;
      }
      setSaving(false);
      onSave(); onClose();
      if (window.toast) window.toast(isNew ? "Método añadido" : "Método actualizado");
    } catch (e) { setErr(e.message || "Error"); setSaving(false); }
  }

  return (
    <Modal open={true} onClose={onClose} title={isNew ? "Añadir método de contacto" : "Editar método de contacto"}
      footer={<><Btn onClick={onClose}>Cancelar</Btn><Btn tone="primary" onClick={submit} disabled={saving}>{saving ? "Guardando…" : "Guardar"}</Btn></>}>
      <Field label="Tipo">
        <Select value={type} onChange={e => setType(e.target.value)}>
          <option value="email">Email</option>
          <option value="phone">Teléfono</option>
        </Select>
      </Field>
      <Field label={type === "email" ? "Email" : "Teléfono"}>
        <Input value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder={type === "email" ? "tu@empresa.com" : "+57 320 1234567"} />
      </Field>
      <Field label="">
        <label style={{ ...F, display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.ink, cursor: "pointer" }}>
          <input type="checkbox" checked={primary} onChange={e => setPrimary(e.target.checked)} />
          Marcar como principal (recuperación de contraseña)
        </label>
      </Field>
      {err && <p style={{ ...F, fontSize: 12, color: C.danger, margin: "8px 0 0" }}>{err}</p>}
    </Modal>
  );
}

// ──────────────────────────── TAB: MIEMBROS ────────────────────────────

function TabMiembros({ miembros, loading, tenantId, paisesTenant, role, onReload }) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  const canManage = role === "owner" || role === "admin";

  if (loading) return <Loading />;

  async function toggleStatus(m) {
    const newStatus = m.status === "active" ? "suspended" : "active";
    await sb.from("memberships").update({ status: newStatus }).eq("id", m.id);
    setConfirmAction(null);
    onReload();
    if (window.toast) window.toast(newStatus === "active" ? "Miembro reactivado" : "Miembro suspendido");
  }

  return (
    <>
      <Section
        title="Miembros del tenant"
        subtitle={`${miembros.length} ${miembros.length === 1 ? "miembro" : "miembros"} con acceso.`}
        action={canManage && <Btn tone="primary" size="sm" onClick={() => setCreating(true)}>+ Crear usuario</Btn>}>
        {miembros.length === 0 ? <Empty title="Sin miembros" /> :
          miembros.map((m, i) => (
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
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                {m.pais_default && <Pill tone="soft">{m.pais_default}</Pill>}
                <Pill tone={m.role === "owner" ? "primary" : "accent"}>{m.role}</Pill>
                <Pill tone={m.status === "active" ? "soft" : m.status === "invited" ? "warning" : "danger"}>{m.status}</Pill>
                {canManage && m.role !== "owner" && <>
                  <Btn size="sm" onClick={() => setEditing(m)}>Editar</Btn>
                  <Btn size="sm" tone={m.status === "active" ? "danger" : "accent"} onClick={() => setConfirmAction({ kind: "toggle", m })}>
                    {m.status === "active" ? "Suspender" : "Reactivar"}
                  </Btn>
                </>}
              </div>
            </Row>
          ))}
      </Section>

      {creating && <ModalCrearUsuario tenantId={tenantId} paisesTenant={paisesTenant} onClose={() => setCreating(false)} onSave={onReload} />}
      {editing && <ModalEditarMiembro miembro={editing} paisesTenant={paisesTenant} onClose={() => setEditing(null)} onSave={onReload} />}
      <Confirm
        open={!!confirmAction}
        title={confirmAction?.m.status === "active" ? "Suspender miembro" : "Reactivar miembro"}
        message={confirmAction ? `¿${confirmAction.m.status === "active" ? "Suspender" : "Reactivar"} a ${confirmAction.m.display_name || confirmAction.m.nombre}?${confirmAction.m.status === "active" ? " No podrá acceder a la suite hasta reactivarlo." : ""}` : ""}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => confirmAction && toggleStatus(confirmAction.m)}
        confirmLabel={confirmAction?.m.status === "active" ? "Suspender" : "Reactivar"}
        tone={confirmAction?.m.status === "active" ? "danger" : "accent"}
      />
    </>
  );
}

function ModalCrearUsuario({ tenantId, paisesTenant, onClose, onSave }) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [usernameOverride, setUsernameOverride] = useState("");
  const [role, setRole] = useState("staff");
  const [paisDefault, setPaisDefault] = useState(paisesTenant[0] || "CO");
  const [paisesAcceso, setPaisesAcceso] = useState([paisesTenant[0] || "CO"]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const usernameAuto = useMemo(() => genUsername(displayName), [displayName]);
  const username = usernameOverride.trim() || usernameAuto;

  function togglePais(p) {
    setPaisesAcceso(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  }

  async function submit() {
    setErr("");
    if (!displayName.trim()) return setErr("El nombre es obligatorio");
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setErr("Email inválido");
    if (!username) return setErr("Username inválido");
    if (!paisesAcceso.includes(paisDefault)) return setErr("El país por defecto debe estar en los países de acceso");

    setSaving(true);
    try {
      const { data: nu, error: e1 } = await sb.from("users")
        .insert({ username, display_name: displayName.trim(), email: email.trim().toLowerCase(), nombre: displayName.trim(), preferred_locale: "es" })
        .select("id").single();
      if (e1) {
        if ((e1.message || "").includes("duplicate") && (e1.message || "").includes("username")) setErr("Ese usuario ya existe. Prueba otro.");
        else if ((e1.message || "").includes("duplicate") && (e1.message || "").includes("email")) setErr("Ya existe un usuario con ese email.");
        else setErr(e1.message);
        setSaving(false); return;
      }

      const { error: e2 } = await sb.from("auth_methods")
        .insert({ user_id: nu.id, type: "email", identifier: email.trim().toLowerCase(), is_primary: true });
      if (e2 && !(e2.message || "").includes("duplicate")) {
        setErr(e2.message); setSaving(false); return;
      }

      const { error: e3 } = await sb.from("memberships")
        .insert({ user_id: nu.id, tenant_id: tenantId, role, status: "invited", pais_default: paisDefault, paises_acceso: paisesAcceso });
      if (e3) { setErr(e3.message); setSaving(false); return; }

      setSaving(false);
      onSave(); onClose();
      if (window.toast) window.toast(`Usuario ${displayName} creado en estado "invitado".`);
    } catch (e) { setErr(e.message || "Error"); setSaving(false); }
  }

  return (
    <Modal open={true} onClose={onClose} title="Crear usuario" width={520}
      footer={<><Btn onClick={onClose}>Cancelar</Btn><Btn tone="primary" onClick={submit} disabled={saving}>{saving ? "Creando…" : "Crear usuario"}</Btn></>}>
      <Field label="Nombre completo" hint="Se mostrará así en la suite. Ej. María García López">
        <Input value={displayName} onChange={e => setDisplayName(e.target.value)} autoFocus />
      </Field>
      <Field label="Usuario (username)" hint={usernameAuto && !usernameOverride ? `Sugerido automáticamente: ${usernameAuto}` : "Identificador único de login. Solo letras, puntos y guiones."}>
        <Input value={usernameOverride} onChange={e => setUsernameOverride(e.target.value)} placeholder={usernameAuto || "auto"} />
      </Field>
      <Field label="Email principal" hint="Para login, recuperación de contraseña y notificaciones.">
        <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="usuario@empresa.com" />
      </Field>
      <Field label="Rol" hint={role === "owner" ? "Acceso total y administración del tenant." : role === "admin" ? "Gestión de usuarios y módulos." : role === "staff" ? "Acceso operativo a la suite." : "Sin acceso a la suite, solo portal."}>
        <Select value={role} onChange={e => setRole(e.target.value)}>
          <option value="staff">Staff (operativo)</option>
          <option value="admin">Admin (gestión)</option>
          <option value="owner">Owner (control total)</option>
          <option value="client">Cliente (portal)</option>
        </Select>
      </Field>
      <Field label="País por defecto">
        <Select value={paisDefault} onChange={e => setPaisDefault(e.target.value)}>
          {paisesTenant.map(p => <option key={p} value={p}>{paisName(p)} ({p})</option>)}
        </Select>
      </Field>
      <Field label="Países a los que tiene acceso" hint="Si tiene varios, verá selector en la topbar.">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {paisesTenant.map(p => (
            <label key={p} style={{ ...F, fontSize: 12, display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", border: `1px solid ${paisesAcceso.includes(p) ? C.ink : C.border}`, borderRadius: 6, cursor: "pointer", background: paisesAcceso.includes(p) ? "#F0EEE9" : "#fff" }}>
              <input type="checkbox" checked={paisesAcceso.includes(p)} onChange={() => togglePais(p)} />
              {paisName(p)}
            </label>
          ))}
        </div>
      </Field>
      <p style={{ ...F, fontSize: 11, color: C.inkLight, marginTop: 16, lineHeight: 1.5 }}>
        El usuario se creará en estado <strong>invitado</strong>. Cuando esté disponible la migración a Supabase Auth (Capa 3), recibirá un email para establecer su contraseña.
      </p>
      {err && <p style={{ ...F, fontSize: 12, color: C.danger, margin: "12px 0 0" }}>{err}</p>}
    </Modal>
  );
}

function ModalEditarMiembro({ miembro, paisesTenant, onClose, onSave }) {
  const [role, setRole] = useState(miembro.role || "staff");
  const [paisDefault, setPaisDefault] = useState(miembro.pais_default || (paisesTenant[0] || "CO"));
  const [paisesAcceso, setPaisesAcceso] = useState(miembro.paises_acceso || [miembro.pais_default || (paisesTenant[0] || "CO")]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  function togglePais(p) {
    setPaisesAcceso(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  }

  async function submit() {
    setErr("");
    if (!paisesAcceso.includes(paisDefault)) return setErr("El país por defecto debe estar en los países de acceso");
    setSaving(true);
    const { error } = await sb.from("memberships")
      .update({ role, pais_default: paisDefault, paises_acceso: paisesAcceso })
      .eq("id", miembro.id);
    setSaving(false);
    if (error) { setErr(error.message); return; }
    onSave(); onClose();
    if (window.toast) window.toast("Miembro actualizado");
  }

  return (
    <Modal open={true} onClose={onClose} title={`Editar a ${miembro.display_name || miembro.nombre}`} width={500}
      footer={<><Btn onClick={onClose}>Cancelar</Btn><Btn tone="primary" onClick={submit} disabled={saving}>{saving ? "Guardando…" : "Guardar"}</Btn></>}>
      <Field label="Rol">
        <Select value={role} onChange={e => setRole(e.target.value)}>
          <option value="staff">Staff (operativo)</option>
          <option value="admin">Admin (gestión)</option>
          <option value="client">Cliente (portal)</option>
        </Select>
      </Field>
      <Field label="País por defecto">
        <Select value={paisDefault} onChange={e => setPaisDefault(e.target.value)}>
          {paisesTenant.map(p => <option key={p} value={p}>{paisName(p)} ({p})</option>)}
        </Select>
      </Field>
      <Field label="Países a los que tiene acceso">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {paisesTenant.map(p => (
            <label key={p} style={{ ...F, fontSize: 12, display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", border: `1px solid ${paisesAcceso.includes(p) ? C.ink : C.border}`, borderRadius: 6, cursor: "pointer", background: paisesAcceso.includes(p) ? "#F0EEE9" : "#fff" }}>
              <input type="checkbox" checked={paisesAcceso.includes(p)} onChange={() => togglePais(p)} />
              {paisName(p)}
            </label>
          ))}
        </div>
      </Field>
      {err && <p style={{ ...F, fontSize: 12, color: C.danger, margin: "8px 0 0" }}>{err}</p>}
    </Modal>
  );
}

// ──────────────────────────── TAB: CATÁLOGO ────────────────────────────

function TabCatalogo({ docTypes, loading, role, onReload }) {
  const [editing, setEditing] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  const canManage = role === "owner";

  const porPais = useMemo(() => {
    const m = new Map();
    (docTypes || []).forEach(d => {
      if (!m.has(d.pais)) m.set(d.pais, []);
      m.get(d.pais).push(d);
    });
    for (const arr of m.values()) arr.sort((a, b) => (a.orden || 0) - (b.orden || 0));
    return Array.from(m.entries()).sort();
  }, [docTypes]);

  async function toggleActivo(d) {
    await sb.from("document_types").update({ activo: !d.activo }).eq("id", d.id);
    onReload();
    if (window.toast) window.toast(d.activo ? "Tipo desactivado" : "Tipo activado");
  }
  async function delTipo(d) {
    const { error } = await sb.from("document_types").delete().eq("id", d.id);
    setConfirmDel(null);
    if (error) {
      if (window.toast) window.toast("No se puede borrar: hay documentos que usan este tipo. Desactívalo en lugar de borrar.");
      return;
    }
    onReload();
    if (window.toast) window.toast("Tipo eliminado");
  }

  if (loading) return <Loading />;
  if (porPais.length === 0 && !canManage) return <Section title="Catálogo de documentos"><Empty title="Sin tipos definidos" /></Section>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16, gap: 12 }}>
        <div>
          <h3 style={{ ...F, fontSize: 14, fontWeight: 600, color: C.ink, margin: 0, letterSpacing: -0.2 }}>
            Catálogo de documentos por país
          </h3>
          <p style={{ ...F, fontSize: 12, color: C.inkMid, margin: "3px 0 0" }}>
            Tipos válidos cuando se registra un documento legal. {canManage ? "Solo el owner puede gestionarlo." : "Edición restringida al owner."}
          </p>
        </div>
        {canManage && <Btn tone="primary" size="sm" onClick={() => setEditing("new")}>+ Añadir tipo</Btn>}
      </div>
      {porPais.length === 0 ? <Empty title="Sin tipos. Añade uno para empezar." /> :
        porPais.map(([pais, items]) => (
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
                <Row key={d.id} last={i === items.length - 1}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{
                      ...F, fontSize: 11, fontWeight: 700, color: C.ink, fontFamily: "ui-monospace, monospace",
                      padding: "2px 8px", background: "#F0EEE9", borderRadius: 4
                    }}>{d.codigo}</span>
                    <span style={{ ...F, fontSize: 13, color: C.ink, fontWeight: 500 }}>{d.nombre}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {d.activo ? <Pill tone="accent">Activo</Pill> : <Pill tone="warning">Inactivo</Pill>}
                    {canManage && <>
                      <Btn size="sm" onClick={() => setEditing(d)}>Editar</Btn>
                      <Btn size="sm" tone={d.activo ? "danger" : "accent"} onClick={() => toggleActivo(d)}>{d.activo ? "Desactivar" : "Activar"}</Btn>
                      <Btn size="sm" tone="danger" onClick={() => setConfirmDel(d)}>Borrar</Btn>
                    </>}
                  </div>
                </Row>
              ))}
            </div>
          </div>
        ))}
      {editing && <ModalEditTipo tipo={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSave={onReload} />}
      <Confirm
        open={!!confirmDel}
        title="Borrar tipo de documento"
        message={confirmDel ? `¿Borrar "${confirmDel.nombre}" (${confirmDel.codigo})? Si hay documentos que lo usan, no se podrá borrar.` : ""}
        onCancel={() => setConfirmDel(null)}
        onConfirm={() => confirmDel && delTipo(confirmDel)}
        confirmLabel="Borrar"
      />
    </div>
  );
}

function ModalEditTipo({ tipo, onClose, onSave }) {
  const isNew = !tipo;
  const [pais, setPais] = useState(tipo?.pais || "CO");
  const [codigo, setCodigo] = useState(tipo?.codigo || "");
  const [nombre, setNombre] = useState(tipo?.nombre || "");
  const [orden, setOrden] = useState(tipo?.orden ?? 0);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    setErr("");
    if (!pais.trim() || !codigo.trim() || !nombre.trim()) return setErr("País, código y nombre son obligatorios");
    setSaving(true);
    const payload = { pais: pais.trim().toUpperCase(), codigo: codigo.trim().toUpperCase(), nombre: nombre.trim(), orden: parseInt(orden, 10) || 0 };
    const res = isNew
      ? await sb.from("document_types").insert(payload)
      : await sb.from("document_types").update(payload).eq("id", tipo.id);
    setSaving(false);
    if (res.error) {
      if ((res.error.message || "").includes("duplicate")) setErr("Ya existe ese código para ese país.");
      else setErr(res.error.message);
      return;
    }
    onSave(); onClose();
    if (window.toast) window.toast(isNew ? "Tipo añadido" : "Tipo actualizado");
  }

  return (
    <Modal open={true} onClose={onClose} title={isNew ? "Añadir tipo de documento" : "Editar tipo de documento"}
      footer={<><Btn onClick={onClose}>Cancelar</Btn><Btn tone="primary" onClick={submit} disabled={saving}>{saving ? "Guardando…" : "Guardar"}</Btn></>}>
      <Field label="País" hint="Código ISO de 2 letras. Ej. CO, ES, MX, AR">
        <Input value={pais} onChange={e => setPais(e.target.value.toUpperCase().slice(0, 2))} maxLength={2} placeholder="CO" />
      </Field>
      <Field label="Código" hint="Identificador corto del documento. Ej. CC, CE, DNI, NIE.">
        <Input value={codigo} onChange={e => setCodigo(e.target.value.toUpperCase())} placeholder="CC" />
      </Field>
      <Field label="Nombre">
        <Input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Cédula de Ciudadanía" />
      </Field>
      <Field label="Orden" hint="Para ordenar en dropdowns. Menor número aparece primero.">
        <Input type="number" value={orden} onChange={e => setOrden(e.target.value)} />
      </Field>
      {err && <p style={{ ...F, fontSize: 12, color: C.danger, margin: "8px 0 0" }}>{err}</p>}
    </Modal>
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
  const [reloadKey, setReloadKey] = useState(0);

  const tenantId = t.tenant && t.tenant.id;
  const userId = t.user && t.user.id;
  const role = t.role;
  const paisesTenant = (t.tenantConfig && t.tenantConfig.countries) || ["CO"];

  const reload = useCallback(() => setReloadKey(k => k + 1), []);

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
  }, [t.isReady, tenantId, userId, reloadKey]);

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

        {tab === "perfil"   && <TabMiPerfil   t={t} docs={docs} auths={auths} docTypes={docTypes} loading={loading} onReload={reload} />}
        {tab === "miembros" && <TabMiembros   miembros={miembros} loading={loading} tenantId={tenantId} paisesTenant={paisesTenant} role={role} onReload={reload} />}
        {tab === "catalogo" && <TabCatalogo   docTypes={docTypes} loading={loading} role={role} onReload={reload} />}
      </div>
    </div>
  );
}
