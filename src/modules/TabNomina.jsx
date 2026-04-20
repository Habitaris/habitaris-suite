import React, { useState, useEffect, useMemo } from "react";
import { HAB_LOGO } from "./habLogo.js";
import { downloadPDF } from "./pdfUtil.js";

const SMLMV = 1_750_905, AUX_TR = 249_095, UVT = 49_799;
const ARL_OPTS = [
  { n:"I", t:0.00522, lbl:"I — Mínimo" }, { n:"II", t:0.01044, lbl:"II — Bajo" },
  { n:"III", t:0.02436, lbl:"III — Medio" }, { n:"IV", t:0.04350, lbl:"IV — Alto" },
  { n:"V", t:0.06960, lbl:"V — Máximo" },
];
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DL_SHORT = ["L","M","X","J","V","S","D"];
// Festivos Colombia — cálculo dinámico con Easter
function easter(y){const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),mo=Math.floor((h+l-7*m+114)/31),da=((h+l-7*m+114)%31)+1;return new Date(y,mo-1,da)}
function nxtMon(d){const w=d.getDay();if(w===1)return new Date(d);return new Date(d.getFullYear(),d.getMonth(),d.getDate()+(w===0?1:8-w))}
function addD(d,n){return new Date(d.getFullYear(),d.getMonth(),d.getDate()+n)}
function getHolidays(y){const e=easter(y),h=[];const F=(m,d,n)=>h.push({date:new Date(y,m-1,d),name:n});const E=(m,d,n)=>{h.push({date:nxtMon(new Date(y,m-1,d)),name:n})};
F(1,1,"Año Nuevo");F(5,1,"Día Trabajo");F(7,20,"Independencia");F(8,7,"Boyacá");F(12,8,"Inmaculada");F(12,25,"Navidad");
h.push({date:addD(e,-3),name:"Jueves Santo"});h.push({date:addD(e,-2),name:"Viernes Santo"});
h.push({date:nxtMon(addD(e,39)),name:"Ascensión"});h.push({date:nxtMon(addD(e,60)),name:"Corpus Christi"});h.push({date:nxtMon(addD(e,68)),name:"Sagrado Corazón"});
E(1,6,"Reyes Magos");E(3,19,"San José");E(6,29,"San Pedro y Pablo");E(8,15,"Asunción");E(10,12,"Día Raza");E(11,1,"Todos Santos");E(11,11,"Indep. Cartagena");
return h}
function sameDay(a,b){return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();}

// Novedad types for calendar
const NOV_TIPOS = [
  {id:"normal",label:"Normal",color:"transparent",icon:""},
  {id:"incapacidad",label:"Incapacidad",color:"#FEE2E2",icon:"🏥"},
  {id:"vacaciones",label:"Vacaciones",color:"#DBEAFE",icon:"🏖️"},
  {id:"licencia",label:"Licencia rem.",color:"#FEF3C7",icon:"📋"},
  {id:"licNoRem",label:"Lic. NO rem.",color:"#F3E8FF",icon:"⚠️"},
  {id:"ausencia",label:"Ausencia",color:"#FEE2E2",icon:"❌"},
];
const uid = () => Math.random().toString(36).slice(2, 10);
const fmt = n => n == null || isNaN(n) ? "$0" : "$" + Math.round(n).toLocaleString("es-CO");
const fPct = n => (n * 100).toFixed(2) + "%";

async function fetchEmps(){try{
  const results=[];
  for(const est of["firmado","afiliaciones","completado"]){
    const r=await fetch("/api/hiring?estado="+est);const d=await r.json();
    if(d.ok&&Array.isArray(d.data))results.push(...d.data);
  }
  return results;
}catch{return[];}}
async function loadN(a,m){try{const r=await fetch("/api/hiring?kv=nomina&anio="+a+"&mes="+m);const d=await r.json();return d.ok?d.data:[];}catch{return[];}}
async function saveN(a,m,data){await fetch("/api/hiring?kv=nomina&anio="+a+"&mes="+m,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({data})});}

function calcN(n) {
  const dias=n.dias||30, ratio=dias/30, sal=n.sal||0;
  const festMes=n.festMes||0;
  const licRem=n.diasLicRem||0;
  // Días que se transportó = días laborados - licencias rem (festivos SÍ incluidos — Concepto 219821/2020)
  const diasComm=Math.max(0,dias-licRem);
  const ratioComm=diasComm/30;
  // Días asistidos = días que se transportó - festivos (para bono asistencia)
  const diasAsist=Math.max(0,diasComm-festMes);
  const ratioAsist=diasAsist/30;
  // Aux transporte: por días que se transportó (excluye lic rem, incluye festivos)
  const aplA=sal<=2*SMLMV, aux=aplA?AUX_TR*ratioComm:0;
  // Bono asistencia: por días asistidos (excluye festivos y lic rem)
  const bono=(n.bono||0)*ratioAsist;
  const vH=sal/240;
  const hexD=(n.hexD||0)*vH*1.25, hexN=(n.hexN||0)*vH*1.75, hexDD=(n.hexDD||0)*vH*2, hexDN=(n.hexDN||0)*vH*2.5;
  const totHex=hexD+hexN+hexDD+hexDN, recFest=(n.festLab||0)*vH*8*0.75;
  // Salario siempre sobre 30 días (incluye festivos y domingos)
  const salProp=sal*ratio, ibc=Math.max(salProp+totHex+recFest, SMLMV*ratio);
  const dev=salProp+totHex+recFest+aux+bono+(n.otrosIng||0);
  const eSub=n.reg==="subsidiado", epsE=eSub?0:ibc*0.04, penE=ibc*0.04;
  const rteF=(ibc/UVT)>95?((ibc/UVT)-95)*UVT*0.19:0;
  const totD=epsE+penE+rteF+(n.otrasDed||0), neto=dev-totD;
  const q1Pct=n.q1Pct!=null?n.q1Pct:0.5, q1=Math.round(sal*q1Pct), q2=neto-q1;
  const enSM=sal/SMLMV, exS=n.ex114!==false&&enSM<10, tasa=ARL_OPTS[n.arl||0]?.t||0.00522;
  const epsEr=(eSub||exS)?0:ibc*0.085, penEr=ibc*0.12, arlV=Math.max(ibc,SMLMV*ratio)*tasa;
  const caja=ibc*0.04, icbf=exS?0:ibc*0.03, sena=exS?0:ibc*0.02;
  const totAp=epsEr+penEr+arlV+caja+icbf+sena;
  const bPr=salProp+aux, prima=bPr/12, ces=bPr/12, intC=ces*0.12/12, vac=salProp*15/360;
  const totPr=prima+ces+intC+vac, costoT=dev+totAp+totPr;
  return {sal,salProp,bono,aux,aplA,dev,ibc,eSub,vH,totHex,hexD,hexN,hexDD,hexDN,recFest,epsE,penE,rteF,otrasDed:n.otrasDed||0,totD,neto,q1,q2,q1Pct,epsEr,penEr,arlV,caja,icbf,sena,totAp,exS,tasa,prima,ces,intC,vac,totPr,costoT,ratio,dias,festMes,diasComm,ratioComm,diasAsist,ratioAsist};
}

const T={bg:"#F5F4F1",surface:"#FFFFFF",ink:"#111",inkMid:"#666",inkLight:"#999",inkXLight:"#CCC",border:"#E5E3DE",accent:"#F5F5F3",green:"#16A34A",greenBg:"#F0FDF4",red:"#DC2626",redBg:"#FEF2F2",blue:"#2563EB",blueBg:"#EFF6FF",amber:"#D97706",amberBg:"#FFFBEB",purple:"#7C3AED",purpleBg:"#F5F3FF",shadow:"0 1px 3px rgba(0,0,0,.06)"};

const Card=({children,style,accent})=><div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:"16px 18px",marginBottom:10,boxShadow:T.shadow,borderLeft:accent?`3px solid ${accent}`:undefined,...style}}>{children}</div>;
const Lbl=({children})=><label style={{display:"block",fontSize:9,fontWeight:700,color:T.inkLight,textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>{children}</label>;
const Inp=({label,value,onChange,type="text",disabled,suf,small,...rest})=><div style={{marginBottom:8}}>{label&&<Lbl>{label}</Lbl>}<div style={{position:"relative"}}><input type={type} value={value} onChange={e=>onChange(type==="number"?+e.target.value:e.target.value)} disabled={disabled} style={{width:"100%",boxSizing:"border-box",border:`1px solid ${T.border}`,borderRadius:4,padding:small?"5px 8px":"6px 10px",paddingRight:suf?32:undefined,fontSize:small?11:12,fontFamily:"'DM Mono',monospace",background:disabled?T.accent:"#fff",color:T.ink}} {...rest}/>{suf&&<span style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",fontSize:9,color:T.inkLight,fontFamily:"'DM Mono',monospace"}}>{suf}</span>}</div></div>;
const Sel=({label,value,onChange,opts})=><div style={{marginBottom:8}}>{label&&<Lbl>{label}</Lbl>}<select value={value} onChange={e=>onChange(e.target.value)} style={{width:"100%",border:`1px solid ${T.border}`,borderRadius:4,padding:"6px 10px",fontSize:12,fontFamily:"'DM Sans',sans-serif",background:"#fff",color:T.ink}}>{opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}</select></div>;
const Row=({lbl,val,color,bold,sub,indent,bg})=><div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",padding:`${sub?2:4}px ${indent?10:0}px`,background:bg||"transparent",borderRadius:bg?3:0,marginBottom:bg?3:0}}><span style={{fontSize:sub?10:11,color:sub?T.inkLight:(color||T.inkMid),fontWeight:bold?700:400}}>{indent&&<span style={{color:T.inkXLight,marginRight:4}}>└</span>}{lbl}</span><span style={{fontSize:sub?10:12,fontWeight:bold?800:500,color:color||T.ink,fontFamily:"'DM Mono',monospace"}}>{fmt(val)}</span></div>;
const Div=()=><div style={{height:1,background:T.border,margin:"6px 0"}}/>;
const STit=({children,color})=><div style={{fontSize:12,fontWeight:700,color:color||T.ink,marginBottom:8}}>{children}</div>;
const Pill=({e})=>{const m={borrador:{bg:"#F5F4F1",c:"#888"},aprobada:{bg:T.greenBg,c:T.green},pagada:{bg:"#E8E8E8",c:"#111"},"anticipo fijo":{bg:T.blueBg,c:T.blue},"ajuste real":{bg:T.greenBg,c:T.green}};const s=m[e]||m.borrador;return<span style={{padding:"2px 8px",borderRadius:10,fontSize:9,fontWeight:700,background:s.bg,color:s.c}}>{e}</span>;};
const Btn=({children,pri,small,onClick,disabled,style:sx})=><button onClick={onClick} disabled={disabled} style={{padding:small?"4px 10px":"7px 14px",borderRadius:5,border:pri?"none":`1px solid ${T.border}`,background:pri?T.ink:T.surface,color:pri?"#fff":T.ink,fontSize:small?10:11,fontWeight:600,fontFamily:"'DM Sans',sans-serif",cursor:disabled?"default":"pointer",opacity:disabled?0.5:1,display:"inline-flex",alignItems:"center",gap:5,...sx}}>{children}</button>;

/* ── ASISTENCIA POR EMPLEADO (sub-tab) ── */
function AsistenciaPanel({selN, MESES, mes, anio}) {
  const [regs, setRegs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mesAtt, setMesAtt] = useState(mes);

  useEffect(()=>{
    if(!selN?.empId) { setLoading(false); return; }
    setLoading(true);
    (async()=>{
      try {
        const r = await fetch("/api/attendance?employee_id="+selN.empId+"&limit=200");
        const d = await r.json();
        setRegs(d.data||[]);
      } catch(e) { console.error(e); }
      setLoading(false);
    })();
  },[selN?.empId]);

  // Filter by selected month
  const mesStr = String(anio)+"-"+String(mesAtt+1).padStart(2,"0");
  const filtered = regs.filter(r=>(r.fecha||"").startsWith(mesStr)).sort((a,b)=>a.timestamp<b.timestamp?-1:1);

  // Group by date
  const byDate = {};
  filtered.forEach(r=>{
    if(!byDate[r.fecha]) byDate[r.fecha]=[];
    byDate[r.fecha].push(r);
  });
  const dates = Object.keys(byDate).sort();

  // Stats
  const diasConEntrada = dates.filter(d=>byDate[d].some(r=>r.tipo==="entrada")).length;
  const diasConSalida = dates.filter(d=>byDate[d].some(r=>r.tipo==="salida")).length;
  const totalHoras = dates.reduce((sum,d)=>{
    const ent = byDate[d].find(r=>r.tipo==="entrada");
    const sal = byDate[d].find(r=>r.tipo==="salida");
    if(ent&&sal){
      const diff = (new Date(sal.timestamp)-new Date(ent.timestamp))/3600000;
      return sum + Math.max(0, diff);
    }
    return sum;
  }, 0);

  const fichajeLink = "https://suite.habitaris.co/empleado";
  const portalLink = "https://suite.habitaris.co/empleado";

  return (
    <div>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div>
          <div style={{fontSize:13,fontWeight:700}}>📍 Registros de asistencia — {selN.nombre}</div>
          <div style={{fontSize:10,color:T.inkLight}}>Cédula + PIN · Fichaje con foto + GPS</div>
        </div>
        <div style={{display:"flex",gap:6}}>
          <select value={mesAtt} onChange={e=>setMesAtt(parseInt(e.target.value))} style={{padding:"5px 10px",border:`1px solid ${T.border}`,borderRadius:4,fontSize:11,fontFamily:"'DM Sans',sans-serif"}}>
            {MESES.map((m,i)=><option key={i} value={i}>{m}</option>)}
          </select>
          <Btn small onClick={()=>{window.open("https://wa.me/?text="+encodeURIComponent("Habitaris\n\n👤 Portal del empleado:\nhttps://suite.habitaris.co/empleado\n\nIngresa tu cédula y PIN (últimos 4 dígitos de tu cédula)"),"_blank");}}>💬 Enviar link</Btn>
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:12}}>
        {[
          ["Días con entrada",diasConEntrada,T.green],
          ["Días con salida",diasConSalida,T.blue],
          ["Fichajes total",filtered.length,T.ink],
          ["Horas registradas",totalHoras.toFixed(1)+"h",T.amber],
        ].map(([l,v,c])=>(
          <div key={l} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:6,padding:"10px 12px",textAlign:"center"}}>
            <div style={{fontSize:8,fontWeight:700,color:T.inkLight,textTransform:"uppercase",letterSpacing:.8}}>{l}</div>
            <div style={{fontSize:18,fontWeight:800,color:c,fontFamily:"'DM Mono',monospace"}}>{v}</div>
          </div>
        ))}
      </div>

      {loading && <div style={{textAlign:"center",padding:24,color:T.inkLight}}>Cargando fichajes...</div>}

      {!loading && dates.length===0 && (
        <Card style={{textAlign:"center",padding:"30px 20px"}}>
          <div style={{fontSize:32,marginBottom:8}}>📭</div>
          <div style={{fontSize:13,color:T.inkMid}}>Sin registros en {MESES[mesAtt]} {anio}</div>
          <div style={{fontSize:11,color:T.inkLight,marginTop:6}}>Envía el link de fichaje al trabajador para que empiece a registrar su asistencia</div>
        </Card>
      )}

      {!loading && dates.length>0 && (
        <Card style={{padding:0,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead>
              <tr style={{borderBottom:`2px solid ${T.ink}`,background:T.surface}}>
                {["Fecha","Entrada","Salida","Horas","GPS","Foto"].map(h=>(
                  <th key={h} style={{padding:"6px 10px",textAlign:"left",fontSize:9,fontWeight:700,color:T.inkLight,letterSpacing:.8,textTransform:"uppercase"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dates.map((d,i)=>{
                const dayRegs = byDate[d];
                const entrada = dayRegs.find(r=>r.tipo==="entrada");
                const salida = dayRegs.find(r=>r.tipo==="salida");
                const horas = (entrada&&salida) ? ((new Date(salida.timestamp)-new Date(entrada.timestamp))/3600000).toFixed(1) : null;
                const dt = new Date(d+"T12:00:00");
                const dayName = dt.toLocaleDateString("es-CO",{weekday:"short"});
                const dayNum = dt.toLocaleDateString("es-CO",{day:"numeric",month:"short"});
                const isSun = dt.getDay()===0;
                return (
                  <tr key={d} style={{borderBottom:`1px solid ${T.border}`,background:i%2===0?T.card:"#FAFAF8",opacity:isSun?0.5:1}}>
                    <td style={{padding:"6px 10px"}}>
                      <div style={{fontWeight:600,fontSize:12,textTransform:"capitalize"}}>{dayName} {dayNum}</div>
                    </td>
                    <td style={{padding:"6px 10px",fontFamily:"'DM Mono',monospace",fontSize:12,color:entrada?T.green:T.inkLight}}>
                      {entrada?new Date(entrada.timestamp).toLocaleTimeString("es-CO",{hour:"2-digit",minute:"2-digit"}):"–"}
                    </td>
                    <td style={{padding:"6px 10px",fontFamily:"'DM Mono',monospace",fontSize:12,color:salida?T.red:T.inkLight}}>
                      {salida?new Date(salida.timestamp).toLocaleTimeString("es-CO",{hour:"2-digit",minute:"2-digit"}):"–"}
                    </td>
                    <td style={{padding:"6px 10px",fontFamily:"'DM Mono',monospace",fontWeight:600,fontSize:12}}>
                      {horas ? horas+"h" : "–"}
                    </td>
                    <td style={{padding:"6px 10px",fontSize:11}}>
                      {entrada?.gps_lat ? (
                        <a href={`https://www.google.com/maps?q=${entrada.gps_lat},${entrada.gps_lng}`} target="_blank" rel="noreferrer" style={{color:T.blue,textDecoration:"none"}}>
                          📍 {entrada.precision_m||""}m
                        </a>
                      ) : <span style={{color:T.inkLight}}>–</span>}
                    </td>
                    <td style={{padding:"6px 10px"}}>
                      {entrada?.foto_url ? (
                        <img src={entrada.foto_url} alt="foto" style={{width:32,height:32,borderRadius:4,objectFit:"cover",cursor:"pointer",border:`1px solid ${T.border}`}}
                          onClick={()=>{const w=window.open();w.document.write(`<img src="${entrada.foto_url}" style="max-width:100%"/>`);}}/>
                      ) : <span style={{color:T.inkLight,fontSize:11}}>–</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

/* ── NOVEDADES PANEL (sub-tab dentro del liquidador) ── */
function NovedadesPanel({selN, anio, MESES, novHist, setNovHist, novYear, setNovYear, fmt}) {
  const [loading, setLoading] = useState(true);
  const [filtroMes, setFiltroMes] = useState("all");

  useEffect(()=>{
    setLoading(true);
    fetch("/api/novelties?employee_id="+selN.empId).then(r=>r.json()).then(d=>{
      setNovHist(d.data||[]);setLoading(false);
    }).catch(()=>{setNovHist([]);setLoading(false);});
  },[selN.empId]);

  // Vacation calc: 15 days/year proportional to time worked
  const fechaIng = selN.fechaIngreso ? new Date(selN.fechaIngreso+"T12:00:00") : null;
  const hoy = new Date();
  const diasTrabajados = fechaIng ? Math.max(0,Math.floor((hoy-fechaIng)/86400000)) : 0;
  const aniosTrab = diasTrabajados/365;
  const vacGanados = Math.round(aniosTrab*15*10)/10;
  const vacTomados = novHist.filter(n=>n.tipo==="vacaciones"&&n.estado!=="rechazada").reduce((s,n)=>{
    if(!n.fecha_inicio)return s;
    const fi=new Date(n.fecha_inicio), ff=n.fecha_fin?new Date(n.fecha_fin):fi;
    return s+Math.max(1,Math.floor((ff-fi)/86400000)+1);
  },0);
  const vacDisp = Math.max(0, Math.round((vacGanados-vacTomados)*10)/10);

  // Filter by year and month
  const filtered = novHist.filter(n=>{
    const d = new Date(n.created_at||n.fecha_inicio||"");
    if(d.getFullYear()!==novYear) return false;
    if(filtroMes!=="all" && d.getMonth()!==parseInt(filtroMes)) return false;
    return true;
  }).sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0));

  // Group by year for all-years view
  const years = [...new Set(novHist.map(n=>new Date(n.created_at||n.fecha_inicio||"").getFullYear()))].sort((a,b)=>b-a);
  if(years.indexOf(novYear)===-1 && years.length) years.unshift(novYear);
  if(years.indexOf(hoy.getFullYear())===-1) years.unshift(hoy.getFullYear());

  const tipoIcon = {vacaciones:"🏖️",licencia_remunerada:"📋",licencia_no_remunerada:"⚠️",permiso:"🕐",incapacidad:"🏥",ausencia:"❌"};
  const estadoBadge = (e)=>e==="aprobada"?`<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:9px;font-weight:700;background:#E8F4EE;color:#1E6B42">aprobada</span>`:e==="rechazada"?`<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:9px;font-weight:700;background:#FEF2F2;color:#dc2626">rechazada</span>`:`<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:9px;font-weight:700;background:#FFFBEB;color:#D97706">pendiente</span>`;

  if(loading) return <div style={{textAlign:"center",padding:40}}><div style={{width:20,height:20,border:`3px solid ${T.border}`,borderTopColor:T.ink,borderRadius:"50%",animation:"spin 1s linear infinite",margin:"0 auto"}}/></div>;

  return(
    <div>
      {/* KPIs Vacaciones */}
      <Card accent={T.ink}>
        <STit>🏖️ Vacaciones — {selN.nombre}</STit>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:8}}>
          <div style={{background:T.greenBg,borderRadius:6,padding:10,textAlign:"center"}}>
            <div style={{fontSize:7,fontWeight:700,color:T.green,textTransform:"uppercase",letterSpacing:1}}>Ganados</div>
            <div style={{fontSize:20,fontWeight:800,fontFamily:"'DM Mono',monospace",color:T.green}}>{vacGanados.toFixed(1)}d</div>
          </div>
          <div style={{background:T.blueBg,borderRadius:6,padding:10,textAlign:"center"}}>
            <div style={{fontSize:7,fontWeight:700,color:T.blue,textTransform:"uppercase",letterSpacing:1}}>Tomados</div>
            <div style={{fontSize:20,fontWeight:800,fontFamily:"'DM Mono',monospace",color:T.blue}}>{vacTomados}d</div>
          </div>
          <div style={{background:"#FFF8EE",borderRadius:6,padding:10,textAlign:"center"}}>
            <div style={{fontSize:7,fontWeight:700,color:T.amber,textTransform:"uppercase",letterSpacing:1}}>Disponibles</div>
            <div style={{fontSize:20,fontWeight:800,fontFamily:"'DM Mono',monospace",color:T.amber}}>{vacDisp}d</div>
          </div>
          <div style={{background:T.accent,borderRadius:6,padding:10,textAlign:"center"}}>
            <div style={{fontSize:7,fontWeight:700,color:T.inkLight,textTransform:"uppercase",letterSpacing:1}}>Antigüedad</div>
            <div style={{fontSize:20,fontWeight:800,fontFamily:"'DM Mono',monospace",color:T.inkMid}}>{aniosTrab.toFixed(1)}a</div>
          </div>
        </div>
        <div style={{fontSize:9,color:T.inkLight}}>15 días hábiles/año (Art.186 CST) · Ingreso: {selN.fechaIngreso||"—"}</div>
      </Card>

      {/* Filters */}
      <Card accent={T.ink}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <STit>📋 Histórico de novedades</STit>
          <div style={{display:"flex",gap:6}}>
            <select value={novYear} onChange={e=>setNovYear(parseInt(e.target.value))} style={{padding:"4px 8px",border:`1px solid ${T.border}`,borderRadius:4,fontSize:11,fontFamily:"'DM Sans',sans-serif"}}>
              {years.map(y=><option key={y} value={y}>{y}</option>)}
            </select>
            <select value={filtroMes} onChange={e=>setFiltroMes(e.target.value)} style={{padding:"4px 8px",border:`1px solid ${T.border}`,borderRadius:4,fontSize:11,fontFamily:"'DM Sans',sans-serif"}}>
              <option value="all">Todo el año</option>
              {MESES.map((m,i)=><option key={i} value={i}>{m}</option>)}
            </select>
          </div>
        </div>

        {filtered.length===0 ? (
          <div style={{textAlign:"center",padding:24,color:T.inkLight}}>
            <div style={{fontSize:24,marginBottom:6}}>📭</div>
            <div style={{fontSize:12}}>Sin novedades en {novYear}{filtroMes!=="all"?" · "+MESES[parseInt(filtroMes)]:""}</div>
          </div>
        ) : (
          <table style={{width:"100%",fontSize:11,borderCollapse:"collapse"}}>
            <thead><tr style={{borderBottom:`2px solid ${T.ink}`}}>
              <th style={{padding:"5px 8px",textAlign:"left",fontSize:8,fontWeight:700,color:T.inkLight,letterSpacing:1}}>FECHA</th>
              <th style={{padding:"5px 8px",textAlign:"left",fontSize:8,fontWeight:700,color:T.inkLight,letterSpacing:1}}>TIPO</th>
              <th style={{padding:"5px 8px",textAlign:"left",fontSize:8,fontWeight:700,color:T.inkLight,letterSpacing:1}}>PERIODO</th>
              <th style={{padding:"5px 8px",textAlign:"left",fontSize:8,fontWeight:700,color:T.inkLight,letterSpacing:1}}>MOTIVO</th>
              <th style={{padding:"5px 8px",textAlign:"left",fontSize:8,fontWeight:700,color:T.inkLight,letterSpacing:1}}>ESTADO</th>
            </tr></thead>
            <tbody>
              {filtered.map((n,i)=>(
                <tr key={i} style={{borderBottom:`1px solid ${T.border}`}}>
                  <td style={{padding:"5px 8px",fontWeight:600}}>{new Date(n.created_at).toLocaleDateString("es-CO",{day:"numeric",month:"short"})}</td>
                  <td style={{padding:"5px 8px"}}>{tipoIcon[n.tipo]||"📋"} {n.tipo}</td>
                  <td style={{padding:"5px 8px",fontFamily:"'DM Mono',monospace",fontSize:10}}>{n.fecha_inicio||""}{n.fecha_fin?" → "+n.fecha_fin:""}</td>
                  <td style={{padding:"5px 8px",color:T.inkMid,maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{n.motivo||"—"}</td>
                  <td style={{padding:"5px 8px"}} dangerouslySetInnerHTML={{__html:estadoBadge(n.estado)}}/>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div style={{display:"flex",gap:8,marginTop:12}}>
          <div style={{fontSize:9,color:T.inkLight,flex:1}}>
            {filtered.length} novedad(es) en {novYear}{filtroMes!=="all"?" · "+MESES[parseInt(filtroMes)]:""}
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ── LIQUIDACIÓN FINAL (sub-tab dentro del liquidador) ── */
const TIPOS_TERM = [
  { id:"renuncia", label:"Renuncia voluntaria", icon:"📝", color:T.blue, indemniza:false },
  { id:"vencimiento", label:"Terminación contrato", icon:"📅", color:T.amber, indemniza:false },
  { id:"justa_causa", label:"Despido con justa causa", icon:"⚖️", color:T.amber, indemniza:false },
  { id:"sin_justa", label:"Despido sin justa causa", icon:"🚨", color:T.red, indemniza:true },
];

function calcLiqFinal(selN, tipo, fechaSalida) {
  const sal=selN.sal||0, aux=(sal<=2*SMLMV)?(selN.auxT||AUX_TR):0;
  const fi=new Date((selN.fechaIngreso||"2026-01-01")+"T12:00:00");
  const ff=new Date(fechaSalida+"T12:00:00");
  const durMeses=selN.duracionMeses||0;
  const isFijo=(selN.tipoContrato||"").toLowerCase().includes("fijo")||durMeses>0;
  const diasTot=Math.max(1,Math.floor((ff-fi)/86400000)+1);
  const diaUltMes=ff.getDate();
  const iniSem=ff.getMonth()<6?new Date(ff.getFullYear(),0,1):new Date(ff.getFullYear(),6,1);
  const diasSem=Math.max(1,Math.floor((ff-Math.max(iniSem,fi))/86400000)+1);
  const anios=diasTot/365;
  const salPend=Math.round((sal/30)*diaUltMes);
  const vac=Math.round((sal*diasTot)/720);
  const prima=Math.round(((sal+aux)*diasSem)/360);
  const ces=Math.round(((sal+aux)*diasTot)/360);
  const intCes=Math.round((ces*diasTot*0.12)/360);
  let indem=0;
  if(tipo==="sin_justa"){
    if(isFijo){
      // Art. 64 CST — Término fijo: salario por el tiempo restante del contrato, mínimo 15 días
      let ffc;
      if(selN.fechaFinContrato) {
        ffc=new Date(selN.fechaFinContrato+"T12:00:00"); // fecha real del contrato
      } else if(durMeses>0) {
        ffc=new Date(fi.getFullYear(),fi.getMonth()+durMeses,fi.getDate()-1);
      } else {
        ffc=new Date(fi.getFullYear()+1,fi.getMonth(),fi.getDate()-1); // fallback 1 año
      }
      const dr=Math.max(0,Math.floor((ffc-ff)/86400000));
      indem=Math.round((sal/30)*Math.max(15,dr));
    } else {
      // Art. 64 CST — Término indefinido
      const sd=sal/30;
      const aniosComp=Math.floor(anios);
      const fraccion=anios-aniosComp;
      if(sal<=10*SMLMV){
        // ≤10 SMLMV: 30d primer año + 20d por cada año adicional (proporcional)
        if(anios<=1) indem=Math.round(30*sd*Math.max(anios,1));
        else indem=Math.round(30*sd + (aniosComp-1+fraccion)*20*sd);
      } else {
        // >10 SMLMV: 20d primer año + 15d por cada año adicional (proporcional)
        if(anios<=1) indem=Math.round(20*sd*Math.max(anios,1));
        else indem=Math.round(20*sd + (aniosComp-1+fraccion)*15*sd);
      }
    }
  }
  const sub=salPend+vac+prima+ces+intCes;
  return {sal,aux,fi,ff,diasTot,diaUltMes,diasSem,anios,isFijo,durMeses,salPend,vac,prima,ces,intCes,indem,sub,total:sub+indem,
    items:[
      {c:"Salario pendiente ("+diaUltMes+" días)",v:salPend,n:"Art. 65 CST"},
      {c:"Vacaciones no disfrutadas",v:vac,n:"Art. 186 CST — "+diasTot+"d/720"},
      {c:"Prima proporcional",v:prima,n:"Art. 306 CST — "+diasSem+"d semestre"},
      {c:"Cesantías proporcionales",v:ces,n:"Art. 249 CST — "+diasTot+"d/360"},
      {c:"Intereses sobre cesantías",v:intCes,n:"Ley 52/1975 — 12%"},
      ...(indem>0?[{c:"Indemnización sin justa causa",v:indem,n:isFijo?"Art. 64 CST — fijo":"Art. 64 CST — indefinido"}]:[]),
    ]};
}

function LiqFinalPanel({selN, calc, fmt, MESES, mes, anio, HAB_LOGO}) {
  const [tipo, setTipo] = useState("renuncia");
  const [fechaSalida, setFechaSalida] = useState(new Date().toISOString().split("T")[0]);
  const liq = calcLiqFinal(selN, tipo, fechaSalida);
  const tipoInfo = TIPOS_TERM.find(t=>t.id===tipo);

  const openPreview = (title, bodyHtml, fileName) => {
    const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${fileName}</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"><\/script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"><\/script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Helvetica,Arial,sans-serif;background:#e5e5e5;padding:20px 0}
#content{background:#fff;width:794px;margin:0 auto;padding:35px 45px;font-size:9pt;color:#111;line-height:1.45;box-shadow:0 0 8px rgba(0,0,0,.15)}
.hdr{border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:14px;overflow:hidden}
.hdr .l{float:left}.hdr .r{float:right;text-align:right;font-size:8pt;color:#666;padding-top:6px}
.hdr img{height:36px}
h1{font-size:12pt;text-align:center;margin:8px 0 6px;clear:both}
.sub{font-size:8pt;color:#666;text-align:center;margin-bottom:12px}
.body{font-size:10pt;line-height:1.7;text-align:justify;margin-bottom:10px}
table{width:100%;border-collapse:collapse;margin:10px 0;font-size:9pt;clear:both}
th{padding:5px 8px;text-align:left;font-size:7pt;font-weight:700;text-transform:uppercase;border-bottom:2px solid #111}
td{padding:4px 8px;border-bottom:1px solid #ddd}.r{text-align:right;font-family:monospace}
.tot td{border-top:2px solid #111;font-weight:700;font-size:10pt;padding:6px 8px}
.checks{margin:14px 0;font-size:10pt;line-height:2}
.sig{margin-top:36px;overflow:hidden}.sig div{float:left;width:48%;text-align:center;font-size:8pt;border-top:1px solid #111;padding-top:6px}.sig div:last-child{float:right}
.foot{font-size:6pt;color:#999;text-align:center;margin-top:14px;clear:both}
.np{text-align:center;margin:16px auto;max-width:794px}
.btn{background:#111;color:#fff;border:none;padding:10px 24px;border-radius:4px;cursor:pointer;font-size:11pt;font-weight:600;margin:0 4px}
.btn2{background:#fff;color:#111;border:1px solid #111;padding:10px 24px;border-radius:4px;cursor:pointer;font-size:11pt;margin:0 4px}
@media print{body{background:#fff;padding:0}.np{display:none}#content{width:100%;margin:0;padding:0;box-shadow:none}}
</style></head><body>
<div id="content">
<div class="hdr"><div class="l"><img src="${HAB_LOGO}" alt="Habitaris"/></div><div class="r"><div style="font-weight:600;color:#111">Habitaris S.A.S</div><div>NIT: 901.922.136-8</div></div></div>
${bodyHtml}
</div>
<div class="np">
<button class="btn" onclick="(function(){var el=document.getElementById('content');el.style.boxShadow='none';document.querySelector('.np').style.display='none';html2canvas(el,{scale:2,useCORS:true,width:el.scrollWidth,windowWidth:el.scrollWidth,backgroundColor:'#fff'}).then(function(c){var img=c.toDataURL('image/jpeg',0.98);var pW=210,pH=(c.height*pW)/c.width;var pdf=new jspdf.jsPDF({orientation:'portrait',unit:'mm',format:'a4'});if(pH<=297){pdf.addImage(img,'JPEG',0,0,pW,pH)}else{var pos=0,pg=0;while(pos<pH){if(pg>0)pdf.addPage();pdf.addImage(img,'JPEG',0,-pos,pW,pH);pos+=297;pg++}}pdf.save('${fileName}.pdf');el.style.boxShadow='0 0 8px rgba(0,0,0,.15)';document.querySelector('.np').style.display=''})})()">📥 Descargar PDF</button>
<button class="btn2" onclick="window.print()">🖨️ Imprimir</button>
</div></body></html>`;
    const w=window.open('','_blank');w.document.write(html);w.document.close();
  };

  const hoy=new Date().toLocaleDateString("es-CO",{day:"numeric",month:"long",year:"numeric"});
  const ape=(selN.nombre||"").split(" ").slice(-2).join("-").toUpperCase();
  const motivo=tipo==="renuncia"?"por renuncia voluntaria":tipo==="vencimiento"?"por vencimiento del término fijo":tipo==="justa_causa"?"por despido con justa causa":"por decisión unilateral sin justa causa";

  return (
    <div>
      {/* Info empleado */}
      <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:8,padding:"14px 18px",marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:15,fontWeight:700}}>{selN.nombre}</div>
          <div style={{fontSize:11,color:T.inkLight}}>{selN.cargo} · CC {selN.cc} · {selN.tipoContrato} {selN.duracionMeses?selN.duracionMeses+"m":""}</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:10,color:T.inkLight}}>Ingreso: {selN.fechaIngreso}</div>
          <div style={{fontSize:10,color:T.inkLight}}>Salida: {fechaSalida}</div>
          <div style={{fontSize:11,fontWeight:700}}>{liq.diasTot} días ({liq.anios.toFixed(1)} años)</div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:12}}>
        {[
          ["Salario base",fmt(liq.sal),T.ink],
          ["Aux. transporte",fmt(liq.aux),T.inkMid],
          ["Tipo",tipoInfo.icon+" "+tipoInfo.label.split(" ")[0],tipoInfo.color],
          ["TOTAL LIQUIDACIÓN",fmt(liq.total),T.green],
        ].map(([l,v,c])=>(
          <div key={l} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:6,padding:"10px 12px",textAlign:"center"}}>
            <div style={{fontSize:8,fontWeight:700,color:T.inkLight,textTransform:"uppercase",letterSpacing:.8}}>{l}</div>
            <div style={{fontSize:l.includes("TOTAL")?18:14,fontWeight:800,color:c,fontFamily:l==="Tipo"?"'DM Sans'":"'DM Mono',monospace"}}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"280px 1fr",gap:12}}>
        {/* Izquierda: Config + Docs */}
        <div>
          <Card accent={T.ink} style={{marginBottom:10}}>
            <STit>Tipo de terminación</STit>
            {TIPOS_TERM.map(t=>(
              <div key={t.id} onClick={()=>setTipo(t.id)} style={{padding:"7px 10px",borderRadius:6,marginBottom:3,cursor:"pointer",background:tipo===t.id?(t.color+"15"):T.surface,border:`1px solid ${tipo===t.id?t.color:T.border}`,fontSize:11,fontWeight:tipo===t.id?600:400}}>
                {t.icon} {t.label}{t.indemniza&&<span style={{fontSize:9,color:T.red,marginLeft:4,fontWeight:600}}>+ Indemnización</span>}
              </div>
            ))}
            <div style={{marginTop:10}}>
              <div style={{fontSize:9,fontWeight:700,color:T.inkLight,letterSpacing:.8,textTransform:"uppercase",marginBottom:3}}>Fecha de salida</div>
              <input type="date" value={fechaSalida} onChange={e=>setFechaSalida(e.target.value)} style={{width:"100%",padding:"6px 10px",border:`1px solid ${T.border}`,borderRadius:6,fontSize:12,fontFamily:"'DM Sans',sans-serif"}}/>
            </div>
          </Card>

          <Card accent={T.ink}>
            <STit>📄 Documentos</STit>
            {[
              {id:"carta",lbl:"Carta terminación + Liquidación",icon:"📄",color:T.ink,bg:T.surface},
              {id:"paz",lbl:"Paz y salvo",icon:"✅",color:T.green,bg:T.greenBg},
              {id:"cesantias",lbl:"Carta retiro de cesantías",icon:"🏦",color:T.amber,bg:T.amberBg},
              {id:"cert_con",lbl:"Certificación laboral (con salario)",icon:"📋",color:T.blue,bg:T.blueBg},
              {id:"cert_sin",lbl:"Certificación laboral (sin salario)",icon:"📋",color:T.inkMid,bg:T.surface},
            ].map(d=>(
              <button key={d.id} onClick={()=>{
                const fn = d.id.startsWith("cert") ? `CERT-LAB-${ape}` : d.id==="carta" ? `CARTA-TERM-${ape}` : d.id==="paz" ? `PAZ-SALVO-${ape}` : `RETIRO-CES-${ape}`;
                let body = "";
                if(d.id==="carta"){
                  body=`<h1>CARTA DE TERMINACIÓN Y LIQUIDACIÓN</h1><div class="body"><p>Bogotá D.C., ${hoy}</p><br/><p>Señor(a) <b>${selN.nombre}</b><br/>C.C. ${(selN.cc||"").replace(/\D/g,"")}</p><br/><p>Comunicamos la terminación de su contrato <b>${motivo}</b>, efectiva el <b>${liq.ff.toLocaleDateString("es-CO",{day:"numeric",month:"long",year:"numeric"})}</b>.</p><br/><p>Cargo: <b>${selN.cargo}</b> · Ingreso: <b>${liq.fi.toLocaleDateString("es-CO",{day:"numeric",month:"long",year:"numeric"})}</b> · ${liq.diasTot} días trabajados.</p></div><table><thead><tr><th>Concepto</th><th class="r">Valor</th><th>Base legal</th></tr></thead><tbody>${liq.items.map(i=>"<tr><td>"+i.c+"</td><td class='r'>"+fmt(i.v)+"</td><td style='font-size:8pt;color:#666'>"+i.n+"</td></tr>").join("")}<tr class="tot"><td>TOTAL A PAGAR</td><td class="r">${fmt(liq.total)}</td><td></td></tr></tbody></table><div class="sig"><div>Empleador<br/><b>Habitaris S.A.S</b></div><div>Trabajador<br/><b>${selN.nombre}</b></div></div><div class="foot">Habitaris Suite · ${hoy}</div>`;
                } else if(d.id==="paz"){
                  body=`<h1>PAZ Y SALVO</h1><div class="body"><p><b>HABITARIS S.A.S</b> certifica que <b>${selN.nombre}</b>, C.C. ${(selN.cc||"").replace(/\D/g,"")}, quien laboró como <b>${selN.cargo}</b> desde el ${liq.fi.toLocaleDateString("es-CO",{day:"numeric",month:"long",year:"numeric"})} hasta el ${liq.ff.toLocaleDateString("es-CO",{day:"numeric",month:"long",year:"numeric"})}, se encuentra a <b>PAZ Y SALVO</b>:</p></div><div class="checks"><p>☑ Salarios y prestaciones sociales</p><p>☑ Liquidación final</p><p>☑ Vacaciones</p><p>☑ Dotación y herramientas</p><p>☑ Documentos y archivos</p><p>☑ Llaves y accesos</p></div><div class="body"><p>Bogotá D.C., ${hoy}</p></div><div class="sig"><div>Empleador<br/><b>Habitaris S.A.S</b></div><div>Trabajador<br/><b>${selN.nombre}</b></div></div><div class="foot">Habitaris Suite · ${hoy}</div>`;
                } else if(d.id==="cesantias"){
                  body=`<h1>CARTA DE RETIRO DE CESANTÍAS</h1><div class="body"><p>Bogotá D.C., ${hoy}</p><br/><p>Señores<br/><b>${selN.pen||"Fondo de Cesantías"}</b></p><br/><p>Ref: Retiro de cesantías por terminación de contrato</p><br/><p><b>HABITARIS S.A.S</b>, NIT 901.922.136-8, certifica que <b>${selN.nombre}</b>, C.C. <b>${(selN.cc||"").replace(/\D/g,"")}</b>, laboró desde el <b>${liq.fi.toLocaleDateString("es-CO",{day:"numeric",month:"long",year:"numeric"})}</b> hasta el <b>${liq.ff.toLocaleDateString("es-CO",{day:"numeric",month:"long",year:"numeric"})}</b> (${liq.diasTot} días).</p><br/><p>La relación laboral terminó <b>${motivo}</b>. El monto de cesantías proporcionales: <b>${fmt(liq.ces)}</b> (Art. 249 CST).</p><br/><p>Solicitamos autorizar el retiro de cesantías a favor del trabajador.</p></div><div class="sig"><div>Representante Legal<br/><b>Habitaris S.A.S</b></div><div>Trabajador<br/><b>${selN.nombre}</b></div></div><div class="foot">Habitaris Suite · ${hoy}</div>`;
                } else if(d.id==="cert_con"){
                  body=`<h1>CERTIFICACIÓN LABORAL</h1><div class="body"><p>El suscrito representante legal de <b>HABITARIS S.A.S</b>, NIT 901.922.136-8, certifica que:</p><br/><p><b>${selN.nombre}</b>, C.C. No. <b>${(selN.cc||"").replace(/\D/g,"")}</b>, ${selN.fechaIngreso?"laboró":"labora"} en esta empresa desde el <b>${liq.fi.toLocaleDateString("es-CO",{day:"numeric",month:"long",year:"numeric"})}</b>, desempeñando el cargo de <b>${selN.cargo}</b>.</p><br/><p>El trabajador devenga un salario mensual de <b>${fmt(selN.sal)}</b>${liq.aux>0?" (más auxilio de transporte de "+fmt(liq.aux)+")":""}.</p><br/><p>Se expide a solicitud del interesado en Bogotá D.C., ${hoy}.</p></div><div class="sig"><div><br/><b>Representante Legal</b><br/>Habitaris S.A.S</div></div><div class="foot">Habitaris Suite · ${hoy}</div>`;
                } else {
                  body=`<h1>CERTIFICACIÓN LABORAL</h1><div class="body"><p>El suscrito representante legal de <b>HABITARIS S.A.S</b>, NIT 901.922.136-8, certifica que:</p><br/><p><b>${selN.nombre}</b>, C.C. No. <b>${(selN.cc||"").replace(/\D/g,"")}</b>, ${selN.fechaIngreso?"laboró":"labora"} en esta empresa desde el <b>${liq.fi.toLocaleDateString("es-CO",{day:"numeric",month:"long",year:"numeric"})}</b>, desempeñando el cargo de <b>${selN.cargo}</b>.</p><br/><p>Se expide a solicitud del interesado en Bogotá D.C., ${hoy}.</p></div><div class="sig"><div><br/><b>Representante Legal</b><br/>Habitaris S.A.S</div></div><div class="foot">Habitaris Suite · ${hoy}</div>`;
                }
                openPreview(d.lbl, body, fn);
              }} style={{width:"100%",padding:"7px 10px",fontSize:11,fontWeight:600,border:`1px solid ${d.color}`,borderRadius:6,background:d.bg,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",color:d.color,marginBottom:4,textAlign:"left"}}>
                {d.icon} {d.lbl}
              </button>
            ))}
          </Card>
        </div>

        {/* Derecha: Desglose */}
        <Card accent={tipoInfo.color}>
          <STit>Desglose de la liquidación</STit>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead>
              <tr style={{borderBottom:`2px solid ${T.ink}`}}>
                <th style={{padding:"6px 8px",textAlign:"left",fontSize:9,fontWeight:700,color:T.inkLight,letterSpacing:.8,textTransform:"uppercase"}}>Concepto</th>
                <th style={{padding:"6px 8px",textAlign:"right",fontSize:9,fontWeight:700,color:T.inkLight,letterSpacing:.8,textTransform:"uppercase"}}>Valor</th>
                <th style={{padding:"6px 8px",textAlign:"left",fontSize:9,fontWeight:700,color:T.inkLight,letterSpacing:.8,textTransform:"uppercase"}}>Base legal</th>
              </tr>
            </thead>
            <tbody>
              {liq.items.map((item,i)=>(
                <tr key={i} style={{borderBottom:`1px solid ${T.border}`,background:item.c.includes("Indemnización")?T.redBg:"transparent"}}>
                  <td style={{padding:"6px 8px"}}>{item.c}</td>
                  <td style={{padding:"6px 8px",textAlign:"right",fontFamily:"'DM Mono',monospace",fontWeight:600,fontSize:13}}>{fmt(item.v)}</td>
                  <td style={{padding:"6px 8px",fontSize:10,color:T.inkMid}}>{item.n}</td>
                </tr>
              ))}
              <tr style={{borderTop:`2px solid ${T.ink}`,background:T.greenBg}}>
                <td style={{padding:"8px",fontSize:14,fontWeight:800}}>TOTAL A PAGAR</td>
                <td style={{padding:"8px",textAlign:"right",fontFamily:"'DM Mono',monospace",fontWeight:800,fontSize:20,color:T.green}}>{fmt(liq.total)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>

          {/* Fórmulas */}
          <div style={{marginTop:14,padding:"10px 12px",background:T.surface,borderRadius:6,fontSize:10,color:T.inkMid,lineHeight:1.6}}>
            <strong style={{color:T.ink}}>📐 Fórmulas aplicadas</strong>
            <div>Vacaciones = Sal × {liq.diasTot}d ÷ 720 = {fmt(liq.vac)}</div>
            <div>Prima = (Sal+Aux) × {liq.diasSem}d sem ÷ 360 = {fmt(liq.prima)}</div>
            <div>Cesantías = (Sal+Aux) × {liq.diasTot}d ÷ 360 = {fmt(liq.ces)}</div>
            <div>Int. cesantías = {fmt(liq.ces)} × {liq.diasTot}d × 12% ÷ 360 = {fmt(liq.intCes)}</div>
            {liq.indem>0&&<div style={{color:T.red,fontWeight:600}}>Indemnización ({liq.isFijo?"término fijo":"indefinido"}) = {fmt(liq.indem)}</div>}
          </div>
        </Card>
      </div>
    </div>
  );
}

export function TabNomina(){
  const hoy=new Date();
  const[anio,setAnio]=useState(hoy.getFullYear());
  const[mes,setMes]=useState(hoy.getMonth());
  const[noms,setNoms]=useState([]);
  const[loading,setLoading]=useState(true);
  const[guard,setGuard]=useState(false);
  const[sel,setSel]=useState(null);
  const[vista,setVista]=useState("lista");
  const[subTab,setSubTab]=useState("nomina");
  const holidays=useMemo(()=>getHolidays(anio),[anio]);
  const festivosMes=holidays.filter(h=>h.date.getMonth()===mes);
  const [novDias,setNovDias]=useState({});  // {dayKey: novType}
  const [selNovTipo,setSelNovTipo]=useState("incapacidad");
  const [novHist,setNovHist]=useState([]);
  const [novYear,setNovYear]=useState(hoy.getFullYear());
  const [buscar,setBuscar]=useState("");
  const [sortBy,setSortBy]=useState("nombre");
  const [sortDir,setSortDir]=useState("asc");

  useEffect(()=>{
    setLoading(true);
    const hols=getHolidays(anio);
    // Count festivos on work days (Mon-Sat) for this month
    const festCount=hols.filter(h=>h.date.getMonth()===mes&&h.date.getDay()!==0).length;
    Promise.all([fetchEmps(),loadN(anio,mes)]).then(([emps,saved])=>{
      const ex=saved||[];
      const lista=emps.map(e=>{const f=ex.find(n=>n.empId===e.id);if(f){if(f.festMes===undefined)f.festMes=festCount;if(!f.fechaFinContrato)f.fechaFinContrato=e.fecha_fin_contrato||"";if(!f.duracionMeses)f.duracionMeses=e.duracion_meses||0;if(!f.fechaIngreso)f.fechaIngreso=e.fecha_inicio||"";if(!f.tipoContrato)f.tipoContrato=e.tipo_contrato||"";if(!f.modalidadPago){f.modalidadPago=e.modalidad_pago||"quincenal";if(f.modalidadPago==="mensual"&&f.q1Pct>0)f.q1Pct=0;}return f;}
        return{id:uid(),empId:e.id,nombre:e.candidato_nombre||"",cc:e.candidato_cc||"",cargo:e.cargo||"",sal:e.salario_base||SMLMV,bono:e.bono_no_salarial||0,bonoConcepto:e.bono_concepto||"",bonoPrest:e.bono_es_salarial||false,dias:30,festMes:festCount,reg:e.regimen_salud||"contributivo",arl:e.arl_nivel||0,ex114:true,q1Pct:(e.modalidad_pago||"quincenal")==="mensual"?0:0.5,modalidadPago:e.modalidad_pago||"quincenal",hexD:0,hexN:0,hexDD:0,hexDN:0,festLab:0,diasIncap:0,diasLicRem:0,diasLicNoRem:0,diasVac:0,otrosIng:0,otrasDed:0,nov:"",estado:"borrador",eps:e.candidato_eps||"",pen:e.candidato_pension||"",banco:e.entidadBancaria||"",cuenta:e.cuentaBancaria||"",fechaIngreso:e.fecha_inicio||"",tipoContrato:e.tipo_contrato||"Término fijo",duracionMeses:e.duracion_meses||0,fechaFinContrato:e.fecha_fin_contrato||"",auxT:e.auxilio_transporte||AUX_TR,netoRef:e.salario_neto||0,anio,mes};});
      setNoms(lista);setLoading(false);
    });
  },[anio,mes]);

  const selN=useMemo(()=>noms.find(n=>n.id===sel),[noms,sel]);
  const calc=useMemo(()=>selN?calcN(selN):null,[selN]);
  const upd=(id,f)=>setNoms(p=>p.map(n=>n.id===id?{...n,...f}:n));
  const guardar=async()=>{setGuard(true);await saveN(anio,mes,noms);setGuard(false);};
  const totN=noms.reduce((s,n)=>s+calcN(n).neto,0);
  const totC=noms.reduce((s,n)=>s+calcN(n).costoT,0);
  const totQ1=noms.reduce((s,n)=>s+calcN(n).q1,0);
  const totQ2=noms.reduce((s,n)=>s+calcN(n).q2,0);

  if(vista==="detalle"&&selN&&calc){
    const ed=selN.estado==="borrador";
    const u=(f)=>upd(selN.id,f);
    return(
      <div className="fade-up" style={{maxWidth:1050,margin:"0 auto"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
          <Btn onClick={()=>{setVista("lista");setSubTab("nomina");}}>← Volver</Btn>
          <div style={{flex:1}}><div style={{fontSize:16,fontWeight:700}}>{selN.nombre}</div><div style={{fontSize:11,color:T.inkLight}}>{selN.cargo} · {selN.cc} · {MESES[mes]} {anio} · <span style={{fontWeight:600,color:selN.modalidadPago==="mensual"?T.ink:T.blue}}>{selN.modalidadPago==="mensual"?"Pago mensual":"Pago quincenal"}</span></div></div>
          {ed&&<Btn pri small onClick={()=>u({estado:"aprobada"})}>✓ Aprobar</Btn>}
          <Btn pri small onClick={guardar} disabled={guard}>{guard?"…":"💾 Guardar"}</Btn>
          <Btn small onClick={()=>{window.open("https://wa.me/?text="+encodeURIComponent("Habitaris\n\n👤 Portal del empleado:\nhttps://suite.habitaris.co/empleado\n\nIngresa tu cédula y PIN (últimos 4 dígitos de tu cédula)"),"_blank");}}>💬 Link empleados</Btn>
          <Btn small onClick={()=>{
            const nDias=selN.novDias||{};
            const novList=Object.entries(nDias).sort().map(([k,v])=>{const d=new Date(k+"T12:00:00");const info=NOV_TIPOS.find(n=>n.id===v);return{fecha:d.toLocaleDateString("es-CO",{weekday:"short",day:"numeric",month:"short"}),tipo:info?.label||v};});
            const festList=festivosMes.map(h=>({fecha:h.date.toLocaleDateString("es-CO",{weekday:"short",day:"numeric",month:"short"}),name:h.name}));
            const mAbr=MESES[mes].substring(0,3).toUpperCase();const a2=String(anio).slice(-2);
            const ape=(selN.nombre||"").split(" ").slice(-2).join("-").toUpperCase();
            const fileName=`NOV-${mAbr}${a2}-${ape}-${selN.cc||""}`;
            const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${fileName}</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"><\/script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"><\/script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Helvetica,Arial,sans-serif;background:#e5e5e5;margin:0;padding:20px 0}
#content{background:#fff;width:794px;margin:0 auto;padding:35px 45px;font-size:9pt;color:#111;line-height:1.35;box-shadow:0 0 8px rgba(0,0,0,.15)}
.hdr{border-bottom:2px solid #111;padding-bottom:6px;margin-bottom:10px;overflow:hidden}
.hdr .l{float:left}.hdr .r{float:right;text-align:right;font-size:8pt;color:#666;padding-top:6px}
.hdr img{height:36px}
h1{font-size:12pt;text-align:center;margin:4px 0 2px;clear:both}
h2{font-size:9.5pt;margin:10px 0 4px;border-bottom:1px solid #ccc;padding-bottom:2px;clear:both}
.sub{font-size:8pt;color:#666;text-align:center;margin-bottom:10px}
.info{margin-bottom:10px;font-size:8.5pt;overflow:hidden}.info div{float:left;width:50%;padding:1px 0}
.info span{color:#666}.info b{color:#111}
table{width:100%;border-collapse:collapse;margin-bottom:8px;font-size:8.5pt;clear:both}
th{text-align:left;padding:4px 6px;font-size:7pt;font-weight:700;text-transform:uppercase;border-bottom:2px solid #111}
td{padding:3px 6px;border-bottom:1px solid #ddd}
.fest{background:#f9f9f9}.nov{background:#f4f4f4}
.summary{margin:8px 0;overflow:hidden}
.sbox{float:left;width:31%;margin-right:3%;border:1px solid #ccc;border-radius:4px;padding:6px;text-align:center;margin-bottom:6px}
.sbox:nth-child(3n){margin-right:0}
.sbox .n{font-size:16pt;font-weight:800;font-family:monospace}.sbox .l{font-size:7pt;color:#666;text-transform:uppercase}
.sig{margin-top:20px;overflow:hidden}.sig div{float:left;width:30%;margin-right:5%;text-align:center;font-size:8pt;border-top:1px solid #111;padding-top:5px}
.sig div:last-child{margin-right:0}
.foot{font-size:6.5pt;color:#999;text-align:center;margin-top:10px;clear:both}
.np{text-align:center;margin:16px auto;max-width:794px}
.btn{background:#111;color:#fff;border:none;padding:10px 24px;border-radius:4px;cursor:pointer;font-size:11pt;font-weight:600;margin:0 4px}
.btn2{background:#fff;color:#111;border:1px solid #111;padding:10px 24px;border-radius:4px;cursor:pointer;font-size:11pt;margin:0 4px}
@media print{body{background:#fff;padding:0}.np{display:none}#content{width:100%;margin:0;padding:0;box-shadow:none}}
</style></head><body>
<div id="content">
<div class="hdr"><div class="l"><img src="${HAB_LOGO}" alt="Habitaris"/></div><div class="r"><div style="font-weight:600;color:#111">Habitaris S.A.S</div><div>NIT: 901.922.136-8</div></div></div>
<h1>REPORTE DE NOVEDADES DE NÓMINA</h1>
<div class="sub">${MESES[mes]} ${anio} · Ref: ${fileName}</div>
<div class="info">
<div><span>Empleado: </span><b>${selN.nombre}</b></div>
<div><span>Documento: </span><b>${selN.cc}</b></div>
<div><span>Cargo: </span><b>${selN.cargo}</b></div>
<div><span>Contrato: </span><b>${selN.tipoContrato||"fijo"}</b></div>
<div><span>EPS: </span><b>${selN.eps||"—"}</b></div>
<div><span>Pensión: </span><b>${selN.pen||"—"}</b></div>
<div><span>Banco: </span><b>${selN.banco||"—"}</b></div>
<div><span>Cuenta: </span><b>${selN.cuenta||"—"}</b></div>
</div>
<h2>Festivos del mes</h2>
<table><thead><tr><th>Fecha</th><th>Motivo</th></tr></thead><tbody>
${festList.length>0?festList.map(f=>`<tr class="fest"><td>${f.fecha}</td><td>${f.name}</td></tr>`).join(""):`<tr><td colspan="2" style="color:#999;text-align:center">Sin festivos</td></tr>`}
</tbody></table>
<h2>Novedades registradas</h2>
<table><thead><tr><th>Fecha</th><th>Tipo</th><th>Observación</th></tr></thead><tbody>
${novList.length>0?novList.map(n=>`<tr class="nov"><td>${n.fecha}</td><td>${n.tipo}</td><td></td></tr>`).join(""):`<tr><td colspan="3" style="color:#999;text-align:center">Sin novedades</td></tr>`}
</tbody></table>
<h2>Resumen del período</h2>
<div class="summary">
<div class="sbox"><div class="n">${calc.dias}</div><div class="l">Días salario</div></div>
<div class="sbox"><div class="n">${calc.festMes}</div><div class="l">Festivos (L-S)</div></div>
<div class="sbox"><div class="n">${selN.diasLicRem||0}</div><div class="l">Lic. remunerada</div></div>
<div class="sbox"><div class="n">${calc.diasComm}</div><div class="l">Días transporte</div></div>
<div class="sbox"><div class="n">${calc.diasAsist}</div><div class="l">Días asistidos</div></div>
<div class="sbox"><div class="n">${selN.diasIncap||0}</div><div class="l">Incapacidad</div></div>
</div>
<h2>Impacto en nómina</h2>
<table><thead><tr><th>Concepto</th><th>Días</th><th style="text-align:right">Valor</th><th>Observación</th></tr></thead><tbody>
<tr><td>Salario base</td><td>${calc.dias}/30</td><td style="font-family:monospace;text-align:right">${fmt(calc.salProp)}</td><td>Lic.rem NO reduce salario</td></tr>
<tr><td>Aux. transporte</td><td>${calc.diasComm}/30</td><td style="font-family:monospace;text-align:right">${fmt(calc.aux)}</td><td>Incl. festivos, excl. novedades</td></tr>
<tr><td>Bono asistencia</td><td>${calc.diasAsist}/30</td><td style="font-family:monospace;text-align:right">${fmt(calc.bono)}</td><td>Excl. festivos y novedades</td></tr>
<tr style="font-weight:700;border-top:2px solid #111"><td>Total devengado</td><td></td><td style="font-family:monospace;text-align:right">${fmt(calc.dev)}</td><td></td></tr>
<tr><td>EPS (4%)</td><td></td><td style="font-family:monospace;text-align:right">-${fmt(calc.epsE)}</td><td>IBC: ${fmt(calc.ibc)}</td></tr>
<tr><td>Pensión (4%)</td><td></td><td style="font-family:monospace;text-align:right">-${fmt(calc.penE)}</td><td>IBC: ${fmt(calc.ibc)}</td></tr>
<tr style="font-weight:700;background:#f0f0f0"><td>Neto a pagar</td><td></td><td style="font-family:monospace;text-align:right;font-size:11pt">${fmt(calc.neto)}</td><td></td></tr>
<tr><td style="padding-left:16px">Q1 anticipo</td><td></td><td style="font-family:monospace;text-align:right">${fmt(calc.q1)}</td><td>15 ${MESES[mes].toLowerCase()}</td></tr>
<tr><td style="padding-left:16px">Q2 ajuste</td><td></td><td style="font-family:monospace;text-align:right">${fmt(calc.q2)}</td><td>Fin de mes</td></tr>
</tbody></table>
<div class="sig">
<div>Elaborado por<br><span style="color:#999">RRHH Habitaris</span></div>
<div>Revisado por<br><span style="color:#999">Contador</span></div>
<div>Aprobado por<br><span style="color:#999">Gerencia</span></div>
</div>
<div class="foot">Habitaris Suite · ${new Date().toLocaleDateString("es-CO",{day:"numeric",month:"long",year:"numeric"})} · ${fileName}</div>
</div>
<div class="np">
<button class="btn" onclick="(function(){var el=document.getElementById('content');el.style.boxShadow='none';document.querySelector('.np').style.display='none';var st=document.createElement('div');st.style.cssText='text-align:center;padding:10px;font-family:monospace;color:#999';st.textContent='Generando PDF...';document.body.appendChild(st);html2canvas(el,{scale:2,useCORS:true,width:el.scrollWidth,windowWidth:el.scrollWidth,backgroundColor:'#fff'}).then(function(canvas){var img=canvas.toDataURL('image/jpeg',0.98);var iW=canvas.width,iH=canvas.height,pW=210,pH=(iH*pW)/iW;var J=jspdf.jsPDF;var pdf=new J({orientation:'portrait',unit:'mm',format:'a4'});if(pH<=297){pdf.addImage(img,'JPEG',0,0,pW,pH)}else{var pos=0,pg=0;while(pos<pH){if(pg>0)pdf.addPage();pdf.addImage(img,'JPEG',0,-pos,pW,pH);pos+=297;pg++}}pdf.save('${fileName}.pdf');st.textContent='PDF descargado ✅';el.style.boxShadow='0 0 8px rgba(0,0,0,.15)';document.querySelector('.np').style.display='';}).catch(function(e){st.textContent='Error: '+e.message;document.querySelector('.np').style.display=''})})()">📥 Descargar PDF</button>
<button class="btn2" onclick="window.print()">🖨️ Imprimir</button>
</div>
</body></html>`;
            const w=window.open('','_blank');w.document.write(html);w.document.close();
          }}>📄 Reporte novedades</Btn>
          <Pill e={selN.estado}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:selN.modalidadPago==="mensual"?"repeat(3,1fr)":"repeat(5,1fr)",gap:8,marginBottom:14}}>
          {(selN.modalidadPago==="mensual"
            ?[["Devengado",calc.dev,T.ink],["Deducciones",calc.totD,T.red],["Neto mes",calc.neto,T.green]]
            :[["Devengado",calc.dev,T.ink],["Deducciones",calc.totD,T.red],["Neto mes",calc.neto,T.green],["Q1 anticipo",calc.q1,T.blue],["Q2 ajuste",calc.q2,calc.q2>=0?T.green:T.red]]
          ).map(([l,v,c])=>(
            <div key={l} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:6,padding:"10px 12px",textAlign:"center"}}>
              <div style={{fontSize:8,fontWeight:700,color:T.inkLight,textTransform:"uppercase",letterSpacing:.8,marginBottom:2}}>{l}</div>
              <div style={{fontSize:17,fontWeight:800,color:c,fontFamily:"'DM Mono',monospace"}}>{fmt(v)}</div>
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:0,marginBottom:14,borderBottom:`1px solid ${T.border}`}}>
          {[{id:"nomina",lbl:"💰 Nómina"},{id:"novedades",lbl:"📋 Novedades"},{id:"asistencia",lbl:"📍 Asistencia"},{id:"descargables",lbl:"📥 Descargables"},{id:"liqfinal",lbl:"🚪 Liquidación Final"}].map(t=>(
            <button key={t.id} onClick={()=>setSubTab(t.id)} style={{padding:"8px 16px",fontSize:11,fontWeight:subTab===t.id?700:400,border:"none",borderBottom:subTab===t.id?`2px solid ${T.ink}`:"2px solid transparent",background:"transparent",color:subTab===t.id?T.ink:T.inkLight,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>{t.lbl}</button>
          ))}
        </div>

        {subTab==="nomina"&&(
          <div>
            {/* ── CALENDARIO + NOVEDADES ── */}
            <Card accent={T.ink} style={{marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <STit>📅 Calendario {MESES[mes]} {anio}</STit>
              </div>
              <div style={{display:"flex",gap:4,marginBottom:8,flexWrap:"wrap"}}>
                <span style={{fontSize:9,color:T.inkLight,padding:"4px 0"}}>Clic en día →</span>
                {NOV_TIPOS.filter(n=>n.id!=="normal").map(n=><button key={n.id} type="button" onClick={()=>setSelNovTipo(n.id)} style={{padding:"3px 8px",fontSize:10,fontWeight:selNovTipo===n.id?700:400,border:selNovTipo===n.id?"2px solid #111":"1px solid "+T.border,borderRadius:4,background:selNovTipo===n.id?n.color:"#fff",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",opacity:selNovTipo===n.id?1:0.6}}>{n.icon} {n.label}</button>)}
              </div>
              {/* Calendar grid */}
              {(()=>{
                const firstDay=new Date(anio,mes,1);
                const lastDay=new Date(anio,mes+1,0);
                const startPad=(firstDay.getDay()+6)%7; // Monday=0
                const totalDays=lastDay.getDate();
                const nDias=selN.novDias||{};
                // Count novedades
                const counts={incapacidad:0,vacaciones:0,licencia:0,licNoRem:0,ausencia:0};
                Object.values(nDias).forEach(v=>{if(counts[v]!==undefined)counts[v]++;});
                const diasNoLab=counts.incapacidad+counts.vacaciones+counts.licencia+counts.licNoRem+counts.ausencia;
                const diasLab=Math.max(0,30-diasNoLab);
                const diasSalario=Math.max(0,30-(counts.incapacidad+counts.vacaciones+counts.licNoRem+counts.ausencia)); // Lic rem NO reduce salario

                const toggleDay=(day)=>{
                  if(!ed)return;
                  const k=anio+"-"+String(mes+1).padStart(2,"0")+"-"+String(day).padStart(2,"0");
                  const cur={...nDias};
                  const wasSet=cur[k]===selNovTipo;
                  if(wasSet)delete cur[k]; else cur[k]=selNovTipo;
                  // Update counts
                  const nc={incapacidad:0,vacaciones:0,licencia:0,licNoRem:0,ausencia:0};
                  Object.values(cur).forEach(v=>{if(nc[v]!==undefined)nc[v]++;});
                  // Licencia remunerada NO reduce días (trabajador sigue cobrando)
                  // Solo reducen: incapacidad, lic NO rem, ausencia, vacaciones
                  const diasRed = nc.incapacidad + nc.vacaciones + nc.licNoRem + nc.ausencia;
                  u({novDias:cur,dias:Math.max(0,30-diasRed),diasIncap:nc.incapacidad,diasVac:nc.vacaciones,diasLicRem:nc.licencia,diasLicNoRem:nc.licNoRem});
                  // Sync to hr_novelties
                  const tipoMap={incapacidad:"incapacidad",vacaciones:"vacaciones",licencia:"licencia_remunerada",licNoRem:"licencia_no_remunerada",ausencia:"ausencia"};
                  const apiTipo=tipoMap[selNovTipo]||selNovTipo;
                  if(wasSet){
                    // Remove from hr_novelties
                    fetch("/api/novelties",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({employee_id:selN.empId,fecha_inicio:k,tipo:apiTipo})}).catch(()=>{});
                  } else {
                    // Add to hr_novelties (auto-approved from RRHH)
                    fetch("/api/novelties",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({employee_id:selN.empId,employee_nombre:selN.nombre,tipo:apiTipo,fecha_inicio:k,fecha_fin:k,motivo:"Registrado por RRHH",source:"rrhh"})}).catch(()=>{});
                  }
                };

                return <>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:8}}>
                    {DL_SHORT.map(d=><div key={d} style={{textAlign:"center",fontSize:8,fontWeight:700,color:T.inkLight,padding:"2px 0"}}>{d}</div>)}
                    {Array.from({length:startPad}).map((_,i)=><div key={"p"+i}/>)}
                    {Array.from({length:totalDays}).map((_,i)=>{
                      const day=i+1;
                      const k=anio+"-"+String(mes+1).padStart(2,"0")+"-"+String(day).padStart(2,"0");
                      const date=new Date(anio,mes,day);
                      const dow=date.getDay(); // 0=Sun
                      const isSun=dow===0;
                      const hol=holidays.find(h=>sameDay(h.date,date));
                      const isRest=isSun||!!hol; // Festivos = descanso remunerado
                      const nov=nDias[k];
                      const novInfo=nov?NOV_TIPOS.find(n=>n.id===nov):null;
                      const isToday=sameDay(date,new Date());

                      return <div key={day} onClick={()=>!isRest&&toggleDay(day)} title={hol?("🔶 "+hol.name+" — Descanso remunerado"):(novInfo?novInfo.label:"")} style={{
                        textAlign:"center",padding:"4px 2px",borderRadius:4,fontSize:11,fontWeight:isToday?800:(hol?700:400),
                        cursor:isRest||!ed?"default":"pointer",
                        background:novInfo?novInfo.color:hol?"#FDE68A":isSun?"#F5F4F1":"transparent",
                        color:isRest?"#999":isToday?"#1E6B42":"#111",
                        border:isToday?`2px solid #1E6B42`:"2px solid transparent",
                        position:"relative",opacity:isSun?0.4:1
                      }}>
                        {day}
                        {hol&&<div style={{fontSize:6,color:"#D97706",lineHeight:1,marginTop:1}}>🔶</div>}
                        {isSun&&!hol&&<div style={{fontSize:6,color:"#ccc",lineHeight:1,marginTop:1}}>—</div>}
                        {novInfo&&<div style={{fontSize:7,lineHeight:1,marginTop:1}}>{novInfo.icon}</div>}
                      </div>;
                    })}
                  </div>
                  {/* Leyenda y resumen */}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                      {festivosMes.map((h,i)=><span key={i} style={{fontSize:9,color:T.amber,background:T.amberBg,padding:"2px 6px",borderRadius:4}}>🔶 {h.date.getDate()} {h.name}</span>)}
                    </div>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      {NOV_TIPOS.filter(n=>n.id!=="normal").map(n=>{const c=counts[n.id]||0;return c>0?<span key={n.id} style={{fontSize:9,background:n.color,padding:"2px 6px",borderRadius:4,fontWeight:600}}>{n.icon} {n.label}: {c}d</span>:null;})}
                      <span style={{fontSize:9,background:T.greenBg,padding:"2px 6px",borderRadius:4,fontWeight:700,color:T.green}}>Sal: {diasSalario}d</span>
                      {diasSalario!==diasLab&&<span style={{fontSize:9,background:T.accent,padding:"2px 6px",borderRadius:4,color:T.inkLight}}>Asist: {diasLab}d</span>}
                    </div>
                  </div>
                </>;
              })()}
            </Card>

            <div style={{display:"grid",gridTemplateColumns:"260px 1fr 1fr",gap:12}}>
            <div>
              <Card accent={T.ink}><STit>Período</STit>
                <Inp label="Días laborados" type="number" value={selN.dias} onChange={v=>u({dias:v})} suf="/30" disabled={!ed} small/>
                <Inp label="Festivos en días lab." type="number" value={selN.festMes||0} onChange={v=>u({festMes:v})} suf="días" disabled={!ed} small/>
                <Inp label="Festivos trabajados" type="number" value={selN.festLab||0} onChange={v=>u({festLab:v})} suf="días" disabled={!ed} small/>
                {festivosMes.length>0&&<div style={{fontSize:9,color:T.amber,background:T.amberBg,borderRadius:3,padding:"5px 8px",marginBottom:6}}>📅 {festivosMes.length} festivos: {festivosMes.map(h=>h.date.getDate()+" "+h.name).join(", ")}</div>}
                <div style={{fontSize:9,color:T.inkLight,background:T.accent,borderRadius:3,padding:"5px 8px"}}>
                  Sal: {selN.dias}d · Asist: {(selN.dias||30)-(selN.festMes||0)}d · Fest: {selN.festMes||0}d
                </div>
              </Card>
              <Card accent={T.purple}><STit>Horas extra</STit>
                <Inp label="HE diurna (×1.25)" type="number" value={selN.hexD||0} onChange={v=>u({hexD:v})} suf="h" small disabled={!ed}/>
                <Inp label="HE nocturna (×1.75)" type="number" value={selN.hexN||0} onChange={v=>u({hexN:v})} suf="h" small disabled={!ed}/>
                <Inp label="HE dom/fest diurna (×2.0)" type="number" value={selN.hexDD||0} onChange={v=>u({hexDD:v})} suf="h" small disabled={!ed}/>
                <Inp label="HE dom/fest noct. (×2.5)" type="number" value={selN.hexDN||0} onChange={v=>u({hexDN:v})} suf="h" small disabled={!ed}/>
                {calc.totHex>0&&<div style={{fontSize:10,fontFamily:"'DM Mono',monospace",color:T.purple,marginTop:2}}>Total: {fmt(calc.totHex)}</div>}
              </Card>
              <Card><STit>Parámetros</STit>
                <Inp label="Salario base" type="number" value={selN.sal} onChange={v=>u({sal:v})} suf="COP" disabled={!ed} small/>
                <Inp label="Bono (Art.128)" type="number" value={selN.bono} onChange={v=>u({bono:v})} suf="COP" disabled={!ed} small/>
                {selN.modalidadPago!=="mensual"&&<Inp label="Anticipo Q1 (%)" type="number" value={(selN.q1Pct||0.5)*100} onChange={v=>u({q1Pct:v/100})} suf="%" disabled={!ed} small/>}
                <Sel label="Régimen" value={selN.reg} onChange={v=>u({reg:v})} opts={[{v:"contributivo",l:"Contributivo (EPS)"},{v:"subsidiado",l:"Subsidiado (SISBEN)"}]}/>
                <Sel label="Nivel ARL" value={selN.arl} onChange={v=>u({arl:parseInt(v)})} opts={ARL_OPTS.map((a,i)=>({v:i,l:`${a.lbl} — ${fPct(a.t)}`}))}/>
                <Inp label="Otros ingresos" type="number" value={selN.otrosIng||0} onChange={v=>u({otrosIng:v})} suf="COP" disabled={!ed} small/>
                <Inp label="Otras deducciones" type="number" value={selN.otrasDed||0} onChange={v=>u({otrasDed:v})} suf="COP" disabled={!ed} small/>
              </Card>
            </div>
            <Card accent={T.green}><STit color={T.green}>✅ Devengado</STit>
              <div style={{fontSize:9,color:T.inkLight,marginBottom:8}}>{calc.dias}/30 días · Ratio: {(calc.ratio*100).toFixed(1)}%</div>
              <div style={{fontSize:10,fontWeight:600,color:T.inkMid,marginBottom:4}}>SALARIAL (base EPS/Pensión)</div>
              <Row lbl="Salario proporcional" val={calc.salProp}/>
              {calc.totHex>0&&<><Row lbl="Horas extra" val={calc.totHex}/>{calc.hexD>0&&<Row lbl="HE diurna ×1.25" val={calc.hexD} indent sub/>}{calc.hexN>0&&<Row lbl="HE nocturna ×1.75" val={calc.hexN} indent sub/>}{calc.hexDD>0&&<Row lbl="HE dom ×2.0" val={calc.hexDD} indent sub/>}{calc.hexDN>0&&<Row lbl="HE dom noct ×2.5" val={calc.hexDN} indent sub/>}</>}
              {calc.recFest>0&&<Row lbl="Recargo festivos" val={calc.recFest}/>}
              <Div/><Row lbl="IBC (Base Cotización)" val={calc.ibc} bold bg={T.accent}/>
              <div style={{height:10}}/><div style={{fontSize:10,fontWeight:600,color:T.inkMid,marginBottom:4}}>NO SALARIAL</div>
              {calc.aplA&&<Row lbl={"Auxilio transporte ("+calc.diasComm+"d)"} val={calc.aux}/>}
              {calc.bono>0&&<Row lbl={(selN.bonoConcepto||"Bono asistencia")+" ("+calc.diasAsist+"d)"} val={calc.bono}/>}
              {(calc.festMes>0||(selN.diasLicRem||0)>0)&&<div style={{fontSize:8,color:T.amber,fontStyle:"italic",marginTop:2}}>Aux: {calc.diasComm}d (−{selN.diasLicRem||0} lic.rem) · Bono: {calc.diasAsist}d (−{calc.festMes} fest −{selN.diasLicRem||0} lic.rem)</div>}
              <Div/><Row lbl="TOTAL DEVENGADO" val={calc.dev} bold color={T.green} bg={T.greenBg}/>
            </Card>
            <div>
              <Card accent={T.red}><STit color={T.red}>🔻 Deducciones</STit>
                <div style={{fontSize:9,color:T.inkLight,marginBottom:8}}>Base: IBC {fmt(calc.ibc)}</div>
                <Row lbl={`EPS (4%) ${calc.eSub?"— SISBEN $0":""}`} val={calc.epsE} color={T.red}/>
                <Row lbl="Pensión (4%)" val={calc.penE} color={T.red}/>
                {calc.rteF>0&&<Row lbl="Retención fuente" val={calc.rteF} color={T.red}/>}
                {calc.otrasDed>0&&<Row lbl="Otras deducciones" val={calc.otrasDed} color={T.red}/>}
                <Div/><Row lbl="TOTAL DEDUCCIONES" val={calc.totD} bold color={T.red} bg={T.redBg}/>
              </Card>
              <div style={{border:`1px solid ${T.ink}`,borderRadius:6,padding:"12px 16px",marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:8,fontWeight:600,letterSpacing:1,color:T.inkMid,textTransform:"uppercase"}}>Neto a pagar</div>
                  <div style={{fontSize:9,color:T.inkLight,marginTop:2}}>{selN.modalidadPago==="mensual"?"Pago mensual":`Q1: ${fmt(calc.q1)} · Q2: ${fmt(calc.q2)}`}</div>
                </div>
                <div style={{fontSize:22,fontWeight:700,fontFamily:"'DM Mono',monospace",color:T.ink}}>{fmt(calc.neto)}</div>
              </div>
              <Card style={{background:T.accent}}><div style={{fontSize:10,fontFamily:"'DM Mono',monospace",color:T.inkMid,lineHeight:1.8}}>
                Sal.prop = {fmt(selN.sal)} × {calc.dias}/30<br/>EPS = IBC × 4% = {fmt(calc.ibc)} × 0.04<br/>Pen = IBC × 4%<br/>Neto = {fmt(calc.dev)} − {fmt(calc.totD)}
              </div></Card>
            </div>
          </div>
          </div>
        )}

        {subTab==="descargables"&&(
          <Card accent={T.ink}>
            <STit>📥 Documentos</STit>
            <div style={{fontSize:11,color:T.inkLight,marginBottom:14}}>{selN.nombre} — {MESES[mes]} {anio}</div>
            {[
              ...(selN.modalidadPago!=="mensual"?[
                {icon:"📋",label:"Justificante de anticipo",desc:`Anticipo ${fmt(calc.q1)} · 15 de ${MESES[mes]}`,action:"anticipo"},
              ]:[]),
              {icon:"📄",label:"Nómina",desc:`Devengado ${fmt(calc.dev)} · Deducciones ${fmt(calc.totD)} · Neto ${fmt(calc.neto)}`,action:"nomina"},
            ].map((d,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",background:"#FAFAF8",border:`1px solid ${T.border}`,borderRadius:8,marginBottom:8,cursor:"pointer",transition:"all .15s"}}
                onClick={()=>{
                  const mAbr=MESES[mes].substring(0,3).toUpperCase();
                  const a2=String(anio).slice(-2);
                  const ape=(selN.nombre||"").split(" ").slice(-2).join("-").toUpperCase();
                  const ref=`NOM ${mAbr}${a2} ${d.action==="anticipo"?"ANT":"PAG"} - ${ape}`;
                  const fileName=`${d.action==="anticipo"?"ANTICIPO":"NOMINA"}-${mAbr}${a2}-${ape}`;
                  const isQuinc=selN.modalidadPago!=="mensual";
                  const items=[{c:"Salario básico",d:calc.salProp,dd:0},calc.aux>0&&{c:`Aux. transporte (${calc.diasComm}d)`,d:calc.aux,dd:0},calc.bono>0&&{c:`Bono asistencia (${calc.diasAsist}d)`,d:calc.bono,dd:0},calc.totHex>0&&{c:"Horas extra",d:calc.totHex,dd:0},calc.recFest>0&&{c:"Recargo festivos",d:calc.recFest,dd:0},{c:"EPS (4%)",d:0,dd:calc.epsE},{c:"Pensión (4%)",d:0,dd:calc.penE},calc.rteF>0&&{c:"Retención fuente",d:0,dd:calc.rteF},calc.otrasDed>0&&{c:"Otras deducciones",d:0,dd:calc.otrasDed}].filter(Boolean);
                  let bodyHtml="";
                  if(d.action==="anticipo"){
                    bodyHtml=`<h1>Justificante de anticipo</h1><div class="sub">${MESES[mes]} ${anio} · Pago 15/${MESES[mes].slice(0,3)}</div>
                    <div class="info"><div><span>Nombre: </span><b>${selN.nombre}</b></div><div><span>Documento: </span><b>${selN.cc}</b></div><div><span>Cargo: </span>${selN.cargo}</div><div><span>Contrato: </span>${selN.tipoContrato}</div></div>
                    <div class="neto"><div class="lbl"><div>Anticipo primera quincena</div><div>${((selN.q1Pct||0.5)*100).toFixed(0)}% del salario base (${fmt(selN.sal)})</div></div><div class="v">${fmt(calc.q1)}</div></div>
                    <div style="font-size:7.5pt;color:#999;margin:10px 0">Ref: ${ref}</div>
                    <div class="sig"><div><div class="line"></div><div class="name">Habitaris S.A.S</div><div class="role">Empleador</div></div><div><div class="line"></div><div class="name">${selN.nombre}</div><div class="role">Trabajador</div></div></div>`;
                  } else {
                    const allItems=[...items];
                    if(isQuinc) allItems.push({c:"Anticipo de nómina (15/"+MESES[mes].slice(0,3)+")",d:0,dd:calc.q1});
                    const totalDed=isQuinc?calc.totD+calc.q1:calc.totD;
                    const liquido=isQuinc?calc.q2:calc.neto;
                    // YTD: months worked this year
                    const fiDate=new Date((selN.fechaIngreso||"2026-01-01")+"T12:00:00");
                    const startY=fiDate.getFullYear()===anio?fiDate.getMonth():0;
                    const mesesYTD=mes-startY+1;
                    const antigDias=Math.floor((new Date()-fiDate)/86400000);
                    const antigMeses=Math.floor(antigDias/30);
                    const antigAnios=Math.floor(antigMeses/12);
                    const antigTxt=antigAnios>0?antigAnios+"a "+((antigMeses%12))+"m":antigMeses+"m "+((antigDias%30))+"d";
                    bodyHtml=`<h1>Nómina</h1>
                    <div class="info"><div><span>Nombre: </span><b>${selN.nombre}</b></div><div><span>Documento: </span><b>${selN.cc}</b></div><div><span>Cargo: </span>${selN.cargo}</div><div><span>Contrato: </span>${selN.tipoContrato}</div><div><span>Período: </span><b>01 al ${new Date(anio,mes+1,0).getDate()} ${MESES[mes]} ${anio}</b></div><div><span>Días: </span><b>${calc.dias}/30</b></div><div><span>Ingreso: </span>${selN.fechaIngreso}</div><div><span>Antigüedad: </span><b>${antigTxt}</b></div><div><span>Banco: </span>${selN.banco||"—"}</div><div><span>Modalidad: </span>${isQuinc?"Quincenal":"Mensual"}</div></div>
                    <table><thead><tr><th>Concepto</th><th class="r">Devengado</th><th class="r">Deducción</th></tr></thead><tbody>
                    ${allItems.map(r=>"<tr><td>"+r.c+"</td><td class='r'>"+(r.d>0?fmt(r.d):"—")+"</td><td class='r'>"+(r.dd>0?fmt(r.dd):"—")+"</td></tr>").join("")}
                    <tr class="tot"><td>Total devengado / Total deducido</td><td class="r">${fmt(calc.dev)}</td><td class="r">${fmt(totalDed)}</td></tr>
                    <tr class="liq"><td>Líquido a percibir</td><td class="r"></td><td class="r">${fmt(liquido)}</td></tr>
                    </tbody></table>

                    ${(()=>{
                      const nDias=selN.novDias||{};
                      const novEntries=Object.entries(nDias).filter(([k])=>k.startsWith(anio+"-"+String(mes+1).padStart(2,"0"))).sort();
                      const tipoLabel={incapacidad:"Incapacidad",vacaciones:"Vacaciones",licencia:"Licencia rem.",licNoRem:"Licencia no rem.",ausencia:"Ausencia"};
                      if(novEntries.length===0) return "";
                      const festivos=calc.festMes||0;
                      const diasLab=30-novEntries.length;
                      return `<div class="section-title">Novedades del período</div>
                      <table class="acum"><thead><tr><th>Fecha</th><th>Tipo</th><th class="r">Días</th></tr></thead><tbody>
                      ${novEntries.map(([k,v])=>{const d=new Date(k+"T12:00:00");return `<tr><td>${d.toLocaleDateString("es-CO",{day:"numeric",month:"short"})}</td><td>${tipoLabel[v]||v}</td><td class="r">1</td></tr>`;}).join("")}
                      </tbody></table>
                      <div style="font-size:7pt;color:#999;margin:4px 0 0">Días laborados: ${diasLab} · Festivos: ${festivos} · Novedades: ${novEntries.length}</div>`;
                    })()}

                    <div class="section-title">Acumulados año ${anio} (${MESES[startY].slice(0,3)} — ${MESES[mes].slice(0,3)} · ${mesesYTD} mes${mesesYTD>1?"es":""})</div>
                    <table class="acum"><thead><tr><th>Concepto</th><th class="r">Mes actual</th><th class="r">Acumulado año</th></tr></thead><tbody>
                    <tr><td>Salario bruto</td><td class="r">${fmt(calc.dev)}</td><td class="r">${fmt(calc.dev*mesesYTD)}</td></tr>
                    <tr><td>Seguridad social</td><td class="r">${fmt(calc.epsE+calc.penE)}</td><td class="r">${fmt((calc.epsE+calc.penE)*mesesYTD)}</td></tr>
                    ${calc.rteF>0?`<tr><td>Retención fuente</td><td class="r">${fmt(calc.rteF)}</td><td class="r">${fmt(calc.rteF*mesesYTD)}</td></tr>`:""}
                    <tr><td>Neto percibido</td><td class="r">${fmt(calc.neto)}</td><td class="r">${fmt(calc.neto*mesesYTD)}</td></tr>
                    </tbody></table>

                    <div style="font-size:7pt;color:#bbb;margin:12px 0">Ref: ${ref}</div>
                    <div class="sig"><div><div class="line"></div><div class="name">Habitaris S.A.S</div><div class="role">Administración de personal</div></div><div><div class="line"></div><div class="name">${selN.nombre}</div><div class="role">Recibí conforme</div></div></div>`;
                  }
                  const css=`*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background:#e8e8e8;padding:20px 0}#content{background:#fff;width:794px;margin:0 auto;padding:40px 50px;font-size:8.5pt;color:#333;line-height:1.5;box-shadow:0 1px 4px rgba(0,0,0,.1)}.hdr{padding-bottom:12px;margin-bottom:16px;border-bottom:1px solid #ddd;overflow:hidden}.hdr .l{float:left}.hdr .r{float:right;text-align:right;font-size:7.5pt;color:#999;padding-top:12px}.hdr img{height:46px}h1{font-size:10pt;font-weight:600;text-align:center;margin:10px 0 10px;letter-spacing:.3px;clear:both}.sub{text-align:center;font-size:7.5pt;color:#999;margin-bottom:14px}.info{margin-bottom:14px;font-size:8pt;overflow:hidden;border:1px solid #eee;border-radius:3px;padding:8px 12px}.info div{float:left;width:50%;padding:2px 0;color:#555}.info span{color:#999}.info b{color:#333}table{width:100%;border-collapse:collapse;font-size:8pt;clear:both;margin-bottom:4px}th{padding:5px 8px;text-align:left;font-size:6.5pt;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #ddd}td{padding:4px 8px;border-bottom:1px solid #f2f2f2;color:#444}.r{text-align:right;font-family:'SF Mono',Menlo,monospace;font-size:8pt}.tot td{border-top:1px solid #333;border-bottom:none;font-weight:600;color:#333;padding:6px 8px}.liq td{border-top:2px solid #333;border-bottom:none;font-weight:700;color:#111;padding:8px;font-size:9pt}.section-title{font-size:7pt;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:#999;margin:16px 0 4px;padding-top:12px;border-top:1px solid #eee}.emp td,.acum td{padding:3px 8px;border-bottom:1px solid #f5f5f5;color:#666;font-size:7.5pt}.emp .tot td,.acum .tot td{border-top:1px solid #ccc;font-weight:600;color:#444;padding:5px 8px}.acum th{font-size:6pt;padding:3px 8px}.neto{border:1px solid #333;border-radius:3px;padding:10px 14px;margin:8px 0;overflow:hidden}.neto .lbl{float:left;padding-top:2px}.neto .lbl div:first-child{font-size:7pt;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:#333}.neto .lbl div:last-child{font-size:6.5pt;color:#999;margin-top:1px}.neto .v{float:right;font-size:15pt;font-weight:700;font-family:'SF Mono',Menlo,monospace;color:#111}.q{overflow:hidden;margin:6px 0}.qb{float:left;width:49%;border:1px solid #e0e0e0;border-radius:3px;padding:5px;text-align:center}.qb:last-child{float:right}.qb .v{font-size:11pt;font-weight:700;font-family:'SF Mono',Menlo,monospace;color:#333}.qb .l{font-size:6pt;font-weight:600;text-transform:uppercase;color:#999;letter-spacing:.3px}.sig{margin-top:60px;overflow:hidden;padding:0 20px}.sig>div{float:left;width:44%;text-align:center}.sig>div:last-child{float:right}.sig .line{border-top:1px solid #999;margin-bottom:6px}.sig .name{font-size:8pt;font-weight:600;color:#333}.sig .role{font-size:7pt;color:#999;margin-top:1px}.foot{font-size:6pt;color:#bbb;text-align:center;margin-top:20px;clear:both;letter-spacing:.3px}.np{text-align:center;margin:16px auto;max-width:794px}.btn{background:#333;color:#fff;border:none;padding:8px 20px;border-radius:3px;cursor:pointer;font-size:10pt;font-weight:500;margin:0 4px;font-family:inherit}.btn2{background:#fff;color:#333;border:1px solid #ccc;padding:8px 20px;border-radius:3px;cursor:pointer;font-size:10pt;margin:0 4px;font-family:inherit}@media print{body{background:#fff;padding:0}.np{display:none}#content{width:100%;margin:0;padding:25px 30px;box-shadow:none}}`;
                  const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${fileName}</title><script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"><\/script><script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"><\/script><style>${css}</style></head><body><div id="content"><div class="hdr"><div class="l"><img src="${HAB_LOGO}" alt="Habitaris"/></div><div class="r"><div style="font-weight:600;color:#111">Habitaris S.A.S</div><div>NIT: 901.922.136-8</div></div></div>${bodyHtml}<div class="foot">Habitaris Suite · ${new Date().toLocaleDateString("es-CO")} · ${fileName}</div></div><div class="np"><button class="btn" onclick="(function(){var el=document.getElementById('content');el.style.boxShadow='none';document.querySelector('.np').style.display='none';html2canvas(el,{scale:2,useCORS:true,backgroundColor:'#fff'}).then(function(c){var img=c.toDataURL('image/jpeg',0.98);var pdf=new jspdf.jsPDF('portrait','mm','a4');var w=210,h=(c.height*w)/c.width;pdf.addImage(img,'JPEG',0,0,w,h);pdf.save('${fileName}.pdf');el.style.boxShadow='0 0 8px rgba(0,0,0,.15)';document.querySelector('.np').style.display=''})})()" >📥 Descargar PDF</button><button class="btn2" onclick="window.print()">🖨️ Imprimir</button></div></body></html>`;
                  const w=window.open('','_blank');w.document.write(html);w.document.close();
                }}
                onMouseEnter={e=>e.currentTarget.style.borderColor=T.ink}
                onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
                <div style={{fontSize:22,width:36,textAlign:"center"}}>{d.icon}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:700,color:T.ink}}>{d.label}</div>
                  <div style={{fontSize:10,color:T.inkLight,marginTop:1}}>{d.desc}</div>
                </div>
                <div style={{display:"flex",gap:6}}>
                  <div style={{fontSize:11,fontWeight:600,color:T.ink,background:T.accent,borderRadius:4,padding:"6px 14px"}}>👁 Ver</div>
                </div>
              </div>
            ))}
          </Card>
        )}

        {subTab==="nomina"&&(
          <div style={{borderTop:`2px solid ${T.border}`,marginTop:20,paddingTop:16}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:10,color:T.ink}}>🏢 Costo Empleador</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
            <Card accent={T.blue}><STit color={T.blue}>🏢 Aportes empleador</STit>
              <div style={{fontSize:9,color:T.inkLight,marginBottom:6}}>Base: IBC {fmt(calc.ibc)}</div>
              <Row lbl={`EPS (${fPct(0.085)})`} val={calc.epsEr}/><Row lbl={`Pensión (${fPct(0.12)})`} val={calc.penEr}/>
              <Row lbl={`ARL ${ARL_OPTS[selN.arl||0]?.n} (${fPct(calc.tasa)})`} val={calc.arlV}/>
              <Row lbl={`Caja (${fPct(0.04)})`} val={calc.caja}/><Row lbl="SENA" val={calc.sena} sub/><Row lbl="ICBF" val={calc.icbf} sub/>
              {calc.exS&&<div style={{fontSize:8,color:T.inkLight,fontStyle:"italic",marginTop:2}}>Exonerado SENA/ICBF (Art.114-1 ET)</div>}
              <Div/><Row lbl="Total aportes" val={calc.totAp} bold color={T.blue} bg={T.blueBg}/>
            </Card>
            <Card accent={T.purple}><STit color={T.purple}>📦 Provisiones</STit>
              <div style={{fontSize:9,color:T.inkLight,marginBottom:6}}>Base: Sal+Aux {fmt(calc.salProp+calc.aux)}</div>
              <Row lbl="Prima (8.33%)" val={calc.prima}/><Row lbl="Cesantías (8.33%)" val={calc.ces}/>
              <Row lbl="Int. cesantías (1%)" val={calc.intC}/><Row lbl="Vacaciones (4.17%)" val={calc.vac}/>
              <Div/><Row lbl="Total provisiones" val={calc.totPr} bold color={T.purple} bg={T.purpleBg}/>
            </Card>
            <Card accent={T.ink}><STit>💼 Costo total</STit>
              <div style={{fontSize:9,color:T.inkLight,marginBottom:10}}>Costo real de este empleado</div>
              <Row lbl="Devengado" val={calc.dev}/><Row lbl="Aportes empleador" val={calc.totAp} color={T.blue}/>
              <Row lbl="Provisiones" val={calc.totPr} color={T.purple}/><Div/><Row lbl="COSTO TOTAL" val={calc.costoT} bold bg={T.accent}/>
              <div style={{height:12}}/>
              <div style={{background:T.accent,borderRadius:4,padding:"10px 12px",textAlign:"center"}}>
                <div style={{fontSize:9,color:T.inkLight}}>Factor prestacional</div>
                <div style={{fontSize:20,fontWeight:800,fontFamily:"'DM Mono',monospace"}}>{calc.salProp>0?(calc.costoT/calc.salProp).toFixed(3):"—"}×</div>
              </div>
              <div style={{marginTop:8,fontSize:10,color:T.inkMid}}>Costo/hora (240h): <strong style={{fontFamily:"'DM Mono',monospace"}}>{fmt(calc.costoT/240)}</strong></div>
            </Card>
          </div>
          </div>
        )}

        {subTab==="novedades"&&(
          <NovedadesPanel selN={selN} anio={anio} MESES={MESES} novHist={novHist} setNovHist={setNovHist} novYear={novYear} setNovYear={setNovYear} fmt={fmt}/>
        )}

        {subTab==="asistencia"&&(
          <AsistenciaPanel selN={selN} MESES={MESES} mes={mes} anio={anio}/>
        )}

        {subTab==="nomina"&&(
          <div style={{borderTop:`2px solid ${T.border}`,marginTop:20,paddingTop:16}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:10,color:T.ink}}>🔍 Auditoría de Fórmulas</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Card accent={T.ink}>
              <STit>📐 Base de cálculo</STit>
              <table style={{width:"100%",fontSize:11,borderCollapse:"collapse"}}>
                <tbody>
                {[
                  ["SMLMV 2026",fmt(SMLMV),"Decreto 1469/2025"],
                  ["Auxilio transporte",fmt(AUX_TR),"Decreto 1470/2025"],
                  ["UVT 2026",fmt(UVT),"DIAN"],
                  ["","",""],
                  ["Salario base mes",fmt(selN.sal),"Pactado en contrato"],
                  ["Salario/día",fmt(selN.sal/30),"Sal ÷ 30"],
                  ["Días laborados",selN.dias+"/30","Calendario − novedades"],
                  ["Festivos (L-S)",calc.festMes+"d","No se trabaja, sí se paga salario"],
                  ["Días asistidos",calc.diasAsist+"d","Días − festivos (para aux y bono)"],
                  ["Ratio salario",((selN.dias/30)*100).toFixed(1)+"%","Días ÷ 30"],
                  ["Ratio asistencia",((calc.diasAsist/30)*100).toFixed(1)+"%","Días asistidos ÷ 30"],
                  ["","",""],
                  ["Salario proporcional",fmt(calc.salProp),fmt(selN.sal)+" × "+selN.dias+"/30"],
                  ["Bono "+(selN.bonoConcepto||"Art.128"),fmt(calc.bono),fmt(selN.bono)+" × "+calc.diasAsist+"/30 (días asistidos)"],
                  ["Auxilio transporte",fmt(calc.aux),selN.sal<=2*SMLMV?fmt(AUX_TR)+" × "+calc.diasComm+"/30 (fest. incluidos, lic.rem excluidas)":"No aplica (sal > 2 SMLMV)"],
                  ["","",""],
                  ["TOTAL DEVENGADO",fmt(calc.dev),"Sal + Bono + Aux + HE + Otros"],
                ].map(([l,v,f],i)=>l===""?<tr key={i}><td colSpan={3} style={{borderBottom:`1px solid ${T.border}`,height:8}}/></tr>:
                  <tr key={i}><td style={{padding:"4px 0",color:T.inkMid}}>{l}</td><td style={{padding:"4px 8px",fontWeight:700,fontFamily:"'DM Mono',monospace",textAlign:"right"}}>{v}</td><td style={{padding:"4px 0",fontSize:9,color:T.inkLight,fontStyle:"italic"}}>{f}</td></tr>
                )}
                </tbody>
              </table>
            </Card>

            <Card accent={T.red}>
              <STit color={T.red}>📊 Deducciones y aportes</STit>
              <table style={{width:"100%",fontSize:11,borderCollapse:"collapse"}}>
                <tbody>
                {[
                  ["IBC (Base cotización)",fmt(calc.ibc),"Max(SalProp + HE, SMLMV×ratio)"],
                  ["IBC en SMLMV",(calc.ibc/(SMLMV*(selN.dias/30))).toFixed(2)+"×","Para FSP y exoneración"],
                  ["","",""],
                  ["— DEDUCCIONES EMPLEADO —","",""],
                  [calc.eSub?"EPS (SISBEN — $0)":"EPS empleado (4%)",fmt(calc.epsE),calc.eSub?"Subsidiado":fmt(calc.ibc)+" × 4%"],
                  ["Pensión empleado (4%)",fmt(calc.penE),fmt(calc.ibc)+" × 4%"],
                  calc.rteF>0?["Retención fuente",fmt(calc.rteF),"Proc. 1 Art.383 ET"]:null,
                  calc.otrasDed>0?["Otras deducciones",fmt(calc.otrasDed),"Manual"]:null,
                  ["TOTAL DEDUCCIONES",fmt(calc.totD),""],
                  ["","",""],
                  ["— APORTES EMPLEADOR —","",""],
                  [calc.exS?"EPS empleador (exonerado Art.114-1)":"EPS empleador (8.5%)",fmt(calc.epsEr),calc.exS?"Exonerado <10 SMLMV":fmt(calc.ibc)+" × 8.5%"],
                  ["Pensión empleador (12%)",fmt(calc.penEr),fmt(calc.ibc)+" × 12%"],
                  ["ARL nivel "+ARL_OPTS[selN.arl||0]?.n+" ("+fPct(calc.tasa)+")",fmt(calc.arlV),"Max(IBC,SMLMV) × "+fPct(calc.tasa)],
                  ["Caja compensación (4%)",fmt(calc.caja),fmt(calc.ibc)+" × 4%"],
                  [calc.exS?"ICBF (exonerado)":"ICBF (3%)",fmt(calc.icbf),calc.exS?"Exonerado":fmt(calc.ibc)+" × 3%"],
                  [calc.exS?"SENA (exonerado)":"SENA (2%)",fmt(calc.sena),calc.exS?"Exonerado":fmt(calc.ibc)+" × 2%"],
                  ["TOTAL APORTES",fmt(calc.totAp),""],
                ].filter(Boolean).map(([l,v,f],i)=>l===""?<tr key={i}><td colSpan={3} style={{borderBottom:`1px solid ${T.border}`,height:8}}/></tr>:
                  l.startsWith("—")?<tr key={i}><td colSpan={3} style={{padding:"6px 0 2px",fontWeight:700,fontSize:10,color:T.inkMid}}>{l}</td></tr>:
                  <tr key={i}><td style={{padding:"3px 0",color:l.includes("TOTAL")?T.ink:T.inkMid,fontWeight:l.includes("TOTAL")?700:400}}>{l}</td><td style={{padding:"3px 8px",fontWeight:l.includes("TOTAL")?800:600,fontFamily:"'DM Mono',monospace",textAlign:"right",color:l.includes("TOTAL")?T.red:T.ink}}>{v}</td><td style={{padding:"3px 0",fontSize:9,color:T.inkLight,fontStyle:"italic"}}>{f}</td></tr>
                )}
                </tbody>
              </table>
            </Card>

            <Card accent={T.purple}>
              <STit color={T.purple}>📦 Provisiones mensuales</STit>
              <table style={{width:"100%",fontSize:11,borderCollapse:"collapse"}}>
                <tbody>
                {[
                  ["Base prestaciones",fmt(calc.salProp+calc.aux),"Sal.prop + Aux.transporte"],
                  ["","",""],
                  ["Prima servicios (8.33%)",fmt(calc.prima),fmt(calc.salProp+calc.aux)+" × 30/360"],
                  ["Cesantías (8.33%)",fmt(calc.ces),fmt(calc.salProp+calc.aux)+" × 30/360"],
                  ["Int. cesantías (1%)",fmt(calc.intC),"Cesantías × 12% ÷ 12"],
                  ["Vacaciones (4.17%)",fmt(calc.vac),fmt(calc.salProp)+" × 15/360 (sobre sal, sin aux)"],
                  ["","",""],
                  ["TOTAL PROVISIONES",fmt(calc.totPr),""],
                ].map(([l,v,f],i)=>l===""?<tr key={i}><td colSpan={3} style={{borderBottom:`1px solid ${T.border}`,height:8}}/></tr>:
                  <tr key={i}><td style={{padding:"3px 0",color:l.includes("TOTAL")?T.ink:T.inkMid,fontWeight:l.includes("TOTAL")?700:400}}>{l}</td><td style={{padding:"3px 8px",fontWeight:l.includes("TOTAL")?800:600,fontFamily:"'DM Mono',monospace",textAlign:"right",color:l.includes("TOTAL")?T.purple:T.ink}}>{v}</td><td style={{padding:"3px 0",fontSize:9,color:T.inkLight,fontStyle:"italic"}}>{f}</td></tr>
                )}
                </tbody>
              </table>
            </Card>

            <Card accent={T.green}>
              <STit color={T.green}>✅ Resumen final</STit>
              <table style={{width:"100%",fontSize:11,borderCollapse:"collapse"}}>
                <tbody>
                {[
                  ["Devengado bruto",fmt(calc.dev),"Lo que se genera"],
                  ["(-) Deducciones empleado",fmt(calc.totD),"EPS + Pen + RteF"],
                  ["= NETO A PAGAR",fmt(calc.neto),"Lo que recibe el trabajador"],
                  ...(selN.modalidadPago!=="mensual"?[
                    ["","",""],
                    ["Q1 — Anticipo fijo",fmt(calc.q1),fmt(selN.sal)+" × "+((selN.q1Pct||0.5)*100)+"%"],
                    ["Q2 — Ajuste real",fmt(calc.q2),"Neto − Q1"],
                  ]:[]),
                  ["","",""],
                  ["(+) Aportes empleador",fmt(calc.totAp),"Lo que paga la empresa adicional"],
                  ["(+) Provisiones",fmt(calc.totPr),"Reserva mensual obligatoria"],
                  ["","",""],
                  ["COSTO TOTAL EMPRESA",fmt(calc.costoT),"Devengado + Aportes + Provisiones"],
                  ["Factor prestacional",calc.salProp>0?(calc.costoT/calc.salProp).toFixed(3)+"×":"—","Costo ÷ Sal.prop"],
                  ["Costo/hora (240h/mes)",fmt(calc.costoT/240),"Costo ÷ 240"],
                ].map(([l,v,f],i)=>l===""?<tr key={i}><td colSpan={3} style={{borderBottom:`1px solid ${T.border}`,height:8}}/></tr>:
                  <tr key={i} style={{background:l.includes("NETO")?"#E8F4EE":l.includes("COSTO TOTAL")?"#F5F4F1":"transparent"}}><td style={{padding:"4px 6px",color:l.includes("NETO")||l.includes("COSTO")?T.ink:T.inkMid,fontWeight:l.includes("=")||l.includes("COSTO")?700:400}}>{l}</td><td style={{padding:"4px 8px",fontWeight:l.includes("=")||l.includes("COSTO")?800:600,fontFamily:"'DM Mono',monospace",textAlign:"right",color:l.includes("NETO")?T.green:l.includes("COSTO")?T.ink:T.ink,fontSize:l.includes("NETO")||l.includes("COSTO")?14:12}}>{v}</td><td style={{padding:"4px 0",fontSize:9,color:T.inkLight,fontStyle:"italic"}}>{f}</td></tr>
                )}
                </tbody>
              </table>
              <div style={{marginTop:10,padding:"8px 10px",background:T.accent,borderRadius:4,fontSize:9,color:T.inkLight,lineHeight:1.6}}>
                <strong>Normativa:</strong> CST Arts. 127-128 (salario/no salarial) · Ley 100/93 (IBC, aportes) · Art. 114-1 ET (exoneración) · Ley 1393/2010 (límite 40%) · Decretos 1469-1470/2025 (SMLMV, Aux.T)
              </div>
            </Card>
          </div>
          </div>
        )}

        {subTab==="liqfinal"&&(
          <LiqFinalPanel selN={selN} calc={calc} fmt={fmt} MESES={MESES} mes={mes} anio={anio} HAB_LOGO={HAB_LOGO}/>
        )}
      </div>
    );
  }

  return(
    <div className="fade-up">
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
        <div style={{fontSize:11,color:T.inkLight}}>Colombia 2026 · SMLMV {fmt(SMLMV)} · Aux.T {fmt(AUX_TR)}</div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <select value={mes} onChange={e=>setMes(parseInt(e.target.value))} style={{padding:"6px 10px",border:`1px solid ${T.border}`,borderRadius:4,fontSize:12,fontFamily:"'DM Sans',sans-serif",background:"#fff"}}>{MESES.map((m,i)=><option key={i} value={i}>{m}</option>)}</select>
          <select value={anio} onChange={e=>setAnio(parseInt(e.target.value))} style={{padding:"6px 10px",border:`1px solid ${T.border}`,borderRadius:4,fontSize:12,fontFamily:"'DM Sans',sans-serif",background:"#fff",width:80}}>{[2024,2025,2026,2027].map(y=><option key={y} value={y}>{y}</option>)}</select>
          <Btn pri onClick={guardar} disabled={guard}>{guard?"Guardando…":"💾 Guardar"}</Btn>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:16}}>
        {[["Empleados",noms.length,T.ink],["Aprobadas",noms.filter(n=>n.estado==="aprobada").length,T.green],["Neto total",fmt(totN),T.ink],["Total Q1",fmt(totQ1),T.blue],["Total Q2",fmt(totQ2),T.green]].map(([l,v,c])=>(
          <div key={l} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:6,padding:"12px 14px",boxShadow:T.shadow}}>
            <div style={{fontSize:8,fontWeight:700,color:T.inkLight,textTransform:"uppercase",letterSpacing:.6,marginBottom:2}}>{l}</div>
            <div style={{fontSize:18,fontWeight:800,color:c,fontFamily:"'DM Mono',monospace"}}>{v}</div>
          </div>
        ))}
      </div>
      {loading?<div style={{textAlign:"center",padding:40,color:T.inkLight}}>Cargando empleados desde Supabase…</div>:
      noms.length===0?<Card style={{textAlign:"center",padding:40}}><div style={{fontSize:28,marginBottom:8}}>📋</div><div style={{fontSize:13,fontWeight:600,color:T.ink}}>Sin empleados vinculados</div><div style={{fontSize:11,color:T.inkLight,marginTop:4}}>Los empleados con contrato firmado aparecerán automáticamente.</div></Card>:
      <Card style={{padding:0,overflow:"hidden"}}>
        <div style={{padding:"10px 16px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
          <span style={{fontSize:12,fontWeight:700,whiteSpace:"nowrap"}}>Nómina {MESES[mes]} {anio}</span>
          <input value={buscar} onChange={e=>setBuscar(e.target.value)} placeholder="🔍 Buscar empleado…" style={{flex:1,maxWidth:280,padding:"6px 12px",border:`1px solid ${T.border}`,borderRadius:6,fontSize:12,fontFamily:"'DM Sans',sans-serif",outline:"none"}}/>
          <span style={{fontSize:10,color:T.inkLight,whiteSpace:"nowrap"}}>Costo empresa: <strong style={{color:T.ink}}>{fmt(totC)}</strong></span>
        </div>
        {(()=>{
          const getApellido=(nom)=>{const p=(nom||"").split(" ");return p.length>=3?p.slice(-2).join(" "):p.length>=2?p[p.length-1]:nom||"";};
          const q=buscar.toLowerCase();
          const filtered=noms.filter(n=>!q||(n.nombre||"").toLowerCase().includes(q)||(n.cc||"").includes(q)||(n.cargo||"").toLowerCase().includes(q));
          const sorted=[...filtered].sort((a,b)=>{
            let va,vb;
            if(sortBy==="nombre"){va=getApellido(a.nombre);vb=getApellido(b.nombre);}
            else if(sortBy==="cargo"){va=a.cargo||"";vb=b.cargo||"";}
            else if(sortBy==="sal"){va=a.sal||0;vb=b.sal||0;}
            else if(sortBy==="neto"){va=calcN(a).neto;vb=calcN(b).neto;}
            else{va=a.nombre||"";vb=b.nombre||"";}
            const cmp=typeof va==="number"?va-vb:String(va).localeCompare(String(vb),"es");
            return sortDir==="asc"?cmp:-cmp;
          });
          const toggleSort=(col)=>{if(sortBy===col)setSortDir(d=>d==="asc"?"desc":"asc");else{setSortBy(col);setSortDir("asc");}};
          const sortIcon=(col)=>sortBy===col?(sortDir==="asc"?"▲":"▼"):"";
          return <>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{background:T.accent}}>
            {[{k:"nombre",l:"Empleado"},{k:"cargo",l:"Cargo"},{k:"sal",l:"Salario"},{k:"",l:"Bono"},{k:"",l:"Días"},{k:"neto",l:"Neto"},{k:"",l:"Q1"},{k:"",l:"Q2"},{k:"",l:"Costo"},{k:"",l:"Estado"},{k:"",l:""}].map(h=>(
              <th key={h.l} onClick={h.k?()=>toggleSort(h.k):undefined} style={{padding:"7px 12px",fontSize:9,fontWeight:700,color:sortBy===h.k?T.ink:T.inkLight,textAlign:"left",letterSpacing:.6,textTransform:"uppercase",cursor:h.k?"pointer":"default",userSelect:"none"}}>{h.l} {sortIcon(h.k)}</th>
            ))}
          </tr></thead>
          <tbody>{sorted.length===0?<tr><td colSpan={11} style={{padding:24,textAlign:"center",color:T.inkLight,fontSize:12}}>Sin resultados para "{buscar}"</td></tr>:sorted.map(n=>{const c=calcN(n);return(
            <tr key={n.id} style={{borderTop:`1px solid ${T.border}`,cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background=T.accent} onMouseLeave={e=>e.currentTarget.style.background=""}>
              <td style={{padding:"9px 12px"}}><div style={{fontWeight:600,fontSize:12}}>{(()=>{const p=(n.nombre||"").split(" ");if(p.length>=3){const ape=p.slice(-2).join(" ");const nom=p.slice(0,-2).join(" ");return <>{ape}<span style={{fontWeight:400,color:T.inkLight}}>, {nom}</span></>;}return n.nombre;})()}</div></td>
              <td style={{padding:"9px 12px",fontSize:11,color:T.inkLight}}>{n.cargo}</td>
              <td style={{padding:"9px 12px",fontSize:12,fontFamily:"'DM Mono',monospace"}}>{fmt(n.sal)}</td>
              <td style={{padding:"9px 12px",fontSize:11,color:T.inkLight,fontFamily:"'DM Mono',monospace"}}>{n.bono>0?fmt(n.bono):"—"}</td>
              <td style={{padding:"9px 12px",fontSize:11,fontFamily:"'DM Mono',monospace"}}>{n.dias}</td>
              <td style={{padding:"9px 12px",fontSize:12,fontWeight:700,color:T.green,fontFamily:"'DM Mono',monospace"}}>{fmt(c.neto)}</td>
              <td style={{padding:"9px 12px",fontSize:11,color:T.blue,fontFamily:"'DM Mono',monospace"}}>{n.modalidadPago==="mensual"?"—":fmt(c.q1)}</td>
              <td style={{padding:"9px 12px",fontSize:11,color:T.green,fontFamily:"'DM Mono',monospace"}}>{n.modalidadPago==="mensual"?"—":fmt(c.q2)}</td>
              <td style={{padding:"9px 12px",fontSize:11,color:T.inkMid,fontFamily:"'DM Mono',monospace"}}>{fmt(c.costoT)}</td>
              <td style={{padding:"9px 12px"}}><Pill e={n.estado}/></td>
              <td style={{padding:"9px 12px"}}><Btn small onClick={()=>{setSel(n.id);setVista("detalle");setSubTab("nomina");}}>Ver →</Btn></td>
            </tr>);})}</tbody>
        </table>
        <div style={{padding:"8px 16px",borderTop:`1px solid ${T.border}`,fontSize:10,color:T.inkLight}}>
          {sorted.length} de {noms.length} empleado(s){buscar?" · filtrado por \""+buscar+"\"":""}  · Ordenado por {sortBy==="nombre"?"apellido":sortBy} {sortDir==="asc"?"A→Z":"Z→A"}
        </div>
        </>;})()}
      </Card>}
      <div style={{marginTop:12,padding:"10px 14px",background:T.accent,borderRadius:4,fontSize:9,color:T.inkLight,display:"flex",gap:20}}>
        <span>CST Art. 127-128 · Ley 100/93 · Art. 114-1 ET</span>
        <span>Q1 = anticipo fijo · Q2 = ajuste real · Bono Art.128 = NO salarial</span>
      </div>
    </div>
  );
}
