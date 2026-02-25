import React, { useState, useEffect } from "react";
import { getPortal, respondPortal } from "./offerPortal.js";

const C = { ink:"#111",inkMid:"#444",inkLight:"#888",inkXLight:"#C8C5BE",bg:"#F5F4F1",surface:"#FFFFFF",border:"#E0E0E0",green:"#111111",greenBg:"#E8F4EE",greenLight:"#D4EDDF",red:"#B91C1C",redBg:"#FAE8E8",amber:"#8C6A00",amberBg:"#FFF8EE",blue:"#3B3B3B",blueBg:"#F0F0F0",shadow:"0 1px 4px rgba(0,0,0,.06), 0 8px 32px rgba(0,0,0,.08)" };
const F = { fontFamily:"'DM Sans',sans-serif" };
const fmtMoney = (n,d="COP") => { if(!n&&n!==0) return "—"; return new Intl.NumberFormat("es-CO",{style:"currency",currency:d,minimumFractionDigits:0,maximumFractionDigits:0}).format(n); };
const fmtDate = d => d ? new Date(d).toLocaleDateString("es-CO",{day:"2-digit",month:"long",year:"numeric"}) : "—";

function Section({title,icon,children}){return(<div style={{marginBottom:24}}><h3 style={{...F,fontSize:13,fontWeight:700,color:C.ink,margin:"0 0 12px",display:"flex",alignItems:"center",gap:8,textTransform:"uppercase",letterSpacing:.5}}><span>{icon}</span> {title}</h3><div style={{background:C.surface,borderRadius:12,padding:20,border:"1px solid "+C.border}}>{children}</div></div>);}
function KPI({label,value,highlight}){return(<div style={{flex:1,minWidth:140,background:highlight?C.greenBg:"#FFFFFF",borderRadius:10,padding:"14px 16px",border:"1px solid "+(highlight?C.greenLight:C.border)}}><p style={{...F,margin:"0 0 4px",fontSize:9,fontWeight:600,textTransform:"uppercase",letterSpacing:1,color:C.inkLight}}>{label}</p><p style={{...F,margin:0,fontSize:18,fontWeight:700,color:highlight?C.green:C.ink}}>{value}</p></div>);}

export default function OfferApproval({ token }) {
  const [portal, setPortal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [action, setAction] = useState(null);
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) { setError("no_token"); setLoading(false); return; }
    getPortal(token).then(p => { if (!p) setError("not_found"); else setPortal(p); setLoading(false); }).catch(() => { setError("error"); setLoading(false); });
  }, [token]);

  if (loading) return (<div style={{...F,minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{textAlign:"center"}}><div style={{fontSize:48,marginBottom:16,animation:"pulse 1.5s ease infinite"}}>📋</div><p style={{fontSize:14,color:C.inkMid}}>Cargando oferta...</p><style>{`@keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}`}</style></div></div>);
  if (error || !portal) return (<div style={{...F,minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{background:C.surface,borderRadius:16,padding:48,textAlign:"center",boxShadow:C.shadow,maxWidth:420}}><div style={{fontSize:48,marginBottom:16}}>⚠️</div><h2 style={{margin:"0 0 8px",fontSize:18,color:C.ink}}>Enlace no válido</h2><p style={{margin:0,fontSize:13,color:C.inkMid,lineHeight:1.6}}>Este enlace de oferta no existe o ha expirado.</p></div></div>);

  if (portal.status !== "pendiente" || done) {
    const sm = { aprobada:{icon:"✅",label:"Oferta Aprobada",color:C.green,bg:C.greenBg}, rechazada:{icon:"❌",label:"Oferta Rechazada",color:C.red,bg:C.redBg}, devuelta:{icon:"🔄",label:"Oferta Devuelta",color:C.amber,bg:C.amberBg} };
    const s = sm[portal.status] || sm.aprobada;
    const d = portal.offer_data || {};
    return (<div style={{...F,minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}><div style={{background:C.surface,borderRadius:16,padding:48,textAlign:"center",boxShadow:C.shadow,maxWidth:480}}><div style={{fontSize:56,marginBottom:16}}>{s.icon}</div><h2 style={{margin:"0 0 8px",fontSize:22,color:s.color,fontWeight:700}}>{s.label}</h2><p style={{margin:"0 0 6px",fontSize:14,color:C.inkMid}}>{d.ref||"Oferta"} — {d.cliente||""}</p><p style={{margin:"0 0 20px",fontSize:12,color:C.inkLight}}>Respondida el {fmtDate(portal.client_responded_at)}</p>{portal.client_comments && <div style={{background:s.bg,borderRadius:8,padding:16,textAlign:"left"}}><p style={{margin:"0 0 4px",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:s.color}}>Sus comentarios</p><p style={{margin:0,fontSize:13,color:C.ink,lineHeight:1.6,whiteSpace:"pre-wrap"}}>{portal.client_comments}</p></div>}<p style={{margin:"24px 0 0",fontSize:11,color:C.inkLight}}>Si necesita hacer cambios, contacte con su representante.</p></div></div>);
  }

  const d = portal.offer_data || {};
  const divisa = d.divisa || "COP";
  const textBlock = t => t ? <div style={{fontSize:13,color:C.ink,lineHeight:1.7,whiteSpace:"pre-wrap"}}>{t}</div> : <p style={{margin:0,fontSize:13,color:C.inkLight,fontStyle:"italic"}}>No especificado</p>;

  const handleSubmit = async () => {
    if (!action) return;
    if (action==="devolver" && !comments.trim()) { alert("Por favor, indique los cambios que necesita."); return; }
    setSubmitting(true);
    try {
      const sm = { aprobar:"aprobada", rechazar:"rechazada", devolver:"devuelta" };
      const updated = await respondPortal(token, sm[action], comments);
      setPortal(updated); setDone(true);
    } catch(e) { alert("Error al enviar. Intente de nuevo."); console.error(e); }
    setSubmitting(false);
  };

  return (
    <div style={{...F,minHeight:"100vh",background:C.bg}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM Sans:wght@300;400;500;600;700;800&display=swap');*{box-sizing:border-box;margin:0;padding:0}body{font-family:'DM Sans',sans-serif}`}</style>
      <div style={{background:"#111",color:"#fff",padding:"28px 0"}}><div style={{maxWidth:760,margin:"0 auto",padding:"0 24px"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}><div><p style={{fontSize:10,letterSpacing:2,textTransform:"uppercase",color:"rgba(255,255,255,.5)",marginBottom:4}}>Propuesta Comercial — {portal.revision||"Rev.01"}</p><h1 style={{fontSize:24,fontWeight:700,margin:0}}>{d.ref||"Oferta"}</h1></div><div style={{textAlign:"right"}}><p style={{fontSize:12,color:"rgba(255,255,255,.7)",margin:0}}>{d.firmante||"Habitaris"}</p><p style={{fontSize:11,color:"rgba(255,255,255,.4)",margin:0}}>{fmtDate(d.fecha)}</p></div></div></div></div>
      <div style={{maxWidth:760,margin:"0 auto",padding:"32px 24px 120px"}}>
        <div style={{background:C.blueBg,border:"1px solid "+C.blue+"33",borderRadius:12,padding:"16px 20px",marginBottom:28,display:"flex",alignItems:"center",gap:12}}><span style={{fontSize:24}}>⏳</span><div><p style={{fontSize:13,fontWeight:600,color:C.blue,margin:"0 0 2px"}}>Pendiente de su respuesta</p><p style={{fontSize:11,color:C.inkMid,margin:0}}>Revise los detalles y apruebe, rechace o solicite cambios al final.</p></div></div>
        <div style={{display:"flex",gap:12,marginBottom:28,flexWrap:"wrap"}}><KPI label="Proyecto" value={d.proyecto||d.titulo||"—"} /><KPI label={"PVP sin IVA ("+divisa+")"} value={fmtMoney(d.pvp,divisa)} /><KPI label={"PVP con IVA ("+divisa+")"} value={fmtMoney(d.pvpIva,divisa)} highlight /></div>
        <Section title="Datos del proyecto" icon="📋"><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,fontSize:13}}><div><span style={{color:C.inkLight,fontSize:11}}>Cliente</span><br/><strong>{d.cliente||"—"}</strong></div><div><span style={{color:C.inkLight,fontSize:11}}>Proyecto</span><br/><strong>{d.proyecto||"—"}</strong></div><div><span style={{color:C.inkLight,fontSize:11}}>Ubicación</span><br/><strong>{d.ubicacion||"—"}</strong></div><div><span style={{color:C.inkLight,fontSize:11}}>Revisión</span><br/><strong>{portal.revision}</strong></div></div></Section>
        {d.alcance && <Section title="Alcance del servicio" icon="📐">{textBlock(d.alcance)}</Section>}
        {d.fases && <Section title="Fases del proyecto" icon="📅">{textBlock(d.fases)}</Section>}
        {d.exclusiones && <Section title="Exclusiones" icon="🚫">{textBlock(d.exclusiones)}</Section>}
        {d.condPago && <Section title="Condiciones de pago" icon="💰">{textBlock(d.condPago)}</Section>}
        {d.plazo && <Section title="Plazo de ejecución" icon="⏱">{textBlock(d.plazo)}</Section>}
        {d.garantias && <Section title="Garantías" icon="🛡">{textBlock(d.garantias)}</Section>}
        {d.terminos && <Section title="Términos y condiciones" icon="📜">{textBlock(d.terminos)}</Section>}
        {d.notaLegal && <div style={{background:"#FFFFFF",borderRadius:10,padding:16,marginBottom:28,border:"1px solid "+C.border}}><p style={{fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:1,color:C.inkLight,margin:"0 0 6px"}}>Nota legal</p><p style={{fontSize:11,color:C.inkMid,lineHeight:1.6,margin:0}}>{d.notaLegal}</p></div>}
        <div style={{background:C.surface,borderRadius:16,padding:28,boxShadow:C.shadow,border:"2px solid "+C.border}}>
          <h3 style={{fontSize:16,fontWeight:700,color:C.ink,margin:"0 0 6px"}}>Su decisión</h3>
          <p style={{fontSize:12,color:C.inkMid,margin:"0 0 20px",lineHeight:1.5}}>Seleccione una opción y añada comentarios si lo desea.</p>
          <div style={{display:"flex",gap:10,marginBottom:20,flexWrap:"wrap"}}>
            {[{id:"aprobar",icon:"✅",label:"Aprobar oferta",color:C.green,bg:C.greenBg,desc:"Acepto las condiciones"},{id:"devolver",icon:"🔄",label:"Solicitar cambios",color:C.amber,bg:C.amberBg,desc:"Necesito modificaciones"},{id:"rechazar",icon:"❌",label:"Rechazar oferta",color:C.red,bg:C.redBg,desc:"No me interesa"}].map(a=>(
              <button key={a.id} onClick={()=>setAction(a.id)} style={{...F,flex:1,minWidth:160,padding:"16px 14px",borderRadius:12,cursor:"pointer",textAlign:"left",background:action===a.id?a.bg:C.surface,border:"2px solid "+(action===a.id?a.color:C.border),transition:"all .15s"}}><div style={{fontSize:22,marginBottom:6}}>{a.icon}</div><div style={{fontSize:12,fontWeight:700,color:action===a.id?a.color:C.ink,marginBottom:2}}>{a.label}</div><div style={{fontSize:10,color:C.inkLight,lineHeight:1.4}}>{a.desc}</div></button>
            ))}
          </div>
          {action && <div style={{marginBottom:20}}><label style={{display:"block",fontSize:11,fontWeight:600,color:C.ink,marginBottom:6}}>{action==="devolver"?"Describa los cambios que necesita *":"Comentarios (opcional)"}</label><textarea value={comments} onChange={e=>setComments(e.target.value)} placeholder={action==="devolver"?"Indique qué ajustes necesita...":"Puede añadir notas..."} rows={4} style={{...F,width:"100%",padding:12,borderRadius:8,border:"1px solid "+C.border,fontSize:13,resize:"vertical",background:"#FFFFFF"}} /></div>}
          {action && <button onClick={handleSubmit} disabled={submitting} style={{...F,width:"100%",padding:"14px 24px",borderRadius:10,fontSize:14,fontWeight:700,border:"none",cursor:submitting?"wait":"pointer",color:"#fff",background:action==="aprobar"?C.green:action==="rechazar"?C.red:C.amber,opacity:submitting?.6:1}}>{submitting?"Enviando...":action==="aprobar"?"✅ Confirmar aprobación":action==="rechazar"?"❌ Confirmar rechazo":"🔄 Enviar solicitud de cambios"}</button>}
        </div>
        <div style={{textAlign:"center",marginTop:40,padding:"20px 0",borderTop:"1px solid "+C.border}}><p style={{fontSize:11,color:C.inkLight,margin:0}}>Propuesta enviada por <strong style={{color:C.ink}}>{d.firmante||"Habitaris"}</strong></p></div>
      </div>
    </div>
  );
}
