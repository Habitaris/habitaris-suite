import { useState, useEffect, useRef } from "react";
import * as SB from "./supabase.js";
import { PAISES, getPais } from "./geoData.js";

const BASE = {
  bg:"#F5F4F1", surface:"#FFFFFF", ink:"#111", inkMid:"#555",
  inkLight:"#909090", border:"#E4E1DB",
  success:"#1E6B42", successBg:"#E8F4EE",
  accent:"#1E4F8C", accentBg:"#E6EFF9",
  gold:"#C9A84C",
};
const F = { fontFamily:"'Outfit',sans-serif" };

function decode() {
  try {
    const h = window.location.hash.slice(1);
    if (!h) return null;
    return JSON.parse(decodeURIComponent(atob(h)));
  } catch { return null; }
}

export function encodeFormDef(def) {
  try { return btoa(encodeURIComponent(JSON.stringify(def))); }
  catch { return ""; }
}

/* Field — supports dynamicOpciones, phoneCode, dynamicLabel */
function Field({ campo, value, onChange, accent, allVals }) {
  const { tipo, label, placeholder, required } = campo;
  const ac = accent || BASE.ink;
  const lbl = { ...F, fontSize:12, fontWeight:600, color:BASE.ink, display:"block", marginBottom:6 };
  const inp = { ...F, width:"100%", padding:"12px 16px", border:"1px solid "+BASE.border, borderRadius:8,
    fontSize:14, color:BASE.ink, boxSizing:"border-box", background:"#fff", outline:"none" };

  // Resolve dynamic options
  let opciones = campo.opciones || [];
  let dynLabel = label;
  if (campo.dynamicOpciones && allVals) {
    const depVal = allVals[campo.dynamicOpciones.dependsOn] || "";
    const mapped = campo.dynamicOpciones.map[depVal];
    if (mapped) opciones = mapped;
    else if (campo.dynamicOpciones.fallback) opciones = campo.dynamicOpciones.fallback;
    else opciones = [];
  }
  if (campo.dynamicLabel && allVals) {
    const depVal = allVals[campo.dynamicLabel.dependsOn] || "";
    const mapped = campo.dynamicLabel.map[depVal];
    if (mapped) dynLabel = mapped;
  }

  // Phone with country code
  if (tipo === "tel" && campo.phoneCode && allVals) {
    const depVal = allVals[campo.phoneCode.dependsOn] || "";
    const paisData = getPais(depVal);
    const code = paisData?.phone || "+";
    return (<div style={{ marginBottom:20 }}>
      <label style={lbl}>{dynLabel}{required && <span style={{ color:"#AE2C2C" }}> *</span>}</label>
      <div style={{ display:"flex", gap:6 }}>
        <div style={{ ...inp, width:80, flexShrink:0, background:"#F5F4F1", textAlign:"center", fontWeight:700, fontSize:13, display:"flex", alignItems:"center", justifyContent:"center" }}>{code}</div>
        <input type="tel" value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder||""} style={{...inp, flex:1}}/>
      </div>
    </div>);
  }

  if (["text","email","tel","number","date"].includes(tipo)) {
    return (<div style={{ marginBottom:20 }}>
      <label style={lbl}>{dynLabel}{required && <span style={{ color:"#AE2C2C" }}> *</span>}</label>
      <input type={tipo} value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder||""} style={inp}/>
    </div>);
  }
  if (tipo === "textarea") {
    return (<div style={{ marginBottom:20 }}>
      <label style={lbl}>{dynLabel}{required && <span style={{ color:"#AE2C2C" }}> *</span>}</label>
      <textarea value={value||""} onChange={e=>onChange(e.target.value)} rows={3} placeholder={placeholder||""} style={{ ...inp, resize:"vertical" }}/>
    </div>);
  }
  if (tipo === "select" || tipo === "rango") {
    return (<div style={{ marginBottom:20 }}>
      <label style={lbl}>{dynLabel}{required && <span style={{ color:"#AE2C2C" }}> *</span>}</label>
      <select value={value||""} onChange={e=>onChange(e.target.value)} style={inp}>
        <option value="">Seleccionar...</option>
        {(opciones||[]).map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>);
  }
  if (tipo === "chips") {
    const selected = Array.isArray(value) ? value : [];
    return (<div style={{ marginBottom:20 }}>
      <label style={lbl}>{dynLabel}{required && <span style={{ color:"#AE2C2C" }}> *</span>}</label>
      <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginTop:6 }}>
        {(opciones||[]).map(o => {
          const sel = selected.includes(o);
          return <button key={o} type="button" onClick={() => onChange(sel ? selected.filter(x=>x!==o) : [...selected, o])}
            style={{ ...F, padding:"8px 16px", fontSize:12, fontWeight:sel?700:400, borderRadius:20,
              border: sel ? "2px solid "+ac : "1px solid "+BASE.border,
              background: sel ? ac : "#fff", color: sel ? "#fff" : BASE.inkMid,
              cursor:"pointer", transition:"all .15s" }}>{o}</button>;
        })}
      </div>
    </div>);
  }
  if (tipo === "radio") {
    return (<div style={{ marginBottom:20 }}>
      <label style={lbl}>{dynLabel}{required && <span style={{ color:"#AE2C2C" }}> *</span>}</label>
      <div style={{ display:"flex", flexDirection:"column", gap:6, marginTop:6 }}>
        {(opciones||[]).map(o => (
          <label key={o} style={{ ...F, display:"flex", alignItems:"center", gap:10, fontSize:13,
            cursor:"pointer", padding:"10px 14px", borderRadius:8,
            background: value===o ? ac : "#fff", color: value===o ? "#fff" : BASE.ink,
            border: value===o ? "2px solid "+ac : "1px solid "+BASE.border, transition:"all .15s" }}>
            <input type="radio" checked={value===o} onChange={()=>onChange(o)} style={{ display:"none" }}/>{o}
          </label>
        ))}
      </div>
    </div>);
  }
  if (tipo === "rating") {
    const stars = parseInt(value) || 0;
    return (<div style={{ marginBottom:20 }}>
      <label style={lbl}>{dynLabel}{required && <span style={{ color:"#AE2C2C" }}> *</span>}</label>
      <div style={{ display:"flex", gap:8, marginTop:6 }}>
        {[1,2,3,4,5].map(n => (
          <button key={n} type="button" onClick={() => onChange(n)}
            style={{ background:"none", border:"none", cursor:"pointer", fontSize:32, filter:n<=stars?"none":"grayscale(1)", opacity:n<=stars?1:.3 }}>⭐</button>
        ))}
      </div>
    </div>);
  }
  if (tipo === "yesno") {
    return (<div style={{ marginBottom:20 }}>
      <label style={lbl}>{dynLabel}{required && <span style={{ color:"#AE2C2C" }}> *</span>}</label>
      <div style={{ display:"flex", gap:10, marginTop:6 }}>
        {["Sí","No"].map(o => (
          <button key={o} type="button" onClick={() => onChange(o)}
            style={{ ...F, padding:"12px 32px", fontSize:14, fontWeight:value===o?700:400, borderRadius:24,
              border: value===o ? "2px solid "+ac : "1px solid "+BASE.border,
              background: value===o ? ac : "#fff", color: value===o ? "#fff" : BASE.inkMid,
              cursor:"pointer", transition:"all .15s", flex:1, textAlign:"center" }}>{o}</button>
        ))}
      </div>
    </div>);
  }
  if (tipo === "info") {
    return (<div style={{ marginBottom:20, padding:"14px 18px", background:BASE.accentBg, borderRadius:8, border:"1px solid "+BASE.accent+"22" }}>
      <p style={{ ...F, fontSize:12, color:BASE.accent, margin:0, lineHeight:1.6 }}>{dynLabel}</p>
    </div>);
  }
  if (tipo === "seccion") {
    return (<div style={{ marginTop:28, marginBottom:14, paddingTop:18, borderTop:"2px solid "+ac }}>
      <h3 style={{ ...F, fontSize:15, fontWeight:700, color:BASE.ink, margin:0 }}>{dynLabel}</h3>
      {campo.desc && <p style={{ ...F, fontSize:11, color:BASE.inkLight, margin:"4px 0 0" }}>{campo.desc}</p>}
    </div>);
  }
  return null;
}

/* ═══════════ MAIN ═══════════ */
export default function FormularioPublico() {
  const [def, setDef] = useState(null);
  const [vals, setVals] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(0);
  const [animDir, setAnimDir] = useState("next");
  const [animKey, setAnimKey] = useState(0);
  const [blocked, setBlocked] = useState(null); // null | "expired" | "maxuses" | "inactive"
  const topRef = useRef(null);
  const openTimeRef = useRef(Date.now());

  /* ALL hooks BEFORE any conditional return */
  useEffect(() => { setDef(decode()); }, []);

  useEffect(() => {
    if (!def) return;
    const campos = def.campos || [];
    const cliente = def.cliente || null;

    /* FIX: Only prefill fields that match exact mapKey, not by tipo or label */
    if (cliente) {
      const prefill = {};
      campos.forEach(c => {
        if (cliente.email && c.mapKey==="email") prefill[c.id] = cliente.email;
        if (cliente.nombre && c.mapKey==="nombre") prefill[c.id] = cliente.nombre;
        if (cliente.tel && c.mapKey==="telefono") prefill[c.id] = cliente.tel;
      });
      setVals(prev => ({...prefill, ...prev}));
    }
    // Prefill country from config
    const paisProy = (def.config?.paisProyecto) || "Colombia";
    const paisCodMap = {"Colombia":"+57 (Colombia)","España":"+34 (España)","México":"+52 (México)","Chile":"+56 (Chile)","Perú":"+51 (Perú)","Ecuador":"+593 (Ecuador)","Argentina":"+54 (Argentina)","Panamá":"+507 (Panamá)","Estados Unidos":"+1 (Estados Unidos)"};
    const countryPrefill = {};
    campos.forEach(c => {
      if (c.mapKey==="pais") countryPrefill[c.id] = paisProy;
      if (c.mapKey==="codigoTel") countryPrefill[c.id] = paisCodMap[paisProy] || "";
    });
    setVals(prev => ({...countryPrefill, ...prev}));

    // Check if link was manually blocked
    const linkCfg = def.linkConfig || {};
    if (linkCfg.blocked) { setBlocked("blocked"); return; }

    // Check link-level limits
    if (linkCfg.fechaCaducidad) {
      const expiry = new Date(linkCfg.fechaCaducidad);
      if (expiry < new Date()) { setBlocked("expired"); return; }
    }
    if (linkCfg.maxUsos && linkCfg.maxUsos > 0) {
      const usedKey = "hab_link_uses_"+(linkCfg.linkId||def.id||"");
      const used = parseInt(localStorage.getItem(usedKey)||"0");
      if (used >= linkCfg.maxUsos) { setBlocked("maxuses"); return; }
    }

    // Also check via Supabase if configured
    const linkId = linkCfg.linkId;
    if (linkId && SB.isConfigured()) {
      SB.getLink(linkId).then(link => {
        if (!link) return;
        if (!link.active) { setBlocked("inactive"); return; }
        if (link.expires_at && new Date(link.expires_at) < new Date()) { setBlocked("expired"); return; }
        if (link.max_uses > 0 && link.current_uses >= link.max_uses) { setBlocked("maxuses"); return; }
      }).catch(()=>{});
    }

    // Register open event
    openTimeRef.current = Date.now();
    if (SB.isConfigured()) {
      SB.registerOpen(def.id, def.nombre, linkCfg.linkId, cliente?.nombre, cliente?.email).catch(()=>{});
    }

    // Track close/time on page leave
    const handleClose = () => {
      const duration = Math.round((Date.now() - openTimeRef.current) / 1000);
      if (SB.isConfigured()) {
        SB.registerClose(def.id, linkCfg.linkId, duration).catch(()=>{});
      }
    };
    window.addEventListener("beforeunload", handleClose);
    return () => window.removeEventListener("beforeunload", handleClose);
  }, [def]);

  /* ── Loading / invalid ── */
  if (!def) return (
    <div style={{ minHeight:"100vh", background:BASE.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');`}</style>
      <div style={{ background:BASE.surface, borderRadius:12, padding:40, maxWidth:400, textAlign:"center" }}>
        <div style={{ fontSize:40, marginBottom:16 }}>🔒</div>
        <h2 style={{ ...F, fontSize:18, fontWeight:700, color:BASE.ink }}>Formulario no disponible</h2>
        <p style={{ ...F, fontSize:13, color:BASE.inkMid, marginTop:8 }}>Este enlace no es válido o ha expirado.</p>
      </div>
    </div>
  );

  /* ── Blocked (expired / max uses) ── */
  if (blocked) {
    const msgs = {
      expired: { icon:"⏰", title:"Formulario expirado", desc:"La fecha de caducidad de este formulario ha pasado. Contacta a quien te lo envió." },
      maxuses: { icon:"🔒", title:"Límite de envíos alcanzado", desc:"Este formulario ya fue completado el número máximo de veces permitido." },
      inactive: { icon:"⛔", title:"Enlace desactivado", desc:"Este enlace ha sido desactivado. Contacta a quien te lo envió." },
      blocked: { icon:"🚫", title:"Formulario bloqueado", desc:"Este formulario ha sido bloqueado por el remitente. Si crees que es un error, contacta a quien te lo envió." },
    };
    const m = msgs[blocked] || msgs.expired;
    const brandFont2 = (def?.marca?.tipografia) || "Outfit";
    return (
      <div style={{ minHeight:"100vh", background:BASE.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=${brandFont2.replace(/ /g,"+")}:wght@300;400;500;600;700;800&display=swap');`}</style>
        <div style={{ background:BASE.surface, borderRadius:12, padding:40, maxWidth:400, textAlign:"center", boxShadow:"0 4px 20px rgba(0,0,0,.08)" }}>
          {def?.marca?.logo && <img src={def.marca.logo} alt="Logo" style={{ height:32, objectFit:"contain", marginBottom:12 }}/>}
          <div style={{ fontSize:48, marginBottom:12 }}>{m.icon}</div>
          <h2 style={{ fontFamily:`'${brandFont2}',sans-serif`, fontSize:18, fontWeight:700, color:BASE.ink }}>{m.title}</h2>
          <p style={{ fontFamily:`'${brandFont2}',sans-serif`, fontSize:13, color:BASE.inkMid, marginTop:8, lineHeight:1.6 }}>{m.desc}</p>
        </div>
      </div>
    );
  }

  const campos = def.campos || [];
  const cfg = def.config || {};
  const cliente = def.cliente || null;
  const marca = def.marca || {};
  const ac = cfg.colorAccent || marca.colorPrimario || "#111111";
  const cs = marca.colorSecundario || "#1E4F8C";
  const ca = marca.colorAcento || "#C9A84C";
  const brandFont = marca.tipografia || "Outfit";
  const BF = { fontFamily:`'${brandFont}',sans-serif` };
  const vista = cfg.vista || "pasos";
  const btnText = cfg.botonTexto || "Enviar formulario";

  const setVal = (id, v) => { setVals(prev => ({ ...prev, [id]: v })); setError(""); };

  const isVisible = (c) => {
    if (!c.logica || !c.logica.fieldId || !c.logica.value) return true;
    const depVal = vals[c.logica.fieldId];
    const expected = c.logica.value;
    if (Array.isArray(depVal)) return depVal.includes(expected);
    return String(depVal||"") === expected;
  };

  /* FIX: Only lock fields that match exact mapKey — not by tipo or label */
  const isLocked = (c) => {
    if (!cliente) return c.mapKey==="pais"; // country always locked
    if (cliente.email && c.mapKey==="email") return true;
    if (cliente.nombre && c.mapKey==="nombre") return true;
    if (cliente.tel && c.mapKey==="telefono") return true;
    if (c.mapKey==="pais") return true;
    return false;
  };

  /* Build steps */
  const steps = [];
  const privField = campos.find(c => c.mapKey === "aceptaPrivacidad");
  const privInfo = campos.find(c => c.tipo === "info" && c.label && c.label.includes("Aviso de Privacidad"));

  if (privField) {
    steps.push({ title:"Aviso de Privacidad", desc:"Antes de comenzar, necesitamos tu autorización", icon:"🛡️",
      fields:[privInfo, privField].filter(Boolean), isPrivacy:true });
  }

  let currentGroup = { title:cfg.titulo||def.nombre||"Formulario", desc:cfg.subtitulo||"", icon:"📋", fields:[] };
  campos.forEach(c => {
    if (c.id === (privField&&privField.id) || c.id === (privInfo&&privInfo.id)) return;
    if (c.tipo === "seccion") {
      if (currentGroup.fields.length > 0) steps.push(currentGroup);
      currentGroup = { title:c.label, desc:c.desc||"", icon:"", fields:[] };
    } else {
      currentGroup.fields.push(c);
    }
  });
  if (currentGroup.fields.length > 0) steps.push(currentGroup);

  const visibleSteps = steps.filter(s => s.isPrivacy || s.fields.some(f => isVisible(f)));

  /* Privacy */
  if (privField && vals[privField.id] === "No") {
    return (
      <div style={{ minHeight:"100vh", background:BASE.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=${brandFont.replace(/ /g,"+")}:wght@300;400;500;600;700;800&display=swap');`}</style>
        <div style={{ background:BASE.surface, borderRadius:12, padding:40, maxWidth:480, textAlign:"center", boxShadow:"0 4px 20px rgba(0,0,0,.08)" }}>
          {marca.logo && <img src={marca.logo} alt="Logo" style={{ height:32, objectFit:"contain", marginBottom:12 }}/>}
          <div style={{ fontSize:48, marginBottom:12 }}>👋</div>
          <h2 style={{ ...BF, fontSize:20, fontWeight:700, color:BASE.ink }}>Gracias por tu tiempo</h2>
          <p style={{ ...BF, fontSize:13, color:BASE.inkMid, lineHeight:1.6, marginTop:8 }}>Para continuar necesitamos tu autorización para el tratamiento de datos personales.</p>
        </div>
      </div>
    );
  }

  const privAccepted = !privField || vals[privField.id] === "Sí";
  const currentStep = !privAccepted ? 0 : step;
  const totalSteps = visibleSteps.length;
  const activeStep = visibleSteps[currentStep] || visibleSteps[0];
  const isLastStep = currentStep >= totalSteps - 1;

  const totalReq = campos.filter(c=>c.required&&c.tipo!=="seccion"&&c.tipo!=="info").length;
  const filledReq = campos.filter(c=>c.required&&c.tipo!=="seccion"&&c.tipo!=="info"&&vals[c.id]&&(Array.isArray(vals[c.id])?vals[c.id].length>0:true)).length;
  const pctFilled = totalReq > 0 ? Math.round((filledReq/totalReq)*100) : 0;
  const pctStep = totalSteps > 1 ? Math.round((currentStep / (totalSteps - 1)) * 100) : 0;

  const goTo = (idx, dir) => {
    setAnimDir(dir || "next"); setAnimKey(k => k + 1); setStep(idx); setError("");
    if (topRef.current) topRef.current.scrollIntoView({ behavior:"smooth" });
  };

  const validateStep = () => {
    if (!activeStep) return true;
    for (const c of activeStep.fields) {
      if (!isVisible(c)) continue;
      if (c.required && c.tipo !== "seccion" && c.tipo !== "info") {
        const v = vals[c.id];
        if (!v || (Array.isArray(v) && v.length === 0)) { setError("El campo \""+c.label+"\" es obligatorio."); return false; }
      }
    }
    return true;
  };

  const validateAll = () => {
    for (const c of campos) {
      if (!isVisible(c)) continue;
      if (c.required && c.tipo !== "seccion" && c.tipo !== "info") {
        const v = vals[c.id];
        if (!v || (Array.isArray(v) && v.length === 0)) { setError("El campo \""+c.label+"\" es obligatorio."); return false; }
      }
    }
    return true;
  };

  const nextStep = () => { if (!validateStep()) return; if (isLastStep) doSubmit(); else goTo(currentStep + 1, "next"); };
  const prevStep = () => { if (currentStep > 0) goTo(currentStep - 1, "prev"); };

  const doSubmit = async () => {
    if (vista === "pasos" && !validateStep()) return;
    if (vista === "scroll" && !validateAll()) return;

    const linkCfg = def.linkConfig || {};
    const response = { id: Math.random().toString(36).slice(2,9) + Date.now().toString(36) };
    response.fecha = new Date().toISOString().split("T")[0];
    response.formularioId = def.id;
    response.formularioNombre = def.nombre;
    if (cliente) { response.clienteNombre = cliente.nombre; response.clienteEmail = cliente.email; response.clienteTel = cliente.tel; }
    campos.forEach(c => { if (c.tipo !== "seccion" && vals[c.id] !== undefined) response[c.mapKey || c.id] = vals[c.id]; });

    // Save to localStorage (backward compatible)
    try {
      const key = "hab:briefing:"+response.id;
      if (window.storage) await window.storage.set(key, JSON.stringify(response), true);
      else localStorage.setItem("shared:"+key, JSON.stringify(response));
    } catch {}
    try {
      const idxKey = "hab:form:responses"; let idx = [];
      try { const r = window.storage ? await window.storage.get(idxKey, true) : { value: localStorage.getItem("shared:"+idxKey) }; if (r && r.value) idx = JSON.parse(r.value); } catch {}
      idx.push({ id:response.id, formId:def.id, fecha:response.fecha, nombre:response.nombre||response.email||"" });
      if (window.storage) await window.storage.set(idxKey, JSON.stringify(idx), true);
      else localStorage.setItem("shared:"+idxKey, JSON.stringify(idx));
    } catch {}

    // Save to Supabase
    if (SB.isConfigured()) {
      try {
        await SB.saveResponse({
          form_id: def.id,
          form_name: def.nombre,
          link_id: linkCfg.linkId || null,
          client_name: cliente?.nombre || response.clienteNombre || null,
          client_email: cliente?.email || response.clienteEmail || null,
          client_tel: cliente?.tel || response.clienteTel || null,
          module: def.modulo || cfg.modulo || "general",
          data: response,
        });
        // Register submit event
        await SB.registerSubmit(def.id, def.nombre, linkCfg.linkId, cliente?.nombre, cliente?.email);
        // Record time spent (reliable — beforeunload often fails for async)
        const duration = Math.round((Date.now() - openTimeRef.current) / 1000);
        if (duration > 0) await SB.registerClose(def.id, linkCfg.linkId, duration).catch(()=>{});
        // Increment link usage
        if (linkCfg.linkId) await SB.incrementLinkUse(linkCfg.linkId);
      } catch(e) { console.warn("Supabase save error:", e); }
    }

    // Track local link usage
    if (linkCfg.maxUsos && linkCfg.maxUsos > 0) {
      const usedKey = "hab_link_uses_"+(linkCfg.linkId||def.id||"");
      const used = parseInt(localStorage.getItem(usedKey)||"0");
      localStorage.setItem(usedKey, String(used + 1));
    }

    /* FIX: No auto-open WhatsApp — just mark as submitted */
    setSubmitted(true);

    // Send email notification to comercial@habitaris.co with full report
    try {
      // Calculate scoring
      const scoringCampos = campos.filter(c => c.scoring?.enabled);
      let scoreHtml = "";
      if (scoringCampos.length > 0) {
        let totalPts = 0, maxPts = 0, greens = 0, reds = 0, yellows = 0;
        const scoreRows = [];
        scoringCampos.forEach(c => {
          const w = c.scoring.weight || 1;
          const key = c.mapKey || c.id;
          let val = vals[c.id];
          if (val === undefined) return;
          maxPts += w;
          const rules = c.scoring.rules || {};
          let flag = "neutral";
          if (Array.isArray(val)) {
            const flags = val.map(v => rules[v] || "neutral");
            if (flags.includes("red")) flag = "red";
            else if (flags.every(f => f === "green")) flag = "green";
            else flag = "neutral";
          } else { flag = rules[String(val)] || "neutral"; }
          let pts = flag === "green" ? w : flag === "neutral" ? w * 0.5 : 0;
          totalPts += pts;
          if (flag === "green") greens++; else if (flag === "red") reds++; else yellows++;
          const icon = flag === "green" ? "🟢" : flag === "red" ? "🔴" : "🟡";
          const fc = flag === "green" ? "#1E6B42" : flag === "red" ? "#AE2C2C" : "#7A5218";
          const display = Array.isArray(val) ? val.join(", ") : val;
          scoreRows.push(`<tr><td style="padding:5px 10px;font-size:11px;font-weight:600;">${c.label}</td><td style="padding:5px 10px;font-size:11px;">${display}</td><td style="padding:5px 10px;text-align:center;font-weight:700;color:${fc};">${pts}/${w}</td><td style="padding:5px 10px;text-align:center;">${icon}</td></tr>`);
        });
        const score = maxPts > 0 ? Math.round((totalPts / maxPts) * 100) / 10 : 0;
        const level = score >= 7 ? "green" : score >= 4 ? "yellow" : "red";
        const colors = {green:{bg:"#E8F4EE",text:"#1E6B42"},yellow:{bg:"#FAF0E0",text:"#7A5218"},red:{bg:"#FAE8E8",text:"#AE2C2C"}};
        const col = colors[level];
        const lbl = level === "green" ? "🟢 Cliente potencial" : level === "yellow" ? "🟡 Revisar" : "🔴 No califica";
        const concl = level === "green" ? "Contactar en las próximas 24h." : level === "yellow" ? "Agendar llamada exploratoria." : "Responder cortésmente y archivar.";
        scoreHtml = `<div style="margin:16px 0;border:1px solid ${col.text}33;border-radius:8px;overflow:hidden;">
          <div style="display:flex;align-items:center;gap:14px;padding:14px 16px;background:${col.bg};">
            <div style="font-size:24px;font-weight:800;color:${col.text};">${score.toFixed(1)}/10</div>
            <div><div style="font-size:13px;font-weight:700;color:${col.text};">${lbl}</div><div style="font-size:9px;color:${col.text};">${concl}</div></div>
            <div style="margin-left:auto;display:flex;gap:8px;"><span>🟢${greens}</span><span>🟡${yellows}</span><span>🔴${reds}</span></div>
          </div>
          <table style="width:100%;border-collapse:collapse;">${scoreRows.join("")}</table>
        </div>`;
      }

      // Build HTML content grouped by sections
      let html = scoreHtml;
      let currentSection = "";
      campos.forEach(c => {
        if (c.tipo === "seccion") {
          currentSection = c.label;
          html += `<div style="margin-top:16px;padding:10px 14px;background:#F0EEE9;border-radius:6px;border-left:3px solid #C9A84C;">
            <p style="margin:0;font-size:12px;font-weight:bold;color:#111;">${c.label}</p>
            ${c.desc ? `<p style="margin:2px 0 0;font-size:10px;color:#888;">${c.desc}</p>` : ""}
          </div>`;
          return;
        }
        if (c.tipo === "info") return;
        const val = vals[c.id];
        if (val === undefined || val === "" || (Array.isArray(val) && val.length === 0)) return;
        const display = Array.isArray(val) ? val.join(", ") : val;
        html += `<div style="padding:8px 14px;border-bottom:1px solid #f0f0f0;">
          <p style="margin:0;font-size:10px;color:#888;font-weight:600;">${c.label}</p>
          <p style="margin:3px 0 0;font-size:13px;color:#111;">${display}</p>
        </div>`;
      });

      const clientName = cliente?.nombre || response.clienteNombre || response.nombre || "Sin nombre";
      const clientEmail = cliente?.email || response.clienteEmail || response.email || "";
      const clientTel = cliente?.tel || response.clienteTel || response.telefono || "";

      await fetch("https://api.emailjs.com/api/v1.0/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_id: "service_6x3478l",
          template_id: "template_6lla2i8",
          user_id: "64nk2FHknwpLqc1p4",
          template_params: {
            form_name: def.nombre || "Formulario",
            client_name: clientName,
            client_email: clientEmail,
            client_tel: clientTel,
            fecha: response.fecha + " · " + new Date().toLocaleTimeString("es-CO", { hour:"2-digit", minute:"2-digit", hour12:false }),
            contenido: html,
          }
        })
      });
    } catch(e) { console.warn("Email notification error:", e); }
  };

  if (submitted) return (
    <div style={{ minHeight:"100vh", background:BASE.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=${brandFont.replace(/ /g,"+")}:wght@300;400;500;600;700;800&display=swap');`}</style>
      <div style={{ background:BASE.surface, borderRadius:12, padding:40, maxWidth:480, textAlign:"center", boxShadow:"0 4px 20px rgba(0,0,0,.08)" }}>
        {marca.logo && <img src={marca.logo} alt="Logo" style={{ height:32, objectFit:"contain", marginBottom:12 }}/>}
        <div style={{ fontSize:48, marginBottom:12 }}>🎉</div>
        <h2 style={{ ...BF, fontSize:20, fontWeight:700, color:BASE.success, margin:"0 0 8px" }}>¡Enviado!</h2>
        <p style={{ ...BF, fontSize:13, color:BASE.inkMid, lineHeight:1.6 }}>{cfg.mensajeExito || "Gracias por completar el formulario."}</p>
        {marca.empresa && <p style={{ ...BF, fontSize:10, color:BASE.inkLight, marginTop:16 }}>{marca.empresa}{marca.slogan ? ` · ${marca.slogan}`:""}</p>}
      </div>
    </div>
  );

  const renderLocked = (c) => (
    <div key={c.id} style={{ marginBottom:20 }}>
      <label style={{ ...BF, fontSize:12, fontWeight:600, color:BASE.ink, display:"block", marginBottom:6 }}>
        {c.label} <span style={{ fontSize:9, color:cs, fontWeight:400 }}>🔒 prellenado</span>
      </label>
      <input type="text" value={vals[c.id]||""} disabled
        style={{ ...BF, width:"100%", padding:"12px 16px", border:`1px solid ${cs}33`, borderRadius:8,
          fontSize:14, color:cs, boxSizing:"border-box", background:cs+"15", fontWeight:600 }}/>
    </div>
  );

  const Header = () => (
    <div style={{ background:ac, padding:"14px 24px" }}>
      <div style={{ maxWidth:640, margin:"0 auto", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          {marca.logo ? (
            <img src={marca.logo} alt="Logo" style={{ height:28, objectFit:"contain" }}/>
          ) : (
            <div style={{ ...BF, fontWeight:700, fontSize:14, letterSpacing:3, color:"#fff", textTransform:"uppercase" }}>{marca.empresa || "HABITARIS"}</div>
          )}
          {marca.slogan && <div style={{ ...BF, fontSize:7, letterSpacing:2, color:"rgba(255,255,255,.4)", textTransform:"uppercase" }}>{marca.slogan}</div>}
        </div>
        <div style={{ ...BF, fontSize:10, color:"rgba(255,255,255,.5)" }}>
          {vista === "pasos" ? "Paso "+(currentStep+1)+" de "+totalSteps : pctFilled+"% completo"}
        </div>
      </div>
      <div style={{ maxWidth:640, margin:"8px auto 0", height:3, background:"rgba(255,255,255,.15)", borderRadius:2 }}>
        <div style={{ width:(vista==="pasos"?pctStep:pctFilled)+"%", height:"100%", background:ca, borderRadius:2, transition:"width .4s ease" }}/>
      </div>
    </div>
  );

  const ClientBanner = () => {
    if (!cliente) return null;
    if (vista === "pasos" && currentStep !== (privField ? 1 : 0)) return null;
    return (
      <div style={{ background:cs+"15", border:`1px solid ${cs}22`, borderRadius:10, padding:"14px 18px", marginBottom:20, display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ width:40, height:40, borderRadius:"50%", background:cs, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, fontWeight:700, flexShrink:0 }}>
          {(cliente.nombre||"?")[0].toUpperCase()}
        </div>
        <div>
          <div style={{ ...BF, fontSize:13, fontWeight:700, color:cs }}>Formulario para: {cliente.nombre||cliente.email}</div>
          {cliente.email && <div style={{ ...BF, fontSize:10, color:cs+"99" }}>{cliente.email}</div>}
        </div>
      </div>
    );
  };

  const ErrorMsg = () => error ? (
    <div style={{ ...BF, fontSize:12, color:"#AE2C2C", textAlign:"center", margin:"14px 0", padding:"10px 16px", background:"#FAE8E8", borderRadius:6, border:"1px solid #AE2C2C22" }}>⚠️ {error}</div>
  ) : null;

  /* ═══ SCROLL MODE ═══ */
  if (vista === "scroll") {
    return (
      <div style={{ minHeight:"100vh", background:BASE.bg }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=${brandFont.replace(/ /g,"+")}:wght@300;400;500;600;700;800&display=swap');*{box-sizing:border-box;margin:0}body{font-family:'${brandFont}',sans-serif}input:focus,textarea:focus,select:focus{border-color:${ac}!important;box-shadow:0 0 0 3px ${ac}15}`}</style>
        <Header/>
        <div style={{ maxWidth:640, margin:"0 auto", padding:"28px 20px 100px" }}>
          <ClientBanner/>
          <div style={{ textAlign:"center", marginBottom:28 }}>
            <h1 style={{ ...BF, fontSize:22, fontWeight:700, margin:"0 0 6px" }}>{cfg.titulo || def.nombre || "Formulario"}</h1>
            {cfg.subtitulo && <p style={{ ...BF, fontSize:13, color:BASE.inkMid }}>{cfg.subtitulo}</p>}
          </div>
          <div style={{ background:BASE.surface, borderRadius:12, padding:"28px 28px 12px", border:"1px solid "+BASE.border, boxShadow:"0 2px 16px rgba(0,0,0,.04)" }}>
            {campos.map(c => {
              if (!isVisible(c)) return null;
              if (isLocked(c)) return renderLocked(c);
              return <Field key={c.id} campo={c} value={vals[c.id]} onChange={v=>setVal(c.id,v)} accent={ac} allVals={vals}/>;
            })}
          </div>
          <ErrorMsg/>
        </div>
        <div style={{ position:"fixed", bottom:0, left:0, right:0, background:BASE.surface, borderTop:"1px solid "+BASE.border, padding:"12px 20px", zIndex:200, boxShadow:"0 -4px 20px rgba(0,0,0,.06)" }}>
          <div style={{ maxWidth:640, margin:"0 auto", display:"flex", justifyContent:"center" }}>
            <button onClick={doSubmit} style={{ ...BF, padding:"14px 40px", background:ac, color:"#fff", border:"none", borderRadius:8, fontSize:15, fontWeight:700, cursor:"pointer" }}>{btnText} ✓</button>
          </div>
        </div>
      </div>
    );
  }

  /* ═══ PASOS MODE ═══ */
  return (
    <div style={{ minHeight:"100vh", background:BASE.bg }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=${brandFont.replace(/ /g,"+")}:wght@300;400;500;600;700;800&display=swap');*{box-sizing:border-box;margin:0}body{font-family:'${brandFont}',sans-serif}@keyframes slideNext{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}@keyframes slidePrev{from{opacity:0;transform:translateX(-40px)}to{opacity:1;transform:translateX(0)}}.step-next{animation:slideNext .3s ease both}.step-prev{animation:slidePrev .3s ease both}input:focus,textarea:focus,select:focus{border-color:${ac}!important;box-shadow:0 0 0 3px ${ac}15}`}</style>
      <div ref={topRef}/>
      <Header/>
      <div style={{ maxWidth:640, margin:"0 auto", padding:"16px 20px 0" }}>
        <div style={{ display:"flex", gap:4, justifyContent:"center" }}>
          {visibleSteps.map((s, i) => (
            <div key={i} style={{ height:4, flex:1, maxWidth:40, borderRadius:2,
              background: i < currentStep ? BASE.success : i === currentStep ? ac : BASE.border, transition:"background .3s" }}/>
          ))}
        </div>
      </div>
      <div style={{ maxWidth:640, margin:"0 auto", padding:"20px 20px 140px" }}>
        <ClientBanner/>
        <div key={animKey} className={animDir === "next" ? "step-next" : "step-prev"}>
          <div style={{ marginBottom:20 }}>
            {activeStep && activeStep.icon && <div style={{ fontSize:28, marginBottom:4 }}>{activeStep.icon}</div>}
            <h2 style={{ ...BF, fontSize:22, fontWeight:700, color:BASE.ink, margin:"0 0 4px" }}>{activeStep && activeStep.title}</h2>
            {activeStep && activeStep.desc && <p style={{ ...BF, fontSize:13, color:BASE.inkMid }}>{activeStep.desc}</p>}
          </div>
          <div style={{ background:BASE.surface, borderRadius:12, padding:"28px 28px 12px", border:"1px solid "+BASE.border, boxShadow:"0 2px 16px rgba(0,0,0,.04)" }}>
            {activeStep && activeStep.fields.map(c => {
              if (!isVisible(c)) return null;
              if (c.tipo === "seccion") return null;
              if (isLocked(c)) return renderLocked(c);
              return <Field key={c.id} campo={c} value={vals[c.id]} onChange={v=>setVal(c.id,v)} accent={ac} allVals={vals}/>;
            })}
          </div>
          <ErrorMsg/>
        </div>
      </div>
      <div style={{ position:"fixed", bottom:0, left:0, right:0, background:BASE.surface, borderTop:"1px solid "+BASE.border, padding:"14px 20px", zIndex:200, boxShadow:"0 -4px 20px rgba(0,0,0,.06)" }}>
        <div style={{ maxWidth:640, margin:"0 auto", display:"flex", justifyContent:"space-between", alignItems:"center", gap:12 }}>
          {currentStep > 0 ? (
            <button onClick={prevStep} style={{ ...BF, padding:"12px 24px", background:"#fff", color:BASE.ink, border:"1px solid "+BASE.border, borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer" }}>← Atrás</button>
          ) : <div/>}
          <div style={{ ...BF, fontSize:10, color:BASE.inkLight }}>{currentStep + 1} / {totalSteps}</div>
          <button onClick={nextStep}
            style={{ ...BF, padding:"12px 32px", background:ac, color:"#fff", border:"none", borderRadius:8, fontSize:14, fontWeight:700, cursor:"pointer" }}>
            {isLastStep ? (btnText||"Enviar")+" ✓" : "Siguiente →"}
          </button>
        </div>
      </div>
    </div>
  );
}
