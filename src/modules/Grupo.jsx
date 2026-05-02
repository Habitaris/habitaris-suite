/**
 * modules/Grupo.jsx — Espacio raíz del tenant (nivel holding)
 *
 * Aquí se ven todos los países donde el grupo opera, el dashboard consolidado,
 * y desde aquí se "abren" nuevos países (creando la primera empresa en ese país).
 *
 * Reglas:
 *  - Solo accesible si tenant tiene 2+ países o si user lo abre explícitamente.
 *  - "Países" se derivan de companies (no se gestionan a mano).
 *  - "Abrir nuevo país" = atajo para crear empresa en un país nuevo del catálogo.
 */
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { sb } from "../core/supabase.js";
import { useTenant } from "../core/TenantContext.jsx";
import { getTenantDefaultsSync } from "../core/configHelpers.js";

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

function formatMoney(n) {
  if (!n || n === 0) return "—";
  if (n >= 1e9) return (n / 1e9).toFixed(1).replace(".0", "") + " B";
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(".0", "") + " M";
  if (n >= 1e3) return (n / 1e3).toFixed(0) + " K";
  return new Intl.NumberFormat(getTenantDefaultsSync().locale).format(n);
}

function paisFlag(p) {
  // Banderas como letras grandes en círculo (sin emojis para look profesional)
  return (
    <span style={{
      display: "inline-flex", width: 28, height: 28, alignItems: "center", justifyContent: "center",
      background: "#111", color: "#fff", borderRadius: 6, fontSize: 11, fontWeight: 700,
      letterSpacing: 0.6, ...F,
    }}>{p}</span>
  );
}

function Btn({ children, onClick, tone = "ghost", size = "md", disabled }) {
  const tones = {
    primary: { bg: "#111", color: "#fff", border: "#111", hover: "#000" },
    ghost:   { bg: "transparent", color: C.ink, border: C.border, hover: C.bgSoft },
    accent:  { bg: C.accent, color: "#fff", border: C.accent, hover: "#185435" },
  };
  const s = tones[tone] || tones.ghost;
  const padding = size === "sm" ? "6px 12px" : "9px 16px";
  const fontSize = size === "sm" ? 12 : 13;
  return (
    <button onClick={onClick} disabled={disabled}
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

function PaisCard({ pais, companies, onEnter }) {
  const empresasPais = companies.filter(c => c.pais === pais && c.type === "company");
  const utesPais = companies.filter(c => c.pais === pais && c.type === "jv");
  const totalEmp = empresasPais.length;
  return (
    <div onClick={onEnter} style={{
      background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
      padding: 22, cursor: "pointer", transition: "all .15s",
      display: "flex", flexDirection: "column", gap: 12, minHeight: 180,
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = C.ink; e.currentTarget.style.transform = "translateY(-2px)"; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = "translateY(0)"; }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {paisFlag(pais)}
        <div>
          <div style={{ ...F, fontSize: 17, fontWeight: 700, color: C.ink, letterSpacing: -0.3 }}>{paisName(pais)}</div>
          <div style={{ ...F, fontSize: 11, color: C.inkLight, marginTop: 2 }}>{pais}</div>
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
        <div style={{ ...F, fontSize: 13, color: C.inkMid }}>
          <span style={{ fontWeight: 600, color: C.ink }}>{totalEmp}</span> {totalEmp === 1 ? "empresa" : "empresas"}
          {utesPais.length > 0 && <span> · {utesPais.length} {utesPais.length === 1 ? "UTE" : "UTEs"}</span>}
        </div>
        {empresasPais.slice(0, 3).map(e => (
          <div key={e.id} style={{ ...F, fontSize: 12, color: C.inkLight, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 4, height: 4, borderRadius: "50%", background: e.status === "active" ? C.accent : C.inkLight }}></span>
            {e.display_name}
          </div>
        ))}
        {empresasPais.length > 3 && (
          <div style={{ ...F, fontSize: 11, color: C.inkLight }}>+ {empresasPais.length - 3} más</div>
        )}
      </div>
      <div style={{ ...F, fontSize: 12, fontWeight: 600, color: C.ink, marginTop: 4 }}>Entrar →</div>
    </div>
  );
}

function ModalAbrirPais({ paisesCatalogo, paisesActuales, tenantId, userId, onClose, onSave }) {
  // Países disponibles para abrir = catálogo - países que ya tiene el grupo
  const disponibles = useMemo(() => {
    const set = new Set(paisesActuales);
    return paisesCatalogo.filter(p => !set.has(p.pais));
  }, [paisesCatalogo, paisesActuales]);

  const [pais, setPais] = useState(disponibles[0]?.pais || "");
  const [legalName, setLegalName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const info = useMemo(() => disponibles.find(p => p.pais === pais), [disponibles, pais]);

  function paisToTaxIdType(p) {
    return p === "ES" ? "CIF" : p === "CO" ? "NIT" : p === "MX" ? "RFC" :
           p === "AR" ? "CUIT" : p === "PE" ? "RUC" : p === "CL" ? "RUT" : "ID";
  }

  async function submit() {
    setErr("");
    if (!pais) return setErr("Selecciona un país");
    if (!legalName.trim()) return setErr("Razón social obligatoria");
    if (!taxId.trim()) return setErr("Identificación fiscal obligatoria");

    setSaving(true);
    try {
      const slug = legalName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9 ]/g, "").trim().replace(/\s+/g, "-").substring(0, 40);
      const display = legalName.replace(/\s+(S\.?A\.?S\.?|S\.?L\.?|S\.?A\.?|LTDA\.?|INC\.?|CORP\.?|GMBH\.?|LLC\.?).*/i, "").trim() || legalName;

      const { data: nuevaEmp, error: e1 } = await sb.from("companies")
        .insert({
          tenant_id: tenantId, pais, type: "company",
          legal_name: legalName.trim(), display_name: display,
          slug, tax_id: taxId.trim(), tax_id_type: paisToTaxIdType(pais),
          divisa: info?.divisa_default || "USD", status: "active",
        })
        .select("id").single();
      if (e1) {
        if ((e1.message || "").includes("duplicate") && (e1.message || "").includes("slug")) setErr("Ya existe una empresa con ese identificador. Cambia la razón social.");
        else setErr(e1.message);
        setSaving(false); return;
      }

      // Auto-añadir la empresa nueva al membership del owner (yo)
      if (userId && nuevaEmp?.id) {
        const { data: meRow } = await sb.from("memberships")
          .select("id, empresas_acceso, paises_acceso")
          .eq("user_id", userId).eq("tenant_id", tenantId).maybeSingle();
        if (meRow) {
          const newEmps = Array.from(new Set([...(meRow.empresas_acceso || []), nuevaEmp.id]));
          const newPaises = Array.from(new Set([...(meRow.paises_acceso || []), pais]));
          await sb.from("memberships")
            .update({ empresas_acceso: newEmps, paises_acceso: newPaises })
            .eq("id", meRow.id);
        }
      }

      setSaving(false);
      onSave(); onClose();
      if (window.toast) window.toast(`País ${paisName(pais)} abierto. Empresa ${display} creada.`);
    } catch (e) { setErr(e.message || "Error"); setSaving(false); }
  }

  if (disponibles.length === 0) {
    return (
      <Modal open={true} onClose={onClose} title="Abrir nuevo país" width={420}
        footer={<Btn onClick={onClose}>Cerrar</Btn>}>
        <p style={{ ...F, fontSize: 13, color: C.inkMid, margin: 0, lineHeight: 1.6 }}>
          Tu grupo ya opera en todos los países disponibles del catálogo. Para añadir más países (México, Argentina, Perú, etc.), contacta con soporte para que se amplíe el catálogo del sistema.
        </p>
      </Modal>
    );
  }

  return (
    <Modal open={true} onClose={onClose} title="Abrir nuevo país en el grupo" width={520}
      footer={<><Btn onClick={onClose}>Cancelar</Btn><Btn tone="primary" onClick={submit} disabled={saving}>{saving ? "Creando…" : "Abrir país y crear empresa"}</Btn></>}>
      <p style={{ ...F, fontSize: 13, color: C.inkMid, margin: "0 0 18px", lineHeight: 1.6 }}>
        Para abrir un país nuevo en tu grupo necesitas <strong>crear su primera empresa</strong>. Después podrás añadir más empresas en ese mismo país desde su espacio.
      </p>

      <div style={{ marginBottom: 14 }}>
        <label style={{ ...F, display: "block", fontSize: 11, fontWeight: 600, color: C.inkMid, letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 5 }}>País</label>
        <select value={pais} onChange={e => setPais(e.target.value)} style={{
          ...F, fontSize: 13, color: C.ink, padding: "9px 11px",
          border: `1px solid ${C.border}`, borderRadius: 6, background: "#fff",
          width: "100%", boxSizing: "border-box", outline: "none", cursor: "pointer",
        }}>
          {disponibles.map(p => <option key={p.pais} value={p.pais}>{p.nombre} ({p.pais}) · {p.divisa_default}</option>)}
        </select>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={{ ...F, display: "block", fontSize: 11, fontWeight: 600, color: C.inkMid, letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 5 }}>Razón social</label>
        <input value={legalName} onChange={e => setLegalName(e.target.value)} autoFocus
          placeholder={pais === "ES" ? "Habitaris España S.L." : "Nombre legal completo"}
          style={{
            ...F, fontSize: 13, color: C.ink, padding: "9px 11px",
            border: `1px solid ${C.border}`, borderRadius: 6, background: "#fff",
            width: "100%", boxSizing: "border-box", outline: "none",
          }}/>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={{ ...F, display: "block", fontSize: 11, fontWeight: 600, color: C.inkMid, letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 5 }}>{paisToTaxIdType(pais)}</label>
        <input value={taxId} onChange={e => setTaxId(e.target.value)}
          placeholder={paisToTaxIdType(pais) === "CIF" ? "B12345678" : paisToTaxIdType(pais) === "NIT" ? "901.234.567-8" : "Identificación fiscal"}
          style={{
            ...F, fontSize: 13, color: C.ink, padding: "9px 11px",
            border: `1px solid ${C.border}`, borderRadius: 6, background: "#fff",
            width: "100%", boxSizing: "border-box", outline: "none",
          }}/>
      </div>

      {info && (
        <div style={{ ...F, fontSize: 12, color: C.inkLight, marginTop: 10, padding: "10px 12px", background: C.bgSoft, borderRadius: 6, lineHeight: 1.6 }}>
          📌 <strong>Detalles automáticos</strong>: Tipo documento <strong>{paisToTaxIdType(pais)}</strong>, divisa <strong>{info.divisa_default}</strong>, idioma <strong>{info.idioma_default || "es"}</strong>. Podrás afinar más datos (domicilio, representante legal) desde la pantalla del país.
        </div>
      )}

      {err && <p style={{ ...F, fontSize: 12, color: C.danger, margin: "12px 0 0" }}>{err}</p>}
    </Modal>
  );
}

function EmpresaCard({ empresa, onDashboard, onModules }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
      padding: 24, display: "flex", flexDirection: "column", gap: 16,
      transition: "all .15s",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ ...F, fontSize: 11, color: C.inkLight, letterSpacing: 0.4, textTransform: "uppercase", fontWeight: 600, marginBottom: 4 }}>
            {paisName(empresa.pais)} · {empresa.divisa || "—"}
          </div>
          <div style={{ ...F, fontSize: 20, fontWeight: 700, color: C.ink, letterSpacing: -0.3, lineHeight: 1.2 }}>
            {empresa.display_name || empresa.legal_name}
          </div>
          {empresa.legal_name && empresa.display_name !== empresa.legal_name && (
            <div style={{ ...F, fontSize: 12, color: C.inkLight, marginTop: 4 }}>{empresa.legal_name}</div>
          )}
        </div>
        {paisFlag(empresa.pais)}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Btn tone="primary" onClick={() => onDashboard && onDashboard(empresa)}>Dashboard</Btn>
        <Btn tone="ghost" onClick={() => onModules && onModules(empresa)}>Módulos</Btn>
      </div>
    </div>
  );
}

export default function Grupo({ onSelectCountry, onEnterCompanyDashboard, onEnterCompanyModules }) {
  const t = useTenant();
  const [companies, setCompanies] = useState([]);
  const [paisesCatalogo, setPaisesCatalogo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [showAbrirPais, setShowAbrirPais] = useState(false);

  // KPIs reales del cuadro consolidado
  const [kpis, setKpis] = useState({
    aprobacionesPendientes: null,
    facturacionYTD: null,
    plantillaTotal: null,
    utesActivas: null,
  });

  const tenantId = t.tenant && t.tenant.id;
  const userId = t.user && t.user.id;
  const role = t.role;
  const tenantName = (t.tenant && (t.tenant.display_name || t.tenant.legal_name || t.tenant.id)) || "Grupo";

  const reload = useCallback(() => setReloadKey(k => k + 1), []);

  useEffect(() => {
    // Si TenantContext ya cargó companies, usar esa fuente como verdad inicial
    // y solo refrescar si reloadKey>0 o necesitamos paisesCatalogo
    if (!t.isReady || !tenantId) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [r1, r2] = await Promise.all([
          sb.from("companies").select("*").eq("tenant_id", tenantId).order("pais").order("display_name"),
          sb.from("country_configs").select("*").order("nombre"),
        ]);
        if (cancelled) return;
        setCompanies(r1.data || []);
        setPaisesCatalogo(r2.data || []);
      } finally { if (!cancelled) setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, [t.isReady, tenantId, reloadKey]);

  // Carga de KPIs en paralelo. Cada KPI falla independientemente: si una API
  // no responde, esa KPI queda en "—" pero el resto se muestra.
  useEffect(() => {
    if (!t.isReady) return;
    let cancelled = false;
    const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString();

    // Plantilla total — empleados activos (estado completado)
    fetch("/api/hiring?estado=completado")
      .then(r => r.json())
      .then(d => { if (!cancelled) setKpis(k => ({ ...k, plantillaTotal: (d && d.ok && Array.isArray(d.data)) ? d.data.length : 0 })); })
      .catch(() => { if (!cancelled) setKpis(k => ({ ...k, plantillaTotal: 0 })); });

    // Aprobaciones pendientes — novedades en estado pendiente
    fetch("/api/novelties")
      .then(r => r.json())
      .then(d => {
        if (cancelled) return;
        const list = (d && d.ok && Array.isArray(d.data)) ? d.data : [];
        const pendientes = list.filter(n => (n.estado || "").toLowerCase() === "pendiente").length;
        setKpis(k => ({ ...k, aprobacionesPendientes: pendientes }));
      })
      .catch(() => { if (!cancelled) setKpis(k => ({ ...k, aprobacionesPendientes: 0 })); });

    // Facturación YTD — sumar valor_total de ofertas aprobadas del año en curso
    (async () => {
      try {
        const { data } = await sb
          .from("crm_ofertas")
          .select("valor_total, estado, created_at")
          .gte("created_at", yearStart)
          .in("estado", ["aprobada", "ganada", "cerrada"]);
        if (cancelled) return;
        const total = (data || []).reduce((acc, o) => acc + (Number(o.valor_total) || 0), 0);
        setKpis(k => ({ ...k, facturacionYTD: total }));
      } catch {
        if (!cancelled) setKpis(k => ({ ...k, facturacionYTD: 0 }));
      }
    })();

    return () => { cancelled = true; };
  }, [t.isReady, reloadKey]);

  const empresasPropias = useMemo(() => companies.filter(c => c.type === "company"), [companies]);
  const utes = useMemo(() => companies.filter(c => c.type === "jv"), [companies]);
  const paisesActivos = useMemo(() => {
    return Array.from(new Set(empresasPropias.map(c => c.pais).filter(Boolean))).sort();
  }, [empresasPropias]);

  const totalEmpresas = empresasPropias.length;
  const totalUTEs = utes.length;

  // Topología: empty | single (1×1) | country_multi (1 país, varias empresas) | multi_country (varios países)
  const topology = useMemo(() => {
    if (paisesActivos.length === 0) return "empty";
    if (totalEmpresas === 1) return "single";
    if (paisesActivos.length === 1) return "country_multi";
    return "multi_country";
  }, [paisesActivos.length, totalEmpresas]);

  if (!t.isReady) return <div style={{ padding: 40, ...F, color: C.inkLight, textAlign: "center" }}>Cargando…</div>;

  const canManage = role === "owner" || role === "admin";

  return (
    <div style={{ ...F }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 32px 60px" }}>

        {/* Header — sin botones a la derecha. Crear país se hace desde Configuración del Grupo. */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ ...F, fontSize: 11, color: C.inkLight, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 600, marginBottom: 6 }}>Espacio Grupo</div>
          <h1 style={{ ...F, fontSize: 32, fontWeight: 700, color: C.ink, margin: 0, letterSpacing: -0.6 }}>{tenantName}</h1>
          <p style={{ ...F, fontSize: 13, color: C.inkMid, margin: "6px 0 0" }}>
            {paisesActivos.length} {paisesActivos.length === 1 ? "país" : "países"} · {totalEmpresas} {totalEmpresas === 1 ? "empresa" : "empresas"}{totalUTEs > 0 && <> · {totalUTEs} {totalUTEs === 1 ? "UTE" : "UTEs"}</>}
          </p>
        </div>

        {/* Cuadro consolidado — KPIs en vivo */}
        <div style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
          padding: 24, marginBottom: 36,
        }}>
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ ...F, fontSize: 16, fontWeight: 600, color: C.ink, margin: 0 }}>Cuadro consolidado</h2>
            <p style={{ ...F, fontSize: 11, color: C.inkLight, margin: "4px 0 0" }}>
              {totalEmpresas === 1 ? "Datos agregados de tu empresa" : `Datos agregados de ${totalEmpresas} ${totalEmpresas === 1 ? "empresa" : "empresas"}${paisesActivos.length > 1 ? ` en ${paisesActivos.length} países` : ""}`}
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
            {[
              {
                label: "Aprobaciones pendientes",
                value: kpis.aprobacionesPendientes === null ? "…" : String(kpis.aprobacionesPendientes),
                hint: kpis.aprobacionesPendientes === null ? "cargando" : (kpis.aprobacionesPendientes > 0 ? "requieren tu atención" : "todo al día"),
              },
              {
                label: "Facturación del año",
                value: kpis.facturacionYTD === null ? "…" : (kpis.facturacionYTD > 0 ? formatMoney(kpis.facturacionYTD) : "—"),
                hint: paisesActivos.length > 1 ? "todas las divisas" : (companies[0]?.divisa || "divisa local"),
              },
              {
                label: "Plantilla total",
                value: kpis.plantillaTotal === null ? "…" : String(kpis.plantillaTotal),
                hint: kpis.plantillaTotal === null ? "cargando" : (kpis.plantillaTotal === 1 ? "empleado activo" : "empleados activos"),
              },
              {
                label: "UTEs activas",
                value: totalUTEs.toString(),
                hint: totalUTEs === 0 ? "ninguna en curso" : (totalUTEs === 1 ? "consorcio en curso" : "consorcios en curso"),
              },
            ].map((kpi, i) => (
              <div key={i} style={{ padding: 14, background: C.bgSoft, borderRadius: 8 }}>
                <div style={{ ...F, fontSize: 11, color: C.inkLight, letterSpacing: 0.4, textTransform: "uppercase", fontWeight: 600 }}>{kpi.label}</div>
                <div style={{ ...F, fontSize: 22, color: C.ink, fontWeight: 700, marginTop: 4 }}>{kpi.value}</div>
                <div style={{ ...F, fontSize: 10, color: C.inkLight, marginTop: 2 }}>{kpi.hint}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Render adaptativo según topología */}
        {loading ? (
          <div style={{ padding: 40, ...F, color: C.inkLight, textAlign: "center" }}>Cargando…</div>
        ) : topology === "empty" ? (
          <div style={{
            background: C.card, border: `1px dashed ${C.border}`, borderRadius: 12,
            padding: 60, textAlign: "center"
          }}>
            <div style={{ ...F, fontSize: 14, color: C.ink, fontWeight: 600 }}>Tu grupo aún no tiene empresas</div>
            <div style={{ ...F, fontSize: 13, color: C.inkMid, margin: "8px 0 18px" }}>
              Las empresas se crean desde el módulo Configuración del Grupo → Estructura legal.
            </div>
          </div>
        ) : topology === "single" ? (
          // 1×1 — Card grande de la única empresa
          <div>
            <div style={{ marginBottom: 14 }}>
              <h2 style={{ ...F, fontSize: 16, fontWeight: 600, color: C.ink, margin: "0 0 4px" }}>Tu empresa</h2>
              <p style={{ ...F, fontSize: 12, color: C.inkMid, margin: 0 }}>
                Entra al dashboard de la empresa o accede a sus módulos operativos.
              </p>
            </div>
            <EmpresaCard
              empresa={empresasPropias[0]}
              onDashboard={onEnterCompanyDashboard}
              onModules={onEnterCompanyModules}
            />
          </div>
        ) : topology === "country_multi" ? (
          // 1 país, N empresas — saltamos la capa país, vamos directo a empresas
          <div>
            <div style={{ marginBottom: 14 }}>
              <h2 style={{ ...F, fontSize: 16, fontWeight: 600, color: C.ink, margin: "0 0 4px" }}>Tus empresas en {paisName(paisesActivos[0])}</h2>
              <p style={{ ...F, fontSize: 12, color: C.inkMid, margin: 0 }}>
                Entra a cualquiera para ver su dashboard o sus módulos.
              </p>
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: 18,
            }}>
              {empresasPropias.map(emp => (
                <EmpresaCard
                  key={emp.id}
                  empresa={emp}
                  onDashboard={onEnterCompanyDashboard}
                  onModules={onEnterCompanyModules}
                />
              ))}
            </div>
          </div>
        ) : (
          // multi_country — empresas como protagonistas, agrupadas visualmente por país.
          // Click en empresa → dashboard/módulos. El país solo es un agrupador visual.
          <div>
            <div style={{ marginBottom: 14 }}>
              <h2 style={{ ...F, fontSize: 16, fontWeight: 600, color: C.ink, margin: "0 0 4px" }}>Tus empresas</h2>
              <p style={{ ...F, fontSize: 12, color: C.inkMid, margin: 0 }}>
                Operas en {paisesActivos.length} países. Entra a cualquier empresa para ver su dashboard o sus módulos.
              </p>
            </div>
            {paisesActivos.map(p => {
              const empresasDePais = empresasPropias.filter(e => e.pais === p);
              if (empresasDePais.length === 0) return null;
              return (
                <div key={p} style={{ marginBottom: 28 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>
                    {paisFlag(p)}
                    <h3 style={{ ...F, fontSize: 14, fontWeight: 600, color: C.ink, margin: 0, letterSpacing: -0.2 }}>{paisName(p)}</h3>
                    <span style={{ ...F, fontSize: 11, color: C.inkLight, fontWeight: 500 }}>
                      · {empresasDePais.length} {empresasDePais.length === 1 ? "empresa" : "empresas"}
                    </span>
                  </div>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                    gap: 18,
                  }}>
                    {empresasDePais.map(emp => (
                      <EmpresaCard
                        key={emp.id}
                        empresa={emp}
                        onDashboard={onEnterCompanyDashboard}
                        onModules={onEnterCompanyModules}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer informativo */}
        <div style={{ marginTop: 48, padding: "20px 0", borderTop: `1px solid ${C.border}`, ...F, fontSize: 11, color: C.inkLight, textAlign: "center", letterSpacing: 0.4 }}>
          {tenantName} · espacio grupo · gestión multi-país y multi-empresa
        </div>
      </div>

      {showAbrirPais && (
        <ModalAbrirPais
          paisesCatalogo={paisesCatalogo}
          paisesActuales={paisesActivos}
          tenantId={tenantId}
          userId={userId}
          onClose={() => setShowAbrirPais(false)}
          onSave={reload}
        />
      )}
    </div>
  );
}
