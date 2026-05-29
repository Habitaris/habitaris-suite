// ════════════════════════════════════════════════════════════════════
// RespuestaModal — Visor flotante de una respuesta de formulario.
// ════════════════════════════════════════════════════════════════════
//
// Estética alineada con los modales de RRHH (cabecera con logo +
// Habitaris S.A.S + NIT, cuerpo en cuadro centrado, botones de
// acción al pie). Componente compartido entre el módulo Formularios
// admin y todos los módulos consumidores (CRM, RRHH, SST, etc.) vía
// FormulariosDelModulo.
//
// Acciones:
// - 📥 Descargar PDF (vía html2canvas + jspdf, en pestaña nueva con
//   botones "Descargar PDF" e "Imprimir", patrón RRHH).
// - 📊 Descargar Excel (CSV simple, abre con Excel/Numbers/Sheets).
// - 🖨️ Imprimir (window.print sobre la vista de impresión).
// - ✕ Cerrar (click fuera, botón, o Esc).
// ════════════════════════════════════════════════════════════════════

import React, { useEffect, useState } from "react";
import { HAB_LOGO } from "../habLogo.js";
import {  getTenantDefaultsSync, getActiveCompanyLegalDataSync } from "../../core/configHelpers.js";

const C = {
  bg: "#f3f0ff",
  border: "#E5E5E5",
  ink: "#111",
  inkMid: "#666",
  inkLight: "#999",
  green: "#1E6B42",
  greenBg: "#E8F4EE",
  amber: "#8C6A00",
  amberBg: "#FAF0E0",
  red: "#B91C1C",
  redBg: "#FAE8E8",
  blue: "#2563EB",
  blueBg: "#EFF6FF",
  accent: "#ebe7ff",
};

/* ── Helpers ────────────────────────────────────────────────── */

function formatVal(v) {
  if (v === undefined || v === null || v === "") return "—";
  if (Array.isArray(v)) return v.length ? v.join(", ") : "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function calculateScoreLocal(resp, form) {
  if (!form?.campos) return null;
  const campos = form.campos.filter(c => c.scoring?.enabled);
  if (campos.length === 0) return null;
  let totalPoints = 0, maxPoints = 0, greens = 0, reds = 0, yellows = 0;
  const details = [];
  campos.forEach(c => {
    const w = c.scoring.weight || 1;
    const key = c.mapKey || c.id;
    let val = resp[key];
    if (val === undefined) return;
    maxPoints += w;
    const rules = c.scoring.rules || {};
    let flag = "neutral";
    if (Array.isArray(val)) {
      const flags = val.map(v => rules[v] || "neutral");
      if (flags.includes("red")) flag = "red";
      else if (flags.every(f => f === "green")) flag = "green";
      else flag = "neutral";
    } else {
      flag = rules[String(val)] || "neutral";
    }
    let points = 0;
    if (flag === "green") { points = w; greens++; }
    else if (flag === "neutral") { points = w * 0.5; yellows++; }
    else { points = 0; reds++; }
    totalPoints += points;
    details.push({ label: c.label, value: Array.isArray(val) ? val.join(", ") : String(val), flag, points, maxPoints: w });
  });
  const score = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) / 10 : 0;
  const level = score >= 7 ? "green" : score >= 4 ? "yellow" : "red";
  const levelLabel = level === "green" ? "🟢 Cliente potencial" : level === "yellow" ? "🟡 Revisar" : "🔴 No califica";
  const conclusion = level === "green"
    ? "Perfil alineado con los servicios. Recomendación: contactar en las próximas 24h."
    : level === "yellow"
    ? "Algunos puntos requieren validación. Recomendación: agendar llamada exploratoria."
    : "Expectativas no alineadas con los servicios. Recomendación: responder cortésmente y archivar.";
  return { score, level, levelLabel, conclusion, greens, reds, yellows, totalPoints, maxPoints, details };
}

/* ── Construcción del HTML imprimible ──────────────────────── */

function buildPrintableHtml({ resp, form, sc, fileName }) {
  const fechaTxt = (resp.fecha || "") + (resp.hora ? " " + resp.hora : "");
  const cliente = {
    nombre: resp.clienteNombre || resp["Nombre completo"] || resp.nombre || "—",
    email: resp.clienteEmail || resp.email || "—",
    tel: resp.clienteTel || resp.telefono || "—",
  };

  // Agrupar campos por sección si existe form.campos
  const skipKeys = new Set(["_sbId", "id", "processed", "link_id", "formularioId", "formularioNombre", "fecha", "hora", "linkId", "clienteNombre", "clienteEmail", "clienteTel"]);
  let bodyHtml = "";

  if (form?.campos?.length) {
    let currentSeccion = null;
    let buf = "";
    const flushSeccion = () => {
      if (buf) {
        bodyHtml += `<div class="section"><h2>${currentSeccion || "Respuestas"}</h2><div class="grid">${buf}</div></div>`;
        buf = "";
      }
    };
    form.campos.forEach(c => {
      if (c.tipo === "seccion") {
        flushSeccion();
        currentSeccion = c.label;
        return;
      }
      if (c.tipo === "info") return;
      const key = c.mapKey || c.id;
      const val = resp[key];
      if (val === undefined || val === null || val === "") return;
      const flag = c.scoring?.enabled
        ? (Array.isArray(val)
            ? (val.map(v => c.scoring.rules?.[v] || "neutral").includes("red") ? "red" : val.every(v => (c.scoring.rules?.[v] || "neutral") === "green") ? "green" : "neutral")
            : (c.scoring.rules?.[String(val)] || "neutral"))
        : null;
      const flagIcon = flag === "green" ? "🟢" : flag === "red" ? "🔴" : flag === "neutral" ? "🟡" : "";
      buf += `<div class="row"><div class="lbl">${flagIcon ? flagIcon + " " : ""}${c.label}</div><div class="val">${formatVal(val)}</div></div>`;
    });
    flushSeccion();
  } else {
    // Fallback: enumerar todos los campos
    let buf = "";
    Object.entries(resp).forEach(([k, v]) => {
      if (skipKeys.has(k) || k.startsWith("_")) return;
      buf += `<div class="row"><div class="lbl">${k}</div><div class="val">${formatVal(v)}</div></div>`;
    });
    bodyHtml += `<div class="section"><h2>Respuestas</h2><div class="grid">${buf}</div></div>`;
  }

  // Cabecera de score
  let scoreHtml = "";
  if (sc) {
    const col = sc.level === "green" ? "#1E6B42" : sc.level === "yellow" ? "#8C6A00" : "#B91C1C";
    const bg = sc.level === "green" ? "#E8F4EE" : sc.level === "yellow" ? "#FAF0E0" : "#FAE8E8";
    scoreHtml = `<div class="score" style="background:${bg};border-color:${col}33;color:${col}">
      <div class="score-num">${sc.score.toFixed(1)}<span style="font-size:10pt">/10</span></div>
      <div style="flex:1"><div style="font-weight:700">${sc.levelLabel}</div><div style="font-size:9pt;opacity:.85">${sc.conclusion}</div></div>
      <div class="score-stats"><span class="g">🟢 ${sc.greens}</span> <span class="y">🟡 ${sc.yellows}</span> <span class="r">🔴 ${sc.reds}</span></div>
    </div>`;
  }

  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/><title>${fileName}</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"><\/script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"><\/script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Helvetica,Arial,sans-serif;background:#e5e5e5;padding:20px 0}
#content{background:#fff;width:794px;margin:0 auto;padding:35px 45px;font-size:9pt;color:#111;line-height:1.45;box-shadow:0 0 8px rgba(0,0,0,.15)}
.hdr{border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:14px;overflow:hidden}
.hdr .l{float:left}.hdr .r{float:right;text-align:right;font-size:8pt;color:#666;padding-top:6px}
.hdr img{height:36px}
h1{font-size:14pt;text-align:center;margin:14px 0 4px;clear:both}
.subtitle{font-size:9pt;color:#666;text-align:center;margin-bottom:18px}
.cliente{background:#F5F4F1;border-radius:4px;padding:10px 14px;margin-bottom:14px;font-size:10pt}
.cliente strong{color:#111}
.score{display:flex;align-items:center;gap:14px;padding:12px 16px;border-radius:6px;border:1px solid;margin-bottom:18px}
.score-num{font-size:24pt;font-weight:800;font-family:'Courier New',monospace}
.score-stats{display:flex;gap:10px;font-size:10pt;font-weight:700}
.section{margin-bottom:14px}
.section h2{font-size:10pt;text-transform:uppercase;letter-spacing:.5px;color:#888;border-bottom:1px solid #ddd;padding-bottom:4px;margin-bottom:8px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 14px}
.row{padding:5px 0;border-bottom:1px dotted #eee}
.lbl{font-size:8pt;color:#888;font-weight:600;text-transform:uppercase;letter-spacing:.3px}
.val{font-size:10pt;color:#111;font-weight:500;margin-top:1px}
.foot{font-size:7pt;color:#aaa;text-align:center;margin-top:24px;padding-top:8px;border-top:1px solid #eee}
.np{text-align:center;margin:16px auto;max-width:794px}
.btn{background:#111;color:#fff;border:none;padding:10px 24px;border-radius:4px;cursor:pointer;font-size:11pt;font-weight:600;margin:0 4px}
.btn2{background:#fff;color:#111;border:1px solid #111;padding:10px 24px;border-radius:4px;cursor:pointer;font-size:11pt;margin:0 4px}
@media print{body{background:#fff;padding:0}.np{display:none}#content{width:100%;margin:0;padding:0;box-shadow:none}}
</style></head><body>
<div id="content">
  <div class="hdr">
    <div class="l"><img src="${HAB_LOGO}" alt="Habitaris"/></div>
    <div class="r"><div style="font-weight:600;color:#111">Habitaris S.A.S</div><div>NIT: ${getActiveCompanyLegalDataSync().taxId}</div></div>
  </div>
  <h1>${form?.nombre || resp.formularioNombre || "Respuesta"}</h1>
  <div class="subtitle">${fechaTxt}</div>
  <div class="cliente"><strong>${cliente.nombre}</strong>${cliente.email !== "—" ? ` · ${cliente.email}` : ""}${cliente.tel !== "—" ? ` · ${cliente.tel}` : ""}</div>
  ${scoreHtml}
  ${bodyHtml}
  <div class="foot">Documento generado por Habitaris Suite · ${new Date().toLocaleString(getTenantDefaultsSync().locale)}</div>
</div>
<div class="np">
  <button class="btn" onclick="(function(){var el=document.getElementById('content');el.style.boxShadow='none';document.querySelector('.np').style.display='none';html2canvas(el,{scale:2,useCORS:true,width:el.scrollWidth,windowWidth:el.scrollWidth,backgroundColor:'#fff'}).then(function(c){var img=c.toDataURL('image/jpeg',0.98);var pW=210,pH=(c.height*pW)/c.width;var pdf=new jspdf.jsPDF({orientation:'portrait',unit:'mm',format:'a4'});if(pH<=297){pdf.addImage(img,'JPEG',0,0,pW,pH)}else{var pos=0,pg=0;while(pos<pH){if(pg>0)pdf.addPage();pdf.addImage(img,'JPEG',0,-pos,pW,pH);pos+=297;pg++}}pdf.save('${fileName}.pdf');el.style.boxShadow='0 0 8px rgba(0,0,0,.15)';document.querySelector('.np').style.display=''})})()">📥 Descargar PDF</button>
  <button class="btn2" onclick="window.print()">🖨️ Imprimir</button>
  <button class="btn2" onclick="window.close()">✕ Cerrar</button>
</div>
</body></html>`;
}

/* ── Descarga Excel (CSV) ─────────────────────────────────── */

function downloadExcel({ resp, form, fileName }) {
  const skipKeys = new Set(["_sbId", "id", "processed", "link_id", "formularioId", "formularioNombre", "linkId"]);
  const rows = [["Campo", "Valor", "Bandera"]];

  if (form?.campos?.length) {
    form.campos.forEach(c => {
      if (c.tipo === "seccion" || c.tipo === "info") return;
      const key = c.mapKey || c.id;
      const val = resp[key];
      if (val === undefined || val === null || val === "") return;
      let flag = "";
      if (c.scoring?.enabled) {
        const rules = c.scoring.rules || {};
        const f = Array.isArray(val)
          ? (val.map(v => rules[v] || "neutral").includes("red") ? "red" : val.every(v => (rules[v] || "neutral") === "green") ? "green" : "neutral")
          : (rules[String(val)] || "neutral");
        flag = f === "green" ? "Verde" : f === "red" ? "Roja" : "Neutra";
      }
      rows.push([c.label, formatVal(val), flag]);
    });
  } else {
    Object.entries(resp).forEach(([k, v]) => {
      if (skipKeys.has(k) || k.startsWith("_")) return;
      rows.push([k, formatVal(v), ""]);
    });
  }

  // CSV con BOM para Excel español
  const csv = "\uFEFF" + rows.map(r => r.map(c => '"' + String(c || "").replace(/"/g, '""') + '"').join(";")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = fileName + ".csv";
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ── Componente principal ─────────────────────────────────── */

export default function RespuestaModal({ open, resp, form, onClose, onProcesar, isProcesado }) {
  const [showDownload, setShowDownload] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onEsc = e => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  // Cerrar dropdown al click fuera
  useEffect(() => {
    if (!showDownload) return;
    const close = () => setShowDownload(false);
    setTimeout(() => document.addEventListener("click", close, { once: true }), 0);
    return () => document.removeEventListener("click", close);
  }, [showDownload]);

  if (!open || !resp) return null;

  const sc = calculateScoreLocal(resp, form);
  const fechaTxt = (resp.fecha || "") + (resp.hora ? " " + resp.hora : "");
  const cliente = {
    nombre: resp.clienteNombre || resp["Nombre completo"] || resp.nombre || "—",
    email: resp.clienteEmail || resp.email || "—",
    tel: resp.clienteTel || resp.telefono || "—",
  };
  const fileName = "respuesta_" + (resp.formularioNombre || form?.nombre || "form").replace(/[^a-z0-9]/gi, "_") + "_" + (resp.fecha || "").replace(/[^0-9]/g, "");

  const skipKeys = new Set(["_sbId", "id", "processed", "link_id", "formularioId", "formularioNombre", "fecha", "hora", "linkId", "clienteNombre", "clienteEmail", "clienteTel"]);

  // Agrupar campos
  const grupos = []; // [{seccion, items: [{label, val, flag}]}]
  if (form?.campos?.length) {
    let cur = { seccion: null, items: [] };
    form.campos.forEach(c => {
      if (c.tipo === "seccion") {
        if (cur.items.length) grupos.push(cur);
        cur = { seccion: c.label, items: [] };
        return;
      }
      if (c.tipo === "info") return;
      const key = c.mapKey || c.id;
      const val = resp[key];
      if (val === undefined || val === null || val === "") return;
      let flag = null;
      if (c.scoring?.enabled) {
        const rules = c.scoring.rules || {};
        flag = Array.isArray(val)
          ? (val.map(v => rules[v] || "neutral").includes("red") ? "red" : val.every(v => (rules[v] || "neutral") === "green") ? "green" : "neutral")
          : (rules[String(val)] || "neutral");
      }
      cur.items.push({ label: c.label, val, flag });
    });
    if (cur.items.length) grupos.push(cur);
  } else {
    const items = Object.entries(resp)
      .filter(([k]) => !skipKeys.has(k) && !k.startsWith("_"))
      .map(([k, v]) => ({ label: k, val: v, flag: null }));
    if (items.length) grupos.push({ seccion: "Respuestas", items });
  }

  const handlePrint = () => {
    const html = buildPrintableHtml({ resp, form, sc, fileName });
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); }
    else window.toast?.("Permite ventanas emergentes para imprimir", "warning");
  };

  return (
    <div onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 9999, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 30, paddingBottom: 30, overflowY: "auto", fontFamily: "'Outfit','DM Sans',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');`}</style>
      <div onClick={e => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: 8, width: "min(820px, 94vw)", maxHeight: "calc(100vh - 60px)", display: "flex", flexDirection: "column", boxShadow: "0 12px 40px rgba(0,0,0,0.25)", overflow: "hidden" }}>

        {/* Header con logo, NIT y botón cerrar */}
        <div style={{ borderBottom: "2px solid #111", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff" }}>
          <img src={HAB_LOGO} alt="Habitaris" style={{ height: 30, objectFit: "contain" }} />
          <div style={{ textAlign: "right", fontSize: 9, color: C.inkMid }}>
            <div style={{ fontWeight: 700, color: C.ink, fontSize: 11 }}>Habitaris S.A.S</div>
            <div>NIT: ${getActiveCompanyLegalDataSync().taxId}</div>
          </div>
        </div>

        {/* Cuerpo scrollable */}
        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
          <div style={{ textAlign: "center", marginBottom: 4 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: C.ink }}>{form?.nombre || resp.formularioNombre || "Respuesta"}</h2>
            <div style={{ fontSize: 10, color: C.inkMid, marginTop: 4 }}>{fechaTxt}</div>
          </div>

          {/* Cliente */}
          <div style={{ background: C.accent, borderRadius: 6, padding: "10px 14px", margin: "14px 0", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: "50%", background: C.blue, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700 }}>
              {(cliente.nombre || "?")[0].toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{cliente.nombre}</div>
              <div style={{ fontSize: 9, color: C.blue }}>
                {cliente.email !== "—" ? cliente.email : ""}
                {cliente.tel !== "—" ? (cliente.email !== "—" ? " · " : "") + cliente.tel : ""}
              </div>
            </div>
            {isProcesado != null && (
              <div style={{ padding: "4px 10px", fontSize: 9, fontWeight: 700, borderRadius: 4, background: isProcesado ? C.greenBg : C.amberBg, color: isProcesado ? C.green : C.amber }}>
                {isProcesado ? "✅ Procesado" : "⏳ Pendiente"}
              </div>
            )}
          </div>

          {/* Score / semáforo */}
          {sc && (() => {
            const col = sc.level === "green" ? C.green : sc.level === "yellow" ? C.amber : C.red;
            const bg = sc.level === "green" ? C.greenBg : sc.level === "yellow" ? C.amberBg : C.redBg;
            return (
              <div style={{ marginBottom: 14, border: `1px solid ${col}44`, borderRadius: 6, overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", background: bg }}>
                  <div style={{ fontSize: 26, fontWeight: 800, fontFamily: "'DM Mono',monospace", color: col }}>
                    {sc.score.toFixed(1)}<span style={{ fontSize: 11 }}>/10</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: col }}>{sc.levelLabel}</div>
                    <div style={{ fontSize: 9, color: col, opacity: .85, marginTop: 2 }}>{sc.conclusion}</div>
                  </div>
                  <div style={{ display: "flex", gap: 10, fontSize: 10, fontWeight: 700 }}>
                    <span style={{ color: C.green }}>🟢 {sc.greens}</span>
                    <span style={{ color: C.amber }}>🟡 {sc.yellows}</span>
                    <span style={{ color: C.red }}>🔴 {sc.reds}</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Secciones */}
          {grupos.map((g, gi) => (
            <div key={gi} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: ".5px", borderBottom: `1px solid ${C.border}`, paddingBottom: 4, marginBottom: 8 }}>
                {g.seccion || "Respuestas"}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "6px 14px" }}>
                {g.items.map((it, i) => {
                  const flagIcon = it.flag === "green" ? "🟢" : it.flag === "red" ? "🔴" : it.flag === "neutral" ? "🟡" : "";
                  return (
                    <div key={i} style={{ padding: "5px 0", borderBottom: `1px dotted ${C.border}` }}>
                      <div style={{ fontSize: 8, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: ".3px" }}>
                        {flagIcon ? flagIcon + " " : ""}{it.label}
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 500, color: C.ink, marginTop: 2 }}>{formatVal(it.val)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {grupos.length === 0 && (
            <div style={{ padding: 24, textAlign: "center", color: C.inkLight, fontSize: 11 }}>Sin datos para mostrar</div>
          )}
        </div>

        {/* Footer con botones */}
        <div style={{ borderTop: `1px solid ${C.border}`, padding: "12px 20px", display: "flex", gap: 8, alignItems: "center", justifyContent: "flex-end", background: "#FAFAFA", flexWrap: "wrap" }}>
          {onProcesar && !isProcesado && (
            <button onClick={onProcesar} style={{ padding: "8px 16px", fontSize: 11, fontWeight: 700, border: "none", borderRadius: 5, background: C.blue, color: "#fff", cursor: "pointer", fontFamily: "inherit", marginRight: "auto" }}>
              ⚡ Procesar
            </button>
          )}

          <div style={{ position: "relative" }}>
            <button onClick={(e) => { e.stopPropagation(); setShowDownload(s => !s); }} style={{ padding: "8px 14px", fontSize: 11, fontWeight: 600, border: `1px solid ${C.border}`, borderRadius: 5, background: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
              📥 Descargar como… ▾
            </button>
            {showDownload && (
              <div onClick={e => e.stopPropagation()} style={{ position: "absolute", bottom: "100%", right: 0, marginBottom: 4, background: "#fff", border: `1px solid ${C.border}`, borderRadius: 5, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", minWidth: 180, overflow: "hidden", zIndex: 1 }}>
                <button onClick={() => { setShowDownload(false); handlePrint(); }} style={{ width: "100%", padding: "10px 14px", fontSize: 11, fontWeight: 600, border: "none", background: "#fff", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}>📄 PDF (alta calidad)</button>
                <button onClick={() => { setShowDownload(false); downloadExcel({ resp, form, fileName }); }} style={{ width: "100%", padding: "10px 14px", fontSize: 11, fontWeight: 600, border: "none", borderTop: `1px solid ${C.border}`, background: "#fff", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}>📊 Excel (CSV)</button>
              </div>
            )}
          </div>

          <button onClick={handlePrint} style={{ padding: "8px 14px", fontSize: 11, fontWeight: 600, border: `1px solid ${C.border}`, borderRadius: 5, background: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
            🖨️ Imprimir
          </button>

          <button onClick={onClose} style={{ padding: "8px 16px", fontSize: 11, fontWeight: 700, border: "none", borderRadius: 5, background: C.ink, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
            ✕ Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
