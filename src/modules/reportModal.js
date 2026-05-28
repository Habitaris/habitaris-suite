// reportModal.js — Visor de informes en overlay (sin abrir pestañas nuevas).
// Reemplaza el patrón window.open + document.write por un modal dentro de la misma página.
// Cualquier modulo importa { openReport } y lo llama con el HTML completo del informe.
//
// openReport(html, opts?) monta un overlay fixed sobre document.body con:
//   - un iframe que renderiza el HTML del informe (aislado, con su propio <style>)
//   - barra superior con botones Imprimir y Cerrar
// Imprimir dispara el print SOLO del iframe del informe.
// Cerrar (o tecla Escape, o click en el fondo) elimina el overlay.
//
// Vanilla DOM a proposito: no depende de React ni de props, asi sirve a todos los
// componentes (TabNomina, AsistenciaPanel, LiqFinalPanel, futuros Centros de Costos).

let _activeOverlay = null;

export function closeReport() {
  if (_activeOverlay && _activeOverlay.parentNode) {
    _activeOverlay.parentNode.removeChild(_activeOverlay);
  }
  _activeOverlay = null;
  document.removeEventListener("keydown", _escHandler);
}

function _escHandler(e) {
  if (e.key === "Escape") closeReport();
}

export function openReport(html, opts) {
  opts = opts || {};
  const titulo = opts.titulo || "Informe";
  // Si ya hay uno abierto, lo quitamos primero (un solo informe a la vez)
  closeReport();

  // Overlay de fondo
  const overlay = document.createElement("div");
  overlay.setAttribute("data-report-modal", "1");
  overlay.style.cssText = [
    "position:fixed","top:0","left:0","right:0","bottom:0","z-index:99999",
    "background:rgba(0,0,0,.55)","display:flex","flex-direction:column",
    "align-items:center","justify-content:flex-start","padding:24px 16px","box-sizing:border-box"
  ].join(";");
  // Cerrar al click en el fondo (no en el contenido)
  overlay.addEventListener("mousedown", function(e){ if (e.target === overlay) closeReport(); });

  // Contenedor del informe
  const box = document.createElement("div");
  box.style.cssText = [
    "background:#fff","border-radius:10px","box-shadow:0 12px 40px rgba(0,0,0,.3)",
    "width:100%","max-width:900px","height:100%","max-height:calc(100vh - 48px)",
    "display:flex","flex-direction:column","overflow:hidden"
  ].join(";");

  // Barra superior con botones
  const bar = document.createElement("div");
  bar.style.cssText = [
    "display:flex","align-items:center","justify-content:space-between",
    "padding:10px 16px","border-bottom:1px solid #E5E3DE","background:#F9F8F4","flex-shrink:0"
  ].join(";");
  const tlbl = document.createElement("div");
  tlbl.textContent = titulo;
  tlbl.style.cssText = "font-family:'DM Sans',sans-serif;font-size:13px;font-weight:700;color:#111";
  const btns = document.createElement("div");
  btns.style.cssText = "display:flex;gap:8px";

  const bPrint = document.createElement("button");
  bPrint.textContent = "🖨 Imprimir / PDF";
  bPrint.style.cssText = "padding:7px 14px;font-size:12px;font-weight:600;border:1px solid #111;border-radius:6px;background:#111;color:#fff;cursor:pointer;font-family:'DM Sans',sans-serif";
  const bClose = document.createElement("button");
  bClose.textContent = "✕ Cerrar";
  bClose.style.cssText = "padding:7px 14px;font-size:12px;font-weight:600;border:1px solid #E5E3DE;border-radius:6px;background:#fff;color:#111;cursor:pointer;font-family:'DM Sans',sans-serif";
  bClose.addEventListener("click", closeReport);
  btns.appendChild(bPrint); btns.appendChild(bClose);
  bar.appendChild(tlbl); bar.appendChild(btns);

  // Iframe del informe
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "flex:1;width:100%;border:none;background:#fff";
  iframe.setAttribute("title", titulo);

  bPrint.addEventListener("click", function(){
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (err) {
      // fallback: si el print del iframe falla, abrir en pestaña como antes
      const w = window.open("", "_blank");
      if (w) { w.document.write(html); w.document.close(); w.print(); }
    }
  });

  box.appendChild(bar);
  box.appendChild(iframe);
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  // Escribir el HTML en el iframe (srcdoc es la via mas robusta)
  iframe.srcdoc = html;

  _activeOverlay = overlay;
  document.addEventListener("keydown", _escHandler);

  return overlay;
}
