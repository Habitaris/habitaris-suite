import React, { useState, useEffect } from "react";

// Historial de cambios de condiciones del trabajador (solo lectura, estética editorial).
// Lee hab:rrhh:condiciones:{empId} — los cambios con fecha de vigencia que registra el módulo
// de Condiciones (ARL, salario, aux, bono). Es, de facto, el registro de otrosíes.

const INK = "#111", MID = "#666", LIGHT = "#999", BORDER = "#E5E3DE", LINE = "#EFEEEA";
const MONO = "'DM Mono',monospace";
const ARL_CORTO = ["I", "II", "III", "IV", "V"];

const fmtFecha = (s) => {
  if (!s) return "—";
  try { return new Date(s + "T12:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" }); }
  catch { return s; }
};
const cop = (v) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v || 0);

function describe(campo, val) {
  if (campo === "arl") return ["Clase de riesgo ARL", "Clase " + (ARL_CORTO[val] || val)];
  if (campo === "sal") return ["Salario base", cop(val)];
  if (campo === "auxT") return ["Auxilio de transporte", cop(val)];
  if (campo === "bono") return ["Bono", cop(val)];
  if (campo === "reg") return ["Régimen de salud", val === "subsidiado" ? "Subsidiado" : "Contributivo"];
  return [campo, String(val)];
}

export default function HistorialCondiciones({ empId }) {
  const [cond, setCond] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!empId) return;
    setLoading(true);
    fetch("/api/hiring?kv=rrhh:condiciones:" + empId + "&flat=1")
      .then((r) => r.json())
      .then((d) => { setCond(Array.isArray(d.data) ? d.data : []); setLoading(false); })
      .catch(() => { setCond([]); setLoading(false); });
  }, [empId]);

  if (loading) return <div style={{ fontSize: 12, color: LIGHT, padding: 8 }}>Cargando…</div>;
  const items = (cond || []).slice().sort((a, b) => (b.desde || "").localeCompare(a.desde || "")); // más reciente primero

  if (items.length === 0) {
    return <div style={{ fontSize: 12, color: LIGHT, fontStyle: "italic", padding: "6px 0" }}>Sin cambios de condiciones registrados. Las modificaciones (ARL, salario, etc.) que registres aparecerán aquí como historial.</div>;
  }

  return (
    <div style={{ position: "relative", paddingLeft: 18 }}>
      {/* línea vertical del timeline */}
      <div style={{ position: "absolute", left: 4, top: 6, bottom: 6, width: 1, background: BORDER }} />
      {items.map((c, i) => {
        const campos = Object.keys(c).filter((k) => k !== "desde" && k !== "_nota");
        return (
          <div key={i} style={{ position: "relative", paddingBottom: i === items.length - 1 ? 0 : 16 }}>
            {/* punto */}
            <div style={{ position: "absolute", left: -18, top: 4, width: 9, height: 9, borderRadius: "50%", background: i === 0 ? INK : "#fff", border: `1.5px solid ${INK}` }} />
            <div style={{ fontSize: 10, fontWeight: 700, color: i === 0 ? INK : MID, fontFamily: MONO }}>{fmtFecha(c.desde)}{i === 0 ? "  · vigente" : ""}</div>
            <div style={{ marginTop: 3 }}>
              {campos.map((k) => {
                const [lbl, val] = describe(k, c[k]);
                return (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "3px 0", borderBottom: `1px solid ${LINE}` }}>
                    <span style={{ fontSize: 11, color: MID }}>{lbl}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: INK, fontFamily: MONO }}>{val}</span>
                  </div>
                );
              })}
              {c._nota && <div style={{ fontSize: 9.5, color: LIGHT, fontStyle: "italic", marginTop: 3 }}>{c._nota}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
