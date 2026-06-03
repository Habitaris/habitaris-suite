import React, { useState, useEffect } from "react";

// Mini-dashboard anual del trabajador (ficha del liquidador).
// Estética sobria de la suite: blanco/negro, líneas finas, un acento, números en mono, sin emojis.
// Vacaciones: Art. 186 CST → 15 días hábiles/año = 1,25 por mes trabajado.

const C = {
  ink: "#1A1A19", inkMid: "#6B6B68", inkLight: "#9B9B99",
  border: "#E5E3DE", line: "#EFEEEA", bg: "#FAFAF8",
  accent: "#1E6B42", // verde sobrio, solo para vacaciones pendientes
};

function mesesDesde(fechaIngreso, hasta) {
  if (!fechaIngreso) return 0;
  const ini = new Date(fechaIngreso + "T00:00:00");
  if (isNaN(ini)) return 0;
  const fin = hasta || new Date();
  const ms = fin - ini;
  if (ms <= 0) return 0;
  return ms / (1000 * 60 * 60 * 24 * 30.4375);
}

export default function DashboardTrabajadorAnio({ empId, fechaIngreso, anio }) {
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

  const hoy = new Date();
  const mesesTranscurridos = year === hoy.getFullYear() ? hoy.getMonth() + 1 : (year < hoy.getFullYear() ? 12 : 0);

  const yA = new Date().getFullYear();
  const years = [yA - 2, yA - 1, yA, yA + 1];

  const fmtN = (n) => (n || 0).toLocaleString("es-CO");
  const mono = "'DM Mono','SF Mono',ui-monospace,monospace";

  // Métrica grande con etiqueta encima y dato en mono
  const metric = (label, valor, sub, accent) => (
    <div style={{ flex: 1, padding: "2px 0" }}>
      <div style={{ fontSize: 8.5, fontWeight: 700, color: C.inkLight, textTransform: "uppercase", letterSpacing: 0.7 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: accent || C.ink, lineHeight: 1.1, marginTop: 3, fontFamily: mono }}>{valor}</div>
      {sub && <div style={{ fontSize: 9, color: C.inkLight, marginTop: 1 }}>{sub}</div>}
    </div>
  );
  // Fila clave-valor fina (para ausencias)
  const row = (label, valor, last) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: last ? "none" : `1px solid ${C.line}` }}>
      <span style={{ fontSize: 11, color: C.inkMid }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: C.ink, fontFamily: mono }}>{valor}</span>
    </div>
  );

  return (
    <div style={{ marginTop: 14, borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.ink, textTransform: "uppercase", letterSpacing: 0.5 }}>Resumen del año</div>
        <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} style={{ fontSize: 11, padding: "4px 10px", border: `1px solid ${C.border}`, borderRadius: 6, fontFamily: "'DM Sans',sans-serif", background: "#fff", fontWeight: 600, color: C.ink }}>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ fontSize: 12, color: C.inkLight, padding: 8 }}>Cargando…</div>
      ) : mesesLiquidados === 0 ? (
        <div style={{ fontSize: 12, color: C.inkLight, fontStyle: "italic", padding: "10px 0" }}>Sin nóminas registradas en {year}.</div>
      ) : (
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>

          {/* Fila de métricas principales */}
          <div style={{ display: "flex", padding: "14px 16px", gap: 4 }}>
            {metric("Días trabajados", fmtN(diasTrab))}
            <div style={{ width: 1, background: C.line }} />
            {metric("Horas trabajadas", fmtN(horasTrab), hExtra ? fmtN(hExtra) + "h extra incl." : null)}
            <div style={{ width: 1, background: C.line }} />
            {metric("Vac. pendientes", vacPendientes, "días hábiles", C.accent)}
          </div>

          {/* Detalle inferior en dos columnas */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderTop: `1px solid ${C.border}` }}>
            {/* Columna vacaciones */}
            <div style={{ padding: "12px 16px", borderRight: `1px solid ${C.line}` }}>
              <div style={{ fontSize: 8.5, fontWeight: 700, color: C.inkLight, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 6 }}>Vacaciones · Art. 186 CST</div>
              {row("Acumuladas (derecho)", vacAcumuladas)}
              {row("Disfrutadas", vacDisfrutadas)}
              {row("Pendientes", vacPendientes, true)}
            </div>
            {/* Columna ausencias */}
            <div style={{ padding: "12px 16px" }}>
              <div style={{ fontSize: 8.5, fontWeight: 700, color: C.inkLight, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 6 }}>Festivos y ausencias</div>
              {row("Festivos", festivos)}
              {row("Incapacidad (días)", incap)}
              {row("Licencia remunerada", licRem)}
              {row("Licencia no rem.", licNoRem, true)}
            </div>
          </div>

          {/* Pie con avance */}
          <div style={{ padding: "8px 16px", background: C.bg, borderTop: `1px solid ${C.border}`, fontSize: 9.5, color: C.inkLight, display: "flex", justifyContent: "space-between" }}>
            <span>{mesesLiquidados} de {mesesTranscurridos} meses procesados en {year}</span>
            <span>Ingreso: {fechaIngreso || "—"}</span>
          </div>

        </div>
      )}
    </div>
  );
}
