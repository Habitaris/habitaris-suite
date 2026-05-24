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
    return <PublicFormEditor form={f} forms={forms} setForms={setForms} onClose={() => setEditingFormId(null)} />;
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

// =============================================================================
// PublicFormEditor - Editor visual de configuracion del link publico
// =============================================================================
function PublicFormEditor({ form, forms, setForms, onClose }) {
  const pr = (form && form.publicRequest) || {};
  const initialEmails = ((pr.emails && pr.emails.approverList) || ["dparra@habitaris.es"]).join("\n");
  
  const [slug, setSlug] = useState(pr.slug || "");
  const [requireApproval, setRequireApproval] = useState(pr.requireApproval !== false);
  const [emailsText, setEmailsText] = useState(initialEmails);
  const [durationHours, setDurationHours] = useState((pr.link && pr.link.durationHours) || 48);
  const [maxUses, setMaxUses] = useState((pr.link && pr.link.maxUses) || 2);
  
  const [pageTitle, setPageTitle] = useState((pr.page && pr.page.title) || "");
  const [pageIntro, setPageIntro] = useState((pr.page && pr.page.intro) || "");
  const [buttonLabel, setButtonLabel] = useState((pr.page && pr.page.buttonLabel) || "Solicitar");
  const [successTitle, setSuccessTitle] = useState((pr.page && pr.page.successTitle) || "");
  const [successBody, setSuccessBody] = useState((pr.page && pr.page.successBody) || "");
  
  const [emailSubject, setEmailSubject] = useState((pr.emails && pr.emails.approver && pr.emails.approver.subject) || "");
  const [emailIntroHtml, setEmailIntroHtml] = useState((pr.emails && pr.emails.approver && pr.emails.approver.introHtml) || "");
  
  const [saved, setSaved] = useState(false);
  
  const handleSave = () => {
    const emailsList = emailsText.split("\n").map(s => s.trim()).filter(s => s && s.includes("@"));
    const newForms = (forms || []).map(x => {
      if (x.id !== form.id) return x;
      return {
        ...x,
        publicRequest: {
          ...(x.publicRequest || {}),
          slug: slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-") || x.publicRequest?.slug || x.id,
          requireApproval: !!requireApproval,
          page: {
            title: pageTitle,
            intro: pageIntro,
            buttonLabel: buttonLabel,
            successTitle: successTitle,
            successBody: successBody,
          },
          link: {
            durationHours: Number(durationHours) || 48,
            maxUses: Number(maxUses) || 2,
          },
          emails: {
            ...(x.publicRequest?.emails || {}),
            approverList: emailsList,
            approver: {
              subject: emailSubject,
              introHtml: emailIntroHtml,
            },
          },
        },
      };
    });
    setForms(newForms);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };
  
  const Section = ({ title, desc, children }) => (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{title}</div>
      {desc && <div style={{ fontSize: 12, color: T.inkLight, marginBottom: 12 }}>{desc}</div>}
      {children}
    </div>
  );
  
  const labelSt = { display: "block", fontSize: 12, color: T.inkMid, marginBottom: 4, fontWeight: 500 };
  const inputSt = { width: "100%", padding: "9px 12px", border: "1px solid " + T.border, borderRadius: 6, fontSize: 14, fontFamily: "inherit", background: T.surface, color: T.ink, boxSizing: "border-box" };
  const taSt = { ...inputSt, minHeight: 80, resize: "vertical" };
  
  return (
    <div style={{ padding: "24px 0" }}>
      <div style={{ marginBottom: 16 }}>
        <button onClick={onClose} style={{ padding: "6px 12px", background: "transparent", border: "1px solid " + T.border, borderRadius: 6, cursor: "pointer", fontSize: 13, color: T.inkMid }}>
          {"\u2190 Volver al listado"}
        </button>
      </div>
      
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 600, color: T.ink }}>Configurar: {form.nombre || form.title || form.id}</h2>
        <p style={{ margin: "6px 0 0", color: T.inkMid, fontSize: 14 }}>Esta configuracion afecta solo a este formulario. Cada formulario tiene la suya.</p>
      </div>
      
      <div style={{ background: T.surface, border: "1px solid " + T.border, borderRadius: 10, padding: 28, maxWidth: 760 }}>
        
        <Section title="URL Publica" desc="El slug que aparecera en la URL: suite.habitaris.es/solicitar/{slug}">
          <label style={labelSt}>Slug</label>
          <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} style={inputSt} placeholder="briefing-inicial" />
        </Section>
        
        <Section title="Modo de envio" desc="Como se procesan las solicitudes que lleguen desde la pagina publica.">
          <div style={{ display: "grid", gap: 8 }}>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: 12, border: "1px solid " + (requireApproval ? T.border : T.ink), borderRadius: 8, cursor: "pointer", background: !requireApproval ? T.accent : "transparent" }}>
              <input type="radio" name="mode" checked={!requireApproval} onChange={() => setRequireApproval(false)} style={{ marginTop: 2 }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: T.ink }}>Automatico</div>
                <div style={{ fontSize: 12, color: T.inkLight, marginTop: 2 }}>El cliente recibe el link directamente sin tu aprobacion. Util para formularios de baja friccion (encuestas, contacto).</div>
              </div>
            </label>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: 12, border: "1px solid " + (requireApproval ? T.ink : T.border), borderRadius: 8, cursor: "pointer", background: requireApproval ? T.accent : "transparent" }}>
              <input type="radio" name="mode" checked={requireApproval} onChange={() => setRequireApproval(true)} style={{ marginTop: 2 }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: T.ink }}>Aprobacion manual</div>
                <div style={{ fontSize: 12, color: T.inkLight, marginTop: 2 }}>Recibimos un email para aprobar antes de mandar el link al cliente. Util para briefings y solicitudes que requieren filtro.</div>
              </div>
            </label>
          </div>
        </Section>
        
        {requireApproval && (
          <Section title="Emails de aprobadores" desc="Lista de correos que recibiran las solicitudes para aprobar. Uno por linea.">
            <textarea value={emailsText} onChange={(e) => setEmailsText(e.target.value)} style={taSt} placeholder={"dparra@habitaris.es\ncomercial@habitaris.es"} />
          </Section>
        )}
        
        <Section title="Configuracion del link generado" desc="Cuando se genera el link para el cliente, estos son los defaults.">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelSt}>Duracion (horas)</label>
              <input type="number" min="1" max="720" value={durationHours} onChange={(e) => setDurationHours(e.target.value)} style={inputSt} />
            </div>
            <div>
              <label style={labelSt}>Maximo de usos</label>
              <input type="number" min="1" max="100" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} style={inputSt} />
            </div>
          </div>
        </Section>
        
        <Section title="Textos de la pagina publica" desc="Lo que ven los clientes en suite.habitaris.es/solicitar/{slug}">
          <label style={labelSt}>Titulo de la pagina</label>
          <input type="text" value={pageTitle} onChange={(e) => setPageTitle(e.target.value)} style={inputSt} />
          
          <label style={{ ...labelSt, marginTop: 12 }}>Texto introductorio</label>
          <textarea value={pageIntro} onChange={(e) => setPageIntro(e.target.value)} style={taSt} />
          
          <label style={{ ...labelSt, marginTop: 12 }}>Etiqueta del boton de envio</label>
          <input type="text" value={buttonLabel} onChange={(e) => setButtonLabel(e.target.value)} style={inputSt} />
          
          <label style={{ ...labelSt, marginTop: 12 }}>Titulo tras enviar</label>
          <input type="text" value={successTitle} onChange={(e) => setSuccessTitle(e.target.value)} style={inputSt} />
          
          <label style={{ ...labelSt, marginTop: 12 }}>Mensaje tras enviar</label>
          <textarea value={successBody} onChange={(e) => setSuccessBody(e.target.value)} style={taSt} />
        </Section>
        
        {requireApproval && (
          <Section title="Email para aprobadores" desc="Personaliza el email que reciben los aprobadores. Placeholders: {form_name}, {nombre}, {email}, {tel}.">
            <label style={labelSt}>Asunto</label>
            <input type="text" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} style={inputSt} />
            
            <label style={{ ...labelSt, marginTop: 12 }}>Cuerpo del email (HTML permitido)</label>
            <textarea value={emailIntroHtml} onChange={(e) => setEmailIntroHtml(e.target.value)} style={{ ...taSt, minHeight: 120 }} />
          </Section>
        )}
        
        <div style={{ display: "flex", gap: 12, alignItems: "center", paddingTop: 12, borderTop: "1px solid " + T.border, marginTop: 12, position: "sticky", bottom: 0, background: T.bg || "#fff", paddingBottom: 12, zIndex: 10 }}>
          <button onClick={handleSave} style={{ padding: "10px 20px", background: T.ink, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 14 }}>
            Guardar cambios
          </button>
          <button onClick={onClose} style={{ padding: "10px 20px", background: "transparent", color: T.inkMid, border: "1px solid " + T.border, borderRadius: 6, cursor: "pointer", fontSize: 14 }}>
            Cancelar
          </button>
          {saved && <span style={{ fontSize: 13, color: T.green, fontWeight: 500 }}>{"\u2713 Guardado"}</span>}
        </div>
        
      </div>
    </div>
  );
}
