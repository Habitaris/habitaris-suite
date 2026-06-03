import React, { useState, useEffect } from "react";

// Mini-dashboard anual del trabajador (vive en la ficha del liquidador).
// Acumula del año los datos ya registrados en las nóminas + calcula vacaciones.
// Vacaciones: Art. 186 CST → 15 días hábiles por año = 1,25 por mes trabajado.
// Pendientes = acumuladas (1,25 × meses desde ingreso) − disfrutadas.

const C = {
  ink: "#1A1A19", inkMid: "#666", inkLight: "#9B9B99",
  border: "#E5E3DE", card: "#fff",
  green: "#1E6B42", greenBg: "#E8F4EE", greenSoft: "#C9E6D6",
  blue: "#1D4ED8", blueBg: "#EFF6FF",
  amber: "#B45309", amberBg: "#FEF3C7",
  red: "#B91C1C", redBg: "#FEE2E2",
  purple: "#6D28D9", purpleBg: "#F3E8FF",
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

  // Vacaciones (Art. 186 CST): 1,25 días por mes trabajado desde el ingreso
  const mTrab = mesesDesde(fechaIngreso);
  const vacAcumuladas = Math.round(mTrab * 1.25 * 10) / 10;
  const vacPendientes = Math.max(0, Math.round((vacAcumuladas - vacDisfrutadas) * 10) / 10);
  const pctDisfrutado = vacAcumuladas > 0 ? Math.min(100, (vacDisfrutadas / vacAcumuladas) * 100) : 0;

  // Avance del año: meses liquidados vs transcurridos
  const hoy = new Date();
  const mesesTranscurridos = year === hoy.getFullYear() ? hoy.getMonth() + 1 : (year < hoy.getFullYear() ? 12 : 0);
  const pctAvance = mesesTranscurridos > 0 ? Math.min(100, (mesesLiquidados / mesesTranscurridos) * 100) : 0;

  const yA = new Date().getFullYear();
  const years = [yA - 2, yA - 1, yA, yA + 1];

  // ---- UI helpers ----
  const wrap = { marginTop: 14, borderTop: `1px solid ${C.border}`, paddingTop: 14 };
  const bigStat = (icon, label, valor, sub, col, bg) => (
    <div style={{ flex: 1, background: bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", position: "relative", overflow: "hidden" }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: col, textTransform: "uppercase", letterSpacing: 0.6 }}>{icon} {label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: C.ink, lineHeight: 1.05, marginTop: 4 }}>{valor}</div>
      {sub && <div style={{ fontSize: 9.5, color: C.inkLight, marginTop: 2 }}>{sub}</div>}
    </div>
  );
  const chip = (icon, label, valor, col, bg) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, background: bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 11px" }}>
      <span style={{ fontSize: 14 }}>{icon}</span>
      <div style={{ lineHeight: 1.1 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: col }}>{valor}</div>
        <div style={{ fontSize: 8.5, color: C.inkLight, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</div>
      </div>
    </div>
  );

  return (
    <div style={wrap}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: C.ink }}>📊 Resumen del año</div>
        <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} style={{ fontSize: 11, padding: "4px 10px", border: `1px solid ${C.border}`, borderRadius: 6, fontFamily: "'DM Sans',sans-serif", background: "#fff", fontWeight: 600 }}>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ fontSize: 12, color: C.inkLight, padding: 8 }}>Cargando resumen…</div>
      ) : mesesLiquidados === 0 ? (
        <div style={{ fontSize: 12, color: C.inkLight, fontStyle: "italic", padding: "10px 0" }}>Sin nóminas registradas en {year}.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* ZONA 1 — Tiempo trabajado */}
          <div>
            <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
              {bigStat("🗓️", "Días trabajados", diasTrab, mesesLiquidados + " mes(es) liquidado(s)", C.ink, "#FAFAF8")}
              {bigStat("⏱️", "Horas trabajadas", horasTrab.toLocaleString("es-CO"), hExtra ? "incl. " + hExtra + "h extra" : "jornada legal", C.blue, C.blueBg)}
            </div>
            <div style={{ fontSize: 9, color: C.inkLight, fontWeight: 600, marginBottom: 3 }}>Avance del año · {mesesLiquidados}/{mesesTranscurridos} meses procesados</div>
            <div style={{ height: 7, background: C.border, borderRadius: 99, overflow: "hidden" }}>
              <div style={{ width: pctAvance + "%", height: "100%", background: C.ink, borderRadius: 99, transition: "width .4s" }} />
            </div>
          </div>

          {/* ZONA 2 — Vacaciones (medidor) */}
          <div style={{ background: C.greenBg, border: `1px solid ${C.greenSoft}`, borderRadius: 12, padding: "13px 15px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 9 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: C.green, textTransform: "uppercase", letterSpacing: 0.5 }}>🏖️ Vacaciones</div>
              <div style={{ fontSize: 9, color: C.green, fontWeight: 600 }}>Art. 186 CST · 1,25 días/mes</div>
            </div>
            <div style={{ display: "flex", gap: 16, marginBottom: 10 }}>
              <div><div style={{ fontSize: 23, fontWeight: 800, color: C.green, lineHeight: 1 }}>{vacPendientes}</div><div style={{ fontSize: 9, color: C.green, fontWeight: 700, marginTop: 2 }}>PENDIENTES (días háb.)</div></div>
              <div style={{ borderLeft: `1px solid ${C.greenSoft}`, paddingLeft: 16 }}><div style={{ fontSize: 17, fontWeight: 700, color: C.inkMid, lineHeight: 1 }}>{vacDisfrutadas}</div><div style={{ fontSize: 9, color: C.inkMid, fontWeight: 600, marginTop: 3 }}>Disfrutadas</div></div>
              <div style={{ paddingLeft: 0 }}><div style={{ fontSize: 17, fontWeight: 700, color: C.inkMid, lineHeight: 1 }}>{vacAcumuladas}</div><div style={{ fontSize: 9, color: C.inkMid, fontWeight: 600, marginTop: 3 }}>Acumuladas (derecho)</div></div>
            </div>
            {/* barra disfrutadas vs pendientes */}
            <div style={{ height: 9, background: "#fff", borderRadius: 99, overflow: "hidden", display: "flex", border: `1px solid ${C.greenSoft}` }}>
              <div style={{ width: pctDisfrutado + "%", height: "100%", background: C.inkMid }} title="Disfrutadas" />
              <div style={{ flex: 1, height: "100%", background: C.green }} title="Pendientes" />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 8.5, color: C.green }}>
              <span>● Disfrutadas {vacDisfrutadas}</span><span>Pendientes {vacPendientes} ●</span>
            </div>
          </div>

          {/* ZONA 3 — Ausencias y festivos */}
          <div>
            <div style={{ fontSize: 9, color: C.inkLight, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Festivos y ausencias del periodo</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
              {chip("🎉", "Festivos", festivos, C.amber, C.amberBg)}
              {chip("🏥", "Incapacidad", incap, C.red, C.redBg)}
              {chip("📋", "Lic. rem.", licRem, C.purple, C.purpleBg)}
              {chip("⏸️", "Lic. no rem.", licNoRem, C.inkMid, "#FAFAF8")}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
