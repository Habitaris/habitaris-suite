import React, { useState } from "react";

// Paleta de colores reutilizada de Formularios.jsx (linea 22)
const T = { bg:"#F5F4F1",surface:"#FFFFFF",ink:"#111",inkMid:"#555",inkLight:"#909090",inkXLight:"#C8C5BE",border:"#E0E0E0",accent:"#EDEBE7",green:"#111111",greenBg:"#E8F4EE",red:"#B91C1C",redBg:"#FAE8E8",amber:"#8C6A00",amberBg:"#FAF0E0",blue:"#3B3B3B",blueBg:"#F0F0F0",purple:"#111111",shadow:"0 1px 3px rgba(0,0,0,.06),0 4px 16px rgba(0,0,0,.05)" };

// =================================================================
export default function TabPublicos({ forms, setForms }) {
  const [editingFormId, setEditingFormId] = useState(null);
  const [copiedSlug, setCopiedSlug] = useState(null);

  // Helper: leer publicRequest de cada formulario
  const getPR = (f) => (f && f.publicRequest) || {};
  const publicForms = (forms || []).filter(f => f && f.publicRequest);
  const formsSinPublic = (forms || []).filter(f => f && !f.publicRequest);

  const buildPublicUrl = (slug) => "https://suite.habitaris.es/solicitar/" + (slug || "");

  const handleCopy = async (slug) => {
    const url = buildPublicUrl(slug);
    try { await navigator.clipboard.writeText(url); } catch (e) {}
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const handleToggleEnabled = async (formId, currentEnabled) => {
    const newForms = (forms || []).map(f => {
      if (f.id !== formId) return f;
      return { ...f, publicRequest: { ...(f.publicRequest || {}), enabled: !currentEnabled } };
    });
    setForms(newForms);
  };

  const handleEnablePublic = (formId) => {
    // Crear publicRequest default para un formulario que aun no lo tiene
    const newForms = (forms || []).map(f => {
      if (f.id !== formId) return f;
      const defaultSlug = (f.nombre || f.title || f.id).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
      return {
        ...f,
        publicRequest: {
          enabled: false,
          slug: defaultSlug || f.id,
          requireApproval: true,
          page: {
            title: "Solicita tu " + (f.nombre || f.title || "formulario").toLowerCase(),
            intro: "Cuentanos un poco sobre ti y te enviaremos por correo el formulario.",
            buttonLabel: "Solicitar",
            successTitle: "Solicitud recibida",
            successBody: "Hemos recibido tu solicitud. En las proximas horas recibiras un correo con el formulario.",
          },
          link: { durationHours: 48, maxUses: 2 },
          emails: {
            approver: {
              subject: "Nueva solicitud de {form_name} - {nombre}",
              introHtml: "Un cliente potencial ha solicitado el formulario. Revisa los datos y aprueba o rechaza la solicitud.",
            },
            client: {
              subject: "Tu {form_name} con Habitaris esta listo",
              introHtml: "Hemos recibido tu solicitud. A continuacion encontraras el formulario para que podamos entender mejor tu proyecto.",
              buttonLabel: "Abrir formulario",
            },
          },
        },
      };
    });
    setForms(newForms);
  };

  // ---- MODAL EDITOR (Commit 9: implementar FormularioPublicoEditor) ----
  if (editingFormId) {
    const f = (forms || []).find(x => x.id === editingFormId);
    if (!f) { setEditingFormId(null); return null; }
    return (
      <div style={{ padding: 24 }}>
        <div style={{ background: T.surface, border: "1px solid " + T.border, borderRadius: 8, padding: 24, maxWidth: 640 }}>
          <h2 style={{ margin: "0 0 12px", fontSize: 20 }}>Configurar formulario publico</h2>
          <p style={{ margin: "0 0 8px", color: T.inkMid }}>Formulario: <strong>{f.nombre || f.title || f.id}</strong></p>
          <p style={{ margin: "0 0 16px", color: T.inkMid, fontSize: 14 }}>El editor visual completo se implementa en el siguiente paso. Por ahora, la configuracion se gestiona desde la BD.</p>
          <button onClick={() => setEditingFormId(null)} style={{ padding: "8px 14px", background: T.ink, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>Volver al listado</button>
        </div>
      </div>
    );
  }

  // ---- LISTADO ----
  return (
    <div style={{ padding: "24px 0" }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 600, color: T.ink }}>Formularios publicos</h2>
        <p style={{ margin: 0, color: T.inkMid, fontSize: 14, lineHeight: 1.55 }}>
          Configura que formularios pueden solicitarse desde una pagina publica, quien debe aprobar la solicitud y como se le entrega al cliente.
        </p>
      </div>

      {publicForms.length === 0 ? (
        <div style={{ background: T.surface, border: "1px solid " + T.border, borderRadius: 8, padding: 32, textAlign: "center", color: T.inkMid }}>
          Ningun formulario tiene configurada solicitud publica todavia.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {publicForms.map(f => {
            const pr = getPR(f);
            const url = buildPublicUrl(pr.slug);
            return (
              <div key={f.id} style={{ background: T.surface, border: "1px solid " + T.border, borderRadius: 8, padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: 15, color: T.ink }}>{f.nombre || f.title || f.id}</span>
                      <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 12, background: pr.enabled ? "#dcfce7" : "#fee2e2", color: pr.enabled ? "#166534" : "#991b1b", fontWeight: 600 }}>
                        {pr.enabled ? "ACTIVO" : "INACTIVO"}
                      </span>
                      <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 12, background: "#f3f0ff", color: "#5b21b6", fontWeight: 600 }}>
                        {pr.requireApproval ? "APROBACION MANUAL" : "AUTO"}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: T.inkMid, fontFamily: "monospace", wordBreak: "break-all" }}>
                      {url}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button onClick={() => handleCopy(pr.slug)} style={{ padding: "8px 14px", fontSize: 13, fontWeight: 500, background: copiedSlug === pr.slug ? "#16a34a" : T.surface, color: copiedSlug === pr.slug ? "#fff" : T.ink, border: "1px solid " + T.border, borderRadius: 6, cursor: "pointer" }}>
                      {copiedSlug === pr.slug ? "Copiado" : "Copiar link"}
                    </button>
                    <button onClick={() => handleToggleEnabled(f.id, pr.enabled)} style={{ padding: "8px 14px", fontSize: 13, fontWeight: 500, background: T.surface, color: T.ink, border: "1px solid " + T.border, borderRadius: 6, cursor: "pointer" }}>
                      {pr.enabled ? "Desactivar" : "Activar"}
                    </button>
                    <button onClick={() => setEditingFormId(f.id)} style={{ padding: "8px 14px", fontSize: 13, fontWeight: 600, background: T.ink, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>
                      Configurar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {formsSinPublic.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 600, color: T.ink }}>Formularios sin configurar</h3>
          <p style={{ margin: "0 0 12px", fontSize: 13, color: T.inkMid }}>
            Estos formularios todavia no tienen configurada solicitud publica. Activa la opcion para empezar.
          </p>
          <div style={{ display: "grid", gap: 8 }}>
            {formsSinPublic.map(f => (
              <div key={f.id} style={{ background: T.surface, border: "1px solid " + T.border, borderRadius: 8, padding: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <span style={{ fontWeight: 500, color: T.ink }}>{f.nombre || f.title || f.id}</span>
                <button onClick={() => handleEnablePublic(f.id)} style={{ padding: "6px 12px", fontSize: 13, background: T.surface, color: T.ink, border: "1px solid " + T.border, borderRadius: 6, cursor: "pointer" }}>
                  Habilitar solicitud publica
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
