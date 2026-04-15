import { useState, useMemo, useCallback, Component } from "react";

// Error Boundary — shows error instead of blank screen
export class ErrorBoundary extends Component{
  constructor(props){super(props);this.state={error:null,info:null}}
  static getDerivedStateFromError(error){return{error}}
  componentDidCatch(error,info){this.setState({info})}
  render(){
    if(this.state.error)return <div style={{padding:20,fontFamily:"system-ui",maxWidth:600,margin:"40px auto"}}>
      <h2 style={{color:"#dc2626"}}>⚠️ Error en la calculadora</h2>
      <p style={{color:"#666666",margin:"10px 0"}}>Algo falló. Recarga la página (Cmd+R) o revisa los datos ingresados.</p>
      <pre style={{background:"#fef2f2",padding:12,borderRadius:8,fontSize:11,overflow:"auto",color:"#dc2626",border:"1px solid #fecaca"}}>{this.state.error.toString()}{this.state.info&&this.state.info.componentStack}</pre>
      <button onClick={()=>this.setState({error:null,info:null})} style={{marginTop:10,padding:"8px 16px",background:"#111111",color:"#fff",border:"none",borderRadius:6,cursor:"pointer",fontWeight:700}}>🔄 Reintentar</button>
    </div>;
    return this.props.children;
  }
}

/* ══════════════════════════════════════════════════════════════════
   CONSTANTS — COLOMBIA 2026
   ══════════════════════════════════════════════════════════════════ */
const SMLMV_DEF=1750905, AUX_DEF=249095, MAX_HRS=42, UVT_DEF=49799;
const INTEGRAL_F=13;
const ARL=[{n:"I",t:0.522,d:"Mínimo"},{n:"II",t:1.044,d:"Bajo"},{n:"III",t:2.436,d:"Medio"},{n:"IV",t:4.350,d:"Alto"},{n:"V",t:6.960,d:"Máximo"}];
const MESES=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DL=["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];
const NOV=[{id:"none",l:"Trabajó",c:"#059669",i:"✓"},{id:"vac",l:"Vacaciones",c:"#0D5E6E",i:"🏖️"},{id:"eg",l:"Incap. EG",c:"#d97706",i:"🏥"},{id:"at",l:"Accid. trabajo",c:"#dc2626",i:"🚑"},{id:"lr",l:"Lic. remunerada",c:"#1E6B42",i:"📋"},{id:"lnr",l:"Lic. NO rem.",c:"#6b7280",i:"⏸"},{id:"sus",l:"Suspensión",c:"#dc2626",i:"🚫"},{id:"aus",l:"Ausencia inj.",c:"#991b1b",i:"✗"}];
const MOTIVOS=[{id:"renuncia",l:"Renuncia voluntaria"},{id:"mutuo",l:"Mutuo acuerdo"},{id:"justa",l:"Justa causa (empleador)"},{id:"injusta",l:"Sin justa causa"},{id:"fin_fijo",l:"Fin de término fijo"}];

// Horas extras y recargos (Arts. 168-171 CST, Ley 789/2002)
const EXTRAS=[
  {id:"hed",l:"HED",d:"Extra diurna",r:1.25,tipo:"extra"},
  {id:"hen",l:"HEN",d:"Extra nocturna",r:1.75,tipo:"extra"},
  {id:"heddf",l:"HEDDF",d:"Extra diurna dom/fest",r:2.00,tipo:"extra"},
  {id:"hendf",l:"HENDF",d:"Extra noct. dom/fest",r:2.50,tipo:"extra"},
  {id:"rn",l:"RN",d:"Recargo nocturno",r:0.35,tipo:"recargo"},
  {id:"rdf",l:"RDF",d:"Recargo dom/fest",r:0.75,tipo:"recargo"},
  {id:"rndf",l:"RNDF",d:"Recargo noct. dom/fest",r:1.10,tipo:"recargo"}
];

// Conceptos salariales predefinidos por ley colombiana
const CONCEPTOS_LEY=[
  {id:"comisiones",nombre:"Comisiones",esSalarial:true,esPrestacional:true,art:"Art. 127 CST",desc:"Porcentaje sobre ventas o resultados"},
  {id:"viaticos_perm",nombre:"Viáticos permanentes",esSalarial:true,esPrestacional:true,art:"Art. 130 CST",desc:"Manutención y alojamiento habitual"},
  {id:"viaticos_acc",nombre:"Viáticos accidentales",esSalarial:false,esPrestacional:false,art:"Art. 130 CST",desc:"Viáticos esporádicos no habituales"},
  {id:"bonif_habitual",nombre:"Bonificación habitual",esSalarial:true,esPrestacional:true,art:"Art. 127 CST",desc:"Pago habitual que remunera el servicio"},
  {id:"bonif_ocasional",nombre:"Bonificación ocasional",esSalarial:false,esPrestacional:false,art:"Art. 128 CST",desc:"Pago esporádico por mera liberalidad"},
  {id:"aux_rodamiento",nombre:"Auxilio de rodamiento",esSalarial:false,esPrestacional:false,art:"Art. 128 CST",desc:"Para gastos de transporte en vehículo propio"},
  {id:"aux_alimentacion",nombre:"Auxilio de alimentación",esSalarial:false,esPrestacional:false,art:"Art. 128 CST",desc:"Subsidio de alimentación no salarial"},
  {id:"aux_conectividad",nombre:"Auxilio de conectividad",esSalarial:false,esPrestacional:false,art:"Art. 128 CST",desc:"Internet/datos para trabajo remoto"},
  {id:"aux_educativo",nombre:"Auxilio educativo",esSalarial:false,esPrestacional:false,art:"Art. 128 CST",desc:"Subsidio de estudio para el trabajador"},
  {id:"prima_extralegal",nombre:"Prima extralegal",esSalarial:false,esPrestacional:false,art:"Art. 128 CST",desc:"Prima adicional por acuerdo"},
  {id:"otro",nombre:"Otro concepto…",esSalarial:false,esPrestacional:false,art:"Personalizable",desc:"Concepto personalizado"}
];

// Tabla retención Art. 383 E.T. (rangos en UVT mensuales)
const TAX_TBL=[
  {from:0,to:95,rate:0,base:0},
  {from:95,to:150,rate:0.19,base:0},
  {from:150,to:360,rate:0.28,base:10.45},
  {from:360,to:640,rate:0.33,base:69.25},
  {from:640,to:945,rate:0.35,base:161.65},
  {from:945,to:2300,rate:0.37,base:268.40},
  {from:2300,to:Infinity,rate:0.39,base:769.75}
];

/* ══════════════════════════════════════════════════════════════════
   UTILITIES
   ══════════════════════════════════════════════════════════════════ */
const $=n=>{if(n==null||isNaN(n))return"$0";return"$"+Math.round(n).toLocaleString("es-CO")};
const pc=n=>{if(n==null||isNaN(n))return"0.00%";return n.toFixed(2)+"%"};
const di=d=>(d.getDay()+6)%7;
const dKey=d=>`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const sameDay=(a,b)=>a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();
const diffDays=(a,b)=>Math.round((b-a)/86400000);

function easter(y){const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),mo=Math.floor((h+l-7*m+114)/31),da=((h+l-7*m+114)%31)+1;return new Date(y,mo-1,da)}
function nxtMon(d){const w=d.getDay();if(w===1)return new Date(d);return new Date(d.getFullYear(),d.getMonth(),d.getDate()+(w===0?1:8-w))}
function addD(d,n){return new Date(d.getFullYear(),d.getMonth(),d.getDate()+n)}
function getHolidays(y){const e=easter(y),h=[];const F=(m,d,n)=>h.push({date:new Date(y,m-1,d),name:n});const E=(m,d,n)=>{h.push({date:nxtMon(new Date(y,m-1,d)),name:n})};
F(1,1,"Año Nuevo");F(5,1,"Día Trabajo");F(7,20,"Independencia");F(8,7,"Boyacá");F(12,8,"Inmaculada");F(12,25,"Navidad");
h.push({date:addD(e,-3),name:"Jueves Santo"});h.push({date:addD(e,-2),name:"Viernes Santo"});
h.push({date:nxtMon(addD(e,39)),name:"Ascensión"});h.push({date:nxtMon(addD(e,60)),name:"Corpus Christi"});h.push({date:nxtMon(addD(e,68)),name:"Sagrado Corazón"});
E(1,6,"Reyes Magos");E(3,19,"San José");E(6,29,"San Pedro y Pablo");E(8,15,"Asunción");E(10,12,"Día Raza");E(11,1,"Todos Santos");E(11,11,"Indep. Cartagena");
return h}
function isHol(d,hs){return hs.find(h=>sameDay(h.date,d))}
function calDays(y,m){const f=new Date(y,m,1),l=new Date(y,m+1,0),ds=[];const s=(f.getDay()+6)%7;for(let i=0;i<s;i++)ds.push(null);for(let d=1;d<=l.getDate();d++)ds.push(new Date(y,m,d));return ds}
function ibcMinPILA(dias,smlmv){if(dias<=0)return 0;if(dias>=22)return smlmv;return smlmv*Math.ceil(dias/7)/4}
function tramo(dias){if(dias<=0)return"—";if(dias<=7)return"A (1-7d) 1sem";if(dias<=14)return"B (8-14d) 2sem";if(dias<=21)return"C (15-21d) 3sem";return"D (22-30d) 4sem"}
function getFSP(s,sm){const v=s/sm;if(v<4)return 0;if(v<16)return 1;if(v<17)return 1.2;if(v<18)return 1.4;if(v<19)return 1.6;if(v<20)return 1.8;return 2}

/* ══════════════════════════════════════════════════════════════════
   UI PRIMITIVES
   ══════════════════════════════════════════════════════════════════ */
function Card({t,icon,badge,accent,children}){return <div style={{background:"#fff",borderRadius:8,border:"1px solid #E5E3DE",marginBottom:10,overflow:"hidden",boxShadow:"0 1px 2px rgba(0,0,0,0.04)"}}><div style={{padding:"9px 14px",background:accent||"#FAFAF8",borderBottom:"1px solid #E5E3DE",display:"flex",alignItems:"center",justifyContent:"space-between"}}><div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:14}}>{icon}</span><span style={{fontSize:12,fontWeight:700,color:"#111111"}}>{t}</span></div>{badge&&<span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:8,background:badge.bg,color:badge.c}}>{badge.t}</span>}</div><div style={{padding:"12px 14px"}}>{children}</div></div>}
function In({label,value,onChange,type,suffix,prefix,help,disabled,w}){return <div style={{marginBottom:10}}>{label&&<label style={{display:"block",fontSize:11,fontWeight:600,color:"#666666",marginBottom:2}}>{label}</label>}<div style={{display:"flex"}}>{prefix&&<span style={{padding:"7px 6px",background:"#F5F4F1",color:"#666666",fontSize:12,fontWeight:700,border:"1px solid #E5E3DE",borderRight:"none",borderRadius:"6px 0 0 6px",display:"flex",alignItems:"center"}}>{prefix}</span>}<input type={type||"text"} value={value} onChange={onChange} disabled={disabled} style={{width:w||"100%",padding:"7px 10px",background:disabled?"#FAFAF8":"#fff",border:"1px solid #E5E3DE",borderRadius:prefix&&suffix?0:prefix?"0 6px 6px 0":suffix?"6px 0 0 6px":6,color:"#111111",fontSize:13,fontFamily:"'DM Mono',monospace",outline:"none",boxSizing:"border-box",opacity:disabled?.5:1}}/>{suffix&&<span style={{padding:"7px 6px",background:"#F5F4F1",color:"#999999",fontSize:10,fontWeight:600,border:"1px solid #E5E3DE",borderLeft:"none",borderRadius:"0 6px 6px 0",display:"flex",alignItems:"center",whiteSpace:"nowrap"}}>{suffix}</span>}</div>{help&&<span style={{fontSize:9,color:"#999999",display:"block",marginTop:1}}>{help}</span>}</div>}
function Sel({label,value,onChange,options,help}){return <div style={{marginBottom:10}}>{label&&<label style={{display:"block",fontSize:11,fontWeight:600,color:"#666666",marginBottom:2}}>{label}</label>}<select value={value} onChange={onChange} style={{width:"100%",padding:"7px 10px",background:"#fff",border:"1px solid #E5E3DE",borderRadius:6,color:"#111111",fontSize:12,outline:"none"}}>{options.map((o,i)=><option key={i} value={o.v}>{o.l}</option>)}</select>{help&&<span style={{fontSize:9,color:"#999999",display:"block",marginTop:1}}>{help}</span>}</div>}
function Tg({label,on,set,help}){return <div style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:8}}><button type="button" onClick={()=>set(!on)} style={{width:36,minWidth:36,height:20,borderRadius:8,cursor:"pointer",border:"none",padding:0,outline:"none",background:on?"#111111":"#CCCCCC",flexShrink:0,position:"relative"}}><div style={{width:14,height:14,borderRadius:7,background:"#fff",position:"absolute",top:3,left:on?19:3,transition:"left .15s"}}/></button><div><span style={{fontSize:11,fontWeight:600,color:"#111111",cursor:"pointer"}} onClick={()=>set(!on)}>{label}</span>{help&&<div style={{fontSize:9,color:"#999999"}}>{help}</div>}</div></div>}
function Rw({l,v,bold,hl,tasa,note}){const hc={green:"#059669",red:"#dc2626",blue:"#1E6B42",purple:"#5B3A8C",cyan:"#0D5E6E"};return <div><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",borderBottom:"1px solid #F5F4F1"}}><div style={{display:"flex",alignItems:"center",gap:4,flexWrap:"wrap"}}><span style={{fontSize:12,color:bold?"#111111":"#555555",fontWeight:bold?700:400}}>{l}</span>{tasa!=null&&<span style={{fontSize:8,background:"#E8F4EE",color:"#1E6B42",padding:"0 4px",borderRadius:4,fontWeight:600}}>{pc(tasa)}</span>}</div><span style={{fontSize:13,fontWeight:bold?800:600,fontFamily:"'DM Mono',monospace",whiteSpace:"nowrap",color:hl?hc[hl]:bold?"#111111":"#111111"}}>{typeof v==="string"?v:$(v)}</span></div>{note&&<div style={{fontSize:9,color:"#999999",margin:"-1px 0 2px"}}>{note}</div>}</div>}
function Dv(){return <div style={{borderTop:"2px solid #E5E3DE",margin:"5px 0"}}/>}
function Al({c:color,children}){const bg={y:"#fefce8",g:"#ecfdf5",b:"#E8F4EE",r:"#fef2f2",p:"#EDE8F4"};const bc={y:"#fde68a",g:"#a7f3d0",b:"#C8E6D0",r:"#fecaca",p:"#D4C4E8"};const tc={y:"#92400e",g:"#1E6B42",b:"#111111",r:"#991b1b",p:"#3B1F6E"};return <div style={{background:bg[color],border:`1px solid ${bc[color]}`,borderRadius:8,padding:"7px 11px",marginTop:8,marginBottom:10,fontSize:11,color:tc[color],lineHeight:1.4}}>{children}</div>}
function Bar({l,v,total,color}){const p=total>0?(v/total)*100:0;return <div style={{marginBottom:7}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}><span style={{fontSize:10,color:"#666666"}}>{l}</span><span style={{fontSize:10,fontWeight:700,fontFamily:"'DM Mono',monospace",color:"#111111"}}>{$(v)} ({p.toFixed(1)}%)</span></div><div style={{height:5,background:"#F5F4F1",borderRadius:3}}><div style={{height:"100%",width:Math.min(100,p)+"%",background:color,borderRadius:3,transition:"width .3s"}}/></div></div>}
function BigBox({bg,children}){return <div style={{borderRadius:8,padding:14,marginBottom:10,color:"#fff",background:bg}}>{children}</div>}
const G2=({children})=><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 12px"}}>{children}</div>;
const G3=({children})=><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0 10px"}}>{children}</div>;
function TabBar({tabs,active,set}){return <div style={{display:"flex",gap:0,background:"#F5F4F1",borderRadius:8,padding:2,marginBottom:10,border:"1px solid #E5E3DE"}}>{tabs.map((t,i)=><button key={i} type="button" onClick={()=>set(i)} style={{flex:1,padding:"8px 3px",border:"none",borderRadius:6,cursor:"pointer",fontSize:10,fontWeight:700,fontFamily:"inherit",background:active===i?"#111111":"transparent",color:active===i?"#fff":"#666666",appearance:"none",outline:"none",transition:"all .15s"}}><span style={{display:"block",fontSize:13}}>{t.i}</span>{t.l}</button>)}</div>}

/* ══════════════════════════════════════════════════════════════════
   CALCULATION ENGINES
   ══════════════════════════════════════════════════════════════════ */

// Payroll engine — IBC rules per regime:
// CONTRIBUTIVO: IBC mín = SMLMV completo siempre (Ley 100/1993 Art. 18)
// SUBSIDIADO Tipo 51: IBC mín por tramos/semanas (Decreto 2616/2013)
// ARL: siempre sobre SMLMV completo (30 días) en ambos regímenes
function calcPayroll({salario,bono,cSal,cNoSal,cPrest,dias,diasCot,smlmv,auxTr,arlIdx,art114,bonoPrest,horasDia,regimenSalud,extrasVal}){
  const smlmvDia=smlmv/30, auxDia=auxTr/30, ev=extrasVal||0;
  const salDia=dias>0?salario/dias:0, bonoDia=dias>0?bono/dias:0;
  const salMes30=salDia*30;
  const auxOk=salMes30<=2*smlmv;
  const auxDev=auxOk?auxDia*dias:0;
  const esSub=regimenSalud==="subsidiado";
  // IBC: salario + bono si prestacional + conceptos salariales + extras
  const ibcBruto=salario+(bonoPrest?bono:0)+(cSal||0)+ev;
  // IBC mínimo según régimen
  const ibcMinSub=ibcMinPILA(diasCot,smlmv); // Tipo 51: por tramos
  const ibcMinCont=smlmv; // Contributivo: siempre SMLMV completo
  const ibcMin=esSub?ibcMinSub:ibcMinCont;
  const ibc=Math.max(ibcBruto,ibcMin);
  // ARL siempre sobre SMLMV completo
  const ibcARL=Math.max(ibc,smlmv);
  // Prestaciones base: IBC + aux + conceptos prestacionales
  const basePr=ibc+auxDev+(cPrest||0);
  // Deducciones trabajador
  const sE=esSub?0:ibc*.04, pE=ibc*.04, fspT=getFSP(salMes30,smlmv), fspV=fspT>0?ibc*(fspT/100):0;
  const totDed=sE+pE+fspV;
  const devTotal=salario+bono+(cSal||0)+(cNoSal||0)+auxDev+ev;
  const neto=devTotal-totDed;
  const enSM=salMes30/smlmv,exS=art114&&enSM<10,exPF=exS;
  // Aportes empleador — EPS/pensión sobre IBC, ARL sobre ibcARL
  const sEr=(esSub||exS)?0:ibc*.085, pEr=ibc*.12, arlV=ibcARL*(ARL[Math.max(0,arlIdx)].t/100), caja=ibc*.04, icbf=exPF?0:ibc*.03, sena=exPF?0:ibc*.02;
  const totAp=sEr+pEr+arlV+caja+icbf+sena;
  const pri=basePr*(30/360),ces=basePr*(30/360),intC=ces*.12,vac=ibc*(15/360);
  const totPr=pri+ces+intC+vac;
  const costoT=devTotal+totAp+totPr;
  const costoInd=totAp+totPr;
  const tramoPILA=esSub?tramo(diasCot):"N/A (SMLMV completo)";
  return {salario,bono,salDia,bonoDia,salMes30,auxOk,auxDev,devTotal,ibc,ibcMin,ibcARL,basePr,sE,pE,fspT,fspV,totDed,neto,netoDia:dias>0?neto/dias:0,netoHora:dias>0&&horasDia>0?neto/dias/horasDia:0,enSM,exS,exPF,esSub,sEr,pEr,arlV,caja,icbf,sena,totAp,pri,ces,intC,vac,totPr,costoT,costoInd,totalComp:devTotal-auxDev,dias,diasCot,tramo:tramoPILA,cSal:cSal||0,cNoSal:cNoSal||0,cPrest:cPrest||0,extrasVal:ev}
}

// Retención en la fuente — Procedimiento 1 (Art. 383, 387, 388 E.T.)
function calcRetencion({ingresoLaboral,dedSS,uvt,tieneDep,intVivienda,medPrep,afc}){
  if(ingresoLaboral<=0)return {retencion:0,detalles:{}};
  // 1. Ingreso no constitutivo de renta (INCR): aportes obligatorios SS
  const incr=dedSS; // pensión 4% + salud 4% + FSP
  const sub1=Math.max(0,ingresoLaboral-incr);
  // 2. Deducciones Art. 387
  const depMax=32*uvt, depV=tieneDep?Math.min(ingresoLaboral*0.10,depMax):0;
  const vivMax=100*uvt, vivV=Math.min(intVivienda||0,vivMax);
  const medMax=16*uvt, medV=Math.min(medPrep||0,medMax);
  const totDed=depV+vivV+medV;
  // 3. Rentas exentas
  const afcMax=sub1*0.30, afcV=Math.min(afc||0,afcMax);
  const base25=Math.max(0,sub1-totDed-afcV);
  const exento25Max=240*uvt, exento25=Math.min(base25*0.25,exento25Max);
  // 4. Límite 40% (total deducciones + rentas exentas)
  const totalBeneficios=totDed+afcV+exento25;
  const lim40=sub1*0.40;
  const beneficiosCapped=Math.min(totalBeneficios,lim40);
  // 5. Base gravable
  const baseGrav=Math.max(0,sub1-beneficiosCapped);
  const baseUVT=baseGrav/uvt;
  // 6. Aplicar tabla Art. 383
  let impUVT=0;
  for(const r of TAX_TBL){
    if(baseUVT>r.from&&baseUVT<=r.to){impUVT=(baseUVT-r.from)*r.rate+r.base;break}
    if(baseUVT>r.to&&r.to===Infinity){impUVT=(baseUVT-r.from)*r.rate+r.base;break}
  }
  if(baseUVT>2300)impUVT=(baseUVT-2300)*0.39+769.75;
  const retencion=Math.round(impUVT*uvt);
  return {retencion,baseGrav,baseUVT:Math.round(baseUVT*100)/100,incr,sub1,depV,vivV,medV,afcV,exento25,totalBeneficios,beneficiosCapped,lim40,impUVT:Math.round(impUVT*100)/100}
}

// Overtime value calculation
function calcExtrasVal(horas,salMes30,horasDia){
  if(!horas)return 0;
  const hRate=horasDia>0?salMes30/(horasDia*30):0;
  let total=0;
  EXTRAS.forEach(e=>{const h=horas[e.id]||0;if(h>0)total+=h*hRate*e.r});
  return total;
}
function calcExtrasDetail(horas,salMes30,horasDia){
  if(!horas)return [];
  const hRate=horasDia>0?salMes30/(horasDia*30):0;
  return EXTRAS.map(e=>{const h=horas[e.id]||0;return {id:e.id,l:e.l,d:e.d,h,rate:e.r,tipo:e.tipo,val:h*hRate*e.r,hRate}}).filter(x=>x.h>0);
}

// Prima semestral real
function calcPrimaSemestre({salMes,auxTr,smlmv,fechaIng,year,semestre}){
  const semIni=semestre===1?new Date(year,0,1):new Date(year,6,1);
  const semFin=semestre===1?new Date(year,5,30):new Date(year,11,20);
  const ini=fechaIng?new Date(fechaIng+"T00:00:00"):null;
  const desde=ini&&ini>semIni?ini:semIni;
  const dias=Math.max(0,diffDays(desde,semFin)+1);
  const basePrima=salMes+((salMes<=2*smlmv)?auxTr:0);
  return {dias,monto:basePrima*dias/360,base:basePrima,desde,hasta:semFin,semestre}
}

// Indemnización Art. 64 CST
function calcIndemnizacion({salDia,tipoContrato,motivoRetiro,fechaInicio,fechaRetiro,smlmv,duracionMeses}){
  if(motivoRetiro==="renuncia"||motivoRetiro==="mutuo"||motivoRetiro==="justa")return 0;
  const salMes=salDia*30;
  if(tipoContrato==="fijo"||motivoRetiro==="fin_fijo"){
    const inicioC=new Date(fechaInicio),finC=new Date(inicioC.getFullYear(),inicioC.getMonth()+duracionMeses,inicioC.getDate());
    return salDia*Math.max(0,diffDays(new Date(fechaRetiro),finC));
  }
  const diasTrab=Math.max(1,diffDays(new Date(fechaInicio),new Date(fechaRetiro))),anios=diasTrab/365;
  if(salMes<10*smlmv){return anios<=1?salDia*30:salDia*30+salDia*20*Math.max(0,anios-1)}
  return anios<=1?salDia*20:salDia*20+salDia*15*Math.max(0,anios-1);
}

/* ══════════════════════════════════════════════════════════════════
   MAIN APP
   ══════════════════════════════════════════════════════════════════ */
export default function CalcSalarial(){
  const [tab,setTab]=useState(0);
  // Config — only SMLMV and Aux pre-filled
  const [smlmv,setSmlmv]=useState(SMLMV_DEF);
  const [auxTr,setAuxTr]=useState(AUX_DEF);
  const [arlIdx,setArlIdx]=useState(-1);
  const [art114,setArt114]=useState(false);
  const [workDays,setWorkDays]=useState([false,false,false,false,false,false,false]);
  const [hIni,setHIni]=useState(0);const [hFin,setHFin]=useState(0);const [almuerzo,setAlm]=useState(0);
  // Contract
  const [cargo,setCargo]=useState("");const [tipoCon,setTipoCon]=useState("");
  const [durMode,setDurMode]=useState("meses");
  const [durMeses,setDurMeses]=useState(0);
  const [fechaIniCont,setFechaIniCont]=useState("");const [fechaFinCont,setFechaFinCont]=useState("");
  const [freqPago,setFreqPago]=useState("");const [regimenSalud,setRegimenSalud]=useState("");
  const [pctQ1,setPctQ1]=useState(40);
  // Salary
  const [modoSal,setModoSal]=useState("neto");const [valorSal,setValorSal]=useState(0);
  const [usarBono,setUsarBono]=useState(false);const [bonoPrest,setBonoPrest]=useState(false);
  const [bonoConcepto,setBonoConcepto]=useState("");const [bonoTrat,setBonoTrat]=useState("asistencia");
  // ★ Conceptos personalizables
  const [conceptos,setConceptos]=useState([]);
  // ★ Retención en la fuente
  const [calcRet,setCalcRet]=useState(false);const [uvt,setUvt]=useState(UVT_DEF);
  const [tieneDep,setTieneDep]=useState(false);const [intVivienda,setIntVivienda]=useState(0);
  const [medPrep,setMedPrep]=useState(0);const [afc,setAfc]=useState(0);
  // Liquidator
  const now=new Date();
  const [liqY,setLiqY]=useState(now.getFullYear());const [liqM,setLiqM]=useState(now.getMonth());
  const [novs,setNovs]=useState({});const [liqTab,setLiqTab]=useState(0);
  const [fechaIng,setFechaIng]=useState("");const [selNov,setSelNov]=useState("eg");
  // ★ Horas extras
  const [extHoras,setExtHoras]=useState({});
  // ★ Vacaciones
  const [vacUsadasHist,setVacUsadasHist]=useState(0);
  // Final settlement
  const [fechaIniCon,setFechaIniCon]=useState("");const [fechaRet,setFechaRet]=useState("");const [motivoRet,setMotivoRet]=useState("");
  // ★ Tipo de jornada
  const [tipoJornada,setTipoJornada]=useState("")

  // Derived
  const dSem=workDays.filter(Boolean).length;
  // Jornada completa: 30 días/mes (incluye domingos)
  // Jornada parcial: días trabajados + dominical proporcional (Art. 172 CST)
  // Dominical = días_trabajados / 6 (proporción de la semana laboral de 6 días)
  const dLabSem=dSem; // días que asiste
  const dDomSem=dSem>0?dSem/6:0; // dominical proporcional por semana
  const dTotalSem=dLabSem+dDomSem; // total pagado por semana
  const dmLab=Math.round(dLabSem*4.33); // días laborados/mes
  const dmDom=Math.round(dDomSem*4.33); // dominicales/mes
  const dmProm=tipoJornada==="completa"&&dSem>0?30:Math.round(dTotalSem*4.33); // total pagado/mes
  const hDia=hFin-hIni-almuerzo, hSem=hDia*dSem, jOk=hSem<=MAX_HRS;

  // ★ Contract duration computed
  const contrato=useMemo(()=>{
    let durDias=0,durMesesCalc=0,fechaIni=null,fechaFin=null;
    if(tipoCon!=="fijo")return{durDias:0,durMeses:0,durCon:0,ppDias:60,vacDias:15,fechaIni:null,fechaFin:null,label:"Indefinido"};
    if(durMode==="fechas"&&fechaIniCont&&fechaFinCont){
      fechaIni=new Date(fechaIniCont+"T00:00:00");fechaFin=new Date(fechaFinCont+"T00:00:00");
      if(isNaN(fechaIni.getTime())||isNaN(fechaFin.getTime())||fechaFin<=fechaIni){
        return{durDias:0,durMeses:0,durCon:0,ppDias:0,vacDias:0,fechaIni:null,fechaFin:null,label:"Fechas inválidas"};
      }
      durDias=Math.max(1,diffDays(fechaIni,fechaFin));
      durMesesCalc=Math.round(durDias/30*10)/10;
    }else{
      durMesesCalc=durMeses||0;durDias=Math.round(durMesesCalc*30);
      fechaIni=null;fechaFin=null;
    }
    if(durDias<=0)return{durDias:0,durMeses:0,durCon:0,ppDias:0,vacDias:0,fechaIni,fechaFin,label:"—"};
    const ppDias=durMesesCalc<12?Math.min(60,Math.round(durDias/5)):60;
    const vacDias=Math.round(durDias*15/360*10)/10;
    const label=durMode==="fechas"&&fechaIni?`${durDias} días (${durMesesCalc} meses)`:`${durMesesCalc} meses`;
    return{durDias,durMeses:durMesesCalc,durCon:durMesesCalc,ppDias,vacDias,fechaIni,fechaFin,label};
  },[tipoCon,durMode,durMeses,fechaIniCont,fechaFinCont]);
  const durCon=contrato.durCon||durMeses||0;
  const holidays=useMemo(()=>getHolidays(liqY),[liqY]);
  const cDays=useMemo(()=>calDays(liqY,liqM),[liqY,liqM]);

  // ★ Concept sums by type
  const cSums=useMemo(()=>{
    let sal=0,noSal=0,prest=0;
    conceptos.forEach(c=>{
      if(c.esSalarial){sal+=c.valor;if(c.esPrestacional)prest+=0;/* already in IBC → basePr includes it */}
      else{noSal+=c.valor;if(c.esPrestacional)prest+=c.valor;/* add to prestaciones base only */}
    });
    return {sal,noSal,prest};
  },[conceptos]);

  // ★ Auto-fill integral
  const handleModoSal=useCallback(modo=>{
    setModoSal(modo);
    if(modo==="integral")setValorSal(prev=>prev<smlmv*INTEGRAL_F?smlmv*INTEGRAL_F:prev);
  },[smlmv]);

  // Calendar analysis
  const fIngDate=fechaIng?new Date(fechaIng+"T00:00:00"):null;
  const cal=useMemo(()=>{
    const md=cDays.filter(Boolean);
    let wk=0,hol=0,holList=[],wkList=[];
    md.forEach(d=>{const dw=di(d),isW=workDays[dw],h=isHol(d,holidays),pre=fIngDate&&d<fIngDate;
      if(isW&&!h&&!pre){wk++;wkList.push(d)}
      if(h&&isW&&!pre){hol++;holList.push(h)}
    });
    let trab=0,noT=0,iEG=0,iAT=0,lR=0,lNR=0,sus=0,aus=0,vacD=0;
    wkList.forEach(d=>{const k=dKey(d),n=novs[k]||"none";
      if(n==="none")trab++;else if(n==="vac")vacD++;else if(n==="eg")iEG++;else if(n==="at")iAT++;
      else if(n==="lr")lR++;else if(n==="lnr"){lNR++;noT++}else if(n==="sus"){sus++;noT++}else if(n==="aus"){aus++;noT++}
    });
    const dPagSal=trab+lR+vacD+hol, dAsist=trab, dCot=trab+lR+vacD+iEG+iAT+hol;
    return {wk,hol,holList,wkList,trab,noT,iEG,iAT,lR,lNR,sus,aus,vacD,dPagSal,dAsist,dCot,hMes:trab*hDia}
  },[cDays,workDays,holidays,novs,hDia,fIngDate]);

  // ★ Vacation balance
  // Date formatter for Colombian format
  const fmtDate=(d)=>{if(!d||isNaN(d.getTime()))return"—";const dd=d.getDate(),mm=d.getMonth()+1,yy=d.getFullYear();return `${dd} ${MESES[mm-1].slice(0,3)} ${yy}`};

  const vacInfo=useMemo(()=>{
    if(!fechaIng)return null;
    const ini=new Date(fechaIng+"T00:00:00");
    // Use today if within the selected month, otherwise end of month
    const hoy=new Date();
    const refDate=(hoy.getFullYear()===liqY&&hoy.getMonth()===liqM)?hoy:new Date(liqY,liqM+1,0);
    const diasLab=Math.max(0,diffDays(ini,refDate)),acum=diasLab*15/360;
    const totalUs=vacUsadasHist+cal.vacD;
    let diasRestantes=null,fechaFinCon=null,diasContrato=null;
    if(tipoCon==="fijo"){
      fechaFinCon=new Date(ini.getFullYear(),ini.getMonth()+durCon,ini.getDate());
      diasRestantes=Math.max(0,diffDays(refDate,fechaFinCon));
      diasContrato=diffDays(ini,fechaFinCon);
    }
    return {diasLab,acum:Math.round(acum*100)/100,usEsteMes:cal.vacD,totalUs,disp:Math.round(Math.max(0,acum-totalUs)*100)/100,diasRestantes,fechaFinCon,diasContrato,ini,refDate}
  },[fechaIng,liqY,liqM,cal.vacD,vacUsadasHist,tipoCon,durCon]);

  // ★ Extras value for negotiation (none) and liquidation
  const extrasValLiq=useMemo(()=>calcExtrasVal(extHoras,0,hDia),[extHoras,hDia]); // calculated later with actual salary

  // Negotiation calc
  const neg=useMemo(()=>{
    const dm=dmProm,sDia=smlmv/30,aDia=auxTr/30;
    const cSP=cSums.sal>0?(cSums.sal/30)*dm:0, cNSP=cSums.noSal>0?(cSums.noSal/30)*dm:0, cPP=cSums.prest>0?(cSums.prest/30)*dm:0;
    let sal,bono;
    if(modoSal==="integral"){
      sal=valorSal;bono=0;
      const ibc70=sal*.7,sE=ibc70*.04,pE=ibc70*.04,fT=getFSP(sal,smlmv),fV=fT>0?ibc70*(fT/100):0;
      const neto=sal-sE-pE-fV,exS=art114&&(sal/smlmv)<10,exPF=exS;
      const sEr=exS?0:ibc70*.085,pEr=ibc70*.12,arlV=ibc70*(ARL[Math.max(0,arlIdx)].t/100),caja=ibc70*.04,icbf=exPF?0:ibc70*.03,sena=exPF?0:ibc70*.02;
      const totAp=sEr+pEr+arlV+caja+icbf+sena,vac=ibc70*(15/360),costoT=sal+totAp+vac;
      return {salario:sal,bono:0,salDia:sal/30,bonoDia:0,salMes30:sal,auxOk:false,auxDev:0,devTotal:sal,ibc:ibc70,ibcMin:ibc70,basePr:ibc70,sE,pE,fspT:fT,fspV:fV,totDed:sE+pE+fV,neto,netoDia:neto/30,netoHora:neto/30/8,exS,exPF,sEr,pEr,arlV,caja,icbf,sena,totAp,pri:0,ces:0,intC:0,vac,totPr:vac,costoT,costoInd:totAp+vac,totalComp:sal,dias:30,diasCot:30,tramo:tramo(30),integral:true,dm:30,cSal:0,cNoSal:0,cPrest:0,extrasVal:0,esSub:false}
    }
    if(modoSal==="neto"){
      const esSub=regimenSalud==="subsidiado";
      // Contributivo: deducciones sobre SMLMV completo (8% = 4% EPS + 4% pensión)
      // Subsidiado: deducciones sobre tramo PILA (4% solo pensión, sin EPS)
      const ibcM=esSub?ibcMinPILA(dm,smlmv):smlmv;
      const dedR=esSub?0.04:0.08;
      const dedFija=ibcM*dedR; // Deducciones mínimas fijas sobre IBC mínimo
      if(usarBono&&!bonoPrest){
        const salMin=sDia*dm;
        const auxE=(sDia*30<=2*smlmv)?aDia*dm:0;
        sal=salMin;bono=Math.max(0,valorSal-(sal+cSP+cNSP-dedFija+auxE));
      }else{bono=0;const auxE=(sDia*30<=2*smlmv)?aDia*dm:0;
        // For contributivo: if salary < SMLMV, deductions are fixed on SMLMV
        // For subsidiado: deductions are on tramo
        sal=Math.max(sDia*dm,valorSal-auxE-cSP-cNSP+dedFija);
      }
    }else{if(usarBono&&!bonoPrest){sal=valorSal*.6;bono=valorSal*.4}else{sal=valorSal;bono=0}}
    sal=Math.max(sDia*dm,sal);
    return {...calcPayroll({salario:sal,bono,cSal:cSP,cNoSal:cNSP,cPrest:cPP,dias:dm,diasCot:dm,smlmv,auxTr,arlIdx,art114,bonoPrest,horasDia:hDia,regimenSalud,extrasVal:0}),integral:false,dm}
  },[smlmv,auxTr,arlIdx,art114,modoSal,valorSal,usarBono,bonoPrest,dmProm,hDia,regimenSalud,cSums]);

  // ★ Retención calculation
  const ret=useMemo(()=>{
    if(!calcRet||neg.integral)return null;
    const ingresoLab=neg.salMes30+(cSums.sal)+(bonoPrest?neg.bono/neg.dm*30:0);
    const dedSS=neg.sE/(neg.dm/30)+neg.pE/(neg.dm/30)+neg.fspV/(neg.dm/30);
    return calcRetencion({ingresoLaboral:ingresoLab,dedSS,uvt,tieneDep,intVivienda,medPrep,afc});
  },[calcRet,neg,cSums,bonoPrest,uvt,tieneDep,intVivienda,medPrep,afc]);

  // Monthly liquidation
  const liq=useMemo(()=>{
    if(cal.wk===0&&cal.hol===0)return null;
    // Dominical proporcional (Art. 172 CST): por cada 6 días pagados, 1 día de descanso remunerado
    const domDias=tipoJornada==="parcial"&&dSem>0&&dSem<7?Math.round(cal.dPagSal/6*10)/10:0;
    const salFull=neg.salDia*(cal.dPagSal+domDias);
    const egEmp=Math.min(cal.iEG,2),egEps=Math.max(0,cal.iEG-2);
    const salIncapEG=egEmp*neg.salDia*(2/3);
    const totalSalEmp=salFull+salIncapEG;
    const pagoEPS=egEps*neg.salDia*(2/3),pagoARL=cal.iAT*neg.salDia;
    const bonoDias=bonoTrat==="asistencia"?cal.dAsist:cal.dPagSal;
    const bono=neg.bonoDia*bonoDias;
    const cSP=cSums.sal>0?(cSums.sal/30)*cal.dPagSal:0;
    const cNSP=cSums.noSal>0?(cSums.noSal/30)*cal.dPagSal:0;
    const cPP=cSums.prest>0?(cSums.prest/30)*cal.dPagSal:0;
    // ★ Extras
    const evDetail=calcExtrasDetail(extHoras,neg.salMes30,hDia);
    const ev=evDetail.reduce((s,x)=>s+x.val,0);
    const auxDias=cal.dAsist,auxDia=auxTr/30,auxOk=neg.salMes30<=2*smlmv;
    const auxDev=auxOk?auxDia*auxDias:0;
    const devTotal=totalSalEmp+bono+cSP+cNSP+auxDev+ev;
    const diasCotPILA=cal.dCot+cal.sus;
    const base=calcPayroll({salario:totalSalEmp,bono,cSal:cSP,cNoSal:cNSP,cPrest:cPP,dias:cal.dPagSal,diasCot:diasCotPILA,smlmv,auxTr,arlIdx,art114,bonoPrest,horasDia:hDia,regimenSalud,extrasVal:ev});
    // ★ Retención mensual
    let retMes=null;
    if(calcRet){
      const ingresoLab=base.salMes30+cSums.sal+(bonoPrest?bono/cal.dPagSal*30:0)+ev;
      const dedSS=(base.sE+base.pE+base.fspV)/(cal.dPagSal>0?cal.dPagSal/30:1);
      retMes=calcRetencion({ingresoLaboral:ingresoLab,dedSS,uvt,tieneDep,intVivienda,medPrep,afc});
    }
    const retV=retMes?retMes.retencion:0;
    const netoCorr=devTotal-base.totDed-retV;
    return {...base,egEmp,egEps,salIncapEG,pagoEPS,pagoARL,salBase:salFull,auxDev,devTotal,neto:netoCorr,bonoDias,auxDias,bono,cSP,cNSP,cPP,evDetail,ev,retMes,retV,domDias,
      netoDia:cal.dPagSal>0?netoCorr/cal.dPagSal:0,diasCotPILA}
  },[cal,neg,smlmv,auxTr,arlIdx,art114,bonoPrest,hDia,regimenSalud,bonoTrat,cSums,extHoras,calcRet,uvt,tieneDep,intVivienda,medPrep,afc,tipoJornada,dSem]);

  // ★ Prima semestral
  const primaSem=useMemo(()=>{
    if(!neg)return null;
    const sem=liqM<6?1:2;
    return calcPrimaSemestre({salMes:neg.salMes30,auxTr,smlmv,fechaIng,year:liqY,semestre:sem});
  },[neg,liqM,liqY,auxTr,smlmv,fechaIng]);

  // ★ Dotación (Art. 230 CST — mínimo 3 meses de antigüedad)
  const dotacion=useMemo(()=>{
    if(neg.salMes30>2*smlmv)return null;
    const ini=fechaIng?new Date(fechaIng+"T00:00:00"):null;
    const finCon=ini&&tipoCon==="fijo"?new Date(ini.getFullYear(),ini.getMonth()+durCon,ini.getDate()):null;
    // When does worker reach 3 months?
    const fecha3m=ini?new Date(ini.getFullYear(),ini.getMonth()+3,ini.getDate()):null;
    const finMes=new Date(liqY,liqM+1,0);
    const entregas=[
      {n:1,mes:"Abril",fecha:new Date(liqY,3,30)},
      {n:2,mes:"Agosto",fecha:new Date(liqY,7,31)},
      {n:3,mes:"Diciembre",fecha:new Date(liqY,11,20)}
    ];
    const items=entregas.map(e=>{
      const pasada=finMes>=e.fecha;
      const esEsteMes=e.fecha.getMonth()===liqM;
      const antigDias=ini?Math.max(0,diffDays(ini,e.fecha)):999;
      const cumple3m=antigDias>=90;
      const conActivo=finCon?e.fecha<=finCon:true;
      const aplica=cumple3m&&conActivo;
      return {...e,pasada,esEsteMes,cumple3m,conActivo,aplica,antigDias};
    });
    const firstEligible=items.find(e=>e.aplica);
    return {items,fecha3m,finCon,ini};
  },[neg.salMes30,smlmv,liqY,liqM,fechaIng,tipoCon,durCon]);

  // Final settlement
  const liqFinal=useMemo(()=>{
    if(!fechaIniCon||!fechaRet)return null;
    const ini=new Date(fechaIniCon+"T00:00:00"),ret=new Date(fechaRet+"T00:00:00");
    const diasT=Math.max(1,diffDays(ini,ret));
    const salDia=neg.salDia,salMes=salDia*30;
    const primaProp=(salMes+((salMes<=2*smlmv)?auxTr:0))*(diasT%180)/360;
    const cesProp=(salMes+((salMes<=2*smlmv)?auxTr:0))*diasT/360;
    const intCes=cesProp*diasT*.12/360;
    const vacProp=salMes*diasT/720;
    const indem=calcIndemnizacion({salDia,tipoContrato:tipoCon,motivoRetiro:motivoRet,fechaInicio:fechaIniCon,fechaRetiro:fechaRet,smlmv,duracionMeses:durCon});
    const total=primaProp+cesProp+intCes+vacProp+indem;
    return {diasT,primaProp,cesProp,intCes,vacProp,indem,total,salDia,salMes}
  },[fechaIniCon,fechaRet,neg,smlmv,auxTr,tipoCon,motivoRet,durCon]);

  const toggleNov=useCallback(d=>{if(!d)return;const k=dKey(d);setNovs(p=>{const n={...p};if(n[k]===selNov)delete n[k];else n[k]=selNov;return n})},[selNov]);
  const addC=useCallback((tipoId)=>{
    const t=CONCEPTOS_LEY.find(c=>c.id===tipoId);
    if(!t)return;
    setConceptos(p=>[...p,{id:Date.now(),tipoId:t.id,nombre:t.id==="otro"?"":t.nombre,valor:0,esSalarial:t.esSalarial,esPrestacional:t.esPrestacional,art:t.art,desc:t.desc,custom:t.id==="otro"}]);
  },[]);
  const delC=useCallback(id=>setConceptos(p=>p.filter(c=>c.id!==id)),[]);
  const updC=useCallback((id,f,v)=>setConceptos(p=>p.map(c=>c.id===id?{...c,[f]:v}:c)),[]);
  const setExt=useCallback((id,v)=>setExtHoras(p=>({...p,[id]:Math.max(0,v||0)})),[]);
  // ★ Print functions — two versions
  const printDoc=useCallback((tipo)=>{
    const retV=ret?ret.retencion:0;
    const netoFinal=neg.neto-retV;
    const diasTrabajo=DL.filter((_,i)=>workDays[i]).join(", ");
    const hMes=Math.round(hDia*dmProm);
    const hCont=tipoCon==="fijo"?Math.round(hDia*dmProm*(contrato.durMeses||durCon)):null;
    const isEmp=tipo==="empleador";
    const titulo=isEmp?`Resumen Empleador — ${cargo||"Sin cargo"}`:`Propuesta Salarial — ${cargo||"Sin cargo"}`;

    const css=`*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,-apple-system,sans-serif;color:#111111;font-size:11.5px;line-height:1.5;padding:28px 40px;max-width:780px;margin:0 auto;-webkit-print-color-adjust:exact;print-color-adjust:exact}
h1{font-size:20px;font-weight:800;letter-spacing:-0.5px}h2{font-size:12px;font-weight:700;margin-bottom:6px;padding-bottom:4px;border-bottom:2px solid #E5E3DE}
.hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #111111;padding-bottom:10px;margin-bottom:14px}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:10px}.g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.g5{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}
.box{border:1px solid #d1d5db;border-radius:8px;padding:10px 12px;margin-bottom:8px}
.tag{display:inline-block;font-size:8px;font-weight:600;padding:1px 6px;border-radius:8px;margin-left:4px}
.row{display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid #F5F4F1}.row b{font-family:monospace;font-size:12px}
.lbl{font-size:8px;color:#666666;text-transform:uppercase;letter-spacing:0.5px}.sub{font-size:9px;color:#999999}
.big{font-size:30px;font-weight:800;font-family:monospace}.sep{border-top:2px solid #E5E3DE;margin:5px 0}
.neto{background:#059669!important;border-radius:8px;padding:14px 18px;color:#fff!important;text-align:center;margin:10px 0;-webkit-print-color-adjust:exact;print-color-adjust:exact;border:3px solid #059669}
.cost{background:#111111!important;border-radius:8px;padding:14px 18px;color:#fff!important;margin:10px 0;-webkit-print-color-adjust:exact;print-color-adjust:exact;border:3px solid #111111}
.q{border-radius:8px;padding:12px;text-align:center;border:1px solid #d1d5db}
.sig{border-top:1.5px solid #111111;padding-top:6px;text-align:center;margin-top:40px}
.ft{font-size:8px;color:#999999;border-top:1px solid #E5E3DE;padding-top:6px;margin-top:16px}
table{width:100%;font-size:11px;border-collapse:collapse}td{padding:2px 0}td:last-child{font-weight:700}
.hl{background:#FAFAF8;border-radius:6px;padding:8px 10px;text-align:center}
@media print{@page{margin:1cm 1.5cm;size:A4}body{padding:0}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important}.neto,.cost,.hdr,.box{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}}`+
`.no-print{display:none}@media screen{.no-print{display:block}}`;

    // Header
    let h=`<div class="hdr"><div><h1>${isEmp?"RESUMEN EMPLEADOR":"PROPUESTA SALARIAL"}</h1><div style="font-size:10px;color:#666666">Colombia 2026 · Decretos 1469-1470/2025</div></div><div style="text-align:right;font-size:10px;color:#666666"><b style="font-size:11px;color:#111111">${new Date().toLocaleDateString("es-CO",{day:"numeric",month:"long",year:"numeric"})}</b></div></div>`;

    // Contract info
    h+=`<div class="g3" style="margin-bottom:10px">${[{l:"Cargo",v:cargo||"\u2014"},{l:"Contrato",v:tipoCon==="fijo"?"T\u00e9rmino fijo \u2014 "+(contrato.label||durCon+"m"):tipoCon==="indefinido"?"Indefinido":"Obra o labor"},{l:"Frecuencia",v:freqPago==="quincenal"?"Quincenal ("+pctQ1+"/"+String(100-pctQ1)+")":"Mensual"}].map(x=>'<div class="box" style="padding:6px 10px"><div class="lbl">'+x.l+'</div><div style="font-size:13px;font-weight:700">'+x.v+'</div></div>').join("")}</div>`;

    // Jornada + Conditions
    h+=`<div class="g2" style="margin-bottom:10px"><div class="box"><h2>\ud83d\udd50 Jornada Laboral</h2><table><tr><td>D\u00edas/semana:</td><td>${dSem} \u2014 ${diasTrabajo}</td></tr><tr><td>Horario:</td><td>${hIni}:00 \u2014 ${hFin}:00 (${almuerzo}h almuerzo)</td></tr><tr><td>Horas/d\u00eda:</td><td>${hDia}h</td></tr><tr><td>Horas/semana:</td><td>${hSem}h</td></tr><tr><td>Horas/mes:</td><td>~${Math.round(hDia*dmLab)}h (${dmLab} d\u00edas)</td></tr>${hCont?"<tr><td>Total horas contrato:</td><td style='color:#0D5E6E;font-size:13px'>~"+hCont+"h</td></tr>":""}${tipoJornada==="parcial"&&dmDom>0?"<tr><td>Dominical (Art.172):</td><td>"+dmDom+"d/mes \u2014 Base salario: <b>"+dmProm+"d/mes</b></td></tr>":""}</table></div><div class="box"><h2>\ud83d\udccb Condiciones</h2><table><tr><td>Per\u00edodo de prueba:</td><td>${contrato.ppDias||60} d\u00edas</td></tr><tr><td>Vacaciones:</td><td>${contrato.vacDias||(tipoCon==="fijo"?(15*durCon/12).toFixed(1):"15")} d\u00edas h\u00e1biles</td></tr><tr><td>Salario m\u00ednimo:</td><td>${$(smlmv)}</td></tr><tr><td>Aux. transporte:</td><td>${$(auxTr)}</td></tr>${isEmp?"<tr><td>ARL:</td><td>Nivel "+ARL[Math.max(0,arlIdx)].n+" ("+pc(ARL[Math.max(0,arlIdx)].t)+")</td></tr>":""}${isEmp&&art114?"<tr><td colspan='2' style='color:#059669;font-weight:700'>\u2705 Exoneraci\u00f3n Art. 114-1</td></tr>":""}</table></div></div>`;

    // Salary breakdown
    h+=`<div class="box"><h2>Composici\u00f3n Salarial Mensual</h2><div class="row"><span>Salario base</span><b>${$(neg.salario)}</b></div><div class="sub">${neg.dias}d \u00d7 ${$(neg.salDia)}/d\u00eda</div>`;
    if(neg.bono>0)h+=`<div class="row"><span>${bonoConcepto} <span class="tag" style="background:#EDE8F4;color:#5B3A8C">No salarial Art.128</span></span><b>${$(neg.bono)}</b></div>`;
    conceptos.filter(c=>c.valor>0).forEach(c=>{h+=`<div class="row"><span>${c.nombre||"Concepto"} <span class="tag" style="background:${c.esSalarial?"#fee2e2;color:#dc2626":"#dcfce7;color:#16a34a"}">${c.esSalarial?"Salarial":"No salarial"}</span></span><b>${$((c.valor/30)*neg.dias)}</b></div>`});
    if(neg.auxDev>0)h+=`<div class="row"><span>Auxilio de transporte</span><b>${$(neg.auxDev)}</b></div>`;
    h+=`<div class="sep"></div><div class="row"><span style="font-weight:700">TOTAL BRUTO MENSUAL</span><b style="font-size:14px">${$(neg.devTotal)}</b></div>`;
    if(isEmp)h+=`<div class="row"><span style="font-weight:700">IBC</span><b style="color:#0D5E6E">${$(neg.ibc)}</b></div><div class="sub">${neg.esSub?"Tipo 51 PILA: "+neg.tramo:"Contributivo: SMLMV completo"}</div>`;
    h+=`</div>`;

    // Deductions
    h+=`<div class="box"><h2>Deducciones de Ley</h2>`;
    if(!neg.esSub)h+=`<div class="row"><span>EPS (Salud) \u2014 4%</span><b>${$(neg.sE)}</b></div>`;
    else h+=`<div class="row"><span>EPS \u2014 Subsidiado</span><b>$0</b></div>`;
    h+=`<div class="row"><span>Pensi\u00f3n \u2014 4%</span><b>${$(neg.pE)}</b></div>`;
    if(neg.fspV>0)h+=`<div class="row"><span>FSP</span><b>${$(neg.fspV)}</b></div>`;
    if(retV>0)h+=`<div class="row"><span>Retenci\u00f3n fuente</span><b>${$(retV)}</b></div>`;
    h+=`<div class="sep"></div><div class="row"><span style="font-weight:700">TOTAL DEDUCCIONES</span><b style="color:#dc2626">${$(neg.totDed+retV)}</b></div></div>`;

    // Neto
    h+=`<div class="neto"><div style="font-size:11px;opacity:.9">NETO A RECIBIR MENSUAL</div><div class="big">${$(netoFinal)}</div></div>`;

    // ★ EMPLOYER SECTION — only for empleador
    if(isEmp){
      // 40% validation
      const noSalT=(!bonoPrest?neg.bono:0)+neg.cNoSal;
      const remT=neg.salario+neg.bono+neg.cSal+neg.cNoSal;
      if(remT>0&&noSalT>0){const pct40=noSalT/remT*100;h+=`<div class="box" style="background:${pct40>40?"#fef2f2":"#f0fdf4"}"><div class="row"><span style="font-weight:700">${pct40>40?"\u26a0\ufe0f":"\u2705"} L\u00edmite 40% no salarial (Ley 1393/2010)</span><b>${pct40.toFixed(1)}%</b></div><div class="sub">No salarial: ${$(noSalT)} · L\u00edmite: ${$(remT*0.4)} · Salarial: ${$(remT-noSalT)}</div></div>`}

      // Employer costs
      h+=`<div class="g2"><div class="box"><h2 style="color:#1E6B42">Costos Empleador \u2014 ${$(neg.totAp)}</h2>`;
      h+=`<div class="row"><span>${neg.exS?"EPS empl. \u2705 Exonerado":"EPS empleador 8.5%"}</span><b>${$(neg.sEr)}</b></div>`;
      h+=`<div class="row"><span>Pensi\u00f3n empl. 12%</span><b>${$(neg.pEr)}</b></div>`;
      h+=`<div class="row"><span>ARL ${ARL[Math.max(0,arlIdx)].n} ${pc(ARL[Math.max(0,arlIdx)].t)}</span><b>${$(neg.arlV)}</b></div>`;
      h+=`<div class="row"><span>Caja 4%</span><b>${$(neg.caja)}</b></div>`;
      h+=`<div class="row"><span>${neg.exPF?"ICBF \u2705":"ICBF 3%"}</span><b>${$(neg.icbf)}</b></div>`;
      h+=`<div class="row"><span>${neg.exPF?"SENA \u2705":"SENA 2%"}</span><b>${$(neg.sena)}</b></div>`;
      h+=`<div class="sep"></div><div class="row"><span style="font-weight:700">TOTAL</span><b style="color:#1E6B42">${$(neg.totAp)}</b></div></div>`;

      // Prestaciones
      h+=`<div class="box"><h2 style="color:#5B3A8C">Prestaciones \u2014 ${$(neg.totPr)}</h2>`;
      h+=`<div class="row"><span>Prima 8.33%</span><b>${$(neg.pri)}</b></div>`;
      h+=`<div class="row"><span>Cesant\u00edas 8.33%</span><b>${$(neg.ces)}</b></div>`;
      h+=`<div class="row"><span>Int. cesant\u00edas 1%</span><b>${$(neg.intC)}</b></div>`;
      h+=`<div class="row"><span>Vacaciones 4.17%</span><b>${$(neg.vac)}</b></div>`;
      h+=`<div class="sep"></div><div class="row"><span style="font-weight:700">TOTAL</span><b style="color:#5B3A8C">${$(neg.totPr)}</b></div></div></div>`;

      // Cost total
      h+=`<div class="cost"><div style="font-size:10px;opacity:.8">COSTO TOTAL EMPRESA</div><div class="g3" style="margin-top:6px"><div><div style="font-size:9px;opacity:.7">Devengado</div><div style="font-size:15px;font-weight:800;font-family:monospace">${$(neg.devTotal)}</div></div><div><div style="font-size:9px;opacity:.7">Costo/mes</div><div style="font-size:18px;font-weight:800;font-family:monospace">${$(neg.costoT)}</div></div><div><div style="font-size:9px;opacity:.7">Costo contrato (${tipoCon==="fijo"?(contrato.label||durCon+"m"):"anual"})</div><div style="font-size:15px;font-weight:800;font-family:monospace">${$(neg.costoT*(tipoCon==="fijo"?(contrato.durMeses||durCon):12))}</div></div></div></div>`;

      // Daily breakdown
      h+=`<div class="box"><h2>Desglose por D\u00eda / Hora</h2><div class="g4" style="text-align:center">${[{l:"Bruto/d\u00eda",v:neg.dias>0?neg.devTotal/neg.dias:0},{l:"Neto/d\u00eda",v:neg.dias>0?netoFinal/neg.dias:0},{l:"Neto/hora",v:neg.dias>0&&hDia>0?netoFinal/neg.dias/hDia:0},{l:"Costo empl./d\u00eda",v:neg.dias>0?neg.costoT/neg.dias:0}].map(x=>'<div><div class="lbl">'+x.l+'</div><div style="font-size:14px;font-weight:800;font-family:monospace">'+$(x.v)+'</div></div>').join("")}</div></div>`;

      // ★ Gastos vs Costos
      const gastoMes=neg.devTotal+neg.totAp;
      h+=`<div class="g2" style="margin-bottom:8px"><div class="box" style="background:#fef2f2;border-color:#fecaca"><h2 style="color:#dc2626">\ud83d\udcb8 Gasto mensual (tesorer\u00eda)</h2><div class="row"><span>N\u00f3mina</span><b>${$(neg.devTotal)}</b></div><div class="row"><span>SS + parafiscales empl.</span><b>${$(neg.totAp)}</b></div><div class="sep"></div><div class="row"><span style="font-weight:700">TOTAL GASTO/MES</span><b style="color:#dc2626">${$(gastoMes)}</b></div></div><div class="box" style="background:#E8F4EE;border-color:#C8E6D0"><h2 style="color:#1E6B42">\ud83d\udccb Provisi\u00f3n mensual (costo)</h2><div class="row"><span>Prima</span><b>${$(neg.pri)}</b></div><div class="row"><span>Cesant\u00edas</span><b>${$(neg.ces)}</b></div><div class="row"><span>Int. cesant\u00edas</span><b>${$(neg.intC)}</b></div><div class="row"><span>Vacaciones</span><b>${$(neg.vac)}</b></div><div class="sep"></div><div class="row"><span style="font-weight:700">TOTAL PROVISI\u00d3N/MES</span><b style="color:#1E6B42">${$(neg.totPr)}</b></div></div></div>`;

      // ★ Contract total + liquidation scenarios (only for fixed term)
      if(tipoCon==="fijo"&&durCon>0){
        const meses=contrato.durMeses||durCon;
        const dsCon=contrato.durDias||Math.round(meses*30);
        const baseLiq=neg.salMes30+((neg.salMes30<=2*smlmv)?auxTr:0);
        const salDia=neg.salMes30/30;
        const primaPr=baseLiq*dsCon/360;
        const cesP=baseLiq*dsCon/360;
        const intCesP=cesP*dsCon*0.12/360;
        const vacP=neg.salMes30*dsCon/720;
        const liqNorm=primaPr+cesP+intCesP+vacP;
        const indemMax=(neg.salMes30/30)*dsCon;
        const liqDesp=liqNorm+indemMax;
        const gastoTot=gastoMes*meses;

        h+=`<h2 style="margin-top:10px">Costo Total Contrato \u2014 ${contrato.label||meses+"m"}</h2>`;
        h+=`<div class="g2" style="margin-bottom:8px"><div class="box" style="background:#f0fdf4;border-color:#a7f3d0"><h2 style="color:#059669">\u2705 Fin contrato (sin renovaci\u00f3n)</h2><div class="row"><span>Prima proporcional</span><b>${$(primaPr)}</b></div><div class="row"><span>Cesant\u00edas</span><b>${$(cesP)}</b></div><div class="row"><span>Int. cesant\u00edas</span><b>${$(intCesP)}</b></div><div class="row"><span>Vacaciones</span><b>${$(vacP)}</b></div><div class="sep"></div><div class="row"><span style="font-weight:700">Liquidaci\u00f3n</span><b style="color:#059669">${$(liqNorm)}</b></div><div style="margin-top:4px;padding-top:4px;border-top:1px solid #a7f3d0"><div class="row"><span style="font-weight:700">COSTO TOTAL</span><b>${$(gastoTot+liqNorm)}</b></div></div></div>`;
        h+=`<div class="box" style="background:#fef2f2;border-color:#fecaca"><h2 style="color:#dc2626">\u26a0\ufe0f Despido sin justa causa (Art. 64)</h2><div class="row"><span>Liquidaci\u00f3n (siempre)</span><b>${$(liqNorm)}</b></div><div class="row"><span>Indemnizaci\u00f3n (${dsCon}d)</span><b style="color:#dc2626">${$(indemMax)}</b></div><div class="sep"></div><div class="row"><span style="font-weight:700">TOTAL DESPIDO (peor caso)</span><b style="color:#dc2626">${$(liqNorm+indemMax)}</b></div><div style="margin-top:4px;padding-top:4px;border-top:1px solid #fecaca"><div class="row"><span style="font-weight:700">COSTO TOTAL</span><b>${$(gastoTot+liqNorm+indemMax)}</b></div></div></div></div>`;

        // Payment calendar
        h+=`<h2>\ud83d\udcc5 Calendario de pagos previstos</h2><div class="box" style="font-size:10px">`;
        if(durMode==="fechas"&&contrato.fechaIni&&contrato.fechaFin){
          const ini=contrato.fechaIni,fin=contrato.fechaFin,fmt=d=>d.toLocaleDateString("es-CO",{day:"numeric",month:"short",year:"numeric"});
          for(let y=ini.getFullYear();y<=fin.getFullYear();y++){
            const jun30=new Date(y,5,30),dic20=new Date(y,11,20);
            if(jun30>=ini&&jun30<=fin){const si=new Date(y,0,1)<ini?ini:new Date(y,0,1);h+=`<div class="row"><span>\ud83d\udccc <b>${fmt(jun30)}</b> \u2014 Prima 1er sem.</span><b>${$(baseLiq*diffDays(si,jun30)/360)}</b></div>`}
            if(dic20>=ini&&dic20<=fin){const si=new Date(y,6,1)<ini?ini:new Date(y,6,1);h+=`<div class="row"><span>\ud83d\udccc <b>${fmt(dic20)}</b> \u2014 Prima 2do sem.</span><b>${$(baseLiq*diffDays(si,dic20)/360)}</b></div>`}
          }
          h+=`<div class="row" style="background:#fef2f2"><span>\ud83d\udd34 <b>${fmt(fin)}</b> \u2014 Liquidaci\u00f3n final</span><b style="color:#dc2626">${$(liqNorm)}</b></div>`;
          h+=`<div class="row"><span>\ud83d\udccc <b>${fmt(new Date(fin.getFullYear()+1,0,31))}</b> \u2014 Int. ces. \u2192 empleado</span><b>${$(intCesP)}</b></div>`;
          h+=`<div class="row"><span>\ud83d\udccc <b>${fmt(new Date(fin.getFullYear()+1,1,14))}</b> \u2014 Cesant\u00edas \u2192 fondo</span><b>${$(cesP)}</b></div>`;
        }else{
          if(meses>=6)h+=`<div class="row"><span>\ud83d\udccc <b>Mes 6</b> \u2014 Prima 1er semestre</span><b>${$(baseLiq*180/360)}</b></div>`;
          if(meses>=12)h+=`<div class="row"><span>\ud83d\udccc <b>Mes 12</b> \u2014 Prima 2do semestre</span><b>${$(baseLiq*180/360)}</b></div>`;
          h+=`<div class="row" style="background:#fef2f2"><span>\ud83d\udd34 <b>Mes ${meses} (fin)</b> \u2014 Liquidaci\u00f3n final</span><b style="color:#dc2626">${$(liqNorm)}</b></div>`;
          h+=`<div class="row"><span>\ud83d\udccc <b>Mes ${Math.round(meses)+1}</b> \u2014 Int. ces. \u2192 empleado</span><b>${$(intCesP)}</b></div>`;
          h+=`<div class="row"><span>\ud83d\udccc <b>Mes ${Math.round(meses)+2}</b> \u2014 Cesant\u00edas \u2192 fondo</span><b>${$(cesP)}</b></div>`;
        }
        h+=`</div>`;

        // ★ Indemnización por tramos
        h+=`<div class="box"><h2 style="color:#dc2626">\u26a0\ufe0f Indemnizaci\u00f3n seg\u00fan momento del despido (Art. 64 CST)</h2>`;
        h+=`<div class="sub" style="margin-bottom:6px">Salario diario: ${$(salDia)} \u00d7 d\u00edas restantes del contrato</div>`;
        h+=`<table style="font-size:10px;border-collapse:collapse"><tr style="border-bottom:2px solid #E5E3DE"><th style="text-align:left;padding:3px 6px;color:#666666">Mes</th><th style="text-align:right;padding:3px 6px;color:#666666">D\u00edas rest.</th><th style="text-align:right;padding:3px 6px;color:#666666">Indemnizaci\u00f3n</th></tr>`;
        const totalM=Math.ceil(meses);
        for(let m=0;m<=totalM;m++){
          const dt=Math.min(dsCon,Math.round(m*30));
          const dr=Math.max(0,dsCon-dt);
          const ind=salDia*dr;
          const bg=m%2?"#fef2f2":"transparent";
          const color=dr===0?"#059669":"#dc2626";
          h+=`<tr style="background:${bg}"><td style="padding:3px 6px;font-weight:700">Mes ${m}</td><td style="padding:3px 6px;text-align:right;font-family:monospace;color:#666666">${dr}d</td><td style="padding:3px 6px;text-align:right;font-weight:700;font-family:monospace;color:${color}">${$(ind)}</td></tr>`;
        }
        h+=`</table></div>`;
      }

      // ★ Dotación (Art. 230 CST)
      if(isEmp&&neg.salMes30<=2*smlmv){
        h+=`<div class="box"><h2 style="color:#92400e">\ud83d\udc54 Dotaci\u00f3n (Art. 230 CST)</h2><div class="sub" style="margin-bottom:4px">Obligatoria para salario \u2264 2 SMLMV. 3 entregas/a\u00f1o. Requiere m\u00ednimo 3 meses de antig\u00fcedad.</div>`;
        h+=`<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;text-align:center;font-size:10px">`;
        [{n:1,mes:"30 Abr",m:4},{n:2,mes:"31 Ago",m:8},{n:3,mes:"20 Dic",m:12}].forEach(e=>{
          const aplica=tipoCon==="fijo"?(contrato.durMeses||durCon)>=e.m-3+3:true;
          h+=`<div style="background:${aplica?"#fefce8":"#FAFAF8"};border:1px solid ${aplica?"#fde68a":"#E5E3DE"};border-radius:6px;padding:8px 4px"><div style="font-weight:700">${aplica?"\ud83d\udc5f":"\u274c"} Entrega ${e.n}</div><div style="font-weight:700;margin:2px 0">${e.mes}</div><div style="font-size:9px;color:#999999">Calzado + vestido</div></div>`;
        });
        h+=`</div><div class="sub" style="margin-top:4px">\ud83d\udca1 La dotaci\u00f3n NO es salario ni se descuenta al trabajador. Es un gasto adicional del empleador (aprox. $150.000\u2013$300.000 por entrega).</div></div>`;
      }
    }

    // Quincenal
    if(freqPago==="quincenal"){
      const sq1=Math.round(neg.salario*(pctQ1/100)),sq2=neg.salario-sq1;
      const q1=sq1,q2=sq2+neg.bono+neg.auxDev-neg.totDed-retV;
      h+=`<div class="g2" style="margin-bottom:10px"><div class="q" style="background:#E8F4EE"><div class="lbl">Quincena 1 \u2014 D\u00eda 15 (${pctQ1}%)</div><div style="font-size:20px;font-weight:800;font-family:monospace;margin:4px 0">${$(q1)}</div><div class="sub">Anticipo fijo (solo salario)</div></div><div class="q" style="background:#f0fdf4"><div class="lbl">Quincena 2 \u2014 \u00daltimo d\u00eda (${100-pctQ1}%)</div><div style="font-size:20px;font-weight:800;font-family:monospace;margin:4px 0">${$(q2)}</div><div class="sub">Saldo + bono + aux \u2212 deducciones</div></div></div>`;
    }

    // Signatures — only for employee proposal
    if(!isEmp){
      h+=`<div class="g2 sig"><div><b>Empleador</b><div class="sub">Firma, nombre y NIT</div></div><div><b>Trabajador</b><div class="sub">Firma, nombre y c\u00e9dula</div></div></div>`;
    }
    if(isEmp){
      h+=`<div style="margin-top:20px;padding:10px 14px;background:#FAFAF8;border:1px solid #E5E3DE;border-radius:8px;font-size:9px;color:#666666;text-align:center">Documento interno \u2014 Resumen de costos para la empresa. No requiere firma.</div>`;
    }

    // Footer
    h+=`<div class="ft">\ud83d\udcda CST Arts. 46-47, 64, 76-80, 127-128, 130, 186; Ley 50/1990; Ley 100/1993; Ley 2101/2021; Art. 114-1 E.T.; Decreto 2616/2013; Decreto 1469/2025; Decreto 1470/2025.${isEmp?" Ley 1393/2010 Art. 30 (l\u00edmite 40%).":""} Propuesta de referencia \u2014 no constituye contrato de trabajo.</div>`;

    const doc=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${titulo}</title><style>${css}</style></head><body>${h}</body></html>`;
    return {doc,titulo};
  },[neg,ret,cargo,tipoCon,durCon,contrato,regimenSalud,workDays,dSem,hIni,hFin,almuerzo,hDia,hSem,dmProm,dmLab,dmDom,tipoJornada,jOk,art114,arlIdx,freqPago,pctQ1,smlmv,auxTr,usarBono,bonoConcepto,bonoPrest,conceptos,calcRet,uvt]);

  const openDoc=useCallback((tipo,download)=>{
    try{
      const {doc,titulo}=printDoc(tipo);
      const filename=titulo.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ ]/g,"").replace(/\s+/g," ").trim();
      if(download){
        // Inject html2pdf script + auto-download into the document
        const pdfDoc=doc.replace("</body>",`
<div id="pdf-status" style="position:fixed;top:0;left:0;right:0;padding:12px;background:#111111;color:#fff;text-align:center;font-size:14px;font-weight:700;z-index:9999;font-family:system-ui">⏳ Generando PDF... espera un momento</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.2/html2pdf.bundle.min.js"><\/script>
<script>
window.onload=function(){
  var st=document.getElementById("pdf-status");
  if(!window.html2pdf){st.textContent="⚠️ No se pudo cargar. Usa Cmd+P → PDF";st.style.background="#dc2626";return}
  st.style.display="none";
  html2pdf().set({margin:[8,12,8,12],filename:"${filename}.pdf",image:{type:"jpeg",quality:0.95},html2canvas:{scale:2,useCORS:true,logging:false},jsPDF:{unit:"mm",format:"a4",orientation:"portrait"},pagebreak:{mode:["avoid-all","css","legacy"]}}).from(document.body).save().then(function(){
    st.textContent="✅ PDF descargado: ${filename}.pdf";st.style.display="block";st.style.background="#059669";
    setTimeout(function(){window.close()},2000);
  }).catch(function(){st.textContent="⚠️ Error. Usa Cmd+P → PDF";st.style.display="block";st.style.background="#dc2626"});
};
<\/script></body>`);
        const blob=new Blob([pdfDoc],{type:"text/html;charset=utf-8"});
        const url=URL.createObjectURL(blob);
        window.open(url,"_blank");
        setTimeout(()=>URL.revokeObjectURL(url),30000);
      }else{
        // View only — no pdf generation
        const blob=new Blob([doc],{type:"text/html;charset=utf-8"});
        const url=URL.createObjectURL(blob);
        window.open(url,"_blank");
      }
    }catch(e){alert("Error: "+e.message)}
  },[printDoc]);



  // ★ Generate Proposal — modal with candidate data
  const [showProp,setShowProp]=useState(false);
  const [propForm,setPropForm]=useState({modo:"link",ciudad:"Bogotá D.C.",centro:"",candidato_nombre:"",tipo_documento:"CC",candidato_cc:"",candidato_email:"",candidato_celular:"",candidato_eps:"",candidato_pension:"",entidadBancaria:"",tipoCuenta:"ahorros",cuentaBancaria:"",estado_inicial:"propuesta"});
  const upP=(k,v)=>setPropForm(p=>({...p,[k]:v}));

  // Document checklist for expediente
  const ALL_DOCS = {
    candidato: [
      {key:"cedula_anverso",label:"Cédula anverso",def:true},
      {key:"cedula_reverso",label:"Cédula reverso",def:true},
      {key:"contrasena",label:"Contraseña",def:false},
      {key:"cert_eps",label:"Certificado EPS",def:true},
      {key:"cert_pension",label:"Certificado Pensiones",def:true},
      {key:"cert_banco",label:"Certificado cuenta bancaria",def:true},
      {key:"hoja_vida",label:"Hoja de vida",def:false},
      {key:"cert_estudio",label:"Certificados estudio",def:false},
      {key:"libreta_militar",label:"Libreta militar",def:false},
      {key:"rut",label:"RUT",def:false},
    ],
    empresa: [
      {key:"condiciones_trabajador",label:"Condiciones trabajador",def:true},
      {key:"condiciones_empleador",label:"Condiciones empleador",def:true},
      {key:"contrato",label:"Contrato laboral",def:true},
      {key:"descriptor",label:"Descriptor de cargo",def:true},
      {key:"centro_trabajo",label:"Centro de trabajo",def:true},
      {key:"examen_medico",label:"Examen médico",def:true},
      {key:"recomendaciones_sst",label:"Recomendaciones SST",def:true},
      {key:"psicotecnico",label:"Psicotécnicos / DISC",def:true},
      {key:"antecedentes",label:"Antecedentes",def:true},
      {key:"cert_arl",label:"ARL",def:true},
      {key:"cert_caja",label:"Caja compensación",def:true},
    ]
  };
  const [selDocs,setSelDocs]=useState(()=>{const s={};[...ALL_DOCS.candidato,...ALL_DOCS.empresa].forEach(d=>{s[d.key]=d.def});return s;});
  const toggleDoc=(key)=>setSelDocs(p=>({...p,[key]:!p[key]}));

  const generarPropuesta = async () => {
    if(!cargo){alert("El cargo es obligatorio");return;}
    if(!valorSal){alert("Ingresa el salario");return;}
    if(propForm.modo==="manual"){
      const f=propForm;
      if(!f.candidato_nombre){alert("Nombre del candidato es obligatorio");return;}
      if(!f.candidato_cc){alert("Número de documento es obligatorio");return;}
      if(!f.candidato_email){alert("Email es obligatorio");return;}
      if(!f.candidato_celular){alert("Celular es obligatorio");return;}
      if(!f.candidato_eps){alert("EPS es obligatoria");return;}
      if(!f.candidato_pension){alert("Fondo de pensión es obligatorio");return;}
      if(!f.entidadBancaria){alert("Banco es obligatorio");return;}
      if(!f.cuentaBancaria){alert("Número de cuenta es obligatorio");return;}
    }
    const body = {
      cargo, area:"", tipo_contrato:tipoCon||"fijo", duracion_meses:durMode==="meses"?durMeses:Math.round((contrato.durDias||180)/30),
      modo_salario:modoSal, salario_neto:neg.neto, salario_base:neg.salario, auxilio_transporte:neg.auxDev,
      bono_no_salarial:neg.bono, bono_es_salarial:bonoPrest, bono_por_asistencia:bonoTrat==="asistencia",
      bono_concepto:bonoConcepto, jornada_horas:hSem, horario:`${hIni}:00 a ${hFin}:00`,
      dias_laborales:DL.filter((_,i)=>workDays[i]).join(", "), ciudad:propForm.ciudad,
      fecha_inicio:fechaIniCont||"", periodo_prueba:contrato.ppDias?contrato.ppDias+" días":"Dos (2) meses",
      regimen_salud:regimenSalud, arl_nivel:arlIdx>=0?arlIdx:0, exoneracion_114:art114,
      inicio_manual:propForm.modo==="manual", estado_inicial:propForm.modo==="manual"?propForm.estado_inicial:"propuesta",
      candidato_nombre:propForm.candidato_nombre, candidato_cc:propForm.tipo_documento+" "+propForm.candidato_cc,
      candidato_email:propForm.candidato_email, candidato_celular:(propForm.cod_pais||"+57")+" "+propForm.candidato_celular,
      candidato_eps:propForm.candidato_eps, candidato_pension:propForm.candidato_pension,
      entidadBancaria:propForm.entidadBancaria, cuentaBancaria:propForm.cuentaBancaria,
      // Condiciones laborales completas (se guardan para consulta permanente)
      _condiciones: {
        trabajador: { salario_base:neg.salario, auxilio_transporte:neg.auxDev, bono:neg.bono, bono_concepto:bonoConcepto, bono_prestacional:bonoPrest, bono_tratamiento:bonoTrat, devengado:neg.devTotal, eps_empleado:neg.sE, pension_empleado:neg.pE, fsp:neg.fspV, total_deducciones:neg.totDed, neto:neg.neto, modo_salario:modoSal, jornada_horas:hSem, jornada_dias:DL.filter((_,i)=>workDays[i]).join(", "), horario:`${hIni}:00 a ${hFin}:00`, tipo_jornada:tipoJornada, dias_mes:neg.dm, regimen:regimenSalud },
        empleador: { salario_base:neg.salario, ibc:neg.ibc, eps_empleador:neg.sEr, pension_empleador:neg.pEr, arl:neg.arlV, arl_nivel:ARL[Math.max(0,arlIdx)]?.l||"I", caja:neg.caja, icbf:neg.icbf, sena:neg.sena, total_aportes:neg.totAp, prima:neg.pri, cesantias:neg.ces, int_cesantias:neg.intC, vacaciones:neg.vac, total_provisiones:neg.totPr, costo_total_mes:neg.costoT, costo_indirecto:neg.costoInd, factor:neg.salario>0?(neg.costoT/neg.salario).toFixed(2):"—", exoneracion_114:art114, duracion_meses:durMode==="meses"?durMeses:Math.round((contrato.durDias||180)/30), costo_contrato:neg.costoT*(durMode==="meses"?durMeses:Math.round((contrato.durDias||180)/30)) },
        html_trabajador: printDoc("propuesta")?.doc||"",
        html_empleador: printDoc("empleador")?.doc||"",
        generado: new Date().toISOString()
      },
      _docs_requeridos: selDocs,
    };
    try {
      const r = await fetch("/api/hiring",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      const d = await r.json();
      if(d.ok){
        setShowProp(false);
        alert("✅ Propuesta creada: "+d.data.codigo+"\n\nNeto: "+$(neg.neto)+"\nCosto empresa: "+$(neg.costoT)+"/mes"+(d.links?.propuesta?"\n\nLink:\n"+d.links.propuesta:""));
      }else{alert("Error: "+(d.error||"desconocido"));}
    }catch(e){alert("Error: "+e.message);}
  };

  /* ══════════════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════════════ */
  return <div style={{fontFamily:"'DM Sans',sans-serif",color:"#111111"}}>
    <div style={{padding:"0 0 6px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
      <div style={{display:"inline-block",fontSize:10,fontWeight:700,color:"#1E6B42",background:"#E8F4EE",padding:"3px 12px",borderRadius:14}}>🇨🇴 COLOMBIA 2026 · SMLMV {$(SMLMV_DEF)} · Aux. {$(AUX_DEF)}</div>
      {neg&&neg.salario>0&&<div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        <div style={{display:"flex",gap:0}}>
          <button type="button" onClick={()=>openDoc("propuesta",false)} style={{padding:"8px 12px",background:"#E8F4EE",color:"#1E6B42",border:"1px solid #1E6B42",borderRadius:"8px 0 0 8px",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>📋 Condiciones trabajador</button>
          <button type="button" onClick={()=>openDoc("propuesta",true)} style={{padding:"8px 8px",background:"#1E6B42",color:"#fff",border:"1px solid #1E6B42",borderRadius:"0 8px 8px 0",fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>PDF</button>
        </div>
        <div style={{display:"flex",gap:0}}>
          <button type="button" onClick={()=>openDoc("empleador",false)} style={{padding:"8px 12px",background:"#EFF6FF",color:"#2563EB",border:"1px solid #2563EB",borderRadius:"8px 0 0 8px",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>💼 Condiciones empleador</button>
          <button type="button" onClick={()=>openDoc("empleador",true)} style={{padding:"8px 8px",background:"#2563EB",color:"#fff",border:"1px solid #2563EB",borderRadius:"0 8px 8px 0",fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>PDF</button>
        </div>
        <button type="button" onClick={()=>setShowProp(true)} style={{padding:"8px 18px",background:"#1E6B42",color:"#fff",border:"none",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>📤 Generar propuesta</button>
      </div>}
    </div>

    {/* ★ Modal completar datos propuesta */}
    {showProp&&<div style={{position:"fixed",inset:0,zIndex:300,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={()=>setShowProp(false)}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:12,maxWidth:560,width:"100%",maxHeight:"85vh",overflow:"auto",padding:24,boxShadow:"0 8px 30px rgba(0,0,0,.2)"}}>
        <div style={{fontSize:16,fontWeight:800,color:"#111",marginBottom:4}}>📤 Generar propuesta de empleo</div>
        <div style={{fontSize:11,color:"#666",marginBottom:14}}>
          {cargo} · {tipoCon==="fijo"?`Fijo ${durMeses||contrato.durMeses||""}m`:"Indefinido"} · Neto <strong>{$(neg.neto)}</strong> · Costo empresa <strong>{$(neg.costoT)}/mes</strong>
        </div>

        {/* Modo */}
        <div style={{display:"flex",gap:6,marginBottom:14}}>
          <button type="button" onClick={()=>upP("modo","link")} style={{flex:1,padding:"8px 12px",borderRadius:6,border:propForm.modo==="link"?"2px solid #111":"1px solid #E5E3DE",background:propForm.modo==="link"?"#111":"#fff",color:propForm.modo==="link"?"#fff":"#666",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>📤 Enviar link al candidato</button>
          <button type="button" onClick={()=>upP("modo","manual")} style={{flex:1,padding:"8px 12px",borderRadius:6,border:propForm.modo==="manual"?"2px solid #1E6B42":"1px solid #E5E3DE",background:propForm.modo==="manual"?"#E8F4EE":"#fff",color:propForm.modo==="manual"?"#1E6B42":"#666",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>✅ Ingresar manualmente</button>
        </div>

        {/* Ciudad */}
        <div style={{marginBottom:10}}>
          <label style={{display:"block",fontSize:10,fontWeight:600,color:"#666",marginBottom:2}}>Ciudad</label>
          <input value={propForm.ciudad} onChange={e=>upP("ciudad",e.target.value)} style={{width:"100%",padding:"7px 10px",border:"1px solid #E5E3DE",borderRadius:6,fontSize:12,fontFamily:"'DM Sans',sans-serif"}}/>
        </div>

        {/* Candidato (siempre visible en manual, opcional en link) */}
        {propForm.modo==="manual"&&<>
          <div style={{fontSize:11,fontWeight:700,color:"#666",letterSpacing:1,textTransform:"uppercase",margin:"12px 0 8px"}}>Datos del candidato</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <div><label style={{display:"block",fontSize:10,fontWeight:600,color:"#666",marginBottom:2}}>Nombre completo *</label><input value={propForm.candidato_nombre} onChange={e=>upP("candidato_nombre",e.target.value)} style={{width:"100%",padding:"7px 10px",border:"1px solid #E5E3DE",borderRadius:6,fontSize:12,fontFamily:"'DM Sans',sans-serif"}}/></div>
            <div><label style={{display:"block",fontSize:10,fontWeight:600,color:"#666",marginBottom:2}}>Documento *</label><div style={{display:"flex",gap:4}}><select value={propForm.tipo_documento} onChange={e=>upP("tipo_documento",e.target.value)} style={{padding:"7px 6px",border:"1px solid #E5E3DE",borderRadius:"6px 0 0 6px",fontSize:11,fontFamily:"'DM Sans',sans-serif",background:"#F5F4F1",color:"#111"}}><option value="CC">CC</option><option value="CE">CE</option><option value="TI">TI</option><option value="PP">PP</option><option value="NIT">NIT</option><option value="PEP">PEP</option><option value="PPT">PPT</option></select><input placeholder="Número" value={propForm.candidato_cc} onChange={e=>upP("candidato_cc",e.target.value)} style={{flex:1,padding:"7px 10px",border:"1px solid #E5E3DE",borderLeft:"none",borderRadius:"0 6px 6px 0",fontSize:12,fontFamily:"'DM Sans',sans-serif"}}/></div></div>
            <div><label style={{display:"block",fontSize:10,fontWeight:600,color:"#666",marginBottom:2}}>Email *</label><input value={propForm.candidato_email} onChange={e=>upP("candidato_email",e.target.value)} style={{width:"100%",padding:"7px 10px",border:"1px solid #E5E3DE",borderRadius:6,fontSize:12,fontFamily:"'DM Sans',sans-serif"}}/></div>
            <div><label style={{display:"block",fontSize:10,fontWeight:600,color:"#666",marginBottom:2}}>Celular *</label><div style={{display:"flex"}}><select value={propForm.cod_pais||"+57"} onChange={e=>upP("cod_pais",e.target.value)} style={{padding:"7px 4px",border:"1px solid #E5E3DE",borderRadius:"6px 0 0 6px",borderRight:"none",fontSize:11,fontFamily:"'DM Sans',sans-serif",background:"#F5F4F1",color:"#555"}}>
              <option value="+57">+57 🇨🇴</option><option value="+1">+1 🇺🇸</option><option value="+34">+34 🇪🇸</option><option value="+52">+52 🇲🇽</option><option value="+56">+56 🇨🇱</option><option value="+51">+51 🇵🇪</option><option value="+58">+58 🇻🇪</option><option value="+593">+593 🇪🇨</option>
            </select><input value={propForm.candidato_celular} onChange={e=>upP("candidato_celular",e.target.value)} placeholder="Número celular" style={{width:"100%",padding:"7px 10px",border:"1px solid #E5E3DE",borderRadius:"0 6px 6px 0",fontSize:12,fontFamily:"'DM Sans',sans-serif"}}/></div></div>
            <div><label style={{display:"block",fontSize:10,fontWeight:600,color:"#666",marginBottom:2}}>EPS *</label><select value={propForm.candidato_eps} onChange={e=>upP("candidato_eps",e.target.value)} style={{width:"100%",padding:"7px 10px",border:"1px solid #E5E3DE",borderRadius:6,fontSize:12,fontFamily:"'DM Sans',sans-serif"}}>
              <option value="">— Seleccionar —</option>
              <option value="Sanitas">Sanitas</option>
              <option value="Sura">Sura (Suramericana)</option>
              <option value="Nueva EPS">Nueva EPS</option>
              <option value="Compensar">Compensar</option>
              <option value="Famisanar">Famisanar</option>
              <option value="Salud Total">Salud Total</option>
              <option value="Coomeva">Coomeva</option>
              <option value="Medimás">Medimás</option>
              <option value="Aliansalud">Aliansalud</option>
              <option value="Coosalud">Coosalud</option>
              <option value="Mutual Ser">Mutual Ser</option>
              <option value="Comfenalco Valle">Comfenalco Valle</option>
              <option value="SOS">SOS</option>
              <option value="Capital Salud">Capital Salud</option>
              <option value="Savia Salud">Savia Salud</option>
              <option value="Emssanar">Emssanar</option>
              <option value="Asmet Salud">Asmet Salud</option>
              <option value="Ecoopsos">Ecoopsos</option>
              <option value="SISBEN">SISBEN (subsidiado)</option>
              <option value="Otra">Otra</option>
            </select></div>
            <div><label style={{display:"block",fontSize:10,fontWeight:600,color:"#666",marginBottom:2}}>Fondo pensión *</label><select value={propForm.candidato_pension} onChange={e=>upP("candidato_pension",e.target.value)} style={{width:"100%",padding:"7px 10px",border:"1px solid #E5E3DE",borderRadius:6,fontSize:12,fontFamily:"'DM Sans',sans-serif"}}>
              <option value="">— Seleccionar —</option>
              <option value="Porvenir">Porvenir</option>
              <option value="Protección">Protección</option>
              <option value="Colfondos">Colfondos</option>
              <option value="Skandia">Skandia</option>
              <option value="Colpensiones">Colpensiones (RPM)</option>
              <option value="Otro">Otro</option>
            </select></div>
            <div><label style={{display:"block",fontSize:10,fontWeight:600,color:"#666",marginBottom:2}}>Banco *</label><select value={propForm.entidadBancaria} onChange={e=>{const v=e.target.value;const digital=["Nequi","DaviPlata","Nu Colombia","Movii","Dale!"].includes(v);upP("entidadBancaria",v);if(digital)upP("tipoCuenta","deposito");else if(propForm.tipoCuenta==="deposito")upP("tipoCuenta","ahorros");}} style={{width:"100%",padding:"7px 10px",border:"1px solid #E5E3DE",borderRadius:6,fontSize:12,fontFamily:"'DM Sans',sans-serif"}}>
              <option value="">— Seleccionar —</option>
              <option value="Bancolombia">Bancolombia</option>
              <option value="Davivienda">Davivienda</option>
              <option value="BBVA">BBVA</option>
              <option value="Banco de Bogotá">Banco de Bogotá</option>
              <option value="Banco de Occidente">Banco de Occidente</option>
              <option value="Banco Popular">Banco Popular</option>
              <option value="Banco Caja Social">Banco Caja Social</option>
              <option value="Scotiabank Colpatria">Scotiabank Colpatria</option>
              <option value="Banco Agrario">Banco Agrario</option>
              <option value="Banco AV Villas">Banco AV Villas</option>
              <option value="Banco Itaú">Banco Itaú</option>
              <option value="Banco GNB Sudameris">Banco GNB Sudameris</option>
              <option value="Banco Falabella">Banco Falabella</option>
              <option value="Banco Pichincha">Banco Pichincha</option>
              <option value="Banco Serfinanza">Banco Serfinanza</option>
              <option value="Lulo Bank">Lulo Bank</option>
              <option value="Nequi">Nequi</option>
              <option value="DaviPlata">DaviPlata</option>
              <option value="Nu Colombia">Nu Colombia</option>
              <option value="Rappipay">Rappipay</option>
              <option value="Movii">Movii</option>
              <option value="Dale!">Dale!</option>
              <option value="Otro">Otro</option>
            </select></div>
            <div><label style={{display:"block",fontSize:10,fontWeight:600,color:"#666",marginBottom:2}}>Tipo cuenta / Nº *</label><div style={{display:"flex",gap:0}}><select value={propForm.tipoCuenta} onChange={e=>upP("tipoCuenta",e.target.value)} style={{padding:"7px 6px",border:"1px solid #E5E3DE",borderRadius:"6px 0 0 6px",borderRight:"none",fontSize:11,fontFamily:"'DM Sans',sans-serif",background:"#F5F4F1"}}>
              <option value="ahorros">Ahorros</option><option value="corriente">Corriente</option><option value="deposito">Depósito electrónico</option>
            </select><input value={propForm.cuentaBancaria} onChange={e=>upP("cuentaBancaria",e.target.value)} placeholder="Nº de cuenta" style={{width:"100%",padding:"7px 10px",border:"1px solid #E5E3DE",borderRadius:"0 6px 6px 0",fontSize:12,fontFamily:"'DM Sans',sans-serif"}}/></div></div>
          </div>
          <div style={{marginTop:10}}>
            <label style={{display:"block",fontSize:10,fontWeight:600,color:"#666",marginBottom:2}}>Estado inicial</label>
            <select value={propForm.estado_inicial} onChange={e=>upP("estado_inicial",e.target.value)} style={{width:"100%",padding:"7px 10px",border:"1px solid #E5E3DE",borderRadius:6,fontSize:12,fontFamily:"'DM Sans',sans-serif"}}>
              <option value="aceptada">Aceptada (pendiente datos)</option>
              <option value="datos_recibidos">Datos recibidos</option>
              <option value="completado">Contrato firmado y completo</option>
            </select>
          </div>
        </>}

        {/* Documentos requeridos */}
        <div style={{margin:"12px 0 0"}}>
          <div style={{fontSize:11,fontWeight:700,color:"#666",letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Documentos del expediente</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0,border:"1px solid #E5E3DE",borderRadius:8,overflow:"hidden"}}>
            <div style={{padding:"8px 10px",borderRight:"1px solid #E5E3DE"}}>
              <div style={{fontSize:10,fontWeight:700,color:"#111",marginBottom:4}}>👤 Candidato</div>
              {ALL_DOCS.candidato.map(d=><label key={d.key} style={{display:"flex",alignItems:"center",gap:5,fontSize:10,color:"#555",padding:"2px 0",cursor:"pointer"}}>
                <input type="checkbox" checked={!!selDocs[d.key]} onChange={()=>toggleDoc(d.key)} style={{margin:0,accentColor:"#1E6B42"}}/>
                {d.label}
              </label>)}
            </div>
            <div style={{padding:"8px 10px"}}>
              <div style={{fontSize:10,fontWeight:700,color:"#111",marginBottom:4}}>🏢 Empresa</div>
              {ALL_DOCS.empresa.map(d=><label key={d.key} style={{display:"flex",alignItems:"center",gap:5,fontSize:10,color:"#555",padding:"2px 0",cursor:"pointer"}}>
                <input type="checkbox" checked={!!selDocs[d.key]} onChange={()=>toggleDoc(d.key)} style={{margin:0,accentColor:"#1E6B42"}}/>
                {d.label}
              </label>)}
            </div>
          </div>
          <div style={{fontSize:9,color:"#999",marginTop:4}}>{Object.values(selDocs).filter(Boolean).length} documentos seleccionados</div>
        </div>

        {/* Resumen */}
        <div style={{background:"#F5F4F1",borderRadius:8,padding:"10px 14px",margin:"14px 0",fontSize:11,color:"#555",display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>
          <span>Salario base: <strong>{$(neg.salario)}</strong></span>
          <span>Aux. transporte: <strong>{$(neg.auxDev)}</strong></span>
          <span>{bonoConcepto||"Bono"}: <strong>{$(neg.bono)}</strong></span>
          <span>Neto: <strong style={{color:"#1E6B42"}}>{$(neg.neto)}</strong></span>
          <span>Aportes empl.: <strong>{$(neg.totAp)}</strong></span>
          <span>Costo total: <strong style={{color:"#111"}}>{$(neg.costoT)}/mes</strong></span>
        </div>

        <div style={{display:"flex",gap:8}}>
          <button type="button" onClick={generarPropuesta} style={{flex:1,padding:"10px",background:"#1E6B42",color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{propForm.modo==="manual"?"✅ Registrar proceso":"📤 Generar y enviar propuesta"}</button>
          <button type="button" onClick={()=>setShowProp(false)} style={{padding:"10px 18px",background:"#F5F4F1",color:"#666",border:"1px solid #E5E3DE",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Cancelar</button>
        </div>
      </div>
    </div>}

    <div style={{maxWidth:860,padding:"0 0 40px"}}>
      <div className="no-print"><TabBar tabs={[{i:"🧮",l:"Calculadora"},{i:"🚪",l:"Liquidación Final"}]} active={tab} set={setTab}/></div>

      {/* ══════ CONFIG ══════ */}
      <Card t="Parámetros Legales 2026" icon="⚙️" accent="#F5F4F1">
        <G3>
          <In label="SMLMV" prefix="$" value={smlmv.toLocaleString("es-CO")} onChange={e=>setSmlmv(Number(e.target.value.replace(/\D/g,""))||0)} help={`Día: ${$(smlmv/30)}`}/>
          <In label="Aux. Transporte" prefix="$" value={auxTr.toLocaleString("es-CO")} onChange={e=>setAuxTr(Number(e.target.value.replace(/\D/g,""))||0)} help={`Día: ${$(auxTr/30)}`}/>
          <Sel label="ARL" value={arlIdx} onChange={e=>setArlIdx(+e.target.value)} options={[{v:-1,l:"— Seleccionar ARL —"},...ARL.map((a,i)=>({v:i,l:`${a.n} — ${pc(a.t)} — ${a.d}`}))]}/>
        </G3>
        <G2>
          <div style={{background:art114?"#ecfdf5":"#fef2f2",borderRadius:8,padding:"8px 10px",border:art114?"1px solid #a7f3d0":"1px solid #fecaca"}}>
            <Tg label={art114?"✅ Exoneración Art. 114-1":"❌ Sin exoneración"} on={art114} set={setArt114} help={art114?"Ahorro: Salud 8.5%, SENA 2%, ICBF 3%":"Paga todos los aportes"}/>
          </div>
          <div style={{background:regimenSalud==="subsidiado"?"#E8F4EE":"#fff",borderRadius:8,padding:"8px 10px",border:regimenSalud==="subsidiado"?"1px solid #C8E6D0":"1px solid #E5E3DE"}}>
            <Sel label="Régimen salud" value={regimenSalud} onChange={e=>setRegimenSalud(e.target.value)} options={[{v:"",l:"— Seleccionar —"},{v:"contributivo",l:"Contributivo (EPS — 4%)"},{v:"subsidiado",l:"Subsidiado (SISBEN — $0)"}]}/>
          </div>
        </G2>
      </Card>

      {/* ══════ CONTRATO ══════ */}
      <Card t="Contrato" icon="📄" accent="#E8F4EE">
        <In label="Cargo" value={cargo} onChange={e=>setCargo(e.target.value)} type="text"/>
        <G3>
          <Sel label="Tipo contrato" value={tipoCon} onChange={e=>setTipoCon(e.target.value)} options={[{v:"",l:"— Seleccionar —"},{v:"fijo",l:"Término fijo"},{v:"indefinido",l:"Indefinido"},{v:"obra",l:"Obra o labor"}]}/>
          <Sel label="Frecuencia pago" value={freqPago} onChange={e=>setFreqPago(e.target.value)} options={[{v:"",l:"— Seleccionar —"},{v:"quincenal",l:"Quincenal (15 y último)"},{v:"mensual",l:"Mensual"}]}/>
          {freqPago==="quincenal"?<Sel label="Anticipo Q1" value={pctQ1} onChange={e=>setPctQ1(+e.target.value)} options={[{v:40,l:"40% / 60%"},{v:45,l:"45% / 55%"},{v:50,l:"50% / 50%"}]} help="% salario en Q1"/>:<div/>}
        </G3>
        {tipoCon==="fijo"&&<>
          <div style={{display:"flex",gap:0,background:"#F5F4F1",borderRadius:8,border:"1px solid #E5E3DE",overflow:"hidden",marginBottom:8}}>
            <button type="button" onClick={()=>setDurMode("meses")} style={{flex:1,padding:"6px",border:"none",cursor:"pointer",fontSize:10,fontWeight:700,fontFamily:"inherit",background:durMode==="meses"?"#111111":"transparent",color:durMode==="meses"?"#fff":"#666666"}}>Por meses</button>
            <button type="button" onClick={()=>setDurMode("fechas")} style={{flex:1,padding:"6px",border:"none",cursor:"pointer",fontSize:10,fontWeight:700,fontFamily:"inherit",background:durMode==="fechas"?"#111111":"transparent",color:durMode==="fechas"?"#fff":"#666666"}}>Por fechas</button>
          </div>
          {durMode==="meses"?
            <In label="Duración" type="number" value={durMeses} onChange={e=>setDurMeses(Math.max(1,+e.target.value||1))} suffix="meses"/>
          :<G2>
            <In label="Fecha inicio contrato" type="date" value={fechaIniCont} onChange={e=>setFechaIniCont(e.target.value)}/>
            <In label="Fecha fin contrato" type="date" value={fechaFinCont} onChange={e=>setFechaFinCont(e.target.value)}/>
          </G2>}
          {contrato.durDias&&durMode==="fechas"&&<div style={{fontSize:11,color:"#1E6B42",fontWeight:600,marginBottom:6}}>📅 Duración: <strong>{contrato.durDias} días</strong> ({contrato.durMeses} meses)</div>}
        </>}
        {/* Summary boxes */}
        <div style={{display:"grid",gridTemplateColumns:tipoCon==="fijo"?"1fr 1fr":"1fr",gap:8,marginTop:4}}>
          {tipoCon==="fijo"&&<div style={{background:"#E8F4EE",borderRadius:6,padding:"6px 10px",border:"1px solid #C8E6D0"}}>
            <div style={{fontSize:10,color:"#111111",fontWeight:600}}>📋 Período de prueba</div>
            <div style={{fontSize:14,fontWeight:800,color:"#111111",fontFamily:"'DM Mono',monospace"}}>{contrato.ppDias} días</div>
            <div style={{fontSize:8,color:"#666666"}}>{contrato.ppDias<60?`1/5 de ${contrato.label} · Arts. 76-80 CST`:"Máximo legal · Arts. 76-80 CST"}</div>
          </div>}
          <div style={{background:"#E8F4EE",borderRadius:6,padding:"6px 10px",border:"1px solid #C8E6D0"}}>
            <div style={{fontSize:10,color:"#1E6B42",fontWeight:600}}>🏖️ Vacaciones (Art. 186)</div>
            <div style={{fontSize:14,fontWeight:800,color:"#111111",fontFamily:"'DM Mono',monospace"}}>{tipoCon==="fijo"?`${contrato.vacDias} días háb.`:"15 días háb./año"}</div>
            <div style={{fontSize:8,color:"#666666"}}>{tipoCon==="fijo"?`15d × ${contrato.durDias||durMeses*30}/360 días`:"Se acumulan de forma continua"}</div>
          </div>
        </div>
      </Card>

      {/* ══════ JORNADA + HORAS ══════ */}
      <Card t="Jornada Laboral" icon="🕐">
        <div style={{display:"flex",gap:0,background:"#F5F4F1",borderRadius:8,border:"1px solid #E5E3DE",overflow:"hidden",marginBottom:8}}>
          <button type="button" onClick={()=>setTipoJornada("completa")} style={{flex:1,padding:"7px",border:"none",cursor:"pointer",fontSize:11,fontWeight:700,fontFamily:"inherit",background:tipoJornada==="completa"?"#111111":"transparent",color:tipoJornada==="completa"?"#fff":"#666666"}}>📅 Completa (30d/mes)</button>
          <button type="button" onClick={()=>setTipoJornada("parcial")} style={{flex:1,padding:"7px",border:"none",cursor:"pointer",fontSize:11,fontWeight:700,fontFamily:"inherit",background:tipoJornada==="parcial"?"#111111":"transparent",color:tipoJornada==="parcial"?"#fff":"#666666"}}>⏱️ Parcial ({Math.round(dSem*4.33)}d/mes)</button>
        </div>
        <div style={{fontSize:11,color:"#666666",marginBottom:6}}>Días que trabaja:</div>
        <div style={{display:"flex",gap:4,marginBottom:8}} className="no-print">
          {DL.map((d,i)=><button key={i} type="button" onClick={()=>{const n=[...workDays];n[i]=!n[i];setWorkDays(n)}} style={{flex:1,padding:"8px 2px",border:"none",borderRadius:8,cursor:"pointer",fontSize:11,fontWeight:700,background:workDays[i]?"#111111":"#F5F4F1",color:workDays[i]?"#fff":"#999999",fontFamily:"inherit",appearance:"none",outline:"none"}}>{d}</button>)}
        </div>
        <G3><In label="Inicio" type="number" value={hIni} onChange={e=>setHIni(Math.min(23,Math.max(0,+e.target.value||0)))} suffix="h"/><In label="Fin" type="number" value={hFin} onChange={e=>setHFin(Math.min(23,Math.max(1,+e.target.value||0)))} suffix="h"/><In label="Almuerzo" type="number" value={almuerzo} onChange={e=>setAlm(Math.max(0,+e.target.value||0))} suffix="h"/></G3>
        {/* ★ RESUMEN DE HORAS */}
        <div style={{display:"grid",gridTemplateColumns:tipoCon==="fijo"?"repeat(5,1fr)":"repeat(4,1fr)",gap:6,textAlign:"center",background:"#FAFAF8",borderRadius:8,padding:"10px 6px",border:"1px solid #E5E3DE"}}>
          {[{l:"Días/sem",v:`${dSem}`,c:"#111111"},
            {l:"Horas/día",v:`${hDia}h`,c:"#111111"},
            {l:"Horas/sem",v:`${hSem}h`,c:jOk?"#059669":"#dc2626"},
            {l:"Horas/mes",v:`~${Math.round(hDia*dmLab)}h`,c:"#5B3A8C"},
            ...(tipoCon==="fijo"?[{l:"Total contrato",v:`~${Math.round(hDia*dmLab*(contrato.durMeses||durMeses))}h`,c:"#0D5E6E"}]:[])
          ].map((x,i)=><div key={i}><div style={{fontSize:8,color:"#999999",fontWeight:600}}>{x.l}</div><div style={{fontSize:15,fontWeight:800,fontFamily:"'DM Mono',monospace",color:x.c}}>{x.v}</div></div>)}
        </div>
        <div style={{marginTop:4,fontSize:10,color:"#666666"}}>
          Días: <b>{DL.filter((_,i)=>workDays[i]).join(", ")}</b>
          {tipoJornada==="parcial"&&dmDom>0&&<> · <span style={{color:"#0D5E6E"}}>Dominical proporcional: <b>{dmDom}d/mes</b> (Art. 172 CST)</span></>}
          {" · "}Base salario: <b style={{color:"#5B3A8C"}}>{dmProm}d/mes</b>{tipoJornada==="parcial"&&dmDom>0&&<span style={{color:"#999999"}}> ({dmLab} lab + {dmDom} dom)</span>}
        </div>
        {jOk?<Al c="g">✅ Cumple {MAX_HRS}h/sem (Ley 2101/2021)</Al>:<Al c="r">⚠️ Supera {MAX_HRS}h/sem: {hSem}h</Al>}
      </Card>

      {/* ══════════════════════════════════════════
         TAB 0: CALCULADORA SALARIAL
         ══════════════════════════════════════════ */}
      {tab===0&&<>
        <Card t="Salario y Compensación" icon="💵" accent="#ecfdf5">
          <div style={{display:"flex",gap:0,background:"#F5F4F1",borderRadius:8,border:"1px solid #E5E3DE",overflow:"hidden",marginBottom:10}} className="no-print">
            {[{v:"neto",l:"💵 NETO"},{v:"bruto",l:"📄 BRUTO"},{v:"integral",l:"💼 INTEGRAL"}].map(o=><button key={o.v} type="button" onClick={()=>handleModoSal(o.v)} style={{flex:1,padding:"9px 6px",border:"none",borderRadius:0,cursor:"pointer",fontSize:11,fontWeight:700,fontFamily:"inherit",background:modoSal===o.v?"#111111":"transparent",color:modoSal===o.v?"#fff":"#666666",appearance:"none",outline:"none",borderRight:"1px solid #E5E3DE"}}>{o.l}</button>)}
          </div>
          <In label={modoSal==="neto"?"Neto deseado":modoSal==="integral"?"Salario integral":"Salario bruto"} prefix="$" value={valorSal.toLocaleString("es-CO")} onChange={e=>setValorSal(Number(e.target.value.replace(/\D/g,""))||0)} help={modoSal==="integral"?`Mínimo: ${$(smlmv*INTEGRAL_F)} (13 SMLMV)`:modoSal==="neto"?`${dmProm}d · Día: ${$(neg.netoDia)} · Hora: ${$(neg.netoHora)}`:`${dmProm} días`}/>
          {modoSal==="integral"&&valorSal<smlmv*INTEGRAL_F&&<Al c="r">⚠️ Mínimo integral: {$(smlmv*INTEGRAL_F)}</Al>}
          {modoSal!=="integral"&&<>
            <Tg label="Bono no salarial (Art. 128)" on={usarBono} set={setUsarBono}/>
            {usarBono&&<><G2><In label="Concepto" value={bonoConcepto} onChange={e=>setBonoConcepto(e.target.value)}/><Sel label="Tratamiento" value={bonoTrat} onChange={e=>setBonoTrat(e.target.value)} options={[{v:"asistencia",l:"📅 Por día asistido"},{v:"fijo",l:"💰 Fijo mensual"}]}/></G2>
            <Tg label={bonoPrest?"🔴 Bono ES prestacional":"🟢 Bono NO prestacional"} on={bonoPrest} set={setBonoPrest}/></>}
          </>}
        </Card>

        {/* ★ CONCEPTOS PERSONALIZABLES — predefinidos por ley */}
        {modoSal!=="integral"&&<Card t="Conceptos Adicionales" icon="📝" accent="#EDE8F4">
          <div style={{fontSize:10,color:"#666666",marginBottom:8}}>Selecciona conceptos con su tratamiento legal. Puedes ajustar salarial/prestacional si aplica.</div>
          {conceptos.map((c,idx)=><div key={c.id} style={{background:c.esSalarial?"#fef2f2":"#f0fdf4",border:`1px solid ${c.esSalarial?"#fecaca":"#bbf7d0"}`,borderRadius:8,padding:"8px 10px",marginBottom:6,position:"relative"}}>
            <button type="button" onClick={()=>delC(c.id)} style={{position:"absolute",top:4,right:8,background:"none",border:"none",color:"#dc2626",cursor:"pointer",fontSize:16,fontWeight:700,padding:0}}>×</button>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
              <span style={{fontSize:12,fontWeight:700,color:"#111111"}}>{c.custom?`#${idx+1}`:c.nombre}</span>
              <span style={{fontSize:8,background:"#E5E3DE",color:"#555555",padding:"1px 6px",borderRadius:4,fontWeight:600}}>{c.art}</span>
              {c.esSalarial?<span style={{fontSize:8,background:"#fee2e2",color:"#dc2626",padding:"1px 6px",borderRadius:4,fontWeight:600}}>Salarial</span>:<span style={{fontSize:8,background:"#dcfce7",color:"#16a34a",padding:"1px 6px",borderRadius:4,fontWeight:600}}>No salarial</span>}
              {c.esPrestacional&&<span style={{fontSize:8,background:"#EDE8F4",color:"#5B3A8C",padding:"1px 6px",borderRadius:4,fontWeight:600}}>Prestacional</span>}
            </div>
            {c.desc&&!c.custom&&<div style={{fontSize:9,color:"#999999",marginBottom:4}}>{c.desc}</div>}
            <G2>
              {c.custom&&<In label="Nombre" value={c.nombre} onChange={e=>updC(c.id,"nombre",e.target.value)}/>}
              <In label="Valor mensual" prefix="$" value={c.valor.toLocaleString("es-CO")} onChange={e=>updC(c.id,"valor",Number(e.target.value.replace(/\D/g,""))||0)}/>
              {!c.custom&&<div/>}
            </G2>
            {c.custom&&<div style={{display:"flex",gap:4}}>
              <button type="button" onClick={()=>updC(c.id,"esSalarial",!c.esSalarial)} style={{flex:1,padding:"5px",border:"none",borderRadius:6,fontSize:9,fontWeight:700,cursor:"pointer",fontFamily:"inherit",background:c.esSalarial?"#dc2626":"#059669",color:"#fff"}}>{c.esSalarial?"🔴 Salarial":"🟢 No salarial"}</button>
              <button type="button" onClick={()=>updC(c.id,"esPrestacional",!c.esPrestacional)} style={{flex:1,padding:"5px",border:"none",borderRadius:6,fontSize:9,fontWeight:700,cursor:"pointer",fontFamily:"inherit",background:c.esPrestacional?"#5B3A8C":"#666666",color:"#fff"}}>{c.esPrestacional?"🟣 Prestacional":"⚪ No prest."}</button>
            </div>}
          </div>)}
          <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
            {CONCEPTOS_LEY.map(cl=><button key={cl.id} type="button" onClick={()=>addC(cl.id)} style={{padding:"6px 10px",border:"1px solid #E5E3DE",borderRadius:8,background:"#fff",cursor:"pointer",fontSize:10,fontWeight:600,color:"#555555",fontFamily:"inherit"}}>+ {cl.nombre}</button>)}
          </div>
          {conceptos.length>0&&<div style={{marginTop:6,fontSize:10,color:"#666666"}}>Sal: <b style={{color:"#dc2626"}}>{$(cSums.sal)}</b> · NoSal: <b style={{color:"#059669"}}>{$(cSums.noSal)}</b> · Prest. extra: <b style={{color:"#5B3A8C"}}>{$(cSums.prest)}</b></div>}
        </Card>}

        {/* ★ RETENCIÓN EN LA FUENTE */}
        {/* Retención: solo aparece cuando el ingreso puede generar retención (>95 UVT) */}
        {neg.devTotal>uvt*95*0.75&&<Card t="Retención en la Fuente" icon="🏛️" accent={calcRet?"#fef2f2":"#FAFAF8"}>
          <Tg label={calcRet?"✅ Calcular retención (Proc. 1 — Art. 383 E.T.)":"Calcular retención en la fuente"} on={calcRet} set={setCalcRet} help="Procedimiento 1: tabla Art. 383 sobre ingreso mensual"/>
          {calcRet&&<>
            <G3><In label="UVT 2026" prefix="$" value={uvt.toLocaleString("es-CO")} onChange={e=>setUvt(Number(e.target.value.replace(/\D/g,""))||0)} help="Resolución DIAN"/>
            <div/><Tg label="Dependientes (10%, máx 32 UVT)" on={tieneDep} set={setTieneDep}/></G3>
            <G3><In label="Interés vivienda/mes" prefix="$" value={intVivienda.toLocaleString("es-CO")} onChange={e=>setIntVivienda(Number(e.target.value.replace(/\D/g,""))||0)} help={`Máx: ${$(100*uvt)}`}/>
            <In label="Medicina prepagada/mes" prefix="$" value={medPrep.toLocaleString("es-CO")} onChange={e=>setMedPrep(Number(e.target.value.replace(/\D/g,""))||0)} help={`Máx: ${$(16*uvt)}`}/>
            <In label="AFC/Vol. pensión/mes" prefix="$" value={afc.toLocaleString("es-CO")} onChange={e=>setAfc(Number(e.target.value.replace(/\D/g,""))||0)} help="Máx 30% subtotal"/></G3>
            {ret&&<>
              <Dv/>
              <Rw l="Ingreso laboral (mensualizado)" v={ret.sub1+ret.incr}/>
              <Rw l="(-) INCR (pensión+salud+FSP)" v={ret.incr}/>
              <Rw l="Subtotal 1" v={ret.sub1}/>
              {ret.depV>0&&<Rw l="(-) Dependientes" v={ret.depV}/>}
              {ret.vivV>0&&<Rw l="(-) Interés vivienda" v={ret.vivV}/>}
              {ret.medV>0&&<Rw l="(-) Medicina prepagada" v={ret.medV}/>}
              {ret.afcV>0&&<Rw l="(-) AFC/Vol. pensión" v={ret.afcV}/>}
              <Rw l="(-) Renta exenta 25%" v={ret.exento25}/>
              <Rw l={`Tope 40%: ${$(ret.lim40)}`} v={ret.beneficiosCapped} note={ret.totalBeneficios>ret.lim40?"⚠️ Limitado al 40%":"Dentro del límite"}/>
              <Rw l={`Base gravable (${ret.baseUVT} UVT)`} v={ret.baseGrav} bold/>
              <Dv/>
              <Rw l="RETENCIÓN MENSUAL" v={ret.retencion} bold hl="red" note={`${ret.impUVT} UVT × ${$(uvt)}`}/>
            </>}
          </>}
        </Card>}

        {/* ① BRUTO */}
        <Card t="① SALARIO BRUTO" icon="📄" badge={{t:$(neg.devTotal),bg:"#E8F4EE",c:"#1E6B42"}}>
          <Rw l="Salario" v={neg.salario} bold note={`${neg.dias}d × ${$(neg.salDia)}/día · Mens: ${$(neg.salMes30)}`}/>
          {neg.bono>0&&<Rw l={`${bonoConcepto} (Art.128)`} v={neg.bono} hl="purple"/>}
          {conceptos.filter(c=>c.valor>0).map(c=><Rw key={c.id} l={`${c.nombre||"Concepto"} ${c.esSalarial?"🔴":"🟢"}${c.esPrestacional?" 🟣":""}`} v={(c.valor/30)*neg.dias} hl={c.esSalarial?"red":"purple"} note={`${c.esSalarial?"Salarial":"No sal."} · ${c.esPrestacional?"Prestacional":"No prest."} · ${$(c.valor)}/mes`}/>)}
          <Rw l="Aux. transporte" v={neg.auxDev} note={neg.auxOk?`${neg.dias}d`:"No aplica > 2 SMLMV"}/>
          <Dv/><Rw l="TOTAL BRUTO" v={neg.devTotal} bold hl="blue"/>
          <Rw l="IBC" v={neg.ibc} bold hl="cyan" note={neg.esSub?`Tipo 51 PILA: ${neg.tramo} · Mín tramo: ${$(neg.ibcMin)}`:`Contributivo: IBC mín = SMLMV completo (${$(neg.ibcMin)})`}/>
          {/* ★ Validación 40% — Ley 1393/2010 Art. 30 */}
          {(()=>{
            const noSalTotal=(bonoPrest?0:neg.bono)+neg.cNoSal;
            const remTotal=neg.salario+neg.bono+neg.cSal+neg.cNoSal;
            if(remTotal<=0||noSalTotal<=0)return null;
            const pct=noSalTotal/remTotal*100;
            const limite=remTotal*0.4;
            const exceso=Math.max(0,noSalTotal-limite);
            const ok=pct<=40;
            return <div style={{marginTop:6,background:ok?"#f0fdf4":"#fef2f2",border:`1px solid ${ok?"#bbf7d0":"#fecaca"}`,borderRadius:8,padding:"8px 12px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                <span style={{fontSize:11,fontWeight:700,color:ok?"#059669":"#dc2626"}}>{ok?"✅":"⚠️"} Límite 40% no salarial (Ley 1393/2010)</span>
                <span style={{fontSize:12,fontWeight:800,fontFamily:"'DM Mono',monospace",color:ok?"#059669":"#dc2626"}}>{pct.toFixed(1)}%</span>
              </div>
              <div style={{height:6,background:"#E5E3DE",borderRadius:3,overflow:"hidden",marginBottom:4}}>
                <div style={{height:"100%",width:Math.min(100,pct/0.4)+"%",background:pct>40?"#dc2626":pct>35?"#f59e0b":"#059669",borderRadius:3,transition:"width .3s"}}/>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#666666"}}>
                <span>No salarial: <b>{$(noSalTotal)}</b></span>
                <span>Límite 40%: <b>{$(limite)}</b></span>
                <span>Salarial: <b>{$(remTotal-noSalTotal)}</b></span>
              </div>
              {!ok&&<div style={{marginTop:4,fontSize:10,color:"#dc2626",fontWeight:600}}>⚠️ El exceso de {$(exceso)} se debe incluir en el IBC como salario. Ajusta los montos para cumplir la ley.</div>}
              {ok&&pct>35&&<div style={{marginTop:4,fontSize:10,color:"#d97706",fontWeight:600}}>⚡ Estás cerca del límite (35%+). Verifica antes de agregar más conceptos no salariales.</div>}
            </div>
          })()}
        </Card>

        {/* ② DEDUCCIONES */}
        <Card t="② DEDUCCIONES" icon="📉" badge={{t:$(neg.totDed+(ret?ret.retencion:0)),bg:"#fee2e2",c:"#dc2626"}}>
          <Rw l={neg.esSub?"EPS — SISBEN $0":"EPS trabajador"} v={neg.sE} tasa={neg.esSub?0:4}/>
          <Rw l="Pensión trabajador" v={neg.pE} tasa={4}/>
          {neg.fspV>0&&<Rw l="FSP" v={neg.fspV} tasa={neg.fspT}/>}
          {ret&&ret.retencion>0&&<Rw l="Retención en la fuente" v={ret.retencion} hl="red" note={`Base: ${ret.baseUVT} UVT — Proc. 1`}/>}
          <Dv/><Rw l="TOTAL DEDUCCIONES" v={neg.totDed+(ret?ret.retencion:0)} bold hl="red"/>
        </Card>

        {/* ③ NETO */}
        <BigBox bg="linear-gradient(135deg,#059669,#047857)">
          <div style={{fontSize:10,opacity:.8,fontWeight:600}}>③ NETO DEL TRABAJADOR</div>
          <div style={{fontSize:28,fontWeight:800,fontFamily:"'DM Mono',monospace"}}>{$(neg.neto-(ret?ret.retencion:0))}</div>
          <G3><div><div style={{fontSize:9,opacity:.7}}>Neto/día</div><div style={{fontSize:16,fontWeight:800,fontFamily:"'DM Mono',monospace"}}>{$((neg.neto-(ret?ret.retencion:0))/neg.dias)}</div></div>
          <div><div style={{fontSize:9,opacity:.7}}>Neto/hora</div><div style={{fontSize:16,fontWeight:800,fontFamily:"'DM Mono',monospace"}}>{$(hDia>0?(neg.neto-(ret?ret.retencion:0))/neg.dias/hDia:0)}</div></div>
          <div><div style={{fontSize:9,opacity:.7}}>Días</div><div style={{fontSize:16,fontWeight:800,fontFamily:"'DM Mono',monospace"}}>{neg.dias}</div></div></G3>
        </BigBox>

        {/* Quincenal */}
        {freqPago==="quincenal"&&<Card t="Distribución Quincenal" icon="📆" accent="#E8F4EE">{(()=>{
          const salQ1=Math.round(neg.salario*(pctQ1/100));
          const salQ2=neg.salario-salQ1;
          const bonoQ2=neg.bono;
          const auxQ2=neg.auxDev;
          const dedQ2=neg.totDed+(ret?ret.retencion:0);
          const q1=salQ1;
          const q2=salQ2+bonoQ2+auxQ2-dedQ2;
          const total=q1+q2;
          const pctReal1=total>0?Math.round(q1/total*100):0;
          const pctReal2=total>0?100-pctReal1:0;
          return <>
            <div style={{fontSize:10,color:"#666666",marginBottom:6}}>Anticipo: <strong>{pctQ1}% del salario base</strong> en Q1 · Bono, aux y SS se liquidan en Q2</div>
            {/* Visual bar */}
            <div style={{display:"flex",height:8,borderRadius:4,overflow:"hidden",marginBottom:10}}>
              <div style={{width:pctReal1+"%",background:"#111111"}}/>
              <div style={{width:pctReal2+"%",background:"#059669"}}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div style={{background:"#E8F4EE",borderRadius:8,padding:10,border:"1px solid #C8E6D0"}}>
                <div style={{fontSize:10,fontWeight:700,color:"#1E6B42"}}>Q1 — Día 15</div>
                <div style={{fontSize:22,fontWeight:800,fontFamily:"'DM Mono',monospace"}}>{$(q1)}</div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:10,marginTop:2}}>
                  <span style={{color:"#999999"}}>Anticipo fijo ({pctQ1}% sal.)</span>
                  <span style={{fontWeight:700,color:"#1E6B42"}}>{pctReal1}% del neto</span>
                </div>
              </div>
              <div style={{background:"#ecfdf5",borderRadius:8,padding:10,border:"1px solid #a7f3d0"}}>
                <div style={{fontSize:10,fontWeight:700,color:"#1E6B42"}}>Q2 — Último día</div>
                <div style={{fontSize:22,fontWeight:800,fontFamily:"'DM Mono',monospace"}}>{$(q2)}</div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:10,marginTop:2}}>
                  <span style={{color:"#999999"}}>Liquidada con novedades</span>
                  <span style={{fontWeight:700,color:"#1E6B42"}}>{pctReal2}% del neto</span>
                </div>
              </div>
            </div>
            <div style={{marginTop:8,fontSize:10,color:"#666666",borderTop:"1px solid #E5E3DE",paddingTop:6}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:4,textAlign:"center"}}>
                <div>Salario Q2<br/><b>{$(salQ2)}</b></div>
                <div>Bono<br/><b style={{color:"#5B3A8C"}}>{$(bonoQ2)}</b></div>
                <div>Aux. transp.<br/><b>{$(auxQ2)}</b></div>
                <div>SS + Ded.<br/><b style={{color:"#dc2626"}}>-{$(dedQ2)}</b></div>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontWeight:700,marginTop:6,paddingTop:4,borderTop:"1px solid #E5E3DE"}}><span>Total mes (Q1+Q2):</span><span style={{fontFamily:"'DM Mono',monospace",color:"#059669",fontSize:14}}>{$(total)}</span></div>
            </div>
          </>
        })()}</Card>}

        {/* ★ DESGLOSE POR DÍA */}
        <Card t={`Desglose por Día (${neg.dias} días/mes)`} icon="📋" accent="#f0fdf4">
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            <div>
              <div style={{fontSize:10,fontWeight:700,color:"#059669",marginBottom:4}}>BRUTO / DÍA</div>
              <Rw l="Salario" v={neg.salDia}/>
              {neg.bonoDia>0&&<Rw l={bonoConcepto} v={neg.bonoDia}/>}
              {conceptos.filter(c=>c.valor>0).map(c=><Rw key={c.id} l={c.nombre||"Concepto"} v={c.valor/30}/>)}
              {neg.auxOk&&<Rw l="Aux. transporte" v={auxTr/30}/>}
              <Dv/>
              <Rw l="TOTAL BRUTO/DÍA" v={neg.dias>0?neg.devTotal/neg.dias:0} bold hl="blue"/>
            </div>
            <div>
              <div style={{fontSize:10,fontWeight:700,color:"#dc2626",marginBottom:4}}>DEDUCCIONES / DÍA</div>
              {!neg.esSub&&<Rw l="EPS (4%)" v={neg.dias>0?neg.sE/neg.dias:0}/>}
              <Rw l="Pensión (4%)" v={neg.dias>0?neg.pE/neg.dias:0}/>
              {neg.fspV>0&&<Rw l="FSP" v={neg.dias>0?neg.fspV/neg.dias:0}/>}
              {ret&&ret.retencion>0&&<Rw l="Retención" v={neg.dias>0?ret.retencion/neg.dias:0}/>}
              <Dv/>
              <Rw l="TOTAL DED./DÍA" v={neg.dias>0?(neg.totDed+(ret?ret.retencion:0))/neg.dias:0} bold hl="red"/>
              <div style={{marginTop:8,borderTop:"2px solid #059669",paddingTop:6}}>
                <Rw l="NETO / DÍA" v={neg.dias>0?(neg.neto-(ret?ret.retencion:0))/neg.dias:0} bold hl="green"/>
                <Rw l="NETO / HORA" v={neg.dias>0&&hDia>0?(neg.neto-(ret?ret.retencion:0))/neg.dias/hDia:0} bold hl="green"/>
              </div>
            </div>
          </div>
        </Card>

        {/* ④ COSTOS EMPLEADOR */}
        <Card t="④ COSTOS EMPLEADOR" icon="🏥" badge={{t:$(neg.totAp),bg:"#E8F4EE",c:"#1E6B42"}}>
          <Rw l={neg.esSub?"EPS empl. SISBEN $0":neg.exS?"EPS empl. ✅ EXONERADO":"EPS empleador"} v={neg.sEr} tasa={(neg.esSub||neg.exS)?0:8.5}/>
          <Rw l="Pensión empleador" v={neg.pEr} tasa={12}/><Rw l={`ARL ${ARL[Math.max(0,arlIdx)].n}`} v={neg.arlV} tasa={ARL[Math.max(0,arlIdx)].t}/>
          <Rw l="Caja" v={neg.caja} tasa={4}/><Rw l={neg.exPF?"ICBF ✅":"ICBF"} v={neg.icbf} tasa={neg.exPF?0:3}/><Rw l={neg.exPF?"SENA ✅":"SENA"} v={neg.sena} tasa={neg.exPF?0:2}/>
          <Dv/><Rw l="TOTAL APORTES" v={neg.totAp} bold hl="blue"/>
        </Card>

        {/* ⑤ PRESTACIONES */}
        <Card t="⑤ PRESTACIONES" icon="🎁" badge={{t:$(neg.totPr),bg:"#EDE8F4",c:"#5B3A8C"}}>
          <Rw l="Prima" v={neg.pri} tasa={8.33}/><Rw l="Cesantías" v={neg.ces} tasa={8.33}/><Rw l="Int. cesantías" v={neg.intC} tasa={1}/><Rw l="Vacaciones" v={neg.vac} tasa={4.17}/><Dv/><Rw l="TOTAL" v={neg.totPr} bold hl="purple"/>
        </Card>


        {/* ⑥ COSTO TOTAL */}
        <BigBox bg="linear-gradient(135deg,#111111,#111111)"><div style={{fontSize:10,opacity:.8}}>⑥ COSTO TOTAL EMPRESA</div><G2><div><div style={{fontSize:9,opacity:.6}}>Devengado</div><div style={{fontSize:14,fontWeight:700,fontFamily:"'DM Mono',monospace"}}>{$(neg.devTotal)}</div></div><div><div style={{fontSize:9,opacity:.6}}>Costo indirecto</div><div style={{fontSize:14,fontWeight:700,fontFamily:"'DM Mono',monospace",color:"#fbbf24"}}>{$(neg.costoInd)}</div></div></G2><div style={{borderTop:"2px solid rgba(255,255,255,.2)",marginTop:8,paddingTop:8,display:"flex",justifyContent:"space-between"}}><span style={{fontSize:12,fontWeight:700}}>COSTO / MES</span><span style={{fontSize:24,fontWeight:800,fontFamily:"'DM Mono',monospace"}}>{$(neg.costoT)}</span></div><div style={{display:"flex",justifyContent:"space-between",marginTop:4}}><span style={{fontSize:11,opacity:.7}}>COSTO / CONTRATO ({tipoCon==="fijo"?(contrato.label||durCon+"m"):"anual"})</span><span style={{fontSize:18,fontWeight:800,fontFamily:"'DM Mono',monospace"}}>{$(neg.costoT*(tipoCon==="fijo"?(contrato.durMeses||durCon):12))}</span></div></BigBox>

        <Card t="Distribución" icon="📊"><Bar l="Neto" v={neg.neto-(ret?ret.retencion:0)} total={neg.costoT} color="#059669"/>{ret&&ret.retencion>0&&<Bar l="Retención" v={ret.retencion} total={neg.costoT} color="#92400e"/>}<Bar l="SS trabajador" v={neg.totDed} total={neg.costoT} color="#dc2626"/>{neg.auxDev>0&&<Bar l="Aux. transp." v={neg.auxDev} total={neg.costoT} color="#d97706"/>}<Bar l="SS empleador" v={neg.sEr+neg.pEr+neg.arlV} total={neg.costoT} color="#1E6B42"/><Bar l="Parafiscales" v={neg.caja+neg.icbf+neg.sena} total={neg.costoT} color="#5B3A8C"/><Bar l="Prestaciones" v={neg.totPr} total={neg.costoT} color="#B91C1C"/></Card>

        {/* ★ GASTOS vs COSTOS (PROVISIONES) */}
        <Card t="Gastos vs Costos — Flujo de Caja" icon="🏦" accent="#f0fdf4">
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:10}}>
            {/* GASTO MENSUAL — sale de caja cada mes */}
            <div style={{background:"#fef2f2",borderRadius:8,padding:"10px 12px",border:"1px solid #fecaca"}}>
              <div style={{fontSize:11,fontWeight:700,color:"#dc2626",marginBottom:6}}>💸 GASTO MENSUAL (tesorería)</div>
              <div style={{fontSize:9,color:"#999999",marginBottom:6}}>Sale de caja cada mes vía nómina y PILA</div>
              <Rw l="Nómina (sal+bono+aux)" v={neg.devTotal}/>
              {neg.pEr>0&&<Rw l="Pensión empleador 12%" v={neg.pEr}/>}
              {neg.arlV>0&&<Rw l={`ARL ${ARL[Math.max(0,arlIdx)].n}`} v={neg.arlV}/>}
              {neg.caja>0&&<Rw l="Caja 4%" v={neg.caja}/>}
              {neg.sEr>0&&<Rw l="EPS empleador" v={neg.sEr}/>}
              {neg.icbf>0&&<Rw l="ICBF" v={neg.icbf}/>}
              {neg.sena>0&&<Rw l="SENA" v={neg.sena}/>}
              <Dv/>
              <Rw l="TOTAL GASTO/MES" v={neg.devTotal+neg.totAp} bold hl="red"/>
            </div>

            {/* COSTO/PROVISIÓN — se acumula, se paga después */}
            <div style={{background:"#E8F4EE",borderRadius:8,padding:"10px 12px",border:"1px solid #C8E6D0"}}>
              <div style={{fontSize:11,fontWeight:700,color:"#1E6B42",marginBottom:6}}>📋 PROVISIÓN MENSUAL (costo)</div>
              <div style={{fontSize:9,color:"#999999",marginBottom:6}}>Se acumula cada mes, se paga en fechas específicas</div>
              <Rw l="Prima" v={neg.pri} note="Pago: 30 Jun y 20 Dic"/>
              <Rw l="Cesantías" v={neg.ces} note="Pago: 14 Feb año siguiente"/>
              <Rw l="Int. cesantías" v={neg.intC} note="Pago: 31 Ene año siguiente"/>
              <Rw l="Vacaciones" v={neg.vac} note="Pago: cuando se toman o en liquidación"/>
              <Dv/>
              <Rw l="TOTAL PROVISIÓN/MES" v={neg.totPr} bold hl="blue"/>
            </div>
          </div>

          {/* Resumen mensual */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,textAlign:"center",marginBottom:10}}>
            <div style={{background:"#fef2f2",borderRadius:8,padding:"8px 6px",border:"1px solid #fecaca"}}><div style={{fontSize:9,color:"#dc2626",fontWeight:600}}>Gasto real/mes</div><div style={{fontSize:18,fontWeight:800,fontFamily:"'DM Mono',monospace",color:"#dc2626"}}>{$(neg.devTotal+neg.totAp)}</div></div>
            <div style={{background:"#E8F4EE",borderRadius:8,padding:"8px 6px",border:"1px solid #C8E6D0"}}><div style={{fontSize:9,color:"#1E6B42",fontWeight:600}}>Provisión/mes</div><div style={{fontSize:18,fontWeight:800,fontFamily:"'DM Mono',monospace",color:"#1E6B42"}}>{$(neg.totPr)}</div></div>
            <div style={{background:"#FAFAF8",borderRadius:8,padding:"8px 6px",border:"1px solid #E5E3DE"}}><div style={{fontSize:9,color:"#555555",fontWeight:600}}>Costo total/mes</div><div style={{fontSize:18,fontWeight:800,fontFamily:"'DM Mono',monospace",color:"#111111"}}>{$(neg.costoT)}</div></div>
          </div>

          {/* COSTO TOTAL CONTRATO + LIQUIDACIONES */}
          {tipoCon==="fijo"&&durCon>0&&(()=>{
            const meses=contrato.durMeses||durCon;
            const dias=contrato.durDias||Math.round(meses*30);
            const gastoMes=neg.devTotal+neg.totAp;
            const provMes=neg.totPr;
            const gastoTotal=gastoMes*meses;
            const provTotal=provMes*meses;
            const salMes=neg.salMes30;
            const baseLiq=salMes+((salMes<=2*smlmv)?auxTr:0);
            const salDia=salMes/30;

            // Liquidación = SIEMPRE se paga al terminar
            const primaProp=baseLiq*(dias%180)/360;
            const cesProp=baseLiq*dias/360;
            const intCes=cesProp*dias*0.12/360;
            const vacProp=salMes*dias/720;
            const liqNormal=primaProp+cesProp+intCes+vacProp;

            // Indemnización = ADICIONAL solo por despido sin justa causa
            const indemMax=salDia*dias;

            return <>
              <Dv/>
              <div style={{fontSize:12,fontWeight:700,color:"#111111",marginBottom:8}}>📊 Costo Total del Contrato — {contrato.label||meses+" meses"}</div>

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                <div style={{background:"#fef2f2",borderRadius:8,padding:"8px 10px",border:"1px solid #fecaca"}}><div style={{fontSize:9,color:"#dc2626",fontWeight:600}}>Gasto total contrato (tesorería)</div><div style={{fontSize:18,fontWeight:800,fontFamily:"'DM Mono',monospace",color:"#dc2626"}}>{$(gastoTotal)}</div><div style={{fontSize:9,color:"#999999"}}>{$(gastoMes)} × {meses} meses</div></div>
                <div style={{background:"#E8F4EE",borderRadius:8,padding:"8px 10px",border:"1px solid #C8E6D0"}}><div style={{fontSize:9,color:"#1E6B42",fontWeight:600}}>Provisiones acumuladas</div><div style={{fontSize:18,fontWeight:800,fontFamily:"'DM Mono',monospace",color:"#1E6B42"}}>{$(provTotal)}</div><div style={{fontSize:9,color:"#999999"}}>{$(provMes)} × {meses} meses</div></div>
              </div>

              {/* LIQUIDACIÓN — siempre se paga */}
              <div style={{border:"1px solid #a7f3d0",borderRadius:8,padding:"10px 12px",background:"#f0fdf4",marginBottom:8}}>
                <div style={{fontSize:11,fontWeight:700,color:"#059669",marginBottom:2}}>📋 Liquidación (se paga SIEMPRE al terminar)</div>
                <div style={{fontSize:9,color:"#999999",marginBottom:6}}>Independiente del motivo de terminación — renuncia, fin de contrato o despido</div>
                <Rw l="Prima proporcional" v={primaProp} note={`${$(baseLiq)} × ${dias%180}d / 360`}/>
                <Rw l="Cesantías" v={cesProp} note={`${$(baseLiq)} × ${dias}d / 360`}/>
                <Rw l="Int. cesantías" v={intCes} note={`${$(cesProp)} × ${dias}d × 12% / 360`}/>
                <Rw l="Vacaciones" v={vacProp} note={`${$(salMes)} × ${dias}d / 720`}/>
                <Dv/>
                <Rw l="TOTAL LIQUIDACIÓN" v={liqNormal} bold hl="green"/>
              </div>

              {/* INDEMNIZACIÓN — solo despido sin justa causa */}
              <div style={{border:"1px solid #fecaca",borderRadius:8,padding:"10px 12px",background:"#fef2f2",marginBottom:8}}>
                <div style={{fontSize:11,fontWeight:700,color:"#dc2626",marginBottom:2}}>⚠️ Indemnización — SOLO si hay despido sin justa causa (Art. 64 CST)</div>
                <div style={{fontSize:9,color:"#999999",marginBottom:6}}>Es una penalidad ADICIONAL a la liquidación. No aplica si el contrato termina normalmente.</div>
                <Rw l="Fórmula" v={`${$(salDia)}/día × días restantes`}/>
                <Rw l="Indemnización máxima (despido día 1)" v={indemMax} bold hl="red" note={`${$(salDia)} × ${dias} días = ${$(indemMax)}`}/>
                {/* Tramos */}
                <div style={{marginTop:8,borderTop:"1px solid #fecaca",paddingTop:6}}>
                  <div style={{fontSize:10,fontWeight:700,color:"#dc2626",marginBottom:4}}>Evolución de la indemnización por mes:</div>
                  {(()=>{
                    const rows=[];
                    const totalM=Math.ceil(meses);
                    for(let m=0;m<=totalM;m++){
                      const dt=Math.min(dias,Math.round(m*30));
                      const dr=Math.max(0,dias-dt);
                      const ind=salDia*dr;
                      const pct=dias>0?dr/dias*100:0;
                      rows.push({m,dt,dr,ind,pct});
                    }
                    return <div style={{display:"grid",gridTemplateColumns:"auto 1fr auto auto",gap:"0",fontSize:10}}>
                      <div style={{padding:"3px 8px",fontWeight:700,color:"#666666",borderBottom:"2px solid #E5E3DE"}}>Mes</div>
                      <div style={{padding:"3px 8px",fontWeight:700,color:"#666666",borderBottom:"2px solid #E5E3DE"}}></div>
                      <div style={{padding:"3px 8px",fontWeight:700,color:"#666666",borderBottom:"2px solid #E5E3DE",textAlign:"right"}}>Días rest.</div>
                      <div style={{padding:"3px 8px",fontWeight:700,color:"#666666",borderBottom:"2px solid #E5E3DE",textAlign:"right"}}>Indemnización</div>
                      {rows.map((r,i)=><div key={i} style={{display:"contents"}}>
                        <div style={{padding:"3px 8px",fontWeight:700,color:r.dr===0?"#059669":"#555555",background:i%2?"#fef2f2":"transparent"}}>Mes {r.m}</div>
                        <div style={{padding:"3px 8px",background:i%2?"#fef2f2":"transparent"}}><div style={{height:6,background:"#fee2e2",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:r.pct+"%",background:r.pct>50?"#dc2626":"#f59e0b",borderRadius:3}}/></div></div>
                        <div style={{padding:"3px 8px",textAlign:"right",color:"#666666",fontFamily:"'DM Mono',monospace",background:i%2?"#fef2f2":"transparent"}}>{r.dr}d</div>
                        <div style={{padding:"3px 8px",textAlign:"right",fontWeight:700,fontFamily:"'DM Mono',monospace",color:r.dr===0?"#059669":"#dc2626",background:i%2?"#fef2f2":"transparent"}}>{$(r.ind)}</div>
                      </div>)}
                    </div>
                  })()}
                </div>
              </div>

              {/* Resumen de costos totales */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                <div style={{background:"#f0fdf4",borderRadius:8,padding:10,border:"2px solid #059669",textAlign:"center"}}>
                  <div style={{fontSize:9,color:"#059669",fontWeight:600}}>Costo contrato (terminación normal)</div>
                  <div style={{fontSize:18,fontWeight:800,fontFamily:"'DM Mono',monospace",color:"#059669"}}>{$(gastoTotal+liqNormal)}</div>
                  <div style={{fontSize:9,color:"#999999"}}>Gasto {$(gastoTotal)} + Liq. {$(liqNormal)}</div>
                </div>
                <div style={{background:"#fef2f2",borderRadius:8,padding:10,border:"2px solid #dc2626",textAlign:"center"}}>
                  <div style={{fontSize:9,color:"#dc2626",fontWeight:600}}>Costo contrato (despido día 1 — peor caso)</div>
                  <div style={{fontSize:18,fontWeight:800,fontFamily:"'DM Mono',monospace",color:"#dc2626"}}>{$(gastoTotal+liqNormal+indemMax)}</div>
                  <div style={{fontSize:9,color:"#999999"}}>Gasto + Liq. + Indem. {$(indemMax)}</div>
                </div>
              </div>

              {/* Calendario de pagos de provisiones */}
              <div style={{marginTop:10,fontSize:11,fontWeight:700,color:"#111111",marginBottom:6}}>📅 Calendario de pagos previstos:</div>
              <div style={{fontSize:10,color:"#555555",lineHeight:1.6}}>
                {(()=>{try{
                  const items=[];
                  const fmt=d=>{if(!d||isNaN(d.getTime()))return"—";return d.toLocaleDateString("es-CO",{day:"numeric",month:"short",year:"numeric"})};
                  const CalRow=({fecha,concepto,valor,tipo})=><div style={{display:"flex",justifyContent:"space-between",padding:"4px 6px",borderBottom:"1px solid #F5F4F1",background:tipo==="liq"?"#fef2f2":tipo==="prov"?"#E8F4EE":"transparent",borderRadius:3,marginBottom:1}}>
                    <span><span style={{fontSize:8,marginRight:4}}>{tipo==="liq"?"🔴":"📌"}</span><strong>{fecha}</strong> — {concepto}</span>
                    <span style={{fontFamily:"'DM Mono',monospace",fontWeight:700,color:tipo==="liq"?"#dc2626":"#111111"}}>{$(valor)}</span>
                  </div>;

                  if(durMode==="fechas"&&contrato.fechaIni&&contrato.fechaFin){
                    // Con fechas reales — calcular pagos exactos
                    const ini=contrato.fechaIni,fin=contrato.fechaFin;
                    const iniY=ini.getFullYear(),finY=fin.getFullYear();

                    // Iterar años del contrato para primas Jun/Dic
                    for(let y=iniY;y<=finY;y++){
                      const jun30=new Date(y,5,30);
                      const dic20=new Date(y,11,20);
                      // Prima Jun — semestre Ene-Jun
                      if(jun30>=ini&&jun30<=fin){
                        const semIni=new Date(y,0,1)<ini?ini:new Date(y,0,1);
                        const d=diffDays(semIni,jun30);
                        items.push({f:jun30,fecha:fmt(jun30),concepto:"Prima 1er semestre",valor:baseLiq*d/360,tipo:"prov"});
                      }
                      // Prima Dic — semestre Jul-Dic
                      if(dic20>=ini&&dic20<=fin){
                        const semIni=new Date(y,6,1)<ini?ini:new Date(y,6,1);
                        const d=diffDays(semIni,dic20);
                        items.push({f:dic20,fecha:fmt(dic20),concepto:"Prima 2do semestre",valor:baseLiq*d/360,tipo:"prov"});
                      }
                    }

                    // Fin contrato — liquidación
                    const lastJun=new Date(finY,5,30),lastDic=new Date(finY,11,20);
                    const lastPrimaDate=fin>lastDic?lastDic:fin>lastJun?lastJun:null;
                    const semIniLiq=lastPrimaDate?new Date(lastPrimaDate.getTime()+86400000):new Date(Math.max(ini.getTime(),new Date(finY,fin.getMonth()<6?0:6,1).getTime()));
                    const primaLiqD=diffDays(semIniLiq,fin);
                    if(primaLiqD>0)items.push({f:fin,fecha:fmt(fin),concepto:"Prima proporcional restante",valor:baseLiq*primaLiqD/360,tipo:"liq"});

                    items.push({f:fin,fecha:fmt(fin),concepto:"Vacaciones pendientes",valor:vacProp,tipo:"liq"});

                    // Cesantías y intereses — se pagan año siguiente
                    const cesFecha=new Date(finY+1,1,14);
                    const intFecha=new Date(finY+1,0,31);
                    items.push({f:intFecha,fecha:fmt(intFecha),concepto:"Int. cesantías → empleado",valor:intCes,tipo:"prov"});
                    items.push({f:cesFecha,fecha:fmt(cesFecha),concepto:"Cesantías → fondo",valor:cesProp,tipo:"prov"});
                  }else{
                    // Sin fechas — usar meses relativos
                    if(meses>=6)items.push({fecha:`Mes 6`,concepto:"Prima 1er semestre",valor:baseLiq*180/360,tipo:"prov"});
                    if(meses>=12)items.push({fecha:`Mes 12`,concepto:"Prima 2do semestre",valor:baseLiq*180/360,tipo:"prov"});
                    if(meses>12){for(let y=2;y<=Math.ceil(meses/12);y++){items.push({fecha:`Mes ${y*6}`,concepto:`Prima semestre ${y*2-1}`,valor:baseLiq*Math.min(180,dias-(y-1)*360)*1/360,tipo:"prov"})}}
                    items.push({fecha:`Mes ${meses} (fin)`,concepto:"Prima proporcional restante",valor:primaProp,tipo:"liq"});
                    items.push({fecha:`Mes ${meses} (fin)`,concepto:"Vacaciones pendientes",valor:vacProp,tipo:"liq"});
                    items.push({fecha:`Mes ${Math.round(meses)+1}`,concepto:"Int. cesantías → empleado (Ene)",valor:intCes,tipo:"prov"});
                    items.push({fecha:`Mes ${Math.round(meses)+2}`,concepto:"Cesantías → fondo (Feb)",valor:cesProp,tipo:"prov"});
                  }

                  // Sort by date if available, then render
                  if(items[0]&&items[0].f)items.sort((a,b)=>(a.f||0)-(b.f||0));
                  let totalPagos=0;
                  return <>
                    {items.map((it,i)=>{totalPagos+=it.valor;return <CalRow key={i} {...it}/>})}
                    <div style={{display:"flex",justifyContent:"space-between",padding:"6px 6px 2px",fontWeight:700,borderTop:"2px solid #E5E3DE",marginTop:4}}>
                      <span>TOTAL PAGOS PREVISTOS</span>
                      <span style={{fontFamily:"'DM Mono',monospace",fontSize:12}}>{$(totalPagos)}</span>
                    </div>
                  </>
                }catch(e){return <div style={{color:"#dc2626",fontSize:10}}>Error calculando calendario: {e.message}</div>}})()}
              </div>
            </>
          })()}
        </Card>
      </>}

      {/* ══════════════════════════════════════════
         TAB 1: LIQUIDADOR MENSUAL
         ══════════════════════════════════════════ */}
      

      {/* ══════════════════════════════════════════
         TAB 2: LIQUIDACIÓN FINAL
         ══════════════════════════════════════════ */}
      {tab===1&&<>
        <Card t="Datos del Retiro" icon="🚪" accent="#fef2f2">
          <G2><In label="Fecha inicio" type="date" value={fechaIniCon} onChange={e=>setFechaIniCon(e.target.value)}/><In label="Fecha retiro" type="date" value={fechaRet} onChange={e=>setFechaRet(e.target.value)}/></G2>
          <Sel label="Motivo" value={motivoRet} onChange={e=>setMotivoRet(e.target.value)} options={[{v:"",l:"— Seleccionar —"},...MOTIVOS].map(m=>({v:m.id,l:m.l}))}/>
          {liqFinal&&<div style={{fontSize:11,color:"#666666",marginTop:4}}>Laborado: <strong>{liqFinal.diasT}d</strong> ({(liqFinal.diasT/365).toFixed(1)} años) · Sal/día: {$(liqFinal.salDia)}</div>}
        </Card>
        {liqFinal&&<>
          <Card t="Liquidación" icon="📋" badge={{t:$(liqFinal.total),bg:"#E8F4EE",c:"#1E6B42"}}>
            <Rw l="Prima proporcional" v={liqFinal.primaProp} note="Sal × días sem / 360"/>
            <Rw l="Cesantías" v={liqFinal.cesProp} note="Sal × días / 360"/>
            <Rw l="Int. cesantías" v={liqFinal.intCes} note="Ces × días × 12% / 360"/>
            <Rw l="Vacaciones" v={liqFinal.vacProp} note="Sal × días / 720"/>
            {motivoRet==="injusta"&&<><Dv/><Rw l="INDEMNIZACIÓN Art. 64" v={liqFinal.indem} bold hl="red" note={tipoCon==="fijo"?"Días restantes contrato":liqFinal.salMes<10*smlmv?"30d 1° año + 20d/año":"20d 1° año + 15d/año"}/></>}
            <Dv/><Rw l="TOTAL" v={liqFinal.total} bold hl="blue"/>
          </Card>
          {liqFinal.indem>0&&<Al c="r"><strong>⚠️ Indemnización:</strong> {$(liqFinal.indem)}</Al>}
          <BigBox bg="linear-gradient(135deg,#5B3A8C,#3B1F6E)"><div style={{fontSize:10,opacity:.8}}>TOTAL A PAGAR</div><div style={{fontSize:28,fontWeight:800,fontFamily:"'DM Mono',monospace"}}>{$(liqFinal.total)}</div><div style={{fontSize:10,opacity:.6,marginTop:4}}>{MOTIVOS.find(m=>m.id===motivoRet)?.l} · {liqFinal.diasT}d</div></BigBox>
          <div style={{textAlign:"center",marginBottom:10}} className="no-print"><button type="button" onClick={()=>openDoc("empleado",false)} style={{padding:"10px 24px",background:"#5B3A8C",color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>👁️ Ver Propuesta</button></div>
        </>}
        {!liqFinal&&<Al c="b">Ingresa fechas de inicio y retiro.</Al>}
      </>}

      <div style={{background:"#fff",borderRadius:8,padding:"10px 12px",fontSize:9,color:"#999999",lineHeight:1.4,border:"1px solid #E5E3DE",marginTop:4}}>
        📚 CST Arts. 46-47, 64, 128, 168-171, 186, 227, 230; Ley 50/1990; Ley 100/1993; Ley 789/2002; Ley 2101/2021; Art. 114-1, 383, 387, 388 E.T.; Decreto 2616/2013; Decreto 1469/2025; Decreto 1470/2025.<br/>⚠️ Herramienta de referencia. No reemplaza asesoría contable profesional. Retención: Procedimiento 1 simplificado.
      </div>
    </div>
  </div>
}
