import React, { useState, useEffect, useMemo, useCallback } from "react";

/* ═══════════════════════════════════════════════════════════════
   LIQUIDADOR DE NÓMINA — HABITARIS SUITE
   Motor completo · Colombia 2026 · Integrado con Supabase
   ═══════════════════════════════════════════════════════════════ */

// ─── CONSTANTS 2026 ──────────────────────────────────────────
const SMLMV = 1_750_905;
const AUX_TR = 249_095;
const UVT = 49_799;
const ARL_OPTS = [
  { n: "I",  t: 0.00522, label: "I — Mínimo (oficina)" },
  { n: "II", t: 0.01044, label: "II — Bajo" },
  { n: "III",t: 0.02436, label: "III — Medio" },
  { n: "IV", t: 0.04350, label: "IV — Alto" },
  { n: "V",  t: 0.06960, label: "V — Máximo" },
];
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const FESTIVOS_2026 = [
  "2026-01-01","2026-01-12","2026-03-23","2026-04-02","2026-04-03",
  "2026-05-01","2026-05-18","2026-06-08","2026-06-15","2026-06-29",
  "2026-07-20","2026-08-07","2026-08-17","2026-10-12","2026-11-02",
  "2026-11-16","2026-12-08","2026-12-25",
];

// ─── SUPABASE ────────────────────────────────────────────────
const SB = "https://xlzkasdskatnikuavefh.supabase.co";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhsemthc2Rzc2thdG5pa3VhdmVmaCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzQwMTUyOTk3LCJleHAiOjIwNTU3Mjg5OTd9.DP5x1hNbnTSzIFRMFOG7tYbykaAJMc6BRXYC_dFNFgE";
const SBH = { "Content-Type": "application/json", apikey: KEY, Authorization: "Bearer " + KEY };

async function fetchEmps() {
  try {
    const r = await fetch(SB + "/rest/v1/hiring_processes?estado=in.(firmado,afiliaciones_pendientes,completado)&select=*", { headers: SBH });
    const d = await r.json();
    return Array.isArray(d) ? d : [];
  } catch { return []; }
}
async function loadN(a, m) {
  try {
    const r = await fetch(SB + `/rest/v1/kv_store?key=eq.hab:nomina:${a}:${m}&select=value`, { headers: SBH });
    const d = await r.json();
    return d?.[0]?.value ? JSON.parse(d[0].value) : [];
  } catch { return []; }
}
async function saveN(a, m, data) {
  await fetch(SB + "/rest/v1/kv_store", {
    method: "POST",
    headers: { ...SBH, Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify({ key: `hab:nomina:${a}:${m}`, value: JSON.stringify(data), tenant_id: "habitaris" }),
  });
}

// ─── HELPERS ─────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 10);
const fmt = (n) => n == null || isNaN(n) ? "$0" : "$" + Math.round(n).toLocaleString("es-CO");
const fmtN = (n) => Math.round(n || 0).toLocaleString("es-CO");
const pct = (n) => (n * 100).toFixed(2) + "%";

// ─── CALCULATION ENGINE ──────────────────────────────────────
function calcN(n) {
  const { sal = 0, bono = 0, dias = 30, arl = 0, ex114 = true,
    hexDiurna = 0, hexNocturna = 0, hexDomDiurna = 0, hexDomNocturna = 0,
    festivosLab = 0, diasIncap = 0, diasLicNR = 0, otrasDed = 0, otrosIng = 0,
    anticipoPct = 0.5 } = n;

  const base30 = 30;
  const ratio = dias / base30;

  // Valor hora (base 240h/mes = 30d × 8h)
  const valHora = sal / 240;

  // ── DEVENGADO ──
  const salProp = sal * ratio;
  const aplAux = sal <= 2 * SMLMV;
  const auxProp = aplAux ? AUX_TR * ratio : 0;
  const bonoProp = bono * ratio;

  // Horas extra
  const heD = hexDiurna * valHora * 1.25;
  const heN = hexNocturna * valHora * 1.75;
  const heDD = hexDomDiurna * valHora * 2.0;
  const heDN = hexDomNocturna * valHora * 2.5;
  const totalHE = heD + heN + heDD + heDN;

  // Recargo festivos
  const recFest = festivosLab * valHora * 8 * 0.75;

  // IBC — NO incluye aux transporte ni bonos Art.128
  const ibc = Math.max(salProp + totalHE + recFest, SMLMV * ratio);
  const ibcARL = Math.max(ibc, SMLMV * ratio);

  // Total devengado
  const totalDevSalarial = salProp + totalHE + recFest;
  const totalDevNoSalarial = auxProp + bonoProp + otrosIng;
  const totalDev = totalDevSalarial + totalDevNoSalarial;

  // ── DEDUCCIONES EMPLEADO ──
  const epsE = ibc * 0.04;
  const penE = ibc * 0.04;
  // Retención fuente simplificada
  let reteF = 0;
  const uvtM = ibc / UVT;
  if (uvtM > 95) reteF = (uvtM - 95) * UVT * 0.19;
  const totDed = epsE + penE + reteF + otrasDed;

  // ── NETO ──
  const neto = totalDev - totDed;

  // ── QUINCENAL ──
  const q1 = Math.round(sal * anticipoPct);
  const q2 = neto - q1;

  // ── APORTES EMPLEADOR ──
  const enSM = sal / SMLMV;
  const exS = ex114 && enSM < 10;
  const tasa = ARL_OPTS[arl]?.t || 0.00522;
  const epsEr = exS ? 0 : ibc * 0.085;
  const penEr = ibc * 0.12;
  const arlV = ibcARL * tasa;
  const caja = ibc * 0.04;
  const icbf = exS ? 0 : ibc * 0.03;
  const sena = exS ? 0 : ibc * 0.02;
  const totAp = epsEr + penEr + arlV + caja + icbf + sena;

  // ── PROVISIONES ──
  const bProv = salProp + auxProp; // Prima y cesantías incluyen aux
  const prima = bProv / 12;
  const ces = bProv / 12;
  const intC = ces * 0.12;
  const vac = salProp * (15 / 360); // Vacaciones NO incluye aux
  const totProv = prima + ces + intC + vac;

  // ── COSTO TOTAL ──
  const costoT = totalDev + totAp + totProv;
  const factorP = salProp > 0 ? costoT / salProp : 0;

  return {
    // Devengado
    salProp, auxProp, bonoProp, totalHE, heD, heN, heDD, heDN, recFest,
    valHora, ibc, ibcARL, totalDevSalarial, totalDevNoSalarial, totalDev,
    aplAux, ratio,
    // Deducciones
    epsE, penE, reteF, totDed, otrasDed,
    // Neto
    neto, q1, q2,
    // Empleador
    epsEr, penEr, arlV, tasa, caja, icbf, sena, totAp, exS,
    // Provisiones
    prima, ces, intC, vac, totProv, bProv,
    // Total
    costoT, factorP,
  };
}

// ─── DESIGN TOKENS (match RRHH.jsx) ─────────────────────────
const T = {
  bg: "#F5F4F1", surface: "#FFFFFF", surfaceAlt: "#FAFAF8",
  ink: "#111111", inkMid: "#555555", inkLight: "#909090", inkXLight: "#C8C5BE",
  border: "#E0E0E0", accent: "#EDEBE7",
  green: "#111111", greenBg: "#E8F4EE",
  red: "#B91C1C", redBg: "#FAE8E8",
  amber: "#8C6A00", amberBg: "#FAF0E0",
  blue: "#3B3B3B", blueBg: "#F0F0F0",
  purple: "#7C3AED", purpleBg: "#F5F3FF",
  shadow: "0 1px 3px rgba(0,0,0,.06)",
};

// ─── UI COMPONENTS ───────────────────────────────────────────
const Card = ({ children, style, accent }) => (
  <div style={{
    background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8,
    marginBottom: 12, overflow: "hidden", boxShadow: T.shadow,
    borderLeft: accent ? `3px solid ${accent}` : undefined, ...style,
  }}>{children}</div>
);
const CardHead = ({ children, right }) => (
  <div style={{ padding: "10px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
    <span style={{ fontSize: 12, fontWeight: 700 }}>{children}</span>
    {right && <span style={{ fontSize: 13, fontWeight: 700 }}>{right}</span>}
  </div>
);
const CardBody = ({ children }) => <div style={{ padding: "14px 16px" }}>{children}</div>;

const Lbl = ({ children }) => (
  <label style={{ fontSize: 10, fontWeight: 600, color: T.inkLight, letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 4 }}>{children}</label>
);
const Inp = ({ label, value, onChange, type = "text", disabled, suffix, style: sx, ...rest }) => (
  <div style={{ marginBottom: 10, ...sx }}>
    {label && <Lbl>{label}</Lbl>}
    <div style={{ position: "relative" }}>
      <input type={type} value={value}
        onChange={e => onChange(type === "number" ? parseFloat(e.target.value) || 0 : e.target.value)}
        disabled={disabled}
        style={{
          width: "100%", boxSizing: "border-box",
          border: `1px solid ${T.border}`, borderRadius: 6,
          padding: "7px 10px", paddingRight: suffix ? 36 : undefined,
          fontSize: 13, fontFamily: "'DM Sans',sans-serif",
          background: disabled ? T.accent : "#fff", color: T.ink, outline: "none",
        }}
        {...rest}
      />
      {suffix && <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 10, color: T.inkLight, fontFamily: "'DM Mono',monospace" }}>{suffix}</span>}
    </div>
  </div>
);
const Sel = ({ label, value, onChange, options, disabled, style: sx }) => (
  <div style={{ marginBottom: 10, ...sx }}>
    {label && <Lbl>{label}</Lbl>}
    <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
      style={{ width: "100%", border: `1px solid ${T.border}`, borderRadius: 6, padding: "7px 10px", fontSize: 13, fontFamily: "'DM Sans',sans-serif", background: disabled ? T.accent : "#fff", color: T.ink, outline: "none" }}>
      {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  </div>
);

const Row = ({ l, v, color, bold, sub, indent }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: `${sub ? 3 : 5}px ${indent ? 10 : 0}px` }}>
    <span style={{ fontSize: sub ? 10 : 12, color: sub ? T.inkLight : (color || T.inkMid), fontWeight: bold ? 700 : 400 }}>
      {indent && <span style={{ color: T.inkXLight, marginRight: 5 }}>└</span>}{l}
    </span>
    <span style={{ fontSize: sub ? 10 : 13, fontWeight: bold ? 800 : 600, color: color || T.ink, fontFamily: "'DM Mono',monospace" }}>
      {fmt(v)}
    </span>
  </div>
);
const Divider = () => <div style={{ height: 1, background: T.border, margin: "8px 0" }} />;

const Pill = ({ estado }) => {
  const m = { borrador: { bg: T.accent, c: T.inkMid }, aprobada: { bg: T.greenBg, c: "#1E6B42" }, pagada: { bg: "#E8E8E8", c: T.ink } };
  const s = m[estado] || m.borrador;
  return <span style={{ padding: "2px 10px", borderRadius: 10, fontSize: 10, fontWeight: 700, background: s.bg, color: s.c, textTransform: "uppercase", letterSpacing: 0.5 }}>{estado}</span>;
};
const Btn = ({ children, onClick, primary, small, disabled, style: sx }) => (
  <button onClick={onClick} disabled={disabled} style={{
    padding: small ? "4px 12px" : "7px 16px", borderRadius: 6, border: "none", cursor: disabled ? "default" : "pointer",
    fontSize: small ? 11 : 12, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", opacity: disabled ? 0.5 : 1,
    ...(primary ? { background: T.ink, color: "#fff" } : { background: T.accent, color: T.ink, border: `1px solid ${T.border}` }),
    ...sx,
  }}>{children}</button>
);
const KpiBox = ({ label, value, color }) => (
  <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "14px 16px", flex: 1, boxShadow: T.shadow }}>
    <div style={{ fontSize: 9, fontWeight: 700, color: T.inkLight, letterSpacing: 1, textTransform: "uppercase" }}>{label}</div>
    <div style={{ fontSize: 18, fontWeight: 800, color: color || T.ink, marginTop: 4, fontFamily: "'DM Mono',monospace" }}>{value}</div>
  </div>
);

// ─── MAIN COMPONENT ──────────────────────────────────────────
export function TabNomina() {
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth());
  const [noms, setNoms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [guard, setGuard] = useState(false);
  const [sel, setSel] = useState(null);
  const [vista, setVista] = useState("lista"); // lista | detalle | colilla
  const [subTab, setSubTab] = useState("liquidacion"); // liquidacion | quincenal | empleador

  // Load employees + saved nómina
  useEffect(() => {
    setLoading(true);
    Promise.all([fetchEmps(), loadN(anio, mes)]).then(([emps, saved]) => {
      const ex = saved || [];
      const lista = emps.map(e => {
        const f = ex.find(n => n.empId === e.id);
        if (f) return f;
        return {
          id: uid(), empId: e.id,
          nombre: e.candidato_nombre || "",
          cc: e.candidato_cc || "",
          cargo: e.cargo || "",
          sal: e.salario_neto || 0,
          bono: e.bono_no_salarial || 0,
          dias: 30, arl: 0, ex114: true,
          hexDiurna: 0, hexNocturna: 0, hexDomDiurna: 0, hexDomNocturna: 0,
          festivosLab: 0, diasIncap: 0, diasLicNR: 0,
          otrasDed: 0, otrasDeducConcepto: "",
          otrosIng: 0, otrosIngConcepto: "",
          anticipoPct: 0.5, // 50% SMLMV modelo Habitaris
          nov: "",
          estado: "borrador",
          eps: e.candidato_eps || "",
          pen: e.candidato_pension || "",
          banco: e.entidadBancaria || "",
          cuenta: e.cuentaBancaria || "",
          anio, mes,
        };
      });
      setNoms(lista);
      setLoading(false);
    });
  }, [anio, mes]);

  const selN = useMemo(() => noms.find(n => n.id === sel), [noms, sel]);
  const calc = useMemo(() => selN ? calcN(selN) : null, [selN]);
  const upd = (id, f) => setNoms(p => p.map(n => n.id === id ? { ...n, ...f } : n));

  const guardar = async () => {
    setGuard(true);
    await saveN(anio, mes, noms);
    setGuard(false);
    alert("✅ Nómina guardada");
  };

  // Totals
  const totales = useMemo(() => {
    let neto = 0, costo = 0, dev = 0;
    noms.forEach(n => { const c = calcN(n); neto += c.neto; costo += c.costoT; dev += c.totalDev; });
    return { neto, costo, dev };
  }, [noms]);

  // Festivos del mes
  const festivosMes = FESTIVOS_2026.filter(f => {
    const d = new Date(f); return d.getMonth() === mes && d.getFullYear() === anio;
  });

  const editable = selN?.estado === "borrador";

  // ══════════ VISTA: COLILLA ══════════
  if (vista === "colilla" && selN && calc) return (
    <div style={{ padding: 24, maxWidth: 700, margin: "0 auto" }}>
      <Btn onClick={() => setVista("detalle")} style={{ marginBottom: 16 }}>← Volver al detalle</Btn>

      <Card style={{ border: `2px solid ${T.ink}`, padding: "24px 28px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", borderBottom: `2px solid ${T.ink}`, paddingBottom: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: 2 }}>HABITARIS S.A.S</div>
          <div style={{ fontSize: 9, color: T.inkMid, marginTop: 2 }}>NIT: 901.692.537-1</div>
          <div style={{ fontSize: 13, fontWeight: 700, marginTop: 8, letterSpacing: 1 }}>COMPROBANTE DE NÓMINA</div>
          <div style={{ fontSize: 11, color: T.inkMid }}>{MESES[mes]} {anio}</div>
        </div>

        {/* Datos empleado */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginBottom: 14, fontSize: 10 }}>
          <div><span style={{ color: T.inkLight }}>Nombre: </span><strong>{selN.nombre}</strong></div>
          <div><span style={{ color: T.inkLight }}>Documento: </span><strong>{selN.cc}</strong></div>
          <div><span style={{ color: T.inkLight }}>Cargo: </span>{selN.cargo}</div>
          <div><span style={{ color: T.inkLight }}>Días laborados: </span><strong>{selN.dias}/30</strong></div>
        </div>

        {/* Tabla */}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, fontFamily: "'DM Mono',monospace" }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${T.ink}`, borderTop: `1px solid ${T.border}` }}>
              <th style={{ padding: "6px 8px", textAlign: "left", fontSize: 9, fontWeight: 700, color: T.inkLight, letterSpacing: 1 }}>CONCEPTO</th>
              <th style={{ padding: "6px 8px", textAlign: "right", fontSize: 9, fontWeight: 700, color: "#1E6B42", letterSpacing: 1 }}>DEVENGADO</th>
              <th style={{ padding: "6px 8px", textAlign: "right", fontSize: 9, fontWeight: 700, color: T.red, letterSpacing: 1 }}>DEDUCCIÓN</th>
            </tr>
          </thead>
          <tbody>
            {[
              { c: "Salario básico", d: calc.salProp, dd: 0 },
              calc.auxProp > 0 && { c: "Auxilio de transporte", d: calc.auxProp, dd: 0 },
              calc.bonoProp > 0 && { c: "Bono asistencia (Art.128)", d: calc.bonoProp, dd: 0 },
              calc.totalHE > 0 && { c: "Horas extra", d: calc.totalHE, dd: 0 },
              calc.recFest > 0 && { c: "Recargo festivos", d: calc.recFest, dd: 0 },
              selN.otrosIng > 0 && { c: selN.otrosIngConcepto || "Otros ingresos", d: selN.otrosIng, dd: 0 },
              { c: "EPS empleado (4%)", d: 0, dd: calc.epsE },
              { c: "Pensión empleado (4%)", d: 0, dd: calc.penE },
              calc.reteF > 0 && { c: "Retención en fuente", d: 0, dd: calc.reteF },
              selN.otrasDed > 0 && { c: selN.otrasDeducConcepto || "Otras deducciones", d: 0, dd: selN.otrasDed },
            ].filter(Boolean).map((r, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${T.border}` }}>
                <td style={{ padding: "5px 8px", color: T.inkMid, fontFamily: "'DM Sans',sans-serif" }}>{r.c}</td>
                <td style={{ padding: "5px 8px", textAlign: "right", color: r.d > 0 ? T.ink : T.inkXLight }}>{r.d > 0 ? fmt(r.d) : "—"}</td>
                <td style={{ padding: "5px 8px", textAlign: "right", color: r.dd > 0 ? T.red : T.inkXLight }}>{r.dd > 0 ? fmt(r.dd) : "—"}</td>
              </tr>
            ))}
            <tr style={{ borderTop: `2px solid ${T.ink}`, fontWeight: 700 }}>
              <td style={{ padding: "8px", fontSize: 12 }}>TOTALES</td>
              <td style={{ padding: "8px", textAlign: "right", color: "#1E6B42", fontSize: 12 }}>{fmt(calc.totalDev)}</td>
              <td style={{ padding: "8px", textAlign: "right", color: T.red, fontSize: 12 }}>{fmt(calc.totDed)}</td>
            </tr>
          </tbody>
        </table>

        {/* NETO */}
        <div style={{ background: T.ink, color: "#fff", borderRadius: 6, padding: "14px 20px", marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>NETO A PAGAR</div>
            <div style={{ fontSize: 9, opacity: 0.6, marginTop: 2 }}>Q1: {fmt(calc.q1)} + Q2: {fmt(calc.q2)}</div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "'DM Mono',monospace" }}>{fmt(calc.neto)}</div>
        </div>

        {/* Split Q1/Q2 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
          <div style={{ background: T.blueBg, borderRadius: 4, padding: "10px 14px", textAlign: "center" }}>
            <div style={{ fontSize: 8, fontWeight: 700, color: T.blue, letterSpacing: 1, textTransform: "uppercase" }}>Q1 — 15/{MESES[mes]?.slice(0, 3)}</div>
            <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "'DM Mono',monospace" }}>{fmt(calc.q1)}</div>
          </div>
          <div style={{ background: T.greenBg, borderRadius: 4, padding: "10px 14px", textAlign: "center" }}>
            <div style={{ fontSize: 8, fontWeight: 700, color: "#1E6B42", letterSpacing: 1, textTransform: "uppercase" }}>Q2 — Fin/{MESES[mes]?.slice(0, 3)}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: calc.q2 >= 0 ? "#1E6B42" : T.red, fontFamily: "'DM Mono',monospace" }}>{fmt(calc.q2)}</div>
          </div>
        </div>

        {/* Firmas */}
        <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 30 }}>
          <div style={{ textAlign: "center", paddingTop: 30, borderTop: `1px solid ${T.ink}` }}>
            <div style={{ fontSize: 9, fontWeight: 600 }}>Empleador</div>
            <div style={{ fontSize: 8, color: T.inkLight }}>Habitaris S.A.S</div>
          </div>
          <div style={{ textAlign: "center", paddingTop: 30, borderTop: `1px solid ${T.ink}` }}>
            <div style={{ fontSize: 9, fontWeight: 600 }}>Trabajador</div>
            <div style={{ fontSize: 8, color: T.inkLight }}>{selN.nombre}</div>
          </div>
        </div>
      </Card>
    </div>
  );

  // ══════════ VISTA: DETALLE ══════════
  if (vista === "detalle" && selN && calc) return (
    <div className="fade-up" style={{ padding: 24, maxWidth: 960, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <Btn onClick={() => { setVista("lista"); setSel(null); }}>← Volver</Btn>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{selN.nombre}</div>
          <div style={{ fontSize: 11, color: T.inkLight }}>{selN.cargo} · {MESES[mes]} {anio} · {selN.dias}/30 días</div>
        </div>
        <Btn onClick={() => setVista("colilla")} small>🧾 Colilla</Btn>
        {editable && <Btn onClick={() => upd(selN.id, { estado: "aprobada" })} primary small>✓ Aprobar</Btn>}
        {selN.estado === "aprobada" && <Btn onClick={() => upd(selN.id, { estado: "pagada" })} primary small>💰 Marcar pagada</Btn>}
        <Btn onClick={guardar} primary small disabled={guard}>{guard ? "…" : "💾"}</Btn>
        <Pill estado={selN.estado} />
      </div>

      {/* Sub-tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 16 }}>
        {[
          { id: "liquidacion", l: "📋 Liquidación" },
          { id: "quincenal", l: "💵 Q1 / Q2" },
          { id: "empleador", l: "🏢 Costo empleador" },
        ].map((t, i) => (
          <button key={t.id} onClick={() => setSubTab(t.id)} style={{
            padding: "8px 16px", fontSize: 11, fontWeight: subTab === t.id ? 700 : 500,
            border: `1px solid ${T.border}`, borderLeft: i > 0 ? "none" : undefined,
            borderRadius: i === 0 ? "6px 0 0 6px" : i === 2 ? "0 6px 6px 0" : 0,
            background: subTab === t.id ? T.ink : "#fff", color: subTab === t.id ? "#fff" : T.inkMid,
            cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
          }}>{t.l}</button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 14 }}>
        {/* ── SIDEBAR: PARÁMETROS ── */}
        <div>
          <Card accent={T.ink}>
            <CardHead>Parámetros</CardHead>
            <CardBody>
              <Inp label="Salario base" type="number" value={selN.sal} onChange={v => upd(selN.id, { sal: v })} disabled={!editable} suffix="COP" />
              <Inp label="Bono asistencia (Art.128)" type="number" value={selN.bono} onChange={v => upd(selN.id, { bono: v })} disabled={!editable} suffix="COP" />
              <Inp label="Días laborados" type="number" value={selN.dias} onChange={v => upd(selN.id, { dias: v })} disabled={!editable} suffix="/30" min="0" max="30" />
              <Sel label="Nivel ARL" value={selN.arl} onChange={v => upd(selN.id, { arl: parseInt(v) })} disabled={!editable}
                options={ARL_OPTS.map((a, i) => ({ v: i, l: `${a.label} (${pct(a.t)})` }))} />
              <Inp label="Anticipo Q1 (% salario)" type="number" value={Math.round(selN.anticipoPct * 100)} onChange={v => upd(selN.id, { anticipoPct: v / 100 })} disabled={!editable} suffix="%" min="0" max="100" />
            </CardBody>
          </Card>

          <Card accent={T.amber}>
            <CardHead>Novedades</CardHead>
            <CardBody>
              <Inp label="Festivos laborados" type="number" value={selN.festivosLab} onChange={v => upd(selN.id, { festivosLab: v })} disabled={!editable} suffix="días" min="0" />
              {festivosMes.length > 0 && (
                <div style={{ fontSize: 9, color: T.amber, background: T.amberBg, borderRadius: 4, padding: "5px 8px", marginTop: -4, marginBottom: 10 }}>
                  📅 Festivos {MESES[mes]}: {festivosMes.map(f => new Date(f).getDate()).join(", ")}
                </div>
              )}
              <Inp label="Días incapacidad" type="number" value={selN.diasIncap} onChange={v => upd(selN.id, { diasIncap: v })} disabled={!editable} min="0" />
              <Inp label="Días lic. NO remunerada" type="number" value={selN.diasLicNR} onChange={v => upd(selN.id, { diasLicNR: v })} disabled={!editable} min="0" />
              <Inp label="Otras deducciones" type="number" value={selN.otrasDed} onChange={v => upd(selN.id, { otrasDed: v })} disabled={!editable} suffix="COP" />
              <Inp label="Otros ingresos" type="number" value={selN.otrosIng} onChange={v => upd(selN.id, { otrosIng: v })} disabled={!editable} suffix="COP" />
            </CardBody>
          </Card>

          <Card accent={T.purple}>
            <CardHead>Horas extra</CardHead>
            <CardBody>
              <Inp label="HE diurna (×1.25)" type="number" value={selN.hexDiurna} onChange={v => upd(selN.id, { hexDiurna: v })} disabled={!editable} suffix="h" min="0" />
              <Inp label="HE nocturna (×1.75)" type="number" value={selN.hexNocturna} onChange={v => upd(selN.id, { hexNocturna: v })} disabled={!editable} suffix="h" min="0" />
              <Inp label="HE dom/fest diurna (×2.0)" type="number" value={selN.hexDomDiurna} onChange={v => upd(selN.id, { hexDomDiurna: v })} disabled={!editable} suffix="h" min="0" />
              <Inp label="HE dom/fest nocturna (×2.5)" type="number" value={selN.hexDomNocturna} onChange={v => upd(selN.id, { hexDomNocturna: v })} disabled={!editable} suffix="h" min="0" />
              {calc.totalHE > 0 && <div style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: T.purple, fontWeight: 700, marginTop: 4 }}>Total HE: {fmt(calc.totalHE)}</div>}
            </CardBody>
          </Card>
        </div>

        {/* ── MAIN CONTENT ── */}
        <div>
          {/* KPI bar */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
            <KpiBox label="Devengado" value={fmt(calc.totalDev)} />
            <KpiBox label="Deducciones" value={fmt(calc.totDed)} color={T.red} />
            <KpiBox label="Neto" value={fmt(calc.neto)} color="#1E6B42" />
            <KpiBox label="Costo total" value={fmt(calc.costoT)} color={T.blue} />
          </div>

          {/* ── SUB-TAB: LIQUIDACIÓN ── */}
          {subTab === "liquidacion" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Card accent="#1E6B42">
                <CardHead right={<span style={{ color: "#1E6B42" }}>{fmt(calc.totalDev)}</span>}>✅ Devengado</CardHead>
                <CardBody>
                  <div style={{ fontSize: 9, color: T.inkLight, marginBottom: 8 }}>{selN.dias}/30 días · Ratio {(calc.ratio * 100).toFixed(1)}%</div>
                  <Row l="Salario proporcional" v={calc.salProp} />
                  {calc.totalHE > 0 && <Row l="Horas extra" v={calc.totalHE} />}
                  {calc.recFest > 0 && <Row l="Recargo festivos" v={calc.recFest} />}
                  <Divider />
                  <Row l="IBC" v={calc.ibc} bold />
                  <div style={{ height: 8 }} />
                  <div style={{ fontSize: 9, color: T.inkLight, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>No salarial</div>
                  {calc.aplAux && <Row l="Aux. transporte" v={calc.auxProp} />}
                  {calc.bonoProp > 0 && <Row l="Bono asistencia (Art.128)" v={calc.bonoProp} />}
                  {selN.otrosIng > 0 && <Row l="Otros ingresos" v={selN.otrosIng} />}
                  <Divider />
                  <Row l="TOTAL DEVENGADO" v={calc.totalDev} bold color="#1E6B42" />
                </CardBody>
              </Card>

              <Card accent={T.red}>
                <CardHead right={<span style={{ color: T.red }}>– {fmt(calc.totDed)}</span>}>🔻 Deducciones</CardHead>
                <CardBody>
                  <div style={{ fontSize: 9, color: T.inkLight, marginBottom: 8 }}>Base: IBC {fmt(calc.ibc)}</div>
                  <Row l="EPS empleado (4%)" v={calc.epsE} color={T.red} />
                  <Row l="Pensión empleado (4%)" v={calc.penE} color={T.red} />
                  {calc.reteF > 0 && <Row l="Retención en fuente" v={calc.reteF} color={T.red} />}
                  {selN.otrasDed > 0 && <Row l="Otras deducciones" v={selN.otrasDed} color={T.red} />}
                  <Divider />
                  <Row l="TOTAL DEDUCCIONES" v={calc.totDed} bold color={T.red} />
                  <div style={{ height: 16 }} />
                  <div style={{ background: T.greenBg, borderRadius: 6, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 11, fontWeight: 700 }}>NETO A PAGAR</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#1E6B42", fontFamily: "'DM Mono',monospace" }}>{fmt(calc.neto)}</div>
                  </div>
                </CardBody>
              </Card>
            </div>
          )}

          {/* ── SUB-TAB: QUINCENAL ── */}
          {subTab === "quincenal" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {/* Q1 */}
              <Card accent={T.blue}>
                <CardHead right={<Pill estado="borrador" />}>Q1 — Primera quincena</CardHead>
                <CardBody>
                  <div style={{ fontSize: 10, color: T.inkLight, marginBottom: 12, lineHeight: 1.6 }}>
                    Anticipo fijo: {Math.round(selN.anticipoPct * 100)}% del salario base, independiente de novedades.
                  </div>
                  <div style={{ background: T.blueBg, borderRadius: 6, padding: "16px 20px", textAlign: "center" }}>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6, color: T.blue }}>Pago Q1</div>
                    <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "'DM Mono',monospace" }}>{fmt(calc.q1)}</div>
                    <div style={{ fontSize: 10, color: T.inkLight, marginTop: 4 }}>{Math.round(selN.anticipoPct * 100)}% × {fmt(selN.sal)}</div>
                  </div>
                  <div style={{ marginTop: 12, fontSize: 10, color: T.inkLight }}>📅 Pago: 15 de {MESES[mes]}</div>
                </CardBody>
              </Card>

              {/* Q2 */}
              <Card accent="#1E6B42">
                <CardHead right={<Pill estado={calc.q2 >= 0 ? "aprobada" : "borrador"} />}>Q2 — Segunda quincena</CardHead>
                <CardBody>
                  <div style={{ fontSize: 10, color: T.inkLight, marginBottom: 12, lineHeight: 1.6 }}>
                    Ajuste real = Neto mes − Q1 ya pagado. Incluye deducciones, bonos y novedades.
                  </div>
                  <Row l="Total devengado" v={calc.totalDev} />
                  <Row l="(−) EPS" v={calc.epsE} color={T.red} />
                  <Row l="(−) Pensión" v={calc.penE} color={T.red} />
                  {calc.reteF > 0 && <Row l="(−) Ret. fuente" v={calc.reteF} color={T.red} />}
                  {selN.otrasDed > 0 && <Row l="(−) Otras ded." v={selN.otrasDed} color={T.red} />}
                  <Divider />
                  <Row l="= Neto mes" v={calc.neto} bold />
                  <Row l="(−) Q1 pagado" v={calc.q1} color={T.blue} />
                  <Divider />
                  <div style={{ background: calc.q2 >= 0 ? T.greenBg : T.redBg, borderRadius: 6, padding: "16px 20px", textAlign: "center" }}>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6, color: calc.q2 >= 0 ? "#1E6B42" : T.red }}>Pago Q2</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: calc.q2 >= 0 ? "#1E6B42" : T.red, fontFamily: "'DM Mono',monospace" }}>{fmt(calc.q2)}</div>
                    {calc.q2 < 0 && <div style={{ fontSize: 10, color: T.red, marginTop: 6, fontWeight: 600 }}>⚠ Saldo negativo — revisar días laborados</div>}
                  </div>
                  <div style={{ marginTop: 12, fontSize: 10, color: T.inkLight }}>📅 Pago: Último día hábil de {MESES[mes]}</div>
                </CardBody>
              </Card>
            </div>
          )}

          {/* ── SUB-TAB: EMPLEADOR ── */}
          {subTab === "empleador" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
              <Card accent={T.blue}>
                <CardHead right={fmt(calc.totAp)}>🏢 Aportes empleador</CardHead>
                <CardBody>
                  <div style={{ fontSize: 9, color: T.inkLight, marginBottom: 8 }}>Base: IBC {fmt(calc.ibc)}</div>
                  <Row l={`EPS (${calc.exS ? "exonerado" : "8.5%"})`} v={calc.epsEr} />
                  <Row l="Pensión (12%)" v={calc.penEr} />
                  <Row l={`ARL ${ARL_OPTS[selN.arl]?.n} (${pct(calc.tasa)})`} v={calc.arlV} />
                  <Row l="Caja compensación (4%)" v={calc.caja} />
                  <Row l={`ICBF (${calc.exS ? "exonerado" : "3%"})`} v={calc.icbf} sub />
                  <Row l={`SENA (${calc.exS ? "exonerado" : "2%"})`} v={calc.sena} sub />
                  {calc.exS && <div style={{ fontSize: 8, color: T.inkLight, fontStyle: "italic", marginTop: 4 }}>Exonerado Ley 1607/12 (&lt;10 SMLMV)</div>}
                  <Divider />
                  <Row l="Total aportes" v={calc.totAp} bold />
                </CardBody>
              </Card>

              <Card accent={T.purple}>
                <CardHead right={fmt(calc.totProv)}>📦 Provisiones</CardHead>
                <CardBody>
                  <div style={{ fontSize: 9, color: T.inkLight, marginBottom: 8 }}>Base: Sal+Aux = {fmt(calc.bProv)}</div>
                  <Row l="Prima (8.33%)" v={calc.prima} />
                  <Row l="Cesantías (8.33%)" v={calc.ces} />
                  <Row l="Int. cesantías (1%)" v={calc.intC} />
                  <Row l="Vacaciones (4.17%)" v={calc.vac} />
                  <Divider />
                  <Row l="Total provisiones" v={calc.totProv} bold />
                </CardBody>
              </Card>

              <Card accent={T.ink}>
                <CardHead>💼 Costo total</CardHead>
                <CardBody>
                  <Row l="Devengado" v={calc.totalDev} />
                  <Row l="Aportes empleador" v={calc.totAp} />
                  <Row l="Provisiones" v={calc.totProv} />
                  <Divider />
                  <Row l="COSTO TOTAL / MES" v={calc.costoT} bold />
                  <div style={{ height: 16 }} />
                  <div style={{ background: T.accent, borderRadius: 6, padding: "12px 14px", textAlign: "center" }}>
                    <div style={{ fontSize: 9, color: T.inkLight, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>Factor prestacional</div>
                    <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "'DM Mono',monospace", marginTop: 4 }}>{calc.factorP.toFixed(3)}×</div>
                    <div style={{ fontSize: 9, color: T.inkLight, marginTop: 2 }}>sobre salario base</div>
                  </div>
                  <div style={{ marginTop: 10, fontSize: 10, color: T.inkMid }}>
                    Costo/hora (240h): <strong style={{ fontFamily: "'DM Mono',monospace" }}>{fmt(calc.costoT / 240)}</strong>/h
                  </div>
                </CardBody>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ══════════ VISTA: LISTA ══════════
  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>Liquidador de Nómina</div>
          <div style={{ fontSize: 11, color: T.inkLight }}>Colombia 2026 · SMLMV {fmt(SMLMV)} · Aux. transporte {fmt(AUX_TR)}</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select value={mes} onChange={e => setMes(parseInt(e.target.value))}
            style={{ border: `1px solid ${T.border}`, borderRadius: 6, padding: "7px 10px", fontSize: 13, fontFamily: "'DM Sans',sans-serif", width: 130 }}>
            {MESES.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select value={anio} onChange={e => setAnio(parseInt(e.target.value))}
            style={{ border: `1px solid ${T.border}`, borderRadius: 6, padding: "7px 10px", fontSize: 13, fontFamily: "'DM Sans',sans-serif", width: 90 }}>
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <Btn onClick={guardar} primary disabled={guard}>{guard ? "Guardando…" : "💾 Guardar nómina"}</Btn>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        <KpiBox label="Empleados" value={noms.length} />
        <KpiBox label="Aprobadas" value={noms.filter(n => n.estado === "aprobada").length} color="#1E6B42" />
        <KpiBox label="Neto total" value={fmt(totales.neto)} />
        <KpiBox label="Costo empresa" value={fmt(totales.costo)} color={T.blue} />
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: T.inkLight }}>Cargando empleados desde Supabase…</div>
      ) : noms.length === 0 ? (
        <Card style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Sin empleados vinculados</div>
          <div style={{ fontSize: 12, marginTop: 4, color: T.inkLight }}>Los empleados con contrato firmado, afiliaciones pendientes o completado aparecerán aquí automáticamente.</div>
        </Card>
      ) : (
        <Card>
          <CardHead right={<span style={{ fontSize: 11, color: T.inkLight }}>{MESES[mes]} {anio}</span>}>
            Nómina del período
          </CardHead>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: T.accent }}>
                {["Empleado", "Cargo", "Salario", "Bono", "Días", "Devengado", "Neto", "Q1", "Q2", "Costo total", "Estado", ""].map(h => (
                  <th key={h} style={{ padding: "8px 12px", fontSize: 9, fontWeight: 700, color: T.inkLight, textAlign: "left", letterSpacing: 0.8, textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {noms.map(n => {
                const c = calcN(n);
                return (
                  <tr key={n.id} style={{ borderTop: `1px solid ${T.border}`, cursor: "pointer" }}
                    onMouseEnter={e => e.currentTarget.style.background = T.accent}
                    onMouseLeave={e => e.currentTarget.style.background = ""}>
                    <td style={{ padding: "10px 12px", fontWeight: 600, fontSize: 13 }}>{n.nombre}</td>
                    <td style={{ padding: "10px 12px", fontSize: 11, color: T.inkLight }}>{n.cargo}</td>
                    <td style={{ padding: "10px 12px", fontSize: 12, fontFamily: "'DM Mono',monospace" }}>{fmt(n.sal)}</td>
                    <td style={{ padding: "10px 12px", fontSize: 11, color: T.inkLight, fontFamily: "'DM Mono',monospace" }}>{n.bono > 0 ? fmt(n.bono) : "—"}</td>
                    <td style={{ padding: "10px 12px", fontSize: 12, fontFamily: "'DM Mono',monospace" }}>{n.dias}</td>
                    <td style={{ padding: "10px 12px", fontSize: 12, fontFamily: "'DM Mono',monospace" }}>{fmt(c.totalDev)}</td>
                    <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 700, color: "#1E6B42", fontFamily: "'DM Mono',monospace" }}>{fmt(c.neto)}</td>
                    <td style={{ padding: "10px 12px", fontSize: 11, fontFamily: "'DM Mono',monospace" }}>{fmt(c.q1)}</td>
                    <td style={{ padding: "10px 12px", fontSize: 11, fontFamily: "'DM Mono',monospace", color: c.q2 >= 0 ? T.ink : T.red }}>{fmt(c.q2)}</td>
                    <td style={{ padding: "10px 12px", fontSize: 11, color: T.inkMid, fontFamily: "'DM Mono',monospace" }}>{fmt(c.costoT)}</td>
                    <td style={{ padding: "10px 12px" }}><Pill estado={n.estado} /></td>
                    <td style={{ padding: "10px 12px" }}>
                      <Btn small onClick={() => { setSel(n.id); setVista("detalle"); setSubTab("liquidacion"); }}>Ver →</Btn>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Totals footer */}
          <div style={{ borderTop: `2px solid ${T.ink}`, padding: "12px 16px", display: "flex", justifyContent: "space-between", background: T.accent }}>
            <span style={{ fontSize: 12, fontWeight: 700 }}>TOTALES ({noms.length} empleados)</span>
            <div style={{ display: "flex", gap: 24 }}>
              <span style={{ fontSize: 12 }}>Devengado: <strong style={{ fontFamily: "'DM Mono',monospace" }}>{fmt(totales.dev)}</strong></span>
              <span style={{ fontSize: 12 }}>Neto: <strong style={{ fontFamily: "'DM Mono',monospace", color: "#1E6B42" }}>{fmt(totales.neto)}</strong></span>
              <span style={{ fontSize: 12 }}>Costo empresa: <strong style={{ fontFamily: "'DM Mono',monospace" }}>{fmt(totales.costo)}</strong></span>
            </div>
          </div>
        </Card>
      )}

      {/* Footer info */}
      <div style={{ marginTop: 16, padding: "12px 16px", background: T.surfaceAlt, borderRadius: 6, border: `1px solid ${T.border}`, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, fontSize: 9, color: T.inkLight }}>
        <div><strong style={{ color: T.inkMid }}>Legislación</strong><br />CST Art.127-128 · Ley 100/93 · Ley 1607/12</div>
        <div><strong style={{ color: T.inkMid }}>Parámetros 2026</strong><br />SMLMV: {fmt(SMLMV)} · Aux.T: {fmt(AUX_TR)} · UVT: {fmt(UVT)}</div>
        <div><strong style={{ color: T.inkMid }}>Modelo Habitaris</strong><br />Q1=anticipo fijo (50% sal) · Q2=ajuste real · Bono Art.128=NO salarial</div>
      </div>
    </div>
  );
}
