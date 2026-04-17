import React, { useState, useMemo } from "react";

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DL = ["L","M","X","J","V","S","D"];

function easter(y){const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),mo=Math.floor((h+l-7*m+114)/31),da=((h+l-7*m+114)%31)+1;return new Date(y,mo-1,da)}
function nxtMon(d){const w=d.getDay();if(w===1)return new Date(d);return new Date(d.getFullYear(),d.getMonth(),d.getDate()+(w===0?1:8-w))}
function addD(d,n){return new Date(d.getFullYear(),d.getMonth(),d.getDate()+n)}
function sameDay(a,b){return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();}

function getHolidays(y){
  const e=easter(y),h=[];
  const F=(m,d,n)=>h.push({date:new Date(y,m-1,d),name:n});
  const E=(m,d,n)=>{h.push({date:nxtMon(new Date(y,m-1,d)),name:n})};
  F(1,1,"Año Nuevo");F(5,1,"Día del Trabajo");F(7,20,"Independencia");F(8,7,"Batalla de Boyacá");F(12,8,"Inmaculada Concepción");F(12,25,"Navidad");
  h.push({date:addD(e,-3),name:"Jueves Santo"});h.push({date:addD(e,-2),name:"Viernes Santo"});
  h.push({date:nxtMon(addD(e,39)),name:"Ascensión del Señor"});h.push({date:nxtMon(addD(e,60)),name:"Corpus Christi"});h.push({date:nxtMon(addD(e,68)),name:"Sagrado Corazón"});
  E(1,6,"Día de los Reyes Magos");E(3,19,"Día de San José");E(6,29,"San Pedro y San Pablo");E(8,15,"Asunción de la Virgen");E(10,12,"Día de la Raza");E(11,1,"Todos los Santos");E(11,11,"Independencia de Cartagena");
  return h.sort((a,b)=>a.date-b.date);
}

const T = {
  ink:"#1A1A19",inkMid:"#6B6B69",inkLight:"#9B9B99",inkXLight:"#C5C5C3",
  border:"#E5E3DE",surface:"#FAFAF8",card:"#FFFFFF",
  green:"#1E6B42",greenBg:"#E8F4EE",
  blue:"#2563eb",blueBg:"#EFF6FF",
  amber:"#D97706",amberBg:"#FFFBEB",
  red:"#dc2626",redBg:"#FEF2F2",
};

function MiniCal({year, month, holidays}) {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month+1, 0).getDate();
  let startDay = first.getDay(); // 0=Sun
  startDay = startDay === 0 ? 6 : startDay - 1; // Convert to Mon=0
  const cells = [];
  for(let i=0; i<startDay; i++) cells.push(null);
  for(let d=1; d<=daysInMonth; d++) cells.push(d);

  const today = new Date();
  const isCurrentMonth = today.getFullYear()===year && today.getMonth()===month;

  return (
    <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:8,padding:"12px 14px",minWidth:0}}>
      <div style={{fontWeight:700,fontSize:12,marginBottom:8,textAlign:"center",color:T.ink}}>{MESES[month]}</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:1,textAlign:"center"}}>
        {DL.map(d=><div key={d} style={{fontSize:8,fontWeight:700,color:T.inkLight,padding:"2px 0"}}>{d}</div>)}
        {cells.map((d,i)=>{
          if(!d) return <div key={"e"+i}/>;
          const dt = new Date(year, month, d);
          const dow = dt.getDay();
          const isSun = dow===0;
          const isSat = dow===6;
          const hol = holidays.find(h=>sameDay(h.date, dt));
          const isToday = isCurrentMonth && d===today.getDate();
          
          let bg = "transparent", color = T.ink, fontWeight = 400, border = "none";
          if(hol) { bg = T.amberBg; color = T.amber; fontWeight = 700; }
          else if(isSun) { bg = "#f5f5f5"; color = T.inkLight; }
          else if(isSat) { color = T.inkMid; }
          if(isToday) { border = `2px solid ${T.green}`; fontWeight = 800; }

          return (
            <div key={d} title={hol ? hol.name : ""} style={{
              fontSize:10, padding:"3px 0", borderRadius:4,
              background:bg, color, fontWeight, border,
              cursor: hol ? "help" : "default",
              position:"relative"
            }}>
              {d}
              {hol && <div style={{position:"absolute",bottom:-1,left:"50%",transform:"translateX(-50%)",width:4,height:4,borderRadius:2,background:T.amber}}/>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function TabFestivos() {
  const [anio, setAnio] = useState(new Date().getFullYear());
  const holidays = useMemo(()=>getHolidays(anio),[anio]);
  const today = new Date();
  const currentMonth = today.getFullYear()===anio ? today.getMonth() : -1;

  // Count festivos on work days (L-S) per month
  const festivosPorMes = useMemo(()=>{
    const arr = Array(12).fill(0);
    holidays.forEach(h=>{
      const dow = h.date.getDay();
      if(dow!==0) arr[h.date.getMonth()]++;
    });
    return arr;
  },[holidays]);

  const totalFestivos = holidays.length;
  const festivosLaborales = holidays.filter(h=>h.date.getDay()!==0).length;
  const pasados = holidays.filter(h=>h.date < today).length;
  const restantes = totalFestivos - pasados;

  return (
    <div style={{fontFamily:"'DM Sans',sans-serif",color:T.ink}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
        <div style={{flex:1}}>
          <div style={{fontSize:18,fontWeight:800}}>📅 Calendario de Festivos Colombia {anio}</div>
          <div style={{fontSize:11,color:T.inkLight}}>Ley 51 de 1983 · Festivos calculados con base en Pascua (Easter)</div>
        </div>
        <div style={{display:"flex",gap:4}}>
          {[anio-1,anio,anio+1].map(y=>(
            <button key={y} onClick={()=>setAnio(y)} style={{
              padding:"6px 14px",fontSize:12,fontWeight:y===anio?700:400,
              border:`1px solid ${y===anio?T.ink:T.border}`,borderRadius:6,
              background:y===anio?T.ink:"#fff",color:y===anio?"#fff":T.ink,
              cursor:"pointer",fontFamily:"'DM Sans',sans-serif"
            }}>{y}</button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
        {[
          ["Total festivos",totalFestivos,T.ink],
          ["En días laborales (L-S)",festivosLaborales,T.amber],
          ["Ya pasados",pasados,T.inkMid],
          ["Restantes",restantes,T.green],
        ].map(([l,v,c])=>(
          <div key={l} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:6,padding:"10px 14px",textAlign:"center"}}>
            <div style={{fontSize:8,fontWeight:700,color:T.inkLight,textTransform:"uppercase",letterSpacing:.8}}>{l}</div>
            <div style={{fontSize:22,fontWeight:800,color:c,fontFamily:"'DM Mono',monospace"}}>{v}</div>
          </div>
        ))}
      </div>

      {/* 12-month grid */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:20}}>
        {MESES.map((m,i)=>(
          <div key={m} style={{position:"relative"}}>
            <MiniCal year={anio} month={i} holidays={holidays}/>
            {festivosPorMes[i]>0 && (
              <div style={{position:"absolute",top:6,right:8,background:T.amber,color:"#fff",borderRadius:10,padding:"1px 7px",fontSize:9,fontWeight:700}}>{festivosPorMes[i]}</div>
            )}
            {i===currentMonth && (
              <div style={{position:"absolute",top:6,left:8,background:T.green,color:"#fff",borderRadius:10,padding:"1px 7px",fontSize:8,fontWeight:700}}>HOY</div>
            )}
          </div>
        ))}
      </div>

      {/* List */}
      <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:8,overflow:"hidden"}}>
        <div style={{padding:"12px 16px",borderBottom:`1px solid ${T.border}`,fontWeight:700,fontSize:13}}>
          Listado completo — {totalFestivos} festivos en {anio}
        </div>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead>
            <tr style={{borderBottom:`2px solid ${T.ink}`}}>
              <th style={{padding:"6px 16px",textAlign:"left",fontSize:9,fontWeight:700,color:T.inkLight,letterSpacing:.8,textTransform:"uppercase"}}>#</th>
              <th style={{padding:"6px 16px",textAlign:"left",fontSize:9,fontWeight:700,color:T.inkLight,letterSpacing:.8,textTransform:"uppercase"}}>Fecha</th>
              <th style={{padding:"6px 16px",textAlign:"left",fontSize:9,fontWeight:700,color:T.inkLight,letterSpacing:.8,textTransform:"uppercase"}}>Día</th>
              <th style={{padding:"6px 16px",textAlign:"left",fontSize:9,fontWeight:700,color:T.inkLight,letterSpacing:.8,textTransform:"uppercase"}}>Festivo</th>
              <th style={{padding:"6px 16px",textAlign:"center",fontSize:9,fontWeight:700,color:T.inkLight,letterSpacing:.8,textTransform:"uppercase"}}>Laboral</th>
            </tr>
          </thead>
          <tbody>
            {holidays.map((h,i)=>{
              const isPast = h.date < today;
              const isLab = h.date.getDay()!==0;
              const dayName = h.date.toLocaleDateString("es-CO",{weekday:"long"});
              const dateStr = h.date.toLocaleDateString("es-CO",{day:"numeric",month:"long"});
              return (
                <tr key={i} style={{borderBottom:`1px solid ${T.border}`,opacity:isPast?0.5:1,background:sameDay(h.date,today)?T.greenBg:"transparent"}}>
                  <td style={{padding:"5px 16px",color:T.inkLight,fontFamily:"'DM Mono',monospace"}}>{i+1}</td>
                  <td style={{padding:"5px 16px",fontWeight:600}}>{dateStr}</td>
                  <td style={{padding:"5px 16px",color:T.inkMid,textTransform:"capitalize"}}>{dayName}</td>
                  <td style={{padding:"5px 16px"}}>{h.name}</td>
                  <td style={{padding:"5px 16px",textAlign:"center"}}>
                    {isLab 
                      ? <span style={{background:T.amberBg,color:T.amber,padding:"2px 8px",borderRadius:4,fontSize:10,fontWeight:600}}>L-S</span>
                      : <span style={{color:T.inkXLight,fontSize:10}}>Domingo</span>
                    }
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
