import React, { useState, useEffect, useMemo, useCallback } from "react";
import { store } from "../../core/store.js";
import { sb } from "../../core/supabase.js";
import * as SB from "../supabase.js";
import { procesarRespuesta as routeProcesar } from "./FormProcessor.js";
import { crearFormLink } from "./linkService.js";
import RespuestaModal from "./RespuestaModal.jsx";
import { getConfig } from "../Configuracion.jsx";
import { Send, ChevronDown, ChevronUp, Copy, Mail, Search, RefreshCw, FileText, MessageCircle } from "lucide-react";

const T={ink:"#111",inkMid:"#555",inkLight:"#999",blue:"#2563EB",blueBg:"#EFF6FF",green:"#16a34a",greenBg:"#ECFDF5",red:"#DC2626",redBg:"#FEF2F2",amber:"#D97706",amberBg:"#FFFBEB",border:"#E8E8E8",bg:"#FAFAFA",surface:"#fff",accent:"#F5F4F1"};
const uid=()=>Math.random().toString(36).slice(2,9)+Date.now().toString(36);
const today=()=>new Date().toISOString().split("T")[0];

const PAISES=[
  {nombre:"Colombia",cod:"+57",divisa:"COP"},
  {nombre:"España",cod:"+34",divisa:"EUR"},
  {nombre:"México",cod:"+52",divisa:"MXN"},
  {nombre:"Chile",cod:"+56",divisa:"CLP"},
  {nombre:"Perú",cod:"+51",divisa:"PEN"},
  {nombre:"Ecuador",cod:"+593",divisa:"USD"},
  {nombre:"Argentina",cod:"+54",divisa:"ARS"},
  {nombre:"Panamá",cod:"+507",divisa:"USD"},
  {nombre:"Estados Unidos",cod:"+1",divisa:"USD"},
  {nombre:"Otro",cod:"+1",divisa:"USD"},
];

/* ── Email via Resend API ── */
const sendEmail = async (params) => {
  try {
    const res = await fetch("/api/send-email", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify(params),
    });
    const data = await res.json();
    return data.ok || res.ok;
  } catch { return false; }
};

/* ── Scoring engine ── */
function calculateScore(resp, form) {
  if(!form?.campos)return null;
  const campos=form.campos.filter(c=>c.scoring?.enabled);
  if(campos.length===0)return null;
  let totalPoints=0,maxPoints=0,greens=0,reds=0,yellows=0;
  const details=[];
  campos.forEach(c=>{
    const w=c.scoring.weight||1; const key=c.mapKey||c.id; let val=resp[key];
    if(val===undefined)return; maxPoints+=w;
    const rules=c.scoring.rules||{}; let flag="neutral";
    if(Array.isArray(val)){const flags=val.map(v=>rules[v]||"neutral");if(flags.includes("red"))flag="red";else if(flags.every(f=>f==="green"))flag="green";else flag="neutral";}
    else{flag=rules[String(val)]||"neutral";}
    let points=0;
    if(flag==="green"){points=w;greens++;}else if(flag==="neutral"){points=w*0.5;yellows++;}else{points=0;reds++;}
    totalPoints+=points;
    details.push({label:c.label,value:Array.isArray(val)?val.join(", "):String(val),flag,points,maxPoints:w});
  });
  const score=maxPoints>0?Math.round((totalPoints/maxPoints)*100)/10:0;
  const level=score>=7?"green":score>=4?"yellow":"red";
  const levelLabel=level==="green"?"🟢 Cliente potencial":level==="yellow"?"🟡 Revisar":"🔴 No califica";
  const conclusion=level==="green"?"Perfil alineado. Contactar en las proximas 24h.":level==="yellow"?"Algunos puntos requieren validacion. Agendar llamada exploratoria.":"Expectativas no alineadas. Responder cortesmente y archivar.";
  return{score,level,levelLabel,conclusion,greens,reds,yellows,totalPoints,maxPoints,details};
}

/* ── UI Components ── */
const Card=({children,style})=><div style={{background:T.surface,border:"1px solid "+T.border,borderRadius:6,...style}}>{children}</div>;
const Badge=({color,bg,children})=><span style={{fontSize:8,fontWeight:700,padding:"2px 8px",borderRadius:10,background:bg||(color+"15"),color}}>{children}</span>;
const Btn=({v,on,children,disabled,style})=><button onClick={on} disabled={disabled} style={{padding:"4px 12px",fontSize:9,fontWeight:600,borderRadius:3,cursor:disabled?"default":"pointer",border:v==="pri"?"none":"1px solid "+T.border,background:v==="pri"?"#111":"#fff",color:v==="pri"?"#fff":T.inkMid,opacity:disabled?.4:1,fontFamily:"'DM Sans',sans-serif",...style}}>{children}</button>;

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════ */
export default function FormulariosDelModulo({modulo,moduloLabel}){
  const [subTab,setSubTab]=useState("formularios");
  const [forms,setForms]=useState([]);
  const [allForms,setAllForms]=useState([]);
  const [respuestas,setRespuestas]=useState([]);
  const [envios,setEnvios]=useState([]);
  const [procesados,setProcesados]=useState([]);
  const [loading,setLoading]=useState(true);

  // Share state
  const [shareForm,setShareForm]=useState(null);
  const [shareClient,setShareClient]=useState({nombre:"",email:"",tel:"",codTel:"+57"});
  const [sharePais,setSharePais]=useState("Colombia");
  const [shareLinkMaxUsos,setShareLinkMaxUsos]=useState(2);
  const [shareLinkHorasDuracion,setShareLinkHorasDuracion]=useState(48);
  const [shareLinkExpiry,setShareLinkExpiry]=useState("");
  const [shareResult,setShareResult]=useState(null);
  const [sending,setSending]=useState(false);
  const [emailSending,setEmailSending]=useState(false);
  const [emailSent,setEmailSent]=useState(false);

  // UI state
  const [expandedId,setExpandedId]=useState(null);
  const [search,setSearch]=useState("");
  const [filtroResp,setFiltroResp]=useState("pendiente");
  const [filtroEnvio,setFiltroEnvio]=useState("pendiente");

  /* ── Load forms ── */
  useEffect(()=>{
    try{const raw=store.getSync("habitaris_formularios");if(raw){const obj=JSON.parse(raw)||{};const all=obj.forms||[];setAllForms(all);setForms(all.filter(f=>f.modulo===modulo));}}catch{}
    try{const raw=store.getSync("hab:form:procesados");if(raw)setProcesados(JSON.parse(raw)||[]);}catch{}
  },[modulo]);

  useEffect(()=>{loadData();},[forms]);

  const loadData=async()=>{
    
    setLoading(true);
    try{
      const fids=forms.map(f=>f.id);
      if(fids.length>0){
        const{data:rd}=await sb.from("form_responses").select("*").in("form_id",fids).order("created_at",{ascending:false});
        if(rd)setRespuestas(rd.map(r=>({...((r.data&&typeof r.data==="object")?r.data:{}),_sbId:r.id,id:r.data?.id||r.id,formularioId:r.form_id,formularioNombre:r.form_name||"",fecha:r.created_at?new Date(r.created_at).toLocaleDateString("es-CO",{year:"numeric",month:"2-digit",day:"2-digit"}):"",hora:r.created_at?new Date(r.created_at).toLocaleTimeString("es-CO",{hour:"2-digit",minute:"2-digit",hour12:false}):"",processed:r.processed||false,link_id:r.link_id||r.data?.linkId||null})));
        const{data:ld}=await sb.from("form_links").select("*").in("form_id",fids).order("created_at",{ascending:false});
        if(ld)setEnvios(ld.map(l=>({id:l.link_id,linkId:l.link_id,formId:l.form_id,formNombre:l.form_name||"",cliente:{nombre:l.client_name,email:l.client_email,tel:l.client_tel},fecha:l.created_at?new Date(l.created_at).toLocaleDateString("es-CO",{year:"numeric",month:"2-digit",day:"2-digit"}):"",hora:l.created_at?new Date(l.created_at).toLocaleTimeString("es-CO",{hour:"2-digit",minute:"2-digit",hour12:false}):"",maxUsos:l.max_uses,currentUsos:l.current_uses,blocked:!l.active,expiresAt:l.expires_at})));
      }
    }catch(e){console.warn("FormulariosDelModulo load:",e);}
    setLoading(false);
  };

  /* ── Process helpers ── */
  const isProcesado=(r)=>r.processed||procesados.includes(r.id);
  const markProcesado=useCallback((id,sbId)=>{const next=[...procesados,id];setProcesados(next);store.set("hab:form:procesados",JSON.stringify(next));if(sbId)SB.markProcessed(sbId).catch(()=>{});},[procesados]);
  const markPendiente=useCallback((id,sbId)=>{const next=procesados.filter(x=>x!==id);setProcesados(next);store.set("hab:form:procesados",JSON.stringify(next));if(sbId)SB.markUnprocessed(sbId).catch(()=>{});},[procesados]);

  const handleProcesar=async(r)=>{
    try{
      const result=await routeProcesar(r,allForms,markProcesado);
      if(result?.ok)window.toast?.(result.msg,"success");else window.toast?.("Error procesando respuesta","error");
    }catch(err){window.toast?.("Error: "+err.message,"error");}
  };

  /* ── Send form ── */
  const handleSend=async()=>{
    if(!shareForm||!shareClient.nombre)return;
    setSending(true);
    try{
      const cfg=getConfig();const appUrl=(cfg.app?.url||"").replace(/\/$/,"");
      const codTel=shareClient.codTel||(PAISES.find(p=>p.nombre===sharePais)?.cod||"+57");
      const client={nombre:shareClient.nombre,email:shareClient.email,tel:(codTel.replace(/[^0-9+]/g,"")+" "+shareClient.tel).trim()};
      const marca={logo:cfg.apariencia?.logo||"",colorPrimario:cfg.apariencia?.colorPrimario||"#111",colorSecundario:cfg.apariencia?.colorSecundario||"#3B3B3B",colorAcento:cfg.apariencia?.colorAcento||"#111",tipografia:cfg.apariencia?.tipografia||"DM Sans",slogan:cfg.apariencia?.slogan||cfg.empresa?.eslogan||"",empresa:cfg.empresa?.nombre||"Habitaris",adminEmail:cfg.correo?.emailPrincipal||"",razonSocial:cfg.empresa?.razonSocial||"",domicilio:cfg.empresa?.domicilio||""};
      const result=await crearFormLink({
        form:{id:shareForm.id||"form",nombre:shareForm.nombre,campos:shareForm.campos,config:shareForm.config},
        cliente:client,
        modulo,
        pais:sharePais,
        maxUsos:shareLinkMaxUsos||0,
        horasDuracion:shareLinkHorasDuracion||0,
        fechaExacta:shareLinkExpiry||"",
        marca,
        appUrl,
      });
      if(!result.ok)throw(result.error||new Error("No se pudo crear el link"));
      setShareResult({linkId:result.linkId,url:result.publicUrl,client});
      SB.registerOpen(shareForm.id,shareForm.nombre,result.linkId,client.nombre,client.email).catch(()=>{});
      setTimeout(loadData,500);
    }catch(e){window.toast?.("Error generando formulario: "+(e?.message||e),"error");}
    setSending(false);
  };

  /* ── Link info helper ── */
  const buildLinkInfo=()=>{
    const parts=[];
    if(shareLinkMaxUsos>0)parts.push(shareLinkMaxUsos+" uso"+(shareLinkMaxUsos>1?"s":"")+" disponible"+(shareLinkMaxUsos>1?"s":""));
    if(shareLinkExpiry){
      const d=new Date(shareLinkExpiry);
      parts.push("válido hasta el "+d.toLocaleDateString("es-CO",{day:"2-digit",month:"2-digit",year:"numeric"}));
    } else if(shareLinkHorasDuracion>0){
      parts.push("válido durante "+shareLinkHorasDuracion+" horas");
    }
    if(parts.length===0)return"\n\n✅ Este enlace no tiene límite de usos.";
    return"\n\n⏳ Este enlace tiene "+parts.join(" y es ")+".";
  };

  /* ── Share actions ── */
  const shareWhatsApp=()=>{
    if(!shareResult)return;
    const cfg=getConfig();
    const clientName=shareResult.client.nombre||"cliente";
    const linkText=shareResult.url?"\n\n🔗 "+shareResult.url:"";
    const plantilla=cfg.whatsapp?.mensajePlantilla||"Hola {{nombre}}, te enviamos el formulario {{formulario}} de {{empresa}}.";
    const linkInfo=buildLinkInfo();
    const msg=plantilla.replace(/\{\{nombre\}\}/g,clientName).replace(/\{\{formulario\}\}/g,shareForm?.nombre||"Formulario").replace(/\{\{empresa\}\}/g,cfg.empresa?.nombre||"Habitaris")+linkText+linkInfo;
    const tel=shareResult.client.tel?(shareResult.client.tel).replace(/[^0-9]/g,""):"";
    window.open("https://wa.me/"+tel+"?text="+encodeURIComponent(msg),"_blank");
  };

  const shareEmail=async()=>{
    if(!shareResult?.client?.email){window.toast?.("No hay email del cliente","warning");return;}
    if(!shareResult?.linkId){window.toast?.("Genera el link primero","warning");return;}
    setEmailSending(true);
    const ok=await sendEmail({type:"invitation",link_id:shareResult.linkId});
    setEmailSending(false);
    if(ok){setEmailSent(true);setTimeout(()=>setEmailSent(false),5000);window.toast?.("✅ Email enviado a "+shareResult.client.email,"success");}
    else{window.toast?.("Error al enviar email. Verifica la configuración de correo.","error");}
  };



  /* ── Status helpers ── */
  const getStatus=(e)=>{const hasResp=respuestas.some(r=>(r.link_id||r.linkId)===e.linkId);if(hasResp)return"respondido";if(e.blocked)return"bloqueado";if(e.expiresAt&&new Date(e.expiresAt)<new Date())return"caducado";if(e.maxUsos>0&&e.currentUsos>=e.maxUsos)return"bloqueado";return"pendiente";};
  const getLinkUrl=(linkId)=>{const cfg=getConfig();const appUrl=(cfg.app?.url||"").replace(/\/$/,"");return appUrl?appUrl+"/form?id="+linkId:"";};

  /* ── Filtering ── */
  const q=search.toLowerCase();
  const matchSearch=(item)=>{
    if(!q)return true;
    const fields=[item.clienteNombre,item.clienteEmail,item.formularioNombre,item.cliente?.nombre,item.cliente?.email,item.formNombre,item.fecha].filter(Boolean);
    return fields.some(f=>f.toLowerCase().includes(q));
  };
  const respFiltered=useMemo(()=>{
    let r=respuestas.filter(matchSearch);
    if(filtroResp==="pendiente")r=r.filter(x=>!isProcesado(x));
    if(filtroResp==="procesado")r=r.filter(x=>isProcesado(x));
    return r;
  },[respuestas,search,filtroResp,procesados]);
  const envFiltered=useMemo(()=>{
    let e=envios.filter(matchSearch);
    if(filtroEnvio!=="todos")e=e.filter(x=>getStatus(x)===filtroEnvio);
    return e;
  },[envios,search,filtroEnvio,respuestas]);
  const respPendientes=respuestas.filter(r=>!isProcesado(r));
  const respProcesadas=respuestas.filter(r=>isProcesado(r));
  const envCounts=useMemo(()=>{const c={pendiente:0,respondido:0,bloqueado:0,caducado:0,todos:envios.length};envios.forEach(e=>{const s=getStatus(e);c[s]=(c[s]||0)+1;});return c;},[envios,respuestas]);

  /* ── Styles ── */
  const inp={padding:"7px 10px",fontSize:11,border:"1px solid "+T.border,borderRadius:4,fontFamily:"'DM Sans',sans-serif",outline:"none",background:T.bg,color:T.ink,boxSizing:"border-box"};
  const lblS={fontSize:9,fontWeight:600,color:T.inkLight,textTransform:"uppercase",letterSpacing:1,display:"block",marginBottom:4};
  const ths={padding:"6px 10px",fontSize:8,fontWeight:700,textTransform:"uppercase",letterSpacing:.5,color:T.inkMid,textAlign:"left",borderBottom:"1px solid "+T.border};
  const tds={padding:"7px 10px",fontSize:10,borderBottom:"1px solid "+T.border,color:T.ink};

  if(loading)return<div style={{padding:20,textAlign:"center",color:T.inkLight,fontSize:11}}>Cargando formularios...</div>;

  return(
    <div>
      {/* ── Header: Sub-tabs + Search ── */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,gap:12,flexWrap:"wrap"}}>
        <div style={{display:"flex",gap:0}}>
          {[{id:"formularios",lbl:"Formularios ("+forms.length+")"},{id:"envios",lbl:"Enviados ("+envios.length+")"},{id:"respuestas",lbl:"Respuestas ("+respuestas.length+")"}].map((t,i,arr)=>(
            <button key={t.id} onClick={()=>setSubTab(t.id)} style={{padding:"7px 16px",fontSize:10,fontWeight:subTab===t.id?700:500,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",border:"1px solid "+(subTab===t.id?"#111":T.border),borderLeft:i>0?"none":undefined,borderRadius:i===0?"5px 0 0 5px":i===arr.length-1?"0 5px 5px 0":"0",background:subTab===t.id?"#111":"#fff",color:subTab===t.id?"#fff":T.inkMid}}>{t.lbl}</button>
          ))}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6,border:"1px solid "+T.border,borderRadius:4,padding:"0 8px",background:"#fff"}}>
          <Search size={12} color={T.inkLight}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por nombre, email, formulario..." style={{border:"none",outline:"none",fontSize:10,padding:"6px 0",width:220,fontFamily:"'DM Sans',sans-serif",background:"transparent"}}/>
        </div>
      </div>

      {/* ═══ FORMULARIOS ═══ */}
      {subTab==="formularios"&&(
        <div>
          {forms.length===0?(
            <Card style={{padding:24,textAlign:"center"}}><p style={{fontSize:11,color:T.inkLight,margin:0}}>No hay formularios asignados a {moduloLabel}.</p><p style={{fontSize:9,color:T.inkLight,marginTop:4}}>Solicita al administrador que cree uno desde el modulo Formularios.</p></Card>
          ):forms.map(f=>(
            <Card key={f.id} style={{padding:"14px 18px",marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:13,fontWeight:700}}>{f.nombre}</div>
                  <div style={{fontSize:9,color:T.inkLight,marginTop:2}}>{f.campos?.length||0} campos · {moduloLabel} · Creado: {f.createdAt||"—"}</div>
                </div>
                <Btn v="pri" on={()=>{
                  const paisDefault=PAISES[0].nombre;
                  setShareForm(f);setShareClient({nombre:"",email:"",tel:"",codTel:PAISES[0].cod});
                  setSharePais(paisDefault);setShareLinkMaxUsos(2);setShareLinkHorasDuracion(48);setShareLinkExpiry("");
                  setShareResult(null);setEmailSent(false);
                }}><Send size={10}/> Enviar</Btn>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ═══ MODAL ENVIAR (flotante) ═══ */}
      {shareForm&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:9999,display:"flex",alignItems:"flex-start",justifyContent:"center",paddingTop:40,overflowY:"auto"}} onClick={()=>{setShareForm(null);setShareResult(null);}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:8,padding:28,width:460,maxHeight:"85vh",overflowY:"auto",boxShadow:"0 12px 40px rgba(0,0,0,0.2)",marginBottom:40}}>
            <h3 style={{margin:0,fontSize:16,fontWeight:700,marginBottom:4}}>📤 Enviar formulario a cliente</h3>
            <p style={{margin:"0 0 16px",fontSize:10,color:T.inkMid}}>{shareForm.nombre} · Se genera un enlace que el cliente abre en su navegador</p>

            {!shareResult?(
              <div>
                {/* 👤 Datos del cliente */}
                <div style={{background:T.accent,borderRadius:6,padding:"12px 14px",marginBottom:14}}>
                  <div style={{fontSize:8,fontWeight:700,color:"#888",textTransform:"uppercase",marginBottom:8}}>👤 Datos del cliente</div>
                  <div style={{display:"flex",gap:8,marginBottom:6}}>
                    <div style={{flex:1}}>
                      <label style={{fontSize:7,fontWeight:700,color:"#888",textTransform:"uppercase"}}>Nombre *</label>
                      <input value={shareClient.nombre} onChange={e=>setShareClient({...shareClient,nombre:e.target.value})} placeholder="Juan Pérez" style={{...inp,width:"100%",fontSize:11}}/>
                    </div>
                    <div style={{flex:1}}>
                      <label style={{fontSize:7,fontWeight:700,color:"#888",textTransform:"uppercase"}}>Email</label>
                      <input type="email" value={shareClient.email} onChange={e=>setShareClient({...shareClient,email:e.target.value})} placeholder="juan@empresa.com" style={{...inp,width:"100%",fontSize:11}}/>
                    </div>
                  </div>
                  <div>
                    <label style={{fontSize:7,fontWeight:700,color:"#888",textTransform:"uppercase"}}>WhatsApp</label>
                    <div style={{display:"flex",gap:0}}>
                      <select value={shareClient.codTel} onChange={e=>setShareClient({...shareClient,codTel:e.target.value})}
                        style={{...inp,width:80,flexShrink:0,borderRadius:"6px 0 0 6px",borderRight:"none",fontWeight:700,fontSize:11,color:"#3B3B3B",background:"#F5F4F1"}}>
                        {PAISES.map(p=><option key={p.cod+p.nombre} value={p.cod}>{p.cod}</option>)}
                      </select>
                      <input value={shareClient.tel} onChange={e=>setShareClient({...shareClient,tel:e.target.value})} placeholder="3001234567" style={{...inp,flex:1,fontSize:11,borderRadius:"0 6px 6px 0"}}/>
                    </div>
                  </div>
                </div>

                {/* País se hereda del tenant — eliminado del modal (Fase 0.5: tenant_config) */}

                {/* Control del enlace (estilo modal compacto, igual que Formularios admin) */}
                <div style={{display:"grid",gap:10}}>
                  <div>
                    <label style={{fontSize:7,fontWeight:700,color:"#888",textTransform:"uppercase",display:"block",marginBottom:4}}>Cantidad de clicks permitidos</label>
                    <input type="number" min={0} value={shareLinkMaxUsos} onChange={e=>setShareLinkMaxUsos(parseInt(e.target.value)||0)} style={{width:"100%",padding:"6px 8px",fontSize:11,border:"1px solid #11111122",borderRadius:4,fontFamily:"inherit"}}/>
                    <div style={{fontSize:9,color:"#888",marginTop:3}}>0 = ilimitado</div>
                  </div>
                  <div>
                    <label style={{fontSize:7,fontWeight:700,color:"#888",textTransform:"uppercase",display:"block",marginBottom:4}}>Duración del enlace</label>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(3, 1fr)",gap:6,marginBottom:6}}>
                      {[24,48,72].map(h=>(
                        <button key={h} type="button" onClick={()=>{setShareLinkHorasDuracion(h);setShareLinkExpiry("");}} style={{padding:"8px 6px",fontSize:11,fontWeight:600,border:shareLinkHorasDuracion===h&&!shareLinkExpiry?"1.5px solid #111":"1px solid #11111133",background:shareLinkHorasDuracion===h&&!shareLinkExpiry?"#111":"#fff",color:shareLinkHorasDuracion===h&&!shareLinkExpiry?"#fff":"#111",borderRadius:4,cursor:"pointer",fontFamily:"inherit"}}>{h}h</button>
                      ))}
                    </div>
                    <button type="button" onClick={()=>{setShareLinkHorasDuracion(0);setShareLinkExpiry("");}} style={{width:"100%",padding:"6px",fontSize:10,fontWeight:600,border:shareLinkHorasDuracion===0&&!shareLinkExpiry?"1.5px solid #111":"1px solid #11111133",background:shareLinkHorasDuracion===0&&!shareLinkExpiry?"#111":"#fff",color:shareLinkHorasDuracion===0&&!shareLinkExpiry?"#fff":"#111",borderRadius:4,cursor:"pointer",fontFamily:"inherit",marginBottom:6}}>♾️ Sin caducidad</button>
                    <div style={{display:"flex",gap:6,alignItems:"center"}}>
                      <label style={{fontSize:9,color:"#888",whiteSpace:"nowrap"}}>O fecha exacta:</label>
                      <input type="date" value={shareLinkExpiry} min={today()} onChange={e=>setShareLinkExpiry(e.target.value)} style={{flex:1,padding:"4px 6px",fontSize:10,border:shareLinkExpiry?"1.5px solid #111":"1px solid #11111133",borderRadius:4,fontFamily:"inherit"}}/>
                    </div>
                    <div style={{fontSize:9,color:"#888",marginTop:4}}>
                      {shareLinkExpiry?("Caduca el "+new Date(shareLinkExpiry).toLocaleDateString("es-CO")):(shareLinkHorasDuracion>0?("Caduca "+shareLinkHorasDuracion+"h después de generar el enlace"):"Sin caducidad")}
                    </div>
                  </div>
                </div>

                {/* Generate button */}
                <button onClick={handleSend} disabled={!shareClient.nombre||sending} style={{width:"100%",padding:"10px 20px",fontSize:13,fontWeight:700,borderRadius:5,cursor:sending||!shareClient.nombre?"default":"pointer",border:"none",background:!shareClient.nombre?"#ccc":"#111",color:"#fff",fontFamily:"'DM Sans',sans-serif",opacity:sending?.6:1,marginTop:14,marginBottom:10,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                  📄 {sending?"Generando...":"Generar formulario personalizado"}
                </button>
              </div>
            ):(
              <div>
                {/* Success */}
                <div style={{marginBottom:14,padding:"10px 12px",background:T.greenBg,borderRadius:6,border:"1px solid "+T.green+"33",fontSize:10,color:T.green,fontWeight:600}}>
                  ✅ Formulario listo para {shareResult.client.nombre||shareResult.client.email}
                  {shareResult.url&&<div style={{marginTop:4,fontSize:8,color:T.inkMid,fontWeight:400}}>🔗 Link público generado — comparte por email, WhatsApp o copia el enlace</div>}
                </div>

                {/* Share actions */}
                <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
                  {shareResult.url&&(
                    <button onClick={()=>{navigator.clipboard.writeText(shareResult.url);window.toast?.("✅ Link copiado al portapapeles","success");}} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",border:"none",borderRadius:6,background:"#111",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",textAlign:"left",color:"#fff"}}>
                      <div style={{width:32,height:32,borderRadius:6,background:"rgba(255,255,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center"}}><Copy size={14} color="#fff"/></div>
                      <div style={{flex:1}}><div style={{fontSize:11,fontWeight:700}}>📋 Copiar link del formulario</div><div style={{fontSize:8,color:"rgba(255,255,255,0.5)",marginTop:2,wordBreak:"break-all"}}>{shareResult.url}</div></div>
                    </button>
                  )}

                  <button onClick={shareEmail} disabled={emailSending||!shareResult.client.email} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",border:"1px solid "+T.border,borderRadius:6,background:emailSent?T.greenBg:"#FAFAFA",cursor:emailSending?"wait":"pointer",fontFamily:"'DM Sans',sans-serif",textAlign:"left",opacity:(emailSending||!shareResult.client.email)?.5:1}}>
                    <div style={{width:32,height:32,borderRadius:6,background:emailSent?T.greenBg:"#F0F0F0",display:"flex",alignItems:"center",justifyContent:"center"}}><Mail size={14} color={emailSent?T.green:"#999"}/></div>
                    <div><div style={{fontSize:11,fontWeight:600,color:emailSent?"#111":"#888"}}>{emailSending?"Enviando...":emailSent?"\u2705 Email enviado":"\ud83d\udce7 Enviar por email"}</div><div style={{fontSize:8,color:"#AAA"}}>{emailSent?"Enviado a "+shareResult.client.email:shareResult.client.email?"Funciona con Gmail \u00b7 Limitado con Outlook":"Sin email del cliente"}</div></div>
                  </button>
                </div>

                <div style={{display:"flex",gap:8}}>
                  <Btn on={()=>{setShareResult(null);setShareClient({nombre:"",email:"",tel:"",codTel:PAISES.find(p=>p.nombre===sharePais)?.cod||"+57"});setEmailSent(false);}} style={{flex:1,justifyContent:"center"}}>+ Otro cliente</Btn>
                  <Btn v="pri" on={()=>{setShareForm(null);setShareResult(null);}} style={{flex:1,justifyContent:"center"}}>Cerrar</Btn>
                </div>
              </div>
            )}

            {!shareResult&&<Btn on={()=>{setShareForm(null);setShareResult(null);}} style={{width:"100%",marginTop:6,justifyContent:"center"}}>Cancelar</Btn>}
          </div>
        </div>
      )}

      {/* ═══ ENVIADOS ═══ */}
      {subTab==="envios"&&(
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{display:"flex",gap:0}}>
              {[["todos","Todos ("+envCounts.todos+")"],["pendiente","Pendientes ("+envCounts.pendiente+")"],["respondido","Respondidos ("+envCounts.respondido+")"],["caducado","Caducados ("+(envCounts.caducado||0)+")"],["bloqueado","Bloqueados ("+envCounts.bloqueado+")"]].map(([id,lbl],i,arr)=>(
                <button key={id} onClick={()=>setFiltroEnvio(id)} style={{padding:"5px 12px",fontSize:9,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",border:"1px solid "+(filtroEnvio===id?"#111":T.border),borderLeft:i>0?"none":undefined,borderRadius:i===0?"4px 0 0 4px":i===arr.length-1?"0 4px 4px 0":"0",background:filtroEnvio===id?"#111":"#fff",color:filtroEnvio===id?"#fff":T.inkMid}}>{lbl}</button>
              ))}
            </div>
            <Btn on={loadData}><RefreshCw size={10}/> Recargar</Btn>
          </div>
          <Card style={{padding:0,overflow:"hidden"}}>
            <table style={{borderCollapse:"collapse",width:"100%"}}>
              <thead><tr style={{background:"#F0F0F0"}}>{["Fecha","Formulario","Cliente","Email","Telefono","Estado",""].map(h=><th key={h} style={ths}>{h}</th>)}</tr></thead>
              <tbody>
                {envFiltered.length===0?<tr><td colSpan={7} style={{padding:24,textAlign:"center",color:T.inkLight,fontSize:11}}>Sin resultados</td></tr>
                :envFiltered.map(e=>{const s=getStatus(e);return(
                  <tr key={e.id}>
                    <td style={{...tds,fontFamily:"'DM Mono',monospace",fontSize:9}}>{e.fecha} {e.hora}</td>
                    <td style={{...tds,fontWeight:600}}>{e.formNombre}</td>
                    <td style={{...tds,fontWeight:600}}>{e.cliente?.nombre||"—"}</td>
                    <td style={{...tds,fontSize:9,color:T.blue}}>{e.cliente?.email||"—"}</td>
                    <td style={{...tds,fontSize:9}}>{e.cliente?.tel||"—"}</td>
                    <td style={tds}>{s==="bloqueado"?<Badge color={T.red}>🚫 Bloqueado</Badge>:s==="caducado"?<Badge color={T.red} bg={T.redBg}>⏰ Caducado</Badge>:s==="respondido"?<Badge color={T.green} bg={T.greenBg}>✅ Respondido</Badge>:<Badge color={T.amber} bg={T.amberBg}>⏳ Pendiente</Badge>}</td>
                    <td style={tds}>{s==="pendiente"&&<Btn on={()=>{const u=getLinkUrl(e.linkId);if(u){navigator.clipboard.writeText(u);window.toast?.("Link copiado al portapapeles","success");}}} style={{fontSize:8}}><Copy size={9}/> Link</Btn>}</td>
                  </tr>
                );})}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* ═══ RESPUESTAS ═══ */}
      {subTab==="respuestas"&&(
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{display:"flex",gap:0}}>
              {[["todos","Todos ("+respuestas.length+")"],["pendiente","Pendientes ("+respPendientes.length+")"],["procesado","Procesados ("+respProcesadas.length+")"]].map(([id,lbl],i,arr)=>(
                <button key={id} onClick={()=>setFiltroResp(id)} style={{padding:"5px 12px",fontSize:9,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",border:"1px solid "+(filtroResp===id?"#111":T.border),borderLeft:i>0?"none":undefined,borderRadius:i===0?"4px 0 0 4px":i===arr.length-1?"0 4px 4px 0":"0",background:filtroResp===id?"#111":"#fff",color:filtroResp===id?"#fff":T.inkMid}}>{lbl}</button>
              ))}
            </div>
            <Btn on={loadData}><RefreshCw size={10}/> Recargar</Btn>
          </div>
          <Card style={{padding:0,overflow:"hidden"}}>
            <table style={{borderCollapse:"collapse",width:"100%"}}>
              <thead><tr style={{background:"#F0F0F0"}}>{["Fecha","Formulario","Cliente","Email","Score","Estado","Acciones"].map(h=><th key={h} style={ths}>{h}</th>)}</tr></thead>
              <tbody>
                {respFiltered.length===0?<tr><td colSpan={7} style={{padding:24,textAlign:"center",color:T.inkLight,fontSize:11}}>Sin resultados</td></tr>
                :respFiltered.map(r=>{
                  const proc=isProcesado(r);
                  const form=allForms.find(f=>f.id===r.formularioId)||allForms.find(f=>f.nombre===r.formularioNombre);
                  const sc=calculateScore(r,form);
                  return(
                    <tr key={r._sbId||r.id} style={{background:proc?T.greenBg:"",cursor:"pointer"}} onClick={()=>setExpandedId(r.id)}>
                      <td style={{...tds,fontFamily:"'DM Mono',monospace",fontSize:9}}>{r.fecha} {r.hora}</td>
                      <td style={{...tds,fontWeight:600}}>{r.formularioNombre}</td>
                      <td style={{...tds,fontWeight:600}}>{r.clienteNombre||r["Nombre completo"]||"—"}</td>
                      <td style={{...tds,fontSize:9,color:T.blue}}>{r.clienteEmail||"—"}</td>
                      <td style={tds}>{sc?<span style={{fontFamily:"'DM Mono',monospace",fontWeight:800,fontSize:11,color:sc.level==="green"?T.green:sc.level==="yellow"?T.amber:T.red}}>{sc.score.toFixed(1)}</span>:"—"}</td>
                      <td style={tds}>{proc?<Badge color={T.green} bg={T.greenBg}>✅ Procesado</Badge>:<Badge color={T.amber} bg={T.amberBg}>⏳ Pendiente</Badge>}</td>
                      <td style={tds}>
                        <div style={{display:"flex",gap:4,alignItems:"center"}}>
                          <button onClick={e=>{e.stopPropagation();setExpandedId(r.id);}} style={{background:"none",border:"none",cursor:"pointer",fontSize:13,padding:2}} title="Ver detalle">👁</button>
                          {!proc&&<Btn v="pri" on={e=>{e.stopPropagation();handleProcesar(r);}} style={{fontSize:8}}>⚡ Procesar</Btn>}
                          {proc&&<Btn on={e=>{e.stopPropagation();markPendiente(r.id,r._sbId);}} style={{fontSize:8}}>↩ Revertir</Btn>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* ═══ MODAL DE RESPUESTA (compartido) ═══ */}
      {(()=>{const r=respuestas.find(x=>x.id===expandedId);if(!r)return null;
        const form=allForms.find(f=>f.id===r.formularioId)||allForms.find(f=>f.nombre===r.formularioNombre);
        const proc=isProcesado(r);
        return <RespuestaModal
          open={true}
          resp={r}
          form={form}
          onClose={()=>setExpandedId(null)}
          onProcesar={!proc?()=>{handleProcesar(r);setExpandedId(null);}:null}
          isProcesado={proc}
        />;
      })()}
    </div>
  );
}
