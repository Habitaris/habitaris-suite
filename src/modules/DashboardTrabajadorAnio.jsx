import React, { useState, useEffect } from "react";

// Resumen anual del trabajador — visual pero 100% sobrio (blanco/negro).
// Protagonista: vacaciones pendientes por disfrutar (número grande + medidor).
// Barras: vacaciones (disfrutadas/pendientes sobre total) y avance del contrato.
// Vacaciones: Art. 186 CST → 15 días hábiles/año = 1,25 por mes trabajado.

const INK = "#111", MID = "#666", LIGHT = "#9B9B99", BORDER = "#E5E3DE", LINE = "#EFEEEA", FILL = "#111", TRACK = "#ECEAE5";
const MONO = "'DM Mono',monospace";

function mesesDesde(fechaIngreso, hasta) {
  if (!fechaIngreso) return 0;
  const ini = new Date(fechaIngreso + "T00:00:00");
  if (isNaN(ini)) return 0;
  const fin = hasta || new Date();
  const ms = fin - ini;
  if (ms <= 0) return 0;
  return ms / (1000 * 60 * 60 * 24 * 30.4375);
}

export default function DashboardTrabajadorAnio({ empId, fechaIngreso, fechaFin, anio, nombre, embedded, durMeses }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(anio || new Date().getFullYear());

  useEffect(() => {
    if (!empId) return;
    setLoading(true);
    fetch("/api/hiring?emp_anio=" + empId + "&anio=" + year)
      .then((r) => r.json())
      .then((d) => { setData(d.ok && Array.isArray(d.data) ? d.data : []); setLoading(false); })
      .catch(() => { setData([]); setLoading(false); });
  }, [empId, year]);

  const meses = data || [];
  const sum = (f) => meses.reduce((s, m) => s + (m[f] || 0), 0);
  const diasBrutos = sum("dias");
  const festivos = sum("festMes");
  const incap = sum("diasIncap");
  const vacDisfrutadas = sum("diasVac");
  const licRem = sum("diasLicRem");
  const licNoRem = sum("diasLicNoRem");
  const hExtra = sum("hexD") + sum("hexN") + sum("hexDD") + sum("hexDN");
  const diasTrab = Math.max(0, diasBrutos - incap - vacDisfrutadas - licRem - licNoRem);
  const horasTrab = Math.round(diasTrab * 8 + hExtra);
  const mesesLiquidados = meses.length;

  const mTrab = mesesDesde(fechaIngreso);
  const vacAcumuladas = Math.round(mTrab * 1.25 * 10) / 10;
  const vacPendientes = Math.max(0, Math.round((vacAcumuladas - vacDisfrutadas) * 10) / 10);
  const vacTotalContrato = durMeses && durMeses > 0 ? Math.round(durMeses * 1.25 * 10) / 10 : null;
  const vacPorCausar = vacTotalContrato != null ? Math.max(0, Math.round((vacTotalContrato - vacAcumuladas) * 10) / 10) : null;
  const vacBase = vacTotalContrato != null ? vacTotalContrato : 15;
  const pctDisfrutadas = vacBase > 0 ? (vacDisfrutadas / vacBase) * 100 : 0;
  const pctPend = vacBase > 0 ? (vacPendientes / vacBase) * 100 : 0;

  const hoy = new Date();
  const mesesTranscurridos = year === hoy.getFullYear() ? hoy.getMonth() + 1 : (year < hoy.getFullYear() ? 12 : 0);

  // Avance del contrato (ingreso → fin)
  let pctContrato = null, diasRestantes = null;
  if (fechaIngreso && fechaFin) {
    const ini = new Date(fechaIngreso + "T12:00:00"), fin = new Date(fechaFin + "T12:00:00");
    const tot = fin - ini, trans = hoy - ini;
    if (tot > 0) { pctContrato = Math.max(0, Math.min(100, (trans / tot) * 100)); diasRestantes = Math.max(0, Math.ceil((fin - hoy) / 86400000)); }
  }

  const yA = new Date().getFullYear();
  const years = [yA - 2, yA - 1, yA, yA + 1];
  const fmtN = (n) => (n || 0).toLocaleString("es-CO");
  const inicial = (nombre || "?").trim().charAt(0).toUpperCase();

  // ---- bloques visuales ----
  const Tile = ({ label, valor, sub }) => (
    <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 9, padding: "11px 13px" }}>
      <div style={{ fontSize: 8, fontWeight: 700, color: LIGHT, textTransform: "uppercase", letterSpacing: ".6px", lineHeight: 1.3, minHeight: 21 }}>{label}</div>
      <div style={{ fontSize: 21, fontWeight: 700, color: INK, lineHeight: 1.1, marginTop: 4, fontFamily: MONO }}>{valor}</div>
      {sub && <div style={{ fontSize: 8.5, color: LIGHT, marginTop: 2 }}>{sub}</div>}
    </div>
  );
  const grupoTit = (t, extra) => (
    <div style={{ display: "flex", alignItems: "baseline", gap: 8, margin: "18px 0 8px" }}>
      <span style={{ fontSize: 8.5, fontWeight: 700, color: INK, textTransform: "uppercase", letterSpacing: "1px" }}>{t}</span>
      {extra && <span style={{ fontSize: 8.5, color: LIGHT }}>{extra}</span>}
      <span style={{ flex: 1, height: 1, background: LINE }} />
    </div>
  );

  const g4 = { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 };
  const ausTiles = [
    { label: "Festivos", v: fmtN(festivos) },
    { label: "Incapacidad", v: fmtN(incap) },
    { label: "Licencia rem.", v: fmtN(licRem) },
    { label: "Licencia no rem.", v: fmtN(licNoRem) },
  ];

  const Inner = () => (
    loading ? <div style={{ fontSize: 12, color: LIGHT, padding: 8 }}>Cargando…</div>
    : mesesLiquidados === 0 ? <div style={{ fontSize: 12, color: LIGHT, fontStyle: "italic", padding: "10px 0" }}>Sin nóminas registradas en {year}.</div>
    : (
      <>
        {/* Avance del contrato — protagonista visual */}
        {pctContrato != null && (
          <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 11, padding: "16px 18px", marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: INK, textTransform: "uppercase", letterSpacing: "1px" }}>Avance del contrato</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: INK, fontFamily: MONO }}>{diasRestantes} días restantes</span>
            </div>
            <div style={{ height: 16, background: TRACK, borderRadius: 99, overflow: "hidden", position: "relative" }}>
              <div style={{ width: pctContrato + "%", height: "100%", background: FILL, borderRadius: 99 }} />
              <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 9, fontWeight: 700, color: pctContrato > 88 ? "#fff" : INK, fontFamily: MONO }}>{Math.round(pctContrato)}%</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 9, color: LIGHT, fontFamily: MONO }}>
              <span>Ingreso · {fechaIngreso}</span><span>Fin · {fechaFin}</span>
            </div>
          </div>
        )}

        {/* Métricas principales */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
          <Tile label="Días trabajados" valor={fmtN(diasTrab)} sub={mesesLiquidados + " de " + mesesTranscurridos + " meses"} />
          <Tile label="Horas trabajadas" valor={fmtN(horasTrab)} sub={hExtra ? fmtN(hExtra) + "h extra incl." : "jornada"} />
          <Tile label="Vac. pendientes por disfrutar" valor={vacPendientes} sub="días hábiles" />
        </div>

        {/* Vacaciones */}
        {grupoTit("Vacaciones · Art. 186 CST (1,25 días/mes)")}
        <div style={g4}>
          <Tile label={vacTotalContrato != null ? "Total del contrato" : "Total anual (ref.)"} valor={vacBase} />
          <Tile label="Causadas a hoy" valor={vacAcumuladas} />
          {vacPorCausar != null && <Tile label="Por causar" valor={vacPorCausar} />}
          <Tile label="Disfrutadas" valor={vacDisfrutadas} />
          <Tile label="Pendientes por disfrutar" valor={vacPendientes} />
        </div>

        {/* Festivos y ausencias */}
        {grupoTit("Festivos y ausencias")}
        <div style={g4}>{ausTiles.map((t, i) => <Tile key={i} label={t.label} valor={t.v} />)}</div>
      </>
    )
  );

  if (embedded) {
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6, marginTop: -28 }}>
          <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} style={{ fontSize: 10, padding: "2px 8px", border: `1px solid ${BORDER}`, borderRadius: 5, fontFamily: "'DM Sans',sans-serif", background: "#fff", fontWeight: 600, color: MID }}>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <Inner />
      </div>
    );
  }

  return (
    <div style={{ marginTop: 14, borderTop: `1px solid ${BORDER}`, paddingTop: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: INK, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 }}>{inicial}</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: INK, textTransform: "uppercase", letterSpacing: ".5px" }}>Resumen del año</div>
        </div>
        <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} style={{ fontSize: 11, padding: "4px 10px", border: `1px solid ${BORDER}`, borderRadius: 6, fontFamily: "'DM Sans',sans-serif", background: "#fff", fontWeight: 600 }}>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <Inner />
    </div>
  );
}
