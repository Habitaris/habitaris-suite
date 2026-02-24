import { useState, useEffect } from "react";

/**
 * PORTAL CLIENTE HABITARIS
 * Datos de la oferta vienen codificados en el hash de la URL.
 * Las respuestas generan mensajes WhatsApp/email pre-armados.
 */

const C = {
  bg:"#F5F4F1", surface:"#FFFFFF", ink:"#111", inkMid:"#555",
  inkLight:"#909090", border:"#E4E1DB",
  success:"#1E6B42", successBg:"#E8F4EE",
  warning:"#D4840A", warningBg:"#FFF8E7",
  danger:"#AE2C2C", dangerBg:"#FAE8E8",
  info:"#1E4F8C", infoBg:"#E6EFF9",
};

const fmt = (n) => n ? new Intl.NumberFormat("es-CO",{ style:"currency", currency:"COP", maximumFractionDigits:0 }).format(n) : "$ 0";

function decodePortalData() {
  try {
    const hash = window.location.hash.slice(1);
    if (!hash) return null;
    return JSON.parse(decodeURIComponent(atob(hash)));
  } catch { return null; }
}

export function encodePortalData(data) {
  try { return btoa(encodeURIComponent(JSON.stringify(data))); }
  catch { return ""; }
}

export default function PortalCliente() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [verified, setVerified] = useState(false);
  const [action, setAction] = useState(null);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const d = decodePortalData();
    if (d) setData(d); else setError("Enlace no válido o expirado.");
    setLoading(false);
  }, []);

  const verify = () => {
    if (!data) return;
    if (!data.clienteEmail || email.toLowerCase().trim() === (data.clienteEmail||"").toLowerCase().trim()) {
      setVerified(true); setError("");
    } else setError("El email no coincide con el registrado.");
  };

  const sendResponse = (accion) => {
    if (accion === "rechazar" && !comment) { setError("Indique el motivo del rechazo."); return; }
    if (accion === "devolver" && !comment) { setError("Describa los cambios requeridos."); return; }
    setError(""); setSubmitted(true); setAction(accion);
    const labels = { aprobar:"ACEPTADA ✅", rechazar:"RECHAZADA ❌", devolver:"DEVUELTA CON CAMBIOS 🔄" };
    const msg = `📋 RESPUESTA PROPUESTA\n\n` +
      `Ref: ${data.ref||""}\nProyecto: ${data.proyecto||""}\nCliente: ${data.cliente||email}\n` +
      `Decisión: ${labels[accion]}` +
      (comment ? `\n\nComentarios:\n${comment}` : "") +
      `\n\nFecha: ${new Date().toLocaleString("es-CO")}`;
    const tel = (data.telHabitaris||"573001234567").replace(/[^0-9]/g,"");
    setTimeout(() => window.open(`https://wa.me/${tel}?text=${encodeURIComponent(msg)}`, "_blank"), 500);
  };

  const F = { fontFamily:"'Outfit',sans-serif" };

  if (loading) return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ width:40, height:40, border:"3px solid #E4E1DB", borderTopColor:C.info, borderRadius:"50%", animation:"spin .8s linear infinite", margin:"0 auto 16px" }}/>
        <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
        <p style={{ ...F, fontSize:13, color:C.inkLight }}>Cargando propuesta...</p>
      </div>
    </div>
  );

  if (error && !data) return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');`}</style>
      <div style={{ background:C.surface, borderRadius:12, padding:40, maxWidth:400, textAlign:"center", boxShadow:"0 4px 20px rgba(0,0,0,.08)" }}>
        <div style={{ fontSize:40, marginBottom:16 }}>🔒</div>
        <h2 style={{ ...F, fontSize:18, fontWeight:700, margin:"0 0 8px" }}>Acceso no disponible</h2>
        <p style={{ ...F, fontSize:13, color:C.inkMid }}>{error}</p>
      </div>
    </div>
  );

  const d = data || {};

  if (!verified) return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');`}</style>
      <div style={{ background:C.surface, borderRadius:12, padding:40, maxWidth:420, width:"90%", boxShadow:"0 4px 20px rgba(0,0,0,.08)" }}>
        <div style={{ textAlign:"center", marginBottom:24 }}>
          <div style={{ ...F, fontWeight:800, fontSize:18, letterSpacing:4 }}>HABITARIS</div>
          <div style={{ fontSize:8, letterSpacing:2, color:C.inkLight, textTransform:"uppercase" }}>Arquitectura · Interiorismo · Construcción</div>
        </div>
        <div style={{ borderTop:`2px solid ${C.ink}`, paddingTop:20, marginBottom:20 }}>
          <h2 style={{ ...F, fontSize:16, fontWeight:700, margin:"0 0 4px" }}>Propuesta comercial</h2>
          <p style={{ ...F, fontSize:12, color:C.inkMid, margin:0 }}>{d.titulo} · {d.ref}</p>
          {d.proyecto && <p style={{ ...F, fontSize:11, color:C.inkLight, margin:"4px 0 0" }}>Proyecto: {d.proyecto}</p>}
        </div>
        <p style={{ ...F, fontSize:12, color:C.inkMid, marginBottom:16 }}>Ingrese su correo electrónico para ver la propuesta.</p>
        <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(""); }}
          placeholder="su@email.com" onKeyDown={e => e.key==="Enter" && verify()}
          style={{ width:"100%", padding:"10px 14px", border:`1px solid ${C.border}`, borderRadius:6,
            fontSize:14, ...F, marginBottom:8, boxSizing:"border-box" }}/>
        {error && <p style={{ ...F, fontSize:11, color:C.danger, margin:"0 0 8px" }}>{error}</p>}
        <button onClick={verify} style={{ width:"100%", padding:"12px", background:C.ink, color:"#fff",
          border:"none", borderRadius:6, fontSize:14, fontWeight:600, cursor:"pointer", ...F }}>
          Acceder
        </button>
      </div>
    </div>
  );

  if (submitted) {
    const MSGS = {
      aprobar: { icon:"🎉", title:"¡Propuesta aceptada!", msg:"Gracias por su confianza. Habitaris se pondrá en contacto.", color:C.success },
      rechazar: { icon:"📋", title:"Propuesta declinada", msg:"Agradecemos su tiempo. Quedamos atentos.", color:C.danger },
      devolver: { icon:"💬", title:"Cambios solicitados", msg:"Sus comentarios fueron enviados. Recibirá la propuesta actualizada.", color:C.warning },
    };
    const info = MSGS[action] || MSGS.aprobar;
    return (
      <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');`}</style>
        <div style={{ background:C.surface, borderRadius:12, padding:40, maxWidth:480, textAlign:"center", boxShadow:"0 4px 20px rgba(0,0,0,.08)" }}>
          <div style={{ fontSize:48, marginBottom:12 }}>{info.icon}</div>
          <h2 style={{ ...F, fontSize:20, fontWeight:700, color:info.color, margin:"0 0 8px" }}>{info.title}</h2>
          <p style={{ ...F, fontSize:13, color:C.inkMid, lineHeight:1.6 }}>{info.msg}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight:"100vh", background:C.bg }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');*{box-sizing:border-box;margin:0}body{font-family:'Outfit',sans-serif}`}</style>
      <div style={{ background:C.ink, padding:"12px 24px", display:"flex", justifyContent:"space-between", alignItems:"center", position:"sticky", top:0, zIndex:100 }}>
        <div>
          <div style={{ ...F, fontWeight:700, fontSize:14, letterSpacing:3, color:"#fff" }}>HABITARIS</div>
          <div style={{ fontSize:7, letterSpacing:2, color:"rgba(255,255,255,.4)", textTransform:"uppercase" }}>Propuesta comercial</div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ ...F, fontSize:11, color:"rgba(255,255,255,.7)", fontWeight:600 }}>{d.ref}</div>
          <div style={{ fontSize:9, color:"rgba(255,255,255,.4)" }}>{d.fecha}</div>
        </div>
      </div>

      <div style={{ maxWidth:800, margin:"0 auto", padding:"24px 20px 120px" }}>
        <div style={{ textAlign:"center", marginBottom:28, paddingBottom:18, borderBottom:`2px solid ${C.ink}` }}>
          <h1 style={{ ...F, fontSize:20, fontWeight:700, letterSpacing:1, marginBottom:6 }}>{d.titulo}</h1>
          <p style={{ ...F, fontSize:12, color:C.inkMid }}>Para: <strong>{d.cliente}</strong> · Proyecto: <strong>{d.proyecto}</strong></p>
          {d.ubicacion && <p style={{ ...F, fontSize:11, color:C.inkLight }}>{d.ubicacion}</p>}
        </div>

        <div style={{ background:C.ink, borderRadius:8, padding:20, marginBottom:24, textAlign:"center", color:"#fff" }}>
          <div style={{ fontSize:9, letterSpacing:2, textTransform:"uppercase", color:"rgba(255,255,255,.4)", marginBottom:4 }}>Valor total</div>
          <div style={{ ...F, fontSize:32, fontWeight:700 }}>{fmt(d.pvpIva)}</div>
          <div style={{ display:"flex", justifyContent:"center", gap:20, marginTop:8, fontSize:11 }}>
            <span style={{ color:"rgba(255,255,255,.5)" }}>Sin IVA: {fmt(d.pvp)}</span>
            <span style={{ color:"rgba(255,255,255,.5)" }}>IVA: {fmt(d.iva)}</span>
          </div>
        </div>

        {[
          {t:"Alcance del servicio", c:d.alcance}, d.fases?{t:"Fases del proyecto",c:d.fases}:null,
          {t:"Exclusiones",c:d.exclusiones}, {t:"Condiciones de pago",c:d.condPago},
          d.plazo?{t:"Plazo",c:d.plazo}:null, {t:"Garantías",c:d.garantias},
          {t:"Términos y condiciones",c:d.terminos}, {t:"Nota legal",c:d.notaLegal},
        ].filter(Boolean).filter(s=>s.c).map((s,i)=>(
          <div key={i} style={{ background:C.surface, borderRadius:8, padding:18, marginBottom:10, border:`1px solid ${C.border}` }}>
            <h3 style={{ ...F, fontSize:11, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", color:C.ink,
              margin:"0 0 8px", paddingBottom:5, borderBottom:`1px solid ${C.border}` }}>{s.t}</h3>
            <div style={{ ...F, fontSize:12, lineHeight:1.7, color:C.inkMid, whiteSpace:"pre-wrap" }}>{s.c}</div>
          </div>
        ))}

        <div style={{ background:C.surface, borderRadius:8, padding:14, marginBottom:20, border:`1px solid ${C.border}`, display:"flex", gap:10, alignItems:"center" }}>
          <div style={{ width:32, height:32, borderRadius:"50%", background:"#F0EEE9", display:"flex", alignItems:"center", justifyContent:"center" }}>👤</div>
          <div>
            <div style={{ ...F, fontSize:12, fontWeight:700 }}>{d.firmante}</div>
            <div style={{ ...F, fontSize:10, color:C.inkLight }}>Habitaris S.A.S · NIT 901.922.136-8</div>
          </div>
        </div>
      </div>

      {/* Sticky action bar */}
      <div style={{ position:"fixed", bottom:0, left:0, right:0, background:C.surface,
        borderTop:`2px solid ${C.ink}`, padding:"12px 20px", zIndex:200, boxShadow:"0 -4px 20px rgba(0,0,0,.1)" }}>
        <div style={{ maxWidth:800, margin:"0 auto" }}>
          {!action ? (
            <div style={{ display:"flex", gap:8, justifyContent:"center", flexWrap:"wrap" }}>
              <button onClick={()=>sendResponse("aprobar")}
                style={{ ...F, padding:"11px 22px", background:C.success, color:"#fff", border:"none", borderRadius:6, cursor:"pointer", fontSize:14, fontWeight:700 }}>
                ✅ Aceptar propuesta
              </button>
              <button onClick={()=>setAction("devolver")}
                style={{ ...F, padding:"11px 22px", background:C.warningBg, color:C.warning, border:`1px solid ${C.warning}33`, borderRadius:6, cursor:"pointer", fontSize:14, fontWeight:600 }}>
                🔄 Solicitar cambios
              </button>
              <button onClick={()=>setAction("rechazar")}
                style={{ ...F, padding:"11px 22px", background:"transparent", color:C.danger, border:`1px solid ${C.danger}33`, borderRadius:6, cursor:"pointer", fontSize:13 }}>
                Rechazar
              </button>
            </div>
          ) : (
            <div>
              <textarea value={comment} onChange={e=>{setComment(e.target.value);setError("");}}
                placeholder={action==="devolver"?"Describa los cambios que necesita...":"Motivo del rechazo..."} rows={2}
                style={{ ...F, width:"100%", padding:"8px 12px", border:`1px solid ${C.border}`, borderRadius:6, fontSize:13, resize:"none", marginBottom:8, boxSizing:"border-box" }}/>
              {error && <p style={{ ...F, fontSize:11, color:C.danger, margin:"0 0 6px" }}>{error}</p>}
              <div style={{ display:"flex", gap:8, justifyContent:"center" }}>
                <button onClick={()=>sendResponse(action)}
                  style={{ ...F, padding:"10px 20px", background:action==="devolver"?C.warning:C.danger, color:"#fff", border:"none", borderRadius:6, cursor:"pointer", fontSize:13, fontWeight:700 }}>
                  Confirmar
                </button>
                <button onClick={()=>{setAction(null);setComment("");setError("");}}
                  style={{ ...F, padding:"10px 20px", background:"transparent", color:C.inkMid, border:`1px solid ${C.border}`, borderRadius:6, cursor:"pointer", fontSize:13 }}>
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
