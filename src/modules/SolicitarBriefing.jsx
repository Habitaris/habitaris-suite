import React, { useState, useEffect } from "react";

// ===========================================================
// SolicitarBriefing — Pagina publica de captacion de leads.
// Estetica 1:1 con plantilla invitation del email
//   exterior lavanda #f3f0ff, card blanca radius 8px,
//   header con logo .jpg, boton negro #111 radius 6px,
//   footer con razon social + NIT + telefono.
// Ruta publica: /solicitar-briefing (sin login).
// POST a /api/send-email?action=briefing_request
// ===========================================================

// TODO: Cargar dinámicamente desde tenant_config (ver MEMORIA_HABITARIS.md)
// Por ahora, marca por defecto del tenant Habitaris.
const MARCA = {
  logo: "https://suite.habitaris.es/logo-habitaris.jpg",
  empresa: "Habitaris S.A.S",
  nit: "NIT 901.922.136-8",
  ciudad: "Bogotá D.C., Colombia",
  telefono: "+57 350 566 1545",
  emailContacto: "comercial@habitaris.es",
};
const LOGO_URL = MARCA.logo;

const COLOR_EXT = "#f3f0ff";   // lavanda fondo exterior
const COLOR_INK = "#111";       // texto/boton principal
const COLOR_SOFT = "#333";      // texto secundario
const COLOR_MUTED = "#888";     // metadata, footer claro
const COLOR_BORDER = "#eee";    // borde header
const COLOR_INPUT_BORDER = "#ddd";
const COLOR_ERROR_BG = "#fdecea";
const COLOR_ERROR_TXT = "#a51c0e";

const S = {
  page: {
    minHeight: "100vh",
    margin: 0,
    padding: "32px 16px",
    background: COLOR_EXT,
    color: COLOR_INK,
    fontFamily: "Outfit, -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif",
    boxSizing: "border-box",
  },
  card: {
    background: "#fff",
    borderRadius: 8,
    maxWidth: 560,
    width: "100%",
    margin: "0 auto",
    overflow: "hidden",
  },
  header: {
    background: "#fff",
    padding: 24,
    textAlign: "center",
    borderBottom: "1px solid " + COLOR_BORDER,
  },
  logo: {
    height: 50,
    width: "auto",
    display: "inline-block",
  },
  body: {
    padding: "32px 40px",
  },
  h1: {
    margin: "0 0 16px 0",
    fontSize: 20,
    fontWeight: 700,
    color: COLOR_INK,
  },
  intro: {
    margin: "0 0 16px 0",
    fontSize: 15,
    lineHeight: 1.6,
    color: COLOR_SOFT,
  },
  highlightBox: {
    background: COLOR_EXT,
    borderLeft: "3px solid " + COLOR_INK,
    padding: "14px 16px",
    margin: "20px 0",
    borderRadius: 4,
    fontSize: 14,
    color: COLOR_SOFT,
  },
  field: { marginBottom: 16 },
  label: {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: "0.5px",
    textTransform: "uppercase",
    color: COLOR_SOFT,
    marginBottom: 6,
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    fontSize: 15,
    border: "1px solid " + COLOR_INPUT_BORDER,
    borderRadius: 6,
    background: "#fff",
    color: COLOR_INK,
    fontFamily: "inherit",
    boxSizing: "border-box",
    outline: "none",
  },
  row: { display: "flex", gap: 8 },
  prefix: {
    padding: "12px 14px",
    fontSize: 15,
    border: "1px solid " + COLOR_INPUT_BORDER,
    borderRadius: 6,
    background: "#fff",
    color: COLOR_INK,
    fontFamily: "inherit",
    outline: "none",
    minWidth: 92,
  },
  textarea: {
    width: "100%",
    padding: "12px 14px",
    fontSize: 15,
    border: "1px solid " + COLOR_INPUT_BORDER,
    borderRadius: 6,
    background: "#fff",
    color: COLOR_INK,
    fontFamily: "inherit",
    boxSizing: "border-box",
    outline: "none",
    minHeight: 88,
    resize: "vertical",
  },
  honeypot: {
    position: "absolute",
    left: "-9999px",
    width: 1,
    height: 1,
    opacity: 0,
    pointerEvents: "none",
  },
  ctaWrap: { textAlign: "center", margin: "28px 0 8px" },
  btn: {
    display: "inline-block",
    minWidth: 220,
    padding: "12px 28px",
    fontSize: 15,
    fontWeight: 600,
    background: COLOR_INK,
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  btnDisabled: { opacity: 0.55, cursor: "not-allowed" },
  error: {
    background: COLOR_ERROR_BG,
    color: COLOR_ERROR_TXT,
    padding: "10px 14px",
    borderRadius: 6,
    fontSize: 14,
    marginBottom: 16,
  },
  smallPrint: {
    margin: "16px 0 0",
    fontSize: 13,
    color: COLOR_SOFT,
    lineHeight: 1.6,
    textAlign: "center",
  },
  footer: {
    padding: "16px 24px 24px",
    textAlign: "center",
    fontSize: 12,
    color: COLOR_MUTED,
    lineHeight: 1.6,
    borderTop: "1px solid " + COLOR_BORDER,
  },
  footerAuto: {
    marginTop: 6,
    fontSize: 11,
    color: COLOR_MUTED,
  },
};
export default function SolicitarBriefing() {
  // Marca blanca: arranca con MARCA hardcoded y se sobreescribe con tenant_config si carga OK.
  // Form info — slug, formId, formNombre. Cargado desde habitaris_formularios kv_store.
  const [formInfo, setFormInfo] = useState({ formId: "", formNombre: "Briefing Inicial Habitaris", slug: "briefing-inicial", publicRequest: null });
  const [marca, setMarca] = useState(MARCA);
  useEffect(() => {
    (async () => {
      try {
        const SUPABASE_URL = "https://xlzkasdskatnikuavefh.supabase.co";
        const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhsemthc2Rza2F0bmlrdWF2ZWZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4OTE3NzQsImV4cCI6MjA4NzQ2Nzc3NH0.SR9tIpvL0YnV9CNrRq4T-xetifuNQOJZE0OnQpwtYLM";
        const r = await fetch(SUPABASE_URL + "/rest/v1/tenant_config?tenant_id=eq.habitaris&select=*", {
          headers: { apikey: ANON_KEY, Authorization: "Bearer " + ANON_KEY }
        });
        if (!r.ok) return;
        const rows = await r.json();
        if (!Array.isArray(rows) || !rows.length) return;
        const cfg = rows[0] || {};
        const empresa = cfg.empresa || {};
        const contacto = cfg.contacto || {};
        const domicilio = cfg.domicilio || {};
        const marca_cfg = cfg.marca || cfg.branding || {};
        setMarca({
          logo: marca_cfg.logo_url || MARCA.logo,
          empresa: empresa.razon_social || empresa.nombre || MARCA.empresa,
          nit: empresa.nit ? ("NIT " + empresa.nit) : MARCA.nit,
          ciudad: domicilio.ciudad ? (domicilio.ciudad + ", " + (domicilio.pais || "Colombia")) : MARCA.ciudad,
          telefono: contacto.tel_publico || MARCA.telefono,
          emailContacto: contacto.email_publico || MARCA.emailContacto,
        });
      } catch (e) {}
    })();
  }, []);

  // D0: cargar formulario por slug de la URL desde habitaris_formularios kv_store.
  // Si la ruta es /solicitar/{slug}, intentamos cargar ese form especifico.
  // Si la ruta es /solicitar-briefing (legacy) o no encuentra slug, se queda en defaults.
  useEffect(() => {
    (async () => {
      try {
        const SUPABASE_URL = "https://xlzkasdskatnikuavefh.supabase.co";
        const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhsemthc2Rza2F0bmlrdWF2ZWZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4OTE3NzQsImV4cCI6MjA4NzQ2Nzc3NH0.SR9tIpvL0YnV9CNrRq4T-xetifuNQOJZE0OnQpwtYLM";
        // Leer slug de la URL: /solicitar/{slug} -> slug. Default briefing-inicial si no hay.
        const path = (typeof window !== "undefined" && window.location && window.location.pathname) || "";
        let slugFromUrl = "briefing-inicial";
        if (path.startsWith("/solicitar/")) {
          slugFromUrl = path.substring("/solicitar/".length).split("/")[0].split("?")[0] || "briefing-inicial";
        }
        const r = await fetch(SUPABASE_URL + "/rest/v1/kv_store?key=eq.habitaris_formularios&select=value", {
          headers: { apikey: ANON_KEY, Authorization: "Bearer " + ANON_KEY }
        });
        if (!r.ok) return;
        const rows = await r.json();
        if (!Array.isArray(rows) || !rows.length) return;
        const raw = rows[0].value;
        const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
        const formsArr = (parsed && Array.isArray(parsed.forms)) ? parsed.forms : [];
        // Buscar form donde publicRequest.slug === slugFromUrl
        const f = formsArr.find(x => x && x.publicRequest && x.publicRequest.slug === slugFromUrl);
        if (!f) return;
        setFormInfo({
          formId: f.id || "",
          formNombre: f.nombre || f.name || "Briefing Inicial Habitaris",
          slug: slugFromUrl,
          publicRequest: f.publicRequest || null,
        });
      } catch (e) {}
    })();
  }, []);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [prefix, setPrefix] = useState("+57");
  const [telefono, setTelefono] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [status, setStatus] = useState("idle"); // idle | sending | success
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    setErrorMsg("");

    const nombreTrim = nombre.trim();
    const emailTrim = email.trim().toLowerCase();
    const telTrim = telefono.trim();

    if (nombreTrim.length < 3) {
      setErrorMsg("Indica tu nombre completo (minimo 3 caracteres).");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
      setErrorMsg("El email no parece valido.");
      return;
    }
    if (telTrim.length < 7) {
      setErrorMsg("Indica un telefono valido (minimo 7 digitos).");
      return;
    }

    setStatus("sending");
    try {
      const res = await fetch("/api/send-email?action=briefing_request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre_completo: nombreTrim,
          email: emailTrim,
          telefono: prefix + " " + telTrim,
          mensaje_opcional: mensaje.trim(),
          website: website,
          form_id: formInfo.formId,
          form_nombre: formInfo.formNombre,
          form_slug: formInfo.slug,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data && data.ok) {
        setStatus("success");
      } else {
        setErrorMsg((data && data.error) || "No se pudo enviar la solicitud. Intentalo de nuevo en unos minutos.");
        setStatus("idle");
      }
    } catch (err) {
      setErrorMsg("Error de conexion. Revisa tu internet e intentalo de nuevo.");
      setStatus("idle");
    }
  }

  const FooterBlock = (
    <div style={S.footer}>
      {`${marca.empresa} · ${marca.nit} · ${marca.ciudad} · ${marca.telefono}`}
      <div style={S.footerAuto}>{`Si tienes cualquier duda, escríbenos a ${marca.emailContacto}.`}</div>
    </div>
  );

  const Header = (
    <div style={S.header}>
      <img src={marca.logo} alt={marca.empresa} style={S.logo} />
    </div>
  );

  // ---- PANTALLA DE EXITO ----
  if (status === "success") {
    return (
      <div style={S.page}>
        <div style={S.card}>
          {Header}
          <div style={S.body}>
            <h1 style={S.h1}>Solicitud recibida</h1>
            <p style={S.intro}>
              Gracias, <strong>{nombre.trim()}</strong>. Hemos recibido tu solicitud.
            </p>
            <div style={S.highlightBox}>
              En las proximas horas recibiras un correo en <strong>{email.trim().toLowerCase()}</strong>{" "}
              con el formulario de briefing para que podamos entender tu proyecto.
            </div>
            <p style={S.intro}>
              Si no lo ves en tu bandeja principal, revisa la carpeta de promociones o spam.
            </p>
          </div>
          {FooterBlock}
        </div>
      </div>
    );
  }

  const sending = status === "sending";
  const btnStyle = sending ? { ...S.btn, ...S.btnDisabled } : S.btn;
  // ---- PANTALLA DEL FORMULARIO ----
  return (
    <div style={S.page}>
      <div style={S.card}>
        {Header}
        <div style={S.body}>
          <h1 style={S.h1}>Solicita tu briefing</h1>
          <p style={S.intro}>
            Cuentanos un poco sobre ti y te enviaremos por correo el formulario de briefing inicial.
            {" "}Es el primer paso para que podamos disenar el proyecto que tienes en mente.
          </p>

          {errorMsg ? <div style={S.error}>{errorMsg}</div> : null}

          <form onSubmit={handleSubmit} noValidate>
            <div style={S.field}>
              <label style={S.label} htmlFor="sb-nombre">Nombres y apellidos</label>
              <input
                id="sb-nombre"
                type="text"
                style={S.input}
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Juan Carlos Perez Garcia"
                autoComplete="name"
                disabled={sending}
                required
              />
            </div>

            <div style={S.field}>
              <label style={S.label} htmlFor="sb-email">Email</label>
              <input
                id="sb-email"
                type="email"
                style={S.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                autoComplete="email"
                disabled={sending}
                required
              />
            </div>

            <div style={S.field}>
              <label style={S.label} htmlFor="sb-tel">Telefono / WhatsApp</label>
              <div style={S.row}>
                <select
                  style={S.prefix}
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  disabled={sending}
                >
                  <option value="+57">+57 CO</option>
                  <option value="+34">+34 ES</option>
                  <option value="+1">+1 US</option>
                  <option value="+52">+52 MX</option>
                  <option value="+54">+54 AR</option>
                  <option value="+56">+56 CL</option>
                  <option value="+51">+51 PE</option>
                  <option value="+58">+58 VE</option>
                  <option value="+593">+593 EC</option>
                </select>
                <input
                  id="sb-tel"
                  type="tel"
                  style={{ ...S.input, flex: 1 }}
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="3001234567"
                  autoComplete="tel"
                  disabled={sending}
                  required
                />
              </div>
            </div>

            <div style={S.field}>
              <label style={S.label} htmlFor="sb-msg">Cuentanos brevemente (opcional)</label>
              <textarea
                id="sb-msg"
                style={S.textarea}
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                placeholder="Tipo de proyecto, espacio, ciudad..."
                disabled={sending}
                maxLength={500}
              />
            </div>

            {/* Honeypot anti-bot, no visible al usuario */}
            <div style={S.honeypot} aria-hidden="true">
              <label htmlFor="sb-website">No rellenes este campo</label>
              <input
                id="sb-website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>

            <div style={S.ctaWrap}>
              <button type="submit" style={btnStyle} disabled={sending}>
                {sending ? "Enviando..." : "Solicitar briefing"}
              </button>
            </div>

            <p style={S.smallPrint}>
              Tus datos solo se usan para contactarte sobre tu proyecto.
            </p>
          </form>
        </div>
        {FooterBlock}
      </div>
    </div>
  );
}
