import React, { useState, useEffect, useMemo, useCallback } from "react";
import { store } from "../../core/store.js";
import { sb } from "../../core/supabase.js";
import * as SB from "../supabase.js";
import { procesarRespuesta as routeProcesar } from "./FormProcessor.js";
import { getConfig } from "../Configuracion.jsx";
import { Send, ChevronDown, ChevronUp, Copy, Mail } from "lucide-react";

const T = { ink:"#111", inkMid:"#555", inkLight:"#999", blue:"#2563EB", green:"#16a34a", greenBg:"#ECFDF5", red:"#DC2626", border:"#E8E8E8" };
const uid = () => Math.random().toString(36).slice(2,9) + Date.now().toString(36);

const Card = ({children,style}) => <div style={{background:"#fff",border:"1px solid "+T.border,borderRadius:6,...style}}>{children}</div>;
const Badge = ({color,bg,children}) => <span style={{fontSize:8,fontWeight:700,padding:"2px 8px",borderRadius:10,background:bg||(color+"15"),color}}>{children}</span>;
const Btn = ({v,on,children,disabled,style}) => <button onClick={on} disabled={disabled} style={{padding:"4px 12px",fontSize:9,fontWeight:600,borderRadius:3,cursor:disabled?"default":"pointer",border:v==="pri"?"none":"1px solid "+T.border,background:v==="pri"?"#111":"#fff",color:v==="pri"?"#fff":T.inkMid,opacity:disabled?.4:1,fontFamily:"'DM Sans',sans-serif",...style}}>{children}</button>;

export default function FormulariosDelModulo({ modulo, moduloLabel }) {
  const [subTab, setSubTab] = useState("formularios");
  const [forms, setForms] = useState([]);
  const [respuestas, setRespuestas] = useState([]);
  const [envios, setEnvios] = useState([]);
  const [procesados, setProcesados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shareForm, setShareForm] = useState(null);
  const [shareClient, setShareClient] = useState({nombre:"",email:"",tel:"",codTel:"+57"});
  const [shareLinkMaxUsos, setShareLinkMaxUsos] = useState(0);
  const [shareLinkExpiry, setShareLinkExpiry] = useState("");
  const [shareResult, setShareResult] = useState(null);
  const [sending, setSending] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    try { const raw = store.getSync("habitaris_formularios"); if(raw) { const obj = JSON.parse(raw)||{}; const all = obj.forms||[]; setForms(all.filter(f=>f.modulo===modulo)); } } catch{}
    try { const raw = store.getSync("hab:form:procesados"); if(raw) setProcesados(JSON.parse(raw)||[]); } catch{}
  }, [modulo]);

  useEffect(() => { loadData(); }, [forms]);

  const loadData = async () => {
    if(!SB.isConfigured()){setLoading(false);return;}
    setLoading(true);
    try {
      const fids = forms.map(f=>f.id);
      if(fids.length>0){
        const {data:rd} = await sb.from("form_responses").select("*").in("form_id",fids).order("created_at",{ascending:false});
        if(rd) setRespuestas(rd.map(r=>({...((r.data&&typeof r.data==="object")?r.data:{}),_sbId:r.id,id:r.data?.id||r.id,formularioId:r.form_id,formularioNombre:r.form_name||"",fecha:r.created_at?.split("T")[0]||"",hora:r.created_at?.split("T")[1]?.slice(0,5)||"",processed:r.processed||false,link_id:r.link_id||r.data?.linkId||null})));
        const {data:ld} = await sb.from("form_links").select("*").in("form_id",fids).order("created_at",{ascending:false});
        if(ld) setEnvios(ld.map(l=>({id:l.link_id,linkId:l.link_id,formId:l.form_id,formNombre:l.form_name||"",cliente:{nombre:l.client_name,email:l.client_email,tel:l.client_tel},fecha:l.created_at?.split("T")[0]||"",hora:l.created_at?.split("T")[1]?.slice(0,5)||"",maxUsos:l.max_uses,currentUsos:l.current_uses,blocked:!l.active,expiresAt:l.expires_at})));
      }
    } catch(e){console.warn("FormulariosDelModulo load error:",e);}
    setLoading(false);
  };

  const isProcesado = (r) => r.processed || procesados.includes(r.id);
  const markProcesado = useCallback((id,sbId)=>{const next=[...procesados,id];setProcesados(next);store.set("hab:form:procesados",JSON.stringify(next));if(sbId)SB.markProcessed(sbId).catch(()=>{});},[procesados]);
  const markPendiente = useCallback((id,sbId)=>{const next=procesados.filter(x=>x!==id);setProcesados(next);store.set("hab:form:procesados",JSON.stringify(next));if(sbId)SB.markUnprocessed(sbId).catch(()=>{});},[procesados]);

  const handleProcesar = async (r) => {
    try {
      let allForms=[]; try{const raw=store.getSync("habitaris_formularios");if(raw){const obj=JSON.parse(raw)||{};allForms=obj.forms||[];}}catch{}
      const result = await routeProcesar(r, allForms, markProcesado);
      if(result?.ok) alert(result.msg); else alert("Error procesando respuesta");
    } catch(err){alert("Error: "+err.message);}
  };

  const handleSend = async () => {
    if(!shareForm||!shareClient.email)return;
    setSending(true);
    try {
      const cfg=getConfig();const appUrl=(cfg.app?.url||"").replace(/\/$/,"");const linkId=uid();
      const client={nombre:shareClient.nombre,email:shareClient.email,tel:((shareClient.codTel||"+57").replace(/[^0-9+]/g,"")+" "+shareClient.tel).trim()};
      const {error}=await sb.from("form_links").upsert({link_id:linkId,form_id:shareForm.id||"form",form_name:shareForm.nombre||"Formulario",form_def:{id:shareForm.id,nombre:shareForm.nombre,campos:shareForm.campos,config:shareForm.config},client_name:client.nombre||null,client_email:client.email||null,client_tel:client.tel||null,marca:{logo:cfg.apariencia?.logo||"",colorPrimario:cfg.apariencia?.colorPrimario||"#111",tipografia:cfg.apariencia?.tipografia||"DM Sans",empresa:cfg.empresa?.nombre||"Habitaris"},modulo,max_uses:shareLinkMaxUsos||0,current_uses:0,expires_at:shareLinkExpiry?new Date(shareLinkExpiry).toISOString():null,active:true});
      if(error)throw error;
      const publicUrl=appUrl?appUrl+"/form/"+linkId:"";
      setShareResult({linkId,url:publicUrl,client});
      SB.registerEvent(shareForm.id,linkId,"send",{client_name:client.nombre}).catch(()=>{});
      setTimeout(loadData,500);
    } catch(e){alert("Error enviando: "+e.message);}
    setSending(false);
  };

  const getStatus = (e) => {
    if(e.blocked)return"bloqueado";
    return respuestas.some(r=>(r.link_id||r.linkId)===e.linkId||(!r.link_id&&!r.linkId&&r.clienteEmail&&r.clienteEmail===e.cliente?.email))?"respondido":"pendiente";
  };

  const respPendientes = respuestas.filter(r=>!isProcesado(r));
  const respProcesadas = respuestas.filter(r=>isProcesado(r));
  const inp = {padding:"6px 10px",fontSize:11,border:"1px solid "+T.border,borderRadius:4,fontFamily:"'DM Sans',sans-serif",outline:"none"};
  const ths = {padding:"6px 10px",fontSize:8,fontWeight:700,textTransform:"uppercase",letterSpacing:.5,color:T.inkMid,textAlign:"left",borderBottom:"1px solid "+T.border};
  const tds = {padding:"7px 10px",fontSize:10,borderBottom:"1px solid "+T.border,color:T.ink};

  if(loading) return <div style={{padding:20,textAlign:"center",color:T.inkLight,fontSize:11}}>Cargando formularios...</div>;

  return (
    <div>
      <div style={{display:"flex",gap:0,marginBottom:16}}>
        {[{id:"formularios",lbl:"📋 Formularios ("+forms.length+")"},{id:"envios",lbl:"📤 Enviados ("+envios.length+")"},{id:"respuestas",lbl:"📥 Respuestas ("+respuestas.length+")"}].map((t,i,arr)=>(
          <button key={t.id} onClick={()=>setSubTab(t.id)} style={{padding:"7px 16px",fontSize:10,fontWeight:subTab===t.id?700:500,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",border:"1px solid "+(subTab===t.id?"#111":T.border),borderLeft:i>0?"none":undefined,borderRadius:i===0?"5px 0 0 5px":i===arr.length-1?"0 5px 5px 0":"0",background:subTab===t.id?"#111":"#fff",color:subTab===t.id?"#fff":T.inkMid}}>{t.lbl}</button>
        ))}
      </div>

      {subTab==="formularios" && (
        <div>
          {forms.length===0 ? (
            <Card style={{padding:24,textAlign:"center"}}>
              <p style={{fontSize:11,color:T.inkLight,margin:0}}>No hay formularios asignados a {moduloLabel}.</p>
              <p style={{fontSize:9,color:T.inkLight,marginTop:4}}>Solicita al administrador que cree uno desde el modulo Formularios.</p>
            </Card>
          ) : forms.map(f=>(
            <Card key={f.id} style={{padding:"14px 18px",marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:13,fontWeight:700}}>{f.nombre}</div>
                  <div style={{fontSize:9,color:T.inkLight,marginTop:2}}>{f.campos?.length||0} campos · Creado: {f.createdAt||"—"}</div>
                </div>
                <Btn v="pri" on={()=>{setShareForm(f);setShareClient({nombre:"",email:"",tel:"",codTel:"+57"});setShareResult(null);setSubTab("enviar");}}>
                  <Send size={10}/> Enviar
                </Btn>
              </div>
            </Card>
          ))}
        </div>
      )}

      {subTab==="enviar" && shareForm && (
        <Card style={{padding:20}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <h3 style={{fontSize:13,fontWeight:700,margin:0}}>Enviar: {shareForm.nombre}</h3>
            <Btn on={()=>{setSubTab("formularios");setShareResult(null);}}>Volver</Btn>
          </div>
          {!shareResult ? (
            <div style={{display:"flex",flexDirection:"column",gap:10,maxWidth:400}}>
              <div><label style={{fontSize:9,fontWeight:600,color:T.inkMid}}>Nombre *</label><input value={shareClient.nombre} onChange={e=>setShareClient({...shareClient,nombre:e.target.value})} style={{...inp,width:"100%",marginTop:4}} placeholder="Nombre completo"/></div>
              <div><label style={{fontSize:9,fontWeight:600,color:T.inkMid}}>Email *</label><input type="email" value={shareClient.email} onChange={e=>setShareClient({...shareClient,email:e.target.value})} style={{...inp,width:"100%",marginTop:4}} placeholder="email@ejemplo.com"/></div>
              <div style={{display:"flex",gap:8}}>
                <div style={{width:70}}><label style={{fontSize:9,fontWeight:600,color:T.inkMid}}>Codigo</label><input value={shareClient.codTel} onChange={e=>setShareClient({...shareClient,codTel:e.target.value})} style={{...inp,width:"100%",marginTop:4}}/></div>
                <div style={{flex:1}}><label style={{fontSize:9,fontWeight:600,color:T.inkMid}}>Telefono</label><input value={shareClient.tel} onChange={e=>setShareClient({...shareClient,tel:e.target.value})} style={{...inp,width:"100%",marginTop:4}} placeholder="300 123 4567"/></div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <div style={{flex:1}}><label style={{fontSize:9,fontWeight:600,color:T.inkMid}}>Max usos (0=ilimitado)</label><input type="number" value={shareLinkMaxUsos} onChange={e=>setShareLinkMaxUsos(Number(e.target.value))} style={{...inp,width:"100%",marginTop:4}} min={0}/></div>
                <div style={{flex:1}}><label style={{fontSize:9,fontWeight:600,color:T.inkMid}}>Caducidad</label><input type="date" value={shareLinkExpiry} onChange={e=>setShareLinkExpiry(e.target.value)} style={{...inp,width:"100%",marginTop:4}}/></div>
              </div>
              <Btn v="pri" on={handleSend} disabled={!shareClient.email||!shareClient.nombre||sending} style={{marginTop:8,padding:"8px 20px",fontSize:11}}>{sending?"Enviando...":"Generar link de envio"}</Btn>
            </div>
          ) : (
            <div>
              <div style={{background:T.greenBg,border:"1px solid "+T.green+"33",borderRadius:6,padding:16,marginBottom:12}}>
                <p style={{fontSize:11,fontWeight:700,color:T.green,margin:0}}>Link generado para {shareResult.client.nombre}</p>
              </div>
              {shareResult.url && <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:12}}>
                <input value={shareResult.url} readOnly style={{...inp,flex:1,fontSize:10,background:"#F8F8F8"}}/>
                <Btn on={()=>navigator.clipboard.writeText(shareResult.url)}><Copy size={10}/> Copiar</Btn>
              </div>}
              <div style={{display:"flex",gap:8}}>
                {shareResult.url && <>
                  <Btn on={()=>window.open("mailto:"+shareResult.client.email+"?subject=Formulario - "+shareForm.nombre+"&body=Hola "+shareResult.client.nombre+",%0A%0APor favor completa este formulario:%0A"+shareResult.url+"%0A%0AGracias.","_blank")}><Mail size={10}/> Email</Btn>
                  <Btn on={()=>window.open("https://wa.me/"+(shareResult.client.tel||"").replace(/[^0-9]/g,"")+"?text="+encodeURIComponent("Hola "+shareResult.client.nombre+", por favor completa este formulario:\n"+shareResult.url),"_blank")}>WhatsApp</Btn>
                </>}
                <Btn on={()=>{setShareResult(null);setShareClient({nombre:"",email:"",tel:"",codTel:"+57"});}}>+ Enviar otro</Btn>
              </div>
            </div>
          )}
        </Card>
      )}

      {subTab==="envios" && (
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <h3 style={{fontSize:13,fontWeight:700,margin:0}}>Enviados — {envios.length}</h3>
            <Btn on={loadData}>Recargar</Btn>
          </div>
          <Card style={{padding:0,overflow:"hidden"}}>
            <table style={{borderCollapse:"collapse",width:"100%"}}>
              <thead><tr style={{background:"#F0F0F0"}}>{["Fecha","Formulario","Cliente","Email","Estado"].map(h=><th key={h} style={ths}>{h}</th>)}</tr></thead>
              <tbody>
                {envios.length===0?<tr><td colSpan={5} style={{padding:24,textAlign:"center",color:T.inkLight,fontSize:11}}>No hay envios</td></tr>
                :envios.map(e=>{const s=getStatus(e);return(
                  <tr key={e.id}>
                    <td style={{...tds,fontFamily:"'DM Mono',monospace",fontSize:9}}>{e.fecha} {e.hora}</td>
                    <td style={{...tds,fontWeight:600}}>{e.formNombre}</td>
                    <td style={{...tds,fontWeight:600}}>{e.cliente?.nombre||"—"}</td>
                    <td style={{...tds,fontSize:9,color:T.blue}}>{e.cliente?.email||"—"}</td>
                    <td style={tds}>{s==="bloqueado"?<Badge color={T.red}>Bloqueado</Badge>:s==="respondido"?<Badge color={T.green} bg={T.greenBg}>Respondido</Badge>:<Badge color="#D97706" bg="#FFFBEB">Pendiente</Badge>}</td>
                  </tr>
                );})}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {subTab==="respuestas" && (
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <h3 style={{fontSize:13,fontWeight:700,margin:0}}>Respuestas — {respPendientes.length} pendientes, {respProcesadas.length} procesadas</h3>
            <Btn on={loadData}>Recargar</Btn>
          </div>
          <Card style={{padding:0,overflow:"hidden"}}>
            <table style={{borderCollapse:"collapse",width:"100%"}}>
              <thead><tr style={{background:"#F0F0F0"}}>{["Fecha","Formulario","Cliente","Email","Estado","Acciones"].map(h=><th key={h} style={ths}>{h}</th>)}</tr></thead>
              <tbody>
                {respuestas.length===0?<tr><td colSpan={6} style={{padding:24,textAlign:"center",color:T.inkLight,fontSize:11}}>No hay respuestas</td></tr>
                :respuestas.map(r=>{const proc=isProcesado(r);const exp=expandedId===r.id;return(
                  <React.Fragment key={r._sbId||r.id}>
                    <tr style={{background:proc?T.greenBg:""}}>
                      <td style={{...tds,fontFamily:"'DM Mono',monospace",fontSize:9}}>{r.fecha} {r.hora}</td>
                      <td style={{...tds,fontWeight:600}}>{r.formularioNombre}</td>
                      <td style={{...tds,fontWeight:600}}>{r.clienteNombre||r["Nombre completo"]||"—"}</td>
                      <td style={{...tds,fontSize:9,color:T.blue}}>{r.clienteEmail||r["Email"]||"—"}</td>
                      <td style={tds}>{proc?<Badge color={T.green} bg={T.greenBg}>Procesado</Badge>:<Badge color="#D97706" bg="#FFFBEB">Pendiente</Badge>}</td>
                      <td style={tds}>
                        <div style={{display:"flex",gap:4,alignItems:"center"}}>
                          <button onClick={()=>setExpandedId(exp?null:r.id)} style={{background:"none",border:"none",cursor:"pointer",padding:2}}>{exp?<ChevronUp size={12} color={T.blue}/>:<ChevronDown size={12} color={T.blue}/>}</button>
                          {!proc&&<Btn v="pri" on={()=>handleProcesar(r)} style={{fontSize:8}}>Procesar</Btn>}
                          {proc&&<Btn on={()=>markPendiente(r.id,r._sbId)} style={{fontSize:8}}>Revertir</Btn>}
                        </div>
                      </td>
                    </tr>
                    {exp&&<tr><td colSpan={6} style={{padding:0,borderBottom:"2px solid "+T.blue+"33"}}>
                      <div style={{padding:"14px 16px",background:"#F8F7FF"}}>
                        <h4 style={{fontSize:11,fontWeight:700,margin:"0 0 10px 0"}}>Detalle de respuesta</h4>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                          {Object.entries(r).filter(([k])=>!["_sbId","id","processed","link_id","formularioId","formularioNombre","fecha","hora","linkId"].includes(k)&&!k.startsWith("_")).map(([k,v])=>(
                            <div key={k} style={{fontSize:10}}><span style={{fontWeight:600,color:T.inkMid}}>{k}: </span><span>{Array.isArray(v)?v.join(", "):String(v||"—")}</span></div>
                          ))}
                        </div>
                        <div style={{marginTop:10,display:"flex",gap:6}}>
                          {!proc&&<Btn v="pri" on={()=>handleProcesar(r)}>Procesar a {moduloLabel}</Btn>}
                          {proc&&<Badge color={T.green} bg={T.greenBg}>Ya procesado</Badge>}
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
