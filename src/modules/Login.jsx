import React, { useState, useEffect } from "react";
import { Mail, Lock, Eye, EyeOff, Shield, UserPlus, Trash2, Send, Check, X, Copy } from "lucide-react";

/* Supabase config (public anon key) */
const SUPA_URL = "https://xlzkasdskatnikuavefh.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhsemthc2Rza2F0bmlrdWF2ZWZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4OTE3NzQsImV4cCI6MjA4NzQ2Nzc3NH0.SR9tIpvL0YnV9CNrRq4T-xetifuNQOJZE0OnQpwtYLM";
const SESSION_KEY = "hab:session";

const supa = {
  h: {"apikey":SUPA_KEY,"Authorization":`Bearer ${SUPA_KEY}`,"Content-Type":"application/json","Prefer":"return=representation"},
  async q(t,p=""){try{const r=await fetch(`${SUPA_URL}/rest/v1/${t}?${p}`,{headers:this.h});return r.ok?await r.json():null}catch{return null}},
  async i(t,d){try{const r=await fetch(`${SUPA_URL}/rest/v1/${t}`,{method:"POST",headers:this.h,body:JSON.stringify(d)});return r.ok?await r.json():null}catch{return null}},
  async u(t,m,d){try{const r=await fetch(`${SUPA_URL}/rest/v1/${t}?${m}`,{method:"PATCH",headers:this.h,body:JSON.stringify(d)});return r.ok?await r.json():null}catch{return null}},
  async d(t,m){try{const r=await fetch(`${SUPA_URL}/rest/v1/${t}?${m}`,{method:"DELETE",headers:this.h});return r.ok}catch{return false}},
};

const T={ink:"#111",inkMid:"#444",inkLight:"#888",bg:"#F0EEE9",surface:"#FAFAF8",border:"#E4E1DB",green:"#1E6B42",greenBg:"#E8F4EE",blue:"#1E4F8C",blueBg:"#E6EFF9",amber:"#7A5218",amberBg:"#FFF4E0",red:"#AE2C2C",redBg:"#FAE8E8",gold:"#C9A84C",shadow:"0 1px 4px rgba(0,0,0,.06)"};

async function hashPw(pw){const d=new TextEncoder().encode(pw+"_hab_2026");const h=await crypto.subtle.digest("SHA-256",d);return Array.from(new Uint8Array(h)).map(b=>b.toString(16).padStart(2,"0")).join("")}
function genToken(){return Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b=>b.toString(36)).join("").substring(0,24)}

const ROLES={superadmin:{label:"Super Admin",color:T.gold},admin:{label:"Administrador",color:T.blue},gerente:{label:"Gerente",color:T.green},disenador:{label:"Diseñador",color:"#5B3A8C"},ingeniero:{label:"Ingeniero",color:"#0D5E6E"},comercial:{label:"Comercial",color:T.amber},contable:{label:"Contable",color:T.red},auxiliar:{label:"Auxiliar",color:T.inkLight}};

function getSession(){try{const r=localStorage.getItem(SESSION_KEY);if(!r)return null;const s=JSON.parse(r);if(Date.now()-s.ts>24*60*60*1000){localStorage.removeItem(SESSION_KEY);return null}return s}catch{return null}}
function setSession(u){localStorage.setItem(SESSION_KEY,JSON.stringify({id:u.id,email:u.email,nombre:u.nombre,rol:u.rol,ts:Date.now()}))}

export function isLoggedIn(){return !!getSession()}
export function login(){return true}
export function logout(){localStorage.removeItem(SESSION_KEY)}
export function isAuthConfigured(){return true}
export function getCurrentUser(){return getSession()}

async function sendInviteEmail(nombre,email,token){
  try{
    const cfg=JSON.parse(localStorage.getItem("habitaris_config")||"{}");
    const sId=cfg.correo?.emailjs_serviceId||"service_6x3478l";
    const tId=cfg.correo?.emailjs_templateId||"template_lzgrxc6";
    const pKey=cfg.correo?.emailjs_publicKey||"64nk2FHknwpLqc1p4";
    const emp=cfg.empresa?.nombre||"Habitaris";
    const url=`${window.location.origin}?invite=${token}`;
    const res=await fetch("https://api.emailjs.com/api/v1.0/email/send",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({service_id:sId,template_id:tId,user_id:pKey,template_params:{client_name:nombre,client_email:email,form_name:`Invitación a ${emp} Suite`,from_name:emp,form_link:url}})});
    return res.ok;
  }catch{return false}
}

export default function LoginScreen({onSuccess}){
  const[mode,setMode]=useState("login");
  const[email,setEmail]=useState("");
  const[pw,setPw]=useState("");
  const[pw2,setPw2]=useState("");
  const[showPw,setShowPw]=useState(false);
  const[err,setErr]=useState("");
  const[load,setLoad]=useState(true);
  const[invUser,setInvUser]=useState(null);
  const[invToken,setInvToken]=useState(null);

  useEffect(()=>{init()},[]);

  async function init(){
    setLoad(true);
    const p=new URLSearchParams(window.location.search);
    const tk=p.get("invite");
    if(tk){
      const u=await supa.q("users",`invite_token=eq.${tk}&estado=eq.pendiente&limit=1`);
      if(u&&u.length>0){setInvUser(u[0]);setInvToken(tk);setEmail(u[0].email);setMode("invite");setLoad(false);return}
    }
    const a=await supa.q("users","email=eq.dparra@habitaris.co&limit=1");
    if(a&&a.length>0&&!a[0].password_hash){setMode("setup");setEmail("dparra@habitaris.co");setLoad(false);return}
    setMode("login");setLoad(false);
  }

  async function doLogin(){
    setErr("");if(!email||!pw){setErr("Ingresa email y contraseña");return}setLoad(true);
    const u=await supa.q("users",`email=eq.${email.toLowerCase().trim()}&limit=1`);
    if(!u||u.length===0){setErr("Usuario no encontrado");setLoad(false);return}
    const user=u[0];
    if(user.estado==="inactivo"){setErr("Cuenta desactivada. Contacta al administrador.");setLoad(false);return}
    if(!user.password_hash){setErr("Configura tu contraseña desde el enlace de invitación.");setLoad(false);return}
    const h=await hashPw(pw);
    if(h!==user.password_hash){setErr("Contraseña incorrecta");setLoad(false);return}
    await supa.u("users",`id=eq.${user.id}`,{ultimo_login:new Date().toISOString()});
    setSession(user);setLoad(false);onSuccess();
  }

  async function doSetup(){
    setErr("");if(!pw||pw.length<6){setErr("Mínimo 6 caracteres");return}if(pw!==pw2){setErr("No coinciden");return}setLoad(true);
    const h=await hashPw(pw);
    const a=await supa.q("users","email=eq.dparra@habitaris.co&limit=1");
    if(a&&a.length>0){
      await supa.u("users",`id=eq.${a[0].id}`,{password_hash:h,estado:"activo",ultimo_login:new Date().toISOString()});
      setSession({...a[0],estado:"activo"});window.history.replaceState({},"",window.location.pathname);setLoad(false);onSuccess();
    }else{setErr("Error");setLoad(false)}
  }

  async function doInvite(){
    setErr("");if(!pw||pw.length<6){setErr("Mínimo 6 caracteres");return}if(pw!==pw2){setErr("No coinciden");return}setLoad(true);
    const h=await hashPw(pw);
    await supa.u("users",`id=eq.${invUser.id}`,{password_hash:h,estado:"activo",invite_token:null,ultimo_login:new Date().toISOString()});
    setSession({...invUser,estado:"activo"});window.history.replaceState({},"",window.location.pathname);setLoad(false);onSuccess();
  }

  const brand=(()=>{try{return JSON.parse(localStorage.getItem("habitaris_config")||"{}").empresa?.nombre||"Habitaris"}catch{return"Habitaris"}})();
  const inp={width:"100%",padding:"10px 12px 10px 34px",border:`1px solid ${T.border}`,borderRadius:8,fontSize:13,fontFamily:"'Outfit',sans-serif",background:"#FAFAF8"};
  const inpN={...inp,paddingLeft:12};

  if(load&&mode==="login")return(<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(135deg,#F8F7F4,#EDEBE7)",fontFamily:"'Outfit',sans-serif"}}><style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');`}</style><div style={{color:T.inkLight,fontSize:14}}>Cargando...</div></div>);

  return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(135deg,#F8F7F4,#EDEBE7)",fontFamily:"'Outfit',sans-serif",padding:20}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');.li:focus{outline:none;border-color:${T.green}!important;box-shadow:0 0 0 3px ${T.green}18}`}</style>
      <div style={{width:"100%",maxWidth:400,background:"#fff",borderRadius:16,boxShadow:"0 4px 24px rgba(0,0,0,.08)",padding:"36px 32px"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{width:52,height:52,borderRadius:14,background:T.ink,display:"inline-flex",alignItems:"center",justifyContent:"center",marginBottom:14,boxShadow:"0 4px 12px rgba(0,0,0,.15)"}}><Shield size={26} color="#fff"/></div>
          <h1 style={{margin:0,fontSize:20,fontWeight:700,color:T.ink}}>{brand} <span style={{fontWeight:300,color:T.inkLight}}>Suite</span></h1>
          <p style={{margin:"4px 0 0",fontSize:11,color:T.inkLight}}>
            {mode==="setup"?"Configura tu acceso de administrador":mode==="invite"?`Bienvenid@, ${invUser?.nombre}. Configura tu contraseña`:"Acceso exclusivo para usuarios autorizados"}
          </p>
        </div>

        {err&&<div style={{background:T.redBg,border:`1px solid ${T.red}33`,borderRadius:8,padding:"8px 12px",marginBottom:14,fontSize:11,color:T.red,display:"flex",alignItems:"center",gap:6}}><X size={13}/>{err}</div>}

        {mode==="login"&&<>
          <div style={{marginBottom:12}}><label style={{fontSize:9,fontWeight:700,color:T.inkMid,textTransform:"uppercase",letterSpacing:.5,display:"block",marginBottom:4}}>Email</label><div style={{position:"relative"}}><Mail size={14} color={T.inkLight} style={{position:"absolute",left:10,top:11}}/><input className="li" value={email} onChange={e=>setEmail(e.target.value)} placeholder="tu@email.com" type="email" onKeyDown={e=>e.key==="Enter"&&doLogin()} style={inp}/></div></div>
          <div style={{marginBottom:18}}><label style={{fontSize:9,fontWeight:700,color:T.inkMid,textTransform:"uppercase",letterSpacing:.5,display:"block",marginBottom:4}}>Contraseña</label><div style={{position:"relative"}}><Lock size={14} color={T.inkLight} style={{position:"absolute",left:10,top:11}}/><input className="li" value={pw} onChange={e=>setPw(e.target.value)} placeholder="••••••••" type={showPw?"text":"password"} onKeyDown={e=>e.key==="Enter"&&doLogin()} style={inp}/><button onClick={()=>setShowPw(!showPw)} style={{position:"absolute",right:8,top:8,border:"none",background:"none",cursor:"pointer"}}>{showPw?<EyeOff size={15} color={T.inkLight}/>:<Eye size={15} color={T.inkLight}/>}</button></div></div>
          <button onClick={doLogin} disabled={load} style={{width:"100%",padding:"11px",borderRadius:8,border:"none",background:T.ink,color:"#fff",fontSize:13,fontWeight:600,fontFamily:"'Outfit',sans-serif",cursor:"pointer",opacity:load?.6:1}}>{load?"Verificando...":"Iniciar sesión"}</button>
          <p style={{textAlign:"center",marginTop:18,fontSize:10,color:T.inkLight}}>¿No tienes cuenta? Solicita acceso al administrador</p>
        </>}

        {mode==="setup"&&<>
          <div style={{background:T.amberBg,border:`1px solid ${T.amber}33`,borderRadius:8,padding:"10px 12px",marginBottom:14,fontSize:10,color:T.amber}}><strong>🔐 Primera vez:</strong> Contraseña para Super Admin (dparra@habitaris.co)</div>
          <div style={{marginBottom:12}}><label style={{fontSize:9,fontWeight:700,color:T.inkMid,textTransform:"uppercase",display:"block",marginBottom:4}}>Email</label><input value="dparra@habitaris.co" disabled style={{...inpN,background:"#f0f0f0",color:T.inkMid}}/></div>
          <div style={{marginBottom:12}}><label style={{fontSize:9,fontWeight:700,color:T.inkMid,textTransform:"uppercase",display:"block",marginBottom:4}}>Nueva contraseña</label><input className="li" value={pw} onChange={e=>setPw(e.target.value)} placeholder="Mínimo 6 caracteres" type={showPw?"text":"password"} style={inpN}/></div>
          <div style={{marginBottom:14}}><label style={{fontSize:9,fontWeight:700,color:T.inkMid,textTransform:"uppercase",display:"block",marginBottom:4}}>Confirmar</label><input className="li" value={pw2} onChange={e=>setPw2(e.target.value)} placeholder="Repite la contraseña" type={showPw?"text":"password"} onKeyDown={e=>e.key==="Enter"&&doSetup()} style={inpN}/></div>
          <label style={{display:"flex",alignItems:"center",gap:6,marginBottom:14,fontSize:10,color:T.inkMid,cursor:"pointer"}}><input type="checkbox" checked={showPw} onChange={()=>setShowPw(!showPw)}/> Mostrar</label>
          <button onClick={doSetup} disabled={load} style={{width:"100%",padding:"11px",borderRadius:8,border:"none",background:T.green,color:"#fff",fontSize:13,fontWeight:600,fontFamily:"'Outfit',sans-serif",cursor:"pointer",opacity:load?.6:1}}>{load?"Configurando...":"🔐 Crear mi cuenta"}</button>
        </>}

        {mode==="invite"&&invUser&&<>
          <div style={{background:T.blueBg,border:`1px solid ${T.blue}33`,borderRadius:8,padding:"10px 12px",marginBottom:14,fontSize:10,color:T.blue}}><strong>👋</strong> Invitad@ como <strong>{ROLES[invUser.rol]?.label}</strong>. Configura tu contraseña.</div>
          <div style={{marginBottom:12}}><label style={{fontSize:9,fontWeight:700,color:T.inkMid,textTransform:"uppercase",display:"block",marginBottom:4}}>Email</label><input value={invUser.email} disabled style={{...inpN,background:"#f0f0f0",color:T.inkMid}}/></div>
          <div style={{marginBottom:12}}><label style={{fontSize:9,fontWeight:700,color:T.inkMid,textTransform:"uppercase",display:"block",marginBottom:4}}>Nueva contraseña</label><input className="li" value={pw} onChange={e=>setPw(e.target.value)} placeholder="Mínimo 6 caracteres" type={showPw?"text":"password"} style={inpN}/></div>
          <div style={{marginBottom:14}}><label style={{fontSize:9,fontWeight:700,color:T.inkMid,textTransform:"uppercase",display:"block",marginBottom:4}}>Confirmar</label><input className="li" value={pw2} onChange={e=>setPw2(e.target.value)} placeholder="Repite" type={showPw?"text":"password"} onKeyDown={e=>e.key==="Enter"&&doInvite()} style={inpN}/></div>
          <button onClick={doInvite} disabled={load} style={{width:"100%",padding:"11px",borderRadius:8,border:"none",background:T.blue,color:"#fff",fontSize:13,fontWeight:600,fontFamily:"'Outfit',sans-serif",cursor:"pointer",opacity:load?.6:1}}>{load?"Configurando...":"✓ Activar mi cuenta"}</button>
        </>}

        <div style={{textAlign:"center",marginTop:20,fontSize:9,color:T.inkLight}}>{brand} Suite · Acceso protegido</div>
      </div>
    </div>
  );
}

/* ═══ USER MANAGEMENT ═══ */
export function UserManagement(){
  const[users,setUsers]=useState([]);const[load,setLoad]=useState(true);const[showAdd,setShowAdd]=useState(false);
  const[nu,setNu]=useState({nombre:"",email:"",rol:"auxiliar"});const[sending,setSending]=useState(false);
  const[status,setStatus]=useState("");const[editId,setEditId]=useState(null);
  const cur=getCurrentUser();const isAdm=cur?.rol==="superadmin"||cur?.rol==="admin";

  useEffect(()=>{loadU()},[]);
  async function loadU(){setLoad(true);const d=await supa.q("users","order=created_at.asc");setUsers(d||[]);setLoad(false)}

  async function addU(){
    if(!nu.nombre||!nu.email){alert("Nombre y email obligatorios");return}
    if(users.some(u=>u.email.toLowerCase()===nu.email.toLowerCase())){alert("Email ya existe");return}
    const tk=genToken();
    const user={email:nu.email.trim().toLowerCase(),nombre:nu.nombre.trim(),rol:nu.rol,estado:"pendiente",invite_token:tk,invite_expires:new Date(Date.now()+7*24*60*60*1000).toISOString(),creado_por:cur?.email||"admin"};
    setSending(true);setStatus("Creando...");
    const r=await supa.i("users",user);if(!r){setStatus("❌ Error");setSending(false);return}
    setStatus("Enviando email...");const ok=await sendInviteEmail(user.nombre,user.email,tk);setSending(false);
    setStatus(ok?"✅ Invitación enviada":"⚠️ Creado, email falló. Copia enlace.");
    if(ok){setShowAdd(false);setNu({nombre:"",email:"",rol:"auxiliar"})}
    loadU();setTimeout(()=>setStatus(""),5000);
  }

  async function toggleSt(u){if(u.email==="dparra@habitaris.co")return;await supa.u("users",`id=eq.${u.id}`,{estado:u.estado==="activo"?"inactivo":"activo"});loadU()}
  async function delU(u){if(u.email==="dparra@habitaris.co")return;if(!confirm(`¿Eliminar a ${u.nombre}?`))return;await supa.d("users",`id=eq.${u.id}`);loadU()}
  async function updRole(id,r){await supa.u("users",`id=eq.${id}`,{rol:r});setEditId(null);loadU()}
  async function resend(u){const tk=genToken();await supa.u("users",`id=eq.${u.id}`,{invite_token:tk,invite_expires:new Date(Date.now()+7*24*60*60*1000).toISOString()});setSending(true);setStatus("Reenviando...");const ok=await sendInviteEmail(u.nombre,u.email,tk);setSending(false);setStatus(ok?"✅ Reenviada":"❌ Error");setTimeout(()=>setStatus(""),4000)}
  function copyLnk(u){if(u.invite_token){navigator.clipboard.writeText(`${window.location.origin}?invite=${u.invite_token}`);setStatus("📋 Copiado");setTimeout(()=>setStatus(""),3000)}}

  const inp={border:`1px solid ${T.border}`,borderRadius:6,padding:"8px 10px",fontSize:12,fontFamily:"'Outfit',sans-serif",background:"#fff",width:"100%"};
  const Btn=({children,on,v,style,...p})=><button onClick={on} style={{padding:"7px 14px",borderRadius:6,border:v==="sec"?`1px solid ${T.border}`:"none",background:v==="sec"?"#fff":v==="danger"?T.red:T.ink,color:v==="sec"?T.inkMid:"#fff",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif",display:"inline-flex",alignItems:"center",gap:5,...style}} {...p}>{children}</button>;

  if(load)return<div style={{padding:20,textAlign:"center",fontSize:12,color:T.inkLight}}>Cargando usuarios...</div>;

  return(
    <div style={{fontFamily:"'Outfit',sans-serif"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}}>
        <div><h2 style={{margin:0,fontSize:18,fontWeight:700}}>👥 Usuarios</h2><p style={{margin:"2px 0 0",fontSize:10,color:T.inkMid}}>{users.length} usuarios · {users.filter(u=>u.estado==="activo").length} activos · Supabase</p></div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>{status&&<span style={{fontSize:10,fontWeight:600,color:status.startsWith("✅")?T.green:status.startsWith("❌")?T.red:T.amber}}>{status}</span>}{isAdm&&<Btn on={()=>setShowAdd(!showAdd)}><UserPlus size={12}/> Invitar</Btn>}</div>
      </div>

      {showAdd&&<div style={{background:T.blueBg,border:`1px solid ${T.blue}22`,borderRadius:8,padding:16,marginBottom:16}}>
        <div style={{fontSize:12,fontWeight:700,color:T.blue,marginBottom:12}}><UserPlus size={14} style={{verticalAlign:"middle",marginRight:6}}/>Nuevo usuario</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:12}}>
          <div><label style={{fontSize:8,fontWeight:700,color:T.inkMid,textTransform:"uppercase",display:"block",marginBottom:3}}>Nombre</label><input value={nu.nombre} onChange={e=>setNu({...nu,nombre:e.target.value})} placeholder="Juan Pérez" style={inp}/></div>
          <div><label style={{fontSize:8,fontWeight:700,color:T.inkMid,textTransform:"uppercase",display:"block",marginBottom:3}}>Email</label><input value={nu.email} onChange={e=>setNu({...nu,email:e.target.value})} placeholder="juan@habitaris.co" style={inp}/></div>
          <div><label style={{fontSize:8,fontWeight:700,color:T.inkMid,textTransform:"uppercase",display:"block",marginBottom:3}}>Rol</label><select value={nu.rol} onChange={e=>setNu({...nu,rol:e.target.value})} style={inp}>{Object.entries(ROLES).filter(([k])=>k!=="superadmin").map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></div>
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn v="sec" on={()=>setShowAdd(false)}>Cancelar</Btn><Btn on={addU} disabled={sending}><Send size={11}/>{sending?"Enviando...":"Enviar invitación"}</Btn></div>
      </div>}

      <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,overflow:"hidden",boxShadow:T.shadow}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
          <thead><tr style={{background:"#FAFAF8"}}>{["Usuario","Rol","Estado","Último acceso","Acciones"].map(h=><th key={h} style={{padding:"10px 14px",textAlign:h==="Acciones"?"right":"left",fontSize:9,fontWeight:700,color:T.inkLight,textTransform:"uppercase",borderBottom:`1px solid ${T.border}`}}>{h}</th>)}</tr></thead>
          <tbody>{users.map(u=>{const rl=ROLES[u.rol]||{label:u.rol,color:T.inkLight};const isS=u.email==="dparra@habitaris.co";return(
            <tr key={u.id} style={{borderBottom:`1px solid ${T.border}22`}}>
              <td style={{padding:"10px 14px"}}><div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:32,height:32,borderRadius:"50%",background:isS?T.gold+"22":T.blueBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:isS?T.gold:T.blue}}>{u.nombre?.split(" ").map(n=>n[0]).join("").substring(0,2).toUpperCase()||"?"}</div><div><div style={{fontWeight:600}}>{u.nombre}</div><div style={{fontSize:9,color:T.inkLight}}>{u.email}</div></div></div></td>
              <td style={{padding:"10px 14px"}}>{editId===u.id?<select value={u.rol} onChange={e=>updRole(u.id,e.target.value)} onBlur={()=>setEditId(null)} autoFocus style={{...inp,width:130,fontSize:10,padding:"4px 6px"}}>{Object.entries(ROLES).filter(([k])=>k!=="superadmin").map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select>:<span style={{fontSize:9,fontWeight:700,padding:"3px 10px",borderRadius:12,background:rl.color+"18",color:rl.color,cursor:isS?"default":"pointer"}} onClick={()=>!isS&&isAdm&&setEditId(u.id)}>{isS&&"👑 "}{rl.label}</span>}</td>
              <td style={{padding:"10px 14px"}}><span style={{fontSize:9,fontWeight:600,color:u.estado==="activo"?T.green:u.estado==="pendiente"?T.amber:T.red}}>{u.estado==="activo"?"● Activo":u.estado==="pendiente"?"◐ Pendiente":"○ Inactivo"}</span></td>
              <td style={{padding:"10px 14px",fontSize:10,color:T.inkLight}}>{u.ultimo_login?new Date(u.ultimo_login).toLocaleDateString("es",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}):"—"}</td>
              <td style={{padding:"10px 14px",textAlign:"right"}}>{!isS&&isAdm&&<div style={{display:"flex",gap:4,justifyContent:"flex-end"}}>{u.estado==="pendiente"&&<><button onClick={()=>resend(u)} title="Reenviar" style={{border:"none",background:T.blueBg,borderRadius:4,padding:"4px 6px",cursor:"pointer"}}><Send size={11} color={T.blue}/></button><button onClick={()=>copyLnk(u)} title="Copiar enlace" style={{border:"none",background:T.amberBg,borderRadius:4,padding:"4px 6px",cursor:"pointer"}}><Copy size={11} color={T.amber}/></button></>}<button onClick={()=>toggleSt(u)} title={u.estado==="activo"?"Desactivar":"Activar"} style={{border:"none",background:u.estado==="activo"?T.amberBg:T.greenBg,borderRadius:4,padding:"4px 6px",cursor:"pointer"}}>{u.estado==="activo"?<X size={11} color={T.amber}/>:<Check size={11} color={T.green}/>}</button><button onClick={()=>delU(u)} title="Eliminar" style={{border:"none",background:T.redBg,borderRadius:4,padding:"4px 6px",cursor:"pointer"}}><Trash2 size={11} color={T.red}/></button></div>}{isS&&<span style={{fontSize:8,color:T.gold,fontWeight:700}}>PROTEGIDO</span>}</td>
            </tr>)})}</tbody>
        </table>
      </div>
      <div style={{marginTop:12,padding:"10px 14px",background:T.amberBg,border:`1px solid ${T.amber}22`,borderRadius:8,fontSize:9,color:T.amber,lineHeight:1.6}}><strong>💡</strong> Crear usuario → email con enlace → configura contraseña → accede. Datos en Supabase (nube).</div>
    </div>
  );
}
