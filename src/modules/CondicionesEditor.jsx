import React, { useState, useEffect } from "react";
import { condicionVigente } from "./condicionesHelper.js";

// Editor de condiciones laborales con fecha de vigencia (effective-dated).
// Vive en la ficha del empleado (Personal). Guarda en kv_store
// `hab:rrhh:condiciones:{empId}` vía /api/hiring?kv=rrhh:condiciones:{empId}&flat=1.
//
// Un cambio rige desde su fecha hasta que aparezca otro cambio del mismo concepto.
// El liquidador lee la condición vigente por mes (meses pagados quedan intactos).

const ARL_NIVELES = [
  { idx: 0, label: "I — Mínimo (0,522%)" },
  { idx: 1, label: "II — Bajo (1,044%)" },
  { idx: 2, label: "III — Medio (2,436%)" },
  { idx: 3, label: "IV — Alto (4,350%)" },
  { idx: 4, label: "V — Máximo (6,960%)" },
];
const ARL_CORTO = ["I", "II", "III", "IV", "V"];

// Conceptos que se pueden cambiar. `tipo` define el input.
const CONCEPTOS = [
  { campo: "arl",  label: "Clase de riesgo ARL", tipo: "arl" },
  { campo: "sal",  label: "Salario base",        tipo: "money" },
  { campo: "auxT", label: "Auxilio de transporte", tipo: "money" },
  { campo: "bono", label: "Bono (base mensual)", tipo: "money" },
];

const C = {
  ink: "#1A1A19", inkMid: "#666", inkLight: "#9B9B99",
  border: "#E5E3DE", bg: "#FAFAF8", green: "#1E6B42", red: "#dc2626",
};

const fmtFecha = (s) => {
  if (!s) return "—";
  try { return new Date(s + "T12:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return s; }
};

function valorLegible(campo, val) {
  if (campo === "arl") return "ARL clase " + (ARL_CORTO[val] || val);
  if (campo === "sal") return "Salario " + new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(val || 0);
  if (campo === "auxT") return "Aux. transporte " + new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(val || 0);
  if (campo === "bono") return "Bono " + new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(val || 0);
  return campo + ": " + val;
}

export default function CondicionesEditor({ empId }) {
  const [cond, setCond] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ campo: "arl", valor: "0", desde: "" });

  const kvUrl = "/api/hiring?kv=rrhh:condiciones:" + empId + "&flat=1";

  const cargar = async () => {
    setLoading(true);
    try {
      const r = await fetch(kvUrl);
      const d = await r.json();
      setCond(Array.isArray(d.data) ? d.data : []);
    } catch (_) { setCond([]); }
    setLoading(false);
  };

  useEffect(() => { if (empId) cargar(); }, [empId]);

  const guardar = async (nuevoArray) => {
    setSaving(true);
    try {
      const r = await fetch(kvUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: nuevoArray }),
      });
      if (!r.ok) throw new Error("HTTP " + r.status);
      setCond(nuevoArray);
      window.toast && window.toast("Condición guardada", "success");
    } catch (e) {
      window.toast && window.toast("Error al guardar la condición", "error");
    }
    setSaving(false);
  };

  const addCambio = () => {
    if (!form.desde) { window.toast && window.toast("Indica la fecha de inicio", "error"); return; }
    const concepto = CONCEPTOS.find((c) => c.campo === form.campo);
    let val;
    if (concepto.tipo === "arl") val = parseInt(form.valor, 10) || 0;
    else val = Math.round(parseFloat(String(form.valor).replace(/[^\d.]/g, "")) || 0);
    const registro = { desde: form.desde, [form.campo]: val };
    const nuevo = [...cond, registro].sort((a, b) => a.desde.localeCompare(b.desde));
    guardar(nuevo);
    setAdding(false);
    setForm({ campo: "arl", valor: "0", desde: "" });
  };

  const borrar = (i) => {
    if (!window.confirm("¿Eliminar este cambio de condición? No afecta a meses ya pagados.")) return;
    const nuevo = cond.filter((_, idx) => idx !== i);
    guardar(nuevo);
  };

  const concepto = CONCEPTOS.find((c) => c.campo === form.campo);
  const ordenadas = [...cond].sort((a, b) => a.desde.localeCompare(b.desde));

  const inp = { padding: "7px 9px", border: "1px solid " + C.border, borderRadius: 6, fontSize: 12, fontFamily: "DM Sans,sans-serif", outline: "none", width: "100%" };
  const btn = (bg, fg, brd) => ({ padding: "6px 12px", fontSize: 12, fontWeight: 600, border: "1px solid " + (brd || bg), borderRadius: 6, background: bg, color: fg, cursor: "pointer", fontFamily: "DM Sans,sans-serif" });

  return (
    <div style={{ marginTop: 14, borderTop: "1px solid " + C.border, paddingTop: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.ink }}>📋 Cambios de condiciones</div>
        {!adding && (
          <button onClick={() => setAdding(true)} style={btn(C.bg, C.green, C.green)}>+ Registrar cambio</button>
        )}
      </div>
      <div style={{ fontSize: 10, color: C.inkLight, marginBottom: 10 }}>
        Cada cambio rige desde su fecha hasta el siguiente. El liquidador lo aplica a los meses no pagados; los meses ya pagados quedan intactos.
      </div>

      {adding && (
        <div style={{ background: C.bg, border: "1px solid " + C.border, borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: C.inkLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Concepto</div>
              <select value={form.campo} onChange={(e) => setForm({ ...form, campo: e.target.value, valor: e.target.value === "arl" ? "0" : "" })} style={inp}>
                {CONCEPTOS.map((c) => <option key={c.campo} value={c.campo}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: C.inkLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Nuevo valor</div>
              {concepto.tipo === "arl" ? (
                <select value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} style={inp}>
                  {ARL_NIVELES.map((a) => <option key={a.idx} value={a.idx}>{a.label}</option>)}
                </select>
              ) : (
                <input type="text" inputMode="numeric" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} placeholder="$ valor" style={inp} />
              )}
            </div>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: C.inkLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Aplica desde</div>
              <input type="date" value={form.desde} onChange={(e) => setForm({ ...form, desde: e.target.value })} style={inp} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={addCambio} disabled={saving} style={btn(C.green, "#fff")}>{saving ? "Guardando..." : "Guardar cambio"}</button>
            <button onClick={() => { setAdding(false); setForm({ campo: "arl", valor: "0", desde: "" }); }} style={btn("#fff", C.inkMid, C.border)}>Cancelar</button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ fontSize: 12, color: C.inkLight, padding: 8 }}>Cargando...</div>
      ) : ordenadas.length === 0 ? (
        <div style={{ fontSize: 12, color: C.inkLight, fontStyle: "italic", padding: "8px 0" }}>
          Sin cambios registrados. El liquidador usa los valores actuales de la ficha.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {ordenadas.map((c, i) => {
            const campos = Object.keys(c).filter((k) => k !== "desde" && k !== "_nota");
            return (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", border: "1px solid " + C.border, borderRadius: 6, padding: "8px 10px" }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.ink }}>
                    {campos.map((k) => valorLegible(k, c[k])).join(" · ")}
                  </div>
                  <div style={{ fontSize: 10, color: C.inkLight }}>Desde {fmtFecha(c.desde)}{c._nota ? " · " + c._nota : ""}</div>
                </div>
                <button onClick={() => borrar(i)} style={{ background: "none", border: "none", cursor: "pointer", color: C.red, fontSize: 11, fontFamily: "DM Sans,sans-serif" }}>Eliminar</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
