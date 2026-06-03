import React, { useState, useEffect } from "react";

// Mini-dashboard anual del trabajador, con la PIEL de los informes (papel blanco,
// membrete con borde negro, secciones en mayúscula, filas finas) pero embebido en la ficha.
// Vacaciones: Art. 186 CST → 15 días hábiles/año = 1,25 por mes trabajado.

function mesesDesde(fechaIngreso, hasta) {
  if (!fechaIngreso) return 0;
  const ini = new Date(fechaIngreso + "T00:00:00");
  if (isNaN(ini)) return 0;
  const fin = hasta || new Date();
  const ms = fin - ini;
  if (ms <= 0) return 0;
  return ms / (1000 * 60 * 60 * 24 * 30.4375);
}

export default function DashboardTrabajadorAnio({ empId, fechaIngreso, anio, nombre }) {
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

  // --- Estilos tomados de los informes ---
  const paper = { background: "#fff", border: "1px solid #ddd", borderRadius: 6, padding: "22px 26px", fontFamily: "Helvetica,Arial,sans-serif", color: "#111", boxShadow: "0 1px 4px rgba(0,0,0,.06)" };
  const hdr = { borderBottom: "2px solid #111", paddingBottom: 6, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "flex-end" };
  const h1 = { fontSize: "13pt", fontWeight: 700, letterSpacing: ".3px", margin: 0 };
  const subTxt = { fontSize: "8pt", color: "#666", marginTop: 2 };
  const h3 = { fontSize: "7.5pt", fontWeight: 700, color: "#666", textTransform: "uppercase", letterSpacing: ".5px", margin: "12px 0 4px" };
  const th = { textAlign: "left", padding: "4px 6px", fontSize: "7pt", fontWeight: 700, textTransform: "uppercase", borderBottom: "2px solid #111", color: "#111" };
  const td = { padding: "4px 6px", borderBottom: "1px solid #eee", fontSize: "9pt" };
  const tdR = { ...td, textAlign: "right", fontFamily: "'DM Mono',monospace", fontWeight: 600 };

  return (
    <div style={{ marginTop: 14, borderTop: "1px solid #E5E3DE", paddingTop: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#1A1A19", textTransform: "uppercase", letterSpacing: ".5px" }}>Resumen del año</div>
        <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} style={{ fontSize: 11, padding: "4px 10px", border: "1px solid #E5E3DE", borderRadius: 6, fontFamily: "'DM Sans',sans-serif", background: "#fff", fontWeight: 600 }}>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ fontSize: 12, color: "#9B9B99", padding: 8 }}>Cargando…</div>
      ) : mesesLiquidados === 0 ? (
        <div style={{ fontSize: 12, color: "#9B9B99", fontStyle: "italic", padding: "10px 0" }}>Sin nóminas registradas en {year}.</div>
      ) : (
        <div style={paper}>
          {/* Membrete */}
          <div style={hdr}>
            <div>
              <h1 style={h1}>RESUMEN ANUAL DEL TRABAJADOR</h1>
              <div style={subTxt}>{nombre ? nombre + " · " : ""}Ejercicio {year} · {mesesLiquidados} de {mesesTranscurridos} meses procesados</div>
            </div>
            <div style={{ textAlign: "right", fontSize: "8pt", color: "#666" }}>
              <div>Ingreso</div>
              <div style={{ fontWeight: 700, color: "#111", fontFamily: "'DM Mono',monospace" }}>{fechaIngreso || "—"}</div>
            </div>
          </div>

          {/* Cifras destacadas */}
          <div style={{ display: "flex", gap: 0, marginBottom: 4 }}>
            {[["Días trabajados", fmtN(diasTrab)], ["Horas trabajadas", fmtN(horasTrab)], ["Vacaciones pendientes", vacPendientes + " días"]].map((m, i) => (
              <div key={i} style={{ flex: 1, padding: "6px 10px", borderLeft: i ? "1px solid #eee" : "none" }}>
                <div style={{ fontSize: "7pt", fontWeight: 700, color: "#666", textTransform: "uppercase", letterSpacing: ".5px" }}>{m[0]}</div>
                <div style={{ fontSize: "16pt", fontWeight: 700, fontFamily: "'DM Mono',monospace", color: "#111", lineHeight: 1.2 }}>{m[1]}</div>
              </div>
            ))}
          </div>

          {/* Sección: Tiempo y jornada */}
          <h3 style={h3}>Tiempo y jornada</h3>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={th}>Concepto</th><th style={{ ...th, textAlign: "right" }}>Acumulado {year}</th></tr></thead>
            <tbody>
              <tr><td style={td}>Días efectivamente trabajados</td><td style={tdR}>{fmtN(diasTrab)}</td></tr>
              <tr><td style={td}>Horas trabajadas (incl. {fmtN(hExtra)}h extra)</td><td style={tdR}>{fmtN(horasTrab)}</td></tr>
              <tr><td style={td}>Festivos del periodo</td><td style={tdR}>{fmtN(festivos)}</td></tr>
            </tbody>
          </table>

          {/* Sección: Vacaciones */}
          <h3 style={h3}>Vacaciones · Art. 186 CST (1,25 días/mes)</h3>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={th}>Concepto</th><th style={{ ...th, textAlign: "right" }}>Días hábiles</th></tr></thead>
            <tbody>
              <tr><td style={td}>Acumuladas (derecho generado)</td><td style={tdR}>{vacAcumuladas}</td></tr>
              <tr><td style={td}>Disfrutadas</td><td style={tdR}>{vacDisfrutadas}</td></tr>
              <tr><td style={{ ...td, fontWeight: 700, borderBottom: "2px solid #111" }}>Pendientes por disfrutar</td><td style={{ ...tdR, fontWeight: 800, borderBottom: "2px solid #111" }}>{vacPendientes}</td></tr>
            </tbody>
          </table>

          {/* Sección: Ausencias */}
          <h3 style={h3}>Ausencias del periodo</h3>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={th}>Tipo</th><th style={{ ...th, textAlign: "right" }}>Días</th></tr></thead>
            <tbody>
              <tr><td style={td}>Incapacidades / bajas médicas</td><td style={tdR}>{fmtN(incap)}</td></tr>
              <tr><td style={td}>Licencias remuneradas</td><td style={tdR}>{fmtN(licRem)}</td></tr>
              <tr><td style={{ ...td, borderBottom: "none" }}>Licencias no remuneradas</td><td style={{ ...tdR, borderBottom: "none" }}>{fmtN(licNoRem)}</td></tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
