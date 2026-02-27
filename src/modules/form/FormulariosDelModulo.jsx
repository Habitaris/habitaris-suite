import React, { useState, useEffect, useMemo, useCallback } from "react";
import { store } from "../../core/store.js";
import { sb } from "../../core/supabase.js";
import * as SB from "../supabase.js";
import { procesarRespuesta as routeProcesar } from "./FormProcessor.js";
import { getConfig } from "../Configuracion.jsx";
import { Send, ChevronDown, ChevronUp, Copy, Mail, Search, RefreshCw } from "lucide-react";

const T={ink:"#111",inkMid:"#555",inkLight:"#999",blue:"#2563EB",blueBg:"#EFF6FF",green:"#16a34a",greenBg:"#ECFDF5",red:"#DC2626",redBg:"#FEF2F2",amber:"#D97706",amberBg:"#FFFBEB",border:"#E8E8E8",bg:"#FAFAFA",surface:"#fff"};
const uid=()=>Math.random().toString(36).slice(2,9)+Date.now().toString(36);

/* ── Scoring engine (same as Formularios.jsx) ── */
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

export default function FormulariosDelModulo({modulo,moduloLabel}){
  const [subTab,setSubTab]=useState("formularios");
  const [forms,setForms]=useState([]);
  const [allForms,setAllForms]=useState([]);
  const [respuestas,setRespuestas]=useState([]);
  const [envios,setEnvios]=useState([]);
  const [procesados,setProcesados]=useState([]);
  const [loading,setLoading]=useState(true);
  const [shareForm,setShareForm]=useState(null);
  const [shareClient,setShareClient]=useState({nombre:"",email:"",tel:"",codTel:"+57"});
  const [shareLinkMaxUsos,setShareLinkMaxUsos]=useState(0);
  const [shareLinkExpiry,setShareLinkExpiry]=useState("");
  const [shareResult,setShareResult]=useState(null);
  const [sending,setSending]=useState(false);
  const [expandedId,setExpandedId]=useState(null);
  const [search,setSearch]=useState("");
  const [filtroResp,setFiltroResp]=useState("todos");
  const [filtroEnvio,setFiltroEnvio]=useState("todos");

  /* ── Load forms ── */
  useEffect(()=>{
    try{const raw=store.getSync("habitaris_formularios");if(raw){const obj=JSON.parse(raw)||{};const all=obj.forms||[];setAllForms(all);setForms(all.filter(f=>f.modulo===modulo));}}catch{}
    try{const raw=store.getSync("hab:form:procesados");if(raw)setProcesados(JSON.parse(raw)||[]);}catch{}
  },[modulo]);

  useEffect(()=>{loadData();},[forms]);

  const loadData=async()=>{
    if(!SB.isConfigured()){setLoading(false);return;}
    setLoading(true);
    try{
      const fids=forms.map(f=>f.id);
      if(fids.length>0){
        const{data:rd}=await sb.from("form_responses").select("*").in("form_id",fids).order("created_at",{ascending:false});
        if(rd)setRespuestas(rd.map(r=>({...((r.data&&typeof r.data==="object")?r.data:{}),_sbId:r.id,id:r.data?.id||r.id,formularioId:r.form_id,formularioNombre:r.form_name||"",fecha:r.created_at?.split("T")[0]||"",hora:r.created_at?.split("T")[1]?.slice(0,5)||"",processed:r.processed||false,link_id:r.link_id||r.data?.linkId||null})));
        const{data:ld}=await sb.from("form_links").select("*").in("form_id",fids).order("created_at",{ascending:false});
        if(ld)setEnvios(ld.map(l=>({id:l.link_id,linkId:l.link_id,formId:l.form_id,formNombre:l.form_name||"",cliente:{nombre:l.client_name,email:l.client_email,tel:l.client_tel},fecha:l.created_at?.split("T")[0]||"",hora:l.created_at?.split("T")[1]?.slice(0,5)||"",maxUsos:l.max_uses,currentUsos:l.current_uses,blocked:!l.active,expiresAt:l.expires_at})));
      }
    }catch(e){console.warn("FormulariosDelModulo load:",e);}
    setLoading(false);
  };

  const isProcesado=(r)=>r.processed||procesados.includes(r.id);
  const markProcesado=useCallback((id,sbId)=>{const next=[...procesados,id];setProcesados(next);store.set("hab:form:procesados",JSON.stringify(next));if(sbId)SB.markProcessed(sbId).catch(()=>{});},[procesados]);
  const markPendiente=useCallback((id,sbId)=>{const next=procesados.filter(x=>x!==id);setProcesados(next);store.set("hab:form:procesados",JSON.stringify(next));if(sbId)SB.markUnprocessed(sbId).catch(()=>{});},[procesados]);

  const handleProcesar=async(r)=>{
    try{
      const result=await routeProcesar(r,allForms,markProcesado);
      if(result?.ok)alert(result.msg);else alert("Error procesando respuesta");
    }catch(err){alert("Error: "+err.message);}
  };

  const handleSend=async()=>{
    if(!shareForm||!shareClient.email)return;
    setSending(true);
    try{
      const cfg=getConfig();const appUrl=(cfg.app?.url||"").replace(/\/$/,"");const linkId=uid();
      const client={nombre:shareClient.nombre,email:shareClient.email,tel:((shareClient.codTel||"+57").replace(/[^0-9+]/g,"")+" "+shareClient.tel).trim()};
      const{error}=await sb.from("form_links").upsert({link_id:linkId,form_id:shareForm.id||"form",form_name:shareForm.nombre||"Formulario",form_def:{id:shareForm.id,nombre:shareForm.nombre,campos:shareForm.campos,config:shareForm.config},client_name:client.nombre||null,client_email:client.email||null,client_tel:client.tel||null,marca:{logo:cfg.apariencia?.logo||"",colorPrimario:cfg.apariencia?.colorPrimario||"#111",tipografia:cfg.apariencia?.tipografia||"DM Sans",empresa:cfg.empresa?.nombre||"Habitaris"},modulo,max_uses:shareLinkMaxUsos||0,current_uses:0,expires_at:shareLinkExpiry?new Date(shareLinkExpiry).toISOString():null,active:true});
      if(error)throw error;
      const publicUrl=appUrl?appUrl+"/form/"+linkId:"";
      setShareResult({linkId,url:publicUrl,client});
      SB.registerEvent(shareForm.id,linkId,"send",{client_name:client.nombre}).catch(()=>{});
      setTimeout(loadData,500);
    }catch(e){alert("Error enviando: "+e.message);}
    setSending(false);
  };

  const getStatus=(e)=>{if(e.blocked)return"bloqueado";return respuestas.some(r=>(r.link_id||r.linkId)===e.linkId||(!r.link_id&&!r.linkId&&r.clienteEmail&&r.clienteEmail===e.cliente?.email))?"respondido":"pendiente";};

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
  const envCounts=useMemo(()=>{const c={pendiente:0,respondido:0,bloqueado:0,todos:envios.length};envios.forEach(e=>{const s=getStatus(e);c[s]=(c[s]||0)+1;});return c;},[envios,respuestas]);

  const inp={padding:"7px 10px",fontSize:11,border:"1px solid "+T.border,borderRadius:4,fontFamily:"'DM Sans',sans-serif",outline:"none",background:T.bg,color:T.ink,boxSizing:"border-box"};
  const ths={padding:"6px 10px",fontSize:8,fontWeight:700,textTransform:"uppercase",letterSpacing:.5,color:T.inkMid,textAlign:"left",borderBottom:"1px solid "+T.border};
  const tds={padding:"7px 10px",fontSize:10,borderBottom:"1px solid "+T.border,color:T.ink};

  if(loading)return<div style={{padding:20,textAlign:"center",color:T.inkLight,fontSize:11}}>Cargando formularios...</div>;

  return(
    <div>
      {/* Search bar + Sub-tabs */}
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
                <div><div style={{fontSize:13,fontWeight:700}}>{f.nombre}</div><div style={{fontSize:9,color:T.inkLight,marginTop:2}}>{f.campos?.length||0} campos · {f.modulo} · Creado: {f.createdAt||"—"}</div></div>
                <Btn v="pri" on={()=>{setShareForm(f);setShareClient({nombre:"",email:"",tel:"",codTel:"+57"});setShareResult(null);setSubTab("enviar");}}><Send size={10}/> Enviar</Btn>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ═══ ENVIAR ═══ */}
      {subTab==="enviar"&&shareForm&&(
        <Card style={{padding:24}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
            <h3 style={{fontSize:14,fontWeight:700,margin:0}}>Enviar: {shareForm.nombre}</h3>
            <Btn on={()=>{setSubTab("formularios");setShareResult(null);}}>Volver</Btn>
          </div>
          {!shareResult?(
            <div style={{display:"flex",flexDirection:"column",gap:14,maxWidth:420}}>
              <div><label style={{fontSize:9,fontWeight:600,color:T.inkLight,textTransform:"uppercase",letterSpacing:1,display:"block",marginBottom:4}}>Nombre del destinatario *</label><input value={shareClient.nombre} onChange={e=>setShareClient({...shareClient,nombre:e.target.value})} style={{...inp,width:"100%"}} placeholder="Nombre completo"/></div>
              <div><label style={{fontSize:9,fontWeight:600,color:T.inkLight,textTransform:"uppercase",letterSpacing:1,display:"block",marginBottom:4}}>Email *</label><input type="email" value={shareClient.email} onChange={e=>setShareClient({...shareClient,email:e.target.value})} style={{...inp,width:"100%"}} placeholder="email@ejemplo.com"/></div>
              <div style={{display:"flex",gap:10}}>
                <div style={{width:80}}><label style={{fontSize:9,fontWeight:600,color:T.inkLight,textTransform:"uppercase",letterSpacing:1,display:"block",marginBottom:4}}>Codigo</label><input value={shareClient.codTel} onChange={e=>setShareClient({...shareClient,codTel:e.target.value})} style={{...inp,width:"100%"}}/></div>
                <div style={{flex:1}}><label style={{fontSize:9,fontWeight:600,color:T.inkLight,textTransform:"uppercase",letterSpacing:1,display:"block",marginBottom:4}}>Telefono</label><input value={shareClient.tel} onChange={e=>setShareClient({...shareClient,tel:e.target.value})} style={{...inp,width:"100%"}} placeholder="300 123 4567"/></div>
              </div>
              <div style={{display:"flex",gap:10}}>
                <div style={{flex:1}}><label style={{fontSize:9,fontWeight:600,color:T.inkLight,textTransform:"uppercase",letterSpacing:1,display:"block",marginBottom:4}}>Max usos (0 = ilimitado)</label><input type="number" value={shareLinkMaxUsos} onChange={e=>setShareLinkMaxUsos(Number(e.target.value))} style={{...inp,width:"100%"}} min={0}/></div>
                <div style={{flex:1}}><label style={{fontSize:9,fontWeight:600,color:T.inkLight,textTransform:"uppercase",letterSpacing:1,display:"block",marginBottom:4}}>Fecha caducidad</label><input type="date" value={shareLinkExpiry} onChange={e=>setShareLinkExpiry(e.target.value)} style={{...inp,width:"100%"}}/></div>
              </div>
              <button onClick={handleSend} disabled={!shareClient.email||!shareClient.nombre||sending} style={{marginTop:4,padding:"10px 20px",fontSize:12,fontWeight:700,borderRadius:4,cursor:sending?"default":"pointer",border:"none",background:(!shareClient.email||!shareClient.nombre)?"#ccc":"#111",color:"#fff",fontFamily:"'DM Sans',sans-serif",opacity:sending?.6:1}}>{sending?"Enviando...":"Generar link de envio"}</button>
            </div>
          ):(
            <div>
              <div style={{background:T.greenBg,border:"1px solid "+T.green+"33",borderRadius:6,padding:16,marginBottom:14}}>
                <p style={{fontSize:12,fontWeight:700,color:T.green,margin:0}}>✅ Link generado para {shareResult.client.nombre}</p>
              </div>
              {shareResult.url&&<div style={{display:"flex",gap:8,alignItems:"center",marginBottom:14}}>
                <input value={shareResult.url} readOnly style={{...inp,flex:1,fontSize:10}}/>
                <Btn on={()=>navigator.clipboard.writeText(shareResult.url)}><Copy size={10}/> Copiar</Btn>
              </div>}
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {shareResult.url&&<>
                  <Btn on={()=>window.open("mailto:"+shareResult.client.email+"?subject=Formulario - "+shareForm.nombre+"&body=Hola "+shareResult.client.nombre+",%0A%0APor favor completa este formulario:%0A"+shareResult.url+"%0A%0AGracias.","_blank")}><Mail size={10}/> Email</Btn>
                  <Btn on={()=>window.open("https://wa.me/"+(shareResult.client.tel||"").replace(/[^0-9]/g,"")+"?text="+encodeURIComponent("Hola "+shareResult.client.nombre+", por favor completa este formulario:\n"+shareResult.url),"_blank")}>📱 WhatsApp</Btn>
                </>}
                <Btn on={()=>{setShareResult(null);setShareClient({nombre:"",email:"",tel:"",codTel:"+57"});}}>+ Enviar otro</Btn>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ═══ ENVIADOS ═══ */}
      {subTab==="envios"&&(
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{display:"flex",gap:0}}>
              {[["todos","Todos ("+envCounts.todos+")"],["pendiente","Pendientes ("+envCounts.pendiente+")"],["respondido","Respondidos ("+envCounts.respondido+")"],["bloqueado","Bloqueados ("+envCounts.bloqueado+")"]].map(([id,lbl],i,arr)=>(
                <button key={id} onClick={()=>setFiltroEnvio(id)} style={{padding:"5px 12px",fontSize:9,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",border:"1px solid "+(filtroEnvio===id?"#111":T.border),borderLeft:i>0?"none":undefined,borderRadius:i===0?"4px 0 0 4px":i===arr.length-1?"0 4px 4px 0":"0",background:filtroEnvio===id?"#111":"#fff",color:filtroEnvio===id?"#fff":T.inkMid}}>{lbl}</button>
              ))}
            </div>
            <Btn on={loadData}><RefreshCw size={10}/> Recargar</Btn>
          </div>
          <Card style={{padding:0,overflow:"hidden"}}>
            <table style={{borderCollapse:"collapse",width:"100%"}}>
              <thead><tr style={{background:"#F0F0F0"}}>{["Fecha","Formulario","Cliente","Email","Telefono","Estado"].map(h=><th key={h} style={ths}>{h}</th>)}</tr></thead>
              <tbody>
                {envFiltered.length===0?<tr><td colSpan={6} style={{padding:24,textAlign:"center",color:T.inkLight,fontSize:11}}>Sin resultados</td></tr>
                :envFiltered.map(e=>{const s=getStatus(e);return(
                  <tr key={e.id}>
                    <td style={{...tds,fontFamily:"'DM Mono',monospace",fontSize:9}}>{e.fecha} {e.hora}</td>
                    <td style={{...tds,fontWeight:600}}>{e.formNombre}</td>
                    <td style={{...tds,fontWeight:600}}>{e.cliente?.nombre||"—"}</td>
                    <td style={{...tds,fontSize:9,color:T.blue}}>{e.cliente?.email||"—"}</td>
                    <td style={{...tds,fontSize:9}}>{e.cliente?.tel||"—"}</td>
                    <td style={tds}>{s==="bloqueado"?<Badge color={T.red}>🚫 Bloqueado</Badge>:s==="respondido"?<Badge color={T.green} bg={T.greenBg}>✅ Respondido</Badge>:<Badge color={T.amber} bg={T.amberBg}>⏳ Pendiente</Badge>}</td>
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
                  const proc=isProcesado(r);const exp=expandedId===r.id;
                  const form=allForms.find(f=>f.id===r.formularioId)||allForms.find(f=>f.nombre===r.formularioNombre);
                  const sc=calculateScore(r,form);
                  return(
                  <React.Fragment key={r._sbId||r.id}>
                    <tr style={{background:proc?T.greenBg:"",cursor:"pointer"}} onClick={()=>setExpandedId(exp?null:r.id)}>
                      <td style={{...tds,fontFamily:"'DM Mono',monospace",fontSize:9}}>{r.fecha} {r.hora}</td>
                      <td style={{...tds,fontWeight:600}}>{r.formularioNombre}</td>
                      <td style={{...tds,fontWeight:600}}>{r.clienteNombre||r["Nombre completo"]||"—"}</td>
                      <td style={{...tds,fontSize:9,color:T.blue}}>{r.clienteEmail||"—"}</td>
                      <td style={tds}>{sc?<span style={{fontFamily:"'DM Mono',monospace",fontWeight:800,fontSize:11,color:sc.level==="green"?T.green:sc.level==="yellow"?T.amber:T.red}}>{sc.score.toFixed(1)}</span>:"—"}</td>
                      <td style={tds}>{proc?<Badge color={T.green} bg={T.greenBg}>✅ Procesado</Badge>:<Badge color={T.amber} bg={T.amberBg}>⏳ Pendiente</Badge>}</td>
                      <td style={tds}>
                        <div style={{display:"flex",gap:4,alignItems:"center"}}>
                          {exp?<ChevronUp size={12} color={T.blue}/>:<ChevronDown size={12} color={T.blue}/>}
                          {!proc&&<Btn v="pri" on={e=>{e.stopPropagation();handleProcesar(r);}} style={{fontSize:8}}>⚡ Procesar</Btn>}
                          {proc&&<Btn on={e=>{e.stopPropagation();markPendiente(r.id,r._sbId);}} style={{fontSize:8}}>↩ Revertir</Btn>}
                        </div>
                      </td>
                    </tr>
                    {exp&&<tr><td colSpan={7} style={{padding:0,borderBottom:"2px solid "+T.blue+"33"}}>
                      <div style={{padding:"16px 18px",background:"#FAFAFE"}}>
                        {/* Scoring card */}
                        {sc&&(()=>{
                          const colors={green:{bg:"#E8F4EE",border:"#111",text:"#111"},yellow:{bg:"#FAF0E0",border:"#8C6A00",text:"#8C6A00"},red:{bg:"#FAE8E8",border:"#B91C1C",text:"#B91C1C"}};
                          const col=colors[sc.level];
                          return(
                            <div style={{marginBottom:14,border:"1px solid "+col.border+"33",borderRadius:6,overflow:"hidden"}}>
                              <div style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:col.bg}}>
                                <div style={{fontSize:22,fontWeight:800,fontFamily:"'DM Mono',monospace",color:col.text}}>{sc.score.toFixed(1)}<span style={{fontSize:10}}>/10</span></div>
                                <div style={{flex:1}}><div style={{fontSize:11,fontWeight:700,color:col.text}}>{sc.levelLabel}</div><div style={{fontSize:8,color:col.text,opacity:.8}}>{sc.conclusion}</div></div>
                                <div style={{display:"flex",gap:6}}>
                                  {[["🟢",sc.greens,T.green],["🟡",sc.yellows,T.amber],["🔴",sc.reds,T.red]].map(([ic,n,c])=><div key={ic} style={{textAlign:"center"}}><div style={{fontSize:12,fontWeight:800,color:c}}>{n}</div><div style={{fontSize:7}}>{ic}</div></div>)}
                                </div>
                              </div>
                              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:4,padding:"8px 14px",background:"#fff"}}>
                                {sc.details.map((d,i)=>{const fc=d.flag==="green"?T.green:d.flag==="red"?T.red:T.amber;const ic=d.flag==="green"?"🟢":d.flag==="red"?"🔴":"🟡";
                                  return<div key={i} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 8px",background:T.bg,borderRadius:4,fontSize:9}}>
                                    <span>{ic}</span><span style={{fontWeight:600,flex:1}}>{d.label}</span><span style={{color:T.inkMid}}>{d.value}</span><span style={{fontWeight:700,color:fc,fontFamily:"'DM Mono',monospace"}}>{d.points}/{d.maxPoints}</span>
                                  </div>;
                                })}
                              </div>
                            </div>
                          );
                        })()}
                        {/* Client card */}
                        {(r.clienteNombre||r.clienteEmail)&&(
                          <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:T.blueBg,borderRadius:6,border:"1px solid "+T.blue+"22",marginBottom:12}}>
                            <div style={{width:32,height:32,borderRadius:"50%",background:T.blue,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700}}>{(r.clienteNombre||r.clienteEmail||"?")[0].toUpperCase()}</div>
                            <div><div style={{fontSize:11,fontWeight:700}}>{r.clienteNombre||"—"}</div><div style={{fontSize:9,color:T.blue}}>{r.clienteEmail||""} {r.clienteTel?" · "+r.clienteTel:""}</div></div>
                          </div>
                        )}
                        {/* All fields */}
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                          {Object.entries(r).filter(([k])=>!["_sbId","id","processed","link_id","formularioId","formularioNombre","fecha","hora","linkId","clienteNombre","clienteEmail","clienteTel"].includes(k)&&!k.startsWith("_")).map(([k,v])=>(
                            <div key={k} style={{padding:"4px 8px",background:"#fff",borderRadius:4,border:"1px solid "+T.border}}>
                              <div style={{fontSize:7,fontWeight:700,color:"#888",textTransform:"uppercase"}}>{k}</div>
                              <div style={{fontSize:10,fontWeight:600,marginTop:1}}>{Array.isArray(v)?v.join(", "):String(v||"—")}</div>
                            </div>
                          ))}
                        </div>
                        {/* Action buttons */}
                        <div style={{marginTop:12,display:"flex",gap:6}}>
                          {!proc&&<Btn v="pri" on={()=>handleProcesar(r)}>⚡ Procesar a {moduloLabel}</Btn>}
                          {proc&&<Badge color={T.green} bg={T.greenBg}>✅ Ya procesado</Badge>}
                        </div>
                      </div>
                    </td></tr>}
                  </React.Fragment>
                );})}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </div>
  );
}
