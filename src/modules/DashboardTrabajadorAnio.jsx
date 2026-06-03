import React, { useState, useEffect } from "react";

// Resumen anual del trabajador. Estética sobria/editorial.
// Si embedded=true, se integra dentro de la ficha (sin recuadro propio).
// Vacaciones: Art. 186 CST → 15 días hábiles/año = 1,25 por mes trabajado.

const INK = "#111", MID = "#666", LIGHT = "#999", BORDER = "#E5E3DE", LINE = "#EFEEEA";
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

export default function DashboardTrabajadorAnio({ empId, fechaIngreso, anio, nombre, embedded }) {
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

  // Cifra destacada
  const Big = ({ label, valor, sub }) => (
    <div style={{ flex: 1, padding: "0 14px 0 0" }}>
      <div style={{ fontSize: 8.5, fontWeight: 700, color: LIGHT, textTransform: "uppercase", letterSpacing: ".7px" }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: INK, lineHeight: 1.15, marginTop: 4, fontFamily: MONO }}>{valor}</div>
      {sub && <div style={{ fontSize: 9, color: LIGHT, marginTop: 1 }}>{sub}</div>}
    </div>
  );
  // Fila etiqueta/valor
  const R = ({ l, v, strong }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "7px 0", borderBottom: `1px solid ${LINE}` }}>
      <span style={{ fontSize: 11, color: strong ? INK : MID, fontWeight: strong ? 700 : 400 }}>{l}</span>
      <span style={{ fontSize: 12.5, fontWeight: strong ? 800 : 600, color: INK, fontFamily: MONO }}>{v}</span>
    </div>
  );

  const Inner = () => (
    loading ? <div style={{ fontSize: 12, color: LIGHT, padding: 8 }}>Cargando…</div>
    : mesesLiquidados === 0 ? <div style={{ fontSize: 12, color: LIGHT, fontStyle: "italic", padding: "10px 0" }}>Sin nóminas registradas en {year}.</div>
    : (
      <>
        {/* Cifras destacadas */}
        <div style={{ display: "flex", borderBottom: `1px solid ${BORDER}`, paddingBottom: 14, marginBottom: 4 }}>
          <Big label="Días trabajados" valor={fmtN(diasTrab)} sub={mesesLiquidados + " de " + mesesTranscurridos + " meses"} />
          <Big label="Horas trabajadas" valor={fmtN(horasTrab)} sub={hExtra ? fmtN(hExtra) + "h extra incl." : "jornada"} />
          <Big label="Vac. pendientes" valor={vacPendientes} sub="días hábiles" />
        </div>
        {/* Dos columnas: vacaciones / ausencias */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 32px", marginTop: 8 }}>
          <div>
            <div style={{ fontSize: 8.5, fontWeight: 700, color: LIGHT, textTransform: "uppercase", letterSpacing: ".7px", marginBottom: 2 }}>Vacaciones · Art. 186 CST</div>
            <R l="Acumuladas (derecho)" v={vacAcumuladas} />
            <R l="Disfrutadas" v={vacDisfrutadas} />
            <R l="Pendientes" v={vacPendientes} strong />
          </div>
          <div>
            <div style={{ fontSize: 8.5, fontWeight: 700, color: LIGHT, textTransform: "uppercase", letterSpacing: ".7px", marginBottom: 2 }}>Festivos y ausencias</div>
            <R l="Festivos" v={fmtN(festivos)} />
            <R l="Incapacidad (días)" v={fmtN(incap)} />
            <R l="Licencia remunerada" v={fmtN(licRem)} />
            <R l="Licencia no rem." v={fmtN(licNoRem)} />
          </div>
        </div>
      </>
    )
  );

  // Modo embebido: sin recuadro propio (la ficha ya es el papel), pero con selector de año a la derecha.
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

  // Modo autónomo (por si se usa fuera de la ficha)
  return (
    <div style={{ marginTop: 14, borderTop: `1px solid ${BORDER}`, paddingTop: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: INK, textTransform: "uppercase", letterSpacing: ".5px" }}>Resumen del año</div>
        <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} style={{ fontSize: 11, padding: "4px 10px", border: `1px solid ${BORDER}`, borderRadius: 6, fontFamily: "'DM Sans',sans-serif", background: "#fff", fontWeight: 600 }}>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <Inner />
    </div>
  );
}
