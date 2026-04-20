// ──────────────────────────────────────────────────────────────
// Sistema de toasts no-modal para Habitaris Suite
//
// Uso:
//   window.toast("mensaje", "success"|"error"|"info"|"warning")
//
// Reemplaza alert() nativo que bloquea la pestaña. Los toasts
// aparecen en la esquina inferior derecha, se apilan y
// desaparecen automáticamente.
//
// Montar una vez en App.jsx con <ToastContainer/>.
// ──────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback } from "react";

const COLORS = {
  success: { bg:"#F0FDF4", border:"#86EFAC", ink:"#166534", icon:"✅" },
  error:   { bg:"#FEF2F2", border:"#FCA5A5", ink:"#991B1B", icon:"❌" },
  warning: { bg:"#FFFBEB", border:"#FCD34D", ink:"#92400E", icon:"⚠️" },
  info:    { bg:"#EFF6FF", border:"#93C5FD", ink:"#1E3A8A", icon:"ℹ️" },
};

// Helper global: window.toast(msg, type)
// Expuesto en window para que también funcione desde código no-React (handlers HTML, scripts inline, etc.)
if (typeof window !== "undefined" && !window.toast) {
  window.toast = function(message, type = "info", durationMs = 4000) {
    window.dispatchEvent(new CustomEvent("habitaris:toast", {
      detail: { message: String(message), type, durationMs, id: Date.now() + Math.random() }
    }));
  };
}

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    const handler = (ev) => {
      const t = ev.detail;
      setToasts(prev => [...prev, t]);
      setTimeout(() => removeToast(t.id), t.durationMs || 4000);
    };
    window.addEventListener("habitaris:toast", handler);
    return () => window.removeEventListener("habitaris:toast", handler);
  }, [removeToast]);

  return (
    <div style={{
      position: "fixed",
      bottom: 20,
      right: 20,
      zIndex: 10000,
      display: "flex",
      flexDirection: "column-reverse",
      gap: 8,
      pointerEvents: "none"
    }}>
      {toasts.map(t => {
        const c = COLORS[t.type] || COLORS.info;
        return (
          <div key={t.id}
            onClick={() => removeToast(t.id)}
            style={{
              background: c.bg,
              border: `1px solid ${c.border}`,
              borderRadius: 6,
              padding: "10px 14px",
              minWidth: 260,
              maxWidth: 420,
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 12,
              fontWeight: 500,
              color: c.ink,
              cursor: "pointer",
              pointerEvents: "auto",
              animation: "sk-slide-in 0.25s ease-out"
            }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>{c.icon}</span>
            <span style={{ flex: 1, lineHeight: 1.4 }}>{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}

export default ToastContainer;
