import React, { useState, useEffect } from "react";

// Mini-dashboard anual del trabajador (vive en su ficha, RRHH).
// Acumula del año los datos ya registrados en las nóminas + calcula vacaciones.
// Vacaciones: Art. 186 CST → 15 días hábiles por año = 1,25 por mes trabajado.
// Pendientes = causadas (1,25 × meses desde ingreso) − disfrutadas.

const C = {
  ink: "#1A1A19", inkMid: "#666", inkLight: "#9B9B99",
  border: "#E5E3DE", green: "#1E6B42", greenBg: "#E8F4EE",
  blue: "#1D4ED8", blueBg: "#EFF6FF", amber: "#92400E", amberBg: "#FEF3C7",
  red: "#B91C1C", redBg: "#FEE2E2",
};

function mesesDesde(fechaIngreso, hasta) {
  if (!fechaIngreso) return 0;
  const ini = new Date(fechaIngreso + "T00:00:00");
  if (isNaN(ini)) return 0;
  const fin = hasta || new Date();
  const ms = fin - ini;
  if (ms <= 0) return 0;
  return ms / (1000 * 60 * 60 * 24 * 30.4375); // meses promedio
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

  if (loading) return <div style={{ fontSize: 12, color: C.inkLight, padding: 8 }}>Cargando resumen…</div>;
  const meses = data || [];

  // Agregados del año
  const sum = (f) => meses.reduce((s, m) => s + (m[f] || 0), 0);
  const diasBrutos = sum("dias");
  const festivos = sum("festMes");
  const incap = sum("diasIncap");
  const vacDisfrutadas = sum("diasVac");
  const licRem = sum("diasLicRem");
  const licNoRem = sum("diasLicNoRem");
  const hExtra = sum("hexD") + sum("hexN") + sum("hexDD") + sum("hexDN");
  // Días efectivamente trabajados = base − novedades (incap/vac/lic)
  const diasTrab = Math.max(0, diasBrutos - incap - vacDisfrutadas - licRem - licNoRem);
  const horasTrab = Math.round(diasTrab * 8 + hExtra);
  const mesesLiquidados = meses.length;

  // Vacaciones (Art. 186 CST): 1,25 días por mes trabajado desde el ingreso
  const mTrab = mesesDesde(fechaIngreso);
  const vacCausadas = Math.round(mTrab * 1.25 * 10) / 10;
  const vacPendientes = Math.max(0, Math.round((vacCausadas - vacDisfrutadas) * 10) / 10);

  const card = (label, valor, sub, col, bg) => (
    <div style={{ padding: "8px 10px", background: bg || "#FAFAF8", border: `1px solid ${C.border}`, borderRadius: 6 }}>
      <div style={{ fontSize: 8, fontWeight: 700, color: col || C.inkLight, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: col || C.ink, lineHeight: 1.1, marginTop: 2 }}>{valor}</div>
      {sub && <div style={{ fontSize: 8.5, color: C.inkLight, marginTop: 1 }}>{sub}</div>}
    </div>
  );

  const yA = new Date().getFullYear();
  const years = [yA - 2, yA - 1, yA, yA + 1];

  return (
    <div style={{ marginTop: 14, borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.ink }}>📊 Resumen del año</div>
        <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} style={{ fontSize: 11, padding: "3px 8px", border: `1px solid ${C.border}`, borderRadius: 5, fontFamily: "'DM Sans',sans-serif", background: "#fff" }}>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {mesesLiquidados === 0 ? (
        <div style={{ fontSize: 12, color: C.inkLight, fontStyle: "italic", padding: "6px 0" }}>Sin nóminas registradas en {year}.</div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginBottom: 6 }}>
            {card("Días trabajados", diasTrab, mesesLiquidados + " mes(es)", C.ink)}
            {card("Horas trabajadas", horasTrab, hExtra ? "incl. " + hExtra + "h extra" : "jornada", C.blue, C.blueBg)}
            {card("Festivos", festivos, "del periodo", C.amber, C.amberBg)}
            {card("Incapacidades", incap, "días", C.red, C.redBg)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>
            {card("Vac. disfrutadas", vacDisfrutadas, "días", C.green, C.greenBg)}
            {card("Vac. pendientes", vacPendientes, "días hábiles", C.green, C.greenBg)}
            {card("Vac. causadas", vacCausadas, "1,25/mes (Art.186)", C.inkMid)}
            {card("Lic. remuneradas", licRem, licNoRem ? "+" + licNoRem + " no rem." : "días", C.inkMid)}
          </div>
        </>
      )}
    </div>
  );
}
