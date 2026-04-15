import React, { useState, useEffect, useMemo } from "react";

const SMLMV = 1_750_905, AUX_TR = 249_095, UVT = 49_799;
const ARL_OPTS = [
  { n:"I", t:0.00522, lbl:"I — Mínimo" }, { n:"II", t:0.01044, lbl:"II — Bajo" },
  { n:"III", t:0.02436, lbl:"III — Medio" }, { n:"IV", t:0.04350, lbl:"IV — Alto" },
  { n:"V", t:0.06960, lbl:"V — Máximo" },
];
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const FEST_2026 = ["2026-01-01","2026-01-12","2026-03-23","2026-04-02","2026-04-03","2026-05-01","2026-05-18","2026-06-08","2026-06-15","2026-06-29","2026-07-20","2026-08-07","2026-08-17","2026-10-12","2026-11-02","2026-11-16","2026-12-08","2026-12-25"];
const uid = () => Math.random().toString(36).slice(2, 10);
const fmt = n => n == null || isNaN(n) ? "$0" : "$" + Math.round(n).toLocaleString("es-CO");
const fPct = n => (n * 100).toFixed(2) + "%";

const SB = "https://xlzkasdskatnikuavefh.supabase.co";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhsemthc2Rzc2thdG5pa3VhdmVmaCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzQwMTUyOTk3LCJleHAiOjIwNTU3Mjg5OTd9.DP5x1hNbnTSzIFRMFOG7tYbykaAJMc6BRXYC_dFNFgE";
const SBH = { "Content-Type":"application/json", apikey:KEY, Authorization:"Bearer "+KEY };

async function fetchEmps(){try{const r=await fetch(SB+"/rest/v1/hiring_processes?estado=in.(firmado,afiliaciones_pendientes,completado)&select=*",{headers:SBH});const d=await r.json();return Array.isArray(d)?d:[];}catch{return[];}}
async function loadN(a,m){try{const r=await fetch(SB+"/rest/v1/kv_store?key=eq.hab:nomina:"+a+":"+m+"&select=value",{headers:SBH});const d=await r.json();return d&&d[0]?.value?JSON.parse(d[0].value):[];}catch{return[];}}
async function saveN(a,m,data){await fetch(SB+"/rest/v1/kv_store",{method:"POST",headers:{...SBH,Prefer:"resolution=merge-duplicates"},body:JSON.stringify({key:"hab:nomina:"+a+":"+m,value:JSON.stringify(data),tenant_id:"habitaris"})});}

function calcN(n) {
  const dias=n.dias||30, ratio=dias/30, sal=n.sal||0;
  const bono=(n.bono||0)*ratio, aplA=sal<=2*SMLMV, aux=aplA?AUX_TR*ratio:0;
  const vH=sal/240;
  const hexD=(n.hexD||0)*vH*1.25, hexN=(n.hexN||0)*vH*1.75, hexDD=(n.hexDD||0)*vH*2, hexDN=(n.hexDN||0)*vH*2.5;
  const totHex=hexD+hexN+hexDD+hexDN, recFest=(n.festLab||0)*vH*8*0.75;
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
  return {sal,salProp,bono,aux,aplA,dev,ibc,eSub,vH,totHex,hexD,hexN,hexDD,hexDN,recFest,epsE,penE,rteF,otrasDed:n.otrasDed||0,totD,neto,q1,q2,q1Pct,epsEr,penEr,arlV,caja,icbf,sena,totAp,exS,tasa,prima,ces,intC,vac,totPr,costoT,ratio,dias};
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

export function TabNomina(){
  const hoy=new Date();
  const[anio,setAnio]=useState(hoy.getFullYear());
  const[mes,setMes]=useState(hoy.getMonth());
  const[noms,setNoms]=useState([]);
  const[loading,setLoading]=useState(true);
  const[guard,setGuard]=useState(false);
  const[sel,setSel]=useState(null);
  const[vista,setVista]=useState("lista");
  const[subTab,setSubTab]=useState("liquidacion");
  const festivosMes=FEST_2026.filter(f=>{const d=new Date(f);return d.getMonth()===mes&&d.getFullYear()===anio;});

  useEffect(()=>{
    setLoading(true);
    Promise.all([fetchEmps(),loadN(anio,mes)]).then(([emps,saved])=>{
      const ex=saved||[];
      const lista=emps.map(e=>{const f=ex.find(n=>n.empId===e.id);if(f)return f;
        return{id:uid(),empId:e.id,nombre:e.candidato_nombre||"",cc:e.candidato_cc||"",cargo:e.cargo||"",sal:e.salario_neto||0,bono:e.bono_no_salarial||0,dias:30,reg:"contributivo",arl:0,ex114:true,q1Pct:0.5,hexD:0,hexN:0,hexDD:0,hexDN:0,festLab:0,diasIncap:0,diasLicRem:0,diasLicNoRem:0,diasVac:0,otrosIng:0,otrasDed:0,nov:"",estado:"borrador",eps:e.candidato_eps||"",pen:e.candidato_pension||"",banco:e.entidadBancaria||"",cuenta:e.cuentaBancaria||"",fechaIngreso:e.fecha_inicio||"",tipoContrato:e.tipo_contrato||"Término fijo",anio,mes};});
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
          <Btn onClick={()=>{setVista("lista");setSubTab("liquidacion");}}>← Volver</Btn>
          <div style={{flex:1}}><div style={{fontSize:16,fontWeight:700}}>{selN.nombre}</div><div style={{fontSize:11,color:T.inkLight}}>{selN.cargo} · {selN.cc} · {MESES[mes]} {anio}</div></div>
          {ed&&<Btn pri small onClick={()=>u({estado:"aprobada"})}>✓ Aprobar</Btn>}
          <Btn pri small onClick={guardar} disabled={guard}>{guard?"…":"💾 Guardar"}</Btn>
          <Pill e={selN.estado}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:14}}>
          {[["Devengado",calc.dev,T.ink],["Deducciones",calc.totD,T.red],["Neto mes",calc.neto,T.green],["Q1 anticipo",calc.q1,T.blue],["Q2 ajuste",calc.q2,calc.q2>=0?T.green:T.red]].map(([l,v,c])=>(
            <div key={l} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:6,padding:"10px 12px",textAlign:"center"}}>
              <div style={{fontSize:8,fontWeight:700,color:T.inkLight,textTransform:"uppercase",letterSpacing:.8,marginBottom:2}}>{l}</div>
              <div style={{fontSize:17,fontWeight:800,color:c,fontFamily:"'DM Mono',monospace"}}>{fmt(v)}</div>
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:0,marginBottom:14,borderBottom:`1px solid ${T.border}`}}>
          {[{id:"liquidacion",lbl:"📋 Liquidación"},{id:"quincenal",lbl:"💵 Quincenal Q1/Q2"},{id:"empleador",lbl:"🏢 Costo empleador"},{id:"colilla",lbl:"🧾 Colilla"}].map(t=>(
            <button key={t.id} onClick={()=>setSubTab(t.id)} style={{padding:"8px 16px",fontSize:11,fontWeight:subTab===t.id?700:400,border:"none",borderBottom:subTab===t.id?`2px solid ${T.ink}`:"2px solid transparent",background:"transparent",color:subTab===t.id?T.ink:T.inkLight,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>{t.lbl}</button>
          ))}
        </div>

        {subTab==="liquidacion"&&(
          <div style={{display:"grid",gridTemplateColumns:"260px 1fr 1fr",gap:12}}>
            <div>
              <Card accent={T.ink}><STit>Período</STit>
                <Inp label="Días laborados" type="number" value={selN.dias} onChange={v=>u({dias:v})} suf="/30" disabled={!ed} small/>
                <Inp label="Festivos laborados" type="number" value={selN.festLab||0} onChange={v=>u({festLab:v})} suf="días" disabled={!ed} small/>
                {festivosMes.length>0&&<div style={{fontSize:9,color:T.amber,background:T.amberBg,borderRadius:3,padding:"5px 8px",marginBottom:6}}>📅 Festivos: {festivosMes.map(f=>new Date(f).getDate()).join(", ")}</div>}
              </Card>
              <Card accent={T.amber}><STit>Novedades</STit>
                <Inp label="Días incapacidad" type="number" value={selN.diasIncap||0} onChange={v=>u({diasIncap:v})} small disabled={!ed}/>
                <Inp label="Días licencia rem." type="number" value={selN.diasLicRem||0} onChange={v=>u({diasLicRem:v})} small disabled={!ed}/>
                <Inp label="Días lic. NO rem." type="number" value={selN.diasLicNoRem||0} onChange={v=>u({diasLicNoRem:v})} small disabled={!ed}/>
                <Inp label="Días vacaciones" type="number" value={selN.diasVac||0} onChange={v=>u({diasVac:v})} small disabled={!ed}/>
                <Inp label="Notas" value={selN.nov||""} onChange={v=>u({nov:v})} small disabled={!ed} placeholder="Ej: 3 días incap EG…"/>
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
                <Inp label="Anticipo Q1 (%)" type="number" value={(selN.q1Pct||0.5)*100} onChange={v=>u({q1Pct:v/100})} suf="%" disabled={!ed} small/>
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
              {calc.aplA&&<Row lbl="Auxilio transporte" val={calc.aux}/>}
              {calc.bono>0&&<Row lbl="Bono asistencia (Art.128)" val={calc.bono}/>}
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
              <div style={{background:T.ink,color:"#fff",borderRadius:8,padding:"14px 16px",marginBottom:10}}>
                <div style={{fontSize:9,fontWeight:700,letterSpacing:1,opacity:.6,textTransform:"uppercase"}}>NETO A PAGAR</div>
                <div style={{fontSize:26,fontWeight:800,fontFamily:"'DM Mono',monospace"}}>{fmt(calc.neto)}</div>
                <div style={{fontSize:10,opacity:.5,marginTop:4}}>Q1: {fmt(calc.q1)} · Q2: {fmt(calc.q2)}</div>
              </div>
              <Card style={{background:T.accent}}><div style={{fontSize:10,fontFamily:"'DM Mono',monospace",color:T.inkMid,lineHeight:1.8}}>
                Sal.prop = {fmt(selN.sal)} × {calc.dias}/30<br/>EPS = IBC × 4% = {fmt(calc.ibc)} × 0.04<br/>Pen = IBC × 4%<br/>Neto = {fmt(calc.dev)} − {fmt(calc.totD)}
              </div></Card>
            </div>
          </div>
        )}

        {subTab==="quincenal"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <Card accent={T.blue}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><STit color={T.blue}>Q1 — Primera quincena</STit><Pill e="anticipo fijo"/></div>
              <div style={{fontSize:10,color:T.inkLight,lineHeight:1.5,marginBottom:12}}>Anticipo fijo = {((selN.q1Pct||0.5)*100).toFixed(0)}% del salario base.</div>
              <div style={{background:T.blueBg,borderRadius:6,padding:"16px 18px",textAlign:"center"}}>
                <div style={{fontSize:8,fontWeight:700,color:T.blue,letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>Pago Q1</div>
                <div style={{fontSize:30,fontWeight:800,color:T.blue,fontFamily:"'DM Mono',monospace"}}>{fmt(calc.q1)}</div>
                <div style={{fontSize:10,color:T.inkLight,marginTop:4}}>{fPct(selN.q1Pct||0.5)} × {fmt(selN.sal)}</div>
              </div>
              <div style={{fontSize:10,color:T.inkLight,marginTop:10}}>📅 Pago: 15 de {MESES[mes]}</div>
            </Card>
            <Card accent={T.green}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><STit color={T.green}>Q2 — Segunda quincena</STit><Pill e="ajuste real"/></div>
              <div style={{fontSize:10,color:T.inkLight,lineHeight:1.5,marginBottom:12}}>Q2 = Neto mes − Q1 ya pagado.</div>
              <Row lbl="Total devengado" val={calc.dev}/><Row lbl="(−) EPS" val={calc.epsE} color={T.red}/><Row lbl="(−) Pensión" val={calc.penE} color={T.red}/>
              {calc.rteF>0&&<Row lbl="(−) Rete fuente" val={calc.rteF} color={T.red}/>}
              <Div/><Row lbl="= Neto mes" val={calc.neto} bold/><Row lbl="(−) Q1 pagado" val={calc.q1} color={T.blue}/><Div/>
              <div style={{background:calc.q2>=0?T.greenBg:T.redBg,borderRadius:6,padding:"14px 18px",textAlign:"center"}}>
                <div style={{fontSize:8,fontWeight:700,color:calc.q2>=0?T.green:T.red,letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>Pago Q2</div>
                <div style={{fontSize:30,fontWeight:800,color:calc.q2>=0?T.green:T.red,fontFamily:"'DM Mono',monospace"}}>{fmt(calc.q2)}</div>
                {calc.q2<0&&<div style={{fontSize:10,color:T.red,marginTop:4,fontWeight:600}}>⚠ Saldo negativo</div>}
              </div>
              <div style={{fontSize:10,color:T.inkLight,marginTop:10}}>📅 Pago: último día hábil de {MESES[mes]}</div>
            </Card>
            <Card style={{gridColumn:"1/3",textAlign:"center"}}>
              <div style={{display:"flex",justifyContent:"center",gap:40,alignItems:"center"}}>
                <div><div style={{fontSize:8,fontWeight:700,color:T.inkLight,letterSpacing:1,textTransform:"uppercase"}}>Q1</div><div style={{fontSize:22,fontWeight:800,color:T.blue,fontFamily:"'DM Mono',monospace"}}>{fmt(calc.q1)}</div></div>
                <div style={{fontSize:20,color:T.inkXLight}}>+</div>
                <div><div style={{fontSize:8,fontWeight:700,color:T.inkLight,letterSpacing:1,textTransform:"uppercase"}}>Q2</div><div style={{fontSize:22,fontWeight:800,color:T.green,fontFamily:"'DM Mono',monospace"}}>{fmt(calc.q2)}</div></div>
                <div style={{fontSize:20,color:T.inkXLight}}>=</div>
                <div><div style={{fontSize:8,fontWeight:700,color:T.inkLight,letterSpacing:1,textTransform:"uppercase"}}>Neto mes</div><div style={{fontSize:26,fontWeight:800,color:T.ink,fontFamily:"'DM Mono',monospace"}}>{fmt(calc.neto)}</div></div>
              </div>
            </Card>
          </div>
        )}

        {subTab==="empleador"&&(
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
        )}

        {subTab==="colilla"&&(
          <Card style={{maxWidth:680,margin:"0 auto",border:`2px solid ${T.ink}`}}>
            <div style={{textAlign:"center",borderBottom:`2px solid ${T.ink}`,paddingBottom:12,marginBottom:12}}>
              <div style={{fontSize:15,fontWeight:800,letterSpacing:2}}>HABITARIS S.A.S</div>
              <div style={{fontSize:9,color:T.inkMid}}>NIT: 901.691.763-1</div>
              <div style={{fontSize:11,fontWeight:700,marginTop:6,letterSpacing:1}}>COMPROBANTE DE NÓMINA</div>
              <div style={{fontSize:10,color:T.inkMid}}>{MESES[mes]} {anio}</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:3,marginBottom:12,fontSize:10}}>
              <div><span style={{color:T.inkLight}}>Nombre: </span><strong>{selN.nombre}</strong></div>
              <div><span style={{color:T.inkLight}}>Documento: </span><strong>{selN.cc}</strong></div>
              <div><span style={{color:T.inkLight}}>Cargo: </span>{selN.cargo}</div>
              <div><span style={{color:T.inkLight}}>Contrato: </span>{selN.tipoContrato}</div>
              <div><span style={{color:T.inkLight}}>Ingreso: </span>{selN.fechaIngreso}</div>
              <div><span style={{color:T.inkLight}}>Días laborados: </span><strong>{calc.dias}/30</strong></div>
            </div>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:10,fontFamily:"'DM Mono',monospace"}}>
              <thead><tr style={{borderBottom:`2px solid ${T.ink}`,borderTop:`1px solid ${T.border}`}}>
                <th style={{padding:"5px 8px",textAlign:"left",fontSize:8,fontWeight:700,color:T.inkLight,letterSpacing:1}}>CONCEPTO</th>
                <th style={{padding:"5px 8px",textAlign:"right",fontSize:8,fontWeight:700,color:T.green,letterSpacing:1}}>DEVENGADO</th>
                <th style={{padding:"5px 8px",textAlign:"right",fontSize:8,fontWeight:700,color:T.red,letterSpacing:1}}>DEDUCCIÓN</th>
              </tr></thead>
              <tbody>
                {[{c:"Salario básico",d:calc.salProp,dd:0},calc.aux>0&&{c:"Auxilio transporte",d:calc.aux,dd:0},calc.bono>0&&{c:"Bono asistencia (Art.128)",d:calc.bono,dd:0},calc.totHex>0&&{c:"Horas extra",d:calc.totHex,dd:0},calc.recFest>0&&{c:"Recargo festivos",d:calc.recFest,dd:0},{c:"EPS (4%)",d:0,dd:calc.epsE},{c:"Pensión (4%)",d:0,dd:calc.penE},calc.rteF>0&&{c:"Retención fuente",d:0,dd:calc.rteF},calc.otrasDed>0&&{c:"Otras deducciones",d:0,dd:calc.otrasDed}].filter(Boolean).map((r,i)=>(
                  <tr key={i} style={{borderBottom:`1px solid ${T.border}`}}>
                    <td style={{padding:"4px 8px",color:T.inkMid}}>{r.c}</td>
                    <td style={{padding:"4px 8px",textAlign:"right",color:r.d>0?T.ink:T.inkXLight}}>{r.d>0?fmt(r.d):"—"}</td>
                    <td style={{padding:"4px 8px",textAlign:"right",color:r.dd>0?T.red:T.inkXLight}}>{r.dd>0?fmt(r.dd):"—"}</td>
                  </tr>
                ))}
                <tr style={{borderTop:`2px solid ${T.ink}`,fontWeight:700}}>
                  <td style={{padding:"6px 8px",fontSize:11}}>TOTALES</td>
                  <td style={{padding:"6px 8px",textAlign:"right",color:T.green,fontSize:11}}>{fmt(calc.dev)}</td>
                  <td style={{padding:"6px 8px",textAlign:"right",color:T.red,fontSize:11}}>{fmt(calc.totD)}</td>
                </tr>
              </tbody>
            </table>
            <div style={{background:T.ink,color:"#fff",borderRadius:4,padding:"12px 16px",marginTop:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div><div style={{fontSize:9,fontWeight:700,letterSpacing:1}}>NETO A PAGAR</div><div style={{fontSize:9,opacity:.5,marginTop:2}}>Q1: {fmt(calc.q1)} + Q2: {fmt(calc.q2)}</div></div>
              <div style={{fontSize:22,fontWeight:800,fontFamily:"'DM Mono',monospace"}}>{fmt(calc.neto)}</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:8}}>
              <div style={{background:T.blueBg,borderRadius:4,padding:"8px 12px",textAlign:"center"}}>
                <div style={{fontSize:7,fontWeight:700,color:T.blue,letterSpacing:1,textTransform:"uppercase"}}>Q1 — 15/{MESES[mes].slice(0,3)}</div>
                <div style={{fontSize:16,fontWeight:800,color:T.blue,fontFamily:"'DM Mono',monospace"}}>{fmt(calc.q1)}</div>
              </div>
              <div style={{background:T.greenBg,borderRadius:4,padding:"8px 12px",textAlign:"center"}}>
                <div style={{fontSize:7,fontWeight:700,color:T.green,letterSpacing:1,textTransform:"uppercase"}}>Q2 — Fin/{MESES[mes].slice(0,3)}</div>
                <div style={{fontSize:16,fontWeight:800,color:T.green,fontFamily:"'DM Mono',monospace"}}>{fmt(calc.q2)}</div>
              </div>
            </div>
            <div style={{marginTop:18,display:"grid",gridTemplateColumns:"1fr 1fr",gap:24}}>
              <div style={{textAlign:"center",paddingTop:24,borderTop:`1px solid ${T.ink}`}}><div style={{fontSize:9,fontWeight:600}}>Empleador</div><div style={{fontSize:8,color:T.inkLight}}>Habitaris S.A.S</div></div>
              <div style={{textAlign:"center",paddingTop:24,borderTop:`1px solid ${T.ink}`}}><div style={{fontSize:9,fontWeight:600}}>Trabajador</div><div style={{fontSize:8,color:T.inkLight}}>{selN.nombre}</div></div>
            </div>
          </Card>
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
        <div style={{padding:"10px 16px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:12,fontWeight:700}}>Nómina {MESES[mes]} {anio}</span>
          <span style={{fontSize:10,color:T.inkLight}}>Costo empresa total: <strong style={{color:T.ink}}>{fmt(totC)}</strong></span>
        </div>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{background:T.accent}}>{["Empleado","Cargo","Salario","Bono","Días","Neto","Q1","Q2","Costo total","Estado",""].map(h=>(
            <th key={h} style={{padding:"7px 12px",fontSize:9,fontWeight:700,color:T.inkLight,textAlign:"left",letterSpacing:.6,textTransform:"uppercase"}}>{h}</th>
          ))}</tr></thead>
          <tbody>{noms.map(n=>{const c=calcN(n);return(
            <tr key={n.id} style={{borderTop:`1px solid ${T.border}`,cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background=T.accent} onMouseLeave={e=>e.currentTarget.style.background=""}>
              <td style={{padding:"9px 12px",fontWeight:600,fontSize:12}}>{n.nombre}</td>
              <td style={{padding:"9px 12px",fontSize:11,color:T.inkLight}}>{n.cargo}</td>
              <td style={{padding:"9px 12px",fontSize:12,fontFamily:"'DM Mono',monospace"}}>{fmt(n.sal)}</td>
              <td style={{padding:"9px 12px",fontSize:11,color:T.inkLight,fontFamily:"'DM Mono',monospace"}}>{n.bono>0?fmt(n.bono):"—"}</td>
              <td style={{padding:"9px 12px",fontSize:11,fontFamily:"'DM Mono',monospace"}}>{n.dias}</td>
              <td style={{padding:"9px 12px",fontSize:12,fontWeight:700,color:T.green,fontFamily:"'DM Mono',monospace"}}>{fmt(c.neto)}</td>
              <td style={{padding:"9px 12px",fontSize:11,color:T.blue,fontFamily:"'DM Mono',monospace"}}>{fmt(c.q1)}</td>
              <td style={{padding:"9px 12px",fontSize:11,color:T.green,fontFamily:"'DM Mono',monospace"}}>{fmt(c.q2)}</td>
              <td style={{padding:"9px 12px",fontSize:11,color:T.inkMid,fontFamily:"'DM Mono',monospace"}}>{fmt(c.costoT)}</td>
              <td style={{padding:"9px 12px"}}><Pill e={n.estado}/></td>
              <td style={{padding:"9px 12px"}}><Btn small onClick={()=>{setSel(n.id);setVista("detalle");setSubTab("liquidacion");}}>Ver →</Btn></td>
            </tr>);})}</tbody>
        </table>
      </Card>}
      <div style={{marginTop:12,padding:"10px 14px",background:T.accent,borderRadius:4,fontSize:9,color:T.inkLight,display:"flex",gap:20}}>
        <span>CST Art. 127-128 · Ley 100/93 · Art. 114-1 ET</span>
        <span>Q1 = anticipo fijo · Q2 = ajuste real · Bono Art.128 = NO salarial</span>
      </div>
    </div>
  );
}
