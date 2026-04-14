import React, { useState, useEffect, useMemo } from "react";
const SMLMV=1750905,AUX_TR=249095;
const ARL=[{n:"I",t:0.00522},{n:"II",t:0.01044},{n:"III",t:0.02436},{n:"IV",t:0.04350},{n:"V",t:0.06960}];
const MESES=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const fmt=n=>n==null||isNaN(n)?"$0":"$"+Math.round(n).toLocaleString("es-CO");
const uid=()=>Math.random().toString(36).slice(2,10);
const SB="https://xlzkasdskatnikuavefh.supabase.co";
const KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhsemthc2Rzc2thdG5pa3VhdmVmaCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzQwMTUyOTk3LCJleHAiOjIwNTU3Mjg5OTd9.DP5x1hNbnTSzIFRMFOG7tYbykaAJMc6BRXYC_dFNFgE";
const SBH={"Content-Type":"application/json","apikey":KEY,"Authorization":"Bearer "+KEY};
function calcN({sal,bono=0,dias=30,dcot=30,reg="contributivo",arl=0,ex114=true}){
  const aplA=sal<=2*SMLMV,aux=aplA?(AUX_TR/30)*dias:0,eSub=reg==="subsidiado";
  const ibcMin=eSub?(dcot<=7?SMLMV/4:dcot<=14?SMLMV/2:dcot<=21?(SMLMV*3/4):SMLMV):SMLMV;
  const ibc=Math.max(sal,ibcMin),ibcARL=Math.max(ibc,SMLMV);
  const epsE=eSub?0:ibc*0.04,penE=ibc*0.04,totD=epsE+penE;
  const dev=sal+bono+aux,neto=dev-totD,q1=Math.round(sal*0.4),q2=neto-q1;
  const enSM=sal/SMLMV,exS=ex114&&enSM<10,tasa=ARL[arl]?.t||0.00522;
  const epsEr=(eSub||exS)?0:ibc*0.085,penEr=ibc*0.12,arlV=ibcARL*tasa,caja=ibc*0.04;
  const icbf=exS?0:ibc*0.03,sena=exS?0:ibc*0.02,totAp=epsEr+penEr+arlV+caja+icbf+sena;
  const bPr=ibc+aux,prima=bPr*(30/360),ces=bPr*(30/360),intC=ces*0.12,vac=ibc*(15/360),totPr=prima+ces+intC+vac;
  return{sal,bono,aux,aplA,dev,ibc,eSub,epsE,penE,totD,neto,q1,q2,epsEr,penEr,arlV,caja,icbf,sena,totAp,prima,ces,intC,vac,totPr,costoT:dev+totAp+totPr,exS};
}
async function fetchEmps(){try{const r=await fetch(SB+"/rest/v1/hiring_processes?estado=in.(firmado,afiliaciones,completado)&select=*",{headers:SBH});const d=await r.json();return Array.isArray(d)?d:[];}catch{return[];}}
async function loadN(a,m){try{const r=await fetch(SB+"/rest/v1/kv_store?key=eq.hab:nomina:"+a+":"+m+"&select=value",{headers:SBH});const d=await r.json();return d&&d[0]?.value?JSON.parse(d[0].value):[];}catch{return[];}}
async function saveN(a,m,data){await fetch(SB+"/rest/v1/kv_store",{method:"POST",headers:{...SBH,"Prefer":"resolution=merge-duplicates"},body:JSON.stringify({key:"hab:nomina:"+a+":"+m,value:JSON.stringify(data),tenant_id:"habitaris"})});}
export function TabNomina(){
  const hoy=new Date();
  const[anio,setAnio]=useState(hoy.getFullYear());
  const[mes,setMes]=useState(hoy.getMonth());
  const[noms,setNoms]=useState([]);
  const[loading,setLoading]=useState(true);
  const[guard,setGuard]=useState(false);
  const[sel,setSel]=useState(null);
  const[vista,setVista]=useState("lista");
  const C={bg:"#F0EEE9",card:"#FAFAF8",ink:"#111",light:"#888",border:"#E5E3DE",green:"#1E6B42",gBg:"#E6F2EC"};
  const sCard={background:C.card,border:"1px solid "+C.border,borderRadius:8,marginBottom:12,overflow:"hidden"};
  const sHead={padding:"10px 16px",borderBottom:"1px solid "+C.border,display:"flex",alignItems:"center",justifyContent:"space-between"};
  const sBody={padding:"14px 16px"};
  const sLbl={fontSize:10,fontWeight:600,color:C.light,letterSpacing:"0.06em",textTransform:"uppercase",display:"block",marginBottom:4};
  const sInp={width:"100%",padding:"7px 10px",border:"1px solid "+C.border,borderRadius:6,fontSize:13,fontFamily:"DM Sans,sans-serif",background:"#fff",color:C.ink,outline:"none",boxSizing:"border-box"};
  const sRow={display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid "+C.border};
  const sBtn=(v)=>({padding:"7px 16px",borderRadius:6,border:"none",cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:"DM Sans,sans-serif",...(v==="p"?{background:C.green,color:"#fff"}:{background:C.bg,color:C.ink,border:"1px solid "+C.border})});
  const sPill=(e)=>({padding:"2px 10px",borderRadius:10,fontSize:10,fontWeight:600,background:e==="aprobada"?C.gBg:e==="pagada"?"#E8E8E8":"#F5F4F1",color:e==="aprobada"?C.green:e==="pagada"?"#111":"#888"});
  useEffect(()=>{
    setLoading(true);
    Promise.all([fetchEmps(),loadN(anio,mes)]).then(([emps,saved])=>{
      const ex=saved||[];
      const lista=emps.map(e=>{const f=ex.find(n=>n.empId===e.id);if(f)return f;return{id:uid(),empId:e.id,nombre:e.candidato_nombre||"",cc:e.candidato_cc||"",cargo:e.cargo||"",sal:e.salario_neto||0,bono:e.bono_no_salarial||0,dias:30,dcot:30,reg:"contributivo",arl:0,ex114:true,nov:"",estado:"borrador",eps:e.candidato_eps||"",pen:e.candidato_pension||"",banco:e.entidadBancaria||"",cuenta:e.cuentaBancaria||"",anio,mes};});
      setNoms(lista);setLoading(false);
    });
  },[anio,mes]);
  const selN=useMemo(()=>noms.find(n=>n.id===sel),[noms,sel]);
  const calc=useMemo(()=>selN?calcN({sal:selN.sal,bono:selN.bono,dias:selN.dias,dcot:selN.dcot,reg:selN.reg,arl:selN.arl,ex114:selN.ex114}):null,[selN]);
  const upd=(id,f)=>setNoms(p=>p.map(n=>n.id===id?{...n,...f}:n));
  const guardar=async()=>{setGuard(true);await saveN(anio,mes,noms);setGuard(false);alert("✅ Guardado");};
  const totN=noms.reduce((s,n)=>{const c=calcN({sal:n.sal,bono:n.bono,dias:n.dias,dcot:n.dcot,reg:n.reg,arl:n.arl,ex114:n.ex114});return s+c.neto;},0);
  const totC=noms.reduce((s,n)=>{const c=calcN({sal:n.sal,bono:n.bono,dias:n.dias,dcot:n.dcot,reg:n.reg,arl:n.arl,ex114:n.ex114});return s+c.costoT;},0);
  if(vista==="detalle"&&selN&&calc)return(
    <div style={{padding:24,maxWidth:760,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
        <button onClick={()=>setVista("lista")} style={sBtn()}>← Volver</button>
        <div><div style={{fontSize:16,fontWeight:700}}>{selN.nombre}</div><div style={{fontSize:12,color:C.light}}>{selN.cargo} · {MESES[selN.mes]} {selN.anio}</div></div>
        <div style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center"}}>
          {selN.estado==="borrador"&&<button onClick={()=>upd(selN.id,{estado:"aprobada"})} style={sBtn("p")}>✓ Aprobar</button>}
          <button onClick={guardar} style={sBtn("p")}>{guard?"…":"💾"}</button>
          <span style={sPill(selN.estado)}>{selN.estado}</span>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div style={sCard}>
          <div style={sHead}><span style={{fontSize:12,fontWeight:700}}>Parámetros</span></div>
          <div style={sBody}>
            {[["Salario neto","sal"],["Bono","bono"],["Días trabajados","dias"],["Días cotizados","dcot"]].map(([l,k])=>(
              <div key={k} style={{marginBottom:10}}><label style={sLbl}>{l}</label>
                <input type="number" value={selN[k]} disabled={selN.estado!=="borrador"} style={sInp} onChange={e=>upd(selN.id,{[k]:parseFloat(e.target.value)||0})}/>
              </div>
            ))}
            <div style={{marginBottom:10}}><label style={sLbl}>Régimen salud</label>
              <select value={selN.reg} style={sInp} disabled={selN.estado!=="borrador"} onChange={e=>upd(selN.id,{reg:e.target.value})}>
                <option value="contributivo">Contributivo (EPS)</option><option value="subsidiado">Subsidiado (SISBEN)</option>
              </select>
            </div>
            <div style={{marginBottom:10}}><label style={sLbl}>Nivel ARL</label>
              <select value={selN.arl} style={sInp} disabled={selN.estado!=="borrador"} onChange={e=>upd(selN.id,{arl:parseInt(e.target.value)})}>
                {ARL.map((a,i)=><option key={i} value={i}>Nivel {a.n} — {(a.t*100).toFixed(3)}%</option>)}
              </select>
            </div>
            <div><label style={sLbl}>Novedades</label>
              <textarea rows={2} value={selN.nov} style={{...sInp,resize:"vertical"}} disabled={selN.estado!=="borrador"} onChange={e=>upd(selN.id,{nov:e.target.value})} placeholder="Ej: 3 días incapacidad EG..."/>
            </div>
          </div>
        </div>
        <div>
          <div style={sCard}><div style={sHead}><span style={{fontSize:12,fontWeight:700}}>Devengado</span><span style={{fontSize:13,fontWeight:700,color:C.green}}>{fmt(calc.dev)}</span></div>
            <div style={sBody}>
              <div style={sRow}><span style={{fontSize:12,color:C.light}}>Salario</span><span style={{fontSize:13,fontWeight:600}}>{fmt(calc.sal)}</span></div>
              {calc.bono>0&&<div style={sRow}><span style={{fontSize:12,color:C.light}}>Bono</span><span style={{fontSize:13,fontWeight:600}}>{fmt(calc.bono)}</span></div>}
              {calc.aplA&&<div style={sRow}><span style={{fontSize:12,color:C.light}}>Aux. transporte</span><span style={{fontSize:13,fontWeight:600}}>{fmt(calc.aux)}</span></div>}
            </div>
          </div>
          <div style={sCard}><div style={sHead}><span style={{fontSize:12,fontWeight:700}}>Deducciones</span><span style={{fontSize:13,fontWeight:700,color:"#c00"}}>– {fmt(calc.totD)}</span></div>
            <div style={sBody}>
              <div style={sRow}><span style={{fontSize:12,color:C.light}}>EPS {calc.eSub?"(SISBEN $0)":"(4%)"}</span><span style={{fontSize:13,fontWeight:600}}>{fmt(calc.epsE)}</span></div>
              <div style={sRow}><span style={{fontSize:12,color:C.light}}>Pensión (4%)</span><span style={{fontSize:13,fontWeight:600}}>{fmt(calc.penE)}</span></div>
            </div>
          </div>
          <div style={{background:C.green,color:"#fff",borderRadius:8,padding:"14px 16px",marginBottom:12}}>
            <div style={{fontSize:10,opacity:0.7}}>NETO A PAGAR</div>
            <div style={{fontSize:22,fontWeight:800}}>{fmt(calc.neto)}</div>
            <div style={{fontSize:11,opacity:0.7,marginTop:4}}>Q1: {fmt(calc.q1)} · Q2: {fmt(calc.q2)}</div>
          </div>
          <div style={sCard}><div style={sHead}><span style={{fontSize:12,fontWeight:700}}>Aportes empleador</span><span style={{fontSize:12,color:"#555"}}>{fmt(calc.totAp)}</span></div>
            <div style={sBody}>
              {[["EPS empr.",calc.epsEr],["Pensión (12%)",calc.penEr],["ARL",calc.arlV],["Caja (4%)",calc.caja],["ICBF",calc.icbf],["SENA",calc.sena]].map(([l,v])=>(
                <div key={l} style={sRow}><span style={{fontSize:12,color:C.light}}>{l}</span><span style={{fontSize:13,fontWeight:600}}>{fmt(v)}</span></div>
              ))}
            </div>
          </div>
          <div style={sCard}><div style={sHead}><span style={{fontSize:12,fontWeight:700}}>Provisiones</span><span style={{fontSize:12,color:"#555"}}>{fmt(calc.totPr)}</span></div>
            <div style={sBody}>
              {[["Prima (8.33%)",calc.prima],["Cesantías (8.33%)",calc.ces],["Int. cesantías (1%)",calc.intC],["Vacaciones (4.17%)",calc.vac]].map(([l,v])=>(
                <div key={l} style={sRow}><span style={{fontSize:12,color:C.light}}>{l}</span><span style={{fontSize:13,fontWeight:600}}>{fmt(v)}</span></div>
              ))}
            </div>
          </div>
          <div style={{background:"#F5F4F1",borderRadius:8,padding:"12px 14px",display:"flex",justifyContent:"space-between"}}>
            <span style={{fontSize:12,fontWeight:700}}>Costo total / mes</span><span style={{fontSize:15,fontWeight:800}}>{fmt(calc.costoT)}</span>
          </div>
        </div>
      </div>
    </div>
  );
  return(
    <div style={{padding:24}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
        <div><div style={{fontSize:20,fontWeight:700,color:C.ink}}>Liquidador de Nómina</div><div style={{fontSize:12,color:C.light}}>Colombia 2026 · SMLMV $1.750.905</div></div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <select value={mes} onChange={e=>setMes(parseInt(e.target.value))} style={{...sInp,width:130}}>{MESES.map((m,i)=><option key={i} value={i}>{m}</option>)}</select>
          <select value={anio} onChange={e=>setAnio(parseInt(e.target.value))} style={{...sInp,width:90}}>{[2024,2025,2026].map(y=><option key={y} value={y}>{y}</option>)}</select>
          <button onClick={guardar} disabled={guard} style={sBtn("p")}>{guard?"Guardando…":"💾 Guardar"}</button>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        {[["Empleados",noms.length],["Aprobadas",noms.filter(n=>n.estado==="aprobada").length],["Neto total",fmt(totN)],["Costo empresa",fmt(totC)]].map(([l,v])=>(
          <div key={l} style={{...sCard,margin:0,padding:"14px 16px"}}>
            <div style={{fontSize:10,fontWeight:600,color:C.light,letterSpacing:"0.06em",textTransform:"uppercase"}}>{l}</div>
            <div style={{fontSize:18,fontWeight:700,color:C.ink,marginTop:4}}>{v}</div>
          </div>
        ))}
      </div>
      {loading?<div style={{textAlign:"center",padding:40,color:C.light}}>Cargando…</div>:
      noms.length===0?<div style={{...sCard,textAlign:"center",padding:40,color:C.light}}>
        <div style={{fontSize:32,marginBottom:8}}>📋</div><div style={{fontSize:14,fontWeight:600}}>Sin empleados vinculados</div>
        <div style={{fontSize:12,marginTop:4}}>Los empleados con contrato firmado aparecerán automáticamente.</div>
      </div>:
      <div style={sCard}><div style={sHead}><span style={{fontSize:12,fontWeight:700}}>Nómina {MESES[mes]} {anio}</span></div>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{background:C.bg}}>{["Empleado","Cargo","Salario","Bono","Neto","Costo total","Estado",""].map(h=>(
            <th key={h} style={{padding:"8px 14px",fontSize:10,fontWeight:700,color:C.light,textAlign:"left",letterSpacing:"0.05em",textTransform:"uppercase"}}>{h}</th>
          ))}</tr></thead>
          <tbody>{noms.map(n=>{const c=calcN({sal:n.sal,bono:n.bono,dias:n.dias,dcot:n.dcot,reg:n.reg,arl:n.arl,ex114:n.ex114});return(
            <tr key={n.id} style={{borderTop:"1px solid "+C.border,cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background=C.bg} onMouseLeave={e=>e.currentTarget.style.background=""}>
              <td style={{padding:"10px 14px",fontWeight:600,fontSize:13}}>{n.nombre}</td>
              <td style={{padding:"10px 14px",fontSize:12,color:C.light}}>{n.cargo}</td>
              <td style={{padding:"10px 14px",fontSize:13}}>{fmt(n.sal)}</td>
              <td style={{padding:"10px 14px",fontSize:12,color:C.light}}>{n.bono>0?fmt(n.bono):"—"}</td>
              <td style={{padding:"10px 14px",fontSize:13,fontWeight:700,color:C.green}}>{fmt(c.neto)}</td>
              <td style={{padding:"10px 14px",fontSize:12,color:"#555"}}>{fmt(c.costoT)}</td>
              <td style={{padding:"10px 14px"}}><span style={sPill(n.estado)}>{n.estado}</span></td>
              <td style={{padding:"10px 14px"}}><button onClick={()=>{setSel(n.id);setVista("detalle");}} style={{...sBtn(),padding:"4px 12px",fontSize:11}}>Ver</button></td>
            </tr>);})}</tbody>
        </table>
      </div>}
    </div>
  );
}