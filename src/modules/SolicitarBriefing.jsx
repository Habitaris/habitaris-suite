import React, { useState } from "react";

// ===========================================================
// SolicitarBriefing — Pagina publica para que un cliente
// potencial solicite el formulario de briefing inicial.
// Ruta: /solicitar-briefing (sin login).
// POST a /api/send-email?action=briefing_request
// ===========================================================

const COLORS = {
  cream: "#f5f2ee",
  ink: "#111110",
  inkSoft: "#3a3a39",
  muted: "#888",
  bgSoft: "#faf8f5",
  border: "#e8e3dc",
  errorBg: "#fdecea",
  errorTxt: "#a51c0e",
  successBg: "#e8f5e9",
};

const S = {
  page: {
    minHeight: "100vh",
    background: COLORS.cream,
    fontFamily: "-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif",
    color: COLORS.ink,
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    padding: "48px 16px",
    boxSizing: "border-box",
  },
  wrap: {
    width: "100%",
    maxWidth: 520,
  },
  brand: {
    fontSize: 13,
    letterSpacing: "2px",
    color: COLORS.muted,
    textTransform: "uppercase",
    marginBottom: 16,
    textAlign: "center",
  },
  card: {
    background: "#fff",
    borderRadius: 12,
    padding: "36px 32px",
    boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
  },
  h1: {
    fontSize: 24,
    margin: "0 0 10px",
    fontWeight: 600,
  },
  intro: {
    margin: "0 0 24px",
    color: COLORS.inkSoft,
    lineHeight: 1.55,
    fontSize: 15,
  },
  label: {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: "0.5px",
    textTransform: "uppercase",
    color: COLORS.inkSoft,
    marginBottom: 6,
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    fontSize: 15,
    border: "1px solid " + COLORS.border,
    borderRadius: 8,
    background: "#fff",
    color: COLORS.ink,
    fontFamily: "inherit",
    boxSizing: "border-box",
    outline: "none",
  },
  field: { marginBottom: 18 },
  row: { display: "flex", gap: 8 },
  prefix: {
    padding: "12px 14px",
    fontSize: 15,
    border: "1px solid " + COLORS.border,
    borderRadius: 8,
    background: COLORS.bgSoft,
    color: COLORS.ink,
    fontFamily: "inherit",
    outline: "none",
    minWidth: 88,
  },
  textarea: {
    width: "100%",
    padding: "12px 14px",
    fontSize: 15,
    border: "1px solid " + COLORS.border,
    borderRadius: 8,
    background: "#fff",
    color: COLORS.ink,
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
  btn: {
    width: "100%",
    padding: "14px 24px",
    fontSize: 15,
    fontWeight: 600,
    background: COLORS.ink,
    color: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontFamily: "inherit",
    marginTop: 8,
  },
  btnDisabled: {
    opacity: 0.55,
    cursor: "not-allowed",
  },
  error: {
    background: COLORS.errorBg,
    color: COLORS.errorTxt,
    padding: "10px 14px",
    borderRadius: 8,
    fontSize: 14,
    marginBottom: 16,
  },
  footer: {
    marginTop: 20,
    fontSize: 12,
    color: COLORS.muted,
    textAlign: "center",
    lineHeight: 1.5,
  },
};
export default function SolicitarBriefing() {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [prefix, setPrefix] = useState("+57");
  const [telefono, setTelefono] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [status, setStatus] = useState("idle"); // idle | sending | success | error
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

  // ---- PANTALLA DE EXITO ----
  if (status === "success") {
    return (
      <div style={S.page}>
        <div style={S.wrap}>
          <div style={S.brand}>Habitaris</div>
          <div style={S.card}>
            <h1 style={S.h1}>Solicitud recibida</h1>
            <p style={S.intro}>
              Gracias, <strong>{nombre.trim()}</strong>. Hemos recibido tu solicitud.
              {" "}En las proximas horas recibiras un correo en <strong>{email.trim().toLowerCase()}</strong>{" "}
              con el formulario de briefing para que podamos entender tu proyecto.
            </p>
            <p style={S.intro}>
              Si no lo ves en tu bandeja de entrada, revisa la carpeta de promociones o spam.
            </p>
            <div style={S.footer}>
              Habitaris S.A.S. &middot; Diseno e Interiorismo &middot; Bogota
            </div>
          </div>
        </div>
      </div>
    );
  }

  const sending = status === "sending";
  const btnStyle = sending ? { ...S.btn, ...S.btnDisabled } : S.btn;
  // ---- PANTALLA DEL FORMULARIO ----
  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <div style={S.brand}>Habitaris</div>
        <div style={S.card}>
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

            <button type="submit" style={btnStyle} disabled={sending}>
              {sending ? "Enviando..." : "Solicitar briefing"}
            </button>
          </form>

          <div style={S.footer}>
            Tus datos solo se usan para contactarte sobre tu proyecto.
            <br />Habitaris S.A.S. &middot; Diseno e Interiorismo &middot; Bogota
          </div>
        </div>
      </div>
    </div>
  );
}
